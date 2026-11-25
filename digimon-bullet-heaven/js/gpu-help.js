/* Graphics help (17z33). When the browser is drawing without the graphics card (hardware
 * acceleration off, a driver it gave up on, or the weak built-in chip on a laptop), a page can't
 * switch it back on by itself: that's the browser's setting. So the game says so once, plainly, with
 * the steps for the browser it's in. game.js perfProbe calls maybeShow(); Pause > Graphics help and
 * the readout point here too. "Don't show again" is remembered on this computer. */
(function (root) {
  "use strict";
  var D = root.DBH = root.DBH || {};
  var KEY = "dbh_gpu_help_off", box = null, shownThisVisit = false;

  function which() {
    var ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
    if (/Edg\//.test(ua)) return "edge";
    if (/OPR\/|Opera/.test(ua)) return "opera";
    if (/Firefox\//.test(ua)) return "firefox";
    if (navigator.brave) return "brave";
    if (/Chrome\//.test(ua)) return "chrome";
    if (/Safari\//.test(ua)) return "safari";
    return "chrome";
  }
  var STEPS = {
    chrome: { name: "Chrome", addr: "chrome://settings/system", steps: ["Open Settings (the ⋮ menu, top right) and go to <b>System</b>.", "Turn on <b>Use graphics acceleration when available</b>.", "Click <b>Relaunch</b>."] },
    brave: { name: "Brave", addr: "brave://settings/system", steps: ["Open Settings and go to <b>System</b>.", "Turn on <b>Use graphics acceleration when available</b>.", "Click <b>Relaunch</b>."] },
    edge: { name: "Edge", addr: "edge://settings/system", steps: ["Open Settings (the ⋯ menu, top right) and go to <b>System and performance</b>.", "Turn on <b>Use graphics acceleration when available</b>.", "Click <b>Restart</b>."] },
    opera: { name: "Opera", addr: "opera://settings/system", steps: ["Open Settings, scroll down and go to <b>System</b> (under Advanced).", "Turn on <b>Use hardware acceleration when available</b>.", "Click <b>Relaunch</b>."] },
    firefox: { name: "Firefox", addr: "about:preferences", steps: ["Open Settings, <b>General</b>, then scroll to <b>Performance</b>.", "Untick <b>Use recommended performance settings</b>, then tick <b>Use hardware acceleration when available</b>.", "Close Firefox and open it again."] },
    safari: { name: "Safari", addr: "", steps: ["Safari always uses the graphics chip. Make sure macOS and Safari are up to date, then restart Safari."] }
  };

  function off() { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } }
  function setOff() { try { localStorage.setItem(KEY, "1"); } catch (e) {} }

  function build() {
    if (box || typeof document === "undefined") return box;
    var b = which(), S = STEPS[b], i, list = "";
    for (i = 0; i < S.steps.length; i++) list += "<li>" + S.steps[i] + "</li>";
    var other = Object.keys(STEPS).filter(function (k) { return k !== b && k !== "safari"; })
      .map(function (k) { return "<b>" + STEPS[k].name + "</b>: " + STEPS[k].steps.join(" ").replace(/<\/?b>/g, ""); }).join("<br>");
    box = document.createElement("div");
    box.id = "gpu-help";
    box.innerHTML =
      "<div class='gh-card' role='dialog' aria-labelledby='gh-title'>" +
      "<h3 id='gh-title'>Your graphics card isn't being used</h3>" +
      "<p>This browser is drawing Digi Night without your graphics card, so it runs slowly and in low detail (blurry, laggy). " +
      "A web page can't change that setting itself; it takes a minute in the browser's settings.</p>" +
      "<div class='gh-browser'>In <b>" + S.name + "</b>:</div><ol>" + list + "</ol>" +
      (S.addr ? "<div class='gh-addr'>Or paste this into the address bar: <code>" + S.addr + "</code> <button type='button' class='gh-copy'>Copy</button></div>" : "") +
      "<details><summary>Still slow after that?</summary><ul>" +
      "<li><b>Update your graphics driver</b> (NVIDIA App / GeForce Experience, AMD Adrenalin or Intel Arc Control). Browsers turn acceleration off for drivers they don't trust.</li>" +
      "<li><b>Laptops:</b> in Windows, open Settings, System, Display, <b>Graphics</b>; pick your browser and set it to <b>High performance</b>.</li>" +
      "<li>Press <b>F3</b> in the game: the <b>Graphics</b> line shows which chip it's using.</li>" +
      "</ul></details>" +
      "<details><summary>Other browsers</summary><p class='gh-other'>" + other + "</p></details>" +
      "<div class='row center gh-actions'><button type='button' class='btn' id='gh-ok'>Got it</button>" +
      "<button type='button' class='btn ghost' id='gh-never'>Don't show again</button></div></div>";
    document.body.appendChild(box);
    box.querySelector("#gh-ok").addEventListener("click", hide);
    box.querySelector("#gh-never").addEventListener("click", function () { setOff(); hide(); });
    var cp = box.querySelector(".gh-copy");
    if (cp) cp.addEventListener("click", function () {
      try { navigator.clipboard.writeText(S.addr).then(function () { cp.textContent = "Copied"; }); } catch (e) { cp.textContent = "Copy failed"; }
    });
    box.addEventListener("keydown", function (ev) { if (ev.key === "Escape") { ev.stopPropagation(); hide(); } });
    return box;
  }
  function show() { if (!build()) return; box.style.display = "flex"; shownThisVisit = true; var ok = box.querySelector("#gh-ok"); if (ok) ok.focus(); }
  function hide() { if (box) box.style.display = "none"; }
  /* once a visit, unless they said not to; never in the middle of a fight (game.js calls this at boot) */
  function maybeShow() {
    if (shownThisVisit || off()) return;
    var st = D.getState ? D.getState() : "title";
    if (st === "playing" || st === "brawl") return;
    show();
  }
  D.gpuHelp = { show: show, hide: hide, maybeShow: maybeShow, which: which, isOpen: function () { return !!(box && box.style.display === "flex"); } };
})(typeof window !== "undefined" ? window : this);
