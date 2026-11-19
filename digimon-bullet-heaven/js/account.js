/* Digi Night — player accounts (the browser side; accounts-server.js is the other).
 *
 * When the game is served by a server with accounts on (api/info says so),
 * you sign in with a username and password before anything else, and your
 * save lives on the server: it is fetched when you sign in and sent back as
 * you play, so it is the same on any computer. Opened as a file, or from a
 * home server without accounts, none of this runs and the game keeps its
 * save in the browser as before.
 *
 *   "the save"  every key the game keeps in this browser (dbh_* and dn_*),
 *               except the things that belong to the device (LOCAL below).
 *   signing in  replaces what this browser holds with the account's save and
 *               reloads. A new account takes what the browser already holds,
 *               so a profile made before accounts existed is not lost.
 *   syncing     every 15 s, and when the tab is hidden or closed, if anything
 *               changed. The server counts saves (rev): if another device has
 *               saved since this one loaded, this one stops and asks you to
 *               reload instead of overwriting it.
 *   tester mode never syncs (js/tester.js).
 */
(function (global) {
  "use strict";
  var KEY = "dn_account", OURS = /^(dbh|dn)_/, EVERY = 15000;
  var LOCAL = { dn_account: 1, dn_tester_backup_v1: 1, dbh_dev_unlock_v1: 1, dn_music_on: 1, dbh_reduced_fx: 1 };
  var A = null, on = false, kept = true, lastSent = null, stale = false, busy = false, box = null;

  function D() { return (global.DBH = global.DBH || {}); }
  function ls() { try { return global.localStorage || null; } catch (e) { return null; } }
  function readA() { try { return JSON.parse(ls().getItem(KEY) || "null"); } catch (e) { return null; } }
  function writeA() { try { if (A) ls().setItem(KEY, JSON.stringify(A)); else ls().removeItem(KEY); } catch (e) {} }
  function testing() { var T = D().tester; return !!(T && T.isOn && T.isOn()); }

  function collect() {
    var s = ls(), out = {}, i, k;
    if (!s) return out;
    for (i = 0; i < s.length; i++) { k = s.key(i); if (OURS.test(k) && !LOCAL[k]) out[k] = s.getItem(k); }
    return out;
  }
  function wipe() {
    var s = ls(), gone = [], i, k;
    if (!s) return;
    for (i = 0; i < s.length; i++) { k = s.key(i); if (OURS.test(k) && !LOCAL[k]) gone.push(k); }
    for (i = 0; i < gone.length; i++) s.removeItem(gone[i]);
  }
  function apply(save) {
    var s = ls(), k;
    wipe();
    for (k in (save || {})) if (OURS.test(k) && !LOCAL[k] && typeof save[k] === "string") { try { s.setItem(k, save[k]); } catch (e) {} }
  }
  function sorted(o) { var ks = Object.keys(o).sort(), out = {}, i; for (i = 0; i < ks.length; i++) out[ks[i]] = o[ks[i]]; return JSON.stringify(out); }

  function post(what, body) {
    return fetch("api/account/" + what, { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j.status = r.status; return j; }); });
  }

  /* ---- keeping the server up to date ---- */
  function sync(leaving) {
    var save, text;
    if (!on || !A || stale || testing() || (busy && !leaving)) return;
    save = collect(); text = sorted(save);
    if (text === lastSent || text === "{}") return;
    if (leaving && global.navigator && navigator.sendBeacon) {
      /* the tab is going: a beacon outlives it. The count moves on when the page next loads. */
      try { navigator.sendBeacon("api/account/save", new Blob([JSON.stringify({ token: A.token, rev: A.rev, save: save })], { type: "application/json" })); A.rev += 1; A.unsure = true; writeA(); lastSent = text; } catch (e) {}
      return;
    }
    busy = true;
    post("save", { token: A.token, rev: A.rev, save: save }).then(function (j) {
      busy = false;
      if (j.ok) { A.rev = j.rev; A.unsure = false; writeA(); lastSent = text; note(""); }
      else if (j.status === 409) { stale = true; note("This account was saved from another device. <button type='button' id='acct-reload'>Reload</button> to load it; nothing more is saved from this tab."); }
      else if (j.status === 401) { stale = true; note("You have been signed out. <button type='button' id='acct-reload'>Reload</button> to sign in again."); A = null; writeA(); }
    }, function () { busy = false; });
  }
  function note(html) {
    var n = document.getElementById("acct-note");
    if (!html) { if (n) n.remove(); return; }
    if (!n) { n = document.createElement("div"); n.id = "acct-note"; document.body.appendChild(n); }
    n.innerHTML = html;
    var b = document.getElementById("acct-reload"); if (b) b.addEventListener("click", function () { global.location.reload(); });
  }

  /* ---- the sign-in screen ---- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function screen(mode, msg, keepName) {
    var make = mode === "signup", stop, has = Object.keys(collect()).some(function (k) { return k === "dbh_profile_v1"; });
    var card = document.getElementById("profile-edit");
    if (card) card.remove();                       /* the "make a profile" card waits until you are signed in */
    if (!box) {
      box = document.createElement("div"); box.id = "acct-screen"; document.body.appendChild(box);
      stop = function (e) { e.stopPropagation(); };
      ["keydown", "keyup", "keypress", "mousedown", "mouseup", "pointerdown", "touchstart", "wheel", "click"].forEach(function (n) { box.addEventListener(n, stop); });
    }
    box.innerHTML =
      "<form class='acct-card' autocomplete='on'>" +
      "<div class='acct-logo'>DIGI NIGHT</div>" +
      "<div class='acct-tabs'><button type='button' data-mode='login' class='" + (make ? "" : "is-on") + "'>Log in</button><button type='button' data-mode='signup' class='" + (make ? "is-on" : "") + "'>Create account</button></div>" +
      "<label>Username<input id='acct-name' name='username' maxlength='14' autocomplete='username' value='" + esc(keepName || "") + "'></label>" +
      "<label>Password<input id='acct-pass' name='password' type='password' maxlength='100' autocomplete='" + (make ? "new-password" : "current-password") + "'></label>" +
      (make ? "<label>Password again<input id='acct-pass2' type='password' maxlength='100' autocomplete='new-password'></label>" : "") +
      "<div class='acct-msg'>" + esc(msg || "") + "</div>" +
      "<button type='submit' class='acct-go'>" + (make ? "Create account" : "Log in") + "</button>" +
      "<div class='acct-foot'>" + (make
        ? "3 to 14 letters, numbers, spaces, - or _. Password: 6 characters or more. There is no email on file, so a forgotten password cannot be recovered: write it down." + (has ? " The progress already in this browser goes into the new account." : "")
        : "Your save is kept on the server, so it is the same on any computer.") +
        (kept ? "" : " <b>This server has no storage attached yet: accounts will be lost when it is next updated.</b>") + "</div>" +
      "</form>";
    box.querySelector("form").addEventListener("submit", function (e) { e.preventDefault(); submit(make); });
    Array.prototype.forEach.call(box.querySelectorAll("[data-mode]"), function (b) { b.addEventListener("click", function () { screen(b.getAttribute("data-mode"), "", document.getElementById("acct-name").value); }); });
    setTimeout(function () { var f = document.getElementById(keepName ? "acct-pass" : "acct-name"); if (f) f.focus(); }, 30);
  }
  function submit(make) {
    var name = document.getElementById("acct-name").value.replace(/\s+/g, " ").trim(), pass = document.getElementById("acct-pass").value, p2 = make ? document.getElementById("acct-pass2").value : pass, local, body;
    function say(t) { var m = box.querySelector(".acct-msg"); if (m) m.textContent = t; }
    if (name.length < 3) return say("Type your username.");
    if (pass.length < 6) return say("Passwords need at least 6 characters.");
    if (make && pass !== p2) return say("The two passwords are not the same.");
    local = collect();
    body = { name: name, pass: pass };
    if (make && Object.keys(local).length) body.save = local;
    say(make ? "Creating your account…" : "Logging in…");
    post(make ? "signup" : "login", body).then(function (j) {
      if (!j.ok) return say(j.reason || "That did not work. Try again.");
      A = { name: j.name, token: j.token, rev: j.rev || 0 }; writeA();
      /* an account with a save replaces what this browser holds; an empty one keeps it (and sends it up next) */
      if (j.save) apply(j.save);
      else if (!make) wipe();
      try { ls().setItem("dbh_net_name", j.name); } catch (e) {}
      global.location.reload();
    }, function () { say("Could not reach the server. Check your connection and try again."); });
  }

  function start(resend) {
    on = true;
    lastSent = A.rev > 0 && !resend ? sorted(collect()) : null;
    global.setInterval(function () { sync(false); }, EVERY);
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") sync(true); });
    global.addEventListener("pagehide", function () { sync(true); });
    sync(false);
  }
  function boot() {
    API.pending = true;
    fetch("api/info", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (info) {
      API.pending = false;
      if (!info || !info.accounts) return;          /* no accounts here: the save stays in the browser */
      kept = info.accountsKept !== false;
      API.enabled = true;
      A = readA();
      if (!A || !A.token) { on = true; A = null; return screen("login"); }
      post("me", { token: A.token }).then(function (j) {
        if (j.status === 401) { A = null; writeA(); wipe(); on = true; return screen("login", "Please log in again."); }
        if (!j.ok) return start();                   /* server hiccup: play on, keep trying to save */
        /* a parting save from this browser never arrived: nothing changed up there, so send it again */
        if (A.unsure && j.rev === A.rev - 1) { A.rev = j.rev; A.unsure = false; writeA(); on = true; lastSent = null; return start(true); }
        /* (after a parting save we cannot be sure it landed, so look even when the counts agree) */
        if (j.rev !== A.rev || A.unsure) {
          /* saved somewhere else since (or a parting save from here landed): take the server's copy */
          return post("load", { token: A.token }).then(function (l) {
            var mine = sorted(collect());
            if (!l.ok) return start();
            A.rev = l.rev; A.unsure = false; writeA();
            if (l.save && sorted(l.save) !== mine) { apply(l.save); return global.location.reload(); }
            start();
          });
        }
        start();
      }, function () { start(); });
    }, function () { API.pending = false; });
  }

  var API = {
    enabled: false, pending: false,
    on: function () { return !!(API.enabled && A); },
    name: function () { return A ? A.name : ""; },
    sync: function () { sync(false); },
    logout: function () {
      var t = A && A.token, done = function () { A = null; writeA(); wipe(); global.location.reload(); };
      if (!t) return done();
      stale = false; busy = false;
      /* one last save, then forget this browser */
      var save = collect(), go = function () { post("logout", { token: t }).then(done, done); };
      if (testing() || sorted(save) === "{}") return go();
      post("save", { token: t, rev: A.rev, save: save }).then(go, go);
    },
    password: function (old, pass) { return post("password", { token: A && A.token, old: old, pass: pass }); },
    _collect: collect, _apply: apply
  };
  D().account = API;
  if (typeof document === "undefined") return;
  document.addEventListener("DOMContentLoaded", function () { D().account = API; if (/^https?:$/.test(global.location.protocol)) boot(); });
})(typeof window !== "undefined" ? window : globalThis);
