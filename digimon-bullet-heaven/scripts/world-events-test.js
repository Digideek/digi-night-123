/* node scripts/world-events-test.js : rare world events (17z33, js/net/event-sim.js). How often they
 * happen in a run; each one warns first; an outbreak, a Dark Area surge and a rampaging Mega can each be
 * won (everybody paid, whatever side, the Glitch's land handed back) or lost (it slips away / the Glitch
 * keeps the land). Uses the real world.js. */
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
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const C = D.WORLD_EVENTS;

/* 1. how often */
const probe = new mission.MissionSim({ seed: 1, hz: 30, data: D });
const tally = [0, 0, 0]; let tooClose = 0, early = 0;
for (let s = 1; s <= 4000; s++) {
  const plan = probe._wevPlanFor(s * 7919);
  tally[plan.length]++;
  for (let i = 1; i < plan.length; i++) if (plan[i].t - plan[i - 1].t < C.gap) tooClose++;
  plan.forEach(p => { if (p.t < C.window[0] || p.t > C.window[1]) early++; });
}
const pct = tally.map(n => Math.round(n / 40));
console.log("  runs with none / one / two events: " + pct.join("% / ") + "%");
ok(pct[0] > 48 && pct[0] < 62 && pct[1] > 28 && pct[1] < 42 && pct[2] > 5 && pct[2] < 15, "most runs have none, some one, now and then two");
ok(!tooClose && !early, "never two close together, never before 8 minutes in");

/* a run */
function newSim(seed, players) {
  W.reset(seed || 7); W.setTime(1000);
  const sim = new mission.MissionSim({ seed: seed || 7, hz: 30, data: D });
  sim.phase = "playing"; sim.time = 1000; sim.localId = "local";
  sim.players.length = 0;
  (players || ["local"]).forEach((id, i) => sim.players.push({ id, form: "agumon", level: 20, xp: 0, bits: 0, hp: 500, maxHp: 500, x: 6000 + i * 3000, y: 6000, mx: 6000 + i * 3000, my: 6000, faint: 0, downed: false, hasTamer: true, kind: i ? "remote" : "host-client", tamerHp: 50, tamerMaxHp: 50 }));
  return sim;
}
function step(sim, sec) { for (let i = 0; i < sec; i++) { sim.time += 1; sim._updateWev(1); } }
function evs(sim, type) { return sim.events.filter(e => e.type === type); }

/* 2. outbreak, won by two players on different sides */
let sim = newSim(7, ["local", "g1"]);
sim.players[0].side = "snow"; sim.players[1].side = "volcano";
sim.wevForce("outbreak");
ok(evs(sim, "wev.warn").length === 1 && !sim.wev.boss, "an outbreak is announced to everyone before anything appears");
step(sim, C.warn + 1);
let ev = sim.wev, b = ev && ev.boss;
ok(b && b.virus && b.wev && evs(sim, "wev.start").length === 1, "then Patient Zero shows up, infected");
const plain = sim.spawnEnemy(b.type, { keepType: true, quiet: true, x: b.x + 40, y: b.y }); plain.dead = true;
ok(b.maxHp > plain.maxHp * 8, "far tougher than an ordinary one of its kind (x" + (b.maxHp / plain.maxHp).toFixed(1) + " with two tamers in the run)");
ok(sim.enemies.filter(e => e.virus && !e.wev).length === 2, "with two carriers it has already given it to");
sim.players[0].x = b.x + 100; sim.players[0].y = b.y; step(sim, 2);
sim.events.length = 0;
sim._killEnemy(b, sim.players[0]);
let end = evs(sim, "wev.end")[0];
ok(end && end.won && !sim.wev, "beating Patient Zero ends it: won");
ok(end && end.pay.local && end.pay.g1 && end.pay.local.xp > 0 && end.pay.g1.bits > 0, "both players are paid though they're on different sides");
ok(end && end.pay.local.full && !end.pay.g1.full && end.pay.g1.xp < end.pay.local.xp, "the one who came gets full pay, the one who never came half");

/* 3. outbreak ignored */
sim = newSim(8); sim.wevForce("outbreak"); step(sim, C.warn + 1); b = sim.wev.boss;
for (let i = 0; i < 6; i++) { const e = sim.spawnEnemy("agumon", { keepType: true, quiet: true, x: b.x + 200 + i * 30, y: b.y }); if (e) e.virus = null; }
const before = sim.enemies.filter(e => e.virus).length;
step(sim, C.dur.outbreak + 2);
end = evs(sim, "wev.end")[0];
ok(end && !end.won && b.dead, "ignored, Patient Zero slips away when time runs out");
ok(end && end.infected > 0, "and leaves " + (end && end.infected) + " Digimon round it infected");

