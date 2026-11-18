/* node scripts/ultimate-test.js : Mega ultimates (moves.js ULT): R at Mega fires the signature move as a near-wipe, and it is no longer an ordinary skill */
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
function world(form) {
  const sim = new mission.MissionSim({ seed: 5, hz: auth.TICK_HZ, data: D }); const a = new auth.Authority({ sim: sim, seed: 5 });
  sim.phase = "playing"; sim.time = 60; sim.skillTree = true;
  if (!sim.players[0]) { sim.players.push({ id: "local" }); sim.localId = "local"; }
  const p = sim.players[0];
  Object.assign(p, { form: form, level: 40, hp: 50, maxHp: 100, x: 0, y: 0, mx: 0, my: 0, facing: 1, faint: 0, downed: false, hasTamer: true, kind: "human", moving: false, skills: {}, burst: 100, monInvuln: 0 });
  sim._syncMoves(p); p.stats = null; p.weapons = [];
  return { sim, p, a };
}
let nid = 100;
function foe(sim, x, y, o) { const e = Object.assign({ _id: nid++, type: "numemon", x: x, y: y, hp: 500, maxHp: 500, radius: 12, flash: 0, hitCd: 0, hitCdM: 0 }, o || {}); sim.enemies.push(e); return e; }
function spin(sim, secs) { const ev = []; for (let i = 0; i < Math.round(secs * 25); i++) { sim._updateUlts(0.04); sim._updateBullets(0.04); sim.time += 0.04; while (sim.events.length) ev.push(sim.events.shift()); } return ev; }
const dead = e => e.dead || !(e.hp > 0);

/* which forms have one, and what it does to the skill tree */
const megas = ["wargreymon", "metalgarurumon", "imperialdramon_fightermode", "gallantmon", "hiandromon", "jijimon", "diablomon", "phoenixmon", "herculeskabuterimon", "vikemon", "seraphimon", "rosemon", "sakuyamon", "durandamon", "magnadramon", "megagargomon"].filter(f => D.SPECIES[f] || (global.EVO_TREE.species || {})[f]);
const us = megas.map(f => D.megaUltimate(f));
ok(megas.length >= 14 && us.every(u => u && D.MOVE_ULT[u.id]), megas.length + " line Megas each have their own ultimate: " + us.map(u => u.name).join(", "));
ok(new Set(us.map(u => u.id)).size === us.length, "no two of them share one");
ok(D.megaUltimate("greymon") === null && D.megaUltimate("metalgreymon") === null && D.megaUltimate("botamon") === null, "nothing below Mega has one");
const tr = SK.tree(D, "wargreymon", {}), prim = tr.slots.primary.map(e => e.id);
ok(prim.indexOf("terraForce") < 0 && prim.indexOf("gigaDestroyer") >= 0, "Terra Force is out of WarGreymon's skill tree; Giga Destroyer and the rest are still there");
const any = Object.keys(D.SPECIES).filter(f => D.moveStageIdx(f) >= 5);
ok(any.length > megas.length && any.every(f => D.megaUltimate(f)), "every one of the " + any.length + " Mega forms in the game has one (others use their element's)");

/* WarGreymon: the near-wipe */
{ const { sim, p, a } = world("wargreymon");
  const near = foe(sim, 100, 0), mid = foe(sim, 0, -300), rim = foe(sim, 400, 0), band = foe(sim, -500, 0), far = foe(sim, 0, 700), boss = foe(sim, 200, 100, { boss: true, hp: 10000, maxHp: 10000 });
  const r = a.act({ type: "burst", id: p.id });
  let ev = spin(sim, 0.6);
  ok(r.ok && r.ult === "terraForce" && !p.burstForm && ev.some(e => e.type === "ult.start" && e.name === "Terra Force"), "R at full meter: WarGreymon does not warp, it starts Terra Force");
  ok(!dead(near) && near.hp === 500 && p.monInvuln > 0, "nothing is hit while it is gathered, and the partner cannot be hurt meanwhile");
  ev = ev.concat(spin(sim, 1.6));
  ok(dead(near) && dead(mid), "everything well inside the circle dies");
  ok(!dead(rim) && rim.hp < 500, "an enemy at the very edge of the circle is hurt but lives (" + Math.round(rim.hp) + "/500)");
  ok(!dead(band) && band.hp === 500 && far.hp === 500 && !(far.st && Object.keys(far.st).length), "one just outside is not damaged, and one further off is not touched at all");
  ok(boss.hp > 6500 && boss.hp < 8500, "a boss loses about a quarter of its health (" + Math.round(boss.hp) + "/10000)");
  ok((sim.patches || []).filter(q => q.kind === "fire").length >= 4, "the ground is left burning");
  const st0 = ev.find(e => e.type === "ult.start");
  ok(st0.mark.k === "crater" && st0.mark.time >= 180, "and the crater stays for " + st0.mark.time + " seconds");
  ok(p.burst < 5 && !p.ultLock && ev.some(e => e.type === "ult.end"), "it does not refill its own meter, and it ends");
  ok(!a.act({ type: "burst", id: p.id }).ok, "it cannot be fired again until the meter is full"); }
