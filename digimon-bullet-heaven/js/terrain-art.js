/* Digimon Bullet Heaven — terrain props drawn at one pixel scale.
 *
 * Every prop on the field (trees, rocks, ruins, spires, grass...) is painted
 * here at 1 art pixel = 1 world pixel, the same density as the tamer
 * projections and close to the Digimon frames. The old props were 3x3 blocks.
 *
 * A Painter collects flat-coloured shapes; finish() then inks a dark outline
 * round the whole figure and shades every shape from the upper left (light
 * edge, dark edge, a little grain), so all props share one drawn look.
 *
 *   D.terrainArt.canvas(kind)   -> canvas, or null if the kind is not drawn here
 *   D.terrainArt.SPREAD[kind]   -> shadow width under it (0 = none)
 *   D.terrainArt.NOSEASON[kind] -> seasons leave it alone
 */
(function (global) {
  "use strict";
  var D = global.DBH = global.DBH || {};
  var cache = {};

  function hx(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function lit(c, f) { return [c[0] + (255 - c[0]) * f, c[1] + (255 - c[1]) * f, c[2] + (255 - c[2]) * f]; }
  function drk(c, f) { return [c[0] * (1 - f), c[1] * (1 - f), c[2] * (1 - f)]; }
  function hash(x, y, s) { var n = (x * 374761393 + y * 668265263 + (s || 0) * 362437) | 0; n = (n ^ (n >>> 13)) * 1274126177; n = n ^ (n >>> 16); return ((n >>> 0) % 10000) / 10000; }

  function Painter(w, h) {
    this.w = w; this.h = h; this.n = 0;
    this.c = new Array(w * h); this.r = new Int16Array(w * h); this.raw = new Uint8Array(w * h);
  }
  Painter.prototype.set = function (x, y, col, raw) {
    x = Math.round(x); y = Math.round(y);
    if (x < 1 || y < 1 || x >= this.w - 1 || y >= this.h - 1) return;
    var i = y * this.w + x;
    this.c[i] = col; this.r[i] = this.n; this.raw[i] = raw ? 1 : 0;
  };
  Painter.prototype.rect = function (x0, y0, x1, y1, col, raw) {
    var x, y; this.n++; col = typeof col === "string" ? hx(col) : col;
    for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) this.set(x, y, col, raw);
    return this;
  };
  Painter.prototype.ell = function (cx, cy, rx, ry, col, raw) {
    var x, y, dx, dy; this.n++; col = typeof col === "string" ? hx(col) : col;
    for (y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      dx = (x - cx) / rx; dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) this.set(x, y, col, raw);
    }
    return this;
  };
  Painter.prototype.poly = function (pts, col, raw) {
    var x, y, i, j, inside, minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, n = pts.length;
    this.n++; col = typeof col === "string" ? hx(col) : col;
    for (i = 0; i < n; i++) { minX = Math.min(minX, pts[i][0]); maxX = Math.max(maxX, pts[i][0]); minY = Math.min(minY, pts[i][1]); maxY = Math.max(maxY, pts[i][1]); }
    for (y = Math.floor(minY); y <= Math.ceil(maxY); y++) for (x = Math.floor(minX); x <= Math.ceil(maxX); x++) {
      inside = false;
      for (i = 0, j = n - 1; i < n; j = i++) {
        if (((pts[i][1] > y) !== (pts[j][1] > y)) && (x < (pts[j][0] - pts[i][0]) * (y - pts[i][1]) / (pts[j][1] - pts[i][1]) + pts[i][0])) inside = !inside;
      }
      if (inside) this.set(x, y, col, raw);
    }
    return this;
  };
  Painter.prototype.line = function (x0, y0, x1, y1, col, wd, raw) {
    var steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))), k, x, y, a, b, o;
    this.n++; col = typeof col === "string" ? hx(col) : col; wd = wd || 1; o = Math.floor((wd - 1) / 2);
    for (k = 0; k <= steps; k++) {
      x = Math.round(x0 + (x1 - x0) * k / steps); y = Math.round(y0 + (y1 - y0) * k / steps);
      for (a = 0; a < wd; a++) for (b = 0; b < wd; b++) this.set(x - o + a, y - o + b, col, raw);
    }
    return this;
  };
  /* a detail pixel: keeps its exact colour and does not start a new shape */
  Painter.prototype.dot = function (x, y, col) { var n = this.n; this.set(x, y, typeof col === "string" ? hx(col) : col, true); this.n = n; return this; };
  Painter.prototype.dots = function (list, col) { for (var i = 0; i < list.length; i++) this.dot(list[i][0], list[i][1], col); return this; };
  /* sprinkle detail pixels over whatever is already painted in a box */
  Painter.prototype.speckle = function (x0, y0, x1, y1, col, density, seed) {
    var x, y; col = hx(col);
    for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) if (this.c[y * this.w + x] && !this.raw[y * this.w + x] && hash(x, y, seed) < density) this.dot(x, y, col);
    return this;
  };
  Painter.prototype.finish = function (soft) {
    var w = this.w, h = this.h, self = this, cv, g, img, d, x, y, i, col, o, a, b, n;
    function other(xx, yy, reg) {
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) return true;
      var j = yy * w + xx;
      return !self.c[j] || (!self.raw[j] && self.r[j] !== reg);
    }
    function empty(xx, yy) { return xx < 0 || yy < 0 || xx >= w || yy >= h || !self.c[yy * w + xx]; }
    if (typeof document === "undefined") return null;
    cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    g = cv.getContext("2d"); img = g.createImageData(w, h); d = img.data;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      i = y * w + x; col = this.c[i]; o = i * 4;
      if (!col) {
        n = null;
        if (!empty(x - 1, y)) n = this.c[i - 1]; else if (!empty(x + 1, y)) n = this.c[i + 1]; else if (!empty(x, y - 1)) n = this.c[i - w]; else if (!empty(x, y + 1)) n = this.c[i + w];
        if (n && soft) { if (!empty(x, y + 1) || y < h - 6) { d[o] = n[0] * 0.5; d[o + 1] = n[1] * 0.5; d[o + 2] = n[2] * 0.5; d[o + 3] = 255; } }   /* grass: a soft edge, and none along the ground */
        else if (n) { d[o] = n[0] * 0.2 + 12; d[o + 1] = n[1] * 0.2 + 10; d[o + 2] = n[2] * 0.2 + 22; d[o + 3] = 255; }   /* the inked outline */
        continue;
      }
      if (!this.raw[i]) {
        a = other(x - 1, y, this.r[i]) || other(x, y - 1, this.r[i]);
        b = other(x + 1, y, this.r[i]) || other(x, y + 1, this.r[i]);
        if (a && !b) col = lit(col, 0.24);
        else if (b && !a) col = drk(col, 0.28);
        else if (!a && !b) {
          if (other(x + 2, y, this.r[i]) || other(x, y + 2, this.r[i])) col = drk(col, 0.13);
          else if (other(x - 2, y, this.r[i]) || other(x, y - 2, this.r[i])) col = lit(col, 0.09);
          n = hash(x, y, 7);
          if (n < 0.1) col = drk(col, 0.08); else if (n > 0.92) col = lit(col, 0.07);
        }
      }
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return cv;
  };

  /* ---------------------------------------------------------------- pieces */
  function foliage(p, cx, top, pal, snow) {
    p.ell(cx, top + 30, 24, 24, pal[0]);
    p.ell(cx - 10, top + 40, 13, 10, pal[1]); p.ell(cx + 10, top + 41, 12, 10, pal[1]);
    p.ell(cx - 11, top + 24, 13, 12, pal[1]); p.ell(cx + 11, top + 23, 13, 12, pal[2]);
    p.ell(cx - 1, top + 13, 13, 11, pal[2]); p.ell(cx + 1, top + 31, 11, 9, pal[2]);
    if (!snow) p.speckle(cx - 22, top + 4, cx + 22, top + 50, pal[3], 0.035, 3);
  }
  function tree(pal, snow) {
    var p = new Painter(56, 86);
    p.poly([[23, 82], [25, 56], [31, 56], [33, 82], [38, 84], [18, 84]], "#6a4a2c");
    p.line(27, 60, 27, 80, "#4a3220", 1, true);
    foliage(p, 28, 2, pal, snow);
    return p.finish();
  }
  function rockShape(p, cx, by, s, col, col2) {
    p.poly([[cx - 12 * s, by], [cx - 13 * s, by - 8 * s], [cx - 7 * s, by - 16 * s], [cx + 3 * s, by - 18 * s], [cx + 11 * s, by - 12 * s], [cx + 13 * s, by - 3 * s], [cx + 10 * s, by]], col);
    p.poly([[cx - 6 * s, by - 2], [cx - 8 * s, by - 9 * s], [cx - 2 * s, by - 14 * s], [cx + 5 * s, by - 10 * s], [cx + 4 * s, by - 2]], col2);
  }
  function blades(p, x0, x1, by, hMin, hMax, pal, seed, step) {
    var x, hgt, lean, k = 0;
    for (x = x0; x <= x1; x += step) {
      hgt = hMin + hash(x, k, seed) * (hMax - hMin); lean = (hash(x, k, seed + 1) - 0.5) * 7;
      p.poly([[x - 2, by], [x + lean, by - hgt], [x + 3, by]], pal[(hash(x, k, seed + 2) * pal.length) | 0]);
      k++;
    }
  }
  function crystalCluster(pal, w, h) {
    var p = new Painter(w, h), cx = w / 2, by = h - 4;
    p.poly([[cx - 12, by], [cx - 10, by - 16], [cx - 5, by - 22], [cx - 2, by]], pal[2]);
    p.poly([[cx + 2, by], [cx + 5, by - 18], [cx + 10, by - 24], [cx + 13, by - 8], [cx + 12, by]], pal[0]);
    p.poly([[cx - 6, by], [cx - 5, by - 26], [cx, by - (h - 8)], [cx + 5, by - 26], [cx + 6, by]], pal[1]);
    p.line(cx, by - (h - 12), cx, by - 6, pal[3], 1, true);
    p.dots([[cx - 8, by - 14], [cx + 8, by - 18], [cx - 2, by - 24]], "#ffffff");
    return p.finish();
  }
  function bitsCluster(col) {
    var p = new Painter(24, 30), list = [[5, 20, 5], [13, 12, 6], [8, 5, 4], [17, 22, 3]], i;
    for (i = 0; i < list.length; i++) p.rect(list[i][0], list[i][1], list[i][0] + list[i][2], list[i][1] + list[i][2], col);
    p.dots([[14, 13], [6, 21], [9, 6]], "#ffffff");
    return p.finish();
  }
  function spire(used) {
    var p = new Painter(38, used ? 70 : 104), by = p.h - 4, top = used ? 26 : 3;
    rockShape(p, 10, by, 0.6, "#2a2636", "#3a3448"); rockShape(p, 28, by, 0.55, "#2a2636", "#3a3448");
    if (used) p.poly([[9, by], [11, top + 10], [15, top + 2], [19, top + 9], [23, top], [27, top + 12], [29, by]], "#3a3644");
    else p.poly([[9, by], [11, 34], [19, top], [27, 34], [29, by]], "#1a1622");
    p.poly(used ? [[11, by - 2], [13, top + 12], [17, top + 8], [18, by - 2]] : [[11, by - 2], [13, 36], [19, top + 6], [19, by - 2]], used ? "#4a4656" : "#2c2638");
    if (used) { p.line(19, top + 10, 16, by - 14, "#17141e", 1, true); p.line(16, by - 14, 21, by - 6, "#17141e", 1, true); }
    else {
      /* runes that glow */
      p.line(19, 14, 19, 22, "#d070ff", 1, true); p.dots([[19, 8], [19, 9]], "#f4c8ff");
      p.line(16, 40, 22, 40, "#b048f0", 1, true); p.line(19, 36, 19, 46, "#b048f0", 1, true);
      p.line(15, 58, 19, 54, "#b048f0", 1, true); p.line(19, 54, 23, 58, "#b048f0", 1, true); p.line(15, 58, 23, 58, "#8a30c8", 1, true);
      p.dots([[17, 72], [21, 72], [19, 76], [17, 80], [21, 80]], "#d070ff");
    }
    return p.finish();
  }
  function cacheBox(used) {
    var p = new Painter(30, 30), by = 26;
    p.rect(4, 12, 25, by, "#2f5f84");
    if (used) { p.rect(5, 12, 24, 16, "#0e1622", true); p.poly([[3, 12], [6, 4], [27, 4], [26, 12]], "#3f7aa6"); }
    else { p.rect(3, 8, 26, 13, "#4a8ab8"); p.rect(13, 11, 16, 16, "#ffd24a"); p.line(5, 20, 24, 20, "#7cf0c0", 1, true); p.dots([[8, 23], [12, 23], [16, 23], [20, 23]], "#7cf0c0"); }
    p.rect(4, 22, 6, by, "#22455f"); p.rect(23, 22, 25, by, "#22455f");
    return p.finish();
  }
  /* 17z33 (Isaac: "a spire's chest should sit at the foot of the spire like a regular chest you open"): the same
   * crate shape as a data cache, in the grade's metal. Each grade has its own shape too, not only its colour:
   * bronze is a plain wooden chest, silver adds corner studs and a domed lid, gold is bigger with a star on the lid. */
  function spireChest(tier) {
    var gold = tier === "gold", silver = tier === "silver", W = gold ? 36 : 32, p = new Painter(W, gold ? 34 : 30), by = p.h - 4, x0 = 4, x1 = W - 5,
      band = gold ? "#ffd24a" : (silver ? "#d8e4f4" : "#d0884a"), deep = gold ? "#a87010" : (silver ? "#7a8aa4" : "#7a4a22"),
      wood = gold ? "#c88a20" : (silver ? "#58627a" : "#6a4422"), lid = gold ? "#e8a82a" : (silver ? "#8a98b0" : "#86562a"), top = by - 16, mid = Math.round((x0 + x1) / 2);
    p.rect(x0, top + 5, x1, by, wood);                                        /* the box */
    if (silver || gold) p.poly([[x0 - 1, top + 6], [x0 + 2, top - 1], [x1 - 2, top - 1], [x1 + 1, top + 6]], lid);   /* a domed lid */
    else p.rect(x0 - 1, top, x1 + 1, top + 6, lid);                           /* a flat one */
    p.rect(x0, top + 6, x1, top + 7, band);                                   /* the rim */
    p.rect(x0 + 3, top - (silver || gold ? 0 : 0), x0 + 4, by, band); p.rect(x1 - 4, top, x1 - 3, by, band);   /* its bands */
    p.rect(mid - 2, top + 5, mid + 2, top + 10, deep); p.dot(mid, top + 7, "#fff6c8");   /* the lock */
    if (silver || gold) p.dots([[x0 + 1, top + 9], [x1 - 1, top + 9], [x0 + 1, by - 2], [x1 - 1, by - 2]], "#ffffff");   /* corner studs */
    if (gold) { p.poly([[mid, top - 6], [mid + 2, top - 2], [mid + 5, top - 2], [mid + 3, top + 1], [mid + 4, top + 4], [mid, top + 2], [mid - 4, top + 4], [mid - 3, top + 1], [mid - 5, top - 2], [mid - 2, top - 2]], "#fff0a0"); p.dot(mid - 3, by - 4, "#e0264a"); p.dot(mid + 3, by - 4, "#28c070"); }
    p.line(x0 + 1, by, x1 - 1, by, deep, 1, true);
    return p.finish();
  }
  function pillar(broken) {
    var p = new Painter(34, broken ? 50 : 88), by = p.h - 4, y, k = 0, A = "#b9b6c8", B2 = "#a9a6ba", top = broken ? 16 : 16;
    p.rect(3, by - 5, 30, by, "#8f8ca2"); p.rect(5, by - 9, 28, by - 6, "#a19eb4");
    p.rect(8, top, 25, by - 10, B2);
    for (y = by - 20; y >= top; y -= 11) { p.rect(8, y, 25, y + 10, k % 2 ? A : B2); k++; }
    if (broken) {
      p.poly([[8, top + 10], [8, top + 2], [12, top - 4], [16, top + 3], [20, top - 2], [25, top + 5], [25, top + 10]], A);
      p.ell(29, by - 2, 3, 2, "#a19eb4");
    } else {
      p.rect(5, 10, 28, 15, "#a19eb4"); p.rect(3, 4, 30, 9, "#c6c3d4");
    }
    for (y = (broken ? top + 4 : 18); y < by - 10; y += 2) { p.dot(12, y, "#8a879c"); p.dot(21, y, "#8a879c"); }
    p.speckle(4, 4, 30, by, "#7e7b92", 0.03, 5);
    return p.finish();
  }

  var DRAW = {
    tree: function () { return tree(["#2c7434", "#3c9440", "#56b24c", "#9ad868"]); },
    snowtree: function () { return tree(["#8fb0c4", "#cfe2ee", "#f4fbff", "#ffffff"], true); },
    deadtree: function () {
      var p = new Painter(52, 78), c = "#5c4a54";
      p.poly([[21, 74], [23, 40], [29, 40], [31, 74], [36, 76], [16, 76]], c);
      p.line(25, 42, 14, 22, c, 3); p.line(14, 22, 8, 8, c, 2); p.line(15, 24, 5, 24, c, 2);
      p.line(27, 42, 36, 20, c, 3); p.line(36, 20, 45, 10, c, 2); p.line(34, 26, 44, 28, c, 2); p.line(26, 40, 26, 14, c, 3); p.line(26, 14, 22, 4, c, 2);
      p.dot(26, 56, "#2a2028"); p.dot(27, 57, "#2a2028"); p.dot(26, 58, "#2a2028");
      return p.finish();
    },
    rock: function () { var p = new Painter(30, 24); rockShape(p, 15, 20, 1, "#7f7f8c", "#9a9aa8"); p.line(13, 9, 16, 15, "#56565f", 1, true); return p.finish(); },
    snowrock: function () { var p = new Painter(30, 24); rockShape(p, 15, 20, 1, "#7c8898", "#98a6b6"); p.ell(14, 6, 9, 3, "#f0f7fb"); return p.finish(); },
    boulder: function () {
      var p = new Painter(48, 40); rockShape(p, 24, 36, 1.75, "#77778a", "#9292a4");
      p.line(20, 12, 25, 22, "#50505c", 1, true); p.line(25, 22, 22, 30, "#50505c", 1, true);
      p.speckle(6, 24, 40, 36, "#5c8a4a", 0.12, 9);
      return p.finish();
    },
    pebbles: function () { var p = new Painter(26, 12); p.ell(6, 7, 4, 3, "#8a8a96"); p.ell(15, 8, 3, 2, "#9a9aa6"); p.ell(21, 6, 3, 3, "#7c7c88"); return p.finish(); },
    bush: function () {
      var p = new Painter(34, 26);
      p.ell(17, 16, 14, 8, "#2c7434"); p.ell(10, 13, 8, 7, "#3c9440"); p.ell(23, 13, 8, 7, "#3c9440"); p.ell(17, 9, 8, 6, "#56b24c");
      p.dots([[9, 12], [22, 15], [16, 8], [26, 11]], "#e8485a");
      return p.finish();
    },
    stump: function () {
      var p = new Painter(26, 20);
      p.poly([[5, 16], [7, 6], [19, 6], [21, 16], [23, 17], [3, 17]], "#6a4a2c"); p.ell(13, 6, 6, 3, "#c9a273");
      p.dots([[13, 6], [11, 6], [15, 5]], "#8a6a44");
      return p.finish();
    },
    log: function () {
      var p = new Painter(46, 20);
      p.rect(6, 6, 38, 15, "#6a4a2c"); p.ell(39, 10.5, 4, 5, "#c9a273"); p.ell(6, 10.5, 3, 5, "#5a3e24");
      p.dots([[39, 10], [40, 11]], "#8a6a44"); p.line(12, 9, 30, 9, "#4a3220", 1, true); p.speckle(8, 6, 34, 8, "#5c8a4a", 0.18, 4);
      return p.finish();
    },
    pillar: function () { return pillar(false); },
    pillar_broken: function () { return pillar(true); },
    wall: function () {
      var p = new Painter(50, 42), by = 38, rows = [[30, 0], [20, 6], [10, 0]], r, x, k = 0;
      for (r = 0; r < rows.length; r++) for (x = 3 - rows[r][1]; x < 46; x += 12) {
        if (r === 2 && x > 28) continue;                      /* the top course has fallen away on one side */
        p.rect(Math.max(3, x), rows[r][0], Math.min(46, x + 11), rows[r][0] + 8, k % 2 ? "#b9b6c8" : "#a9a6ba"); k++;
      }
      p.poly([[30, 20], [34, 14], [38, 18], [41, 20]], "#a9a6ba"); p.ell(44, by - 1, 3, 2, "#a19eb4");
      p.speckle(3, 10, 46, by, "#7e7b92", 0.03, 6); p.speckle(3, 28, 46, by, "#5c8a4a", 0.05, 8);
      return p.finish();
    },
    spire: function () { return spire(false); },
    spire_used: function () { return spire(true); },
    cache: function () { return cacheBox(false); },
    cache_used: function () { return cacheBox(true); },
    chest_bronze: function () { return spireChest("bronze"); },
    chest_silver: function () { return spireChest("silver"); },
    chest_gold: function () { return spireChest("gold"); },
    monolith: function () {
      var p = new Painter(36, 68), by = 64;
      p.poly([[7, by], [9, 12], [16, 4], [25, 8], [29, by]], "#6e7a80"); p.poly([[9, by - 2], [11, 14], [16, 7], [17, by - 2]], "#87949a");
      p.line(19, 20, 19, 34, "#7cf0e0", 1, true); p.line(15, 26, 23, 26, "#7cf0e0", 1, true); p.dots([[16, 42], [22, 42], [19, 46]], "#7cf0e0");
      p.speckle(7, 40, 29, by, "#5c8a4a", 0.07, 2);
      return p.finish();
    },
    shrine: function () {
      var p = new Painter(48, 56), by = 52;
      p.rect(6, by - 4, 41, by, "#8f8ca2"); p.rect(10, by - 8, 37, by - 5, "#a19eb4");
      p.rect(12, 22, 16, by - 9, "#9a4a3a"); p.rect(31, 22, 35, by - 9, "#9a4a3a"); p.rect(17, 26, 30, by - 9, "#2a2230", true);
      p.poly([[2, 22], [10, 10], [38, 10], [46, 22]], "#b8503c"); p.rect(8, 6, 40, 10, "#d06a4c");
      p.dots([[23, 30], [24, 30], [23, 31], [24, 31], [24, 32]], "#ffd24a");
      return p.finish();
    },
    tallgrass: function () { var p = new Painter(30, 26); blades(p, 5, 24, 22, 10, 19, ["#2c7434", "#3c9440", "#56b24c"], 11, 3); return p.finish(true); },
    meadow0: function () { var p = new Painter(54, 34); blades(p, 3, 50, 30, 15, 27, ["#2c7434", "#3c9440", "#56b24c", "#4aa646"], 21, 3); return p.finish(true); },
    meadow1: function () { var p = new Painter(54, 34); blades(p, 4, 50, 30, 14, 26, ["#2c7434", "#3c9440", "#56b24c", "#4aa646"], 47, 3); p.dots([[14, 12], [36, 9]], "#fff2a8"); return p.finish(true); },
    /* what fire leaves of them, and the shoots that come back */
    meadow_burnt: function () { var p = new Painter(54, 34); blades(p, 5, 49, 30, 3, 8, ["#1c1512", "#2a1e18", "#3a2a20", "#15100e"], 29, 5); p.dots([[12, 27], [30, 25], [41, 28]], "#ff8a2a"); return p.finish(true); },
    meadow_sprout: function () { var p = new Painter(54, 34); blades(p, 4, 50, 30, 6, 13, ["#3c9440", "#56b24c", "#7cc85a"], 57, 5); return p.finish(true); },
    tallgrass_burnt: function () { var p = new Painter(30, 26); blades(p, 6, 23, 22, 3, 7, ["#1c1512", "#2a1e18", "#3a2a20"], 13, 5); return p.finish(true); },
    tallgrass_sprout: function () { var p = new Painter(30, 26); blades(p, 6, 23, 22, 5, 10, ["#3c9440", "#56b24c", "#7cc85a"], 17, 5); return p.finish(true); },
    meadow2: function () { var p = new Painter(54, 34); blades(p, 3, 51, 30, 16, 28, ["#2c7434", "#3c9440", "#56b24c", "#4aa646"], 83, 3); return p.finish(true); },
    flower: function () { var p = new Painter(11, 12); p.line(5, 6, 5, 9, "#3c9440", 1, true); p.dots([[5, 3], [3, 5], [7, 5], [5, 7]], "#ff8ab8"); p.dot(5, 5, "#fff2a8"); return p.finish(); },
    flower2: function () { var p = new Painter(11, 12); p.line(5, 6, 5, 9, "#3c9440", 1, true); p.dots([[5, 3], [3, 5], [7, 5], [5, 7]], "#f4f0ff"); p.dot(5, 5, "#ffb030"); return p.finish(); },
    mushroom: function () {
      var p = new Painter(28, 30);
      p.poly([[11, 26], [12, 14], [16, 14], [17, 26]], "#e8dcc0"); p.poly([[3, 16], [6, 7], [14, 3], [22, 7], [25, 16]], "#c0507c");
      p.dots([[9, 9], [10, 9], [9, 10], [17, 7], [18, 7], [20, 12], [13, 12], [14, 12]], "#fff4f8");
      return p.finish();
    },
    cactus: function () {
      var p = new Painter(32, 56), c = "#4a9a5a";
      p.rect(13, 8, 19, 52, c); p.ell(16, 8, 3.5, 4, c);
      p.rect(5, 22, 12, 26, c); p.rect(5, 14, 8, 22, c); p.rect(20, 30, 27, 34, c); p.rect(24, 20, 27, 30, c);
      p.dots([[16, 14], [16, 22], [16, 30], [16, 38], [16, 46], [6, 18], [26, 24]], "#d8f0c0"); p.dots([[15, 4], [16, 3], [17, 4]], "#ff7ab0");
      return p.finish();
    },
    pole: function () {
      var p = new Painter(36, 96), c = "#6a4a2c";
      p.rect(16, 6, 19, 92, c); p.rect(4, 12, 31, 15, c); p.rect(8, 24, 27, 26, c);
      p.dots([[6, 10], [6, 11], [29, 10], [29, 11], [10, 22], [10, 23], [25, 22], [25, 23]], "#d8e8f0");
      p.line(17, 30, 17, 88, "#4a3220", 1, true);
      return p.finish();
    },
    gear: function () {
      var p = new Painter(44, 34), cx = 22, cy = 30, k, a;
      for (k = 0; k < 7; k++) { a = Math.PI + k * Math.PI / 6; p.rect(Math.round(cx + Math.cos(a) * 17) - 2, Math.round(cy + Math.sin(a) * 17) - 2, Math.round(cx + Math.cos(a) * 17) + 2, Math.round(cy + Math.sin(a) * 17) + 2, "#8a6e52"); }
      p.poly([[6, 30], [8, 20], [14, 13], [22, 11], [30, 13], [36, 20], [38, 30]], "#9a7c5c"); p.poly([[15, 30], [17, 24], [22, 21], [27, 24], [29, 30]], "#3a2c22", true);
      p.speckle(6, 11, 38, 30, "#c0683a", 0.06, 12);
      return p.finish();
    },
    server: function () {
      var p = new Painter(38, 66), y;
      p.rect(6, 6, 31, 62, "#474d66"); p.rect(8, 4, 29, 6, "#5c6384");
      for (y = 11; y < 56; y += 9) { p.rect(9, y, 28, y + 5, "#2a2e40", true); p.dot(11, y + 2, y % 2 ? "#7cf0c0" : "#58d8ff"); p.dot(13, y + 2, "#7cf0c0"); p.dot(26, y + 2, y % 3 ? "#ffd24a" : "#ff6a6a"); p.line(16, y + 3, 23, y + 3, "#3c4258", 1, true); }
      return p.finish();
    },
    vent: function () {
      var p = new Painter(40, 30);
      p.poly([[3, 26], [9, 14], [15, 8], [25, 8], [31, 14], [37, 26]], "#4a3a3c"); p.poly([[8, 25], [12, 15], [16, 10], [19, 25]], "#5e4c4e");
      p.ell(20, 9, 5, 2, "#ff8a3a", true); p.dots([[19, 9], [20, 9], [21, 9]], "#ffe07a"); p.dots([[24, 16], [25, 18], [14, 19]], "#ff8a3a");
      return p.finish();
    },
    crystal: function () { return crystalCluster(["#30a8c8", "#4ad0e8", "#2488a8", "#b8f6ff"], 34, 46); },
    icecrystal: function () { return crystalCluster(["#8cc8ec", "#c4ecff", "#6aa8d4", "#ffffff"], 34, 44); },
    shard: function () { return crystalCluster(["#5a3a8a", "#7a52b0", "#3a2460", "#ff8af0"], 30, 48); },
    bits: function () { return bitsCluster("#b8f060"); },
    bitsc: function () { return bitsCluster("#5af0ff"); }
  };

  var SPREAD = { tree: 1.3, snowtree: 1.3, deadtree: 0.9, rock: 0.75, snowrock: 0.75, boulder: 1.3, pebbles: 0, bush: 0.9, stump: 0.6, log: 1.1, pillar: 0.9, pillar_broken: 0.9, wall: 1.3,
    spire: 0.9, spire_used: 0.9, cache: 0.75, cache_used: 0.75, chest_bronze: 0.75, chest_silver: 0.75, chest_gold: 0.8, monolith: 0.9, shrine: 1.2, tallgrass: 0, meadow0: 0, meadow1: 0, meadow2: 0, meadow_burnt: 0, meadow_sprout: 0, tallgrass_burnt: 0, tallgrass_sprout: 0, flower: 0, flower2: 0,
    mushroom: 0.6, cactus: 0.7, pole: 0.5, gear: 1.1, server: 0.9, vent: 1.0, crystal: 0.8, icecrystal: 0.8, shard: 0.7, bits: 0.5, bitsc: 0.5 };
  var NOSEASON = { snowtree: 1, snowrock: 1, icecrystal: 1, crystal: 1, shard: 1, spire: 1, spire_used: 1, cache: 1, cache_used: 1, chest_bronze: 1, chest_silver: 1, chest_gold: 1, bits: 1, bitsc: 1, server: 1, vent: 1, cactus: 1, gear: 1, pole: 1, mushroom: 1, deadtree: 1, meadow_burnt: 1, tallgrass_burnt: 1 };

  function canvas(kind) {
    if (cache[kind] !== undefined) return cache[kind];
    return (cache[kind] = DRAW[kind] ? DRAW[kind]() : null);
  }

  D.terrainArt = { canvas: canvas, has: function (k) { return !!DRAW[k]; }, SPREAD: SPREAD, NOSEASON: NOSEASON, kinds: function () { return Object.keys(DRAW); } };
})(typeof window !== "undefined" ? window : globalThis);
