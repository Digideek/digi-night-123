/* Digi Night — every signature move looks like itself (17z33 move revamp).
 *
 * Before this, the 364 signature moves were drawn by seven generic drawers (one per kind: shot,
 * burst, beam, strike, trap, boomerang, chain) with the line's colours and a shape, so all 54
 * bursts were the same ring of blocks in a different colour. Now each move gets a recipe:
 *
 *   motif   what it is made of: a bubble, a petal, a feather, a snowflake, a rock, a note, a skull...
 *   pal     its colours (from its name first: "Frost", "Mud", "Spark"; else its line's element)
 *   form    how its kind plays out: a burst can bloom like a flower, crack the ground, spin into a
 *           vortex, ring out as sound; a beam can be a ray, a drill, a helix, a rake of claws, a charge
 *           with afterimages; a strike can be a meteor, a rain, a dive, a pillar, a geyser, spikes...
 *   motion  how a shot flies (straight, swaying, corkscrewing, fluttering, hopping, comet-tailed)
 *   trail, impact, cast   what it leaves behind, what a hit looks like, the wind-up
 *
 * The recipe comes from the move's name and description (a "Bubble" move is made of bubbles and
 * pops; a "Quake" cracks the ground), then a resolver makes sure no two moves anywhere share the
 * same kind + form + motif + colours, and that two moves of the same kind in one line never share
 * a form or a motif. A move that grows out of another (SIG_INFO.up) is drawn bigger and with more
 * layers the further up the chain it is ("grand").
 *
 * Everything here is cosmetic and runs on each screen by itself from the sim's fx events.
 * moves-gallery.html shows every move, line by line.
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});

  /* ---------- colours ---------- pal: outline, body, light, hot core; glow; bits */
  var PAL = {
    ember:   [["#7a1406", "#ff5a14", "#ffb02a", "#fff2b8"], "#ff7a24"],
    blaze:   [["#6a0a1a", "#ff2a3a", "#ff9a2a", "#fff0a0"], "#ff4a2a"],
    blueflame: [["#0a2a7a", "#2a7aff", "#9ad8ff", "#ffffff"], "#4a9aff"],
    frost:   [["#24508a", "#6ab8f0", "#c8ecff", "#ffffff"], "#80ccff"],
    snow:    [["#6a8ab8", "#d0e4ff", "#f4faff", "#ffffff"], "#e0f0ff"],
    aqua:    [["#1a4a9a", "#3a8af0", "#8ad0ff", "#e8f8ff"], "#4aa7ff"],
    tide:    [["#0a4a5a", "#1ab0b8", "#8af0e8", "#e8fffa"], "#3ad8d0"],
    leaf:    [["#1e5216", "#4eb030", "#b0e870", "#f0ffd0"], "#6ac844"],
    bloom:   [["#8a1a5a", "#ff5aa8", "#ffb8e0", "#fff0f8"], "#ff7ac0"],
    pollen:  [["#7a5a0a", "#f0c020", "#fff070", "#ffffe0"], "#ffe04a"],
    earth:   [["#3a2410", "#8a5a2a", "#c89a5a", "#f0dcb0"], "#c8945a"],
    stone:   [["#2e2e36", "#6a6a78", "#a8a8b4", "#e8e8f0"], "#b0b0c0"],
    mud:     [["#2a1a0a", "#6a4a22", "#a88050", "#d8c090"], "#a88050"],
    steel:   [["#2a3644", "#7a8aa0", "#d0dcea", "#ffffff"], "#b8d0ff"],
    spark:   [["#6a5a00", "#ffd800", "#fff47a", "#ffffff"], "#ffe84a"],
    plasma:  [["#2a0a6a", "#7a3aff", "#5af0ff", "#ffffff"], "#8a6aff"],
    holy:    [["#b07a10", "#ffd84a", "#fff4b0", "#ffffff"], "#ffe27a"],
    sun:     [["#a04a00", "#ff9a00", "#ffe060", "#ffffff"], "#ffb030"],
    shadow:  [["#e0b8ff", "#9a4ae0", "#4a1a78", "#12061e"], "#a060d0"],
    void:    [["#ff4a8a", "#5a0a4a", "#24062a", "#000000"], "#c02a7a"],
    toxic:   [["#2a3a0a", "#8ac020", "#d8ff5a", "#f8ffd0"], "#a8e030"],
    glitch:  [["#0a2a1a", "#2aff8a", "#ff3ad8", "#ffffff"], "#5affb0"],
    rose:    [["#5a0a1a", "#d8203a", "#ff8a9a", "#fff0f0"], "#ff4a6a"],
    sky:     [["#2a8a7a", "#8fe0d0", "#d8fff4", "#ffffff"], "#8fe0d0"],
    lavender: [["#4a2a7a", "#a87ae8", "#e0c8ff", "#ffffff"], "#c0a0ff"],
    gold:    [["#7a4a00", "#e0a010", "#ffe070", "#fffbe0"], "#ffc840"],
    bone:    [["#5a4a3a", "#d8ccb0", "#f4ecd8", "#ffffff"], "#f0e4c8"],
    ink:     [["#000000", "#2a2a3a", "#6a6a8a", "#e8e8ff"], "#8888c0"],
    amber:   [["#6a3000", "#e08010", "#ffc860", "#fff4c8"], "#ffa030"],
    copper:  [["#5a2a10", "#c86a2a", "#f0a870", "#fff0e0"], "#f09a5a"],
    jade:    [["#0a4a3a", "#2ac890", "#9affd8", "#ffffff"], "#4ae8b0"],
    candy:   [["#7a2a6a", "#ff8ad8", "#a8f0ff", "#ffffff"], "#ffb0f0"]
  };
  var FAM_PAL = { fire: "ember", ice: "frost", water: "aqua", dark: "shadow", holy: "holy", machine: "steel", nature: "leaf", slime: "toxic", wind: "sky", beast: "copper", data: "glitch" };
  var FAM_OF_PAL = { ember: "fire", blaze: "fire", blueflame: "fire", sun: "fire", frost: "ice", snow: "ice", aqua: "water", tide: "water", leaf: "nature", bloom: "nature", pollen: "nature", jade: "nature",
    earth: "beast", stone: "beast", mud: "slime", copper: "beast", bone: "beast", steel: "machine", spark: "machine", plasma: "machine", holy: "holy", gold: "holy", shadow: "dark", void: "dark", ink: "dark",
    toxic: "slime", glitch: "dark", rose: "nature", sky: "wind", lavender: "holy", amber: "fire", candy: "holy" };

  function hex2(n) { n = Math.max(0, Math.min(255, Math.round(n))); return (n < 16 ? "0" : "") + n.toString(16); }
  function rgb(h) { h = h.replace("#", ""); var n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  /* the same colours turned round the colour wheel a little: a sibling of the same palette */
  function shift(col, deg, light) {
    var c = rgb(col), r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s, l = (mx + mn) / 2, d = mx - mn, q, p;
    if (d) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : (mx === g ? (b - r) / d + 2 : (r - g) / d + 4); h /= 6; } else s = 0;
    h = ((h + deg / 360) % 1 + 1) % 1; l = Math.max(0, Math.min(1, l + (light || 0)));
    function f(t) { t = (t % 1 + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : (t < 0.5 ? q : (t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p)); }
    if (!s) return "#" + hex2(l * 255) + hex2(l * 255) + hex2(l * 255);
    q = l < 0.5 ? l * (1 + s) : l + s - l * s; p = 2 * l - q;
    return "#" + hex2(f(h + 1 / 3) * 255) + hex2(f(h) * 255) + hex2(f(h - 1 / 3) * 255);
  }
  function palette(name, variant) {
    var P = PAL[name] || PAL.ember, pal = P[0].slice(), glow = P[1], deg = 0, lt = 0;
    /* siblings: a nudge round the wheel and lighter or darker, never far enough to read as another element */
    if (variant) { deg = [0, 12, -12, 0, 20, -20, 6, -6][variant % 8]; lt = [0, 0.06, -0.06, 0.12, -0.03, 0.03, -0.1, 0.09][variant % 8]; }
    if (deg || lt) { pal = pal.map(function (c, i) { return shift(c, deg, i === 3 ? 0 : lt); }); glow = shift(glow, deg, lt); }
    return { pal: pal, glow: glow, bits: [pal[1], pal[2], pal[3]] };
  }

  /* ---------- new motifs: depth functions like attack-fx.js SHAPES (u along the flight, v across) ---------- */
  function circ(u, v, cu, cv, r) { return 1 - Math.sqrt((u - cu) * (u - cu) + (v - cv) * (v - cv)) / r; }
  var NEW_SHAPES = {
    petal: function (u, v) { var w = 0.95 * Math.sqrt(Math.max(0, 1 - u * u)) * (0.55 + 0.45 * (u + 1) / 2); if (u > 0.72 && Math.abs(v) < 0.14) return 0; return w <= 0.02 ? 0 : (1 - Math.abs(v) / w) * 1.3; },
    feather: function (u, v) {
      var w = 0.9 * (1 - u * u) * (0.75 + 0.25 * u), d = w <= 0.02 ? 0 : 1 - Math.abs(v) / w;
      if (Math.abs(v) < 0.08 && u > -0.95) return 0.95;
      if (d > 0 && Math.sin((u + Math.abs(v) * 0.8) * 16) > 0.55) d *= 0.45;
      return d * 1.2;
    },
    flake: function (u, v) {
      var r = Math.sqrt(u * u + v * v), a = Math.atan2(v, u), k, arm = 9, br;
      if (r > 0.97) return 0;
      for (k = 0; k < 6; k++) { arm = Math.min(arm, Math.abs(Math.sin(a - k * Math.PI / 3)) * r); }
      br = Math.abs(Math.sin((a + Math.PI / 6) * 6)) * r;
      if (arm < 0.11) return r < 0.25 ? 1 : 0.85 - r * 0.4;
      if (r > 0.45 && r < 0.75 && br < 0.08) return 0.5;
      return r < 0.18 ? 0.9 : 0;
    },
    rock: function (u, v) {
      var r = Math.sqrt(u * u + v * v), a = Math.atan2(v, u), seg = Math.floor((a + Math.PI) / (Math.PI * 2) * 7), R = 0.78 + 0.18 * Math.abs(Math.sin(seg * 2.7));
      if (r > R) return 0;
      return Math.max(0.05, (1 - r / R) * 1.1 + 0.28 * Math.cos(a + 2.3) - (seg % 2) * 0.1);
    },
    needle: function (u, v) { var w = 0.6 * (1 - Math.abs(u)) + 0.05; if (Math.abs(v) > w) return 0; return Math.abs(v) < 0.12 ? 0.95 : (1 - Math.abs(v) / w) * 0.7; },
    note: function (u, v) {
      var x = v, y = -u;
      if (circ(x, y, -0.32, 0.45, 0.36) > 0) return 0.6 + circ(x, y, -0.32, 0.45, 0.36) * 0.5;
      if (x > -0.04 && x < 0.12 && y > -0.85 && y < 0.45) return 0.8;
      if (y > -0.9 && y < -0.5 && x > 0.04 && x < 0.04 + (y + 0.9) * 1.3) return 0.55;
      return 0;
    },
    heart: function (u, v) { var x = v * 1.25, y = -u * 1.25 + 0.15, q = x * x + y * y - 1, h = q * q * q - x * x * y * y * y; return h > 0 ? 0 : Math.min(1, -h * 4 + 0.25); },
    skull: function (u, v) {
      var x = v, y = -u, d = circ(x, y, 0, 0.18, 0.78), jaw = (Math.abs(x) < 0.42 && y < -0.3 && y > -0.85) ? 0.5 : 0;
      if (circ(x, y, -0.3, 0.12, 0.2) > 0 || circ(x, y, 0.3, 0.12, 0.2) > 0) return 0;
      if (y < -0.45 && y > -0.85 && Math.abs(x) < 0.4 && Math.sin(x * 22) > 0.6) return 0;
      return Math.max(d * 1.4, jaw);
    },
    ring: function (u, v) { var r = Math.sqrt(u * u + v * v); if (r > 0.95 || r < 0.52) return 0; return 1 - Math.abs(r - 0.74) / 0.23; },
    paw: function (u, v) {
      var x = v, y = -u, d = circ(x, y, 0, -0.3, 0.48) * 1.2;
      d = Math.max(d, circ(x, y, -0.55, 0.22, 0.22), circ(x, y, -0.2, 0.52, 0.22), circ(x, y, 0.2, 0.52, 0.22), circ(x, y, 0.55, 0.22, 0.22));
      return d * 1.4;
    },
    seed: function (u, v) { var d = 1 - Math.sqrt(u * u / 0.95 + v * v / 0.55); if (d > 0 && Math.abs(v + u * 0.2) < 0.09) return 0.95; return d * 1.2; },
    cloud: function (u, v) { return Math.max(circ(u, v, -0.35, 0.15, 0.5), circ(u, v, 0.15, -0.15, 0.55), circ(u, v, 0.45, 0.2, 0.42)) * 1.3; },
    spark: function (u, v) { var z = ((u * 2.2 + 3) % 1) - 0.5, c = (Math.floor(u * 2.2 + 3) % 2 ? 1 : -1) * z * 1.1; if (Math.abs(u) > 0.95) return 0; return 1 - Math.abs(v - c) / 0.24; },
    arrow: function (u, v) {
      if (u > 0.35) { var w = (1 - u) * 0.9; return Math.abs(v) < w ? 1 - Math.abs(v) / (w + 0.01) * 0.6 : 0; }
      if (Math.abs(v) < 0.1 && u > -0.85) return 0.6;
      if (u < -0.5 && Math.abs(v) < (-0.5 - u) * 1.2 + 0.1 && Math.abs(v) > 0.12) return 0.35;
      return 0;
    },
    egg: function (u, v) { var d = 1 - Math.sqrt(u * u / 0.8 + v * v / (u > 0 ? 0.5 : 0.62)); if (d > 0.15 && Math.sin(u * 9 + v * 5) > 0.85) return 0.3; return d * 1.3; },
    wisp: function (u, v) { var h = circ(u, v, 0.45, 0, 0.5); if (h > 0) return h * 1.4 + 0.1; if (u < 0.45 && u > -0.95) { var w = 0.45 * (u + 1) / 1.4, c = 0.18 * Math.sin(u * 7); return 1 - Math.abs(v - c) / (w + 0.02); } return 0; },
    hexa: function (u, v) { var a = Math.abs(u), b = Math.abs(v), e = Math.max(a * 0.866 + b * 0.5, b); if (e > 0.9) return 0; return e > 0.72 ? 0.15 : (e < 0.3 ? 1 : 0.55); },
    fang: function (u, v) { var w = 0.75 * (1 - (u + 1) / 2) + 0.03, c = 0.25 * (u + 1) * (u + 1) / 4 - 0.1; return 1 - Math.abs(v - c) / w; },
    cross: function (u, v) { var a = Math.abs(u), b = Math.abs(v); if ((a < 0.26 && b < 0.95) || (b < 0.26 && a < 0.95)) return a < 0.1 || b < 0.1 ? 1 : 0.6; return 0; },
    ex: function (u, v) { var a = Math.abs(u - v) / 1.414, b = Math.abs(u + v) / 1.414, r = Math.max(Math.abs(u), Math.abs(v)); if (r > 0.95) return 0; return Math.max(1 - a / 0.24, 1 - b / 0.24); },
    sword: function (u, v) {
      if (u > -0.35) { var w = u > 0.7 ? (1 - u) * 0.6 : 0.2; return Math.abs(v) < w ? (Math.abs(v) < 0.06 ? 1 : 0.6) : 0; }
      if (u > -0.5 && Math.abs(v) < 0.6) return 0.3;
      if (Math.abs(v) < 0.1 && u > -0.95) return 0.25;
      return 0;
    },
    gem: function (u, v) { var d = 1 - (Math.abs(u) / 0.95 + Math.abs(v) / 0.7); if (d <= 0) return 0; return u > 0 ? (v > 0 ? d * 1.6 : d * 0.9 + 0.2) : (v > 0 ? d * 0.6 + 0.1 : d * 1.2); },
    swirl: function (u, v) { var r = Math.sqrt(u * u + v * v), a = Math.atan2(v, u), s = ((a / (Math.PI * 2) + r * 1.5) % 1 + 1) % 1; if (r > 0.95) return 0; return s < 0.42 ? 1 - r * 0.6 : (r < 0.2 ? 0.9 : 0); },
    fish: function (u, v) { var b = 1 - Math.sqrt((u - 0.15) * (u - 0.15) / 0.5 + v * v / 0.3); if (b > 0) return circ(u, v, 0.55, -0.1, 0.1) > 0 ? 0.05 : b * 1.3 + 0.1; if (u < -0.5 && Math.abs(v) < (-0.5 - u) * 1.4) return 0.4; return 0; },
    bolt2: function (u, v) { var z = u < -0.2 ? 0.35 : (u < 0.25 ? -0.15 : 0.25), w = 0.28 * (1 - Math.abs(u) * 0.5); if (Math.abs(u) > 0.95) return 0; return 1 - Math.abs(v - z) / w; },
    moon: function (u, v) { var r1 = Math.sqrt(u * u + v * v), r2 = Math.sqrt((u - 0.35) * (u - 0.35) + (v + 0.2) * (v + 0.2)); return Math.min(1 - r1 / 0.92, (r2 - 0.62) * 2.5) * 2; },
    eye: function (u, v) { var w = 0.62 * (1 - u * u); if (Math.abs(v) > w) return 0; var r = Math.sqrt(u * u + v * v); return r < 0.18 ? 0.05 : (r < 0.36 ? 1 : 0.45); },
    missile: function (u, v) {
      if (u > 0.45) { var w = Math.sqrt(Math.max(0, 1 - (u - 0.45) * (u - 0.45) / 0.3)) * 0.36; return Math.abs(v) < w ? (u > 0.8 ? 0.9 : 0.6) : 0; }
      if (u > -0.6 && Math.abs(v) < 0.36) return Math.abs(v) < 0.12 ? 0.75 : 0.45;
      if (u <= -0.6 && u > -0.98 && Math.abs(v) < 0.36 + (-0.6 - u) * 1.4) return Math.abs(v) > 0.3 ? 0.3 : 0.85;
      return 0;
    },
    shell: function (u, v) { var x = v, y = -u, d = 1 - Math.sqrt(x * x / 0.8 + (y + 0.1) * (y + 0.1) / 0.7); if (y < -0.55) return 0; if (d > 0 && Math.abs(Math.sin(Math.atan2(y + 0.6, x) * 7)) < 0.18) return 0.2; return d * 1.3; }
  };
  /* how long and thin each one is baked (attack-fx core aspect), and whether it stays upright in flight */
  var ASPECT = { bubble: 1, flame: 0.62, shard: 0.5, drop: 0.7, orb: 1, star: 1, bolt: 0.42, leaf: 0.55, blob: 0.9, crescent: 1, gear: 1, cube: 1,
    petal: 0.7, feather: 0.4, flake: 1, rock: 0.9, needle: 0.26, note: 1, heart: 1, skull: 1, ring: 1, paw: 1, seed: 0.6, cloud: 0.8, spark: 0.55, arrow: 0.45, egg: 0.8, wisp: 0.6,
    hexa: 1, fang: 0.55, cross: 1, ex: 1, sword: 0.38, gem: 0.75, swirl: 1, fish: 0.6, bolt2: 0.5, moon: 1, eye: 0.6, shell: 1, missile: 0.5 };
  var UPRIGHT = { note: 1, heart: 1, skull: 1, paw: 1, cloud: 1, cross: 1, egg: 1, shell: 1, flake: 0, hexa: 1 };
  var SPINS = { star: 7, gear: 16, flake: 4, ring: 0, swirl: 12, ex: 9, crescent: 14, rock: 5, hexa: 3, shard: 0, cross: 0, moon: 6 };

  /* ---------- what a word in a move's name or description says about it ----------
   * m motif, pal colours, tr trail, im impact, ca cast; per kind: bu burst form, be beam form,
   * sf strike falling, sr strike rising, mi trap, bo boomerang, ch chain, mo shot motion */
  var KW = [
    [/bubble|fizz|foam|burp|froth/, { m: "bubble", pal: "aqua", tr: "bubbles", im: "pop", mo: "wave", bu: "dome", mi: "bubble", ch: "beads" }],
    [/boil|scald/, { pal: "ember", tr: "steam", im: "pop" }],
    [/flame|fire|ember|blaze|burn|scorch|inferno|pyro|napalm|furnace|heat|thermal|hot\b|hiccup|wildfire/, { m: "flame", pal: "ember", tr: "embers", im: "flare", ca: "charge", bu: "flamering", be: "jet", sf: "meteor", sr: "erupt", mi: "coals", ch: "ribbon" }],
    [/foxfire|spirit fire|blue fire|blue flame/, { m: "wisp", pal: "blueflame", tr: "wisps" }],
    [/frost|ice|icicle|freez|chill|cold|glacier|glacial|arctic|floe|permafrost|hail/, { m: "shard", pal: "frost", tr: "glitter", im: "shatter", bu: "shardring", be: "ray", sf: "rain", sr: "crystal", mi: "crystal", ch: "fork" }],
    [/snow|flake|blizzard|drift/, { m: "flake", pal: "snow", tr: "snow", im: "shatter", mo: "flutter", bu: "whirl", mi: "snowdrift" }],
    [/water|splash|squirt|spout|torrent|tide|pool|puddle|wave|jet|pressure|geyser|surf|shoal/, { m: "drop", pal: "aqua", tr: "drips", im: "splash", bu: "tide", be: "stream", sr: "geyser", mi: "puddle", ch: "arc" }],
    [/fish|narwhal|kraken|shoal/, { m: "fish", pal: "tide", ch: "fish", tr: "bubbles" }],
    [/leaf|leaves|twig|sprout|ivy|vine|root|garden|thicket|ambush/, { m: "leaf", pal: "leaf", tr: "leaves", im: "petals", mo: "flutter", bu: "whirl", sr: "vines", mi: "bud", ch: "vine" }],
    [/petal|flower|bloom|rose|fairy|pollen|bud/, { m: "petal", pal: "bloom", tr: "petals", im: "petals", mo: "flutter", bu: "bloom", sf: "rain", mi: "bud", ch: "vine" }],
    [/pollen/, { pal: "pollen", m: "seed" }],
    [/seed|acorn|nut\b/, { m: "seed", pal: "leaf", tr: "leaves", mo: "hop" }],
    [/thorn|needle|spine|quill|stinger|pin\b|spike/, { m: "needle", tr: "streaks", im: "pins", bu: "spikes", sr: "spikes", mi: "caltrops", be: "stream" }],
    [/rock|stone|boulder|pebble|gravel|grit|landslide|cave|crater|dirt|clang/, { m: "rock", pal: "stone", tr: "dust", im: "crater", ca: "stomp", bu: "quake", sf: "rain", sr: "spikes", mi: "pit", mo: "hop" }],
    [/mud|sludge|muck/, { m: "blob", pal: "mud", tr: "drips", im: "splat", mi: "puddle" }],
    [/quake|stomp|slam|thump|flop|crash|grumble|pummel|hammer|sinkhole|burrow|dig/, { im: "crater", ca: "stomp", bu: "quake", sf: "stomp", sr: "erupt", mi: "pit" }],
    [/spark|static|thunder|electr|shock|zap|bolt|storm|volt|plasma|buzz|hum|signal|grid/, { m: "spark", pal: "spark", tr: "crackle", im: "fork", ca: "charge", bu: "lightning", be: "bolt", sf: "pillar", ch: "fork", mi: "rune" }],
    [/plasma|positron|lance ray|laser|atomic/, { pal: "plasma", be: "nodes", m: "orb" }],
    [/gear|cog|grind|iron|steel|metal|clank|bulldoze|overclock|nano|chip/, { m: "gear", pal: "steel", tr: "sparks", im: "sparks", bu: "shardring", be: "drill", mi: "bomb" }],
    [/missile|rocket|shell\b|shells|bomb|mine|barrage|gatling|pellet|cluster|rapid|trip/, { m: "missile", pal: "steel", tr: "smoke", im: "blast", sf: "bomb", mi: "bomb", mo: "comet" }],
    [/drill|cyclone|spiral|twist|spin|whirl|twirl|vortex|tornado|coil|wheel|roll/, { m: "swirl", tr: "swirl", im: "swirl", bu: "vortex", be: "drill", bo: "wheel", mo: "spiral" }],
    [/\bwind|gust|gale|\bair\b|breeze|\bwings?\b|-wing|mantle|updraft|tempest|flutter|whoosh|shroud/, { m: "crescent", pal: "sky", tr: "streaks", im: "swirl", bu: "vortex", be: "wave", mo: "wave", bo: "ribbon" }],
    [/feather|plume|down\b|quill|talon|beak|bird|garuda|phoenix|firebird|eagle/, { m: "feather", tr: "feathers", im: "feathers", bu: "flurry", mo: "flutter" }],
    [/phoenix|firebird|rebirth|sacred flame|crimson/, { pal: "blaze" }],
    [/holy|light|halo|heaven|angel|sanctuary|judg|choir|gate|seal|ward|glow|six-wing|eight-wing|bless|oath|sword rain|durandal/, { m: "cross", pal: "holy", tr: "twinkles", im: "crossflash", ca: "glyph", bu: "nova", be: "ray", sf: "pillar", sr: "pillar", mi: "rune", ch: "ribbon" }],
    [/star|sparkle|glint|twinkle|meteor|comet|cosmic|stardust/, { m: "star", pal: "gold", tr: "twinkles", im: "starburst", bu: "nova", sf: "meteor" }],
    [/sun|solar/, { pal: "sun", m: "orb" }],
    [/moon|lunar/, { m: "moon", pal: "lavender" }],
    [/shadow|dark|night|nightmare|doom|curse|hex|cackle|giggle|corrupt|ghost|haunt|phantom|mirage/, { m: "skull", pal: "shadow", tr: "smoke", im: "swirl", ca: "glyph", bu: "vortex", be: "wave", mi: "eye", ch: "thread" }],
    [/phantom|mirage|ghost/, { m: "wisp", pal: "lavender", mo: "ghost" }],
    [/glitch|bug|crash|system|data|network|copy|virus|error/, { m: "hexa", pal: "glitch", tr: "glyphs", im: "glyph", bu: "glyph", ch: "links", mi: "rune" }],
    [/web|silk|thread|cocoon|net\b|prison|wrap|tendril|crawl/, { m: "hexa", pal: "bone", tr: "threads", im: "web", mi: "web", ch: "thread", bu: "dome" }],
    [/amber|sap|honey|hive|golden swarm/, { pal: "amber", m: "hexa", mi: "puddle" }],
    [/slime|goo|jelly|gummy|sticky|mochi|squish|stretch|bounce|wobbl/, { m: "blob", pal: "candy", tr: "drips", im: "splat", mo: "hop", bu: "dome", mi: "puddle" }],
    [/toxic|stink|poison|smell|oil/, { pal: "toxic", tr: "smoke", mi: "spores" }],
    [/claw|scratch|swipe|rake|nail|flurry|slash|cutter|cut\b|slice|edge|blade|sword|saber/, { m: "crescent", im: "claws", be: "rake", bo: "saw", ch: "slash", tr: "streaks" }],
    [/blade|sword|edge|lance|spear|trident|pillar/, { m: "sword", pal: "steel", sr: "sword", sf: "rain" }],
    [/fang|bite|chomp|snap|jaw|mandible|nibble/, { m: "fang", im: "bite", be: "bite" }],
    [/horn|tusk|ram|charge|rush|dash|lunge|tackle|bash|kick|jab|punch|uppercut|pounce|dive|swoop|slide|smack/, { be: "dash", im: "crossflash", ca: "roar", sf: "dive" }],
    [/horn|tusk|ram\b|lance|spear|beetle|hercules/, { m: "fang", be: "wedge" }],
    [/drive|drill/, { be: "drill" }],
    [/howl|roar|shout|sing|choir|song|hum|scold|cackle|giggle|glare|verdict|kiss|charm/, { m: "note", tr: "notes", im: "ripple", ca: "roar", bu: "sonic", be: "rings", ch: "notes" }],
    [/glare|eye|watch|verdict|judg/, { m: "eye", mi: "eye", ch: "fork" }],
    [/charm|kiss|heart|love|cute|kitty|puppy|nine lives|momentai/, { m: "heart", pal: "candy", tr: "hearts", im: "confetti", mi: "charm" }],
    [/paw|pawprint|\bcat\b|feline|kitty|\bkit\b|\bfox/, { m: "paw", mi: "paw" }],
    [/talisman|ink|shrine|yin|yang|seal|ward|charm|scroll|card/, { m: "cross", pal: "ink", tr: "glyphs", im: "glyph", mi: "charm", ca: "glyph" }],
    [/egg|yolk|hatch|nest/, { m: "egg", pal: "bone", im: "splat", mi: "bomb" }],
    [/\bring\b|disc|halo|\barc\b/, { m: "ring", bo: "ring", be: "rings" }],
    [/shield|guard|aegis|armor|armour|pelt|wall|will/, { m: "hexa", bu: "dome", im: "ripple", ca: "ringout" }],
    [/smoke|ash|snort|puff|fluff|fuzz|cloud|dust/, { m: "cloud", tr: "smoke", im: "puff", mo: "flutter" }],
    [/rain|shower|storm|barrage|volley/, { sf: "rain", mo: "comet" }],
    [/pillar|column|tower/, { sf: "pillar", sr: "pillar" }],
    [/dragon|wolf|bear|beast|lion|hunter|knight|imperial|mega|giga|giant|megaton/, { ca: "roar" }],
    [/gold|golden|treasure|coin/, { pal: "gold" }],
    [/crystal|gem|diamond|jewel/, { m: "gem", pal: "jade", sr: "crystal", mi: "crystal" }],
    [/staff|stick/, { m: "sword", pal: "copper" }],
    [/bone|skull/, { m: "skull", pal: "bone" }],
    [/arrow|bow/, { m: "arrow", pal: "holy", sf: "rain" }]
  ];

  /* the full menus, for whatever the words don't decide */
  var MOTIFS = ["bubble", "flame", "shard", "drop", "orb", "star", "bolt", "leaf", "blob", "crescent", "gear", "petal", "feather", "flake", "rock", "needle", "note", "heart", "skull", "ring", "paw", "seed", "cloud", "spark", "arrow", "egg", "wisp", "hexa", "fang", "cross", "ex", "sword", "gem", "swirl", "fish", "bolt2", "moon", "eye", "shell", "missile"];
  var FORMS = {
    projectile: ["straight", "wave", "spiral", "zigzag", "tumble", "pulse", "flutter", "hop", "ghost", "comet"],
    burst: ["blocks", "spikes", "bloom", "quake", "vortex", "nova", "triple", "dome", "flurry", "sonic", "shardring", "flamering", "tide", "glyph", "lightning", "whirl"],
    beam: ["ray", "jet", "dash", "drill", "helix", "rings", "wave", "nodes", "rake", "wedge", "bolt", "stream", "bite"],
    strikeFall: ["meteor", "rain", "dive", "pillar", "stomp", "drop", "bomb"],
    strikeRise: ["geyser", "spikes", "vines", "crystal", "erupt", "sword", "pillar"],
    mine: ["mark", "puddle", "bubble", "web", "caltrops", "bud", "rune", "crystal", "pit", "coals", "paw", "bomb", "charm", "eye", "spores", "snowdrift"],
    boomerang: ["spin", "ribbon", "twin", "wheel", "saw", "ring"],
    chain: ["zig", "vine", "slash", "beads", "ribbon", "links", "arc", "fork", "thread", "notes", "fish"]
  };
  var TRAILS = ["embers", "glitter", "bubbles", "ribbon", "smoke", "petals", "notes", "rings", "glyphs", "crackle", "drips", "dust", "feathers", "snow", "hearts", "twinkles", "leaves", "streaks", "steam", "wisps", "sparks", "threads", "swirl"];
  var IMPACTS = ["splash", "shatter", "starburst", "ripple", "crossflash", "petals", "puff", "fork", "crater", "glyph", "swirl", "confetti", "claws", "pop", "flare", "pins", "sparks", "splat", "bite", "web", "blast", "feathers"];
  var CASTS = ["flash", "charge", "ringout", "glyph", "stomp", "sparkle", "roar", "spin"];
  /* a form that suits a motif when no word picked one */
  var FORM_FOR_MOTIF = { bubble: { mo: "wave", bu: "dome", mi: "bubble" }, petal: { bu: "bloom", mo: "flutter", mi: "bud" }, leaf: { bu: "whirl", mo: "flutter" }, flake: { bu: "whirl", mi: "snowdrift" },
    rock: { bu: "quake", sf: "rain", mi: "pit" }, star: { bu: "nova", sf: "meteor" }, note: { bu: "sonic", ch: "notes", be: "rings" }, heart: { mi: "charm" }, paw: { mi: "paw" }, skull: { mi: "eye" },
    spark: { bu: "lightning", be: "bolt", ch: "fork" }, swirl: { bu: "vortex", be: "drill", mo: "spiral" }, feather: { bu: "flurry", mo: "flutter" }, fish: { ch: "fish" }, needle: { bu: "spikes", mi: "caltrops" } };

  var FAM_MOTIFS = { fire: ["flame", "wisp", "star", "orb"], ice: ["shard", "flake", "gem", "needle"], water: ["drop", "bubble", "fish", "swirl"], nature: ["leaf", "petal", "seed", "needle"],
    beast: ["fang", "paw", "crescent", "rock"], machine: ["gear", "bolt2", "missile", "hexa"], holy: ["cross", "star", "ring", "feather"], dark: ["skull", "wisp", "eye", "moon"],
    slime: ["blob", "bubble", "drop"], wind: ["crescent", "feather", "cloud", "swirl"] };
  /* forms that suit an element, and the plain ones every move can wear; the rest only come by words */
  var FAM_FORMS = {
    fire: { bu: ["flamering", "nova"], be: ["jet"], sf: ["meteor"], sr: ["erupt"], mi: ["coals"], ch: ["ribbon"], mo: ["comet"] },
    ice: { bu: ["shardring", "whirl"], be: ["ray"], sf: ["rain"], sr: ["crystal"], mi: ["crystal", "snowdrift"], ch: ["fork"], mo: ["straight"] },
    water: { bu: ["tide", "dome"], be: ["stream"], sf: ["drop"], sr: ["geyser"], mi: ["puddle", "bubble"], ch: ["arc"], mo: ["wave"] },
    nature: { bu: ["bloom", "whirl"], be: ["stream"], sf: ["rain"], sr: ["vines"], mi: ["bud", "spores"], ch: ["vine"], mo: ["flutter"] },
    beast: { bu: ["quake", "spikes"], be: ["dash", "rake"], sf: ["stomp", "dive"], sr: ["spikes"], mi: ["pit", "paw"], ch: ["slash"], mo: ["hop"] },
    machine: { bu: ["lightning", "shardring"], be: ["nodes", "drill"], sf: ["bomb"], sr: ["spikes"], mi: ["bomb", "caltrops"], ch: ["links", "zig"], mo: ["comet"] },
    holy: { bu: ["nova", "glyph"], be: ["ray", "rings"], sf: ["pillar"], sr: ["pillar", "sword"], mi: ["rune", "charm"], ch: ["ribbon"], mo: ["pulse"] },
    dark: { bu: ["vortex", "glyph"], be: ["wave", "helix"], sf: ["drop"], sr: ["erupt"], mi: ["eye", "rune"], ch: ["thread", "fork"], mo: ["ghost"] },
    slime: { bu: ["dome", "tide"], be: ["stream"], sf: ["drop"], sr: ["geyser"], mi: ["puddle", "spores"], ch: ["beads"], mo: ["hop"] },
    wind: { bu: ["vortex", "whirl"], be: ["wave", "helix"], sf: ["dive"], sr: ["pillar"], mi: ["mark"], ch: ["ribbon"], mo: ["wave"] }
  };
  var NEUTRAL = { bu: ["blocks", "triple", "spikes", "flurry", "sonic", "whirl", "dome", "nova"], be: ["dash", "ray", "helix", "wave", "drill", "rings", "wedge"],
    sf: ["drop", "dive", "meteor", "rain", "stomp"], sr: ["spikes", "erupt", "pillar"], mi: ["mark", "caltrops", "charm", "pit", "bubble"],
    bo: ["spin", "twin", "ribbon", "wheel", "saw", "ring"], ch: ["zig", "beads", "ribbon", "slash"], mo: ["straight", "wave", "tumble", "pulse", "spiral", "zigzag", "hop", "comet", "flutter", "ghost"] };
  function hashStr(s) { var h = 2166136261, i; for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function order(list, seed) { var a = list.slice(), i, j, t, h = seed; for (i = a.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; j = h % (i + 1); t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* ---------- the recipes ---------- */
  var REC = null;
  function build() {
    var W = D.WEAPONS || {}, I = D.SIG_INFO || {}, LK = D.SIG_LOOK || {}, LINES = D.MOVE_LINES || {}, ids = Object.keys(I), used = {}, lineUse = {}, i, id;
    REC = {};
    /* hand-tuned moves first (they get first claim on their look), then earlier stages first */
    ids.sort(function (a, b) { return ((handOf(a) ? 0 : 1) - (handOf(b) ? 0 : 1)) || (I[a].tier - I[b].tier) || (I[a].role - I[b].role) || (a < b ? -1 : 1); });
    for (i = 0; i < ids.length; i++) {
      id = ids[i];
      var w = W[id]; if (!w) continue;
      var inf = I[id], lk = LK[id] || {}, line = inf.line, fam = lk.el || (LINES[line] && LINES[line].family) || "fire";
      var name = (w.name || id).toLowerCase(), text = (w.summary || "").toLowerCase(), seed = hashStr(id);
      var kind = w.type === "strike" ? (lk.d === "rise" ? "strikeRise" : "strikeFall") : w.type;
      var want = {}, k, j, kw, v, f, head = name.split(/[\s-]+/).pop(), first = name.split(/[\s-]+/)[0];   /* "Frost Moon" is a moon: the last word is what it is */
      /* words: the name counts three times as much as the description */
      for (j = 0; j < KW.length; j++) {
        kw = KW[j];
        var sc = (kw[0].test(name) ? 3 : 0) + (kw[0].test(text) ? 1 : 0) + (kw[0].test(head) ? 1.5 : 0);
        if (!sc) continue;
        /* the last word says what it is ("Fire Bubbles" are bubbles), the first what colour ("Fire" ones) */
        var scP = sc - (kw[0].test(head) ? 1.5 : 0) + (kw[0].test(first) ? 1.5 : 0);
        for (k in kw[1]) { v = kw[1][k]; want[k] = want[k] || {}; want[k][v] = (want[k][v] || 0) + (k === "pal" ? scP : sc) * (1 + (KW.length - j) * 0.001); }
      }
      var hd = handOf(id);
      if (hd) ["m", "pal", null, "tr", "im"].forEach(function (key, j) { if (hd[j] && hd[j] !== "-") { if (!key) return; want[key] = want[key] || {}; want[key][hd[j]] = 1000; } });
      function ranked(key, menu, fallback) {
        var o = want[key] || {}, list = Object.keys(o).sort(function (a, b) { return o[b] - o[a]; }).filter(function (x) { return !menu.length || menu.indexOf(x) >= 0; });
        if (fallback && menu.indexOf(fallback) >= 0 && list.indexOf(fallback) < 0) list.push(fallback);
        return list.concat(order(menu, seed + key.length * 977).filter(function (x) { return list.indexOf(x) < 0; }));
      }
      /* motifs: the words first, then what the old look said, then the one it grew from, then its element's */
      var parent = inf.up && REC[inf.up], anc = {}, pp = parent;
      while (pp) { anc[pp.motif] = 1; pp = pp.up ? REC[pp.up] : null; }
      var grand = 0, gp = inf.up; while (gp && I[gp]) { grand++; gp = I[gp].up; }
      var palName = ranked("pal", Object.keys(PAL), FAM_PAL[fam] || "ember")[0];
      var pf = FAM_OF_PAL[palName] || fam, wm = ranked("m", MOTIFS).slice(0, Object.keys(want.m || {}).length);
      var motifs = wm.slice();
      [lk.sh, parent && parent.motif].concat(FAM_MOTIFS[pf] || []).forEach(function (x) { if (x && motifs.indexOf(x) < 0) motifs.push(x); });
      order(MOTIFS, seed).forEach(function (x) { if (motifs.indexOf(x) < 0) motifs.push(x); });
      /* forms for its kind: the words, the old look, what suits the motif, then the rest */
      var fkey = { projectile: "mo", burst: "bu", beam: "be", strikeFall: "sf", strikeRise: "sr", mine: "mi", boomerang: "bo", chain: "ch" }[kind];
      var old = lk.bf === "fist" ? "dash" : (lk.bf === "bite" ? "bite" : (lk.bf === "jet" ? "jet" : (lk.ms === "puddle" ? "puddle" : (lk.ms === "bubble" ? "bubble" : (lk.cf === "vine" ? "vine" : (lk.cf === "zig" ? "zig" : null))))));
      if (hd && hd[2] && hd[2] !== "-") { want[fkey] = want[fkey] || {}; want[fkey][hd[2]] = 1000; }
      var forms = ranked(fkey, [], null).filter(function (x) { return (FORMS[kind] || []).indexOf(x) >= 0; });
      [old].concat((FAM_FORMS[pf] && FAM_FORMS[pf][fkey]) || [], NEUTRAL[fkey] || []).forEach(function (x) { if (x && forms.indexOf(x) < 0 && (FORMS[kind] || []).indexOf(x) >= 0) forms.push(x); });
      order(FORMS[kind] || ["straight"], seed).forEach(function (x) { if (forms.indexOf(x) < 0) forms.push(x); });
      /* pick the best free pair (a lower sum of ranks wins; the motif's rank breaks ties):
       * never the same kind+form+motif anywhere; in one line, two of the same kind differ in form, and
       * in motif too unless one grew from the other */
      var LU = lineUse[line] = lineUse[line] || {}, a, b, m = null, fm = null, best = 1e9, sc2, variant = 0;
      var trs = ranked("tr", TRAILS), ims = ranked("im", IMPACTS), cas = ranked("ca", CASTS, "flash");
      var tr = want.tr ? trs[0] : (trs.filter(function (x) { return !LU["tr|" + x]; })[0] || trs[0]);
      var im = want.im ? ims[0] : (ims.filter(function (x) { return !LU["im|" + x]; })[0] || ims[0]);
      for (b = 0; b < motifs.length; b++) {
        if (b > best) break;
        if (LU[kind + "|m|" + motifs[b]] && !anc[motifs[b]] && !hd) continue;   /* a hand pick may share a motif with a sibling: its form still differs */
        for (a = 0; a < forms.length; a++) {
          sc2 = a + b * 1.001;
          if (sc2 >= best) break;
          if (LU[kind + "|f|" + forms[a]] || used[kind + "|" + forms[a] + "|" + motifs[b] + "|" + tr]) continue;
          best = sc2; m = motifs[b]; fm = forms[a];
        }
      }
      if (!m) { m = motifs[0]; fm = forms[0]; }
      /* colours: a sibling in this line with the same palette gets it turned a little */
      variant = LU["pal|" + palName] || 0;
      LU["pal|" + palName] = variant + 1;
      used[kind + "|" + fm + "|" + m + "|" + tr] = id;
      LU[kind + "|f|" + fm] = 1; LU[kind + "|m|" + m] = 1;
      LU["tr|" + tr] = 1; LU["im|" + im] = 1;
      var P = palette(palName, variant);
      REC[id] = { id: id, up: inf.up || null, line: line, kind: kind, type: w.type, form: fm, motif: m, palName: palName, variant: variant, pal: P.pal, glow: P.glow, bits: P.bits,
        fam: FAM_OF_PAL[palName] || fam, trail: tr, impact: im, cast: cas[0], grand: grand, tier: inf.tier, name: w.name, upright: !!UPRIGHT[m], spin: SPINS[m] != null ? SPINS[m] : 0 };
    }
    return REC;
  }

  /* ---------- hand-tuned (17z33 pass 2): id motif/colours/form/trail/impact, "-" keeps the automatic pick ---------- */
  var HAND = [
    /* agumon */ "fizzBubbles bubble/aqua/wave", "flameGargle flame/ember/zigzag/embers/flare", "fuzzPuff cloud/ink/flurry", "bounceDrop blob/candy/drop/drips/splat", "stompQuake rock/earth/erupt/dust/crater",
    "meteorBreath rock/ember/meteor/embers/crater", "hornCharge fang/ember/wedge/dust", "tailSweep crescent/ember/whirl/streaks/swirl", "tridentLunge sword/steel/rake/sparks/claws",
    "cycloneDrill swirl/sun/drill/swirl/swirl", "shieldBash hexa/sun/dome/twinkles/ripple", "infernoCarpet flame/ember/puddle/embers/flare", "sunMeteor orb/sun/stomp/embers/flare",
    /* armadillomon */ "rockRain rock/stone/rain/dust/crater", "burrowTrap rock/earth/pit/dust/crater", "sinkhole rock/mud/puddle/dust/crater", "spikeQuake needle/earth/quake/dust/crater",
    "meteorShower star/ember/meteor/embers/starburst", "cometRoll star/gold/wedge/twinkles/starburst", "bellyFlop blob/aqua/stomp/drips/splash", "digUp rock/mud/spikes/dust/crater",
    "megatonRoll shell/copper/drill/dust/crater", "craterTrap star/gold/rune/twinkles/starburst",
    /* biyomon */ "petalFlurry petal/bloom/flutter/petals/petals", "rootHop leaf/leaf/drop/leaves/petals", "pinkWhirl feather/bloom/vortex/petals/feathers",
    "sparkWing feather/ember/ribbon/sparks/flare", "firestormWings feather/ember/meteor/embers/flare", "phoenixRain feather/blaze/rain/embers/feathers", "sacredFlame flame/blaze/ribbon/embers/flare",
    /* gabumon */ "jellyBubbles blob/frost/hop/bubbles/pop", "squishBounce blob/frost/dome/glitter/shatter", "hornChip shard/frost/spin/glitter/shatter", "wolfRush fang/frost/dash/glitter/bite",
    "hornHook fang/frost/wedge/glitter/crossflash", "howlingKick note/blueflame/rings/notes/ripple", "packCombo fang/frost/zig/glitter/claws", "steelFangRush fang/steel/bite/sparks/bite",
    "frozenWastes flake/snow/mark/snow/shatter",
    /* gomamon */ "splashPuff bubble/aqua/wave/drips/splash", "tailFlop drop/aqua/stomp/drips/splash", "shoalStorm fish/tide/arc/bubbles/splash", "tuskQuake fang/frost/spikes/glitter/crater",
    "hammerQuake rock/copper/erupt/drips/crater", "flailStorm rock/copper/vortex/dust/crater", "narwhalSwarm needle/tide/beads/bubbles/pins", "krakenShoal fish/tide/vine/bubbles/splash",
    /* gotsumon */ "clangBash rock/stone/dash/dust/crossflash", "grumbleStomp rock/stone/quake/dust/crater", "hornRam fang/stone/wedge/sparks/crossflash", "landslide rock/earth/caltrops/dust/crater",
    "caveinScold rock/stone/puddle/dust/crater", "yolkSplash egg/pollen/tide/drips/splat",
    /* guilmon */ "tailCrush crescent/ember/nova/streaks/swirl", "hunterPounce paw/blaze/dive/streaks/claws", "hazardGlare eye/blaze/beads/embers/fork", "hazardPulse ex/blaze/zig/crackle/fork",
    "plasmaRake crescent/plasma/sword/streaks/claws", "lanceRay sword/holy/nodes/twinkles/crossflash", "aegisBash hexa/holy/dome/glitter/ripple", "lanceSpike sword/holy/pillar/twinkles/crossflash",
    /* hagurumon */ "bootPulse hexa/glitch/triple/glyphs/glyph", "rocketPuff missile/steel/hop/smoke/puff", "rocketHop missile/steel/drop/smoke/blast", "oilSlick blob/ink/puddle/smoke/splat",
    "rocketRain missile/steel/rain/smoke/blast", "guardPulse hexa/steel/dome/sparks/ripple",
    /* hawkmon */ "quillStorm feather/sky/rain/feathers/pins", "headbandSnap crescent/rose/ribbon/streaks/claws", "hornGale fang/sky/spin/streaks/swirl",
    /* keramon */ "longArmLance needle/glitch/wedge/glyphs/pins", "spiderDrop eye/shadow/dive/threads/web", "blinkPop eye/glitch/vortex/glyphs/glyph",
    /* palmon */ "needleRain needle/jade/rain/streaks/pins", "hundredJab blob/rose/dash/streaks/crossflash", "stinkBloom petal/toxic/spores/smoke/puff", "ivyEmbrace leaf/rose/ribbon/leaves/petals",
    "roseThicket needle/rose/web/petals/pins", "thornRoseRain petal/rose/dive/petals/petals",
    /* patamon */ "jellyDrift blob/lavender/dome/twinkles/pop", "earGlide feather/holy/spin/feathers/ripple", "tumbleRam orb/holy/dive/dust/crossflash", "staffSpin sword/gold/wheel/twinkles/crossflash",
    "sixwingFlash feather/holy/triple/feathers/crossflash", "eightwingGust feather/holy/vortex/feathers/feathers", "bladeOfLight sword/holy/rain/twinkles/crossflash", "choirRay note/holy/ray/notes/crossflash",
    /* renamon */ "tailBop crescent/copper/whirl/dust/swirl", "kitPounce paw/copper/dive/dust/claws", "crystalShards gem/jade/rain/glitter/shatter", "foxCharm cross/ink/charm/glyphs/glyph",
    "foxfireRain wisp/blueflame/meteor/wisps/flare", "flameWheel swirl/blueflame/helix/wisps/swirl", "ninetailFlare wisp/blueflame/flamering/wisps/flare", "phantomKick wisp/lavender/dash/wisps/crossflash",
    "foxDrive wisp/blueflame/drill/wisps/flare", "spiritFoxFall wisp/blueflame/stomp/wisps/flare", "shrineSeal cross/holy/eye/twinkles/crossflash", "spiritChain wisp/blueflame/ribbon/wisps/flare",
    /* salamon */ "puppySparkle star/candy/pulse/twinkles/starburst", "pawprintCharm paw/candy/paw/hearts/confetti", "pounceTackle paw/holy/dive/twinkles/claws", "starfall star/gold/drop/twinkles/starburst",
    "ringSpinner ring/holy/wheel/twinkles/crossflash", "arrowRain arrow/holy/rain/twinkles/pins", "dragonCoil swirl/blaze/twin/embers/swirl", "holyDragonSeal cross/holy/crystal/twinkles/crossflash",
    "felineFlurry crescent/holy/rake/twinkles/claws",
    /* tentomon */ "gooBounce blob/candy/dome/drips/splat", "mandibleSnap fang/leaf/bite/leaves/bite", "hornSpear fang/steel/wedge/crackle/crossflash", "herculesCharge fang/gold/ray/crackle/fork",
    "staticNest spark/spark/caltrops/crackle/fork", "shellSlam shell/steel/quake/dust/crater",
    /* terriermon */ "earBounce blob/leaf/triple/drips/splat", "earWhip crescent/leaf/spin/streaks/swirl", "earHover cloud/sky/dive/streaks/crossflash", "rapidMissile missile/steel/meteor/sparks/blast",
    "giantMissile missile/steel/bomb/embers/blast", "megaCharge missile/steel/ray/smoke/blast", "rapidDash bolt/steel/nodes/sparks/sparks", "pummelQuake rock/steel/erupt/sparks/crater",
    "ringSpin ring/steel/shardring/sparks/sparks", "gatlingSpin bolt/steel/vortex/sparks/sparks", "momentaiMine bubble/aqua/bubble/bubbles/pop", "targetMines missile/steel/rune/crackle/blast",
    "barrageField missile/steel/caltrops/smoke/blast",
    /* veemon */ "tummyRoll swirl/aqua/nova/streaks/swirl", "leapBonk star/aqua/meteor/twinkles/starburst", "veeSpit flame/blueflame/comet/embers/flare", "boomKick crescent/aqua/dash/streaks/crossflash",
    "skyDive crescent/sky/drop/streaks/crossflash", "xburst ex/blueflame/erupt/embers/flare", "dragonKick fang/aqua/rake/streaks/claws", "crossCutter ex/blueflame/spin/streaks/claws",
    "skyRam fang/sky/wedge/streaks/crossflash", "dragonQuake rock/earth/spikes/embers/crater", "dragonsDescent ex/gold/rain/twinkles/crossflash",
    /* wormmon */ "leafPuff leaf/leaf/straight/leaves/petals", "threadLash hexa/bone/thread/threads/web", "spikeDash needle/leaf/stream/streaks/pins", "bugRush fang/leaf/dash/streaks/crossflash",
    "lanceDive needle/leaf/wedge/streaks/pins", "hiveChain hexa/amber/fork/sparks/sparks",
    /* zubamon */ "seedSpark star/holy/hop/twinkles/starburst", "shellRoll shell/steel/dome/sparks/ripple", "ironWill hexa/steel/triple/sparks/ripple", "bladeStorm sword/steel/dive/streaks/claws",
    "eagerDash sword/steel/dash/streaks/claws", "knightsOath cross/holy/nova/twinkles/crossflash", "durandalWheel sword/holy/ribbon/twinkles/claws",
    /* second look: what the automatic picks still got wrong */
    "dashClaw crescent/ember/dash/embers/claws", "scorchMark flame/ember/coals/embers/flare", "wildfireField flame/ember/mark/embers/flare", "napalmField blob/ember/bomb/embers/blast",
    "ironWingGust feather/steel/vortex/streaks/swirl", "hatchBarrage missile/steel/rain/sparks/blast", "snowCover flake/snow/snowdrift/snow/shatter", "fishSwarm fish/tide/fish/bubbles/splash",
    "quakePunch rock/stone/erupt/streaks/crossflash", "boulderLob rock/stone/stomp/dust/crater", "pebbleTrap rock/stone/mark/dust/crater", "pyroSpray flame/ember/spiral/embers/flare",
    "clawDig crescent/ember/erupt/streaks/claws", "furnaceRoar flame/ember/jet/embers/flare", "blastFurnace flame/blaze/stream/embers/blast", "missileRack missile/steel/meteor/smoke/blast",
    "crimsonVerdict eye/blaze/fork/embers/fork", "clusterMissile missile/steel/bomb/sparks/blast", "twigSpray needle/leaf/flutter/leaves/pins", "petalShower petal/bloom/drop/petals/petals",
    "palmonThornWhip needle/rose/stream/petals/pins", "ivyWhip leaf/leaf/vine/leaves/petals", "buzzField spark/spark/rune/crackle/fork", "stormGrid hexa/spark/bomb/crackle/fork",
    "gargoShell missile/steel/drop/sparks/blast", "tripMines missile/steel/bomb/smoke/blast", "bunnyDash crescent/leaf/dash/leaves/crossflash", "gargoCharge bolt/steel/drill/sparks/sparks",
    "dragonStarFall star/holy/meteor/embers/starburst", "twinCutter crescent/steel/spin/sparks/claws", "crossEdge ex/steel/twin/streaks/claws", "spinningBlade sword/steel/wheel/streaks/claws",
    "ringToss ring/holy/ring/twinkles/swirl", "mirage wisp/lavender/spin/wisps/swirl", "puffBubbles bubble/aqua/flutter/bubbles/pop", "wardSeal cross/holy/mark/twinkles/crossflash",
    "wingBuzz crescent/leaf/vortex/streaks/swirl"
  ];
  var HANDM = null;
  function handOf(id) {
    if (!HANDM) { HANDM = {}; HAND.forEach(function (row) { var sp = row.indexOf(" "); HANDM[row.slice(0, sp)] = row.slice(sp + 1).split("/"); }); }
    return HANDM[id] || null;
  }
  function applyHand(R) {
    var i, row, sp, id, v, r, keys = ["motif", "palName", "form", "trail", "impact"], j, lineN = {};
    for (i = 0; i < HAND.length; i++) {
      row = HAND[i]; sp = row.indexOf(" "); id = row.slice(0, sp); v = row.slice(sp + 1).split("/"); r = R[id];
      if (!r) continue;
      for (j = 0; j < v.length; j++) if (v[j] && v[j] !== "-") r[keys[j]] = v[j];
      if (FORMS[r.kind] && FORMS[r.kind].indexOf(r.form) < 0) r.form = FORMS[r.kind][0];
      r.hand = true;
    }
    /* colours again, so siblings in a line on the same palette still differ a little */
    for (id in R) { r = R[id]; var k = r.line + "|" + r.palName; r.variant = lineN[k] || 0; lineN[k] = r.variant + 1; var P = palette(r.palName, r.variant); r.pal = P.pal; r.glow = P.glow; r.bits = P.bits; r.fam = FAM_OF_PAL[r.palName] || r.fam;
      r.upright = !!UPRIGHT[r.motif]; r.spin = SPINS[r.motif] != null ? SPINS[r.motif] : 0; }
  }
  function recipes() { return REC || build(); }
  function rec(id) { var R = recipes(); return R[id] || null; }

  /* attack-fx.js calls this when it builds its index: each signature move gets its own look */
  function applyLooks(LOOK, famById) {
    var R = recipes(), id, r, K = D.attackFx && D.attackFx._k;
    if (K) for (id in NEW_SHAPES) if (!K.SHAPES[id]) K.SHAPES[id] = NEW_SHAPES[id];
    for (id in R) {
      r = R[id];
      LOOK["S_" + id] = { shape: r.motif, aspect: ASPECT[r.motif] || 1, spin: r.spin, pal: r.pal, glow: r.glow, bits: r.bits, fx: r.fam };
      famById[id] = "S_" + id;
    }
  }

  D.sigFx = D.sigFx || {};
  D.sigFx.recipes = recipes; D.sigFx.rec = rec; D.sigFx.applyLooks = applyLooks; D.sigFx.PAL = PAL; D.sigFx.FORMS = FORMS; D.sigFx.MOTIFS = MOTIFS; D.sigFx.NEW_SHAPES = NEW_SHAPES;
  if (typeof module !== "undefined" && module.exports) module.exports = D.sigFx;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
