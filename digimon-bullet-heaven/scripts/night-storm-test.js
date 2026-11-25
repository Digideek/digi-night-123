/* node scripts/night-storm-test.js : day and night, rain and storms, lightning, grass that burns and grows back, and the music data */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "weather", "seasons", "audio"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) { console.log("load " + f + ": " + e.message); } });
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const S = D.seasons, W = D.weather, ST = D.STORM, GF = D.GRASSFIRE;

/* ---- day and night ---- */
ok(S.dayInfo(0).dark === 0 && S.dayInfo(0).id === "dawn", "a run starts at dawn, in the light");
/* times as parts of a day, so this holds whatever the day's length (17z33: 243 s) */
const DL = S.DAY.lengthSec, SL = S.CFG.lengthSec, at = f => DL * f;
ok(S.dayInfo(at(1 / 3)).id === "day" && S.dayInfo(at(1 / 3)).dark === 0, "a third of the way in it is day");
ok(S.dayInfo(at(2 / 3)).id === "dusk" && S.dayInfo(at(2 / 3)).dusk > 0.9, "two thirds in it is dusk");
ok(S.dayInfo(at(5 / 6)).id === "night" && S.dayInfo(at(5 / 6)).dark === 1, "five sixths in it is full night");
ok(S.dayInfo(DL + at(1 / 3)).id === "day" && S.dayInfo(DL * 2 + at(5 / 6)).id === "night" && Math.abs(SL / DL - 2) < 1e-9, "and it comes round every " + DL + " s, twice a season");
let nightSecs = 0; for (let t = 0; t < DL; t += 0.5) if (S.dayInfo(t).id === "night") nightSecs += 0.5;
ok(nightSecs > DL / 6 && nightSecs < DL * 0.28, "night lasts " + nightSecs + " s of each " + DL);
const day = { time: at(1 / 3), weather: { id: "clear", fadeT: 6, fadeMax: 6 } }, night = { time: at(5 / 6), weather: { id: "clear", fadeT: 6, fadeMax: 6 } };
ok(Math.abs(W.enemySpeedScale(day, D) - 1) < 1e-9 && Math.abs(W.enemySpeedScale(night, D) - (1 + S.DAY.night.enemySpdMul)) < 1e-9, "enemies move " + Math.round(S.DAY.night.enemySpdMul * 100) + "% faster at night, and not by day");
ok(S.aggroScale(day) === 1 && Math.abs(S.aggroScale(night) - 1.5) < 1e-9 && Math.abs(S.atkRateScale(night) - 1.25) < 1e-9, "at night they notice you from 1.5x as far and bite 1.25x as often");
const y2 = { time: SL * 4 + at(5 / 6), weather: night.weather };
ok(Math.abs(W.enemySpeedScale(y2, D) - S.mods(y2.time).enemySpdMul * 1.15) < 1e-9, "night stacks on the season's own speed");

/* ---- the weather list ---- */
const cat = D.WEATHER.catalog;
ok(cat.rain && cat.storm && cat.storm.lightning && cat.rain.wet && W.CATALOG.rain && W.CATALOG.storm, "rain and thunderstorm are in the weather list");
const seen = {}; { const store = { time: 400 }; W.startRunWeather(store, { data: D }); store.weather.nextDelay = 0; let x = 7; const rng = () => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff; };
  for (let i = 0; i < 40000; i++) { W.tick(store, 0.25, { data: D, phase: "playing", rng, combatReady: true }); seen[W.idOf(store)] = (seen[W.idOf(store)] || 0) + 1; } }
ok(seen.rain && seen.storm && seen.clear && seen.eclipse && seen.meteorShower, "all five come up over a long run: " + Object.keys(seen).map(k => k + " " + Math.round(100 * seen[k] / 40000) + "%").join(", "));
{ const s2 = { time: 400 }; W.force(s2, "storm", { data: D }); s2.weather.fadeT = s2.weather.fadeMax; ok(W.wetness(s2) === 1 && W.amount(s2, "storm") === 1, "a storm in full is wet"); W.force(s2, "clear", { data: D }); s2.weather.fadeT = 3; ok(Math.abs(W.wetness(s2) - 0.5) < 1e-9, "and half-way through clearing it is half as wet"); }

