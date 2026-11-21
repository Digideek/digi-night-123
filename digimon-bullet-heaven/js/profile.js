/* Profile, achievements and the profile card (Nov 16).
 *
 * One profile per browser: a name, a ghost, the date it was made, running
 * totals and achievements. It is created the first time the title screen
 * comes up and greets you from then on (the chip in the corner of the title
 * screen; click it for the full card, or to change name and ghost).
 *
 * Online, a short summary of it (card()) travels with you, so anyone in the
 * lobby can click your slot and see who they are playing with.
 *
 * Saved in localStorage under dbh_profile_v1, beside the game save. There
 * is no account server: the profile lives in this browser.
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});
  var KEY = "dbh_profile_v1";
  var P = null;

  /* the list and its rules are in js/badges.js */
  var ACH = (D.BADGES && D.BADGES.LIST) || [];
  var ACH_BY = {};
  ACH.forEach(function (a) { ACH_BY[a.id] = a; });
  /* profile pictures: the well-known partners of the first three series */
  var PICS = ["agumon", "gabumon", "biyomon", "tentomon", "palmon", "gomamon", "patamon", "gatomon", "veemon", "wormmon", "hawkmon", "armadillomon", "guilmon", "renamon", "terriermon", "salamon"];
  var STAGE_ACH = { Champion: "champion", Armor: "champion", Hybrid: "champion", Ultimate: "ultimate", Mega: "mega", "Mega+": "mega" };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function cleanName(s) { return String(s || "").replace(/[<>]/g, "").trim().slice(0, 14); }
  function load() {
    if (P !== null) return P;
    try { P = JSON.parse(global.localStorage.getItem(KEY) || "null"); } catch (e) { P = null; }
    if (!P || typeof P !== "object" || !P.name) { P = false; return P; }
    P.stats = P.stats || {}; P.ach = P.ach || {};
    return P;
  }
  function save() { try { if (P) global.localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} }
  function exists() { return !!load(); }
  function name() { return load() ? P.name : ""; }
  function ghosts() { return (D.sprites && D.sprites.getTamerList && D.sprites.getTamerList()) || [{ id: "byte", name: "Cyan" }]; }
  function ghostName(id) { var l = ghosts(), i; for (i = 0; i < l.length; i++) if (l[i].id === id) return l[i].name; return id || ""; }

  function picOf(c) { return (c && PICS.indexOf(c.pic) >= 0) ? c.pic : PICS[0]; }
  function create(nm, pic) {
    P = { name: cleanName(nm) || "Tamer", ghost: "byte", pic: PICS.indexOf(pic) >= 0 ? pic : PICS[0], created: Date.now(), stats: {}, ach: {} };
    try { var old = global.localStorage.getItem("dbh_net_name"); if (!cleanName(nm) && old) P.name = cleanName(old) || P.name; } catch (e) {}
    save(); announce();
    return P;
  }
  function setName(nm) { if (!load()) return; nm = cleanName(nm); if (!nm || nm === P.name) return; P.name = nm; save(); announce(); }
  function setGhost(g) { if (!load() || !g || g === P.ghost) return; P.ghost = g; save(); announce(); }
  /* tell the title chip and, online, everyone else */
  function announce() {
    try { global.localStorage.setItem("dbh_net_name", P.name); } catch (e) {}
    if (D.setTamer) D.setTamer(P.ghost);
    renderChip();
    var N = D.online;
    if (N && N.role && N.role()) { if (N.setName && N.name() !== P.name) N.setName(P.name); if (N.setProfile) N.setProfile(card()); }
  }

  /* ---------- achievements ---------- */
  function bump(k, n) { P.stats[k] = (P.stats[k] || 0) + (n == null ? 1 : n); }
  function award(id) {
    if (!load() || P.ach[id] || !ACH_BY[id]) return false;
    P.ach[id] = Date.now();
    save();
    toast(ACH_BY[id]);
    if (id.charAt(0) !== "b" || !/^b(25|50|100|all)$/.test(id)) metaSoon();
    var N = D.online;
    if (N && N.role && N.role() && N.setProfile) N.setProfile(card());
    return true;
  }
  var dirty = 0;
  /* what js/badges.js is allowed to touch */
  var api = {
    stats: function () { return P.stats; }, bump: function (k, n) { bump(k, n); }, award: function (id) { return award(id); },
    has: function (id) { return !!(P && P.ach[id]); }, count: function () { var n = 0, k; for (k in P.ach) if (ACH_BY[k]) n++; return n; },
    rank: function () { return rankNow().rank; }, lab: function () { return P.lab || {}; }, card: function () { return card(); }
  };
  var metaT = 0, inSync = false;
  function metaSoon() { if (!metaT && typeof setTimeout === "function") metaT = setTimeout(function () { metaT = 0; syncBadges(); }, 60); }
  /* totals and out-of-run things (rank, Lab, eggs, memories, trophies): hand out whatever is due */
  function syncBadges() {
    if (!load() || !D.BADGES || inSync) return;
    inSync = true;
    try { D.BADGES.ladders(api); D.BADGES.meta(api); } catch (e) {}
    inSync = false;
  }
  function onEvent(e, localId, run) {
    if (!load() || !e) return;
    onEventCore(e, localId, run);
    if (D.BADGES) { try { D.BADGES.onEvent(api, e, localId, run); } catch (err) {} }
  }
  /* every game event passes through here; it only counts what is ours */
  function onEventCore(e, localId, run) {
    var mine = e.id === localId, sp, st, k, en;
    if (e.type === "kill") {
      if (e.killer !== localId) return;
      bump("kos");
      k = P.stats.kos;
      if (k >= 100) award("ko100");
      if (k >= 1000) award("ko1000");
      if (k >= 10000) award("ko10000");
      if (e.boss) { bump("bosses"); award("boss"); if (run) run._rankBoss = (run._rankBoss || 0) + 1; }
      en = D.ENEMIES && D.ENEMIES[e.enemyType];
      if (en && /Mega/.test(en.stageDisplay || "") && !e.boss) { bump("megas"); award("megaslayer"); }
      if (++dirty >= 25) { dirty = 0; save(); }
      return;
    }
    if (!mine) return;
    if (e.type === "evolve" && e.kind !== "dna.revert") {
      award("evo");
      sp = D.SPECIES && D.SPECIES[e.to]; st = sp && (sp.stageKey || sp.stage);
      if (STAGE_ACH[st]) { award(STAGE_ACH[st]); if (st === "Ultimate" || st === "Mega" || st === "Mega+") award("champion"); if (st === "Mega" || st === "Mega+") award("ultimate"); }
      bump("evos"); save();
    } else if (e.type === "shiny" && e.first) { bump("shinies"); award("shiny"); save(); }
    else if (e.type === "dna.done") { bump("dna"); award("dna"); save(); }
    else if (e.type === "burst.start") { bump("bursts"); award("burst"); }
    else if (e.type === "evo.hold") award("hold");
    else if (e.type === "capture" && (e.ok || (e.res && e.res.ok))) { bump("catches"); award("catch"); save(); }
    else if (e.type === "unlock") award("egg");
  }
  function tick(run, state) {
    if (!P || !run || run.ended || state !== "playing") return;
    var S = D.SEASONS_CFG || {}, yearLen = (S.lengthSec || 360) * 4;
    if ((run.time || 0) >= yearLen) award("year");
    if (D.online && D.online.active && D.online.active() && (run.others || []).length && (run.time || 0) > 60) award("online");
    if (D.BADGES) D.BADGES.tick(api, run);
  }
  /* ---------- the Badges page: every badge, by kind, with progress on the counted ones ---------- */
  /* the medals (js/icon-art.js) */
  function paintBadges(root) {
    if (!D.iconArt || !root) return;
    var by = {}, i;
    for (i = 0; i < ACH.length; i++) by[ACH[i].id] = ACH[i];
    Array.prototype.forEach.call(root.querySelectorAll("canvas[data-badge]"), function (cv) { D.iconArt.badge(cv, by[cv.getAttribute("data-badge")], { got: !!cv.getAttribute("data-got") }); });
  }
  function openBadges() {
    if (!load()) return;
    syncBadges();
    var B = D.BADGES, old = $("badges-panel"), box, h, ci, i, b, got = 0, have, cur, pct, cg, ct, tiers = [0, 0, 0, 0, 0], tg = [0, 0, 0, 0, 0], list;
    if (!B) return;
    if (old) old.parentNode.removeChild(old);
    for (i = 0; i < ACH.length; i++) { tiers[ACH[i].tier]++; if (P.ach[ACH[i].id]) { got++; tg[ACH[i].tier]++; } }
    h = "<div class='profile-box is-wide badges-box'><button type='button' class='profile-x' id='badges-x' aria-label='Close'>&times;</button>" +
      "<h2>Badges <small>" + got + " / " + ACH.length + "</small></h2><div class='badge-bar'><i style='width:" + Math.round(100 * got / ACH.length) + "%'></i></div><div class='badge-tiers'>";
    for (i = 1; i <= 4; i++) h += "<span class='badge-chip is-t" + i + "'>" + B.TIER[i] + " " + tg[i] + " / " + tiers[i] + "</span>";
    h += "</div>";
    for (ci = 0; ci < B.CATS.length; ci++) {
      list = ACH.filter(function (x) { return x.cat === B.CATS[ci]; }); cg = 0; ct = list.length;
      for (i = 0; i < list.length; i++) if (P.ach[list[i].id]) cg++;
      h += "<h3>" + esc(B.CATS[ci]) + " <small>" + cg + " / " + ct + "</small></h3><div class='badge-grid'>";
      for (i = 0; i < list.length; i++) {
        b = list[i]; have = !!P.ach[b.id];
        h += "<div class='badge-card is-t" + b.tier + (have ? " is-got" : "") + (b.secret && !have ? " is-secret" : "") + "'><canvas class='badge-ico' width='64' height='64' data-badge='" + b.id + "'" + (have ? " data-got='1'" : "") + "></canvas><div><b>" + esc(b.secret && !have ? "???" : b.name) + "</b><span>" + esc(b.secret && !have ? "A secret badge. You will know it when you earn it." : b.text) + "</span>";
        if (b.stat && !have) { cur = Math.min(b.need, P.stats[b.stat] || 0); pct = Math.round(100 * cur / b.need); h += "<u><s style='width:" + pct + "%'></s></u><small>" + cur.toLocaleString() + " / " + b.need.toLocaleString() + "</small>"; }
        else if (have) h += "<small>" + esc(B.TIER[b.tier]) + "  \u00b7  " + esc(since(P.ach[b.id])) + "</small>";
        else h += "<small>" + esc(B.TIER[b.tier]) + "</small>";
        h += "</div></div>";
      }
      h += "</div>";
    }
    h += "</div>";
    box = el("div", "profile-overlay", h); box.id = "badges-panel";
    host().appendChild(box);
    paintBadges(box);
    function close() { if (box.parentNode) box.parentNode.removeChild(box); document.removeEventListener("keydown", key, true); }
    function key(e) { if (e.key === "Escape") { close(); e.preventDefault(); e.stopPropagation(); } }
    $("badges-x").addEventListener("click", close);
    box.addEventListener("click", function (e) { if (e.target === box) close(); });
    document.addEventListener("keydown", key, true);
  }

  /* ---------- Tamer Rank ---------- */
  function rankCfg() { return D.RANK || { max: 50, need: { base: 120, step: 45 }, pay: { perMinute: 10, perKill: 0.25, boss: 30, rivalWin: 40, stage: {} }, bits: { base: 15, perRank: 5 }, titles: [] }; }
  function rankNeed(r) { var C = rankCfg(); return C.need.base + C.need.step * (r - 1); }
  /* where a lifetime XP total sits: { rank, into, need, max, title } */
  function rankAt(xp) {
    var C = rankCfg(), r = 1, left = Math.max(0, Math.floor(xp || 0)), n, i, title = "";
    while (r < C.max && left >= (n = rankNeed(r))) { left -= n; r++; }
    for (i = 0; i < C.titles.length; i++) if (C.titles[i].rank <= r) title = C.titles[i].name;
    return { rank: r, into: r >= C.max ? 0 : left, need: r >= C.max ? 0 : rankNeed(r), max: r >= C.max, title: title, xp: Math.max(0, Math.floor(xp || 0)) };
  }
  function rankNow() { return rankAt(load() && P.rank ? P.rank.xp : 0); }
  function rankNext(r) {
    var C = rankCfg(), i;
    for (i = 0; i < C.titles.length; i++) if (C.titles[i].rank > r) return C.titles[i];
    return null;
  }
  /* what a finished run is worth */
  function rankPay(run) {
    var C = rankCfg().pay, parts = [], total = 0, sp = D.SPECIES && D.SPECIES[run.form], st = sp && (sp.stageKey || sp.stage), v;
    function add(label, n) { n = Math.floor(n); if (n > 0) { parts.push([label, n]); total += n; } }
    add("Time survived", (run.time || 0) / 60 * C.perMinute);
    add((run.kills || 0) + " KOs", (run.kills || 0) * C.perKill);
    v = C.stage[st]; if (v == null && /Mega/.test(st || "")) v = C.stage.Mega;
    add("Reached " + (st || "Baby"), v || 0);
    add("Bosses beaten", (run._rankBoss || 0) * C.boss);
    add("Rival beaten", ((run.rival && run.rival.wins) || 0) * C.rivalWin);
    return { parts: parts, total: total };
  }
  function runEnded(run) {
    if (!load() || !run) return null;
    bump("runs");
    if ((run.time || 0) > (P.stats.best || 0)) P.stats.best = Math.floor(run.time || 0);
    if (run.ghost || run.tamerId) P.ghost = run.tamerId || P.ghost;
    var C = rankCfg(), pay = rankPay(run), before, after, r, t, i, bits;
    P.rank = P.rank || { xp: 0 };
    before = rankAt(P.rank.xp);
    P.rank.xp = before.xp + pay.total;
    after = rankAt(P.rank.xp);
    pay.before = before; pay.after = after; pay.ups = [];
    /* every run pays a few DigiBits for the Lab, rank-up or not */
    pay.bits = Math.floor(pay.total / ((D.LAB && D.LAB.runBitsPer) || 8));
    if (pay.bits > 0 && D.cosmetics && (!D.cosmetics.ready || D.cosmetics.ready())) D.cosmetics.grantBits(pay.bits, "run");
    for (r = before.rank + 1; r <= after.rank; r++) {
      bits = C.bits.base + C.bits.perRank * r; t = null;
      for (i = 0; i < C.titles.length; i++) if (C.titles[i].rank === r) t = C.titles[i];
      if (D.cosmetics && (!D.cosmetics.ready || D.cosmetics.ready())) { D.cosmetics.grantBits(bits, "rank"); if (t) D.cosmetics.unlock(t.id, { rank: true }); }
      pay.ups.push({ rank: r, bits: bits, title: t ? t.name : "" });
    }
    save();
    if (D.BADGES) { try { D.BADGES.runEnded(api, run); } catch (e) {} }
    renderChip();
    return pay;
  }
  /* titles a rank should already hold (a cleared Cabinet, or a table that grew) */
  function rankSync() {
    if (!load() || !D.cosmetics || !D.cosmetics.ready || !D.cosmetics.ready()) return;
    var s = rankNow(), C = rankCfg(), i;
    for (i = 0; i < C.titles.length; i++) if (C.titles[i].rank <= s.rank && !D.cosmetics.isUnlocked(C.titles[i].id)) D.cosmetics.unlock(C.titles[i].id, { rank: true });
  }
  function rankRow(c, me) {
    var s = rankAt(+c.rx || 0), nx = rankNext(s.rank);
    return "<div class='profile-rank'><span class='profile-rank-badge'>RANK " + s.rank + "</span><div class='profile-rank-mid'><b>" + esc(s.title || "Tamer") + "</b>" +
      "<div class='profile-rank-bar'><i style='width:" + (s.max ? 100 : Math.round(100 * s.into / s.need)) + "%'></i></div>" +
      "<small>" + (s.max ? "Top rank reached" : s.into + " / " + s.need + " rank XP" + (me && nx ? "  \u00b7  next title at rank " + nx.rank + ": " + esc(nx.name) : "")) + "</small></div></div>";
  }

  /* ---------- the card other people see ---------- */
  function card() {
    if (!load()) return null;
    var info = D.saveInfo ? D.saveInfo() : {}, log = D.evoLog && D.evoLog.data ? D.evoLog.data() : { forms: {}, shiny: {} }, T = D.EVO_TREE || global.EVO_TREE;
    var total = 0, k, found = 0, shiny = 0;
    if (T) for (k in T.species) total++;
    for (k in (log.forms || {})) if (!T || T.species[k]) found++;
    for (k in (log.shiny || {})) shiny++;
    return {
      n: P.name, g: P.ghost, pic: picOf(P), c: P.created, a: Object.keys(P.ach).filter(function (k) { return !!ACH_BY[k]; }), rx: (P.rank && P.rank.xp) || 0, lb: P.lab || {}, mm: info.memTiers || {}, gr: (D.items && D.items.loadout) ? D.items.loadout() : null,
      st: { kos: P.stats.kos || 0, runs: P.stats.runs || 0, best: Math.max(P.stats.best || 0, Math.floor(info.bestTime || 0)), evos: P.stats.evos || 0,
        eggs: info.eggs || 0, eggsOf: info.eggsTotal || 0, forms: found, formsOf: total, shiny: shiny, bosses: P.stats.bosses || 0, top: info.bestForm || "", tr: info.trophies || 0 }
    };
  }

  /* ---------- drawing a ghost into a small canvas ---------- */
  function paintGhost(cv, ghost) {
    function go() {
      var c = cv.getContext("2d");
      c.imageSmoothingEnabled = false; c.clearRect(0, 0, cv.width, cv.height);
      try { if (D.sprites && D.sprites.drawTamer) { c.save(); c.translate(cv.width / 2, cv.height - 4); c.scale(cv.width / 44, cv.width / 44); D.sprites.drawTamer(c, 0, 0, 1, 0, false, false, false, "down", ghost); c.restore(); } } catch (e) {}
    }
    go(); setTimeout(go, 400); setTimeout(go, 1500);
  }
  /* a Digimon portrait; its sprite may still be loading, so it is tried a few times */
  function paintPic(cv, id) {
    var tries = 0;
    function go() {
      var c = cv.getContext("2d"), S = D.sprites, sh = null, k;
      if (!cv.isConnected && tries > 0) return;
      try { sh = S && S.getSheet ? S.getSheet(id, "idle", 0, false) : null; } catch (e) { sh = null; }
      c.imageSmoothingEnabled = false; c.clearRect(0, 0, cv.width, cv.height);
      if (sh && sh.width) { k = Math.min((cv.width - 6) / sh.width, (cv.height - 6) / sh.height); c.drawImage(sh, Math.round((cv.width - sh.width * k) / 2), Math.round(cv.height - 3 - sh.height * k), Math.round(sh.width * k), Math.round(sh.height * k)); }
      if (++tries < 8) setTimeout(go, tries < 3 ? 350 : 900);
    }
    try { if (D.sprites && D.sprites.preloadSpecies) D.sprites.preloadSpecies([id], true); } catch (e) {}
    go();
  }
  function picName(id) { return (D.SPECIES && D.SPECIES[id] && D.SPECIES[id].name) || id; }
  function paintEgg(cv, line) {
    var list = D.EGGS || [], i, frame = null, c = cv.getContext("2d");
    for (i = 0; i < list.length; i++) if (list[i].id === line) frame = list[i].frame;
    c.imageSmoothingEnabled = false; c.clearRect(0, 0, cv.width, cv.height);
    try { if (frame && D.sprites && D.sprites.drawEgg) D.sprites.drawEgg(c, frame, cv.width / 2, cv.height - 6, 0, false, false); } catch (e) {}
  }
  function eggName(line) { var list = D.EGGS || [], i; for (i = 0; i < list.length; i++) if (list[i].id === line) return list[i].name; return ""; }
  function clock(s) { s = Math.floor(s || 0); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }
  function since(ms) { try { return new Date(ms).toLocaleDateString(undefined, { month: "short", year: "numeric" }); } catch (e) { return ""; } }

  /* ---------- DOM: built here so index.html stays as it is ---------- */
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function host() { return $("app") || document.body; }

  var toastQ = [], toastBusy = false;
  function toast(a) { toastQ.push(a); if (!toastBusy) toastNext(); }
  function toastNext() {
    var a = toastQ.shift(), t = $("ach-toast"), tier = (a && a.tier) || 1;
    if (!a || typeof document === "undefined" || !document.createElement) { toastBusy = false; toastQ.length = 0; return; }
    toastBusy = true;
    if (!t) { t = el("div"); t.id = "ach-toast"; host().appendChild(t); }
    t.className = "is-t" + tier;
    t.innerHTML = "<b>\u2605 " + esc(((D.BADGES && D.BADGES.TIER[tier]) || "") + " badge") + (toastQ.length ? "  \u00b7  +" + toastQ.length + " more" : "") + "</b><span>" + esc(a.name) + "</span><small>" + esc(a.text) + "</small>";
    void t.offsetWidth; t.classList.add("is-on");
    if (D.uiSfx) D.uiSfx("level");
    setTimeout(toastNext, toastQ.length > 3 ? 1300 : 2600);
  }

  function renderChip() {
    var chip = $("profile-chip"), ts = $("title-screen");
    if (!ts) return;
    if (!chip) {
      chip = el("button", "profile-chip"); chip.id = "profile-chip"; chip.type = "button";
      chip.innerHTML = "<canvas width='48' height='48'></canvas><span><b id='profile-chip-name'></b><small id='profile-chip-sub'></small></span>";
      chip.addEventListener("click", function () { if (D.uiSfx) D.uiSfx("ui"); openPanel(card(), { me: true }); });
      ts.appendChild(chip);
    }
    chip.hidden = !load();
    if (!P) return;
    $("profile-chip-name").textContent = P.name;
    $("profile-chip-sub").textContent = "★ " + Object.keys(P.ach).length + " / " + ACH.length + "  ·  profile";
    paintPic(chip.querySelector("canvas"), picOf(P));
    if (D.hub && D.hub.refresh) D.hub.refresh();
  }

  /* create / edit */
  function openEdit(first) {
    var box = $("profile-edit"), pick = picOf(load() || null), list = PICS.map(function (id) { return { id: id, name: picName(id) }; }), i, b, row;
    if (box) box.parentNode.removeChild(box);
    box = el("div", "profile-overlay"); box.id = "profile-edit";
    box.innerHTML = "<div class='profile-box'><h2>" + (first ? "Create your profile" : "Edit profile") + "</h2>" +
      "<p class='profile-lead'>" + (first ? "Pick a name and your favourite Digimon as your picture. This is who your friends see when you play together." : "Change your name or your picture.") + "</p>" +
      "<label class='profile-field'><span>Name</span><input type='text' id='profile-name' maxlength='14' autocomplete='off' spellcheck='false'></label>" +
      "<div class='profile-ghosts' id='profile-ghosts'></div>" +
      "<div class='profile-row'><button type='button' class='profile-btn is-primary' id='profile-save'>" + (first ? "Start" : "Save") + "</button>" +
      (first ? "" : "<button type='button' class='profile-btn' id='profile-cancel'>Cancel</button>") + "</div></div>";
    host().appendChild(box);
    row = $("profile-ghosts");
    for (i = 0; i < list.length; i++) {
      b = el("button", "profile-ghost" + (list[i].id === pick ? " is-on" : ""), "<canvas width='48' height='48'></canvas><span>" + esc(list[i].name) + "</span>");
      b.type = "button"; b.setAttribute("data-g", list[i].id);
      (function (btn, id) { btn.addEventListener("click", function () { pick = id; var all = row.querySelectorAll(".profile-ghost"), j; for (j = 0; j < all.length; j++) all[j].classList.toggle("is-on", all[j] === btn); if (D.uiSfx) D.uiSfx("ui"); }); })(b, list[i].id);
      row.appendChild(b);
      paintPic(b.querySelector("canvas"), list[i].id);
    }
    var inp = $("profile-name");
    inp.value = P ? P.name : "";
    try { if (!P) inp.value = cleanName(global.localStorage.getItem("dbh_net_name") || ""); } catch (e) {}
    function done() {
      var nm = cleanName(inp.value);
      if (!nm) { inp.focus(); inp.classList.add("is-bad"); return; }
      if (!P) create(nm, pick); else { P.name = nm; P.pic = pick; save(); announce(); }
      box.parentNode.removeChild(box);
      if (D.uiSfx) D.uiSfx("pick");
      if (!first) openPanel(card(), { me: true });
    }
    $("profile-save").addEventListener("click", done);
    inp.addEventListener("keydown", function (e) { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); done(); } });
    inp.addEventListener("keyup", function (e) { e.stopPropagation(); });
    if ($("profile-cancel")) $("profile-cancel").addEventListener("click", function () { box.parentNode.removeChild(box); });
    setTimeout(function () { try { inp.focus(); } catch (e) {} }, 60);
  }

  /* the full card: yours, or a friend's from the lobby */
  function openPanel(c, opt) {
    opt = opt || {};
    var box = $("profile-panel"), pl = opt.player || null, st = (c && c.st) || {}, have = {}, i, html, a, got = 0;
    if (box) box.parentNode.removeChild(box);
    if (!c) c = { n: (pl && pl.name) || "Tamer", a: [], st: {} };
    (c.a || []).forEach(function (id) { have[id] = 1; });
    for (i = 0; i < ACH.length; i++) if (have[ACH[i].id]) got++;
    var ghost = (pl && pl.tamerId) || c.g || "byte";
    function stat(label, val) { return "<div class='profile-stat'><b>" + esc(val) + "</b><span>" + esc(label) + "</span></div>"; }
    html = "<div class='profile-box is-wide'><button type='button' class='profile-x' id='profile-x' aria-label='Close'>&times;</button>" +
      "<div class='profile-head'><canvas width='84' height='84' id='profile-ghost-cv'></canvas><div><h2>" + esc(c.n || (pl && pl.name) || "Tamer") + (opt.me ? " <small>(you)</small>" : "") + "</h2>" +
      "<p class='profile-lead'>Favourite: " + esc(picName(picOf(c))) + "  \u00b7  " + esc(ghostName(ghost)) + " projection" + (c.c ? "  ·  playing since " + esc(since(+c.c)) : "") + "</p>" +
      (pl ? "<p class='profile-pick'>" + (pl.line ? "<canvas width='40' height='44' id='profile-egg-cv'></canvas>Egg picked: <b>" + esc(eggName(pl.line) || "an egg") + "</b>" : "Still choosing an egg…") + "</p>" : "") +
      "</div></div>" +
      rankRow(c, opt.me) +
      "<div class='profile-stats'>" +
      stat("eggs unlocked", (+st.eggs || 0) + (st.eggsOf ? " / " + (+st.eggsOf) : "")) +
      stat("Digimon raised", (+st.forms || 0) + (st.formsOf ? " / " + (+st.formsOf) : "")) +
      stat("longest run", clock(+st.best || 0)) + stat("runs", +st.runs || 0) + stat("KOs", +st.kos || 0) + stat("shinies", +st.shiny || 0) + stat("bosses beaten", +st.bosses || 0) + stat("rival trophies", +st.tr || 0) + "</div>" +
      (opt.me && D.boards ? "<h3>League <small id='profile-league-place'></small></h3><div class='profile-stats' id='profile-league'><div class='profile-stat'><b>…</b><span>loading</span></div></div>" : "") +
      "<h3>Badges <small>" + got + " / " + ACH.length + "</small></h3><div class='badge-bar'><i style='width:" + Math.round(100 * got / Math.max(1, ACH.length)) + "%'></i></div><div class='badge-chips'>";
    var mine = ACH.filter(function (b) { return have[b.id]; }).sort(function (x, y) { return (y.tier - x.tier); });
    for (i = 0; i < mine.length; i++) { a = mine[i]; html += "<span class='badge-chip is-t" + a.tier + "' title='" + esc(a.text) + "'><canvas class='badge-mini' width='32' height='32' data-badge='" + a.id + "' data-got='1'></canvas>" + esc(a.name) + "</span>"; }
    if (!mine.length) html += "<span class='badge-none'>None yet.</span>";
    html += "</div>" + (opt.me ? "<div class='profile-row'><button type='button' class='profile-btn' id='profile-badges-btn'>All badges</button><button type='button' class='profile-btn' id='profile-edit-btn'>Change name or picture</button>" + (D.account && D.account.on() ? "<button type='button' class='profile-btn' id='profile-logout-btn'>Log out (" + esc(D.account.name()) + ")</button>" : "") + "</div>" : "") + "</div>";
    box = el("div", "profile-overlay", html); box.id = "profile-panel";
    host().appendChild(box);
    paintPic($("profile-ghost-cv"), picOf(c));
    paintBadges(box);
    if ($("profile-egg-cv")) paintEgg($("profile-egg-cv"), pl.line);
    function close() { if (box.parentNode) box.parentNode.removeChild(box); }
    $("profile-x").addEventListener("click", close);
    box.addEventListener("click", function (e) { if (e.target === box) close(); });
    if ($("profile-edit-btn")) $("profile-edit-btn").addEventListener("click", function () { close(); openEdit(false); });
    if ($("profile-logout-btn")) $("profile-logout-btn").addEventListener("click", function () { this.disabled = true; this.textContent = "Saving and logging out…"; D.account.logout(); });
    if ($("profile-badges-btn")) $("profile-badges-btn").addEventListener("click", function () { close(); openBadges(); });
    /* your bests on the boards (js/boards.js) */
    if ($("profile-league")) {
      if (!D.boards.signedIn()) $("profile-league").innerHTML = "<div class='profile-stat'><b>-</b><span>log in online to join</span></div>";
      else D.boards.mine(function (me) {
        var lg = $("profile-league"), b = me && me.bests, pl = (me && me.places) || {}, ck = D.boards.clock;
        if (!lg) return;
        function place(k) { return pl[k] ? " (#" + pl[k] + ")" : ""; }
        lg.innerHTML = !b ? "<div class='profile-stat'><b>-</b><span>no League runs yet</span></div>" :
          stat("best level" + place("level"), b.level || 0) + stat("fastest Mega" + place("mega"), b.megaAt ? ck(b.megaAt) : "-") + stat("longest run" + place("time"), ck(b.time || 0)) +
          stat("most lords" + place("lords"), b.lords || 0) + stat("PvP wins" + place("pvp"), b.pvp || 0) + stat("ranked best" + place("ranked"), b.ranked || 0) + stat("weekly best" + place("weekly"), b.weekly || 0) + stat("League runs", b.runs || 0);
        if ($("profile-league-place")) $("profile-league-place").textContent = me && me.backing ? "backing " + me.backing + " this week" : "";
      });
      var lb = document.createElement("button"); lb.type = "button"; lb.className = "profile-btn"; lb.textContent = "Open the League";
      lb.addEventListener("click", function () { close(); D.boards.open(); });
      $("profile-league").parentNode.insertBefore(lb, $("profile-league").nextSibling);
    }
  }

  /* the title screen asks for a profile the first time, and shows the chip after */
  var lastState = null;
  function watch() {
    var st = D.getState ? D.getState() : null;
    if (st === "title") {
      if (!load() && !$("profile-edit") && !$("acct-screen") && !(D.account && D.account.pending)) openEdit(true);   /* signing in comes first (js/account.js) */
      if (lastState !== "title") renderChip();
    }
    lastState = st;
  }
  function init() {
    if (load() && D.setTamer) D.setTamer(P.ghost);
    renderChip(); rankSync(); setTimeout(syncBadges, 1200);
    if (D.cosmetics && D.cosmetics.onChange) { var synced = false; D.cosmetics.onChange(function () { if (!synced && D.cosmetics.ready()) { synced = true; rankSync(); } }); }
    global.setInterval(watch, 350);
  }

  D.profile = { openBadges: openBadges, syncBadges: syncBadges, lab: function () { return load() ? (P.lab = P.lab || {}) : {}; },
    /* the Hatchery's egg and data (js/hatchery.js) */
    hatch: function () { return load() ? (P.hatch = P.hatch || { data: {}, egg: null, count: 0 }) : null; }, save: save, rank: { at: rankAt, now: rankNow, next: rankNext, pay: rankPay, sync: rankSync }, ACH: ACH, exists: exists, name: name, get: function () { return load() || null; }, setName: setName, setGhost: setGhost, onEvent: onEvent, tick: tick, runEnded: runEnded,
    card: card, openPanel: openPanel, openEdit: openEdit, award: award };
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  }
})(typeof window !== "undefined" ? window : this);
