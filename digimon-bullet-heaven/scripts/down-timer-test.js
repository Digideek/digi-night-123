/* node scripts/down-timer-test.js : Survival, Open World (17z33, Isaac). Alone, one death ends the run. With friends
 * you go down on a timer (15 s, then 20 s longer each time); a friend who reaches you revives you where you fell, Digimon
 * and all; if the timer runs out you start over as a fresh egg; everyone down ends the run. Story still respawns at once. */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "weather", "seasons"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const SK = D.SKILLS;
const T = D.DOWN_TIMER;
function world(mode, ids, coop) {
  const sim = new mission.MissionSim({ seed: 7, hz: auth.TICK_HZ, data: D }); const A = new auth.Authority({ sim: sim, seed: 7 });
  sim.phase = "playing"; sim.time = 60; sim.coop = coop !== false; sim.runMode = mode;
  ids.forEach((id, i) => A.join({ id, kind: i ? "remote" : "host-client", hasTamer: true, form: "agumon", x: i * 40, y: 0, mx: i * 40 + 20, my: 0, level: 6 }));
  const P = ids.map(id => sim.player(id)); P.forEach(p => { p.hatchLeft = 0; p.form = "greymon"; p.level = 12; });
  sim.enemies.length = 0; sim.spawnAcc = {}; sim._noSpawn = true;
  const seq = {}; ids.forEach(id => { seq[id] = 1; });
  const step = (n, holder) => { for (let i = 0; i < n; i++) { ids.forEach(id => A.onMessage({ type: "input", id, inputs: [{ seq: seq[id]++, x: 0, y: 0, atk: false, aim: 0, interact: id === holder }] })); sim.enemies.length = 0; A.step(); } };
  const fall = p => { p.monInvuln = 0; p.secondWind = false; sim.hurtMon(p, 1e7, null); };
  return { sim, A, P, step, fall };
}
const sec = s => Math.round(s * auth.TICK_HZ);

/* alone: one death and it's over */
let w = world("open", ["a"], false);
w.fall(w.P[0]);
ok(w.sim.runOver && w.P[0].form === "greymon", "alone in Open World: the partner falls and the run is over (no respawn)");
w = world("open", ["a"], true);
w.fall(w.P[0]);
ok(w.sim.runOver, "alone online (nobody joined): the same");

/* with a friend */
w = world("open", ["a", "b"]);
const [a, b] = w.P;
w.fall(b);
ok(b.downed && !w.sim.runOver && Math.abs(b.downLeft - T.first) < 1e-9, "with a friend: down, not out, with a " + T.first + " s timer");
w.step(sec(2));
ok(b.downed && b.downLeft < T.first - 1.5, "the timer runs (" + b.downLeft.toFixed(1) + " s left)");
w.step(sec(T.hold || 3.3), "a");
ok(!b.downed && b.form === "greymon" && b.level === 12 && b.hp > 0 && b.downLeft == null, "a friend holds E by it: back up where it fell, still a Greymon at level 12");
w.step(sec(1));
ok(!b.downed && b.faint === 0, "and it stays up");
/* the second time the timer is longer; let it run out */
w.fall(b);
ok(Math.abs(b.downLeft - (T.first + T.more)) < 1e-9, "the second time: " + (T.first + T.more) + " s");
w.step(sec(T.first + T.more + 0.5));
ok(!b.downed && b.form !== "greymon" && b.level === 1 && b.respawns === 1, "nobody came in time: it starts over as a fresh egg (" + b.form + ") near the start");
w.fall(a);
ok(Math.abs(a.downLeft - T.first) < 1e-9, "each tamer counts their own falls (a's first: " + T.first + " s)");
b.hatchLeft = 0; b.form = "agumon";
w.fall(b);
ok(w.sim.runOver, "both down at once: the run is over");

/* Story still respawns at once; One Life online still has no timer */
w = world("story", ["a", "b"]); w.fall(w.P[1]);
ok(!w.P[1].downed && w.P[1].respawns === 1 && !w.sim.runOver, "Story: straight back as an egg, as before");
w = world("survival", ["a", "b"]); w.fall(w.P[1]);
ok(w.P[1].downed && w.P[1].downLeft == null && !w.sim.runOver, "One Life with a friend: down until revived, no timer");
w.step(sec(3.4), "a");
ok(!w.P[1].downed, "and a friend can revive it there too (the last one standing could not before)");
console.log(failed ? failed + " FAILED" : "down-timer-test: all passed");
process.exit(failed ? 1 : 0);
