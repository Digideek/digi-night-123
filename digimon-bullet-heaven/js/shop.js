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
    categories: [
      { id: "all", name: "All" },
      { id: "food", name: "Food" },
      { id: "care", name: "Care" },
      { id: "battle", name: "Battle" },
      { id: "evo", name: "Evolution" }
    ],
    catalog: [
      { id: "meatPack", name: "Meat Pack", desc: "Three cuts of meat for the Digifarm bag. Feed them during a farm visit. Counts toward favorite food.", base: 12, kind: "food", food: "meat", count: 3, icon: "meatPack", category: "food" },
      { id: "fishPack", name: "Fish Pack", desc: "Three fish for the Digifarm bag. Feed them during a farm visit. Counts toward favorite food.", base: 14, kind: "food", food: "fish", count: 3, icon: "fishPack", category: "food" },
      { id: "berryPack", name: "Berry Pack", desc: "Three berries for the Digifarm bag. Feed them during a farm visit. Counts toward favorite food.", base: 14, kind: "food", food: "berry", count: 3, icon: "berryPack", category: "food" },
      { id: "medicine", name: "Restore Disk", desc: "Restores half of tamer and partner HP. Use on the Digifarm, not in battle.", base: 18, kind: "consumable", icon: "medicine", category: "care" },
      { id: "vitamin", name: "Power Vitamin", desc: "A farm supplement that boosts happiness and bond, steering evolution. Use on the Digifarm.", base: 16, kind: "consumable", icon: "vitamin", category: "care" },
      { id: "joyToy", name: "Training Ball", desc: "A bounce of joy for your partner. Use it on the Digifarm.", base: 16, kind: "consumable", icon: "joyToy", category: "care" },
      { id: "eraser", name: "Care Reset", desc: "Clears one care mistake from this run. Use on the Digifarm.", base: 22, kind: "consumable", icon: "eraser", category: "care" },
      { id: "atkBoost", name: "Power Chip", desc: "Attack +35% for 20 seconds into the next battle segment. Use on the Digifarm before you return.", base: 20, kind: "consumable", icon: "atkBoost", category: "care" },
      { id: "dataChip", name: "Data Chip", desc: "A keepsake now: catching no longer needs one. Defeat enough of one kind of Digimon this run and you can try to catch that kind (press E near one).", base: 25, kind: "consumable", icon: "dataChip", category: "battle" },
      { id: "digimental", name: "Digi-Egg of Courage", desc: "Unlocks official armor branches (Digimental) this run. Default gates stay the same.", base: 40, kind: "key", item: "digimental", icon: "digimental", category: "evo" },
      { id: "crest", name: "Crest of Courage", desc: "Enables a warp evolution even without a boss. Default warp gates still work without it.", base: 45, kind: "key", item: "crest", icon: "crest", category: "evo" }
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
    chance: 0.10,
    koByStage: {
      BabyI: 20, "Baby I": 20, Baby: 20,
      BabyII: 25, "Baby II": 25, "In-Training": 25,
      Rookie: 30,
      Champion: 35,
      Armor: 35, Hybrid: 35,
      Ultimate: 40,
      Mega: 45, MegaPlus: 50, "Mega+": 50
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

  function shopItem(id) {
    var i, c = D.SHOP.catalog;
    for (i = 0; i < c.length; i++) if (c[i].id === id) return c[i];
    return null;
  }

  function shopPrice(id, timesBought) {
    var item = shopItem(id);
    if (!item) return 0;
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
