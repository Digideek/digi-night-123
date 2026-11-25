/* node scripts/equip-test.js : equipped moves (17z33, Isaac). Only so many learned moves fire at once:
 * 2 for a Baby or In-Training, 3 for a Rookie, 4 from Champion, +1 everywhere with the Lab's Move Slot.
 * Swap any time (skill.equip); a bigger move takes its smaller one's place; a move learned with every
 * slot full waits (skill.full); a bigger move needs the one before it at Lv 7; the move bar reads wc. */
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
const SK = D.SKILLS;

ok([0, 1, 2, 3, 4, 5].map(s => SK.slotCount(s)).join() === "2,2,3,4,4,4", "slots by stage: Baby 2, In-Training 2, Rookie 3, Champion 4, Ultimate 4, Mega 4");
ok([0, 2, 3].map(s => SK.slotCount(s, 1)).join() === "3,4,5", "with the Move Slot: 3 as a Baby, 4 as a Rookie, 5 from Champion");
ok(SK.RULES.prereqLevel === 7 && SK.MAX === 10, "moves go to Lv 10, and a bigger move needs the one before it at Lv 7");

/* a Rookie Agumon that knows five moves it could fire */
function newSim(lab) {
  const sim = new mission.MissionSim({ seed: 7, hz: auth.TICK_HZ, data: D }); const A = new auth.Authority({ sim: sim, seed: 7 });
  sim.phase = "playing"; sim.time = 60; sim.skillTree = true;
  const evs = []; const e0 = sim.emit.bind(sim); sim.emit = e => { evs.push(e); return e0(e); }; sim._evs = evs;
  A.join({ id: "local", kind: "host-client", hasTamer: true, form: "agumon", x: 0, y: 0, mx: 0, my: 0, hp: 50, maxHp: 50, tamerHp: 50, tamerMaxHp: 50, level: 10, lab: lab || {} });
  const p = sim.player("local"); p.form = "agumon"; p.hatchLeft = 0;
  return { sim, A, p };
}
let { sim, A, p } = newSim();
const t = SK.tree(D, "agumon", {}), pick = [];
SK.SLOTS.forEach(sl => { const e = t.slots[sl].find(x => x.tier <= 2 && !(D.SIG_INFO[x.id] && (D.SIG_INFO[x.id].up || D.SIG_INFO[x.id].rival))); if (e) pick.push(e.id); });
const keepers = t.slots.special.filter(x => x.tier <= 2 && !(D.SIG_INFO[x.id] && (D.SIG_INFO[x.id].up || D.SIG_INFO[x.id].rival))).map(x => x.id);
keepers.forEach(id => { if (pick.indexOf(id) < 0) pick.push(id); });
p.skills = {}; pick.forEach(id => { p.skills[id] = 1; });
sim._syncMoves(p);
const can = SK.active(D, p.skills).map(a => a.id);
ok(can.length >= 4, "Agumon knows " + can.length + " moves it could fire (" + can.join(", ") + ")");
ok(p.weapons.length === 3 && p.equip.length === 3 && p.equipN === 3, "as a Rookie only 3 are equipped and fire (" + p.equip.join(", ") + ")");
ok(p.weapons.map(w => w.id).join() === p.equip.join(), "what fires is exactly what's equipped, in order");

/* swapping */
const out = can.find(id => p.equip.indexOf(id) < 0), first = p.equip[0];
let r = A.act({ type: "skill.equip", id: "local", skill: out });
ok(r && !r.ok && /full/.test(r.reason), "equipping a 4th with every slot full asks which to swap out (" + (r && r.reason) + ")");
r = A.act({ type: "skill.equip", id: "local", skill: out, drop: first });
ok(r && r.ok && p.equip.indexOf(out) >= 0 && p.equip.indexOf(first) < 0 && p.weapons.some(w => w.id === out) && !p.weapons.some(w => w.id === first), "swap: " + out + " in, " + first + " out, and the moves that fire follow");
r = A.act({ type: "skill.equip", id: "local", skill: out, off: true });
ok(r && r.ok && p.equip.length === 2 && p.weapons.length === 2, "unequip: down to 2, and only 2 fire");
sim._syncMoves(p);
ok(p.equip.length === 2, "a move taken off by hand stays off (no refilling behind your back)");
r = A.act({ type: "skill.equip", id: "local", skill: p.equip[0], off: true }); r = A.act({ type: "skill.equip", id: "local", skill: p.equip[0], off: true });
ok(r && !r.ok && p.equip.length === 1, "but at least one move stays equipped");
r = A.act({ type: "skill.equip", id: "local", skill: "notAMove" });
ok(r && !r.ok, "only learned moves can be equipped");

