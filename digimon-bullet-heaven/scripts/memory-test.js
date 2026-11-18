/* node scripts/memory-test.js : DigiBank memories (data.js MEMORY). A memory is skill points waiting at the hatch. */
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
const M = D.MEMORY;
ok(M.tier.Champion === 1 && M.tier.Ultimate === 2 && M.tier.Mega === 3 && !M.tier.Rookie, "Champion 1, Ultimate 2, Mega 3, nothing below Champion");
function mk(mem) {
  const sim = new mission.MissionSim({ seed: 2, hz: auth.TICK_HZ, data: D }); new auth.Authority({ sim: sim, seed: 2 });
  sim.join({ id: "a", kind: "host-client", hasTamer: true, form: "digitama_agumon", hp: 60, maxHp: 60, hatchLeft: 20, memory: mem });
  return { sim, p: sim.player("a") };
}
ok(mk(0).p.skillPoints === 0 && mk(undefined).p.skillPoints === 0, "no memory, no points");
ok(mk(1).p.skillPoints === 1 && mk(3).p.skillPoints === 3, "a memory is that many skill points on the egg");
ok(mk(99).p.skillPoints === M.max && mk(-4).p.skillPoints === 0 && mk("x").p.skillPoints === 0, "the value is cleaned and capped at " + M.max);
const a = mk(2);
a.sim._autoSkill(a.p);
ok(a.p.skillPoints === 2, "the egg keeps its points until it hatches");
console.log(failed ? failed + " FAILED" : "memory-test: all passed"); process.exit(failed ? 1 : 0);
