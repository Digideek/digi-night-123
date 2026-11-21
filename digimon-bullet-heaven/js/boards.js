/* Digi Night — the League: leaderboards, the weekly map, faction seasons (Nov 20).
 * The browser side of boards-server.js. Needs a signed-in account (js/account.js);
 * without one (the game opened as a file, or a home server without accounts) the
 * League says so and nothing is sent.
 *
 *   D.boards.submit(rec)  at the end of a run (game.js endRun): rec from modes-sim.js _runRecord
 *   D.boards.open()       the League window (hub button, profile)
 *   D.boards.mine(cb)     your bests and places, for the profile
 */
(function (global) {
  "use strict";
  var D = global.DBH = global.DBH || {};
  var cache = null, cacheAt = 0, tab = "weekly";
  var ORDER = ["weekly", "ranked", "level", "mega", "time", "lords", "pvp"];
  var TAB = { weekly: "Weekly", ranked: "Ranked", level: "Level", mega: "Fastest Mega", time: "Survival", lords: "Lords", pvp: "PvP" };
  var BIOME = { plains: "File Plains", forest: "Forest", desert: "Desert", snow: "Snow", swamp: "Swamp", volcano: "Volcano", circuit: "Circuit", glitch: "Glitch" };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clock(s) { s = Math.round(+s || 0); var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (x < 10 ? "0" : "") + x; }
  function biome(id) { var B = D.biomes && D.biomes.DEFS && D.biomes.DEFS[id]; return (B && B.name) || BIOME[id] || id; }
  function signedIn() { return !!(D.account && D.account.on && D.account.on()); }
  function token() { try { var a = JSON.parse(global.localStorage.getItem("dn_account") || "null"); return a && a.token; } catch (e) { return null; } }
  function post(what, body) {
    body = body || {}; body.token = token();
    return fetch("api/board/" + what, { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j.status = r.status; return j; }); });
  }
  function show(id, v) {
    if (id === "mega") return clock(v);
    if (id === "time") return clock(v);
    if (id === "level") return "Lv " + v;
    return String(v);
  }
  function get(force) {
    if (!signedIn()) return Promise.resolve(null);
    if (cache && !force && Date.now() - cacheAt < 20000) return Promise.resolve(cache);
    return post("get").then(function (j) { if (j && j.ok) { cache = j; cacheAt = Date.now(); } return j && j.ok ? j : null; }, function () { return null; });
  }

  /* ---------- the end of a run ---------- */
  function submit(rec) {
    if (!rec || !signedIn()) return Promise.resolve(null);
    if (D.tester && D.tester.isOn && D.tester.isOn()) return Promise.resolve(null);
    return post("submit", { rec: rec }).then(function (j) { cache = null; return j; }, function () { return null; });
  }
  /* a line for the run-over screen */
  function placedText(j) {
    var k, bits = [];
    if (!j || !j.ok) return "";
    for (k in (j.placed || {})) if (j.placed[k]) bits.push(TAB[k] + " #" + j.placed[k]);
    return "Score " + j.score + (bits.length ? ". On the boards: " + bits.join(", ") + "." : ".") + (j.season && j.season.added ? " +" + j.season.added + " for " + biome(j.season.faction) + " this season." : "");
  }

  /* ---------- the League window ---------- */
  function open() {
    var old = $("league"), box;
    if (old) old.parentNode.removeChild(old);
    box = document.createElement("div"); box.className = "profile-overlay"; box.id = "league";
    box.innerHTML = "<div class='profile-box is-wide league-box'><button type='button' class='profile-x' id='league-x' aria-label='Close'>&times;</button><h2>League</h2><div id='league-body'><p class='profile-lead'>Loading…</p></div></div>";
    ($("app") || document.body).appendChild(box);
    function close() { if (box.parentNode) box.parentNode.removeChild(box); document.removeEventListener("keydown", key); }
    function key(e) { if (e.key === "Escape") { close(); e.preventDefault(); e.stopPropagation(); } }
    $("league-x").addEventListener("click", close);
    box.addEventListener("click", function (e) { if (e.target === box) close(); });
    document.addEventListener("keydown", key);
    if (!signedIn()) { $("league-body").innerHTML = "<p class='profile-lead'>The League needs an account: play on the online server (Railway) and log in. Runs played here do not count.</p>"; return; }
    get(true).then(function (j) { if ($("league-body")) paint(j); });
  }
  function paint(j) {
    var body = $("league-body"), h = "", b, i, me, s, mx, k, wk;
    if (!body) return;
    if (!j) { body.innerHTML = "<p class='profile-lead'>The League could not be reached. Try again in a moment.</p>"; return; }
    me = j.me || {};
    wk = j.week.replace("-W", ", week ");
    h += "<p class='profile-lead'>" + esc(wk) + ". Weekly Map and Ranked are one-life runs; pick them on the run setup screen.</p>";
    if (me.claim) h += "<div class='league-claim'><span>" + esc(me.claim.why) + "</span><button type='button' class='profile-btn' id='league-claim'>Claim " + me.claim.bits + " DigiBits</button></div>";
    /* the boards */
    h += "<div class='league-tabs'>";
    for (i = 0; i < ORDER.length; i++) h += "<button type='button' data-tab='" + ORDER[i] + "' class='" + (ORDER[i] === tab ? "is-on" : "") + "'>" + TAB[ORDER[i]] + "</button>";
    h += "</div>";
    b = j.boards[tab];
    h += "<ol class='league-list'>";
    if (!b || !b.list.length) h += "<li class='is-none'>Nobody yet. Be the first.</li>";
    else for (i = 0; i < b.list.length; i++) h += "<li class='" + (b.list[i].name === me.name ? "is-me" : "") + "'><i>" + (i + 1) + "</i><span>" + esc(b.list[i].name) + "</span><b>" + esc(show(tab, b.list[i].v)) + "</b></li>";
    h += "</ol>";
    if (me.places && me.bests) h += "<p class='league-mine'>You: " + (me.places[tab] ? "#" + me.places[tab] : "not on this board yet") + "</p>";
    /* the faction season */
    s = j.season.list; mx = s.length ? s[0].pts : 1;
    h += "<h3>Faction season <small>" + (me.backing ? "you back " + esc(biome(me.backing)) : "back a biome") + "</small></h3>";
    h += "<p class='profile-lead'>Back one biome for the week. Every run you finish adds the land it conquered (and 3 for each PvP win). The biome with the most at the end of the week pays its backers.</p>";
    h += "<div class='league-season'>";
    for (i = 0; i < j.factions.length; i++) {
      k = j.factions[i];
      var pts = 0, n; for (n = 0; n < s.length; n++) if (s[n].faction === k) pts = s[n].pts;
      h += "<div class='league-fac" + (me.backing === k ? " is-me" : "") + "'><span>" + esc(biome(k)) + "</span><i style='width:" + Math.round(100 * pts / Math.max(1, mx)) + "%'></i><b>" + pts + "</b>" +
        (!me.backing && me.bests !== undefined ? "<button type='button' class='league-back' data-fac='" + k + "'>Back</button>" : "") + "</div>";
    }
    h += "</div>";
    if (j.lastSeason && j.lastSeason.list.length) h += "<p class='league-mine'>Last week: " + esc(biome(j.lastSeason.list[0].faction)) + " won with " + j.lastSeason.list[0].pts + ".</p>";
    body.innerHTML = h;
    Array.prototype.forEach.call(body.querySelectorAll("[data-tab]"), function (t) { t.addEventListener("click", function () { tab = t.getAttribute("data-tab"); paint(j); }); });
    Array.prototype.forEach.call(body.querySelectorAll("[data-fac]"), function (t) {
      t.addEventListener("click", function () {
        var f = t.getAttribute("data-fac");
        if (!global.confirm("Back " + biome(f) + " for the rest of this week? You can't change it until next week.")) return;
        post("back", { faction: f }).then(function () { get(true).then(paint); });
      });
    });
    if ($("league-claim")) $("league-claim").addEventListener("click", function () {
      this.disabled = true;
      post("claim").then(function (r) {
        if (r && r.ok && D.cosmetics && D.cosmetics.grantBits) D.cosmetics.grantBits(r.bits, "season");
        get(true).then(paint);
      });
    });
  }
  /* for the profile: your bests and places */
  function mine(cb) { get(false).then(function (j) { cb(j && j.me ? j.me : null); }); }

  D.boards = { submit: submit, open: open, mine: mine, get: get, placedText: placedText, signedIn: signedIn, clock: clock };
})(typeof window !== "undefined" ? window : this);
