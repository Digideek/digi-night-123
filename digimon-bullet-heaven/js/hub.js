/* Digi Night — the menus after the opening page (Nov 17).
 *
 *   the hub       your profile, the four modes as big tiles (Story,
 *                 Survival, Night Siege, Versus; 17z33), a smaller row
 *                 under them (Hatchery, Eggs, Discoveries, Online), the
 *                 last word on your rival, and the smallest doors
 *                 (DigiBank, Cabinet, How to Play...). It sits on the
 *                 title screen, over the same living sky.
 *   run setup     one screen where there used to be two: your projection,
 *                 your Digi Egg and who is coming, as three cards you flip
 *                 through, a strip showing the pair walking, and Start.
 *
 * Nothing here decides anything. Every tile presses the button the old
 * menu had (they are still in the page, out of sight), and the choices are
 * the game's own, read and set through DBH.menu (game.js).
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});
  if (typeof document === "undefined") return;
  function $(id) { return document.getElementById(id); }
  function M() { return D.menu || null; }
  function press(id) { var b = $(id); if (b) b.click(); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmt(sec) { sec = Math.max(0, Math.floor(sec || 0)); var m = Math.floor(sec / 60), s = sec % 60; return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s; }
  function spName(id) { return (D.SPECIES && D.SPECIES[id] && D.SPECIES[id].name) || id || "partner"; }
  function stamp(root) { if (D.px && D.px.stamp) D.px.stamp(root || document); }
  function ctxOf(id) { var c = $(id), x; if (!c) return null; x = c.getContext("2d"); x.imageSmoothingEnabled = false; x.clearRect(0, 0, c.width, c.height); return x; }
  function px(el, text) { if (el && el.getAttribute("data-px") !== text) { el.setAttribute("data-px", text); el.removeAttribute("aria-label"); stamp(el.parentNode); } }

  var built = false, t = 0, frame = 0, eggView = null, slide = { tamer: 0, egg: 0 };

  /* ------------------------------ the hub ------------------------------ */
  /* ---------- the four modes (17z33) ---------- */
  var MAIN_ART = { story: "#7cf0c0", survival: "#ffd23a", siege: "#9a8cff", versus: "#ff6a5a" };
  function mains() { return (D.MODES && D.MODES.main) || []; }
  function groupOf(id) { var l = (D.MODES && D.MODES.list) || [], i; for (i = 0; i < l.length; i++) if (l[i].id === id) return l[i].group || id; return "survival"; }
  function modeTiles() {
    return mains().map(function (m) {
      return '<button type="button" class="btn hub-tile is-mode is-' + m.id + '" id="hub-m-' + m.id + '" data-main="' + m.id + '" style="--mc:' + MAIN_ART[m.id] + '">' +
        '<span class="hub-tag">' + esc(m.tag) + '</span><canvas class="hub-art" id="hub-art-' + m.id + '" width="260" height="200"></canvas>' +
        '<span class="hub-ttl" data-px="' + esc(m.name.toUpperCase()) + '"></span><span class="hub-cap">' + esc(m.blurb) + '</span></button>';
    }).join("");
  }
  /* a mode picked from the menu: Survival keeps whichever of its rules you last played; Versus is hosted */
  function pickMain(id) {
    var m = M(); if (!m) return;
    if (D.uiSfx) D.uiSfx("ui");
    if (id === "survival") m.setMode(groupOf(m.mode()) === "survival" ? m.mode() : "open");
    else m.setMode(id);
    if (id === "versus") { press("btn-online-host"); return; }
    press("btn-start");
  }
  function buildHub() {
    var panel = $("title-panel"), hub, foot;
    if (!panel || $("hub")) return;
    hub = document.createElement("div");
    hub.id = "hub";
    hub.innerHTML =
      /* 17z33: the four modes up top (data.js MODES.main); everything else in a smaller row under them */
      '<div class="hub-modes" id="hub-modes">' + modeTiles() + '</div>' +
      '<div class="hub-tiles is-small">' +
        '<button type="button" class="btn hub-tile is-hatch" id="hub-hatch"><span class="hub-badge" id="hub-hatch-new" hidden>FEED</span><canvas class="hub-art" id="hub-art-hatch" width="220" height="205"></canvas><span class="hub-txt"><span class="hub-ttl" data-px="HATCHERY"></span><span class="hub-cap" id="hub-hatch-cap"></span></span></button>' +
        '<button type="button" class="btn hub-tile is-eggs" id="hub-eggs"><span class="hub-badge" id="hub-eggs-new" hidden>NEW</span><canvas class="hub-art" id="hub-art-eggs" width="220" height="205"></canvas><span class="hub-txt"><span class="hub-ttl" data-px="EGGS"></span><span class="hub-cap" id="hub-eggs-cap"></span></span></button>' +
        '<button type="button" class="btn hub-tile is-disc" id="hub-disc"><canvas class="hub-art" id="hub-art-disc" width="220" height="205"></canvas><span class="hub-txt"><span class="hub-ttl" data-px="DISCOVERIES"></span><span class="hub-cap" id="hub-disc-cap"></span></span></button>' +
      '</div>' +
      '<button type="button" class="hub-rival" id="hub-rival" hidden></button>';
    panel.insertBefore(hub, panel.querySelector(".title-menu"));
    foot = document.createElement("div");
    foot.className = "hub-foot"; foot.id = "hub-foot";
    foot.innerHTML = '<button type="button" class="btn hub-mini" id="hub-bank" data-px="DIGIBANK"></button>' +
        '<button type="button" class="btn hub-mini" id="hub-cabinet" data-px="CABINET"></button>' +
        '<button type="button" class="btn hub-mini is-lab" id="hub-lab" data-px="LAB"></button>' +
        '<button type="button" class="btn hub-mini is-items" id="hub-items" data-px="ITEMS"></button>' +
        '<button type="button" class="btn hub-mini is-badges" id="hub-badges" data-px="BADGES"></button>' +
        '<button type="button" class="btn hub-mini is-league" id="hub-league" data-px="LEAGUE"></button>' +
        '<button type="button" class="btn hub-mini" id="hub-help" data-px="HOW TO PLAY"></button>';
    panel.appendChild(foot);
    /* top right: DigiCoins and the music switch */
    foot = document.createElement("div");
    foot.id = "hub-top";
    /* 17z33: playing with friends is a choice on the setup screen now; joining someone's game lives up here */
    foot.innerHTML = '<button type="button" class="btn hub-chip is-join" id="hub-join" title="Got an invite? Join a friend\'s game">Join a friend</button><span class="hub-chip" id="hub-bits">DigiCoins <b>0</b></span><button type="button" class="btn hub-chip" id="hub-music" title="Music">♫</button>';
    panel.appendChild(foot);
    document.body.classList.add("has-hub");

    Array.prototype.forEach.call(hub.querySelectorAll("[data-main]"), function (b) { b.addEventListener("click", function () { pickMain(b.getAttribute("data-main")); }); });
    $("hub-eggs").addEventListener("click", function () { var m = M(); if (m) { m.eggsSeen(); m.go("egg"); } });
    $("hub-hatch").addEventListener("click", function () { var m = M(); if (m) m.go("hatchery"); });
    $("hub-disc").addEventListener("click", function () { press("btn-log"); });
    $("hub-join").addEventListener("click", function () { press("btn-online-join"); });
    $("hub-bank").addEventListener("click", function () { press("btn-bank"); });
    $("hub-cabinet").addEventListener("click", function () { press("btn-cabinet"); });
    $("hub-items").addEventListener("click", function () { if (D.uiSfx) D.uiSfx("ui"); if (D.items) D.items.open(); });
    $("hub-badges").addEventListener("click", function () { if (D.uiSfx) D.uiSfx("ui"); if (D.profile && D.profile.openBadges) D.profile.openBadges(); });
    $("hub-rival").addEventListener("click", function () { if (D.uiSfx) D.uiSfx("ui"); openTrophies(); });
    $("hub-lab").addEventListener("click", function () { if (D.uiSfx) D.uiSfx("ui"); if (D.menu) D.menu.go("lab"); });
    $("hub-help").addEventListener("click", function () { press("btn-help"); });
    $("hub-league").addEventListener("click", function () { if (D.uiSfx) D.uiSfx("ui"); if (D.boards) D.boards.open(); });
    $("hub-music").addEventListener("click", function () { if (D.audio) D.audio.setMusic(!D.audio.musicOn()); paintMusic(); });
    stamp(hub); stamp($("hub-foot"));
    if (D.menu && D.menu.focus) setTimeout(function () { if (D.getState && D.getState() === "title") D.menu.focus(); }, 0);
  }
  /* ---------- the trophy room: every rival you have beaten ---------- */
  var trophySvg = "<svg viewBox='0 0 9 9' width='16' height='16' shape-rendering='crispEdges' aria-hidden='true'><path fill='#ffd23a' d='M2 0h5v1h2v3H7v1H6v2h1v1H2V7h1V5H2V4H0V1h2zM1 2v1h1V2zm6 0v1h1V2z'/></svg>";
  function openTrophies() {
    var m = M(), list = m && m.trophies ? m.trophies() : [], info = m ? m.info() : {}, old = $("trophy-room"), box, h, i, t, cvs, c, rv = info.rival;
    if (old) old.parentNode.removeChild(old);
    h = "<div class='profile-box is-wide trophy-box'><button type='button' class='profile-x' id='trophy-x' aria-label='Close'>&times;</button>" +
      "<h2>Trophy Room</h2><p class='profile-lead'>Every rival tamer you have beaten, strongest first.</p>" +
      "<div class='trophy-score'><div><b>" + (info.rivalWins || 0) + "</b><span>times you beat a rival</span></div><div><b>" + (info.rivalLosses || 0) + "</b><span>times a rival beat you</span></div><div><b>" + list.length + "</b><span>trophies</span></div></div>";
    if (rv && rv.beat) h += "<p class='trophy-nemesis'>Last one to beat you: <b>" + esc(rv.name) + "'s " + esc(spName(rv.form)) + "</b> (job level " + (+rv.level || 1) + "), " + fmt(rv.time) + " into the run.</p>";
    if (!list.length) h += "<p class='trophy-none'>No trophies yet. A rival tamer turns up in every run: beat its partner and it lands here.</p>";
    else {
      h += "<div class='trophy-grid'>";
      for (i = 0; i < list.length; i++) {
        t = list[i];
        h += "<div class='trophy-card" + (i === 0 ? " is-top" : "") + "'>" + (i === 0 ? "<i class='trophy-tag'>TOUGHEST</i>" : "") + "<canvas width='96' height='84' data-form='" + esc(t.form) + "'></canvas>" +
          "<b>" + esc(t.name) + "'s " + esc(spName(t.form)) + "</b><span>Job level " + (+t.level || 1) + (t.times > 1 ? "  \u00b7  beaten \u00d7" + (+t.times) : "") + "</span>" +
          "<small>" + fmt(t.time || 0) + " into the run" + (t.mine ? ", with " + esc(spName(t.mine)) : "") + "</small></div>";
      }
      h += "</div>";
    }
    h += "</div>";
    box = document.createElement("div"); box.className = "profile-overlay"; box.id = "trophy-room"; box.innerHTML = h;
    ($("app") || document.body).appendChild(box);
    cvs = box.querySelectorAll("canvas");
    for (i = 0; i < cvs.length; i++) {
      c = cvs[i].getContext("2d"); c.imageSmoothingEnabled = false;
      c.fillStyle = "rgba(0,0,0,0.35)"; c.beginPath(); c.ellipse(48, 76, 30, 6, 0, 0, 7); c.fill();
      var tf = cvs[i].getAttribute("data-form"), tsp = D.SPECIES && D.SPECIES[tf], tst = (tsp && (tsp.stageKey || tsp.stage)) || "";
      try { D.sprites.drawPartner(c, tf, 48, 76, -1, /Baby|In-Training/.test(tst) ? 2 : tst === "Rookie" ? 1.2 : 0.55, 0); } catch (e) {}
    }
    function close() { if (box.parentNode) box.parentNode.removeChild(box); document.removeEventListener("keydown", key); }
    function key(e) { if (e.key === "Escape") { close(); e.preventDefault(); e.stopPropagation(); } }
    $("trophy-x").addEventListener("click", close);
    box.addEventListener("click", function (e) { if (e.target === box) close(); });
    document.addEventListener("keydown", key);
  }

  function paintMusic() { var b = $("hub-music"), on = !D.audio || D.audio.musicOn(); if (b) { b.classList.toggle("is-off", !on); b.title = on ? "Music is on" : "Music is off"; } }

  function refreshHub() {
    var m = M(), info, card, st, rv, box, sub, bits;
    if (!m || !$("hub")) return;
    info = m.info(); card = D.profile && D.profile.card ? D.profile.card() : null; st = (card && card.st) || {};
    $("hub-eggs-cap").textContent = info.eggs + " of " + info.eggsTotal + " lines open";
    $("hub-eggs-new").hidden = !(info.eggs > info.eggsSeen);
    if (D.hatchery && $("hub-hatch-cap")) {
      var hs = D.hatchery.state(), he = hs.egg;
      $("hub-hatch-cap").textContent = !he ? "A new egg is waiting" : (he.stage === 0 ? hs.tier.name + " egg: " + he.prog + " / " + hs.cost + " data" : spName(he.form) + (hs.cost == null ? ", fully grown" : ": " + he.prog + " / " + hs.cost));
      $("hub-hatch-new").hidden = !(hs.total > 0 && (!he || hs.cost != null));
    }
    if ($("hub-lab")) $("hub-lab").classList.toggle("has-new", !!(D.lab && D.lab.canBuyAny()));
    if (D.profile && D.profile.syncBadges) D.profile.syncBadges();
    $("hub-disc-cap").textContent = (st.formsOf ? (st.forms || 0) + " of " + st.formsOf + " forms found" : "Every form you have reached");
    bits = $("hub-bits"); if (bits) bits.querySelector("b").textContent = String(info.bits || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    /* the profile chip says a little more here */
    sub = $("profile-chip-sub");
    if (sub && card) {
      var rk = D.profile.rank.now(), chip = $("profile-chip"), rb = $("hub-rank");
      sub.textContent = (rk.title || "Tamer") + "  ·  " + (card.a || []).length + "/" + ((D.profile.ACH || []).length || 0) + " badges";
      if (chip && !rb) { rb = document.createElement("i"); rb.id = "hub-rank"; rb.className = "hub-rank"; rb.innerHTML = "<b></b><u><s></s></u>"; chip.appendChild(rb); }
      if (rb) { rb.querySelector("b").textContent = "RANK " + rk.rank; rb.querySelector("s").style.width = (rk.max ? 100 : Math.round(100 * rk.into / rk.need)) + "%"; rb.title = rk.max ? "Top rank" : rk.into + " / " + rk.need + " rank XP"; }
    }
    /* the last word on your rival */
    rv = info.rival; box = $("hub-rival");
    if (box) {
      box.hidden = !rv;
      if (rv) box.innerHTML = "<span>Last run: " + (rv.beat ? "<b>" + esc(rv.name) + "'s " + esc(spName(rv.form)) + "</b> beat you at " + fmt(rv.time) + "."
        : (rv.wins > 0 ? "you beat <b>" + esc(rv.name) + "'s " + esc(spName(rv.form)) + "</b>" + (rv.wins > 1 ? " " + rv.wins + " times" : "") + "." : "<b>" + esc(rv.name) + "'s " + esc(spName(rv.form)) + "</b> reached job level " + rv.level + ".")) +
        "</span><span class='hub-score'>You " + (info.rivalWins || 0) + " · Rivals " + (info.rivalLosses || 0) + "</span><span class='hub-trophy'>" + trophySvg + " " + (m.trophies ? m.trophies().length : 0) + "</span>";
    }
    paintMusic();
  }

  /* the four mode tiles' scenes (17z33) */
  function grass(c, y, w, sp, col) {
    var i;
    c.fillStyle = col[0]; c.fillRect(0, y, w, 8); c.fillStyle = col[1]; c.fillRect(0, y + 8, w, 40);
    c.fillStyle = col[2]; for (i = 0; i < 22; i++) c.fillRect(((i * 12.4 - t * sp) % w + w) % w, y - 4 + (i % 3), 4, 4);
  }
  function drawAt(c, x, y, sc, fn) { c.save(); c.translate(x, y); c.scale(sc, sc); try { fn(); } catch (e) {} c.restore(); }
  function paintModeArt(S, m, tam, egg) {
    var c, i, a, k, foe = ["goblimon", "gazimon", "tsukaimon", "dokunemon", "betamon"];
    if (S.preloadSpecies && !paintModeArt.loaded) { paintModeArt.loaded = 1; ["jijimon", "agumon", "gabumon", "greymon", "garurumon", "goblimon", "gazimon", "tsukaimon", "dokunemon"].forEach(function (f) { try { S.preloadSpecies(f, true); } catch (e) {} }); }
    /* Story: Jijimon showing the way, an egg waiting */
    c = ctxOf("hub-art-story");
    if (c) {
      c.fillStyle = "rgba(124,240,192,0.12)"; c.beginPath(); c.arc(130, 112, 80 + Math.sin(t * 2) * 4, 0, 7); c.fill();
      grass(c, 168, 260, 0, ["#3f9a44", "#2f7a38", "#6cc35a"]);
      drawAt(c, 86, 170, 1.7, function () { S.drawPartner(c, "jijimon", 0, 0, 1, 1, t, false, false, false); });
      drawAt(c, 178, 170, 2.1, function () { S.drawTamer(c, 0, 0, -1, t, false, false, false, "side", tam); });
      drawAt(c, 132, 172, 1.5, function () { S.drawEgg(c, egg, 0, 0, t, false, false); });
      /* a speech bubble with a goal tick */
      k = 100 + Math.round(Math.sin(t * 2.5) * 2);
      c.fillStyle = "#f6ead0"; c.fillRect(96, k - 50, 40, 30); c.fillRect(104, k - 20, 8, 6);
      c.fillStyle = "#2fae7a"; c.fillRect(104, k - 36, 6, 6); c.fillRect(110, k - 30, 6, 6); c.fillRect(116, k - 36, 6, 6); c.fillRect(122, k - 42, 6, 6);
    }
    /* Survival: tamer and partner out in the world, the sun going round */
    c = ctxOf("hub-art-survival");
    if (c) {
      a = t * 0.35;
      c.fillStyle = "rgba(255,210,58,0.16)"; c.beginPath(); c.arc(130 + Math.cos(a) * 80, 90 + Math.sin(a) * 34, 26, 0, 7); c.fill();
      c.fillStyle = "#ffd23a"; c.fillRect(122 + Math.cos(a) * 80, 82 + Math.sin(a) * 34, 16, 16);
      c.fillStyle = "#2a6a3a"; for (i = 0; i < 5; i++) { c.fillRect(14 + i * 56, 120 - (i % 2) * 14, 18, 50); c.fillRect(8 + i * 56, 130 - (i % 2) * 14, 30, 10); }
      grass(c, 168, 260, 22, ["#3f9a44", "#2f7a38", "#6cc35a"]);
      drawAt(c, 92, 170, 2.2, function () { S.drawTamer(c, 0, 0, 1, t, false, true, false, "side", tam); });
      drawAt(c, 168, 170, 1.6, function () { S.drawPartner(c, "agumon", 0, 0, 1, 1, t, false, false, true); });
    }
    /* Night Siege: under the moon, wild Digimon closing in from both sides */
    c = ctxOf("hub-art-siege");
    if (c) {
      c.fillStyle = "#0b1030"; c.fillRect(0, 0, 260, 200);
      c.fillStyle = "#f4f1d0"; c.beginPath(); c.arc(206, 44, 18, 0, 7); c.fill(); c.fillStyle = "#0b1030"; c.beginPath(); c.arc(198, 38, 16, 0, 7); c.fill();
      c.fillStyle = "#cfd6ff"; for (i = 0; i < 14; i++) if (Math.sin(t * 2 + i * 1.9) > -0.3) c.fillRect((i * 53) % 250, (i * 37) % 90 + 6, 2, 2);
      grass(c, 168, 260, 0, ["#1e3d4a", "#13263a", "#2c5a5a"]);
      for (i = 0; i < 4; i++) {
        k = ((t * 14 + i * 30) % 60);
        drawAt(c, i < 2 ? 6 + k + i * 26 : 254 - k - (i - 2) * 26, 172, 1.0, function () { S.drawEnemy(c, foe[i % foe.length], 0, 0, t + i, false, i < 2 ? 1 : -1, 1); });
      }
      c.fillStyle = "rgba(154,140,255,0.18)"; c.beginPath(); c.arc(130, 140, 54, 0, 7); c.fill();
      drawAt(c, 112, 170, 2.0, function () { S.drawTamer(c, 0, 0, 1, t, false, false, false, "side", tam); });
      drawAt(c, 150, 170, 1.4, function () { S.drawPartner(c, "gabumon", 0, 0, -1, 1, t, false, false, false); });
    }
    /* Versus: two partners squaring up */
    c = ctxOf("hub-art-versus");
    if (c) {
      c.fillStyle = "rgba(255,106,90,0.14)"; c.fillRect(0, 0, 130, 200); c.fillStyle = "rgba(90,170,255,0.14)"; c.fillRect(130, 0, 130, 200);
      grass(c, 168, 260, 0, ["#7a4a3a", "#4a2e28", "#a0664a"]);
      drawAt(c, 64, 174, 0.85, function () { S.drawPartner(c, "greymon", 0, 0, 1, 1, t, false, false, false); });
      drawAt(c, 198, 174, 0.85, function () { S.drawPartner(c, "garurumon", 0, 0, -1, 1, t + 0.5, false, false, false); });
      k = 1 + Math.max(0, Math.sin(t * 4)) * 0.12;
      if (D.px && D.px.drawText) { c.save(); c.translate(130, 40); c.scale(k, k); c.fillStyle = "rgba(10,15,26,0.75)"; c.fillRect(-30, -20, 60, 40); D.px.drawText(c, "VS", -22, -14, 5, "#ffd23a"); c.restore(); }
      c.fillStyle = "#fff6c4"; if (Math.sin(t * 9) > 0.6) { c.fillRect(124, 110, 12, 4); c.fillRect(128, 104, 4, 16); }
    }
  }
  /* the little scenes on the tiles, alive */
  function paintHubArt() {
    var S = D.sprites, m = M(), c, i, tam, egg, bob, list, forms, x;
    if (!S || !m || !S.drawTamer) return;
    tam = m.tamer(); egg = m.eggFrame();
    paintModeArt(S, m, tam, egg);
    c = ctxOf("hub-art-eggs");
    if (c) {
      list = m.eggs().filter(function (e) { return !e.locked && !e.random; });
      for (i = 0; i < 3; i++) {
        x = list.length ? list[(i + Math.floor(t / 3)) % list.length] : null;
        c.save(); c.translate([64, 156, 110][i], [150, 150, 174][i]); c.scale(i === 2 ? 2.1 : 1.5, i === 2 ? 2.1 : 1.5);
        try { S.drawEgg(c, x ? x.frame : egg, 0, 0, t + i * 0.8, false, false, i * 3 + 1); } catch (e3) {}
        c.restore();
      }
    }
    c = ctxOf("hub-art-hatch");
    if (c && D.hatchery) {
      var hst = D.hatchery.state(), heg = hst.egg;
      c.fillStyle = heg ? hst.tier.col : "#7cf0c0"; c.globalAlpha = 0.13 + 0.04 * Math.sin(t * 2); c.beginPath(); c.arc(110, 118, 70 + Math.sin(t * 2) * 4, 0, 7); c.fill(); c.globalAlpha = 1;
      c.fillStyle = "#1a2438"; c.fillRect(56, 172, 108, 9); c.fillStyle = "#2c3f5c"; c.fillRect(62, 166, 96, 8);
      c.save(); c.translate(110, 168);
      try { if (!heg || heg.stage === 0) { c.scale(2.5, 2.5); S.drawEgg(c, "egg_08", 0, 0, t, false, false, heg ? heg.shell % 97 : 5); } else { bob = [2.4, 2.2, 1.9, 1.35][heg.stage - 1] || 1.6; c.scale(bob, bob); S.drawPartner(c, heg.form, 0, 0, 1, 1, t, false, false, false); } } catch (eh) {}
      c.restore();
    }
    c = ctxOf("hub-art-disc");
    if (c) {
      forms = m.route();
      c.strokeStyle = "#39c5ff"; c.lineWidth = 3; c.setLineDash([6, 5]); c.lineDashOffset = -t * 14;
      c.beginPath(); c.moveTo(40, 150); c.lineTo(180, 150); c.moveTo(110, 150); c.lineTo(110, 70); c.lineTo(180, 70); c.stroke(); c.setLineDash([]);
      for (i = 0; i < forms.length && i < 3; i++) {
        bob = i === 2 ? 0.95 : 1.25;
        c.fillStyle = "rgba(120,220,255,0.16)"; c.beginPath(); c.ellipse([40, 110, 180][i], 142, i === 2 ? 40 : 28, i === 2 ? 44 : 30, 0, 0, 7); c.fill();
        c.save(); c.translate([40, 110, 180][i], 168); c.scale(bob, bob);
        try { if (forms[i].seen) S.drawPartner(c, forms[i].id, 0, 0, 1, 1, t + i, false, false, false); else S.drawSilhouette(c, forms[i].id, 0, 0, 1); } catch (e4) {}
        c.restore();
      }
      c.fillStyle = "#16263c"; c.fillRect(156, 44, 48, 48); c.strokeStyle = "#39c5ff"; c.lineWidth = 3; c.strokeRect(156, 44, 48, 48);
      if (D.px && D.px.drawText) D.px.drawText(c, "?", 172, 54 + Math.round(Math.sin(t * 3) * 2), 4, "#39c5ff");
    }
  }

  /* ------------------------------ run setup ------------------------------ */
  function buildSetup() {
    var host = $("tamer-screen"), s;
    if (!host || $("setup-screen")) return;
    s = document.createElement("div");
    s.id = "setup-screen"; s.className = "screen";
    s.innerHTML =
      '<div class="setup">' +
        '<button type="button" class="btn hub-mini setup-back" id="btn-setup-back" data-px="BACK"></button>' +
        '<h2 class="setup-head"><span data-px="SET UP YOUR RUN"></span></h2>' +
        '<div class="setup-cards">' +
          '<div class="setup-card" id="setup-tamer"><span class="setup-lab" data-px="YOUR PROJECTION"></span><canvas class="setup-art" id="setup-art-tamer" width="300" height="190"></canvas>' +
            '<button type="button" class="btn setup-arrow is-l" id="setup-tamer-prev" aria-label="Previous projection">‹</button><button type="button" class="btn setup-arrow is-r" id="setup-tamer-next" aria-label="Next projection">›</button>' +
            '<span class="setup-name" id="setup-tamer-name" data-px="CYAN"></span><div class="setup-dots" id="setup-tamer-dots"></div><p class="setup-cap">How you appear in the Digital World.</p></div>' +
          '<div class="setup-card" id="setup-egg"><span class="setup-lab" data-px="YOUR DIGI EGG"></span><canvas class="setup-art" id="setup-art-egg" width="300" height="190"></canvas>' +
            '<button type="button" class="btn setup-arrow is-l" id="setup-egg-prev" aria-label="Previous egg">‹</button><button type="button" class="btn setup-arrow is-r" id="setup-egg-next" aria-label="Next egg">›</button>' +
            '<span class="setup-name" id="setup-egg-name" data-px="AGUMON LINE"></span><div class="setup-dots" id="setup-egg-dots"></div>' +
            '<button type="button" class="setup-alleggs" id="btn-setup-alleggs">▦ See all eggs</button><p class="setup-cap" id="setup-egg-cap"></p></div>' +
          '<div class="setup-card" id="setup-party"><span class="setup-lab" data-px="WHO IS COMING"></span><canvas class="setup-art" id="setup-art-party" width="300" height="190"></canvas>' +
            '<span class="setup-name" id="setup-party-name" data-px="SOLO"></span><div class="setup-opt" id="setup-party-opt"></div><p class="setup-cap" id="setup-party-cap"></p></div>' +
        '</div>' +
        '<div class="setup-modes" id="setup-modes"></div>' +
        '<div class="setup-strip"><canvas class="setup-scene" id="setup-scene" width="560" height="150"></canvas><p class="setup-sum" id="setup-sum"></p>' +
          '<div class="setup-gos"><button type="button" class="btn setup-go" id="btn-setup-start" data-px="JUST PLAY"></button>' +
          '<button type="button" class="btn hub-mini is-sea setup-invite" id="btn-setup-invite" data-px="INVITE FRIENDS"></button></div></div>' +
      '</div>';
    host.parentNode.insertBefore(s, host);
    $("btn-setup-back").addEventListener("click", function () { var m = M(); if (m) m.go("title"); });
    $("btn-setup-start").addEventListener("click", function () { var m = M(), e = curEgg(); if (!m || !e || e.locked || modeBlocks(m, e)) { if (D.uiSfx) D.uiSfx("ui"); return; } m.setEgg(e.id); m.start(); });
    /* invite friends: a room for this mode, with your projection and egg (17z33) */
    $("btn-setup-invite").addEventListener("click", function () { var m = M(), e = curEgg(); if (!m) return; if (e && !e.locked) m.setEgg(e.id); m.go("title"); press("btn-online-host"); });
    $("setup-tamer-prev").addEventListener("click", function () { stepTamer(-1); });
    $("setup-tamer-next").addEventListener("click", function () { stepTamer(1); });
    $("setup-egg-prev").addEventListener("click", function () { stepEgg(-1); });
    $("setup-egg-next").addEventListener("click", function () { stepEgg(1); });
    swipe($("setup-art-tamer"), stepTamer); swipe($("setup-art-egg"), stepEgg, openEggGrid);
    $("btn-setup-alleggs").addEventListener("click", openEggGrid);
    $("setup-egg-name").addEventListener("click", openEggGrid);
    stamp(s);
  }
  function swipe(el, fn, tap) {
    var sx = null;
    if (!el) return;
    el.addEventListener("pointerdown", function (e) { sx = e.clientX; });
    el.addEventListener("pointerup", function (e) { if (sx != null && Math.abs(e.clientX - sx) > 30) fn(e.clientX < sx ? 1 : -1); else if (sx != null && tap) tap(); sx = null; });
  }
  /* every egg at once, in a grid (egg-grid.js) */
  function openEggGrid() {
    if (!D.eggGrid) return;
    D.eggGrid.open({ onPick: function (id) { eggView = id; slide.egg = 0; paintSetup(); } });
  }
  function tamers() { return (D.sprites && D.sprites.getTamerList) ? D.sprites.getTamerList() : []; }
  function tamerAt() { var l = tamers(), m = M(), i; for (i = 0; i < l.length; i++) if (l[i].id === m.tamer()) return i; return 0; }
  function stepTamer(d) {
    var l = tamers(), m = M();
    if (!l.length || !m) return;
    m.setTamer(l[(tamerAt() + d + l.length) % l.length].id);
    slide.tamer = d; if (D.uiSfx) D.uiSfx("ui");
    paintSetup();
  }
  function eggAt() { var l = M().eggs(), i; for (i = 0; i < l.length; i++) if (l[i].id === eggView) return i; return 0; }
  function curEgg() { var m = M(), l = m ? m.eggs() : []; return l[eggAt()] || null; }
  function stepEgg(d) {
    var m = M(), l = m.eggs(), e;
    if (!l.length) return;
    e = l[(eggAt() + d + l.length) % l.length];
    eggView = e.id;
    if (!e.locked) { m.setEgg(e.id); if (!e.random && D.sprites.rollEggPattern) D.sprites.rollEggPattern(e.frame); }   /* a locked egg can be looked at, not taken */
    slide.egg = d; if (D.uiSfx) D.uiSfx("ui");
    paintSetup();
  }
  function dots(el, n, at) {
    var h = "", i, show = Math.min(n, 24);
    for (i = 0; i < show; i++) h += "<i" + (Math.round(at * (show - 1) / Math.max(1, n - 1)) === i ? " class='on'" : "") + "></i>";
    if (el) el.innerHTML = h;
  }
  /* Ranked and the Weekly Map are one life with nothing brought along: no Hatchery partner, no CPU partners */
  function modeBlocks(m, e) { var md = m.mode ? m.mode() : "open"; return (md === "ranked" || md === "weekly") && e && e.hatchery; }
  function paintModes(m) {
    var box = $("setup-modes"), l = m.modes ? m.modes() : [], cur = m.mode ? m.mode() : "open", h = "", i, d = null, wk;
    if (!box) return;
    if (!l.length) { box.hidden = true; return; }
    /* 17z33: the mode was picked on the hub; here you only choose among Survival's rules */
    var grp = groupOf(cur), mn = null;
    for (i = 0; i < mains().length; i++) if (mains()[i].id === grp) mn = mains()[i];
    l = l.filter(function (x) { return (x.group || x.id) === grp; });
    if (l.length < 2) { d = l[0] || null; h = "<button type='button' class='btn setup-mode is-on is-main' style='--mc:" + (MAIN_ART[grp] || "#ffd23a") + "'><b>" + esc(mn ? mn.name : (d ? d.name : cur)) + "</b><span>" + esc(mn ? mn.tag : "") + "</span></button>"; l = []; }
    for (i = 0; i < l.length; i++) {
      if (l[i].id === cur) d = l[i];
      h += "<button type='button' class='btn setup-mode" + (l[i].id === cur ? " is-on" : "") + (l[i].ranked ? " is-ranked" : "") + "' data-mode='" + l[i].id + "'><b>" + esc(l[i].name) + "</b><span>" + esc(l[i].short) + "</span></button>";
    }
    wk = cur === "weekly" && D.weekOf ? " This week: " + D.weekOf().replace("-W", ", week ") + "." : "";
    box.innerHTML = "<span class='setup-lab' data-px='" + (grp === "survival" ? "SURVIVAL" : "MODE") + "'></span><div class='setup-mode-row'>" + h + "</div><p class='setup-mode-cap'>" + esc(((d && d.blurb) || "") + wk) +
      (d && d.ranked && !(D.boards && D.boards.signedIn()) ? " Log in on the online server for it to count on the boards." : "") + "</p>";
    Array.prototype.forEach.call(box.querySelectorAll("[data-mode]"), function (b) { b.addEventListener("click", function () { m.setMode(b.getAttribute("data-mode")); if (D.uiSfx) D.uiSfx("ui"); paintSetup(); }); });
    stamp(box);
  }
  function paintSetup() {
    var m = M(), l = tamers(), ta = tamerAt(), e, who, opt, n, i, h, on, max, go;
    if (!m || !$("setup-screen")) return;
    px($("setup-tamer-name"), ((l[ta] && l[ta].name) || "Tamer").toUpperCase());
    dots($("setup-tamer-dots"), l.length, ta);
    e = curEgg();
    if (e) {
      px($("setup-egg-name"), e.locked ? "LOCKED EGG" : (e.random ? "RANDOM EGG" : (e.hatchery ? "HATCHERY: " : "") + String(e.name || e.id).toUpperCase()));
      $("setup-egg-cap").textContent = e.blurb || "";
      var mt = (!e.locked && !e.random && m.memoryText) ? m.memoryText(e.id) : "", mel = $("setup-egg-mem");
      if (!mel) { mel = document.createElement("p"); mel.id = "setup-egg-mem"; mel.className = "setup-mem"; $("setup-egg-cap").parentNode.insertBefore(mel, $("setup-egg-cap").nextSibling); }
      mel.textContent = mt; mel.hidden = !mt;
      dots($("setup-egg-dots"), m.eggs().length, eggAt());
      $("setup-egg").classList.toggle("is-locked", !!e.locked);
    }
    paintModes(m);
    on = m.online(); n = m.cpu(); max = m.cpuMax();
    var oneLife = m.mode && (m.mode() === "ranked" || m.mode() === "weekly");
    if (oneLife) n = 0;
    px($("setup-party-name"), on ? "ONLINE" : (n ? "YOU + " + n + " CPU" : "SOLO"));
    opt = $("setup-party-opt"); h = "";
    if (!on && !oneLife) {
      for (i = 0; i <= max; i++) h += "<button type='button' class='btn setup-pick" + (i === n ? " is-on" : "") + "' data-cpu='" + i + "' aria-label='" + (i ? i + " CPU partners" : "Solo") + "'>" + (i ? "+" + i : "Solo") + "</button>";
    }
    opt.innerHTML = h;
    Array.prototype.forEach.call(opt.querySelectorAll("[data-cpu]"), function (b) { b.addEventListener("click", function () { m.setCpu(+b.getAttribute("data-cpu")); if (D.uiSfx) D.uiSfx("ui"); paintSetup(); }); });
    $("setup-party-cap").textContent = on ? "Friends pick theirs too. You all meet in the lobby next." : oneLife ? "Ranked and the Weekly Map are you and your partner alone: no CPU partners." : (n ? "CPU partners fight beside you and join the brawls." : "Just you, your partner, and a rival somewhere out there.");
    /* 17z33: no summary line any more; only a warning when something stops the start */
    var warn = e && e.locked ? "This egg is still locked. Raise one to Rookie in the Hatchery to open its line."
      : modeBlocks(m, e) ? "A Hatchery partner can't enter a Ranked or Weekly run. Pick another egg, or another mode." : "";
    $("setup-sum").textContent = warn; $("setup-sum").hidden = !warn;
    paintGear(m);
    go = $("btn-setup-start");
    go.classList.toggle("is-off", !!(e && e.locked) || modeBlocks(m, e));
    px(go, on ? "TO THE LOBBY" : "JUST PLAY");
    if ($("btn-setup-invite")) $("btn-setup-invite").hidden = !!on;
  }
  /* what you're bringing in (17z33): a socket for every loadout slot, each with its item's emblem.
   * Crest Pieces (1, or 2 with the Lab's Digivice Port), a Charm, and one one-run item or scroll. */
  function paintGear(m) {
    var I = D.items, gb = $("setup-gear"), mid, l, n, socks = [], h = "", i, it, cvs;
    if (!gb) {
      gb = document.createElement("button"); gb.type = "button"; gb.id = "setup-gear"; gb.className = "btn setup-gear";
      gb.addEventListener("click", function () { if (D.uiSfx) D.uiSfx("ui"); if (D.items) D.items.open(); });
      mid = document.createElement("div"); mid.id = "setup-mid"; mid.className = "setup-mid";
      $("setup-sum").parentNode.insertBefore(mid, $("setup-sum")); mid.appendChild(gb); mid.appendChild($("setup-sum"));
    }
    if (!I) { gb.hidden = true; return; }
    l = I.loadout(); n = I.slots();
    for (i = 0; i < 2; i++) {
      if (i >= n) socks.push({ kind: "Crest", lock: "Lab: Digivice Port" });
      else { it = l.crest[i] ? I.byId(l.crest[i]) : null; socks.push({ kind: "Crest", it: it }); }
    }
    socks.push({ kind: "Charm", it: l.charm ? I.byId(l.charm) : null });
    /* 17z33: three one-run places (a fourth with the Lab's Kit Bag); a scroll takes one */
    var un = I.useSlots ? I.useSlots() : 1, umax = (D.ITEMS && D.ITEMS.useSlotsMax) || 4, uk = 0;
    if (l.scroll) { socks.push({ kind: "One run", scroll: true, name: "Scroll: " + I.skillName(l.scroll) }); uk++; }
    for (i = 0; i < (l.uses || []).length; i++, uk++) socks.push({ kind: "One run", it: I.byId(l.uses[i]) });
    for (; uk < un; uk++) socks.push({ kind: "One run", it: null });
    for (; uk < umax; uk++) socks.push({ kind: "One run", lock: "Lab: Kit Bag" });
    for (i = 0; i < socks.length; i++) {
      it = socks[i];
      h += "<span class='gear-sock" + (it.it || it.scroll ? " is-full is-" + ((it.it && it.it.rarity) || "rare") : (it.lock ? " is-lock" : " is-empty")) + "' title='" + esc(it.it ? it.it.name + ": " + (it.it.text || "") : it.scroll ? it.name : it.lock ? (it.kind === "Crest" ? "A second Crest slot: buy the Digivice Port in the Lab" : "A fourth one-run item: buy the Kit Bag in the Lab") : "Empty " + it.kind + " slot") + "'>" +
        "<canvas width='64' height='64' data-i='" + i + "'></canvas><b>" + esc(it.it ? it.it.name : it.scroll ? it.name : it.lock ? "Locked" : "Empty") + "</b><small>" + esc(it.lock || it.kind) + "</small></span>";
    }
    gb.innerHTML = "<span class='gear-head'><b>BRINGING IN</b><small>Tap to change</small></span><span class='gear-row'>" + h + "</span>";
    cvs = gb.querySelectorAll("canvas");
    for (i = 0; i < cvs.length; i++) {
      it = socks[i];
      if (it.it && D.iconArt) D.iconArt.item(cvs[i], it.it.id, { rarity: it.it.rarity });
      else if (it.scroll && D.iconArt) D.iconArt.scroll(cvs[i]);
      else emptySock(cvs[i], !!it.lock);
    }
  }
  function emptySock(cv, lock) {
    var c = cv.getContext("2d"), k;
    c.clearRect(0, 0, 64, 64);
    c.fillStyle = "rgba(10,16,28,0.9)"; c.fillRect(6, 6, 52, 52);
    c.strokeStyle = lock ? "#3a4258" : "#2f5a6e"; c.lineWidth = 2; c.setLineDash([5, 4]); c.strokeRect(8, 8, 48, 48); c.setLineDash([]);
    c.fillStyle = lock ? "#4a5270" : "#2f6e84";
    if (lock) { c.fillRect(24, 32, 16, 13); c.strokeStyle = "#4a5270"; c.lineWidth = 3; c.beginPath(); c.arc(32, 32, 6, Math.PI, 0); c.stroke(); }
    else { for (k = 0; k < 2; k++) c.fillRect(k ? 30 : 24, k ? 24 : 30, k ? 4 : 16, k ? 16 : 4); }
  }
  function openSetup() {
    var m = M();
    buildSetup();
    if (!m) return;
    eggView = m.egg();
    slide.tamer = slide.egg = 0;
    paintSetup();
    stamp($("setup-screen"));
  }
  function paintSetupArt(dt) {
    var S = D.sprites, m = M(), c, l = tamers(), ta = tamerAt(), eggs, ea, e, off, g, i, n = l.length, x, k, gr;
    if (!S || !m || !$("setup-screen")) return;
    slide.tamer *= Math.max(0, 1 - dt * 9); slide.egg *= Math.max(0, 1 - dt * 9);
    c = ctxOf("setup-art-tamer");
    if (c && n) {
      off = slide.tamer * 90;
      c.fillStyle = "rgba(88,216,255,0.12)"; c.beginPath(); c.ellipse(150, 170, 70, 14, 0, 0, 7); c.fill();
      for (i = -1; i <= 1; i++) {
        k = l[(ta + i + n) % n].id;
        c.save(); c.globalAlpha = i ? 0.28 : 1; c.translate(150 + i * 98 + off, i ? 162 : 172); g = i ? 1.7 : 3; c.scale(g, g);
        try { S.drawTamer(c, 0, 0, 1, t, false, false, false, "down", k); } catch (e1) {}
        c.restore();
      }
    }
    eggs = m.eggs(); ea = eggAt(); n = eggs.length;
    c = ctxOf("setup-art-egg");
    if (c && n) {
      off = slide.egg * 90;
      c.fillStyle = "rgba(255,210,58,0.12)"; c.beginPath(); c.arc(150, 102, 76 + Math.sin(t * 2) * 3, 0, 7); c.fill();
      for (i = -1; i <= 1; i++) {
        e = eggs[(ea + i + n) % n];
        c.save(); c.globalAlpha = i ? 0.3 : 1; c.translate(150 + i * 102 + off, i ? 162 : 174); g = i ? 1.3 : 2.6; c.scale(g, g);
        try { if (e.hatchery) { c.scale(e.scale || 0.7, e.scale || 0.7); S.drawPartner(c, e.form, 0, 0, 1, 1, i ? 0 : t, false, false, false); } else S.drawEgg(c, e.frame, 0, 0, i ? 0 : t, false, false, e.random ? Math.floor(t / 0.55) * 3 : undefined); } catch (e2) {}
        c.restore();
        if (e.locked) {
          x = 150 + i * 102 + off;
          c.save(); c.globalAlpha = i ? 0.3 : 0.6; c.fillStyle = "#060912"; c.beginPath(); c.ellipse(x, i ? 136 : 118, i ? 26 : 50, i ? 30 : 60, 0, 0, 7); c.fill(); c.restore();
          if (!i && D.px && D.px.drawText) D.px.drawText(c, "?", x - 10, 96, 5, "#9fb4d8");
        }
      }
    }
    c = ctxOf("setup-art-party");
    if (c) {
      n = m.online() ? 2 : m.cpu();
      c.save(); c.translate(110 - n * 14, 170); c.scale(2.4, 2.4); try { S.drawTamer(c, 0, 0, 1, t, false, false, false, "side", m.tamer()); } catch (e3) {} c.restore();
      c.save(); c.translate(176 - n * 14, 172); c.scale(1.6, 1.6); try { S.drawEgg(c, m.eggFrame(), 0, 0, t, false, false); } catch (e4) {} c.restore();
      for (i = 0; i < n && i < 3; i++) {
        c.save(); c.globalAlpha = 0.85; c.translate(214 + i * 34 - n * 8, 170); c.scale(1.5, 1.5);
        try { if (m.online()) S.drawTamer(c, 0, 0, -1, t + i, false, false, false, "side", l[(ta + 2 + i * 3) % l.length].id); else S.drawEgg(c, eggs[(ea + 1 + i) % eggs.length].frame, 0, 0, t + i, false, false); } catch (e5) {}
        c.restore();
      }
      if (!m.online() && D.px && D.px.drawText) { c.globalAlpha = 0.45 + Math.sin(t * 3) * 0.15; D.px.drawText(c, "?", 258, 30, 5, "#ff5aa8"); c.globalAlpha = 1; }
    }
    c = ctxOf("setup-scene");
    if (c) {
      gr = c.createLinearGradient(0, 0, 0, 150); gr.addColorStop(0, "#5aa8ea"); gr.addColorStop(0.72, "#a9d8f6"); c.fillStyle = gr; c.fillRect(0, 0, 560, 150);
      c.fillStyle = "#ffffff";
      [[60, 22, 70], [380, 34, 90], [230, 12, 50]].forEach(function (cl, j) { x = ((cl[0] - t * (6 + j * 3)) % 640 + 640) % 640 - 80; c.fillRect(x, cl[1], cl[2], 10); c.fillRect(x + 14, cl[1] - 8, cl[2] - 30, 8); });
      c.fillStyle = "#4f9a6a"; c.beginPath(); c.moveTo(0, 104); for (x = 0; x <= 560; x += 20) c.lineTo(x, 96 + Math.sin((x + t * 18) * 0.02) * 9); c.lineTo(560, 150); c.lineTo(0, 150); c.fill();
      c.fillStyle = "#3f9a44"; c.fillRect(0, 116, 560, 34);
      c.fillStyle = "#6cc35a"; for (i = 0; i < 47; i++) c.fillRect(((i * 12.3 - t * 40) % 572 + 572) % 572 - 6, 113 + (i % 3), 4, 4);
      c.save(); c.translate(236, 124); c.scale(2, 2); try { S.drawTamer(c, 0, 0, 1, t, false, true, false, "side", m.tamer()); } catch (e6) {} c.restore();
      e = curEgg();
      if (e && !e.locked) { c.save(); c.translate(318, 126 - Math.abs(Math.sin(t * 6)) * 5); c.scale(1.5, 1.5); try { if (e.hatchery) { c.scale(e.scale || 0.7, e.scale || 0.7); S.drawPartner(c, e.form, 0, 0, 1, 1, t, false, false, false); } else S.drawEgg(c, e.frame, 0, 0, t, false, false, e.random ? Math.floor(t / 0.55) * 3 : undefined); } catch (e7) {} c.restore(); }
    }
  }

  /* ------------------------------ wiring ------------------------------ */
  var lastState = null;
  D.hub = {
    /* every frame, from game.js */
    tick: function (dt, state) {
      t += dt; frame++;
      if (!built && $("title-panel") && D.sprites) { built = true; buildHub(); buildSetup(); }
      if (!built) return;
      if (state !== lastState) {
        if (state === "title") refreshHub();
        if (state === "setup") openSetup();
        lastState = state;
      }
      if (state === "hatchery" && D.hatchery) D.hatchery.paint(dt);
      if (state === "title" && frame % 2 === 0) paintHubArt();
      else if (state === "setup") paintSetupArt(dt);
    },
    refresh: refreshHub, setupRefresh: function () { if (D.getState && D.getState() === "setup") paintSetup(); }, openTrophies: openTrophies,
    openSetup: openSetup,
    stepTamer: stepTamer, stepEgg: stepEgg
  };
})(typeof window !== "undefined" ? window : this);
