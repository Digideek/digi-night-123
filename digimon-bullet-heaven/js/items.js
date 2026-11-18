/* Digi Night — items you keep between runs (data.js ITEMS).
 *
 *   Crest Pieces  plug into the Digivice (1 slot; the Lab's Digivice Port adds a second)
 *   Charms        worn by the partner (1 slot)
 *   One-run items one per run: a consumable, or a rival's scroll
 *
 * They are found, not bought: bosses drop charms and consumables, biome lords
 * drop Crest Pieces, a beaten rival leaves a scroll of one of its skills.
 * The stash is part of the game save (game.js save.items). What the gear does
 * inside a run is in net/mission-sim.js (_gear, _gearStart, _scrollTry); the
 * screen-side effects (minimap, warnings) are read in game.js through fxOn().
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});
  var RANK = { common: 1, rare: 2, prismatic: 3 }, KIND = { crest: "Crest Piece", charm: "Charm", cons: "One-run item" };
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return "&#" + c.charCodeAt(0) + ";"; }); }
  function cfg() { return D.ITEMS || { list: [], drop: {}, dupeBits: {}, maxStack: 9, maxScrolls: 12 }; }
  function byId(id) { var L = cfg().list, i; for (i = 0; i < L.length; i++) if (L[i].id === id) return L[i]; return null; }
  function rnd() { return Math.random(); }

  /* ---------- the stash ---------- */
  function stash() {
    var s = (D.stash && D.stash.get()) || {};
    s.gear = s.gear || {}; s.cons = s.cons || {}; s.scrolls = s.scrolls || [];
    s.eq = s.eq || {}; s.eq.crest = s.eq.crest || [];
    return s;
  }
  function write() { if (D.stash) D.stash.write(); }
  function slots() { return 1 + ((D.lab && D.lab.level) ? Math.min(1, D.lab.level("port")) : 0); }
  function skillName(id) {
    var w = D.WEAPONS && D.WEAPONS[id], p = D.SKILLS && D.SKILLS.PASSIVE_BY && D.SKILLS.PASSIVE_BY[id];
    return (w && w.name) || (p && (p.name || p.label)) || id;
  }
  /* what is really in force: only things still owned, only as many crests as there are slots */
  function loadout() {
    var s = stash(), e = s.eq, out = { crest: [], charm: null, use: null, scroll: null }, i, it;
    for (i = 0; i < e.crest.length && out.crest.length < slots(); i++) { it = byId(e.crest[i]); if (it && it.kind === "crest" && s.gear[it.id] && out.crest.indexOf(it.id) < 0) out.crest.push(it.id); }
    it = byId(e.charm); if (it && it.kind === "charm" && s.gear[it.id]) out.charm = it.id;
    it = byId(e.use); if (it && it.kind === "cons" && (s.cons[it.id] || 0) > 0) out.use = it.id;
    if (!out.use && e.scroll != null && s.scrolls[e.scroll]) out.scroll = s.scrolls[e.scroll].skill;
    return out;
  }
  function fxOn(key) {
    var l = loadout(), ids = l.crest.concat(l.charm ? [l.charm] : []), i, it;
    for (i = 0; i < ids.length; i++) { it = byId(ids[i]); if (it && it.fx && it.fx[key]) return it.fx[key]; }
    return 0;
  }
  function farmBonus() { return +fxOn("farm") || 0; }
  function summary() {
    var l = loadout(), n = [], i;
    for (i = 0; i < l.crest.length; i++) n.push(byId(l.crest[i]).name);
    if (l.charm) n.push(byId(l.charm).name);
    if (l.use) n.push(byId(l.use).name);
    if (l.scroll) n.push("Scroll: " + skillName(l.scroll));
    return n;
  }
  function count() { var s = stash(), n = 0, k; for (k in s.gear) if (s.gear[k]) n++; for (k in s.cons) n += s.cons[k] || 0; return n + s.scrolls.length; }

  /* ---------- finding things ---------- */
  function rollRarity() {
    var R = cfg().drop.rarity || {}, r = rnd();
    return r < (R.prismatic || 0) ? "prismatic" : r < (R.prismatic || 0) + (R.rare || 0) ? "rare" : "common";
  }
  /* one of that kind, at the rolled rarity (or the next one down if there is none) */
  function pick(kind) {
    var want = RANK[rollRarity()], L = cfg().list, pool, r;
    for (r = want; r >= 1; r--) { pool = L.filter(function (x) { return x.kind === kind && RANK[x.rarity] === r; }); if (pool.length) return pool[Math.floor(rnd() * pool.length)]; }
    return null;
  }
  /* put it in the stash; gear already owned becomes DigiBits. Returns what to tell the player. */
  function give(it, from) {
    var s = stash(), C = cfg(), note = { id: it.id, name: it.name, rarity: it.rarity, kind: it.kind, text: it.text, from: from || "" }, b;
    if (it.kind === "cons") s.cons[it.id] = Math.min(C.maxStack || 9, (s.cons[it.id] || 0) + 1);
    else if (s.gear[it.id]) {
      b = (C.dupeBits && C.dupeBits[it.rarity]) || 10; note.dupe = b;
      if (D.cosmetics && D.cosmetics.grantBits && (!D.cosmetics.ready || D.cosmetics.ready())) D.cosmetics.grantBits(b, "item");
    } else {
      s.gear[it.id] = Date.now();
      /* the first of its kind goes straight into the empty slot */
      if (it.kind === "charm" && !loadout().charm) s.eq.charm = it.id;
      if (it.kind === "crest" && loadout().crest.length < slots()) s.eq.crest = loadout().crest.concat([it.id]);
    }
    write();
    return note;
  }
  function giveScroll(skill, rival) {
    var s = stash(), C = cfg();
    if (!skill) return null;
    s.scrolls.push({ skill: skill, from: rival || "", at: Date.now() });
    while (s.scrolls.length > (C.maxScrolls || 12)) { s.scrolls.shift(); if (s.eq.scroll != null) s.eq.scroll = s.eq.scroll > 0 ? s.eq.scroll - 1 : null; }
    write();
    return { name: "Scroll: " + skillName(skill), rarity: "rare", kind: "scroll", text: "A skill " + (rival || "your rival") + " trained. A partner whose line has it learns it at once.", from: rival || "" };
  }
  function announce(run, note, x, y) {
    if (!note) return;
    if (run) (run._loot = run._loot || []).push(note);
    if (D.itemToast) D.itemToast((note.dupe ? note.name + " again: +" + note.dupe + " DigiBits" : "Found: " + note.name + (note.kind === "scroll" ? "" : " (" + (KIND[note.kind] || "item") + ")")) + ".  " + (note.dupe ? "" : note.text), note.rarity, x, y, note.name);
    if (D.audio) D.audio.sfx(note.rarity === "prismatic" ? "base" : "job");
  }
  /* game events: the drops, and the one-run items doing their thing */
  function onEvent(e, localId, run) {
    var Dr = cfg().drop, it, sk;
    if (!e || !D.ITEMS) return;
    if (e.type === "kill" && e.boss && e.killer === localId) {
      if (rnd() < (Dr.boss || 0)) { it = pick(rnd() < (Dr.bossCharm || 0.6) ? "charm" : "cons"); if (it) announce(run, give(it, "a boss"), e.x, e.y); }
    } else if (e.type === "lord.down" && e.id === localId) {
      if (rnd() < (Dr.lord || 0)) { it = pick("crest"); if (it) announce(run, give(it, "a biome lord"), e.x, e.y); }
    } else if (e.type === "rival.down" && (!e.by || e.by === localId)) {
      sk = e.skills || [];
      if (sk.length) announce(run, giveScroll(sk[Math.floor(rnd() * sk.length)], e.name), e.x, e.y);
      if (e.bait || rnd() < (Dr.rivalCons || 0)) { it = pick("cons"); if (it) announce(run, give(it, e.name), e.x, e.y); }
    } else if (e.type === "scroll.learned" && e.id === localId) {
      if (run) run._scrollUsed = true;
      if (D.itemToast) D.itemToast("The scroll takes: your partner knows " + skillName(e.skill) + (e.level > 1 ? " better (level " + e.level + ")." : " now."), "rare");
    } else if (e.type === "secondwind" && e.id === localId) {
      if (D.itemToast) D.itemToast("Second Wind! Your partner is back on its feet with half its health.", "prismatic", e.x, e.y, "Second Wind!");
      if (D.audio) D.audio.sfx("base");
    }
  }
  /* a run has ended: the one-run item is spent (a scroll only if it was learned) */
  function endRun(run) {
    var s = stash(), g = (run && run.gear) || null, hatch = (D.HATCH && D.HATCH.time) || 20, spent = null;
    if (g && (run.time || 0) > hatch) {
      if (g.use && (s.cons[g.use] || 0) > 0) { s.cons[g.use] -= 1; spent = byId(g.use).name; if (!s.cons[g.use]) { delete s.cons[g.use]; if (s.eq.use === g.use) s.eq.use = null; } }
      else if (g.scroll && run._scrollUsed && s.eq.scroll != null && s.scrolls[s.eq.scroll] && s.scrolls[s.eq.scroll].skill === g.scroll) { s.scrolls.splice(s.eq.scroll, 1); s.eq.scroll = null; spent = "the scroll"; }
      write();
    }
    return { loot: (run && run._loot) || [], spent: spent, kept: !!(g && g.scroll && !run._scrollUsed) };
  }

  /* ---------- the Items screen ---------- */
  function equip(kind, id) {
    var s = stash(), e = s.eq, cur, i;
    if (kind === "crest") {
      cur = loadout().crest; i = cur.indexOf(id);
      if (i >= 0) cur.splice(i, 1); else { if (cur.length >= slots()) cur.shift(); cur.push(id); }
      e.crest = cur;
    } else if (kind === "charm") e.charm = e.charm === id ? null : id;
    else if (kind === "cons") { e.use = e.use === id ? null : id; if (e.use) e.scroll = null; }
    else if (kind === "scroll") { e.scroll = e.scroll === id ? null : id; if (e.scroll != null) e.use = null; }
    write();
    if (D.profile && D.profile.touch) D.profile.touch();
  }
  function card(it, owned, on, n, kind, key) {
    var locked = !owned;
    return "<button type='button' class='item-card is-" + it.rarity + (on ? " is-on" : "") + (locked ? " is-locked" : "") + "' data-kind='" + kind + "' data-key='" + esc(key) + "'" + (locked ? " disabled" : "") + ">" +
      "<i class='item-ico is-" + kind + "'></i><span><b>" + esc(locked ? "???" : it.name) + (n > 1 ? " <em>×" + n + "</em>" : "") + "</b><small>" + esc(locked ? it.rarity.charAt(0).toUpperCase() + it.rarity.slice(1) + ". Not found yet." : it.text) + "</small></span>" +
      "<u>" + (locked ? "" : on ? (kind === "cons" || kind === "scroll" ? "PACKED" : "ON") : (kind === "cons" || kind === "scroll" ? "Pack" : "Equip")) + "</u></button>";
  }
  function render(box) {
    var s = stash(), l = loadout(), L = cfg().list, h, i, it, n = slots(), any;
    h = "<div class='profile-box is-wide items-box'><button type='button' class='profile-x' id='items-x' aria-label='Close'>&times;</button>" +
      "<h2>Items</h2><p class='profile-lead'>Rare drops you keep. Bosses drop Charms and one-run items, biome lords drop Crest Pieces, a beaten rival leaves a scroll.</p>" +
      "<div class='items-now'><b>This run:</b> " + (summary().length ? esc(summary().join("  ·  ")) : "nothing equipped") + "</div>" +
      "<h3>Digivice: Crest Pieces <small>" + l.crest.length + " / " + n + " slot" + (n > 1 ? "s" : "") + (n < 2 ? "  ·  the Lab's Digivice Port adds a second" : "") + "</small></h3><div class='item-grid'>";
    for (i = 0; i < L.length; i++) { it = L[i]; if (it.kind === "crest") h += card(it, !!s.gear[it.id], l.crest.indexOf(it.id) >= 0, 1, "crest", it.id); }
    h += "</div><h3>Partner: Charm <small>" + (l.charm ? 1 : 0) + " / 1 slot</small></h3><div class='item-grid'>";
    for (i = 0; i < L.length; i++) { it = L[i]; if (it.kind === "charm") h += card(it, !!s.gear[it.id], l.charm === it.id, 1, "charm", it.id); }
    h += "</div><h3>One-run item <small>one per run, used up by it</small></h3><div class='item-grid'>";
    for (i = 0; i < L.length; i++) { it = L[i]; if (it.kind === "cons") h += card(it, (s.cons[it.id] || 0) > 0, l.use === it.id, s.cons[it.id] || 0, "cons", it.id); }
    for (i = 0; i < s.scrolls.length; i++) {
      h += card({ name: "Scroll: " + skillName(s.scrolls[i].skill), rarity: "rare", text: "Learned from " + (s.scrolls[i].from || "a rival") + ". A partner whose line has this skill learns it at once; if none does, you keep the scroll." }, true, !l.use && s.eq.scroll === i, 1, "scroll", String(i));
    }
    h += "</div></div>";
    box.innerHTML = h;
    $("items-x").addEventListener("click", function () { close(box); });
  }
  function close(box) { if (box.parentNode) box.parentNode.removeChild(box); if (box._key) document.removeEventListener("keydown", box._key, true); if (D.hub && D.hub.refresh) D.hub.refresh(); if (D.hub && D.hub.setupRefresh) D.hub.setupRefresh(); }
  function open() {
    var old = $("items-panel"), box;
    if (old) old.parentNode.removeChild(old);
    box = document.createElement("div"); box.className = "profile-overlay"; box.id = "items-panel";
    ($("app") || document.body).appendChild(box);
    render(box);
    box.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest(".item-card") : null, k, sc;
      if (e.target === box) { close(box); return; }
      if (!t || t.disabled) return;
      k = t.getAttribute("data-kind"); sc = box.querySelector(".items-box").scrollTop;
      equip(k, k === "scroll" ? +t.getAttribute("data-key") : t.getAttribute("data-key"));
      if (D.uiSfx) D.uiSfx("ui");
      render(box); box.querySelector(".items-box").scrollTop = sc; box.scrollTop = box._st || box.scrollTop;
    });
    box._key = function (e) { if (e.key === "Escape") { close(box); e.preventDefault(); e.stopPropagation(); } };
    document.addEventListener("keydown", box._key, true);
  }

  D.items = { byId: byId, stash: stash, slots: slots, loadout: loadout, fxOn: fxOn, farmBonus: farmBonus, summary: summary, count: count, pick: pick, give: give, giveScroll: giveScroll,
    onEvent: onEvent, endRun: endRun, equip: equip, open: open, skillName: skillName, _rnd: function (f) { rnd = f; } };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
