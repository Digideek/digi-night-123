/* node scripts/lord-test.js : one lord per lair, native, asleep until approached, growing by the year, gone when beaten */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "biomes"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) { console.log("load " + f + ": " + e.message); } });
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
function mk(time) {
  const sim = new mission.MissionSim({ seed: 31, hz: auth.TICK_HZ, data: D }); new auth.Authority({ sim: sim, seed: 31 });
  sim.phase = "playing"; sim.time = time;
  if (!sim.players[0]) { sim.players.push({ id: "local" }); sim.localId = "local"; }
  const p = sim.players[0];
  Object.assign(p, { form: "greymon", hp: 300, maxHp: 300, x: 0, y: 0, mx: 0, my: 0, faint: 0, downed: false, hasTamer: true, kind: "human" });
  D.world = { lairsNear: (x, y, r) => [{ key: "3:4", x: 1000, y: 0, biome: "snow" }].filter(l => Math.hypot(l.x - x, l.y - y) <= r), biomeAt: () => D.biomes.DEFS.plains };
  sim.data.world = D.world;
  return { sim, p };
}
let y1hp;
(function () {
  const { sim, p } = mk(100);
  sim._updateLords(2, p);
  let lords = sim.enemies.filter(e => e.lord);
  ok(lords.length === 1, "a lord appears while its lair is still off-screen");
  const e = lords[0]; y1hp = e.maxHp;
  ok(D.biomes.homeOf(e.type) === "snow" && /Champion/.test(D.ENEMIES[e.type].stageDisplay), "Year 1: a Freezeland Champion (" + D.ENEMIES[e.type].name + ", " + Math.round(e.maxHp) + " HP)");
  sim.lordT = 0; sim._updateLords(2, p);
  ok(sim.enemies.filter(x => x.lord).length === 1, "only ever one per lair");
  for (let i = 0; i < 250; i++) { sim.time += 0.04; sim._updateEnemies(0.04); }
  ok(Math.hypot(e.x - 1000, e.y) <= D.LORD.wander + 10 && !sim.packs[e.pack].awake, "ten seconds on it has not left its stones");
  p.x = p.mx = 1000 - 200; 
  for (let i = 0; i < 40; i++) { sim.time += 0.04; sim._updateEnemies(0.04); }
  ok(sim.packs[e.pack].awake && e.x < 1000 - 5, "walk up to it and it comes for you");
  sim.orbs.length = 0; sim._killEnemy(e, p);
  ok(sim.lairs["3:4"] === "dead" && sim.orbs.length >= D.LORD.xpOrbs, "beaten: " + sim.orbs.length + " drops, and the lair is empty");
  sim.enemies = sim.enemies.filter(x => !x.dead); sim.lordT = 0; sim._updateLords(2, p);
  ok(sim.enemies.filter(x => x.lord).length === 0, "it does not come back this run");
})();
(function () {
  const a = mk(1440 + 50), b = mk(2880 + 50);
  a.sim._updateLords(2, a.p); b.sim._updateLords(2, b.p);
  const e2 = a.sim.enemies.find(e => e.lord), e3 = b.sim.enemies.find(e => e.lord);
  ok(e2 && /Perfect/.test(D.ENEMIES[e2.type].stageDisplay), "Year 2: an Ultimate (" + D.ENEMIES[e2.type].name + ", " + Math.round(e2.maxHp) + " HP)");
  ok(e3 && D.biomes.homeOf(e3.type) === "snow", "Year 3: " + D.ENEMIES[e3.type].name + " (" + D.ENEMIES[e3.type].stageDisplay + ", " + Math.round(e3.maxHp) + " HP)");
  ok(e2.maxHp > y1hp && e3.maxHp > e2.maxHp && e3.dmgMul > e2.dmgMul, "tougher and harder-hitting every year");
})();
console.log(failed ? "lord-test: " + failed + " failed" : "lord-test: all passed");
process.exit(failed ? 1 : 0);
