/* Digi Night — pick your Digi Egg from a grid (17z33).
 *
 * A friend who didn't know Digimon couldn't tell what the egg picker was. This shows every egg at once:
 *   - a scrolling grid, five across (three on a phone)
 *   - an egg you have opened: the egg with the baby that hatches from it beside it, its name, what
 *     it grows into, and a few of the signature moves it learns
 *   - an egg you haven't: a silhouette, "???", and how to open it
 *   - hover one (or tap it once on a touch screen) and a card pops up with the whole line and every
 *     digivolution path you've reached with that egg: Botamon > Koromon > Agumon > Greymon, ...
 *     (from your save's discoveries, rarity.js noteDiscovery)
 *   - click it (tap again) to take it; arrow keys / Enter / Esc work too
 * D.eggGrid.open({ onPick: fn(id) }) from the run setup (hub.js) and the online lobby (online-ui.js).
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});
  if (typeof document === "undefined") return;
  var ov = null, grid = null, pop = null, cards = [], hoverId = null, armedId = null, focusI = 0, opts = null, raf = 0, lastAll = 0, popFor = null;
  function M() { return D.menu || null; }
  function S() { return D.sprites || null; }
  function sp(id) { return (D.SPECIES && D.SPECIES[id]) || null; }
  function nm(id) { var s = sp(id); return (s && s.name) || (id ? id.charAt(0).toUpperCase() + id.slice(1) : "?"); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function sfx() { try { if (D.uiSfx) D.uiSfx("ui"); } catch (e) {} }
  var FAMW = { fire: "fire", ice: "ice and frost", water: "water", dark: "darkness", holy: "holy light", machine: "machines and metal", nature: "plants", slime: "goo", wind: "wind", beast: "claws and strength", data: "raw data" };

  /* what an egg is: its stages, its move line, its signature moves */
  function lineOfEgg(e) {
    var L = (D.LINES && D.LINES[e.id]) || null, ML = D.MOVE_LINES || {}, k, key = null, probe = L ? L.rookie : e.hatch;
    for (k in ML) if (ML[k].match && (ML[k].match.test(probe) || ML[k].match.test(e.hatch || ""))) { key = k; break; }
    return { L: L, key: key, ml: key ? ML[key] : null };
  }
  function movesOf(info) {
    var I = D.SIG_INFO || {}, W = D.WEAPONS || {}, out = [], id;
    if (!info.key) return out;
    for (id in I) if (I[id].line === info.key && W[id]) out.push({ id: id, name: W[id].name, tier: I[id].tier, role: I[id].role });
    out.sort(function (a, b) { return a.tier - b.tier || a.role - b.role; });
    return out;
  }
  /* how it plays, in one line: its element, then what its signature moves mostly do (not what it
   * turns into: the pictures of the paths already show that) */
  var ELEM = { fire: "Fire", ice: "Ice", water: "Water", dark: "Dark", holy: "Holy", machine: "Machine", nature: "Plant", slime: "Goo", wind: "Wind", beast: "Beast", data: "Data" };
  var ELEM_LINE = { tentomon: "Electric", gotsumon: "Rock", wormmon: "Bug", armadillomon: "Earth", biyomon: "Fire and wind", keramon: "Virus", terriermon: "Machine guns" };
  var DOES = { projectile: "sprays shots", burst: "knocks back crowds", beam: "charges through lines of enemies", strike: "drops attacks from above",
    mine: "lays traps", chain: "zaps from enemy to enemy", boomerang: "throws blades that come back" };
  var CLOSE = { burst: 1, beam: 1 };
  function style(info) {
    var I = D.SIG_INFO || {}, W = D.WEAPONS || {}, n = {}, id, k, top, close = 0, all = 0, fam = info.ml && info.ml.family;
    for (id in I) if (I[id].line === info.key && W[id]) { k = W[id].type; n[k] = (n[k] || 0) + 1; all++; if (CLOSE[k]) close++; }
    top = Object.keys(n).sort(function (a, b) { return n[b] - n[a]; }).slice(0, 2);
    return { elem: ELEM_LINE[info.key] || ELEM[fam] || "", range: !all ? "" : (close / all >= 0.38 ? "up close" : (close / all <= 0.28 ? "from range" : "close and far")), does: top.map(function (x) { return DOES[x]; }) };
  }
  function describe(e, info) {
    var st = style(info);
    if (!st.does.length) return "";
    return (st.elem ? st.elem + ". " : "") + "Fights " + st.range + ": " + st.does.join(" and ") + ".";
  }
  function shortStyle(info) { var st = style(info); return [st.elem, st.range].filter(Boolean).join(" \u00b7 "); }
  /* every digivolution path you've reached from this egg's baby */
  function pathsOf(e, info) {
    var m = M(), disc = m && m.discoveries ? m.discoveries() : { edges: {}, species: {} }, adj = {}, k, a, b, start = (info.L && info.L.baby) || e.hatch, out = [];
    for (k in disc.edges || {}) { a = k.split(">"); if (a.length < 2) continue; b = a[1].split(":")[0]; (adj[a[0]] = adj[a[0]] || []).indexOf(b) < 0 && adj[a[0]].push(b); }
    (function walk(id, path, seen) {
      var nx = (adj[id] || []).filter(function (x) { return !seen[x]; }), i;
      if (!nx.length) { if (path.length > 1) out.push(path); return; }
      for (i = 0; i < nx.length; i++) { seen[nx[i]] = 1; walk(nx[i], path.concat(nx[i]), seen); delete seen[nx[i]]; }
    })(start, [start], (function () { var o = {}; o[start] = 1; return o; })());
    out.sort(function (x, y) { return y.length - x.length; });
    return out;
  }

  /* ---------- drawing ---------- */
  /* draw a Digimon (or egg) on a scratch canvas, then fit what was drawn into a box: big Champions
   * and tiny babies come out the same size; a silhouette is the same drawing filled in dark */
  var scratch = null;
  function fit(c, x, y, w, h, drawFn, sil, maxK) {
    if (!scratch) { scratch = document.createElement("canvas"); scratch.width = 260; scratch.height = 260; }
    var g = scratch.getContext("2d"), d, i, x0 = 260, y0 = 260, x1 = -1, y1 = -1, px, py, k;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.clearRect(0, 0, 260, 260); g.imageSmoothingEnabled = false;
    g.save(); g.translate(130, 236); try { drawFn(g); } catch (e) {} g.restore();
    d = g.getImageData(0, 0, 260, 260).data;
    for (i = 3; i < d.length; i += 4) if (d[i] > 40) { px = ((i - 3) >> 2) % 260; py = ((i - 3) >> 2) / 260 | 0; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; }
    if (x1 < 0) return;
    if (sil) { g.globalCompositeOperation = "source-atop"; g.fillStyle = sil; g.fillRect(0, 0, 260, 260); g.globalCompositeOperation = "source-over"; }
    k = Math.min(w / (x1 - x0 + 1), h / (y1 - y0 + 1), maxK || 3);
    k = k >= 1 ? Math.floor(k * 2) / 2 : k;
    c.save(); c.imageSmoothingEnabled = false;
    c.drawImage(scratch, x0, y0, x1 - x0 + 1, y1 - y0 + 1, Math.round(x + (w - (x1 - x0 + 1) * k) / 2), Math.round(y + h - (y1 - y0 + 1) * k), Math.round((x1 - x0 + 1) * k), Math.round((y1 - y0 + 1) * k));
    c.restore();
  }
  function drawCard(cv, e, t, live) {
    var c = cv.getContext("2d"), W = cv.width, H = cv.height, s = S(), info = e.info, L = info.L, tt = live ? t : 0;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H); c.imageSmoothingEnabled = false;
    c.fillStyle = e.locked ? "rgba(40,60,100,0.18)" : "rgba(255,210,58,0.12)"; c.beginPath(); c.ellipse(W / 2, H - 12, W * 0.42, 9, 0, 0, 7); c.fill();
    if (!s) return;
    if (e.hatchery) { fit(c, W * 0.2, 6, W * 0.6, H - 16, function (g) { s.drawPartner(g, e.form, 0, 0, 1, 1, tt, false, false, false); }, null, 3); return; }
    /* the egg on the left, the baby it hatches into on the right */
    fit(c, 14, 10, W * 0.42, H - 20, function (g) { s.drawEgg(g, e.frame, 0, 0, tt, false, false, e.random ? Math.floor(t / 0.55) * 3 : undefined); }, e.locked ? "#2b3960" : null, 3);
    if (e.random) { if (D.px && D.px.drawText) D.px.drawText(c, "?", W * 0.66, H * 0.22, 6, "#ffd23a"); return; }
    if (L && L.baby) fit(c, W * 0.54, 22, W * 0.4, H - 34, function (g) { s.drawPartner(g, L.baby, 0, 0, -1, 1, tt, false, false, false); }, e.locked ? "#2b3960" : null, 2.5);
    if (e.locked && D.px && D.px.drawText) D.px.drawText(c, "?", W * 0.44, 8, 4, "#6f84aa");
  }
  var chips = [];
  function paintChip(cv, id, seen) {
    var s = S(), c = cv.getContext("2d");
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); c.imageSmoothingEnabled = false;
    fit(c, 3, 2, 50, 48, function (g) { s.drawPartner(g, id, 0, 0, 1, 1, 0, false, false, false); }, seen ? null : "#1a2840", 2);
  }
  function chipCanvas(id, seen) {
    var cv = document.createElement("canvas");
    cv.width = 56; cv.height = 52; cv.className = "eg-chip-cv";
    load(id); paintChip(cv, id, seen); chips.push({ cv: cv, id: id, seen: seen });
    return cv;
  }
  /* a Digimon's sprite sheet loads the first time it's drawn; a silhouette alone doesn't ask for it */
  function load(id) { try { if (id && S() && S().loadAtlas) S().loadAtlas(id); } catch (e) {} }

  /* ---------- the pop-up: the whole line and the paths you've reached ---------- */
  function showPop(e, card) {
    if (!pop) return;
    if (popFor === e.id && !pop.hidden) { place(card); return; }
    popFor = e.id;
    var h = "", info = e.info, mv = e.moves, paths, i, j;
    if (e.random) h = "<b class='eg-pt'>Random egg</b><p>A surprise: any egg in the game, even ones you haven't opened yet.</p>";
    else if (e.hatchery) h = "<b class='eg-pt'>" + esc(e.name) + "</b><p>" + esc(e.blurb) + "</p>";
    else if (e.locked) h = "<b class='eg-pt'>??? Egg</b><p>Not opened yet. Raise one to Rookie in the Hatchery (on the title screen) to open this egg for good.</p>";
    else {
      h = "<b class='eg-pt'>" + esc(e.name) + "</b><p>" + esc(e.desc) + "</p>";
      if (mv.length) h += "<div class='eg-plab'>Signature moves it learns</div><div class='eg-moves'>" + mv.slice(0, 8).map(function (x) { return "<span>" + esc(x.name) + "</span>"; }).join("") + (mv.length > 8 ? "<span class='eg-more'>+" + (mv.length - 8) + " more</span>" : "") + "</div>";
      h += "<div class='eg-plab'>Digivolutions you've reached with this egg</div><div class='eg-paths' id='eg-paths'></div>";
    }
    pop.innerHTML = h; pop.hidden = false; chips = [];
    var box = pop.querySelector("#eg-paths"), disc = M() && M().discoveries ? M().discoveries() : { species: {} };
    if (box) {
      paths = pathsOf(e, info);
      if (!paths.length) box.innerHTML = "<p class='eg-none'>None yet. Hatch it and help it grow: every path you take shows up here.</p>";
      for (i = 0; i < Math.min(6, paths.length); i++) {
        var row = document.createElement("div"); row.className = "eg-path";
        for (j = 0; j < paths[i].length; j++) {
          if (j) { var ar = document.createElement("span"); ar.className = "eg-ar"; ar.textContent = "›"; row.appendChild(ar); }
          var ch = document.createElement("span"); ch.className = "eg-chip"; ch.appendChild(chipCanvas(paths[i][j], true));
          var lb = document.createElement("small"); lb.textContent = nm(paths[i][j]); ch.appendChild(lb); row.appendChild(ch);
        }
        box.appendChild(row);
      }
      if (paths.length > 6) { var more = document.createElement("p"); more.className = "eg-none"; more.textContent = "…and " + (paths.length - 6) + " more paths."; box.appendChild(more); }
    }
    place(card);
  }
  function place(card) {
    if (!pop || !card) return;
    var r = card.getBoundingClientRect(), pw = pop.offsetWidth || 340, ph = pop.offsetHeight || 200, vw = window.innerWidth, vh = window.innerHeight, x, y;
    x = r.right + 10; if (x + pw > vw - 8) x = r.left - pw - 10; if (x < 8) x = Math.max(8, Math.min(vw - pw - 8, r.left + r.width / 2 - pw / 2));
    y = r.top; if (y + ph > vh - 8) y = vh - ph - 8; if (y < 8) y = 8;
    if (x === Math.max(8, Math.min(vw - pw - 8, r.left + r.width / 2 - pw / 2))) { y = r.bottom + 8; if (y + ph > vh - 8) y = Math.max(8, r.top - ph - 8); }
    pop.style.left = Math.round(x) + "px"; pop.style.top = Math.round(y) + "px";
  }
  function hidePop() { if (pop) pop.hidden = true; popFor = null; }

  /* ---------- the grid ---------- */
  function build() {
    if (ov) return;
    ov = document.createElement("div"); ov.id = "egg-grid"; ov.hidden = true;
    ov.innerHTML = "<div class='eg-panel' role='dialog' aria-label='Pick your Digi Egg'>" +
      "<div class='eg-top'><h2>Pick your Digi Egg</h2><p>Each egg hatches into a baby Digimon that grows up as you play. " + (window.matchMedia && window.matchMedia("(hover: none)").matches ? "Tap an egg to see how it plays and what you have raised with it; tap again to take it." : "Hover over an egg to see how it plays and what you have raised with it; click to take it.") + "</p><button type='button' class='eg-x' aria-label='Close'>✕</button></div>" +
      "<div class='eg-scroll'><div class='eg-grid'></div></div><div class='eg-foot'><span class='eg-count'></span></div></div><div class='eg-pop' hidden></div>";
    (document.getElementById("app") || document.body).appendChild(ov);
    grid = ov.querySelector(".eg-grid"); pop = ov.querySelector(".eg-pop");
    ov.querySelector(".eg-x").addEventListener("click", close);
    ov.addEventListener("pointerdown", function (ev) { if (ev.target === ov) close(); });
    ov.querySelector(".eg-scroll").addEventListener("scroll", function () { hidePop(); armedId = null; });
    document.addEventListener("keydown", function (ev) {
      if (!ov || ov.hidden) return;
      var cols = window.innerWidth < 620 ? 3 : 5, d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[ev.key];
      if (ev.key === "Escape") { close(); ev.preventDefault(); ev.stopPropagation(); return; }
      if (d) { focusI = Math.max(0, Math.min(cards.length - 1, focusI + d)); cards[focusI].el.focus(); ev.preventDefault(); ev.stopPropagation(); return; }
      if (ev.key === "Enter" && cards[focusI]) { choose(cards[focusI].e); ev.preventDefault(); ev.stopPropagation(); }
    }, true);
  }
  function fill() {
    var m = M(), l = m && m.eggs ? m.eggs() : [], cur = m && m.egg ? m.egg() : null, open = 0;
    if (opts && opts.noHatchery) l = l.filter(function (e) { return !e.hatchery; });
    grid.innerHTML = ""; cards = [];
    /* opened eggs first, then the hatchery partner and random, then the locked ones */
    l = l.slice().sort(function (a, b) { var ra = a.locked ? 2 : (a.random || a.hatchery ? 1 : 0), rb = b.locked ? 2 : (b.random || b.hatchery ? 1 : 0); return ra - rb; });
    l.forEach(function (e, i) {
      var info = lineOfEgg(e), el = document.createElement("button"), cv = document.createElement("canvas"), mv = movesOf(info), L = info.L, sub;
      e.info = info; e.moves = mv; e.desc = describe(e, info);
      if (L) { load(L.baby); load(L.rookie); }
      if (!e.locked && !e.random && !e.hatchery) open++;
      el.type = "button"; el.className = "eg-card" + (e.locked ? " is-locked" : "") + (e.id === cur ? " is-on" : "") + (e.random ? " is-random" : "") + (e.hatchery ? " is-hatchery" : "");
      cv.width = 160; cv.height = 96; el.appendChild(cv);
      sub = e.locked ? "Not opened yet" : e.random ? "Any egg, a surprise" : e.hatchery ? "Your Hatchery partner" : (shortStyle(info) || "");
      el.insertAdjacentHTML("beforeend", "<b class='eg-name'>" + esc(e.locked ? "???" : e.random ? "Random egg" : e.name) + "</b><span class='eg-sub'>" + esc(sub) + "</span>" +
        (!e.locked && mv.length ? "<span class='eg-tags'>" + mv.slice(0, 2).map(function (x) { return "<i>" + esc(x.name) + "</i>"; }).join("") + "</span>" : "") +
        (e.locked ? "<span class='eg-lock'>🔒</span>" : ""));
      el.addEventListener("pointerenter", function (ev) { if (ev.pointerType === "touch") return; hoverId = e.id; focusI = i; showPop(e, el); });
      el.addEventListener("pointerleave", function (ev) { if (ev.pointerType === "touch") return; if (hoverId === e.id) { hoverId = null; hidePop(); } });
      el.addEventListener("focus", function () { focusI = i; hoverId = e.id; showPop(e, el); });
      el.addEventListener("click", function (ev) {
        /* a touch screen has no hover: the first tap shows what it is, the second takes it */
        if (ev.pointerType === "touch" || (ev.detail && el.__touched)) { if (armedId !== e.id) { armedId = e.id; hoverId = e.id; showPop(e, el); sfx(); return; } }
        choose(e);
      });
      el.addEventListener("pointerdown", function (ev) { el.__touched = ev.pointerType === "touch"; });
      grid.appendChild(el);
      cards.push({ e: e, el: el, cv: cv });
      drawCard(cv, e, 0, false);
    });
    ov.querySelector(".eg-count").textContent = open + " of " + (D.EGGS || []).length + " eggs opened. Open more in the Hatchery.";
  }
  function choose(e) {
    if (e.locked) { sfx(); showPop(e, (cards.filter(function (c) { return c.e === e; })[0] || {}).el); return; }
    var m = M();
    if (m && m.setEgg) m.setEgg(e.id);
    if (!e.random && !e.hatchery && D.sprites && D.sprites.rollEggPattern) D.sprites.rollEggPattern(e.frame);
    sfx();
    var cb = opts && opts.onPick;
    close();
    if (cb) cb(e.id);
  }
  function loop(now) {
    if (!ov || ov.hidden) { raf = 0; return; }
    var t = now / 1000, i, c;
    for (i = 0; i < cards.length; i++) {
      c = cards[i];
      if (c.e.id === hoverId || c.e.id === armedId || c.el.classList.contains("is-on")) drawCard(c.cv, c.e, t, true);
      else if (now - lastAll > 700) drawCard(c.cv, c.e, 0, false);   /* sprite sheets still loading: draw again now and then */
    }
    if (now - lastAll > 700) { lastAll = now; if (pop && !pop.hidden) chips.forEach(function (ch) { paintChip(ch.cv, ch.id, ch.seen); }); }
    raf = requestAnimationFrame(loop);
  }
  function open(o) {
    opts = o || {};
    build(); fill();
    ov.hidden = false; hoverId = null; armedId = null; hidePop();
    var on = cards.filter(function (c) { return c.el.classList.contains("is-on"); })[0];
    focusI = on ? cards.indexOf(on) : 0;
    setTimeout(function () { if (on) on.el.scrollIntoView({ block: "nearest" }); }, 0);
    if (!raf) raf = requestAnimationFrame(loop);
    sfx();
  }
  function close() { if (!ov) return; ov.hidden = true; hidePop(); if (opts && opts.onClose) opts.onClose(); }

  D.eggGrid = { open: open, close: close, isOpen: function () { return !!(ov && !ov.hidden); }, _paths: pathsOf, _line: lineOfEgg, _describe: describe };
})(typeof window !== "undefined" ? window : this);
