/* node scripts/brawl-terrain-test.js : a PvP brawl called next to cliffs and water (Nov 21).
 * Players found their Digimon ran straight down the screen and stuck, as if Down were held: the
 * fighter was teleported off a cliff to the nearest walkable spot (outside the arena) and clamped
 * back in, every tick. Now the arena goes on clear ground, nobody moves unless steered, and
 * steering works every way. Uses the real world.js. */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
global.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {} }), width: 0, height: 0 }) };
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "day-clock", "seasons", "weather", "biomes"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
D.sprites = Object.assign(D.sprites || {}, { colors: {}, SCALE: 3, TILE: 48 });
require(path.join(root, "js/world.js"));
const W = D.world, T = 48, M = W.MAT;
const { BrawlSim } = require(path.join(root, "js/net/brawl-sim.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
W.reset(7); W.setTime(100);
/* spots right beside a cliff or water */
const spots = [];
for (let y = -120; y <= 120 && spots.length < 25; y += 3) for (let x = -120; x <= 120 && spots.length < 25; x += 3) {
  const px = (x + 0.5) * T, py = (y + 0.5) * T;
  if (W.isRaised(px, py, 10)) continue;
  let near = 0; for (let j = -3; j <= 3; j++) for (let i = -4; i <= 4; i++) { const m = W.materialAt(x + i, y + j); if (m === M.CLIFF || m === M.WATER) near++; }
  if (near > 12) spots.push({ x: px, y: py });
}
ok(spots.length >= 15, spots.length + " brawl spots right beside cliffs or water");
let drift = 0, clear = 0, steer = 0, steerTries = 0, onBad = 0;
for (const s of spots) {
  const B = new BrawlSim({ data: D, rng: () => 0.5 });
  B.begin({ origin: s, players: [{ id: "a", form: "agumon", hp: 50, maxHp: 50, alive: true, fighting: true, hasTamer: true }, { id: "b", form: "gabumon", hp: 50, maxHp: 50, alive: true, fighting: true, hasTamer: true }], aliveProvided: true, seed: 3 });
  B.startFight();
  const m = B.match, a = m.fighters[0];
  if (D.net.brawl.arenaBlocked && D.net.brawl.arenaBlocked(W, m.origin, B.arenaSize()) === 0) clear++;
  /* no input for 3 seconds: it only ever heads for its opponent (it fights by itself), never off
   * to an edge of the arena the way the stuck "Down held" fighter did */
  const b0 = m.fighters[1], d0 = Math.hypot(a.x - b0.x, a.y - b0.y), size = B.arenaSize();
  let edge = false;
  for (let t = 0; t < 75; t++) {
    B.pushInput("a", { x: 0, y: 0 }); B.pushInput("b", { x: 0, y: 0 }); B.tick(1 / 25);
    if (Math.abs(a.y - m.origin.y) > size.h / 2 - 30 && Math.abs(b0.y - m.origin.y) < size.h / 2 - 90) edge = true;
  }
  if (edge || Math.hypot(a.x - b0.x, a.y - b0.y) > d0 + 30) drift++;
  /* each direction moves it that way (unless a wall is right there) */
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const bx = a.x, by = a.y;
    for (let t = 0; t < 10; t++) { B.pushInput("a", { x: dx, y: dy }); B.tick(1 / 25); }
    steerTries++;
    if ((a.x - bx) * dx + (a.y - by) * dy > 5 || W.isRaised(bx + dx * 30, by + dy * 30, 10)) steer++;
    if (W.isRaised(a.x, a.y, 4)) onBad++;
  }
}
ok(drift === 0, "with no input, a fighter only closes on its opponent, never runs off to an edge (" + drift + " of " + spots.length + " did)");
ok(steer === steerTries, "steering left/right/up/down always goes that way (" + steer + "/" + steerTries + ")");
ok(onBad === 0, "no fighter ends up on a cliff or in water (" + onBad + ")");
ok(clear >= spots.length * 0.9, "the arena is put on clear ground (" + clear + "/" + spots.length + ")");
/* it fights by itself; a click picks a target or a spot to move to */
{
  const B = new BrawlSim({ data: D, rng: () => 0.5 });
  const s0 = W.nearestWalkable(0, 0, 600, 10, 0);
  B.begin({ origin: s0, players: [{ id: "a", form: "agumon", hp: 50, maxHp: 50, alive: true, fighting: true, hasTamer: true }, { id: "b", form: "gabumon", hp: 50, maxHp: 50, alive: true, fighting: true, hasTamer: true }, { id: "c", form: "patamon", hp: 50, maxHp: 50, alive: true, fighting: true, hasTamer: true }], aliveProvided: true, seed: 3 });
  B.startFight();
  const m = B.match, [a, b, c] = m.fighters, hp0 = b.hp + c.hp;
  for (let t = 0; t < 100; t++) { for (const id of ["a", "b", "c"]) B.pushInput(id, { x: 0, y: 0 }); B.tick(1 / 25); }
  ok(b.hp + c.hp < hp0 || a.hp < 50, "with nobody pressing anything, they fight by themselves");
  B.pushInput("a", { x: 0, y: 0, tgt: "c" }); B.tick(1 / 25);
  ok(a.tgtId === "c", "clicking a fighter makes it the target");
  const gx = m.origin.x + 150, gy = m.origin.y + 80;
  B.pushInput("a", { x: 0, y: 0, go: [gx, gy] });
  for (let t = 0; t < 50; t++) { B.tick(1 / 25); B.pushInput("a", { x: 0, y: 0 }); }
  ok(Math.hypot(a.x - gx, a.y - gy) < 60 || W.isRaised(gx, gy, 10), "clicking open ground moves it there (" + Math.round(Math.hypot(a.x - gx, a.y - gy)) + " px off)");
}
console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
