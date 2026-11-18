#!/usr/bin/env node
/* Digi Night — home server for online play.
 *
 *   node host-game.js            serve the game + rooms on port 8080
 *   node host-game.js --tunnel   also start a Cloudflare quick tunnel (if
 *                                cloudflared is installed) and use its
 *                                address in invite links
 *
 * No npm install: only Node's built-in modules. The game itself runs in the
 * host's browser; this process serves the files and passes messages between
 * the host's browser and the friends who joined the room.
 *
 * Options: --port N   --public https://address   --tunnel   --no-open
 *
 * On a web host (Railway, Render and the like) this same file is the server:
 * the host sets PORT, and `npm start` runs it. See HOSTING.md.
 */
"use strict";

var http = require("http");
var fs = require("fs");
var path = require("path");
var os = require("os");
var zlib = require("zlib");
var crypto = require("crypto");
var child = require("child_process");

var args = process.argv.slice(2);
function flag(name) { return args.indexOf("--" + name) !== -1; }
function opt(name, dflt) {
  var i = args.indexOf("--" + name);
  if (i !== -1 && args[i + 1] && args[i + 1].slice(0, 2) !== "--") return args[i + 1];
  return dflt;
}

var ROOT = path.resolve(process.env.GAME_ROOT || path.join(__dirname, "digimon-bullet-heaven"));
/* A web host hands the port over in PORT; at home it is 8080 unless you say otherwise. */
var HOSTED = !!(process.env.PORT || process.env.RAILWAY_ENVIRONMENT || process.env.RENDER);
var PORT = parseInt(opt("port", process.env.GAME_PORT || process.env.PORT || "8080"), 10) || 8080;
var HOST = opt("host", process.env.GAME_HOST || "0.0.0.0");
var publicUrl = cleanUrl(opt("public", process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || process.env.RAILWAY_PUBLIC_DOMAIN || ""));
var publicFrom = publicUrl ? "option" : "";
var MAX_ROOMS = 40, MAX_MEMBERS = 6, MAX_MSG = 512 * 1024, GRACE_MS = 90 * 1000;

function cleanUrl(u) {
  u = String(u || "").trim().replace(/\/+$/, "");
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  return u;
}

/* ------------------------------------------------------------------ */
/* Static files                                                        */
/* ------------------------------------------------------------------ */
var MIME = {
  ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp",
  ".wav": "audio/wav", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2", ".woff": "font/woff"
};
var TEXT = { ".html": 1, ".js": 1, ".css": 1, ".json": 1, ".svg": 1, ".txt": 1 };
/* Same private list as serve-game.py: notes, tests and raw art stay home. */
var BLOCKED_NAMES = { "README.md": 1, "ROADMAP.md": 1 };
var BLOCKED_PREFIXES = ["docs/", "scripts/", "screenshots/", "raw/", "assets/sprites/frames-up-all/",
  "assets/sprites/frames-story/", "assets/sprites/raw/", "assets/sprites/SOURCES.md",
  "assets/sprites/SOURCES-up-all.md", "assets/items/raw/", "assets/items/unverified/"];
var gzCache = {};

function blocked(rel) {
  var parts = rel.split("/"), i;
  for (i = 0; i < parts.length; i++) {
    if (parts[i] === ".." || parts[i].charAt(0) === "." || BLOCKED_NAMES[parts[i]]) return true;
  }
  for (i = 0; i < BLOCKED_PREFIXES.length; i++) {
    if (rel === BLOCKED_PREFIXES[i].replace(/\/$/, "") || rel.indexOf(BLOCKED_PREFIXES[i]) === 0) return true;
  }
  return false;
}

function send(res, code, body, headers) {
  headers = headers || {};
  if (!headers["Content-Type"]) headers["Content-Type"] = "text/plain; charset=utf-8";
  res.writeHead(code, headers);
  res.end(body);
}

