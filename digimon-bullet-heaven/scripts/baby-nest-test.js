/* node scripts/baby-nest-test.js : baby nests (Baby I / In-Training) breed back fast (Nov 21). Clear
 * the ones round the start and they are back in well under a minute, and hold a couple more. */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
global.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {} }), width: 0, height: 0 }) };
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "day-clock", "seasons", "weather", "biomes"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
D.sprites = Object.assign(D.sprites || {}, { colors: {}, SCALE: 3, TILE: 48 });
require(path.join(root, "js/world.js"));
const W = D.world, N = D.NESTS;
const mission = require(path.join(root, "js/net/mission-sim.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }

W.reset(7); W.setTime(30);
const sim = new mission.MissionSim({ seed: 7, hz: 30, data: D });
sim.phase = "playing"; sim.time = 30;
if (!sim.players[0]) { sim.players.push({ id: "local" }); sim.localId = "local"; }
const p = sim.players[0];
Object.assign(p, { form: "agumon", level: 3, hp: 100, maxHp: 100, x: 0, y: 0, mx: 0, my: 0, faint: 0, downed: false, hasTamer: true, kind: "human", hatchLeft: 0 });
sim.enemies.length = 0;
const step = s => { for (let i = 0; i < 30 * s; i++) { sim.time += 1 / 30; W.setTime(sim.time); sim._updateSpawns(1 / 30); } };
step(20);
const babies = Object.values(sim.nests).filter(st => sim._nestBaby(st));
ok(babies.length >= 1, babies.length + " baby nests round the start");
ok(babies.every(st => st.cap >= st.babyCap0 + N.babyCapAdd), "each holds " + N.babyCapAdd + " more than it used to (" + babies.map(s => s.babyCap0 + "→" + s.cap).join(", ") + ")");
/* wipe out every baby nest's herd */
const before = {};
for (const st of babies) before[st.key] = st.cap;
for (const e of sim.enemies.slice()) if (e.nest && babies.some(st => st.key === e.nest) && !e.dead) sim._killEnemy(e, { id: p.id });
const alive = () => sim.enemies.filter(e => !e.dead && e.nest && babies.some(st => st.key === e.nest)).length;
const a0 = alive();
let t = 0, firstBack = null;
while (t < 90) { step(1); t += 1; if (firstBack == null && alive() > a0) firstBack = t; }
const a90 = alive();
ok(firstBack != null && firstBack <= 15, "after clearing them, the first baby is back in " + firstBack + " s (was 40 s)");
ok(a90 >= Math.min(babies.length * 3, 6), "a minute and a half later there are " + a90 + " babies about again");
console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
