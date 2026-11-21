/* node scripts/farm-go-test.js : the farm on demand (Nov 20). No timed visits; you can't go with an enemy
 * close; while you're there the world keeps going and nothing can reach your pair; you come back to the
 * spot you left, with a moment's shield. */
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
const F = D.FARM_CFG;
const sim = new mission.MissionSim({ seed: 3, hz: auth.TICK_HZ, data: D }), a = new auth.Authority({ sim: sim, seed: 3 });
sim.phase = "playing"; sim.time = 400;
if (!sim.players[0]) { sim.players.push({ id: "local" }); sim.localId = "local"; }
const p = sim.players[0];
Object.assign(p, { form: "agumon", level: 5, hp: 100, maxHp: 100, x: 500, y: 500, mx: 520, my: 500, faint: 0, downed: false, hasTamer: true, kind: "human", tamerHp: 100, tamerMaxHp: 100, fullness: 80, lastFarmAt: 0 });
sim.enemies.length = 0;

ok(F.onDemand && a.progression && !a.progression._markFarmDue(p) && !p.pendingFarm, "no farm visit comes due on a timer, even long after the last one");

const foe = sim.spawnEnemy(Object.keys(D.ENEMIES).find(k => !D.ENEMIES[k].boss), { x: 600, y: 500, keepType: true });
let r = a.act({ type: "farm.enter", id: p.id });
ok(!r.ok && /close/i.test(r.reason) && !p.atFarm, "you can't go with an enemy close (" + r.reason + ")");
foe.x = 500 + F.blockRadius + 200;
r = a.act({ type: "farm.enter", id: p.id });
ok(r.ok && p.atFarm && sim.phase === "playing", "with nobody close you go, and the world stays in play");

const t0 = sim.time, hp0 = p.hp, th0 = p.tamerHp;
foe.x = p.mx + 2; foe.y = p.my; foe.hitCd = 0; foe.hitCdM = 0;
for (let i = 0; i < 60; i++) sim.step();
ok(sim.time > t0 + 1, "the world keeps going while you're at the farm (" + (sim.time - t0).toFixed(1) + " s passed)");
ok(p.hp === hp0 && p.tamerHp === th0, "nothing in the world can reach your pair while you're away");
ok(p.x === 500 && p.y === 500, "your spot is kept");

r = a.act({ type: "farm.return", id: p.id });
ok(r.ok && !p.atFarm && p.x === 500 && p.monInvuln >= F.returnShield - 0.01, "leave the farm and you are back where you stood, with a moment's shield");

console.log(failed ? failed + " failed" : "all passed");
process.exit(failed ? 1 : 0);