/* ---- a stand-in world: grass everywhere east of x = 0, tall grass in a band, charring like world.js ---- */
const T = 48; let clock = 0; const burnt = {};
const world = {
  setTime: t => { clock = t; },
  burnState: k => { const b = burnt[k]; if (!b) return 0; if (clock >= b.until) { delete burnt[k]; return 0; } return clock >= b.until - b.sprout ? 2 : 1; },
  isGrass: (x, y) => x >= 0 && !world.burnState(Math.floor(x / T) + "," + Math.floor(y / T)),
  isTallGrass: (x, y) => world.isGrass(x, y) && x >= 2000 && x < 3000,
  groundAt: (x, y) => (y < -5000 ? "water" : "land"),
  burn: (x, y, r, at, regrow, sprout) => { let n = 0; const cx = Math.floor(x / T), cy = Math.floor(y / T), m = Math.ceil(r / T) + 1;
    for (let ty = cy - m; ty <= cy + m; ty++) for (let tx = cx - m; tx <= cx + m; tx++) { const px = (tx + 0.5) * T - x, py = (ty + 0.5) * T - y; if (!(tx === cx && ty === cy) && px * px + py * py > (r + T * 0.3) * (r + T * 0.3)) continue; const k = tx + "," + ty; if (tx < 0 || world.burnState(k)) continue; burnt[k] = { at, until: at + regrow, sprout }; n++; } return n; }
};
D.world = world;
const sim = new mission.MissionSim({ seed: 9, hz: auth.TICK_HZ, data: D }); new auth.Authority({ sim: sim, seed: 9 });
sim.phase = "playing"; sim.time = 400; world.setTime(400);
if (!sim.players[0]) { sim.players.push({ id: "local" }); sim.localId = "local"; }
const p = sim.players[0];
Object.assign(p, { form: "agumon", level: 5, hp: 100, maxHp: 100, x: -900, y: 0, mx: -900, my: 0, faint: 0, downed: false, hasTamer: true, kind: "human", monInvuln: 0 });
const ev = []; const emit0 = sim.emit.bind(sim); sim.emit = e => { ev.push(e); return emit0(e); };
function mk(x, y, o) { const e = Object.assign({ _id: Math.random(), type: "numemon", x: x, y: y || 0, hp: 100, maxHp: 100, radius: 12, flash: 0, hitCd: 0, hitCdM: 0 }, o || {}); sim.enemies.push(e); return e; }

