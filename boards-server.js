/* Digi Night — leaderboards, the weekly map and faction seasons (Nov 20).
 * Lives beside accounts-server.js and needs an account: a run counts for the
 * boards only when a signed-in player sends it in.
 *
 *   POST /api/board/submit  { token, rec }        -> { ok, bests, placed }
 *        rec is the end-of-run record (js/net/modes-sim.js _runRecord).
 *   POST /api/board/get     { token? }            -> { ok, week, boards, season, me }
 *   POST /api/board/back    { token, faction }    -> { ok, backing }   (once a week)
 *   POST /api/board/claim   { token }             -> { ok, bits, why } (last week's season reward)
 *
 * The boards (top BOARD_N each):
 *   level    highest job level reached in a run
 *   mega     fastest time to a Mega (seconds, lower is better)
 *   time     longest run
 *   lords    most lords beaten in a run
 *   pvp      most PvP wins (all time, added up)
 *   ranked   best Ranked score (one life, no CPU partners)
 *   weekly   best score on this week's map
 *
 * Faction seasons: each week a player may back one biome. Every run they
 * send in that week adds the land that biome had conquered by the end of it,
 * plus SEASON.pvp for each PvP win, to the biome's season total. When the
 * week turns, everyone who backed the winning biome can claim SEASON.reward
 * DigiBits once; backers of the rest get SEASON.thanks.
 *
 * Kept in one file, boards.json, next to the accounts (a Railway Volume).
 * Scores are checked against the run's own numbers (modes-sim.js score) and
 * capped at what a run could plausibly reach; it is not proof against a
 * determined cheat, since runs are played in the browser.
 */
"use strict";
var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
var modes = require("./digimon-bullet-heaven/js/net/modes-sim.js");

var VOLUME = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || "";
var FILE = path.join(VOLUME || path.join(__dirname, "data"), "boards.json");
var BOARD_N = 20, MAX_BODY = 64 * 1024;
var SEASON = { pvp: 3, reward: 600, thanks: 120 };
var FACTIONS = ["plains", "forest", "desert", "snow", "swamp", "volcano", "circuit", "glitch"];   /* js/biomes.js DEFS */
var BOARDS = {
  level:  { field: "level", low: false, label: "Highest level" },
  mega:   { field: "megaAt", low: true, label: "Fastest Mega" },
  time:   { field: "time", low: false, label: "Longest survival" },
  lords:  { field: "lords", low: false, label: "Most lords" },
  pvp:    { field: "pvpTotal", low: false, label: "PvP wins" },
  ranked: { field: "ranked", low: false, label: "Ranked" },
  weekly: { field: "weekly", low: false, label: "Weekly map" }
};
var db = null, accounts = null, lastSubmit = {};

function load() {
  if (db) return db;
  try { db = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch (e) { db = null; }
  if (!db || typeof db !== "object") db = {};
  db.players = db.players || {};
  db.seasons = db.seasons || {};
  return db;
}
function persist() {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    var tmp = FILE + "." + crypto.randomBytes(4).toString("hex") + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(db)); fs.renameSync(tmp, FILE);
  } catch (e) {}
}
function num(v, lo, hi) { v = +v; if (!isFinite(v)) return 0; return Math.max(lo, Math.min(hi, Math.round(v))); }

