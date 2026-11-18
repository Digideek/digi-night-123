#!/usr/bin/env node
/* Nov 13 systems: hard evolution gates, vegetable routes, garden plant /
 * harvest on the authority, balanced diet, seed drops, stage-matched waves,
 * and the steeper XP curve. Uses the real game data. In-process only. */
"use strict";
const path = require("path");
const root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["species-catalog", "rarity", "evo-stat-gates", "evo-hardmode", "stage-waves"].forEach(function (f) {
  require(path.join(root, "js/" + f + ".js"));
});
const mission = require(path.join(root, "js/net/mission-sim.js"));
const authMod = require(path.join(root, "js/net/authority.js"));

let fails = 0;
function check(name, fn) {
  try { fn(); console.log("  ok  " + name); }
  catch (e) { fails += 1; console.log("  FAIL " + name + ": " + e.message); }
}
function assert(c, m) { if (!c) throw new Error(m); }

const good = { level: 40, meals: 80, joy: 95, happiness: 95, hpRatio: 1, careMistakes: 0, foodCounts: { meat: 10 }, formTime: 9999 };
function pick(from, extra) { return D.pickEvolution(from, Object.assign({}, good, extra || {})); }

check("Baby needs 2 minutes in form", function () {
  assert(!pick("botamon", { formTime: 110 }), "evolved before 2 min");
  assert(pick("botamon", { formTime: 125 }), "did not evolve after 2 min");
});
check("Baby needs level 3, In-Training needs level 8 and 5 minutes", function () {
  assert(!pick("botamon", { level: 2 }), "baby evolved at level 2");
  assert(pick("botamon", { level: 3 }), "baby did not evolve at level 3");
  assert(!pick("koromon", { level: 7 }), "in-training evolved at level 7");
  assert(!pick("koromon", { formTime: 290 }), "in-training evolved before 5 min");
  assert(pick("koromon"), "in-training never evolves");
});
check("Rookie → Champion is gated well above the old level 8", function () {
  assert(!pick("agumon", { level: 12 }), "rookie evolved at level 12");
  assert(pick("agumon", { level: 14 }), "rookie never evolves at 14");
});
check("Vegetables open plant routes", function () {
  assert(pick("botamon", { foodCounts: { carrot: 3, meat: 1 } }).to === "budmon", "baby veg → budmon");
  assert(pick("koromon", { foodCounts: { cabbage: 6, meat: 2 } }).to === "palmon", "cabbage → palmon");
  assert(pick("koromon", { foodCounts: { tomato: 6, meat: 2 } }).to === "lalamon", "tomato → lalamon");
  assert(pick("agumon", { foodCounts: { tomato: 16, meat: 4 } }).to === "redvegiemon", "tomato → redvegiemon");
  assert(pick("agumon", { foodCounts: { potato: 16, meat: 4 } }).to === "yakiimon", "potato → yakiimon");
  assert(pick("agumon").to === "greymon", "meat-fed agumon still → greymon");
});
check("Balanced diet detection", function () {
  assert(D.dietOf({ meat: 3, carrot: 3 }).balanced, "3+3 should be balanced");
  assert(!D.dietOf({ meat: 8, carrot: 1 }).balanced, "8+1 should not be balanced");
});
check("XP curve is steep", function () {
  let c = 0; for (let l = 1; l < 10; l++) c += D.xpForLevel(l);
  assert(c > 1800, "level 10 needs " + c);   /* 1906 since the 16x pacing pass made the first six levels cheaper (was 2000+) */
});
check("Stage waves follow the partner", function () {
  const w0 = D.stageWave(60, 0, 7), w2 = D.stageWave(600, 2, 7), early = D.stageWave(300, 3, 7);
  const st = (id) => (D.ENEMIES[id].stageDisplay || "");
  const babies = Object.keys(w0.rates).filter((k) => /^Baby/.test(st(k))).length;
  assert(babies >= 3, "baby partner should face mostly babies, got " + babies);
  assert(Object.keys(w2.rates).some((k) => /Rookie/.test(st(k))), "rookies are in the field by minute 10");
  assert(Object.keys(D.stageWave(240, 3, 7).rates).every((k) => /^Baby/.test(st(k))), "nothing above In-Training at minute 4, even with a Champion partner");
  assert(w0.cap <= 11 && D.stageWave(1440, 2, 7).cap <= 28, "field stays thin early");   /* raised with the Nov 16 pacing: 30% more enemies */
  assert(/Baby II|In-Training/.test(st(D.stageBoss(0, 7, 1))), "baby boss should be In-Training");
});

