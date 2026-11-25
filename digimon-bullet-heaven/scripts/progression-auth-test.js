#!/usr/bin/env node
/* Forged reward/form/training/capture rejection, farm auto-return /
 * care mistake, brawl -> farm queue, payout idempotency on reload.
 * In-process only. No ports, no cloud. */
"use strict";
const path = require("path");
const root = path.join(__dirname, "..");
const mission = require(path.join(root, "js/net/mission-sim.js"));
const authMod = require(path.join(root, "js/net/authority.js"));

function dataFixture() {
  return {
    SPECIES: {
      digitama: { name: "Digitama", stage: "Egg", hatchTo: "agumon" },
      agumon: { name: "Agumon", stage: "Rookie", base: { maxHp: 40 } },
      greymon: { name: "Greymon", stage: "Champion", base: { maxHp: 80 } },
      wargreymon: { name: "WarGreymon", stage: "Mega", base: { maxHp: 160 } },
      pagumon: { name: "Pagumon", base: { maxHp: 30 } }
    },
    WEAPONS: { pepperBreath: { maxLevel: 5 } },
    ENEMIES: { pagumon: {}, megaboss: { boss: true } },
    CAPTURE: { hpThreshold: 0.35, reserveMax: 3 },
    captureKoNeeded: function () { return 40; },
    captureChance: function () { return 0.55; },
    pickEvolution: function (form, stats) {
      if (form === "agumon" && (stats.offense || 0) >= 10) return { to: "greymon", kind: "standard" };
      return null;
    },
    tierOf: function (form) { return form === "wargreymon" ? 5 : 1; },
    SHOP: {
      catalog: [{ id: "meatPack", kind: "food", food: "meat", count: 3, price: 10 }],
      firstAt: 90, every: 90, linger: 20
    },
    FOOD: { meat: { fullness: 20, happiness: 4 } },
    CARE: { fullnessDecayPerSec: 1.05, fullnessMax: 100, happinessMax: 100 },
    FARM_CFG: {
      stayCapSeconds: 2,
      hungerDrainMult: 0.05,
      careMistakeFullnessRatio: 0.3,
      trainCooldown: 8,
      trainJoy: 6,
      stations: {
        bag:   { id: "bag",   x: 260, y: 430, stat: "offense", gain: 12, diminish: 0.65, timeCost: 6, fullnessCost: 8 },
        board: { id: "board", x: 520, y: 250, stat: "intelligence", gain: 12, diminish: 0.65, timeCost: 6, fullnessCost: 6 },
        track: { id: "track", x: 1248, y: 420, cx: 660, cy: 420, rx: 588, ry: 328, width: 44, inset: 30, lapsTarget: 1.25, stat: "agility", gain: 12, diminish: 0.65, timeCost: 8, fullnessCost: 8 },
        bond:  { id: "bond",  x: 1020, y: 480, stat: "bond", gain: 10, diminish: 0.7, timeCost: 8, fullnessCost: 0 }
      },
      yardW: 1320,
      yardH: 820
    },
    DIGIBITS: { name: "DigiCoins", winReward: 8, betPool: 6, minBetPayout: 1 }
  };
}

