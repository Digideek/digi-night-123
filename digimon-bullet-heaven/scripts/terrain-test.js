/* node scripts/terrain-test.js : press E on a spire (an evil mini boss comes out, once) and on a cache (Bits and XP, once) */
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
/* a stand-in world: a spire at tile 2,2 and a cache at 6,2 */
const used = {};
D.world = { propAt: (tx, ty) => (tx === 2 && ty === 2 ? "spire" : tx === 6 && ty === 2 ? "cache" : null), markUsed: k => { used[k] = 1; }, isUsed: k => !!used[k] };
const sim = new mission.MissionSim({ seed: 3, hz: auth.TICK_HZ, data: D }), a = new auth.Authority({ sim: sim, seed: 3 });
sim.phase = "playing"; sim.time = 100;
if (!sim.players[0]) { sim.players.push({ id: "local" }); sim.localId = "local"; }
const p = sim.players[0];
Object.assign(p, { form: "agumon", level: 5, hp: 100, maxHp: 100, x: 2.5 * 48, y: 2.9 * 48 + 30, mx: 100, my: 160, faint: 0, downed: false, hasTamer: true, kind: "human" });
const ev = []; const emit0 = sim.emit.bind(sim); sim.emit = e => { ev.push(e); return emit0(e); };
let r = a.act({ type: "prop.use", id: p.id, tx: 9, ty: 9 });
ok(!r.ok, "nothing to use on an empty tile");
p.x += 600; r = a.act({ type: "prop.use", id: p.id, tx: 2, ty: 2 }); p.x -= 600;
ok(!r.ok && /closer/i.test(r.reason), "too far from the spire is refused");
const n0 = sim.enemies.length;
r = a.act({ type: "prop.use", id: p.id, tx: 2, ty: 2 });
const boss = sim.enemies.find(e => e.spire);
ok(r.ok && boss && boss.boss && D.TERRAIN.spire.evil[0].indexOf(boss.type) >= 0, "breaking the spire calls an evil mini boss (" + (boss && boss.type) + ", " + (boss && Math.round(boss.hp)) + " HP)");
ok(used["2,2"] && ev.some(e => e.type === "prop.used" && e.kind === "spire" && e.enemyType === boss.type), "the spire is marked spent and everyone is told");
r = a.act({ type: "prop.use", id: p.id, tx: 2, ty: 2 });
ok(!r.ok && sim.enemies.length === n0 + 1, "a spent spire does nothing more");
sim.time = 1440 * 1 + 10; used["2,2"] = 0; sim.usedProps = {};
r = a.act({ type: "prop.use", id: p.id, tx: 2, ty: 2 });
ok(r.ok && D.TERRAIN.spire.evil[1].indexOf(r.enemyType) >= 0, "in Year 2 an Ultimate comes out (" + r.enemyType + ")");
p.x = 6.5 * 48; const o0 = sim.orbs.length;
r = a.act({ type: "prop.use", id: p.id, tx: 6, ty: 2 });
ok(r.ok && sim.orbs.length === o0 + 1 + D.TERRAIN.cache.xpOrbs && sim.orbs.some(o => o.kind === "bits"), "a cache drops Bits and XP (" + (sim.orbs.length - o0) + " pickups)");
r = a.act({ type: "prop.use", id: p.id, tx: 6, ty: 2 });
ok(!r.ok, "and only once");
console.log(failed ? "terrain-test: " + failed + " failed" : "terrain-test: all passed");
process.exit(failed ? 1 : 0);
