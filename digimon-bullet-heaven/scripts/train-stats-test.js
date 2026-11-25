/* node scripts/train-stats-test.js : farm training pays into the base stats, and the three speeds (17z33).
 * Offense -> STR + DEX, Intelligence -> INT + LUK, Agility -> AGI, Bond -> VIT (1 for every 10); the
 * track's Agility speeds the partner up; Sprint Boots speed the tamer up; the partner stays ahead. */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "weather", "seasons", "biomes", "shop"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
D.sprites = Object.assign(D.sprites || {}, { colors: {}, SCALE: 3, TILE: 48 });
require(path.join(root, "js/world.js")); D.world.reset(3);
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
function mk() {
  const sim = new mission.MissionSim({ seed: 3, hz: auth.TICK_HZ, data: D }); const A = new auth.Authority({ sim, seed: 3 });
  sim.phase = "playing"; sim.time = 300; sim.localId = "local"; sim.players.length = 0;
  sim.players.push({ id: "local", form: "agumon", level: 5, tamerLevel: 5, hp: 200, maxHp: 200, x: 0, y: 0, mx: 20, my: 0, hasTamer: true, kind: "host-client", fullness: 100, happiness: 50, bag: {}, bits: 9999 });
  return { sim, A, p: sim.players[0] };
}
let w = mk();
const before = Object.assign({}, w.sim._jobBonus(w.p));
w.p.trainStats = { offense: 37, intelligence: 20, agility: 10 }; w.p.bondTrain = 45; w.p._statsKey = null;
const after = w.sim._jobBonus(w.p), d = k => after[k] - before[k];
ok(d("str") === 3 && d("dex") === 3, "37 Offense: +3 STR and +3 DEX");
ok(d("int") === 2 && d("luk") === 2, "20 Intelligence: +2 INT and +2 LUK");
ok(d("agi") === 1 && d("vit") === 4, "10 Agility: +1 AGI; 45 Bond: +4 VIT");
const parts = w.sim._attrParts(w.p);
ok(parts.farm.str === 3 && ["str", "agi", "vit", "int", "dex", "luk"].every(k => parts.level[k] + parts.evo[k] + parts.farm[k] === after[k]), "the green bonus splits into levelling, digivolving and farm, and they add up");
const dvA = D.RO.derive(D.RO.plus(w.sim._attrs(w.p), before), 5), dvB = w.sim._derived(w.p);
ok(dvB.physMul > dvA.physMul && dvB.crit > dvA.crit, "so training really hits harder (x" + dvA.physMul.toFixed(2) + " -> x" + dvB.physMul.toFixed(2) + ") and crits more");
/* partner run speed from the track */
w = mk(); const m0 = w.sim._stats(w.p).monSpeedMul;
w.p.trainStats = { offense: 0, intelligence: 0, agility: 60 }; w.p._statsKey = null;
const m1 = w.sim._stats(w.p).monSpeedMul;
ok(Math.abs(m1 / m0 - (1 + 60 * D.SPEEDS.trackPer)) < 1e-9, "60 track Agility: partner runs " + Math.round((m1 / m0 - 1) * 100) + "% faster");
w.p.trainStats.agility = 1000; w.p._statsKey = null;
ok(Math.abs(w.sim._stats(w.p).monSpeedMul / m0 - (1 + D.SPEEDS.trackMax)) < 1e-9, "  capped at +" + D.SPEEDS.trackMax * 100 + "%");
ok(w.sim._stats(w.p).speedMul === mk().sim._stats(mk().p).speedMul, "  and it doesn't make the tamer faster");
/* Sprint Boots */
w = mk(); w.sim.farm = { active: true }; const s0 = w.sim._stats(w.p).speedMul;
for (let i = 0; i < 5; i++) ok(w.A.act({ type: "shop.buy", id: "local", item: "sprintBoots" }).ok, "Sprint Boots level " + (i + 1) + " bought");
const r6 = w.A.act({ type: "shop.buy", id: "local", item: "sprintBoots" });
ok(!r6.ok && r6.reason === "Maxed out", "a sixth: " + r6.reason);
w.p._statsKey = null; const s5 = w.sim._stats(w.p).speedMul;
ok(Math.abs(s5 / s0 - 1.3) < 1e-9 && w.sim._stats(w.p).monSpeedMul === mk().sim._stats(mk().p).monSpeedMul, "level 5 boots: tamer +30%, the partner's own speed untouched");
/* the partner keeps ahead of a fast tamer */
const c0 = w.sim._snap ? w.sim._snap(0, 0, 10, 600) : { x: 0, y: 0 };
w.p.x = c0.x; w.p.y = c0.y; w.p.mx = c0.x - 120; w.p.my = c0.y; w.p.faint = 0; w.p.monInvuln = 0; w.p.facing = 1; w.p.moving = true;
const tamerSpd = (D.TAMER && D.TAMER.speed || 168) * s5, mx0 = w.p.mx;
const fn = Object.keys(mission.MissionSim.prototype).find(k => /^_move(Partner|Mon)/.test(k));
w.sim[fn](w.p, 0.1);
ok((w.p.mx - mx0) / 0.1 > tamerSpd, "with fast boots the partner still outruns the tamer (" + Math.round((w.p.mx - mx0) / 0.1) + " vs " + Math.round(tamerSpd) + " px/s)");
console.log(failed ? "train-stats-test: " + failed + " failed" : "train-stats-test: all passed"); process.exit(failed ? 1 : 0);
