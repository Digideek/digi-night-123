/* node scripts/items-test.js : items (data.js ITEMS, js/items.js) and what they do inside a run. */
const path = require("path"), root = path.join(__dirname, "..");
const store = { dbh_profile_v1: JSON.stringify({ name: "T", pic: "agumon", stats: {}, ach: {} }) };
global.window = global; global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
global.document = { getElementById: () => null, querySelectorAll: () => [], querySelector: () => null, body: { classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {} }, documentElement: { style: { setProperty() {} }, setAttribute() {} }, addEventListener() {}, readyState: "loading" };
global.setInterval = () => {};
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "weather", "seasons", "cosmetics", "badges", "profile", "lab", "items"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) { if (/cosmetics|profile|lab|items|badges/.test(f)) throw e; } });
const mission = require(path.join(root, "js/net/mission-sim.js"));
const prog = require(path.join(root, "js/net/progression.js"));
require(path.join(root, "js/net/rival-sim.js"));
const auth = require(path.join(root, "js/net/authority.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const I = D.ITEMS, IT = D.items, save = {};
D.stash = { get: () => save, write() {} };
D.cosmetics.load();
const kinds = k => I.list.filter(x => x.kind === k);

/* the catalogue */
ok(kinds("crest").length === 6 && kinds("charm").length === 16 && kinds("cons").length === 4, "6 Crest Pieces, 16 Charms, 4 one-run items");
ok(I.list.every(x => x.name && x.text && x.fx && I.drop.rarity[x.rarity] != null), "each has a name, what it does, and a rarity");
ok(!I.list.some(x => /crit/i.test(x.text) && /guarantee|every first/i.test(x.text)), "no guaranteed-critical item");

/* drops */
let seq = [], si = 0; IT._rnd(() => seq[si++ % seq.length]);
const run = { time: 300 };
seq = [0.9]; si = 0; IT.onEvent({ type: "kill", boss: true, killer: "me" }, "me", run);
ok(IT.count() === 0, "a boss does not always drop (1 in 3)");
seq = [0.1, 0.1, 0.5, 0.0]; si = 0; IT.onEvent({ type: "kill", boss: true, killer: "me" }, "me", run);
ok(IT.count() === 1 && Object.keys(save.gear).length === 1 && IT.byId(Object.keys(save.gear)[0]).kind === "charm" && IT.loadout().charm, "when it does, a Charm: kept, and the first one goes straight on");
seq = [0.1, 0.1, 0.5, 0.0]; si = 0; const bits0 = D.cosmetics.bits(); IT.onEvent({ type: "kill", boss: true, killer: "me" }, "me", run);
ok(Object.keys(save.gear).length === 1 && D.cosmetics.bits() - bits0 === I.dupeBits.common, "the same Charm again turns into " + I.dupeBits.common + " DigiBits");
seq = [0.1, 0.9, 0.5, 0.0]; si = 0; IT.onEvent({ type: "kill", boss: true, killer: "me" }, "me", run);
ok(Object.keys(save.cons).length === 1, "or a one-run item, which stacks");
IT.onEvent({ type: "kill", boss: true, killer: "someone" }, "me", run);
ok(IT.count() === 2, "a teammate's boss kill drops nothing for you");
seq = [0.1, 0.99, 0.0]; si = 0; IT.onEvent({ type: "lord.down", id: "me" }, "me", run);
ok(kinds("crest").some(c => save.gear[c.id]) && IT.loadout().crest.length === 1, "a biome lord drops a Crest Piece, plugged into the empty slot");
seq = [0.0, 0.9]; si = 0; IT.onEvent({ type: "rival.down", by: "me", name: "Fang", skills: ["rg", "pepper_breath"] }, "me", run);
ok(save.scrolls.length === 1 && save.scrolls[0].skill === "rg" && save.scrolls[0].from === "Fang", "a beaten rival leaves a scroll of one of its skills");
let pr = 0, tot = 4000; IT._rnd(Math.random); for (let i = 0; i < tot; i++) { const it = IT.pick("charm"); if (it.rarity === "prismatic") pr++; }
ok(pr / tot > 0.02 && pr / tot < 0.065, "prismatic is about 1 in 25 of what drops (" + (100 * pr / tot).toFixed(1) + "% here)");
ok(run._loot.length === 5, "everything found is listed for the run-over screen");

/* slots and packing */
kinds("crest").forEach(c => { save.gear[c.id] = 1; });
IT.equip("crest", "c_scan"); IT.equip("crest", "c_weather");
ok(IT.slots() === 1 && IT.loadout().crest.length === 1 && IT.loadout().crest[0] === "c_weather", "one Crest slot: plugging in another swaps it");
D.profile.lab().port = 1;
IT.equip("crest", "c_scan");
ok(IT.slots() === 2 && IT.loadout().crest.join() === "c_weather,c_scan" && IT.fxOn("scan") && IT.fxOn("weather"), "the Lab's Digivice Port gives a second slot");
save.cons = { u_protein: 2 }; IT.equip("cons", "u_protein"); IT.equip("scroll", 0);
ok(IT.loadout().scroll === "rg" && !IT.loadout().use, "a scroll and a consumable share the one-run slot");
IT.equip("cons", "u_protein");
ok(IT.loadout().use === "u_protein" && !IT.loadout().scroll, "packing one unpacks the other");
let end = IT.endRun({ time: 200, gear: IT.loadout() });
ok(save.cons.u_protein === 1 && end.spent === "Protein", "a run uses it up");
IT.endRun({ time: 5, gear: IT.loadout() });
ok(save.cons.u_protein === 1, "a run that ends before the hatch does not");

/* inside a run */
function mk(gear, form) {
  const sim = new mission.MissionSim({ seed: 2, hz: auth.TICK_HZ, data: D }); new auth.Authority({ sim: sim, seed: 2 }); sim.skillTree = true;
  sim.join({ id: "a", kind: "host-client", hasTamer: true, form: form || "agumon", hp: 100, maxHp: 100, gear: gear });
  return { sim, p: sim.player("a") };
}
const none = mk(null), s0 = none.sim._stats(none.p);
let w = mk({ crest: ["c_farm", "c_hatch", "c_scan"], charm: "m_heart", use: "nope" });
ok(w.p.gear.crest.length === 2 && !w.p.gear.use, "what a tamer brings is checked: two Crests at most, known items only");
ok(Math.abs(w.sim._stats(w.p).allyMaxHp / s0.allyMaxHp - 1.06) < 1e-9, "Hearty Charm: +6% health");
ok(w.sim._gear(w.p).farm === 20 && w.sim._gear(w.p).earlyXp === 1.15, "Farm Clock +20 s, Hatch Light +15% early XP");
w.sim.time = 60; const x0 = w.p.xp; w.sim._eatOrb(w.p, { kind: "xp", value: 0.1 }); w.sim.time = 400; const x1 = w.p.xp; w.sim._eatOrb(w.p, { kind: "xp", value: 0.1 });
ok(Math.abs((x1 - x0) - 0.115) < 1e-9 && Math.abs((w.p.xp - x1) - 0.1) < 1e-9, "the early XP stops after three minutes");
w = mk({ charm: "m_bell" }); ok(Math.abs(w.sim._stats(w.p).magnetMul / s0.magnetMul - 1.2) < 1e-9, "Magnet Bell: +20% pickup range");
/* element charm and leech */
function hit(gear, rolled) { const x = mk(gear); x.p.hp = 50; const e = { _id: 9, type: "numemon", x: 0, y: 0, hp: 1e6, maxHp: 1e6, radius: 12, flash: 0 }; x.sim.enemies.push(e); const el = D.ELEMENTS.moveElement("pepper_breath", "agumon"); x.sim.hurtEnemy(e, 100, 0, 0, 0, x.p, rolled || 1, "pepper_breath"); return { dmg: 1e6 - e.hp, el, hp: x.p.hp, burst: x.p.burst || 0 }; }
const plain = hit(null), fire = hit({ charm: "m_" + plain.el }), wrong = hit({ charm: plain.el === "ice" ? "m_fire" : "m_ice" });
ok(Math.abs(fire.dmg / plain.dmg - 1.1) < 1e-6 && wrong.dmg === plain.dmg, "the matching element's Charm: +10% for that element's moves only (" + plain.el + ")");
ok(hit({ charm: "m_leech" }, 2).hp === 51 && hit({ charm: "m_leech" }, 1).hp === 50, "Leech Charm: a critical heals 1%, an ordinary hit nothing");
ok(Math.abs(hit({ charm: "m_tag" }).burst / plain.burst - 1.2) < 1e-6, "Swift Tag: the burst meter fills 20% faster");
/* one-run items */
w = mk({ use: "u_protein" }, "digitama_agumon");
ok(w.p.level === 3 && w.p.skillPoints === 2, "Protein: job level 3 with two skill points");
w = mk({ use: "u_wind" }); w.p.hp = 5; w.sim.hurtMon(w.p, 500, { type: "numemon" });
ok(w.p.hp === w.p.maxHp * 0.5 && !w.p.secondWind && !(w.p.faint > 0), "Second Wind: the finishing blow leaves it on half health");
w.p.monInvuln = 0; w.sim.hurtMon(w.p, 5000, { type: "numemon" }); ok(w.p.hp === 0, "only once");
w = mk({ use: "u_bait" }); ok(w.sim.rivalBait === true, "Rival Bait marks the run");
w = mk({ use: "u_lucky" }); ok(w.p.luckyShiny === 20 && mk({ charm: "m_prism" }).sim._gear(mk({ charm: "m_prism" }).p).shiny === 3, "Lucky Charm x20 on the first digivolution, Prism Shard x3 all run");
/* scroll */
w = mk({ scroll: "rg" }); w.sim._movePartner(w.p, 1 / 30);
ok(w.p.skills.rg === 1 && !w.p.scroll, "a scroll of a passive takes on any partner");
w = mk({ scroll: "no_such_move" }); w.sim._movePartner(w.p, 1 / 30);
ok(w.p.scroll === "no_such_move" && !(w.p.skills || {}).no_such_move, "a move its line does not have is not learned");
end = (IT.equip("scroll", 0), IT.endRun({ time: 200, gear: IT.loadout(), _scrollUsed: false }));
ok(save.scrolls.length === 1 && end.kept, "and then you keep the scroll");
IT.endRun({ time: 200, gear: IT.loadout(), _scrollUsed: true }); ok(save.scrolls.length === 0, "a scroll that was learned is used up");
/* the forecast */
const ws = { time: 500 }; let t = 0, sawNext = 0, flips = 0, last = null, agree = 0, promised = null;
for (let i = 0; i < 30 * 600; i++) { const wv = D.weather.tick(ws, 1 / 30, { phase: "playing", combatReady: true, rng: Math.random }); if (wv.next && wv.duration - wv.t > 55) sawNext++; if (wv.next) promised = wv.next; if (last && wv.id !== last && promised) { flips++; if (wv.id === promised) agree++; promised = null; } last = wv.id; }
ok(sawNext > 0 && flips > 0 && agree === flips, "the next sky is settled a minute ahead, and it is the one that comes (" + flips + " changes)");
console.log(failed ? failed + " FAILED" : "items-test: all passed"); process.exit(failed ? 1 : 0);