function makeAuth(opts) {
  opts = opts || {};
  const data = opts.data || dataFixture();
  const store = opts.store || { acc: null };
  const sim = new mission.MissionSim({ hz: 25, seed: opts.seed || 7, viewW: 1280, viewH: 720, data: data });
  const authority = new authMod.Authority({
    sim: sim,
    hz: 25,
    seed: opts.seed || 7,
    mission: true,
    data: data,
    account: opts.account || { digiBits: 0, unlocked: {}, legendaryDropped: false, settledPayouts: {} },
    persist: function (acc) { store.acc = JSON.parse(JSON.stringify(acc)); }
  });
  authority.join({
    id: "p0", kind: "host-client", hasTamer: true, form: opts.form || "agumon",
    x: 0, y: 0, hp: 80, maxHp: 80, tamerHp: 100, tamerMaxHp: 100
  });
  return { authority: authority, sim: sim, data: data, store: store, p: sim.player("p0") };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function main() {
  /* ---- Forged intents ---- */
  const A = makeAuth();
  const auth = A.authority;
  const p = A.p;
  const rejects = [];
  function mustReject(msg, label) {
    const r = auth.onMessage(msg);
    if (r.ok) throw new Error("accepted forged: " + label);
    rejects.push(label);
  }
  mustReject({ type: "grantBits", id: "p0", grantBits: 9999 }, "grantBits");
  mustReject({ type: "legendaryDrop", id: "p0" }, "legendaryDrop");
  mustReject({ type: "syncHost", id: "p0", form: "wargreymon", bits: 9999, weapons: [{ id: "x", level: 9 }] }, "syncHost");
  mustReject({ type: "setForm", id: "p0", form: "wargreymon" }, "setForm");
  mustReject({ type: "trainGrant", id: "p0", trainStats: { offense: 99 } }, "trainGrant");
  mustReject({ type: "brawl.settle", id: "p0", winnerId: "p0", defeatedLegendary: true }, "brawl.settle");
  mustReject({ type: "brawl.payout", id: "p0", amount: 99 }, "brawl.payout");
  mustReject({ type: "brawl.award", id: "p0" }, "brawl.award");
  const sr = auth.syncHost({ form: "wargreymon" });
  assert(!sr.ok, "syncHost method must reject");
  p.bag = { dataChip: 1 };
  p.captureKills = 40;
  const foe = A.sim.spawnEnemy("pagumon", { x: 4, y: 0 });
  foe.hp = Math.floor(foe.maxHp * 0.1);
  const capForce = auth.act({ type: "capture", id: "p0", enemyId: foe._id, force: true, roll: 0, chance: 1, free: true });
  assert(!capForce.ok, "forced capture must reject");
  assert(p.bag.dataChip === 1, "forced capture must not consume chip");
  const trainForge = auth.act({ type: "farm.trainStart", id: "p0", station: "track", gain: 99, trainStats: { agility: 50 }, score: 1 });
  assert(!trainForge.ok, "forged training payload must reject");
  const hatchForge = auth.act({ type: "hatch", id: "p0", to: "wargreymon" });
  assert(!hatchForge.ok, "hatch while not egg must fail");
  p.form = "digitama";
  p.hatchLeft = 0;
  const hatchTo = auth.act({ type: "hatch", id: "p0", to: "wargreymon" });
  assert(!hatchTo.ok, "forged hatch target must reject");
  assert(p.form === "digitama", "forged hatch must not change form");
  const hatchOk = auth.act({ type: "hatch", id: "p0" });
  assert(hatchOk.ok && p.form === "agumon", "valid hatch to species hatchTo");
  p.trainStats = { offense: 10, intelligence: 0, agility: 0 };
  p.evoLock = 0;
  const evoForge = auth.act({ type: "evolve", id: "p0", to: "wargreymon" });
  assert(!evoForge.ok, "forged evo target must reject");
  assert(p.form === "agumon", "forged evo must not change form");
  const evoOk = auth.act({ type: "evolve", id: "p0" });
  assert(evoOk.ok && p.form === "greymon", "valid evo follows pickEvolution");
  A.sim.pendingLevels = 1;
  p.pendingLevels = 1;
  const badLv = auth.act({ type: "levelup", id: "p0", kind: "weapon", choice: "invented-cannon" });
  assert(!badLv.ok, "level-up without offer token must reject");
  const forgedTok = auth.act({ type: "levelup", id: "p0", token: "forged-token" });
  assert(!forgedTok.ok, "forged offer token must reject");
  auth.progression.rollOffers(p);
  assert(p.levelOffers && p.levelOffers.length, "authority rolled offers");
  const tok = p.levelOffers[0].token;
  const okLv = auth.act({ type: "levelup", id: "p0", token: tok });
  assert(okLv.ok, "offered token accepted once");
  const reuse = auth.act({ type: "levelup", id: "p0", token: tok });
  assert(!reuse.ok, "spent token cannot be reused");
  p.bits = 100;
  const shopClosed = auth.act({ type: "shop.buy", id: "p0", item: "meatPack" });
  assert(!shopClosed.ok, "shop buy outside farm/merchant rejected");
  auth.act({ type: "farm.enter", id: "p0" });
  const shopOk = auth.act({ type: "shop.buy", id: "p0", item: "meatPack" });
  assert(shopOk.ok && p.bits === 90 && p.bag.meat >= 3, "validated shop spend");
  const shopUnknown = auth.act({ type: "shop.buy", id: "p0", item: "legendary-omen" });
  assert(!shopUnknown.ok, "unknown/legendary shop item rejected");
  console.log("ok forged-intent rejection (" + rejects.length + " onMessage types) and valid hatch/evo/level/shop");

  /* ---- Farm auto-return + care mistake + training ---- */
  const F = makeAuth();
  const fp = F.p;
  fp.fullness = 34;                       /* 17z33: it won't train under a third full; 34 - 8 for the track leaves it hungry */
  fp.happiness = 50;
  fp.careMistakes = 0;
  const ent = F.authority.act({ type: "farm.enter", id: "p0", scheduled: true });
  assert(ent.ok && F.sim.farm.active, "farm.enter");
  const forgedTrain = F.authority.act({ type: "farm.trainStart", id: "p0", station: "track", gain: 40 });
  assert(!forgedTrain.ok, "trainStart with gain rejected");
  const start = F.authority.act({ type: "farm.trainStart", id: "p0", station: "track" });
  assert(start.ok, "valid trainStart");
  const agi0 = (fp.trainStats && fp.trainStats.agility) || 0;
  F.authority.act({ type: "farm.tick", id: "p0", dt: 8, inp: { x: 1, y: 0 } });
  /* stayCap is 2s so tick(8) auto-returns (and finishes the lap). */
  assert(!F.sim.farm.active, "auto-return after stay elapsed");
  assert(F.sim.phase === "playing", "phase returns to playing");
  assert(fp.careMistakes === 1, "hungry unfed auto-return is a care mistake");
  assert(fp.trainStats.agility > agi0, "authority granted track agility (not client payload)");
  const laps = start.activity ? null : null;
  /* Second return is idempotent — no double mistake. */
  const ret2 = F.authority.act({ type: "farm.return", id: "p0" });
  assert(ret2.ok && ret2.already, "farm.return idempotent after auto-return");
  assert(fp.careMistakes === 1, "no duplicate care mistake");
  /* 17z33: the track is the Rockfall Run mini game (12 s), resolved on the authority */
  const G = makeAuth();
  G.data.FARM_CFG.stayCapSeconds = 20;
  G.authority.act({ type: "farm.enter", id: "p0" });
  G.authority.act({ type: "farm.trainStart", id: "p0", station: "track" });
  G.authority.act({ type: "farm.tick", id: "p0", dt: 15, inp: { x: 0, y: 0 } });
  assert((G.p.trainStats.agility || 0) > 0, "track training resolved on authority");
  console.log("ok farm auto-return, care mistake, idempotent return, track training");

  /* ---- Brawl rules: sim-owned winner, cap, revive, bets, farm queue, payout reload ---- */
  const persist = { acc: null };
  const B = makeAuth({ account: { digiBits: 0, unlocked: {}, legendaryDropped: false, settledPayouts: {} }, store: persist });
  B.p.pendingFarm = true;
  const seven = [];
  for (let i = 0; i < 7; i++) {
    seven.push({
      id: i === 0 ? "p0" : "cpu" + i,
      form: i === 2 ? "wargreymon" : "agumon",
      kind: i === 0 ? "host-client" : "bot",
      hasTamer: true
    });
  }
  const began = B.authority.act({ type: "brawl.begin", id: "p0", matchId: "brawl-test-1", players: seven });
  assert(began.ok && !began.skipped, "brawl.begin");
  assert(B.sim.brawl.fighters.length === 6, "six-player cap drops the 7th");
  B.sim.brawl.fighters.forEach(function (f) {
    if (f.kind === "bot") assert(f.hasTamer === false, "CPU has no tamer");
  });
  const revivedN = B.sim.brawl.fighters.filter(function (f) { return f.revived; }).length;
  const deadN = B.sim.brawl.fighters.filter(function (f) { return !f.fighting; }).length;
  if (deadN + revivedN > 0) assert(revivedN <= 1, "exactly one revive if anyone is dead");
  const pick2 = B.authority.progression.pickRevive();
  assert(!pick2, "no second revive");
  const liveF = B.sim.brawl.fighters.filter(function (f) { return f.fighting; });
  const sitF = B.sim.brawl.fighters.filter(function (f) { return !f.fighting; })[0];
  const betSelf = B.authority.act({ type: "brawl.bet", id: "p0", targetId: liveF[0] && liveF[0].id });
  assert(!betSelf.ok, "fighting player cannot bet");
  if (sitF && liveF[0]) {
    const betOk = B.authority.act({ type: "brawl.bet", id: sitF.id, targetId: liveF[0].id });
    assert(betOk.ok, "spectator bet accepted");
    const badBet = B.authority.act({ type: "brawl.bet", id: sitF.id, targetId: sitF.id });
    assert(!badBet.ok, "cannot bet on a non-fighter");
  }
  const msgConc = B.authority.onMessage({
    type: "brawl.conclude", id: "p0", liveIds: ["p0"], winnerId: "p0", defeatedLegendary: true
  });
  assert(!msgConc.ok, "client brawl.conclude rejected");
  const actConc = B.authority.act({ type: "brawl.conclude", liveIds: ["p0"], winnerId: "p0", defeatedLegendary: true });
  assert(!actConc.ok, "act() may not nominate a winner");
  assert(B.authority.progression.account.digiBits === 0, "no payout from forged conclude");
  B.authority.act({ type: "brawl.ready", id: "p0" });
  let guard = 0;
  while (!B.sim.brawlSim.match.winnerId && guard < 2000) { B.authority.step(); guard++; }
  assert(B.sim.brawlSim.match.winnerId, "authority fight produced a winner");
  assert(B.sim.brawlSim.match.settled, "authority settled from the sim, not a client name");
  const payout = B.sim.brawlSim.match.payout;
  assert(payout && payout.awards.some(function (a) { return a.reason === "win"; }), "win award");
  assert(B.p.pendingFarm === true, "pendingFarm preserved through brawl");
  assert(B.sim.phase === "brawl", "phase stays brawl until payout UI ends");
  B.authority.progression.endBrawlPhase();
  assert(B.sim.phase === "playing", "brawl -> playing so farm can queue");
  const bitsAfter = B.authority.progression.account.digiBits;
  const dropAfter = B.authority.progression.account.legendaryDropped;
  const saved = persist.acc;
  assert(saved && saved.settledPayouts["brawl-test-1"], "provider received authority-validated payout");
  const again = B.authority.progression.concludeFromSim();
  assert(again.ok && again.already, "in-session conclude is idempotent");
  assert(B.authority.progression.account.digiBits === bitsAfter, "no duplicate bits in session");

  /* Reload: new authority, same guest cache, same matchId must not double-pay. */
  const R = makeAuth({ account: saved, store: persist });
  R.p.pendingFarm = true;
  R.authority.act({
    type: "brawl.begin", id: "p0", matchId: "brawl-test-1",
    players: [
      { id: "p0", form: "agumon", kind: "host-client" },
      { id: "cpu1", form: "wargreymon", kind: "bot" }
    ]
  });
  R.authority.act({ type: "brawl.ready", id: "p0" });
  guard = 0;
  while (!R.sim.brawlSim.match.winnerId && guard < 2000) { R.authority.step(); guard++; }
  assert(R.authority.progression.account.digiBits === bitsAfter, "reload does not double-pay DigiCoins");
  assert(R.authority.progression.account.legendaryDropped === dropAfter, "reload does not re-grant legendary set");
  console.log("ok brawl cap/revive/bets/sim winner, farm queue, payout idempotency");

  console.log("progression-auth-test: all passed");
}

main();
