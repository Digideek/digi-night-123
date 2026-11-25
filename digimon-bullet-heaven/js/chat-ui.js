/* Digi Night — chat (17z33). Online only: in the lobby and in a run.
 *
 *   the lobby   a chat box under the player list. Enter (anywhere on the screen) starts typing,
 *               Enter sends, Esc stops typing.
 *   in a run    Enter opens a line at the bottom left; Enter sends it, Esc drops it. Everyone in the
 *               run sees every message there, however far apart they are: the newest few lines,
 *               each fading after a while (all of them stay up while you're typing). While the line
 *               is open your tamer stands still (the keys are typing); a controller still moves.
 *               On a touch screen a small chat button opens it.
 *   codes       a line starting with "/" typed in the lobby is never sent: it's checked here, on
 *               this device (a secret projection is unlocked this way).
 * The messages go through the host (net/online.js sendChat: checked, length-capped, rate-limited,
 * stamped with the sender's name and colour) and on to everyone.
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});
  if (typeof document === "undefined") return;
  function $(id) { return document.getElementById(id); }
  function N() { return D.online || null; }
  function st() { return D.getState ? D.getState() : ""; }
  function inRoom() { var n = N(); return !!(n && n.role && n.role()); }
  function inRun() { var n = N(); return !!(n && n.active && n.active()) && (st() === "playing" || st() === "paused"); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function line(m) {
    if (m.sys) return "<div class='chat-line is-sys'>" + esc(m.text) + "</div>";
    return "<div class='chat-line'><b style='color:" + esc(m.col || "#ffd23a") + "'>" + esc(m.name || "Tamer") + "</b> " + esc(m.text) + "</div>";
  }
  var FADE = 9000, SHOW = 6;

  /* ---------- slash codes (17z33): typed in the lobby chat, never sent to anyone ----------
   * Kept as a hash, not the words, so the code isn't sitting in the page's source. */
  function hash(t) { var x = 0x811c9dc5, i; for (i = 0; i < t.length; i++) { x ^= t.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; } return x.toString(36); }
  var CODES = { h74k62: { tamer: "smoke", text: "Unlocked a secret projection! He's on your projection picker now, on this device, for good." } };
  function localLine(text) { var m = { sys: 1, text: text, seen: Date.now() }; lines.push(m); if (lines.length > 40) lines.shift(); paintLobby(lines); paintGame(); }
  function slash(text) {
    var c = CODES[hash(text.trim().toLowerCase())];
    if (!c) { localLine("Nothing happens."); return; }
    if (D.sprites && D.sprites.tamerSecretOpen && D.sprites.tamerSecretOpen(c.tamer)) { localLine("You've already got that one."); return; }
    if (D.sprites && D.sprites.unlockTamer) D.sprites.unlockTamer(c.tamer);
    localLine(c.text);
    if (D.menu && D.menu.setTamer) D.menu.setTamer(c.tamer);                    /* and put him on, so you see him at once */
    if (D.audio && D.audio.sfx) { try { D.audio.sfx("base"); } catch (e) {} }
    if (D.onlineUi && D.onlineUi.picked) D.onlineUi.picked();                       /* everyone in the room sees him */
  }
  function say(text) {
    if (!text.trim()) return;
    if (text.trim().charAt(0) === "/") { slash(text); return; }                   /* commands stay on this screen */
    if (N()) N().sendChat(text);
  }

  /* ---------- the lobby box ---------- */
  var lob = null;
  function buildLobby() {
    var side = document.querySelector("#lobby-panel .lobby2-side");
    if (lob || !side) return;
    lob = document.createElement("div"); lob.className = "lobby2-chat"; lob.id = "lobby-chat";
    lob.innerHTML = "<div class='chat-log' id='lobby-chat-log'><div class='chat-line is-sys'>Say hi! Press Enter to chat.</div></div>" +
      "<input type='text' id='lobby-chat-in' maxlength='140' autocomplete='off' spellcheck='false' placeholder='Press Enter to chat'>";
    side.appendChild(lob);
    var inp = $("lobby-chat-in");
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); say(inp.value); inp.value = ""; }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); inp.value = ""; inp.blur(); }
    });
  }
  function paintLobby(all) {
    var lg = $("lobby-chat-log");
    if (!lg) return;
    lg.innerHTML = all.length ? all.map(line).join("") : "<div class='chat-line is-sys'>Say hi! Press Enter to chat.</div>";
    lg.scrollTop = lg.scrollHeight;
  }

  /* ---------- the in-run line ---------- */
  var box = null, log = null, inp = null, btn = null, open = false, lines = [];
  function buildGame() {
    if (box) return;
    box = document.createElement("div"); box.id = "game-chat";
    box.innerHTML = "<div class='chat-log' id='game-chat-log'></div><div class='chat-bar' hidden><span>Say:</span><input type='text' id='game-chat-in' maxlength='140' autocomplete='off' spellcheck='false'><small>Enter to send · Esc to cancel</small></div>";
    ($("app") || document.body).appendChild(box);
    log = $("game-chat-log"); inp = $("game-chat-in");
    inp.addEventListener("keydown", function (e) {
      e.stopPropagation();
      if (e.key === "Enter") { e.preventDefault(); var v = inp.value; closeLine(); if (v.trim().charAt(0) === "/") localLine("Codes only work in the lobby chat."); else say(v); }
      else if (e.key === "Escape") { e.preventDefault(); closeLine(); }
    });
    inp.addEventListener("blur", function () { if (open) setTimeout(function () { if (open && document.activeElement !== inp) closeLine(); }, 0); });
    btn = document.createElement("button"); btn.type = "button"; btn.id = "game-chat-btn"; btn.textContent = "💬"; btn.title = "Chat";
    btn.addEventListener("click", function () { if (open) closeLine(); else openLine(); });
    ($("app") || document.body).appendChild(btn);
  }
  function openLine() {
    buildGame();
    open = true;
    if (D.input && D.input.releaseKeys) D.input.releaseKeys();          /* your tamer stops: the keys are typing now */
    box.querySelector(".chat-bar").hidden = false; box.classList.add("is-open");
    inp.value = ""; inp.focus();
    paintGame();
  }
  function closeLine() {
    open = false;
    if (!box) return;
    box.querySelector(".chat-bar").hidden = true; box.classList.remove("is-open");
    inp.value = ""; inp.blur();
    paintGame();
  }
  function paintGame() {
    if (!log) return;
    var t = Date.now(), show = open ? lines.slice(-12) : lines.filter(function (m) { return t - m.seen < FADE; }).slice(-SHOW);
    log.innerHTML = show.map(function (m) {
      var age = t - m.seen, op = open ? 1 : Math.max(0, Math.min(1, (FADE - age) / 1500));
      return line(m).replace("class='chat-line", "style='opacity:" + op.toFixed(2) + "' class='chat-line");
    }).join("");
  }

  /* ---------- messages ---------- */
  function hook() {
    var n = N();
    if (!n || hook.done) return;
    hook.done = true;
    n.on("chat", function (m) {
      m = Object.assign({ seen: Date.now() }, m);
      lines.push(m); if (lines.length > 40) lines.shift();
      if (D.audio && D.audio.sfx && !m.sys) { try { D.audio.sfx("ui"); } catch (e) {} }
      paintLobby(lines); paintGame();
    });
    n.on("chatlog", function (list) {
      lines = list.map(function (m) { return Object.assign({ seen: 0 }, m); });
      paintLobby(lines);
    });
  }

  /* Enter starts typing (in the lobby or a run, online only) */
  global.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" || e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
    var tg = e.target && e.target.tagName;
    if (tg === "INPUT" || tg === "TEXTAREA") return;
    if (!inRoom()) return;
    if (st() === "lobby") {
      buildLobby(); hook();
      var li = $("lobby-chat-in");
      if (li) { e.preventDefault(); e.stopImmediatePropagation(); li.focus(); }
    } else if (st() === "playing" && inRun()) {
      hook(); e.preventDefault(); e.stopImmediatePropagation(); openLine();
    }
  }, true);

  /* every frame: build what's needed, show / hide, fade old lines */
  var acc = 0, lastRoom = false;
  function tick(dt) {
    var room = inRoom(), s = st();
    if (room) { hook(); if (s === "lobby") buildLobby(); }
    if (room !== lastRoom) { lastRoom = room; if (!room) { lines = []; paintLobby(lines); if (open) closeLine(); } }
    if (lob) lob.hidden = !room;
    var game = room && inRun();
    if (game) buildGame();
    if (box) {
      box.hidden = !game;
      if (!game && open) closeLine();
      btn.hidden = !game || !(D.input && D.input.touchMode);
    }
    acc += dt;
    if (acc > 0.25) { acc = 0; if (game && !open) paintGame(); }
  }
  D.chat = { tick: tick, open: openLine, close: closeLine, isOpen: function () { return open; } };
})(typeof window !== "undefined" ? window : this);