/* ---- lightning ---- */
sim.patches = [];
let a = mk(-600, 0), far = mk(-300, 0), boss = mk(-610, 10, { boss: true, hp: 1000, maxHp: 1000 }), weak = mk(-590, -10, { hp: 20 });
p.mx = -600 + 20; p.my = 5; p.hp = 100;
sim._strike(-600, 0);
ok(Math.abs(a.hp - 100 * (1 - ST.enemy)) < 1e-6 && far.hp === 100, "a bolt takes " + ST.enemy * 100 + "% of an enemy's health within " + ST.radius + " px, and nothing further off");
ok(Math.abs(boss.hp - 1000 * (1 - ST.big)) < 1e-6, "a boss loses only " + ST.big * 100 + "%");
ok(weak.dead, "and it can finish an enemy off");
ok(a.st && a.st.shock && a.st.shock.t > 0, "what it hits is shocked");
ok(Math.abs(p.hp - 90) < 1e-6 && ev.some(e => e.type === "hurt" && e.bolt), "a partner under it loses " + ST.partner * 100 + "% of its health");
p.hp = 3; sim._strike(-600, 0); ok(p.hp === 1, "but never its last point");
ok(sim.patches.some(q => q.kind === "fire"), "it leaves fire where it landed");
ok(ev.some(e => e.type === "fx" && e.k === "bolt"), "and the bolt is announced to every screen");
sim.patches = []; sim._strike(0, -6000); ok(sim.patches.length === 0, "no fire when it lands on water");
/* scheduling */
sim.patches = []; sim.enemies.length = 0; ev.length = 0; p.mx = p.x = -900; p.hp = 100;
sim._combatReady = () => true;
W.force(sim, "storm", { data: D }); sim.weather.fadeT = sim.weather.fadeMax;
let warns = 0, strikes = 0; for (let i = 0; i < 60 * 30; i++) { sim.time += 1 / 30; sim._updateStorm(1 / 30); }
ev.forEach(e => { if (e.type === "fx" && e.k === "boltwarn") warns++; if (e.type === "fx" && e.k === "bolt") strikes++; });
ok(strikes >= 7 && strikes <= 18 && warns >= strikes, "a minute of storm throws " + strikes + " bolts, each with a warning first");
const firstWarn = ev.find(e => e.k === "boltwarn"), firstBolt = ev.find(e => e.k === "bolt");
ok(firstBolt.time - firstWarn.time >= ST.warn - 0.05, "the warning comes " + ST.warn + " s ahead");
ok(ev.filter(e => e.k === "boltwarn").every(e => Math.hypot(e.x - p.x, e.y - p.y) <= ST.range[1] + 1), "all of them within " + ST.range[1] + " px of the tamer");
W.force(sim, "rain", { data: D }); sim.weather.fadeT = sim.weather.fadeMax; ev.length = 0; sim.bolts.length = 0;
for (let i = 0; i < 30 * 30; i++) sim._updateStorm(1 / 30);
ok(!ev.some(e => e.k === "bolt"), "plain rain throws none");
W.force(sim, "clear", { data: D }); sim.weather.fadeT = sim.weather.fadeMax;

/* ---- grass burns, and grows back ---- */
sim.patches = []; ev.length = 0; sim.time = 400; world.setTime(400);
let q = sim._addPatch("fire", 500, 500, 40, 10, null, 0);
const key = Math.floor(500 / T) + "," + Math.floor(500 / T);
ok(q.grass && world.burnState(key) === 1 && !world.isGrass(500, 500), "fire on grass chars the grass under it");
ok(ev.some(e => e.type === "fx" && e.k === "scorch"), "and tells the other screens");
ok(Object.keys(burnt).length > 1, "a 40 px fire chars " + Object.keys(burnt).length + " tiles");
sim.patches = []; const n1 = Object.keys(burnt).length; q = sim._addPatch("fire", 500, 500, 40, 10, null, 0);
ok(!q.grass && Object.keys(burnt).length === n1, "charred ground does not burn as grass again");
world.setTime(400 + GF.regrow - GF.sprout + 1); ok(world.burnState(key) === 2, "after " + (GF.regrow - GF.sprout) + " s shoots come up");
world.setTime(400 + GF.regrow + 1); ok(world.burnState(key) === 0 && world.isGrass(500, 500), "after " + GF.regrow + " s it is grass again");
/* bare ground does not char */
sim.patches = []; q = sim._addPatch("fire", -500, 0, 40, 10, null, 0); ok(!q.grass, "fire off the grass is only fire");
/* tall grass catches for sure and carries it further */
function spreadFrom(x, seedTime) {
  for (const k in burnt) delete burnt[k];
  sim.patches = []; sim.time = seedTime; world.setTime(seedTime);
  let s = 12345; const r0 = sim.rng; sim.rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  sim._addPatch("fire", x, 500, 36, 10, null, 0);
  let maxGen = 0; for (let i = 0; i < 30 * 40; i++) { sim.time += 1 / 30; world.setTime(sim.time); sim._updatePatches(1 / 30); sim.patches.forEach(z => { if (z.gen > maxGen) maxGen = z.gen; }); }
  sim.rng = r0; return { tiles: Object.keys(burnt).length, gen: maxGen, left: sim.patches.length };
}
const plain = spreadFrom(500, 30), tall = spreadFrom(2500, 30);
ok(tall.tiles > plain.tiles && tall.gen > plain.gen, "fire runs further through tall grass (" + tall.tiles + " tiles, " + tall.gen + " steps) than short (" + plain.tiles + " tiles, " + plain.gen + " steps)");
ok(tall.gen <= GF.tallSpreadGen && tall.left === 0 && plain.left === 0, "and it always burns itself out");
ok(tall.tiles < 400, "without taking the whole map");
{ sim.patches = []; for (const k in burnt) delete burnt[k]; sim._patchT = 0; const r0 = sim.rng; sim.rng = () => 0.55; sim._maybePatch(2500, 500, "fire", 10, { id: null, form: "agumon" }, null); const lit = sim.patches.length; sim.patches = []; sim._patchT = 0; sim._maybePatch(-500, 500, "fire", 10, { id: null, form: "agumon" }, null); sim.rng = r0;
  ok(lit === 1 && sim.patches.length === 0, "a fire move landing in tall grass nearly always sets it alight"); }
