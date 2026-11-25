/* node scripts/sig-fx-test.js : every signature move has a look of its own (17z33 move revamp, js/sig-fx.js).
 * All 364 get a recipe; no two moves anywhere share kind + form + motif + trail; in a line, two moves of
 * the same kind never share a form; every form and motif a recipe uses has something that draws it. */
const path = require("path"), fs = require("fs"), root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves"].forEach(f => require(path.join(root, "js/" + f + ".js")));
const SF = require(path.join(root, "js/sig-fx.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const R = SF.recipes(), ids = Object.keys(D.SIG_INFO);
ok(ids.length >= 360 && ids.every(id => R[id]), "every signature move has a recipe (" + ids.length + ")");
const seen = {}; let dup = 0;
ids.forEach(id => { const r = R[id], k = [r.kind, r.form, r.motif, r.trail].join("|"); if (seen[k]) dup++; seen[k] = id; });
ok(!dup, "no two moves share kind + form + motif + trail (" + Object.keys(seen).length + " different looks)");
const before = {}; ids.forEach(id => { const lk = D.SIG_LOOK[id] || {}, w = D.WEAPONS[id]; before[[w.type, lk.sh || "", lk.ms || "", lk.bf || "", lk.cf || "", lk.d || ""].join("|")] = 1; });
console.log("  (before this: " + Object.keys(before).length + " different looks for the same moves)");
const lines = {}; ids.forEach(id => (lines[R[id].line] = lines[R[id].line] || []).push(R[id]));
let clash = 0; for (const l in lines) { const a = lines[l]; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i].kind === a[j].kind && a[i].form === a[j].form) clash++; }
ok(!clash, "within a line, two moves of the same kind never share a form");
const forms = {}; ids.forEach(id => { forms[R[id].form] = 1; });
const src = fs.readFileSync(path.join(root, "js/sig-fx-draw.js"), "utf8");
const missing = Object.keys(forms).filter(f => src.indexOf('"' + f + '"') < 0 && f !== "straight" && f !== "tumble" && f !== "pulse" && f !== "comet" && f !== "ghost" && f !== "spin");
ok(!missing.length, "every form in use is drawn (" + Object.keys(forms).length + " forms)" + (missing.length ? " missing: " + missing.join(",") : ""));
const afx = fs.readFileSync(path.join(root, "js/attack-fx.js"), "utf8"), shapes = Object.keys(SF.NEW_SHAPES);
const motifs = {}; ids.forEach(id => { motifs[R[id].motif] = 1; });
const noShape = Object.keys(motifs).filter(m => shapes.indexOf(m) < 0 && !new RegExp("\\n    " + m + ": function").test(afx));
ok(!noShape.length, "every motif in use has a shape (" + Object.keys(motifs).length + " motifs)" + (noShape.length ? " missing: " + noShape.join(",") : ""));
/* a grown move is drawn bigger: it knows how many times it grew */
const grown = ids.filter(id => D.SIG_INFO[id].up);
ok(grown.every(id => R[id].grand === R[D.SIG_INFO[id].up].grand + 1), "a move that grew from another is one size up from it (" + grown.length + ")");
/* words count: a few that must look like what they say */
const want = { fizzBubbles: r => /bubbles/.test(r.trail), flameGargle: r => r.motif === "flame", icicleRain: r => r.motif === "shard" && r.form === "rain", stompQuake: r => r.impact === "crater", petalShower: r => /petal/.test(r.motif + r.trail), thunderCall: r => r.palName === "spark" };
Object.keys(want).forEach(id => ok(R[id] && want[id](R[id]), D.WEAPONS[id].name + " looks like its name (" + (R[id] && [R[id].form, R[id].motif, R[id].palName, R[id].trail, R[id].impact].join(", ")) + ")"));
console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
