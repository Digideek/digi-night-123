/* Digi Night — the Hatchery. Between runs you raise one Digimon from a random
 * egg by feeding it data, and data is what a run pays you in: one piece for
 * every enemy you defeat, of that enemy's element, plus a little plain data for
 * every minute you last. It is kept on the profile.
 *
 *   - One egg at a time. Which egg you get is random, by rarity (TIERS).
 *   - Feeding fills a bar; when it is full the egg hatches, and after that the
 *     Digimon digivolves: Baby, In-Training, Rookie, Champion (COST). It is slow
 *     on purpose: a good run is about enough to hatch an egg.
 *   - What it becomes is not fixed. The element of the data it ate at that
 *     stage pulls it toward forms of that element, and so does the sky over the
 *     title screen at the moment it was fed. Nothing is certain either way.
 *   - Raising one to Rookie opens that egg line for good. It is the only way
 *     to open a line now.
 *   - You can take it into ONE run instead of an egg (the partner pick on the
 *     run setup screen). It starts at the stage you raised it to, and it is
 *     spent: a new egg is waiting when you come back. In the field it follows
 *     the same hidden rules as anything else, and what it ate here still pulls.
 *
 * The first half of this file is the rules, with no screen in it, so
 * scripts/hatchery-test.js can drive them; the second half is the page. */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});

  var CFG = {
    /* data to reach the next stage: hatch, then In-Training, Rookie, Champion */
    cost: [250, 600, 1400, 3200],
    earlyEggs: 2, earlyMul: 0.5,          /* your first two eggs grow at half the cost */
    /* what a run pays */
    perKill: 1, perBoss: 12, perBig: 20, plainPerMinute: 4,
    /* how many job levels it arrives with, by stage (Baby, In-Training, Rookie, Champion) */
    level: [1, 3, 8, 14],
    /* how hard its diet pulls */
    standard: 50, other: 5, neglect: 2, dietPull: 5, plainPull: 20, skyPull: 1.5, linePull: 6,
    feedStep: 25
  };
  var TIERS = [
    { id: "common", name: "Common", w: 44, col: "#cfd8e8" },
    { id: "uncommon", name: "Uncommon", w: 33, col: "#7be07a" },
    { id: "rare", name: "Rare", w: 18, col: "#58b8ff" },
    { id: "mythic", name: "Mythic", w: 5, col: "#ff8adf" }
  ];
  var STAGES = ["Egg", "Baby", "In-Training", "Rookie", "Champion"];
  var TYPES = ["fire", "ice", "water", "dark", "holy", "machine", "nature", "slime", "wind", "beast", "plain"];
  var TYPE_NAME = { fire: "Fire", ice: "Ice", water: "Water", dark: "Dark", holy: "Holy", machine: "Machine", nature: "Nature", slime: "Slime", wind: "Wind", beast: "Beast", plain: "Plain" };
  /* the sky over the title screen leans a feeding toward these elements */
  var SKY = { day: ["holy", "nature"], dusk: ["fire", "beast"], night: ["dark", "ice"], rain: ["water", "slime"], storm: ["machine", "wind"], meteor: ["holy", "machine"], eclipse: ["dark"], snow: ["ice"], dawn: ["holy", "wind"] };

  function eggs() { return D.EGGS || []; }
  function fam(form) { return D.moveFamilyOf ? D.moveFamilyOf(form) : "beast"; }
  function stageOf(form) { return D.moveStageIdx ? D.moveStageIdx(form) : 0; }
  function tree() { return D.EVO_TREE || (typeof EVO_TREE !== "undefined" ? EVO_TREE : null); }
  function h32(s) { var h = 2166136261, i; for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); }
  /* which rarity an egg line is: the five you start with are common, the rest are spread by name */
  function tierOf(lineId) {
    var e = null, i, r;
    for (i = 0; i < eggs().length; i++) if (eggs()[i].id === lineId) e = eggs()[i];
    if (!e || e.starter) return "common";
    r = h32(lineId) % 100;
    return r < 48 ? "uncommon" : (r < 84 ? "rare" : "mythic");
  }
  function tierDef(id) { var i; for (i = 0; i < TIERS.length; i++) if (TIERS[i].id === id) return TIERS[i]; return TIERS[0]; }
  function linesOf(tier) { return eggs().filter(function (e) { return tierOf(e.id) === tier; }); }

  function blank() { return { data: {}, egg: null, count: 0, raised: 0, used: 0 }; }
  function clean(H) {
    H = (H && typeof H === "object") ? H : blank();
    H.data = H.data || {}; H.count = H.count || 0; H.raised = H.raised || 0; H.used = H.used || 0;
    return H;
  }
  function total(H) { var n = 0, k; for (k in H.data) n += H.data[k] || 0; return n; }
  function pickW(list, rng) { var s = 0, i, r; for (i = 0; i < list.length; i++) s += list[i].w; r = rng() * s; for (i = 0; i < list.length; i++) { r -= list[i].w; if (r <= 0) return list[i]; } return list[list.length - 1]; }

  /* a new egg: its rarity is decided now; what is inside is decided when it hatches */
  function newEgg(H, rng) {
    rng = rng || Math.random;
    if (H.egg) return null;
    var pool = TIERS.filter(function (t) { return linesOf(t.id).length > 0; }), t = pickW(pool, rng);
    H.count += 1;
    H.egg = { tier: t.id, stage: 0, form: null, line: null, route: [], prog: 0, n: H.count, fed: {}, now: {}, sky: {}, shell: Math.floor(rng() * 1e6) };
    return H.egg;
  }
  function cost(H) {
    var e = H.egg;
    if (!e || e.stage >= CFG.cost.length) return null;
    return Math.round(CFG.cost[e.stage] * (e.n <= CFG.earlyEggs ? CFG.earlyMul : 1));
  }
  function share(map) { var s = 0, k, o = {}; for (k in map) s += map[k]; for (k in map) o[k] = s ? map[k] / s : 0; return o; }
  function skyTop(e) { var best = null, k; for (k in e.sky) if (best == null || e.sky[k] > e.sky[best]) best = k; return best; }
  /* the forms it could become next, each with the weight its diet and sky give it */
  function options(H) {
    var e = H.egg, out = [], sh, sky, i, b, list, T, f, w, cand, seen = {};
    if (!e) return out;
    sh = share(e.now); sky = SKY[skyTop(e)] || [];
    if (e.stage === 0) {
      /* which egg it turns out to be: any line of its rarity, pulled toward what it was fed */
      cand = linesOf(e.tier);
      for (i = 0; i < cand.length; i++) {
        f = fam(cand[i].hatch);
        out.push({ to: cand[i].hatch, line: cand[i].id, kind: "hatch", w: (1 + CFG.linePull * (sh[f] || 0)) * (sky.indexOf(f) >= 0 ? CFG.skyPull : 1) });
      }
      return out;
    }
    T = tree(); list = (T && T.branches && T.branches[e.form]) || [];
    for (i = 0; i < list.length; i++) {
      b = list[i];
      if (!b || !b.to || seen[b.to] || !(D.SPECIES && D.SPECIES[b.to]) || stageOf(b.to) !== e.stage) continue;   /* e.stage is also the index of the stage it is going to */
      seen[b.to] = 1; f = fam(b.to);
      if (b.kind === "neglect" || b.kind === "fallback") w = CFG.neglect + CFG.plainPull * (sh.plain || 0);     /* plain data and nothing else is how you get a Numemon */
      else w = (b.kind === "standard" ? CFG.standard : CFG.other) * (1 + CFG.dietPull * (sh[f] || 0)) * (sky.indexOf(f) >= 0 ? CFG.skyPull : 1);
      out.push({ to: b.to, kind: b.kind || "standard", w: w });
    }
    return out;
  }
  function grow(H, rng) {
    var e = H.egg, opts = options(H), pick, from = e.form, res;
    if (!opts.length) return { ok: false, reason: "max" };
    pick = pickW(opts, rng || Math.random);
    if (e.stage === 0) e.line = pick.line;
    e.form = pick.to; e.route.push(pick.to); e.stage += 1; e.now = {}; e.sky = {};
    res = { ok: true, grew: true, from: from, to: pick.to, stage: e.stage, hatched: e.stage === 1, kind: pick.kind, unlocked: null };
    if (e.stage === 3) { H.raised += 1; res.unlocked = e.line; }
    return res;
  }
  /* feed it `amount` of one type of data under a given sky. Returns what happened. */
  function feed(H, type, amount, sky, rng) {
    var e = H.egg, c = cost(H), have = H.data[type] || 0, n, res;
    if (!e) return { ok: false, reason: "no-egg" };
    if (c == null) return { ok: false, reason: "max" };
    if (TYPES.indexOf(type) < 0) return { ok: false, reason: "type" };
    n = Math.max(0, Math.min(Math.floor(amount || 0), have, c - e.prog));
    if (!n) return { ok: false, reason: have ? "full" : "none" };
    H.data[type] = have - n;
    e.prog += n; e.fed[type] = (e.fed[type] || 0) + n; e.now[type] = (e.now[type] || 0) + n;
    if (sky) e.sky[sky] = (e.sky[sky] || 0) + n;
    if (e.prog >= c) { e.prog = 0; res = grow(H, rng); res.fed = n; return res; }
    return { ok: true, grew: false, fed: n };
  }
  function ready(H) { return !!(H.egg && H.egg.stage >= 1); }
  /* take it into a run: it is spent, and what it ate goes with it */
  function use(H) {
    var e = H.egg, sh, bias = {}, k;
    if (!ready(H)) return null;
    sh = share(e.fed);
    for (k in sh) if (k !== "plain" && sh[k] > 0.05) bias[k] = Math.round(sh[k] * 100) / 100;
    H.egg = null; H.used += 1;
    return { form: e.form, line: e.line, route: e.route.slice(), stage: e.stage, level: CFG.level[e.stage - 1] || 1, bias: bias, tier: e.tier };
  }
  /* what a finished run pays: { fire: n, ..., plain: n } */
  function pay(killsBy, seconds) {
    var out = {}, k, n = 0;
    for (k in (killsBy || {})) if (TYPES.indexOf(k) >= 0 && killsBy[k] > 0) { out[k] = Math.round(killsBy[k]); n += out[k]; }
    k = Math.floor(Math.max(0, seconds || 0) / 60 * CFG.plainPerMinute);
    if (k > 0) out.plain = (out.plain || 0) + k;
    /* the Lab's Data Tap: a little more of every kind */
    n = D.lab && D.lab.mods ? (D.lab.mods().data || 1) : 1;
    if (n !== 1) for (k in out) out[k] = Math.round(out[k] * n);
    return out;
  }
  function earn(H, got) { var k; for (k in got) H.data[k] = (H.data[k] || 0) + got[k]; return H; }
  function killWorth(e) { return e && e.big ? CFG.perBig : (e && e.boss ? CFG.perBoss : CFG.perKill); }

  var rules = { CFG: CFG, TIERS: TIERS, STAGES: STAGES, TYPES: TYPES, TYPE_NAME: TYPE_NAME, SKY: SKY, blank: blank, clean: clean, tierOf: tierOf, tierDef: tierDef, linesOf: linesOf, newEgg: newEgg, cost: cost,
    options: options, feed: feed, ready: ready, use: use, pay: pay, earn: earn, killWorth: killWorth, total: total };

  /* ------------------------------ the page ------------------------------ */
  function $(id) { return document.getElementById(id); }
  function store() { return (D.profile && D.profile.hatch) ? clean(D.profile.hatch()) : clean(null); }
  function keep() { if (D.profile && D.profile.save) D.profile.save(); }
  function spName(id) { return (D.SPECIES && D.SPECIES[id] && D.SPECIES[id].name) || id || "?"; }
  function col(type) { var F = D.MOVE_FAMILIES || {}; return type === "plain" ? "#d8dce8" : ((F[type] && F[type].c) || "#ffffff"); }
  function sky() { return D.titleScene && D.titleScene.phase ? D.titleScene.phase() : null; }
  var flash = 0, tick = 0, note = "", noteT = 0;
  function say(s) { note = s; noteT = 6; if ($("hatch-foot")) $("hatch-foot").textContent = s; }

  function render() {
    var H = store(), e = H.egg, c = cost(H), grid = $("hatch-data"), h = "", i, t, n, T, max;
    if (!$("hatchery-screen")) return;
    if (!e && D.profile && D.profile.exists && D.profile.exists()) { e = newEgg(H); keep(); say("A new egg. Nobody knows what is in it until it hatches."); c = cost(H); }
    T = e ? tierDef(e.tier) : TIERS[0];
    $("hatch-name").textContent = !e ? "No egg" : (e.stage === 0 ? "Mystery egg" : spName(e.form));
    $("hatch-tag").innerHTML = !e ? "" : "<b style='color:" + T.col + "'>" + T.name + "</b>  ·  " + STAGES[e.stage] + (e.stage >= 1 && e.stage < 3 ? "  ·  raise it to Rookie to open its line" : "") + (e.stage >= 3 ? "  ·  line opened" : "");
    max = !!e && c == null;
    $("hatch-bar").style.width = (!e ? 0 : (max ? 100 : Math.round(100 * e.prog / c))) + "%";
    $("hatch-bar-text").textContent = !e ? "" : (max ? "Fully grown here. Take it into a run." : e.prog + " / " + c + " data to " + (e.stage === 0 ? "hatch" : "digivolve"));
    $("hatch-total").textContent = String(total(H));
    for (i = 0; i < TYPES.length; i++) {
      t = TYPES[i]; n = H.data[t] || 0;
      h += "<div class='hatch-chip" + (n ? "" : " is-none") + "' style='--c:" + col(t) + "'><i></i><b>" + TYPE_NAME[t] + "</b><span>" + n + "</span>" +
        "<button type='button' class='btn hatch-feed' data-feed='" + t + "' data-n='" + CFG.feedStep + "'" + (n && !max ? "" : " disabled") + ">+" + CFG.feedStep + "</button>" +
        "<button type='button' class='btn hatch-feed' data-feed='" + t + "' data-n='all'" + (n && !max ? "" : " disabled") + ">All</button></div>";
    }
    grid.innerHTML = h;
    $("hatch-use").hidden = !ready(H);
    if (ready(H)) $("hatch-use").textContent = "Pick " + spName(e.form) + " on the run setup screen to take it into ONE run. It will not come back.";
    if (noteT <= 0) $("hatch-foot").textContent = "Runs pay data: one for every enemy you defeat, of its element, and a little plain data for time survived. What you feed it, and the sky when you do, shape what it becomes.";
  }
  function onClick(ev) {
    var b = ev.target.closest ? ev.target.closest("[data-feed]") : null, H, r, t, n, was;
    if (!b) return;
    H = store(); t = b.getAttribute("data-feed"); n = b.getAttribute("data-n");
    was = H.egg ? H.egg.form : null;
    r = feed(H, t, n === "all" ? 1e9 : +n, sky());
    if (!r.ok) { if (D.uiSfx) D.uiSfx("ui"); say(r.reason === "none" ? "You have no " + TYPE_NAME[t] + " data. Runs pay it." : "It cannot take any more."); return; }
    keep();
    if (r.grew) {
      flash = 1.2;
      if (D.audio) D.audio.sfx("job");
      if (r.unlocked && D.unlockEgg) D.unlockEgg(r.unlocked);
      say(r.hatched ? "It hatched! A " + spName(r.to) + "." : spName(was) + " digivolved into " + spName(r.to) + "!" + (r.unlocked ? "  Its egg line is yours now: you can pick that egg for any run." : ""));
      if (D.hub && D.hub.refresh) D.hub.refresh();
    } else if (D.uiSfx) D.uiSfx("ui");
    render();
  }
  /* the egg (or what came out of it) on its stand, drawn every frame by game.js through tickPage */
  function paint(dt) {
    var cv = $("hatch-art"), c, S = D.sprites, H, e, T, i, a, bob, g;
    tick += dt; if (noteT > 0) { noteT -= dt; if (noteT <= 0) render(); }
    if (!cv || !S) return;
    c = cv.getContext("2d"); c.imageSmoothingEnabled = false; c.clearRect(0, 0, cv.width, cv.height);
    H = store(); e = H.egg; if (!e) return;
    T = tierDef(e.tier);
    /* its rarity glows round it */
    c.globalAlpha = 0.16 + 0.05 * Math.sin(tick * 2); c.fillStyle = T.col;
    c.beginPath(); c.arc(170, 150, 104 + Math.sin(tick * 2) * 5, 0, 7); c.fill(); c.beginPath(); c.arc(170, 150, 70, 0, 7); c.fill();
    c.globalAlpha = 1;
    for (i = 0; i < 12; i++) { a = tick * 0.6 + i * 0.5236; c.fillStyle = i % 3 ? T.col : "#ffffff"; c.globalAlpha = 0.5 + 0.4 * Math.sin(tick * 3 + i); c.fillRect(Math.round(170 + Math.cos(a) * 118) - 2, Math.round(150 + Math.sin(a) * 96) - 2, 4, 4); }
    c.globalAlpha = 1;
    /* the stand */
    c.fillStyle = "#1a2438"; c.fillRect(96, 232, 148, 12); c.fillStyle = "#2c3f5c"; c.fillRect(104, 224, 132, 10); c.fillStyle = "#4a6a94"; c.fillRect(104, 224, 132, 3);
    bob = e.stage === 0 ? Math.abs(Math.sin(tick * (2 + 5 * (e.prog / (cost(H) || 1))))) * 5 : 0;
    c.save(); c.translate(170, 226 - bob);
    try {
      if (e.stage === 0) { c.scale(3.4, 3.4); c.rotate(Math.sin(tick * 9) * 0.05 * (e.prog / (cost(H) || 1))); S.drawEgg(c, "egg_08", 0, 0, tick, false, false, e.shell % 97); }
      else { g = [3.2, 3, 2.6, 1.9][e.stage - 1] || 2; c.scale(g, g); S.drawPartner(c, e.form, 0, 0, 1, 1, tick, false, false, false); }
    } catch (err) {}
    c.restore();
    if (flash > 0) { flash -= dt; c.globalAlpha = Math.max(0, Math.min(1, flash)); c.fillStyle = "#ffffff"; c.fillRect(0, 0, cv.width, cv.height); c.globalAlpha = 1; }
  }
  function init() {
    var g = $("hatch-data"), back = $("btn-hatch-back");
    if (g) g.addEventListener("click", onClick);
    if (back) back.addEventListener("click", function () { if (D.uiSfx) D.uiSfx("ui"); if (D.menu) D.menu.go("title"); });
    if (D.px && D.px.stamp && $("hatchery-screen")) D.px.stamp($("hatchery-screen"));
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && D.getState && D.getState() === "hatchery" && D.menu) { D.menu.go("title"); e.preventDefault(); } });
  }
  D.hatchery = {
    rules: rules, render: render, paint: paint,
    /* for the hub tile and the run setup screen */
    state: function () { var H = store(); return { egg: H.egg, total: total(H), cost: cost(H), ready: ready(H), tier: H.egg ? tierDef(H.egg.tier) : null }; },
    ready: function () { return ready(store()); },
    /* a run ended: bank what it paid. Returns what was paid, for the game over screen. */
    bank: function (killsBy, seconds) { var H = store(), got = pay(killsBy, seconds); if (!D.profile || !D.profile.exists || !D.profile.exists()) return got; earn(H, got); keep(); return got; },
    /* a run is starting with it: hand it over and clear the stand */
    take: function () { var H = store(), r = use(H); if (r) keep(); return r; },
    killWorth: killWorth, typeName: function (t) { return TYPE_NAME[t] || t; }
  };
  if (typeof document !== "undefined") { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init(); }
})(typeof window !== "undefined" ? window : globalThis);
