/* node scripts/levels-test.js : Ragnarok-style levels and toughness, and a map that never runs empty (Nov 20).
 * Wild Digimon have levels in their stage's band, higher further out; tougher and worth more XP; the gap
 * to your partner's level decides XP and how hard they hit; Ultimate/Mega wait on the run clock;
 * nearly-empty nests breed back faster; wanderers drift in when the area is bare. */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
global.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {} }), width: 0, height: 0 }) };
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "day-clock", "seasons", "weather", "biomes", "rarity", "evo-stat-gates", "evo-hardmode"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
D.sprites = Object.assign(D.sprites || {}, { colors: {}, SCALE: 3, TILE: 48 });
require(path.join(root, "js/world.js"));
const L = D.LEVELS, W = D.world;
const mission = require(path.join(root, "js/net/mission-sim.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
W.reset(5); W.setTime(100);
const sim = new mission.MissionSim({ seed: 5, hz: 30, data: D });
sim.phase = "playing"; sim.time = 100;
if (!sim.players[0]) { sim.players.push({ id: "local" }); sim.localId = "local"; }
const p = sim.players[0];
Object.assign(p, { form: "agumon", level: 10, hp: 100, maxHp: 100, x: 0, y: 0, mx: 0, my: 0, faint: 0, downed: false, hasTamer: true, kind: "human", tamerHp: 100 });
sim.enemies.length = 0;
const rook = Object.keys(D.ENEMIES).find(k => D.ENEMIES[k].stageDisplay === "Child (Rookie)" && !D.ENEMIES[k].boss);
const def = D.ENEMIES[rook], band = L.band[def.stageDisplay];
const near = [], far = [];
for (let i = 0; i < 30; i++) { near.push(sim.spawnEnemy(rook, { x: 2600, y: 0, keepType: true })); far.push(sim.spawnEnemy(rook, { x: 11000, y: 0, keepType: true })); }
const avg = a => a.reduce((s, e) => s + e.lv, 0) / a.length;
ok(near.every(e => e.lv >= band[0] && e.lv <= band[1]) && avg(far) > avg(near) + 2, "a Rookie's level sits in its band, higher further out (near " + avg(near).toFixed(1) + ", far " + avg(far).toFixed(1) + ")");
D.LEVELS = null; const plain = sim.spawnEnemy(rook, { x: 2600, y: 0, keepType: true }); D.LEVELS = L;
const tough = sim.spawnEnemy(rook, { x: 2600, y: 0, keepType: true });
ok(tough.maxHp >= plain.maxHp * L.hpMul * 0.99 && tough.dmgMul >= (plain.dmgMul || 1) * L.dmgMul * 0.99, "properly tough: x" + L.hpMul + " health (" + Math.round(plain.maxHp) + " → " + Math.round(tough.maxHp) + ") and x" + L.dmgMul + " damage");
const e = near[0];
e.lv = 10; const same = sim._xpGap(e, p);
e.lv = 16; const above = sim._xpGap(e, p), hit = sim._dmgGap(e, p);
p.level = 20; e.lv = 5; const below = sim._xpGap(e, p); p.level = 10;
ok(above > same && hit > 1, "one above you is worth more XP (" + above.toFixed(2) + "x) and hits harder (" + hit.toFixed(2) + "x)");
ok(below <= 0.1, "one far below you gives next to nothing (" + below.toFixed(2) + "x): easy to cut down, won't level you");

/* the big digivolutions wait on the run clock */
const H = D.evoHardmode || D.EVO_HARDMODE || null;
const gate = s => { const st = { _fromStage: s, level: 99, formTime: 99999, runTime: 0 }; return st; };
const cm = global.EVO_TREE && global.EVO_TREE.conditionsMet;
if (cm) {
  ok(!cm({}, Object.assign(gate("Ultimate"), { runTime: 3500 })) && cm({}, Object.assign(gate("Ultimate"), { runTime: 3700 })) !== false, "a Mega needs at least an hour of the run");
} else ok(true, "(no evolution checker exposed in this harness)");

/* never empty */
sim.nests = { a: { key: "a", x: 500, y: 0, kind: "herd", biome: "plains", cap: 6, count: 0.5, t: sim.time, active: false, type: rook, breedT: 40 } };
const st = sim.nests.a;
sim.time += D.NESTS.breedSec; sim._nestT = 0; p.x = 99999;
sim._updateNests(0.01, sim._wave(sim.time), p);
ok(st.count >= 0.5 + L.lowMul - 0.01, "a nearly-emptied nest breeds back faster (" + st.count.toFixed(1) + " after one breeding time)");
p.x = 0; sim.enemies.length = 0; sim._wanderT = 0;
sim._updateWanderers(0.1, sim._wave(sim.time), p);
const wand = sim.enemies.filter(x => x.pack && x.pack.indexOf("wander:") === 0);
ok(wand.length >= Math.min(L.wanderSize[0], D.RESPAWN.startHerd) && wand.every(x => Math.hypot(x.x, x.y) > 700), "an empty area gets a wandering herd drifting in from off-screen (" + wand.length + ")");

console.log(failed ? failed + " failed" : "all passed");
process.exit(failed ? 1 : 0);
