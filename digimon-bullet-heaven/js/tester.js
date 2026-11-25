/* Digi Night — tester mode.
 *
 * A hidden mode for testing the game: become any form, set levels, jump the
 * clock, force weather, spawn enemies, and so on.
 *
 *   Getting in   type the code on the title screen or any menu (not in a text
 *                box), or open index.html?tester=<code>. Only a SHA-256 hash of
 *                the code is kept in this file.
 *   The panel    the TESTER chip at the top of the screen, or the ` key.
 *   Getting out  "Leave tester mode" in the panel, or just reload / close the tab.
 *
 * Nothing done in tester mode is kept. On the way in, everything the game has
 * saved in this browser is copied aside (BACKUP); on the way out, or the next
 * time the page loads, that copy is put back and whatever was saved meanwhile
 * is thrown away. That restore is the first thing this file does, and this is
 * the first script on the page, so nothing reads a tester save by mistake.
 *
 * The run tools drive the host's own sim, so they work in solo runs only.
 */
(function (global) {
  "use strict";
  var D = {};   /* data.js makes the real DBH after this file runs: hooked up on DOMContentLoaded below */
  var HASH = "1c5468e51166b290a8841ee3a978824097bd0607290df2dd2382fc43a5e56293", LEN = 13;
  var BACKUP = "dn_tester_backup_v1", OURS = /^(dbh|dn)_/;
  var on = false, typed = "", god = false, panel = null, chip = null, timer = null;

  function ls() { try { return global.localStorage || null; } catch (e) { return null; } }

  /* ---- the throwaway save ---- */
  function restore() {
    var s = ls(), raw, keep, k, i, gone = [];
    if (!s) return false;
    try { raw = s.getItem(BACKUP); } catch (e) { raw = null; }
    if (!raw) return false;
    try { keep = JSON.parse(raw); } catch (e2) { keep = null; }
    if (keep) {
      for (i = 0; i < s.length; i++) { k = s.key(i); if (k !== BACKUP && OURS.test(k) && !Object.prototype.hasOwnProperty.call(keep, k)) gone.push(k); }
      for (i = 0; i < gone.length; i++) s.removeItem(gone[i]);
      for (k in keep) if (Object.prototype.hasOwnProperty.call(keep, k)) { try { s.setItem(k, keep[k]); } catch (e3) {} }
    }
    s.removeItem(BACKUP);
    return true;
  }
  function backup() {
    var s = ls(), keep = {}, i, k;
    if (!s) return false;
    if (s.getItem(BACKUP)) return true;          /* already aside: never overwrite the real save with a tester one */
    for (i = 0; i < s.length; i++) { k = s.key(i); if (k !== BACKUP) keep[k] = s.getItem(k); }
    try { s.setItem(BACKUP, JSON.stringify(keep)); } catch (e) { return false; }
    return s.getItem(BACKUP) != null;
  }
  restore();   /* a tester session that ended by closing the tab is undone here */

  function check(code) { return !!(D.devLock && D.devLock.sha256 && D.devLock.sha256("dn-tester:" + code) === HASH); }

  /* ---- the run, when there is one to work on ---- */
  function auth() { return D.getMissionAuth ? D.getMissionAuth() : null; }
  function sim() { var a = auth(); return a && a.sim ? a.sim : null; }
  function me() { var s = sim(); return s ? ((s.player && s.localId != null && s.player(s.localId)) || s.players[0] || null) : null; }
  function solo() {
    var s = sim(), i, n = 0;
    if (!s || !me()) return false;
    if (D.menu && D.menu.online && D.menu.online()) return false;
    for (i = 0; i < s.players.length; i++) if (s.players[i].kind !== "cpu" && s.players[i].hasTamer !== false) n++;
    return n <= 1;
  }
  function say(t) { var o = panel && panel.querySelector(".tst-say"); if (o) o.textContent = t || ""; }
  function names(o) { return Object.keys(o || {}).sort(function (a, b) { return ((o[a].name || a) + "").localeCompare((o[b].name || b) + ""); }); }
  function stageOf(id) { return D.moveStageIdx ? D.moveStageIdx(id) : 0; }
  var STAGES = ["Baby", "In-Training", "Rookie", "Champion", "Ultimate", "Mega"];

  var ACT = {
    /* --- profile (a copy: gone when you leave) --- */
    bits: function () { if (D.cosmetics && D.cosmetics.grantBits) { D.cosmetics.grantBits(10000, "tester"); return "+10,000 DigiCoins"; } return "No bits store"; },
    data: function () {
      var H = D.profile && D.profile.hatch && D.profile.hatch(), T = (D.hatchery && D.hatchery.rules && D.hatchery.rules.TYPES) || [], i;
      if (!H) return "Make a profile first";
      H.data = H.data || {};
      for (i = 0; i < T.length; i++) H.data[T[i]] = (H.data[T[i]] || 0) + 5000;
      if (D.profile.save) D.profile.save();
      if (D.getState && D.getState() === "hatchery" && D.hatchery.render) D.hatchery.render();
      return "+5,000 of every kind of data";
    },
    eggs: function () { var E = D.EGGS || [], i, n = 0; for (i = 0; i < E.length; i++) if (D.unlockEgg && D.unlockEgg(E[i].id)) n++; return n + " egg lines opened"; },
    /* --- the run --- */
    form: function (v) {
      var s = sim(), p = me(), a = auth(), id = v.form, r;
      if (!id || !s.data.SPECIES[id]) return "Pick a form";
      if (D.sprites && D.sprites.preloadSpecies) D.sprites.preloadSpecies(id, true);
      p.hatchLeft = 0;
      r = a.progression && a.progression._applyForm ? a.progression._applyForm(p, id, "debug") : null;
      if (!r || r.ok === false) p.form = id;
      p.burstLeft = 0; p.burstForm = null;
      s._syncMoves(p);
      return "Now " + (s.data.SPECIES[id].name || id);
    },
    evolve: function () { var s = sim(), p = me(), to = s._burstForm ? s._burstForm(p.form) : null; if (!to || to === p.form) return "No standard next form from here"; return ACT.form({ form: to }); },
    shiny: function () { var p = me(); p.shiny = !p.shiny; return p.shiny ? "Shiny on" : "Shiny off"; },
    job: function (v) { var s = sim(), p = me(), n = Math.max(1, Math.min(50, v.n | 0)), i; for (i = 0; i < n; i++) { p.xp = p.xpNext; s._tryLevel(p); } return "+" + n + " job level" + (n > 1 ? "s" : "") + " (now " + p.level + ")"; },
    sp: function () { var p = me(); p.skillPoints = (p.skillPoints || 0) + 10; if (sim()._rollOffer) sim()._rollOffer(p); return "+10 skill points"; },
    base: function (v) { var s = sim(), p = me(), n = Math.max(1, Math.min(50, v.n | 0)), i; for (i = 0; i < n; i++) s._tamerXp(p, Math.max(1, (p.tamerXpNext || s._tamerNeed(p.tamerLevel || 1)) - (p.tamerXp || 0))); return "+" + n + " base level" + (n > 1 ? "s" : "") + " (now " + p.tamerLevel + ")"; },
    stat: function () { var p = me(); p.statPoints = (p.statPoints || 0) + 30; return "+30 status points"; },
    heal: function () { var p = me(), c = (sim().data && sim().data.CARE) || {}; p.hp = p.maxHp; p.faint = 0; p.downed = false; p.fullness = c.fullnessMax || 100; p.happiness = c.happinessMax || 100; return "Healed, fed and happy"; },
    god: function () { god = !god; return god ? "God mode on: the partner takes no damage" : "God mode off"; },
    warp: function () { me().burst = 100; return "Warp meter full (press R)"; },
    runbits: function () { var s = sim(), p = me(); if (s.grantBits) s.grantBits(p.id, 500); else p.bits = (p.bits || 0) + 500; return "+500 Bits for this run"; },
    time: function (v) { var s = sim(), m = +v.min || 1; s.time += m * 60; return "Clock moved on " + m + " min (now " + Math.floor(s.time / 60) + ":" + ("0" + Math.floor(s.time % 60)).slice(-2) + ")"; },
    night: function () { var s = sim(); s.clockHour = ((s.clockHour != null ? s.clockHour : 12) + 12) % 24; return "Day and night swapped"; },
    weather: function (v) { var s = sim(); if (!D.weather || !D.weather.force || !v.weather) return "No weather"; D.weather.force(s, v.weather, { data: s.data }); return "Weather: " + v.weather; },
    spawn: function (v) {
      var s = sim(), p = me(), n = Math.max(1, Math.min(40, v.count | 0)), i, a, e, made = 0, fl;
      if (!v.enemy) return "Pick an enemy";
      for (i = 0; i < n; i++) {
        a = (Math.PI * 2 * i) / n + 0.4;
        fl = { keepType: true, quiet: true, x: p.mx + Math.cos(a) * (190 + (i % 3) * 36), y: p.my + Math.sin(a) * (150 + (i % 3) * 30) };
        if (v.kind === "boss") fl.boss = true;
        e = s.spawnEnemy(v.enemy, fl);
        if (!e) continue;
        made++;
        if (v.kind === "virus" && s._infect) s._infect(e, null);
      }
      return made + " " + (v.kind === "virus" ? "infected " : v.kind === "boss" ? "boss " : "") + v.enemy + " placed";
    },
    clear: function () { var s = sim(), i, e, n = 0; for (i = 0; i < s.enemies.length; i++) { e = s.enemies[i]; if (!e.dead && !e.rival && !e.lord) { e.dead = true; n++; } } return n + " enemies removed"; },
    leave: function () { leave(); return ""; }
  };
  var NEEDS_RUN = { form: 1, evolve: 1, shiny: 1, job: 1, sp: 1, base: 1, stat: 1, heal: 1, god: 1, warp: 1, runbits: 1, time: 1, night: 1, weather: 1, spawn: 1, clear: 1 };

  function values() {
    var v = {}, f = panel.querySelectorAll("[data-v]"), i;
    for (i = 0; i < f.length; i++) v[f[i].getAttribute("data-v")] = f[i].value;
    return v;
  }
  function act(name, arg) {
    var v, k, out;
    if (!on || !ACT[name]) return;
    if (NEEDS_RUN[name] && !solo()) { say(sim() && me() ? "The run tools work in solo runs only." : "Start a run first."); return; }
    v = values(); if (arg) for (k in arg) v[k] = arg[k];
    try { out = ACT[name](v); } catch (e) { out = "That failed: " + e.message; }
    say(out);
  }

  /* ---- the panel ---- */
  function opt(v, t) { return "<option value='" + v + "'>" + t + "</option>"; }
  function formOptions() {
    var S = D.SPECIES || {}, ids = names(S), by = [[], [], [], [], [], []], i, st, h = "";
    for (i = 0; i < ids.length; i++) { if (S[ids[i]].egg || /egg/i.test(S[ids[i]].stage || "")) continue; st = Math.max(0, Math.min(5, stageOf(ids[i]))); by[st].push(ids[i]); }
    for (st = 0; st < 6; st++) { if (!by[st].length) continue; h += "<optgroup label='" + STAGES[st] + " (" + by[st].length + ")'>"; for (i = 0; i < by[st].length; i++) h += opt(by[st][i], S[by[st][i]].name || by[st][i]); h += "</optgroup>"; }
    return h;
  }
  function enemyOptions() { var E = D.ENEMIES || {}, ids = names(E), i, h = ""; for (i = 0; i < ids.length; i++) h += opt(ids[i], (E[ids[i]].name || ids[i]) + (E[ids[i]].boss ? " *" : "")); return h; }
  function weatherOptions() { var C = (D.weather && D.weather.CATALOG) || {}, k, h = ""; for (k in C) h += opt(k, (C[k] && C[k].name) || k); return h; }
  function b(a, t, extra) { return "<button type='button' data-a='" + a + "'" + (extra || "") + ">" + t + "</button>"; }
  function build() {
    var css = document.createElement("style"), stop;
    css.textContent =
      "#tst-chip{position:fixed;top:4px;left:50%;transform:translateX(-50%);z-index:99998;font:700 11px/1 monospace;letter-spacing:.14em;padding:5px 10px;border:1px solid #ffd24a;border-radius:10px;background:rgba(40,28,0,.92);color:#ffd24a;cursor:pointer}" +
      "#tst-panel{position:fixed;top:30px;right:8px;z-index:99999;width:330px;max-width:calc(100vw - 16px);max-height:calc(100vh - 44px);overflow:auto;box-sizing:border-box;padding:10px;border:1px solid #ffd24a;border-radius:10px;background:rgba(14,12,22,.96);color:#eee;font:12px/1.35 system-ui,sans-serif;display:none}" +
      "#tst-panel.is-on{display:block}#tst-panel h4{margin:10px 0 4px;font:700 11px/1 monospace;letter-spacing:.12em;color:#ffd24a;text-transform:uppercase}#tst-panel h4:first-child{margin-top:0}" +
      "#tst-panel .row{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;align-items:center}" +
      "#tst-panel button{font:600 12px/1 system-ui,sans-serif;padding:6px 8px;border-radius:6px;border:1px solid #556;background:#23233a;color:#fff;cursor:pointer}#tst-panel button:hover{background:#34345a}" +
      "#tst-panel select,#tst-panel input{font:12px/1 system-ui,sans-serif;padding:5px;border-radius:6px;border:1px solid #556;background:#11111c;color:#fff;min-width:0}#tst-panel select{flex:1 1 120px}#tst-panel input[type=number]{width:54px}#tst-panel input[type=text]{flex:1 1 90px}" +
      "#tst-panel .tst-say{min-height:16px;margin-top:8px;color:#9fe6a0}#tst-panel .tst-note{color:#aab;font-size:11px}#tst-panel .out{border-color:#c66;color:#fbb}";
    document.head.appendChild(css);
    chip = document.createElement("div"); chip.id = "tst-chip"; chip.textContent = "TESTER"; chip.title = "Open the tester panel ( ` )";
    panel = document.createElement("div"); panel.id = "tst-panel";
    panel.innerHTML =
      "<h4>Partner</h4>" +
      "<div class='row'><input type='text' data-find='form' placeholder='find a form'><select data-v='form'>" + formOptions() + "</select>" + b("form", "Become") + "</div>" +
      "<div class='row'>" + b("evolve", "Digivolve now") + b("shiny", "Shiny") + b("heal", "Heal + feed") + b("god", "God mode") + b("warp", "Fill warp") + "</div>" +
      "<h4>Levels</h4>" +
      "<div class='row'><input type='number' data-v='n' value='1' min='1' max='50'>" + b("job", "+ job levels") + b("base", "+ base levels") + "</div>" +
      "<div class='row'>" + b("sp", "+10 skill points") + b("stat", "+30 status points") + b("runbits", "+500 Bits") + "</div>" +
      "<h4>World</h4>" +
      "<div class='row'><input type='number' data-v='min' value='6' min='1' max='120'>" + b("time", "+ minutes") + b("night", "Day / night") + "</div>" +
      "<div class='row'><select data-v='weather'>" + weatherOptions() + "</select>" + b("weather", "Set weather") + "</div>" +
      "<h4>Enemies</h4>" +
      "<div class='row'><input type='text' data-find='enemy' placeholder='find an enemy'><select data-v='enemy'>" + enemyOptions() + "</select></div>" +
      "<div class='row'><input type='number' data-v='count' value='1' min='1' max='40'><select data-v='kind'>" + opt("plain", "Normal") + opt("virus", "Infected") + opt("boss", "Boss") + "</select>" + b("spawn", "Spawn") + b("clear", "Clear all") + "</div>" +
      "<h4>Profile and Hatchery</h4>" +
      "<div class='row'>" + b("bits", "+10,000 DigiCoins") + b("data", "+5,000 data each") + b("eggs", "Open all eggs") + "</div>" +
      "<div class='tst-say'></div>" +
      "<div class='row' style='margin-top:8px'>" + b("leave", "Leave tester mode", " class='out'") + "</div>" +
      "<div class='tst-note'>Nothing here is kept. Leaving, reloading or closing the tab puts your real save back exactly as it was.</div>";
    document.body.appendChild(chip); document.body.appendChild(panel);
    chip.addEventListener("click", toggle);
    panel.addEventListener("click", function (e) { var t = e.target; if (t && t.getAttribute && t.getAttribute("data-a")) { act(t.getAttribute("data-a")); t.blur(); } });
    /* a find box narrows the list beside it */
    panel.addEventListener("input", function (e) {
      var t = e.target, key = t && t.getAttribute && t.getAttribute("data-find"), sel, q, o, i, first = null;
      if (!key) return;
      sel = panel.querySelector("select[data-v='" + key + "']"); q = t.value.toLowerCase(); o = sel.options;
      for (i = 0; i < o.length; i++) { o[i].hidden = !!q && o[i].text.toLowerCase().indexOf(q) < 0; if (!o[i].hidden && first == null) first = i; }
      if (first != null && q) sel.selectedIndex = first;
    });
    /* typing and clicking in the panel is not for the game */
    stop = function (e) { e.stopPropagation(); };
    ["keydown", "keyup", "keypress", "mousedown", "mouseup", "wheel", "pointerdown", "touchstart"].forEach(function (n) { panel.addEventListener(n, stop); chip.addEventListener(n, stop); });
  }
  function toggle() { if (panel) panel.classList.toggle("is-on"); }

  function enter() {
    if (on) return true;
    if (!backup()) return false;       /* no way to put things back: do not start */
    on = true; D.testerOn = true;
    build(); panel.classList.add("is-on");
    say("Tester mode. Nothing from here on is kept.");
    /* god mode is held on between frames */
    timer = global.setInterval(function () { var p; if (!god || !solo()) return; p = me(); p.hp = p.maxHp; p.faint = 0; p.monInvuln = Math.max(p.monInvuln || 0, 0.5); }, 100);
    return true;
  }
  function leave() {
    var u;
    if (timer) global.clearInterval(timer);
    on = false; D.testerOn = false;
    restore();
    try { u = global.location.href.replace(/([?&])tester=[^&#]*&?/, "$1").replace(/[?&]$/, ""); if (u !== global.location.href) global.location.replace(u); else global.location.reload(); } catch (e) {}
  }

  var API = { isOn: function () { return on; }, enter: function (code) { return check(code) && enter(); }, leave: leave, act: act, _restore: restore, _backup: backup, _check: check };

  function hook() { D = global.DBH = global.DBH || {}; D.tester = API; D.testerOn = on; }
  hook();
  if (typeof document === "undefined") return;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", hook); else hook();
  document.addEventListener("keydown", function (e) {
    var t = e.target, tag = t && t.tagName, st;
    if (on) { if (e.key === "`" && tag !== "INPUT" && tag !== "TEXTAREA") { toggle(); e.preventDefault(); } return; }
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !e.key || e.key.length !== 1) return;
    st = D.getState ? D.getState() : "title";
    if (st === "playing" || st === "paused" || st === "levelup" || st === "evolution" || st === "shop" || st === "farm") { typed = ""; return; }
    typed = (typed + e.key.toLowerCase()).slice(-LEN);
    if (typed.length === LEN && check(typed)) { typed = ""; enter(); }
  }, true);
  global.addEventListener("load", function () {
    var m = /[?&]tester=([^&#]+)/.exec(global.location.search || "");
    if (m && check(decodeURIComponent(m[1]))) enter();
  });
})(typeof window !== "undefined" ? window : globalThis);
