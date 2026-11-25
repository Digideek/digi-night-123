/* node scripts/versus-evo-test.js : Versus (17z33): start as a Rookie, the DIGIVOLVE meter, the middle split by damage, Mega in 7 minutes */
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
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
let failed = 0;
const VS = D.VERSUS;
function newSim(ids, picks) {
  W.reset(11); W.setTime(0);
  const sim = new mission.MissionSim({ seed: 11, hz: auth.TICK_HZ, data: D });
  const A = new auth.Authority({ sim: sim, seed: 11 });
  sim.runMode = "versus"; sim.phase = "playing"; sim.time = 0; sim.localId = ids[0];
  ids.forEach((id, i) => { const sp = D.SPECIES.botamon || D.SPECIES.agumon; A.join({ id, kind: i ? "client" : "host-client", hasTamer: true, form: "digitama_agumon", vsRookie: picks ? picks[i] : null, x: i * 200, y: 0, hp: 100, maxHp: 100, level: 1, xp: 0, xpNext: sim._xpNeeded(1), weapons: [] }); });
  sim.coop = true; sim.sharedXp = true; sim._auth = A;
  const evs = []; const e0 = sim.emit.bind(sim); sim.emit = e => { evs.push(e); return e0(e); }; sim._evs = evs;
  return sim;
}
const of = (sim, t) => sim._evs.filter(e => e.type === t);
function run(sim, sec, each) { const n = Math.round(sec * sim.hz); for (let i = 0; i < n; i++) { if (each) each(sim); sim._auth.step(); } }
const safe = s => s.players.forEach(p => { p.hp = Math.max(p.hp, p.maxHp * 0.5); p.tamerHp = p.tamerMaxHp; p.monInvuln = 1; });
ok(VS.race === 420 && VS.bossAt.join() === "105,210,315", "a 7-minute race, mini bosses at 1:45, 3:30 and 5:15");

/* starting as a Rookie */
let sim = newSim(["local", "g1"], ["veemon", "notarookie"]);
run(sim, 0.5);
const [A, B] = sim.players;
ok(A.form === "veemon", "you start as the Rookie you picked (" + A.form + ")");
ok(B.form === VS.start[0], "a pick that isn't a Rookie falls back to " + VS.start[0] + " (" + B.form + ")");
ok(sim.sharedXp === false, "XP isn't shared between rivals");
A.xp = 0; B.xp = 0; const lvB = B.level;
sim.orbs.push({ id: sim.nextId++, kind: "xp", x: A.x, y: A.y, value: 500, vx: 0, vy: 0, magnet: true });
run(sim, 0.5, safe);
ok(A.level > 1 && B.level === lvB, "XP you pick up is yours alone (you Lv " + A.level + ", rival Lv " + B.level + ")");

/* meter: kills */
A.vsMeter = 0; A.level = 3;
const k0 = sim.enemies.length;
const fake = (extra) => Object.assign({ _id: sim.nextId++, type: "goblimon", x: A.x + 30, y: A.y, hp: 1, maxHp: 1, radius: 10, dead: false }, extra || {});
for (let i = 0; i < 10; i++) { const e = fake(); sim.enemies.push(e); sim._killEnemy(e, { id: A.id }); }
ok(Math.abs(A.vsMeter - 10 * VS.meterKill) < 0.01, "kills fill the meter a little (" + A.vsMeter + " for 10)");
ok(A.level === 3, "and it isn't XP: no extra level-ups from it");
/* meter full but level short: no digivolve */
A.vsMeter = VS.meter; A.level = VS.evoLv.Rookie - 1; run(sim, 0.3, safe);
ok(A.form === "veemon", "a full meter waits for the level (Lv " + VS.evoLv.Rookie + " for Champion)");
A.level = VS.evoLv.Rookie; run(sim, 0.3, safe);
ok(A.form === "exveemon" && A.vsMeter === 0 && of(sim, "vs.evo").length === 1, "full meter + level: it digivolves at once (" + A.form + ") and the meter starts again");
/* caches */
sim.time = sim.vs.t0 + 61; sim.vs.cacheT = 0; run(sim, 0.3, safe);
const evoOrbs = sim.orbs.filter(o => o.kind === "evo");
ok(evoOrbs.length === VS.cacheMeter, "a cache drops " + VS.cacheMeter + " DIGIVOLVE orbs in the middle");
const m0 = A.vsMeter; evoOrbs.forEach(o => { o.x = A.x; o.y = A.y; o.magnet = true; }); run(sim, 0.5, safe);
ok(A.vsMeter - m0 >= VS.cacheMeter * VS.cacheMeterVal * VS.leadMul - 0.01, "picking them up fills the meter (+" + Math.round(A.vsMeter - m0) + ")");

