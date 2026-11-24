/* node scripts/signature-test.js : signature sets (17z33, moves.js SIG_SETS). Every line's Baby,
 * In-Training, Rookie and Champion has moves of its own; the growing move replaces the one it grew
 * from; the Rookie choice locks the other side (and what it grows into) for the run. */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "weather", "seasons"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const SK = D.SKILLS, W = D.WEAPONS, G = D.SIG_INFO, L = D.MOVE_LINES;

/* ---- the sets ---- */
const lines = Object.keys(L), all = [];
lines.forEach(k => (L[k].sigs || []).forEach(id => all.push(id)));
const hasStage = (k, st) => (L[k].forms || (k === "agumon" ? ["metalgreymon", "wargreymon"] : k === "gabumon" ? ["weregarurumon", "metalgarurumon"] : [])).some(f => D.moveStageIdx(f) === st);
ok(lines.every(k => (L[k].sigs || []).length === 12 + (hasStage(k, 4) ? 4 : 0) + (hasStage(k, 5) ? 4 : 0)),
  "every one of the " + lines.length + " lines has 12 signature moves to Champion, plus 4 for each Ultimate and Mega it has (" + all.length + " in all)");
ok(new Set(all).size === all.length && new Set(all.map(id => W[id].name)).size === all.length, "no two share an id or a name");
ok(all.every(id => W[id] && W[id].grows && W[id].sig && W[id].summary && D.ELEMENTS.moveElement(id, "agumon")), "each is a real move with card text and an element");
const byTier = [0, 0, 0, 0, 0, 0]; all.forEach(id => byTier[G[id].tier]++);
ok(byTier.slice(0, 4).join() === [2, 2, 4, 4].map(n => n * lines.length).join(), "per line: 2 Baby, 2 In-Training, 4 Rookie (one is a choice), 4 Champion (one per choice)");
ok(D.ELEMENTS.moveElement("ashSnort", "gotsumon") === "fire" && D.ELEMENTS.moveElement("thunderCall", "tentomon") === "machine" && D.ELEMENTS.moveElement("cogVolley", "hagurumon") === "machine",
  "a move can carry its own element (Ash Snort is fire, Thunder Call is electric)");
ok(W.meteorBreath.drop === "fall" && W.stompQuake.drop === "rise", "drops fall or rise as written");

/* ---- the tree, stage by stage (Agumon line) ---- */
function openIds(form, skills) { const t = SK.tree(D, form, skills), out = []; t.slots.special.forEach(e => { if (!SK.blocked(D, form, skills, e.id)) out.push(e.id); }); return out; }
let sk = { bubbleBlow: 1 };
let o = openIds("botamon", sk);
ok(o.includes("fizzBubbles") && o.includes("fuzzPuff") && !o.includes("boilingBubbles"), "Botamon can learn Fizz Bubbles and Fuzz Puff, not Koromon's yet");
ok(/Reach In-Training/.test(SK.blocked(D, "botamon", sk, "boilingBubbles")), "Koromon's moves say when they open");
sk.fizzBubbles = 4; SK.learned(D, sk, "fizzBubbles"); sk.fuzzPuff = 2; SK.learned(D, sk, "fuzzPuff");
o = openIds("koromon", sk);
ok(o.includes("boilingBubbles") && o.includes("bounceDrop"), "as Koromon: Boiling Bubbles and Bounce Drop open");
ok(/Grows from Fizz Bubbles/.test(SK.sigNote(D, sk, "boilingBubbles")), "the card says what it grows from: " + SK.sigNote(D, sk, "boilingBubbles"));
sk.boilingBubbles = (sk.boilingBubbles || 0) + 1; SK.learned(D, sk, "boilingBubbles");
ok(!(sk.fizzBubbles > 0) && sk["!fizzBubbles"] === 2 && sk.boilingBubbles === 3, "learning it replaces Fizz Bubbles and keeps most of its level (Lv 4 -> Lv " + sk.boilingBubbles + ")");
ok(!SK.tree(D, "koromon", sk).slots.special.some(e => e.id === "fizzBubbles"), "and Fizz Bubbles leaves the tree");
ok(sk.fuzzPuff === 2, "Fuzz Puff, a keeper, stays as it was");
sk.boilingBubbles = 2;
ok(/Needs Boiling Bubbles Lv 3/.test(SK.blocked(D, "agumon", sk, "flameGargle")), "Agumon's Flame Gargle needs Boiling Bubbles at Lv 3 first");
sk.boilingBubbles = 3;
o = openIds("agumon", sk);
ok(o.includes("flameGargle") && o.includes("dashClaw") && o.includes("scorchMark") && o.includes("stompQuake"), "as Agumon: Flame Gargle, the Dash Claw / Scorch Mark choice and Stomp Quake open");
ok(/Choice: locks Scorch Mark/.test(SK.sigNote(D, sk, "dashClaw")), "the choice says what it locks");
sk.dashClaw = 1; SK.learned(D, sk, "dashClaw");
ok(/Locked: you took Dash Claw/.test(SK.blocked(D, "agumon", sk, "scorchMark")), "taking Dash Claw locks Scorch Mark");
ok(/Locked: you took Dash Claw/.test(SK.blocked(D, "greymon", sk, "wildfireField")), "and Scorch Mark's Champion move with it");
ok(/Needs Dash Claw Lv 3/.test(SK.blocked(D, "greymon", sk, "hornCharge")), "Horn Charge, from Dash Claw, needs it at Lv 3");
sk.dashClaw = 3; sk.hornCharge = 1; SK.learned(D, sk, "hornCharge");
ok(!(sk.dashClaw > 0) && sk.hornCharge === 2 && /Locked: you took Horn Charge/.test(SK.blocked(D, "greymon", sk, "scorchMark")), "Dash Claw grows into Horn Charge, and the lock now names Horn Charge");
ok(SK.blocked(D, "greymon", sk, "tailSweep") === null && SK.blocked(D, "greymon", sk, "stompQuake") === null, "the keepers are always open");
for (let i = 0; i < 200; i++) { const off = SK.offer(D, "greymon", sk, Math.random, 3); if (off.some(id => id === "scorchMark" || id === "wildfireField" || id === "fizzBubbles")) { ok(false, "a level-up card offered a locked or grown move"); break; } if (i === 199) ok(true, "200 level-up offers: never a locked or grown move"); }
const act = SK.active(D, sk).map(a => a.id);
ok(act.includes("hornCharge") && act.includes("fuzzPuff") && act.includes("boilingBubbles") && !act.includes("dashClaw"), "every learned signature fires on its own; grown ones don't");

