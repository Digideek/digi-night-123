/* node scripts/regen-feed-test.js : no health comes back on its own; the Recovery skill heals; feeding works from any distance; show sizes */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const sim = new mission.MissionSim({ seed: 7, hz: auth.TICK_HZ, data: D }), a = new auth.Authority({ sim: sim, seed: 7 });
sim.phase = "playing"; sim.time = 100; sim.skillTree = true;
if (!sim.players[0]) { sim.players.push({ id: "local" }); sim.localId = "local"; }
const p = sim.players[0];
Object.assign(p, { form: "agumon", level: 5, hp: 50, maxHp: 100, x: 0, y: 0, mx: 0, my: 0, faint: 0, downed: false, hasTamer: true, kind: "human", skills: { pepperBreath: 1 }, skillPoints: 0, xp: 0, xpNext: 1e9, sinceHit: 99, bag: { meat: 2 } });
sim.enemies.length = 0; sim.enemyFreeze = 1e9;
const stepName = ["step", "tick", "update"].find(n => typeof sim[n] === "function");
function run(sec) { for (let i = 0; i < sec * 30; i++) { sim.enemies.length = 0; p.hp = Math.min(p.hp, p.maxHp); sim[stepName](1 / 30); } }
p.hp = 50; run(10);
ok(Math.abs(p.hp - 50) < 0.01, "ten quiet seconds bring back no health (" + p.hp.toFixed(2) + " of " + p.maxHp + ")");
p.skills.rg = 5; const hp0 = p.hp, mx = p.maxHp, t0 = sim.time; run(10); const el = sim.time - t0;
ok(Math.abs((p.hp - hp0) - mx * 0.002 * 5 * el) < mx * 0.003, "Recovery Lv 5 heals 1% a second (+" + (p.hp - hp0).toFixed(1) + " in " + el.toFixed(1) + " s of " + mx + ")");
p.skills.rg = 0; p.x = 5000; p.y = 5000; p.mx = 0; p.my = 0;
const r = a.act({ type: "field.feed", id: p.id, food: "meat" });
ok(r.ok || !/closer/i.test(r.reason || ""), "feeding from far away is not refused for distance (" + (r.ok ? "fed" : r.reason) + ")");
const T = D.TAMER_H, h = D.stageHeight;
ok(h("agumon") / T >= 0.75 && h("agumon") / T <= 0.9, "a Rookie is about 80% of a tamer (Agumon " + (h("agumon") / T).toFixed(2) + ")");
ok(h("greymon") / T >= 2 && h("tyrannomon") / T >= 2 && h("gatomon") / T < 1 && h("dokugumon") / T >= 2.4, "big Champions are at least twice a tamer (Greymon " + (h("greymon") / T).toFixed(1) + ")");
ok(h("gatomon") < h("agumon") && h("angemon") / T < h("greymon") / T, "known exceptions keep their size (Gatomon " + (h("gatomon") / T).toFixed(1) + ", Angemon " + (h("angemon") / T).toFixed(1) + ")");
ok(h("botamon") < h("koromon") && h("koromon") < h("agumon") && h("metalgreymon") > h("greymon"), "sizes climb with the stages");
console.log(failed ? "regen-feed-test: " + failed + " failed" : "regen-feed-test: all passed");
process.exit(failed ? 1 : 0);