/* the mini boss: split by damage; type advantage counts */
sim = newSim(["local", "g1"], ["agumon", "gabumon"]); run(sim, 0.5);
const [P, Q] = sim.players;
P.vsMeter = 0; Q.vsMeter = 0; P.level = Q.level = 3;
sim.time = sim.vs.t0 + VS.bossAt[0] + 0.1; run(sim, 0.1, safe);
const boss = sim.enemies.find(e => e.vsBoss && !e.dead);
ok(!!boss, "the first mini boss is in the middle at 1:45 (" + (boss && boss.type) + ")");
boss.hp = boss.maxHp = 1000;
const realEl = sim._elemMul; sim._elemMul = () => 1;   /* neutral, so the split is plain to read */
sim.hurtEnemy(boss, 300, 0, 0, 0, { id: P.id }, 1, null);
sim.hurtEnemy(boss, 100, 0, 0, 0, { id: Q.id }, 1, null);
sim.hurtEnemy(boss, 2000, 0, 0, 0, { id: Q.id }, 1, null);   /* the last hit: only what was left counts */
const down = of(sim, "vs.bossDown")[0];
ok(!!down, "when it falls everyone hears who got what (vs.bossDown)");
ok(Math.abs(P.vsMeter - VS.bossMeter[0] * 0.3) < 0.6 && Math.abs(Q.vsMeter - VS.bossMeter[0] * 0.7) < 0.6, "the pay is split by damage done, not who landed the last hit (" + P.vsMeter.toFixed(1) + " / " + Q.vsMeter.toFixed(1) + " of " + VS.bossMeter[0] + ")");
/* criticals and type advantage count: the damage counted is after them */
sim.time = sim.vs.t0 + VS.bossAt[1] + 0.1; run(sim, 0.1, safe);
const b2 = sim.enemies.find(e => e.vsBoss && !e.dead);
b2.hp = b2.maxHp = 1e6; P.vsMeter = Q.vsMeter = 0;
sim.hurtEnemy(b2, 100, 0, 0, 0, { id: P.id }, 2, null);    /* a critical (x2) */
sim.hurtEnemy(b2, 100, 0, 0, 0, { id: Q.id }, 1, null);
ok(b2.vsDmg[P.id] > b2.vsDmg[Q.id] * 1.8, "a critical counts double toward the share (" + Math.round(b2.vsDmg[P.id]) + " vs " + Math.round(b2.vsDmg[Q.id]) + ")");
sim._elemMul = (w, f) => f === Q.form ? 1.5 : 1;
sim.hurtEnemy(b2, 100, 0, 0, 0, { id: Q.id }, 1, "x");
sim._elemMul = realEl;
ok(b2.vsDmg[Q.id] >= 249, "and so does hitting it where it's weak (" + Math.round(b2.vsDmg[Q.id]) + ")");
/* the leader gets less from the middle */
P.vsMeter = 60; Q.vsMeter = 0;
ok(sim._vsLeader(P) && !sim._vsLeader(Q), "a clear lead counts as leading");
const add = sim._vsMeterAdd(P, 20, true), addQ = sim._vsMeterAdd(Q, 20, true);
ok(Math.abs(add - 20 * VS.leadMul) < 0.01 && Math.abs(addQ - 20) < 0.01, "the leader gets " + VS.leadMul * 100 + "% from the middle (" + add + " vs " + addQ + ")");
ok(sim._vsMeterAdd(P, 10, false) === 10, "but a kill pays the leader in full");
ok(VS.bossMeter[2] > VS.bossMeter[0], "the last mini boss pays a bit more (" + VS.bossMeter.join(" / ") + ")");

