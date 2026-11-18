/* Held-back digivolution: hidden routes, and the offer / hold flow in the authority. */
const path = require("path");
const root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["species-catalog", "rarity", "evo-stat-gates", "evo-hardmode"].forEach(function (f) { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
let failed = 0;
function check(name, fn) { try { fn(); console.log("  ok " + name); } catch (e) { failed++; console.log("  FAIL " + name + ": " + e.message); } }
function assert(c, m) { if (!c) throw new Error(m); }
const plain = { level: 60, meals: 80, joy: 95, happiness: 95, hpRatio: 1, careMistakes: 0, foodCounts: { meat: 40, fish: 40 }, formTime: 9999 };
function to(from, extra) { const p = D.pickEvolution(from, Object.assign({}, plain, extra || {})); return p && p.to; }

const HIDDEN = ["guilmon", "growlmon", "leomon", "garudamon", "wingdramon", "gallantmon"];
check("without a hold the hidden routes stay shut", function () {
  ["koromon", "agumon", "gabumon", "greymon", "garurumon", "metalgreymon"].forEach(function (f) {
    assert(HIDDEN.indexOf(to(f)) < 0, f + " -> " + to(f));
  });
});
check("a partner held back once takes the hidden route", function () {
  assert(to("koromon", { formHolds: 1 }) === "guilmon", "koromon -> " + to("koromon", { formHolds: 1 }));
  assert(to("agumon", { formHolds: 1 }) === "growlmon", "agumon -> " + to("agumon", { formHolds: 1 }));
  assert(to("gabumon", { formHolds: 1 }) === "leomon", "gabumon -> " + to("gabumon", { formHolds: 1 }));
  assert(to("greymon", { formHolds: 1 }) === "garudamon", "greymon -> " + to("greymon", { formHolds: 1 }));
  assert(to("garurumon", { formHolds: 2 }) === "wingdramon", "garurumon -> " + to("garurumon", { formHolds: 2 }));
});
check("MetalGreymon needs two holds for its hidden route", function () {
  assert(to("metalgreymon", { formHolds: 1 }) !== "gallantmon", "one hold was enough");
  assert(to("metalgreymon", { formHolds: 2 }) === "gallantmon", "two holds -> " + to("metalgreymon", { formHolds: 2 }));
});
check("hold perks are small", function () {
  D.EVO_HOLD.perks.forEach(function (k) { assert(Math.abs(k.mul - 1) <= 0.125, k.id + " is too big"); });
  assert(D.EVO_HOLD.everyLevels === 5, "offer should return every 5 levels");
});
console.log(failed ? "evo-hold-test: " + failed + " failed" : "evo-hold-test: all passed");
process.exit(failed ? 1 : 0);
