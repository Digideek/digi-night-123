/* node scripts/siege-boss-bench.js : how long a Night Siege boss takes (17z33). A partner built the way a player would
 * (each stage digivolved in turn, skill points into its own main move first, status points into INT and DEX)
 * fights that night's boss for 30 s; prints its hits, DPS, the boss's health and the time to kill. Not a test. */
const path = require("path"), root = require("path").join(__dirname, "..");
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
let failed = 0;


const CHAIN = ["botamon", "koromon", "agumon", "greymon", "metalgreymon", "wargreymon"];
function trial(upTo, job, base, night, giant, build) {
  W.reset(11); W.setTime(0);
  const sim = new mission.MissionSim({ seed: 11, hz: auth.TICK_HZ, data: D });
  const A = new auth.Authority({ sim: sim, seed: 11 });
  sim.runMode = "siege"; sim.phase = "playing"; sim.localId = "local"; sim.skillTree = !!(D.SKILLS && D.moveChain);
  const DL = D.SIEGE.dayLen; sim.time = DL * (night - 1) + DL * 0.62;
  A.join({ id: "local", kind: "host-client", hasTamer: true, form: "digitama_agumon", x: 0, y: 0, hp: 50, maxHp: 50, level: 1, xp: 0, xpNext: sim._xpNeeded(1), weapons: [] });
  const P = sim.players[0];
  for (let i = 0; i < 5; i++) A.step();
  /* digivolve along the line one stage at a time (each one counts), levelling between */
  const stop = CHAIN.indexOf(upTo);
  for (let c = 0; c <= stop; c++) {
    A.progression._applyForm(P, CHAIN[c], c ? "standard" : "hatch");
    const lvAt = Math.round(job * (c + 1) / (stop + 1));
    while (P.level < lvAt) { P.xp = (P.xp || 0) + P.xpNext; sim._tryLevel(P); }
    sim._duelSpend(P);                     /* the same build a Duel gives (versus-sim.js): main move, melee, then the rest */
  }
  /* base level from tamer XP; status points spent the way a player building this partner would */
  while ((P.tamerLevel || 1) < base) sim._tamerXp(P, sim._tamerNeed(P.tamerLevel || 1));
  const order = build === "spec" ? ["int", "int", "dex"] : (build === "phys" ? ["str", "str", "agi"] : ["int", "str", "dex"]);
  for (let k = 0; k < 400 && (P.statPoints || 0) > 0; k++) { const r = A.progression.act({ type: "stat.add", id: P.id, stat: order[k % order.length], n: 1 }); if (!r.ok) { if (!A.progression.act({ type: "stat.add", id: P.id, stat: "dex", n: 1 }).ok) break; } }
  sim._statsKey = null; P._statsKey = null; sim._stats(P);
  P.choosing = 0; sim.enemyFreeze = 0; P.monInvuln = 0;
  sim.enemies.length = 0;
  sim.siege = sim.siege || {}; sim.siege.nights = night - 1;
  let b;
  if (giant) b = sim._siegeGiant(night, 0);
  else { const bt = sim._siegeType(Math.min(D.SIEGE.stages.length, night + 1)); b = sim.spawnEnemy(bt, { keepType: true, boss: true, x: P.mx + 60, y: P.my }); sim._siegeToughen(b, night); b.hp = b.maxHp = sim._siegeBossHp(night); b.siege = night; }
  b.x = P.mx + 60; b.y = P.my;
  /* and an ordinary attacker of the night, for scale */
  const ot = sim._siegeType(night), o = sim.spawnEnemy(ot, { keepType: true, quiet: true, x: P.mx + 2000, y: P.my }); sim._siegeToughen(o, night); const oHp = o.maxHp; o.dead = true;
  const hp0 = b.maxHp; let t = 0, hits = 0, dmg = 0, maxHit = 0, crits = 0; const e0 = sim.emit.bind(sim); sim.emit = e => { if (e.type === "hit" && e.by === "local" && e.enemyId === b._id) { hits++; dmg += e.damage; if (e.c) crits++; maxHit = Math.max(maxHit, e.damage); } return e0(e); };
  while (t < 30 && !b.dead) { P.hp = P.maxHp; P.tamerHp = P.tamerMaxHp; P.monInvuln = 1; sim.enemies = sim.enemies.filter(e => e === b); b.x += (P.mx + 50 - b.x) * 0.5; b.y += (P.my - b.y) * 0.5; b.hp = Math.max(b.hp, 1); A.step(); t += 1 / sim.hz; }
  const dps = dmg / t;
  const at = sim._attrs(P), mv = P.weapons.map(w => w.id + ":" + w.level).join(" ");
  console.log((giant ? "GIANT" : "boss ") + " n" + night + " | " + P.form + " job " + P.level + " base " + P.tamerLevel + " evo " + (P.evoCount || 0) + " | INT " + at.int + " STR " + at.str + " DEX " + at.dex + " | moves " + mv + " | avg hit " + Math.round(dmg / Math.max(1, hits)) + " max " + Math.round(maxHit) + " " + (hits / t).toFixed(1) + "/s dps " + Math.round(dps) + " | boss hp " + Math.round(hp0) + " -> " + (dps ? Math.round(hp0 / dps) + "s" : "never") + " | attacker hp " + Math.round(oHp));
}
trial("agumon", 12, 12, 3, false, "spec");
trial("greymon", 18, 18, 6, true, "spec");
trial("greymon", 24, 24, 9, false, "spec");
trial("metalgreymon", 30, 30, 12, true, "spec");
trial("wargreymon", 40, 40, 18, true, "spec");




