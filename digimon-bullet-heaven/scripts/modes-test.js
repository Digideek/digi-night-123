/* node scripts/modes-test.js : the four modes (17z33). Story (Jijimon's goals, shared by the party,
 * the game opening up as you go), Night Siege (waves by night, paid at dawn, one life) and Versus
 * (the race, the caches and mini bosses in the middle, then a best-of-three showdown). Runs the real
 * sim step with the real world. */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
global.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {} }), width: 0, height: 0 }) };
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "day-clock", "seasons", "weather", "biomes"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
D.sprites = Object.assign(D.sprites || {}, { colors: {}, SCALE: 3, TILE: 48 });
require(path.join(root, "js/world.js"));
const W = D.world;
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }

function newSim(mode, ids, opt) {
  opt = opt || {};
  W.reset(11); W.setTime(opt.time || 0);
  const sim = new mission.MissionSim({ seed: 11, hz: auth.TICK_HZ, data: D });
  new auth.Authority({ sim: sim, seed: 11 });
  sim.runMode = mode; sim.phase = "playing"; sim.time = opt.time || 0; sim.localId = ids[0];
  sim.players.length = 0;
  ids.forEach((id, i) => sim.players.push({ id, form: opt.form || "agumon", level: opt.level || 3, xp: 0, bits: 0, hp: 300, maxHp: 300, x: i * 200, y: 0, mx: i * 200 + 26, my: 6, faint: 0, downed: false, hasTamer: true, kind: i ? "remote" : "host-client", tamerHp: 50, tamerMaxHp: 50, skills: {}, kills: 0 }));
  sim.coop = ids.length > 1;
  const evs = []; const e0 = sim.emit.bind(sim); sim.emit = e => { evs.push(e); return e0(e); };
  sim._evs = evs;
  return sim;
}
const of = (sim, t) => sim._evs.filter(e => e.type === t);
function run(sim, sec, each) { const n = Math.round(sec * sim.hz); for (let i = 0; i < n; i++) { if (each) each(sim); sim.step(); } }

/* ---- the menu's four modes ---- */
const M = D.MODES;
ok(M.main.map(m => m.id).join() === "story,survival,siege,versus", "the main menu has four modes: Story, Survival, Night Siege, Versus");
ok(M.list.filter(m => m.group === "survival").length === 4, "Survival holds open world, one life, ranked and weekly");
ok(M.list.find(m => m.id === "versus").online, "Versus is marked online only");

