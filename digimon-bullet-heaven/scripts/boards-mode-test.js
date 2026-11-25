/* node scripts/boards-mode-test.js : the League has a board for each mode (17z33): Story, Night Siege, Versus, Duel, each best with what it was done with */
const B = require(require("path").join(__dirname, "..", "..", "boards-server.js"));
const fs = require("fs"); const f = require("path").join(require("os").tmpdir(), "boards-mode-test.json"); try { fs.unlinkSync(f); } catch (e) {}
B._reset(f);
let failed = 0; function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const H = B._handlers;
const acc = (n) => ({ key: n, name: n });
function sub(who, rec) { return H.submit({ rec }, acc(who)); }
let r = sub("isaac", { mode: "siege", time: 1500, level: 20, kills: 300, nights: 7, tag: { form: "greymon", gen: 3 } });
ok(r[0] === 200 && r[1].placed.siege === 1, "a Night Siege run goes on the Night Siege board (#1)");
ok(!r[1].placed.time && !r[1].placed.level, "but not on the Survival boards");
r = H.get({}, acc("isaac"))[1];
ok(r.boards.siege.list[0].v === 7 && r.boards.siege.list[0].tag.form === "greymon" && r.boards.siege.list[0].tag.gen === 3, "with what it was done with (Greymon, Gen 3)");
B._reset(f); /* clear the rate limit, keep the file */
r = sub("isaac", { mode: "siege", time: 300, nights: 9 });
ok(r[0] === 400, "9 nights in 5 minutes doesn't count");
B._reset(f); r = sub("kai", { mode: "story", time: 900, storyDone: true, tag: { form: "agumon", gen: 0 } }); ok(r[1].placed.story === 1, "a finished story goes on the Story board");
B._reset(f); r = sub("isaac", { mode: "story", time: 700, storyDone: true }); ok(r[1].placed.story === 1, "and a faster one goes above it");
B._reset(f); r = sub("kai", { mode: "story", time: 500 }); ok(!r[1].placed.story, "an unfinished story doesn't");
B._reset(f); r = sub("isaac", { mode: "versus", time: 460, vsWin: true }); ok(r[1].placed.versus === 1, "a Versus win counts");
B._reset(f); r = sub("isaac", { mode: "versus", time: 100, vsWin: true }); ok(r[0] === 400, "a Versus 'win' before the race is over doesn't");
B._reset(f); r = sub("kai", { mode: "duel", time: 30, vsWin: true }); ok(r[1].duel && r[1].duel.wins === 1, "a duel win goes on your record");
r = sub("kai", { mode: "duel", time: 30, vsWin: false }); ok(r[0] === 429, "duels a few seconds apart wait their turn");
B._reset(f); r = sub("kai", { mode: "duel", time: 30, vsWin: false }); ok(r[1].duel.wins === 1 && r[1].duel.losses === 1, "and so does a loss (1 won, 1 lost)");
r = H.get({}, acc("kai"))[1];
ok(!r.boards.duel, "but there's no Duel ranking: duels are just for fun (Isaac)");
ok(r.me.bests.duelWins === 1 && r.me.bests.duelLosses === 1, "only your own record");
r = H.get({}, acc("isaac"))[1];
ok(r.boards.story.list[0].name === "isaac" && r.boards.story.list[0].v === 700, "Story is fastest first");
ok(r.me.bests.nights === 7 && r.me.places.siege === 1, "your bests and places include the new boards");
B._reset(f); r = sub("isaac", { mode: "open", time: 1200, level: 18, kills: 500 }); ok(r[1].placed.time && r[1].placed.level, "Survival runs still go on the Survival boards");
console.log(failed ? failed + " FAILED" : "all passed"); process.exit(failed ? 1 : 0);
