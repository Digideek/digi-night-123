/* event-sim.js (17z33): rare world events everybody on the map can team up on.
 *
 * At the start of a run the host rolls how many happen (data.js WORLD_EVENTS.roll): most runs
 * none, some one, now and then two, at random times (window) at least `gap` seconds apart.
 * Each one is announced to every player `warn` seconds before it starts, with where it is.
 *
 *   outbreak  a Patient Zero: an infected Digimon (virus-sim.js) built far tougher than the rest,
 *             with two carriers. Beat it in time. Ignore it and it slips away, leaving the
 *             Digimon round it infected.
 *   surge     a Dark Area rift opens: land round it turns to the Glitch biome every few seconds,
 *             spreading outward, and a Surge Lord comes out of it. Beat the Surge Lord in time and
 *             the land goes back to whoever held it; run out of time and the Glitch keeps it.
 *   rampage   a field Mega on the rampage. Bring it down before it moves on.
 *
 * Everybody wins together: when the boss falls, every tamer in the run is paid, whatever side
 * they are on (full pay if they were near it at any point, half if they never came). Its health
 * grows with the number of tamers. The host decides everything; guests only see the events
 * (wev.warn / wev.start / wev.state / wev.end, drawn by js/world-events.js). */
(function (root) {
  "use strict";

  function install(MissionSim, h) {
    var dist2 = h.dist2;
    /* the roll has its own random numbers, so it does not shift anything else in the run */
    function rng32(seed) {
      var a = seed >>> 0;
      return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    }
    var NAMES = { outbreak: "Virus outbreak", surge: "Dark Area surge", rampage: "Rampaging Mega" };

    MissionSim.prototype._wevCfg = function () { return this.data && this.data.WORLD_EVENTS; };

    /* how many and when: decided once per run */
    MissionSim.prototype._wevPlan = function () {
      var C = this._wevCfg(), r = rng32((this.seed ^ 0x5EED17) >>> 0), n = 0, x = r(), i, t, at = [], kinds = C.kinds, k, ok, tries;
      if (x >= C.roll[0]) n = x < C.roll[0] + C.roll[1] ? 1 : 2;
      for (i = 0; i < n; i++) {
        for (tries = 0; tries < 30; tries++) {
          t = C.window[0] + r() * (C.window[1] - C.window[0]);
          ok = true;
          for (k = 0; k < at.length; k++) if (Math.abs(at[k].t - t) < C.gap) ok = false;
          if (ok) break;
        }
        if (ok) at.push({ t: Math.round(t), kind: kinds[(r() * kinds.length) | 0] });
      }
      at.sort(function (a, b) { return a.t - b.t; });
      return at;
    };

    MissionSim.prototype._wevHere = function () {
      var out = [], i, p;
      for (i = 0; i < this.players.length; i++) { p = this.players[i]; if (p.hasTamer !== false && !p.away && p.kind !== "cpu") out.push(p); }
      return out;
    };

    /* somewhere a little way off from one of the tamers, out of the start zone */
    MissionSim.prototype._wevSpot = function (r) {
      var C = this._wevCfg(), who = this._wevHere(), p = who[(r() * who.length) | 0] || this.players[0], i, a, d, x, y, s;
      if (!p) return null;
      for (i = 0; i < 24; i++) {
        a = r() * Math.PI * 2; d = C.dist[0] + r() * (C.dist[1] - C.dist[0]) + i * 60;
        x = p.x + Math.cos(a) * d; y = p.y + Math.sin(a) * d;
        if (this._startZone && this._startZone(x, y)) continue;
        s = this._snap(x, y, 16, 300);
        if (s) return { x: Math.round(s.x), y: Math.round(s.y) };
      }
      return { x: Math.round(p.x + C.dist[1]), y: Math.round(p.y) };
    };

    MissionSim.prototype._wevPack = function (ev) {
      return { kind: ev.kind, name: NAMES[ev.kind], x: ev.x, y: ev.y, left: Math.max(0, Math.round((ev.phase === "warn" ? ev.liveAt : ev.until) - this.time)), phase: ev.phase,
        hp: ev.boss ? Math.max(0, Math.round(100 * ev.boss.hp / ev.boss.maxHp)) : 100, bossType: ev.boss ? ev.boss.type : null, n: ev.n };
    };

    /* the host's tick (mission-sim.js _updateSpawns) */
    MissionSim.prototype._updateWev = function (dt) {
      var C = this._wevCfg(), ev, i, p, near2, who;
      if (!C || this.noEvents) return;
      if (!this._wevSched) { this._wevSched = this._wevPlan(); this._wevN = 0; this._wevR = rng32((this.seed ^ 0xE7E47) >>> 0); }
      ev = this.wev;
      if (!ev) this._wevTogether();
      if (!ev) {
        var next = this._wevSched[0];
        if (!next || this.time < next.t - C.warn) return;
        this._wevSched.shift();
        this._wevStart(next.kind);
        return;
      }
      ev.stateT = (ev.stateT || 0) - dt;
      if (ev.phase === "warn") {
        if (this.time >= ev.liveAt) this._wevGo(ev);
        else if (ev.stateT <= 0) { ev.stateT = 1; this.emit(Object.assign({ type: "wev.state" }, this._wevPack(ev))); }
        return;
      }
      /* who has come to help */
      near2 = C.near * C.near; who = this._wevHere();
      if (ev.boss && !ev.boss.dead) { ev.x = Math.round(ev.boss.x); ev.y = Math.round(ev.boss.y); }
      for (i = 0; i < who.length; i++) { p = who[i]; if (dist2(p.x, p.y, ev.x, ev.y) < near2 || dist2(p.mx, p.my, ev.x, ev.y) < near2) ev.came[p.id] = 1; }
      if (ev.kind === "surge") this._wevSurge(ev, dt);
      /* it went missing without being beaten (it should not): call it off, nobody loses anything */
      if (!ev.boss || (ev.boss.dead && !ev.won) || this.enemies.indexOf(ev.boss) < 0) { if (!ev.won) return this._wevEnd(ev, false, "gone"); }
      if (this.time >= ev.until) return this._wevEnd(ev, false);
      if (ev.stateT <= 0) { ev.stateT = 1; this.emit(Object.assign({ type: "wev.state" }, this._wevPack(ev))); }
    };

    /* friends in the run (17z33): keep the next event on a timer instead of the rare roll */
    MissionSim.prototype._wevTogether = function () {
      var T = this._wevCfg().together, n = this._wevHere().length, r = this._wevR, at, kinds = this._wevCfg().kinds;
      if (!T || n < T.players) { this._wevTogAt = null; return; }
      if (this._wevTogAt == null) {
        /* the first one with company comes soon; after an event, a while after it ended */
        at = this.time + T.first[0] + r() * (T.first[1] - T.first[0]);
        if (this._wevLastEnd != null) at = Math.max(at, this._wevLastEnd + T.every[0] + r() * (T.every[1] - T.every[0]));
        this._wevTogAt = Math.round(at);
      }
      /* something on the rare roll comes sooner anyway: leave it */
      if (this._wevSched[0] && this._wevSched[0].t <= this._wevTogAt) return;
      if (this.time >= this._wevTogAt - this._wevCfg().warn) {
        this._wevSched.unshift({ t: this.time + this._wevCfg().warn, kind: kinds[(r() * kinds.length) | 0] });
        this._wevTogAt = null;
      }
    };

    MissionSim.prototype._wevStart = function (kind) {
      var C = this._wevCfg(), r = this._wevR, spot = this._wevSpot(r);
      if (!spot) return;
      this._wevN = (this._wevN || 0) + 1;
      this.wev = { kind: kind, n: this._wevN, x: spot.x, y: spot.y, phase: "warn", liveAt: this.time + C.warn, until: this.time + C.warn + C.dur[kind], came: {}, cells: null, boss: null };
      this.emit(Object.assign({ type: "wev.warn" }, this._wevPack(this.wev)));
    };

    MissionSim.prototype._wevHp = function () {
      var C = this._wevCfg();
      return 1 + C.hpPer * Math.max(0, this._wevHere().length - 1);
    };

    /* a Digimon of the right stage for the time, from a pool (null: anything not a boss) */
    MissionSim.prototype._wevType = function (stages, home) {
      var defs = this._enemies(), BI = this.data.biomes, pool = [], k;
      for (k in defs) {
        if (!defs[k] || defs[k].boss || stages.indexOf(defs[k].stageDisplay) < 0) continue;
        if (home && !(BI && BI.homeOf && BI.homeOf(k) === home)) continue;
        pool.push(k);
      }
      if (!pool.length && home) return this._wevType(stages, null);
      pool.sort();
      return pool.length ? pool[(this._wevR() * pool.length) | 0] : null;
    };

    MissionSim.prototype._wevGo = function (ev) {
      var C = this._wevCfg(), min = this.time / 60, mul = this._wevHp(), e = null, type, i, c, a;
      ev.phase = "live";
      if (ev.kind === "outbreak") {
        type = this._wevType(min >= C.outbreak.ultAt ? ["Perfect (Ultimate)"] : ["Adult (Champion)"], null);
        e = type ? this.spawnEnemy(type, { keepType: true, quiet: true, x: ev.x, y: ev.y }) : null;
        if (e && this._infect) this._infect(e, null);
        if (e) {
          e.hp = e.maxHp = e.maxHp * C.outbreak.hpMul * mul; e.dmgMul = (e.dmgMul || 1) * C.outbreak.dmgMul;
          e.radius = (e.radius || 12) * 1.25; e.zero = 1;
          /* and two it has already given it to */
          for (i = 0; i < C.outbreak.carriers; i++) {
            a = (Math.PI * 2 * i) / C.outbreak.carriers;
            c = this.spawnEnemy(type, { keepType: true, quiet: true, x: ev.x + Math.cos(a) * 70, y: ev.y + Math.sin(a) * 50 });
            if (c && this._infect) this._infect(c, e);
          }
        }
      } else if (ev.kind === "surge") {
        type = this._wevType(min >= C.surge.megaAt ? ["Ultimate (Mega)"] : ["Perfect (Ultimate)"], "glitch");
        e = type ? this.spawnEnemy(type, { keepType: true, boss: true, quiet: true, x: ev.x, y: ev.y }) : null;
        if (e) { e.hp = e.maxHp = e.maxHp * C.surge.hpMul * mul; e.spdMul = (e.spdMul || 1) * C.surge.spdMul; }
        ev.cells = {}; ev.ring = 0; ev.flipT = 0;
      } else {
        type = this._pickMegaType(this.data.MEGA_SPAWN || {});
        e = type ? this.spawnEnemy(type, { fieldMega: true, quiet: true, x: ev.x, y: ev.y }) : null;
        if (e) { e.hp = e.maxHp = e.maxHp * C.rampage.hpMul * mul; e.spdMul = (e.spdMul || 1) * C.rampage.spdMul; }
      }
      if (!e) { this.wev = null; this.emit({ type: "wev.end", kind: ev.kind, name: NAMES[ev.kind], n: ev.n, won: false, why: "gone", x: ev.x, y: ev.y }); return; }
      e.wev = ev.n;
      ev.boss = e;
      ev.stateT = 0;
      this.emit(Object.assign({ type: "wev.start" }, this._wevPack(ev)));
    };

    /* the Dark Area spreads out from the rift, a ring at a time */
    MissionSim.prototype._wevSurge = function (ev, dt) {
      var C = this._wevCfg().surge, w = this.data.world, span, rcx, rcy, cx, cy, k, list = [], i, j, had, n = 0;
      if (!w || !w.cellOwner || !w.setOwner || !w.TILE || !w.TILE()) return;
      ev.flipT -= dt;
      if (ev.flipT > 0) return;
      ev.flipT = C.every;
      span = w.TERR * w.TILE();
      if (ev.rcx == null) { ev.rcx = Math.floor(ev.x / span); ev.rcy = Math.floor(ev.y / span); }
      rcx = ev.rcx; rcy = ev.rcy;
      for (j = 0; j <= ev.ring; j++) {
        for (cy = rcy - j; cy <= rcy + j; cy++) for (cx = rcx - j; cx <= rcx + j; cx++) {
          if (Math.max(Math.abs(cx - rcx), Math.abs(cy - rcy)) !== j) continue;
          k = cx + "," + cy;
          if (w.cellOwner(cx, cy) !== "glitch") list.push([cx, cy, k]);
        }
        if (list.length) break;
      }
      if (!list.length) { if (ev.ring < C.maxRing) ev.ring++; return; }
      for (i = 0; i < list.length && n < C.perStep; i++) {
        cx = list[i][0]; cy = list[i][1]; k = list[i][2];
        if (this._startZone && this._startZone((cx + 0.5) * span, (cy + 0.5) * span) >= 2) continue;   /* the cradle round the start stays as it is */
        had = w.cellOwner(cx, cy);
        if (w.setOwner(cx, cy, "glitch")) {
          if (!(k in ev.cells)) ev.cells[k] = had;
          n++;
          this.emit({ type: "war.flip", cx: cx, cy: cy, from: had, to: "glitch", x: Math.round((cx + 0.5) * span), y: Math.round((cy + 0.5) * span) });
        }
      }
      if (n < C.perStep && ev.ring < C.maxRing) ev.ring++;
    };

    /* its boss is down (mission-sim.js kill) */
    MissionSim.prototype._wevDown = function (e) {
      var ev = this.wev;
      if (!ev || e.wev !== ev.n || ev.phase !== "live") return;
      ev.won = true;
      this._wevEnd(ev, true);
    };

    MissionSim.prototype._wevEnd = function (ev, won, why) {
      var C = this._wevCfg(), pay = {}, who = this._wevHere(), i, p, full, xp, bits, k, w = this.data.world, back = 0, sp, e, d, nInf = 0, crew = 1, came = 0;
      this.wev = null;
      this._wevLastEnd = this.time; this._wevTogAt = null;
      /* the crew bonus: more pay for everyone the more tamers turned up */
      for (k in ev.came) came++;
      if (C.together && came > 1) crew = 1 + Math.min(C.together.crewMax, C.together.crew * (came - 1));
      if (won) {
        for (i = 0; i < who.length; i++) {
          p = who[i]; full = !!ev.came[p.id];
          xp = Math.round(this._xpNeeded(p.level || 1) * C.reward.xp * (full ? 1 : C.reward.away) * crew);
          bits = Math.round(C.reward.bits * (1 + (this.time / 60) * C.reward.bitsPerMin) * (full ? 1 : C.reward.away) * crew);
          p.xp = (p.xp || 0) + xp; this._tryLevel(p);
          this._tamerXp(p, xp * C.reward.tamer);
          p.bits = (p.bits || 0) + bits;
          p.wevWins = (p.wevWins || 0) + 1;
          pay[p.id] = { xp: xp, bits: bits, full: full };
        }
        if (ev.kind === "surge" && ev.cells && w && w.cellOwner) {
          for (k in ev.cells) { sp = k.split(","); if (w.cellOwner(+sp[0], +sp[1]) === "glitch" && w.setOwner(+sp[0], +sp[1], ev.cells[k])) { back++; this.emit({ type: "war.flip", cx: +sp[0], cy: +sp[1], from: "glitch", to: ev.cells[k], x: Math.round((+sp[0] + 0.5) * w.TERR * w.TILE()), y: Math.round((+sp[1] + 0.5) * w.TERR * w.TILE()) }); } }
        }
      } else if (why !== "gone") {
        e = ev.boss;
        if (ev.kind === "outbreak" && e && !e.dead) {
          /* it slips away, leaving the virus behind it */
          for (i = 0; i < this.enemies.length && nInf < C.outbreak.leaves; i++) {
            d = this.enemies[i];
            if (d === e || d.dead || d.virus) continue;
            if (dist2(d.x, d.y, e.x, e.y) < C.outbreak.leaveR * C.outbreak.leaveR && this._infect && this._infect(d, e)) nInf++;
          }
        }
        if (e && !e.dead && ev.kind !== "surge") { e.dead = true; e.hp = 0; this.emit({ type: "fx", k: "poof", x: e.x, y: e.y }); }
        if (e && !e.dead && ev.kind === "surge") { e.wev = null; }     /* the Surge Lord stays, an ordinary boss now */
      }
      this.emit({ type: "wev.end", kind: ev.kind, name: NAMES[ev.kind], n: ev.n, won: !!won, why: why || null, x: ev.x, y: ev.y, pay: pay, crew: came, back: back, held: ev.cells ? Object.keys(ev.cells).length - back : 0, infected: nInf });
    };

    /* for tests and the dev console: start one now (host only) */
    MissionSim.prototype.wevForce = function (kind) {
      if (this.wev) return false;
      if (!this._wevSched) { this._wevSched = []; this._wevN = 0; this._wevR = rng32((this.seed ^ 0xE7E47) >>> 0); }
      this._wevStart(NAMES[kind] ? kind : "outbreak");
      return true;
    };
    MissionSim.prototype._wevPlanFor = function (seed) { var s = this.seed; this.seed = seed; var p = this._wevPlan(); this.seed = s; return p; };
  }

  var isNode = typeof module !== "undefined" && module.exports;
  if (isNode) module.exports = install;
  else { root.DBH = root.DBH || {}; root.DBH.installWorldEvents = install; }
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
