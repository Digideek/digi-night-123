/* node scripts/kit-test.js : signatures and techniques (moves.js KIT): every line has one, Babies can learn them, and each new kind of attack does what it says */
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
const SK = D.SKILLS, W = D.WEAPONS;

/* the tree */
const lines = Object.keys(D.MOVE_LINES), specials = lines.map(k => D.MOVE_LINES[k].special);
ok(lines.length >= 19 && specials.every(id => id && W[id] && W[id].grows), "all " + lines.length + " lines have a signature move");
ok(new Set(specials).size === specials.length, "and no two lines share one");
ok(D.MOVE_TECHS.length === 4 && D.MOVE_TECHS.every(id => W[id] && D.ELEMENTS.moveElement(id, "agumon") === null), "four techniques, none with an element: " + D.MOVE_TECHS.map(id => W[id].name).join(", "));
let babies = 0, good = 0;
for (const k of lines) {
  const baby = D.MOVE_LINES[k].forms ? D.MOVE_LINES[k].forms[0] : (k === "agumon" ? "botamon" : "punimon");
  if (!D.SPECIES[baby] && !(global.EVO_TREE.species || {})[baby]) continue;
  babies++;
  const open = []; const t = SK.tree(D, baby, { bubbleBlow: 1 });
  SK.SLOTS.forEach(s => t.slots[s].forEach(e => { if (!SK.blocked(D, baby, { bubbleBlow: 1 }, e.id)) open.push(e.id); }));
  if (open.indexOf(D.MOVE_LINES[k].special) >= 0 && D.MOVE_TECHS.every(id => open.indexOf(id) >= 0) && open.length === 6) good++;
}
ok(babies > 0 && good === babies, "a Baby of every line can learn six moves now (Bubble Blow, its signature, four techniques): " + good + "/" + babies);
const tn = SK.tree(D, "numemon", {});
ok(tn.slots.special.length === 1 && tn.slots.special[0].id === "gooTrap", "a form outside the named lines gets its element's signature (Numemon: " + W.gooTrap.name + ")");
const act = SK.active(D, { bubbleBlow: 2, babyBurner: 3, byteBurst: 1, glitchChain: 4, pepperBreath: 1 });
ok(act.length === 4 && act.filter(a => a.slot === "tech").length === 2 && act.some(a => a.id === "pepperBreath") && !act.some(a => a.id === "bubbleBlow"), "every learned signature and technique fires; shots still replace one another");
ok(D.ELEMENTS.moveElement("babyBurner", "botamon") === "fire" && D.ELEMENTS.moveElement("icicleFang", "punimon") === "ice", "a signature carries its line's element");

/* the kinds */
function world(form, id, lvl) {
  const sim = new mission.MissionSim({ seed: 5, hz: auth.TICK_HZ, data: D }); new auth.Authority({ sim: sim, seed: 5 });
  sim.phase = "playing"; sim.time = 60; sim.skillTree = true;
  if (!sim.players[0]) { sim.players.push({ id: "local" }); sim.localId = "local"; }
  const p = sim.players[0];
  Object.assign(p, { form: form, level: 5, hp: 100, maxHp: 100, x: 0, y: 0, mx: 0, my: 0, facing: 1, faint: 0, downed: false, hasTamer: true, kind: "human", moving: false, skills: {} });
  p.skills[id] = lvl || 1; sim._syncMoves(p);
  sim._roll = function () { return 1; };
  return { sim: sim, p: p };
}
let nid = 100;
function foe(sim, x, y) { const e = { _id: nid++, type: "numemon", x: x, y: y, hp: 1e6, maxHp: 1e6, radius: 12, flash: 0, hitCd: 0, hitCdM: 0 }; sim.enemies.push(e); return e; }
function lost(e) { return Math.round(1e6 - e.hp); }
function spin(sim, p, secs) { const ev = []; for (let i = 0; i < secs * 25; i++) { sim._updateWeapons(p, 0.04); sim._updateBullets(0.04); sim.time += 0.04; while (sim.events.length) ev.push(sim.events.shift()); } return ev; }
function has(ev, k) { return ev.some(e => e.type === "fx" && e.k === k); }