/* a run record from the browser, cleaned and checked */
function cleanRec(r) {
  if (!r || typeof r !== "object") return null;
  var out = {
    mode: ["open", "survival", "ranked", "weekly"].indexOf(r.mode) >= 0 ? r.mode : "open",
    week: typeof r.week === "string" ? r.week.slice(0, 10) : null,
    seed: num(r.seed, 0, 4294967295),
    time: num(r.time, 0, 12 * 3600),
    level: num(r.level, 1, 99),
    kills: num(r.kills, 0, 200000),
    lords: num(r.lords, 0, 60),
    bosses: num(r.bosses, 0, 2000),
    pvp: num(r.pvp, 0, 500),
    megaAt: r.megaAt ? num(r.megaAt, 1, 12 * 3600) : null,
    respawns: num(r.respawns, 0, 999),
    faction: FACTIONS.indexOf(r.faction) >= 0 ? r.faction : null,
    landBy: {}
  }, k;
  if (r.landBy && typeof r.landBy === "object") for (k in r.landBy) if (FACTIONS.indexOf(k) >= 0) out.landBy[k] = num(r.landBy[k], 0, 5000);
  /* what a run can plausibly reach in its time */
  var mins = out.time / 60;
  if (out.kills > 40 + mins * 120) return null;
  if (out.megaAt && out.megaAt > out.time + 5) return null;
  if (out.lords > 2 + mins / 6) return null;
  out.score = modes.score({}, out);
  return out;
}
function entry(key, name) {
  var d = load(), e = d.players[key];
  if (!e) e = d.players[key] = { name: name, level: 0, megaAt: null, time: 0, lords: 0, pvpTotal: 0, ranked: 0, weeks: {}, backs: {}, claimed: {}, runs: 0 };
  e.name = name;
  e.weeks = e.weeks || {}; e.backs = e.backs || {}; e.claimed = e.claimed || {};
  return e;
}
function better(b, a, was) { return was == null || was === 0 ? !!a : (b.low ? a < was : a > was); }
function top(id, week) {
  var d = load(), b = BOARDS[id], out = [], k, e, v;
  for (k in d.players) {
    e = d.players[k];
    v = id === "weekly" ? (e.weeks[week] && e.weeks[week].weekly) : e[b.field];
    if (!v) continue;
    out.push({ name: e.name, v: v, key: k });
  }
  out.sort(function (x, y) { return b.low ? x.v - y.v : y.v - x.v; });
  return out.slice(0, BOARD_N);
}
function placeOf(id, key, week) { var t = top(id, week), i; for (i = 0; i < t.length; i++) if (t[i].key === key) return i + 1; return 0; }
function season(week) {
  var s = load().seasons[week] || {}, list = [], k;
  for (k in s) list.push({ faction: k, pts: s[k] });
  list.sort(function (x, y) { return y.pts - x.pts; });
  return list;
}
function strip(list) { return list.map(function (x) { return { name: x.name, v: x.v }; }); }

