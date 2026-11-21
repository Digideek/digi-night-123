/* node scripts/modes-test.js : run modes, respawning, the low start, catch-up XP, bounties, scores,
 * the weekly map and the League server (Nov 20; modes-sim.js, nest-sim.js, boards-server.js). */
const path = require("path"), fs = require("fs"), os = require("os"), root = path.join(__dirname, "..");
global.window = global;
global.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {} }), width: 0, height: 0 }) };
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "day-clock", "seasons", "weather", "biomes", "rarity", "evo-stat-gates", "evo-hardmode"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
D.sprites = Object.assign(D.sprites || {}, { colors: {}, SCALE: 3, TILE: 48 });
require(path.join(root, "js/world.js"));
const W = D.world, R = D.RESPAWN;
const mission = require(path.join(root, "js/net/mission-sim.js"));
const modes = require(path.join(root, "js/net/modes-sim.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
W.reset(7); W.setTime(100);

function mk(mode) {
  const sim = new mission.MissionSim({ seed: 7, hz: 30, data: D });
  sim.phase = "playing"; sim.time = 2400; sim.runMode = mode;
  if (!sim.players[0]) { sim.players.push({ id: "local" }); sim.localId = "local"; }
  const p = sim.players[0];
  p.hasTamer = true; p.kind = "human"; sim._attrs(p);
  Object.assign(p, { form: "greymon", level: 24, hp: 50, maxHp: 400, x: 6000, y: 300, mx: 6000, my: 300, faint: 0, downed: false, hasTamer: true, kind: "human",
    tamerHp: 100, tamerMaxHp: 100, tamerLevel: 31, statPoints: 12, bits: 900, skills: { a: 1 }, skillPoints: 3, weapons: [{ id: "x", level: 2 }], trust: { forest: 60 } });
  return { sim, p };
}

/* ---- Open World: the partner falls, the run goes on ---- */
{
  const { sim, p } = mk("open");
  p.monInvuln = 0; sim._tamer = () => ({ invulnerable: true });
  sim.hurtMon(p, 9999);
  ok(!sim.runOver, "Open World: the partner falling does not end the run");
  ok(sim._isEgg(p.form) && p.form === "digitama_agumon", "it is the line's Digi Egg again (" + p.form + ")");
  ok(p.level === 1 && !Object.keys(p.skills).length && p.weapons.length === 0, "job level, skills and moves start over");
  ok(p.tamerLevel === 31 && p.statPoints === 12 && p.bits === 900 && p.trust.forest === 60, "base level, stat points, Bits and faction standing are kept");
  ok(Math.hypot(p.x, p.y) < R.near[1] + 40 && p.monInvuln > 0, "it comes back near the start (" + Math.round(Math.hypot(p.x, p.y)) + " px) with a moment's shield");
  ok(p.peakLevel === 24 && p.respawns === 1, "the best job level this run is remembered (" + p.peakLevel + ")");
  ok(sim._catchUp(p) === R.catchUp, "catch-up: x" + R.catchUp + " XP while well below that");
  p.level = 23; ok(sim._catchUp(p) === 1, "no boost once it is nearly back");
  /* the tamer falling too */
  p.tamerInvuln = 0; p.monInvuln = 0; p.x = 6000; sim._tamer = () => ({ invulnerable: false, iFrame: 0.5 });
  sim.hurtTamer(p, 999);
  ok(!sim.runOver && p.respawns === 2 && p.tamerHp > 0, "the tamer going down respawns as well");
}
/* ---- one-life modes end as before ---- */
["survival", "ranked", "weekly"].forEach(m => {
  const { sim, p } = mk(m);
  sim._tamer = () => ({ invulnerable: true });
  sim.hurtMon(p, 9999);
  ok(sim.runOver && !p.respawns, m + ": one life, the run ends");
  ok(sim._catchUp(p) === 1, m + ": no catch-up XP");
});

/* ---- the start stays low ---- */
{
  const { sim } = mk("open");
  const wave = sim._wave(5400);   /* 90 minutes in: Ultimate/Mega era */
  const defs = sim._enemies(), stageOf = t => defs[t] && defs[t].stageDisplay;
  const near = [], mid = [], far = [], cradle = [];
  for (let i = 0; i < 30; i++) {
    near.push(stageOf(sim._nestType("plains", "herd", wave, "n" + i, 1600, 400)));
    cradle.push(stageOf(sim._nestType("plains", "herd", wave, "c" + i, 600, 400)));
    mid.push(stageOf(sim._nestType("forest", "herd", wave, "m" + i, 3500, 0)));
    far.push(stageOf(sim._nestType("plains", "herd", wave, "f" + i, 9000, 0)));
  }
  ok(near.every(s => s === "Baby I" || s === "Baby II (In-Training)"), "near the start, 90 minutes in: Babies and In-Training only (" + [...new Set(near)].join(", ") + ")");
  ok(cradle.every(s => s === "Baby I"), "right by the start (the cradle): Babies only (" + [...new Set(cradle)].join(", ") + ")");
  ok(mid.every(s => ["Baby I", "Baby II (In-Training)", "Child (Rookie)"].includes(s)), "a little further: up to Rookie (" + [...new Set(mid)].join(", ") + ")");
  ok(far.some(s => !["Baby I", "Baby II (In-Training)", "Child (Rookie)"].includes(s)), "out in the world the clock still decides (" + [...new Set(far)].join(", ") + ")");
}

/* ---- the gentle start: low level and not toughened in the Baby zone ---- */
{
  const { sim } = mk("open");
  const tr = Object.keys(D.ENEMIES).find(k => D.ENEMIES[k].stageDisplay === "Baby II (In-Training)" && !D.ENEMIES[k].boss);
  const a = sim.spawnEnemy(tr, { x: 300, y: 200, keepType: true }), b = sim.spawnEnemy(tr, { x: 6000, y: 0, keepType: true });
  ok(a.lv <= R.startLv && a.maxHp < b.maxHp && (a.dmgMul || 1) < (b.dmgMul || 1), "near the start the wild ones are low level and not toughened (lv " + a.lv + ", " + a.maxHp + " HP vs lv " + b.lv + ", " + b.maxHp + " HP further out)");
}
/* ---- bounties ---- */
{
  const { sim, p } = mk("open");
  const q = { id: "foe", bits: 100, pvpWins: 0 }, r = { id: "hunter", bits: 0 };
  sim.players.push(q, r);
  for (let i = 0; i < D.BOUNTY.streak; i++) sim._bountyOnKo(p, { id: "v" + i, bits: 0 });
  ok(p.bounty === D.BOUNTY.base && p.pvpStreak === D.BOUNTY.streak, D.BOUNTY.streak + " wins in a row: a " + p.bounty + " Bit bounty");
  sim._bountyOnKo(p, { id: "v9", bits: 0 });
  ok(p.bounty === D.BOUNTY.base + D.BOUNTY.per, "it grows with each more win (" + p.bounty + ")");
  const before = r.bits, got = sim._bountyOnKo(r, p);
  ok(got === D.BOUNTY.base + D.BOUNTY.per && r.bits === before + got && !p.bounty && !p.pvpStreak, "whoever beats them takes it, and the streak is over");
}

/* ---- scores, Mega notes, the record ---- */
{
  const { sim, p } = mk("ranked");
  p.megaAt = null; p.form = "agumon"; sim._noteStage(p); ok(!p.megaAt, "no Mega note for a Rookie");
  const mega = Object.keys(D.SPECIES).find(k => D.SPECIES[k].stage === "Mega");
  p.form = mega; sim.time = 3900; sim._noteStage(p); ok(p.megaAt === 3900, "the first Mega is noted (" + mega + " at 65:00)");
  const fast = modes.score({}, { time: 3600, level: 30, megaAt: 3600 }), slow = modes.score({}, { time: 3600, level: 30, megaAt: 7200 });
  ok(fast > slow, "a sooner Mega scores more (" + fast + " vs " + slow + ")");
  p.kills = 500; p.lordsBeaten = 2; p.pvpWins = 1;
  const rec = sim._runRecord(p);
  ok(rec.mode === "ranked" && rec.score === sim._score(p) && rec.lords === 2 && rec.megaAt === 3900 && rec.faction === "forest", "the run record carries mode, score, lords, Mega time and the biome backed");
}

/* ---- the weekly map ---- */
ok(modes.weekOf(Date.UTC(2026, 10, 16)) === modes.weekOf(Date.UTC(2026, 10, 22, 23)) && modes.weekOf(Date.UTC(2026, 10, 23)) !== modes.weekOf(Date.UTC(2026, 10, 22)), "a week runs Monday to Sunday (" + modes.weekOf(Date.UTC(2026, 10, 20)) + ")");
ok(modes.weekSeed("2026-W47") === modes.weekSeed("2026-W47") && modes.weekSeed("2026-W47") !== modes.weekSeed("2026-W48"), "the same map for everyone that week, a new one the next");

/* ---- the League server ---- */
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "boards-"));
  const boards = require(path.join(root, "..", "boards-server.js"));
  boards._reset(path.join(tmp, "boards.json"));
  const H = boards._handlers, A = { key: "ann", name: "Ann" }, B = { key: "bo", name: "Bo" };
  const wk = modes.weekOf();
  let r = H.submit({ rec: { mode: "weekly", week: wk, seed: modes.weekSeed(wk), time: 3000, level: 28, kills: 900, lords: 1, pvp: 2, megaAt: null } }, A);
  ok(r[0] === 200 && r[1].placed.weekly === 1 && r[1].placed.level === 1, "a weekly run lands on the boards (score " + r[1].score + ")");
  r = H.submit({ rec: { mode: "ranked", time: 600, level: 12, kills: 300 } }, A);
  ok(r[0] === 429, "one run at a time: sending again straight away is refused");
  boards._reset(path.join(tmp, "boards.json"));
  r = H.submit({ rec: { mode: "weekly", week: wk, seed: 12345, time: 3000, level: 40, kills: 900 } }, B);
  ok(r[0] === 200 && !r[1].placed.weekly, "a 'weekly' run on the wrong map does not count for the weekly board");
  r = H.submit({ rec: { mode: "ranked", time: 60, level: 50, kills: 99999 } }, A);
  ok(r[0] === 400, "an impossible run is turned away");
  ok(H.back({ faction: "forest" }, A)[0] === 200 && H.back({ faction: "snow" }, A)[0] === 409, "back a biome once a week");
  boards._reset(path.join(tmp, "boards.json"));
  r = H.submit({ rec: { mode: "open", time: 1800, level: 20, kills: 400, pvp: 1, landBy: { forest: 7, snow: 3 } } }, A);
  ok(r[1].season && r[1].season.added === 7 + boards.SEASON.pvp, "a run adds the land your biome took (+" + r[1].season.added + ") to the season");
  const g = H.get({}, A)[1];
  ok(g.boards.level.list[0].name === "Bo" && g.me.places.level === 2 && g.me.bests.lords === 1 && g.season.list[0].faction === "forest", "the League shows the boards, your place and the season");
  ok(H.submit({ rec: {} }, null)[0] === 401, "no account, no League");
  /* last week's season pays its backers once */
  const db = JSON.parse(fs.readFileSync(path.join(tmp, "boards.json"), "utf8")), last = modes.weekBefore(wk);
  db.seasons[last] = { forest: 50, snow: 20 }; db.players.ann.backs[last] = "forest";
  fs.writeFileSync(path.join(tmp, "boards.json"), JSON.stringify(db)); boards._reset(path.join(tmp, "boards.json"));
  const c1 = H.claim({}, A), c2 = H.claim({}, A);
  ok(c1[0] === 200 && c1[1].bits === boards.SEASON.reward && c2[0] === 409, "the winning biome's backers claim " + boards.SEASON.reward + " DigiBits, once");
}

console.log(failed ? failed + " failed" : "all passed");
process.exit(failed ? 1 : 0);
