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
  var cacheN = 0, useClock = 0;   /* chunks held; drawGround's frame count, for least-recently-used */
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
    /* Re-bake lazily: chunks are redrawn a few a frame (staleAll), the old ones shown meanwhile. */
    staleAll();
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
  var BIOME_F = 0.0075;           /* lower = bigger biomes (about 130 tiles across at this setting; 0.014 before Nov 20) */
  var B = null;                   /* the biome being painted right now */
  var matCache = {}, matCount = 0, bioCache = {}, bioCount = 0;
  function tkey(tx, ty) { return (tx + 1048576) * 2097152 + (ty + 1048576); }
  function spread(n) { n = (n - 0.5) * 2 + 0.5; return n < 0 ? 0 : (n > 1 ? 1 : n); }
  function defs() { return (D.biomes && D.biomes.DEFS) || null; }
  /* the biome the land was born as: it shapes the cliffs, water and lairs, and never changes */
  function nativeId(tx, ty) {
    var BI = D.biomes;
    if (!BI) return "plains";
    var k = tkey(tx, ty), v = bioCache[k];
    if (v) return v;
    /* a little jitter makes the borders ragged instead of ruled: mostly a smooth wobble (with the
     * bigger biomes a per-tile scatter alone left a wide band of checkered tiles), a pinch per tile */
    var j = (valueNoise(tx * 0.21, ty * 0.21, seed + 777) - 0.5) * 0.06 + (hash2(tx, ty, seed + 778) - 0.5) * 0.006;
    var t = spread(fbm(tx * BIOME_F + 11.3, ty * BIOME_F - 7.7, seed + 500)) + j;
    var m = spread(fbm(tx * BIOME_F - 31.9, ty * BIOME_F + 23.1, seed + 600)) - j;
    var w = spread(fbm(tx * BIOME_F * 0.8 + 57.2, ty * BIOME_F * 0.8 + 91.4, seed + 700)) + j;
    v = BI.pick(t, m, w, distT(tx, ty) + j * 80);
    if (bioCount > 120000) { bioCache = {}; bioCount = 0; }
    bioCache[k] = v; bioCount++;
    return v;
  }
  function nativeDef(tx, ty) { var d = defs(); return d ? d[nativeId(tx, ty)] : null; }

  /* ---------- Territory (Nov 20): who holds the land now ----------
   * The map is cut into TERR x TERR tile cells. Each starts held by the biome
   * it was born as (its middle's native biome); the biome wars (war-sim.js)
   * hand cells from one biome to another. A tile belongs to the holder of the
   * cell it falls in after a wobble of a few tiles (land nobody has taken
   * keeps its native borders), so borders stay ragged instead of following
   * the grid. The holder decides the look, the
   * props, the tall grass, what the water is (a conquered lake can turn to
   * lava or to ice), and which Digimon live there. The shape of the land
   * (cliffs, water, lairs) is the native biome's and stays put. Every run
   * starts again from the native map (reset). */
  var TERR = 8, terr = {}, terrN = 0, terrVer = 0, ownCache = {}, ownCount = 0;
  function cellNative(cx, cy) { return nativeId(cx * TERR + (TERR >> 1), cy * TERR + (TERR >> 1)); }
  function cellOwner(cx, cy) { return terr[cx + "," + cy] || cellNative(cx, cy); }
  function biomeId(tx, ty) {
    var k = tkey(tx, ty), v = ownCache[k], jx, jy;
    if (v) return v;
    if (!terrN) v = nativeId(tx, ty);
    else {
      /* land nobody has taken keeps its own ragged native borders; a taken cell reaches out a
       * wobbly few tiles past its edges, so a conquest looks like a spreading stain, not a grid */
      jx = (valueNoise(tx * 0.13 + 3.1, ty * 0.13, seed + 870) - 0.5) * 7 + (valueNoise(tx * 0.45, ty * 0.45 + 9.7, seed + 872) - 0.5) * 3;
      jy = (valueNoise(tx * 0.13, ty * 0.13 - 5.3, seed + 871) - 0.5) * 7 + (valueNoise(tx * 0.45 + 4.4, ty * 0.45, seed + 873) - 0.5) * 3;
      v = terr[Math.floor((tx + jx) / TERR) + "," + Math.floor((ty + jy) / TERR)] || nativeId(tx, ty);
    }
    if (ownCount > 120000) { ownCache = {}; ownCount = 0; }
    ownCache[k] = v; ownCount++;
    return v;
  }
  function biomeDef(tx, ty) { var d = defs(); return d ? d[biomeId(tx, ty)] : null; }
  /* hand a cell to a biome; the ground round it is redrawn and paths worked out afresh */
  function setOwner(cx, cy, id) {
    var k = cx + "," + cy, nat = cellNative(cx, cy), had = terr[k] || nat, i, j;
    if (!id || had === id) return false;
    if (id === nat) { if (terr[k]) { delete terr[k]; terrN--; } }
    else { if (!terr[k]) terrN++; terr[k] = id; }
    forgetNear(cx, cy);
    for (j = -1; j <= 1; j++) for (i = -1; i <= 1; i++) staleChunk(chunkKey(cx + i, cy + j));
    terrVer++;
    mapChanged(cx * TERR - TERR_PAD, cy * TERR - TERR_PAD, (cx + 1) * TERR + TERR_PAD, (cy + 1) * TERR + TERR_PAD);
    return true;
  }
  /* A cell changing hands only touches the tiles round it (its own, and the few tiles its ragged
   * edge reaches past them). It used to wipe the whole map's remembered biomes and props and tell
   * the pathfinding the whole map had changed (17z33), which made the host rework everything. */
  var TERR_PAD = 6, mapLog = [];
  /* What changed underfoot, for the pathfinding (mission-sim.js _navReady): every change bumps the map
   * version and notes the tile box it touched, or null for "everything" (the ice level stepping with
   * the season, a new map). The pathfinding then forgets just those tiles. (17z33: any border move or
   * ice attack used to make it forget the whole map.) */
  function mapChanged(x0, y0, x1, y1) {
    iceVer++;
    mapLog.push([iceVer, x0 == null ? null : [x0, y0, x1, y1]]);
    if (mapLog.length > 600) mapLog.splice(0, 200);
  }
  /* the tile boxes changed since map version v, or null if the whole map must be worked out again */
  function mapChanges(v) {
    var out = [], i;
    if (v >= iceVer) return out;
    if (!mapLog.length || mapLog[0][0] > v + 1) return null;
    for (i = 0; i < mapLog.length; i++) {
      if (mapLog[i][0] <= v) continue;
      if (!mapLog[i][1]) return null;
      out.push(mapLog[i][1]);
    }
    return out;
  }
  function forgetNear(cx, cy) {
    var tx, ty, k, x0 = cx * TERR - TERR_PAD, x1 = (cx + 1) * TERR + TERR_PAD, y0 = cy * TERR - TERR_PAD, y1 = (cy + 1) * TERR + TERR_PAD;
    for (ty = y0; ty < y1; ty++) for (tx = x0; tx < x1; tx++) {
      k = tkey(tx, ty);
      if (ownCache[k] !== undefined) { delete ownCache[k]; ownCount--; }
      if (propCache[k] !== undefined) { delete propCache[k]; propCount--; }
    }
  }
  /* the cells that have changed hands, as one short string ("cx,cy,biome;..."), and back */
  function territoryString() {
    var out = [], k;
    for (k in terr) out.push(k + "," + terr[k]);
    out.sort();
    return out.join(";");
  }
  function applyTerritory(str) {
    var want = {}, parts = str ? str.split(";") : [], i, p, k, changed = 0;
    for (i = 0; i < parts.length; i++) { p = parts[i].split(","); if (p.length === 3) want[p[0] + "," + p[1]] = p[2]; }
    for (k in terr) if (!want[k]) { p = k.split(","); if (setOwner(+p[0], +p[1], cellNative(+p[0], +p[1]))) changed++; }
    for (k in want) { p = k.split(","); if (setOwner(+p[0], +p[1], want[k])) changed++; }
    return changed;
  }

  /* ---------- Lairs: where a biome's lord stands ----------
   * One candidate spot per LAIR_CELL x LAIR_CELL tiles. It is kept only if
   * it is open ground with the same biome all around it (so it sits inside
   * its country, not on a border) and well away from the start. */
  var LAIR_CELL = 84, LAIR_MIN = 38, lairCache = {};   /* 56 before the biomes grew (Nov 20) */
  var LAIR_STONES = [[-3, -2], [3, -2], [-4, 1], [4, 1], [-2, 3], [2, 3]];
  function lairOfCell(cx, cy) {
    var key = cx + ":" + cy, v = lairCache[key], t, tx, ty, id, okk, a, i;
    if (v !== undefined) return v;
    v = null;
    for (t = 0; t < 4 && !v; t++) {
      tx = cx * LAIR_CELL + Math.floor(LAIR_CELL * (0.2 + 0.6 * hash2(cx * 7 + t, cy * 13, seed + 901)));
      ty = cy * LAIR_CELL + Math.floor(LAIR_CELL * (0.2 + 0.6 * hash2(cx * 11, cy * 5 + t, seed + 902)));
      if (distT(tx, ty) < LAIR_MIN) continue;
      id = nativeId(tx, ty); okk = true;
      for (i = 0; i < 8 && okk; i++) { a = (Math.PI * 2 * i) / 8; if (nativeId(Math.round(tx + Math.cos(a) * 8), Math.round(ty + Math.sin(a) * 8)) !== id) okk = false; }
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
      /* whoever holds the lair now: a conquered lair gets the conqueror's lord */
      if (l) out.push({ key: l.key, x: (l.tx + 0.5) * TILE, y: (l.ty + 0.5) * TILE, biome: biomeId(l.tx, l.ty), native: l.biome });
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
    var bd = nativeDef(tx, ty), M = (bd && bd.mat) || { cliff: 0.64, water: 0.70, path: 0.032 };

    /* Calm spawn clearing — no path until a tongue may enter past the core. */
    if (d < 4.6) return MAT.GRASS;
    if (d < 8.2) {
      if (path < 0.028) return MAT.PATH;
      return MAT.GRASS;
    }
    /* Screen-edge ring on a 720p view (~9–13 tiles on the sides): ledges and pools. */
    if (d >= 8.8 && nCliff > M.cliff) return MAT.CLIFF;
    /* Rivers (Nov 20): long winding ribbons nobody can wade across. Where the
     * path meets one there is a ford, and fords also turn up at a regular
     * stride along every river, so no stretch of bank is ever a dead end. */
    var rv = d >= RIVER_FREE ? riverField(tx, ty) : 1, RW = M.river == null ? RIVER_W : M.river;
    if (rv < RW) return isFord(tx, ty) ? MAT.PATH : MAT.WATER;
    if (d >= 8.6 && nWater > M.water + LAKE_TRIM) return isFord(tx, ty) ? MAT.GRASS : MAT.WATER;   /* lakes get land bridges at the same stride */
    if (path < M.path) return MAT.PATH;
    return MAT.GRASS;
  }

  /* RIVER_W: half a river's width in tiles (biomes can set their own as mat.river) */
  var LAKE_TRIM = 0.02;            /* lakes a little smaller now that nobody can wade them */
  var RIVER_W = 1.45, RIVER_FREE = 13, FORD_STRIDE = 30, FORD_W = 2;
  function riverNoise(tx, ty) { return fbm(tx * 0.022 + 71.3, ty * 0.022 - 44.9, seed + 41); }
  /* Roughly how many tiles this one is from the middle of a river: the noise's
   * distance from its midline over how steeply it is changing here, so a river
   * keeps an even width instead of pinching to nothing or pooling into a lake. */
  function riverField(tx, ty) {
    var n = riverNoise(tx, ty) - 0.5, gx, gy, g;
    if (n > 0.09 || n < -0.09) return 99;
    gx = riverNoise(tx + 0.5, ty) - riverNoise(tx - 0.5, ty);
    gy = riverNoise(tx, ty + 0.5) - riverNoise(tx, ty - 0.5);
    g = Math.sqrt(gx * gx + gy * gy);
    return Math.abs(n) / Math.max(0.004, g) - (valueNoise(tx * 0.07, ty * 0.07, seed + 45) - 0.5) * 0.9;
  }
  /* A crossing band every FORD_STRIDE tiles each way, nudged block by block so they don't line up. */
  function isFord(tx, ty) {
    var ox = Math.floor(hash2(Math.floor(ty / 34), 7, seed + 43) * FORD_STRIDE);
    var oy = Math.floor(hash2(9, Math.floor(tx / 34), seed + 44) * FORD_STRIDE);
    return (((tx - ox) % FORD_STRIDE) + FORD_STRIDE) % FORD_STRIDE < FORD_W || (((ty - oy) % FORD_STRIDE) + FORD_STRIDE) % FORD_STRIDE < FORD_W;
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
    /* Smooth and dark (Nov 21): random bright specks made water look like gravel to a
     * colour-blind tester. Now it is a calm, deep tone with long soft bands; the life in it
     * is the moving ripples drawn on top each frame (game.js drawWaterFx). */
    var band = 0.5 + 0.5 * Math.sin((x + (tx || 0) * 16) * 0.35 + (y + (ty || 0) * 16) * 0.9);
    var lava = !!(B && B.solidWater);
    var col = mixHex(B ? B.w0 : "#1c6874", B ? B.w1 : "#4eb8b4", 0.18 + band * 0.18 + speck * 0.06), wd;
    if (!lava) {
      col = mixHex(col, "#041018", 0.38);
      /* however bright a biome's water is (green sludge, pale oasis), keep it well darker than the ground */
      var L = hexLum(col);
      if (L > 0.2) col = mixHex(col, "#041018", Math.min(0.7, (L - 0.2) / L + 0.05));
    }
    if (cov < 0.55) col = mixHex(col, B ? B.foam : "#b8fff8", 0.5 * (1 - cov));
    if (B && B.wdeco && cov > 0.8) { wd = B.wdeco(x, y, speck); if (wd) col = wd; }
    return col;
  }

  /* Water frozen over: pale, a little of the water's own colour showing through,
   * long scratches and a few bright glints. */
  var frozenLook = false;
  function iceColor(x, y, tx, ty, cov, variant) {
    var speck = hash2(tx * 13 + x, ty * 11 + y, seed + 115), deep = mixHex(B ? B.w0 : "#1c6874", "#9fd0e6", 0.55);
    /* broad bands of clearer and cloudier ice, so the water's blue still shows through in streaks */
    var band = Math.max(0, Math.sin((x * 0.7 + y * 0.45 + variant * 3) * 0.6)), col = mixHex(deep, "#d8eef8", 0.25 + 0.45 * band + speck * 0.1);
    if ((x * 2 + y + variant * 5) % 11 === 0 && y > 2 && y < 13) col = mixHex(col, "#ffffff", 0.6);       /* skate scratches */
    if ((x + y * 3 + variant) % 17 === 0) col = mixHex(col, "#5a8eae", 0.5);                                /* hairline cracks */
    if (speck > 0.97) col = "#ffffff";
    return col;
  }

  /* Readable without colour (Nov 21): a colour-blind player couldn't tell a plateau from
   * grass. Ground you can't cross gets shapes, not just hues: a hard near-black outline on
   * every open edge, a regular diagonal hatch over plateau tops (grass is only ever random
   * speckle), a dark foot under each cliff face, and a dark shoreline round water and lava. */
  var EDGE_INK = "#0b0705";
  function hexLum(c) {
    var p = parseColor(c);
    return (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255;
  }
  function cliffTopColor(x, y, tx, ty, mask) {
    var col = sz(cliffTopColorBase(x, y, tx, ty, mask), "cliff", x, y, tx, ty);
    if (((x + y) & 3) === 0) col = mixHex(col, "#1a120a", 0.32);
    if ((!(mask & 1) && y === 0) || (!(mask & 2) && x === 15) || (!(mask & 8) && x === 0) || (!(mask & 4) && y === 15)) col = EDGE_INK;
    else if ((!(mask & 2) && x === 14) || (!(mask & 8) && x === 1) || (!(mask & 4) && y === 14)) col = mixHex(col, EDGE_INK, 0.35);
    return col;
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
          else if (frozenLook) {
            g = grassColor(x, y, tx, ty, variant);
            col = mixHex(g, iceColor(x, y, tx, ty, cov, variant), Math.min(1, cov * 1.2));
            if (cov > 0.2 && cov < 0.42) col = mixHex(col, "#4a6688", 0.6);   /* a darker rim where it meets the bank, so ice shows on snow */
            else if (cov >= 0.42 && cov < 0.62) col = mixHex(col, "#f4fbff", 0.45);
          } else {
            g = grassColor(x, y, tx, ty, variant);
            col = mixHex(g, waterColor(x, y, tx, ty, cov), Math.min(1, cov * 1.15));
            if (cov > 0.2 && cov < 0.62) col = mixHex(col, B ? B.foam : "#9af0ea", 0.4);
            if (cov > 0.05 && cov <= 0.3) col = mixHex(g, EDGE_INK, 0.8);          /* the shoreline: you stop here */
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
        /* the wall's own outline: its open sides and its foot */
        if ((!(mask & 2) && x === 15) || (!(mask & 8) && x === 0) || y === FACE_PX - 1) col = EDGE_INK;
        else if (y === FACE_PX - 2) col = mixHex(col, EDGE_INK, 0.45);
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

  function getTile(mat, mask, variant, tx, ty, frozen) {
    /* Unique speckles per world cell would explode the cache; use variant only (3 grass looks). */
    var key = (B ? B.id : "") + "/" + tileKey(mat, mask, variant) + (frozen ? "/ice" : "");
    if (!tileCache[key]) { frozenLook = !!frozen; tileCache[key] = rasterTile(mat, mask, variant, variant * 3, variant * 5); frozenLook = false; }
    return tileCache[key];
    /* tx,ty unused on purpose — cached by mask/variant for performance. */
  }

  function getFace(mask) {
    var key = (B ? B.id : "") + "/face:" + mask;
    if (!tileCache[key]) tileCache[key] = rasterCliffFace(mask, mask, 0);
    return tileCache[key];
  }

  /* ---------- Chunk bake ---------- */
  /* throwing a chunk away frees its texture on the graphics card too (renderer.js release) */
  function glRelease(ch) {
    var R = D.gl && D.gl.renderer;
    if (ch && ch.canvas && R && R.release) R.release(ch.canvas);
    if (ch && ch.foam && R && R.release) { R.release(ch.foam.a); R.release(ch.foam.b); }
    if (ch && ch.lava && R && R.release) ch.lava.forEach(function (c) { R.release(c); });
  }
  function dropChunk(key) { if (cache[key]) { glRelease(cache[key]); delete cache[key]; cacheN--; } }
  function dropAllChunks() { var k; for (k in cache) glRelease(cache[k]); cache = {}; cacheN = 0; if (typeof stats !== "undefined") stats.dropAll++; }
  /* Out of date, but kept on screen until its turn to be redrawn (17z33): a border moving, ice
   * coming or going, a season turning used to throw away every chunk it touched at once and bake
   * them all again in that one frame (a whole screen of them when the ice stepped up) */
  function staleChunk(key) { if (cache[key]) cache[key].stale = true; }
  function staleAll() { var k; for (k in cache) cache[k].stale = true; if (typeof stats !== "undefined") stats.dropAll++; }
  function chunkKey(cx, cy) {
    return cx + "," + cy;
  }

  /* Keep at most CACHE_MAX baked chunks; past that, throw away the one used longest ago, never
   * one drawn this frame. (17z33: it used to keep an order list that kept the keys of chunks
   * already thrown away by a biome flip or ice, so after a few flips near you it evicted chunks
   * still on screen, rebuilt them the next frame, evicted the next... hundreds a second, forever.) */
  function remember(key, ch) {
    if (cache[key]) dropChunk(key);
    cache[key] = ch;
    ch.used = useClock;
    cacheN++;
    if (cacheN > CACHE_MAX) {
      var k, oldK = null, oldU = useClock;
      for (k in cache) if (cache[k].used < oldU) { oldU = cache[k].used; oldK = k; }
      if (oldK !== null) dropChunk(oldK);
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

  function meadowAt(tx, ty) { return isMeadow(tx, ty, materialAt(tx, ty), distT(tx, ty)) && !propKindAt(tx, ty, materialAt(tx, ty), distT(tx, ty)); }
  function meadowRows(props, tx, ty) {
    var n = meadowAt(tx, ty - 1), so = meadowAt(tx, ty + 1), w = meadowAt(tx - 1, ty), e = meadowAt(tx + 1, ty);
    var rows = [[0.34, 0, 731], [0.67, 4, 732], [1, -3, 733]], k, jx, h;
    for (k = 0; k < 3; k++) {
      h = hash2(tx, ty, seed + 740 + k);
      if (k === 0 && !n && h < 0.6) continue;
      if (k === 2 && !so && h < 0.35) continue;
      jx = rows[k][1] + (hash2(tx, ty, seed + 750 + k) - 0.5) * 12;
      if (!w && jx < 0 && h < 0.5) jx = -jx * 0.5 + 6;
      if (!e && jx > 0 && h < 0.5) jx = -jx * 0.5 - 6;
      props.push({ kind: "meadow" + ((hash2(tx, ty, seed + rows[k][2]) * 3) | 0), x: (tx + 0.5) * TILE + jx, y: (ty + rows[k][0]) * TILE + (hash2(tx, ty, seed + 760 + k) - 0.5) * 5, grass: true, tk: tx + "," + ty });
    }
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
        /* frozen water gets the ice look (Freezeland keeps its own: its lakes were always ice) */
        tile = getTile(mat, mask, variant, tx, ty, mat === MAT.WATER && B && B.id !== "snow" && isFrozenTile(tx, ty));
        px = ix * TILE;
        py = iy * TILE;
        ctx.drawImage(tile, px, py);
        if (shouldFlower(tx, ty, mat, d)) {
          dec = D.sprites.getProp && D.sprites.getProp(hash2(tx, ty, seed + 250) > 0.5 ? "flower" : "flower2");
          if (dec) ctx.drawImage(dec, px + ((hash2(tx, ty, 1) * (TILE - dec.width)) | 0), py + ((hash2(tx, ty, 2) * (TILE - dec.height)) | 0));
        }
        kind = propKindAt(tx, ty, mat, d);
        if (!kind && isMeadow(tx, ty, mat, d)) {
          /* tall grass you wade through: three rows of blades a tile, so whoever stands in it is covered to the waist.
             17z33: rows sit a little off the grid and the field's outer rows thin out, so a meadow has a ragged
             edge instead of reading as a pasted rectangle */
          meadowRows(props, tx, ty);
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
            key: USABLE[kind] ? tx + "," + ty : null,
            fk: TREES[kind] ? tx + "," + ty : null      /* a tree a blast can knock flat (fallOf) */
          });
        }
      }
    }
    finishGround(ctx, cx, cy);
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
    /* 17z33: the strip below the ground (room for cliff faces that hang into the next chunk) was clear
       where there are no faces. When the screen is drawn at a scale that blends neighbouring pixels (a
       phone at 2x, rendered at 1.5x) the chunk's last row mixed with that clear strip and the dark
       background showed through as a thin line along every chunk edge. The last row is copied in behind
       whatever is there; the chunk below is drawn over this strip anyway. */
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.drawImage(canvas, 0, w - 1, w, 1, 0, w, w, 3);
    ctx.restore();
    var foam = lastFoam, lava = lastLava; lastFoam = null; lastLava = null;
    return { canvas: canvas, props: props, cx: cx, cy: cy, pad: pad, foam: foam, lava: lava };
  }

  /* 17z33: the ground's finishing pass, once per chunk, at art-pixel scale and in world coordinates (so
   * nothing repeats tile to tile):
   *   grass  broad light and shade patches, dithered in at their edges, and little three-blade tufts
   *          (natural biomes) scattered by the tile's own hash
   *   water  depth: shallow and clearer near the bank, darker the further out, smoothly across tiles
   *   path   a few pebbles
   * Cliffs, lava, ice and the digital biomes' patterns are left as they are. */
  var BAYER = [0, 0.5, 0.75, 0.25], shoreCache = {}, lastFoam = null, lastLava = null;
  function finishGround(ctx, cx, cy) {
    if (!ctx.getImageData) return;
    var N = CHUNK * 16, W = CHUNK * TILE, img, d, R = 3, M = CHUNK + R * 2, mats = [], depth = [], ix, iy, tx, ty, k, j, best, mt;
    try { img = ctx.getImageData(0, 0, W, W); } catch (e) { return; }
    d = img.data;
    /* materials and water depth in tiles (how far to the nearest non-water tile, up to R) */
    for (iy = 0; iy < M; iy++) for (ix = 0; ix < M; ix++) mats[iy * M + ix] = materialAt(cx * CHUNK + ix - R, cy * CHUNK + iy - R);
    for (iy = 0; iy < M; iy++) for (ix = 0; ix < M; ix++) {
      if (mats[iy * M + ix] !== MAT.WATER) { depth[iy * M + ix] = 0; continue; }
      best = R + 1;
      for (k = -R; k <= R; k++) for (j = -R; j <= R; j++) {
        if (iy + k < 0 || iy + k >= M || ix + j < 0 || ix + j >= M) continue;
        if (mats[(iy + k) * M + ix + j] !== MAT.WATER) best = Math.min(best, Math.max(Math.abs(k), Math.abs(j)));
      }
      depth[iy * M + ix] = best;
    }
    function dep(fx, fy) {          /* tile depth, smooth between tile centres */
      var gx = fx - 0.5 + R, gy = fy - 0.5 + R, x0 = Math.floor(gx), y0 = Math.floor(gy), u = gx - x0, v = gy - y0;
      function at(a, b) { a = Math.max(0, Math.min(M - 1, a)); b = Math.max(0, Math.min(M - 1, b)); return depth[b * M + a]; }
      return (at(x0, y0) * (1 - u) + at(x0 + 1, y0) * u) * (1 - v) + (at(x0, y0 + 1) * (1 - u) + at(x0 + 1, y0 + 1) * u) * v;
    }
    var Bs = [], natural = [], tufts = [], meadowG = [], ti, ax, ay, wx, wy, n, sh, i, r, g, b2, lx, ly, f, tf, dp, bayer, h, tile;
    for (iy = 0; iy < CHUNK; iy++) for (ix = 0; ix < CHUNK; ix++) {
      tx = cx * CHUNK + ix; ty = cy * CHUNK + iy; ti = iy * CHUNK + ix;
      Bs[ti] = biomeDef(tx, ty);
      natural[ti] = !Bs[ti] || !!Bs[ti].seasonal;
      tufts[ti] = [];
      B = Bs[ti];
      meadowG[ti] = mats[(iy + R) * M + ix + R] === MAT.GRASS && isMeadow(tx, ty, MAT.GRASS, distT(tx, ty));
      if (natural[ti] && !meadowG[ti] && mats[(iy + R) * M + ix + R] === MAT.GRASS) {
        h = hash2(tx, ty, seed + 911);
        for (k = 0; k < (h > 0.55 ? 2 : (h > 0.18 ? 1 : 0)); k++) tufts[ti].push([2 + ((hash2(tx, ty, seed + 912 + k) * 11) | 0), 3 + ((hash2(tx, ty, seed + 915 + k) * 10) | 0), hash2(tx, ty, seed + 918 + k) > 0.5]);
      }
    }
    /* grass tone noise on a coarse grid (every 4 art pixels), blended between: same look, a fraction of the cost */
    var G = N / 4 + 1, grid = new Float32Array(G * G);
    for (iy = 0; iy < G; iy++) for (ix = 0; ix < G; ix++) grid[iy * G + ix] = fbm((cx * N + ix * 4) / 46, (cy * N + iy * 4) / 46, seed + 501);
    function noiseAt(px, py) {
      var gx = px >> 2, gy = py >> 2, u = (px & 3) / 4, v = (py & 3) / 4, o = gy * G + gx;
      return (grid[o] * (1 - u) + grid[o + 1] * u) * (1 - v) + (grid[o + G] * (1 - u) + grid[o + G + 1] * u) * v;
    }
    /* 17z33 smooth shores and path edges. Each tile's material is blurred a little (a Gaussian over the
     * tile grid, worked out exactly per art pixel) and thresholded, so water and paths follow clean round
     * curves instead of the tile staircase. Only the picture changes: what you can walk on is still the tile.
     * Codes: 1 grass, 2 path, 3 water, 4 ice (left as drawn), 0 cliff top (left as drawn). Cliffs push the
     * water back so a grass lip stays at the foot of a cliff. Along every shore: a dark ink line, then foam,
     * so the edge reads by brightness alone (colour-blind players). */
    /* biomes per tile (for the borders below, and so lava and water know which they are) */
    var bM = [], mixB = new Uint8Array(M * M), lq = new Uint8Array(M * M);
    for (k = 0; k < M * M; k++) bM[k] = biomeDef(cx * CHUNK + (k % M) - R, cy * CHUNK + ((k / M) | 0) - R);
    var E = 3, PW = N + E * 2, code = new Uint8Array(PW * PW), dist = new Uint8Array(PW * PW), liqT = new Int16Array(PW * PW), vW = [], vA = [], vL = [], vP = [], fzM = [], WT = [], m0, q, fw, fa, fl, fp, thr, vn, o, oy, ox, c0, bw, bq;
    for (k = 0; k < M * M; k++) {
      m0 = mats[k];
      /* Freezeland's lakes are always ice and drawn like water, so they get smooth shores too; only a lake
         frozen over in winter (drawn as ice) is left as it is */
      ix = cx * CHUNK + (k % M) - R; iy = cy * CHUNK + ((k / M) | 0) - R;
      fzM[k] = m0 === MAT.WATER && isFrozenTile(ix, iy) && (bM[k] || {}).id !== "snow";
      /* liquids: 1 water, 2 lava. Each pulls back from the other (and from cliffs), so where a lava field
         meets a lake there is a strip of bank with an outline on both sides, never one straight seam */
      lq[k] = m0 === MAT.WATER ? (bM[k] && bM[k].solidWater ? 2 : 1) : 0;
      vW[k] = m0 === MAT.CLIFF || lq[k] === 2 ? -1 : (lq[k] === 1 && !fzM[k] ? 1 : 0);
      vA[k] = m0 === MAT.CLIFF || lq[k] === 2 ? -1 : (lq[k] === 1 ? 1 : 0);
      vL[k] = m0 === MAT.CLIFF || lq[k] === 1 ? -1 : (lq[k] === 2 ? 1 : 0);
      vP[k] = m0 === MAT.CLIFF ? -1 : (m0 === MAT.PATH ? 1 : 0);
    }
    /* 17z33 biome borders: biomes are handed out per tile, which left a staircase where two meet. Grass and
     * path pixels near a border take whichever biome covers more of the blurred neighbourhood (same blur
     * as the shores), with a little dither at the line, so borders curve. Liquids take their colour from
     * the tile they come from (liqT), so lava, ice and water never swap looks. */
    for (iy = 2; iy < M - 2; iy++) for (ix = 2; ix < M - 2; ix++) {
      q = iy * M + ix;
      for (k = -2; k <= 2 && !mixB[q]; k++) for (j = -2; j <= 2; j++) if (bM[q + k * M + j] !== bM[q]) { mixB[q] = 1; break; }
    }
    /* the shore's wobble: value noise on a 4-pixel world grid, blended */
    var VG = ((N + 8) >> 2) + 2, vgrid = new Float32Array(VG * VG);
    for (iy = 0; iy < VG; iy++) for (ix = 0; ix < VG; ix++) vgrid[iy * VG + ix] = valueNoise((cx * N - 4 + ix * 4) / 9, (cy * N - 4 + iy * 4) / 9, seed + 611);
    /* biome borders meander more slowly and further than shores, so a long straight border wanders */
    var bgrid = new Float32Array(VG * VG), bgrid2 = new Float32Array(VG * VG);
    for (iy = 0; iy < VG; iy++) for (ix = 0; ix < VG; ix++) {
      bgrid[iy * VG + ix] = valueNoise((cx * N - 4 + ix * 4) / 30, (cy * N - 4 + iy * 4) / 30, seed + 617);
      bgrid2[iy * VG + ix] = valueNoise((cx * N - 4 + ix * 4) / 30, (cy * N - 4 + iy * 4) / 30, seed + 619);
    }
    /* a tile whose eight neighbours are all the same material needs no blur: it is that material throughout */
    var uni = new Uint8Array(M * M);
    for (iy = 1; iy < M - 1; iy++) for (ix = 1; ix < M - 1; ix++) {
      q = iy * M + ix; uni[q] = 1;
      for (k = -1; k <= 1 && uni[q]; k++) for (j = -1; j <= 1; j++) if (mats[q + k * M + j] !== mats[q] || fzM[q + k * M + j] !== fzM[q] || lq[q + k * M + j] !== lq[q]) { uni[q] = 0; break; }
    }
    /* WT[l*3+k]: how much of a pixel at local coordinate l (0-15) falls on the tile k-1 tiles over, blurred */
    function Phi(z) { var t = 1 / (1 + 0.3275911 * Math.abs(z) / 1.41421356), e = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z / 2); return z < 0 ? (1 - e) / 2 : (1 + e) / 2; }
    for (k = 0; k < 16; k++) for (j = -1; j <= 1; j++) WT[k * 3 + j + 1] = Phi((16 * (j + 1) - (k + 0.5)) / 6.6) - Phi((16 * j - (k + 0.5)) / 6.6);
    for (ay = -E; ay < N + E; ay++) for (ax = -E; ax < N + E; ax++) {
      iy = (ay + 16 * R) >> 4; ix = (ax + 16 * R) >> 4; q = iy * M + ix; m0 = mats[q]; o = (ay + E) * PW + ax + E;
      if (m0 === MAT.CLIFF) { code[o] = 0; continue; }
      if (fzM[q]) { code[o] = 4; continue; }
      if (uni[q]) { code[o] = m0 === MAT.WATER ? 3 : (m0 === MAT.PATH ? 2 : 1); liqT[o] = q; continue; }
      fw = 0; fa = 0; fl = 0; fp = 0; lx = (ax + 16 * R) & 15; ly = (ay + 16 * R) & 15;
      for (k = -1; k <= 1; k++) for (j = -1; j <= 1; j++) {
        oy = WT[ly * 3 + k + 1] * WT[lx * 3 + j + 1]; c0 = q + k * M + j;
        if (iy + k < 0 || iy + k >= M || ix + j < 0 || ix + j >= M) c0 = q;
        fw += vW[c0] * oy; fa += vA[c0] * oy; fl += vL[c0] * oy; fp += vP[c0] * oy;
      }
      ox = ax + 4; oy = ay + 4; c0 = (oy >> 2) * VG + (ox >> 2); vr = (ox & 3) / 4; cv = (oy & 3) / 4;
      vn = (vgrid[c0] * (1 - vr) + vgrid[c0 + 1] * vr) * (1 - cv) + (vgrid[c0 + VG] * (1 - vr) + vgrid[c0 + VG + 1] * vr) * cv;
      thr = 0.5 + (vn - 0.5) * 0.28;
      c0 = 0;                                   /* which liquid this pixel is, if any */
      if (lq[q] === 2) c0 = fl >= thr ? 2 : 0;
      else if (lq[q] === 1) c0 = fa >= thr ? 1 : 0;
      else c0 = fl >= thr ? 2 : (fw >= thr ? 1 : 0);
      if (c0) {
        code[o] = 3;
        if (lq[q] === c0) liqT[o] = q;
        else {                                  /* the neighbouring tile of that liquid that covers it most */
          bw = -1; bq = q;
          for (k = -1; k <= 1; k++) for (j = -1; j <= 1; j++) {
            if (iy + k < 0 || iy + k >= M || ix + j < 0 || ix + j >= M || lq[q + k * M + j] !== c0) continue;
            oy = WT[ly * 3 + k + 1] * WT[lx * 3 + j + 1];
            if (oy > bw) { bw = oy; bq = q + k * M + j; }
          }
          liqT[o] = bq;
        }
      } else code[o] = fp >= thr ? 2 : 1;
    }
    /* how far each water pixel is from the bank (1-5, 5 = further): a two-sweep city-block distance */
    for (o = 0; o < PW * PW; o++) { c0 = code[o]; dist[o] = (c0 === 3 || c0 === 4) ? 5 : 0; }
    for (ay = 0; ay < PW; ay++) for (ax = 0; ax < PW; ax++) {
      o = ay * PW + ax; if (!dist[o]) continue;
      if (ax > 0 && dist[o - 1] + 1 < dist[o]) dist[o] = dist[o - 1] + 1;
      if (ay > 0 && dist[o - PW] + 1 < dist[o]) dist[o] = dist[o - PW] + 1;
    }
    for (ay = PW - 1; ay >= 0; ay--) for (ax = PW - 1; ax >= 0; ax--) {
      o = ay * PW + ax; if (!dist[o]) continue;
      if (ax < PW - 1 && dist[o + 1] + 1 < dist[o]) dist[o] = dist[o + 1] + 1;
      if (ay < PW - 1 && dist[o + PW] + 1 < dist[o]) dist[o] = dist[o + PW] + 1;
    }
    function lipAt(o) { return code[o - 1] === 1 || code[o + 1] === 1 || code[o - PW] === 1 || code[o + PW] === 1; }
    /* which biome a grass or path pixel near a border shows: the biome at a point nudged up to 12 art pixels
       by slow noise (so long straight borders meander), blurred like the shores, the pair decided by one
       rule from both sides (ordered by id) with a touch of dither at the line */
    var bbList = [], bbW = [];
    function borderBiome(ax, ay, q, bayer) {
      var ox = ax + 4, oy = ay + 4, g0 = (oy >> 2) * VG + (ox >> 2), u = (ox & 3) / 4, v = (oy & 3) / 4, gx, gy, tq, lx, ly, k, j, w, c0, list = bbList, ws = bbW, n2, b1 = -1, b2 = -1, i1 = 0, i2 = 0, A, Bb;
      list.length = 0; ws.length = 0;
      gx = ax + ((bgrid[g0] * (1 - u) + bgrid[g0 + 1] * u) * (1 - v) + (bgrid[g0 + VG] * (1 - u) + bgrid[g0 + VG + 1] * u) * v - 0.5) * 26 + 16 * R;
      gy = ay + ((bgrid2[g0] * (1 - u) + bgrid2[g0 + 1] * u) * (1 - v) + (bgrid2[g0 + VG] * (1 - u) + bgrid2[g0 + VG + 1] * u) * v - 0.5) * 26 + 16 * R;
      gx = Math.max(16, Math.min(16 * (M - 1) - 1, Math.floor(gx))); gy = Math.max(16, Math.min(16 * (M - 1) - 1, Math.floor(gy)));
      tq = (gy >> 4) * M + (gx >> 4); lx = gx & 15; ly = gy & 15;
      for (k = -1; k <= 1; k++) for (j = -1; j <= 1; j++) {
        w = WT[ly * 3 + k + 1] * WT[lx * 3 + j + 1]; c0 = bM[tq + k * M + j];
        n2 = list.indexOf(c0); if (n2 < 0) { list.push(c0); ws.push(w); } else ws[n2] += w;
      }
      for (k = 0; k < list.length; k++) {
        if (ws[k] > b1) { b2 = b1; i2 = i1; b1 = ws[k]; i1 = k; }
        else if (ws[k] > b2) { b2 = ws[k]; i2 = k; }
      }
      if (b2 < 0) return list[i1];
      A = list[i1]; Bb = list[i2]; w = b1 - b2;          /* A leads by w (0 or more) */
      /* seen from the first of the pair by id, so both sides agree on the dither */
      if (((A && A.id) || "") < ((Bb && Bb.id) || "")) return w > (bayer - 0.375) * 0.12 ? A : Bb;
      return -w > (bayer - 0.375) * 0.12 ? Bb : A;
    }
    var pB, ck, cc, masks = [], col, pc, dd, lip, own, cv, vr;
    function rgbOf(c) { var A = parseColor(c); r = A[0]; g = A[1]; b2 = A[2]; }
    for (ay = 0; ay < N; ay++) for (ax = 0; ax < N; ax++) {
      ix = ax >> 4; iy = ay >> 4; ti = iy * CHUNK + ix; mt = mats[(iy + R) * M + ix + R];
      wx = cx * N + ax; wy = cy * N + ay;
      i = ((ay * SCALE) * W + ax * SCALE) * 4;
      r = d[i]; g = d[i + 1]; b2 = d[i + 2];
      o = (ay + E) * PW + ax + E; pc = code[o]; dd = dist[o];
      bayer = BAYER[(ax & 1) + ((ay & 1) << 1)];
      pB = Bs[ti];
      if ((pc === 1 || pc === 2) && mixB[(iy + R) * M + ix + R]) pB = borderBiome(ax, ay, (iy + R) * M + ix + R, bayer);
      else if (pc === 3 && dd > 1) {
        pB = bM[liqT[o]];
        /* two biomes' lakes meeting: the colour changes along the same meandering line, but water never takes
           on lava's or Freezeland ice's look (those play differently) */
        if (mixB[(iy + R) * M + ix + R] && pB && !pB.solidWater && pB.id !== "snow") {
          c0 = borderBiome(ax, ay, (iy + R) * M + ix + R, bayer);
          if (c0 && !c0.solidWater && c0.id !== "snow") pB = c0;
        }
      }
      else if (pc === 0 && mt === MAT.CLIFF && mixB[(iy + R) * M + ix + R]) {
        /* a plateau that crosses a border: its top changes biome along the same meandering line; the
           outline and lit rims come from the tile's own edges, so they stay exactly where they were */
        pB = borderBiome(ax, ay, (iy + R) * M + ix + R, bayer);
        if (pB !== Bs[ti]) {
          lx = ax & 15; ly = ay & 15; B = pB;
          if (masks[ti] === undefined) masks[ti] = neighborMask(cx * CHUNK + ix, cy * CHUNK + iy, MAT.CLIFF);
          vr = (hash2(cx * CHUNK + ix, cy * CHUNK + iy, seed + 40) * 6) | 0;
          ck = (B ? B.id : "") + "|" + season + "|cliff"; cc = shoreCache[ck] || (shoreCache[ck] = {});
          c0 = ((masks[ti] * 6 + vr) * 16 + ly) * 16 + lx;
          if (!cc[c0]) { rgbOf(cliffTopColor(lx, ly, vr * 3, vr * 5, masks[ti])); cc[c0] = [r, g, b2]; }
          col = cc[c0]; r = col[0]; g = col[1]; b2 = col[2];
          for (j = 0; j < SCALE; j++) for (k = 0; k < SCALE; k++) { f = i + (j * W + k) * 4; d[f] = r; d[f + 1] = g; d[f + 2] = b2; }
        }
        continue;
      }
      if (pc === 1 || pc === 2 || pc === 3) {
        lx = ax & 15; ly = ay & 15;
        own = mt === MAT.GRASS ? 1 : (mt === MAT.PATH ? 2 : 3);
        cv = 1;
        if (mt !== MAT.GRASS) { if (masks[ti] === undefined) masks[ti] = neighborMask(cx * CHUNK + ix, cy * CHUNK + iy, mt); cv = coverage(lx, ly, masks[ti]); }
        lip = pc === 2 && lipAt(o);
        if (pc !== own || cv < 0.999 || (pc === 3 && dd <= 3) || lip || pB !== Bs[ti]) {
          B = pB; vr = (hash2(cx * CHUNK + ix, cy * CHUNK + iy, seed + 40) * 6) | 0;
          q = pc === 1 ? 0 : pc === 2 ? (lip ? 2 : 1) : (dd === 1 ? 3 : dd === 2 ? 4 : dd === 3 ? 5 : 6);
          ck = (B ? B.id : "") + "|" + season; cc = shoreCache[ck] || (shoreCache[ck] = {});
          c0 = ((vr * 16 + ly) * 16 + lx) * 8 + q;
          if (cc[c0]) { col = cc[c0]; r = col[0]; g = col[1]; b2 = col[2]; }
          else {
          if (pc === 1) col = grassColor(lx, ly, vr * 3, vr * 5, vr);
          else if (pc === 2) { col = pathColor(lx, ly, vr * 3, vr * 5); if (lip) col = mixHex(col, (B && B.lip) || "#3a2814", 0.55); }
          else if (dd === 1) col = mixHex(grassColor(lx, ly, vr * 3, vr * 5, vr), EDGE_INK, 0.85);
          else {
            /* a two-pixel ink line, then a bright foam line: the shore reads by brightness alone */
            col = waterColor(lx, ly, vr * 3, vr * 5, 1);
            if (dd === 2) col = mixHex(col, EDGE_INK, 0.45);
            else if (dd === 3) col = mixHex(col, (B && B.foam) || "#9af0ea", 0.5);
          }
          rgbOf(col); cc[c0] = [r, g, b2];
          }
        }
      }
      if (pc === 1) {
        /* broad patches: lighter in the sun, a touch darker in the clover, dithered at the edge */
        n = noiseAt(ax, ay);
        sh = n > 0.6 ? Math.min(1, (n - 0.6) / 0.12) * 0.09 : (n < 0.4 ? -Math.min(1, (0.4 - n) / 0.12) * 0.1 : 0);
        sh = Math.round(sh / 0.03 + (bayer - 0.375)) * 0.03;
        if (meadowG[ti] && pB === Bs[ti]) sh -= 0.12 + (bayer < 0.5 ? 0.03 : 0);
        if (sh > 0) { r += (255 - r) * sh * 0.6; g += (255 - g) * sh; b2 += (255 - b2) * sh * 0.3; }
        else if (sh < 0) { r *= 1 + sh; g *= 1 + sh * 0.7; b2 *= 1 + sh * 0.9; }
        /* tufts: a dark stem in the middle, two leaning blades, a lit tip */
        tile = pB === Bs[ti] ? tufts[ti] : []; lx = ax & 15; ly = ay & 15;
        for (k = 0; k < tile.length; k++) {
          tf = tile[k];
          if ((lx === tf[0] && (ly === tf[1] || ly === tf[1] + 1)) || (ly === tf[1] + 1 && (lx === tf[0] - 1 || lx === tf[0] + 1))) { r *= 0.72; g *= 0.78; b2 *= 0.72; }
          else if (lx === tf[0] && ly === tf[1] - 1) { r += (255 - r) * 0.22; g += (255 - g) * 0.3; b2 += (255 - b2) * 0.1; }
          else if (tf[2] && lx === tf[0] + 2 && ly === tf[1]) { r *= 0.8; g *= 0.85; b2 *= 0.8; }
        }
      } else if (pc === 3 && dd > 3 && !(pB && (pB.solidWater || pB.id === "snow"))) {
        dp = Math.max(0, Math.min(1, (dep((ax + 0.5) / 16, (ay + 0.5) / 16) - 0.9) / 2.2));
        dp = Math.round(dp * 6 + (bayer - 0.375)) / 6;
        /* the shallows: lighter and a little greener; the deep: darker */
        sh = (1 - dp) * 0.26;
        r = r + (90 - r) * sh; g = g + (190 - g) * sh; b2 = b2 + (180 - b2) * sh;
        r *= 1 - dp * 0.28; g *= 1 - dp * 0.22; b2 *= 1 - dp * 0.12;
      } else if (pc === 2) {
        /* a dirt path sits brighter than the grass, so it doesn't rely on brown vs green (colour-blind players) */
        if ((!pB || pB.seasonal) && !lipAt(o)) { r += (236 - r) * 0.2; g += (212 - g) * 0.2; b2 += (160 - b2) * 0.2; }
        h = hash2(wx >> 1, wy >> 1, seed + 931);
        if (h > 0.985) { r += (255 - r) * 0.3; g += (255 - g) * 0.28; b2 += (255 - b2) * 0.22; }
        else if (h < 0.012) { r *= 0.7; g *= 0.7; b2 *= 0.7; }
      } else if (!(pc === 1 || pc === 2 || pc === 3)) continue;
      for (j = 0; j < SCALE; j++) for (k = 0; k < SCALE; k++) {
        f = i + (j * W + k) * 4;
        d[f] = r; d[f + 1] = g; d[f + 2] = b2;
      }
    }
    /* 17z33 the moving foam: the foam line (3 px out) and the band just past it (4 px), baked at art-pixel
       size for open water (not lava, not ice); drawGround breathes them in and out so the shore ebbs */
    lastFoam = null;
    /* fbx/fby: the box round the foam, so drawGround only covers that much of the chunk (less overdraw) */
    var fa0 = null, fb0 = null, fd, nF = 0, Bq, fbx0 = N, fby0 = N, fbx1 = -1, fby1 = -1, lbx0 = N, lby0 = N, lbx1 = -1, lby1 = -1;
    for (ay = 0; ay < N; ay++) for (ax = 0; ax < N; ax++) {
      o = (ay + E) * PW + ax + E;
      if (code[o] !== 3 || (dist[o] !== 3 && dist[o] !== 4)) continue;
      Bq = bM[liqT[o]];
      if (Bq && (Bq.solidWater || Bq.id === "snow")) continue;
      if (!fa0) { fa0 = new Uint8ClampedArray(N * N * 4); fb0 = new Uint8ClampedArray(N * N * 4); }
      fd = dist[o] === 3 ? fa0 : fb0; k = (ay * N + ax) * 4;
      fd[k] = 236; fd[k + 1] = 252; fd[k + 2] = 255; fd[k + 3] = 255; nF++;
      if (ax < fbx0) fbx0 = ax; if (ax > fbx1) fbx1 = ax; if (ay < fby0) fby0 = ay; if (ay > fby1) fby1 = ay;
    }
    /* 17z33 lava crust: four frames of a dark crust with glowing cracks, the crust drifting a little further
       each frame (world-space noise, so it runs on across chunks); drawGround blends from one frame to
       the next so the surface slowly churns. Only inside the lava (past its outline). About a third of the
       surface is crust, so lava stays the brightest thing around. */
    lastLava = null;
    var lv = null, nl = 0, lf, nz, cr;
    for (ay = 0; ay < N; ay++) for (ax = 0; ax < N; ax++) {
      o = (ay + E) * PW + ax + E;
      if (code[o] !== 3 || dist[o] < 3) continue;
      Bq = bM[liqT[o]];
      if (!Bq || !Bq.solidWater) continue;
      if (!lv) lv = [new Uint8ClampedArray(N * N * 4), new Uint8ClampedArray(N * N * 4), new Uint8ClampedArray(N * N * 4), new Uint8ClampedArray(N * N * 4)];
      nl++; k = (ay * N + ax) * 4;
      if (ax < lbx0) lbx0 = ax; if (ax > lbx1) lbx1 = ax; if (ay < lby0) lby0 = ay; if (ay > lby1) lby1 = ay;
      for (lf = 0; lf < 4; lf++) {
        nz = valueNoise((cx * N + ax + lf * 3.2) / 11, (cy * N + ay + lf * 1.4) / 11, seed + 1201) * 0.65 + valueNoise((cx * N + ax - lf * 2) / 4.5, (cy * N + ay + lf * 2.6) / 4.5, seed + 1203) * 0.35;
        fd = lv[lf];
        if (nz > 0.6) { cr = Math.min(1, (nz - 0.6) / 0.06); fd[k] = 52; fd[k + 1] = 16; fd[k + 2] = 6; fd[k + 3] = 150 + cr * 70; }
        else if (nz > 0.565) { fd[k] = 255; fd[k + 1] = 214; fd[k + 2] = 110; fd[k + 3] = 120; }        /* the glowing crack round a plate */
      }
    }
    if (nl && typeof document !== "undefined") {
      lastLava = [];
      for (lf = 0; lf < 4; lf++) {
        lastLava[lf] = document.createElement("canvas"); lastLava[lf].width = lastLava[lf].height = N;
        lastLava[lf].getContext("2d").putImageData(new ImageData(lv[lf], N, N), 0, 0);
      }
      lastLava.box = [lbx0, lby0, lbx1 - lbx0 + 1, lby1 - lby0 + 1];
    }
    if (nF && typeof document !== "undefined") {
      lastFoam = { a: document.createElement("canvas"), b: document.createElement("canvas"), box: [fbx0, fby0, fbx1 - fbx0 + 1, fby1 - fby0 + 1] };
      lastFoam.a.width = lastFoam.a.height = lastFoam.b.width = lastFoam.b.height = N;
      lastFoam.a.getContext("2d").putImageData(new ImageData(fa0, N, N), 0, 0);
      lastFoam.b.getContext("2d").putImageData(new ImageData(fb0, N, N), 0, 0);
    }
    scenery(d, W, code, PW, E, Bs, natural, meadowG, cx, cy);
    ctx.putImageData(img, 0, 0);
  }

  /* 17z33 small scenery painted into the ground: reeds (with a cattail) on the bank of natural lakes, and
   * clumps of little flowers in the grass (spring and summer most, none in winter). Pure decoration. */
  var FLOWER_COL = [[250, 250, 240], [255, 222, 90], [255, 150, 190], [190, 170, 255]];
  function scenery(d, W, code, PW, E, Bs, natural, meadowG, cx, cy) {
    var ix, iy, ti, tx, ty, ax, ay, o, k, n, cand, pick, h, fl, col, px, py, fc, sm;
    function put(x, y, r, g, b) {
      if (x < 0 || y < 0 || x >= CHUNK * 16 || y >= CHUNK * 16) return;
      var i0 = (y * SCALE * W + x * SCALE) * 4, j, q, f;
      for (j = 0; j < SCALE; j++) for (q = 0; q < SCALE; q++) { f = i0 + (j * W + q) * 4; d[f] = r; d[f + 1] = g; d[f + 2] = b; }
    }
    function isGrass(x, y) { return x >= 0 && y >= 0 && x < CHUNK * 16 && y < CHUNK * 16 && code[(y + E) * PW + x + E] === 1; }
    sm = season === "spring" ? 1 : season === "summer" ? 0.8 : season === "fall" ? 0.3 : 0;
    function isTop(x, y) {          /* plateau top, at least 3 pixels from anything that isn't */
      var k, j;
      for (k = -3; k <= 3; k++) for (j = -3; j <= 3; j++) {
        if (x + j < -E || y + k < -E || x + j >= CHUNK * 16 + E || y + k >= CHUNK * 16 + E) return false;
        if (code[(y + k + E) * PW + x + j + E] !== 0) return false;
      }
      return true;
    }
    function shade(x, y, f, lift) {
      if (x < 0 || y < 0 || x >= CHUNK * 16 || y >= CHUNK * 16) return;
      var i0 = (y * SCALE * W + x * SCALE) * 4, r = d[i0], g = d[i0 + 1], b = d[i0 + 2];
      if (lift) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f * 0.5; } else { r *= f; g *= f; b *= f; }
      put(x, y, r, g, b);
    }
    for (iy = 0; iy < CHUNK; iy++) for (ix = 0; ix < CHUNK; ix++) {
      ti = iy * CHUNK + ix; tx = cx * CHUNK + ix; ty = cy * CHUNK + iy;
      /* 17z33 plateau tops: a few tufts (natural biomes, not in winter) and pebbles, so a hill top isn't bare */
      if (code[(iy * 16 + 8 + E) * PW + ix * 16 + 8 + E] === 0) {
        for (k = 0; k < 3; k++) {
          h = hash2(tx, ty, seed + 1001 + k);
          px = ix * 16 + 2 + ((hash2(tx, ty, seed + 1011 + k) * 12) | 0); py = iy * 16 + 2 + ((hash2(tx, ty, seed + 1021 + k) * 12) | 0);
          if (!isTop(px, py)) continue;
          if (k < 2 && h < 0.55 && natural[ti] && season !== "winter") {
            shade(px, py, 0.7); shade(px, py + 1, 0.7); shade(px - 1, py + 1, 0.76); shade(px + 1, py + 1, 0.76); shade(px, py - 1, 0.25, true);
          } else if (k === 2 && h < 0.45) {
            put(px, py, 168, 164, 156); put(px + 1, py, 140, 136, 130); put(px, py + 1, 60, 54, 50); put(px + 1, py + 1, 60, 54, 50);
          }
        }
        continue;
      }
      if (!natural[ti] || meadowG[ti]) continue;
      /* reeds: a grass pixel two to three pixels from open water, picked by the tile's hash */
      h = hash2(tx, ty, seed + 961);
      if (h < 0.55) {
        cand = [];
        for (ay = iy * 16 + 6; ay < iy * 16 + 16; ay++) for (ax = ix * 16 + 2; ax < ix * 16 + 14; ax++) {
          o = (ay + E) * PW + ax + E;
          if (code[o] !== 1) continue;
          if (code[o + 3] === 3 || code[o - 3] === 3 || code[o + PW * 3] === 3 || code[o + PW * 2] === 3) cand.push(ax, ay);
        }
        if (cand.length) {
          pick = ((hash2(tx, ty, seed + 962) * cand.length / 2) | 0) * 2; px = cand[pick]; py = cand[pick + 1];
          if (isGrass(px - 1, py) && isGrass(px + 1, py)) {
            /* three stems (dark), lit on the left, a brown cattail on the tallest */
            for (k = 0; k < 6; k++) put(px, py - k, 40, 84, 40);
            for (k = 0; k < 4; k++) put(px - 1, py - k - (k > 2 ? 1 : 0), 74, 128, 58);
            for (k = 0; k < 5; k++) put(px + 1, py - k, 34, 70, 36);
            put(px, py - 6, 106, 66, 34); put(px, py - 7, 120, 76, 40); put(px, py - 8, 60, 100, 48);
          }
        }
      }
      /* flower clumps where a slow noise says so */
      if (!sm || (Bs[ti] && !Bs[ti].flowers)) continue;
      n = valueNoise(tx * 0.21, ty * 0.21, seed + 971);
      if (n < 0.74 || hash2(tx, ty, seed + 972) > sm) continue;
      fc = FLOWER_COL[(valueNoise(tx * 0.08, ty * 0.08, seed + 973) * 4) | 0];
      for (k = 0; k < 4; k++) {
        px = ix * 16 + 2 + ((hash2(tx, ty, seed + 980 + k) * 12) | 0); py = iy * 16 + 2 + ((hash2(tx, ty, seed + 990 + k) * 12) | 0);
        if (!isGrass(px, py) || !isGrass(px - 1, py) || !isGrass(px + 1, py) || !isGrass(px, py - 1) || !isGrass(px, py + 1)) continue;
        /* a plus of petals round a yellow eye, a dark stem pixel under it */
        put(px - 1, py, fc[0], fc[1], fc[2]); put(px + 1, py, fc[0], fc[1], fc[2]); put(px, py - 1, fc[0], fc[1], fc[2]);
        put(px, py, fc === FLOWER_COL[1] ? 230 : 255, fc === FLOWER_COL[1] ? 140 : 214, 60);
        put(px, py + 1, 36, 76, 34);
      }
    }
  }

  /* what the ground costs (17z33 perf work; the test harness and a perf readout read these) */
  var stats = { builds: 0, buildMs: 0, dropAll: 0 };
  function nowMs() { return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now(); }
  var REBAKE_PER_FRAME = 2, rebakeClock = -1, rebakeLeft = 0;
  function getChunk(cx, cy) {
    var key = chunkKey(cx, cy), old = cache[key];
    if (old) {
      old.used = useClock;
      if (!old.stale) return old;
      if (rebakeClock !== useClock) { rebakeClock = useClock; rebakeLeft = REBAKE_PER_FRAME; }
      if (rebakeLeft <= 0) return old;                       /* its turn comes in a frame or two */
      rebakeLeft--;
    }
    var t0 = nowMs();
    var ch = buildChunk(cx, cy);
    stats.builds++; stats.buildMs += nowMs() - t0;
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
    useClock++;
    ctx.imageSmoothingEnabled = false;
    for (cy = cy0; cy <= cy1; cy++) {
      for (cx = cx0; cx <= cx1; cx++) {
        ch = getChunk(cx, cy);
        dx = cx * CHUNK * TILE;
        dy = cy * CHUNK * TILE;
        ctx.drawImage(ch.canvas, Math.round(dx), Math.round(dy));
        if (ch.foam || ch.lava) foamList.push(ch, dx, dy);
      }
    }
    /* the shore ebbing: the foam line brightens as the outer band fades, then the band washes out again
       (one slow wave for the whole map, so it never jumps at a chunk edge). Still with reduced effects. */
    if (foamList.length) {
      var t = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000, w = Math.sin(t * 0.85), i, ga = ctx.globalAlpha;
      var calm = !!D.reducedFx, aA = calm ? 0.18 : 0.1 + 0.24 * Math.max(0, -w), aB = calm ? 0 : 0.32 * Math.max(0, w) * Math.max(0, w);
      /* lava: blend frame f into f+1 over three seconds (frame 0 held still with reduced effects) */
      var lp = calm ? 0 : (t / 3) % 4, lf0 = Math.floor(lp), lfr = lp - lf0;
      function part(cv, box, x, y) {   /* just the box that has anything in it, at x3 */
        ctx.drawImage(cv, box[0], box[1], box[2], box[3], Math.round(x + box[0] * SCALE), Math.round(y + box[1] * SCALE), box[2] * SCALE, box[3] * SCALE);
      }
      for (i = 0; i < foamList.length; i += 3) {
        ch = foamList[i];
        if (ch.lava) {
          ctx.globalAlpha = 1 - lfr; part(ch.lava[lf0], ch.lava.box, foamList[i + 1], foamList[i + 2]);
          if (lfr > 0.01) { ctx.globalAlpha = lfr; part(ch.lava[(lf0 + 1) % 4], ch.lava.box, foamList[i + 1], foamList[i + 2]); }
        }
        if (!ch.foam) continue;
        if (aA > 0.01) { ctx.globalAlpha = aA; part(ch.foam.a, ch.foam.box, foamList[i + 1], foamList[i + 2]); }
        if (aB > 0.01) { ctx.globalAlpha = aB; part(ch.foam.b, ch.foam.box, foamList[i + 1], foamList[i + 2]); }
      }
      ctx.globalAlpha = ga;
      foamList.length = 0;
    }
  }
  var foamList = [];

  /* Open water and lava tiles in view, for the moving ripples and bubbles (game.js
   * drawWaterFx). Listed once per chunk; a chunk is rebuilt when ice comes or goes.
   * Each entry: [tx, ty, kind (1 water, 2 lava), inner (all four neighbours the same)] */
  function chunkWater(ch, cx, cy) {
    if (ch.water) return ch.water;
    var out = [], i, j, tx, ty, lava, inner;
    for (j = 0; j < CHUNK; j++) for (i = 0; i < CHUNK; i++) {
      tx = cx * CHUNK + i; ty = cy * CHUNK + j;
      if (materialAt(tx, ty) !== MAT.WATER) continue;
      lava = solidLiquidT(tx, ty);
      if (!lava && isFrozenTile(tx, ty)) continue;
      inner = materialAt(tx + 1, ty) === MAT.WATER && materialAt(tx - 1, ty) === MAT.WATER && materialAt(tx, ty + 1) === MAT.WATER && materialAt(tx, ty - 1) === MAT.WATER;
      out.push([tx, ty, lava ? 2 : 1, inner ? 1 : 0]);
    }
    ch.water = out;
    return out;
  }
  function waterInView(camX, camY, viewW, viewH) {
    if (!ready) return [];
    var x0 = camX - viewW / 2 - TILE, y0 = camY - viewH / 2 - TILE, x1 = camX + viewW / 2 + TILE, y1 = camY + viewH / 2 + TILE;
    var cx0 = Math.floor(x0 / (CHUNK * TILE)), cy0 = Math.floor(y0 / (CHUNK * TILE)), cx1 = Math.floor(x1 / (CHUNK * TILE)), cy1 = Math.floor(y1 / (CHUNK * TILE));
    var out = [], cx, cy, list, i, w, tx0 = Math.floor(x0 / TILE), ty0 = Math.floor(y0 / TILE), tx1 = Math.floor(x1 / TILE), ty1 = Math.floor(y1 / TILE);
    for (cy = cy0; cy <= cy1; cy++) for (cx = cx0; cx <= cx1; cx++) {
      list = chunkWater(getChunk(cx, cy), cx, cy);
      for (i = 0; i < list.length; i++) { w = list[i]; if (w[0] >= tx0 && w[0] <= tx1 && w[1] >= ty0 && w[1] <= ty1) out.push(w); }
    }
    return out;
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
    var k = propAt(tx, ty), f = SOLID[k], px, py;
    if (!f) return false;
    if (k === "cache" && used[tx + "," + ty]) return false;          /* an opened chest is gone: walk right over the spot */
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
  /* 17z33: the unbroken spires within r, nearest first (the Treasure Map) */
  function spiresNear(x, y, r, max) {
    if (!ready || !TILE) return [];
    var tx0 = Math.floor((x - r) / TILE), tx1 = Math.floor((x + r) / TILE), ty0 = Math.floor((y - r) / TILE), ty1 = Math.floor((y + r) / TILE), tx, ty, px, py, out = [];
    for (ty = ty0; ty <= ty1; ty++) for (tx = tx0; tx <= tx1; tx++) {
      if (propAt(tx, ty) !== "spire" || used[tx + "," + ty]) continue;
      px = (tx + 0.5) * TILE; py = (ty + 0.9) * TILE;
      out.push({ x: px, y: py, d: Math.sqrt((px - x) * (px - x) + (py - y) * (py - y)) });
    }
    out.sort(function (a, b) { return a.d - b.d; });
    return out.slice(0, max || 3);
  }
  /* ---- grass that burns (data.js GRASSFIRE) ----
   * Fire chars the grass tile by tile. A charred tile is remembered with the
   * battle time it grows back at; until then it is not grass (nothing to
   * burn, nothing to hide in). The map is seeded, so the same spot is still
   * there when you come back, and so is its scorch mark. */
  var burnt = {}, clock = 0;
  function setTime(t) { clock = t || 0; if (ready) iceTick(); }
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
  /* ---------- Ice (Nov 20) ----------
   * Water is a wall unless it is frozen. Three things freeze it:
   *   Freezeland lakes are always ice;
   *   winter freezes the seasonal country's rivers and lakes, shallows first,
   *     over its first ICE.freezeSec, and spring thaws them over ICE.thawSec;
   *   an ice move or an ice ultimate freezes the water it lands on for a while
   *     (freezeArea / freezeTest), which is how you bridge a river.
   * Lava never freezes. Anything left standing on water when it thaws is put
   * back on the nearest bank (moveSlide). */
  var ICE = { freezeSec: 50, thawSec: 70, shotR: 40, bridgeSec: 30 };
  var iced = {}, icedN = 0, iceNext = 1e15, iceVer = 0, iceQ = -1, thrCache = {}, thrCount = 0;
  function seasonIce() {
    var S = D.seasons, si, into;
    if (!S || !S.info) return 0;
    si = S.info(clock); into = si.progress * (S.CFG ? S.CFG.lengthSec : 486);
    if (si.id === "winter") return Math.min(1, into / ICE.freezeSec);
    if (si.id === "spring" && si.index > 0) return Math.max(0, 1 - into / ICE.thawSec);
    return 0;
  }
  /* when this tile freezes in the season's ramp: 0 = first (the shallows by the bank), 1 = last */
  function freezeAt(tx, ty) {
    var k = tkey(tx, ty), v = thrCache[k], i, j, n = 0;
    if (v !== undefined) return v;
    for (j = -2; j <= 2; j++) for (i = -2; i <= 2; i++) if (materialAt(tx + i, ty + j) === MAT.WATER) n++;
    v = 0.05 + 0.75 * (n / 25) + 0.15 * hash2(tx, ty, seed + 811);
    if (thrCount++ > 60000) { thrCache = {}; thrCount = 0; }
    thrCache[k] = v;
    return v;
  }
  var iceLevel = 0;
  function isFrozenTile(tx, ty) {
    if (materialAt(tx, ty) !== MAT.WATER) return false;
    var b = biomeDef(tx, ty), u;
    if (b && b.solidWater) return false;                       /* lava */
    if (b && b.id === "snow") return true;
    u = iced[tx + "," + ty];
    if (u && u > clock) return true;
    return !!(b && b.seasonal && iceLevel > 0 && iceLevel >= freezeAt(tx, ty));
  }
  function openWater(tx, ty) {
    return materialAt(tx, ty) === MAT.WATER && !solidLiquidT(tx, ty) && !isFrozenTile(tx, ty);
  }
  function solidLiquidT(tx, ty) { var b = biomeDef(tx, ty); return !!(b && b.solidWater); }
  /* drop the baked look of the chunk holding this tile, so it is redrawn frozen or thawed */
  function dirtyTile(tx, ty) { staleChunk(chunkKey(Math.floor(tx / CHUNK), Math.floor(ty / CHUNK))); }
  function iceTick() {
    var q = Math.floor(seasonIce() * 24), k, u, b, tx, ty;
    if (q !== iceQ) {
      if (iceQ >= 0 || q > 0) { mapChanged(); staleAll(); }
      iceQ = q; iceLevel = q / 24;
    }
    if (clock >= iceNext) {
      iceNext = 1e15;
      for (k in iced) {
        u = iced[k];
        if (u <= clock) { delete iced[k]; icedN--; b = k.split(","); tx = +b[0]; ty = +b[1]; dirtyTile(tx, ty); mapChanged(tx, ty, tx + 1, ty + 1); }
        else if (u < iceNext) iceNext = u;
      }
    }
  }
  /* freeze the water inside a test (px, py) => bool over a box, until `until` (battle time) */
  function freezeTest(test, x0, y0, x1, y1, until) {
    if (!ready || !TILE) return 0;
    var a = Math.floor(x0 / TILE), b = Math.floor(y0 / TILE), c = Math.floor(x1 / TILE), d = Math.floor(y1 / TILE), tx, ty, k, n = 0;
    for (ty = b; ty <= d; ty++) for (tx = a; tx <= c; tx++) {
      if (materialAt(tx, ty) !== MAT.WATER || solidLiquidT(tx, ty)) continue;
      if (!test((tx + 0.5) * TILE, (ty + 0.5) * TILE)) continue;
      k = tx + "," + ty;
      if (!iced[k]) icedN++;
      if (!iced[k] || iced[k] < until) { iced[k] = until; n++; dirtyTile(tx, ty); }
      if (until < iceNext) iceNext = until;
    }
    if (n) mapChanged(a, b, c + 1, d + 1);
    return n;
  }
  function freezeArea(x, y, r, until) {
    var rr = (r + TILE * 0.35) * (r + TILE * 0.35);
    return freezeTest(function (px, py) { return (px - x) * (px - x) + (py - y) * (py - y) <= rr; }, x - r - TILE, y - r - TILE, x + r + TILE, y + r + TILE, until);
  }
  /* is there water we could freeze here? (so a move knows a bridge is worth making) */
  function waterNear(x, y, r) {
    if (!ready || !TILE) return false;
    var a = Math.floor((x - r) / TILE), b = Math.floor((y - r) / TILE), c = Math.floor((x + r) / TILE), d = Math.floor((y + r) / TILE), tx, ty;
    for (ty = b; ty <= d; ty++) for (tx = a; tx <= c; tx++) if (materialAt(tx, ty) === MAT.WATER && !solidLiquidT(tx, ty)) return true;
    return false;
  }
  /* move-made ice in view that is about to give (for the cracks drawn over it) */
  function thinIceInView(camX, camY, viewW, viewH, within) {
    var out = [], k, u, p, x, y, pad = TILE;
    if (!icedN) return out;
    for (k in iced) {
      u = iced[k]; if (u - clock > within || u <= clock) continue;
      p = k.split(","); x = (+p[0] + 0.5) * TILE; y = (+p[1] + 0.5) * TILE;
      if (x < camX - viewW / 2 - pad || x > camX + viewW / 2 + pad || y < camY - viewH / 2 - pad || y > camY + viewH / 2 + pad) continue;
      if (seasonFrozenOnly(+p[0], +p[1])) continue;
      out.push({ x: x, y: y, left: u - clock });
    }
    return out;
  }
  function seasonFrozenOnly(tx, ty) {
    var b = biomeDef(tx, ty);
    return !!(b && (b.id === "snow" || (b.seasonal && iceLevel > 0 && iceLevel >= freezeAt(tx, ty))));
  }

  /* ---------- Felled trees (Nov 20) ----------
   * A big enough blast knocks trees flat. One lies where it fell for
   * FELL.log seconds, then rots to a stump, then grows back over FELL.grow. */
  var FELL = { log: 150, stump: 300, grow: 60 }, TREES = { tree: 1, snowtree: 1, deadtree: 1, cactus: 1 };
  var felled = {};
  function fellTest(test, x0, y0, x1, y1, cx, cy, at) {
    if (!ready || !TILE) return 0;
    var a = Math.floor(x0 / TILE), b = Math.floor(y0 / TILE) - 1, c = Math.floor(x1 / TILE), d = Math.floor(y1 / TILE), tx, ty, k, px, py, n = 0, f;
    for (ty = b; ty <= d; ty++) for (tx = a; tx <= c; tx++) {
      if (!TREES[propAt(tx, ty)]) continue;
      px = (tx + 0.5) * TILE; py = (ty + 0.9) * TILE;
      if (!test(px, py - 6)) continue;
      k = tx + "," + ty; f = felled[k];
      if (f && fellState(f) && fellState(f) !== 3) continue;   /* already down */
      felled[k] = { at: at, dir: (Math.abs(px - cx) < 6 ? (hash2(tx, ty, seed + 820) < 0.5 ? -1 : 1) : (px < cx ? -1 : 1)) };
      n++;
    }
    return n;
  }
  function fellArea(x, y, r, at) {
    var rr = r * r;
    return fellTest(function (px, py) { return (px - x) * (px - x) + (py - y) * (py - y) <= rr; }, x - r, y - r, x + r, y + r + TILE, x, y, at);
  }
  /* 0 standing, 1 lying where it fell, 2 a stump, 3 growing back */
  function fellState(f) {
    if (!f) return 0;
    var age = clock - f.at;
    if (age < -1 || age >= FELL.stump + FELL.grow) return 0;
    if (age < FELL.log) return 1;
    if (age < FELL.stump) return 2;
    return 3;
  }
  function fallOf(key) {
    var f = felled[key], st = fellState(f);
    if (!st) { if (f) delete felled[key]; return null; }
    return { state: st, at: f.at, age: clock - f.at, dir: f.dir, left: st === 1 ? FELL.log - (clock - f.at) : 0, grow: st === 3 ? (clock - f.at - FELL.stump) / FELL.grow : 0 };
  }

  /* ---------- Puddles and ponds (Nov 20) ----------
   * Rain soaks the ground (soak 0..1: a couple of minutes of rain to fill,
   * longer to dry, quicker in summer). Low spots, one candidate per
   * PUD.cell tiles, fill into puddles as it rises; the deepest of them
   * spread into ponds. Standing in one soaks you (wet), which carries on into
   * the element rules: fire hisses out, ice freezes, lightning conducts. */
  var PUD = { cell: 5, fill: 110, dry: 220, drySummer: 120, minR: 12, maxR: 44, pondR: 96, pondAt: 0.86 };
  var soak = 0;
  function stepSoak(wet, dt) {
    var S = D.seasons, sum = S && S.info && S.info(clock).id === "summer";
    if (wet > 0.05) soak = Math.min(1, soak + (wet * dt) / PUD.fill);
    else soak = Math.max(0, soak - dt / (sum ? PUD.drySummer : PUD.dry));
    return soak;
  }
  function puddleOfCell(cx, cy) {
    var depth = hash2(cx * 3 + 1, cy * 5 + 2, seed + 840), tx, ty, m, b, fullR, r, need;
    if (depth < 0.25) return null;
    tx = cx * PUD.cell + 1 + Math.floor(hash2(cx, cy, seed + 841) * (PUD.cell - 2));
    ty = cy * PUD.cell + 1 + Math.floor(hash2(cx, cy, seed + 842) * (PUD.cell - 2));
    if (distT(tx, ty) < 7) return null;
    m = materialAt(tx, ty);
    if (m !== MAT.GRASS && m !== MAT.PATH) return null;
    b = biomeDef(tx, ty);
    if (b && (b.solidWater || b.id === "glitch" || b.id === "circuit" || b.id === "snow")) return null;
    need = (1 - depth) * 0.9;                       /* deeper spots fill first */
    if (soak <= need) return null;
    fullR = depth >= PUD.pondAt ? PUD.pondR : PUD.minR + (PUD.maxR - PUD.minR) * (depth - 0.25) / (PUD.pondAt - 0.25);
    var px = (tx + 0.5) * TILE + (hash2(cx, cy, seed + 843) - 0.5) * TILE * 0.6, py = (ty + 0.5) * TILE, key = cx + "," + cy;
    /* never over a cliff, its wall, or water: a pond spilling across one hid the edge and read
     * as a ramp up a plateau or a bridge over a river (Nov 21) */
    fullR = Math.min(fullR, puddleRoom(key, px, py));
    if (fullR < 8) return null;
    r = fullR * Math.min(1, (soak - need) / 0.35);
    if (r < 6) return null;
    return { x: px, y: py, r: r, pond: depth >= PUD.pondAt, key: key, biome: b ? b.id : "plains", h1: hash2(cx, cy, seed + 851), h2: hash2(cx, cy, seed + 852) };
  }
  /* How big a puddle at (x, y) may grow before its outline (with the wobble it is drawn with,
   * PUD_SPILL) comes within PUD_GAP px of a cliff top, the face hanging below one, or water.
   * The land doesn't move, so it is worked out once per spot. */
  var PUD_SPILL = 1.3, PUD_GAP = 6, pudRoom = {};
  function puddleRoom(key, x, y) {
    if (pudRoom[key] != null) return pudRoom[key];
    var reach = PUD.pondR * PUD_SPILL + PUD_GAP + TILE, t0x = Math.floor((x - reach) / TILE), t1x = Math.floor((x + reach) / TILE),
        t0y = Math.floor((y - reach) / TILE), t1y = Math.floor((y + reach) / TILE), tx, ty, m, blocked, nx, ny, d, best = PUD.pondR;
    for (ty = t0y; ty <= t1y; ty++) for (tx = t0x; tx <= t1x; tx++) {
      m = materialAt(tx, ty);
      blocked = m === MAT.CLIFF || m === MAT.WATER || materialAt(tx, ty - 1) === MAT.CLIFF;     /* the last: the wall hanging into this tile */
      if (!blocked) continue;
      /* nearest point of the tile to the centre, measured in the puddle's squashed (x : 0.62y) space */
      nx = Math.max(tx * TILE, Math.min(x, (tx + 1) * TILE)); ny = Math.max(ty * TILE, Math.min(y, (ty + 1) * TILE));
      d = Math.sqrt((nx - x) * (nx - x) + ((ny - y) / 0.62) * ((ny - y) / 0.62));
      d = (d - PUD_GAP) / PUD_SPILL;
      if (d < best) best = d;
    }
    return (pudRoom[key] = Math.max(0, best));
  }
  function puddlesIn(x0, y0, x1, y1) {
    var out = [], span = PUD.cell * TILE, a, b, cx, cy, p;
    if (!ready || !TILE || soak <= 0.02) return out;
    for (cy = Math.floor(y0 / span) - 1; cy <= Math.floor(y1 / span) + 1; cy++) for (cx = Math.floor(x0 / span) - 1; cx <= Math.floor(x1 / span) + 1; cx++) {
      p = puddleOfCell(cx, cy);
      if (p && p.x + p.r > x0 && p.x - p.r < x1 && p.y + p.r > y0 && p.y - p.r < y1) out.push(p);
    }
    return out;
  }
  function inPuddle(x, y) {
    if (!ready || !TILE || soak <= 0.02) return null;
    var span = PUD.cell * TILE, cx0 = Math.floor(x / span), cy0 = Math.floor(y / span), cx, cy, p, dx, dy;
    for (cy = cy0 - 1; cy <= cy0 + 1; cy++) for (cx = cx0 - 1; cx <= cx0 + 1; cx++) {
      p = puddleOfCell(cx, cy); if (!p) continue;
      dx = (x - p.x) / p.r; dy = (y - p.y) / (p.r * 0.62);
      if (dx * dx + dy * dy <= 1) return p;
    }
    return null;
  }

  /* ---------- Snow underfoot (Nov 20): where feet leave prints ---------- */
  function snowAt(x, y) {
    if (!ready || !TILE) return false;
    var tx = Math.floor(x / TILE), ty = Math.floor(y / TILE), m = materialAt(tx, ty), b;
    if (m === MAT.CLIFF) return false;
    b = biomeDef(tx, ty);
    if (m === MAT.WATER) return false;
    return !!(b && (b.id === "snow" || (b.seasonal && season === "winter")));
  }

  /* ---------- Nests (Nov 20): where a biome's Digimon live ----------
   * One candidate spot per NEST_CELL x NEST_CELL tiles, kept if it lands on
   * open ground away from the start. Its kind is fixed by the seed:
   * "herd" (the biome's Digimon of the season's stage), "nursery" (Babies and
   * In-Training, all run long) or "alpha" (a herd led by a boss). Whose nest it
   * is follows the territory (war-sim.js). The population lives in nest-sim.js. */
  var NEST_CELL = 15, NEST_CHANCE = 0.68;
  function nestOfCell(cx, cy) {
    var h = hash2(cx * 5 + 3, cy * 7 + 1, seed + 950), tx, ty, i, j, k, ok = false, t, a, r;
    /* the four cells that meet at the start always have one, in their own quarter, 12-19 tiles
     * out: there is life nearby from the first minute */
    var home = (cx === -1 || cx === 0) && (cy === -1 || cy === 0);
    if (h >= NEST_CHANCE && !home) return null;
    /* a few tries for a dry, open spot in the cell */
    for (t = 0; t < (home ? 8 : 5) && !ok; t++) {
      if (home) {
        a = (cx === 0 ? 0 : Math.PI / 2) + (cy === 0 ? 0 : (cx === 0 ? -Math.PI / 2 : Math.PI / 2)) + (0.15 + 0.7 * hash2(cx + t * 29, cy, seed + 954)) * Math.PI / 2;
        r = 12 + hash2(cx, cy + t * 31, seed + 955) * 7;
        tx = Math.round(Math.cos(a) * r); ty = Math.round(Math.sin(a) * r);
      } else {
        tx = cx * NEST_CELL + 3 + Math.floor(hash2(cx + t * 131, cy, seed + 951) * (NEST_CELL - 6));
        ty = cy * NEST_CELL + 3 + Math.floor(hash2(cx, cy + t * 137, seed + 952) * (NEST_CELL - 6));
      }
      if (distT(tx, ty) < 11) continue;
      ok = true;
      for (j = -1; j <= 1 && ok; j++) for (i = -1; i <= 1 && ok; i++) { k = materialAt(tx + i, ty + j); if (k === MAT.CLIFF || k === MAT.WATER) ok = false; }
      if (ok && pointRaised((tx + 0.5) * TILE, (ty + 0.5) * TILE)) ok = false;
    }
    if (!ok) return null;
    k = hash2(cx * 11, cy * 3 + 5, seed + 953);
    return { key: cx + ":" + cy, tx: tx, ty: ty, x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, kind: k < 0.3 ? "nursery" : (k > 0.86 && !home ? "alpha" : "herd"), biome: biomeId(tx, ty) };
  }
  function nestsNear(x, y, r) {
    if (!ready || !TILE) return [];
    var span = NEST_CELL * TILE, out = [], cx, cy, n;
    /* one cell of margin: the start's own nests may sit just outside their cell */
    for (cy = Math.floor((y - r) / span) - 1; cy <= Math.floor((y + r) / span) + 1; cy++) for (cx = Math.floor((x - r) / span) - 1; cx <= Math.floor((x + r) / span) + 1; cx++) {
      n = nestOfCell(cx, cy);
      if (n && (n.x - x) * (n.x - x) + (n.y - y) * (n.y - y) <= r * r) out.push(n);
    }
    return out;
  }

  function markUsed(key) { used[key] = 1; }
  function isUsed(key) { return !!used[key]; }

  /* cross: 0 walks, 1 swims (open water is no wall), 2 flies (nor is lava) — biomes.js crossOf */
  function pointRaised(x, y, cross) {
    if (!ready || !TILE) return false;
    var tx = Math.floor(x / TILE);
    var ty = Math.floor(y / TILE);
    if (materialAt(tx, ty) === MAT.CLIFF || (solidLiquid(tx, ty) && !(cross >= 2)) || (!cross && openWater(tx, ty))) return true;
    if (solidProp(x, y, tx, ty)) return true;
    var ly = y - ty * TILE;
    if (ly < faceH && materialAt(tx, ty - 1) === MAT.CLIFF) return true;
    return false;
  }

  /* Raised plateaus and the hanging south face of a cliff are solid. */
  function isRaised(x, y, rad, cross) {
    rad = rad == null ? 8 : rad;
    if (pointRaised(x, y, cross)) return true;
    if (rad <= 0) return false;
    var d = rad * 0.72;
    return pointRaised(x - d, y, cross) || pointRaised(x + d, y, cross)
      || pointRaised(x, y - d, cross) || pointRaised(x, y + d, cross)
      || pointRaised(x - d, y - d, cross) || pointRaised(x + d, y - d, cross)
      || pointRaised(x - d, y + d, cross) || pointRaised(x + d, y + d, cross);
  }

  function moveSlide(x, y, dx, dy, rad, cross) {
    /* standing in open water (the ice went out from under it): back to the nearest bank */
    /* (or a conquering biome put a boulder where it stood) */
    if (ready && TILE && pointRaised(x, y, cross)) return nearestWalkable(x, y, 260, rad == null ? 8 : rad, cross);
    var nx = x + dx;
    var ny = y;
    if (!isRaised(nx, ny, rad, cross)) x = nx;
    ny = y + dy;
    if (!isRaised(x, ny, rad, cross)) y = ny;
    return { x: x, y: y };
  }

  function nearestWalkable(x, y, maxR, rad, cross) {
    rad = rad == null ? 8 : rad;
    maxR = maxR == null ? 240 : maxR;
    if (!isRaised(x, y, rad, cross)) return { x: x, y: y };
    var step = Math.max(8, TILE / 4);
    var r, a, n, ang, px, py, best = null, bd = 1e15, d;
    for (r = step; r <= maxR; r += step) {
      n = Math.max(8, (r / step) | 0) * 2;
      for (a = 0; a < n; a++) {
        ang = (a / n) * Math.PI * 2;
        px = x + Math.cos(ang) * r;
        py = y + Math.sin(ang) * r;
        if (!isRaised(px, py, rad, cross)) {
          d = (px - x) * (px - x) + (py - y) * (py - y);
          if (d < bd) { bd = d; best = { x: px, y: py }; }
        }
      }
      if (best) return best;
    }
    return { x: x, y: y };
  }

  function reset(s) {
    pudRoom = {};
    colors();
    seed = (s == null ? 1 : (s | 0)) || 1;
    dropAllChunks();
    tileCache = {};
    matCache = {}; matCount = 0; bioCache = {}; bioCount = 0; lairCache = {};
    propCache = {}; propCount = 0; used = {}; burnt = {}; clock = 0;
    terr = {}; terrN = 0; terrVer++; ownCache = {}; ownCount = 0; mapLog = [];
    iced = {}; icedN = 0; iceNext = 1e15; iceVer++; iceQ = -1; iceLevel = 0; thrCache = {}; thrCount = 0; felled = {}; soak = 0;
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
    waterInView: waterInView,
    elevationAt: elevationAt,
    materialAt: materialAt,
    _river: riverField,
    TERR: TERR,
    nativeIdAt: nativeId,
    cellOf: function (x, y) { return { cx: Math.floor(x / (TERR * TILE)), cy: Math.floor(y / (TERR * TILE)) }; },
    cellOwner: cellOwner,
    cellNative: cellNative,
    setOwner: setOwner,
    territoryString: territoryString,
    applyTerritory: applyTerritory,
    territoryVersion: function () { return terrVer; },
    mapChanges: mapChanges,
    mapVersion: function () { return iceVer; },
    stats: function () { return stats; },
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
    spiresNear: spiresNear,
    markUsed: markUsed,
    nestsNear: nestsNear,
    /* Nov 20: the living map */
    isFrozen: function (x, y) { return ready && TILE ? isFrozenTile(Math.floor(x / TILE), Math.floor(y / TILE)) : false; },
    isFrozenTile: isFrozenTile,
    openWaterAt: function (x, y) { return ready && TILE ? openWater(Math.floor(x / TILE), Math.floor(y / TILE)) : false; },
    iceVersion: function () { return iceVer; },
    iceLevel: function () { return iceLevel; },
    freezeArea: freezeArea,
    freezeTest: freezeTest,
    waterNear: waterNear,
    thinIceInView: thinIceInView,
    fellArea: fellArea,
    fellTest: fellTest,
    fallOf: fallOf,
    TREES: TREES,
    FELL: FELL,
    stepSoak: stepSoak,
    setSoak: function (v) { soak = Math.max(0, Math.min(1, v || 0)); },
    soak: function () { return soak; },
    puddlesIn: puddlesIn,
    PUD_SPILL: PUD_SPILL,
    inPuddle: inPuddle,
    snowAt: snowAt,
    ICE: ICE,
    PUD: PUD,
    isUsed: isUsed,
    SOLID: SOLID,
    moveSlide: moveSlide,
    nearestWalkable: nearestWalkable,
    getSeed: function () { return seed; },
    FACE: function () { return faceH; },
    TILE: function () { return TILE; }
  };
})(window);
