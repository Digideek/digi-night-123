/* node scripts/siege-nest-test.js : Night Siege's Primary Village: the nest, who the attackers go for, losing it (17z33) */
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

/* the nest */
let sim = newSim("siege", ["local"], { level: 8, time: DL * SG.startAt + 1 });
run(sim, 0.5);
const nest = sim.siege && sim.siege.nest;
ok(!!nest && nest.eggs.length === N.eggs, "a nest of " + N.eggs + " Digi-eggs is made");
ok(nest && Math.abs(nest.y - (0 + N.offset)) < 200 && Math.abs(nest.x) < 200, "a little below where the run starts (" + (nest && nest.x) + ", " + (nest && nest.y) + ")");
ok(sim.snapshot().nest && sim.snapshot().nest.eggs.length === N.eggs, "and every screen gets it in the snapshot");

/* nobody near: they go for the eggs */
tough(sim); away(sim, 4000);
run(sim, 2);
const att = sim.enemies.filter(e => e.siege && !e.dead);
ok(att.length > 0 && att.every(e => Math.hypot(e.x - nest.x, e.y - nest.y) < SG.ring[1] + 160), att.length + " attackers came in round the nest, not round you");
run(sim, 40, s => { tough(s); away(s, 4000); });
const hurt = nest.eggs.filter(g => g.hp < g.max).length;
ok(hurt > 0, "with nobody near, they went for the eggs (" + hurt + " hurt or smashed)");
ok(of(sim, "siege.egg").length > 0, "and every screen hears it (siege.egg)");
/* keep going till the nest falls */
run(sim, 120, s => { tough(s); away(s, 4000); if (s.runOver) return; });
ok(nest.eggs.every(g => g.hp <= 0) && sim.runOver && of(sim, "siege.nestLost").length === 1, "every egg smashed: the nest is lost and the run is over");
ok(of(sim, "runOver").some(e => e.reason === "nest"), "with the nest as the reason");

/* standing at the nest: they come for you, the eggs are left alone */
sim = newSim("siege", ["local"], { level: 8, time: DL * SG.startAt + 1 });
run(sim, 0.5);
const n2 = sim.siege.nest;
function guard(s) { tough(s); s.players.forEach(p => { p.x = n2.x; p.y = n2.y - 60; p.mx = n2.x + 26; p.my = n2.y - 54; }); }
run(sim, 30, guard);
const near = sim.enemies.filter(e => e.siege && !e.dead).map(e => Math.hypot(e.x - n2.x, e.y - n2.y));
ok(n2.eggs.every(g => g.hp === g.max), "standing at the nest, no egg is touched in 30 s of attackers");
ok(near.length === 0 || Math.min.apply(null, near) < N.aggro, "they came at you instead");
/* an attacker that turned on you keeps on you a little past the aggro range, then goes back to the eggs */
const e = sim.enemies.find(x => x.siege && !x.dead);
if (e) {
  const p = sim.players[0];
  e.sgOn = true; let r = sim._siegeAct(e, Math.pow(N.aggro + 50, 2), 0.04); ok(r === null, "one that turned on you stays on you just past the range (no flip-flopping)");
  r = sim._siegeAct(e, Math.pow(N.release + 50, 2), 0.04); ok(r && r.x != null && !e.sgOn, "and goes back to the eggs once you're well away");
}

/* dawn mends a cracked egg; a smashed one stays smashed */
sim = newSim("siege", ["local"], { level: 8, time: DL * SG.startAt + 1 });
run(sim, 0.5);
const n3 = sim.siege.nest;
n3.eggs[0].hp = 0; n3.eggs[1].hp = 40;
sim.time = DL * SG.endAt + 0.5; run(sim, 0.5, s => tough(s));
ok(n3.eggs[0].hp === 0 && n3.eggs[1].hp === n3.eggs[1].max, "at dawn the cracked egg mends; the smashed one stays smashed");
ok(of(sim, "siege.dawn").some(e => e.eggs === N.eggs - 1), "and dawn says how many are left");
ok(n3.eggs[1].max === Math.round(N.hp * (1 + N.hpPerNight)), "and the eggs come out of the night tougher (" + n3.eggs[1].max + " after one night)");
/* raiders: from night raidFrom, some never turn on you */
sim = newSim("siege", ["local"], { level: 8, time: DL * (N.raidFrom - 1) + DL * SG.startAt + 1 });
sim.rng = (() => { let x = 7; return () => { x = (x * 16807) % 2147483647; return x / 2147483647; }; })();
run(sim, 12, s => tough(s));
const atk = sim.enemies.filter(e => e.siege && !e.dead), raiders = atk.filter(e => e.raider);
ok(raiders.length > 0 && raiders.length < atk.length, "night " + N.raidFrom + ": " + raiders.length + " of " + atk.length + " attackers are raiders");
if (raiders.length) {
  const rd = raiders[0], r = sim._siegeAct(rd, 10 * 10, 0.04);
  ok(r && r.x != null, "a raider goes for the eggs even with you right beside it");
}
const nr = newSim("siege", ["local"], { level: 8, time: DL * SG.startAt + 1 }); run(nr, 8, s => tough(s));
ok(!nr.enemies.some(e => e.raider), "no raiders on night 1");
ok(sim.snapshot().enemies.some(e => e.raider) || !raiders.length, "raiders are marked in the snapshot");

