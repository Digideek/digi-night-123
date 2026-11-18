/* node scripts/shiny-test.js : shinies roll on digivolution only, at the set chance, and stay */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const sim = new mission.MissionSim({ seed: 11, hz: auth.TICK_HZ, data: D });
const a = new auth.Authority({ sim: sim, seed: 11 });
sim.phase = "playing";
if (!sim.players[0]) { sim.players.push({ id: "local" }); sim.localId = "local"; }
const p = sim.players[0], P = a.progression;
ok(D.SHINY.chance === 0.001, "the chance is one in a thousand");
Object.assign(p, { form: "digitama_agumon", hp: 50, maxHp: 50, shiny: false });
D.SHINY.chance = 1;
P._applyForm(p, "botamon", "hatch");
ok(!p.shiny, "a hatch never rolls");
P._applyForm(p, "koromon", "standard");
ok(p.shiny === true, "a digivolution can");
D.SHINY.chance = 0;
P._applyForm(p, "agumon", "standard"); P._applyForm(p, "greymon", "standard");
ok(p.shiny === true, "once shiny, it stays shiny through later forms");
ok(sim.snapshot(true).players[0].shiny === true, "everyone's screen is told");
D.SHINY.chance = 0.001;
let hits = 0; const q = { form: "agumon", hp: 50, maxHp: 50 };
for (let i = 0; i < 20000; i++) { q.shiny = false; q.form = "agumon"; q.evoCount = 0; P._applyForm(q, "greymon", "standard"); if (q.shiny) hits++; }
ok(hits >= 5 && hits <= 45, hits + " shinies in 20,000 digivolutions (about 20 expected)");
console.log(failed ? "shiny-test: " + failed + " failed" : "shiny-test: all passed");
process.exit(failed ? 1 : 0);
