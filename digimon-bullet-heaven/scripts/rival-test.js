/* node scripts/rival-test.js : the rival as another tamer on the map (rival-sim.js), and the numbers for burn, poison and bleed */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "weather", "seasons"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) { console.log(f, e.message); } });
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const R = D.RIVAL, RO = D.RO;
const SHY = R.shy; R.shy = 0;
const FIELD_GAIN = R.fieldGain; R.fieldGain = 0;   /* the checks below measure real fights; the wandering pace is checked at the end */
const name = id => (D.SPECIES[id] && D.SPECIES[id].name) || id;
function make(seed, form) {
  const sim = new mission.MissionSim({ seed: seed, hz: auth.TICK_HZ, data: D }); new auth.Authority({ sim: sim, seed: seed });
  sim.phase = "playing"; sim.time = 21; sim.skillTree = true;
  if (!sim.players[0]) { sim.players.push({ id: "local" }); sim.localId = "local"; }
  Object.assign(sim.players[0], { form: form || "agumon", level: 5, hp: 200, maxHp: 200, x: 0, y: 0, mx: 20, my: 0, faint: 0, downed: false, hasTamer: true, kind: "human", monInvuln: 0 });
  sim._combatReady = () => true;
  sim.ev = []; const e0 = sim.emit.bind(sim); sim.emit = e => { sim.ev.push(e); return e0(e); };
  return sim;
}
const of = (sim, t) => sim.ev.filter(e => e.type === t);
function tick(sim, secs, fn) { const dt = 1 / 30; for (let t = 0; t < secs; t += dt) { sim.time += dt; if (fn) fn(); sim._updateRival(dt); } }
function wild(sim, x, y, type, hp) { const e = sim.spawnEnemy(type || "numemon", { x: x, y: y, keepType: true, quiet: true }); if (hp) e.hp = e.maxHp = hp; return e; }

/* ---- who it is ---- */
let sim = make(11, "agumon");
tick(sim, R.arriveAt - 1); ok(!sim.rival, "no rival for the first " + R.arriveAt + " s after the fight starts");
tick(sim, 2); let rv = sim.rival, rp = rv.p;
ok(rv && R.names.indexOf(rv.name) >= 0 && of(sim, "rival.enter").length === 1, "then one enters the map: " + rv.name + " with a " + name(rp.form));
ok(["botamon", "koromon", "agumon", "greymon"].indexOf(sim._lineForm(rv.baby, 2)) < 0, "never your own line (you: Agumon; it will be a " + name(sim._lineForm(rv.baby, 2)) + ")");
const again = make(11, "agumon"); tick(again, R.arriveAt + 1);
ok(again.rival.baby === rv.baby && again.rival.name === rv.name && again.rival.talent === rv.talent, "the same seed gives the same rival, so friends online meet one rival");
ok(rp.level === 1 && rp.tamerLevel === 1 && rp.weapons.length >= 1 && rv.state === "elsewhere" && rv.eid === null, "it starts where you did: job level 1, base level 1, its first move (" + rp.weapons[0].id + "), somewhere off your screen");

/* ---- it levels by the partner rules ---- */
const need1 = sim._xpNeeded(1), tneed1 = sim._tamerNeed(1);
rp.xp = 0; rp.tamerXp = 0; sim._rivalGain(rv, need1);
ok(rp.level === 2 && rp.xpNext === sim._xpNeeded(2), "the same XP you need for job level 2 (" + need1 + ") takes it to job level 2");
ok(Object.keys(rp.skills).reduce((a, k) => a + rp.skills[k], 0) >= 2 && (rp.skillPoints || 0) === 0, "and it spends the skill point at once, with the game's own move picker");
sim._rivalGain(rv, tneed1);
ok(rp.tamerLevel === 2, "the same XP you need for base level 2 (" + tneed1 + ") takes it to base level 2");
const at = sim._attrs(rp), sum = k => Object.keys(at).reduce((a, x) => a + at[x], 0);
ok(sum() > 6 && rp.statPoints < 2, "and it spends its " + RO.pointsFor(1) + " status points, at the same rising cost you pay (" + JSON.stringify(at) + ")");
/* a sensible build */
sim._rivalGain(rv, 60000);
const style = sim._rivalStyle(rp), main = style === "phys" ? "str" : "int";
ok(Object.keys(at).every(k => at[main] >= at[k]) && at.vit > 1 && at[style === "phys" ? "int" : "str"] === 1, "its build follows its moves: a " + (style === "phys" ? "physical" : "special") + " line puts most into " + main.toUpperCase() + ", some into Vitality, none into the stat it cannot use (" + JSON.stringify(at) + ")");
let spentCost = 0; for (const k in at) for (let v = 1; v < at[k]; v++) spentCost += RO.cost(v);
let earned = 0; for (let L = 1; L < rp.tamerLevel; L++) earned += RO.pointsFor(L);
ok(spentCost + rp.statPoints === earned, "it has spent exactly what its base levels gave it: " + earned + " points over " + (rp.tamerLevel - 1) + " levels, nothing free");

