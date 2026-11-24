/* node scripts/pickup-test.js : drops home in on a tamer (17z33). Pulled in by the tamer or the
 * partner, they fly to the nearest tamer and keep to it, speeding up to catch a tamer on the run;
 * close ones drift in slowly; with two players a drop goes to one of them, not back and forth. */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
function world() {
  const sim = new mission.MissionSim({ seed: 4, hz: auth.TICK_HZ, data: D }); const A = new auth.Authority({ sim: sim, seed: 4 });
  sim.phase = "playing"; sim.time = 60;
  A.join({ id: "local", kind: "host-client", hasTamer: true, form: "agumon", x: 0, y: 0, mx: 0, my: 0, hp: 50, maxHp: 50, tamerHp: 50, tamerMaxHp: 50 });
  sim.enemies.length = 0; sim.orbs.length = 0;
  return sim;
}
const dt = 1 / 25;
/* 1: the partner pulls it in, it flies to the tamer, not the partner */
let sim = world(), p = sim.player("local");
p.x = 0; p.y = 0; p.mx = 400; p.my = 0;
sim.orbs.push({ id: 1, kind: "bits", x: 420, y: 60, value: 5, vx: 0, vy: 0, magnet: false });
let minToMon = 1e9, steps = 0, path1 = [];
while (sim.orbs.length && steps < 200) { sim._updateOrbs(dt); steps++; const o = sim.orbs[0]; if (o) { path1.push(o.x); minToMon = Math.min(minToMon, Math.hypot(o.x - p.mx, o.y - p.my)); } }
ok(!sim.orbs.length && path1.every((x, i) => i === 0 || x <= path1[i - 1] + 0.01), "pulled in by the partner, a drop flies straight to the tamer (" + steps + " ticks) and never swings back");
/* 2: a tamer running away is still caught */
sim = world(); p = sim.player("local"); p.x = 0; p.y = 0; p.mx = -300; p.my = 0;
sim.orbs.push({ id: 2, kind: "xp", x: 100, y: 0, value: 5, vx: 0, vy: 0, magnet: false });
steps = 0; while (sim.orbs.length && steps < 400) { p.x -= 260 * dt; sim._updateOrbs(dt); steps++; }
ok(!sim.orbs.length, "a tamer running at 260 px/s is still caught (" + (steps * dt).toFixed(1) + " s)");
/* 3: close but outside the magnet: drifts in slowly */
sim = world(); p = sim.player("local"); p.x = 0; p.y = 0; p.mx = 0; p.my = 2000;
sim.orbs.push({ id: 3, kind: "xp", x: 250, y: 0, value: 5, vx: 0, vy: 0, magnet: false });
sim._updateOrbs(dt); const x1 = sim.orbs[0].x;
for (let k = 0; k < 25; k++) sim._updateOrbs(dt);
ok(x1 < 250 && sim.orbs.length && sim.orbs[0].x < 250 - 30 && sim.orbs[0].x > 250 - 60, "a drop just outside the magnet drifts toward the tamer at a stroll (" + Math.round(250 - sim.orbs[0].x) + " px in a second)");
sim.orbs[0].x = 2000; const x2 = sim.orbs[0].x; sim._updateOrbs(dt);
ok(sim.orbs[0].x === x2, "far away it stays put");
/* 4: two players: it goes to one and is eaten, never tugged back and forth */
sim = world(); p = sim.player("local");
sim.players.push({ id: "g1", hasTamer: true, x: 300, y: 0, mx: 300, my: 40, stats: {} });
p.x = 0; p.y = 0; p.mx = 0; p.my = 40;
sim.orbs.push({ id: 4, kind: "bits", x: 140, y: 0, value: 5, vx: 0, vy: 0, magnet: true });
const xs = []; steps = 0; while (sim.orbs.length && steps < 100) { sim._updateOrbs(dt); steps++; if (sim.orbs[0]) xs.push(sim.orbs[0].x); }
const dir = Math.sign(xs[1] - xs[0]);
ok(!sim.orbs.length && xs.every((x, i) => i === 0 || Math.sign(x - xs[i - 1]) === dir || Math.abs(x - xs[i - 1]) < 0.01), "with two tamers a drop picks the nearer one and goes straight there");
console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