function serveFile(req, res, rel) {
  if (!rel) rel = "index.html";
  if (blocked(rel)) return send(res, 404, "Not found");
  var file = path.join(ROOT, rel);
  if (file !== ROOT && file.indexOf(ROOT + path.sep) !== 0) return send(res, 404, "Not found");
  fs.stat(file, function (err, st) {
    if (err || !st.isFile()) return send(res, 404, "Not found");
    var ext = path.extname(file).toLowerCase();
    var etag = '"' + st.size.toString(16) + "-" + Math.floor(st.mtimeMs).toString(16) + '"';
    var headers = {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "ETag": etag,
      "Cache-Control": TEXT[ext] ? "no-cache" : "public, max-age=86400",
      "X-Content-Type-Options": "nosniff"
    };
    if (req.headers["if-none-match"] === etag) { res.writeHead(304, headers); return res.end(); }
    if (req.method === "HEAD") { headers["Content-Length"] = st.size; res.writeHead(200, headers); return res.end(); }
    var wantsGz = TEXT[ext] && st.size > 1024 && /\bgzip\b/.test(req.headers["accept-encoding"] || "");
    if (wantsGz) {
      var hit = gzCache[file];
      if (hit && hit.etag === etag) return sendGz(res, headers, hit.buf);
      return fs.readFile(file, function (e2, raw) {
        if (e2) return send(res, 500, "Read error");
        zlib.gzip(raw, { level: 6 }, function (e3, buf) {
          if (e3) { headers["Content-Length"] = raw.length; res.writeHead(200, headers); return res.end(raw); }
          gzCache[file] = { etag: etag, buf: buf };
          sendGz(res, headers, buf);
        });
      });
    }
    headers["Content-Length"] = st.size;
    res.writeHead(200, headers);
    fs.createReadStream(file).on("error", function () { res.destroy(); }).pipe(res);
  });
}
function sendGz(res, headers, buf) {
  headers["Content-Encoding"] = "gzip";
  headers["Vary"] = "Accept-Encoding";
  headers["Content-Length"] = buf.length;
  res.writeHead(200, headers);
  res.end(buf);
}

function lanAddresses() {
  var out = [], ifs = os.networkInterfaces(), name, i, a;
  for (name in ifs) {
    for (i = 0; i < ifs[name].length; i++) {
      a = ifs[name][i];
      if ((a.family === "IPv4" || a.family === 4) && !a.internal) out.push("http://" + a.address + ":" + PORT);
    }
  }
  return out;
}

function info() {
  var n = 0, k;
  for (k in rooms) n += 1;
  return { game: "digimon-bullet-heaven", online: true, port: PORT, lan: lanAddresses(), publicUrl: publicUrl || "", publicFrom: publicFrom, rooms: n };
}

