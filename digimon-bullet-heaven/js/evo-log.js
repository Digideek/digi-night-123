/* Digimon Bullet Heaven — Digivolution Log (Nov 13).
 *
 * A record of what you have actually raised, never how. It lists:
 *   - each run's route (e.g. Botamon → Koromon → Agumon → Greymon),
 *   - every form by stage, with "???" for forms you have never reached,
 *     and for the ones you have, which forms you reached them from.
 * Requirements, chances and hints are never shown.
 *
 * Saved in localStorage under dbh_evo_log_v1 (separate from the run save).
 */
(function (global) {
  "use strict";

  var D = global.DBH = global.DBH || {};
  var KEY = "dbh_evo_log_v1";
  var MAX_RUNS = 30;
  var STAGES = [
    ["Baby I", "Baby"],
    ["Baby II", "In-Training"],
    ["Rookie", "Rookie"],
    ["Champion", "Champion"],
    ["Armor", "Armor"],
    ["Ultimate", "Ultimate"],
    ["Mega", "Mega"],
    ["Mega+", "Mega+"]
  ];

  var log = null;
  var current = null; /* { id, route: [], egg } for the run in progress */

  function load() {
    if (log) return log;
    try { log = JSON.parse(global.localStorage.getItem(KEY) || "null"); } catch (e) { log = null; }
    if (!log || typeof log !== "object") log = {};
    log.forms = log.forms || {};
    log.edges = log.edges || {};
    log.runs = log.runs || [];
    log.shiny = log.shiny || {};
    return log;
  }
  function save() {
    try { global.localStorage.setItem(KEY, JSON.stringify(log)); } catch (e) {}
  }
  function tree() { return D.EVO_TREE || global.EVO_TREE || null; }
  function nameOf(id) {
    var T = tree();
    return (D.SPECIES && D.SPECIES[id] && D.SPECIES[id].name) || (T && T.species[id] && T.species[id].name) || id;
  }
  function isEgg(id) {
    var sp = D.SPECIES && D.SPECIES[id];
    return !!(sp && (sp.stage === "Egg" || sp.hatchTo));
  }

  function startRun(egg) {
    load();
    current = { id: Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), route: [], egg: egg || null, at: Date.now() };
  }

  /* a shiny form was raised: starred in the grid from then on */
  function noteShiny(id) {
    load();
    if (!id || log.shiny[id]) return;
    log.shiny[id] = Date.now();
    save();
  }

  function record(from, to) {
    load();
    if (!to) return;
    if (!current) startRun(isEgg(from) ? from : null);
    log.forms[to] = (log.forms[to] || 0) + 1;
    if (from && !isEgg(from)) {
      log.forms[from] = log.forms[from] || 1;
      var k = from + ">" + to;
      log.edges[k] = (log.edges[k] || 0) + 1;
    }
    if (!current.route.length && from && !isEgg(from)) current.route.push(from);
    if (current.route[current.route.length - 1] !== to) current.route.push(to);
    var i, found = false;
    for (i = 0; i < log.runs.length; i++) {
      if (log.runs[i].id === current.id) { log.runs[i].route = current.route.slice(); found = true; break; }
    }
    if (!found) log.runs.unshift({ id: current.id, route: current.route.slice(), egg: current.egg, at: current.at });
    if (log.runs.length > MAX_RUNS) log.runs.length = MAX_RUNS;
    save();
  }

  function cameFrom(to) {
    var out = [], k;
    for (k in log.edges) {
      if (!Object.prototype.hasOwnProperty.call(log.edges, k)) continue;
      var parts = k.split(">");
      if (parts[1] === to) out.push(parts[0]);
    }
    return out;
  }

  /* ---------- UI ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function ensureScreen() {
    var elx = document.getElementById("log-screen");
    if (elx) return elx;
    elx = document.createElement("div");
    elx.id = "log-screen";
    elx.className = "screen log-screen";
    elx.innerHTML =
      "<div class='panel log-panel'>" +
      "<h2>DIGIVOLUTION LOG</h2>" +
      "<p class='sub' id='log-sub'></p>" +
      "<div class='log-tabs'><button type='button' class='btn ghost is-on' data-tab='routes'>Routes</button><button type='button' class='btn ghost' data-tab='forms'>Forms</button></div>" +
      "<div class='log-body' id='log-body'></div>" +
      "<div class='row center'><button type='button' class='btn' id='btn-log-back'>Back</button></div>" +
      "</div>";
    document.body.appendChild(elx);
    elx.querySelector("#btn-log-back").addEventListener("click", close);
    var tabs = elx.querySelectorAll(".log-tabs .btn"), i;
    for (i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener("click", function (ev) {
        tab = ev.currentTarget.getAttribute("data-tab");
        render();
      });
    }
    return elx;
  }

  var tab = "routes";
  var paintTimer = null;

  function chip(id) {
    return "<span class='log-chip' data-form='" + esc(id) + "'><canvas width='48' height='48'></canvas><span>" + esc(nameOf(id)) + "</span></span>";
  }

  function render() {
    load();
    var root = ensureScreen();
    var T = tree();
    var total = T ? Object.keys(T.species).length : 0;
    var found = Object.keys(log.forms).filter(function (k) { return !T || T.species[k]; }).length;
    root.querySelector("#log-sub").textContent = "Forms reached: " + found + " / " + total + ". How you got there is up to you to remember.";
    var tabs = root.querySelectorAll(".log-tabs .btn"), i;
    for (i = 0; i < tabs.length; i++) tabs[i].classList.toggle("is-on", tabs[i].getAttribute("data-tab") === tab);
    var html = "";
    if (tab === "routes") {
      if (!log.runs.length) html = "<p class='sub'>No routes yet. Hatch a Digi-Egg and raise your partner.</p>";
      for (i = 0; i < log.runs.length; i++) {
        var r = log.runs[i];
        if (!r.route || !r.route.length) continue;
        html += "<div class='log-route'><span class='log-route-n'>Run " + (log.runs.length - i) + "</span>" +
          r.route.map(chip).join("<span class='log-arrow'>→</span>") + "</div>";
      }
    } else {
      var s, list, id;
      for (s = 0; s < STAGES.length; s++) {
        list = [];
        if (T) for (id in T.species) if (Object.prototype.hasOwnProperty.call(T.species, id) && T.species[id].stage === STAGES[s][0]) list.push(id);
        if (!list.length) continue;
        list.sort(function (a, b) { return nameOf(a).localeCompare(nameOf(b)); });
        var got = list.filter(function (x) { return log.forms[x]; }).length;
        html += "<h3 class='log-stage'>" + STAGES[s][1] + " <small>" + got + " / " + list.length + "</small></h3><div class='log-grid'>";
        for (i = 0; i < list.length; i++) {
          id = list[i];
          if (log.forms[id]) {
            var from = cameFrom(id);
            html += "<div class='log-cell is-known' data-form='" + esc(id) + "'><canvas width='48' height='48'></canvas><b>" + (log.shiny[id] ? "<span class='log-shiny' title='Raised as a shiny'>\u2726</span> " : "") + esc(nameOf(id)) + "</b>" +
              (from.length ? "<small>from " + from.map(function (f) { return esc(nameOf(f)); }).join(", ") + "</small>" : "<small>hatched</small>") + "</div>";
          } else {
            html += "<div class='log-cell is-unknown'><div class='log-q'>?</div><b>???</b></div>";
          }
        }
        html += "</div>";
      }
    }
    root.querySelector("#log-body").innerHTML = html;
    paintThumbs();
  }

  function paintThumbs() {
    var root = document.getElementById("log-screen");
    if (!root || !D.sprites) return;
    var nodes = root.querySelectorAll("[data-form] canvas"), i, cv, id, g, h, mul, want = [];
    for (i = 0; i < nodes.length; i++) want.push(nodes[i].parentNode.getAttribute("data-form"));
    if (D.sprites.preloadSpecies) D.sprites.preloadSpecies(want, true);
    for (i = 0; i < nodes.length; i++) {
      cv = nodes[i];
      id = cv.parentNode.getAttribute("data-form");
      g = cv.getContext("2d");
      g.clearRect(0, 0, cv.width, cv.height);
      g.imageSmoothingEnabled = false;
      h = (D.sprites.visualHeight && D.sprites.visualHeight(id)) || 48;
      mul = Math.min(1.2, 40 / Math.max(1, h));
      g.save();
      g.translate(24, 45);
      g.scale(mul, mul);
      try { D.sprites.drawPartner(g, id, 0, 0, 1, 1, 0, false, false, false); } catch (e) {}
      g.restore();
    }
    if (paintTimer) clearTimeout(paintTimer);
    var tries = 0;
    (function again() {
      paintTimer = setTimeout(function () {
        tries += 1;
        if (!isOpen()) return;
        var nodes2 = root.querySelectorAll("[data-form] canvas"), j;
        for (j = 0; j < nodes2.length; j++) {
          var c2 = nodes2[j], id2 = c2.parentNode.getAttribute("data-form"), g2 = c2.getContext("2d");
          var h2 = (D.sprites.visualHeight && D.sprites.visualHeight(id2)) || 48;
          var m2 = Math.min(1.2, 40 / Math.max(1, h2));
          g2.clearRect(0, 0, c2.width, c2.height);
          g2.imageSmoothingEnabled = false;
          g2.save(); g2.translate(24, 45); g2.scale(m2, m2);
          try { D.sprites.drawPartner(g2, id2, 0, 0, 1, 1, 0, false, false, false); } catch (e) {}
          g2.restore();
        }
        if (tries < 6) again();
      }, 400);
    })();
  }

  function isOpen() {
    var r = document.getElementById("log-screen");
    return !!(r && r.classList.contains("is-on"));
  }
  function open() { ensureScreen().classList.add("is-on"); render(); }
  function close() {
    var r = document.getElementById("log-screen");
    if (r) r.classList.remove("is-on");
    if (paintTimer) clearTimeout(paintTimer);
  }

  if (typeof document !== "undefined") {
    document.addEventListener("keydown", function (ev) {
      if (isOpen() && (ev.key === "Escape" || ev.key === "Backspace")) {
        ev.stopImmediatePropagation();
        ev.preventDefault();
        close();
      }
    }, true);
  }

  D.evoLog = {
    startRun: startRun,
    record: record,
    noteShiny: noteShiny,
    open: open,
    close: close,
    isOpen: isOpen,
    data: function () { return load(); }
  };
})(typeof window !== "undefined" ? window : globalThis);