/* hatching: an egg that sees hatchAfter dawns unbroken hatches into its Baby, who fights at your side */
sim = newSim("siege", ["local"], { level: 8, time: DL * SG.startAt + 1 });
run(sim, 0.5, s => tough(s));
const nh = sim.siege.nest, k0 = nh.eggs[0].k;
nh.eggs.forEach((g, i) => g.age = i === 0 ? N.hatchAfter - 1 : 0);
sim.time = DL * SG.endAt + 0.5; run(sim, 0.5, s => tough(s));
const kid = sim.cpus.find(c => c.siegeKid);
ok(kid && kid.form === N.kinds[k0] && D.SPECIES[kid.form].stage === "Baby", "an egg that saw " + N.hatchAfter + " dawns hatched into its own Baby (" + (kid && kid.form) + ")");
ok(of(sim, "siege.hatch").length === 1 && nh.eggs[0].hp === nh.eggs[0].max && nh.eggs[0].age === 0 && nh.eggs[0].k !== k0, "and a fresh egg (a different one) takes its place");
ok(kid && kid.maxHp > D.SPECIES[kid.form].base.maxHp - 1, "the hatchling has " + (kid && kid.maxHp) + " health");
ok(sim.snapshot().cpus.some(c => c.id === kid.id), "it's in the snapshot with the other teammates");
/* only one a dawn, and at most `helpers` up */
nh.eggs.forEach(g => g.age = N.hatchAfter);
for (let d = 0; d < N.helpers + 2; d++) { sim.time = DL * (d + 1) + DL * SG.endAt + 0.5; sim.siege.inNight = true; sim.siege.started = d + 2; run(sim, 0.3, s => tough(s)); nh.eggs.forEach(g => g.age = N.hatchAfter); }
ok(sim.cpus.filter(c => c.siegeKid && c.hp > 0).length === N.helpers, "never more than " + N.helpers + " hatchlings up at once");

/* rebuilding a smashed egg by day */
sim = newSim("siege", ["local"], { level: 8, time: 5 });
run(sim, 0.5, s => tough(s));
const nr2 = sim.siege.nest, pl = sim.players[0];
nr2.eggs[2].hp = 0; pl.bits = 1000; pl.x = nr2.x; pl.y = nr2.y - 40;
const cost = sim._siegeRepairCost();
let res = sim._siegeRepair(pl);
ok(res.ok && nr2.eggs[2].hp === nr2.eggs[2].max && pl.bits === 1000 - cost, "by day at the nest, a smashed egg is rebuilt for " + cost + " coins");
ok(of(sim, "siege.repair").length === 1, "and every screen hears it");
nr2.eggs[2].hp = 0; pl.x = nr2.x + 2000;
ok(!sim._siegeRepair(pl).ok, "not from across the map");
pl.x = nr2.x; pl.bits = 3;
ok(!sim._siegeRepair(pl).ok && nr2.eggs[2].hp === 0, "not without the coins");
pl.bits = 1000; sim.siege.inNight = true;
ok(!sim._siegeRepair(pl).ok, "not at night");
sim.siege.inNight = false;
sim.siege.nights = 3;
ok(sim._siegeRepairCost() === N.repairCost + 3 * N.repairPerNight, "it costs more the more nights you've held (" + sim._siegeRepairCost() + " after 3)");

/* other modes have no nest */
sim = newSim("open", ["local"], {}); run(sim, 1);
ok(!sim.siege || !sim.siege.nest, "no nest outside Night Siege");
console.log(failed ? failed + " FAILED" : "siege-nest-test: all passed");
process.exit(failed ? 1 : 0);
