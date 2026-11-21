/* Biomes of the Digital World (Nov 16).
 *
 * The map has no edge: terrain is worked out from where you stand, so
 * walking in one direction keeps turning up new country. world.js asks
 * pick() which biome a tile belongs to (from three slow noise fields) and
 * paints it with that biome's palette, materials and props.
 *
 *   File Plains      the calm green start; faint grid dots in the turf
 *   Native Forest    dark, thick with trees and glowing mushrooms
 *   Server Desert    sand ripples, buried chips, telephone poles to nowhere
 *   Freezeland       snow, ice lakes, data crystals of ice
 *   Sludge Marsh     murky ground, toxic green data sludge, dead trees
 *   Ember Crags      black rock with glowing cracks and rivers of lava
 *   Circuit City     metal plating, glowing traces, data streams, servers
 *   Dark Area        corrupted data: static, torn tiles, void pools
 *
 * Each def:
 *   g[3]      ground colours (three tile variants), hi / lo = speckles
 *   path, pathHi, pathLo, lip   the "path" material and its edge shadow
 *   w0, w1, foam, spark         the "water" material (lava, sludge, data...)
 *   ct0, ct1, ctHi, ctLo, rim   plateau tops;  face[]  the cliff wall
 *   mat       how much cliff / water / path (noise thresholds); solidWater = nobody can walk on it
 *   props     [kind, chance per tile] in order; flowers / tallgrass on or off
 *   deco(x, y, variant, h)      extra pixels on plain ground (16x16 tile; variant 0..5), or null
 *   wdeco(x, y, h)              extra pixels on the water material, or null
 *   mini[4]   minimap colours: ground, path, water, cliff
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});

  var DEFS = {
    plains: { name: "File Plains", seasonal: true,
      g: ["#467636", "#4a7438", "#437034"], hi: "#8ab058", lo: "#2f5422",
      path: "#8a6840", pathHi: "#c4a06a", pathLo: "#4a3218", lip: "#3a2814",
      w0: "#1c6874", w1: "#4eb8b4", foam: "#9af0ea", spark: "#e8fffc",
      ct0: "#6a8a4c", ct1: "#b8c878", ctHi: "#d0c090", ctLo: "#4a6038", rim: "#e8d8a8",
      face: ["#c4a878", "#8a6a48", "#6a5040", "#8a6a50", "#3a2a1c", "#5a4230", "#2a1c12"],
      mat: { cliff: 0.64, water: 0.70, path: 0.032 },
      props: [["tree", 0.03], ["bush", 0.03], ["rock", 0.016], ["pebbles", 0.012], ["boulder", 0.006], ["stump", 0.006], ["log", 0.005], ["bits", 0.004]], flowers: true, tallgrass: true,
      deco: function (x, y, v) { return (x % 8 === 0 && y % 8 === 0) ? "#6c9a52" : null; },
      mini: ["#4a7a3a", "#8a6840", "#2f8a94", "#9aa868"] },

    forest: { name: "Native Forest", seasonal: true,
      g: ["#2f5a30", "#315c30", "#2d582f"], hi: "#5a9a4a", lo: "#1c3a20",
      path: "#5e4a30", pathHi: "#8a7048", pathLo: "#33261a", lip: "#1c1a10",
      w0: "#16504e", w1: "#3a9a8a", foam: "#8ae0c8", spark: "#d8fff0",
      ct0: "#4a6a40", ct1: "#7a9a58", ctHi: "#a8b878", ctLo: "#2f4a2c", rim: "#c8d8a0",
      face: ["#8a8a5a", "#5a5a3a", "#4a4030", "#5a5038", "#2a2218", "#3a3024", "#16120c"],
      mat: { cliff: 0.66, water: 0.69, path: 0.026 },
      props: [["tree", 0.12], ["bush", 0.04], ["mushroom", 0.022], ["stump", 0.014], ["log", 0.012], ["rock", 0.01], ["boulder", 0.006], ["bits", 0.004]], flowers: true, tallgrass: true,
      deco: function (x, y, v, h) { return h > 0.992 ? "#7affc8" : (h < 0.03 ? "#24482a" : null); },
      mini: ["#2f5a30", "#5e4a30", "#2a7a70", "#6a8a50"] },

    desert: { name: "Server Desert", seasonal: false,
      g: ["#d8b870", "#d4b268", "#dcbc78"], hi: "#f0d898", lo: "#b8965a",
      path: "#a88a60", pathHi: "#c8aa80", pathLo: "#7a6040", lip: "#8a6a3a",
      w0: "#1a8a8a", w1: "#5ad8c8", foam: "#c8fff0", spark: "#ffffff",
      ct0: "#c89858", ct1: "#e8c080", ctHi: "#f8dca0", ctLo: "#a87840", rim: "#fff0c0",
      face: ["#e8c080", "#b88a50", "#a87040", "#b88050", "#6a4428", "#8a5a34", "#4a2c18"],
      mat: { cliff: 0.60, water: 0.78, path: 0.022 },
      props: [["cactus", 0.024], ["pebbles", 0.02], ["rock", 0.014], ["pole", 0.008], ["gear", 0.008], ["boulder", 0.008]], flowers: false, tallgrass: false,
      deco: function (x, y, v) {
        /* wind ripples; one variant has a chip half buried in the sand */
        if (v === 1 && x >= 5 && x <= 10 && y >= 6 && y <= 10) return (x === 5 || x === 10) ? (y % 2 ? "#e8c040" : "#c8a868") : (y === 6 ? "#4a5a6a" : "#2a3440");
        return ((y + (v * 5)) % 6 === 0 && ((x + y * 3 + v * 4) % 11) < 7) ? "#ccac66" : null;
      },
      mini: ["#d8b870", "#a88a60", "#3ab0a8", "#b88a50"] },

    snow: { name: "Freezeland", seasonal: false,
      g: ["#e4eef6", "#e0ebf4", "#e7f0f7"], hi: "#ffffff", lo: "#b8cce0",
      path: "#a8c0d8", pathHi: "#c8dcf0", pathLo: "#7a98b8", lip: "#8aa8c8",
      w0: "#8ac8e8", w1: "#c8ecff", foam: "#ffffff", spark: "#ffffff",
      ct0: "#c8d8e8", ct1: "#f0f6fc", ctHi: "#ffffff", ctLo: "#a0b8d0", rim: "#ffffff",
      face: ["#f0f6fc", "#a8c0d8", "#7a94b0", "#8aa4c0", "#4a6080", "#5a7090", "#34486a"],
      mat: { cliff: 0.62, water: 0.66, path: 0.024 },
      props: [["snowtree", 0.045], ["icecrystal", 0.016], ["snowrock", 0.016], ["boulder", 0.004]], flowers: false, tallgrass: false,
      deco: function (x, y, v, h) { return h > 0.985 ? "#8ae0ff" : (((x + y) % 16 === 0 && v === 2) ? "#c4d8ea" : null); },
      wdeco: function (x, y, h) { return ((x * 3 + y) % 13 === 0 || (x + y * 2) % 17 === 0) ? "#f4fbff" : null; },   /* cracks in the ice */
      mini: ["#e4eef6", "#a8c0d8", "#8ac8e8", "#b8cce0"] },

    swamp: { name: "Sludge Marsh", seasonal: true,
      g: ["#4a5a38", "#465636", "#4e5c3a"], hi: "#7a8a4a", lo: "#2c3a26",
      path: "#6a5438", pathHi: "#8a7450", pathLo: "#3a2c1c", lip: "#22241a",
      w0: "#3a7a1c", w1: "#9ae03a", foam: "#d8ff8a", spark: "#f4ffc0",
      ct0: "#5a6a44", ct1: "#8a9458", ctHi: "#a8b070", ctLo: "#3a4630", rim: "#c0c888",
      face: ["#8a8a5a", "#5a5a3c", "#4a4634", "#5a5440", "#26241c", "#383428", "#14120e"],
      mat: { cliff: 0.72, water: 0.56, path: 0.02 },
      props: [["deadtree", 0.045], ["mushroom", 0.02], ["stump", 0.012], ["log", 0.012], ["rock", 0.008], ["bits", 0.006]], flowers: false, tallgrass: true,
      deco: function (x, y, v, h) { return h < 0.06 ? "#34422c" : (h > 0.99 ? "#b8f060" : null); },
      wdeco: function (x, y, h) { return h > 0.97 ? "#e8ffb0" : null; },   /* bubbles */
      mini: ["#4a5a38", "#6a5438", "#7ac82c", "#7a8450"] },

    volcano: { name: "Ember Crags", seasonal: false,
      g: ["#3a3034", "#352c30", "#3e3438"], hi: "#5a4a4c", lo: "#221a1e",
      path: "#1c1820", pathHi: "#3a3644", pathLo: "#0e0c12", lip: "#120c0e",
      w0: "#d83a10", w1: "#ffb02a", foam: "#fff08a", spark: "#fffbe0",
      ct0: "#4a3c3c", ct1: "#6a5450", ctHi: "#8a6c60", ctLo: "#2c2224", rim: "#a88068",
      face: ["#7a5a50", "#4a3838", "#3a2a2c", "#4a3434", "#1c1216", "#2a1c20", "#ff6a1a"],
      /* lava is solid (solidWater) and burns at its edge, so there is less of it and fewer walls: the crags stay passable */
      solidWater: true, mat: { cliff: 0.64, water: 0.69, path: 0.02 },
      props: [["rock", 0.03], ["vent", 0.022], ["pebbles", 0.02], ["boulder", 0.012], ["deadtree", 0.008]], flowers: false, tallgrass: false,
      deco: function (x, y, v, h) {
        /* glowing cracks */
        var c = (v === 0 && (x === y || x === y + 1) && x > 3 && x < 12) || (v === 2 && x + y === 15 && x > 2 && x < 13) || (v === 4 && y === 9 && x > 4 && x < 11);
        return c ? (h > 0.5 ? "#ff7a1a" : "#c8300a") : null;
      },
      mini: ["#3a3034", "#1c1820", "#ff7a1a", "#6a5450"] },

    circuit: { name: "Circuit City", seasonal: false,
      g: ["#1c2c3c", "#1a2a3a", "#1e3040"], hi: "#2c4860", lo: "#121e2a",
      path: "#3a4a5c", pathHi: "#5a6e84", pathLo: "#243040", lip: "#0c141c",
      w0: "#0a5a8a", w1: "#3ae0ff", foam: "#b8f8ff", spark: "#ffffff",
      ct0: "#4a5a6e", ct1: "#7a8ca0", ctHi: "#a8bcd0", ctLo: "#34424e", rim: "#d0e4f4",
      face: ["#a8bcd0", "#6a7c90", "#3a4856", "#4a5a6a", "#1a222c", "#26303c", "#3ae0ff"],
      mat: { cliff: 0.60, water: 0.66, path: 0.04 },
      props: [["crystal", 0.018], ["server", 0.016], ["bitsc", 0.012], ["pebbles", 0.008], ["pole", 0.006]], flowers: false, tallgrass: false,
      deco: function (x, y, v) {
        /* panel seams and glowing traces with solder nodes */
        if (v === 0 && ((y === 5 && x > 1 && x < 11) || (x === 10 && y > 4 && y < 13))) return (x === 2 && y === 5) || (x === 10 && y === 12) ? "#b8f8ff" : "#2ac8e8";
        if (v === 1 && ((x === 4 && y > 1 && y < 10) || (y === 9 && x > 3 && x < 14))) return (x === 13 && y === 9) || (x === 4 && y === 2) ? "#b8f8ff" : "#2ac8e8";
        if (v === 2 && x >= 6 && x <= 9 && y >= 6 && y <= 9) return (x === 6 || x === 9 || y === 6 || y === 9) ? "#5a6e84" : "#0c141c";
        return (x === 0 || y === 0) ? "#142230" : null;
      },
      wdeco: function (x, y, h) { return (x % 4 === 1 && h > 0.55) ? "#d8fcff" : null; },   /* falling digits */
      mini: ["#1c2c3c", "#3a4a5c", "#3ae0ff", "#7a8ca0"] },

    glitch: { name: "Dark Area", seasonal: false,
      g: ["#2a1840", "#26163a", "#2e1a46"], hi: "#5a2a8a", lo: "#160a24",
      path: "#4a4458", pathHi: "#b8b0c8", pathLo: "#1c1826", lip: "#0c0614",
      w0: "#0a0410", w1: "#3a0a4a", foam: "#ff5ae0", spark: "#5af0e0",
      ct0: "#3a2a58", ct1: "#5a3a88", ctHi: "#8a5ac8", ctLo: "#22143a", rim: "#c08aff",
      face: ["#8a5ac8", "#4a2a78", "#2e1a4e", "#3a2260", "#120822", "#1c0e30", "#ff5ae0"],
      mat: { cliff: 0.61, water: 0.64, path: 0.03 },
      props: [["shard", 0.03], ["bitsc", 0.014], ["deadtree", 0.008], ["server", 0.004]], flowers: false, tallgrass: false,
      deco: function (x, y, v, h) {
        /* static and torn rows */
        if (v === 0 && y === 11 && x > 2 && x < 12) return x % 3 === 0 ? "#ff5ae0" : "#0a0410";
        if (v === 3 && y === 4 && x > 6) return x % 2 ? "#5af0e0" : "#160a24";
        return h > 0.988 ? "#ff5ae0" : (h < 0.012 ? "#5af0e0" : (h > 0.94 && h < 0.948 ? "#000000" : null));
      },
      wdeco: function (x, y, h) { return h > 0.9 ? (h > 0.96 ? "#5af0e0" : "#ff5ae0") : null; },
      mini: ["#2a1840", "#4a4458", "#b030c0", "#5a3a88"] }
  };
  var id;
  for (id in DEFS) DEFS[id].id = id;

  /* t = temperature, m = moisture, w = strangeness (all 0..1), d = tiles from the start */
  function pick(t, m, w, d) {
    if (d < 30) return "plains";
    /* thresholds are set against the measured spread of the noise: roughly
     * Dark Area 9%, Circuit City 10%, Freezeland 18%, desert and crags 10%
     * each, and the three green biomes 14% each */
    if (w > 0.86) return "glitch";
    if (w < 0.15) return "circuit";
    if (t < 0.29) return "snow";
    if (t > 0.68) return m < 0.5 ? "desert" : "volcano";
    return m < 0.38 ? "plains" : (m < 0.62 ? "forest" : "swamp");
  }

  /* ---------- props drawn for the biomes ---------- */
  var ART = {
    cactus: { pal: { K: "#1a1420", g: "#8ad070", G: "#3f9a4a", d: "#2a6a34" }, rows: [
      "....KKK.....", "...KgGGK....", "...KgGGK....", ".KKKgGGK....", "KgGKgGGK.KK.", "KgGKgGGKKgGK", "KgGGgGGKKgGK", ".KgGGGGGGgGK",
      "..KKgGGGGGK.", "...KgGGKKK..", "...KgGGK....", "...KgGGK....", "...KgGGK....", "...KgGdK....", "....KKK....." ] },
    pole: { pal: { K: "#1a1420", b: "#7a5a3a", w: "#a8845a", c: "#6ad0ff" }, rows: [
      "..KKKKKKKKKK..", ".KwwwwwwwwwwK.", "..KKKKKbKKKK..", "..c...KbK..c..", "......KbK.....", "...KKKKbKKK...", "..KwwwwwwwwK..", "...KKKKbKKK...",
      "......KbK.....", "......KbK.....", "......KbK.....", "......KbK.....", "......KbK.....", "......KbK.....", "......KbK.....", "......KbK.....",
      "......KbK.....", "......KbK.....", "......KbK.....", ".....KKbKK...." ] },
    crystal: { pal: { K: "#0c2a3a", h: "#e8ffff", c: "#5ae0f0", d: "#1a8aa8", s: "#3a4656" }, rows: [
      "....KK....", "...KhcK...", "...KhcK...", "..KhccdK..", "..KhccdK..", ".KhhccddK.", ".KhcccddK.", ".KhcccddK.", ".KhcccddK.",
      "..KccddK..", "..KccddK..", "...KcdK...", "..KKKKKK..", ".KssssssK.", "..KKKKKK.." ] },
    icecrystal: { pal: { K: "#4a6a9a", h: "#ffffff", c: "#c8ecff", d: "#7ab0e8", s: "#e4eef6" }, rows: null, like: "crystal" },
    server: { pal: { K: "#0c1018", m: "#6a7688", D: "#1c2430", n: "#3a4454", g: "#5af07a", r: "#ff5a4a", c: "#5ae0f0" }, rows: [
      ".KKKKKKKKKKKK.", "KmmmmmmmmmmmmK", "KmDDDDDDDDDDmK", "KmDgDrDDDcDDmK", "KmDDDDDDDDDDmK", "KmmmmmmmmmmmmK", "KmDDDDDDDDDDmK", "KmDcDgDDDgDDmK",
      "KmDDDDDDDDDDmK", "KmmmmmmmmmmmmK", "KmDDDDDDDDDDmK", "KmDgDgDcDDrDmK", "KmDDDDDDDDDDmK", "KmmmmmmmmmmmmK", "KnnnnnnnnnnnnK", ".KKKKKKKKKKKK." ] },
    deadtree: { pal: { K: "#16121a", b: "#6a5a4a", d: "#3a3028" }, rows: [
      "..K......K....", ".KbK....KbK...", "..KbK..KbK....", "...KbKKbK..K..", "....KbbK..KbK.", ".K..KbbK.KbK..", "KbK.KbbKKbK...", ".KbKKbbbbK....",
      "..KbbbbbK.....", "...KKbbK......", "....KbbK......", "....KbbK......", "....KbdK......", "....KbdK......", "...KbbddK.....", "..KKKKKKKK...." ] },
    mushroom: { pal: { K: "#1a1024", p: "#c070ff", P: "#8a40d8", h: "#f0d8ff", s: "#e8e0d0", S: "#a8a090" }, rows: [
      "....KKKK....", "..KKpPPpKK..", ".KpPPhPPPpK.", "KpPhPPPPhPpK", "KpPPPPhPPPpK", ".KKKKKKKKKK.", "....KssK....", "....KssK....", "...KsssK....", "...KssSK....", "....KKKK...." ] },
    vent: { pal: { K: "#120c0e", A: "#4a3a3a", s: "#2a2024", r: "#d8401a", O: "#ff8a2a", Y: "#ffe27a" }, rows: [
      "....KKKK....", "...KrOOrK...", "..KArYOrAK..", ".KAArOOrAAK.", ".KAAArrAAAK.", "KAAsAAAAsAAK", "KAssAAAAAssK", ".KKKKKKKKKK." ] },
    shard: { pal: { K: "#0a0410", m: "#ff7ae8", M: "#c030c0", X: "#3a0a4a", c: "#5af0e0" }, rows: [
      ".....K....", "....KmK...", "....KmK.c.", "...KmMK...", ".c.KmMK...", "..KmMMK...", "..KmMXK...", ".KmMMXK...", ".KmMXXK.c.",
      ".KMMXXK...", "..KMXXK...", "..KMXK....", "...KXK....", "...KK.....", ".c........" ] },
    gear: { pal: { K: "#2a1c0c", y: "#c8a040", Y: "#8a6a20" }, rows: [
      "...K..KK..K...", "..KyKKyyKKyK..", ".KyyyyyyyyyyK.", "KyyyYKKKKYyyyK", ".KyYK....KYyK.", "KyyYK....KYyyK", "KyyyK....KyyyK" ] },
    bits: { pal: { g: "#7affb0" }, rows: [".g..ggg..g.", "gg..g.g.gg.", ".g..g.g..g.", ".g..g.g..g.", "ggg.ggg.ggg", "...........", "...........", "..........."], glow: true },
    bitsc: { pal: { g: "#5af0ff" }, rows: null, like: "bits", glow: true }
  };
  var SPREAD = { cactus: 0.7, pole: 0.5, crystal: 0.6, icecrystal: 0.6, server: 1.0, deadtree: 0.9, mushroom: 0.6, vent: 0.8, shard: 0.6, gear: 0.9, bits: 0.4, bitsc: 0.4, snowtree: 1.2, snowrock: 0.85 };
  var sheets = {};
  function customProp(kind) {
    if (sheets[kind] !== undefined) return sheets[kind];
    var S = D.sprites, a = ART[kind], rows, sc, c, g, x, y, ch, col;
    if (typeof document === "undefined" || !S) return null;
    if (kind === "snowtree" || kind === "snowrock") {
      c = S.basePropCanvas ? S.basePropCanvas(kind === "snowtree" ? "tree" : "rock") : null;
      if (c && D.seasons && D.seasons.recolorProp) c = D.seasons.recolorProp(c, kind === "snowtree" ? "tree" : "rock", "winter");
      return (sheets[kind] = c || null);
    }
    if (!a) return (sheets[kind] = null);
    rows = a.rows || ART[a.like].rows; sc = S.SCALE || 3;
    c = document.createElement("canvas"); c.width = rows[0].length * sc; c.height = rows.length * sc;
    g = c.getContext("2d");
    for (y = 0; y < rows.length; y++) for (x = 0; x < rows[y].length; x++) {
      ch = rows[y].charAt(x); col = a.pal[ch];
      if (!col) continue;
      if (a.glow) { g.fillStyle = col; g.globalAlpha = 0.25; g.fillRect((x - 1) * sc, (y - 1) * sc, sc * 3, sc * 3); g.globalAlpha = 1; }
      g.fillStyle = col; g.fillRect(x * sc, y * sc, sc, sc);
    }
    return (sheets[kind] = c);
  }

  /* ---------- where each Digimon lives ----------
   * Every kind has a home biome, by what it is: there it turns up far more
   * often (data.js REGION), so hunting one kind for an egg or a catch means
   * going to its country. A Baby lives where its line's Rookie lives. */
  var HOME_BY_TYPE = [
    [/dinosaur|reptile|ceratopsian|armored dragon|ore|mineral|rock/i, "desert"],
    [/insect|larva|vegetation|seed|bulb|plant|pixie/i, "forest"],
    [/sea|aquatic|amphibian|crustacean|mollusk|fish/i, "swamp"],
    [/bird/i, "plains"]
  ];
  var HOME_BY_FAMILY = { fire: "volcano", ice: "snow", holy: "snow", water: "swamp", slime: "swamp", nature: "forest", wind: "plains", beast: "plains", machine: "circuit", dark: "glitch" };
  var homeCache = {};
  function homeOf(id) {
    if (homeCache[id]) return homeCache[id];
    var T = global.EVO_TREE, sp = T && T.species && T.species[id], at = id, guard = 0, i, list, nx, t, fam, out;
    /* Babies: follow the standard line up to the Rookie */
    while (sp && (sp.stage === "Baby I" || sp.stage === "Baby II") && guard++ < 4) {
      list = (T.branches && T.branches[at]) || []; nx = null;
      for (i = 0; i < list.length; i++) if (list[i].kind === "standard" && list[i].to) { nx = list[i].to; break; }
      if (!nx || !T.species[nx]) break;
      at = nx; sp = T.species[at];
    }
    t = (sp && sp.type) || ""; out = null;
    fam = D.moveFamilyOf ? D.moveFamilyOf(at) : null;
    /* the element decides for the strongly flavoured ones; body type for the rest */
    if (fam === "ice" || fam === "machine" || fam === "dark" || fam === "holy") out = HOME_BY_FAMILY[fam];
    for (i = 0; !out && i < HOME_BY_TYPE.length; i++) if (HOME_BY_TYPE[i][0].test(t)) out = HOME_BY_TYPE[i][1];
    return (homeCache[id] = out || HOME_BY_FAMILY[fam] || "plains");
  }
  function homeName(id) { var h = homeOf(id); return DEFS[h] ? DEFS[h].name : ""; }

  /* ---------- Who can cross water (Nov 20) ----------
   * 0 walks (stopped by water, like the tamer), 1 swims (crosses water, not lava),
   * 2 flies (crosses water and lava). By body type, plus the winged ones whose type doesn't say so. */
  var FLY_TYPE = /bird|angel|seraph|ghost|pixie|sky dragon|evil dragon|little devil|mythical/i;
  var SWIM_TYPE = /aquatic|amphibian|crustacean|mollusk|sea animal|sea beast/i;
  var FLY_IDS = { patamon: 1, tentomon: 1, kabuterimon: 1, megakabuterimon: 1, herculeskabuterimon: 1, kokabuterimon: 1, kuwagamon: 1, okuwamon: 1,
    flymon: 1, hudiemon: 1, stingmon: 1, roachmon: 1, dinobeemon: 1, pegasusmon: 1, nefertimon: 1, phoenixmon: 1, halsemon: 1, megadramon: 1,
    gigadramon: 1, magnadramon: 1, exveemon: 1, paildramon: 1, imperialdramon_dragonmode: 1, imperialdramon_fightermode: 1, silphymon: 1,
    chiropmon_beatbreak: 1, cupimon: 1, poromon: 1, lillymon: 1, lilamon: 1, rosemon: 1, piximon: 1 };
  var SWIM_IDS = { bukamon: 1, pichimon: 1, syakomon: 1, otamamon: 1, gomamon: 1 };
  var crossCache = {};
  function crossOf(id) {
    if (!id) return 0;
    if (crossCache[id] !== undefined) return crossCache[id];
    var T = global.EVO_TREE, sp = T && T.species && T.species[id], t = (sp && sp.type) || "", en = D.ENEMIES && D.ENEMIES[id], v = 0;
    if (FLY_IDS[id] || (en && en.fly) || (t && FLY_TYPE.test(t) && !/flightless/i.test(t))) v = 2;
    else if (SWIM_IDS[id] || (t && SWIM_TYPE.test(t))) v = 1;
    return (crossCache[id] = v);
  }

  D.biomes = { DEFS: DEFS, pick: pick, customProp: customProp, SPREAD: SPREAD, ART: ART, homeOf: homeOf, homeName: homeName, crossOf: crossOf };
  if (typeof module !== "undefined" && module.exports) module.exports = D.biomes;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
