/* Digi Night — the Hatchery. Between runs you raise one Digimon from a random
 * egg by feeding it data, and data is what a run pays you in: one piece for
 * every enemy you defeat, of that enemy's element, plus a little plain data for
 * every minute you last. It is kept on the profile.
 *
 *   - One egg at a time. Which egg you get is random, by rarity (TIERS).
 *   - Feeding fills a bar; when it is full the egg hatches, and after that the
 *     Digimon digivolves: Baby, In-Training, Rookie, Champion (COST). It is slow
 *     on purpose: a good run is about enough to hatch an egg.
 *   - What it becomes is not fixed. The element of the data it ate at that
 *     stage pulls it toward forms of that element, and so does the sky over the
 *     title screen at the moment it was fed. Nothing is certain either way.
 *   - Raising one to Rookie opens that egg line for good. It is the only way
 *     to open a line now.
 *   - You can take it into ONE run instead of an egg (the partner pick on the
 *     run setup screen). It starts at the stage you raised it to, and it is
 *     spent: a new egg is waiting when you come back. In the field it follows
 *     the same hidden rules as anything else, and what it ate here still pulls.
 *
 * The first half of this file is the rules, with no screen in it, so
 * scripts/hatchery-test.js can drive them; the second half is the page. */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});

  var CFG = {
    /* data to reach the next stage: hatch, then In-Training, Rookie, Champion */
    cost: [250, 600, 1400, 3200],
    earlyEggs: 2, earlyMul: 0.5,          /* your first two eggs grow at half the cost */
    /* what a run pays */
    perKill: 1, perBoss: 12, perBig: 20, plainPerMinute: 4,
    /* how many job levels it arrives with, by stage (Baby, In-Training, Rookie, Champion) */
    level: [1, 3, 8, 14],
    /* how hard its diet pulls */
    standard: 50, other: 5, neglect: 2, dietPull: 5, plainPull: 20, skyPull: 1.5, linePull: 6,
    feedStep: 25
  };
  var TIERS = [
    { id: "common", name: "Common", w: 44, col: "#cfd8e8" },
    { id: "uncommon", name: "Uncommon", w: 33, col: "#7be07a" },
    { id: "rare", name: "Rare", w: 18, col: "#58b8ff" },
    { id: "mythic", name: "Mythic", w: 5, col: "#ff8adf" }
  ];
  var STAGES = ["Egg", "Baby", "In-Training", "Rookie", "Champion"];
  var TYPES = ["fire", "ice", "water", "dark", "holy", "machine", "nature", "slime", "wind", "beast", "plain"];
  var TYPE_NAME = { fire: "Fire", ice: "Ice", water: "Water", dark: "Dark", holy: "Holy", machine: "Machine", nature: "Nature", slime: "Slime", wind: "Wind", beast: "Beast", plain: "Plain" };
  /* the sky over the title screen leans a feeding toward these elements */
  var SKY = { day: ["holy", "nature"], dusk: ["fire", "beast"], night: ["dark", "ice"], rain: ["water", "slime"], storm: ["machine", "wind"], meteor: ["holy", "machine"], eclipse: ["dark"], snow: ["ice"], dawn: ["holy", "wind"] };

  function eggs() { return D.EGGS || []; }
  function fam(form) { return D.moveFamilyOf ? D.moveFamilyOf(form) : "beast"; }
  function stageOf(form) { return D.moveStageIdx ? D.moveStageIdx(form) : 0; }
  function tree() { return D.EVO_TREE || (typeof EVO_TREE !== "undefined" ? EVO_TREE : null); }
  function h32(s) { var h = 2166136261, i; for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); }
  /* which rarity an egg line is: the five you start with are common, the rest are spread by name */
  function tierOf(lineId) {
    var e = null, i, r;
    for (i = 0; i < eggs().length; i++) if (eggs()[i].id === lineId) e = eggs()[i];
    if (!e || e.starter) return "common";
    r = h32(lineId) % 100;
    return r < 48 ? "uncommon" : (r < 84 ? "rare" : "mythic");
  }
  function tierDef(id) { var i; for (i = 0; i < TIERS.length; i++) if (TIERS[i].id === id) return TIERS[i]; return TIERS[0]; }
  function linesOf(tier) { return eggs().filter(function (e) { return tierOf(e.id) === tier; }); }

  function blank() { return { data: {}, egg: null, count: 0, raised: 0, used: 0 }; }
  /* Three slots (17z33, Isaac): up to three Digimon raised at once, each with its own egg and its own bloodline,
   * all fed from the one pool of data (you choose where it goes). H.slots[i] = { egg, blood }; H.sel is the slot
   * on the stand. Every rule below works on H.egg and H.blood, which are the selected slot's (a mirror, loaded
   * by clean and written back by syncSlot whenever a rule replaces either). A save from before the slots
   * becomes slot 1. */
  function freshBlood(lines) { return { gen: 0, traits: {}, tree: [], live: null, line: (lines || 0) + 1 }; }
  function slotCount() { return (D.BLOODLINE && D.BLOODLINE.slots) || 3; }
  function clean(H) {
    H = (H && typeof H === "object") ? H : blank();
    H.data = H.data || {}; H.count = H.count || 0; H.raised = H.raised || 0; H.used = H.used || 0;
    H.rookies = H.rookies || {};
    if (!H.slots) { H.slots = [{ egg: H.egg || null, blood: H.blood && typeof H.blood === "object" ? H.blood : freshBlood(0) }]; H.sel = 0; }
    while (H.slots.length < slotCount()) H.slots.push({ egg: null, blood: freshBlood(0) });
    H.sel = Math.max(0, Math.min(H.slots.length - 1, H.sel | 0));
    H.slots.forEach(function (s) { s.blood = s.blood && typeof s.blood === "object" ? s.blood : freshBlood(0); s.blood.traits = s.blood.traits || {}; s.blood.tree = s.blood.tree || []; s.blood.line = s.blood.line || 1; });
    H.egg = H.slots[H.sel].egg; H.blood = H.slots[H.sel].blood;
    return H;
  }
  /* write the selected slot back after a rule replaced H.egg or H.blood */
  function syncSlot(H) { if (H.slots && H.slots[H.sel]) { H.slots[H.sel].egg = H.egg; H.slots[H.sel].blood = H.blood; } }
  /* put slot i on the stand */
  function select(H, i) {
    if (!H.slots || !H.slots[i]) return false;
    syncSlot(H);
    H.sel = i; H.egg = H.slots[i].egg; H.blood = H.slots[i].blood;
    return true;
  }
  /* run fn with slot i on the stand, then put the one that was there back */
  function inSlot(H, i, fn) { var was = H.sel, out; select(H, i); out = fn(); select(H, was); return out; }
  function total(H) { var n = 0, k; for (k in H.data) n += H.data[k] || 0; return n; }
  function pickW(list, rng) { var s = 0, i, r; for (i = 0; i < list.length; i++) s += list[i].w; r = rng() * s; for (i = 0; i < list.length; i++) { r -= list[i].w; if (r <= 0) return list[i]; } return list[list.length - 1]; }

  /* a new egg: its rarity is decided now; what is inside is decided when it hatches */
  function newEgg(H, rng) {
    rng = rng || Math.random;
    if (H.egg) return null;
    var pool = TIERS.filter(function (t) { return linesOf(t.id).length > 0; }), t;
    /* an expedition brought back a map to a rare egg: this one is Rare or better (and the map is used up) */
    if (H.eggLead) { pool = pool.filter(function (x) { return x.id === "rare" || x.id === "mythic"; }); H.eggLead = false; if (!pool.length) pool = TIERS.filter(function (x) { return linesOf(x.id).length > 0; }); }
    t = pickW(pool, rng);
    H.count += 1;
    H.egg = { tier: t.id, stage: 0, form: null, line: null, route: [], prog: 0, n: H.count, fed: {}, now: {}, sky: {}, shell: Math.floor(rng() * 1e6) };
    syncSlot(H);
    return H.egg;
  }
  function cost(H) {
    var e = H.egg;
    if (!e || e.stage >= CFG.cost.length) return null;
    return Math.round(CFG.cost[e.stage] * (e.n <= CFG.earlyEggs ? CFG.earlyMul : 1));
  }
  function share(map) { var s = 0, k, o = {}; for (k in map) s += map[k]; for (k in map) o[k] = s ? map[k] / s : 0; return o; }
  function skyTop(e) { var best = null, k; for (k in e.sky) if (best == null || e.sky[k] > e.sky[best]) best = k; return best; }
  /* the forms it could become next, each with the weight its diet and sky give it */
  function options(H) {
    var e = H.egg, out = [], sh, sky, i, b, list, T, f, w, cand, seen = {};
    if (!e) return out;
    sh = share(e.now); sky = SKY[skyTop(e)] || [];
    if (e.stage === 0) {
      /* which egg it turns out to be: any line of its rarity, pulled toward what it was fed */
      cand = linesOf(e.tier);
      for (i = 0; i < cand.length; i++) {
        f = fam(cand[i].hatch);
        out.push({ to: cand[i].hatch, line: cand[i].id, kind: "hatch", w: (1 + CFG.linePull * (sh[f] || 0)) * (sky.indexOf(f) >= 0 ? CFG.skyPull : 1) });
      }
      return out;
    }
    T = tree(); list = (T && T.branches && T.branches[e.form]) || [];
    for (i = 0; i < list.length; i++) {
      b = list[i];
      if (!b || !b.to || seen[b.to] || !(D.SPECIES && D.SPECIES[b.to]) || stageOf(b.to) !== e.stage) continue;   /* e.stage is also the index of the stage it is going to */
      seen[b.to] = 1; f = fam(b.to);
      if (b.kind === "neglect" || b.kind === "fallback") w = CFG.neglect + CFG.plainPull * (sh.plain || 0);     /* plain data and nothing else is how you get a Numemon */
      else w = (b.kind === "standard" ? CFG.standard : CFG.other) * (1 + CFG.dietPull * (sh[f] || 0)) * (sky.indexOf(f) >= 0 ? CFG.skyPull : 1);
      out.push({ to: b.to, kind: b.kind || "standard", w: w });
    }
    return out;
  }
  function grow(H, rng) {
    var e = H.egg, opts = options(H), pick, from = e.form, res;
    if (!opts.length) return { ok: false, reason: "max" };
    pick = pickW(opts, rng || Math.random);
    if (e.stage === 0) e.line = pick.line;
    e.form = pick.to; e.route.push(pick.to); e.stage += 1; e.now = {}; e.sky = {};
    res = { ok: true, grew: true, from: from, to: pick.to, stage: e.stage, hatched: e.stage === 1, kind: pick.kind, unlocked: null };
    if (e.stage === 3) { H.raised += 1; res.unlocked = e.line; }
    if (e.stage === 3) { H.rookies = H.rookies || {}; H.rookies[pick.to] = (H.rookies[pick.to] || 0) + 1; }   /* every Rookie raised here: Versus lets you bring it (vs-rookie.js) */
    return res;
  }
  /* feed it `amount` of one type of data under a given sky. Returns what happened. */
  function feed(H, type, amount, sky, rng) {
    var e = H.egg, c = cost(H), have = H.data[type] || 0, n, res;
    if (!e) return { ok: false, reason: "no-egg" };
    if (c == null) return { ok: false, reason: "max" };
    if (TYPES.indexOf(type) < 0) return { ok: false, reason: "type" };
    n = Math.max(0, Math.min(Math.floor(amount || 0), have, c - e.prog));
    if (!n) return { ok: false, reason: have ? "full" : "none" };
    H.data[type] = have - n;
    e.prog += n; e.fed[type] = (e.fed[type] || 0) + n; e.now[type] = (e.now[type] || 0) + n;
    if (sky) e.sky[sky] = (e.sky[sky] || 0) + n;
    if (e.prog >= c) { e.prog = 0; res = grow(H, rng); res.fed = n; return res; }
    return { ok: true, grew: false, fed: n };
  }
  function ready(H) { return !!(H.egg && H.egg.stage >= 1); }
  /* take it into a run: it is spent, and what it ate goes with it */
  function use(H) {
    var e = H.egg, sh, bias = {}, k;
    if (!ready(H)) return null;
    sh = share(e.fed);
    for (k in sh) if (k !== "plain" && sh[k] > 0.05) bias[k] = Math.round(sh[k] * 100) / 100;
    H.egg = null; H.used += 1; syncSlot(H);
    /* it carries its bloodline: every trait the line has earned so far (data.js BLOODLINE) */
    var BL = bloodOf(H);
    BL.gen += 1;
    BL.live = { gen: BL.gen, form: e.form, line: e.line, tier: e.tier, carried: copyTraits(BL.traits), at: Date.now() };
    return { form: e.form, line: e.line, route: e.route.slice(), stage: e.stage, level: CFG.level[e.stage - 1] || 1, bias: bias, tier: e.tier, blood: { gen: BL.gen, traits: copyTraits(BL.traits) } };
  }

  /* ---------- Expeditions (17z33, Isaac) ----------
   * A run is over and the Digimon on the stand wasn't in it: it went exploring and is back with what it found
   * (data.js EXPEDITION). r: { seconds, used (it was taken into this run), duel }. Returns the report, or null.
   * The report says what to add; the page side (expeditionEnd) pays the coins and the item. */
  function expedition(H, r, rng) {
    var X = D.EXPEDITION, slots = H.slots || [{ egg: H.egg, blood: bloodOf(H) }], team = [], i, s, e, m, best = 0, sum = 0, mins, mul, fam, type, out;
    rng = rng || Math.random; r = r || {};
    if (!X || r.used || r.duel || (r.seconds || 0) < X.minSec) return null;
    /* everyone hatched on the stands goes (the one taken into the run is already gone from its slot) */
    for (i = 0; i < slots.length; i++) {
      s = slots[i]; e = s && s.egg;
      if (!e || !(e.stage >= 1) || !e.form) continue;
      m = (X.stageMul[e.stage - 1] || 1) * (1 + Math.min(X.genMax, X.genBonus * ((s.blood && s.blood.gen) || 0)));
      team.push({ form: e.form, mul: m }); best = Math.max(best, m); sum += m;
    }
    if (!team.length) return null;
    mins = Math.min(X.capMin, (r.seconds || 0) / 60);
    mul = best * (1 + (X.team || 0) * (team.length - 1));
    out = { form: team[0].form, forms: team.map(function (t) { return t.form; }), mins: Math.round(mins), data: {}, coins: Math.round(mins * X.coins * mul), item: rng() < Math.min(X.itemMax, mins * X.itemPer * mul), egg: rng() < Math.min(X.eggMax, mins * X.eggPer * mul) };
    /* the data, each one's share of its own element */
    for (i = 0; i < team.length; i++) {
      fam = D.moveFamilyOf ? D.moveFamilyOf(team[i].form) : null; type = TYPES.indexOf(fam) >= 0 ? fam : "plain";
      out.data[type] = (out.data[type] || 0) + Math.max(1, Math.round(mins * X.data * mul * team[i].mul / sum));
    }
    earn(H, out.data);
    if (out.egg) H.eggLead = true;
    H.exped = { n: ((H.exped && H.exped.n) || 0) + 1, last: { form: out.form, forms: out.forms, mins: out.mins, data: out.data, coins: out.coins, item: null, egg: out.egg, at: Date.now() } };
    return out;
  }

  /* ---------- Bloodlines (17z33, Isaac) ----------
   * One line, parent to child: the Digimon you raise here and take into a run is a generation. If it reaches
   * Mega in that run (BLOODLINE.mega traits) or has a great run (BLOODLINE.great), the line earns that many
   * trait levels, and every egg after carries them all. Which trait: mostly the stat its element favours,
   * sometimes the one that goes with it, Power, Quick Study, Head Start or Lucky Scales; never past a trait's
   * max, and the line holds `cap` levels in all. The family tree keeps every generation: what it was, how far it
   * got, what it passed on. */
  function bloodOf(H) { if (!H.blood) { H.blood = freshBlood(0); syncSlot(H); } H.blood.traits = H.blood.traits || {}; H.blood.tree = H.blood.tree || []; return H.blood; }
  function copyTraits(t) { var o = {}, k; for (k in (t || {})) if (t[k] > 0) o[k] = t[k]; return o; }
  function traitTotal(t) { var n = 0, k; for (k in (t || {})) n += t[k] || 0; return n; }
  var FAV = { fire: "str", beast: "str", machine: "dex", wind: "agi", ice: "int", water: "int", dark: "int", holy: "int", nature: "vit", slime: "vit", bubble: "vit" };
  var SECOND = { str: "agi", int: "dex", dex: "str", agi: "str", vit: "str" };
  function pickTrait(BL, form, rng) {
    var B = D.BLOODLINE, fam = D.moveFamilyOf ? D.moveFamilyOf(form) : null, fav = FAV[fam] || "str", W = B.weights, list = [], k;
    var w = { power: W.power, learn: W.learn, skill: W.skill, shiny: W.shiny }; w[fav] = W.fav; w[SECOND[fav] || "dex"] = (w[SECOND[fav] || "dex"] || 0) + W.second;
    for (k in w) if ((BL.traits[k] || 0) < B.max) list.push({ id: k, w: w[k] });
    if (!list.length) return null;
    return pickW(list, rng || Math.random).id;
  }
  /* a run with this line's Digimon has ended: did it earn the line anything? r: { mega, peak (stage name),
     seconds, nights, story, mode }. Returns { gen, earned: [trait ids], why } or null if no Hatchery Digimon ran. */
  function runEnded(H, r, rng) {
    var i;
    /* the generation that ran came from whichever slot it was raised in */
    if (H.slots) for (i = 0; i < H.slots.length; i++) if (i !== H.sel && H.slots[i].blood && H.slots[i].blood.live) return inSlot(H, i, function () { return runEndedHere(H, r, rng); });
    return runEndedHere(H, r, rng);
  }
  /* take `n` trait levels off the line, the biggest first */
  function loseTraits(BL, n) {
    var lost = [], k, best;
    while (n-- > 0) {
      best = null; for (k in BL.traits) if (BL.traits[k] > 0 && (!best || BL.traits[k] > BL.traits[best])) best = k;
      if (!best) break;
      BL.traits[best] -= 1; if (!BL.traits[best]) delete BL.traits[best]; lost.push(best);
    }
    return lost;
  }
  function runEndedHere(H, r, rng) {
    var B = D.BLOODLINE, BL = bloodOf(H), live = BL.live, why = null, n = 0, got = [], t, i, st, lost = [], fate = null;
    if (!live || !B) return null;
    r = r || {};
    /* it fell (Isaac): reaching Mega first is a valorous death and the line goes on; as an Ultimate or a Champion
       the line loses traits; a Rookie or younger takes the whole line with it */
    if (r.died && !r.mega) {
      st = r.diedStage || r.peak;
      if (B.lose[st]) { lost = loseTraits(BL, B.lose[st]); fate = "lost"; why = "fell as " + (st === "Ultimate" ? "an Ultimate" : "a " + st); }
      else {
        fate = "erased"; why = "fell young (" + (st || "Rookie") + ")";
        var ended = { gen: live.gen, form: live.form, line: BL.line, traits: copyTraits(BL.traits), at: Date.now() }, lines = BL.line || 1, hist = (BL.ended || []).concat([ended]).slice(-5);
        H.blood = freshBlood(lines); H.blood.ended = hist; syncSlot(H);
        return { gen: live.gen, earned: [], lost: Object.keys(ended.traits), why: why, fate: fate, line: lines + 1 };
      }
      BL.tree.push({ gen: live.gen, form: live.form, line: live.line, tier: live.tier, peak: r.peakForm || r.peak || null, why: why, earned: [], lost: lost, fate: fate, carried: live.carried || {}, mode: r.mode || null, at: live.at });
      if (BL.tree.length > 40) BL.tree.splice(0, BL.tree.length - 40);
      BL.live = null;
      return { gen: live.gen, earned: [], lost: lost, why: why, fate: fate };
    }
    if (r.died && r.mega) { why = "fell after reaching Mega: a valorous death"; n = B.mega; fate = "valorous"; }
    else if (r.mega) { why = "reached Mega"; n = B.mega; }
    else if (r.peak === "Ultimate") { why = "reached Ultimate"; n = B.great; }
    else if ((r.nights || 0) >= B.nights) { why = "held " + r.nights + " nights"; n = B.great; }
    else if (r.story) { why = "finished the story"; n = B.great; }
    else if ((r.seconds || 0) >= B.seconds) { why = "lasted " + Math.floor(r.seconds / 60) + " minutes"; n = B.great; }
    for (i = 0; i < n && traitTotal(BL.traits) < B.cap; i++) { t = pickTrait(BL, live.form, rng); if (!t) break; BL.traits[t] = (BL.traits[t] || 0) + 1; got.push(t); }
    BL.tree.push({ gen: live.gen, form: live.form, line: live.line, tier: live.tier, peak: r.peakForm || r.peak || null, why: why, earned: got, fate: fate, carried: live.carried || {}, mode: r.mode || null, at: live.at });
    if (BL.tree.length > 40) BL.tree.splice(0, BL.tree.length - 40);
    BL.live = null;
    return { gen: live.gen, earned: got, why: why, fate: fate, full: n > 0 && !got.length };
  }
  function traitText(k, lv) {
    var B = D.BLOODLINE, nm = B.names[k] || k;
    if (B.names[k] && ["str", "agi", "vit", "int", "dex", "luk"].indexOf(k) >= 0) return nm + " +" + lv * B.stat;
    if (k === "power") return "Power +" + Math.round(lv * B.power * 100) + "%";
    if (k === "learn") return "Quick Study +" + Math.round(lv * B.learn * 100) + "% XP";
    if (k === "skill") return "Head Start +" + lv * B.skill + " skill point" + (lv * B.skill > 1 ? "s" : "");
    if (k === "shiny") return "Lucky Scales x" + (1 + lv * B.shiny).toFixed(1) + " shiny";
    return nm + " " + lv;
  }
  /* what a finished run pays: { fire: n, ..., plain: n } */
  function pay(killsBy, seconds) {
    var out = {}, k, n = 0;
    for (k in (killsBy || {})) if (TYPES.indexOf(k) >= 0 && killsBy[k] > 0) { out[k] = Math.round(killsBy[k]); n += out[k]; }
    k = Math.floor(Math.max(0, seconds || 0) / 60 * CFG.plainPerMinute);
    if (k > 0) out.plain = (out.plain || 0) + k;
    /* the Lab's Data Tap: a little more of every kind */
    n = D.lab && D.lab.mods ? (D.lab.mods().data || 1) : 1;
    if (n !== 1) for (k in out) out[k] = Math.round(out[k] * n);
    return out;
  }
  function earn(H, got) { var k; for (k in got) H.data[k] = (H.data[k] || 0) + got[k]; return H; }
  function killWorth(e) { return e && e.big ? CFG.perBig : (e && e.boss ? CFG.perBoss : CFG.perKill); }

  var rules = { CFG: CFG, TIERS: TIERS, STAGES: STAGES, TYPES: TYPES, TYPE_NAME: TYPE_NAME, SKY: SKY, blank: blank, clean: clean, tierOf: tierOf, tierDef: tierDef, linesOf: linesOf, newEgg: newEgg, cost: cost,
    options: options, feed: feed, ready: ready, use: use, pay: pay, earn: earn, killWorth: killWorth, total: total,
    runEnded: runEnded, pickTrait: pickTrait, traitText: traitText, bloodOf: bloodOf, expedition: expedition, select: select, syncSlot: syncSlot, loseTraits: loseTraits };

  /* ------------------------------ the page ------------------------------ */
  function $(id) { return document.getElementById(id); }
  function store() { return (D.profile && D.profile.hatch) ? clean(D.profile.hatch()) : clean(null); }
  function keep() { if (D.profile && D.profile.save) D.profile.save(); }
  function spName(id) { return (D.SPECIES && D.SPECIES[id] && D.SPECIES[id].name) || id || "?"; }
  function col(type) { var F = D.MOVE_FAMILIES || {}; return type === "plain" ? "#d8dce8" : ((F[type] && F[type].c) || "#ffffff"); }
  function sky() { return D.titleScene && D.titleScene.phase ? D.titleScene.phase() : null; }
  var flash = 0, tick = 0, note = "", noteT = 0;
  function say(s) { note = s; noteT = 6; if ($("hatch-foot")) $("hatch-foot").textContent = s; }

  function render() {
    var H = store(), e = H.egg, c = cost(H), grid = $("hatch-data"), h = "", i, t, n, T, max;
    if (!$("hatchery-screen")) return;
    /* every empty slot gets a new egg */
    if (D.profile && D.profile.exists && D.profile.exists()) {
      var made = 0;
      for (i = 0; i < H.slots.length; i++) if (!H.slots[i].egg) { inSlot(H, i, function () { newEgg(H); }); made++; }
      if (made) { keep(); e = H.egg; c = cost(H); if (made === 1 && !H.slots.some(function (s, si) { return si !== H.sel && !s.egg; })) say("A new egg. Nobody knows what is in it until it hatches."); }
    }
    renderSlots(H);
    T = e ? tierDef(e.tier) : TIERS[0];
    $("hatch-name").textContent = !e ? "No egg" : (e.stage === 0 ? "Mystery egg" : spName(e.form));
    $("hatch-tag").innerHTML = !e ? "" : "<b style='color:" + T.col + "'>" + T.name + "</b>  ·  " + STAGES[e.stage] + (e.stage >= 1 && e.stage < 3 ? "  ·  raise it to Rookie to open its line" : "") + (e.stage >= 3 ? "  ·  line opened" : "");
    max = !!e && c == null;
    $("hatch-bar").style.width = (!e ? 0 : (max ? 100 : Math.round(100 * e.prog / c))) + "%";
    $("hatch-bar-text").textContent = !e ? "" : (max ? "Fully grown here. Take it into a run." : e.prog + " / " + c + " data to " + (e.stage === 0 ? "hatch" : "digivolve"));
    $("hatch-total").textContent = String(total(H));
    for (i = 0; i < TYPES.length; i++) {
      t = TYPES[i]; n = H.data[t] || 0;
      h += "<div class='hatch-chip" + (n ? "" : " is-none") + "' style='--c:" + col(t) + "'><i></i><b>" + TYPE_NAME[t] + "</b><span>" + n + "</span>" +
        "<button type='button' class='btn hatch-feed' data-feed='" + t + "' data-n='" + CFG.feedStep + "'" + (n && !max ? "" : " disabled") + ">+" + CFG.feedStep + "</button>" +
        "<button type='button' class='btn hatch-feed' data-feed='" + t + "' data-n='all'" + (n && !max ? "" : " disabled") + ">All</button></div>";
    }
    grid.innerHTML = h;
    $("hatch-use").hidden = !ready(H);
    var xp = $("hatch-exped");
    if (xp) {
      var XL = H.exped && H.exped.last;
      xp.hidden = !(e && e.stage >= 1) && !XL;
      xp.innerHTML = (e && e.stage >= 1 ? "<b>Expeditions:</b> while you play a run without it, " + spName(e.form) + " goes exploring and brings back data, DigiCoins, sometimes an item or a map to a rare egg." : "") +
        (XL ? "<br><small>Last time " + spName(XL.form) + " was out " + XL.mins + " min and found " + expText(XL) + "." + (H.eggLead ? " Your next egg will be Rare or better." : "") + "</small>" : "");
    }
    if (ready(H)) $("hatch-use").textContent = "Slot " + (H.sel + 1) + " is on the stand. Pick " + spName(e.form) + " on the run setup screen to take it into ONE run. It will not come back." + (traitTotal(bloodOf(H).traits) ? " It carries its bloodline's traits with it." : "");
    renderFed(e, max);
    renderBlood(H);
    if (noteT <= 0) $("hatch-foot").textContent = "Runs pay data: one for every enemy you defeat, of its element, and a little plain data for time survived. What you feed it, and the sky when you do, shape what it becomes.";
  }
  function expText(x) {
    var bits = [], k;
    for (k in (x.data || {})) bits.push("+" + x.data[k] + " " + (TYPE_NAME[k] || k) + " data");
    if (x.coins) bits.push(x.coins + " DigiCoins");
    if (x.item) bits.push(typeof x.item === "string" ? x.item : x.item.name);
    if (x.egg) bits.push("a map to a rare egg");
    return bits.length > 1 ? bits.slice(0, -1).join(", ") + " and " + bits[bits.length - 1] : (bits[0] || "nothing");
  }
  /* what it has been fed (Isaac): a bar split by data type, and the numbers, for all it has eaten and for what
     it has eaten since it last grew (that's what steers the next digivolution). Names and numbers, not colour
     alone. */
  function fedRow(label, map, note) {
    var tot = 0, k, h = "", list = [];
    for (k in (map || {})) if (map[k] > 0) { tot += map[k]; list.push(k); }
    list.sort(function (a, b) { return map[b] - map[a]; });
    h += "<div class='fed-row'><div class='fed-head'><b>" + label + "</b><span>" + tot + " data" + (note ? " · " + note : "") + "</span></div>";
    if (!tot) return h + "<p class='fed-none'>Nothing yet.</p></div>";
    h += "<div class='fed-bar'>";
    list.forEach(function (t) { h += "<i style='width:" + (100 * map[t] / tot).toFixed(1) + "%;background:" + col(t) + "' title='" + TYPE_NAME[t] + " " + map[t] + "'></i>"; });
    h += "</div><div class='fed-list'>";
    list.forEach(function (t) { h += "<span><i style='background:" + col(t) + "'></i>" + TYPE_NAME[t] + " <b>" + map[t] + "</b> <small>" + Math.round(100 * map[t] / tot) + "%</small></span>"; });
    return h + "</div></div>";
  }
  function renderFed(e, max) {
    var box = $("hatch-fed");
    if (!box) return;
    box.hidden = !e;
    if (!e) return;
    box.innerHTML = fedRow(e.stage === 0 ? "Fed so far" : "Since it last grew", e.now, e.stage === 0 ? "picks which egg it is" : (max ? "fully grown here" : "steers its next digivolution")) +
      (e.stage > 0 ? fedRow("All it has eaten", e.fed, "goes with it into a run") : "");
  }
  /* the three slots: tap one to put it on the stand (feeding, the run setup, a duel and the bloodline all use
     the one on the stand) */
  function slotLabel(s) { var e = s.egg; return !e ? "Empty" : (e.stage === 0 ? "Mystery egg" : spName(e.form) + " · " + STAGES[e.stage]); }
  function renderSlots(H) {
    var box = $("hatch-slots"), h = "", i, s;
    if (!box) return;
    for (i = 0; i < H.slots.length; i++) {
      s = H.slots[i];
      h += "<button type='button' class='hatch-slot" + (i === H.sel ? " is-on" : "") + "' data-slot='" + i + "' title='" + slotLabel(s) + "'><small>Slot " + (i + 1) + (i === H.sel ? " · on the stand" : "") + "</small><b>" + slotLabel(s) + "</b><span>Line " + (s.blood.line || 1) + " · Gen " + (s.blood.gen + (s.egg ? 1 : 0)) + (traitTotal(s.blood.traits) ? " · " + traitTotal(s.blood.traits) + " traits" : "") + "</span></button>";
    }
    box.innerHTML = h;
    Array.prototype.forEach.call(box.querySelectorAll("[data-slot]"), function (b) {
      b.addEventListener("click", function () { var H2 = store(); select(H2, +b.getAttribute("data-slot")); keep(); if (D.uiSfx) D.uiSfx("ui"); render(); });
    });
  }
  /* the line: its generation, its traits (words and numbers), and the family tree when opened */
  var treeOpen = false;
  function renderBlood(H) {
    var box = $("hatch-blood"), BL = bloodOf(H), B = D.BLOODLINE, k, h = "", tr = BL.traits, any = false, i, g, sp;
    if (!box || !B) return;
    h += "<p class='hatch-sub'>Bloodline <span class='hub-chip'>Generation <b>" + (BL.gen + (H.egg ? 1 : 0)) + "</b></span> <span class='hub-chip'>Traits <b>" + traitTotal(tr) + "</b> / " + B.cap + "</span></p>";
    h += "<div class='blood-traits'>";
    for (k in B.names) if (tr[k] > 0) { any = true; h += "<span class='blood-trait'><b>" + traitText(k, tr[k]) + "</b><small>Lv " + tr[k] + "/" + B.max + "</small></span>"; }
    if (BL.ended && BL.ended.length && !BL.gen) h += "<span class='blood-none'>Line " + ((BL.line || 2) - 1) + " ended when its " + spName(BL.ended[BL.ended.length - 1].form) + " fell young. This is a new line.</span> ";
    if (!any) h += "<span class='blood-none'>No traits yet. Take this line's Digimon into a run: reach Ultimate, last " + Math.round(B.seconds / 60) + " minutes, hold " + B.nights + " nights in Night Siege or finish the story to pass one on. Reach Mega to pass on " + B.mega + ".</span>";
    h += "</div><p class='blood-note'>" + (any ? "Every egg from here on carries all of these into its run. " : "") + "If it falls in its run: after reaching Mega, a valorous death and the line goes on; as an Ultimate the line loses " + B.lose.Ultimate + " trait level, as a Champion " + B.lose.Champion + "; as a Rookie or younger the whole line is erased.</p>";
    h += "<button type='button' class='btn blood-tree-btn' id='btn-blood-tree'>" + (treeOpen ? "Hide the family tree" : "Family tree (" + BL.tree.length + ")") + "</button>";
    if (treeOpen) {
      h += "<ol class='blood-tree'>";
      if (!BL.tree.length) h += "<li class='blood-none'>No generations yet: the first is the one you take into a run.</li>";
      for (i = BL.tree.length - 1; i >= 0; i--) {
        g = BL.tree[i]; sp = spName(g.form);
        h += "<li class='" + (g.fate ? "is-" + g.fate : "") + "'><b>Gen " + g.gen + " · " + sp + (g.peak && g.peak !== g.form ? " → " + spName(g.peak) : "") + (g.fate === "valorous" ? " · valorous death" : (g.fate === "lost" ? " · fell" : "")) + "</b>" +
          "<span>" + (g.fate === "lost" ? g.why + ": the line lost " + (g.lost && g.lost.length ? g.lost.map(function (t) { return B.names[t] || t; }).join(", ") : "nothing (it had no traits)") : (g.why ? g.why + ": passed on " + (g.earned.length ? g.earned.map(function (t) { return B.names[t] || t; }).join(", ") : "nothing (the line is full)") : "passed on nothing this time")) + "</span>" +
          "<small>carried " + (traitTotal(g.carried) ? Object.keys(g.carried).map(function (t) { return traitText(t, g.carried[t]); }).join(", ") : "no traits") + "</small></li>";
      }
      h += "</ol>";
    }
    box.innerHTML = h;
    var bt = $("btn-blood-tree");
    if (bt) bt.addEventListener("click", function () {
      treeOpen = !treeOpen; if (D.uiSfx) D.uiSfx("ui"); renderBlood(store());
      var tl = box.querySelector(".blood-tree"); if (tl && tl.scrollIntoView) tl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }
  function onClick(ev) {
    var b = ev.target.closest ? ev.target.closest("[data-feed]") : null, H, r, t, n, was;
    if (!b) return;
    H = store(); t = b.getAttribute("data-feed"); n = b.getAttribute("data-n");
    was = H.egg ? H.egg.form : null;
    r = feed(H, t, n === "all" ? 1e9 : +n, sky());
    if (!r.ok) { if (D.uiSfx) D.uiSfx("ui"); say(r.reason === "none" ? "You have no " + TYPE_NAME[t] + " data. Runs pay it." : "It cannot take any more."); return; }
    keep();
    if (r.grew) {
      flash = 1.2;
      if (D.audio) D.audio.sfx("job");
      if (r.unlocked && D.unlockEgg) D.unlockEgg(r.unlocked);
      say(r.hatched ? "It hatched! A " + spName(r.to) + "." : spName(was) + " digivolved into " + spName(r.to) + "!" + (r.unlocked ? "  Its egg line is yours now: you can pick that egg for any run." : ""));
      if (D.hub && D.hub.refresh) D.hub.refresh();
    } else if (D.uiSfx) D.uiSfx("ui");
    render();
  }
  /* the egg (or what came out of it) on its stand, drawn every frame by game.js through tickPage */
  function paint(dt) {
    var cv = $("hatch-art"), c, S = D.sprites, H, e, T, i, a, bob, g;
    tick += dt; if (noteT > 0) { noteT -= dt; if (noteT <= 0) render(); }
    if (!cv || !S) return;
    c = cv.getContext("2d"); c.imageSmoothingEnabled = false; c.clearRect(0, 0, cv.width, cv.height);
    H = store(); e = H.egg; if (!e) return;
    T = tierDef(e.tier);
    /* its rarity glows round it */
    c.globalAlpha = 0.16 + 0.05 * Math.sin(tick * 2); c.fillStyle = T.col;
    c.beginPath(); c.arc(170, 150, 104 + Math.sin(tick * 2) * 5, 0, 7); c.fill(); c.beginPath(); c.arc(170, 150, 70, 0, 7); c.fill();
    c.globalAlpha = 1;
    for (i = 0; i < 12; i++) { a = tick * 0.6 + i * 0.5236; c.fillStyle = i % 3 ? T.col : "#ffffff"; c.globalAlpha = 0.5 + 0.4 * Math.sin(tick * 3 + i); c.fillRect(Math.round(170 + Math.cos(a) * 118) - 2, Math.round(150 + Math.sin(a) * 96) - 2, 4, 4); }
    c.globalAlpha = 1;
    /* the stand */
    c.fillStyle = "#1a2438"; c.fillRect(96, 232, 148, 12); c.fillStyle = "#2c3f5c"; c.fillRect(104, 224, 132, 10); c.fillStyle = "#4a6a94"; c.fillRect(104, 224, 132, 3);
    bob = e.stage === 0 ? Math.abs(Math.sin(tick * (2 + 5 * (e.prog / (cost(H) || 1))))) * 5 : 0;
    c.save(); c.translate(170, 226 - bob);
    try {
      if (e.stage === 0) { c.scale(3.4, 3.4); c.rotate(Math.sin(tick * 9) * 0.05 * (e.prog / (cost(H) || 1))); S.drawEgg(c, "egg_08", 0, 0, tick, false, false, e.shell % 97); }
      else { g = [3.2, 3, 2.6, 1.9][e.stage - 1] || 2; c.scale(g, g); S.drawPartner(c, e.form, 0, 0, 1, 1, tick, false, false, false); }
    } catch (err) {}
    c.restore();
    if (flash > 0) { flash -= dt; c.globalAlpha = Math.max(0, Math.min(1, flash)); c.fillStyle = "#ffffff"; c.fillRect(0, 0, cv.width, cv.height); c.globalAlpha = 1; }
  }
  function init() {
    var g = $("hatch-data"), back = $("btn-hatch-back");
    if (g) g.addEventListener("click", onClick);
    if (back) back.addEventListener("click", function () { if (D.uiSfx) D.uiSfx("ui"); if (D.menu) D.menu.go("title"); });
    if (D.px && D.px.stamp && $("hatchery-screen")) D.px.stamp($("hatchery-screen"));
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && D.getState && D.getState() === "hatchery" && D.menu) { D.menu.go("title"); e.preventDefault(); } });
  }
  D.hatchery = {
    rules: rules, render: render, paint: paint,
    /* for the hub tile and the run setup screen */
    state: function () { var H = store(); return { egg: H.egg, total: total(H), cost: cost(H), ready: ready(H), tier: H.egg ? tierDef(H.egg.tier) : null }; },
    ready: function () { return ready(store()); },
    /* a run ended: bank what it paid. Returns what was paid, for the game over screen. */
    bank: function (killsBy, seconds) { var H = store(), got = pay(killsBy, seconds); if (!D.profile || !D.profile.exists || !D.profile.exists()) return got; earn(H, got); keep(); return got; },
    /* a run is starting with it: hand it over and clear the stand */
    take: function () { var H = store(), r = use(H); if (r) keep(); return r; },
    killWorth: killWorth, typeName: function (t) { return TYPE_NAME[t] || t; },
    /* the Rookies you've raised here (17z33, for Versus): every one recorded, and the one on the stand now if
       it has got that far (eggs raised before this was kept count through that) */
    /* a run is over (game.js endRun): the Digimon on the stand went exploring if it wasn't in it; pays the coins and
       any item, and returns the report for the run-over screen */
    expeditionEnd: function (r) {
      var H = store(), out = expedition(H, r), it;
      if (!out) return null;
      if (out.coins && D.cosmetics && D.cosmetics.grantBits) D.cosmetics.grantBits(out.coins, "expedition");
      if (out.item && D.items && D.items.pick && D.items.give) { it = D.items.pick("cons"); out.item = it ? D.items.give(it, "an expedition") : null; if (H.exped && H.exped.last) H.exped.last.item = out.item ? out.item.name : null; }
      else out.item = null;
      keep();
      return out;
    },
    /* Duel (17z33): the Digimon on the stand as it is, for a duel. Nothing is spent or changed. null: nothing hatched */
    duelSpec: function () { var H = store(), e = H.egg, BL = bloodOf(H); if (!e || !(e.stage >= 1) || !e.form) return null; return { form: e.form, level: CFG.level[e.stage - 1] || 1, blood: { gen: BL.gen + 1, traits: copyTraits(BL.traits) } }; },
    /* a run is over: if it was this line's Digimon, did it earn the line a trait? (game.js endRun) */
    runEnded: function (r) { var H = store(), got = runEnded(H, r); if (got) keep(); return got; },
    traitText: traitText, expText: expText,
    rookies: function () {
      var H = store(), out = {}, k, r = (H.egg && H.egg.route) || [], i;
      for (k in H.rookies) out[k] = 1;
      if (H.egg && H.egg.stage >= 3) for (i = 0; i < r.length; i++) if (D.SPECIES && D.SPECIES[r[i]] && D.SPECIES[r[i]].stage === "Rookie") out[r[i]] = 1;
      return Object.keys(out);
    }
  };
  if (typeof document !== "undefined") { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init(); }
})(typeof window !== "undefined" ? window : globalThis);
