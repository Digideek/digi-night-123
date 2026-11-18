#!/usr/bin/env node
/* Headless brawl outcome determinism, forged winner/choice rejection,
 * farm→brawl→farm sequence, mega/merchant authority ownership.
 * In-process only. No ports, no cloud. */
"use strict";
const path = require("path");
const root = path.join(__dirname, "..");
const mission = require(path.join(root, "js/net/mission-sim.js"));
const authMod = require(path.join(root, "js/net/authority.js"));

function dataFixture() {
  return {
    SPECIES: {
      agumon: { name: "Agumon", stage: "Rookie", base: { maxHp: 40 }, tier: 1 },
      greymon: { name: "Greymon", stage: "Champion", base: { maxHp: 80 }, tier: 2 },
      wargreymon: { name: "WarGreymon", stage: "Mega", base: { maxHp: 160 }, tier: 5 }
    },
    ENEMIES: { pagumon: { name: "Pagumon", hp: 20, speed: 40, damage: 4, contactCd: 0.7 }, wargreymon: { name: "WarGreymon", hp: 40, speed: 36, damage: 8, contactCd: 0.8 } },
    WEAPONS: { pepperBreath: { maxLevel: 5, name: "Pepper Breath", levels: [{ damage: 10, cooldown: 0.7, count: 1, speed: 340, pierce: 0, radius: 6, spread: 0.16, knockback: 40, life: 1.2 }] } },
    STAT_UPGRADES: { damageMul: { name: "Power", maxLevel: 5, summary: "" } },
    MEGA_SPAWN: { firstAt: 0, interval: 0.08, cooldown: 0, maxOnScreen: 1, hpMul: 8, dmgMul: 1.45, includeMegaPlus: true },
    SHOP: { firstAt: 0, every: 10, linger: 8, merchantId: "jijimon", catalog: [{ id: "meatPack", kind: "food", food: "meat", count: 3, price: 10 }] },
    FOOD: { meat: { fullness: 20, happiness: 4 } },
    CARE: { fullnessDecayPerSec: 0, fullnessMax: 100, happinessMax: 100 },
    BRAWL_CFG: { partyCap: 6, maxPlayers: 6, alwaysDownBots: 1, soloMode: "skip", oddsSeconds: 0.08, reviveSeconds: 0.04, maxFightSeconds: 40, baseHp: 96, baseDamage: 11, regenPerSec: 2.2, attackCd: 0.48, botCount: 0 },
    DIGIBITS: { name: "DigiBits", winReward: 8, betPool: 6, minBetPayout: 1 },
    tierOf: function (form) { return form === "wargreymon" ? 5 : 1; },
    brawlMods: function () { return { hpMul: 1, regen: 1, extraMove: 0 }; }
  };
}

function makeAuth(seed, store) {
  store = store || { acc: null };
  const data = dataFixture();
  const sim = new mission.MissionSim({ hz: 25, seed: seed || 11, viewW: 1280, viewH: 720, data: data });
  const authority = new authMod.Authority({
    sim: sim, hz: 25, seed: seed || 11, mission: true, data: data,
    account: { digiBits: 0, unlocked: {}, legendaryDropped: false, settledPayouts: {} },
    persist: function (acc) { store.acc = JSON.parse(JSON.stringify(acc)); }
  });
  authority.join({ id: "p0", kind: "host-client", hasTamer: true, form: "agumon", x: 0, y: 0, hp: 80, maxHp: 80, tamerHp: 100, tamerMaxHp: 100 });
  return { authority: authority, sim: sim, data: data, store: store, p: sim.player("p0") };
}

function roster() {
  return [
    { id: "p0", form: "agumon", kind: "host-client" },
    { id: "cpu1", form: "greymon", kind: "bot" },
    { id: "cpu2", form: "wargreymon", kind: "bot" },
    { id: "cpu3", form: "agumon", kind: "bot" }
  ];
}

