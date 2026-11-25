/* node scripts/badges-test.js : the badge list (js/badges.js) and the rules that hand badges out. */
const path = require("path"), root = path.join(__dirname, "..");
const store = { dbh_profile_v1: JSON.stringify({ name: "T", pic: "agumon", stats: {}, ach: {} }) };
global.window = global; global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
global.document = { getElementById: () => null, querySelectorAll: () => [], querySelector: () => null, body: { classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {} }, documentElement: { style: { setProperty() {} }, setAttribute() {} }, addEventListener() {}, readyState: "loading" };
global.setInterval = () => {}; const realTimeout = global.setTimeout; global.setTimeout = (f) => { f(); return 1; };
require(path.join(root, "js/data.js"));
const D = global.DBH;
["cosmetics", "badges", "profile", "lab"].forEach(f => require(path.join(root, "js/" + f + ".js")));
D.cosmetics.load();
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const B = D.BADGES, P = D.profile, has = id => !!P.get().ach[id], ME = "me";
D.SPECIES = Object.assign(D.SPECIES || {}, { b: { stage: "Baby" }, r: { stage: "Rookie" }, c: { stage: "Champion" }, u: { stage: "Ultimate" }, m: { stage: "Mega" } });
D.ENEMIES = Object.assign(D.ENEMIES || {}, { wildmega: { stageDisplay: "Ultimate (Mega)" }, grunt: { stageDisplay: "Child (Rookie)" } });
D.saveInfo = () => info; let info = { eggs: 5, eggsTotal: 22, memTiers: {}, trophies: 0 };
const run = { time: 100, form: "r", level: 4, kills: 0 };
const ev = (e) => P.onEvent(e, ME, run);

/* the list */
const ids = {}; let dup = 0; B.LIST.forEach(b => { if (ids[b.id]) dup++; ids[b.id] = 1; });
ok(B.LIST.length >= 130 && dup === 0, B.LIST.length + " badges, every id its own");
ok(B.LIST.every(b => b.name && b.text && b.tier >= 1 && b.tier <= 4 && B.CATS.indexOf(b.cat) >= 0), "each has a name, a description, a tier and a kind");
ok(B.LIST.filter(b => b.tier === 4).length >= 20 && B.LIST.filter(b => b.secret).length >= 8, B.LIST.filter(b => b.tier === 4).length + " prismatic (the hard ones), " + B.LIST.filter(b => b.secret).length + " secret");
["evo", "champion", "ultimate", "mega", "hold", "burst", "dna", "shiny", "boss", "megaslayer", "lord", "catch", "egg", "ko100", "ko1000", "ko10000", "year", "online"].forEach(id => { if (!B.BY[id]) { failed++; console.log("  FAIL old badge " + id + " is gone"); } });
console.log("  ok all 18 old badges are still there, so nothing already earned is lost");

