#!/usr/bin/env node
/* Hit knockback (eased shove) and "no standing on a Digimon" separation. */
"use strict";
const path = require("path");
const root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["species-catalog", "rarity", "evo-stat-gates", "evo-hardmode", "stage-waves"].forEach((f) => require(path.join(root, "js/" + f + ".js")));
const mission = require(path.join(root, "js/net/mission-sim.js"));
/* this test measures push, not accuracy: every strike lands, none are critical */
mission.MissionSim.prototype._roll = function () { return 1; };
let fails = 0;
function check(n, fn) { try { fn(); console.log("  ok  " + n); } catch (e) { fails++; console.log("  FAIL " + n + ": " + e.message); } }
function assert(c, m) { if (!c) throw new Error(m); }
function makeSim() {
  const sim = new mission.MissionSim({ hz: 25, seed: 3, viewW: 1280, viewH: 720, data: D });
  sim.join({ id: "p0", hasTamer: true, form: "agumon", x: -400, y: 0, mx: 0, my: 0, hp: 9999, maxHp: 9999, tamerHp: 9999, tamerMaxHp: 9999 });
  sim.openingSpawned = true;
  sim._spawnsOpen = () => false;
  return sim;
}
check("a hit shoves the enemy away over a few frames (no teleport)", () => {
  const sim = makeSim();
  const e = sim.spawnEnemy("agumon", { x: 200, y: 0, keepType: true });
  e.hp = e.maxHp = 9999;
  sim.hurtEnemy(e, 1, 1, 0, 16, null);
  assert(e.x === 200, "position jumped on hit");
  const x0 = e.x;
  sim._updateEnemies(0.04);
  const step1 = e.x - x0;
  let peak = e.x;
  for (let i = 0; i < 10; i++) { sim._updateEnemies(0.04); peak = Math.max(peak, e.x); }
  assert(step1 > 3, "no visible shove on the first frame: " + step1.toFixed(2));
  assert(peak - x0 > 20, "total shove too small: " + (peak - x0).toFixed(1));
  console.log("      (shoved " + (peak - x0).toFixed(0) + "px)");
});
check("push grows as the partner evolves", () => {
  const sim = makeSim();
  const p = sim.players[0];
  const out = [];
  for (const form of ["botamon", "koromon", "agumon", "greymon", "metalgreymon", "wargreymon"]) {
    p.form = form;
    const e = sim.spawnEnemy("agumon", { x: 200, y: 0, keepType: true });
    e.hp = 9999;
    sim.hurtEnemy(e, 1, 1, 0, 16, { id: "p0" });
    out.push(Math.round(Math.hypot(e.kvx, e.kvy)));
  }
  console.log("      (launch speed by stage: " + out.join(" < ") + ")");
  for (let i = 1; i < out.length; i++) assert(out[i] > out[i - 1], "stage " + i + " not stronger");
  assert(out[0] < out[3] * 0.4, "Baby push should be well under Champion's");
});
check("bosses barely budge", () => {
  const sim = makeSim();
  const a = sim.spawnEnemy("agumon", { x: 200, y: 0, keepType: true });
  const b = sim.spawnEnemy("agumon", { x: 200, y: 300, keepType: true, boss: true });
  a.hp = b.hp = 9999; a.kbStun = b.kbStun = 0;
  sim.hurtEnemy(a, 1, 1, 0, 16, null); sim.hurtEnemy(b, 1, 1, 0, 16, null);
  assert(Math.hypot(b.kvx, b.kvy) < Math.hypot(a.kvx, a.kvy) * 0.5, "boss shove not reduced");
});
check("enemies touch the partner but never overlap it", () => {
  const sim = makeSim();
  const p = sim.players[0];
  const rMon = sim._actorRad(p.form);
  const list = [];
  for (let i = 0; i < 12; i++) {
    const e = sim.spawnEnemy("botamon", { x: Math.cos(i) * 120, y: Math.sin(i) * 120, keepType: true });
    e.hp = e.maxHp = 9999; list.push(e);
  }
  let worst = 1e9, touching = 0;
  for (let t = 0; t < 200; t++) {
    sim._updateEnemies(0.04);
    for (const e of list) {
      const gap = Math.hypot(e.x - p.mx, e.y - p.my) - (e.radius + rMon);
      worst = Math.min(worst, gap);
    }
  }
  for (const e of list) if (Math.hypot(e.x - p.mx, e.y - p.my) - (e.radius + rMon) < 5) touching++;
  assert(worst > -0.5, "enemy overlapped the partner by " + (-worst).toFixed(1) + "px");
  assert(touching >= 3, "enemies should be able to touch: " + touching);
});
check("touching still deals contact damage", () => {
  const sim = makeSim();
  const p = sim.players[0];
  p.hp = p.maxHp = 500;
  const e = sim.spawnEnemy("botamon", { x: 30, y: 0, keepType: true });
  e.hp = e.maxHp = 9999;
  for (let t = 0; t < 60; t++) sim._updateEnemies(0.04);
  assert(p.hp < 500, "no contact damage while touching");
});
console.log(fails ? "knockback-test: " + fails + " failed" : "knockback-test: all passed");
process.exitCode = fails ? 1 : 0;