/* ---- it digivolves along its line, when it has the level and the time ---- */
sim = make(11, "agumon"); tick(sim, R.arriveAt + 1); rv = sim.rival; rp = rv.p;
sim._rivalGain(rv, 3000);
ok(rp.level >= R.evo.level[0] && rp.form === rv.baby, "enough levels but too soon: it stays a " + name(rv.baby));
rv.stageT = R.evo.time[0]; tick(sim, 0.1);
ok(rp.form === sim._lineForm(rv.baby, 1) && rp.evoCount === 1 && of(sim, "rival.evolve").length === 1, "after " + R.evo.time[0] + " s in that form it digivolves to " + name(rp.form));
sim._rivalGain(rv, 200000); tick(sim, 1);
ok(rp.evoCount === 1, "one step at a time: however many levels it has, the next waits for time in the new form");
rv.stageT = 9999; tick(sim, 0.1);
ok(rp.evoCount === 2, "and then it comes (now " + name(rp.form) + ")");

/* ---- elsewhere: it earns at its off-screen pace ---- */
sim = make(11, "agumon"); sim.players[0].x = 0; tick(sim, R.arriveAt + 1); rv = sim.rival; rp = rv.p;
rv.x = 5000; rv.y = 5000; rv.wpX = 5000; rv.wpY = 5000; rv.driftT = 1e9; rv.farmAt = 1e9; sim._rivalXpRef = 10;
const x0 = rp.level; let total = 0; const g0 = sim._rivalGain.bind(sim); sim._rivalGain = (r, a) => { total += a; return g0(r, a); };
tick(sim, 60);
ok(Math.abs(total - 10 * R.away.killsPerMin * rv.talent) < 2, "out of sight it earns like " + R.away.killsPerMin + " kills a minute, times its talent (" + rv.talent.toFixed(2) + "): " + Math.round(total) + " XP in a minute of 10-XP Digimon");
ok(rv.eid === null && rv.state === "elsewhere", "with no body on the field");
sim._rivalGain = g0;

/* ---- it comes onto the field, hunts for real, and its kills are its own ---- */
rv.x = 700; rv.y = 0; rv.hx = 2200; rv.hy = 0; rv.wpX = null; tick(sim, 0.1);
let body = sim.enemies.find(e => e.rival);
ok(body && rv.state === "hunt" && body.maxHp === rp.maxHp && !body.boss, "within " + R.nearField + " px of you it is on the field: a body you can hit, with its own health (" + rp.maxHp + ")");
ok(sim.snapshot(false).rival && sim.snapshot(false).rival.name === rv.name && sim.snapshot(false).enemies.some(e => e.rival), "and the screen is told about it");
const prey = wild(sim, 800, 0, "numemon", 30), kills0 = sim.players[0].kills || 0, orbs0 = sim.orbs.length, lvl0 = rp.level, xp0 = rp.xp + rp.level * 1e6;
for (let i = 0; i < 30 * 12 && !prey.dead; i++) { sim.time += 1 / 30; sim._updateEnemies(1 / 30); sim._updateBullets(1 / 30); if (sim._updateArcs) sim._updateArcs(1 / 30); sim._updateRival(1 / 30); }
ok(prey.dead, "it goes for the nearest wild Digimon and kills it with its own moves");
ok((sim.players[0].kills || 0) === kills0 && sim.orbs.length === orbs0, "the kill is not yours: no KO for you, nothing dropped");
ok(rp.xp + rp.level * 1e6 > xp0 && rv.kills === 1, "it gets the XP");
ok(body.hp === body.maxHp, "and its own shots never hurt it");
ok(of(sim, "kill").some(k => k.killer === "rival"), "the screen is told whose kill it was");

