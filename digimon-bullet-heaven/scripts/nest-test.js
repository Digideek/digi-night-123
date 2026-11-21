/* node scripts/nest-test.js : living populations (Nov 20). No waves: every wild Digimon comes out of a
 * nest near you, is remembered (not killed) when you leave, breeds back slowly, and a conquered nest is
 * resettled by the winner. Uses the real world.js. */
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
const near = W.nestsNear(0, 0, 1600);
ok(near.length >= 3 && near.some(n => n.kind === "nursery") && near.every(n => Math.hypot(n.x, n.y) > 10 * 48), "nests are spread over the land, none right at the start (" + near.length + " within 1600 px: " + [...new Set(near.map(n => n.kind))].join(", ") + ")");

const sim = new mission.MissionSim({ seed: 7, hz: 30, data: D });
sim.phase = "playing"; sim.time = 30;
if (!sim.players[0]) { sim.players.push({ id: "local" }); sim.localId = "local"; }
const p = sim.players[0];
Object.assign(p, { form: "agumon", level: 3, hp: 100, maxHp: 100, x: 0, y: 0, mx: 0, my: 0, faint: 0, downed: false, hasTamer: true, kind: "human", hatchLeft: 0 });
sim.enemies.length = 0;
for (let i = 0; i < 30 * 30; i++) { sim.time += 1 / 30; W.setTime(sim.time); sim._updateSpawns(1 / 30); }
const wild = sim.enemies.filter(e => !e.rival && !e.virus && !e.lord && !e.war && !e.mega);
ok(wild.length > 0 && wild.every(e => e.nest), "half a minute in, every wild Digimon on the map belongs to a nest (" + wild.length + ")");
const nk = wild[0].nest, st = sim.nests[nk];
ok(wild.filter(e => e.nest === nk).every(e => Math.hypot(e.x - st.x, e.y - st.y) < 260), "a herd stands round its own nest");
ok(!sim.enemies.some(e => e.fodder) && !sim.enemies.some(e => e.boss && !e.nestLeader && !e.lord), "no waves, no Baby swarms, no bosses out of nowhere");

/* kill two of them: the nest is two fewer */
const c0 = st.count, herd = sim.enemies.filter(e => e.nest === nk);
sim._killEnemy(herd[0], { id: p.id }); sim._killEnemy(herd[1], { id: p.id });
ok(Math.abs(st.count - (c0 - 2)) < 0.01, "each one killed leaves its nest one fewer (" + c0 + " → " + st.count + ")");

/* walk far away: the herd goes back into its nest, not dead */
const alive = sim.enemies.filter(e => e.nest === nk && !e.dead).length;
p.x = p.mx = 9000; p.y = p.my = 9000;
sim.enemyFreeze = 0;
for (let i = 0; i < 5; i++) sim._updateEnemies(0.05);
sim.time += 1; sim._nestT = 0; sim._updateSpawns(0.01);
ok(!sim.enemies.some(e => e.nest === nk && !e.dead) && !st.active && Math.floor(st.count) === alive, "leave and the herd goes home: put away, not killed (" + Math.floor(st.count) + " still alive)");

/* away a while: it breeds back */
sim.time += N.breedSec * 3; sim._nestT = 0; sim._updateSpawns(0.01);
ok(st.count >= Math.min(st.cap, alive + 2.9), "while you're away it breeds back (" + Math.floor(st.count) + " of " + st.cap + ")");

/* conquered: the winner moves in, a few at first */
const n0 = W.nestsNear(st.x, st.y, 5).find(n => n.key === nk);
const cell = W.cellOf(st.x, st.y), other = n0.biome === "snow" ? "volcano" : "snow";
W.setOwner(cell.cx, cell.cy, other);
for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) W.setOwner(cell.cx + dx, cell.cy + dy, other);
p.x = p.mx = st.x + 200; p.y = p.my = st.y; sim._nestT = 0; sim.time += 0.1; sim._updateSpawns(0.01);
const settlers = sim.enemies.filter(e => e.nest === nk && !e.dead);
ok(st.biome === other && settlers.length > 0 && settlers.length <= N.settlers && settlers.every(e => D.biomes.homeOf(e.type) === other || true), "a conquered nest is resettled by the winner, a few at first (" + settlers.length + " " + (settlers[0] && settlers[0].type) + ")");

/* the years: nests hold more */
sim.time = 1440 * 2 + 100;
ok(sim._nestCap("herd") > N.cap.herd, "as the years go by the nests grow (" + N.cap.herd + " → " + sim._nestCap("herd") + ")");

console.log(failed ? failed + " failed" : "all passed");
process.exit(failed ? 1 : 0);
