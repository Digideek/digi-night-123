/* Digi Night — the rival (data.js RIVAL has the numbers and what they mean).
 *
 * Another tamer and partner on the same map for the whole run. Its partner
 * is kept as a record shaped like a player's (`this.rival.p`), so the
 * partner rules apply to it unchanged: _xpNeeded and _tamerNeed for its two
 * levels, RO.cost / RO.pointsFor / _derived for its status points, the
 * skill tree's own autoPick for its skill points, _stats for what its moves
 * do, and _fireFrom to fire them. What is its own is here: where it goes,
 * what it fights, how it spends its points, when it digivolves and rests.
 *
 * On the field its partner is an entry in `enemies` (flag `rival`), so your
 * moves, statuses and numbers work on it like on anything else. Out of
 * range of every tamer it is "elsewhere": no body, and it earns at the pace
 * RIVAL.away sets.
 *
 * Installed onto MissionSim by mission-sim.js.
 */
(function (root) {
  "use strict";

  function install(MissionSim, U) {
    var dist2 = U.dist2, norm = U.norm;
    var ID = "rival";
    function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; }
    function lerp(a, b, k) { return a + (b - a) * k; }

    /* the form of a line `steps` digivolutions on from its Baby, along the plain, well-known route */
    MissionSim.prototype._lineForm = function (baby, steps) {
      var f = baby, i, n;
      for (i = 0; i < steps; i++) { n = this._burstForm(f); if (!n || n === f) break; f = n; }
      return f;
    };

    MissionSim.prototype._rivalNew = function () {
      var R = this.data.RIVAL, L = this.data.LINES || {}, mine = {}, i, p, k, s, pool = [], seed = (this.seed | 0) || 1, baby, rv, host;
      if (!R) return null;
      /* never your own line: not the Baby it hatched from, nor anything on its plain route */
      for (i = 0; i < this.players.length; i++) {
        p = this.players[i];
        for (k in L) { for (s = 0; s < 6; s++) if (this._lineForm(L[k].baby, s) === p.form || L[k].egg === p.form) mine[k] = 1; }
      }
      for (k in L) if (!mine[k] && L[k].baby && this.data.SPECIES && this.data.SPECIES[L[k].baby] && this._lineForm(L[k].baby, 2) !== L[k].baby) pool.push(k);
      pool.sort();
      if (!pool.length) return null;
      baby = L[pool[Math.floor(hash(seed + 911) * pool.length) % pool.length]].baby;
      host = this.player(this.localId) || this.players[0] || { x: 0, y: 0 };
      rv = {
        name: R.names[Math.floor(hash(seed + 1213) * R.names.length) % R.names.length],
        baby: baby, tamer: Math.floor(hash(seed + 77) * 8) % 8,
        talent: lerp(R.talent[0], R.talent[1], hash(seed + 4242)),
        state: "elsewhere", eid: null, x: host.x + 1400, y: host.y - 500, tx: host.x + 1400, ty: host.y - 500, facing: -1, hx: null, hy: null,
        wins: 0, losses: 0, stageT: 0, kills: 0, wpX: null, wpY: null, driftT: 20, farmAt: this.time + R.farm.every * 0.75, backAt: 0, seen: false, fightT: 0, pcd: {},
        /* the partner, shaped like a player's so the partner rules read it */
        p: { id: ID, kind: "rival", hasTamer: true, form: baby, level: 1, xp: 0, xpNext: this._xpNeeded(1), tamerLevel: 1, tamerXp: 0, tamerXpNext: this._tamerNeed(1),
             evoCount: 0, skills: {}, skillPoints: 0, weapons: [], statLevels: {}, perks: {}, passives: [], hp: 1, maxHp: 1, mx: 0, my: 0, faint: 0 }
      };
      this._attrs(rv.p); rv.p.statPoints = 0;
      this._seedSkills(rv.p);
      this._rivalFit(rv, true);
      return rv;
    };

    /* what its stats make of it: health, and the numbers its moves use */
    MissionSim.prototype._rivalFit = function (rv, full) {
      var R = this.data.RIVAL, rp = rv.p, sp = this.data.SPECIES && this.data.SPECIES[rp.form], dv, was = rp.maxHp || 1, e;
      if (!rp.weapons || !rp.weapons.length) rp.weapons = [{ id: (sp && sp.startWeapon) || "pepperBreath", level: 1, cd: 0 }];   /* no skill tree: it still has its first move */
      rp._statsKey = null;
      this._stats(rp);
      dv = this._ro() ? this._derived(rp) : { hpMul: 1 };
      rp.maxHp = Math.max(20, Math.round(((sp && sp.base && sp.base.maxHp) || 60) * dv.hpMul * R.hpMul));
      rp.hp = full ? rp.maxHp : Math.min(rp.maxHp, Math.max(1, Math.round(rp.hp * rp.maxHp / was)));
      e = this._rivalBody(rv);
      if (e) { e.maxHp = rp.maxHp; e.hp = rp.hp; e.flee = dv.flee || 0; e.hit = dv.hit || 0; }
    };

    /* a good build: put the points where its moves use them. Physical lines lean
     * on STR with AGI behind it; special lines on INT with DEX. Everyone takes VIT. */
    var PLAN = { phys: { str: 4, agi: 2.2, vit: 2.2, dex: 1.6, luk: 1, int: 0 }, spec: { int: 4, dex: 2.2, vit: 2.2, agi: 1.2, luk: 1, str: 0 } };
    MissionSim.prototype._rivalStyle = function (rp) {
      var i, w, d, phys = 0, spec = 0;
      for (i = 0; i < (rp.weapons || []).length; i++) { w = rp.weapons[i]; d = this._weaponDef(w.id) || {}; if (d.type === "arc") phys += w.level || 1; else spec += w.level || 1; }
      return phys > spec ? "phys" : "spec";
    };
    MissionSim.prototype._rivalSpend = function (rv) {
      var RO = this._ro(), rp = rv.p, at, plan, k, best, bv, v, guard = 0, spent = false;
      if (RO && (rp.statPoints || 0) > 0) {
        at = this._attrs(rp); plan = PLAN[this._rivalStyle(rp)];
        while (guard++ < 400) {
          best = null; bv = 1e9;
          for (k in plan) {
            if (!plan[k] || RO.cost(at[k]) > rp.statPoints) continue;
            v = at[k] / plan[k];                 /* the stat furthest behind its share goes next */
            if (v < bv) { bv = v; best = k; }
          }
          if (!best) break;
          rp.statPoints -= RO.cost(at[best]); at[best] += 1; spent = true;
        }
      }
      if ((rp.skillPoints || 0) > 0) { this._autoSkill(rp); spent = true; }
      if (spent) this._rivalFit(rv, false);
    };

    /* XP, by the partner rules: job levels give skill points, base levels status points */
    MissionSim.prototype._rivalGain = function (rv, amount) {
      var rp = rv.p, RO = this._ro(), up = false;
      if (!(amount > 0)) return;
      rp.xp += amount; rp.tamerXp += amount;
      while (rp.xp >= rp.xpNext) { rp.xp -= rp.xpNext; rp.level += 1; rp.xpNext = this._xpNeeded(rp.level); rp.skillPoints = (rp.skillPoints || 0) + 1; up = true; }
      while (rp.tamerXp >= rp.tamerXpNext) {
        rp.tamerXp -= rp.tamerXpNext; rp.tamerLevel += 1; rp.tamerXpNext = this._tamerNeed(rp.tamerLevel);
        rp.statPoints = (rp.statPoints || 0) + (RO ? RO.pointsFor(rp.tamerLevel - 1) : 3); up = true;
      }
      if (up) { this._rivalSpend(rv); this._rivalEvolve(rv); }
    };
    MissionSim.prototype._rivalEvolve = function (rv) {
      var R = this.data.RIVAL, rp = rv.p, st = rp.evoCount || 0, next, e, from;
      if (st >= R.evo.level.length || rp.level < R.evo.level[st] || rv.stageT < R.evo.time[st]) return;
      next = this._burstForm(rp.form);
      if (!next || next === rp.form) return;
      from = rp.form; rp.form = next; rp.evoCount = st + 1; rv.stageT = 0;
      this._seedSkills(rp);
      this._rivalFit(rv, false);
      rp.hp = Math.max(rp.hp, Math.round(rp.maxHp * 0.75));
      e = this._rivalBody(rv);
      if (e) { e.type = next; e.radius = this._actorRad(next); e.hp = rp.hp; }
      this.emit({ type: "rival.evolve", name: rv.name, from: from, form: next, level: rp.level, x: rv.x, y: rv.y, near: !!e });
    };

    MissionSim.prototype._rivalBody = function (rv) {
      var i;
      if (!rv || rv.eid == null) return null;
      for (i = 0; i < this.enemies.length; i++) if (this.enemies[i]._id === rv.eid && !this.enemies[i].dead) return this.enemies[i];
      return null;
    };
    /* Its home range. Settled when it enters, when it comes back from a defeat or the farm
     * (`fresh`), and again if the tamers have left it more than RIVAL.homeMax behind. Returns
     * true when the range moved (the caller puts the rival there: it is always off screen). */
    MissionSim.prototype._rivalHome = function (rv, fresh) {
      var R = this.data.RIVAL, i, p, d, best = 1e15, who = null, a;
      for (i = 0; i < this.players.length; i++) { p = this.players[i]; if (!p.hasTamer || p.away) continue; d = rv.hx == null ? 0 : dist2(rv.hx, rv.hy, p.x, p.y); if (d < best) { best = d; who = p; } }
      who = who || this.player(this.localId) || this.players[0] || { x: 0, y: 0 };
      if (rv.hx != null && !fresh && best <= (R.homeMax || 4200) * (R.homeMax || 4200)) return false;
      a = this.rng() * Math.PI * 2;
      rv.hx = who.x + Math.cos(a) * (R.enterAt || 2200); rv.hy = who.y + Math.sin(a) * (R.enterAt || 2200);
      return true;
    };
    /* somewhere in its range to walk to next, no more than a `step` away */
    MissionSim.prototype._rivalRoam = function (rv, fromX, fromY) {
      var R = this.data.RIVAL, a = this.rng() * Math.PI * 2, r = Math.sqrt(this.rng()) * (R.roam || 1500), x = rv.hx + Math.cos(a) * r, y = rv.hy + Math.sin(a) * r;
      if (this.rivalBait) { var bp = this._rivalNearest(rv).p; if (bp) { x = bp.x; y = bp.y; } }    /* baited: it comes looking */
      var dx = x - fromX, dy = y - fromY, l = Math.sqrt(dx * dx + dy * dy) || 1, st = (R.drift && R.drift.step) || 620;
      if (l > st) { x = fromX + dx / l * st; y = fromY + dy / l * st; }
      rv.wpX = x; rv.wpY = y;
    };
    MissionSim.prototype._rivalNearest = function (rv) {
      var i, p, d, best = 1e15, who = null;
      for (i = 0; i < this.players.length; i++) { p = this.players[i]; if (!p.hasTamer || p.away) continue; d = dist2(rv.x, rv.y, p.x, p.y); if (d < best) { best = d; who = p; } }
      return { p: who, d: Math.sqrt(best) };
    };
    /* a wild kill by its moves: its XP, nothing dropped for you */
    MissionSim.prototype._rivalKill = function (e) {
      var rv = this.rival, def = this._enemies()[e.type] || { xp: 6 };
      if (e.dead) return;
      e.dead = true; e.hp = 0;
      if (rv && rv.p) { rv.kills += 1; this._rivalGain(rv, (def.xp || 6)); }
      this.emit({ type: "kill", enemyId: e._id, enemyType: e.type, x: e.x, y: e.y, killer: ID, boss: !!e.boss, big: !!(e.boss || e.mega || e.lord), r: e.radius || 10, hp: Math.round(e.maxHp) });
    };
    /* you beat its partner: it is carried off, you are paid, and it will be back */
    MissionSim.prototype._rivalDown = function (e, owner) {
      var R = this.data.RIVAL, rv = this.rival, D = R.down, i, a, p = owner && this.player(owner.id);
      if (!rv || rv.none) return;
      rv.wins += 1; rv.eid = null; rv.state = "down"; rv.backAt = this.time + D.away; rv.fightT = 0;
      var bait = this.rivalBait ? 2 : 1, sk = [], k;          /* Rival Bait: it came for you, and it pays double */
      for (i = 0; i < D.xpOrbs; i++) { a = (Math.PI * 2 * i) / D.xpOrbs; this._spawnOrb("xp", e.x + Math.cos(a) * 32, e.y + Math.sin(a) * 26, Math.round(this._rivalRef() * D.xpMul * bait)); }
      this._spawnOrb("bits", e.x, e.y + 10, (D.bits + D.bitsPerWin * (rv.wins - 1)) * bait);
      for (k in (rv.p.skills || {})) if (rv.p.skills[k] > 0) sk.push(k);
      this.emit({ type: "rival.down", name: rv.name, form: rv.p.form, level: rv.p.level, wins: rv.wins, losses: rv.losses, x: e.x, y: e.y, by: p ? p.id : null, back: D.away, skills: sk, bait: bait > 1 });
    };
    /* the XP a wild Digimon of the moment is worth (what is on the field now, remembered) */
    MissionSim.prototype._rivalRef = function () {
      var i, e, n = 0, t = 0, d, defs = this._enemies();
      for (i = 0; i < this.enemies.length; i++) { e = this.enemies[i]; if (e.dead || e.rival || e.boss || e.mega || e.lord) continue; d = defs[e.type]; if (d && d.xp) { t += d.xp; n++; } }
      if (n >= 3) this._rivalXpRef = t / n;
      return this._rivalXpRef || 6;
    };

    /* ---- every tick ---- */
    MissionSim.prototype._updateRival = function (dt) {
      var R = this.data.RIVAL, rv = this.rival, rp, e, near, host, a, d, n, spd;
      if (!R || !this._combatReady()) return;
      if (!rv) {
        if (this._rivalStart == null) this._rivalStart = this.time + R.arriveAt;
        if (this.time < this._rivalStart) return;
        rv = this.rival = this._rivalNew() || { none: true };
        if (!rv.none) { this._rivalHome(rv, true); rv.x = rv.tx = rv.hx; rv.y = rv.ty = rv.hy; this.emit({ type: "rival.enter", name: rv.name, form: rv.p.form }); }
      }
      if (rv.none) return;
      rp = rv.p;
      rv.stageT += dt;
      this._rivalEvolve(rv);
      e = this._rivalBody(rv);
      if (rv.eid != null && !e) rv.eid = null;                 /* its body was swept off the field (a farm visit): it is still out there */
      if (e) { rp.hp = e.hp; rv.x = e.x; rv.y = e.y; }

      if (rv.state === "down" || rv.state === "farm") {
        if (rv.state === "farm") this._rivalGain(rv, this._rivalRef() * (R.away.killsPerMin / 60) * rv.talent * dt);
        if (this.time < rv.backAt) return;
        /* back on the map, healed, a little way off */
        this._rivalHome(rv, true);
        rv.x = rv.tx = rv.hx; rv.y = rv.ty = rv.hy;
        if (rv.state === "farm") { rp.statPoints = (rp.statPoints || 0) + R.farm.train; rv.farmAt = this.time + R.farm.every; }
        rp.hp = rp.maxHp; this._rivalSpend(rv); this._rivalFit(rv, true);
        rv.state = "elsewhere"; rv.driftT = 4; rv.wpX = null;
        this.emit({ type: "rival.back", name: rv.name, form: rp.form, level: rp.level, wins: rv.wins, losses: rv.losses });
        return;
      }
      /* farm break: only when it is not in the middle of a fight with you */
      if (this.time >= rv.farmAt && rv.state !== "fight") {
        if (e) e.dead = true;
        this.emit({ type: "rival.farm", name: rv.name, form: rp.form, x: rv.x, y: rv.y, near: !!e, stay: R.farm.stay });
        rv.eid = null; rv.state = "farm"; rv.backAt = this.time + R.farm.stay;
        return;
      }

      near = this._rivalNearest(rv);
      if (!e) {
        /* elsewhere: it earns at its off-screen pace and roams, heading back your way now and then */
        this._rivalGain(rv, this._rivalRef() * (R.away.killsPerMin / 60) * rv.talent * dt);
        if (this._rivalHome(rv, false)) { rv.x = rv.tx = rv.hx; rv.y = rv.ty = rv.hy; rv.wpX = null; }   /* you left its range far behind */
        rv.driftT -= dt;
        if (rv.driftT <= 0 || rv.wpX == null || dist2(rv.x, rv.y, rv.wpX, rv.wpY) <= 30 * 30) {
          rv.driftT = lerp(R.drift.every[0], R.drift.every[1], this.rng());
          this._rivalRoam(rv, rv.x, rv.y);
        }
        if (rv.wpX != null) {
          n = norm(rv.wpX - rv.x, rv.wpY - rv.y); spd = this._rivalSpeed(rv);
          if (dist2(rv.x, rv.y, rv.wpX, rv.wpY) > 30 * 30) { rv.x += n.x * spd * dt; rv.y += n.y * spd * dt; }
          rv.tx = rv.x; rv.ty = rv.y;
        }
        if (near.p && near.d < R.nearField) this._rivalAppear(rv);
        return;
      }
      /* on the field: _rivalAct (called from the enemy loop) moves and fights. Too far from everyone, it leaves the field. */
      if (!near.p || near.d > R.nearField + 220) { e.dead = true; rv.eid = null; rv.state = "elsewhere"; rv.fightT = 0; }
    };

    MissionSim.prototype._rivalSpeed = function (rv) {
      var s = rv.p.stats || {};
      return (this._tamer().speed || 150) * 0.9 * (s.monSpeedMul || 1);
    };
    MissionSim.prototype._rivalAppear = function (rv) {
      var rp = rv.p, spot = this._snap(rv.x, rv.y, this._actorRad(rp.form), 320), e;
      e = this.spawnEnemy(rp.form, { x: spot.x, y: spot.y, keepType: true, quiet: true });
      if (!e) return null;
      e.rival = true; e.boss = false; e.type = rp.form;
      e.radius = this._actorRad(rp.form);
      e.maxHp = rp.maxHp; e.hp = Math.max(1, Math.min(rp.maxHp, rp.hp));
      e.dmgMul = 1; e.pack = null;
      rv.eid = e._id; rv.x = e.x; rv.y = e.y; rv.tx = e.x + 30; rv.ty = e.y + 10; rv.state = "hunt";
      this._rivalFit(rv, false);
      return e;
    };

    /* its turn, from the enemy loop (after statuses, stuns and the level-up hold) */
    MissionSim.prototype._rivalAct = function (e, dt) {
      var R = this.data.RIVAL, rv = this.rival, rp, i, p, d, best, tgt = null, foe = null, reach, w, def, lv, want, n, pos, spd, s, dmg, mul, cd, moved, k;
      if (!rv || rv.none || rv.eid !== e._id) return;
      rp = rv.p; rp.mx = e.x; rp.my = e.y; rp.hp = e.hp;
      s = rp.stats || this._stats(rp);
      /* your partner in sight? (once it is on you, it takes more to shake it off) */
      best = (rv.state === "fight" ? R.giveUp : R.sight) * (this.rivalBait ? 2.5 : 1); best *= best;
      if (rv.calmT > 0) { rv.calmT -= dt; best = 0; }          /* it has just lost you: it lets you be for a while */
      for (i = 0; i < this.players.length; i++) {
        p = this.players[i];
        if (p.atFarm || this._isEgg(p.form) || p.faint > 0 || p.downed || !(p.hp > 0)) continue;
        d = dist2(e.x, e.y, p.mx, p.my);
        if (d < best) { best = d; tgt = p; }
      }
      reach = 60;
      for (i = 0; i < rp.weapons.length; i++) reach = Math.max(reach, Math.min(230, this._weaponReach(rp.weapons[i])));
      if (tgt) {
        if (rv.state !== "fight") {
          rv.state = "fight"; rv.fightT = 0;
          this.emit({ type: "rival.spot", name: rv.name, form: rp.form, level: rp.level, x: e.x, y: e.y, id: tgt.id, first: !rv.seen });
          rv.seen = true;
        }
        rv.fightT += dt;
        /* its moves, at the share of their damage RIVAL.pvp allows, each on its own cooldown */
        d = Math.sqrt(dist2(e.x, e.y, tgt.mx, tgt.my));
        for (i = 0; i < rp.weapons.length; i++) {
          w = rp.weapons[i]; def = this._weaponDef(w.id) || {};
          if (!def.levels || !def.levels.length) continue;
          lv = def.levels[Math.min(w.level || 1, def.maxLevel || def.levels.length) - 1] || def.levels[0];
          k = w.id;
          rv.pcd[k] = (rv.pcd[k] == null ? 0.5 + i * 0.2 : rv.pcd[k]) - dt;
          if (rv.pcd[k] > 0) continue;
          if (d > Math.min(230, this._weaponReach(w)) + this._actorRad(tgt.form)) continue;
          mul = (s.damageMul || 1) * ((def.type === "arc" ? s.physMul : s.specMul) || 1) * (w.bonus || 1);
          cd = (lv.cooldown || 0.7) * Math.max(0.35, (s.cooldownMul || 1) * ((def.type === "arc" ? s.physCdMul : s.specCdMul) || 1));
          if (def.type === "aura" || def.type === "orbit") cd = Math.max(cd, 0.5);       /* things that tick every frame for you tick twice a second for it */
          rv.pcd[k] = cd;
          dmg = (lv.damage || 8) * mul * R.pvp;
          this.emit({ type: "fx", k: "rshot", x: e.x, y: e.y - e.radius * 0.5, tx: tgt.mx, ty: tgt.my - 12, w: w.id, arc: def.type === "arc" ? 1 : 0, col: def.color });
          this.hurtMon(tgt, dmg, { type: rp.form, hit: e.hit || 0, rival: true });
          if (!(tgt.hp > 0)) {
            rv.losses += 1;
            this.emit({ type: "rival.won", name: rv.name, form: rp.form, level: rp.level, wins: rv.wins, losses: rv.losses, id: tgt.id });
            break;
          }
        }
        if (tgt.mx !== e.x) e.facing = tgt.mx < e.x ? -1 : 1;
        /* close to its range: shooters hang back at about two thirds of it, brawlers get stuck in */
        want = reach > 110 ? reach * 0.62 : Math.max(24, reach * 0.55);
        if (d > want + 14) n = this._steer(e, tgt.mx, tgt.my, "rival", dt);
        else if (d < want - 26 && reach > 110) n = norm(e.x - tgt.mx, e.y - tgt.my);
        else n = null;
      } else {
        if (rv.state === "fight") { rv.state = "hunt"; rv.fightT = 0; rv.calmT = R.calm || 0; this.emit({ type: "rival.lost", name: rv.name, form: rp.form, x: e.x, y: e.y }); }
        /* hunting: the nearest wild Digimon, with its real moves */
        best = R.hunt * R.hunt;
        for (i = 0; i < this.enemies.length && !(rv.skipT > 0); i++) {
          p = this.enemies[i];
          if (p.dead || p.rival || p.lord) continue;
          if (R.shy) {                               /* the ones crowding a tamer are that tamer's: going for them would walk it straight to you */
            for (k = 0, d = 0; k < this.players.length; k++) if (this.players[k].hasTamer && dist2(p.x, p.y, this.players[k].x, this.players[k].y) < R.shy * R.shy) { d = 1; break; }
            if (d) continue;
          }
          d = dist2(e.x, e.y, p.x, p.y) * (p.boss || p.mega ? 2.5 : 1);     /* it would rather not pick the boss */
          if (d < best) { best = d; foe = p; }
        }
        for (i = 0; i < rp.weapons.length; i++) this._fireFrom(rp, dt, e.x, e.y, foe && dist2(e.x, e.y, foe.x, foe.y) <= Math.pow(this._weaponReach(rp.weapons[i]) + (foe.radius || 10), 2) ? foe : null, rp.weapons[i]);
        n = null;
        if (foe) {
          d = Math.sqrt(dist2(e.x, e.y, foe.x, foe.y));
          want = reach > 110 ? reach * 0.6 : Math.max(22, reach * 0.5);
          if (d > want + 10) n = this._steer(e, foe.x, foe.y, "rival", dt);
          else if (d < want - 30 && reach > 110) n = norm(e.x - foe.x, e.y - foe.y);
          if (foe.x !== e.x) e.facing = foe.x < e.x ? -1 : 1;
        } else {
          /* nothing to fight: it wanders its own range (never toward the tamers), finding
           * strays at its usual pace, so staying near you does not stunt it */
          if (R.fieldGain) this._rivalGain(rv, this._rivalRef() * (R.away.killsPerMin / 60) * rv.talent * R.fieldGain * dt);
          rv.driftT -= dt;
          if (rv.wpX == null || rv.driftT <= 0 || dist2(e.x, e.y, rv.wpX, rv.wpY) < 40 * 40) {
            if (rv.hx == null) this._rivalHome(rv, true);
            this._rivalRoam(rv, e.x, e.y); rv.driftT = 6 + this.rng() * 8;
          }
          n = this._steer(e, rv.wpX, rv.wpY, "rival", dt);
          e.facing = n.x < 0 ? -1 : 1;
        }
      }
      moved = false;
      if (n) {
        spd = this._rivalSpeed(rv) * (e.stSlow == null ? 1 : e.stSlow) * (e.slow || 1);
        pos = this._slide(e.x, e.y, n.x * spd * dt, n.y * spd * dt, this._navRad ? this._navRad(e) : e.radius, this._crossOf ? this._crossOf(e.type) : 0);
        moved = Math.abs(pos.x - e.x) + Math.abs(pos.y - e.y) > 0.2;
        e.x = pos.x; e.y = pos.y;
      }
      rv.x = e.x; rv.y = e.y; rv.moving = moved;
      /* walled in (a cliff, a lake between it and what it wanted): give that up and try somewhere else */
      if (rv.skipT > 0) rv.skipT -= dt;
      rv.stuckT = (rv.stuckT || 0) + dt;
      if (rv.stuckT >= 1.5) {
        if (n && dist2(e.x, e.y, rv.stuckX || 0, rv.stuckY || 0) < 12 * 12 && !tgt) { rv.wpX = null; rv.skipT = 2.5; }
        rv.stuckT = 0; rv.stuckX = e.x; rv.stuckY = e.y;
      }
      /* its tamer keeps a few steps behind it */
      d = Math.sqrt(dist2(rv.tx, rv.ty, e.x, e.y));
      if (d > 46) { n = norm(e.x - rv.tx, e.y - rv.ty); k = Math.min(d - 40, (this._tamer().speed || 150) * 1.1 * dt); rv.tx += n.x * k; rv.ty += n.y * k; rv.tMoving = true; rv.tFacing = n.x < 0 ? -1 : 1; }
      else rv.tMoving = false;
    };

    /* what the screen is told */
    MissionSim.prototype._rivalView = function () {
      var rv = this.rival, rp;
      if (!rv || rv.none) return null;
      rp = rv.p;
      return { name: rv.name, form: rp.form, level: rp.level, base: rp.tamerLevel, hp: rp.hp, maxHp: rp.maxHp, state: rv.state, eid: rv.eid,
               x: Math.round(rv.x), y: Math.round(rv.y), tx: Math.round(rv.tx), ty: Math.round(rv.ty), tf: rv.tFacing || 1, tm: !!rv.tMoving, tamer: rv.tamer,
               wins: rv.wins, losses: rv.losses, kills: rv.kills };
    };
  }

  if (typeof module === "object" && module.exports) module.exports = install;
  else { root.DBH = root.DBH || {}; root.DBH.installRival = install; }
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
