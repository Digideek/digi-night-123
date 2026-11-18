/* node scripts/level-lock-test.js : while the level-up skill window is open the pair is locked:
 * it cannot move, attack or be hurt, and it is released when the window closes. */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "weather", "seasons"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
const mission = require(path.join(root, "js/net/mission-sim.js"));
const prog = require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
function mk(coop) {
  const sim = new mission.MissionSim({ seed: 2, hz: auth.TICK_HZ, data: D }); const a = new auth.Authority({ sim: sim, seed: 2 });
  sim.phase = "playing"; sim.time = 60; sim.coop = !!coop; sim.skillTree = true;
  if (!sim.players[0]) { sim.players.push({ id: "local" }); sim.localId = "local"; }
  const p = sim.players[0];
  Object.assign(p, { form: "agumon", level: 5, xp: 0, xpNext: 50, hp: 100, maxHp: 100, x: 0, y: 0, mx: -30, my: 6, facing: 1, faint: 0, downed: false, hasTamer: true, kind: "human", moving: false, monInvuln: 0, tamerInvuln: 0, weapons: [{ id: "pepper_breath", level: 1, cd: 0 }], skills: {} });
  const e = { _id: 77, type: "numemon", x: 60, y: 0, hp: 1e6, maxHp: 1e6, radius: 12, flash: 0, hitCd: 0, hitCdM: 0 };
  sim.enemies.push(e);
  return { sim, a, p, e };
}
function spin(w, sec, inp) { for (let i = 0; i < 30 * sec; i++) { w.sim._moveTamer(w.p, inp, 1 / 30); w.sim._movePartner(w.p, 1 / 30); w.sim._updateWeapons(w.p, 1 / 30); } }
const RIGHT = { x: 1, y: 0 };

/* free: everything works */
let w = mk(false); spin(w, 2, RIGHT);
ok(w.p.x > 100, "normally the tamer walks (" + Math.round(w.p.x) + " px in 2 s)");
const shotsFree = w.sim.bullets.length + (1e6 - w.e.hp > 0 ? 1 : 0);
ok(shotsFree > 0 || w.p.monTarget, "normally the partner fights");

/* locked */
w = mk(false); w.p.choosing = 600; const mx0 = w.p.mx, b0 = w.sim.bullets.length;
spin(w, 3, RIGHT);
ok(w.p.x === 0 && w.p.y === 0, "skill window open: holding a direction does not move the tamer");
ok(w.p.mx === mx0 && !w.p.monTarget, "the partner stays put and picks no fight");
ok(w.sim.bullets.length === b0 && w.e.hp === 1e6, "it does not attack either (no free hits)");
const hp0 = w.p.hp; w.sim.hurtMon(w.p, 40, w.e);
ok(w.p.hp === hp0, "and nothing can hurt it");

/* released by closing the window */
const P = prog.Progression ? null : null;
w.p.choosing = 600; w.p.monInvuln = 600;
const h = (prog.Progression || prog).prototype._handlers["breather.end"];
h.call({ sim: () => w.sim, player: () => w.p }, { id: w.p.id });
ok(w.p.choosing === 0 && w.p.monInvuln <= 0.35, "closing the window releases the lock and the protection");
spin(w, 2, RIGHT);
ok(w.p.x > 100, "then the tamer walks again");
w.p.monInvuln = 0; w.sim.hurtMon(w.p, 10, w.e);
ok(w.p.hp < hp0, "and can be hurt again");

/* the lock runs out with its timer (co-op: 20 s) */
w = mk(true); w.p.choosing = 1; spin(w, 2, RIGHT);
ok(w.p.x > 20 && !(w.p.choosing > 0), "the lock ends by itself when its time is up");
ok(D.LEVEL_PAUSE.coopTime === 20 && D.LEVEL_PAUSE.time === 600, "co-op lock 20 s, solo until the window closes");

/* a real level-up sets it for a player and not for a CPU partner */
w = mk(true); w.p.xp = w.p.xpNext + 1; w.sim._eatOrb(w.p, { kind: "xp", value: 0 });
ok(w.p.level === 6 && w.p.choosing === 20, "a job level-up locks the player who levelled (co-op: " + w.p.choosing + " s)");
w = mk(true); w.p.kind = "cpu"; w.p.xp = w.p.xpNext + 1; w.sim._eatOrb(w.p, { kind: "xp", value: 0 });
ok(w.p.level === 6 && !(w.p.choosing > 0), "a CPU partner is never locked");
console.log(failed ? "level-lock-test: " + failed + " FAILED" : "level-lock-test: all passed"); process.exit(failed ? 1 : 0);
