/* node scripts/cards-test.js : level-up cards (random offer, new skills only from cards, fall-through to upgrades) and the breather ending early */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) { console.log("load " + f + ": " + e.message); } });
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const sim = new mission.MissionSim({ seed: 41, hz: auth.TICK_HZ, data: D }), a = new auth.Authority({ sim: sim, seed: 41 });
sim.phase = "playing"; sim.time = 100; sim.skillTree = true;
if (!sim.players[0]) { sim.players.push({ id: "local" }); sim.localId = "local"; }
const p = sim.players[0], SK = D.SKILLS;
Object.assign(p, { form: "agumon", level: 5, hp: 100, maxHp: 100, x: 0, y: 0, mx: 0, my: 0, faint: 0, downed: false, hasTamer: true, kind: "human", skills: { pepperBreath: 3 }, skillPoints: 0, xp: 0, xpNext: 10, monInvuln: 0 });
sim._syncMoves(p);
/* a level-up deals three different cards, all of them usable */
p.xp = 10; sim._tryLevel(p);
ok(p.skillPoints === 1 && p.skillOffer && p.skillOffer.length === 3 && new Set(p.skillOffer).size === 3, "a job level deals three different cards: " + p.skillOffer.map(id => (D.WEAPONS[id] || SK.PASSIVE_BY[id]).name).join(", "));
ok(p.skillOffer.every(id => !SK.blocked(D, p.form, p.skills, id)), "every card can take the point");
ok(p.monInvuln >= 4.9 && sim.enemyFreeze >= 4.9, "and the breather starts");
/* random: many deals cover many skills */
const seen = {}; for (let i = 0; i < 200; i++) SK.offer(D, "agumon", p.skills, sim.rng, 3).forEach(id => seen[id] = 1);
ok(Object.keys(seen).length >= 5, "the deals vary (" + Object.keys(seen).length + " different skills over 200 deals)");
/* a new skill that is not on a card is refused; an owned one is fine */
const all = []; const t = SK.tree(D, p.form, p.skills); SK.SLOTS.forEach(s => t.slots[s].forEach(e => all.push(e.id))); SK.PASSIVES.forEach(x => all.push(x.id));
const offCard = all.find(id => !(p.skills[id] > 0) && p.skillOffer.indexOf(id) < 0 && !SK.blocked(D, p.form, p.skills, id));
let r = a.act({ type: "skill.add", id: p.id, skill: offCard });
ok(!r.ok && /cards/.test(r.reason), "a new skill that is not on a card is refused (" + offCard + ")");
r = a.act({ type: "skill.add", id: p.id, skill: "pepperBreath" });
ok(r.ok && p.skills.pepperBreath === 4 && p.skillPoints === 0 && !p.skillOffer, "skipping the cards, the point goes into a known move, and the offer is used up");
/* taking a new skill from a card */
p.xp = p.xpNext; sim._tryLevel(p);
const fresh = p.skillOffer.find(id => !(p.skills[id] > 0));
if (fresh) { r = a.act({ type: "skill.add", id: p.id, skill: fresh }); ok(r.ok && p.skills[fresh] === 1, "a new skill is learned from its card (" + ((D.WEAPONS[fresh] || SK.PASSIVE_BY[fresh]).name) + ")"); }
else ok(true, "(this deal had no new skill)");
/* two points: spending one deals again */
p.skillPoints = 2; p.skillOffer = null; sim._rollOffer(p); const first = p.skillOffer.slice();
a.act({ type: "skill.add", id: p.id, skill: first[0] });
ok(p.skillPoints === 1 && p.skillOffer && p.skillOffer.length === 3, "with a point left, new cards are dealt");
/* a new form deals again */
a.progression._applyForm(p, "greymon", "standard");
ok(p.skillOffer === null, "digivolving clears the cards so the new form's moves can be offered");
/* closing the window early ends the breather */
p.monInvuln = 5; sim.enemyFreeze = 5;
r = a.act({ type: "breather.end", id: p.id });
ok(r.ok && p.monInvuln <= 0.35 && sim.enemyFreeze === 0, "closing the window ends the breather at once");
console.log(failed ? "cards-test: " + failed + " failed" : "cards-test: all passed");
process.exit(failed ? 1 : 0);