/* MetalGarurumon: freeze, not kill */
{ const { sim, p, a } = world("metalgarurumon"); const x = foe(sim, 150, 0), y = foe(sim, 400, 200), behind = foe(sim, -250, 0);
  const ev0 = []; a.act({ type: "burst", id: p.id }); while (sim.events.length) ev0.push(sim.events.shift()); spin(sim, 1.6);
  ok(!dead(x) && !dead(y) && x.hp < 500 && x.st && x.st.freeze && x.st.freeze.t > 3 && y.st && y.st.freeze, "Metal Wolf Claw: enemies ahead are hurt and frozen solid, not wiped (" + Math.round(x.hp) + "/500, frozen " + x.st.freeze.t.toFixed(1) + "s)");
  ok(behind.hp === 500 && !(behind.st && behind.st.freeze), "it is a cone: one behind the partner is not touched");
  const st = ev0.find(e => e.type === "ult.start");
  ok(st && st.mark && st.mark.k === "ice" && st.mark.time >= 120 && st.polys.length === 1, "it leaves ice on the ground for " + (st && st.mark && st.mark.time) + " seconds");
  const late = foe(sim, 300, 0); spin(sim, 60);
  ok(late.st && late.st.chill && late.st.chill.t > 0, "a minute later an enemy walking onto that ice is still slowed");
  spin(sim, 100); late.st = {}; spin(sim, 2);
  ok(!(late.st.chill && late.st.chill.t > 0) && !(sim._zones || []).length, "and after " + st.mark.time + " seconds the ice is gone"); }
/* the shapes */
{ const { sim, p, a } = world("vikemon"); foe(sim, 60, 0);
  const ev0 = []; a.act({ type: "burst", id: p.id }); while (sim.events.length) ev0.push(sim.events.shift());
  const P = ev0.find(e => e.type === "ult.start").polys[0], rs = []; for (let i = 0; i < P.pts.length; i += 2) rs.push(Math.hypot(P.pts[i] - P.cx, P.pts[i + 1] - P.cy));
  ok(Math.max(...rs) > 540 && Math.min(...rs) < 400 && Math.max(...rs) / Math.min(...rs) > 1.45, "Arctic Blizzard's sheet of ice is uneven: it reaches " + Math.round(Math.min(...rs)) + " px one way and " + Math.round(Math.max(...rs)) + " another"); }
{ const { sim, p, a } = world("durandamon"); const ahead = foe(sim, 150, 0), far = foe(sim, 800, 100), side = foe(sim, 100, 420), back = foe(sim, -300, 0);
  a.act({ type: "burst", id: p.id }); spin(sim, 2.2);
  ok(dead(ahead) && dead(far) && side.hp === 500 && back.hp === 500, "Legend Wave is a lane straight ahead: it kills 800 px out, and misses the side and the back"); }
{ const { sim, p, a } = world("hiandromon"); foe(sim, 60, 0); const on = foe(sim, 500, 0), off = foe(sim, 300 * Math.cos(0.52), 300 * Math.sin(0.52));
  a.act({ type: "burst", id: p.id }); spin(sim, 2.2);
  ok(dead(on) && off.hp === 500, "Atomic Ray is a star: an enemy 500 px out on a ray dies, one 300 px out between two rays is missed"); }
{ const { sim, p, a } = world("megagargomon"); foe(sim, 60, 0); const fs = []; for (let i = 0; i < 120; i++) fs.push(foe(sim, Math.cos(i * 2.4) * (60 + i * 3.6), Math.sin(i * 2.4) * (60 + i * 3.6)));
  a.act({ type: "burst", id: p.id }); spin(sim, 3);
  const k = fs.filter(dead).length;
  ok(k > 30 && k < 100, "Mega Barrage lands in separate strikes: " + k + " of 120 enemies spread over the field die, the rest stood between them"); }
/* Sakuyamon pulls, Phoenixmon heals, Gallantmon shields */
{ const { sim, p, a } = world("sakuyamon"); const b = foe(sim, 480, 0);
  a.act({ type: "burst", id: p.id }); spin(sim, 2.2);
  ok(!dead(b) && b.kvx < -50, "Spirit Strike throws a survivor at the edge back toward the partner"); }
{ const { sim, p, a } = world("phoenixmon"); foe(sim, 100, 0);
  a.act({ type: "burst", id: p.id }); spin(sim, 2);
  ok(p.hp >= 84, "Crimson Flare gives the partner a third of its health back (" + Math.round(p.hp) + "/100)"); }
{ const { sim, p, a } = world("gallantmon"); foe(sim, 100, 0);
  a.act({ type: "burst", id: p.id }); spin(sim, 2);
  ok(p.monInvuln > 3, "Shield of the Just leaves the partner unhurtable for seconds afterward (" + p.monInvuln.toFixed(1) + "s left)"); }
/* below Mega nothing changed */
{ const { sim, p, a } = world("agumon"); const r = a.act({ type: "burst", id: p.id });
  ok(r.ok && !r.ult && p.burstForm === "greymon", "Agumon still warps to Greymon"); }
{ const { sim, p, a } = world("weregarurumon"); const r = a.act({ type: "burst", id: p.id });
  ok(r.ok && p.burstForm === "metalgarurumon" && p.burstWeapons[0].id === "gracefulCannon", "WereGarurumon still warps to MetalGarurumon and fires Metal Wolf Claw while it lasts"); }
console.log(failed ? "ultimate-test: " + failed + " failed" : "ultimate-test: all passed");
process.exit(failed ? 1 : 0);
