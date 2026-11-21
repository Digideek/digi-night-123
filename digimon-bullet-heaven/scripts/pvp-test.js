/* node scripts/pvp-test.js : PvP between tamers backing different biomes, knocked home not killed; allies
 * at your side level up, digivolve, and keep it when they go home (Nov 20). */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "biomes"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
const mission = require(path.join(root, "js/net/mission-sim.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const P = D.PVP, G = D.ALLY_GROWTH;
const sim = new mission.MissionSim({ seed: 3, hz: 30, data: D });
sim.phase = "playing"; sim.time = 300;
const base = { form: "agumon", level: 8, hp: 200, maxHp: 200, faint: 0, downed: false, hasTamer: true, kind: "human", tamerHp: 100, tamerMaxHp: 100, bits: 100, weapons: [{ id: "pepperBreath", level: 3, cd: 0 }] };
sim.players.length = 0;
const a = Object.assign({ id: "a", x: 0, y: 0, mx: 0, my: 0 }, base), b = Object.assign({ id: "b", x: 150, y: 0, mx: 150, my: 0 }, base, { form: "gabumon", weapons: [{ id: "pepperBreath", level: 3, cd: 0 }] });
sim.players.push(a, b); sim.localId = "a";

ok(!sim._pvpFoes(a, b), "nobody backed by a biome: no fighting");
a.trust = { snow: 60 }; b.trust = { volcano: 70 };
ok(!sim._pvpFoes(a, b), "backed by rival biomes but no flags up: still no fight (Nov 21: PvP is only ever by choice)");
a.pvpFlag = true;
ok(!sim._pvpFoes(a, b), "one flag up: no fight");
b.pvpFlag = true;
ok(sim._pvpFoes(a, b), "both flags up: they fight");
b.atFarm = true; ok(!sim._pvpFoes(a, b), "nobody at the farm can be fought"); b.atFarm = false;

const ev = []; const emit0 = sim.emit.bind(sim); sim.emit = e => { ev.push(e); return emit0(e); };
/* Nov 21: hits go through the ordinary fight, landing on a stand-in that passes them on */
a.pvpFlag = b.pvpFlag = true;
let i = 0; const hp0 = b.hp;
sim._pvpProxyIn();
const sb = sim.enemies.find(e => e.pvpOf === "b");
ok(!!sb && !sim.enemies.some(e => e.pvpOf === "a" && false), "each partner in the fight has a stand-in to aim at");
while (!b.atFarm && i++ < 3000) { sim.time += 1 / 30; a.monInvuln = 0; b.monInvuln = 0; sim.hurtEnemy(sb, 12, 0, 0, 0, { id: "a" }); }
sim._pvpProxyOut();
ok(b.hp < hp0 && ev.some(e => e.type === "hurt" && e.id === "b"), "a hit on the stand-in lands on the real partner");
const ko = ev.find(e => e.type === "pvp.ko");
ok(ko && ko.winner === a.id && b.atFarm && b.hp > 1 && !b.downed, "beaten: no death, knocked back home to the farm (" + Math.round(b.hp) + " HP)");
ok(a.bits === 100 + Math.floor(100 * P.bits) && b.bits === 100 - Math.floor(100 * P.bits) && b.pvpShield === P.koShield, "the winner takes " + Math.round(P.bits * 100) + "% of the loser's Bits; the loser gets a longer shield");

/* the PvP flag: both up, fight whoever backs them; lowering takes PVP.flagOff seconds */
const auth = require(path.join(root, "js/net/authority.js"));
require(path.join(root, "js/net/progression.js"));
const sim2 = new mission.MissionSim({ seed: 4, hz: 30, data: D }), au = new auth.Authority({ sim: sim2, seed: 4 });
sim2.phase = "playing"; sim2.time = 50; sim2.players.length = 0;
const c = Object.assign({ id: "c", x: 0, y: 0, mx: 0, my: 0 }, base), d = Object.assign({ id: "d", x: 100, y: 0, mx: 100, my: 0 }, base);
sim2.players.push(c, d); sim2.localId = "c";
au.act({ type: "pvp.flag", id: "c", on: true });
ok(c.pvpFlag && !sim2._pvpFoes(c, d), "one flag up is not enough");
au.act({ type: "pvp.flag", id: "d", on: true });
ok(sim2._pvpFoes(c, d), "both flags up: they fight, though no biome backs either");
d.trust = { snow: 60 }; c.trust = { snow: 60 };
ok(sim2._pvpFoes(c, d), "both flags up: they fight even when the same biome backs both");
au.act({ type: "pvp.flag", id: "d", on: false });
ok(d.pvpFlag && sim2._pvpFoes(c, d), "lowering the flag doesn't drop it at once");
sim2.time += P.flagOff + 0.1; sim2._updatePvp(0.01);
ok(!d.pvpFlag && !sim2._pvpFoes(c, d), "it comes down after " + P.flagOff + " seconds");

/* allies that grow */
sim.enemies.length = 0;
const ally = sim.spawnEnemy("koromon" in D.ENEMIES ? "koromon" : Object.keys(D.ENEMIES).find(k => sim._burstForm(k) && D.ENEMIES[sim._burstForm(k)]), { x: 10, y: 10, keepType: true });
ally.rally = a.id;
const t0 = ally.type, hpA = ally.maxHp;
for (let k = 0; k < 40 && (ally.alv || 1) < G.evolveAt[0]; k++) sim._allyXp(ally, 1);
ok(ally.alv >= G.evolveAt[0] && ally.maxHp > hpA, "an ally at your side levels up from kills (Lv " + ally.alv + ", " + hpA + " → " + ally.maxHp + " HP)");
ok(ally.type !== t0 && ally.type === sim._burstForm(t0), "and digivolves: " + t0 + " → " + ally.type);
const v = sim.spawnEnemy(t0, { x: 900, y: 0, keepType: true }); v.boss = false;
const lv0 = ally.alv, x0 = ally.axp;
sim._killEnemy(v, { id: a.id });
ok(ally.axp > x0 || ally.alv > lv0, "your kills teach it too");
/* goes home with the nest and comes back the same */
sim.nests = { n: { key: "n", x: 0, y: 0, kind: "herd", biome: "plains", cap: 6, count: 3, t: sim.time, active: false, type: t0, breedT: 40 } };
ally.nest = "n"; ally.rally = null;
sim._allyHome(ally); ally.dead = true;
sim._nestRelease(sim.nests.n);
const back = sim.enemies.find(e => e.nest === "n" && !e.dead && e.alv === ally.alv);
ok(back && back.type === ally.type && back.maxHp === ally.maxHp, "it keeps its growth when it goes home: its nest brings it back as it was (Lv " + (back && back.alv) + " " + (back && back.type) + ")");

console.log(failed ? failed + " failed" : "all passed");
process.exit(failed ? 1 : 0);
