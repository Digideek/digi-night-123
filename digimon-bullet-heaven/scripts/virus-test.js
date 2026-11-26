/* node scripts/virus-test.js : infected Digimon (data.js VIRUS, js/net/virus-sim.js) */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "weather", "seasons"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const V = D.VIRUS;
function world(px, py) {
  const sim = new mission.MissionSim({ seed: 9, hz: auth.TICK_HZ, data: D }); const a = new auth.Authority({ sim: sim, seed: 9 });
  sim.phase = "playing"; sim.time = 60; sim.skillTree = true;
  if (!sim.players[0]) { sim.players.push({ id: "local" }); sim.localId = "local"; }
  const p = sim.players[0];
  Object.assign(p, { form: "greymon", level: 10, hp: 5000, maxHp: 5000, x: px, y: py, mx: px, my: py, facing: 1, faint: 0, downed: false, hasTamer: true, kind: "human", moving: false, skills: {}, weapons: [], killsBy: {} });
  return { sim, p, a };
}
let nid = 500;
function foe(sim, type, x, y, o) { const d = D.ENEMIES[type]; const e = Object.assign({ _id: nid++, type: type, x: x, y: y, hp: d.hp, maxHp: d.hp, radius: d.radius || 12, flash: 0, hitCd: 0, hitCdM: 0, hitCdA: 0, hitCdCpu: {}, slow: 1, slowTime: 0, facing: 1, dmgMul: 1 }, o || {}); sim.enemies.push(e); return e; }
function spin(sim, secs, each) { const ev = []; for (let i = 0; i < Math.round(secs * 25); i++) { sim._updateEnemies(0.04); sim.time += 0.04; while (sim.events.length) ev.push(sim.events.shift()); if (each && each() === false) break; } return ev; }
const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/* infecting one */
{ const { sim } = world(1500, 1500);
  const e = foe(sim, "agumon", 0, 0), boss = foe(sim, "greymon", 300, 0, { boss: true });
  ok(sim._infect(e, null) && e.virus && e.maxHp === D.ENEMIES.agumon.hp * V.hpMul && e.dmgMul === V.dmgMul, "an infected Agumon has " + V.hpMul + "x the health and " + V.dmgMul + "x the damage of a plain one");
  ok(!sim._infect(boss, null) && !boss.virus, "a boss cannot be infected");
  ok(sim.snapshot(true).enemies.find(x => x._id === e._id).virus === true, "the snapshot marks it, so it can be drawn purple"); }

/* 2: nobody of yours in sight: it goes for the uninfected one, not the infected one nearer by */
{ const { sim } = world(1500, 1500);
  const v = foe(sim, "agumon", 0, 0), sick = foe(sim, "gabumon", 60, 0), clean = foe(sim, "gomamon", -150, 0, { hp: 1e6, maxHp: 1e6 });
  sim._infect(v, null); sim._infect(sick, null); sick.virus.cd = 99; sick.x = 60;
  const sh = sick.hp;
  spin(sim, 1.5, () => { sick.x = 60; sick.y = 0; });
  ok(d(v, clean) < 60 && clean.hp < 1e6, "with an infected Digimon nearer and a clean one further, it goes for the clean one");
  ok(sick.hp === sh, "and leaves the infected one alone meanwhile"); }

/* 3: only infected in sight */
{ const { sim } = world(1500, 1500);
  const v = foe(sim, "agumon", 0, 0), sick = foe(sim, "gabumon", 120, 0);
  sim._infect(v, null); sim._infect(sick, null);
  const sh = sick.hp; spin(sim, 2.5);
  ok(sick.hp < sh || sick.dead || v.dead, "two infected with nothing else in sight fight each other"); }