/* rain */
{ for (const k in burnt) delete burnt[k]; sim.patches = []; const dry = sim._addPatch("fire", 500, 900, 30, 10, null, 0).max; W.force(sim, "rain", { data: D }); sim.weather.fadeT = sim.weather.fadeMax; const wet = sim._addPatch("fire", 500, 1500, 30, 10, null, 0).max; sim._boltFire = true; const bolt = sim._addPatch("fire", 500, 2100, 30, 10, null, 0).max; sim._boltFire = false; W.force(sim, "clear", { data: D });
  ok(Math.abs(wet - dry * GF.wetLife) < 1e-6 && bolt === dry, "in rain a grass fire burns out sooner (" + wet.toFixed(1) + " s, not " + dry.toFixed(1) + "), except where lightning lit it"); }

/* ---- music data ---- */
const A = D.audio; let bad = 0, tracks = 0, bars = 0;
for (const id in A.TRACKS) { const t = A.TRACKS[id]; tracks++;
  (t.lead.bars || []).forEach((b, i) => { const n = b.trim().split(/\s+/).length; bars++; if (n !== 8 && n !== 16) { bad++; console.log("    " + id + " lead bar " + i + " has " + n + " steps"); } });
  (t.bass.bars || []).forEach((b, i) => { const n = b.trim().split(/\s+/).length; if (n !== 8 && n !== 16) { bad++; console.log("    " + id + " bass bar " + i + " has " + n); } });
  if (t.wob) t.wob.bars.forEach((b, i) => { if (!b) return; const n = b.reduce((s, x) => s + x[1], 0); if (n !== 16) { bad++; console.log("    " + id + " wobble bar " + i + " is " + n + " steps"); } });
  ["k", "s", "h"].forEach(r => t.drums[r].forEach((row, i) => { if (row.length !== 16) { bad++; console.log("    " + id + " drum " + r + i + " is " + row.length); } }));
  if (t.lead.bars.length !== t.prog.length && t.lead.bars.length % t.prog.length && t.prog.length % t.lead.bars.length) { bad++; console.log("    " + id + " lead/prog length"); }
}
ok(bad === 0, tracks + " pieces of music, " + bars + " bars of melody, every bar the right length");
ok(["title", "farm", "spring", "summer", "fall", "winter", "boss", "eclipse"].every(k => A.TRACKS[k]), "a piece each for the title, the farm, the four seasons, bosses and the eclipse");
ok(["spring", "summer", "fall", "winter"].every(k => A.TRACKS[k].night && A._compile(k + "_night").scale !== A.TRACKS[k].scale), "and every season has its night version in a darker scale");
ok(A._parseBar("0 - 2 .").length === 2 && A._parseBar("0 - 2 .")[0].len === 8, "held notes are read as held");
console.log(failed ? "night-storm-test: " + failed + " FAILED" : "night-storm-test: all passed");
process.exit(failed ? 1 : 0);
