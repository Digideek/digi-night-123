/* DOM-free brawl fight sim: physics, bot AI, collision, KO, and winner.
 * Ticked by the authority. The browser draws snapshots and submits input only.
 * No ports, no document, no client-nominated winner. */
(function (global) {
  "use strict";
  var isNode = typeof module === "object" && module.exports;
  var root = isNode ? global : window;
  var D = (root.DBH = root.DBH || {});

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function dist2(ax, ay, bx, by) {
    var dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  }

  function BrawlSim(opts) {
    opts = opts || {};
    this.data = opts.data || D;
    this.rng = typeof opts.rng === "function" ? opts.rng : Math.random;
    this.match = null;
    this.inputs = {};
    this.events = [];
  }

  BrawlSim.prototype.cfg = function () {
    return (this.data && this.data.BRAWL_CFG) || {};
  };

  BrawlSim.prototype.tierOf = function (id) {
    if (this.data && this.data.tierOf) return this.data.tierOf(id) || 1;
    var sp = this.data && this.data.SPECIES && this.data.SPECIES[id];
    return (sp && sp.tier) || 1;
  };

  BrawlSim.prototype.modsOf = function (tier) {
    if (this.data && this.data.brawlMods) return this.data.brawlMods(tier) || { hpMul: 1, regen: 1, extraMove: 0 };
    return { hpMul: 1, regen: 1, extraMove: 0 };
  };

  BrawlSim.prototype.emit = function (ev) {
    this.events.push(ev);
  };

  BrawlSim.prototype.consumeEvents = function () {
    var ev = this.events;
    this.events = [];
    return ev;
  };

  BrawlSim.prototype.makeFighter = function (player, slot, seedN) {
    var form = player.form;
    var sp = (this.data.SPECIES && this.data.SPECIES[form]) || {};
    var t = this.tierOf(form);
    var mods = this.modsOf(t);
    var hp = Math.round((this.cfg().baseHp || 96) * (mods.hpMul || 1) + ((sp.base && sp.base.maxHp) ? sp.base.maxHp * 0.15 : 0));
    var kind = player.kind || "client";
    return {
      id: player.id,
      name: player.name,
      form: form,
      tamerId: player.tamerId,
      color: player.color,
      kind: kind,
      hasTamer: kind === "bot" ? false : (player.hasTamer !== false),
      title: player.title || null,
      tier: t,
      mods: mods,
      hp: hp,
      maxHp: hp,
      x: 80 + (slot || 0) * 140,
      y: 40 + ((slot || 0) % 2) * 40,
      facing: (slot || 0) % 2 === 0 ? 1 : -1,
      vx: 0, vy: 0,
      iFrame: 0, atkCd: 0, dashCd: 0, atkT: 0, dashT: 0, hurtT: 0,
      ko: false,
      fighting: !!player.fighting,
      alive: player.alive !== false,
      revived: false,
      enteredFight: false,
      betOn: null,
      seed: seedN || 0,
      slot: slot || 0
    };
  };

  BrawlSim.prototype.applySurvival = function (fighters) {
    var cfg = this.cfg();
    var downMin = cfg.alwaysDownBots != null ? cfg.alwaysDownBots : 1;
    var i, f, downed = 0;
    for (i = 0; i < fighters.length; i++) {
      f = fighters[i];
      if (f.kind === "local" || f.kind === "host-client") {
        f.fighting = true;
        f.alive = true;
      } else {
        f.fighting = this.rng() > 0.42;
        f.alive = f.fighting;
        if (!f.fighting) downed += 1;
      }
    }
    if (downed < downMin) {
      for (i = 0; i < fighters.length && downed < downMin; i++) {
        f = fighters[i];
        if (f.kind === "bot" && f.fighting) {
          f.fighting = false;
          f.alive = false;
          downed += 1;
        }
      }
    }
  };

  BrawlSim.prototype.pickRevive = function () {
    var m = this.match;
    if (!m) return null;
    if (m.reviveDone) return null;
    m.reviveDone = true;
    var cap = this.cfg().partyCap || this.cfg().maxPlayers || 6;
    var live = m.fighters.filter(function (f) { return f.fighting; }).length;
    if (live >= cap) return null;
    var dead = m.fighters.filter(function (f) { return !f.fighting; });
    if (!dead.length) return null;
    var pick = dead[Math.floor(this.rng() * dead.length) % dead.length];
    pick.fighting = true;
    pick.alive = true;
    pick.revived = true;
    m.revivedId = pick.id;
    this.emit({ type: "brawl.revive", matchId: m.matchId, id: pick.id });
    return pick;
  };

  BrawlSim.prototype.begin = function (opts) {
    opts = opts || {};
    var cap = this.cfg().partyCap || this.cfg().maxPlayers || 6;
    var roster = (opts.players || opts.fighters || []).slice(0, cap);
    var origin = opts.origin || { x: 0, y: 0 };
    var i, fighters = [];
    for (i = 0; i < roster.length; i++) {
      fighters.push(this.makeFighter(roster[i], i, (opts.seed || 0) + i * 17));
    }
    if (!opts.aliveProvided) this.applySurvival(fighters);
    else {
      for (i = 0; i < fighters.length; i++) {
        fighters[i].fighting = roster[i].fighting === true || roster[i].alive === true;
        fighters[i].alive = fighters[i].fighting;
      }
    }
    var matchId = opts.matchId || ("brawl-" + (opts.seed || 0));
    this.inputs = {};
    this.match = {
      matchId: matchId,
      origin: { x: origin.x || 0, y: origin.y || 0 },
      fighters: fighters,
      phase: "odds",
      phaseT: 0,
      time: 0,
      fightT: 0,
      winnerId: null,
      payout: null,
      settled: false,
      revivedId: null,
      soloBonus: false,
      bets: {},
      floats: []
    };
    var revived = this.pickRevive();
    if (revived) {
      this.match.phase = "revive";
      this.match.phaseT = 0;
    }
    var liveN = fighters.filter(function (f) { return f.fighting; }).length;
    var soloMode = this.cfg().soloMode || "skip";
    if (liveN < 2 && soloMode !== "bonus") {
      this.match.skipped = true;
      this.match.phase = "skipped";
      return this.match;
    }
    if (liveN < 2 && soloMode === "bonus") this.match.soloBonus = true;
    if (this.match.soloBonus) this.startFight();
    this.emit({ type: "brawl.begin", matchId: matchId, count: fighters.length, phase: this.match.phase, revivedId: this.match.revivedId });
    return this.match;
  };

  BrawlSim.prototype.placeBet = function (bettorId, targetId) {
    var m = this.match;
    if (!m || m.settled || (m.phase !== "odds" && m.phase !== "revive")) return { ok: false, reason: "no-brawl" };
    var bettor = null, target = null, i, f;
    for (i = 0; i < m.fighters.length; i++) {
      f = m.fighters[i];
      if (f.id === bettorId) bettor = f;
      if (f.id === targetId) target = f;
    }
    if (!bettor) return { ok: false, reason: "not-in-match" };
    if (bettor.fighting) return { ok: false, reason: "still-fighting" };
    if (!target || !target.fighting) return { ok: false, reason: "bad-target" };
    bettor.betOn = target.id;
    m.bets[bettor.id] = target.id;
    this.emit({ type: "brawl.bet", matchId: m.matchId, id: bettor.id, targetId: target.id });
    return { ok: true, targetId: target.id };
  };

  BrawlSim.prototype.ready = function () {
    var m = this.match;
    if (!m) return { ok: false, reason: "no-brawl" };
    if (m.phase === "fight" || m.phase === "result" || m.phase === "payout" || m.settled) {
      return { ok: true, already: true, phase: m.phase };
    }
    if (m.phase === "revive" || m.phase === "odds") {
      this.startFight();
      return { ok: true, phase: "fight" };
    }
    return { ok: false, reason: "bad-phase" };
  };

  BrawlSim.prototype.startFight = function () {
    var m = this.match;
    if (!m || m.phase === "fight") return;
    this._botBets();
    var live = m.fighters.filter(function (f) { return f.fighting; });
    var origin = m.origin;
    var ring = this.spawnRingRadius(live.length);
    var n = 0, i, f, ang;
    for (i = 0; i < m.fighters.length; i++) {
      f = m.fighters[i];
      if (!f.fighting) continue;
      ang = (n / Math.max(1, live.length)) * Math.PI * 2 - Math.PI / 2;
      f.x = origin.x + Math.cos(ang) * ring;
      f.y = origin.y + Math.sin(ang) * ring;
      f.facing = (f.x < origin.x) ? 1 : -1;
      f.ko = false;
      f.hp = f.maxHp;
      f.vx = 0; f.vy = 0;
      f.iFrame = f.revived ? 1.1 : 0.2;
      f.enteredFight = true;
      n += 1;
    }
    m.phase = "fight";
    m.phaseT = 0;
    m.fightT = 0;
    this.emit({ type: "brawl.fight", matchId: m.matchId });
  };

  BrawlSim.prototype.spawnRingRadius = function (n) {
    if (n <= 1) return 0;
    if (n <= 2) return 78;
    if (n <= 4) return 108;
    return 148;
  };

  BrawlSim.prototype.arenaSize = function () {
    var c = this.cfg();
    var m = this.match;
    var n = m ? m.fighters.filter(function (f) { return f.fighting; }).length : 2;
    var add = n >= 5 ? 140 : (n === 4 ? 60 : 0);
    return { w: (c.arenaW || 720) + add, h: (c.arenaH || c.arenaD || 520) + Math.round(add * 0.7) };
  };

  BrawlSim.prototype._botBets = function () {
    var m = this.match;
    if (!m || m.soloBonus) return;
    var dead = m.fighters.filter(function (f) { return !f.fighting && f.kind !== "local" && f.kind !== "host-client" && !f.dummy; }).slice(0, 5);
    var live = m.fighters.filter(function (f) { return f.fighting; });
    if (!live.length) return;
    var i, pick;
    for (i = 0; i < dead.length; i++) {
      if (dead[i].betOn) continue;
      pick = live[Math.floor(this.rng() * live.length) % live.length];
      dead[i].betOn = pick.id;
      m.bets[dead[i].id] = pick.id;
    }
  };

  BrawlSim.prototype.pushInput = function (id, inp) {
    if (!id) return;
    /* A press stays queued until the next fight tick uses it, so a quick
     * tap is not lost between two messages. */
    var prev = this.inputs[id];
    this.inputs[id] = {
      x: inp && inp.x || 0,
      y: inp && inp.y || 0,
      attack: !!(inp && (inp.attack || inp.atk)) || !!(prev && prev.attack),
      dash: !!(inp && inp.dash) || !!(prev && prev.dash)
    };
  };

  BrawlSim.prototype.living = function () {
    var m = this.match;
    if (!m) return [];
    return m.fighters.filter(function (f) { return f.fighting && !f.ko && f.hp > 0; });
  };

  BrawlSim.prototype.tick = function (dt) {
    var m = this.match;
    if (!m || m.skipped || m.settled) return m;
    if (dt == null) dt = 1 / 25;
    m.time += dt;
    m.phaseT += dt;
    var cfg = this.cfg();
    if (m.phase === "revive") {
      if (m.phaseT >= (cfg.reviveSeconds || 2.4)) {
        m.phase = "odds";
        m.phaseT = 0;
        this.emit({ type: "brawl.phase", phase: "odds", matchId: m.matchId });
      }
      return m;
    }
    if (m.phase === "odds") {
      if (m.phaseT >= (cfg.oddsSeconds || 4.2)) this.startFight();
      return m;
    }
    if (m.phase === "result" || m.phase === "payout") return m;
    if (m.phase === "fight") this._updateFight(dt);
    return m;
  };

  BrawlSim.prototype._updateFight = function (dt) {
    var m = this.match;
    m.fightT += dt;
    var i, f, inp, live;
    for (i = 0; i < m.fighters.length; i++) {
      f = m.fighters[i];
      if (!f.fighting || f.ko) continue;
      if (f.kind === "bot") this._botThink(f, dt);
      else {
        inp = this.inputs[f.id] || { x: 0, y: 0 };
        this._applyInput(f, inp, dt);
        if (inp.attack) inp.attack = false;
        if (inp.dash) inp.dash = false;
      }
    }
    for (i = 0; i < m.fighters.length; i++) {
      f = m.fighters[i];
      if (f.fighting) this._integrate(f, dt);
    }
    this._separate();
    this._tickFx(dt);
    live = this.living();
    var limit = m.soloBonus ? (this.cfg().soloBonusSeconds || 12) : (this.cfg().maxFightSeconds || 40);
    if ((!m.soloBonus && live.length <= 1) || m.fightT >= limit) this._resolveWinner(live);
  };

  BrawlSim.prototype._applyInput = function (f, inp, dt) {
    var speed = 210;
    f.vx = (inp.x || 0) * speed;
    f.vy = (inp.y || 0) * speed;
    if (inp.x > 0.2) f.facing = 1;
    else if (inp.x < -0.2) f.facing = -1;
    if (inp.dash) this._tryDash(f);
    if (inp.attack) this._tryAttack(f);
  };

  BrawlSim.prototype._botThink = function (f, dt) {
    f._ai = (f._ai || 0) + dt;
    var targets = this.living().filter(function (o) { return o.id !== f.id; });
    if (!targets.length) { f.vx = 0; f.vy = 0; return; }
    var i, best = targets[0], bd = 1e15, d;
    for (i = 0; i < targets.length; i++) {
      d = dist2(f.x, f.y, targets[i].x, targets[i].y);
      if (d < bd) { bd = d; best = targets[i]; }
    }
    var dx = best.x - f.x, dy = best.y - f.y;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var range = 48;
    var speed = 170 + (f.tier || 1) * 8;
    if (f.hp < f.maxHp * 0.28 && len < 90 && f._ai % 3 < 0.9) {
      f.vx = -(dx / len) * speed;
      f.vy = -(dy / len) * speed;
    } else if (len > range) {
      f.vx = (dx / len) * speed;
      f.vy = (dy / len) * speed;
      if (f.mods && f.mods.extraMove && len < 180 && f.dashCd <= 0) this._tryDash(f);
    } else {
      f.vx *= 0.4;
      f.vy *= 0.4;
      if (f.atkCd <= 0) this._tryAttack(f);
    }
    if (dx > 4) f.facing = 1;
    else if (dx < -4) f.facing = -1;
  };

  BrawlSim.prototype._tryAttack = function (f) {
    var m = this.match;
    if (f.atkCd > 0 || f.ko || f.dashT > 0) return;
    f.atkCd = this.cfg().attackCd || 0.48;
    f.atkT = 0.22;
    var range = 52, i, o, d, dmg;
    dmg = (this.cfg().baseDamage || 11) * (0.92 + (f.tier || 1) * 0.03);
    for (i = 0; i < m.fighters.length; i++) {
      o = m.fighters[i];
      if (o === f || !o.fighting || o.ko || o.iFrame > 0) continue;
      d = Math.sqrt(dist2(f.x, f.y, o.x, o.y));
      if (d < range && (o.x - f.x) * f.facing >= -8) this._hit(f, o, dmg);
    }
  };

  BrawlSim.prototype._tryDash = function (f) {
    if (!f.mods || !f.mods.extraMove) return;
    if (f.dashCd > 0 || f.ko) return;
    f.dashCd = this.cfg().dashCd || 3;
    f.dashT = 0.22;
    var dx = f.vx, dy = f.vy, len = Math.sqrt(dx * dx + dy * dy);
    if (len < 8) { dx = f.facing; dy = 0; len = 1; }
    f.vx = (dx / len) * 520;
    f.vy = (dy / len) * 520;
  };

  BrawlSim.prototype._hit = function (atk, def, dmg) {
    var m = this.match;
    def.hp -= dmg;
    def.iFrame = 0.32;
    def.hurtT = 0.18;
    def.vx += atk.facing * 140;
    this._addFloat(def.x, def.y - 28, Math.round(dmg) + "", "#ffe8c0");
    this.emit({ type: "brawl.hit", matchId: m.matchId, from: atk.id, to: def.id, dmg: dmg });
    if (def.hp <= 0) {
      def.hp = 0;
      def.ko = true;
      def.vx = atk.facing * 80;
      this._addFloat(def.x, def.y - 40, "KO!", def.color || "#fff");
      this.emit({ type: "brawl.ko", matchId: m.matchId, id: def.id, by: atk.id });
    }
  };

  BrawlSim.prototype._integrate = function (f, dt) {
    var m = this.match;
    f.atkCd = Math.max(0, f.atkCd - dt);
    f.dashCd = Math.max(0, f.dashCd - dt);
    f.iFrame = Math.max(0, f.iFrame - dt);
    f.atkT = Math.max(0, f.atkT - dt);
    f.dashT = Math.max(0, f.dashT - dt);
    f.hurtT = Math.max(0, f.hurtT - dt);
    if (f.ko) {
      f.vx *= Math.pow(0.05, dt);
      f.vy *= Math.pow(0.05, dt);
      this._moveFighter(f, f.vx * dt, f.vy * dt);
      return;
    }
    if (f.dashT > 0) {
      var i, o, dmg = (this.cfg().baseDamage || 11) * 0.85;
      for (i = 0; i < m.fighters.length; i++) {
        o = m.fighters[i];
        if (o === f || !o.fighting || o.ko || o.iFrame > 0) continue;
        if (Math.sqrt(dist2(f.x, f.y, o.x, o.y)) < 44) this._hit(f, o, dmg);
      }
    }
    this._moveFighter(f, f.vx * dt, f.vy * dt);
    f.vx *= Math.pow(0.08, dt);
    f.vy *= Math.pow(0.08, dt);
    if (!f.ko) {
      var regen = (this.cfg().regenPerSec || 2.2) * ((f.mods && f.mods.regen) || 1);
      f.hp = Math.min(f.maxHp, f.hp + regen * dt);
    }
  };

  BrawlSim.prototype._moveFighter = function (f, dx, dy) {
    var rad = this._fighterRad(f);
    var pos;
    var w = this.data && this.data.world;
    if (w && w.moveSlide) pos = w.moveSlide(f.x, f.y, dx, dy, rad);
    else pos = { x: f.x + dx, y: f.y + dy };
    var origin = (this.match && this.match.origin) || { x: 0, y: 0 };
    var size = this.arenaSize();
    var hw = size.w / 2, hh = size.h / 2;
    pos.x = clamp(pos.x, origin.x - hw + 24, origin.x + hw - 24);
    pos.y = clamp(pos.y, origin.y - hh + 24, origin.y + hh - 24);
    if (w && w.isRaised && w.isRaised(pos.x, pos.y, rad) && w.nearestWalkable) {
      pos = w.nearestWalkable(pos.x, pos.y, 280, rad) || pos;
    }
    f.x = pos.x;
    f.y = pos.y;
  };

  BrawlSim.prototype._fighterRad = function (f) {
    var id = f && f.form;
    var def = (this.data.SPECIES && this.data.SPECIES[id]) || {};
    var base = def.radius || 12;
    if (this.data.sprites && this.data.sprites.bodyRadius) return this.data.sprites.bodyRadius(id, base);
    return Math.max(6, base);
  };

  BrawlSim.prototype._separate = function () {
    var m = this.match;
    var i, j, a, b, dx, dy, d, push;
    for (i = 0; i < m.fighters.length; i++) {
      a = m.fighters[i];
      if (!a.fighting) continue;
      for (j = i + 1; j < m.fighters.length; j++) {
        b = m.fighters[j];
        if (!b.fighting) continue;
        dx = b.x - a.x; dy = b.y - a.y;
        d = Math.sqrt(dx * dx + dy * dy) || 0.001;
        if (d < 36) {
          push = (36 - d) / 2;
          this._moveFighter(a, -(dx / d) * push, -(dy / d) * push);
          this._moveFighter(b, (dx / d) * push, (dy / d) * push);
        }
      }
    }
  };

  BrawlSim.prototype._addFloat = function (x, y, text, color) {
    if (!this.match) return;
    this.match.floats.push({ x: x, y: y, text: text, color: color || "#fff", life: 0.7, max: 0.7 });
  };

  BrawlSim.prototype._tickFx = function (dt) {
    var m = this.match, i, f;
    for (i = m.floats.length - 1; i >= 0; i--) {
      f = m.floats[i];
      f.life -= dt;
      f.y -= 36 * dt;
      if (f.life <= 0) m.floats.splice(i, 1);
    }
  };

  BrawlSim.prototype._resolveWinner = function (live) {
    var m = this.match;
    if (m.winnerId) return;
    var winner = null;
    if (live && live.length === 1) winner = live[0];
    else {
      var pool = m.fighters.filter(function (f) { return f.fighting; }).slice();
      pool.sort(function (a, b) {
        var dh = (b.hp || 0) - (a.hp || 0);
        if (dh !== 0) return dh;
        return String(a.id).localeCompare(String(b.id));
      });
      winner = pool[0] || null;
    }
    m.winnerId = winner ? winner.id : null;
    m.phase = "result";
    m.phaseT = 0;
    this.emit({ type: "brawl.winner", matchId: m.matchId, winnerId: m.winnerId });
  };

  BrawlSim.prototype.snapshot = function () {
    var m = this.match;
    if (!m) return null;
    var i, f, out = [];
    for (i = 0; i < m.fighters.length; i++) {
      f = m.fighters[i];
      out.push({
        id: f.id, form: f.form, kind: f.kind, hasTamer: f.hasTamer, name: f.name,
        color: f.color, title: f.title, tier: f.tier, mods: f.mods,
        hp: f.hp, maxHp: f.maxHp, x: f.x, y: f.y, vx: f.vx, vy: f.vy,
        facing: f.facing, iFrame: f.iFrame, atkT: f.atkT, dashT: f.dashT, hurtT: f.hurtT,
        ko: f.ko, fighting: f.fighting, alive: f.alive, revived: f.revived,
        enteredFight: f.enteredFight, betOn: f.betOn
      });
    }
    return {
      matchId: m.matchId,
      phase: m.phase,
      phaseT: m.phaseT,
      time: m.time,
      fightT: m.fightT,
      origin: m.origin,
      winnerId: m.winnerId,
      payout: m.payout,
      settled: m.settled,
      revivedId: m.revivedId,
      skipped: !!m.skipped,
      soloBonus: !!m.soloBonus,
      bets: m.bets,
      fighters: out,
      floats: m.floats.slice()
    };
  };

  var api = { BrawlSim: BrawlSim };
  D.net = D.net || {};
  D.net.brawl = api;
  if (isNode) module.exports = api;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
