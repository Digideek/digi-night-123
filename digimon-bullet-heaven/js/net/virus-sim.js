/* Digi Night — infected Digimon (data.js VIRUS has the numbers and what they mean).
 *
 * A wild Digimon carrying a virus. It is an ordinary entry in `enemies`
 * with `virus` set, so your moves, statuses and numbers work on it like on
 * anything else; what is different is who it fights:
 *
 *   1. a tamer's side, if one is in sight (then it behaves like any enemy);
 *   2. otherwise the nearest wild Digimon in sight that is not infected;
 *   3. otherwise the nearest infected one in sight;
 *   4. otherwise it roams.
 *
 * What it kills feeds it: enough and it digivolves where it stands. From
 * Champion up, a wild Digimon that survives its hit may catch the virus.
 * A partner cannot catch it, and an infected Digimon cannot be caught
 * (progression.js). Wild Digimon it hits fight back for a few seconds.
 *
 * Installed onto MissionSim by mission-sim.js.
 */
(function (root) {
  "use strict";

  function install(MissionSim, U) {
    var dist2 = U.dist2;
    var STAGE = { "Baby I": 0, "Baby II (In-Training)": 1, "Child (Rookie)": 2, "Adult (Champion)": 3, "Armor": 3, "Perfect (Ultimate)": 4, "Ultimate (Mega)": 5, "Ultimate (Mega+)": 5 };

    MissionSim.prototype._virusStage = function (type) {
      var d = this._enemies()[type];
      return d && STAGE[d.stageDisplay] != null ? STAGE[d.stageDisplay] : 2;
    };
    MissionSim.prototype._virusCount = function (own) {
      var i, e, n = 0;
      for (i = 0; i < this.enemies.length; i++) { e = this.enemies[i]; if (e.virus && !e.dead && (!own || !e.virus.caught)) n++; }
      return n;
    };
    /* may it be bitten, and may it catch the virus: the rank and file only */
    function plain(e) { return e && !e.dead && !e.boss && !e.mega && !e.lord && !e.rival && !e.spire; }

    /* give it the virus. `from` is the one it caught it from (none: it wandered in with it). */
    MissionSim.prototype._infect = function (e, from) {
      var V = this.data.VIRUS, m;
      if (!V || !plain(e) || e.virus) return false;
      m = from ? V.caught : V;
      e.virus = { fed: 0, caught: !!from, cd: 0, lookT: 0, tid: null, wT: 0, wx: e.x, wy: e.y };
      e.pack = null; e.fodder = false; e.foe = null; e.foeT = 0;
      e.hp *= m.hpMul; e.maxHp *= m.hpMul;
      e.dmgMul = (e.dmgMul || 1) * m.dmgMul;
      e.vSpd = m.spdMul;
      this.emit({ type: "virus.infect", enemyId: e._id, enemyType: e.type, x: e.x, y: e.y, caught: !!from });
      return true;
    };

    /* one wanders in from off screen now and then */
    MissionSim.prototype._updateVirus = function (dt) {
      var V = this.data.VIRUS, defs, k, i, row, stages, pool, type, e;
      if (!V || this.noVirus) return;
      if (this._virusAt == null) this._virusAt = V.firstAt;
      if (this.time < this._virusAt) return;
      if (!this._spawnsOpen() || this._virusCount(true) >= V.wild || this._virusCount() >= V.cap) { this._virusAt = this.time + 5; return; }
      stages = V.stageAt[0][1];
      for (i = 0; i < V.stageAt.length; i++) { row = V.stageAt[i]; if (this.time / 60 >= row[0]) stages = row[1]; }
      defs = this._enemies(); pool = [];
      for (k in defs) if (defs[k] && !defs[k].boss && stages.indexOf(defs[k].stageDisplay) >= 0) pool.push(k);
      pool.sort();
      this._virusAt = this.time + V.every[0] + this.rng() * (V.every[1] - V.every[0]);
      if (!pool.length) return;
      type = pool[(this.rng() * pool.length) | 0];
      e = this.spawnEnemy(type, { keepType: true, quiet: true });
      if (e && this._infect(e, null)) this.emit({ type: "virus.spawn", enemyId: e._id, enemyType: e.type, x: e.x, y: e.y });
    };

    /* Who it goes for. null: a tamer's side is in sight (`closest` is the squared distance to
     * the nearest of them), so the ordinary enemy rules take it from here. */
    MissionSim.prototype._virusTarget = function (e, closest, dt) {
      var V = this.data.VIRUS, v = e.virus, s2 = V.sight * V.sight, i, o, d, best = null, bd = 1e15, sick = null, sd = 1e15, far = 1e15, p, t;
      v.cd = Math.max(0, v.cd - dt);
      if (closest <= s2) { v.tid = null; return null; }
      for (i = 0; i < this.players.length; i++) { p = this.players[i]; if (p.hasTamer && !p.away) far = Math.min(far, dist2(e.x, e.y, p.x, p.y)); }
      if (far < 1e15 && far > V.forgetAt * V.forgetAt) { e.dead = true; return null; }   /* left far behind: quietly gone */
      v.lookT -= dt;
      t = v.tid != null ? this._enemyById(v.tid) : null;
      if (t && (t.dead || dist2(e.x, e.y, t.x, t.y) > s2 * 1.5)) t = null;
      if (!t || v.lookT <= 0) {
        v.lookT = 0.4;
        for (i = 0; i < this.enemies.length; i++) {
          o = this.enemies[i];
          if (o === e || !plain(o)) continue;
          d = dist2(e.x, e.y, o.x, o.y);
          if (d > s2) continue;
          if (o.virus) { if (d < sd) { sd = d; sick = o; } }
          else if (d < bd) { bd = d; best = o; }
        }
        t = best || sick;
        v.tid = t ? t._id : null;
      }
      if (t) return t;
      /* nothing in sight: roam, drifting toward the nearest tamer so it turns up again */
      v.wT -= dt;
      if (v.wT <= 0 || dist2(e.x, e.y, v.wx, v.wy) < 400) {
        var a = this.rng() * Math.PI * 2, r = 120 + this.rng() * 220, hx = e.x, hy = e.y, hd = 1e15;
        for (i = 0; i < this.players.length; i++) { p = this.players[i]; if (!p.hasTamer || p.away) continue; d = dist2(e.x, e.y, p.x, p.y); if (d < hd) { hd = d; hx = p.x; hy = p.y; } }
        if (hd < 1e15 && hd > 700 * 700) { hd = Math.sqrt(hd); hx = e.x + (hx - e.x) / hd * 260; hy = e.y + (hy - e.y) / hd * 260; } else { hx = e.x; hy = e.y; }
        v.wT = 2 + this.rng() * 2.5; v.wx = hx + Math.cos(a) * r; v.wy = hy + Math.sin(a) * r;
      }
      return { x: v.wx, y: v.wy, wander: true, idle: false };
    };

    /* a wild Digimon turns on the one that hit it, for a while */
    MissionSim.prototype._wildFoe = function (e, dt) {
      var f;
      e.foeT -= dt;
      e.vCd = Math.max(0, (e.vCd || 0) - dt);
      f = e.foe != null ? this._enemyById(e.foe) : null;
      if (!f || f.dead || !f.virus || dist2(e.x, e.y, f.x, f.y) > 320 * 320) { e.foeT = 0; e.foe = null; return null; }
      return f;
    };

    /* one wild Digimon hits another on contact */
    MissionSim.prototype._wildBite = function (e, t, dmg, dt) {
      var V = this.data.VIRUS, v = e.virus, reach = (e.radius || 10) + (t.radius || 10) + 7, cd = v ? v.cd : (e.vCd || 0), dx, dy, l, was;
      if (cd > 0 || t.dead || dist2(e.x, e.y, t.x, t.y) > reach * reach) return;
      if (v) { v.cd = V.biteCd; dmg *= V.wildMul; } else e.vCd = V.biteCd;
      dx = t.x - e.x; dy = t.y - e.y; l = Math.sqrt(dx * dx + dy * dy) || 1;
      was = t.virus;
      this.hurtEnemy(t, dmg, dx / l, dy / l, 70, { wild: true, by: e._id }, 1);
      if (t.dead || !v) return;
      /* it lived: it fights back, and from Champion up it may have caught it */
      if (!t.virus) { t.foe = e._id; t.foeT = V.fightBack; }
      if (!was && this._virusStage(e.type) >= V.spreadFrom && this._virusCount() < V.cap && this.rng() < V.spreadChance) this._infect(t, e);
    };

    /* a kill between wild Digimon: nothing dropped, and it feeds an infected killer */
    MissionSim.prototype._wildKill = function (e, owner) {
      var k = owner.by != null ? this._enemyById(owner.by) : null;
      if (e.dead) return;
      e.dead = true; e.hp = 0;
      this.emit({ type: "kill", enemyId: e._id, enemyType: e.type, x: e.x, y: e.y, killer: "wild", boss: false, big: false, r: e.radius || 10, hp: Math.round(e.maxHp), virus: e.virus ? 1 : 0 });
      if (k && !k.dead && k.virus) this._virusFed(k);
    };

    MissionSim.prototype._virusNext = function (type) {
      var defs = this._enemies(), T = this.data.EVO_TREE || (typeof EVO_TREE !== "undefined" ? EVO_TREE : null), n = this._burstForm(type), list, i, opts = [];
      if (n && n !== type && defs[n]) return n;
      list = (T && T.branches && T.branches[type]) || [];
      for (i = 0; i < list.length; i++) if (list[i].to && defs[list[i].to] && this._virusStage(list[i].to) > this._virusStage(type)) opts.push(list[i].to);
      opts.sort();
      return opts.length ? opts[(this.rng() * opts.length) | 0] : null;
    };

    MissionSim.prototype._virusFed = function (e) {
      var V = this.data.VIRUS, v = e.virus, st = this._virusStage(e.type), need = V.grow[Math.min(st, V.grow.length - 1)], next, defs, a, b, PC, ratio, from;
      v.fed += 1;
      e.hp = Math.min(e.maxHp, e.hp + e.maxHp * V.feedHeal);
      if (st >= 5 || v.fed < need) return;
      next = this._virusNext(e.type);
      v.fed = 0;
      if (!next) { e.maxHp *= 1.25; e.hp = e.maxHp; return; }     /* nowhere to go: it just gets tougher */
      defs = this._enemies(); a = defs[e.type] || {}; b = defs[next] || {};
      PC = (this.data.PACING && this.data.PACING.stageHp) || {};
      ratio = ((b.hp || 100) * (PC[b.stageDisplay] || 1)) / Math.max(1, (a.hp || 100) * (PC[a.stageDisplay] || 1));
      from = e.type;
      e.type = next;
      e.radius = this._actorRad(next);
      e.maxHp *= Math.max(1.4, ratio); e.hp = e.maxHp;
      e.lv = b.lv || e.lv; e.flee = b.flee || e.flee || 0; e.hit = b.hit || e.hit || 0;
      this.emit({ type: "virus.evolve", enemyId: e._id, from: from, form: next, x: e.x, y: e.y });
    };

    /* you beat one: it pays over what its kind drops */
    MissionSim.prototype._virusPay = function (e) {
      var P = this.data.VIRUS && this.data.VIRUS.pay, def = this._enemies()[e.type] || { xp: 10 }, i, a;
      if (!P) return;
      for (i = 0; i < P.xpOrbs; i++) { a = (Math.PI * 2 * i) / P.xpOrbs; this._spawnOrb("xp", e.x + Math.cos(a) * 26, e.y + Math.sin(a) * 20, Math.max(1, Math.round((def.xp || 10) * P.xpMul))); }
      this._spawnOrb("bits", e.x, e.y + 8, P.bits);
    };
  }

  if (typeof module === "object" && module.exports) module.exports = install;
  else { root.DBH = root.DBH || {}; root.DBH.installVirus = install; }
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
