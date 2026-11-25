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
  /* 17z33: a board for each mode too (Story, Night Siege, Versus, Duel); the first ones are Survival's */
  var ORDER = ["weekly", "ranked", "level", "mega", "time", "lords", "pvp", "story", "siege", "versus", "duel"];
  var TAB = { weekly: "Weekly", ranked: "Ranked", level: "Level", mega: "Fastest Mega", time: "Survival", lords: "Lords", pvp: "PvP", story: "Story", siege: "Night Siege", versus: "Versus", duel: "Duel" };
  var ABOUT = { story: "Fastest to finish the story.", siege: "Most nights held in one Night Siege run.", versus: "Versus matches won, all time.", duel: "Duels are just for fun: no ranking, only your own record.",
    weekly: "Best score on this week's map.", ranked: "Best Ranked score.", level: "Highest job level in a Survival run.", mega: "Fastest to Mega in a Survival run.", time: "Longest Survival run.", lords: "Most lords beaten in a Survival run.", pvp: "PvP wins in Survival, all time." };
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
  /* what a best was done with: the partner, and its Hatchery generation */
  function tagText(t) {
    var sp = t && D.SPECIES && D.SPECIES[t.form];
    if (!sp) return "";
    return sp.name + (t.gen ? " · Hatchery Gen " + t.gen : "");
  }
  function show(id, v) {
    if (id === "mega") return clock(v);
    if (id === "time") return clock(v);
    if (id === "level") return "Lv " + v;
    if (id === "story") return clock(v);
    if (id === "siege") return v + " night" + (v === 1 ? "" : "s");
    if (id === "versus" || id === "duel") return v + " win" + (v === 1 ? "" : "s");
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
    if (j.duel) return "Your duel record: " + j.duel.wins + " won, " + j.duel.losses + " lost.";
    for (k in (j.placed || {})) if (j.placed[k]) bits.push(TAB[k] + " #" + j.placed[k]);
    return "Score " + j.score + (bits.length ? ". On the boards: " + bits.join(", ") + "." : ".") + (j.season && j.season.added ? " +" + j.season.added + " for " + biome(j.season.faction) + " this season." : "");
  }

  /* ---------- the League window (17z33, Isaac: "pretty, in your face, a lot going on") ----------
   * A full-screen hall: a drifting starfield and light beams behind, a shimmering title, a row of chunky
   * emblem tabs (each mode its own colour and medal), a podium for the top three with their Digimon
   * standing on it (gold, silver, bronze stands, each with its place as a big number, the winner under
   * a pulsing crown), your own banner, the rest of the board sliding in, and the faction season as a
   * tug-of-war of biome bars. Places are numbers and words as well as colours. Reduced effects: still. */
  var MODE = {
    weekly: { col: "#ffd23a", icon: "seasons", group: "Survival" }, ranked: { col: "#ffd23a", icon: "rankStar", group: "Survival" },
    level: { col: "#ffd23a", icon: "levelBars", group: "Survival" }, mega: { col: "#ffd23a", icon: "megaCrown", group: "Survival" },
    time: { col: "#ffd23a", icon: "hourglass", group: "Survival" }, lords: { col: "#ffd23a", icon: "bigCrown", group: "Survival" },
    pvp: { col: "#ffd23a", icon: "axe", group: "Survival" }, story: { col: "#7cf0c0", icon: "sprout", group: "Story" },
    siege: { col: "#9a8cff", icon: "moon", group: "Night Siege" }, versus: { col: "#ff6a5a", icon: "versus", group: "Versus" },
    duel: { col: "#ff9a3a", icon: "swords", group: "Duel" }
  };
  var FAC_COL = { plains: "#9ad860", forest: "#2e9a4a", desert: "#e8b84a", snow: "#bfe6ff", swamp: "#8aa040", volcano: "#ff6a3a", circuit: "#4ae0d8", glitch: "#d04aff" };
  var live = null;     /* the open window's animation: { raf, sprites: [{ cv, id, k }], stars } */
  function reduced() { return !!D.reducedFx; }
  function open() {
    var old = $("league"), box;
    if (old) old.parentNode.removeChild(old);
    box = document.createElement("div"); box.className = "lg" + (reduced() ? " is-still" : ""); box.id = "league";
    box.innerHTML = "<canvas class='lg-sky' id='lg-sky'></canvas><div class='lg-beams'><i></i><i></i><i></i></div>" +
      "<div class='lg-frame'><button type='button' class='lg-x' id='league-x' aria-label='Close'>&times;</button>" +
      "<header class='lg-head'><h2 class='lg-title'>LEAGUE</h2><p class='lg-week' id='lg-week'></p></header><div id='league-body' class='lg-body'><p class='lg-lead'>Loading the League…</p></div></div>";
    ($("app") || document.body).appendChild(box);
    function close() { stopAnim(); if (box.parentNode) box.parentNode.removeChild(box); document.removeEventListener("keydown", key); }
    function key(e) { if (e.key === "Escape") { close(); e.preventDefault(); e.stopPropagation(); } }
    $("league-x").addEventListener("click", close);
    box.addEventListener("click", function (e) { if (e.target === box) close(); });
    document.addEventListener("keydown", key);
    startAnim();
    if (!signedIn()) { $("league-body").innerHTML = "<div class='lg-locked'><b>The League needs an account.</b><span>Play on the online server and log in: every run you finish there can land on these boards. Runs played here don't count.</span></div>"; return; }
    get(true).then(function (j) { if ($("league-body")) paint(j); });
  }
  /* ---- the moving parts: stars drifting up, and the Digimon on the podium breathing ---- */
  function startAnim() {
    var cv = $("lg-sky"), c, W, H, stars = [], i, t0 = performance.now();
    if (!cv) return;
    live = { raf: 0, sprites: [] };
    function size() { W = cv.width = cv.clientWidth || global.innerWidth; H = cv.height = cv.clientHeight || global.innerHeight; }
    size();
    for (i = 0; i < (reduced() ? 30 : 140); i++) stars.push({ x: Math.random(), y: Math.random(), s: 1 + Math.random() * 2.5, v: 0.01 + Math.random() * 0.04, tw: Math.random() * 6, col: ["#ffffff", "#ffd23a", "#c8b8ff", "#7cf0c0", "#ff9ac8"][i % 5] });
    c = cv.getContext("2d");
    function frame(now) {
      if (!live || !cv.isConnected) return;
      var t = (now - t0) / 1000, k, st, a;
      if (cv.width !== cv.clientWidth) size();
      c.clearRect(0, 0, W, H);
      for (k = 0; k < stars.length; k++) {
        st = stars[k];
        if (!reduced()) { st.y -= st.v / 60; if (st.y < -0.02) { st.y = 1.02; st.x = Math.random(); } }
        a = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.6 + st.tw));
        c.globalAlpha = a; c.fillStyle = st.col;
        c.fillRect(Math.round(st.x * W), Math.round(st.y * H), Math.round(st.s), Math.round(st.s));
        if (st.s > 3 && a > 0.9) { c.globalAlpha = a * 0.5; c.fillRect(Math.round(st.x * W) - 3, Math.round(st.y * H) + 1, 9, 1); c.fillRect(Math.round(st.x * W) + 1, Math.round(st.y * H) - 3, 1, 9); }
      }
      c.globalAlpha = 1;
      for (k = 0; k < live.sprites.length; k++) drawSprite(live.sprites[k], t);
      live.raf = requestAnimationFrame(frame);
    }
    live.raf = requestAnimationFrame(frame);
  }
  function stopAnim() { if (live && live.raf) cancelAnimationFrame(live.raf); live = null; }
  function drawSprite(sp, t) {
    var c = sp.cv.getContext("2d"), sh = null, fi = Math.floor(t * 3 + sp.k) % 2, sc, bob = reduced() ? 0 : Math.sin(t * 2.2 + sp.k) * 2;
    c.imageSmoothingEnabled = false; c.clearRect(0, 0, sp.cv.width, sp.cv.height);
    try { sh = sp.id && D.sprites && D.sprites.getSheet ? D.sprites.getSheet(sp.id, "idle", fi, false) : null; } catch (e) { sh = null; }
    if (!sh || !sh.width) {
      /* nobody (or a form with no sprite): a question mark */
      c.fillStyle = "rgba(255,255,255,0.18)"; c.font = "bold " + Math.round(sp.cv.height * 0.5) + "px monospace"; c.textAlign = "center"; c.fillText("?", sp.cv.width / 2, sp.cv.height * 0.7);
      return;
    }
    sc = Math.min((sp.cv.width - 8) / sh.width, (sp.cv.height - 10) / sh.height);
    sc = Math.max(1, Math.floor(sc * 2) / 2);
    c.drawImage(sh, Math.round((sp.cv.width - sh.width * sc) / 2), Math.round(sp.cv.height - 4 - sh.height * sc + bob), Math.round(sh.width * sc), Math.round(sh.height * sc));
  }
  function medalCanvas(cls, icon, tier, size) { return "<canvas class='" + cls + "' width='" + size + "' height='" + size + "' data-icon='" + icon + "' data-tier='" + tier + "'></canvas>"; }
  function paintMedals(root) {
    Array.prototype.forEach.call(root.querySelectorAll("canvas[data-icon]"), function (cv) { if (D.iconArt && D.iconArt.motif) D.iconArt.motif(cv, cv.getAttribute("data-icon"), { tier: +cv.getAttribute("data-tier") || 3 }); });
  }
  function ordinal(n) { var s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function paint(j) {
    var body = $("league-body"), h = "", b, i, me, s, mx, k, wk, M, list, mine, pod, tot;
    if (!body) return;
    if (live) live.sprites = [];
    if (!j) { body.innerHTML = "<div class='lg-locked'><b>The League couldn't be reached.</b><span>Try again in a moment.</span></div>"; return; }
    me = j.me || {}; M = MODE[tab] || MODE.weekly;
    wk = j.week.replace("-W", " · Week ");
    if ($("lg-week")) $("lg-week").textContent = wk;
    body.style.setProperty("--mc", M.col);
    if (me.claim) h += "<div class='lg-claim'><span>" + esc(me.claim.why) + "</span><button type='button' class='lg-btn' id='league-claim'>Claim " + me.claim.bits + " DigiCoins</button></div>";
    /* the emblem tabs, grouped by mode */
    h += "<nav class='lg-tabs'>";
    var lastGroup = null;
    for (i = 0; i < ORDER.length; i++) {
      k = ORDER[i]; var mk = MODE[k];
      if (mk.group !== lastGroup) { if (lastGroup) h += "</div>"; h += "<div class='lg-group' style='--gc:" + mk.col + "'><small>" + mk.group + "</small>"; lastGroup = mk.group; }
      h += "<button type='button' data-tab='" + k + "' class='lg-tab" + (k === tab ? " is-on" : "") + "' style='--tc:" + mk.col + "'>" + medalCanvas("lg-tab-ico", mk.icon, k === tab ? 4 : 3, 32) + "<span>" + TAB[k] + "</span></button>";
    }
    h += "</div></nav>";
    h += "<div class='lg-board'><div class='lg-board-head'>" + medalCanvas("lg-board-ico", M.icon, 4, 56) + "<div><h3>" + esc(TAB[tab]) + "</h3><p>" + esc(ABOUT[tab] || "") + "</p></div></div>";
    if (tab === "duel") {
      /* duels are just for fun: your own record, as a big ring */
      var bw = (me.bests && me.bests.duelWins) || 0, bl = (me.bests && me.bests.duelLosses) || 0, pc = bw + bl ? Math.round(100 * bw / (bw + bl)) : 0;
      h += "<div class='lg-duel'><div class='lg-ring' style='--p:" + pc + "'><b>" + pc + "%</b><small>won</small></div><div class='lg-duel-n'><span><b>" + bw + "</b> win" + (bw === 1 ? "" : "s") + "</span><span><b>" + bl + "</b> loss" + (bl === 1 ? "" : "es") + "</span>" +
        (bw + bl ? "" : "<em>No duels yet. Pick Versus, then Duel, in an online lobby.</em>") + "</div></div></div>";
    } else {
      b = j.boards[tab]; list = (b && b.list) || [];
      /* the podium: 2nd, 1st, 3rd */
      pod = [[1, "silver"], [0, "gold"], [2, "bronze"]];
      h += "<div class='lg-podium'>";
      for (i = 0; i < pod.length; i++) {
        var e = list[pod[i][0]], pl = pod[i][0] + 1;
        h += "<div class='lg-step is-" + pod[i][1] + (e ? "" : " is-empty") + (e && e.name === me.name ? " is-me" : "") + "' style='--d:" + (i * 0.12) + "s'>" +
          (pl === 1 && e ? "<div class='lg-crown'></div>" : "") +
          "<canvas class='lg-mon' width='112' height='96' data-mon='" + (e && e.tag ? esc(e.tag.form) : "") + "' data-k='" + i + "'></canvas>" +
          "<div class='lg-name'>" + (e ? esc(e.name) : "Open spot") + "</div>" +
          "<div class='lg-val'>" + (e ? esc(show(tab, e.v)) : "—") + "</div>" +
          (e && tagText(e.tag) ? "<div class='lg-tagline'>" + esc(tagText(e.tag)) + "</div>" : "") +
          "<div class='lg-stand'><b>" + pl + "</b><small>" + ordinal(pl).slice(-2).toUpperCase() + "</small></div></div>";
      }
      h += "</div>";
      /* your banner */
      mine = me.places && me.places[tab];
      h += "<div class='lg-me" + (mine ? " is-on" : "") + "'><span class='lg-me-l'>YOU</span>" + (mine ? "<b class='lg-me-place'>#" + mine + "</b><span>" + (mine <= 3 ? "On the podium!" : "on this board") + "</span>" : "<span>Not on this board yet: " + esc(HOW[tab] || "play a run of this mode") + ".</span>") + "</div>";
      /* the rest */
      h += "<ol class='lg-list'>";
      if (!list.length) h += "<li class='is-none'>Nobody yet. The first run that counts takes the gold.</li>";
      for (i = 3; i < list.length; i++) h += "<li class='" + (list[i].name === me.name ? "is-me" : "") + "' style='--d:" + ((i - 3) * 0.04) + "s'><i>" + (i + 1) + "</i><span>" + esc(list[i].name) + (tagText(list[i].tag) ? "<small>" + esc(tagText(list[i].tag)) + "</small>" : "") + "</span><b>" + esc(show(tab, list[i].v)) + "</b></li>";
      h += "</ol></div>";
    }
    /* the faction season: a tug-of-war */
    s = j.season.list; mx = 1; tot = 0;
    for (i = 0; i < s.length; i++) { mx = Math.max(mx, s[i].pts); tot += s[i].pts; }
    h += "<section class='lg-season'><h3>Faction season <small>" + (me.backing ? "you back " + esc(biome(me.backing)) : "back a biome for the week") + "</small></h3>";
    h += "<div class='lg-tug'>";
    for (i = 0; i < j.factions.length; i++) { k = j.factions[i]; var p0 = 0, n; for (n = 0; n < s.length; n++) if (s[n].faction === k) p0 = s[n].pts; if (p0) h += "<i style='flex:" + p0 + ";background:" + (FAC_COL[k] || "#888") + "' title='" + esc(biome(k)) + " " + p0 + "'>" + (tot && p0 / tot >= 0.12 ? "<span>" + esc(biome(k)) + "</span>" : "") + "</i>"; }
    if (!tot) h += "<em>No land taken yet this week.</em>";
    h += "</div><div class='lg-facs'>";
    for (i = 0; i < j.factions.length; i++) {
      k = j.factions[i];
      var pts = 0; for (n = 0; n < s.length; n++) if (s[n].faction === k) pts = s[n].pts;
      h += "<div class='lg-fac" + (me.backing === k ? " is-me" : "") + (pts && pts === mx ? " is-top" : "") + "' style='--fc:" + (FAC_COL[k] || "#888") + "'><span>" + (pts && pts === mx ? "▲ " : "") + esc(biome(k)) + "</span><i style='width:" + Math.round(100 * pts / mx) + "%'></i><b>" + pts + "</b>" +
        (!me.backing && me.bests !== undefined ? "<button type='button' class='lg-back' data-fac='" + k + "'>Back</button>" : (me.backing === k ? "<em>yours</em>" : "")) + "</div>";
    }
    h += "</div><p class='lg-note'>Every run you finish adds the land your biome conquered (and 3 for each PvP win). The biggest at the end of the week pays its backers." + (j.lastSeason && j.lastSeason.list.length ? " Last week: " + esc(biome(j.lastSeason.list[0].faction)) + " won with " + j.lastSeason.list[0].pts + "." : "") + "</p></section>";
    body.innerHTML = h;
    paintMedals(body);
    if (live) Array.prototype.forEach.call(body.querySelectorAll("canvas[data-mon]"), function (cv) { live.sprites.push({ cv: cv, id: cv.getAttribute("data-mon"), k: +cv.getAttribute("data-k") * 1.3 }); });
    Array.prototype.forEach.call(body.querySelectorAll("[data-tab]"), function (t) { t.addEventListener("click", function () { tab = t.getAttribute("data-tab"); if (D.uiSfx) D.uiSfx("ui"); paint(j); }); });
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
  /* how to get on each board, for your banner */
  var HOW = { weekly: "play this week's map (one life) on the run setup screen", ranked: "play a Ranked run (one life, no CPUs)", level: "level up in a Survival run",
    mega: "reach Mega in a Survival run", time: "last as long as you can in Survival", lords: "beat biome lords in Survival", pvp: "win PvP fights in Survival",
    story: "finish the story", siege: "hold a night in Night Siege", versus: "win a Versus match" };
  /* for the profile: your bests and places */
  function mine(cb) { get(false).then(function (j) { cb(j && j.me ? j.me : null); }); }

  D.boards = { submit: submit, open: open, mine: mine, get: get, placedText: placedText, signedIn: signedIn, clock: clock };
})(typeof window !== "undefined" ? window : this);
