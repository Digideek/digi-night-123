/* node scripts/hunger-test.js : a starving partner is slower and weaker, and gets its speed back the moment it eats,
 * at the farm too (17z33, Isaac: "after I fed him up, he didn't speed back up"). */
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
const sim = new mission.MissionSim({ seed: 7, hz: auth.TICK_HZ, data: D }); const A = new auth.Authority({ sim: sim, seed: 7 });
sim.phase = "playing"; sim.time = 60;
A.join({ id: "local", kind: "host-client", hasTamer: true, form: "agumon", x: 0, y: 0, mx: 0, my: 0, hp: 50, maxHp: 50, tamerHp: 50, tamerMaxHp: 50, level: 5 });
const p = sim.player("local"); p.form = "agumon"; p.hatchLeft = 0; p.fullness = 80;
const spd = () => sim._stats(p).monSpeedMul, dmg = () => sim._stats(p).damageMul;
const tick = n => { for (let i = 0; i < n; i++) { p.monInvuln = 9; p.tamerInvuln = 9; A.step(1 / 30, {}); } };
tick(10); const full = spd(), fullDmg = dmg();
p.fullness = 5; tick(10);
ok(p.starving && spd() < full * 0.85 && dmg() < fullDmg, "starving: slower (" + (spd() / full).toFixed(2) + "x) and weaker");
p.bag = { meat: 5 };
A.act({ type: "farm.enter", id: "local" });
const r = A.act({ type: "farm.feed", id: "local", food: "meat" });
ok(r && r.ok && !p.starving && Math.abs(spd() - full) < 1e-9 && Math.abs(dmg() - fullDmg) < 1e-9, "fed at the farm: full speed and strength again at once, still at the farm");
A.act({ type: "farm.return", id: "local" }); tick(30);
ok(!p.starving && Math.abs(spd() - full) < 1e-9, "and still full speed back in the world");
/* starving can set in at the farm as well, and lifts again when fed */
A.act({ type: "farm.enter", id: "local" }); p.fullness = 10.0005; A.act({ type: "farm.tick", id: "local", dt: 0.5 });
ok(p.starving, "the belly still runs down at the farm, and starving counts there too");
A.act({ type: "farm.feed", id: "local", food: "meat" });
ok(!p.starving && Math.abs(spd() - full) < 1e-9, "fed again: back to speed");
console.log(failed ? failed + " FAILED" : "hunger-test: all passed");
process.exit(failed ? 1 : 0);
