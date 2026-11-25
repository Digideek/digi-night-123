/* node scripts/siege-fence-test.js : Night Siege fences and wood (17z33) */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
global.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {} }), width: 0, height: 0 }) };
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "day-clock", "seasons", "weather", "biomes"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
D.sprites = Object.assign(D.sprites || {}, { colors: {}, SCALE: 3, TILE: 48 });
require(path.join(root, "js/world.js"));
const W = D.world;
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }

function newSim(mode, ids, opt) {
  opt = opt || {};
  W.reset(11); W.setTime(opt.time || 0);
  const sim = new mission.MissionSim({ seed: 11, hz: auth.TICK_HZ, data: D });
  new auth.Authority({ sim: sim, seed: 11 });
  sim.runMode = mode; sim.phase = "playing"; sim.time = opt.time || 0; sim.localId = ids[0];
  sim.players.length = 0;
  ids.forEach((id, i) => sim.players.push({ id, form: opt.form || "agumon", level: opt.level || 3, xp: 0, bits: 0, hp: 300, maxHp: 300, x: i * 200, y: 0, mx: i * 200 + 26, my: 6, faint: 0, downed: false, hasTamer: true, kind: i ? "remote" : "host-client", tamerHp: 50, tamerMaxHp: 50, skills: {}, kills: 0 }));
  sim.coop = ids.length > 1;
  const evs = []; const e0 = sim.emit.bind(sim); sim.emit = e => { evs.push(e); return e0(e); };
  sim._evs = evs;
  return sim;
}
const of = (sim, t) => sim._evs.filter(e => e.type === t);
function run(sim, sec, each) { const n = Math.round(sec * sim.hz); for (let i = 0; i < n; i++) { if (each) each(sim); sim.step(); } }
const SG = D.SIEGE, N = SG.nest, DL = SG.dayLen;   /* Night Siege's own, shorter day */
function tough(sim) { sim.players.forEach(p => { p.hp = p.maxHp = 1e9; p.tamerHp = p.tamerMaxHp = 1e9; p.monInvuln = 1e9; p.tamerInvuln = 1e9; }); }
function away(sim, dx) { sim.players.forEach(p => { p.x = dx; p.y = 0; p.mx = dx + 26; p.my = 6; p.monTarget = null; }); }

const F = SG.fence;

/* wood only drops in Night Siege */
function _unused(sim, n) { for (let i = 0; i < n; i++) { const e = { id: 9e6 + i, type: "goblimon", x: 50, y: 50, hp: 0, radius: 10, def: {} }; try { sim._onKill ? sim._onKill(e) : sim._dropLoot(e); } catch (x) {} } }
const dropFn = "_dropLoot" || Object.keys(mission.MissionSim.prototype).find(k => /drop|loot/i.test(k) && mission.MissionSim.prototype[k].toString().includes('_spawnOrb("bits", e.x + (rng()'));
ok(!!dropFn, "found the kill-loot function (" + dropFn + ")");
function lootN(sim, n, extra) { for (let i = 0; i < n; i++) sim[dropFn](Object.assign({ id: 9e6 + i, type: "goblimon", x: 50, y: 50, radius: 10 }, extra || {}), D.ENEMY_TYPES ? (D.ENEMY_TYPES.goblimon || {}) : {}); }
for (const mode of ["survival", "story", "versus"]) {
  const s = newSim(mode, ["local"], { level: 8, time: 10 });
  run(s, 0.2); s.orbs.length = 0;
  let any = false;
  for (let b = 0; b < 10; b++) { s.orbs.length = 0; try { lootN(s, 20); } catch (x) {} any = any || s.orbs.some(o => o.kind === "wood"); }
  ok(!any, "no wood drops in " + mode);
}
let sim = newSim("siege", ["local"], { level: 8, time: DL * SG.startAt + 1 });
run(sim, 0.3); let w = 0;
for (let b = 0; b < 20; b++) { sim.orbs.length = 0; lootN(sim, 20); w += sim.orbs.filter(o => o.kind === "wood").length; }
ok(w > 400 * F.woodChance * 0.5 && w < 400 * F.woodChance * 1.6, "wood drops in Night Siege, about " + F.woodChance * 100 + "% of kills (" + w + "/400)");
sim.orbs.length = 0; lootN(sim, 1, { boss: true });
ok(sim.orbs.some(o => o.kind === "wood" && o.value === F.woodBoss), "a boss always drops " + F.woodBoss + " wood");

