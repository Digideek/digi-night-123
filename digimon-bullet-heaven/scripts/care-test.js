/* node scripts/care-test.js : hunger and happiness, each its own thing (17z33). Feeding fills the
 * belly (and only sweets / its favourite food make it much happier); a full partner won't eat more;
 * a sulky one only turns down food it doesn't need; starving makes it slower and weaker and unhappy;
 * happiness comes from bosses, level ups and resting somewhere quiet, and drops when it faints. */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "weather", "seasons", "biomes"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const C = D.CARE;
function mk() {
  const sim = new mission.MissionSim({ seed: 3, hz: auth.TICK_HZ, data: D }); const A = new auth.Authority({ sim: sim, seed: 3 });
  sim.phase = "playing"; sim.time = 300; sim.localId = "local"; sim.players.length = 0; sim.enemies.length = 0;
  sim._updateSpawns = () => {};
  sim.players.push({ id: "local", form: "agumon", level: 5, xp: 0, xpNext: 100, hp: 200, maxHp: 200, x: 0, y: 0, mx: 20, my: 0, faint: 0, downed: false, hasTamer: true, kind: "host-client", tamerHp: 50, tamerMaxHp: 50, fullness: 50, happiness: 50, bag: { meat: 9, berry: 9, fish: 9, carrot: 4 } });
  return { sim, A, p: sim.players[0] };
}
/* 17z33: meals are at the farm */
const feed = (w, food) => { if (!w.sim.farm || !w.sim.farm.active) w.sim.farm = { active: true, fed: 0, refused: 0 }; return w.A.act({ type: "farm.feed", id: "local", food }); };
let w = mk();
ok(!w.A.act({ type: "field.feed", id: "local", food: "meat" }).ok, "no feeding out in the world: meals are at the farm");
const j0 = w.p.happiness; w.p.form = "agumon"; const fav = D.favouriteFood("agumon");
const notFav = ["meat", "fish", "berry"].find(k => !D.isFavourite("agumon", k));
feed(w, notFav);
ok(w.p.fullness > 50, "food fills the belly (" + notFav + ": " + Math.round(w.p.fullness) + ")");
ok(w.p.happiness - j0 <= D.FOOD[notFav].happiness + 0.01, "and on its own makes it only a little happier (+" + Math.round(w.p.happiness - j0) + ")");
const favKind = fav === "veg" ? "carrot" : fav; const j1 = w.p.happiness; const r = feed(w, favKind);
ok(r.fav && w.p.happiness - j1 >= C.favJoy, "its favourite (" + fav + ") makes it much happier (+" + Math.round(w.p.happiness - j1) + ")");
w.p.fullness = 97; const rf = feed(w, "meat");
ok(!rf.ok && rf.full, "a full partner won't eat more: " + rf.reason);
w.p.fullness = 40; w.p.happiness = 30; w.p.refusedFoodCycles = 2; w.p.starveCycles = 2;
ok(feed(w, "meat").ok, "a sulky partner still eats when it's hungry (under 45)");
/* starving */
w = mk(); const base = w.sim._stats ? null : null;
const s0 = w.sim.statsFor ? null : null;
w.p.fullness = 50; w.sim._updateCare(w.p, 0.1); const st0 = w.sim._statsOf ? w.sim._statsOf(w.p) : null;
w.p.fullness = 5; const jA = w.p.happiness; w.sim._updateCare(w.p, 1);
ok(w.p.starving && w.p.hungry, "at " + C.starveAt + " or less it's starving");
ok(w.p.happiness < jA, "starving makes it unhappy (" + (jA - w.p.happiness).toFixed(1) + " a second)");
const fnStats = Object.keys(mission.MissionSim.prototype).find(k => /stat/i.test(k) && mission.MissionSim.prototype[k].toString().indexOf("monSpeedMul = ") >= 0);
const sStarve = w.sim[fnStats](w.p); const spS = sStarve.monSpeedMul, dmS = sStarve.damageMul;
w.p.fullness = 60; w.sim._updateCare(w.p, 0.1); const sFed = w.sim[fnStats](w.p);
ok(Math.abs(spS / sFed.monSpeedMul - C.starveSpeed) < 1e-6 && Math.abs(dmS / sFed.damageMul - C.starveDamage) < 1e-6, "and slower (x" + C.starveSpeed + ") and weaker (x" + C.starveDamage + ")");
ok(!w.p.starving && !w.p.hungry, "fed again, it's back to normal");
/* resting */
w = mk(); w.p.fullness = 80; w.p.happiness = 40; w.p.monMoving = false; w.p.moving = false;
for (let i = 0; i < 30 * 10; i++) w.sim._updateCare(w.p, 1 / 30);
ok(w.p.happiness > 45 && w.p.resting, "a rest somewhere quiet makes it happier (40 -> " + Math.round(w.p.happiness) + ")");
w.sim.enemies.push({ _id: 1, type: "goblimon", x: 60, y: 0, hp: 10, maxHp: 10, radius: 12 }); for (let i = 0; i < 20; i++) w.sim._updateCare(w.p, 1 / 30); const jR = w.p.happiness;
for (let i = 0; i < 30 * 5; i++) w.sim._updateCare(w.p, 1 / 30);
ok(Math.abs(w.p.happiness - jR) < 0.01, "but not with a wild Digimon close by");
/* hits barely hurt it now, fainting does */
w = mk(); w.p.happiness = 60; w.p.monInvuln = 0; w.sim.hurtMon(w.p, 2, null);
ok(60 - w.p.happiness < 0.5, "a scratch barely matters (-" + (60 - w.p.happiness).toFixed(2) + ")");
w.p.monInvuln = 0; w.p.happiness = 60; w.sim.hurtMon(w.p, 999, null);
ok(w.p.happiness <= 60 + C.faintJoy + 0.01, "fainting costs " + -C.faintJoy);
/* level ups */
w = mk(); w.p.happiness = 50; w.p.xp = w.p.xpNext + 1; w.sim._tryLevel(w.p);
ok(w.p.happiness >= 50 + C.levelJoy - 0.01, "a level up: +" + C.levelJoy);
/* 17z33: food fills by taste; the bag holds 10; training runs on food and fights; gates make it count for more */
w = mk(); w.p.fullness = 20; w.p.form = "agumon";
const kinds = ["meat", "fish", "berry", "carrot"], favK = kinds.find(k => D.isFavourite("agumon", k)), disK = kinds.find(k => D.isDisliked("agumon", k)), normK = kinds.find(k => !D.isFavourite("agumon", k) && !D.isDisliked("agumon", k));
w.p.bag = { meat: 3, fish: 3, berry: 3, carrot: 3 };
let f0 = w.p.fullness; feed(w, favK); const fF = w.p.fullness - f0;
f0 = w.p.fullness; feed(w, normK); const fN = w.p.fullness - f0;
w.p.fullness = 20; f0 = w.p.fullness; feed(w, disK); const fD = w.p.fullness - f0;
ok(fF === C.fill.fav && fN === C.fill.normal && fD === C.fill.dislike, "its favourite fills a third (" + fF + "), ordinary food a quarter (" + fN + "), food it dislikes a sixth (" + fD + ")");
ok(D.dislikedFood("agumon") !== D.favouriteFood("agumon"), "it never dislikes its favourite");
w = mk(); w.p.bag = { meat: 10 }; w.sim.orbs = [{ id: 1, kind: "berry", x: 0, y: 0, value: 1 }]; w.sim._updateOrbs(1 / 30);
ok(w.sim.orbs.length === 1 && !(w.p.bag.berry > 0), "a full bag (" + C.bagMax + ") leaves food on the ground");
w.p.bag = { meat: 9 }; w.sim._updateOrbs(1 / 30);
ok(w.p.bag.berry === 1, "with room it's picked up");
const FC = D.FARM_CFG;
w = mk(); w.sim.farm = { active: true, fed: 0, refused: 0 }; w.p.fullness = 30;
ok(!w.A.act({ type: "farm.trainStart", id: "local", station: "bag" }).ok, "too hungry (under " + FC.trainMinFull + ") to train");
function session(w) { w.p.fullness = 100; w.sim.farm.trainCd = 0; const r = w.A.act({ type: "farm.trainStart", id: "local", station: "bag" }); const after = w.p.fullness; w.sim.farm.activity.mg = null; w.sim.farm.activity.score = 1; const g = w.A.progression._finishTrain(w.p, w.sim.farm); return { cost: 100 - after, gain: g.gain, r }; }
w.p.trainVisits = null;
const s1 = session(w);
ok(s1.r.ok && s1.cost === 25, "a session costs a quarter of the belly");
w = mk(); w.sim.farm = { active: true, fed: 0, refused: 0 };
const gains = []; for (let i = 0; i < 6; i++) { w.p.trainVisits = { bag: 0 }; gains.push(session(w).gain); }
ok(gains[0] === gains[1] && gains[1] === gains[2] && gains[3] < gains[2] && gains[4] < gains[3] && gains[5] <= gains[4], "three fresh sessions pay in full, then less and less: " + gains.join(", "));
for (let i = 0; i < FC.fresh.killsPer; i++) { const e = w.sim.spawnEnemy(Object.keys(D.ENEMIES).find(k => !D.ENEMIES[k].boss), { keepType: true, quiet: true, x: 300, y: 0 }); if (e) w.sim._killEnemy(e, w.p); }
ok(w.p.trainFresh === 1, "beating " + FC.fresh.killsPer + " wild Digimon out in the world brings a fresh session back");
w.p.trainVisits = { bag: 0 }; ok(session(w).gain === gains[0], "and it pays in full again");
w.p.farmGates = 3; w.p.trainFresh = 1; w.p.trainVisits = { bag: 0 };
const gG = session(w).gain; ok(Math.abs(gG / gains[0] - 1.3) < 0.1, "three gates held: training gives 30% more (" + gains[0] + " -> " + gG + ")");
w.p.farmGates = 25; w.p.trainFresh = 1; w.p.trainVisits = { bag: 0 };
const gMax = session(w).gain; ok(Math.abs(gMax / gains[0] - 2) < 0.12, "never more than double (" + gMax + ")");
console.log(failed ? failed + " FAILED" : "all passed"); process.exit(failed ? 1 : 0);
