/* node scripts/bloodline-test.js : Bloodlines (17z33): one Hatchery line, parent to child; traits earned in runs, carried by every egg after, the family tree, and what they do in a run */
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
const B = D.BLOODLINE;
/* raise one to Champion and take it into a run */
function raise(H, seed) { R.newEgg(H, rngOf(seed)); H.data = { fire: 1e9 }; for (let i = 0; i < 6; i++) { const r = R.feed(H, "fire", 1e9, "day", rngOf(seed + i)); if (!r.ok) break; } return R.use(H); }
let H = R.clean(R.blank());
const s1 = raise(H, 11);
ok(s1 && s1.blood && s1.blood.gen === 1 && Object.keys(s1.blood.traits).length === 0, "the first one is generation 1, with no traits yet");
ok(H.blood.live && H.blood.live.gen === 1, "the line knows it's out on a run");
/* an ordinary run: nothing */
let got = R.runEnded(H, { peak: "Champion", seconds: 300, nights: 0 }, rngOf(1));
ok(got && got.gen === 1 && !got.earned.length && !got.why, "a short run passes nothing on");
ok(H.blood.tree.length === 1 && H.blood.tree[0].gen === 1, "but it's in the family tree");
ok(R.runEnded(H, { mega: true }, rngOf(1)) === null, "and a run without a Hatchery Digimon counts for nothing");
/* a great run: one trait */
const s2 = raise(H, 12);
ok(s2.blood.gen === 2, "the next is generation 2");
got = R.runEnded(H, { peak: "Champion", seconds: B.seconds + 5 }, rngOf(2));
ok(got.earned.length === B.great && /lasted/.test(got.why), "lasting " + B.seconds / 60 + " minutes passes on " + B.great + " (" + got.earned.join() + ")");
/* Mega: two */
const s3 = raise(H, 13);
ok(Object.keys(s3.blood.traits).length >= 1, "generation 3 carries what generation 2 earned (" + JSON.stringify(s3.blood.traits) + ")");
got = R.runEnded(H, { mega: true, peak: "Mega" }, rngOf(3));
ok(got.earned.length === B.mega && got.why === "reached Mega", "reaching Mega passes on " + B.mega + " (" + got.earned.join() + ")");
const s4 = raise(H, 14);
ok(Object.values(s4.blood.traits).reduce((a, b) => a + b, 0) === B.great + B.mega, "and generation 4 carries all of them (" + JSON.stringify(s4.blood.traits) + ")");
R.runEnded(H, { nights: B.nights }, rngOf(4));
ok(/nights/.test(H.blood.tree[H.blood.tree.length - 1].why), "holding " + B.nights + " nights in Night Siege counts");
raise(H, 15); R.runEnded(H, { story: true }, rngOf(5)); ok(/story/.test(H.blood.tree[H.blood.tree.length - 1].why), "so does finishing the story");
raise(H, 16); R.runEnded(H, { peak: "Ultimate" }, rngOf(6)); ok(/Ultimate/.test(H.blood.tree[H.blood.tree.length - 1].why), "and reaching Ultimate");
/* mostly the stat its element favours */
{ const cnt = {}; const rng = rngOf(9); for (let i = 0; i < 2000; i++) { const t = R.pickTrait({ traits: {} }, "agumon", rng); cnt[t] = (cnt[t] || 0) + 1; }
  ok(cnt.str > 700 && cnt.agi > 200 && cnt.power > 200 && !cnt.int, "a fire Digimon mostly passes on STR (" + JSON.stringify(cnt) + ")"); }
/* caps */
{ const L = R.clean(R.blank()); for (let g = 0; g < 30; g++) { raise(L, 100 + g); R.runEnded(L, { mega: true }, rngOf(200 + g)); }
  const tot = Object.values(L.blood.traits).reduce((a, b) => a + b, 0);
  ok(tot === B.cap && Object.values(L.blood.traits).every(v => v <= B.max), "the line tops out at " + B.cap + " trait levels, none past " + B.max + " (" + JSON.stringify(L.blood.traits) + ")");
  ok(L.blood.tree.length <= 40 && L.blood.tree[L.blood.tree.length - 1].gen === 30, "the family tree keeps the latest generations (" + L.blood.tree.length + ")");
  ok(R.traitText("str", 3) === "STR +" + 3 * B.stat && /Power \+\d+%/.test(R.traitText("power", 2)), "traits read as words and numbers: " + R.traitText("str", 3) + ", " + R.traitText("power", 2) + ", " + R.traitText("skill", 1)); }
