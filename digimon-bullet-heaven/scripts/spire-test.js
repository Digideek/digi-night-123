/* node scripts/spire-test.js : black spires are a gamble (17z33, js/net/spire-sim.js). A hidden roll: mostly a
 * swarm of In-Training ones, sometimes a pack led by a Rookie or two, rarely a rumble and then a mini boss
 * that hunts you. Beat everything a spire let out and a chest appears at the spire's foot: bronze, silver or
 * gold. It stays put until someone walks up and presses E. */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
global.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {} }), width: 0, height: 0 }) };
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "day-clock", "seasons", "weather", "biomes"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
D.sprites = Object.assign(D.sprites || {}, { colors: {}, SCALE: 3, TILE: 48 });
require(path.join(root, "js/world.js"));
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const S = D.TERRAIN.spire;
function mk(seed) {
  D.world.reset(seed); D.world.setTime(400);
  const sim = new mission.MissionSim({ seed, hz: auth.TICK_HZ, data: D }); sim._A = new auth.Authority({ sim, seed });
  sim.phase = "playing"; sim.time = 400; sim.localId = "local"; sim.players.length = 0; sim.enemies.length = 0;
  sim.players.push({ id: "local", form: "agumon", level: 8, hp: 300, maxHp: 300, x: 0, y: 0, mx: 20, my: 0, hasTamer: true, kind: "host-client", tamerHp: 50, tamerMaxHp: 50, bits: 0 });
  const ev = []; const e0 = sim.emit.bind(sim); sim.emit = e => { ev.push(e); return e0(e); }; sim._ev = ev;
  return sim;
}
/* the odds */
let sim = mk(3); const tally = { small: 0, mixed: 0, big: 0 };
for (let i = 0; i < 6000; i++) tally[sim._spireRoll()]++;
ok(Math.abs(tally.small / 6000 - S.roll.small) < 0.03 && Math.abs(tally.mixed / 6000 - S.roll.mixed) < 0.03 && Math.abs(tally.big / 6000 - S.roll.big) < 0.02, "the roll: " + Object.keys(tally).map(k => k + " " + Math.round(tally[k] / 60) + "%").join(", "));
const stage = t => (D.SPECIES[t] || {}).stage;
for (const tier of ["small", "mixed", "big"]) {
  sim = mk(5); sim._spireRoll = () => tier;
  const p = sim.players[0], r = sim._spireBreak(p, "10,10", 200, 0);
  let mine = sim.enemies.filter(e => e.spireGroup === "10,10" && !e.dead);
  if (tier === "small") ok(mine.length >= 5 && mine.length <= 6 && mine.every(e => stage(e.type) === "In-Training"), "small: " + mine.length + " In-Training ones (" + mine.map(e => e.type).join(", ") + ")");
  if (tier === "mixed") ok(mine.length >= 4 && mine.filter(e => stage(e.type) === "Rookie").length >= 1 && mine.filter(e => stage(e.type) === "In-Training").length === 3, "mixed: 3 In-Training ones led by " + mine.filter(e => stage(e.type) === "Rookie").map(e => e.type).join(" and "));
  if (tier === "big") {
    ok(!mine.length && sim._ev.some(e => e.type === "spire.rumble"), "big: first a rumble, nothing yet");
    sim.time += S.rumbleSec + 0.1; sim._updateSpires(0.1);
    mine = sim.enemies.filter(e => e.spireGroup === "10,10" && !e.dead);
    ok(mine.length === 1 && mine[0].boss && mine[0].spire && mine[0].spdMul > 1, "then a mini boss (" + mine[0].type + ") that's faster than the rest");
  }
  const left = mine.slice(); left.slice(0, -1).forEach(e => sim._killEnemy(e, p));
  ok(!sim._ev.some(e => e.type === "spire.cleared"), tier + ": no chest while one is still standing");
  sim._killEnemy(left[left.length - 1], p);
  const cl = sim._ev.find(e => e.type === "spire.cleared"), want = { small: "bronze", mixed: "silver", big: "gold" }[tier];
  const ch = (sim.spireChests || [])[0];
  ok(cl && cl.chest === want && ch && ch.tier === want && !sim.orbs.some(o => /^chest_/.test(o.kind)), tier + ": all beaten, a " + want + " chest (not a pickup)");
  ok(ch && Math.abs(ch.x - 200) < 20 && ch.y > 0 && ch.y < 60, "  it stands at the spire's foot (" + Math.round(ch.x) + ", " + Math.round(ch.y) + "), not where the last one fell");
  /* it stays put: walking right over it or waiting does nothing */
  p.x = ch.x; p.y = ch.y; for (let k = 0; k < 40; k++) sim.step ? sim.step(1 / 20) : 0;
  ok(sim.spireChests.length === 1 && !sim._ev.some(e => e.type === "chest.open"), "  standing on it opens nothing: it waits for E");
  ok(sim.snapshot().spireChests[0][1] === want, "  it's in the snapshot");
  p.x = ch.x + 400; let ro = sim._A.act({ type: "chest.open", id: "local" });
  ok(!ro.ok && /closer/.test(ro.reason), "  too far away: " + ro.reason);
  p.x = ch.x + 40; p.y = ch.y; const b0 = p.bits;
  ro = sim._A.act({ type: "chest.open", id: "local", spot: ch.id });
  const op = sim._ev.find(e => e.type === "chest.open");
  ok(ro.ok && !sim.spireChests.length && op.spot === ch.id && op.x === Math.round(ch.x), "  E beside it: opened, and gone");
  ok(op && p.bits - b0 >= S.chests[want].bits[0] && p.bits - b0 <= S.chests[want].bits[1], "opening it: +" + (p.bits - b0) + " Bits");
  ok(op.food && D.FOOD[op.food].rare && p.bag[op.food] === 1, "  and a rare food: " + D.FOOD[op.food].name);
  ok(op.data === S.chests[want].data && S.dataTypes.indexOf(op.dataType) >= 0, "  and +" + op.data + " " + op.dataType + " Hatchery data");
}
/* with a friend: whoever gets there opens it */
sim = mk(9); sim._spireRoll = () => "small";
sim.players.push({ id: "g1", form: "gabumon", level: 8, hp: 300, maxHp: 300, x: 600, y: 0, mx: 620, my: 0, hasTamer: true, kind: "client", tamerHp: 50, tamerMaxHp: 50, bits: 0 });
sim._spireBreak(sim.players[0], "3,3", 200, 0);
sim.enemies.filter(e => e.spireGroup === "3,3").forEach(e => sim._killEnemy(e, sim.players[0]));
const fc = sim.spireChests[0], g = sim.players[1]; g.x = fc.x - 30; g.y = fc.y;
let gr = sim._A.act({ type: "chest.open", id: "g1" });
ok(gr.ok && g.bits > 0 && !sim.spireChests.length, "a friend who walks up can open it too (+" + g.bits + " Bits)");
ok(!sim._A.act({ type: "chest.open", id: "local" }).ok, "and then it's gone for everyone");
/* what the chests hold, over many openings */
sim = mk(9);
for (const tier of ["bronze", "silver", "gold"]) {
  const p = sim.players[0], seen = {}, N = 4000; p.bag = {};
  for (let i = 0; i < N; i++) { sim._ev.length = 0; sim._openChest(p, "chest_" + tier); const f = sim._ev.find(e => e.type === "chest.open").food; seen[f] = (seen[f] || 0) + 1; }
  const L = S.chests[tier].loot, tot = Object.values(L).reduce((a, b) => a + b, 0);
  ok(Object.keys(L).every(k => Math.abs(seen[k] / N - L[k] / tot) < 0.03) && Object.keys(seen).every(k => L[k]), tier + " odds: " + Object.keys(seen).map(k => D.FOOD[k].name + " " + Math.round(seen[k] / N * 100) + "%").join(", "));
}
ok(!S.chests.bronze.loot.evo_fruit && S.chests.gold.loot.evo_fruit > S.chests.silver.loot.evo_fruit, "Evo Fruit: never bronze, best odds in gold");
ok(["bronze", "silver", "gold"].every(t => S.chests[t].loot.moldy_meat), "Moldy Meat can be in any chest");
/* rare foods don't fill the food bag */
sim = mk(11); { const p = sim.players[0]; p.bag = { meat: D.CARE.bagMax - 1, golden_meat: 3, moldy_meat: 2 }; ok(!sim._bagFull(p), "rare foods don't count toward the bag's food limit"); }

