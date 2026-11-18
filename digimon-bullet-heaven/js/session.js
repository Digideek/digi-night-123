/* Local multiplayer session + message-style event layer.
 * Invite-code networking can later replace LocalTransport without rewriting the brawl.
 * No sockets or public links are opened here.
 */
(function (global) {
  "use strict";

  var D = (global.DBH = global.DBH || {});
  var seq = 1;

  function now() {
    return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
  }

  function LocalTransport() {
    this._handlers = [];
  }
  LocalTransport.prototype.connect = function () { return this; };
  LocalTransport.prototype.close = function () {};
  LocalTransport.prototype.send = function (msg) {
    var list = this._handlers.slice(), i;
    for (i = 0; i < list.length; i++) list[i](msg);
  };
  LocalTransport.prototype.subscribe = function (fn) {
    this._handlers.push(fn);
    return fn;
  };
  LocalTransport.prototype.unsubscribe = function (fn) {
    this._handlers = this._handlers.filter(function (h) { return h !== fn; });
  };

  function Session(opts) {
    opts = opts || {};
    this.id = opts.id || ("sess-" + (seq++));
    /* Placeholder only — not a real invite, not published. */
    this.code = opts.code || null;
    this.seed = (opts.seed || 1) >>> 0;
    this.localId = null;
    this.players = [];
    this.transport = opts.transport || new LocalTransport();
    this._listeners = {};
    this._sub = this.transport.subscribe(this._onMessage.bind(this));
    this.closed = false;
  }

  Session.prototype._onMessage = function (msg) {
    if (!msg || this.closed) return;
    this.emitLocal(msg.type, msg);
  };

  Session.prototype.send = function (type, payload, fromId) {
    var msg = {
      type: type,
      from: fromId != null ? fromId : this.localId,
      at: now(),
      seq: (seq++),
      payload: payload || {}
    };
    this.transport.send(msg);
    return msg;
  };

  Session.prototype.on = function (type, fn) {
    if (!this._listeners[type]) this._listeners[type] = [];
    this._listeners[type].push(fn);
    return fn;
  };

  Session.prototype.off = function (type, fn) {
    var list = this._listeners[type];
    if (!list) return;
    this._listeners[type] = list.filter(function (h) { return h !== fn; });
  };

  Session.prototype.emitLocal = function (type, msg) {
    var list = (this._listeners[type] || []).concat(this._listeners["*"] || []);
    var i;
    for (i = 0; i < list.length; i++) list[i](msg.payload, msg);
  };

  Session.prototype.partyCap = function () {
    var cfg = D.BRAWL_CFG || {};
    return cfg.partyCap || cfg.maxPlayers || 6;
  };

  Session.prototype.addPlayer = function (rec) {
    rec = rec || {};
    var cap = this.partyCap();
    var isHuman = rec.kind === "local" || rec.kind === "remote";
    if (this.players.length >= cap) {
      if (isHuman) {
        var bi, dropped = null;
        for (bi = this.players.length - 1; bi >= 0; bi--) {
          if (this.players[bi].kind === "bot") { dropped = this.players.splice(bi, 1)[0]; break; }
        }
        if (!dropped) return null;
        this.send("session:leave", { playerId: dropped.id, reason: "slot-for-human" }, dropped.id);
      } else {
        return null;
      }
    }
    var form = rec.form || "agumon";
    var monName = (D.SPECIES && D.SPECIES[form] && D.SPECIES[form].name) || form;
    var hasTamer = rec.hasTamer != null ? !!rec.hasTamer : isHuman;
    var p = {
      id: rec.id || ("p-" + (seq++)),
      slot: rec.slot != null ? rec.slot : this.players.length,
      name: hasTamer ? (rec.name || ("Player " + (this.players.length + 1))) : (rec.name || monName),
      kind: rec.kind || "bot", /* local | bot | remote */
      tamerId: hasTamer ? (rec.tamerId || "junior") : null,
      hasTamer: hasTamer,
      form: form,
      title: rec.title || null,
      cosmetics: rec.cosmetics || null,
      alive: rec.alive !== false,
      connected: rec.connected !== false,
      color: rec.color || COLORS[this.players.length % COLORS.length]
    };
    if (!p.hasTamer) p.name = monName;
    this.players.push(p);
    if (p.kind === "local" && !this.localId) this.localId = p.id;
    this.send("session:join", { player: p }, p.id);
    return p;
  };

  Session.prototype.player = function (id) {
    var i;
    for (i = 0; i < this.players.length; i++) if (this.players[i].id === id) return this.players[i];
    return null;
  };

  Session.prototype.local = function () {
    return this.player(this.localId);
  };

  Session.prototype.bots = function () {
    return this.players.filter(function (p) { return p.kind === "bot"; });
  };
  Session.prototype.humans = function () {
    return this.players.filter(function (p) { return p.kind === "local" || p.kind === "remote"; });
  };
  Session.prototype.partySize = function () {
    return this.players.length;
  };

  Session.prototype.close = function () {
    this.closed = true;
    if (this.transport && this.transport.unsubscribe) this.transport.unsubscribe(this._sub);
    if (this.transport && this.transport.close) this.transport.close();
  };

  /* Future hook: swap LocalTransport for a networked one after an invite code is redeemed. */
  Session.prototype.setTransport = function (transport) {
    if (this.transport && this.transport.unsubscribe) this.transport.unsubscribe(this._sub);
    this.transport = transport || new LocalTransport();
    this._sub = this.transport.subscribe(this._onMessage.bind(this));
  };

  var COLORS = ["#f0c020", "#6ad0ff", "#e060b0", "#7cf0c0", "#ff8a40", "#c0a0ff"];
  var BOT_NAMES = ["Ken", "Mina", "Ryo", "Sora", "Aki", "Jun", "Hana", "Taro"];

  var BOT_FORMS_BY_TIER = {
    1: ["agumon", "gabumon", "patamon", "biomon", "veemon", "armadillomon", "palmon", "gomamon", "greymon", "garurumon"],
    2: ["angemon", "devimon", "leomon", "ogremon", "togemon", "ikkakumon", "exveemon", "stingmon"],
    3: ["metalgreymon", "weregarurumon", "magnaangemon", "megakabuterimon", "lillymon", "zudomon", "paildramon"],
    4: ["wargreymon", "metalgarurumon", "seraphimon", "rosemon", "vikemon", "imperialdramon_dragonmode"],
    5: ["blackwargreymon", "diablomon", "armageddemon"]
  };

  function mulberry(seed) {
    var s = (seed || 1) >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pickForm(rnd, tier, used) {
    var list = (BOT_FORMS_BY_TIER[tier] || BOT_FORMS_BY_TIER[1]).filter(function (id) {
      return !used[id] && !(D.SPECIES && !D.SPECIES[id]);
    });
    if (!list.length) list = (BOT_FORMS_BY_TIER[tier] || ["agumon"]).slice();
    var id = list[Math.floor(rnd() * list.length) % list.length];
    used[id] = true;
    return id;
  }

  function createLocal(opts) {
    opts = opts || {};
    var cfg = D.BRAWL_CFG || {};
    var session = new Session({ seed: opts.seed, code: opts.code || null });
    var local = opts.local || {};
    session.addPlayer({
      id: "local",
      slot: 0,
      name: local.name || "You",
      kind: "local",
      tamerId: local.tamerId || "junior",
      form: local.form || "agumon",
      alive: local.alive !== false,
      color: COLORS[0]
    });
    /* Optional CPU only — never auto-fill. Humans + bots share a 6-slot cap. */
    var partyCap = cfg.partyCap || cfg.maxPlayers || 6;
    var humanN = session.humans().length;
    var botCount = opts.botCount != null ? opts.botCount : (cfg.botCount != null ? cfg.botCount : 0);
    var botMax = cfg.botCountMax != null ? cfg.botCountMax : 5;
    if (botMax > partyCap - humanN) botMax = Math.max(0, partyCap - humanN);
    if (botCount < 0) botCount = 0;
    if (botCount > botMax) botCount = botMax;
    var rnd = mulberry((session.seed || 1) ^ 0xB247);
    var used = {};
    if (local.form) used[local.form] = true;
    var localTier = (D.tierOf && local.form) ? D.tierOf(local.form) : 1;
    var i, tier, name, form;
    var names = BOT_NAMES.slice();
    for (i = names.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var tmp = names[i]; names[i] = names[j]; names[j] = tmp;
    }
    for (i = 0; i < botCount; i++) {
      /* Spread tiers around the local form so odds stay interesting and upsets are possible. */
      if (i === 0) tier = Math.max(1, localTier - 1);
      else if (i === 1) tier = Math.min(5, localTier + 1);
      else tier = Math.max(1, Math.min(5, localTier + (rnd() < 0.5 ? 2 : 0)));
      if (opts.botTiers && opts.botTiers[i] != null) tier = opts.botTiers[i];
      if (opts.botForms && opts.botForms[i]) form = opts.botForms[i];
      else form = pickForm(rnd, tier, used);
      name = (opts.botNames && opts.botNames[i]) || names[i] || ("Rookie " + (i + 1));
      session.addPlayer({
        id: "bot-" + (i + 1),
        slot: i + 1,
        name: (D.SPECIES && D.SPECIES[form] && D.SPECIES[form].name) || form,
        kind: "bot",
        hasTamer: false,
        tamerId: null,
        form: form,
        alive: true,
        color: COLORS[(i + 1) % COLORS.length]
      });
    }
    return session;
  }

  /* Stub only — does not open a connection or publish a code. */
  function redeemInvite(code) {
    return { ok: false, reason: "Invite-code networking is not wired yet.", code: code || "" };
  }

  D.session = {
    Session: Session,
    LocalTransport: LocalTransport,
    createLocal: createLocal,
    redeemInvite: redeemInvite,
    mulberry: mulberry,
    BOT_NAMES: BOT_NAMES,
    BOT_FORMS_BY_TIER: BOT_FORMS_BY_TIER
  };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