/* three slots, one data pool, each its own line (Isaac) */
{ const S = R.clean(R.blank());
  ok(S.slots.length === B.slots && S.sel === 0, B.slots + " slots, slot 1 on the stand");
  R.newEgg(S, rngOf(1)); R.select(S, 1); R.newEgg(S, rngOf(2)); R.select(S, 2); R.newEgg(S, rngOf(3));
  ok(S.slots.every(x => x.egg) && new Set(S.slots.map(x => x.egg)).size === 3, "each slot has its own egg");
  S.data = { fire: 100 }; R.select(S, 1); R.feed(S, "fire", 60, "day", rngOf(4));
  ok(S.slots[1].egg.prog === 60 && S.slots[0].egg.prog === 0 && S.data.fire === 40, "data goes where you put it: all of it into one, from one shared pool");
  S.slots[0].blood.traits = { str: 2 };
  ok(!S.slots[1].blood.traits.str, "each slot is its own bloodline");
  const old = R.clean({ data: { ice: 5 }, egg: { tier: "common", stage: 2, form: "koromon", line: "agumon", route: [], prog: 0, n: 1, fed: {}, now: {}, sky: {}, shell: 1 }, blood: { gen: 3, traits: { power: 1 }, tree: [] }, count: 1, raised: 0, used: 0 });
  ok(old.slots[0].egg.form === "koromon" && old.slots[0].blood.gen === 3 && old.slots.length === B.slots, "a save from before keeps its Digimon and line in slot 1"); }
/* death rules (Isaac) */
function lineWith(traits, seed) { const L = R.clean(R.blank()); L.blood.traits = Object.assign({}, traits); L.blood.gen = 4; raise(L, seed || 50); return L; }
{ let L = lineWith({ str: 3, power: 2 });
  let x = R.runEnded(L, { died: true, mega: true, peak: "Mega" }, rngOf(1));
  ok(x.fate === "valorous" && x.earned.length === B.mega && /valorous/.test(x.why), "fell after reaching Mega: a valorous death, and the line earns " + B.mega);
  L = lineWith({ str: 3, power: 2 }); x = R.runEnded(L, { died: true, diedStage: "Ultimate" }, rngOf(1));
  ok(x.fate === "lost" && x.lost.length === B.lose.Ultimate && L.blood.traits.str === 2 && L.blood.gen === 5, "fell as an Ultimate: the line goes on, " + B.lose.Ultimate + " level lost (the biggest first: " + x.lost + ")");
  L = lineWith({ str: 3, power: 2 }); x = R.runEnded(L, { died: true, diedStage: "Champion" }, rngOf(1));
  ok(x.lost.length === B.lose.Champion && Object.values(L.blood.traits).reduce((a, b) => a + b, 0) === 5 - B.lose.Champion, "fell as a Champion: " + B.lose.Champion + " levels lost");
  ok(x.earned.length === 0, "and nothing earned");
  L = lineWith({ str: 3, power: 2 }); const lineWas = L.blood.line; x = R.runEnded(L, { died: true, diedStage: "Rookie", seconds: 5000 }, rngOf(1));
  ok(x.fate === "erased" && L.blood.gen === 0 && !Object.keys(L.blood.traits).length && L.blood.line === lineWas + 1, "fell as a Rookie: the whole line is erased, and a new one starts (line " + L.blood.line + ")");
  ok(L.blood.ended && L.blood.ended[0].traits.str === 3, "the end of the old line is remembered");
  L = lineWith({}); x = R.runEnded(L, { died: true, diedStage: "Champion" }, rngOf(1)); ok(x.fate === "lost" && x.lost.length === 0, "a line with no traits loses nothing more");
  L = lineWith({ str: 1 }); x = R.runEnded(L, { peak: "Ultimate" }, rngOf(1)); ok(x.earned.length === B.great && !x.fate, "a run it survives earns as before"); }
/* the generation that ran is judged in its own slot, whichever is on the stand now */
{ const S = R.clean(R.blank()); R.select(S, 2); raise(S, 60); S.slots[2].blood.traits = { str: 2 }; R.select(S, 0);
  const x = R.runEnded(S, { died: true, diedStage: "Ultimate" }, rngOf(1));
  ok(x && S.slots[2].blood.traits.str === 1 && S.sel === 0, "it's judged in the slot it came from (slot 3), and slot 1 stays on the stand"); }
/* in a run: the sim uses them */
{ const sim = new mission.MissionSim({ seed: 3, hz: auth.TICK_HZ, data: D }); const A = new auth.Authority({ sim: sim, seed: 3 });
  sim.phase = "playing"; sim.localId = "local";
  A.join({ id: "local", kind: "host-client", hasTamer: true, form: "greymon", x: 0, y: 0, hp: 100, maxHp: 100, level: 5, xp: 0, xpNext: sim._xpNeeded(5), weapons: [] });
  const p = sim.players[0]; sim._statsKey = null;
  const a0 = sim._attrsEff(p).str, d0 = sim._stats(p).damageMul;
  p.blood = sim._bloodClean({ gen: 4, traits: { str: 2, power: 3, learn: 1, bogus: 9 } }); p._statsKey = null;
  ok(!p.blood.traits.bogus, "only real traits get in");
  ok(sim._attrsEff(p).str === a0 + 2 * B.stat, "STR traits add to STR (" + a0 + " -> " + sim._attrsEff(p).str + ")");
  ok(Math.abs(sim._stats(p).damageMul / d0 - (1 + 3 * B.power) * (sim._derived ? 1 : 1)) < 0.2, "Power raises damage");
  ok(Math.abs(sim._bloodXp(p) - (1 + B.learn)) < 1e-9, "Quick Study raises XP (x" + sim._bloodXp(p) + ")");
  ok(sim._attrParts(p).blood.str === 2 * B.stat, "and the status window can say where the STR came from"); }
console.log(failed ? "\n" + failed + " FAILED" : "\nbloodline-test: all passed");
process.exit(failed ? 1 : 0);
