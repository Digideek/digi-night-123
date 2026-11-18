/* Digimon Bullet Heaven — hard evolution + diet routes (Nov 13).
 *
 * 1. Stage gates. Every evolution OUT of a stage needs a minimum battle
 *    time spent in the current form AND a minimum level, on top of the
 *    branch's own (secret) requirements. Baby: 2 min, In-Training: 5 min,
 *    and it keeps climbing. Farm visits and brawls do not count.
 * 2. Diet conditions. Branch conditions may use:
 *      minVeg, minVegRatio, maxVegRatio, mostVeg (id or [ids]), balanced.
 *    Read from stats.foodCounts via DBH.dietOf.
 * 3. Vegetable routes. Hidden "special" branches into the plant lines
 *    (Budmon, Palmon / Lalamon / Mushroomon, Togemon / Woodmon / RedVegiemon
 *    / Yakiimon / Sunflowmon, Jagamon / Cherrymon) unlock from what the
 *    partner has eaten. Nothing here is ever shown to the player.
 *
 * Load order: after evolution-tree.js, species-catalog.js, rarity.js and
 * evo-stat-gates.js, so this wrapper sits outermost.
 */
(function (global) {
  "use strict";

  var D = global.DBH = global.DBH || {};
  var TREE = D.EVO_TREE || global.EVO_TREE || null;

  var STAGE_GATES = {
    "Baby I":   { minFormTime: 120,  minLevel: 3 },   /* was 3 min / level 4 */
    "Baby II":  { minFormTime: 300,  minLevel: 8 },
    "Rookie":   { minFormTime: 480,  minLevel: 14 },
    "Armor":    { minFormTime: 600,  minLevel: 18 },
    "Champion": { minFormTime: 720,  minLevel: 20 },
    "Ultimate": { minFormTime: 900,  minLevel: 28 },
    "Mega":     { minFormTime: 1200, minLevel: 36 },
    "Mega+":    { minFormTime: 1500, minLevel: 45 }
  };

  function stageOf(id) {
    var sp = TREE && TREE.species && TREE.species[id];
    return sp ? sp.stage : null;
  }

  function gateFor(fromId) {
    return STAGE_GATES[stageOf(fromId)] || null;
  }

  function dietConditionsMet(cond, stats) {
    if (!cond) return true;
    if (cond.minVeg == null && cond.minVegRatio == null && cond.maxVegRatio == null && !cond.mostVeg && cond.balanced == null) return true;
    var diet = D.dietOf ? D.dietOf(stats.foodCounts) : { veg: 0, vegRatio: 0, mostVeg: null, balanced: false };
    if (cond.minVeg != null && diet.veg < cond.minVeg) return false;
    if (cond.minVegRatio != null && diet.vegRatio < cond.minVegRatio) return false;
    if (cond.maxVegRatio != null && diet.vegRatio > cond.maxVegRatio) return false;
    if (cond.balanced != null && !!diet.balanced !== !!cond.balanced) return false;
    if (cond.mostVeg) {
      var want = typeof cond.mostVeg === "string" ? [cond.mostVeg] : cond.mostVeg;
      if (!diet.mostVeg || want.indexOf(diet.mostVeg) < 0) return false;
    }
    return true;
  }

  function stageGateMet(stats) {
    if (!stats || stats.ignoreStageGate) return true;
    var g = STAGE_GATES[stats._fromStage];
    if (!g) return true;
    if ((stats.level || 0) < g.minLevel) return false;
    /* Older callers that do not track time in form are not blocked by time. */
    if (stats.formTime != null && stats.formTime < g.minFormTime) return false;
    return true;
  }

  var inner = null;
  function conditionsMetWrapped(cond, stats) {
    stats = stats || {};
    if (!stageGateMet(stats)) return false;
    if (!dietConditionsMet(cond, stats)) return false;
    /* held-back routes: only for a partner that was told "not yet" in this form */
    if (cond && cond.minHolds != null && (stats.formHolds || 0) < cond.minHolds) return false;
    return inner ? inner(cond, stats) : true;
  }

  /* ---------- Vegetable routes ---------- */
  function standardOf(fromId) {
    var list = (TREE.branches[fromId] || []), i, best = null;
    for (i = 0; i < list.length; i++) {
      if (list[i].kind === "standard" && (!best || list[i].existingGate)) best = list[i];
    }
    return best || list[0] || null;
  }
  function baseConds(fromId) {
    var std = standardOf(fromId), c = (std && std.conditions) || {}, out = {}, k;
    var keep = ["minLevel", "minFood", "minHappiness", "minHpRatio"];
    for (k = 0; k < keep.length; k++) if (c[keep[k]] != null) out[keep[k]] = c[keep[k]];
    return out;
  }
  function addBranch(fromId, toId, extra, priority) {
    if (!TREE.species[fromId] || !TREE.species[toId] || fromId === toId) return false;
    var list = TREE.branches[fromId] = TREE.branches[fromId] || [];
    var i;
    for (i = 0; i < list.length; i++) if (list[i].to === toId && list[i].diet) return false;
    var cond = baseConds(fromId), k;
    for (k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) cond[k] = extra[k];
    list.push({
      from: fromId, to: toId, kind: "special", priority: priority || 62,
      conditions: cond, diet: true, secret: true,
      note: "diet route"
    });
    return true;
  }
  function idsAtStage(stage) {
    var out = [], id;
    for (id in TREE.species) if (Object.prototype.hasOwnProperty.call(TREE.species, id) && TREE.species[id].stage === stage) out.push(id);
    return out;
  }
  /* ---------- Held-back routes ----------
   * Secret, like the rest. A partner kept in its form past the first offer
   * can turn into something it otherwise never would. Checked ahead of the
   * ordinary special routes. */
  var HOLD_ROUTES = [
    ["koromon", "guilmon", 1], ["agumon", "growlmon", 1], ["gabumon", "leomon", 1],
    ["greymon", "garudamon", 1], ["garurumon", "wingdramon", 1], ["metalgreymon", "gallantmon", 2]
  ];
  function addHoldRoutes() {
    var i, r, list, n = 0;
    for (i = 0; i < HOLD_ROUTES.length; i++) {
      r = HOLD_ROUTES[i];
      if (!TREE.species[r[0]] || !TREE.species[r[1]]) continue;
      list = TREE.branches[r[0]] = TREE.branches[r[0]] || [];
      var cond = baseConds(r[0]);
      cond.minHolds = r[2];
      list.push({ from: r[0], to: r[1], kind: "special", priority: 66, conditions: cond, held: true, diet: true, secret: true, note: "held-back route" });   /* "diet" = checked with the other added routes */
      n += 1;
    }
    return n;
  }

  var PLANT_ROOKIE = { palmon: 1, lalamon: 1, mushroomon: 1 };
  var routesAdded = 0;
  function addDietRoutes() {
    var i, id;
    /* Baby I → Budmon: a baby raised mostly on garden vegetables. */
    var babies = idsAtStage("Baby I");
    for (i = 0; i < babies.length; i++) {
      routesAdded += addBranch(babies[i], "budmon", { minVeg: 2, minVegRatio: 0.5 }) ? 1 : 0;
    }
    /* Baby II → plant Rookies, by favorite vegetable. */
    var trainees = idsAtStage("Baby II");
    for (i = 0; i < trainees.length; i++) {
      id = trainees[i];
      routesAdded += addBranch(id, "palmon", { minVeg: 5, minVegRatio: 0.5, mostVeg: ["cabbage", "cucumber"] }) ? 1 : 0;
      routesAdded += addBranch(id, "lalamon", { minVeg: 5, minVegRatio: 0.5, mostVeg: ["carrot", "tomato"] }) ? 1 : 0;
      routesAdded += addBranch(id, "mushroomon", { minVeg: 5, minVegRatio: 0.5, mostVeg: ["potato", "corn"] }) ? 1 : 0;
    }
    /* Rookie → plant Champions. Plant Rookies need less of a push. */
    var rookies = idsAtStage("Rookie");
    var map = [["tomato", "redvegiemon"], ["potato", "yakiimon"], ["cucumber", "togemon"], ["cabbage", "woodmon"], ["carrot", "sunflowmon"], ["corn", "sunflowmon"]];
    for (i = 0; i < rookies.length; i++) {
      id = rookies[i];
      var plant = !!PLANT_ROOKIE[id];
      for (var m = 0; m < map.length; m++) {
        routesAdded += addBranch(id, map[m][1], {
          minVeg: plant ? 8 : 14,
          minVegRatio: plant ? 0.45 : 0.6,
          mostVeg: map[m][0]
        }) ? 1 : 0;
      }
    }
    /* Champion → Ultimate: potato-fed → Jagamon; a balanced, veg-loving
     * diet heavy on tomatoes or carrots → Cherrymon. */
    var champs = idsAtStage("Champion");
    for (i = 0; i < champs.length; i++) {
      id = champs[i];
      routesAdded += addBranch(id, "jagamon", { minVeg: 30, minVegRatio: 0.5, mostVeg: "potato" }) ? 1 : 0;
      routesAdded += addBranch(id, "cherrymon", { minVeg: 26, balanced: true, mostVeg: ["tomato", "carrot"] }, 61) ? 1 : 0;
    }
  }

  var installed = false;
  function install() {
    if (installed) return api;
    TREE = D.EVO_TREE || global.EVO_TREE || TREE;
    if (!TREE) return api;
    inner = TREE.conditionsMet;
    TREE.conditionsMet = conditionsMetWrapped;
    addDietRoutes();
    addHoldRoutes();
    if (D.pickEvolution && !D.pickEvolution._hard) {
      var orig = D.pickEvolution;
      var wrapped = function (fromId, stats) {
        var s = {}, k;
        stats = stats || {};
        for (k in stats) if (Object.prototype.hasOwnProperty.call(stats, k)) s[k] = stats[k];
        s._fromStage = stageOf(fromId);
        var picked = orig(fromId, s);
        /* The catalog's existing-gate preference does not know diet keys,
         * so check the diet routes directly. They outrank standard / food /
         * fallback picks but not warp, armor, fusion, mode or dark. */
        var list = (TREE.branches[fromId] || []), i, best = null;
        for (i = 0; i < list.length; i++) {
          if (!list[i].diet) continue;
          if (!TREE.conditionsMet(list[i].conditions, s)) continue;
          if (!best || (list[i].priority || 0) > (best.priority || 0)) best = list[i];
        }
        if (best && (!picked || (picked.priority || 0) <= (best.priority || 0))) return best;
        return picked;
      };
      wrapped._hard = true;
      D.pickEvolution = wrapped;
    }
    installed = true;
    return api;
  }

  var api = {
    STAGE_GATES: STAGE_GATES,
    gateFor: gateFor,
    stageOf: stageOf,
    dietConditionsMet: dietConditionsMet,
    install: install,
    get routesAdded() { return routesAdded; }
  };
  D.evoHard = api;
  install();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
