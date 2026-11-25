/* Title scene (Nov 14): an animated pixel-art hill with the Digi Egg under a
 * sky that cycles through the game's weather (day, sunset, night, meteor
 * shower, rain, thunderstorm, eclipse, daybreak). Also the egg-pick carousel
 * and a small 5x7 pixel font used by the menu buttons.
 *
 * Canvas 2D on its own low-res canvas (#title-scene), scaled up with
 * nearest-neighbour. Reads only public hooks: DBH.sprites (egg / tamer /
 * partner art), DBH.EGGS, DBH.getSelectedEgg / getSelectedTamer, DBH.getState.
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});

  /* ------------------------------------------------------------------ */
  /* 5x7 pixel font                                                      */
  /* ------------------------------------------------------------------ */
  var F = {
    "A": [".XXX.", "X...X", "X...X", "XXXXX", "X...X", "X...X", "X...X"],
    "B": ["XXXX.", "X...X", "X...X", "XXXX.", "X...X", "X...X", "XXXX."],
    "C": [".XXX.", "X...X", "X....", "X....", "X....", "X...X", ".XXX."],
    "D": ["XXXX.", "X...X", "X...X", "X...X", "X...X", "X...X", "XXXX."],
    "E": ["XXXXX", "X....", "X....", "XXXX.", "X....", "X....", "XXXXX"],
    "F": ["XXXXX", "X....", "X....", "XXXX.", "X....", "X....", "X...."],
    "G": [".XXX.", "X...X", "X....", "X.XXX", "X...X", "X...X", ".XXXX"],
    "H": ["X...X", "X...X", "X...X", "XXXXX", "X...X", "X...X", "X...X"],
    "I": ["XXXXX", "..X..", "..X..", "..X..", "..X..", "..X..", "XXXXX"],
    "J": ["..XXX", "...X.", "...X.", "...X.", "...X.", "X..X.", ".XX.."],
    "K": ["X...X", "X..X.", "X.X..", "XX...", "X.X..", "X..X.", "X...X"],
    "L": ["X....", "X....", "X....", "X....", "X....", "X....", "XXXXX"],
    "M": ["X...X", "XX.XX", "X.X.X", "X.X.X", "X...X", "X...X", "X...X"],
    "N": ["X...X", "XX..X", "X.X.X", "X..XX", "X...X", "X...X", "X...X"],
    "O": [".XXX.", "X...X", "X...X", "X...X", "X...X", "X...X", ".XXX."],
    "P": ["XXXX.", "X...X", "X...X", "XXXX.", "X....", "X....", "X...."],
    "Q": [".XXX.", "X...X", "X...X", "X...X", "X.X.X", "X..X.", ".XX.X"],
    "R": ["XXXX.", "X...X", "X...X", "XXXX.", "X.X..", "X..X.", "X...X"],
    "S": [".XXXX", "X....", "X....", ".XXX.", "....X", "....X", "XXXX."],
    "T": ["XXXXX", "..X..", "..X..", "..X..", "..X..", "..X..", "..X.."],
    "U": ["X...X", "X...X", "X...X", "X...X", "X...X", "X...X", ".XXX."],
    "V": ["X...X", "X...X", "X...X", "X...X", "X...X", ".X.X.", "..X.."],
    "W": ["X...X", "X...X", "X...X", "X.X.X", "X.X.X", "XX.XX", "X...X"],
    "X": ["X...X", "X...X", ".X.X.", "..X..", ".X.X.", "X...X", "X...X"],
    "Y": ["X...X", "X...X", ".X.X.", "..X..", "..X..", "..X..", "..X.."],
    "Z": ["XXXXX", "....X", "...X.", "..X..", ".X...", "X....", "XXXXX"],
    "0": [".XXX.", "X...X", "X..XX", "X.X.X", "XX..X", "X...X", ".XXX."],
    "1": ["..X..", ".XX..", "..X..", "..X..", "..X..", "..X..", ".XXX."],
    "2": [".XXX.", "X...X", "....X", "...X.", "..X..", ".X...", "XXXXX"],
    "3": ["XXXXX", "...X.", "..X..", "...X.", "....X", "X...X", ".XXX."],
    "4": ["...X.", "..XX.", ".X.X.", "X..X.", "XXXXX", "...X.", "...X."],
    "5": ["XXXXX", "X....", "XXXX.", "....X", "....X", "X...X", ".XXX."],
    "6": ["..XX.", ".X...", "X....", "XXXX.", "X...X", "X...X", ".XXX."],
    "7": ["XXXXX", "....X", "...X.", "..X..", ".X...", ".X...", ".X..."],
    "8": [".XXX.", "X...X", "X...X", ".XXX.", "X...X", "X...X", ".XXX."],
    "9": [".XXX.", "X...X", "X...X", ".XXXX", "....X", "...X.", ".XX.."],
    " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
    ".": [".....", ".....", ".....", ".....", ".....", ".XX..", ".XX.."],
    ",": [".....", ".....", ".....", ".....", ".XX..", "..X..", ".X..."],
    "!": ["..X..", "..X..", "..X..", "..X..", "..X..", ".....", "..X.."],
    "?": [".XXX.", "X...X", "....X", "...X.", "..X..", ".....", "..X.."],
    ":": [".....", ".XX..", ".XX..", ".....", ".XX..", ".XX..", "....."],
    "-": [".....", ".....", ".....", "XXXXX", ".....", ".....", "....."],
    "'": ["..X..", "..X..", ".X...", ".....", ".....", ".....", "....."],
    "/": ["....X", "...X.", "...X.", "..X..", ".X...", ".X...", "X...."],
    "+": [".....", "..X..", "..X..", "XXXXX", "..X..", "..X..", "....."],
    "<": ["...X.", "..X..", ".X...", "X....", ".X...", "..X..", "...X."],
    ">": [".X...", "..X..", "...X.", "....X", "...X.", "..X..", ".X..."],
    "*": [".....", "..X..", "X.X.X", ".XXX.", "X.X.X", "..X..", "....."],
    "#": [".X.X.", ".X.X.", "XXXXX", ".X.X.", "XXXXX", ".X.X.", ".X.X."]
  };

  function textWidth(text, px, gap) {
    gap = gap == null ? 1 : gap;
    return Math.max(0, text.length * (5 + gap) - gap) * px;
  }

  function drawText(ctx, text, x, y, px, color, gap) {
    gap = gap == null ? 1 : gap;
    var i, r, c, g, adv = (5 + gap) * px;
    ctx.fillStyle = color;
    text = String(text).toUpperCase();
    for (i = 0; i < text.length; i++) {
      g = F[text.charAt(i)] || F["?"];
      for (r = 0; r < 7; r++) {
        for (c = 0; c < 5; c++) {
          if (g[r].charCodeAt(c) === 88) ctx.fillRect(x + i * adv + c * px, y + r * px, px, px);
        }
      }
    }
    return textWidth(text, px, gap);
  }

  /* Render a label onto a canvas. opts: { px, color, shadow } */
  function paintLabel(cv, text, opts) {
    opts = opts || {};
    var px = opts.px || 2;
    var sh = opts.shadow ? px : 0;
    text = String(text).toUpperCase();
    var w = textWidth(text, px) + sh, h = 7 * px + sh;
    cv.width = Math.max(1, w);
    cv.height = Math.max(1, h);
    cv.style.width = w + "px";
    cv.style.height = h + "px";
    var c = cv.getContext("2d");
    c.clearRect(0, 0, w, h);
    if (sh) drawText(c, text, sh, sh, px, opts.shadow);
    drawText(c, text, 0, 0, px, opts.color || "#fff");
    return cv;
  }

  /* Any element with data-px="TEXT" gets a pixel-font canvas label. The
   * plain text stays for screen readers (aria-label) and as a fallback. */
  function stampLabels(root) {
    var list = (root || document).querySelectorAll("[data-px]");
    var i, el, cv, cs, px, color, shadow;
    for (i = 0; i < list.length; i++) {
      el = list[i];
      cs = getComputedStyle(el);
      px = parseInt(cs.getPropertyValue("--px"), 10) || 2;
      color = (cs.getPropertyValue("--px-color") || "").trim() || "#f6ead0";
      shadow = (cs.getPropertyValue("--px-shadow") || "").trim() || null;
      if (shadow === "none") shadow = null;
      cv = el.querySelector("canvas.px-label");
      if (!cv) {
        cv = document.createElement("canvas");
        cv.className = "px-label";
        cv.setAttribute("aria-hidden", "true");
        el.textContent = "";
        el.appendChild(cv);
      }
      if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", el.getAttribute("data-px"));
      paintLabel(cv, el.getAttribute("data-px"), { px: px, color: color, shadow: shadow });
    }
  }

  D.px = { drawText: drawText, textWidth: textWidth, paintLabel: paintLabel, stamp: stampLabels };

  /* ------------------------------------------------------------------ */
  /* Sky phases                                                          */
  /* ------------------------------------------------------------------ */
  var HOLD = 6.5, FADE = 2.6;
  var PHASES = [
    { id: "day", label: "Clear Day",
      top: [58, 138, 226], mid: [118, 192, 244], low: [206, 236, 248],
      far: [108, 158, 186], farHi: [150, 196, 214], hill: [62, 150, 104], tree: [34, 104, 78],
      ground: [72, 176, 88], grassHi: [150, 226, 112], soil: [50, 130, 76],
      cloud: [255, 255, 255], cloudSh: [206, 226, 244], clouds: 0.5,
      sunX: 0.74, sunY: 0.2, sun: 1, sunC: [255, 238, 150], moon: 0, moonX: 0.2, moonY: 0.9,
      stars: 0, meteors: 0, rain: 0, storm: 0, eclipse: 0, fire: 0, petals: 1,
      tint: [255, 255, 255], tintA: 0, glow: [255, 244, 170], glowA: 0.22 },
    { id: "dusk", label: "Sunset",
      top: [52, 44, 112], mid: [206, 92, 104], low: [252, 184, 96],
      far: [110, 74, 118], farHi: [168, 104, 124], hill: [70, 96, 96], tree: [44, 62, 74],
      ground: [78, 128, 82], grassHi: [214, 190, 104], soil: [56, 92, 70],
      cloud: [255, 188, 150], cloudSh: [196, 110, 122], clouds: 0.6,
      sunX: 0.58, sunY: 0.74, sun: 1, sunC: [255, 196, 96], moon: 0, moonX: 0.2, moonY: 0.6,
      stars: 0.15, meteors: 0, rain: 0, storm: 0, eclipse: 0, fire: 0.3, petals: 0.4,
      tint: [255, 150, 90], tintA: 0.16, glow: [255, 214, 130], glowA: 0.3 },
    { id: "night", label: "Night",
      top: [6, 10, 38], mid: [16, 28, 76], low: [44, 62, 118],
      far: [22, 34, 72], farHi: [40, 56, 104], hill: [20, 50, 66], tree: [12, 32, 48],
      ground: [26, 74, 70], grassHi: [70, 150, 130], soil: [18, 52, 54],
      cloud: [60, 76, 128], cloudSh: [38, 50, 96], clouds: 0.35,
      sunX: 0.9, sunY: 1.1, sun: 0, sunC: [255, 196, 96], moon: 1, moonX: 0.72, moonY: 0.2,
      stars: 1, meteors: 0, rain: 0, storm: 0, eclipse: 0, fire: 1, petals: 0,
      tint: [40, 60, 140], tintA: 0.3, glow: [130, 230, 255], glowA: 0.4 },
    { id: "meteor", label: "Meteor Shower",
      top: [14, 8, 46], mid: [38, 22, 92], low: [84, 52, 130],
      far: [34, 26, 80], farHi: [60, 46, 116], hill: [28, 44, 76], tree: [18, 28, 56],
      ground: [34, 70, 84], grassHi: [110, 150, 190], soil: [24, 48, 64],
      cloud: [78, 62, 132], cloudSh: [50, 40, 98], clouds: 0.15,
      sunX: 0.9, sunY: 1.1, sun: 0, sunC: [255, 196, 96], moon: 1, moonX: 0.8, moonY: 0.26,
      stars: 1, meteors: 1, rain: 0, storm: 0, eclipse: 0, fire: 0.7, petals: 0,
      tint: [70, 50, 150], tintA: 0.26, glow: [190, 170, 255], glowA: 0.46 },
    { id: "rain", label: "Rain",
      top: [50, 64, 84], mid: [82, 100, 122], low: [128, 146, 160],
      far: [70, 88, 108], farHi: [92, 112, 130], hill: [50, 96, 92], tree: [32, 68, 70],
      ground: [52, 122, 86], grassHi: [104, 172, 118], soil: [38, 90, 70],
      cloud: [108, 120, 140], cloudSh: [74, 86, 108], clouds: 1,
      sunX: 0.74, sunY: 0.2, sun: 0, sunC: [230, 230, 220], moon: 0, moonX: 0.72, moonY: 0.2,
      stars: 0, meteors: 0, rain: 1, storm: 0, eclipse: 0, fire: 0, petals: 0,
      tint: [70, 90, 120], tintA: 0.2, glow: [200, 230, 255], glowA: 0.2 },
    { id: "storm", label: "Thunderstorm",
      top: [16, 20, 34], mid: [34, 42, 62], low: [62, 72, 96],
      far: [30, 38, 58], farHi: [46, 56, 80], hill: [26, 52, 60], tree: [16, 34, 44],
      ground: [30, 76, 66], grassHi: [70, 122, 100], soil: [22, 54, 52],
      cloud: [58, 64, 86], cloudSh: [34, 38, 58], clouds: 1,
      sunX: 0.74, sunY: 0.2, sun: 0, sunC: [230, 230, 220], moon: 0, moonX: 0.72, moonY: 0.2,
      stars: 0, meteors: 0, rain: 1.7, storm: 1, eclipse: 0, fire: 0, petals: 0,
      tint: [30, 40, 80], tintA: 0.36, glow: [170, 210, 255], glowA: 0.3 },
    { id: "eclipse", label: "Eclipse",
      top: [20, 4, 18], mid: [74, 14, 32], low: [158, 52, 34],
      far: [48, 14, 34], farHi: [84, 26, 40], hill: [44, 28, 44], tree: [26, 14, 30],
      ground: [56, 50, 54], grassHi: [150, 80, 70], soil: [38, 30, 40],
      cloud: [94, 30, 48], cloudSh: [58, 16, 34], clouds: 0.3,
      sunX: 0.66, sunY: 0.24, sun: 1, sunC: [255, 120, 60], moon: 0, moonX: 0.66, moonY: 0.24,
      stars: 0.55, meteors: 0, rain: 0, storm: 0, eclipse: 1, fire: 0, petals: 0,
      tint: [150, 30, 40], tintA: 0.3, glow: [255, 90, 90], glowA: 0.5 },
    { id: "dawn", label: "Daybreak",
      top: [72, 94, 176], mid: [238, 152, 146], low: [255, 220, 156],
      far: [128, 110, 150], farHi: [190, 150, 160], hill: [70, 128, 110], tree: [42, 88, 86],
      ground: [78, 156, 96], grassHi: [196, 220, 120], soil: [54, 112, 80],
      cloud: [255, 214, 196], cloudSh: [214, 150, 160], clouds: 0.45,
      sunX: 0.52, sunY: 0.72, sun: 1, sunC: [255, 226, 150], moon: 0, moonX: 0.8, moonY: 0.7,
      stars: 0.1, meteors: 0, rain: 0, storm: 0, eclipse: 0, fire: 0, petals: 0.7,
      tint: [255, 190, 150], tintA: 0.1, glow: [255, 236, 170], glowA: 0.28 }
  ];

  var cv = null, cx = null, layer = null, lx = null, eggTmp = null, ex2 = null;
  var W = 320, H = 180, S = 4, viewW = 1280, viewH = 720;
  var t = 0, lastNow = 0, phaseIdx = 0, phaseT = 0, lastLabel = "";
  var mode = "off";
  var cam = { eggX: 0.3, base: 0.78, k: 2, tamer: 1 }, camTo = { eggX: 0.3, base: 0.78, k: 2, tamer: 1 };
  var mix = {};
  var stars = [], clouds = [], drops = [], meteors = [], flies = [], petals = [], sparks = [], babies = [], motes = [];
  var bolt = null, boltCd = 3, flash = 0;
  var pokeT = 0, hopV = 0, hopY = 0;
  var viewEgg = null, lastSelEgg = null, eggList = [];
  var ui = {};
  var raf = 0;

  function $(id) { return document.getElementById(id); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rgb(c, a) {
    if (a != null) return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")";
    return "rgb(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + ")";
  }
  function hash(n) {
    n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4);
    n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15);
    return (n >>> 0) / 4294967296;
  }
  function wave(x, s) {
    return (Math.sin(x * 0.021 + s) * 0.5 + Math.sin(x * 0.047 + s * 2.3) * 0.3 + Math.sin(x * 0.11 + s * 4.1) * 0.2);
  }

  function blend() {
    var a = PHASES[phaseIdx], b = PHASES[(phaseIdx + 1) % PHASES.length];
    var k = phaseT > HOLD ? clamp((phaseT - HOLD) / FADE, 0, 1) : 0;
    k = k * k * (3 - 2 * k);
    var key, i, va, vb;
    for (key in a) {
      va = a[key]; vb = b[key];
      if (typeof va === "number") mix[key] = lerp(va, vb, k);
      else if (Array.isArray(va)) {
        if (!mix[key] || !mix[key].length) mix[key] = [0, 0, 0];
        for (i = 0; i < 3; i++) mix[key][i] = lerp(va[i], vb[i], k);
      }
    }
    mix.label = k < 0.5 ? a.label : b.label;
    mix.id = k < 0.5 ? a.id : b.id;
  }

  /* ------------------------------------------------------------------ */
  /* Setup                                                               */
  /* ------------------------------------------------------------------ */
  function seedScene() {
    var i;
    stars = [];
    for (i = 0; i < 90; i++) stars.push({ x: hash(i * 7 + 1), y: hash(i * 13 + 5) * 0.92, sp: 1 + hash(i * 3 + 9) * 3, ph: hash(i + 77) * 6.28, big: hash(i * 5 + 2) > 0.9 });
    clouds = [];
    for (i = 0; i < 9; i++) clouds.push({ x: hash(i * 11 + 3), y: 0.08 + hash(i * 17 + 4) * 0.5, sp: 0.004 + hash(i * 19 + 6) * 0.012, kind: i % 3, big: hash(i * 23 + 8) > 0.55 });
    drops = [];
    for (i = 0; i < 420; i++) drops.push({ x: hash(i * 29 + 1), y: hash(i * 31 + 2), sp: 0.9 + hash(i * 37 + 3) * 0.7 });
    flies = [];
    for (i = 0; i < 14; i++) flies.push({ x: hash(i * 41 + 1), y: hash(i * 43 + 2), ph: hash(i * 47 + 3) * 6.28, sp: 0.3 + hash(i * 53 + 4) * 0.5 });
    petals = [];
    for (i = 0; i < 10; i++) petals.push({ x: hash(i * 59 + 1), y: hash(i * 61 + 2), ph: hash(i * 67 + 3) * 6.28, c: i % 3 });
    motes = [];
    for (i = 0; i < 16; i++) motes.push({ x: hash(i * 71 + 1), y: hash(i * 73 + 2), sp: 0.05 + hash(i * 79 + 3) * 0.12 });
    babies = [
      { form: "koromon", x: 46, dir: -1, hop: 0, wait: 1.2, slot: 0 },
      { form: "tsunomon", x: 80, dir: 1, hop: 0.4, wait: 0.2, slot: 1 }
    ];
    if (D.sprites && D.sprites.preloadSpecies) {
      try { D.sprites.preloadSpecies(["koromon", "tsunomon", "botamon", "punimon"], true); } catch (err) {}
    }
  }

  function resize() {
    if (!cv) return;
    viewW = Math.max(1, window.innerWidth);
    viewH = Math.max(1, window.innerHeight);
    S = Math.max(2, Math.round(viewH / 210));
    if (viewW / S < 150) S = Math.max(2, Math.floor(viewW / 150));
    W = Math.ceil(viewW / S);
    H = Math.ceil(viewH / S);
    cv.width = W; cv.height = H;
    cv.style.width = (W * S) + "px";
    cv.style.height = (H * S) + "px";
    layer.width = W; layer.height = H;
    cx.imageSmoothingEnabled = false;
    lx.imageSmoothingEnabled = false;
    aim(true);
    stampLabels(document);
    var lg = $("title-logo");
    if (lg && lg.width && (window.innerWidth < 620) !== lg.classList.contains("is-stacked")) paintLogo(lg);
  }

  function portrait() { return viewH > viewW * 1.05; }

  /* Where the egg sits for the current screen. In egg-pick mode it lines
   * up with the DOM stage box so the arrows and name plate frame it. */
  function aim(snap) {
    var p = portrait();
    var r = null, st;
    if (mode === "egg") {
      st = $("egg-stage");
      if (st) r = st.getBoundingClientRect();
    }
    if (r && r.width > 4 && r.height > 4) {
      camTo.eggX = (r.left + r.width / 2) / viewW;
      camTo.base = clamp((r.bottom - r.height * 0.06) / viewH + 0.085, 0.3, 0.96);
      camTo.k = (r.height / S) > 96 ? 3 : 2;
      camTo.tamer = 0;
    } else if (p) {
      camTo.eggX = 0.5; camTo.base = 0.47; camTo.k = 2; camTo.tamer = 1;
    } else {
      camTo.eggX = viewW < 900 ? 0.25 : 0.3;
      camTo.base = viewH < 480 ? 0.86 : 0.8;
      camTo.k = 2; camTo.tamer = 1;
    }
    if (snap) { cam.eggX = camTo.eggX; cam.base = camTo.base; cam.k = camTo.k; cam.tamer = camTo.tamer; }
  }

  /* ------------------------------------------------------------------ */
  /* Terrain                                                             */
  /* ------------------------------------------------------------------ */
  function baseY() { return Math.round(H * cam.base); }
  function moundR() { return Math.max(46, Math.min(W * 0.3, 104)); }
  function groundY(x) {
    var b = baseY(), ex = W * cam.eggX, d = Math.abs(x - ex) / moundR();
    /* a flat-topped knoll, so the egg has somewhere to sit */
    var m = d < 0.28 ? 1 : (d < 1 ? (Math.cos(((d - 0.28) / 0.72) * Math.PI) * 0.5 + 0.5) : 0);
    return Math.round(b - m * H * 0.085 + Math.sin(x * 0.045 + 1.3) * 1.4 * (1 - m));
  }
  function farY(x) { var b = baseY(); return Math.round(b - H * 0.2 - (wave(x + 400, 1.7) * 0.5 + 0.5) * H * 0.16); }
  function midY(x) { var b = baseY(); return Math.round(b - H * 0.06 - (wave(x * 1.6 + 90, 4.2) * 0.5 + 0.5) * H * 0.085); }

  function disc(c, x, y, r) {
    var dy, half;
    x = Math.round(x); y = Math.round(y);
    for (dy = -r; dy <= r; dy++) {
      half = Math.floor(Math.sqrt(r * r - dy * dy) + 0.35);
      c.fillRect(x - half, y + dy, half * 2 + 1, 1);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Draw                                                                */
  /* ------------------------------------------------------------------ */
  function drawSky() {
    var b = baseY(), y, f, q, N = 16, k, c = [0, 0, 0], i;
    for (y = 0; y < b + 2; y++) {
      f = clamp(y / Math.max(1, b), 0, 1);
      q = f * N;
      k = Math.floor(q);
      if (q - k > 0.72 && (y & 1) === 0) k += 1;
      f = clamp(k / N, 0, 1);
      for (i = 0; i < 3; i++) c[i] = f < 0.55 ? lerp(mix.top[i], mix.mid[i], f / 0.55) : lerp(mix.mid[i], mix.low[i], (f - 0.55) / 0.45);
      cx.fillStyle = rgb(c);
      cx.fillRect(0, y, W, 1);
    }
  }

  function drawStars() {
    if (mix.stars < 0.04) return;
    var b = baseY(), i, s, a;
    for (i = 0; i < stars.length; i++) {
      s = stars[i];
      a = mix.stars * (0.45 + 0.55 * Math.sin(t * s.sp + s.ph));
      if (a < 0.1) continue;
      cx.fillStyle = "rgba(236,244,255," + a.toFixed(2) + ")";
      var x = Math.floor(s.x * W), y = Math.floor(s.y * b * 0.95);
      cx.fillRect(x, y, 1, 1);
      if (s.big && a > 0.5) { cx.fillRect(x - 1, y, 3, 1); cx.fillRect(x, y - 1, 1, 3); }
    }
  }

  function drawMeteors(dt) {
    var i, m, j;
    if (mix.meteors > 0.05 && Math.random() < dt * 3.2 * mix.meteors) {
      meteors.push({ x: W * (0.15 + Math.random() * 1.0), y: -4, vx: -(60 + Math.random() * 50), vy: 46 + Math.random() * 30, life: 1.6, big: Math.random() > 0.75 });
    }
    for (i = meteors.length - 1; i >= 0; i--) {
      m = meteors[i];
      m.x += m.vx * dt; m.y += m.vy * dt; m.life -= dt;
      if (m.life <= 0 || m.y > baseY() - 6 || m.x < -20) { meteors.splice(i, 1); continue; }
      for (j = 0; j < 12; j++) {
        cx.fillStyle = j === 0 ? "#ffffff" : "rgba(" + (j < 4 ? "255,236,170" : "190,170,255") + "," + (0.85 - j * 0.07).toFixed(2) + ")";
        cx.fillRect(Math.round(m.x - m.vx * 0.012 * j), Math.round(m.y - m.vy * 0.012 * j), (j === 0 && m.big) ? 2 : 1, (j === 0 && m.big) ? 2 : 1);
      }
    }
  }

  function drawSunMoon() {
    var b = baseY(), r = Math.max(7, Math.round(H * 0.058)), x, y, i, a;
    if (mix.sun > 0.03) {
      x = mix.sunX * W; y = mix.sunY * b;
      cx.fillStyle = rgb(mix.sunC, 0.12 * mix.sun); disc(cx, x, y, r + 6);
      cx.fillStyle = rgb(mix.sunC, 0.22 * mix.sun); disc(cx, x, y, r + 3);
      cx.fillStyle = rgb(mix.sunC, mix.sun); disc(cx, x, y, r);
      if (mix.eclipse > 0.02) {
        cx.fillStyle = "rgba(12,2,10," + clamp(mix.eclipse * 1.2, 0, 1) + ")";
        disc(cx, x + (1 - mix.eclipse) * r * 1.6, y - (1 - mix.eclipse) * r * 0.4, r - 1);
        for (i = 0; i < 18; i++) {
          a = i / 18 * 6.283 + t * 0.35;
          if (hash(i + Math.floor(t * 7)) > 0.45) {
            cx.fillStyle = "rgba(255," + (120 + (i * 37) % 90) + ",70," + (0.75 * mix.eclipse).toFixed(2) + ")";
            cx.fillRect(Math.round(x + Math.cos(a) * (r + 2 + (i % 3))), Math.round(y + Math.sin(a) * (r + 2 + (i % 3))), 1, 1);
          }
        }
      }
    }
    if (mix.moon > 0.03) {
      x = mix.moonX * W; y = mix.moonY * b; r = Math.max(6, Math.round(H * 0.05));
      cx.fillStyle = "rgba(214,228,255," + (0.1 * mix.moon).toFixed(2) + ")"; disc(cx, x, y, r + 4);
      cx.fillStyle = "rgba(232,240,255," + mix.moon.toFixed(2) + ")"; disc(cx, x, y, r);
      cx.fillStyle = "rgba(176,192,226," + mix.moon.toFixed(2) + ")";
      cx.fillRect(Math.round(x - r * 0.4), Math.round(y - r * 0.3), 2, 2);
      cx.fillRect(Math.round(x + r * 0.2), Math.round(y + r * 0.3), 3, 2);
      cx.fillRect(Math.round(x + r * 0.35), Math.round(y - r * 0.45), 1, 1);
    }
  }

  var CLOUD_SHAPES = [
    [[0, 3, 26, 4], [3, 1, 12, 3], [9, -1, 9, 3], [16, 1, 8, 3]],
    [[0, 2, 18, 3], [4, 0, 8, 3], [10, 1, 6, 2]],
    [[0, 3, 34, 4], [5, 1, 10, 3], [12, -2, 12, 4], [22, 0, 9, 4]]
  ];
  function drawClouds(dt) {
    var b = baseY(), n = Math.round(clouds.length * clamp(mix.clouds, 0, 1)), i, c, sh, j, x, y, sc, r;
    for (i = 0; i < clouds.length; i++) {
      c = clouds[i];
      c.x += c.sp * dt * (1 + mix.storm * 2.5);
      if (c.x > 1.25) c.x = -0.3;
      if (i >= n) continue;
      sh = CLOUD_SHAPES[c.kind]; sc = c.big ? 2 : 1;
      x = Math.round(c.x * W); y = Math.round(c.y * b * 0.8);
      for (j = 0; j < sh.length; j++) {
        r = sh[j];
        cx.fillStyle = rgb(mix.cloudSh);
        cx.fillRect(x + r[0] * sc, y + (r[1] + 1) * sc, r[2] * sc, r[3] * sc);
      }
      for (j = 0; j < sh.length; j++) {
        r = sh[j];
        cx.fillStyle = rgb(mix.cloud);
        cx.fillRect(x + r[0] * sc, y + r[1] * sc, r[2] * sc, Math.max(1, (r[3] - 1) * sc));
      }
    }
  }

  function drawLand() {
    var b = baseY(), x, y, i, hx, hy;
    /* far ridge */
    for (x = 0; x < W; x++) {
      y = farY(x);
      cx.fillStyle = rgb(mix.far);
      cx.fillRect(x, y, 1, b - y + 2);
      if (y < farY(x - 1) || y < farY(x + 1)) { cx.fillStyle = rgb(mix.farHi); cx.fillRect(x, y, 1, 2); }
    }
    /* mid hills */
    for (x = 0; x < W; x++) {
      y = midY(x);
      cx.fillStyle = rgb(mix.hill);
      cx.fillRect(x, y, 1, b - y + 2);
    }
    /* File Island-style monoliths with a blinking data light */
    for (i = 0; i < 4; i++) {
      hx = Math.round(W * (0.12 + i * 0.26 + hash(i + 300) * 0.1));
      if (Math.abs(hx - W * cam.eggX) < moundR() * 0.4) continue;
      hy = midY(hx);
      var mh = 9 + Math.round(hash(i + 310) * 9);
      cx.fillStyle = rgb(mix.tree);
      cx.fillRect(hx, hy - mh, 3, mh + 2);
      cx.fillRect(hx + 1, hy - mh - 2, 1, 2);
      if (Math.sin(t * (1.5 + i * 0.6) + i) > 0.1) {
        cx.fillStyle = "rgba(120,240,255,0.9)";
        cx.fillRect(hx + 1, hy - mh + 2 + (Math.floor(t * 2 + i) % 3) * 2, 1, 1);
      }
    }
    /* pines */
    for (i = 0; i < 9; i++) {
      hx = Math.round(W * hash(i + 200));
      if (Math.abs(hx - W * cam.eggX) < moundR() * 0.55) continue;
      hy = midY(hx) + 1;
      cx.fillStyle = rgb(mix.tree);
      var th = 5 + Math.round(hash(i + 210) * 4), r;
      for (r = 0; r < th; r++) cx.fillRect(hx - Math.floor(r * 0.6), hy - th - 1 + r, Math.floor(r * 0.6) * 2 + 1, 1);
      cx.fillRect(hx, hy - 1, 1, 2);
    }
  }

  function drawGround() {
    var x, y, h, sway;
    for (x = 0; x < W; x++) {
      y = groundY(x);
      cx.fillStyle = rgb(mix.ground);
      cx.fillRect(x, y, 1, H - y);
      cx.fillStyle = rgb(mix.grassHi);
      cx.fillRect(x, y, 1, 1);
      h = hash(x * 131 + 7);
      if (h > 0.62) {
        sway = Math.sin(t * (1.6 + mix.storm * 4) + x * 0.7) > 0.3 ? 1 : 0;
        cx.fillRect(x + sway, y - 1, 1, 1);
        if (h > 0.86) cx.fillRect(x + sway, y - 2, 1, 1);
      }
    }
    /* soil texture + flowers */
    for (x = 0; x < W; x += 1) {
      y = groundY(x);
      h = hash(x * 53 + 11);
      cx.fillStyle = rgb(mix.soil);
      if (h > 0.5) cx.fillRect(x, y + 3 + Math.floor(h * 40) % Math.max(4, H - y - 3), 2, 1);
      if (hash(x * 17 + 3) > 0.7) cx.fillRect(x, y + 6 + Math.floor(hash(x * 91) * 60) % Math.max(4, H - y - 6), 3, 1);
      if (mix.petals > 0.3 && hash(x * 211 + 5) > 0.93) {
        cx.fillStyle = ["#fff4f8", "#ffb4d0", "#ffe27a"][x % 3];
        cx.fillRect(x, y + 2 + (x % 4), 1, 1);
      }
    }
  }

  /* Rain over the whole picture: every drop has its own landing height, from
   * the top of the screen to the bottom, so it never stops part-way down. */
  function drawRain(dt) {
    if (mix.rain < 0.04) return;
    var n = Math.min(drops.length, Math.round(mix.rain * W * 0.5)), i, d, x, y, slant = 0.22 + mix.storm * 0.2, len;
    for (i = 0; i < n; i++) {
      d = drops[i];
      if (d.end == null) { d.end = hash(i * 131 + 7) * 1.06; d.y = d.end - hash(i * 17 + 5) * 0.5; }
      d.y += d.sp * dt * 1.7;
      d.x -= d.sp * dt * 1.7 * slant * (H / W);
      if (d.y >= d.end) {
        /* landed: a two-pixel splash, then a new drop somewhere else */
        cx.fillStyle = "rgba(220,234,255,0.5)";
        cx.fillRect(Math.round(d.x * W) - 1, Math.round(d.end * H), 3, 1);
        d.end = Math.random() * 1.06; d.y = d.end - 0.3 - Math.random() * 0.3; d.x = Math.random() * 1.3;
        continue;
      }
      x = Math.round(d.x * W); y = Math.round(d.y * H); len = d.sp > 1.3 ? 3 : 2;
      cx.fillStyle = d.sp > 1.3 ? "rgba(206,224,255,0.62)" : "rgba(170,196,240,0.42)";
      cx.fillRect(x, y, 1, len);
      cx.fillRect(x - 1, y + len, 1, len);
    }
  }

  function drawLightning(dt) {
    if (mix.storm > 0.5) {
      boltCd -= dt;
      if (boltCd <= 0) {
        boltCd = 1.4 + Math.random() * 2.6;
        var pts = [], bx = W * (0.15 + Math.random() * 0.7), by = baseY() * 0.12, gy = midY(Math.round(bx)) - 2;
        while (by < gy) { pts.push([bx, by]); bx += (Math.random() - 0.5) * 9; by += 3 + Math.random() * 5; }
        bolt = { pts: pts, life: 0.2 };
        flash = 0.55;
      }
    }
    if (bolt) {
      bolt.life -= dt;
      var i, a, b2, n, j;
      cx.fillStyle = "#f4fbff";
      for (i = 0; i < bolt.pts.length - 1; i++) {
        a = bolt.pts[i]; b2 = bolt.pts[i + 1];
        n = Math.max(1, Math.ceil(b2[1] - a[1]));
        for (j = 0; j < n; j++) cx.fillRect(Math.round(lerp(a[0], b2[0], j / n)), Math.round(a[1] + j), i < 3 ? 2 : 1, 1);
      }
      if (bolt.life <= 0) bolt = null;
    }
    if (flash > 0) {
      cx.fillStyle = "rgba(226,238,255," + (flash * 0.6).toFixed(2) + ")";
      cx.fillRect(0, 0, W, H);
      flash = Math.max(0, flash - dt * 2.4);
    }
  }

  function drawAmbient(dt) {
    var i, f, x, y, b = baseY(), a;
    if (mix.fire > 0.05) {
      for (i = 0; i < flies.length; i++) {
        f = flies[i];
        x = (f.x + Math.sin(t * f.sp + f.ph) * 0.05) * W;
        y = b - 6 - f.y * H * 0.2 + Math.cos(t * f.sp * 1.3 + f.ph) * 4;
        a = mix.fire * (0.5 + 0.5 * Math.sin(t * 2.2 + f.ph * 3));
        if (a < 0.2) continue;
        cx.fillStyle = "rgba(216,255,122," + a.toFixed(2) + ")";
        cx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }
    if (mix.petals > 0.05) {
      for (i = 0; i < petals.length; i++) {
        f = petals[i];
        f.x += dt * 0.03; f.y += dt * 0.022;
        if (f.x > 1.05 || f.y > 1) { f.x = -0.05 + Math.random() * 0.4; f.y = Math.random() * 0.3; }
        cx.fillStyle = ["rgba(255,196,220,", "rgba(255,244,250,", "rgba(190,236,150,"][f.c] + (0.8 * mix.petals).toFixed(2) + ")";
        cx.fillRect(Math.round(f.x * W + Math.sin(t * 1.4 + f.ph) * 5), Math.round(f.y * b), 1 + (i % 2), 1);
      }
    }
    if (mix.eclipse > 0.05) {
      for (i = 0; i < motes.length; i++) {
        f = motes[i];
        f.y -= f.sp * dt;
        if (f.y < 0) { f.y = 1; f.x = Math.random(); }
        cx.fillStyle = "rgba(255,110,90," + (0.7 * mix.eclipse * (0.4 + 0.6 * f.y)).toFixed(2) + ")";
        cx.fillRect(Math.round(f.x * W), Math.round(b * 0.25 + f.y * (H - b * 0.25)), 1, 1 + (i % 2));
      }
    }
  }

  function eggDefs() {
    var list = (D.EGGS || []).slice(), out = [], i;
    for (i = 0; i < list.length; i++) out.push({ id: list[i].id, def: list[i] });
    out.push({ id: "random", def: null });
    return out;
  }
  function eggLocked(def) {
    if (!def) return false;
    return D.eggState ? !D.eggState(def).open : false;
  }
  function eggFrameFor(id) {
    var list = D.EGGS || [], i, open = [];
    for (i = 0; i < list.length; i++) {
      if (list[i].id === id) return { frame: list[i].frame, locked: eggLocked(list[i]), def: list[i] };
      if (!eggLocked(list[i])) open.push(list[i]);
    }
    if (!open.length) open = list.slice(0, 1);
    var pick = open.length ? open[Math.floor(t / 0.55) % open.length] : null;
    return { frame: pick ? pick.frame : "egg_08", locked: false, random: id === "random", def: null };
  }

  function drawEggAndFriends(dt) {
    var ex = Math.round(W * cam.eggX), ey = groundY(ex), k = Math.round(cam.k), i, s, b, gx;
    var showId = mode === "egg" ? (viewEgg || "agumon") : ((D.getSelectedEgg && D.getSelectedEgg()) || "agumon");
    var info = eggFrameFor(showId);

    /* glow */
    var pulse = 0.75 + 0.25 * Math.sin(t * 2.4);
    var gr = Math.round(15 * k * 0.9);
    cx.fillStyle = rgb(mix.glow, (mix.glowA * 0.28 * pulse).toFixed(3)); disc(cx, ex, ey - 15 * k, gr + 8);
    cx.fillStyle = rgb(mix.glow, (mix.glowA * 0.4 * pulse).toFixed(3)); disc(cx, ex, ey - 15 * k, gr + 3);
    cx.fillStyle = rgb(mix.glow, (mix.glowA * 0.55 * pulse).toFixed(3)); disc(cx, ex, ey - 15 * k, gr - 2);

    lx.clearRect(0, 0, W, H);
    cx.fillStyle = rgb(mix.soil, 0.75);
    cx.fillRect(ex - 9 * k, ey + 1, 18 * k, 1);
    cx.fillRect(ex - 11 * k, ey + 2, 22 * k, 2);
    cx.fillRect(ex - 8 * k, ey + 4, 16 * k, 1);

    /* baby Digimon pottering around the mound */
    if (mode !== "egg" && D.sprites && D.sprites.drawPartner) {
      for (i = 0; i < babies.length; i++) {
        b = babies[i];
        var scared = mix.storm > 0.5 || mix.eclipse > 0.5;
        var wide = W >= 170;
        var home = wide ? (b.slot ? 88 : 50) : (b.slot ? -34 : 34);
        var target = scared ? (home > 0 ? 15 * k + 8 + b.slot * 14 : -(15 * k + 8)) : home + Math.sin(t * 0.23 + i * 2) * (wide ? 14 : 5);
        b.wait -= dt;
        if (b.wait <= 0) {
          if (Math.abs(target - b.x) > 2) { b.dir = target > b.x ? 1 : -1; b.x += b.dir * (scared ? 26 : 12) * dt; b.hop += dt * (scared ? 9 : 5); }
          else { b.wait = 0.8 + Math.random() * 1.6; b.hop = 0; }
        }
        gx = Math.round(ex + b.x);
        if (gx < -10 || gx > W + 10) continue;
        var hy = Math.round(Math.abs(Math.sin(b.hop)) * 3 + (scared ? Math.sin(t * 30 + i) * 0.6 : 0));
        try { D.sprites.drawPartner(lx, b.form, gx, groundY(gx) - 1 - hy, b.dir, 1, t + i, false, false, b.wait <= 0); } catch (err) {}
      }
    }

    /* tamer keeping watch */
    if (cam.tamer > 0.5 && mode !== "egg" && D.sprites && D.sprites.drawTamer && W >= 170) {
      gx = Math.round(ex - 15 * k - 30);
      try { D.sprites.drawTamer(lx, gx, groundY(gx) - 3, 1, t, false, false, false, "side", (D.getSelectedTamer && D.getSelectedTamer()) || "junior"); } catch (err2) {}
    }

    /* the egg itself, via a scratch canvas so it can be scaled and tinted */
    if (D.sprites && D.sprites.drawEgg) {
      ex2.clearRect(0, 0, 96, 96);
      ex2.save();
      ex2.translate(48, 84);
      /* the random egg flickers through shells as well as lines */
      try { D.sprites.drawEgg(ex2, info.frame, 0, 0, t, false, pokeT > 0.3 || mix.storm > 0.6, info.random ? Math.floor(t / 0.55) * 3 : undefined); } catch (err3) {}
      ex2.restore();
      ex2.clearRect(0, 87, 96, 9);
      if (info.locked) {
        ex2.globalCompositeOperation = "source-atop";
        ex2.fillStyle = "#10182c";
        ex2.fillRect(0, 0, 96, 96);
        ex2.globalCompositeOperation = "source-over";
      }
      /* poke: hop + wobble */
      if (pokeT > 0) {
        pokeT = Math.max(0, pokeT - dt * 1.5);
        hopV += -260 * dt; hopY += hopV * dt;
        if (hopY < 0) { hopY = 0; hopV = 0; }
      }
      var wob = Math.sin(pokeT * 24) * 0.3 * pokeT + Math.sin(t * 1.1) * 0.03;
      lx.save();
      lx.translate(ex, ey + 3 - Math.round(hopY));
      lx.rotate(wob);
      lx.drawImage(eggTmp, 0, 0, 96, 96, -48 * k, -84 * k, 96 * k, 96 * k);
      lx.restore();
      if (info.locked) {
        /* padlock */
        lx.fillStyle = "#c9d4ea";
        lx.fillRect(ex - 4, ey - 15 * k - 2, 9, 7);
        lx.fillRect(ex - 3, ey - 15 * k - 6, 1, 4); lx.fillRect(ex + 3, ey - 15 * k - 6, 1, 4); lx.fillRect(ex - 2, ey - 15 * k - 7, 5, 1);
        lx.fillStyle = "#10182c"; lx.fillRect(ex, ey - 15 * k, 1, 3);
      }
      if (info.random) drawText(lx, "?", ex - 5, ey - 30 * k - 18 - Math.round(Math.sin(t * 3) * 2), 2, "#ffe27a");
    }

    /* tint the sprite layer toward the light of the sky, then composite */
    var ta = clamp(mix.tintA + flash * 0.5, 0, 0.8);
    if (ta > 0.01) {
      lx.globalCompositeOperation = "source-atop";
      lx.fillStyle = flash > 0.05 ? "rgba(230,240,255," + ta.toFixed(2) + ")" : rgb(mix.tint, ta.toFixed(2));
      lx.fillRect(0, 0, W, H);
      lx.globalCompositeOperation = "source-over";
    }
    cx.drawImage(layer, 0, 0);

    /* sparkles rising off the shell */
    if (!info.locked && Math.random() < dt * (pokeT > 0 ? 40 : 5)) {
      sparks.push({ x: ex + (Math.random() - 0.5) * 22 * k, y: ey - Math.random() * 30 * k, vy: -(8 + Math.random() * 14), life: 1, c: Math.floor(Math.random() * 3) });
    }
    for (i = sparks.length - 1; i >= 0; i--) {
      s = sparks[i];
      s.y += s.vy * dt; s.life -= dt * 0.9;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      cx.fillStyle = ["rgba(255,255,255,", "rgba(124,240,255,", "rgba(255,226,122,"][s.c] + clamp(s.life, 0, 1).toFixed(2) + ")";
      cx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
      if (s.life > 0.6) { cx.fillRect(Math.round(s.x) - 1, Math.round(s.y), 3, 1); cx.fillRect(Math.round(s.x), Math.round(s.y) - 1, 1, 3); }
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    var st = D.getState ? D.getState() : "title";
    var want = (st === "title" || st === "tamer" || st === "egg" || st === "lobby" || st === "join" || st === "bank" || st === "cosmetics") ? st : (st === "setup" ? "tamer" : st === "lab" ? "cosmetics" : "off");
    if (want !== mode) setMode(want);
    if (mode === "off" || !cx) { lastNow = now; return; }
    var dt = lastNow ? (now - lastNow) / 1000 : 0.016;
    lastNow = now;
    if (dt > 0.1) dt = 0.1;
    t += dt;
    phaseT += dt;
    if (phaseT >= HOLD + FADE) { phaseT = 0; phaseIdx = (phaseIdx + 1) % PHASES.length; }
    blend();
    var ease = Math.min(1, dt * 6);
    cam.eggX = lerp(cam.eggX, camTo.eggX, ease);
    cam.base = lerp(cam.base, camTo.base, ease);
    cam.k = Math.abs(cam.k - camTo.k) < 0.03 ? camTo.k : lerp(cam.k, camTo.k, ease);
    cam.tamer = camTo.tamer;
    if (mode === "egg") { aim(false); syncEggPick(); }

    drawSky();
    drawStars();
    drawSunMoon();
    drawMeteors(dt);
    drawClouds(dt);
    drawLand();
    drawGround();
    drawEggAndFriends(dt);
    drawAmbient(dt);
    drawRain(dt);
    drawLightning(dt);

    if (mix.label !== lastLabel) {
      lastLabel = mix.label;
      if (ui.sky) {
        ui.sky.setAttribute("data-px", mix.label);
        ui.sky.parentNode.setAttribute("data-sky", mix.id);
        ui.sky.removeAttribute("aria-label");
        stampLabels(ui.sky.parentNode);
      }
    }
  }

  function setMode(m) {
    mode = m;
    if (cv) cv.classList.toggle("is-on", m !== "off");
    document.body.setAttribute("data-menu", m);
    if (m === "off") return;
    aim(false);
    if (m === "egg") { buildEggPick(); syncEggPick(true); }
    /* labels are measured from CSS, so stamp once the screen is visible */
    setTimeout(function () { stampLabels(document); aim(false); }, 0);
  }

  function poke(quiet) {
    pokeT = 1; hopV = 78; hopY = 0.01;
    if (!quiet && D.uiSfx) D.uiSfx("ui");
  }

  /* ------------------------------------------------------------------ */
  /* Egg pick: one egg on the hill, arrows / swipe / keys to change it   */
  /* ------------------------------------------------------------------ */
  function buildEggPick() {
    var panel = $("egg-panel");
    if (!panel || $("egg-stage")) return;
    var wrap = document.createElement("div");
    wrap.id = "egg-pick";
    wrap.innerHTML =
      '<button type="button" class="egg-nav" id="egg-prev" aria-label="Previous egg"><span data-px="<"></span></button>' +
      '<div id="egg-stage" role="button" aria-label="Poke the egg"></div>' +
      '<button type="button" class="egg-nav" id="egg-next" aria-label="Next egg"><span data-px=">"></span></button>';
    var plate = document.createElement("div");
    plate.id = "egg-plate";
    plate.innerHTML = '<div id="egg-plate-name" data-px="AGUMON LINE"></div><p id="egg-plate-blurb"></p><div id="egg-dots"></div>';
    var row = $("egg-row");
    panel.insertBefore(wrap, row);
    panel.insertBefore(plate, row);
    $("egg-prev").addEventListener("click", function () { stepEgg(-1); });
    $("egg-next").addEventListener("click", function () { stepEgg(1); });
    var stage = $("egg-stage"), sx = null;
    stage.addEventListener("pointerdown", function (e) { sx = e.clientX; });
    stage.addEventListener("pointerup", function (e) {
      if (sx != null && Math.abs(e.clientX - sx) > 36) stepEgg(e.clientX < sx ? 1 : -1);
      else poke();
      sx = null;
    });
  }

  function stepEgg(dir) {
    eggList = eggDefs();
    var i, at = 0;
    for (i = 0; i < eggList.length; i++) if (eggList[i].id === viewEgg) at = i;
    at = (at + dir + eggList.length) % eggList.length;
    showEgg(eggList[at].id, true);
  }

  function showEgg(id, pick) {
    viewEgg = id;
    var info = eggFrameFor(id);
    /* flipping to an egg (or tapping it again) shuffles its shell pattern */
    if (!info.random && !info.locked && D.sprites && D.sprites.rollEggPattern) D.sprites.rollEggPattern(info.frame);
    poke(true);
    if (pick && !info.locked) {
      /* Let the game's own card handler select + save the choice. */
      var card = document.querySelector('#egg-row .egg-card[data-id="' + id + '"]');
      if (card) card.click();
      lastSelEgg = id;
    } else if (D.uiSfx) D.uiSfx("ui");
    paintEggPlate();
  }

  function paintEggPlate() {
    var info = eggFrameFor(viewEgg), def = info.def;
    var name = $("egg-plate-name"), blurb = $("egg-plate-blurb"), dots = $("egg-dots"), start = $("btn-egg-start");
    eggList = eggDefs();
    if (name) {
      name.setAttribute("data-px", info.locked ? "LOCKED EGG" : (viewEgg === "random" ? "RANDOM EGG" : ((def && def.name) || viewEgg)));
      name.removeAttribute("aria-label");
    }
    if (blurb) {
      if (info.locked) {
        var es = D.eggState ? D.eggState(def) : null;
        blurb.textContent = "Locked. Raise one to Rookie in the Hatchery to open this line." + (DBH.hatchery && def ? " It comes from " + (/^[aeiou]/i.test(DBH.hatchery.rules.tierDef(DBH.hatchery.rules.tierOf(def.id)).name) ? "an " : "a ") + DBH.hatchery.rules.tierDef(DBH.hatchery.rules.tierOf(def.id)).name.toLowerCase() + " egg." : "");
      }
      else if (viewEgg === "random") blurb.textContent = "A surprise: any egg in the game, even ones you haven't opened.";
      else blurb.textContent = (def && def.blurb) || "";
    }
    if (dots) {
      var html = "", i;
      for (i = 0; i < eggList.length; i++) html += '<i class="' + (eggList[i].id === viewEgg ? "is-on" : "") + (eggLocked(eggList[i].def) ? " is-locked" : "") + '"></i>';
      dots.innerHTML = html;
    }
    if (start) start.disabled = !!info.locked;
    var plate = $("egg-plate");
    if (plate) plate.classList.toggle("is-locked", !!info.locked);
    stampLabels($("egg-panel"));
  }

  function syncEggPick(force) {
    var sel = (D.getSelectedEgg && D.getSelectedEgg()) || "agumon";
    if (force) { viewEgg = sel; lastSelEgg = sel; paintEggPlate(); return; }
    /* keyboard / gamepad moved the game's own selection */
    if (sel !== lastSelEgg) { lastSelEgg = sel; viewEgg = sel; poke(true); paintEggPlate(); }
  }

  /* ------------------------------------------------------------------ */
  /* Logo                                                                */
  /* ------------------------------------------------------------------ */
  function paintLogo(logo) {
    if (!logo) return false;
    /* DIGI in sun gold, NIGHT in moonlight, a crescent and a few stars over the T */
    var px = 8, pad = 8, gap = px * 3, top = 22;
    var w1 = textWidth("DIGI", px), w2 = textWidth("NIGHT", px);
    /* on a narrow screen the two words stack, so the name sits clear of the profile chip */
    var stack = typeof window !== "undefined" && window.innerWidth < 620;
    var w = (stack ? Math.max(w1, w2) : w1 + gap + w2) + pad * 2 + px * 2, h = top + 7 * px * (stack ? 2 : 1) + (stack ? 12 : 0) + pad * 2;
    logo.classList.toggle("is-stacked", stack);
    logo.width = w; logo.height = h;
    var c = logo.getContext("2d");
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, w, h);
    function word(txt, x, y, cols) {
      drawText(c, txt, x + px, y + px, px, cols[0]);
      drawText(c, txt, x + px / 2, y + px / 2, px, cols[1]);
      drawText(c, txt, x, y, px, cols[2]);
      c.save(); c.beginPath(); c.rect(0, y, w, px * 3); c.clip(); drawText(c, txt, x, y, px, cols[3]); c.restore();
      c.save(); c.beginPath(); c.rect(0, y, w, px); c.clip(); drawText(c, txt, x, y, px, cols[4]); c.restore();
    }
    var x1 = pad, y1 = top, x2 = stack ? pad : x1 + w1 + gap, y2 = stack ? top + 7 * px + 12 : top;
    word("DIGI", x1, y1, ["#2a0f04", "#7a3208", "#f6b21a", "#ffe36a", "#fff6c4"]);
    word("NIGHT", x2, y2, ["#06061c", "#1c1c58", "#7f96f4", "#b4c6ff", "#eef2ff"]);
    /* crescent moon, in 4-pixel blocks */
    var mx = stack ? x1 + w1 + px * 2 : x2 + w2 - px * 2, my = stack ? 26 : 2, u = 4, rows = ["..###.", ".##...", "##....", "##....", ".##...", "..###."], r, q;
    for (r = 0; r < rows.length; r++) for (q = 0; q < rows[r].length; q++) if (rows[r].charAt(q) === "#") {
      c.fillStyle = "#1c1c58"; c.fillRect(mx + q * u + 2, my + r * u + 2, u, u);
    }
    for (r = 0; r < rows.length; r++) for (q = 0; q < rows[r].length; q++) if (rows[r].charAt(q) === "#") {
      c.fillStyle = r < 2 ? "#fffbe0" : "#ffe9a0"; c.fillRect(mx + q * u, my + r * u, u, u);
    }
    c.fillStyle = "#eef2ff";
    if (stack) { c.fillRect(mx + u * 8, my - 10, 4, 4); c.fillRect(mx + u * 9, my + u * 5, 2, 2); c.fillRect(mx - 6, my - 14, 2, 2); }
    else { c.fillRect(x2 + px * 2, 6, 4, 4); c.fillRect(x2 + px * 11, 12, 2, 2); c.fillRect(x2 + px * 17, 3, 2, 2); c.fillRect(mx + u * 7, my + u * 3, 4, 4); }
    c.fillStyle = "#ffe36a"; c.fillRect(x1 + px * 9, 9, 2, 2);
    return true;
  }

  /* ------------------------------------------------------------------ */
  function init() {
    cv = $("title-scene");
    if (!cv) return;
    cx = cv.getContext("2d");
    layer = document.createElement("canvas");
    lx = layer.getContext("2d");
    eggTmp = document.createElement("canvas");
    eggTmp.width = 96; eggTmp.height = 96;
    ex2 = eggTmp.getContext("2d");
    ex2.imageSmoothingEnabled = false;
    ui.sky = $("title-sky-name");
    seedScene();
    blend();
    resize();
    window.addEventListener("resize", resize);
    /* tap the egg on the title to make it hop */
    var ts = $("title-screen");
    if (ts) ts.addEventListener("pointerdown", function (e) {
      if (e.target.closest && e.target.closest("button, a, input, #help-box, .party-option")) return;
      var ex = W * cam.eggX * S, ey = (groundY(Math.round(W * cam.eggX)) - 15 * cam.k) * S;
      if (Math.abs(e.clientX - ex) < 24 * cam.k * S && Math.abs(e.clientY - ey) < 26 * cam.k * S) poke();
    });
    var hc = $("btn-help-close");
    if (hc) hc.addEventListener("click", function () { var b = $("btn-help"); if (b) b.click(); });
    stampLabels(document);
    raf = requestAnimationFrame(frame);
  }

  D.titleScene = {
    paintLogo: paintLogo,
    poke: poke,
    /* the sky over the title screen right now ("day", "night", "rain", ...): the Hatchery reads it */
    phase: function () { return PHASES[phaseIdx] ? PHASES[phaseIdx].id : null; },
    restamp: function () { stampLabels(document); },
    /* the egg grid (egg-grid.js) picked one: show it on the hill */
    syncEgg: function () { if (mode === "egg") syncEggPick(true); },
    /* true while a locked egg is on show, so Start does nothing */
    blockStart: function () { return mode === "egg" && !!eggFrameFor(viewEgg || "agumon").locked; },
    setPhase: function (id) {
      var i;
      for (i = 0; i < PHASES.length; i++) if (PHASES[i].id === id) { phaseIdx = i; phaseT = 0; }
    },
    phases: function () { return PHASES.map(function (p) { return p.id; }); }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window);