function runBrawl(seed) {
  const A = makeAuth(seed);
  A.authority.act({ type: "brawl.begin", id: "p0", matchId: "det-" + seed, origin: { x: 0, y: 0 }, players: roster() });
  A.authority.act({ type: "brawl.ready", id: "p0" });
  let g = 0;
  while (A.sim.brawlSim && !A.sim.brawlSim.match.winnerId && g < 2500) { A.authority.step(); g++; }
  const snap = A.sim.brawlSim.snapshot();
  return {
    winnerId: snap.winnerId,
    settled: snap.settled,
    hp: snap.fighters.map(function (f) { return f.id + ":" + Math.round(f.hp * 10) + ":" + (f.ko ? "ko" : "ok") + ":" + Math.round(f.x) + "," + Math.round(f.y); }).join("|"),
    ticks: g
  };
}

function assert(cond, msg) { if (!cond) throw new Error(msg); }

function main() {
  const a = runBrawl(11);
  const b = runBrawl(11);
  assert(a.winnerId, "seed 11 produced a winner");
  assert(a.winnerId === b.winnerId, "same seed same winner");
  assert(a.hp === b.hp, "same seed same fighter outcome snapshot");
  const c = runBrawl(29);
  /* Different seeds may or may not differ; require the sim finished. */
  assert(c.winnerId, "seed 29 produced a winner");
  console.log("ok brawl determinism (seed 11 winner " + a.winnerId + " in " + a.ticks + " ticks)");

  const F = makeAuth(13);
  const forged = F.authority.act({ type: "brawl.conclude", winnerId: "p0", liveIds: ["p0"] });
  assert(!forged.ok, "forged winner rejected before a match");
  F.p.pendingFarm = true;
  F.authority.act({ type: "brawl.begin", id: "p0", matchId: "seq-1", players: roster() });
  assert(F.sim.phase === "brawl", "brawl phase");
  const farmDuring = F.authority.act({ type: "farm.enter", id: "p0", scheduled: true });
  assert(!farmDuring.ok && farmDuring.queued, "farm queues during brawl");
  assert(F.p.pendingFarm === true, "pendingFarm queued");
  F.authority.act({ type: "brawl.ready", id: "p0" });
  let g = 0;
  while (!F.sim.brawlSim.match.winnerId && g < 2500) { F.authority.step(); g++; }
  assert(F.sim.brawlSim.match.settled, "settled");
  F.authority.progression.endBrawlPhase();
  assert(F.sim.phase === "playing", "back to playing");
  assert(F.p.pendingFarm === true, "farm still queued after brawl");
  const entered = F.authority.act({ type: "farm.enter", id: "p0", scheduled: true });
  assert(entered.ok && F.sim.phase === "farm", "farm starts after brawl");
  console.log("ok farm/brawl/farm sequence");

  const M = makeAuth(3);
  M.p.bits = 40;
  for (let i = 0; i < 4; i++) M.authority.step();
  const megas = M.sim.enemies.filter(function (e) { return e.mega; });
  assert(megas.length === 1, "authority spawned one field mega (maxOnScreen 1)");
  assert(megas[0].maxHp >= 40 * 8, "rare mega keeps configured hpMul");
  assert(M.sim.merchant && M.sim.merchant.open, "authority placed merchant in the open window");
  const shop = M.authority.act({ type: "shop.buy", id: "p0", item: "meatPack" });
  assert(shop.ok, "shop buy legal while merchant window is open");
  M.sim.time = 9;
  M.sim._updateMerchant();
  assert(!M.sim.merchant, "merchant clears when the window closes");
  const shopLate = M.authority.act({ type: "shop.buy", id: "p0", item: "meatPack" });
  assert(!shopLate.ok, "shop buy rejected outside the authority window");
  console.log("ok field-mega and merchant window");

  /* URL-style debug flags on a client intent are ignored. */
  const Dbg = makeAuth(4);
  const force = Dbg.authority.act({ type: "capture", id: "p0", force: true, roll: 0, debug: true });
  assert(!force.ok, "production authority ignores client force/roll/debug");
  console.log("ok production ignores client debug assertions");

  console.log("brawl-auth-test: all passed");
}

main();
