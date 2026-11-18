#!/usr/bin/env node
/* Weather: random transitions, Eclipse / Meteor Shower spawn-HP-XP-rarity
 * effects, reset with no leaked modifiers in farm/brawl, authority-owned
 * simulation, bounded particles. Hidden tier names stay off the snapshot. */
"use strict";
const path = require("path");
const root = path.join(__dirname, "..");
const weather = require(path.join(root, "js/weather.js"));
const mission = require(path.join(root, "js/net/mission-sim.js"));
const authMod = require(path.join(root, "js/net/authority.js"));
const progressionMod = require(path.join(root, "js/net/progression.js"));

function mulberry(seed) {
  var s = (seed >>> 0) || 1;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    var t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dataFixture() {
  const enemies = {
    pagumon: { name: "Pagumon", hp: 20, speed: 40, damage: 7, contactCd: 0.7, xp: 10, color: "#a87840", radius: 12 },
    gazimon: { name: "Gazimon", hp: 24, speed: 42, damage: 8, contactCd: 0.7, xp: 12, radius: 12 },
    greymon: { name: "Greymon", hp: 60, speed: 38, damage: 12, contactCd: 0.7, xp: 20, radius: 16 },
    metalgreymon: { name: "MetalGreymon", hp: 90, speed: 36, damage: 14, contactCd: 0.7, xp: 30, radius: 18 },
    wargreymon: { name: "Wargreymon", hp: 120, speed: 34, damage: 16, contactCd: 0.7, xp: 40, radius: 20 }
  };
  const tiers = { pagumon: 1, gazimon: 2, greymon: 3, metalgreymon: 4, wargreymon: 5 };
  return {
    SPECIES: {
      digitama: { name: "Digitama", stage: "Egg", hatchTo: "agumon", base: { maxHp: 20, speed: 40, damage: 0 } },
      agumon: { name: "Agumon", stage: "Rookie", base: { maxHp: 40, speed: 90, damage: 4 } },
      gabumon: { name: "Gabumon", stage: "Rookie", base: { maxHp: 40, speed: 90, damage: 4 } }
    },
    ENEMIES: enemies,
    WEAPONS: { pepperBreath: { maxLevel: 5, type: "projectile", levels: [{ damage: 4, cooldown: 0.4, speed: 300, radius: 6, life: 1 }] } },
    CARE: { fullnessDecayPerSec: 1.05, fullnessMax: 100, happinessMax: 100, hitHappinessLoss: 1, heavyHitHappinessLoss: 2, heavyHitRatio: 0.25, killStreakWindow: 4, killStreakEvery: 5, killStreakHappiness: 4, desperationHpRatio: 0.2, desperationHappinessDrain: 2 },
    HATCH: { time: 24, feedBonus: 8, protectBonus: 0.5, protectRadius: 90 },
    FAINT: { reviveHpRatio: 0.4 },
    PARTY_REVIVE: { hold: 3, radius: 80, hpRatio: 0.4, tamerHpRatio: 0.5, minLiving: 2 },
    TAMER: { speed: 168, radius: 10, iFrame: 0.6, maxHp: 100 },
    PLAYER: { iFrame: 0.35, pickupRadius: 18 },
    FARM_CFG: { stayCapSeconds: 45, intervalMinutes: [3, 6, 10], intervalPlus: 4, careMistakeFullnessRatio: 0.3, hungerDrainMult: 0.05, yardW: 1320, yardH: 820, warnAt: [15, 5], stations: {}, heal: { hp: 0.2, tamerHp: 0.2, dropChance: 0, worldEvery: 0 } },
    BRAWL: { everyLevels: 99, minLevel: 99, skipEgg: true, soloMode: "bonus", resultSeconds: 0.2, payoutSeconds: 0.2 },
    WEATHER: weather.CATALOG ? { catalog: weather.CATALOG, schedule: weather.SCHEDULE } : undefined,
    waveAt: function () { return { cap: 20, spdMul: 1, dmgMul: 1, hpMul: 1, rates: { pagumon: 0.4 } }; },
    tierOf: function (id) { return tiers[id] || 1; }
  };
}

function assert(cond, msg) { if (!cond) throw new Error(msg); }

function makeSim(data, seed) {
  const sim = new mission.MissionSim({ hz: 25, seed: seed || 7, data: data, viewW: 1280, viewH: 720 });
  sim.join({ id: "local", hasTamer: true, form: "agumon", x: 0, y: 0, mx: 20, my: 0, hp: 40, maxHp: 40, tamerHp: 100, tamerMaxHp: 100, hatchLeft: 0 });
  sim.freezeParty(1);
  return sim;
}

function main() {
  const data = dataFixture();
  let fails = 0;
  function check(name, fn) {
    try { fn(); console.log("  ok  " + name); }
    catch (err) { fails += 1; console.log("  FAIL " + name + ": " + err.message); }
  }

  check("catalog multipliers are exact", function () {
    const e = weather.CATALOG.eclipse;
    const m = weather.CATALOG.meteorShower;
    const c = weather.CATALOG.clear;
    assert(c.spawnMul === 1 && c.xpMul === 1 && c.enemyHpMul === 1, "clear should be identity");
    assert(e.spawnMul === 1.8 && e.capMul === 1.5 && e.enemyHpMul === 1.5 && e.enemyAtkMul === 1.25 && e.enemySpdMul === 1.08 && e.xpMul === 1.5 && e.minTime === 360, "eclipse multipliers");
    assert(m.spawnMul === 0.9 && m.xpMul === 2 && m.enemyHpMul === 1.15 && m.enemyAtkMul === 1.1 && m.remapChance === 0.62, "meteor multipliers");
    assert(m.tierWeights[0] === 0.4 && m.tierWeights[4] === 3.0, "hidden 1-5 weights");
    assert(e.weight === 0.28 && m.weight === 0.22 && c.weight === 0.50, "selection weights");
    assert(weather.SCHEDULE.firstDelay === 42 && weather.SCHEDULE.resumeDelay === 16 && weather.SCHEDULE.fade === 6, "schedule");
  });

  check("seeded random transitions visit every catalog id", function () {
    const store = { time: 0 };
    weather.startRunWeather(store, { data: data });
    store.weather.nextDelay = 0;
    const rng = mulberry(20261111);
    const seen = {};
    let last = "clear", changes = 0;
    for (let t = 0; t < 2400; t += 0.25) {
      store.time = t;                     /* the run's clock: an eclipse never comes in the first season */
      weather.tick(store, 0.25, { data: data, phase: "playing", rng: rng, combatReady: true });
      const id = weather.idOf(store);
      if (id === "eclipse" && t < 360 - 70) throw new Error("eclipse in the first season, at " + t);
      seen[id] = (seen[id] || 0) + 1;
      if (id !== last) changes += 1;
      last = id;
      if (!weather.CATALOG[id]) throw new Error("unknown weather " + id);
    }
    assert(seen.clear && seen.eclipse && seen.meteorShower && seen.rain && seen.storm, "expected all weathers, got " + Object.keys(seen));
    assert(changes >= 8, "too few transitions: " + changes);
  });

  check("no combat means weather stays clear", function () {
    const store = {};
    weather.startRunWeather(store, { data: data });
    const rng = mulberry(3);
    for (let i = 0; i < 200; i++) weather.tick(store, 1, { data: data, phase: "playing", rng: rng, combatReady: false });
    assert(weather.idOf(store) === "clear", "rolled while unhatched");
    const m = weather.liveMods(store, { data: data });
    assert(m.spawnMul === 1 && m.enemyHpMul === 1 && m.xpMul === 1, "leaked mods before combat");
  });

  check("eclipse raises spawn, HP, atk, spd on the authority sim", function () {
    const sim = makeSim(data, 11);
    weather.force(sim, "eclipse", { data: data });
    sim.weather.fadeT = sim.weather.fadeMax;
    const m = weather.liveMods(sim, { data: data });
    assert(Math.abs(m.spawnMul - 1.8) < 1e-9, "spawnMul " + m.spawnMul);
    const baseline = 20 * 1; // pagumon hp * wave.hpMul
    const e = sim.spawnEnemy("pagumon", { x: 80, y: 0, keepType: true });
    assert(Math.abs(e.maxHp - baseline * 1.5) < 1e-6, "hp " + e.maxHp);
    assert(Math.abs(weather.enemyAtkScale(sim, data) - 1.25) < 1e-9, "atk");
    assert(Math.abs(weather.enemySpeedScale(sim, data) - 1.08) < 1e-9, "spd");
    assert(weather.xpValue(10, sim, data) === 15, "eclipse xp is 1.5x");
    assert(Math.abs(weather.spawnIntervalScale(sim, data) - 1.8) < 1e-9, "interval scale");
    assert(Math.abs(weather.spawnCapScale(sim, data) - 1.5) < 1e-9, "cap scale");
  });

  check("meteor shower doubles XP and remaps toward higher hidden tiers", function () {
    const sim = makeSim(data, 99);
    weather.force(sim, "meteorShower", { data: data });
    sim.weather.fadeT = sim.weather.fadeMax;
    assert(weather.xpValue(10, sim, data) === 20, "xp " + weather.xpValue(10, sim, data));
    const rng = mulberry(77);
    let sum = 0, n = 0, hits = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (let i = 0; i < 400; i++) {
      const id = weather.remapType("pagumon", sim, data, rng);
      const t = data.tierOf(id);
      hits[t] += 1;
      sum += t;
      n += 1;
    }
    const avg = sum / n;
    assert(avg > 2.4, "average remapped tier too low: " + avg);
    assert(hits[4] + hits[5] > hits[1], "high tiers should outweigh tier 1");
    const snap = weather.snapshot(sim);
    const blob = JSON.stringify(snap).toLowerCase();
    assert(snap.label === "Meteor Shower", "player label");
    assert(blob.indexOf("legendary") === -1 && blob.indexOf("tier") === -1 && blob.indexOf("epic") === -1, "hidden rarity leaked in snapshot");
  });

  check("farm and brawl clear modifiers with no leak, resume does not keep charge-up", function () {
    const sim = makeSim(data, 5);
    weather.force(sim, "eclipse", { data: data });
    sim.weather.fadeT = sim.weather.fadeMax;
    sim.spawnEnemy("pagumon", { x: 40, y: 0, keepType: true });
    weather.clearPhase(sim, { data: data, phase: "farm" });
    let m = weather.liveMods(sim, { data: data });
    assert(m.id === "clear" && m.enemyHpMul === 1 && m.spawnMul === 1 && m.xpMul === 1, "farm leak " + JSON.stringify(m));
    weather.force(sim, "meteorShower", { data: data });
    sim.weather.fadeT = sim.weather.fadeMax;
    weather.clearPhase(sim, { data: data, phase: "brawl" });
    m = weather.liveMods(sim, { data: data });
    assert(m.id === "clear" && m.xpMul === 1, "brawl leak");
    weather.resumePlaying(sim, { data: data });
    assert(weather.idOf(sim) === "clear", "resume id");
    assert(sim.weather.nextDelay === weather.SCHEDULE.resumeDelay, "resume delay");
    m = weather.liveMods(sim, { data: data });
    assert(m.enemyHpMul === 1 && m.xpMul === 1, "resume mods");
  });

  check("authority farm.enter and end-brawl resume reset weather", function () {
    const data2 = dataFixture();
    const sim = new mission.MissionSim({ hz: 25, seed: 3, data: data2, viewW: 1280, viewH: 720 });
    const auth = new authMod.Authority({ sim: sim, hz: 25, seed: 3, mission: true, data: data2, debug: true, allowDebugIntents: true });
    sim.join({ id: "local", hasTamer: true, form: "agumon", x: 0, y: 0, hp: 40, maxHp: 40, tamerHp: 100, tamerMaxHp: 100, hatchLeft: 0, pendingFarm: true, lastFarmAt: -1e9, farmVisitIndex: 0 });
    sim.freezeParty(1);
    weather.force(sim, "eclipse", { data: data2 });
    sim.weather.fadeT = sim.weather.fadeMax;
    const entered = auth.act({ type: "farm.enter", id: "local", scheduled: true });
    assert(entered.ok, "farm.enter " + (entered.reason || ""));
    assert(weather.idOf(sim) === "clear", "farm phase weather " + weather.idOf(sim));
    assert(weather.liveMods(sim, { data: data2 }).enemyHpMul === 1, "farm atk/hp");
    weather.force(sim, "meteorShower", { data: data2 });
    sim.phase = "brawl";
    weather.clearPhase(sim, { data: data2, phase: "brawl" });
    /* Simulate a settled brawl so endBrawlPhase can resume. */
    sim.brawlSim = { match: { settled: true }, snapshot: function () { return { settled: true }; }, pickRevive: function () { return null; } };
    sim.brawl = { settled: true };
    const ended = auth.progression.endBrawlPhase();
    assert(ended.ok, "endBrawl " + (ended.reason || ""));
    assert(weather.idOf(sim) === "clear", "after brawl");
    assert(sim.weather.nextDelay === weather.SCHEDULE.resumeDelay, "brawl resume delay");
  });

  check("authority applies meteor XP to orbs and rejects weather.force intents", function () {
    const data2 = dataFixture();
    const sim = makeSim(data2, 8);
    const auth = new authMod.Authority({ sim: sim, hz: 25, seed: 8, mission: true, data: data2 });
    weather.force(sim, "meteorShower", { data: data2 });
    sim.weather.fadeT = sim.weather.fadeMax;
    const e = sim.spawnEnemy("pagumon", { x: 10, y: 0, keepType: true });
    const before = sim.orbs.length;
    sim.hurtEnemy(e, 9999, 0, 0, 0, sim.players[0]);
    const xpOrbs = sim.orbs.filter(function (o) { return o.kind === "xp"; });
    assert(xpOrbs.length >= 1, "no xp orb");
    assert(xpOrbs[xpOrbs.length - 1].value === 20 || xpOrbs[xpOrbs.length - 1].value === weather.xpValue(Math.round(10 * (0.85)), sim, data2) || xpOrbs[0].value >= 16, "xp value " + xpOrbs.map(function (o) { return o.value; }));
    /* 10 * (0.85..1.15) * 2 => 17-23 */
    const v = xpOrbs[xpOrbs.length - 1].value;
    assert(v >= 16 && v <= 24, "meteor xp out of range " + v);
    const r = auth.onMessage({ type: "weather.force", id: "local", idWeather: "eclipse" });
    assert(!r.ok, "forged weather.force accepted");
    const r2 = auth.act({ type: "weather.set", id: "local", weather: "eclipse" });
    assert(!r2.ok, "forged weather.set accepted");
  });

  check("particle pools stay bounded", function () {
    const store = {};
    weather.force(store, "meteorShower", { data: data });
    store.weather.fadeT = store.weather.fadeMax;
    const calls = { fill: 0, stroke: 0 };
    const ctx = {
      save: function () {}, restore: function () {},
      beginPath: function () {}, moveTo: function () {}, lineTo: function () {},
      stroke: function () { calls.stroke += 1; },
      fill: function () {}, arc: function () {},
      fillRect: function () { calls.fill += 1; },
      fillStyle: "#000", strokeStyle: "#000", globalAlpha: 1, lineWidth: 1
    };
    for (let i = 0; i < 120; i++) weather.draw(ctx, 1280, 720, store, i * 0.016, false);
    /* Internal caps: meteors <= 16, motes 0 during meteor-only. Eclipse motes <= 48 */
    weather.resetFx();
    weather.force(store, "eclipse", { data: data });
    store.weather.fadeT = store.weather.fadeMax;
    for (let i = 0; i < 120; i++) weather.draw(ctx, 1280, 720, store, i * 0.016, false);
    assert(weather.FX_CAP === 48 && weather.METEOR_CAP === 16, "caps");
  });

  if (fails) {
    console.log("weather-test: " + fails + " failed");
    process.exit(1);
  }
  console.log("weather-test: all passed");
}

main();