{ const { sim, p } = world("botamon", "babyBurner"); const a = foe(sim, 60, 0), b = foe(sim, 100, 4), c = foe(sim, 60, 80);
  const ev = spin(sim, p, 0.5);
  ok(lost(a) > 0 && lost(b) > 0 && lost(c) === 0 && has(ev, "beam"), "beam (Baby Burner): both enemies on the line are hit, the one off to the side is not"); }
{ const { sim, p } = world("punimon", "icicleFang"); const a = foe(sim, 120, 0), b = foe(sim, 140, 10);
  let ev = spin(sim, p, 0.2); const early = lost(a);
  ev = ev.concat(spin(sim, p, 0.5));
  ok(early === 0 && lost(a) > 0 && lost(b) > 0 && has(ev, "drop") && has(ev, "boom"), "strike (Icicle Fang): nothing at first, then it lands and catches both"); }
{ const { sim, p } = world("jyarimon", "hazardMine"); const a = foe(sim, 140, 0);
  let ev = spin(sim, p, 0.3); const m = sim.bullets.filter(b => b.mine);
  ok(m.length === 1 && lost(a) === 0 && Math.abs(m[0].x - 84) < 2, "mine (Hazard Mine): it is laid part of the way to the enemy and waits");
  a.x = m[0].x + 4; ev = spin(sim, p, 0.2);
  ok(lost(a) > 0 && has(ev, "boom"), "and goes off when the enemy walks onto it");
  a.x = 140; spin(sim, p, 20);
  ok(sim.bullets.filter(b => b.mine).length <= W.hazardMine.levels[0].max, "never more than " + W.hazardMine.levels[0].max + " on the ground at once"); }
{ const { sim, p } = world("choromon", "darknessGear"); const a = foe(sim, 70, 0);
  spin(sim, p, 0.3); const one = lost(a);
  spin(sim, p, 1.6); const g = sim.bullets.filter(b => b.back != null).length;
  ok(one > 0 && lost(a) >= one * 2, "boomerang (Darkness Gear): it hits on the way out and again on the way back (" + one + ", then " + lost(a) + ")");
  ok(g === 0, "and is caught when it gets home"); }
{ const { sim, p } = world("kuramon", "crazyGiggle"); const a = foe(sim, 30, 0), b = foe(sim, -20, 25), c = foe(sim, 200, 0);
  const ev = spin(sim, p, 0.3);
  ok(lost(a) > 0 && lost(b) > 0 && lost(c) === 0 && has(ev, "burst"), "burst (Crazy Giggle): everything close is hit on every side, nothing far away"); }
{ const { sim, p } = world("pabumon", "staticJump", 10); const a = foe(sim, 80, 0), b = foe(sim, 150, 0), c = foe(sim, 210, 30), far = foe(sim, 700, 0);
  const ev = spin(sim, p, 0.3), ch = ev.find(e => e.k === "chain");
  ok(lost(a) > lost(b) && lost(b) > lost(c) && lost(c) > 0 && lost(far) === 0 && ch && ch.pts.length === 8, "chain (Static Jump): it jumps down the row, weaker each time, and not to one out of reach"); }
{ const { sim, p } = world("nyokimon", "emberFeathers", 10); const a = foe(sim, 60, 0);
  let most = 0; for (let i = 0; i < 8; i++) { sim._updateWeapons(p, 0.04); most = Math.max(most, sim.bullets.length); }
  ok(most === 6, "fan (Ember Feathers): a spray of " + W.emberFeathers.levels[4].count + " at the top level"); }
{ const a1 = world("botamon", "byteBurst"), a2 = world("greymon", "byteBurst"); const e1 = foe(a1.sim, 30, 0), e2 = foe(a2.sim, 30, 0);
  a1.p.stats = a2.p.stats = null; spin(a1.sim, a1.p, 0.2); spin(a2.sim, a2.p, 0.2);
  ok(lost(e2) > lost(e1) * 2.5, "the same technique hits harder on a Champion than on a Baby (" + lost(e1) + " vs " + lost(e2) + ")"); }
{ const { sim, p } = world("botamon", "byteBurst"); const ev = spin(sim, p, 5);
  ok(!has(ev, "burst") && !sim.bullets.length, "with nothing in reach they hold their fire"); }
console.log(failed ? "kit-test: " + failed + " failed" : "kit-test: all passed");
process.exit(failed ? 1 : 0);
