#!/usr/bin/env node
/* Rarity spoof rejection, farm interval schedule vs cumulative stamps,
 * lifecycle due under simulated lag, discovery/unlock replay idempotency.
 * In-process only. No ports, no cloud. */
"use strict";
const path = require("path");
const root = path.join(__dirname, "..");
const mission = require(path.join(root, "js/net/mission-sim.js"));
const authMod = require(path.join(root, "js/net/authority.js"));
const rarity = require(path.join(root, "js/net/rarity-sim.js"));
const tr = require(path.join(root, "js/net/transport.js"));

function dataFixture() {
  return {
    SPECIES: {
      digitama: { name: "Digitama", stage: "Egg", hatchTo: "agumon" },
      agumon: { name: "Agumon", stage: "Rookie", base: { maxHp: 40 } },
      greymon: { name: "Greymon", stage: "Champion", base: { maxHp: 80 } },
      metalgreymon: {
        name: "MetalGreymon", stage: "Ultimate", base: { maxHp: 120 },
        unlock: { type: "evolveTo", form: "greymon" }
      }
    },
    WEAPONS: { pepperBreath: { maxLevel: 5, levels: [{ dmg: 4, cooldown: 0.4 }] } },
    ENEMIES: { pagumon: {} },
    CARE: { fullnessDecayPerSec: 1.05, fullnessMax: 100, happinessMax: 100 },
    FOOD: { meat: { fullness: 20, happiness: 4 } },
    FARM_CFG: {
      intervalMinutes: [3, 6, 10],
      intervalPlus: 4,
      stayCapSeconds: 45,
      careMistakeFullnessRatio: 0.3,
      hungerDrainMult: 0.05,
      yardW: 1320,
      yardH: 820,
      warnAt: [15, 5],
      stations: {}
    },
    BRAWL: { everyLevels: 1, minLevel: 2, skipEgg: true, soloMode: "bonus", resultSeconds: 0.2, payoutSeconds: 0.2 },
    pickEvolution: function (form, stats) {
      if (form === "agumon") return { to: "greymon", kind: "standard" };
      return null;
    },
    tierOf: function (form) { return 1; },
    DIGIBITS: { name: "DigiCoins", winReward: 8, betPool: 6, minBetPayout: 1 }
  };
}