var HANDLERS = {
  submit: function (b, acc) {
    if (!acc) return [401, { reason: "signed-out" }];
    var now = Date.now(), r = cleanRec(b.rec), e, week = modes.weekOf(now), placed = {}, backed, k, add;
    if (!r) return [400, { reason: "That run could not be counted." }];
    if (lastSubmit[acc.key] && now - lastSubmit[acc.key] < 20000) return [429, { reason: "Slow down." }];
    lastSubmit[acc.key] = now;
    e = entry(acc.key, acc.name);
    e.runs += 1;
    if (r.level > e.level) { e.level = r.level; placed.level = 1; }
    if (r.megaAt && better(BOARDS.mega, r.megaAt, e.megaAt)) { e.megaAt = r.megaAt; placed.mega = 1; }
    if (r.time > e.time) { e.time = r.time; placed.time = 1; }
    if (r.lords > e.lords) { e.lords = r.lords; placed.lords = 1; }
    if (r.pvp) { e.pvpTotal += r.pvp; placed.pvp = 1; }
    if (r.mode === "ranked" && r.score > e.ranked) { e.ranked = r.score; placed.ranked = 1; }
    e.weeks[week] = e.weeks[week] || { weekly: 0 };
    if (r.mode === "weekly" && r.week === week && r.seed === modes.weekSeed(week) && r.score > e.weeks[week].weekly) { e.weeks[week].weekly = r.score; placed.weekly = 1; }
    /* the faction season: the land your biome took this run */
    backed = e.backs[week];
    if (backed) {
      add = (r.landBy[backed] || 0) + r.pvp * SEASON.pvp;
      if (add) { load().seasons[week] = load().seasons[week] || {}; load().seasons[week][backed] = (load().seasons[week][backed] || 0) + add; }
    }
    for (k in placed) placed[k] = placeOf(k, acc.key, week);
    persist();
    return [200, { ok: true, score: r.score, placed: placed, season: backed ? { faction: backed, added: add || 0 } : null }];
  },
  get: function (b, acc) {
    var week = modes.weekOf(), last = modes.weekBefore(week), boards = {}, id, me = null, e;
    for (id in BOARDS) boards[id] = { label: BOARDS[id].label, low: BOARDS[id].low, list: strip(top(id, week)) };
    if (acc) {
      e = load().players[acc.key];
      me = { name: acc.name, bests: e ? { level: e.level, megaAt: e.megaAt, time: e.time, lords: e.lords, pvp: e.pvpTotal, ranked: e.ranked, weekly: (e.weeks[week] && e.weeks[week].weekly) || 0, runs: e.runs } : null,
        backing: e ? e.backs[week] || null : null, places: {} };
      for (id in BOARDS) me.places[id] = placeOf(id, acc.key, week);
      me.claim = claimable(e, last);
    }
    return [200, { ok: true, week: week, seed: modes.weekSeed(week), boards: boards, season: { week: week, list: season(week) }, lastSeason: { week: last, list: season(last) }, me: me, factions: FACTIONS }];
  },
  back: function (b, acc) {
    if (!acc) return [401, { reason: "signed-out" }];
    var week = modes.weekOf(), e = entry(acc.key, acc.name);
    if (FACTIONS.indexOf(b.faction) < 0) return [400, { reason: "No such biome." }];
    if (e.backs[week]) return [409, { reason: "You already back " + e.backs[week] + " this week.", backing: e.backs[week] }];
    e.backs[week] = b.faction;
    persist();
    return [200, { ok: true, backing: b.faction }];
  },
  claim: function (b, acc) {
    if (!acc) return [401, { reason: "signed-out" }];
    var last = modes.weekBefore(modes.weekOf()), e = load().players[acc.key], c = claimable(e, last);
    if (!c) return [409, { reason: "Nothing to claim." }];
    e.claimed[last] = true;
    persist();
    return [200, { ok: true, bits: c.bits, why: c.why }];
  }
};
function claimable(e, week) {
  if (!e || !e.backs[week] || e.claimed[week]) return null;
  var s = season(week), won = s.length && s[0].faction === e.backs[week];
  return { week: week, faction: e.backs[week], bits: won ? SEASON.reward : SEASON.thanks, why: won ? "Your biome, " + e.backs[week] + ", held the most land last week." : "Thanks for fighting for " + e.backs[week] + " last week." };
}

function reply(res, code, obj) {
  var body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
}
function handle(req, res, rel) {
  var m = /^api\/board\/([a-z]+)$/.exec(rel), chunks = [], size = 0, done = false;
  if (!m) return false;
  if (req.method !== "POST" || !HANDLERS[m[1]]) { reply(res, 405, { reason: "Not allowed" }); return true; }
  req.on("data", function (c) {
    if (done) return;
    size += c.length;
    if (size > MAX_BODY) { done = true; reply(res, 413, { reason: "Too big" }); req.destroy(); return; }
    chunks.push(c);
  });
  req.on("end", function () {
    var b, out, acc;
    if (done) return;
    done = true;
    try { b = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch (e) { return reply(res, 400, { reason: "Bad request" }); }
    if (!b || typeof b !== "object") return reply(res, 400, { reason: "Bad request" });
    acc = b.token && accounts && accounts._byToken ? accounts._byToken(b.token) : null;
    try { out = HANDLERS[m[1]](b, acc); } catch (e2) { out = [500, { reason: "Server error" }]; }
    reply(res, out[0], out[1]);
  });
  req.on("error", function () {});
  return true;
}

module.exports = {
  handle: handle, file: FILE,
  use: function (acc) { accounts = acc; },
  _handlers: HANDLERS, _reset: function (f) { db = null; if (f) FILE = f; lastSubmit = {}; }, _clean: cleanRec, BOARDS: BOARDS, SEASON: SEASON
};
