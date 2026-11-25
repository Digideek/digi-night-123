/* node scripts/expedition-test.js : Expeditions (17z33): the Hatchery Digimon left on the stand goes exploring during your runs */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE; D.EVO_TREE = D.EVO_TREE || global.EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "egg-lines", "hatchery"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) { console.log("load " + f + ": " + e.message); } });
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const R = D.hatchery.rules, X = D.EXPEDITION;
function rngOf(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
function stand(stage, seed) { const H = R.clean(R.blank()); R.newEgg(H, rngOf(seed || 1)); H.data = { fire: 1e9 }; for (let i = 0; i < stage; i++) R.feed(H, "fire", 1e9, "day", rngOf(10 + i)); H.data = {}; return H; }
let H = R.clean(R.blank()); R.newEgg(H, rngOf(1));
ok(R.expedition(H, { seconds: 900 }) === null, "an egg that hasn't hatched stays home");
H = stand(3);
ok(R.expedition(H, { seconds: 30 }) === null, "a run shorter than " + X.minSec + " s: it never left");
ok(R.expedition(H, { seconds: 900, used: true }) === null, "taken into the run: no expedition");
ok(R.expedition(H, { seconds: 900, duel: true }) === null, "nor for a duel");
const fam = D.moveFamilyOf(H.egg.form);
let r = R.expedition(H, { seconds: 600 }, rngOf(3));
const k = Object.keys(r.data)[0];
ok(r && r.mins === 10 && r.data[k] === Math.round(10 * X.data * X.stageMul[2]) && (k === fam || k === "plain"), "a 10-minute run: " + H.egg.form + " (a Rookie) brings back " + r.data[k] + " " + k + " data of its own element");
ok(H.data[k] === r.data[k], "and it goes straight into your Hatchery data");
ok(r.coins === Math.round(10 * X.coins * X.stageMul[2]), "and " + r.coins + " DigiCoins");
const r2 = R.expedition(stand(3), { seconds: 3 * 3600 }, rngOf(3));
ok(r2.mins === X.capMin, "a three-hour run counts as " + X.capMin + " minutes out");
const ch = stand(4), rc = R.expedition(ch, { seconds: 600 }, rngOf(3));
ok(Object.values(rc.data)[0] > r.data[k], "a Champion finds more than a Rookie (" + Object.values(rc.data)[0] + " vs " + r.data[k] + ")");
const gH = stand(3); gH.blood.gen = 10; const rg = R.expedition(gH, { seconds: 600 }, rngOf(3));
ok(Object.values(rg.data)[0] === Math.round(10 * X.data * X.stageMul[2] * (1 + X.genMax)), "an old bloodline finds more too (+" + X.genMax * 100 + "% at most)");
/* items and egg maps: chances */
let items = 0, eggs = 0; const rng = rngOf(77);
for (let i = 0; i < 2000; i++) { const h = stand(3, 5); const x = R.expedition(h, { seconds: 600 }, rng); if (x.item) items++; if (x.egg) eggs++; }
ok(Math.abs(items / 2000 - 10 * X.itemPer) < 0.05, "an item about " + Math.round(10 * X.itemPer * 100) + "% of the time on a 10-minute run (" + items + "/2000)");
ok(Math.abs(eggs / 2000 - 10 * X.eggPer) < 0.04, "a map to a rare egg about " + Math.round(10 * X.eggPer * 100) + "% (" + eggs + "/2000)");
/* the map: the next egg is Rare or better */
{ const h = stand(3); h.eggLead = true; R.use(h); const e2 = R.newEgg(h, rngOf(9)); ok(e2 && (e2.tier === "rare" || e2.tier === "mythic") && !h.eggLead, "with the map, the next egg is " + e2.tier + ", and the map is used up");
  let common = 0; for (let i = 0; i < 300; i++) { const g = R.clean(R.blank()); R.newEgg(g, rngOf(100 + i)); if (g.egg.tier === "common") common++; }
  ok(common > 60, "without one, plenty are common (" + common + "/300)"); }
{ const T = stand(3); R.select(T, 1); R.newEgg(T, rngOf(3)); T.data = { ice: 1e9 }; for (let i = 0; i < 3; i++) R.feed(T, "ice", 1e9, "day", rngOf(30 + i)); T.data = {};
  const solo = R.expedition(stand(3), { seconds: 600 }, rngOf(3)), duo = R.expedition(T, { seconds: 600 }, rngOf(3));
  ok(duo.forms.length === 2 && duo.coins === Math.round(solo.coins * (1 + X.team)), "two hatched go out together: the best one's finds +" + X.team * 100 + "% (" + duo.coins + " vs " + solo.coins + " coins)");
  ok(Object.keys(duo.data).length >= 1 && Object.values(duo.data).reduce((a, b) => a + b, 0) >= Object.values(solo.data)[0], "and the data is shared out over their elements (" + JSON.stringify(duo.data) + ")"); }
ok(H.exped && H.exped.n >= 1 && H.exped.last.form === H.egg.form, "the Hatchery remembers the last trip for its page");
console.log(failed ? "\n" + failed + " FAILED" : "\nexpedition-test: all passed");
process.exit(failed ? 1 : 0);
