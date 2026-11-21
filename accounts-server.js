/* Digi Night — player accounts for the room server (host-game.js).
 *
 * A username and a password, and the player's save kept on the server so it
 * follows them to any computer. No outside packages.
 *
 *   POST /api/account/signup    { name, pass, save? }   -> { ok, name, token, rev, save }
 *   POST /api/account/login     { name, pass }          -> { ok, name, token, rev, save }
 *   POST /api/account/me        { token }               -> { ok, name, rev }
 *   POST /api/account/load      { token }               -> { ok, rev, save }
 *   POST /api/account/save      { token, rev, save }    -> { ok, rev }   (409 "stale" if someone saved since)
 *   POST /api/account/password  { token, old, pass }    -> { ok }
 *   POST /api/account/logout    { token }               -> { ok }
 *
 * Where it is kept: one small file per account under DATA_DIR. On Railway
 * that must be a Volume (Railway sets RAILWAY_VOLUME_MOUNT_PATH when one is
 * attached); without one the files are wiped by every deploy.
 *
 * Passwords are never stored: only a salted scrypt hash. A login hands back a
 * random token; only its SHA-256 is stored. Names are 3 to 14 letters, digits,
 * spaces, - or _, and are unique whatever the capitals.
 */
"use strict";
var fs = require("fs");
var path = require("path");
var crypto = require("crypto");

var VOLUME = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || "";
var DIR = path.join(VOLUME || path.join(__dirname, "data"), "accounts");
var MAX_BODY = 900 * 1024, MAX_SAVE = 700 * 1024, MAX_SESSIONS = 8;
var TRIES = 12, TRIES_WINDOW = 5 * 60 * 1000;
var tries = {};

function ensureDir() { try { fs.mkdirSync(DIR, { recursive: true }); return true; } catch (e) { return false; } }
function cleanName(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }
function nameOk(n) { return /^[A-Za-z0-9][A-Za-z0-9 _-]{1,12}[A-Za-z0-9]$/.test(n); }
function keyOf(n) { return cleanName(n).toLowerCase().replace(/ /g, "+"); }
function fileOf(n, kind) { return path.join(DIR, keyOf(n) + (kind === "save" ? ".save.json" : ".json")); }
function readJson(f) { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { return null; } }
function writeJson(f, o) { var tmp = f + "." + crypto.randomBytes(4).toString("hex") + ".tmp"; fs.writeFileSync(tmp, JSON.stringify(o)); fs.renameSync(tmp, f); }
function sha(s) { return crypto.createHash("sha256").update(String(s)).digest("hex"); }
function hashPass(pass, salt) { return crypto.scryptSync(String(pass), salt, 32).toString("hex"); }
function passOk(acc, pass) {
  var a, b;
  try { a = Buffer.from(hashPass(pass, acc.salt), "hex"); b = Buffer.from(acc.hash, "hex"); return a.length === b.length && crypto.timingSafeEqual(a, b); } catch (e) { return false; }
}
function newToken(acc) {
  var raw = crypto.randomBytes(24).toString("hex"), ks, i;
  acc.sessions = acc.sessions || {};
  acc.sessions[sha(raw)] = Date.now();
  ks = Object.keys(acc.sessions).sort(function (x, y) { return acc.sessions[x] - acc.sessions[y]; });
  for (i = 0; i < ks.length - MAX_SESSIONS; i++) delete acc.sessions[ks[i]];
  return acc.key + "." + raw;
}
/* a token is "<account key>.<random>": find the account, then check the random part */
function byToken(token) {
  var t = String(token || ""), i = t.lastIndexOf("."), acc;
  if (i < 1) return null;
  if (!/^[a-z0-9+_-]+$/.test(t.slice(0, i))) return null;
  acc = readJson(path.join(DIR, t.slice(0, i) + ".json"));
  if (!acc || !acc.sessions || !acc.sessions[sha(t.slice(i + 1))]) return null;
  acc._th = sha(t.slice(i + 1));
  return acc;
}
function store(acc) { var th = acc._th; delete acc._th; writeJson(path.join(DIR, acc.key + ".json"), acc); acc._th = th; }
function saveOk(s) {
  var k;
  if (s == null) return true;
  if (typeof s !== "object" || Array.isArray(s)) return false;
  for (k in s) if (!/^(dbh|dn)_[A-Za-z0-9_]{1,40}$/.test(k) || typeof s[k] !== "string") return false;
  return JSON.stringify(s).length <= MAX_SAVE;
}
function same(a, b) {
  var ka, i;
  if (!a || !b) return false;
  ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  for (i = 0; i < ka.length; i++) if (a[ka[i]] !== b[ka[i]]) return false;
  return true;
}
function limited(ip) {
  var now = Date.now(), t = tries[ip];
  if (!t || now - t.at > TRIES_WINDOW) t = tries[ip] = { at: now, n: 0 };
  t.n += 1;
  return t.n > TRIES;
}

