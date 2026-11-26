/* Shop catalog, Bits economy, and capture chance helpers. Pure data + math. */
(function (global) {
  "use strict";
  var D = global.DBH || (global.DBH = {});

  var STAGE_BITS = {
    "Baby I": 2,
    "Baby II (In-Training)": 3,
    "Child (Rookie)": 5,
    "Adult (Champion)": 9,
    "Armor": 11,
    "Perfect (Ultimate)": 16,
    "Ultimate (Mega)": 24,
    "Ultimate (Mega+)": 32
  };

  var STAGE_INDEX = {
    "Baby I": 0,
    "Baby II (In-Training)": 1,
    "Child (Rookie)": 2,
    "Adult (Champion)": 3,
    "Armor": 3,
    "Perfect (Ultimate)": 4,
    "Ultimate (Mega)": 5,
    "Ultimate (Mega+)": 6,
    Egg: -1
  };

  D.BITS = {
    byStage: STAGE_BITS,
    jitter: 0.15,
    bossMul: 4,
    eliteMul: 2,
    magnet: true
  };

  D.SHOP = {
    firstAt: 38,
    every: 85,
    linger: 32,
    interactRadius: 72,
    merchantId: "jijimon",
    /* Field Jijimon height as a fraction of the 56px tamer. */
    merchantHeightRatio: 5 / 6,
    priceGrowth: 1.5,
    /* 17z33: Jijimon's stall, reworked. Always on the shelf: one food (at most perVisit a visit, so food
     * stays hard-won) and Sprint Boots. The rest is his stock for this visit: a few picks from POOL,
     * different every time (shopStock), each one to a visit. Fixed prices; only the boots climb. */
    categories: [
      { id: "all", name: "All" }
    ],
    always: ["meat1", "sprintBoots"],
    stockCount: 4,
    pool: [
      { pick: "ticket", w: 3 }, { pick: "seeds", w: 3 }, { pick: "gateKey", w: 2 }, { pick: "lure", w: 2 },
      { pick: "map", w: 2 }, { pick: "digimental", w: 1 }, { pick: "eraser", w: 1 }, { pick: "crest", w: 0.5 }
    ],
    catalog: [
      { id: "meat1", name: "Meat", desc: "One cut of meat for the farm bag. Jijimon only has three a visit.", base: 20, fixed: true, perVisit: 3, kind: "food", food: "meat", count: 1, icon: "meatPack", category: "food" },
      { id: "sprintBoots", name: "Sprint Boots", desc: "Your own run speed: +6% a level, up to level 5 (+30%). Your partner always keeps a step ahead of you. Lasts the run.", base: 30, kind: "upgrade", max: 5, icon: "sprintBoots", category: "battle" },
      { id: "ticket", name: "Training Ticket", desc: "A fresh training session at the farm, without beating 10 more wild Digimon for it.", base: 45, fixed: true, perVisit: 1, kind: "instant", icon: "ticket", category: "farm", pickOf: "ticket" },
      { id: "gateKey", name: "Gate Key", desc: "Opens a farm gate right where you stand, once. Use it from the bag (I) out in the world.", base: 40, fixed: true, perVisit: 1, kind: "consumable", use: "world", icon: "gateKey", category: "farm", pickOf: "gateKey" },
      { id: "lure", name: "Lure", desc: "Use it from the bag (I): a pack of the kind you're closest to catching comes running.", base: 55, fixed: true, perVisit: 1, kind: "consumable", use: "world", icon: "lure", category: "battle", pickOf: "lure" },
      { id: "map", name: "Treasure Map", desc: "Use it from the bag (I): the three nearest unbroken black spires show on your minimap for two minutes.", base: 35, fixed: true, perVisit: 1, kind: "consumable", use: "world", icon: "map", category: "battle", pickOf: "map" },
      { id: "eraser", name: "Care Reset", desc: "Clears one care mistake from this run. Use it from the bag at the farm.", base: 40, fixed: true, perVisit: 1, kind: "consumable", use: "farm", icon: "eraser", category: "care", pickOf: "eraser" },
      { id: "crest", name: "Crest of Courage", desc: "Enables a warp digivolution even without a boss.", base: 160, fixed: true, perVisit: 1, kind: "key", item: "crest", icon: "crest", category: "evo", pickOf: "crest" }
    ]
  };

  D.CAPTURE = {
    hpThreshold: 0.25,
    range: 92,
    reserveMax: 3,
    bankMax: 12,
    /* Tunable KO charge needed to attempt a capture of that stage. Mega/Mega+ match Rookie; rarity is in spawns. */
    /* Catching (Nov 16). Defeat this many of ONE kind of Digimon in a run and
     * you may try to catch that kind: a flat `chance`, no item, no need to
     * weaken it first. Either way the count for that kind starts again. */
    /* 17z33 (Isaac: "make catching even harder, even more rare"): 6% (was 10%), half as many defeats again.
     * And you no longer throw at a living one: once a kind is ready, the next of it you defeat lies where it
     * fell for `waitSec`, for you alone. Walk up and press E: one try. Fail and it fades. (progression.js) */
    chance: 0.06,
    waitSec: 20,
    koByStage: {
      BabyI: 30, "Baby I": 30, Baby: 30,
      BabyII: 38, "Baby II": 38, "In-Training": 38,
      Rookie: 45,
      Champion: 53,
      Armor: 53, Hybrid: 53,
      Ultimate: 60,
      Mega: 68, MegaPlus: 75, "Mega+": 75
    },
    hudSteps: [
      { need: 15, label: "Baby", toast: "Baby captures ready!" },
      { need: 25, label: "In-Tr", toast: "In-Training captures ready!" },
      { need: 40, label: "Rookie/Mega", toast: "Rookie and Mega captures ready!" },
      { need: 70, label: "Champion", toast: "Champion captures ready!" },
      { need: 90, label: "Armor", toast: "Armor captures ready!" },
      { need: 120, label: "Ultimate", toast: "Ultimate captures ready!" }
    ],
    allyDmg: 0.7,
    allyCd: 1.2,
    allyHpMul: 0.85,
    allyLeash: 70,
    allyComfort: 44,
    atkBoostTime: 20,
    atkBoostMul: 1.35,
    medicineHeal: 0.5,
    toyJoy: 30
  };

  /* 17z33: seed packets (pick the vegetable you want) and the Digimentals (each opens one armor
   * digivolution; the tree's generic "digimental" condition is narrowed to the right one by
   * applyDigimentals) join the catalogue */
  var SEED_LIST = ["carrot", "cucumber", "tomato", "corn", "cabbage", "potato"];
  SEED_LIST.forEach(function (c) {
    D.SHOP.catalog.push({ id: "seeds_" + c, name: c.charAt(0).toUpperCase() + c.slice(1) + " Seeds", desc: "Two " + c + " seeds to plant at the farm. " + (c === "carrot" ? "Carrots: partner speed." : c === "cucumber" ? "Cucumbers: attack rate." : c === "tomato" ? "Tomatoes: damage." : c === "corn" ? "Corn: pickup range." : c === "cabbage" ? "Cabbage: defence." : "Potatoes: max health."), base: 25, fixed: true, perVisit: 1, kind: "seed", seed: "seed_" + c, count: 2, icon: "seed_" + c, category: "farm", pickOf: "seeds" });
  });
  var DIGIMENTALS = {
    dm_courage:   { name: "Digimental of Courage", to: ["flamedramon"], from: "Veemon" },
    dm_miracles:  { name: "Digimental of Miracles", to: ["magnamon"], from: "Veemon or Gold Guardromon" },
    dm_light:     { name: "Digimental of Light", to: ["nefertimon"], from: "Gatomon" },
    dm_knowledge: { name: "Digimental of Knowledge", to: ["digmon"], from: "Armadillomon" },
    dm_love:      { name: "Digimental of Love", to: ["halsemon"], from: "Hawkmon" },
    dm_hope:      { name: "Digimental of Hope", to: ["pegasusmon"], from: "Patamon" }
  };
  Object.keys(DIGIMENTALS).forEach(function (id) {
    var d = DIGIMENTALS[id];
    D.SHOP.catalog.push({ id: id, name: d.name, desc: "Opens one armor digivolution for the run: " + d.from + " into " + d.to.map(function (t) { return t.charAt(0).toUpperCase() + t.slice(1); }).join(" / ") + " (it still has to be ready for it).", base: 180, fixed: true, perVisit: 1, kind: "key", item: id, icon: id, category: "evo", pickOf: "digimental" });
  });
  /* the tree's armor routes all ask for "digimental": give each the one that opens it */
  function applyDigimentals(tree) {
    var by = {}, k, f, i, b, list;
    if (!tree || !tree.branches || tree._dmApplied) return tree;
    for (k in DIGIMENTALS) DIGIMENTALS[k].to.forEach(function (t) { by[t] = k; });
    for (f in tree.branches) { list = tree.branches[f] || []; for (i = 0; i < list.length; i++) { b = list[i]; if (b && b.conditions && b.conditions.item === "digimental" && by[b.to]) b.conditions.item = by[b.to]; } }
    tree._dmApplied = true;
    return tree;
  }
  if (typeof EVO_TREE !== "undefined") applyDigimentals(EVO_TREE);
  if (D.EVO_TREE) applyDigimentals(D.EVO_TREE);

  /* which visit this is: a farm visit, or one of Jijimon's rounds out in the world */
  function shopKey(sim) {
    if (!sim) return "none";
    if (sim.farm && sim.farm.active) return "f" + Math.round((sim.farm.since || 0) * 10);
    if (sim.merchant) return "m" + Math.round((sim.merchant.visit || 0) * 10);
    return "none";
  }
  function h32(str) { var h = 2166136261, i; str = String(str); for (i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  /* what Jijimon has this visit: the shelf, then stockCount picks from the pool (one of each kind),
   * seeded by the visit and the tamer, so everyone sees the same thing for the same visit */
  function shopStock(key, who) {
    var S = D.SHOP, out = (S.always || []).slice(), pool = (S.pool || []).slice(), n = S.stockCount || 4, k = 0, tot, r, i, p, opts, seed = h32(key + "|" + (who || ""));
    function rnd() { seed = (Math.imul(seed ^ (seed >>> 15), 2246822519) + 0x9e3779b9) >>> 0; return seed / 4294967296; }
    while (k < n && pool.length) {
      tot = 0; for (i = 0; i < pool.length; i++) tot += pool[i].w;
      r = rnd() * tot; for (i = 0; i < pool.length; i++) { r -= pool[i].w; if (r <= 0) break; }
      p = pool.splice(Math.min(i, pool.length - 1), 1)[0];
      opts = S.catalog.filter(function (c) { return c.pickOf === p.pick; });
      if (opts.length) { out.push(opts[Math.floor(rnd() * opts.length) % opts.length].id); k++; }
    }
    return out;
  }
  /* how many of it you can still buy this visit (null: no limit) */
  function shopLeft(item, visit, key) {
    if (!item || !item.perVisit) return null;
    var got = (visit && visit.key === key && visit.n && visit.n[item.id]) || 0;
    return Math.max(0, item.perVisit - got);
  }

  function shopItem(id) {
    var i, c = D.SHOP.catalog;
    for (i = 0; i < c.length; i++) if (c[i].id === id) return c[i];
    return null;
  }

  function shopPrice(id, timesBought) {
    var item = shopItem(id);
    if (!item) return 0;
    if (item.fixed) return item.base;
    var n = Math.max(0, timesBought || 0);
    var grown = Math.round(item.base * Math.pow(D.SHOP.priceGrowth, n));
    return Math.max(item.base + n, grown);
  }

  function bitsForEnemy(def) {
    if (!def) return 1;
    var stage = def.stageDisplay || def.stage || "Child (Rookie)";
    var base = STAGE_BITS[stage] || STAGE_BITS[def.stage] || 5;
    if (def.boss) base = Math.round(base * D.BITS.bossMul);
    else if (def.elite) base = Math.round(base * D.BITS.eliteMul);
    var j = D.BITS.jitter || 0;
    var amt = Math.round(base * (1 - j + Math.random() * j * 2));
    return Math.max(1, amt);
  }

  function stageIndexOf(id) {
    var sp = D.SPECIES && D.SPECIES[id];
    var key = (sp && (sp.stageDisplay || sp.stage)) || "";
    if (STAGE_INDEX[key] != null) return STAGE_INDEX[key];
    if (D.stageKeyOf) {
      var sk = D.stageKeyOf(id);
      if (STAGE_INDEX[sk] != null) return STAGE_INDEX[sk];
    }
    return 2;
  }


  var STAGE_ALIASES = {
    "Baby I": "Baby I", BabyI: "Baby I", Baby: "Baby I",
    "Baby II": "Baby II", BabyII: "Baby II", "In-Training": "Baby II", "Baby II (In-Training)": "Baby II",
    Rookie: "Rookie", "Child (Rookie)": "Rookie",
    Champion: "Champion", "Adult (Champion)": "Champion",
    Armor: "Armor", Hybrid: "Armor",
    Ultimate: "Ultimate", "Perfect (Ultimate)": "Ultimate",
    Mega: "Mega", "Ultimate (Mega)": "Mega",
    "Mega+": "Mega+", MegaPlus: "Mega+", "Ultimate (Mega+)": "Mega+",
    Egg: "Baby I"
  };

  function captureStageKey(idOrEnemy) {
    var id = idOrEnemy;
    if (idOrEnemy && typeof idOrEnemy === "object") id = idOrEnemy.type || idOrEnemy.id || idOrEnemy.form;
    if (!id) return "Rookie";
    var sp = (D.SPECIES && D.SPECIES[id]) || {};
    var en = (D.ENEMIES && D.ENEMIES[id]) || {};
    var raw = sp.stageKey || (D.stageKeyOf && D.stageKeyOf(id)) || sp.stage || en.stageDisplay || en.stage || "";
    if (STAGE_ALIASES[raw]) return STAGE_ALIASES[raw];
    if (typeof raw === "string") {
      var low = raw.toLowerCase();
      if (low.indexOf("baby ii") >= 0 || low.indexOf("in-training") >= 0 || low.indexOf("in training") >= 0) return "Baby II";
      if (low.indexOf("baby") >= 0) return "Baby I";
      if (low.indexOf("rookie") >= 0 || low.indexOf("child") >= 0) return "Rookie";
      if (low.indexOf("champion") >= 0 || low.indexOf("adult") >= 0) return "Champion";
      if (low.indexOf("armor") >= 0 || low.indexOf("hybrid") >= 0) return "Armor";
      if (low.indexOf("mega+") >= 0 || low.indexOf("mega +") >= 0 || low.indexOf("mega plus") >= 0) return "Mega+";
      if (low.indexOf("mega") >= 0) return "Mega";
      if (low.indexOf("ultimate") >= 0 || low.indexOf("perfect") >= 0) return "Ultimate";
    }
    return "Rookie";
  }

  function captureKoNeeded(idOrEnemy) {
    var key = captureStageKey(idOrEnemy);
    var table = D.CAPTURE.koByStage || {};
    if (table[key] != null) return table[key];
    var compact = String(key).replace(/\s+/g, "");
    if (table[compact] != null) return table[compact];
    return table.Rookie || 40;
  }

  function captureHudText(kills) {
    kills = Math.max(0, kills || 0);
    var steps = D.CAPTURE.hudSteps || [];
    var parts = [];
    var i, s, next = null;
    for (i = 0; i < steps.length; i++) {
      s = steps[i];
      if (kills >= s.need) parts.push(s.label + " ✓");
      else { next = s; break; }
    }
    if (next) parts.push(next.label + " " + kills + "/" + next.need);
    else if (steps.length) parts.push("All ready");
    return "Capture " + kills + " KOs: " + parts.join(" ");
  }

  function captureThresholdCrossed(prev, now) {
    var steps = D.CAPTURE.hudSteps || [];
    var i, hit = null;
    for (i = 0; i < steps.length; i++) {
      if ((prev || 0) < steps[i].need && now >= steps[i].need) hit = steps[i];
    }
    return hit;
  }
  function captureChance(enemy, run) {
    if (!enemy || !run) return 0;
    var def = D.ENEMIES && D.ENEMIES[enemy.type];
    if (def && def.boss && !(enemy && enemy.mega)) return 0;
    return D.CAPTURE.chance != null ? D.CAPTURE.chance : 0.1;
  }

  function hasItem(stats, id) {
    var list = (stats && stats.items) || [];
    var i;
    for (i = 0; i < list.length; i++) if (list[i] === id) return true;
    return false;
  }

  D.shopItem = shopItem;
  D.shopStock = shopStock;
  D.shopKey = shopKey;
  D.shopLeft = shopLeft;
  D.applyDigimentals = applyDigimentals;
  D.DIGIMENTALS = DIGIMENTALS;
  D.shopPrice = shopPrice;
  D.bitsForEnemy = bitsForEnemy;
  D.captureChance = captureChance;
  D.captureStageKey = captureStageKey;
  D.captureKoNeeded = captureKoNeeded;
  D.captureHudText = captureHudText;
  D.captureThresholdCrossed = captureThresholdCrossed;
  D.stageIndexOf = stageIndexOf;
  D.hasEvoItem = hasItem;
})(window);
