/* Online lobby, join screen, invite link and in-game banners (Nov 14).
 * All the networking lives in js/net/online.js; this file is only DOM. */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});
  var N = D.online;
  if (!N) return;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k) || ""; localStorage.setItem(k, v); } catch (e) {} return ""; }
  function restamp() { if (D.titleScene && D.titleScene.restamp) D.titleScene.restamp(); }
  function sfx(n) { if (D.uiSfx) D.uiSfx(n || "ui"); }

  var inviteCode = "";
  var serverInfo = null, infoAt = 0;
  var status = { text: "", bad: false, until: 0 };
  var lastBanner = "", lastRoster = "", bannerAt = 0;
  var busy = false, autoJoined = false;

  try {
    var q = /[?&]room=([A-Za-z0-9]{4,6})/.exec(location.search || "");
    if (q) inviteCode = q[1].toUpperCase();
  } catch (e) {}

  function savedName(dflt) { return (D.profile && D.profile.name()) || store("dbh_net_name") || dflt; }
  function sendProfile() { if (D.profile && D.profile.card && N.setProfile) N.setProfile(D.profile.card()); }

  /* ------------------------------------------------------------------ */
  /* Title buttons                                                       */
  /* ------------------------------------------------------------------ */
  function titleNote(text, bad) {
    var box = $("title-invite"), t = $("title-invite-text");
    if (!box || !t) return;
    box.hidden = !text;
    t.textContent = text || "";
    box.style.background = bad ? "#5a1c1c" : "";
  }

  function hostClick() {
    if (busy) return;
    sfx();
    if (!N.canConnect()) { titleNote("Online play needs the game server. Run the start-online file that came with the game, then use the address it opens.", true); return; }
    busy = true;
    titleNote("Opening a room…");
    N.host(savedName("Host"), function (err) {
      busy = false;
      if (err) { titleNote(err, true); return; }
      titleNote("");
      sendProfile();
      D.setState("lobby");                     /* Nov 20: pick and invite on one screen */
      enterLobby();
    });
  }

  function openJoin() {
    sfx();
    D.setState("join");
    var c = $("join-code"), n = $("join-name"), s = $("join-status");
    if (c && inviteCode && !c.value) c.value = inviteCode;
    if (n && !n.value) n.value = savedName("");
    if (s) { s.textContent = inviteCode ? "You're invited to room " + inviteCode + ". Pick a name and join." : ""; s.classList.remove("is-bad"); }
    restamp();
    setTimeout(function () { try { ((c && !c.value) ? c : n).focus(); } catch (e) {} }, 50);
  }

  /* arriving in the lobby: show everyone what you are looking at */
  function enterLobby() {
    var m = M(), l, i, ok = false;
    if (!m) return;
    l = eggs(); for (i = 0; i < l.length; i++) if (l[i].id === m.egg() && !l[i].locked) ok = true;
    if (!ok) for (i = 0; i < l.length; i++) if (!l[i].locked) { m.setEgg(l[i].id); break; }
    if (N.setPick && N.myState && N.myState() !== "ready" && N.myState() !== "playing") N.setPick(m.egg(), m.tamer());
    renderLobby();
  }
  function joinGo() {
    if (busy) return;
    var c = $("join-code"), n = $("join-name"), s = $("join-status");
    var name = (n && n.value || "").trim() || "Tamer";
    store("dbh_net_name", name);
    busy = true;
    if (s) { s.textContent = "Joining…"; s.classList.remove("is-bad"); }
    N.join(c ? c.value : "", name, function (err) {
      busy = false;
      if (err) { if (s) { s.textContent = err; s.classList.add("is-bad"); } return; }
      if (s) s.textContent = "";
      if (D.profile && D.profile.setName) D.profile.setName(name);
      sendProfile();
      sfx();
      D.setState("lobby");
      enterLobby();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Lobby                                                               */
  /* ------------------------------------------------------------------ */
  function isPrivateHost(h) {
    return h === "localhost" || h === "[::1]" || /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || /\.local$/.test(h);
  }

  function inviteBase() {
    var over = store("dbh_public_url");
    if (N.role() === "host") {
      if (over) return { url: over, pub: true, from: "you" };
      if (serverInfo && serverInfo.publicUrl) return { url: serverInfo.publicUrl, pub: true, from: serverInfo.publicFrom || "tunnel" };
      if (!isPrivateHost(location.hostname)) return { url: location.origin, pub: true, from: "address" };
      if (serverInfo && serverInfo.lan && serverInfo.lan.length) return { url: serverInfo.lan[0], pub: false };
      return { url: location.origin, pub: false, loopback: true };
    }
    return { url: location.origin, pub: !isPrivateHost(location.hostname) };
  }

  function refreshInfo(force) {
    var t = Date.now();
    if (!force && t - infoAt < 4000) return;
    infoAt = t;
    if (!global.fetch || !N.canConnect()) return;
    fetch("api/info", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j) return;
      var before = serverInfo && serverInfo.publicUrl;
      serverInfo = j;
      if (j.publicUrl !== before && D.getState() === "lobby") renderLobby();
    }).catch(function () {});
  }

  function ensureLobbyExtras() {
    var nm = $("lobby-name");
    if (nm && !nm._wired) {
      nm._wired = true;
      nm.addEventListener("change", function () {
        var v = this.value.trim();
        if (!v) return;
        store("dbh_net_name", v);
        N.setName(v);
        if (D.profile && D.profile.setName) D.profile.setName(v);
      });
    }
    var note = $("lobby-note");
    if (note && !$("lobby-public-wrap")) {
      var wrap = document.createElement("div");
      wrap.id = "lobby-public-wrap";
      wrap.hidden = true;
      wrap.innerHTML = '<label class="join-field"><span>Public address (from your tunnel or router)</span><input type="text" id="lobby-public" autocomplete="off" spellcheck="false" placeholder="https://…"></label>';
      note.parentNode.appendChild(wrap);
      $("lobby-public").addEventListener("change", function () {
        var v = this.value.trim().replace(/\/+$/, "");
        if (v && !/^https?:\/\//i.test(v)) v = "https://" + v;
        store("dbh_public_url", v);
        renderLobby();
      });
    }
  }

  /* ---------- your pick: the projection on its platform, and the egg beside it ---------- */
  function M() { return D.menu || null; }
  function tamers() { return (D.sprites && D.sprites.getTamerList) ? D.sprites.getTamerList() : []; }
  function eggs() { var m = M(); return m && m.eggs ? m.eggs().filter(function (e) { return !e.hatchery; }) : []; }
  function eggOf(id) { var l = eggs(), i; for (i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  function tamerName(id) { var l = tamers(), i; for (i = 0; i < l.length; i++) if (l[i].id === id) return l[i].name; return "Projection"; }
  function tamerGlow(id) { var l = tamers(), i; for (i = 0; i < l.length; i++) if (l[i].id === id) return l[i].glow || "#7cf0ff"; return "#7cf0ff"; }
  function eggName(id) { var e = eggOf(id); return e ? e.name : "Egg"; }
  var swapAt = -9;                                  /* when the pick last changed: the projection materialises again */
  function stepTamer(d) {
    var m = M(), l = tamers(), i, at = 0;
    if (!m || !l.length) return;
    for (i = 0; i < l.length; i++) if (l[i].id === m.tamer()) at = i;
    m.setTamer(l[(at + d + l.length) % l.length].id);
    picked();
  }
  function stepEgg(d) {
    var m = M(), l = eggs(), i, at = 0, k, e;
    if (!m || !l.length) return;
    for (i = 0; i < l.length; i++) if (l[i].id === m.egg()) at = i;
    for (k = 1; k <= l.length; k++) { e = l[(at + d * k + l.length * k) % l.length]; if (!e.locked) break; }
    if (e && !e.locked) m.setEgg(e.id);
    picked();
  }
  /* a change of pick: shown to everyone at once, and it un-readies you */
  function picked() {
    var m = M();
    sfx();
    swapAt = performance.now() / 1000;
    if (m && N.setPick && N.role()) N.setPick(m.egg(), m.tamer());
    renderLobby();
  }
  function stageFrame(now) {
    var cv = $("lobby-stage"), m = M();
    if (!cv || !m || D.getState() !== "lobby") { stageRaf = 0; return; }
    stageRaf = requestAnimationFrame(stageFrame);
    var c = cv.getContext("2d"), W = cv.width, H = cv.height, t = now / 1000, id = m.tamer(), col = tamerGlow(id), e = eggOf(m.egg());
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, W, H);
    /* the floor grid and the platform it is projected from */
    var px = 140, py = 200, i, g;
    c.save(); c.globalAlpha = 0.18; c.strokeStyle = col; c.lineWidth = 1;
    for (i = -6; i <= 6; i++) { c.beginPath(); c.moveTo(px + i * 30, py + 40); c.lineTo(px + i * 12, py - 30); c.stroke(); }
    for (i = 0; i < 4; i++) { c.beginPath(); c.moveTo(0, py - 24 + i * 18); c.lineTo(W, py - 24 + i * 18); c.stroke(); }
    c.restore();
    g = c.createRadialGradient(px, py, 4, px, py, 80); g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)");
    c.save(); c.globalAlpha = 0.35; c.fillStyle = g; c.beginPath(); c.ellipse(px, py, 80, 24, 0, 0, 7); c.fill(); c.restore();
    c.fillStyle = "#1a2440"; c.beginPath(); c.ellipse(px, py + 4, 64, 17, 0, 0, 7); c.fill();
    c.fillStyle = "#2c3f5c"; c.beginPath(); c.ellipse(px, py, 64, 17, 0, 0, 7); c.fill();
    c.strokeStyle = col; c.lineWidth = 2; c.globalAlpha = 0.6 + Math.sin(t * 3) * 0.2; c.beginPath(); c.ellipse(px, py, 52, 13, 0, 0, 7); c.stroke(); c.globalAlpha = 1;
    /* it walks in place and turns: toward you, to the side, away, the other side */
    var cyc = t % 9, dir = "down", face = 1;
    if (cyc > 3 && cyc <= 5) { dir = "side"; face = 1; } else if (cyc > 5 && cyc <= 6.5) { dir = "up"; } else if (cyc > 6.5) { dir = "side"; face = -1; }
    var appear = Math.min(1, (t - swapAt) / 0.45), sc = 2.6;
    c.save();
    c.translate(px, py + 2); c.scale(sc, sc);
    if (appear < 1) { c.beginPath(); c.rect(-30, -70 + 70 * (1 - appear), 60, 80); c.clip(); }
    try { D.sprites.drawTamer(c, 0, 0, face, t, false, true, false, dir, id); } catch (er) {}
    c.restore();
    if (appear < 1) {                                   /* the beam that draws it in */
      c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = 0.6 * (1 - appear); c.fillStyle = col;
      c.fillRect(px - 34, 20, 68, py - 20); c.restore();
    }
    /* the egg on its own little stand */
    var ex = 288, ey = 196;
    c.fillStyle = "#1a2440"; c.beginPath(); c.ellipse(ex, ey + 3, 30, 8, 0, 0, 7); c.fill();
    c.fillStyle = "#2c3f5c"; c.beginPath(); c.ellipse(ex, ey, 30, 8, 0, 0, 7); c.fill();
    if (e && D.sprites.drawEgg) { c.save(); c.translate(ex, ey); c.scale(1.7, 1.7); try { D.sprites.drawEgg(c, e.frame, 0, 0, t, false, false); } catch (er2) {} c.restore(); }
    /* friends' slots breathe too */
    var cvs = document.querySelectorAll("#lobby-players canvas[data-i]"), list = N.players(), k, pl;
    for (k = 0; k < cvs.length; k++) { pl = list[+cvs[k].getAttribute("data-i")]; if (pl) paintCard(cvs[k], pl, t); }
  }
  var stageRaf = 0;
  function startStage() { if (!stageRaf && $("lobby-stage")) stageRaf = requestAnimationFrame(stageFrame); }

  function paintCard(cv, pl, t) {
    var c = cv.getContext("2d"), list = D.EGGS || [], i, frame = null, e = pl.peek ? eggOf(pl.peek) : null;
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, cv.width, cv.height);
    if (!D.sprites) return;
    try {
      if (pl.tamerId && D.sprites.drawTamer) D.sprites.drawTamer(c, 22, 50, 1, t || 0, false, false, false, "down", pl.tamerId);
      if (e) frame = e.frame;
      else for (i = 0; i < list.length; i++) if (list[i].id === pl.line) frame = list[i].frame;
      if (frame && D.sprites.drawEgg) D.sprites.drawEgg(c, frame, 42, 50, (t || 0) + 1, false, false);
    } catch (er) {}
  }

  function renderLobby() {
    var role = N.role();
    if (!role) return;
    ensureLobbyExtras();
    var m = M(), list = N.players(), meId = N.netId(), i, pl, html = "", tag, cls;
    var running = N.running(), isHost = role === "host", me = null;
    for (i = 0; i < list.length; i++) if (list[i].id === meId) me = list[i];
    var ready = !!(me && (me.state === "ready" || me.state === "playing"));
    var title = $("lobby-title"), codeEl = $("lobby-code"), link = $("lobby-link"), note = $("lobby-note");
    if (title) { title.setAttribute("data-px", isHost ? "YOUR ROOM" : "ONLINE LOBBY"); title.removeAttribute("aria-label"); }
    if (codeEl) { codeEl.setAttribute("data-px", N.code() || "----"); codeEl.removeAttribute("aria-label"); }
    var base = inviteBase();
    if (link) link.value = base.url + "/?room=" + N.code();
    if ($("lobby-link-short")) $("lobby-link-short").textContent = link ? link.value.replace(/^https?:\/\//, "") : "";
    var pw = $("lobby-public-wrap"), pin = $("lobby-public");
    if (note) {
      if (!isHost) note.textContent = "Share the link: anyone with it can join until the room is full (6 tamers).";
      else if (base.pub) note.innerHTML = "<b>Works anywhere.</b> Friends open it in a browser, nothing to download.";
      else if (base.loopback) note.innerHTML = "<b>This computer only.</b> The server did not report a network address.";
      else note.innerHTML = "<b>Home network only.</b> For friends somewhere else you need a tunnel or port forwarding (HOSTING.md); the address fills in on its own, or paste it below.";
    }
    if (pw) pw.hidden = !isHost || (base.pub && base.from !== "you");
    if (pin && document.activeElement !== pin) pin.value = store("dbh_public_url");
    var nm = $("lobby-name");
    if (nm && document.activeElement !== nm) nm.value = N.name();
    var share = $("btn-lobby-share");
    if (share) share.hidden = !navigator.share;
    /* your pick */
    if (m) {
      if ($("lobby-tamer-name")) $("lobby-tamer-name").textContent = tamerName(m.tamer());
      if ($("lobby-egg-name")) $("lobby-egg-name").textContent = eggName(m.egg());
      if ($("lobby-egg-blurb")) { var eb = eggOf(m.egg()); $("lobby-egg-blurb").textContent = (eb && eb.blurb) || ""; }
    }
    /* everyone in the room */
    var here = 0, readyN = 0, others = 0, othersReady = 0;
    for (i = 0; i < 6; i++) {
      pl = list[i];
      if (!pl) { html += '<button type="button" class="lobby2-slot is-empty" data-invite="1">+ Invite a friend</button>'; continue; }
      here++;
      var isReady = pl.state === "ready" || pl.state === "playing";
      if (isReady) readyN++;
      if (pl.id !== meId && pl.here) { others++; if (isReady) othersReady++; }
      if (!pl.here) { tag = "AWAY"; cls = " is-away"; }
      else if (pl.state === "playing") { tag = "IN GAME"; cls = " is-playing"; }
      else if (isReady) { tag = "✓ READY"; cls = " is-ready"; }
      else { tag = "CHOOSING…"; cls = ""; }
      html += '<div class="lobby2-slot' + (pl.id === meId ? " is-me" : "") + '" data-pid="' + i + '" title="See profile" style="border-left-color:' + esc(pl.color) + '">' +
        '<canvas width="64" height="56" data-i="' + i + '"></canvas>' +
        '<div><div class="nm">' + (pl.host ? "★ " : "") + esc(pl.name) + (pl.id === meId ? " (you)" : "") + '</div>' +
        '<span class="pk">' + esc(pl.tamerId ? tamerName(pl.tamerId) : "") + (pl.peek || pl.line ? "  ·  " + esc(eggName(pl.peek || pl.line)) : "") + '</span>' +
        '<span class="tg' + cls + '">' + tag + '</span></div></div>';
    }
    if ($("lobby-count")) $("lobby-count").textContent = here + " / 6  ·  " + readyN + " ready";
    var box = $("lobby-players");
    if (box) {
      box.innerHTML = html;
      var slots = box.querySelectorAll("[data-invite]"), cards = box.querySelectorAll("[data-pid]");
      for (i = 0; i < slots.length; i++) slots[i].addEventListener("click", copyLink);
      for (i = 0; i < cards.length; i++) (function (card) {
        card.addEventListener("click", function () {
          var who = N.players()[+card.getAttribute("data-pid")];
          if (!who || !D.profile) return;
          sfx();
          D.profile.openPanel(who.id === N.netId() ? D.profile.card() : (who.prof || null), { player: who, me: who.id === N.netId() });
        });
      })(cards[i]);
    }
    /* the mode (the host picks it) */
    var mb = $("lobby-mode"), modes = (m && m.modes) ? m.modes() : [], hm = N.hostMode ? N.hostMode() : "open", mh = "<span class='lb2lab'>MODE</span>";
    if (mb) {
      if (isHost) for (i = 0; i < modes.length; i++) mh += "<button type='button' data-mode='" + modes[i].id + "' class='" + (modes[i].id === hm ? "is-on" : "") + "' title='" + esc(modes[i].blurb) + "'>" + esc(modes[i].name) + "</button>";
      else { var md = null; for (i = 0; i < modes.length; i++) if (modes[i].id === hm) md = modes[i]; mh += "<span class='fixed'>" + esc(md ? md.name : "Open World") + "</span><span class='lb2lab'>&nbsp;THE HOST PICKS</span>"; }
      mb.innerHTML = mh;
      Array.prototype.forEach.call(mb.querySelectorAll("[data-mode]"), function (bt) { bt.addEventListener("click", function () { if (m && m.setMode) m.setMode(bt.getAttribute("data-mode")); sfx(); if (N.refresh) N.refresh(); renderLobby(); }); });
    }
    /* ready / start */
    var start = $("btn-lobby-start"), rb = $("btn-lobby-ready"), st = $("lobby-status");
    if (start) {
      start.hidden = !isHost;
      var all = others === othersReady;
      start.classList.toggle("is-go", all);
      start.textContent = running ? "JOIN" : "START";
    }
    if (rb) {
      rb.hidden = isHost;
      rb.classList.toggle("is-on", ready);
      rb.textContent = ready ? "✓ READY" : "READY";
    }
    if (st) {
      st.classList.remove("is-bad");
      if (!N.connected()) { st.textContent = "Not connected to the game server."; st.classList.add("is-bad"); }
      else if (isHost) st.textContent = !others ? "Pick your projection and egg, invite friends, then start. Friends can also drop into a game in progress."
        : othersReady === others ? "Everyone is ready. Start when you like." : (others - othersReady) + " still choosing. Start now and they drop in when they are ready.";
      else st.textContent = running ? "The game is running: press Ready to drop in." : ready ? "Ready. Waiting for the host to start…" : "Pick your projection and egg, then press Ready.";
    }
    restamp();
    startStage();
  }

  /* Ready: locks in your pick (game.js confirmEggAndStart -> online.js interceptStart) */
  function toggleReady() {
    var me = null, list = N.players(), i, m = M();
    for (i = 0; i < list.length; i++) if (list[i].id === N.netId()) me = list[i];
    sfx("pick");
    if (me && (me.state === "ready" || me.state === "playing")) { if (m && N.setPick) N.setPick(m.egg(), m.tamer()); renderLobby(); return; }
    if (m) m.start();
    renderLobby();
  }
  function hostStart() {
    var me = null, list = N.players(), i, m = M();
    for (i = 0; i < list.length; i++) if (list[i].id === N.netId()) me = list[i];
    sfx("pick");
    if (!me || me.state !== "ready") { if (m) m.start(); }
    N.startGame();
  }

  function copyLink() {
    var link = $("lobby-link"), st = $("lobby-status"), b = $("btn-lobby-copy");
    if (!link) return;
    function ok() {
      if (st) { st.textContent = "Invite link copied. Paste it to your friends."; st.classList.remove("is-bad"); }
      if (b) { b.classList.add("is-done"); var lb = b.querySelector("b"); if (lb) lb.textContent = "✓ LINK COPIED"; setTimeout(function () { b.classList.remove("is-done"); if (lb) lb.textContent = "COPY INVITE LINK"; }, 1800); }
      sfx("pick");
    }
    function manual() {
      try { link.focus(); link.select(); link.setSelectionRange(0, 9999); if (document.execCommand("copy")) return ok(); } catch (e) {}
      if (st) st.textContent = "Copy this link: " + link.value;
    }
    if (navigator.clipboard && navigator.clipboard.writeText && global.isSecureContext) navigator.clipboard.writeText(link.value).then(ok, manual);
    else manual();
  }

  /* ------------------------------------------------------------------ */
  /* In-game banner and roster                                           */
  /* ------------------------------------------------------------------ */
  function banner(text, bad) {
    var el = $("online-banner");
    if (!el) return;
    var key = text + "|" + (bad ? 1 : 0);
    if (key === lastBanner) return;
    lastBanner = key;
    el.hidden = !text;
    el.textContent = text || "";
    el.classList.toggle("is-bad", !!bad);
  }

  function roster() {
    var el = $("online-roster"), st = D.getState(), run = D.getRun && D.getRun();
    if (!el) {
      el = document.createElement("div");
      el.id = "online-roster";
      el.hidden = true;
      $("app").appendChild(el);
    }
    var show = N.active() && run && !run.ended && (st === "playing" || st === "levelup" || st === "paused" || st === "evolution");
    if (!show) { if (!el.hidden) { el.hidden = true; lastRoster = ""; } return; }
    var list = N.players().filter(function (p) { return p.state === "playing" || p.id === N.netId(); }), html = "", i, p, o, j, note;
    var meId = N.netId();
    for (i = 0; i < list.length; i++) {
      p = list[i]; note = "";
      if (p.id === meId) { if (run.downed) note = " (down)"; }
      else {
        for (j = 0, o = null; j < (run.others || []).length; j++) if (run.others[j].id === p.id || (p.host && run.others[j].id === "h")) o = run.others[j];
        if (!p.here) note = " (away)";
        else if (o && o.downed) note = " (down)";
      }
      html += '<span class="or-p' + (note ? " is-out" : "") + '"><i style="background:' + esc(p.color) + '"></i>' + esc(p.name) + note + "</span>";
    }
    if (html !== lastRoster) { lastRoster = html; el.innerHTML = html; }
    el.hidden = false;
  }

  function frame() {
    var t = Date.now();
    if (t - bannerAt < 150) return;
    bannerAt = t;
    var st = D.getState(), run = D.getRun && D.getRun(), v, text = "", bad = false, names;
    if (st === "lobby" && N.role() === "host") refreshInfo(false);
    if (status.text && t < status.until) { text = status.text; bad = status.bad; }
    else if (N.active() && run && !run.ended) {
      v = N.view() || {};
      if (run.downed && st === "playing") {
        var pr = v.rv && v.rv[N.netId()];
        text = pr ? "A friend is reviving your partner… " + Math.round(pr * 100) + "%" : "Your partner is down. A friend can revive it (hold next to it) — or it gets back up after the next Digi Farm visit.";
        bad = !pr;
      } else if (v.ph && st === "playing") {
        names = (v.fw || []).map(function (id) { var p = N.playerInfo(id); return p ? p.name : null; }).filter(Boolean);
        text = names.length ? "Waiting at the Digi Farm for " + names.join(", ") + "…" : "Waiting for everyone at the Digi Farm…";
      } else if (st === "paused") text = "Online: the fight keeps going while this menu is open.";
    }
    banner(text, bad);
    roster();
  }

  /* ------------------------------------------------------------------ */
  function init() {
    var b;
    if ((b = $("btn-online-host"))) b.addEventListener("click", hostClick);
    if ((b = $("btn-online-join"))) b.addEventListener("click", openJoin);
    if ((b = $("btn-join-go"))) b.addEventListener("click", joinGo);
    if ((b = $("btn-join-back"))) b.addEventListener("click", function () { sfx(); D.setState("title"); });
    if ((b = $("btn-lobby-copy"))) b.addEventListener("click", copyLink);
    if ((b = $("btn-lobby-share"))) b.addEventListener("click", function () {
      var link = $("lobby-link");
      if (navigator.share && link) navigator.share({ title: "Digi Night", text: "Join my game!", url: link.value }).catch(function () {});
    });
    if ((b = $("btn-lobby-start"))) b.addEventListener("click", hostStart);
    if ((b = $("btn-lobby-ready"))) b.addEventListener("click", toggleReady);
    if ((b = $("lobby-tamer-prev"))) b.addEventListener("click", function () { stepTamer(-1); });
    if ((b = $("lobby-tamer-next"))) b.addEventListener("click", function () { stepTamer(1); });
    if ((b = $("lobby-egg-prev"))) b.addEventListener("click", function () { stepEgg(-1); });
    if ((b = $("lobby-egg-next"))) b.addEventListener("click", function () { stepEgg(1); });
    if ((b = $("lobby-stage"))) b.addEventListener("click", function () { stepTamer(1); });
    if ((b = $("btn-lobby-leave"))) b.addEventListener("click", function () { sfx(); N.leave("lobby"); D.setState("title"); });
    if ((b = $("lobby-link"))) b.addEventListener("focus", function () { try { this.select(); } catch (e) {} });
    ["join-code", "join-name"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); joinGo(); } });
    });
    if ((b = $("join-code"))) b.addEventListener("input", function () { this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); });

    N.on("change", function () { if (D.getState() === "lobby") renderLobby(); });
    N.on("state", function (s) {
      if (s === "lobby") { refreshInfo(true); renderLobby(); }
      if (s === "title" && inviteCode && !N.role()) {
        titleNote("You're invited to room " + inviteCode + ". Tap Join Game.");
        /* Opened from an invite link: the first title screen goes straight to Join. */
        if (!autoJoined) { autoJoined = true; setTimeout(function () { if (D.getState() === "title") openJoin(); }, 0); }
      }
    });
    N.on("status", function (m) { status.text = m.text; status.bad = m.bad; status.until = Date.now() + (m.secs || 4) * 1000; bannerAt = 0; });
    N.on("frame", frame);

    /* Closing or reloading the tab just drops the connection: the host keeps
     * a friend's partner for a while so they can come straight back. */
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window);
