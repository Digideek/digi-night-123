/* node scripts/catch-test.js : catching (17z33, Isaac). Beat enough of one kind and the next one you defeat lies there
 * for 20 s, for you alone. Walk up and press E: one try, 6%. Caught: it joins you. Missed or too slow: it fades. */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "weather", "seasons", "shop"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const SK = D.SKILLS;
const C = D.CAPTURE;
ok(C && C.chance === 0.06 && C.waitSec === 20 && C.koByStage.Rookie === 45, "6% a try (was 10%), 20 s to reach it, 45 Rookies of one kind first (was 30)");
function world(ids) {
  const sim = new mission.MissionSim({ seed: 7, hz: auth.TICK_HZ, data: D }); const A = new auth.Authority({ sim: sim, seed: 7 });
  sim.phase = "playing"; sim.time = 60; sim.coop = ids.length > 1; sim.runMode = "open";
  ids.forEach((id, i) => A.join({ id, kind: i ? "remote" : "host-client", hasTamer: true, form: "greymon", x: i * 300, y: 0, mx: i * 300 + 20, my: 0, level: 12 }));
  sim.enemies.length = 0;
  return { sim, A, P: ids.map(id => sim.player(id)) };
}
const kind = "gazimon", need = D.captureKoNeeded(kind);
function beat(sim, p, x) { const e = sim.spawnEnemy(kind, { keepType: true, quiet: true, x: x == null ? p.x + 30 : x, y: p.y }); sim._killEnemy(e, p); return e; }

let w = world(["a"]), a = w.P[0];
a.killsBy = {}; a.killsBy[kind] = need - 2;
beat(w.sim, a);
ok(!(w.sim.catches || []).length, "not ready yet: a defeated one just goes");
beat(w.sim, a);
ok(w.sim.catches.length === 1 && w.sim.catches[0].owner === "a" && a.killsBy[kind] === 0 && w.sim.events.some(e => e.type === "catch.spot"), "the one that makes the count: it lies there, yours, and the count starts over");
let snap = w.sim.snapshot();
ok(snap.catches && snap.catches[0][1] === kind && snap.catches[0][5] > 19, "it's in the snapshot with its time left");
/* too far */
a.x = w.sim.catches[0].x + 400;
let r = w.A.act({ type: "capture", id: "a" });
ok(!r.ok && /Nothing/.test(r.reason) && w.sim.catches.length === 1, "out of reach: nothing happens (" + r.reason + ")");
/* one try: force the roll */
a.x = w.sim.catches[0].x + 20; a.y = w.sim.catches[0].y;
w.sim.rng = () => 0.99;
r = w.A.act({ type: "capture", id: "a" });
ok(r.tried && !r.ok && !w.sim.catches.length && !w.sim.ally, "a miss: it fades, gone for good");
a.killsBy[kind] = need - 1; beat(w.sim, a);
w.sim.rng = () => 0.01;
a.x = w.sim.catches[0].x + 10; a.y = w.sim.catches[0].y;
r = w.A.act({ type: "capture", id: "a" });
ok(r.ok && w.sim.ally && w.sim.ally.form === kind && !w.sim.catches.length, "a catch: it joins you (" + w.sim.ally.form + ")");
/* too slow */
a.killsBy[kind] = need - 1; beat(w.sim, a);
for (let i = 0; i < 21 * 30; i++) { w.sim.time += 1 / 30; w.sim._tickCatches(1 / 30); }
ok(!w.sim.catches.length && w.sim.events.some(e => e.type === "catch.gone"), "left more than 20 s: it fades away");
/* bosses, the infected, rivals: never */
a.killsBy[kind] = 999;
const inf = w.sim.spawnEnemy(kind, { keepType: true, quiet: true, x: a.x + 30, y: a.y }); inf.virus = 1; w.sim._killEnemy(inf, a);
ok(!w.sim.catches.length, "an infected one never stays down to be caught");
/* online: only the tamer who beat it */
w = world(["a", "b"]); const [p1, p2] = w.P;
p1.killsBy = {}; p1.killsBy[kind] = need - 1; beat(w.sim, p1);
const spot = w.sim.catches[0]; p2.x = spot.x + 10; p2.y = spot.y; p1.x = spot.x + 200;
r = w.A.act({ type: "capture", id: "b" });
ok(!r.ok && /tamer who beat it/.test(r.reason) && w.sim.catches.length === 1, "a friend can't take yours (" + r.reason + ")");
console.log(failed ? failed + " FAILED" : "catch-test: all passed");
process.exit(failed ? 1 : 0);
