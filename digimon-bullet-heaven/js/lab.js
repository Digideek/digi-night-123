/* Digi Night — the Lab. DigiBits (js/cosmetics.js) buy small permanent boosts
 * (data.js LAB). Levels are kept on the profile; a run reads them once when the
 * tamer joins (mission-sim.js _lab), so a purchase applies from the next run. */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});
  function $(id) { return document.getElementById(id); }
  function cfg() { return D.LAB || { cost: [], list: [] }; }
  function store() { return (D.profile && D.profile.lab) ? D.profile.lab() : {}; }
  function def(id) { var L = cfg().list, i; for (i = 0; i < L.length; i++) if (L[i].id === id) return L[i]; return null; }
  function costs(id) { var u = def(id); return (u && u.costs) || cfg().cost; }
  function level(id) { return Math.max(0, Math.min(costs(id).length, Math.floor(+store()[id] || 0))); }
  function levels() { var o = {}, L = cfg().list, i, n; for (i = 0; i < L.length; i++) { n = level(L[i].id); if (n) o[L[i].id] = n; } return o; }
  function cost(id) { var n = level(id), c = costs(id); return n >= c.length ? null : c[n]; }
  function bits() { return D.cosmetics && D.cosmetics.bits ? D.cosmetics.bits() : 0; }
  function mods() {
    var m = { hp: 1, dmg: 1, magnet: 1, xp: 1, bits: 1, farm: 0, burst: 1, speed: 1, bxp: 1, data: 1, crop: 1, belly: 1 }, L = cfg().list, i, n;
    for (i = 0; i < L.length; i++) { n = level(L[i].id); if (!n) continue; if (L[i].stat === "farm") m.farm += L[i].per * n; else if (m[L[i].stat] != null) m[L[i].stat] *= 1 + L[i].per * n; }
    return m;
  }
  function canBuyAny() { var L = cfg().list, i, c, b = bits(); for (i = 0; i < L.length; i++) { c = cost(L[i].id); if (c != null && c <= b) return true; } return false; }
  function buy(id) {
    var c = cost(id), s;
    if (c == null) return { ok: false, reason: "max" };
    if (!D.cosmetics || !D.cosmetics.ready || !D.cosmetics.ready()) return { ok: false, reason: "wait" };
    if (bits() < c) return { ok: false, reason: "broke", need: c - bits() };
    if (!D.profile || !D.profile.exists()) return { ok: false, reason: "profile" };
    D.cosmetics.grantBits(-c, "lab");
    s = store(); s[id] = level(id) + 1; D.profile.save();
    return { ok: true, level: s[id] };
  }
  function amount(u, n) { return u.unit === "slot" ? (1 + n) + " slot" + (n ? "s" : "") : u.unit === "s" ? "+" + Math.round(u.per * n) + " s" : "+" + (Math.round(u.per * n * 1000) / 10) + "%"; }

  /* a little pixel icon per upgrade, drawn once */
  var ICON = {
    vital: ["..rr.rr..", ".rRRrRRr.", ".rRRRRRr.", ".rRRRRRr.", "..rRRRr..", "...rRr...", "....r...."],
    power: ["......yY.", ".....yY..", "....yY...", "y..yY....", ".yyY.....", ".yYy.....", "y..y....."],
    scan: ["..ccccc..", ".c.....c.", "c..cCc..c", "c..CCC..c", "c..cCc..c", ".c.....c.", "..ccccc.."],
    study: ["bbbb.bbbb", "bBBBbBBBb", "bBBBbBBBb", "bBBBbBBBb", "bBBBbBBBb", "bbbbbbbbb", "....b...."],
    farm: ["....g....", "...gGg...", "..gGGGg..", ".gGGGGGg.", "..wWWWw..", "..wWdWw..", "..wWdWw.."],
    bits: ["..ooooo..", ".oOOOOOo.", "oOOoOoOOo", "oOOoooOOo", "oOOoOoOOo", ".oOOOOOo.", "..ooooo.."],
    warp: ["....yY...", "...yY....", "..yYYYY..", "....yY...", "...yY....", "..yY.....", ".y......."],
    swift: ["cc...cCC.", "....cCCC.", "ccc.CCCC.", "...cCCCCC", "ccc.CCCC.", "....cCCC.", "cc...cCC."],
    notes: [".bbbbbbb.", ".bBBBBBb.", ".bBbbbBb.", ".bBBBBBb.", ".bBbbBBb.", ".bBBBBBb.", ".bbbbbbb."],
    tap: ["...cCc...", "..cCCCc..", ".cCCCCCc.", ".cCCoCCc.", ".cCCCCCc.", "..cCCCc..", "...ccc..."],
    thumb: ["...gG....", "..gGGg.gG", "...gGGgGg", "....gGg..", "....wW...", "...wWWw..", "..wWWWWw."],
    belly: ["..wwww...", ".wRRRRw..", "wRRRRRRw.", "wRRRRRRwW", ".wRRRRwWW", "..wwwwWW.", "......W.."]
  };
  var PAL = { r: "#b3243c", R: "#ff5a6e", y: "#c98a10", Y: "#ffd23a", c: "#2585ac", C: "#7cf0ff", b: "#3a4670", B: "#d9e4ff", g: "#2f8a3e", G: "#7be07a", w: "#8a5a2c", W: "#e0b070", d: "#3a2408", o: "#c98a10", O: "#ffd23a" };
  function icon(cv, id) {
    var rows = ICON[id] || ICON.bits, c = cv.getContext("2d"), s = Math.floor(cv.width / 9), x, y, ch, oy = Math.floor((cv.height - rows.length * s) / 2);
    c.clearRect(0, 0, cv.width, cv.height);
    for (y = 0; y < rows.length; y++) for (x = 0; x < 9; x++) { ch = rows[y].charAt(x); if (PAL[ch]) { c.fillStyle = PAL[ch]; c.fillRect(x * s, oy + y * s, s, s); } }
  }

  function render(flashId) {
    var grid = $("lab-grid"), L = cfg().list, C = cfg().cost, b = bits(), h = "", i, j, u, n, c, cards, can;
    if (!grid) return;
    if ($("lab-bits")) $("lab-bits").textContent = String(b);
    for (i = 0; i < L.length; i++) {
      u = L[i]; n = level(u.id); c = cost(u.id); can = c != null && c <= b;
      h += "<div class='lab-card" + (c == null ? " is-max" : "") + (flashId === u.id ? " is-got" : "") + "' data-lab='" + u.id + "'><canvas width='54' height='54' class='lab-ico'></canvas>" +
        "<div class='lab-mid'><b>" + u.name + "</b><span>" + u.text + "</span><div class='lab-pips'>";
      for (j = 0; j < costs(u.id).length; j++) h += "<i" + (j < n ? " class='on'" : "") + "></i>";
      h += "</div><small>" + (n || u.unit === "slot" ? "Now " + amount(u, n) : "Not started") + (c != null ? "  →  " + amount(u, n + 1) : "  ·  maxed") + "</small></div>" +
        "<button type='button' class='btn lab-buy" + (can ? " is-can" : "") + "' data-buy='" + u.id + "'" + (c == null ? " disabled" : "") + ">" + (c == null ? "MAX" : c + " DigiBits") + "</button></div>";
    }
    grid.innerHTML = h;
    cards = grid.querySelectorAll(".lab-card");
    for (i = 0; i < cards.length; i++) icon(cards[i].querySelector("canvas"), cards[i].getAttribute("data-lab"));
    if ($("lab-foot")) $("lab-foot").textContent = "Every finished run pays DigiBits, and each new Tamer Rank pays more. Boosts apply from your next run.";
  }
  function onClick(e) {
    var t = e.target.closest ? e.target.closest("[data-buy]") : null, r;
    if (!t) return;
    r = buy(t.getAttribute("data-buy"));
    if (r.ok) { if (D.audio) D.audio.sfx("job"); render(t.getAttribute("data-buy")); if (D.hub) D.hub.refresh(); if (D.menu && D.menu.focus) D.menu.focus(); }
    else {
      if (D.uiSfx) D.uiSfx("ui");
      t.classList.remove("is-no"); void t.offsetWidth; t.classList.add("is-no");
      if ($("lab-foot")) $("lab-foot").textContent = r.reason === "broke" ? "You need " + r.need + " more DigiBits for that." : r.reason === "max" ? "That one is as far as it goes." : "Not ready yet, try again in a moment.";
    }
  }
  function init() {
    var g = $("lab-grid"), back = $("btn-lab-back");
    if (g) g.addEventListener("click", onClick);
    if (back) back.addEventListener("click", function () { if (D.uiSfx) D.uiSfx("ui"); if (D.menu) D.menu.go("title"); });
    if (D.px && D.px.stamp && $("lab-screen")) D.px.stamp($("lab-screen"));
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && D.getState && D.getState() === "lab" && D.menu) { D.menu.go("title"); e.preventDefault(); } });
  }
  D.lab = { level: level, levels: levels, cost: cost, buy: buy, mods: mods, canBuyAny: canBuyAny, render: render };
  if (typeof document !== "undefined") { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init(); }
})(typeof window !== "undefined" ? window : this);
