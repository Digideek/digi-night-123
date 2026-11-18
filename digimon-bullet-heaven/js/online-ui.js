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
      D.setState("tamer");
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
      D.setState("tamer");
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
    var box = document.querySelector("#lobby-invite .lobby-code-box");
    if (box && !$("lobby-name")) {
      var lab = document.createElement("label");
      lab.className = "join-field lobby-name-field";
      lab.innerHTML = '<span>Your name</span><input type="text" id="lobby-name" maxlength="14" autocomplete="off" spellcheck="false">';
      box.appendChild(lab);
      $("lobby-name").addEventListener("change", function () {
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

  function paintCard(cv, pl) {
    var c = cv.getContext("2d"), list = D.EGGS || [], i, frame = null;
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, cv.width, cv.height);
    if (!D.sprites) return;
    try {
      if (pl.tamerId && D.sprites.drawTamer) D.sprites.drawTamer(c, 24, 58, 1, 0, false, false, false, "down", pl.tamerId);
      for (i = 0; i < list.length; i++) if (list[i].id === pl.line) frame = list[i].frame;
      if (frame && D.sprites.drawEgg) D.sprites.drawEgg(c, frame, 58, 58, 0, false, false);
    } catch (e) {}
  }

  function renderLobby() {
    var role = N.role();
    if (!role) return;
    ensureLobbyExtras();
    var list = N.players(), meId = N.netId(), i, pl, html = "", tag, cls;
    var running = N.running(), isHost = role === "host";
    var title = $("lobby-title"), sub = $("lobby-sub"), codeEl = $("lobby-code"), link = $("lobby-link"), note = $("lobby-note");
    if (title) { title.setAttribute("data-px", isHost ? "YOUR ROOM" : "ONLINE LOBBY"); title.removeAttribute("aria-label"); }
    if (sub) sub.textContent = isHost
      ? "Send the invite link to your friends. They open it in a browser — nothing to download."
      : "You're in. The game begins when the host starts it.";
    if (codeEl) { codeEl.setAttribute("data-px", N.code() || "----"); codeEl.removeAttribute("aria-label"); }
    var base = inviteBase();
    if (link) link.value = base.url + "/?room=" + N.code();
    var pw = $("lobby-public-wrap"), pin = $("lobby-public");
    if (note) {
      if (!isHost) note.textContent = "Anyone with this link can join until the game is full (6 players).";
      else if (base.pub) note.innerHTML = "<b>Works anywhere.</b> Friends can join from any network while this computer and the server window stay on.";
      else if (base.loopback) note.innerHTML = "<b>This computer only.</b> The server did not report a network address.";
      else note.innerHTML = "<b>Home network only.</b> This link works for people on your Wi-Fi. For friends somewhere else you need a tunnel or port forwarding (HOSTING.md explains both); the address fills in here on its own, or paste it below.";
    }
    if (pw) pw.hidden = !isHost || (base.pub && base.from !== "you");
    if (pin && document.activeElement !== pin) pin.value = store("dbh_public_url");
    var nm = $("lobby-name");
    if (nm && document.activeElement !== nm) nm.value = N.name();
    var share = $("btn-lobby-share");
    if (share) share.hidden = !navigator.share;

    for (i = 0; i < 6; i++) {
      pl = list[i];
      if (!pl) { html += '<button type="button" class="lobby-player is-empty" data-invite="1">+ Invite</button>'; continue; }
      if (!pl.here) { tag = "Away"; cls = ""; }
      else if (pl.state === "playing") { tag = pl.host ? "Host · in game" : "In game"; cls = pl.host ? " is-host" : ""; }
      else if (pl.state === "ready") { tag = pl.host ? "Host · ready" : "Ready"; cls = pl.host ? " is-host" : ""; }
      else { tag = pl.host ? "Host · choosing" : "Choosing…"; cls = pl.host ? " is-host" : ""; }
      var nAch = pl.prof && pl.prof.a ? pl.prof.a.length : 0;
      html += '<div class="lobby-player' + (pl.id === meId ? " is-me" : "") + '" data-pid="' + i + '" title="See profile" style="border-left-color:' + esc(pl.color) + '">' +
        '<canvas width="76" height="64" data-i="' + i + '"></canvas>' +
        '<div class="who"><div class="nm">' + esc(pl.name) + (pl.id === meId ? " (you)" : "") + '</div><div class="tg' + cls + '">' + tag + '</div>' +
        '<div class="st">\u2605 ' + nAch + '</div></div></div>';
    }
    var box = $("lobby-players");
    if (box) {
      box.innerHTML = html;
      var cvs = box.querySelectorAll("canvas");
      for (i = 0; i < cvs.length; i++) paintCard(cvs[i], list[+cvs[i].getAttribute("data-i")]);
      /* empty slots invite; filled ones open that player's profile */
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
    var start = $("btn-lobby-start"), st = $("lobby-status");
    var others = list.filter(function (p) { return p.id !== meId && p.here; });
    var ready = others.filter(function (p) { return p.state === "ready" || p.state === "playing"; }).length;
    if (start) start.hidden = !isHost;
    if (st) {
      st.classList.remove("is-bad");
      if (!N.connected()) { st.textContent = "Not connected to the game server."; st.classList.add("is-bad"); }
      else if (isHost) st.textContent = others.length ? (ready + " of " + others.length + " friend" + (others.length === 1 ? "" : "s") + " ready. Anyone still choosing drops in as soon as they finish.") : "Waiting for friends. You can also start now — they can join a game in progress.";
      else st.textContent = running ? "The game is running — you'll drop in any second." : "Waiting for the host to start…";
    }
    restamp();
  }

  function copyLink() {
    var link = $("lobby-link"), st = $("lobby-status");
    if (!link) return;
    function ok() { if (st) { st.textContent = "Invite link copied. Paste it to your friends."; st.classList.remove("is-bad"); } sfx("pick"); }
    function manual() {
      try { link.focus(); link.select(); link.setSelectionRange(0, 9999); if (document.execCommand("copy")) return ok(); } catch (e) {}
      if (st) st.textContent = "Select the link above and copy it.";
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
    if ((b = $("btn-lobby-start"))) b.addEventListener("click", function () { sfx("pick"); N.startGame(); });
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