/* 4. Dark Area surge */
function findCell() { for (let r = 3; r < 40; r++) for (let cy = -r; cy <= r; cy++) for (let cx = -r; cx <= r; cx++) if (W.cellOwner(cx, cy) !== "glitch") return [cx, cy]; }
sim = newSim(9); sim.wevForce("surge"); step(sim, C.warn + 1);
ev = sim.wev; b = ev.boss;
const BI = D.biomes;
ok(b && b.boss && BI.homeOf(b.type) === "glitch", "a Surge Lord comes out of the rift, a Dark Area Digimon (" + (b && b.type) + ")");
step(sim, 60);
const taken = Object.keys(ev.cells), heldBefore = taken.map(k => ev.cells[k]);
ok(taken.length >= 6 && taken.every(k => W.cellOwner(+k.split(",")[0], +k.split(",")[1]) === "glitch"), "the land round it turns to Glitch fast (" + taken.length + " cells in a minute)");
ok(heldBefore.every(o => o !== "glitch"), "it remembers who held each one");
sim.events.length = 0;
sim._killEnemy(b, sim.players[0]);
end = evs(sim, "wev.end")[0];
ok(end && end.won && taken.every((k, i) => W.cellOwner(+k.split(",")[0], +k.split(",")[1]) === heldBefore[i]), "beating the Surge Lord hands every cell back (" + (end && end.back) + ")");
sim = newSim(10); sim.wevForce("surge"); step(sim, C.warn + C.dur.surge + 2);
end = evs(sim, "wev.end")[0];
ok(end && !end.won && end.held > 0 && Object.keys(sim.events.filter(e => e.type === "war.flip")).length > 0, "run out of time and the Glitch keeps what it took (" + (end && end.held) + " cells)");

/* 5. rampaging Mega */
sim = newSim(11); sim.wevForce("rampage"); step(sim, C.warn + 1); b = sim.wev.boss;
ok(b && b.mega, "a rampaging Mega appears (" + (b && b.type) + ")");
step(sim, C.dur.rampage + 2);
end = evs(sim, "wev.end")[0];
ok(end && !end.won && b.dead, "not stopped in time, it moves on (gone, nobody paid)");

/* 6. the whole thing, unattended: the scheduled ones fire on their own */
let fired = 0, s;
for (s = 1; s < 60 && !fired; s++) {
  sim = newSim(s); const plan = sim._wevPlanFor(sim.seed);
  if (!plan.length) continue;
  sim.time = plan[0].t - C.warn - 2; step(sim, 4);
  fired = evs(sim, "wev.warn").length;
}
ok(fired === 1, "a scheduled event goes off by itself on time (seed " + (s - 1) + ")");
/* 7. with friends (17z33, Isaac: more for multiplayer): not rare any more */
const T = C.together;
function firstWarn(players, seed) {
  const sm = newSim(seed, players);
  sm._updateWev(0); sm._wevSched.length = 0;                     /* drop the rare roll: only the friends' timer */
  const t0 = sm.time;
  for (let i = 0; i < 3600; i++) { sm.time += 1; sm._updateWev(1); if (sm.events.some(e => e.type === "wev.warn")) return { sm, at: sm.time - t0 }; }
  return { sm, at: null };
}
const solo = firstWarn(["local"], 21), duo = firstWarn(["local", "g1"], 21);
ok(solo.at === null, "alone (with the rare roll set aside), nothing comes in an hour: solo stays rare");
ok(duo.at !== null && duo.at >= T.first[0] - C.warn && duo.at <= T.first[1], "with a friend, the first event comes " + duo.at + " s after they're together (" + T.first[0] / 60 + " to " + T.first[1] / 60 + " minutes)");
/* finish it, then the next one comes a while after it ends */
sim = duo.sm; step(sim, C.warn + 1); b = sim.wev && sim.wev.boss;
sim.players.forEach(pl => { pl.x = b.x + 80; pl.y = b.y; }); step(sim, 2);
sim.events.length = 0; sim._killEnemy(b, sim.players[0]);
end = evs(sim, "wev.end")[0];
const solo1 = Math.round(sim._xpNeeded(20) * C.reward.xp);
ok(end && end.crew === 2 && Math.abs(end.pay.local.xp - Math.round(solo1 * (1 + T.crew))) <= 1, "both came: a crew of 2, +" + Math.round(T.crew * 100) + "% pay each (" + end.pay.local.xp + " XP, " + solo1 + " alone)");
const endAt = sim.time; let nextAt = null;
for (let i = 0; i < 3600 && nextAt === null; i++) { sim.time += 1; sim._updateWev(1); if (evs(sim, "wev.warn").length) nextAt = sim.time; }
ok(nextAt !== null && nextAt - endAt >= T.every[0] - C.warn && nextAt - endAt <= T.every[1], "the next one comes " + Math.round((nextAt - endAt) / 60) + " minutes after the last ended (" + T.every[0] / 60 + " to " + T.every[1] / 60 + ")");
ok(Math.min(T.crewMax, T.crew * 9) === T.crewMax, "the crew bonus tops out at +" + Math.round(T.crewMax * 100) + "%");

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
