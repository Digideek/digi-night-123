/* Stat system (Nov 16): the classic Ragnarok Online (pre-Renewal) rules.
 *
 *   Base level  = the tamer (ghost). Slow. Gives status points.
 *   Job level   = the Digimon. Gives moves, and bonus stats as it digivolves.
 *
 * Status points
 *   A new tamer has every stat at 1 and no points: the first ones come with the first base level.
 *   Going from base level L to L+1 gives floor(L / 5) + 3 points.
 *   Raising a stat from x to x+1 costs floor((x - 1) / 10) + 2 points
 *   (2 each up to 11, 3 each up to 21 ... 11 each in the 90s). Cap 99.
 *
 * What the stats do (s = stat + job bonus, Lv = base level)
 *   STR  status ATK = STR + floor(STR/10)^2 + floor(DEX/5) + floor(LUK/5)
 *        -> physical moves (claws, bites, headbutts)
 *   INT  MATK = INT + floor(INT/7)^2 (min) .. INT + floor(INT/5)^2 (max)
 *        -> special moves (shots, auras, orbs, blasts). There is no SP;
 *        instead INT is the cast speed for special moves, with DEX
 *        helping as it does for casting: delay x (1 - INT/250 - DEX/300)
 *   AGI  Flee = Lv + AGI; physical attack delay x (1 - AGI/250 - DEX/1000)
 *   DEX  Hit = Lv + DEX; a little ATK and attack speed (above)
 *   VIT  Max HP x (1 + VIT/100); soft DEF takes a flat bite out of each hit
 *   LUK  Crit % = 1 + LUK * 0.3 (crits ignore Flee, +40% damage);
 *        Perfect Dodge % = 1 + LUK / 10; a little ATK
 *
 *   Chance to hit % = 80 + attacker Hit - defender Flee, kept within 5..100
 *   (5..95 for enemies hitting the partner).
 *
 * How the numbers meet this game's damage: ATK and MATK are turned into a
 * multiplier on move damage (ATK_SCALE / MATK_SCALE below), since moves have
 * their own base damage instead of weapons. Since Nov 16 the scales are 20 and
 * 30 (were 100 and 160): a build with its points spent hits about 1.3x at
 * base level 8, 1.7x at 13, 2.2x at 18 and 4x at 35, and enemy health grows
 * to match (data.js PACING.buildHp). Unspent points leave you far behind.
 *
 * Farm training (17z33) adds free bonus points too, one for every FARM.per of a training stat:
 * Offense -> STR and DEX, Intelligence -> INT and LUK, Agility -> AGI, Bond -> VIT.
 *
 * Growth: every base level also adds one stat point by itself, in a fixed
 * six-level pattern that follows the Digimon's element (levelBonus below).
 * It is a hair, about a seventh of what the level's status points can buy.
 */
