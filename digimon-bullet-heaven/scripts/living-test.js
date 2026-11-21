/* node scripts/living-test.js : the living map (Nov 20). Rivers block and fords cross; winter freezes the
 * seasonal water and spring thaws it; ice moves bridge water for a while; big blasts fell trees; rain fills
 * puddles that soak whatever stands in them; undisturbed packs graze, drink and sleep. Uses the real world.js. */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
global.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {} }), width: 0, height: 0 }) };
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "day-clock", "seasons", "weather", "biomes"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
D.sprites = Object.assign(D.sprites || {}, { colors: {}, SCALE: 3, TILE: 48 });
require(path.join(root, "js/world.js"));
const W = D.world, T = 48, M = W.MAT;
const mission = require(path.join(root, "js/net/mission-sim.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }

/* ---- rivers and fords ---- */
W.reset(7); W.setTime(100);
let river = 0, ford = 0, N = 120;
for (let y = -N; y <= N; y++) for (let x = -N; x <= N; x++) {
  if (W._river(x, y) < 1.45) { const m = W.materialAt(x, y); if (m === M.WATER) river++; else if (m === M.PATH) ford++; }
}
ok(river > 1500 && ford > 100 && ford < river * 0.3, "rivers wind through the map with fords along them (" + river + " river tiles, " + ford + " ford)");
function reach(seed, R) {
  W.reset(seed); W.setTime(100);
  const seen = new Set(["0,0"]), q = [[0, 0]]; let got = 0, open = 0;
  const blocked = (x, y) => W.isRaised((x + 0.5) * T, (y + 0.5) * T, T * 0.34);
  while (q.length) { const [x, y] = q.pop(); got++; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + "," + ny; if (Math.abs(nx) > R || Math.abs(ny) > R || seen.has(k)) continue; seen.add(k); if (!blocked(nx, ny)) q.push([nx, ny]); } }
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) if (!blocked(x, y)) open++;
  return got / open;
}
[1, 7, 42].forEach(sd => { const r = reach(sd, 110); ok(r > 0.97, "seed " + sd + ": nearly all open ground can still be walked to from the start (" + (r * 100).toFixed(1) + "%)"); });

/* a plains water tile to work with */
W.reset(7); W.setTime(100);
let wt = null;
for (let y = -80; y <= 80 && !wt; y++) for (let x = -80; x <= 80 && !wt; x++) if (W.materialAt(x, y) === M.WATER && W.biomeIdAt(x, y) === "plains" && W.materialAt(x + 1, y) === M.WATER && W.materialAt(x - 1, y) === M.WATER) wt = [x, y];
const wx = (wt[0] + 0.5) * T, wy = (wt[1] + 0.5) * T;
ok(W.isRaised(wx, wy, 0) && W.openWaterAt(wx, wy), "open water can't be walked on");

/* ---- seasons ---- */
const L = D.seasons.CFG.lengthSec;
W.setTime(3 * L + 5); const early = W.iceLevel();
W.setTime(3 * L + 120);
ok(early < 0.3 && W.iceLevel() === 1 && !W.isRaised(wx, wy, 0), "winter freezes the rivers over, a bit at a time (" + early.toFixed(2) + " → " + W.iceLevel() + ")");
W.setTime(4 * L + 200);
ok(W.iceLevel() === 0 && W.isRaised(wx, wy, 0), "spring thaws them again");
let snowW = null, lava = null;
for (let y = -300; y <= 300 && !(snowW && lava); y += 1) for (let x = -300; x <= 300 && !(snowW && lava); x += 3) {
  if (W.materialAt(x, y) !== M.WATER) continue;
  const b = W.biomeIdAt(x, y);
  if (b === "snow" && !snowW) snowW = [x, y]; if (b === "volcano" && !lava) lava = [x, y];
}
if (snowW) ok(W.isFrozenTile(snowW[0], snowW[1]), "Freezeland's lakes are always ice");
if (lava) { W.setTime(3 * L + 120); ok(!W.isFrozenTile(lava[0], lava[1]), "lava never freezes, not even in winter"); W.setTime(4 * L + 200); }

/* ---- ice bridges ---- */
const sim = new mission.MissionSim({ seed: 7, hz: 30, data: D });
sim.phase = "playing"; sim.time = 4 * L + 200; W.setTime(sim.time);
if (!sim.players[0]) { sim.players.push({ id: "local" }); sim.localId = "local"; }
const p = sim.players[0];
Object.assign(p, { form: "gabumon", level: 5, hp: 100, maxHp: 100, x: wx - 300, y: wy, mx: wx - 300, my: wy, faint: 0, downed: false, hasTamer: true, kind: "human" });
const ev = []; const emit0 = sim.emit.bind(sim); sim.emit = e => { ev.push(e); return emit0(e); };
sim._navReady(); const ver0 = sim._nav.ice;
const b = { x: wx - 4, y: wy, vx: 0, vy: 0, wid: "x", ownerId: p.id, _el: "ice" };
sim._iceTrail(b, 0.016);
ok(!W.isRaised(wx, wy, 0) && ev.some(e => e.k === "icewater"), "an ice shot over the water freezes a bridge, and everyone is told");
sim._navReady();
ok(sim._nav.ice !== ver0, "the enemies' pathfinding learns the water froze");
const unit = W.moveSlide(wx, wy, 2, 0, 8);
ok(unit.x === wx + 2, "you can walk out onto it");
W.setTime(sim.time + 31);
const back = W.moveSlide(wx, wy, 2, 0, 8);
ok(W.isRaised(wx, wy, 0) && !W.isRaised(back.x, back.y, 8), "when it melts, whoever is still on it is put back on the bank");
W.setTime(sim.time);