/* ---- Story ---- */
console.log("Story");
let sim = newSim("story", ["local", "g1"], { form: "botamon", level: 1 });
sim.players.forEach(p => { p.form = "digitama_agumon"; p.hatchLeft = 5; });
run(sim, 0.2);
const steps = (D.STORY_STEPS || require(path.join(root, "js/net/story-sim.js")).STEPS);
ok(of(sim, "story.step").length === 1 && of(sim, "story.step")[0].id === "hatch", "Jijimon starts with the first goal: hatch");
ok(sim.noRival && sim.noVirus && sim.noEvents, "no rival, no outbreaks, no world events at first");
sim.players[0].form = "botamon"; run(sim, 1.2);
ok(sim.story.i === 0, "one of two hatched isn't enough");
sim.players[1].form = "botamon"; run(sim, 0.2);
ok(sim.story.i === 1 && of(sim, "story.clear")[0].id === "hatch", "both hatched: on to the next goal");
/* 'all' goals need everyone: only the host feeding is not enough */
sim.story.i = steps.findIndex(s => s.id === "feed"); sim._storyStart(sim.story.i);
sim.players[0].foodEaten = 1; run(sim, 1.2);
ok(sim.story.i === steps.findIndex(s => s.id === "feed"), "a goal for everyone waits until every tamer has done it");
const st = of(sim, "story.state").pop();
ok(st && st.have === 1 && st.need === 2 && st.who.length === 2, "and the tracker shows 1 of 2 done, and who");
sim.players[1].foodEaten = 1; run(sim, 0.2);
ok(of(sim, "story.clear").some(e => e.id === "feed") && steps[sim.story.i].id === "level", "when the guest feeds theirs too, it's done and the next goal comes");
/* 'party' goals add up */
sim.story.i = steps.findIndex(s => s.id === "kills"); sim._storyStart(sim.story.i);
sim.players[0].kills += 7; run(sim, 1.2);
ok(steps[sim.story.i].id === "kills" && of(sim, "story.state").pop().need === 10, "a party goal is a total: 5 each with two of you, so 10");
sim.players[1].kills += 3; run(sim, 0.2);
ok(steps[sim.story.i].id === "feed", "7 + 3 kills does it, whoever got them");
/* things open up */
sim.story.i = steps.findIndex(s => s.id === "rookie"); sim._storyStart(sim.story.i); run(sim, 0.1);
ok(!sim.noRival && sim.noVirus, "the rival comes once you're on the Rookie goal; outbreaks wait");
sim.story.i = steps.findIndex(s => s.id === "champion"); sim._storyStart(sim.story.i); run(sim, 0.1);
ok(!sim.noVirus && !sim.noEvents, "outbreaks and world events open up for the last goal");
sim.players.forEach(p => { p.form = "greymon"; }); run(sim, 0.3);
ok(steps[sim.story.i].id === "hatchery" && !sim.story.done, "a Champion each, then Jijimon's lessons on what's between runs");
const xpAt = sim.players[0].xp, clears = of(sim, "story.clear").length;
run(sim, 5);
ok(steps[sim.story.i].id === "hatchery", "a lesson stays up for its time");
const talkSec = steps.filter(s => s.who === "talk").reduce((a, s) => a + s.sec, 0);
run(sim, talkSec + 2);
ok(of(sim, "story.done").length === 1 && sim.story.done, "after the lessons (Hatchery, bloodlines, the other modes, the League) the story is done; the run goes on");
ok(of(sim, "story.clear").length === clears && sim.players[0].xp >= xpAt, "lessons aren't goals: no 'goal done', no XP for listening");
/* the new goals (17z33): raise a stat, train at the farm, hit a weakness, warp */
const sim2 = newSim("story", ["local"], { form: "agumon", level: 6 });
run(sim2, 0.2);
const goTo = id => { sim2.story.i = steps.findIndex(s => s.id === id); sim2._storyStart(sim2.story.i); run(sim2, 0.1); };
const P2 = sim2.players[0];
goTo("stats"); P2.statPoints = 5;
sim2._attrs(P2); P2.attrs.str += 1; run(sim2, 0.2);
ok(steps[sim2.story.i].id === "side", "raising a stat clears 'Raise a stat (T)'");
goTo("train"); P2.trainCount = (P2.trainCount || 0) + 1; run(sim2, 0.2);
ok(sim2.story.i > steps.findIndex(s => s.id === "train"), "a training session at the farm clears 'Train at the farm'");
goTo("weak"); P2.weakHits = (P2.weakHits || 0) + 2; run(sim2, 1.2);
ok(steps[sim2.story.i].id === "weak", "two weakness hits of three: not yet");
P2.weakHits += 1; run(sim2, 0.2);
ok(steps[sim2.story.i].id === "warp", "three weakness hits clear 'Hit a weakness'");
P2.burstUses = (P2.burstUses || 0) + 1; run(sim2, 0.2);
ok(steps[sim2.story.i].id === "boss", "a warp clears 'Warp digivolve (R)'");
ok(sim._oneLife() === false, "Story doesn't end when a partner falls");

