/* node scripts/duel-test.js : Duel (17z33): your Hatchery Digimon as it is, straight into the arena, nothing lost, nothing levelled */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
global.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {} }), width: 0, height: 0 }) };
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "day-clock", "seasons", "weather", "biomes"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
D.sprites = Object.assign(D.sprites || {}, { colors: {}, SCALE: 3, TILE: 48 });
require(path.join(root, "js/world.js"));
const W = D.world;
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
let failed = 0;
const VS = D.VERSUS;
function newDuel(specs) {
  W.reset(11); W.setTime(0);
  const sim = new mission.MissionSim({ seed: 11, hz: auth.TICK_HZ, data: D });
  const A = new auth.Authority({ sim: sim, seed: 11 });
  sim.runMode = "duel"; sim.phase = "playing"; sim.time = 0; sim.localId = "local"; sim.skillTree = true;
  specs.forEach((d, i) => A.join({ id: i ? "g" + i : "local", kind: i ? "client" : "host-client", hasTamer: true, form: "digitama_agumon", duel: d, x: i * 200, y: 0, hp: 100, maxHp: 100, level: 1, xp: 0, xpNext: sim._xpNeeded(1), weapons: [] }));
  sim.coop = true; sim._auth = A;
  const evs = []; const e0 = sim.emit.bind(sim); sim.emit = e => { evs.push(e); return e0(e); }; sim._evs = evs;
  return sim;
}
const of = (sim, t) => sim._evs.filter(e => e.type === t);
function run(sim, sec) { const n = Math.round(sec * sim.hz); for (let i = 0; i < n; i++) sim._auth.step(); }
ok(D.MODES.list.some(m => m.id === "duel" && m.group === "versus" && m.online), "Duel is a mode, under Versus, online");
let sim = newDuel([{ form: "greymon", level: 14, blood: { gen: 3, traits: { str: 2, power: 1 } } }, null, { form: "wargreymon", level: 40 }]);
run(sim, 0.3);
const [A, B, C] = sim.players;
ok(sim.vs && sim.vs.phase === "showdown", "no race: straight into the arena");
ok(A.form === "greymon" && A.level === 14 && A.blood && A.blood.gen === 3 && A.blood.traits.str === 2, "your Hatchery Digimon as it is: Greymon, job level 14, its bloodline");
ok(A.weapons.length > 0 && Object.keys(A.skills).length > 0 && A.hp === A.maxHp, "with its moves learned and full health");
ok(B.form === VS.duel.fallback && B.level === VS.duel.fallbackLevel, "nothing hatched yet: " + VS.duel.fallback + " at Lv " + VS.duel.fallbackLevel);
ok(C.form === VS.duel.fallback, "and a Mega (which the Hatchery can't raise) isn't allowed in");
ok(of(sim, "evolve").length === 0 && of(sim, "hatch").length === 0, "quietly: no hatch or digivolve scenes");
ok(of(sim, "duel.ready").length === 3, "every screen hears each partner is ready");
/* it fights it out, best of three */
run(sim, VS.countdown + 0.5);
ok(sim._pvpFoes(A, B) && sim._pvpFoes(B, C), "after the countdown it's every partner for itself");
const lv = A.level;
sim._pvpKo(A, B); sim._pvpKo(A, C); run(sim, 0.2);
ok(sim.vs.wins[A.id] === 1, "knock the others out: the round is yours");
ok(A.level === lv && A.form === "greymon", "nothing is levelled or digivolved");
sim.vs.betweenT = 0.01; run(sim, 0.3); run(sim, VS.countdown + 0.3);
sim._pvpKo(A, B); sim._pvpKo(A, C); run(sim, 0.2);
ok(of(sim, "vs.end").length === 1 && of(sim, "vs.end")[0].winner === A.id, "two rounds: the match is won");
ok(!sim._vsMeterAdd(A, 50, false), "no DIGIVOLVE meter in a duel");
console.log(failed ? "\n" + failed + " FAILED" : "\nduel-test: all passed");
process.exit(failed ? 1 : 0);
