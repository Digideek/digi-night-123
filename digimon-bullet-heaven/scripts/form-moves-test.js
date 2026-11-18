/* node scripts/form-moves-test.js : every form's own shot (moves.js "A move of its own for every form"): Agumon and Gomamon lines */
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

ok(W.megaFlame.name === "Nova Blast" && D.MOVE_LINES.agumon.primary[3] === "megaFlame", "Greymon's shot is called Nova Blast");
{ const { sim, p } = world("agumon", "pepperBreath"); const a = foe(sim, 90, 0), b = foe(sim, 98, 14);
  const ev = spin(sim, p, 0.6);
  ok(lost(a) > 0 && lost(b) > 0 && lost(a) > lost(b) && has(ev, "boom"), "Pepper Breath: the fireball bursts and splashes the enemy beside the one it hit (" + lost(a) + ", " + lost(b) + ")"); }
{ const { sim, p } = world("greymon", "megaFlame"); const a = foe(sim, 120, 0), b = foe(sim, 160, 30), c = foe(sim, 120, 140);
  spin(sim, p, 0.2); const n = sim.bullets.length; spin(sim, p, 0.6, true);
  ok(n === 1 && lost(a) >= 40 && lost(b) > 0 && lost(c) === 0, "Nova Blast: one big fireball, and the blast reaches an enemy 50 px from where it lands (" + lost(a) + ", " + lost(b) + ")"); }
{ const { sim, p } = world("metalgreymon", "gigaDestroyer"); const a = foe(sim, 60, -170);
  spin(sim, p, 0.2); const b0 = sim.bullets.slice(), wide = b0.length === 2 && Math.abs(Math.atan2(b0[0].vy, b0[0].vx) - Math.atan2(b0[1].vy, b0[1].vx)) > 0.5;
  const ev = spin(sim, p, 1.6, true);
  ok(wide && lost(a) > 0 && has(ev, "boom"), "Giga Destroyer: two missiles leave wide apart, come round on the target and explode"); }
{ const { sim, p } = world("wargreymon", "terraForce"); const a = foe(sim, 150, 0);
  let ev = spin(sim, p, 0.3); const early = sim.bullets.length;
  ev = ev.concat(spin(sim, p, 0.3)); const late = sim.bullets.length;
  ok(early === 0 && late === 1 && has(ev, "charge"), "Terra Force: nothing leaves while the sun is gathered, then it is thrown");
  spin(sim, p, 1.2, true); ok(lost(a) >= 70, "and it lands (" + lost(a) + ")"); }
{ const { sim, p } = world("wargreymon", "terraForce"); foe(sim, 150, 0);
  spin(sim, p, 0.2); p.faint = 3; spin(sim, p, 0.6, true);
  ok(sim.bullets.length === 0, "a partner that faints while gathering it throws nothing"); }
{ const { sim, p } = world("bukamon", "seaFoam", 10); foe(sim, 60, 0);
  let most = 0; for (let i = 0; i < 8; i++) { sim._updateWeapons(p, 0.04); most = Math.max(most, sim.bullets.length); }
  ok(most === 3, "Sea Foam: three bubbles at once at the top level"); }
{ const { sim, p } = world("gomamon", "marchingFishes"); const a = foe(sim, 90, 120);
  spin(sim, p, 0.2); const n = sim.bullets.length, hunt = sim.bullets.every(b => b.turn > 0); spin(sim, p, 1.3, true);
  ok(n === 3 && hunt && lost(a) >= 12, "Marching Fishes: three fish swim out and at least two find an enemy off to the side (" + lost(a) + ")");
  const q = world("gomamon", "marchingFishes"); spin(q.sim, q.p, 3);
  ok(q.sim.bullets.length === 0, "and no fish are called with nothing to chase"); }
{ const { sim, p } = world("ikkakumon", "harpoonTorpedo"); const a = foe(sim, 200, 60), b = foe(sim, 225, 80);
  let ev = spin(sim, p, 0.2); const s0 = Math.hypot(sim.bullets[0].vx, sim.bullets[0].vy);
  ev = ev.concat(spin(sim, p, 0.3, true)); const s1 = sim.bullets[0] ? Math.hypot(sim.bullets[0].vx, sim.bullets[0].vy) : 999;
  ev = ev.concat(spin(sim, p, 1.2, true));
  ok(s0 < 160 && s1 > 330 && has(ev, "split"), "Harpoon Torpedo: the horn leaves slowly (" + Math.round(s0) + "), splits, and the torpedo takes off (" + Math.round(s1) + ")");
  ok(lost(a) > 0 && lost(b) > 0 && has(ev, "boom"), "it finds the target and the explosion catches the one beside it"); }
{ const { sim, p } = world("zudomon", "hammerSpark"); const a = foe(sim, 50, 0), b = foe(sim, 140, 0), c = foe(sim, 90, 120);
  let ev = spin(sim, p, 0.2); const first = lost(a), second = lost(b);
  ev = ev.concat(spin(sim, p, 0.4, true));
  ok(first > 0 && second === 0 && lost(b) > 0 && lost(c) === 0 && ev.filter(e => e.k === "zap").length === 3 && has(ev, "slam"), "Hammer Spark: three strikes walk out in a row, near one first, then the far one; nothing off the line"); }
{ const { sim, p } = world("vikemon", "arcticBlizzard"); const mid = foe(sim, 60, 0), near = foe(sim, 70, 42), far = foe(sim, 200, 40);
  let ev = spin(sim, p, 0.2); const one = lost(mid);
  ev = ev.concat(spin(sim, p, 0.5, true));
  ok(one > 0 && lost(mid) === one * 3 && ev.filter(e => e.k === "beam").length === 3, "Arctic Blizzard: it blows three times (" + one + " each)");
  ok(lost(far) > 0 && lost(near) === 0, "and it is a cone: wide far away, narrow up close"); }