/* 1: you first */
{ const { sim, p } = world(200, 0);
  const v = foe(sim, "agumon", 0, 0), clean = foe(sim, "gomamon", -40, 0, { hp: 1e6, maxHp: 1e6 });
  sim._infect(v, null);
  const ev = spin(sim, 2.5);
  ok(clean.hp === 1e6 && d(v, { x: p.mx, y: p.my }) < 60, "with the partner in sight it ignores the wild Digimon beside it and comes for the partner");
  ok(p.hp < 5000 || ev.some(e => e.type === "fx" && (e.k === "dodge" || e.k === "lucky")), "and hits it");
  ok(!p.virus && !p.infected, "the partner does not catch anything"); }
{ const { sim, p } = world(V.sight + 300, 0);
  const v = foe(sim, "agumon", 0, 0), clean = foe(sim, "gomamon", -60, 0, { hp: 1e6, maxHp: 1e6 });
  sim._infect(v, null); spin(sim, 1);
  ok(clean.hp < 1e6, "out of its sight (" + V.sight + " px), it fights the wild one instead"); }

/* its kills: nothing for you, and they feed it */
{ const { sim, p } = world(1500, 1500);
  const v = foe(sim, "agumon", 0, 0); sim._infect(v, null);
  const k0 = sim.kills, o0 = sim.orbs.length; let ev = [];
  for (let i = 0; i < V.grow[2]; i++) { foe(sim, "pagumon", 20, 0, { hp: 1, maxHp: 1 }); v.virus.cd = 0; v.x = 0; v.y = 0; ev = ev.concat(spin(sim, 0.5)); }
  const kills = ev.filter(e => e.type === "kill");
  ok(kills.length === V.grow[2] && kills.every(e => e.killer === "wild"), "it killed " + kills.length + " wild Digimon; each kill is marked as a wild one's");
  ok(sim.kills === k0 && sim.orbs.length === o0 && !(p.kills > 0), "none of them counted for you or dropped anything");
  const evo = ev.find(e => e.type === "virus.evolve");
  ok(evo && v.type !== "agumon" && sim._virusStage(v.type) === 3 && v.virus, V.grow[2] + " kills as a Rookie: Agumon digivolved to " + D.ENEMIES[v.type].name + ", still infected");
  ok(v.hp === v.maxHp && v.maxHp > D.ENEMIES.agumon.hp * V.hpMul * 1.39, "and is tougher for it (" + Math.round(D.ENEMIES.agumon.hp * V.hpMul) + " -> " + Math.round(v.maxHp) + " health)"); }

/* spreading: Champion and up only */
function spreadRun(type, n) {
  const { sim } = world(1500, 1500); let got = 0;
  for (let i = 0; i < n; i++) {
    sim.enemies.length = 0;
    const v = foe(sim, type, 0, 0), t = foe(sim, "numemon", 24, 0, { hp: 1e6, maxHp: 1e6 });
    sim._infect(v, null); sim._wildBite(v, t, 10, 0.04);
    if (t.virus) { got++; if (got === 1) spreadRun.last = t; }
  }
  return got;
}
{ const rk = spreadRun("agumon", 300), ch = spreadRun("greymon", 300), t = spreadRun.last;
  ok(rk === 0, "a Rookie's hits never pass it on (0 of 300)");
  ok(ch > 300 * V.spreadChance * 0.7 && ch < 300 * V.spreadChance * 1.3, "a Champion's do, about " + Math.round(V.spreadChance * 100) + "% of the hits survived (" + ch + " of 300)");
  ok(t && t.virus.caught && Math.abs(t.maxHp - 1e6 * V.caught.hpMul) < 1 && V.caught.hpMul < V.hpMul, "one that caught it is weaker than one that came with it (" + V.caught.hpMul + "x health against " + V.hpMul + "x)"); }
{ const { sim } = world(1500, 1500);
  const v = foe(sim, "greymon", 0, 0); sim._infect(v, null);
  for (let i = 0; i < V.cap - 1; i++) sim._infect(foe(sim, "agumon", 3000 + i * 900, 3000), null);
  let extra = 0;
  for (let i = 0; i < 200; i++) { const t = foe(sim, "numemon", 24, 0, { hp: 1e6, maxHp: 1e6 }); sim._wildBite(v, t, 10, 0.04); v.virus.cd = 0; if (t.virus) extra++; t.dead = true; }
  ok(extra === 0 && sim._virusCount() === V.cap, "never more than " + V.cap + " infected at once"); }

