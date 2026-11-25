/* Digimon Bullet Heaven — Digi Farm pixel art (Nov 13 rebuild).
 *
 * Everything here is original pixel art, painted once into offscreen
 * canvases at 3 world pixels per art pixel (the game's SCALE) and blitted
 * with nearest-neighbour scaling:
 *   - ground: mowed lawn, meadow, clay running track with lane lines,
 *     dirt paths, tilled garden beds, station pads, flower beds;
 *   - a post-and-rail fence with a gate;
 *   - punching bag gantry + swinging bag, chalkboard easel, play blanket,
 *     Jijimon's cottage, scarecrow, well, hay, trough, trees;
 *   - crops (6 vegetables x 3 growth stages), seed packets, vegetables.
 * Seasons recolor the ground and leaves (see seasons.js).
 */
(function (global) {
  "use strict";

  var D = global.DBH = global.DBH || {};
  var P = 3;              /* world px per art px */
  var INK = "#1a1230";

  /* ---------- tiny pixel toolkit ---------- */
  function mk(w, h) {
    if (typeof document === "undefined") return null;
    var c = document.createElement("canvas");
    c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0);
    var g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    return { c: c, g: g, w: c.width, h: c.height };
  }
  function rect(a, x, y, w, h, col) { a.g.fillStyle = col; a.g.fillRect(x | 0, y | 0, w | 0, h | 0); }
  function px(a, x, y, col) { a.g.fillStyle = col; a.g.fillRect(x | 0, y | 0, 1, 1); }
  function hash(x, y, s) {
    var n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul((s | 0) + 1, 1274126177)) >>> 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
    return (n >>> 0) / 4294967296;
  }
  function rgb(h) {
    if (h.charAt(0) !== "#") {
      var m = h.match(/(\d+)\D+(\d+)\D+(\d+)/);
      return m ? [+m[1], +m[2], +m[3]] : [0, 0, 0];
    }
    return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)];
  }
  function hex(c) {
    function h(v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? "0" : "") + v.toString(16); }
    return "#" + h(c[0]) + h(c[1]) + h(c[2]);
  }
  function mix(a, b, t) {
    var x = rgb(a), y = rgb(b);
    return hex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
  }
  function ellipse(a, cx, cy, rx, ry, col) {
    var x, y;
    for (y = -ry; y <= ry; y++) {
      for (x = -rx; x <= rx; x++) {
        if ((x * x) / ((rx + 0.5) * (rx + 0.5)) + (y * y) / ((ry + 0.5) * (ry + 0.5)) <= 1) px(a, cx + x, cy + y, col);
      }
    }
  }
  function line(a, x0, y0, x1, y1, col) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, e = dx + dy, e2;
    for (;;) {
      px(a, x0, y0, col);
      if (x0 === x1 && y0 === y1) break;
      e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  /* 1-art-px ink outline around every opaque pixel. */
  function outline(a, col) {
    var img = a.g.getImageData(0, 0, a.w, a.h), d = img.data, w = a.w, h = a.h;
    var mask = new Uint8Array(w * h), i, x, y;
    for (i = 0; i < w * h; i++) mask[i] = d[i * 4 + 3] > 40 ? 1 : 0;
    var c = rgb(col || INK);
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        i = y * w + x;
        if (mask[i]) continue;
        if ((x > 0 && mask[i - 1]) || (x < w - 1 && mask[i + 1]) || (y > 0 && mask[i - w]) || (y < h - 1 && mask[i + w])) {
          d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255;
        }
      }
    }
    a.g.putImageData(img, 0, 0);
    return a;
  }
  /* Soft drop shadow ellipse (drawn into the prop canvas, below the art). */
  function shadow(a, cx, cy, rx, ry) {
    var x, y, t;
    for (y = -ry; y <= ry; y++) {
      for (x = -rx; x <= rx; x++) {
        t = (x * x) / (rx * rx) + (y * y) / (ry * ry);
        if (t <= 1) { a.g.fillStyle = "rgba(20,14,8," + (0.28 * (1 - t * 0.6)).toFixed(3) + ")"; a.g.fillRect(cx + x, cy + y, 1, 1); }
      }
    }
  }

  function season() { return (D.world && D.world.season) || "spring"; }
  function seasonize(col, kind, n, s) {
    var S = D.seasons;
    return (S && S.ground) ? S.ground(col, kind, s || season(), n) : col;
  }

  /* ---------- Ground ---------- */
  function segDist(px0, py0, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay, wx = px0 - ax, wy = py0 - ay;
    var t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy || 1)));
    var dx = px0 - (ax + vx * t), dy = py0 - (ay + vy * t);
    return Math.sqrt(dx * dx + dy * dy);
  }

  /* geo: { bounds:{x0,y0,x1,y1}, fence, track, paths:[[ax,ay,bx,by,width]], pads:[{x,y,rx,ry,kind}],
   *        garden:{x,y,w,h,plots:[{x,y,w,h}]}, beds:[{x,y,w,h}], pal } */
  function paintGround(geo) {
    var b = geo.bounds;
    var W = Math.ceil((b.x1 - b.x0) / P), H = Math.ceil((b.y1 - b.y0) / P);
    var a = mk(W, H);
    if (!a) return null;
    var s = season();
    var pal = geo.pal || {};
    /* Pre-tint palettes per season, 4 noise buckets each. */
    function bucketed(base, kind) {
      var out = [], k;
      for (k = 0; k < 4; k++) out.push(rgb(seasonize(base, kind, (k + 0.5) / 4, s)));
      return out;
    }
    function one(base, kind) { return rgb(seasonize(base, kind, 0.5, s)); }
    function shade(c, f) { return f >= 0 ? [c[0] + (255 - c[0]) * f, c[1] + (255 - c[1]) * f, c[2] + (255 - c[2]) * f] : [c[0] * (1 + f), c[1] * (1 + f), c[2] * (1 + f)]; }
    /* smooth value noise: broad patches instead of per-pixel static */
    function vn(x, y, sc, seed) {
      var fx = x / sc, fy = y / sc, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
      var p0 = hash(x0, y0, seed), p1 = hash(x0 + 1, y0, seed), p2 = hash(x0, y0 + 1, seed), p3 = hash(x0 + 1, y0 + 1, seed);
      return (p0 + (p1 - p0) * tx) + ((p2 + (p3 - p2) * tx) - (p0 + (p1 - p0) * tx)) * ty;
    }
    var gBase = one(pal.base || "#4e8a38", "grass"), gDark = one(pal.dark || "#2e6a24", "grass"), gLight = one(pal.light || "#8cbc50", "grass");
    var lawn = [shade(gBase, -0.045), gBase, [gBase[0] + (gLight[0] - gBase[0]) * 0.09, gBase[1] + (gLight[1] - gBase[1]) * 0.09, gBase[2] + (gLight[2] - gBase[2]) * 0.09]];
    var wild = [[gBase[0] + (gDark[0] - gBase[0]) * 0.62, gBase[1] + (gDark[1] - gBase[1]) * 0.62, gBase[2] + (gDark[2] - gBase[2]) * 0.62],
      [gBase[0] + (gDark[0] - gBase[0]) * 0.4, gBase[1] + (gDark[1] - gBase[1]) * 0.4, gBase[2] + (gDark[2] - gBase[2]) * 0.4],
      [gBase[0] + (gDark[0] - gBase[0]) * 0.22, gBase[1] + (gDark[1] - gBase[1]) * 0.22, gBase[2] + (gDark[2] - gBase[2]) * 0.22]];
    var bladeD = shade(gDark, -0.08), bladeL = [gBase[0] + (gLight[0] - gBase[0]) * 0.6, gBase[1] + (gLight[1] - gBase[1]) * 0.6, gBase[2] + (gLight[2] - gBase[2]) * 0.6];
    var dirt = one("#a07c50", "path"), dirtDark = one("#6c4e30", "path"), dirtLight = one("#bd9a68", "path"), dirtRim = one("#4f3a24", "path");
    var pebble = one("#cfc6b4", "path"), pebbleD = one("#7d7468", "path");
    /* 17z33: cobbles, their kerb and gaps; straw between the garden beds */
    var cob = [one("#a89a86", "path"), one("#b8ab95", "path"), one("#9a8c78", "path")], cobGap = one("#5e5446", "path"), cobKerb = one("#7a6e5e", "path"), cobRim = one("#4a4036", "path");
    var straw = one("#c8a868", "path"), strawD = one("#a88a50", "path"), strawL = one("#e4cc8c", "path");
    function mix3(c1, c2, t2) { return [c1[0] + (c2[0] - c1[0]) * t2, c1[1] + (c2[1] - c1[1]) * t2, c1[2] + (c2[2] - c1[2]) * t2]; }
    var soil = rgb(s === "winter" ? "#8a8a90" : "#5a3a22"), soilDark = rgb(s === "winter" ? "#6a6c74" : "#3e2614"), soilLight = rgb(s === "winter" ? "#c8d0d8" : "#7a5434");
    var sand = rgb(seasonize("#d8c08a", "path", 0.5, s)), sandDark = rgb(seasonize("#b89c68", "path", 0.5, s)), sandLight = rgb(seasonize("#ecdcae", "path", 0.5, s));
    var stone = rgb("#9a9488"), stoneDark = rgb("#5e5a54"), stoneLight = rgb("#c4beb0");
    var clay = rgb(s === "winter" ? "#b0706a" : "#b4523a"), clayDark = rgb(s === "winter" ? "#8a5a58" : "#8f3c2a"), clayLight = rgb(s === "winter" ? "#c88a80" : "#c96a4a"), clayEdge = rgb(s === "winter" ? "#6e4a4c" : "#5e2a20");
    var white = rgb(s === "winter" ? "#f4f8fc" : "#f2ece0"), whiteD = rgb(s === "winter" ? "#c4d0dc" : "#cdc4b2");
    var flowerCols = (pal.flower || ["#f0c020", "#e07090", "#f4f0e0"]).map(rgb);
    var fence = geo.fence, T = geo.track;
    var img = a.g.createImageData(W, H), d = img.data;
    var ix, iy, wx, wy, n, col, inYard, dx, dy, len, e, rr, ringD, i, sd, best, pad, pi, gp, plot, v, set, cxl, cyl, h, lx, ly, ox, oy, edge, wob, hw;
    for (iy = 0; iy < H; iy++) {
      wy = b.y0 + iy * P + 1;
      for (ix = 0; ix < W; ix++) {
        wx = b.x0 + ix * P + 1;
        n = hash(ix, iy, 11);
        inYard = wx > fence.x0 && wx < fence.x1 && wy > fence.y0 && wy < fence.y1;
        /* --- grass (17z33): one even tone, its light and dark patches dithered in at the edges rather
         * than painted as blobs, and a scatter of small tufts on a jittered grid --- */
        v = vn(ix, iy, 30, 3) * 0.75 + vn(ix, iy, 11, 4) * 0.25;
        set = inYard ? lawn : wild;
        col = set[1];
        if (v < 0.33 || (v < 0.39 && ((ix + iy) & 1))) col = set[0];
        else if (v > 0.67 || (v > 0.61 && ((ix + iy) & 1))) col = set[2];
        dx = wx - T.cx; dy = wy - T.cy;
        e = Math.sqrt((dx * dx) / (T.rx * T.rx) + (dy * dy) / (T.ry * T.ry));
        if (inYard && e < 1 && s !== "winter" && (Math.floor(ix / 14) & 1)) col = shade(col, 0.035);        /* the infield is mown in straight stripes */
        cxl = (ix / 7) | 0; cyl = (iy / 6) | 0; h = hash(cxl, cyl, 9);
        if (h > (inYard ? 0.72 : 0.5)) {
          lx = ix % 7; ly = iy % 6; ox = 2 + ((h * 97) | 0) % 3; oy = 2 + ((h * 53) | 0) % 2;
          /* a three-blade tuft: dark stems, one lit tip */
          if (ly === oy + 1 && (lx === ox - 1 || lx === ox + 1)) col = bladeD;
          else if (lx === ox && (ly === oy || ly === oy + 1)) col = bladeD;
          else if (lx === ox && ly === oy - 1) col = bladeL;
        }
        /* wildflowers gather in drifts outside the fence */
        if (!inYard && s !== "winter" && vn(ix, iy, 34, 71) > 0.66) {
          cxl = (ix / 4) | 0; cyl = (iy / 4) | 0; h = hash(cxl, cyl, 41);
          if (h > 0.8) { lx = ix % 4; ly = iy % 4; if (lx === 1 && ly === 1) col = flowerCols[(hash(cxl, cyl, 5) * flowerCols.length) | 0]; else if (lx === 1 && ly === 2) col = bladeD; }
        }
        /* --- packed-earth paths and yards --- */
        best = 1e9;
        for (i = 0; i < geo.paths.length; i++) {
          sd = segDist(wx, wy, geo.paths[i][0], geo.paths[i][1], geo.paths[i][2], geo.paths[i][3]) - geo.paths[i][4] / 2;
          if (sd < best) best = sd;
        }
        /* 17z33: laid cobble paths with a clean kerb, not hand-drawn dirt */
        wob = (vn(ix, iy, 5, 77) - 0.5) * 2;
        edge = best + wob;
        if (edge < 0) {
          if (edge > -3.5) col = cobRim;
          else if (edge > -6.5) col = cobKerb;
          else {
            ly = Math.floor(iy / 4); lx = Math.floor((ix + (ly & 1) * 3) / 6);
            ox = (ix + (ly & 1) * 3) % 6; oy = iy % 4;
            h = hash(lx, ly, 84);
            col = h < 0.33 ? cob[0] : (h < 0.72 ? cob[1] : cob[2]);
            if (ox === 0 || oy === 0) col = cobGap;
            else if (ox === 1 && oy === 1) col = shade(col, 0.16);
            else if (ox === 5 || oy === 3) col = shade(col, -0.12);
          }
        } else if (edge < 3) col = shade(col, -0.2);         /* the grass is shaded right at the kerb */
        /* --- station pads --- */
        for (pi = 0; pi < geo.pads.length; pi++) {
          pad = geo.pads[pi];
          dx = (wx - pad.x) / pad.rx; dy = (wy - pad.y) / pad.ry;
          e = dx * dx + dy * dy + (vn(ix, iy, 5, 60 + pi) - 0.5) * (pad.kind === "plaza" ? 0 : 0.06);
          if (e > 1.1) continue;
          if (e > 1) { col = shade(col, -0.2); continue; }
          if (pad.kind === "plaza") {
            /* flagstones in rings round a round centre stone, a kerb of dark slabs at the rim */
            var pr = Math.sqrt(e), pa = Math.atan2(dy, dx), ringI = Math.floor(pr * 5), segN = 6 + ringI * 6, segI = Math.floor((pa + Math.PI) / (Math.PI * 2) * segN);
            var pf = pr * 5 - ringI, pg = ((pa + Math.PI) / (Math.PI * 2) * segN) - segI, hp = hash(segI, ringI, 89);
            col = hp < 0.3 ? stone : (hp < 0.7 ? stoneLight : shade(stone, 0.06));
            if (pr < 0.2) col = pr < 0.12 ? stoneLight : stone;
            else if (pf < 0.12 || pg < 0.06) col = stoneDark;
            else if (pf > 0.82) col = shade(col, -0.1);
            if (e > 0.86) col = (Math.floor((pa + Math.PI) * 40) & 7) ? stoneDark : shade(stoneDark, -0.25);
            continue;
          }
          if (pad.kind === "sand") col = e > 0.8 ? sandDark : (vn(ix, iy, 6, 63) > 0.62 ? sandLight : (n > 0.9 ? sandDark : sand));
          else if (pad.kind === "worn") { if (vn(ix, iy, 4, 66) > e * 0.9 + 0.12) col = e < 0.45 && vn(ix, iy, 6, 67) > 0.5 ? dirtLight : dirt; }
          else if (pad.kind === "stone") {
            var rowS = Math.floor(wy / 15), offS = (rowS & 1) * 11, cellS = Math.floor((wx + offS) / 22);
            var edgeS = (((wx + offS) % 22 + 22) % 22 < 3) || (((wy % 15) + 15) % 15 < 3);
            var hs = hash(cellS, rowS, 88);
            col = edgeS ? stoneDark : (hs > 0.66 ? stoneLight : hs < 0.2 ? shade(stone, -0.1) : stone);
            if (!edgeS && (((wy % 15) + 15) % 15 < 6) && hs > 0.3) col = shade(col, 0.1);
            if (e > 0.84) col = stoneDark;
          }
        }
        /* --- yards (17z33): a sanded training yard and a lawn edged with timber --- */
        for (i = 0; i < (geo.yards || []).length; i++) {
          gp = geo.yards[i];
          if (wx < gp.x || wx >= gp.x + gp.w || wy < gp.y || wy >= gp.y + gp.h) {
            if (wx >= gp.x - 6 && wx < gp.x + gp.w + 6 && wy >= gp.y && wy < gp.y + gp.h + 8) col = shade(col, -0.18);   /* its shadow */
            continue;
          }
          var yin = Math.min(wx - gp.x, gp.x + gp.w - wx, wy - gp.y, gp.y + gp.h - wy);
          if (yin < 3) col = rgb("#3a2414");
          else if (yin < 9) col = (wy > gp.y + gp.h - 9) ? rgb("#6e4826") : (yin < 5 ? rgb("#b8864e") : rgb("#8a5c30"));
          else if (gp.kind === "sand") {
            col = (vn(ix, iy, 9, 97) > 0.6 && ((ix + iy) & 1)) ? sandLight : sand;
            if (n > 0.93) col = sandDark;
            if (yin < 13) col = sandDark;
            /* raked lines */
            if (((iy) % 6 === 0) && yin > 16 && hash(ix >> 3, iy, 98) > 0.35) col = mix3(col, sandDark, 0.5);
          } else if (yin < 12) col = shade(col, -0.08);
        }
        /* --- flower beds --- */
        for (i = 0; i < geo.beds.length; i++) {
          gp = geo.beds[i];
          if (wx >= gp.x && wx < gp.x + gp.w && wy >= gp.y && wy < gp.y + gp.h) {
            col = n > 0.5 ? soil : soilDark;
            if (wx < gp.x + 4 || wx >= gp.x + gp.w - 4 || wy < gp.y + 4 || wy >= gp.y + gp.h - 4) col = rgb(wy >= gp.y + gp.h - 4 ? "#553018" : "#7a4a2a");
            else if (s !== "winter" && hash(ix >> 1, iy >> 1, 91) > 0.6) col = flowerCols[(hash(ix >> 1, iy >> 1, 93) * flowerCols.length) | 0];
            else if (s !== "winter" && hash(ix, iy, 92) > 0.55) col = rgb("#3e7a2a");
          }
        }
        /* --- garden: a bed edged with timber, tilled plots inside --- */
        var G = geo.garden;
        if (G && wx >= G.x - 20 && wx < G.x + G.w + 20 && wy >= G.y - 20 && wy < G.y + G.h + 20) {
          var gin = Math.min(wx - (G.x - 20), G.x + G.w + 20 - wx, wy - (G.y - 20), G.y + G.h + 20 - wy);
          if (gin < 3) col = rgb("#3a2414");
          else if (gin < 9) col = wy > G.y + G.h + 8 ? rgb("#6e4826") : (gin < 6 ? rgb("#a87844") : rgb("#8a5c30"));
          else {
            /* 17z33: fine straw-and-gravel walks between the beds */
            col = ((ix * 7 + iy * 3) % 5 === 0) ? strawL : (n > 0.55 ? straw : strawD);
          }
          for (i = 0; i < G.plots.length; i++) {
            plot = G.plots[i];
            if (wx >= plot.x - 5 && wx < plot.x + plot.w + 5 && wy >= plot.y - 5 && wy < plot.y + plot.h + 8) {
              /* each plot is a raised bed in a timber frame: a lit top board, a shaded front board */
              var pin = Math.min(wx - (plot.x - 5), plot.x + plot.w + 5 - wx, wy - (plot.y - 5), plot.y + plot.h + 8 - wy);
              if (wy >= plot.y + plot.h && wx >= plot.x - 5 && wx < plot.x + plot.w + 5) col = wy < plot.y + plot.h + 3 ? rgb("#8a5c30") : rgb("#5a3a1c");
              else if (pin < 2) col = rgb("#3a2414");
              else if (pin < 5) col = wy < plot.y ? rgb("#c8955a") : rgb("#a87844");
              else {
                var fr = ((wy - plot.y) % 10);
                col = fr < 2 ? soilDark : (fr < 4 ? soilLight : (n > 0.7 ? soilDark : soil));
              }
            }
          }
        }
        /* --- running track: clay with white kerbs, a dashed lane line, a dark outer lip --- */
        dx = wx - T.cx; dy = wy - T.cy;
        len = Math.sqrt(dx * dx + dy * dy) || 1;
        e = Math.sqrt((dx * dx) / (T.rx * T.rx) + (dy * dy) / (T.ry * T.ry));
        rr = len / (e || 1);
        ringD = len - rr; hw = T.width / 2;
        if (Math.abs(ringD) <= hw) {
          col = vn(ix, iy, 5, 31) > 0.66 ? clayLight : (n < 0.06 ? clayDark : clay);
          if (ringD > hw - 9 && ringD <= hw - 4 && dy > 0) col = clayDark;          /* the lower inside edge sits in shade */
          if (Math.abs(ringD) > hw - 4) col = (ringD > 0 ? dy > 0 : dy < 0) ? whiteD : white;
          else if (Math.abs(ringD) < 1.6) {
            var ang = Math.atan2(dy / T.ry, dx / T.rx);
            if (((ang + Math.PI) * 15 | 0) % 2 === 0) col = white;
          }
          if (dx > 0 && Math.abs(dy) < 10 && Math.abs(ringD) <= hw - 4) {
            var ck = ((Math.floor((wy + 600) / 6) + Math.floor((ringD + 600) / 6)) & 1);
            col = ck ? white : rgb("#2a2430");
          }
          if (s === "winter" && n > 0.93) col = white;
        } else if (Math.abs(ringD) <= hw + 3) col = clayEdge;
        else if (Math.abs(ringD) <= hw + 7) col = shade(col, -0.18);
        i = (iy * W + ix) * 4;
        d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
      }
    }
    a.g.putImageData(img, 0, 0);
    return { canvas: a.c, x: b.x0, y: b.y0, w: W * P, h: H * P };
  }

  /* ---------- Fence ---------- */
  function paintFence(fence, gate) {
    var m = 12;
    var x0 = fence.x0 - m, y0 = fence.y0 - 36, x1 = fence.x1 + m, y1 = fence.y1 + 12;
    var a = mk(Math.ceil((x1 - x0) / P), Math.ceil((y1 - y0) / P));
    if (!a) return null;
    var wood = "#9a6a3a", woodLight = "#c8955a", woodDark = "#6a4424", woodDeep = "#4a2c14";
    if (season() === "winter") { wood = "#8a6a4a"; woodLight = "#eef4f8"; }
    function A(wx) { return Math.round((wx - x0) / P); }
    function B(wy) { return Math.round((wy - y0) / P); }
    var fx, ax, ay, i;
    function post(px0, py0, hgt) {
      rect(a, px0 - 1, py0 - hgt, 4, hgt, wood);
      rect(a, px0 - 1, py0 - hgt, 1, hgt, woodLight);
      rect(a, px0 + 2, py0 - hgt, 1, hgt, woodDark);
      rect(a, px0 - 1, py0 - hgt, 4, 1, woodLight);
      rect(a, px0 - 1, py0, 4, 1, woodDeep);
    }
    function railH(xa, xb, yy) {
      rect(a, xa, yy, xb - xa, 2, wood);
      rect(a, xa, yy, xb - xa, 1, woodLight);
      rect(a, xa, yy + 2, xb - xa, 1, woodDark);
    }
    var gx0 = gate ? A(gate.x0) : -1, gx1 = gate ? A(gate.x1) : -1;
    /* North + south rails (front view) */
    var yN = B(fence.y0), yS = B(fence.y1);
    var xa = A(fence.x0), xb = A(fence.x1);
    railH(xa, xb, yN - 8); railH(xa, xb, yN - 4);
    if (gate) {
      railH(xa, gx0, yS - 8); railH(xa, gx0, yS - 4);
      railH(gx1, xb, yS - 8); railH(gx1, xb, yS - 4);
    } else { railH(xa, xb, yS - 8); railH(xa, xb, yS - 4); }
    /* West + east rails (top view, thin) */
    rect(a, xa, yN - 4, 2, yS - yN, woodDark);
    rect(a, xa + 1, yN - 4, 1, yS - yN, woodLight);
    rect(a, xb - 2, yN - 4, 2, yS - yN, woodDark);
    rect(a, xb - 2, yN - 4, 1, yS - yN, woodLight);
    /* Posts */
    for (fx = fence.x0; fx <= fence.x1 + 1; fx += 36) {
      ax = A(fx);
      post(ax, yN, 12);
      if (!gate || ax <= gx0 || ax >= gx1) post(ax, yS, 12);
    }
    for (i = fence.y0 + 36; i < fence.y1; i += 36) {
      ay = B(i);
      post(xa, ay, 10);
      post(xb - 2, ay, 10);
    }
    if (gate) {
      /* Gate posts with a little arch sign */
      post(gx0, yS, 18); post(gx1, yS, 18);
      rect(a, gx0, yS - 20, gx1 - gx0 + 3, 3, woodDark);
      rect(a, gx0, yS - 20, gx1 - gx0 + 3, 1, woodLight);
      /* Open gate leaves swung inward */
      for (i = 0; i < 3; i++) {
        line(a, gx0 + 2, yS - 4 - i * 3, gx0 + 8, yS - 10 - i * 3, wood);
        line(a, gx1, yS - 4 - i * 3, gx1 - 6, yS - 10 - i * 3, wood);
      }
    }
    return { canvas: a.c, x: x0, y: y0, w: a.w * P, h: a.h * P };
  }

  /* ---------- Props ---------- */
  function finish(a, ax, ay) { return { canvas: a.c, ax: ax, ay: ay, w: a.w * P, h: a.h * P }; }

  function bagFrame() {
    var a = mk(30, 40);
    shadow(a, 15, 37, 13, 3);
    var w = "#8a5a32", wl = "#b07a48", wd = "#5a3a1c";
    /* A-frame legs */
    line(a, 4, 37, 8, 6, w); line(a, 5, 37, 9, 6, wl);
    line(a, 26, 37, 22, 6, w); line(a, 25, 37, 21, 6, wd);
    /* top beam */
    rect(a, 4, 4, 22, 3, w); rect(a, 4, 4, 22, 1, wl); rect(a, 4, 7, 22, 1, wd);
    /* braces */
    line(a, 6, 22, 24, 22, wd);
    /* hook */
    rect(a, 14, 7, 2, 2, "#c0c4cc");
    outline(a);
    return finish(a, 15, 38);
  }
  function bagBody() {
    var a = mk(14, 26);
    /* chain */
    var i;
    for (i = 0; i < 6; i++) px(a, 7, i, i % 2 ? "#9aa0aa" : "#d0d4dc");
    /* leather bag */
    rect(a, 3, 6, 8, 18, "#a0402c");
    rect(a, 2, 8, 10, 14, "#a0402c");
    rect(a, 3, 7, 2, 15, "#c86048");
    rect(a, 10, 8, 1, 14, "#6a2418");
    rect(a, 2, 9, 10, 1, "#e0c890"); rect(a, 2, 19, 10, 1, "#e0c890");
    rect(a, 3, 6, 8, 1, "#3a2a24"); rect(a, 3, 24, 8, 1, "#5a2014");
    px(a, 5, 13, "#e8a080");
    outline(a);
    return finish(a, 7, 0);
  }
  function board() {
    var a = mk(36, 40);
    shadow(a, 18, 37, 14, 3);
    var w = "#8a5a32", wl = "#b07a48", wd = "#5a3a1c";
    /* easel legs */
    line(a, 6, 37, 10, 8, w); line(a, 30, 37, 26, 8, w); line(a, 18, 37, 18, 26, wd);
    /* frame */
    rect(a, 3, 4, 30, 22, w); rect(a, 3, 4, 30, 1, wl); rect(a, 3, 25, 30, 1, wd);
    /* slate */
    rect(a, 5, 6, 26, 18, "#2e5a40");
    rect(a, 5, 6, 26, 2, "#3a6a4c");
    /* chalk scribbles: "ABC", a little math, a star */
    var c = "#eef0e4";
    rect(a, 7, 9, 1, 4, c); rect(a, 9, 9, 1, 4, c); rect(a, 7, 9, 3, 1, c); rect(a, 7, 11, 3, 1, c); /* A */
    rect(a, 11, 9, 1, 4, c); rect(a, 11, 9, 2, 1, c); rect(a, 11, 11, 2, 1, c); rect(a, 11, 12, 2, 1, c); px(a, 13, 10, c); /* B */
    rect(a, 15, 9, 3, 1, c); rect(a, 15, 9, 1, 4, c); rect(a, 15, 12, 3, 1, c); /* C */
    rect(a, 7, 16, 1, 3, c); rect(a, 6, 17, 3, 1, c); rect(a, 10, 17, 2, 1, c); rect(a, 10, 18, 2, 1, c); rect(a, 13, 16, 2, 1, c); rect(a, 14, 16, 1, 3, c);
    line(a, 22, 9, 27, 14, "#c8d8a0"); line(a, 22, 14, 27, 9, "#c8d8a0");
    rect(a, 21, 18, 7, 1, "#c8a8d8");
    /* chalk tray */
    rect(a, 4, 26, 28, 2, wd); rect(a, 9, 25, 3, 1, "#ffffff"); rect(a, 22, 25, 4, 1, "#e0a0c0");
    outline(a);
    return finish(a, 18, 38);
  }
  function playMat(t) {
    var a = mk(40, 30);
    shadow(a, 20, 24, 18, 4);
    /* checkered picnic blanket */
    var x, y, c1 = "#d04848", c2 = "#f0e0d0";
    for (y = 14; y < 27; y++) for (x = 3; x < 37; x++) {
      var sk = (y - 14) * 0.25;
      if (x < 3 + sk || x > 36 - sk) continue;
      px(a, x, y, ((x >> 2) + (y >> 2)) & 1 ? c1 : c2);
    }
    /* crate + CRT */
    rect(a, 22, 9, 12, 6, "#8a5a28"); rect(a, 22, 9, 12, 1, "#a87a40");
    rect(a, 23, 1, 10, 8, "#3a3a40"); rect(a, 24, 2, 8, 6, "#1e2a24");
    rect(a, 25, 3, 6, 4, "#7ad8a0"); px(a, 26, 3, "#d8ffe8");
    px(a, 32, 7, "#d0d0c0");
    /* ball */
    ellipse(a, 9, 18, 3, 3, "#f0c020"); px(a, 8, 17, "#fff4b0"); rect(a, 6, 18, 7, 1, "#e06030");
    /* blocks */
    rect(a, 14, 19, 3, 3, "#4a8ae0"); rect(a, 17, 20, 3, 3, "#58c070"); rect(a, 15, 16, 3, 3, "#e0a030");
    /* controllers */
    rect(a, 23, 20, 4, 2, "#2a2a30"); rect(a, 29, 21, 4, 2, "#2a2a30"); px(a, 26, 20, "#e04040"); px(a, 32, 21, "#e04040");
    line(a, 25, 19, 27, 15, "#2a2018"); line(a, 31, 20, 30, 15, "#2a2018");
    outline(a);
    return finish(a, 20, 26);
  }
  function cottage() {
    var a = mk(64, 60);
    shadow(a, 32, 55, 30, 4);
    var s = season();
    var roof = s === "fall" ? "#b8502c" : "#c04a30", roofL = "#e07048", roofD = "#7a2a18";
    /* walls */
    rect(a, 8, 26, 48, 28, "#c8a070");
    var y;
    for (y = 27; y < 54; y += 4) { rect(a, 8, y, 48, 1, "#a88050"); }
    rect(a, 8, 26, 2, 28, "#e0c090"); rect(a, 54, 26, 2, 28, "#8a6038");
    /* foundation */
    rect(a, 6, 52, 52, 3, "#8a8478"); rect(a, 6, 52, 52, 1, "#b0aa9c");
    /* roof */
    for (y = 0; y < 22; y++) {
      var half = 6 + y * 1.36;
      rect(a, 32 - half, 6 + y, half * 2, 1, (y % 4 === 0) ? roofD : roof);
    }
    line(a, 32, 6, 2, 28, roofL); line(a, 32, 6, 62, 28, roofD);
    rect(a, 1, 27, 62, 2, roofD);
    if (s === "winter") { for (y = 0; y < 8; y++) { var hw = 6 + y * 1.36; rect(a, 32 - hw, 6 + y, hw * 2, 1, "#f0f6fa"); } rect(a, 1, 27, 62, 1, "#f0f6fa"); }
    /* chimney */
    rect(a, 44, 4, 6, 12, "#8a4a38"); rect(a, 43, 3, 8, 2, "#6a3a2a");
    /* door */
    rect(a, 27, 38, 10, 16, "#6a3a1e"); rect(a, 28, 39, 8, 15, "#8a4e28"); px(a, 34, 47, "#f0d060");
    rect(a, 26, 37, 12, 1, "#4a2814");
    /* windows with warm light */
    function win(x) {
      rect(a, x, 33, 9, 8, "#4a2814"); rect(a, x + 1, 34, 7, 6, "#f0d890");
      rect(a, x + 4, 34, 1, 6, "#8a5a30"); rect(a, x + 1, 37, 7, 1, "#8a5a30");
      rect(a, x - 1, 41, 11, 2, "#6a8a3a"); px(a, x + 1, 41, "#e86080"); px(a, x + 5, 41, "#f0c020"); px(a, x + 8, 41, "#e86080");
    }
    win(12); win(43);
    /* sign */
    rect(a, 22, 29, 20, 6, "#e8d4a0"); rect(a, 22, 29, 20, 1, "#fff0c0"); rect(a, 22, 34, 20, 1, "#a88a58");
    outline(a);
    return finish(a, 32, 55);
  }
  function scarecrow() {
    var a = mk(20, 32);
    shadow(a, 10, 30, 7, 2);
    rect(a, 9, 10, 2, 20, "#8a5a32");
    rect(a, 2, 12, 16, 2, "#8a5a32");
    rect(a, 5, 12, 10, 9, "#3a6ab8"); rect(a, 5, 12, 10, 1, "#5a8ad8"); rect(a, 9, 13, 2, 8, "#c84040");
    rect(a, 2, 13, 3, 2, "#e8c060"); rect(a, 15, 13, 3, 2, "#e8c060");
    ellipse(a, 10, 7, 4, 4, "#d2b47a"); rect(a, 12, 5, 2, 5, "#b8965c"); rect(a, 7, 10, 6, 1, "#a07c48");
    px(a, 8, 6, INK); px(a, 9, 7, INK); px(a, 9, 6, "#8a6a3a"); px(a, 12, 6, INK); px(a, 11, 7, INK);
    px(a, 8, 9, "#6a4a28"); px(a, 10, 9, "#6a4a28"); px(a, 12, 9, "#6a4a28");
    px(a, 1, 12, "#e8c060"); px(a, 1, 15, "#e8c060"); px(a, 18, 12, "#e8c060"); px(a, 18, 15, "#e8c060"); px(a, 6, 11, "#e8c060"); px(a, 13, 11, "#e8c060");
    rect(a, 5, 17, 10, 1, "#2e5494"); rect(a, 12, 15, 2, 2, "#d8b040");
    rect(a, 4, 2, 12, 2, "#c89040"); rect(a, 6, 0, 8, 3, "#c89040"); rect(a, 6, 2, 8, 1, "#8a5a28");
    outline(a);
    return finish(a, 10, 30);
  }
  function gardenSign() {
    var a = mk(24, 18);
    rect(a, 4, 9, 2, 8, "#6a4424"); rect(a, 18, 9, 2, 8, "#6a4424");
    rect(a, 1, 2, 22, 9, "#c8955a"); rect(a, 1, 2, 22, 1, "#e8b880"); rect(a, 1, 10, 22, 1, "#8a5a32");
    /* carrot + leaf emblem */
    line(a, 6, 4, 9, 8, "#f08a28"); line(a, 7, 4, 10, 8, "#f08a28"); px(a, 6, 3, "#58c040"); px(a, 7, 2, "#58c040");
    rect(a, 12, 5, 9, 1, "#5a3a1c"); rect(a, 12, 7, 7, 1, "#5a3a1c");
    outline(a);
    return finish(a, 12, 17);
  }
  function well() {
    var a = mk(24, 28);
    shadow(a, 12, 25, 11, 3);
    rect(a, 3, 15, 18, 10, "#8a8478"); var x;
    for (x = 3; x < 21; x += 4) rect(a, x, 15, 1, 10, "#6a665e");
    rect(a, 3, 15, 18, 2, "#b0aa9c"); rect(a, 5, 16, 14, 2, "#24406a");
    rect(a, 4, 3, 2, 13, "#6a4424"); rect(a, 18, 3, 2, 13, "#6a4424");
    rect(a, 2, 1, 20, 3, "#a04030"); rect(a, 2, 1, 20, 1, "#d06040");
    rect(a, 8, 7, 8, 1, "#9aa0aa"); rect(a, 11, 8, 2, 4, "#8a5a32");
    outline(a);
    return finish(a, 12, 25);
  }
  function hay() {
    var a = mk(18, 13);
    shadow(a, 9, 11, 8, 2);
    rect(a, 1, 2, 16, 9, "#d8b048"); rect(a, 1, 2, 16, 2, "#f0d070"); rect(a, 1, 9, 16, 2, "#a88030");
    rect(a, 5, 2, 1, 9, "#8a5a28"); rect(a, 12, 2, 1, 9, "#8a5a28");
    var i; for (i = 0; i < 10; i++) px(a, 2 + ((i * 7) % 14), 4 + (i % 4), "#f8e090");
    outline(a);
    return finish(a, 9, 11);
  }
  function trough() {
    var a = mk(22, 12);
    shadow(a, 11, 10, 10, 2);
    rect(a, 1, 3, 20, 6, "#8a5a32"); rect(a, 1, 3, 20, 1, "#b07a48");
    rect(a, 2, 4, 18, 2, season() === "winter" ? "#c8e8f4" : "#3a8ac8"); px(a, 6, 4, "#bfe8ff");
    rect(a, 2, 9, 2, 2, "#5a3a1c"); rect(a, 18, 9, 2, 2, "#5a3a1c");
    outline(a);
    return finish(a, 11, 10);
  }
  function tree(variant) {
    var a = mk(30, 42);
    shadow(a, 15, 39, 12, 3);
    var s = season();
    rect(a, 13, 24, 4, 15, "#6a4424"); rect(a, 13, 24, 1, 15, "#8a5a32");
    var leaf = s === "fall" ? (variant ? "#d06a2a" : "#e09a30") : s === "winter" ? "#4a6a62" : s === "spring" ? "#4e9a40" : "#3e8a34";
    var leafL = s === "fall" ? "#f0b048" : s === "winter" ? "#eef4f8" : "#7ac050";
    var leafD = s === "fall" ? "#a0401c" : s === "winter" ? "#2e4a46" : "#2a6224";
    ellipse(a, 15, 16, 12, 12, leafD);
    ellipse(a, 14, 14, 11, 10, leaf);
    ellipse(a, 11, 10, 6, 5, leafL);
    ellipse(a, 11, 10, 4, 3, leaf);
    if (s === "spring") { var i; for (i = 0; i < 9; i++) px(a, 6 + ((i * 11) % 18), 8 + ((i * 7) % 14), "#f8b8d0"); }
    if (s === "summer" && variant) { px(a, 10, 18, "#e83a30"); px(a, 18, 14, "#e83a30"); px(a, 20, 20, "#e83a30"); }
    outline(a);
    return finish(a, 15, 39);
  }
  function flowerPot() {
    var a = mk(10, 12);
    rect(a, 2, 6, 6, 5, "#b85a34"); rect(a, 1, 6, 8, 1, "#d87a50");
    var s = season();
    if (s !== "winter") { rect(a, 4, 2, 2, 4, "#3e7a2a"); px(a, 3, 2, "#e86080"); px(a, 6, 1, "#f0c020"); px(a, 5, 3, "#e86080"); }
    outline(a);
    return finish(a, 5, 11);
  }

  /* 17z33: furniture for the planned yard */
  function lamp() {
    var a = mk(12, 36);
    shadow(a, 6, 34, 5, 2);
    rect(a, 4, 30, 4, 4, "#2e2a30"); rect(a, 4, 30, 4, 1, "#4a4650");                   /* base */
    rect(a, 5, 10, 2, 21, "#3a3640"); rect(a, 5, 10, 1, 21, "#5a5660");                  /* post */
    rect(a, 3, 8, 6, 2, "#2e2a30");
    rect(a, 2, 2, 8, 7, "#2e2a30"); rect(a, 3, 3, 6, 5, "#ffe08a"); rect(a, 3, 3, 2, 2, "#fff6d0");   /* the lantern */
    rect(a, 2, 1, 8, 1, "#4a4650"); rect(a, 4, 0, 4, 1, "#2e2a30");
    rect(a, 5, 3, 1, 5, "#c8a050");
    outline(a);
    return finish(a, 6, 34);
  }
  function bench() {
    var a = mk(26, 14);
    shadow(a, 13, 12, 12, 2);
    var w = "#9a6a3a", wl = "#c8955a", wd = "#6a4424";
    rect(a, 2, 1, 22, 2, w); rect(a, 2, 1, 22, 1, wl);                                     /* back rest */
    rect(a, 2, 5, 22, 3, w); rect(a, 2, 5, 22, 1, wl); rect(a, 2, 7, 22, 1, wd);          /* seat */
    rect(a, 3, 3, 2, 2, "#3a3640"); rect(a, 21, 3, 2, 2, "#3a3640");
    rect(a, 3, 8, 2, 4, "#3a3640"); rect(a, 21, 8, 2, 4, "#3a3640");
    outline(a);
    return finish(a, 13, 12);
  }
  function crates() {
    var a = mk(22, 22);
    shadow(a, 11, 20, 10, 2);
    function crate(x, y, sz) {
      rect(a, x, y, sz, sz, "#b07a48"); rect(a, x, y, sz, 1, "#d8a468"); rect(a, x, y + sz - 1, sz, 1, "#6a4424");
      rect(a, x, y, 1, sz, "#8a5a32"); rect(a, x + sz - 1, y, 1, sz, "#8a5a32");
      line(a, x + 1, y + 1, x + sz - 2, y + sz - 2, "#8a5a32");
    }
    crate(1, 9, 11); crate(11, 11, 9); crate(5, 1, 9);
    outline(a);
    return finish(a, 11, 20);
  }
  function barrel() {
    var a = mk(12, 16);
    shadow(a, 6, 14, 5, 2);
    rect(a, 2, 2, 8, 12, "#9a6a3a"); rect(a, 1, 4, 10, 8, "#9a6a3a");
    rect(a, 3, 2, 2, 12, "#c8955a"); rect(a, 9, 3, 1, 10, "#6a4424");
    rect(a, 1, 4, 10, 1, "#4a4650"); rect(a, 1, 11, 10, 1, "#4a4650");
    rect(a, 2, 1, 8, 2, "#6a4424"); rect(a, 3, 1, 6, 1, "#8a5a32");
    outline(a);
    return finish(a, 6, 14);
  }
  function planter() {
    var a = mk(16, 14);
    shadow(a, 8, 12, 7, 2);
    rect(a, 1, 6, 14, 6, "#8a5a32"); rect(a, 1, 6, 14, 1, "#c8955a"); rect(a, 1, 11, 14, 1, "#5a3a1c");
    var s2 = season(), i;
    if (s2 !== "winter") {
      ellipse(a, 8, 4, 6, 3, s2 === "fall" ? "#a87a30" : "#4e9a40"); ellipse(a, 7, 3, 3, 1, s2 === "fall" ? "#d0a040" : "#7ac050");
      var fc = ["#e86080", "#f0c020", "#f4f0e0", "#a070e0"];
      for (i = 0; i < 5; i++) px(a, 3 + i * 2 + (i & 1), 2 + (i % 3), fc[i % fc.length]);
    } else rect(a, 2, 5, 12, 1, "#f0f6fa");
    outline(a);
    return finish(a, 8, 12);
  }

  /* ---------- Crops ---------- */
  var VEG = {
    carrot:   { body: "#f08a28", light: "#ffb860", dark: "#b85a14", leaf: "#58c040" },
    cucumber: { body: "#4aa040", light: "#8ad070", dark: "#2a6a24", leaf: "#3e9a34" },
    tomato:   { body: "#e83a30", light: "#ff8a70", dark: "#a01e18", leaf: "#3e9a34" },
    corn:     { body: "#f4d040", light: "#fff090", dark: "#c09a20", leaf: "#6ab048" },
    cabbage:  { body: "#9ad860", light: "#d0f0a0", dark: "#5a9a38", leaf: "#6ab048" },
    potato:   { body: "#c8a060", light: "#e8c890", dark: "#8a6a38", leaf: "#4e9a3c" }
  };
  function vegShape(a, id, ox, oy) {
    var v = VEG[id] || VEG.carrot;
    if (id === "carrot") {
      var y; for (y = 0; y < 8; y++) rect(a, ox + 2 + (y >> 2), oy + 3 + y, Math.max(1, 5 - (y >> 1)), 1, v.body);
      px(a, ox + 3, oy + 4, v.light); px(a, ox + 3, oy + 6, v.light); px(a, ox + 5, oy + 7, v.dark);
      rect(a, ox + 3, oy, 1, 3, v.leaf); px(a, ox + 2, oy + 1, v.leaf); px(a, ox + 5, oy + 1, v.leaf); px(a, ox + 4, oy, v.leaf);
    } else if (id === "cucumber") {
      rect(a, ox + 1, oy + 3, 8, 4, v.body); rect(a, ox + 2, oy + 2, 6, 6, v.body);
      rect(a, ox + 2, oy + 3, 5, 1, v.light); px(a, ox + 4, oy + 5, v.dark); px(a, ox + 7, oy + 6, v.dark); px(a, ox + 3, oy + 6, v.dark);
      px(a, ox + 9, oy + 4, "#8a6a28");
    } else if (id === "tomato") {
      ellipse(a, ox + 4, oy + 5, 3, 3, v.body); px(a, ox + 3, oy + 4, v.light); px(a, ox + 2, oy + 5, v.light);
      rect(a, ox + 3, oy + 1, 3, 1, v.leaf); px(a, ox + 4, oy, v.leaf);
    } else if (id === "corn") {
      rect(a, ox + 3, oy + 1, 4, 8, v.body); var r; for (r = 1; r < 9; r += 2) rect(a, ox + 3, oy + r, 4, 1, v.light);
      line(a, ox + 2, oy + 9, ox + 1, oy + 3, v.leaf); line(a, ox + 7, oy + 9, ox + 8, oy + 3, v.leaf);
    } else if (id === "cabbage") {
      ellipse(a, ox + 4, oy + 5, 4, 3, v.dark); ellipse(a, ox + 4, oy + 5, 3, 2, v.body); px(a, ox + 3, oy + 4, v.light); px(a, ox + 4, oy + 5, v.light);
    } else {
      ellipse(a, ox + 4, oy + 5, 4, 3, v.body); px(a, ox + 2, oy + 4, v.light); px(a, ox + 5, oy + 6, v.dark); px(a, ox + 3, oy + 7, v.dark); px(a, ox + 6, oy + 4, v.dark);
    }
  }
  function vegIcon(id) {
    var a = mk(12, 12);
    vegShape(a, id, 1, 1);
    outline(a);
    return a.c;
  }
  function seedIcon(id) {
    var a = mk(12, 14);
    var v = VEG[id] || VEG.carrot;
    rect(a, 1, 1, 10, 12, "#e8d8b0"); rect(a, 1, 1, 10, 2, v.dark); rect(a, 1, 11, 10, 2, "#c8b088");
    rect(a, 3, 4, 6, 6, v.body); rect(a, 3, 4, 3, 2, v.light);
    px(a, 2, 1, v.light); px(a, 9, 12, "#a89060");
    outline(a);
    return a.c;
  }
  /* stage 0 sprout, 1 growing, 2 ripe */
  function cropCanvas(id, stage) {
    var a = mk(16, 16);
    var v = VEG[id] || VEG.carrot;
    var s = season();
    var leaf = v.leaf, leafD = mix(v.leaf, "#1a3a14", 0.35);
    if (stage === 0) {
      rect(a, 7, 9, 1, 4, leafD);
      rect(a, 5, 8, 2, 2, leaf); rect(a, 8, 7, 3, 2, leaf); px(a, 9, 7, mix(leaf, "#ffffff", 0.3));
    } else if (stage === 1) {
      if (id === "corn") { rect(a, 7, 3, 2, 11, leafD); line(a, 7, 9, 3, 5, leaf); line(a, 8, 7, 12, 3, leaf); line(a, 7, 12, 4, 10, leaf); }
      else if (id === "cucumber" || id === "tomato") { rect(a, 7, 4, 1, 10, "#8a6a38"); ellipse(a, 5, 8, 2, 2, leaf); ellipse(a, 10, 6, 2, 2, leaf); ellipse(a, 9, 11, 2, 2, leafD); }
      else if (id === "cabbage") { ellipse(a, 8, 10, 5, 3, leafD); ellipse(a, 8, 9, 3, 2, leaf); }
      else { line(a, 8, 13, 5, 6, leaf); line(a, 8, 13, 8, 4, leaf); line(a, 8, 13, 11, 6, leaf); px(a, 8, 4, mix(leaf, "#ffffff", 0.3)); }
    } else {
      if (id === "corn") {
        rect(a, 7, 1, 2, 13, leafD); line(a, 7, 9, 2, 5, leaf); line(a, 8, 7, 13, 3, leaf);
        rect(a, 9, 4, 3, 6, v.body); rect(a, 9, 4, 3, 1, v.light); rect(a, 9, 7, 3, 1, v.light); px(a, 10, 3, "#c8a040");
      } else if (id === "carrot") {
        line(a, 8, 10, 4, 3, leaf); line(a, 8, 10, 8, 1, leaf); line(a, 8, 10, 12, 3, leaf);
        rect(a, 6, 10, 5, 3, v.body); rect(a, 6, 10, 5, 1, v.light);
      } else if (id === "potato") {
        line(a, 8, 9, 4, 3, leaf); line(a, 8, 9, 12, 3, leaf); ellipse(a, 8, 5, 3, 2, leaf); px(a, 8, 3, "#f0f0ff");
        ellipse(a, 5, 12, 2, 1, v.body); ellipse(a, 11, 12, 2, 1, v.body);
      } else if (id === "cabbage") {
        ellipse(a, 8, 10, 6, 4, leafD); ellipse(a, 8, 9, 4, 3, v.body); px(a, 7, 8, v.light); px(a, 8, 9, v.light);
      } else {
        rect(a, 7, 2, 1, 12, "#8a6a38"); ellipse(a, 4, 6, 2, 2, leaf); ellipse(a, 11, 5, 2, 2, leaf); ellipse(a, 10, 11, 2, 2, leafD);
        if (id === "tomato") { ellipse(a, 5, 10, 2, 2, v.body); ellipse(a, 11, 8, 2, 2, v.body); px(a, 4, 9, v.light); px(a, 10, 7, v.light); }
        else { rect(a, 3, 9, 2, 4, v.body); rect(a, 10, 7, 2, 5, v.body); px(a, 3, 9, v.light); px(a, 10, 7, v.light); }
      }
    }
    if (s === "winter" && stage < 2) { px(a, 7, 6, "#f4f8fc"); }
    outline(a);
    return a.c;
  }

  /* ---------- caches ---------- */
  var cache = {};
  var cacheSeason = null;
  function cached(key, fn) {
    var s = season();
    if (cacheSeason !== s) { cache = {}; cacheSeason = s; }
    if (!cache[key]) cache[key] = fn();
    return cache[key];
  }
  var iconCache = {};
  function itemIcon(kind) {
    if (iconCache[kind]) return iconCache[kind];
    var c = null;
    if (kind && kind.indexOf("seed_") === 0 && VEG[kind.slice(5)]) c = seedIcon(kind.slice(5));
    else if (VEG[kind]) c = vegIcon(kind);
    if (c) iconCache[kind] = c;
    return c;
  }

  /* Draw an art canvas at a world point with nearest-neighbour scaling. */
  function blit(ctx, art, wx, wy, extraX, extraY) {
    if (!art || !art.canvas) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(art.canvas, Math.round(wx - art.ax * P + (extraX || 0)), Math.round(wy - art.ay * P + (extraY || 0)), art.w, art.h);
    ctx.restore();
  }
  function blitCanvas(ctx, canvas, wx, wy, scale) {
    if (!canvas) return;
    var sc = scale || P;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvas, Math.round(wx - canvas.width * sc / 2), Math.round(wy - canvas.height * sc), canvas.width * sc, canvas.height * sc);
    ctx.restore();
  }

  D.farmArt = {
    P: P,
    VEG: VEG,
    paintGround: paintGround,
    paintFence: paintFence,
    props: {
      bagFrame: function () { return cached("bagFrame", bagFrame); },
      bagBody: function () { return cached("bagBody", bagBody); },
      board: function () { return cached("board", board); },
      playMat: function () { return cached("playMat", playMat); },
      cottage: function () { return cached("cottage", cottage); },
      scarecrow: function () { return cached("scarecrow", scarecrow); },
      gardenSign: function () { return cached("gardenSign", gardenSign); },
      well: function () { return cached("well", well); },
      hay: function () { return cached("hay", hay); },
      trough: function () { return cached("trough", trough); },
      tree: function (v) { return cached("tree" + (v ? 1 : 0), function () { return tree(v); }); },
      flowerPot: function () { return cached("flowerPot", flowerPot); },
      lamp: function () { return cached("lamp", lamp); },
      bench: function () { return cached("bench", bench); },
      crates: function () { return cached("crates", crates); },
      barrel: function () { return cached("barrel", barrel); },
      planter: function () { return cached("planter", planter); }
    },
    crop: function (id, stage) { return cached("crop:" + id + ":" + stage, function () { return cropCanvas(id, stage); }); },
    itemIcon: itemIcon,
    blit: blit,
    blitCanvas: blitCanvas,
    season: season
  };
})(typeof window !== "undefined" ? window : globalThis);
