/* Seasons: 6-minute seasons, loop after winter, difficulty climbs each season. */
const path = require("path");
const root = path.join(__dirname, "..");
global.window = global;
global.DBH = {};
const S = require(path.join(root, "js/seasons.js"));
const W = require(path.join(root, "js/weather.js"));
function assert(c, m) { if (!c) { console.log("FAIL " + m); process.exitCode = 1; } else console.log("  ok  " + m); }
const len = S.CFG.lengthSec;
assert(len === 486, "season is about 8 minutes (486 s)");
let i = S.info(0); assert(i.year === 1 && i.id === "spring", "starts Year 1 Spring");
i = S.info(len - 0.01); assert(i.id === "spring", "still spring at 5:59");
i = S.info(len); assert(i.year === 1 && i.id === "summer", "summer at 6:00");
i = S.info(len * 3 + 1); assert(i.id === "winter" && i.year === 1, "winter at 18:00");
i = S.info(len * 4 + 1); assert(i.id === "spring" && i.year === 2, "loops to Year 2 Spring at 24:00");
let prev = null, ok = true;
for (let k = 0; k < 12; k++) {
  const m = S.mods(k * len + 1);
  if (prev && !(m.enemyHpMul > prev.enemyHpMul && m.enemyAtkMul > prev.enemyAtkMul)) ok = false;
  prev = m;
}
assert(ok, "enemy HP and damage rise every season for 3 years");
const base = { enemyHpMul: 1, enemyAtkMul: 1, enemySpdMul: 1, spawnMul: 1, capMul: 1, xpMul: 1 };
const y1 = S.applyTo(base, { time: 1 });
assert(y1.enemyHpMul === 1 && y1.spawnMul === 1, "Year 1 Spring is unchanged");
const store = { time: len * 5 + 1 };
const hpScale = W.spawnIntervalScale(store, {});
assert(hpScale > 1, "weather spawn scale includes season (" + hpScale.toFixed(2) + ")");
const e = { hp: 100, maxHp: 100 };
W.applySpawnStats(e, store, {});
assert(e.maxHp > 100, "spawned enemy HP scaled by season (" + e.maxHp.toFixed(0) + ")");
console.log(process.exitCode ? "seasons-test: failed" : "seasons-test: all passed");