/* the one it hits fights back */
{ const { sim } = world(1500, 1500);
  const v = foe(sim, "agumon", 0, 0), t = foe(sim, "greymon", 30, 0, { hp: 1e6, maxHp: 1e6 });
  sim._infect(v, null); const h = v.hp;
  const ev = spin(sim, 2);
  ok(t.hp < 1e6 && v.hp < h, "a wild Digimon it attacks hits it back");
  v.hp = 1; v.virus.cd = 99; const ev2 = spin(sim, 2), k = ev2.find(e => e.type === "kill" && e.enemyId === v._id);
  ok(v.dead && k && k.killer === "wild" && sim.orbs.length === 0, "and can kill it, which pays you nothing"); }

/* you beat one: it pays extra; and it cannot be caught */
{ const { sim, p, a } = world(40, 0);
  const v = foe(sim, "agumon", 0, 0), plainOne = foe(sim, "agumon", 0, 3000);
  sim._infect(v, null);
  sim._killEnemy(plainOne, p); const base = sim.orbs.length; sim.orbs.length = 0;
  /* 17z33: you catch a Digimon by defeating it once its kind is ready; an infected one never stays down to be caught */
  p.killsBy.agumon = 999; const spots0 = (sim.catches || []).length;
  sim.hurtEnemy(v, 1e7, 1, 0, 0, p, 1);
  ok((sim.catches || []).length === spots0, "beaten, it doesn't stay down to be caught (infected)");
  const kev = sim.events.filter(e => e.type === "kill").pop();
  ok(v.dead && kev.virus === 1 && kev.killer === p.id, "killing it yourself is your kill, marked as an infected one");
  ok(sim.orbs.length >= base + V.pay.xpOrbs && sim.orbs.some(o => o.kind === "bits" && o.value === V.pay.bits), "it drops " + V.pay.xpOrbs + " extra XP orbs and " + V.pay.bits + " bits on top of the usual"); }

/* they wander in on their own */
{ const { sim, p } = world(0, 0);
  sim.time = V.firstAt - 1; sim._updateVirus(0.04);
  ok(sim._virusCount() === 0, "none before " + V.firstAt + " s");
  const seen = {}; let ev = [];
  sim._spawnsOpen = () => true;
  for (let t = 0; t < 400; t++) { sim.time += 1; sim._updateVirus(1); while (sim.events.length) ev.push(sim.events.shift()); }
  const sp = ev.filter(e => e.type === "virus.spawn");
  ok(sim._virusCount() === V.wild && sp.length === V.wild, "then one at a time until " + V.wild + " are about; no more while they live");
  ok(sp.every(e => D.ENEMIES[e.enemyType].stageDisplay === "Child (Rookie)" || D.ENEMIES[e.enemyType].stageDisplay === "Adult (Champion)"), "early on they are Rookies and Champions (" + sp.map(e => D.ENEMIES[e.enemyType].name).join(", ") + ")");
  sim.enemies.forEach(e => e.dead = true); sim.enemies.length = 0; sim.time = 20 * 60; ev = [];
  for (let t = 0; t < 400; t++) { sim.time += 1; sim._updateVirus(1); while (sim.events.length) ev.push(sim.events.shift()); }
  const late = ev.filter(e => e.type === "virus.spawn").map(e => D.ENEMIES[e.enemyType]);
  ok(late.length && late.every(x => /Champion|Ultimate/.test(x.stageDisplay) && !x.boss), "after 18 minutes, Champions and Ultimates (" + late.map(x => x.name).join(", ") + ")"); }

console.log(failed ? failed + " FAILED" : "virus-test: all passed");
process.exit(failed ? 1 : 0);
