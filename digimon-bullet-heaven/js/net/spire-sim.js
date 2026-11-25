/* Black spires (17z33): breaking one is a gamble (data.js TERRAIN.spire.roll).
 *
 * A hidden roll each time:
 *   small (most likely)  a swarm of In-Training Digimon pours out: easy experience
 *   mixed                a few In-Training ones led by a Rookie or two
 *   big (rare)           the ground rumbles for a moment (spire.rumble: run!), then a mini boss of evil, well
 *                        above you, comes out and hunts you down (the old spire, e.spire: it pays extra)
 * Beat everything a spire let out and a chest drops where the last one fell: bronze, silver or gold by
 * how hard it was (spire.cleared). Walk over it to open it (chest.open): Bits, a chunk of Hatchery data and
 * one rare food, picked by the chest's odds (data.js TERRAIN.spire.chests).
 */
(function (root) {
  "use strict";
  function install(MissionSim, U) {
    var dist2 = U.dist2;
    function cfg(sim) { return (sim.data.TERRAIN && sim.data.TERRAIN.spire) || {}; }
    function h01(s) { var h = 2166136261, i; s = String(s); for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; }
    MissionSim.prototype._spireType = function (stages, key, salt) {
      var defs = this._enemies(), S = this.data.SPECIES || {}, pool = [], k;
      for (k in defs) if (defs[k] && !defs[k].boss && S[k] && stages.indexOf(S[k].stage) >= 0) pool.push(k);
      pool.sort();
      return pool.length ? pool[Math.floor(this.rng() * pool.length)] : null;
    };
    MissionSim.prototype._spireBigType = function (key) {
      var S = cfg(this), SC = this.data.SEASONS_CFG || {}, year = Math.floor(this.time / (((SC.lengthSec || 486) * 4) || 1944)), defs = this._enemies(), s2, want, k, type = null;
      for (s2 = Math.min(year, (S.evil || []).length - 1); s2 >= 0 && !type; s2--) {
        want = [];
        for (k = 0; k < S.evil[s2].length; k++) if (defs[S.evil[s2][k]] || (this.data.SPECIES && this.data.SPECIES[S.evil[s2][k]])) want.push(S.evil[s2][k]);
        if (want.length) type = want[Math.floor(h01(key + "|" + s2) * want.length)];
      }
      return type;
    };
    /* the roll: which tier this spire gives */
    MissionSim.prototype._spireRoll = function () {
      var R = cfg(this).roll || { small: 0.7, mixed: 0.2, big: 0.1 }, r = this.rng();
      return r < R.small ? "small" : (r < R.small + R.mixed ? "mixed" : "big");
    };
    MissionSim.prototype._spireBreak = function (p, key, px, py) {
      var S = cfg(this), tier = this._spireRoll(), G, n, i, a, c, e, list = [], types;
      this.spireGroups = this.spireGroups || {};
      G = this.spireGroups[key] = { key: key, tier: tier, x: px, y: py + 30, members: 0, killed: 0, t0: this.time, owner: p.id, lastX: px, lastY: py + 30 };
      if (tier === "big") {
        /* a warning first: you have a moment to run */
        G.due = this.time + (S.rumbleSec || 1.6); G.bigType = this._spireBigType(key);
        this.emit({ type: "spire.rumble", key: key, x: Math.round(px), y: Math.round(py), sec: S.rumbleSec || 1.6, id: p.id });
        return { tier: tier, enemyType: G.bigType };
      }
      n = tier === "small" ? (S.smallCount || [5, 6]) : (S.mixedCount || [3, 3]);
      n = n[0] + Math.floor(this.rng() * (n[1] - n[0] + 1));
      types = [];
      for (i = 0; i < n; i++) types.push(this._spireType(["In-Training"], key, i));
      if (tier === "mixed") { var leaders = (S.mixedLeaders || [1, 2]); leaders = leaders[0] + Math.floor(this.rng() * (leaders[1] - leaders[0] + 1)); for (i = 0; i < leaders; i++) types.push(this._spireType(["Rookie"], key, "r" + i)); }
      for (i = 0; i < types.length; i++) {
        if (!types[i]) continue;
        a = (Math.PI * 2 * i) / types.length + this.rng() * 0.4;
        c = this._snap(px + Math.cos(a) * 60, py + 34 + Math.sin(a) * 40, 12, 200);
        e = this.spawnEnemy(types[i], { x: c.x, y: c.y, keepType: true, quiet: true });
        if (e) { e.spireGroup = key; G.members++; list.push(types[i]); }
      }
      return { tier: tier, enemyType: list[list.length - 1] || null, count: G.members };
    };
    /* one of a spire's own is down */
    MissionSim.prototype._spireKill = function (e) {
      var G = this.spireGroups && this.spireGroups[e.spireGroup];
      if (!G) return;
      G.killed++; G.lastX = e.x; G.lastY = e.y;
      if (G.killed >= G.members && G.members > 0 && !G.done) this._spireClear(G);
    };
    MissionSim.prototype._spireClear = function (G) {
      var S = cfg(this), chest = { small: "bronze", mixed: "silver", big: "gold" }[G.tier] || "bronze", s = this._snap(G.lastX, G.lastY, 10, 160);
      G.done = true;
      this._spawnOrb("chest_" + chest, s.x, s.y, 1);
      this.emit({ type: "spire.cleared", key: G.key, tier: G.tier, chest: chest, x: Math.round(s.x), y: Math.round(s.y) });
      delete this.spireGroups[G.key];
    };
    MissionSim.prototype._updateSpires = function (dt) {
      var k, G, S = cfg(this), e, c;
      for (k in this.spireGroups || {}) {
        G = this.spireGroups[k];
        if (G.due != null && this.time >= G.due) {
          G.due = null;
          c = this._snap(G.x, G.y + 14, 16, 220);
          e = G.bigType ? this.spawnEnemy(G.bigType, { x: c.x, y: c.y, boss: true, keepType: true, quiet: true }) : null;
          if (e) {
            e.spire = true; e.spireGroup = k; G.members = 1;
            e.radius *= (S.size || 1);
            e.maxHp = e.hp = e.maxHp * (S.hpMul || 1);
            e.dmgMul = (e.dmgMul || 1) * (S.dmgMul || 1);
            e.spdMul = (S.bigSpeed || 1.15);
            this.emit({ type: "spire.big", key: k, enemyType: G.bigType, x: Math.round(c.x), y: Math.round(c.y) });
          } else delete this.spireGroups[k];
          continue;
        }
        /* a group that wandered off or despawned long ago is forgotten */
        if (this.time - G.t0 > (S.forgetSec || 420)) delete this.spireGroups[k];
      }
    };
    /* a chest picked up */
    MissionSim.prototype._chestLoot = function (C) {
      var L = C.loot || {}, k, tot = 0, r;
      for (k in L) tot += L[k];
      if (!(tot > 0)) return null;
      r = this.rng() * tot;
      for (k in L) { r -= L[k]; if (r <= 0) return k; }
      return k;
    };
    /* a chest picked up: Bits, a chunk of Hatchery data of one random element, and one rare food (data.js FOOD) */
    MissionSim.prototype._openChest = function (p, kind) {
      var S = cfg(this), tier = kind.slice(6), C = (S.chests || {})[tier] || { bits: [20, 40] }, bits = Math.round(C.bits[0] + this.rng() * (C.bits[1] - C.bits[0]));
      var types = S.dataTypes || ["fire", "ice", "water", "dark", "holy", "machine", "nature", "slime", "wind", "beast"];
      var dataType = C.data ? types[Math.floor(this.rng() * types.length) % types.length] : null;
      var food = this._chestLoot(C);
      p.bits = (p.bits || 0) + bits;
      if (food && this.data.FOOD && this.data.FOOD[food]) { p.bag = p.bag || {}; p.bag[food] = (p.bag[food] || 0) + 1; } else food = null;
      if (dataType) { p.chestData = p.chestData || {}; p.chestData[dataType] = (p.chestData[dataType] || 0) + C.data; }
      p.chests = p.chests || {}; p.chests[tier] = (p.chests[tier] || 0) + 1;
      this.emit({ type: "chest.open", id: p.id, chest: tier, bits: bits, bitsNow: p.bits, food: food, dataType: dataType, data: dataType ? C.data : 0 });
    };
  }
  var isNode = typeof module !== "undefined" && module.exports;
  if (isNode) module.exports = install;
  else { root.DBH = root.DBH || {}; root.DBH.installSpires = install; }
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