/* ---- Night Siege ---- */
console.log("Night Siege");
const SG = D.SIEGE;
const DLEN = SG.dayLen;   /* Night Siege's day (17z33: 182 s, shorter than the 243 s elsewhere) */
sim = newSim("siege", ["local"], { level: 8, time: DLEN * SG.warnAt - 2 });
sim.players[0].x = 0; sim.players[0].y = 0;
ok(sim._oneLife(), "one life");
run(sim, 3);
ok(of(sim, "siege.warn").length === 1, "a warning before dusk");
run(sim, DLEN * (SG.startAt - SG.warnAt) + 1, s => { s.players[0].hp = s.players[0].maxHp; });
ok(of(sim, "siege.night").length === 1 && of(sim, "siege.night")[0].night === 1, "night 1 begins at dusk");
run(sim, 12, s => { s.players[0].hp = s.players[0].maxHp; s.players[0].monInvuln = 1; s.players[0].tamerHp = 50; });
const att = sim.enemies.filter(e => e.siege && !e.dead);
ok(att.length >= 4, att.length + " attackers on the way after 12 s");
const near0 = att.filter(e => !e.dead && Math.hypot(e.x - sim.players[0].x, e.y - sim.players[0].y) < 400).length;
ok(near0 >= att.filter(e => !e.dead).length * 0.5, "they come straight at you (" + near0 + " of " + att.length + " already on you; they spawn " + SG.ring[0] + "+ px out)");
const bitsBefore = sim.players[0].bits;
run(sim, DLEN * (SG.endAt - SG.startAt), s => { s.players[0].hp = s.players[0].maxHp; s.players[0].monInvuln = 1; s.players[0].tamerHp = 50; });
const dawn = of(sim, "siege.dawn")[0];
ok(dawn && dawn.night === 1 && dawn.pay.local && sim.players[0].bits > bitsBefore, "at dawn you're paid for the night (" + (dawn && JSON.stringify(dawn.pay.local)) + ")");
ok(!sim.enemies.some(e => e.siege && !e.dead), "and the attackers that are left run off");
ok(sim._siegeNights() === 1, "nights held out: 1");
/* nights get harder, and a boss on night 3 */
/* (the eggs can't break here: this is about the boss; scripts/siege-nest-test.js covers the nest) */
const eggHp0 = SG.nest.hp; SG.nest.hp = 1e9;
sim = newSim("siege", ["local"], { level: 20, time: DLEN * 2 + DLEN * SG.startAt - 0.5 });
run(sim, DLEN * (SG.endAt - SG.startAt) * 0.6, s => { s.players[0].hp = s.players[0].maxHp; s.players[0].monInvuln = 1; s.players[0].tamerHp = 50; });
SG.nest.hp = eggHp0;
ok(of(sim, "siege.night")[0].boss && of(sim, "siege.boss").length === 1, "night 3 brings a boss");
const n3 = sim.enemies.filter(e => e.siege && !e.boss).map(e => (D.SPECIES[e.type] || {}).stage);
ok(n3.length && n3.every(s => SG.stages[2].indexOf(s) >= 0), "night 3's attackers are " + SG.stages[2].join("/"));
/* two players: the whole wave comes in round the nest (Primary Village, 17z33), wherever you are */
sim = newSim("siege", ["local", "g1"], { level: 8, time: DLEN * SG.startAt - 0.2 });
sim.players[1].x = 4000; sim.players[1].mx = 4026;
run(sim, 6, s => s.players.forEach(p => { p.hp = p.maxHp; p.monInvuln = 1; p.tamerHp = 50; }));
const nearB = sim.enemies.filter(e => e.siege && Math.hypot(e.x - 4000, e.y) < 1000).length, nearA = sim.enemies.filter(e => e.siege && Math.hypot(e.x, e.y) < 1000).length;
ok(nearA > 0 && nearB === 0, "co-op: the whole wave comes in round the nest, not round the one far away (" + nearA + " and " + nearB + ")");

