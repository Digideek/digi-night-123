/* node scripts/packs-lava-test.js : herds out of a nest stay put until approached; lava burns partners only, never to death */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "stage-waves"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) { console.log("load " + f + ": " + e.message); } });
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const sim = new mission.MissionSim({ seed: 5, hz: auth.TICK_HZ, data: D });
new auth.Authority({ sim: sim, seed: 5 });
sim.phase = "playing";
let p = sim.players[0];
if (!p) { sim.players.push({ id: "local" }); p = sim.players[0]; sim.localId = "local"; }
Object.assign(p, { form: "agumon", hp: 200, maxHp: 200, x: 0, y: 0, mx: 0, my: 0, faint: 0, downed: false, hasTamer: true });
sim.time = 200; sim.enemies.length = 0;
const wave = sim._wave(sim.time);
/* a herd comes out of its nest (nest-sim.js) and stands about near it */
sim.nests = { "n1": { key: "n1", x: 700, y: 0, kind: "herd", biome: "plains", cap: 8, count: 8, t: sim.time, active: false, type: Object.keys(wave.rates)[0], breedT: 40 } };
sim._nestRelease(sim.nests.n1);
const pack = sim.enemies.filter(e => e.pack);
ok(pack.length === 8 && pack.every(e => e.nest === "n1"), "a herd of " + pack.length + " " + (pack[0] && pack[0].type) + " comes out of its nest");
const far = Math.min.apply(null, pack.map(e => Math.hypot(e.x, e.y)));
ok(far > 700 - 18 - D.NESTS.scatter - 5, "round the nest, out of sight (" + Math.round(far) + " px away)");
const others = sim.enemies.length;
for (let i = 0; i < 250; i++) { sim.time += 0.04; sim._updateEnemies(0.04); }
const drift = Math.max.apply(null, pack.map(e => Math.hypot(e.x - e.homeX, e.y - e.homeY)));
ok(drift <= D.PACKS.wander + 12, "ten seconds on, nobody strayed past " + Math.round(drift) + " px from its spot");
ok(!sim.packs[pack[0].pack].awake, "still unaware");
p.x = p.mx = pack[0].x + 100; p.y = p.my = pack[0].y;
const before = pack.map(e => Math.hypot(e.x - p.mx, e.y - p.my));
for (let i = 0; i < 50; i++) { sim.time += 0.04; sim._updateEnemies(0.04); }
ok(sim.packs[pack[0].pack].awake, "walking up to one wakes the pack");
const closer = pack.filter((e, i) => Math.hypot(e.x - p.mx, e.y - p.my) < before[i] - 5 || Math.hypot(e.x - p.mx, e.y - p.my) < 40).length;
ok(closer >= pack.length - 1, closer + " of " + pack.length + " are charging");
/* lava */
D.world = { hazardNear: () => true };
sim.data.world = D.world;
const e0 = pack[0], ehp = e0.hp; p.hp = 200;
for (let i = 0; i < 50; i++) sim._updateLava(0.04);
ok(p.hp < 200 && p.hp > 170, "two seconds at the lava's edge costs " + (200 - p.hp) + " of 200 HP");
p.hp = 3; for (let i = 0; i < 200; i++) sim._updateLava(0.04);
ok(p.hp === 1, "lava never takes the last hit point");
ok(e0.hp === ehp, "enemies are not burned");
console.log(failed ? "packs-lava-test: " + failed + " failed" : "packs-lava-test: all passed");
process.exit(failed ? 1 : 0);