/* the other seventeen lines: every shot fires, lands, and is about as strong as the one it replaced */
{
  const rows = []; let bad = 0, n = 0;
  for (const k of Object.keys(D.MOVE_LINES)) {
    const ln = D.MOVE_LINES[k];
    ln.primary.forEach((id, tier) => {
      const d = W[id];
      if (!d.was || rows.some(r => r.id === id)) return;
      const out = [];
      [1, 10].forEach((lvl, ix) => {
        const { sim, p } = world("agumon", id, lvl); const e = foe(sim, 80, 0);
        sim.data = Object.assign({}, D, { ELEMENTS: null, STATUS: null });   /* strength only: no weak or resisted hits, no burns */
        for (let i = 0; i < 12 * 25; i++) { sim._updateWeapons(p, 0.04); sim._updateBullets(0.04); sim.time += 0.04; sim.events.length = 0; e.x = 80; e.y = 0; }
        out.push(lost(e) / 12 / d.was[ix]);
      });
      n++;
      const okay = out.every(r => r > (d.levels[0].full ? 0.25 : 0.4) && r < 2.0);
      if (!okay) bad++;
      rows.push({ id, name: d.name, r: out.map(x => x.toFixed(2)).join(" / "), okay });
    });
  }
  rows.filter(r => !r.okay || process.env.ALL).forEach(r => console.log("    " + (r.okay ? "" : "off: ") + r.name + " " + r.r));
  ok(n >= 70 && bad === 0, n + " reworked shots all land, each between 0.4x and 2x the single-target damage of the shot it replaced");
  const ids = []; Object.keys(D.MOVE_LINES).forEach(k => { const pr = D.MOVE_LINES[k].primary; for (let t = 2; t < pr.length; t++) for (let u = t + 1; u < pr.length; u++) if (pr[t] === pr[u]) ids.push(k + ":" + pr[t]); });
  ok(ids.length === 0, "no line has the same shot at two stages" + (ids.length ? " (" + ids.join(", ") + ")" : ""));
}
console.log(failed ? "form-moves-test: " + failed + " failed" : "form-moves-test: all passed");
process.exit(failed ? 1 : 0);
