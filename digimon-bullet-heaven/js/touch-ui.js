/* Digi Night — the phone layout's own buttons (Nov 21).
 *
 * When body has .touch-ui (input.js turns it on for a finger, off for a pad or keyboard),
 * the run's HUD is trimmed down (css/touch.css) and these take over:
 *   - four thumb buttons, bottom right: Warp / the Mega ultimate (a big round button that
 *     fills as it charges), Feed, Farm, and Act (only when there's something to use:
 *     Shop, Use, Catch, DNA)
 *   - a menu button by Pause that opens a sheet with what was folded away: Skills, Status,
 *     Shop, the PvP flag, music and sound, and the run's numbers (KOs, catch progress,
 *     your form, Bits, mood, digivolve needs)
 * Everything goes through D.hud (game.js), the same calls the keys use.
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});
  function $(id) { return document.getElementById(id); }
  var pad = null, sheet = null, sheetOpen = false;

  function btn(id, cls, html, what) {
    var b = document.createElement("button");
    b.type = "button"; b.id = id; b.className = "tp-btn " + cls; b.innerHTML = html;
    b.addEventListener("pointerdown", function (e) { e.stopPropagation(); }, { passive: true });
    b.addEventListener("click", function (e) {
      e.preventDefault();
      if (D.hud) D.hud.act(what);
      if (navigator.vibrate) try { navigator.vibrate(12); } catch (er) {}
    });
    return b;
  }

  function build() {
    if (pad) return;
    var host = $("app") || document.body;
    pad = document.createElement("div");
    pad.id = "touch-pad"; pad.hidden = true;
    pad.appendChild(btn("tp-burst", "tp-big", '<i class="tp-ring"></i><b id="tp-burst-name">WARP</b><span id="tp-burst-pct">0%</span>', "burst"));
    pad.appendChild(btn("tp-act", "tp-mid tp-act", '<b id="tp-act-name">Act</b>', "interact"));
    pad.appendChild(btn("tp-feed", "tp-mid tp-feed", '<b>Feed</b>', "feed"));
    pad.appendChild(btn("tp-farm", "tp-mid tp-farm", '<b id="tp-farm-name">Farm</b>', "farm"));
    host.appendChild(pad);

    var m = document.createElement("button");
    m.type = "button"; m.id = "tp-menu"; m.setAttribute("aria-label", "More"); m.innerHTML = "<span></span><span></span><span></span><b id='tp-menu-dot' hidden></b>";
    m.addEventListener("click", function () { toggleSheet(); });
    var hb = document.querySelector(".hud-buttons");
    if (hb) hb.insertBefore(m, $("btn-pause")); else host.appendChild(m);

    sheet = document.createElement("div");
    sheet.id = "touch-sheet"; sheet.hidden = true;
    sheet.innerHTML =
      '<div class="ts-card">' +
        '<div class="ts-head"><b>Run menu</b><button type="button" id="ts-close" aria-label="Close">&times;</button></div>' +
        '<div class="ts-grid">' +
          '<button type="button" data-a="skills" id="ts-skills">Skills<i id="ts-skills-pts" hidden></i></button>' +
          '<button type="button" data-a="stats" id="ts-stats">Status<i id="ts-stats-pts" hidden></i></button>' +
          '<button type="button" data-a="inv" id="ts-inv">Bag</button>' +
          '<button type="button" data-a="pvp" id="ts-pvp">PvP flag</button>' +
          '<button type="button" data-a="music" id="ts-music">Music</button>' +
          '<button type="button" data-a="mute" id="ts-mute">Sound</button>' +
        '</div>' +
        '<div class="ts-info" id="ts-info"></div>' +
      '</div>';
    host.appendChild(sheet);
    sheet.addEventListener("click", function (e) {
      if (e.target === sheet) { toggleSheet(false); return; }
      var b = e.target.closest && e.target.closest("button[data-a]"), a;
      if (!b) return;
      a = b.getAttribute("data-a");
      if (a === "music") { if ($("btn-music")) $("btn-music").click(); }
      else if (a === "mute") { if ($("btn-mute")) $("btn-mute").click(); }
      else {
        toggleSheet(false);
        if (D.hud) D.hud.act(a);
        return;
      }
      fillSheet();
    });
    $("ts-close").addEventListener("click", function () { toggleSheet(false); });
  }

  function toggleSheet(on) {
    sheetOpen = on == null ? !sheetOpen : !!on;
    if (!sheet) return;
    sheet.hidden = !sheetOpen;
    if (sheetOpen) fillSheet();
  }

  function txt(id) { var n = $(id); return n && !n.hidden && n.style.display !== "none" ? (n.textContent || "").trim() : ""; }
  function fillSheet() {
    var info = D.hud ? D.hud.info() : {}, rows = [], t;
    var sp = badge("skills-chip-badge"), st = badge("stats-chip-badge");
    $("ts-skills-pts").hidden = !sp; $("ts-skills-pts").textContent = sp;
    $("ts-stats-pts").hidden = !st; $("ts-stats-pts").textContent = st;
    $("ts-pvp").hidden = !info.pvp;
    $("ts-pvp").textContent = info.pvpUp ? "PvP flag: UP" : "PvP flag: down";
    $("ts-pvp").classList.toggle("is-on", !!info.pvpUp);
    $("ts-music").textContent = ($("btn-music") && /off/i.test($("btn-music").title)) ? "Music: off" : "Music: on";
    $("ts-mute").textContent = ($("btn-mute") && /off/i.test($("btn-mute").title)) ? "Sound: off" : "Sound: on";
    ["hud-form", "hud-timer", "hud-bits", "hud-kills", "hud-capture", "hud-weather", "ally-chip", "mood-strip"].forEach(function (id) {
      t = txt(id); if (t) rows.push("<div>" + esc(t) + "</div>");
    });
    if ($("evo-strip") && $("evo-strip").innerHTML.trim()) rows.push("<div class='ts-evo'>" + $("evo-strip").innerHTML + "</div>");
    $("ts-info").innerHTML = rows.join("");
  }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"; }); }
  function badge(id) { var n = $(id); return n && !n.hidden ? (n.textContent || "").replace(/[^0-9]/g, "") : ""; }

  var lastSig = "";
  function tick() {
    if (!pad) return;
    var on = document.body.classList.contains("touch-ui"), info = on && D.hud ? D.hud.info() : { on: false }, sig;
    var show = !!(on && info.on);
    pad.hidden = !show;
    if ($("tp-menu")) $("tp-menu").hidden = !show;
    if (!show) { if (sheetOpen && !(info && info.on)) toggleSheet(false); return; }
    var pct = Math.max(0, Math.min(100, info.burstPct || 0));
    var nm = (info.burstName || "Warp");
    sig = [info.burstOn, pct, nm, info.burstLive, info.act, info.farmOn, info.farmGoing > 0 ? info.farmGoing.toFixed(1) : 0, info.feedOn, info.down].join("|");
    if (sig !== lastSig) {
      lastSig = sig;
      $("tp-burst").hidden = !info.burstOn;
      $("tp-burst").style.setProperty("--fill", (pct * 3.6) + "deg");
      $("tp-burst").classList.toggle("is-ready", pct >= 100 && !info.burstLive);
      $("tp-burst").classList.toggle("is-live", !!info.burstLive);
      $("tp-burst-name").textContent = nm.length > 9 ? nm.split(" ")[0].slice(0, 9).toUpperCase() : nm.toUpperCase();
      $("tp-burst-pct").textContent = info.burstLive ? "GO!" : pct >= 100 ? "READY" : pct + "%";
      $("tp-act").hidden = !info.act;
      $("tp-act-name").textContent = info.act || "";
      $("tp-feed").hidden = !info.feedOn;
      $("tp-farm").hidden = !info.farmOn;
      $("tp-farm-name").textContent = info.farmGoing > 0 ? info.farmGoing.toFixed(1) + "s" : "Farm";
      $("tp-farm").classList.toggle("is-going", info.farmGoing > 0);
      pad.classList.toggle("is-down", !!info.down);
    }
    /* a dot on the menu button when there are points to spend */
    $("tp-menu-dot").hidden = !(badge("skills-chip-badge") || badge("stats-chip-badge"));
    if (sheetOpen) fillSheet();
  }

  function init() {
    build();
    global.setInterval(tick, 120);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  D.touchUi = { toggleSheet: toggleSheet };
})(typeof window !== "undefined" ? window : this);
