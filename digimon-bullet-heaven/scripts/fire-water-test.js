/* node scripts/fire-water-test.js : fire never sits on water (Nov 21). Fire aimed at water is steam;
 * fire lit on the bank is pulled in so it doesn't spill over; a grass fire spreading along a
 * lakeshore never creeps onto the water; lightning into a lake leaves no fire. Uses the real world.js. */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
global.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {} }), width: 0, height: 0 }) };
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "day-clock", "seasons", "weather", "biomes"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
D.sprites = Object.assign(D.sprites || {}, { colors: {}, SCALE: 3, TILE: 48 });
require(path.join(root, "js/world.js"));
const W = D.world, T = 48;
const mission = require(path.join(root, "js/net/mission-sim.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }

W.reset(7); W.setTime(100);
const sim = new mission.MissionSim({ seed: 7, hz: 30, data: D });
sim.phase = "playing"; sim.time = 100;
/* lakes with grass on the shore */
const shores = [];
for (let y = -150; y <= 150 && shores.length < 30; y += 2) for (let x = -150; x <= 150 && shores.length < 30; x += 2) {
  if (W.materialAt(x, y) !== W.MAT.WATER || !W.openWaterAt((x + 0.5) * T, (y + 0.5) * T)) continue;
  for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) if (W.isGrass((x + dx + 0.5) * T, (y + dy + 0.5) * T)) { shores.push({ wx: (x + 0.5) * T, wy: (y + 0.5) * T, gx: (x + dx + 0.5) * T, gy: (y + dy + 0.5) * T }); break; }
}
ok(shores.length >= 10, "found " + shores.length + " lake shores with grass");
const overWater = q => W.waterNear(q.x, q.y, q.r * 0.9);

let onWater = 0;
for (const s of shores) { sim.patches = []; if (sim._addPatch("fire", s.wx, s.wy, 44, 5, null, 0)) onWater++; }
ok(onWater === 0, "fire aimed at open water never lights (" + onWater + " of " + shores.length + ")");

let spill = 0, lit = 0;
for (const s of shores) { sim.patches = []; const q = sim._addPatch("fire", s.gx, s.gy, 44, 5, null, 0); if (q) { lit++; if (overWater(q)) spill++; } }
ok(lit > 0 && spill === 0, "fire on the bank (" + lit + " lit) never spills over the water (" + spill + ")");

/* let grass fires burn and spread along the shores for a minute */
sim.patches = [];
for (const s of shores) sim._addPatch("fire", s.gx, s.gy, 44, 5, null, 0);
let worst = 0, total = 0;
for (let t = 0; t < 30 * 60; t++) {
  sim.time += 1 / 30; sim._updatePatches(1 / 30);
  for (const q of sim.patches) if (q.kind === "fire") { total++; if (overWater(q) || W.groundAt(q.x, q.y) === "water") worst++; }
}
ok(worst === 0, "a minute of spreading grass fire along " + shores.length + " shores: never on the water (" + worst + " bad of " + total + " patch-frames)");

/* lightning into a lake */
sim.patches = [];
for (const s of shores.slice(0, 10)) sim._strike(s.wx, s.wy);
ok(!sim.patches.some(q => q.kind === "fire"), "lightning into a lake leaves no fire");
console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
