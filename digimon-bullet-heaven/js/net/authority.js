/* Host-authoritative sim: fixed tick, input-only ingress, snapshot/delta egress.
 * Runnable in the browser (in-process) and headless in Node. The host is just
 * another client. Six slots. When a MissionSim is attached, it owns mission
 * HP, enemies, pickups, bits, and hunger. Client-asserted damage/currency is rejected.
 */
(function (global) {
  "use strict";
  var isNode = typeof module === "object" && module.exports;
  var root = isNode ? global : window;
  var D = (root.DBH = root.DBH || {});
  if (isNode) {
    try { if (!(D.net && D.net.rarity)) require("./rarity-sim.js"); } catch (err) {}
    try { if (!(D.net && D.net.mission)) require("./mission-sim.js"); } catch (err) {}
    try { if (!(D.net && D.net.brawl)) require("./brawl-sim.js"); } catch (err) {}
    try { if (!(D.net && D.net.progression)) require("./progression.js"); } catch (err) {}
  }

  var TICK_HZ = 25;
  var TICK_MS = 1000 / TICK_HZ;
  var SLOTS = 6;
  var INPUT_HISTORY = 16;

  function emptySlot(i) {
    return { slot: i, id: null, kind: null, x: 0, y: 0, vx: 0, vy: 0, form: null, hp: 0, maxHp: 0, seqAck: 0 };
  }

  function Authority(opts) {
    opts = opts || {};
    this.hz = opts.hz || TICK_HZ;
    this.dt = 1 / this.hz;
    this.tick = 0;
    this.slots = [];
    var i;
    for (i = 0; i < SLOTS; i++) this.slots[i] = emptySlot(i);
    this.inputs = {}; /* id -> [{seq, x, y, atk, t}] */
    this.events = [];
    this.lastFull = 0;
    this.speed = opts.speed || 168;
    this._listeners = [];
    this.sim = opts.sim || null;
    if (!this.sim && D.net && D.net.mission && D.net.mission.MissionSim && opts.mission !== false) {
      this.sim = new D.net.mission.MissionSim({ hz: this.hz, seed: opts.seed, data: opts.data || D, viewW: opts.viewW, viewH: opts.viewH, clockHour: this.clockHour });
    }
    /* Debugging is an explicit host/local-dev constructor flag, never a
     * client URL. allowDebugIntents is required to honor force/roll. */
    this.debug = opts.allowDebugIntents === true && opts.debug === true;
    this.allowDebugIntents = this.debug;
    /* Solo presentation pause. Never set from onMessage — network game
     * time keeps running even if a client asks to pause. */
    this.localPause = false;
    this.clockHour = opts.clockHour != null ? opts.clockHour : 12;
    this.progression = opts.progression || null;
    if (!this.progression && D.net && D.net.progression && D.net.progression.Progression && opts.mission !== false) {
      this.progression = new D.net.progression.Progression({
        data: opts.data || D,
        debug: this.debug,
        allowDebugIntents: this.allowDebugIntents,
        account: opts.account,
        persist: opts.persist
      });
      this.progression.bind(this);
    }
  }

  Authority.prototype.act = function (intent) {
    if (!this.progression) return { ok: false, reason: "no-progression" };
    return this.progression.act(intent);
  };

  Authority.prototype.onSnapshot = function (fn) { this._listeners.push(fn); };
  Authority.prototype._emit = function (snap) {
    var i;
    for (i = 0; i < this._listeners.length; i++) this._listeners[i](snap);
  };

  Authority.prototype.join = function (rec) {
    var i, s;
    for (i = 0; i < SLOTS; i++) if (!this.slots[i].id) {
      s = this.slots[i];
      s.id = rec.id;
      s.kind = rec.kind || "client";
      s.form = rec.form || null;
      s.hasTamer = rec.hasTamer !== false && rec.kind !== "bot";
      s.x = rec.x || 0;
      s.y = rec.y || 0;
      s.hp = rec.hp || 100;
      s.maxHp = rec.maxHp || 100;
      s.seqAck = 0;
      this.inputs[s.id] = [];
      this.events.push({ type: "join", tick: this.tick, id: s.id, slot: i });
      if (this.sim && !this.sim.player(s.id)) this.sim.join(rec);
      return s;
    }
    return null;
  };

  Authority.prototype.leave = function (id) {
    var i, s;
    for (i = 0; i < SLOTS; i++) if (this.slots[i].id === id) {
      s = this.slots[i];
      this.events.push({ type: "leave", tick: this.tick, id: id, slot: i });
      this.slots[i] = emptySlot(i);
      delete this.inputs[id];
      if (this.sim) this.sim.leave(id);
      return true;
    }
    return false;
  };

  /* Accepts only player input messages. Redundant last-N resends are deduped by seq. */
  Authority.prototype.pushInput = function (msg) {
    if (!msg || !msg.id) return;
    var list = this.inputs[msg.id];
    if (!list) return;
    var batch = msg.inputs || [msg];
    var i, inp, j, seen;
    for (i = 0; i < batch.length; i++) {
      inp = batch[i];
      if (inp.seq == null) continue;
      seen = false;
      for (j = 0; j < list.length; j++) if (list[j].seq === inp.seq) { seen = true; break; }
      if (!seen) list.push({ seq: inp.seq, x: inp.x || 0, y: inp.y || 0, atk: !!inp.atk, dash: !!inp.dash, tick: inp.tick, tgt: inp.tgt || (inp.pvp === "h" ? "local" : inp.pvp) || null, go: inp.go || null });
    }
    list.sort(function (a, b) { return a.seq - b.seq; });
    if (list.length > INPUT_HISTORY * 2) list.splice(0, list.length - INPUT_HISTORY * 2);
    if (this.sim) this.sim.pushInput(msg);
    if (this.sim && this.sim.brawlSim && this.sim.phase === "brawl") {
      /* the input just sent, not the highest-numbered one on file: the field and the brawl
       * number their inputs separately (the brawl starts again from 1), so "the last after
       * sorting" was the last FIELD input from before the brawl, replayed every tick. Whatever
       * you were pressing when the fight began (often Down) stuck, and your keys, stick and
       * clicks in the brawl never got through (Nov 21). */
      var bl = batch.length ? batch[batch.length - 1] : null;
      if (bl) this.sim.brawlSim.pushInput(msg.id, { x: bl.x || 0, y: bl.y || 0, atk: !!bl.atk, dash: !!bl.dash, tgt: bl.tgt || (bl.pvp === "h" ? "local" : bl.pvp) || null, go: bl.go || null });
    }
  };

  /* Only input is accepted from a client. Damage, bits, XP, and HP claims are dropped. */
  Authority.prototype.onMessage = function (msg) {
    if (!msg) return { ok: false, reason: "empty" };
    var prog = this.progression;
    var illegal = (prog && prog.isIllegal(msg)) ||
      (D.net && D.net.mission && D.net.mission.isIllegal && D.net.mission.isIllegal(msg)) ||
      !!(msg && (msg.type === "damage" || msg.type === "grantBits" || msg.type === "grant" || msg.damage != null || msg.grantBits != null || msg.type === "syncHost"));
    if (illegal) {
      this.events.push({ type: "rejected", tick: this.tick, reason: "client-asserted", kind: msg.type || "payload", id: msg.id || null });
      if (this.sim) this.sim.rejected = (this.sim.rejected || 0) + 1;
      return { ok: false, reason: "rejected" };
    }
    if (msg.type === "pause" || msg.type === "unpause" || msg.type === "setPause") {
      this.events.push({ type: "rejected", tick: this.tick, reason: "pause-is-local", kind: msg.type, id: msg.id || null });
      return { ok: false, reason: "pause-is-local" };
    }
    if (prog && prog.isIntent(msg.type)) {
      /* Winner/live set may never arrive over the message bus. */
      if (msg.type === "brawl.conclude") {
        this.events.push({ type: "rejected", tick: this.tick, reason: "forged-winner", kind: msg.type, id: msg.id || null });
        if (this.sim) this.sim.rejected = (this.sim.rejected || 0) + 1;
        return { ok: false, reason: "rejected" };
      }
      return prog.act(msg);
    }
    if (msg.type && msg.type !== "input" && msg.type !== "inputs" && !msg.inputs && msg.seq == null) {
      this.events.push({ type: "rejected", tick: this.tick, reason: "unknown", kind: msg.type, id: msg.id || null });
      if (this.sim) this.sim.rejected = (this.sim.rejected || 0) + 1;
      return { ok: false, reason: "unknown" };
    }
    this.pushInput(msg);
    return { ok: true };
  };

  /* Blind writebacks of form / weapons / bits are no longer accepted. */
  Authority.prototype.syncHost = function () {
    this.events.push({ type: "rejected", tick: this.tick, reason: "syncHost-disabled" });
    if (this.sim) this.sim.rejected = (this.sim.rejected || 0) + 1;
    return { ok: false, reason: "rejected" };
  };
  Authority.prototype.grantBits = function () { return this.onMessage({ type: "grantBits" }); };
  Authority.prototype.spendBits = function () { return { ok: false, reason: "rejected" }; };
  /* Progression claims from a client save are not trusted. Local guest
   * storage is a cache; this does not read the host machine's disk. */
  Authority.prototype.validateProgression = function (claimed) {
    var p = this.sim && (this.sim.player(this.sim.localId) || this.sim.players[0]);
    var owned = p ? { bits: p.bits, xp: p.xp, level: p.level, kills: p.kills, fullness: p.fullness } : null;
    if (!claimed) return { ok: true, owned: owned };
    if (!owned) return { ok: false, reason: "no-authority-state" };
    var clashes = [];
    if (claimed.bits != null && claimed.bits !== owned.bits) clashes.push("bits");
    if (claimed.xp != null && claimed.xp !== owned.xp) clashes.push("xp");
    if (claimed.level != null && claimed.level !== owned.level) clashes.push("level");
    return { ok: clashes.length === 0, clashes: clashes, owned: owned };
  };

  Authority.prototype.setLocalPause = function (on) {
    this.localPause = !!on;
    return this.localPause;
  };

  Authority.prototype.step = function () {
    if (this.localPause) {
      var frozen = this.snapshot();
      this._emit(frozen);
      return frozen;
    }
    this.tick += 1;
    var i, s, list, inp, sp, len, pl;
    var dt = this.dt;
    if (this.sim) {
      /* Drive the mission world from already-queued inputs. */
      this.sim.tick = this.tick - 1;
      if (this.sim.phase === "brawl" && this.sim.brawlSim) {
        this.sim.tick = this.tick;
        this.sim.brawlSim.tick(dt);
        if (this.progression) this.progression.afterBrawlTick();
      } else {
        this.sim.step();
        this.tick = this.sim.tick;
        if (this.progression && this.sim.phase === "playing") {
          this.progression.afterPlayingTick(this.dt);
        }
      }
      for (i = 0; i < SLOTS; i++) {
        s = this.slots[i];
        if (!s.id || !this.sim.player) continue;
        pl = this.sim.player(s.id);
        if (!pl) continue;
        s.x = pl.x; s.y = pl.y; s.vx = pl.vx; s.vy = pl.vy;
        s.hp = pl.hasTamer ? pl.tamerHp : pl.hp;
        s.maxHp = pl.hasTamer ? pl.tamerMaxHp : pl.maxHp;
        s.form = pl.form;
        s.seqAck = pl.seqAck;
      }
      var snap = this.snapshot();
      this._emit(snap);
      return snap;
    }
    for (i = 0; i < SLOTS; i++) {
      s = this.slots[i];
      if (!s.id) continue;
      list = this.inputs[s.id] || [];
      inp = null;
      while (list.length && list[0].seq <= s.seqAck) list.shift();
      if (list.length) { inp = list[0]; if (inp.seq > s.seqAck) s.seqAck = inp.seq; }
      if (inp) {
        len = Math.sqrt((inp.x || 0) * (inp.x || 0) + (inp.y || 0) * (inp.y || 0));
        if (len > 1) { inp.x /= len; inp.y /= len; }
        s.vx = (inp.x || 0) * this.speed;
        s.vy = (inp.y || 0) * this.speed;
      } else {
        s.vx *= 0.7; s.vy *= 0.7;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    var snap = this.snapshot();
    this._emit(snap);
    return snap;
  };

  Authority.prototype.snapshot = function (full) {
    var entities = [], i, s;
    for (i = 0; i < SLOTS; i++) {
      s = this.slots[i];
      if (!s.id) continue;
      entities.push({
        slot: s.slot, id: s.id, kind: s.kind, form: s.form, hasTamer: s.hasTamer,
        x: Math.round(s.x * 100) / 100, y: Math.round(s.y * 100) / 100,
        vx: Math.round(s.vx * 100) / 100, vy: Math.round(s.vy * 100) / 100,
        hp: s.hp, ack: s.seqAck
      });
    }
    var ev = this.events;
    this.events = [];
    var snap = { kind: "snapshot", tick: this.tick, full: !!full, entities: entities, events: ev, slots: SLOTS };
    if (this.sim) {
      var ms = this.sim.snapshot(!!full);
      snap.time = ms.time;
      snap.players = ms.players;
      snap.enemies = ms.enemies;
      snap.orbs = ms.orbs;
      snap.patches = ms.patches;
      snap.bullets = ms.bullets;
      snap.arcs = ms.arcs;
      snap.cpus = ms.cpus;
      snap.ally = ms.ally;
      snap.kills = ms.kills;
      snap.pendingLevels = ms.pendingLevels;
      snap.levelOffers = ms.levelOffers;
      snap.merchant = ms.merchant;
      snap.brawl = ms.brawl;
      snap.phase = ms.phase;
      snap.farm = ms.farm;
      snap.clock = ms.clock;
      snap.rival = ms.rival;
      snap.weather = ms.weather;
      /* the living world (Nov 20): rain in the low spots, who holds the land, the fronts, the nests */
      snap.soak = ms.soak; snap.terr = ms.terr; snap.fronts = ms.fronts; snap.nests = ms.nests; snap.nems = ms.nems;                 /* the sky the simulation is under (it was left out, so the screen never showed it) */
      snap.lifecycle = ms.lifecycle;
      snap.localPause = this.localPause;
      snap.runOver = ms.runOver;
      snap.nest = ms.nest;                                           /* Night Siege's Primary Village (17z33) */
      snap.rejected = ms.rejected;
      snap.events = ev.concat(this.sim.consumeEvents());
    }
    return snap;
  };

  /* Lag-compensated hit check: rewind entity by approx RTT/2 * velocity. */
  Authority.prototype.hitCheck = function (attackerId, targetId, radius, rttMs) {
    var atk = null, tgt = null, i;
    for (i = 0; i < SLOTS; i++) {
      if (this.slots[i].id === attackerId) atk = this.slots[i];
      if (this.slots[i].id === targetId) tgt = this.slots[i];
    }
    if (!atk || !tgt) return false;
    var rewind = ((rttMs || 0) / 2000);
    var tx = tgt.x - tgt.vx * rewind;
    var ty = tgt.y - tgt.vy * rewind;
    var dx = tx - atk.x, dy = ty - atk.y;
    return (dx * dx + dy * dy) <= (radius || 20) * (radius || 20);
  };

  Authority.prototype.runTicks = function (n) {
    var i, last = null;
    for (i = 0; i < n; i++) last = this.step();
    return last;
  };

  var api = { Authority: Authority, TICK_HZ: TICK_HZ, TICK_MS: TICK_MS, SLOTS: SLOTS, INPUT_HISTORY: INPUT_HISTORY };
  D.net = D.net || {};
  D.net.authority = api;
  if (isNode) module.exports = api;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