/* what each rare food does (fed at the farm) */
function farmFeed(food, set) {
  const s2 = mk(13), A = s2.auth || null; const p = s2.players[0];
  Object.assign(p, { fullness: 40, happiness: 50, careMistakes: 0, bag: { [food]: 1 }, trainStats: { offense: 0, intelligence: 0, agility: 0 } }, set || {});
  s2.farm = { active: true, fed: 0, refused: 0 };
  const prog = s2._A.progression;
  return { p, s2, r: s2._A.act({ type: "farm.feed", id: "local", food }), prog };
}
let F = farmFeed("sweet_nut"); ok(F.r.ok && F.p.happiness >= 80, "Sweet Nut: a big happiness boost (50 -> " + Math.round(F.p.happiness) + ")");
F = farmFeed("golden_meat", { fullness: 10, form: "agumon" }); ok(F.r.ok && F.p.fullness >= 100 && F.r.fav, "Golden Meat: fills it right up and counts as its favourite");
F = farmFeed("moldy_meat"); ok(F.r.ok && F.p.careMistakes === 3 && F.p.happiness < 50, "Moldy Meat: +3 care mistakes and a grumpy partner");
F = farmFeed("digi_seed"); { const t = F.p.trainStats; ok(F.r.ok && t.offense + t.intelligence + t.agility === D.FOOD.digi_seed.statUp, "Digi-Seed: +" + D.FOOD.digi_seed.statUp + " " + F.r.rare.stat); }
F = farmFeed("protein_steak");
ok(F.r.ok && F.p.trainBoost === 2, "Protein Steak: next training is marked x2");
{ const p = F.p; p.fullness = 90; p.trainFresh = 3; const fa = { activity: { id: "bag", score: 1, t: 0, dur: 1 } };
  const g1 = F.prog._finishTrain(p, fa).gain; fa.activity = { id: "bag", score: 1, t: 0, dur: 1 }; p.trainVisits.bag = 0; p.trainFresh = 3;
  const g2 = F.prog._finishTrain(p, fa).gain;
  ok(g1 === g2 * 2 && !p.trainBoost, "  that session gave " + g1 + " instead of " + g2 + ", then it's used up"); }
F = farmFeed("evo_fruit"); ok(F.r.ok && F.p.evoFruit > 0, "Evo Fruit: its next digivolution may take a rare route");
{ const p = F.p; let lucky = 0, N = 400, form = Object.keys(EVO_TREE.branches).find(f => (EVO_TREE.branches[f] || []).filter(b => b.kind !== "standard" && b.kind !== "neglect" && b.kind !== "fallback" && D.SPECIES[b.to]).length >= 2);
  for (let i = 0; i < N; i++) { p.form = form; p.evoFruit = D.FOOD.evo_fruit.evoChance; if (F.prog._luckyRoute(p, { to: "__none__" })) lucky++; }
  ok(Math.abs(lucky / N - D.FOOD.evo_fruit.evoChance) < 0.08 && !p.evoFruit, "  from " + form + ": a rare route " + Math.round(lucky / N * 100) + "% of the time, and the fruit is spent"); }

console.log(failed ? "spire-test: " + failed + " failed" : "spire-test: all passed"); process.exit(failed ? 1 : 0);