/* digivolving: a Champion gets a 4th slot, and the free slots fill */
({ sim, A, p } = newSim());
p.skills = {}; pick.forEach(id => { p.skills[id] = 1; }); sim._syncMoves(p);
p.form = "greymon"; sim._syncMoves(p);
ok(p.equipN === 4 && p.equip.length === Math.min(4, can.length), "Greymon (Champion): 4 slots, and the new one fills straight away (" + p.equip.length + ")");

/* a move learned with every slot full waits; a bigger move takes its smaller one's place */
({ sim, A, p } = newSim());
p.skills = {}; pick.forEach(id => { p.skills[id] = 1; }); sim._syncMoves(p);
const gt = SK.tree(D, "greymon", p.skills), extra = SK.SLOTS.map(sl => gt.slots[sl].find(x => x.tier === 3 && !(D.SIG_INFO[x.id] && (D.SIG_INFO[x.id].up || D.SIG_INFO[x.id].rival)) && SK.MULTI[sl])).find(Boolean);
if (extra) {
  p.form = "agumon"; sim._evs.length = 0; p.skills[extra.id] = 1; sim._syncMoves(p);
  ok(p.equip.indexOf(extra.id) < 0 && sim._evs.some(e => e.type === "skill.full" && e.move === extra.id), "a new move with every slot full isn't equipped; you're told (skill.full)");
} else ok(true, "(no extra keeper to test the full-slot notice with)");
const shot = p.equip.find(id => D.MOVE_META[id] && D.MOVE_META[id].slot === "primary");
const bigger = shot && gt.slots.primary.find(x => x.tier === 3);
if (shot && bigger) {
  p.form = "greymon"; sim._syncMoves(p);
  const at = p.equip.indexOf(shot);
  p.skills[shot] = 7; p.skills[bigger.id] = 1; sim._syncMoves(p);
  ok(p.equip.indexOf(shot) < 0 && p.equip[at] === bigger.id, D.WEAPONS[bigger.id].name + " takes " + D.WEAPONS[shot].name + "'s slot when learned");
} else ok(true, "(no shot chain to test with)");

/* the Lab's Move Slot */
({ sim, A, p } = newSim({ moveslot: 1 }));
p.skills = {}; pick.forEach(id => { p.skills[id] = 1; }); sim._syncMoves(p);
ok(p.equipN === 4 && p.equip.length === Math.min(4, can.length), "with the Move Slot, a Rookie has 4");
({ sim, A, p } = newSim({ moveslot: 5 }));
p.skills = {}; pick.forEach(id => { p.skills[id] = 1; }); sim._syncMoves(p);
ok(p.equipN === 4, "and it's only ever +1, whatever the save says");

/* the move bar: how far each equipped move is from ready */
p.weapons[0].cd = 0.25; p.weapons[0].cdMax = 1; p.weapons[1].cd = 0; p.weapons[1].cdMax = 2;
const snap = sim.snapshot().players.find(q => q.id === "local");
ok(snap.wc && snap.wc[0] === 0.25 && snap.wc[1] === 0 && snap.wc.length === p.weapons.length, "the snapshot carries each move's recharge for the move bar: " + JSON.stringify(snap.wc));
p.weapons.forEach(w => { w.cd = 0; w.cdMax = 0; });
const foe = sim.spawnEnemy("gazimon", { keepType: true }); if (foe) { foe.x = p.mx + 30; foe.y = p.my; foe.hp = foe.maxHp = 1e6; }
for (let i = 0; i < 30; i++) { p.monInvuln = 9; p.tamerInvuln = 9; sim.step(1 / 30); }
const fired = p.weapons.filter(w => w.cdMax > 0);
ok(foe && fired.length > 0 && fired.every(w => w.cd <= w.cdMax + 1e-9), "when a move fires, its full recharge time is kept (cdMax) for the sweep: " + fired.map(w => w.id + " " + w.cd.toFixed(2) + "/" + w.cdMax.toFixed(2)).join(", "));

/* the guest side shows a swap at once with the same rule */
const ids = ["a", "b", "c", "d"];
ok(SK.applyEquip(["a", "b", "c"], ids, "d", "b", false, 3).list.join() === "a,d,c", "a swap keeps the slot's place");
ok(SK.applyEquip(["a", "b"], ids, "d", null, false, 3).list.join() === "a,b,d", "with room, a move just goes in");

console.log(failed ? failed + " FAILED" : "equip-test: all passed");
process.exit(failed ? 1 : 0);
