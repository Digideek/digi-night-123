/* Pickup art (Nov 15): the things enemies drop.
 *
 * XP gem, DigiBits coin, meat, fish, berry and the seed packets are drawn by
 * scripts/art/make_items.py (28x28, cel-shaded, tinted outline) and loaded
 * from assets/items/pickups/. On the field each drop gets a soft shadow, a
 * glow in its own colour, a gentle bob, and gems and coins twinkle; the coin
 * turns. The green health cross is untouched. If a picture fails to load,
 * that drop falls back to the old drawing.
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});
  var S = D.sprites;
  if (!S || typeof document === "undefined") return;

  var CROPS = ["carrot", "cucumber", "tomato", "corn", "cabbage", "potato"];
  var FILES = { meat: ["meat"], fish: ["fish"], berry: ["berry"], xp: ["xp_0", "xp_1"], bits: ["bits_0", "bits_1", "bits_2", "bits_3"] };
  var GLOW = { meat: "#ff9a52", fish: "#5ab8ff", berry: "#ff6ac0", xp: "#4affd8", bits: "#ffd84a" };
  var CROP_GLOW = { carrot: "#f08a28", cucumber: "#5cb848", tomato: "#e83a30", corn: "#f4d040", cabbage: "#9ad860", potato: "#c8a060" };
  /* bag / shop / HUD icon names that should show the same picture */
  var ICONS = { meat: "meat", meatPack: "meat", food: "meat", fish: "fish", fishPack: "fish", berry: "berry", berryPack: "berry", bits: "bits" };
  var art = {}, glows = {}, i;
  for (i = 0; i < CROPS.length; i++) { FILES["seed_" + CROPS[i]] = ["seed_" + CROPS[i]]; GLOW["seed_" + CROPS[i]] = CROP_GLOW[CROPS[i]]; }

  function load(kind) {
    var list = FILES[kind], out = [], left = list.length;
    list.forEach(function (name, idx) {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement("canvas");
        c.width = img.width; c.height = img.height;
        c.getContext("2d").drawImage(img, 0, 0);
        out[idx] = c;
        if (--left === 0) { art[kind] = out; refreshUi(); }
      };
      img.onerror = function () { console.warn("pickup-art: missing " + name); };
      img.src = "assets/items/pickups/" + name + ".png";
    });
  }

  function glowSprite(color) {
    if (glows[color]) return glows[color];
    var c = document.createElement("canvas"), g, gr, n = parseInt(color.slice(1), 16), rgb = ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255);
    c.width = c.height = 48;
    g = c.getContext("2d");
    gr = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    gr.addColorStop(0, "rgba(" + rgb + ",0.7)");
    gr.addColorStop(0.5, "rgba(" + rgb + ",0.22)");
    gr.addColorStop(1, "rgba(" + rgb + ",0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 48, 48);
    glows[color] = c;
    return c;
  }

  var origPickup = S.drawPickup, origIcon = S.getIcon;

  function drawPickup(ctx, kind, x, y, t) {
    var fr = art[kind], tt = t || 0, c, bob, seed, tw, r, low = !!D.reducedFx;
    if (!fr) return origPickup ? origPickup(ctx, kind, x, y, t) : undefined;
    seed = x * 0.37 + y * 0.21;
    if (kind === "bits") c = fr[Math.floor(tt * 7 + seed) & 3];
    else if (kind === "xp") c = fr[Math.floor(tt * 2.5 + seed) & 1];
    else c = fr[0];
    bob = Math.sin(tt * 4.5 + seed) * 2;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    /* shadow on the ground: it stays put while the item bobs */
    ctx.globalAlpha = 0.26;
    ctx.fillStyle = "#0a1408";
    ctx.beginPath();
    ctx.ellipse(Math.round(x), Math.round(y + 11), 8 - bob * 0.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!low) {
      r = (kind === "xp" || kind === "bits" ? 17 : 20) + Math.sin(tt * 3 + seed) * 2;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = kind === "xp" || kind === "bits" ? 0.55 : 0.42;
      ctx.drawImage(glowSprite(GLOW[kind] || "#ffffff"), x - r, y - 2 + bob - r, r * 2, r * 2);
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(c, Math.round(x - c.width / 2), Math.round(y - 2 + bob - c.height / 2));
    /* gems and coins catch the light now and then */
    if (!low && (kind === "xp" || kind === "bits")) {
      tw = (tt * 0.9 + seed * 0.13) % 1;
      if (tw < 0.18) {
        r = Math.round(1 + Math.sin(tw / 0.18 * Math.PI) * 3);
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(Math.round(x + 4 - r), Math.round(y - 9 + bob), r * 2 + 1, 1);
        ctx.fillRect(Math.round(x + 4), Math.round(y - 9 + bob - r), 1, r * 2 + 1);
      }
    }
    ctx.restore();
  }

  function getIcon(name) {
    var k = ICONS[name];
    if (k && art[k]) return art[k][0];
    return origIcon ? origIcon(name) : null;
  }

  /* repaint icons that were stamped before the pictures arrived */
  function refreshUi() {
    var nodes = document.querySelectorAll(".hud-ico"), n, name, ico, row;
    for (n = 0; n < nodes.length; n++) {
      name = (nodes[n].parentNode && nodes[n].parentNode.getAttribute("data-ico")) || "";
      ico = name && ICONS[name] && getIcon(name);
      if (ico && ico.toDataURL) nodes[n].src = ico.toDataURL();
    }
    row = document.getElementById("bag-row");
    if (row) row.dataset.sig = "";
    if (typeof D.refreshShopIcons === "function") { try { D.refreshShopIcons(); } catch (e) {} }
  }

  S.drawPickup = drawPickup;
  S.drawXpOrb = function (ctx, x, y, t) { drawPickup(ctx, "xp", x, y, t); };
  S.drawMeat = function (ctx, x, y, t) { drawPickup(ctx, "meat", x, y, t); };
  S.drawFish = function (ctx, x, y, t) { drawPickup(ctx, "fish", x, y, t); };
  S.drawBerry = function (ctx, x, y, t) { drawPickup(ctx, "berry", x, y, t); };
  S.getIcon = getIcon;
  for (var k in FILES) load(k);
  D.pickupArt = { ready: function (kind) { return !!art[kind]; }, refresh: refreshUi };
})(typeof window !== "undefined" ? window : this);
