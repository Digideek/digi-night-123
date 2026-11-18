/* node scripts/ally-region-test.js : regional spawns, and the caught ally (attack pace, levels, straight-line digivolution, passive, DNA absorb) */
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
function fresh() {
  const sim = new mission.MissionSim({ seed: 21, hz: auth.TICK_HZ, data: D }), a = new auth.Authority({ sim: sim, seed: 21 });
  sim.phase = "playing"; sim.time = 400;
  if (!sim.players[0]) { sim.players.push({ id: "local" }); sim.localId = "local"; }
  const p = sim.players[0];
  Object.assign(p, { form: "exveemon", level: 20, formSince: 0, hp: 200, maxHp: 200, x: 0, y: 0, mx: 0, my: 0, faint: 0, downed: false, hasTamer: true, kind: "human", weapons: [{ id: "veeLaser", level: 1, cd: 0 }] });
  return { sim, a, p };
}
/* ---- regions ---- */
(function () {
  const { sim } = fresh(), B = D.biomes;
  ok(B.homeOf("garurumon") === "snow" && B.homeOf("punimon") === "snow", "Garurumon and its Baby live in Freezeland");
  ok(B.homeOf("guardromon") === "circuit" && B.homeOf("devimon") === "glitch" && B.homeOf("palmon") === "forest", "machines, dark types and plants have their own country");
  let here = "snow";
  D.world = { biomeAt: () => B.DEFS[here] }; sim.data.world = D.world;
  const rookies = Object.keys(D.ENEMIES).filter(k => /Rookie/.test(D.ENEMIES[k].stageDisplay) && !D.ENEMIES[k].boss && B.homeOf(k) !== "snow");
  let nat = 0; const N = 600, seen = {};
  for (let i = 0; i < N; i++) { const e = sim.spawnEnemy(rookies[i % rookies.length], {}); if (B.homeOf(e.type) === "snow") { nat++; seen[e.type] = 1; } if (!/Rookie/.test(D.ENEMIES[e.type].stageDisplay)) failed++; }
  ok(nat / N > 0.6 && nat / N < 0.8, Math.round(100 * nat / N) + "% of Rookie spawns in Freezeland are locals (" + Object.keys(seen).join(", ") + ")");
  sim.enemies.length = 0; here = "circuit"; let gar = 0;
  for (let i = 0; i < 300; i++) { const e = sim.spawnEnemy("garurumon", {}); if (e.type === "garurumon") gar++; }
  ok(gar > 40 && gar < 150, "elsewhere a Garurumon still wanders in sometimes (" + gar + " of 300 kept)");
  sim.enemies.length = 0; here = "snow"; gar = 0;
  for (let i = 0; i < 100; i++) { const e = sim.spawnEnemy("garurumon", {}); if (e.type === "garurumon") gar++; }
  ok(gar === 100, "at home it is never swapped out");
  const boss = sim.spawnEnemy(rookies[0], { boss: true });
  ok(boss.type === rookies[0], "bosses are not swapped");
  delete D.world; delete sim.data.world;
})();
/* ---- ally ---- */
(function () {
  const { sim, a, p } = fresh(), P = a.progression, A = D.ALLY;
  P._joinCaptured(p, sim, "wormmon");
  const al = sim.ally;
  ok(al && al.form === "wormmon" && al.level === 1 && al.passive === "nature", "a caught Wormmon joins at Lv 1 with the Nature passive");
  const hp0 = p.maxHp; sim._stats(p); sim._updateBurst(p, 0.04);
  ok(p.maxHp === Math.round(hp0 * 1.12), "Nature passive: +12% max health (" + hp0 + " to " + p.maxHp + ")");
  /* attack pace */
  const foe = sim.spawnEnemy(Object.keys(D.ENEMIES)[0], { x: 40, y: 0, keepType: true }); foe.hp = foe.maxHp = 1e6;
  al.x = 0; al.y = 0; let shots = 0, last = sim.bullets.length + sim.arcs.length;
  for (let i = 0; i < 25 * 30; i++) { sim.step ? null : null; al.atkT -= 0.04; if (al.atkT <= 0) { al.weapon.cd = 0; sim._fireFrom(al, 0.04, al.x, al.y, foe, al.weapon); al.atkT = A.attackEvery; shots++; } }
  ok(shots >= 4 && shots <= 5, "about one attack every 7 seconds (" + shots + " in 30 s)");
  sim.bullets.length = 0; al.weapon.cd = 0; sim._fireFrom(al, 0.04, 0, 0, foe, al.weapon);
  const allyDmg = sim.bullets[0] ? sim.bullets[0].damage : 0, base = D.WEAPONS[al.weapon.id].levels[0].damage;
  ok(Math.abs(allyDmg - base * A.damageMul) < 0.01, "at 60% damage (" + allyDmg.toFixed(1) + " against " + base + ")");
  /* levels and the straight line */
  let evos = [];
  for (let i = 0; i < 4000 && al.form !== "dinobeemon"; i++) { const f0 = al.form; sim._allyGain(40); if (al.form !== f0) evos.push(al.form + "@Lv" + al.level); }
  ok(evos.join(" > ") === "stingmon@Lv12 > dinobeemon@Lv20", "it digivolves down its standard line only: " + evos.join(" > "));
  /* DNA with the ally */
  sim.ally.form = "stingmon"; sim._allyKit(sim.ally, false); sim.ally.x = 10; sim.ally.y = 0;
  P._joinCaptured(p, sim, "gabumon");
  ok(p.reserve && p.reserve.length === 1, "a second catch waits in reserve");
  p.level = 5;
  let r = a.act({ type: "dna.ask", id: p.id, to: "paildramon" });
  ok(!r.ok && r.reason === "gate", "the level gate still applies");
  p.level = 20;
  r = a.act({ type: "dna.ask", id: p.id, to: "paildramon" });
  ok(r.ok && p.form === "paildramon", "ExVeemon + ally Stingmon: Paildramon, no teammate needed");
  ok(p.passives.length === 1 && p.passives[0] === "nature", "the ally's passive stays with the partner");
  ok(sim.ally && sim.ally.form === "gabumon" && sim.ally.passive === "ice", "the reserve Digimon steps up, with its own passive");
  const st = sim._stats(p);
  ok(Math.abs(st.allyMaxHp - 1.12) < 1e-9 && st.cooldownMul < 1, "both passives are working (kept Nature, Gabumon's Ice)");
  sim.ally = null; p._statsKey = null;
  ok(Math.abs(sim._stats(p).allyMaxHp - 1.12) < 1e-9, "the kept one does not need an ally out");
})();
console.log(failed ? "ally-region-test: " + failed + " failed" : "ally-region-test: all passed");
process.exit(failed ? 1 : 0);
