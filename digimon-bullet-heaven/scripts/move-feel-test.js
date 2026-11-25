/* node scripts/move-feel-test.js : big moves wind up, ordinary ones stay instant, and hits say which move they came from (17z33) */
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
const W = D.WEAPONS;
function world(form, id, lvl) {
  const sim = new mission.MissionSim({ seed: 5, hz: auth.TICK_HZ, data: D }); new auth.Authority({ sim: sim, seed: 5 });
  sim.phase = "playing"; sim.time = 60; sim.skillTree = true;
  if (!sim.players[0]) { sim.players.push({ id: "local" }); sim.localId = "local"; }
  const p = sim.players[0];
  Object.assign(p, { form: form, level: 5, hp: 100, maxHp: 100, x: 0, y: 0, mx: 0, my: 0, facing: 1, faint: 0, downed: false, hasTamer: true, kind: "human", moving: false, skills: {} });
  p.skills[id] = lvl || 1; sim._syncMoves(p); p.stats = null;
  sim._roll = function () { return 1; };
  return { sim: sim, p: p };
}
let nid = 100;
function foe(sim, x, y) { const e = { _id: nid++, type: "numemon", x: x, y: y, hp: 1e6, maxHp: 1e6, radius: 12, flash: 0, hitCd: 0, hitCdM: 0 }; sim.enemies.push(e); return e; }
function lost(e) { return Math.round(1e6 - e.hp); }
function spin(sim, p, secs, noFire) { const ev = []; for (let i = 0; i < Math.round(secs * 25); i++) { if (!noFire) sim._updateWeapons(p, 0.04); sim._updateBullets(0.04); sim.time += 0.04; while (sim.events.length) ev.push(sim.events.shift()); } return ev; }
function has(ev, k) { return ev.some(e => e.type === "fx" && e.k === k); }


/* which moves are big */
const big = Object.keys(W).filter(id => D.isBigMove(id));
ok(big.length >= 40 && big.length <= 60, big.length + " big moves (the Megas' own beams, bursts, strikes and novas, and the few that already gathered)");
ok(D.isBigMove("terraForce") && W.terraForce.charge === 0.45, "Terra Force keeps its own wind-up");
const sm = Object.keys(D.SIG_INFO).find(id => D.SIG_INFO[id].tier >= 5 && W[id] && W[id].type === "strike" && W[id].charge === 0.3);
ok(!!sm, "a Mega's own strike (" + sm + ") now winds up for 0.3 s");
const small = Object.keys(D.SIG_INFO).find(id => D.SIG_INFO[id].tier <= 2 && W[id] && W[id].type === "projectile");
ok(small && !D.isBigMove(small), "a Rookie's shot (" + small + ") is not big: no wind-up");

/* in play: the big move gathers, then hits a moment later */
{
  const { sim, p } = world("wargreymon", sm); const a = foe(sim, 120, 0);
  const ev = []; let tCharge = null, tHit = null;
  for (let i = 0; i < 25 * 4; i++) {
    sim._updateWeapons(p, 0.04); sim._updateBullets(0.04); if (sim._updateCasts) sim._updateCasts(0.04);
    if (sim._tickCasts) sim._tickCasts(0.04);
    sim.time += 0.04;
    while (sim.events.length) { const e = sim.events.shift(); ev.push(e); if (e.type === "fx" && e.k === "charge" && tCharge == null) tCharge = sim.time; if (e.type === "hit" && e.w === sm && tHit == null) tHit = sim.time; }
  }
  ok(tCharge != null, "it gathers first (a charge fx)");
  ok(tHit == null || tHit - tCharge >= 0.28, "and its first hit comes " + (tHit == null ? "(not within 4 s here)" : (tHit - tCharge).toFixed(2) + " s later"));
  const h = ev.find(e => e.type === "hit");
  ok(!h || h.w, "hit events carry the move they came from (" + (h && h.w) + ")");
}
/* an ordinary shot: no gathering */
{
  const { sim, p } = world("agumon", small); foe(sim, 100, 0);
  const ev = spin(sim, p, 2);
  ok(!has(ev, "charge"), "an ordinary move fires straight away");
}
/* a Mega's main move hits harder (17z33, Isaac): Giga Destroyer from a WarGreymon, not from a MetalGreymon */
{ const S = world("wargreymon", "gigaDestroyer", 3).sim;
  ok(S._megaPunch("wargreymon", "gigaDestroyer") && S._megaPunch("wargreymon", "megaFlame"), "at Mega its primary line (Giga Destroyer, Mega Flame...) gets the punch (x" + D.MEGA_PUNCH + ")");
  ok(!S._megaPunch("metalgreymon", "gigaDestroyer"), "an Ultimate doesn't");
  ok(!S._megaPunch("wargreymon", "dragonClaw"), "and nor do its other moves"); }
console.log(failed ? failed + " FAILED" : "move-feel-test: all passed");
process.exit(failed ? 1 : 0);
