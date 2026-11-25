/* node scripts/one-side-test.js : one friendly biome at a time (17z33, faction-sim.js, progression.js "side.pick") */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "biomes"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
function world() {
  const sim = new mission.MissionSim({ seed: 3, hz: auth.TICK_HZ, data: D }); const A = new auth.Authority({ sim: sim, seed: 3 });
  sim.phase = "playing"; sim.time = 100;
  A.join({ id: "local", kind: "host-client", hasTamer: true, form: "agumon", x: 0, y: 0, mx: 0, my: 0, hp: 50, maxHp: 50, tamerHp: 50, tamerMaxHp: 50 });
  return { sim, A, p: sim.player("local") };
}
const F = D.FACTIONS;
/* no side picked: helping biomes warms them all, but nobody is your side until one is won over all the way */
let { sim, A, p } = world();
sim._trustEarn(p, "snow", 5); sim._trustEarn(p, "plains", 5);
ok(!p.side && p.trust.snow > 0 && p.trust.plains > 0 && !sim.events.some(e => e.type === "side.auto"), "with no side picked, helping biomes warms them, but no side is given to you");
for (let i = 0; i < 400 && !p.side; i++) { sim.time += 15; sim._trustEarn(p, "snow", 3); if (i % 3 === 0) sim._trustEarn(p, "plains", 3); }
ok(p.side === "snow" && p.trust.snow >= F.trusted && sim.events.some(e => e.type === "side.auto" && e.side === "snow"), "the first one you win over (Freezeland, to trusted) becomes your side, and the screen is told");
ok(p.trust.plains === 0, "the others that were warming to you go back to neutral");
sim._trustEarn(p, "plains", 5); sim._trustEarn(p, "forest", 5);
ok(!(p.trust.plains > 0) && !(p.trust.forest > 0), "after that, helping other biomes earns no trust with them");
/* never won over: stays a free agent with no side */
({ sim, A, p } = world());
sim._trustEarn(p, "desert", 4);
ok(!p.side && p.trust.desert < F.trusted, "a little help is not enough: still no side");
/* picking: switching drops the old side to neutral, allies too */
({ sim, A, p } = world()); A.act({ type: "side.pick", id: "local", side: "snow" });
p.trust = p.trust || {}; p.trust.snow = F.max; p.allied = { snow: true };
let r = A.act({ type: "side.pick", id: "local", side: "volcano" });
ok(r.ok && p.side === "volcano" && p.trust.snow === 0 && !p.allied.snow, "picking Ember Crags drops Freezeland (even allies) back to neutral");
sim._trustEarn(p, "volcano", 6); sim._trustEarn(p, "snow", 6);
ok(p.trust.volcano > 0 && !(p.trust.snow > 0), "and now only Ember Crags earns your trust");
ok(!A.act({ type: "side.pick", id: "local", side: "atlantis" }).ok, "a made-up biome is refused");
/* just survive: nobody */
r = A.act({ type: "side.pick", id: "local", side: null });
sim._trustEarn(p, "volcano", 6); sim._trustEarn(p, "plains", 6);
ok(r.ok && p.free && !p.side && !(p.trust.volcano > 0) && !(p.trust.plains > 0), "a free agent (just survive) makes no friends at all");
/* two players, two sides */
({ sim, A, p } = world());
A.join({ id: "g1", kind: "remote", hasTamer: true, form: "gabumon", x: 50, y: 0, mx: 50, my: 0, hp: 50, maxHp: 50, tamerHp: 50, tamerMaxHp: 50 });
const g = sim.player("g1");
A.act({ type: "side.pick", id: "local", side: "snow" }); A.act({ type: "side.pick", id: "g1", side: "desert" });
sim._trustEarn(p, "snow", 5); sim._trustEarn(p, "desert", 5); sim._trustEarn(g, "snow", 5); sim._trustEarn(g, "desert", 5);
ok(p.trust.snow > 0 && !(p.trust.desert > 0) && g.trust.desert > 0 && !(g.trust.snow > 0), "online, each player has their own one side");
console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
