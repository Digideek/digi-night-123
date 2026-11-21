/* node scripts/rival-terrain-test.js : the rival's tamer walks like you (Nov 21). Its partner may
 * fly or swim over water; the tamer goes round cliffs, water and lava, and never stands on them.
 * Uses the real world.js. */
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
/* a lake at least 4 tiles wide */
let lake = null;
for (let y = -120; y <= 120 && !lake; y++) for (let x = -120; x <= 120 && !lake; x++) {
  let all = true; for (let k = 0; k < 4 && all; k++) if (!W.openWaterAt((x + k + 0.5) * T, (y + 0.5) * T)) all = false;
  if (all && !W.isRaised((x - 2 + 0.5) * T, (y + 0.5) * T, 9, 0)) lake = [x, y];
}
ok(!!lake, "found a lake to cross");
const sim = new mission.MissionSim({ seed: 7, hz: 30, data: D });
sim.phase = "playing"; sim.time = 100;
ok(typeof sim._rivalTamerStep === "function", "rival module loaded");
sim._navReady && sim._navReady();
const lx = (lake[0] - 2 + 0.5) * T, ly = (lake[1] + 0.5) * T;
const e = { _id: 4242, x: lx, y: ly, type: "biyomon", radius: 12, facing: 1 };
const rv = { tx: lx - 20, ty: ly, p: { form: "biyomon" } };
let onBad = 0, steps = 0, maxGap = 0;
/* the partner flies straight east across the water and lands on the far side */
for (let t = 0; t < 30 * 20; t++) {
  if (t < 30 * 6) e.x += 3;
  sim.time += 1 / 30;
  sim._rivalTamerStep(rv, e, 1 / 30);
  if (W.isRaised(rv.tx, rv.ty, 0, 0)) onBad++;
  maxGap = Math.max(maxGap, Math.hypot(rv.tx - e.x, rv.ty - e.y));
  steps++;
}
ok(onBad === 0, "the tamer never stood on water or a cliff (" + onBad + " bad frames of " + steps + ")");
ok(Math.hypot(rv.tx - e.x, rv.ty - e.y) < 400, "it caught up with its partner in the end (" + Math.round(Math.hypot(rv.tx - e.x, rv.ty - e.y)) + " px)");

/* a cliff: put the partner on the far side of a plateau, many times over */
let bad2 = 0;
for (let trial = 0; trial < 40; trial++) {
  const a = trial * 0.7, cx = Math.cos(a) * 900 + trial * 37, cy = Math.sin(a) * 900 - trial * 23;
  const s = W.nearestWalkable(cx, cy, 300, 9, 0);
  rv.tx = s.x; rv.ty = s.y; rv.tb = null; rv.tStuck = 0;
  e.x = s.x + 260; e.y = s.y + 80;
  for (let t = 0; t < 30 * 4; t++) { sim.time += 1 / 30; sim._rivalTamerStep(rv, e, 1 / 30); if (W.isRaised(rv.tx, rv.ty, 0, 0)) bad2++; }
}
ok(bad2 === 0, "40 chases over rough ground: never on a cliff or in the water (" + bad2 + ")");
console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
