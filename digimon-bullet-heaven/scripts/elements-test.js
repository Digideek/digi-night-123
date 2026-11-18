/* node scripts/elements-test.js : element table, attribute triangle, and a live sim hit */
const fs = require("fs"), path = require("path"), vm = require("vm");
const ctx = { console, Math, Date, setTimeout, clearTimeout };
ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
ctx.document = { addEventListener() {}, getElementById() { return null; }, createElement() { return { getContext() { return null; }, style: {} }; } };
ctx.navigator = { userAgent: "node" }; ctx.location = { search: "", hash: "", href: "" };
vm.createContext(ctx);
["data", "ro-stats", "weather", "seasons", "evolution-tree", "up-atlas-index", "species-catalog", "moves", "elements", "skill-tree", "egg-lines", "stage-waves", "net/mission-sim"].forEach(f => {
  try { vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", f + ".js"), "utf8"), ctx, { filename: f }); }
  catch (e) { console.log("load " + f + ": " + e.message); }
});
const D = ctx.DBH, EL = D.ELEMENTS;
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("FAIL " + m); } }
ok(EL.elementMul("fire", "ice") === 1.5, "fire beats ice");
ok(EL.elementMul("ice", "fire") === 0.75, "ice resisted by fire");
ok(EL.elementMul("fire", "fire") === 0.5, "same element halves");
ok(EL.elementMul("dark", "holy") === 1.5 && EL.elementMul("holy", "dark") === 1.5, "dark and holy hurt each other");
ok(EL.elementMul("fire", "beast") === 1, "neutral pair");
ok(EL.attrMul("Vaccine", "Virus") === 1.2 && EL.attrMul("Virus", "Vaccine") === 0.85, "Vaccine > Virus");
ok(EL.attrMul("Virus", "Data") === 1.2 && EL.attrMul("Data", "Vaccine") === 1.2, "Virus > Data > Vaccine");
ok(EL.attrMul("Free", "Virus") === 1, "Free is neutral");
EL.ORDER.forEach(e => { const w = EL.weakTo(e).length; ok(w >= 2 && w <= 3, e + " has " + w + " weaknesses"); ok(EL.BEATS[e].length >= 2, e + " beats 2+"); });
ok(EL.moveElement("pepperBreath", "agumon") === "fire", "Pepper Breath is fire");
ok(EL.moveElement("bubbleBlow", "agumon") === null && EL.moveElement("headbutt", "gabumon") === null, "baby moves have no element");
ok(EL.elementOf("agumon") === "fire" && EL.elementOf("gabumon") === "ice", "line elements");
const counts = {}; let none = 0;
Object.keys(D.ENEMIES).forEach(id => { const e = EL.elementOf(id); if (!e) none++; counts[e] = (counts[e] || 0) + 1; });
ok(none === 0, none + " enemies without an element");
console.log("enemy elements:", JSON.stringify(counts));
if (D.net && D.net.mission) {
  const MS = D.net.mission.MissionSim, sim = Object.create(MS.prototype);
  sim.data = D; sim.time = 0; sim.events = []; sim.emit = function (e) { this.events.push(e); };
  const ice = Object.keys(D.ENEMIES).find(id => EL.elementOf(id) === "ice" && EL.attributeOf(id) === "Data");
  const m = sim._elemMul("pepperBreath", "agumon", ice, {}, 0, 0);
  ok(Math.abs(m - 1.5 * 0.85) < 1e-9, "sim: fire Vaccine on ice Data = " + m);
  ok(sim.events.length === 1 && sim.events[0].k === "weak", "sim: Weak! float");
} else console.log("(MissionSim not exposed; sim check skipped)");
console.log(failed ? "elements-test: " + failed + " failed" : "elements-test: all passed");
process.exit(failed ? 1 : 0);
