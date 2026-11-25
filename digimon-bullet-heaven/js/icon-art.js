/* Digi Night — hand-shaded pixel icons for the Items, the Lab and the Badges (Nov 20).
 *
 * Every icon is drawn on a 32 x 32 pixel grid from simple shapes, then shaded the way
 * pixel artists do it by hand:
 *   - each material has a five-tone ramp (deep shadow, shadow, base, light, shine), with the
 *     hue nudged cool in the shadows and warm in the lights;
 *   - light comes from the top left: a lit rim on the upper-left edges, a shadow rim on the
 *     lower-right ones, a soft diagonal fall-off across each shape;
 *   - a shape sitting on another darkens the one underneath along its edge (contact shadow);
 *   - a dark outline goes around the whole thing, tinted by the colour it borders.
 * On top of that come rarity backdrops (common slate, rare blue glow, prismatic rainbow),
 * badge medals (bronze, silver, gold, prismatic) and a locked look.
 *
 *   D.iconArt.item(canvas, id, { rarity, locked })      the Items screen (data.js ITEMS)
 *   D.iconArt.scroll(canvas, { locked })                 a rival's scroll
 *   D.iconArt.lab(canvas, id, { max })                   the Lab (data.js LAB)
 *   D.iconArt.badge(canvas, badge, { got })              a badge (badges.js)
 * The emblems are original designs (no symbols copied from the show).
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});
  var N = 32;

  /* ---------- colour ---------- */
  function hex2rgb(h) { h = h.replace("#", ""); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function rgb2hsl(c) {
    var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2, d = mx - mn;
    if (d) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
    return [h, s, l];
  }
  function hsl2hex(h, s, l) {
    h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    function t(v) { var s2 = Math.round((v + m) * 255).toString(16); return s2.length < 2 ? "0" + s2 : s2; }
    return "#" + t(r) + t(g) + t(b);
  }
  /* hue drifts toward blue in the shadows and toward yellow in the lights */
  function toward(h, target, amt) { var d = ((target - h + 540) % 360) - 180; return h + Math.max(-amt, Math.min(amt, d)); }
  var rampCache = {};
  function ramp(base) {
    if (rampCache[base]) return rampCache[base];
    var hsl = rgb2hsl(hex2rgb(base)), h = hsl[0], s = hsl[1], l = hsl[2], grey = s < 0.08;
    var r = [
      hsl2hex(grey ? h : toward(h, 245, 22), s * 0.95 + 0.06, l * 0.42),
      hsl2hex(grey ? h : toward(h, 245, 11), s, l * 0.7),
      base,
      hsl2hex(grey ? h : toward(h, 55, 10), s * 0.95, l + (1 - l) * 0.32),
      hsl2hex(grey ? h : toward(h, 55, 18), s * 0.7, l + (1 - l) * 0.66)
    ];
    rampCache[base] = r;
    return r;
  }
  var M = {
    gold: "#e2a624", silver: "#a9b7c9", bronze: "#c27536", steel: "#6f7d94", iron: "#4a5468",
    red: "#d9324a", crimson: "#a8203a", orange: "#f47a22", flame: "#ffb02a", yellow: "#ffd83a",
    blue: "#3466d8", sky: "#45a8f0", cyan: "#3cc8e8", ice: "#9ae2fa", water: "#2a8ed8",
    green: "#36a84a", leaf: "#66c83e", lime: "#a6e03a", teal: "#22a49a", slime: "#7cd23a",
    purple: "#7a44c8", violet: "#a66af0", dark: "#3e3460", pink: "#f272aa", rose: "#e8405e",
    white: "#e8eef6", paper: "#ecd8a6", parch: "#d8b878", wood: "#94602e", brown: "#6e4426", leather: "#8a4e2a",
    meat: "#c4523a", bone: "#eee4cc", glass: "#8fd2ee", black: "#2a2f40", coal: "#383848", egg: "#f2ead6", cream: "#f6e6b8", ruby: "#e0264a", emerald: "#28c070", sapphire: "#2a6ae8", amethyst: "#9a48e0", topaz: "#f2a024"
  };
  var FLAT = { ink: "#121626", hl: "#ffffff", glint: "#fff7d0", spark: "#ffffff" };

  /* ---------- the drawing kit ---------- */
  var mk = (typeof document !== "undefined") ? function (w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; } : null;
  function Grid() {
    this.layer = new Int16Array(N * N).fill(-1);   /* which shape owns each pixel */
    this.mats = [];                                 /* per shape: material colour, options */
    this.flat = {};                                 /* x,y -> flat colour (drawn on top, unshaded) */
    this.tmp = mk(N, N); this.tc = this.tmp.getContext("2d");
  }
  Grid.prototype._shape = function (mat, opt, draw) {
    var c = this.tc, d, i, id = this.mats.length, base = M[mat] || mat;
    c.clearRect(0, 0, N, N); c.fillStyle = "#fff"; c.strokeStyle = "#fff"; c.lineCap = "round"; c.lineJoin = "round";
    c.beginPath(); draw(c);
    d = c.getImageData(0, 0, N, N).data;
    this.mats.push({ col: base, sh: !(opt && opt.flat), o: opt || {} });
    for (i = 0; i < N * N; i++) if (d[i * 4 + 3] >= 120) {
      if (opt && opt.cut) this.layer[i] = -1; else this.layer[i] = id;
    }
    return this;
  };
  Grid.prototype.circle = function (x, y, r, mat, o) { return this._shape(mat, o, function (c) { c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }); };
  Grid.prototype.ellipse = function (x, y, rx, ry, mat, o, rot) { return this._shape(mat, o, function (c) { c.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); c.fill(); }); };
  Grid.prototype.rect = function (x, y, w, h, mat, o) { return this._shape(mat, o, function (c) { c.rect(x, y, w, h); c.fill(); }); };
  Grid.prototype.rrect = function (x, y, w, h, r, mat, o) {
    return this._shape(mat, o, function (c) { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); c.fill(); });
  };
  Grid.prototype.poly = function (pts, mat, o) { return this._shape(mat, o, function (c) { c.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fill(); }); };
  Grid.prototype.line = function (pts, w, mat, o) { return this._shape(mat, o, function (c) { c.lineWidth = w; c.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.stroke(); }); };
  Grid.prototype.arc = function (x, y, r, a0, a1, w, mat, o) { return this._shape(mat, o, function (c) { c.lineWidth = w; c.arc(x, y, r, a0, a1); c.stroke(); }); };
  Grid.prototype.ring = function (x, y, r, w, mat, o) { return this.arc(x, y, r, 0, Math.PI * 2, w, mat, o); };
  Grid.prototype.star = function (x, y, r1, r2, n, mat, o, rot) {
    var pts = [], i, a; rot = rot == null ? -Math.PI / 2 : rot;
    for (i = 0; i < n * 2; i++) { a = rot + i * Math.PI / n; pts.push(x + Math.cos(a) * (i % 2 ? r2 : r1), y + Math.sin(a) * (i % 2 ? r2 : r1)); }
    return this.poly(pts, mat, o);
  };
  Grid.prototype.path = function (fn, mat, o) { return this._shape(mat, o, fn); };
  Grid.prototype.px = function (x, y, col) { this.flat[(x | 0) + "," + (y | 0)] = FLAT[col] || M[col] || col; return this; };
  Grid.prototype.pxs = function (list, col) { for (var i = 0; i < list.length; i += 2) this.px(list[i], list[i + 1], col); return this; };
  Grid.prototype.cut = function (fn) { return this._shape("ink", { cut: true }, fn); };

  /* shading: tone per pixel from the light rims and a diagonal fall-off across its shape */
  Grid.prototype.render = function (outlineCol) {
    var L = this.layer, out = new Array(N * N), bb = [], i, x, y, id, b, m, t, r, up, lf, ul, dn, rt, dr, under, k;
    for (i = 0; i < this.mats.length; i++) bb.push([N, N, -1, -1]);
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) { id = L[y * N + x]; if (id < 0) continue; b = bb[id]; if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; }
    function at(xx, yy) { return xx < 0 || yy < 0 || xx >= N || yy >= N ? -1 : L[yy * N + xx]; }
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
      id = L[y * N + x];
      if (id < 0) continue;
      m = this.mats[id]; r = ramp(m.col);
      if (!m.sh) { out[y * N + x] = m.o.tone != null ? r[m.o.tone] : r[2]; continue; }
      b = bb[id];
      t = ((x - b[0]) / Math.max(1, b[2] - b[0]) * 0.45 + (y - b[1]) / Math.max(1, b[3] - b[1]) * 0.55);
      k = t < 0.22 ? 3 : t < 0.58 ? 2 : t < 0.86 ? 1 : 1;
      if (m.o.soft) k = t < 0.35 ? 3 : t < 0.8 ? 2 : 1;
      up = at(x, y - 1); lf = at(x - 1, y); ul = at(x - 1, y - 1); dn = at(x, y + 1); rt = at(x + 1, y); dr = at(x + 1, y + 1);
      if (up !== id || lf !== id) k = Math.max(k, t < 0.45 ? 4 : 3);           /* lit rim */
      else if (ul !== id && t < 0.5) k = Math.max(k, 3);
      if (dn !== id || rt !== id) k = Math.min(k, t > 0.5 ? 0 : 1);           /* shadow rim */
      else if (dr !== id && t > 0.4) k = Math.min(k, 1);
      /* contact shadow: something drawn over us just above or to the left */
      under = (up > id) || (lf > id) || (ul > id);
      if (under) k = Math.max(0, Math.min(k, 2) - 1);
      out[y * N + x] = r[k];
    }
    /* outline around the whole figure, tinted by what it borders */
    var ol = new Array(N * N), n4, c;
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
      if (L[y * N + x] >= 0) continue;
      n4 = [at(x, y - 1), at(x - 1, y), at(x + 1, y), at(x, y + 1)];
      for (i = 0; i < 4; i++) if (n4[i] >= 0) { c = ramp(this.mats[n4[i]].col)[0]; ol[y * N + x] = outlineCol || mix(c, "#0c0e18", 0.55); break; }
    }
    for (k in this.flat) { x = +k.split(",")[0]; y = +k.split(",")[1]; if (x >= 0 && y >= 0 && x < N && y < N) { out[y * N + x] = this.flat[k]; ol[y * N + x] = null; } }
    return { px: out, ol: ol };
  };
  function mix(a, b, t) { var A = hex2rgb(a), B = hex2rgb(b); return "rgb(" + Math.round(A[0] + (B[0] - A[0]) * t) + "," + Math.round(A[1] + (B[1] - A[1]) * t) + "," + Math.round(A[2] + (B[2] - A[2]) * t) + ")"; }

  /* ---------- reusable bases ---------- */
  /* a Crest Piece: a plug-in tag for the Digivice, a metal bezel round a coloured inlay */
  function crestTag(g, metal, inlay) {
    g.rect(13, 1, 6, 5, "steel").rect(14, 2, 4, 2, "iron", { flat: true });
    g.path(function (c) { c.moveTo(6, 7); c.lineTo(26, 7); c.lineTo(26, 20); c.quadraticCurveTo(26, 27, 16, 31); c.quadraticCurveTo(6, 27, 6, 20); c.closePath(); c.fill(); }, metal);
    g.path(function (c) { c.moveTo(9, 10); c.lineTo(23, 10); c.lineTo(23, 19.5); c.quadraticCurveTo(23, 25, 16, 28); c.quadraticCurveTo(9, 25, 9, 19.5); c.closePath(); c.fill(); }, inlay, { soft: true });
    g.pxs([7, 8, 8, 8], "hl");
  }
  /* a Charm: a cord, a metal cap and a body hung from it */
  function charmCap(g, metal, cord) {
    g.arc(16, 6, 5, Math.PI * 1.05, Math.PI * 1.95, 1.6, cord || "leather");
    g.rrect(13, 6, 6, 4, 1, metal || "gold");
    g.px(14, 7, "glint");
  }
  function gemShine(g, x, y) { g.px(x, y, "hl").px(x + 1, y, "glint").px(x, y + 1, "glint"); }

  /* ---------- the Items ---------- */
  var ITEM = {
    /* Crest Pieces */
    c_weather: function (g) {
      crestTag(g, "silver", "sky");
      g.ellipse(16, 18, 6, 4, "white").ellipse(16, 18, 3, 3, "blue").circle(16, 18, 1.4, "black", { flat: true });
      g.px(15, 17, "hl");
      g.poly([20, 11, 17.5, 15, 19.5, 15, 17, 19, 22, 14, 20, 14, 22, 11], "yellow");
    },
    c_egg: function (g) {
      crestTag(g, "silver", "teal");
      g.arc(16, 22, 9, Math.PI * 1.2, Math.PI * 1.8, 1.2, "lime", { flat: true });
      g.arc(16, 22, 6, Math.PI * 1.2, Math.PI * 1.8, 1.2, "lime", { flat: true });
      g.ellipse(16, 20, 3.4, 4.6, "egg").circle(14.5, 19, 0.9, "green", { flat: true }).circle(17.5, 21.5, 0.9, "green", { flat: true });
      g.px(15, 17, "hl");
    },
    c_farm: function (g) {
      crestTag(g, "silver", "green");
      g.circle(16, 18, 6, "cream").ring(16, 18, 6, 1.2, "wood");
      g.line([16, 18, 16, 14.5], 1.2, "ink", { flat: true }).line([16, 18, 18.5, 19.5], 1.2, "ink", { flat: true });
      g.path(function (c) { c.moveTo(16, 24); c.quadraticCurveTo(11, 26, 11, 22); c.quadraticCurveTo(14, 21, 16, 24); c.fill(); }, "leaf");
      g.px(16, 18, "red");
    },
    c_scan: function (g) {
      crestTag(g, "gold", "crimson");
      g.ring(16, 18, 6, 1.4, "white").ring(16, 18, 2.6, 1, "white");
      g.line([16, 10.5, 16, 13], 1.4, "white").line([16, 23, 16, 25.5], 1.4, "white").line([8.5, 18, 11, 18], 1.4, "white").line([21, 18, 23.5, 18], 1.4, "white");
      g.px(16, 18, "yellow");
    },
    c_hatch: function (g) {
      crestTag(g, "gold", "orange");
      g.line([16, 11, 16, 13], 1.2, "yellow", { flat: true }).line([10.5, 14, 12, 15.5], 1.2, "yellow", { flat: true }).line([21.5, 14, 20, 15.5], 1.2, "yellow", { flat: true });
      g.ellipse(16, 21, 4, 5, "egg");
      g.line([12.5, 20, 14, 18.5, 15.5, 20.5, 17, 18.5, 18.5, 20.5, 19.6, 19.2], 0.9, "brown", { flat: true });
      g.px(14, 19, "hl");
    },
    c_twin: function (g) {
      g.rect(9, 1, 5, 4, "steel").rect(18, 1, 5, 4, "steel");
      g.path(function (c) { c.moveTo(2, 6); c.lineTo(16, 6); c.lineTo(16, 18); c.quadraticCurveTo(16, 24, 9, 27); c.quadraticCurveTo(2, 24, 2, 18); c.closePath(); c.fill(); }, "gold");
      g.path(function (c) { c.moveTo(4.5, 8.5); c.lineTo(13.5, 8.5); c.lineTo(13.5, 17.5); c.quadraticCurveTo(13.5, 22, 9, 24.5); c.quadraticCurveTo(4.5, 22, 4.5, 17.5); c.closePath(); c.fill(); }, "sky", { soft: true });
      g.path(function (c) { c.moveTo(16, 9); c.lineTo(30, 9); c.lineTo(30, 21); c.quadraticCurveTo(30, 27, 23, 30); c.quadraticCurveTo(16, 27, 16, 21); c.closePath(); c.fill(); }, "gold");
      g.path(function (c) { c.moveTo(18.5, 11.5); c.lineTo(27.5, 11.5); c.lineTo(27.5, 20.5); c.quadraticCurveTo(27.5, 25, 23, 27.5); c.quadraticCurveTo(18.5, 25, 18.5, 20.5); c.closePath(); c.fill(); }, "crimson", { soft: true });
      g.ellipse(9, 15, 3.4, 2.4, "white").circle(9, 15, 1.3, "blue", { flat: true });
      g.ring(23, 18.5, 3.4, 1.1, "white").px(23, 18, "yellow").px(23, 19, "yellow");
      g.pxs([3, 7, 17, 10], "hl");
    },
    /* Charms */
    m_fire: function (g) {
      charmCap(g);
      g.path(function (c) { c.moveTo(16, 9); c.quadraticCurveTo(25, 17, 23, 23); c.quadraticCurveTo(21, 30, 16, 30); c.quadraticCurveTo(10, 30, 9, 23); c.quadraticCurveTo(8, 18, 12, 14); c.quadraticCurveTo(12, 19, 14, 19); c.quadraticCurveTo(13, 14, 16, 9); c.fill(); }, "orange");
      g.path(function (c) { c.moveTo(16, 17); c.quadraticCurveTo(21, 22, 19.5, 26); c.quadraticCurveTo(18, 29, 16, 29); c.quadraticCurveTo(12.5, 29, 12.5, 25.5); c.quadraticCurveTo(13, 21, 16, 17); c.fill(); }, "yellow", { soft: true });
      g.pxs([15, 24, 15, 25], "hl");
    },
    m_ice: function (g) {
      charmCap(g, "silver");
      g.star(16, 20, 10, 4, 6, "ice", null, -Math.PI / 2);
      g.star(16, 20, 5.5, 2.4, 6, "white", null, -Math.PI / 2 + Math.PI / 6);
      g.circle(16, 20, 1.6, "sky", { flat: true });
      g.pxs([12, 13], "hl");
    },
    m_water: function (g) {
      charmCap(g, "silver");
      g.path(function (c) { c.moveTo(16, 10); c.quadraticCurveTo(25, 21, 23, 25); c.quadraticCurveTo(21, 30, 16, 30); c.quadraticCurveTo(11, 30, 9, 25); c.quadraticCurveTo(7, 21, 16, 10); c.fill(); }, "water");
      g.path(function (c) { c.moveTo(10, 24); c.quadraticCurveTo(13, 21, 16, 24); c.quadraticCurveTo(19, 27, 22, 24); c.lineTo(22, 26); c.quadraticCurveTo(19, 29, 16, 26); c.quadraticCurveTo(13, 23.5, 10, 26); c.fill(); }, "cyan");
      g.pxs([13, 18, 13, 19, 14, 17], "hl");
    },
    m_dark: function (g) {
      charmCap(g, "silver", "black");
      g.path(function (c) { c.arc(16, 20, 9, 0, Math.PI * 2); c.moveTo(27, 17.5); c.arc(19.5, 17.5, 7.5, 0, Math.PI * 2, true); c.fill("evenodd"); }, "purple");
      g.star(22, 23, 2.6, 0.9, 4, "violet", { flat: true, tone: 4 });
      g.pxs([9, 17, 9, 18], "glint");
    },
    m_holy: function (g) {
      charmCap(g, "gold");
      g.path(function (c) { c.moveTo(16, 18); c.quadraticCurveTo(6, 12, 3, 17); c.quadraticCurveTo(6, 18, 5, 21); c.quadraticCurveTo(9, 20, 9, 23); c.quadraticCurveTo(13, 22, 16, 24); c.fill(); }, "white");
      g.path(function (c) { c.moveTo(16, 18); c.quadraticCurveTo(26, 12, 29, 17); c.quadraticCurveTo(26, 18, 27, 21); c.quadraticCurveTo(23, 20, 23, 23); c.quadraticCurveTo(19, 22, 16, 24); c.fill(); }, "white");
      g.ring(16, 14, 4.5, 1.6, "yellow");
      g.circle(16, 22, 3.6, "ice").px(15, 21, "hl");
    },
    m_machine: function (g) {
      charmCap(g, "steel", "black");
      g.star(16, 20, 10, 7.6, 8, "steel", null, 0);
      g.circle(16, 20, 4.2, "iron").circle(16, 20, 2, "x", { cut: true });
      g.ring(16, 20, 6.2, 0.9, "silver", { flat: true, tone: 3 });
      g.pxs([10, 14, 11, 13], "hl");
    },
    m_nature: function (g) {
      charmCap(g, "gold");
      g.path(function (c) { c.moveTo(16, 10); c.quadraticCurveTo(27, 15, 24, 24); c.quadraticCurveTo(21, 30, 16, 31); c.quadraticCurveTo(8, 27, 8, 20); c.quadraticCurveTo(9, 13, 16, 10); c.fill(); }, "leaf");
      g.line([16, 11, 16, 30], 1, "green", { flat: true, tone: 1 }).line([16, 17, 20.5, 14.5], 0.9, "green", { flat: true, tone: 1 }).line([16, 21, 11.5, 18], 0.9, "green", { flat: true, tone: 1 }).line([16, 25, 21, 22], 0.9, "green", { flat: true, tone: 1 });
      g.pxs([11, 15, 12, 14], "hl");
    },
    m_slime: function (g) {
      charmCap(g, "silver");
      g.path(function (c) { c.moveTo(7, 28); c.quadraticCurveTo(6, 16, 16, 12); c.quadraticCurveTo(26, 16, 25, 28); c.quadraticCurveTo(23, 25, 21, 29); c.quadraticCurveTo(18, 26, 16, 29); c.quadraticCurveTo(13, 26, 11, 29); c.quadraticCurveTo(9, 25, 7, 28); c.fill(); }, "slime");
      g.circle(13, 20, 1.6, "ink", { flat: true }).circle(19, 20, 1.6, "ink", { flat: true });
      g.px(13, 19, "hl").px(19, 19, "hl").pxs([10, 16, 11, 15, 9, 18], "hl");
    },
    m_wind: function (g) {
      charmCap(g, "silver");
      g.circle(16, 20, 9.5, "teal");
      g.arc(16, 20, 6, Math.PI * 0.9, Math.PI * 2.3, 1.7, "white");
      g.arc(17, 20, 3, Math.PI * 1.4, Math.PI * 2.8, 1.5, "white");
      g.line([4, 13, 9, 13], 1.3, "white").line([23, 28, 28, 28], 1.3, "white");
      g.pxs([11, 14, 12, 13], "hl");
    },
    m_beast: function (g) {
      charmCap(g, "bronze", "leather");
      g.path(function (c) { c.moveTo(9, 11); c.quadraticCurveTo(16, 9, 23, 11); c.quadraticCurveTo(22, 22, 16, 31); c.quadraticCurveTo(12, 22, 9, 11); c.fill(); }, "bone");
      g.line([12, 12, 13.5, 20], 0.8, "parch", { flat: true, tone: 1 });
      g.rect(8, 10, 16, 2.5, "leather");
      g.pxs([12, 14, 12, 15], "hl");
    },
    m_bell: function (g) {
      charmCap(g, "gold", "crimson");
      g.path(function (c) { c.moveTo(16, 10); c.quadraticCurveTo(23, 10, 23, 19); c.lineTo(25, 26); c.lineTo(7, 26); c.lineTo(9, 19); c.quadraticCurveTo(9, 10, 16, 10); c.fill(); }, "gold");
      g.rect(6, 25, 20, 2.5, "gold");
      g.circle(16, 28.5, 2, "bronze");
      g.path(function (c) { c.moveTo(12, 15); c.lineTo(12, 20); c.quadraticCurveTo(12, 23, 16, 23); c.quadraticCurveTo(20, 23, 20, 20); c.lineTo(20, 15); c.lineTo(18, 15); c.lineTo(18, 20); c.quadraticCurveTo(18, 21, 16, 21); c.quadraticCurveTo(14, 21, 14, 20); c.lineTo(14, 15); c.closePath(); c.fill(); }, "red");
      g.rect(12, 15, 2, 2, "silver", { flat: true, tone: 3 }).rect(18, 15, 2, 2, "silver", { flat: true, tone: 3 });
      g.pxs([11, 13, 11, 14, 10, 17], "hl");
    },
    m_heart: function (g) {
      charmCap(g, "gold");
      g.path(function (c) { c.moveTo(16, 30); c.bezierCurveTo(2, 22, 5, 10, 11.5, 11.5); c.quadraticCurveTo(14.5, 12, 16, 15); c.quadraticCurveTo(17.5, 12, 20.5, 11.5); c.bezierCurveTo(27, 10, 30, 22, 16, 30); c.fill(); }, "rose");
      g.line([11, 20, 14, 20, 15.5, 17, 17, 23, 18.5, 20, 21, 20], 1.1, "white", { flat: true });
      g.pxs([9, 14, 10, 13, 9, 15], "hl");
    },
    m_tag: function (g) {
      g.path(function (c) { c.moveTo(14, 15); c.quadraticCurveTo(5, 9, 2, 13); c.quadraticCurveTo(5, 14, 4, 17); c.quadraticCurveTo(8, 16, 8, 19); c.quadraticCurveTo(11, 18, 14, 21); c.fill(); }, "white");
      g.path(function (c) { c.moveTo(18, 15); c.quadraticCurveTo(27, 9, 30, 13); c.quadraticCurveTo(27, 14, 28, 17); c.quadraticCurveTo(24, 16, 24, 19); c.quadraticCurveTo(21, 18, 18, 21); c.fill(); }, "white");
      g.rrect(10, 8, 12, 20, 2.5, "sky");
      g.circle(16, 11, 1.4, "x", { cut: true });
      g.poly([17, 14, 13, 20, 16, 20, 15, 25, 19.5, 18.5, 16.5, 18.5], "yellow");
      g.pxs([11, 9, 11, 10], "hl");
    },
    m_leech: function (g) {
      charmCap(g, "silver", "black");
      g.path(function (c) { c.moveTo(16, 10); c.quadraticCurveTo(25, 21, 23, 25); c.quadraticCurveTo(21, 30, 16, 30); c.quadraticCurveTo(11, 30, 9, 25); c.quadraticCurveTo(7, 21, 16, 10); c.fill(); }, "crimson");
      g.poly([11.5, 16, 14, 16, 13, 22], "bone").poly([18, 16, 20.5, 16, 19, 22], "bone");
      g.pxs([12, 22, 13, 23], "glint").pxs([12, 19], "hl");
    },
    m_clock: function (g) {
      g.ring(16, 6, 3, 1.4, "gold").rect(14.5, 7, 3, 3, "gold");
      g.circle(16, 20, 10.5, "gold").circle(16, 20, 8, "cream");
      var i, a;
      for (i = 0; i < 12; i++) { a = i * Math.PI / 6; g.px(Math.round(16 + Math.cos(a) * 6.5), Math.round(20 + Math.sin(a) * 6.5), i % 3 ? "brown" : "ink"); }
      g.line([16, 20, 16, 15], 1.1, "ink", { flat: true }).line([16, 20, 19.5, 22], 1.1, "ink", { flat: true });
      g.px(16, 20, "crimson").pxs([9, 14, 10, 13], "hl");
    },
    m_prism: function (g) {
      g.poly([16, 2, 24, 12, 20, 30, 12, 30, 8, 12], "violet");
      g.poly([16, 2, 16, 30, 12, 30, 8, 12], "cyan");
      g.poly([16, 2, 24, 12, 16, 15], "pink");
      g.poly([8, 12, 16, 15, 16, 30, 12, 30], "ice", { soft: true });
      g.pxs([12, 9, 13, 8, 11, 11, 12, 10], "hl").star(24, 6, 3, 0.8, 4, "white", { flat: true, tone: 4 });
    },
    /* One-run items */
    u_protein: function (g) {
      g.rrect(10, 4, 12, 5, 1.5, "red");
      g.rrect(8, 8, 16, 22, 3, "white");
      g.rect(8, 14, 16, 10, "sky");
      g.star(16, 19, 4, 1.8, 5, "yellow");
      g.pxs([10, 10, 10, 11, 10, 12], "hl");
    },
    u_lucky: function (g) {
      var k, a;
      for (k = 0; k < 4; k++) { a = k * Math.PI / 2 + Math.PI / 4; g.path((function (aa) { return function (c) { var cx = 16 + Math.cos(aa) * 5.5, cy = 15 + Math.sin(aa) * 5.5; c.arc(cx + Math.cos(aa + 1.2) * 2, cy + Math.sin(aa + 1.2) * 2, 4, 0, 7); c.arc(cx + Math.cos(aa - 1.2) * 2, cy + Math.sin(aa - 1.2) * 2, 4, 0, 7); c.fill(); }; })(a), "leaf"); }
      g.line([16, 16, 18, 24, 22, 29], 1.6, "green");
      g.circle(16, 15, 2, "lime");
      g.pxs([9, 9, 10, 8, 20, 8], "hl").star(26, 6, 3, 0.8, 4, "yellow", { flat: true, tone: 4 });
    },
    u_bait: function (g) {
      g.line([16, 2, 16, 9], 1, "silver", { flat: true, tone: 3 });
      g.arc(16, 25, 5, 0, Math.PI * 1.15, 1.6, "steel");
      g.line([21, 25, 21, 9], 1.6, "steel");
      g.path(function (c) { c.moveTo(9, 13); c.quadraticCurveTo(16, 6, 23, 13); c.quadraticCurveTo(26, 20, 19, 22); c.quadraticCurveTo(11, 23, 8, 18); c.quadraticCurveTo(7, 15, 9, 13); c.fill(); }, "meat");
      g.ellipse(9, 20, 3.5, 2.6, "bone").circle(6.5, 22, 1.8, "bone").circle(7, 18.5, 1.8, "bone");
      g.pxs([12, 11, 13, 10, 14, 10], "hl");
    },
    u_wind: function (g) {
      g.path(function (c) { c.moveTo(25, 3); c.quadraticCurveTo(29, 14, 18, 22); c.quadraticCurveTo(12, 26, 8, 29); c.quadraticCurveTo(8, 18, 14, 11); c.quadraticCurveTo(19, 5, 25, 3); c.fill(); }, "white");
      g.line([25, 4, 8, 29], 1.1, "cyan", { flat: true, tone: 1 });
      g.arc(10, 10, 6, Math.PI * 0.6, Math.PI * 1.4, 1.2, "cyan", { flat: true, tone: 3 });
      g.arc(24, 24, 5, Math.PI * 1.6, Math.PI * 2.4, 1.2, "cyan", { flat: true, tone: 3 });
      g.path(function (c) { c.moveTo(16, 30); c.bezierCurveTo(9, 26, 10, 20, 13, 20.5); c.quadraticCurveTo(15, 21, 16, 23); c.quadraticCurveTo(17, 21, 19, 20.5); c.bezierCurveTo(22, 20, 23, 26, 16, 30); c.fill(); }, "rose");
      g.pxs([12, 22, 13, 22], "hl").pxs([18, 7, 19, 6], "hl");
    },
    /* 17z33: seeds, a pouch, a lunchbox, a tonic, an egg, a charm */
    u_str: function (g) { g.ellipse(16, 18, 7, 9, "red"); g.ellipse(16, 18, 4, 6, "red", { soft: true }); g.line([16, 9, 16, 4], 1.4, "green"); g.path(function (c) { c.moveTo(16, 6); c.quadraticCurveTo(10, 5, 10, 1); c.quadraticCurveTo(15, 1, 16, 6); c.fill(); }, "leaf"); g.pxs([12, 14, 13, 13], "hl"); },
    u_agi: function (g) { g.ellipse(16, 18, 7, 9, "sky"); g.ellipse(16, 18, 4, 6, "sky", { soft: true }); g.line([16, 9, 16, 4], 1.4, "green"); g.path(function (c) { c.moveTo(16, 6); c.quadraticCurveTo(10, 5, 10, 1); c.quadraticCurveTo(15, 1, 16, 6); c.fill(); }, "leaf"); g.pxs([12, 14, 13, 13], "hl"); },
    u_vit: function (g) { g.ellipse(16, 18, 7, 9, "orange"); g.ellipse(16, 18, 4, 6, "orange", { soft: true }); g.line([16, 9, 16, 4], 1.4, "green"); g.path(function (c) { c.moveTo(16, 6); c.quadraticCurveTo(10, 5, 10, 1); c.quadraticCurveTo(15, 1, 16, 6); c.fill(); }, "leaf"); g.pxs([12, 14, 13, 13], "hl"); },
    u_int: function (g) { g.ellipse(16, 18, 7, 9, "violet"); g.ellipse(16, 18, 4, 6, "violet", { soft: true }); g.line([16, 9, 16, 4], 1.4, "green"); g.path(function (c) { c.moveTo(16, 6); c.quadraticCurveTo(10, 5, 10, 1); c.quadraticCurveTo(15, 1, 16, 6); c.fill(); }, "leaf"); g.pxs([12, 14, 13, 13], "hl"); },
    u_dex: function (g) { g.ellipse(16, 18, 7, 9, "teal"); g.ellipse(16, 18, 4, 6, "teal", { soft: true }); g.line([16, 9, 16, 4], 1.4, "green"); g.path(function (c) { c.moveTo(16, 6); c.quadraticCurveTo(10, 5, 10, 1); c.quadraticCurveTo(15, 1, 16, 6); c.fill(); }, "leaf"); g.pxs([12, 14, 13, 13], "hl"); },
    u_luk: function (g) { g.ellipse(16, 18, 7, 9, "lime"); g.ellipse(16, 18, 4, 6, "lime", { soft: true }); g.line([16, 9, 16, 4], 1.4, "green"); g.path(function (c) { c.moveTo(16, 6); c.quadraticCurveTo(10, 5, 10, 1); c.quadraticCurveTo(15, 1, 16, 6); c.fill(); }, "leaf"); g.pxs([12, 14, 13, 13], "hl"); },
    u_bits: function (g) { g.ellipse(16, 20, 10, 9, "leather"); g.rect(10, 9, 12, 4, "brown"); g.line([11, 11, 21, 11], 1, "gold", { flat: true }); g.circle(16, 21, 4, "gold"); g.px(15, 20, "hl"); g.pxs([10, 16, 11, 15], "hl"); },
    u_lunch: function (g) { g.rrect(5, 11, 22, 16, 2, "red"); g.rect(5, 16, 22, 2, "white"); g.rrect(12, 6, 8, 6, 1.5, "steel"); g.ellipse(11, 22, 3, 2, "meat"); g.ellipse(20, 22, 3, 2, "leaf"); g.pxs([7, 13, 8, 13], "hl"); },
    u_tonic: function (g) { g.rect(13, 3, 6, 5, "wood"); g.rrect(9, 8, 14, 21, 3, "glass"); g.rrect(10, 15, 12, 13, 2, "leaf"); g.path(function (c) { c.moveTo(16, 20); c.quadraticCurveTo(11, 19, 12, 14); c.quadraticCurveTo(16, 15, 16, 20); c.fill(); }, "lime"); g.pxs([11, 10, 11, 11, 11, 12], "hl"); },
    u_egg: function (g) { g.ellipse(16, 17, 9, 12, "egg"); g.circle(12, 12, 2.2, "yellow").circle(20, 18, 2.6, "leaf").circle(13, 23, 2, "sky"); g.star(25, 6, 3, 0.8, 4, "yellow", { flat: true, tone: 4 }); g.pxs([10, 8, 11, 7], "hl"); },
    u_shiny: function (g) { g.star(16, 16, 12, 5, 4, "yellow"); g.star(16, 16, 6, 2.5, 4, "white"); g.star(25, 6, 3, 0.8, 4, "pink", { flat: true, tone: 4 }); g.star(7, 25, 3, 0.8, 4, "cyan", { flat: true, tone: 4 }); }
  };
  function scrollArt(g) {
    g.rrect(8, 6, 16, 20, 1, "paper");
    g.ellipse(16, 6, 9, 2.6, "parch").ellipse(16, 26, 9, 2.6, "parch");
    g.circle(7, 6, 2.2, "wood").circle(25, 6, 2.2, "wood").circle(7, 26, 2.2, "wood").circle(25, 26, 2.2, "wood");
    g.line([11, 11, 21, 11], 0.9, "brown", { flat: true }).line([11, 14, 19, 14], 0.9, "brown", { flat: true }).line([11, 17, 21, 17], 0.9, "brown", { flat: true });
    g.rect(14, 18, 4, 11, "crimson").poly([14, 29, 16, 27, 18, 29, 18, 31, 14, 31], "crimson");
    g.circle(16, 20, 2.6, "red").px(15, 19, "hl");
  }

  /* ---------- the Lab ---------- */
  var LAB = {
    vital: function (g) {
      g.path(function (c) { c.moveTo(16, 29); c.bezierCurveTo(1, 20, 4, 5, 11, 6.5); c.quadraticCurveTo(14.5, 7, 16, 11); c.quadraticCurveTo(17.5, 7, 21, 6.5); c.bezierCurveTo(28, 5, 31, 20, 16, 29); c.fill(); }, "rose");
      g.rect(14, 12, 4, 11, "white").rect(10.5, 15.5, 11, 4, "white");
      g.pxs([7, 10, 8, 9, 7, 11, 9, 9], "hl");
    },
    power: function (g) {
      g.line([7, 25, 22, 10], 3.4, "silver");
      g.poly([20, 6, 26, 6, 26, 12, 22, 14, 18, 10], "silver");
      g.line([5, 21, 11, 27], 2.6, "gold");
      g.line([4, 28, 7, 25], 2.4, "leather");
      g.circle(3.5, 28.5, 1.8, "gold");
      g.poly([27, 16, 23, 22, 26, 22, 22, 29, 30, 20, 27, 20, 30, 16], "yellow");
      g.pxs([12, 18, 13, 17, 14, 16], "hl");
    },
    scan: function (g) {
      g.rect(14, 19, 4, 8, "steel").rrect(9, 26, 14, 4, 1, "iron");
      g.path(function (c) { c.moveTo(4, 10); c.quadraticCurveTo(10, 26, 26, 22); c.lineTo(4, 10); c.fill(); }, "silver");
      g.line([13, 18, 21, 9], 1.2, "steel");
      g.circle(21.5, 8.5, 2, "red").px(21, 8, "hl");
      g.arc(21.5, 8.5, 5, Math.PI * 1.55, Math.PI * 2.05, 1.1, "cyan", { flat: true, tone: 3 });
      g.arc(21.5, 8.5, 8, Math.PI * 1.55, Math.PI * 2.05, 1.1, "cyan", { flat: true, tone: 3 });
      g.pxs([7, 13, 8, 15], "hl");
    },
    study: function (g) {
      g.path(function (c) { c.moveTo(2, 9); c.quadraticCurveTo(9, 6, 16, 10); c.lineTo(16, 28); c.quadraticCurveTo(9, 24, 2, 27); c.closePath(); c.fill(); }, "white");
      g.path(function (c) { c.moveTo(30, 9); c.quadraticCurveTo(23, 6, 16, 10); c.lineTo(16, 28); c.quadraticCurveTo(23, 24, 30, 27); c.closePath(); c.fill(); }, "white");
      g.path(function (c) { c.moveTo(1, 26); c.quadraticCurveTo(9, 23, 16, 28); c.quadraticCurveTo(23, 23, 31, 26); c.lineTo(31, 29); c.quadraticCurveTo(23, 26, 16, 30); c.quadraticCurveTo(9, 26, 1, 29); c.fill(); }, "blue");
      g.line([5, 13, 13, 14], 0.9, "steel", { flat: true }).line([5, 16, 13, 17], 0.9, "steel", { flat: true }).line([5, 19, 11, 20], 0.9, "steel", { flat: true });
      g.star(23, 17, 4.5, 1.8, 4, "yellow").line([18, 22, 28, 22], 0.9, "steel", { flat: true });
    },
    farm: function (g) {
      g.poly([4, 14, 16, 4, 28, 14], "crimson");
      g.rect(6, 14, 20, 15, "red");
      g.rect(12, 18, 8, 11, "wood");
      g.line([12, 18, 20, 29], 1, "cream", { flat: true }).line([20, 18, 12, 29], 1, "cream", { flat: true });
      g.circle(16, 11, 2.2, "cream").px(16, 11, "ink");
      g.rect(2, 28, 28, 3, "green");
      g.pxs([7, 15, 8, 15, 7, 16], "hl");
    },
    bits: function (g) {
      var i;
      for (i = 0; i < 4; i++) g.ellipse(13, 26 - i * 3.6, 9, 3.4, "gold");
      g.circle(22, 13, 7.5, "gold").circle(22, 13, 5, "topaz", { soft: true });
      g.rect(20.5, 9.5, 3, 7, "cream");
      g.pxs([17, 9, 18, 8, 6, 15], "hl").star(8, 5, 3, 0.8, 4, "white", { flat: true, tone: 4 });
    },
    warp: function (g) {
      g.rrect(9, 26, 14, 4, 1, "iron").rect(14, 4, 4, 23, "steel");
      var i; for (i = 0; i < 5; i++) g.ellipse(16, 8 + i * 4, 7, 1.8, "bronze");
      g.poly([7, 3, 2, 11, 6, 11, 3, 18, 10, 9, 6, 9, 9, 3], "yellow").poly([26, 12, 22, 19, 25, 19, 23, 26, 30, 17, 26, 17, 29, 12], "cyan");
      g.circle(16, 4, 2.4, "cyan").px(15, 3, "hl");
    },
    swift: function (g) {
      g.path(function (c) { c.moveTo(10, 6); c.lineTo(19, 6); c.lineTo(19, 18); c.quadraticCurveTo(28, 19, 29, 25); c.lineTo(29, 28); c.lineTo(8, 28); c.lineTo(8, 22); c.closePath(); c.fill(); }, "sky");
      g.rect(7, 27, 23, 3, "white");
      g.line([11, 12, 18, 12], 1, "white", { flat: true }).line([10, 16, 18, 16], 1, "white", { flat: true });
      g.path(function (c) { c.moveTo(10, 10); c.quadraticCurveTo(1, 4, 1, 12); c.quadraticCurveTo(4, 12, 3, 15); c.quadraticCurveTo(6, 14, 7, 17); c.quadraticCurveTo(8, 14, 10, 15); c.fill(); }, "white");
      g.pxs([11, 7, 12, 7, 11, 8], "hl");
    },
    notes: function (g) {
      g.rrect(6, 4, 19, 25, 2, "wood");
      g.rect(9, 5, 15, 23, "paper");
      var i; for (i = 0; i < 6; i++) g.rect(5, 7 + i * 3.6, 3, 1.6, "silver", { flat: true, tone: 3 });
      g.line([11, 10, 21, 10], 0.9, "steel", { flat: true }).line([11, 13, 21, 13], 0.9, "steel", { flat: true }).line([11, 16, 18, 16], 0.9, "steel", { flat: true });
      g.line([28, 9, 17, 25], 2.6, "yellow").poly([17, 25, 15.5, 28.5, 19, 26.5], "cream");
      g.line([28, 9, 26.5, 11.2], 2.6, "pink");
    },
    tap: function (g) {
      g.rect(2, 7, 18, 6, "steel").rect(16, 7, 6, 13, "steel");
      g.rect(8, 3, 3, 4, "silver").rrect(4, 1, 11, 3, 1, "red");
      g.rect(15, 19, 8, 3, "iron");
      g.path(function (c) { c.moveTo(19, 22); c.quadraticCurveTo(26, 30, 19, 31); c.quadraticCurveTo(12, 30, 19, 22); c.fill(); }, "cyan");
      g.px(17, 27, "hl").pxs([5, 9, 5, 10], "white").pxs([9, 9, 12, 10, 14, 9], "cyan");
      g.rect(24, 24, 6, 6, "emerald").px(25, 25, "hl").px(26, 26, "ink").px(28, 26, "ink").px(27, 28, "ink");
    },
    thumb: function (g) {
      g.path(function (c) { c.moveTo(4, 12); c.lineTo(20, 12); c.lineTo(22, 28); c.lineTo(6, 28); c.closePath(); c.fill(); }, "teal");
      g.arc(4, 18, 5, Math.PI * 0.5, Math.PI * 1.5, 1.8, "teal");
      g.line([20, 16, 28, 8], 2.2, "teal").rect(26, 5, 5, 4, "teal");
      g.pxs([29, 11, 30, 13, 28, 14], "cyan");
      g.line([13, 12, 13, 5], 1.3, "green").path(function (c) { c.moveTo(13, 7); c.quadraticCurveTo(7, 7, 7, 2); c.quadraticCurveTo(12, 2, 13, 7); c.fill(); }, "leaf").path(function (c) { c.moveTo(13, 6); c.quadraticCurveTo(19, 6, 19, 1); c.quadraticCurveTo(14, 1, 13, 6); c.fill(); }, "leaf");
      g.pxs([7, 14, 8, 14, 7, 15], "hl");
    },
    belly: function (g) {
      g.ellipse(16, 17, 12, 4, "meat").circle(10, 14, 3.5, "lime").circle(21, 14, 3.5, "orange").circle(16, 12.5, 3.2, "red");
      g.path(function (c) { c.moveTo(3, 17); c.lineTo(29, 17); c.quadraticCurveTo(28, 29, 16, 29); c.quadraticCurveTo(4, 29, 3, 17); c.fill(); }, "white");
      g.rect(3, 17, 26, 2, "sky");
      g.line([11, 9, 12, 5], 0.9, "white", { flat: true }).line([18, 8, 19, 4], 0.9, "white", { flat: true });
      g.pxs([6, 20, 7, 21, 6, 21], "hl").px(9, 13, "hl").px(15, 11, "hl").px(20, 13, "hl");
    },
    moveslot: function (g) {
      g.rrect(3, 9, 12, 12, 2, "steel").rrect(17, 9, 12, 12, 2, "steel").rrect(3, 23, 12, 7, 2, "steel").rrect(17, 23, 12, 7, 2, "gold");
      g.rect(5.5, 11.5, 7, 7, "red", { soft: true }).rect(19.5, 11.5, 7, 7, "sky", { soft: true }).rect(5.5, 24.5, 7, 4, "emerald", { soft: true });
      g.rect(21.5, 24, 3, 5, "white").rect(20.5, 25, 5, 3, "white");
      g.pxs([5, 11, 19, 11, 5, 24], "hl");
      g.rect(14, 2, 4, 5, "gold").rect(13, 3, 6, 3, "gold");
    },
    kit: function (g) { g.rrect(6, 10, 20, 18, 3, "leather"); g.rect(6, 15, 20, 3, "brown"); g.rrect(11, 5, 10, 6, 2, "brown"); g.rect(14, 15, 4, 5, "gold"); g.pxs([8, 12, 9, 12], "hl"); },
    port: function (g) {
      g.rrect(5, 3, 22, 27, 6, "white");
      g.rrect(9, 7, 14, 11, 2, "iron").rect(10.5, 8.5, 11, 8, "emerald", { soft: true });
      g.circle(10, 23, 2.4, "sky").circle(22, 23, 2.4, "sky").circle(16, 25, 2, "red");
      g.pxs([12, 10, 13, 10, 12, 11], "glint");
      g.rect(2, 9, 3, 7, "gold").rect(27, 9, 3, 7, "gold");
      g.pxs([6, 5, 7, 4], "hl");
    }
  };

  /* ---------- badge emblems, by category (each badge sits on a medal of its tier) ---------- */
  var CAT = {
    Growth: function (g) { g.ellipse(16, 18, 5, 6.5, "egg"); g.line([12, 17, 14, 15.5, 16, 17.5, 18, 15.5, 20, 17], 0.9, "brown", { flat: true }); g.path(function (c) { c.moveTo(16, 12); c.quadraticCurveTo(10, 11, 10, 6); c.quadraticCurveTo(15, 6, 16, 12); c.moveTo(16, 12); c.quadraticCurveTo(22, 11, 22, 6); c.quadraticCurveTo(17, 6, 16, 12); c.fill(); }, "leaf"); g.px(14, 15, "hl"); },
    Combat: function (g) { g.line([9, 23, 22, 10], 2.2, "silver"); g.line([23, 23, 10, 10], 2.2, "silver"); g.line([8, 20, 12, 24], 1.8, "gold").line([24, 20, 20, 24], 1.8, "gold"); g.px(14, 15, "hl").px(18, 15, "hl"); },
    Rival: function (g) { g.ellipse(16, 17, 8, 6, "crimson"); g.poly([9, 15, 14, 16.5, 9, 18.5], "white").poly([23, 15, 18, 16.5, 23, 18.5], "white"); g.poly([10, 12, 13, 7, 14, 12], "crimson").poly([22, 12, 19, 7, 18, 12], "crimson"); g.px(11, 13, "hl"); },
    Survival: function (g) { g.path(function (c) { c.moveTo(16, 7); c.lineTo(24, 10); c.lineTo(24, 16); c.quadraticCurveTo(24, 23, 16, 26); c.quadraticCurveTo(8, 23, 8, 16); c.lineTo(8, 10); c.closePath(); c.fill(); }, "sky"); g.path(function (c) { c.moveTo(16, 21.5); c.bezierCurveTo(10, 17, 12, 12, 14.5, 12.8); c.quadraticCurveTo(15.5, 13, 16, 14.5); c.quadraticCurveTo(16.5, 13, 17.5, 12.8); c.bezierCurveTo(20, 12, 22, 17, 16, 21.5); c.fill(); }, "white"); g.pxs([10, 11, 10, 12], "hl"); },
    World: function (g) { g.circle(16, 16.5, 8, "water"); g.path(function (c) { c.moveTo(10, 12); c.quadraticCurveTo(14, 10, 16, 13); c.quadraticCurveTo(14, 17, 11, 16); c.closePath(); c.moveTo(17, 17); c.quadraticCurveTo(22, 15, 23, 19); c.quadraticCurveTo(20, 23, 17, 21); c.closePath(); c.fill(); }, "leaf"); g.pxs([11, 11, 12, 10], "hl"); },
    Farm: function (g) { g.line([16, 25, 16, 13], 1.6, "green"); g.path(function (c) { c.moveTo(16, 16); c.quadraticCurveTo(8, 16, 8, 9); c.quadraticCurveTo(15, 9, 16, 16); c.moveTo(16, 14); c.quadraticCurveTo(24, 14, 24, 7); c.quadraticCurveTo(17, 7, 16, 14); c.fill(); }, "leaf"); g.ellipse(16, 25, 7, 2.4, "brown"); g.px(10, 10, "hl"); },
    Collection: function (g) { g.poly([16, 7, 23, 13, 16, 26, 9, 13], "cyan"); g.poly([9, 13, 23, 13, 16, 26], "sky", { soft: true }); g.poly([12, 10, 20, 10, 23, 13, 9, 13], "ice"); g.pxs([12, 11, 13, 11], "hl"); },
    Together: function (g) { g.circle(12, 12, 3.2, "cream").circle(20, 12, 3.2, "cream"); g.path(function (c) { c.moveTo(6, 25); c.quadraticCurveTo(6, 16, 12, 16); c.quadraticCurveTo(17, 16, 17, 25); c.closePath(); c.fill(); }, "sky"); g.path(function (c) { c.moveTo(15, 25); c.quadraticCurveTo(15, 16, 20, 16); c.quadraticCurveTo(26, 16, 26, 25); c.closePath(); c.fill(); }, "orange"); g.px(11, 11, "hl").px(19, 11, "hl"); },
    Mastery: function (g) { g.poly([8, 22, 7, 11, 12, 16, 16, 8, 20, 16, 25, 11, 24, 22], "gold"); g.rect(8, 21, 16, 4, "gold"); g.circle(16, 18, 1.8, "ruby").circle(11, 19.5, 1.2, "sapphire").circle(21, 19.5, 1.2, "emerald"); g.pxs([9, 13, 9, 14], "hl"); }
  };
  /* ---------- an emblem for every badge (Nov 20) ----------
   * Drawn inside the medal (about 9..23 across, 8..23 down); a ladder's rungs share the emblem and
   * show how far up they are with pips under it (the medal's metal already tells the tier). */
  function chevrons(g, n, col) { var i; for (i = 0; i < n; i++) g.poly([9, 18 - i * 4, 16, 13 - i * 4, 23, 18 - i * 4, 23, 21 - i * 4, 16, 16 - i * 4, 9, 21 - i * 4], col || "gold"); }
  function egg(g, x, y, s, col) { g.ellipse(x, y, 4.2 * s, 5.4 * s, col || "egg"); g.px(Math.round(x - 1.5 * s), Math.round(y - 2.5 * s), "hl"); }
  function stopwatch(g) { g.rect(15, 7, 2, 2, "silver"); g.circle(16, 16, 6.5, "silver"); g.circle(16, 16, 5, "white"); g.line([16, 16, 16, 12], 1, "ink", { flat: true }).line([16, 16, 18.5, 17.5], 1, "ink", { flat: true }); g.px(16, 16, "red"); }
  function heart(g, x, y, s, col) { g.path(function (c) { c.moveTo(x, y + 5 * s); c.bezierCurveTo(x - 7 * s, y + 1 * s, x - 5 * s, y - 5 * s, x - 2.2 * s, y - 4.2 * s); c.quadraticCurveTo(x - 0.6 * s, y - 3.8 * s, x, y - 2 * s); c.quadraticCurveTo(x + 0.6 * s, y - 3.8 * s, x + 2.2 * s, y - 4.2 * s); c.bezierCurveTo(x + 5 * s, y - 5 * s, x + 7 * s, y + 1 * s, x, y + 5 * s); c.fill(); }, col || "rose"); }
  function bolt(g, x, y, s, col) { g.poly([x + 2 * s, y - 6 * s, x - 3 * s, y + 1 * s, x, y + 1 * s, x - 2 * s, y + 7 * s, x + 4 * s, y - 1 * s, x + 1 * s, y - 1 * s, x + 3 * s, y - 6 * s], col || "yellow"); }
  function crown(g, x, y, col) { g.poly([x - 6, y + 3, x - 7, y - 4, x - 3, y - 1, x, y - 6, x + 3, y - 1, x + 7, y - 4, x + 6, y + 3], col || "gold"); g.rect(x - 6, y + 2, 12, 3, col || "gold"); g.px(x, y + 2, "ruby").px(x - 3, y + 3, "sapphire").px(x + 3, y + 3, "emerald"); }
  function skull(g, x, y, col) { g.circle(x, y - 1, 5.5, col || "bone"); g.rrect(x - 3.5, y + 2, 7, 4, 1, col || "bone"); g.circle(x - 2.2, y - 0.5, 1.5, "ink", { flat: true }).circle(x + 2.2, y - 0.5, 1.5, "ink", { flat: true }); g.px(x, y + 2, "ink").px(x - 1, y + 5, "ink").px(x + 1, y + 5, "ink"); }
  function snowflake(g, x, y, r) { var i, a; for (i = 0; i < 3; i++) { a = i * Math.PI / 3; g.line([x - Math.cos(a) * r, y - Math.sin(a) * r, x + Math.cos(a) * r, y + Math.sin(a) * r], 1.4, "ice"); } g.circle(x, y, 1.6, "white"); }
  function leafShape(g, x, y, col) { g.star(x, y, 6.5, 3, 5, col || "orange"); g.line([x, y, x + 1, y + 7], 1, "brown", { flat: true }); }
  function sun(g, x, y) { var i, a; for (i = 0; i < 8; i++) { a = i * Math.PI / 4; g.line([x + Math.cos(a) * 4.5, y + Math.sin(a) * 4.5, x + Math.cos(a) * 7, y + Math.sin(a) * 7], 1.4, "flame"); } g.circle(x, y, 4, "yellow"); }
  function moon(g, x, y) { g.path(function (c) { c.arc(x, y, 6, 0, Math.PI * 2); c.moveTo(x + 9, y - 2); c.arc(x + 3, y - 2, 5.5, 0, Math.PI * 2, true); c.fill("evenodd"); }, "cream"); }
  function MOTIFS() { return {
    sprout: function (g) { egg(g, 16, 18, 0.9); g.line([12.5, 17, 14, 15.5, 15.5, 17, 17, 15.5, 18.5, 17, 19.5, 16], 0.9, "brown", { flat: true }); g.path(function (c) { c.moveTo(16, 13); c.quadraticCurveTo(10, 12, 10, 7.5); c.quadraticCurveTo(15, 7.5, 16, 13); c.moveTo(16, 13); c.quadraticCurveTo(22, 12, 22, 7.5); c.quadraticCurveTo(17, 7.5, 16, 13); c.fill(); }, "leaf"); },
    chev2: function (g) { chevrons(g, 2, "orange"); },
    chev3: function (g) { chevrons(g, 3, "violet"); },
    megaCrown: function (g) { crown(g, 16, 16); },
    cycle: function (g) { g.arc(16, 16, 6, Math.PI * 0.15, Math.PI * 0.95, 2, "cyan"); g.arc(16, 16, 6, Math.PI * 1.15, Math.PI * 1.95, 2, "violet"); g.poly([21.5, 11, 23.5, 17, 18.5, 15], "cyan"); g.poly([10.5, 21, 8.5, 15, 13.5, 17], "violet"); },
    tenUlt: function (g) { chevrons(g, 3, "violet"); g.star(22, 10, 3, 1.2, 5, "yellow"); },
    crowns: function (g) { crown(g, 12, 18, "gold"); crown(g, 20, 13, "topaz"); },
    watchSun: function (g) { stopwatch(g); g.circle(21.5, 10.5, 2.6, "yellow"); },
    watchLeaf: function (g) { stopwatch(g); g.star(21.5, 10.5, 3.2, 1.5, 5, "orange"); },
    watchWarp: function (g) { stopwatch(g); bolt(g, 21, 11, 0.7, "cyan"); },
    hand: function (g) { g.rrect(11, 13, 10, 10, 3, "cream"); var i; for (i = 0; i < 4; i++) g.rrect(11 + i * 2.6, 7.5 + (i === 0 || i === 3 ? 1.5 : 0), 2.2, 7, 1, "cream"); g.line([11, 19, 8, 15.5], 2.2, "cream"); },
    hourglass: function (g) { g.rect(9.5, 7, 13, 2.4, "wood"); g.rect(9.5, 22.6, 13, 2.4, "wood"); g.poly([11, 9.4, 21, 9.4, 17, 16, 21, 22.6, 11, 22.6, 15, 16], "glass"); g.poly([12.5, 10.5, 19.5, 10.5, 16, 15], "yellow"); g.poly([16, 18, 19.5, 22, 12.5, 22], "yellow"); g.px(16, 17, "yellow"); },
    dice: function (g) { g.rrect(9, 11, 9, 9, 1.5, "white"); g.rrect(15, 8, 8, 8, 1.5, "ruby"); g.pxs([11, 13, 13, 15, 15, 17], "ink"); g.pxs([17, 10, 20, 13], "white"); },
    sparkle: function (g) { g.star(16, 16, 8, 2.2, 4, "yellow"); g.star(16, 16, 4, 1.5, 4, "white", { flat: true, tone: 3 }); },
    sparkle3: function (g) { g.star(12, 18, 5.5, 1.6, 4, "yellow"); g.star(20, 12, 4.5, 1.4, 4, "pink"); g.star(21, 20, 3, 1, 4, "cyan"); },
    prismStar: function (g) { g.star(16, 16, 8, 3.4, 5, "violet"); g.star(16, 16, 4.5, 2, 5, "pink"); g.px(16, 15, "hl").px(13, 13, "cyan").px(19, 13, "yellow"); },
    levelBars: function (g) { g.rect(9, 18, 3.5, 5, "cyan"); g.rect(14, 14, 3.5, 9, "cyan"); g.rect(19, 10, 3.5, 13, "cyan"); g.poly([18, 9, 23.5, 9, 23.5, 14], "lime"); },
    shieldStar: function (g) { g.path(function (c) { c.moveTo(16, 8); c.lineTo(23, 10.5); c.lineTo(23, 15.5); c.quadraticCurveTo(23, 21, 16, 24); c.quadraticCurveTo(9, 21, 9, 15.5); c.lineTo(9, 10.5); c.closePath(); c.fill(); }, "sapphire"); g.star(16, 15.5, 4.2, 1.8, 5, "yellow"); },
    comet: function (g) { g.line([9, 23, 18, 14], 3, "orange"); g.line([11, 23, 18, 16], 1.6, "yellow", { flat: true }); g.circle(19.5, 12.5, 4, "flame"); g.px(18, 11, "hl"); },
    dumbbell: function (g) { g.rect(10, 15, 12, 2.4, "steel"); g.rrect(7, 11, 4, 10, 1, "iron"); g.rrect(21, 11, 4, 10, 1, "iron"); g.rect(5.5, 13, 2, 6, "iron"); g.rect(24.5, 13, 2, 6, "iron"); },
    warpBolt: function (g) { g.ring(16, 16, 7, 1.6, "cyan"); bolt(g, 16, 16, 1, "yellow"); },
    swords: function (g) { g.line([9, 23, 22, 10], 2.2, "silver"); g.line([23, 23, 10, 10], 2.2, "silver"); g.line([8, 20, 12, 24], 1.8, "gold").line([24, 20, 20, 24], 1.8, "gold"); },
    flame: function (g) { g.path(function (c) { c.moveTo(16, 7); c.quadraticCurveTo(24, 14, 22, 19); c.quadraticCurveTo(20, 24, 16, 24); c.quadraticCurveTo(11, 24, 10, 19); c.quadraticCurveTo(9, 15, 12.5, 12); c.quadraticCurveTo(12.5, 16, 14.5, 16); c.quadraticCurveTo(13.5, 11, 16, 7); c.fill(); }, "orange"); g.path(function (c) { c.moveTo(16, 14); c.quadraticCurveTo(20, 18.5, 18.8, 21); c.quadraticCurveTo(17.5, 23.5, 16, 23.5); c.quadraticCurveTo(13, 23.5, 13.2, 20.5); c.quadraticCurveTo(13.5, 17.5, 16, 14); c.fill(); }, "yellow"); },
    skull: function (g) { skull(g, 16, 15); g.poly([10, 11, 8, 6, 12.5, 9], "bone").poly([22, 11, 24, 6, 19.5, 9], "bone"); },
    brokenCrown: function (g) { crown(g, 16, 15, "gold"); g.line([10, 22, 22, 8], 1.6, "silver"); },
    axe: function (g) { g.line([11, 24, 20, 9], 2, "wood"); g.path(function (c) { c.moveTo(17, 8); c.quadraticCurveTo(25, 7, 25, 15); c.quadraticCurveTo(21, 13, 15.5, 12.5); c.closePath(); c.fill(); }, "silver"); },
    tower: function (g) { g.rect(11, 12, 10, 12, "silver"); g.rect(10, 9, 3, 4, "silver").rect(14.5, 9, 3, 4, "silver").rect(19, 9, 3, 4, "silver"); g.rrect(14, 18, 4, 6, 2, "wood"); g.line([16, 9, 16, 4], 0.9, "steel", { flat: true }); g.poly([16, 4, 21, 5.5, 16, 7], "red"); },
    slingshot: function (g) { g.line([16, 24, 16, 17, 11, 10], 2, "wood"); g.line([16, 17, 21, 10], 2, "wood"); g.line([11, 10, 16, 15, 21, 10], 0.9, "brown", { flat: true }); g.circle(16, 15.5, 1.6, "silver"); g.star(23, 21, 2.6, 0.8, 4, "yellow", { flat: true, tone: 4 }); },
    bottle: function (g) { g.rrect(12, 12, 8, 12, 2, "white"); g.rect(12, 17, 8, 7, "cream"); g.rect(12.5, 10, 7, 2.5, "sky"); g.path(function (c) { c.moveTo(14, 10.5); c.quadraticCurveTo(16, 5, 18, 10.5); c.fill(); }, "orange"); },
    versus: function (g) { g.ellipse(16, 17, 8, 6, "crimson"); g.poly([9, 15, 14, 16.5, 9, 18.5], "white").poly([23, 15, 18, 16.5, 23, 18.5], "white"); g.poly([10, 12, 13, 7, 14, 12], "crimson").poly([22, 12, 19, 7, 18, 12], "crimson"); },
    topHat: function (g) { g.ellipse(16, 21, 9, 2.5, "black"); g.rect(11, 9, 10, 12, "black"); g.ellipse(16, 9, 5, 1.6, "coal"); g.rect(11, 17, 10, 2.2, "crimson"); g.px(12, 11, "glint"); },
    peak: function (g) { g.poly([7, 23, 14, 10, 18, 16, 20, 13, 25, 23], "steel"); g.poly([12, 14, 14, 10, 16, 13.5], "white"); g.line([20, 13, 20, 7], 0.9, "wood", { flat: true }); g.poly([20, 7, 24, 8.5, 20, 10], "red"); },
    arrowUp: function (g) { g.poly([16, 7, 23, 15, 19, 15, 19, 23, 13, 23, 13, 15, 9, 15], "lime"); },
    whiteFlag: function (g) { g.line([11, 24, 11, 8], 1.4, "wood"); g.path(function (c) { c.moveTo(11.5, 8.5); c.quadraticCurveTo(16, 6.5, 18, 9); c.quadraticCurveTo(21, 11, 23, 9.5); c.lineTo(23, 16); c.quadraticCurveTo(20, 17.5, 18, 15.5); c.quadraticCurveTo(15, 13, 11.5, 15); c.closePath(); c.fill(); }, "white"); },
    trophy: function (g) { g.path(function (c) { c.moveTo(10, 8); c.lineTo(22, 8); c.quadraticCurveTo(22, 17, 16, 18); c.quadraticCurveTo(10, 17, 10, 8); c.fill(); }, "gold"); g.arc(10, 11.5, 2.6, Math.PI * 0.5, Math.PI * 1.5, 1.3, "gold"); g.arc(22, 11.5, 2.6, Math.PI * 1.5, Math.PI * 2.5, 1.3, "gold"); g.rect(15, 17.5, 2, 3, "gold"); g.rrect(11.5, 20, 9, 3.5, 1, "wood"); },
    shelf: function (g) { var i; for (i = 0; i < 3; i++) { g.rect(9 + i * 5.2, 10 + (i === 1 ? -1.5 : 0), 3.4, 4, "gold"); g.rect(10 + i * 5.2, 14 - (i === 1 ? 1.5 : 0), 1.4, 2, "gold"); } g.rect(7.5, 16, 17, 2, "wood"); g.rect(9, 20, 14, 3, "gold"); g.rect(7.5, 23, 17, 1.6, "wood"); },
    stopwatch: function (g) { stopwatch(g); },
    sun: function (g) { sun(g, 16, 16); },
    maple: function (g) { leafShape(g, 16, 15); },
    snow: function (g) { snowflake(g, 16, 16, 7); },
    seasons: function (g) { var cols = ["leaf", "yellow", "orange", "ice"], i; for (i = 0; i < 4; i++) g.path((function (k) { return function (c) { c.moveTo(16, 16); c.arc(16, 16, 7.5, -Math.PI / 2 + k * Math.PI / 2, k * Math.PI / 2); c.closePath(); c.fill(); }; })(i), cols[i]); g.circle(16, 16, 1.8, "white"); },
    moon: function (g) { moon(g, 15, 16); g.star(22, 10, 2.4, 0.8, 4, "white", { flat: true, tone: 4 }); },
    closedEye: function (g) { g.arc(16, 13, 7, Math.PI * 0.2, Math.PI * 0.8, 1.6, "white"); g.line([10, 18, 9, 21], 1, "white", { flat: true }).line([16, 20, 16, 23], 1, "white", { flat: true }).line([22, 18, 23, 21], 1, "white", { flat: true }); g.circle(22.5, 9, 1.4, "cyan").px(22, 8, "hl"); },
    grave: function (g) { g.path(function (c) { c.moveTo(10, 23); c.lineTo(10, 13); c.quadraticCurveTo(10, 7, 16, 7); c.quadraticCurveTo(22, 7, 22, 13); c.lineTo(22, 23); c.closePath(); c.fill(); }, "steel"); g.rect(15, 10, 2, 7, "iron", { flat: true }); g.rect(13, 12, 6, 2, "iron", { flat: true }); g.rect(8, 22, 16, 2.2, "green"); },
    dove: function (g) { g.ellipse(15, 17, 6, 4, "white"); g.circle(20.5, 13.5, 2.8, "white"); g.poly([23, 13, 25.5, 14, 23, 15], "orange"); g.path(function (c) { c.moveTo(14, 15); c.quadraticCurveTo(10, 7, 6, 9); c.quadraticCurveTo(9, 13, 12, 17); c.fill(); }, "ice"); g.px(21, 13, "ink"); g.line([10, 18, 7, 21], 1.2, "white"); },
    coins: function (g) { var i; for (i = 0; i < 3; i++) g.ellipse(13, 21 - i * 3, 5.5, 2.2, "gold"); g.circle(20, 14, 4.5, "gold"); g.rect(19.2, 11.5, 1.6, 5, "cream"); g.ellipse(9, 22.5, 2.5, 1.2, "topaz"); },
    spire: function (g) { g.poly([16, 6, 20, 23, 12, 23], "black"); g.line([15, 10, 17.5, 14, 15, 17, 17, 21], 0.9, "violet", { flat: true, tone: 4 }); g.pxs([9, 20, 22, 18, 23, 22], "violet"); },
    chest: function (g) { g.rrect(9, 10, 14, 7, 3, "wood"); g.rect(9, 15, 14, 8, "wood"); g.rect(9, 15, 14, 1.6, "gold"); g.rect(15, 14, 2, 4, "gold"); g.pxs([12, 9, 20, 8, 16, 7], "cyan"); },
    chip: function (g) { g.rrect(10, 8, 12, 15, 1.5, "emerald"); g.rect(12, 10, 8, 6, "black"); g.pxs([13, 11, 15, 12, 17, 11, 18, 13], "lime"); var i; for (i = 0; i < 4; i++) g.rect(11.5 + i * 2.5, 19, 1.4, 4, "gold"); },
    paw: function (g) { g.ellipse(16, 19, 4.5, 3.8, "brown"); g.circle(10.5, 14, 1.9, "brown").circle(14, 10.5, 1.9, "brown").circle(18, 10.5, 1.9, "brown").circle(21.5, 14, 1.9, "brown"); },
    helix: function (g) { var i, y; g.path(function (c) { c.moveTo(11, 7); c.bezierCurveTo(23, 11, 9, 19, 21, 25); c.lineWidth = 1.8; c.stroke(); }, "cyan"); g.path(function (c) { c.moveTo(21, 7); c.bezierCurveTo(9, 11, 23, 19, 11, 25); c.lineWidth = 1.8; c.stroke(); }, "pink"); for (i = 0; i < 4; i++) { y = 9.5 + i * 4; g.line([13.5, y, 18.5, y], 0.9, "white", { flat: true }); } },
    bag: function (g) { g.arc(16, 12, 3.5, Math.PI, Math.PI * 2, 1.4, "brown"); g.rrect(10, 11, 12, 13, 2, "parch"); g.rect(10, 15, 12, 2, "crimson"); g.px(12, 13, "hl"); },
    meat: function (g) { g.ellipse(15, 15, 6.5, 5, "meat"); g.line([19, 19, 23, 23], 2, "bone"); g.circle(24, 22, 1.6, "bone").circle(22.5, 24, 1.6, "bone"); g.pxs([12, 12, 13, 12], "hl"); },
    turnip: function (g) { g.path(function (c) { c.moveTo(16, 24); c.quadraticCurveTo(9, 19, 11, 15); c.quadraticCurveTo(16, 11, 21, 15); c.quadraticCurveTo(23, 19, 16, 24); c.fill(); }, "white"); g.rect(11, 13, 10, 3, "violet"); g.path(function (c) { c.moveTo(16, 13); c.quadraticCurveTo(10, 11, 11, 6); c.quadraticCurveTo(15, 7, 16, 13); c.moveTo(16, 13); c.quadraticCurveTo(22, 11, 21, 6); c.quadraticCurveTo(17, 7, 16, 13); c.fill(); }, "leaf"); },
    punchBag: function (g) { g.line([16, 6, 16, 9], 1, "steel", { flat: true }); g.rrect(12, 9, 8, 14, 3, "red"); g.rect(12, 12, 8, 1.6, "crimson", { flat: true }); g.rect(12, 19, 8, 1.6, "crimson", { flat: true }); },
    hearts: function (g) { heart(g, 13, 15, 0.9, "rose"); heart(g, 20, 18, 0.7, "pink"); },
    plate: function (g) { g.ellipse(16, 19, 8.5, 4, "white"); g.circle(12.5, 16.5, 2.4, "leaf").circle(16, 15, 2.4, "meat").circle(19.5, 16.5, 2.4, "yellow"); },
    picky: function (g) { g.circle(13, 14, 3, "green").circle(17, 12.5, 3.2, "green").circle(19.5, 15.5, 2.8, "green"); g.rect(15, 16, 2, 7, "lime"); g.line([8, 9, 24, 23], 1.8, "red"); },
    egg: function (g) { egg(g, 16, 16, 1.2); g.line([11.5, 15, 14, 13, 16.5, 15, 19, 13, 20.5, 14.5], 1, "orange", { flat: true }); g.circle(13.5, 19, 1, "sky", { flat: true }).circle(18.5, 19.5, 1, "sky", { flat: true }); },
    basket: function (g) { egg(g, 12.5, 13, 0.6, "egg"); egg(g, 16, 11.5, 0.6, "cream"); egg(g, 19.5, 13, 0.6, "pink"); g.path(function (c) { c.moveTo(8, 15); c.lineTo(24, 15); c.lineTo(22, 23); c.lineTo(10, 23); c.closePath(); c.fill(); }, "wood"); g.line([9, 18, 23, 18], 0.8, "brown", { flat: true }).line([10, 21, 22, 21], 0.8, "brown", { flat: true }); },
    goldEgg: function (g) { egg(g, 16, 17, 1.1, "gold"); crown(g, 16, 8.5, "yellow"); },
    magnifier: function (g) { g.line([18.5, 18.5, 24, 24], 2.6, "wood"); g.circle(14, 14, 6, "steel"); g.circle(14, 14, 4.3, "glass", { soft: true }); g.px(12, 12, "hl").px(13, 11, "hl"); },
    tree: function (g) { g.rect(14.5, 17, 3, 7, "wood"); g.circle(16, 12.5, 6, "green"); g.circle(11.5, 15, 3.5, "leaf").circle(20.5, 15, 3.5, "leaf"); g.pxs([13, 10, 18, 11, 15, 14], "lime"); },
    frame: function (g) { g.rect(9, 9, 14, 14, "gold"); g.rect(11, 11, 10, 10, "sky", { soft: true }); heart(g, 16, 16.5, 0.7, "rose"); },
    album: function (g) { g.rrect(9, 8, 14, 16, 1.5, "leather"); g.rect(11.5, 10.5, 9, 7, "cream"); g.circle(14, 13, 1.4, "sky", { flat: true }); g.poly([12, 17, 15, 14, 18, 17], "green"); g.rect(8.5, 9, 1.8, 14, "brown"); },
    legacy: function (g) { g.rect(9, 9, 14, 14, "gold"); g.rect(11, 11, 10, 10, "violet", { soft: true }); crown(g, 16, 16, "yellow"); },
    flask: function (g) { g.rect(14, 7, 4, 5, "glass"); g.path(function (c) { c.moveTo(14, 11); c.lineTo(9, 22); c.lineTo(23, 22); c.lineTo(18, 11); c.closePath(); c.fill(); }, "glass"); g.path(function (c) { c.moveTo(11.5, 17); c.lineTo(20.5, 17); c.lineTo(23, 22); c.lineTo(9, 22); c.closePath(); c.fill(); }, "lime"); g.px(12, 18, "hl"); },
    flaskFull: function (g) { g.rect(14, 7, 4, 5, "glass"); g.path(function (c) { c.moveTo(14, 11); c.lineTo(9, 22); c.lineTo(23, 22); c.lineTo(18, 11); c.closePath(); c.fill(); }, "violet"); g.circle(13, 18, 1.2, "pink", { flat: true }).circle(17.5, 15, 1, "pink", { flat: true }).circle(19, 19.5, 1.3, "pink", { flat: true }); g.pxs([15, 5, 17, 4, 16, 3], "white"); },
    madLab: function (g) { g.star(10, 11, 4.5, 3.2, 8, "steel", null, 0); g.circle(10, 11, 1.5, "iron", { flat: true }); g.rect(16, 7, 4, 4, "glass"); g.path(function (c) { c.moveTo(16, 10); c.lineTo(12, 22); c.lineTo(24, 22); c.lineTo(20, 10); c.closePath(); c.fill(); }, "emerald"); bolt(g, 18, 16, 0.6, "yellow"); },
    rankStar: function (g) { chevrons(g, 1, "sapphire"); g.star(16, 11, 4.5, 2, 5, "yellow"); },
    links: function (g) { g.ring(12.5, 16, 4.5, 2, "cyan"); g.ring(19.5, 16, 4.5, 2, "orange"); },
    medic: function (g) { g.rect(13.5, 8, 5, 15, "white"); g.rect(8.5, 13, 15, 5, "white"); g.rect(14.5, 9, 3, 13, "red", { flat: true }); g.rect(9.5, 14, 13, 3, "red", { flat: true }); },
    belt: function (g) { g.rect(6, 14, 20, 5, "leather"); g.circle(16, 16.5, 5.5, "gold"); g.star(16, 16.5, 3, 1.3, 5, "ruby"); g.rect(6, 13.5, 3, 6, "gold").rect(23, 13.5, 3, 6, "gold"); },
    rosette: function (g) { g.poly([12, 18, 9, 25, 12, 24, 13.5, 26, 15, 19], "blue").poly([20, 18, 23, 25, 20, 24, 18.5, 26, 17, 19], "blue"); g.star(16, 14, 7, 5.5, 12, "red", null, 0); g.circle(16, 14, 3.6, "gold"); },
    bigCrown: function (g) { g.poly([8, 22, 7, 11, 12, 16, 16, 8, 20, 16, 25, 11, 24, 22], "gold"); g.rect(8, 21, 16, 4, "gold"); g.circle(16, 18, 1.8, "ruby").circle(11, 19.5, 1.2, "sapphire").circle(21, 19.5, 1.2, "emerald"); }
  }; }
  var EMBLEM = {
    evo: "sprout", champion: "chev2", ultimate: "chev3", mega: "megaCrown", ev25: "cycle", ev100: "cycle", ev500: "cycle", ul10: "tenUlt", mg5: "crowns", mg25: "crowns",
    fastc: "watchSun", fastu: "watchLeaf", fastm: "watchWarp", hold: "hand", hd10: "hourglass", hd50: "hourglass", lucky: "dice", shiny: "sparkle", sh3: "sparkle3", sh10: "prismStar",
    jl10: "levelBars", jl25: "levelBars", jl50: "levelBars", jl75: "levelBars", bl10: "shieldStar", bl25: "shieldStar", bl50: "shieldStar", sk10: "comet", st50: "dumbbell",
    burst: "warpBolt", bu25: "warpBolt", bu250: "warpBolt",
    ko100: "swords", ko1000: "swords", ko10000: "swords", k50k: "swords", k100k: "swords", k250k: "swords", rk250: "flame", rk500: "flame", rk1k: "flame", rk2k: "flame",
    boss: "skull", bs10: "skull", bs50: "skull", bs200: "skull", megaslayer: "brokenCrown", ms10: "brokenCrown", ms100: "brokenCrown", rms5: "axe",
    lord: "tower", ld5: "tower", ld25: "tower", giant: "slingshot", bossb: "bottle",
    rv1: "versus", rv10: "versus", rv50: "versus", rv3: "topHat", rvup: "arrowUp", rvup10: "peak", rvlose: "whiteFlag", tr10: "trophy", tr40: "shelf",
    t5: "stopwatch", sum: "sun", fall: "maple", win: "snow", year: "seasons", yr2: "seasons", yr3: "seasons", yr5: "seasons", r10: "moon", r50: "moon", r200: "moon", r1000: "moon",
    quick: "closedEye", megadie: "grave", paci: "dove", hoard: "coins",
    sp1: "spire", sp25: "spire", sp100: "spire", ca1: "chest", ca25: "chest", ca200: "chest", "catch": "chip", ct10: "chip", ct50: "chip", al1: "paw", ala: "helix", shp1: "bag", shp25: "bag",
    fd1: "meat", fd100: "meat", fd1k: "meat", hv1: "turnip", hv50: "turnip", hv500: "turnip", tn1: "punchBag", tn100: "punchBag", tn500: "punchBag", pet50: "hearts", bal: "plate", picky: "picky",
    egg: "egg", eg10: "basket", egall: "goldEgg", ds25: "magnifier", ds75: "magnifier", ds150: "magnifier", dsall: "tree", mem1: "frame", mem5: "album", mem3: "legacy",
    lab1: "flask", labm: "flaskFull", laball: "madLab", rk5: "rankStar", rk10: "rankStar", rk25: "rankStar", rk50: "rankStar",
    online: "links", dna: "helix", dn10: "helix", rev1: "medic", rev25: "medic", brw1: "belt", brw10: "belt",
    b25: "rosette", b50: "rosette", b100: "rosette", ball: "bigCrown"
  };
  /* how far up its ladder a badge is: 1, 2, 3... (0 for a badge on its own) */
  var rungs = null;
  function rungOf(id) {
    var k, e, groups = {}, list, i;
    if (!rungs) {
      rungs = {};
      var order = (D.BADGES && D.BADGES.LIST) || [];
      for (i = 0; i < order.length; i++) { e = EMBLEM[order[i].id]; if (!e) continue; (groups[e] = groups[e] || []).push(order[i].id); }
      for (k in groups) { list = groups[k]; if (list.length > 1) for (i = 0; i < list.length; i++) rungs[list[i]] = i + 1; }
    }
    return rungs[id] || 0;
  }
  function pips(g, n) { var i, x0 = 16 - (n - 1) * 1.5; for (i = 0; i < n; i++) g.rect(Math.round(x0 + i * 3) - 1, 24, 2, 2, "yellow", { flat: true, tone: 3 }); }
  var TIER_METAL = { 1: "bronze", 2: "silver", 3: "gold", 4: "violet" };
  function medal(g, tier) {
    var mt = TIER_METAL[tier] || "bronze";
    g.poly([9, 0, 14, 0, 16, 6, 12, 8], tier === 4 ? "pink" : "crimson").poly([23, 0, 18, 0, 16, 6, 20, 8], tier === 4 ? "cyan" : "blue");
    if (tier >= 3) g.star(16, 17, 15, 12.5, 16, mt, null, 0);
    g.circle(16, 17, 12.5, mt);
    g.circle(16, 17, 10, tier === 4 ? "dark" : "black", { soft: true });
  }

  /* ---------- painting a grid onto a canvas ---------- */
  function paint(cv, g, opt) {
    opt = opt || {};
    var res = g.render(opt.outline), c = cv.getContext("2d"), W = cv.width, H = cv.height, s = Math.max(1, Math.floor(Math.min(W, H) / N)), ox = Math.floor((W - s * N) / 2), oy = Math.floor((H - s * N) / 2), i, x, y, col, grey = opt.locked;
    c.clearRect(0, 0, W, H);
    c.imageSmoothingEnabled = false;
    if (opt.back) opt.back(c, W, H);
    for (i = 0; i < N * N; i++) {
      x = i % N; y = (i / N) | 0;
      col = res.px[i] || res.ol[i];
      if (!col) continue;
      if (grey) col = res.px[i] ? "#3a4258" : "#141826";
      else if (opt.dim) col = dim(col);
      c.fillStyle = col; c.fillRect(ox + x * s, oy + y * s, s, s);
    }
    if (opt.front) opt.front(c, W, H, s, ox, oy);
  }
  /* a badge not earned yet: the same medal in cold, dark greys */
  function dim(col) {
    var c = col.charAt(0) === "#" ? hex2rgb(col) : col.replace(/[^\d,]/g, "").split(",").map(Number), l = (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) / 255;
    return "rgb(" + Math.round(28 + l * 70) + "," + Math.round(32 + l * 78) + "," + Math.round(46 + l * 96) + ")";
  }
  /* rarity backdrops */
  function backFor(rarity, locked) {
    return function (c, W, H) {
      var g, i, a, r = Math.min(W, H) / 2;
      if (locked) { c.fillStyle = "rgba(20,26,40,0.6)"; c.beginPath(); c.arc(W / 2, H / 2, r * 0.9, 0, 7); c.fill(); return; }
      if (rarity === "prismatic") {
        g = c.createRadialGradient(W / 2, H / 2, 2, W / 2, H / 2, r);
        g.addColorStop(0, "rgba(255,255,255,0.55)"); g.addColorStop(0.35, "rgba(200,150,255,0.45)"); g.addColorStop(0.7, "rgba(90,200,255,0.25)"); g.addColorStop(1, "rgba(255,120,200,0)");
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        for (i = 0; i < 8; i++) { a = i * Math.PI / 4 + 0.2; c.fillStyle = ["#ff7ab0", "#ffd83a", "#7cf0c0", "#7ab0ff"][i % 4]; c.globalAlpha = 0.35; c.beginPath(); c.moveTo(W / 2, H / 2); c.arc(W / 2, H / 2, r, a, a + 0.18); c.fill(); }
        c.globalAlpha = 1;
      } else if (rarity === "rare") {
        g = c.createRadialGradient(W / 2, H / 2, 2, W / 2, H / 2, r);
        g.addColorStop(0, "rgba(120,210,255,0.55)"); g.addColorStop(0.6, "rgba(60,140,255,0.22)"); g.addColorStop(1, "rgba(60,140,255,0)");
        c.fillStyle = g; c.fillRect(0, 0, W, H);
      } else {
        g = c.createRadialGradient(W / 2, H / 2, 2, W / 2, H / 2, r);
        g.addColorStop(0, "rgba(160,180,210,0.28)"); g.addColorStop(1, "rgba(160,180,210,0)");
        c.fillStyle = g; c.fillRect(0, 0, W, H);
      }
    };
  }
  function sparkles(n, col) {
    return function (c, W, H, s) {
      var pts = [[0.12, 0.18], [0.86, 0.14], [0.9, 0.78], [0.1, 0.84], [0.5, 0.06]], i, x, y;
      for (i = 0; i < Math.min(n, pts.length); i++) {
        x = Math.round(pts[i][0] * W); y = Math.round(pts[i][1] * H);
        c.fillStyle = col; c.fillRect(x - s, y, s * 3, s); c.fillRect(x, y - s, s, s * 3);
        c.fillStyle = "#fff"; c.fillRect(x, y, s, s);
      }
    };
  }
  function lockFront(c, W, H, s) {
    var x = Math.round(W / 2 - 3 * s), y = Math.round(H / 2 - 4 * s);
    c.fillStyle = "#9aa6c0"; c.fillRect(x + s, y, 4 * s, s); c.fillRect(x, y + s, s, 3 * s); c.fillRect(x + 5 * s, y + s, s, 3 * s);
    c.fillStyle = "#e2a624"; c.fillRect(x - s, y + 4 * s, 8 * s, 6 * s);
    c.fillStyle = "#7a4a10"; c.fillRect(x + 2 * s, y + 6 * s, 2 * s, 2 * s);
  }

  var cache = {};
  function cached(key, cv, build) {
    var src = cache[key];
    if (!src) { src = mk(cv.width, cv.height); build(src); cache[key] = src; }
    var c = cv.getContext("2d"); c.clearRect(0, 0, cv.width, cv.height); c.imageSmoothingEnabled = false; c.drawImage(src, 0, 0);
  }
  var MOT = MOTIFS();
  var API = {
    item: function (cv, id, opt) {
      opt = opt || {};
      if (!mk || !cv) return;
      cached("i|" + id + "|" + (opt.rarity || "") + "|" + (opt.locked ? 1 : 0) + "|" + cv.width, cv, function (dst) {
        var g = new Grid(), fn = ITEM[id];
        if (!fn) { g.circle(16, 16, 9, "steel"); } else fn(g);
        paint(dst, g, { back: backFor(opt.rarity, opt.locked), locked: opt.locked,
          front: opt.locked ? lockFront : opt.rarity === "prismatic" ? sparkles(5, "#c79bff") : opt.rarity === "rare" ? sparkles(2, "#5ac8ff") : null });
      });
    },
    scroll: function (cv, opt) {
      opt = opt || {};
      if (!mk || !cv) return;
      cached("s|" + cv.width, cv, function (dst) { var g = new Grid(); scrollArt(g); paint(dst, g, { back: backFor("rare"), front: sparkles(2, "#5ac8ff") }); });
    },
    lab: function (cv, id, opt) {
      opt = opt || {};
      if (!mk || !cv) return;
      cached("l|" + id + "|" + (opt.max ? 1 : 0) + "|" + cv.width, cv, function (dst) {
        var g = new Grid(), fn = LAB[id] || LAB.bits;
        fn(g);
        paint(dst, g, { back: function (c, W, H) { var gr = c.createRadialGradient(W / 2, H / 2, 1, W / 2, H / 2, W / 2); gr.addColorStop(0, opt.max ? "rgba(255,210,58,0.5)" : "rgba(140,170,230,0.3)"); gr.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = gr; c.fillRect(0, 0, W, H); },
          front: opt.max ? sparkles(3, "#ffd23a") : null });
      });
    },
    badge: function (cv, b, opt) {
      opt = opt || {};
      if (!mk || !cv || !b) return;
      var got = !!opt.got, secret = b.secret && !got;
      cached("b|" + b.id + "|" + b.cat + "|" + b.tier + "|" + (got ? 1 : 0) + "|" + (secret ? 1 : 0) + "|" + cv.width, cv, function (dst) {
        var g = new Grid();
        medal(g, b.tier);
        var mo = EMBLEM[b.id] && MOT[EMBLEM[b.id]], n;
        if (secret) { g.path(function (c) { c.font = "bold 15px monospace"; c.textAlign = "center"; c.fillText("?", 16, 23); }, "silver"); }
        else if (mo) { mo(g); n = rungOf(b.id); if (n) pips(g, n); }
        else (CAT[b.cat] || CAT.Mastery)(g);
        if (b.tier >= 2) g.pxs([8, 11, 9, 10], "hl");
        paint(dst, g, { dim: !got, back: got && b.tier === 4 ? backFor("prismatic") : got && b.tier === 3 ? backFor("rare") : null,
          front: got && b.tier === 4 ? sparkles(4, "#c79bff") : got && b.tier === 3 ? sparkles(2, "#ffd23a") : null });
      });
    },
    /* a medal with one of the motifs on it (17z33: the League's mode emblems). tier 1-4 as the badges. */
    motif: function (cv, name, opt) {
      opt = opt || {};
      if (!mk || !cv || !MOT[name]) return;
      cached("m|" + name + "|" + (opt.tier || 3) + "|" + cv.width, cv, function (dst) {
        var g = new Grid();
        medal(g, opt.tier || 3); MOT[name](g);
        paint(dst, g, { back: (opt.tier || 3) >= 4 ? backFor("prismatic") : backFor("rare"), front: sparkles(2, opt.spark || "#ffd23a") });
      });
    },
    _ids: function () { return { item: Object.keys(ITEM), lab: Object.keys(LAB), cat: Object.keys(CAT), emblem: EMBLEM, motifs: Object.keys(MOT) }; }
  };
  D.iconArt = API;
})(typeof window !== "undefined" ? window : this);
