/* Tokomon's "pick a side" question is held back in Versus and Night Siege, and in Story until its side
 * goal; it isn't held in the Survival rule sets. (17z33) */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
global.DBH = global.DBH || {};
/* modes-ui only runs on a page: a bare stand-in is enough to read holdTurf */
global.document = global.document || { getElementById: () => null, body: { appendChild() {} }, createElement: () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, appendChild() {} }), addEventListener() {} };
require(path.join(root, "js/data.js"));
try { require(path.join(root, "js/modes-ui.js")); } catch (e) { console.log("  (modes-ui needs a page: " + e.message + ")"); }
const M = global.DBH.modesUi;
let failed = 0; const ok = (c, m) => { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); };
ok(!!(M && M.holdTurf), "modes-ui loads and has holdTurf");
if (M && M.holdTurf) {
  ok(M.holdTurf({ mode: "versus" }) === true, "Versus: Tokomon never asks");
  ok(M.holdTurf({ mode: "siege" }) === true, "Night Siege: Tokomon never asks");
  ["open", "survival", "ranked", "weekly"].forEach(m => ok(M.holdTurf({ mode: m }) === false, m + ": Tokomon asks as usual"));
}
/* and the chunk-edge fix stays in (a phone at 2x showed a dark line along chunk edges without it) */
const W = require("fs").readFileSync(path.join(root, "js/world.js"), "utf8");
ok(/destination-over[\s\S]{0,80}ctx\.drawImage\(canvas, 0, w - 1, w, 1, 0, w, w, 3\)/.test(W), "chunks copy their last ground row into the strip below (no seam line on phones)");
console.log(failed ? failed + " FAILED" : "turf-hold-test: all passed");
process.exit(failed ? 1 : 0);
