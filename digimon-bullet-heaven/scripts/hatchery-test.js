/* node scripts/hatchery-test.js : the Hatchery's rules (js/hatchery.js): eggs by rarity, feeding, what it becomes, unlocking a line, taking it into a run */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE; D.EVO_TREE = D.EVO_TREE || global.EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "weather", "seasons", "hatchery"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) { console.log("load " + f + ": " + e.message); } });
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const R = D.hatchery.rules;
function rngOf(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

/* eggs */
const tiers = {}; D.EGGS.forEach(e => { const t = R.tierOf(e.id); tiers[t] = (tiers[t] || 0) + 1; });
ok(D.EGGS.filter(e => e.starter).every(e => R.tierOf(e.id) === "common") && tiers.uncommon > 0 && tiers.rare > 0 && tiers.mythic > 0, "every egg line has a rarity: " + JSON.stringify(tiers));
{ const got = {}, rng = rngOf(7); for (let i = 0; i < 4000; i++) { const H = R.blank(); got[R.newEgg(H, rng).tier] = (got[R.newEgg({ ...R.blank() }, rng) ? H.egg.tier : "x"] || 0) + 1; }
  ok(got.common > got.uncommon && got.uncommon > got.rare && got.rare > got.mythic && got.mythic > 40, "common eggs come most, mythic least: " + JSON.stringify(got)); }
{ const H = R.blank(); R.newEgg(H, rngOf(1)); ok(R.newEgg(H, rngOf(2)) === null && H.count === 1, "one egg at a time"); }

/* feeding is slow, and the first two eggs are quicker */
{ const H = R.blank(); R.newEgg(H, rngOf(3)); H.data = { fire: 5000 };
  ok(R.cost(H) === 125, "your first egg hatches at 125 data (half price)");
  const a = R.feed(H, "fire", 100, "day", rngOf(4));
  ok(a.ok && !a.grew && H.egg.prog === 100 && H.data.fire === 4900 && H.egg.form === null, "feeding moves data into the egg; what is inside stays unknown");
  const b = R.feed(H, "fire", 1e9, "day", rngOf(4));
  ok(b.grew && b.hatched && H.egg.stage === 1 && H.data.fire === 4875 && D.moveStageIdx(H.egg.form) === 0, "'All' feeds only what it needs, and it hatches into a Baby (" + H.egg.form + ")");
  ok(R.feed(H, "ice", 10, "day").reason === "none", "you cannot feed data you do not have"); }
{ const H = R.blank(); H.count = 2; R.newEgg(H, rngOf(3));
  ok(R.cost(H) === 250, "from the third egg on it is 250 to hatch");
  const tot = R.CFG.cost.reduce((a, b) => a + b, 0);
  ok(tot >= 5000, "and " + tot + " data in all to raise one to Champion"); }
{ const got = R.pay({ fire: 180, machine: 40, bogus: 9 }, 11 * 60);
  ok(got.fire === 180 && got.machine === 40 && got.plain === 44 && !got.bogus, "a run pays its kills by element and 4 plain a minute: " + JSON.stringify(got));
  ok(R.killWorth({}) === 1 && R.killWorth({ boss: true }) === 12 && R.killWorth({ big: true }) === 20, "a boss is worth 12, a Mega or lord 20"); }

/* what it becomes: pulled by diet, never certain */
function hatchMany(type, n) {
  const fams = {}, rng = rngOf(99);
  for (let i = 0; i < n; i++) { const H = R.blank(); H.count = 5; H.egg = { tier: "uncommon", stage: 0, form: null, line: null, route: [], prog: 0, n: 6, fed: {}, now: {}, sky: {}, shell: 1 }; H.data = { [type]: 9999 }; R.feed(H, type, 1e9, null, rng); const f = D.moveFamilyOf(H.egg.form); fams[f] = (fams[f] || 0) + 1; }
  return fams;
}
{ const pool = R.linesOf("uncommon"), fset = {}; pool.forEach(e => { fset[D.moveFamilyOf(e.hatch)] = 1; });
  const want = Object.keys(fset)[0], other = Object.keys(fset).find(f => f !== want);
  const fed = hatchMany(want, 600), plain = hatchMany("plain", 600);
  ok((fed[want] || 0) > (plain[want] || 0) * 1.8 && (fed[want] || 0) < 600, "an egg fed " + want + " data hatches a " + want + " line far more often (" + (fed[want] || 0) + " of 600, against " + (plain[want] || 0) + " on plain data), and still not always");
  ok(other && (fed[other] || 0) > 0, "other lines still come out of it sometimes"); }
function champs(diet, n) {
  const out = {}, rng = rngOf(5);
  for (let i = 0; i < n; i++) { const H = R.blank(); H.egg = { tier: "common", stage: 3, form: "agumon", line: "agumon", route: ["botamon", "koromon", "agumon"], prog: 0, n: 9, fed: {}, now: {}, sky: {}, shell: 1 }; H.data = Object.assign({}, diet);
    for (const k in diet) R.feed(H, k, 1e9, null, rng);
    out[H.egg.form] = (out[H.egg.form] || 0) + 1; }
  return out;
}
{ const opts = (() => { const H = R.blank(); H.egg = { tier: "common", stage: 3, form: "agumon", line: "agumon", route: [], prog: 0, n: 9, fed: {}, now: {}, sky: {}, shell: 1 }; return R.options(H); })();
  ok(opts.length >= 3 && opts.some(o => o.to === "greymon" && o.kind === "standard"), "Agumon has " + opts.length + " Champions it could become here: " + opts.map(o => o.to).join(", "));
  const fire = champs({ fire: 9999 }, 800), offFam = opts.map(o => D.moveFamilyOf(o.to)).find(f => f !== "fire"), off = champs({ [offFam]: 9999 }, 800);
  const gF = (fire.greymon || 0) / 800, gO = (off.greymon || 0) / 800;
  ok(gF > 0.55 && gF < 1, "fed fire, Agumon becomes Greymon " + Math.round(gF * 100) + "% of the time: likely, not certain");
  ok(gO < gF - 0.15 && gO > 0.1, "fed " + offFam + " data instead, only " + Math.round(gO * 100) + "%: " + JSON.stringify(off)); }
{ const H = R.blank(); H.egg = { tier: "common", stage: 3, form: "agumon", line: "agumon", route: [], prog: 0, n: 9, fed: {}, now: { machine: 100 }, sky: {}, shell: 1 };
  const a = R.options(H).find(o => o.to === "monochromon").w, g0 = R.options(H).find(o => o.to === "greymon").w; H.egg.sky = { storm: 100 };
  const b = R.options(H).find(o => o.to === "monochromon").w, g1 = R.options(H).find(o => o.to === "greymon").w;
  ok(b > a * 1.4 && g1 === g0, "feeding it under a storm pulls harder toward machine forms (Monochromon " + Math.round(a) + " to " + Math.round(b) + "), and no harder toward Greymon"); }

/* raising to Rookie opens the line; Champion is as far as it goes */
{ const H = R.blank(); H.count = 4; R.newEgg(H, rngOf(21)); H.data = { beast: 99999 }; const seen = [];
  for (let i = 0; i < 6; i++) { const r = R.feed(H, "beast", 1e9, "day", rngOf(30 + i)); if (!r.ok) break; seen.push(r); }
  ok(seen.length === 4 && seen[0].hatched && !seen[0].unlocked && !seen[1].unlocked && seen[2].unlocked === H.egg.line && !seen[3].unlocked, "the line (" + H.egg.line + ") opens the moment it reaches Rookie, not before");
  ok(H.egg.stage === 4 && D.moveStageIdx(H.egg.form) === 3 && R.cost(H) === null && R.feed(H, "beast", 10).reason === "max", "it stops at Champion (" + H.egg.form + ")");
  ok(H.egg.route.length === 4 && H.egg.route.every((f, i) => D.moveStageIdx(f) === i), "its route is one form per stage: " + H.egg.route.join(" > "));
  ok(H.rookies && H.rookies[H.egg.route[2]] === 1 && Object.keys(H.rookies).length === 1, "the Rookie it grew into is kept (" + H.egg.route[2] + "): Versus lets you bring it");
  /* into a run */
  const u = R.use(H);
  ok(u && u.form === u.route[3] && u.level === 14 && u.bias.beast > 0.9 && H.egg === null && R.use(H) === null, "taking it into a run spends it: " + u.form + ", job level " + u.level + ", and its diet goes with it");
  ok(R.newEgg(H, rngOf(8)) && H.egg.stage === 0 && H.count === 6, "and a new egg is waiting"); }
{ const H = R.blank(); R.newEgg(H, rngOf(2)); ok(!R.ready(H) && R.use(H) === null, "an unhatched egg cannot be taken into a run"); }
/* in the field its diet still pulls */
{ const Prog = D.net.progression.Progression, rng = rngOf(77), self = { data: D, sim: () => ({ rng }) };
  const pick = { to: "metalgreymon", kind: "standard" }; let other = 0, none = 0; const seen = {};
  for (let i = 0; i < 1000; i++) { const r = Prog.prototype._hatchRoute.call(self, { form: "greymon", hatchBias: { fire: 0.9 } }, pick); if (r) { other++; seen[r.to] = 1; } else none++; }
  ok(Prog.prototype._hatchRoute.call(self, { form: "greymon" }, pick) === null, "an ordinary partner is not touched");
  ok(none > other && (other > 0 || Object.keys(seen).length === 0), "a Hatchery Greymon raised on fire still mostly becomes what its care earned (" + none + " of 1000)" + (other ? ", and " + other + " times takes another fire route: " + Object.keys(seen).join(", ") : "; Greymon has no other fire Ultimate in this tree"));
  let off = 0; for (let i = 0; i < 1000; i++) if (Prog.prototype._hatchRoute.call(self, { form: "greymon", hatchBias: { nature: 1 } }, pick)) off++;
  const natureRoutes = ((D.EVO_TREE.branches.greymon) || []).filter(b => D.SPECIES[b.to] && D.moveFamilyOf(b.to) === "nature" && b.kind !== "standard").length;
  ok(natureRoutes ? off > 0 : off === 0, natureRoutes ? "one raised on nature data sometimes takes a nature route instead (" + off + " of 1000)" : "a diet with no matching route changes nothing"); }
console.log(failed ? "hatchery-test: " + failed + " failed" : "hatchery-test: all passed");
process.exit(failed ? 1 : 0);
