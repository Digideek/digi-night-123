/* node scripts/music-test.js : every track is arranged into a long song (js/audio.js FORM) */
const path = require("path");
global.window = global;
require(path.join(__dirname, "..", "js/audio.js"));
const A = global.DBH.audio;
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const ids = Object.keys(A.TRACKS);
ids.forEach(id => {
  const S = A.TRACKS[id], T = A._compile(id), spb = 60 / T.bpm, loopBars = T.bars - T.loopFrom, secs = loopBars * 4 * spb;
  let bad = [];
  T.seq.forEach((B, i) => {
    if (B.lead) { const n = B.lead.trim().split(/\s+/).length; if (n !== 8 && n !== 16) bad.push("bar " + i + " lead has " + n + " notes"); A._parseBar(B.lead).forEach(e => { if (isNaN(e.deg)) bad.push("bar " + i + " bad note"); }); }
    if (B.wob) { const sum = B.wob.reduce((a, w) => a + w[1], 0); if (sum !== 16) bad.push("bar " + i + " wobble fills " + sum + " of 16 steps"); }
    ["k", "s", "h"].forEach(r => { if (B[r] && B[r].length !== 16) bad.push("bar " + i + " drum row " + r + " is " + B[r].length + " long"); });
    if (typeof B.root !== "number") bad.push("bar " + i + " has no chord");
  });
  ok(!bad.length, id + ": " + T.bars + " bars, all well formed" + (bad.length ? " (" + bad.slice(0, 3).join("; ") + ")" : ""));
  ok(secs >= 85, id + ": loops every " + Math.round(secs) + " s (was " + Math.round((S.dub ? 8 : S.prog.length) * 4 * spb) + " s)");
  const leads = new Set(T.seq.slice(T.loopFrom).map(B => B.lead).filter(Boolean));
  ok(leads.size >= 12, id + ": " + leads.size + " different melody bars in the loop");
  if (S.dub) {
    const w = new Set(T.seq.map(B => B.wob).filter(Boolean));
    ok(w.size >= 24, id + ": " + w.size + " different wobble bars across its drops (was 8)");
    ok(T.seq.slice(T.loopFrom).some(B => !B.wob && B.lead && !B.s), id + ": has a break with melody and no snare between drops");
  }
  if (S.night) ok(A._compile(id + "_night").bars === T.bars, id + ": the night version is the same length");
});
console.log(failed ? failed + " FAILED" : "music-test: all passed");
process.exit(failed ? 1 : 0);
