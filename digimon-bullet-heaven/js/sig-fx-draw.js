/* Digi Night — drawing the signature moves from their recipes (sig-fx.js). 17z33 move revamp.
 *
 * attack-fx.js hands over every fx event and every flying shot that belongs to a signature move:
 *   cast    the wind-up at the partner (charge, ring, glyph, stomp, sparkle, roar, spin)
 *   hit     its own impact (splash, shatter, starburst, ripple, petals, fork, crater, confetti...)
 *   burst   16 forms (bloom, quake, vortex, nova, dome, sonic, tide, lightning, whirl...)
 *   beam    13 forms (ray, jet, dash, drill, helix, rings, wave, nodes, rake, wedge, bolt, stream, bite)
 *   drop / boom   strikes: meteor, rain, dive, pillar, stomp, bomb; from below: geyser, spikes,
 *           vines, crystal, erupt, sword, pillar
 *   chain   11 forms (zig, vine, slash, beads, ribbon, links, arc, fork, thread, notes, fish)
 *   shots   flying (10 motions), traps on the ground (16 forms), boomerangs (6 forms)
 * Upgraded moves (recipe.grand) are drawn bigger and with more layers.
 * Only canvas calls the WebGL renderer (gl/renderer.js) supports are used.
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});
  if (typeof document === "undefined") return;
  var SF = D.sigFx = D.sigFx || {};
  var TAU = Math.PI * 2, anims = [];
  function K() { return D.attackFx && D.attackFx._k; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  function low() { return !!D.reducedFx; }
  function G(r) { return 1 + 0.17 * Math.min(5, r.grand || 0); }
  function img(r, cells, k) { var k0 = K(); return k0.core("S_" + r.id, Math.max(4, Math.min(30, Math.round(cells))), k ? 1 : 0); }
  /* a small shape in the move's colours that is not its own motif (a petal for a petal trail...) */
  function mini(r, shape, cells) {
    var k0 = K(), key = "S_" + r.id + "~" + shape;
    if (!k0.LOOK[key]) k0.LOOK[key] = { shape: shape, aspect: 1, spin: 0, pal: r.pal, glow: r.glow, bits: r.bits, fx: r.fam };
    return k0.core(key, cells || 6, 0);
  }
  function add(t, x, y, vx, vy, life, size, col, o) { return K().add(t, x, y, vx, vy, life, size, col, o); }
  function rate(n) { return K().rate(n); }
  function hard(r) { return r.fam !== "slime" && r.fam !== "nature"; }
  function bits(r) { return r.bits; }
  function glow(ctx, x, y, rx, ry, col, a) { if (!SF.dbgNoGlow) K().glow(ctx, x, y, rx, ry, col, a); }
  function stamp(ctx, c, x, y, rot, sc, a) { K().stamp(ctx, c, x, y, rot, sc, a); }
  var GLYPHS = ["+", "*", "x", "o", "#", "<", ">", "=", "^"];

  /* ---------------- trails ---------------- */
  function trail(r, x, y, vx, vy, rad, heavy) {
    if (SF.dbgNoTrail) return;
    var n = rate((heavy ? 40 : 22) + (r.tier || 0) * 4 + r.grand * 3), i, sp = Math.sqrt(vx * vx + vy * vy) || 1, bx = -vx / sp, by = -vy / sp, px, py, P = r.pal, B = r.bits;
    for (i = 0; i < n; i++) {
      px = x + bx * rnd(2, rad * 1.5) + rnd(-rad, rad) * 0.5; py = y + by * rnd(2, rad * 1.5) + rnd(-rad, rad) * 0.5;
      switch (r.trail) {
        case "embers": add("px", px, py, bx * 20 + rnd(-14, 14), by * 20 - rnd(20, 60), rnd(0.2, 0.45), rnd(2, 4), pick(B), { add: true }); break;
        case "glitter": add(Math.random() < 0.25 ? "cross" : "px", px, py, rnd(-8, 8), rnd(4, 22), rnd(0.3, 0.55), rnd(1.5, 3), pick(B), { add: true }); break;
        case "bubbles": add("ring", px, py, rnd(-8, 8), -rnd(8, 26), rnd(0.3, 0.55), rnd(1, 2.5), P[2], { grow: 4, len: 1.4 }); break;
        case "ribbon": add("line", px, py, vx * 0.5, vy * 0.5, rnd(0.12, 0.22), 3, pick([P[1], P[2]]), { add: true, len: rnd(10, 18), drag: 6 }); break;
        case "smoke": add("smoke", px, py, rnd(-10, 10), -rnd(6, 20), rnd(0.35, 0.65), rnd(3, 5), pick(["#3a3236", "#4a4248", P[0]]), { grow: 9 }); break;
        case "petals": add("img", px, py, bx * 30 + rnd(-20, 20), by * 20 + rnd(-10, 20), rnd(0.5, 0.9), rnd(7, 10), null, { img: mini(r, "petal", 6), rot: rnd(0, TAU), spin: rnd(-8, 8), grav: 40, sway: 50 }); break;
        case "notes": add("img", px, py, rnd(-10, 10), -rnd(30, 60), rnd(0.45, 0.75), rnd(8, 11), null, { img: mini(r, "note", 7), sway: 60 }); break;
        case "rings": if (Math.random() < 0.5) add("ring", px, py, 0, 0, 0.3, 2, P[2], { add: true, grow: 22, len: 2 }); break;
        case "glyphs": add("txt", px, py, rnd(-12, 12), -rnd(14, 34), rnd(0.35, 0.6), rnd(8, 11), pick(B), { add: true, ch: r.palName === "glitch" ? (Math.random() < 0.5 ? "0" : "1") : pick(GLYPHS) }); break;
        case "crackle": add("line", px, py, rnd(-160, 160), rnd(-160, 160), rnd(0.06, 0.12), 1.5, pick(["#ffffff", P[2], P[3]]), { add: true, len: rnd(5, 10) }); break;
        case "drips": add("px", px, py, rnd(-8, 8), rnd(6, 24), rnd(0.3, 0.55), rnd(2, 4), pick(B), { grav: 220 }); break;
        case "dust": add(Math.random() < 0.6 ? "smoke" : "px", px, py, rnd(-14, 14), -rnd(2, 14), rnd(0.3, 0.55), rnd(2, 4), pick(["#b8a888", "#8a7a60", P[1]]), { grow: 6 }); break;
        case "feathers": if (Math.random() < 0.6) add("img", px, py, rnd(-20, 20), rnd(-6, 16), rnd(0.6, 1), rnd(8, 11), null, { img: mini(r, "feather", 7), rot: rnd(0, TAU), spin: rnd(-4, 4), grav: 30, sway: 70 }); break;
        case "snow": add("px", px, py, rnd(-10, 10), rnd(6, 26), rnd(0.5, 0.9), rnd(1.5, 3), "#ffffff", { add: true, sway: 40 }); break;
        case "hearts": if (Math.random() < 0.6) add("img", px, py, rnd(-14, 14), -rnd(26, 50), rnd(0.5, 0.8), rnd(7, 10), null, { img: mini(r, "heart", 7), sway: 30 }); break;
        case "twinkles": add(Math.random() < 0.45 ? "cross" : "px", px, py, rnd(-14, 14), rnd(-14, 14), rnd(0.25, 0.5), rnd(2, 4), pick(B), { add: true }); break;
        case "leaves": if (Math.random() < 0.7) add("img", px, py, bx * 26 + rnd(-16, 16), by * 18 + rnd(-6, 16), rnd(0.55, 0.9), rnd(7, 10), null, { img: mini(r, "leaf", 6), rot: rnd(0, TAU), spin: rnd(-9, 9), grav: 50, sway: 50 }); break;
        case "streaks": add("line", px, py, vx * 0.4 + rnd(-10, 10), vy * 0.4 + rnd(-10, 10), rnd(0.12, 0.22), 1.5, pick(B), { add: true, len: rnd(8, 18) }); break;
        case "steam": add("smoke", px, py, rnd(-8, 8), -rnd(16, 34), rnd(0.4, 0.7), rnd(3, 5), "#e8eef4", { grow: 12 }); break;
        case "wisps": add("smoke", px, py, rnd(-6, 6), -rnd(10, 26), rnd(0.35, 0.6), rnd(3, 5), P[1], { grow: 7, add: true }); if (Math.random() < 0.3) add("px", px, py, 0, -rnd(20, 40), 0.3, 2, P[3], { add: true }); break;
        case "sparks": add("line", px, py, rnd(-200, 200), rnd(-200, 200), rnd(0.08, 0.16), 1.5, pick(["#fff4a0", "#ffffff", P[2]]), { add: true, len: rnd(4, 8), drag: 4 }); break;
        case "threads": add("line", px, py, vx * 0.15, vy * 0.15, rnd(0.25, 0.4), 1, P[2], { len: rnd(18, 30) }); break;
        case "swirl": var a = rnd(0, TAU); add("px", x + Math.cos(a) * rad, y + Math.sin(a) * rad, -Math.sin(a) * 90 + bx * 30, Math.cos(a) * 90 + by * 30, rnd(0.25, 0.4), rnd(2, 3), pick(B), { add: true, drag: 2 }); break;
        default: add("px", px, py, rnd(-8, 8), -rnd(6, 16), 0.3, 2, pick(B), { add: true });
      }
    }
  }

  /* ---------------- impacts ---------------- */
  function spray(n, x, y, a, cone, s0, s1, fn) { var i, d, s; for (i = 0; i < n; i++) { d = a + rnd(-cone, cone); s = rnd(s0, s1); fn(Math.cos(d) * s, Math.sin(d) * s); } }
  function fork(x, y, a, len, col, segs) {
    var i, px = x, py = y, nx, ny, d = len / segs;
    for (i = 0; i < segs; i++) {
      a += rnd(-0.7, 0.7); nx = px + Math.cos(a) * d; ny = py + Math.sin(a) * d;
      add("line", nx, ny, Math.cos(a) * 0.01, Math.sin(a) * 0.01, rnd(0.1, 0.16), 2, col, { add: true, len: d });
      px = nx; py = ny;
    }
  }
  function impact(r, x, y, a, power) {
    var k = power * (low() ? 0.45 : 1) * G(r), n = Math.max(3, Math.round((8 + (r.tier || 0) * 2) * k)), P = r.pal, B = r.bits, i, j;
    add("flash", x, y, 0, 0, 0.1, (12 + (r.tier || 0) * 3) * k, r.glow, { add: true });
    switch (r.impact) {
      case "splash":
        spray(n, x, y, -Math.PI / 2, 1.2, 80, 190, function (vx, vy) { add("px", x, y, vx, vy, rnd(0.3, 0.55), rnd(2, 4), pick(B), { grav: 520 }); });
        add("ring", x, y + 3, 0, 0, 0.3, 3, P[2], { grow: 50 * k, len: 2 }); add("ring", x, y + 3, 0, 0, 0.45, 2, P[1], { grow: 30 * k, len: 1.5 }); break;
      case "shatter":
        spray(n, x, y, a, Math.PI, 90, 260, function (vx, vy) { add("img", x, y, vx, vy, rnd(0.25, 0.5), rnd(5, 8), null, { img: mini(r, "shard", 5), rot: Math.atan2(vy, vx), spin: rnd(-12, 12), drag: 3, grav: 120 }); });
        add("ring", x, y, 0, 0, 0.22, 4, "#ffffff", { add: true, grow: 70 * k, len: 2 }); break;
      case "starburst":
        for (i = 0; i < 8; i++) { j = (TAU * i) / 8 + a; add("line", x, y, Math.cos(j) * 340, Math.sin(j) * 340, 0.16, i % 2 ? 2 : 3, i % 2 ? P[2] : P[3], { add: true, len: 18 * k, drag: 6 }); }
        add("cross", x, y, 0, 0, 0.25, 12 * k, P[3], { add: true }); break;
      case "ripple":
        for (i = 0; i < 3; i++) add("ring", x, y, 0, 0, 0.3 + i * 0.12, 2, P[1 + i % 3], { add: true, grow: (40 + i * 26) * k, len: 2.5 - i * 0.5 }); break;
      case "crossflash":
        add("line", x + 18 * k, y + 18 * k, 0.01, 0.01, 0.16, 3, P[3], { add: true, len: 36 * k }); add("line", x - 18 * k, y + 18 * k, -0.01, 0.01, 0.16, 3, P[3], { add: true, len: 36 * k });
        add("flash", x, y, 0, 0, 0.12, 22 * k, "#ffffff", { add: true }); break;
      case "petals":
        spray(n, x, y, 0, Math.PI, 50, 150, function (vx, vy) { add("img", x, y, vx, vy, rnd(0.5, 0.9), rnd(7, 10), null, { img: mini(r, "petal", 6), rot: rnd(0, TAU), spin: rnd(-8, 8), drag: 2.5, grav: 50, sway: 40 }); }); break;
      case "puff":
        spray(Math.ceil(n * 0.7), x, y, 0, Math.PI, 30, 90, function (vx, vy) { add("smoke", x, y, vx, vy, rnd(0.4, 0.7), rnd(5, 8), pick(["#e8e4e0", P[2], "#c8c0c8"]), { grow: 14, drag: 3 }); }); break;
      case "fork":
        for (i = 0; i < 3; i++) fork(x, y, a + rnd(-1.4, 1.4) + Math.PI, 40 * k, i ? P[2] : "#ffffff", 4); add("flash", x, y, 0, 0, 0.12, 26 * k, P[2], { add: true }); break;
      case "crater":
        add("ring", x, y + 2, 0, 0, 0.4, 4, "#2a2018", { grow: 30 * k, len: 4 });
        spray(n, x, y, -Math.PI / 2, 1.1, 90, 220, function (vx, vy) { add("img", x, y, vx, vy, rnd(0.45, 0.75), rnd(5, 8), null, { img: mini(r, "rock", 5), rot: rnd(0, TAU), spin: rnd(-8, 8), grav: 560 }); });
        for (i = 0; i < 4; i++) add("smoke", x + rnd(-10, 10), y + rnd(-2, 4), rnd(-40, 40), -rnd(6, 20), rnd(0.4, 0.7), 6, "#a89880", { grow: 12, drag: 2 }); break;
      case "glyph":
        add("ring", x, y, 0, 0, 0.35, 16 * k, P[2], { add: true, grow: 20, len: 2 });
        for (i = 0; i < 6; i++) { j = (TAU * i) / 6; add("txt", x + Math.cos(j) * 18 * k, y + Math.sin(j) * 18 * k, Math.cos(j) * 20, Math.sin(j) * 20, 0.4, 9, P[3], { add: true, ch: r.palName === "glitch" ? (i % 2 ? "1" : "0") : pick(GLYPHS) }); } break;
      case "swirl":
        for (i = 0; i < n; i++) { j = (TAU * i) / n; add("px", x + Math.cos(j) * 6, y + Math.sin(j) * 6, Math.cos(j + 1.3) * 160, Math.sin(j + 1.3) * 160, rnd(0.25, 0.45), rnd(2, 3.5), pick(B), { add: true, drag: 3 }); } break;
      case "confetti":
        spray(n + 3, x, y, -Math.PI / 2, 1.4, 80, 200, function (vx, vy) { add("px", x, y, vx, vy, rnd(0.5, 0.9), rnd(2, 4), pick([P[1], P[2], "#ffe14a", "#7af0ff", "#ff8ad8"]), { grav: 300, sway: 60, drag: 1.5 }); }); break;
      case "claws":
        K().claws(x, y, a, 12 * k, "#ffffff", 3); K().claws(x, y, a, 14 * k, P[1], 3); break;
      case "pop":
        add("ring", x, y, 0, 0, 0.16, 6 * k, "#ffffff", { add: true, grow: 60, len: 1.5 });
        spray(n, x, y, 0, Math.PI, 70, 150, function (vx, vy) { add("px", x, y, vx, vy, rnd(0.15, 0.3), 2, P[3], { add: true, drag: 4 }); }); break;
      case "flare":
        add("flash", x, y, 0, 0, 0.2, 30 * k, r.glow, { add: true });
        spray(n, x, y, -Math.PI / 2, 1.0, 60, 200, function (vx, vy) { add("px", x, y, vx, vy, rnd(0.3, 0.6), rnd(2, 4.5), pick(B), { add: true, drag: 2 }); }); break;
      case "pins":
        for (i = 0; i < 6; i++) { j = (TAU * i) / 6 + a; add("img", x, y, Math.cos(j) * 230, Math.sin(j) * 230, 0.22, 9 * k, null, { img: mini(r, "needle", 7), rot: j, drag: 6 }); } break;
      case "sparks":
        spray(n + 2, x, y, a + Math.PI, 1.3, 160, 380, function (vx, vy) { add("line", x, y, vx, vy, rnd(0.12, 0.25), 1.5, pick(["#fff4a0", "#ffffff", P[2]]), { add: true, len: rnd(5, 10), grav: 300, drag: 2 }); }); break;
      case "splat":
        spray(n, x, y, 0, Math.PI, 40, 130, function (vx, vy) { add("img", x, y, vx, vy, rnd(0.35, 0.6), rnd(5, 8), null, { img: mini(r, "blob", 5), grav: 260, drag: 2 }); });
        add("ring", x, y + 2, 0, 0, 0.3, 4, P[1], { grow: 24 * k, len: 3 }); break;
      case "bite":
        add("cut", x, y - 8 * k, 0, 0, 0.2, 3, "#ffffff", { add: true, rot: a + Math.PI / 2, len: 16 * k }); add("cut", x, y + 8 * k, 0, 0, 0.2, 3, "#ffffff", { add: true, rot: a - Math.PI / 2, len: 16 * k });
        add("flash", x, y, 0, 0, 0.1, 18 * k, P[1], { add: true }); break;
      case "web":
        for (i = 0; i < 6; i++) { j = (TAU * i) / 6; add("line", x + Math.cos(j) * 26 * k, y + Math.sin(j) * 26 * k, Math.cos(j) * 0.01, Math.sin(j) * 0.01, 0.5, 1, P[2], { len: 26 * k }); }
        add("ring", x, y, 0, 0, 0.5, 13 * k, P[2], { len: 1, grow: 4 }); break;
      case "blast":
        K().boom({ look: { pal: P, glow: r.glow, bits: B }, fam: r.fam, tier: r.tier || 2, key: "S_" + r.id }, x, y, a, 26 * k); break;
      case "feathers":
        spray(n, x, y, -Math.PI / 2, 1.5, 40, 120, function (vx, vy) { add("img", x, y, vx, vy, rnd(0.7, 1.1), rnd(8, 11), null, { img: mini(r, "feather", 7), rot: rnd(0, TAU), spin: rnd(-4, 4), drag: 3, grav: 40, sway: 70 }); }); break;
      default:
        spray(n, x, y, 0, Math.PI, 60, 180, function (vx, vy) { add("px", x, y, vx, vy, rnd(0.2, 0.4), 3, pick(B), { add: true, drag: 3 }); });
    }
  }

  /* ---------------- wind-ups ---------------- */
  function cast(r, x, y, a) {
    var P = r.pal, i, j, k = G(r), fx = x + Math.cos(a) * 9, fy = y + Math.sin(a) * 9;
    add("flash", fx, fy, 0, 0, 0.09, (10 + (r.tier || 0) * 3) * k, r.glow, { add: true });
    switch (r.cast) {
      case "charge": for (i = 0; i < (low() ? 2 : 6); i++) { j = rnd(0, TAU); add("line", fx + Math.cos(j) * 26, fy + Math.sin(j) * 26, -Math.cos(j) * 160, -Math.sin(j) * 160, 0.14, 1.5, pick(r.bits), { add: true, len: 8 }); } break;
      case "ringout": add("ring", x, y, 0, 0, 0.3, 8, P[2], { add: true, grow: 60 * k, len: 2.5 }); break;
      case "glyph": add("ring", x, y + 4, 0, 0, 0.35, 16 * k, P[2], { add: true, grow: 6, len: 1.5 }); add("txt", x, y - 16, 0, -24, 0.4, 10, P[3], { add: true, ch: pick(GLYPHS) }); break;
      case "stomp": for (i = 0; i < 4; i++) add("smoke", x + rnd(-12, 12), y + 8, rnd(-50, 50), -rnd(4, 12), 0.4, 5, "#b0a080", { grow: 10, drag: 3 }); break;
      case "sparkle": for (i = 0; i < 4; i++) add("cross", x + rnd(-14, 14), y + rnd(-14, 8), 0, -rnd(10, 30), 0.3, rnd(3, 5), P[3], { add: true }); break;
      case "roar": for (i = -2; i <= 2; i++) { j = a + i * 0.3; add("line", fx + Math.cos(j) * 10, fy + Math.sin(j) * 10, Math.cos(j) * 260, Math.sin(j) * 260, 0.14, 2, P[2], { add: true, len: 10, drag: 4 }); } break;
      case "spin": for (i = 0; i < 6; i++) { j = (TAU * i) / 6; add("px", x + Math.cos(j) * 14, y + Math.sin(j) * 14, -Math.sin(j) * 120, Math.cos(j) * 120, 0.22, 2.5, pick(r.bits), { add: true, drag: 3 }); } break;
    }
  }

  /* ---------------- shots ---------------- */
  function motionOff(r, p, t) {
    var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1, nx = -p.vy / sp, ny = p.vx / sp, ph = (p.life || 0) * 13 + (p.vx * 0.013 + p.vy * 0.007), o = 0, ox = 0, oy = 0;
    switch (r.form) {
      case "wave": o = Math.sin(ph) * 6; break;
      case "spiral": ox = Math.cos(ph * 1.6) * 6; oy = Math.sin(ph * 1.6) * 6; break;
      case "zigzag": o = (Math.abs(((ph * 0.5) % 2 + 2) % 2 - 1) * 2 - 1) * 7; break;
      case "flutter": o = Math.sin(ph * 0.8) * 8; oy = Math.abs(Math.sin(ph * 1.6)) * -3; break;
      case "hop": oy = -Math.abs(Math.sin(ph * 0.7)) * 12; break;
    }
    return { x: p.x + nx * o + ox, y: p.y + ny * o + oy, nx: nx, ny: ny, sp: sp };
  }
  function drawFlying(ctx, p, t, r) {
    var rad = p.radius || 6, k = G(r), m = motionOff(r, p, t), sp = m.sp, ang = Math.atan2(p.vy, p.vx), c, n, i, back, rot, sc = 1;
    var cells = Math.max(6, Math.min(26, (rad * 3 + (r.tier || 0) * 2.4) * k / 2 * (r.motif === "needle" || r.motif === "sword" ? 1.5 : 1)));
    c = img(r, cells, (Math.floor(t * 12) + ((p.x * 3) | 0)) & 1);
    rot = r.upright ? Math.sin(t * 6 + p.x * 0.05) * 0.25 : (r.spin ? t * r.spin + p.x * 0.01 : ang);
    if (r.form === "tumble") rot = t * 14 + p.y * 0.02;
    if (r.form === "flutter") rot = ang + Math.sin((p.life || 0) * 10) * 0.6;
    if (r.form === "pulse") sc = 1 + 0.22 * Math.sin(t * 18 + p.x * 0.1);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    glow(ctx, m.x, m.y, c.width * 1.2 * sc, c.width * 1.0 * sc, r.glow, (0.45 + 0.1 * Math.sin(t * 20 + p.x)) * (r.form === "comet" ? 1.3 : 1));
    n = low() ? 1 : (r.form === "comet" ? 6 : (r.form === "ghost" ? 0 : 3)); back = Math.min(r.form === "comet" ? 0.022 : 0.03, 9 / sp);
    for (i = n; i >= 1; i--) stamp(ctx, c, m.x - p.vx * back * i, m.y - p.vy * back * i, rot - (r.spin ? i * 0.4 : 0), (1 - i * (r.form === "comet" ? 0.1 : 0.14)) * sc, (r.form === "comet" ? 0.5 : 0.34) - i * (r.form === "comet" ? 0.07 : 0.08));
    if (r.form === "ghost") for (i = 0; i < 2; i++) stamp(ctx, c, m.x + m.nx * (i ? 9 : -9) * Math.sin(t * 7), m.y + m.ny * (i ? 9 : -9) * Math.sin(t * 7), rot, 0.85, 0.35);
    if (r.grand >= 2) { ctx.globalCompositeOperation = "lighter"; stamp(ctx, c, m.x, m.y, rot, 1.35 * sc, 0.25); ctx.globalCompositeOperation = "source-over"; }
    stamp(ctx, c, m.x, m.y, rot, sc, 1);
    ctx.restore();
    trail(r, m.x, m.y, p.vx, p.vy, rad, r.form === "comet");
  }

  /* traps: each its own thing lying on the ground; blinks as its time runs out */
  function drawTrap(ctx, p, t, r) {
    var x = Math.round(p.x), y = Math.round(p.y), P = r.pal, ph = t * 3 + (p.x + p.y) * 0.05, bl = p.life < 1.6 ? ((Math.floor(t * 10) & 1) ? 0.45 : 1) : 1, pu = 1 + 0.08 * Math.sin(ph * 2), k = G(r) * 1.25, i, a, R, c;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 0.25; ctx.fillStyle = "#06080f"; ctx.beginPath(); ctx.ellipse(x, y + 6, 14 * k, 6 * k, 0, 0, TAU); ctx.fill();
    glow(ctx, x, y, 24 * pu * k, 18 * pu * k, r.glow, 0.38 * bl);
    ctx.globalAlpha = bl;
    switch (r.form) {
      case "mark":
        ctx.globalCompositeOperation = "lighter";
        for (R = 0; R < 2; R++) { ctx.strokeStyle = R ? P[0] : P[1]; ctx.lineWidth = R ? 2 : 3; ctx.beginPath(); for (i = 0; i <= 3; i++) { a = (R ? -1 : 1) * ph * 0.5 + (TAU * i) / 3 + (R ? Math.PI : 0); ctx[i ? "lineTo" : "moveTo"](x + Math.cos(a) * (R ? 11 : 19) * k, y + Math.sin(a) * (R ? 8 : 13.5) * k); } ctx.stroke(); }
        stamp(ctx, img(r, 6, 0), x, y, 0, 1, bl); break;
      case "puddle":
        for (i = 0; i < 3; i++) { ctx.fillStyle = P[i]; ctx.beginPath(); ctx.ellipse(x + (i ? 1 : 0), y + 2 - i, (17 - i * 4.5) * pu * k, (9 - i * 2.6) * pu * k, 0, 0, TAU); ctx.fill(); }
        if (Math.random() < 0.06) add("ring", x + rnd(-10, 10), y + rnd(-4, 4), 0, -4, 0.4, 1, P[2], { grow: 9, len: 1.5 }); break;
      case "bubble":
        stamp(ctx, img(r, 12 * k, 0), x, y - 4 + Math.sin(ph) * 3, 0, pu, bl);
        ctx.fillStyle = P[3]; ctx.fillRect(x - 5, y - 9 + Math.round(Math.sin(ph) * 3), 3, 3); break;
      case "web":
        ctx.strokeStyle = P[2]; ctx.lineWidth = 1.5; ctx.beginPath();
        for (i = 0; i < 8; i++) { a = (TAU * i) / 8; ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 22 * k, y + Math.sin(a) * 14 * k); } ctx.stroke();
        for (R = 7; R <= 21; R += 7) { ctx.beginPath(); for (i = 0; i <= 8; i++) { a = (TAU * i) / 8; ctx[i ? "lineTo" : "moveTo"](x + Math.cos(a) * R * k * pu, y + Math.sin(a) * R * 0.64 * k * pu); } ctx.stroke(); }
        stamp(ctx, img(r, 6, 0), x, y, ph, 1, bl); break;
      case "caltrops":
        for (i = 0; i < 5; i++) { a = i * 2.4 + 0.5; c = img(r, 7, 0); stamp(ctx, c, x + Math.cos(a) * 11 * k, y + Math.sin(a) * 6 * k, a + ph * 0.2, 1, bl); }
        ctx.fillStyle = P[3]; if (Math.floor(t * 4) & 1) ctx.fillRect(x - 1, y - 1, 2, 2); break;
      case "bud":
        /* a closed flower bud that swells */
        for (i = 0; i < 5; i++) { a = (TAU * i) / 5 - Math.PI / 2 + Math.sin(ph) * 0.05; stamp(ctx, mini(r, "petal", 9), x + Math.cos(a) * 5 * pu, y - 4 + Math.sin(a) * 4 * pu, a, pu * k, bl); }
        ctx.fillStyle = P[3]; ctx.fillRect(x - 2, y - 6, 4, 4);
        ctx.fillStyle = "#3a7a20"; ctx.fillRect(x - 1, y + 2, 2, 6); break;
      case "rune":
        ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = P[2]; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(x, y, 20 * k, 12 * k, 0, 0, TAU); ctx.stroke();
        ctx.lineWidth = 1; ctx.beginPath(); for (i = 0; i <= 5; i++) { a = ph * 0.4 + (TAU * i * 2) / 5; ctx[i ? "lineTo" : "moveTo"](x + Math.cos(a) * 17 * k, y + Math.sin(a) * 10 * k); } ctx.stroke();
        if (Math.random() < 0.08) add("txt", x + rnd(-14, 14), y + rnd(-6, 6), 0, -26, 0.5, 9, P[3], { add: true, ch: pick(GLYPHS) }); break;
      case "crystal":
        for (i = 0; i < 4; i++) { a = -Math.PI / 2 + (i - 1.5) * 0.45; stamp(ctx, mini(r, "gem", 9 + (i % 2) * 3), x + (i - 1.5) * 6 * k, y - 6 - (i % 2) * 3, a + Math.PI / 2, k, bl); }
        if (Math.random() < 0.05) add("cross", x + rnd(-10, 10), y - rnd(4, 16), 0, 0, 0.3, 3, "#ffffff", { add: true }); break;
      case "pit":
        ctx.fillStyle = "#0c0806"; ctx.beginPath(); ctx.ellipse(x, y + 2, 15 * k * pu, 8 * k * pu, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = P[1]; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y + 2, 16 * k, 9 * k, 0, 0, TAU); ctx.stroke();
        for (i = 0; i < 6; i++) { a = (TAU * i) / 6 + 0.3; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 16 * k, y + 2 + Math.sin(a) * 9 * k); ctx.lineTo(x + Math.cos(a + 0.2) * 23 * k, y + 2 + Math.sin(a + 0.2) * 13 * k); ctx.stroke(); }
        if (Math.random() < 0.04) add("px", x + rnd(-12, 12), y - 6, 0, 20, 0.4, 2, P[2], { grav: 100 }); break;
      case "coals":
        ctx.fillStyle = "#2a1a14"; ctx.beginPath(); ctx.ellipse(x, y + 1, 15 * k, 7 * k, 0, 0, TAU); ctx.fill();
        for (i = 0; i < 7; i++) { a = i * 1.7; ctx.fillStyle = (Math.floor(t * 5 + i) % 3) ? P[1] : P[2]; ctx.fillRect(x + Math.round(Math.cos(a) * 9 * k) - 4, y + Math.round(Math.sin(a) * 4 * k) - 3, 7, 5); }
        if (Math.random() < 0.3) add("px", x + rnd(-12, 12), y + rnd(-4, 4), rnd(-6, 6), -rnd(20, 50), rnd(0.3, 0.6), rnd(2, 3), pick(r.bits), { add: true }); break;
      case "paw":
        for (i = 0; i < 2; i++) stamp(ctx, mini(r, "paw", 10), x + (i ? 8 : -8) * k, y + (i ? -4 : 4), (i ? 0.3 : -0.3), k * pu, bl * (0.7 + 0.3 * Math.sin(ph + i * 2))); break;
      case "bomb":
        stamp(ctx, img(r, 10 * k, 0), x, y - 3, Math.sin(ph) * 0.2, pu, bl);
        if (Math.floor(t * (p.life < 1.6 ? 8 : 3)) & 1) { ctx.fillStyle = "#ff3a2a"; ctx.fillRect(x - 2, y - 14 * k, 4, 4); } break;
      case "charm":
        ctx.fillStyle = "#f4ecd4"; ctx.fillRect(x - 6, y - 12 + Math.round(Math.sin(ph) * 2), 12, 18);
        ctx.fillStyle = P[1]; ctx.fillRect(x - 4, y - 9 + Math.round(Math.sin(ph) * 2), 8, 2); ctx.fillRect(x - 1, y - 7 + Math.round(Math.sin(ph) * 2), 2, 10);
        stamp(ctx, img(r, 6, 0), x, y + Math.round(Math.sin(ph) * 2), 0, 1, bl); break;
      case "eye":
        a = 0.6 + 0.4 * Math.abs(Math.sin(ph * 0.7));
        ctx.fillStyle = P[0]; ctx.beginPath(); ctx.ellipse(x, y, 16 * k, 7 * k * a, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = P[2]; ctx.beginPath(); ctx.ellipse(x, y, 13 * k, 5.5 * k * a, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = P[3]; ctx.beginPath(); ctx.ellipse(x + Math.sin(ph) * 4, y, 3.5 * k, 3.5 * k * a, 0, 0, TAU); ctx.fill(); break;
      case "spores":
        stamp(ctx, mini(r, "cloud", 12), x, y - 4, 0, pu * k, bl * 0.9);
        if (Math.random() < 0.25) add("px", x + rnd(-12, 12), y - rnd(0, 10), rnd(-10, 10), -rnd(10, 26), rnd(0.5, 0.9), rnd(2, 3), pick(r.bits), { sway: 30 }); break;
      case "snowdrift":
        for (i = 0; i < 3; i++) { ctx.fillStyle = i ? P[2] : P[1]; ctx.beginPath(); ctx.ellipse(x + (i - 1) * 7 * k, y + 2 - (i === 1 ? 3 : 0), 9 * k, 5 * k, 0, 0, TAU); ctx.fill(); }
        stamp(ctx, mini(r, "flake", 8), x, y - 8, ph * 0.3, 1, bl); break;
      default:
        stamp(ctx, img(r, 9, 0), x, y - 3 + Math.sin(ph) * 2, ph * 0.6, pu, bl);
    }
    ctx.restore();
  }

  /* boomerangs: each spins its own way */
  function drawSpinner(ctx, p, t, r) {
    var rad = p.radius || 8, k = G(r), sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1, c = img(r, Math.max(12, rad * 1.7) * k, 0), rot = t * 17 + (p.x + p.y) * 0.004, i, a, P = r.pal, R = c.width * 0.62;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    glow(ctx, p.x, p.y, c.width * 1.3, c.width * 1.3, r.glow, 0.5);
    switch (r.form) {
      case "ribbon":
        for (i = 6; i >= 1; i--) stamp(ctx, c, p.x - (p.vx / sp) * 6 * i + Math.sin(t * 20 + i) * 3, p.y - (p.vy / sp) * 6 * i, rot - i * 0.5, 1 - i * 0.08, 0.42 - i * 0.06);
        break;
      case "twin":
        for (i = 0; i < 2; i++) { a = t * 12 + i * Math.PI; stamp(ctx, c, p.x + Math.cos(a) * 9 * k, p.y + Math.sin(a) * 9 * k, rot, 0.8, 1); }
        ctx.restore(); trail(r, p.x, p.y, p.vx, p.vy, rad, false); return;
      case "wheel":
        ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = P[2]; ctx.lineWidth = 2; ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, TAU); ctx.stroke();
        ctx.beginPath(); for (i = 0; i < 6; i++) { a = rot + (TAU * i) / 6; ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(a) * R, p.y + Math.sin(a) * R); } ctx.stroke();
        ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; break;
      case "saw":
        ctx.fillStyle = P[1]; ctx.beginPath();
        for (i = 0; i <= 24; i++) { a = rot * 1.4 + (TAU * i) / 24; ctx[i ? "lineTo" : "moveTo"](p.x + Math.cos(a) * R * (i % 2 ? 1.25 : 0.95), p.y + Math.sin(a) * R * (i % 2 ? 1.25 : 0.95)); }
        ctx.fill();
        if (Math.random() < 0.5) add("line", p.x, p.y, rnd(-220, 220), rnd(-220, 220), 0.12, 1.5, "#fff4a0", { add: true, len: 6, grav: 200 }); break;
      case "ring":
        ctx.globalCompositeOperation = "lighter";
        for (i = 0; i < 2; i++) { ctx.strokeStyle = i ? P[3] : P[1]; ctx.lineWidth = i ? 2 : 5; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.ellipse(p.x, p.y, R * 1.1, R * 1.1 * Math.abs(Math.cos(rot * 0.5)) + 3, rot * 0.2, 0, TAU); ctx.stroke(); }
        ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.restore(); trail(r, p.x, p.y, p.vx, p.vy, rad, false); return;
      default:
        for (i = 3; i >= 1; i--) stamp(ctx, c, p.x - (p.vx / sp) * 9 * i, p.y - (p.vy / sp) * 9 * i, rot - i * 0.9, 1 - i * 0.1, 0.32 - i * 0.08);
        ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = P[2]; ctx.lineWidth = 2; ctx.globalAlpha = 0.55;
        for (i = 0; i < 2; i++) { a = rot * 0.9 + i * Math.PI; ctx.beginPath(); ctx.arc(p.x, p.y, R, a, a + 1.5); ctx.stroke(); }
        ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    }
    stamp(ctx, c, p.x, p.y, rot, 1, 1);
    ctx.restore();
    trail(r, p.x, p.y, p.vx, p.vy, rad, false);
  }

  function drawShot(ctx, p, t, st) {
    var r = SF.rec && SF.rec(p.wid);
    if (!r || !K()) return false;
    t = t || 0;
    if (r.type === "mine") drawTrap(ctx, p, t, r);
    else if (r.type === "boomerang") drawSpinner(ctx, p, t, r);
    else drawFlying(ctx, p, t, r);
    return true;
  }

  /* ---------------- events ---------------- */
  function event(e, st) {
    var r = SF.rec && SF.rec(e.w);
    if (!r || !K()) return false;
    var a = e.a || 0;
    if (anims.length > 70) anims.shift();
    switch (e.k) {
      case "cast": cast(r, e.x, e.y, a); return true;
      case "hit": case "slash": impact(r, e.x, e.y, a, 1); return true;
      case "burst": burstStart(r, e); return true;
      case "beam": if (e.cone) return false; beamStart(r, e); return true;
      case "chain": if (!e.pts || e.pts.length < 4) return true; anims.push({ g: "chain", r: r, t: 0, max: 0.24 + 0.045 * (e.pts.length / 2), pts: e.pts, done: 0, seed: Math.random() * 99 }); return true;
      case "drop": anims.push({ g: "drop", r: r, t: 0, max: e.t || 0.4, x: e.x, y: e.y, R: e.r || 40, up: !!e.up, seed: Math.random() * TAU, sx: rnd(-1, 1) }); return true;
      case "boom": boom(r, e); return true;
    }
    return false;
  }

  /* ---- bursts ---- */
  function burstStart(r, e) {
    var R = (e.r || 60) * (r.grand ? 1.04 : 1), k = G(r), i, j, n, B = r.bits, P = r.pal, x = e.x, y = e.y;
    anims.push({ g: "burst", r: r, t: 0, max: r.form === "quake" ? 0.7 : (r.form === "dome" ? 0.5 : 0.46), x: x, y: y, R: R, seed: Math.random() * TAU });
    add("flash", x, y, 0, 0, 0.14, R * 1.1, r.glow, { add: true });
    n = low() ? 6 : Math.round(14 * k);
    switch (r.form) {
      case "flurry": case "whirl":
        for (i = 0; i < n; i++) { j = (TAU * i) / n; add("img", x + Math.cos(j) * 8, y + Math.sin(j) * 8, Math.cos(j + (r.form === "whirl" ? 0.9 : 0)) * R * 3.2, Math.sin(j + (r.form === "whirl" ? 0.9 : 0)) * R * 3.2, rnd(0.35, 0.55), rnd(9, 13) * k, null, { img: img(r, 8, 0), rot: j, spin: r.form === "whirl" ? 10 : rnd(-6, 6), drag: 4.5 }); } break;
      case "quake":
        for (i = 0; i < 6; i++) add("smoke", x + rnd(-R, R) * 0.7, y + rnd(-R, R) * 0.4, rnd(-30, 30), -rnd(10, 30), rnd(0.5, 0.8), 7, "#a89880", { grow: 14, drag: 2 });
        spray(n, x, y, -Math.PI / 2, 1.2, 80, 230, function (vx, vy) { add("img", x + rnd(-R, R) * 0.5, y, vx, vy, rnd(0.45, 0.8), rnd(5, 8), null, { img: mini(r, "rock", 5), rot: rnd(0, TAU), spin: rnd(-8, 8), grav: 560 }); }); break;
      case "tide":
        spray(n * 2, x, y, 0, Math.PI, R * 2, R * 3.4, function (vx, vy) { add("px", x, y, vx, vy - 60, rnd(0.35, 0.6), rnd(2, 4), pick(B), { grav: 300, drag: 2.5 }); }); break;
      case "dome": break;
      case "lightning":
        for (i = 0; i < 7; i++) fork(x, y, (TAU * i) / 7 + rnd(-0.2, 0.2), R * 1.05, i % 2 ? P[2] : "#ffffff", 5); break;
      default:
        spray(n, x, y, 0, Math.PI, R * 1.6, R * 3, function (vx, vy) { add("px", x, y, vx, vy, rnd(0.25, 0.5), rnd(2, 4), pick(B), { add: hard(r), drag: 3 }); });
    }
  }
  function drawBurst(ctx, A, u) {
    var r = A.r, P = r.pal, R = A.R, e = 1 - (1 - Math.min(1, A.t / (A.max * 0.7))) * (1 - Math.min(1, A.t / (A.max * 0.7))), f = u > 0.55 ? Math.max(0, 1 - (u - 0.55) / 0.45) : 1, i, n, a, rr, c, x = A.x, y = A.y, k = G(r), j;
    ctx.globalAlpha = f;
    switch (r.form) {
      case "blocks":
        ctx.globalCompositeOperation = "lighter"; n = Math.round(14 + R / 5); rr = R * e;
        for (i = 0; i < n; i++) { a = A.seed + (TAU * i) / n + e * 0.5; ctx.fillStyle = P[1 + i % 3]; ctx.fillRect(Math.round(x + Math.cos(a) * rr) - 3, Math.round(y + Math.sin(a) * rr) - 3, 6, 6); }
        c = img(r, 9, 0); for (i = 0; i < 4; i++) { a = A.seed + A.t * 9 + (TAU * i) / 4; stamp(ctx, c, x + Math.cos(a) * rr * 0.8, y + Math.sin(a) * rr * 0.8, a, 1, f); } break;
      case "spikes":
        n = 10 + r.grand * 2; rr = R * (u < 0.35 ? u / 0.35 : 1);
        for (j = 0; j < 2; j++) {
          ctx.fillStyle = j ? P[2] : P[1]; ctx.beginPath();
          for (i = 0; i < n; i++) { a = A.seed + (TAU * i) / n; ctx.moveTo(x + Math.cos(a - 0.12) * rr * 0.25, y + Math.sin(a - 0.12) * rr * 0.25); ctx.lineTo(x + Math.cos(a) * rr * (j ? 0.85 : 1), y + Math.sin(a) * rr * (j ? 0.85 : 1)); ctx.lineTo(x + Math.cos(a + 0.12) * rr * 0.25, y + Math.sin(a + 0.12) * rr * 0.25); }
          ctx.fill();
        } break;
      case "bloom":
        n = 8 + r.grand; c = mini(r, "petal", 12);
        for (j = 0; j < 2; j++) for (i = 0; i < n; i++) { a = A.seed + (TAU * i) / n + j * Math.PI / n + e * (j ? -0.6 : 0.6); rr = R * e * (j ? 0.6 : 0.95); stamp(ctx, c, x + Math.cos(a) * rr, y + Math.sin(a) * rr, a, (1.3 - j * 0.3) * k, f); }
        ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = P[3]; ctx.beginPath(); ctx.arc(x, y, 6 * k * (1 - u), 0, TAU); ctx.fill(); break;
      case "quake":
        ctx.strokeStyle = "#1a120a"; ctx.lineWidth = 4;
        for (j = 0; j < 2; j++) {
          ctx.beginPath();
          for (i = 0; i < 7; i++) { a = A.seed + (TAU * i) / 7; ctx.moveTo(x, y); var px = x, py = y, s; for (s = 1; s <= 4; s++) { px = x + Math.cos(a + K().hsh(i, s, A.seed) - 0.5) * R * e * s / 4; py = y + Math.sin(a + K().hsh(i, s, A.seed) - 0.5) * R * e * s / 4 * 0.7; ctx.lineTo(px, py); } }
          ctx.stroke(); ctx.strokeStyle = P[2]; ctx.lineWidth = 1.5; ctx.globalCompositeOperation = "lighter";
        }
        ctx.globalCompositeOperation = "source-over"; ctx.strokeStyle = P[1]; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, R * e, R * e * 0.6, 0, 0, TAU); ctx.stroke(); break;
      case "vortex":
        ctx.globalCompositeOperation = "lighter";
        for (j = 0; j < 3; j++) { ctx.strokeStyle = P[1 + j]; ctx.lineWidth = 4 - j; ctx.beginPath(); for (i = 0; i <= 24; i++) { a = A.seed + A.t * 14 + (TAU * j) / 3 + i * 0.16; rr = R * e * (i / 24); ctx[i ? "lineTo" : "moveTo"](x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.stroke(); }
        c = img(r, 8, 0); for (i = 0; i < 3; i++) { a = A.seed + A.t * 14 + (TAU * i) / 3 + 3.8; stamp(ctx, c, x + Math.cos(a) * R * e, y + Math.sin(a) * R * e, a, 1, f); } break;
      case "nova":
        n = 5 + (r.grand % 3) * 2; ctx.globalCompositeOperation = "lighter";
        for (j = 0; j < 2; j++) { ctx.strokeStyle = j ? P[3] : P[1]; ctx.lineWidth = j ? 2 : 5; ctx.beginPath(); for (i = 0; i <= n * 2; i++) { a = A.seed + A.t * 2 + (Math.PI * i) / n; rr = R * e * (i % 2 ? 0.45 : 1); ctx[i ? "lineTo" : "moveTo"](x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.stroke(); }
        ctx.fillStyle = P[3]; ctx.globalAlpha = f * 0.4 * (1 - u); ctx.beginPath(); ctx.arc(x, y, R * e * 0.4, 0, TAU); ctx.fill(); break;
      case "triple":
        ctx.globalCompositeOperation = "lighter";
        for (j = 0; j < 3; j++) { e = Math.max(0, Math.min(1, (A.t - j * 0.08) / 0.3)); if (!e) continue; ctx.strokeStyle = P[1 + j]; ctx.lineWidth = 3; ctx.globalAlpha = f * (1 - e * 0.5); ctx.beginPath(); ctx.arc(x, y, R * (1 - (1 - e) * (1 - e)), 0, TAU); ctx.stroke(); } break;
      case "dome":
        if (u < 0.7) { ctx.globalAlpha = 0.35 * f; ctx.fillStyle = P[1]; ctx.beginPath(); ctx.arc(x, y, R * Math.min(1, u / 0.6), 0, TAU); ctx.fill(); ctx.globalAlpha = f; ctx.strokeStyle = P[3]; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = "#ffffff"; ctx.globalAlpha = 0.6 * f; ctx.fillRect(x - R * 0.4 * Math.min(1, u / 0.6), y - R * 0.5 * Math.min(1, u / 0.6), 5, 3); }
        else if (!A.popped) { A.popped = 1; add("ring", x, y, 0, 0, 0.2, R, "#ffffff", { add: true, grow: 90, len: 2 }); spray(low() ? 6 : 16, x, y, 0, Math.PI, R * 2, R * 3.5, function (vx, vy) { add("px", x + vx * 0.25, y + vy * 0.25, vx, vy, rnd(0.2, 0.35), 2.5, P[3], { add: true, drag: 3 }); }); } break;
      case "sonic":
        ctx.globalCompositeOperation = "lighter";
        for (j = 0; j < 3; j++) { e = Math.max(0, Math.min(1, (A.t - j * 0.07) / 0.32)); if (!e) continue; ctx.strokeStyle = P[2]; ctx.lineWidth = 3 - j * 0.5; ctx.globalAlpha = f * (1 - e * 0.6);
          for (i = 0; i < 4; i++) { a = A.seed + (TAU * i) / 4; ctx.beginPath(); ctx.arc(x, y, R * e, a - 0.5, a + 0.5); ctx.stroke(); } }
        c = mini(r, "note", 9); for (i = 0; i < 4; i++) { a = A.seed + (TAU * i) / 4; stamp(ctx, c, x + Math.cos(a) * R * Math.min(1, A.t / 0.3), y + Math.sin(a) * R * Math.min(1, A.t / 0.3), 0, k, f); } break;
      case "shardring":
        c = img(r, 10, 0); n = 8 + r.grand; rr = u < 0.4 ? R * 0.5 * (u / 0.4) : R * (0.5 + (u - 0.4) * 1.1);
        for (i = 0; i < n; i++) { a = A.seed + (TAU * i) / n + A.t * (u < 0.4 ? 10 : 2); stamp(ctx, c, x + Math.cos(a) * rr, y + Math.sin(a) * rr, a, k, f); } break;
      case "flamering":
        rr = R * e; n = 12;
        for (i = 0; i < n; i++) { a = A.seed + (TAU * i) / n; var fx = x + Math.cos(a) * rr, fy = y + Math.sin(a) * rr * 0.7, h = (14 + 10 * Math.abs(Math.sin(A.t * 30 + i))) * k * f;
          for (j = 0; j < 3; j++) { ctx.fillStyle = P[1 + j]; ctx.fillRect(Math.round(fx - (5 - j * 1.5)), Math.round(fy - h * (1 - j * 0.25)), Math.round(10 - j * 3), Math.round(h * (1 - j * 0.25))); } } break;
      case "tide":
        rr = R * e; ctx.strokeStyle = P[1]; ctx.lineWidth = 7 * f; ctx.beginPath();
        for (i = 0; i <= 40; i++) { a = (TAU * i) / 40; var w = rr + Math.sin(a * 8 + A.t * 20) * 5; ctx[i ? "lineTo" : "moveTo"](x + Math.cos(a) * w, y + Math.sin(a) * w * 0.8); } ctx.stroke();
        ctx.strokeStyle = P[3]; ctx.lineWidth = 2; ctx.stroke(); break;
      case "glyph":
        ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = P[2]; ctx.lineWidth = 2; rr = R * Math.min(1, A.t / 0.15);
        ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, rr * 0.8, 0, TAU); ctx.stroke();
        ctx.strokeStyle = P[3]; ctx.beginPath(); for (i = 0; i <= 6; i++) { a = A.seed + A.t * 3 + (TAU * i * 2) / 6 + (i > 3 ? Math.PI / 6 : 0); ctx[i ? "lineTo" : "moveTo"](x + Math.cos(a) * rr * 0.8, y + Math.sin(a) * rr * 0.8); } ctx.stroke();
        if (u > 0.6 && !A.popped) { A.popped = 1; add("flash", x, y, 0, 0, 0.18, R * 1.4, r.glow, { add: true }); } break;
      case "lightning":
        /* bolts out to the rim, a new shape every other frame */
        ctx.globalCompositeOperation = "lighter"; n = 7 + r.grand;
        for (j = 0; j < 2; j++) { ctx.strokeStyle = j ? "#ffffff" : P[1]; ctx.lineWidth = j ? 1.5 : 5; ctx.beginPath();
          for (i = 0; i < n; i++) { a = A.seed + (TAU * i) / n; ctx.moveTo(x, y); var s2, h2 = Math.floor(A.t * 30); for (s2 = 1; s2 <= 5; s2++) { rr = R * e * s2 / 5; var off = (K().hsh(h2, i * 9 + s2, A.seed) - 0.5) * 0.7; ctx.lineTo(x + Math.cos(a + off) * rr, y + Math.sin(a + off) * rr); } }
          ctx.stroke(); }
        ctx.fillStyle = P[3]; ctx.globalAlpha = f * 0.5; ctx.beginPath(); ctx.arc(x, y, R * 0.25 * (1 - u) + 4, 0, TAU); ctx.fill(); break;
      case "whirl": case "flurry":
        ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = P[2]; ctx.lineWidth = 2; ctx.globalAlpha = f * 0.6;
        for (i = 0; i < 2; i++) { a = A.seed + A.t * 10 + i * Math.PI; ctx.beginPath(); ctx.arc(x, y, R * e * 0.8, a, a + 2); ctx.stroke(); } break;
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }

  /* ---- beams ---- */
  function beamStart(r, e) {
    var len = e.len || 120, wd = e.wd || 16, a = e.a || 0, cx = Math.cos(a), cy = Math.sin(a), i, n, s, B = r.bits, P = r.pal;
    anims.push({ g: "beam", r: r, t: 0, max: r.form === "dash" || r.form === "wedge" ? 0.3 : (r.form === "rake" || r.form === "bite" ? 0.28 : 0.4), x: e.x, y: e.y, a: a, len: len, wd: wd, seed: Math.random() * 99 });
    add("flash", e.x + cx * 10, e.y + cy * 10, 0, 0, 0.12, wd * 1.8, r.glow, { add: true });
    n = Math.round(len / (low() ? 32 : 14));
    for (i = 0; i < n; i++) {
      s = rnd(8, len);
      if (r.form === "stream" || r.form === "jet") add("px", e.x + cx * s, e.y + cy * s, cx * rnd(40, 140) + rnd(-20, 20), cy * rnd(40, 140) + rnd(-30, 10), rnd(0.25, 0.5), rnd(2, 4), pick(B), { add: hard(r), drag: 2 });
      else add("line", e.x + cx * s, e.y + cy * s, -cy * rnd(-120, 120) + cx * 60, cx * rnd(-120, 120) + cy * 60, rnd(0.12, 0.24), 1.5, pick(B), { add: true, len: rnd(5, 10), drag: 3 });
    }
    if (r.form === "dash" || r.form === "wedge") for (i = 0; i < (low() ? 2 : 6); i++) add("smoke", e.x + cx * rnd(0, len), e.y + cy * rnd(0, len) + 6, rnd(-20, 20), -rnd(4, 14), rnd(0.35, 0.6), 5, "#b0a890", { grow: 9, drag: 2 });
    impact(r, e.x + cx * len, e.y + cy * len, a, 0.8);
  }
  function drawBeam(ctx, A, u) {
    var r = A.r, P = r.pal, k = G(r), reach = A.len * Math.min(1, A.t / 0.08), f = u > 0.5 ? Math.max(0, 1 - (u - 0.5) / 0.5) : 1, wd = A.wd * (0.4 + 0.6 * f) * (r.grand ? 1.08 : 1), i, n, x, w, c, j, a, s;
    ctx.save(); ctx.translate(Math.round(A.x), Math.round(A.y)); ctx.rotate(A.a);
    if (!low()) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.45 * f; ctx.drawImage(K().glowSprite(r.glow), -wd, -wd * 1.6, reach + wd * 2, wd * 3.2); ctx.globalCompositeOperation = "source-over"; }
    ctx.globalAlpha = f;
    switch (r.form) {
      case "ray": case "nodes":
        for (j = 0; j < 4; j++) { ctx.fillStyle = P[j]; w = Math.max(2, Math.round(wd * [1, 0.72, 0.45, 0.2][j] * (r.form === "nodes" ? 0.6 : 1))); ctx.fillRect(0, -w / 2, reach, w); }
        if (r.form === "nodes") { ctx.fillStyle = P[3]; for (x = 14; x < reach; x += 22) { s = 4 + (Math.floor(A.t * 30 + x) & 1) * 2; ctx.fillRect(x - s / 2, -s / 2, s, s); } }
        else { ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = P[3]; for (i = 0; i < 4; i++) { x = (A.t * 900 + i * A.len / 4) % A.len; if (x < reach) ctx.fillRect(x, -wd * 0.4, 3, wd * 0.8); } }
        break;
      case "jet": case "stream":
        n = Math.ceil(reach / 4);
        for (j = 0; j < 3; j++) { ctx.fillStyle = P[j + 1]; for (i = 0; i < n; i++) { x = i * 4; w = wd * (r.form === "jet" ? 0.35 + 1.6 * x / A.len : 0.8) * (1 + 0.2 * Math.sin(x * 0.25 - A.t * 46 + j)) * [1, 0.65, 0.3][j] * Math.min(1, (reach - x) / 10); if (w >= 2) ctx.fillRect(x, -w / 2, 4, w); } }
        if (r.form === "stream") { c = img(r, 8, 0); for (i = 0; i < 5; i++) { x = (A.t * 700 + i * A.len / 5) % A.len; if (x < reach) stamp(ctx, c, x, Math.sin(x * 0.1 + i) * wd * 0.3, A.t * 10, 1, f); } }
        break;
      case "dash": case "wedge":
        x = Math.min(reach, A.len * Math.min(1, A.t / 0.16));
        ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = P[2]; ctx.lineWidth = 2;
        ctx.beginPath(); for (i = 0; i < 6; i++) { s = (i - 2.5) * wd * 0.28; ctx.moveTo(Math.max(0, x - 70 - i * 7), s); ctx.lineTo(x - 10, s); } ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
        if (r.form === "wedge") { ctx.fillStyle = P[1]; ctx.beginPath(); ctx.moveTo(x + wd * 0.9 * k, 0); ctx.lineTo(x - wd * 0.5, -wd * 0.75 * k); ctx.lineTo(x - wd * 0.5, wd * 0.75 * k); ctx.fill(); ctx.fillStyle = P[3]; ctx.beginPath(); ctx.moveTo(x + wd * 0.6 * k, 0); ctx.lineTo(x - wd * 0.2, -wd * 0.3); ctx.lineTo(x - wd * 0.2, wd * 0.3); ctx.fill(); }
        c = img(r, Math.min(24, wd * 0.9 * k), 0);
        for (i = 4; i >= 1; i--) stamp(ctx, c, x - i * 12, 0, 0, 1 - i * 0.08, 0.4 - i * 0.08);
        stamp(ctx, c, x, 0, 0, 1.15, f); break;
      case "drill":
        ctx.globalCompositeOperation = "lighter"; ctx.lineWidth = 3;
        for (j = 0; j < 2; j++) { ctx.strokeStyle = P[1 + j * 2]; ctx.beginPath(); for (x = 0; x <= reach; x += 5) { w = wd * 0.5 * (1 - x / (A.len * 1.15)); ctx[x ? "lineTo" : "moveTo"](x, Math.sin(x * 0.28 - A.t * 60 + j * Math.PI) * w); } ctx.stroke(); }
        ctx.fillStyle = P[2]; ctx.beginPath(); ctx.moveTo(reach + 12, 0); ctx.lineTo(reach - 6, -wd * 0.5); ctx.lineTo(reach - 6, wd * 0.5); ctx.fill(); break;
      case "helix":
        ctx.globalCompositeOperation = "lighter";
        for (j = 0; j < 2; j++) { ctx.strokeStyle = P[1 + j]; ctx.lineWidth = 3; ctx.beginPath(); for (x = 0; x <= reach; x += 4) ctx[x ? "lineTo" : "moveTo"](x, Math.sin(x * 0.09 - A.t * 30 + j * Math.PI) * wd * 0.55); ctx.stroke(); }
        ctx.fillStyle = P[3]; for (x = 0; x < reach; x += 18) { if (Math.abs(Math.sin(x * 0.09 - A.t * 30)) < 0.3) ctx.fillRect(x - 2, -2, 4, 4); } break;
      case "rings":
        ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = P[1]; ctx.fillRect(0, -2, reach, 4);
        for (i = 0; i < 6; i++) { x = (A.t * 500 + i * A.len / 6) % A.len; if (x > reach) continue; ctx.strokeStyle = i % 2 ? P[2] : P[3]; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, 0, 4, wd * 0.5 * (0.6 + x / A.len * 0.6), 0, 0, TAU); ctx.stroke(); } break;
      case "wave":
        for (j = 0; j < 3; j++) { ctx.strokeStyle = P[j + 1]; ctx.lineWidth = Math.max(1.5, wd * [0.6, 0.35, 0.15][j]); ctx.beginPath(); for (x = 0; x <= reach; x += 4) ctx[x ? "lineTo" : "moveTo"](x, Math.sin(x * 0.06 - A.t * 26) * wd * 0.5); ctx.stroke(); } break;
      case "rake":
        ctx.globalCompositeOperation = "lighter";
        for (j = -1; j <= 1; j++) { ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, j * wd * 0.35); ctx.lineTo(reach, j * wd * 0.35 + Math.sin(j) * 4); ctx.stroke(); ctx.strokeStyle = P[1]; ctx.lineWidth = 6; ctx.globalAlpha = f * 0.5; ctx.stroke(); ctx.globalAlpha = f; } break;
      case "bolt":
        ctx.globalCompositeOperation = "lighter";
        for (j = 0; j < 2; j++) { ctx.strokeStyle = j ? "#ffffff" : P[1]; ctx.lineWidth = j ? 2 : 6; ctx.beginPath(); ctx.moveTo(0, 0); for (x = 12; x < reach; x += 12) ctx.lineTo(x, (K().hsh(Math.floor(A.t * 30), x, A.seed) - 0.5) * wd); ctx.lineTo(reach, 0); ctx.stroke(); } break;
      case "bite":
        x = reach; s = Math.min(1, A.t / 0.16) * 0.9; c = Math.round(wd * 0.9 * k);
        for (j = -1; j <= 1; j += 2) { ctx.fillStyle = P[1]; ctx.beginPath(); ctx.ellipse(x - c * 0.3, j * c * (1 - s) * 0.7, c, c * 0.45, 0, j > 0 ? 0 : Math.PI, j > 0 ? Math.PI : TAU); ctx.fill();
          ctx.fillStyle = "#ffffff"; for (i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x - c + i * c * 0.5, j * c * (1 - s) * 0.7); ctx.lineTo(x - c + i * c * 0.5 + c * 0.22, j * c * (1 - s) * 0.7 - j * c * 0.35); ctx.lineTo(x - c + i * c * 0.5 + c * 0.44, j * c * (1 - s) * 0.7); ctx.fill(); } } break;
    }
    ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }

  /* ---- chains ---- */
  function drawChain(ctx, A, u) {
    var r = A.r, P = r.pal, n = A.pts.length / 2 - 1, f = u > 0.55 ? Math.max(0, 1 - (u - 0.55) / 0.45) : 1, j, s, x0, y0, x1, y1, dx, dy, d, nx, ny, steps, off, px, py, pass, fr = Math.floor(A.t * 30), c;
    ctx.globalCompositeOperation = "lighter"; ctx.lineJoin = "round";
    var shape = r.form;
    for (pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? P[3] : P[1]; ctx.lineWidth = (shape === "thread" ? 1 : (pass ? 2 : 6)); ctx.globalAlpha = (pass ? 1 : 0.6) * f;
      if (shape === "beads" || shape === "notes" || shape === "fish" || shape === "links") break;
      ctx.beginPath();
      for (j = 0; j < n; j++) {
        if (A.t < j * 0.045) break;
        x0 = A.pts[j * 2]; y0 = A.pts[j * 2 + 1]; x1 = A.pts[j * 2 + 2]; y1 = A.pts[j * 2 + 3]; dx = x1 - x0; dy = y1 - y0; d = Math.sqrt(dx * dx + dy * dy) || 1; nx = -dy / d; ny = dx / d;
        steps = Math.max(2, Math.round(d / 12)); ctx.moveTo(x0, y0);
        for (s = 1; s < steps; s++) {
          var q = s / steps;
          off = shape === "zig" || shape === "fork" ? (K().hsh(fr, j * 7 + s, A.seed) - 0.5) * Math.min(22, d * 0.3) : (shape === "vine" || shape === "ribbon" ? Math.sin(q * Math.PI * 3 - A.t * 30 + j) * Math.min(12, d * 0.18) : (shape === "arc" ? -Math.sin(q * Math.PI) * d * 0.35 : 0));
          px = x0 + dx * q + nx * off; py = y0 + dy * q + ny * off + (shape === "arc" ? -Math.sin(q * Math.PI) * d * 0.25 : 0); ctx.lineTo(px, py);
        }
        ctx.lineTo(x1, y1);
        if (shape === "fork" && pass) { ctx.moveTo(x0 + dx * 0.5, y0 + dy * 0.5); ctx.lineTo(x0 + dx * 0.5 + nx * 16, y0 + dy * 0.5 + ny * 16); }
      }
      ctx.stroke();
    }
    /* things that travel the chain instead of a line */
    if (shape === "beads" || shape === "notes" || shape === "fish" || shape === "links") {
      c = shape === "notes" ? mini(r, "note", 9) : (shape === "fish" ? mini(r, "fish", 10) : img(r, 7, 0));
      for (j = 0; j < n; j++) {
        if (A.t < j * 0.045) break;
        x0 = A.pts[j * 2]; y0 = A.pts[j * 2 + 1]; x1 = A.pts[j * 2 + 2]; y1 = A.pts[j * 2 + 3];
        for (s = 0; s < 5; s++) { var q2 = (s / 5 + A.t * 3) % 1; ctx.globalCompositeOperation = "source-over";
          if (shape === "links") { ctx.strokeStyle = s % 2 ? P[2] : P[1]; ctx.lineWidth = 2; ctx.globalAlpha = f; ctx.beginPath(); ctx.ellipse(x0 + (x1 - x0) * s / 5, y0 + (y1 - y0) * s / 5, 5, 3, Math.atan2(y1 - y0, x1 - x0) + (s % 2 ? 1.57 : 0), 0, TAU); ctx.stroke(); }
          else stamp(ctx, c, x0 + (x1 - x0) * q2, y0 + (y1 - y0) * q2 - (shape === "fish" ? Math.sin(q2 * Math.PI) * 18 : 0), shape === "fish" ? Math.atan2(y1 - y0, x1 - x0) : 0, 1, f); }
      }
    }
    /* each enemy it reaches */
    ctx.globalCompositeOperation = "source-over";
    for (j = 1; j <= n; j++) {
      if (A.t < (j - 1) * 0.045) break;
      if (shape === "slash") { ctx.strokeStyle = P[3]; ctx.lineWidth = 3; ctx.globalAlpha = f; ctx.beginPath(); ctx.moveTo(A.pts[j * 2] - 12, A.pts[j * 2 + 1] - 12); ctx.lineTo(A.pts[j * 2] + 12, A.pts[j * 2 + 1] + 12); ctx.moveTo(A.pts[j * 2] + 12, A.pts[j * 2 + 1] - 12); ctx.lineTo(A.pts[j * 2] - 12, A.pts[j * 2 + 1] + 12); ctx.stroke(); }
      else stamp(ctx, img(r, 8, fr & 1), A.pts[j * 2], A.pts[j * 2 + 1], A.t * 6 + j, 1, f);
    }
    ctx.globalAlpha = 1;
  }

  /* ---- strikes: on the way, then landing (boom) ---- */
  function drawDrop(ctx, A, u) {
    var r = A.r, P = r.pal, R = A.R, k = G(r), c, i, yy, xx, a, h;
    /* the spot it's coming down on: a shadow and a sign that differs by form */
    ctx.globalAlpha = 0.12 + 0.18 * u; ctx.fillStyle = "#06080f"; ctx.beginPath(); ctx.ellipse(A.x, A.y + 2, R * (0.3 + 0.5 * u), R * (0.2 + 0.3 * u), 0, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.35 + 0.55 * u; ctx.strokeStyle = P[2]; ctx.lineWidth = 2;
    if (r.form === "pillar" || r.form === "sword") { ctx.beginPath(); ctx.ellipse(A.x, A.y, R * 0.8, R * 0.5, 0, 0, TAU); ctx.stroke(); ctx.fillStyle = P[2]; ctx.globalAlpha = 0.15 * u; ctx.fillRect(A.x - R * 0.3, A.y - 260, R * 0.6, 260); }
    else if (r.form === "bomb") { ctx.beginPath(); ctx.arc(A.x, A.y, R * (1.2 - 0.4 * u), 0, TAU); ctx.moveTo(A.x - R, A.y); ctx.lineTo(A.x + R, A.y); ctx.moveTo(A.x, A.y - R * 0.7); ctx.lineTo(A.x, A.y + R * 0.7); ctx.stroke(); }
    else { for (i = 0; i < 10; i++) { a = A.t * 4 + (TAU * i) / 10; ctx.fillStyle = i % 3 ? P[1] : P[3]; ctx.fillRect(Math.round(A.x + Math.cos(a) * R * (1.25 - 0.3 * u)) - 2, Math.round(A.y + Math.sin(a) * R * 0.7 * (1.25 - 0.3 * u)) - 2, 4, 4); } }
    ctx.globalCompositeOperation = "source-over";
    if (A.up) {
      /* the ground getting ready to give */
      ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = P[2]; ctx.globalAlpha = 0.25 + 0.7 * u;
      for (i = 0; i < 5; i++) { a = K().hsh(i, 3, R) * TAU; h = R * 0.55 * u * (0.5 + K().hsh(i, 9, R)); ctx.fillRect(Math.round(A.x + Math.cos(a) * h * 0.5) - 1, Math.round(A.y + Math.sin(a) * h * 0.36) - 1, Math.round(Math.abs(Math.cos(a)) * h) + 2, 2); }
      if (Math.random() < 0.4) add("px", A.x + rnd(-R, R) * 0.5, A.y, rnd(-10, 10), -rnd(40, 90), 0.25, 2.5, P[1], { grav: 400 });
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; return;
    }
    c = img(r, Math.max(12, Math.min(26, R * 0.45 * k)), Math.floor(A.t * 14) & 1);
    ctx.globalAlpha = 1;
    switch (r.form) {
      case "rain":
        for (i = 0; i < 4 + r.grand; i++) { a = A.seed + i * 2.3; xx = A.x + Math.cos(a) * R * 0.6 * K().hsh(i, 1, A.seed); yy = A.y + Math.sin(a) * R * 0.3 - 220 * (1 - Math.min(1, u * (1.1 + i * 0.05)) * Math.min(1, u * (1.1 + i * 0.05)));
          stamp(ctx, img(r, 9, 0), xx, yy, Math.PI / 2, 1, 0.95); if (Math.random() < 0.3) trail(r, xx, yy, 0, 400, 5, false); } break;
      case "meteor": case "dive":
        h = (1 - u * u); xx = A.x - (r.form === "dive" ? 160 : 110) * h * (A.sx > 0 ? 1 : -1); yy = A.y - 200 * h; a = Math.atan2(A.y - yy, A.x - xx);
        glow(ctx, xx, yy, c.width * 1.6, c.width * 1.6, r.glow, 0.7);
        for (i = 5; i >= 1; i--) stamp(ctx, c, xx - Math.cos(a) * i * 12, yy - Math.sin(a) * i * 12, a, 1 - i * 0.1, 0.4 - i * 0.06);
        stamp(ctx, c, xx, yy, r.upright ? 0 : a, r.form === "meteor" ? 1.3 : 1, 1);
        trail(r, xx, yy, Math.cos(a) * 400, Math.sin(a) * 400, 9, true); break;
      case "stomp":
        yy = A.y - 230 * (1 - u * u); stamp(ctx, c, A.x, yy, 0, 1.5 * (0.6 + 0.4 * u), 1); break;
      case "pillar":
        if (u > 0.6) { ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = P[3]; ctx.globalAlpha = (u - 0.6) * 2; ctx.fillRect(A.x - 3, A.y - 260, 6, 260); ctx.globalCompositeOperation = "source-over"; } break;
      case "bomb":
        yy = A.y - 200 * (1 - u * u); stamp(ctx, c, A.x, yy, Math.PI / 2 + Math.sin(A.t * 20) * 0.1, 1, 1);
        if (Math.floor(A.t * 16) & 1) { ctx.fillStyle = "#ff3a2a"; ctx.fillRect(A.x - 2, yy - c.height / 2 - 4, 4, 4); } break;
      default:
        yy = A.y - 190 * (1 - u * u); glow(ctx, A.x, yy, c.width * 1.3, c.width * 1.6, r.glow, 0.6);
        for (i = 3; i >= 1; i--) stamp(ctx, c, A.x, yy - i * 13 * (0.4 + u), r.upright ? 0 : A.t * 8, 1 - i * 0.12, 0.3 - i * 0.07);
        stamp(ctx, c, A.x, yy, r.upright ? 0 : A.t * 8, 1, 1);
    }
    ctx.globalAlpha = 1;
  }
  function boom(r, e) {
    var x = e.x, y = e.y, R = Math.max(24, e.r || 40), k = G(r), P = r.pal, B = r.bits, i, j, n = low() ? 6 : 16;
    if (r.type === "mine") { trapPop(r, x, y, R); impact(r, x, y, -Math.PI / 2, 1.3); return; }
    if (r.type !== "strike") { impact(r, x, y, e.a || 0, 1.4); return; }
    add("flash", x, y, 0, 0, 0.18, R * 1.6, r.glow, { add: true });
    switch (r.form) {
      case "meteor": case "stomp": case "bomb":
        add("ring", x, y, 0, 0, 0.35, R * 0.3, P[2], { add: true, grow: R * 3.2, len: 5 });
        if (r.form !== "meteor") anims.push({ g: "burst", r: { id: r.id, pal: P, glow: r.glow, bits: B, form: "quake", grand: r.grand, fam: r.fam }, t: 0, max: 0.6, x: x, y: y, R: R * 1.1, seed: Math.random() * TAU });
        if (r.form === "bomb") K().boom({ look: { pal: P, glow: r.glow, bits: B }, fam: r.fam, tier: r.tier || 2, key: "S_" + r.id }, x, y, 0, R);
        break;
      case "rain":
        for (i = 0; i < 4 + r.grand; i++) { j = i * 2.3 + rnd(0, 1); add("ring", x + Math.cos(j) * R * 0.5, y + Math.sin(j) * R * 0.3, 0, 0, 0.25, 2, P[2], { add: true, grow: R * 1.4, len: 2 }); } break;
      case "dive":
        add("line", x + 30, y - 30, 0.01, -0.01, 0.18, 4, "#ffffff", { add: true, len: 60 * k }); add("ring", x, y, 0, 0, 0.3, 4, P[2], { add: true, grow: R * 2.4, len: 3 }); break;
      case "pillar": case "sword": case "geyser": case "erupt": case "spikes": case "vines": case "crystal":
        anims.push({ g: "rise", r: r, t: 0, max: r.form === "pillar" ? 0.55 : 0.5, x: x, y: y, R: R, seed: Math.random() * 99 });
        spray(n, x, y, -Math.PI / 2, 0.7, 130, 330, function (vx, vy) { add("px", x + rnd(-R, R) * 0.4, y, vx, vy, rnd(0.45, 0.85), rnd(2.5, 5), pick(B), { add: hard(r) && r.fam !== "water", grav: 520 }); }); break;
      default:
        add("ring", x, y, 0, 0, 0.3, R * 0.3, P[2], { add: true, grow: R * 3, len: 4 });
    }
    impact(r, x, y, -Math.PI / 2, 1.2);
  }
  function drawRise(ctx, A, u) {
    var r = A.r, P = r.pal, R = A.R, k = u < 0.2 ? u / 0.2 : (u > 0.7 ? Math.max(0, 1 - (u - 0.7) / 0.3) : 1), i, j, h, x, y, w, c, a, G0 = G(r);
    switch (r.form) {
      case "pillar": case "geyser": case "erupt":
        h = R * (r.form === "pillar" ? 4 : 2.6) * Math.min(1, A.t / 0.1) * G0;
        glow(ctx, A.x, A.y - h * 0.5, R * 1.2, h * 0.9, r.glow, 0.55 * k);
        for (j = 0; j < 4; j++) { ctx.fillStyle = P[j]; ctx.globalAlpha = k; for (y = 0; y < h; y += 4) { w = R * (r.form === "pillar" ? 0.6 : 0.85) * (1 - 0.5 * y / h) * [1, 0.76, 0.48, 0.2][j] * (1 + 0.16 * Math.sin(y * 0.3 - A.t * 40 + j)); if (w >= 2) ctx.fillRect(Math.round(A.x - w / 2 + (r.form === "geyser" ? Math.sin(y * 0.1 + A.t * 20) * 3 : 0)), Math.round(A.y - y - 4), Math.round(w), 4); } }
        if (r.form === "erupt" && Math.random() < 0.5) add("img", A.x + rnd(-R, R) * 0.3, A.y - h * rnd(0.3, 0.9), rnd(-120, 120), -rnd(80, 220), rnd(0.5, 0.8), rnd(6, 9), null, { img: mini(r, "rock", 5), rot: rnd(0, TAU), spin: 8, grav: 600 });
        break;
      case "spikes": case "crystal": case "sword":
        c = r.form === "sword" ? img(r, 22 * G0, 0) : (r.form === "crystal" ? mini(r, "gem", 16) : img(r, 16, 0));
        for (i = 0; i < (r.form === "sword" ? 1 : 5); i++) { x = A.x + (r.form === "sword" ? 0 : (i - 2) * R * 0.32); h = (r.form === "sword" ? R * 2.2 : R * (1 + 0.6 * K().hsh(i, 2, A.seed)) * (i === 2 ? 1.3 : 1)) * k * G0;
          ctx.save(); ctx.translate(Math.round(x), Math.round(A.y - h * 0.5)); ctx.rotate(-Math.PI / 2 + (r.form === "sword" ? 0 : (i - 2) * 0.18)); ctx.globalAlpha = 1; ctx.drawImage(c, -h / 2, -c.height * (h / c.width) / 2, h, c.height * (h / c.width)); ctx.restore(); } break;
      case "vines":
        ctx.lineWidth = 4;
        for (i = 0; i < 4; i++) { ctx.strokeStyle = i % 2 ? P[1] : P[0]; ctx.globalAlpha = k; ctx.beginPath(); h = R * 2.2 * Math.min(1, A.t / 0.2) * G0; x = A.x + (i - 1.5) * R * 0.3;
          for (y = 0; y <= h; y += 6) ctx[y ? "lineTo" : "moveTo"](x + Math.sin(y * 0.08 + i * 2 + A.t * 6) * 10, A.y - y); ctx.stroke();
          stamp(ctx, mini(r, "leaf", 7), x + Math.sin(h * 0.08 + i * 2 + A.t * 6) * 10, A.y - h, A.t * 4 + i, 1, k); } break;
    }
    ctx.globalAlpha = 1;
  }
  /* a trap going off: a little burst of its own kind */
  function trapPop(r, x, y, R) {
    var f = { bud: "bloom", web: "dome", crystal: "shardring", pit: "quake", coals: "flamering", rune: "glyph", eye: "vortex", spores: "whirl", snowdrift: "whirl", bubble: "dome", puddle: "tide", charm: "nova", paw: "triple", caltrops: "spikes", bomb: "nova", mark: "blocks" }[r.form] || "blocks";
    anims.push({ g: "burst", r: { id: r.id, pal: r.pal, glow: r.glow, bits: r.bits, form: f, grand: r.grand, fam: r.fam, motif: r.motif }, t: 0, max: 0.45, x: x, y: y, R: R * 0.9, seed: Math.random() * TAU });
    if (r.form === "spores") spray(10, x, y, 0, Math.PI, 30, 80, function (vx, vy) { add("smoke", x, y, vx, vy, rnd(0.6, 1), 7, pick(r.bits), { grow: 14, drag: 2 }); });
    if (r.form === "bomb") K().boom({ look: { pal: r.pal, glow: r.glow, bits: r.bits }, fam: r.fam, tier: r.tier || 2, key: "S_" + r.id }, x, y, 0, R);
  }

  function update(dt) {
    var i, A, n, j;
    for (i = anims.length - 1; i >= 0; i--) {
      A = anims[i]; A.t += dt;
      if (A.g === "burst" && (A.r.form === "vortex" || A.r.form === "whirl") && !low()) { n = rate(40); for (j = 0; j < n; j++) { var a = rnd(0, TAU), d = A.R * rnd(0.4, 1); add("px", A.x + Math.cos(a) * d, A.y + Math.sin(a) * d, -Math.sin(a) * 160 - Math.cos(a) * 40, Math.cos(a) * 160 - Math.sin(a) * 40, 0.25, 2, pick(A.r.bits), { add: true }); } }
      if (A.g === "chain") {
        n = A.pts.length / 2 - 1;
        while (A.done < n && A.t >= A.done * 0.045) { A.done++; j = A.done * 2; impact(A.r, A.pts[j], A.pts[j + 1], 0, 0.6); }
      }
      if (A.t >= A.max) anims.splice(i, 1);
    }
  }
  function draw(ctx) {
    var i, A, u;
    if (!anims.length || SF.dbgNoAnims) return;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    for (i = 0; i < anims.length; i++) {
      A = anims[i]; u = Math.min(1, A.t / A.max);
      if (A.g === "burst") drawBurst(ctx, A, u);
      else if (A.g === "beam") drawBeam(ctx, A, u);
      else if (A.g === "chain") drawChain(ctx, A, u);
      else if (A.g === "drop") drawDrop(ctx, A, u);
      else if (A.g === "rise") drawRise(ctx, A, u);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    }
    ctx.restore();
  }

  SF.event = event; SF.drawShot = drawShot; SF.update = update; SF.draw = draw; SF.clear = function () { anims.length = 0; }; SF.count = function () { return anims.length; };
})(typeof window !== "undefined" ? window : this);
