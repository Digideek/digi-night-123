/* node scripts/seek-test.js : how far from its tamer the partner goes looking for a fight (data.js LEASH.seekRadius) */
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
const L = D.LEASH;
function run(enemyDist, opts) {
  opts = opts || {};
  const sim = new mission.MissionSim({ seed: 2, hz: auth.TICK_HZ, data: D }); new auth.Authority({ sim: sim, seed: 2 });
  sim.phase = "playing"; sim.time = 60;
  if (!sim.players[0]) { sim.players.push({ id: "local" }); sim.localId = "local"; }
  const p = sim.players[0];
  Object.assign(p, { form: "agumon", level: 5, hp: 100, maxHp: 100, x: 0, y: 0, mx: -30, my: 6, facing: 1, faint: 0, downed: false, hasTamer: true, kind: "human", moving: false, weapons: [] });
  const e = { _id: 77, type: "numemon", x: enemyDist, y: 0, hp: 1e6, maxHp: 1e6, radius: 12, flash: 0, hitCd: 0, hitCdM: 0 };
  sim.enemies.push(e);
  if (opts.focus) p.focusId = 77;
  let far = -1e9;
  for (let i = 0; i < 30 * 6; i++) { sim._movePartner(p, 1 / 30); far = Math.max(far, p.mx); }
  return { far: far, target: p.monTarget, p: p, end: p.mx };
}
ok(L.seekRadius === 300, "the partner looks for a fight within " + L.seekRadius + " px of its tamer");
let r = run(200);
ok(r.target && r.far > 80, "a wild Digimon 200 px from you: it goes for it (it got " + Math.round(r.far) + " px out)");
r = run(L.seekRadius - 20);
ok(r.target && r.far > 80, "one just inside " + L.seekRadius + " px: it still goes");
r = run(L.seekRadius + 40);
ok(!r.target && r.far < 0, "one at " + (L.seekRadius + 40) + " px: it stays at your heel");
r = run(600);
ok(!r.target && r.far < 0, "one near the edge of the screen (600 px): it does not strain toward it any more");
{ const was = L.seekRadius; L.seekRadius = 0; r = run(600); L.seekRadius = was;
  ok(r.target && r.far > 80, "(before this change it walked " + Math.round(r.far) + " px out toward that one)"); }
r = run(260, { focus: true });
ok(r.target && r.far > 150, "an enemy you click is still chased as before");
console.log(failed ? "seek-test: " + failed + " FAILED" : "seek-test: all passed");
process.exit(failed ? 1 : 0);
