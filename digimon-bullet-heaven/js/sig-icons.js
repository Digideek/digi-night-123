/* Digi Night — detailed move emblems for the level-up cards and the skill tree (17z33).
 *
 * The old ones were 18 x 18 pixel grids blown up, one per kind of move in the line's colours, so
 * they looked blocky and many were the same. These are painted at 128 x 128 from each move's own
 * recipe (sig-fx.js: motif, colours, form, trail, how many times it grew), so no two are alike:
 *   - a badge: dark enamel in the move's colours, a bevelled rim, a soft light from the top left
 *   - behind the emblem, what the move does: speed lines (a shot), rays (a burst), a beam band,
 *     streaks coming down on a target (a strike), cracks and light coming up (from below), a glowing
 *     ring on the ground (a trap), a sweeping arc (a boomerang), a zig-zag of sparks (a chain)
 *   - the emblem itself: the move's motif (a flame, a petal, a skull, a gem...) shaded smoothly from
 *     its depth, lit from the top left, with a dark outline and a highlight; one, three in a fan, or
 *     three falling, by how the move plays out
 *   - its trail as small accents (embers, bubbles, notes, leaves, sparkles...)
 *   - gold pips for each time it grew
 * Other moves (not signatures) get the same treatment from their attack look. Stat upgrades keep
 * their pictures. move-icons.js asks here first.
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});
  if (typeof document === "undefined") return;
  var SZ = 128, cache = {}, TAU = Math.PI * 2;

  function hex(h) { h = String(h || "#888").replace("#", ""); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; var n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function css(c, al) { return "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + (al == null ? 1 : al) + ")"; }
  function hsh(s) { var h = 2166136261, i; for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* what a move's emblem is made from */
  function specOf(id) {
    var SF = D.sigFx, r = SF && SF.rec ? SF.rec(id) : null, W = D.WEAPONS && D.WEAPONS[id], st, L, kind;
    if (D.attackFx && D.attackFx.styleOf && W) st = D.attackFx.styleOf(id, W.color);   /* also builds the shape list */
    if (r) return { id: id, kind: r.kind, form: r.form, motif: r.motif, pal: r.pal, glow: r.glow, trail: r.trail, grand: r.grand || 0, upright: r.upright, fam: r.fam, sig: 1, line: r.line, tier: r.tier || 0 };
    if (!W || !st) return null;
    L = st.look;
    kind = W.type === "arc" ? "claw" : (W.type === "strike" ? "strikeFall" : W.type);
    return { id: id, kind: kind, form: W.fan ? "fan" : "", motif: L.shape, pal: L.pal.slice(), glow: L.glow, trail: "", grand: Math.max(0, (st.tier || 1) - 2), upright: false, dark: L.shape === "orb", fam: st.fam };
  }
  function shapeFn(name) {
    var K = D.attackFx && D.attackFx._k, NS = D.sigFx && D.sigFx.NEW_SHAPES;
    return (K && K.SHAPES[name]) || (NS && NS[name]) || (K && K.SHAPES.orb) || function (u, v) { return 1 - Math.sqrt(u * u + v * v); };
  }

  /* ---------- the emblem: a motif painted smoothly from its depth ---------- */
  var mcache = {};
  function motifImage(sp, size, aspect) {
    var key = sp.id + "|" + size, c, g, img, d, x, y, u, v, dep, fn, W = size, H = Math.max(8, Math.round(size * aspect)), P, dk, i, gx, gy, nl, col, t, k, out, OUT = 3;
    if (mcache[key]) return mcache[key];
    fn = shapeFn(sp.motif);
    P = (sp.dark ? sp.pal.slice().reverse() : sp.pal).map(hex);
    dep = new Float32Array((W + 2 * OUT) * (H + 2 * OUT));
    var CW = W + 2 * OUT, CH = H + 2 * OUT;
    for (y = 0; y < CH; y++) for (x = 0; x < CW; x++) {
      u = ((x - OUT + 0.5) / W) * 2 - 1; v = ((y - OUT + 0.5) / H) * 2 - 1;
      dep[y * CW + x] = (u < -1 || u > 1 || v < -1 || v > 1) ? 0 : Math.max(0, fn(u, v, 0));
    }
    c = document.createElement("canvas"); c.width = CW; c.height = CH; g = c.getContext("2d");
    img = g.createImageData(CW, CH); d = img.data;
    dk = mix(P[0], [8, 6, 16], 0.55);
    for (y = 0; y < CH; y++) for (x = 0; x < CW; x++) {
      i = y * CW + x; k = dep[i];
      if (k > 0) {
        /* depth runs the colour ramp outline > body > light > core, smoothly */
        t = Math.min(1, k) * 3; col = t < 1 ? mix(P[0], P[1], t) : (t < 2 ? mix(P[1], P[2], t - 1) : mix(P[2], P[3], t - 2));
        /* light from the top left, from how the depth slopes */
        gx = (x + 1 < CW ? dep[i + 1] : 0) - (x > 0 ? dep[i - 1] : 0); gy = (y + 1 < CH ? dep[i + CW] : 0) - (y > 0 ? dep[i - CW] : 0);
        nl = Math.max(-1, Math.min(1, (-gx * 0.7 - gy * 0.7) * W * 0.06));
        col = nl > 0 ? mix(col, [255, 252, 240], nl * 0.35) : mix(col, dk, -nl * 0.45);
        d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
      } else {
        /* a dark outline two pixels round the shape */
        out = 0;
        for (gy = -2; gy <= 2 && !out; gy++) for (gx = -2; gx <= 2 && !out; gx++) {
          if (gx * gx + gy * gy > 5) continue;
          if (x + gx >= 0 && x + gx < CW && y + gy >= 0 && y + gy < CH && dep[(y + gy) * CW + x + gx] > 0) out = 1;
        }
        if (out) { d[i * 4] = dk[0]; d[i * 4 + 1] = dk[1]; d[i * 4 + 2] = dk[2]; d[i * 4 + 3] = 255; }
      }
    }
    g.putImageData(img, 0, 0);
    mcache[key] = c;
    return c;
  }
  var ASPECT = { flame: 0.62, shard: 0.5, drop: 0.7, bolt: 0.42, leaf: 0.55, blob: 0.9, petal: 0.7, feather: 0.4, needle: 0.26, seed: 0.6, cloud: 0.8, spark: 0.55, arrow: 0.45, egg: 0.8,
    wisp: 0.6, fang: 0.55, sword: 0.38, gem: 0.75, fish: 0.6, bolt2: 0.5, eye: 0.6, missile: 0.5, rock: 0.9 };
  /* motifs drawn pointing the way they fly: up and to the right on a badge */
  var POINTED = { flame: 1, shard: 1, drop: 1, bolt: 1, leaf: 1, petal: 1, feather: 1, needle: 1, seed: 1, spark: 1, arrow: 1, wisp: 1, fang: 1, sword: 1, fish: 1, bolt2: 1, missile: 1, comet: 1 };
  /* the motif with dark cracks running across it (only on the motif itself), lit along one edge */
  function cracked(m, id) {
    var c = document.createElement("canvas"), g = c.getContext("2d"), w = m.width, h = m.height, R2 = rng(hsh(id + "crack")), k, i, px, py, br = [];
    c.width = w; c.height = h; g.drawImage(m, 0, 0);
    g.globalCompositeOperation = "source-atop"; g.lineCap = "round"; g.lineJoin = "round";
    px = w * 0.18; py = h * 0.12; br.push([px, py]);
    for (i = 0; i < 6; i++) { px += w * (0.08 + R2() * 0.08); py += h * (0.08 + R2() * 0.1); br.push([px + (R2() - 0.5) * w * 0.1, py]); }
    for (k = 0; k < 2; k++) {
      g.strokeStyle = k ? "rgba(255,244,214,0.6)" : "rgba(14,8,4,0.9)"; g.lineWidth = k ? 1.2 : Math.max(2, w * 0.045);
      g.beginPath(); br.forEach(function (p, n) { g[n ? "lineTo" : "moveTo"](p[0] + k, p[1] + k); });
      g.moveTo(br[3][0] + k, br[3][1] + k); g.lineTo(br[3][0] - w * 0.22 + k, br[3][1] + h * 0.18 + k);
      g.moveTo(br[2][0] + k, br[2][1] + k); g.lineTo(br[2][0] + w * 0.2 + k, br[2][1] - h * 0.06 + k);
      g.stroke();
    }
    return c;
  }
  function stampMotif(g, sp, x, y, size, rot, alpha, glowA, main) {
    var a = ASPECT[sp.motif] || 1, tr = main ? sp.treat : "plain", m, w, h, i, k, R2;
    if (tr === "twin") { stampMotif(g, sp, x + size * 0.28, y - size * 0.22, size * 0.6, rot, 0.85, glowA, 0); x -= size * 0.12; y += size * 0.1; size *= 0.92; }
    m = motifImage(sp, Math.round(size), a); w = m.width; h = m.height;
    if (tr === "cracked") m = cracked(m, sp.id);
    if (tr === "ringed") {
      g.save(); g.translate(x, y); g.strokeStyle = sp.pal[3]; g.globalAlpha = 0.85; g.lineWidth = 3; g.shadowColor = sp.glow; g.shadowBlur = 8;
      g.beginPath(); g.ellipse(0, 0, size * 0.62, size * 0.24, -0.5, 0, TAU); g.stroke();
      g.fillStyle = sp.pal[3]; for (i = 0; i < 3; i++) { k = -0.5 + i * 2.1; g.beginPath(); g.arc(Math.cos(k) * size * 0.62 * Math.cos(-0.5) - Math.sin(k) * size * 0.24 * Math.sin(-0.5), Math.cos(k) * size * 0.62 * Math.sin(-0.5) + Math.sin(k) * size * 0.24 * Math.cos(-0.5), 3.2, 0, TAU); g.fill(); }
      g.restore();
    }
    g.save(); g.translate(x, y); g.rotate(rot || 0); g.globalAlpha = alpha == null ? 1 : alpha;
    if (glowA) { g.shadowColor = sp.glow; g.shadowBlur = size * 0.28 * glowA * (tr === "glow" ? 2.6 : 1); }
    if (tr === "split") {
      /* in two halves, pulled apart along a bright cut */
      g.save(); g.beginPath(); g.rect(-w, -h, w, h * 2); g.clip(); g.drawImage(m, -w / 2 - 5, -h / 2 + 3); g.restore();
      g.save(); g.beginPath(); g.rect(0, -h, w, h * 2); g.clip(); g.drawImage(m, -w / 2 + 5, -h / 2 - 3); g.restore();
      g.shadowBlur = 0; g.strokeStyle = "#ffffff"; g.globalAlpha = 0.8; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -h / 2 - 6); g.lineTo(0, h / 2 + 6); g.stroke();
    } else g.drawImage(m, -w / 2, -h / 2);
    if (tr === "glow") { g.shadowBlur = 0; g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.45; g.drawImage(m, -w / 2, -h / 2); g.globalCompositeOperation = "source-over"; }
    g.restore();
  }

  /* ---------- the badge ---------- */
  /* Moves of the same element and motif would look alike apart from their backdrop, so each one in
   * such a group gets its own badge shape, a stronger tint, and its own treatment of the motif
   * (17z33): the first is a plain rounded square, the next a circle, a shield, a diamond, a hexagon,
   * an octagon; its motif glows, cracks, splits in two, wears a ring, or comes as a pair. */
  var SHAPES_B = ["square", "circle", "shield", "diamond", "hex", "oct"], TREAT = ["plain", "glow", "cracked", "split", "ringed", "twin"];
  var shape = "square";
  function outline(g, inset) {
    var c = SZ / 2, r = c - inset, i, a, n;
    if (shape === "circle") { g.beginPath(); g.arc(c, c, r, 0, TAU); g.closePath(); return; }
    if (shape === "shield") { g.beginPath(); g.moveTo(inset + 8, inset); g.lineTo(SZ - inset - 8, inset); g.quadraticCurveTo(SZ - inset, inset, SZ - inset, inset + 8); g.lineTo(SZ - inset, c + 6); g.quadraticCurveTo(SZ - inset - 6, SZ - inset - 18, c, SZ - inset); g.quadraticCurveTo(inset + 6, SZ - inset - 18, inset, c + 6); g.lineTo(inset, inset + 8); g.quadraticCurveTo(inset, inset, inset + 8, inset); g.closePath(); return; }
    if (shape === "diamond") { r *= 1.08; g.beginPath(); g.moveTo(c, c - r); g.quadraticCurveTo(c + 4, c - r + 4, c + r, c); g.quadraticCurveTo(c + r - 4, c + 4, c, c + r); g.quadraticCurveTo(c - 4, c + r - 4, c - r, c); g.quadraticCurveTo(c - r + 4, c - 4, c, c - r); g.closePath(); return; }
    if (shape === "hex" || shape === "oct") { n = shape === "hex" ? 6 : 8; r /= Math.cos(Math.PI / n) * (shape === "hex" ? 1.02 : 1); g.beginPath(); for (i = 0; i < n; i++) { a = (TAU * i) / n + (shape === "hex" ? 0 : Math.PI / 8); g[i ? "lineTo" : "moveTo"](c + Math.cos(a) * r, c + Math.sin(a) * r); } g.closePath(); return; }
    rrect(g, inset, inset, SZ - inset * 2, SZ - inset * 2, Math.max(6, 29 - inset));
  }
  function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); }
  function badge(g, sp) {
    var P = sp.pal.map(hex), base = mix(sp.dark ? P[3] : P[0], [10, 12, 26], 0.62), gl = hex(sp.glow), gr;
    outline(g, 5);
    gr = g.createLinearGradient(0, 5, 0, SZ - 5); gr.addColorStop(0, css(mix(base, gl, 0.22))); gr.addColorStop(1, css(mix(base, [0, 0, 0], 0.35))); g.fillStyle = gr; g.fill();
    g.save(); g.clip();
    gr = g.createRadialGradient(SZ * 0.36, SZ * 0.3, 4, SZ * 0.42, SZ * 0.4, SZ * 0.75); gr.addColorStop(0, css(gl, 0.42)); gr.addColorStop(0.55, css(gl, 0.1)); gr.addColorStop(1, css(gl, 0)); g.fillStyle = gr; g.fillRect(0, 0, SZ, SZ);
    g.restore();
    /* rim: light on the top left, shadow on the bottom right */
    gr = g.createLinearGradient(5, 5, SZ - 5, SZ - 5); gr.addColorStop(0, css(mix(P[2], [255, 255, 255], 0.35))); gr.addColorStop(0.5, css(P[1])); gr.addColorStop(1, css(mix(P[0], [0, 0, 0], 0.45)));
    outline(g, 5); g.lineWidth = 5; g.strokeStyle = gr; g.stroke();
    outline(g, 10); g.lineWidth = 1.5; g.strokeStyle = "rgba(255,255,255,0.16)"; g.stroke();
  }
  /* behind the emblem: what the move does */
  function backdrop0(g, sp, R) {
    var gl = hex(sp.glow), P = sp.pal.map(hex), i, a, x, y, k = sp.kind;
    g.save(); outline(g, 9); g.clip();
    g.lineCap = "round";
    if (k === "projectile") {
      for (i = 0; i < 5; i++) { y = 34 + i * 15; g.strokeStyle = css(gl, 0.18 + (i % 2) * 0.12); g.lineWidth = 3 - (i % 2); g.beginPath(); g.moveTo(14, y + 18); g.lineTo(54 + R() * 18, y - 6); g.stroke(); }
    } else if (k === "burst") {
      for (i = 0; i < 16; i++) { a = (TAU * i) / 16 + 0.1; g.strokeStyle = css(i % 2 ? gl : P[2], 0.32); g.lineWidth = i % 2 ? 2 : 4; g.beginPath(); g.moveTo(64 + Math.cos(a) * 24, 64 + Math.sin(a) * 24); g.lineTo(64 + Math.cos(a) * 70, 64 + Math.sin(a) * 70); g.stroke(); }
      g.strokeStyle = css(P[2], 0.35); g.lineWidth = 3; g.beginPath(); g.arc(64, 64, 44, 0, TAU); g.stroke();
    } else if (k === "beam") {
      var gr = g.createLinearGradient(12, 116, 116, 12); gr.addColorStop(0, css(gl, 0)); gr.addColorStop(0.4, css(gl, 0.4)); gr.addColorStop(1, css(P[3], 0.6));
      g.strokeStyle = gr; g.lineWidth = 26; g.beginPath(); g.moveTo(8, 120); g.lineTo(120, 8); g.stroke();
      g.strokeStyle = css(P[3], 0.55); g.lineWidth = 6; g.beginPath(); g.moveTo(8, 120); g.lineTo(120, 8); g.stroke();
    } else if (k === "strikeFall") {
      for (i = 0; i < 4; i++) { x = 30 + i * 22; g.strokeStyle = css(gl, 0.28); g.lineWidth = 3; g.beginPath(); g.moveTo(x + 10, 12); g.lineTo(x, 48 + (i % 2) * 10); g.stroke(); }
      g.strokeStyle = css(P[2], 0.5); g.lineWidth = 3; g.beginPath(); g.ellipse(64, 104, 34, 9, 0, 0, TAU); g.stroke();
      g.beginPath(); g.moveTo(26, 104); g.lineTo(102, 104); g.moveTo(64, 94); g.lineTo(64, 114); g.lineWidth = 1.5; g.stroke();
    } else if (k === "strikeRise") {
      g.fillStyle = css(mix(P[0], [0, 0, 0], 0.4), 0.7); g.fillRect(9, 100, SZ - 18, 30);
      for (i = 0; i < 6; i++) { x = 22 + i * 17; g.strokeStyle = css(gl, 0.3); g.lineWidth = 2.5; g.beginPath(); g.moveTo(x, 104); g.lineTo(x + (R() - 0.5) * 12, 26 + R() * 20); g.stroke(); }
      g.strokeStyle = css(P[3], 0.7); g.lineWidth = 2; g.beginPath(); g.moveTo(20, 104); g.lineTo(42, 99); g.lineTo(58, 106); g.lineTo(80, 98); g.lineTo(108, 104); g.stroke();
    } else if (k === "mine") {
      for (i = 0; i < 3; i++) { g.strokeStyle = css(i ? gl : P[3], 0.25 + i * 0.12); g.lineWidth = 3; g.beginPath(); g.ellipse(64, 96, 46 - i * 10, 14 - i * 3, 0, 0, TAU); g.stroke(); }
      g.setLineDash([5, 6]); g.strokeStyle = css(P[2], 0.45); g.lineWidth = 2; g.beginPath(); g.arc(64, 64, 50, 0, TAU); g.stroke(); g.setLineDash([]);
    } else if (k === "boomerang") {
      for (i = 0; i < 3; i++) { g.strokeStyle = css(i === 1 ? P[3] : gl, 0.22 + i * 0.12); g.lineWidth = 6 - i * 1.6; g.beginPath(); g.arc(64, 64, 44 - i * 2, Math.PI * 0.75 + i * 0.12, Math.PI * 2.1 - i * 0.1); g.stroke(); }
    } else if (k === "chain") {
      var pts = [[16, 98], [40, 74], [56, 88], [80, 52], [96, 64], [114, 26]];
      g.strokeStyle = css(gl, 0.45); g.lineWidth = 5; g.beginPath(); pts.forEach(function (p, j) { g[j ? "lineTo" : "moveTo"](p[0], p[1]); }); g.stroke();
      g.strokeStyle = css(P[3], 0.65); g.lineWidth = 1.8; g.stroke();
      pts.forEach(function (p) { g.fillStyle = css(P[3], 0.6); g.beginPath(); g.arc(p[0], p[1], 3.5, 0, TAU); g.fill(); });
    } else {
      for (i = 0; i < 3; i++) { g.strokeStyle = css(gl, 0.3); g.lineWidth = 5; g.beginPath(); g.arc(64 + 26, 64 - 26, 50 + i * 9, Math.PI * 0.6, Math.PI * 1.05); g.stroke(); }
    }
    g.restore();
  }
  /* the move's form, drawn behind the emblem: two moves of a kind never share one in a line, so this
   * is what tells them apart at a glance */
  function formArt(g, sp, R) {
    var gl = hex(sp.glow), P = sp.pal.map(hex), f = sp.form, i, j, a, x, y, r, k;
    function S(c, al, w) { g.strokeStyle = css(c, al); g.lineWidth = w; }
    function F(c, al) { g.fillStyle = css(c, al); }
    function path(pts) { g.beginPath(); pts.forEach(function (p, n) { g[n ? "lineTo" : "moveTo"](p[0], p[1]); }); }
    g.save(); outline(g, 9); g.clip(); g.lineCap = "round"; g.lineJoin = "round";
    switch (f) {
      /* shots: the path they fly */
      case "straight": for (i = 0; i < 3; i++) { S(gl, 0.35, 3); path([[16, 100 - i * 10], [64, 52 - i * 10]]); g.stroke(); } break;
      case "wave": S(gl, 0.45, 4); g.beginPath(); for (x = 12; x <= 116; x += 4) g[x === 12 ? "moveTo" : "lineTo"](x, 104 - x * 0.62 + Math.sin(x * 0.12) * 9); g.stroke(); break;
      case "spiral": S(gl, 0.45, 3); g.beginPath(); for (i = 0; i <= 60; i++) { a = i * 0.42; r = 4 + i * 0.75; g[i ? "lineTo" : "moveTo"](36 + i * 0.6 + Math.cos(a) * r * 0.4, 96 - i * 0.6 + Math.sin(a) * r * 0.4); } g.stroke(); break;
      case "zigzag": S(gl, 0.5, 4); path([[14, 108], [34, 82], [44, 98], [64, 70], [74, 86], [96, 56]]); g.stroke(); break;
      case "tumble": for (i = 0; i < 3; i++) { S(gl, 0.4, 3); g.beginPath(); g.arc(40 + i * 14, 88 - i * 14, 9, i, i + 4); g.stroke(); } break;
      case "pulse": for (i = 0; i < 3; i++) { S(gl, 0.45 - i * 0.12, 3); g.beginPath(); g.arc(66, 56, 30 + i * 12, 0, TAU); g.stroke(); } break;
      case "flutter": S(gl, 0.45, 3); g.beginPath(); for (x = 10; x <= 70; x += 3) g[x === 10 ? "moveTo" : "lineTo"](x, 110 - x * 0.8 + Math.sin(x * 0.25) * 12); g.stroke(); break;
      case "hop": S(gl, 0.5, 3); g.beginPath(); for (i = 0; i < 3; i++) { g.moveTo(12 + i * 22, 108 - i * 14); g.quadraticCurveTo(23 + i * 22, 80 - i * 14, 34 + i * 22, 100 - i * 14); } g.stroke(); break;
      case "ghost": F(gl, 0.2); for (i = 1; i <= 2; i++) { g.beginPath(); g.arc(66 - i * 14, 56 + i * 14, 20, 0, TAU); g.fill(); } break;
      case "comet": var cg = g.createLinearGradient(10, 116, 66, 56); cg.addColorStop(0, css(gl, 0)); cg.addColorStop(1, css(P[3], 0.6)); g.strokeStyle = cg; g.lineWidth = 22; path([[10, 116], [66, 56]]); g.stroke(); break;
      /* bursts */
      case "blocks": for (i = 0; i < 14; i++) { a = (TAU * i) / 14; F(i % 2 ? P[2] : P[1], 0.75); g.fillRect(64 + Math.cos(a) * 48 - 4, 64 + Math.sin(a) * 48 - 4, 8, 8); } break;
      case "spikes": F(P[1], 0.6); g.beginPath(); for (i = 0; i < 10; i++) { a = (TAU * i) / 10; g.moveTo(64 + Math.cos(a - 0.14) * 26, 64 + Math.sin(a - 0.14) * 26); g.lineTo(64 + Math.cos(a) * 60, 64 + Math.sin(a) * 60); g.lineTo(64 + Math.cos(a + 0.14) * 26, 64 + Math.sin(a + 0.14) * 26); } g.fill(); break;
      case "bloom": for (i = 0; i < 8; i++) { a = (TAU * i) / 8; F(i % 2 ? P[2] : P[1], 0.55); g.save(); g.translate(64 + Math.cos(a) * 36, 64 + Math.sin(a) * 36); g.rotate(a); g.beginPath(); g.ellipse(0, 0, 16, 8, 0, 0, TAU); g.fill(); g.restore(); } break;
      case "quake": S([20, 14, 10], 0.8, 4); for (i = 0; i < 7; i++) { a = (TAU * i) / 7 + 0.3; x = 64; y = 70; g.beginPath(); g.moveTo(x, y); for (j = 1; j <= 4; j++) g.lineTo(64 + Math.cos(a + (R() - 0.5) * 0.6) * j * 15, 70 + Math.sin(a + (R() - 0.5) * 0.6) * j * 11); g.stroke(); } S(P[2], 0.6, 1.5); g.stroke(); break;
      case "vortex": for (j = 0; j < 3; j++) { S(P[1 + j], 0.55, 3); g.beginPath(); for (i = 0; i <= 30; i++) { a = (TAU * j) / 3 + i * 0.2; r = i * 1.9; g[i ? "lineTo" : "moveTo"](64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } g.stroke(); } break;
      case "nova": S(P[2], 0.6, 4); g.beginPath(); for (i = 0; i <= 10; i++) { a = -Math.PI / 2 + (Math.PI * i) / 5; r = i % 2 ? 28 : 58; g[i ? "lineTo" : "moveTo"](64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } g.stroke(); break;
      case "triple": for (i = 0; i < 3; i++) { S(P[1 + i], 0.55, 3); g.beginPath(); g.arc(64, 64, 26 + i * 14, 0, TAU); g.stroke(); } break;
      case "dome": F(P[1], 0.25); g.beginPath(); g.arc(64, 70, 48, Math.PI, 0); g.fill(); S(P[3], 0.6, 2.5); g.stroke(); F([255, 255, 255], 0.4); g.fillRect(34, 40, 10, 5); break;
      case "flurry": for (i = 0; i < 10; i++) { a = (TAU * i) / 10; S(gl, 0.4, 2.5); path([[64 + Math.cos(a) * 30, 64 + Math.sin(a) * 30], [64 + Math.cos(a + 0.4) * 56, 64 + Math.sin(a + 0.4) * 56]]); g.stroke(); } break;
      case "sonic": for (i = 0; i < 3; i++) for (j = 0; j < 4; j++) { a = (TAU * j) / 4 + Math.PI / 4; S(P[2], 0.55 - i * 0.12, 3); g.beginPath(); g.arc(64, 64, 26 + i * 13, a - 0.45, a + 0.45); g.stroke(); } break;
      case "shardring": for (i = 0; i < 10; i++) { a = (TAU * i) / 10; F(P[2], 0.7); g.save(); g.translate(64 + Math.cos(a) * 46, 64 + Math.sin(a) * 46); g.rotate(a); g.beginPath(); g.moveTo(-7, 0); g.lineTo(0, -3); g.lineTo(7, 0); g.lineTo(0, 3); g.fill(); g.restore(); } break;
      case "flamering": for (i = 0; i < 12; i++) { a = (TAU * i) / 12; x = 64 + Math.cos(a) * 46; y = 72 + Math.sin(a) * 30; F(P[1], 0.75); g.fillRect(x - 4, y - 16, 8, 16); F(P[2], 0.85); g.fillRect(x - 2, y - 11, 4, 11); } break;
      case "tide": S(P[1], 0.6, 6); g.beginPath(); for (i = 0; i <= 40; i++) { a = (TAU * i) / 40; r = 46 + Math.sin(a * 8) * 5; g[i ? "lineTo" : "moveTo"](64 + Math.cos(a) * r, 64 + Math.sin(a) * r * 0.85); } g.stroke(); S(P[3], 0.6, 2); g.stroke(); break;
      case "glyph": S(P[2], 0.6, 2.5); g.beginPath(); g.arc(64, 64, 50, 0, TAU); g.stroke(); g.beginPath(); g.arc(64, 64, 42, 0, TAU); g.stroke(); g.beginPath(); for (i = 0; i <= 5; i++) { a = -Math.PI / 2 + (TAU * i * 2) / 5; g[i ? "lineTo" : "moveTo"](64 + Math.cos(a) * 42, 64 + Math.sin(a) * 42); } g.stroke(); break;
      case "lightning": for (i = 0; i < 7; i++) { a = (TAU * i) / 7; S(i % 2 ? P[3] : P[2], 0.7, 2.5); g.beginPath(); g.moveTo(64, 64); for (j = 1; j <= 4; j++) g.lineTo(64 + Math.cos(a + (R() - 0.5) * 0.7) * j * 14, 64 + Math.sin(a + (R() - 0.5) * 0.7) * j * 14); g.stroke(); } break;
      case "whirl": for (i = 0; i < 2; i++) { S(gl, 0.5, 4); g.beginPath(); g.arc(64, 64, 44 - i * 10, i * 2, i * 2 + 3.6); g.stroke(); } break;
      /* beams */
      case "ray": case "nodes": case "jet": case "stream": case "dash": case "drill": case "helix": case "rings": case "rake": case "wedge": case "bolt": case "bite":
        g.translate(64, 64); g.rotate(-Math.PI / 4); g.translate(-64, -64);
        if (f === "ray" || f === "nodes") { F(P[1], 0.5); g.fillRect(4, 56, 120, 16); F(P[3], 0.7); g.fillRect(4, 62, 120, 4); if (f === "nodes") for (x = 14; x < 124; x += 18) { F(P[3], 0.9); g.fillRect(x - 3, 61, 6, 6); } }
        else if (f === "jet") { F(P[1], 0.45); g.beginPath(); g.moveTo(4, 62); g.lineTo(124, 36); g.lineTo(124, 92); g.lineTo(4, 66); g.fill(); F(P[2], 0.5); g.beginPath(); g.moveTo(4, 63); g.lineTo(124, 50); g.lineTo(124, 78); g.lineTo(4, 65); g.fill(); }
        else if (f === "stream") { for (i = 0; i < 9; i++) { F(P[2], 0.6); g.beginPath(); g.arc(10 + i * 14, 64 + Math.sin(i) * 5, 3 + (i % 3), 0, TAU); g.fill(); } }
        else if (f === "dash") { for (i = 0; i < 6; i++) { S(gl, 0.45, 2.5); path([[6, 46 + i * 7], [70 - (i % 2) * 14, 46 + i * 7]]); g.stroke(); } }
        else if (f === "drill") { for (j = 0; j < 2; j++) { S(P[1 + j * 2], 0.6, 3); g.beginPath(); for (x = 4; x <= 124; x += 3) g[x === 4 ? "lineTo" : "lineTo"](x, 64 + Math.sin(x * 0.3 + j * Math.PI) * (14 - x * 0.09)); g.stroke(); } }
        else if (f === "helix") { for (j = 0; j < 2; j++) { S(P[1 + j], 0.6, 3); g.beginPath(); for (x = 4; x <= 124; x += 3) g[x === 4 ? "moveTo" : "lineTo"](x, 64 + Math.sin(x * 0.1 + j * Math.PI) * 14); g.stroke(); } }
        else if (f === "rings") { F(P[1], 0.4); g.fillRect(4, 62, 120, 4); for (x = 20; x < 124; x += 20) { S(P[3], 0.7, 3); g.beginPath(); g.ellipse(x, 64, 4, 10 + x * 0.06, 0, 0, TAU); g.stroke(); } }
        else if (f === "rake") { for (j = -1; j <= 1; j++) { S([255, 255, 255], 0.75, 3); path([[6, 64 + j * 12], [122, 64 + j * 12]]); g.stroke(); } }
        else if (f === "wedge") { F(P[1], 0.45); g.beginPath(); g.moveTo(124, 64); g.lineTo(60, 40); g.lineTo(60, 88); g.fill(); for (i = 0; i < 4; i++) { S(gl, 0.4, 2); path([[8, 50 + i * 9], [50, 50 + i * 9]]); g.stroke(); } }
        else if (f === "bolt") { S(P[2], 0.75, 4); g.beginPath(); g.moveTo(4, 64); for (x = 16; x < 124; x += 14) g.lineTo(x, 64 + (R() - 0.5) * 26); g.lineTo(124, 64); g.stroke(); }
        else if (f === "bite") { F([255, 255, 255], 0.7); for (i = 0; i < 4; i++) { g.beginPath(); g.moveTo(60 + i * 14, 40); g.lineTo(67 + i * 14, 54); g.lineTo(74 + i * 14, 40); g.fill(); g.beginPath(); g.moveTo(60 + i * 14, 88); g.lineTo(67 + i * 14, 74); g.lineTo(74 + i * 14, 88); g.fill(); } }
        break;
      /* strikes from above */
      case "meteor": var mg = g.createLinearGradient(14, 14, 70, 70); mg.addColorStop(0, css(gl, 0)); mg.addColorStop(1, css(P[2], 0.6)); g.strokeStyle = mg; g.lineWidth = 20; path([[14, 14], [66, 62]]); g.stroke(); break;
      case "rain": for (i = 0; i < 7; i++) { x = 18 + i * 15; S(gl, 0.4, 2.5); path([[x + 6, 12 + (i % 2) * 10], [x, 40 + (i % 3) * 12]]); g.stroke(); } break;
      case "dive": S([255, 255, 255], 0.55, 4); path([[110, 12], [70, 60]]); g.stroke(); S(gl, 0.4, 10); g.stroke(); break;
      case "pillar": var pg = g.createLinearGradient(0, 10, 0, 110); pg.addColorStop(0, css(P[3], 0.05)); pg.addColorStop(1, css(P[3], 0.6)); F(P[3]); g.fillStyle = pg; g.fillRect(48, 10, 32, 100); break;
      case "stomp": F([0, 0, 0], 0.4); g.beginPath(); g.ellipse(64, 104, 40, 10, 0, 0, TAU); g.fill(); for (i = 0; i < 3; i++) { S(gl, 0.4, 3); path([[40 + i * 24, 14], [40 + i * 24, 30]]); g.stroke(); } break;
      case "drop": S(gl, 0.45, 3); path([[64, 10], [64, 34]]); g.stroke(); S(P[2], 0.5, 3); g.beginPath(); g.ellipse(64, 104, 30, 8, 0, 0, TAU); g.stroke(); break;
      case "bomb": S(P[3], 0.55, 2.5); g.beginPath(); g.arc(64, 64, 46, 0, TAU); g.stroke(); path([[10, 64], [118, 64]]); g.stroke(); path([[64, 10], [64, 118]]); g.stroke(); break;
      /* from below */
      case "geyser": F(P[1], 0.45); g.beginPath(); g.moveTo(44, 112); g.quadraticCurveTo(56, 40, 64, 14); g.quadraticCurveTo(72, 40, 84, 112); g.fill(); break;
      case "vines": for (i = 0; i < 3; i++) { S([60, 140, 50], 0.7, 4); g.beginPath(); g.moveTo(34 + i * 30, 114); for (y = 114; y > 20; y -= 6) g.lineTo(34 + i * 30 + Math.sin(y * 0.1 + i) * 8, y); g.stroke(); } break;
      case "crystal": for (i = 0; i < 4; i++) { F(P[2], 0.5); g.beginPath(); x = 28 + i * 24; g.moveTo(x - 8, 112); g.lineTo(x, 44 + (i % 2) * 20); g.lineTo(x + 8, 112); g.fill(); } break;
      case "erupt": for (i = 0; i < 8; i++) { F(P[i % 3 + 1], 0.75); g.beginPath(); g.arc(30 + R() * 68, 20 + R() * 60, 3 + R() * 4, 0, TAU); g.fill(); } F(P[1], 0.4); g.beginPath(); g.moveTo(34, 114); g.lineTo(64, 40); g.lineTo(94, 114); g.fill(); break;
      case "sword": F([220, 230, 245], 0.5); g.beginPath(); g.moveTo(58, 112); g.lineTo(64, 12); g.lineTo(70, 112); g.fill(); F(P[1], 0.6); g.fillRect(48, 96, 32, 6); break;
      /* traps on the ground */
      case "mark": S(P[2], 0.7, 3); path([[64, 74], [104, 104], [24, 104], [64, 74]]); g.stroke(); break;
      case "puddle": F(P[1], 0.55); g.beginPath(); g.ellipse(64, 100, 50, 15, 0, 0, TAU); g.fill(); F(P[2], 0.5); g.beginPath(); g.ellipse(58, 98, 26, 7, 0, 0, TAU); g.fill(); break;
      case "bubble": S(P[3], 0.6, 3); g.beginPath(); g.arc(64, 70, 46, 0, TAU); g.stroke(); F([255, 255, 255], 0.5); g.fillRect(36, 44, 10, 6); break;
      case "web": S([235, 235, 225], 0.5, 1.5); for (i = 0; i < 8; i++) { a = (TAU * i) / 8; path([[64, 64], [64 + Math.cos(a) * 60, 64 + Math.sin(a) * 60]]); g.stroke(); } for (r = 16; r <= 52; r += 12) { g.beginPath(); for (i = 0; i <= 8; i++) { a = (TAU * i) / 8; g[i ? "lineTo" : "moveTo"](64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } g.stroke(); } break;
      case "caltrops": for (i = 0; i < 6; i++) { x = 22 + i * 17; y = 100 + (i % 2) * 8; F(P[2], 0.8); g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 6, y + 4); g.lineTo(x - 6, y + 4); g.fill(); } break;
      case "bud": F([60, 140, 50], 0.7); g.fillRect(62, 84, 4, 30); F(P[1], 0.6); g.beginPath(); g.ellipse(64, 104, 40, 10, 0, 0, TAU); g.fill(); break;
      case "rune": S(P[2], 0.65, 2.5); g.beginPath(); g.ellipse(64, 98, 50, 16, 0, 0, TAU); g.stroke(); g.beginPath(); for (i = 0; i <= 5; i++) { a = -Math.PI / 2 + (TAU * i * 2) / 5; g[i ? "lineTo" : "moveTo"](64 + Math.cos(a) * 44, 98 + Math.sin(a) * 13); } g.stroke(); break;
      case "pit": F([8, 6, 4], 0.85); g.beginPath(); g.ellipse(64, 100, 42, 13, 0, 0, TAU); g.fill(); S(P[1], 0.7, 3); g.stroke(); break;
      case "coals": for (i = 0; i < 8; i++) { F(i % 2 ? P[1] : P[2], 0.9); g.fillRect(24 + i * 10, 98 + (i % 3) * 4, 9, 7); } break;
      case "paw": for (i = 0; i < 2; i++) { x = 40 + i * 48; y = 100 - i * 6; F(P[2], 0.6); g.beginPath(); g.ellipse(x, y, 9, 7, 0, 0, TAU); g.fill(); for (j = 0; j < 3; j++) { g.beginPath(); g.arc(x - 8 + j * 8, y - 11, 3.4, 0, TAU); g.fill(); } } break;
      case "bomb_": break;
      case "charm": F([244, 236, 212], 0.85); g.fillRect(88, 16, 24, 36); F(P[1], 0.9); g.fillRect(92, 22, 16, 3); g.fillRect(98, 26, 3, 20); break;
      case "eye": F(P[0], 0.7); g.beginPath(); g.ellipse(64, 102, 46, 13, 0, 0, TAU); g.fill(); F(P[2], 0.8); g.beginPath(); g.ellipse(64, 102, 12, 9, 0, 0, TAU); g.fill(); break;
      case "spores": for (i = 0; i < 9; i++) { F(P[R() < 0.5 ? 1 : 2], 0.35); g.beginPath(); g.arc(20 + R() * 88, 20 + R() * 88, 5 + R() * 9, 0, TAU); g.fill(); } break;
      case "snowdrift": F([235, 245, 255], 0.8); for (i = 0; i < 3; i++) { g.beginPath(); g.ellipse(36 + i * 28, 106 - (i === 1 ? 6 : 0), 22, 11, 0, 0, TAU); g.fill(); } break;
      /* boomerangs */
      case "spin": for (i = 0; i < 2; i++) { S(gl, 0.55, 4); g.beginPath(); g.arc(64, 64, 48, i * Math.PI, i * Math.PI + 1.6); g.stroke(); } break;
      case "ribbon": S(gl, 0.5, 8); g.beginPath(); g.moveTo(12, 108); g.quadraticCurveTo(20, 30, 70, 50); g.stroke(); break;
      case "twin": S(gl, 0.5, 3); g.beginPath(); g.arc(64, 64, 44, 0, TAU); g.stroke(); break;
      case "wheel": S(P[2], 0.6, 3); g.beginPath(); g.arc(64, 64, 50, 0, TAU); g.stroke(); for (i = 0; i < 6; i++) { a = (TAU * i) / 6; path([[64, 64], [64 + Math.cos(a) * 50, 64 + Math.sin(a) * 50]]); g.stroke(); } break;
      case "saw": F(P[1], 0.45); g.beginPath(); for (i = 0; i <= 28; i++) { a = (TAU * i) / 28; r = i % 2 ? 58 : 48; g[i ? "lineTo" : "moveTo"](64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } g.fill(); break;
      case "ring": S(P[3], 0.7, 5); g.beginPath(); g.ellipse(64, 64, 52, 22, -0.4, 0, TAU); g.stroke(); break;
      /* chains */
      case "zig": case "fork": S(P[2], 0.7, 3.5); path([[12, 110], [34, 78], [28, 64], [60, 50], [56, 34], [92, 20]]); g.stroke(); if (f === "fork") { path([[60, 50], [88, 60]]); g.stroke(); path([[34, 78], [56, 92]]); g.stroke(); } break;
      case "vine": S([60, 150, 60], 0.7, 4); g.beginPath(); for (x = 10; x <= 118; x += 3) g[x === 10 ? "moveTo" : "lineTo"](x, 116 - x * 0.85 + Math.sin(x * 0.12) * 12); g.stroke(); break;
      case "slash": for (i = 0; i < 3; i++) { S([255, 255, 255], 0.6, 3); x = 30 + i * 30; y = 90 - i * 26; path([[x - 10, y - 10], [x + 10, y + 10]]); g.stroke(); path([[x + 10, y - 10], [x - 10, y + 10]]); g.stroke(); } break;
      case "beads": for (i = 0; i < 8; i++) { F(P[2], 0.8); g.beginPath(); g.arc(16 + i * 14, 108 - i * 12, 4, 0, TAU); g.fill(); } break;
      case "ribbon_": break;
      case "links": for (i = 0; i < 6; i++) { S(P[2], 0.7, 3); g.beginPath(); g.ellipse(20 + i * 17, 104 - i * 15, 9, 5, -0.7 + (i % 2) * 1.57, 0, TAU); g.stroke(); } break;
      case "arc": S(P[2], 0.6, 3); g.beginPath(); g.moveTo(10, 110); g.quadraticCurveTo(36, 40, 62, 90); g.quadraticCurveTo(88, 30, 118, 70); g.stroke(); break;
      case "thread": S([240, 240, 230], 0.55, 1.2); for (i = 0; i < 3; i++) { path([[8, 112 - i * 6], [120, 16 + i * 8]]); g.stroke(); } break;
      case "notes": for (i = 0; i < 4; i++) { x = 22 + i * 26; y = 100 - i * 20; F(P[3], 0.8); g.beginPath(); g.ellipse(x, y, 5, 3.6, -0.4, 0, TAU); g.fill(); g.fillRect(x + 3.5, y - 14, 2, 14); } break;
      case "fish": for (i = 0; i < 4; i++) { x = 22 + i * 26; y = 100 - i * 22; F(P[2], 0.7); g.beginPath(); g.ellipse(x, y, 8, 4, -0.7, 0, TAU); g.fill(); g.beginPath(); g.moveTo(x - 6, y + 6); g.lineTo(x - 12, y + 6); g.lineTo(x - 7, y + 1); g.fill(); } break;
      default: backdrop0(g, sp, R);
    }
    g.restore();
  }
  /* the trail, as small accents round the emblem */
  function accents(g, sp, R) {
    var P = sp.pal.map(hex), gl = hex(sp.glow), n = 7, i, x, y, s, a, tr = sp.trail || "";
    g.save(); outline(g, 9); g.clip();
    for (i = 0; i < n; i++) {
      a = R() * TAU; s = 40 + R() * 16; x = 64 + Math.cos(a) * s; y = 64 + Math.sin(a) * s * 0.92; if (x < 16 || x > 112 || y < 16 || y > 112) continue;
      if (/bubbles|rings/.test(tr)) { g.strokeStyle = css(P[3], 0.75); g.lineWidth = 1.6; g.beginPath(); g.arc(x, y, 2.5 + R() * 3.5, 0, TAU); g.stroke(); }
      else if (/twinkles|glitter|snow/.test(tr)) { g.fillStyle = css(tr === "snow" ? [255, 255, 255] : P[3], 0.9); s = 2.5 + R() * 3; g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.3, y); g.lineTo(x, y + s); g.lineTo(x - s * 0.3, y); g.fill(); g.beginPath(); g.moveTo(x - s, y); g.lineTo(x, y + s * 0.3); g.lineTo(x + s, y); g.lineTo(x, y - s * 0.3); g.fill(); }
      else if (/embers|sparks|crackle|flare/.test(tr)) { g.fillStyle = css(R() < 0.5 ? P[2] : P[3], 0.95); g.fillRect(x, y, 2.5 + R() * 2, 2.5 + R() * 2); }
      else if (/notes/.test(tr)) { g.fillStyle = css(P[3], 0.85); g.beginPath(); g.ellipse(x, y, 3.2, 2.4, -0.4, 0, TAU); g.fill(); g.fillRect(x + 2, y - 9, 1.6, 9); }
      else if (/hearts/.test(tr)) { g.fillStyle = css([255, 140, 200], 0.9); g.beginPath(); g.arc(x - 1.6, y, 2, 0, TAU); g.arc(x + 1.6, y, 2, 0, TAU); g.fill(); g.beginPath(); g.moveTo(x - 3.5, y + 0.6); g.lineTo(x, y + 4.6); g.lineTo(x + 3.5, y + 0.6); g.fill(); }
      else if (/petals|leaves|feathers/.test(tr)) { g.fillStyle = css(P[2], 0.85); g.save(); g.translate(x, y); g.rotate(R() * TAU); g.beginPath(); g.ellipse(0, 0, 4.5, 2, 0, 0, TAU); g.fill(); g.restore(); }
      else if (/smoke|steam|dust|wisps/.test(tr)) { g.fillStyle = css(tr === "steam" ? [230, 236, 244] : mix(P[1], [120, 120, 130], 0.5), 0.35); g.beginPath(); g.arc(x, y, 4 + R() * 4, 0, TAU); g.fill(); }
      else if (/glyphs/.test(tr)) { g.fillStyle = css(P[3], 0.75); g.font = "bold 10px monospace"; g.fillText(["+", "*", "0", "1", "<", ">"][i % 6], x, y); }
      else { g.fillStyle = css(gl, 0.6); g.beginPath(); g.arc(x, y, 1.8, 0, TAU); g.fill(); }
    }
    g.restore();
  }
  function pips(g, n) {
    var i, x0;
    n = Math.min(5, n || 0); if (!n) return;
    x0 = SZ - 18 - (n - 1) * 11;
    for (i = 0; i < n; i++) {
      var x = x0 + i * 11, y = SZ - 18;
      g.fillStyle = "#3a2a00"; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 6, y); g.lineTo(x, y + 6); g.lineTo(x - 6, y); g.fill();
      g.fillStyle = "#ffd23a"; g.beginPath(); g.moveTo(x, y - 4.5); g.lineTo(x + 4.5, y); g.lineTo(x, y + 4.5); g.lineTo(x - 4.5, y); g.fill();
      g.fillStyle = "#fff6c0"; g.fillRect(x - 1.5, y - 2.5, 2, 2);
    }
  }

  /* which of its group (same element, same motif) a move is */
  var groups = null;
  function variantOf(sp) {
    if (!groups) {
      groups = {}; var all = Object.keys(D.WEAPONS || {}), i, o, k, m = {};
      for (i = 0; i < all.length; i++) { try { o = specOf(all[i]); } catch (e) { o = null; } if (!o) continue; k = (o.fam || "") + "|" + o.motif; (m[k] = m[k] || []).push(o); }
      for (k in m) {
        m[k].sort(function (a, b) { return (b.sig ? 1 : 0) - (a.sig ? 1 : 0) || ((a.line || "") < (b.line || "") ? -1 : (a.line || "") > (b.line || "") ? 1 : 0) || (a.tier || 0) - (b.tier || 0) || (a.id < b.id ? -1 : 1); });
        m[k].forEach(function (o, n) { groups[o.id] = n; });
      }
    }
    return groups[sp.id] || 0;
  }
  function hueShift(hexc, deg, lt) {
    var c = hex(hexc), r = c[0] / 255, g2 = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g2, b), mn = Math.min(r, g2, b), h = 0, sat = 0, l = (mx + mn) / 2, d = mx - mn, q, p;
    if (d) { sat = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g2 - b) / d + (g2 < b ? 6 : 0) : (mx === g2 ? (b - r) / d + 2 : (r - g2) / d + 4); h /= 6; }
    h = ((h + deg / 360) % 1 + 1) % 1; l = Math.max(0.03, Math.min(0.97, l + lt));
    function f(t) { t = (t % 1 + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : (t < 0.5 ? q : (t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p)); }
    if (!sat) { var v = Math.round(l * 255); return "#" + [v, v, v].map(function (x) { return (x < 16 ? "0" : "") + x.toString(16); }).join(""); }
    q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat; p = 2 * l - q;
    return "#" + [f(h + 1 / 3), f(h), f(h - 1 / 3)].map(function (x) { x = Math.round(x * 255); return (x < 16 ? "0" : "") + x.toString(16); }).join("");
  }
  /* a nudge round the colour wheel (never far enough to look like another element) and lighter or darker */
  var TINT = [[0, 0], [12, 0.1], [-12, -0.08], [0, 0.16], [16, -0.05], [-16, 0.07], [6, -0.14], [-6, 0.12]];
  function draw(id) {
    var sp = specOf(id), c, g, R, rot, f = "", up, v, tn;
    if (!sp) return null;
    v = variantOf(sp);
    shape = SHAPES_B[v % 6];
    sp.treat = TREAT[(v + Math.floor(v / 6)) % 6];
    if (v) { tn = TINT[v % TINT.length]; sp.pal = sp.pal.map(function (x) { return hueShift(x, tn[0], tn[1]); }); sp.glow = hueShift(sp.glow, tn[0], tn[1]); }
    c = document.createElement("canvas"); c.width = c.height = SZ; g = c.getContext("2d");
    R = rng(hsh(id));
    badge(g, sp);
    formArt(g, sp, R);
    accents(g, sp, R);
    f = sp.form; up = sp.upright || !POINTED[sp.motif];
    rot = up ? 0 : -Math.PI / 4;
    /* how many emblems, and where, by how the move plays out */
    if (sp.kind === "projectile" || f === "fan") {
      stampMotif(g, sp, 46, 82, 30, rot, 0.75, 0.6); stampMotif(g, sp, 82, 86, 30, rot, 0.75, 0.6); stampMotif(g, sp, 66, 56, 54, rot, 1, 1, 1);
    } else if (f === "rain" || f === "flurry" || f === "whirl") {
      stampMotif(g, sp, 40, 46, 30, up ? 0 : Math.PI / 2 * 0.7, 0.85, 0.6); stampMotif(g, sp, 88, 44, 30, up ? 0 : Math.PI / 2 * 0.7, 0.85, 0.6); stampMotif(g, sp, 64, 70, 50, up ? 0 : Math.PI / 2 * 0.7, 1, 1, 1);
    } else if (sp.kind === "strikeFall") {
      stampMotif(g, sp, 66, 60, 58, up ? 0 : Math.PI * 0.6, 1, 1, 1);
    } else if (sp.kind === "strikeRise") {
      stampMotif(g, sp, 64, 60, 60, up ? 0 : -Math.PI / 2, 1, 1, 1);
    } else if (sp.kind === "mine") {
      stampMotif(g, sp, 64, 66, 54, 0, 1, 1, 1);
    } else if (sp.kind === "boomerang") {
      stampMotif(g, sp, 64, 62, 60, -0.5, 1, 1, 1);
    } else if (sp.kind === "chain") {
      stampMotif(g, sp, 40, 80, 30, rot, 0.8, 0.5); stampMotif(g, sp, 82, 46, 56, rot, 1, 1, 1);
    } else if (sp.kind === "beam") {
      stampMotif(g, sp, 70, 58, 62, up ? 0 : -Math.PI / 4, 1, 1, 1);
    } else {
      stampMotif(g, sp, 64, 62, 64, rot, 1, 1, 1);
    }
    pips(g, sp.grand);
    return c;
  }
  function get(id) {
    if (cache[id] !== undefined) return cache[id];
    var c = null;
    try { c = draw(id); } catch (e) { c = null; }
    cache[id] = c;
    return c;
  }
  D.sigIcons = { get: get, SIZE: SZ, clear: function () { cache = {}; mcache = {}; } };
})(typeof window !== "undefined" ? window : this);
