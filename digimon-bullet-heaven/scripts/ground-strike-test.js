/* node scripts/ground-strike-test.js : attacking a spot on the ground (17z33, Isaac: "right-click the ground and
 * my Digimon attacks there, so an Ice one can freeze water or a Fire one can light grass"). */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
global.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {} }), width: 0, height: 0 }) };
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "day-clock", "seasons", "weather", "biomes"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
D.sprites = Object.assign(D.sprites || {}, { colors: {}, SCALE: 3, TILE: 48 });
require(path.join(root, "js/world.js"));
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const W = () => D.world, GS = D.GROUND_STRIKE;
ok(GS && GS.sec === 3 && GS.maxRange > 200, "the order lasts " + GS.sec + " s, up to " + GS.maxRange + " px from you");
function mk(seed, form, weapon) {
  W().reset(seed); W().setTime(400);
  const sim = new mission.MissionSim({ seed, hz: auth.TICK_HZ, data: D }); const A = new auth.Authority({ sim, seed });
  sim.phase = "playing"; sim.time = 400; sim.runMode = "open";
  A.join({ id: "local", kind: "host-client", hasTamer: true, form, x: 0, y: 0, mx: 20, my: 0, level: 10 });
  sim.enemies.length = 0; sim.spawnEnemy = () => null;          /* nothing else around: only the order */
  const ev = []; const e0 = sim.emit.bind(sim); sim.emit = e => { ev.push(e); return e0(e); }; sim._ev = ev;
  const p = sim.player("local"); if (weapon) p.weapons = [{ id: weapon, level: 3 }];
  return { sim, A, p };
}
function find(test, from) {
  for (let r = 40; r < 4000; r += 24) for (let a = 0; a < 6.28; a += 0.2) { const x = from.x + Math.cos(a) * r, y = from.y + Math.sin(a) * r; if (test(x, y)) return { x, y }; }
  return null;
}
function run(w, sec, input) {
  for (let k = 0; k < sec * auth.TICK_HZ; k++) { w.A.onMessage({ type: "input", id: "local", inputs: [Object.assign({ seq: k + 1, x: 0, y: 0 }, k === 0 ? input : {})] }); w.A.step(); }
}
/* Fire on grass */
let w = mk(4, "agumon", "pepperBreath");
const grass = find((x, y) => W().isGrass(x, y) && !(W().isTallGrass && W().isTallGrass(x, y)) && !W().openWaterAt(x, y) && !(W().blocked && W().blocked(x, y)), { x: 0, y: 0 });
ok(!!grass, "found open grass");
w.p.x = grass.x - 130; w.p.y = grass.y; w.p.mx = grass.x - 110; w.p.my = grass.y;
run(w, 0.2, { strike: [grass.x, grass.y] });
ok(w.p.strike && Math.abs(w.p.strike.x - grass.x) < 1, "right-click: the order is set");
ok(w.sim._ev.some(e => e.type === "strike"), "  and said (for the screen)");
run(w, 2.8, {});
const fire = (w.sim.patches || []).filter(q => q.kind === "fire" && Math.hypot(q.x - grass.x, q.y - grass.y) < 120);
ok(fire.length > 0, "Agumon's fire set the grass alight there (" + fire.length + " fire patch" + (fire.length === 1 ? "" : "es") + ")");
ok(Math.hypot(w.p.mx - grass.x, w.p.my - grass.y) < GS.stand + 30, "  it walked up close to the spot first");
run(w, 1.5, {});
ok(!w.p.strike, "after " + GS.sec + " s the order runs out");
/* Ice on water */
w = mk(11, "gabumon", "frostyBubbles");
const water = find((x, y) => W().openWaterAt(x, y) && !W().openWaterAt(x - 70, y) && !(W().blocked && W().blocked(x - 70, y)), { x: 0, y: 0 });
ok(!!water, "found open water with a bank to stand on");
w.p.x = water.x - 150; w.p.y = water.y; w.p.mx = water.x - 120; w.p.my = water.y;
run(w, 3, { strike: [water.x, water.y] });
ok(w.sim._ev.some(e => e.k === "land" && e.el === "ice"), "Gabumon's Frosty Bubbles come down as ice");
ok(!W().openWaterAt(water.x, water.y), "  and froze the water where it was told to attack");
/* a left-click on an enemy or the ground ends it */
w = mk(4, "agumon");
run(w, 0.1, { strike: [100, 0] });
run(w, 0.1, { go: [40, 40] });
ok(!w.p.strike && w.p.goTo, "clicking the ground (left) calls it back instead");
/* too far: it goes as far as it may */
run(w, 0.1, { strike: [5000, 0] });
ok(w.p.strike && Math.abs(w.p.strike.x - w.p.x) <= GS.maxRange + 1, "a spot too far off: the order stops at " + GS.maxRange + " px");
/* an egg can't */
w = mk(4, "agumon"); w.p.form = "digitama_agumon";
w.sim._isEgg = () => true;
run(w, 0.1, { strike: [100, 0] });
ok(!w.p.strike, "an egg doesn't take the order");
console.log(failed ? "ground-strike-test: " + failed + " FAILED" : "ground-strike-test: all passed");
process.exit(failed ? 1 : 0);