/* ---- Versus ---- */
console.log("Versus");
const VS = D.VERSUS;
sim = newSim("versus", ["local", "g1"], { level: 3 });
run(sim, 0.2);
const [A, B] = sim.players;
ok(A.x < -1000 && B.x > 1000, "each tamer starts on their own side (" + Math.round(A.x) + " / " + Math.round(B.x) + ")");
ok(sim.noRival && sim.noVirus && sim.noEvents, "no rival, outbreaks or world events in a race");
ok(!sim._pvpFoes(A, B), "no fighting each other during the race");
const st0 = of(sim, "vs.state").pop();
ok(st0 && st0.phase === "race" && st0.left > VS.race - 10 && st0.players.length === 2, "every screen sees the clock and both levels");
/* a fallen partner comes back on its own side, still itself */
A.form = "greymon"; A.hp = 0; A.faint = 1; const lvA = A.level;
ok(sim._respawn(A) && A.form === "greymon" && A.level === lvA && A.x < -1000 && A.hp > 0, "a partner that falls in the race comes back at home, same form and level");
/* caches and mini bosses in the middle */
run(sim, 65, s => s.players.forEach(p => { p.hp = p.maxHp; p.monInvuln = 1; p.tamerHp = 50; }));
ok(of(sim, "vs.cache").length >= 1 && sim.orbs.filter(o => o.kind === "xp" && Math.hypot(o.x, o.y) < 200).length >= 5, "a cache of experience drops in the middle");
sim.time = sim.vs.t0 + VS.bossAt[0] + 0.5; run(sim, 0.2, s => s.players.forEach(p => { p.hp = p.maxHp; p.monInvuln = 1; }));
const vb = sim.enemies.find(e => e.vsBoss && !e.dead);
ok(vb && vb.boss && Math.hypot(vb.x, vb.y) < 600, "a mini boss shows up in the middle at " + Math.floor(VS.bossAt[0] / 60) + ":" + String(VS.bossAt[0] % 60).padStart(2, "0"));
run(sim, 3, s => s.players.forEach(p => { p.hp = p.maxHp; p.monInvuln = 1; }));
ok(Math.hypot(vb.x, vb.y) < 700, "and stays there till someone comes for it");
/* showdown */
sim.time = sim.vs.t0 + VS.race; run(sim, 0.2);
ok(sim.vs.phase === "showdown" && of(sim, "vs.showdown").length === 1, "after ten minutes: the showdown");
ok(Math.hypot(A.x - sim.vs.arena.x, A.y - sim.vs.arena.y) < 400 && Math.hypot(B.x - sim.vs.arena.x, B.y - sim.vs.arena.y) < 400 && A.x < B.x, "both pulled into the arena, facing each other");
ok(!sim.enemies.some(e => !e.dead && !e.pvpOf && Math.hypot(e.x - sim.vs.arena.x, e.y - sim.vs.arena.y) < VS.clear), "the wild Digimon round it are cleared");
ok(!sim._pvpFoes(A, B), "nobody can hit yet: the countdown");
run(sim, VS.countdown + 0.2);
ok(sim._pvpFoes(A, B) && sim._pvpFoes(B, A), "then it's on");
ok(A.tamerInvuln > 100 && B.tamerInvuln > 100, "the tamers can't be hurt, only partners");
/* round 1 to A */
const evB = of(sim, "vs.ko").length;
sim._pvpKo(A, B); run(sim, 0.2);
ok(of(sim, "vs.ko").length === evB + 1 && !B.atFarm && sim.vs.wins.local === 1, "a knockout wins the round for A; B isn't sent to the farm");
run(sim, VS.between + VS.countdown + 0.4);
ok(sim.vs.round === 2 && B.hp === B.maxHp && !sim.vs.out.g1, "next round: everyone healed and back in");
sim._pvpKo(B, A); run(sim, VS.between + VS.countdown + 0.4);
ok(sim.vs.wins.g1 === 1 && sim.vs.round === 3, "B takes round 2: 1-1, round 3");
sim._pvpKo(A, B); run(sim, 0.2);
const end = of(sim, "vs.end")[0];
ok(end && end.winner === "local" && end.wins.local === 2, "A wins round 3 and the match, 2-1");
run(sim, 8);
ok(sim.runOver, "then the run ends for both");

/* real fighting: the partners go at each other once the countdown ends */
sim = newSim("versus", ["local", "g1"], { level: 8 });
sim.players[1].form = "gabumon"; sim.players.forEach(p => { p.weapons = [{ id: "pepperBreath", level: 3, cd: 0 }]; p.kind = "human"; });
let seq = 0; const go = sec => { for (let t = 0; t < sec * sim.hz; t++) { sim.players.forEach(p => sim.pushInput({ type: "input", id: p.id, inputs: [{ seq: ++seq, x: 0, y: 0 }] })); sim.step(); } };
go(0.2); sim.time = sim.vs.t0 + VS.race; go(0.2); const hp0 = sim.players[0].hp + sim.players[1].hp; go(VS.countdown + 5);
ok(sim.players[0].hp + sim.players[1].hp < hp0, "in the arena the partners find each other and trade hits by themselves");
/* a round that drags on */
sim.vs.roundT = VS.roundSec - 0.1; sim.players[0].hp = sim.players[0].maxHp * 0.9; sim.players[1].hp = sim.players[1].maxHp * 0.4; go(0.3);
ok(of(sim, "vs.time").length === 1 && sim.vs.wins.local === 1, "a round past " + VS.roundSec + " s goes to the one with more health left");

/* other modes untouched */
sim = newSim("open", ["local"]); run(sim, 1);
ok(!sim.story && !sim.siege && !sim.vs, "open world runs none of this");

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
