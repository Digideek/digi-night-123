/* node scripts/war-test.js : biome wars (Nov 20). Bigger biomes; cells change hands along the borders;
 * a biome's season and its dead at the front decide which way; its lord falling makes it cave in;
 * skirmish squads fight each other and only turn on you if you come close or hit them; the land under
 * a conquered cell keeps its shape; everything resets with the map. Uses the real world.js. */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
global.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {} }), width: 0, height: 0 }) };
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "day-clock", "seasons", "weather", "biomes"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
D.sprites = Object.assign(D.sprites || {}, { colors: {}, SCALE: 3, TILE: 48 });
require(path.join(root, "js/world.js"));
const W = D.world, T = 48, span = W.TERR * T;
const mission = require(path.join(root, "js/net/mission-sim.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }

W.reset(7); W.setTime(100);
/* bigger biomes: average run of one biome along a line */
let runs = 0, len = 0, prev = null;
for (const sd of [1, 7, 42]) { W.reset(sd); for (let y = -3000; y <= 3000; y += 500) { prev = null; for (let x = -3000; x <= 3000; x += 6) { const b = W.biomeIdAt(x, y); if (b !== prev) { runs++; prev = b; } len += 6; } } }
W.reset(7); W.setTime(100);
ok(len / runs > 34, "biomes are much bigger than before (about 26 tiles a run, sampled this way, in 17t) (" + Math.round(len / runs) + " tiles across on average)");

/* a border cell near the start */
function findBorder(R) {
  for (let r = 4; r < R; r++) for (let cy = -r; cy <= r; cy++) for (let cx = -r; cx <= r; cx++) {
    if (Math.max(Math.abs(cx), Math.abs(cy)) !== r) continue;
    const a = W.cellOwner(cx, cy), b = W.cellOwner(cx + 1, cy);
    if (a !== b && W.cellOwner(cx - 1, cy) === a) return { cx, cy, a, b };
  }
  return null;
}
const f = findBorder(60);
ok(!!f, "there is a border between two biomes (" + (f && f.a) + " | " + (f && f.b) + ")");
const tx0 = f.cx * W.TERR + 3, ty0 = f.cy * W.TERR + 3, mat0 = W.materialAt(tx0, ty0);

function newSim() {
  const sim = new mission.MissionSim({ seed: 7, hz: 30, data: D });
  sim.phase = "playing"; sim.time = 100;
  if (!sim.players[0]) { sim.players.push({ id: "local" }); sim.localId = "local"; }
  const p = sim.players[0];
  Object.assign(p, { form: "agumon", level: 5, hp: 100, maxHp: 100, x: (f.cx + 0.5) * span, y: (f.cy + 0.5) * span + span * 3, faint: 0, downed: false, hasTamer: true, kind: "human" });
  p.mx = p.x; p.my = p.y;
  return sim;
}
const wave = { rates: {} };
Object.keys(D.ENEMIES).forEach(k => { if (D.ENEMIES[k].stageDisplay && /Rookie/.test(D.ENEMIES[k].stageDisplay) && !D.ENEMIES[k].boss) wave.rates[k] = 1; });

/* even fight: barely moves */
let sim = newSim(); sim._skirT = 1e9; D.WAR.wobble = 0;
let host = sim.players[0];
for (let i = 0; i < 120; i++) { sim.time += 1; sim._updateWar(1, wave, host); }
ok(W.cellOwner(f.cx, f.cy) === f.a, "two biomes at equal strength hold their lines");

/* the defender's dead at the front: it gives way */
W.reset(7); W.setTime(100); sim = newSim(); sim._skirT = 1e9; host = sim.players[0];
let t0 = sim.time, fell = null;
for (let i = 0; i < 300 && fell == null; i++) {
  if (i % 8 === 0) sim._warLossOf({ x: (f.cx + 0.5) * span, y: (f.cy + 0.5) * span, war: f.a, type: "x" });
  sim.time += 1; sim._updateWar(1, wave, host);
  if (W.cellOwner(f.cx, f.cy) === f.b) fell = sim.time - t0;
}
ok(fell != null && fell < 120, "thin out one side at the front and the other side pushes in (cell fell after " + fell + " s)");
ok(W.biomeAt((f.cx + 0.5) * span, (f.cy + 0.5) * span).id === f.b && W.materialAt(tx0, ty0) === mat0, "the conquered ground now belongs to the winner, but the land keeps its shape");
const terr = W.territoryString();
ok(terr.indexOf(f.cx + "," + f.cy + "," + f.b) >= 0, "the change goes out as a short territory string (" + terr.length + " chars)");

/* a fallen lord: its country caves in fast */
W.reset(7); W.setTime(100); sim = newSim(); sim._skirT = 1e9; host = sim.players[0];
let flips = 0; const ev = []; const emit0 = sim.emit.bind(sim); sim.emit = e => { ev.push(e); return emit0(e); };
sim._warLossOf({ x: (f.cx + 0.5) * span + 2000, y: (f.cy + 0.5) * span, lord: true, lairBiome: f.a, type: "x" });
for (let i = 0; i < 90; i++) { sim.time += 1; sim._updateWar(1, wave, host); }
flips = ev.filter(e => e.type === "war.flip" && e.from === f.a).length;
ok(ev.some(e => e.type === "war.lord") && flips >= 4 && flips <= 45, "when its lord falls, a biome loses ground on every front near you (" + flips + " cells in 90 s)");

/* seasons: Freezeland's winter */
const S = D.WAR.season;
ok(S.snow.winter > 1 && S.volcano.summer > 1 && S.swamp.fall > 1, "each biome fights hardest in its own season");

/* skirmish */
W.reset(7); W.setTime(100); sim = newSim(); host = sim.players[0]; sim._spawnsOpen = () => true;
sim._front = {}; sim._skirT = 1e9; sim._updateWar(1, wave, host);
sim._skirT = 0; ev.length = 0; sim.emit = e => { ev.push(e); return emit0(e); };
D.WAR.skirmishNear = [0, 99999];
sim._updateSkirmish(1, wave, host);
const units = sim.enemies.filter(e => e.war);
const sides = [...new Set(units.map(e => e.war))];
ok(units.length >= 4 && sides.length === 2 && ev.some(e => e.type === "war.skirmish"), "a skirmish puts a squad of each side at the front (" + units.length + " Digimon, " + sides.join(" vs ") + ")");
host.x = host.mx = 1e6; host.y = host.my = 1e6;
const u = units[0], foe = sim._warAct(u, 1e12, 0.1);
ok(foe && foe.war && foe.war !== u.war, "a soldier goes for the other side, not for you");
ok(sim._warAct(units[1], 100 * 100, 0.1) === null && units[1].warAngry, "but come close and it turns on you");
units[2].warHit = false; sim.hurtEnemy(units[2], 1, 1, 0, 0, { id: host.id }, 1);
ok(sim._warAct(units[2], 1e12, 0.1) === null, "and so does one you hit");
const before = (sim._warDead || []).length; sim._killEnemy(units[3], { id: host.id });
ok((sim._warDead || []).length === before + 1 && sim._warDead[sim._warDead.length - 1].side === units[3].war, "killing a soldier counts against its side at the front");

/* reset */
W.setOwner(f.cx, f.cy, f.b); W.reset(7);
ok(W.cellOwner(f.cx, f.cy) === f.a && W.territoryString() === "", "every run starts again from the native map");
/* a guest's world follows the host's string */
W.applyTerritory(f.cx + "," + f.cy + "," + f.b);
ok(W.cellOwner(f.cx, f.cy) === f.b, "a guest's world follows the host's territory");

console.log(failed ? failed + " failed" : "all passed");
process.exit(failed ? 1 : 0);