var HANDLERS = {
  signup: function (b, ip) {
    var name = cleanName(b.name), pass = String(b.pass || ""), acc, salt;
    if (limited(ip)) return [429, { reason: "Too many tries. Wait a few minutes." }];
    if (!nameOk(name)) return [400, { reason: "Usernames are 3 to 14 letters, numbers, spaces, - or _." }];
    if (pass.length < 6 || pass.length > 100) return [400, { reason: "Passwords need at least 6 characters." }];
    if (!saveOk(b.save)) return [400, { reason: "That save could not be read." }];
    if (fs.existsSync(fileOf(name))) return [409, { reason: "That username is taken." }];
    salt = crypto.randomBytes(16).toString("hex");
    acc = { key: keyOf(name), name: name, salt: salt, hash: hashPass(pass, salt), created: Date.now(), rev: b.save ? 1 : 0, sessions: {} };
    var token = newToken(acc);
    try { fs.writeFileSync(fileOf(name), JSON.stringify(acc), { flag: "wx" }); } catch (e) { return [409, { reason: "That username is taken." }]; }
    if (b.save) writeJson(fileOf(name, "save"), b.save);
    return [200, { ok: true, name: acc.name, token: token, rev: acc.rev, save: b.save || null }];
  },
  login: function (b, ip) {
    var name = cleanName(b.name), acc, token;
    if (limited(ip)) return [429, { reason: "Too many tries. Wait a few minutes." }];
    acc = nameOk(name) ? readJson(fileOf(name)) : null;
    if (!acc || !passOk(acc, b.pass)) return [401, { reason: "Wrong username or password." }];
    token = newToken(acc); store(acc);
    if (tries[ip]) tries[ip].n = 0;
    return [200, { ok: true, name: acc.name, token: token, rev: acc.rev || 0, save: readJson(path.join(DIR, acc.key + ".save.json")) }];
  },
  me: function (b) {
    var acc = byToken(b.token);
    if (!acc) return [401, { reason: "signed-out" }];
    return [200, { ok: true, name: acc.name, rev: acc.rev || 0 }];
  },
  load: function (b) {
    var acc = byToken(b.token);
    if (!acc) return [401, { reason: "signed-out" }];
    return [200, { ok: true, rev: acc.rev || 0, save: readJson(path.join(DIR, acc.key + ".save.json")) }];
  },
  save: function (b) {
    var acc = byToken(b.token);
    if (!acc) return [401, { reason: "signed-out" }];
    if (!saveOk(b.save) || !b.save) return [400, { reason: "That save could not be read." }];
    if ((b.rev | 0) !== (acc.rev || 0)) return [409, { reason: "stale", rev: acc.rev || 0 }];
    /* nothing changed: the count stays where it is, so other devices are not put out of date for nothing */
    if (same(b.save, readJson(path.join(DIR, acc.key + ".save.json")))) return [200, { ok: true, rev: acc.rev || 0 }];
    writeJson(path.join(DIR, acc.key + ".save.json"), b.save);
    acc.rev = (acc.rev || 0) + 1; acc.sessions[acc._th] = Date.now(); acc.savedAt = Date.now();
    store(acc);
    return [200, { ok: true, rev: acc.rev }];
  },
  password: function (b, ip) {
    var acc = byToken(b.token), pass = String(b.pass || ""), th;
    if (!acc) return [401, { reason: "signed-out" }];
    if (limited(ip)) return [429, { reason: "Too many tries. Wait a few minutes." }];
    if (!passOk(acc, b.old)) return [401, { reason: "The current password is wrong." }];
    if (pass.length < 6 || pass.length > 100) return [400, { reason: "Passwords need at least 6 characters." }];
    acc.salt = crypto.randomBytes(16).toString("hex"); acc.hash = hashPass(pass, acc.salt);
    th = acc._th; acc.sessions = {}; acc.sessions[th] = Date.now();      /* every other device is signed out */
    store(acc);
    return [200, { ok: true }];
  },
  logout: function (b) {
    var acc = byToken(b.token);
    if (acc) { delete acc.sessions[acc._th]; store(acc); }
    return [200, { ok: true }];
  }
};

function reply(res, code, obj) {
  var body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
}

/* true if it was an account request (and has been answered) */
function handle(req, res, rel) {
  var m = /^api\/account\/([a-z]+)$/.exec(rel), chunks = [], size = 0, done = false, ip;
  if (!m) return false;
  if (req.method !== "POST" || !HANDLERS[m[1]]) { reply(res, 405, { reason: "Not allowed" }); return true; }
  if (!ensureDir()) { reply(res, 500, { reason: "The server cannot store accounts." }); return true; }
  ip = String((req.headers["x-forwarded-for"] || "").split(",")[0] || (req.socket && req.socket.remoteAddress) || "?").trim();
  req.on("data", function (c) {
    if (done) return;
    size += c.length;
    if (size > MAX_BODY) { done = true; reply(res, 413, { reason: "Too big" }); req.destroy(); return; }
    chunks.push(c);
  });
  req.on("end", function () {
    var b, out;
    if (done) return;
    done = true;
    try { b = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch (e) { return reply(res, 400, { reason: "Bad request" }); }
    if (!b || typeof b !== "object") return reply(res, 400, { reason: "Bad request" });
    try { out = HANDLERS[m[1]](b, ip); } catch (e2) { out = [500, { reason: "Server error" }]; }
    reply(res, out[0], out[1]);
  });
  req.on("error", function () {});
  return true;
}

module.exports = { handle: handle, persistent: !!VOLUME, dir: DIR, _handlers: HANDLERS, _nameOk: nameOk, _byToken: byToken };