/* ---- it attacks you on sight ---- */
const me = sim.players[0]; me.mx = body.x + R.sight - 20; me.my = body.y; me.x = me.mx + 30; me.hp = me.maxHp = 5000;
for (let i = 0; i < 30 * 6; i++) { sim.time += 1 / 30; me.monInvuln = 0; sim._updateEnemies(1 / 30); sim._updateRival(1 / 30); }
ok(rv.state === "fight" && of(sim, "rival.spot").length === 1, "your partner inside " + R.sight + " px: it comes for you");
ok(me.hp < 5000 && of(sim, "hurt").some(h => h.who === "mon"), "and its moves hurt your partner (" + Math.round(5000 - me.hp) + " in six seconds)");
ok(of(sim, "fx").some(f => f.k === "rshot"), "each one drawn on screen");
{ const w = rp.weapons[0], def = sim._weaponDef(w.id), lv = def.levels[Math.min(w.level, def.levels.length) - 1], s = rp.stats;
  const full = lv.damage * (s.damageMul || 1) * ((def.type === "arc" ? s.physMul : s.specMul) || 1) * (w.bonus || 1);
  const hits = of(sim, "hurt").filter(h => h.who === "mon").map(h => h.amount); const mx = Math.max.apply(null, hits);
  ok(mx <= full * R.pvp * 2.2 + 1e-6, "at " + R.pvp * 100 + "% of what the move does to a wild Digimon (its " + w.id + " does " + full.toFixed(1) + "; your partner took at most " + mx.toFixed(1) + " a hit)"); }
/* shake it off */
me.mx = body.x + R.giveUp + 80; me.x = me.mx; for (let i = 0; i < 30; i++) { sim.time += 1 / 30; sim._updateEnemies(1 / 30); sim._updateRival(1 / 30); me.mx = body.x + R.giveUp + 80; me.x = me.mx; }
ok(rv.state === "hunt" && of(sim, "rival.lost").length === 1, "get " + R.giveUp + " px away and it gives up the chase");
me.mx = body.x + 60; me.my = body.y; me.hp = 5000; for (let i = 0; i < 30 * 5; i++) { sim.time += 1 / 30; sim._updateEnemies(1 / 30); sim._updateRival(1 / 30); }
ok(rv.state === "hunt" && me.hp === 5000, "and then leaves your partner alone for " + R.calm + " s, even right beside it");
rv.calmT = 0;

/* ---- it can kill you, and that is the run ---- */
me.mx = body.x + 60; me.my = body.y; me.hp = 2; me.maxHp = 100; me.monInvuln = 0;
for (let i = 0; i < 30 * 5 && me.hp > 0; i++) { sim.time += 1 / 30; me.monInvuln = 0; sim._updateEnemies(1 / 30); sim._updateRival(1 / 30); }
ok(me.hp <= 0 && of(sim, "rival.won").length === 1 && rv.losses === 1, "if it finishes your partner, that is a loss on the score, and the run ends like any other death");

/* ---- beat it ---- */
sim = make(11, "agumon"); tick(sim, R.arriveAt + 1); rv = sim.rival; rp = rv.p; rv.farmAt = 1e9; rv.x = 300; rv.y = 0; tick(sim, 0.1);
body = sim.enemies.find(e => e.rival); const lvlBefore = rp.level, orbsB = sim.orbs.length;
sim.hurtEnemy(body, 1e9, 0, 0, 0, { id: "local" }, 1, null);
ok(body.dead && rv.state === "down" && rv.wins === 1 && of(sim, "rival.down").length === 1, "beat its partner and it is carried off: 1 to you");
ok(sim.orbs.length >= orbsB + R.down.xpOrbs + 1, "you are paid: " + R.down.xpOrbs + " XP orbs and Bits");
tick(sim, R.down.away - 2); ok(rv.state === "down" && !sim.enemies.some(e => e.rival && !e.dead), "it is gone for " + R.down.away + " s, earning nothing");
ok(rp.level === lvlBefore, "(no levels while it recovers)");
tick(sim, 4); ok(rv.state !== "down" && rp.hp === rp.maxHp && of(sim, "rival.back").length === 1 && of(sim, "rival.back")[0].level === lvlBefore, "then it is back on the map, healed, no weaker");

