/* node scripts/lab-test.js : the Lab (data.js LAB). Buying with DigiCoins, and what the levels do inside a run. */
const path = require("path"), root = path.join(__dirname, "..");
const store = { dbh_profile_v1: JSON.stringify({ name: "T", pic: "agumon", stats: {}, ach: {} }) };
global.window = global; global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
global.document = { getElementById: () => null, querySelectorAll: () => [], querySelector: () => null, body: { classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {} }, documentElement: { style: { setProperty() {} }, setAttribute() {} }, addEventListener() {}, readyState: "loading" };
global.setInterval = () => {};
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "weather", "seasons", "cosmetics", "profile", "lab"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) { if (/cosmetics|profile|lab/.test(f)) throw e; } });
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const L = D.LAB;
D.cosmetics.load();

/* buying */
ok(D.lab.buy("vital").reason === "broke", "no DigiCoins, no upgrade");
D.cosmetics.grantBits(80);
ok(D.lab.buy("vital").ok && D.lab.level("vital") === 1 && D.cosmetics.bits() === 55, "level 1 costs " + L.cost[0]);
ok(D.lab.buy("vital").ok && D.cosmetics.bits() === 5, "level 2 costs " + L.cost[1]);
ok(!D.lab.buy("vital").ok && D.lab.level("vital") === 2, "level 3 refused at 5 DigiCoins");
ok(JSON.parse(store.dbh_profile_v1).lab.vital === 2, "levels are saved on the profile");
D.cosmetics.grantBits(5000);
for (let i = 0; i < 9; i++) D.lab.buy("farm");
ok(D.lab.level("farm") === 5 && D.lab.cost("farm") === null && D.lab.buy("farm").reason === "max", "five levels and no further");
ok(D.lab.mods().farm === 30 && Math.abs(D.lab.mods().hp - 1.04) < 1e-9, "farm +30 s, health +4%");
const total = L.cost.reduce((a, b) => a + b, 0);
const whole = L.list.reduce((a, u) => a + (u.costs || L.cost).reduce((x, y) => x + y, 0), 0);
ok(whole === 8120, "the whole Lab costs " + whole + " DigiCoins (the twelve boosts, the Digivice Port, the Kit Bag and the Move Slot)");
const ms = L.list.find(u => u.id === "moveslot");
ok(ms && ms.max === 1 && ms.costs.length === 1 && ms.costs[0] >= 1000, "the Move Slot: one level only, a big saving goal (" + (ms && ms.costs[0]) + " DigiCoins)");

/* a run pays DigiCoins */
D.SPECIES.t_rookie = { name: "R", stage: "Rookie" };
const b0 = D.cosmetics.bits(), pay = D.profile.runEnded({ time: 480, kills: 150, form: "t_rookie" });
ok(pay.bits === Math.floor(167 / L.runBitsPer) && D.cosmetics.bits() - b0 === pay.bits + 25, "a 167 XP run pays " + pay.bits + " DigiCoins (plus 25 for the rank it reached)");

/* inside a run */
function mk(lab) {
  const sim = new mission.MissionSim({ seed: 2, hz: auth.TICK_HZ, data: D }); new auth.Authority({ sim: sim, seed: 2 });
  const p = sim.join({ id: "a", kind: "host-client", hasTamer: true, form: "agumon", hp: 100, maxHp: 100, lab: lab }) || sim.player("a");
  return { sim, p: sim.player("a") };
}
const plain = mk(null), full = mk({ vital: 5, power: 5, scan: 5, study: 5, farm: 5, bits: 5, junk: 9 }), over = mk({ vital: 99 });
ok(Object.keys(plain.p.lab).length === 0 && !full.p.lab.junk && over.p.lab.vital === 5, "levels are cleaned and capped when a tamer joins");
const s0 = plain.sim._stats(plain.p), s1 = full.sim._stats(full.p);
ok(Math.abs(s1.damageMul / s0.damageMul - 1.075) < 1e-9, "Battle Data 5: +7.5% damage");
ok(Math.abs(s1.magnetMul / s0.magnetMul - 1.25) < 1e-9, "Scan Range 5: +25% pickup range");
ok(Math.abs(s1.allyMaxHp / s0.allyMaxHp - 1.10) < 1e-9, "Vital Data 5: +10% max health");
plain.sim._eatOrb(plain.p, { kind: "bits", value: 10 }); full.sim._eatOrb(full.p, { kind: "bits", value: 10 });
full.sim._eatOrb(full.p, { kind: "bits", value: 10 });
ok(plain.p.bits === 10 && full.p.bits === 25, "Bit Finder 5: 20 Bits picked up count as 25");
const x0 = plain.p.xp, x1 = full.p.xp;
plain.sim._eatOrb(plain.p, { kind: "xp", value: 5 }); full.sim._eatOrb(full.p, { kind: "xp", value: 5 });
ok(Math.abs((full.p.xp - x1) - 5.5) < 1e-9 && plain.p.xp - x0 === 5 || full.p.level > 1, "Study Data 5: +10% job XP");
ok(full.sim._lab(full.p).farm === 30 && plain.sim._lab(plain.p).farm === 0, "Farm Pass 5: +30 s at the farm");
console.log(failed ? failed + " FAILED" : "lab-test: all passed"); process.exit(failed ? 1 : 0);
