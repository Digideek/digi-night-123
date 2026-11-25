/* node scripts/hit-feel-test.js : what the simulation says about a hit, and what hit-fx.js makes of it */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "weather", "seasons"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
const H = require(path.join(root, "js/hit-fx.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const sim = new mission.MissionSim({ seed: 4, hz: auth.TICK_HZ, data: D }); new auth.Authority({ sim: sim, seed: 4 });
sim.phase = "playing"; sim.time = 100;
const ev = []; const emit0 = sim.emit.bind(sim); sim.emit = e => { ev.push(e); return emit0(e); };
function mk(hp) { const e = { _id: 100 + sim.enemies.length, type: "numemon", x: 50, y: 0, hp: hp, maxHp: hp, radius: 14, flash: 0, hitCd: 0, hitCdM: 0 }; sim.enemies.push(e); return e; }
const last = t => ev.filter(e => e.type === t).pop();
/* the simulation's hit event */
let e = mk(200); sim.hurtEnemy(e, 50, 0, 0, 0, null, 1, null);
let h = last("hit");
ok(h.damage === 50 && h.f === 0.25 && h.r === 14 && !h.c && !h.k && h.by === null, "a hit reports its damage, the share of the enemy's health (25%), and its size");
e = mk(200); sim.hurtEnemy(e, 50, 0, 0, 0, null, 2, null); h = last("hit");
ok(h.c === 1 && h.damage === 100, "a critical is marked as one");
e = mk(40); sim.hurtEnemy(e, 50, 0, 0, 0, null, 1, null); h = last("hit"); const k = last("kill");
ok(h.k === 1 && k && k.r === 14 && k.hp === 40 && k.big === false, "the killing blow is marked, and the kill says how big and how tough it was");
e = mk(4000); e.boss = true; e.hp = 1; sim.hurtEnemy(e, 50, 0, 0, 0, null, 1, null); ok(last("kill").big === true, "a boss kill is marked big");
/* numbers */
H.clear();
H.hit({ enemyId: 1, damage: 12.4, x: 0, y: 0 }, { own: true, frac: 0.1, radius: 12, sx: -50, sy: 0 });
let st = H._state();
ok(st.nums === 1 && st.list[0].val === 12 && st.list[0].kind === "norm" && st.list[0].size === 2, "an ordinary hit: a white 12 at the small size");
ok(st.kick[0] > 0 && st.kick[1] === 0 && st.stop === 0, "the camera jolts along the line of the blow; no hold for an ordinary hit");
H.hit({ enemyId: 1, damage: 8, x: 0, y: 0 }, { own: true, frac: 0.1, radius: 12, sx: -50, sy: 0 });
st = H._state(); ok(st.nums === 2 && st.list[0].val === 12 && st.list[1].val === 8, "a second blow on the same enemy in the same instant gets its own number, never added together (12, 8)");
H.update(0.2);
H.hit({ enemyId: 1, damage: 8, x: 0, y: 0 }, { own: true, frac: 0.1, radius: 12 });
ok(H._state().nums === 3, "and so does a later one");
H.clear();
H.hit({ enemyId: 2, damage: 90, x: 0, y: 0, c: 1 }, { own: true, frac: 0.7, radius: 12, sx: -50, sy: 0 });
st = H._state();
ok(st.list[0].kind === "crit" && st.list[0].size === 4 && st.stop === 0 && st.zoom > 0, "a critical on small fry: gold, the biggest size and a push in, but no hold (only big hits hold)");
H.clear(); H.update(1); H.hit({ enemyId: 2, damage: 90, x: 0, y: 0, c: 1 }, { own: true, frac: 0.3, tough: true }); ok(H._state().stop === H.CFG.stop.big, "a critical on a tough enemy is a big hit: a " + H.CFG.stop.big * 1000 + " ms hold");
H.clear(); H.update(1); H.hit({ enemyId: 2, damage: 90, x: 0, y: 0 }, { own: true, frac: 0.25, bigMove: true }); ok(H._state().stop === H.CFG.stop.big, "a big move landing a real share holds too");
H.clear(); H.update(1); H.hit({ enemyId: 2, damage: 90, x: 0, y: 0 }, { own: true, frac: 1 }); ok(H._state().stop === 0, "an ordinary move knocking out small fry in one blow does not hold");
H.clear(); H.hit({ enemyId: 3, damage: 30, x: 0, y: 0, m: 1 }, { own: true, frac: 0.3 }); ok(H._state().list[0].kind === "weak", "a weakness shows in orange");
H.clear(); H.hit({ enemyId: 3, damage: 30, x: 0, y: 0, m: -1 }, { own: true, frac: 0.3 }); ok(H._state().list[0].kind === "resist", "a resisted hit in grey");
H.clear(); H.hit({ enemyId: 3, damage: 30, x: 0, y: 0, bolt: 1 }, { bolt: true, frac: 0.4 }); st = H._state(); ok(st.list[0].kind === "bolt" && st.kick[0] === 0 && st.kick[1] === 0, "lightning in pale blue, and it does not jolt your camera");
H.clear(); H.hit({ enemyId: 3, damage: 30, x: 0, y: 0, c: 1 }, { mate: true, frac: 0.4 }); st = H._state(); ok(st.stop === 0 && st.kick[0] === 0, "a friend's critical shows its number but does not hold or jolt your screen");
/* squash */
H.clear(); H.hit({ enemyId: 7, damage: 5, x: 0, y: 0 }, { own: true, sx: -10, sy: 0 });
let pk = H.punchOf(7); ok(pk && pk.k === 1 && pk.ox > 0 && H.punchOf(8) === null, "the enemy that was hit squashes and leans away; others do not");
H.update(H.CFG.punchTime + 0.01); ok(H.punchOf(7) === null, "and is back to normal after " + H.CFG.punchTime * 1000 + " ms");
/* holds */
H.clear(); H.kill({ x: 0, y: 0 }, { own: true, sx: -10, sy: 0 });
ok(H._state().stop === 0, "an ordinary kill never holds the fight");
H.clear(); H.update(1); H.kill({ x: 0, y: 0 }, { own: true, tough: true });
let frames = 0; while (H.stopping(1 / 60)) frames++;
ok(frames >= 3 && frames <= 5, "a tough kill holds for " + frames + " frames at 60 a second");
H.kill({ x: 0, y: 0 }, { own: true, tough: true }); ok(H._state().stop === 0, "a second one straight after does not hold again (no stutter)");
H.kill({ x: 0, y: 0 }, { own: true, big: true }); ok(H._state().stop === H.CFG.stop.bossKill, "but a boss kill always does, for " + H.CFG.stop.bossKill * 1000 + " ms");
H.clear(); H.update(1); H.kill({ x: 0, y: 0 }, { own: true, tough: true }); ok(H._state().stop === H.CFG.stop.toughKill, "a tough enemy's kill holds longer than a small one's");
let total = 0; H.clear(); H.update(1);
for (let i = 0; i < 600; i++) { if (i % 6 === 0) H.kill({ x: 0, y: 0 }, { own: true }); H.update(1 / 60); if (H.stopping(1 / 60)) total++; }
ok(total === 0, "ten ordinary kills a second for ten seconds: never held (" + total + " frames)");
/* the partner hurt */
H.clear(); H.update(1); H.hurt(0, 0, 3, 0.02); st = H._state(); ok(st.nums === 0 && st.stop === 0, "a scratch on your partner: no number at all (Isaac), and no hold");
H.clear(); for (let i = 0; i < 100; i++) H.hit({ enemyId: 7, damage: 5 + i, x: 0, y: 0 }, { own: true, frac: 0.01, radius: 12 }); st = H._state();
ok(st.nums === 100 && st.list.every((n, i) => n.val === 5 + i), "a hundred fast hits on one enemy: a hundred numbers, each its own");
H.clear(); H.hit({ enemyId: 2, damage: 9, x: 0, y: 0, m: 1 }, { own: true, frac: 0.05 }); H.hit({ enemyId: 2, damage: 3, x: 0, y: 0, m: -1 }, { own: true, frac: 0.05 }); st = H._state();
ok(st.list[0].kind === "weak" && st.list[1].kind === "resist", "a weakness and a resisted hit are marked (drawn with an up and a down arrow)");
H.clear(); for (let i = 0; i < 5; i++) H.miss({ x: 10, y: 20 }); st = H._state();
ok(st.nums === 5 && st.list.every(n => n.val === "MISS" && n.kind === "miss"), "every miss shows MISS, five at once five times");
{ const ev = []; const s2 = sim; const e0 = s2.emit; s2.emit = x => { ev.push(x); return e0.call(s2, x); };
  if (!s2.players.length) s2.players.push({ id: "local", kind: "host-client", form: "agumon", hp: 50, maxHp: 50, x: 0, y: 0, mx: 0, my: 0 });
  const p0 = s2.players[0], ro = s2._ro, dv = s2._derived; s2._ro = () => ({ hitChance: () => 0 }); s2._derived = () => ({ crit: 0, critMul: 2, hit: 0 });
  const tgt = mk(200); let n = 0; for (let i = 0; i < 20; i++) if (!s2.hurtEnemy(tgt, 10, 0, 0, 0, { id: p0.id }, null, null)) n++;
  s2._ro = ro; s2._derived = dv; s2.emit = e0;
  ok(n === 20 && ev.filter(x => x.type === "fx" && x.k === "miss").length === 20, "and the sim says so for every one (20 misses, 20 MISS events)"); }
H.hurt(0, 0, 30, 0.2); ok(H._state().stop === H.CFG.stop.hurt, "a heavy blow (a tenth of its health or more) holds the fight and jolts the camera");
/* never more numbers than the limit */
H.clear(); for (let i = 0; i < 200; i++) H.hit({ enemyId: 1000 + i, damage: 5, x: i, y: 0 }, { own: true });
ok(H._state().nums === H.CFG.numbers, "never more than " + H.CFG.numbers + " numbers on screen");
console.log(failed ? "hit-feel-test: " + failed + " FAILED" : "hit-feel-test: all passed");
process.exit(failed ? 1 : 0);
