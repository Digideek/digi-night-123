/* DOM-free rarity tick, deterministic clock, farm/brawl interval math,
 * and idempotent discovery records. Used by Authority / MissionSim /
 * Progression. Formulas match js/rarity.js; clock inputs are passed in
 * (battle time + host hour), never Date.now() or a client override.
 */
(function (global) {
  "use strict";
  var isNode = typeof module === "object" && module.exports;
  var root = isNode ? global : window;
  var D = (root.DBH = root.DBH || {});

  var IGNORE_RADIUS = 220;
  var MIRACLE_DURATION = 18;
  var TRIAL_DURATION = 14;
  var OMEN_DURATION = 22;
  /* the day clock lives in js/day-clock.js, shared with rarity.js and seasons.js */
  var CLOCK = D.dayClock || (isNode ? require("../day-clock.js") : null);
  var DAY_SECONDS = CLOCK.DAY_SECONDS, periodOfHour = CLOCK.periodOfHour, periodOfCycle = CLOCK.periodOfCycle;
  var DEFAULT_INTERVALS = [3, 6, 10];
  var DEFAULT_PLUS = 4;

  var SPOOF_FIELDS = [
    "ignoredSeconds", "ignoredDuringEvent", "mood", "bond", "windows",
    "omenSeen", "starveCycles", "refusedFoodCycles", "refusedThisCycle",
    "deliberateLoss", "undamagedKills", "debugBypassRarity", "miracleShimmer",
    "proximityClose", "farmDueAt", "pendingFarm", "pendingBrawl", "lastFarmAt",
    "farmVisitIndex", "lastBrawlLevel", "clock", "clockHour", "clockOverride",
    "formsReached"
  ];
  var SPOOF_TYPES = {
    "rarity.spoof": 1, "rarity.tick": 1, "rarity.set": 1, setMood: 1, setBond: 1,
    setWindows: 1, setClock: 1, grantUnlock: 1, noteDiscovery: 1, discover: 1,
    unlock: 1, scheduleFarm: 1, scheduleBrawl: 1, "lifecycle.force": 1,
    debugSatisfy: 1, setIgnored: 1, setRarity: 1
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function intervalCfg(cfg) {
    cfg = cfg || {};
    var care = cfg.FARM_CARE || cfg.FARM_CFG || cfg;
    return {
      seq: care.intervalMinutes || DEFAULT_INTERVALS,
      plus: care.intervalPlus != null ? care.intervalPlus : DEFAULT_PLUS
    };
  }

  function farmIntervalMinutes(index, cfg) {
    var c = intervalCfg(cfg);
    var seq = c.seq;
    var i = index || 0;
    if (i < seq.length) return seq[i];
    return seq[seq.length - 1] + c.plus * (i - seq.length + 1);
  }

  /* Battle-time intervals, not cumulative due-stamps. Visit 0 is due
   * interval[0] minutes after lastFarmAt (0 at run start); after a
   * scheduled enter, lastFarmAt is stamped to the current battle clock
   * and the next gap is interval[1] minutes of later battle time.
   * So dues are 3, then +6, then +10, then +14… of battle time — not
   * absolute marks at t=3, t=6, t=10. */
  function farmDueAt(p, cfg) {
    if (!p) return farmIntervalMinutes(0, cfg) * 60;
    return (p.lastFarmAt || 0) + farmIntervalMinutes(p.farmVisitIndex || 0, cfg) * 60;
  }

  function farmDueIn(p, battleTime, cfg) {
    return farmDueAt(p, cfg) - (battleTime || 0);
  }

  function clockOf(battleTime, clockHour) {
    return {
      hour: clockHour != null ? clockHour : 12,
      cycle: ((battleTime || 0) / DAY_SECONDS) % 1
    };
  }



  /* Deterministic when `clock` or `stats.clock` is supplied. Never reads Date. */
  function timeOfDay(statsOrRun, clock) {
    clock = clock || (statsOrRun && statsOrRun.clock) || null;
    var hour, cycle, realP, cycleP, runTime;
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
    } else {
      hour = 12;
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

  function deriveMood(run) {
    if (!run) return "content";
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

  function moodOf(runOrStats) {
    if (!runOrStats) return "content";
    if (runOrStats.mood) return runOrStats.mood;
    return deriveMood(runOrStats);
  }

  function resetRun(run, seed) {
    if (!run) return run;
    seed = ((seed != null ? seed : run.worldSeed) || 1) >>> 0;
    run.worldSeed = seed;
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
    if (!run.windows) resetRun(run, run.worldSeed);
    ctx = ctx || {};
    if (ctx.clock) run.clock = ctx.clock;
    if (ctx.time != null) run.time = ctx.time;
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
    if (run.windows.omen && run.windows.omen.open) run.omenSeen = true;
    return run;
  }

  function shouldRefuseFeed(run) {
    if (!run) return false;
    if ((run.fullness || 0) <= 15) return false;
    var mood = deriveMood(run);
    if (mood !== "stubborn" && mood !== "sulky") {
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
    if (since >= 6 || ((run.undamagedStreak || 0) > 0 && since >= 0 && (run.lastMonHitAt == null || run.lastMonHitAt < 0))) {
      run.undamagedStreak = (run.undamagedStreak || 0) + 1;
      run.undamagedKills = (run.undamagedKills || 0) + 1;
    } else if (since >= 6) {
      run.undamagedStreak = (run.undamagedStreak || 0) + 1;
      run.undamagedKills = (run.undamagedKills || 0) + 1;
    } else if (run.lastMonHitAt == null || run.lastMonHitAt < 0) {
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
    stats.clock = run.clock;
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

  function emptyDiscoveries() { return { species: {}, edges: {} }; }

  function normalizeDiscoveries(raw) {
    var d = raw || {};
    return {
      species: d.species && typeof d.species === "object" ? d.species : {},
      edges: d.edges && typeof d.edges === "object" ? d.edges : {}
    };
  }

  function edgeKey(from, to, kind) {
    return (from || "") + ">" + (to || "") + ":" + (kind || "standard");
  }

  function discoveryKey(from, to, kind) {
    return "disc:" + edgeKey(from, to, kind);
  }

  function noteDiscovery(saveObj, fromId, toId, branch, at, tierFn) {
    if (!saveObj) return false;
    saveObj.discoveries = normalizeDiscoveries(saveObj.discoveries);
    var changed = false;
    var stamp = at != null ? at : 0;
    var t = tierFn ? tierFn(toId) : 1;
    if (toId && !saveObj.discoveries.species[toId]) {
      saveObj.discoveries.species[toId] = { tier: t, at: stamp, from: fromId || "" };
      changed = true;
    }
    if (fromId && toId && branch && branch.kind) {
      var key = edgeKey(fromId, toId, branch.kind);
      if (!saveObj.discoveries.edges[key]) {
        saveObj.discoveries.edges[key] = { tier: t, at: stamp };
        changed = true;
      }
    }
    return changed;
  }

  function isEggForm(form, data) {
    if (!form) return false;
    var sp = data && data.SPECIES && data.SPECIES[form];
    if (sp && (sp.stage === "Egg" || sp.hatchTo)) return true;
    return false;
  }

  function partyCount(sim, p, brawlCfg) {
    if (p && p.session && p.session.players) return p.session.players.length;
    var n = (sim && sim.players && sim.players.length) || 1;
    var bots = (sim && sim.cpus && sim.cpus.length) || 0;
    if (!bots && p && p.cpuBots != null) bots = p.cpuBots;
    else if (!bots && brawlCfg && brawlCfg.botCount) bots = brawlCfg.botCount;
    return n + bots;
  }

  function shouldBrawl(p, opts) {
    opts = opts || {};
    var c = opts.BRAWL || opts.cfg || {};
    if (!p) return false;
    if (c.skipEgg !== false && isEggForm(p.form, opts.data)) return false;
    var every = Math.max(1, c.everyLevels || 1);
    var min = c.minLevel != null ? c.minLevel : 2;
    var level = p.level || 1;
    if (level < min) return false;
    if (p.lastBrawlLevel === level) return false;
    if (level % every !== 0) return false;
    var party = opts.partyCount != null ? opts.partyCount : 1;
    if (party < 2 && (c.soloMode || "skip") !== "bonus") return false;
    return true;
  }

  function hasSpoofFields(msg) {
    if (!msg) return false;
    var i, k;
    for (i = 0; i < SPOOF_FIELDS.length; i++) {
      k = SPOOF_FIELDS[i];
      if (Object.prototype.hasOwnProperty.call(msg, k) && msg[k] != null) return true;
    }
    return false;
  }

  function isSpoof(msg) {
    if (!msg) return false;
    if (msg.type && SPOOF_TYPES[msg.type]) return true;
    return hasSpoofFields(msg);
  }

  var api = {
    IGNORE_RADIUS: IGNORE_RADIUS,
    DAY_SECONDS: DAY_SECONDS,
    MIRACLE_DURATION: MIRACLE_DURATION,
    TRIAL_DURATION: TRIAL_DURATION,
    OMEN_DURATION: OMEN_DURATION,
    SPOOF_FIELDS: SPOOF_FIELDS,
    farmIntervalMinutes: farmIntervalMinutes,
    farmDueAt: farmDueAt,
    farmDueIn: farmDueIn,
    clockOf: clockOf,
    periodOfHour: periodOfHour,
    periodOfCycle: periodOfCycle,
    timeOfDay: timeOfDay,
    deriveMood: deriveMood,
    moodOf: moodOf,
    resetRun: resetRun,
    scheduleWindows: scheduleWindows,
    tick: tick,
    shouldRefuseFeed: shouldRefuseFeed,
    noteMonHit: noteMonHit,
    noteKill: noteKill,
    noteFaintSignal: noteFaintSignal,
    onFarmCycle: onFarmCycle,
    attachStats: attachStats,
    emptyDiscoveries: emptyDiscoveries,
    normalizeDiscoveries: normalizeDiscoveries,
    edgeKey: edgeKey,
    discoveryKey: discoveryKey,
    noteDiscovery: noteDiscovery,
    isEggForm: isEggForm,
    partyCount: partyCount,
    shouldBrawl: shouldBrawl,
    isSpoof: isSpoof,
    hasSpoofFields: hasSpoofFields
  };

  D.net = D.net || {};
  D.net.rarity = api;
  if (isNode) module.exports = api;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
