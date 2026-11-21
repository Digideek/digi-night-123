/* node scripts/balance-test.js : stats grow a hair each base level, spent points are what count, and enemies follow the clock */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
const RO = require(path.join(root, "js/ro-stats.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const sum = b => RO.ORDER.reduce((s, k) => s + b[k], 0);
const g7 = RO.levelBonus(7, "ice"), g1 = RO.levelBonus(1, "ice");
ok(sum(g1) === 0 && sum(g7) === 6 && g7.int === 2 && g7.vit === 1 && g7.dex === 2 && g7.luk === 1, "each base level adds one stat by itself, in a fixed pattern (ice by level 7: " + JSON.stringify(g7) + ")");
ok(RO.levelBonus(13, "beast").str > RO.levelBonus(13, "beast").int, "the pattern follows the element (a beast grows STR, not INT)");
ok(RO.jobBonus(2, "fire", 7).str === RO.jobBonus(2, "fire").str + RO.levelBonus(7, "fire").str, "it stacks with what digivolving brings");
/* spent points against unspent, at base level 18 */
function mulAt(bl, spend) {
  let pts = 0, a = RO.fresh(); for (let L = 1; L < bl; L++) pts += RO.pointsFor(L);
  while (spend && pts >= RO.cost(a.int)) { pts -= RO.cost(a.int); a.int++; }
  return RO.derive(RO.plus(a, RO.levelBonus(bl, "ice")), bl).specMul;
}
const sp = mulAt(18, true), un = mulAt(18, false);
ok(sp > un * 1.8, "at base level 18 a spent build hits " + sp.toFixed(2) + "x, an unspent one " + un.toFixed(2) + "x");
/* enemy health follows the clock, not the player */
function hpAt(min, type, boss) {
  const sim = new mission.MissionSim({ seed: 2, hz: auth.TICK_HZ, data: D }); new auth.Authority({ sim: sim, seed: 2 });
  sim.phase = "playing"; sim.time = min * 60; if (!sim.players[0]) { sim.players.push({ id: "local", x: 0, y: 0 }); sim.localId = "local"; }
  const e = sim.spawnEnemy(type, { x: 3000, y: 0, keepType: true, boss: !!boss }); return e.maxHp;
}
const kind = Object.keys(D.ENEMIES).find(k => D.ENEMIES[k].stageDisplay === "Adult (Champion)" && !D.ENEMIES[k].boss);
ok(hpAt(32, kind) > hpAt(15, kind) * 1.3 && hpAt(15, kind) > hpAt(4, kind) * 1.2, "the same Champion has " + Math.round(hpAt(4, kind)) + " HP at 4 min, " + Math.round(hpAt(15, kind)) + " at 15, " + Math.round(hpAt(32, kind)) + " at 32");
ok(hpAt(32, kind, true) > hpAt(15, kind, true) * 1.3, "bosses grow with the clock too");
const st = id => D.ENEMIES[id].stageDisplay || "";
const w = D.stageWave(20 * 60, 0, 7);
ok(Object.keys(w.rates).some(k => /Champion|Ultimate/.test(st(k))), "a partner that never digivolved still meets Champions at minute 20: the field does not wait");
console.log(failed ? "balance-test: " + failed + " failed" : "balance-test: all passed");
process.exit(failed ? 1 : 0);
