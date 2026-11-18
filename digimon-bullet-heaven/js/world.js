/* Digimon Bullet Heaven — seeded chunk terrain, autotiled edges, y-sorted props. */
(function (global) {
  "use strict";

  var D = global.DBH;
  var MAT = { GRASS: 0, PATH: 1, WATER: 2, CLIFF: 3 };
  var CHUNK = 8;
  var FACE_PX = 8;
  var CACHE_MAX = 72;
  var seed = 1;
  var cache = {};
  var cacheOrder = [];
  var tileCache = {};
  var ready = false;
  var C, SCALE, TILE, faceH;
  var season = "spring";

  /* Seasonal recolor of a ground pixel (see seasons.js). */
  function sz(col, kind, x, y, tx, ty) {
    var S = D.seasons;
    if (!S || !S.ground || (B && !B.seasonal)) return col;
    return S.ground(col, kind, season, hash2((tx * 17 + x) | 0, (ty * 23 + y) | 0, seed + 333));
  }

  function setSeason(id) {
    if (!id || id === season) return false;
    season = id;
    /* Re-bake lazily: chunks and tiles are rebuilt as they are drawn. */
    cache = {};
    cacheOrder = [];
    tileCache = {};
    return true;
  }

  function colors() {
    C = D.sprites.colors;
    SCALE = D.sprites.SCALE;
    TILE = D.sprites.TILE;
    faceH = FACE_PX * SCALE;
  }

  function u32(n) {
    return (n >>> 0);
  }

  function hash2(x, y, s) {
    var n = u32(x * 374761393 + y * 668265263 + (s == null ? seed : s) * 1274126177);
    n = u32((n ^ (n >>> 13)) * 1274126177);
    return n / 4294967296;
  }

  function fade(t) { return t * t * (3 - 2 * t); }

  function valueNoise(x, y, s) {
    var x0 = Math.floor(x), y0 = Math.floor(y);
    var fx = fade(x - x0), fy = fade(y - y0);
    var a = hash2(x0, y0, s);
    var b = hash2(x0 + 1, y0, s);
    var c = hash2(x0, y0 + 1, s);
    var d = hash2(x0 + 1, y0 + 1, s);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }

  function fbm(x, y, s) {
    var v = 0, a = 0.5, f = 1, i, n = 0;
    for (i = 0; i < 4; i++) {
      v += valueNoise(x * f, y * f, s + i * 19) * a;
      n += a;
      a *= 0.5;
      f *= 2.03;
    }
    return v / n;
  }

  /* ---------- Biomes (js/biomes.js): three slow noise fields pick one per tile ---------- */
  var BIOME_F = 0.014;            /* lower = bigger biomes (about 70 tiles across at this setting) */
  var B = null;                   /* the biome being painted right now */
  var matCache = {}, matCount = 0, bioCache = {}, bioCount = 0;
  function tkey(tx, ty) { return (tx + 1048576) * 2097152 + (ty + 1048576); }
  function spread(n) { n = (n - 0.5) * 2 + 0.5; return n < 0 ? 0 : (n > 1 ? 1 : n); }
  function defs() { return (D.biomes && D.biomes.DEFS) || null; }
  function biomeId(tx, ty) {
    var BI = D.biomes;
    if (!BI) return "plains";
    var k = tkey(tx, ty), v = bioCache[k];
    if (v) return v;
    /* a little per-tile jitter makes the borders ragged instead of ruled */
    var j = (hash2(tx, ty, seed + 777) - 0.5) * 0.05;
    var t = spread(fbm(tx * BIOME_F + 11.3, ty * BIOME_F - 7.7, seed + 500)) + j;
    var m = spread(fbm(tx * BIOME_F - 31.9, ty * BIOME_F + 23.1, seed + 600)) - j;
    var w = spread(fbm(tx * BIOME_F * 0.8 + 57.2, ty * BIOME_F * 0.8 + 91.4, seed + 700)) + j;
    v = BI.pick(t, m, w, distT(tx, ty) + j * 80);
    if (bioCount > 120000) { bioCache = {}; bioCount = 0; }
    bioCache[k] = v; bioCount++;
    return v;
  }
  function biomeDef(tx, ty) { var d = defs(); return d ? d[biomeId(tx, ty)] : null; }

  /* ---------- Lairs: where a biome's lord stands ----------
   * One candidate spot per LAIR_CELL x LAIR_CELL tiles. It is kept only if
   * it is open ground with the same biome all around it (so it sits inside
   * its country, not on a border) and well away from the start. */
  var LAIR_CELL = 56, LAIR_MIN = 38, lairCache = {};
  var LAIR_STONES = [[-3, -2], [3, -2], [-4, 1], [4, 1], [-2, 3], [2, 3]];
  function lairOfCell(cx, cy) {
    var key = cx + ":" + cy, v = lairCache[key], t, tx, ty, id, okk, a, i;
    if (v !== undefined) return v;
    v = null;
    for (t = 0; t < 4 && !v; t++) {
      tx = cx * LAIR_CELL + Math.floor(LAIR_CELL * (0.2 + 0.6 * hash2(cx * 7 + t, cy * 13, seed + 901)));
      ty = cy * LAIR_CELL + Math.floor(LAIR_CELL * (0.2 + 0.6 * hash2(cx * 11, cy * 5 + t, seed + 902)));
      if (distT(tx, ty) < LAIR_MIN) continue;
      id = biomeId(tx, ty); okk = true;
      for (i = 0; i < 8 && okk; i++) { a = (Math.PI * 2 * i) / 8; if (biomeId(Math.round(tx + Math.cos(a) * 8), Math.round(ty + Math.sin(a) * 8)) !== id) okk = false; }
      for (i = -1; i <= 1 && okk; i++) for (a = -1; a <= 1 && okk; a++) if (materialAt(tx + i, ty + a) === MAT.CLIFF || materialAt(tx + i, ty + a) === MAT.WATER) okk = false;
      if (okk) v = { key: key, tx: tx, ty: ty, biome: id };
    }
    lairCache[key] = v;
    return v;
  }
  /* lairs within r of a world position */
  function lairsNear(x, y, r) {
    if (!ready || !TILE) return [];
    var span = LAIR_CELL * TILE, c0 = Math.floor((x - r) / span), c1 = Math.floor((x + r) / span), d0 = Math.floor((y - r) / span), d1 = Math.floor((y + r) / span), out = [], cx, cy, l;
    for (cy = d0; cy <= d1; cy++) for (cx = c0; cx <= c1; cx++) {
      l = lairOfCell(cx, cy);
      if (l) out.push({ key: l.key, x: (l.tx + 0.5) * TILE, y: (l.ty + 0.5) * TILE, biome: l.biome });
    }
    return out;
  }
  /* a ring of standing stones marks the place */
  function lairStone(tx, ty) {
    var l = lairOfCell(Math.floor(tx / LAIR_CELL), Math.floor(ty / LAIR_CELL)), i;
    if (!l) return false;
    for (i = 0; i < LAIR_STONES.length; i++) if (tx - l.tx === LAIR_STONES[i][0] && ty - l.ty === LAIR_STONES[i][1]) return true;
    return false;
  }

  /* ---------- Material field: calm center, detail at the edges ---------- */
  function distT(tx, ty) {
    return Math.sqrt(tx * tx + ty * ty);
  }

  function pathField(tx, ty) {
    /* One wandering ribbon — narrow enough to stay a path, not a dirt field. */
    var n = fbm(tx * 0.055 + 8.1, ty * 0.055 - 3.4, seed + 3);
    return Math.abs(n - 0.5);
  }

  function rawMaterial(tx, ty) {
    var d = distT(tx, ty);
    var nCliff = fbm(tx * 0.08 + 40, ty * 0.08, seed + 21);
    var nWater = fbm(tx * 0.1 - 17, ty * 0.1 + 9, seed + 33);
    var path = pathField(tx, ty);
    var bd = biomeDef(tx, ty), M = (bd && bd.mat) || { cliff: 0.64, water: 0.70, path: 0.032 };

    /* Calm spawn clearing — no path until a tongue may enter past the core. */
    if (d < 4.6) return MAT.GRASS;
    if (d < 8.2) {
      if (path < 0.028) return MAT.PATH;
      return MAT.GRASS;
    }
    /* Screen-edge ring on a 720p view (~9–13 tiles on the sides): ledges and pools. */
    if (d >= 8.8 && nCliff > M.cliff) return MAT.CLIFF;
    if (d >= 8.6 && nWater > M.water) return MAT.WATER;
    if (path < M.path) return MAT.PATH;
    return MAT.GRASS;
  }

  function neighborCount(tx, ty, mat) {
    var n = 0;
    if (rawMaterial(tx, ty - 1) === mat) n++;
    if (rawMaterial(tx + 1, ty) === mat) n++;
    if (rawMaterial(tx, ty + 1) === mat) n++;
    if (rawMaterial(tx - 1, ty) === mat) n++;
    return n;
  }

  function materialAt(tx, ty) {
    /* remembered per tile: collision asks for the same tiles many times a tick */
    var k = tkey(tx, ty), c = matCache[k];
    if (c !== undefined) return c;
    var m = rawMaterial(tx, ty);
    /* Drop 1-tile cliffs and puddles so ledges read as plateaus, not brown stamps. */
    if (m === MAT.CLIFF && neighborCount(tx, ty, MAT.CLIFF) < 2) m = MAT.GRASS;
    else if (m === MAT.WATER && neighborCount(tx, ty, MAT.WATER) < 2) m = MAT.GRASS;
    if (matCount > 120000) { matCache = {}; matCount = 0; }
    matCache[k] = m; matCount++;
    return m;
  }

  function sameMat(a, b) {
    return a === b;
  }

  function neighborMask(tx, ty, mat) {
    var n = sameMat(materialAt(tx, ty - 1), mat) ? 1 : 0;
    var e = sameMat(materialAt(tx + 1, ty), mat) ? 2 : 0;
    var s = sameMat(materialAt(tx, ty + 1), mat) ? 4 : 0;
    var w = sameMat(materialAt(tx - 1, ty), mat) ? 8 : 0;
    return n | e | s | w;
  }

  /* ---------- Pixel helpers ---------- */
  function parseColor(c) {
    var m, h;
    if (!c) return [0, 0, 0];
    if (c.charAt(0) === "#") {
      h = c.slice(1);
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) return [+m[1], +m[2], +m[3]];
    return [0, 0, 0];
  }

  function mixHex(a, b, t) {
    var A = parseColor(a), B = parseColor(b);
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    var r = Math.round(A[0] + (B[0] - A[0]) * t);
    var g = Math.round(A[1] + (B[1] - A[1]) * t);
    var bl = Math.round(A[2] + (B[2] - A[2]) * t);
    return "rgb(" + r + "," + g + "," + bl + ")";
  }

  /* Wavy grass/path/water coverage for a path-or-water tile (1 = this material, 0 = grass). */
  function coverage(x, y, mask) {
    var n = (mask & 1) ? 1 : 0;
    var e = (mask & 2) ? 1 : 0;
    var s = (mask & 4) ? 1 : 0;
    var w = (mask & 8) ? 1 : 0;
    var cov = 1;
    var wx, wy, edge, dx, dy, rad;
    wx = Math.sin((x + 0.5) * 0.85) * 1.35 + Math.sin((x + 3.2) * 1.6) * 0.45;
    wy = Math.sin((y + 0.5) * 0.9) * 1.3 + Math.sin((y + 1.7) * 1.5) * 0.4;
    if (!n) {
      edge = 4.2 + wx;
      if (y + 0.5 < edge) cov = Math.min(cov, (y + 0.5 - (edge - 2.2)) / 2.2);
    }
    if (!s) {
      edge = 11.8 - wx;
      if (y + 0.5 > edge) cov = Math.min(cov, (edge + 2.2 - (y + 0.5)) / 2.2);
    }
    if (!w) {
      edge = 4.2 + wy;
      if (x + 0.5 < edge) cov = Math.min(cov, (x + 0.5 - (edge - 2.2)) / 2.2);
    }
    if (!e) {
      edge = 11.8 - wy;
      if (x + 0.5 > edge) cov = Math.min(cov, (edge + 2.2 - (x + 0.5)) / 2.2);
    }
    /* Rounded outer corners so material blobs aren't rectangles. */
    rad = 6.4;
    if (!n && !w) {
      dx = x + 0.5; dy = y + 0.5;
      if (dx * dx + dy * dy < rad * rad) cov = Math.min(cov, (Math.sqrt(dx * dx + dy * dy) - (rad - 2.4)) / 2.4);
    }
    if (!n && !e) {
      dx = 15.5 - x; dy = y + 0.5;
      if (dx * dx + dy * dy < rad * rad) cov = Math.min(cov, (Math.sqrt(dx * dx + dy * dy) - (rad - 2.4)) / 2.4);
    }
    if (!s && !w) {
      dx = x + 0.5; dy = 15.5 - y;
      if (dx * dx + dy * dy < rad * rad) cov = Math.min(cov, (Math.sqrt(dx * dx + dy * dy) - (rad - 2.4)) / 2.4);
    }
    if (!s && !e) {
      dx = 15.5 - x; dy = 15.5 - y;
      if (dx * dx + dy * dy < rad * rad) cov = Math.min(cov, (Math.sqrt(dx * dx + dy * dy) - (rad - 2.4)) / 2.4);
    }
    if (cov < 0) cov = 0;
    if (cov > 1) cov = 1;
    return cov;
  }

  function grassColor(x, y, tx, ty, variant) {
    return sz(grassColorBase(x, y, tx, ty, variant), "grass", x, y, tx, ty);
  }

  function grassColorBase(x, y, tx, ty, variant) {
    /* No per-tile bevel — that read as a quilted grid. Close variant colors + per-tile hash keep grass from forming hard rectangles. */
    var speck = hash2((tx * 13 + x) | 0, (ty * 11 + y) | 0, seed + 70 + variant);
    var g = B ? B.g : ["#467636", "#4a7438", "#437034"], hi = B ? B.hi : "#8ab058", lo = B ? B.lo : "#2f5422";
    var base = g[variant % 3] || g[0], dc;
    var col = base;
    if (speck > 0.96) col = mixHex(col, hi, 0.55);
    else if (speck < 0.05) col = mixHex(col, lo, 0.4);
    /* A couple of short blades so the tile still reads, without a 48px pillow. */
    if (variant === 0 && x === 5 && (y === 6 || y === 7)) col = mixHex(col, hi, 0.45);
    if (variant === 1 && x === 11 && (y === 4 || y === 5)) col = mixHex(col, lo, 0.45);
    if (variant === 2 && x === 8 && y === 10) col = mixHex(col, hi, 0.6);
    /* the biome's own digital touches: grid dots, traces, cracks, static */
    if (B && B.deco) { dc = B.deco(x, y, variant, speck); if (dc) col = dc; }
    return col;
  }

  function pathColor(x, y, tx, ty) {
    return sz(pathColorBase(x, y, tx, ty), "path", x, y, tx, ty);
  }

  function pathColorBase(x, y, tx, ty) {
    var speck = hash2((tx * 13 + x) | 0, (ty * 11 + y) | 0, seed + 90);
    var col = B ? B.path : "#8a6840", ph = B ? B.pathHi : "#c4a06a", pl = B ? B.pathLo : "#4a3218";
    if (speck > 0.92) col = mixHex(col, ph, 0.7);
    else if (speck < 0.1) col = mixHex(col, pl, 0.45);
    else if (speck > 0.78) col = mixHex(col, ph, 0.3);
    return col;
  }

  function waterColor(x, y, tx, ty, cov) {
    return sz(waterColorBase(x, y, tx, ty, cov), "water", x, y, tx || 0, ty || 0);
  }

  function waterColorBase(x, y, tx, ty, cov) {
    /* Irregular sparkles instead of a sine that tiles every 16px. */
    var speck = hash2((tx || 0) * 13 + x, (ty || 0) * 11 + y, seed + 110);
    var col = mixHex(B ? B.w0 : "#1c6874", B ? B.w1 : "#4eb8b4", 0.28 + speck * 0.4), wd;
    if (cov < 0.55) col = mixHex(col, B ? B.foam : "#b8fff8", 0.5 * (1 - cov));
    if (speck > 0.91) col = mixHex(col, B ? B.spark : "#e8fffc", 0.55);
    if (B && B.wdeco && cov > 0.8) { wd = B.wdeco(x, y, speck); if (wd) col = wd; }
    return col;
  }

  function cliffTopColor(x, y, tx, ty, mask) {
    return sz(cliffTopColorBase(x, y, tx, ty, mask), "cliff", x, y, tx, ty);
  }

  function cliffTopColorBase(x, y, tx, ty, mask) {
    var speck = hash2((tx * 13 + x) | 0, (ty * 11 + y) | 0, seed + 130);
    var col = mixHex(B ? B.ct0 : "#6a8a4c", B ? B.ct1 : "#b8c878", 0.35);
    if (speck > 0.88) col = mixHex(col, B ? B.ctHi : "#d0c090", 0.45);
    else if (speck < 0.1) col = mixHex(col, B ? B.ctLo : "#4a6038", 0.35);
    /* Lit rims on exposed sides so the plateau reads as a raised top, not more grass. */
    var F = B ? B.face : null;
    if (!(mask & 1) && y < 2) col = mixHex(col, B ? B.rim : "#e8d8a8", 0.55); /* north, toward the key light */
    if (!(mask & 8) && x < 2) col = mixHex(col, B ? B.rim : "#d8c898", 0.4);
    if (!(mask & 2) && x > 13) col = mixHex(col, F ? F[4] : "#4a3a28", 0.4);
    if (!(mask & 4) && y > 12) col = mixHex(F ? F[1] : "#7a6440", F ? F[0] : "#d4b080", y === 13 ? 0.75 : 0.2);
    return col;
  }

  function paintPixel(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
  }

  function makeTileCanvas() {
    var c = document.createElement("canvas");
    c.width = TILE;
    c.height = TILE;
    var ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    return { canvas: c, ctx: ctx };
  }

  function rasterTile(mat, mask, variant, tx, ty) {
    /* tx,ty only affect speckles so cached tiles use a representative hash when variant is set. */
    var m = makeTileCanvas();
    var ctx = m.ctx;
    var x, y, cov, col, g;
    tx = tx || 0;
    ty = ty || 0;
    for (y = 0; y < 16; y++) {
      for (x = 0; x < 16; x++) {
        if (mat === MAT.GRASS) {
          col = grassColor(x, y, tx, ty, variant);
        } else if (mat === MAT.PATH) {
          cov = coverage(x, y, mask);
          if (cov <= 0.001) col = grassColor(x, y, tx, ty, variant);
          else if (cov >= 0.999) col = pathColor(x, y, tx, ty);
          else {
            /* Darker lip at the material edge, then blend — readable, not a hard rectangle. */
            g = grassColor(x, y, tx, ty, variant);
            col = mixHex(g, pathColor(x, y, tx, ty), cov);
            if (cov > 0.25 && cov < 0.7) col = mixHex(col, B ? B.lip : "#3a2814", 0.28);
          }
        } else if (mat === MAT.WATER) {
          cov = coverage(x, y, mask);
          if (cov <= 0.001) col = grassColor(x, y, tx, ty, variant);
          else {
            g = grassColor(x, y, tx, ty, variant);
            col = mixHex(g, waterColor(x, y, tx, ty, cov), Math.min(1, cov * 1.15));
            if (cov > 0.2 && cov < 0.62) col = mixHex(col, B ? B.foam : "#9af0ea", 0.4);
          }
        } else {
          col = cliffTopColor(x, y, tx, ty, mask);
        }
        paintPixel(ctx, x, y, col);
      }
    }
    return m.canvas;
  }

  function rasterCliffFace(mask, tx, ty) {
    var m = document.createElement("canvas");
    m.width = TILE;
    m.height = faceH;
    var ctx = m.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    var x, y, col, sh, rim;
    for (y = 0; y < FACE_PX; y++) {
      for (x = 0; x < 16; x++) {
        sh = (15 - x) * 0.02;
        rim = y === 0;
        var F = (B && B.face) || ["#c4a878", "#8a6a48", "#6a5040", "#8a6a50", "#3a2a1c", "#5a4230", "#2a1c12"];
        if (rim) col = (season === "winter" && (!B || B.seasonal)) ? "#eef4f8" : mixHex(F[0], F[1], 0.35 - sh);
        else if (y === 1) col = mixHex(F[2], F[3], sh);
        else col = mixHex(F[4], F[5], sh * 0.5 + (y / FACE_PX) * -0.2);
        if (hash2(tx * 16 + x, ty * 16 + y, seed + 150) > 0.88 && y > 2) col = mixHex(col, F[6], 0.4);
        /* East side of the face is darker, west a little lit. */
        if (!(mask & 2) && x > 13) col = mixHex(col, "#1a120c", 0.4);
        if (!(mask & 8) && x < 2) col = mixHex(col, "#7a6248", 0.25);
        ctx.fillStyle = col;
        ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
      }
    }
    /* Drop of ambient occlusion under the lip is drawn on the ground by the chunk painter. */
    return m;
  }

  function tileKey(mat, mask, variant) {
    return mat + ":" + mask + ":" + variant;
  }

  function getTile(mat, mask, variant, tx, ty) {
    /* Unique speckles per world cell would explode the cache; use variant only (3 grass looks). */
    var key = (B ? B.id : "") + "/" + tileKey(mat, mask, variant);
    if (!tileCache[key]) tileCache[key] = rasterTile(mat, mask, variant, variant * 3, variant * 5);
    return tileCache[key];
    /* tx,ty unused on purpose — cached by mask/variant for performance. */
  }

  function getFace(mask) {
    var key = (B ? B.id : "") + "/face:" + mask;
    if (!tileCache[key]) tileCache[key] = rasterCliffFace(mask, mask, 0);
    return tileCache[key];
  }

  /* ---------- Chunk bake ---------- */
  function chunkKey(cx, cy) {
    return cx + "," + cy;
  }

  function remember(key, ch) {
    cache[key] = ch;
    cacheOrder.push(key);
    if (cacheOrder.length > CACHE_MAX) {
      var old = cacheOrder.shift();
      delete cache[old];
    }
  }

  function shouldFlower(tx, ty, mat, d) {
    if (mat !== MAT.GRASS || (B && !B.flowers)) return false;
    if (d < 6.2) return false;
    var h = hash2(tx, ty, seed + 200);
    var chance = d < 10 ? 0.035 : 0.07;
    var sm = season === "spring" ? 2.2 : season === "summer" ? 1.3 : season === "fall" ? 0.35 : 0;
    return h < chance * sm;
  }

  function shouldTallGrass(tx, ty, mat, d) {
    if (mat !== MAT.GRASS || (B && !B.tallgrass)) return false;
    if (d < 7.2) return false;
    var h = hash2(tx, ty, seed + 210);
    var chance = d < 11 ? 0.035 : 0.065;
    return h < chance;
  }

  /* Things you can press E on (data.js SPIRE / CACHE): at most one per cell of
   * the map, at a fixed spot inside it, so they are spread out and every
   * player's world has them in the same places. */
  function cellSpot(tx, ty, cell, chance, s) {
    var cx = Math.floor(tx / cell), cy = Math.floor(ty / cell);
    if (hash2(cx, cy, seed + s) >= chance) return false;
    return tx === cx * cell + 2 + ((hash2(cx, cy, seed + s + 1) * (cell - 4)) | 0) && ty === cy * cell + 2 + ((hash2(cx, cy, seed + s + 2) * (cell - 4)) | 0);
  }
  function inRuin(tx, ty) { return hash2(Math.floor(tx / 9), Math.floor(ty / 9), seed + 710) > 0.76; }
  function isMeadow(tx, ty, mat, d) {
    if (mat !== MAT.GRASS || (B && !B.tallgrass) || d < 6) return false;
    return valueNoise(tx * 0.13, ty * 0.13, seed + 730) > 0.69;
  }

  function propKindAt(tx, ty, mat, d) {
    if (lairStone(tx, ty)) return mat === MAT.CLIFF ? null : "monolith";
    if (mat === MAT.WATER) return null;
    var T = D.TERRAIN || {}, hr;
    if (mat !== MAT.CLIFF && d > 9) {
      if (cellSpot(tx, ty, T.spireCell || 26, T.spireChance == null ? 0.7 : T.spireChance, 700)) return "spire";
      if (cellSpot(tx, ty, T.cacheCell || 14, T.cacheChance == null ? 0.55 : T.cacheChance, 704)) return "cache";
      /* ruins: a patch of fallen stonework, on grass and across paths alike */
      if (inRuin(tx, ty)) {
        hr = hash2(tx, ty, seed + 720);
        if (hr < 0.05) return "pillar";
        if (hr < 0.09) return "pillar_broken";
        if (hr < 0.115) return "wall";
        if (hr < 0.15) return "pebbles";
      }
    }
    if (mat === MAT.PATH) return null;
    if (d < 7.4) return null;
    var h = hash2(tx, ty, seed + 220);
    /* Sparse, clustered at the edges. A shrine or monolith can appear in a 1280 view. */
    var region = hash2((tx / 12) | 0, (ty / 12) | 0, seed + 230);
    if (d > 9.4 && region > 0.72 && h > 0.944 && h < 0.952 && (d < 17 || region > 0.9)) return h > 0.949 ? "monolith" : "shrine";
    if (d <= 8) return null;
    /* the biome's own mix: each prop takes a slice of the dice, from the top down */
    var list = (B && B.props) || [["tree", 0.023], ["rock", 0.02]], top = 0.985, i;
    for (i = 0; i < list.length; i++) {
      if (h <= top && h > top - list[i][1]) return list[i][0];
      top -= list[i][1];
    }
    return null;
  }

  function buildChunk(cx, cy) {
    var pad = faceH + 4;
    var w = CHUNK * TILE;
    var h = CHUNK * TILE + pad;
    var canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    var props = [];
    var ix, iy, tx, ty, mat, mask, variant, d, tile, face, dec, kind, px, py;

    /* Pass 1: tops, flowers, and props. Faces are owned by the chunk that holds the ground they sit on
       (the tile south of a cliff), so a later chunk blit cannot cover a hanging face. */
    for (iy = 0; iy < CHUNK; iy++) {
      for (ix = 0; ix < CHUNK; ix++) {
        tx = cx * CHUNK + ix;
        ty = cy * CHUNK + iy;
        mat = materialAt(tx, ty);
        B = biomeDef(tx, ty);
        mask = neighborMask(tx, ty, mat);
        variant = (hash2(tx, ty, seed + 40) * 6) | 0;   /* 0-2 plain looks, 3-5 the same ground with fewer digital touches */
        d = distT(tx, ty);
        tile = getTile(mat, mask, variant, tx, ty);
        px = ix * TILE;
        py = iy * TILE;
        ctx.drawImage(tile, px, py);
        if (shouldFlower(tx, ty, mat, d)) {
          dec = D.sprites.getProp && D.sprites.getProp(hash2(tx, ty, seed + 250) > 0.5 ? "flower" : "flower2");
          if (dec) ctx.drawImage(dec, px + ((hash2(tx, ty, 1) * (TILE - dec.width)) | 0), py + ((hash2(tx, ty, 2) * (TILE - dec.height)) | 0));
        }
        kind = propKindAt(tx, ty, mat, d);
        if (!kind && isMeadow(tx, ty, mat, d)) {
          /* tall grass you wade through: three rows of blades a tile, so whoever stands in it is covered to the waist */
          props.push({ kind: "meadow" + ((hash2(tx, ty, seed + 731) * 3) | 0), x: (tx + 0.5) * TILE, y: (ty + 0.34) * TILE, grass: true, tk: tx + "," + ty });
          props.push({ kind: "meadow" + ((hash2(tx, ty, seed + 732) * 3) | 0), x: (tx + 0.5) * TILE + 4, y: (ty + 0.67) * TILE, grass: true, tk: tx + "," + ty });
          props.push({ kind: "meadow" + ((hash2(tx, ty, seed + 733) * 3) | 0), x: (tx + 0.5) * TILE - 3, y: (ty + 1) * TILE, grass: true, tk: tx + "," + ty });
        } else if (shouldTallGrass(tx, ty, mat, d)) {
          props.push({
            tk: tx + "," + ty, tuft: true,
            kind: "tallgrass",
            x: (tx + 0.5) * TILE + (hash2(tx, ty, 3) - 0.5) * 10,
            y: (ty + 0.85) * TILE
          });
        }
        if (kind) {
          props.push({
            kind: kind,
            x: (tx + 0.5) * TILE,
            y: (ty + 0.9) * TILE,
            key: USABLE[kind] ? tx + "," + ty : null
          });
        }
      }
    }
    /* Pass 2: south faces of the row north of this chunk (iy = -1) and of rows 0..CHUNK-2.
       The last row's face is drawn by the chunk below. */
    for (iy = -1; iy < CHUNK - 1; iy++) {
      for (ix = 0; ix < CHUNK; ix++) {
        tx = cx * CHUNK + ix;
        ty = cy * CHUNK + iy;
        if (materialAt(tx, ty) !== MAT.CLIFF) continue;
        if (materialAt(tx, ty + 1) === MAT.CLIFF) continue;
        B = biomeDef(tx, ty);
        mask = neighborMask(tx, ty, MAT.CLIFF);
        face = getFace(mask);
        px = ix * TILE;
        py = (iy + 1) * TILE;
        ctx.drawImage(face, px, py);
        ctx.fillStyle = "rgba(12, 8, 16, 0.28)";
        ctx.fillRect(px + SCALE, py + faceH - SCALE, TILE - SCALE * 2, SCALE * 2);
      }
    }
    return { canvas: canvas, props: props, cx: cx, cy: cy, pad: pad };
  }

  function getChunk(cx, cy) {
    var key = chunkKey(cx, cy);
    if (cache[key]) return cache[key];
    var ch = buildChunk(cx, cy);
    remember(key, ch);
    return ch;
  }

  function drawGround(ctx, camX, camY, viewW, viewH) {
    if (!ready) return;
    var x0 = camX - viewW / 2 - TILE;
    var y0 = camY - viewH / 2 - TILE;
    var x1 = camX + viewW / 2 + TILE;
    var y1 = camY + viewH / 2 + TILE + faceH;
    var cx0 = Math.floor(x0 / (CHUNK * TILE));
    var cy0 = Math.floor(y0 / (CHUNK * TILE));
    var cx1 = Math.floor(x1 / (CHUNK * TILE));
    var cy1 = Math.floor(y1 / (CHUNK * TILE));
    var cx, cy, ch, dx, dy;
    ctx.imageSmoothingEnabled = false;
    for (cy = cy0; cy <= cy1; cy++) {
      for (cx = cx0; cx <= cx1; cx++) {
        ch = getChunk(cx, cy);
        dx = cx * CHUNK * TILE;
        dy = cy * CHUNK * TILE;
        ctx.drawImage(ch.canvas, Math.round(dx), Math.round(dy));
      }
    }
  }

  function propsInView(camX, camY, viewW, viewH) {
    if (!ready) return [];
    var pad = 96;
    var x0 = camX - viewW / 2 - pad;
    var y0 = camY - viewH / 2 - pad;
    var x1 = camX + viewW / 2 + pad;
    var y1 = camY + viewH / 2 + pad;
    var cx0 = Math.floor(x0 / (CHUNK * TILE));
    var cy0 = Math.floor(y0 / (CHUNK * TILE));
    var cx1 = Math.floor(x1 / (CHUNK * TILE));
    var cy1 = Math.floor(y1 / (CHUNK * TILE));
    var out = [], cx, cy, ch, i, p;
    for (cy = cy0; cy <= cy1; cy++) {
      for (cx = cx0; cx <= cx1; cx++) {
        ch = getChunk(cx, cy);
        for (i = 0; i < ch.props.length; i++) {
          p = ch.props[i];
          if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1) out.push(p);
        }
      }
    }
    return out;
  }

  function elevationAt(x, y) {
    if (!ready) return 0;
    var tx = Math.floor(x / TILE);
    var ty = Math.floor(y / TILE);
    return materialAt(tx, ty) === MAT.CLIFF ? faceH : 0;
  }

  /* Lava cannot be walked on by anyone: it blocks like a plateau. */
  function solidLiquid(tx, ty) {
    if (materialAt(tx, ty) !== MAT.WATER) return false;
    var b = biomeDef(tx, ty);
    return !!(b && b.solidWater);
  }
  /* Is there lava within rad of this spot? (for the burn at its edge) */
  function hazardNear(x, y, rad) {
    if (!ready || !TILE) return false;
    var d = rad || 12, i, o = [[0, 0], [d, 0], [-d, 0], [0, d], [0, -d], [d * 0.7, d * 0.7], [-d * 0.7, d * 0.7], [d * 0.7, -d * 0.7], [-d * 0.7, -d * 0.7]];
    for (i = 0; i < o.length; i++) if (solidLiquid(Math.floor((x + o[i][0]) / TILE), Math.floor((y + o[i][1]) / TILE))) return true;
    return false;
  }

  /* Props that stand in the way: half-width and depth of the foot each one blocks, in pixels. */
  var SOLID = { pillar: [13, 13], pillar_broken: [13, 12], wall: [21, 13], boulder: [18, 15], spire: [11, 12], cache: [11, 9] };
  var USABLE = { spire: 1, cache: 1 };
  var propCache = {}, propCount = 0, used = {};
  function propAt(tx, ty) {
    var k = tkey(tx, ty), v = propCache[k], keep, mat;
    if (v !== undefined) return v;
    keep = B; mat = materialAt(tx, ty); B = biomeDef(tx, ty);
    v = propKindAt(tx, ty, mat, distT(tx, ty)) || null;
    B = keep;
    if (propCount++ > 40000) { propCache = {}; propCount = 0; }
    propCache[k] = v;
    return v;
  }
  function solidProp(x, y, tx, ty) {
    var f = SOLID[propAt(tx, ty)], px, py;
    if (!f) return false;
    px = (tx + 0.5) * TILE; py = (ty + 0.9) * TILE;
    return Math.abs(x - px) <= f[0] && y <= py + 2 && y >= py - f[1];
  }
  /* the nearest spire or cache within r that has not been used yet */
  function usableNear(x, y, r) {
    if (!ready || !TILE) return null;
    var tx0 = Math.floor((x - r) / TILE), tx1 = Math.floor((x + r) / TILE), ty0 = Math.floor((y - r) / TILE) - 1, ty1 = Math.floor((y + r) / TILE), tx, ty, k, px, py, d, best = null;
    for (ty = ty0; ty <= ty1; ty++) for (tx = tx0; tx <= tx1; tx++) {
      k = propAt(tx, ty);
      if (!USABLE[k] || used[tx + "," + ty]) continue;
      px = (tx + 0.5) * TILE; py = (ty + 0.9) * TILE - 8; d = (px - x) * (px - x) + (py - y) * (py - y);
      if (d <= r * r && (!best || d < best.d)) best = { kind: k, tx: tx, ty: ty, x: px, y: py + 8, key: tx + "," + ty, d: d };
    }
    return best;
  }
  /* ---- grass that burns (data.js GRASSFIRE) ----
   * Fire chars the grass tile by tile. A charred tile is remembered with the
   * battle time it grows back at; until then it is not grass (nothing to
   * burn, nothing to hide in). The map is seeded, so the same spot is still
   * there when you come back, and so is its scorch mark. */
  var burnt = {}, clock = 0;
  function setTime(t) { clock = t || 0; }
  function burnableTile(tx, ty) {
    if (materialAt(tx, ty) !== MAT.GRASS) return false;
    var b = biomeDef(tx, ty);
    return !!(b && b.tallgrass);
  }
  /* 0 grass as usual, 1 charred, 2 growing back */
  function burnState(key) {
    var b = burnt[key];
    if (!b) return 0;
    if (clock >= b.until || clock < b.at - 1) { delete burnt[key]; return 0; }
    return clock >= b.until - b.sprout ? 2 : 1;
  }
  function burn(x, y, r, at, regrow, sprout) {
    if (!ready || !TILE) return 0;
    var cx = Math.floor(x / TILE), cy = Math.floor(y / TILE), n = Math.ceil((r || 0) / TILE) + 1, tx, ty, px, py, k, hit = 0, rr = (r || 0) + TILE * 0.3;
    for (ty = cy - n; ty <= cy + n; ty++) for (tx = cx - n; tx <= cx + n; tx++) {
      px = (tx + 0.5) * TILE - x; py = (ty + 0.5) * TILE - y;
      if (!(tx === cx && ty === cy) && px * px + py * py > rr * rr) continue;
      k = tx + "," + ty;
      if (burnState(k) || !burnableTile(tx, ty)) continue;
      burnt[k] = { tx: tx, ty: ty, at: at || 0, until: (at || 0) + (regrow || 170), sprout: sprout || 45 };
      hit++;
    }
    return hit;
  }
  function burntInView(camX, camY, viewW, viewH) {
    var out = [], k, b, x, y, st, pad = TILE * 2;
    for (k in burnt) {
      b = burnt[k]; st = burnState(k);
      if (!st) continue;
      x = (b.tx + 0.5) * TILE; y = (b.ty + 0.5) * TILE;
      if (x < camX - viewW / 2 - pad || x > camX + viewW / 2 + pad || y < camY - viewH / 2 - pad || y > camY + viewH / 2 + pad) continue;
      out.push({ key: k, tx: b.tx, ty: b.ty, x: x, y: y, state: st, age: clock - b.at, left: b.until - clock, sprout: b.sprout });
    }
    return out;
  }
  /* is this spot grass that can catch fire? (grass in a grassy biome that is not already charred) */
  function isGrass(x, y) {
    if (!ready || !TILE) return false;
    var tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (!burnableTile(tx, ty)) return false;
    return !burnState(tx + "," + ty);
  }
  /* "land", "water" or "rock" under a spot (lightning only leaves fire on land) */
  function groundAt(x, y) {
    if (!ready || !TILE) return "land";
    var m = materialAt(Math.floor(x / TILE), Math.floor(y / TILE));
    if (m === MAT.WATER) return "water";
    if (m === MAT.CLIFF) return "rock";
    return hazardNear(x, y, 4) ? "water" : "land";
  }
  /* tall grass (a meadow, or a lone tuft): it catches for sure and carries fire further */
  function isTallGrass(x, y) {
    if (!isGrass(x, y)) return false;
    var tx = Math.floor(x / TILE), ty = Math.floor(y / TILE), keep = B, d = distT(tx, ty), r;
    B = biomeDef(tx, ty);
    r = isMeadow(tx, ty, MAT.GRASS, d) || shouldTallGrass(tx, ty, MAT.GRASS, d);
    B = keep;
    return !!r;
  }
  function markUsed(key) { used[key] = 1; }
  function isUsed(key) { return !!used[key]; }

  function pointRaised(x, y) {
    if (!ready || !TILE) return false;
    var tx = Math.floor(x / TILE);
    var ty = Math.floor(y / TILE);
    if (materialAt(tx, ty) === MAT.CLIFF || solidLiquid(tx, ty)) return true;
    if (solidProp(x, y, tx, ty)) return true;
    var ly = y - ty * TILE;
    if (ly < faceH && materialAt(tx, ty - 1) === MAT.CLIFF) return true;
    return false;
  }

  /* Raised plateaus and the hanging south face of a cliff are solid. */
  function isRaised(x, y, rad) {
    rad = rad == null ? 8 : rad;
    if (pointRaised(x, y)) return true;
    if (rad <= 0) return false;
    var d = rad * 0.72;
    return pointRaised(x - d, y) || pointRaised(x + d, y)
      || pointRaised(x, y - d) || pointRaised(x, y + d)
      || pointRaised(x - d, y - d) || pointRaised(x + d, y - d)
      || pointRaised(x - d, y + d) || pointRaised(x + d, y + d);
  }

  function moveSlide(x, y, dx, dy, rad) {
    var nx = x + dx;
    var ny = y;
    if (!isRaised(nx, ny, rad)) x = nx;
    ny = y + dy;
    if (!isRaised(x, ny, rad)) y = ny;
    return { x: x, y: y };
  }

  function nearestWalkable(x, y, maxR, rad) {
    rad = rad == null ? 8 : rad;
    maxR = maxR == null ? 240 : maxR;
    if (!isRaised(x, y, rad)) return { x: x, y: y };
    var step = Math.max(8, TILE / 4);
    var r, a, n, ang, px, py, best = null, bd = 1e15, d;
    for (r = step; r <= maxR; r += step) {
      n = Math.max(8, (r / step) | 0) * 2;
      for (a = 0; a < n; a++) {
        ang = (a / n) * Math.PI * 2;
        px = x + Math.cos(ang) * r;
        py = y + Math.sin(ang) * r;
        if (!isRaised(px, py, rad)) {
          d = (px - x) * (px - x) + (py - y) * (py - y);
          if (d < bd) { bd = d; best = { x: px, y: py }; }
        }
      }
      if (best) return best;
    }
    return { x: x, y: y };
  }

  function reset(s) {
    colors();
    seed = (s == null ? 1 : (s | 0)) || 1;
    cache = {};
    cacheOrder = [];
    tileCache = {};
    matCache = {}; matCount = 0; bioCache = {}; bioCount = 0; lairCache = {};
    propCache = {}; propCount = 0; used = {}; burnt = {}; clock = 0;
    ready = true;
  }

  function init() {
    if (!D || !D.sprites) return;
    colors();
    ready = true;
  }

  global.DBH = global.DBH || {};
  global.DBH.world = {
    MAT: MAT,
    setSeason: setSeason,
    get season() { return season; },
    reset: reset,
    init: init,
    drawGround: drawGround,
    propsInView: propsInView,
    elevationAt: elevationAt,
    materialAt: materialAt,
    biomeIdAt: biomeId,                                    /* by tile */
    biomeAt: function (x, y) { return ready && TILE ? biomeDef(Math.floor(x / TILE), Math.floor(y / TILE)) : null; },   /* by world position */
    isRaised: isRaised,
    hazardNear: hazardNear,
    lairsNear: lairsNear,
    propAt: propAt,
    isGrass: isGrass,
    isTallGrass: isTallGrass,
    groundAt: groundAt,
    setTime: setTime,
    burn: burn,
    burnState: burnState,
    burntInView: burntInView,
    usableNear: usableNear,
    markUsed: markUsed,
    isUsed: isUsed,
    SOLID: SOLID,
    moveSlide: moveSlide,
    nearestWalkable: nearestWalkable,
    getSeed: function () { return seed; },
    FACE: function () { return faceH; },
    TILE: function () { return TILE; }
  };
})(window);
