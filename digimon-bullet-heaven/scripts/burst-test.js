/* node scripts/burst-test.js : warp burst meter, activation, standard-form rule, and that it ends */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "stage-waves"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) { console.log("load " + f + ": " + e.message); } });
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const sim = new mission.MissionSim({ seed: 9, hz: auth.TICK_HZ, data: D });
const a = new auth.Authority({ sim: sim, seed: 9 });
sim.phase = "playing"; sim.time = 100;
if (!sim.players[0]) { sim.players.push({ id: "local" }); sim.localId = "local"; }
const p = sim.players[0];
Object.assign(p, { form: "agumon", hp: 200, maxHp: 200, x: 0, y: 0, mx: 0, my: 0, faint: 0, downed: false, hasTamer: true, kind: "human", weapons: [{ id: "pepperBreath", level: 1, cd: 0 }], burst: 0 });
ok(!a.act({ type: "burst", id: p.id }).ok, "an empty meter does nothing");
const b0 = p.burst; for (let i = 0; i < 250; i++) sim._updateBurst(p, 0.04);
ok(p.burst > b0 && p.burst < 10, "it creeps up by itself: " + p.burst.toFixed(1) + " after 10 s");
const e = sim.spawnEnemy(Object.keys(D.ENEMIES)[0], { x: 30, y: 0, keepType: true });
const b1 = p.burst; sim.hurtEnemy(e, e.maxHp * 0.5, 1, 0, 0, p, 1, "pepperBreath");
ok(p.burst > b1 + 0.5, "damage fills it faster: +" + (p.burst - b1).toFixed(1) + " for half an enemy");
p.burst = 100;
const r = a.act({ type: "burst", id: p.id });
ok(r.ok && p.burstForm === "greymon" && p.form === "agumon", "Agumon bursts as Greymon and is still Agumon underneath");
ok(p.burstStyle === "bombarder" && p.burstWeapons.length === 1 && p.burstWeapons[0].id === "megaFlame", "Greymon is a Bombarder: " + p.burstWeapons.map(w => D.WEAPONS[w.id].name).join(", "));
sim.bullets.length = 0; sim._fireFrom(p, 0.04, 0, 0, e, p.burstWeapons[0]);
ok(sim.bullets.length && sim.bullets[0].explode >= 52, "every Bombarder shot explodes");
ok(p.burst === 0 && !a.act({ type: "burst", id: p.id }).ok, "the meter is spent and it cannot be stacked");
const before = p.burst; sim.hurtEnemy(e, 5, 1, 0, 0, p, 1, "megaFlame");
ok(p.burst === before, "no charge while it is running");
let shots = 0; sim.bullets.length = 0;
for (let i = 0; i < 25; i++) { sim._updateWeapons(p, 0.04); }
shots = sim.bullets.length + sim.arcs.length;
p.burstLeft = 0; p.burstWeapons = null; sim.bullets.length = 0; sim.arcs.length = 0; p.weapons[0].cd = 0;
for (let i = 0; i < 25; i++) { sim._updateWeapons(p, 0.04); }
ok(shots >= (sim.bullets.length + sim.arcs.length) * 2, "one second of burst: " + shots + " attacks, against " + (sim.bullets.length + sim.arcs.length) + " normally");
p.burst = 100; a.act({ type: "burst", id: p.id });
for (let i = 0; i < 160; i++) sim._updateBurst(p, 0.04);
ok(!(p.burstLeft > 0) && !p.burstForm && !p.burstWeapons, "after six seconds it is itself again");
/* styles */
function start(form) { p.burstLeft = 0; p.burstForm = null; p.form = form; p.burst = 100; p.mx = p.my = p.x = p.y = 0; return a.act({ type: "burst", id: p.id }); }
start("wormmon");
ok(p.burstForm === "stingmon" && p.burstStyle === "striker" && sim.data.WEAPONS[p.burstWeapons[0].id].type === "arc", "Wormmon bursts as Stingmon, a Striker using " + D.WEAPONS[p.burstWeapons[0].id].name);
sim.enemies.length = 0; const far = sim.spawnEnemy(Object.keys(D.ENEMIES)[0], { x: 200, y: 0, keepType: true });
const sx = p.mx; for (let i = 0; i < 20; i++) sim._updateMon ? 0 : 0;
start("patamon");
ok(p.burstForm === "angemon" && p.burstStyle === "guardian", "Patamon bursts as Angemon, a Guardian");
const near = sim.spawnEnemy(Object.keys(D.ENEMIES)[0], { x: 60, y: 0, keepType: true }), nhp = near.hp, fhp = far.hp;
p.burstPulse = 0; sim._updateBurst(p, 0.04);
ok(near.hp < nhp && (near.kvx > 0 || near.dead), "its ring hurts and throws back what is inside");
ok(far.hp === fhp, "and leaves alone what is outside");
ok(sim._burstCfg(p).guard === 0.25, "a Guardian takes a quarter damage");
p.burstLeft = 0; p.burstForm = null; p.burstWeapons = null; p.form = "agumon";
/* the burst form is always the standard one */
let bad = 0, n = 0;
for (const id in EVO_TREE.species) { const to = sim._burstForm(id); n++; if (to !== id && !(EVO_TREE.branches[id] || []).some(br => br.to === to && br.kind === "standard")) bad++; }
ok(bad === 0, "all " + n + " forms burst into their standard next form or stay as they are");
ok(sim._burstForm("wargreymon") === "wargreymon", "a Mega with nowhere to go bursts as itself");
console.log(failed ? "burst-test: " + failed + " failed" : "burst-test: all passed");
process.exit(failed ? 1 : 0);