var server = http.createServer(function (req, res) {
  var url = (req.url || "/").split("?")[0];
  var rel;
  try { rel = decodeURIComponent(url).replace(/^\/+/, ""); } catch (e) { return send(res, 400, "Bad request"); }
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method not allowed");
  if (rel === "api/info") {
    return send(res, 200, JSON.stringify(info()), { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  }
  if (rel === "ws") return send(res, 426, "WebSocket only", { "Upgrade": "websocket" });
  serveFile(req, res, rel);
});

/* ------------------------------------------------------------------ */
/* WebSocket (RFC 6455) with per-message deflate, built in              */
/* ------------------------------------------------------------------ */
var TAIL = Buffer.from([0x00, 0x00, 0xff, 0xff]);

function frame(payload, opcode, compressed) {
  var len = payload.length, head;
  if (len < 126) { head = Buffer.alloc(2); head[1] = len; }
  else if (len < 65536) { head = Buffer.alloc(4); head[1] = 126; head.writeUInt16BE(len, 2); }
  else { head = Buffer.alloc(10); head[1] = 127; head.writeUInt32BE(Math.floor(len / 4294967296), 2); head.writeUInt32BE(len >>> 0, 6); }
  head[0] = 0x80 | (compressed ? 0x40 : 0) | opcode;
  return Buffer.concat([head, payload]);
}

/* One outgoing message, encoded at most once per variant so a broadcast
 * to five friends compresses a snapshot only once. */
function Packet(text) { this.text = text; this._plain = null; this._deflated = null; }
Packet.prototype.forConn = function (c) {
  var raw;
  if (c.deflate && this.text.length > 200) {
    if (!this._deflated) {
      raw = zlib.deflateRawSync(Buffer.from(this.text, "utf8"), { level: 4, finishFlush: zlib.constants.Z_SYNC_FLUSH });
      if (raw.length >= 4 && raw.slice(raw.length - 4).equals(TAIL)) raw = raw.slice(0, raw.length - 4);
      this._deflated = frame(raw, 1, true);
    }
    return this._deflated;
  }
  if (!this._plain) this._plain = frame(Buffer.from(this.text, "utf8"), 1, false);
  return this._plain;
};

function Conn(socket, deflate) {
  this.socket = socket;
  this.deflate = deflate;
  this.buf = Buffer.alloc(0);
  this.parts = [];
  this.partOp = 0;
  this.partRsv = false;
  this.partLen = 0;
  this.alive = true;
  this.open = true;
  this.room = null;
  this.id = null;
  this.onmessage = null;
  this.onclose = null;
  var self = this;
  socket.on("data", function (d) { self._data(d); });
  socket.on("close", function () { self._closed(); });
  socket.on("error", function () { self._closed(); });
}
Conn.prototype.sendPacket = function (pkt, droppable) {
  if (!this.open) return false;
  /* A friend on a slow link: skip world updates rather than queue them. */
  if (droppable && this.socket.writableLength > 300000) return false;
  try { this.socket.write(pkt.forConn(this)); } catch (e) { return false; }
  return true;
};
Conn.prototype.send = function (obj) { return this.sendPacket(new Packet(JSON.stringify(obj)), false); };
Conn.prototype.close = function (code) {
  if (!this.open) return;
  var b = Buffer.alloc(2);
  b.writeUInt16BE(code || 1000, 0);
  try { this.socket.write(frame(b, 8, false)); this.socket.end(); } catch (e) {}
  this._closed();
};
Conn.prototype._closed = function () {
  if (!this.open) return;
  this.open = false;
  try { this.socket.destroy(); } catch (e) {}
  if (this.onclose) this.onclose();
};
Conn.prototype._data = function (d) {
  this.buf = this.buf.length ? Buffer.concat([this.buf, d]) : d;
  var b, fin, rsv1, op, masked, len, off, mask, payload, i;
  for (;;) {
    b = this.buf;
    if (b.length < 2) return;
    fin = !!(b[0] & 0x80); rsv1 = !!(b[0] & 0x40); op = b[0] & 0x0f;
    masked = !!(b[1] & 0x80); len = b[1] & 0x7f; off = 2;
    if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (b.length < 10) return; len = b.readUInt32BE(2) * 4294967296 + b.readUInt32BE(6); off = 10; }
    if (!masked || len > MAX_MSG) return this.close(1009);
    if (b.length < off + 4 + len) return;
    mask = b.slice(off, off + 4);
    payload = Buffer.from(b.slice(off + 4, off + 4 + len));
    for (i = 0; i < len; i++) payload[i] ^= mask[i & 3];
    this.buf = b.slice(off + 4 + len);
    if (op === 8) return this.close(1000);
    if (op === 9) { try { this.socket.write(frame(payload, 10, false)); } catch (e) {} continue; }
    if (op === 10) { this.alive = true; continue; }
    if (op === 1 || op === 2) { this.parts = [payload]; this.partOp = op; this.partRsv = rsv1; this.partLen = len; }
    else if (op === 0) { this.parts.push(payload); this.partLen += len; if (this.partLen > MAX_MSG) return this.close(1009); }
    else return this.close(1002);
    if (!fin) continue;
    payload = this.parts.length === 1 ? this.parts[0] : Buffer.concat(this.parts);
    this.parts = [];
    this.alive = true;
    if (this.partOp !== 1) continue;
    if (this.partRsv) {
      if (!this.deflate) return this.close(1002);
      try { payload = zlib.inflateRawSync(Buffer.concat([payload, TAIL]), { finishFlush: zlib.constants.Z_SYNC_FLUSH, maxOutputLength: MAX_MSG * 4 }); }
      catch (e) { return this.close(1007); }
    }
    if (this.onmessage) {
      try { this.onmessage(payload.toString("utf8")); }
      catch (e) { console.error("[room] message error:", e && e.message); }
    }
    if (!this.open) return;
  }
};

server.on("upgrade", function (req, socket) {
  var url = (req.url || "").split("?")[0];
  var key = req.headers["sec-websocket-key"];
  if (url !== "/ws" || !key || String(req.headers.upgrade || "").toLowerCase() !== "websocket") {
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
    return;
  }
  var accept = crypto.createHash("sha1").update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
  var ext = String(req.headers["sec-websocket-extensions"] || "");
  var deflate = /permessage-deflate/.test(ext);
  var lines = ["HTTP/1.1 101 Switching Protocols", "Upgrade: websocket", "Connection: Upgrade", "Sec-WebSocket-Accept: " + accept];
  if (deflate) lines.push("Sec-WebSocket-Extensions: permessage-deflate; server_no_context_takeover; client_no_context_takeover");
  socket.write(lines.join("\r\n") + "\r\n\r\n");
  socket.setNoDelay(true);
  socket.setTimeout(0);
  attach(new Conn(socket, deflate));
});

/* ------------------------------------------------------------------ */
/* Rooms: one host, up to five friends. The server only passes messages. */
/* ------------------------------------------------------------------ */
var rooms = {};
var CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function newCode() {
  var code, i, guard = 0;
  do {
    code = "";
    for (i = 0; i < 4; i++) code += CODE_CHARS.charAt(crypto.randomInt(CODE_CHARS.length));
    guard += 1;
  } while (rooms[code] && guard < 200);
  return code;
}
function cleanName(s, dflt) {
  s = String(s == null ? "" : s).replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 14);
  return s || dflt;
}
function roster(room) {
  var out = [], id, m;
  for (id in room.members) { m = room.members[id]; out.push({ id: id, name: m.name, host: id === room.hostId, here: !!(m.conn && m.conn.open) }); }
  return out;
}
function closeRoom(room, why) {
  var id, m;
  if (!rooms[room.code]) return;
  delete rooms[room.code];
  for (id in room.members) {
    m = room.members[id];
    if (m.conn && m.conn.open && id !== room.hostId) { m.conn.send({ t: "closed", why: why || "host-left" }); m.conn.room = null; }
  }
  console.log("[room " + room.code + "] closed (" + (why || "host left") + ")");
}

