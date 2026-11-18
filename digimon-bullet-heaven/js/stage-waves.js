/* Digimon Bullet Heaven — stage-matched enemy waves (Nov 13).
 *
 * The enemy tier climbs one stage per season (Baby and In-Training in
 * Spring, Rookies through Summer, Champions through Fall, Ultimates through
 * Winter). Since Nov 16 the partner no longer holds it back (data.js PACING.followPartner). The field stays thin. Seasons (seasons.js) multiply on top through weather.liveMods.
 *
 * DBH.stageWave(time, stageIdx, seed) -> { rates, cap, hpMul, dmgMul, spdMul }
 * DBH.stageBoss(stageIdx, seed, n)    -> species id for the n-th boss
 * DBH.partnerStageIdx(formId)         -> 0 Baby .. 5 Mega
 */
(function (global) {
  "use strict";

  var D = global.DBH = global.DBH || {};

  var STAGE_IDX = {
    "Egg": 0, "Baby I": 0, "Baby II": 1, "Rookie": 2, "Champion": 3, "Armor": 3,
    "Ultimate": 4, "Mega": 5, "Mega+": 5
  };
  var POOL = ["Baby I", "Baby II (In-Training)", "Child (Rookie)", "Adult (Champion)", "Perfect (Ultimate)", "Ultimate (Mega)"];

  /* One stage per season (Nov 15, second pass). The enemy tier follows
   * battle time: 0 = Baby I, 1 = In-Training, 2 = Rookie, 3 = Champion,
   * 4 = Ultimate, 5 = Mega; fractions blend two neighbours, so the next
   * stage trickles in near the end of a season before it takes over.
   *   Spring (0-6 min)    Baby and In-Training, Rookies trickle in at the very end
   *   Summer (6-12)       In-Training (some Babies), more and more Rookies, Champions near the end
   *   Fall (12-18)        Rookies, more and more Champions, Ultimates near the end
   *   Winter (18-24)      Champions giving way to Ultimates
   *   Years 2-3           Ultimates with Champions; Megas only as rare field Megas
   *   Year 4 on (72 min+) Megas join the regular field
   * The partner used to cap it (never more than 2.5 tiers above); with PACING.followPartner false the clock alone decides. */
  var TIER_KEYS = [[0, 0], [2.5, 0.5], [5.2, 1.0], [6, 1.12], [9, 1.6], [11.2, 2.0], [12, 2.12], [15, 2.6], [17.2, 3.0], [18, 3.12], [21, 3.6], [24, 4.0], [72, 4.0], [80, 4.5], [90, 5.0]];
  var PARTNER_LEAD = 2.5;
  /* How busy the field is: spawns per second and the on-screen cap. Fewer
   * enemies than a typical bullet heaven, each one a real fight. Seasons
   * (seasons.js) and co-op multiply on top. */
  /* Nov 15 (later): the opening was too quiet. More arrive from the start
   * (the first six minutes), tapering into the same late game as before. */
  /* Nov 16: 30% more of them throughout (and each is weaker: data.js PACING.stageHp). */
  var FIELD = { rate0: 0.42, rate6: 0.68, ratePerMin: 0.039, rateMax: 1.95, cap0: 7, cap6: 10, capPerMin: 0.44, capMax: 34 };

  /* the opening minutes are busier (data.js PACING): full strength until
   * openUntil, easing back to normal over openFade */
  function openBoost(sec, key) {
    var P = D.PACING, k;
    if (!P) return key === "openRate" ? 1 : 0;
    k = sec <= P.openUntil ? 1 : Math.max(0, 1 - (sec - P.openUntil) / (P.openFade || 1));
    return key === "openRate" ? 1 + (P.openRate - 1) * k : P.openCap * k;
  }
  /* ...and its enemies go down sooner, so the first minutes are more fights of less each */
  function openHp(sec) {
    var P = D.PACING, k;
    if (!P || !P.openHp) return 1;
    k = sec <= P.openUntil ? 1 : Math.max(0, 1 - (sec - P.openUntil) / (P.openFade || 1));
    return 1 + (P.openHp - 1) * k;
  }
  function timeTier(t) {
    var m = Math.max(0, t || 0) / 60, i, a, b;
    for (i = 1; i < TIER_KEYS.length; i++) {
      a = TIER_KEYS[i - 1]; b = TIER_KEYS[i];
      if (m <= b[0]) return a[1] + (b[1] - a[1]) * (m - a[0]) / (b[0] - a[0]);
    }
    return TIER_KEYS[TIER_KEYS.length - 1][1];
  }
  function tierFor(t, stageIdx) {
    var lead = (D.PACING && D.PACING.followPartner === false) ? 99 : PARTNER_LEAD;   /* Nov 16: the clock alone decides */
    return Math.max(0, Math.min(POOL.length - 1, Math.min(timeTier(t), (stageIdx | 0) + lead)));
  }

  function mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function tree() { return D.EVO_TREE || global.EVO_TREE || null; }

  function partnerStageIdx(form) {
    var T = tree();
    var sp = T && T.species && T.species[form];
    var st = sp ? sp.stage : (D.SPECIES && D.SPECIES[form] && D.SPECIES[form].stage);
    if (!st && D.SPECIES && D.SPECIES[form] && D.SPECIES[form].hatchTo) return 0;
    var idx = STAGE_IDX[st];
    return idx == null ? 2 : idx;
  }

  function pool(stageName, role, rnd, used, count) {
    var T = tree();
    var src = (T && T.enemies && T.enemies[stageName]) || [];
    var list = src.filter(function (e) {
      if (used[e.id]) return false;
      if (role && e.role !== role) return false;
      return !!(D.ENEMIES && D.ENEMIES[e.id]);
    });
    if (!list.length && role) return pool(stageName, null, rnd, used, count);
    var i, j, tmp, out = [];
    for (i = list.length - 1; i > 0; i--) {
      j = Math.floor(rnd() * (i + 1));
      tmp = list[i]; list[i] = list[j]; list[j] = tmp;
    }
    for (i = 0; i < list.length && out.length < count; i++) {
      used[list[i].id] = true;
      out.push(list[i].id);
    }
    return out;
  }

  /* Three species of the main stage, two of the next, one of the stage
   * below; fixed per run seed so the cast does not reshuffle mid-fight. */
  var cache = {};
  function castFor(stage, seed) {
    var key = stage + ":" + (seed >>> 0);
    if (cache[key]) return cache[key];
    var rnd = mulberry(((seed >>> 0) || 1) * 31 + stage * 7919);
    var used = {};
    var out = { main: pool(POOL[stage], null, rnd, used, 3) };
    out.next = stage + 1 < POOL.length ? pool(POOL[stage + 1], null, rnd, used, 2) : [];
    out.below = stage > 0 ? pool(POOL[stage - 1], null, rnd, used, 1) : [];
    cache[key] = out;
    return out;
  }

  /* Baby swarms. On top of the run's normal cast, little packs of Baby
   * Digimon keep drifting in all run long: a few kinds at a time (a new
   * set each minute, so every Baby turns up sooner or later), more kinds
   * and more of them the longer the run goes. They stay as weak as Babies
   * are, and they do not take up room in the normal enemy limit, so they
   * are fodder for the egg counters rather than a threat. */
  var SWARM = { startAt: 45, rate0: 0.12, ratePerMin: 0.02, rateMax: 0.9, kinds0: 2, kindEvery: 6, kindsMax: 5, cap0: 3, capPerMin: 0.5, capMax: 18 };
  var babyList = null;
  function babyKinds() {
    if (babyList) return babyList;
    var T = tree(), src = (T && T.enemies && T.enemies[POOL[0]]) || [], out = [], i;
    for (i = 0; i < src.length; i++) if (D.ENEMIES && D.ENEMIES[src[i].id] && !D.ENEMIES[src[i].id].boss) out.push(src[i].id);
    if (out.length) babyList = out;
    return out;
  }
  function babySwarm(t, seed) {
    var babies = babyKinds(), m = t / 60, out = { rates: {}, cap: 0 };
    if (!babies.length || t < SWARM.startAt) return out;
    var n = Math.min(SWARM.kindsMax, babies.length, SWARM.kinds0 + Math.floor(m / SWARM.kindEvery));
    var rnd = mulberry(((seed >>> 0) || 1) * 131 + Math.floor(m) * 977), list = babies.slice(), i, j, tmp;
    for (i = list.length - 1; i > 0; i--) { j = Math.floor(rnd() * (i + 1)); tmp = list[i]; list[i] = list[j]; list[j] = tmp; }
    var perSec = Math.min(SWARM.rateMax, SWARM.rate0 + SWARM.ratePerMin * m);
    for (i = 0; i < n; i++) out.rates[list[i]] = n / perSec;
    out.cap = Math.round(Math.min(SWARM.capMax, SWARM.cap0 + SWARM.capPerMin * m));
    return out;
  }

  function fieldRate(t) {
    var m = t / 60;
    var r = m <= 6 ? FIELD.rate0 + (FIELD.rate6 - FIELD.rate0) * (m / 6) : FIELD.rate6 + FIELD.ratePerMin * (m - 6);
    return Math.min(FIELD.rateMax, r * openBoost(m * 60, "openRate"));
  }
  function fieldCap(t) {
    var m = t / 60;
    var c = m <= 6 ? FIELD.cap0 + (FIELD.cap6 - FIELD.cap0) * (m / 6) : FIELD.cap6 + FIELD.capPerMin * (m - 6);
    return Math.round(Math.min(FIELD.capMax, c + openBoost(m * 60, "openCap")));
  }

  function tempo(t) {
    /* 0..1 over the first ten minutes, then keeps creeping. */
    return Math.min(1, t / 600) + Math.max(0, (t - 600) / 3600);
  }

  function stageWave(time, stageIdx, seed) {
    var t = Math.max(0, time || 0);
    var tier = tierFor(t, stageIdx);
    var stage = Math.min(POOL.length - 1, Math.floor(tier + 1e-6));
    var frac = tier - stage;
    var cast = castFor(stage, seed);
    var wNext = cast.next.length && frac >= 0.06 ? frac : 0;
    var wBelow = cast.below.length ? ((D.PACING && D.PACING.belowShare) || 0.2) : 0;
    var wMain = 1 - wNext;
    var total = wMain + wNext + wBelow;
    var R = fieldRate(t);
    var rates = {};
    function add(ids, w) {
      var k;
      if (!ids.length || w <= 0) return;
      for (k = 0; k < ids.length; k++) rates[ids[k]] = ids.length / (R * (w / total));
    }
    add(cast.main, wMain); add(cast.next, wNext); add(cast.below, wBelow);
    if (!Object.keys(rates).length) rates.pagumon = 1 / R;
    return {
      rates: rates,
      fodder: babySwarm(t, seed),
      cap: fieldCap(t),
      hpMul: (1 + 0.4 * tempo(t)) * openHp(t),
      dmgMul: 1 + 0.25 * tempo(t),
      spdMul: 1,
      stageIdx: stageIdx,
      tier: tier
    };
  }

  /* Bosses come from one stage above what the field is mostly made of. */
  function stageBoss(stageIdx, seed, n, time) {
    var T = tree();
    var tier = time == null ? (stageIdx | 0) : tierFor(time, stageIdx);
    /* no Mega bosses during the three rare-Mega years */
    var megaCfg = D.MEGA_SPAWN || {};
    var top = (time != null && megaCfg.rareUntil != null && time < megaCfg.rareUntil) ? POOL.length - 2 : POOL.length - 1;
    var target = POOL[Math.min(top, Math.floor(tier + 1e-6) + 1)];
    var src = ((T && T.enemies && T.enemies[target]) || []).filter(function (e) { return D.ENEMIES && D.ENEMIES[e.id]; });
    if (!src.length) return (D.BOSSES && D.BOSSES.type) || "kuwagamon";
    var rnd = mulberry(((seed >>> 0) || 1) + (n | 0) * 9973 + (stageIdx | 0) * 131);
    return src[Math.floor(rnd() * src.length)].id;
  }

  /* Field Megas only once the partner is at least a Champion. */
  var MEGA_MIN_STAGE = 3;

  D.STAGE_TIERS = TIER_KEYS;
  D.STAGE_FIELD = FIELD;
  D.stageTier = tierFor;
  D.partnerStageIdx = partnerStageIdx;
  D.stageWave = stageWave;
  D.stageBoss = stageBoss;
  D.MEGA_MIN_STAGE = MEGA_MIN_STAGE;
  if (typeof module !== "undefined" && module.exports) module.exports = { stageWave: stageWave, stageBoss: stageBoss, partnerStageIdx: partnerStageIdx };
})(typeof window !== "undefined" ? window : globalThis);
