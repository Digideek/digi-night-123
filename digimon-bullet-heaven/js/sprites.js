/* Digimon Bullet Heaven — official Digimon UP sprites, Digimon World 3 tamer sprites, original UI/tiles. */
(function (global) {
  "use strict";

  /* 3x baked pixels. Lighting comes from the upper-left (highlights H/W, shadows o/n/s). */
  var SCALE = 3;

  var C = {
    K: "#1a1230",
    W: "#fff8f0",
    H: "#ffe9b8",
    C: "#f0d090",
    Y: "#f0c020",
    I: "#f8e060",
    O: "#f07818",
    o: "#c05810",
    N: "#6a3818",
    n: "#3a1e10",
    E: "#2a7a30",
    R: "#e03038",
    B: "#3a88e0",
    b: "#1a4068",
    S: "#c0c8d4",
    s: "#5a6878",
    P: "#8a58c0",
    p: "#4a2868",
    M: "#f070b0",
    T: "#34c8c0",
    t: "#145860",
    L: "#b8e048",
    A: "#8a8498",
    G: "#3cb868",
    g: "#1c5840",
    D: "#d06030",
    X: "#ff6030",
    F: "#ffd080",
    U: "#6ad0ff",
    u: "#1a5888",
    Q: "#9a70e0",
    q: "#3a1860",
    Z: "#204050",
    z: "#0c2030",
    J: "#2a6a58",
    j: "#16382e",
    V: "#5a90ff",
    a: "#c87020",
    c: "#4ec8c0",
    d: "#7a5a34",
    e: "#c4a878",
    f: "#6f9a48",
    h: "#2f5422",
    i: "#4e7c34",
    k: "#3a2a1c",
    l: "#8ab058",
    m: "#4a3218",
    r: "#b08950",
    v: "#163e4c",
    w: "#2a6a72",
    x: "#9af0ea",
    y: "#c4b080"
  };

  var sheets = {};
  var icons = {};
  var tiles = {};
  var decorSheets = {};
  var itemSheets = {};
  var fontSheets = {};

  var official = {};
  var officialReady = false;
  var OFFICIAL_MANIFEST = {agumon:{idle:13,walk:13,scale:1,fps:16,bodyH:54},greymon:{idle:13,walk:13,scale:1,fps:16,bodyH:64},metalgreymon:{idle:16,walk:13,scale:1,fps:16,bodyH:86},wargreymon:{idle:13,walk:13,scale:1,fps:16,bodyH:90},numemon:{idle:19,walk:13,scale:1,fps:16,bodyH:60},gabumon:{idle:13,walk:13,scale:1,fps:16,bodyH:57},garurumon:{idle:13,walk:13,scale:1,fps:16,bodyH:62},weregarurumon:{idle:13,walk:13,scale:1,fps:16,bodyH:86},metalgarurumon:{idle:13,walk:9,scale:1,fps:16,bodyH:76},pagumon:{idle:16,walk:13,scale:1,fps:16,bodyH:37},kuwagamon:{idle:13,walk:10,scale:1,fps:16,bodyH:105},botamon:{idle:13,walk:14,scale:1,fps:16,bodyH:32},koromon:{idle:13,walk:9,scale:1,fps:16,bodyH:39},tsunomon:{idle:13,walk:13,scale:1,fps:16,bodyH:48},gazimon:{idle:19,walk:19,scale:1,fps:16,bodyH:60},demidevimon:{idle:19,walk:13,scale:1,fps:16,bodyH:58},punimon:{idle:13,walk:13,scale:1,fps:16,bodyH:36}};

  /* Target on-screen height in pixels vs the 40×56 tamer. Baby / In-Training stay about a third to half as tall; Rookies about the tamer's height or a little shorter; Champions and up scale larger than the tamer. Digimon UP natives are smaller than the old Story battle sheets, so Champions+ are scaled up rather than left at 1×. */
  /* Filled on demand from DBH.stageHeight (species-catalog.js: STAGE_SIZE and SHOW_SIZE). */
  var HEIGHT_TARGETS = {};
  var OLD_TARGETS = { botamon: 24, punimon: 24, koromon: 26, tsunomon: 26, pagumon: 26, agumon: 54, gabumon: 54, gazimon: 52, demidevimon: 54, numemon: 72,
    greymon: 88, garurumon: 84, kuwagamon: 110, weregarurumon: 100, metalgreymon: 108, wargreymon: 112, metalgarurumon: 108 };
  var TAMER_NATIVE_H = 56;
  /* Story-battle native heights the SPECIES / ENEMY radii were authored against. Hitboxes scale with visual height vs these. */
  var REF_HEIGHT = {
    botamon: 33, punimon: 24, koromon: 31, tsunomon: 48, pagumon: 29,
    agumon: 65, gabumon: 79, gazimon: 56, demidevimon: 63,
    numemon: 73, greymon: 117, garurumon: 102, kuwagamon: 113,
    weregarurumon: 113, metalgreymon: 133, wargreymon: 121, metalgarurumon: 129
  };

  var viewW = 1280, viewH = 720;

  function setViewSize(w, h) {
    viewW = w;
    viewH = h;
  }

  function manifestScale(id) {
    return (official[id] && official[id].scale) || (OFFICIAL_MANIFEST[id] && OFFICIAL_MANIFEST[id].scale) || 1;
  }

  function pickOfficialScale(id) {
    ensureHeight(id);
    var src = official[id] && official[id].idle && official[id].idle[0];
    var meta = OFFICIAL_MANIFEST[id] || {};
    var nativeH = (official[id] && official[id].bodyH) || meta.bodyH || (src ? src.height : 64);
    var nativeW = src ? src.width : 64;
    var target = HEIGHT_TARGETS[id];
    var base;
    if (target) {
      base = target / nativeH;
      /* Pagumon is a wide loaf; cap width so a half-height body does not outspan the tamer. */
      if (id === "pagumon" && nativeW * base > TAMER_NATIVE_H * 1.15) {
        base = (TAMER_NATIVE_H * 1.15) / nativeW;
      }
    } else {
      base = manifestScale(id) || 1;
    }
    if (!src) return base;
    /* On phones, keep large forms (Kuwagamon, MetalGreymon) from swallowing the viewport. */
    if (Math.max(nativeW, nativeH) < 90) return base;
    var cap = Math.max(72, Math.floor(Math.min(viewW, viewH) * 0.32));
    var dw = nativeW * base;
    var dh = nativeH * base;
    if (dw <= cap && dh <= cap * 1.2) return base;
    var s = base * Math.min(cap / dw, (cap * 1.2) / dh);
    if (s < 0.5) s = 0.5;
    return s;
  }

  function officialScale(id) {
    return pickOfficialScale(id);
  }

  function officialNativeSize(id) {
    var src = official[id] && official[id].idle && official[id].idle[0];
    return src ? { w: src.width, h: src.height } : { w: 64, h: 64 };
  }

  function visualHeight(id) {
    var meta = OFFICIAL_MANIFEST[id] || {};
    var bodyH = (official[id] && official[id].bodyH) || meta.bodyH || officialNativeSize(id).h;
    return bodyH * pickOfficialScale(id);
  }

  function bodyRadius(id, base) {
    if (base == null || base <= 0) base = 12;
    var vis = visualHeight(id);
    var ref = REF_HEIGHT[id] || vis || 64;
    return Math.max(6, Math.round(base * vis / ref));
  }

  function officialDrawScale(id, scale) {
    var base = pickOfficialScale(id);
    if (scale == null || scale <= 1.05) return base;
    var src = official[id] && official[id].idle && official[id].idle[0];
    var h = (src ? src.height : 64) * base;
    var maxH = scale > 1.8 ? 140 : 170;
    var mul = Math.min(scale, 2.2);
    if (h * mul > maxH) mul = maxH / h;
    return base * mul;
  }

  function flashCanvas(src) {
    var m = makeCanvas(src.width, src.height);
    m.ctx.drawImage(src, 0, 0);
    m.ctx.globalCompositeOperation = "source-atop";
    m.ctx.fillStyle = "rgba(255, 248, 240, 0.7)";
    m.ctx.fillRect(0, 0, src.width, src.height);
    return m.canvas;
  }

  /* a sprite washed in one colour (an infected Digimon is purple): made once per frame image */
  var TINTS = { virus: { wash: "rgba(126, 34, 206, 0.26)", dark: "rgba(36, 0, 72, 0.14)" } };
  var tintCache = typeof Map !== "undefined" ? new Map() : null;
  function tintCanvas(src, name) {
    var T = TINTS[name], per, out, m;
    if (!T || !tintCache || !src || !src.width) return src;
    per = tintCache.get(src);
    if (!per) { per = {}; tintCache.set(src, per); }
    out = per[name];
    if (!out) {
      m = makeCanvas(src.width, src.height);
      m.ctx.drawImage(src, 0, 0);
      m.ctx.globalCompositeOperation = "source-atop";
      m.ctx.fillStyle = T.dark; m.ctx.fillRect(0, 0, src.width, src.height);
      m.ctx.fillStyle = T.wash; m.ctx.fillRect(0, 0, src.width, src.height);
      out = per[name] = m.canvas;
    }
    return out;
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error("Failed to load " + src)); };
      img.src = src;
    });
  }

  function canvasFromImage(img) {
    var m = makeCanvas(img.width, img.height);
    m.ctx.drawImage(img, 0, 0);
    return m.canvas;
  }

  var atlasIndex = global.UP_ATLAS_INDEX || {};
  var atlasLoading = {};
  var preloadQueue = [];
  var preloadActive = 0;
  var PRELOAD_CONCUR = 3;

  function ensureHeight(id) {
    if (HEIGHT_TARGETS[id]) return HEIGHT_TARGETS[id];
    var h = 54;
    if (global.DBH && typeof global.DBH.stageHeight === "function") h = global.DBH.stageHeight(id) || 54;
    HEIGHT_TARGETS[id] = h;
    /* the hand-authored hitboxes were tuned against the old heights: keep them the size they were */
    if (REF_HEIGHT[id] && OLD_TARGETS[id]) { REF_HEIGHT[id] = REF_HEIGHT[id] * h / OLD_TARGETS[id]; OLD_TARGETS[id] = 0; }
    if (!REF_HEIGHT[id]) REF_HEIGHT[id] = h;
    return h;
  }

  function atlasRec(id) {
    return (id && atlasIndex[id]) || null;
  }

  function sliceAtlas(id, img, rec) {
    var gap = rec.gap == null ? 1 : rec.gap;
    var fw = rec.w, fh = rec.h, cols = rec.cols || Math.max(1, (rec.idle || 0) + (rec.walk || 0));
    var meta0 = OFFICIAL_MANIFEST[id] || {};
    function frameAt(i) {
      var col = i % cols, row = Math.floor(i / cols);
      var sx = col * (fw + gap), sy = row * (fh + gap);
      var m = makeCanvas(fw, fh);
      m.ctx.imageSmoothingEnabled = false;
      m.ctx.drawImage(img, sx, sy, fw, fh, 0, 0, fw, fh);
      return m.canvas;
    }
    var off = official[id] || (official[id] = { scale: 1, fps: rec.fps || 16, bodyH: 0, idle: [], walk: [], ready: false });
    var i, nIdle = rec.idle || 0, nWalk = rec.walk || 0;
    off.idle = [];
    for (i = 0; i < nIdle; i++) off.idle[i] = frameAt(i);
    off.walk = [];
    for (i = 0; i < nWalk; i++) off.walk[i] = frameAt(nIdle + i);
    if (!off.walk.length) off.walk = off.idle.slice();
    if (!off.idle.length && off.walk.length) off.idle = off.walk.slice();
    off.bodyH = meta0.bodyH || off.bodyH || fh;
    off.fps = rec.fps || meta0.fps || 16;
    off.scale = meta0.scale || 1;
    off.ready = !!(off.idle[0]);
    ensureHeight(id);
    return off.ready;
  }

  function loadAtlas(id) {
    if (!id) return Promise.resolve(false);
    if (official[id] && official[id].ready) return Promise.resolve(true);
    if (atlasLoading[id]) return atlasLoading[id];
    var rec = atlasRec(id);
    if (!rec) {
      official[id] = official[id] || { scale: 1, fps: 0, bodyH: 0, idle: [], walk: [], ready: false };
      return Promise.resolve(false);
    }
    official[id] = official[id] || { scale: 1, fps: rec.fps || 16, bodyH: 0, idle: [], walk: [], ready: false };
    ensureHeight(id);
    atlasLoading[id] = loadImage(rec.image).then(function (img) {
      sliceAtlas(id, img, rec);
      return !!(official[id] && official[id].ready);
    }).catch(function (err) {
      console.warn("Atlas load failed:", id, err && err.message ? err.message : err);
      delete atlasLoading[id];
      return false;
    });
    return atlasLoading[id];
  }

  function pumpPreload() {
    while (preloadActive < PRELOAD_CONCUR && preloadQueue.length) {
      (function (sid) {
        preloadActive += 1;
        loadAtlas(sid).then(function () {
          preloadActive -= 1;
          pumpPreload();
        }, function () {
          preloadActive -= 1;
          pumpPreload();
        });
      })(preloadQueue.shift());
    }
  }

  function preloadSpecies(ids, front) {
    var i, id;
    if (!ids) return;
    if (typeof ids === "string") ids = [ids];
    for (i = 0; i < ids.length; i++) {
      id = ids[i];
      if (!id || (official[id] && official[id].ready) || atlasLoading[id]) continue;
      if (preloadQueue.indexOf(id) !== -1) continue;
      if (front) preloadQueue.unshift(id);
      else preloadQueue.push(id);
    }
    pumpPreload();
  }

  function speciesReady(id) {
    return !!(official[id] && official[id].ready && official[id].idle && official[id].idle[0]);
  }

  function loadOfficialSprites() {
    /* Fast boot: register nothing heavy. Per-species atlases load lazily. */
    officialReady = true;
    return Promise.resolve(true);
  }


  function makeCanvas(w, h) {
    var c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    var ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    return { canvas: c, ctx: ctx };
  }

  function bake(rows, flash) {
    var h = rows.length, w = rows[0].length, y, x, ch, col, i, j;
    for (y = 0; y < h; y++) {
      if (rows[y].length !== w) throw new Error("Jagged sprite row " + y + " (" + rows[y].length + " vs " + w + ")");
    }
    var m = makeCanvas(w * SCALE, h * SCALE);
    var ctx = m.ctx;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        ch = rows[y].charAt(x);
        if (ch === "." || ch === " ") continue;
        col = C[ch];
        if (!col) continue;
        if (flash && ch !== "K") col = ch === "n" || ch === "s" || ch === "p" || ch === "b" ? "#f0e0c8" : "#fff8f0";
        ctx.fillStyle = col;
        ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
      }
    }
    return m.canvas;
  }

  function bakePixels(w, h, fn) {
    var m = makeCanvas(w * SCALE, h * SCALE);
    var ctx = m.ctx, x, y, col;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        col = fn(x, y);
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
      }
    }
    return m.canvas;
  }

  function bakePair(rows) {
    return { norm: bake(rows, false), flash: bake(rows, true), w: rows[0].length, h: rows.length };
  }

  function blit(ctx, canvas, x, y, facing, sx, sy) {
    if (!canvas) return;
    var w = canvas.width, h = canvas.height;
    sx = sx || 1;
    sy = sy || 1;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale((facing < 0 ? -1 : 1) * sx, sy);
    ctx.drawImage(canvas, Math.round(-w / 2), Math.round(-h + 6), w, h);
    ctx.restore();
  }

  function shadow(ctx, x, y, spread, alpha) {
    var s = spread || 1;
    ctx.save();
    ctx.fillStyle = "rgba(12,8,16," + (alpha || 0.32) + ")";
    ctx.beginPath();
    /* Offset down-right so the key light reads from the top-left. */
    ctx.ellipse(Math.round(x) + Math.round(3.2 * s), Math.round(y) + 3, 11 * s, 3.6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* ---------- Tiles (16x16) ---------- */
  var TILE_GRASS_A = [
    "jjjjjJjjjjjJjjjj",
    "jjJjjjjjjgjjjjjj",
    "jjjjjjjJjjjjjJjj",
    "jJjjgjjjjjjjjjjj",
    "jjjjjjjjjJjjjjjj",
    "jjjjjJjjjjjjgjjj",
    "jJjjjjjjjjjjjjJj",
    "jjjjjjjgjjjJjjjj",
    "jjjJjjjjjjjjjjjj",
    "jjjjjjjJjjgjjjjj",
    "jJjjjjjjjjjjjJjj",
    "jjjjgjjjjjJjjjjj",
    "jjjjjjjjjjjjjjjj",
    "jjjJjjjjgjjjjjJj",
    "jjjjjjjjjjjJjjjj",
    "jJjjjjjjjjjjjjjj"
  ];
  var TILE_GRASS_B = [
    "jjjJjjjjjjjjjJjj",
    "jjjjjjgjjjJjjjjj",
    "jJjjjjjjjjjjjjjj",
    "jjjjjJjjjjjjgjjj",
    "jjjjjjjjjJjjjjJj",
    "jjgjjjjjjjjjjjjj",
    "jjjjjjJjjjjjjjjj",
    "jJjjjjjjjjgjjjJj",
    "jjjjjjjjJjjjjjjj",
    "jjjjgjjjjjjjjjjj",
    "jjjJjjjjjjjjJjjj",
    "jjjjjjjjgjjjjjjj",
    "jJjjjjjjjjjjjjjj",
    "jjjjjjJjjjjgjjjj",
    "jjgjjjjjjjJjjjjj",
    "jjjjjjjjjjjjjJjj"
  ];
  var TILE_DIRT = [
    "aaaaaaaaaaaaaaaa",
    "aaCaaaaaaaaaNaaa",
    "aaaaaaaaaaaaaaaa",
    "aaaaaNaaaaCaaaaa",
    "aaaaaaaaaaaaaaaa",
    "aaCaaaaaaaaaaaaa",
    "aaaaaaaaaNaaaaaa",
    "aaaaaaaaaaaaaaaa",
    "aaaaaCaaaaaaaaaa",
    "aaaaaaaaaaaaCaaa",
    "aNaaaaaaaaaaaaaa",
    "aaaaaaaaaaaaaaaa",
    "aaaaaaaCaaaaNaaa",
    "aaaaaaaaaaaaaaaa",
    "aaNaaaaaaaaaaaaa",
    "aaaaaaaaaNaaaaaa"
  ];
  var TILE_RAISED = [
    "JJJJJJGJJJJJGJJJ",
    "Jjjjjjjjjgjjjjjj",
    "jjJjjjjjjjjjJjjj",
    "jjjjjjGjjjjjjjjj",
    "jjjgjjjjjjJjjjjj",
    "jjJjjjjjjjjjjjjj",
    "jjjjjjjJjjgjjjjj",
    "jjjgjjjjjjjjjJjj",
    "jjJjjjjjjJjjjjjj",
    "jjjjjjGjjjjjjjjj",
    "jjjjjjjjjjjgjjjj",
    "jjJjjjjjjjjjjJjj",
    "jjjgjjjjjJjjjjjj",
    "jjjjjjjjjjjjjjjj",
    "jggjjgjjjgjjjggj",
    "nnnnnnnnnnnnnnnn"
  ];

  var TREE = [
    ".......KK.......",
    "......KlLK......",
    ".....KlGLGK.....",
    "....KLGLGLGK....",
    "....KGLGLGLK....",
    "...KLGLGLGLGK...",
    "...KGLLfGLGLK...",
    "..KLGLGLGLGLGK..",
    "..KGLGGLGGGLGK..",
    "..KLGLGLGLGLK...",
    "...KGLGGLGLGK...",
    "...KGGLLGGLK....",
    "....KGGNNGK.....",
    ".....KNNnNK.....",
    ".....KNnnK......",
    ".....KNnnK......",
    ".....KNnNK......",
    ".....KNnnK......",
    "......KNK.......",
    "......KNK.......",
    "......KKK.......",
    "................"
  ];
  var ROCK = [
    "................",
    "................",
    "......KKKK......",
    "....KKyAeAK.....",
    "...KAyWHAeAK....",
    "...KeAAHASeAK...",
    "..KAyAHAASSAK...",
    "..KeAAAAASsAK...",
    "..KAASAASssAK...",
    "...KeAASsskK....",
    "....KAssskK.....",
    ".....KKKKK......",
    "................",
    "................",
    "................",
    "................"
  ];
  var SHRINE = [
    ".......KK.......",
    "......KTTK......",
    "......KTUK......",
    ".....KKTUKK.....",
    "....KssSSssK....",
    "...KsSUTHUSK....",
    "...KsSTcTTSsK...",
    "....KsSUUSsK....",
    "....KKsSSsKK....",
    "....KzzzzzzK....",
    "...KzTTcZTTzK...",
    "...KzZZttZZzK...",
    "...KzZcZZcZzK...",
    "...KzzzzzzzzK...",
    "....KKzzzzKK....",
    ".....KNnnNK.....",
    "......KNK.......",
    "......KKK......."
  ];
  var FLOWER = [
    "........",
    "..KRK...",
    ".KRYRK..",
    "..KEK...",
    "...E....",
    "...E....",
    "........",
    "........"
  ];
  var FLOWER2 = [
    "........",
    "...M....",
    "..MWM...",
    "..MWWM..",
    "...G....",
    "...g....",
    "........",
    "........"
  ];
  var TALLGRASS = [
    "............",
    "...L........",
    "..LE.L......",
    "..E.LE.L....",
    ".LE.E.LE....",
    ".E.LE.E.L...",
    "LE.E.LE.E...",
    "E.LE.E.LE...",
    ".E.E.LE.E...",
    ".LE.E.E.....",
    "..gEg.E.....",
    "...g.g......",
    "....g.......",
    "............",
    "............",
    "............"
  ];
  var MONOLITH = [
    "....KKKK....",
    "...KSccSK...",
    "...KcUUcK...",
    "...KsTTsK...",
    "...KsccSK...",
    "..KKsSSsKK..",
    "..KzzzzzzK..",
    "..KzTcTTzK..",
    "..KzZttZzK..",
    "..KzZccZzK..",
    "..KzZttZzK..",
    "..KzTcTTzK..",
    "..KzzzzzzK..",
    "..KzZccZzK..",
    "..KzZttZzK..",
    "..KzTcTTzK..",
    "..KzzzzzzK..",
    "..KKZZZKKK..",
    "...KNnnNK...",
    "...KNnnK....",
    "....KNK.....",
    "....KKK.....",
    "............",
    "............"
  ];

  var XP0 = [
    "...KKK...",
    "..KTTTK..",
    ".KTWHTTK.",
    "KTWWUTTTK",
    "KTWUUTTtK",
    "KTTUTTttK",
    ".KTTtttK.",
    "..KTttK..",
    "...KKK..."
  ];
  var XP1 = [
    "...KKK...",
    "..KTUTK..",
    ".KTHWTTK.",
    "KTWWUUTTK",
    "KTWUUTTtK",
    "KTUTTTttK",
    ".KTTTttK.",
    "..KTtTK..",
    "...KKK..."
  ];
  var MEAT = [
    "..KKK.....",
    ".KRRRK....",
    "KRWRRRK...",
    "KRRRRDKCK.",
    "KRRRDKCCHK",
    ".KRDKCCCK.",
    "..KKCCCK..",
    "...KCCK...",
    "....KK...."
  ];
  var TOY = [
    "...KKK...",
    "..KMMMK..",
    ".KMWWMMK.",
    "KMMWMMPK.",
    "KMMPPMMpK",
    "KMMPpPPpK",
    ".KMPppPK.",
    "..KMppK..",
    "...KKK..."
  ];

  /* 12x12 UI icons */
  var ICO = {
    hp: [
      "............",
      "..KK...KK...",
      ".KRRK.KRRK..",
      "KRWRRRRRRK..",
      "KRRRRRRRRK..",
      "KRRRRRRRRK..",
      ".KRRRRRRK...",
      "..KRRRRK....",
      "...KRRK.....",
      "....KK......",
      "............",
      "............"
    ],
    xp: [
      "............",
      "....KK......",
      "...KTTK.....",
      "..KTWTTK....",
      ".KTWWUTTK...",
      "KTTUUTTtK...",
      ".KTTTttK....",
      "..KTttK.....",
      "...KKK......",
      "............",
      "............",
      "............"
    ],
    food: [
      "............",
      "...KKK......",
      "..KRRRK.....",
      ".KRWRRDK....",
      ".KRRRDKCK...",
      "..KRDKCCHK..",
      "...KKCCCK...",
      "....KCCK....",
      ".....KK.....",
      "............",
      "............",
      "............"
    ],
    joy: [
      "............",
      "...KKKK.....",
      "..KYYYYK....",
      ".KYWYYWYK...",
      ".KYYYYYYK...",
      ".KYKYYKYK...",
      ".KYYYYYYK...",
      "..KYKKYK....",
      "...KYYK.....",
      "....KK......",
      "............",
      "............"
    ],
    bits: [
      "............",
      "....KKK.....",
      "...KYIYK....",
      "..KYWYYYK...",
      ".KYWYYYIYK..",
      ".KYYYYYYYK..",
      ".KYIYYYIYK..",
      "..KYYYYYK...",
      "...KYIYK....",
      "....KKK.....",
      "............",
      "............"
    ],
    meatPack: [
      "............",
      "...KKKKK....",
      "..KRRRRRK...",
      ".KRWRRRDK...",
      ".KRRRRRDK...",
      "..KRDKKCK...",
      "...KKCCCK...",
      "....KCCK....",
      ".....KK.....",
      "............",
      "............",
      "............"
    ],
    fishPack: [
      "............",
      "......KK....",
      "....KUBBK...",
      "...KUWUBK...",
      "..KUUUUBK...",
      ".KBUUUBK....",
      ".KBUBK......",
      "..KKK.......",
      "............",
      "............",
      "............",
      "............"
    ],
    berryPack: [
      "............",
      "....KK.KK...",
      "...KMMKMKK..",
      "..KMWMMMRK..",
      "..KMMMMMRK..",
      "...KMMMRK...",
      "....KEEK....",
      ".....EK.....",
      "............",
      "............",
      "............",
      "............"
    ],
    medicine: [
      "............",
      "...KKKKK....",
      "..KWWWWWK...",
      ".KWWWRWWWK..",
      ".KWWRRRWWK..",
      ".KWWWRWWWK..",
      ".KWWWWWWK...",
      "..KSSSSK....",
      "...KKKK.....",
      "............",
      "............",
      "............"
    ],
    joyToy: [
      "............",
      "...KKKK.....",
      "..KYYYYK....",
      ".KYWYYWYK...",
      ".KYYYYYYK...",
      ".KYKYYKYK...",
      ".KYYYYYYK...",
      "..KYKKYK....",
      "...KYYK.....",
      "....KK......",
      "............",
      "............"
    ],
    eraser: [
      "............",
      "......KKK...",
      "....KKWWK...",
      "...KWWWWK...",
      "..KWWWWK....",
      ".KMRRMK.....",
      ".KRRRK......",
      "..KRK.......",
      "...K........",
      "............",
      "............",
      "............"
    ],
    atkBoost: [
      "............",
      "......KK....",
      ".....KXK....",
      "....KFXFK...",
      "...KFXWXK...",
      "..KKFXK.....",
      ".KssKK......",
      "KssK........",
      ".KK.........",
      "............",
      "............",
      "............"
    ],
    dataChip: [
      "............",
      "...KKKKK....",
      "..KTUTUTK...",
      ".KTWWUUTK...",
      ".KTUUUUTK...",
      ".KTttttTK...",
      "..KTTTTK....",
      "...KYYK.....",
      "....KK......",
      "............",
      "............",
      "............"
    ],
    digimental: [
      "............",
      "....KKK.....",
      "...KFOFK....",
      "..KFWXOFK...",
      ".KFOXXOFK...",
      ".KFOOOOFK...",
      ".KFoOoFK....",
      "..KFoFK.....",
      "...KKK......",
      "............",
      "............",
      "............"
    ],
    crest: [
      "............",
      "....KKK.....",
      "...KYIYK....",
      "..KYWYYYK...",
      ".KYIYKYYYK..",
      ".KYYYYYYYK..",
      "..KYYYYYK...",
      "...KYYYK....",
      "....KYK.....",
      ".....K......",
      "............",
      "............"
    ],
    pepperBreath: [
      "............",
      "......KK....",
      ".....KFK....",
      "....KFXFK...",
      "...KFXWXK...",
      "..KFXFXK....",
      ".KOoXK......",
      "KOOOK.......",
      ".KOK........",
      "............",
      "............",
      "............"
    ],
    fireAura: [
      "............",
      "...KXKXK....",
      "..KFXFXFK...",
      ".KFX...XFK..",
      "KX..KKK..XK.",
      "KF.KYYYK.FK.",
      "KX..KKK..XK.",
      ".KFX...XFK..",
      "..KFXFXFK...",
      "...KXKXK....",
      "............",
      "............"
    ],
    orbitShield: [
      "............",
      "....KUK.....",
      "..K.....K...",
      ".......KUK..",
      ".KUK........",
      "............",
      "........KUK.",
      ".KUK........",
      "......K.....",
      "....KUK.....",
      "............",
      "............"
    ],
    clawArc: [
      "............",
      "........KK..",
      "......KIIK..",
      "....KIIKK...",
      "..KIIKK.....",
      ".KIIK.......",
      "KIK..KKK....",
      "KK..KCCCK...",
      ".....KKK....",
      "............",
      "............",
      "............"
    ],
    megaFlame: [
      "............",
      ".....KKKK...",
      "....KFFXFK..",
      "...KFWWXFK..",
      "..KFXWXFK...",
      ".KFXFXK.....",
      "KOFXK.......",
      ".KOK........",
      "............",
      "............",
      "............",
      "............"
    ],
    gigaDestroyer: [
      "............",
      ".......KK...",
      ".....KSSK...",
      "...KSWWSK...",
      ".KSRWSSSK...",
      "...KSSsK....",
      ".....KsK....",
      "......KK....",
      "............",
      "............",
      "............",
      "............"
    ],
    terraForce: [
      "............",
      "....KKK.....",
      "...KIYIK....",
      "..KIYHYIK...",
      ".KIYHWWYIK..",
      "..KIYHYIK...",
      "...KIYIK....",
      "....KKK.....",
      "............",
      "............",
      "............",
      "............"
    ],
    sludgeToss: [
      "............",
      "....KK......",
      "...KLLK.....",
      "..KLWLGK....",
      ".KLWGGgK....",
      "..KGggK.....",
      "...KKK......",
      "............",
      "............",
      "............",
      "............",
      "............"
    ],
    blueBlaster: [
      "............",
      "......KK....",
      ".....KUK....",
      "....KUWUK...",
      "...KUBWUK...",
      "..KUBUK.....",
      ".KbUK.......",
      "KbbK........",
      ".KK.........",
      "............",
      "............",
      "............"
    ],
    howlingBlaster: [
      "............",
      "......KKK...",
      "....KUWUUK..",
      "...KUWWUUK..",
      "..KUBWUUK...",
      ".KbUUK......",
      "KbbK........",
      ".KK.........",
      "............",
      "............",
      "............",
      "............"
    ],
    wolfClaw: [
      "............",
      ".......KWK..",
      ".....KWWK...",
      "...KWWKK....",
      ".KWWKK......",
      "KWK..KKK....",
      "KK..KSSSK...",
      ".....KKK....",
      "............",
      "............",
      "............",
      "............"
    ],
    gracefulCannon: [
      "............",
      "......KKK...",
      "....KSSVSK..",
      "...KSWWVSK..",
      "..KSVWVSK...",
      ".KsSSK......",
      "KssK........",
      ".KK.........",
      "............",
      "............",
      "............",
      "............"
    ],
    speed: [
      "............",
      ".....KK.....",
      "....KIYK....",
      "...KIYYK....",
      "..KIYYYYKK..",
      ".KIYYYYYYYK.",
      "..KKKKYYYK..",
      "......KYYK..",
      ".......KK...",
      "............",
      "............",
      "............"
    ],
    magnet: [
      "............",
      "..KKK..KKK..",
      ".KRRK..KUUK.",
      "KRRKK..KuUK.",
      "KRRK....KUK.",
      "KRK......UK.",
      "KRK......UK.",
      ".KK......KK.",
      "............",
      "............",
      "............",
      "............"
    ],
    maxHp: [
      "............",
      "...KK..KK...",
      "..KRRKKRRK..",
      ".KRWRRRRRRK.",
      ".KRRRKKRRRK.",
      ".KRRKWWKRRK.",
      ".KRRKKKKRRK.",
      "..KRRRRRRK..",
      "...KRRRRK...",
      "....KKKK....",
      "............",
      "............"
    ],
    damage: [
      "............",
      "......KKK...",
      ".....KIIK...",
      "....KIIK....",
      "...KIIK.....",
      "..KIIK......",
      ".KIIKKKK....",
      "KIK.KnnK....",
      "KK...KK.....",
      "............",
      "............",
      "............"
    ],
    cooldown: [
      "............",
      "....KKKK....",
      "...K....K...",
      "..K.KKK..K..",
      ".K.KYYYK.KK.",
      ".K.KYYKK..K.",
      ".K.KKK....K.",
      "..K......K..",
      "...K....K...",
      "....KKKK....",
      "............",
      "............"
    ]
  };

  /* 5x7 caps for the logo wordmark */
  var GLYPH = {
    A: ["XXXXX","X...X","XXXXX","X...X","X...X"],
    B: ["XXXX.","X...X","XXXX.","X...X","XXXX."],
    C: [".XXXX","X....","X....","X....",".XXXX"],
    D: ["XXXX.","X...X","X...X","X...X","XXXX."],
    E: ["XXXXX","X....","XXXX.","X....","XXXXX"],
    G: [".XXXX","X....","X..XX","X...X",".XXXX"],
    H: ["X...X","X...X","XXXXX","X...X","X...X"],
    I: ["XXXXX","..X..","..X..","..X..","XXXXX"],
    L: ["X....","X....","X....","X....","XXXXX"],
    M: ["X...X","XX.XX","X.X.X","X...X","X...X"],
    N: ["X...X","XX..X","X.X.X","X..XX","X...X"],
    O: [".XXX.","X...X","X...X","X...X",".XXX."],
    R: ["XXXX.","X...X","XXXX.","X.X..","X..XX"],
    T: ["XXXXX","..X..","..X..","..X..","..X.."],
    U: ["X...X","X...X","X...X","X...X",".XXX."],
    V: ["X...X","X...X","X...X",".X.X.","..X.."],
    " ": [".....",".....",".....",".....","....."]
  };
  /* pad glyphs to 5 high already; width 5. Need 7? 5 is fine for a chunky wordmark. */


  /* ========== Partner and enemy pixel grids (facing right, outline K) ========== */
  var AGUMON_IDLE0 = [
    "......KKK...........",
    ".....KOOOK..........",
    "....KOoOOOK.........",
    "....KOOOOYKK........",
    "...KOOOOOYYK........",
    "...KOOOWHHOK........",
    "...KOOKEEWOK........",
    "..KOOOOKnnKK........",
    "..KoOOCCCCCCK.......",
    ".KoOOOCCCCCCK.......",
    ".KOOOOCCCCCCK.......",
    ".KOOOOOCCKKK........",
    "KOoOK.KOOOK.........",
    "KCCK..KOOoK.........",
    ".KK...KOK.KOK.......",
    "......KKK.KK........",
    ".......K...K........",
    "...................."
  ];
  var AGUMON_IDLE1 = [
    "......KKK...........",
    ".....KOOOK..........",
    "....KOoOOOK.........",
    "....KOOOOYKK........",
    "...KOOOOOYYK........",
    "...KOOOWHHOK........",
    "...KOOKEEWOK........",
    "..KOOOOKnnKK........",
    "..KoOOCCCCCCK.......",
    ".KoOOOCCCCCCK.......",
    ".KOOOOCCCCCCK.......",
    ".KOOOOOCCKKK........",
    "KOoOK.KOOOK.........",
    "KCCK..KOOoK.........",
    ".KK...KOK.KOK.......",
    "......KKK.K.........",
    ".......K...K........",
    "...................."
  ];
  var AGUMON_WALK0 = [
    "......KKK...........",
    ".....KOOOK..........",
    "....KOoOOOK.........",
    "....KOOOOYKK........",
    "...KOOOOOYYK........",
    "...KOOOWHHOK........",
    "...KOOKEEWOK........",
    "..KOOOOKnnKK........",
    "..KoOOCCCCCCK.......",
    ".KoOOOCCCCCCK.......",
    ".KOOOOCCCCCCK.......",
    ".KOOOOOCCKKK........",
    "KOoOK.KOOOK.........",
    "KCCK..KOOoK.........",
    ".KK...KOK..KK.......",
    "......KK....K.......",
    "....................",
    "...................."
  ];
  var AGUMON_WALK1 = [
    "......KKK...........",
    ".....KOOOK..........",
    "....KOoOOOK.........",
    "....KOOOOYKK........",
    "...KOOOOOYYK........",
    "...KOOOWHHOK........",
    "...KOOKEEWOK........",
    "..KOOOOKnnKK........",
    "..KoOOCCCCCCK.......",
    ".KoOOOCCCCCCK.......",
    ".KOOOOCCCCCCK.......",
    ".KOOOOOCCKKK........",
    "KOoOK.KOOOK.........",
    "KCCK..KOK.KOK.......",
    ".KK...KK...KK.......",
    ".............K......",
    "....................",
    "...................."
  ];

  var GREYMON_IDLE0 = [
    "..........KK..........",
    ".........KNKK.........",
    "........KNnNKK........",
    ".....KKKNnnNNKKK......",
    "....KNNNNNNNNNnK......",
    "...KNNNHHHNNNNNK......",
    "...KNNHWHHNNNnnK......",
    "..KOOONHHKnnKKK.......",
    ".KOoOONKnnK...........",
    "KOOOOOCCCCCKKK........",
    "KOoOOOCCCCCCCK........",
    "KoOOOOCCCCCCCK........",
    "KOOOOOCCCCooK.........",
    ".KOoOKKOOOOK..........",
    ".KCKK.KOoOOK..........",
    "..KK..KOOOOOKKK.......",
    "......KOK.KOK..K......",
    "......KK...KK..K......",
    "......K.....K.........",
    "......................"
  ];
  var GREYMON_IDLE1 = [
    "..........KK..........",
    ".........KNKK.........",
    "........KNnNKK........",
    ".....KKKNnnNNKKK......",
    "....KNNNNNNNNNnK......",
    "...KNNNHHHNNNNNK......",
    "...KNNHWHHNNNnnK......",
    "..KOOONHHKnnKKK.......",
    ".KOoOONKnnK...........",
    "KOOOOOCCCCCKKK........",
    "KOoOOOCCCCCCCK........",
    "KoOOOOCCCCCCCK........",
    "KOOOOOCCCCooK.........",
    ".KOoOKKOOOOK..........",
    ".KCKK.KOoOOK..........",
    "..KK..KOOOOOKKK.......",
    "......KOK.KOK.K.......",
    "......KK...KK.K.......",
    "......................",
    "......................"
  ];
  var GREYMON_WALK0 = [
    "..........KK..........",
    ".........KNKK.........",
    "........KNnNKK........",
    ".....KKKNnnNNKKK......",
    "....KNNNNNNNNNnK......",
    "...KNNNHHHNNNNNK......",
    "...KNNHWHHNNNnnK......",
    "..KOOONHHKnnKKK.......",
    ".KOoOONKnnK...........",
    "KOOOOOCCCCCKKK........",
    "KOoOOOCCCCCCCK........",
    "KoOOOOCCCCCCCK........",
    "KOOOOOCCCCooK.........",
    "KOoKK.KOOOOK..........",
    "KCKK..KOoOOK..........",
    ".KK...KOOOOOKK........",
    "......KOK...KKK.......",
    "......KK......K.......",
    "......................",
    "......................"
  ];
  var GREYMON_WALK1 = [
    "..........KK..........",
    ".........KNKK.........",
    "........KNnNKK........",
    ".....KKKNnnNNKKK......",
    "....KNNNNNNNNNnK......",
    "...KNNNHHHNNNNNK......",
    "...KNNHWHHNNNnnK......",
    "..KOOONHHKnnKKK.......",
    ".KOoOONKnnK...........",
    "KOOOOOCCCCCKKK........",
    "KOoOOOCCCCCCCK........",
    "KoOOOOCCCCCCCK........",
    "KOOOOOCCCCooK.........",
    ".KOoOKKOOOOKKK........",
    ".KCKK.KOoOK..K........",
    "..KK..KOOOK..K........",
    "......KK.KOK..........",
    "..........KK..........",
    "......................",
    "......................"
  ];
  var METALGREYMON_IDLE0 = [
    ".........KKS........",
    "........KSNSK.......",
    ".......KSsNNSKK.....",
    "....KKKsNNNNSsKK....",
    "...KSSNNNNNNNSsK....",
    "...KSNNHHHNNNSsK....",
    "..KSSNHWHHNNNssK....",
    ".KDDDSNHHKssKKKK....",
    "KDDRDSKssK..........",
    "KDDDDDSSSSSSKKK.....",
    "KDRDDDSSSSSSSSK.....",
    "KDDDDDSSSSSSSK......",
    "KDDDDSKsSSSSRKK.....",
    ".KsSSKKSSSSSK.......",
    ".KsSK.KSsSSSK.......",
    "..KK..KSSSSSSKKK....",
    "......KSK.KSK..K....",
    "......KK...KK..K....",
    "....................",
    "...................."
  ];

  var METALGREYMON_IDLE1 = [
    ".........KKS........",
    "........KSNSK.......",
    ".......KSsNNSKK.....",
    "....KKKsNNNNSsKK....",
    "...KSSNNNNNNNSsK....",
    "...KSNNHHHNNNSsK....",
    "..KSSNHWHHNNNssK....",
    ".KDDDSNHHKssKKKK....",
    "KDDRDSKssK..........",
    "KDDDDDSSSSSSKKK.....",
    "KDRDDDSSSSSSSSK.....",
    "KDDDDDSSSSSSSK......",
    "KDDDDSKsSSSSRKK.....",
    ".KsSSKKSSSSSK.......",
    ".KsSK.KSsSSSK.......",
    "..KK..KSSSSSSKKK....",
    "......KSK.KSK..K....",
    "......KSK.KSK.K.....",
    "......KK...KK.K.....",
    "...................."
  ];

  var METALGREYMON_WALK0 = [
    ".........KKS........",
    "........KSNSK.......",
    ".......KSsNNSKK.....",
    "....KKKsNNNNSsKK....",
    "...KSSNNNNNNNSsK....",
    "...KSNNHHHNNNSsK....",
    "..KSSNHWHHNNNssK....",
    ".KDDDSNHHKssKKKK....",
    "KDDRDSKssK..........",
    "KDDDDDSSSSSSKKK.....",
    "KDRDDDSSSSSSSSK.....",
    "KDDDDDSSSSSSSK......",
    "KDDDDSKsSSSSRKK.....",
    ".KsSSKKSSSSSK.......",
    ".KsSSKKSSSSSK.......",
    "KsSK..KSsSSSK.......",
    ".KK...KSSSSSSKK.....",
    "......KSK...KKK.....",
    "......KK......K.....",
    "...................."
  ];

  var METALGREYMON_WALK1 = [
    ".........KKS........",
    "........KSNSK.......",
    ".......KSsNNSKK.....",
    "....KKKsNNNNSsKK....",
    "...KSSNNNNNNNSsK....",
    "...KSNNHHHNNNSsK....",
    "..KSSNHWHHNNNssK....",
    ".KDDDSNHHKssKKKK....",
    "KDDRDSKssK..........",
    "KDDDDDSSSSSSKKK.....",
    "KDRDDDSSSSSSSSK.....",
    "KDDDDDSSSSSSSK......",
    "KDDDDSKsSSSSRKK.....",
    ".KsSSKKSSSSSK.......",
    ".KsSSKKSSSSSKKK.....",
    ".KsSK.KSsSK..K......",
    "..KK..KSSSK..K......",
    "......KK.KSK........",
    "..........KK........",
    "...................."
  ];

  var WARGREYMON_IDLE0 = [
    "......KK............",
    ".....KIYK..KK.......",
    "....KIYIYKKIIK......",
    "...KIYIYYYYIIK......",
    "...KIIHWHHIIIK......",
    "..KIIHHHHIIIKKK.....",
    "..KIIHHKnnK...K.....",
    ".KOOOOKnnK....K.....",
    "KOoOOCCCCCKKKKK.....",
    "KOOOOCCCCCCCK.......",
    "KoOOOCCCCCCCK.......",
    "KOOOOCCCCIIIK.......",
    ".KOoKKIIIIIIKK......",
    "KIIK.KIIIIIIK.......",
    "KIYK.KIIIIIIK.......",
    ".KK..KIIK.KIIK......",
    ".....KIK...KIK......",
    ".....KK.....KK......",
    "....................",
    "...................."
  ];

  var WARGREYMON_IDLE1 = [
    "......KK............",
    ".....KIYK..KK.......",
    "....KIYIYKKIIK......",
    "...KIYIYYYYIIK......",
    "...KIIHWHHIIIK......",
    "..KIIHHHHIIIKKK.....",
    "..KIIHHKnnK...K.....",
    ".KOOOOKnnK....K.....",
    "KOoOOCCCCCKKKKK.....",
    "KOOOOCCCCCCCK.......",
    "KoOOOCCCCCCCK.......",
    "KOOOOCCCCIIIK.......",
    ".KOoKKIIIIIIKK......",
    "KIIK.KIIIIIIK.......",
    "KIYK.KIIIIIIK.......",
    ".KK..KIIK.KIIK......",
    ".....KIK...KIK......",
    ".....KK.....K.......",
    "....................",
    "...................."
  ];

  var WARGREYMON_WALK0 = [
    "......KK............",
    ".....KIYK..KK.......",
    "....KIYIYKKIIK......",
    "...KIYIYYYYIIK......",
    "...KIIHWHHIIIK......",
    "..KIIHHHHIIIKKK.....",
    "..KIIHHKnnK...K.....",
    ".KOOOOKnnK....K.....",
    "KOoOOCCCCCKKKKK.....",
    "KOOOOCCCCCCCK.......",
    "KoOOOCCCCCCCK.......",
    "KOOOOCCCCIIIK.......",
    ".KOoKKIIIIIIKK......",
    "KIIK.KIIIIIIK.......",
    "KIIK.KIIIIIIK.......",
    "KIYK.KIIIIIIK.......",
    ".KK..KIIK..KKK......",
    ".....KIK......K.....",
    ".....KK.............",
    "...................."
  ];

  var WARGREYMON_WALK1 = [
    "......KK............",
    ".....KIYK..KK.......",
    "....KIYIYKKIIK......",
    "...KIYIYYYYIIK......",
    "...KIIHWHHIIIK......",
    "..KIIHHHHIIIKKK.....",
    "..KIIHHKnnK...K.....",
    ".KOOOOKnnK....K.....",
    "KOoOOCCCCCKKKKK.....",
    "KOOOOCCCCCCCK.......",
    "KoOOOCCCCCCCK.......",
    "KOOOOCCCCIIIK.......",
    ".KOoKKIIIIIIKK......",
    "KIIK.KIIIIIIK.......",
    "KIIK.KIIIIIIKK......",
    "KIYK.KIIK..KIK......",
    ".KK..KIIK...K.......",
    ".....KK.KIIK........",
    ".........KK.........",
    "...................."
  ];

  var NUMEMON_IDLE0 = [
    "....................",
    "......KKKKKK........",
    "....KKPPPPPPKK......",
    "...KPPWHPPPPPK......",
    "...KPPHHPPPPPpK.....",
    "..KPPKKEPPPPPpK.....",
    "..KPPPPnnPPPppK.....",
    ".KPPPPCCCCPPpK......",
    ".KPPPCCCCCCPpK......",
    "KPPPPCCCCCCppK......",
    "KPPPpCCCCCppK.......",
    "KPPppCCCCCppK.......",
    ".KPppppPPppK........",
    "..KKppppppKK........",
    "....KKKKKK..........",
    "...................."
  ];

  var NUMEMON_IDLE1 = [
    "....................",
    "......KKKKKK........",
    "....KKPPPPPPKK......",
    "...KPPWHPPPPPK......",
    "...KPPHHPPPPPpK.....",
    "..KPPKKEPPPPPpK.....",
    "..KPPPPnnPPPppK.....",
    ".KPPPPCCCCPPpK......",
    "KPPPCCCCCCCPpK......",
    "KPPPPCCCCCCppK......",
    "KPPppCCCCCppK.......",
    ".KPpppCCCCppK.......",
    "..KPppppPPppK.......",
    "...KKppppKK.........",
    "....KKKKKK..........",
    "...................."
  ];

  var NUMEMON_WALK0 = [
    "....................",
    "......KKKKKK........",
    "....KKPPPPPPKK......",
    "...KPPWHPPPPPK......",
    "...KPPHHPPPPPpK.....",
    "..KPPKKEPPPPPpK.....",
    "..KPPPPnnPPPppK.....",
    ".KPPPPCCCCPPpK......",
    ".KPPPCCCCCCPpK......",
    "KPPPPCCCCCCppK......",
    "KPPPpCCCCCppK.......",
    "KPPppCCCCCppK.......",
    ".KPppppPPppK........",
    "..KKppppppKK........",
    "....KKKKKK..........",
    "...................."
  ];

  var NUMEMON_WALK1 = [
    "....................",
    "......KKKKKK........",
    "....KKPPPPPPKK......",
    "...KPPWHPPPPPK......",
    "...KPPHHPPPPPpK.....",
    "..KPPKKEPPPPPpK.....",
    "..KPPPPnnPPPppK.....",
    ".KPPPPCCCCPPpK......",
    "KPPPCCCCCCCPpK......",
    "KPPPPCCCCCCppK......",
    "KPPppCCCCCppK.......",
    ".KPpppCCCCppK.......",
    "..KPppppPPppK.......",
    "...KKppppKK.........",
    "....KKKKKK..........",
    "...................."
  ];

  var GABUMON_IDLE0 = [
    "......KKK...........",
    ".....KCCCK..KK......",
    "....KCCHCCKKCK......",
    "....KCCCCCCCCK......",
    "...KCCWHHCCCCK......",
    "...KCCKKbHCCCK......",
    "..KCCCCKnnKK........",
    "..KbbbCCCCCK........",
    ".KbBBBCCCCCK........",
    ".KBBBBCCCCCK........",
    ".KBBBBCCCKKK........",
    "KBbK.KBBBCK.........",
    "KCKK.KBBbCK.........",
    ".KK..KBBBBK.........",
    ".....KBK.KBK........",
    ".....KKK.KK.........",
    "......K...K.........",
    "...................."
  ];

  var GABUMON_IDLE1 = [
    "......KKK...........",
    ".....KCCCK..KK......",
    "....KCCHCCKKCK......",
    "....KCCCCCCCCK......",
    "...KCCWHHCCCCK......",
    "...KCCKKbHCCCK......",
    "..KCCCCKnnKK........",
    "..KbbbCCCCCK........",
    ".KbBBBCCCCCK........",
    ".KBBBBCCCCCK........",
    ".KBBBBCCCKKK........",
    "KBbK.KBBBCK.........",
    "KCKK.KBBbCK.........",
    ".KK..KBBBBK.........",
    ".....KBK.KBK........",
    ".....KKK.KK.........",
    "....................",
    "...................."
  ];

  var GABUMON_WALK0 = [
    "......KKK...........",
    ".....KCCCK..KK......",
    "....KCCHCCKKCK......",
    "....KCCCCCCCCK......",
    "...KCCWHHCCCCK......",
    "...KCCKKbHCCCK......",
    "..KCCCCKnnKK........",
    "..KbbbCCCCCK........",
    ".KbBBBCCCCCK........",
    ".KBBBBCCCCCK........",
    ".KBBBBCCCKKK........",
    "KBbK.KBBBCK.........",
    "KCKK.KBBbCK.........",
    ".KK..KBBBBK.........",
    ".....KBK..KK........",
    ".....KK....K........",
    "....................",
    "...................."
  ];

  var GABUMON_WALK1 = [
    "......KKK...........",
    ".....KCCCK..KK......",
    "....KCCHCCKKCK......",
    "....KCCCCCCCCK......",
    "...KCCWHHCCCCK......",
    "...KCCKKbHCCCK......",
    "..KCCCCKnnKK........",
    "..KbbbCCCCCK........",
    ".KbBBBCCCCCK........",
    ".KBBBBCCCCCK........",
    ".KBBBBCCCKKK........",
    "KBbK.KBBBCK.........",
    "KCKK.KBBbCK.........",
    ".KK..KBBK.KBK.......",
    ".....KBK..KK........",
    "...........K........",
    "....................",
    "...................."
  ];

  var GARURUMON_IDLE0 = [
    "............................",
    ".....KKK...........KK.......",
    "....KWWWK.........KWWK......",
    "...KWWWWKKKKKK...KWbWK......",
    "...KWHHWWWWWWWKKKWbWWK......",
    "..KWHWHWWWWWWWWWWWWWKK......",
    "..KWWKbKWWWWBWWWWWWWK.......",
    ".KWWWKnnKWWBBWWWWWWK........",
    "KWWWWWWWWWWWWWWWWbK.........",
    "KWWWWWWWWWWWWWWWbK..........",
    ".KWbWWBWBWWWWWWWK...........",
    "..KWWWWWWWWWWWWK............",
    "..KWK.KWK.KWK.KWK...........",
    "..KK..KK..KK..KK............",
    "............................",
    "............................"
  ];

  var GARURUMON_IDLE1 = [
    "............................",
    ".....KKK...........KK.......",
    "....KWWWK.........KWWK......",
    "...KWWWWKKKKKK...KWbWK......",
    "...KWHHWWWWWWWKKKWbWWK......",
    "..KWHWHWWWWWWWWWWWWWKK......",
    "..KWWKbKWWWWBWWWWWWWK.......",
    ".KWWWKnnKWWBBWWWWWWK........",
    "KWWWWWWWWWWWWWWWWbK.........",
    "KWWWWWWWWWWWWWWWbK..........",
    ".KWbWWBWBWWWWWWWK...........",
    "..KWWWWWWWWWWWWK............",
    "..KWK.KWK.KWK.KWK...........",
    "...K..KK..KK..K.............",
    "............................",
    "............................"
  ];

  var GARURUMON_WALK0 = [
    "............................",
    ".....KKK...........KK.......",
    "....KWWWK.........KWWK......",
    "...KWWWWKKKKKK...KWbWK......",
    "...KWHHWWWWWWWKKKWbWWK......",
    "..KWHWHWWWWWWWWWWWWWKK......",
    "..KWWKbKWWWWBWWWWWWWK.......",
    ".KWWWKnnKWWBBWWWWWWK........",
    "KWWWWWWWWWWWWWWWWbK.........",
    "KWWWWWWWWWWWWWWWbK..........",
    ".KWbWWBWBWWWWWWWK...........",
    "..KWWWWWWWWWWWWK............",
    ".KWK...KWK.KWK..KK..........",
    ".KK.....KK.KK....K..........",
    "............................",
    "............................"
  ];

  var GARURUMON_WALK1 = [
    "............................",
    ".....KKK...........KK.......",
    "....KWWWK.........KWWK......",
    "...KWWWWKKKKKK...KWbWK......",
    "...KWHHWWWWWWWKKKWbWWK......",
    "..KWHWHWWWWWWWWWWWWWKK......",
    "..KWWKbKWWWWBWWWWWWWK.......",
    ".KWWWKnnKWWBBWWWWWWK........",
    "KWWWWWWWWWWWWWWWWbK.........",
    "KWWWWWWWWWWWWWWWbK..........",
    ".KWbWWBWBWWWWWWWK...........",
    "..KWWWWWWWWWWWWK............",
    "...KWK.KWK...KWK.KWK........",
    "....KK..KK....KK.KK.........",
    "............................",
    "............................"
  ];

  var WEREGARURUMON_IDLE0 = [
    "......KKK...........",
    ".....KWWWK.KK.......",
    "....KWWWWWKbK.......",
    "....KWHHWWWWK.......",
    "...KWHWHWWWWK.......",
    "...KWWKbKWWWK.......",
    "..KWWWKnnKKK........",
    "..KbBBWWWWWK........",
    ".KbBBBbbWWWK........",
    ".KBBBBBWWWKK........",
    ".KBBBBWWWWK.........",
    "KBbK.KBBWWK.........",
    "KWWK.KBBBBK.........",
    ".KK..KBBBBK.........",
    ".....KBK.KBK........",
    ".....KKK.KK.........",
    "......K...K.........",
    "....................",
    "....................",
    "...................."
  ];

  var WEREGARURUMON_IDLE1 = [
    "......KKK...........",
    ".....KWWWK.KK.......",
    "....KWWWWWKbK.......",
    "....KWHHWWWWK.......",
    "...KWHWHWWWWK.......",
    "...KWWKbKWWWK.......",
    "..KWWWKnnKKK........",
    "..KbBBWWWWWK........",
    ".KbBBBbbWWWK........",
    ".KBBBBBWWWKK........",
    ".KBBBBWWWWK.........",
    "KBbK.KBBWWK.........",
    "KWWK.KBBBBK.........",
    ".KK..KBBBBK.........",
    ".....KBK.KBK........",
    ".....KKK.KK.........",
    ".....KKK.KK.........",
    "......K...K.........",
    "....................",
    "...................."
  ];

  var WEREGARURUMON_WALK0 = [
    "......KKK...........",
    ".....KWWWK.KK.......",
    "....KWWWWWKbK.......",
    "....KWHHWWWWK.......",
    "...KWHWHWWWWK.......",
    "...KWWKbKWWWK.......",
    "..KWWWKnnKKK........",
    "..KbBBWWWWWK........",
    ".KbBBBbbWWWK........",
    ".KBBBBBWWWKK........",
    ".KBBBBWWWWK.........",
    "KBbK.KBBWWK.........",
    "KWWK.KBBBBK.........",
    ".KK..KBBBBK.........",
    ".KK..KBBBBK.........",
    ".....KBK..KKK.......",
    ".....KK.....K.......",
    "....................",
    "....................",
    "...................."
  ];

  var WEREGARURUMON_WALK1 = [
    "......KKK...........",
    ".....KWWWK.KK.......",
    "....KWWWWWKbK.......",
    "....KWHHWWWWK.......",
    "...KWHWHWWWWK.......",
    "...KWWKbKWWWK.......",
    "..KWWWKnnKKK........",
    "..KbBBWWWWWK........",
    ".KbBBBbbWWWK........",
    ".KBBBBBWWWKK........",
    ".KBBBBWWWWK.........",
    "KBbK.KBBWWK.........",
    "KWWK.KBBBBK.........",
    ".KK..KBBBBK.........",
    ".KK..KBBK.KBK.......",
    ".....KBK..KK........",
    "...........K........",
    "....................",
    "....................",
    "...................."
  ];

  var METALGARURUMON_IDLE0 = [
    "............................",
    ".....KKK...........KK.......",
    "....KSSSK.........KSSK......",
    "...KSSSSKKKKKK...KSuSK......",
    "...KSHHSSSSSSSKKKSuSSK......",
    "..KSHSHSSSSSSSSSSSSSKK......",
    "..KSSKuKSSSSVSSSSSSSK.......",
    ".KSSSKssKSSVVSSSSSSK........",
    "KSSSSSSSSSSSSSSSSuK.........",
    "KSSSSVSVSSSSSSSSuK..........",
    ".KSuSSVSVSSSSSSSK...........",
    "..KSSSSSSSSSSSSK............",
    "..KSK.KSK.KSK.KSK...........",
    "..KK..KK..KK..KK............",
    "............................",
    "............................"
  ];

  var METALGARURUMON_IDLE1 = [
    "............................",
    ".....KKK...........KK.......",
    "....KSSSK.........KSSK......",
    "...KSSSSKKKKKK...KSuSK......",
    "...KSHHSSSSSSSKKKSuSSK......",
    "..KSHSHSSSSSSSSSSSSSKK......",
    "..KSSKuKSSSSVSSSSSSSK.......",
    ".KSSSKssKSSVVSSSSSSK........",
    "KSSSSSSSSSSSSSSSSuK.........",
    "KSSSSVSVSSSSSSSSuK..........",
    ".KSuSSVSVSSSSSSSK...........",
    "..KSSSSSSSSSSSSK............",
    "..KSK.KSK.KSK.KSK...........",
    "...K..KK..KK..K.............",
    "............................",
    "............................"
  ];

  var METALGARURUMON_WALK0 = [
    "............................",
    ".....KKK...........KK.......",
    "....KSSSK.........KSSK......",
    "...KSSSSKKKKKK...KSuSK......",
    "...KSHHSSSSSSSKKKSuSSK......",
    "..KSHSHSSSSSSSSSSSSSKK......",
    "..KSSKuKSSSSVSSSSSSSK.......",
    ".KSSSKssKSSVVSSSSSSK........",
    "KSSSSSSSSSSSSSSSSuK.........",
    "KSSSSVSVSSSSSSSSuK..........",
    ".KSuSSVSVSSSSSSSK...........",
    "..KSSSSSSSSSSSSK............",
    ".KSK...KSK.KSK..KK..........",
    ".KK.....KK.KK....K..........",
    "............................",
    "............................"
  ];

  var METALGARURUMON_WALK1 = [
    "............................",
    ".....KKK...........KK.......",
    "....KSSSK.........KSSK......",
    "...KSSSSKKKKKK...KSuSK......",
    "...KSHHSSSSSSSKKKSuSSK......",
    "..KSHSHSSSSSSSSSSSSSKK......",
    "..KSSKuKSSSSVSSSSSSSK.......",
    ".KSSSKssKSSVVSSSSSSK........",
    "KSSSSSSSSSSSSSSSSuK.........",
    "KSSSSVSVSSSSSSSSuK..........",
    ".KSuSSVSVSSSSSSSK...........",
    "..KSSSSSSSSSSSSK............",
    "...KSK.KSK...KSK.KSK........",
    "....KK..KK....KK.KK.........",
    "............................",
    "............................"
  ];

  var PAGUMON_IDLE0 = [
    "......KK.KK.........",
    ".....KPPKPPK........",
    "....KPPPKPPPK.......",
    "...KPPPPPPPPPK......",
    "...KPPWHPPWHPK......",
    "..KPPKKPPKKPPK......",
    "..KPPPPnnPPPPK......",
    "...KPPPPPPPPK.......",
    "...KPpPPPPPpK.......",
    "....KPppPPpK........",
    "....KKKpKKK.........",
    "....K...K...........",
    "....................",
    "...................."
  ];

  var PAGUMON_IDLE1 = [
    "......KK.KK.........",
    ".....KPPKPPK........",
    "....KPPPKPPPK.......",
    "...KPPPPPPPPPK......",
    "...KPPWHPPWHPK......",
    "..KPPKKPPKKPPK......",
    "..KPPPPnnPPPPK......",
    "...KPPPPPPPPK.......",
    "...KPpPPPPPpK.......",
    "....KPppPPpK........",
    ".....KKpKK..........",
    ".....K...K..........",
    "....................",
    "...................."
  ];

  var PAGUMON_WALK0 = [
    "......KK.KK.........",
    ".....KPPKPPK........",
    "....KPPPKPPPK.......",
    "...KPPPPPPPPPK......",
    "...KPPWHPPWHPK......",
    "..KPPKKPPKKPPK......",
    "..KPPPPnnPPPPK......",
    "...KPPPPPPPPK.......",
    "...KPpPPPPPpK.......",
    "....KPppPPpK........",
    "....KKK.KK..........",
    "....K....K..........",
    "....................",
    "...................."
  ];

  var PAGUMON_WALK1 = [
    "......KK.KK.........",
    ".....KPPKPPK........",
    "....KPPPKPPPK.......",
    "...KPPPPPPPPPK......",
    "...KPPWHPPWHPK......",
    "..KPPKKPPKKPPK......",
    "..KPPPPnnPPPPK......",
    "...KPPPPPPPPK.......",
    "...KPpPPPPPpK.......",
    "....KPppPPpK........",
    ".....KK.KKK.........",
    ".....K...K..........",
    "....................",
    "...................."
  ];

  var GAZIMON_IDLE0 = [
    "....KK......KK......",
    "...KNNK....KNNK.....",
    "...KNNnK..KNnNK.....",
    "...KNNNNKKNNNnK.....",
    "..KNNWHHHHHNNNK.....",
    "..KNNHWHHHHNNNK.....",
    "..KNNKKbHHNnnK......",
    ".KNNNNKnnKKK........",
    ".KnnNNNCCCCK........",
    "KNNNNNCCCCCK........",
    "KNNNNCCCCCCK........",
    "KNNNCCCNNNK.........",
    ".KNnK.KNNNK.........",
    ".KNK..KNNNK.........",
    "..KK..KNK.KNK.......",
    "......KK...KK.......",
    "....................",
    "...................."
  ];

  var GAZIMON_IDLE1 = [
    "....KK......KK......",
    "...KNNK....KNNK.....",
    "...KNNnK..KNnNK.....",
    "...KNNNNKKNNNnK.....",
    "..KNNWHHHHHNNNK.....",
    "..KNNHWHHHHNNNK.....",
    "..KNNKKbHHNnnK......",
    ".KNNNNKnnKKK........",
    ".KnnNNNCCCCK........",
    "KNNNNNCCCCCK........",
    "KNNNNCCCCCCK........",
    "KNNNCCCNNNK.........",
    ".KNnK.KNNNK.........",
    ".KNK..KNNNK.........",
    "..KK..KNK.KNK.......",
    "......KK...K........",
    "....................",
    "...................."
  ];

  var GAZIMON_WALK0 = [
    "....KK......KK......",
    "...KNNK....KNNK.....",
    "...KNNnK..KNnNK.....",
    "...KNNNNKKNNNnK.....",
    "..KNNWHHHHHNNNK.....",
    "..KNNHWHHHHNNNK.....",
    "..KNNKKbHHNnnK......",
    ".KNNNNKnnKKK........",
    ".KnnNNNCCCCK........",
    "KNNNNNCCCCCK........",
    "KNNNNCCCCCCK........",
    "KNNNCCCNNNK.........",
    ".KNnK.KNNNK.........",
    ".KNK..KNNNK.........",
    "..KK..KNK..KK.......",
    "......KK....K.......",
    "....................",
    "...................."
  ];

  var GAZIMON_WALK1 = [
    "....KK......KK......",
    "...KNNK....KNNK.....",
    "...KNNnK..KNnNK.....",
    "...KNNNNKKNNNnK.....",
    "..KNNWHHHHHNNNK.....",
    "..KNNHWHHHHNNNK.....",
    "..KNNKKbHHNnnK......",
    ".KNNNNKnnKKK........",
    ".KnnNNNCCCCK........",
    "KNNNNNCCCCCK........",
    "KNNNNCCCCCCK........",
    "KNNNCCCNNNK.........",
    ".KNnK.KNNNK.........",
    ".KNK..KNK.KNK.......",
    "..KK..KNK.KK........",
    "...........K........",
    "....................",
    "...................."
  ];

  var DEMIDEVIMON_IDLE0 = [
    "KK..............KK..",
    "KAKK..........KKAK..",
    "KAAAKK......KKAAAK..",
    ".KAAAAKKWWKKAAAAK...",
    "..KAAAAKWWKAAAAK....",
    "...KKKqQQqQKKKK.....",
    "....KqQWHWQqK.......",
    "....KqQKRKQqK.......",
    "...KQqQnnQqQK.......",
    "...KQqQQQQqQK.......",
    "..KQqqQppQqqQK......",
    "..KQqqppppqqK.......",
    "...KKqqppqqKK.......",
    "....KKqKKqKK........",
    ".....K...K..........",
    "...................."
  ];

  var DEMIDEVIMON_IDLE1 = [
    "KK..............KK..",
    "KAKK..........KKAK..",
    "KAAAKK......KKAAAK..",
    ".KAAAAKWWWWKAAAAK...",
    "..KAAAAKWWKAAAAK....",
    "...KKKqQQqQKKKK.....",
    "....KqQWHWQqK.......",
    "....KqQKRKQqK.......",
    "...KQqQnnQqQK.......",
    "...KQqQQQQqQK.......",
    "..KQqqQppQqqQK......",
    "..KQqqppppqqK.......",
    "...KKqqppqqKK.......",
    "....KKqKKqKK........",
    "....K....K..........",
    "...................."
  ];

  var DEMIDEVIMON_WALK0 = [
    "KK..............KK..",
    "KAKK..........KKAK..",
    "KAAAKK......KKAAAK..",
    ".KAAAAKKWWKKAAAAK...",
    "..KAAAAKWWKAAAAK....",
    "...KKKqQQqQKKKK.....",
    "....KqQWHWQqK.......",
    "....KqQKRKQqK.......",
    "...KQqQnnQqQK.......",
    "...KQqQQQQqQK.......",
    "..KQqqQppQqqQK......",
    "..KQqqppppqqK.......",
    "...KKqqppqqKK.......",
    "....KKqKKqKK........",
    ".....K...K..........",
    "...................."
  ];

  var DEMIDEVIMON_WALK1 = [
    "KK..............KK..",
    "KAKK..........KKAK..",
    "KAAAKK......KKAAAK..",
    ".KAAAAKWWWWKAAAAK...",
    "..KAAAAKWWKAAAAK....",
    "...KKKqQQqQKKKK.....",
    "....KqQWHWQqK.......",
    "....KqQKRKQqK.......",
    "...KQqQnnQqQK.......",
    "...KQqQQQQqQK.......",
    "..KQqqQppQqqQK......",
    "..KQqqppppqqK.......",
    "...KKqqppqqKK.......",
    "....KKqKKqKK........",
    "....K....K..........",
    "...................."
  ];

  var KUWAGAMON_IDLE0 = [
    "............................",
    "KKK....................KKK..",
    "KnnKK................KKnnK..",
    "KnNNnKK............KKnnNnK..",
    "KNNNNNnKK........KKnnNNNNK..",
    ".KNNNNNNnKKKKKKKKnnNNNNNK...",
    "..KKNNNNNNNNNNNNNNNNNNKK....",
    "....KNRRHHHHHHHHRRNNNK......",
    "....KNRWHHHHHHHHRRNNNK......",
    "...KNRRKRHHHHHRKRNNNK.......",
    "...KNRRRRRRRRRRRRNNNK.......",
    "..KNRRRRRRRRRRRRRNNNK.......",
    "..KNRRRRNNnNNRRRNNNK........",
    "...KRRRNNNNNNnRRRNK.........",
    "...KRRRKKKKKKKRRRK..........",
    "....KRK......KRK............",
    "...KRnK......KnRK...........",
    "...KNK........KNK...........",
    "..KNK..........KNK..........",
    "..KK............KK.........."
  ];

  var KUWAGAMON_IDLE1 = [
    "............................",
    "KKK....................KKK..",
    "KnnKK................KKnnK..",
    "KnNNnKK............KKnnNnK..",
    "KNNNNNnKK........KKnnNNNNK..",
    ".KNNNNNNnKKKKKKKKnnNNNNNK...",
    "..KKNNNNNNNNNNNNNNNNNNKK....",
    "....KNRRHHHHHHHHRRNNNK......",
    "....KNRWHHHHHHHHRRNNNK......",
    "...KNRRKRHHHHHRKRNNNK.......",
    "...KNRRRRRRRRRRRRNNNK.......",
    "..KNRRRRRRRRRRRRRNNNK.......",
    "..KNRRRRNNnNNRRRNNNK........",
    "...KRRRNNNNNNnRRRNK.........",
    "...KRRRKKKKKKKRRRK..........",
    "....KRK......KRK............",
    "...KRnK......KnRK...........",
    "..KNK..........KNK..........",
    "..KK............KK..........",
    "............................"
  ];

  var KUWAGAMON_WALK0 = [
    "............................",
    "KKK....................KKK..",
    "KnnKK................KKnnK..",
    "KnNNnKK............KKnnNnK..",
    "KNNNNNnKK........KKnnNNNNK..",
    ".KNNNNNNnKKKKKKKKnnNNNNNK...",
    "..KKNNNNNNNNNNNNNNNNNNKK....",
    "....KNRRHHHHHHHHRRNNNK......",
    "....KNRWHHHHHHHHRRNNNK......",
    "...KNRRKRHHHHHRKRNNNK.......",
    "...KNRRRRRRRRRRRRNNNK.......",
    "..KNRRRRRRRRRRRRRNNNK.......",
    "..KNRRRRNNnNNRRRNNNK........",
    "...KRRRNNNNNNnRRRNK.........",
    "....KRK......KRK............",
    "..KRnK........KnRK..........",
    "..KNK..........KNK..........",
    ".KNK............KNK.........",
    ".KK..............KK.........",
    "............................"
  ];

  var KUWAGAMON_WALK1 = [
    "............................",
    "KKK....................KKK..",
    "KnnKK................KKnnK..",
    "KnNNnKK............KKnnNnK..",
    "KNNNNNnKK........KKnnNNNNK..",
    ".KNNNNNNnKKKKKKKKnnNNNNNK...",
    "..KKNNNNNNNNNNNNNNNNNNKK....",
    "....KNRRHHHHHHHHRRNNNK......",
    "....KNRWHHHHHHHHRRNNNK......",
    "...KNRRKRHHHHHRKRNNNK.......",
    "...KNRRRRRRRRRRRRNNNK.......",
    "..KNRRRRRRRRRRRRRNNNK.......",
    "..KNRRRRNNnNNRRRNNNK........",
    "...KRRRNNNNNNnRRRNK.........",
    "....KRK......KRK............",
    "....KRnK....KnRK............",
    ".....KNK....KNK.............",
    "......KNK..KNK..............",
    "......KK....KK..............",
    "............................"
  ];

  var TAMER_IDLE0 = [
    "......KKKK........",
    ".....KnnnnK.......",
    "....KnKWWKWK......",
    "....KnKUUKUK......",
    "....KnnWHHnK......",
    ".....KnnnnK.......",
    "......KCCK........",
    ".....KODDOK.......",
    "....KOoYYoOK......",
    "....KOOOOoK.......",
    "...KOoK.KOoK......",
    "...KYK..KOOK......",
    "....KK..KCCK......",
    "......K.K.K.......",
    "......KK.KK.......",
    "......K...K......."
  ];
  var TAMER_IDLE1 = [
    "......KKKK........",
    ".....KnnnnK.......",
    "....KnKWWKWK......",
    "....KnKUUKUK......",
    "....KnnWHHnK......",
    ".....KnnnnK.......",
    "......KCCK........",
    ".....KODDOK.......",
    "....KOoYYoOK......",
    "....KOOOOoK.......",
    "...KOoK.KOoK......",
    "...KYK..KOOK......",
    "....KK..KCCK......",
    "......KK.K........",
    "......K...K.......",
    ".................."
  ];
  var TAMER_WALK0 = [
    "......KKKK........",
    ".....KnnnnK.......",
    "....KnKWWKWK......",
    "....KnKUUKUK......",
    "....KnnWHHnK......",
    ".....KnnnnK.......",
    "......KCCK........",
    ".....KODDOK.......",
    "....KOoYYoOK......",
    "....KOOOOoK.......",
    "...KOoK.KOoK......",
    "...KYK..KOOK......",
    "....KK..KCCKK.....",
    "......K.K...K.....",
    "......KK..........",
    ".................."
  ];
  var TAMER_WALK1 = [
    "......KKKK........",
    ".....KnnnnK.......",
    "....KnKWWKWK......",
    "....KnKUUKUK......",
    "....KnnWHHnK......",
    ".....KnnnnK.......",
    "......KCCK........",
    ".....KODDOK.......",
    "....KOoYYoOK......",
    "....KOOOOoK.......",
    "...KOoK.KOoK......",
    "...KYK..KOK.......",
    "....KK.KCCK.......",
    ".....K.K..KK......",
    "..........K.......",
    ".................."
  ];
  var FISH = [
    "..KKKK......",
    ".KUUUUK.....",
    "KUWUUbUKKK..",
    "KUUUUUUbWK..",
    ".KUbUUbUK...",
    "..KKUKKK....",
    "....KK......"
  ];
  var BERRY = [
    "....KK......",
    "...KGgK.....",
    "..KKGGKK....",
    ".KMMWMMK....",
    "KMWMMPPMK...",
    "KMMPPPPMK...",
    ".KMPPpPK....",
    "..KMMMKK....",
    "...KKK......"
  ];
  var SWEAT = [
    ".KW.",
    "KWWK",
    "KUUK",
    ".KK."
  ];

  var FORMS = {
    agumon: { idle: [AGUMON_IDLE0, AGUMON_IDLE1], walk: [AGUMON_WALK0, AGUMON_WALK1], spread: 1 },
    greymon: { idle: [GREYMON_IDLE0, GREYMON_IDLE1], walk: [GREYMON_WALK0, GREYMON_WALK1], spread: 1.45 },
    metalgreymon: { idle: [METALGREYMON_IDLE0, METALGREYMON_IDLE1], walk: [METALGREYMON_WALK0, METALGREYMON_WALK1], spread: 1.55 },
    wargreymon: { idle: [WARGREYMON_IDLE0, WARGREYMON_IDLE1], walk: [WARGREYMON_WALK0, WARGREYMON_WALK1], spread: 1.55 },
    numemon: { idle: [NUMEMON_IDLE0, NUMEMON_IDLE1], walk: [NUMEMON_WALK0, NUMEMON_WALK1], spread: 1.4 },
    gabumon: { idle: [GABUMON_IDLE0, GABUMON_IDLE1], walk: [GABUMON_WALK0, GABUMON_WALK1], spread: 1 },
    garurumon: { idle: [GARURUMON_IDLE0, GARURUMON_IDLE1], walk: [GARURUMON_WALK0, GARURUMON_WALK1], spread: 1.6 },
    weregarurumon: { idle: [WEREGARURUMON_IDLE0, WEREGARURUMON_IDLE1], walk: [WEREGARURUMON_WALK0, WEREGARURUMON_WALK1], spread: 1.35 },
    metalgarurumon: { idle: [METALGARURUMON_IDLE0, METALGARURUMON_IDLE1], walk: [METALGARURUMON_WALK0, METALGARURUMON_WALK1], spread: 1.6 }
  };

  var FOES = {
    pagumon: { idle: [PAGUMON_IDLE0, PAGUMON_IDLE1], walk: [PAGUMON_WALK0, PAGUMON_WALK1], spread: 0.85 },
    gazimon: { idle: [GAZIMON_IDLE0, GAZIMON_IDLE1], walk: [GAZIMON_WALK0, GAZIMON_WALK1], spread: 1.15 },
    demidevimon: { idle: [DEMIDEVIMON_IDLE0, DEMIDEVIMON_IDLE1], walk: [DEMIDEVIMON_WALK0, DEMIDEVIMON_WALK1], spread: 1.1, fly: true },
    kuwagamon: { idle: [KUWAGAMON_IDLE0, KUWAGAMON_IDLE1], walk: [KUWAGAMON_WALK0, KUWAGAMON_WALK1], spread: 2.1 }
  };

  function catalogOf(id) {
    return FORMS[id] || FOES[id] || FORMS.agumon;
  }

  /* ---------- Shinies ----------
   * A shiny is a real palette swap, not a tint. The sprite's colours are
   * sorted into its main colour (most of the body), its second colour
   * (stripes, markings, armour) and the rest; each group moves to a new hue
   * of its own while every pixel keeps its light and shade. The pair of
   * hues is chosen per Digimon from combinations that set each other off
   * (lime with purple, hot pink with teal...), skipping any too close to
   * what it already wears. Outlines, eyes, claws and teeth are left alone.
   * A mostly grey or white Digimon has its pale parts coloured instead. */
  var SHINY_PAIRS = [[95, 280], [325, 175], [185, 28], [270, 55], [48, 215], [355, 185], [160, 315], [215, 18], [300, 80], [28, 250]];
  var shinyOn = false, shinyMaps = {};
  function setShiny(on) { shinyOn = !!on; }
  function hueDist(a, b) { var d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }
  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s2 = 0, d = mx - mn;
    if (d > 1e-6) {
      s2 = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : (mx === g ? (b - r) / d + 2 : (r - g) / d + 4);
      h *= 60;
    }
    return [h, s2, l];
  }
  function hsl2rgb(h, s2, l) {
    h = ((h % 360) + 360) % 360 / 360;
    function f(p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : (t < 0.5 ? q : (t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p)); }
    if (s2 < 1e-6) return [l * 255, l * 255, l * 255];
    var q = l < 0.5 ? l * (1 + s2) : l + s2 - l * s2, p = 2 * l - q;
    return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255];
  }
  function strHash(str) { var h = 2166136261, i; for (i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; } return h; }
  /* read a sprite's colours once and decide where each group goes */
  function shinyMapFor(id, src) {
    if (shinyMaps[id] !== undefined) return shinyMaps[id];
    var m = makeCanvas(src.width, src.height), d, i, hsl, bins = [], tot = 0, sat = 0, opaque = 0, k, best, w, j;
    m.ctx.drawImage(src, 0, 0);
    try { d = m.ctx.getImageData(0, 0, src.width, src.height).data; } catch (e) { return (shinyMaps[id] = null); }
    for (i = 0; i < 36; i++) bins[i] = 0;
    for (i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 128) continue;
      opaque++;
      hsl = rgb2hsl(d[i], d[i + 1], d[i + 2]);
      /* "is it a colour at all" goes by chroma: near-white fur has a high HSL saturation but hardly any colour */
      if ((Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2])) / 255 < 0.15 || hsl[2] < 0.12 || hsl[2] > 0.93) continue;
      bins[Math.floor(hsl[0] / 10) % 36] += hsl[1]; tot += hsl[1]; sat++;
    }
    function peak() {
      best = -1; w = 0;
      for (k = 0; k < 36; k++) { var v = bins[(k + 35) % 36] * 0.6 + bins[k] + bins[(k + 1) % 36] * 0.6; if (v > w) { w = v; best = k; } }
      if (best < 0 || w <= 0) return null;
      var share = 0;
      for (j = -3; j <= 3; j++) { share += bins[(best + j + 36) % 36]; bins[(best + j + 36) % 36] = 0; }
      return { hue: best * 10 + 5, share: tot ? share / tot : 0 };
    }
    var main = peak(), second = peak();
    if (second && second.share < 0.07) second = null;
    var h0 = strHash(id), pair = null, tries;
    for (tries = 0; tries < SHINY_PAIRS.length; tries++) {
      pair = SHINY_PAIRS[(h0 + tries) % SHINY_PAIRS.length];
      if (!main || (hueDist(pair[0], main.hue) >= 55 && (!second || hueDist(pair[1], second.hue) >= 35))) break;
    }
    return (shinyMaps[id] = { main: main, second: second, a: pair[0], b: pair[1], pale: !main || (opaque ? sat / opaque : 0) < 0.35, twist: 40 + (h0 % 5) * 25 });
  }
  function shinyCanvas(id, src) {
    var map = shinyMapFor(id, (official[id] && official[id].idle && official[id].idle[0]) || src);
    if (!map) return src;
    var m = makeCanvas(src.width, src.height), img, d, i, hsl, h, s2, l, rgbv;
    m.ctx.drawImage(src, 0, 0);
    try { img = m.ctx.getImageData(0, 0, src.width, src.height); } catch (e) { return src; }
    d = img.data;
    for (i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 8) continue;
      hsl = rgb2hsl(d[i], d[i + 1], d[i + 2]); h = hsl[0]; s2 = hsl[1]; l = hsl[2];
      if (l < 0.12) continue;                                   /* outlines stay */
      if ((Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2])) / 255 < 0.15 || l > 0.93) {
        /* greys and whites: only coloured on a Digimon that is mostly grey or white */
        if (!map.pale || l < 0.3 || l > 0.965) continue;
        h = map.a; s2 = l > 0.85 ? 0.7 : 0.5;
      } else if (map.main && hueDist(h, map.main.hue) <= 32) {
        h = map.a + (h - map.main.hue) * 0.8; s2 = Math.min(1, s2 * 1.12 + 0.05);
      } else if (map.second && hueDist(h, map.second.hue) <= 32) {
        h = map.b + (h - map.second.hue) * 0.8; s2 = Math.min(1, s2 * 1.15 + 0.06);
      } else if (map.pale && map.main) {
        h = map.b + (h - map.main.hue) * 0.5;
      } else {
        h = h + (map.main ? map.a - map.main.hue : 120) + map.twist;   /* the small details shift along with it */
      }
      rgbv = hsl2rgb(h, s2, l);
      d[i] = rgbv[0]; d[i + 1] = rgbv[1]; d[i + 2] = rgbv[2];
    }
    m.ctx.putImageData(img, 0, 0);
    return m.canvas;
  }

  function getSheet(id, anim, fi, flash) {
    var off = official[id];
    var frames, idx, key, src;
    if (off && ((off[anim] && off[anim][0]) || (off.idle && off.idle[0]))) {
      frames = (off[anim] && off[anim][0]) ? off[anim] : off.idle;
      idx = ((fi % frames.length) + frames.length) % frames.length;
      src = frames[idx] || frames[0];
      if (src) {
        key = "off:" + id + ":" + anim + ":" + idx + ":" + (flash ? 1 : 0) + (shinyOn ? ":sh" : "");
        if (!sheets[key]) {
          if (shinyOn) { var shk = "off:" + id + ":" + anim + ":" + idx + ":0:sh"; if (!sheets[shk]) sheets[shk] = shinyCanvas(id, src); src = sheets[shk]; }
          sheets[key] = flash ? flashCanvas(src) : src;
        }
        return sheets[key];
      }
    }
    var cat = catalogOf(id);
    frames = cat[anim] || cat.idle;
    idx = ((fi % frames.length) + frames.length) % frames.length;
    key = id + ":" + anim + ":" + idx + ":" + (flash ? 1 : 0) + (shinyOn ? ":sh" : "");
    if (!sheets[key]) sheets[key] = shinyOn && !flash ? shinyCanvas(id, bake(frames[idx], false)) : bake(frames[idx], !!flash);
    return sheets[key];
  }

  function compatScale(scale) {
    if (scale == null || scale <= 0) return 1.55;
    if (scale > 1.8) return 1.35;
    return 1.55;
  }

  function animFrame(t, moving, fly, fps) {
    var speed = fps ? fps : (fly ? 10 : (moving ? 8 : 2.4));
    return Math.floor((t || 0) * speed);
  }

  /* How a walking Digimon carries its weight. The frames are played a touch
   * faster than the source rate, each one starts at its own point in the
   * cycle (so a pack is not marching in step), and the body gets a small hop,
   * a forward lean and a squash as it lands. Digimon with no real walk
   * frames get a bigger hop so they do not slide. */
  /* (Digimon with real walk frames get no extra hop or lean: their frames
   * already bounce, and nudging them a pixel or two several times a second
   * on top of that read as shaking. Only still-frame Digimon hop.) */
  var WALK_FEEL = { rate: 1.12, hop: 0, stillHop: 4, lean: 0, stillLean: 0, squash: 0, stillSquash: 0.08 };

  function walkInfo(id, t, moving, fly, phase, pace) {
    var off = official[id], cat, n, fps, still, cyc, tt;
    tt = (t || 0) + (phase ? ((phase * 0.377) % 1.9) : 0);
    if (off && off.walk && off.walk[0]) { n = off.walk.length; still = false; }
    else if (off && off.idle && off.idle[0]) { n = off.idle.length; still = true; }
    else { cat = catalogOf(id); n = (cat.walk || cat.idle || [0]).length; still = n <= 2; }
    fps = (off && off.fps) || 8;
    if (moving && !fly) fps *= WALK_FEEL.rate * (pace || 1);
    cyc = still ? 2.3 * (pace || 1) : fps / Math.max(1, n);
    return { tt: tt, fps: fps, still: still, cyc: cyc, steps: tt * cyc * 2 };
  }

  /* true on the frame a foot comes down (for dust) */
  function footfall(id, t, dt, phase, pace) {
    var w = walkInfo(id, t, true, false, phase, pace);
    return Math.floor(w.steps) !== Math.floor(w.steps - (dt || 0.016) * w.cyc * 2);
  }

  function drawCreature(ctx, id, x, y, facing, scale, t, flash, desperation, moving, phase, pace, tint) {
    if (!speciesReady(id) && atlasRec(id)) {
      loadAtlas(id);
      var ph = ensureHeight(id);
      shadow(ctx, x, y, Math.max(0.7, ph / 56), 0.3);
      ctx.save();
      ctx.fillStyle = flash ? "#fff" : "#8892a4";
      ctx.beginPath();
      ctx.ellipse(Math.round(x), Math.round(y - ph * 0.45), Math.max(6, ph * 0.35), Math.max(8, ph * 0.45), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    var cat = catalogOf(id);
    var fly = (global.DBH && global.DBH.ENEMIES && global.DBH.ENEMIES[id] && global.DBH.ENEMIES[id].fly) || cat.fly;
    var anim = moving || fly ? "walk" : "idle";
    var wk = walkInfo(id, t, moving, fly, phase, pace);
    var fi = animFrame(wk.tt, moving, fly, official[id] && official[id].fps ? wk.fps : 0);
    var sheet = getSheet(id, anim, fi, flash);
    if (tint && !flash) sheet = tintCanvas(sheet, tint);
    var stride = moving && !fly && wk.still;
    var air = stride ? Math.abs(Math.sin(wk.steps * Math.PI * 0.5)) : 0;
    var isOff = !!(official[id] && official[id].idle && official[id].idle.length);
    var mul = isOff ? officialDrawScale(id, scale) : compatScale(scale);
    var spread = isOff ? Math.max(0.7, sheet.width / 64) : (cat.spread || 1);
    shadow(ctx, x, y, spread * Math.min(mul, 2) * 0.55 * (1 - air * (wk.still ? 0.16 : 0.07)), desperation ? 0.5 : 0.32);
    if (desperation) {
      var pulse = 1 + Math.sin((t || 0) * 9) * 0.14;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.4 + Math.sin((t || 0) * 11) * 0.12;
      ctx.fillStyle = "#ff6a18";
      ctx.beginPath();
      ctx.ellipse(Math.round(x), Math.round(y) - 10 * mul, 20 * pulse * mul * cat.spread, 24 * pulse * mul, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd060";
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.ellipse(Math.round(x), Math.round(y) - 10 * mul, 12 * pulse * mul, 14 * pulse * mul, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    var squashX = flash ? 1.14 : 1;
    var squashY = flash ? 0.86 : 1;
    var bob;
    if (isOff && official[id].idle && official[id].idle.length > 1) bob = 0;
    else if (isOff) bob = Math.sin((t || 0) * 5) * (moving ? 0 : 1.5);
    else bob = (cat.fly ? Math.sin((t || 0) * 8) * 3 : Math.sin((t || 0) * 5) * (moving ? 0 : 1)) * mul;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (stride) {
      var land = Math.pow(1 - air, 3);
      var sq = 1 + (wk.still ? WALK_FEEL.stillSquash : WALK_FEEL.squash) * land - (wk.still ? 0.05 : 0.02) * air;
      squashX *= sq; squashY /= sq;
      bob -= air * (wk.still ? WALK_FEEL.stillHop : WALK_FEEL.hop) * Math.min(mul, 1.6);
    }
    ctx.translate(Math.round(x), Math.round(y + bob));
    ctx.scale((facing < 0 ? -1 : 1) * mul * squashX, mul * squashY);
    ctx.drawImage(sheet, Math.round(-sheet.width / 2), Math.round(-sheet.height + 5));
    ctx.restore();
  }

  function drawPartner(ctx, form, x, y, facing, scale, t, flash, desperation, moving, phase, pace) {
    drawCreature(ctx, form, x, y, facing, scale, t, flash, desperation, moving, phase, pace);
  }

  function drawEnemy(ctx, type, x, y, t, flash, facing, scale, phase, pace, tint) {
    drawCreature(ctx, type, x, y, facing, scale || 1, t, flash, false, true, phase, pace, tint);
  }

  var silCache = {};
  function drawSilhouette(ctx, id, x, y, scale) {
    var sheet = getSheet(id, "idle", 0, false);
    var baked = silCache[id];
    if (!baked || baked.src !== sheet) {
      var m = makeCanvas(sheet.width, sheet.height);
      m.ctx.drawImage(sheet, 0, 0);
      m.ctx.globalCompositeOperation = "source-atop";
      m.ctx.fillStyle = "#1a2840";
      m.ctx.fillRect(0, 0, sheet.width, sheet.height);
      baked = { src: sheet, canvas: m.canvas };
      silCache[id] = baked;
    }
    var mul = compatScale(scale);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(mul, mul);
    ctx.drawImage(baked.canvas, Math.round(-sheet.width / 2), Math.round(-sheet.height + 5));
    ctx.restore();
  }

  function itemCanvas(kind, frame) {
    var key = kind + ":" + (frame || 0);
    if (itemSheets[key]) return itemSheets[key];
    var FA = global.DBH && global.DBH.farmArt;
    var art = FA && FA.itemIcon && FA.itemIcon(kind);
    if (art) {
      /* Farm icons are 1 art px per canvas px; bake to the game's 3x. */
      var cv = document.createElement("canvas");
      cv.width = art.width * SCALE; cv.height = art.height * SCALE;
      var g2 = cv.getContext("2d");
      g2.imageSmoothingEnabled = false;
      g2.drawImage(art, 0, 0, cv.width, cv.height);
      itemSheets[key] = cv;
      return cv;
    }
    if (kind === "xp") itemSheets[key] = bake(frame ? XP1 : XP0, false);
    else if (kind === "bits") itemSheets[key] = getIcon("bits") || bake(TOY, false);
    else if (kind === "meat") itemSheets[key] = bake(MEAT, false);
    else if (kind === "fish") itemSheets[key] = bake(FISH, false);
    else if (kind === "berry") itemSheets[key] = bake(BERRY, false);
    else itemSheets[key] = bake(TOY, false);
    return itemSheets[key];
  }

  function drawItem(ctx, kind, x, y, t) {
    var frame = kind === "xp" ? (Math.floor((t || 0) * 6) % 2) : 0;
    var c = itemCanvas(kind, frame);
    var bob = Math.sin((t || 0) * 6 + x) * 2;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y + bob));
    if (kind === "xp" || kind === "bits" || kind === "heal") {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = kind === "bits" ? "#f0c020" : (kind === "heal" ? "#7cf0c0" : "#7cf0c0");
      ctx.beginPath();
      ctx.arc(0, 0, kind === "heal" ? 12 : 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }
    if (kind === "heal") {
      ctx.fillStyle = "#2e8a58";
      ctx.fillRect(-3, -9, 6, 18);
      ctx.fillRect(-9, -3, 18, 6);
      ctx.fillStyle = "#b8ffd0";
      ctx.fillRect(-2, -8, 4, 16);
      ctx.fillRect(-8, -2, 16, 4);
      ctx.restore();
      return;
    }
    ctx.drawImage(c, Math.round(-c.width / 2), Math.round(-c.height / 2));
    ctx.restore();
  }

  function drawXpOrb(ctx, x, y, t) { drawItem(ctx, "xp", x, y, t); }
  function drawMeat(ctx, x, y, t) { drawItem(ctx, "meat", x, y, t); }
  function drawFish(ctx, x, y, t) { drawItem(ctx, "fish", x, y, t); }
  function drawBerry(ctx, x, y, t) { drawItem(ctx, "berry", x, y, t); }
  function drawToy(ctx, x, y, t) { drawItem(ctx, "toy", x, y, t); }
  function drawHeal(ctx, x, y, t) { drawItem(ctx, "heal", x, y, t); }
  function drawPickup(ctx, kind, x, y, t) { drawItem(ctx, kind, x, y, t); }

  function decorRows(kind) {
    if (kind === 1 || kind === "rock") return ROCK;
    if (kind === 2 || kind === "shrine") return SHRINE;
    if (kind === "monolith") return MONOLITH;
    if (kind === "tallgrass") return TALLGRASS;
    if (kind === "flower") return FLOWER;
    if (kind === "flower2") return FLOWER2;
    return TREE;
  }

  function decorCanvas(kind) {
    /* Nov 16: every field prop is painted by js/terrain-art.js at one pixel scale; the 3x art below is the fallback */
    var TA = global.DBH && global.DBH.terrainArt, base = TA && TA.has(kind) ? TA.canvas(kind) : null;
    if (base) {
      var sn = global.DBH.world && global.DBH.world.season, SS = global.DBH.seasons, sk = "ta:" + kind + "@" + sn;
      if (!sn || sn === "summer" || !SS || !SS.recolorProp || TA.NOSEASON[kind]) return base;
      if (!decorSheets[sk]) decorSheets[sk] = SS.recolorProp(base, kind.indexOf("meadow") === 0 ? "tallgrass" : kind, sn);
      return decorSheets[sk];
    }
    /* biome props (cactus, pole, crystal, server...) are drawn by js/biomes.js */
    var BI = global.DBH && global.DBH.biomes, custom = BI && BI.customProp && (BI.ART[kind] || kind === "snowtree" || kind === "snowrock") ? BI.customProp(kind) : null;
    if (custom) return custom;
    if (!decorSheets[kind]) decorSheets[kind] = bake(decorRows(kind), false);
    var season = global.DBH && global.DBH.world && global.DBH.world.season;
    var S = global.DBH && global.DBH.seasons;
    if (!season || season === "summer" || !S || !S.recolorProp) return decorSheets[kind];
    var key = kind + "@" + season;
    if (!decorSheets[key]) decorSheets[key] = S.recolorProp(decorSheets[kind], kind, season);
    return decorSheets[key];
  }

  function basePropCanvas(kind) {
    if (!decorSheets[kind]) decorSheets[kind] = bake(decorRows(kind), false);
    return decorSheets[kind];
  }
  function getProp(kind) {
    return decorCanvas(kind);
  }

  function propSpread(kind) {
    var TA = global.DBH && global.DBH.terrainArt;
    if (TA && TA.SPREAD[kind] != null) return TA.SPREAD[kind];
    if (kind === "tree" || kind === 0) return 1.2;
    if (kind === "monolith") return 1.05;
    if (kind === "shrine" || kind === 2) return 0.95;
    if (kind === "tallgrass") return 0.7;
    if (kind === "rock" || kind === 1) return 0.85;
    if (global.DBH && global.DBH.biomes && global.DBH.biomes.SPREAD[kind]) return global.DBH.biomes.SPREAD[kind];
    return 0.45;
  }

  function drawDecor(ctx, x, y, kind) {
    drawProp(ctx, kind, x, y);
  }

  function drawProp(ctx, kind, x, y) {
    var c = decorCanvas(kind), sp = propSpread(kind);
    if (sp > 0) shadow(ctx, x, y, sp, 0.3);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height + 6));
    ctx.restore();
  }

  function tileCanvas(kind) {
    if (tiles[kind]) return tiles[kind];
    var rows = TILE_GRASS_A;
    if (kind === 1) rows = TILE_GRASS_B;
    else if (kind === 2) rows = TILE_DIRT;
    else if (kind === 3) rows = TILE_RAISED;
    tiles[kind] = bake(rows, false);
    return tiles[kind];
  }

  function drawTile(ctx, x, y, kind) {
    var c = tileCanvas(kind);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(c, Math.round(x), Math.round(y));
  }

  function getIcon(name) {
    if (icons[name]) return icons[name];
    var rows = ICO[name];
    if (!rows) return null;
    icons[name] = bake(rows, false);
    return icons[name];
  }

  function drawIcon(ctx, name, x, y, mul) {
    var c = getIcon(name);
    if (!c) return;
    mul = mul || 1;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(c, Math.round(x), Math.round(y), Math.round(c.width * mul), Math.round(c.height * mul));
    ctx.restore();
  }

  function drawGlyph(ctx, ch, x, y, px, color) {
    var g = GLYPH[ch] || GLYPH[" "];
    var i, j;
    ctx.fillStyle = color || C.Y;
    for (i = 0; i < g.length; i++) {
      for (j = 0; j < g[i].length; j++) {
        if (g[i].charAt(j) === "X") ctx.fillRect(x + j * px, y + i * px, px, px);
      }
    }
  }

  function drawWord(ctx, text, x, y, px, color, gap) {
    var i, ch, w = 5, advance = (w + (gap || 1)) * px;
    for (i = 0; i < text.length; i++) {
      ch = text.charAt(i);
      drawGlyph(ctx, ch, x + i * advance, y, px, color);
    }
    return text.length * advance;
  }

  function drawLogo(ctx, w, h, t) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#071018";
    ctx.fillRect(0, 0, w, h);
    var px = Math.max(3, Math.floor(w / 92));
    var title = "DIGIMON";
    var tw = title.length * 6 * px;
    var x0 = Math.round((w - tw) / 2);
    var y0 = Math.round(h * 0.18);
    drawWord(ctx, title, x0 + px, y0 + px, px, "#3a1808", 1);
    drawWord(ctx, title, x0, y0, px, C.Y, 1);
    var sub = "BULLET HEAVEN";
    var sp = Math.max(2, px - 1);
    var sw = sub.length * 6 * sp;
    drawWord(ctx, sub, Math.round((w - sw) / 2), y0 + 6 * px + 8, sp, C.O, 1);
    drawCreature(ctx, "agumon", w * 0.5, h * 0.82, 1, 1.15, t || 0, false, false, false);
    ctx.restore();
  }

  function paintPreview(ctx, w, h) {
    var names = [
      "agumon", "greymon", "metalgreymon", "wargreymon", "numemon",
      "gabumon", "garurumon", "weregarurumon", "metalgarurumon",
      "pagumon", "gazimon", "demidevimon", "kuwagamon"
    ];
    var labels = [
      "Agumon", "Greymon", "MetalGreymon", "WarGreymon", "Numemon",
      "Gabumon", "Garurumon", "WereGarurumon", "MetalGarurumon",
      "Pagumon", "Gazimon", "DemiDevimon", "Kuwagamon"
    ];
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#0b1622";
    ctx.fillRect(0, 0, w, h);
    var colW = w / 5;
    var rowH = (h - 70) / 3;
    var i, x, y, id;
    ctx.fillStyle = C.Y;
    ctx.font = "bold 22px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Digital Coliseum  —  Sprite Sheet (WIP)", w / 2, 36);
    drawTamer(ctx, 70, 48, 1, 0.2, false, false, true);
    ctx.fillStyle = "#e8f0f8";
    ctx.font = "12px Trebuchet MS, sans-serif";
    ctx.fillText("Tamer", 70, 62);

    for (i = 0; i < names.length; i++) {
      id = names[i];
      x = (i % 5) * colW + colW / 2;
      y = 70 + Math.floor(i / 5) * rowH + rowH * 0.68;
      ctx.fillStyle = "rgba(8,20,28,0.7)";
      ctx.fillRect((i % 5) * colW + 10, 54 + Math.floor(i / 5) * rowH, colW - 20, rowH - 16);
      drawCreature(ctx, id, x, y, 1, 1, 0.2, false, false, false);
      ctx.fillStyle = "#e8f0f8";
      ctx.font = "13px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(labels[i], x, y + 18);
    }
  }

  function drawParallax(ctx, camX, camY, viewW, viewH, t, reduced) {
    var g = ctx.createLinearGradient(0, 0, 0, viewH);
    g.addColorStop(0, "#08101c");
    g.addColorStop(0.4, "#0c1a24");
    g.addColorStop(1, "#10241c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, viewW, viewH);
    var i, seed, px, py, w;
    /* Distant ridge silhouettes — slow parallax, few shapes, no grid noise. */
    ctx.fillStyle = "rgba(10, 28, 36, 0.55)";
    for (i = 0; i < 5; i++) {
      seed = i * 173.7;
      w = 180 + (seed % 160);
      px = ((seed * 13 - camX * 0.08) % (viewW + w)) - w * 0.4;
      py = viewH * 0.42 + (i % 3) * 16;
      ctx.beginPath();
      ctx.ellipse(px, py, w, 28 + (i % 3) * 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (reduced) return;
    ctx.fillStyle = "rgba(200, 230, 240, 0.28)";
    for (i = 0; i < 18; i++) {
      seed = i * 97.13;
      px = ((seed * 53 + camX * 0.05) % (viewW + 40)) - 20;
      py = ((seed * 17) % (viewH * 0.45));
      ctx.fillRect(Math.round(px), Math.round(py), i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
    }
  }

  function drawVignette(ctx, viewW, viewH, desperation, t) {
    var light = ctx.createRadialGradient(viewW * 0.2, viewH * 0.12, 8, viewW * 0.2, viewH * 0.12, Math.max(viewW, viewH) * 0.85);
    light.addColorStop(0, "rgba(255, 236, 196, 0.08)");
    light.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, viewW, viewH);
    var vg = ctx.createRadialGradient(viewW / 2, viewH / 2, Math.min(viewW, viewH) * 0.32, viewW / 2, viewH / 2, Math.max(viewW, viewH) * 0.78);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(10,12,8,0.42)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, viewW, viewH);
    if (desperation) {
      var pulse = 0.28 + Math.sin((t || 0) * 8) * 0.08;
      var dg = ctx.createRadialGradient(viewW / 2, viewH / 2, Math.min(viewW, viewH) * 0.2, viewW / 2, viewH / 2, Math.max(viewW, viewH) * 0.7);
      dg.addColorStop(0, "rgba(0,0,0,0)");
      dg.addColorStop(1, "rgba(160,20,0," + pulse + ")");
      ctx.fillStyle = dg;
      ctx.fillRect(0, 0, viewW, viewH);
    }
  }


  var eggArt = {};
  var eggReady = false;
  var EGG_TARGET_H = 30;

  /* Each line's egg comes in ten shell patterns (dots, spots, stripes,
   * zigzag, flames, stars, patches, sash, diamonds, cracked), drawn by
   * scripts/art/make_eggs.py. One is rolled per line; rollEggPattern() rolls
   * again. A missing picture just falls back to the plain egg. */
  var EGG_PATTERNS = 10;
  var eggPattern = {};
  function allEggFrames() {
    var list = (global.DBH && global.DBH.EGGS) || [], out = [], i;
    for (i = 0; i < list.length; i++) if (list[i].frame) out.push(list[i].frame);
    return out.length ? out : ["egg_08", "egg_09"];
  }
  /* Shell pictures are fetched the first time an egg is shown (there are a
   * couple of hundred); until one arrives the plain egg stands in. */
  var eggAsked = {};
  function eggSheet(frameId, pat) {
    var key = frameId + "_p" + pat;
    if (eggArt[key]) return eggArt[key];
    if (!eggAsked[key]) {
      eggAsked[key] = 1;
      loadImage("assets/sprites/frames/digiegg/" + key + ".png").then(function (img) { eggArt[key] = canvasFromImage(img); }).catch(function () {});
    }
    return eggArt[frameId] || eggArt.egg_08;
  }
  function rollEggPattern(frameId) {
    var ids = frameId ? [frameId] : allEggFrames(), i, n;
    for (i = 0; i < ids.length; i++) {
      do { n = Math.floor(Math.random() * EGG_PATTERNS); } while (EGG_PATTERNS > 1 && n === eggPattern[ids[i]]);
      eggPattern[ids[i]] = n;
    }
    return frameId ? eggPattern[frameId] : null;
  }
  rollEggPattern();

  function loadEggSprites() {
    var ids = ["egg_08", "egg_09"];
    var jobs = ids.map(function (id) {
      return loadImage("assets/sprites/frames/digiegg/" + id + ".png").then(function (img) {
        var c = canvasFromImage(img);
        eggArt[id] = c;
      }).catch(function (err) { if (id.indexOf("_p") < 0) throw err; });
    });
    return Promise.all(jobs).then(function () { eggReady = true; return true; }).catch(function (err) {
      console.warn("Egg frames failed to load:", err);
      eggReady = Object.keys(eggArt).length > 0;
    });
  }

  function drawEgg(ctx, frameId, x, y, t, flash, hatchTense, variant) {
    var pat = variant != null ? ((variant % EGG_PATTERNS) + EGG_PATTERNS) % EGG_PATTERNS : eggPattern[frameId];
    if (pat == null) pat = rollEggPattern(frameId);
    var sheet = eggSheet(frameId, pat);
    var bob = Math.sin((t || 0) * 6) * 2;
    var tilt = Math.sin((t || 0) * 7.5) * (hatchTense ? 0.22 : 0.1);
    var squash = 1 + Math.sin((t || 0) * 12) * (hatchTense ? 0.08 : 0.04);
    shadow(ctx, x, y, 0.7, 0.28);
    if (!sheet) {
      ctx.save();
      ctx.fillStyle = flash ? "#fff" : "#e88928";
      ctx.beginPath();
      ctx.ellipse(Math.round(x), Math.round(y - 16 + bob), 10, 14, tilt, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    var targetH = EGG_TARGET_H;
    var mul = targetH / sheet.height;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y + bob));
    ctx.rotate(tilt);
    ctx.scale(mul * (flash ? 1.08 : 1) * squash, mul * (flash ? 0.92 : 1) / squash);
    ctx.drawImage(sheet, Math.round(-sheet.width / 2), Math.round(-sheet.height + 2));
    ctx.restore();
  }

  var TAMER_SET = { idle: [TAMER_IDLE0, TAMER_IDLE1], walk: [TAMER_WALK0, TAMER_WALK1], spread: 0.85 };

  /* The playable characters are eight hologram projections of a tamer on
   * the other side of the screen: one slim figure, told apart by colour
   * alone. Drawn by scripts/art/make_tamers.py: 40x56 frames, six-step walk
   * in each view. (The earlier blob ghosts: that script with --ghosts.)
   * (The human tamers are still in that script's TAMERS table, and the old
   * Digimon World 3 frames in assets/, but neither is offered.) */
  /* The projections have no names of their own: the player's profile name is the
   * character's name. `name` here is only the colour, shown on the select screen. */
  var TAMER_IDS = [
    { id: "byte", name: "Cyan", blurb: "" },
    { id: "glim", name: "Pink", blurb: "" },
    { id: "zap", name: "Lime", blurb: "" },
    { id: "ember", name: "Amber", blurb: "" },
    { id: "nyx", name: "Violet", blurb: "" },
    { id: "null", name: "White", blurb: "" },
    { id: "rune", name: "Red", blurb: "" },
    { id: "echo", name: "Blue", blurb: "" }
  ];
  var TAMER_FRAME_DIRS = { down: { idle: 2, walk: 6 }, up: { idle: 2, walk: 6 }, side: { idle: 2, walk: 6 } };
  var tamerPacks = {};
  var tamerReady = false;

  function emptyTamerPack() {
    return { down: { idle: [], walk: [] }, up: { idle: [], walk: [] }, side: { idle: [], walk: [] } };
  }

  function loadOneTamer(id) {
    var pack = emptyTamerPack();
    var jobs = [];
    function queue(d, an, count) {
      var i;
      for (i = 0; i < count; i++) {
        (function (dir2, an2, idx) {
          var path = "assets/sprites/frames/tamers/" + id + "/" + dir2 + "_" + an2 + "_" + idx + ".png";
          jobs.push(loadImage(path).then(function (img) {
            var c = canvasFromImage(img);
            pack[dir2][an2][idx] = c;
            pack[dir2][an2][idx + "_flash"] = flashCanvas(c);
          }));
        })(d, an, i);
      }
    }
    var dir;
    for (dir in TAMER_FRAME_DIRS) {
      queue(dir, "idle", TAMER_FRAME_DIRS[dir].idle);
      queue(dir, "walk", TAMER_FRAME_DIRS[dir].walk);
    }
    return Promise.all(jobs).then(function () {
      tamerPacks[id] = pack;
      return true;
    });
  }

  function loadTamerSprites() {
    return Promise.all(TAMER_IDS.map(function (t) { return loadOneTamer(t.id); })).then(function () {
      tamerReady = true;
      return true;
    }).catch(function (err) {
      console.warn("Tamer frames failed to load, using baked fallback:", err);
      tamerReady = TAMER_IDS.some(function (t) { return !!tamerPacks[t.id]; });
    });
  }

  function getTamerFrame(tamerId, dir, anim, fi, flash) {
    var art = tamerPacks[tamerId] || tamerPacks[TAMER_IDS[0].id];
    if (!art) return null;
    var pack = art[dir] || art.side;
    var frames = pack[anim] || pack.idle;
    if (!frames || !frames.length) return null;
    var idx = ((fi % frames.length) + frames.length) % frames.length;
    return flash ? (frames[idx + "_flash"] || frames[idx]) : frames[idx];
  }

  function getTamerList() { return TAMER_IDS.slice(); }

  function hasTamer(id) { return !!(id && tamerPacks[id]); }

  function getTamerSheet(anim, fi, flash) {
    var frames = TAMER_SET[anim] || TAMER_SET.idle;
    var idx = ((fi % frames.length) + frames.length) % frames.length;
    var key = "tamer:" + anim + ":" + idx + ":" + (flash ? 1 : 0);
    if (!sheets[key]) sheets[key] = bake(frames[idx], !!flash);
    return sheets[key];
  }

  function drawTamer(ctx, x, y, facing, t, flash, moving, evoReady, tdir, tamerId) {
    var anim = moving ? "walk" : "idle";
    /* six frames at 7 a second: an easy drift, not a flutter */
    var fi = animFrame(t, moving, false, moving ? 7 : 2.4);
    var dir = (tdir === "up" || tdir === "down" || tdir === "side") ? tdir : "side";
    var sheet = tamerReady ? getTamerFrame(tamerId, dir, anim, fi, flash) : null;
    var usedNew = !!sheet;
    if (!sheet) sheet = getTamerSheet(anim, fi, flash);
    /* Official DW3 frames are pre-scaled to ~56px standing height. Fallback is the old 18x16 bake at 1.45. */
    var mul = usedNew ? 1 : 1.45;
    var spread = usedNew ? 1.05 : TAMER_SET.spread * mul;
    shadow(ctx, x, y, spread, 0.3);
    if (evoReady) {
      var pulse = 1 + Math.sin((t || 0) * 10) * 0.15;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.45 + Math.sin((t || 0) * 12) * 0.15;
      ctx.fillStyle = "#ffd24a";
      ctx.beginPath();
      ctx.ellipse(Math.round(x + (facing < 0 ? -8 : 8) * mul), Math.round(y - 12 * (usedNew ? 1 : mul)), 9 * pulse, 9 * pulse, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    var squashX = flash ? 1.12 : 1;
    var squashY = flash ? 0.88 : 1;
    /* New walk/idle already bob in the frames; don't double-bob. */
    var bob = usedNew ? 0 : Math.sin((t || 0) * 5) * (moving ? 0 : 1) * mul;
    var flip = (!usedNew || dir === "side") && facing < 0;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y + bob));
    ctx.scale((flip ? -1 : 1) * mul * squashX, mul * squashY);
    ctx.drawImage(sheet, Math.round(-sheet.width / 2), Math.round(-sheet.height + 4));
    ctx.restore();
  }

  function drawSweat(ctx, x, y, t) {
    var c = sheets["sweat"];
    if (!c) { sheets["sweat"] = bake(SWEAT, false); c = sheets["sweat"]; }
    var bob = Math.sin((t || 0) * 8) * 2;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 0.9;
    ctx.drawImage(c, Math.round(x), Math.round(y + bob));
    ctx.restore();
  }

  function bakeAll() {
    var id, cat, a, f, anims, i;
    function bakeCat(map) {
      for (id in map) {
        cat = map[id];
        anims = ["idle", "walk"];
        for (a = 0; a < anims.length; a++) {
          if (!cat[anims[a]]) continue;
          for (f = 0; f < cat[anims[a]].length; f++) {
            getSheet(id, anims[a], f, false);
            getSheet(id, anims[a], f, true);
          }
        }
      }
    }
    bakeCat(FORMS);
    bakeCat(FOES);
    for (i = 0; i < 4; i++) tileCanvas(i);
    decorCanvas("tree"); decorCanvas("rock"); decorCanvas("shrine");
    decorCanvas("monolith"); decorCanvas("tallgrass"); decorCanvas("flower"); decorCanvas("flower2");
    decorCanvas(0); decorCanvas(1); decorCanvas(2);
    itemCanvas("xp", 0); itemCanvas("xp", 1); itemCanvas("meat", 0); itemCanvas("toy", 0);
    for (id in ICO) getIcon(id);
    getTamerSheet("idle", 0, false); getTamerSheet("idle", 1, false);
    getTamerSheet("walk", 0, false); getTamerSheet("walk", 1, true);
    itemCanvas("fish", 0); itemCanvas("berry", 0);
    sheets["sweat"] = bake(SWEAT, false);
  }

  try { bakeAll(); } catch (err) { console.error("Sprite bake failed:", err); }

  global.DBH = global.DBH || {};
  global.DBH.sprites = {
    SCALE: SCALE,
    colors: C,
    TILE: 16 * SCALE,
    makeCanvas: makeCanvas,
    bake: bake,
    bakePixels: bakePixels,
    setViewSize: setViewSize,
    getProp: getProp,
    basePropCanvas: basePropCanvas,
    setShiny: setShiny,
    shinyCanvas: shinyCanvas,
    getSheet: getSheet,
    drawProp: drawProp,
    officialScale: officialScale,
    bodyRadius: bodyRadius,
    visualHeight: visualHeight,
    drawPartner: drawPartner,
    drawTamer: drawTamer,
    drawSweat: drawSweat,
    drawFish: drawFish,
    drawBerry: drawBerry,
    drawPickup: drawPickup,
    drawEnemy: drawEnemy,
    drawSilhouette: drawSilhouette,
    drawXpOrb: drawXpOrb,
    drawMeat: drawMeat,
    drawToy: drawToy,
    drawHeal: drawHeal,
    drawDecor: drawDecor,
    drawTile: drawTile,
    drawIcon: drawIcon,
    getIcon: getIcon,
    drawLogo: drawLogo,
    drawWord: drawWord,
    paintPreview: paintPreview,
    drawParallax: drawParallax,
    drawVignette: drawVignette,
    bakeAll: bakeAll,
    loadOfficial: loadOfficialSprites,
    officialReady: function () { return officialReady; },
    loadAtlas: loadAtlas,
    preloadSpecies: preloadSpecies,
    speciesReady: speciesReady,
    ensureHeight: ensureHeight,
    footfall: footfall,
    atlasRec: atlasRec,
    loadTamer: loadTamerSprites,
    tamerReady: function () { return tamerReady; },
    loadEggs: loadEggSprites,
    eggReady: function () { return eggReady; },
    drawEgg: drawEgg,
    rollEggPattern: rollEggPattern,
    getTamerList: getTamerList,
    hasTamer: hasTamer,
    drawLegacyTamer: function (ctx, x, y, facing, t, flash, moving, evoReady) {
      var ready = tamerReady;
      tamerReady = false;
      drawTamer(ctx, x, y, facing, t, flash, moving, evoReady, "side");
      tamerReady = ready;
    },
    forms: FORMS,
    foes: FOES
  };
})(window);