function attach(conn) {
  conn.onmessage = function (text) {
    var msg;
    try { msg = JSON.parse(text); } catch (e) { return; }
    if (!msg || typeof msg.t !== "string") return;
    var room = conn.room, id, m, pkt, n;

    if (msg.t === "host") {
      if (room) return;
      n = 0; for (id in rooms) n += 1;
      if (n >= MAX_ROOMS) return conn.send({ t: "error", why: "This server is full of rooms right now." });
      room = { code: newCode(), hostId: "h", members: {}, seq: 0, made: Date.now() };
      room.members.h = { conn: conn, name: cleanName(msg.name, "Host"), token: String(msg.token || ""), gone: 0 };
      rooms[room.code] = room;
      conn.room = room; conn.id = "h";
      console.log("[room " + room.code + "] opened by " + room.members.h.name);
      return conn.send({ t: "hosted", code: room.code, you: "h", info: info(), players: roster(room) });
    }

    if (msg.t === "join") {
      if (room) return;
      room = rooms[String(msg.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "")];
      if (!room) return conn.send({ t: "error", why: "No game with that code. Check it with your friend — the room closes when the host leaves." });
      var token = String(msg.token || ""), back = null, live = 0;
      for (id in room.members) {
        m = room.members[id];
        if (id !== room.hostId && token && m.token === token) back = id;
        if (m.conn && m.conn.open) live += 1;
      }
      if (back) {
        m = room.members[back];
        if (m.conn && m.conn.open) { m.conn.room = null; m.conn.close(1000); }
        m.conn = conn; m.gone = 0; m.name = cleanName(msg.name, m.name);
        id = back;
      } else {
        n = 0; for (id in room.members) n += 1;
        if (n >= MAX_MEMBERS) {
          /* make room by dropping someone who has been gone a while */
          for (id in room.members) { m = room.members[id]; if (id !== room.hostId && m.gone && n >= MAX_MEMBERS) { delete room.members[id]; n -= 1; } }
        }
        if (n >= MAX_MEMBERS) return conn.send({ t: "error", why: "That game is full (6 players)." });
        room.seq += 1;
        id = "g" + room.seq;
        room.members[id] = { conn: conn, name: cleanName(msg.name, "Tamer " + (room.seq + 1)), token: token, gone: 0 };
      }
      conn.room = room; conn.id = id;
      conn.send({ t: "joined", code: room.code, you: id, host: room.hostId, back: !!back, players: roster(room) });
      m = room.members[room.hostId];
      if (m && m.conn) m.conn.send({ t: "peer", id: id, name: room.members[id].name, back: !!back });
      console.log("[room " + room.code + "] " + room.members[id].name + (back ? " is back" : " joined"));
      return;
    }

    if (!room || !conn.id) return;
    if (conn.id === room.hostId) {
      if (msg.t === "b") {            /* host -> every friend */
        pkt = new Packet(JSON.stringify({ t: "m", d: msg.d }));
        for (id in room.members) {
          m = room.members[id];
          if (id !== room.hostId && m.conn && m.conn.open) m.conn.sendPacket(pkt, !!msg.drop);
        }
      } else if (msg.t === "to") {    /* host -> one friend */
        m = room.members[msg.id];
        if (m && m.conn && m.conn.open && msg.id !== room.hostId) m.conn.sendPacket(new Packet(JSON.stringify({ t: "m", d: msg.d })), !!msg.drop);
      } else if (msg.t === "kick") {
        m = room.members[msg.id];
        if (m && msg.id !== room.hostId) {
          if (m.conn && m.conn.open) { m.conn.send({ t: "closed", why: "removed" }); m.conn.room = null; m.conn.close(1000); }
          delete room.members[msg.id];
        }
      } else if (msg.t === "end") closeRoom(room, "host-ended");
    } else if (msg.t === "h") {       /* friend -> host */
      m = room.members[room.hostId];
      if (m && m.conn && m.conn.open) m.conn.sendPacket(new Packet(JSON.stringify({ t: "g", from: conn.id, d: msg.d })), false);
    } else if (msg.t === "name") {
      room.members[conn.id].name = cleanName(msg.name, room.members[conn.id].name);
    }
  };

  conn.onclose = function () {
    var room = conn.room, id = conn.id, m;
    conn.room = null;
    if (!room || !rooms[room.code]) return;
    m = room.members[id];
    if (!m || m.conn !== conn) return;
    if (id === room.hostId) return closeRoom(room, "host-left");
    m.conn = null; m.gone = Date.now();
    var h = room.members[room.hostId];
    if (h && h.conn) h.conn.send({ t: "left", id: id });
    console.log("[room " + room.code + "] " + m.name + " disconnected");
  };
}

