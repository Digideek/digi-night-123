/* Tamer Rank: the curve, what a run pays, rank-ups paying DigiCoins and titles. */
var assert = require("assert");
var store = {};
global.window = global; global.localStorage = { getItem: function (k) { return k in store ? store[k] : null; }, setItem: function (k, v) { store[k] = String(v); } };
global.document = { getElementById: function () { return null; }, querySelectorAll: function () { return []; }, querySelector: function () { return null; }, body: { classList: { add: function () {}, remove: function () {}, toggle: function () {} }, setAttribute: function () {} }, documentElement: { style: { setProperty: function () {} }, setAttribute: function () {} }, addEventListener: function () {}, readyState: "loading" };
global.setInterval = function () {};
store.dbh_profile_v1 = JSON.stringify({ name: "T", pic: "agumon", stats: {}, ach: {} });
require("../js/data.js"); require("../js/cosmetics.js"); require("../js/profile.js");
var D = global.DBH, R = D.profile.rank, C = D.RANK;
D.SPECIES = D.SPECIES || {}; D.SPECIES.t_rookie = { name: "R", stage: "Rookie" }; D.SPECIES.t_baby = { name: "B", stage: "Baby" }; D.SPECIES.t_mega = { name: "M", stage: "Mega" };
if (D.cosmetics.load) D.cosmetics.load();

assert.strictEqual(R.at(0).rank, 1); assert.strictEqual(R.at(119).rank, 1); assert.strictEqual(R.at(120).rank, 2);
assert.strictEqual(R.at(120).into, 0); assert.strictEqual(R.at(120).need, 165);
assert.strictEqual(R.at(2700).rank, 10, "rank 10 at 2700");
var top = R.at(1e9); assert.strictEqual(top.rank, C.max); assert.ok(top.max);
assert.strictEqual(R.at(1e9).title, "Legend of the Night");

var pay = R.pay({ time: 480, kills: 150, form: "t_rookie", _rankBoss: 1, rival: { wins: 1 } });
assert.strictEqual(pay.total, 80 + 37 + 50 + 30 + 40);
assert.strictEqual(R.pay({ time: 30, kills: 0, form: "t_baby" }).total, 5, "a short run still pays a little");

var bits0 = D.cosmetics.bits();
var out = D.profile.runEnded({ time: 480, kills: 150, form: "t_rookie" });
assert.strictEqual(out.before.rank, 1); assert.strictEqual(out.after.rank, 2); assert.strictEqual(out.ups.length, 1);
assert.strictEqual(D.cosmetics.bits() - bits0, 25 + 20, "rank 2 pays 15 + 5*2, and the run itself pays 167/8");
assert.ok(!D.cosmetics.isUnlocked("title-rank-3"));
assert.strictEqual(D.cosmetics.unlock("title-rank-3").ok, false, "rank titles can't be bought");
out = D.profile.runEnded({ time: 3600, kills: 2000, form: "t_mega" });   // 600 + 500 + 500
assert.ok(out.after.rank >= 5, "a huge run climbs several ranks: " + out.after.rank);
assert.strictEqual(out.ups.length, out.after.rank - 2);
assert.ok(D.cosmetics.isUnlocked("title-rank-3") && D.cosmetics.isUnlocked("title-rank-5"));
assert.ok(D.cosmetics.equip("title-rank-5").ok);
assert.strictEqual(JSON.parse(store.dbh_profile_v1).rank.xp, 167 + 1600, "rank XP is saved on the profile");
assert.strictEqual(D.profile.card().rx, 1767);
console.log("rank-test: all passed");
