/* node scripts/minigames-test.js : the farm's training mini games (17z33, js/net/minigames.js) and how
 * their score turns into the training gain on the authority. */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "weather", "seasons", "biomes"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
const MG = require(path.join(root, "js/net/minigames.js"));
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
let seed = 7; const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

/* strike: pressing right on the mark every time is perfect; mashing early is not */
let a = MG.create("bag", rng);
while (!a.done) { let guard = 0; while (Math.abs(a.needle - a.zone) > 0.01 && guard++ < 2000) MG.tick(a, 0.002, null, rng); MG.input(a, "interact", null, rng); MG.tick(a, 0.31, null, rng); }
ok(a.marks.length === 5 && a.marks.every(m => m.g === "perfect") && MG.gradeOf(MG.score(a)).id === "perfect", "Power Strike, all on the mark: " + MG.summary(a) + " -> " + MG.gradeOf(MG.score(a)).label);
ok(a.speed > MG.STRIKE.speed * 1.5, "  and each strike sweeps faster");
a = MG.create("bag", rng); a.zone = 0.9; a.needle = 0.1; MG.input(a, "interact", null, rng);
ok(a.marks[0].g === "miss", "pressing far off the mark is a miss");
MG.input(a, "interact", null, rng); ok(a.n === 1, "  and a second press during the short pause doesn't count");
a = MG.create("bag", rng); MG.tick(a, 20, null, rng);
ok(a.done && a.marks.length === 5 && MG.score(a) === MG.VAL.miss, "doing nothing: it times out, all misses");

/* memory: repeat the pattern */
a = MG.create("board", rng);
while (!a.done) { if (a.phase === "input") MG.input(a, "choice", a.seq[a.idx], rng); else MG.tick(a, 0.05, null, rng); }
ok(a.right === 8 && MG.gradeOf(MG.score(a)).id === "perfect", "Pattern Recall, all repeated right: " + MG.summary(a));
a = MG.create("board", rng);
ok(MG.input(a, "choice", 0, rng) === null, "no answering while the pattern is still showing");
while (!a.done) { if (a.phase === "input") MG.input(a, "choice", (a.seq[a.idx] + 1) % 4, rng); else MG.tick(a, 0.05, null, rng); }
ok(a.right === 0 && MG.score(a) < 0.8, "all wrong: " + MG.summary(a) + ", " + MG.gradeOf(MG.score(a)).label);

/* lanes: a partner whose tamer switches lanes when something is ahead in its lane does better than one left alone */
const G = { cx: 660, cy: 420, rx: 588, ry: 328, width: 44 };
function laneRun(smart) {
  const b = MG.create("track", rng, G);
  while (!b.done) {
    if (smart) {
      const mine = b.lp > 0.5 ? 1 : 0;
      const ahead = b.hz.filter(h => !h.passed && !h.hit && h.lane === b.lane && h.s - b.s > 0 && h.s - b.s < 90);
      if (ahead.length && b.lane === mine) MG.input(b, "interact", null, rng);
    }
    MG.tick(b, 0.03, { x: 0, y: 0 }, rng);
  }
  return b;
}
const idle = laneRun(false), smart = laneRun(true);
ok(idle.hits > smart.hits, "Rockfall Run: switching lanes (hit " + smart.hits + ") beats staying put (hit " + idle.hits + ")");
ok(smart.done && Math.abs(smart.t - MG.LANES.dur) < 0.1 && smart.s > MG.trackLen(G), "  " + MG.LANES.dur + " seconds, more than a lap of the track (" + Math.round(smart.s) + " of " + Math.round(MG.trackLen(G)) + ")");
{ const b = MG.create("track", rng, G); const p0 = MG.lanesPos(b); b.lp = 0; const p1 = MG.lanesPos(b);
  ok(Math.abs(p0.x - (G.cx + G.rx + 11)) < 1 && Math.abs(p1.x - (G.cx + G.rx - 11)) < 1, "it starts at the gate, outer lane outside the middle line, inner inside"); }
{ const b = MG.create("track", rng, G); MG.tick(b, 0.1, { x: 1, y: 0 }, rng); const l1 = b.lane; MG.tick(b, 0.5, { x: 1, y: 0 }, rng);
  ok(l1 === 0 && b.lane === 0, "a tap of A / D switches lanes once, holding it doesn't keep switching"); }
{ const b = MG.create("track", rng, G); let bad = 0; const seen = [];
  while (!b.done) { MG.tick(b, 0.05, { x: 0, y: 0 }, rng); b.hz.forEach(h => { if (!seen.includes(h)) seen.push(h); }); }
  for (const h of seen) for (const o of seen) if (h !== o && h.lane !== o.lane && Math.abs(h.s - o.s) < MG.LANES.clearGap) bad++;
  ok(bad === 0 && seen.length > 8, "there's always a lane open (" + seen.length + " rocks and hurdles, never both lanes at once)"); }

