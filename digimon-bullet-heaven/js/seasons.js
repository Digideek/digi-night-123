/* Digimon Bullet Heaven — seasons.
 *
 * Battle time runs through Spring → Summer → Fall → Winter, `lengthSec`
 * each (6 minutes), then loops to Spring of the next year. Every season
 * that passes makes the field harder (enemy HP, damage, speed, spawn rate
 * and cap), with a little more XP to keep pace. The clock is battle time
 * only (sim.time / run.time), so farm visits and brawls do not advance it.
 *
 * Difficulty is folded into weather.liveMods(), so every path that already
 * applies weather (authority sim and offline fallback) picks it up.
 * Visuals: terrain + prop recolors (world.js / sprites.js) and ambient
 * screen particles (petals, pollen, leaves, snow) drawn here.
 */
(function (global) {
  "use strict";

  var D = global.DBH = global.DBH || {};

  var CFG = {
    lengthSec: 360,
    order: ["spring", "summer", "fall", "winter"],
    labels: { spring: "Spring", summer: "Summer", fall: "Fall", winter: "Winter" },
    /* Per season passed (Year 1 Spring = 0, Year 1 Summer = 1, …). */
    step: {
      enemyHpMul: 0.20,
      enemyAtkMul: 0.10,
      enemySpdMul: 0.02,
      spawnMul: 0.10,
      capMul: 0.08,
      xpMul: 0.08
    },
    max: {
      enemySpdMul: 1.25,
      spawnMul: 2.6,
      capMul: 2.2
    }
  };

  function info(time) {
    var t = Math.max(0, time || 0);
    var len = CFG.lengthSec;
    var index = Math.floor(t / len);
    var s = index % 4;
    var id = CFG.order[s];
    return {
      index: index,
      year: Math.floor(index / 4) + 1,
      seasonIndex: s,
      id: id,
      label: CFG.labels[id],
      progress: (t - index * len) / len,
      left: len - (t - index * len)
    };
  }

  function mods(time) {
    var i = info(time).index;
    var st = CFG.step, mx = CFG.max;
    return {
      index: i,
      enemyHpMul: 1 + st.enemyHpMul * i,
      enemyAtkMul: 1 + st.enemyAtkMul * i,
      enemySpdMul: Math.min(mx.enemySpdMul, 1 + st.enemySpdMul * i),
      spawnMul: Math.min(mx.spawnMul, 1 + st.spawnMul * i),
      capMul: Math.min(mx.capMul, 1 + st.capMul * i),
      xpMul: 1 + st.xpMul * i
    };
  }

  /* ---------- Day and night ----------
   * One day is `DAY.lengthSec` of battle time (two days a season), on the
   * same clock the rest of the game already keeps (rarity.js DAY_SECONDS):
   * dawn, morning, midday, dusk, then night for the last quarter. `dark`
   * is 0 by day and 1 in full night, easing over dusk and dawn. After dark
   * the field is faster, notices you from further off and bites more often
   * (DAY.night), all scaled by `dark` so it comes on with the light. */
  var CLOCK = D.dayClock || (typeof module !== "undefined" && module.exports ? require("./day-clock.js") : { DAY_SECONDS: 180, DUSK_AT: 0.58, NIGHT_AT: 0.76 });
  var DAY = {
    lengthSec: CLOCK.DAY_SECONDS,
    duskAt: CLOCK.DUSK_AT, nightAt: CLOCK.NIGHT_AT, dawnEnd: 0.10,
    night: { enemySpdMul: 0.15, aggroMul: 0.5, atkRateMul: 0.25 },
    labels: { dawn: "Dawn", day: "Day", dusk: "Dusk", night: "Night" }
  };
  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function dayInfo(time) {
    var c = (Math.max(0, time || 0) / DAY.lengthSec) % 1, dark, dusk, dawn, id;
    /* dark comes on through the back half of dusk and lifts just before the day turns over */
    dark = smooth(DAY.nightAt - 0.08, DAY.nightAt + 0.02, c) * (1 - smooth(0.93, 1, c));
    dusk = smooth(DAY.duskAt, DAY.duskAt + 0.08, c) * (1 - smooth(DAY.nightAt - 0.05, DAY.nightAt + 0.02, c));
    dawn = c > 0.9 ? smooth(0.9, 0.98, c) : 1 - smooth(0, DAY.dawnEnd, c);
    id = dark > 0.5 ? "night" : (c >= DAY.duskAt && c < DAY.nightAt ? "dusk" : ((c < DAY.dawnEnd || c > 0.9) ? "dawn" : "day"));
    return { cycle: c, dark: dark, dusk: dusk, dawn: dawn, id: id, label: DAY.labels[id], day: Math.floor(Math.max(0, time || 0) / DAY.lengthSec) + 1 };
  }
  function darkOf(store) {
    if (!store) return 0;
    var t = store.time;
    if (t == null && store.run) t = store.run.time;
    return dayInfo(t || 0).dark;
  }
  /* how far off an idle pack notices you, and how fast bites come round */
  function aggroScale(store) { return 1 + DAY.night.aggroMul * darkOf(store); }
  function atkRateScale(store) { return 1 + DAY.night.atkRateMul * darkOf(store); }

  /* Multiply a weather mods object by the current season's difficulty. */
  function applyTo(m, store) {
    if (!m || !store) return m;
    var t = store.time;
    if (t == null && store.run) t = store.run.time;
    var s = mods(t || 0), dark = dayInfo(t || 0).dark;
    if (s.index <= 0 && dark <= 0) return m;
    var out = {}, k;
    for (k in m) if (Object.prototype.hasOwnProperty.call(m, k)) out[k] = m[k];
    if (dark > 0) { out.enemySpdMul = (out.enemySpdMul || 1) * (1 + DAY.night.enemySpdMul * dark); out.dark = dark; }
    if (s.index <= 0) return out;
    m = out; out = {};
    for (k in m) if (Object.prototype.hasOwnProperty.call(m, k)) out[k] = m[k];
    out.enemyHpMul = (m.enemyHpMul || 1) * s.enemyHpMul;
    out.enemyAtkMul = (m.enemyAtkMul || 1) * s.enemyAtkMul;
    out.enemySpdMul = (m.enemySpdMul || 1) * s.enemySpdMul;
    out.spawnMul = (m.spawnMul || 1) * s.spawnMul;
    out.capMul = (m.capMul || 1) * s.capMul;
    out.xpMul = (m.xpMul || 1) * s.xpMul;
    return out;
  }

  /* ---------- Colors ---------- */
  function parse(c) {
    if (!c) return [0, 0, 0];
    if (c.charAt(0) !== "#") {
      var m = c.match(/rgba?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)/);
      return m ? [+m[1], +m[2], +m[3]] : [0, 0, 0];
    }
    c = c.slice(1);
    if (c.length === 3) c = c.charAt(0) + c.charAt(0) + c.charAt(1) + c.charAt(1) + c.charAt(2) + c.charAt(2);
    return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)];
  }
  function hex(r, g, b) {
    function h(v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? "0" : "") + v.toString(16); }
    return "#" + h(r) + h(g) + h(b);
  }
  function mix(a, b, t) {
    var x = parse(a), y = parse(b);
    return hex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
  }
  function lum(c) { var p = parse(c); return (p[0] * 0.3 + p[1] * 0.59 + p[2] * 0.11) / 255; }

  /* Ground recolor. `kind`: grass | path | water | cliff. `n` is a 0..1
   * per-pixel hash for patchy variation. */
  function ground(col, kind, season, n) {
    if (!season || season === "spring") {
      if (kind === "grass") return mix(col, "#5c9a40", 0.18);
      return col;
    }
    var L = lum(col);
    if (season === "summer") {
      if (kind === "grass") return mix(col, "#86a83a", 0.30);
      if (kind === "path") return mix(col, "#b08850", 0.18);
      if (kind === "cliff") return mix(col, "#a8b860", 0.20);
      return mix(col, "#38b0c0", 0.15);
    }
    if (season === "fall") {
      if (kind === "grass") {
        var leaf = n > 0.82 ? "#c84a20" : (n > 0.55 ? "#d88a2c" : (n > 0.25 ? "#a8702c" : "#8a6a30"));
        return mix(col, leaf, 0.55);
      }
      if (kind === "path") return mix(col, "#7a5434", 0.25);
      if (kind === "cliff") return mix(col, "#b8782c", 0.45);
      return mix(col, "#2a5868", 0.25);
    }
    /* winter */
    if (kind === "grass") {
      if (n > 0.975) return mix(col, "#8aa090", 0.35);
      return mix("#e4eef4", "#b8cad8", Math.max(0, 0.5 - L) * 0.9 + n * 0.25);
    }
    if (kind === "path") return mix(col, n > 0.5 ? "#c8d4de" : "#9aa8b4", 0.55);
    if (kind === "cliff") return mix(col, "#eef4f8", 0.72);
    return mix(col, "#b0dcec", 0.62);
  }

  /* Recolor a baked prop canvas (tree, bush, tall grass, flower, rock). */
  function recolorProp(src, kind, season) {
    if (!src || !season || season === "summer") return src;
    var c = document.createElement("canvas");
    c.width = src.width; c.height = src.height;
    var g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0);
    var img;
    try { img = g.getImageData(0, 0, c.width, c.height); } catch (e) { return src; }
    var d = img.data, w = c.width, h = c.height, x, y, i, r, gg, b, a, above, green, hsh, L;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        i = (y * w + x) * 4;
        a = d[i + 3];
        if (a < 10) continue;
        r = d[i]; gg = d[i + 1]; b = d[i + 2];
        green = gg > r + 8 && gg > b;
        /* "Open sky" above: transparent, or the dark ink outline. */
        above = 0;
        if (y >= 3) {
          var j = ((y - 3) * w + x) * 4;
          var inkAbove = (d[j] * 0.3 + d[j + 1] * 0.59 + d[j + 2] * 0.11) < 40;
          above = (d[j + 3] < 10 || inkAbove) ? 0 : 255;
        }
        hsh = ((x * 73856093) ^ (y * 19349663)) >>> 0;
        hsh = (hsh % 1000) / 1000;
        L = (r * 0.3 + gg * 0.59 + b * 0.11) / 255;
        if (season === "fall" && green) {
          var o = hsh > 0.7 ? [200, 70, 30] : (hsh > 0.35 ? [222, 138, 44] : [196, 160, 52]);
          d[i] = o[0] * (0.55 + L * 0.8); d[i + 1] = o[1] * (0.55 + L * 0.8); d[i + 2] = o[2] * (0.55 + L * 0.8);
        } else if (season === "winter") {
          if (above < 10 && (green || kind === "rock" || kind === "monolith" || kind === "shrine")) {
            d[i] = 236; d[i + 1] = 244; d[i + 2] = 250;
          } else if (green) {
            d[i] = r * 0.5 + 70; d[i + 1] = gg * 0.55 + 70; d[i + 2] = b * 0.55 + 96;
          }
        } else if (season === "spring" && green) {
          if ((kind === "tree" || kind === 0) && hsh > 0.86) { d[i] = 246; d[i + 1] = 168; d[i + 2] = 200; }
          else { d[i] = r * 0.92; d[i + 1] = Math.min(255, gg * 1.08 + 6); d[i + 2] = b * 0.9; }
        }
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  /* The WebGL layer blends with ONE / ONE_MINUS_SRC_ALPHA on straight
   * colors, so a translucent fill adds its full RGB. Pre-multiply here. */
  function rgba(ctx, col, a) {
    var p = parse(col);
    if (ctx && ctx.isWebGL) return "rgba(" + Math.round(p[0] * a) + "," + Math.round(p[1] * a) + "," + Math.round(p[2] * a) + "," + a.toFixed(3) + ")";
    return "rgba(" + p[0] + "," + p[1] + "," + p[2] + "," + a.toFixed(3) + ")";
  }

  /* ---------- Ambient particles (screen space) ---------- */
  var parts = [];
  var partSeason = null;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function spawnPart(season, w, h, anywhere) {
    var p = { x: rnd(-20, w + 20), y: anywhere ? rnd(-20, h) : rnd(-40, -8), t: rnd(0, 10), life: 0 };
    if (season === "winter") { p.vx = rnd(-14, 6); p.vy = rnd(28, 60); p.s = Math.random() < 0.25 ? 3 : 2; p.c = "#ffffff"; p.a = rnd(0.55, 0.9); }
    else if (season === "fall") { p.vx = rnd(-30, -6); p.vy = rnd(24, 46); p.s = 3; p.c = ["#d8742c", "#c84a20", "#e0a83a"][(Math.random() * 3) | 0]; p.a = 0.85; }
    else if (season === "spring") { p.vx = rnd(-20, 14); p.vy = rnd(14, 30); p.s = 3; p.c = Math.random() < 0.5 ? "#ffc0d8" : "#ffe4f0"; p.a = 0.8; }
    else { p.x = rnd(0, w); p.y = rnd(0, h); p.vx = rnd(-6, 6); p.vy = rnd(-8, -2); p.s = 2; p.c = "#fff2a0"; p.a = 0; p.max = rnd(3, 6); }
    return p;
  }
  function density(season, reduced) {
    var n = season === "winter" ? 70 : season === "fall" ? 26 : season === "spring" ? 22 : 14;
    return reduced ? Math.ceil(n * 0.35) : n;
  }
  function drawAmbient(ctx, w, h, season, dt, reduced) {
    if (!ctx || !season) return;
    if (partSeason !== season) { parts = []; partSeason = season; }
    var want = density(season, reduced), i, p, sway;
    while (parts.length < want) parts.push(spawnPart(season, w, h, true));
    ctx.save();
    for (i = parts.length - 1; i >= 0; i--) {
      p = parts[i];
      p.t += dt; p.life += dt;
      sway = Math.sin(p.t * (season === "fall" ? 2.2 : 1.4)) * (season === "fall" ? 26 : 12);
      p.x += (p.vx + sway * 0.6) * dt;
      p.y += p.vy * dt;
      var al;
      if (season === "summer") {
        var fa = p.life < 1 ? p.life : (p.life > p.max - 1 ? Math.max(0, p.max - p.life) : 1);
        al = 0.55 * fa * (0.6 + 0.4 * Math.sin(p.t * 5));
        if (p.life > p.max) { parts[i] = spawnPart(season, w, h, true); continue; }
      } else {
        al = p.a;
        if (p.y > h + 12 || p.x < -40 || p.x > w + 40) { parts[i] = spawnPart(season, w, h, false); continue; }
      }
      if (al <= 0.01) continue;
      ctx.globalAlpha = 1;
      ctx.fillStyle = rgba(ctx, p.c, Math.min(1, al));
      if (season === "fall") {
        var flip = Math.abs(Math.sin(p.t * 3));
        ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.max(1, Math.round(p.s * 1.6 * flip)) , p.s);
      } else {
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* Soft full-screen color grade per season. */
  var GRADE = {
    spring: null,
    summer: ["#ffdc78", 0.06],
    fall: ["#c86e28", 0.08],
    winter: ["#aac8eb", 0.10]
  };
  function drawGrade(ctx, w, h, season) {
    var g = GRADE[season];
    if (!g) return;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = rgba(ctx, g[0], g[1]);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  D.SEASONS_CFG = CFG;
  D.seasons = {
    CFG: CFG,
    info: info,
    mods: mods,
    applyTo: applyTo,
    DAY: DAY,
    dayInfo: dayInfo,
    darkOf: darkOf,
    aggroScale: aggroScale,
    atkRateScale: atkRateScale,
    ground: ground,
    recolorProp: recolorProp,
    drawAmbient: drawAmbient,
    drawGrade: drawGrade,
    rgba: rgba,
    mix: mix
  };
  if (typeof module !== "undefined" && module.exports) module.exports = D.seasons;
})(typeof window !== "undefined" ? window : globalThis);
