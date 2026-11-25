/* node scripts/shiny-test.js : shinies roll on digivolution and (17z33) on the hatch, at the set chance, and stay;
 * a shiny is stronger in everything: 2.5% when it turned shiny digivolving, 5% when it hatched shiny */
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
ok(p.shiny === true && p.shinyBoost === D.SHINY.hatchBoost, "a hatch can come out shiny (+" + p.shinyBoost * 100 + "%)");
const fnStats = Object.keys(mission.MissionSim.prototype).find(k => /stat/i.test(k) && mission.MissionSim.prototype[k].toString().indexOf("monSpeedMul = ") >= 0);
const sSh = sim[fnStats](p); const hpSh = p.maxHp;
const plain = { id: "x", form: "digitama_agumon", hp: 50, maxHp: 50, shiny: false, level: p.level, statLevels: p.statLevels, skills: p.skills };
sim.players.push(plain); D.SHINY.chance = 0; P._applyForm(plain, "botamon", "hatch"); const sPl = sim[fnStats](plain);
ok(Math.abs(sSh.damageMul / sPl.damageMul - 1.05) < 1e-9 && Math.abs(sSh.monSpeedMul / sPl.monSpeedMul - 1.05) < 1e-9 && Math.abs(sPl.cooldownMul / sSh.cooldownMul - 1.05) < 1e-9, "a hatched shiny hits 5% harder, moves 5% faster, attacks 5% quicker");
ok(Math.abs(hpSh / plain.maxHp - 1.05) < 0.02, "and has 5% more health (" + hpSh + " vs " + plain.maxHp + ")");
sim.players.pop();
Object.assign(p, { form: "digitama_agumon", hp: 50, maxHp: 50, shiny: false, shinyBoost: 0 }); D.SHINY.chance = 0;
P._applyForm(p, "botamon", "hatch"); D.SHINY.chance = 1;
P._applyForm(p, "koromon", "standard");
ok(p.shiny === true && p.shinyBoost === D.SHINY.evoBoost, "a digivolution can (+" + p.shinyBoost * 100 + "%)");
D.SHINY.chance = 0;
P._applyForm(p, "agumon", "standard"); P._applyForm(p, "greymon", "standard");
ok(p.shiny === true, "once shiny, it stays shiny through later forms");
ok(sim.snapshot(true).players[0].shiny === true, "everyone's screen is told");
D.SHINY.chance = 0.001;
let hits = 0; const q = { form: "agumon", hp: 50, maxHp: 50 };
for (let i = 0; i < 20000; i++) { q.shiny = false; q.form = "agumon"; q.evoCount = 0; P._applyForm(q, "greymon", "standard"); if (q.shiny) hits++; }
ok(hits >= 5 && hits <= 45, hits + " shinies in 20,000 digivolutions (about 20 expected)");
/* the shiny moment's guard: once per new shiny, a few seconds nothing can hurt you */
const g = { id: "g1", form: "digitama_agumon", hp: 50, maxHp: 50, shiny: false, monInvuln: 0, tamerInvuln: 0 }; sim.players.push(g);
ok(!a.act({ type: "shiny.guard", id: "g1" }).ok, "no guard without a new shiny");
D.SHINY.chance = 1; P._applyForm(g, "botamon", "hatch"); D.SHINY.chance = 0.001;
const gr = a.act({ type: "shiny.guard", id: "g1" });
ok(gr.ok && g.monInvuln >= D.SHINY.guardSec - 1e-9 && g.tamerInvuln >= D.SHINY.guardSec - 1e-9, "a new shiny: " + D.SHINY.guardSec + " s where nothing can hurt it or its tamer");
ok(!a.act({ type: "shiny.guard", id: "g1" }).ok, "and only once");
console.log(failed ? "shiny-test: " + failed + " failed" : "shiny-test: all passed");
process.exit(failed ? 1 : 0);
