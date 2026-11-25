/* Living populations (Nov 20; data.js NESTS, world.js nestsNear).
 *
 * Nothing spawns out of thin air any more. Every biome's Digimon live in nests
 * scattered over its land. A nest has a population (count, up to cap) that
 * breeds back slowly from the nest itself, whether or not anyone is there.
 *
 *   When a tamer comes within NESTS.activate of a nest, its living members are
 *   put on the map round it as a herd (an idle pack: they graze, drink, sleep
 *   at night, and come at you when you get close or hit one).
 *   When everyone has moved far off, the herd is put away again: it is not
 *   killed, the nest just remembers how many are still alive.
 *   Every death of a member, whoever caused it, takes one from the nest.
 *   While a herd is out, a nest below its cap hatches a new member now and
 *   then, right at the nest (you see it come out).
 *
 * What lives there follows the field: a herd is natives of the nest's biome at
 * the stage the season and year call for (data.js stage waves), so the world
 * grows stronger as the years go by; a nursery keeps Babies and In-Training
 * all run long; an alpha nest has a boss at its head. Whose nest it is follows
 * the territory: a nest in conquered land is resettled by the winner, a few
 * at first.
 */
(function (root) {
  "use strict";
  function install(MissionSim, U) {
    var dist2 = U.dist2;

    MissionSim.prototype._nestCfg = function () { return this.data && this.data.NESTS; };

    /* how many a nest of this kind can hold now */
    MissionSim.prototype._nestCap = function (kind) {
      var N = this._nestCfg(), S = this.data.SEASONS_CFG || {}, year = Math.floor(this.time / (((S.lengthSec || 486) * 4) || 1944));
      var base = N.cap[kind] || N.cap.herd;
      return Math.max(1, Math.round(Math.min(base + year * N.capPerYear, N.capMax) * Math.min(1.6, this.coopScale || 1)));
    };
    /* the kind of Digimon a nest of this biome raises at this point in the run */
    /* The start stays low (data.js RESPAWN.zone): 2 = Babies and In-Training only, 1 = up to Rookie, 0 = the run's clock decides.
     * A partner that has to start over as an egg comes back here, so there is always somewhere it can level. */
    MissionSim.prototype._startZone = function (x, y) {
      var Z = this.data.RESPAWN && this.data.RESPAWN.zone, d2;
      if (!Z || x == null) return 0;
      d2 = x * x + y * y;
      return Z.cradle && d2 < Z.cradle * Z.cradle ? 3 : (d2 < Z.baby * Z.baby ? 2 : (d2 < Z.rookie * Z.rookie ? 1 : 0));
    };
    var LOW = { "Baby I": 3, "Baby II (In-Training)": 2, "Child (Rookie)": 1 };
    /* Nov 21: baby nests (Baby I and In-Training) breed back much faster (NESTS.babyBreedSec,
     * every 10 s instead of 40) and hold a couple more (babyCapAdd): players ran out of them. */
    MissionSim.prototype._nestBaby = function (st) {
      var d = st && st.type ? this._enemies()[st.type] : null, sd = d && d.stageDisplay;
      return sd === "Baby I" || sd === "Baby II (In-Training)";
    };
    MissionSim.prototype._nestBreed = function (st) {
      var N = this._nestCfg();
      return this._nestBaby(st) && N.babyBreedSec ? N.babyBreedSec : N.breedSec;
    };
    MissionSim.prototype._nestBabyCap = function (st) {
      var N = this._nestCfg();
      if (!st.babyCapped && this._nestBaby(st) && N.babyCapAdd) { st.cap += N.babyCapAdd; st.babyCapped = true; }
    };
    MissionSim.prototype._nestType = function (biome, kind, wave, key, x, y) {
      var BI = this.data.biomes, defs = this._enemies(), stages = {}, t, list, ck, k, i, zone = this._startZone(x, y), lowOk;
      if (!BI || !BI.homeOf) return null;
      if (kind === "nursery") { stages["Baby I"] = 1; stages["Baby II (In-Training)"] = 1; for (t in (wave.fodder && wave.fodder.rates) || {}) if (defs[t]) stages[defs[t].stageDisplay] = 1; }
      else for (t in wave.rates || {}) if (defs[t] && !defs[t].boss) stages[defs[t].stageDisplay] = 1;
      if (zone) {
        lowOk = function (st) { return (LOW[st] || 0) >= zone; };
        for (t in stages) if (!lowOk(t)) delete stages[t];
        if (!Object.keys(stages).length) { if (zone === 3) stages["Baby I"] = 1; else { stages["Baby II (In-Training)"] = 1; if (zone === 1) stages["Child (Rookie)"] = 1; else stages["Baby I"] = 1; } }
      }
      this._nestNatives = this._nestNatives || {};
      ck = biome + "|" + Object.keys(stages).sort().join(",");
      list = this._nestNatives[ck];
      if (!list) {
        list = [];
        for (k in defs) if (defs[k] && !defs[k].boss && stages[defs[k].stageDisplay] && BI.homeOf(k) === biome) list.push(k);
        /* a biome with nobody of that stage borrows the field's own */
        if (!list.length) for (k in (kind === "nursery" ? ((wave.fodder && wave.fodder.rates) || wave.rates) : wave.rates) || {}) if (defs[k] && !defs[k].boss && (!zone || stages[defs[k].stageDisplay])) list.push(k);
        /* ...or anyone of the right stage at all */
        if (!list.length && zone) for (k in defs) if (defs[k] && !defs[k].boss && !defs[k].lord && stages[defs[k].stageDisplay]) list.push(k);
        list.sort();
        this._nestNatives[ck] = list;
      }
      if (!list.length) return null;
      i = Math.floor(hash01(key + "|" + ck) * list.length);
      return list[i % list.length];
    };

    MissionSim.prototype._updateNests = function (dt, wave, host) {
      var N = this._nestCfg(), w = this.data.world, i, j, p, list, n, st, alive = {}, e, near, k, want, stageKey;
      if (!N || !w || !w.nestsNear || !host) return;
      this.nests = this.nests || {};
      this._nestT = (this._nestT || 0) - dt;
      if (this._nestT > 0) return;
      var step = N.tick; this._nestT = step;
      for (i = 0; i < this.enemies.length; i++) { e = this.enemies[i]; if (e.nest && !e.dead) alive[e.nest] = (alive[e.nest] || 0) + 1; }
      stageKey = Object.keys(wave.rates || {}).sort().join(",");
      near = {};
      for (p = 0; p < this.players.length; p++) {
        var pl = this.players[p];
        if (!pl.hasTamer || pl.away) continue;
        list = w.nestsNear(pl.x, pl.y, N.activate);
        for (j = 0; j < list.length; j++) near[list[j].key] = list[j];
      }
      /* every nest we know of: breed, resettle, put away */
      for (k in this.nests) {
        st = this.nests[k];
        if (st.active && !alive[k]) { st.active = false; st.t = this.time; }
        if (!st.active) {
          /* bred back while nobody was looking */
          /* a nest is never wiped out for good: one nearly emptied breeds back faster (data.js LEVELS.lowMul) */
          var LVn = this.data.LEVELS, fast = LVn && st.count < LVn.lowAt ? LVn.lowMul : 1;
          st.count = Math.min(st.cap, st.count + (this.time - st.t) * fast / this._nestBreed(st));
          st.t = this.time;
        }
      }
      for (k in near) {
        n = near[k]; st = this.nests[k];
        if (!st) { st = this.nests[k] = { key: k, x: n.x, y: n.y, kind: n.kind, biome: n.biome, cap: this._startZone(n.x, n.y) >= 2 ? Math.min(this._nestCap(n.kind), ((this.data.RESPAWN && this.data.RESPAWN.startHerd) || 2) + 1) : this._nestCap(n.kind),   /* small herds round the start (playtest, Nov 20) */ count: 0, t: this.time, active: false, stage: stageKey, breedT: N.breedSec }; st.count = st.cap * N.startFull; }
        if (!st.active) {
          /* conquered: the winner moves in, a few at first */
          if (n.biome !== st.biome) { st.biome = n.biome; st.count = Math.min(st.count, N.settlers); st.type = null; }
          if (st.stage !== stageKey && !this._startZone(st.x, st.y)) { st.stage = stageKey; st.type = null; st.cap = this._nestCap(st.kind); st.babyCap0 = null; }
          if (!st.type) { st.type = this._nestType(st.biome, st.kind, wave, k, st.x, st.y); st.babyCapped = false; if (st.babyCap0 != null) st.cap = st.babyCap0; }
          if (st.babyCap0 == null) st.babyCap0 = st.cap;
          this._nestBabyCap(st);
          if (st.type && st.count >= 1 && this._spawnsOpen()) this._nestRelease(st);
        } else {
          /* out and about: a nest short of its cap hatches one more now and then */
          st.breedT -= step;
          if (st.breedT <= 0) {
            st.breedT = this._nestBreed(st);
            if (st.count + 1 <= st.cap && (alive[k] || 0) < st.cap) { st.count += 1; this._nestMember(st, true); }
          }
        }
      }
    };
    /* Never an empty map (data.js LEVELS.wander*): when few wild Digimon are near a tamer, a small
     * herd of the local biome drifts in from off-screen and goes about its day there. */
    MissionSim.prototype._updateWanderers = function (dt, wave, host) {
      var L = this.data.LEVELS, w = this.data.world, i, j, p, e, n, a, r, c, b, type, id, size, s, m, defs = this._enemies();
      if (!L || !w || !w.biomeAt) return;
      this._wanderT = (this._wanderT == null ? L.wanderEvery[0] : this._wanderT) - dt;
      if (this._wanderT > 0) return;
      this._wanderT = L.wanderEvery[0] + this.rng() * (L.wanderEvery[1] - L.wanderEvery[0]);
      for (i = 0; i < this.players.length; i++) {
        p = this.players[i];
        if (!p.hasTamer || p.away) continue;
        n = 0;
        for (j = 0; j < this.enemies.length; j++) { e = this.enemies[j]; if (!e.dead && !e.rally && !e.war && !e.rival && dist2(e.x, e.y, p.x, p.y) < L.wanderNear * L.wanderNear) n++; }
        if (n >= L.wanderMin) continue;
        a = this.rng() * Math.PI * 2; r = L.wanderDist[0] + this.rng() * (L.wanderDist[1] - L.wanderDist[0]);
        c = this._snap(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 14, 300);
        b = w.biomeAt(c.x, c.y);
        type = this._nestType(b ? b.id : "plains", this.rng() < 0.25 ? "nursery" : "herd", wave, "w" + Math.floor(this.time), c.x, c.y);
        if (!type) continue;
        id = "wander:" + (this._wanderSeq = (this._wanderSeq || 0) + 1);
        this.packs = this.packs || {};
        this.packs[id] = { awake: false, x: c.x, y: c.y, hx: p.x + (c.x - p.x) * 0.55, hy: p.y + (c.y - p.y) * 0.55, cx: c.x, cy: c.y, tx: c.x, ty: c.y, task: "graze", tT: 0, night: (defs[type] || {}).attribute === "Virus" };
        size = L.wanderSize[0] + Math.floor(this.rng() * (L.wanderSize[1] - L.wanderSize[0] + 1));
        if (this._startZone(c.x, c.y) >= 2) size = Math.min(size, (this.data.RESPAWN && this.data.RESPAWN.startHerd) || 2);   /* small herds round the start */
        for (j = 0; j < size; j++) {
          s = this._snap(c.x + (this.rng() - 0.5) * 120, c.y + (this.rng() - 0.5) * 90, 12, 160);
          m = this.spawnEnemy(type, { x: s.x, y: s.y, keepType: true });
          if (!m) continue;
          m.pack = id; m.fac = b ? b.id : null; m.homeX = s.x; m.homeY = s.y; m.wx = s.x; m.wy = s.y; m.ox = s.x - c.x; m.oy = s.y - c.y; m.wT = this.rng() * 2;
        }
      }
    };

    /* put the nest's living members on the map round it, as one herd */
    MissionSim.prototype._nestRelease = function (st) {
      var N = this._nestCfg(), n = Math.floor(st.count), i, pk = "nest:" + st.key, defs = this._enemies(), leader;
      this.packs = this.packs || {};
      this.packs[pk] = { awake: false, x: st.x, y: st.y, hx: st.x, hy: st.y, cx: st.x, cy: st.y, tx: st.x, ty: st.y, task: "graze", tT: 3 + this.rng() * 6, night: (defs[st.type] || {}).attribute === "Virus", nest: st.key };
      st.active = true; st.breedT = this._nestBreed(st);
      if (st.kind === "alpha" && this.data.stageBoss && !this._startZone(st.x, st.y)) {
        leader = this.data.stageBoss(this._partnerStageIdx(), this.seed, hash01(st.key) * 1000 | 0, this.time);
        if (leader) { var b = this._nestMember(st, false, leader); if (b) { b.nestLeader = true; n -= 1; } }
      }
      /* veterans first (pvp-sim.js _allyHome): ones that fought at a tamer's side come back as they left */
      var vets = st.vets || [], v, m;
      st.vets = [];
      for (i = 0; i < vets.length && n > 0; i++) {
        v = vets[i]; m = this._nestMember(st, false, v.type, true);
        if (!m) continue;
        m.alv = v.alv; m.axp = v.axp; m.maxHp = m.hp = v.maxHp; m.dmgMul = v.dmgMul; m.radius = v.radius || m.radius;
        n -= 1;
      }
      for (i = 0; i < n; i++) this._nestMember(st, false);
      if (!this._nestAlive(st.key)) { st.active = false; delete this.packs[pk]; }
    };
    MissionSim.prototype._nestAlive = function (key) {
      for (var i = 0; i < this.enemies.length; i++) if (this.enemies[i].nest === key && !this.enemies[i].dead) return true;
      return false;
    };
    MissionSim.prototype._nestMember = function (st, hatched, type, plain) {
      var N = this._nestCfg(), a = this.rng() * Math.PI * 2, r = hatched ? 6 : 18 + Math.sqrt(this.rng()) * N.scatter, s, e, PK = this.packs && this.packs["nest:" + st.key];
      s = this._snap(st.x + Math.cos(a) * r, st.y + Math.sin(a) * r, 12, 160, this._crossOf ? this._crossOf(type || st.type) : 0);
      e = this.spawnEnemy(type || st.type, type && !plain ? { x: s.x, y: s.y, boss: true, keepType: true } : { x: s.x, y: s.y, keepType: true });
      if (!e) return null;
      e.nest = st.key; e.pack = "nest:" + st.key; e.fac = st.biome;   /* it fights for the biome that holds its nest */
      e.homeX = s.x; e.homeY = s.y; e.wx = s.x; e.wy = s.y; e.wT = this.rng() * 3;
      e.ox = s.x - (PK ? PK.cx : st.x); e.oy = s.y - (PK ? PK.cy : st.y);
      if (hatched) this.emit({ type: "fx", k: "nesthatch", x: Math.round(st.x), y: Math.round(st.y) });
      return e;
    };
    /* one of a nest's own died (by anyone's hand): the nest is one fewer */
    MissionSim.prototype._nestLoss = function (e) {
      var st = e && e.nest && this.nests && this.nests[e.nest];
      if (!st || e._nestCounted) return;
      e._nestCounted = true;
      st.count = Math.max(0, st.count - 1);
    };
    /* the nests near the players, for their screens: [x, y, biome, count, cap, kind] */
    MissionSim.prototype._nestList = function () {
      var out = [], k, st, p, pl, R = 1400, keep;
      for (k in this.nests || {}) {
        st = this.nests[k]; keep = false;
        for (p = 0; p < this.players.length && !keep; p++) { pl = this.players[p]; if (pl.hasTamer && dist2(pl.x, pl.y, st.x, st.y) < R * R) keep = true; }
        if (keep) out.push([Math.round(st.x), Math.round(st.y), st.biome, Math.floor(st.count), st.cap, st.kind]);
      }
      return out;
    };

    function hash01(s) {
      var h = 2166136261, i;
      s = String(s);
      for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
      return ((h >>> 0) % 100000) / 100000;
    }
  }

  var isNode = typeof module !== "undefined" && module.exports;
  if (isNode) module.exports = install;
  else { root.DBH = root.DBH || {}; root.DBH.installNests = install; }
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