function makeAuth() {
  const sim = new mission.MissionSim({ hz: 25, seed: 9, viewW: 1280, viewH: 720, data: D });
  const authority = new authMod.Authority({ sim: sim, hz: 25, seed: 9, mission: true, data: D,
    account: { digiBits: 0, unlocked: {}, legendaryDropped: false, settledPayouts: {} }, persist: function () {} });
  authority.join({ id: "p0", kind: "host-client", hasTamer: true, form: "agumon", x: 0, y: 0, hp: 40, maxHp: 80, tamerHp: 100, tamerMaxHp: 100 });
  return { authority: authority, sim: sim, p: sim.player("p0") };
}

check("Garden: plant, grow in battle time, harvest", function () {
  const A = makeAuth();
  A.p.bag = { seed_carrot: 2 };
  A.sim.time = 100;
  let r = A.authority.act({ type: "farm.enter", id: "p0" });
  assert(A.sim.farm && A.sim.farm.active, "farm did not open");
  const plot = D.gardenPlots(D.FARM_CFG)[0];
  A.sim.farm.x = plot.cx; A.sim.farm.y = plot.cy;
  r = A.authority.act({ type: "farm.plant", id: "p0", plot: 0, seed: "seed_carrot" });
  assert(r.ok, "plant failed: " + r.reason);
  assert(A.p.bag.seed_carrot === 1, "seed not used");
  r = A.authority.act({ type: "farm.harvest", id: "p0", plot: 0 });
  assert(!r.ok && r.reason === "growing", "harvested too early");
  A.sim.time += D.CROPS.carrot.growSec + 1;
  r = A.authority.act({ type: "farm.harvest", id: "p0", plot: 0 });
  assert(r.ok && A.p.bag.carrot >= 2, "harvest failed");
  r = A.authority.act({ type: "farm.plant", id: "p0", plot: 0, seed: "seed_potato" });
  assert(!r.ok, "planted a seed not in the bag");
  A.sim.farm.x = 40; A.sim.farm.y = 60;
  r = A.authority.act({ type: "farm.plant", id: "p0", plot: 0, seed: "seed_carrot" });
  assert(!r.ok && r.reason === "far", "planted from across the yard");
});
check("Balanced meals give bonus joy and healing", function () {
  const A = makeAuth();
  A.p.bag = { meat: 3, carrot: 3 };
  A.p.foodCounts = { meat: 3, carrot: 2 };
  A.p.hp = 40; A.p.fullness = 10;
  A.authority.act({ type: "farm.enter", id: "p0" });
  const r = A.authority.act({ type: "farm.feed", id: "p0", food: "carrot" });
  assert(r.ok && r.balanced, "feed not balanced");
  assert(A.p.hp > 40, "no healing");
});
check("Enemies can drop seeds", function () {
  const A = makeAuth();
  let seeds = 0;
  for (let i = 0; i < 400; i++) {
    A.sim.orbs.length = 0;
    A.sim._dropLoot({ type: "pagumon", x: 0, y: 0 });
    seeds += A.sim.orbs.filter((o) => D.isSeed(o.kind)).length;
  }
  assert(seeds > 8 && seeds < 60, "seed drops out of range: " + seeds);
});

console.log(fails ? "farming-test: " + fails + " failed" : "farming-test: all passed");
process.exitCode = fails ? 1 : 0;