/* Keep-alive pings, and forget friends who have been gone too long. */
var allConns = [];
server.on("upgrade", function () { /* conns tracked below */ });
var _attach = attach;
attach = function (conn) { allConns.push(conn); _attach(conn); };
setInterval(function () {
  var i, c, code, room, id, m, now = Date.now();
  for (i = allConns.length - 1; i >= 0; i--) {
    c = allConns[i];
    if (!c.open) { allConns.splice(i, 1); continue; }
    if (!c.alive) { c.close(1001); allConns.splice(i, 1); continue; }
    c.alive = false;
    try { c.socket.write(frame(Buffer.alloc(0), 9, false)); } catch (e) {}
  }
  for (code in rooms) {
    room = rooms[code];
    for (id in room.members) {
      m = room.members[id];
      if (id !== room.hostId && m.gone && now - m.gone > GRACE_MS) {
        delete room.members[id];
        var h = room.members[room.hostId];
        if (h && h.conn) h.conn.send({ t: "gone", id: id });
      }
    }
  }
}, 20000).unref();

/* ------------------------------------------------------------------ */
/* Public address helpers                                               */
/* ------------------------------------------------------------------ */
function setPublic(url, from) {
  url = cleanUrl(url);
  if (!url || url === publicUrl) return;
  publicUrl = url; publicFrom = from;
  console.log("\n  Friends anywhere can join at:  " + publicUrl + "   (" + from + ")\n  The lobby's invite link now uses this address.\n");
}

