/* Attack looks (Nov 15).
 *
 * Every move family has its own shot shape, trail and impact:
 *   fire    flame teardrop, rising embers, sparks and smoke on hit
 *   ice     diamond shard, glitter, shattering splinters and a frost ring
 *   water   droplet, bubbles, a splash
 *   dark    black-hearted orb, purple smoke, wisps
 *   holy    spinning star, twinkles, a cross flash
 *   machine bolt, sparks
 *   nature  leaf, fluttering leaf bits
 *   slime   wobbling blob, drips, a splat
 *   wind    spinning crescent, streaks
 *   beast   fang crescent, dust, claw marks
 * Baby "Bubble Blow" is a hollow bubble that pops.
 *
 * Cores are baked as chunky pixel sprites so they sit with the Digimon
 * sprites; glow, afterimages and particles go on top. Bigger tiers of a move
 * are drawn bigger, with more trail and a heavier impact.
 *
 * The sim only says what happened ("fx" events: cast, hit, boom, slash, tick,
 * pulse); everything here is cosmetic and runs on every screen by itself.
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});
  var S = D.sprites;
  if (!S || typeof document === "undefined") return;

  var CELL = 2;
  var parts = [], pool = [];
  var frameDt = 0.016;
  var TAU = Math.PI * 2;

  function low() { return !!D.reducedFx; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  /* ---------- families ---------- */
  /* pal: outline, body, light, hot core */
  var LOOK = {
    fire:    { shape: "flame",    aspect: 0.62, spin: 0,  pal: ["#8a1c08", "#ff6a1a", "#ffc23a", "#fff6c8"], glow: "#ff8a2a", bits: ["#ff6a1a", "#ffc23a", "#fff0a0"] },
    ice:     { shape: "shard",    aspect: 0.5,  spin: 0,  pal: ["#2a5a9a", "#6ab8f0", "#c8ecff", "#ffffff"], glow: "#7ecbff", bits: ["#c8ecff", "#ffffff", "#8ad0ff"] },
    water:   { shape: "drop",     aspect: 0.7,  spin: 0,  pal: ["#1a4a9a", "#3a8af0", "#8ad0ff", "#e8f8ff"], glow: "#4aa7ff", bits: ["#8ad0ff", "#d4f0ff", "#4aa7ff"] },
    dark:    { shape: "orb",      aspect: 1,    spin: 3,  pal: ["#e0b8ff", "#a050e0", "#4a1a78", "#12061e"], glow: "#a060d0", bits: ["#a050e0", "#6a2aa8", "#e0b8ff"] },
    holy:    { shape: "star",     aspect: 1,    spin: 7,  pal: ["#c88a1a", "#ffd84a", "#fff4b0", "#ffffff"], glow: "#ffe27a", bits: ["#ffffff", "#fff4b0", "#ffd84a"] },
    machine: { shape: "bolt",     aspect: 0.42, spin: 0,  pal: ["#3a4656", "#8a98ac", "#dfe8f2", "#ffffff"], glow: "#b8d8ff", bits: ["#ffe880", "#ffffff", "#b8d8ff"] },
    nature:  { shape: "leaf",     aspect: 0.55, spin: 0,  pal: ["#235a18", "#58b838", "#b4ec78", "#f0ffd0"], glow: "#6fc24a", bits: ["#58b838", "#b4ec78", "#2f7a20"] },
    slime:   { shape: "blob",     aspect: 0.9,  spin: 2,  pal: ["#3e4a14", "#8a9a3a", "#c8d86a", "#f0f8b0"], glow: "#a8b84a", bits: ["#8a9a3a", "#c8d86a", "#5a6a20"] },
    wind:    { shape: "crescent", aspect: 1,    spin: 14, pal: ["#3a9a8a", "#8fe0d0", "#d8fff4", "#ffffff"], glow: "#8fe0d0", bits: ["#d8fff4", "#ffffff", "#8fe0d0"] },
    beast:   { shape: "crescent", aspect: 1,    spin: 0,  pal: ["#7a5020", "#d0a060", "#f4e4c4", "#ffffff"], glow: "#f0c888", bits: ["#f4e4c4", "#d0a060", "#ffffff"] },
    bubble:  { shape: "bubble",   aspect: 1,    spin: 0,  pal: ["#5a9ad0", "#a8dcff", "#e8f8ff", "#ffffff"], glow: "#a8dcff", bits: ["#e8f8ff", "#a8dcff", "#ffffff"] },
    /* the techniques every Digimon can learn: raw data, no element */
    data:    { shape: "cube",     aspect: 1,    spin: 5,  pal: ["#0e5a78", "#2ac8e8", "#9af4ff", "#ffffff"], glow: "#58e8ff", bits: ["#9af4ff", "#ffffff", "#7af0c0"] }
  };
  /* single moves that wear their own shape or colours on top of their line's look */
  var MOVE_LOOK = {
    darknessGear: { shape: "gear", spin: 16 }, buzzSaw: { shape: "gear", spin: 18 },
    featherSlash: { shape: "leaf", spin: 15 }, foxLeaves: { shape: "leaf", spin: 0 }, emberFeathers: { shape: "leaf", spin: 0 }, thornFan: { shape: "shard", spin: 0 },
    icicleFang: { shape: "shard", spin: 0 }, hailDrop: { shape: "shard", spin: 0 }, angryRock: { shape: "blob", spin: 0 },
    rootBreaker: { pal: ["#3a2410", "#7a5228", "#a8c860", "#e8f8b0"], glow: "#a8c860", bits: ["#7a5228", "#a8c860", "#5a3a1a"] },
    webSnare: { pal: ["#4a5a3a", "#c8d8b0", "#f0f8e0", "#ffffff"], glow: "#e0f0c8", bits: ["#f0f8e0", "#ffffff", "#c8d8b0"] },
    /* a form's own shot (moves.js "A move of its own for every form") */
    hammerSpark: { shape: "bolt", spin: 0, pal: ["#0a5a6a", "#ffe14a", "#fff8b0", "#ffffff"], glow: "#ffe86a", bits: ["#fff8b0", "#ffffff", "#5ae0e0"], fx: "machine" },
    arcticBlizzard: { shape: "shard", spin: 0, pal: ["#2a5a9a", "#8ad0ff", "#d8f4ff", "#ffffff"], glow: "#a8e0ff", bits: ["#d8f4ff", "#ffffff", "#8ad0ff"], fx: "ice" },
    seaFoam: { shape: "bubble", spin: 0, pal: ["#0a6a7a", "#7ae0e8", "#d8fcff", "#ffffff"], glow: "#8af0f0", bits: ["#d8fcff", "#ffffff", "#7ae0e8"], fx: "water" },
    /* the other seventeen lines */
    blueBlaster: { shape: "flame", pal: ["#0a2a8a", "#2a7aff", "#9ad8ff", "#ffffff"], glow: "#5aa8ff", bits: ["#9ad8ff", "#ffffff", "#2a7aff"], fx: "fire" },
    howlingBlaster: { shape: "flame", pal: ["#0a2a8a", "#2a7aff", "#9ad8ff", "#ffffff"], glow: "#5aa8ff", bits: ["#9ad8ff", "#ffffff", "#2a7aff"], fx: "ice" },
    kaiserNail: { shape: "crescent", pal: ["#5a0a1a", "#e83a4a", "#ffb0a0", "#ffffff"], glow: "#ff6a6a", bits: ["#ffb0a0", "#ffffff", "#e83a4a"], fx: "beast" },
    volcanicStrike: { shape: "blob", pal: ["#5a1a08", "#e8501a", "#ffc23a", "#fff6c0"], glow: "#ff8a2a", bits: ["#ffc23a", "#ff7a1a", "#fff6c0"], fx: "fire" },
    cosmoFlash: { shape: "blob", pal: ["#3a1a5a", "#b06aff", "#ffd0ff", "#ffffff"], glow: "#c890ff", bits: ["#ffd0ff", "#ffffff", "#b06aff"], fx: "fire" },
    foxTailInferno: { shape: "flame", fx: "fire" }, spiritStrike: { shape: "flame", fx: "fire" }, foxSpark: { shape: "flame", fx: "fire" },
    nightmareSyndrome: { shape: "orb", pal: ["#e0c0ff", "#9a4ae0", "#3a0a5a", "#10061a"], glow: "#a05ae0", bits: ["#e0c0ff", "#9a4ae0", "#ffffff"], fx: "dark" },
    stickyNet: { pal: ["#4a5a3a", "#c8d8b0", "#f0f8e0", "#ffffff"], glow: "#e0f0c8", bits: ["#f0f8e0", "#ffffff", "#c8d8b0"] },
    cogCrusher: { shape: "gear", spin: 14 },
    handOfFate: { pal: ["#8a5a0a", "#ffc83a", "#fff0a0", "#ffffff"], glow: "#ffe07a", bits: ["#fff0a0", "#ffffff", "#ffc83a"], fx: "holy" },
    fireTornado: { shape: "flame", pal: ["#7a1408", "#f0401a", "#ffb23a", "#fff6c0"], glow: "#ff7a2a", bits: ["#ffb23a", "#ff5a1a", "#fff6c0"], fx: "fire" },
    needleSpray: { shape: "shard", pal: ["#2a5a18", "#8ad04a", "#e0f8a0", "#ffffff"], glow: "#b8f07a", bits: ["#e0f8a0", "#ffffff", "#8ad04a"] },
    seedSpit: { shape: "blob" }, seedPop: { shape: "blob", pal: ["#3a2a10", "#a87a3a", "#e8d08a", "#ffffff"], glow: "#e8d08a", bits: ["#e8d08a", "#a87a3a", "#7ac83a"] },
    snowPuff: { shape: "blob", pal: ["#7a9ac8", "#d8ecff", "#ffffff", "#ffffff"], glow: "#e8f4ff", bits: ["#ffffff", "#d8ecff", "#b8d8ff"], fx: "ice" },
    mudSpit: { shape: "blob", pal: ["#2a1a0a", "#6a4a22", "#a88050", "#d8c090"], glow: "#a88050", bits: ["#6a4a22", "#a88050", "#3a2a12"] },
    diamondStorm: { shape: "shard", pal: ["#3a5ac8", "#9ad0ff", "#e8f8ff", "#ffffff"], glow: "#c8e8ff", bits: ["#e8f8ff", "#ffffff", "#9ad0ff"] },
    spiralTwister: { shape: "flame", pal: ["#1a6a2a", "#4ad86a", "#c8ffb0", "#ffffff"], glow: "#7af08a", bits: ["#c8ffb0", "#ff8ab0", "#ffffff"], fx: "fire" },
    wingBlade: { shape: "flame", pal: ["#8a1a08", "#ff5a1a", "#ffc23a", "#fff6c0"], glow: "#ff8a2a", bits: ["#ffc23a", "#ff5a1a", "#fff6c0"], fx: "fire" },
    crimsonFlare: { shape: "flame", pal: ["#8a0a1a", "#ff3a3a", "#ffa03a", "#fff0b0"], glow: "#ff5a3a", bits: ["#ffa03a", "#ff3a3a", "#fff0b0"], fx: "fire" },
    blazeSonicBreath: { shape: "flame", fx: "fire" }, forbiddenTemptation: { shape: "leaf" }, puppyHowling: { shape: "star" }
  };
  /* how the other lines' shots are drawn while they fly (drawStyled) */
  var ICE_M = { G: "#a8d8f0", g: "#5a8ac0", f: "#2a5aa0", r: "#e8f8ff", e: "#ffe14a" }, GOLD_M = { G: "#d8b04a", g: "#8a6a22", f: "#c8402e", r: "#e8402a", e: "#ffffff" }, GREEN_M = { G: "#6ad07a", g: "#2a7a3a", f: "#e8e8e8", r: "#ffe14a", e: "#ffffff" };
  var SHOTS = {
    kaiserNail: { s: "wave" }, gracefulCannon: { s: "missile", swap: ICE_M },
    demiBubble: { s: "foam" }, veeShot: { s: "fire" },
    pyroSphere: { s: "orb", ring: 1 },
    pineconeToss: { s: "sprite", spr: "pinecone", spin: 9, tr: "leaf" }, stickyNet: { s: "net" }, moonShooter: { s: "tracer" },
    missilePop: { s: "missile", swap: GOLD_M, sc: 0.7 }, cogCrusher: { s: "core", size: 1.6, spin: 14, tail: 3 }, guardianBarrage: { s: "missile", swap: GOLD_M, sc: 0.85, wob: 1 }, gatlingAttack: { s: "tracer" },
    pebbleSpit: { s: "core", size: 1.5, spin: 8 }, rockFist: { s: "core", size: 1.8, spin: 6, tail: 2, tr: "dust" }, nightmareSyndrome: { s: "orb", wisp: 1, face: 1 },
    bugBlaster: { s: "orb", glitch: 1 }, nightmareShocker: { s: "wave", n: 3 }, spiderShooter: { s: "tracer" },
    seedSpit: { s: "core", size: 1.4, spin: 10 }, spiralTwister: { s: "helix" }, wingBlade: { s: "bird" },
    featherPuff: { s: "core", size: 1.5, spin: 6 }, featherStrike: { s: "core", size: 1.7, spin: 0, tail: 3, streak: 1 }, blastRings: { s: "wave", ring: 1 },
    staticBubble: { s: "foam", spark: 1 }, electroShocker: { s: "orb", arcs: 1 },
    bubblePuff: { s: "foam" }, boomBubble: { s: "foam", one: 1 }, sevenHeavens: { s: "orb", ring: 1 },
    seedPop: { s: "core", size: 1.5, spin: 8 }, needleSpray: { s: "tracer" }, flowerCannon: { s: "orb", petals: 1 },
    foxSpark: { s: "fire" }, diamondStorm: { s: "core", size: 1.7, spin: 0, streak: 1 }, foxTailInferno: { s: "fire" }, talismanOfLight: { s: "sprite", spr: "card", spin: 0, tr: "spark" }, spiritStrike: { s: "fire", big: 1 },
    bladeChip: { s: "core", size: 1.4, spin: 16 }, twentyDive: { s: "tracer", big: 1 }, sonicEdge: { s: "wave" }, legendWave: { s: "wave", n: 2 },
    mudSpit: { s: "core", size: 1.5, spin: 5, tr: "drip" }, pebbleRoll: { s: "core", size: 1.6, spin: 9, tr: "dust" },
    snowPuff: { s: "core", size: 1.5, spin: 4 }, celestialArrow: { s: "tracer", big: 1, arrow: 1 }, fireTornado: { s: "tornado" },
    doubleBubble: { s: "foam" }, bunnyBlast: { s: "core", size: 1.7, spin: 0, tail: 3, streak: 1 }, gargoLaser: { s: "tracer" }, rapidFire: { s: "missile", swap: GREEN_M, sc: 0.85 }, megaBarrage: { s: "missile", swap: GREEN_M }
  };
  /* beams that are not what their element would make them; chains with their own line; what a hit leaves */
  var BEAM_FX = { atomicBlaster: "laser", shieldOfTheJust: "laser", positronLaser: "laser", veeLaser: "laser", howlingBlaster: "laser", hotBite: "bite", handOfFate: "fist", puppyHowling: "howl" };
  var CHAIN_FX = { superShocker: "zig", hellMasquerade: "slash", plantShock: "vine" };
  var BOOM_FX = { stickyNet: "web", talismanOfLight: "seal" };
  /* how a form's own shot is drawn while it flies */
  var SHOT_STYLE = { pepperBreath: "fireball", megaFlame: "novablast", gigaDestroyer: "missile", terraForce: "sun", seaFoam: "foam", marchingFishes: "fish", harpoonTorpedo: "torpedo", gigaBlaster: "sun" };
  var MINE_STYLE = { webSnare: "web", hazardMine: "mark", curseMark: "mark", gooTrap: "puddle", bubbleTrap: "bubble" };

  /* signature sets (17z33, moves.js SIG_LOOK): each move's own shape, and how its trap, ray,
   * chain or thrown blade is drawn */
  function mergeSigLooks() {
    var S = D.SIG_LOOK || {}, k, o;
    for (k in S) {
      o = S[k];
      if (o.sh && !MOVE_LOOK[k]) MOVE_LOOK[k] = { shape: o.sh };
      if (o.ms && !MINE_STYLE[k]) MINE_STYLE[k] = o.ms;
      if (o.bf && !BEAM_FX[k]) BEAM_FX[k] = o.bf;
      if (o.cf && !CHAIN_FX[k]) CHAIN_FX[k] = o.cf;
      if (o.of && !BOOM_FX[k]) BOOM_FX[k] = o.of;
    }
  }
  var famById = null;
  function buildIndex() {
    var F = D.MOVE_FAMILIES || {}, L = D.MOVE_LINES || {}, f, i, k;
    mergeSigLooks();
    famById = { bubbleBlow: "bubble", headbutt: "beast", sludgeToss: "slime", pepperBreath: "fire", megaFlame: "fire", gigaDestroyer: "fire", terraForce: "fire",
      blueBlaster: "ice", howlingBlaster: "ice", gracefulCannon: "ice" };
    for (f in F) for (i = 0; i < F[f].ids.length; i++) if (!famById[F[f].ids[i]]) famById[F[f].ids[i]] = f;
    /* lines with a look of their own (moves.js EGG_LINES) */
    var SHAPE_OF = {}, base, lk;
    for (f in LOOK) if (!SHAPE_OF[LOOK[f].shape]) SHAPE_OF[LOOK[f].shape] = LOOK[f];
    for (k in L) {
      lk = L[k].look;
      if (!lk || !L[k].own) continue;
      base = SHAPE_OF[lk.shape] || LOOK[L[k].family] || LOOK.fire;
      LOOK["L_" + k] = { shape: lk.shape, aspect: base.aspect, spin: lk.spin != null ? lk.spin : base.spin, pal: lk.pal, glow: lk.glow,
        bits: lk.bits || [lk.pal[1], lk.pal[2], lk.pal[3]], fx: lk.fx || L[k].family };
      for (i = 0; i < L[k].own.length; i++) famById[L[k].own[i]] = "L_" + k;
    }
    for (k in L) {
      for (i = 0; i < L[k].primary.length; i++) if (L[k].primary[i] && !famById[L[k].primary[i]]) famById[L[k].primary[i]] = L[k].family;
      if (L[k].special && !famById[L[k].special]) famById[L[k].special] = L[k].family;
      for (i = 0; i < (L[k].sigs || []).length; i++) if (!famById[L[k].sigs[i]]) famById[L[k].sigs[i]] = (D.SIG_LOOK && D.SIG_LOOK[L[k].sigs[i]] && D.SIG_LOOK[L[k].sigs[i]].el) || L[k].family;
    }
    for (f in F) if (F[f].special && !famById[F[f].special]) famById[F[f].special] = f;
    for (k in (D.MOVE_TECH_LOOK || {})) famById[k] = D.MOVE_TECH_LOOK[k];
    for (k in MOVE_LOOK) {
      if (!famById[k]) continue;
      base = LOOK[famById[k]]; lk = MOVE_LOOK[k];
      LOOK["W_" + k] = { shape: lk.shape || base.shape, aspect: lk.shape ? (SHAPE_OF[lk.shape] ? SHAPE_OF[lk.shape].aspect : 1) : base.aspect, spin: lk.spin != null ? lk.spin : base.spin,
        pal: lk.pal || base.pal, glow: lk.glow || base.glow, bits: lk.bits || base.bits, fx: lk.fx || base.fx || (LOOK[famById[k]] && famById[k].indexOf("_") < 0 ? famById[k] : "fire") };
      famById[k] = "W_" + k;
    }
    /* signature moves with a look of their own (sig-fx.js, 17z33 move revamp) */
    if (D.sigFx && D.sigFx.applyLooks) D.sigFx.applyLooks(LOOK, famById);
  }

  function rgb(hex) {
    var h = String(hex || "#ffffff").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h.slice(0, 6), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  var byColor = {};
  function familyOfColor(col) {
    if (!col) return "fire";
    if (byColor[col]) return byColor[col];
    var c = rgb(col), best = "fire", bd = 1e9, f, g, d;
    for (f in LOOK) {
      if (f === "bubble") continue;
      g = rgb(LOOK[f].glow);
      d = (c[0] - g[0]) * (c[0] - g[0]) + (c[1] - g[1]) * (c[1] - g[1]) + (c[2] - g[2]) * (c[2] - g[2]);
      if (d < bd) { bd = d; best = f; }
    }
    byColor[col] = best;
    return best;
  }

  /* what a move looks like: family + how big a deal it is (tier 0..5) */
  var styleCache = {};
  function styleOf(wid, color) {
    var key = (wid || "") + "|" + (color || "");
    if (styleCache[key]) return styleCache[key];
    if (!famById) buildIndex();
    var key0 = (wid && famById[wid]) || familyOfColor(color);
    var fam = (LOOK[key0] && LOOK[key0].fx) || key0;
    var meta = (wid && D.MOVE_META && D.MOVE_META[wid]) || null;
    var st = { fam: fam, key: key0, look: LOOK[key0] || LOOK.fire, tier: meta ? meta.tier : 2, slot: meta ? meta.slot : "primary" };
    styleCache[key] = st;
    return st;
  }

  /* ---------- baked pixel cores ---------- */
  /* each shape returns "depth": <=0 outside, rising to 1 at the heart */
  var SHAPES = {
    flame: function (u, v, k) {
      var w, r;
      if (u > 0.25) { r = Math.sqrt((u - 0.25) * (u - 0.25) / 0.56 + v * v / 0.72); return 1 - r; }
      w = 0.85 * Math.pow(Math.max(0, (u + 1) / 1.25), 0.8) * (1 + 0.16 * Math.sin(u * 8 + k * 2.6));
      return w <= 0.01 ? 0 : 1 - Math.abs(v + 0.12 * Math.sin(u * 5 + k * 3)) / w;
    },
    shard: function (u, v) { return 1 - (Math.abs(u) * 0.98 + Math.abs(v) * 1.02); },
    drop: function (u, v, k) {
      var w;
      if (u > 0.1) return 1 - Math.sqrt((u - 0.1) * (u - 0.1) / 0.78 + v * v / 0.86);
      w = 0.92 * Math.pow(Math.max(0, (u + 1) / 1.1), 0.65) * (1 + 0.06 * Math.sin(k * 3 + u * 6));
      return w <= 0.01 ? 0 : 1 - Math.abs(v) / w;
    },
    orb: function (u, v, k) {
      var r = Math.sqrt(u * u + v * v), a = Math.atan2(v, u);
      return (1 - r / (0.92 + 0.06 * Math.sin(a * 4 + k * 1.6))) * 1.25;
    },
    star: function (u, v) {
      var a = Math.pow(Math.abs(u), 0.62) + Math.pow(Math.abs(v), 0.62);
      return (1 - a / 1.02) * 1.5;
    },
    bolt: function (u, v) {
      var e = Math.max(Math.abs(v) / 0.9, (Math.abs(u - 0.05)) / 0.95);
      if (u > 0.55) e = Math.max(e, Math.sqrt((u - 0.55) * (u - 0.55) / 0.2 + v * v / 0.8));
      return (1 - e) * 1.6;
    },
    leaf: function (u, v, k) {
      var w = 0.92 * (1 - u * u) * (0.8 + 0.2 * u);
      var d = w <= 0.01 ? 0 : 1 - Math.abs(v - 0.1 * Math.sin(u * 3 + k)) / w;
      return Math.abs(v) < 0.09 && Math.abs(u) < 0.7 ? Math.min(d, 0.3) : d * 1.2;
    },
    blob: function (u, v, k) {
      var r = Math.sqrt(u * u + v * v), a = Math.atan2(v, u);
      return (1 - r / (0.82 + 0.14 * Math.sin(a * 5 + k * 2.2))) * 1.4;
    },
    crescent: function (u, v) {
      var r1 = Math.sqrt(u * u + v * v), r2 = Math.sqrt((u + 0.5) * (u + 0.5) + v * v);
      return Math.min(1 - r1, r2 - 0.86) * 3.2;
    },
    cube: function (u, v) {
      var e = Math.max(Math.abs(u), Math.abs(v));
      if (e > 0.86) return 0;
      if (Math.abs(u) < 0.2 && Math.abs(v) < 0.2) return 0.9;
      return e > 0.66 ? 0.1 : (e > 0.44 ? 0.4 : 0.66);
    },
    gear: function (u, v) {
      var r = Math.sqrt(u * u + v * v), a = Math.atan2(v, u), tooth = Math.sin(a * 8) > 0 ? 0.96 : 0.7;
      if (r > tooth) return 0;
      if (r < 0.2) return 0;
      return r > tooth - 0.14 ? 0.1 : (r < 0.34 ? 0.9 : (r < 0.5 ? 0.6 : 0.4));
    },
    bubble: function (u, v) {
      var r = Math.sqrt(u * u + v * v);
      if (u < -0.15 && u > -0.5 && v < -0.2 && v > -0.55) return 0.9;
      return r > 0.72 ? (1 - r) * 3.2 : (r > 0.6 ? 0.3 : 0);
    }
  };

  var baked = {};
  function core(fam, cellsLong, k) {
    var key = fam + "|" + cellsLong + "|" + k;
    if (baked[key]) return baked[key];
    var look = LOOK[fam] || LOOK.fire, fn = SHAPES[look.shape] || (D.sigFx && D.sigFx.NEW_SHAPES && D.sigFx.NEW_SHAPES[look.shape]) || SHAPES.orb;
    var W = cellsLong, H = Math.max(3, Math.round(cellsLong * look.aspect));
    var c = document.createElement("canvas");
    c.width = W * CELL; c.height = H * CELL;
    var g = c.getContext("2d"), x, y, u, v, d, col;
    for (y = 0; y < H; y++) {
      for (x = 0; x < W; x++) {
        u = ((x + 0.5) / W) * 2 - 1; v = ((y + 0.5) / H) * 2 - 1;
        d = fn(u, v, k);
        if (d <= 0) continue;
        col = d < 0.24 ? look.pal[0] : (d < 0.52 ? look.pal[1] : (d < 0.8 ? look.pal[2] : look.pal[3]));
        if ((fam === "bubble" || look.shape === "bubble") && d < 0.5) g.globalAlpha = 0.75; else g.globalAlpha = 1;
        g.fillStyle = col;
        g.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
    baked[key] = c;
    return c;
  }

  var glowSheets = {};
  function glowSprite(color) {
    if (glowSheets[color]) return glowSheets[color];
    var c = document.createElement("canvas");
    c.width = c.height = 64;
    var g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32), k = rgb(color);
    gr.addColorStop(0, "rgba(" + k[0] + "," + k[1] + "," + k[2] + ",0.85)");
    gr.addColorStop(0.45, "rgba(" + k[0] + "," + k[1] + "," + k[2] + ",0.28)");
    gr.addColorStop(1, "rgba(" + k[0] + "," + k[1] + "," + k[2] + ",0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    glowSheets[color] = c;
    return c;
  }
  function glow(ctx, x, y, rx, ry, color, alpha) {
    if (low()) return;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha;
    ctx.drawImage(glowSprite(color), x - rx, y - ry, rx * 2, ry * 2);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }

  /* ---------- particles ---------- */
  function add(type, x, y, vx, vy, life, size, color, o) {
    var cap = low() ? 110 : 460, p;
    if (parts.length >= cap) p = parts.shift();
    else p = pool.pop() || {};
    p.type = type; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.max = life; p.size = size; p.color = color;
    p.add = !!(o && o.add); p.grav = (o && o.grav) || 0; p.drag = (o && o.drag) || 0; p.grow = (o && o.grow) || 0;
    p.rot = (o && o.rot) || 0; p.sway = (o && o.sway) || 0; p.len = (o && o.len) || 0; p.seed = Math.random() * TAU; p.ch = (o && o.ch) || "";
    p.img = (o && o.img) || null; p.spin = (o && o.spin) || 0;
    parts.push(p);
    return p;
  }

  function update(dt) {
    var i, p, k;
    frameDt = dt;
    updateAnims(dt);
    updateMarks(dt);
    if (D.sigFx) D.sigFx.update(dt);
    for (i = parts.length - 1; i >= 0; i--) {
      p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { pool.push(parts.splice(i, 1)[0]); continue; }
      if (p.drag) { k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
      p.vy += p.grav * dt;
      p.x += p.vx * dt + (p.sway ? Math.sin(p.seed + p.life * 14) * p.sway * dt : 0);
      p.y += p.vy * dt;
      p.size += p.grow * dt;
      if (p.spin) p.rot += p.spin * dt;
    }
  }

  function draw(ctx) {
    var i, p, u, s, a, n;
    drawAnims(ctx);
    if (!parts.length) return;
    ctx.save();
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      u = p.life / p.max;
      ctx.globalCompositeOperation = p.add ? "lighter" : "source-over";
      if (p.type === "px") {
        s = Math.max(1, Math.round(p.size * (0.45 + 0.55 * u)));
        ctx.globalAlpha = Math.min(1, u * 1.8);
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
      } else if (p.type === "smoke") {
        s = Math.max(2, Math.round(p.size / 2) * 2);
        ctx.globalAlpha = 0.5 * u;
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
        ctx.fillRect(Math.round(p.x - s / 2) + 2, Math.round(p.y - s / 2) - 2, s - 2, s);
      } else if (p.type === "ring") {
        ctx.globalAlpha = Math.min(1, u * 1.6);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, (p.len || 3) * u);
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, TAU);
        ctx.stroke();
      } else if (p.type === "flash") {
        ctx.globalAlpha = u;
        s = p.size * (0.6 + 0.4 * u);
        ctx.drawImage(glowSprite(p.color), p.x - s, p.y - s, s * 2, s * 2);
        light(p.x, p.y, s * 2.2, p.color, u);
      } else if (p.type === "line") {
        n = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
        ctx.globalAlpha = Math.min(1, u * 1.6);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - (p.vx / n) * p.len * (0.4 + 0.6 * u), p.y - (p.vy / n) * p.len * (0.4 + 0.6 * u));
        ctx.stroke();
      } else if (p.type === "cut") {
        /* a claw mark: a thin wedge that opens then fades */
        a = p.rot;
        s = p.len * Math.min(1, (1 - u) * 3 + 0.25);
        ctx.globalAlpha = Math.min(1, u * 2.2);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(p.x - Math.cos(a) * s, p.y - Math.sin(a) * s);
        ctx.lineTo(p.x - Math.sin(a) * p.size, p.y + Math.cos(a) * p.size);
        ctx.lineTo(p.x + Math.cos(a) * s, p.y + Math.sin(a) * s);
        ctx.lineTo(p.x + Math.sin(a) * p.size, p.y - Math.cos(a) * p.size);
        ctx.closePath();
        ctx.fill();
      } else if (p.type === "fish") {
        /* a little fish tumbling through the air */
        ctx.globalAlpha = Math.min(1, u * 3);
        ctx.fillStyle = p.color;
        s = Math.sin(p.rot + p.life * 12) > 0 ? 1 : -1;
        ctx.fillRect(Math.round(p.x) - 4, Math.round(p.y) - 2, 8, 4);
        ctx.fillRect(Math.round(p.x) - 3, Math.round(p.y) - 3, 5, 6);
        ctx.fillRect(Math.round(p.x) + (s > 0 ? -7 : 4), Math.round(p.y) - 3, 3, 6);
        ctx.fillStyle = "#101820"; ctx.fillRect(Math.round(p.x) + (s > 0 ? 2 : -3), Math.round(p.y) - 2, 1, 1);
      } else if (p.type === "txt") {
        ctx.globalAlpha = Math.min(1, u * 2);
        ctx.fillStyle = p.color;
        ctx.font = "bold " + Math.round(p.size) + "px monospace";
        ctx.textAlign = "center";
        ctx.fillText(p.ch, Math.round(p.x), Math.round(p.y));
      } else if (p.type === "img" && p.img) {
        /* a little baked shape (a petal, a note, a feather...) tumbling (sig-fx.js) */
        s = p.size * (p.grow ? 1 : (0.55 + 0.45 * u)) / Math.max(p.img.width, p.img.height);
        ctx.globalAlpha = Math.min(1, u * 2.2);
        ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y)); if (p.rot) ctx.rotate(p.rot);
        ctx.drawImage(p.img, -p.img.width * s / 2, -p.img.height * s / 2, p.img.width * s, p.img.height * s);
        ctx.restore();
      } else if (p.type === "cross") {
        s = p.size * (0.5 + 0.5 * u);
        ctx.globalAlpha = u;
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x - s), Math.round(p.y - 1), Math.round(s * 2), 2);
        ctx.fillRect(Math.round(p.x - 1), Math.round(p.y - s), 2, Math.round(s * 2));
      }
    }
    ctx.restore();
  }

  /* how many particles a stream should drop this frame */
  function rate(perSec) {
    var n = perSec * frameDt * (low() ? 0.3 : 1), w = n | 0;
    return w + (Math.random() < n - w ? 1 : 0);
  }

  /* ---------- trails ---------- */
  function trail(st, x, y, vx, vy, r, heavy) {
    var L = st.look, n = rate((heavy ? 46 : 26) + st.tier * 5), i, sp = Math.sqrt(vx * vx + vy * vy) || 1;
    var bx = -vx / sp, by = -vy / sp, px, py;
    for (i = 0; i < n; i++) {
      px = x + bx * rnd(2, r * 1.4) + rnd(-r, r) * 0.55; py = y + by * rnd(2, r * 1.4) + rnd(-r, r) * 0.55;
      switch (st.fam) {
        case "fire":
          add("px", px, py, bx * 20 + rnd(-14, 14), by * 20 - rnd(18, 52), rnd(0.2, 0.42), rnd(2, 4) + st.tier * 0.3, pick(L.bits), { add: true });
          if (st.tier >= 3 && Math.random() < 0.25) add("smoke", px, py, rnd(-8, 8), -rnd(10, 26), rnd(0.35, 0.6), 4, "#3a2a2a", { grow: 8 });
          break;
        case "ice":
          add("px", px, py, rnd(-10, 10), rnd(4, 26), rnd(0.25, 0.5), rnd(1.5, 3), pick(L.bits), { add: true });
          break;
        case "water":
          add("ring", px, py, rnd(-8, 8), -rnd(6, 22), rnd(0.25, 0.45), rnd(1, 2), pick(L.bits), { grow: 5, len: 1.5 });
          break;
        case "dark":
          add("smoke", px, py, rnd(-10, 10), -rnd(4, 18), rnd(0.35, 0.65), rnd(3, 5), pick(["#2a0f44", "#4a1a78", "#1a0a2a"]), { grow: 9 });
          if (Math.random() < 0.4) add("px", px, py, rnd(-16, 16), rnd(-16, 16), 0.3, 2, "#e0b8ff", { add: true });
          break;
        case "holy":
          add(Math.random() < 0.3 ? "cross" : "px", px, py, rnd(-12, 12), rnd(-12, 12), rnd(0.2, 0.45), rnd(2, 4), pick(L.bits), { add: true });
          break;
        case "machine":
          add("line", px, py, bx * rnd(40, 110) + rnd(-50, 50), by * rnd(40, 110) + rnd(-50, 50), rnd(0.1, 0.22), 1.5, pick(L.bits), { add: true, len: rnd(4, 9) });
          break;
        case "nature":
          add("px", px, py, bx * 18 + rnd(-14, 14), by * 18 + rnd(-6, 14), rnd(0.35, 0.7), rnd(2, 3.5), pick(L.bits), { grav: 40, sway: 40 });
          break;
        case "slime":
          add("px", px, py, rnd(-8, 8), rnd(6, 20), rnd(0.3, 0.55), rnd(2, 4), pick(L.bits), { grav: 190 });
          break;
        case "wind":
          add("line", px, py, vx * 0.35 + rnd(-10, 10), vy * 0.35 + rnd(-10, 10), rnd(0.14, 0.26), 1.5, pick(L.bits), { add: true, len: rnd(8, 16) });
          break;
        case "beast":
          add("px", px, py, rnd(-14, 14), rnd(-14, 6), rnd(0.2, 0.4), rnd(1.5, 3), pick(L.bits), {});
          break;
        default:
          if (Math.random() < 0.4) add("px", px, py, rnd(-6, 6), -rnd(4, 14), 0.3, 2, pick(L.bits), { add: true });
      }
    }
  }

  /* ---------- impacts ---------- */
  function spray(n, x, y, a, cone, s0, s1, fn) {
    var i, d, sp;
    for (i = 0; i < n; i++) {
      d = a + rnd(-cone, cone); sp = rnd(s0, s1);
      fn(Math.cos(d) * sp, Math.sin(d) * sp);
    }
  }

  function impact(st, x, y, a, power) {
    var L = st.look, k = power * (low() ? 0.4 : 1), n = Math.max(2, Math.round((7 + st.tier * 2.4) * k));
    var R = (12 + st.tier * 4.2) * power, back = a + Math.PI;
    add("flash", x, y, 0, 0, 0.12, R * 1.9, L.glow, { add: true });
    switch (st.fam) {
      case "fire":
        spray(n, x, y, back, 1.2, 60, 190, function (vx, vy) { add("px", x, y, vx, vy - 20, rnd(0.22, 0.5), rnd(2, 4.5), pick(L.bits), { add: true, grav: 120, drag: 2 }); });
        spray(Math.ceil(n / 3), x, y, -Math.PI / 2, 0.9, 10, 40, function (vx, vy) { add("smoke", x, y, vx, vy, rnd(0.4, 0.7), 5, "#3a2a2a", { grow: 12 }); });
        add("ring", x, y, 0, 0, 0.2, R * 0.4, "#ffc23a", { add: true, grow: R * 5, len: 3 });
        break;
      case "ice":
        spray(n, x, y, back, 1.7, 90, 240, function (vx, vy) { add("line", x, y, vx, vy, rnd(0.18, 0.34), 2, pick(L.bits), { add: true, len: rnd(6, 12), drag: 3 }); });
        spray(Math.ceil(n / 2), x, y, 0, Math.PI, 20, 70, function (vx, vy) { add("px", x, y, vx, vy, rnd(0.3, 0.6), rnd(2, 3), "#ffffff", { add: true, grav: 60 }); });
        add("ring", x, y, 0, 0, 0.28, R * 0.5, "#c8ecff", { add: true, grow: R * 4, len: 2 });
        break;
      case "water":
        add("ring", x, y, 0, 0, 0.3, R * 0.4, "#d4f0ff", { grow: R * 4.5, len: 3 });
        spray(n, x, y, -Math.PI / 2, 1.3, 70, 170, function (vx, vy) { add("px", x, y, vx, vy, rnd(0.3, 0.55), rnd(2, 4), pick(L.bits), { grav: 420 }); });
        break;
      case "dark":
        add("ring", x, y, 0, 0, 0.3, R * 0.4, "#a050e0", { add: true, grow: R * 4, len: 3 });
        spray(n, x, y, 0, Math.PI, 20, 80, function (vx, vy) { add("smoke", x, y, vx, vy, rnd(0.4, 0.8), 5, pick(["#2a0f44", "#4a1a78", "#12061e"]), { grow: 10, drag: 2 }); });
        spray(Math.ceil(n / 2), x, y, 0, Math.PI, 60, 150, function (vx, vy) { add("px", x, y, vx, vy, 0.35, 2.5, "#e0b8ff", { add: true, drag: 3 }); });
        break;
      case "holy":
        add("cross", x, y, 0, 0, 0.22, R * 1.6, "#ffffff", { add: true });
        add("ring", x, y, 0, 0, 0.3, R * 0.4, "#ffd84a", { add: true, grow: R * 4.5, len: 2.5 });
        spray(n, x, y, 0, Math.PI, 40, 130, function (vx, vy) { add(Math.random() < 0.35 ? "cross" : "px", x, y, vx, vy, rnd(0.3, 0.6), rnd(2, 4), pick(L.bits), { add: true, drag: 2.5 }); });
        break;
      case "machine":
        spray(n + 2, x, y, back, 1.5, 140, 320, function (vx, vy) { add("line", x, y, vx, vy, rnd(0.12, 0.26), 1.5, pick(L.bits), { add: true, len: rnd(6, 12), grav: 200 }); });
        add("ring", x, y, 0, 0, 0.16, R * 0.3, "#ffffff", { add: true, grow: R * 5, len: 2 });
        spray(Math.ceil(n / 3), x, y, -Math.PI / 2, 0.8, 10, 30, function (vx, vy) { add("smoke", x, y, vx, vy, 0.45, 4, "#4a4f58", { grow: 10 }); });
        break;
      case "nature":
        spray(n + 2, x, y, 0, Math.PI, 40, 140, function (vx, vy) { add("px", x, y, vx, vy - 30, rnd(0.4, 0.8), rnd(2, 4), pick(L.bits), { grav: 120, sway: 60, drag: 2 }); });
        add("ring", x, y, 0, 0, 0.22, R * 0.4, "#b4ec78", { grow: R * 3.5, len: 2 });
        break;
      case "slime":
        spray(n + 2, x, y, back, 1.6, 50, 170, function (vx, vy) { add("px", x, y, vx, vy - 40, rnd(0.35, 0.65), rnd(3, 6), pick(L.bits), { grav: 460 }); });
        add("ring", x, y, 0, 0, 0.22, R * 0.4, "#c8d86a", { grow: R * 3, len: 3 });
        break;
      case "wind":
        spray(n, x, y, a + Math.PI / 2, 0.5, 120, 260, function (vx, vy) { add("line", x, y, vx, vy, rnd(0.16, 0.3), 1.5, pick(L.bits), { add: true, len: rnd(10, 18), drag: 3 }); });
        spray(n, x, y, a - Math.PI / 2, 0.5, 120, 260, function (vx, vy) { add("line", x, y, vx, vy, rnd(0.16, 0.3), 1.5, pick(L.bits), { add: true, len: rnd(10, 18), drag: 3 }); });
        add("ring", x, y, 0, 0, 0.24, R * 0.4, "#d8fff4", { add: true, grow: R * 4.5, len: 2 });
        break;
      case "beast":
        claws(x, y, a, R, "#ffffff", st.tier >= 2 ? 3 : 1);
        spray(n, x, y, back, 1.4, 40, 130, function (vx, vy) { add("px", x, y, vx, vy, rnd(0.2, 0.45), rnd(2, 3.5), pick(L.bits), { grav: 160 }); });
        break;
      default: /* bubble */
        add("ring", x, y, 0, 0, 0.2, 3, "#e8f8ff", { grow: 60, len: 2 });
        spray(5, x, y, 0, Math.PI, 30, 90, function (vx, vy) { add("px", x, y, vx, vy, 0.3, 2, pick(L.bits), { add: true, grav: 80 }); });
    }
  }

  function claws(x, y, a, R, color, count) {
    var i, off, nx = Math.cos(a), ny = Math.sin(a), rot = a + Math.PI / 2 + 0.5;
    for (i = 0; i < count; i++) {
      off = (i - (count - 1) / 2) * Math.max(5, R * 0.42);
      add("cut", x + nx * off, y + ny * off, 0, 0, 0.2, 2.2, color, { add: true, rot: rot, len: R * 1.25 });
    }
  }

  function boom(st, x, y, a, r) {
    var L = st.look, n = low() ? 10 : 30, R = Math.max(24, r || 60);
    add("flash", x, y, 0, 0, 0.22, R * 1.9, L.glow, { add: true });
    add("flash", x, y, 0, 0, 0.12, R * 1.1, "#ffffff", { add: true });
    add("ring", x, y, 0, 0, 0.34, R * 0.25, L.pal[2], { add: true, grow: R * 2.6, len: 5 });
    add("ring", x, y, 0, 0, 0.46, R * 0.1, L.pal[1], { add: true, grow: R * 2.1, len: 3 });
    spray(n, x, y, 0, Math.PI, R * 1.2, R * 4, function (vx, vy) { add("px", x, y, vx, vy, rnd(0.3, 0.7), rnd(3, 6), pick(L.bits), { add: st.fam !== "slime" && st.fam !== "nature", drag: 3.2, grav: 60 }); });
    spray(Math.ceil(n / 3), x, y, 0, Math.PI, 20, R * 1.1, function (vx, vy) { add("smoke", x + vx * 0.1, y + vy * 0.1, vx, vy - 14, rnd(0.5, 0.9), 7, st.fam === "dark" ? "#2a0f44" : "#3a3236", { grow: 14, drag: 2 }); });
    impact(st, x, y, a, 1.3);
  }

  function event(e) {
    if (!e) return;
    var st = styleOf(e.w, null), a = e.a || 0, i;
    maybeMark(e, st);
    if (e.w && D.sigFx && D.sigFx.event(e, st)) return;
    if (e.k === "beam" || e.k === "chain" || e.k === "drop" || e.k === "burst") { kitEvent(e, st); return; }
    if (e.k === "charge" || e.k === "split" || e.k === "slam" || e.k === "zap" || e.k === "spike" || e.k === "erupt") { formEvent(e, st); return; }
    if (e.k === "boom" && BOOM_FX[e.w]) anims.push({ k: BOOM_FX[e.w], t: 0, max: 0.55, x: e.x, y: e.y, r: Math.max(26, e.r || 30), st: st, seed: Math.random() * TAU });
    if (e.k === "hit") impact(st, e.x, e.y, a, 1);
    else if (e.k === "boom") boom(st, e.x, e.y, a, e.r);
    else if (e.k === "slash") {
      claws(e.x, e.y, a, 10 + st.tier * 3, "#ffffff", st.tier >= 2 ? 3 : 1);
      if (st.tier >= 2) claws(e.x, e.y, a, 12 + st.tier * 3, st.look.pal[1], 3);
      spray(low() ? 2 : 4 + st.tier, e.x, e.y, a, 1.1, 60, 170, function (vx, vy) { add("px", e.x, e.y, vx, vy, rnd(0.2, 0.42), rnd(2, 4), pick(st.look.bits), { add: true, drag: 3 }); });
      add("flash", e.x, e.y, 0, 0, 0.1, 16 + st.tier * 4, st.look.glow, { add: true });
    } else if (e.k === "tick") {
      for (i = 0; i < (low() ? 1 : 3); i++) add("px", e.x + rnd(-8, 8), e.y + rnd(-8, 6), rnd(-12, 12), -rnd(24, 60), rnd(0.25, 0.5), rnd(2, 4), pick(st.look.bits), { add: st.fam !== "slime" && st.fam !== "nature" });
    } else if (e.k === "pulse") {
      add("ring", e.x, e.y, 0, 0, 0.32, (e.r || 50) * 0.55, st.look.pal[2], { add: true, grow: (e.r || 50) * 1.5, len: 3 });
    } else if (e.k === "cast") {
      add("flash", e.x + Math.cos(a) * 8, e.y + Math.sin(a) * 8, 0, 0, 0.09, 10 + st.tier * 3, st.look.glow, { add: true });
      spray(low() ? 1 : 2 + (st.tier > 2 ? 2 : 0), e.x, e.y, a, 0.5, 50, 130, function (vx, vy) { add("px", e.x + Math.cos(a) * 8, e.y + Math.sin(a) * 8, vx, vy, 0.2, 2.5, pick(st.look.bits), { add: true, drag: 4 }); });
    }
  }

  /* ---------- shots ---------- */
  function cellsFor(st, radius, big) {
    var px = (radius || 6) * 3.1 + st.tier * 2.6 + (big ? 6 : 0);
    if (st.look.aspect >= 0.9) px *= 0.78;
    return Math.max(5, Math.min(26, Math.round(px / CELL)));
  }

  function stamp(ctx, c, x, y, rot, scale, alpha) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (rot) ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    var w = c.width * scale, h = c.height * scale;
    ctx.drawImage(c, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function drawProjectile(ctx, p, t) {
    var wd = p.wid && D.WEAPONS && D.WEAPONS[p.wid];
    shotLight(p);
    if (p.wid && D.sigFx && D.sigFx.drawShot(ctx, p, t, styleOf(p.wid, p.color))) return;
    if (p.wid && SHOT_STYLE[p.wid]) { drawFormShot(ctx, p, t, SHOT_STYLE[p.wid]); return; }
    if (p.wid && SHOTS[p.wid]) { drawStyled(ctx, p, t, SHOTS[p.wid]); return; }
    if (wd && wd.type === "mine") { drawMine(ctx, p, t); return; }
    if (wd && wd.type === "boomerang") { drawBoomerang(ctx, p, t); return; }
    var st = styleOf(p.wid, p.color), L = st.look, r = p.radius || 6;
    var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1, ang = Math.atan2(p.vy, p.vx);
    var flick = (Math.floor((t || 0) * 14) + ((p.x * 7 + p.y * 3) | 0)) & 1;
    var c = core(st.key, cellsFor(st, r, false), flick);
    var rot = L.spin ? (t || 0) * L.spin + (p.x + p.y) * 0.01 : ang;
    var i, n = low() ? 1 : 3, back = Math.min(0.03, 9 / sp);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    glow(ctx, p.x - (p.vx / sp) * r * 0.6, p.y - (p.vy / sp) * r * 0.6, c.width * 1.15, c.width * 0.95, L.glow, 0.5 + 0.12 * Math.sin((t || 0) * 22 + p.x));
    for (i = n; i >= 1; i--) stamp(ctx, c, p.x - p.vx * back * i, p.y - p.vy * back * i, rot - (L.spin ? i * 0.5 : 0), 1 - i * 0.14, 0.34 - i * 0.08);
    stamp(ctx, c, p.x, p.y, rot, 1, 1);
    ctx.restore();
    trail(st, p.x, p.y, p.vx, p.vy, r, false);
  }

  function drawNova(ctx, p, t) {
    if (p.wid && SHOT_STYLE[p.wid] && SHOT_STYLE[p.wid] !== "sun") { drawFormShot(ctx, p, t, SHOT_STYLE[p.wid]); return; }
    if (p.wid && SHOTS[p.wid]) { drawStyled(ctx, p, t, SHOTS[p.wid]); return; }
    var st = styleOf(p.wid, p.color), L = st.look, r = p.radius || 16, tt = t || 0;
    if (p.wid && SHOT_STYLE[p.wid] === "sun") corona(ctx, st, p.x, p.y, r * 1.25, tt, 9);
    var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
    var pulse = 1 + Math.sin(tt * 11) * 0.08;
    var flick = Math.floor(tt * 12) & 1;
    var cells = Math.max(9, Math.min(30, Math.round(r * 2.3 / CELL)));
    var body = core(st.key, cells, flick);
    var orb = st.look.aspect >= 0.9 ? body : null, i, a, n = 6, k;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    glow(ctx, p.x, p.y, r * 3.4 * pulse, r * 3.4 * pulse, L.glow, 0.62);
    if (!low()) for (i = 3; i >= 1; i--) glow(ctx, p.x - (p.vx / sp) * r * 0.9 * i, p.y - (p.vy / sp) * r * 0.9 * i, r * (2.2 - i * 0.4), r * (2.2 - i * 0.4), L.glow, 0.26 - i * 0.05);
    /* the heart: a round globe in the family's colours, with the family's own shape burning inside */
    k = novaGlobe(st.key, cells + 2, flick);
    stamp(ctx, k, p.x, p.y, tt * 2, pulse, 1);
    if (!orb) stamp(ctx, core(st.key, Math.max(5, Math.round(cells * 0.7)), flick), p.x, p.y, Math.atan2(p.vy, p.vx), pulse, 0.95);
    /* pixel motes circling it */
    for (i = 0; i < n; i++) {
      a = tt * 5 + (TAU * i) / n;
      ctx.fillStyle = i % 2 ? L.pal[2] : L.pal[3];
      ctx.globalAlpha = 0.9;
      ctx.fillRect(Math.round(p.x + Math.cos(a) * r * 1.5 * pulse) - 2, Math.round(p.y + Math.sin(a) * r * 1.05 * pulse) - 2, 4, 4);
    }
    ctx.restore();
    trail(st, p.x, p.y, p.vx, p.vy, r * 1.2, true);
  }

  function novaGlobe(fam, cells, k) {
    var key = "globe|" + fam + "|" + cells + "|" + k;
    if (baked[key]) return baked[key];
    var L = LOOK[fam] || LOOK.fire, c = document.createElement("canvas"), g, x, y, u, v, r, a, d;
    c.width = c.height = cells * CELL;
    g = c.getContext("2d");
    for (y = 0; y < cells; y++) for (x = 0; x < cells; x++) {
      u = ((x + 0.5) / cells) * 2 - 1; v = ((y + 0.5) / cells) * 2 - 1;
      r = Math.sqrt(u * u + v * v); a = Math.atan2(v, u);
      d = 1 - r / (0.9 + 0.08 * Math.sin(a * 6 + k * 1.3));
      if (d <= 0) continue;
      g.fillStyle = d < 0.12 ? L.pal[0] : (d < 0.34 ? L.pal[1] : (d < 0.62 ? L.pal[2] : L.pal[3]));
      g.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
    baked[key] = c;
    return c;
  }

  /* ---------- aura ---------- */
  function drawAura(ctx, x, y, radius, color, t, def) {
    var st = styleOf(def && def.id, color), L = st.look, tt = t || 0;
    var pulse = 1 + Math.sin(tt * 6) * 0.04, R = radius * pulse, i, n, a, s, rr;
    ctx.save();
    glow(ctx, x, y, R * 1.25, R * 1.25, L.glow, 0.2);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = L.pal[1];
    ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
    /* two rings of pixel blocks turning against each other */
    n = Math.max(10, Math.round(R * 0.42));
    for (i = 0; i < n; i++) {
      a = tt * 0.9 + (TAU * i) / n;
      s = i % 3 === 0 ? 4 : 2;
      ctx.globalAlpha = i % 3 === 0 ? 0.95 : 0.6;
      ctx.fillStyle = i % 3 === 0 ? L.pal[3] : L.pal[2];
      ctx.fillRect(Math.round(x + Math.cos(a) * R - s / 2), Math.round(y + Math.sin(a) * R - s / 2), s, s);
    }
    rr = R * 0.7; n = Math.max(6, Math.round(rr * 0.24));
    for (i = 0; i < n; i++) {
      a = -tt * 1.5 + (TAU * i) / n;
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = L.pal[1];
      ctx.fillRect(Math.round(x + Math.cos(a) * rr) - 1, Math.round(y + Math.sin(a) * rr) - 1, 3, 3);
    }
    ctx.restore();
    /* family bits drifting up through it */
    n = rate(10 + radius * 0.12);
    for (i = 0; i < n; i++) {
      a = rnd(0, TAU); rr = Math.sqrt(Math.random()) * R;
      if (st.fam === "dark") add("smoke", x + Math.cos(a) * rr, y + Math.sin(a) * rr, rnd(-6, 6), -rnd(8, 22), rnd(0.4, 0.7), 4, "#2a0f44", { grow: 7 });
      else add("px", x + Math.cos(a) * rr, y + Math.sin(a) * rr, rnd(-8, 8), -rnd(18, 48), rnd(0.3, 0.6), rnd(2, 3.5), pick(L.bits), { add: st.fam !== "slime" && st.fam !== "nature", sway: st.fam === "nature" ? 40 : 0 });
    }
  }

  /* ---------- orbit ---------- */
  function drawOrbitOrb(ctx, x, y, size, color, t, def, cx, cy, ang, radius) {
    var st = styleOf(def && def.id, color), L = st.look, tt = t || 0, s = size || 8, i, a;
    var cells = Math.max(6, Math.round(s * 2.5 / CELL));
    var c = st.look.aspect >= 0.9 ? core(st.key, cells, Math.floor(tt * 10) & 1) : novaGlobe(st.key, cells, Math.floor(tt * 10) & 1);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (cx != null && !low()) {
      /* a fading tail back along the circle */
      for (i = 5; i >= 1; i--) {
        a = ang - i * 0.13;
        ctx.globalAlpha = 0.5 - i * 0.085;
        ctx.fillStyle = i < 3 ? L.pal[2] : L.pal[1];
        var q = Math.max(2, Math.round((s * 1.5 - i * 1.6) / 2) * 2);
        ctx.fillRect(Math.round(cx + Math.cos(a) * radius - q / 2), Math.round(cy + Math.sin(a) * radius - q / 2), q, q);
      }
      ctx.globalAlpha = 1;
    }
    glow(ctx, x, y, s * 2.6, s * 2.6, L.glow, 0.55);
    stamp(ctx, c, x, y, tt * (L.spin || 5), 1, 1);
    ctx.restore();
    if (rate(14) > 0) add("px", x + rnd(-3, 3), y + rnd(-3, 3), rnd(-10, 10), rnd(-10, 10), 0.3, 2.5, pick(L.bits), { add: st.fam !== "slime" && st.fam !== "nature" });
  }

  /* ---------- melee sweep ---------- */
  /* A tapered crescent: fattest just behind the leading edge, a point at each
   * end. Filled as a run of small four-sided pieces, because the game's GL
   * canvas only fills simple convex shapes. */
  function blade(ctx, r, thick, a0, a1) {
    if (a1 - a0 < 0.03) return;
    var i, n = 10, f, a, w, pa = 0, pw = 0, ca, sa, cb, sb;
    for (i = 0; i <= n; i++) {
      f = i / n; a = a0 + (a1 - a0) * f;
      w = thick * Math.pow(Math.sin(Math.PI * Math.pow(f, 1.6)), 0.8);
      if (i) {
        ca = Math.cos(pa); sa = Math.sin(pa); cb = Math.cos(a); sb = Math.sin(a);
        ctx.beginPath();
        ctx.moveTo(ca * r, sa * r);
        ctx.lineTo(cb * r, sb * r);
        ctx.lineTo(cb * (r - w), sb * (r - w));
        ctx.lineTo(ca * (r - pw), sa * (r - pw));
        ctx.closePath();
        ctx.fill();
      }
      pa = a; pw = w;
    }
  }

  function drawArc(ctx, x, y, angle, range, arc, color, lifeRatio, a) {
    var st = styleOf(a && a.wid, color), L = st.look;
    var u = Math.max(0, Math.min(1, lifeRatio == null || isNaN(lifeRatio) ? 0.5 : lifeRatio)), q = 1 - u;
    var lead = -arc / 2 + arc * Math.min(1, q * 2.2 + 0.25);
    var tail = -arc / 2 + arc * Math.max(0, q * 1.6 - 0.6);
    var blades = st.tier >= 2 ? 3 : 1, i, r, th, fade = Math.min(1, u * 3);
    if (tail > lead) tail = lead;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    for (i = 0; i < blades; i++) {
      r = range * (1 - i * 0.26);
      th = Math.max(4, range * (0.15 - i * 0.03));
      /* dark edge first so the cut reads on bright ground, colour, then a white-hot heart */
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.55 * fade;
      ctx.fillStyle = L.pal[0];
      blade(ctx, r + 1.5, th + 3, tail - i * 0.1 - 0.03, lead - i * 0.1 + 0.03);
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = L.pal[1];
      blade(ctx, r, th, tail - i * 0.1, lead - i * 0.1);
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = L.pal[3];
      ctx.globalAlpha = 0.9 * fade;
      blade(ctx, r - 0.5, th * 0.45, tail + (lead - tail) * 0.3 - i * 0.1, lead - i * 0.1);
    }
    ctx.restore();
    /* bits thrown off the leading edge */
    if (q < 0.6) {
      var n = rate(70), wa = angle + lead, px = x + Math.cos(wa) * range * 0.92, py = y + Math.sin(wa) * range * 0.92;
      for (i = 0; i < n; i++) add("px", px + rnd(-4, 4), py + rnd(-4, 4), Math.cos(wa) * rnd(20, 90) + rnd(-20, 20), Math.sin(wa) * rnd(20, 90) + rnd(-20, 20), rnd(0.15, 0.35), rnd(2, 3.5), pick(L.bits), { add: true, drag: 3 });
    }
  }


  /* ---------- signatures and techniques (Nov 18) ----------
   * Beams, chains, strikes and bursts are not bullets: the sim says one
   * happened and the picture plays out here over a fraction of a second. */
  var anims = [];
  function hsh(a, b, c) { var x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return x - Math.floor(x); }
  function q2(v) { return Math.round(v / 2) * 2; }
  function hard(st) { return st.fam !== "slime" && st.fam !== "nature"; }
  function bitsOut(st, x, y, n, s0, s1) {
    spray(n, x, y, 0, Math.PI, s0, s1, function (vx, vy) {
      if (st.key === "data" && Math.random() < 0.5) add("txt", x, y, vx, vy, rnd(0.35, 0.7), rnd(8, 11), pick(st.look.bits), { add: true, drag: 2.5, ch: Math.random() < 0.5 ? "0" : "1" });
      else add("px", x, y, vx, vy, rnd(0.25, 0.6), rnd(2, 4.5), pick(st.look.bits), { add: hard(st), drag: 2.6, grav: hard(st) ? 30 : 160 });
    });
  }

  function kitEvent(e, st) {
    var L = st.look, i, n, cx, cy, px, py, s;
    if (anims.length > 90) anims.splice(anims[0].k === "ult" ? 1 : 0, 1);
    if (e.k === "beam" && e.cone) { blizzard(e, st); return; }
    if (e.k === "beam" && BEAM_FX[e.w] === "bite") { anims.push({ k: "bite", t: 0, max: 0.26, x: e.x, y: e.y, a: e.a || 0, len: e.len || 70, wd: e.wd || 40, st: st }); add("flash", e.x + Math.cos(e.a || 0) * (e.len || 70) * 0.7, e.y + Math.sin(e.a || 0) * (e.len || 70) * 0.7, 0, 0, 0.12, 30, L.glow, { add: true }); return; }
    if (e.k === "beam") {
      anims.push({ k: "beam", t: 0, max: (e.wd || 16) > 30 ? 0.42 : 0.3, x: e.x, y: e.y, a: e.a || 0, len: e.len || 120, wd: e.wd || 16, st: st, jet: BEAM_FX[e.w] ? BEAM_FX[e.w] === "jet" : st.fam === "fire", fist: BEAM_FX[e.w] === "fist" });
      if ((e.wd || 16) > 30) { add("ring", e.x, e.y, 0, 0, 0.3, 6, L.pal[2], { add: true, grow: (e.wd || 16) * 6, len: 4 }); add("flash", e.x, e.y, 0, 0, 0.2, (e.wd || 16) * 2, "#ffffff", { add: true }); }
      cx = Math.cos(e.a || 0); cy = Math.sin(e.a || 0);
      add("flash", e.x + cx * 10, e.y + cy * 10, 0, 0, 0.14, (e.wd || 16) * 2.2, L.glow, { add: true });
      add("ring", e.x + cx * (e.len || 120), e.y + cy * (e.len || 120), 0, 0, 0.24, 3, L.pal[2], { add: true, grow: (e.wd || 16) * 5, len: 2.5 });
      n = Math.round((e.len || 120) / (low() ? 30 : 9));
      for (i = 0; i < n; i++) {
        s = rnd(8, e.len || 120); px = e.x + cx * s; py = e.y + cy * s;
        if (st.fam === "fire") add("px", px, py, cx * rnd(30, 120) + rnd(-20, 20), cy * rnd(30, 120) - rnd(20, 70), rnd(0.25, 0.55), rnd(2, 4.5), pick(L.bits), { add: true, drag: 1.5 });
        else if (st.fam === "holy") add(Math.random() < 0.4 ? "cross" : "px", px, py, -cy * rnd(-60, 60), cx * rnd(-60, 60), rnd(0.25, 0.5), rnd(2, 4), pick(L.bits), { add: true, drag: 3 });
        else add("line", px, py, -cy * rnd(-150, 150) + cx * 60, cx * rnd(-150, 150) + cy * 60, rnd(0.14, 0.3), 1.5, pick(L.bits), { add: true, len: rnd(5, 11), drag: 3 });
      }
      if (st.fam === "fire" && !low()) for (i = 0; i < 4; i++) add("smoke", e.x + cx * rnd(40, e.len), e.y + cy * rnd(40, e.len), rnd(-10, 10), -rnd(14, 30), rnd(0.4, 0.7), 5, "#3a2a2a", { grow: 10 });
    } else if (e.k === "chain") {
      if (!e.pts || e.pts.length < 4) return;
      anims.push({ k: "chain", t: 0, max: 0.2 + 0.045 * (e.pts.length / 2), pts: e.pts, st: st, done: 0, seed: Math.random() * 99, wave: CHAIN_FX[e.w] ? CHAIN_FX[e.w] === "vine" : !(st.fam === "machine" || st.key === "data"), fx: CHAIN_FX[e.w] || "" });
    } else if (e.k === "drop") {
      anims.push({ k: "drop", t: 0, max: e.t || 0.4, x: e.x, y: e.y, r: e.r || 40, up: !!e.up, st: st, w: e.w });
    } else if (e.k === "burst") {
      anims.push({ k: "burst", t: 0, max: 0.42, x: e.x, y: e.y, r: e.r || 60, st: st, seed: Math.random() * TAU });
      add("flash", e.x, e.y, 0, 0, 0.16, (e.r || 60) * 1.3, L.glow, { add: true });
      add("flash", e.x, e.y, 0, 0, 0.09, (e.r || 60) * 0.7, "#ffffff", { add: true });
      bitsOut(st, e.x, e.y, low() ? 6 : 18, (e.r || 60) * 1.2, (e.r || 60) * 3.2);
      spray(low() ? 4 : 10, e.x, e.y, 0, Math.PI, (e.r || 60) * 2.2, (e.r || 60) * 3.6, function (vx, vy) { add("line", e.x, e.y, vx, vy, rnd(0.16, 0.28), 2, pick(L.bits), { add: true, len: rnd(10, 18), drag: 2.2 }); });
    }
  }

  function updateAnims(dt) {
    var i, A, j, L, n, a, d;
    for (i = ground.length - 1; i >= 0; i--) { ground[i].t += dt; if (ground[i].t >= ground[i].max) ground.splice(i, 1); }
    for (i = anims.length - 1; i >= 0; i--) {
      A = anims[i]; A.t += dt; L = A.st.look;
      if (A.k === "ult") ultUpdate(A, dt);
      if (A.k === "charge") {
        /* light falling into the sun as it is gathered */
        n = rate(70);
        for (j = 0; j < n; j++) { a = rnd(0, TAU); d = rnd(50, 90); add("line", A.x + Math.cos(a) * d, A.y + Math.sin(a) * d, -Math.cos(a) * d * 3.2, -Math.sin(a) * d * 3.2, 0.26, 2, pick(L.bits), { add: true, len: rnd(6, 12) }); }
      } else if (A.k === "blizzard") {
        n = rate(90);
        for (j = 0; j < n; j++) { d = rnd(0.05, 1); a = A.a + rnd(-0.5, 0.5) * (A.wd / A.len) * 0.9; add(Math.random() < 0.3 ? "line" : "px", A.x + Math.cos(a) * A.len * d, A.y + Math.sin(a) * A.len * d, Math.cos(a) * rnd(260, 520), Math.sin(a) * rnd(260, 520) + rnd(-20, 20), rnd(0.2, 0.4), rnd(2, 4), pick(L.bits), { add: true, len: rnd(8, 16), sway: 30 }); }
      }
      if (A.k === "chain") {
        /* a spark where the chain lands on each enemy in turn */
        n = A.pts.length / 2 - 1;
        while (A.done < n && A.t >= A.done * 0.045) {
          A.done++;
          j = A.done * 2;
          add("flash", A.pts[j], A.pts[j + 1], 0, 0, 0.14, 20, L.glow, { add: true });
          add("ring", A.pts[j], A.pts[j + 1], 0, 0, 0.2, 2, L.pal[2], { add: true, grow: 70, len: 2 });
          bitsOut(A.st, A.pts[j], A.pts[j + 1], low() ? 2 : 6, 50, 150);
        }
      } else if (A.k === "drop" && A.t < A.max) {
        if (A.up) {
          /* the ground gathers itself */
          n = rate(46);
          for (j = 0; j < n; j++) { a = rnd(0, TAU); d = A.r * rnd(0.7, 1.3); add("px", A.x + Math.cos(a) * d, A.y + Math.sin(a) * d * 0.7, -Math.cos(a) * d * 2.4, -Math.sin(a) * d * 1.7, 0.3, rnd(2, 3.5), pick(L.bits), { add: hard(A.st) }); }
          if (Math.random() < 0.5) add("px", A.x + rnd(-A.r, A.r) * 0.5, A.y + rnd(-4, 4), rnd(-10, 10), -rnd(50, 110), 0.25, 3, L.pal[1], { grav: 420 });
        } else {
          trail(A.st, A.x, A.y - 190 * (1 - (A.t / A.max) * (A.t / A.max)), 0, 420, 9, true);
        }
      }
      if (A.t >= A.max) {
        if (A.k === "drop") landed(A);
        anims.splice(i, 1);
      }
    }
  }

  /* a strike arrives: what comes up out of the ground, or is thrown off it */
  function landed(A) {
    var st = A.st, L = st.look, i, n = low() ? 5 : 14, col = st.fam === "water" || st.fam === "fire" || st.fam === "holy" || st.fam === "dark";
    if (A.up) {
      anims.push({ k: col ? "column" : "spikes", t: 0, max: col ? 0.46 : 0.5, x: A.x, y: A.y, r: A.r, st: st, seed: Math.random() * 99 });
      spray(n, A.x, A.y, -Math.PI / 2, 0.7, 130, 330, function (vx, vy) { add("px", A.x + rnd(-A.r, A.r) * 0.4, A.y, vx, vy, rnd(0.45, 0.85), rnd(2.5, 5), pick(L.bits), { add: hard(st) && st.fam !== "water", grav: 520 }); });
      /* Gomamon's fish come up with the water */
      if (A.w === "fishGeyser") for (i = 0; i < (low() ? 2 : 5); i++) add("fish", A.x + rnd(-10, 10), A.y - 8, rnd(-90, 90), -rnd(230, 330), rnd(0.7, 0.95), 4, pick(["#ff9a3a", "#ffd24a", "#ff6a5a"]), { grav: 620, rot: rnd(0, TAU) });
    } else {
      spray(n, A.x, A.y, -Math.PI / 2, 1.3, 90, 260, function (vx, vy) { add("px", A.x, A.y, vx, vy, rnd(0.4, 0.8), rnd(3, 6), pick([L.pal[0], L.pal[1], L.pal[2]]), { grav: 560 }); });
      add("ring", A.x, A.y, 0, 0, 0.3, A.r * 0.3, L.pal[2], { add: true, grow: A.r * 3.4, len: 4 });
      if (!low()) for (i = 0; i < 5; i++) add("smoke", A.x + rnd(-A.r, A.r) * 0.6, A.y + rnd(-4, 6), rnd(-40, 40), -rnd(8, 26), rnd(0.45, 0.8), 6, "#b8b0a0", { grow: 12, drag: 2 });
    }
  }

  function drawAnims(ctx) {
    var i, A, u;
    if (D.sigFx) D.sigFx.draw(ctx);
    if (!anims.length) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (i = 0; i < anims.length; i++) {
      A = anims[i]; u = Math.min(1, A.t / A.max);
      if (A.k === "beam") drawBeam(ctx, A, u);
      else if (A.k === "chain") drawChain(ctx, A, u);
      else if (A.k === "drop") drawDrop(ctx, A, u);
      else if (A.k === "burst") drawBurst(ctx, A, u);
      else if (A.k === "column") drawColumn(ctx, A, u);
      else if (A.k === "charge") drawCharge(ctx, A, u);
      else if (A.k === "zap") drawZap(ctx, A, u);
      else if (A.k === "blizzard") drawBlizzard(ctx, A, u);
      else if (A.k === "bite") drawBite(ctx, A, u);
      else if (A.k === "ult") ultDraw(ctx, A);
      else if (A.k === "web" || A.k === "seal") drawSeal(ctx, A, u);
      else if (A.k === "spikes") drawSpikes(ctx, A, u);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }

  /* a beam: stacked slabs along the line, four colours deep, rippling toward
   * the tip. Fire opens out into a jet; the rest stay a tight ray. */
  function drawBeam(ctx, A, u) {
    var st = A.st, L = st.look, cone = A.jet != null ? A.jet : st.fam === "fire", seg = 4, lay, i, n, x, f, w, wob, tipK, startK;
    var reach = A.len * Math.min(1, A.t / 0.07), fade = u > 0.5 ? Math.max(0, 1 - (u - 0.5) / 0.5) : 1, thin = 0.35 + 0.65 * fade;
    var FR = [1, 0.78, 0.5, 0.22];
    ctx.save();
    ctx.translate(Math.round(A.x), Math.round(A.y));
    ctx.rotate(A.a);
    if (!low()) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.6 * fade;
      ctx.drawImage(glowSprite(L.glow), -A.wd, -A.wd * (cone ? 2.4 : 1.7), reach + A.wd * 2, A.wd * (cone ? 4.8 : 3.4));
      ctx.globalCompositeOperation = "source-over";
    }
    n = Math.ceil(reach / seg);
    for (lay = 0; lay < 4; lay++) {
      ctx.fillStyle = L.pal[lay];
      ctx.globalAlpha = lay === 0 ? 0.85 * fade : Math.min(1, fade * 1.3);
      for (i = 0; i < n; i++) {
        x = i * seg; f = x / A.len;
        wob = 1 + (cone ? 0.24 : 0.1) * Math.sin(x * 0.24 - A.t * 46 + lay * 0.9) + (cone ? 0.1 * Math.sin(x * 0.61 + A.t * 31) : 0);
        tipK = Math.min(1, (reach - x) / (cone ? 10 : 18));
        startK = Math.min(1, (x + 5) / 12);
        w = A.wd * (cone ? 0.42 + 1.7 * f : 1 - 0.22 * f) * wob * FR[lay] * tipK * startK * thin;
        w = q2(w);
        if (w < 2) { if (lay < 3 || tipK <= 0.2) continue; w = 2; }
        ctx.fillRect(x, -w / 2, seg, w);
      }
    }
    /* bright rungs racing down a tight ray */
    if (!cone && fade > 0.3) {
      ctx.fillStyle = L.pal[3]; ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.8 * fade;
      for (i = 0; i < 4; i++) { x = ((A.t * 900 + i * A.len / 4) % A.len); if (x < reach) ctx.fillRect(q2(x), -q2(A.wd * 0.72) / 2 - 1, 3, q2(A.wd * 0.72) + 2); }
    }
    /* Hand of Fate: a fist of light rides the front of it */
    if (A.fist && fade > 0.2) {
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = Math.min(1, fade * 1.5);
      i = sprite("fist"); x = Math.min(reach, A.len * Math.min(1, A.t / 0.12));
      ctx.drawImage(i, Math.round(x - i.width * 0.6), -i.height / 2);
    }
    ctx.restore();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }

  /* a chain: a jagged (or rippling) line that reaches each enemy in turn,
   * redrawn in a new shape every other frame */
  function drawChain(ctx, A, u) {
    var L = A.st.look, n = A.pts.length / 2 - 1, j, s, steps, x0, y0, x1, y1, dx, dy, d, nx, ny, off, px, py, pass, fr = Math.floor(A.t * 30), amp;
    var fade = u > 0.55 ? Math.max(0, 1 - (u - 0.55) / 0.45) : 1;
    ctx.lineJoin = "miter"; ctx.lineCap = "butt";
    ctx.globalCompositeOperation = "lighter";
    for (pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? L.pal[3] : L.pal[1];
      ctx.lineWidth = pass ? 2 : 6;
      ctx.globalAlpha = (pass ? 1 : 0.7) * fade;
      ctx.beginPath();
      for (j = 0; j < n; j++) {
        if (A.t < j * 0.045) break;
        x0 = A.pts[j * 2]; y0 = A.pts[j * 2 + 1]; x1 = A.pts[j * 2 + 2]; y1 = A.pts[j * 2 + 3];
        dx = x1 - x0; dy = y1 - y0; d = Math.sqrt(dx * dx + dy * dy) || 1; nx = -dy / d; ny = dx / d;
        steps = Math.max(2, Math.round(d / 13));
        amp = Math.min(11, d * 0.16);
        ctx.moveTo(Math.round(x0), Math.round(y0));
        for (s = 1; s < steps; s++) {
          off = A.fx === "slash" ? 0 : (A.wave ? Math.sin(s * 1.5 - A.t * 44 + j) * amp * 0.8 : (hsh(fr, j * 7 + s, A.seed) - 0.5) * 2 * amp);
          px = x0 + dx * s / steps + nx * off; py = y0 + dy * s / steps + ny * off;
          ctx.lineTo(Math.round(px), Math.round(py));
        }
        ctx.lineTo(Math.round(x1), Math.round(y1));
      }
      ctx.stroke();
    }
    /* a hot square on every enemy it has reached (a cross-cut for Hell Masquerade, a leaf for the vines) */
    ctx.fillStyle = L.pal[3]; ctx.globalAlpha = fade;
    for (j = 1; j <= n; j++) {
      if (A.t < (j - 1) * 0.045) break;
      s = 4 + ((fr + j) & 1) * 2;
      ctx.fillRect(Math.round(A.pts[j * 2]) - s / 2, Math.round(A.pts[j * 2 + 1]) - s / 2, s, s);
      if (A.fx === "slash") {
        ctx.strokeStyle = L.pal[3]; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(A.pts[j * 2] - 13, A.pts[j * 2 + 1] - 13); ctx.lineTo(A.pts[j * 2] + 13, A.pts[j * 2 + 1] + 13); ctx.moveTo(A.pts[j * 2] + 13, A.pts[j * 2 + 1] - 13); ctx.lineTo(A.pts[j * 2] - 13, A.pts[j * 2 + 1] + 13); ctx.stroke();
      } else if (A.fx === "vine") {
        ctx.globalCompositeOperation = "source-over";
        stamp(ctx, core(A.st.key, 8, 0), A.pts[j * 2], A.pts[j * 2 + 1], A.t * 9 + j, 1, fade);
        ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = fade;
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }

  /* a strike on its way: a ring of blocks closing on the spot, and either the
   * thing itself falling in or the ground starting to give */
  function drawDrop(ctx, A, u) {
    var st = A.st, L = st.look, i, n = 12, a, R = A.r * (1.3 - 0.3 * u), bs = 4, c, yy, k;
    ctx.globalAlpha = 0.1 + 0.16 * u; ctx.fillStyle = "#06080f";
    ctx.beginPath(); ctx.ellipse(A.x, A.y + 2, A.r * (0.3 + 0.5 * u), A.r * (0.2 + 0.32 * u), 0, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.35 + 0.6 * u;
    for (i = 0; i < n; i++) {
      a = A.t * 4 + (TAU * i) / n;
      ctx.fillStyle = i % 3 ? L.pal[1] : L.pal[3];
      ctx.fillRect(Math.round(A.x + Math.cos(a) * R) - bs / 2, Math.round(A.y + Math.sin(a) * R * 0.72) - bs / 2, bs, bs);
    }
    ctx.globalCompositeOperation = "source-over";
    if (A.up) {
      /* cracks of light where it will come through */
      ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = L.pal[2]; ctx.globalAlpha = 0.25 + 0.75 * u;
      for (i = 0; i < 5; i++) { a = hsh(i, 3, A.r) * TAU; k = A.r * 0.55 * u * (0.5 + hsh(i, 9, A.r)); ctx.fillRect(Math.round(A.x + Math.cos(a) * k * 0.5) - 1, Math.round(A.y + Math.sin(a) * k * 0.36) - 1, q2(Math.abs(Math.cos(a)) * k) + 2, 2); }
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
      return;
    }
    yy = A.y - 190 * (1 - u * u);
    c = core(st.key, Math.max(13, Math.min(24, Math.round(A.r * (L.aspect >= 0.9 ? 0.34 : 0.5)))), Math.floor(A.t * 14) & 1);
    glow(ctx, A.x, yy, c.width * 1.3, c.width * 1.6, L.glow, 0.6);
    for (i = 3; i >= 1; i--) stamp(ctx, c, A.x, yy - i * 13 * (0.4 + u), L.spin ? A.t * L.spin : Math.PI / 2, 1 - i * 0.12, 0.3 - i * 0.07);
    stamp(ctx, c, A.x, yy, L.spin ? A.t * L.spin : Math.PI / 2, 1, 1);
    ctx.globalAlpha = 1;
  }

  /* a shockwave: a ring of blocks thrown out from the partner, a second one
   * behind it, and the move's own shape riding the front */
  function drawBurst(ctx, A, u) {
    var st = A.st, L = st.look, ring, i, n, a, R, bs, e, c, fade;
    for (ring = 0; ring < 2; ring++) {
      e = Math.max(0, Math.min(1, (A.t - ring * 0.07) / 0.3));
      if (e <= 0) continue;
      R = A.r * (1 - (1 - e) * (1 - e));
      fade = Math.max(0, 1 - Math.max(0, (A.t - ring * 0.07 - 0.2) / 0.2));
      n = Math.round(14 + A.r / 5) - ring * 6;
      bs = q2((ring ? 4 : 7) * (1 - 0.45 * e)) || 2;
      ctx.globalCompositeOperation = hard(st) ? "lighter" : "source-over";
      for (i = 0; i < n; i++) {
        a = A.seed + (TAU * i) / n + (ring ? 0.2 : 0) + e * 0.5 * (ring ? -1 : 1);
        ctx.globalAlpha = fade * (ring ? 0.6 : 1);
        ctx.fillStyle = L.pal[1 + ((i + ring) % 3)];
        ctx.fillRect(Math.round(A.x + Math.cos(a) * R) - bs / 2, Math.round(A.y + Math.sin(a) * R) - bs / 2, bs, bs);
        if (!ring && i % 2 === 0) { ctx.globalAlpha = fade * 0.45; ctx.fillRect(Math.round(A.x + Math.cos(a) * R * 0.86) - 1, Math.round(A.y + Math.sin(a) * R * 0.86) - 1, 2, 2); }
      }
    }
    ctx.globalCompositeOperation = "source-over";
    /* the move's own shape, four of them, swept round on the front */
    e = Math.min(1, A.t / 0.3); R = A.r * (1 - (1 - e) * (1 - e)) * 0.82; fade = Math.max(0, 1 - Math.max(0, (A.t - 0.24) / 0.18));
    if (fade > 0 && st.key !== "data") {
      c = core(st.key, 9, Math.floor(A.t * 14) & 1);
      for (i = 0; i < 4; i++) {
        a = A.seed + A.t * 9 + (TAU * i) / 4;
        stamp(ctx, c, A.x + Math.cos(a) * R, A.y + Math.sin(a) * R, a + Math.PI / 2, 1, fade);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* a column out of the ground: water, fire, light */
  function drawColumn(ctx, A, u) {
    var st = A.st, L = st.look, H = A.r * 2.5 * Math.min(1, A.t / 0.1), fade = u > 0.55 ? Math.max(0, 1 - (u - 0.55) / 0.45) : 1, seg = 4, lay, i, n, y, f, w, FR = [1, 0.76, 0.48, 0.2];
    glow(ctx, A.x, A.y - H * 0.5, A.r * 1.3, H * 0.9, L.glow, 0.55 * fade);
    n = Math.ceil(H / seg);
    for (lay = 0; lay < 4; lay++) {
      ctx.fillStyle = L.pal[lay]; ctx.globalAlpha = lay === 0 ? 0.85 * fade : fade;
      for (i = 0; i < n; i++) {
        y = i * seg; f = y / (A.r * 2.5);
        w = q2(A.r * 0.85 * (1 - 0.55 * f) * (1 + 0.16 * Math.sin(y * 0.3 - A.t * 40 + lay)) * FR[lay] * Math.min(1, (H - y) / 10) * (0.5 + 0.5 * fade));
        if (w < 2) continue;
        ctx.fillRect(Math.round(A.x - w / 2 + Math.sin(y * 0.11 + A.t * 22) * 2), Math.round(A.y - y - seg), w, seg);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* spikes out of the ground: roots, rock, ice */
  function drawSpikes(ctx, A, u) {
    var st = A.st, L = st.look, k = u < 0.2 ? u / 0.2 : (u > 0.7 ? Math.max(0, 1 - (u - 0.7) / 0.3) : 1), i, n = 5, x, h, w, y, step = 4, ww;
    for (i = 0; i < n; i++) {
      x = A.x + (i - (n - 1) / 2) * A.r * 0.34 + (hsh(i, 1, A.seed) - 0.5) * 6;
      h = A.r * (1.1 + 1.2 * hsh(i, 2, A.seed)) * (i === 2 ? 1.25 : 1) * k;
      w = 10 + 8 * hsh(i, 3, A.seed);
      for (y = 0; y < h; y += step) {
        ww = q2(w * (1 - y / (h + 0.01))) + 2;
        ctx.globalAlpha = 1;
        ctx.fillStyle = L.pal[0]; ctx.fillRect(Math.round(x - ww / 2) - 1, Math.round(A.y - y - step + (i % 2) * 3), ww + 2, step);
        ctx.fillStyle = L.pal[1]; ctx.fillRect(Math.round(x - ww / 2), Math.round(A.y - y - step + (i % 2) * 3), ww, step);
        ctx.fillStyle = L.pal[2]; ctx.fillRect(Math.round(x - ww / 2), Math.round(A.y - y - step + (i % 2) * 3), Math.max(2, q2(ww * 0.35)), step);
      }
      if (h > 6) { ctx.fillStyle = L.pal[3]; ctx.fillRect(Math.round(x) - 1, Math.round(A.y - h + (i % 2) * 3) - 2, 2, 2); }
    }
    ctx.globalAlpha = 1;
  }

  /* a trap lying on the ground. p.life is all we know: it blinks faster as
   * its time runs out */
  function drawMine(ctx, p, t) {
    var st = styleOf(p.wid, p.color), L = st.look, kind = MINE_STYLE[p.wid] || "orb", tt = t || 0, ph = tt * 3 + (p.x + p.y) * 0.05;
    var blink = p.life < 1.6 ? ((Math.floor(tt * 10) & 1) ? 0.45 : 1) : 1, pulse = 1 + 0.08 * Math.sin(ph * 2), i, a, R, c, x = Math.round(p.x), y = Math.round(p.y);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 0.28; ctx.fillStyle = "#06080f";
    ctx.beginPath(); ctx.ellipse(x, y + 6, 13, 6, 0, 0, TAU); ctx.fill();
    glow(ctx, x, y, 26 * pulse, 20 * pulse, L.glow, 0.42 * blink);
    if (kind === "web") {
      ctx.strokeStyle = L.pal[1]; ctx.lineWidth = 2; ctx.globalAlpha = 0.9 * blink;
      ctx.beginPath();
      for (i = 0; i < 6; i++) { a = (TAU * i) / 6 + 0.26; ctx.moveTo(x, y); ctx.lineTo(Math.round(x + Math.cos(a) * 22), Math.round(y + Math.sin(a) * 15)); }
      ctx.stroke();
      ctx.lineWidth = 1; ctx.strokeStyle = L.pal[3];
      for (R = 8; R <= 20; R += 6) {
        ctx.beginPath();
        for (i = 0; i <= 6; i++) { a = (TAU * i) / 6 + 0.26; ctx[i ? "lineTo" : "moveTo"](Math.round(x + Math.cos(a) * R * pulse), Math.round(y + Math.sin(a) * R * 0.68 * pulse)); }
        ctx.stroke();
      }
      ctx.fillStyle = L.pal[3]; ctx.fillRect(x - 2, y - 2, 4, 4);
      if (Math.random() < 0.04) add("px", x + rnd(-16, 16), y + rnd(-10, 10), 0, -rnd(6, 16), 0.5, 2, "#ffffff", { add: true });
    } else if (kind === "mark") {
      /* a warning sign burnt into the ground: a turning triangle round a hot eye */
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = blink;
      for (R = 0; R < 2; R++) {
        ctx.strokeStyle = R ? L.pal[0] : L.pal[1]; ctx.lineWidth = R ? 2 : 3;
        ctx.beginPath();
        for (i = 0; i <= 3; i++) { a = (R ? -1 : 1) * ph * 0.5 + (TAU * i) / 3 + (R ? Math.PI : 0); ctx[i ? "lineTo" : "moveTo"](Math.round(x + Math.cos(a) * (R ? 11 : 19)), Math.round(y + Math.sin(a) * (R ? 8 : 13.5))); }
        ctx.stroke();
      }
      ctx.fillStyle = L.pal[st.look.shape === "orb" ? 0 : 3];
      i = 4 + (Math.floor(tt * 6) & 1) * 2; ctx.fillRect(x - i / 2, y - i / 2, i, i);
      ctx.globalCompositeOperation = "source-over";
      if (Math.random() < 0.1) add("px", x + rnd(-10, 10), y + rnd(-6, 6), rnd(-6, 6), -rnd(20, 50), rnd(0.3, 0.6), rnd(2, 3), pick(L.bits), { add: true });
    } else if (kind === "puddle") {
      ctx.globalAlpha = 0.95 * blink;
      for (i = 0; i < 3; i++) { ctx.fillStyle = L.pal[i]; ctx.beginPath(); ctx.ellipse(x + (i ? 1 : 0), y + 2 - i, (17 - i * 4.5) * pulse, (9 - i * 2.6) * pulse, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = L.pal[3]; ctx.fillRect(x - 6, y - 2, 3, 2);
      if (Math.random() < 0.06) add("ring", x + rnd(-10, 10), y + rnd(-4, 4), 0, -6, 0.4, 1, L.pal[2], { grow: 9, len: 1.5 });
    } else {
      /* the move's own shape (a bubble, for Bubble Trap), bobbing in place */
      c = core(st.key, kind === "bubble" ? 12 : 9, Math.floor(tt * 6) & 1);
      stamp(ctx, c, x, y - 3 + Math.sin(ph) * 2, kind === "bubble" ? 0 : ph * 0.6, pulse, blink);
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.5 * blink; ctx.fillStyle = L.pal[2];
      for (i = 0; i < 8; i++) { a = -ph * 0.4 + (TAU * i) / 8; ctx.fillRect(Math.round(x + Math.cos(a) * 20) - 1, Math.round(y + 3 + Math.sin(a) * 11) - 1, 2, 2); }
    }
    ctx.restore();
  }

  /* a thrown thing that comes back: spinning hard, with a wheel of afterimages */
  function drawBoomerang(ctx, p, t) {
    var st = styleOf(p.wid, p.color), L = st.look, r = p.radius || 8, tt = t || 0, sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
    var c = core(st.key, Math.max(13, Math.round(r * 1.7)), 0), rot = tt * 17 + (p.x + p.y) * 0.004, i, a;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    glow(ctx, p.x, p.y, c.width * 1.3, c.width * 1.3, L.glow, 0.55);
    for (i = 3; i >= 1; i--) stamp(ctx, c, p.x - (p.vx / sp) * 9 * i, p.y - (p.vy / sp) * 9 * i, rot - i * 0.9, 1 - i * 0.1, 0.34 - i * 0.09);
    /* the blur of its own edge */
    ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = L.pal[2]; ctx.lineWidth = 2; ctx.globalAlpha = 0.55;
    for (i = 0; i < 2; i++) { a = rot * 0.9 + i * Math.PI; ctx.beginPath(); ctx.arc(p.x, p.y, c.width * 0.62, a, a + 1.5); ctx.stroke(); }
    ctx.globalCompositeOperation = "source-over";
    stamp(ctx, c, p.x, p.y, rot, 1, 1);
    ctx.restore();
    trail(st, p.x, p.y, p.vx, p.vy, r, false);
    if (Math.random() < 0.3 && !low()) add("line", p.x, p.y, Math.cos(rot * 3) * 140, Math.sin(rot * 3) * 140, 0.14, 1.5, pick(L.bits), { add: true, len: 8, drag: 3 });
  }


  /* ---------- a form's own shot (Nov 18) ----------
   * Agumon's and Gomamon's lines so far. Small pixel sprites for the things
   * that are things (a missile, a fish, a horn, a torpedo); the fire is built
   * from the flame core. */
  var SPR = {
    missile: { cell: 2, pal: { k: "#1a1420", G: "#8aa0b0", g: "#566a7c", f: "#c8402e", r: "#e8402a", e: "#ffe14a", w: "#ffffff" }, rows: [
      "kk....kkkkkkk..",
      "kfk.kkGGGGGGGkk",
      ".kfkgGGGGGGeGrk",
      ".kffgGGGGGGGGrr",
      ".kfkgGGGGwkwkrk",
      "kfk.kkgggggggkk",
      "kk....kkkkkkk.." ] },
    horn: { cell: 2, pal: { k: "#1a1420", I: "#f4ecd4", i: "#b8a888", w: "#ffffff" }, rows: [
      "kkkk.........",
      "kIIIkkkk.....",
      "kIwwIIIIkkk..",
      "kIIIwwIIIIIkk",
      "kiiIIIIIkkk..",
      "kiiikkkk.....",
      "kkkk........." ] },
    torpedo: { cell: 2, pal: { k: "#1a1420", D: "#3a4a5e", d: "#26323f", f: "#2ac0c8", r: "#e8402a", w: "#c8e8f0" }, rows: [
      "kk...kkkkkkk..",
      "kfkkkDDDDDDDkk",
      ".kfdDwwDDDDDrrk",
      ".kfdDDDDDDDDrrk",
      "kfkkkdddddddkk",
      "kk...kkkkkkk.." ] },
    fish0: { cell: 2, pal: { k: "#1a1420", T: "#e85a1a", B: "#ff9a3a", b: "#ffe0a0", e: "#101820" }, rows: [
      ".k..kkkkk.",
      "kTkkBBBBBk",
      "kTTBBBBBeB",
      "kTkkbbbbbk",
      ".k..kkkkk." ] }
  };
  var FISH_PALS = [null, { T: "#2a6ae0", B: "#5aa8ff", b: "#d0ecff" }, { T: "#d8a010", B: "#ffd84a", b: "#fff6c0" }, { T: "#d04a8a", B: "#ff8ac0", b: "#ffe0f0" }];
  var sprCache = {};
  function sprite(name, swap) {
    var key = name + (swap ? "|" + (swap.B || swap.G) : "");
    if (sprCache[key]) return sprCache[key];
    var S0 = SPR[name], c = document.createElement("canvas"), g, x, y, ch, w = 0;
    for (y = 0; y < S0.rows.length; y++) w = Math.max(w, S0.rows[y].length);
    c.width = w * S0.cell; c.height = S0.rows.length * S0.cell;
    g = c.getContext("2d");
    for (y = 0; y < S0.rows.length; y++) for (x = 0; x < S0.rows[y].length; x++) {
      ch = S0.rows[y].charAt(x);
      if (ch === ".") continue;
      g.fillStyle = (swap && swap[ch]) || S0.pal[ch] || "#f0f";
      g.fillRect(x * S0.cell, y * S0.cell, S0.cell, S0.cell);
    }
    sprCache[key] = c;
    return c;
  }
  function fishSprite(p) { var i = Math.abs(Math.round((p.vx * 13 + p.vy * 7) * 0.37)) % 4; return sprite("fish0", FISH_PALS[i]); }

  /* tongues of flame standing off a ball of fire, turning slowly */
  function corona(ctx, st, x, y, R, tt, n) {
    var i, a, c = core(st.key === "fire" || LOOK[st.key].shape === "flame" ? st.key : "fire", Math.max(7, Math.round(R * 0.5)), Math.floor(tt * 12) & 1), k;
    for (i = 0; i < n; i++) {
      a = tt * 1.6 + (TAU * i) / n; k = 0.75 + 0.3 * Math.sin(tt * 13 + i * 2.1);
      /* the flame core points along +x with its tail behind: turn it so the tail points outward */
      stamp(ctx, c, x + Math.cos(a) * R * 0.92, y + Math.sin(a) * R * 0.92, a + Math.PI, k, 0.9);
    }
  }
  function tail(ctx, c, p, sp, n, gap, wob, tt) {
    var i, bx = -p.vx / sp, by = -p.vy / sp, ang = Math.atan2(p.vy, p.vx), o;
    for (i = n; i >= 1; i--) {
      o = Math.sin(tt * 26 + i * 1.7 + p.x * 0.05) * wob * i;
      stamp(ctx, c, p.x + bx * gap * i - by * o, p.y + by * gap * i + bx * o, ang, 1 - i * (0.7 / (n + 1)), 0.85 - i * (0.6 / (n + 1)));
    }
  }

  function drawFormShot(ctx, p, t, style) {
    var st = styleOf(p.wid, p.color), L = st.look, r = p.radius || 6, tt = t || 0, sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1, ang = Math.atan2(p.vy, p.vx);
    var flick = Math.floor(tt * 14) & 1, c, g, i, k, s, bx = -p.vx / sp, by = -p.vy / sp, left = p.vx < 0;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (style === "fireball") {
      /* Pepper Breath: a tight ball of fire dragging a comet's tail */
      c = core("fire", Math.max(8, Math.round(r * 1.5)), flick);
      g = novaGlobe("fire", Math.max(6, Math.round(r * 1.25)), flick);
      glow(ctx, p.x + bx * r, p.y + by * r, r * 4.2, r * 3.2, L.glow, 0.6);
      tail(ctx, c, p, sp, low() ? 2 : 4, r * 1.05, 0.7, tt);
      stamp(ctx, g, p.x, p.y, tt * 9, 1 + 0.08 * Math.sin(tt * 30), 1);
      ctx.fillStyle = "#ffffff"; ctx.globalAlpha = 0.9; ctx.fillRect(Math.round(p.x) - 2, Math.round(p.y) - 2, 4, 4);
      ctx.restore();
      trail(st, p.x, p.y, p.vx, p.vy, r, false);
      return;
    }
    if (style === "novablast") {
      /* Nova Blast: a boulder of fire, tongues of flame standing off it, smoke pouring behind */
      k = 1 + 0.06 * Math.sin(tt * 12);
      glow(ctx, p.x, p.y, r * 4.4 * k, r * 4.4 * k, L.glow, 0.7);
      if (!low()) for (i = 3; i >= 1; i--) glow(ctx, p.x + bx * r * 1.1 * i, p.y + by * r * 1.1 * i, r * (2.6 - i * 0.5), r * (2.6 - i * 0.5), "#ff5a1a", 0.3 - i * 0.06);
      c = core("fire", Math.max(10, Math.round(r * 1.2)), flick);
      tail(ctx, c, p, sp, low() ? 2 : 4, r * 0.95, 1.1, tt);
      corona(ctx, st, p.x, p.y, r * 1.15, tt, 8);
      stamp(ctx, novaGlobe("fire", Math.round(r * 2.5 / CELL), flick), p.x, p.y, tt * 2.4, k, 1);
      stamp(ctx, novaGlobe("fire", Math.max(5, Math.round(r * 1.2 / CELL)), 1 - flick), p.x - 2, p.y - 2, -tt * 5, k, 0.9);
      ctx.restore();
      trail(st, p.x, p.y, p.vx, p.vy, r * 1.3, true);
      if (!low() && Math.random() < 0.5) add("smoke", p.x + bx * r, p.y + by * r, rnd(-14, 14), -rnd(10, 30), rnd(0.5, 0.9), 7, "#3a2a2a", { grow: 14 });
      return;
    }
    if (style === "missile" || style === "torpedo") {
      /* Harpoon Torpedo is a horn until its shell comes off (the sim speeds it up then) */
      var horn = style === "torpedo" && sp < 250;
      c = sprite(horn ? "horn" : style);
      if (!horn) {
        g = core(style === "missile" ? "fire" : st.key, 9, flick);
        glow(ctx, p.x + bx * (c.width * 0.6), p.y + by * (c.width * 0.6), 20, 16, style === "missile" ? "#ff8a2a" : L.glow, 0.7);
        /* the burn: a flame behind it, pointing the way it is going */
        stamp(ctx, g, p.x + bx * (c.width * 0.5 + 7), p.y + by * (c.width * 0.5 + 7), ang, 0.8 + 0.3 * flick, 0.95);
      }
      ctx.translate(Math.round(p.x), Math.round(p.y));
      ctx.rotate(ang + (horn ? Math.sin(tt * 20) * 0.08 : 0));
      if (left) ctx.scale(1, -1);
      ctx.drawImage(c, -c.width / 2, -c.height / 2);
      ctx.restore();
      if (horn) { if (Math.random() < 0.4) add("line", p.x, p.y, p.vx * 0.3, p.vy * 0.3, 0.16, 1.5, "#ffffff", { add: true, len: 10 }); return; }
      i = rate(style === "missile" ? 40 : 30);
      while (i-- > 0) {
        if (style === "missile") add("smoke", p.x + bx * 14 + rnd(-2, 2), p.y + by * 14 + rnd(-2, 2), bx * 30 + rnd(-10, 10), by * 30 - rnd(4, 16), rnd(0.35, 0.7), 4, pick(["#d8d0c8", "#a8a098", "#6a6460"]), { grow: 12 });
        else add("ring", p.x + bx * 14 + rnd(-3, 3), p.y + by * 14 + rnd(-3, 3), bx * 40 + rnd(-12, 12), by * 40 - rnd(6, 20), rnd(0.3, 0.55), rnd(1, 2), pick(L.bits), { grow: 7, len: 1.5 });
      }
      if (Math.random() < 0.5) add("px", p.x + bx * 12, p.y + by * 12, bx * rnd(60, 140) + rnd(-30, 30), by * rnd(60, 140) + rnd(-30, 30), 0.22, 2.5, style === "missile" ? "#ffc23a" : "#ffffff", { add: true });
      return;
    }
    if (style === "fish") {
      /* Marching Fishes: little fish, each its own colour, swimming with a wriggle */
      c = fishSprite(p);
      glow(ctx, p.x, p.y, 15, 12, L.glow, 0.45);
      ctx.translate(Math.round(p.x), Math.round(p.y));
      ctx.rotate(ang + Math.sin(tt * 22 + p.vx * 0.3) * 0.28);
      if (left) ctx.scale(1, -1);
      ctx.drawImage(c, -c.width / 2, -c.height / 2);
      ctx.restore();
      if (Math.random() < 0.3) add("ring", p.x + bx * 9, p.y + by * 9, rnd(-8, 8), -rnd(8, 22), rnd(0.3, 0.5), 1, pick(L.bits), { grow: 6, len: 1.5 });
      if (Math.random() < 0.25) add("px", p.x + bx * 8, p.y + by * 8 + 4, rnd(-10, 10), rnd(10, 40), 0.25, 2, "#a8f0f0", { grav: 200 });
      return;
    }
    /* foam: a clump of three bubbles tumbling over each other */
    glow(ctx, p.x, p.y, r * 3.4, r * 3.4, L.glow, 0.4);
    for (i = 0; i < 3; i++) {
      k = tt * 7 + i * 2.1 + p.vy * 0.1; s = [1, 0.75, 0.55][i];
      stamp(ctx, core(st.key, 8, flick), p.x + Math.cos(k) * (i ? 5 : 0) + bx * i * 3, p.y + Math.sin(k) * (i ? 5 : 0) + by * i * 3, 0, s, 0.95);
    }
    ctx.restore();
    if (Math.random() < 0.3) add("ring", p.x + rnd(-5, 5), p.y + rnd(-5, 5), rnd(-10, 10), -rnd(6, 18), 0.3, 1, pick(L.bits), { grow: 5, len: 1.5 });
  }

  function formEvent(e, st) {
    var L = st.look, i, a = e.a || 0, n;
    if (anims.length > 60) anims.shift();
    if (e.k === "charge") {
      anims.push({ k: "charge", t: 0, max: e.t || 0.45, x: e.x, y: e.y, r: e.r || 16, st: st });
    } else if (e.k === "split") {
      /* the horn's shell bursts off and the torpedo lights */
      add("flash", e.x, e.y, 0, 0, 0.14, 26, "#ffffff", { add: true });
      add("ring", e.x, e.y, 0, 0, 0.22, 3, "#f4ecd4", { add: true, grow: 110, len: 3 });
      for (i = 0; i < (low() ? 3 : 7); i++) { n = a + (i % 2 ? 1 : -1) * rnd(1.2, 2.2); add("px", e.x, e.y, Math.cos(n) * rnd(70, 170), Math.sin(n) * rnd(70, 170) - 30, rnd(0.4, 0.7), rnd(3, 5.5), pick(["#f4ecd4", "#b8a888", "#ffffff"]), { grav: 380 }); }
      spray(low() ? 2 : 6, e.x, e.y, a + Math.PI, 0.5, 90, 220, function (vx, vy) { add("line", e.x, e.y, vx, vy, 0.2, 2, pick(L.bits), { add: true, len: 12, drag: 3 }); });
    } else if (e.k === "slam") {
      /* the hammer lands */
      add("flash", e.x, e.y, 0, 0, 0.14, 34, L.glow, { add: true });
      add("cross", e.x, e.y, 0, 0, 0.2, 22, "#ffffff", { add: true });
      add("ring", e.x, e.y + 4, 0, 0, 0.26, 4, L.pal[1], { add: true, grow: 170, len: 4 });
      spray(low() ? 4 : 10, e.x, e.y, a, 0.9, 120, 300, function (vx, vy) { add("line", e.x, e.y, vx, vy, rnd(0.14, 0.26), 2, pick(L.bits), { add: true, len: rnd(8, 14), grav: 240 }); });
      spray(low() ? 2 : 6, e.x, e.y, -Math.PI / 2, 1.3, 30, 90, function (vx, vy) { add("px", e.x, e.y + 4, vx, vy, rnd(0.3, 0.5), 3, pick(["#e8dfc4", "#cfc6a8"]), { grav: 300 }); });
    } else if (e.k === "zap") {
      anims.push({ k: "zap", t: 0, max: 0.26, x: e.x, y: e.y, r: e.r || 36, st: st, seed: Math.random() * 99, lean: rnd(-50, 50) });
      add("flash", e.x, e.y, 0, 0, 0.16, (e.r || 36) * 1.8, L.glow, { add: true });
      add("flash", e.x, e.y, 0, 0, 0.08, (e.r || 36) * 1.1, "#ffffff", { add: true });
      add("ring", e.x, e.y, 0, 0, 0.26, 4, L.pal[1], { add: true, grow: (e.r || 36) * 4, len: 3.5 });
      add("ring", e.x, e.y, 0, 0, 0.36, 2, "#5ae0e0", { add: true, grow: (e.r || 36) * 3, len: 2 });
      spray(low() ? 5 : 14, e.x, e.y, -Math.PI / 2, 1.5, 120, 340, function (vx, vy) { add("line", e.x, e.y, vx, vy, rnd(0.14, 0.3), 2, pick(L.bits), { add: true, len: rnd(8, 15), grav: 420 }); });
      if (!low()) for (i = 0; i < 3; i++) add("smoke", e.x + rnd(-10, 10), e.y, rnd(-20, 20), -rnd(14, 34), rnd(0.4, 0.7), 5, "#4a4f58", { grow: 11 });
    } else if (e.k === "erupt") {
      /* stone (or whatever the move is made of) bursting up out of the ground */
      anims.push({ k: "spikes", t: 0, max: 0.55, x: e.x, y: e.y + 6, r: (e.r || 36) * 0.55, st: st, seed: Math.random() * 99 });
      add("ring", e.x, e.y, 0, 0, 0.3, 4, L.pal[2], { add: hard(st), grow: (e.r || 36) * 3.4, len: 3.5 });
      spray(low() ? 4 : 10, e.x, e.y, -Math.PI / 2, 1.2, 100, 280, function (vx, vy) { add("px", e.x, e.y, vx, vy, rnd(0.4, 0.75), rnd(3, 5.5), pick([L.pal[0], L.pal[1], L.pal[2]]), { grav: 560 }); });
      if (!low()) for (i = 0; i < 3; i++) add("smoke", e.x + rnd(-14, 14), e.y + 4, rnd(-30, 30), -rnd(8, 24), rnd(0.4, 0.7), 6, "#b8b0a0", { grow: 11, drag: 2 });
    } else if (e.k === "spike" && e.w !== "arcticBlizzard") {
      impact(st, e.x, e.y, 0, 1);
    } else if (e.k === "spike") {
      /* ice grows on whatever the blizzard catches (once per enemy, not once per gust) */
      for (i = 0; i < anims.length; i++) if (anims[i].k === "spikes" && Math.abs(anims[i].x - e.x) < 14 && Math.abs(anims[i].y - (e.y + 8)) < 14) return;
      anims.push({ k: "spikes", t: 0, max: 0.6, x: e.x, y: e.y + 8, r: Math.max(14, (e.r || 12) * 1.2), st: st, seed: Math.random() * 99 });
      add("ring", e.x, e.y, 0, 0, 0.3, 3, "#d8f4ff", { add: true, grow: 70, len: 2 });
    }
  }

  /* Terra Force being gathered: a sun swelling over the partner's head */
  function drawCharge(ctx, A, u) {
    var st = A.st, L = st.look, R = A.r * (0.25 + 1.0 * u * u), tt = A.t, i, a, flick = Math.floor(tt * 14) & 1;
    glow(ctx, A.x, A.y, R * 4.2, R * 4.2, L.glow, 0.35 + 0.4 * u);
    glow(ctx, A.x, A.y + 34, 40 + 30 * u, 14 + 8 * u, L.glow, 0.3 * u);          /* its light on the ground */
    /* rays turning behind it */
    ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = L.pal[2]; ctx.globalAlpha = 0.5 * u;
    for (i = 0; i < 8; i++) {
      a = tt * 3 + (TAU * i) / 8;
      ctx.save(); ctx.translate(Math.round(A.x), Math.round(A.y)); ctx.rotate(a);
      ctx.fillRect(R * 0.9, -1, R * (1.2 + 0.8 * ((i + flick) % 2)), 2);
      ctx.restore();
    }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    corona(ctx, st, A.x, A.y, R * 1.1, tt, 7);
    stamp(ctx, novaGlobe(st.key, Math.max(5, Math.round(R * 2.3 / CELL)), flick), A.x, A.y, tt * 3, 1, 1);
    ctx.globalAlpha = 1;
  }

  /* Hammer Spark: a bolt out of the sky onto the spot, redrawn jagged every other frame */
  function drawZap(ctx, A, u) {
    var L = A.st.look, fr = Math.floor(A.t * 30), pass, s, steps = 9, x, y, x0 = A.x + A.lean, y0 = A.y - 240, fade = u > 0.4 ? Math.max(0, 1 - (u - 0.4) / 0.6) : 1, b;
    ctx.lineJoin = "miter"; ctx.lineCap = "butt"; ctx.globalCompositeOperation = "lighter";
    for (b = 0; b < 2; b++) {
      for (pass = 0; pass < 3; pass++) {
        ctx.strokeStyle = pass === 0 ? "#2ac0c8" : (pass === 1 ? L.pal[1] : "#ffffff");
        ctx.lineWidth = (pass === 0 ? 10 : (pass === 1 ? 5 : 2)) * (b ? 0.5 : 1);
        ctx.globalAlpha = (pass === 0 ? 0.35 : 0.95) * fade * (b ? 0.7 : 1);
        ctx.beginPath();
        if (!b) {
          ctx.moveTo(Math.round(x0), Math.round(y0));
          for (s = 1; s < steps; s++) ctx.lineTo(Math.round(x0 + (A.x - x0) * s / steps + (hsh(fr, s, A.seed) - 0.5) * 34), Math.round(y0 + (A.y - y0) * s / steps));
          ctx.lineTo(Math.round(A.x), Math.round(A.y));
        } else {
          /* a fork off the middle of it */
          x = x0 + (A.x - x0) * 0.5 + (hsh(fr, 4, A.seed) - 0.5) * 34; y = y0 + (A.y - y0) * 0.5;
          ctx.moveTo(Math.round(x), Math.round(y));
          for (s = 1; s <= 4; s++) ctx.lineTo(Math.round(x + (A.lean > 0 ? -1 : 1) * s * 16 + (hsh(fr, s + 20, A.seed) - 0.5) * 16), Math.round(y + s * 22));
        }
        ctx.stroke();
      }
    }
    /* the ground crackles where it lands */
    ctx.fillStyle = "#ffffff"; ctx.globalAlpha = fade;
    for (s = 0; s < 6; s++) { x = A.x + (hsh(fr, s + 40, A.seed) - 0.5) * A.r * 1.8; y = A.y + (hsh(fr, s + 50, A.seed) - 0.5) * A.r * 0.9; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); ctx.fillRect(Math.round(x) - 4, Math.round(y), 9, 1); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }

  /* Arctic Blizzard: a widening wedge of driven snow, with shards of ice
   * flying down it. Three gusts overlap into one long blow. */
  function blizzard(e, st) {
    anims.push({ k: "blizzard", t: 0, max: 0.34, x: e.x, y: e.y, a: e.a || 0, len: e.len || 220, wd: e.wd || 90, st: st, seed: Math.random() * 99, first: !e.n, howl: BEAM_FX[e.w] === "howl" });
    if (!e.n) add("flash", e.x + Math.cos(e.a || 0) * 14, e.y + Math.sin(e.a || 0) * 14, 0, 0, 0.16, 30, st.look.glow, { add: true });
  }
  function drawBlizzard(ctx, A, u) {
    var st = A.st, L = st.look, seg = 6, i, n, x, f, w, lay, reach = A.len * (A.first ? Math.min(1, A.t / 0.09) : 1), fade = u > 0.55 ? Math.max(0, 1 - (u - 0.55) / 0.45) : Math.min(1, u / 0.15 + (A.first ? 1 : 0.3));
    var c = core(st.key, 9, 0), k, yy;
    ctx.save();
    ctx.translate(Math.round(A.x), Math.round(A.y));
    ctx.rotate(A.a);
    if (!low()) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.4 * fade; ctx.drawImage(glowSprite(L.glow), 0, -A.wd * 0.9, reach * 1.1, A.wd * 1.8); }
    /* the body of the wind: pale slabs, wider the further out */
    ctx.globalCompositeOperation = "lighter";
    n = Math.ceil(reach / seg);
    for (lay = 0; lay < 3; lay++) {
      ctx.fillStyle = [L.pal[1], L.pal[2], "#ffffff"][lay];
      ctx.globalAlpha = [0.15, 0.14, 0.1][lay] * fade;
      for (i = 0; i < n; i++) {
        x = i * seg; f = x / A.len;
        w = q2(A.wd * (0.3 + 0.7 * f) * [1, 0.7, 0.36][lay] * (1 + 0.12 * Math.sin(x * 0.13 - A.t * 40 + lay * 2 + A.seed)) * Math.min(1, (reach - x) / 30));
        if (w >= 2) ctx.fillRect(x, -w / 2, seg, w);
      }
    }
    /* a howl: bars of sound crossing the cone, one after another */
    if (A.howl) {
      ctx.fillStyle = L.pal[2];
      for (i = 0; i < 5; i++) {
        f = (i / 5 + A.t * 2.6) % 1; x = f * A.len;
        if (x > reach) continue;
        w = q2(A.wd * (0.3 + 0.7 * f));
        ctx.globalAlpha = 0.85 * fade * (1 - f * 0.5);
        ctx.fillRect(Math.round(x), -w / 2, 4, w);
        ctx.fillRect(Math.round(x) - 4, -w / 2, 4, 4); ctx.fillRect(Math.round(x) - 4, w / 2 - 4, 4, 4);
      }
      ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      return;
    }
    /* streaks of snow racing down it */
    ctx.fillStyle = L.pal[3];
    for (i = 0; i < (low() ? 10 : 30); i++) {
      f = (hsh(i, 1, A.seed) + A.t * (2.2 + hsh(i, 2, A.seed) * 1.6)) % 1; x = f * A.len;
      if (x > reach) continue;
      yy = (hsh(i, 3, A.seed) - 0.5) * A.wd * (0.3 + 0.7 * f) * 0.9;
      ctx.globalAlpha = (0.5 + 0.5 * hsh(i, 4, A.seed)) * fade;
      ctx.fillRect(Math.round(x), Math.round(yy), 6 + Math.round(hsh(i, 5, A.seed) * 10), 2);
    }
    ctx.globalCompositeOperation = "source-over";
    /* shards of ice tumbling in it */
    for (i = 0; i < (low() ? 3 : 7); i++) {
      f = (hsh(i, 6, A.seed) + A.t * (1.6 + hsh(i, 7, A.seed))) % 1; x = f * A.len;
      if (x > reach) continue;
      yy = (hsh(i, 8, A.seed) - 0.5) * A.wd * (0.3 + 0.7 * f) * 0.8;
      k = 0.7 + hsh(i, 9, A.seed) * 0.7;
      stamp(ctx, c, x, yy, A.t * (8 + i) + i, k, fade);
    }
    ctx.restore();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }


  /* ---------- the other seventeen lines' shots (Nov 18, second pass) ----------
   * A handful of ways to draw a shot, each taking the move's own colours and
   * shape, and a table (SHOTS) saying which move is drawn which way. */
  SPR.pinecone = { cell: 2, pal: { k: "#1a1420", P: "#8a5a2a", p: "#5a3a18", l: "#c89a5a", g: "#5aa83a" }, rows: [
    "..kkk..", ".kgggk.", "kPlPlPk", "kpPlPpk", "kPpPpPk", ".kpPpk.", "..kkk.." ] };
  SPR.card = { cell: 2, pal: { k: "#1a1420", W: "#fff8e0", w: "#d8c8a0", r: "#e03a3a" }, rows: [
    "kkkkkkkkk", "kWWrWrWWk", "kWrrrrrWk", "kWWrWrWWk", "kwwwwwwwk", "kkkkkkkkk" ] };
  SPR.fist = { cell: 2, pal: { k: "#7a5208", Y: "#ffd24a", y: "#e0a020", w: "#fffbe0" }, rows: [
    "..kkkkkkk.", ".kYYwYwYYk", "kYYYYwYwYk", "kyYYYYYYYk", "kyYYwYwYYk", ".kyyYYYYk.", "..kkkkkkk." ] };

  function drawStyled(ctx, p, t, o) {
    var st = styleOf(p.wid, p.color), L = st.look, r = p.radius || 6, tt = t || 0, sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1, ang = Math.atan2(p.vy, p.vx);
    var flick = Math.floor(tt * 14) & 1, bx = -p.vx / sp, by = -p.vy / sp, nx = -by, ny = bx, c, g, i, k, s, a, left = p.vx < 0, ph = (p.vx * 0.31 + p.vy * 0.17);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (o.s === "missile") {
      c = sprite("missile", o.swap); s = o.sc || 1;
      k = o.wob ? Math.sin(tt * 16 + ph) * 0.25 : 0;
      glow(ctx, p.x + bx * 14 * s, p.y + by * 14 * s, 18 * s, 14 * s, "#ff8a2a", 0.65);
      stamp(ctx, core("fire", 8, flick), p.x + bx * (c.width * 0.5 * s + 6), p.y + by * (c.width * 0.5 * s + 6), ang, (0.7 + 0.3 * flick) * s, 0.95);
      ctx.translate(Math.round(p.x), Math.round(p.y)); ctx.rotate(ang + k); if (left) ctx.scale(1, -1); ctx.scale(s, s);
      ctx.drawImage(c, -c.width / 2, -c.height / 2);
      ctx.restore();
      i = rate(34);
      while (i-- > 0) add("smoke", p.x + bx * 12 + rnd(-2, 2), p.y + by * 12 + rnd(-2, 2), bx * 30 + rnd(-10, 10), by * 30 - rnd(4, 16), rnd(0.3, 0.6), 3.5 * s, pick(["#d8d0c8", "#a8a098", L.pal[2]]), { grow: 10 });
      return;
    }
    if (o.s === "sprite") {
      c = sprite(o.spr);
      glow(ctx, p.x, p.y, c.width * 1.4, c.width * 1.4, L.glow, 0.45);
      ctx.translate(Math.round(p.x), Math.round(p.y)); ctx.rotate(o.spin ? tt * o.spin + ph : ang);
      ctx.drawImage(c, -c.width / 2, -c.height / 2);
      ctx.restore();
      if (o.tr === "leaf" && Math.random() < 0.3) add("px", p.x, p.y, rnd(-20, 20), rnd(-10, 30), 0.4, 2.5, pick(["#5aa83a", "#8a5a2a"]), { grav: 120, sway: 30 });
      if (o.tr === "spark" && Math.random() < 0.6) add(Math.random() < 0.4 ? "cross" : "px", p.x + bx * 8, p.y + by * 8, rnd(-20, 20), rnd(-20, 20), 0.3, 3, pick(L.bits), { add: true });
      return;
    }
    if (o.s === "core") {
      /* the move's own shape, thrown: spinning or flying point-first, with afterimages */
      c = core(st.key, Math.max(7, Math.round(r * (o.size || 1.5))), o.spin ? 0 : flick);
      a = o.spin ? tt * o.spin + ph : ang;
      glow(ctx, p.x, p.y, c.width * 1.3, c.width * 1.3, L.glow, 0.5);
      for (i = (o.tail || 0); i >= 1; i--) stamp(ctx, c, p.x + bx * r * 1.3 * i, p.y + by * r * 1.3 * i, a - (o.spin ? i * 0.7 : 0), 1 - i * 0.12, 0.4 - i * 0.1);
      if (o.streak) { ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = L.pal[2]; ctx.lineWidth = 2; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + bx * r * 6, p.y + by * r * 6); ctx.stroke(); ctx.globalCompositeOperation = "source-over"; }
      stamp(ctx, c, p.x, p.y, a, 1, 1);
      ctx.restore();
      if (o.tr === "dust" && Math.random() < 0.5) add("smoke", p.x + bx * r, p.y + by * r + r * 0.6, rnd(-14, 14), -rnd(4, 14), rnd(0.3, 0.55), 4, "#b8a888", { grow: 9 });
      else if (o.tr === "drip" && Math.random() < 0.4) add("px", p.x, p.y, rnd(-10, 10), rnd(10, 40), 0.35, 3, pick(L.bits), { grav: 300 });
      else if (!o.tr) trail(st, p.x, p.y, p.vx, p.vy, r, false);
      return;
    }
    if (o.s === "fire") {
      /* a ball of this line's own fire with a comet's tail */
      k = o.big ? 1.6 : 1;
      c = core(st.key, Math.max(8, Math.round(r * 1.5 * k)), flick);
      g = novaGlobe(st.key, Math.max(6, Math.round(r * 1.25 * k)), flick);
      glow(ctx, p.x + bx * r, p.y + by * r, r * 4.4 * k, r * 3.4 * k, L.glow, 0.6);
      tail(ctx, c, p, sp, low() ? 2 : (o.big ? 5 : 4), r * 1.05 * k, o.big ? 1.3 : 0.7, tt);
      stamp(ctx, g, p.x, p.y, tt * 9, 1 + 0.08 * Math.sin(tt * 30), 1);
      ctx.fillStyle = "#ffffff"; ctx.globalAlpha = 0.9; ctx.fillRect(Math.round(p.x) - 2, Math.round(p.y) - 2, 4, 4);
      if (o.big) { ctx.fillRect(Math.round(p.x + nx * 4 - bx * 2) - 1, Math.round(p.y + ny * 4 - by * 2) - 1, 2, 2); ctx.fillRect(Math.round(p.x - nx * 4 - bx * 2) - 1, Math.round(p.y - ny * 4 - by * 2) - 1, 2, 2); }   /* a spirit's eyes */
      ctx.restore();
      trail(st, p.x, p.y, p.vx, p.vy, r, !!o.big);
      return;
    }
    if (o.s === "orb") {
      k = 1 + 0.07 * Math.sin(tt * 16 + ph);
      glow(ctx, p.x, p.y, r * 4.2, r * 4.2, L.glow, 0.6);
      if (o.wisp) { c = novaGlobe(st.key, Math.max(5, Math.round(r * 1.3 / CELL * 2)), flick); for (i = 4; i >= 1; i--) stamp(ctx, c, p.x + bx * r * 0.9 * i + nx * Math.sin(tt * 9 + i) * 4, p.y + by * r * 0.9 * i + ny * Math.sin(tt * 9 + i) * 4, 0, 1 - i * 0.17, 0.5 - i * 0.1); }
      if (o.petals) for (i = 0; i < 5; i++) { a = tt * 2.5 + (TAU * i) / 5; stamp(ctx, core(st.key, 8, 0), p.x + Math.cos(a) * r * 1.1, p.y + Math.sin(a) * r * 1.1, a, 1, 0.95); }
      stamp(ctx, novaGlobe(st.key, Math.max(6, Math.round(r * 2.3 / CELL)), flick), p.x, p.y, tt * 4, k, 1);
      ctx.globalCompositeOperation = "lighter";
      if (o.ring) { ctx.strokeStyle = L.pal[st.look.shape === "orb" ? 0 : 2]; ctx.lineWidth = 2; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 1.9, r * 0.7, tt * 5 + ph, 0, TAU); ctx.stroke(); }
      if (o.arcs) {
        /* ball lightning: forks jumping off it, new ones every other frame */
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.globalAlpha = 0.9; g = Math.floor(tt * 15);
        ctx.beginPath();
        for (i = 0; i < 4; i++) { a = hsh(g, i, 3) * TAU; s = r * (1.3 + hsh(g, i, 5) * 1.2); ctx.moveTo(p.x, p.y); ctx.lineTo(Math.round(p.x + Math.cos(a + 0.4) * s * 0.5), Math.round(p.y + Math.sin(a + 0.4) * s * 0.5)); ctx.lineTo(Math.round(p.x + Math.cos(a) * s), Math.round(p.y + Math.sin(a) * s)); }
        ctx.stroke();
      }
      if (o.glitch) {
        /* corrupted data: blocks of it tearing sideways */
        g = Math.floor(tt * 20);
        for (i = 0; i < 5; i++) { ctx.fillStyle = L.pal[i % 3]; ctx.globalAlpha = 0.85; ctx.fillRect(Math.round(p.x + (hsh(g, i, 1) - 0.5) * r * 3.4), Math.round(p.y + (hsh(g, i, 2) - 0.5) * r * 2.4), 2 + Math.round(hsh(g, i, 3) * 8), 2); }
      }
      ctx.globalCompositeOperation = "source-over";
      if (o.face) { ctx.fillStyle = "#ffffff"; ctx.globalAlpha = 0.95; ctx.fillRect(Math.round(p.x) - 5, Math.round(p.y) - 3, 3, 3); ctx.fillRect(Math.round(p.x) + 2, Math.round(p.y) - 3, 3, 3); ctx.fillRect(Math.round(p.x) - 3, Math.round(p.y) + 3, 6, 2); }
      ctx.restore();
      trail(st, p.x, p.y, p.vx, p.vy, r, false);
      return;
    }
    if (o.s === "tracer") {
      /* a streak of light with a hot head: needles, pellets, an arrow */
      k = o.big ? 1.7 : 1; s = Math.min(46, sp * 0.06) * k;
      ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "butt";
      ctx.strokeStyle = L.pal[1]; ctx.lineWidth = 5 * k; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + bx * s, p.y + by * s); ctx.stroke();
      ctx.strokeStyle = L.pal[st.look.shape === "orb" ? 0 : 3]; ctx.lineWidth = 2 * k; ctx.globalAlpha = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + bx * s * 0.7, p.y + by * s * 0.7); ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
      if (o.arrow) { c = core(st.key, 10, 0); glow(ctx, p.x, p.y, 30, 30, L.glow, 0.7); ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x + bx * 10 + nx * 8, p.y + by * 10 + ny * 8); ctx.lineTo(p.x, p.y); ctx.lineTo(p.x + bx * 10 - nx * 8, p.y + by * 10 - ny * 8); ctx.stroke(); stamp(ctx, c, p.x + bx * s, p.y + by * s, tt * 10, 0.8, 0.8); }
      else { ctx.fillStyle = "#ffffff"; ctx.fillRect(Math.round(p.x) - 2 * k, Math.round(p.y) - 2 * k, 4 * k, 4 * k); glow(ctx, p.x, p.y, 12 * k, 12 * k, L.glow, 0.6); }
      ctx.restore();
      if (Math.random() < (o.big ? 0.8 : 0.2)) add(o.arrow ? "cross" : "px", p.x + bx * rnd(4, s), p.y + by * rnd(4, s), rnd(-24, 24), rnd(-24, 24), 0.25, o.arrow ? 4 : 2, pick(L.bits), { add: true });
      return;
    }
    if (o.s === "wave") {
      /* a cut that travels: nested arcs facing the way it flies (rings, for Blast Rings) */
      g = o.n || 1;
      ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "butt";
      glow(ctx, p.x, p.y, r * 3, r * 3, L.glow, 0.4);
      for (i = 0; i < g; i++) {
        ctx.save(); ctx.translate(p.x + bx * i * r * 0.55, p.y + by * i * r * 0.55); ctx.rotate(ang);
        k = (1 - i * 0.2) * (o.ring ? 1 + 0.12 * Math.sin(tt * 18 + i) : 1);
        for (s = 0; s < 3; s++) {
          ctx.strokeStyle = L.pal[st.look.shape === "orb" ? 2 - s : s + 1]; ctx.lineWidth = [9, 5, 2][s] * (r > 26 ? 1.6 : 1) * (o.lw || 1); ctx.globalAlpha = [0.55, 0.9, 1][s] * (1 - i * 0.25);
          ctx.beginPath();
          if (o.ring) ctx.ellipse(0, 0, r * 0.42 * k, r * k, 0, 0, TAU);
          else ctx.ellipse(-r * 0.55 * k, 0, r * 0.75 * k, r * 1.05 * k, 0, -1.15, 1.15);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.restore();
      if (Math.random() < 0.7) add("line", p.x + nx * rnd(-r, r), p.y + ny * rnd(-r, r), bx * 90, by * 90, 0.16, 1.5, pick(L.bits), { add: true, len: rnd(6, 12) });
      return;
    }
    if (o.s === "helix") {
      /* two strands of flame winding round each other */
      c = core(st.key, Math.max(8, Math.round(r * 1.1)), flick);
      glow(ctx, p.x, p.y, r * 3.6, r * 3.6, L.glow, 0.5);
      for (i = 5; i >= 0; i--) for (s = -1; s <= 1; s += 2) {
        k = Math.sin(tt * 20 - i * 0.7) * r * 0.95 * s;
        if (s > 0 && i) { ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "#ff8ab0"; ctx.globalAlpha = 0.7 - i * 0.1; ctx.fillRect(Math.round(p.x + bx * i * 7 + nx * k) - 2, Math.round(p.y + by * i * 7 + ny * k) - 2, 4, 4); ctx.globalCompositeOperation = "source-over"; }
        else stamp(ctx, c, p.x + bx * i * 7 + nx * k, p.y + by * i * 7 + ny * k, ang, 1 - i * 0.12, 0.95 - i * 0.14);
      }
      ctx.restore();
      trail(st, p.x, p.y, p.vx, p.vy, r, false);
      return;
    }
    if (o.s === "bird") {
      /* a bird made of fire: a head and two beating wings */
      c = core(st.key, Math.max(12, Math.round(r * 0.9)), flick); k = 0.55 + 0.25 * Math.sin(tt * 16);
      glow(ctx, p.x, p.y, r * 4, r * 4, L.glow, 0.7);
      for (s = -1; s <= 1; s += 2) for (i = 3; i >= 1; i--) stamp(ctx, c, p.x + bx * i * r * 0.42 + nx * s * i * r * 0.42 * (0.6 + k), p.y + by * i * r * 0.42 + ny * s * i * r * 0.42 * (0.6 + k), ang - s * (0.5 + k * 0.5), 1.05 - i * 0.14, 0.95);
      tail(ctx, c, p, sp, 3, r * 0.6, 0.6, tt);
      stamp(ctx, novaGlobe(st.key, Math.max(6, Math.round(r * 0.9 / CELL)), flick), p.x, p.y, 0, 1, 1);
      stamp(ctx, c, p.x - bx * r * 0.5, p.y - by * r * 0.5, ang, 0.8, 1);
      ctx.restore();
      trail(st, p.x, p.y, p.vx, p.vy, r, true);
      return;
    }
    if (o.s === "tornado") {
      /* a funnel: rings stacked wider toward the top, flames riding round it */
      glow(ctx, p.x, p.y - r * 0.8, r * 3.4, r * 4.4, L.glow, 0.6);
      for (i = 0; i < 9; i++) {
        k = i / 8; s = r * (0.25 + 0.85 * k); a = Math.sin(tt * 7 + i * 0.8) * r * 0.16;
        ctx.globalAlpha = 0.85; ctx.fillStyle = L.pal[1 + (i + flick) % 2];
        ctx.fillRect(Math.round(p.x + a - s), Math.round(p.y + r * 0.5 - i * r * 0.26), Math.round(s * 2), Math.max(3, Math.round(r * 0.2)));
        ctx.fillStyle = L.pal[3]; ctx.globalAlpha = 0.9;
        g = (tt * 3.4 + i * 0.37) % 1;
        ctx.fillRect(Math.round(p.x + a - s + g * s * 2) - 3, Math.round(p.y + r * 0.5 - i * r * 0.26), 6, Math.max(3, Math.round(r * 0.2)));
      }
      c = core(st.key, 10, flick);
      for (i = 0; i < 4; i++) { a = tt * 8 + (TAU * i) / 4; k = 0.3 + 0.2 * i; stamp(ctx, c, p.x + Math.cos(a) * r * (0.4 + k), p.y + r * 0.4 - k * r * 1.9 + Math.sin(a) * 4, -Math.PI / 2, 0.9, Math.sin(a) > -0.3 ? 1 : 0.35); }
      ctx.restore();
      i = rate(40);
      while (i-- > 0) add("px", p.x + rnd(-r, r), p.y + rnd(-r * 1.6, r * 0.5), rnd(-60, 60), -rnd(60, 160), rnd(0.3, 0.6), rnd(2, 4), pick(L.bits), { add: true });
      return;
    }
    if (o.s === "net") {
      /* a web opening as it flies */
      s = r * 1.7; ctx.translate(Math.round(p.x), Math.round(p.y)); ctx.rotate(tt * 6 + ph);
      ctx.strokeStyle = L.pal[1]; ctx.lineWidth = 2; ctx.globalAlpha = 0.95;
      ctx.beginPath();
      for (i = 0; i < 6; i++) { a = (TAU * i) / 6; ctx.moveTo(0, 0); ctx.lineTo(Math.round(Math.cos(a) * s), Math.round(Math.sin(a) * s)); }
      ctx.stroke();
      ctx.strokeStyle = L.pal[3]; ctx.lineWidth = 1;
      for (k = 0.5; k <= 1; k += 0.5) { ctx.beginPath(); for (i = 0; i <= 6; i++) { a = (TAU * i) / 6; ctx[i ? "lineTo" : "moveTo"](Math.round(Math.cos(a) * s * k), Math.round(Math.sin(a) * s * k)); } ctx.stroke(); }
      ctx.restore();
      return;
    }
    /* foam: bubbles (one big one for Boom Bubble, a spark inside for Static Bubble) */
    c = core(LOOK[st.key].shape === "bubble" ? st.key : "bubble", o.one ? Math.max(12, Math.round(r * 1.6)) : 8, flick);
    glow(ctx, p.x, p.y, r * 3.6, r * 3.6, L.glow, 0.5);
    for (i = 0; i < (o.one ? 1 : 3); i++) {
      k = tt * 7 + i * 2.1 + ph; s = [1, 0.75, 0.55][i];
      stamp(ctx, c, p.x + Math.cos(k) * (i ? 5 : 0) + bx * i * 3, p.y + Math.sin(k) * (i ? 5 : 0) + by * i * 3, 0, s * (o.one ? 1 + 0.1 * Math.sin(tt * 20) : 1), 0.95);
    }
    if (o.spark) { ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = flick ? "#fff68a" : "#ffffff"; ctx.fillRect(Math.round(p.x) - 4, Math.round(p.y) - 1, 8, 2); ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 4, 2, 8); }
    if (o.one) { ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.globalAlpha = 0.6; for (i = 1; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(p.x + bx * i * 9, p.y + by * i * 9, 3, r * (1 - i * 0.25), ang, 0, TAU); ctx.stroke(); } }
    ctx.restore();
    if (Math.random() < 0.25) add("ring", p.x + rnd(-5, 5), p.y + rnd(-5, 5), rnd(-10, 10), -rnd(6, 18), 0.3, 1, pick(L.bits), { grow: 5, len: 1.5 });
  }

  /* Hot Bite: two rows of teeth closing on the spot */
  function drawBite(ctx, A, u) {
    var L = A.st.look, shut = Math.min(1, u / 0.45), gap = (1 - shut) * 26 + 3, i, n = 5, w = A.wd / n, x0 = A.len * 0.45, fade = u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1, h, j;
    ctx.save(); ctx.translate(Math.round(A.x), Math.round(A.y)); ctx.rotate(A.a + Math.PI / 2);
    glow(ctx, 0, -A.len * 0.7, A.wd * 1.6, A.wd * 1.2, L.glow, 0.5 * fade);
    for (j = -1; j <= 1; j += 2) for (i = 0; i < n; i++) {
      /* a tooth: a stepped triangle, pointing at the other jaw */
      for (h = 0; h < 5; h++) {
        ctx.globalAlpha = fade; ctx.fillStyle = h < 1 ? L.pal[st2(L)] : (h < 3 ? "#fff6e0" : "#ffffff");
        ctx.fillRect(Math.round(-A.wd / 2 + i * w + h * w * 0.1), Math.round(-A.len * 0.7 + j * (gap + (4 - h) * 4)) - 2, Math.max(2, Math.round(w * (1 - h * 0.2))), 4);
      }
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function st2(L) { return L.shape === "orb" ? 2 : 1; }

  /* what a net or a talisman leaves where it lands: a web, or a seal of light */
  function drawSeal(ctx, A, u) {
    var L = A.st.look, R = A.r * Math.min(1, u / 0.18), fade = u > 0.5 ? 1 - (u - 0.5) / 0.5 : 1, i, a, k;
    ctx.save(); ctx.translate(Math.round(A.x), Math.round(A.y));
    if (A.k === "web") {
      ctx.rotate(A.seed);
      ctx.strokeStyle = L.pal[1]; ctx.lineWidth = 2; ctx.globalAlpha = fade;
      ctx.beginPath(); for (i = 0; i < 8; i++) { a = (TAU * i) / 8; ctx.moveTo(0, 0); ctx.lineTo(Math.round(Math.cos(a) * R), Math.round(Math.sin(a) * R * 0.75)); } ctx.stroke();
      ctx.strokeStyle = L.pal[3]; ctx.lineWidth = 1;
      for (k = 0.34; k <= 1; k += 0.33) { ctx.beginPath(); for (i = 0; i <= 8; i++) { a = (TAU * i) / 8; ctx[i ? "lineTo" : "moveTo"](Math.round(Math.cos(a) * R * k), Math.round(Math.sin(a) * R * 0.75 * k)); } ctx.stroke(); }
    } else {
      ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = L.pal[2]; ctx.lineWidth = 2; ctx.globalAlpha = fade;
      ctx.beginPath(); ctx.ellipse(0, 0, R, R, 0, 0, TAU); ctx.stroke();
      for (k = 0; k < 2; k++) { ctx.strokeStyle = k ? "#ffffff" : L.pal[1]; ctx.beginPath(); for (i = 0; i <= 4; i++) { a = (k ? -1 : 1) * A.t * 3 + A.seed + (TAU * i) / 4 + k * 0.785; ctx[i ? "lineTo" : "moveTo"](Math.round(Math.cos(a) * R * 0.94), Math.round(Math.sin(a) * R * 0.94)); } ctx.stroke(); }
      ctx.fillStyle = "#ffffff"; ctx.fillRect(-2, -8, 4, 16); ctx.fillRect(-8, -2, 16, 4);
    }
    ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }


  /* ---------- Mega ultimates (Nov 18) ----------
   * The sim says one started (ult.start: where, what shape of ground, what it
   * leaves); the whole show plays here. The field darkens while it is
   * gathered and the outline of the ground it will hit is marked, then it goes
   * off in its own way, and what it leaves on the ground (drawGround) stays
   * for minutes: it is painted once, small, and drawn blown up so it sits in
   * the same chunky pixels as everything else. */
  var ground = [], MARK_PX = 3;
  function ult(e) {
    var st = styleOf(e.w, null), polys = e.polys || [], P0 = polys[0], pr = null, i, per = [], k, q, n, x0, y0, x1, y1, d, s;
    /* a shape drawn round the partner: how far it reaches in each direction */
    if (P0 && P0.polar && polys.length === 1) { pr = []; for (i = 0; i < P0.pts.length; i += 2) pr.push(Math.sqrt(Math.pow(P0.pts[i] - P0.cx, 2) + Math.pow(P0.pts[i + 1] - P0.cy, 2))); }
    /* points walked along every outline, for the marker */
    for (k = 0; k < polys.length; k++) {
      q = polys[k].pts; n = q.length / 2;
      for (i = 0; i < n; i++) {
        x0 = q[i * 2]; y0 = q[i * 2 + 1]; x1 = q[((i + 1) % n) * 2]; y1 = q[((i + 1) % n) * 2 + 1]; d = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0));
        for (s = 0; s < d; s += 26) per.push(x0 + (x1 - x0) * s / d, y0 + (y1 - y0) * s / d);
      }
    }
    anims.push({ k: "ult", t: 0, max: e.windup + e.spread + 0.55, x: e.x, y: e.y, r: e.r, a: e.a || 0, wu: e.windup, sp: e.spread, pat: e.pat, pop: e.pop, sty: e.style, st: st, w: e.w, seed: Math.random() * 99, fired: false, popT: 0, polys: polys, pr: pr, per: per, discs: e.discs, popI: 0 });
    if (e.mark) { ground.push(bakeMark(e, st)); if (ground.length > 6) ground.shift(); }
  }
  function reach(A, a) { if (!A.pr) return A.r; var n = A.pr.length, i = Math.round((((a % TAU) + TAU) % TAU) / TAU * n) % n; return A.pr[i]; }
  function ultUpdate(A, dt) {
    var L = A.st.look, n, j, a, d, x, y, P;
    if (A.t < A.wu) {
      n = rate(110);
      for (j = 0; j < n; j++) { a = rnd(0, TAU); d = rnd(120, 300); add("line", A.x + Math.cos(a) * d, A.y - 50 + Math.sin(a) * d, -Math.cos(a) * d * 3, -Math.sin(a) * d * 3, 0.3, 2, pick(L.bits), { add: true, len: rnd(8, 18) }); }
      return;
    }
    if (!A.fired) {
      A.fired = true;
      add("flash", A.x, A.y, 0, 0, 0.35, A.r * 1.3, L.glow, { add: true });
      add("flash", A.x, A.y, 0, 0, 0.18, A.r * 0.8, "#ffffff", { add: true });
      if (!A.discs && A.pat !== "cannon" && A.pat !== "wall") for (j = 0; j < 3; j++) add("ring", A.x, A.y, 0, 0, 0.5 + j * 0.15, 20, L.pal[1 + j % 3], { add: true, grow: A.r * (2.6 - j * 0.5), len: 8 - j * 2 });
      spray(low() ? 16 : 60, A.x, A.y, 0, Math.PI, A.r * 0.8, A.r * 2.6, function (vx, vy) { add(Math.random() < 0.3 ? "line" : "px", A.x, A.y, vx, vy, rnd(0.4, 0.9), rnd(3, 6), pick(L.bits), { add: true, len: rnd(10, 20), drag: 1.6 }); });
    }
    if (A.t > A.wu + A.sp) return;
    /* things going off all over the ground it covers while it lasts */
    if (A.pop) {
      A.popT += dt * (A.discs ? A.polys.length * 1.6 : (low() ? 10 : 30)) / Math.max(0.3, A.sp);
      while (A.popT >= 1) {
        A.popT -= 1;
        if (A.discs) { P = A.polys[A.popI++ % A.polys.length]; a = rnd(0, TAU); d = A.popI <= A.polys.length ? 0 : rnd(0, 60); x = P.cx + Math.cos(a) * d; y = P.cy + Math.sin(a) * d; }
        else { a = rnd(0, TAU); d = reach(A, a) * Math.sqrt(Math.random()) * 0.92; x = A.x + Math.cos(a) * d; y = A.y + Math.sin(a) * d; }
        if (A.pop === "zap") formEvent({ k: "zap", x: x, y: y, r: A.discs ? 90 : 46 }, A.st);
        else if (A.pop === "erupt") formEvent({ k: "erupt", x: x, y: y, r: 54 }, A.st);
        else if (A.pop === "spike") { anims.push({ k: "spikes", t: 0, max: 0.9, x: x, y: y, r: 26, st: A.st, seed: Math.random() * 99 }); add("ring", x, y, 0, 0, 0.3, 3, "#d8f4ff", { add: true, grow: 80, len: 2 }); }
        else { add("line", x - 60, y - 220, 420, 1500, 0.14, 4, "#ffffff", { add: true, len: 40 }); boom(A.st, x, y, -Math.PI / 2, A.discs ? 84 : 48); }
      }
    }
    if (A.pat === "gale") {
      n = rate(260);
      for (j = 0; j < n; j++) { a = rnd(0, TAU); d = reach(A, a); add(Math.random() < 0.5 ? "line" : "px", A.x + Math.cos(a) * d * rnd(0.02, 0.4), A.y + Math.sin(a) * d * rnd(0.02, 0.4), Math.cos(a + 0.3) * d * 1.7, Math.sin(a + 0.3) * d * 1.7, rnd(0.25, 0.5), rnd(2, 5), pick(L.bits), { add: true, len: rnd(10, 22) }); }
    }
  }
  function ultDraw(ctx, A) {
    var st = A.st, L = st.look, t = A.t, w, f, i, n, a, R, e, k, x, y, lt, bs, fade, c, P;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (t < A.wu) {
      w = t / A.wu;
      ctx.globalAlpha = 0.5 * Math.min(1, w * 3); ctx.fillStyle = "#05060c"; ctx.fillRect(A.x - 2400, A.y - 1600, 4800, 3200);
      /* the ground it will hit, outlined: lights running round the edge */
      ctx.globalCompositeOperation = "lighter"; n = A.per.length / 2; k = Math.floor(t * 14);
      for (i = 0; i < n; i++) { ctx.globalAlpha = (0.25 + 0.6 * w) * (((i + k) % 4) ? 0.45 : 1); ctx.fillStyle = L.pal[1 + i % 3]; ctx.fillRect(Math.round(A.per[i * 2]) - 4, Math.round(A.per[i * 2 + 1]) - 4, 8, 8); }
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
      drawCharge(ctx, { x: A.x, y: A.y - (A.pat === "impact" ? 96 : 54), r: A.pat === "impact" ? 52 : 30, t: t, st: st }, w);
      ctx.restore(); return;
    }
    f = Math.min(1, (t - A.wu) / A.sp); fade = 1 - Math.max(0, (t - A.wu - A.sp) / 0.55);
    ctx.globalAlpha = 0.5 * (1 - f); ctx.fillStyle = "#05060c"; ctx.fillRect(A.x - 2400, A.y - 1600, 4800, 3200);
    if (t - A.wu < 0.14) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.6 * (1 - (t - A.wu) / 0.14); ctx.fillStyle = "#ffffff"; ctx.fillRect(A.x - 2400, A.y - 1600, 4800, 3200); ctx.globalCompositeOperation = "source-over"; }
    ctx.globalAlpha = 1;
    glow(ctx, A.x, A.y, A.r * 2.2, A.r * 2.2, L.glow, 0.45 * fade * (1 - f * 0.5));
    if (A.pat === "impact" || A.pat === "rings") {
      /* walls of blocks rolling out to the edge of its ground, whatever shape that is */
      n = A.pat === "rings" ? 4 : 2;
      ctx.globalCompositeOperation = "lighter";
      for (k = 0; k < n; k++) {
        e = Math.max(0, Math.min(1, (f * (1 + n * 0.22) - k * 0.22)));
        if (e <= 0) continue;
        bs = q2(16 - 8 * e) || 4;
        for (i = 0; i < 72; i++) {
          a = (TAU * i) / 72; R = reach(A, a) * (1 - (1 - e) * (1 - e));
          ctx.globalAlpha = fade * (k ? 0.7 : 1); ctx.fillStyle = L.pal[1 + (i + k) % 3];
          ctx.fillRect(Math.round(A.x + Math.cos(a) * R) - bs / 2, Math.round(A.y + Math.sin(a) * R) - bs / 2, bs, bs);
          if (i % 2 === 0) { ctx.globalAlpha = fade * 0.4; ctx.fillRect(Math.round(A.x + Math.cos(a) * R * 0.93) - 3, Math.round(A.y + Math.sin(a) * R * 0.93) - 3, 6, 6); }
        }
      }
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
      if (A.pat === "impact" && f < 1) { corona(ctx, st, A.x, A.y, 70 * (1 + f), t, 10); stamp(ctx, novaGlobe(st.key, 34, Math.floor(t * 14) & 1), A.x, A.y, t * 3, 1.5 * (1 - f * 0.6), 1 - f); }
    } else if (A.pat === "orbs") {
      /* a pillar on every one of its strikes */
      for (i = 0; i < A.polys.length; i++) {
        P = A.polys[i]; lt = (t - A.wu) - (i * 0.618 % 1) * A.sp * 0.8;
        if (lt > 0 && lt < 0.6) { drawColumn(ctx, { x: P.cx, y: P.cy + 40, r: 96, st: st, t: lt }, lt / 0.6); glow(ctx, P.cx, P.cy, 300, 300, L.glow, 0.5 * (1 - lt / 0.6)); }
      }
    } else if (A.pat === "gale") {
      /* the wind itself: streaks and the move's own shapes thrown outward, as far as its ground goes that way */
      ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = L.pal[3];
      for (i = 0; i < (low() ? 30 : 100); i++) {
        k = (hsh(i, 1, A.seed) + f * 1.4) % 1; a = hsh(i, 2, A.seed) * TAU + k * 0.5; R = k * reach(A, a);
        ctx.save(); ctx.translate(Math.round(A.x + Math.cos(a) * R), Math.round(A.y + Math.sin(a) * R)); ctx.rotate(a + 0.3);
        ctx.globalAlpha = fade * (0.4 + 0.6 * hsh(i, 3, A.seed)) * Math.min(1, (1 - k) * 4); ctx.fillRect(0, -1, 14 + Math.round(hsh(i, 4, A.seed) * 22), 3);
        ctx.restore();
      }
      ctx.globalCompositeOperation = "source-over";
      c = core(st.key, 12, 0);
      for (i = 0; i < (low() ? 8 : 30); i++) { k = (hsh(i, 6, A.seed) + f * 1.2) % 1; a = hsh(i, 7, A.seed) * TAU + k * 0.6; R = k * reach(A, a); stamp(ctx, c, A.x + Math.cos(a) * R, A.y + Math.sin(a) * R, t * (6 + i % 5) + i, 0.8 + hsh(i, 8, A.seed) * 0.9, fade * Math.min(1, (1 - k) * 4)); }
    } else if (A.pat === "sweep" || A.pat === "spokes") {
      n = A.pat === "sweep" ? 1 : 6;
      if (f < 1 || fade > 0.5) for (i = 0; i < n; i++) {
        a = A.pat === "sweep" ? A.a + f * TAU : A.a + i * TAU / 6;
        if (A.pat === "sweep") { ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = L.pal[1]; ctx.lineWidth = 26; for (k = 1; k <= 6; k++) { ctx.globalAlpha = 0.16 * (1 - k / 7) * fade; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(A.x + Math.cos(a - k * 0.1) * A.r, A.y + Math.sin(a - k * 0.1) * A.r); ctx.stroke(); } ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; }
        drawBeam(ctx, { x: A.x, y: A.y, a: a, len: A.pat === "sweep" ? A.r * 1.08 : A.r * 1.4 * Math.min(1, f * 3 + 0.1), wd: A.pat === "sweep" ? 84 : 46, st: st, t: 0.1 + (t % 0.1), jet: false }, 0.2 + 0.6 * (1 - fade));
        if (Math.random() < 0.8) add("px", A.x + Math.cos(a) * rnd(30, A.r), A.y + Math.sin(a) * rnd(30, A.r), rnd(-90, 90), rnd(-90, 90), 0.3, rnd(2, 5), pick(L.bits), { add: true });
      }
    } else if (A.pat === "cannon") {
      /* everything it has, straight ahead: a beam as wide as its ground (several, fanned, for a cone) */
      P = A.polys[0]; n = P.pts.length > 12 ? 5 : 1;
      R = Math.sqrt(Math.pow(P.cx - A.x, 2) + Math.pow(P.cy - A.y, 2)) * 1.9;
      if (f < 1 || fade > 0.4) for (i = 0; i < n; i++) {
        a = A.a + (n > 1 ? (i - 2) * 0.22 : 0);
        drawBeam(ctx, { x: A.x, y: A.y, a: a, len: R * Math.min(1, f * 2.5 + 0.15), wd: n > 1 ? 110 : 250, st: st, t: 0.1 + (t % 0.1), jet: false }, 0.15 + 0.7 * (1 - fade));
      }
      i = rate(120);
      while (i-- > 0) { k = rnd(0, R); add("line", A.x + Math.cos(A.a) * k + rnd(-110, 110) * Math.sin(A.a), A.y + Math.sin(A.a) * k - rnd(-110, 110) * Math.cos(A.a), Math.cos(A.a) * 700, Math.sin(A.a) * 700, 0.2, 3, pick(L.bits), { add: true, len: rnd(14, 30) }); }
    } else if (A.pat === "spiral" && f < 1) {
      /* four of them winding outward: fox spirits, or tornadoes */
      for (i = 0; i < 4; i++) {
        a = A.a + i * TAU / 4 + f * 5.2; R = reach(A, A.a + i * TAU / 4) * f; x = A.x + Math.cos(a) * R; y = A.y + Math.sin(a) * R;
        drawStyled(ctx, { x: x, y: y, vx: -Math.sin(a) * 300 + Math.cos(a) * 120, vy: Math.cos(a) * 300 + Math.sin(a) * 120, radius: A.sty === "tornado" ? 34 : 20, wid: A.w }, t, A.sty === "tornado" ? { s: "tornado" } : { s: "fire", big: 1 });
      }
    } else if (A.pat === "wall" && f < 1) {
      /* one cut, travelling the length of its lane */
      k = -0.2 * A.r + 2.2 * A.r * f;
      drawStyled(ctx, { x: A.x + Math.cos(A.a) * k, y: A.y + Math.sin(A.a) * k, vx: Math.cos(A.a) * 500, vy: Math.sin(A.a) * 500, radius: A.r * 0.6, wid: A.w }, t, { s: "wave", n: 3, lw: 5 });
    }
    ctx.restore();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }

  /* What it leaves on the ground. Painted once into a small canvas (one
   * pixel = MARK_PX on screen) in the shape of the ground it hit:
   *   ice     a sheet of it: pale, cracked, glinting, white at the edge
   *   scorch  burnt black, with ash (ring: only round the rim)
   *   crater  scorched ground with a hole in the middle (small: a hole per strike)
   *   rubble  broken, lifted stone        gash   a dark trench with a hot line down it
   *   glow    ground still shining        bloom  grass and petals */
  function bakeMark(e, st) {
    var polys = e.polys, L = st.look, m = e.mark, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, k, i, q, c, g, S = MARK_PX, w, h, n, x, y, r, a, j, pk, seed = Math.random() * 99;
    for (k = 0; k < polys.length; k++) for (q = polys[k].pts, i = 0; i < q.length; i += 2) { x0 = Math.min(x0, q[i]); x1 = Math.max(x1, q[i]); y0 = Math.min(y0, q[i + 1]); y1 = Math.max(y1, q[i + 1]); }
    x0 -= 18; y0 -= 18; x1 += 18; y1 += 18; w = Math.ceil((x1 - x0) / S); h = Math.ceil((y1 - y0) / S);
    c = document.createElement("canvas"); c.width = w; c.height = h; g = c.getContext("2d");
    function path(only) { var kk, ii, p; g.beginPath(); for (kk = 0; kk < polys.length; kk++) { if (only != null && kk !== only) continue; p = polys[kk].pts; g.moveTo((p[0] - x0) / S, (p[1] - y0) / S); for (ii = 2; ii < p.length; ii += 2) g.lineTo((p[ii] - x0) / S, (p[ii + 1] - y0) / S); g.closePath(); } }
    function dots(nn, cols, s0, s1, al) { var d; for (d = 0; d < nn; d++) { g.globalAlpha = al * (0.4 + 0.6 * Math.random()); g.fillStyle = cols[d % cols.length]; r = s0 + Math.floor(Math.random() * (s1 - s0 + 1)); g.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), r, Math.max(1, r - (d % 2))); } }
    function hole(cx, cy, rr) {
      g.globalAlpha = 0.85; g.fillStyle = "#0e0a08"; g.beginPath(); g.ellipse(cx, cy, rr, rr * 0.68, 0, 0, TAU); g.fill();
      g.fillStyle = "#050302"; g.beginPath(); g.ellipse(cx, cy + rr * 0.06, rr * 0.66, rr * 0.42, 0, 0, TAU); g.fill();
      g.fillStyle = "#4a3828"; g.globalAlpha = 0.95;
      for (j = 0; j < Math.max(10, rr * 1.4); j++) { a = Math.random() * TAU; g.fillRect(Math.round(cx + Math.cos(a) * rr * (0.96 + Math.random() * 0.14)), Math.round(cy + Math.sin(a) * rr * 0.68 * (0.96 + Math.random() * 0.14)), 1 + (j % 2), 1 + ((j >> 1) % 2)); }
      g.strokeStyle = "#2a1c12"; g.lineWidth = 1; g.globalAlpha = 0.8;
      for (j = 0; j < 9; j++) { a = (TAU * j) / 9 + seed; g.beginPath(); g.moveTo(cx, cy); for (i = 1; i <= 5; i++) g.lineTo(cx + Math.cos(a + (Math.random() - 0.5) * 0.6) * rr * 0.34 * i, cy + Math.sin(a + (Math.random() - 0.5) * 0.6) * rr * 0.23 * i); g.stroke(); }
    }
    g.imageSmoothingEnabled = false;
    /* each outline is filled on its own, so two that overlap do not cancel */
    for (pk = 0; pk < polys.length; pk++) {
    path(pk); g.save(); g.clip();
    if (m.k === "ice") {
      g.globalAlpha = 0.86; g.fillStyle = "#a8d8f4"; g.fillRect(0, 0, w, h);
      dots(w * h / 26, ["#c8ecff", "#d8f4ff", "#8cc4ec"], 2, 6, 0.6);
      dots(w * h / 160, ["#ffffff"], 1, 2, 0.95);
      /* cracks, and long glints of light lying across it */
      g.strokeStyle = "#f4fcff"; g.lineWidth = 1;
      for (j = 0; j < w * h / 2600; j++) { x = Math.random() * w; y = Math.random() * h; g.globalAlpha = 0.5 + Math.random() * 0.4; g.beginPath(); g.moveTo(x, y); for (i = 0; i < 4; i++) { x += (Math.random() - 0.5) * 26; y += (Math.random() - 0.5) * 18; g.lineTo(x, y); } g.stroke(); }
      g.fillStyle = "#ffffff";
      for (j = 0; j < w * h / 1800; j++) { x = Math.floor(Math.random() * w); y = Math.floor(Math.random() * h); n = 4 + Math.floor(Math.random() * 10); g.globalAlpha = 0.35; for (i = 0; i < n; i++) g.fillRect(x + i, y - Math.floor(i / 2), 1, 1); }
    } else if (m.k === "scorch" || m.k === "crater") {
      g.globalAlpha = m.ring ? 0.0 : 0.6; g.fillStyle = "#14100c"; g.fillRect(0, 0, w, h);
      if (!m.ring) { dots(w * h / 22, ["#0a0806", "#1e1610", "#2a2018"], 2, 7, 0.55); dots(w * h / 120, ["#6a6258", "#8a8278", "#3a3028"], 1, 2, 0.7); }
    } else if (m.k === "rubble") {
      g.globalAlpha = 0.5; g.fillStyle = "#3a3026"; g.fillRect(0, 0, w, h);
      for (j = 0; j < w * h / 60; j++) { x = Math.floor(Math.random() * w); y = Math.floor(Math.random() * h); r = 2 + Math.floor(Math.random() * 5); g.globalAlpha = 0.9; g.fillStyle = "#1c1610"; g.fillRect(x, y + 1, r, r - 1); g.fillStyle = pick(["#8a7a62", "#a89878", "#6a5c48"]); g.fillRect(x, y, r, r - 1); g.fillStyle = "#c8b898"; g.fillRect(x, y, r, 1); }
    } else if (m.k === "gash") {
      g.globalAlpha = 0.72; g.fillStyle = "#0c0808"; g.fillRect(0, 0, w, h);
      dots(w * h / 30, ["#050303", "#1a1010"], 2, 6, 0.6);
      dots(w * h / 90, [L.pal[1], L.pal[2]], 1, 2, 0.5);
    } else if (m.k === "bloom") {
      g.globalAlpha = 0.45; g.fillStyle = "#3a8a3a"; g.fillRect(0, 0, w, h);
      dots(w * h / 30, ["#4aa84a", "#2a6a2a", "#6ac86a"], 1, 3, 0.7);
      dots(w * h / 26, [L.pal[1], L.pal[2], "#ffffff", L.pal[1]], 1, 2, 0.95);
    } else {
      g.globalAlpha = 0.3; g.fillStyle = L.pal[1]; g.fillRect(0, 0, w, h);
      dots(w * h / 40, [L.pal[2], "#ffffff"], 1, 3, 0.5);
    }
    g.restore();
    }
    /* the edge: ragged white for ice, charred for burns, bright for light */
    path(); g.lineJoin = "miter";
    g.globalAlpha = m.k === "ice" ? 0.95 : (m.k === "glow" ? 0.8 : 0.7);
    g.strokeStyle = m.k === "ice" ? "#ffffff" : (m.k === "glow" || m.k === "bloom" ? L.pal[2] : (m.k === "rubble" ? "#a89878" : "#080605"));
    g.lineWidth = m.ring ? 14 : (m.k === "ice" ? 3 : 2); g.stroke();
    if (m.ring) { path(); g.globalAlpha = 0.5; g.strokeStyle = "#2a2018"; g.lineWidth = 5; g.stroke(); }
    if (m.k === "gash") { g.globalAlpha = 0.9; g.strokeStyle = L.pal[1]; g.lineWidth = 2; g.beginPath(); g.moveTo((e.x - x0) / S, (e.y - y0) / S); g.lineTo((polys[0].cx * 2 - e.x - x0) / S, (polys[0].cy * 2 - e.y - y0) / S); g.stroke(); }
    if (m.k === "crater") { if (m.small) for (k = 0; k < polys.length; k++) hole((polys[k].cx - x0) / S, (polys[k].cy - y0) / S, 20); else hole((e.x - x0) / S, (e.y - y0) / S, e.r * 0.36 / S); }
    return { c: c, x: x0, y: y0, w: w * S, h: h * S, t: -(e.windup + 0.12), max: m.time, k: m.k, st: st, cx: e.x, cy: e.y, r: e.r, polys: polys, hot: m.k === "crater" || m.k === "scorch" || m.k === "gash" };
  }
  /* ---------- 17z33: marks big moves leave, and their light at night ----------
   * A blast, burst, slam or eruption from an Ultimate or Mega move, or any hit of a big (wound-up) move,
   * leaves a mark on the ground for a few seconds. Each element's mark is its own SHAPE, not just its own
   * colour, so they read for colour-blind players too:
   *   fire     a charred blotch with glowing embers        ice      a six-spoked frost star
   *   water    a wet ring                                  dark     a stain with curling tendrils
   *   holy     a ring with a cross                         machine  forked cracks with bright tips
   *   nature   scattered leaves                            slime    a splat with drips
   *   wind     curved scuffs                               beast    three claw gouges
   * Baked once per element, size and variant (art pixels, x3). At most 24 at once (8, and shorter, with
   * reduced effects). Looks only. */
  var marks = [], markCv = {}, MARK_LIFE = 5, MARK_ART = 3;
  var MARK_K = { boom: 1, burst: 1, slam: 1, erupt: 1, zap: 1 };
  function maybeMark(e, st) {
    var big = !!(e.w && D.isBigMove && D.isBigMove(e.w)), r, i, m, cap = low() ? 8 : 24;
    var tier = Math.max(st.tier || 0, (e.w && D.SIG_INFO && D.SIG_INFO[e.w] && D.SIG_INFO[e.w].tier) || 0);
    if (!(MARK_K[e.k] && (big || tier >= 4 || (e.r || 0) >= 50)) && !(big && e.k === "hit")) return;
    r = Math.max(18, Math.min(70, e.k === "hit" ? 22 : (e.r || 40) * 0.75));
    /* one mark per spot: a multi-hit move does not stack ten on one enemy */
    for (i = marks.length - 1; i >= 0; i--) { m = marks[i]; if (m.t < 0.6 && Math.abs(m.x - e.x) < r * 0.6 && Math.abs(m.y - e.y) < r * 0.6) return; }
    if (marks.length >= cap) marks.shift();
    marks.push({ x: e.x, y: e.y, r: r, fam: MARK_SHAPE[st.fam] ? st.fam : "beast", st: st, t: 0, max: low() ? MARK_LIFE * 0.6 : MARK_LIFE, v: (Math.random() * 3) | 0 });
  }
  function markRng(seed) { var x = seed | 0 || 1; return function () { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff; }; }
  function bakeMark(fam, R, v, st) {
    var key = fam + "|" + R + "|" + v + "|" + (st.look.glow || ""), c = markCv[key], g, N, rnd2, pal = st.look.pal, P;
    if (c) return c;
    N = R * 2 + 3; c = document.createElement("canvas"); c.width = c.height = N; g = c.getContext("2d");
    rnd2 = markRng(R * 131 + v * 977 + fam.length * 31);
    function px(x, y, col, a) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= N || y >= N) return; g.globalAlpha = a == null ? 1 : a; g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    function line(x0, y0, x1, y1, col, a, w) { var n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))), i, k; for (i = 0; i <= n; i++) for (k = 0; k < (w || 1); k++) px(x0 + (x1 - x0) * i / n + k * 0.7, y0 + (y1 - y0) * i / n, col, a); }
    function disc(cx, cy, rr, col, a) { var x, y; for (y = -rr; y <= rr; y++) for (x = -rr; x <= rr; x++) if (x * x + y * y <= rr * rr) px(cx + x, cy + y, col, a); }
    var C = R + 1, i, a, k, x, y, rr;
    MARK_SHAPE[fam](px, line, disc, C, R, rnd2, pal, st);
    markCv[key] = c;
    return c;
  }
  var MARK_SHAPE = {
    fire: function (px, line, disc, C, R, r, pal) {            /* charred blotch, ember specks */
      var i, a, d;
      for (i = 0; i < 6; i++) { a = r() * 6.28; d = r() * R * 0.45; disc(C + Math.cos(a) * d, C + Math.sin(a) * d * 0.7, Math.max(2, R * (0.3 + r() * 0.25)), "#1c120c", 0.55); }
      for (i = 0; i < R; i++) { a = r() * 6.28; d = r() * R * 0.8; px(C + Math.cos(a) * d, C + Math.sin(a) * d * 0.7, r() < 0.5 ? "#ff9a2a" : "#ffd060", 1); }
    },
    ice: function (px, line, disc, C, R, r, pal) {             /* six-spoked frost star with side branches */
      var i, a, L, bx, by;
      disc(C, C, Math.max(2, R * 0.22), "#d8f0ff", 0.5);
      for (i = 0; i < 6; i++) {
        a = i / 6 * 6.28 + r() * 0.2; L = R * (0.75 + r() * 0.2);
        line(C, C, C + Math.cos(a) * L, C + Math.sin(a) * L * 0.75, "#eaf8ff", 0.9);
        bx = C + Math.cos(a) * L * 0.55; by = C + Math.sin(a) * L * 0.55 * 0.75;
        line(bx, by, bx + Math.cos(a + 0.7) * L * 0.25, by + Math.sin(a + 0.7) * L * 0.25 * 0.75, "#b8e2ff", 0.85);
        line(bx, by, bx + Math.cos(a - 0.7) * L * 0.25, by + Math.sin(a - 0.7) * L * 0.25 * 0.75, "#b8e2ff", 0.85);
      }
    },
    water: function (px, line, disc, C, R, r, pal) {           /* wet ring: a darker damp patch, a bright rim */
      var a; disc(C, C, R * 0.8, "#0c2a3c", 0.3);
      for (a = 0; a < 6.28; a += 0.5 / R) px(C + Math.cos(a) * R * 0.8, C + Math.sin(a) * R * 0.8 * 0.72, "#9adcff", 0.8);
      for (a = 0; a < 6.28; a += 0.9 / R) px(C + Math.cos(a) * R * 0.5, C + Math.sin(a) * R * 0.5 * 0.72, "#6ab8e8", 0.5);
    },
    dark: function (px, line, disc, C, R, r, pal) {            /* a stain with curling tendrils */
      var i, k, a, x, y; disc(C, C, R * 0.4, "#1a0a26", 0.6);
      for (i = 0; i < 5; i++) { a = r() * 6.28; x = C; y = C; for (k = 0; k < R * 0.9; k++) { a += 0.12 * (i % 2 ? 1 : -1); x += Math.cos(a); y += Math.sin(a) * 0.75; px(x, y, k < R * 0.6 ? "#2a1040" : "#6a2aa0", 0.75); } }
    },
    holy: function (px, line, disc, C, R, r, pal) {            /* a thin ring with a cross */
      var a; for (a = 0; a < 6.28; a += 0.5 / R) px(C + Math.cos(a) * R * 0.75, C + Math.sin(a) * R * 0.75 * 0.75, "#ffe58a", 0.9);
      line(C - R * 0.5, C, C + R * 0.5, C, "#fff4c0", 0.9); line(C, C - R * 0.45, C, C + R * 0.45, "#fff4c0", 0.9);
      px(C, C, "#ffffff", 1);
    },
    machine: function (px, line, disc, C, R, r, pal) {         /* forked cracks with bright tips */
      var i, k, a, x, y, nx, ny;
      for (i = 0; i < 4; i++) { a = i / 4 * 6.28 + r(); x = C; y = C; for (k = 0; k < 4; k++) { a += (r() - 0.5) * 1.1; nx = x + Math.cos(a) * R * 0.24; ny = y + Math.sin(a) * R * 0.24 * 0.75; line(x, y, nx, ny, "#14141c", 0.75); x = nx; y = ny; } px(x, y, "#c8f4ff", 1); px(x + 1, y, "#ffffff", 0.8); }
    },
    nature: function (px, line, disc, C, R, r, pal) {          /* scattered little leaves */
      var i, a, d, x, y; for (i = 0; i < 7; i++) { a = r() * 6.28; d = r() * R * 0.8; x = C + Math.cos(a) * d; y = C + Math.sin(a) * d * 0.75; px(x, y, "#3a8a26", 1); px(x + 1, y, "#5ab83a", 1); px(x + 1, y - 1, "#8ad860", 1); px(x + 2, y - 1, "#3a8a26", 1); }
    },
    slime: function (px, line, disc, C, R, r, pal) {           /* a splat with drips */
      var i, a, d; disc(C, C, R * 0.38, pal ? pal[1] : "#6ad04a", 0.6);
      for (i = 0; i < 5; i++) { a = r() * 6.28; d = R * (0.5 + r() * 0.35); disc(C + Math.cos(a) * d, C + Math.sin(a) * d * 0.75, Math.max(1, R * 0.1), pal ? pal[2] : "#9af07a", 0.7); }
    },
    wind: function (px, line, disc, C, R, r, pal) {            /* curved scuffs */
      var i, a, a0; for (i = 0; i < 3; i++) { a0 = r() * 6.28; for (a = 0; a < 2.2; a += 0.6 / R) px(C + Math.cos(a0 + a) * R * (0.35 + i * 0.22), C + Math.sin(a0 + a) * R * (0.35 + i * 0.22) * 0.75, "#e8f0f4", 0.6); }
    },
    beast: function (px, line, disc, C, R, r, pal) {           /* three claw gouges */
      var i, o; for (i = -1; i <= 1; i++) { o = i * R * 0.28; line(C - R * 0.55 + o, C - R * 0.45, C + R * 0.35 + o, C + R * 0.45, "#2a1a0e", 0.7, 2); line(C - R * 0.55 + o + 1, C - R * 0.45 - 1, C + R * 0.35 + o + 1, C + R * 0.45 - 1, "#c8a878", 0.45); }
    }
  };
  MARK_SHAPE.bubble = MARK_SHAPE.water;
  function updateMarks(dt) { var i; for (i = marks.length - 1; i >= 0; i--) { marks[i].t += dt; if (marks[i].t >= marks[i].max) marks.splice(i, 1); } }
  function drawMarks(ctx) {
    var i, m, c, R, al, sz;
    if (!marks.length) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (i = 0; i < marks.length; i++) {
      m = marks[i]; R = Math.max(5, Math.round(m.r / MARK_ART));
      c = bakeMark(m.fam, R, m.v, m.st); sz = c.width * MARK_ART;
      al = Math.min(1, m.t / 0.15) * Math.min(1, (m.max - m.t) / 1.5);
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = al;
      ctx.drawImage(c, Math.round(m.x - sz / 2), Math.round(m.y - sz / 2), sz, sz);
      /* fire's embers and holy's ring still glow for the first moment */
      if ((m.fam === "fire" || m.fam === "holy" || m.fam === "machine") && m.t < 1.6 && !low()) {
        ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = al * 0.45 * (1 - m.t / 1.6);
        ctx.drawImage(glowSprite(m.st.look.glow), m.x - m.r, m.y - m.r * 0.7, m.r * 2, m.r * 1.4);
        light(m.x, m.y, m.r * 2, m.st.look.glow, 1 - m.t / 1.6);
      }
    }
    ctx.restore();
  }
  /* light: bright moves keep their glow over the night wash, like the holograms. Every frame the shots and
     flashes drawn note a light; game.js calls drawLights right after the wash and the list starts over. */
  var lights = [], LIT = { fire: 1, holy: 1, machine: 1, ice: 1, bubble: 0 };
  function light(x, y, r, col, a) { if (lights.length < 80 && a > 0.05) lights.push(x, y, r, col, a); }
  function shotLight(p) {
    var st = styleOf(p.wid, p.color);
    if (LIT[st.fam]) light(p.x, p.y, Math.max(26, (p.radius || 6) * 5), st.look.glow, 0.8);
  }
  function drawLights(ctx, dark) {
    var i;
    if (dark > 0.05 && !low() && lights.length) {
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.imageSmoothingEnabled = true;
      for (i = 0; i < lights.length; i += 5) {
        ctx.globalAlpha = Math.min(1, lights[i + 4]) * dark * 0.55;
        ctx.drawImage(glowSprite(lights[i + 3]), lights[i] - lights[i + 2] / 2, lights[i + 1] - lights[i + 2] / 2, lights[i + 2], lights[i + 2]);
      }
      ctx.restore();
    }
    lights.length = 0;
  }

  function drawGround(ctx) {
    var i, g, L, al, P, a, d;
    drawMarks(ctx);
    for (i = 0; i < ground.length; i++) {
      g = ground[i]; if (g.t < 0) continue;
      L = g.st.look; al = Math.min(1, g.t / 0.3) * Math.min(1, (g.max - g.t) / 12);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = al;
      ctx.drawImage(g.c, Math.round(g.x), Math.round(g.y), g.w, g.h);
      /* still hot for the first while */
      if (g.hot && g.t < 45 && !low()) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = al * 0.5 * (1 - g.t / 45) * (0.8 + 0.2 * Math.sin(g.t * 5)); ctx.drawImage(glowSprite(L.glow), g.cx - g.r * 0.5, g.cy - g.r * 0.34, g.r, g.r * 0.68); }
      ctx.restore();
      /* a glint on the ice, an ember off the burn, a mote off the light, now and then */
      if (Math.random() < (g.k === "ice" ? 0.5 : (g.hot && g.t < 60 ? 0.35 : (g.k === "glow" ? 0.3 : 0)))) {
        P = g.polys[Math.floor(Math.random() * g.polys.length)]; a = rnd(0, TAU); d = Math.random();
        a = Math.floor(Math.random() * (P.pts.length / 2));
        if (g.k === "ice") add("cross", P.cx + (P.pts[a * 2] - P.cx) * d, P.cy + (P.pts[a * 2 + 1] - P.cy) * d, 0, 0, rnd(0.25, 0.5), rnd(3, 6), "#ffffff", { add: true });
        else add("px", P.cx + (P.pts[a * 2] - P.cx) * d, P.cy + (P.pts[a * 2 + 1] - P.cy) * d, rnd(-8, 8), -rnd(20, 60), rnd(0.5, 1), rnd(2, 4), pick(L.bits), { add: true });
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }

  /* attack drawing lives here only (the old copies in sprites.js were removed in 17c) */
  S.drawProjectile = drawProjectile;
  S.drawNova = drawNova;
  S.drawAura = drawAura;
  S.drawOrbitOrb = drawOrbitOrb;
  S.drawArc = drawArc;

  /* a little puff where a foot comes down */
  function dust(x, y, big) {
    var n = low() ? 1 : (big ? 4 : 2), i;
    for (i = 0; i < n; i++) add("px", x + rnd(-5, 5), y + rnd(-1, 2), rnd(-22, 22), -rnd(6, 22), rnd(0.22, 0.42), big ? rnd(2.5, 4.5) : rnd(2, 3), pick(["#e8dfc4", "#cfc6a8", "#f4eedc"]), { drag: 3, grav: 30 });
  }

  D.attackFx = {
    dust: dust,
    event: event, update: update, draw: draw, styleOf: styleOf, ult: ult, drawGround: drawGround, drawLights: drawLights, clear: function () { parts.length = 0; anims.length = 0; marks.length = 0; lights.length = 0; if (D.sigFx) D.sigFx.clear(); },
    _marks: function () { return marks; },
    /* the marks ultimates leave last minutes: they go only when a new run starts */
    clearGround: function () { ground.length = 0; },
    count: function () { return parts.length; }, LOOK: LOOK,
    /* the drawing kit, for sig-fx.js */
    _k: { add: add, spray: spray, core: core, stamp: stamp, glow: glow, glowSprite: glowSprite, rnd: rnd, pick: pick, low: low, rate: rate, q2: q2, hsh: hsh,
      SHAPES: SHAPES, LOOK: LOOK, sprite: sprite, claws: claws, bitsOut: bitsOut, trail: trail, impact: impact, boom: boom, styleOf: styleOf, TAU: TAU, CELL: CELL,
      partCount: function () { return parts.length; } },
    /* the little sprite of a move that has one (the missile, a fish, the torpedo), for its icon */
    shotSprite: function (id) { var s = SHOT_STYLE[id], o = SHOTS[id]; if (o && o.s === "missile") return sprite("missile", o.swap); if (o && o.s === "sprite") return sprite(o.spr); return s === "missile" || s === "torpedo" ? sprite(s) : (s === "fish" ? sprite("fish0") : null); }
  };
})(typeof window !== "undefined" ? window : this);