/* ---- Ultimate and Mega: the growing move and the chosen path keep growing ---- */
ok(G.sunMeteor.up === "hatchBarrage" && G.hatchBarrage.up === "meteorBreath" && G.cycloneDrill.up === "tridentLunge" && G.tridentLunge.up === "hornCharge" && G.infernoCarpet.up === "napalmField",
  "Agumon's line grows on: Meteor Breath -> Hatch Barrage -> Sun Meteor; Horn Charge -> Trident Lunge -> Cyclone Drill");
ok(/Locked: you took Horn Charge/.test(SK.blocked(D, "metalgreymon", sk, "napalmField")) && /Locked: you took Horn Charge/.test(SK.blocked(D, "wargreymon", sk, "infernoCarpet")),
  "the locked side stays locked all the way to Mega");
ok(/Needs Horn Charge Lv 3/.test(SK.blocked(D, "metalgreymon", sk, "tridentLunge")) && SK.blocked(D, "metalgreymon", sk, "ironWingGust") === null && /Reach Mega/.test(SK.blocked(D, "metalgreymon", sk, "shieldBash")),
  "MetalGreymon: Trident Lunge needs Horn Charge Lv 3, Iron Wing Gust is open, WarGreymon's moves wait for Mega");
ok(!G.hawkmonQuillStorm && (L.hawkmon.sigs || []).length === 12 && (L.wormmon.sigs || []).length === 16, "a line without an Ultimate or Mega stops there (Hawkmon's at Champion, Wormmon's at DinoBeemon)");
ok(W.sunMeteor.levels[0].damage > W.hatchBarrage.levels[0].damage && W.hatchBarrage.levels[0].damage > W.meteorBreath.levels[0].damage, "each step of a growing move hits harder");

/* ---- auto-picks (CPU partners, rivals) keep to the rules, every line ---- */
let bad = 0, runs = 0;
for (const k of lines) {
  const forms = L[k].forms || (k === "agumon" ? ["botamon", "koromon", "agumon", "greymon", "metalgreymon", "wargreymon"] : ["punimon", "tsunomon", "gabumon", "garurumon", "weregarurumon", "metalgarurumon"]);
  const byStage = {}; forms.forEach(f => { const s = D.moveStageIdx(f); if (s >= 0 && s <= 5 && !byStage[s]) byStage[s] = f; });
  for (let r = 0; r < 4; r++) {
    const s2 = { bubbleBlow: 1 };
    for (let st = 0; st <= 5; st++) {
      const f = byStage[st]; if (!f) continue;
      for (let n = 0; n < 12; n++) { const id = SK.autoPick(D, f, s2); if (!id) break; const fresh = !(s2[id] > 0); s2[id] = (s2[id] || 0) + 1; if (fresh) SK.learned(D, s2, id); }
    }
    runs++;
    L[k].sigs.forEach(id => { const g = G[id]; if (g.rival && s2[id] > 0 && s2[g.rival] > 0) bad++; if (g.up && s2[id] > 0 && s2[g.up] > 0) bad++; });
  }
}
ok(bad === 0, runs + " auto-built partners across every line: never both sides of a choice, never a move next to the one it grew into");

/* ---- through the simulation: a skill point spent by intent ---- */
const sim = new mission.MissionSim({ seed: 7, hz: auth.TICK_HZ, data: D }); const A = new auth.Authority({ sim: sim, seed: 7 });
sim.phase = "playing"; sim.time = 60; sim.skillTree = true;
A.join({ id: "local", kind: "host-client", hasTamer: true, form: "agumon", x: 0, y: 0, mx: 0, my: 0, hp: 50, maxHp: 50, tamerHp: 50, tamerMaxHp: 50, level: 5 });
const p = sim.player("local");
p.form = "agumon"; p.hatchLeft = 0; p.skills = { bubbleBlow: 1, boilingBubbles: 3 }; p.skillPoints = 3;
p.skillOffer = ["flameGargle", "dashClaw", "scorchMark"];
let res = A.act({ type: "skill.add", id: "local", skill: "flameGargle" });
ok(res && res.ok && !(p.skills.boilingBubbles > 0) && p.skills.flameGargle === 2, "spent through the simulation, Flame Gargle replaces Boiling Bubbles (" + JSON.stringify(res && res.reason || "") + ")");
p.skillOffer = ["dashClaw", "scorchMark", "stompQuake"];
res = A.act({ type: "skill.add", id: "local", skill: "scorchMark" });
p.skillOffer = ["dashClaw", "stompQuake", "pw"];
const res2 = A.act({ type: "skill.add", id: "local", skill: "dashClaw" });
ok(res.ok && !res2.ok && /Locked/.test(res2.reason || ""), "the simulation refuses the other side of a choice: " + res2.reason);
ok((p.weapons || []).some(w => w.id === "flameGargle") && (p.weapons || []).some(w => w.id === "scorchMark"), "and the partner fires the moves it now knows");

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
