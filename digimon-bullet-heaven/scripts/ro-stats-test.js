/* The Ragnarok-style status rules: point costs, points per level, derived values. */
const path = require("path");
const RO = require(path.join(__dirname, "..", "js", "ro-stats.js"));
let failed = 0;
function check(name, fn) { try { fn(); console.log("  ok " + name); } catch (e) { failed++; console.log("  FAIL " + name + ": " + e.message); } }
function eq(a, b, m) { if (a !== b) throw new Error((m || "") + " expected " + b + ", got " + a); }

check("raising a stat costs floor((x-1)/10)+2", function () {
  eq(RO.cost(1), 2); eq(RO.cost(10), 2); eq(RO.cost(11), 3); eq(RO.cost(20), 3); eq(RO.cost(21), 4); eq(RO.cost(50), 6); eq(RO.cost(91), 11); eq(RO.cost(98), 11);
});
check("a new tamer has no points; the first base level brings the first three", function () {
  eq(RO.CFG.startPoints, 0);
  eq(RO.pointsFor(1), 3);
  let x = 1, pts = RO.pointsFor(1);
  while (pts >= RO.cost(x)) { pts -= RO.cost(x); x++; }
  eq(x, 2); eq(pts, 1);
});
check("a level gives floor(L/5)+3 points", function () {
  eq(RO.pointsFor(1), 3); eq(RO.pointsFor(4), 3); eq(RO.pointsFor(5), 4); eq(RO.pointsFor(10), 5); eq(RO.pointsFor(98), 22);
});
check("status ATK = STR + floor(STR/10)^2 + floor(DEX/5) + floor(LUK/5)", function () {
  eq(RO.derive({ str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 }, 1).atk, 1);
  eq(RO.derive({ str: 50, agi: 1, vit: 1, int: 1, dex: 20, luk: 10 }, 1).atk, 50 + 25 + 4 + 2);
  eq(RO.derive({ str: 99, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 }, 1).atk, 99 + 81);
});
check("MATK runs from INT + floor(INT/7)^2 to INT + floor(INT/5)^2", function () {
  const d = RO.derive({ str: 1, agi: 1, vit: 1, int: 70, dex: 1, luk: 1 }, 1);
  eq(d.matkMin, 70 + 100); eq(d.matkMax, 70 + 196);
});
check("Hit = Lv + DEX, Flee = Lv + AGI, chance to hit = 80 + Hit - Flee within 5..100", function () {
  const d = RO.derive({ str: 1, agi: 30, vit: 1, int: 1, dex: 40, luk: 1 }, 12);
  eq(d.hit, 52); eq(d.flee, 42);
  eq(RO.hitChance(2, 2), 80); eq(RO.hitChance(52, 24), 100); eq(RO.hitChance(2, 130), 5); eq(RO.hitChance(60, 2, 95), 95);
});
check("crit = 1 + LUK*0.3, perfect dodge = 1 + LUK/10, HP x (1 + VIT/100)", function () {
  const d = RO.derive({ str: 1, agi: 1, vit: 50, int: 1, dex: 1, luk: 30 }, 1);
  eq(d.crit, 10); eq(d.perfectDodge, 4); eq(d.hpMul, 1.5);
});
check("AGI and DEX shorten the attack delay: 1 - AGI/250 - DEX/1000", function () {
  eq(+RO.derive({ str: 1, agi: 50, vit: 1, int: 1, dex: 50, luk: 1 }, 1).delayMul.toFixed(3), 0.75);
});
check("job bonus grows with each digivolution and follows the element", function () {
  eq(RO.jobBonus(0, "fire").str, 0); eq(RO.jobBonus(3, "fire").str, 6); eq(RO.jobBonus(3, "ice").int, 6); eq(RO.jobBonus(3, "wind").agi, 6); eq(RO.jobBonus(4, "fire").luk, 2); eq(RO.jobBonus(2, "fire").vit, 2);
});
check("INT is the cast timer for special moves, with DEX: 1 - INT/250 - DEX/300", function () {
  eq(+RO.derive({ str: 1, agi: 99, vit: 1, int: 50, dex: 30, luk: 1 }, 1).castMul.toFixed(3), 0.7);
  eq(+RO.derive({ str: 1, agi: 99, vit: 1, int: 1, dex: 1, luk: 1 }, 1).castMul.toFixed(3), 0.993);
  eq(RO.derive({ str: 1, agi: 1, vit: 1, int: 99, dex: 99, luk: 1 }, 1).castMul, RO.CFG.MIN_DELAY);
});
console.log(failed ? "ro-stats-test: " + failed + " failed" : "ro-stats-test: all passed");
process.exit(failed ? 1 : 0);