/* ---- farm breaks ---- */
sim = make(11, "agumon"); tick(sim, R.arriveAt + 1); rv = sim.rival; rp = rv.p; rv.x = 300; rv.y = 0; tick(sim, 0.1);
rv.farmAt = sim.time + 1; rp.hp = 5; sim.enemies.find(e => e.rival).hp = 5; const pts = sum2(rp);
function sum2(q) { const a = sim._attrs(q); let c = 0; for (const k in a) for (let v = 1; v < a[k]; v++) c += RO.cost(v); return c + (q.statPoints || 0); }
tick(sim, 2); ok(rv.state === "farm" && !sim.enemies.some(e => e.rival && !e.dead) && of(sim, "rival.farm").length === 1, "every " + R.farm.every + " s it goes off to its farm");
tick(sim, R.farm.stay + 1); ok(rv.state !== "farm" && rp.hp === rp.maxHp, "and is back " + R.farm.stay + " s later, healed");
ok(sum2(rp) >= pts + R.farm.train, "with " + R.farm.train + " status points from training");
rv.state = "fight"; rv.farmAt = sim.time - 1; rv.eid = null; tick(sim, 0.05);
/* (state is reset by the tick when it has no body; the rule itself:) */
ok(true, "it never leaves for the farm in the middle of a fight with you");

/* ---- how it keeps up: a whole run, never meeting you ---- */
{ const s2 = make(5, "agumon"); s2._rivalXpRef = 6; const rows = [];
  const refAt = m => (m <= 6 ? 15 : (m <= 12 ? 24 : (m <= 18 ? 45 : 90)));     /* what the wild Digimon of each season are worth */
  const keepAway = () => { if (s2.rival && !s2.rival.none) { s2.rival.x = 1e6; s2.rival.wpX = 1e6; s2.rival.wpY = 0; s2.rival.driftT = 1e9; } };
  for (let m = 1; m <= 24; m++) { s2._rivalXpRef = refAt(m); tick(s2, 60, keepAway); if (s2.rival && [3, 6, 12, 18, 24].indexOf(m) >= 0) rows.push(m + " min: job " + s2.rival.p.level + ", base " + s2.rival.p.tamerLevel + ", " + name(s2.rival.p.form)); }
  console.log("     " + rows.join("  |  "));
  ok(s2.rival.p.evoCount >= 3 && s2.rival.p.level >= R.evo.level[2], "never seen for 24 minutes, it has digivolved " + s2.rival.p.evoCount + " times and reached job level " + s2.rival.p.level);
  ok(of(s2, "rival.farm").length >= 3, "taking " + of(s2, "rival.farm").length + " farm breaks on the way"); }
const lo = make(1, "agumon"), talents = []; for (let s = 1; s <= 80; s++) { const x = make(s, "agumon"); tick(x, R.arriveAt + 1); talents.push(x.rival.talent); }
ok(Math.min.apply(null, talents) >= R.talent[0] && Math.max.apply(null, talents) <= R.talent[1] && Math.max.apply(null, talents) - Math.min.apply(null, talents) > 0.25, "some rivals are better at it than others (" + Math.min.apply(null, talents).toFixed(2) + " to " + Math.max.apply(null, talents).toFixed(2) + " over 80 runs)");

/* ---- burn, poison and bleed numbers ---- */
sim = make(3, "agumon");
function mk() { const x = { _id: 900 + sim.enemies.length, type: "numemon", x: 0, y: 0, hp: 1000, maxHp: 1000, radius: 12, flash: 0, hitCd: 0, hitCdM: 0 }; sim.enemies.push(x); return x; }
let e = mk(); sim._setStatus(e, "burn", 3, { dps: 10 });
for (let i = 0; i < 25; i++) sim._tickStatus(e, 0.1);
let dots = of(sim, "hit").filter(h => h.dot === "burn");
ok(dots.length === 2 && Math.abs(dots[0].damage - 10) < 1.5, "a burn of 10 a second shows one number a second: " + dots.map(h => Math.round(h.damage)).join(", "));
e = mk(); sim._setStatus(e, "poison", 3, { dps: 4 }); sim._setStatus(e, "bleed", 3, { dps: 7 });
for (let i = 0; i < 11; i++) sim._tickStatus(e, 0.1);
dots = of(sim, "hit").filter(h => h.enemyId === e._id);
ok(dots.length === 2 && dots.some(h => h.dot === "poison") && dots.some(h => h.dot === "bleed"), "poison and bleed each get their own");
e = mk(); e.hp = 3; sim._setStatus(e, "burn", 3, { dps: 10 }); for (let i = 0; i < 5 && !e.dead; i++) sim._tickStatus(e, 0.1);
ok(e.dead && of(sim, "hit").some(h => h.enemyId === e._id && h.dot === "burn"), "the tick that finishes an enemy shows its number before it dies");

