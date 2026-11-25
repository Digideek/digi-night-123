/* node scripts/siege-nights-test.js : Night Siege special nights and the endless climb (17z33) */
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
const NG = SG.nights;
const kinds = {};
let sim0 = newSim("siege", ["local"], { level: 8, time: 10 });
for (let n = 1; n <= 20; n++) kinds[n] = sim0._siegeKind(n).kind;
console.log("  nights 1-20:", Object.values(kinds).join(" "));
ok(kinds[1] === "normal" && kinds[2] === "swarm" && kinds[3] === "normal" && kinds[4] === "flyer" && kinds[6] === "giant" && kinds[8] === "raider" && kinds[10] === "swarm", "the special nights come round in order, every other night from night 2");
ok(sim0._siegeKind(18).lap === 2, "and each lap round is counted (night 18 is lap 2)");

function nightAt(n, opt) {
  const s = newSim("siege", ["local", "p2", "p3", "p4"].slice(0, (opt && opt.players) || 1), { level: 20, time: DL * (n - 1) + DL * SG.startAt + 0.5 });
  s.siege = { nights: n - 1, inNight: false, warned: n, waveT: 0, stateT: 0, bossNight: 0, kills: 0 };
  run(s, 0.3);
  return s;
}
function attackers(s) { return s.enemies.filter(e => e.siege && !e.dead); }
function waveOf(n, players) { const s = nightAt(n, { players: players || 1 }); s.players.forEach((p, i) => { p.x = i * 30; p.y = 0; }); s.enemies.filter(e => e.siege).forEach(e => e.dead = true); s.enemies = s.enemies.filter(e => !e.dead); s._siegeWave(n); return { s, a: attackers(s) }; }

/* swarm */
const w1 = waveOf(3), w2 = waveOf(2);
ok(w2.a.length >= w1.a.length * 1.6, "swarm night: far more of them (" + w2.a.length + " vs " + w1.a.length + " on a normal night)");
ok(w2.a.every(e => e.swarm && e.spdMul >= NG.swarm.spd), "swarmers are faster");
/* flyer */
const fl = waveOf(4).a;
const B = D.biomes;
ok(fl.length && fl.filter(e => B.crossOf(e.type) === 2).length >= fl.length * 0.8, "flyer night: flying Digimon (" + fl.filter(e => B.crossOf(e.type) === 2).length + "/" + fl.length + ")");
ok(fl.filter(e => e.over).length > 0, "and they fly over fences");
{ const s = nightAt(4); const n = s.siege.nest; const e = fl[0]; e.x = n.x + 400; e.y = n.y;
  ok(s._siegeFenceFor.call(s, Object.assign({}, e, { over: 1 }), n.x, n.y) === null, "a fence never stops a flyer"); }
/* giant */
{ const s = nightAt(6); run(s, DL * (SG.endAt - SG.startAt) * (NG.giant.at + 0.05), x => tough(x));
  const g = s.enemies.find(e => e.giant && !e.dead);
  ok(!!g && g.boss && g.giant === NG.giant.scale, "giant night: a giant boss comes in early" + (g ? " (" + g.type + ", " + Math.round(g.maxHp) + " hp)" : ""));
  ok(of(s, "siege.giant").length === 1, "everyone hears it (siege.giant)");
  ok(of(s, "siege.night").some(e => e.kind === "giant" && !e.boss), "and the night card says so, with no ordinary boss on top");
  ok(s.snapshot().enemies.some(e => e.giant), "the giant's size is in the snapshot");
}
/* raider */
const rd = waveOf(8).a;
ok(rd.filter(e => e.raider).length >= rd.length * 0.6, "raider night: nearly all raiders (" + rd.filter(e => e.raider).length + "/" + rd.length + ")");
const nr = waveOf(5).a;
ok(nr.filter(e => e.raider).length <= nr.length * 0.6, "a normal night still has only a few (" + nr.filter(e => e.raider).length + "/" + nr.length + ")");