/* ---- felled trees ---- */
let tree = null;
for (let y = -60; y <= 60 && !tree; y++) for (let x = -60; x <= 60 && !tree; x++) if (W.TREES[W.propAt(x, y)]) tree = [x, y];
const tx = (tree[0] + 0.5) * T, ty = (tree[1] + 0.9) * T;
ok(sim._fellTrees(tx, ty - 6, 30) === 0 && !W.fallOf(tree[0] + "," + tree[1]), "a small blast leaves the trees standing");
ok(sim._fellTrees(tx + 20, ty - 6, 90) > 0 && W.fallOf(tree[0] + "," + tree[1]).state === 1 && W.fallOf(tree[0] + "," + tree[1]).dir === -1, "a big one knocks them flat, away from the blast");
W.setTime(sim.time + W.FELL.log + 1); ok(W.fallOf(tree[0] + "," + tree[1]).state === 2, "the log rots to a stump");
W.setTime(sim.time + W.FELL.stump + W.FELL.grow + 1); ok(!W.fallOf(tree[0] + "," + tree[1]), "and the tree grows back");
W.setTime(sim.time);

/* ---- puddles ---- */
W.setSoak(0); for (let i = 0; i < 300; i++) W.stepSoak(1, 1);
const pud = W.puddlesIn(-3000, -3000, 3000, 3000);
ok(W.soak() === 1 && pud.length > 30 && pud.some(q => q.pond), "a long rain fills puddles, and the deepest become ponds (" + pud.length + ", " + pud.filter(q => q.pond).length + " ponds)");
const pd = pud.find(q => !W.isRaised(q.x, q.y, 10));
sim.enemies.length = 0;
const en = sim.spawnEnemy(Object.keys(D.ENEMIES).find(k => !D.ENEMIES[k].boss && !D.ENEMIES[k].fly), { x: pd.x, y: pd.y, keepType: true });
en.x = pd.x; en.y = pd.y;
W.stepSoak = () => 1; sim._wet = () => 1; sim._pudT = 0; sim._updatePuddles(0.1);
ok(en.st && en.st.wet, "whatever stands in one is soaked");
ok(sim._addPatch("fire", pd.x, pd.y, 30, 1, null, 0) === null, "fire landing in a puddle hisses out");
W.setSoak(0);

/* ---- wild routines ---- */
sim.enemies.length = 0;
const type = Object.keys(D.ENEMIES).find(k => !D.ENEMIES[k].boss && D.ENEMIES[k].attribute !== "Virus" && !D.ENEMIES[k].fly);
const PK = { awake: false, x: 0, y: 0, hx: 0, hy: 0, cx: 0, cy: 0, tx: 0, ty: 0, task: "graze", tT: 99, night: false };
sim.packs = { pk1: PK };
const m = sim.spawnEnemy(type, { x: 10, y: 0, keepType: true }); m.pack = "pk1"; m.homeX = 10; m.homeY = 0; m.ox = 10; m.oy = 0;
const night = D.seasons.DAY.lengthSec * 0.85; sim.time = night;
sim._packRoutine(PK, 0.1);
ok(PK.task === "sleep", "at night a pack beds down");
p.x = 0; p.y = 0 + D.PACKS.aggro * 0.7; p.mx = p.x; p.my = p.y;
sim._updateEnemies ? 0 : 0;
const upd = ["_updateEnemies", "_enemiesStep", "updateEnemies"].find(n => typeof sim[n] === "function");
if (upd) {
  sim.enemyFreeze = 0; sim[upd](0.05);
  ok(!PK.awake && m.zz === 1, "asleep, it doesn't notice you creep past where it would have by day");
}
const VP = { awake: false, x: 0, y: 0, task: "graze", tT: 99, night: true };
sim._packRoutine(VP, 0.1);
ok(VP.task !== "sleep", "a Virus pack stays up and prowls");
sim.time = D.seasons.DAY.lengthSec * 0.3; PK.task = "graze"; PK.tT = 0; PK.cx = wx - 200; PK.cy = wy; PK.hx = PK.cx; PK.hy = PK.cy;
sim.rng = () => 0.01;
sim._packRoutine(PK, 0.1);
ok(PK.task === "drink" && Math.hypot(PK.tx - wx, PK.ty - wy) < 300 && !W.isRaised(PK.tx, PK.ty, 10), "by day it wanders down to the water to drink, and stands on the bank");
const c0 = PK.cx; for (let i = 0; i < 30; i++) sim._packRoutine(PK, 0.1);
ok(PK.cx !== c0, "the herd moves as one, slowly");

console.log(failed ? failed + " failed" : "all passed");
process.exit(failed ? 1 : 0);
