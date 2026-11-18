/* node scripts/dna-test.js : DNA digivolution on the authority (ask, gates, answer, choice, revert) */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) { console.log("load " + f + ": " + e.message); } });
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
function setup() {
  const sim = new mission.MissionSim({ seed: 3, hz: auth.TICK_HZ, data: D });
  const a = new auth.Authority({ sim: sim, seed: 3 });
  sim.coop = true; sim.phase = "playing"; sim.time = 2000;
  const mk = (id, form) => { let p = sim.player(id); if (!p) { sim.addPlayer ? sim.addPlayer({ id: id, form: form }) : sim.players.push({ id: id }); p = sim.player(id); }
    Object.assign(p, { form: form, level: 20, formSince: 0, hp: 100, maxHp: 100, mx: 0, my: 0, x: 0, y: 0, faint: 0, downed: false, away: false, hasTamer: true, kind: "human", evoLock: 0 }); return p; };
  return { sim, a, mk, ev: () => sim.consumeEvents ? sim.consumeEvents() : [] };
}
const live = D.DNA.active().map(p => p.a + "+" + p.b + ">" + D.DNA.results(p).join("/"));
console.log("live pairs:", live.join("  "));
ok(live.length === 4, "four pairs have all their sprites");
ok(!D.DNA.find("wargreymon", "metalgarurumon"), "Omnimon stays off until its sprite exists");
(function () {
  const t = setup(), A = t.mk("a", "exveemon"), B = t.mk("b", "stingmon"); B.mx = 60; t.ev();
  A.level = 10;
  let r = t.a.act({ type: "dna.ask", id: "a", to: "paildramon" });
  ok(!r.ok && r.reason === "gate", "too low a level is refused");
  A.level = 20; A.formSince = 1900;
  r = t.a.act({ type: "dna.ask", id: "a", to: "paildramon" });
  ok(!r.ok && r.reason === "gate", "too little time in form is refused");
  A.formSince = 0; B.mx = 500;
  r = t.a.act({ type: "dna.ask", id: "a", to: "paildramon" });
  ok(!r.ok && r.reason === "nobody", "too far apart is refused");
  B.mx = 60;
  r = t.a.act({ type: "dna.ask", id: "a", to: "paildramon" });
  ok(r.ok && B.dnaOffer && A.form === "exveemon", "asking only makes an offer");
  r = t.a.act({ type: "dna.answer", id: "b", ok: false });
  ok(A.form === "exveemon" && B.form === "stingmon" && !B.dnaOffer, "declining changes nothing");
  A.dnaCd = 0;
  t.a.act({ type: "dna.ask", id: "a", to: "paildramon" });
  r = t.a.act({ type: "dna.answer", id: "b", ok: true, to: "dinobeemon" });
  ok(r.ok && A.form === "paildramon" && B.form === "dinobeemon", "each tamer gets the form they picked: " + A.form + " / " + B.form);
  const cnt = B.evoCount;
  B.downed = true; B.hp = 0; B.faint = 999;
  t.a.progression._tickDna(B); t.a.progression._tickDna(A);
  ok(B.form === "stingmon" && B.hp === 0 && A.form === "paildramon", "the downed one drops back, the other stays");
  ok(B.evoCount === cnt - 1, "the digivolution boost goes with it");
})();
(function () {
  const t = setup(), A = t.mk("a", "aquilamon"), B = t.mk("b", "gatomon");
  t.a.act({ type: "dna.ask", id: "b" });
  ok(A.dnaOffer && A.dnaOffer.from === "b", "either half can ask");
  t.sim.time += 30; t.a.progression._tickDna(A);
  ok(!A.dnaOffer, "an unanswered prompt runs out");
  t.a.act({ type: "dna.ask", id: "b" }); t.a.act({ type: "dna.answer", id: "a", ok: true, to: "paildramon" });
  ok(A.form === "silphymon" && B.form === "silphymon", "a made-up result falls back to the pair's own");
})();
console.log(failed ? "dna-test: " + failed + " failed" : "dna-test: all passed");
process.exit(failed ? 1 : 0);