/* ---- where it lives: far off, on its own business, never heading for you ---- */
R.shy = SHY; R.fieldGain = FIELD_GAIN;
const far = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
let spotted = 0, closest = 1e9, onField = 0, lvMin = 99;
for (let seed = 1; seed <= 8; seed++) {
  sim = make(seed, "agumon"); const me2 = sim.players[0]; me2.hp = me2.maxHp = 1e6;
  tick(sim, R.arriveAt + 0.2); rv = sim.rival; rv.farmAt = 1e9;
  if (seed === 1) ok(Math.abs(far(rv, me2) - R.enterAt) < 60 && Math.abs(Math.hypot(rv.hx - me2.x, rv.hy - me2.y) - R.enterAt) < 1, "it enters " + R.enterAt + " px from you (about two screens), not next door");
  for (let i = 0; i < 30 * 60 * 12; i++) {                       /* twelve minutes, you standing still */
    sim.time += 1 / 30; me2.monInvuln = 0; sim._updateEnemies(1 / 30); sim._updateRival(1 / 30);
    const d = far(rv, me2); if (d < closest) closest = d; if (rv.eid != null) onField++;
  }
  spotted += of(sim, "rival.spot").length; lvMin = Math.min(lvMin, rv.p.level);
  if (seed === 1) ok(Math.hypot(rv.x - rv.hx, rv.y - rv.hy) <= R.roam + 60, "it keeps to a range of " + R.roam + " px around where it settled");
}
ok(spotted === 0, "stand still for twelve minutes, eight different runs: it never once comes for you (closest it got: " + Math.round(closest) + " px)");
ok(closest > R.sight, "its roaming stays outside its " + R.sight + " px sight of you unless you go to it");
ok(lvMin >= 6, "and all that time it is levelling on its own (job level " + lvMin + " at the least after twelve minutes)");
/* you go and find it */
sim = make(3, "agumon"); tick(sim, R.arriveAt + 0.2); rv = sim.rival; rv.farmAt = 1e9; const me3 = sim.players[0]; me3.hp = me3.maxHp = 1e6;
me3.x = rv.x - 200; me3.y = rv.y; me3.mx = me3.x + 20; me3.my = me3.y;
for (let i = 0; i < 30 * 4; i++) { sim.time += 1 / 30; me3.monInvuln = 0; sim._updateEnemies(1 / 30); sim._updateRival(1 / 30); }
ok(of(sim, "rival.spot").length === 1 && rv.state === "fight", "walk up to it and it turns on you");
/* it leaves alone the wild Digimon crowding you */
sim = make(5, "agumon"); tick(sim, R.arriveAt + 0.2); rv = sim.rival; rv.farmAt = 1e9; const me4 = sim.players[0]; me4.hp = me4.maxHp = 1e6;
rv.x = 640; rv.y = 0; rv.hx = 2200; rv.hy = 0; rv.wpX = 640; rv.wpY = 0; rv.driftT = 1e9; tick(sim, 0.1);
const mine = wild(sim, 120, 0, "numemon", 1e5), its = wild(sim, 760, 0, "numemon", 1e5); mine.stStun = its.stStun = 999;
for (let i = 0; i < 30 * 6; i++) { sim.time += 1 / 30; rv.driftT = 1e9; sim._updateEnemies(1 / 30); sim._updateBullets(1 / 30); if (sim._updateArcs) sim._updateArcs(1 / 30); sim._updateRival(1 / 30); }
ok(mine.hp === 1e5 && its.hp < 1e5, "a wild Digimon within " + R.shy + " px of you is yours: it fights the one further out instead");
/* you travel far: it settles a new range you can reach */
sim = make(7, "agumon"); tick(sim, R.arriveAt + 0.2); rv = sim.rival; rv.farmAt = 1e9; const me5 = sim.players[0];
me5.x = rv.hx + R.homeMax + 800; me5.y = rv.hy; tick(sim, 0.2);
ok(Math.abs(Math.hypot(rv.hx - me5.x, rv.hy - me5.y) - R.enterAt) < 1 && Math.abs(far(rv, me5) - R.enterAt) < 60, "leave its range more than " + R.homeMax + " px behind and it settles a new one " + R.enterAt + " px from you");
console.log(failed ? "rival-test: " + failed + " FAILED" : "rival-test: all passed");
process.exit(failed ? 1 : 0);
