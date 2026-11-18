/* Hidden 5-tier rarity / evolution layer.
 * Does not edit js/evolution-tree.js. Tiers are never shown to players.
 * Dev-only view: ?debug=1&tiers=1
 */
(function (global) {
  "use strict";

  var isNode = typeof module === "object" && module.exports;
  var D = (global.DBH = global.DBH || {});
  var TREE = isNode
    ? require("./evolution-tree.js")
    : (global.EVO_TREE || D.EVO_TREE);

  var TIER_NAMES = { 1: "Common", 2: "Uncommon", 3: "Rare", 4: "Epic", 5: "Legendary" };

  /* Small brawl edge for a later co-op mode. Not flattening: skilled lower-tier can still win. */
  var BRAWL = {
    1: { hpMul: 1.00, regen: 1.00, extraMove: 0 },
    2: { hpMul: 1.08, regen: 1.05, extraMove: 0 },
    3: { hpMul: 1.16, regen: 1.10, extraMove: 0 },
    4: { hpMul: 1.28, regen: 1.18, extraMove: 1 },
    5: { hpMul: 1.42, regen: 1.28, extraMove: 1 }
  };
  var BRAWL_EDGE = { 1: 0, 2: 0.08, 3: 0.16, 4: 0.24, 5: 0.32 };

  /* Pending Digifarm care (roadmap ids 14-17). The farm is not implemented here;
     game and a future intermission should call these hooks. */
  var FARM_CARE = {
    intervalMinutes: [3, 6, 10],
    intervalPlus: 4,
    pendingIds: {
      14: "farm intermission between battle segments",
      15: "item split (tamer inventory vs partner care items)",
      16: "dual input (tamer moves, partner care / aim)",
      17: "farm interval schedule 3/6/10 then +4 min; battle countdown becomes overtime"
    }
  };

  /* the day clock lives in js/day-clock.js, shared with net/rarity-sim.js and seasons.js */
  var CLOCK = D.dayClock || (isNode ? require("./day-clock.js") : null);
  var DAY_SECONDS = CLOCK.DAY_SECONDS, periodOfHour = CLOCK.periodOfHour, periodOfCycle = CLOCK.periodOfCycle;
  var MIRACLE_DURATION = 18;
  var TRIAL_DURATION = 14;
  var OMEN_DURATION = 22;
  var IGNORE_RADIUS = 220;

  var T3_MOODS = ["fierce", "proud", "focused"];
  var T3_TOD = [["dusk"], ["dawn"], ["night"], ["dawn", "dusk"], ["midday"]];
  var T4_MOODS = ["rapt", "devoted"];
  var T5_MOODS_REFUSE = ["stubborn", "sulky"];
  var DISTINCT_KEYS = [
    "mostFood", "maxFood", "maxHappiness", "minKillsAttribute", "minKillsSpecies",
    "item", "requiresPartner", "minFaints", "minCareMistakes", "minDesperationTime",
    "minBossesBeaten", "maxLevel", "maxHpRatio", "maxCareMistakes", "maxFaints"
  ];

  /* Hand-authored signatures. Everything else is derived from the tree. */
  var SPECIES_TIER_OVERRIDES = {
    botamon: 1, koromon: 1, punimon: 1, tsunomon: 1, bubbmon: 1, punimon: 1,
    agumon: 1, gabumon: 1, greymon: 1, garurumon: 1, numemon: 1, sukamon: 1,
    metalgreymon: 3,
    wargreymon: 4, metalgarurumon: 4,
    blackwargreymon: 5, apocalymon: 5, diablomon: 5, malomyotismon: 5,
    armageddemon: 5, imperialdramon_fightermode: 5
  };

  var EDGE_EXTRA_OVERRIDES = {
    /* MetalGreymon: dusk or dawn, fierce. Fallback uses the same extras (not a cheap skip). */
    "greymon>metalgreymon:standard": { mood: "fierce", timeOfDay: ["dawn", "dusk"] },
    "greymon>metalgreymon:fallback": { mood: "fierce", timeOfDay: ["dawn", "dusk"] }
  };

  var speciesTier = {};
  var edgeMap = {}; /* key -> { from, to, kind, tier, extra, existingGate } */
  var condExtras = typeof WeakMap === "function" ? new WeakMap() : null;
  var installed = false;
  var origConditionsMet = null;
  var origIsSecret = null;
  var origConditionsForEval = null;
  var clockOverride = null;
  var debugEnabled = false;

  function hashStr(s) {
    var h = 2166136261, i;
    s = String(s || "");
    for (i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function edgeKey(from, to, kind) {
    return String(from) + ">" + String(to) + ":" + String(kind);
  }

  function hasDistinctive(cond) {
    var i;
    if (!cond) return false;
    for (i = 0; i < DISTINCT_KEYS.length; i++) {
      if (cond[DISTINCT_KEYS[i]] != null && cond[DISTINCT_KEYS[i]] !== "") return true;
    }
    return false;
  }

  function incomingOf(id) {
    var out = [], from, list, i;
    if (!TREE || !TREE.branches) return out;
    for (from in TREE.branches) {
      if (!Object.prototype.hasOwnProperty.call(TREE.branches, from)) continue;
      list = TREE.branches[from] || [];
      for (i = 0; i < list.length; i++) {
        if (list[i].to === id) out.push({ from: from, branch: list[i] });
      }
    }
    return out;
  }

  function deriveSpeciesTier(id) {
    if (SPECIES_TIER_OVERRIDES[id] != null) return SPECIES_TIER_OVERRIDES[id];
    var rec = TREE && TREE.species && TREE.species[id];
    if (!rec) return 1;
    var stage = rec.stage;
    var inc = incomingOf(id);
    var i, k, hasStd = false, hasRecover = false, hasNeglect = false, onlySecret = true;
    for (i = 0; i < inc.length; i++) {
      k = inc[i].branch.kind;
      if (k === "standard" || k === "fallback") hasStd = true;
      if (k === "recover") hasRecover = true;
      if (k === "neglect") hasNeglect = true;
      if (k === "standard" || k === "fallback" || k === "recover" || k === "neglect") onlySecret = false;
    }
    if (!inc.length) onlySecret = false;
    if (stage === "Baby I" || stage === "Baby II" || stage === "Rookie") return 1;
    if (stage === "Mega+") return 5;
    if (stage === "Armor") return 2;
    if (stage === "Champion") {
      if (hasStd || hasRecover) return 1;
      if (inc.length && inc.every(function (x) { return x.branch.kind === "neglect"; })) return 1;
      return 2;
    }
    if (stage === "Ultimate") {
      if (onlySecret && inc.length) return 4;
      return 3;
    }
    if (stage === "Mega") {
      if (!hasStd && inc.length && (onlySecret || !hasRecover)) {
        /* Standard-less megas (warp / dark / special / fusion only, or neglect-only) are legendary. */
        if (!hasNeglect || onlySecret) return 5;
      }
      if (!hasStd) return 5;
      return 4;
    }
    return 1;
  }

  function pickT2Extra(key, cond) {
    if (hasDistinctive(cond)) return null; /* the existing single condition is the gate */
    var h = hashStr(key);
    if (h % 2 === 0) return { minUndamagedKills: 8 };
    return { minBond: 70 };
  }

  function pickT3Extra(key, destId) {
    if (EDGE_EXTRA_OVERRIDES[key]) return Object.assign({}, EDGE_EXTRA_OVERRIDES[key]);
    var h = hashStr(key + ":" + destId);
    return {
      mood: T3_MOODS[h % T3_MOODS.length],
      timeOfDay: T3_TOD[h % T3_TOD.length].slice()
    };
  }

  function pickT4Extra(key) {
    if (EDGE_EXTRA_OVERRIDES[key]) return Object.assign({}, EDGE_EXTRA_OVERRIDES[key]);
    var h = hashStr("t4:" + key);
    return {
      mood: T4_MOODS[h % T4_MOODS.length],
      minPeakJoy: 90,
      minHpRatio: 0.8,
      sessionWindow: "miracle"
    };
  }

  function pickT5Extra(key) {
    if (EDGE_EXTRA_OVERRIDES[key]) return Object.assign({}, EDGE_EXTRA_OVERRIDES[key]);
    var h = hashStr("t5:" + key);
    var slot = h % 5;
    if (slot === 0) return { minRefusedFood: 3, mood: "stubborn" };
    if (slot === 1) return { ignoredDuringEvent: true, mood: "lonely" };
    if (slot === 2) return { deliberateLoss: true, sessionWindow: "trial", mood: "wary" };
    if (slot === 3) return { minRefusedFood: 2, ignoredDuringEvent: true, mood: "stubborn" };
    return { minStarveCycles: 3, minIgnoredSeconds: 45, mood: "neglected" };
  }

  function extrasForEdge(from, branch, tier) {
    var key = edgeKey(from, branch.to, branch.kind);
    if (EDGE_EXTRA_OVERRIDES[key]) return Object.assign({}, EDGE_EXTRA_OVERRIDES[key]);
    if (tier <= 1) return null;
    if (tier === 2) return pickT2Extra(key, branch.conditions || {});
    if (tier === 3) return pickT3Extra(key, branch.to);
    if (tier === 4) return pickT4Extra(key);
    return pickT5Extra(key);
  }

  function buildTables() {
    speciesTier = {};
    edgeMap = {};
    if (!TREE || !TREE.species) return;
    var id, list, i, b, rec, destTier, edgeTier, extra, key;
    for (id in TREE.species) {
      if (!Object.prototype.hasOwnProperty.call(TREE.species, id)) continue;
      speciesTier[id] = deriveSpeciesTier(id);
    }
    for (id in TREE.branches) {
      if (!Object.prototype.hasOwnProperty.call(TREE.branches, id)) continue;
      list = TREE.branches[id] || [];
      for (i = 0; i < list.length; i++) {
        b = list[i];
        destTier = speciesTier[b.to] != null ? speciesTier[b.to] : deriveSpeciesTier(b.to);
        edgeTier = destTier;
        if (destTier === 1) edgeTier = 1;
        key = edgeKey(id, b.to, b.kind);
        extra = extrasForEdge(id, b, edgeTier);
        rec = {
          from: id,
          to: b.to,
          kind: b.kind,
          tier: edgeTier,
          extra: extra,
          existingGate: !!b.existingGate,
          destTier: destTier
        };
        edgeMap[key] = rec;
        if (condExtras && b.conditions && typeof b.conditions === "object") {
          condExtras.set(b.conditions, extra);
        }
      }
    }
  }

  function tierOf(id) {
    if (!id) return 1;
    if (speciesTier[id] != null) return speciesTier[id];
    if (TREE && TREE.species && TREE.species[id]) {
      speciesTier[id] = deriveSpeciesTier(id);
      return speciesTier[id];
    }
    return 1;
  }

  function edgeOf(from, to, kind) {
    if (from && typeof from === "object" && from.to) {
      kind = from.kind;
      to = from.to;
      from = arguments[1] || from.from || (from._from);
    }
    return edgeMap[edgeKey(from, to, kind)] || null;
  }

  function edgeTierOf(from, to, kind) {
    var rec = (typeof from === "object" && from && from.to)
      ? edgeMap[edgeKey(from.from || "", from.to, from.kind)]
      : edgeMap[edgeKey(from, to, kind)];
    if (rec) return rec.tier;
    if (to) return tierOf(to);
    return 1;
  }

  function extraOfBranch(branch, fromId) {
    if (!branch) return null;
    var key = edgeKey(fromId || branch.from || "", branch.to, branch.kind);
    var rec = edgeMap[key];
    if (rec) return rec.extra || null;
    if (branch.conditions && condExtras && condExtras.has(branch.conditions)) {
      return condExtras.get(branch.conditions);
    }
    return null;
  }



  function timeOfDay(statsOrRun, clock) {
    var now, hour, cycle, realP, cycleP, runTime;
    clock = clock || (statsOrRun && statsOrRun.clock) || null;
    /* Authority / rarity-sim pass deterministic clock inputs. Those win
     * over a client setClock override and over wall-clock Date.now(). */
    if (clock) {
      hour = clock.hour != null ? clock.hour : 12;
      if (clock.cycle != null) cycle = clock.cycle;
      else {
        runTime = 0;
        if (statsOrRun) {
          if (typeof statsOrRun.time === "number") runTime = statsOrRun.time;
          else if (typeof statsOrRun.runTime === "number") runTime = statsOrRun.runTime;
        }
        cycle = (runTime / DAY_SECONDS) % 1;
      }
    } else if (clockOverride) {
      hour = clockOverride.hour != null ? clockOverride.hour : 12;
      cycle = clockOverride.cycle != null ? clockOverride.cycle : 0.5;
    } else {
      now = new Date();
      hour = now.getHours() + now.getMinutes() / 60;
      runTime = 0;
      if (statsOrRun) {
        if (typeof statsOrRun.time === "number") runTime = statsOrRun.time;
        else if (typeof statsOrRun.runTime === "number") runTime = statsOrRun.runTime;
      }
      cycle = (runTime / DAY_SECONDS) % 1;
    }
    realP = periodOfHour(hour);
    cycleP = periodOfCycle(cycle);
    return {
      hour: hour,
      cycle: cycle,
      real: realP,
      cyclePeriod: cycleP,
      periods: realP === cycleP ? [realP] : [realP, cycleP]
    };
  }

  function setClock(opt) {
    clockOverride = opt || null;
  }

  function windowOpen(stats, name) {
    if (!stats) return false;
    var w = stats.windows || {};
    var rec = w[name];
    if (!rec || !rec.open) return false;
    return true;
  }

  function moodOf(runOrStats) {
    if (!runOrStats) return "content";
    if (runOrStats.mood) return runOrStats.mood;
    return deriveMood(runOrStats);
  }

  function deriveMood(run) {
    var joy = run.happiness != null ? run.happiness : (run.joy || 0);
    var hpR = run.hpRatio != null ? run.hpRatio : (run.maxHp ? (run.hp / run.maxHp) : 1);
    var ignored = run.ignoredSeconds || 0;
    var refused = run.refusedFoodCycles || 0;
    var starve = run.starveCycles || 0;
    var undamaged = run.undamagedKills || 0;
    var peak = run.peakHappiness != null ? run.peakHappiness : joy;
    var close = run.proximityClose;
    if (run.desperation) return "desperate";
    if (joy >= 90 && close && peak >= 90) return "rapt";
    if (joy >= 85 && (run.foodEaten || run.meals || 0) >= 12 && close) return "devoted";
    if (joy >= 70 && undamaged >= 8) return "proud";
    if (joy >= 60 && hpR >= 0.7 && (run.kills || 0) > 4) return "fierce";
    if (joy >= 55 && close) return "focused";
    if (refused >= 1 && joy < 75 && starve >= 1) return "stubborn";
    if (refused >= 1 && joy < 80) return "sulky";
    if (ignored >= 30 || (run.ignoredDuringEvent && joy < 70)) return "lonely";
    if (starve >= 2 || (run.careMistakes || 0) >= 3) return "neglected";
    if (hpR < 0.35 && joy >= 50) return "wary";
    if (joy >= 90) return "joyful";
    if (joy >= 70) return "happy";
    if (joy >= 40) return "content";
    if (joy >= 20) return "unhappy";
    return "miserable";
  }

  function extrasMet(extra, stats) {
    if (!extra) return true;
    if (stats && stats.debugBypassRarity) return true;
    var mood, tod, need, ok, i;
    if (extra.mood || extra.moods) {
      mood = moodOf(stats);
      if (extra.mood && mood !== extra.mood) return false;
      if (extra.moods && extra.moods.indexOf(mood) < 0) return false;
    }
    if (extra.timeOfDay) {
      tod = timeOfDay(stats);
      need = Array.isArray(extra.timeOfDay) ? extra.timeOfDay : [extra.timeOfDay];
      ok = false;
      for (i = 0; i < need.length; i++) {
        if (tod.periods.indexOf(need[i]) >= 0) { ok = true; break; }
      }
      if (!ok) return false;
    }
    if (extra.minUndamagedKills && (stats.undamagedKills || 0) < extra.minUndamagedKills) return false;
    if (extra.minBond) {
      var bond = stats.bond != null ? stats.bond : (stats.happiness || stats.joy || 0);
      if (bond < extra.minBond) return false;
    }
    if (extra.minPeakJoy && (stats.peakHappiness != null ? stats.peakHappiness : (stats.happiness || 0)) < extra.minPeakJoy) return false;
    if (extra.sessionWindow && !windowOpen(stats, extra.sessionWindow)) return false;
    if (extra.minRefusedFood && (stats.refusedFoodCycles || 0) < extra.minRefusedFood) return false;
    if (extra.ignoredDuringEvent && !stats.ignoredDuringEvent) return false;
    if (extra.deliberateLoss && !stats.deliberateLoss) return false;
    if (extra.minStarveCycles && (stats.starveCycles || 0) < extra.minStarveCycles) return false;
    if (extra.minIgnoredSeconds && (stats.ignoredSeconds || 0) < extra.minIgnoredSeconds) return false;
    if (extra.minHpRatio != null && (stats.hpRatio || 0) < extra.minHpRatio) return false;
    function st(n, alt) {
      var ts = stats.trainStats || {};
      if (stats[n] != null) return stats[n];
      return ts[alt || n] || 0;
    }
    if (extra.minOffense && st("offense") < extra.minOffense) return false;
    if (extra.minIntelligence && st("intelligence") < extra.minIntelligence) return false;
    if (extra.minAgility && st("agility") < extra.minAgility) return false;
    if (extra.maxOffense != null && st("offense") > extra.maxOffense) return false;
    if (extra.maxIntelligence != null && st("intelligence") > extra.maxIntelligence) return false;
    if (extra.maxAgility != null && st("agility") > extra.maxAgility) return false;
    return true;
  }

  function conditionsMetWrapped(cond, stats) {
    if (origConditionsMet && !origConditionsMet(cond, stats)) return false;
    if (!origConditionsMet && !cond) return true;
    var extra = null;
    if (cond && cond.__rarityExtra) extra = cond.__rarityExtra;
    else if (cond && condExtras && condExtras.has(cond)) extra = condExtras.get(cond);
    return extrasMet(extra, stats);
  }

  function isSecretWrapped(branch, stats) {
    if (origIsSecret && origIsSecret(branch, stats)) return true;
    if (!branch) return false;
    var rec = edgeMap[edgeKey(branch.from || "", branch.to, branch.kind)];
    if (!rec && branch.to) rec = edgeMap[edgeKey("", branch.to, branch.kind)];
    /* Look up all edges with this to+kind if from is unknown. */
    if (!rec && branch.to) {
      var k;
      for (k in edgeMap) {
        if (edgeMap[k].to === branch.to && edgeMap[k].kind === branch.kind) {
          if (rec && rec.tier !== edgeMap[k].tier) continue;
          rec = edgeMap[k];
          if (branch.from && edgeMap[k].from === branch.from) break;
        }
      }
    }
    if (rec && rec.tier >= 4) {
      if (stats && stats.discoveries && isDiscoveredEdge(stats.discoveries, rec.from, rec.to, rec.kind)) return false;
      return true;
    }
    return false;
  }

  function conditionsForEvalWrapped(branch, stats) {
    var c = origConditionsForEval ? origConditionsForEval(branch, stats) : ((branch && branch.conditions) || branch || {});
    var extra = extraOfBranch(branch, branch && branch.from);
    if (!extra && branch && branch.conditions && condExtras && condExtras.has(branch.conditions)) {
      extra = condExtras.get(branch.conditions);
    }
    if (!extra) return c;
    if (c === (branch && branch.conditions)) {
      var c2 = {}, k;
      for (k in c) if (Object.prototype.hasOwnProperty.call(c, k)) c2[k] = c[k];
      c = c2;
    }
    c.__rarityExtra = extra;
    return c;
  }

  function emptyDiscoveries() {
    return { species: {}, edges: {} };
  }

  function normalizeDiscoveries(raw) {
    var d = raw || {};
    return {
      species: d.species && typeof d.species === "object" ? d.species : {},
      edges: d.edges && typeof d.edges === "object" ? d.edges : {}
    };
  }

  function isDiscoveredSpecies(disc, id) {
    return !!(disc && disc.species && disc.species[id]);
  }

  function isDiscoveredEdge(disc, from, to, kind) {
    return !!(disc && disc.edges && disc.edges[edgeKey(from, to, kind)]);
  }

  function noteDiscovery(saveObj, fromId, toId, branch) {
    if (!saveObj) return false;
    saveObj.discoveries = normalizeDiscoveries(saveObj.discoveries);
    var changed = false;
    var now = (branch && branch.at != null) ? branch.at : Date.now();
    var t = tierOf(toId);
    if (toId && !saveObj.discoveries.species[toId]) {
      saveObj.discoveries.species[toId] = { tier: t, at: now, from: fromId || "" };
      changed = true;
    }
    if (fromId && toId && branch && branch.kind) {
      var key = edgeKey(fromId, toId, branch.kind);
      if (!saveObj.discoveries.edges[key]) {
        saveObj.discoveries.edges[key] = { tier: edgeTierOf(fromId, toId, branch.kind), at: now };
        changed = true;
      }
    }
    return changed;
  }

  function resetRun(run) {
    if (!run) return run;
    var seed = (run.worldSeed || 1) >>> 0;
    run.ignoredSeconds = 0;
    run.ignoredDuringEvent = false;
    run.refusedFoodCycles = 0;
    run.refusedThisCycle = false;
    run.starveCycles = 0;
    run.deliberateLoss = false;
    run.undamagedKills = 0;
    run.undamagedStreak = 0;
    run.lastMonHitAt = -999;
    run.bond = run.happiness || 0;
    run.mood = deriveMood(run);
    run.proximityClose = true;
    run.windows = {
      miracle: { open: false, opened: false, at: 80 + (seed % 90), dur: MIRACLE_DURATION },
      trial: { open: false, opened: false, at: 155 + (seed % 70), dur: TRIAL_DURATION },
      omen: { open: false, opened: false, at: 200 + (seed % 80), dur: OMEN_DURATION }
    };
    run.omenSeen = false;
    run.miracleShimmer = 0;
    return run;
  }

  function scheduleWindows(run) {
    if (!run || !run.windows) return;
    var name, w, t = run.time || 0;
    for (name in run.windows) {
      if (!Object.prototype.hasOwnProperty.call(run.windows, name)) continue;
      w = run.windows[name];
      if (w.opened) {
        if (w.open && t >= w.at + w.dur) w.open = false;
        continue;
      }
      if (t >= w.at) {
        w.opened = true;
        w.open = true;
        w.openedAt = t;
      }
    }
    run.miracleShimmer = (run.windows.miracle && run.windows.miracle.open) ? 1 : 0;
  }

  function tick(run, dt, ctx) {
    if (!run) return;
    if (!run.windows) resetRun(run);
    ctx = ctx || {};
    var dist = ctx.dist != null ? ctx.dist : 0;
    var close = dist <= IGNORE_RADIUS;
    run.proximityClose = close;
    if (!close) run.ignoredSeconds = (run.ignoredSeconds || 0) + dt;
    scheduleWindows(run);
    if (run.windows.omen && run.windows.omen.open && !close) {
      run.ignoredDuringEvent = true;
    }
    if (!ctx.silentHunger) {
      if (run.fullness <= 0) {
        if (!run.starveLockMood) {
          run.starveLockMood = true;
          run.starveCycles = (run.starveCycles || 0) + 1;
        }
      } else if (run.fullness > 20) {
        if (run.starveLockMood && run.refusedThisCycle) {
          run.refusedFoodCycles = (run.refusedFoodCycles || 0) + 1;
          run.refusedThisCycle = false;
        }
        run.starveLockMood = false;
      }
    }
    var meals = run.foodEaten || 0;
    var joy = run.happiness || 0;
    var baseBond = joy * 0.75 + Math.min(30, meals * 1.2) + (close ? 8 : -Math.min(20, (run.ignoredSeconds || 0) * 0.15));
    run.bond = Math.max(0, Math.min(100, baseBond + (run.bondTrain || 0)));
    run.mood = deriveMood(run);
  }

  function shouldRefuseFeed(run) {
    if (!run) return false;
    if ((run.fullness || 0) <= 15) return false; /* never refuse when dying of hunger */
    var mood = deriveMood(run);
    if (mood !== "stubborn" && mood !== "sulky") {
      /* Deterministic stubborn window: after a completed starve cycle, next feeds while joy < 70. */
      if ((run.starveCycles || 0) >= 1 && (run.happiness || 0) < 70 && (run.fullness || 0) > 20) {
        mood = "stubborn";
        run.mood = "stubborn";
      } else {
        return false;
      }
    }
    if (mood === "stubborn" || mood === "sulky") {
      run.refusedThisCycle = true;
      run.mood = mood;
      return true;
    }
    return false;
  }

  function noteMonHit(run) {
    if (!run) return;
    run.lastMonHitAt = run.time || 0;
    run.undamagedStreak = 0;
  }

  function noteKill(run) {
    if (!run) return;
    var since = (run.time || 0) - (run.lastMonHitAt == null ? -999 : run.lastMonHitAt);
    if (since >= 6 || (run.undamagedStreak || 0) > 0 && since >= 0 && (run.lastMonHitAt == null || run.lastMonHitAt < 0)) {
      run.undamagedStreak = (run.undamagedStreak || 0) + 1;
      run.undamagedKills = (run.undamagedKills || 0) + 1;
    } else if (since >= 6) {
      run.undamagedStreak = (run.undamagedStreak || 0) + 1;
      run.undamagedKills = (run.undamagedKills || 0) + 1;
    } else if ((run.lastMonHitAt == null || run.lastMonHitAt < 0) ) {
      run.undamagedStreak = (run.undamagedStreak || 0) + 1;
      run.undamagedKills = (run.undamagedKills || 0) + 1;
    } else {
      run.undamagedStreak = 0;
    }
  }

  function noteFaintSignal(run) {
    if (!run) return;
    if (run.windows && run.windows.trial && run.windows.trial.open) {
      run.deliberateLoss = true;
    }
  }

  function onFarmCycle(evt) {
    evt = evt || {};
    var run = evt.run;
    if (!run) return;
    if (evt.ignored) {
      run.ignoredSeconds = (run.ignoredSeconds || 0) + (evt.seconds || 60);
      if (evt.event) run.ignoredDuringEvent = true;
    }
    if (evt.refusedFood) {
      run.refusedThisCycle = true;
      run.refusedFoodCycles = (run.refusedFoodCycles || 0) + 1;
    }
    if (evt.fed) run.refusedThisCycle = false;
    if (evt.careMistake) run.lastCareMistake = true;
    if (evt.hungryExit) run.hungryExits = (run.hungryExits || 0) + 1;
    run.mood = deriveMood(run);
  }

  function farmIntervalMinutes(cycleIndex) {
    var seq = FARM_CARE.intervalMinutes;
    if (cycleIndex < seq.length) return seq[cycleIndex];
    return seq[seq.length - 1] + FARM_CARE.intervalPlus * (cycleIndex - seq.length + 1);
  }

  function brawlMods(tier) {
    return BRAWL[tier] || BRAWL[1];
  }

  function brawlOdds(tierA, tierB) {
    var d = (BRAWL_EDGE[tierA] || 0) - (BRAWL_EDGE[tierB] || 0);
    var pA = 0.5 + d * 0.7;
    if (pA < 0.22) pA = 0.22;
    if (pA > 0.78) pA = 0.78;
    return { a: pA, b: 1 - pA, label: Math.round(pA * 100) + "–" + Math.round((1 - pA) * 100) };
  }

  function debugSatisfy(run, branch) {
    if (!run) return;
    var extra = extraOfBranch(branch, run.form);
    if (!extra) return;
    if (extra.mood) run.mood = extra.mood;
    if (extra.moods) run.mood = extra.moods[0];
    if (extra.minPeakJoy) {
      run.happiness = Math.max(run.happiness || 0, extra.minPeakJoy);
      run.peakHappiness = Math.max(run.peakHappiness || 0, extra.minPeakJoy);
    }
    if (extra.minBond) run.bond = Math.max(run.bond || 0, extra.minBond);
    if (extra.minUndamagedKills) run.undamagedKills = Math.max(run.undamagedKills || 0, extra.minUndamagedKills);
    if (extra.minRefusedFood) run.refusedFoodCycles = Math.max(run.refusedFoodCycles || 0, extra.minRefusedFood);
    if (extra.minStarveCycles) run.starveCycles = Math.max(run.starveCycles || 0, extra.minStarveCycles);
    if (extra.minIgnoredSeconds) run.ignoredSeconds = Math.max(run.ignoredSeconds || 0, extra.minIgnoredSeconds);
    if (extra.ignoredDuringEvent) run.ignoredDuringEvent = true;
    if (extra.deliberateLoss) run.deliberateLoss = true;
    if (extra.minHpRatio != null && run.maxHp) run.hp = Math.max(run.hp || 0, run.maxHp * extra.minHpRatio + 1);
    if (extra.timeOfDay) {
      var want = Array.isArray(extra.timeOfDay) ? extra.timeOfDay[0] : extra.timeOfDay;
      var hourMap = { dawn: 6, morning: 9, midday: 13, dusk: 18, night: 22 };
      var fracMap = { dawn: 0.05, morning: 0.25, midday: 0.5, dusk: 0.68, night: 0.88 };
      setClock({ hour: hourMap[want] || 18, cycle: fracMap[want] || 0.68 });
    }
    if (extra.sessionWindow && run.windows && run.windows[extra.sessionWindow]) {
      run.windows[extra.sessionWindow].opened = true;
      run.windows[extra.sessionWindow].open = true;
      run.windows[extra.sessionWindow].at = run.time || 0;
    }
    run.proximityClose = true;
    if (extra.mood) run.mood = extra.mood;
  }

  function attachStats(stats, run) {
    stats = stats || {};
    if (!run) return stats;
    stats.mood = run.mood || deriveMood(run);
    stats.bond = run.bond != null ? run.bond : (run.happiness || 0);
    stats.peakHappiness = run.peakHappiness;
    stats.undamagedKills = run.undamagedKills || 0;
    stats.refusedFoodCycles = run.refusedFoodCycles || 0;
    stats.ignoredSeconds = run.ignoredSeconds || 0;
    stats.ignoredDuringEvent = !!run.ignoredDuringEvent;
    stats.deliberateLoss = !!run.deliberateLoss;
    stats.starveCycles = run.starveCycles || 0;
    stats.windows = run.windows;
    stats.runTime = run.time || 0;
    stats.time = run.time || 0;
    if (run.clock) stats.clock = run.clock;
    stats.happiness = run.happiness;
    stats.joy = run.happiness;
    stats.hpRatio = run.maxHp ? run.hp / run.maxHp : 1;
    stats.foodEaten = run.foodEaten;
    stats.meals = run.foodEaten;
    stats.desperation = run.desperation;
    stats.proximityClose = run.proximityClose;
    stats.kills = run.kills;
    run.trainStats = run.trainStats || { offense: 0, intelligence: 0, agility: 0 };
    stats.trainStats = run.trainStats;
    stats.offense = run.trainStats.offense || 0;
    stats.intelligence = run.trainStats.intelligence || 0;
    stats.agility = run.trainStats.agility || 0;
    stats.bondTrain = run.bondTrain || 0;
    return stats;
  }

  function formatExtra(extra) {
    if (!extra) return "(none — existing gate only)";
    var bits = [], k;
    for (k in extra) {
      if (!Object.prototype.hasOwnProperty.call(extra, k)) continue;
      bits.push(k + "=" + (Array.isArray(extra[k]) ? extra[k].join("|") : JSON.stringify(extra[k])));
    }
    return bits.join(", ");
  }

  function renderDebug(el, run, stats, saveObj) {
    if (!el) return;
    if (!debugEnabled) {
      el.hidden = true;
      el.classList.remove("is-on");
      return;
    }
    el.hidden = false;
    el.classList.add("is-on");
    var form = run && run.form;
    var tod = timeOfDay(stats || run);
    var lines = [];
    lines.push("HIDDEN TIER DEBUG  (?debug=1&tiers=1 only — never shown to players)");
    if (run) {
      lines.push("Form: " + form + "  stage=" + ((TREE && TREE.species[form] && TREE.species[form].stage) || "?") + "  speciesTier=" + tierOf(form) + " (" + TIER_NAMES[tierOf(form)] + ")");
      lines.push("Mood: " + moodOf(run) + "   joy=" + Math.round(run.happiness || 0) + "  bond=" + Math.round(run.bond || 0) + "  peak=" + Math.round(run.peakHappiness || 0));
      lines.push("Time: real=" + tod.real + " (hour " + (Math.round(tod.hour * 10) / 10) + ")  cycle=" + tod.cyclePeriod + "  periods=" + tod.periods.join("+"));
      var w = run.windows || {};
      function wstat(n) {
        var x = w[n] || {};
        return n + "=" + (x.open ? "OPEN" : (x.opened ? "closed" : "pending@" + Math.round(x.at || 0) + "s"));
      }
      lines.push("Windows: " + wstat("miracle") + "  " + wstat("trial") + "  " + wstat("omen"));
      lines.push("Signals: ignored=" + Math.round(run.ignoredSeconds || 0) + "s  refusedCycles=" + (run.refusedFoodCycles || 0) + "  starveCycles=" + (run.starveCycles || 0) +
        "  undamagedKOs=" + (run.undamagedKills || 0) + "  ignoredEvent=" + !!run.ignoredDuringEvent + "  deliberateLoss=" + !!run.deliberateLoss);
    }
    if (saveObj && saveObj.discoveries) {
      var ds = Object.keys(saveObj.discoveries.species || {}).length;
      var de = Object.keys(saveObj.discoveries.edges || {}).length;
      lines.push("Discoveries (profile): " + ds + " species, " + de + " edges");
    }
    if (run && TREE && TREE.branches) {
      var list = TREE.branches[run.form] || [];
      var i, b, rec, met;
      lines.push("--- outgoing edges ---");
      for (i = 0; i < list.length; i++) {
        b = list[i];
        rec = edgeMap[edgeKey(run.form, b.to, b.kind)];
        met = origConditionsMet ? origConditionsMet(b.conditions || {}, stats || {}) : "?";
        var exOk = rec ? extrasMet(rec.extra, stats || run) : true;
        lines.push("  T" + (rec ? rec.tier : "?") + " " + b.kind + " → " + b.to +
          "  tree=" + (met ? "ok" : "no") + "  extra=" + (exOk ? "ok" : "no") +
          (rec && rec.extra ? " [" + formatExtra(rec.extra) + "]" : " [none]"));
      }
    }
    el.textContent = lines.join("\n");
  }

  function decorateSpecies() {
    var id, t;
    if (D.SPECIES) {
      for (id in D.SPECIES) {
        if (!Object.prototype.hasOwnProperty.call(D.SPECIES, id)) continue;
        t = tierOf(id);
        D.SPECIES[id].tier = t;
      }
    }
    if (TREE && TREE.species) {
      for (id in TREE.species) {
        if (!Object.prototype.hasOwnProperty.call(TREE.species, id)) continue;
        TREE.species[id].tier = speciesTier[id] || tierOf(id);
      }
    }
  }

  function install() {
    if (installed) return api;
    if (!TREE && D.EVO_TREE) TREE = D.EVO_TREE;
    if (!TREE) return api;
    buildTables();
    if (typeof TREE.conditionsMet === "function" && TREE.conditionsMet !== conditionsMetWrapped) {
      origConditionsMet = TREE.conditionsMet;
      TREE.conditionsMet = conditionsMetWrapped;
    } else if (!origConditionsMet) {
      origConditionsMet = TREE.conditionsMet;
    }
    if (D.conditionsForEval && D.conditionsForEval !== conditionsForEvalWrapped) {
      origConditionsForEval = D.conditionsForEval;
      D.conditionsForEval = conditionsForEvalWrapped;
    }
    if (D.isSecretBranch && D.isSecretBranch !== isSecretWrapped) {
      origIsSecret = D.isSecretBranch;
      D.isSecretBranch = isSecretWrapped;
    }
    decorateSpecies();
    installed = true;
    return api;
  }

  function counts() {
    var c = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, id, e, ec = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (id in speciesTier) if (Object.prototype.hasOwnProperty.call(speciesTier, id)) c[speciesTier[id]]++;
    for (e in edgeMap) if (Object.prototype.hasOwnProperty.call(edgeMap, e)) ec[edgeMap[e].tier]++;
    return { species: c, edges: ec };
  }

  function speciesList() {
    return Object.keys(speciesTier).sort().map(function (id) {
      var rec = TREE.species[id] || {};
      return { id: id, name: rec.name || id, stage: rec.stage || "", tier: speciesTier[id] };
    });
  }

  function edgeList() {
    return Object.keys(edgeMap).sort().map(function (k) { return edgeMap[k]; });
  }

  function startingRoots() {
    /* Babies plus species with no incoming edge (pre-existing orphan rookies
       such as Beatbreak Chiropmon / Pristimon, which have no UP baby sprites). */
    var roots = [], id;
    if (!TREE) return roots;
    var hasIn = {};
    var from, list, i;
    for (from in TREE.branches) {
      list = TREE.branches[from] || [];
      for (i = 0; i < list.length; i++) hasIn[list[i].to] = true;
    }
    for (id in TREE.species) {
      if (!Object.prototype.hasOwnProperty.call(TREE.species, id)) continue;
      var st = TREE.species[id].stage;
      if (st === "Baby I" || st === "Baby II" || !hasIn[id]) roots.push(id);
    }
    return roots;
  }

  function reachableFromBabies() {
    if (!TREE) return { ok: false, missing: ["no tree"] };
    var roots = startingRoots();
    var seen = {}, q = roots.slice(), i, cur, list, j, missing = [];
    for (i = 0; i < roots.length; i++) seen[roots[i]] = true;
    while (q.length) {
      cur = q.shift();
      list = TREE.branches[cur] || [];
      for (j = 0; j < list.length; j++) {
        if (!seen[list[j].to] && TREE.species[list[j].to]) {
          seen[list[j].to] = true;
          q.push(list[j].to);
        }
      }
    }
    for (i in TREE.species) {
      if (!Object.prototype.hasOwnProperty.call(TREE.species, i)) continue;
      if (!seen[i]) missing.push(i);
    }
    return { ok: missing.length === 0, missing: missing, reached: Object.keys(seen).length, roots: roots };
  }

  function validate() {
    if (!installed) install();
    var errors = [];
    var id, k, rec, t;
    for (id in TREE.species) {
      if (!Object.prototype.hasOwnProperty.call(TREE.species, id)) continue;
      t = speciesTier[id];
      if (!(t >= 1 && t <= 5)) errors.push("species " + id + " missing tier");
    }
    for (k in edgeMap) {
      rec = edgeMap[k];
      if (!(rec.tier >= 1 && rec.tier <= 5)) errors.push("edge " + k + " missing tier");
    }
    /* Every tree branch has an edge record. */
    var from, list, i, key;
    var nBr = 0;
    for (from in TREE.branches) {
      list = TREE.branches[from] || [];
      for (i = 0; i < list.length; i++) {
        nBr++;
        key = edgeKey(from, list[i].to, list[i].kind);
        if (!edgeMap[key]) errors.push("no rarity record for " + key);
      }
    }
    var expect = {
      metalgreymon: 3, agumon: 1, greymon: 1, botamon: 1, koromon: 1,
      gabumon: 1, garurumon: 1, numemon: 1
    };
    for (id in expect) {
      if (tierOf(id) !== expect[id]) errors.push(id + " expected tier " + expect[id] + " got " + tierOf(id));
    }
    var mgStd = edgeMap["greymon>metalgreymon:standard"];
    var mgFb = edgeMap["greymon>metalgreymon:fallback"];
    if (!mgStd || mgStd.tier !== 3) errors.push("greymon→metalgreymon standard must be tier 3");
    if (!mgFb || mgFb.tier !== 3) errors.push("greymon→metalgreymon fallback must be tier 3 (no cheap skip)");
    if (!mgStd || !mgStd.extra || !mgStd.extra.mood || !mgStd.extra.timeOfDay) {
      errors.push("MetalGreymon standard must layer mood + time-of-day");
    }
    if (JSON.stringify(mgStd && mgStd.extra) !== JSON.stringify(mgFb && mgFb.extra)) {
      errors.push("MetalGreymon fallback extras must match standard");
    }
    var ag = edgeMap["agumon>greymon:standard"];
    if (!ag || ag.tier !== 1) errors.push("agumon→greymon standard must be tier 1");
    if (ag && ag.extra) errors.push("agumon→greymon standard must have no rarity extras");
    /* Existing numeric gates untouched. */
    var gates = TREE.existingGatesPreserved || [];
    var g, found, cond, want, ck;
    for (i = 0; i < gates.length; i++) {
      g = gates[i];
      found = (TREE.branches[g.from] || []).find(function (b) { return b.to === g.to && b.kind === g.kind; });
      if (!found) { errors.push("existing gate missing " + g.from + ">" + g.to); continue; }
      cond = found.conditions || {};
      want = g.conditions || {};
      for (ck in want) {
        if (JSON.stringify(cond[ck]) !== JSON.stringify(want[ck])) {
          errors.push("existing gate numeric change " + g.from + ">" + g.to + " " + ck);
        }
      }
    }
    var reach = reachableFromBabies();
    if (!reach.ok) errors.push("unreachable species: " + reach.missing.join(", "));
    return {
      ok: errors.length === 0,
      errors: errors,
      counts: counts(),
      branches: nBr,
      species: Object.keys(speciesTier).length,
      reach: reach
    };
  }

  function dumpMarkdown() {
    if (!installed) install();
    var lines = [];
    var c = counts();
    lines.push("# Hidden 5-tier rarity (DEVELOPER ONLY)");
    lines.push("");
    lines.push("This file is a secret design table. **Never surface tiers, rarity labels, or this document in the player-facing game.** No in-game wiki, no hints, no HUD badges. The only runtime view is `?debug=1&tiers=1`.");
    lines.push("");
    lines.push("The layer lives in `js/rarity.js` and wraps `EVO_TREE.conditionsMet` at runtime. `js/evolution-tree.js` is not modified. Existing T1 numeric gates (Agumon → Greymon, etc.) keep their original minLevel / minFood / minHappiness / minHpRatio values.");
    lines.push("");
    lines.push("## Tiers");
    lines.push("");
    lines.push("- **Tier 1 Common** — Base forms and first evolutions (Agumon → Greymon). Almost everyone sees them. No extra rarity conditions.");
    lines.push("- **Tier 2 Uncommon** — Second-stage or branching forms that need **one** real condition (friendship/bond threshold, undamaged KO streak, or an existing distinctive tree condition such as mostFood / item / attribute KOs). Missable, not brutal.");
    lines.push("- **Tier 3 Rare** — Combination of the tree's stat minimums **plus** a hidden mood **plus** a time-of-day trigger (real local clock **or** the in-game 180s day cycle). MetalGreymon lives here. The Greymon → MetalGreymon fallback uses the same extras, so it is not a cheap skip. Might take run 3 or run 30.");
    lines.push("- **Tier 4 Epic** — Single-run miracles: peak joy, a precise emotion (rapt / devoted), and a narrow `miracle` window that opens about once per session (~18s) and then closes for good.");
    lines.push("- **Tier 5 Legendary** — Roughly one-in-a-hundred, nearly anti-designed. Examples: refuse food for several starve/farm cycles; ignore the partner during a silent omen pulse; deliberately faint during a short `trial` window. Should feel like a rumor.");
    lines.push("");
    lines.push("Tiers 4–5 are slightly unfair on purpose: they test whether you were paying attention, not whether you were patient.");
    lines.push("");
    lines.push("## Counts");
    lines.push("");
    lines.push("| Tier | Species | Edges |");
    lines.push("| --- | ---: | ---: |");
    [1, 2, 3, 4, 5].forEach(function (t) {
      lines.push("| " + t + " " + TIER_NAMES[t] + " | " + c.species[t] + " | " + c.edges[t] + " |");
    });
    lines.push("");
    lines.push("## Mood and signals");
    lines.push("");
    lines.push("The player HUD still shows only the existing happiness strip (Joyful / Happy / Content / …). Hidden emotions (`fierce`, `proud`, `focused`, `rapt`, `devoted`, `stubborn`, `sulky`, `lonely`, `neglected`, `desperate`, `wary`) are derived from joy, proximity, undamaged streaks, refusals, starve cycles, and desperation. They appear only in the dev panel.");
    lines.push("");
    lines.push("Tracked signals (on the run object, persisted discoveries only on the profile):");
    lines.push("");
    lines.push("- `ignoredSeconds` — partner farther than 220px from the tamer");
    lines.push("- `ignoredDuringEvent` — ignored while the silent once-per-run omen pulse is open");
    lines.push("- `refusedFoodCycles` — feed attempts turned down (stubborn/sulky after a starve cycle; food is not consumed). Never refuses at critical hunger.");
    lines.push("- `deliberateLoss` — partner fainted while the short `trial` window was open");
    lines.push("- `undamagedKills` / `starveCycles` / `bond`");
    lines.push("");
    lines.push("Time of day matches if **either** the real local clock **or** the in-game cycle (180s/day: dawn, morning, midday, dusk, night) is in the required period.");
    lines.push("");
    lines.push("## Farm hooks (pending ids 14–17)");
    lines.push("");
    lines.push("Digifarm care is still queued. Mood and signals are shaped so the farm can plug in without retuning this table:");
    lines.push("");
    lines.push("- Interval schedule: **3, 6, 10** minutes, then **+4** minutes each later cycle (`D.rarity.farmIntervalMinutes(i)` / `D.FARM_CARE`).");
    lines.push("- Call `D.rarity.onFarmCycle({ run, ignored, refusedFood, fed, event, seconds })` from the intermission.");
    lines.push("- Pending: (14) farm intermission, (15) item split, (16) dual input, (17) farm interval schedule + battle countdown → overtime timer.");
    lines.push("");
    lines.push("## Brawl edge (later co-op)");
    lines.push("");
    lines.push("Every species has a `tier` field (`D.tierOf(id)`, also `D.SPECIES[id].tier`). `D.brawlMods(tier)` and `D.brawlOdds(tierA, tierB)` give a small HP / regen / extra-move edge. Example: tier 5 vs tier 1 lands near 72–28, not 99–1, so upsets stay possible. Odds UI and the brawl itself are not built in this pass.");
    lines.push("");
    lines.push("Reachability: every species must remain reachable from a Baby or from a pre-existing root with no incoming edge (Beatbreak Chiropmon and Pristimon have no UP baby forms, so they are themselves starters). The rarity layer does not add or remove branches.");
    lines.push("");
    lines.push("Discovery tracking is stored on the profile via `js/storage.js` (`save.discoveries.species` / `save.discoveries.edges`). It is not shown in the game over screen or any bestiary.");
    lines.push("");
    lines.push("## Assignment rules");
    lines.push("");
    lines.push("1. Baby I / Baby II / Rookie → tier 1. Standard (or recover) first Champions, and neglect-only leftovers such as Numemon, → tier 1.");
    lines.push("2. Alternate Champions (special / dark / armor) and Armor forms → tier 2.");
    lines.push("3. Ultimates → tier 3, unless they are *only* reachable by warp / fusion / dark / mode, in which case they are tier 4.");
    lines.push("4. Megas with a standard/fallback path → tier 4. Standard-less Megas and every Mega+ → tier 5.");
    lines.push("5. Edge tier follows the destination (so fallback to MetalGreymon is also 3). T1 destinations never gain hidden extras.");
    lines.push("");
    lines.push("Hand overrides: MetalGreymon = 3 (fierce + dawn/dusk); WarGreymon / MetalGarurumon = 4; BlackWarGreymon, Apocalymon, Diaboromon, MaloMyotismon, Armageddemon, Imperialdramon Fighter Mode = 5; classic rookies and first Champions stay 1.");
    lines.push("");
    lines.push("## Species table");
    lines.push("");
    lines.push("| Id | Name | Stage | Tier |");
    lines.push("| --- | --- | --- | ---: |");
    speciesList().forEach(function (s) {
      lines.push("| `" + s.id + "` | " + s.name + " | " + s.stage + " | " + s.tier + " |");
    });
    lines.push("");
    lines.push("## Full edge table");
    lines.push("");
    lines.push("| From | To | Kind | Tier | Hidden extras |");
    lines.push("| --- | --- | --- | ---: | --- |");
    edgeList().forEach(function (e) {
      lines.push("| `" + e.from + "` | `" + e.to + "` | " + e.kind + " | " + e.tier + " | " + formatExtra(e.extra) + " |");
    });
    lines.push("");
    return lines.join("\n");
  }

  var api = {
    TIER_NAMES: TIER_NAMES,
    BRAWL: BRAWL,
    FARM_CARE: FARM_CARE,
    DAY_SECONDS: DAY_SECONDS,
    install: install,
    tierOf: tierOf,
    edgeOf: edgeOf,
    edgeTierOf: edgeTierOf,
    extraOfBranch: extraOfBranch,
    extrasMet: extrasMet,
    moodOf: moodOf,
    deriveMood: deriveMood,
    timeOfDay: timeOfDay,
    setClock: setClock,
    windowOpen: windowOpen,
    resetRun: resetRun,
    tick: tick,
    shouldRefuseFeed: shouldRefuseFeed,
    noteMonHit: noteMonHit,
    noteKill: noteKill,
    noteFaintSignal: noteFaintSignal,
    onFarmCycle: onFarmCycle,
    farmIntervalMinutes: farmIntervalMinutes,
    brawlMods: brawlMods,
    brawlOdds: brawlOdds,
    debugSatisfy: debugSatisfy,
    attachStats: attachStats,
    noteDiscovery: noteDiscovery,
    normalizeDiscoveries: normalizeDiscoveries,
    emptyDiscoveries: emptyDiscoveries,
    isDiscoveredSpecies: isDiscoveredSpecies,
    isDiscoveredEdge: isDiscoveredEdge,
    renderDebug: renderDebug,
    setDebugEnabled: function (on) { debugEnabled = !!on; },
    isDebugEnabled: function () { return debugEnabled; },
    formatExtra: formatExtra,
    counts: counts,
    speciesList: speciesList,
    edgeList: edgeList,
    validate: validate,
    dumpMarkdown: dumpMarkdown,
    reachableFromBabies: reachableFromBabies
  };

  D.rarity = api;
  D.tierOf = tierOf;
  D.brawlMods = brawlMods;
  D.brawlOdds = brawlOdds;
  D.brawlEdge = function (tier) { return brawlMods(tier); };
  D.FARM_CARE = FARM_CARE;

  if (TREE) install();
  else if (!isNode && typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", function () {
      if (D.EVO_TREE) TREE = D.EVO_TREE;
      install();
    });
  }

  if (isNode) module.exports = api;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
