/* Versus (17z33; data.js VERSUS). Online only: a race to level up, then a fight. Best of three.
 *
 *   race       VERSUS.race seconds. Each tamer starts on their own side of the map, VERSUS.spread from
 *              the middle (left, right, then top and bottom for more players), and levels up as fast
 *              as they can. No PvP yet, no rival, no outbreaks, no world events. The middle is where
 *              the good stuff is: a cache of experience every cacheEvery seconds, and a mini boss at
 *              each of bossAt, sitting there until someone comes for it. A partner that falls isn't
 *              reset: it's back on its own side after reviveSec, at reviveHp of its health.
 *   showdown   everyone is pulled into an arena in the middle, the wild Digimon round it cleared and
 *              kept out, partners healed and set facing each other. PvP is on for everyone (pvp-sim.js
 *              does the fighting); tamers can't be hurt. A partner knocked out is out of the round; the
 *              last one standing wins it. First to toWin rounds wins the match.
 *   done       the result, then the run ends for everyone (runOver).
 * Every screen hears vs.state (once a second), vs.cache, vs.boss, vs.showdown, vs.round, vs.end.
 */
(function (root) {
  "use strict";
  function install(MissionSim, U) {
    var dist2 = U.dist2;
    function cfg(sim) { return sim.data.VERSUS; }
    /* Versus has two forms (17z33): the race ("versus") and the straight Duel ("duel"), which skips the race */
    MissionSim.prototype._isVs = function () { var m = this._mode(); return m === "versus" || m === "duel"; };
    MissionSim.prototype._vsPlayers = function () { var o = [], i, p; for (i = 0; i < this.players.length; i++) { p = this.players[i]; if (p.hasTamer !== false && p.kind !== "cpu" && !p.away) o.push(p); } return o; };
    MissionSim.prototype._vsHome = function (p) {
      var C = cfg(this), ps = this._vsPlayers(), i = Math.max(0, ps.indexOf(p)), dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]], d = dirs[i % 4], s;
      s = this._snap(d[0] * C.spread, d[1] * C.spread, 16, 400);
      return s;
    };
    function place(p, x, y) { p.x = x; p.y = y; p.mx = x + 26; p.my = y + 6; }
    MissionSim.prototype._updateVersus = function (dt) {
      var C = cfg(this), vs = this.vs, ps, i, p, s, sim = this;
      if (!C) return;
      if (!vs) {
        vs = this.vs = { phase: "race", t0: this.time, cacheT: C.cacheEvery, bossI: 0, wins: {}, round: 0, stateT: 0, out: {} };
        this.noRival = true; this.noVirus = true; this.noEvents = true;
        this.sharedXp = false;                 /* a race: your XP is yours (co-op shares it; Versus never should) */
        ps = this._vsPlayers();
        for (i = 0; i < ps.length; i++) { s = this._vsHome(ps[i]); place(ps[i], s.x, s.y); ps[i].pvpFlag = false; }
        this.emit({ type: "vs.start", race: C.race, duel: this._mode() === "duel" ? 1 : 0, players: ps.map(function (q) { return q.id; }) });
        if (this._mode() === "duel") this._vsShowdownStart(ps);                /* a Duel: straight into the arena */
      }
      ps = this._vsPlayers();
      if (vs.phase === "race") this._vsRace(dt, ps);
      else if (vs.phase === "showdown") this._vsShowdown(dt, ps);
      else if (vs.phase === "done") { vs.endT -= dt; if (vs.endT <= 0 && !this.runOver) { this.runOver = true; this.emit({ type: "runOver", reason: "versus" }); } }
      vs.stateT -= dt;
      if (vs.stateT <= 0) {
        vs.stateT = 1;
        this.emit({ type: "vs.state", phase: vs.phase, left: vs.phase === "race" ? Math.max(0, Math.round(C.race - (this.time - vs.t0))) : (vs.phase === "showdown" && !(vs.countT > 0) && !(vs.betweenT > 0) ? Math.max(0, Math.round(C.roundSec - (vs.roundT || 0))) : 0), round: vs.round,
          players: ps.map(function (q) { return { id: q.id, level: q.level || 1, form: q.form, wins: vs.wins[q.id] || 0, out: !!vs.out[q.id], name: q.name || null, aim: vs.phase === "showdown" ? (q.vsAim || null) : null, pick: !!q.vsPick, meter: Math.floor(q.vsMeter || 0), need: sim._vsNeedLv(q.form), top: sim._vsStage(q.form) >= 3 }; }) });
      }
    };
    MissionSim.prototype._vsRace = function (dt, ps) {
      var C = cfg(this), vs = this.vs, i, p, a, s, e, type, lv = 1, mid = this._snap(0, 0, 20, 500);
      for (i = 0; i < ps.length; i++) lv = Math.max(lv, ps[i].level || 1);
      /* a cache of experience in the middle */
      vs.cacheT -= dt;
      if (vs.cacheT <= 0 && this.time - vs.t0 > 20) {
        vs.cacheT = C.cacheEvery;
        var val = Math.max(4, Math.round(this._xpNeeded(lv) * C.cacheLv));
        for (i = 0; i < C.cacheOrbs; i++) { a = (Math.PI * 2 * i) / C.cacheOrbs; this._spawnOrb("xp", mid.x + Math.cos(a) * 38, mid.y + Math.sin(a) * 30, val); }
        this._spawnOrb("bits", mid.x, mid.y, 30); this._spawnOrb("heal", mid.x + 10, mid.y - 8, 1);
        for (i = 0; i < (C.cacheMeter || 0); i++) { a = (Math.PI * 2 * (i + 0.5)) / C.cacheMeter; this._spawnOrb("evo", mid.x + Math.cos(a) * 62, mid.y + Math.sin(a) * 48, C.cacheMeterVal); }
        this.emit({ type: "vs.cache", x: Math.round(mid.x), y: Math.round(mid.y) });
      }
      /* a mini boss sits in the middle until someone comes for it */
      if (vs.bossI < C.bossAt.length && this.time - vs.t0 >= C.bossAt[vs.bossI]) {
        vs.bossI++;
        var stages = lv >= 20 ? ["Champion", "Ultimate"] : (lv >= 8 ? ["Rookie", "Champion"] : ["In-Training", "Rookie"]);
        type = this._vsType(stages);
        e = type ? this.spawnEnemy(type, { keepType: true, boss: true, x: mid.x, y: mid.y }) : null;
        if (e) {
          var key = "vsboss" + vs.bossI;
          this.packs = this.packs || {}; this.packs[key] = { awake: false, x: mid.x, y: mid.y };
          e.pack = key; e.homeX = mid.x; e.homeY = mid.y; e.vsBoss = 1; e.vsN = vs.bossI;
          this.emit({ type: "vs.boss", n: vs.bossI, enemyType: type, x: Math.round(mid.x), y: Math.round(mid.y) });
        }
      }
      if (this.time - vs.t0 >= C.race) this._vsShowdownStart(ps);
    };
    /* ---------- the DIGIVOLVE meter (17z33) ---------- */
    var STAGE_I = { "In-Training": -1, Rookie: 0, Champion: 1, Armor: 1, Ultimate: 2, Mega: 3, "Mega+": 3 };
    MissionSim.prototype._vsStage = function (form) {
      var sp = this.data.SPECIES && this.data.SPECIES[form], st = sp && (sp.stageKey || sp.stage);
      return STAGE_I[st] != null ? STAGE_I[st] : -1;
    };
    MissionSim.prototype._vsNeedLv = function (form) {
      var C = cfg(this), sp = this.data.SPECIES && this.data.SPECIES[form], st = sp && (sp.stageKey || sp.stage);
      return (C && C.evoLv && C.evoLv[st]) || 0;
    };
    /* how far along a partner is: stages count `meter` each */
    MissionSim.prototype._vsProgress = function (p) { var C = cfg(this); return Math.max(0, this._vsStage(p.form)) * C.meter + (p.vsMeter || 0); };
    /* clearly ahead of everyone else? then the middle pays it less */
    MissionSim.prototype._vsLeader = function (p) {
      var C = cfg(this), ps = this._vsPlayers(), me = this._vsProgress(p), i, best = -1;
      for (i = 0; i < ps.length; i++) if (ps[i] !== p) best = Math.max(best, this._vsProgress(ps[i]));
      return best >= 0 && me >= best + C.leadBy;
    };
    /* add to the meter; `middle` (a cache, a mini boss) is cut for the leader. Full is full: no more past it. */
    MissionSim.prototype._vsMeterAdd = function (p, n, middle, x, y) {
      var C = cfg(this);
      if (!C || !p || !this._isVs() || !this.vs || this.vs.phase !== "race" || this._vsStage(p.form) >= 3 || !(n > 0)) return 0;
      if (middle && this._vsLeader(p)) n *= C.leadMul;
      var was = p.vsMeter || 0;
      p.vsMeter = Math.min(C.meter, was + n);
      if (middle && x != null) this.emit({ type: "vs.meter", id: p.id, add: Math.round((p.vsMeter - was) * 10) / 10, meter: Math.floor(p.vsMeter), x: Math.round(x), y: Math.round(y) });
      return p.vsMeter - was;
    };
    /* a mini boss: every partner's damage to it is counted (after criticals and type advantage) */
    MissionSim.prototype._vsBossHit = function (e, p, dmg) {
      if (!e.vsBoss || !p || p.id == null || !(dmg > 0)) return;
      e.vsDmg = e.vsDmg || {};
      e.vsDmg[p.id] = (e.vsDmg[p.id] || 0) + dmg;
    };
    /* a kill fills the killer's meter a little; a mini boss pays everyone who hurt it, by how much */
    MissionSim.prototype._vsKill = function (e, p) {
      var C = cfg(this), k, tot = 0, q, pool;
      if (!C || !this._isVs()) return;
      if (e.vsBoss && e.vsDmg) {
        pool = C.bossMeter[Math.max(0, Math.min(C.bossMeter.length - 1, (e.vsN || 1) - 1))];
        for (k in e.vsDmg) tot += e.vsDmg[k];
        var shares = {};
        for (k in e.vsDmg) { q = this.player(k); if (q && tot > 0) shares[k] = Math.round(this._vsMeterAdd(q, pool * e.vsDmg[k] / tot, true, e.x, e.y) * 10) / 10; }
        this.emit({ type: "vs.bossDown", enemyType: e.type, shares: shares, pool: pool, x: Math.round(e.x), y: Math.round(e.y) });
        return;
      }
      var def = this._enemies()[e.type] || {};
      if (p) this._vsMeterAdd(p, e.boss ? C.meterBoss : (e.elite || def.elite ? C.meterElite : C.meterKill), false);
    };
    /* called each tick by progression.js for every partner in Versus: hatch straight into the Rookie you
       picked; then digivolve the moment the meter is full and the level is there */
    MissionSim.prototype._vsRookie = function (id) {
      var C = cfg(this), sp = id && this.data.SPECIES && this.data.SPECIES[id];
      if (sp && this._vsStage(id) === 0 && this._burstForm(id) !== id) return id;
      return (C && C.start && C.start[0]) || "agumon";
    };
    /* a Duel: the partner is the tamer's Hatchery Digimon as it is (join rec duel, hatchery.js duelSpec), or the
       fallback; set once, quietly, during the first countdown. Nothing here touches the Hatchery itself. */
    MissionSim.prototype._duelClean = function (d) {
      var sp, st;
      if (!d || typeof d !== "object" || typeof d.form !== "string") return null;
      sp = this.data.SPECIES && this.data.SPECIES[d.form]; st = this._vsStage(d.form);
      if (!sp || this._isEgg(d.form) || st > 1) return null;              /* the Hatchery stops at Champion */
      return { form: d.form, level: Math.max(1, Math.min(20, d.level | 0 || 1)), blood: this._bloodClean ? this._bloodClean(d.blood) : null };
    };
    /* its points spent the way you'd build it: its own main move first, then its melee, then the rest */
    MissionSim.prototype._duelSpend = function (p) {
      var SK = this._sk(), pool, want, id, i, g = 0, fresh;
      if (!SK) return;
      p.skills = p.skills || {};
      while ((p.skillPoints || 0) > 0 && g++ < 80) {
        pool = this.data.movePool(p.form); want = [pool.primary, pool.melee]; id = null;
        for (i = 0; i < want.length && !id; i++) if (want[i] && !SK.blocked(this.data, p.form, p.skills, want[i]) && (p.skills[want[i]] || 0) < SK.MAX) id = want[i];
        if (!id) id = SK.autoPick(this.data, p.form, p.skills, this.equipSlots(p));
        if (!id) break;
        fresh = !(p.skills[id] > 0); p.skills[id] = (p.skills[id] || 0) + 1; p.skillPoints -= 1;
        if (fresh && SK.learned) SK.learned(this.data, p.skills, id);
      }
      this._syncMoves(p);
    };
    MissionSim.prototype._duelSetup = function (p, prog) {
      var C = cfg(this).duel || {}, d = p.duel || { form: C.fallback || "agumon", level: C.fallbackLevel || 8 }, B = this.data.BLOODLINE, k, st;
      if (p.duelSet) return;
      p.duelSet = true;
      prog._applyForm(p, d.form, "duel");
      p.hatchLeft = 0; p.level = d.level; p.xp = 0; p.xpNext = this._xpNeeded(p.level);
      st = { "Baby I": 0, "Baby II": 1, "In-Training": 1, Rookie: 2, Champion: 3, Armor: 3 }[(this.data.SPECIES[d.form] || {}).stage];
      p.evoCount = st != null ? st : 2;
      p.blood = d.blood || null;
      p.skills = {}; p.weapons = [];
      this._seedSkills(p);
      p.skillPoints = Math.max(0, p.level - 1) + (p.blood && B ? B.skill * (p.blood.traits.skill || 0) : 0);
      this._duelSpend(p);
      p._statsKey = null; this._stats(p);
      p.hp = p.maxHp; p.faint = 0; p.downed = false;
      this.emit({ type: "duel.ready", id: p.id, form: d.form, level: p.level, gen: p.blood ? p.blood.gen : 0, fallback: !p.duel });
    };
    MissionSim.prototype._vsEvo = function (p, prog) {
      var C = cfg(this), to, from;
      if (!C || !this.vs || this.vs.phase !== "race") return;
      if (this._isEgg(p.form)) { prog._applyForm(p, this._vsRookie(p.vsRookie), "hatch"); p.hatchedAt = this.time; p.vsMeter = 0; return; }
      if (this._vsStage(p.form) >= 3 || (p.vsMeter || 0) < C.meter || (p.level || 1) < this._vsNeedLv(p.form) || p.downed || p.faint > 0) return;
      to = this._burstForm(p.form);
      if (!to || to === p.form) return;
      from = p.form; p.vsMeter = 0;
      prog._applyForm(p, to, "standard");
      this.emit({ type: "vs.evo", id: p.id, from: from, to: to, mega: this._vsStage(to) >= 3 });
    };
    MissionSim.prototype._vsType = function (stages) {
      var defs = this._enemies(), pool = [], k, st;
      for (k in defs) { if (!defs[k] || defs[k].boss) continue; st = this.data.SPECIES && this.data.SPECIES[k] && this.data.SPECIES[k].stage; if (stages.indexOf(st) >= 0) pool.push(k); }
      pool.sort();
      return pool.length ? pool[(this.rng() * pool.length) | 0] : null;
    };
    MissionSim.prototype._vsSetRound = function (ps) {
      var C = cfg(this), vs = this.vs, n = ps.length, i, p, a, ax = vs.arena.x, ay = vs.arena.y;
      vs.out = {}; vs.countT = C.countdown; vs.round++; vs.roundT = 0;
      for (i = 0; i < n; i++) {
        p = ps[i]; a = Math.PI + (Math.PI * 2 * i) / n;
        /* close enough that the partners see each other (PVP.reach) the moment the countdown ends */
        p.x = ax + Math.cos(a) * 115; p.y = ay + Math.sin(a) * 80; p.mx = ax + Math.cos(a) * 55; p.my = ay + Math.sin(a) * 38;
        p.mfacing = Math.cos(a) < 0 ? 1 : -1;
        p.hp = p.maxHp; p.faint = 0; p.downed = false; p.atFarm = false; p.pvpShield = 0;
        p.monInvuln = C.countdown; p.tamerInvuln = 9999; p.tamerHp = p.tamerMaxHp || p.tamerHp;
        p.pvpFlag = true; p.pvpOffAt = 0;
        p.vsPick = null; p.vsAim = null; p.pvpFocus = null; p.focusId = null;   /* a fresh choice each round */
      }
      this.emit({ type: "vs.round", round: vs.round, countdown: C.countdown, wins: vs.wins });
    };
    MissionSim.prototype._vsShowdownStart = function (ps) {
      var C = cfg(this), vs = this.vs, i, e;
      vs.phase = "showdown";
      vs.arena = this._snap(0, 0, 40, 600);
      for (i = 0; i < this.enemies.length; i++) { e = this.enemies[i]; if (!e.dead && dist2(e.x, e.y, vs.arena.x, vs.arena.y) < C.clear * C.clear) { e.dead = true; e.hp = 0; } }
      this.emit({ type: "vs.showdown", x: Math.round(vs.arena.x), y: Math.round(vs.arena.y), players: ps.map(function (q) { return { id: q.id, level: q.level || 1, form: q.form }; }) });
      this._vsSetRound(ps);
    };
    MissionSim.prototype._vsShowdown = function (dt, ps) {
      var C = cfg(this), vs = this.vs, i, e, p, d, R = C.arena, standing = [];
      /* the arena stays clear and nobody wanders off */
      for (i = 0; i < this.enemies.length; i++) { e = this.enemies[i]; if (!e.dead && !e.pvpOf && dist2(e.x, e.y, vs.arena.x, vs.arena.y) < C.clear * C.clear) { e.dead = true; e.hp = 0; } }
      for (i = 0; i < ps.length; i++) {
        p = ps[i]; p.tamerInvuln = 9999;
        d = Math.sqrt(dist2(p.x, p.y, vs.arena.x, vs.arena.y));
        if (d > R) { p.x = vs.arena.x + (p.x - vs.arena.x) * R / d; p.y = vs.arena.y + (p.y - vs.arena.y) * R / d; }
        if (vs.countT > 0) p.monInvuln = Math.max(p.monInvuln || 0, vs.countT);
        if (!vs.out[p.id]) standing.push(p);
      }
      if (vs.countT > 0) { vs.countT -= dt; return; }
      if (vs.betweenT > 0) { vs.betweenT -= dt; if (vs.betweenT <= 0) this._vsSetRound(ps); return; }
      this._vsAim(ps);
      /* a round that drags on goes to whoever has the most health left */
      vs.roundT = (vs.roundT || 0) + dt;
      if (C.roundSec && vs.roundT >= C.roundSec && standing.length > 1) {
        standing.sort(function (a, b) { return (b.hp / b.maxHp) - (a.hp / a.maxHp); });
        for (i = 1; i < standing.length; i++) vs.out[standing[i].id] = 1;
        this.emit({ type: "vs.time", round: vs.round, winner: standing[0].id });
        standing.length = 1;
      }
      if (standing.length <= 1 && ps.length > 1) {
        var w = standing[0] || null;
        if (w) vs.wins[w.id] = (vs.wins[w.id] || 0) + 1;
        this.emit({ type: "vs.roundEnd", round: vs.round, winner: w ? w.id : null, wins: vs.wins });
        if (w && vs.wins[w.id] >= C.toWin) {
          vs.phase = "done"; vs.endT = 7; vs.winner = w.id;
          for (i = 0; i < ps.length; i++) ps[i].pvpFlag = false;
          this.emit({ type: "vs.end", winner: w.id, wins: vs.wins, players: ps.map(function (q) { return { id: q.id, level: q.level || 1, form: q.form, wins: vs.wins[q.id] || 0 }; }) });
        } else vs.betweenT = C.between;
      }
    };
    /* knocked out in the showdown: out of the round (not sent to the farm); in the race nobody fights */
    /* ---------- who to go for, three or more in the arena (17z33, Isaac) ----------
       The one you clicked (a rival's partner), as long as it's still standing; otherwise the strongest still
       standing (stage, then level, then health), so ganging up on the leader comes naturally; once it's out, the
       rest turn on each other. Picks are cleared each round. A match of two needs none of this. */
    MissionSim.prototype._vsPower = function (p) { return this._vsStage(p.form) * 1000 + (p.level || 1) * 10 + (p.maxHp ? p.hp / p.maxHp : 0); };
    MissionSim.prototype._vsAim = function (ps) {
      var vs = this.vs, up = [], i, j, p, q, best;
      for (i = 0; i < ps.length; i++) if (!vs.out[ps[i].id]) up.push(ps[i]);
      if (ps.length < 3 || up.length < 2) return;           /* a one-on-one match needs none of this */
      for (i = 0; i < up.length; i++) {
        p = up[i];
        if (p.vsPick && !vs.out[p.vsPick] && this.player(p.vsPick)) best = this.player(p.vsPick);
        else {
          p.vsPick = null; best = null;
          for (j = 0; j < up.length; j++) { q = up[j]; if (q !== p && (!best || this._vsPower(q) > this._vsPower(best))) best = q; }
        }
        if (best && (p.pvpFocus !== best.id || p.focusId == null)) this._setPvpFocus(p.id, best.id, true);
        p.vsAim = best ? best.id : null;
      }
    };
    var baseFocus = MissionSim.prototype._setPvpFocus;
    MissionSim.prototype._setPvpFocus = function (pid, foeId, quiet) {
      var ok = baseFocus.call(this, pid, foeId, quiet), p;
      if (ok && !quiet && this._isVs() && this.vs && this.vs.phase === "showdown" && (p = this.player(pid))) p.vsPick = String(foeId);   /* your own pick holds */
      return ok;
    };
    var baseKo = MissionSim.prototype._pvpKo, baseFoes = MissionSim.prototype._pvpFoes, baseRespawn = MissionSim.prototype._respawn;
    MissionSim.prototype._pvpKo = function (win, lose) {
      var vs = this.vs;
      if (this._isVs() && vs && vs.phase === "showdown") {
        vs.out[lose.id] = 1; lose.hp = 1; lose.pvpFlag = false; lose.monInvuln = 9999;
        this.emit({ type: "vs.ko", winner: win.id, loser: lose.id, x: Math.round(lose.mx), y: Math.round(lose.my) });
        return;
      }
      return baseKo.call(this, win, lose);
    };
    MissionSim.prototype._pvpFoes = function (a, b) {
      if (this._isVs()) {
        var vs = this.vs;
        if (!vs || vs.phase !== "showdown" || vs.countT > 0 || vs.betweenT > 0 || !a || !b || a === b || vs.out[a.id] || vs.out[b.id]) return false;
        return a.hasTamer !== false && b.hasTamer !== false;
      }
      return baseFoes.call(this, a, b);
    };
    /* the race: a fallen partner is back on its own side, still itself */
    MissionSim.prototype._respawn = function (p) {
      if (this._isVs()) {
        var C = cfg(this), s = this._vsHome(p);
        p.hp = Math.max(1, Math.round(p.maxHp * C.reviveHp)); p.faint = 0; p.downed = false; p.tamerHp = p.tamerMaxHp || p.tamerHp || 100;
        place(p, s.x, s.y); p.monInvuln = C.reviveSec + 3; p.tamerInvuln = C.reviveSec + 3;
        this.emit({ type: "vs.down", id: p.id, back: C.reviveSec });
        return true;
      }
      return baseRespawn.call(this, p);
    };
  }
  var isNode = typeof module !== "undefined" && module.exports;
  if (isNode) module.exports = install;
  else { root.DBH = root.DBH || {}; root.DBH.installVersus = install; }
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
