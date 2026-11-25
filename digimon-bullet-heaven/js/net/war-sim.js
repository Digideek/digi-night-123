/* Biome wars (Nov 20; data.js WAR, world.js territory).
 *
 * Every biome is at war with its neighbours along its borders. The map is cut
 * into cells (world.js TERR); a border cell is one whose holder has a cell of
 * another biome beside it. Near the players, every second, each border cell
 * feels a push from the neighbour that is pressing it hardest:
 *
 *   push = (attacker's strength - holder's strength) / holder's strength
 *
 * Pressure builds with the push (WAR.rate) and leaks away without it; when it
 * fills, the cell changes hands and the front moves on by a cell. Strength is
 *   1 x its season (Freezeland in winter, the crags and desert in summer...)
 *     x a slow wobble per front, so borders shift a little on their own
 *     / (1 + WAR.lossWeight x its recent losses near there).
 * Losses are that biome's own Digimon dying near the front: killed by you, by
 * the other side, by a storm, anything (a Digimon counts for the biome it lives
 * in: biomes.js homeOf). Its lord falling counts for a great deal over a wide
 * area for a few minutes: that is how a biome collapses. So you tip a war by
 * hunting one side's Digimon at the front, or by taking down its lord.
 *
 * Skirmishes: now and then, at a front within sight, a squad of each side's
 * natives spawns on its own side and they go at each other. They leave you be
 * unless you come close or hit them; then they turn on you like any wild
 * Digimon. Whoever loses more, loses ground.
 *
 * Everything resets with the map at the start of each run.
 */