/* ngrok runs a small local status page; if it is tunnelling our port,
 * pick its address up automatically. */
function pollNgrok() {
  if (publicFrom === "option" || publicFrom === "cloudflared") return;
  var req = http.get({ host: "127.0.0.1", port: 4040, path: "/api/tunnels", timeout: 1500 }, function (res) {
    var body = "";
    res.on("data", function (d) { body += d; if (body.length > 200000) req.destroy(); });
    res.on("end", function () {
      try {
        var list = (JSON.parse(body).tunnels) || [], i, t, addr;
        for (i = 0; i < list.length; i++) {
          t = list[i];
          addr = String((t.config && t.config.addr) || "");
          if (/^https:/.test(t.public_url || "") && new RegExp("[:/]" + PORT + "$").test(addr)) return setPublic(t.public_url, "ngrok");
        }
      } catch (e) {}
    });
  });
  req.on("error", function () {});
  req.on("timeout", function () { req.destroy(); });
}

function startCloudflared() {
  var names = [path.join(__dirname, process.platform === "win32" ? "cloudflared.exe" : "cloudflared"), "cloudflared"];
  var i = 0, started = false;
  function tryNext() {
    if (i >= names.length) {
      console.log("  (No cloudflared found, so no public address was created. See HOSTING.md for the two ways to let friends outside your home join.)\n");
      return;
    }
    var bin = names[i++], p;
    if (bin.indexOf(path.sep) !== -1 && !fs.existsSync(bin)) return tryNext();
    try { p = child.spawn(bin, ["tunnel", "--url", "http://localhost:" + PORT, "--no-autoupdate"], { stdio: ["ignore", "pipe", "pipe"] }); }
    catch (e) { return tryNext(); }
    p.on("error", function () { if (!started) tryNext(); });
    function scan(d) {
      var m = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i.exec(String(d));
      if (m) { started = true; setPublic(m[0], "cloudflared"); }
    }
    p.stdout.on("data", scan);
    p.stderr.on("data", scan);
    p.on("exit", function (code) { if (started) console.log("  The Cloudflare tunnel stopped (code " + code + "). Friends outside your home can no longer connect."); });
    process.on("exit", function () { try { p.kill(); } catch (e) {} });
    console.log("  Starting a Cloudflare quick tunnel…");
  }
  tryNext();
}

function openBrowser(url) {
  var cmd = process.platform === "win32" ? 'start "" "' + url + '"' : (process.platform === "darwin" ? 'open "' + url + '"' : 'xdg-open "' + url + '"');
  try { child.exec(cmd, function () {}); } catch (e) {}
}

/* ------------------------------------------------------------------ */
var tries = 0;
server.on("error", function (e) {
  if (e && e.code === "EADDRINUSE" && tries < 10 && !HOSTED) { tries += 1; PORT += 1; server.listen(PORT, HOST); return; }
  console.error("Could not start the server:", e && e.message);
  process.exit(1);
});
server.on("listening", function () {
  var lan = lanAddresses();
  if (HOSTED) {
    console.log("Digi Night is up on port " + PORT + (publicUrl ? "  ->  " + publicUrl : "") + ". Open the address your host gave this service.");
    return;
  }
  console.log("\n  Digi Night — home server");
  console.log("  -----------------------------------");
  console.log("  You (this computer):   http://localhost:" + PORT);
  if (lan.length) console.log("  Same Wi-Fi / network:  " + lan.join("   "));
  if (publicUrl) console.log("  Friends anywhere:      " + publicUrl);
  console.log("\n  In the game choose HOST ONLINE, then send the invite link from the lobby.");
  console.log("  Leave this window open while you play. Close it (or press Ctrl+C) to stop.\n");
  if (flag("tunnel") && publicFrom !== "option") startCloudflared();
  pollNgrok();
  setInterval(pollNgrok, 5000).unref();
  if (!flag("no-open")) openBrowser("http://localhost:" + PORT);
});
if (!fs.existsSync(path.join(ROOT, "index.html"))) {
  console.error("Game files not found at " + ROOT + "\nKeep host-game.js next to the digimon-bullet-heaven folder.");
  process.exit(1);
}
server.listen(PORT, HOST);
