/* node scripts/puddle-terrain-test.js : rain puddles never cover a cliff, the wall below one, or
 * water (Nov 21), so they can't read as a ramp up a plateau or a bridge over a river; and walking
 * is exactly the same wet or dry. Uses the real world.js. */
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
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const SPILL = W.PUD_SPILL || 1.3;
function blockedAt(x, y) {
  const tx = Math.floor(x / T), ty = Math.floor(y / T), m = W.materialAt(tx, ty);
  return m === M.CLIFF || m === M.WATER || W.materialAt(tx, ty - 1) === M.CLIFF;
}
let total = 0, bad = 0, ponds = 0, nearEdge = 0;
for (const seed of [7, 21, 99]) {
  W.reset(seed); W.setTime(100); W.setSoak(1);
  const list = W.puddlesIn(-6000, -6000, 6000, 6000);
  for (const p of list) {
    total++; if (p.pond) ponds++;
    let hit = false;
    for (let a = 0; a < 64 && !hit; a++) for (const f of [0.5, 0.8, 1, SPILL]) {
      const th = a / 64 * Math.PI * 2, x = p.x + Math.cos(th) * p.r * f, y = p.y + Math.sin(th) * p.r * 0.62 * f;
      if (blockedAt(x, y)) { hit = true; break; }
    }
    if (hit) bad++;
    /* is it sitting near rough ground at all? (so the test means something) */
    for (let a = 0; a < 16; a++) { const th = a / 16 * Math.PI * 2; if (blockedAt(p.x + Math.cos(th) * (p.r * SPILL + 40), p.y + Math.sin(th) * (p.r * SPILL + 40) * 0.62)) { nearEdge++; break; } }
  }
}
ok(total > 200, total + " puddles and ponds on three maps (" + ponds + " ponds), " + nearEdge + " of them right by a cliff or water");
ok(bad === 0, "none of them, rim and soaked edge included, touches a cliff, a cliff wall or water (" + bad + ")");

/* walking is the same wet or dry */
W.reset(7); W.setTime(100);
const pts = []; for (let i = 0; i < 4000; i++) pts.push([(Math.sin(i * 12.9898) * 43758.5453 % 1) * 9000, (Math.sin(i * 78.233) * 12345.678 % 1) * 9000]);
W.setSoak(0); const dry = pts.map(([x, y]) => W.isRaised(x, y, 8, 0));
W.setSoak(1); const wet = pts.map(([x, y]) => W.isRaised(x, y, 8, 0));
ok(dry.every((v, i) => v === wet[i]), "puddles never change where you can walk (4000 spots, wet vs dry)");
console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