/* on the authority: the score scales the gain the sign promised */
function mk() {
  const sim = new mission.MissionSim({ seed: 3, hz: auth.TICK_HZ, data: D }); const A = new auth.Authority({ sim, seed: 3 });
  sim.phase = "playing"; sim.time = 300; sim.localId = "local"; sim.players.length = 0;
  sim.players.push({ id: "local", form: "agumon", level: 5, hp: 200, maxHp: 200, x: 0, y: 0, mx: 20, my: 0, hasTamer: true, kind: "host-client", fullness: 100, happiness: 50, bag: {} });
  const ev = []; const e0 = sim.emit.bind(sim); sim.emit = e => { ev.push(e); return e0(e); };
  A.act({ type: "farm.enter", id: "local" });
  return { sim, A, p: sim.players[0], ev };
}
let w = mk(); const st = D.FARM_CFG.stations.bag;
const pv = MG.preview(D.FARM_CFG, st, w.p);
ok(w.A.act({ type: "farm.trainStart", id: "local", station: "bag" }).ok && w.sim.farm.activity.mg.kind === "strike", "the punching bag starts Power Strike");
let act = w.sim.farm.activity;
while (w.sim.farm.activity) { const m = act.mg; let g = 0; while (Math.abs(m.needle - m.zone) > 0.01 && g++ < 3000) w.A.act({ type: "farm.tick", id: "local", dt: 0.002, inp: { x: 0, y: 0 } }); w.A.act({ type: "farm.trainInput", id: "local", kind: "interact" }); w.A.act({ type: "farm.tick", id: "local", dt: 0.31, inp: { x: 0, y: 0 } }); }
let tr = w.ev.find(e => e.type === "farm.train");
ok(tr && tr.grade === "perfect" && tr.gain === pv.perfect && w.p.trainStats.offense === pv.perfect, "a perfect session gives what the sign said for Perfect: Offense +" + tr.gain + " (" + tr.before + " -> " + tr.after + ")");
ok(tr.nextGreat < pv.great, "  and the next session there is worth less (Great: " + pv.great + " -> " + tr.nextGreat + ")");
w = mk(); w.A.act({ type: "farm.trainStart", id: "local", station: "track" });
const fx = w.sim.farm.x, m0 = [w.sim.farm.mx, w.sim.farm.my]; w.A.act({ type: "farm.tick", id: "local", dt: 0.5, inp: { x: 1, y: 0 } });
ok(w.sim.farm.x === fx && w.sim.farm.activity.mg.lane === 0, "on the track the stick switches the partner's lane, the tamer stays put");
ok(Math.hypot(w.sim.farm.mx - m0[0], w.sim.farm.my - m0[1]) > 100, "  and the partner runs the track itself");
w.A.act({ type: "farm.tick", id: "local", dt: MG.LANES.dur, inp: { x: 0, y: 0 } });
tr = w.ev.find(e => e.type === "farm.train");
ok(tr && tr.stat === "agility" && tr.gain >= 1 && tr.detail, "Rockfall Run pays Agility: +" + tr.gain + " (" + tr.detail + ", " + tr.gradeLabel + ")");
w = mk(); w.A.act({ type: "farm.trainStart", id: "local", station: "board" });
while (w.sim.farm.activity) { const m = w.sim.farm.activity.mg; if (m.phase === "input") w.A.act({ type: "farm.trainInput", id: "local", kind: "choice", value: m.seq[m.idx] }); else w.A.act({ type: "farm.tick", id: "local", dt: 0.05, inp: { x: 0, y: 0 } }); }
tr = w.ev.find(e => e.type === "farm.train");
ok(tr && tr.stat === "intelligence" && tr.grade === "perfect", "Pattern Recall pays Intelligence: +" + tr.gain + " (" + tr.detail + ")");
w = mk(); w.A.act({ type: "farm.trainStart", id: "local", station: "bag" }); w.A.act({ type: "farm.return", id: "local" });
tr = w.ev.find(e => e.type === "farm.train");
ok(tr && tr.gain >= 1, "leaving mid-game still settles the session (+" + (tr && tr.gain) + ")");

/* 17z33: no time limit at the farm any more */
w = mk(); for (let i = 0; i < 120; i++) w.A.act({ type: "farm.tick", id: "local", dt: 5, inp: { x: 0, y: 0 } });
ok(w.sim.farm && w.sim.farm.active && !w.ev.some(e => e.type === "farm.return"), "ten minutes at the farm and it's still open: you leave when you choose");
console.log(failed ? "minigames-test: " + failed + " failed" : "minigames-test: all passed"); process.exit(failed ? 1 : 0);
