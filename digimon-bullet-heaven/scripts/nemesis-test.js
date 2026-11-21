/* node scripts/nemesis-test.js : the wild Digimon that beats you becomes your nemesis (Nov 20; nemesis-sim.js). */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
global.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {} }), width: 0, height: 0 }) };
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "day-clock", "seasons", "weather", "biomes", "rarity", "evo-stat-gates", "evo-hardmode"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
D.sprites = Object.assign(D.sprites || {}, { colors: {}, SCALE: 3, TILE: 48 });
require(path.join(root, "js/world.js"));
const W = D.world, N = D.NEMESIS;
const mission = require(path.join(root, "js/net/mission-sim.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
W.reset(5); W.setTime(100);
const sim = new mission.MissionSim({ seed: 5, hz: 30, data: D });
sim.phase = "playing"; sim.time = 900; sim.runMode = "open";
if (!sim.players[0]) { sim.players.push({ id: "local" }); sim.localId = "local"; }
const p = sim.players[0];
Object.assign(p, { name: "Isaac", form: "agumon", level: 12, hp: 50, maxHp: 200, x: 3000, y: 0, mx: 3000, my: 0, faint: 0, downed: false, hasTamer: true, kind: "human", tamerHp: 100, tamerMaxHp: 100, bits: 0 });
sim._tamer = () => ({ invulnerable: true, radius: 10 });
sim.enemies.length = 0;
const rook = Object.keys(D.ENEMIES).find(k => D.ENEMIES[k].stageDisplay === "Child (Rookie)" && !D.ENEMIES[k].boss && sim._burstForm(k) !== k);
const e = sim.spawnEnemy(rook, { x: 3020, y: 0, keepType: true });
e.pack = "nest:x"; e.nest = "x";
const lv0 = e.lv, hp0 = e.maxHp, type0 = e.type;
p.monInvuln = 0; sim.hurtMon(p, 99999, e);
ok(e.nemesis && e.nem === 1 && e.nemTitle === "Isaac's Nemesis", "the one that beat your partner is now “" + e.nemTitle + "”");
ok(e.lv >= lv0 + N.perKill.lv && e.maxHp > hp0 * 1.4 && e.hp === e.maxHp, "it gained levels (" + lv0 + " → " + e.lv + ") and health (" + Math.round(hp0) + " → " + Math.round(e.maxHp) + "), healed in full");
{ const nx = sim._burstForm(type0), need = D.LEVELS.band[D.ENEMIES[nx].stageDisplay][0];
  ok(N.perKill.lv === 4 && (e.lv >= need ? e.type === nx : e.type === type0), "4 levels a win, and it digivolves only if that reaches the next form (Lv " + e.lv + ", " + nx + " needs " + need + "): " + type0 + " → " + e.type); }
ok(e.nemAway > sim.time, "after beating you it heads out of the low-level area for a while");
ok(!e.pack && !e.nest, "it left its herd to roam");
ok(p.respawns === 1 && !sim.runOver, "(your partner respawns as usual in Open World)");
/* a friend falls to it too */
const q = { id: "friend", name: "Ren", form: "gabumon", level: 10, hp: 10, maxHp: 100, x: 3000, y: 50, mx: 3000, my: 50, faint: 0, hasTamer: true, kind: "client", tamerHp: 100, tamerMaxHp: 100 };
sim.players.push(q);
const type1 = e.type; sim.hurtMon(q, 99999, e);
ok(e.nem === 2 && /^Isaac's Scourge$/.test(e.nemTitle) && e.nemKills === 2, "beating a friend's partner too: “" + e.nemTitle + "” (" + type1 + " → " + e.type + ")");
/* it feeds on wild Digimon */
for (let i = 0; i < 15; i++) sim._nemesisFed(e, { boss: false });
ok(e.nem === 3 && /Tyrant/.test(e.nemTitle), "wild kills feed it: “" + e.nemTitle + "” at " + e.nemPts + " points");
/* it hunts other biomes' Digimon when no tamer is near */
p.x = 99999; p.mx = 99999; q.x = 99999; q.mx = 99999;
const fac = sim._factionOf(e);
const other = Object.keys(D.ENEMIES).find(k => !D.ENEMIES[k].boss && D.biomes.homeOf(k) && D.biomes.homeOf(k) !== fac && D.ENEMIES[k].stageDisplay === "Child (Rookie)");
const prey = sim.spawnEnemy(other, { x: e.x + 200, y: e.y, keepType: true });
e.nemAway = 0;                                              /* (later on, once it has gone) */
const tgt = sim._nemesisAct(e, 1e15, 0.1);
ok(tgt === prey, "no tamer near: it hunts a " + other + " of another biome");
ok(sim._nemesisAct(e, 100 * 100, 0.1) === null, "a tamer's side close by: it comes for them");
/* Nov 21: no forced digivolution: a Baby nemesis a few levels up stays a Baby */
{ const baby = Object.keys(D.ENEMIES).find(k => D.ENEMIES[k].stageDisplay === "Baby I" && !D.ENEMIES[k].boss && sim._burstForm(k) !== k);
  const bb = sim.spawnEnemy(baby, { x: 3500, y: 0, keepType: true }); bb.lv = 1;
  const p2 = Object.assign({}, p, { id: "p2", name: "Ann", hp: 5, monInvuln: 0, hatchedAt: -999 }); sim.players.push(p2);
  sim._nemesisKill(bb, p2);
  const bn = sim._burstForm(baby), bneed = D.LEVELS.band[D.ENEMIES[bn].stageDisplay][0];
  ok(bb.nemesis && bb.lv === 5 && (bb.lv >= bneed ? bb.type === bn : bb.type === baby), "a Baby that wins a fight (Lv 1 → " + bb.lv + ") digivolves only if that reaches the next form (" + bn + " needs Lv " + bneed + "): " + baby + " → " + bb.type);
  const bb2 = sim.spawnEnemy(Object.keys(D.ENEMIES).find(k => D.ENEMIES[k].stageDisplay === "Child (Rookie)" && !D.ENEMIES[k].boss && sim._burstForm(k) !== k), { x: 3600, y: 0, keepType: true });
  bb2.lv = 7; const t2 = bb2.type; sim._nemesisKill(bb2, p2);
  ok(bb2.lv === 11 && bb2.type === t2, "a Rookie at Lv 7 that wins one (Lv 11, a Champion needs " + D.LEVELS.band["Adult (Champion)"][0] + ") stays a Rookie: " + bb2.type); bb2.dead = true;
  /* it leaves the start: placed just outside the Baby sanctuary, it heads out past the Rookie zone */
  bb.x = D.RESPAWN.zone.baby + 300; bb.y = 0;
  const go = sim._nemesisAct(bb, 300 * 300, 0.1);
  ok(go && go.x > D.RESPAWN.zone.rookie, "even with a tamer close by, it walks off out of the low-level area (to x " + Math.round(go && go.x) + ")");
  sim.players.splice(sim.players.indexOf(p2), 1); bb.dead = true; }
/* a herd of its own */
const kin = Object.keys(D.ENEMIES).filter(k => !D.ENEMIES[k].boss && D.biomes.homeOf(k) === fac).slice(0, 3);
const herd = kin.map((k, i) => { const m = sim.spawnEnemy(k, { x: e.x + 60 + i * 20, y: e.y + 30, keepType: true }); m.fac = fac; return m; });
sim._nemT = 0; e.nemHerdT = 0; sim._updateNemeses(1);
const following = sim.enemies.filter(x => x.nemLead === e._id).length;
ok(following >= Math.min(herd.length, N.herdPer), "as a Tyrant it gathers a herd of its own biome (" + following + " follow it)");
/* a Warlord takes land */
sim._nemPoints(e, N.tiers[3] - e.nemPts);
ok(e.nem === 4 && /Warlord/.test(e.nemTitle), "“" + e.nemTitle + "”");
const span = W.TERR * W.TILE();
let cx = 0, cy = 0, found = false;
for (cy = -6; cy <= 6 && !found; cy++) for (cx = -6; cx <= 6 && !found; cx++) { const o = W.cellOwner(cx, cy); if (o && o !== fac) { found = true; } }
cx--; cy--;
const before = W.cellOwner(cx, cy);
e.x = (cx + 0.5) * span; e.y = (cy + 0.5) * span;
for (let i = 0; i <= N.conquerSec; i++) { sim._nemT = 0; sim._updateNemeses(1); }
ok(W.cellOwner(cx, cy) === fac, "standing in " + before + " land, it takes it for " + fac);
/* no ceiling */
sim._nemPoints(e, 1000);
ok(e.nem > N.titles.length && /Apocalypse [IVX]+$/.test(e.nemTitle), "no ceiling: “" + e.nemTitle + "”");
ok((sim._nemList() || []).some(r => r[0] === e._id && r[4] === e.nemTitle), "every screen gets its position and title for the minimap");
/* revenge */
p.x = e.x; p.y = e.y; const bits0 = p.bits || 0, orbs0 = sim.orbs.length;
sim._killEnemy(e, { id: "local" });
ok(p.bits > bits0 && sim.orbs.length > orbs0 + 6, "beating it pays " + (p.bits - bits0) + " Bits and scatters XP");
console.log(failed ? failed + " failed" : "all passed");
process.exit(failed ? 1 : 0);
