/* Digi Night — the bag (17z33). I opens it (the Bag button in the touch menu too); the game keeps running.
 *
 * Everything you carry, grouped (food, rare food, garden, seeds, items), with a count and a picture.
 * Click one to see what it does and to throw some away (net/progression.js "bag.discard"), so a full
 * food bag never stops you picking up something better. The foot shows the garden's lasting boosts so
 * far (data.js vegBoosts).
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});
  if (typeof document === "undefined") return;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function st() { return D.getState ? D.getState() : ""; }
  function run() { return D.getRun ? D.getRun() : null; }
  var ui = { open: false, sel: null, sig: "" };
  var GROUPS = [["food", "Food"], ["rare", "Rare food"], ["veg", "From the garden"], ["seed", "Seeds"], ["item", "Items"]];
  var STAT_NAME = { speed: "speed", rate: "attack rate", damage: "damage", magnet: "pickup range", guard: "defence", hp: "max health" };

  function usable() { var r = run(); return !!(r && !r.ended && (st() === "playing" || st() === "farm")); }
  function shopItem(id) { var c = (D.SHOP && D.SHOP.catalog) || [], i; for (i = 0; i < c.length; i++) if (c[i].id === id) return c[i]; return null; }
  function crop(id) { var c = D.cropOfSeed ? D.cropOfSeed(id) : String(id).replace(/^seed_/, ""); return (D.CROPS && D.CROPS[c]) ? c : null; }
  /* name, what it does, which group, picture */
  function info(id) {
    var F = D.FOOD && D.FOOD[id], c, s, mins;
    if (F) {
      if (F.rare) return { name: F.name, desc: F.desc + ". Feed it at the farm. Doesn't count toward the food limit.", group: "rare" };
      if (F.veg) return { name: F.name, desc: F.desc + " (counts up to " + (D.VEG_MAX || 10) + " meals). Feed it at the farm.", group: "veg" };
      return { name: F.name, desc: (F.desc || "Feed it at the farm") + ".", group: "food" };
    }
    if (D.isSeed && D.isSeed(id) && (c = crop(id))) {
      mins = Math.round((D.CROPS[c].growSec || 0) / 6) / 10;
      return { name: D.FOOD[c].name + " seed", desc: "Plant it at the farm. It grows into " + D.FOOD[c].name.toLowerCase() + "s in about " + mins + " minutes of battle time. " + D.FOOD[c].name + ": " + (D.FOOD[c].desc || "") + ".", group: "seed" };
    }
    s = shopItem(id);
    return { name: s ? s.name : id, desc: s ? s.desc : "", group: "item" };
  }
  function icon(id) {
    var F = D.FOOD && D.FOOD[id];
    if ((F && F.veg) || (D.isSeed && D.isSeed(id))) return D.farmArt && D.farmArt.itemIcon ? D.farmArt.itemIcon(id) : null;
    var si = shopItem(id);
    return D.sprites && D.sprites.getIcon ? D.sprites.getIcon((si && si.icon) || id) : null;
  }
  /* 17z33: tools you can use from here: out in the world (Gate Key, Lure, Treasure Map) or at the farm (Care Reset) */
  function canUse(id) { var si = shopItem(id); return !!(si && si.use && ((si.use === "world" && st() === "playing") || (si.use === "farm" && st() === "farm"))); }
  function items() {
    var r = run(), bag = (r && r.bag) || {}, out = [], k;
    for (k in bag) if (bag[k] > 0) out.push(k);
    return out;
  }
  function foodHeld() { var r = run(), n = 0, k; for (k in ((r && r.bag) || {})) if (D.FOOD && D.FOOD[k] && !D.FOOD[k].rare) n += r.bag[k] || 0; return n; }

  function build() {
    if ($("inv-panel")) return;
    var box = document.createElement("div");
    box.id = "inv-panel"; box.hidden = true;
    box.innerHTML = "<div class='stats-head'><b>Bag</b><span id='inv-cap'></span><button type='button' id='inv-close' aria-label='Close'>&times;</button></div>" +
      "<div id='inv-list'></div><div id='inv-detail'></div><div id='inv-boost'></div>" +
      "<div class='stats-foot'>The game keeps going while this is open. Click something to read it or throw it away. I to close.</div>";
    (($("hud") || document.body)).appendChild(box);
    $("inv-close").addEventListener("click", function () { toggle(false); });
    box.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-item],[data-drop],[data-use]"), id, n;
      if (!b) return;
      if (b.hasAttribute("data-use")) { if (D.useBagItem && D.useBagItem(ui.sel)) { ui.sig = ""; if (!(run().bag[ui.sel] > 0)) ui.sel = null; paint(); if (st() !== "playing") toggle(false); } return; }
      if (b.hasAttribute("data-item")) { id = b.getAttribute("data-item"); ui.sel = ui.sel === id ? null : id; ui.sig = ""; paint(); return; }
      id = ui.sel; n = b.getAttribute("data-drop");
      drop(id, n === "all" ? 9999 : 1);
    });
  }
  function drop(id, n) {
    var r = run(), res;
    if (!id || !r || !(r.bag && r.bag[id] > 0) || !D.simAct) return;
    res = D.simAct({ type: "bag.discard", item: id, n: n }) || { ok: false };
    if (res.ok === false && res.reason) return;
    /* show it straight away; the snapshot says the same a moment later */
    if (res.ok) r.bag[id] = res.left;
    else r.bag[id] = Math.max(0, r.bag[id] - n);
    if (!(r.bag[id] > 0)) ui.sel = null;
    ui.sig = "";
    var row = $("bag-row"); if (row) row.dataset.sig = "";
    paint();
  }

  function boostLine() {
    var r = run(), B = D.vegBoosts ? D.vegBoosts(r && r.foodCounts) : null, parts = [], k;
    if (!B) return "";
    for (k in STAT_NAME) if (B[k] > 0) parts.push("+" + (Math.round(B[k] * 1000) / 10) + "% " + STAT_NAME[k]);
    return "<b>Garden boosts this run:</b> " + (parts.length ? parts.join(", ") : "none yet. Grow vegetables at the farm and feed them to your partner.");
  }

  function paint() {
    var box = $("inv-panel"), r = run();
    if (!box || !r) return;
    var ids = items(), sig = ids.map(function (k) { return k + r.bag[k]; }).join(",") + "|" + ui.sel + "|" + JSON.stringify(r.foodCounts || {});
    if (sig === ui.sig) return;
    ui.sig = sig;
    var held = foodHeld(), max = (D.CARE && D.CARE.bagMax) || 0, html = "", g, i, list, inf;
    $("inv-cap").textContent = max ? "Food " + held + "/" + max + (held >= max ? " full" : "") : "";
    $("inv-cap").className = held >= max && max ? "is-full" : "";
    for (g = 0; g < GROUPS.length; g++) {
      list = ids.filter(function (k) { return info(k).group === GROUPS[g][0]; });
      if (!list.length) continue;
      html += "<div class='inv-group'>" + GROUPS[g][1] + "</div><div class='inv-grid'>";
      for (i = 0; i < list.length; i++) {
        inf = info(list[i]);
        html += "<button type='button' class='inv-slot" + (ui.sel === list[i] ? " is-sel" : "") + (GROUPS[g][0] === "rare" ? " is-rare" : "") + "' data-item='" + esc(list[i]) + "' title='" + esc(inf.name) + "'><canvas width='28' height='28'></canvas><span class='inv-n'>" + r.bag[list[i]] + "</span><span class='inv-name'>" + esc(inf.name) + "</span></button>";
      }
      html += "</div>";
    }
    if (!ids.length) html = "<div class='inv-empty'>Nothing in the bag yet. Beat wild Digimon for food and seeds.</div>";
    $("inv-list").innerHTML = html;
    var cvs = box.querySelectorAll(".inv-slot"), c, ico, gx;
    for (i = 0; i < cvs.length; i++) {
      ico = icon(cvs[i].getAttribute("data-item"));
      c = cvs[i].querySelector("canvas"); gx = c.getContext("2d"); gx.imageSmoothingEnabled = false;
      if (ico) gx.drawImage(ico, 0, 0, 28, 28);
      else { gx.fillStyle = "#8894aa"; gx.fillRect(8, 8, 12, 12); }
    }
    var det = $("inv-detail");
    if (ui.sel && r.bag[ui.sel] > 0) {
      inf = info(ui.sel);
      det.hidden = false;
      det.innerHTML = "<b>" + esc(inf.name) + "</b> <span class='inv-have'>x" + r.bag[ui.sel] + "</span><p>" + esc(inf.desc) + "</p>" +
        "<div class='inv-btns'>" + (canUse(ui.sel) ? "<button type='button' class='inv-use' data-use='1'>Use</button>" : "") + "<button type='button' data-drop='1'>Throw away 1</button>" + (r.bag[ui.sel] > 1 ? "<button type='button' data-drop='all'>Throw away all " + r.bag[ui.sel] + "</button>" : "") + "</div>";
    } else { det.hidden = true; det.innerHTML = ""; }
    $("inv-boost").innerHTML = boostLine();
  }

  function toggle(force) {
    build();
    ui.open = force != null ? !!force : !ui.open;
    if (!usable()) ui.open = false;
    if (!ui.open) ui.sel = null;
    ui.sig = "";
    $("inv-panel").hidden = !ui.open;
    if (ui.open) paint();
  }
  /* game.js calls this every frame */
  function tick() {
    if (!ui.open) return;
    if (!usable()) { toggle(false); return; }
    paint();
  }
  window.addEventListener("keydown", function (ev) {
    if (ev.repeat || !(ev.key === "i" || ev.key === "I")) return;
    if (ev.target && /INPUT|TEXTAREA/.test(ev.target.tagName || "")) return;
    if (!usable() && !ui.open) return;
    toggle();
  });
  D.inventoryUi = { toggle: toggle, tick: tick, isOpen: function () { return ui.open; } };
})(typeof window !== "undefined" ? window : this);
