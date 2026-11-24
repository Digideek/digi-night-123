/* Curated move pools (Nov 15).
 *
 * A partner only learns moves that fit what it is. Every species belongs to
 * a move family (fire, ice, water, dark, holy, machine, nature, slime, wind,
 * beast), and each family has four slots that grow with the stage:
 *
 *   primary  Baby: Bubble Blow -> In-Training -> Rookie -> Champion -> Ultimate -> Mega
 *   melee    In-Training: Headbutt -> Rookie: a claw/horn/fin -> Ultimate: the big version
 *   aura     Champion and up
 *   orbit    Ultimate and up
 *
 * Moves carry over when the partner digivolves. A level-up can then offer to
 * evolve a move into the bigger version of the new stage (Pepper Breath ->
 * Mega Flame), keeping most of its level. In-Training forms only have the
 * small moves.
 *
 * The Agumon and Gabumon lines use their own named moves; everything else
 * gets its family's set.
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});
  if (!D.WEAPONS) return;
  var W = D.WEAPONS;

  function cloneLevels(src, dmgMul, cdMul) {
    return src.map(function (l) {
      var o = {}, k;
      for (k in l) o[k] = l[k];
      o.damage = Math.round(l.damage * (dmgMul || 1));
      if (cdMul) o.cooldown = Math.round(l.cooldown * cdMul * 100) / 100;
      return o;
    });
  }
  function make(id, name, tpl, color, glow, summary, dmgMul, cdMul) {
    if (W[id] || !W[tpl]) return;
    W[id] = { id: id, name: name, type: W[tpl].type, maxLevel: W[tpl].maxLevel, color: color, glow: glow, summary: summary, levels: cloneLevels(W[tpl].levels, dmgMul, cdMul) };
  }

  /* shared small moves */
  make("headbutt", "Headbutt", "clawArc", "#e8e0d0", "#ffffff", "A clumsy little charge. It is all a young Digimon has.", 0.45, 1.1);
  if (W.headbutt) { W.headbutt.maxLevel = 3; W.headbutt.levels = W.headbutt.levels.slice(0, 3); }

  /* Templates per tier: t1 small spit, t2 rookie shot, t3 champion burst,
   * t4 ultimate seeking volley, t5 mega nova. */
  var TPL = { t1: "spitFire", t2: "emberShot", t3: "blazeBurst", t4: "homingVolley", t5: "sunNova", arc: "clawArc", bigArc: "wolfClaw", aura: "fireAura", orbit: "orbitShield" };

  var FAM = {
    fire: { c: "#ff8a2a", g: "#ffd27a", noun: "fire",
      names: ["Spit Fire", "Ember Shot", "Blaze Burst", "Flare Volley", "Sun Nova", "Sharp Claw", "Dragon Claw", "Fire Aura", "Brave Orbit"],
      ids: ["spitFire", "emberShot", "blazeBurst", "flareVolley", "sunNova", "clawArc", "dragonClaw", "fireAura", "orbitShield"] },
    ice: { c: "#7ecbff", g: "#e8f6ff", noun: "ice",
      names: ["Frosty Bubbles", "Ice Shard", "Ice Howl", "Blizzard Volley", "Absolute Zero", "Horn Jab", "Wolf Claw", "Frost Aura", "Hail Orbit"],
      ids: ["frostyBubbles", "iceShard", "iceHowl", "blizzardVolley", "absoluteZero", "hornJab", "wolfClaw", "frostAura", "hailOrbit"] },
    water: { c: "#4aa7ff", g: "#d4f0ff", noun: "water",
      names: ["Foam Spit", "Aqua Shot", "Tidal Burst", "Torrent Volley", "Maelstrom", "Fin Slash", "Riptide Slash", "Tide Ring", "Bubble Orbit"],
      ids: ["foamSpit", "aquaShot", "tidalBurst", "torrentVolley", "maelstrom", "finSlash", "riptideSlash", "tideRing", "bubbleOrbit"] },
    dark: { c: "#a060d0", g: "#e8d0f0", noun: "shadow",
      names: ["Shadow Bubbles", "Dark Pulse", "Hex Bolt", "Night Volley", "Eclipse Nova", "Shadow Claw", "Dread Claw", "Dread Aura", "Wisp Orbit"],
      ids: ["shadowBubbles", "darkPulse", "hexBolt", "nightVolley", "eclipseNova", "shadowClaw", "dreadClaw", "dreadAura", "wispOrbit"] },
    holy: { c: "#ffe27a", g: "#fffbe0", noun: "light",
      names: ["Glimmer", "Light Shot", "Radiant Burst", "Halo Volley", "Heaven's Nova", "Holy Strike", "Judgment Blade", "Holy Ring", "Halo Orbit"],
      ids: ["glimmer", "lightShot", "radiantBurst", "haloVolley", "heavensNova", "holyStrike", "judgmentBlade", "holyRing", "haloOrbit"] },
    machine: { c: "#9aa7b8", g: "#e8eef4", noun: "metal",
      names: ["Spark", "Iron Shot", "Cannon Burst", "Homing Volley", "Core Nova", "Metal Punch", "Piston Crush", "Static Field", "Drone Orbit"],
      ids: ["spark", "ironShot", "cannonBurst", "homingVolley", "coreNova", "metalPunch", "pistonCrush", "staticField", "droneOrbit"] },
    nature: { c: "#6fc24a", g: "#dcf5b8", noun: "plant",
      names: ["Sap Spit", "Thorn Shot", "Spore Burst", "Swarm Volley", "Bloom Nova", "Vine Whip", "Briar Lash", "Pollen Cloud", "Seed Orbit"],
      ids: ["sapSpit", "thornShot", "sporeBurst", "swarmVolley", "bloomNova", "vineWhip", "briarLash", "pollenCloud", "seedOrbit"] },
    slime: { c: "#8a9a3a", g: "#d8e08a", noun: "sludge",
      names: ["Goo Spit", "Sludge Shot", "Sludge Burst", "Ooze Volley", "Mire Nova", "Slap", "Body Slam", "Stink Cloud", "Blob Orbit"],
      ids: ["gooSpit", "sludgeShot", "sludgeBurst", "oozeVolley", "mireNova", "slap", "bodySlam", "stinkCloud", "blobOrbit"] },
    wind: { c: "#8fe0d0", g: "#e0fff8", noun: "wind",
      names: ["Peep Gust", "Feather Shot", "Gale Burst", "Storm Volley", "Tempest Nova", "Wing Cutter", "Talon Dive", "Gale Ring", "Feather Orbit"],
      ids: ["peepGust", "featherShot", "galeBurst", "stormVolley", "tempestNova", "wingCutter", "talonDive", "galeRing", "featherOrbit"] },
    beast: { c: "#d0a060", g: "#f4e4c4", noun: "fang",
      names: ["Yap", "Fang Shot", "Roar Burst", "Pack Volley", "Primal Nova", "Sharp Fang", "Savage Claw", "Battle Aura", "Spirit Orbit"],
      ids: ["yap", "fangShot", "roarBurst", "packVolley", "primalNova", "sharpFang", "savageClaw", "battleAura", "spiritOrbit"] }
  };
  var SLOT_TPL = [TPL.t1, TPL.t2, TPL.t3, TPL.t4, TPL.t5, TPL.arc, TPL.bigArc, TPL.aura, TPL.orbit];
  var SLOT_TEXT = [
    "A small NOUN spit. Short range, modest punch.",
    "A rookie's NOUN shot at the nearest foe.",
    "A champion-weight NOUN blast that punches through.",
    "Seeking NOUN shots that chase their target.",
    "A mega-stage NOUN globe that explodes on impact.",
    "A quick sweeping strike in the direction it faces.",
    "A wide, heavy strike that throws enemies back.",
    "A ring of NOUN that wears down anything close.",
    "Orbs of NOUN circle the partner and smash into enemies."
  ];
  var fam, i;
  for (fam in FAM) {
    for (i = 0; i < 9; i++) make(FAM[fam].ids[i], FAM[fam].names[i], SLOT_TPL[i], FAM[fam].c, FAM[fam].g, SLOT_TEXT[i].replace("NOUN", FAM[fam].noun));
  }

  /* Named lines. primary[stage], melee[stage], aura from Champion, orbit from Ultimate. */
  var LINES = {
    agumon: { match: /agumon|greymon|^botamon$|^koromon$/, family: "fire",
      primary: ["bubbleBlow", "spitFire", "pepperBreath", "megaFlame", "gigaDestroyer", "terraForce"],
      melee: [null, "headbutt", "clawArc", "clawArc", "dragonClaw", "dragonClaw"], aura: "fireAura", orbit: "orbitShield" },
    gabumon: { match: /gabumon|garurumon|^punimon$|^tsunomon$/, family: "ice",
      primary: ["bubbleBlow", "frostyBubbles", "blueBlaster", "howlingBlaster", "howlingBlaster", "gracefulCannon"],
      melee: [null, "headbutt", "hornJab", "hornJab", "wolfClaw", "wolfClaw"], aura: "frostAura", orbit: "hailOrbit" }
  };


  /* Named lines for every egg (Nov 16). forms = the line's standard route;
   * shots = In-Training, Rookie, Champion, Ultimate, Mega; melee = Rookie
   * claw, Ultimate claw. "@id" borrows a move another line already owns
   * (where two routes meet in the same Digimon). look = what the line's
   * moves look like on screen (shape + colours; fx = whose trail and impact
   * behaviour it borrows), read by attack-fx.js. */
  var EGG_LINES = [
    { k: "veemon", family: "fire", forms: ["chibomon", "demiveemon", "veemon", "exveemon", "wingdramon", "imperialdramon_dragonmode", "imperialdramon_fightermode"],
      shots: ["Demi Bubble", "Vee Shot", "Vee Laser", "Blaze Sonic Breath", "Positron Laser"], melee: ["Vee Headbutt", "Splendor Blade"], aura: "Sonic Wake", orbit: "Positron Orbit",
      look: { shape: "flame", fx: "fire", pal: ["#1a3a9a", "#3a7af0", "#9ad0ff", "#ffffff"], glow: "#5a9aff" } },
    { k: "guilmon", family: "fire", forms: ["jyarimon", "gigimon", "guilmon", "growlmon", "wargrowlmon", "gallantmon"],
      shots: ["Hot Bite", "Pyro Sphere", "Pyro Blaster", "Atomic Blaster", "Shield of the Just"], melee: ["Rock Breaker", "Lightning Joust"], aura: "Hazard Aura", orbit: "Aegis Orbit",
      look: { shape: "orb", fx: "fire", pal: ["#fff0c0", "#ff8a4a", "#e0203a", "#5a0a12"], glow: "#ff4a4a", bits: ["#e0203a", "#ff8a4a", "#fff0c0"] } },
    { k: "wormmon", family: "nature", forms: ["leafmon", "minomon", "wormmon", "stingmon", "dinobeemon"],
      shots: ["Pinecone Toss", "Sticky Net", "Moon Shooter", "Hell Masquerade", "@positronLaser"], melee: ["Silk Whip", "Spiking Strike"], aura: "Buzz Swarm", orbit: "Hornet Orbit",
      look: { shape: "shard", fx: "nature", pal: ["#2a5a18", "#7ac83a", "#d8f07a", "#ffffff"], glow: "#a8e04a" } },
    { k: "hagurumon", family: "machine", forms: ["choromon", "missimon", "hagurumon", "guardromon", "andromon", "hiandromon"],
      shots: ["Missile Pop", "Cog Crusher", "Guardian Barrage", "Gatling Attack", "Atomic Ray"], melee: ["Gear Bash", "Lightning Blade"], aura: "Magnet Field", orbit: "Cog Orbit",
      look: { shape: "star", fx: "machine", pal: ["#4a3a1a", "#b08a3a", "#f0d07a", "#fff8d0"], glow: "#e0b85a" } },
    { k: "gotsumon", family: "machine", forms: ["cotsucomon", "kakkinmon", "gotsumon", "monochromon", "digitamamon", "jijimon"],
      shots: ["Pebble Spit", "Rock Fist", "Volcanic Strike", "Nightmare Syndrome", "Hang On Death"], melee: ["Hard Head", "Slamming Tusk"], aura: "Earth Shaker", orbit: "Boulder Orbit",
      look: { shape: "blob", fx: "beast", pal: ["#3a2a1a", "#8a6a4a", "#c8a880", "#f0e0c8"], glow: "#c8a070" } },
    { k: "keramon", family: "dark", forms: ["kuramon", "tsumemon", "keramon", "vilemon", "infermon", "diablomon", "armageddemon"],
      shots: ["Glare Eye", "Bug Blaster", "Nightmare Shocker", "Spider Shooter", "Catastrophe Cannon"], melee: ["Nail Scratch", "Cable Crusher"], aura: "Virus Field", orbit: "Line Surge Orbit",
      look: { shape: "orb", fx: "dark", pal: ["#b8ffd0", "#e040c0", "#5a1a6a", "#10061a"], glow: "#e050d0", bits: ["#e040c0", "#60ffb0", "#ffffff"] } },
    { k: "biyomon", family: "wind", forms: ["nyokimon", "yokomon", "puwamon", "pinamon", "biyomon", "birdramon", "garudamon", "phoenixmon"],
      shots: ["Seed Spit", "Spiral Twister", "Meteor Wing", "Wing Blade", "Crimson Flare"], melee: ["Peck", "Eagle Claw"], aura: "Fire Flapping", orbit: "Starlight Orbit",
      look: { shape: "flame", fx: "fire", pal: ["#9a2a4a", "#ff6a8a", "#ffc27a", "#fff6d8"], glow: "#ff8a9a" } },
    { k: "hawkmon", family: "wind", forms: ["pururumon", "poromon", "hawkmon", "aquilamon"],
      shots: ["Feather Puff", "Feather Strike", "Blast Rings", "@wingBlade", "@crimsonFlare"], melee: ["Beak Pecker", "Grand Horn"], aura: "Mach Impulse", orbit: "@starlightOrbit",
      look: { shape: "leaf", fx: "wind", pal: ["#8a2a2a", "#e86a5a", "#ffd8c8", "#ffffff"], glow: "#ff9a8a" } },
    { k: "tentomon", family: "nature", forms: ["pabumon", "motimon", "tentomon", "kabuterimon", "megakabuterimon", "herculeskabuterimon"],
      shots: ["Static Bubble", "Super Shocker", "Electro Shocker", "Horn Buster", "Giga Blaster"], melee: ["Talon Attack", "Wild Scratcher"], aura: "Thunder Field", orbit: "Plasma Orbit",
      look: { shape: "bolt", fx: "machine", pal: ["#6a5a0a", "#f0d020", "#fff68a", "#ffffff"], glow: "#fff06a", bits: ["#fff68a", "#ffffff", "#f0d020"] } },
    { k: "gomamon", family: "water", forms: ["pichimon", "bukamon", "gomamon", "ikkakumon", "zudomon", "vikemon"],
      shots: ["Sea Foam", "Marching Fishes", "Harpoon Torpedo", "Hammer Spark", "Arctic Blizzard"], melee: ["Sharp Edge", "Vulcan's Hammer"], aura: "Northern Lights", orbit: "Mjolnir Orbit",
      look: { shape: "shard", fx: "water", pal: ["#0a5a6a", "#2ac0c8", "#a8f0f0", "#ffffff"], glow: "#5ae0e0" } },
    { k: "patamon", family: "holy", forms: ["poyomon", "tokomon", "putimon", "cupimon", "patamon", "angemon", "magnaangemon", "seraphimon"],
      shots: ["Bubble Puff", "Boom Bubble", "Hand of Fate", "Soul Vanisher", "Seven Heavens"], melee: ["Slamming Attack", "Excalibur"], aura: "Angel Halo", orbit: "Seven Stars Orbit",
      look: { shape: "star", fx: "holy", pal: ["#5a7ad0", "#a8c8ff", "#e8f2ff", "#ffffff"], glow: "#c8dcff", bits: ["#ffffff", "#e8f2ff", "#a8c8ff"] } },
    { k: "palmon", family: "nature", forms: ["pupumon", "yuramon", "tanemon", "palmon", "togemon", "lillymon", "rosemon"],
      shots: ["Seed Pop", "Plant Shock", "Needle Spray", "Flower Cannon", "Forbidden Temptation"], melee: ["Poison Ivy", "Thorn Whip"], aura: "Flower Wreath", orbit: "Petal Orbit",
      look: { shape: "leaf", fx: "nature", pal: ["#8a2a6a", "#f06ab0", "#ffc0e0", "#ffffff"], glow: "#ff8ac8", bits: ["#f06ab0", "#ffc0e0", "#8ad04a"] } },
    { k: "renamon", family: "beast", forms: ["relemon", "viximon", "renamon", "kyubimon", "taomon", "sakuyamon"],
      shots: ["Fox Spark", "Diamond Storm", "Fox Tail Inferno", "Talisman of Light", "Spirit Strike"], melee: ["Power Paw", "Talisman Slash"], aura: "Dragon Wheel", orbit: "Crystal Sphere",
      look: { shape: "shard", fx: "ice", pal: ["#2a3a9a", "#6a8aff", "#c8d8ff", "#ffffff"], glow: "#8aa0ff" } },
    { k: "zubamon", family: "holy", forms: ["sakumon", "sakuttomon", "zubamon", "zubaeagermon", "duramon", "durandamon"],
      shots: ["Blade Chip", "Twenty Dive", "Sonic Edge", "Brave Metal", "Legend Wave"], melee: ["Sword Horn", "Grand Durandal"], aura: "Edge Aura", orbit: "Blade Orbit",
      look: { shape: "crescent", fx: "holy", spin: 0, pal: ["#7a5a0a", "#f0c020", "#fff0a0", "#ffffff"], glow: "#ffd84a" } },
    { k: "armadillomon", family: "beast", forms: ["tsubumon", "upamon", "armadillomon", "ankiromon", "meteormon"],
      shots: ["Mud Spit", "Pebble Roll", "Tail Shock", "Cosmo Flash", "@gracefulCannon"], melee: ["Scratch Beat", "Tail Hammer"], aura: "Megaton Quake", orbit: "Meteor Orbit",
      look: { shape: "blob", fx: "beast", pal: ["#5a4a1a", "#c8a83a", "#f0dc8a", "#fff8d8"], glow: "#e0c860" } },
    { k: "salamon", family: "holy", forms: ["yukimibotamon", "nyaromon", "salamon", "gatomon", "angewomon", "magnadramon"],
      shots: ["Snow Puff", "Puppy Howling", "Cat's Eye Beam", "Celestial Arrow", "Fire Tornado"], melee: ["Petty Punch", "Lightning Paw"], aura: "Heaven's Charm", orbit: "Holy Ring Orbit",
      look: { shape: "star", fx: "holy", pal: ["#a83a7a", "#ff8ac8", "#ffd8ec", "#ffffff"], glow: "#ffa8d8", bits: ["#ffffff", "#ffd8ec", "#ff8ac8"] } },
    { k: "terriermon", family: "machine", forms: ["zerimon", "gummymon", "terriermon", "gargomon", "rapidmon", "megagargomon"],
      shots: ["Double Bubble", "Bunny Blast", "Gargo Laser", "Rapid Fire", "Mega Barrage"], melee: ["Terrier Tornado", "Power Pummel"], aura: "Golden Triangle", orbit: "Homing Orbit",
      look: { shape: "bolt", fx: "machine", pal: ["#1a5a2a", "#4ad06a", "#b8f8c0", "#ffffff"], glow: "#7af09a" } }
  ];
  function moveId(name) {
    var p = name.replace(/[^A-Za-z0-9 ]/g, "").split(" "), s = p[0].toLowerCase(), q;
    for (q = 1; q < p.length; q++) s += p[q].charAt(0).toUpperCase() + p[q].slice(1).toLowerCase();
    return s;
  }
  EGG_LINES.forEach(function (L) {
    var noun = FAM[L.family].noun, own = [];
    function mk(name, slot) {
      if (!name) return null;
      if (name.charAt(0) === "@") return name.slice(1);
      var id = moveId(name);
      if (W[id]) id = L.k + id.charAt(0).toUpperCase() + id.slice(1);
      make(id, name, SLOT_TPL[slot], L.look.pal[L.look.shape === "orb" ? 2 : 1], L.look.glow, SLOT_TEXT[slot].replace("NOUN", noun));
      own.push(id);
      return id;
    }
    var sh = L.shots.map(function (n, q) { return mk(n, q); }), m1 = mk(L.melee[0], 5), m2 = mk(L.melee[1], 6);
    LINES[L.k] = { match: new RegExp("^(" + L.forms.join("|") + ")$"), family: L.family,
      primary: ["bubbleBlow"].concat(sh), melee: [null, "headbutt", m1, m1, m2, m2],
      aura: mk(L.aura, 7), orbit: mk(L.orbit, 8), look: L.look, own: own, forms: L.forms };
  });

  /* ---- A move of its own for every form (Nov 18) ----
   * The shot a form learns is that form's famous attack, and it should play
   * like it, not like the last one drawn bigger. Done line by line; a line
   * listed here has every stage's shot rebuilt: what it does (below) and how
   * it looks (attack-fx.js SHOT_STYLE). So far: Agumon, Gomamon.
   *   lv.explode      bursts where it lands
   *   lv.turn         hunts: steers toward the nearest enemy and keeps its speed
   *   lv.boost        changes partway: after `boost` seconds it speeds up by boostMul and starts hunting
   *   def.charge      is gathered for that long before it is thrown
   *   type "march"    a row of bursts walking out toward the target
   *   type "beam" + lv.cone / lv.pulses   a widening blast that keeps blowing */
  function rows(n, f) { var out = [], i; for (i = 0; i < n; i++) out.push(f(i)); return out; }
  function reform(id, o) {
    var k;
    if (!W[id]) return;
    for (k in o) W[id][k] = o[k];
    W[id].maxLevel = W[id].levels.length;
  }
  /* Agumon: one fireball that bursts into a splash of flame */
  reform("pepperBreath", { type: "projectile", summary: "Agumon spits a fireball that bursts where it lands and splashes whatever is next to it.",
    levels: rows(5, function (i) { return { damage: [15, 20, 22, 28, 36][i], cooldown: [0.72, 0.64, 0.57, 0.5, 0.44][i], count: [1, 1, 2, 2, 2][i], speed: [340, 360, 380, 400, 420][i], pierce: 0, radius: [7, 7, 8, 8, 9][i], spread: 0.2, knockback: [40, 45, 50, 55, 60][i], explode: [26, 29, 32, 36, 40][i], life: 1.2 }; }) });
  /* Greymon: one huge, slow fireball and a big blast */
  reform("megaFlame", { name: "Nova Blast", type: "projectile", summary: "Greymon's giant fireball. Slow and heavy, and it blows up everything around where it hits.",
    levels: rows(5, function (i) { return { damage: [40, 52, 66, 84, 120][i], cooldown: [1.25, 1.15, 1.05, 0.96, 0.88][i], count: 1, speed: [260, 275, 290, 305, 320][i], pierce: 0, radius: [14, 15, 16, 17, 18][i], spread: 0.1, knockback: [90, 100, 110, 120, 130][i], explode: [52, 58, 64, 72, 80][i], life: 1.3 }; }) });
  /* MetalGreymon: missiles that swing out wide, hunt, and explode */
  reform("gigaDestroyer", { type: "missile", summary: "MetalGreymon's chest missiles. They swing out wide, hunt their targets down and explode.",
    levels: rows(5, function (i) { return { damage: [26, 32, 38, 46, 58][i], cooldown: [1.35, 1.22, 1.1, 1.0, 0.9][i], count: [2, 2, 3, 3, 4][i], speed: [230, 245, 260, 280, 300][i], pierce: 0, radius: [8, 8, 9, 10, 11][i], spread: 1.0, turn: [5, 5.3, 5.6, 5.9, 6.2][i], turnDelay: 0.22, knockback: [50, 55, 60, 70, 80][i], explode: [30, 34, 38, 42, 46][i], life: 2.0 }; }) });
  /* WarGreymon: gathers a sun over its head, then throws it */
  reform("terraForce", { charge: 0.45, summary: "WarGreymon gathers a sun over its head, then hurls it. It levels everything where it lands." });

  /* Bukamon: a puff of foam, several bubbles at once, close in */
  reform("seaFoam", { type: "projectile", summary: "A puff of sea foam: a few bubbles at once, close in.",
    levels: rows(5, function (i) { return { damage: [4, 5, 5, 6, 7][i], cooldown: [0.95, 0.9, 0.86, 0.83, 0.8][i], count: [2, 2, 3, 3, 3][i], speed: [220, 228, 236, 244, 252][i], pierce: 0, radius: 5, spread: 0.3, knockback: [16, 18, 20, 22, 24][i], life: 0.55 }; }) });
  /* Gomamon: a school of little fish that swim out and chase */
  reform("marchingFishes", { type: "missile", summary: "Gomamon calls a school of fish. They swim out in a fan and chase down whatever is near.",
    levels: rows(5, function (i) { return { damage: [6, 8, 10, 13, 16][i], cooldown: [0.95, 0.88, 0.8, 0.72, 0.65][i], count: [3, 3, 4, 5, 6][i], speed: [210, 222, 235, 248, 260][i], pierce: 0, radius: 5, spread: 0.5, turn: [5, 5.4, 5.8, 6.2, 6.6][i], turnDelay: 0.12, knockback: [18, 20, 22, 24, 26][i], life: 1.3 }; }) });
  /* Ikkakumon: the horn flies out, splits, and the torpedo inside lights up, hunts and explodes */
  reform("harpoonTorpedo", { type: "missile", summary: "Ikkakumon fires its horn. The horn splits open and the torpedo inside rockets after the target and explodes.",
    levels: rows(5, function (i) { return { damage: [38, 48, 60, 52, 66][i], cooldown: [1.15, 1.05, 0.96, 0.9, 0.82][i], count: [1, 1, 1, 2, 2][i], speed: [150, 155, 160, 165, 170][i], pierce: 0, radius: 10, spread: 0.6, boost: 0.28, boostMul: 2.5, turn: [5, 5.4, 5.8, 6.2, 6.6][i], knockback: [80, 88, 96, 104, 110][i], explode: [40, 44, 48, 52, 58][i], life: 1.9 }; }) });
  /* Zudomon: the hammer comes down and a row of sparks walks out along the ground */
  reform("hammerSpark", { type: "march", summary: "Zudomon slams its hammer down. A row of lightning strikes walks out along the ground toward the target.",
    levels: rows(5, function (i) { return { damage: [22, 27, 33, 40, 50][i], cooldown: [1.5, 1.4, 1.3, 1.2, 1.1][i], count: [3, 3, 4, 4, 5][i], step: 46, gap: 0.1, explode: [34, 36, 38, 42, 46][i], knockback: 70 }; }) });
  /* Vikemon: a blizzard that widens as it goes and keeps blowing */
  reform("arcticBlizzard", { type: "beam", summary: "Vikemon breathes a blizzard. It widens as it goes, keeps blowing, and freezes what it catches.",
    levels: rows(5, function (i) { return { damage: [26, 31, 38, 46, 56][i], cooldown: [2.3, 2.15, 2.0, 1.85, 1.7][i], range: [210, 225, 240, 255, 270][i], width: [80, 88, 96, 104, 112][i], cone: 1, pulses: 3, gap: 0.14, knockback: 60 }; }) });

  /* ---- The other seventeen lines (Nov 18, second pass) ----
   * Same idea, but written as a table: each move names what it does and the
   * numbers are worked out from what the move did before, so its strength
   * stays where it was (B = damage x shots of the old move at that level;
   * k slows or quickens the cast and scales the damage to match).
   *   shot    bullets: n, spread, full (a whole circle), pierce, explode, turn (hunts), jitter, once, tick
   *   beam    range, width, cone, pulses, fork (two crossing), twin (two side by side)
   *   chain   hops, jump          strike  n, scatter, pattern "ring", drop, land
   *   march   n, step, land       boom    a boomerang: out
   * charge = gathered that long first. */
  function grow(a, b, i) { return a + (b - a) * i / 4; }
  function gi(v, i) { return v && v.length === 2 ? Math.round(grow(v[0], v[1], i)) : v; }
  function gf(v, i) { return v && v.length === 2 ? Math.round(grow(v[0], v[1], i) * 100) / 100 : v; }
  function remake(id, o) {
    var d = W[id], old, lv = [], i, L, B, k = o.k || 1, n, c;
    if (!d) return;
    old = d.levels;
    /* what it did before, per second against one enemy (the test holds the new one to this) */
    if (o.t !== "nova") d.was = [old[0].damage * (old[0].count || 1) / old[0].cooldown, old[old.length - 1].damage * (old[old.length - 1].count || 1) / old[old.length - 1].cooldown];
    for (i = 0; i < 5; i++) {
      L = old[Math.min(i, old.length - 1)];
      B = (L.damage || 10) * (L.count || 1) * (o.pow || 1);
      c = Math.round((L.cooldown || 1) * k * 100) / 100;
      n = gi(o.n, i) || 1;
      if (o.t === "shot") {
        lv.push({ damage: Math.max(1, Math.round(B * k / n * (o.explode ? 0.62 : 1) * (o.pierce || o.once ? 0.85 : 1) / (o.tick ? 5 : 1))), single: 1, cooldown: c, count: n, speed: gi(o.speed || [300, 360], i), pierce: gi(o.pierce, i) || 0,
          radius: gi(o.radius || [6, 8], i), spread: o.spread || 0.18, full: o.full || 0, knockback: L.knockback || 40, explode: gi(o.explode, i) || 0, life: gf(o.life, i) || 1.2,
          turn: gf(o.turn, i) || 0, turnDelay: o.turnDelay || 0, jitter: o.jitter || 0, once: o.once || 0, tick: o.tick || 0 });
      } else if (o.t === "beam") {
        lv.push({ damage: Math.max(1, Math.round(B * k * 0.85 / ((o.pulses || 1) * (o.fork || o.twin ? 1.6 : 1)))), cooldown: c, range: gi(o.range || [150, 200], i), width: gi(o.width || [16, 22], i),
          cone: o.cone || 0, pulses: o.pulses || 1, gap: o.gap || 0.14, fork: o.fork || 0, twin: o.twin || 0, knockback: (L.knockback || 40) * 0.6 });
      } else if (o.t === "chain") {
        lv.push({ damage: Math.max(1, Math.round(B * k * 0.9)), cooldown: c, range: gi(o.range || [170, 220], i), hops: gi(o.hops || [1, 3], i), jump: gi(o.jump || [90, 120], i), knockback: 20 });
      } else if (o.t === "strike") {
        lv.push({ damage: Math.max(1, Math.round(B * k / (o.pattern === "ring" ? 2.2 : Math.pow(n, 0.75)) / 1.25)), cooldown: c, range: gi(o.range || [190, 240], i), explode: gi(o.explode || [36, 50], i), delay: o.delay || 0.35, gap: o.gap || 0,
          count: o.pattern === "ring" ? (o.per || 6) * 2 : n, per: o.per || 6, ring: o.ring || 0, pattern: o.pattern || "", scatter: gi(o.scatter || [50, 70], i), knockback: L.knockback || 60 });
      } else if (o.t === "march") {
        lv.push({ damage: Math.max(1, Math.round(B * k * 0.55)), cooldown: c, count: n, step: o.step || 46, gap: o.gap || 0.1, explode: gi(o.explode || [34, 46], i), knockback: 70 });
      } else if (o.t === "boom") {
        lv.push({ damage: Math.max(1, Math.round(B * k * 0.55)), cooldown: c, speed: gi(o.speed || [300, 360], i), out: gf(o.out || [0.5, 0.65], i), radius: gi(o.radius || [10, 13], i), knockback: 40 });
      } else {
        lv.push(L);
      }
    }
    d.levels = lv; d.maxLevel = 5;
    d.type = o.t === "shot" ? (o.turn ? "missile" : "projectile") : (o.t === "boom" ? "boomerang" : (o.t || d.type));
    if (o.name) d.name = o.name;
    if (o.s) d.summary = o.s;
    d.charge = o.charge || 0; d.drop = o.drop || ""; d.land = o.land || "";
  }
  /* WereGarurumon had Garurumon's shot; give it its own */
  if (!W.kaiserNail && W.howlingBlaster) {
    W.kaiserNail = JSON.parse(JSON.stringify(W.homingVolley || W.howlingBlaster));
    W.kaiserNail.id = "kaiserNail"; W.kaiserNail.name = "Kaiser Nail"; W.kaiserNail.color = W.howlingBlaster.color; W.kaiserNail.glow = W.howlingBlaster.glow;
    LINES.gabumon.primary[4] = "kaiserNail";
  }
  var REMAKE = {
    /* Gabumon */
    blueBlaster: { t: "beam", k: 1.5, range: [120, 150], width: [34, 44], cone: 1, s: "Gabumon breathes a stream of blue fire that widens as it goes." },
    howlingBlaster: { t: "beam", k: 1.7, range: [230, 290], width: [20, 28], s: "Garurumon's long blast of blue flame. It burns through everything in a line." },
    kaiserNail: { t: "shot", k: 1.3, n: [3, 3], spread: 0.3, once: 1, speed: [380, 440], radius: [13, 16], life: 0.55, s: "WereGarurumon slashes the air and three claw waves fly out, cutting through whatever they meet." },
    gracefulCannon: { t: "shot", k: 1.5, n: [4, 7], spread: 0.55, turn: [5, 6.5], turnDelay: 0.2, explode: [30, 42], speed: [250, 300], life: 2, name: "Metal Wolf Claw", s: "MetalGarurumon opens every hatch: a volley of freezing missiles that hunt and burst into ice." },
    /* Veemon */
    demiBubble: { t: "shot", k: 1, n: [2, 3], spread: 0.22, speed: [230, 260], life: 0.6, s: "DemiVeemon blows a pair of bubbles." },
    veeShot: { t: "shot", k: 0.9, n: [1, 2], pierce: [1, 2], speed: [420, 480], radius: [7, 9], s: "A fast bolt of blue fire that punches through the first enemy." },
    veeLaser: { t: "beam", k: 1.6, fork: 0.24, range: [200, 250], width: [16, 22], s: "ExVeemon's chest fires two beams that cross in an X." },
    blazeSonicBreath: { t: "beam", k: 1.9, cone: 1, pulses: 2, range: [200, 250], width: [70, 96], s: "Wingdramon's sonic fire breath: a wide cone that blows twice." },
    positronLaser: { t: "beam", k: 2.3, charge: 0.4, range: [320, 380], width: [40, 56], pow: 1.15, s: "Imperialdramon gathers power, then fires a huge beam through everything in its path." },
    /* Guilmon */
    hotBite: { t: "beam", k: 1.1, range: [80, 96], width: [40, 46], s: "Gigimon snaps its red-hot jaws shut on whatever is right in front of it." },
    pyroSphere: { t: "shot", k: 1.25, n: [1, 1], explode: [34, 48], speed: [300, 340], radius: [9, 11], s: "Guilmon spits a red sphere of fire that explodes where it hits." },
    pyroBlaster: { t: "beam", k: 1.7, cone: 0, pulses: 2, gap: 0.16, range: [170, 210], width: [28, 38], s: "Growlmon pours out a jet of fire, twice in a breath." },
    atomicBlaster: { t: "beam", k: 1.8, twin: 12, range: [250, 300], width: [14, 20], s: "WarGrowlmon's two chest cannons fire side by side." },
    shieldOfTheJust: { t: "beam", k: 2.3, charge: 0.45, range: [300, 360], width: [52, 68], pow: 1.15, s: "Gallantmon raises its shield, gathers light on it, and fires a beam as wide as the shield." },
    /* Wormmon */
    pineconeToss: { t: "shot", k: 1.1, n: [1, 1], explode: [20, 28], speed: [240, 270], radius: [6, 7], life: 0.9, s: "Minomon tosses a pinecone that bursts on landing." },
    stickyNet: { t: "shot", k: 1.2, n: [1, 1], explode: [30, 44], speed: [300, 330], radius: [8, 10], s: "Wormmon spits a net that opens wide and catches everything around where it lands." },
    moonShooter: { t: "shot", k: 0.4, n: [1, 1], pierce: [1, 2], jitter: 0.05, speed: [560, 620], radius: [5, 6], life: 0.6, s: "Stingmon fires a fast stream of energy needles from its arm." },
    hellMasquerade: { t: "chain", k: 1.3, hops: [3, 7], jump: [110, 140], range: [190, 240], s: "DinoBeemon blurs from enemy to enemy, striking each one faster than you can follow." },
    /* Hagurumon */
    missilePop: { t: "shot", k: 1.2, n: [1, 1], turn: [3, 4], explode: [20, 28], speed: [230, 260], life: 1.4, s: "Missimon fires a little missile that hunts and pops." },
    cogCrusher: { t: "shot", k: 1.15, n: [1, 2], spread: 0.3, once: 1, speed: [280, 320], radius: [10, 13], life: 0.9, s: "Hagurumon throws spinning gears that grind through everything in their way." },
    guardianBarrage: { t: "shot", k: 1.35, n: [2, 3], spread: 0.7, turn: [4.5, 6], turnDelay: 0.18, explode: [30, 40], speed: [250, 300], life: 1.8, s: "Guardromon launches whistling missiles that curve round onto their targets." },
    gatlingAttack: { t: "shot", k: 0.22, n: [1, 1], jitter: 0.09, speed: [600, 680], radius: [5, 6], life: 0.55, s: "Andromon opens up with a gatling stream. Each shot is small; there are a lot of them." },
    atomicRay: { t: "beam", k: 2.2, charge: 0.4, range: [320, 380], width: [34, 48], pow: 1.15, s: "HiAndromon charges its reactor and fires a ray through everything in a line." },
    /* Gotsumon */
    pebbleSpit: { t: "shot", k: 1, n: [3, 4], spread: 0.2, pow: 1.2, speed: [280, 310], radius: [4, 5], life: 0.5, s: "Kakkinmon spits a spray of pebbles." },
    rockFist: { t: "shot", k: 1.4, n: [1, 1], explode: [28, 38], speed: [330, 370], radius: [11, 14], pow: 1.1, s: "Gotsumon hurls a rock the size of its head. It hits hard and shatters." },
    volcanicStrike: { pow: 1.4, t: "strike", k: 1.5, n: [3, 5], scatter: [50, 70], explode: [34, 44], delay: 0.45, gap: 0.09, drop: "fall", s: "Monochromon lobs lava bombs that rain down on and around the target." },
    nightmareSyndrome: { t: "shot", k: 1.7, n: [1, 2], spread: 0.6, turn: [2.6, 3.4], once: 1, speed: [150, 180], radius: [16, 20], life: 2.6, s: "Digitamamon lets a nightmare out of its shell. It drifts after enemies and passes through all of them." },
    hangOnDeath: { pow: 1.4, t: "strike", k: 2, pattern: "ring", per: 6, ring: 74, range: [150, 170], explode: [40, 52], delay: 0.25, drop: "rise", land: "erupt", s: "Jijimon strikes the ground with its staff and two rings of stone burst up around it." },
    /* Keramon */
    glareEye: { t: "beam", k: 1, range: [110, 140], width: [8, 10], s: "Tsumemon's eye fires a thin, quick beam." },
    bugBlaster: { t: "shot", k: 0.8, n: [1, 2], spread: 0.12, speed: [360, 420], radius: [7, 8], s: "Keramon spits corrupted data. Quick, and it glitches as it flies." },
    nightmareShocker: { t: "shot", k: 1.5, n: [1, 1], once: 1, speed: [260, 290], radius: [22, 30], life: 0.6, s: "Vilemon's shriek: a wide wave of sound that passes through everything close in front of it." },
    spiderShooter: { t: "shot", k: 0.25, n: [1, 1], jitter: 0.16, speed: [520, 580], radius: [5, 6], life: 0.6, s: "Infermon sprays a storm of energy shots." },
    catastropheCannon: { t: "beam", k: 2.3, charge: 0.45, range: [320, 380], width: [44, 60], pow: 1.15, s: "Diaboromon's chest opens and a cannon of dark energy tears through everything in a line." },
    /* Biyomon and Hawkmon */
    seedSpit: { t: "shot", k: 0.7, n: [1, 1], speed: [380, 420], radius: [4, 5], life: 0.7, s: "Yokomon spits seeds, small and quick." },
    spiralTwister: { t: "shot", k: 1.25, n: [1, 1], once: 1, speed: [280, 320], radius: [10, 13], life: 0.9, s: "Biyomon's twin spiral of flame. It drills through everything in its path." },
    meteorWing: { pow: 1.5, t: "strike", k: 1.5, n: [3, 6], scatter: [56, 76], explode: [32, 42], delay: 0.4, gap: 0.08, drop: "fall", s: "Birdramon beats its wings and fireballs rain down on and around the target." },
    wingBlade: { t: "shot", k: 1.7, n: [1, 1], once: 1, speed: [340, 380], radius: [20, 26], life: 1.1, pow: 1.1, s: "Garudamon throws a bird of fire. It flies through everything in front of it." },
    crimsonFlare: { t: "beam", k: 2.1, cone: 1, pulses: 3, range: [230, 280], width: [84, 110], s: "Phoenixmon breathes crimson flame: a wide cone that keeps burning." },
    featherPuff: { pow: 1.5, t: "shot", k: 1, n: [3, 4], spread: 0.2, speed: [270, 300], radius: [4, 5], life: 0.5, s: "Poromon shakes loose a puff of feathers." },
    featherStrike: { t: "shot", k: 0.9, n: [2, 2], spread: 0.1, pierce: [1, 2], speed: [440, 500], radius: [6, 7], s: "Hawkmon throws two sharp feathers, fast and straight." },
    blastRings: { t: "shot", k: 1.4, n: [1, 2], spread: 0.25, once: 1, speed: [230, 260], radius: [16, 24], life: 1.0, s: "Aquilamon fires rings of sound that widen as they fly and pass through enemies." },
    /* Tentomon */
    staticBubble: { t: "shot", k: 1, n: [1, 2], spread: 0.2, explode: [16, 22], speed: [230, 260], life: 0.7, s: "Motimon blows a bubble with a spark in it. It pops with a snap." },
    superShocker: { t: "chain", k: 1, hops: [0, 2], jump: [80, 100], range: [170, 210], s: "Tentomon's bolt of lightning hits its target the instant it fires." },
    electroShocker: { pow: 2, t: "shot", k: 1.6, n: [1, 1], tick: 0.3, speed: [120, 140], radius: [18, 24], life: 1.7, s: "Kabuterimon's ball of lightning rolls slowly forward, shocking whatever it touches again and again." },
    hornBuster: { t: "strike", k: 1.5, n: [2, 4], scatter: [44, 60], explode: [40, 52], delay: 0.14, gap: 0.12, land: "zap", s: "MegaKabuterimon's horn calls lightning down on the target, strike after strike." },
    gigaBlaster: { t: "nova", charge: 0.4, s: "HerculesKabuterimon gathers a ball of lightning between its horns and fires it." },
    /* Patamon */
    bubblePuff: { t: "shot", k: 1, n: [2, 3], spread: 0.22, speed: [230, 260], life: 0.6, s: "Tokomon puffs out a couple of bubbles." },
    boomBubble: { t: "shot", k: 1.3, n: [1, 1], explode: [28, 40], speed: [300, 340], radius: [10, 13], s: "Patamon puffs up and fires a ball of air. It goes off with a boom and shoves things back." },
    handOfFate: { t: "beam", k: 1.7, range: [240, 300], width: [22, 30], s: "Angemon's fist of golden light, straight through everything in a line." },
    soulVanisher: { pow: 1.4, t: "strike", k: 1.6, n: [2, 4], scatter: [60, 80], explode: [36, 46], delay: 0.3, gap: 0.12, drop: "rise", s: "MagnaAngemon calls pillars of light up under the target and those near it." },
    sevenHeavens: { t: "shot", k: 1.6, n: [7, 7], spread: 0.28, turn: [4, 5.5], turnDelay: 0.25, explode: [26, 36], speed: [250, 290], life: 2, s: "Seraphimon looses seven orbs of holy light. Each finds a target and bursts." },
    /* Palmon */
    seedPop: { t: "shot", k: 1.1, n: [1, 1], explode: [18, 26], speed: [260, 290], life: 0.8, s: "Tanemon spits a seed that pops." },
    plantShock: { t: "chain", k: 1.1, hops: [1, 2], jump: [70, 90], range: [130, 160], s: "Palmon's vines whip out, lash the target and snap on to the next." },
    needleSpray: { t: "shot", k: 1.3, n: [10, 16], full: 1, speed: [330, 370], radius: [4, 5], life: 0.42, pow: 4.5, s: "Togemon spins and needles fly out in every direction." },
    flowerCannon: { t: "shot", k: 1.5, n: [1, 1], charge: 0.25, explode: [44, 58], speed: [340, 380], radius: [11, 14], pow: 1.1, s: "Lillymon's hands close into a flower, and the flower fires." },
    forbiddenTemptation: { t: "beam", k: 2.1, cone: 1, pulses: 3, range: [220, 270], width: [84, 110], s: "Rosemon looses a storm of petals: a wide cone that keeps coming." },
    /* Renamon */
    foxSpark: { t: "shot", k: 0.7, n: [1, 1], speed: [380, 420], radius: [5, 6], life: 0.7, s: "Viximon flicks a quick blue spark." },
    diamondStorm: { t: "shot", k: 1.2, n: [5, 8], spread: 0.11, speed: [460, 520], radius: [4, 5], life: 0.7, pow: 1.3, s: "Renamon leaps and a spray of crystal shards comes down on the target." },
    foxTailInferno: { t: "shot", k: 1.6, n: [5, 9], spread: 0.3, turn: [4.5, 6], turnDelay: 0.22, speed: [220, 260], radius: [6, 7], life: 1.8, s: "Kyubimon's nine tails each loose a ghost-fire that hunts something down." },
    talismanOfLight: { t: "shot", k: 1.5, n: [2, 3], spread: 0.16, explode: [36, 48], speed: [320, 360], radius: [8, 10], s: "Taomon throws paper talismans. Each one detonates in a seal of light." },
    spiritStrike: { t: "shot", k: 1.8, n: [4, 4], spread: 0.5, turn: [4, 5], turnDelay: 0.15, once: 1, speed: [240, 280], radius: [12, 15], life: 2.4, pow: 1.25, s: "Sakuyamon sends out four fox spirits. They run down enemies and pass through every one." },
    /* Zubamon */
    bladeChip: { t: "shot", k: 0.7, n: [1, 1], speed: [380, 420], radius: [4, 5], life: 0.7, s: "Sakuttomon flicks a chip of blade." },
    twentyDive: { t: "shot", k: 1.1, n: [1, 1], pierce: [2, 4], speed: [480, 540], radius: [7, 9], life: 0.6, s: "Zubamon launches itself as a blade of light, straight through the first few enemies." },
    sonicEdge: { t: "shot", k: 1.4, n: [1, 2], spread: 0.3, once: 1, speed: [340, 380], radius: [18, 24], life: 0.7, s: "ZubaEagermon's cut travels: a golden crescent that slices through a whole rank." },
    braveMetal: { t: "boom", k: 1.5, speed: [340, 400], out: [0.5, 0.62], radius: [13, 16], s: "Duramon throws its blade. It scythes out through the enemy and back to its hand." },
    legendWave: { t: "shot", k: 2.2, n: [1, 1], charge: 0.35, once: 1, speed: [300, 330], radius: [40, 52], life: 1.2, pow: 1.2, s: "Durandamon raises the legendary sword, and one great wave of light cuts across the field." },
    /* Armadillomon */
    mudSpit: { t: "shot", k: 1.1, n: [1, 1], explode: [20, 28], speed: [240, 270], life: 0.8, s: "Upamon spits a glob of mud that splatters." },
    pebbleRoll: { t: "shot", k: 1.4, n: [1, 1], once: 1, speed: [200, 230], radius: [12, 15], life: 1.3, s: "Armadillomon sends a boulder rolling. It bowls through everything in its way." },
    tailShock: { t: "march", k: 1.5, n: [3, 5], step: 44, land: "erupt", s: "Ankylomon slams its tail down and a row of stone spikes bursts up toward the target." },
    cosmoFlash: { pow: 1.5, t: "strike", k: 1.7, n: [4, 6], scatter: [60, 84], explode: [38, 48], delay: 0.45, gap: 0.08, drop: "fall", s: "Meteormon calls a shower of meteors down on and around the target." },
    /* Salamon */
    snowPuff: { t: "shot", k: 1, n: [2, 3], spread: 0.22, speed: [230, 260], life: 0.6, s: "Nyaromon puffs out a couple of snowballs." },
    puppyHowling: { t: "beam", k: 1.4, cone: 1, pulses: 2, gap: 0.16, range: [120, 150], width: [60, 76], s: "Salamon howls: rings of sound that spread out in front of it." },
    catsEyeBeam: { t: "beam", k: 1.4, twin: 5, range: [210, 260], width: [8, 10], s: "Gatomon's eyes flash and two thin beams lance out." },
    celestialArrow: { t: "shot", k: 1.9, n: [1, 1], pierce: [4, 8], speed: [760, 840], radius: [8, 10], life: 0.6, pow: 1.2, s: "Angewomon draws and looses an arrow of light. Nothing in its line stops it." },
    fireTornado: { t: "shot", k: 2.4, n: [1, 1], tick: 0.3, speed: [80, 95], radius: [30, 40], life: 2.4, s: "Magnadramon sets a tornado of fire loose. It crawls forward, burning whatever is inside it." },
    /* Terriermon */
    doubleBubble: { t: "shot", k: 1, n: [2, 2], spread: 0.2, speed: [230, 260], life: 0.6, s: "Gummymon blows two bubbles at once." },
    bunnyBlast: { t: "shot", k: 0.85, n: [1, 1], pierce: [1, 2], speed: [440, 500], radius: [7, 8], s: "Terriermon spits a bolt of green energy that punches through." },
    gargoLaser: { t: "shot", k: 0.22, n: [1, 1], jitter: 0.08, speed: [600, 680], radius: [5, 6], life: 0.55, s: "Gargomon's arm cannons spin up and pour out a stream of pellets." },
    rapidFire: { t: "shot", k: 1.1, n: [2, 4], spread: 0.6, turn: [6, 8], turnDelay: 0.12, explode: [28, 38], speed: [320, 380], life: 1.6, s: "Rapidmon's arm launchers fire fast missiles that snap onto their targets." },
    megaBarrage: { t: "shot", k: 2.1, n: [6, 10], spread: 0.42, turn: [4.5, 6], turnDelay: 0.32, explode: [34, 44], speed: [260, 300], life: 2.2, pow: 1.3, s: "MegaGargomon opens every hatch at once. The sky fills with missiles." }
  };
  (function () { var k; for (k in REMAKE) remake(k, REMAKE[k]); })();

  /* ---- Signatures and techniques (Nov 18) ----
   * Two more kinds of move, both learnable from Baby, so a young partner has
   * more to pick from than Bubble Blow and the masteries:
   *
   *   special  ONE move that belongs to the line and nobody else.
   *   tech     a few plain "data" moves every Digimon can learn (no element).
   *
   * Unlike shots and claws these do not replace one another: every one that
   * is learned fires on its own (slow) clock. They are built from seven new
   * kinds of attack (mission-sim.js _fireFrom):
   *   beam       hits everything on a line at once
   *   strike     lands on the target a moment later and bursts (fall: from the
   *              sky, rise: out of the ground)
   *   mine       is left on the ground and goes off under whoever steps on it
   *   boomerang  flies out through enemies and comes back through them
   *   burst      a shockwave round the partner that throws enemies back
   *   chain      jumps from enemy to enemy
   *   fan        a short-range spray (a plain projectile, many at once)
   * "grows" moves hit harder as the partner's stage rises (GROW), so one
   * learned as a Baby is still worth its points later. */
  var GROW = [1, 1.45, 2.2, 3.3, 4.8, 6.6];
  var KIT = {
    beam: function (i) { return { damage: [9, 12, 15, 18, 22][i], cooldown: [2.6, 2.45, 2.3, 2.1, 1.9][i], range: [110, 122, 134, 147, 160][i], width: [16, 18, 20, 22, 24][i], knockback: 30 }; },
    strike: function (i) { return { damage: [14, 18, 23, 28, 34][i], cooldown: [3.2, 3.0, 2.8, 2.6, 2.4][i], range: [170, 180, 190, 200, 210][i], explode: [34, 39, 44, 49, 54][i], delay: 0.42, knockback: 60 }; },
    mine: function (i) { return { damage: [16, 21, 26, 32, 38][i], cooldown: [3.4, 3.2, 3.0, 2.8, 2.6][i], range: 150, radius: 9, explode: [40, 45, 50, 55, 60][i], life: 7, max: [2, 2, 3, 3, 4][i], knockback: 70 }; },
    boomerang: function (i) { return { damage: [8, 10, 13, 16, 20][i], cooldown: [2.8, 2.6, 2.45, 2.3, 2.1][i], speed: [260, 275, 290, 305, 320][i], out: [0.45, 0.48, 0.52, 0.56, 0.6][i], radius: [8, 8, 9, 9, 10][i], knockback: 30 }; },
    burst: function (i) { return { damage: [10, 13, 17, 21, 26][i], cooldown: [3.6, 3.4, 3.2, 3.0, 2.8][i], radius: [58, 67, 76, 86, 96][i], knockback: [150, 165, 180, 200, 220][i] }; },
    chain: function (i) { return { damage: [8, 10, 13, 16, 20][i], cooldown: [2.6, 2.45, 2.3, 2.1, 1.9][i], range: [150, 160, 170, 180, 190][i], hops: [2, 3, 3, 4, 5][i], jump: [90, 97, 105, 112, 120][i], knockback: 20 }; },
    fan: function (i) { return { damage: [5, 6, 8, 10, 12][i], cooldown: [2.4, 2.25, 2.1, 1.95, 1.8][i], count: [3, 4, 4, 5, 6][i], speed: 280, pierce: 0, radius: 5, spread: 0.2, knockback: 20, life: 0.45 }; }
  };
  function kit(id, name, kind, color, glow, summary, o) {
    if (W[id]) return null;
    var levels = [], i;
    for (i = 0; i < 5; i++) levels.push(KIT[kind](i));
    W[id] = { id: id, name: name, type: kind === "fan" ? "projectile" : kind, fan: kind === "fan", maxLevel: 5, grows: true, color: color, glow: glow, summary: summary, levels: levels };
    if (o) for (i in o) W[id][i] = o[i];
    return id;
  }

  /* every Digimon can learn these */
  var TECHS = [
    kit("byteBurst", "Byte Burst", "burst", "#58e8ff", "#c8fbff", "A ring of raw data bursts out of the partner and throws everything near it back."),
    kit("bubbleTrap", "Bubble Trap", "mine", "#c8f0ff", "#ffffff", "Leaves a big bubble on the ground. It pops under the first enemy to touch it."),
    kit("glitchChain", "Glitch Chain", "chain", "#7af0c0", "#e0fff2", "A glitch that leaps from enemy to enemy, weaker with every jump."),
    kit("pixelMeteor", "Pixel Meteor", "strike", "#9ad0ff", "#ffffff", "Calls a block of pixels down on the target. It lands a moment later and bursts.", { drop: "fall" })
  ];
  var TECH_LOOK = { byteBurst: "data", bubbleTrap: "bubble", glitchChain: "data", pixelMeteor: "data" };

  /* one per line: [name, kind, what it says on the card, strike style] */
  var SPECIALS = {
    agumon: ["Baby Burner", "beam", "A jet of flame that scorches everything in a line."],
    gabumon: ["Icicle Fang", "strike", "An icicle drops on the target and shatters.", "fall"],
    veemon: ["Boom Boom Punch", "strike", "A shock punch that goes off right under the target.", "rise"],
    guilmon: ["Hazard Mine", "mine", "Burns a hazard mark into the ground. It blows up under the first enemy to cross it."],
    wormmon: ["Web Snare", "mine", "Spins a web on the ground that snaps shut on whatever walks in."],
    hagurumon: ["Darkness Gear", "boomerang", "Throws a spinning gear that cuts through enemies and comes back."],
    gotsumon: ["Angry Rock", "strike", "Drops a boulder on the target from above.", "fall"],
    keramon: ["Crazy Giggle", "burst", "A burst of corrupted data that throws everything near it back."],
    biyomon: ["Ember Feathers", "fan", "A spray of burning feathers at close range."],
    hawkmon: ["Feather Slash", "boomerang", "Throws its head feather. It slices through enemies and flies back."],
    tentomon: ["Static Jump", "chain", "A spark that jumps from enemy to enemy."],
    gomamon: ["Fish Geyser", "strike", "A column of water and fish erupts under the target.", "rise"],
    patamon: ["Holy Glint", "beam", "A thin ray of light that pierces everything in a line."],
    palmon: ["Root Breaker", "strike", "Roots burst out of the ground under the target.", "rise"],
    renamon: ["Fox Leaves", "fan", "A spray of leaf arrowheads at close range."],
    zubamon: ["Spin Edge", "burst", "Spins its blades in a circle and throws everything near it back."],
    armadillomon: ["Diamond Shell", "burst", "Curls up and slams outward, shoving everything near it away."],
    salamon: ["Echo Bark", "chain", "A bark that echoes from enemy to enemy."],
    terriermon: ["Blazing Fire", "beam", "A blast of green fire that burns everything in a line."]
  };
  /* forms outside the named lines get their element's one */
  var FAM_SPECIAL = {
    fire: ["Flame Jet", "beam", "A jet of fire that scorches everything in a line."],
    ice: ["Hail Drop", "strike", "A block of ice drops on the target and shatters.", "fall"],
    water: ["Geyser", "strike", "A column of water erupts under the target.", "rise"],
    dark: ["Curse Mark", "mine", "Leaves a curse on the ground that goes off under whoever crosses it."],
    holy: ["Glint Ray", "beam", "A thin ray of light that pierces everything in a line."],
    machine: ["Buzz Saw", "boomerang", "Throws a saw blade that cuts through enemies and comes back."],
    nature: ["Thorn Fan", "fan", "A spray of thorns at close range."],
    slime: ["Goo Trap", "mine", "Leaves a puddle of goo that bursts under whoever steps in it."],
    wind: ["Gust Burst", "burst", "A blast of wind that throws everything near it back."],
    beast: ["War Cry", "burst", "A roar that throws everything near it back."]
  };
  (function () {
    var k, sp, L, f, id;
    for (k in SPECIALS) {
      L = LINES[k]; sp = SPECIALS[k];
      if (!L) continue;
      f = FAM[L.family];
      id = kit(moveId(sp[0]), sp[0], sp[1], L.look ? L.look.pal[L.look.shape === "orb" ? 2 : 1] : f.c, L.look ? L.look.glow : f.g, sp[2], sp[3] ? { drop: sp[3] } : null);
      if (!id) continue;
      L.special = id;
      if (L.own) L.own.push(id);
    }
    for (k in FAM_SPECIAL) {
      sp = FAM_SPECIAL[k];
      FAM[k].special = kit(moveId(sp[0]), sp[0], sp[1], FAM[k].c, FAM[k].g, sp[2], sp[3] ? { drop: sp[3] } : null);
    }
  })();
  TECHS = TECHS.filter(function (x) { return !!x; });
  D.MOVE_GROW = GROW;
  D.MOVE_TECHS = TECHS;
  D.MOVE_TECH_LOOK = TECH_LOOK;

  /* ---- Signature sets (17z33) ----
   * Each line's Baby, In-Training, Rookie and Champion has signature moves of its own, made
   * for what that Digimon is. Twelve per line, always in this order (SIG_ROLE):
   *   0 Baby seed        1 Baby keeper
   *   2 In-Training: grows from 0 (replaces it)        3 In-Training keeper
   *   4 Rookie: grows from 2 (replaces it)             5 / 6 Rookie choice: take one, the other is locked for the run
   *   7 Rookie keeper
   *   8 Champion: grows from 4                         9 grows from 5    10 grows from 6 (so only one of them, by your choice)
   *   11 Champion keeper
   * So a partner holds 2 at Baby, 2 new at In-Training, 3 new at Rookie and 3 new at Champion; the
   * keepers stay as they are, the growing move keeps getting bigger and the old one goes.
   * [name, kind, card text, look]   look: d drop (fall / rise), el element, sh shape, ms mine look,
   * bf beam look, cf chain look, of boomerang look (attack-fx.js) */
  var SIG_ROLE = [
    { t: 0, mul: 0.9 }, { t: 0, mul: 0.9 },
    { t: 1, up: 0, mul: 1.1 }, { t: 1, mul: 1.0 },
    { t: 2, up: 2, mul: 1.3 }, { t: 2, br: 6, mul: 1.15 }, { t: 2, br: 5, mul: 1.15 }, { t: 2, mul: 1.05 },
    { t: 3, up: 4, mul: 1.55 }, { t: 3, up: 5, mul: 1.45 }, { t: 3, up: 6, mul: 1.45 }, { t: 3, mul: 1.2 }
  ];
  var SIG_SETS = {
    agumon: [
      ["Fizz Bubbles", "fan", "Botamon blows a close spray of warm, fizzing bubbles.", { sh: "bubble" }],
      ["Fuzz Puff", "burst", "Botamon puffs its black fuzz up big and bounces everything near it away."],
      ["Boiling Bubbles", "fan", "Koromon's bubbles come out boiling: more of them, and they scald.", { sh: "bubble" }],
      ["Bounce Drop", "strike", "Koromon hops high and lands on the target ears-first.", { d: "fall", sh: "blob" }],
      ["Flame Gargle", "fan", "Agumon gargles its fire into a scattering spray of embers.", { sh: "flame" }],
      ["Dash Claw", "beam", "Agumon lunges claws-first through everything in a line.", { bf: "fist" }],
      ["Scorch Mark", "mine", "Agumon burns claw marks into the ground; they flare up under the next enemy across.", { ms: "mark" }],
      ["Stomp Quake", "strike", "Agumon stomps and a quake bursts up under the target.", { d: "rise" }],
      ["Meteor Breath", "strike", "Greymon breathes fire into the sky; it falls on the target as a blazing rock.", { d: "fall", sh: "flame" }],
      ["Horn Charge", "beam", "Greymon drives its horns through everything in a long line.", { bf: "fist" }],
      ["Wildfire Field", "mine", "Greymon scorches the ground into traps that flare up one after another.", { ms: "mark" }],
      ["Tail Sweep", "burst", "Greymon swings its whole tail round and throws everything near it back."]
    ],
    gabumon: [
      ["Jelly Bubbles", "fan", "Punimon spits a spray of cold, wobbly bubbles.", { sh: "bubble" }],
      ["Squish Bounce", "burst", "Punimon squashes flat and springs back, bouncing enemies away."],
      ["Frost Beads", "fan", "Tsunomon's bubbles freeze in the air into little beads of ice.", { sh: "shard" }],
      ["Horn Chip", "boomerang", "Tsunomon flicks a chip of ice off its horn; it cuts out through enemies and back.", { sh: "shard" }],
      ["Chill Breath", "beam", "Gabumon breathes a thin ray of frost through a line of enemies."],
      ["Horn Hook", "beam", "Gabumon charges horn-first through everything in its path.", { bf: "fist" }],
      ["Snow Cover", "mine", "Gabumon kicks snow over the ground; it freezes round the next enemy to step in.", { ms: "puddle" }],
      ["Pelt Burst", "burst", "Gabumon pulls its fur pelt tight, then bursts out in a ring of frost."],
      ["Icicle Rain", "strike", "Garurumon howls up a cloud that drops a spear of ice on the target.", { d: "fall", sh: "shard" }],
      ["Wolf Rush", "beam", "Garurumon bolts through a line of enemies, biting as it goes.", { bf: "bite" }],
      ["Permafrost", "mine", "Garurumon freezes patches of ground that snap shut on whatever crosses them.", { ms: "puddle" }],
      ["Pack Howl", "chain", "Garurumon's howl echoes from enemy to enemy, chilling each one."]
    ],
    veemon: [
      ["Bubble Burp", "fan", "Chibomon burps a spray of blue bubbles.", { sh: "bubble" }],
      ["Tummy Roll", "burst", "Chibomon rolls round in a circle and bowls over everything near it."],
      ["Demi Spray", "fan", "DemiVeemon's bubbles come out fast and hot: a stinging spray.", { sh: "bubble" }],
      ["Leap Bonk", "strike", "DemiVeemon leaps and lands head-first on the target.", { d: "fall" }],
      ["Vee Spit", "fan", "Veemon spits a hot blue fireball that breaks into a spray.", { sh: "flame" }],
      ["Boom Kick", "beam", "Veemon's flying kick ploughs through a line of enemies.", { bf: "fist" }],
      ["Sky Dive", "strike", "Veemon jumps high and dives down on the target.", { d: "fall" }],
      ["Brave Shout", "burst", "Veemon shouts so loud it knocks everything near it back."],
      ["X-Burst", "strike", "ExVeemon's blue fire gathers into an X that bursts up under the target.", { d: "rise", sh: "star" }],
      ["Dragon Kick", "beam", "ExVeemon's long-legged kick tears through everything in a line.", { bf: "fist" }],
      ["Wing Dive", "strike", "ExVeemon climbs on its wings and dives, blowing the target apart.", { d: "fall" }],
      ["Cross Cutter", "boomerang", "ExVeemon throws an X of blue light that cuts out through enemies and back.", { sh: "star" }]
    ],
    guilmon: [
      ["Fire Bubbles", "fan", "Jyarimon puffs a spray of small fiery bubbles.", { sh: "bubble" }],
      ["Tiny Chomp", "beam", "Jyarimon snaps its oversized jaws at whatever is in front of it.", { bf: "bite" }],
      ["Hot Hiccup", "fan", "Gigimon hiccups a burst of embers.", { sh: "flame" }],
      ["Tantrum Roll", "burst", "Gigimon throws a rolling tantrum, shoving everything near it away."],
      ["Pyro Spray", "fan", "Guilmon spits a fan of red-hot sparks.", { sh: "orb" }],
      ["Claw Dig", "strike", "Guilmon digs, and its claws burst up under the target.", { d: "rise" }],
      ["Hazard Glare", "chain", "The Hazard mark on Guilmon's chest glares; its curse jumps from enemy to enemy.", { cf: "zig" }],
      ["Hunter Pounce", "strike", "Guilmon pounces on the target from a distance.", { d: "fall" }],
      ["Furnace Roar", "beam", "Growlmon roars a long column of fire through a line.", { bf: "jet" }],
      ["Plasma Rake", "strike", "Growlmon's arm blades flash up out of the ground under the target.", { d: "rise", sh: "crescent" }],
      ["Hazard Field", "chain", "Growlmon's Hazard mark burns red; its curse leaps through a whole crowd.", { cf: "zig" }],
      ["Tail Crush", "burst", "Growlmon swings its heavy tail round, flattening everything close."]
    ],
    wormmon: [
      ["Leaf Puff", "fan", "Leafmon shakes loose a spray of tiny leaves.", { sh: "leaf" }],
      ["Sap Bubble", "mine", "Leafmon leaves a sticky bubble of sap that pops under the next enemy.", { ms: "bubble" }],
      ["Twig Spray", "fan", "Minomon flings sharp bits of its twig cocoon.", { sh: "shard" }],
      ["Cocoon Spin", "burst", "Minomon spins inside its cocoon and knocks everything back."],
      ["Thread Lash", "chain", "Wormmon whips a silk thread that snaps from enemy to enemy.", { cf: "vine" }],
      ["Cocoon Wrap", "mine", "Wormmon wraps the ground in silk that cocoons the first enemy in.", { ms: "web" }],
      ["Bug Rush", "beam", "Wormmon wriggles at speed through a line of enemies.", { bf: "fist" }],
      ["Leaf Ambush", "burst", "Wormmon bursts out of a pile of leaves, scattering everything near it."],
      ["Stinger Chain", "chain", "Stingmon darts from enemy to enemy, stinging each one.", { cf: "zig" }],
      ["Silk Prison", "mine", "Stingmon lays silk traps that bind enemy after enemy.", { ms: "web" }],
      ["Spike Dash", "beam", "Stingmon zips through a line of enemies, arm spike out.", { bf: "fist" }],
      ["Wing Buzz", "burst", "Stingmon's wings buzz so hard the air throws everything near it back.", { el: "wind" }]
    ],
    hagurumon: [
      ["Chip Spit", "fan", "Choromon spits a spray of tiny data chips.", { sh: "cube" }],
      ["Boot Pulse", "burst", "Choromon's lights flash and a pulse of data throws enemies back."],
      ["Rocket Puff", "fan", "Missimon puffs out a spread of tiny rockets.", { sh: "bolt" }],
      ["Rocket Hop", "strike", "Missimon launches itself and crashes down on the target.", { d: "fall" }],
      ["Cog Volley", "fan", "Hagurumon spits a fan of little cogs.", { sh: "gear" }],
      ["Gear Grind", "beam", "Hagurumon rolls on its rim through a line, grinding it down.", { bf: "fist", sh: "gear" }],
      ["Oil Slick", "mine", "Hagurumon leaks oil that bursts into sparks under the next enemy.", { ms: "puddle" }],
      ["Static Clank", "chain", "Hagurumon's gears throw a spark that jumps from enemy to enemy.", { cf: "zig" }],
      ["Cluster Missile", "strike", "Guardromon lobs a missile that comes down on the target and bursts.", { d: "fall", sh: "bolt" }],
      ["Iron Bulldoze", "beam", "Guardromon stomps forward through a line, flattening it.", { bf: "fist" }],
      ["Minefield", "mine", "Guardromon plants proximity mines that go off one by one.", { ms: "mark" }],
      ["Guard Pulse", "burst", "Guardromon's armour vents a shockwave that throws everything near it back."]
    ],
    gotsumon: [
      ["Grit Puff", "fan", "Cotsucomon spits a spray of grit.", { sh: "blob" }],
      ["Rock Roll", "burst", "Cotsucomon curls up and rolls, bowling everything over."],
      ["Gravel Spit", "fan", "Kakkinmon spits gravel and sharp stone chips.", { sh: "shard" }],
      ["Clang Bash", "beam", "Kakkinmon rams its hard little head through a line.", { bf: "fist" }],
      ["Rock Shower", "strike", "Gotsumon hurls stones up; they rain down on the target.", { d: "fall", sh: "blob" }],
      ["Quake Punch", "strike", "Gotsumon punches the ground and rocks burst up under the target.", { d: "rise", sh: "blob" }],
      ["Pebble Trap", "mine", "Gotsumon leaves loose stones that blow apart under the next enemy.", { ms: "mark" }],
      ["Grumble Stomp", "burst", "Gotsumon's grumpy stomp throws everything near it back."],
      ["Boulder Lob", "strike", "Monochromon flings a boulder high; it lands on the target and shatters.", { d: "fall", sh: "blob" }],
      ["Horn Ram", "beam", "Monochromon charges horn-first through a line.", { bf: "fist" }],
      ["Landslide", "mine", "Monochromon loosens the ground into traps that cave in under enemies.", { ms: "mark" }],
      ["Ash Snort", "fan", "Monochromon snorts a hot spray of ash and cinders.", { el: "fire", sh: "flame" }]
    ],
    keramon: [
      ["Glitch Puff", "fan", "Kuramon sprays a puff of corrupted bits.", { sh: "cube" }],
      ["Tendril Grab", "chain", "Kuramon's tendrils latch onto one enemy after another.", { cf: "vine" }],
      ["Bug Spray", "fan", "Tsumemon spits a spray of buggy code.", { sh: "cube" }],
      ["Nail Swipe", "beam", "Tsumemon slashes its nails through a line of enemies.", { bf: "bite" }],
      ["Bug Burst", "strike", "Keramon plants a bug in the ground that bursts up under the target.", { d: "rise", sh: "cube" }],
      ["Giggle Hex", "chain", "Keramon's creepy giggle hops from enemy to enemy, cursing each.", { cf: "zig" }],
      ["Crash Trap", "mine", "Keramon leaves a corrupted patch that crashes the next enemy to touch it.", { ms: "mark" }],
      ["Blink Pop", "burst", "Keramon blinks out and back, popping everything near it away."],
      ["Nightmare Drop", "strike", "Vilemon drops a ball of nightmares on the target.", { d: "fall", sh: "orb" }],
      ["Hex Cackle", "chain", "Vilemon's cackle curses a whole crowd, jumping from one to the next.", { cf: "slash" }],
      ["Doom Trap", "mine", "Vilemon curses patches of ground that go off under enemy after enemy.", { ms: "mark" }],
      ["Shadow Swoop", "beam", "Vilemon swoops low on its bat wings through a line of enemies.", { bf: "fist" }]
    ],
    biyomon: [
      ["Seed Fluff", "fan", "Nyokimon blows a spray of seed fluff.", { sh: "leaf" }],
      ["Sprout Pop", "mine", "Nyokimon plants a sprout that pops under the next enemy.", { ms: "bubble" }],
      ["Petal Flurry", "fan", "Yokomon shakes a flurry of petals off its flower.", { sh: "leaf" }],
      ["Root Hop", "strike", "Yokomon hops on its roots and lands on the target.", { d: "fall" }],
      ["Spiral Gust", "fan", "Biyomon flaps a spinning spray of wind.", { sh: "leaf" }],
      ["Talon Hook", "beam", "Biyomon dives through a line of enemies, talons first.", { bf: "fist" }],
      ["Spark Wing", "boomerang", "Biyomon flings a burning feather that cuts out through enemies and back.", { el: "fire", sh: "flame" }],
      ["Pink Whirl", "burst", "Biyomon spins on one foot and blows everything near it away."],
      ["Firestorm Wings", "strike", "Birdramon beats a storm of fire down on the target.", { d: "fall", el: "fire", sh: "flame" }],
      ["Dive Talon", "beam", "Birdramon swoops through a long line, talons raking.", { bf: "fist" }],
      ["Blazing Plume", "boomerang", "Birdramon throws a blazing plume that sears out through enemies and back.", { el: "fire", sh: "flame" }],
      ["Thermal Ring", "burst", "Hot air bursts off Birdramon's wings in a ring.", { el: "fire" }]
    ],
    hawkmon: [
      ["Down Puff", "fan", "Pururumon puffs a spray of downy feathers.", { sh: "leaf" }],
      ["Flutter Bump", "burst", "Pururumon flutters its little wings and bumps everything away."],
      ["Pip Gust", "fan", "Poromon flaps a gusty spray of feathers.", { sh: "leaf" }],
      ["Beak Peck", "beam", "Poromon pecks its way through a line of enemies.", { bf: "bite" }],
      ["Quill Volley", "fan", "Hawkmon throws a fan of sharp quills.", { sh: "shard" }],
      ["Beak Dive", "strike", "Hawkmon drops from above, beak-first, on the target.", { d: "fall" }],
      ["Headband Snap", "boomerang", "Hawkmon's headband feather snaps out and whirls back.", { sh: "leaf" }],
      ["Wing Gale", "burst", "Hawkmon's strong wingbeat blows everything near it back."],
      ["Quill Storm", "strike", "Aquilamon rains a storm of quills down on the target.", { d: "fall", sh: "shard" }],
      ["Sky Hunter", "strike", "Aquilamon folds its wings and dives on the target.", { d: "fall" }],
      ["Horn Gale", "boomerang", "Aquilamon's horns spin a blade of wind out through enemies and back.", { sh: "crescent" }],
      ["Gale Charge", "beam", "Aquilamon flies low and hard through a line of enemies.", { bf: "fist" }]
    ],
    tentomon: [
      ["Sticky Puff", "fan", "Pabumon spits a spray of sticky bubbles.", { sh: "bubble" }],
      ["Goo Bounce", "burst", "Pabumon wobbles and springs, bouncing everything near it away."],
      ["Mochi Puff", "fan", "Motimon puffs a spray of soft, stretchy blobs.", { sh: "blob" }],
      ["Stretch Smack", "beam", "Motimon stretches out and smacks through a line of enemies.", { bf: "fist" }],
      ["Spark Spray", "fan", "Tentomon crackles a spray of sparks.", { el: "machine", sh: "bolt" }],
      ["Mandible Snap", "beam", "Tentomon snaps its mandibles through a line of enemies.", { bf: "bite" }],
      ["Buzz Field", "mine", "Tentomon leaves a charged patch that zaps the next enemy to cross it.", { el: "machine", ms: "mark" }],
      ["Wing Hum", "burst", "Tentomon's wings hum and the air throws everything near it back."],
      ["Thunder Call", "strike", "Kabuterimon calls a bolt down on the target.", { d: "fall", el: "machine", sh: "bolt" }],
      ["Horn Spear", "beam", "Kabuterimon drives its great horn through a line of enemies.", { bf: "fist" }],
      ["Storm Grid", "mine", "Kabuterimon charges the ground into traps that discharge one after another.", { el: "machine", ms: "mark" }],
      ["Four-Wing Zap", "chain", "Lightning jumps from enemy to enemy off Kabuterimon's four wings.", { el: "machine", cf: "zig" }]
    ],
    gomamon: [
      ["Splash Puff", "fan", "Pichimon sprays a puff of tiny bubbles.", { sh: "bubble" }],
      ["Splashdown", "burst", "Pichimon belly-flops and the splash pushes everything near it away."],
      ["Spout Spray", "fan", "Bukamon blows a spray out of its spout.", { sh: "drop" }],
      ["Tail Flop", "strike", "Bukamon flops onto the target tail-first.", { d: "fall", sh: "drop" }],
      ["Squirt Jet", "beam", "Gomamon squirts a jet of water through a line of enemies.", { bf: "jet" }],
      ["Fish Swarm", "chain", "A school of fish darts from enemy to enemy.", { cf: "vine" }],
      ["Puddle Trap", "mine", "Gomamon leaves a deep puddle that drags the next enemy under.", { ms: "puddle" }],
      ["Belly Slide", "beam", "Gomamon slides on its belly through a line of enemies.", { bf: "fist" }],
      ["Tusk Jet", "beam", "Ikkakumon fires a high-pressure water jet through a long line.", { bf: "jet" }],
      ["Shoal Storm", "chain", "A whole shoal swarms from enemy to enemy.", { cf: "vine" }],
      ["Tide Pool", "mine", "Ikkakumon floods patches of ground that swallow enemies one after another.", { ms: "puddle" }],
      ["Tusk Quake", "strike", "Ikkakumon stamps and icy water bursts up under the target.", { d: "rise", sh: "drop" }]
    ],
    patamon: [
      ["Glow Bubbles", "fan", "Poyomon floats out a spray of glowing bubbles.", { sh: "bubble" }],
      ["Jelly Drift", "burst", "Poyomon drifts down soft and pushes everything near it away."],
      ["Puff Bubbles", "fan", "Tokomon puffs a spray of warm bubbles.", { sh: "bubble" }],
      ["Nibble Rush", "beam", "Tokomon's surprising teeth chomp through a line of enemies.", { bf: "bite" }],
      ["Air Puffs", "fan", "Patamon inhales and spits a spray of air puffs.", { el: "wind", sh: "bubble" }],
      ["Ear Glide", "boomerang", "Patamon spreads its ears and glides out through enemies and back."],
      ["Halo Ward", "mine", "Patamon leaves a little circle of light that bursts under the next enemy.", { ms: "mark" }],
      ["Tumble Ram", "strike", "Patamon dives at the target and bonks it.", { d: "fall" }],
      ["Holy Pillar", "strike", "Angemon calls a column of light down on the target.", { d: "fall", sh: "star" }],
      ["Staff Spin", "boomerang", "Angemon hurls its staff; it spins out through enemies and back.", { of: "seal" }],
      ["Sanctuary Seal", "mine", "Angemon seals patches of ground with light that judge whoever crosses them.", { ms: "mark" }],
      ["Six-Wing Flash", "burst", "Angemon opens its six wings in a flash that throws everything back."]
    ],
    palmon: [
      ["Pollen Puff", "fan", "Pupumon puffs a spray of pollen.", { sh: "leaf" }],
      ["Bud Pop", "mine", "Pupumon drops a little bud that pops under the next enemy.", { ms: "bubble" }],
      ["Sprout Spray", "fan", "Tanemon shakes a spray of seeds off its sprout.", { sh: "leaf" }],
      ["Root Wiggle", "strike", "Tanemon's roots wriggle up under the target.", { d: "rise" }],
      ["Thorn Spray", "fan", "Palmon sprays sharp thorns from its fingertips.", { sh: "shard" }],
      ["Ivy Whip", "chain", "Palmon's vines whip from enemy to enemy.", { cf: "vine" }],
      ["Stink Bloom", "mine", "Palmon's flower leaves a smelly patch that bursts under the next enemy.", { ms: "puddle" }],
      ["Leaf Twirl", "burst", "Palmon twirls and its leaves throw everything near it back."],
      ["Needle Rain", "strike", "Togemon fires a cluster of needles high; they rain down on the target.", { d: "fall", sh: "shard" }],
      ["Hundred Jab", "beam", "Togemon throws a flurry of punches through a line of enemies.", { bf: "fist" }],
      ["Desert Bloom", "mine", "Togemon plants cactus flowers that burst into needles under enemies.", { ms: "mark" }],
      ["Spine Burst", "burst", "Togemon puffs out every spine and throws back everything near it."]
    ],
    renamon: [
      ["Fluff Puff", "fan", "Relemon puffs a spray of fluff.", { sh: "leaf" }],
      ["Tail Bop", "burst", "Relemon swishes its tail and bops everything near it away."],
      ["Fox Sparks", "fan", "Viximon flicks a spray of tiny sparks off its tail.", { sh: "flame" }],
      ["Kit Pounce", "strike", "Viximon pounces on the target.", { d: "fall" }],
      ["Crystal Shards", "strike", "Renamon flings crystal shards up; they rain down on the target.", { d: "fall", sh: "shard" }],
      ["Phantom Kick", "beam", "Renamon blurs through a line of enemies with a kick.", { bf: "fist" }],
      ["Fox Charm", "mine", "Renamon leaves a paper charm on the ground that bursts under the next enemy.", { ms: "mark" }],
      ["Mirage", "boomerang", "A shimmering copy of Renamon darts out through enemies and back."],
      ["Foxfire Rain", "strike", "Kyubimon rains blue foxfire on the target.", { d: "fall", el: "fire", sh: "flame" }],
      ["Flame Wheel", "beam", "Kyubimon rolls into a wheel of blue fire through a line.", { bf: "jet", el: "fire" }],
      ["Spirit Seal", "mine", "Kyubimon lays fox charms that burst into spirit fire under enemies.", { ms: "mark", el: "fire" }],
      ["Nine-Tail Flare", "burst", "Kyubimon fans its nine tails and blue flame throws everything near it back.", { el: "fire" }]
    ],
    zubamon: [
      ["Seed Spark", "fan", "Sakumon sprays sparks of light.", { sh: "star" }],
      ["Shell Roll", "burst", "Sakumon rolls in its shell and bumps everything near it away."],
      ["Glint Spray", "fan", "Sakuttomon sprays sharp glints of light.", { sh: "star" }],
      ["Sprout Slice", "boomerang", "Sakuttomon flings a tiny blade that cuts out through enemies and back.", { sh: "crescent" }],
      ["Blade Flurry", "fan", "Zubamon's arm blades fling a fan of light edges.", { sh: "crescent" }],
      ["Rising Edge", "strike", "Zubamon calls a blade of light up out of the ground under the target.", { d: "rise", sh: "crescent" }],
      ["Twin Cutter", "boomerang", "Zubamon throws both arm blades; they cross out through enemies and back.", { sh: "crescent" }],
      ["Iron Will", "burst", "Zubamon braces and its will bursts out, throwing everything near it back."],
      ["Edge Rain", "strike", "ZubaEagermon calls a rain of blades down on the target.", { d: "fall", sh: "crescent" }],
      ["Eagle Uppercut", "strike", "ZubaEagermon's blade erupts out of the ground under the target.", { d: "rise", sh: "crescent" }],
      ["Cross Edge", "boomerang", "ZubaEagermon's twin blades cross and cut out through a crowd and back.", { sh: "crescent" }],
      ["Eager Dash", "beam", "ZubaEagermon dashes through a line of enemies, blades out.", { bf: "fist" }]
    ],
    armadillomon: [
      ["Mud Puff", "fan", "Tsubumon spits a spray of mud.", { sh: "blob" }],
      ["Bounce Ball", "burst", "Tsubumon bounces like a ball and bumps everything near it away."],
      ["Mud Bubbles", "fan", "Upamon blows a spray of muddy bubbles.", { sh: "bubble" }],
      ["Belly Flop", "strike", "Upamon flops onto the target.", { d: "fall", sh: "blob" }],
      ["Dirt Kick", "fan", "Armadillomon kicks a spray of dirt and stones.", { sh: "blob" }],
      ["Rolling Charge", "beam", "Armadillomon rolls into a ball and charges through a line.", { bf: "fist" }],
      ["Burrow Trap", "mine", "Armadillomon digs a pit that collapses under the next enemy.", { ms: "mark" }],
      ["Dig Up", "strike", "Armadillomon burrows and pops up under the target.", { d: "rise", sh: "blob" }],
      ["Rock Rain", "strike", "Ankylomon thumps the ground; rocks fly up and come down on the target.", { d: "fall", sh: "blob" }],
      ["Megaton Roll", "beam", "Ankylomon rolls its armoured bulk through a line of enemies.", { bf: "fist" }],
      ["Sinkhole", "mine", "Ankylomon opens pits that swallow enemies one by one.", { ms: "mark" }],
      ["Spike Quake", "burst", "Ankylomon slams down and its spikes send a shockwave out."]
    ],
    salamon: [
      ["Snowflake Puff", "fan", "YukimiBotamon blows a spray of snowflakes.", { el: "ice", sh: "star" }],
      ["Fluff Drift", "burst", "YukimiBotamon drifts down and its fluff pushes everything near it away."],
      ["Kitty Bubbles", "fan", "Nyaromon blows a spray of bubbles.", { sh: "bubble" }],
      ["Whisker Spark", "chain", "Nyaromon's whiskers twitch and a spark hops between enemies.", { cf: "zig" }],
      ["Puppy Sparkle", "fan", "Salamon shakes a spray of sparkles off its fur.", { sh: "star" }],
      ["Ring Toss", "boomerang", "Salamon flings a ring of light that spins out through enemies and back.", { of: "seal" }],
      ["Pawprint Charm", "mine", "Salamon leaves glowing pawprints that burst under the next enemy.", { ms: "mark" }],
      ["Pounce Tackle", "strike", "Salamon pounces on the target.", { d: "fall" }],
      ["Starfall", "strike", "Gatomon calls a falling star down on the target.", { d: "fall", sh: "star" }],
      ["Ring Spinner", "boomerang", "Gatomon throws its holy ring; it slices a path out and back.", { of: "seal" }],
      ["Nine Lives Trap", "mine", "Gatomon leaves pawprints that go off under enemy after enemy.", { ms: "mark" }],
      ["Feline Flurry", "beam", "Gatomon blurs through a line in a storm of scratches.", { bf: "fist" }]
    ],
    terriermon: [
      ["Bubble Pop", "fan", "Zerimon pops out a spray of green bubbles.", { sh: "bubble" }],
      ["Ear Bounce", "burst", "Zerimon bounces on its ears and bumps everything near it away."],
      ["Gummy Spray", "fan", "Gummymon spits a spray of springy green blobs.", { sh: "blob" }],
      ["Ear Whip", "boomerang", "Gummymon flings its long ear out through enemies and back.", { sh: "crescent" }],
      ["Pellet Spray", "fan", "Terriermon puffs a spread of hard air pellets.", { sh: "bolt" }],
      ["Bunny Dash", "beam", "Terriermon spins its ears and zooms through a line.", { bf: "fist" }],
      ["Momentai Mine", "mine", "Terriermon leaves a cheeky bubble that bursts under the next enemy. Momentai!", { ms: "bubble" }],
      ["Ear Hover", "strike", "Terriermon hovers on its ears and drops on the target.", { d: "fall" }],
      ["Gargo Shell", "strike", "Gargomon lobs a shell that lands on the target and bursts.", { d: "fall", sh: "bolt" }],
      ["Gargo Charge", "beam", "Gargomon barrels through a line of enemies, guns blazing.", { bf: "fist" }],
      ["Trip Mines", "mine", "Gargomon drops a scatter of mines that burst under enemies.", { ms: "mark" }],
      ["Gatling Spin", "burst", "Gargomon spins on the spot and its guns throw everything back."]
    ]
  };
  var SIG_INFO = {}, SIG_LOOK = {};
  /* they all fire at once, so each hits softer than a lone signature: fully levelled, the whole set
   * comes to about 1.5x the partner's main shot at Champion and ~2.5x at Mega (17z33 balance check) */
  var SIG_POWER = 0.55;
  (function () {
    var k, L, f, set, ids, i, s, R, id, col, glow, lv, j, cdK;
    for (k in SIG_SETS) {
      L = LINES[k]; set = SIG_SETS[k];
      if (!L || set.length !== SIG_ROLE.length) continue;
      f = FAM[L.family];
      col = L.look ? L.look.pal[L.look.shape === "orb" ? 2 : 1] : f.c; glow = L.look ? L.look.glow : f.g;
      ids = [];
      for (i = 0; i < set.length; i++) {
        s = set[i]; R = SIG_ROLE[i];
        id = moveId(s[0]);
        if (W[id]) id = k + id.charAt(0).toUpperCase() + id.slice(1);
        id = kit(id, s[0], s[1], col, glow, s[2], s[3] && s[3].d ? { drop: s[3].d } : null);
        ids.push(id);
        if (!id) continue;
        /* power by role: the growing move gets stronger at each step, the choices a little stronger than a keeper */
        cdK = 1 / (1 + (R.mul - 1) * 0.45);
        for (j = 0; j < W[id].levels.length; j++) {
          lv = W[id].levels[j];
          lv.damage = Math.max(1, Math.round(lv.damage * R.mul * SIG_POWER));
          lv.cooldown = Math.round(lv.cooldown * cdK * 100) / 100;
          if (lv.hops && R.mul >= 1.3) lv.hops += 1;
          if (lv.count && R.mul >= 1.3) lv.count += 1;
          if (lv.max && R.mul >= 1.3) lv.max += 1;
        }
        W[id].sig = true;
        if (s[3]) SIG_LOOK[id] = s[3];
        if (L.own) L.own.push(id);
      }
      for (i = 0; i < ids.length; i++) {
        if (!ids[i]) continue;
        R = SIG_ROLE[i];
        SIG_INFO[ids[i]] = { line: k, tier: R.t, role: i, up: R.up != null ? ids[R.up] : null, rival: R.br != null ? ids[R.br] : null, upTo: null,
          keeper: R.up == null && R.br == null && i !== 0 };
      }
      for (i = 0; i < ids.length; i++) if (ids[i] && SIG_INFO[ids[i]].up && SIG_INFO[SIG_INFO[ids[i]].up]) SIG_INFO[SIG_INFO[ids[i]].up].upTo = ids[i];
      L.sigs = ids.filter(function (x) { return !!x; });
    }
  })();
  /* ---- Signature sets, Ultimate and Mega (17z33) ----
   * Each stage adds three more, in this order: [growing move, choice path A, choice path B, keeper].
   * The growing move grows from the stage before's; path A grows from the Rookie choice's first side,
   * path B from its second, so only the side you took keeps growing; the keeper stays as it is.
   * A line with no Ultimate or Mega simply stops (Hawkmon's line ends at Aquilamon). */
  var SIG_HIGH_ROLE = { 4: [1.8, 1.7, 1.7, 1.35], 5: [2.1, 2.0, 2.0, 1.55] };
  var SIG_HIGH = {
    agumon: {
      4: [["Hatch Barrage", "strike", "MetalGreymon's chest hatch fires a missile high; it comes down on the target.", { d: "fall", sh: "bolt" }],
        ["Trident Lunge", "beam", "MetalGreymon drives its metal claw arm through a long line.", { bf: "fist" }],
        ["Napalm Field", "mine", "MetalGreymon's missiles leave burning craters that blow under enemies.", { ms: "mark" }],
        ["Iron Wing Gust", "burst", "MetalGreymon beats its metal wings and blasts everything near it back."]],
      5: [["Sun Meteor", "strike", "WarGreymon hurls a ball of fire skyward; it crashes down on the target like a small sun.", { d: "fall", sh: "orb" }],
        ["Cyclone Drill", "beam", "WarGreymon spins into a drill and bores through a line.", { bf: "fist" }],
        ["Inferno Carpet", "mine", "WarGreymon sets the ground ablaze in traps that erupt one after another.", { ms: "mark" }],
        ["Shield Bash", "burst", "WarGreymon slams its shield down; the shockwave throws everything back."]]
    },
    gabumon: {
      4: [["Frost Moon", "strike", "WereGarurumon calls a frozen crescent down on the target.", { d: "fall", sh: "crescent" }],
        ["Howling Kick", "beam", "WereGarurumon kicks through a line in one long dash.", { bf: "fist" }],
        ["Ice Floe", "mine", "WereGarurumon freezes the ground into slick traps that grip enemies.", { ms: "puddle" }],
        ["Pack Combo", "chain", "WereGarurumon leaps from enemy to enemy, punching each.", { cf: "slash" }]],
      5: [["Glacier Barrage", "strike", "MetalGarurumon fires ice missiles skyward; they rain on the target.", { d: "fall", sh: "shard" }],
        ["Steel Fang Rush", "beam", "MetalGarurumon charges through a line, jaws of frozen steel.", { bf: "bite" }],
        ["Frozen Wastes", "mine", "MetalGarurumon freezes whole stretches of ground into traps.", { ms: "puddle" }],
        ["Cold Vents", "burst", "Every vent on MetalGarurumon bursts frost at once, throwing back everything near."]]
    },
    veemon: {
      4: [["Sonic Updraft", "strike", "Wingdramon's wings whip a sonic pillar up under the target.", { d: "rise" }],
        ["Sky Ram", "beam", "Wingdramon dives through a long line at full speed.", { bf: "fist" }],
        ["Tempest Dive", "strike", "Wingdramon drops out of the clouds on the target.", { d: "fall" }],
        ["Gale Shroud", "burst", "Wingdramon's wingbeat throws everything near it back.", { el: "wind" }]],
      5: [["Dragon Quake", "strike", "Imperialdramon slams down and blue fire erupts under the target.", { d: "rise" }],
        ["Imperial Charge", "beam", "Imperialdramon charges through a line like a falling star.", { bf: "fist" }],
        ["Dragon's Descent", "strike", "Imperialdramon drops from the sky on the target.", { d: "fall" }],
        ["Positron Spray", "fan", "Imperialdramon's back cannon sprays scattered positron bolts.", { sh: "orb" }]]
    },
    guilmon: {
      4: [["Blast Furnace", "beam", "WarGrowlmon's chest vents pour fire through a long line.", { bf: "jet" }],
        ["Plasma Rise", "strike", "WarGrowlmon's plasma blades rise out of the ground under the target.", { d: "rise", sh: "crescent" }],
        ["Hazard Pulse", "chain", "The Digital Hazard pulses through a crowd, enemy to enemy.", { cf: "zig" }],
        ["Missile Rack", "strike", "WarGrowlmon fires a missile that drops on the target.", { d: "fall", sh: "bolt" }]],
      5: [["Lance Ray", "beam", "Gallantmon thrusts its lance and a ray of light runs through a line.", { bf: "laser" }],
        ["Lance Spike", "strike", "Gallantmon's lance erupts out of the ground under the target.", { d: "rise", sh: "crescent" }],
        ["Crimson Verdict", "chain", "Red light leaps from foe to foe across the whole field.", { cf: "slash" }],
        ["Aegis Bash", "burst", "Gallantmon swings its shield out and throws back everything near it."]]
    },
    wormmon: {
      4: [["Hive Chain", "chain", "DinoBeemon zips from enemy to enemy faster than the eye can follow.", { cf: "zig" }],
        ["Amber Trap", "mine", "DinoBeemon seals the ground in sticky amber traps.", { ms: "web" }],
        ["Lance Dive", "beam", "DinoBeemon dives lance-first through a line.", { bf: "fist" }],
        ["Hyper Buzz", "burst", "DinoBeemon's wings roar and throw everything near it back.", { el: "wind" }]]
    },
    hagurumon: {
      4: [["Rocket Rain", "strike", "Andromon fires a cluster of rockets that rain on the target.", { d: "fall", sh: "bolt" }],
        ["Spiral Edge", "beam", "Andromon's spinning blade arm cuts through a line.", { bf: "fist" }],
        ["Proximity Grid", "mine", "Andromon lays a grid of mines that go off one after another.", { ms: "mark" }],
        ["Overclock", "burst", "Andromon vents its reactor; the blast throws everything back."]],
      5: [["Atomic Shells", "strike", "HiAndromon's arm cannons lob atomic shells onto the target.", { d: "fall", sh: "bolt" }],
        ["Plasma Edge", "beam", "HiAndromon fires a cutting laser through a line.", { bf: "laser" }],
        ["Nano Mines", "mine", "HiAndromon scatters nano-mines that burst under enemies.", { ms: "mark" }],
        ["Signal Jam", "chain", "HiAndromon's jamming wave leaps from enemy to enemy.", { cf: "zig" }]]
    },
    gotsumon: {
      4: [["Egg Bomb", "strike", "Digitamamon lobs a rotten egg that splatters on the target.", { d: "fall", sh: "blob", el: "dark" }],
        ["Shell Ram", "beam", "Digitamamon rolls its shell through a line.", { bf: "fist" }],
        ["Nightmare Nest", "mine", "Digitamamon leaves cracked eggs that burst under enemies.", { ms: "mark", el: "dark" }],
        ["Yolk Splash", "burst", "Digitamamon's shell cracks and a burst of yolk throws everything back."]],
      5: [["Staff Meteor", "strike", "Jijimon bonks the sky with its staff and a rock falls on the target.", { d: "fall", sh: "blob" }],
        ["Walking Stick Jab", "beam", "Jijimon pokes its stick through a line with startling force.", { bf: "fist" }],
        ["Cave-In Scold", "mine", "Jijimon scolds the ground until it caves in under enemies.", { ms: "mark" }],
        ["Wise Glare", "chain", "Jijimon's glare jumps from enemy to enemy, stopping each in its tracks.", { cf: "zig" }]]
    },
    keramon: {
      4: [["Spider Drop", "strike", "Infermon drops from above, legs first, on the target.", { d: "fall", sh: "orb" }],
        ["Network Crawl", "chain", "Infermon's legs skitter from enemy to enemy.", { cf: "vine" }],
        ["Data Web", "mine", "Infermon spins corrupted webs that snap shut under enemies.", { ms: "web" }],
        ["Cocoon Burst", "burst", "Infermon curls into its shell, then bursts out and throws everything back."]],
      5: [["Corruption Rain", "strike", "Diaboromon rains corrupted data on the target.", { d: "fall", sh: "cube" }],
        ["Endless Copy", "chain", "Diaboromon copies itself from enemy to enemy.", { cf: "zig" }],
        ["System Crash", "mine", "Diaboromon crashes patches of ground that go off under enemy after enemy.", { ms: "mark" }],
        ["Long Arm Lance", "beam", "Diaboromon's long arms thrust through a line.", { bf: "fist" }]]
    },
    biyomon: {
      4: [["Firebird Dive", "strike", "Garudamon hurls a firebird that dives onto the target.", { d: "fall", el: "fire", sh: "flame" }],
        ["Garuda Charge", "beam", "Garudamon charges through a line, fists of flame first.", { bf: "fist" }],
        ["Flame Boomerang", "boomerang", "Garudamon throws a wheel of fire that sears out through enemies and back.", { el: "fire", sh: "flame" }],
        ["Wind Mantle", "burst", "Garudamon spreads its wings and the wind throws everything near it back."]],
      5: [["Phoenix Rain", "strike", "Phoenixmon scatters burning feathers that come down on the target.", { d: "fall", el: "fire", sh: "flame" }],
        ["Crimson Dive", "beam", "Phoenixmon dives through a long line wreathed in flame.", { bf: "jet", el: "fire" }],
        ["Rebirth Plume", "boomerang", "Phoenixmon throws a plume of undying fire that cuts out and back.", { el: "fire", sh: "flame" }],
        ["Sacred Flame", "chain", "Phoenixmon's flame leaps from enemy to enemy.", { el: "fire", cf: "vine" }]]
    },
    tentomon: {
      4: [["Horn Thunder", "strike", "MegaKabuterimon calls a fork of lightning down on the target.", { d: "fall", el: "machine", sh: "bolt" }],
        ["Beetle Lance", "beam", "MegaKabuterimon drives its huge horn through a line.", { bf: "fist" }],
        ["Static Nest", "mine", "MegaKabuterimon charges the ground into traps that zap enemy after enemy.", { el: "machine", ms: "mark" }],
        ["Shell Slam", "burst", "MegaKabuterimon slams its shell down and throws everything back."]],
      5: [["Giga Thunder", "strike", "HerculesKabuterimon brings down a storm bolt on the target.", { d: "fall", el: "machine", sh: "bolt" }],
        ["Hercules Charge", "beam", "HerculesKabuterimon charges through a line with its golden horn.", { bf: "fist" }],
        ["Electro Field", "mine", "HerculesKabuterimon turns the ground into a field of live traps.", { el: "machine", ms: "mark" }],
        ["Golden Swarm", "chain", "Golden sparks swarm from enemy to enemy.", { el: "machine", cf: "zig" }]]
    },
    gomamon: {
      4: [["Pressure Jet", "beam", "Zudomon blasts a jet of seawater through a long line.", { bf: "jet" }],
        ["Narwhal Swarm", "chain", "A swarm of narwhals spears from enemy to enemy.", { cf: "vine" }],
        ["Floe Trap", "mine", "Zudomon floods patches of ground and freezes them round enemies.", { ms: "puddle" }],
        ["Hammer Quake", "strike", "Zudomon smashes its hammer down and the ground bursts under the target.", { d: "rise", sh: "drop" }]],
      5: [["Arctic Torrent", "beam", "Vikemon blows a freezing torrent through a line.", { bf: "jet" }],
        ["Kraken Shoal", "chain", "A frenzied shoal tears from enemy to enemy.", { cf: "vine" }],
        ["Glacial Lake", "mine", "Vikemon floods the field with icy pools that drag enemies under.", { ms: "puddle" }],
        ["Flail Storm", "burst", "Vikemon swings its morning stars round and throws everything back."]]
    },
    patamon: {
      4: [["Blade of Light", "strike", "MagnaAngemon brings a blade of light down on the target.", { d: "fall", sh: "star" }],
        ["Light Arc", "boomerang", "MagnaAngemon throws a crescent of light that cuts out and back.", { sh: "crescent" }],
        ["Gate Seal", "mine", "MagnaAngemon draws gates of light on the ground that open under enemies.", { ms: "mark" }],
        ["Eight-Wing Gust", "burst", "MagnaAngemon's eight wings beat once and throw everything back."]],
      5: [["Heaven's Bolt", "strike", "Seraphimon calls a bolt from the heavens onto the target.", { d: "fall", sh: "star" }],
        ["Halo Disc", "boomerang", "Seraphimon throws a disc of holy light out through enemies and back.", { of: "seal" }],
        ["Judgment Circle", "mine", "Seraphimon draws circles of judgment that burst under enemies.", { ms: "mark" }],
        ["Choir Ray", "beam", "Seraphimon fires a lance of holy light through a line.", { bf: "laser" }]]
    },
    palmon: {
      4: [["Petal Shower", "strike", "Lillymon sends a flurry of petals down on the target.", { d: "fall", sh: "leaf" }],
        ["Flower Ray", "beam", "Lillymon's flower fires a ray through a line.", { bf: "laser" }],
        ["Garden Trap", "mine", "Lillymon plants flowers that burst open under enemies.", { ms: "puddle" }],
        ["Fairy Dance", "burst", "Lillymon spins in a ring of petals that throws everything back."]],
      5: [["Thorn Rose Rain", "strike", "Rosemon showers thorned roses onto the target.", { d: "fall", sh: "leaf" }],
        ["Thorn Whip", "beam", "Rosemon's thorn whip lashes through a long line.", { bf: "fist" }],
        ["Rose Thicket", "mine", "Rosemon grows thickets that snare and stab enemies.", { ms: "web" }],
        ["Ivy Embrace", "chain", "Rosemon's vines wind from enemy to enemy.", { cf: "vine" }]]
    },
    renamon: {
      4: [["Talisman Rain", "strike", "Taomon throws talismans that fall on the target and burst.", { d: "fall", sh: "star" }],
        ["Ink Stroke", "beam", "Taomon paints a stroke of ink fire through a line.", { bf: "jet" }],
        ["Ward Seal", "mine", "Taomon lays warding seals that burst under enemies.", { ms: "mark" }],
        ["Yin-Yang Ward", "burst", "Taomon's ward spins out and throws everything near it back."]],
      5: [["Spirit Fox Fall", "strike", "Sakuyamon's spirit foxes dive onto the target.", { d: "fall", sh: "flame" }],
        ["Fox Drive", "beam", "Sakuyamon drives through a line with its staff of rings.", { bf: "fist" }],
        ["Shrine Seal", "mine", "Sakuyamon consecrates the ground; it bursts under enemies.", { ms: "mark" }],
        ["Spirit Chain", "chain", "Sakuyamon's fox spirits leap from enemy to enemy.", { cf: "slash" }]]
    },
    zubamon: {
      4: [["Blade Storm", "strike", "Duramon calls a storm of blades down on the target.", { d: "fall", sh: "crescent" }],
        ["Edge Eruption", "strike", "Duramon's blade erupts out of the ground under the target.", { d: "rise", sh: "crescent" }],
        ["Spinning Blade", "boomerang", "Duramon throws itself as a spinning blade, out and back.", { sh: "crescent" }],
        ["Steel Gale", "beam", "Duramon cuts through a line in one stroke.", { bf: "fist" }]],
      5: [["Holy Sword Rain", "strike", "Durandamon rains holy swords on the target.", { d: "fall", sh: "crescent" }],
        ["Sword Pillar", "strike", "A great sword of light bursts up under the target.", { d: "rise", sh: "crescent" }],
        ["Durandal Wheel", "boomerang", "Durandamon throws a wheel of blades that cuts out and back.", { sh: "crescent" }],
        ["Knight's Oath", "burst", "Durandamon plants its sword and a shockwave throws everything back."]]
    },
    armadillomon: {
      4: [["Meteor Shower", "strike", "Meteormon calls meteors down on the target.", { d: "fall", sh: "blob" }],
        ["Comet Roll", "beam", "Meteormon rolls through a line like a comet.", { bf: "fist" }],
        ["Crater Trap", "mine", "Meteormon leaves craters that cave in under enemies.", { ms: "mark" }],
        ["Stardust Burst", "burst", "Meteormon's rocky body bursts with stardust and throws everything back."]]
    },
    salamon: {
      4: [["Arrow Rain", "strike", "Angewomon fires an arrow skyward that comes down as a shaft of light.", { d: "fall", sh: "star" }],
        ["Halo Ribbon", "boomerang", "Angewomon casts a ribbon of light that loops out and back.", { of: "seal" }],
        ["Charm Circle", "mine", "Angewomon draws charm circles that burst under enemies.", { ms: "mark" }],
        ["Charm Kiss", "chain", "Angewomon blows a kiss that charms from enemy to enemy.", { cf: "zig" }]],
      5: [["Dragon Star Fall", "strike", "Magnadramon calls stars down on the target.", { d: "fall", sh: "star" }],
        ["Dragon Coil", "boomerang", "Magnadramon's coiling light loops out through enemies and back.", { of: "seal" }],
        ["Holy Dragon Seal", "mine", "Magnadramon seals the ground with holy marks that burst under enemies.", { ms: "mark" }],
        ["Holy Breath", "beam", "Magnadramon breathes holy fire through a line.", { bf: "jet" }]]
    },
    terriermon: {
      4: [["Rapid Missile", "strike", "Rapidmon fires a homing missile that drops on the target.", { d: "fall", sh: "bolt" }],
        ["Rapid Dash", "beam", "Rapidmon dashes through a line in a green blur.", { bf: "fist" }],
        ["Target Mines", "mine", "Rapidmon marks targets on the ground that blow under enemies.", { ms: "mark" }],
        ["Ring Spin", "burst", "Rapidmon spins and the rings round its arms throw everything back."]],
      5: [["Giant Missile", "strike", "MegaGargomon drops a giant missile on the target.", { d: "fall", sh: "bolt" }],
        ["Mega Charge", "beam", "MegaGargomon tramples through a line.", { bf: "fist" }],
        ["Barrage Field", "mine", "MegaGargomon carpets the ground with mines.", { ms: "mark" }],
        ["Pummel Quake", "strike", "MegaGargomon punches the ground and it bursts under the target.", { d: "rise" }]]
    }
  };
  (function () {
    var k, L, f, col, glow, st, set, prev, i, s, id, mul, j, lv, cdK, out, rec;
    function addOne(k, L, s, mul, tier, upId, role) {
      var id = moveId(s[0]);
      if (W[id]) id = k + id.charAt(0).toUpperCase() + id.slice(1);
      id = kit(id, s[0], s[1], col, glow, s[2], s[3] && s[3].d ? { drop: s[3].d } : null);
      if (!id) return null;
      cdK = 1 / (1 + (mul - 1) * 0.45);
      for (j = 0; j < W[id].levels.length; j++) {
        lv = W[id].levels[j];
        lv.damage = Math.max(1, Math.round(lv.damage * mul * SIG_POWER));
        lv.cooldown = Math.max(0.8, Math.round(lv.cooldown * cdK * 100) / 100);
        if (lv.hops) lv.hops += mul >= 1.7 ? 2 : 1;
        if (lv.count) lv.count += mul >= 1.7 ? 2 : 1;
        if (lv.max) lv.max += mul >= 1.7 ? 2 : 1;
      }
      W[id].sig = true;
      if (s[3]) SIG_LOOK[id] = s[3];
      if (L.own) L.own.push(id);
      SIG_INFO[id] = { line: k, tier: tier, role: role, up: upId || null, rival: null, upTo: null, keeper: !upId };
      if (upId && SIG_INFO[upId]) SIG_INFO[upId].upTo = id;
      L.sigs.push(id);
      return id;
    }
    for (k in SIG_HIGH) {
      L = LINES[k];
      if (!L || !L.sigs || L.sigs.length !== 12) continue;
      f = FAM[L.family];
      col = L.look ? L.look.pal[L.look.shape === "orb" ? 2 : 1] : f.c; glow = L.look ? L.look.glow : f.g;
      prev = [L.sigs[8], L.sigs[9], L.sigs[10]];             /* Champion: growing move, path A, path B */
      for (st = 4; st <= 5; st++) {
        set = SIG_HIGH[k][st];
        if (!set || set.length !== 4) continue;
        out = [];
        for (i = 0; i < 4; i++) out.push(addOne(k, L, set[i], SIG_HIGH_ROLE[st][i], st, i < 3 ? prev[i] : null, (st === 4 ? "u" : "m") + i));
        prev = [out[0], out[1], out[2]];
      }
    }
  })();
  D.SIG_INFO = SIG_INFO;
  D.SIG_LOOK = SIG_LOOK;

  var TYPE_FAMILY = [
    [/fire|flame|dragon|dinosaur|reptile|ceratopsian|dramon/i, "fire"],
    [/ice|snow/i, "ice"],
    [/slime|mollusk|mutant|mutation|lesser|unidentified/i, "slime"],
    [/aquatic|sea|amphibian|crustacean|fish/i, "water"],
    [/undead|ghost|dark|evil|demon|devil|wizard|mysterious/i, "dark"],
    [/angel|holy|god|deity|seraph|pixie|knight|sword/i, "holy"],
    [/machine|cyborg|weapon|armor|android|puppet|ore|mineral|rock|composite/i, "machine"],
    [/insect|vegetation|seed|bulb|larva|plant/i, "nature"],
    [/bird/i, "wind"],
    [/beast|mammal|animal|warrior|ancient/i, "beast"]
  ];
  var ATTR_FAMILY = { Vaccine: "holy", Data: "beast", Virus: "dark", Free: "machine", Unknown: "slime", None: "slime" };

  var STAGE_IDX = { "Baby I": 0, "Baby II": 1, "Rookie": 2, "Champion": 3, "Armor": 3, "Hybrid": 3, "Ultimate": 4, "Mega": 5, "Mega+": 5,
    "Baby": 0, "In-Training": 1, "Child": 2, "Adult": 3, "Perfect": 4 };

  function stageIdx(form) {
    var sp = D.SPECIES && D.SPECIES[form];
    if (!sp) return 2;
    if (sp.hatchTo) return -1; /* an egg knows no moves */
    var k = sp.stageKey != null ? sp.stageKey : sp.stage, v = STAGE_IDX[k];
    if (v == null && D.partnerStageIdx) { v = D.partnerStageIdx(form); if (v > 5) v = 5; }
    return v == null ? 2 : v;
  }

  function lineOf(form) {
    var k;
    for (k in LINES) if (LINES[k].match.test(form)) return LINES[k];
    return null;
  }

  function familyOf(form) {
    var ln = lineOf(form), sp = D.SPECIES && D.SPECIES[form], i, t;
    if (ln) return ln.family;
    /* enemy kinds are not always in SPECIES: read the tree / enemy table too */
    var nd = global.EVO_TREE && global.EVO_TREE.species && global.EVO_TREE.species[form], en = D.ENEMIES && D.ENEMIES[form];
    t = (sp && sp.type) || (nd && nd.type) || "";
    for (i = 0; i < TYPE_FAMILY.length; i++) if (TYPE_FAMILY[i][0].test(t)) return TYPE_FAMILY[i][1];
    return ATTR_FAMILY[(sp && sp.attribute) || (en && en.attribute) || (nd && nd.attribute) || "None"] || "beast";
  }

  /* The moves a form may hold, one per slot. */
  function movePool(form) {
    var s = stageIdx(form), ln = lineOf(form), f = FAM[familyOf(form)] || FAM.beast;
    var out = { family: familyOf(form), stage: s, primary: null, melee: null, aura: null, orbit: null };
    if (s < 0) return out;
    if (ln) {
      out.primary = ln.primary[s]; out.melee = ln.melee[s];
      out.aura = s >= 3 ? ln.aura : null; out.orbit = s >= 4 ? ln.orbit : null;
    } else {
      out.primary = s === 0 ? "bubbleBlow" : f.ids[s - 1];
      out.melee = s === 0 ? null : (s === 1 ? "headbutt" : (s >= 4 ? f.ids[6] : f.ids[5]));
      out.aura = s >= 3 ? f.ids[7] : null;
      out.orbit = s >= 4 ? f.ids[8] : null;
    }
    ["primary", "melee", "aura", "orbit"].forEach(function (k) { if (out[k] && !W[out[k]]) out[k] = null; });
    return out;
  }

  /* Every move a form's line can ever learn, slot by slot, with the stage
   * (0 Baby .. 5 Mega) at which each first becomes available. The skill
   * tree is built from this. */
  function moveChain(form) {
    var ln = lineOf(form), f = FAM[familyOf(form)] || FAM.beast, out = { family: familyOf(form), stage: stageIdx(form), primary: [], melee: [], aura: [], orbit: [], special: [], tech: [] }, i, seen = {};
    function push(slot, id, tier) { if (id && W[id] && !seen[id]) { seen[id] = 1; out[slot].push({ id: id, tier: tier }); } }
    if (ln) {
      for (i = 0; i < 5; i++) push("primary", ln.primary[i], i);   /* the Mega's own shot is its ultimate now (megaUltimate, below) */
      for (i = 0; i < 6; i++) push("melee", ln.melee[i], i);
      push("aura", ln.aura, 3); push("orbit", ln.orbit, 4);
    } else {
      push("primary", "bubbleBlow", 0);
      for (i = 0; i < 4; i++) push("primary", f.ids[i], i + 1);
      push("melee", "headbutt", 1); push("melee", f.ids[5], 2); push("melee", f.ids[6], 4);
      push("aura", f.ids[7], 3); push("orbit", f.ids[8], 4);
    }
    push("special", ln ? ln.special : f.special, 0);
    if (ln && ln.sigs) for (i = 0; i < ln.sigs.length; i++) push("special", ln.sigs[i], SIG_INFO[ln.sigs[i]].tier);
    for (i = 0; i < TECHS.length; i++) push("tech", TECHS[i], 0);
    return out;
  }
  D.moveChain = moveChain;

  /* ---- Mega ultimates (Nov 18) ----
   * A Mega has nothing to warp into, so R does something else for it: its
   * signature move, once, as big as the screen nearly. That move is no longer
   * in its skill tree; a Mega fights with everything else and saves this.
   * Everything inside the radius is hit (ordinary enemies die; bosses, Megas,
   * lords and the rival lose a share of their health), a band just outside it
   * is only marked, and anything further is untouched, so there are always
   * survivors at the edges. Each has its own shape (pat) and its own twist.
   *   pat     impact  out from the middle        rings   the same, in waves
   *           gale    a wind out from the middle  sweep   a beam swung right round
   *           spokes  six beams                   storm   strikes all over, in no order
   *           orbs    seven pillars               spiral  wound outward from the middle
   *           wall    a cut across the field
   *   status [name, seconds]   patch {kind, n, r, life}   knock (minus pulls in)
   *   heal / leech (share of health back)   shield (seconds unhurt)   boss (share of a boss's health)
   *   dmg (share of an ordinary enemy's health; left out = it dies)   after: its own shot fired outward */
  /*   shape   the ground it covers, so they are not all one circle:
   *           circle | ragged (an uneven sheet, some arms longer) | wedge (a cone ahead) | star (thin rays)
   *           lobes (petals, wings, a pinwheel) | beam (a lane ahead) | band (a wide lane) | discs (separate strikes)
   *   mark    what it leaves on the ground, and for how many seconds: ice, scorch, crater, glow, gash
   *   zone    [status, seconds]: for that long, enemies standing on the marked ground keep getting that status */
  var ULT = {
    terraForce: { pat: "impact", windup: 1.1, spread: 0.35, knock: 260, shape: { k: "circle" }, mark: { k: "crater", time: 180 }, zone: ["burn", 25], patch: { kind: "fire", n: 7, r: 72, life: 12 }, pop: "erupt", say: "A sun comes down. The crater stays for minutes, and the ground round it burns whatever crosses it." },
    gracefulCannon: { pat: "gale", windup: 0.7, spread: 0.45, dmg: 0.6, status: ["freeze", 6], shape: { k: "wedge", half: 1.0, len: 1.6, rag: 0.16 }, mark: { k: "ice", time: 150 }, zone: ["chill", 150], pop: "spike", say: "A cone of absolute cold. Everything in it freezes solid for six seconds, and the ground stays frozen for minutes." },
    positronLaser: { pat: "sweep", windup: 0.8, spread: 1.1, boss: 0.4, shape: { k: "circle", r: 1.08 }, mark: { k: "scorch", time: 120, ring: 1 }, say: "One beam, swung right round. It bites deep into bosses and burns a ring into the ground." },
    shieldOfTheJust: { pat: "cannon", windup: 0.6, spread: 0.45, knock: 320, shield: 6, status: ["daze", 6], shape: { k: "wedge", half: 0.5, len: 1.8 }, mark: { k: "glow", time: 60 }, say: "The shield fires. A wall of light tears forward, and nothing can hurt your partner for six seconds." },
    atomicRay: { pat: "spokes", windup: 0.8, spread: 0.7, status: ["shock", 3], shape: { k: "star", n: 6, inner: 0.26, outer: 1.4 }, mark: { k: "scorch", time: 120 }, say: "Six rays at once, burnt into the ground like a star. Whatever survives is stunned." },
    hangOnDeath: { pat: "rings", windup: 0.7, spread: 0.7, knock: 420, status: ["stun", 2.5], shape: { k: "ragged", lo: 0.82, hi: 1.08 }, mark: { k: "rubble", time: 150 }, pop: "erupt", say: "The ground bursts in rings and throws everything outward, stunned. It stays broken." },
    catastropheCannon: { pat: "cannon", windup: 0.9, spread: 0.4, status: ["curse", 8], dot: ["poison", 8], boss: 0.35, shape: { k: "beam", w: 0.34, len: 2.1 }, mark: { k: "gash", time: 150 }, zone: ["curse", 60], say: "A cannon blast straight ahead. It leaves a cursed scar: anything standing in it takes more damage." },
    crimsonFlare: { pat: "gale", windup: 0.8, spread: 0.7, heal: 0.35, status: ["burn", 5], shape: { k: "lobes", n: 2, base: 0.42, depth: 1.0, off: 1.5708 }, mark: { k: "scorch", time: 120 }, zone: ["burn", 15], say: "Two wings of fire. Your partner rises from them with a third of its health back." },
    gigaBlaster: { pat: "storm", windup: 0.5, spread: 1.4, status: ["shock", 2.5], shape: { k: "discs", n: 13, r: 0.27, within: 1.1 }, mark: { k: "scorch", time: 120 }, pop: "zap", say: "Lightning comes down all over the field. Where it lands is anyone's guess." },
    arcticBlizzard: { pat: "gale", windup: 0.8, spread: 1.2, status: ["freeze", 3.5], shape: { k: "ragged", lo: 0.72, hi: 1.45 }, mark: { k: "ice", time: 180 }, zone: ["chill", 180], pop: "spike", say: "The whole field freezes over, unevenly, and stays frozen for minutes. Enemies on the ice are slowed." },
    sevenHeavens: { pat: "orbs", windup: 0.8, spread: 0.8, heal: 0.25, boss: 0.45, status: ["daze", 6], shape: { k: "discs", n: 7, r: 0.36, within: 0.64, hex: 1 }, mark: { k: "glow", time: 90 }, zone: ["daze", 30], say: "Seven pillars of light. They hit bosses hardest, heal your partner, and leave holy ground." },
    forbiddenTemptation: { pat: "gale", windup: 0.7, spread: 0.9, leech: 0.4, status: ["root", 5], shape: { k: "lobes", n: 5, base: 0.5, depth: 0.62, off: 0 }, mark: { k: "bloom", time: 120 }, zone: ["root", 20], say: "A flower of petals opens across the field. Survivors are rooted, and your partner drinks back health." },
    spiritStrike: { pat: "spiral", windup: 0.6, spread: 1.2, knock: -260, status: ["curse", 6], style: "fire", shape: { k: "lobes", n: 4, base: 0.42, depth: 0.78, off: 0 }, mark: { k: "glow", time: 90 }, say: "Four fox spirits wind outward and drag everything they leave alive back toward you." },
    legendWave: { pat: "wall", windup: 0.9, spread: 0.5, boss: 0.4, dot: ["bleed", 6], shape: { k: "band", w: 0.62, back: 0.3, len: 2.1 }, mark: { k: "gash", time: 180 }, say: "One cut, straight ahead, as wide as the field. The gash it leaves does not close." },
    fireTornado: { pat: "spiral", windup: 0.7, spread: 1.1, knock: -160, status: ["burn", 5], after: 4, style: "tornado", shape: { k: "circle", r: 0.78 }, mark: { k: "scorch", time: 120 }, say: "The storm breaks into four tornadoes that keep going." },
    megaBarrage: { pat: "storm", windup: 0.5, spread: 1.6, pop: "drop", boss: 0.35, shape: { k: "discs", n: 18, r: 0.22, within: 1.2 }, mark: { k: "crater", time: 150, small: 1 }, say: "Every missile it has. The field is left pocked with craters." }
  };
  var ULT_FAM = {
    fire: { pat: "impact", status: ["burn", 5], patch: { kind: "fire", n: 6, r: 64, life: 8 }, mark: { k: "scorch", time: 120 } }, ice: { pat: "gale", dmg: 0.7, status: ["freeze", 5], shape: { k: "ragged", lo: 0.72, hi: 1.4 }, mark: { k: "ice", time: 150 }, zone: ["chill", 150], pop: "spike" },
    water: { pat: "rings", knock: 380, status: ["wet", 8], patch: { kind: "wet", n: 8, r: 80, life: 10 } }, dark: { pat: "impact", status: ["curse", 8], mark: { k: "scorch", time: 120 } },
    holy: { pat: "orbs", heal: 0.25, status: ["daze", 6], shape: { k: "discs", n: 7, r: 0.36, within: 0.64, hex: 1 }, mark: { k: "glow", time: 60 } }, machine: { pat: "storm", status: ["shock", 2.5], pop: "zap", shape: { k: "discs", n: 13, r: 0.27, within: 1.1 }, mark: { k: "scorch", time: 120 } },
    nature: { pat: "gale", status: ["root", 5], shape: { k: "lobes", n: 5, base: 0.5, depth: 0.62, off: 0 }, mark: { k: "bloom", time: 120 } }, slime: { pat: "impact", dot: ["poison", 8], patch: { kind: "goo", n: 8, r: 72, life: 10 } },
    wind: { pat: "rings", knock: 420, status: ["stun", 2] }, beast: { pat: "rings", knock: 300, dot: ["bleed", 6], status: ["stun", 1.5], shape: { k: "ragged", lo: 0.82, hi: 1.08 }, mark: { k: "rubble", time: 120 } }
  };
  /* a Mega's ultimate: { id (the move it is), name, pat, ... } or null for anything that is not a Mega */
  function megaUltimate(form) {
    if (stageIdx(form) < 5) return null;
    var pool = movePool(form), id = pool.primary, c = ULT[id] || ULT_FAM[familyOf(form)] || ULT_FAM.beast, o = {}, k;
    if (!id || !W[id]) return null;
    for (k in c) o[k] = c[k];
    o.id = id; o.name = W[id].name; o.r = o.r || 430; o.windup = o.windup || 0.8; o.spread = o.spread || 0.6;
    return o;
  }
  D.megaUltimate = megaUltimate;
  D.MOVE_ULT = ULT;

  /* slot + tier for every move, so an owned move can be compared with what
   * the new stage offers */
  var META = {};
  function note(id, slot, tier) { if (id && W[id] && (!META[id] || META[id].tier > tier)) META[id] = { slot: slot, tier: tier }; }
  note("bubbleBlow", "primary", 0);
  note("headbutt", "melee", 1);
  for (fam in FAM) {
    for (i = 0; i < 5; i++) note(FAM[fam].ids[i], "primary", i + 1);
    note(FAM[fam].ids[5], "melee", 2); note(FAM[fam].ids[6], "melee", 4);
    note(FAM[fam].ids[7], "aura", 3); note(FAM[fam].ids[8], "orbit", 4);
  }
  var k2;
  for (k2 in LINES) {
    for (i = 0; i < 6; i++) { note(LINES[k2].primary[i], "primary", i); note(LINES[k2].melee[i], "melee", i); }
    note(LINES[k2].aura, "aura", 3); note(LINES[k2].orbit, "orbit", 4);
    note(LINES[k2].special, "special", 0);
    for (i = 0; i < (LINES[k2].sigs || []).length; i++) note(LINES[k2].sigs[i], "special", SIG_INFO[LINES[k2].sigs[i]].tier);
  }
  for (fam in FAM) note(FAM[fam].special, "special", 0);
  for (i = 0; i < TECHS.length; i++) note(TECHS[i], "tech", 0);
  /* older moves that sit outside the families */
  note("sludgeToss", "primary", 2);

  /* Partner attacks come a touch slower (gritty pace). */
  D.MOVE_PACE = { cooldownMul: 1.12 };

  /* Warp burst styles (data.js BURST): what a form does when it bursts.
   *   striker    darts from enemy to enemy with its claw, heavy criticals
   *   bombarder  plants itself and pours out its biggest shot, every one exploding
   *   guardian   holds by its tamer inside a pulsing ring that throws enemies back
   * By element, with a few body types that override it. */
  var STYLE_BY_FAMILY = { beast: "striker", nature: "striker", wind: "striker", fire: "bombarder", ice: "bombarder", water: "bombarder", slime: "bombarder", dark: "bombarder", holy: "guardian", machine: "guardian" };
  var STYLE_BY_TYPE = [
    [/fallen|devil|demon/i, "bombarder"],
    [/insect|beast man|warrior|holy knight|dragon man|weapon|holy sword|ninja/i, "striker"],
    [/angel|seraph|deity|machine|puppet|ore|mineral/i, "guardian"],
    [/dinosaur|dragon|reptile|sea|aquatic|bird|ghost|undead|demon|devil|wizard/i, "bombarder"]
  ];
  var STYLE_BY_ID = { gatomon: "striker", leomon: "striker", renamon: "striker" };
  function burstStyleOf(form) {
    if (STYLE_BY_ID[form]) return STYLE_BY_ID[form];
    var sp = D.SPECIES && D.SPECIES[form], nd = global.EVO_TREE && global.EVO_TREE.species && global.EVO_TREE.species[form], t = (sp && sp.type) || (nd && nd.type) || "", i;
    for (i = 0; i < STYLE_BY_TYPE.length; i++) if (STYLE_BY_TYPE[i][0].test(t)) return STYLE_BY_TYPE[i][1];
    return STYLE_BY_FAMILY[familyOf(form)] || "bombarder";
  }
  D.burstStyleOf = burstStyleOf;

  D.MOVE_FAMILIES = FAM;
  D.MOVE_LINES = LINES;
  D.MOVE_META = META;
  D.moveFamilyOf = familyOf;
  D.moveStageIdx = stageIdx;
  D.movePool = movePool;
  if (typeof module !== "undefined" && module.exports) module.exports = { movePool: movePool, familyOf: familyOf };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