/* up to Mega and no further */
P.form = "metalgreymon"; P.level = VS.evoLv.Ultimate; P.vsMeter = VS.meter; run(sim, 0.3, safe);
ok(P.form === "wargreymon", "Ultimate to Mega (" + P.form + ")");
P.vsMeter = 0; sim._vsMeterAdd(P, 50, false);
ok(!P.vsMeter, "at Mega the meter stops: Mega is the top");
const stt = of(sim, "vs.state").pop();
ok(stt && stt.players.every(q => q.meter != null && q.need != null), "every screen gets each meter and the level it needs");

/* the showdown: no meter, no digivolving */
Q.vsMeter = VS.meter; Q.level = 20; sim._vsShowdownStart(sim._vsPlayers());
const qf = Q.form; run(sim, 0.3);
ok(Q.form === qf, "no digivolving once the showdown starts");
/* the Rookies you can bring (vs-rookie.js): the three, plus Rookies raised in the Hatchery only */
{ const store = {}; global.localStorage = { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } };
  let raised = ["palmon", "guilmon", "greymon", "notreal"];
  D.hatchery = { rookies: () => raised };
  D.evoLog = { data: () => ({ forms: { patamon: 3, tentomon: 1 } }) };   /* reached in runs: doesn't count */
  delete require.cache[require.resolve(path.join(root, "js/vs-rookie.js"))];
  const R = require(path.join(root, "js/vs-rookie.js"));
  const l = R.list();
  ok(l.slice(0, 3).join() === "agumon,gabumon,veemon", "Agumon, Gabumon and Veemon are always first");
  ok(l.includes("palmon") && l.includes("guilmon"), "Rookies raised in the Hatchery join them (" + l.slice(3).join(", ") + ")");
  ok(!l.includes("patamon") && !l.includes("tentomon"), "Rookies only reached in a run don't count");
  ok(!l.includes("greymon") && !l.includes("notreal"), "and only real Rookies");
  ok(R.get() === "agumon" && R.set("guilmon") && R.get() === "guilmon", "the pick is kept");
  ok(!R.set("patamon") && R.get() === "guilmon", "and you can't pick one you haven't raised");
  raised = [];
  ok(R.get() === "agumon", "a pick you no longer have falls back to Agumon");
}

/* three in the arena: gang up on the leader (Isaac) */
{ const s3 = newSim(["local", "g1", "g2"], ["agumon", "gabumon", "veemon"]); run(s3, 0.5);
  const [X, Y, Z] = s3.players;
  X.form = "wargreymon"; X.level = 12; Y.form = "weregarurumon"; Y.level = 9; Z.form = "exveemon"; Z.level = 6;
  s3._vsShowdownStart(s3._vsPlayers()); run(s3, VS.countdown + 0.5);
  ok(Y.pvpFocus === X.id && Z.pvpFocus === X.id, "with nobody picked, the Ultimate and the Champion both go for the Mega");
  ok(X.pvpFocus === Y.id, "and the Mega goes for the next strongest (" + X.pvpFocus + ")");
  const st3 = of(s3, "vs.state").pop();
  ok(st3 && st3.players.find(q => q.id === Z.id).aim === X.id, "every screen knows who's after whom");
  /* PvP hits have their own damage numbers (17z33) */
  X.monInvuln = 0; X.hp = X.maxHp; s3._pvpHit({ pvpOf: X.id, radius: 12 }, 40, { id: Y.id });
  const ph = of(s3, "hit").filter(h => h.pvp === X.id).pop();
  ok(ph && ph.by === Y.id && ph.damage > 0, "a hit on a rival's partner sends its own damage number (" + (ph && Math.round(ph.damage)) + ")");
  /* a click sticks */
  s3._setPvpFocus(Z.id, Y.id); run(s3, 0.5);
  ok(Z.pvpFocus === Y.id && Z.vsPick === Y.id, "a partner you click stays your target");
  /* once the leader is out, they turn on each other */
  s3._pvpKo(Y, X); s3._setPvpFocus(Z.id, X.id); run(s3, 0.5);
  ok(s3.vs.out[X.id] && Y.pvpFocus === Z.id && Z.pvpFocus !== X.id, "the leader knocked out: the other two go at each other");
  /* a new round: picks are cleared */
  s3.vs.betweenT = 0.01; run(s3, 0.2);
  ok(!Z.vsPick, "picks are cleared for the next round");
}
console.log(failed ? "\n" + failed + " FAILED" : "\nall passed");
process.exit(failed ? 1 : 0);