function makeAuth(opts) {
  opts = opts || {};
  const data = opts.data || dataFixture();
  const store = opts.store || { acc: null, n: 0 };
  const sim = new mission.MissionSim({
    hz: 25, seed: opts.seed || 11, viewW: 1280, viewH: 720, data: data,
    clockHour: opts.clockHour != null ? opts.clockHour : 3
  });
  const authority = new authMod.Authority({
    sim: sim,
    hz: 25,
    seed: opts.seed || 11,
    mission: true,
    data: data,
    clockHour: opts.clockHour != null ? opts.clockHour : 3,
    account: opts.account || { digiBits: 0, unlocked: {}, legendaryDropped: false, settledPayouts: {}, discoveries: { species: {}, edges: {} }, speciesUnlocks: {}, settledDiscoveries: {} },
    persist: function (acc) { store.acc = JSON.parse(JSON.stringify(acc)); store.n += 1; }
  });
  authority.join({
    id: "p0", kind: "host-client", hasTamer: true, form: opts.form || "agumon",
    x: 0, y: 0, mx: 10, my: 0, hp: 80, maxHp: 80, tamerHp: 100, tamerMaxHp: 100,
    fullness: opts.fullness != null ? opts.fullness : 80,
    happiness: opts.happiness != null ? opts.happiness : 60
  });
  return { authority: authority, sim: sim, data: data, store: store, p: sim.player("p0") };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function eventsOf(auth, type) {
  const ev = (auth.sim && auth.sim.events) || [];
  return ev.filter(function (e) { return e.type === type; });
}

function main() {
  /* ---- Interval math: 3, +6, +10, +14… of battle time, not t=3/6/10 stamps. ---- */
  const cfg = { intervalMinutes: [3, 6, 10], intervalPlus: 4 };
  assert(rarity.farmIntervalMinutes(0, cfg) === 3, "interval 0 is 3");
  assert(rarity.farmIntervalMinutes(1, cfg) === 6, "interval 1 is 6");
  assert(rarity.farmIntervalMinutes(2, cfg) === 10, "interval 2 is 10");
  assert(rarity.farmIntervalMinutes(3, cfg) === 14, "interval 3 is 14");
  assert(rarity.farmIntervalMinutes(4, cfg) === 18, "interval 4 is 18");
  let rec = { lastFarmAt: 0, farmVisitIndex: 0 };
  assert(rarity.farmDueAt(rec, cfg) === 180, "first due at 3 min");
  rec = { lastFarmAt: 180, farmVisitIndex: 1 };
  assert(rarity.farmDueAt(rec, cfg) === 540, "second due is +6 min of battle time (540), not the 6-min stamp (360)");
  rec = { lastFarmAt: 540, farmVisitIndex: 2 };
  assert(rarity.farmDueAt(rec, cfg) === 1140, "third due is +10 min (1140), not the 10-min stamp (600)");
  rec = { lastFarmAt: 1140, farmVisitIndex: 3 };
  assert(rarity.farmDueAt(rec, cfg) === 1980, "fourth due is +14 min");
  console.log("ok farm interval math vs cumulative timestamps");

  /* ---- Live schedule on authority battle clock. ---- */
  const F = makeAuth({ seed: 11 });
  F.sim.time = 179.96;
  let pendingAt360 = false;
  let due180 = false;
  for (let i = 0; i < 12; i++) {
    F.authority.step();
    if (Math.abs(F.sim.time - 360) < 0.1) pendingAt360 = !!F.p.pendingFarm || F.sim.phase === "farm";
    if (F.sim.time >= 180 && (F.p.pendingFarm || F.sim.phase === "farm" || eventsOf(F.authority, "farm.due").length)) due180 = true;
  }
  assert(due180, "farm due fires at 180s of battle time");
  /* Auto-start may already have entered. If still playing, enter now. */
  if (F.sim.phase !== "farm") {
    const ent = F.authority.act({ type: "farm.enter", id: "p0", scheduled: true });
    assert(ent.ok, "scheduled enter once due");
  }
  assert(F.sim.phase === "farm", "phase farm after due enter");
  assert(F.p.farmVisitIndex === 1, "visit index increments on scheduled enter");
  assert(Math.abs(F.p.lastFarmAt - 180) < 0.6, "lastFarmAt stamped to battle time ~180, got " + F.p.lastFarmAt);
  const due2 = rarity.farmDueAt(F.p, F.data.FARM_CFG);
  assert(Math.abs(due2 - (F.p.lastFarmAt + 360)) < 0.01, "next due is lastFarmAt + 6 min");
  F.authority.act({ type: "farm.return", id: "p0" });
  assert(F.sim.phase === "playing", "returned to playing");
  /* Jump toward the naive 6-min stamp: must NOT be due. */
  F.sim.time = 359.9;
  F.p.pendingFarm = false;
  for (let i = 0; i < 8; i++) F.authority.step();
  assert(F.sim.time >= 360, "crossed 360s, got " + F.sim.time);
  assert(!F.p.pendingFarm && F.sim.phase !== "farm", "not due at cumulative 6-min stamp");
  /* Jump to lastFarmAt + 6 min. */
  F.sim.time = F.p.lastFarmAt + 360 - 0.06;
  let due540 = false;
  for (let i = 0; i < 10; i++) {
    F.authority.step();
    if (F.p.pendingFarm || F.sim.phase === "farm") due540 = true;
  }
  assert(due540, "second visit due after another 6 minutes of battle time");
  if (F.sim.phase !== "farm") F.authority.act({ type: "farm.enter", id: "p0", scheduled: true });
  assert(F.p.farmVisitIndex === 2, "second scheduled visit");
  F.authority.act({ type: "farm.return", id: "p0" });
  const due3 = rarity.farmDueAt(F.p, F.data.FARM_CFG);
  assert(Math.abs(due3 - (F.p.lastFarmAt + 600)) < 0.01, "third gap is 10 minutes");
  console.log("ok farm due on battle-time intervals (not 3/6/10 stamps)");

  /* ---- Rarity tick + spoof rejection + deterministic clock / windows. ---- */
  const R = makeAuth({ seed: 11, clockHour: 3 });
  /* Dist > 220 so ignoredSeconds accrue. */
  R.p.x = 0; R.p.y = 0; R.p.mx = 400; R.p.my = 0;
  const ign0 = R.p.ignoredSeconds || 0;
  /* Hold the partner away: it now keeps pace with the tamer when following. */
  for (let i = 0; i < 50; i++) { R.p.mx = 400; R.p.my = 0; R.authority.step(); } /* 2s */
  assert((R.p.ignoredSeconds || 0) >= ign0 + 1.5, "authority tick accrues ignoredSeconds");
  assert(R.p.mood, "mood authored");
  assert(typeof R.p.bond === "number", "bond authored");
  const miracleAt = 80 + (11 % 90);
  assert(R.p.windows && R.p.windows.miracle.at === miracleAt, "window open time from worldSeed");
  R.sim.time = miracleAt - 0.04;
  for (let i = 0; i < 8; i++) R.authority.step();
  assert(R.p.windows.miracle.open, "miracle window opens at scheduled battle time");
  const clock = R.sim._clock();
  assert(clock.hour === 3, "clock hour is host input, not Date");
  const tod = rarity.timeOfDay(R.p, clock);
  assert(tod.real === "dawn" || tod.real === "night", "hour 3 is night (deterministic)");
  const R2 = makeAuth({ seed: 11, clockHour: 3 });
  R2.sim.time = R.sim.time;
  const tod2 = rarity.timeOfDay(R2.p, R2.sim._clock());
  assert(tod.cycle.toFixed(5) === tod2.cycle.toFixed(5) && tod.real === tod2.real, "same seed/hour/time => same clock");
  const spoofTypes = [
    { type: "rarity.spoof", mood: "rapt" },
    { type: "setMood", mood: "rapt" },
    { type: "setClock", clockHour: 12 },
    { type: "grantUnlock", form: "metalgreymon" },
    { type: "noteDiscovery", to: "greymon" },
    { type: "scheduleFarm", pendingFarm: true }
  ];
  spoofTypes.forEach(function (msg) {
    const r = R.authority.act(Object.assign({ id: "p0" }, msg));
    assert(!r.ok, "act spoof rejected: " + msg.type);
  });
  const onMsg = R.authority.onMessage({ type: "input", id: "p0", ignoredSeconds: 999, mood: "rapt", bond: 100, windows: { omen: { open: true } } });
  assert(!onMsg.ok, "onMessage rarity spoof fields rejected");
  assert((R.p.ignoredSeconds || 0) < 999, "ignoredSeconds not overwritten by client");
  const pauseMsg = R.authority.onMessage({ type: "pause", id: "p0" });
  assert(!pauseMsg.ok && pauseMsg.reason === "pause-is-local", "wire pause does not freeze game time");
  const tPause = R.sim.time;
  for (let i = 0; i < 5; i++) R.authority.step();
  assert(R.sim.time > tPause, "network/authority time advances after client pause message");
  R.authority.setLocalPause(true);
  const tLocal = R.sim.time;
  const tickLocal = R.authority.tick;
  for (let i = 0; i < 10; i++) R.authority.step();
  assert(R.sim.time === tLocal && R.authority.tick === tickLocal, "solo local pause freezes in-process game time only");
  R.authority.setLocalPause(false);
  R.authority.step();
  assert(R.sim.time > tLocal, "local unpause resumes");
  console.log("ok rarity tick, spoof rejection, deterministic clock, pause split");

  /* ---- Care rule: refused meal is not a care mistake. ---- */
  const C = makeAuth();
  C.p.fullness = 5;
  C.p.happiness = 40;
  C.p.starveCycles = 1;
  C.p.bag = { meat: 2 };
  C.authority.act({ type: "farm.enter", id: "p0" });
  /* fullness 5 <= 15: never refuse when dying of hunger. Feed, then re-starve style. */
  C.authority.act({ type: "farm.return", id: "p0" });
  const C2 = makeAuth();
  C2.p.fullness = 55;                       /* 17z33: a sulky partner only turns down food it doesn't need (over 45) */
  C2.p.happiness = 40;
  C2.p.starveCycles = 1;
  C2.p.careMistakes = 0;
  C2.p.bag = { meat: 2 };
  C2.authority.act({ type: "farm.enter", id: "p0" });
  /* 17z33 (Isaac): it never refuses; a sulking partner eats grudgingly, and that counts where a refusal did */
  const before = C2.p.fullness;
  const grudging = C2.authority.act({ type: "farm.feed", id: "p0", food: "meat" });
  assert(grudging.ok && grudging.grudge && C2.p.fullness > before && C2.p.bag.meat === 1, "a stubborn partner eats anyway, grudgingly");
  assert(C2.p.refusedFoodCycles === 1, "the grudging meal counts for the sulky routes");
  const again = C2.authority.act({ type: "farm.feed", id: "p0", food: "meat" });
  assert(again.ok && C2.p.refusedFoodCycles === 1, "once per hunger cycle, not once per meal");
  const retRefuse = C2.authority.act({ type: "farm.return", id: "p0" });
  assert(!retRefuse.careMistake && C2.p.careMistakes === 0, "fed: no care mistake");
  const C3 = makeAuth();
  C3.p.fullness = 5;
  C3.p.happiness = 50;
  C3.p.careMistakes = 0;
  C3.p.bag = { meat: 0 };
  C3.authority.act({ type: "farm.enter", id: "p0" });
  const retHungry = C3.authority.act({ type: "farm.return", id: "p0" });
  assert(retHungry.careMistake && C3.p.careMistakes === 1, "hungry unfed exit is a care mistake");
  console.log("ok hunger care rule (never refuses; a grudging meal counts once per cycle)");

  /* ---- Discoveries / unlocks persist + replay idempotency. ---- */
  const store = { acc: null, n: 0 };
  const D1 = makeAuth({ form: "digitama", store: store, seed: 11 });
  D1.p.hatchLeft = 0;
  const hat = D1.authority.act({ type: "hatch", id: "p0" });
  assert(hat.ok, "hatch ok");
  D1.p.evoLock = 0;
  const evo = D1.authority.act({ type: "evolve", id: "p0" });
  assert(evo.ok && D1.p.form === "greymon", "evolve to greymon");
  assert(store.acc && store.acc.discoveries.species.agumon, "hatch discovery persisted");
  assert(store.acc.discoveries.species.greymon, "evo discovery persisted");
  assert(store.acc.speciesUnlocks.metalgreymon, "evolveTo unlock persisted");
  const nSpecies = Object.keys(store.acc.discoveries.species).length;
  const nEdges = Object.keys(store.acc.discoveries.edges).length;
  const persists = store.n;
  /* Replay the same events against the same account. */
  const evs = D1.sim.consumeEvents().filter(function (e) { return e.type === "discover" || e.type === "unlock"; });
  evs.forEach(function (e) {
    const r = D1.authority.progression.applyAccountEvent(e);
    assert(r.ok && r.already || r.changed === false, "replay is idempotent: " + e.type);
  });
  assert(Object.keys(store.acc.discoveries.species).length === nSpecies, "replay did not duplicate species");
  assert(Object.keys(store.acc.discoveries.edges).length === nEdges, "replay did not duplicate edges");
  /* New authority, same guest account: re-hatch/evolve does not duplicate. */
  const D2 = makeAuth({ form: "digitama", account: JSON.parse(JSON.stringify(store.acc)), store: store, seed: 11 });
  D2.p.hatchLeft = 0;
  D2.authority.act({ type: "hatch", id: "p0" });
  D2.p.evoLock = 0;
  D2.authority.act({ type: "evolve", id: "p0" });
  assert(Object.keys(store.acc.discoveries.species).length === nSpecies, "re-run on reloaded account is idempotent");
  const clientGrant = D2.authority.act({ type: "noteDiscovery", id: "p0", to: "wargreymon" });
  assert(!clientGrant.ok, "client-authored discovery rejected");
  console.log("ok discovery/unlock persist + event replay idempotency (species " + nSpecies + ", persists " + persists + ")");

  /* ---- Lifecycle due under simulated lag. ---- */
  const nowRef = { t: 0 };
  const now = function () { return nowRef.t; };
  const L = makeAuth({ seed: 21 });
  const pair = tr.pairSimulated({ latencyMs: 150, jitterMs: 20, loss: 0.10, seed: 44, now: now });
  let last = null;
  let duesSeen = 0;
  pair.client.subscribe(function (msg) {
    if (!msg) return;
    last = msg;
    (msg.events || []).forEach(function (e) { if (e.type === "farm.due") duesSeen += 1; });
  });
  pair.server.subscribe(function (msg) {
    if (msg && msg.type === "input") L.authority.onMessage(msg);
    if (msg && msg.type !== "input") {
      const r = L.authority.onMessage(msg);
      /* spoof / suppress attempts */
      if (msg.pendingFarm === false || msg.type === "scheduleFarm") {
        assert(!r.ok, "client cannot suppress farm due");
      }
    }
  });
  L.authority.onSnapshot(function (snap) { pair.server.send(snap); });
  L.sim.time = 179.96;
  const hz = 25;
  for (let t = 0; t < 40; t++) {
    nowRef.t = t * (1000 / hz);
    pair.client.send({ type: "input", id: "p0", inputs: [{ seq: t + 1, x: 0, y: 0 }] });
    /* Forged suppress / spoof on the wire. */
    if (t === 5) pair.client.send({ type: "scheduleFarm", id: "p0", pendingFarm: false });
    if (t === 6) pair.client.send({ type: "input", id: "p0", pendingFarm: false, farmDueAt: 99999 });
    pair.client.flush(nowRef.t);
    pair.server.flush(nowRef.t);
    L.authority.step();
    pair.server.flush(nowRef.t);
    pair.client.flush(nowRef.t);
  }
  assert(L.p.pendingFarm || L.sim.phase === "farm", "authority still marks farm due under lag");
  /* Catch-up flush so delayed snapshots arrive. */
  pair.client.setSim({ loss: 0, latencyMs: 0, jitterMs: 0 });
  pair.server.setSim({ loss: 0, latencyMs: 0, jitterMs: 0 });
  const final = L.authority.snapshot(true);
  pair.server.send(final);
  nowRef.t += 1;
  pair.client.flush(nowRef.t);
  pair.server.flush(nowRef.t);
  assert(last, "client received a snapshot");
  const lp = (last.players || []).find(function (pl) { return pl.id === "p0"; }) || (last.players || [])[0];
  assert(lp && (lp.pendingFarm || last.phase === "farm"), "lagged client eventually sees the due flag");
  assert(duesSeen <= 2, "farm.due is not spammed (got " + duesSeen + ")");
  /* Brawl due: level up with soloMode bonus. */
  L.p.level = 2;
  L.p.lastBrawlLevel = 1;
  L.p.pendingLevels = 0;
  L.authority.progression._markBrawlDue(L.p);
  assert(L.p.pendingBrawl, "brawl due at minLevel with soloMode bonus");
  const forgedBrawl = L.authority.onMessage({ type: "scheduleBrawl", id: "p0", pendingBrawl: false });
  assert(!forgedBrawl.ok, "client cannot author brawl due");
  console.log("ok lifecycle due under 150ms/10% loss");

  /* ---- Brawl presentation timer ends the phase without a client finish(). ---- */
  const B = makeAuth({ seed: 8 });
  B.data.BRAWL = B.data.BRAWL || {};
  B.authority.act({
    type: "brawl.begin", id: "p0", matchId: "life-1",
    players: [
      { id: "p0", form: "agumon", hp: 80, maxHp: 80, hasTamer: true, kind: "client" },
      { id: "cpu1", form: "agumon", hp: 80, maxHp: 80, hasTamer: false, kind: "bot" }
    ]
  });
  if (B.sim.phase === "brawl") {
    B.authority.act({ type: "brawl.ready", id: "p0" });
    let g = 0;
    while (B.sim.phase === "brawl" && g < 2500) { B.authority.step(); g++; }
    assert(B.sim.phase === "playing", "authority presentation timer ended brawl phase without client finish()");
    console.log("ok authority phase resume timer (" + g + " ticks)");
  } else {
    console.log("ok brawl skipped in this seed; resume timer covered by handler");
  }

  console.log("ok lifecycle-auth-test");
}

main();
