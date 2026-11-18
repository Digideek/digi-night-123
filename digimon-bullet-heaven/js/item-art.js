/* Championship DS item-icon overrides. Fallback remains the procedural art in sprites.js.
   Loads assets/items/manifest.json and transparent PNGs. Does not change item effects or prices. */
(function (global) {
  "use strict";

  var D = global.DBH = global.DBH || {};
  var TARGET = 36; /* match procedural ICO bake: 12 * SCALE 3 */
  var PICKUP = 30; /* close to baked MEAT (10x9 * 3) */
  var canvases = {}; /* sprite id -> square canvas */
  var pickupCanvases = {};
  var swaps = {};
  var ready = false;
  var origGetIcon;
  var origDrawIcon;
  var origDrawPickup;
  var origDrawMeat;

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error("item-art: failed to load " + src)); };
      img.src = src;
    });
  }

  function toCanvas(img, size) {
    var c = document.createElement("canvas");
    var ctx, sc, w, h, x, y;
    size = size || TARGET;
    c.width = size;
    c.height = size;
    ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    sc = Math.max(1, Math.floor(Math.min(size / img.width, size / img.height)));
    w = img.width * sc;
    h = img.height * sc;
    if (w > size || h > size) {
      sc = Math.min(size / img.width, size / img.height);
      w = Math.max(1, Math.round(img.width * sc));
      h = Math.max(1, Math.round(img.height * sc));
    }
    x = Math.round((size - w) / 2);
    y = Math.round((size - h) / 2);
    ctx.drawImage(img, 0, 0, img.width, img.height, x, y, w, h);
    return c;
  }

  function wrap() {
    var S = D.sprites;
    if (!S || S._itemArtWrapped) return;
    origGetIcon = S.getIcon;
    origDrawIcon = S.drawIcon;
    origDrawPickup = S.drawPickup;
    origDrawMeat = S.drawMeat;
    S.getIcon = function (name) {
      var sid = swaps[name];
      if (sid && canvases[sid]) return canvases[sid];
      return origGetIcon ? origGetIcon(name) : null;
    };
    S.drawIcon = function (ctx, name, x, y, mul) {
      var c = S.getIcon(name);
      if (!c) return;
      mul = mul || 1;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(c, Math.round(x), Math.round(y), Math.round(c.width * mul), Math.round(c.height * mul));
      ctx.restore();
    };
    S.drawPickup = function (ctx, kind, x, y, t) {
      var sid = swaps[kind];
      var c = sid && (pickupCanvases[sid] || canvases[sid]);
      var bob;
      if (!c) {
        if (origDrawPickup) return origDrawPickup(ctx, kind, x, y, t);
        return;
      }
      bob = Math.sin((t || 0) * 6 + x) * 2;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(x), Math.round(y + bob));
      ctx.drawImage(c, Math.round(-c.width / 2), Math.round(-c.height / 2));
      ctx.restore();
    };
    S.drawMeat = function (ctx, x, y, t) { S.drawPickup(ctx, "meat", x, y, t); };
    S._itemArtWrapped = true;
    S.itemArtReady = function () { return ready; };
  }

  function refreshUi() {
    var nodes, chips, i, img, name, ico, canvas, ctx, chip, id;
    if (!D.sprites || !D.sprites.getIcon) return;
    nodes = document.querySelectorAll(".hud-ico");
    for (i = 0; i < nodes.length; i++) {
      img = nodes[i];
      name = (img.parentNode && img.parentNode.getAttribute("data-ico")) || "";
      if (!name && img.alt) name = img.alt;
      /* stampHudIcons uses map hp/xp/food/joy on the parent id */
      if (!name && img.parentNode && img.parentNode.id) {
        if (img.parentNode.id.indexOf("food") >= 0) name = "food";
        else if (img.parentNode.id.indexOf("hp") >= 0) name = "hp";
        else if (img.parentNode.id.indexOf("xp") >= 0) name = "xp";
        else if (img.parentNode.id.indexOf("joy") >= 0) name = "joy";
      }
      ico = name && D.sprites.getIcon(name);
      if (ico && ico.toDataURL) img.src = ico.toDataURL();
    }
    chips = document.querySelectorAll(".bag-chip canvas");
    for (i = 0; i < chips.length; i++) {
      canvas = chips[i];
      chip = canvas.parentNode;
      id = chip && chip.getAttribute("data-id");
      ico = id && D.sprites.getIcon(id);
      if (!ico) continue;
      ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(ico, 0, 0, canvas.width, canvas.height);
    }
    if (typeof D.refreshShopIcons === "function") D.refreshShopIcons();
  }

  function applyManifest(data) {
    var jobs = [];
    var i, sp, list;
    swaps = data.swaps || {};
    list = data.sprites || [];
    for (i = 0; i < list.length; i++) {
      sp = list[i];
      if (!sp.file) continue;
      jobs.push((function (entry) {
        return loadImage("assets/items/" + entry.file).then(function (img) {
          canvases[entry.id] = toCanvas(img, TARGET);
          pickupCanvases[entry.id] = toCanvas(img, PICKUP);
        }).catch(function (err) {
          console.warn(err && err.message ? err.message : err);
        });
      })(sp));
    }
    return Promise.all(jobs);
  }

  function boot() {
    wrap();
    return fetch("assets/items/manifest.json").then(function (r) {
      if (!r.ok) throw new Error("item-art: missing manifest");
      return r.json();
    }).then(applyManifest).then(function () {
      ready = true;
      wrap();
      refreshUi();
    }).catch(function (err) {
      console.warn("item-art:", err && err.message ? err.message : err);
    });
  }

  D.itemArt = {
    ready: function () { return ready; },
    refresh: refreshUi,
    boot: boot
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window);
