/* Merge EVO_TREE + UP atlas metadata into SPECIES / ENEMIES / weapons.
 * Hand-authored entries in data.js (the live 16 + eggs) keep their stats.
 */
(function (global) {
  var D = global.DBH = global.DBH || {};
  var TREE = global.EVO_TREE;
  var SLIM = (global.UP_MANIFEST_SLIM && global.UP_MANIFEST_SLIM.species) || {};
  var ALIASES = (TREE && TREE.idAliases) || (global.UP_MANIFEST_SLIM && global.UP_MANIFEST_SLIM.idAliases) || {};

  /* Sizes follow the show (Nov 16). A tamer projection stands about 46 px.
   * STAGE_SIZE is the usual height for a stage as a multiple of the tamer;
   * SHOW_SIZE overrides it for Digimon whose size on screen is well known
   * (Gatomon is a Champion but knee-high; Greymon towers; Angemon is a tall man). */
  var TAMER_H = 46;
  var STAGE_SIZE = { "Baby I": 0.38, "Baby II": 0.5, "Rookie": 0.8, "Champion": 2.0, "Ultimate": 2.4, "Mega": 2.6, "Mega+": 3.0, "Armor": 1.5, "Hybrid": 1.5, "Egg": 0.65, "Unknown": 0.8 };
  var SHOW_SIZE = {
    /* Rookies */
    patamon: 0.5, salamon: 0.5, gomamon: 0.65, wormmon: 0.55, terriermon: 0.6, guilmon: 1.0, renamon: 1.35, demidevimon: 0.6, candlemon: 0.6, crabmon: 0.6,
    hagurumon: 0.6, solarmon: 0.6, keramon: 0.7, otamamon: 0.5, kokabuterimon: 0.6, kokuwamon: 0.6, mushroomon: 0.6, syakomon: 0.5, sangomon: 0.5, ghostmon: 0.7, lalamon: 0.6,
    agumon: 0.85, gabumon: 0.85, biyomon: 0.75, tentomon: 0.75, hawkmon: 0.75, armadillomon: 0.7,
    /* Champions. Nov 18: the beasts and machines that stood under about 1.6 tamers were raised (a frame is taller
     * than what you see in it, so a giant spider set to 1.8 was showing at 1.35). The man-shaped ones (Angemon, Leomon, Meramon and their kind) are set so that what you see,
     * not the sprite frame, stands a head or two over a tamer: frames carry empty space and wings. */
    gatomon: 0.6, angemon: 2.0, greymon: 2.6, garurumon: 2.25, birdramon: 2.8, kabuterimon: 2.6, togemon: 2.3, ikkakumon: 2.6, exveemon: 1.8, stingmon: 1.8,
    aquilamon: 2.2, ankiromon: 2.46, growlmon: 2.6, kyubimon: 2.38, youkomon: 2.38, gargomon: 1.82, leomon: 1.75, madleomon: 1.85, devimon: 2.15, tyrannomon: 2.6, tuskmon: 2.6,
    kuwagamon: 2.6, seadramon: 2.8, meramon: 1.8, numemon: 1.18, raremon: 1.76, bakemon: 1.51, monochromon: 2.31, unimon: 2.38, frigimon: 2.15, shellmon: 2.6,
    guardromon: 1.99, guardromon_gold: 1.99, gekomon: 0.9, vilemon: 0.9, clockmon: 1.52, starmon: 1.41, redvegiemon: 1.64, woodmon: 2.06, kiwimon: 1.47, kokatorimon: 2.16,
    akatorimon: 2.16, flymon: 2.16, roachmon: 1.47, dokugumon: 2.53, devidramon: 2.84, flarerizamon: 1.75, golemon: 2.4, icemon: 2.4, tankmon: 1.93, mekanorimon: 2.17,
    mojyamon: 1.8, tortomon: 2.2, sunflowmon: 2.09, octmon: 1.71, gesomon: 2.4, ebidramon: 2.4, petermon: 1.22, sistermon_ciel: 1.46, sistermon_noir: 1.5, skullknightmon: 1.65,
    gladimon: 1.55, troopmon: 1.36, "hi-commandramon": 1.5, porcupamon: 1.0, machmon: 1.75, aegiomon: 1.2, hudiemon: 1.49, oboromon: 1.6,
    lavorvomon: 2.45, tobiumon: 2.22, jazardmon: 2.18,
    /* Ultimates */
    metalgreymon: 3.0, weregarurumon: 1.8, garudamon: 2.8, megakabuterimon: 3.0, lillymon: 0.8, lilamon: 0.8, zudomon: 3.0, magnaangemon: 1.9, angewomon: 1.5,
    paildramon: 1.9, dinobeemon: 1.9, silphymon: 1.4, shakkoumon: 2.6, wargrowlmon: 3.0, taomon: 1.6, rapidmon: 1.5, myotismon: 2.1, ladydevimon: 1.8, andromon: 1.6,
    monzaemon: 2.2, warumonzaemon: 2.2, etemon: 1.5, piximon: 0.5, digitamamon: 1.2, datamon: 0.6, pumpkinmon: 0.9, phantomon: 1.5, knightmon: 2.0, bluemeramon: 1.6,
    cherrymon: 2.8, garbagemon: 1.2, divermon: 1.4, infermon: 2.2, kimeramon: 3.0, megadramon: 3.0, gigadramon: 3.0, megaseadramon: 3.2, mammothmon: 3.0, triceramon: 2.6,
    okuwamon: 2.8, parrotmon: 2.8, shogungekomon: 2.6, jagamon: 1.0, kyukimon: 1.4, fumamon: 1.4, meteormon: 1.6, aegiochusmon: 1.4,
    /* Megas */
    wargreymon: 2.55, blackwargreymon: 2.55, metalgarurumon: 2.2, phoenixmon: 3.0, herculeskabuterimon: 3.0, rosemon: 1.5, vikemon: 2.8, seraphimon: 2.3, magnadramon: 3.2,
    imperialdramon_dragonmode: 3.4, imperialdramon_fightermode: 3.0, gallantmon: 2.0, sakuyamon: 1.5, megagargomon: 3.4, piedmon: 1.6, puppetmon: 0.9, machinedramon: 3.2,
    metalseadramon: 3.4, diablomon: 2.2, apocalymon: 3.4, armageddemon: 3.4, jijimon: 0.9, apollomon: 2.0, dianamon: 1.8, minervamon: 1.0, slashangemon: 1.8, valkyrimon: 1.6,
    hiandromon: 1.8, heavyleomon: 2.0, hydramon: 2.8,
    /* Armor */
    flamedramon: 1.3, magnamon: 1.3, halsemon: 1.6, pegasusmon: 1.8
  };
  var STAGE_HEIGHT = {};
  (function () { for (var k in STAGE_SIZE) STAGE_HEIGHT[k] = Math.round(STAGE_SIZE[k] * TAMER_H); })();


  var STAGE_DISPLAY_TO_KEY = {
    "Baby I": "Baby I",
    "Baby II (In-Training)": "Baby II",
    "Child (Rookie)": "Rookie",
    "Adult (Champion)": "Champion",
    "Perfect (Ultimate)": "Ultimate",
    "Ultimate (Mega)": "Mega",
    "Ultimate (Mega+)": "Mega+",
    "Armor": "Armor",
    "Hybrid": "Hybrid"
  };

  var STAGE_GAME = {
    "Baby I": "Baby",
    "Baby II": "In-Training",
    "Rookie": "Rookie",
    "Champion": "Champion",
    "Ultimate": "Ultimate",
    "Mega": "Mega",
    "Mega+": "Mega",
    "Armor": "Armor",
    "Hybrid": "Hybrid",
    "Egg": "Egg"
  };

  var STAGE_BASE = {
    "Baby I":     { maxHp: 62,  speed: 108, magnet: 74,  damage: 0.7,  radius: 8  },
    "Baby II":    { maxHp: 82,  speed: 124, magnet: 80,  damage: 0.85, radius: 9  },
    "Rookie":     { maxHp: 110, speed: 150, magnet: 86,  damage: 1,    radius: 16 },
    "Champion":   { maxHp: 160, speed: 145, magnet: 94,  damage: 1.15, radius: 22 },
    "Ultimate":   { maxHp: 220, speed: 148, magnet: 102, damage: 1.3,  radius: 26 },
    "Mega":       { maxHp: 280, speed: 160, magnet: 114, damage: 1.5,  radius: 26 },
    "Mega+":      { maxHp: 320, speed: 155, magnet: 120, damage: 1.65, radius: 30 },
    "Armor":      { maxHp: 170, speed: 155, magnet: 96,  damage: 1.2,  radius: 20 },
    "Hybrid":     { maxHp: 200, speed: 158, magnet: 100, damage: 1.25, radius: 22 }
  };

  var ATTR_TINT = {
    Vaccine: { color: "#f0a030", belly: "#f3ddb0", hp: 1.06, speed: 1, damage: 1 },
    Data:    { color: "#4aa7ff", belly: "#e8f0ff", hp: 1, speed: 1.06, damage: 1 },
    Virus:   { color: "#a060d0", belly: "#e8d0f0", hp: 1, speed: 1, damage: 1.08 },
    Free:    { color: "#7cf0c0", belly: "#e8fff4", hp: 1.02, speed: 1.02, damage: 1.02 },
    None:    { color: "#c0c4d0", belly: "#f0e8d8", hp: 1, speed: 1, damage: 1 },
    Unknown: { color: "#8a90a0", belly: "#d8dce4", hp: 1.1, speed: 0.94, damage: 1.04 }
  };

  var STAGE_ENEMY = {
    /* Nov 15: fewer enemies, each one tougher and nearly as fast as the
     * tamer (TAMER.speed 160): a Baby swarm runs at ~92% of it. */
    /* second pass: RPG-style, fewer enemies that each take real effort */
    /* third pass (gritty): fewer still, tougher, and slower on their feet */
    /* Tuned with a play-testing bot: a same-stage enemy takes about three
     * hits from a fresh move; one a stage up takes real work. */
    /* later the same day: the first two stages were too soft */
    "Baby I":                 { hp: 20,   speed: 116, damage: 6,  xp: 13,  radius: 8 },
    "Baby II (In-Training)":  { hp: 38,   speed: 118, damage: 9,  xp: 18,  radius: 9 },
    "Child (Rookie)":         { hp: 75,   speed: 118, damage: 13, xp: 26,  radius: 13 },
    "Adult (Champion)":       { hp: 200,  speed: 114, damage: 22, xp: 44,  radius: 18 },
    "Armor":                  { hp: 250,  speed: 117, damage: 26, xp: 54,  radius: 18 },
    "Perfect (Ultimate)":     { hp: 460,  speed: 114, damage: 32, xp: 75,  radius: 22 },
    "Ultimate (Mega)":        { hp: 1100, speed: 116, damage: 48, xp: 140, radius: 28 },
    "Ultimate (Mega+)":       { hp: 1600, speed: 114, damage: 60, xp: 190, radius: 32 }
  };

  var ROLE_MUL = {
    swarm:   { hp: 1,    spd: 1.08, dmg: 0.9,  xp: 1,    rad: 1 },
    fast:    { hp: 0.85, spd: 1.12, dmg: 1,    xp: 1.1,  rad: 0.95 },
    bruiser: { hp: 1.45, spd: 0.88, dmg: 1.22, xp: 1.35, rad: 1.1 },
    elite:   { hp: 2.1,  spd: 0.95, dmg: 1.45, xp: 2.1,  rad: 1.15 },
    boss:    { hp: 6.5,  spd: 0.82, dmg: 1.9,  xp: 5.5,  rad: 1.45 }
  };

  var SECRET_KINDS = { warp: 1, armor: 1, fusion: 1, mode: 1, dark: 1, special: 1 };

  function stageKeyOf(node) {
    if (!node) return "Rookie";
    if (STAGE_HEIGHT[node.stage]) return node.stage;
    if (node.stageDisplay && STAGE_DISPLAY_TO_KEY[node.stageDisplay]) return STAGE_DISPLAY_TO_KEY[node.stageDisplay];
    return "Rookie";
  }

  function stageHeight(idOrNode) {
    var node = typeof idOrNode === "string" ? nodeOf(idOrNode) : idOrNode;
    var sid = typeof idOrNode === "string" ? resolveId(idOrNode) : (node && node.id);
    if (sid && SHOW_SIZE[sid]) return Math.round(SHOW_SIZE[sid] * TAMER_H);
    var key = stageKeyOf(node);
    return STAGE_HEIGHT[key] || Math.round(0.8 * TAMER_H);
  }

  function nodeOf(id) {
    id = resolveId(id);
    if (TREE && TREE.species && TREE.species[id]) return TREE.species[id];
    return SLIM[id] || null;
  }

  function resolveId(id) {
    if (!id) return id;
    if (ALIASES[id]) return ALIASES[id];
    return id;
  }

  function hashColor(id) {
    var h = 0, i;
    for (i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) >>> 0;
    return "hsl(" + (h % 360) + ", 55%, 55%)";
  }

  function genericWeapons() {
    if (D.WEAPONS.emberShot) return;
    function proj(id, name, color, glow, summary, dmg, cd, spd, life) {
      return {
        id: id, name: name, type: "projectile", maxLevel: 5, color: color, glow: glow, summary: summary,
        levels: [
          { damage: dmg, cooldown: cd, count: 1, speed: spd, pierce: 0, radius: 6, spread: 0.14, knockback: 36, life: life || 0.9 },
          { damage: dmg + 5, cooldown: cd * 0.9, count: 1, speed: spd + 20, pierce: 0, radius: 6, spread: 0.14, knockback: 40, life: (life || 0.9) + 0.05 },
          { damage: dmg + 11, cooldown: cd * 0.82, count: 2, speed: spd + 40, pierce: 1, radius: 7, spread: 0.18, knockback: 46, life: (life || 0.9) + 0.08 },
          { damage: dmg + 18, cooldown: cd * 0.74, count: 2, speed: spd + 55, pierce: 1, radius: 8, spread: 0.2, knockback: 52, life: (life || 0.9) + 0.1 },
          { damage: dmg + 28, cooldown: cd * 0.66, count: 3, speed: spd + 70, pierce: 2, radius: 9, spread: 0.22, knockback: 60, life: (life || 0.9) + 0.12 }
        ]
      };
    }
    D.WEAPONS.emberShot = proj("emberShot", "Ember Shot", "#ff8a2a", "#ffd27a", "A compact fire spit favoured by Vaccine types.", 13, 0.72, 330);
    D.WEAPONS.aquaShot = proj("aquaShot", "Aqua Shot", "#4aa7ff", "#d4f0ff", "A chilled data bolt.", 13, 0.72, 340);
    D.WEAPONS.darkPulse = proj("darkPulse", "Dark Pulse", "#a060d0", "#e8d0f0", "A short virus bolt.", 14, 0.7, 320);
    D.WEAPONS.ironShot = proj("ironShot", "Iron Shot", "#9aa7b8", "#e8eef4", "A hard free-attribute pellet.", 13, 0.74, 350);
    D.WEAPONS.shadowBubbles = proj("shadowBubbles", "Shadow Bubbles", "#7a6aa0", "#d8d0f0", "Weak dark bubbles from a young virus form.", 8, 1.0, 220, 0.5);
    D.WEAPONS.blazeBurst = {
      id: "blazeBurst", name: "Blaze Burst", type: "projectile", maxLevel: 5, color: "#ff5a1a", glow: "#ffcf6b",
      summary: "A champion-weight fireball.",
      levels: [
        { damage: 28, cooldown: 1.05, count: 1, speed: 300, pierce: 1, radius: 11, spread: 0.12, knockback: 70 },
        { damage: 36, cooldown: 0.95, count: 1, speed: 320, pierce: 2, radius: 12, spread: 0.12, knockback: 80 },
        { damage: 44, cooldown: 0.88, count: 2, speed: 340, pierce: 2, radius: 13, spread: 0.18, knockback: 90 },
        { damage: 54, cooldown: 0.8, count: 2, speed: 360, pierce: 3, radius: 14, spread: 0.2, knockback: 100 },
        { damage: 68, cooldown: 0.72, count: 3, speed: 380, pierce: 3, radius: 15, spread: 0.22, knockback: 110 }
      ]
    };
    D.WEAPONS.iceHowl = {
      id: "iceHowl", name: "Ice Howl", type: "projectile", maxLevel: 5, color: "#7ecbff", glow: "#e8f6ff",
      summary: "A champion-weight ice blast.",
      levels: [
        { damage: 26, cooldown: 1.0, count: 1, speed: 320, pierce: 1, radius: 10, spread: 0.12, knockback: 64 },
        { damage: 34, cooldown: 0.92, count: 1, speed: 340, pierce: 2, radius: 11, spread: 0.12, knockback: 72 },
        { damage: 42, cooldown: 0.84, count: 2, speed: 360, pierce: 2, radius: 12, spread: 0.18, knockback: 82 },
        { damage: 52, cooldown: 0.76, count: 2, speed: 380, pierce: 3, radius: 13, spread: 0.2, knockback: 92 },
        { damage: 66, cooldown: 0.7, count: 3, speed: 400, pierce: 3, radius: 14, spread: 0.22, knockback: 104 }
      ]
    };
    D.WEAPONS.hexBolt = {
      id: "hexBolt", name: "Hex Bolt", type: "projectile", maxLevel: 5, color: "#8a4ad0", glow: "#e0c4ff",
      summary: "A champion-weight dark bolt.",
      levels: [
        { damage: 28, cooldown: 1.02, count: 1, speed: 310, pierce: 1, radius: 10, spread: 0.12, knockback: 68 },
        { damage: 36, cooldown: 0.94, count: 1, speed: 330, pierce: 2, radius: 11, spread: 0.12, knockback: 76 },
        { damage: 44, cooldown: 0.86, count: 2, speed: 350, pierce: 2, radius: 12, spread: 0.18, knockback: 86 },
        { damage: 56, cooldown: 0.78, count: 2, speed: 370, pierce: 3, radius: 13, spread: 0.2, knockback: 96 },
        { damage: 70, cooldown: 0.7, count: 3, speed: 390, pierce: 3, radius: 14, spread: 0.22, knockback: 108 }
      ]
    };
    D.WEAPONS.homingVolley = {
      id: "homingVolley", name: "Homing Volley", type: "missile", maxLevel: 5, color: "#5ad0ff", glow: "#b8f0ff",
      summary: "Ultimate-stage seeking shots.",
      levels: [
        { damage: 24, cooldown: 1.3, count: 2, speed: 240, pierce: 0, radius: 8, homing: 5.2, knockback: 48, life: 1.7 },
        { damage: 30, cooldown: 1.18, count: 2, speed: 260, pierce: 0, radius: 8, homing: 5.8, knockback: 54, life: 1.8 },
        { damage: 38, cooldown: 1.08, count: 3, speed: 280, pierce: 1, radius: 9, homing: 6.3, knockback: 60, life: 1.9 },
        { damage: 48, cooldown: 0.98, count: 3, speed: 300, pierce: 1, radius: 10, homing: 6.8, knockback: 68, life: 2.0 },
        { damage: 60, cooldown: 0.9, count: 4, speed: 320, pierce: 1, radius: 11, homing: 7.2, knockback: 76, life: 2.1 }
      ]
    };
    D.WEAPONS.sunNova = {
      id: "sunNova", name: "Sun Nova", type: "nova", maxLevel: 5, color: "#ffd200", glow: "#fff4a0",
      summary: "A mega-stage exploding globe.",
      levels: D.WEAPONS.terraForce ? D.WEAPONS.terraForce.levels : [
        { damage: 48, cooldown: 1.6, count: 1, speed: 220, radius: 16, knockback: 90, life: 1.4 }
      ]
    };
  }

  function weaponsFor(stageKey, attr) {
    attr = attr || "None";
    if (stageKey === "Baby I") return { startWeapon: "bubbleBlow" };
    if (stageKey === "Baby II") {
      if (attr === "Data") return { startWeapon: "frostyBubbles" };
      if (attr === "Virus") return { startWeapon: "shadowBubbles" };
      return { startWeapon: "spitFire" };
    }
    var rookie = "emberShot";
    if (attr === "Data") rookie = "aquaShot";
    else if (attr === "Virus") rookie = "darkPulse";
    else if (attr === "Free" || attr === "Unknown") rookie = "ironShot";
    if (stageKey === "Rookie") return { startWeapon: rookie };
    var sig = "blazeBurst";
    if (attr === "Data") sig = "iceHowl";
    else if (attr === "Virus") sig = "hexBolt";
    else if (attr === "Free" || attr === "Unknown") sig = "clawArc";
    if (stageKey === "Champion" || stageKey === "Armor" || stageKey === "Hybrid") {
      return { startWeapon: rookie, signatureWeapon: sig };
    }
    if (stageKey === "Ultimate") return { startWeapon: rookie, signatureWeapon: "homingVolley" };
    return { startWeapon: rookie, signatureWeapon: "sunNova" };
  }

  function buildSpecies(id, node) {
    var key = stageKeyOf(node);
    var baseSrc = STAGE_BASE[key] || STAGE_BASE.Rookie;
    var tint = ATTR_TINT[node.attribute] || ATTR_TINT.None;
    var wpn = weaponsFor(key, node.attribute);
    var base = {
      maxHp: Math.round(baseSrc.maxHp * tint.hp),
      speed: Math.round(baseSrc.speed * tint.speed),
      magnet: baseSrc.magnet,
      damage: Math.round(baseSrc.damage * tint.damage * 100) / 100
    };
    return {
      id: id,
      name: node.name || id,
      stage: STAGE_GAME[key] || key,
      stageKey: key,
      stageDisplay: node.stageDisplay || key,
      attribute: node.attribute || "None",
      type: node.type || "",
      color: tint.color,
      belly: tint.belly,
      radius: baseSrc.radius,
      base: base,
      startWeapon: wpn.startWeapon || null,
      signatureWeapon: wpn.signatureWeapon || null,
      evolutions: [],
      generated: true
    };
  }

  function isFlier(node) {
    var t = (node && (node.type || "")) || "";
    return /Bird|Wing|Sky|Angel|Devil/.test(t) && !/Insect/.test(t);
  }

  /* Enemy level, Flee and Hit for the Ragnarok-style accuracy rules
   * (js/ro-stats.js): chance to hit = 80 + Hit - Flee. Levels are set against
   * how fast the tamer's base level really climbs in this game, so a tamer
   * who ignores DEX misses about a fifth of the time and one who invests
   * does not. Quick and flying kinds are slipperier, ghosts most of all;
   * bruisers and bosses are easy to hit but hit true themselves. */
  var STAGE_LV = { "Baby I": 1, "Baby II (In-Training)": 2, "Child (Rookie)": 5, "Adult (Champion)": 9, "Armor": 9, "Perfect (Ultimate)": 14, "Ultimate (Mega)": 20, "Ultimate (Mega+)": 24 };
  function roStatsOf(id, node, stageDisp, role) {
    var lv = STAGE_LV[stageDisp] != null ? STAGE_LV[stageDisp] : 5, t = (node && node.type) || "";
    var agi = lv, dex = lv;
    if (role === "fast") agi = Math.round(agi * 1.5) + 3;
    if (isFlier(node)) agi += 4;
    if (/Ghost|Phantom|Spirit|Undead/.test(t) || /bakemon|soulmon|ghostmon|phantomon|wisemon/.test(id)) agi += 8;
    if (role === "bruiser") { agi = Math.round(agi * 0.6); dex += 2; }
    if (role === "boss") { agi = Math.round(agi * 0.6); dex += 4; }
    return { lv: lv, flee: lv + agi, hit: lv + dex };
  }
  function evadeOf(id, node, stageDisp, role) { return roStatsOf(id, node, stageDisp, role).flee; }

  function buildEnemy(id, entry) {
    var node = nodeOf(id) || { name: entry.name, attribute: entry.attribute, stageDisplay: entry.stageDisplay };
    var stageDisp = entry.stageDisplay || node.stageDisplay || "Child (Rookie)";
    var st = STAGE_ENEMY[stageDisp] || STAGE_ENEMY["Child (Rookie)"];
    var role = entry.role || "swarm";
    var mul = ROLE_MUL[role] || ROLE_MUL.swarm;
    var tint = ATTR_TINT[entry.attribute || node.attribute] || ATTR_TINT.None;
    return {
      id: id,
      name: entry.name || node.name || id,
      role: role,
      attribute: entry.attribute || node.attribute || "None",
      stageDisplay: stageDisp,
      color: tint.color,
      accent: "#1a1020",
      radius: Math.max(8, Math.round(st.radius * mul.rad)),
      hp: Math.max(8, Math.round(st.hp * mul.hp)),
      speed: Math.max(40, Math.round(st.speed * mul.spd)),
      damage: Math.max(4, Math.round(st.damage * mul.dmg)),
      xp: Math.max(1, Math.round(st.xp * mul.xp)),
      contactCd: role === "boss" ? 1.0 : 0.9,
      fly: isFlier(node),
      lv: roStatsOf(id, node, stageDisp, role).lv,
      flee: roStatsOf(id, node, stageDisp, role).flee,
      hit: roStatsOf(id, node, stageDisp, role).hit,
      elite: role === "elite" || role === "boss",
      boss: role === "boss",
      generated: true
    };
  }

  function fillCatalog() {
    genericWeapons();
    if (!D.SPECIES) D.SPECIES = {};
    if (!D.ENEMIES) D.ENEMIES = {};
    var id, node, built, existing;
    var source = {};
    if (SLIM) {
      for (id in SLIM) if (Object.prototype.hasOwnProperty.call(SLIM, id)) source[id] = SLIM[id];
    }
    if (TREE && TREE.species) {
      for (id in TREE.species) if (Object.prototype.hasOwnProperty.call(TREE.species, id)) source[id] = TREE.species[id];
    }
    for (id in source) {
      if (!Object.prototype.hasOwnProperty.call(source, id)) continue;
      node = source[id];
      existing = D.SPECIES[id];
      if (existing && !existing.generated) {
        existing.attribute = existing.attribute || node.attribute;
        existing.type = existing.type || node.type;
        existing.stageKey = existing.stageKey || stageKeyOf(node);
        existing.stageDisplay = existing.stageDisplay || node.stageDisplay;
        continue;
      }
      D.SPECIES[id] = buildSpecies(id, node);
    }
    if (TREE && TREE.enemies) {
      var stage, list, i, e, prev;
      for (stage in TREE.enemies) {
        if (!Object.prototype.hasOwnProperty.call(TREE.enemies, stage)) continue;
        list = TREE.enemies[stage] || [];
        for (i = 0; i < list.length; i++) {
          e = list[i];
          prev = D.ENEMIES[e.id];
          if (prev && !prev.generated) {
            prev.attribute = prev.attribute || e.attribute;
            prev.stageDisplay = prev.stageDisplay || stage;
            prev.role = prev.role || e.role;
            continue;
          }
          e.stageDisplay = stage;
          D.ENEMIES[e.id] = buildEnemy(e.id, e);
        }
      }
    }
  }

  function uniqueMostFood(foodCounts) {
    if (!foodCounts) return null;
    var k, best = null, bestN = 0, tied = false, total = 0;
    for (k in foodCounts) {
      if (!Object.prototype.hasOwnProperty.call(foodCounts, k)) continue;
      total += foodCounts[k] || 0;
      if (foodCounts[k] > bestN) { best = k; bestN = foodCounts[k]; tied = false; }
      else if (foodCounts[k] === bestN && bestN > 0) tied = true;
    }
    if (!best || tied || bestN <= 0) return null;
    if (bestN <= total / 2) return null;
    return best;
  }

  function distinctive(cond) {
    if (!cond) return false;
    return !!(cond.mostFood || cond.minKillsAttribute || cond.minKillsSpecies ||
      cond.minBossesBeaten || cond.minFaints || cond.minDesperationTime ||
      cond.minCareMistakes || cond.requiresPartner || cond.item);
  }

  /* Prefer existing Agumon/Gabumon/Numemon gates when a looser special
   * would otherwise always shadow them. Distinctive extras (food, KOs,
   * warp bosses, dark faints) can still win. */
  function hasEvoItem(stats, id) {
    var list = (stats && stats.items) || [];
    var i;
    for (i = 0; i < list.length; i++) if (list[i] === id) return true;
    return false;
  }

  /* Crest of Courage substitutes for minBossesBeaten on warp branches only.
     Default warp gates (including the boss) stay unchanged when the crest is not held. */
  function conditionsForEval(branch, stats) {
    var c = (branch && branch.conditions) || branch || {};
    if (branch && branch.kind === "warp" && hasEvoItem(stats, "crest") && c.minBossesBeaten) {
      var c2 = {}, k;
      for (k in c) if (Object.prototype.hasOwnProperty.call(c, k) && k !== "minBossesBeaten") c2[k] = c[k];
      return c2;
    }
    return c;
  }

  function pickEvolution(fromId, stats) {
    if (!TREE || !TREE.pickEvolution) return null;
    fromId = resolveId(fromId);
    stats = Object.assign({}, stats || {});
    /* Always set mostFood so EVO_TREE does not fall back to a tie-breaking first key. */
    if (!stats.mostFood) stats.mostFood = uniqueMostFood(stats.foodCounts) || "__none__";
    var crestWarp = null, list0, i0, br0;
    if (hasEvoItem(stats, "crest") && TREE.branches) {
      list0 = TREE.branches[fromId] || [];
      for (i0 = 0; i0 < list0.length; i0++) {
        br0 = list0[i0];
        if (br0.kind !== "warp") continue;
        if (TREE.conditionsMet(conditionsForEval(br0, stats), stats)) {
          if (!crestWarp || (br0.priority || 0) > (crestWarp.priority || 0)) crestWarp = br0;
        }
      }
    }
    var picked = TREE.pickEvolution(fromId, stats);
    if (crestWarp && (!picked || (crestWarp.priority || 0) >= (picked.priority || 0))) picked = crestWarp;
    if (!picked) return null;
    var list = TREE.branches[fromId] || [];
    var i, gate, gateOk = null;
    for (i = 0; i < list.length; i++) {
      if (!list[i].existingGate) continue;
      if (list[i].kind !== "standard" && list[i].kind !== "recover") continue;
      if (TREE.conditionsMet(list[i].conditions, stats)) { gateOk = list[i]; break; }
    }
    if (gateOk && picked !== gateOk) {
      if (!distinctive(picked.conditions) && (picked.kind === "special" || picked.kind === "mode" || picked.kind === "standard")) {
        return gateOk;
      }
    }
    return picked;
  }

  function branchProgress(cond, stats) {
    if (!cond) return 1;
    stats = stats || {};
    var joy = stats.joy == null ? (stats.happiness || 0) : stats.joy;
    var parts = [], ok;
    function ratio(have, need) {
      if (need == null) return;
      if (need <= 0) { parts.push(1); return; }
      parts.push(Math.max(0, Math.min(1, have / need)));
    }
    if (cond.minLevel != null) ratio(stats.level || 0, cond.minLevel);
    if (cond.minFood != null) ratio(stats.meals || 0, cond.minFood);
    if (cond.minHappiness != null) ratio(joy, cond.minHappiness);
    if (cond.minHpRatio != null && cond.minHpRatio > 0) ratio(stats.hpRatio == null ? 1 : stats.hpRatio, cond.minHpRatio);
    if (cond.maxFood != null) parts.push((stats.meals || 0) <= cond.maxFood ? 1 : 0);
    if (cond.maxHappiness != null) parts.push(joy <= cond.maxHappiness ? 1 : 0);
    if (cond.minCareMistakes != null) ratio(stats.careMistakes || 0, cond.minCareMistakes);
    if (cond.minFaints != null) ratio(stats.faints || 0, cond.minFaints);
    if (cond.minDesperationTime != null) ratio(stats.desperationTime || 0, cond.minDesperationTime);
    if (cond.minBossesBeaten != null) ratio(stats.bossesBeaten || 0, cond.minBossesBeaten);
    if (cond.mostFood) parts.push(((stats.mostFood || (TREE && TREE.mostFood(stats.foodCounts))) === cond.mostFood) ? 1 : 0);
    if (cond.minKillsAttribute) {
      for (ok in cond.minKillsAttribute) ratio((stats.killsAttribute && stats.killsAttribute[ok]) || 0, cond.minKillsAttribute[ok]);
    }
    if (cond.minKillsSpecies) {
      for (ok in cond.minKillsSpecies) ratio((stats.killsSpecies && stats.killsSpecies[ok]) || 0, cond.minKillsSpecies[ok]);
    }
    if (!parts.length) return TREE && TREE.conditionsMet(cond, stats) ? 1 : 0;
    var sum = 0;
    for (ok = 0; ok < parts.length; ok++) sum += parts[ok];
    return sum / parts.length;
  }

  function closestBranch(fromId, stats) {
    if (!TREE) return null;
    fromId = resolveId(fromId);
    var list = (TREE.branches[fromId] || []).slice();
    if (!list.length) return null;
    var i, b, score, best = null, bestScore = -1;
    var picked = pickEvolution(fromId, stats);
    if (picked) return picked;
    for (i = 0; i < list.length; i++) {
      b = list[i];
      if (b.kind === "fallback") continue;
      if (SECRET_KINDS[b.kind] && !TREE.conditionsMet(conditionsForEval(b, stats), stats) && isSecretBranch(b, stats)) continue;
      score = branchProgress(conditionsForEval(b, stats), stats);
      /* Slightly prefer standard / existing gates when scores tie. */
      if (b.existingGate || b.kind === "standard") score += 0.02;
      if (score > bestScore) { bestScore = score; best = b; }
    }
    return best || list[0];
  }

  function isSecretBranch(branch, stats) {
    if (!(branch && SECRET_KINDS[branch.kind] && !branch.existingGate)) return false;
    if (stats) {
      if (branch.kind === "warp" && hasEvoItem(stats, "crest")) return false;
      if (branch.kind === "armor" && hasEvoItem(stats, "digimental")) return false;
    }
    return true;
  }

  function nextForms(fromId) {
    fromId = resolveId(fromId);
    return (TREE && TREE.branches[fromId]) || [];
  }

  function reachableFrom(startId, maxDepth) {
    startId = resolveId(startId);
    var out = [], seen = {}, q = [{ id: startId, d: 0 }], i, cur, br, j, to;
    if (maxDepth == null) maxDepth = 6;
    seen[startId] = true;
    while (q.length) {
      cur = q.shift();
      out.push(cur.id);
      if (cur.d >= maxDepth) continue;
      br = nextForms(cur.id);
      for (j = 0; j < br.length; j++) {
        to = br[j].to;
        if (seen[to]) continue;
        seen[to] = true;
        q.push({ id: to, d: cur.d + 1 });
      }
    }
    return out;
  }

  function standardLine(startId, depth) {
    startId = resolveId(startId);
    var out = [startId], i, list, std, cur = startId;
    if (depth == null) depth = 8;
    for (i = 0; i < depth; i++) {
      list = nextForms(cur);
      std = null;
      list.forEach(function (b) {
        if (b.existingGate && b.kind === "standard") std = b;
      });
      if (!std) {
        list.forEach(function (b) {
          if (!std && b.kind === "standard") std = b;
        });
      }
      if (!std) break;
      cur = std.to;
      if (out.indexOf(cur) !== -1) break;
      out.push(cur);
    }
    return out;
  }

  fillCatalog();

  D.EVO_TREE = TREE;
  D.stageHeight = function (id) { return stageHeight(id); };
  D.stageKeyOf = function (id) { return stageKeyOf(nodeOf(id)); };
  D.pickEvolution = pickEvolution;
  D.closestBranch = closestBranch;
  D.branchProgress = branchProgress;
  D.isSecretBranch = isSecretBranch;
  D.conditionsForEval = conditionsForEval;
  D.nextForms = nextForms;
  D.reachableFrom = reachableFrom;
  D.standardLine = standardLine;
  D.resolveSpeciesId = resolveId;
  D.STAGE_HEIGHT = STAGE_HEIGHT;
  D.SHOW_SIZE = SHOW_SIZE;
  D.TAMER_H = TAMER_H;
  D.nodeOf = nodeOf;
  D.uniqueMostFood = uniqueMostFood;
})(typeof window !== "undefined" ? window : globalThis);
