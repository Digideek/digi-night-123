/* node scripts/shop-test.js : Jijimon's stall (17z33, js/shop.js). One food, three a visit; Sprint Boots;
 * a stock of four that changes every visit; tools (Training Ticket, Seeds, Gate Key, Lure, Treasure Map) and
 * Digimentals that each open one armor digivolution. */
const path = require("path"), root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "js/data.js"));
const D = global.DBH;
global.EVO_TREE = require(path.join(root, "js/evolution-tree.js")).EVO_TREE;
["ro-stats", "species-catalog", "moves", "elements", "dna", "skill-tree", "egg-lines", "stage-waves", "weather", "seasons", "biomes", "shop"].forEach(f => { try { require(path.join(root, "js/" + f + ".js")); } catch (e) {} });
D.sprites = Object.assign(D.sprites || {}, { colors: {}, SCALE: 3, TILE: 48 });
require(path.join(root, "js/world.js")); D.world.reset(4);
const mission = require(path.join(root, "js/net/mission-sim.js"));
require(path.join(root, "js/net/progression.js"));
const auth = require(path.join(root, "js/net/authority.js"));
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
function mk() {
  const sim = new mission.MissionSim({ seed: 5, hz: auth.TICK_HZ, data: D }); const A = new auth.Authority({ sim, seed: 5 });
  sim.phase = "playing"; sim.time = 300; sim.localId = "local"; sim.players.length = 0; sim.enemies.length = 0;
  sim.players.push({ id: "local", form: "veemon", level: 9, hp: 300, maxHp: 300, x: 0, y: 0, mx: 20, my: 0, hasTamer: true, kind: "host-client", fullness: 80, happiness: 70, bag: {}, bits: 5000, items: [] });
  sim.merchant = { x: 0, y: 0, form: "jijimon", open: true, visit: 300 };
  return { sim, A, p: sim.players[0] };
}
const buy = (w, item) => w.A.act({ type: "shop.buy", id: "local", item });
/* the stock */
const keys = ["m100", "m200", "m300", "m400", "m500", "m600"], stocks = keys.map(k => D.shopStock(k, "local"));
ok(stocks.every(s => s[0] === "meat1" && s[1] === "sprintBoots" && s.length === 6), "always on the shelf: Meat and Sprint Boots, then 4 picks");
ok(new Set(stocks.map(s => s.slice(2).sort().join())).size > 3, "the picks change from visit to visit (" + stocks.map(s => s.slice(2).join("/")).slice(0, 3).join("  |  ") + " ...)");
ok(stocks.every(s => new Set(s.map(id => D.shopItem(id).pickOf || id)).size === s.length), "never two of the same kind in one visit");
ok(!D.SHOP.catalog.some(c => ["fishPack", "berryPack", "dataChip", "medicine", "vitamin", "joyToy", "atkBoost"].indexOf(c.id) >= 0), "gone: fish and berry packs, the Data Chip, the farm-only odds and ends");
/* food: three a visit */
let w = mk(), r, b0 = w.p.bits;
for (let i = 0; i < 3; i++) ok(buy(w, "meat1").ok, "meat " + (i + 1) + " of 3");
r = buy(w, "meat1"); ok(!r.ok && r.reason === "Sold out this visit" && w.p.bag.meat === 3 && b0 - w.p.bits === 60, "a fourth: " + r.reason);
w.sim.merchant.visit = 400; ok(buy(w, "meat1").ok, "his next visit: more meat");
/* off-stock */
const key = D.shopKey(w.sim), st = D.shopStock(key, "local"), off = D.SHOP.catalog.map(c => c.id).find(id => st.indexOf(id) < 0);
r = buy(w, off); ok(!r.ok && r.reason === "Not in stock this visit", "can't buy what he hasn't brought (" + off + ")");
/* each tool */
function withStock(want) { for (let v = 1; v < 4000; v++) { const k = "m" + v; if (D.shopStock(k, "local").indexOf(want) >= 0) return v / 10; } return null; }
w = mk(); w.sim.merchant.visit = withStock("ticket"); w.p.trainFresh = 0;
ok(buy(w, "ticket").ok && w.p.trainFresh === 1, "Training Ticket: a fresh training session right away");
r = buy(w, "ticket"); ok(!r.ok, "  one a visit");
w = mk(); w.sim.merchant.visit = withStock("seeds_potato");
ok(buy(w, "seeds_potato").ok && w.p.bag.seed_potato === 2, "Potato Seeds: two seeds of exactly that");
w = mk(); w.sim.merchant.visit = withStock("gateKey"); ok(buy(w, "gateKey").ok && w.p.bag.gateKey === 1, "Gate Key into the bag");
ok(w.A.act({ type: "bag.use", id: "local", item: "gateKey" }).ok && w.p.bag.gateKey === 0, "  used out in the world (the screen then opens the farm)");
w = mk(); w.sim.merchant.visit = withStock("lure"); buy(w, "lure");
r = w.A.act({ type: "bag.use", id: "local", item: "lure" }); ok(!r.ok && w.p.bag.lure === 1, "a Lure needs a kind you've been beating: " + r.reason);
const kind = Object.keys(D.ENEMIES).find(k => !D.ENEMIES[k].boss && D.SPECIES[k]); w.p.killsBy = { [kind]: 7 };
r = w.A.act({ type: "bag.use", id: "local", item: "lure" });
ok(r.ok && r.kind === kind && w.sim.enemies.filter(e => e.type === kind).length >= 5, "Lure: a pack of " + r.count + " " + kind + " comes running");
w = mk(); w.sim.merchant.visit = withStock("map"); buy(w, "map"); ok(w.A.act({ type: "bag.use", id: "local", item: "map" }).ok && w.p.bag.map === 0, "Treasure Map used");
ok(D.world.spiresNear && D.world.spiresNear(0, 0, 3200, 3).length === 3, "  and there are spires near to mark (" + D.world.spiresNear(0, 0, 3200, 3).map(s => Math.round(s.d)).join(", ") + " px)");
/* Digimentals */
const vee = EVO_TREE.branches.veemon.filter(b => b.kind === "armor");
ok(vee.length === 2 && vee.find(b => b.to === "flamedramon").conditions.item === "dm_courage" && vee.find(b => b.to === "magnamon").conditions.item === "dm_miracles", "each armor route asks for its own Digimental (Veemon: Courage -> Flamedramon, Miracles -> Magnamon)");
w = mk(); w.sim.merchant.visit = withStock("dm_courage");
ok(buy(w, "dm_courage").ok && w.p.items.indexOf("dm_courage") >= 0, "a Digimental of Courage is kept for the run");
const cm = EVO_TREE.conditionsMet, f = vee.find(b => b.to === "flamedramon").conditions, stats = { level: 9, meals: 20, joy: 70, happiness: 70, hpRatio: 1, bossesBeaten: 1, items: ["dm_courage"] };
ok(cm(f, stats) && !cm(vee.find(b => b.to === "magnamon").conditions, stats), "  it opens Flamedramon, not Magnamon");
/* the farm has its own visits */
w = mk(); w.sim.farm = { active: true, since: 500 }; ok(D.shopKey(w.sim) === "f5000", "at the farm the stock follows the farm visit");
/* prices */
ok(D.shopPrice("dm_courage", 5) === 180 && D.shopPrice("ticket", 3) === 45 && D.shopPrice("sprintBoots", 2) > D.shopPrice("sprintBoots", 0), "fixed prices; only the Sprint Boots climb");
console.log(failed ? "shop-test: " + failed + " failed" : "shop-test: all passed"); process.exit(failed ? 1 : 0);
