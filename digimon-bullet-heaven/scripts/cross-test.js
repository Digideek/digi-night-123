/* node scripts/cross-test.js : flying and water Digimon cross water (Nov 20). Fliers also cross lava,
 * swimmers don't; walkers and the tamer still can't; a flying or swimming partner can go out over the
 * water but no further than LIVING.leash from its tamer. Uses the real world.js. */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
global.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {} }), width: 0, height: 0 }) };
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "day-clock", "seasons", "weather", "biomes"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
D.sprites = Object.assign(D.sprites || {}, { colors: {}, SCALE: 3, TILE: 48 });
require(path.join(root, "js/world.js"));
const W = D.world, T = 48, BI = D.biomes;
const mission = require(path.join(root, "js/net/mission-sim.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }

ok(BI.crossOf("biyomon") === 2 && BI.crossOf("angemon") === 2 && BI.crossOf("kabuterimon") === 2 && BI.crossOf("patamon") === 2, "birds, angels and winged bugs fly");
ok(BI.crossOf("gomamon") === 1 && BI.crossOf("seadramon") === 1 && BI.crossOf("gekomon") === 1 && BI.crossOf("bukamon") === 1, "sea and swamp Digimon swim");
ok(BI.crossOf("agumon") === 0 && BI.crossOf("greymon") === 0 && BI.crossOf("dokugumon") === 0, "the rest walk");

W.reset(7); W.setTime(100);
let wt = null, lava = null;
for (let y = -80; y <= 80 && !wt; y++) for (let x = -80; x <= 80 && !wt; x++) if (W.openWaterAt((x + 0.5) * T, (y + 0.5) * T) && W.openWaterAt((x + 1.5) * T, (y + 0.5) * T)) wt = [x, y];
for (let y = -400; y <= 400 && !lava; y += 2) for (let x = -400; x <= 400 && !lava; x += 2) if (W.materialAt(x, y) === W.MAT.WATER && W.biomeIdAt(x, y) === "volcano") lava = [x, y];
const wx = (wt[0] + 0.5) * T, wy = (wt[1] + 0.5) * T;
ok(W.isRaised(wx, wy, 0, 0) && !W.isRaised(wx, wy, 0, 1) && !W.isRaised(wx, wy, 0, 2), "open water stops walkers, not swimmers or fliers");
if (lava) { const lx = (lava[0] + 0.5) * T, ly = (lava[1] + 0.5) * T; ok(W.isRaised(lx, ly, 0, 1) && !W.isRaised(lx, ly, 0, 2), "lava stops swimmers, not fliers"); }
const s1 = W.moveSlide(wx, wy, 3, 0, 8, 1);
ok(s1.x === wx + 3, "a swimmer moves about in the water instead of being put back on the bank");

const sim = new mission.MissionSim({ seed: 7, hz: 30, data: D });
sim.phase = "playing"; sim.time = 100;
if (!sim.players[0]) { sim.players.push({ id: "local" }); sim.localId = "local"; }
const p = sim.players[0];
Object.assign(p, { form: "biyomon", hp: 100, maxHp: 100, x: wx - 300, y: wy, mx: wx, my: wy, hasTamer: true });
ok(sim._leashed(p, { x: wx + 6, y: wy }) && !sim._leashed(p, { x: wx - 6, y: wy }), "a flying partner over water won't go further than " + D.LIVING.leash + " px from you, but can come back");
sim._navReady();
const fly = sim._steer({ x: wx - 120, y: wy, type: "biyomon", radius: 10, _id: 1 }, wx + 200, wy, "t", 0.1);
ok(fly.x > 0.9, "a flying enemy heads straight across the water at you");

console.log(failed ? failed + " failed" : "all passed");
process.exit(failed ? 1 : 0);
