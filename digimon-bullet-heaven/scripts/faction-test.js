/* node scripts/faction-test.js : faction trust (Nov 20). Kill a biome's enemies at its border and it
 * trusts you; a trusted biome leaves you be and your attacks pass over it unless you click one; at full
 * trust its Digimon rally to you and fight for you; hit it and trust drains; unused trust fades. */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
global.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {} }), width: 0, height: 0 }) };
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "day-clock", "seasons", "weather", "biomes"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
D.sprites = Object.assign(D.sprites || {}, { colors: {}, SCALE: 3, TILE: 48 });
require(path.join(root, "js/world.js"));
const W = D.world, F = D.FACTIONS, span = W.TERR * 48;
const mission = require(path.join(root, "js/net/mission-sim.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }

W.reset(7); W.setTime(100);
let f = null;
for (let r = 4; r < 60 && !f; r++) for (let cy = -r; cy <= r && !f; cy++) for (let cx = -r; cx <= r && !f; cx++) {
  const a = W.cellOwner(cx, cy), b = W.cellOwner(cx + 1, cy);
  if (a !== b && W.cellOwner(cx - 1, cy) === a) f = { cx, cy, a, b };
}
const sim = new mission.MissionSim({ seed: 7, hz: 30, data: D });
sim.phase = "playing"; sim.time = 100;
if (!sim.players[0]) { sim.players.push({ id: "local" }); sim.localId = "local"; }
const p = sim.players[0];
const bx = (f.cx + 1) * span, by = (f.cy + 0.5) * span;
Object.assign(p, { form: "agumon", level: 5, hp: 100, maxHp: 100, x: bx, y: by + 120, mx: bx, my: by + 120, faint: 0, downed: false, hasTamer: true, kind: "human", tamerHp: 100 });
sim.enemies.length = 0;
const typeOf = side => Object.keys(D.ENEMIES).find(k => !D.ENEMIES[k].boss && D.biomes.homeOf(k) === side) || Object.keys(D.ENEMIES)[0];
function mk(side, x, y) { const e = sim.spawnEnemy(typeOf(side), { x, y, keepType: true }); e.fac = side; return e; }

/* fight for side b at the border: kill side a's Digimon there */
for (let i = 0; i < 7; i++) { const e = mk(f.a, bx - 40, by); sim._killEnemy(e, { id: p.id }); }
ok(sim._trustOf(p, f.b) >= F.trusted && sim._trustOf(p, f.a) === 0, "kill " + f.a + "'s Digimon at the border and " + f.b + " trusts you (" + sim._trustOf(p, f.b) + ")");

const friend = mk(f.b, p.mx + 30, p.my), foe = mk(f.a, p.mx + 60, p.my);
sim._actor = p;
ok(sim._nearestEnemy(p.mx, p.my) === foe, "your partner passes over the trusted biome and goes for the other");
sim._actor = null;
const hp0 = friend.hp;
ok(sim.hurtEnemy(friend, 10, 1, 0, 0, { id: p.id }, 1) === false && friend.hp === hp0, "your blasts don't hurt a biome that trusts you");
p.focusId = friend._id;
const t0 = sim._trustOf(p, f.b);
sim.hurtEnemy(friend, 1, 1, 0, 0, { id: p.id }, 1);
ok(friend.hp < hp0 && sim._trustOf(p, f.b) < t0, "click one to attack it on purpose: that hits, and costs trust");
p.focusId = null;

/* a trusted biome doesn't bite (win back what the click cost first) */
sim._trustAdd(p, f.b, 10);
friend.x = p.x; friend.y = p.y; friend.hitCd = 0; friend.hitCdM = 0; p.mx = p.x; p.my = p.y;
const th = p.tamerHp, mh = p.hp;
sim._contactHits(friend, D.ENEMIES[friend.type] || {}, 10, 0.1);
ok(p.tamerHp === th && p.hp === mh, "standing right next to it, it leaves you and your partner alone (trust " + sim._trustOf(p, f.b) + ", hp " + mh + "→" + p.hp + ")");

/* full trust: they rally */
for (let i = 0; i < 12; i++) { const e = mk(f.a, bx - 40, by); sim._killEnemy(e, { id: p.id }); }
ok(p.allied && p.allied[f.b], f.b + " fights at your side at full trust (" + sim._trustOf(p, f.b) + ")");
for (let i = 0; i < 4; i++) mk(f.b, p.x + 100 + i * 30, p.y);
sim._facT = 0; sim._updateFactions(0.1);
const helpers = sim.enemies.filter(e => e.rally === p.id && !e.dead);
ok(helpers.length === F.rallyCap, helpers.length + " of its Digimon rally to you (at most " + F.rallyCap + ")");
const tgt = sim._rallyAct(helpers[0], 0.1);
ok(tgt && tgt.fac === f.a, "a rallied Digimon goes for what is hostile to you");

/* two at once, and switching sides */
sim._trustAdd(p, f.a, 60);
ok(sim._trusts(p, f.a) && sim._trusts(p, f.b), "two biomes can trust you at once");
for (let i = 0; i < 6; i++) { const e = mk(f.a, bx - 40, by); sim._killEnemy(e, { id: p.id }); }
ok(!sim._trusts(p, f.a), "turn on a biome and its trust drains until it is hostile again");

/* fading */
const tf = sim._trustOf(p, f.b);
sim.time += F.fadeAfter + 40; sim._facT = 0; sim._updateFactions(1);
ok(sim._trustOf(p, f.b) < tf, "trust you stop earning fades (" + tf + " → " + sim._trustOf(p, f.b) + ")");
ok(sim._factionOf({ type: typeOf(f.a), virus: {} }) === null && sim._factionOf({ type: "x", rival: true }) === null, "infected Digimon and the rival belong to nobody: always hostile");

console.log(failed ? failed + " failed" : "all passed");
process.exit(failed ? 1 : 0);
