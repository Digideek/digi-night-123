/* node scripts/pvp-realtime-test.js : real-time PvP on the map (Nov 21). With both flags up the two
 * partners go for each other by themselves like they would a wild Digimon and trade hits; with a
 * flag down they leave each other alone; clicking the other's partner orders the attack. */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "weather", "seasons", "biomes"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
const mission = require(path.join(root, "js/net/mission-sim.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }

function pair(flags) {
  const sim = new mission.MissionSim({ seed: 5, hz: 30, data: D });
  sim.phase = "playing"; sim.time = 200; sim.coop = true; sim.enemies.length = 0;
  sim._updateSpawns = () => {}; if (sim._updateNests) sim._updateNests = () => {}; if (sim._updateRival) sim._updateRival = () => {};
  const base = { form: "agumon", level: 8, hp: 300, maxHp: 300, faint: 0, downed: false, hasTamer: true, kind: "human", tamerHp: 100, tamerMaxHp: 100, bits: 50, monInvuln: 0, tamerInvuln: 0, weapons: [{ id: "pepperBreath", level: 3, cd: 0 }] };
  sim.players.length = 0;
  const a = Object.assign({ id: "a", x: 0, y: 0, mx: 20, my: 0 }, base), b = Object.assign({ id: "b", x: 300, y: 0, mx: 280, my: 0 }, base, { form: "gabumon", weapons: [{ id: "pepperBreath", level: 3, cd: 0 }] });
  a.pvpFlag = b.pvpFlag = !!flags;
  sim.players.push(a, b); sim.localId = "a";
  sim.inputs = sim.inputs || {}; sim.inputs.a = sim.inputs.a || []; sim.inputs.b = sim.inputs.b || [];
  return { sim, a, b };
}
function run(w, secs) {
  let minD = 1e9;
  for (let t = 0; t < secs * 30; t++) {
    w.sim.pushInput({ type: "input", id: "a", inputs: [{ seq: t, x: 0, y: 0 }] });
    w.sim.pushInput({ type: "input", id: "b", inputs: [{ seq: t, x: 0, y: 0 }] });
    w.sim.step();
    if (w.a.atFarm || w.b.atFarm) break;
    minD = Math.min(minD, Math.hypot(w.a.mx - w.b.mx, w.a.my - w.b.my));
  }
  return minD;
}
let w = pair(true);
const d0 = Math.hypot(w.a.mx - w.b.mx, w.a.my - w.b.my), h0 = w.a.hp + w.b.hp;
const dMin = run(w, 6);
ok(dMin < d0 - 60, "flags up: the partners run at each other on their own (" + Math.round(d0) + " px apart -> " + Math.round(dMin) + ")");
ok(w.a.hp + w.b.hp < h0 || w.a.atFarm || w.b.atFarm, "and trade hits (" + Math.round(h0) + " HP between them -> " + Math.round(w.a.hp + w.b.hp) + ")");
w = pair(false);
const h1 = w.a.hp + w.b.hp; run(w, 6);
ok(w.a.hp + w.b.hp >= h1 - 0.01, "flags down: they leave each other alone");
w = pair(true); w.b.mx = 600; w.b.x = 640;
w.sim.pushInput({ type: "input", id: "a", inputs: [{ seq: 1, x: 0, y: 0, pvp: "b" }] });
ok(w.a.pvpFocus === "b", "clicking the other tamer's partner orders the attack");
/* WASD walks the TAMER during a PvP fight; the Digimon keeps fighting by itself */
w = pair(true);
const tx0 = w.a.x, bHp = w.b.hp;
for (let t = 0; t < 30 * 4; t++) {
  w.sim.pushInput({ type: "input", id: "a", inputs: [{ seq: t, x: -1, y: 0 }] });
  w.sim.pushInput({ type: "input", id: "b", inputs: [{ seq: t, x: 0, y: 0 }] });
  w.sim.step();
  if (w.b.atFarm) break;
}
ok(w.a.x < tx0 - 100, "holding a direction moves your tamer (" + Math.round(tx0 - w.a.x) + " px)");
ok(w.b.hp < bHp || w.b.atFarm, "while your Digimon goes on fighting theirs by itself");
ok(D.BRAWL_OFF === true, "no brawl screen: PvP is only ever this, out on the map");
console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
