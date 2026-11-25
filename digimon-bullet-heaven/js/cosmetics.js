/* Persistent DigiCoins + cosmetic unlocks (farm skins, Digivice frames, titles).
 * All I/O goes through D.storage so a later cloud adapter can drop in.
 * Legendary set is not sold; it drops from defeating a hidden high-tier brawl foe.
 */
(function (global) {
  "use strict";

  var D = (global.DBH = global.DBH || {});
  var state = null;
  var listeners = [];
  var loaded = false;

  var CATALOG = [
    { id: "title-tamer", kind: "title", name: "Tamer", price: 0, desc: "The default title." },
    { id: "title-rookie", kind: "title", name: "Rookie Tamer", price: 20, desc: "Freshly licensed." },
    { id: "title-partner", kind: "title", name: "Partner", price: 40, desc: "Always by their side." },
    { id: "title-file-island", kind: "title", name: "File Island Scout", price: 70, desc: "You've walked the first island." },
    { id: "title-champion", kind: "title", name: "Champion Tamer", price: 120, desc: "A title earned in the ring." },
    { id: "digivice-standard", kind: "digivice", name: "Standard Digivice", price: 0, desc: "The classic orange brick." },
    { id: "digivice-teal", kind: "digivice", name: "Teal Digivice", price: 50, desc: "Cool coastal finish." },
    { id: "digivice-dusk", kind: "digivice", name: "Dusk Digivice", price: 80, desc: "Sunset copper bezel." },
    { id: "digivice-mono", kind: "digivice", name: "Mono Digivice", price: 110, desc: "Clean monochrome shell." },
    { id: "farm-isle", kind: "farm", name: "File Island Green", price: 0, desc: "Lush default pasture." },
    { id: "farm-sunset", kind: "farm", name: "Sunset Meadow", price: 60, desc: "Warm gold-green grass at dusk." },
    { id: "farm-night", kind: "farm", name: "Moonlit Pasture", price: 90, desc: "Cool night grass and pale blooms." },
    { id: "farm-shore", kind: "farm", name: "Island Shore", price: 90, desc: "Sandy patches and sea-glass clover." },
    { id: "title-boundless", kind: "title", name: "Boundless", price: 0, legendary: true, desc: "A title that appeared after a mysterious brawl." },
    { id: "digivice-omen", kind: "digivice", name: "Omen Digivice", price: 0, legendary: true, desc: "It hums when you aren't looking." },
    { id: "farm-unseen", kind: "farm", name: "Unseen Isle", price: 0, legendary: true, desc: "A pasture that shouldn't be on any map." }
  ];

  /* Tamer Rank titles (data.js RANK.titles): earned by rank, never sold. */
  ((D.RANK && D.RANK.titles) || []).forEach(function (t) {
    CATALOG.push({ id: t.id, kind: "title", name: t.name, price: 0, rank: t.rank, desc: "Earned at Tamer Rank " + t.rank + "." });
  });

  var DEFAULT_EQUIP = {
    title: "title-tamer",
    digivice: "digivice-standard",
    farm: "farm-isle"
  };

  function payoutCfg() {
    var c = D.DIGIBITS || (D.BRAWL_CFG && D.BRAWL_CFG.digiBits) || {};
    return {
      name: c.name || "DigiCoins",
      winReward: c.winReward != null ? c.winReward : 8,
      betPool: c.betPool != null ? c.betPool : 6,
      minBetPayout: c.minBetPayout != null ? c.minBetPayout : 1
    };
  }

  function emptyState() {
    return {
      digiBits: 0,
      unlocked: {
        "title-tamer": true,
        "digivice-standard": true,
        "farm-isle": true
      },
      equipped: { title: DEFAULT_EQUIP.title, digivice: DEFAULT_EQUIP.digivice, farm: DEFAULT_EQUIP.farm },
      legendaryDropped: false,
      settledPayouts: {}
    };
  }

  function normalize(raw) {
    var base = emptyState();
    if (!raw || typeof raw !== "object") return base;
    base.digiBits = Math.max(0, raw.digiBits | 0);
    var u = raw.unlocked && typeof raw.unlocked === "object" ? raw.unlocked : {};
    var k;
    for (k in u) if (Object.prototype.hasOwnProperty.call(u, k) && u[k]) base.unlocked[k] = true;
    var eq = raw.equipped && typeof raw.equipped === "object" ? raw.equipped : {};
    if (eq.title) base.equipped.title = eq.title;
    if (eq.digivice) base.equipped.digivice = eq.digivice;
    if (eq.farm) base.equipped.farm = eq.farm;
    base.legendaryDropped = !!raw.legendaryDropped;
    base.settledPayouts = (raw.settledPayouts && typeof raw.settledPayouts === "object") ? raw.settledPayouts : {};
    if (!base.unlocked[base.equipped.title]) base.equipped.title = DEFAULT_EQUIP.title;
    if (!base.unlocked[base.equipped.digivice]) base.equipped.digivice = DEFAULT_EQUIP.digivice;
    if (!base.unlocked[base.equipped.farm]) base.equipped.farm = DEFAULT_EQUIP.farm;
    return base;
  }

  function item(id) {
    var i;
    for (i = 0; i < CATALOG.length; i++) if (CATALOG[i].id === id) return CATALOG[i];
    return null;
  }

  function catalog(filter) {
    if (!filter) return CATALOG.slice();
    return CATALOG.filter(function (it) {
      if (filter.kind && it.kind !== filter.kind) return false;
      if (filter.purchasable && (it.legendary || it.rank)) return false;
      if (filter.legendary && !it.legendary) return false;
      return true;
    });
  }

  function notify() {
    var i;
    for (i = 0; i < listeners.length; i++) listeners[i](state);
    applyDom();
  }

  function persist() {
    if (!state) state = emptyState();
    if (D.storage && D.storage.saveCosmetics) return D.storage.saveCosmetics(state);
    return Promise.resolve(false);
  }

  function load() {
    if (!D.storage || !D.storage.loadCosmetics) {
      state = emptyState(); loaded = true;
      notify();
      return Promise.resolve(state);
    }
    return D.storage.loadCosmetics().then(function (raw) {
      state = D.storage.normalizeCosmetics ? D.storage.normalizeCosmetics(raw) : normalize(raw); loaded = true;
      notify();
      return state;
    });
  }

  function getState() { return state || emptyState(); }

  function bits() { return (state && state.digiBits) || 0; }

  function currencyName() { return payoutCfg().name; }

  function isUnlocked(id) { return !!(state && state.unlocked && state.unlocked[id]); }

  function equipped(kind) {
    var eq = (state && state.equipped) || DEFAULT_EQUIP;
    if (kind) return eq[kind] || DEFAULT_EQUIP[kind];
    return { title: eq.title, digivice: eq.digivice, farm: eq.farm };
  }

  function equippedItem(kind) { return item(equipped(kind)); }

  function titleLabel() {
    var it = equippedItem("title");
    return it ? it.name : "";
  }

  function grantBits(n, reason) {
    if (!state) state = emptyState();
    n = n | 0;
    if (n === 0) return state.digiBits;
    state.digiBits = Math.max(0, state.digiBits + n);
    persist();
    notify();
    return state.digiBits;
  }

  function unlock(id, opts) {
    opts = opts || {};
    var it = item(id);
    if (!it) return { ok: false, reason: "unknown" };
    if (!state) state = emptyState();
    if (state.unlocked[id]) return { ok: true, already: true, item: it };
    if (it.legendary && !opts.legendaryDrop && !opts.force) {
      return { ok: false, reason: "not-sold" };
    }
    if (it.rank && !opts.rank && !opts.force) return { ok: false, reason: "rank", rank: it.rank };
    if (!it.legendary && it.price > 0 && !opts.force) {
      if (state.digiBits < it.price) return { ok: false, reason: "broke", price: it.price };
      state.digiBits -= it.price;
    }
    state.unlocked[id] = true;
    persist();
    notify();
    return { ok: true, item: it, purchased: !it.legendary && it.price > 0 };
  }

  function equip(id, opts) {
    opts = opts || {};
    var it = item(id);
    if (!it) return { ok: false, reason: "unknown" };
    if (!isUnlocked(id)) return { ok: false, reason: "locked" };
    if (!state) state = emptyState();
    state.equipped[it.kind] = id;
    persist();
    notify();
    if (!opts.silent && D.session && typeof D.sessionBroadcastEquip === "function") {
      D.sessionBroadcastEquip(equipped());
    } else if (!opts.silent) {
      emitSession(equipped());
    }
    return { ok: true, item: it };
  }

  function emitSession(eq) {
    try {
      var sess = (D.getRun && D.getRun() && D.getRun().session) || null;
      if (sess && sess.send) sess.send("cosmetic:equip", { equipped: eq }, sess.localId);
    } catch (e) {}
  }

  function buyAndEquip(id) {
    var u = unlock(id);
    if (!u.ok) return u;
    var e = equip(id);
    return { ok: e.ok, item: e.item, purchased: u.purchased, already: u.already, reason: e.reason };
  }

  function legendaryIds() {
    return CATALOG.filter(function (it) { return it.legendary; }).map(function (it) { return it.id; });
  }

  function grantLegendarySet() {
    if (!state) state = emptyState();
    var ids = legendaryIds();
    var i, gained = [];
    for (i = 0; i < ids.length; i++) {
      if (!state.unlocked[ids[i]]) {
        state.unlocked[ids[i]] = true;
        gained.push(ids[i]);
      }
    }
    state.legendaryDropped = true;
    persist();
    notify();
    return gained;
  }

  /* Winner takes winReward. Correct bettors split betPool (at least minBetPayout each).
   * Legendary drop (hidden tier) only for a local winner who defeated a tier-5 form. */
  function applyAuthoritative(account) {
    account = account || {};
    if (!state) state = emptyState();
    if (account.digiBits != null) state.digiBits = Math.max(0, account.digiBits | 0);
    if (account.unlocked && typeof account.unlocked === "object") {
      var k;
      for (k in account.unlocked) if (Object.prototype.hasOwnProperty.call(account.unlocked, k) && account.unlocked[k]) state.unlocked[k] = true;
    }
    if (account.legendaryDropped) state.legendaryDropped = true;
    if (account.settledPayouts && typeof account.settledPayouts === "object") {
      if (!state.settledPayouts) state.settledPayouts = {};
      var id;
      for (id in account.settledPayouts) if (Object.prototype.hasOwnProperty.call(account.settledPayouts, id) && account.settledPayouts[id]) {
        state.settledPayouts[id] = account.settledPayouts[id];
      }
    }
    persist();
    notify();
    return state;
  }

  function settleBrawl(info) {
    info = info || {};
    if (!state) state = emptyState();
    if (info.matchId) {
      if (!state.settledPayouts) state.settledPayouts = {};
      if (state.settledPayouts[info.matchId]) {
        return { currency: payoutCfg().name, awards: [], localBits: bits(), legendaryDrop: [], mysterious: false, already: true, matchId: info.matchId };
      }
      state.settledPayouts[info.matchId] = true;
    }
    var cfg = payoutCfg();
    var awards = [];
    var localId = info.localId;
    var winnerId = info.winnerId;
    var correct = info.correctBettorIds || [];
    var i, share, rec;
    if (winnerId) {
      rec = { id: winnerId, reason: "win", amount: cfg.winReward, local: winnerId === localId };
      awards.push(rec);
      if (rec.local) grantBits(rec.amount, "win");
    }
    if (correct.length && cfg.betPool > 0) {
      share = Math.max(cfg.minBetPayout, Math.floor(cfg.betPool / correct.length));
      for (i = 0; i < correct.length; i++) {
        rec = { id: correct[i], reason: "bet", amount: share, local: correct[i] === localId };
        awards.push(rec);
        if (rec.local) grantBits(rec.amount, "bet");
      }
    }
    var drop = [];
    var defeatedLegendary = !!info.defeatedLegendary;
    if (defeatedLegendary && winnerId === localId) {
      drop = grantLegendarySet();
    }
    return {
      currency: cfg.name,
      awards: awards,
      localBits: bits(),
      legendaryDrop: drop,
      mysterious: drop.length > 0
    };
  }

  function applyDom() {
    if (typeof document === "undefined") return;
    var eq = equipped();
    var hud = document.getElementById("hud");
    if (hud) {
      hud.classList.remove("digivice-standard", "digivice-teal", "digivice-dusk", "digivice-mono", "digivice-omen");
      hud.classList.add(eq.digivice || "digivice-standard");
    }
    if (document.body) {
      document.body.setAttribute("data-farm-skin", eq.farm || "farm-isle");
      document.body.setAttribute("data-digivice", eq.digivice || "digivice-standard");
    }
    var chips = document.querySelectorAll("[data-digibits]");
    var i, label = currencyName() + " " + bits();
    for (i = 0; i < chips.length; i++) chips[i].textContent = label;
    var titles = document.querySelectorAll("[data-player-title]");
    var t = titleLabel();
    for (i = 0; i < titles.length; i++) titles[i].textContent = t;
  }

  function onChange(fn) {
    listeners.push(fn);
    return fn;
  }

  var api = {
    CATALOG: CATALOG,
    DEFAULT_EQUIP: DEFAULT_EQUIP,
    emptyState: emptyState,
    normalize: normalize,
    load: load,
    persist: persist,
    getState: getState,
    bits: bits,
    currencyName: currencyName,
    catalog: catalog,
    item: item,
    isUnlocked: isUnlocked,
    equipped: equipped,
    equippedItem: equippedItem,
    titleLabel: titleLabel,
    grantBits: grantBits,
    unlock: unlock,
    equip: equip,
    buyAndEquip: buyAndEquip,
    grantLegendarySet: grantLegendarySet,
    legendaryIds: legendaryIds,
    settleBrawl: settleBrawl,
    applyAuthoritative: applyAuthoritative,
    payoutCfg: payoutCfg,
    applyDom: applyDom,
    onChange: onChange,
    ready: function () { return loaded; }
  };

  D.cosmetics = api;
  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", function () { load(); });
  }
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
