/* node scripts/pickup-test.js : drops home in on a tamer (17z33). Pulled in by the tamer or the
 * partner, they fly to the nearest tamer and keep to it, speeding up to catch a tamer on the run;
 * nothing drifts any more: a drop waits until it's inside a tamer's magnet circle (17z33, reworked). */
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
const R = D.PACING.magnetRadius;
/* 1: a drop waits where it fell until it's inside the tamer's magnet circle; the partner doesn't pull it */
let sim = world(), p = sim.player("local");
p.x = 0; p.y = 0; p.mx = 200; p.my = 0;
sim.orbs.push({ id: 1, kind: "bits", x: 205, y: 10, value: 5, vx: 0, vy: 0, magnet: false });
for (let k = 0; k < 50; k++) sim._updateOrbs(dt);
ok(sim.orbs.length === 1 && sim.orbs[0].x === 205 && sim.orbs[0].y === 10 && !sim.orbs[0].magnet, "right next to the partner, out of the tamer's circle: it stays exactly where it fell");
sim.orbs[0].x = R * 2; sim.orbs[0].y = 0; for (let k = 0; k < 25; k++) sim._updateOrbs(dt);
ok(sim.orbs.length === 1 && sim.orbs[0].x === R * 2, "just outside the circle (" + R * 2 + " px): no drifting");
/* 2: inside the circle: it flies straight in and is taken */
sim.orbs[0].x = R - 5; let steps = 0, path1 = [];
while (sim.orbs.length && steps < 200) { sim._updateOrbs(dt); steps++; if (sim.orbs[0]) path1.push(sim.orbs[0].x); }
ok(!sim.orbs.length && path1.every((x, i) => i === 0 || x <= path1[i - 1] + 0.01), "inside it (" + (R - 5) + " px): straight to the tamer, taken in " + steps + " ticks");
ok(R <= 60, "the circle starts small: " + R + " px (you nearly walk over a drop)");
/* 3: a pulled-in drop catches a tamer on the run */
sim = world(); p = sim.player("local"); p.x = 0; p.y = 0;
sim.orbs.push({ id: 2, kind: "xp", x: R - 10, y: 0, value: 5, vx: 0, vy: 0, magnet: false });
steps = 0; while (sim.orbs.length && steps < 400) { sim._updateOrbs(dt); p.x -= 260 * dt; steps++; }
ok(!sim.orbs.length, "a tamer running away at 260 px/s is still caught (" + (steps * dt).toFixed(1) + " s)");
/* 4: pickup range grows it */
sim = world(); p = sim.player("local"); p.x = 0; p.y = 0; p.statLevels = { magnet: 3 }; p._statsKey = null; sim._stats(p);
sim.orbs.push({ id: 5, kind: "bits", x: R * 1.6, y: 0, value: 5, vx: 0, vy: 0, magnet: false }); sim._updateOrbs(dt);
ok(sim.orbs.length && sim.orbs[0].magnet && Math.abs(p.stats.magnetMul - Math.pow(1.22, 3)) < 1e-9, "three Magnet Field picks: the circle is x" + p.stats.magnetMul.toFixed(2) + ", so a drop " + Math.round(R * 1.6) + " px off comes in");
/* 5: two players: it goes to one and is eaten, never tugged back and forth */
sim = world(); p = sim.player("local");
sim.players.push({ id: "g1", hasTamer: true, x: 300, y: 0, mx: 300, my: 40, stats: {} });
p.x = 0; p.y = 0; p.mx = 0; p.my = 40;
sim.orbs.push({ id: 4, kind: "bits", x: 140, y: 0, value: 5, vx: 0, vy: 0, magnet: true });
const xs = []; steps = 0; while (sim.orbs.length && steps < 100) { sim._updateOrbs(dt); steps++; if (sim.orbs[0]) xs.push(sim.orbs[0].x); }
const dir = Math.sign(xs[1] - xs[0]);
ok(!sim.orbs.length && xs.every((x, i) => i === 0 || Math.sign(x - xs[i - 1]) === dir || Math.abs(x - xs[i - 1]) < 0.01), "with two tamers a drop picks the nearer one and goes straight there");
console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