/* endless: past the last stage it keeps climbing */
const last = SG.stages.length;
const hpA = waveOf(last + 1).a, hpB = waveOf(last + 11).a;
const avg = a => a.reduce((t, e) => t + e.maxHp / (D.ENEMIES[e.type] ? D.ENEMIES[e.type].hp || 1 : 1), 0) / Math.max(1, a.length);
ok(avg(hpB) > avg(hpA) * 1.5, "endless: night " + (last + 11) + " is much tougher than night " + (last + 1) + " (x" + (avg(hpB) / avg(hpA)).toFixed(2) + ")");
ok(hpB.length >= hpA.length, "and at least as many (" + hpB.length + " vs " + hpA.length + ")");
ok(hpB.every(e => e.dmgMul > 1), "and they hit harder");
/* no win: night 40 is still a night */
{ const s = nightAt(40); run(s, 3, x => tough(x)); ok(s.siege.inNight && !s.runOver && attackers(s).length > 0, "night 40 is just another night: no last night, no win"); }
/* boss health is Siege's own, and a boss stays past dawn (Isaac) */
{ const B = SG.boss, s = nightAt(3);
  ok(s._siegeBossHp(3) === B.hp && Math.abs(s._siegeBossHp(6) / (B.hp * Math.pow(B.perNight, 3)) - 1) < 0.01, "a boss has " + B.hp + " health on night 3, x" + B.perNight + " a night after (" + s._siegeBossHp(6) + " on night 6)");
  for (let k = 0; k < 60 && !s.enemies.some(e => e.boss && e.siege && !e.dead); k++) run(s, 2, x => { tough(x); if (x.siege.nest) x.siege.nest.eggs.forEach(g => { g.hp = g.max = 1e12; }); });
  const bo = s.enemies.find(e => e.boss && e.siege && !e.dead);
  ok(bo && bo.maxHp === s._siegeBossHp(3), "the night-3 boss comes in with exactly that (" + (bo && bo.maxHp) + ")");
  const g = s._siegeGiant(6, 0); ok(g && g.maxHp === s._siegeBossHp(6, NG.giant.hp), "a giant is " + NG.giant.hp + "x the night's boss (" + (g && g.maxHp) + ")");
  g.dead = true;
  for (let k = 0; k < 80 && !of(s, "siege.dawn").length; k++) run(s, 5, x => { tough(x); if (x.siege.nest) x.siege.nest.eggs.forEach(g => { g.hp = g.max = 1e12; }); x.players.forEach(p => { p.choosing = 0; p.pendingLevels = 0; }); x.enemyFreeze = 0; if (bo) bo.hp = bo.maxHp; });
  ok(of(s, "siege.dawn").length === 1 && bo && !bo.dead, "dawn comes and the boss is still there");
  ok(of(s, "siege.dawn")[0].stay.includes(bo.type) && s.enemies.filter(e => e.siege && !e.dead && !e.boss).length === 0, "the rest ran off; the boss stayed (siege.dawn says so)");
  run(s, 20, x => { tough(x); bo.hp = bo.maxHp; if (x.siege.nest) x.siege.nest.eggs.forEach(g => { g.hp = g.max = 1e12; }); }); ok(!bo.dead, "and it's still about in the day");
  const s2 = newSim("siege", ["local", "p2"], { level: 8, time: 10 }); run(s2, 0.2);
  ok(Math.abs(s2._siegeBossHp(3) / (B.hp * (1 + B.perPlayer)) - 1) < 0.01, "two tamers: x" + (1 + B.perPlayer) + " (" + s2._siegeBossHp(3) + ")");
}
/* more tamers: more attackers, and tougher (Isaac, Night Siege only) */
{ const PP = SG.perPlayer, one = waveOf(5, 1).a, three = waveOf(5, 3).a;
  const hp = a => a.reduce((t, e) => t + e.maxHp / (D.ENEMIES[e.type] ? D.ENEMIES[e.type].hp || 1 : 1), 0) / Math.max(1, a.length);
  ok(Math.abs(three.length / one.length - (1 + PP.more * 2)) < 0.25, "three tamers: about " + (1 + PP.more * 2) + "x as many in a wave (" + three.length + " vs " + one.length + ")");
  ok(Math.abs(hp(three) / hp(one) - (1 + PP.hp * 2)) < 0.15, "and each has about " + (1 + PP.hp * 2) + "x the health (x" + (hp(three) / hp(one)).toFixed(2) + ")"); }
/* shorter days (Isaac: 25% quicker than Survival) */
{ const s = nightAt(1); ok(D.seasons.DAY.lengthSec === SG.dayLen && D.dayClock.DAY_SECONDS === SG.dayLen, "a Night Siege day is " + SG.dayLen + " s");
  ok(Math.abs(SG.dayLen / 243 - 0.75) < 0.01, "about 25% shorter than the 243 s day");
  ok(D.seasons.dayInfo(SG.dayLen * 1.5).day === 2, "the clock counts days by it (" + SG.dayLen * 1.5 + " s is day 2)");
  console.log("  night lasts " + Math.round((SG.endAt - SG.startAt) * SG.dayLen) + " s, the day before it " + Math.round((1 - (SG.endAt - SG.startAt)) * SG.dayLen) + " s"); }
/* nothing else (Isaac): no rival tamer, no virus, no world events, the biomes hold still */
{ const s = nightAt(3);
  ok(s.noRival && s.noVirus && s.noEvents && s.noWar, "Night Siege turns off the rival, the virus, world events and biome wars");
  s._virusAt = 0; s._warT = 0;
  run(s, 90, x => { tough(x); x._warT = 0; });
  ok(!s.enemies.some(e => e.virus && !e.dead), "no infected Digimon after 90 s");
  ok(!s.enemies.some(e => e.rival && !e.dead) && !of(s, "rival.spawn").length, "no rival tamer");
  ok(!s._evs.some(e => /^wev\./.test(e.type)), "no world events");
  ok(!of(s, "war.flip").length && !of(s, "war.skirmish").length, "no biome border moves and no skirmishes");
}
{ const s = newSim("survival", ["local"], { level: 8, time: 10 }); run(s, 0.2);
  ok(D.seasons.DAY.lengthSec === D.dayClock.DAY_SECONDS && D.seasons.DAY.lengthSec > SG.dayLen, "Survival goes back to the usual day (" + D.seasons.DAY.lengthSec + " s)");
  ok(!s.noRival && !s.noVirus && !s.noEvents && !s.noWar, "Survival keeps all of them"); }
console.log(failed ? "\n" + failed + " FAILED" : "\nall passed");
process.exit(failed ? 1 : 0);