/* totals */
for (let i = 0; i < 100; i++) ev({ type: "kill", killer: ME, enemyType: "grunt" });
ok(has("ko100") && !has("ko1000"), "100 KOs: Brawler");
ev({ type: "kill", killer: "someone-else", enemyType: "grunt" });
ok(P.get().stats.kos === 100, "a teammate's KO is not yours");
for (let i = 0; i < 10; i++) ev({ type: "kill", killer: ME, enemyType: "grunt", boss: true });
ok(has("boss") && has("bs10") && !has("bs50"), "ten bosses: Boss Down and Boss Hunter");
/* giant killer */
ev({ type: "kill", killer: ME, enemyType: "wildmega" });
ok(has("megaslayer") && has("giant"), "a wild Mega beaten with a Rookie partner: Giant Killer");
for (let i = 0; i < 4; i++) ev({ type: "kill", killer: ME, enemyType: "wildmega" });
ok(has("rms5"), "five wild Megas in one run: Titan Feller");
/* growth */
run.time = 300; ev({ type: "evolve", id: ME, to: "c" });
ok(has("evo") && has("champion") && has("fastc"), "Champion five minutes in: Early Bloomer");
const SL = (D.SEASONS_CFG && D.SEASONS_CFG.lengthSec) || 486;     /* a season's length (17z33: 486 s) */
run.time = SL * 2 + 20; ev({ type: "evolve", id: ME, to: "u" });
ok(has("ultimate") && !has("fastu"), "Ultimate just after fall starts: too late for Prodigy");
run.time = SL * 2 + 200; ev({ type: "evolve", id: ME, to: "m" });
ok(has("mega") && has("fastm") && P.get().stats.mgr === 1, "Mega before winter: Warp Digivolve");
ev({ type: "level", id: ME, level: 25 }); ev({ type: "tamer.level", id: ME, level: 10 });
ok(has("jl10") && has("jl25") && !has("jl50") && has("bl10"), "job level 25 and base level 10");
ev({ type: "level", id: "other", level: 80 });
ok(!has("jl75"), "someone else's level is not yours");
/* rival */
run.level = 4; ev({ type: "rival.down", by: ME, level: 9, wins: 1 });
ok(has("rv1") && has("rvup") && !has("rvup10") && !has("rv3"), "beat a rival five levels up: Rivalry and Underdog");
ev({ type: "rival.down", by: ME, level: 15, wins: 3 });
ok(has("rvup10") && has("rv3"), "eleven levels up, third time this run: Upset of the Century and Hat Trick");
ev({ type: "rival.won", id: ME }); ok(has("rvlose"), "the secret one for losing to it");
/* world and farm */
ev({ type: "prop.used", id: ME, kind: "spire" }); ev({ type: "prop.used", id: ME, kind: "cache" });
ev({ type: "farm.feed", id: ME, balanced: true }); ev({ type: "farm.harvest", id: ME, n: 3 }); ev({ type: "farm.train", id: ME }); ev({ type: "farm.refuse", id: ME });
ok(has("sp1") && has("ca1") && has("fd1") && has("bal") && has("hv1") && has("tn1") && has("picky") && P.get().stats.harvests === 3, "spire, cache, feed, balanced meal, harvest, training, picky eater");
ev({ type: "coop.revive", id: "friend", by: ME }); ev({ type: "brawl.winner", winnerId: ME });
ok(has("rev1") && has("brw1"), "reviving a friend and winning a brawl");
/* during and after a run */
const SEASON = (D.SEASONS_CFG && D.SEASONS_CFG.lengthSec) || 486;
P.tick(Object.assign(run, { time: SEASON * 3 + 20, kills: 520 }), "playing");
ok(has("t5") && has("sum") && has("fall") && has("win") && !has("year") && has("rk250") && has("rk500") && !has("rk1k"), "into the first winter and 520 KOs in a run");
P.tick({ time: SEASON * 4 * 5 + 10, kills: 1, form: "m" }, "playing");
ok(has("year") && has("yr2") && has("yr5"), "five years in one run");
const fresh = { time: 210, kills: 0, form: "b" }; P.tick(fresh, "playing"); ok(has("paci"), "three and a half minutes without a KO: the secret Pacifist");
P.runEnded({ time: 50, kills: 0, form: "b", bits: 600 }); ok(has("quick") && has("hoard") && !has("megadie"), "a run lost in under a minute holding 600 Bits");
P.runEnded({ time: 2000, kills: 0, form: "m" }); ok(has("megadie"), "losing with a Mega");
/* outside the run */
info = { eggs: 22, eggsTotal: 22, memTiers: { a: 1, b: 3, c: 1, d: 2, e: 1 }, trophies: 12 };
P.lab().vital = 5; P.syncBadges();
ok(has("eg10") && has("egall") && has("mem1") && has("mem5") && has("mem3") && has("tr10") && !has("tr40") && has("lab1") && has("labm") && !has("laball"), "eggs, memories, trophies and the Lab are picked up from the save");
const n = Object.keys(P.get().ach).length;
ok(has("b25") && n >= 50 === has("b50"), n + " earned so far, and the badges for badges follow (Decorated at 25)");
ok(!has("ball"), "Completionist needs every other badge");
B.LIST.forEach(b => { if (b.id !== "ball") P.get().ach[b.id] = 1; }); P.syncBadges();
ok(has("ball"), "and it is given when they are all in");
ok(P.card().a.length === B.LIST.length && JSON.stringify(P.card()).length < 4000, "the whole set still fits on the profile card friends see (" + JSON.stringify(P.card()).length + " characters)");
console.log(failed ? failed + " FAILED" : "badges-test: all passed"); process.exit(failed ? 1 : 0);
