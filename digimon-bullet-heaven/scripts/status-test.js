/* node scripts/status-test.js : element marks on enemies, their reactions, and ground patches */
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
const S = D.STATUS;
D.world = { isGrass: (x, y) => x > 5000 };       /* grass only far to the east */
const sim = new mission.MissionSim({ seed: 5, hz: auth.TICK_HZ, data: D }); new auth.Authority({ sim: sim, seed: 5 });
sim.phase = "playing"; sim.time = 100;
const owner = { id: null, form: "agumon" };
function mk(x, boss) { const e = { _id: Math.random(), type: "numemon", x: x || 0, y: 0, hp: 1e6, maxHp: 1e6, radius: 12, flash: 0, hitCd: 0, hitCdM: 0, boss: !!boss }; sim.enemies.push(e); return e; }
function sure(fn) { const r = sim.rng; sim.rng = () => 0; try { return fn(); } finally { sim.rng = r; } }
function never(fn) { const r = sim.rng; sim.rng = () => 0.999; try { return fn(); } finally { sim.rng = r; } }
const has = (e, k) => !!(e.st && e.st[k] && e.st[k].t > 0);
/* each element leaves its own mark */
const want = { fire: "burn", ice: "freeze", water: "wet", nature: "root", machine: "shock", beast: "bleed", slime: "poison", dark: "curse", holy: "daze" };
let all = true; for (const el in want) { const e = mk(); sure(() => sim._applyElement(e, el, 100, owner)); if (!has(e, want[el])) { all = false; console.log("    missing " + el); } }
ok(all, "every element leaves its mark: " + Object.keys(want).map(k => k + " → " + want[k]).join(", "));
let e = mk(); const kn = sure(() => sim._applyElement(e, "wind", 100, owner));
ok(kn === S.wind.knock && has(e, "stun"), "wind throws twice as far and winds it");
/* burn does damage over time, and can kill */
e = mk(); sure(() => sim._applyElement(e, "fire", 100, owner)); const hp0 = e.hp; for (let i = 0; i < 20; i++) sim._tickStatus(e, 0.05);
ok(Math.abs((hp0 - e.hp) - 100 * S.fire.dps) < 0.5, "a burn from a 100 hit deals " + (hp0 - e.hp).toFixed(0) + " a second");
e = mk(); e.hp = 5; sure(() => sim._applyElement(e, "fire", 100, owner)); sim._tickStatus(e, 1);
ok(e.dead, "and it can finish an enemy off");
/* speed and stuns */
e = mk(); sure(() => sim._applyElement(e, "nature", 10, owner)); sim._tickStatus(e, 0.01); ok(e.stSlow === S.slow.root, "a rooted enemy moves at " + S.slow.root * 100 + "%");
e = mk(); sure(() => sim._applyElement(e, "ice", 10, owner)); sim._tickStatus(e, 0.01); ok(e.stStun === true, "a frozen enemy cannot move");
e = mk(0, true); sure(() => sim._applyElement(e, "ice", 10, owner)); sim._tickStatus(e, 0.01); ok(!e.stStun && has(e, "chill") && e.stSlow === S.slow.chill, "a boss is only chilled");
/* reactions on an enemy */
e = mk(); sure(() => sim._applyElement(e, "fire", 100, owner)); never(() => sim._applyElement(e, "water", 10, owner)); ok(!has(e, "burn"), "water puts a burn out");
e = mk(); sure(() => sim._applyElement(e, "water", 10, owner)); sure(() => sim._applyElement(e, "fire", 100, owner)); ok(!has(e, "wet") && !has(e, "burn"), "fire dries a soaked enemy and does not catch");
e = mk(); sure(() => sim._applyElement(e, "water", 10, owner)); never(() => sim._applyElement(e, "ice", 10, owner)); ok(has(e, "freeze") && e.st.freeze.t > S.ice.time, "ice freezes a soaked enemy for sure, and for longer (" + e.st.freeze.t.toFixed(1) + " s)");
e = mk(); sure(() => sim._applyElement(e, "ice", 10, owner)); never(() => sim._applyElement(e, "fire", 10, owner)); ok(!has(e, "freeze") && has(e, "wet"), "fire thaws a frozen enemy, leaving it soaked");
e = mk(); const nb = mk(40), far = mk(400); sure(() => sim._applyElement(e, "fire", 100, owner)); never(() => sim._applyElement(e, "wind", 10, owner));
ok(has(nb, "burn") && !has(far, "burn"), "wind spreads a burn to enemies close by");
e = mk(); sure(() => sim._applyElement(e, "dark", 10, owner)); const h1 = e.hp; sim.hurtEnemy(e, 100, 0, 0, 0, null, 1, null);
ok(Math.abs((h1 - e.hp) - 100 * S.dark.taken) < 0.01, "a cursed enemy takes " + S.dark.taken + "x damage");
/* ground patches */
sim.enemies.length = 0; sim.patches = [];
let q = sim._addPatch("wet", 0, 0, 40, 0, owner, 0); ok(q && sim.patches.length === 1, "water leaves a puddle");
sim._addPatch("ice", 10, 0, 40, 0, owner, 0); ok(sim.patches.length === 1 && sim.patches[0].kind === "ice", "ice on a puddle freezes it into a sheet");
sim._addPatch("fire", 0, 5, 40, 10, owner, 0); ok(sim.patches.length === 1 && sim.patches[0].kind === "wet", "fire on ice melts it back to a puddle");
sim._addPatch("fire", 0, 5, 40, 10, owner, 0); ok(sim.patches.length === 0, "fire on a puddle dries it up");
sim._addPatch("fire", 0, 0, 40, 10, owner, 0); ok(sim.patches.length === 1 && sim.patches[0].kind === "fire", "fire on bare ground burns");
sim._addPatch("wet", 0, 0, 40, 0, owner, 0); ok(sim.patches.length === 1 && sim.patches[0].kind === "wet", "water puts the fire out (a puddle is left)");
sim.patches = []; sim._addPatch("goo", 0, 0, 40, 5, owner, 0); sim._addPatch("fire", 0, 0, 40, 10, owner, 0); ok(sim.patches.length === 1 && sim.patches[0].kind === "fire", "fire sets slime alight");
sim.patches = []; sim._addPatch("fire", 0, 0, 30, 10, owner, 0); const r0 = sim.patches[0].r; sim._maybePatch(10, 0, "wind", 10, owner, null); ok(sim.patches[0].r > r0, "wind fans a fire wider");
/* standing in them */
sim.patches = []; sim._addPatch("fire", 0, 0, 40, 10, owner, 0); e = mk(10); const out = mk(300); sim._updatePatches(0.3);
ok(has(e, "burn") && !has(out, "burn"), "an enemy standing in fire burns; one outside does not");
sim.patches = []; sim._addPatch("ice", 0, 0, 40, 0, owner, 0); e = mk(5); sim._updatePatches(0.3); ok(has(e, "chill"), "an ice sheet chills");
sim.patches = []; sim._addPatch("wet", 0, 0, 40, 0, owner, 0); e = mk(5); sim._updatePatches(0.3); ok(has(e, "wet"), "a puddle soaks");
/* grass */
sim.patches = []; sim.enemies.length = 0;
const bare = sim._addPatch("fire", 0, 0, 30, 10, owner, 0), grass = sim._addPatch("fire", 6000, 0, 30, 10, owner, 0);
ok(grass.grass && grass.max > bare.max, "fire on grass burns longer (" + grass.max.toFixed(1) + " s against " + bare.max.toFixed(1) + " s)");
sure(() => { for (let i = 0; i < 12; i++) sim._updatePatches(0.26); });
ok(sim.patches.filter(p => p.x > 5000).length > 1 && sim.patches.filter(p => p.x < 1000).length <= 1, "and creeps across grass, but not across bare ground");
ok(sim.patches.every(p => p.gen <= S.patch.spreadGen), "the creep stops after " + S.patch.spreadGen + " steps");
/* bigger moves leave patches more often */
ok(S.patch.chance[5] > S.patch.chance[1] * 3, "a top move leaves a patch far more often than a starter move");
const snap = sim.snapshot ? sim.snapshot(true) : null;
if (snap) ok(Array.isArray(snap.patches) && snap.patches.length === sim.patches.length, "patches travel in the snapshot");
console.log(failed ? "status-test: " + failed + " failed" : "status-test: all passed");
process.exit(failed ? 1 : 0);