(function (root) {
  "use strict";
  function install(MissionSim, U) {
    var dist2 = U.dist2;

    MissionSim.prototype._warCfg = function () { return this.data && this.data.WAR; };

    /* how hard a side fights here and now */
    MissionSim.prototype._warStrength = function (side, x, y) {
      var W = this._warCfg(), SN = this.data.seasons, season = SN && SN.info ? SN.info(this.time).id : "spring", dark = SN && SN.darkOf ? SN.darkOf(this) : 0;
      var s = (W.base && W.base[side]) || 1, sm = W.season && W.season[side];
      if (sm && sm[season]) s *= sm[season];
      if (W.nightOwl && W.nightOwl[side]) s *= 1 + (W.nightOwl[side] - 1) * dark;
      return s / (1 + W.lossWeight * this._warLosses(side, x, y));
    };
    /* that side's recent dead near (x, y), fading with age; a fallen lord reaches much further */
    MissionSim.prototype._warLosses = function (side, x, y) {
      var W = this._warCfg(), list = this._warDead || [], i, d, n = 0, r, age;
      for (i = 0; i < list.length; i++) {
        d = list[i]; if (d.side !== side) continue;
        age = this.time - d.t; if (age > W.lossLife) continue;
        r = d.lord ? W.lordRadius : W.lossRadius;
        if (dist2(x, y, d.x, d.y) > r * r) continue;
        n += d.w * (1 - age / W.lossLife);
      }
      return n;
    };
    /* a Digimon died: its biome mourns it at the front */
    MissionSim.prototype._warLossOf = function (e) {
      var W = this._warCfg(), BI = this.data.biomes, side;
      if (!W || !e || e._warCounted) return;
      e._warCounted = true;
      side = e.war || (e.lord ? e.lairBiome : null) || (BI && BI.homeOf && !e.rival && !e.spire ? BI.homeOf(e.type) : null);
      if (!side) return;
      this._warDead = this._warDead || [];
      this._warDead.push({ side: side, x: e.x, y: e.y, t: this.time, w: e.lord ? W.lordLoss : (e.boss || e.mega ? W.bossLoss : 1), lord: !!e.lord });
      if (e.lord) this.emit({ type: "war.lord", side: side, x: Math.round(e.x), y: Math.round(e.y) });
      if (this._warDead.length > W.maxDead) this._warDead.splice(0, this._warDead.length - W.maxDead);
    };

    MissionSim.prototype._updateWar = function (dt, wave, host) {
      var W = this._warCfg(), w = this.data.world;
      if (!W || !w || !w.cellOwner || !w.setOwner || !w.TILE || !w.TILE() || !host || this.noWar) return;   /* Night Siege: the borders hold still */
      this._warT = (this._warT || 0) - dt;
      if (this._warT > 0) return;
      var step = W.tick, span = w.TERR * w.TILE(), seen = {}, cells = [], i, j, p, cx, cy, k, a, b, n, best, bp, push, rec, x, y, sA;
      this._warT = step;
      this._front = this._front || {};
      if (this._warDead) { for (i = this._warDead.length - 1; i >= 0; i--) if (this.time - this._warDead[i].t > W.lossLife) this._warDead.splice(i, 1); }
      /* the border cells within reach of any tamer */
      for (p = 0; p < this.players.length; p++) {
        var pl = this.players[p];
        if (!pl.hasTamer || pl.away) continue;
        var pcx = Math.floor(pl.x / span), pcy = Math.floor(pl.y / span);
        for (cy = pcy - W.radius; cy <= pcy + W.radius; cy++) for (cx = pcx - W.radius; cx <= pcx + W.radius; cx++) {
          k = cx + "," + cy; if (seen[k]) continue; seen[k] = 1; cells.push([cx, cy]);
        }
      }
      var NB = [[1, 0], [-1, 0], [0, 1], [0, -1]], live = {}, flips = 0;
      for (i = 0; i < cells.length; i++) {
        cx = cells[i][0]; cy = cells[i][1]; a = w.cellOwner(cx, cy);
        x = (cx + 0.5) * span; y = (cy + 0.5) * span;
        /* the neighbour pressing hardest */
        best = null; bp = 0; sA = 0;
        for (j = 0; j < 4; j++) {
          b = w.cellOwner(cx + NB[j][0], cy + NB[j][1]);
          if (b === a) continue;
          if (!sA) sA = this._warStrength(a, x, y) * this._warWobble(cx, cy, a);
          push = (this._warStrength(b, x, y) * this._warWobble(cx, cy, b) - sA) / Math.max(0.05, sA);
          if (best === null || push > bp) { best = b; bp = push; }
        }
        k = cx + "," + cy;
        if (best === null) { delete this._front[k]; continue; }
        live[k] = 1;
        rec = this._front[k] || (this._front[k] = { att: best, p: 0 });
        if (rec.att !== best) { rec.att = best; rec.p *= 0.5; }
        if (bp > 0) rec.p += Math.min(W.maxPush, bp) * W.rate * step;
        else rec.p = Math.max(0, rec.p - W.leak * step);
        if (rec.p >= 1 && flips < W.maxFlipsPerTick) {
          delete this._front[k];
          if (w.setOwner(cx, cy, best)) {
            flips++;
            this.emit({ type: "war.flip", cx: cx, cy: cy, from: a, to: best, x: Math.round(x), y: Math.round(y) });
          }
        }
      }
      for (k in this._front) if (!live[k]) delete this._front[k];
      this._updateSkirmish(step, wave, host);
    };
    /* each front drifts a little on its own: every few minutes the odds tilt one way or the other */
    MissionSim.prototype._warWobble = function (cx, cy, side) {
      var W = this._warCfg(), era = Math.floor(this.time / W.wobbleEvery), h = hash01(cx + "," + cy + "|" + side + "|" + era);
      return 1 + (h - 0.5) * 2 * W.wobble;
    };

    /* ---- skirmishes ---- */
    MissionSim.prototype._updateSkirmish = function (step, wave, host) {
      var W = this._warCfg(), w = this.data.world, i, e, n = 0, span, cand = [], k, p, cx, cy, a, b, dx, dy, d, x, y, j, pick;
      for (i = 0; i < this.enemies.length; i++) { e = this.enemies[i]; if (e.war && !e.dead) n++; }
      if (this._skirT == null) this._skirT = W.skirmishFirst;
      this._skirT -= step;
      if (this._skirT > 0 || n >= W.maxUnits || !this._spawnsOpen || !this._spawnsOpen()) return;
      this._skirT = W.skirmishEvery[0] + this.rng() * (W.skirmishEvery[1] - W.skirmishEvery[0]);
      span = w.TERR * w.TILE();
      /* a border near enough to see, but not right on top of you */
      for (k in this._front) {
        p = k.split(","); cx = +p[0]; cy = +p[1];
        x = (cx + 0.5) * span; y = (cy + 0.5) * span; d = Math.sqrt(dist2(x, y, host.x, host.y));
        if (d < W.skirmishNear[0] || d > W.skirmishNear[1]) continue;
        a = w.cellOwner(cx, cy);
        for (j = 0; j < 4; j++) {
          dx = [1, -1, 0, 0][j]; dy = [0, 0, 1, -1][j]; b = w.cellOwner(cx + dx, cy + dy);
          if (b !== a) cand.push({ cx: cx, cy: cy, a: a, b: b, dx: dx, dy: dy });
        }
      }
      /* not in the Baby zone round the start (playtest, Nov 20: Champion and Ultimate squads were
       * forming up there and beating freshly hatched partners) */
      if (this._startZone) cand = cand.filter(function (c) { return this._startZone((c.cx + 0.5 + c.dx * 0.5) * span, (c.cy + 0.5 + c.dy * 0.5) * span) < 2; }, this);
      if (!cand.length) return;
      cand.sort(function (u, v) { return (u.cx - v.cx) || (u.cy - v.cy) || (u.dx - v.dx) || (u.dy - v.dy); });
      pick = cand[(this.rng() * cand.length) | 0];
      var zx = (pick.cx + 0.5 + pick.dx * 0.5) * span, zy = (pick.cy + 0.5 + pick.dy * 0.5) * span;
      var ta = this._warType(pick.a, wave, zx, zy), tb = this._warType(pick.b, wave, zx, zy);
      if (!ta || !tb) return;
      /* the line between the two cells; each squad forms up a little back on its own side */
      var mx = (pick.cx + 0.5 + pick.dx * 0.5) * span, my = (pick.cy + 0.5 + pick.dy * 0.5) * span, back = span * 0.45;
      var size = W.squad[0] + Math.floor(this.rng() * (W.squad[1] - W.squad[0] + 1));
      var ida = this._warSquad(pick.a, ta, mx - pick.dx * back, my - pick.dy * back, size);
      var idb = this._warSquad(pick.b, tb, mx + pick.dx * back, my + pick.dy * back, size);
      if (ida + idb) this.emit({ type: "war.skirmish", a: pick.a, b: pick.b, x: Math.round(mx), y: Math.round(my) });
    };
    /* a native of that biome at about the stage the field is at now */
    var LOWW = { "Baby I": 1, "Baby II (In-Training)": 1, "Child (Rookie)": 1 };
    MissionSim.prototype._warType = function (side, wave, x, y) {
      var BI = this.data.biomes, defs = this._enemies(), stages = {}, t, list, key, k, zone = this._startZone && x != null ? this._startZone(x, y) : 0;
      if (!BI || !BI.homeOf) return null;
      for (t in (wave && wave.rates) || {}) if (defs[t] && !defs[t].boss) stages[defs[t].stageDisplay] = 1;
      if (zone) { for (t in stages) if (!LOWW[t]) delete stages[t]; if (!Object.keys(stages).length) stages["Child (Rookie)"] = 1; }   /* near the start: up to Rookie */
      this._warNatives = this._warNatives || {};
      key = side + "|" + Object.keys(stages).sort().join(",");
      list = this._warNatives[key];
      if (!list) {
        list = [];
        for (k in defs) if (defs[k] && !defs[k].boss && !defs[k].fly && stages[defs[k].stageDisplay] && BI.homeOf(k) === side) list.push(k);
        list.sort();
        this._warNatives[key] = list;
      }
      return list.length ? list[(this.rng() * list.length) | 0] : null;
    };
    MissionSim.prototype._warSquad = function (side, type, x, y, size) {
      var W = this._warCfg(), i, s, e, a, r, made = 0;
      for (i = 0; i < size; i++) {
        a = this.rng() * Math.PI * 2; r = Math.sqrt(this.rng()) * W.scatter;
        s = this._snap(x + Math.cos(a) * r, y + Math.sin(a) * r, 12, 200);
        e = this.spawnEnemy(type, { x: s.x, y: s.y, keepType: true });
        if (!e) continue;
        e.war = side; e.wx = s.x; e.wy = s.y; e.vCd = this.rng() * 0.6;
        made++;
      }
      return made;
    };
    /* A soldier picks a fight with the other side. It only turns on the
     * tamer's side if they come close or hit it (returns null: chase as usual). */
    MissionSim.prototype._warAct = function (e, closest, dt) {
      var W = this._warCfg(), i, o, d, best = null, bd = W.seek * W.seek;
      if (e.warAngry) return null;
      if (closest < W.aggro * W.aggro || e.warHit) { e.warAngry = true; this.emit({ type: "fx", k: "alert", x: e.x, y: e.y - (e.radius || 10) - 10 }); return null; }
      e.vCd = Math.max(0, (e.vCd || 0) - dt);
      for (i = 0; i < this.enemies.length; i++) {
        o = this.enemies[i];
        if (o === e || o.dead || !o.war || o.war === e.war) continue;
        d = dist2(e.x, e.y, o.x, o.y);
        if (d < bd) { bd = d; best = o; }
      }
      if (best) return best;
      /* nobody left to fight: hold the ground it won, then wander off home */
      e.warIdle = (e.warIdle || 0) + dt;
      if (e.warIdle > W.holdFor) { e.dead = true; return null; }
      return { x: e.wx, y: e.wy, wander: true, idle: dist2(e.x, e.y, e.wx, e.wy) < 400 };
    };

    /* the contested cells, for the guests' screens: [cx, cy, attacker, pressure 0-99] */
    MissionSim.prototype._frontList = function () {
      var out = [], k, r, p;
      for (k in this._front || {}) {
        r = this._front[k]; if (r.p < 0.12) continue;
        p = k.split(","); out.push([+p[0], +p[1], r.att, Math.min(99, Math.round(r.p * 100))]);
      }
      return out;
    };

    function hash01(s) {
      var h = 2166136261, i;
      for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
      return ((h >>> 0) % 100000) / 100000;
    }
  }

  var isNode = typeof module !== "undefined" && module.exports;
  if (isNode) module.exports = install;
  else { root.DBH = root.DBH || {}; root.DBH.installWar = install; }
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
