/* node scripts/lod-test.js : wild Digimon far from everyone update less often, never anyone near a
 * player (data.js SIM_LOD, mission-sim.js _updateEnemies, 17z33). */
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
const OX = 40000;                 /* out in the world: the start area has rules of its own */
const kind = Object.keys(D.ENEMIES).find(k => D.ENEMIES[k].stageDisplay === "Child (Rookie)" && !D.ENEMIES[k].boss && (D.ENEMIES[k].speed || 0) > 20);
function world(lod) {
  D.SIM_LOD = lod;
  const sim = new mission.MissionSim({ seed: 9, hz: auth.TICK_HZ, data: D }); const A = new auth.Authority({ sim: sim, seed: 9 });
  sim.phase = "playing"; sim.time = 120;
  A.join({ id: "local", kind: "host-client", hasTamer: true, form: "agumon", x: OX, y: 0, mx: OX + 30, my: 0, hp: 500, maxHp: 500, tamerHp: 500, tamerMaxHp: 500 });
  sim.enemies.length = 0;
  return sim;
}
function walker(sim, x, y, extra) {
  const e = sim.spawnEnemy(kind, Object.assign({ x: OX + x, y, keepType: true, quiet: true }, extra || {}));
  e.pack = null; return e;
}
/* a far Digimon chasing a fixed point: does it cover the same ground, updated 1 in 4? */
function run(lod, ticks, setup) {
  const sim = world(lod), list = setup(sim), moves = list.map(() => 0), last = list.map(e => [e.x, e.y]);
  for (let t = 0; t < ticks; t++) {
    sim._updateEnemies(1 / auth.TICK_HZ);
    list.forEach((e, i) => { if (e.x !== last[i][0] || e.y !== last[i][1]) moves[i]++; last[i] = [e.x, e.y]; });
  }
  return { sim, list, moves };
}
const near = (sim) => [walker(sim, 500, 0)];
let a = run({ far: 2600, every: 4 }, 100, near);
ok(a.moves[0] >= 95, "a Digimon 500 px from the tamer moves every tick (" + a.moves[0] + " of 100)");
const far = (sim) => [walker(sim, 6000, 0)];
a = run({ far: 2600, every: 4 }, 100, far);
ok(a.moves[0] >= 20 && a.moves[0] <= 30, "one 6000 px away from everyone moves one tick in four (" + a.moves[0] + " of 100)");
/* the same Digimon, the same chase, with and without: it ends up in the same place */
function chase(lod) {
  const sim = world(lod);
  const e = sim.spawnEnemy(kind, { x: OX + 6000, y: 0, keepType: true, quiet: true }); e.pack = null;
  for (let t = 0; t < 200; t++) sim._updateEnemies(1 / auth.TICK_HZ);
  return [e.x, e.y];
}
/* (it heads for the tamer 6000 px off, far the whole way) */
const full = chase({ far: 2600, every: 1 }), lod = chase({ far: 2600, every: 4 });
const gap = Math.hypot(full[0] - lod[0], full[1] - lod[1]), went = Math.hypot(full[0] - OX - 6000, full[1]);
ok(went > 100 && gap < went * 0.08 + 6, "updated less often, it covers the same ground: walked " + Math.round(went) + " px either way, ends " + gap.toFixed(1) + " px apart");
/* a friend somewhere else counts as much as you */
function updates(lodCfg, setup) {
  const sim = world(lodCfg), e = setup(sim); let n = 0;
  const orig = sim._tickStatus; sim._tickStatus = function (en) { if (en === e) n++; return orig.apply(this, arguments); };
  for (let t = 0; t < 100; t++) sim._updateEnemies(1 / auth.TICK_HZ);
  return n;
}
const withFriend = updates({ far: 2600, every: 4 }, (sim) => { sim.players.push({ id: "g1", hasTamer: true, x: OX + 6300, y: 0, mx: OX + 6330, my: 0, hp: 100, maxHp: 100, faint: 0, stats: {} }); return walker(sim, 6000, 0); });
const alone = updates({ far: 2600, every: 4 }, (sim) => walker(sim, 6000, 0));
ok(withFriend === 100 && alone === 25, "6000 px from you: beside a friend it's updated every tick (" + withFriend + " of 100); with nobody near, 1 in 4 (" + alone + ")");
/* the ones that matter far away are never slowed */
for (const [flag, label] of [[{ war: "snow" }, "a war soldier"], [{ virus: { cd: 0, t: 0 } }, "an infected one"], [{ nemesis: true }, "a nemesis"], [{ lord: true }, "a lord"]]) {
  const sim = world({ far: 2600, every: 4 });
  const e = walker(sim, 6000, 0); Object.assign(e, flag);
  let n = 0, lx = e.x, ly = e.y, upd = 0; const tick0 = sim._lodTick || 0;
  const orig = sim._steer; sim._steer = function (en) { if (en === e) upd++; return orig.apply(this, arguments); };
  for (let t = 0; t < 40; t++) sim._updateEnemies(1 / auth.TICK_HZ);
  ok(upd === 0 || upd >= 38 || e.dead, label + " far away is never put on the slow lane");
}
/* and it saves work: updates counted (timing on a shared machine is too noisy to test) */
function work(lodCfg) {
  const sim = world(lodCfg); let n = 0;
  for (let i = 0; i < 300; i++) walker(sim, 4000 + (i % 30) * 60, (Math.floor(i / 30) - 5) * 60);
  const orig = sim._tickStatus; sim._tickStatus = function () { n++; return orig.apply(this, arguments); };
  const t = process.hrtime.bigint();
  for (let k = 0; k < 150; k++) sim._updateEnemies(1 / auth.TICK_HZ);
  return { n, ms: Number(process.hrtime.bigint() - t) / 1e6 };
}
const w1 = work({ far: 2600, every: 1 }), w4 = work({ far: 2600, every: 4 });
ok(w4.n <= w1.n * 0.3, "300 Digimon far from everyone: " + w1.n + " -> " + w4.n + " updates in 150 ticks (" + Math.round(w1.ms) + " -> " + Math.round(w4.ms) + " ms here)");
D.SIM_LOD = { far: 2600, every: 4 };
console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