(function (root) {
  "use strict";
  var ORDER = ["str", "agi", "vit", "int", "dex", "luk"];
  var NAMES = { str: "STR", agi: "AGI", vit: "VIT", int: "INT", dex: "DEX", luk: "LUK" };
  var TEXT = {
    str: "Physical move damage (claws, bites)",
    agi: "Flee (dodging) and physical attack speed",
    vit: "Max HP and defence",
    int: "Special move damage and cast speed",
    dex: "Hit (accuracy), cast speed, a little damage",
    luk: "Critical hits, lucky dodges, lucky digivolutions"
  };
  var CFG = { start: 1, startPoints: 0, cap: 99, ATK_SCALE: 20, MATK_SCALE: 30, SOFT_DEF: 0.12, CRIT_MUL: 1.4, MIN_DELAY: 0.45 };

  function fl(x) { return Math.floor(x); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function fresh() { return { str: CFG.start, agi: CFG.start, vit: CFG.start, int: CFG.start, dex: CFG.start, luk: CFG.start }; }
  /* points to raise a stat that is currently x */
  function cost(x) { return fl((x - 1) / 10) + 2; }
  /* points gained on reaching the level after L */
  function pointsFor(L) { return fl(L / 5) + 3; }

  /* everything derived from the six stats (already including job bonus) and the base level */
  function derive(s, lv) {
    s = s || fresh(); lv = lv || 1;
    var atk = s.str + Math.pow(fl(s.str / 10), 2) + fl(s.dex / 5) + fl(s.luk / 5);
    var matkMin = s.int + Math.pow(fl(s.int / 7), 2), matkMax = s.int + Math.pow(fl(s.int / 5), 2);
    return {
      atk: atk, matkMin: matkMin, matkMax: matkMax,
      physMul: 1 + atk / CFG.ATK_SCALE,
      specMul: 1 + ((matkMin + matkMax) / 2) / CFG.MATK_SCALE,
      hit: lv + s.dex,
      flee: lv + s.agi,
      delayMul: Math.max(CFG.MIN_DELAY, 1 - s.agi / 250 - s.dex / 1000),     /* physical moves */
      castMul: Math.max(CFG.MIN_DELAY, 1 - s.int / 250 - s.dex / 300),        /* special moves */
      hpMul: 1 + s.vit / 100,
      softDef: s.vit * CFG.SOFT_DEF,
      crit: 1 + s.luk * 0.3,
      perfectDodge: 1 + s.luk / 10,
      critMul: CFG.CRIT_MUL
    };
  }
  /* percent chance an attack lands */
  function hitChance(hit, flee, max) { return clamp(80 + hit - flee, 5, max || 100); }

  /* Job bonus: stats the Digimon brings by itself, growing each time it
   * digivolves. Which stat it favours follows its element. */
  var FAVOURS = { fire: "str", beast: "str", machine: "dex", wind: "agi", ice: "int", water: "int", dark: "int", holy: "int", nature: "vit", slime: "vit", bubble: "vit" };
  /* what goes with the favoured stat: a brawler needs speed, a caster needs aim, and so on */
  var SECOND = { str: "agi", int: "dex", dex: "str", agi: "str", vit: "str" };
  /* Growth by base level: +1 to one stat each level from 2 on, in the order
   * favoured, VIT, second, DEX, favoured, LUK, then round again. */
  function levelBonus(baseLevel, family) {
    var b = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 }, fav = FAVOURS[family] || "str", cyc = [fav, "vit", SECOND[fav] || "dex", "dex", fav, "luk"], L;
    for (L = 2; L <= (baseLevel || 1); L++) b[cyc[(L - 2) % 6]] += 1;
    return b;
  }
  function jobBonus(evoCount, family, baseLevel) {
    var b = baseLevel ? levelBonus(baseLevel, family) : { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 }, n = Math.max(0, evoCount || 0);
    b[FAVOURS[family] || "str"] += n * 2;
    b.vit += n;
    b.luk += fl(n / 2);
    return b;
  }
  /* 17z33: the farm's share of the green bonus */
  var FARM = { per: 10, map: { offense: ["str", "dex"], intelligence: ["int", "luk"], agility: ["agi"], bond: ["vit"] } };
  function farmBonus(trainStats, bondTrain) {
    var b = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 }, k, n, i, ts = trainStats || {};
    for (k in FARM.map) {
      n = fl(((k === "bond" ? bondTrain : ts[k]) || 0) / FARM.per);
      for (i = 0; i < FARM.map[k].length; i++) b[FARM.map[k][i]] += n;
    }
    return b;
  }
  function plus(a, b) {
    var o = {}, i, k;
    for (i = 0; i < ORDER.length; i++) { k = ORDER[i]; o[k] = ((a && a[k]) || 0) + ((b && b[k]) || 0); }
    return o;
  }

  var api = { ORDER: ORDER, NAMES: NAMES, TEXT: TEXT, CFG: CFG, fresh: fresh, cost: cost, pointsFor: pointsFor, derive: derive, hitChance: hitChance, jobBonus: jobBonus, levelBonus: levelBonus, plus: plus, farmBonus: farmBonus, FARM: FARM };
  if (root.DBH) root.DBH.RO = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