/* the orb cap never throws wood away */
sim.orbs.length = 0; sim._spawnOrb("wood", 9999, 9999, 1);
for (let i = 0; i < 300; i++) sim._spawnOrb("bits", 50, 50, 1);
ok(sim.orbs.some(o => o.kind === "wood"), "wood survives the 180-orb cap");
sim.orbs.length = 0;
/* unlimited carry */
const p = sim.players[0], nest = sim.siege.nest;
for (let i = 0; i < 500; i++) { sim.orbs.push({ id: sim.nextId++, kind: "wood", x: p.x, y: p.y, value: 1, vx: 0, vy: 0, magnet: true }); }
run(sim, 1);
ok((nest.wood[p.id] || 0) >= 500, "500 wood picked up, no cap (" + nest.wood[p.id] + ")");
ok(sim.snapshot().nest.wood[p.id] === nest.wood[p.id], "wood is in the snapshot");
ok(nest.fences.length === F.spots && nest.fences.every(f => f.hp === 0), F.spots + " empty fence spots round the nest");

/* building */
function build(i) { return sim._siegeBuild(p, i); }
nest.wood[p.id] = 2; p.bits = 100; sim.siege.inNight = false;
const f0 = nest.fences[0]; p.x = f0.x; p.y = f0.y;
ok(!build(0).ok, "not enough wood: no fence");
nest.wood[p.id] = 50; p.bits = 5;
ok(!build(0).ok, "not enough coins: no fence");
p.bits = 100; p.x = f0.x + 900;
ok(!build(0).ok, "too far away: no fence");
p.x = f0.x; sim.siege.inNight = true;
ok(!build(0).ok, "not at night");
sim.siege.inNight = false;
const r = build(0);
ok(r.ok && f0.hp > 0 && nest.wood[p.id] === 50 - F.wood && p.bits === 100 - F.coins, "built for " + F.wood + " wood + " + F.coins + " coins");
ok(!build(0).ok, "can't build on a standing fence");
ok(sim.siege.tally && sim.siege.tally.built === 1 && sim.siege.tally.wood >= 500, "the end screen's tally counts fences built and wood gathered (" + JSON.stringify(sim.siege.tally) + ")");
ok(sim.snapshot().nest.fences[0][2] > 0, "fences are in the snapshot");

/* attackers break through */
const blk = newSim("siege", ["local"], { level: 8, time: DL * SG.startAt + 1 });
run(blk, 0.3);
const bn = blk.siege.nest, bp = blk.players[0];
bn.wood[bp.id] = 999; bp.bits = 9999; blk.siege.inNight = false;
for (let i = 0; i < F.spots; i++) { bp.x = bn.fences[i].x; bp.y = bn.fences[i].y; blk._siegeBuild(bp, i); }
ok(bn.fences.every(f => f.hp > 0), "a full ring of fence");
tough(blk); away(blk, 4000);
run(blk, 30, s => { tough(s); away(s, 4000); });
const atk = blk.enemies.filter(e => e.siege && !e.dead);
const inside = atk.filter(e => { const nx = (e.x - bn.x) / F.rx, ny = (e.y - bn.y) / F.ry; return nx * nx + ny * ny < 0.9; });
const hitF = bn.fences.filter(f => f.hp < f.max).length;
ok(hitF > 0, "they went for the fence (" + hitF + " pieces hurt)");
ok(of(blk, "siege.egg").length === 0 || bn.eggs.every(g => g.hp > 0), "eggs safe while the ring stands (" + inside.length + " inside)");
run(blk, 200, s => { tough(s); away(s, 4000); });
ok(of(blk, "siege.fenceDown").length > 0, "pieces get broken (" + of(blk, "siege.fenceDown").length + ")");
ok(blk.siege.tally.broken === of(blk, "siege.fenceDown").length, "and broken ones");
run(blk, 1); ok(of(blk, "siege.state").pop().tally.built === F.spots, "every screen gets the tally with siege.state");
ok(bn.eggs.some(g => g.hp < g.max), "and through a gap they reach the eggs");

/* you walk through your own fence */
const wk = newSim("siege", ["local"], { level: 8, time: 10 });
run(wk, 0.3);
const wn = wk.siege.nest; wn.wood.local = 999; wk.players[0].bits = 9999;
for (let i = 0; i < F.spots; i++) { wk.players[0].x = wn.fences[i].x; wk.players[0].y = wn.fences[i].y; wk._siegeBuild(wk.players[0], i); }
ok(wn.fences.every(f => f.hp > 0), "built by day");
console.log(failed ? "\n" + failed + " FAILED" : "\nall passed");
process.exit(failed ? 1 : 0);
