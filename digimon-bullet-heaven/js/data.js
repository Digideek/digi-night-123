/* Digimon Bullet Heaven — game data.
 * Add species, evolutions, weapons, and enemies here.
 * See README.md for a walkthrough.
 */
(function (global) {
  "use strict";

  var CARE = {
    fullnessMax: 100,
    happinessMax: 100,
    startFullness: 72,
    startHappiness: 62,
    fullnessDecayPerSec: 0.55, /* was 1.05: a full belly now lasts about three minutes of battle, not a minute and a half */
    lowFullnessThreshold: 22,
    lowFullnessHappinessDecay: 1.4,
    starveHappinessDecayPerSec: 3.2,
    starveHpPerSec: 2.0,
    feedFullness: 30,
    feedHappiness: 10,
    meatDropChance: 0.22,
    eliteMeatDropChance: 0.6,
    bossMeatDropChance: 1,
    toyDropChance: 0.045,
    worldFoodEvery: 7.5,
    toyHappiness: 20,
    killStreakWindow: 2.6,
    killStreakEvery: 5,
    killStreakHappiness: 5,
    heavyHitRatio: 0.16,
    heavyHitHappinessLoss: 8,
    hitHappinessLoss: 1.2,
    desperationHpRatio: 0.25,
    desperationDamageOut: 1.55,
    desperationSpeed: 1.28,
    desperationFireRate: 1.4,
    desperationDamageIn: 1.45,
    desperationHappinessDrain: 5.5
  };


  var TAMER = {
    maxHp: 84,
    /* Nov 15: the tamer cannot be targeted or hurt. The partner is the
     * whole stake: solo, the run ends when it goes down. */
    invulnerable: true,
    speed: 150,
    radius: 11,
    iFrame: 0.6,
    magnet: 90,
    carryMax: 3
  };

  /* Pickup food. Enemies drop these in battle; they go to the bag and are fed at the farm. */
  var FOOD = {
    meat:  { id: "meat",  name: "Meat",  group: "meat",  fullness: 30, happiness: 10, color: "#e85a4a", dropWeight: 1.0 },
    fish:  { id: "fish",  name: "Fish",  group: "meat",  fullness: 18, happiness: 18, color: "#4ec8e0", dropWeight: 0.7 },
    berry: { id: "berry", name: "Berry", group: "fruit", fullness: 10, happiness: 24, color: "#e060b0", dropWeight: 0.55 },
    /* Garden vegetables: grown at the Digi Farm, never dropped. */
    carrot:   { id: "carrot",   name: "Carrot",   group: "veg", fullness: 14, happiness: 14, hpHeal: 0.06, color: "#f08a28", veg: true },
    cucumber: { id: "cucumber", name: "Cucumber", group: "veg", fullness: 12, happiness: 16, hpHeal: 0.06, color: "#5cb848", veg: true },
    tomato:   { id: "tomato",   name: "Tomato",   group: "veg", fullness: 14, happiness: 18, hpHeal: 0.08, color: "#e83a30", veg: true },
    corn:     { id: "corn",     name: "Corn",     group: "veg", fullness: 20, happiness: 14, hpHeal: 0.08, color: "#f4d040", veg: true },
    cabbage:  { id: "cabbage",  name: "Cabbage",  group: "veg", fullness: 22, happiness: 12, hpHeal: 0.10, color: "#9ad860", veg: true },
    potato:   { id: "potato",   name: "Potato",   group: "veg", fullness: 28, happiness: 10, hpHeal: 0.12, color: "#c8a060", veg: true }
  };

  /* Crops. growSec is battle time (farm visits and brawls do not count),
   * so quick crops are ready by the next visit and slow ones take several.
   * Seeds drop from enemies by seedWeight; rarer seeds grow slower. */
  var CROPS = {
    carrot:   { id: "carrot",   name: "Carrot",   seed: "seed_carrot",   growSec: 150, yield: [2, 3], seedWeight: 1.0 },
    cucumber: { id: "cucumber", name: "Cucumber", seed: "seed_cucumber", growSec: 240, yield: [2, 3], seedWeight: 0.85 },
    tomato:   { id: "tomato",   name: "Tomato",   seed: "seed_tomato",   growSec: 330, yield: [2, 4], seedWeight: 0.7 },
    corn:     { id: "corn",     name: "Corn",     seed: "seed_corn",     growSec: 420, yield: [2, 3], seedWeight: 0.55 },
    cabbage:  { id: "cabbage",  name: "Cabbage",  seed: "seed_cabbage",  growSec: 540, yield: [1, 2], seedWeight: 0.45 },
    potato:   { id: "potato",   name: "Potato",   seed: "seed_potato",   growSec: 720, yield: [3, 5], seedWeight: 0.35 }
  };
  var SEED_DROP = { chance: 0.06, eliteChance: 0.25, bossChance: 1 };
  var CROP_ORDER = ["carrot", "cucumber", "tomato", "corn", "cabbage", "potato"];
  function seedId(crop) { return "seed_" + crop; }
  function cropOfSeed(id) { return (id && id.indexOf("seed_") === 0) ? id.slice(5) : null; }
  function isSeed(id) { var c = cropOfSeed(id); return !!(c && CROPS[c]); }
  function rollSeedKind(r) {
    var total = 0, i;
    for (i = 0; i < CROP_ORDER.length; i++) total += CROPS[CROP_ORDER[i]].seedWeight;
    var t = r * total;
    for (i = 0; i < CROP_ORDER.length; i++) {
      t -= CROPS[CROP_ORDER[i]].seedWeight;
      if (t <= 0) return seedId(CROP_ORDER[i]);
    }
    return seedId("carrot");
  }
  /* Garden plots in farm-yard coordinates, from FARM_CFG.garden. */
  function gardenPlots(cfg) {
    var g = (cfg && cfg.garden) || { x: 470, y: 540, cols: 3, rows: 2, plotW: 96, plotH: 58, gapX: 22, gapY: 20, radius: 46 };
    var out = [], r, c;
    for (r = 0; r < g.rows; r++) {
      for (c = 0; c < g.cols; c++) {
        var x = g.x + c * (g.plotW + g.gapX), y = g.y + r * (g.plotH + g.gapY);
        out.push({ i: out.length, x: x, y: y, w: g.plotW, h: g.plotH, cx: x + g.plotW / 2, cy: y + g.plotH / 2, radius: g.radius || 46 });
      }
    }
    return out;
  }
  function cropStage(plot, now) {
    if (!plot || !plot.crop) return -1;
    var span = Math.max(1, (plot.readyAt || 0) - (plot.plantedAt || 0));
    var f = ((now || 0) - (plot.plantedAt || 0)) / span;
    if (f >= 1) return 2;
    return f < 0.35 ? 0 : 1;
  }

  /* A diet is balanced when meat/fish and vegetables are both at least
   * `minShare` of the meals that count (after `minMeals`). */
  var DIET = { minMeals: 4, minShare: 0.3, joyBonus: 0.5, hpHealBonus: 0.08 };
  function dietOf(counts) {
    counts = counts || {};
    var meat = 0, veg = 0, fruit = 0, k, g;
    for (k in counts) {
      if (!Object.prototype.hasOwnProperty.call(counts, k) || !FOOD[k]) continue;
      g = FOOD[k].group;
      if (g === "meat") meat += counts[k];
      else if (g === "veg") veg += counts[k];
      else fruit += counts[k];
    }
    var total = meat + veg + fruit;
    var mostVeg = null, best = 0, tie = false;
    for (k in counts) {
      if (!Object.prototype.hasOwnProperty.call(counts, k) || !FOOD[k] || !FOOD[k].veg) continue;
      if (counts[k] > best) { best = counts[k]; mostVeg = k; tie = false; }
      else if (counts[k] === best && best > 0) tie = true;
    }
    var balanced = total >= DIET.minMeals && meat / Math.max(1, total) >= DIET.minShare && veg / Math.max(1, total) >= DIET.minShare;
    return { meat: meat, veg: veg, fruit: fruit, total: total, vegRatio: total ? veg / total : 0, mostVeg: tie ? null : mostVeg, balanced: balanced };
  }

  /* Battle food drops go straight into the bag (no cap) and can only be
   * fed to the partner at the Digi Farm. Picks meat / fish / berry by
   * FOOD[].dropWeight. `r` is a 0..1 roll. */
  function rollFoodKind(r) {
    var ids = ["meat", "fish", "berry"], total = 0, i; /* vegetables are grown, not dropped */
    for (i = 0; i < ids.length; i++) total += FOOD[ids[i]].dropWeight || 0;
    var t = r * total;
    for (i = 0; i < ids.length; i++) {
      t -= FOOD[ids[i]].dropWeight || 0;
      if (t <= 0) return ids[i];
    }
    return "meat";
  }

  /* Lava: nobody can walk on it. A partner right at its edge is scorched
   * (never below 1 HP, so the lava alone cannot end a run). Enemies are not
   * burned, so luring a horde into lava earns nothing. */
  var LAVA = { edge: 14, every: 0.5, damage: 0.03, minDamage: 2 };
  /* Herds (from 20 Nov every one comes out of a nest, data.js NESTS): they mill
   * around until a tamer or partner comes within `aggro` of any of them (or
   * one is hit), then the whole herd charges. Left `forgetAt` px behind, a herd
   * goes back into its nest (it is not killed). */
  var PACKS = { aggro: 185, wander: 70, idleSpeed: 0.3, forgetAt: 2600 };

  /* Warp burst: a meter that creeps up by itself and fills faster from
   * damage dealt. Full, R flashes the partner into the standard next form
   * of its line for a few seconds: its strongest moves at a furious rate,
   * heavy criticals, darting from enemy to enemy. Then it is itself again.
   * Only ever the well-known standard form, so nothing about the secret
   * routes is given away. */
  var BURST = {
    time: 6,            /* seconds it lasts */
    passive: 0.55,      /* meter per second just for being in the fight (full in about 3 minutes alone) */
    perDamage: 3.2,     /* meter for dealing one enemy's whole health in damage */
    bossMul: 5,         /* damage to bosses and Megas counts this much more */
    cooldownMul: 0.3,   /* moves come this much sooner */
    damageMul: 1.35,
    critBonus: 35,      /* added to crit chance, in % */
    speedMul: 1.7,
    guard: 0.5,         /* damage taken while it lasts */
    seek: 330,          /* how far it will dash for its next target */
    /* Three styles (moves.js burstStyleOf picks one per form). Anything
     * set here replaces the number above for that style. */
    styles: {
      striker:   { label: "Striker", cooldownMul: 0.22, damageMul: 1.3, critBonus: 55, speedMul: 1.9, guard: 0.6 },
      bombarder: { label: "Bombarder", cooldownMul: 0.24, damageMul: 1.5, critBonus: 15, speedMul: 1, guard: 0.5, explode: 52 },
      guardian:  { label: "Guardian", cooldownMul: 0.5, damageMul: 1.2, critBonus: 10, speedMul: 1.15, guard: 0.25,
                   pulseEvery: 0.4, pulseRadius: 125, pulseDamage: 0.6, pulseKnock: 190 }
    }
  };

  /* Shinies: every digivolution (never the hatch) has this chance of turning
   * the partner shiny. Once shiny it stays shiny through every later form.
   * The colours are worked out per Digimon in sprites.js (shinyCanvas). */
  var SHINY = { chance: 0.001 };

  /* Regional Digimon: each biome is home to certain kinds (biomes.js
   * homeOf). This share of ordinary spawns, Baby swarms and idle packs is
   * swapped for a native of the biome the tamer is standing in, of the same
   * stage. The rest wander in from anywhere. */
  var REGION = { share: 0.7 };
  /* The caught ally: a helper, not a second partner.
   *   It throws one attack every `attackEvery` seconds at `damageMul`.
   *   It earns `xpShare` of the XP of everything defeated, levels up, and
   *   digivolves along its standard line only at the levels in `evolveAt`
   *   (by the stage it is leaving). No branches: it is a wild Digimon.
   *   Its real worth is its passive, by element. DNA digivolving with it
   *   (when it is the other half of a pair with your partner) absorbs it:
   *   the partner keeps the passive for the rest of the run and the ally
   *   slot is free again. `stackMax` of the same passive can be kept. */
  var ALLY = {
    attackEvery: 7, damageMul: 0.6, xpShare: 0.5, xpBase: 14, xpPower: 1.6, hpPerLevel: 0.05,
    evolveAt: { "Baby I": 3, "Baby II": 6, Rookie: 12, Champion: 20, Armor: 20, Ultimate: 30 },
    stackMax: 2,
    passives: {
      fire:    { label: "+8% attack", damage: 1.08 },
      ice:     { label: "attacks 7% sooner", cooldown: 0.93 },
      water:   { label: "heals 0.4% health a second", regen: 0.004 },
      nature:  { label: "+12% max health", maxHp: 1.12 },
      wind:    { label: "+10% partner speed", monSpeed: 1.10 },
      machine: { label: "takes 8% less damage", guard: 0.92 },
      beast:   { label: "+6% critical chance", crit: 6 },
      slime:   { label: "+25% pickup range", magnet: 1.25 },
      dark:    { label: "warp burst charges 20% faster", burst: 1.2 },
      holy:    { label: "+5% lucky dodge", dodge: 5 }
    }
  };

  /* Lords: one huge native boss deep inside each stretch of a biome
   * (world.js lairs: one candidate per `cell` x `cell` tiles, kept only if
   * the country around it is all one biome). It stands at its ring of
   * stones and ignores everyone until they come within `aggro`. It is a
   * Champion in Year 1, an Ultimate in Year 2 and a Mega from Year 3, and
   * tougher every year. Beaten, it is gone for the run. */
  var LORD = { spawnAt: 1500, aggro: 230, wander: 36, hpMul: 2.6, hpPerYear: 0.6, dmgMul: 1.35, dmgPerYear: 0.2, size: 1.5,
    stages: ["Adult (Champion)", "Perfect (Ultimate)", "Ultimate (Mega)"], xpOrbs: 10, xpMul: 2, bits: 60, forgetAt: 2600 };

  /* A job level-up buys a breather: the skill tree opens in the middle of
   * the screen for `time` seconds. For that long the partner cannot be
   * hurt, and (in a solo run) every enemy stands still. Points not spent
   * are kept. */
  /* Job level-up: while the skill window is open nothing can hurt the partner and, in a solo run,
   * every enemy stands still. No countdown: it ends when the window closes or the point is spent
   * (`time` is only a backstop in case a window never closes). Online the others cannot be made
   * to wait, so the levelling partner alone is safe, for `coopTime` seconds at most. */
  var LEVEL_PAUSE = { time: 600, coopTime: 20 };
  /* Level-up cards: each skill point comes with `count` random skills to
   * choose from (weights: a move not yet learned, one already known, a
   * mastery). New skills are learned only from a card; the point can go
   * into anything already known instead, which also uses up the offer. */
  /* Terrain (world.js, terrain-art.js). Spires and caches sit at most one to a
   * cell of the map; press E beside one.
   *   spire: a black spire. Breaking it calls up an evil mini boss.
   *   cache: a data crate. Opening it drops Bits and XP. */
  var TERRAIN = {
    spireCell: 26, spireChance: 0.7,           /* tiles per cell, and the chance a cell has one */
    cacheCell: 14, cacheChance: 0.55,
    useRadius: 78,                             /* how close the tamer must be to press E */
    spire: {
      hpMul: 0.75, dmgMul: 1, size: 1.15,      /* against a normal boss of the same moment */
      bits: 25, xpOrbs: 6,
      /* who comes out, by year: the first of these the game knows, picked by the spire's place */
      evil: [["devimon", "bakemon", "devidramon", "dokugumon", "vilemon", "skullknightmon", "madleomon"],
             ["myotismon", "ladydevimon", "phantomon", "kimeramon", "okuwamon", "megadramon", "warumonzaemon"],
             ["piedmon", "malomyotismon", "blackwargreymon", "diablomon", "puppetmon", "machinedramon"]]
    },
    cache: { bits: [6, 14], xpOrbs: 3 }
  };
  /* Status effects and ground patches (mission-sim.js "_applyElement", "_addPatch").
   * Every hit a partner, ally or teammate lands carries its move's element and
   * can leave that element's mark on the enemy:
   *
   *   fire    Burn     damage over time
   *   ice     Freeze   cannot move or bite (bosses are only chilled: slowed)
   *   water   Soak     slowed a little, and open to the reactions below
   *   nature  Root     slowed a lot
   *   wind    Gust     thrown twice as far and winded for a moment
   *   machine Shock    stunned
   *   beast   Bleed    damage over time
   *   slime   Poison   long damage over time, slowed a little
   *   dark    Curse    takes more damage
   *   holy    Daze     deals less damage
   *
   * Reactions on an enemy:   water on Burn puts it out.  fire on Soak dries it,
   * on Freeze thaws it (leaving it soaked).  ice on Soak freezes for sure and for
   * longer; ice on Burn puts it out.  wind on Burn spreads the burn to enemies
   * close by.  machine on Soak shocks twice as often and for twice as long.
   *
   * Ground patches (bigger moves leave them more often and wider):
   *   fire  flames that burn what stands in them; on grass they last longer and creep
   *   wet   a puddle: soaks       ice   a sheet: chills       goo   slime: poisons
   * Reactions on the ground: water puts fire out and washes goo away.  fire dries a
   * puddle, melts ice to a puddle and sets goo alight.  ice freezes a puddle into a
   * sheet and smothers fire.  wind fans fire wider and dries puddles.
   * Times are halved on bosses. Enemy hits do not apply any of this. */
  var STATUS = {
    fire:    { s: "burn",   chance: 0.25, time: 3,   dps: 0.25 },      /* dps: share of the hit's damage dealt each second */
    ice:     { s: "freeze", chance: 0.15, time: 1.2, wetMul: 1.7 },
    water:   { s: "wet",    chance: 0.35, time: 5 },
    nature:  { s: "root",   chance: 0.2,  time: 2 },
    wind:    { s: "gust",   chance: 0.2,  knock: 2, stun: 0.35, spread: 84 },
    machine: { s: "shock",  chance: 0.15, time: 0.6 },
    beast:   { s: "bleed",  chance: 0.2,  time: 4,   dps: 0.18 },
    slime:   { s: "poison", chance: 0.25, time: 6,   dps: 0.12 },
    dark:    { s: "curse",  chance: 0.2,  time: 4,   taken: 1.2 },
    holy:    { s: "daze",   chance: 0.2,  time: 4,   dealt: 0.7 },
    slow: { wet: 0.85, root: 0.4, poison: 0.85, chill: 0.6 },
    chillTime: 2.4,
    bossTime: 0.5,
    patch: {
      kinds: { fire: "fire", water: "wet", ice: "ice", slime: "goo" },
      chance: [0.05, 0.06, 0.1, 0.16, 0.24, 0.34, 0.45],       /* by the move's tier, 1 to 6 */
      radius: 20, perTier: 8, maxRadius: 84,
      life: { fire: 3.5, wet: 8, ice: 6, goo: 6 },
      fireDps: 0.3, gooDps: 0.15,
      gap: 0.3, max: 48,
      grassLife: 1.8, spreadEvery: 1, spreadChance: 0.3, spreadGen: 2
    }
  };
  /* Lightning in a thunderstorm (mission-sim.js _updateStorm). A bolt comes
   * down every `every` seconds somewhere within `range` of a tamer, sometimes
   * (`seekEnemy`) right on an enemy. The ground crackles for `warn` seconds
   * first. It hurts every enemy within `radius` (a share of its full health,
   * far less on bosses, Megas and lords) and shocks it; a partner caught in
   * it loses `partner` of its health, never its last point. Tamers are never
   * hit. Then it leaves fire where it landed, and grass there burns. */
  var STORM = {
    every: [3.5, 7.5], range: [110, 460], seekEnemy: 0.4, warn: 0.9,
    radius: 62, enemy: 0.4, big: 0.05, minDamage: 8, shock: 0.9,
    partner: 0.1, partnerRadius: 46,
    fireRadius: 44, fireDps: [5, 1.2]                  /* burn a second: base, plus this for each minute of the run */
  };
  /* Grass that burns (world.js burn / isGrass). Fire on grass chars the
   * ground under it; tall grass catches for sure and carries the fire
   * further. Charred ground cannot burn again until it has grown back:
   * `regrow` seconds of battle time, short green shoots for the last `sprout`. */
  /* The living map (Nov 20; world.js ICE / FELL / PUD, mission-sim.js "_packRoutine")
   *   fellR         a blast at least this wide knocks trees flat
   *   patchIceSec   how long ice from a move holds frozen water (a bridge)
   *   routine       how undisturbed packs spend the day */
  var LIVING = {
    fellR: 64, patchIceSec: 30,
    leash: 220,                    /* a flying or swimming partner goes no further than this from you while over water */
    routine: { drinkChance: 0.45, drinkSec: 22, drinkReach: 420, grazeSec: 18, roam: 220, herdSpeed: 9, sleepAggro: 0.45, prowl: 2, prowlSpeed: 1.6 }
  };

  /* Biome wars (Nov 20; war-sim.js, world.js territory). Tuned so that a
   * season's edge alone moves a front a cell (8 tiles) every couple of
   * minutes, a handful of one side's dead at the front makes it give way in
   * under a minute, and a fallen lord lets its whole country cave in.
   *   radius        how many cells round each tamer the fighting is worked out
   *   rate / leak   pressure gained per second per unit of push / lost without push (full = the cell falls)
   *   loss*         a death counts 1 (a boss 4, a lord lordLoss) for lossLife seconds within lossRadius px
   *   season        strength in each biome's good and bad seasons; nightOwl: Dark Area after dark
   *   skirmish*     squads of each side's natives meeting at a front you can see */
  var WAR = {
    tick: 1, radius: 7, rate: 0.034, leak: 0.01, maxPush: 2, maxFlipsPerTick: 1,
    wobble: 0.12, wobbleEvery: 150,
    lossWeight: 0.14, lossLife: 150, lossRadius: 1300, bossLoss: 4, lordLoss: 6, lordRadius: 4800, maxDead: 400,
    base: {},
    season: {
      snow: { winter: 1.4, summer: 0.8 }, volcano: { summer: 1.35, winter: 0.8 }, desert: { summer: 1.3, winter: 0.85 },
      forest: { spring: 1.25, fall: 0.9 }, plains: { spring: 1.2, winter: 0.9 }, swamp: { fall: 1.3, summer: 0.9 }, circuit: {}
    },
    nightOwl: { glitch: 1.35 },
    skirmishFirst: 40, skirmishEvery: [28, 46], skirmishNear: [380, 1100], squad: [3, 5], scatter: 70, maxUnits: 16,
    seek: 520, aggro: 150, holdFor: 25, fightMul: 0.45,   /* soldiers hit each other softer than they hit you, so a fight lasts long enough to watch */
    color: { plains: "#8ad84a", forest: "#2fb05a", desert: "#f0c860", snow: "#bfe8ff", swamp: "#a8e83a", volcano: "#ff6a2a", circuit: "#3ae0ff", glitch: "#d070ff" }
  };

  /* Living populations (Nov 20; nest-sim.js, world.js nestsNear). Replaces the waves.
   *   activate     a nest within this many px of a tamer has its herd out
   *   cap          how many a nest holds (herd / nursery / alpha), +capPerYear a year, at most capMax
   *   breedSec     one more every this many seconds, out of sight or not
   *   startFull    how full a nest is the first time anyone comes near
   *   settlers     how many a conquering biome starts a taken nest with */
  var NESTS = { tick: 1, activate: 980, cap: { herd: 6, nursery: 7, alpha: 5 }, capPerYear: 1, capMax: 11, breedSec: 40, babyBreedSec: 10, babyCapAdd: 2, startFull: 1, settlers: 2, scatter: 70 };

  /* Faction trust (Nov 20; faction-sim.js). Per tamer, per biome, 0 to max.
   *   trusted     at or above: that biome leaves you be, and your side's attacks pass over it unless you click one
   *   allyHold    once allied (max), it stays so until trust falls below this
   *   killGain    for each biome bordering the spot (within frontCells) where you kill a Digimon; killLoss from its own
   *   hit*        a landed hit costs trust (more if they trusted you), at most once per hitEvery seconds per biome
   *   fade*       trust not added to for fadeAfter seconds drifts down fade a second
   *   rally*      allied: up to rallyCap of its Digimon within rallyReach come to you; they go for anything hostile
   *               within guard of you, and drift off past rallyLeave */
  var FACTIONS = {
    tick: 1, max: 100, trusted: 40, allyHold: 85, frontCells: 3,
    /* Nov 21: allies came within a minute or two; it is real work now. A kill gives killGain x
     * the stage weight (a Baby is worth little, a Mega a lot), less the closer you are to the top
     * (down to topKeep of it near max), and a biome gives at most perMinute in any minute. */
    killGain: 1.5, killLoss: 12, bossMul: 2.5, lordMul: 9,
    stageWeight: { "Baby I": 0.25, "Baby II (In-Training)": 0.5, "Child (Rookie)": 1, "Adult (Champion)": 2, "Perfect (Ultimate)": 3.5, "Ultimate (Mega)": 6, "Ultimate (Mega+)": 7, "Armor": 2 },
    topKeep: 0.25, perMinute: 8,
    warmAt: 15,                                            /* "friendly": its Digimon start to warm to you (a faint heart, a word of thanks) */
    hitLoss: 0.5, hitLossTrusted: 4, hitEvery: 0.5,
    fadeAfter: 60, fade: 0.25,
    rallyCap: 3, rallyReach: 520, rallyLeave: 1100, guard: 320
  };

  /* PvP (Nov 20; pvp-sim.js). Tamers backed by different biomes (and none in common) fight on sight.
   *   reach   partner-to-partner distance it starts at; share: of each move's damage
   *   koAt    a partner at or below this share of its health is beaten: home to the farm with koHp,
   *           the winner takes `bits` of the loser's Bits, and the loser comes back with a koShield-second shield */
  var PVP = { reach: 240, share: 0.7, koAt: 0.08, koHp: 0.3, bits: 0.25, koShield: 6, flagOff: 10 };   /* flagOff: seconds to lower the PvP flag */
  /* Allies that grow (pvp-sim.js): a Digimon rallied to you levels from its own kills (1 each, 4 for a
   * boss) and `share` of each of yours; xpBase + xpPer per level to the next. Each level: health x hpPer
   * (heals healPer), damage x dmgPer. At evolveAt levels it digivolves into its line's standard next form. */
  var ALLY_GROWTH = { share: 0.35, bossXp: 4, xpBase: 4, xpPer: 2, maxLevel: 12, hpPer: 1.12, healPer: 0.3, dmgPer: 1.1, evolveAt: [4, 8] };

  /* Levels and toughness (Nov 20, Ragnarok-style; mission-sim.js "_levelUp"/"_xpGap").
   * Every wild Digimon has a level inside its stage's band (band), higher the further from the start
   * (farFrac of the band over farPx) and a little at random; bosses and alpha leaders +bossLv, lords
   * +lordLv, Megas in the field at the top. Within its band each level above the bottom is +hpPerLv
   * health. All of them: x hpMul health, x dmgMul damage ("properly tough"), x xpMul XP.
   * The gap to your partner's job level:
   *   a Digimon above you hits dmgPerLvAbove harder a level (up to dmgCapAbove) and gives xpPerLvAbove
   *   more XP a level (up to xpCapAbove);
   *   one more than freeBelow levels below you gives xpPerLvBelow less a level, down to xpFloor:
   *   cutting down weak ones is easy, but it won't level you.
   * Never empty: a nest below lowAt breeds lowMul times as fast; and when fewer than wanderMin wild
   * Digimon are within wanderNear of a tamer, a small wandering herd of the local biome drifts in from
   * off-screen every wanderEvery seconds. */
  var LEVELS = {
    band: { "Baby I": [1, 4], "Baby II (In-Training)": [3, 8], "Child (Rookie)": [7, 15], "Adult (Champion)": [14, 24], "Armor": [16, 24],
      "Perfect (Ultimate)": [22, 32], "Ultimate (Mega)": [30, 42], "Ultimate (Mega+)": [40, 50] },
    farPx: 12000, farFrac: 0.6, bossLv: 3, lordLv: 6, hpPerLv: 0.05,
    hpMul: 1.8, dmgMul: 1.4, xpMul: 1.7,
    /* by the wild one's stage (17z33): the signature sets made partners hit 0.92x / 0.91x / 1.05x /
     * 1.14x / 1.21x / 1.30x as hard as before at Baby .. Mega (a typical build at a typical job
     * level, every line); this cancels that and adds 5% on top, "as hard as before, a smidge harder" */
    stageHp: { "Baby I": 0.97, "Baby II (In-Training)": 0.96, "Child (Rookie)": 1.1, "Adult (Champion)": 1.2, "Armor": 1.2,
      "Perfect (Ultimate)": 1.27, "Ultimate (Mega)": 1.37, "Ultimate (Mega+)": 1.37 },
    dmgPerLvAbove: 0.05, dmgCapAbove: 1.0, xpPerLvAbove: 0.06, xpCapAbove: 0.6,
    freeBelow: 3, xpPerLvBelow: 0.15, xpFloor: 0.05,
    lowAt: 2, lowMul: 3,
    wanderEvery: [40, 70], wanderMin: 6, wanderNear: 1200, wanderSize: [3, 5], wanderDist: [950, 1150]
  };

  /* Run modes, respawning, scores, bounties (Nov 20; js/net/modes-sim.js, boards-server.js, hub.js League).
   *   MODES.list   what the run setup offers: open (respawn), survival, ranked, weekly (one life each but open)
   *   RESPAWN      Open World only. When your partner (or tamer) falls: back hatchSec later as the line's
   *                egg, near the start (near: px from the centre), shield seconds of safety. Base level,
   *                stat points, Bits, bag and faction standing are kept. zone: inside baby px the nests stay
   *                Babies and In-Training all run long; inside rookie px, up to Rookie; no field Megas or
   *                alpha leaders there. catchUp: XP multiplier while the job level is more than catchUpGap
   *                below the best it reached this run.
   *   BOUNTY       streak PvP wins in a row without losing puts base Bits on your head, +per for each more.
   *   MODES.score  how a run is scored for the boards (modes-sim.js _score). */
  var MODES = {
    list: [
      { id: "open", name: "Open World", short: "Respawn", blurb: "Your partner falls? It starts over as an egg near the start. Same map, same tamer, keep your base level." },
      { id: "survival", name: "Survival", short: "One life", blurb: "One life. When your partner falls, the run is over." },
      { id: "ranked", name: "Ranked", short: "Hardcore", blurb: "One life, no CPU partners, scored for the Ranked board.", ranked: true },
      { id: "weekly", name: "Weekly Map", short: "This week", blurb: "One life on this week's map: the same world for everyone. Scored for the Weekly board.", ranked: true }
    ],
    score: { perMinute: 10, perLevel: 25, perKill: 1, perLord: 300, perBoss: 60, perPvp: 150, mega: 2000, megaMin: 500, megaLatePerMin: 15 }
  };
  var RESPAWN = { hatchSec: 8, near: [250, 520], shield: 10, zone: { cradle: 1300, baby: 2200, rookie: 4500 }, catchUp: 1.75, catchUpGap: 2,
    startLv: 3, startHp: 1, startHerd: 2, freshSec: 30 };   /* in the Baby zone: wild levels capped at startLv, no LEVELS toughening, herds of
                                                             startHerd (+1 from a nest); a partner beaten within freshSec of hatching makes no nemesis */   /* in the Baby zone: wild levels capped at startLv, no LEVELS toughening (playtest, Nov 20) */
  var BOUNTY = { streak: 3, base: 300, per: 150 };
  /* Nemeses (Nov 20; js/net/nemesis-sim.js). A wild Digimon that beats a tamer's partner remembers it.
   *   pts       what each kill is worth to it: a tamer's partner (any tamer) or another wild Digimon
   *   tiers     points for each title; past the last, one more every `beyond`. No ceiling.
   *   titles    shown over it as "<the first tamer it beat>'s <title>"
   *   perKill   a partner beaten: levels, health and damage multiplied, healed in full
   *   perWild   a wild kill: a little stronger, healed a little, a level every lvEvery of them
   *   Every new title it digivolves (when its line goes further).
   *   notice    it comes for a tamer's side inside this; otherwise it hunts other biomes' Digimon
   *             within hunt, or roams
   *   herdFrom  from this title on it gathers its own biome's Digimon as a herd (herdPer more a title)
   *   conquerFrom  from this title on, standing in another biome's land for conquerSec takes it
   *   reward    XP and Bits when you finally beat it, per title */
  var NEMESIS = {
    pts: { partner: 10, wild: 1, big: 4 },
    tiers: [10, 20, 35, 55, 80, 110, 150], beyond: 50,
    titles: ["Nemesis", "Scourge", "Tyrant", "Warlord", "Calamity", "Doom", "Apocalypse"],
    perKill: { lv: 4, hp: 1.5, dmg: 1.22 },                 /* Nov 21: 4 levels a win (was 6); it digivolves only when its level gets there */
    leaveSec: 90, edgeWait: 6,                              /* after beating you it heads out of the low-level area for leaveSec; one left waiting at the start's edge gives up after edgeWait s */
    perWild: { hp: 1.03, dmg: 1.01, heal: 0.2, lvEvery: 3 },
    radiusPer: 0.06, radiusMax: 1.8,
    notice: 650, hunt: 700, roam: 900,
    herdFrom: 3, herdPer: 2, herdReach: 450, herdEvery: 5,
    conquerFrom: 4, conquerSec: 8,
    reward: { xp: 80, bits: 60, orbs: 6 }
  };

  var GRASSFIRE = {
    regrow: 170, sprout: 45,
    tallIgnite: 0.6, tallSpreadGen: 4, tallSpreadChance: 0.6,
    season: { spring: 1, summer: 1.25, fall: 1.4, winter: 0.35 },    /* how readily it creeps, by season */
    wetSpread: 0.35, wetLife: 0.6                                    /* in rain: creeps less, burns out sooner */
  };
  /* The rival (js/net/rival-sim.js). Every run has one: another tamer with a
   * partner from another egg line, living on the same map for the whole run.
   * Its partner plays by the partner rules: the same XP for a kill, the same
   * job and base level curves, the same status point costs and formulas, the
   * game's own move picker for its skill points, its real moves fired at the
   * wild Digimon it hunts. It digivolves along its line's plain route.
   *
   *   arriveAt   seconds into the run it shows up, already hatched
   *   talent     how good this run's rival is at the grind (rolled from the seed)
   *   away       its pace while it is somewhere you cannot see: kills a minute of
   *              the wild Digimon of the moment. Near you it has to kill them for real.
   *   nearField  within this of a tamer it is on the field, further and it is elsewhere
   *   drift      how often it heads back your way, and how close it aims
   *   hunt       how far it looks for wild Digimon to fight
   *   sight      it goes for your partner on seeing it this close; giveUp: how far
   *              you must get before it loses interest
   *   calm       after you shake it off it leaves your partner alone this long
   *   hpMul      its health is a partner's by the same rules, times this, so a
   *              duel lasts longer than a blink
   *   pvp        the share of its move damage that lands on your partner
   *   evo        job level and seconds in its form before it digivolves, by stage
   *   farm       it takes a farm break every so often: gone for `stay`, back healed,
   *              with `train` extra status points and what it would have earned out there
   *   down       beat its partner and it is carried off for `away` seconds, and you
   *              are paid; it comes back healed, no weaker, and keeps growing
   */
  /* Tamer Rank: the one thing a run always leaves behind. Rank XP is paid when a
   * run ends, to the profile; ranks never reset. Every rank pays DigiBits and
   * the milestone ranks open a title in the Cabinet. */
  var RANK = {
    max: 50,
    need: { base: 120, step: 45 },          // XP from rank r to r+1 = base + step * (r - 1)
    pay: { perMinute: 10, perKill: 0.25, boss: 30, rivalWin: 40,
      stage: { "Baby": 0, "In-Training": 15, "Rookie": 50, "Champion": 120, "Armor": 120, "Hybrid": 120, "Ultimate": 260, "Mega": 500, "Mega+": 650 } },
    bits: { base: 15, perRank: 5 },         // DigiBits paid on reaching rank r
    titles: [
      { rank: 3, id: "title-rank-3", name: "Field Runner" },
      { rank: 5, id: "title-rank-5", name: "Digidestined" },
      { rank: 10, id: "title-rank-10", name: "Crest Bearer" },
      { rank: 15, id: "title-rank-15", name: "Night Walker" },
      { rank: 20, id: "title-rank-20", name: "Gate Keeper" },
      { rank: 30, id: "title-rank-30", name: "Eclipse Chaser" },
      { rank: 40, id: "title-rank-40", name: "Royal Knight" },
      { rank: 50, id: "title-rank-50", name: "Legend of the Night" }
    ]
  };

  /* The Lab: DigiBits buy small permanent boosts. Small on purpose: a maxed Lab
   * helps, it does not carry a bad build. `per` is the gain per level. */
  var LAB = {
    cost: [25, 50, 90, 140, 200],          // DigiBits for level 1..5 of any upgrade
    runBitsPer: 8,                          // a finished run pays 1 DigiBit per this much rank XP
    list: [
      { id: "vital",  name: "Vital Data",  stat: "hp",     per: 0.02,  unit: "%", text: "Partner max health" },
      { id: "power",  name: "Battle Data", stat: "dmg",    per: 0.015, unit: "%", text: "Damage from every move" },
      { id: "scan",   name: "Scan Range",  stat: "magnet", per: 0.05,  unit: "%", text: "Pickup range" },
      { id: "study",  name: "Study Data",  stat: "xp",     per: 0.02,  unit: "%", text: "Job XP gained" },
      { id: "farm",   name: "Farm Pass",   stat: "farm",   per: 6,     unit: "s", text: "Longer Digi Farm visits" },
      { id: "bits",   name: "Bit Finder",  stat: "bits",   per: 0.05,  unit: "%", text: "Bits found in a run" },
      { id: "warp",   name: "Warp Coil",   stat: "burst",  per: 0.04,  unit: "%", text: "Warp meter fills by itself faster" },
      { id: "swift",  name: "Swift Data",  stat: "speed",  per: 0.01,  unit: "%", text: "Partner move speed" },
      { id: "notes",  name: "Field Notes", stat: "bxp",    per: 0.02,  unit: "%", text: "Base XP gained" },
      { id: "tap",    name: "Data Tap",    stat: "data",   per: 0.04,  unit: "%", text: "Hatchery data from a run" },
      { id: "thumb",  name: "Green Thumb", stat: "crop",   per: 0.04,  unit: "%", text: "Crops grow faster" },
      { id: "belly",  name: "Full Belly",  stat: "belly",  per: 0.03,  unit: "%", text: "Fullness lasts longer" },
      /* one level only, its own price: a second Crest slot (see ITEMS) */
      { id: "port",   name: "Digivice Port", stat: "slot", per: 1,     unit: "slot", text: "A second Crest slot in your Digivice", max: 1, costs: [300] }
    ]
  };

  /* Items you keep between runs. Three kinds, found as rare drops:
   *   crest  a Crest Piece, plugged into the Digivice (one slot; the Lab's Digivice Port adds a
   *          second). Information and utility. Dropped by biome lords.
   *   charm  worn by the partner (one slot). A small trait. Dropped by bosses.
   *   cons   used up by a run (one per run, chosen beforehand). Dropped by bosses and rivals.
   * A beaten rival also leaves a scroll of one of its skills (kept as { skill } in the stash).
   * `fx` is what it does: mission-sim.js _gear reads the numbers, game.js the screen-side ones. */
  var ITEMS = {
    drop: { boss: 1 / 3, bossCharm: 0.6, lord: 0.5, rivalCons: 1 / 3, rarity: { common: 0.75, rare: 0.21, prismatic: 0.04 } },
    dupeBits: { common: 15, rare: 40, prismatic: 120 },      // gear you already own turns into DigiBits
    maxStack: 9, maxScrolls: 12,
    list: [
      { id: "c_weather", kind: "crest", rarity: "common", name: "Weather Eye", text: "A minute's warning before storms, meteor showers and eclipses.", fx: { weather: 1 } },
      { id: "c_egg", kind: "crest", rarity: "common", name: "Egg Sense", text: "Digimon you can catch show on the minimap.", fx: { eggsense: 1 } },
      { id: "c_farm", kind: "crest", rarity: "common", name: "Farm Clock", text: "Digi Farm visits last 20 seconds longer.", fx: { farm: 20 } },
      { id: "c_scan", kind: "crest", rarity: "rare", name: "Rival Scan", text: "The rival's position and job level, always on the minimap.", fx: { scan: 1 } },
      { id: "c_hatch", kind: "crest", rarity: "rare", name: "Hatch Light", text: "+15% job XP for the first three minutes.", fx: { earlyXp: 1.15, earlyUntil: 180 } },
      { id: "c_twin", kind: "crest", rarity: "prismatic", name: "Twin Crest", text: "Rival Scan and Weather Eye in one piece.", fx: { scan: 1, weather: 1 } },
      { id: "m_fire", kind: "charm", rarity: "common", name: "Ember Charm", text: "+10% damage from Fire moves.", fx: { elem: "fire" } },
      { id: "m_ice", kind: "charm", rarity: "common", name: "Frost Charm", text: "+10% damage from Ice moves.", fx: { elem: "ice" } },
      { id: "m_water", kind: "charm", rarity: "common", name: "Tide Charm", text: "+10% damage from Water moves.", fx: { elem: "water" } },
      { id: "m_dark", kind: "charm", rarity: "common", name: "Shade Charm", text: "+10% damage from Dark moves.", fx: { elem: "dark" } },
      { id: "m_holy", kind: "charm", rarity: "common", name: "Halo Charm", text: "+10% damage from Holy moves.", fx: { elem: "holy" } },
      { id: "m_machine", kind: "charm", rarity: "common", name: "Gear Charm", text: "+10% damage from Machine moves.", fx: { elem: "machine" } },
      { id: "m_nature", kind: "charm", rarity: "common", name: "Leaf Charm", text: "+10% damage from Nature moves.", fx: { elem: "nature" } },
      { id: "m_slime", kind: "charm", rarity: "common", name: "Ooze Charm", text: "+10% damage from Slime moves.", fx: { elem: "slime" } },
      { id: "m_wind", kind: "charm", rarity: "common", name: "Gale Charm", text: "+10% damage from Wind moves.", fx: { elem: "wind" } },
      { id: "m_beast", kind: "charm", rarity: "common", name: "Fang Charm", text: "+10% damage from Beast moves.", fx: { elem: "beast" } },
      { id: "m_bell", kind: "charm", rarity: "common", name: "Magnet Bell", text: "+20% pickup range.", fx: { magnet: 1.2 } },
      { id: "m_heart", kind: "charm", rarity: "common", name: "Hearty Charm", text: "+6% partner health.", fx: { hp: 1.06 } },
      { id: "m_tag", kind: "charm", rarity: "rare", name: "Swift Tag", text: "The warp burst meter fills 20% faster.", fx: { burst: 1.2 } },
      { id: "m_leech", kind: "charm", rarity: "rare", name: "Leech Charm", text: "A critical hit heals 1% of your partner's health.", fx: { leech: 0.01 } },
      { id: "m_clock", kind: "charm", rarity: "prismatic", name: "Old Clock", text: "Warp bursts last a second longer.", fx: { burstTime: 1 } },
      { id: "m_prism", kind: "charm", rarity: "prismatic", name: "Prism Shard", text: "Three times the chance of a shiny digivolution.", fx: { shiny: 3 } },
      { id: "u_protein", kind: "cons", rarity: "common", name: "Protein", text: "Your partner hatches at job level 3, with two skill points to spend.", fx: { level: 3 } },
      { id: "u_lucky", kind: "cons", rarity: "rare", name: "Lucky Charm", text: "The first digivolution this run is 20 times likelier to turn shiny.", fx: { luckyShiny: 20 } },
      { id: "u_bait", kind: "cons", rarity: "rare", name: "Rival Bait", text: "The rival hunts you from the moment it arrives. Beating it pays double and always drops something.", fx: { bait: 1 } },
      { id: "u_wind", kind: "cons", rarity: "prismatic", name: "Second Wind", text: "Once this run, a blow that would finish your partner leaves it on half health instead.", fx: { wind: 1 } }
    ]
  };

  /* DigiBank memories: a partner that reached Champion or beyond leaves a memory
   * of itself for its egg line. The next egg of that line hatches with a few
   * skill points already in hand. One memory per line; the best one is kept. */
  var MEMORY = {
    tier: { "Champion": 1, "Armor": 1, "Hybrid": 1, "Ultimate": 2, "Mega": 3, "Mega+": 3 },   // stage reached -> skill points at hatch
    max: 3
  };

  /* Rival trophies: beating the rival banks it. One trophy per rival per run,
   * kept at the strongest state you beat it in. */
  var TROPHY = { max: 40 };

  /* Infected Digimon (js/net/virus-sim.js). A wild Digimon carrying a virus: tinted purple, it
   * attacks any Digimon it can see. It goes for a tamer's side first, then for wild Digimon
   * that are not infected, and for other infected ones only when it sees nothing else.
   *   firstAt, every   seconds before the first one wanders in, then the gap between them [min, max]
   *   wild             how many wander in on their own at once
   *   cap              the most infected at once, spread included
   *   sight            how far it sees, in pixels
   *   stageAt          minutes on the clock -> the stages it may arrive as
   *   hpMul/dmgMul/spdMul   against a plain one of its kind; `caught` for one that caught it from another
   *   wildMul          its damage to other wild Digimon, on top (so its fights end)
   *   biteCd           seconds between its hits on a wild Digimon
   *   grow             kills it needs to digivolve, by the stage it is leaving; feedHeal is the share of health a kill gives back
   *   spreadFrom       the stage from which its hits pass the virus on; spreadChance per hit survived
   *   fightBack        seconds a wild Digimon keeps fighting the one that hit it
   *   pay              what beating one gives: XP orbs (each xpMul of its kind's XP), bits, and Hatchery data
   *   forgetAt         left this far behind every tamer, it is gone */
  var VIRUS = {
    firstAt: 75, every: [55, 85], wild: 2, cap: 6, sight: 430,
    stageAt: [[0, ["Child (Rookie)"]], [5, ["Child (Rookie)", "Adult (Champion)"]], [12, ["Adult (Champion)"]], [18, ["Adult (Champion)", "Perfect (Ultimate)"]]],
    hpMul: 3, dmgMul: 1.5, spdMul: 1.1,
    caught: { hpMul: 1.6, dmgMul: 1.2, spdMul: 1.05 },
    wildMul: 2.2, biteCd: 0.8,
    grow: [4, 6, 12, 24, 40], feedHeal: 0.1,
    spreadFrom: 3, spreadChance: 0.3,
    fightBack: 3,
    pay: { xpOrbs: 5, xpMul: 1.2, bits: 18, data: 8 },
    forgetAt: 2400
  };

  var RIVAL = {
    arriveAt: 45,
    talent: [0.8, 1.15],
    away: { killsPerMin: 15 },
    /* Where it lives: it enters `enterAt` px from you and keeps to a home range of `roam` px around
     * that spot, on its own business. It never heads for you; it only turns on you inside `sight`.
     * If you travel more than `homeMax` from its range, it settles a new one `enterAt` from you, so
     * it can always be found. On the field it leaves alone wild Digimon within `shy` px of a tamer. */
    enterAt: 2200, roam: 1500, homeMax: 4200, shy: 520, fieldGain: 1,   /* fieldGain: its usual pace while it wanders near you with nothing of its own to fight */
    nearField: 900, drift: { every: [14, 30], step: 620 },
    hunt: 460, sight: 290, giveUp: 640, calm: 40,
    hpMul: 3, pvp: 0.6,
    evo: { level: [3, 8, 15, 24, 34], time: [100, 220, 400, 600, 900] },
    farm: { every: 360, stay: 40, train: 3 },
    down: { away: 150, xpOrbs: 10, xpMul: 2, bits: 40, bitsPerWin: 15 },
    names: ["Fang", "Ember", "Onyx", "Rook", "Vesper", "Flint", "Talon", "Sable", "Jinx", "Cinder", "Thorn", "Echo", "Blitz", "Nox", "Ridge", "Ash"]
  };
  var SKILL_CARDS = { count: 3, newWeight: 3, ownedWeight: 2, passiveWeight: 1 };

  /* Pacing (Nov 16): the opening was slow for what it paid.
   *   jobEarly              the first job levels cost this fraction of the curve,
   *                         so the first skill points arrive within seconds
   *   baseEarly             the first base levels cost this many times the curve
   *                         (Nov 18: base level 4 was arriving 15 s into the fighting)
   *   openRate, openCap     more spawns and a higher limit for the first
   *                         `openUntil` seconds, easing back over `openFade`
   *   openHp                and those early enemies have this much health,
   *                         so there are more fights and each ends sooner
   *   group                 enemies arrive together, a few at a time, at one
   *                         edge of the screen instead of one by one
   *   magnet*               XP comes to you from further and faster, and a
   *                         job level-up pulls in everything within levelMagnet */
  var PACING = {
    jobEarly: [0.55, 0.55, 0.65, 0.75, 0.85, 0.93],
    baseEarly: [2.2, 1.6, 1.3, 1.1],
    openRate: 1.45, openCap: 2, openHp: 1, openUntil: 180, openFade: 120,
    /* Health by stage, for the rank and file (bosses, lords and field Megas are untouched). Babies
     * take two hits from a fresh partner (one once its damage is up by about a third), In-Training two or three, and each stage up asks for more. */
    stageHp: { "Baby I": 0.37, "Baby II (In-Training)": 0.38, "Child (Rookie)": 0.5, "Adult (Champion)": 0.65, "Armor": 0.65, "Perfect (Ultimate)": 0.33, "Ultimate (Mega)": 0.7, "Ultimate (Mega+)": 0.7 },
    /* The field stays on Ultimates from minute 24 to 72 while the partner keeps growing, so
     * Ultimates toughen over that stretch (x1 at `from` minutes, + perMin a minute, up to max). */
    lateHp: { "Perfect (Ultimate)": { from: 24, perMin: 0.025, max: 2.5 } },
    /* Enemy health against the clock, sized to what a build with its status points spent can do
     * (ro-stats.js): [minute, multiplier]. It does not look at the player: spend the points and the
     * table above holds; leave them and everything takes about 1.5x the hits by the Champion era
     * and more than twice by the Ultimate era. Bosses and lords included; swarm Babies are not. */
    buildHp: [[0, 1], [4, 1.1], [9, 1.25], [15, 1.5], [22, 1.8], [32, 2.15], [50, 2.6], [80, 3.2]],
    followPartner: false,                      /* the field's stage follows the clock only; it used to wait for the partner to digivolve */
    belowShare: 0.4,                           /* how much of the field is the stage below (was 0.2): little ones to cut through */
    group: { min: 3, max: 4, spread: 44 },
    magnetRadius: 125, magnetSpeed: 430, levelMagnet: 650, xpOrbScale: 1.35,
    driftReach: 2.5, driftSpeed: 38,        /* drops within 2.5x the magnet reach drift toward the nearest tamer at this pace (17z33) */
  };

  var LEASH = {
    offsetBehind: 40,
    /* the partner fights close to its tamer, so where you run matters */
    roamRadius: 130,
    returnRadius: 175,
    /* it walks toward the nearest wild Digimon only if that one is within this of the tamer
     * (about a third of the screen across). Before Nov 17 there was no limit: it strained
     * toward whatever was nearest, however far. A clicked target is not limited by this. */
    seekRadius: 300,
    holdRange: 52,
    feedRadius: 46,
    fieldFeedRadius: 64,
    goRadius: 300,   /* how far from the tamer a click can send the partner */
    goHold: 0.75,    /* seconds it waits there before fighting on its own again */
    unstick: 18
  };

  var FAINT = {
    duration: 3.2,
    joyLoss: 18,
    reviveHpRatio: 0.22
  };

  var NEGLECT = {
    hungryFullness: 40,
    starvingFullness: 18,
    sadHappiness: 40,
    miserableHappiness: 20,
    hungry:    { move: 0.86, fire: 0.9,  acquire: 0.75 },
    starving:  { move: 0.64, fire: 0.72, acquire: 0.5 },
    sad:       { move: 0.9,  fire: 1,    acquire: 0.85 },
    miserable: { move: 0.78, fire: 1,    acquire: 0.65 }
  };

  /* Happiness combat tiers. Threshold is inclusive minimum. */
  var HAPPINESS_TIERS = [
    { min: 90, id: "joyful", name: "Joyful", fireRate: 1.35, extraShots: 1, damage: 1.1 },
    { min: 70, id: "happy", name: "Happy", fireRate: 1.2, extraShots: 1, damage: 1.0 },
    { min: 40, id: "content", name: "Content", fireRate: 1.1, extraShots: 0, damage: 1.0 },
    { min: 20, id: "unhappy", name: "Unhappy", fireRate: 1.0, extraShots: 0, damage: 1.0 },
    { min: 0, id: "miserable", name: "Miserable", fireRate: 0.88, extraShots: 0, damage: 0.9 }
  ];

  var WEAPONS = {
    pepperBreath: {
      id: "pepperBreath",
      name: "Pepper Breath",
      type: "projectile",
      maxLevel: 5,
      color: "#ff8a2a",
      glow: "#ffd27a",
      summary: "Hurls small fireballs at the nearest foe.",
      levels: [
        { damage: 14, cooldown: 0.7, count: 1, speed: 340, pierce: 0, radius: 6, spread: 0.16, knockback: 40 },
        { damage: 18, cooldown: 0.62, count: 1, speed: 360, pierce: 0, radius: 7, spread: 0.16, knockback: 45 },
        { damage: 22, cooldown: 0.56, count: 2, speed: 380, pierce: 1, radius: 7, spread: 0.2, knockback: 50 },
        { damage: 28, cooldown: 0.5, count: 2, speed: 400, pierce: 1, radius: 8, spread: 0.22, knockback: 55 },
        { damage: 36, cooldown: 0.44, count: 3, speed: 430, pierce: 2, radius: 9, spread: 0.24, knockback: 60 }
      ]
    },
    fireAura: {
      id: "fireAura",
      name: "Fire Aura",
      type: "aura",
      maxLevel: 5,
      color: "#ff5a1a",
      glow: "#ffb040",
      summary: "A burning ring that scorches anything nearby.",
      levels: [
        { damage: 8, cooldown: 0.45, radius: 52 },
        { damage: 11, cooldown: 0.4, radius: 62 },
        { damage: 15, cooldown: 0.36, radius: 74 },
        { damage: 20, cooldown: 0.32, radius: 88 },
        { damage: 28, cooldown: 0.28, radius: 104 }
      ]
    },
    orbitShield: {
      id: "orbitShield",
      name: "Brave Orbit",
      type: "orbit",
      maxLevel: 5,
      color: "#7ecbff",
      glow: "#d4f0ff",
      summary: "Shield orbs circle you and smash into enemies.",
      levels: [
        { damage: 12, cooldown: 0.28, count: 1, radius: 44, size: 8, spin: 2.4 },
        { damage: 15, cooldown: 0.26, count: 2, radius: 48, size: 8, spin: 2.5 },
        { damage: 19, cooldown: 0.24, count: 2, radius: 54, size: 9, spin: 2.7 },
        { damage: 24, cooldown: 0.22, count: 3, radius: 60, size: 10, spin: 2.9 },
        { damage: 32, cooldown: 0.2, count: 4, radius: 68, size: 11, spin: 3.2 }
      ]
    },
    clawArc: {
      id: "clawArc",
      name: "Sharp Claw",
      type: "arc",
      maxLevel: 5,
      color: "#ffd36a",
      glow: "#fff3c0",
      summary: "A sweeping claw slash in the direction you face.",
      levels: [
        { damage: 22, cooldown: 1.05, range: 58, arc: 0.95, duration: 0.16, knockback: 90 },
        { damage: 28, cooldown: 0.95, range: 66, arc: 1.05, duration: 0.17, knockback: 100 },
        { damage: 36, cooldown: 0.86, range: 74, arc: 1.15, duration: 0.18, knockback: 110 },
        { damage: 46, cooldown: 0.78, range: 84, arc: 1.25, duration: 0.2, knockback: 125 },
        { damage: 60, cooldown: 0.7, range: 96, arc: 1.4, duration: 0.22, knockback: 140 }
      ]
    },
    megaFlame: {
      id: "megaFlame",
      name: "Mega Flame",
      type: "projectile",
      maxLevel: 5,
      signature: true,
      color: "#ff4d1a",
      glow: "#ffcf6b",
      summary: "Greymon's heavy fireball. Hits hard and punches through.",
      levels: [
        { damage: 34, cooldown: 1.15, count: 1, speed: 300, pierce: 2, radius: 12, spread: 0.1, knockback: 80 },
        { damage: 42, cooldown: 1.05, count: 1, speed: 320, pierce: 3, radius: 13, spread: 0.1, knockback: 90 },
        { damage: 52, cooldown: 0.95, count: 2, speed: 340, pierce: 3, radius: 14, spread: 0.18, knockback: 100 },
        { damage: 64, cooldown: 0.88, count: 2, speed: 360, pierce: 4, radius: 15, spread: 0.2, knockback: 110 },
        { damage: 80, cooldown: 0.8, count: 3, speed: 380, pierce: 5, radius: 16, spread: 0.22, knockback: 120 }
      ]
    },
    gigaDestroyer: {
      id: "gigaDestroyer",
      name: "Giga Destroyer",
      type: "missile",
      maxLevel: 5,
      signature: true,
      color: "#5ad0ff",
      glow: "#b8f0ff",
      summary: "Homing organic missiles from MetalGreymon's chest cannons.",
      levels: [
        { damage: 28, cooldown: 1.35, count: 2, speed: 240, pierce: 0, radius: 8, homing: 5.5, knockback: 50, life: 1.8 },
        { damage: 34, cooldown: 1.22, count: 2, speed: 260, pierce: 0, radius: 8, homing: 6, knockback: 55, life: 1.9 },
        { damage: 42, cooldown: 1.1, count: 3, speed: 280, pierce: 1, radius: 9, homing: 6.5, knockback: 60, life: 2.0 },
        { damage: 52, cooldown: 1.0, count: 3, speed: 300, pierce: 1, radius: 10, homing: 7, knockback: 70, life: 2.1 },
        { damage: 66, cooldown: 0.9, count: 4, speed: 320, pierce: 1, radius: 11, homing: 7.5, knockback: 80, life: 2.2 }
      ]
    },
    terraForce: {
      id: "terraForce",
      name: "Terra Force",
      type: "nova",
      maxLevel: 5,
      signature: true,
      color: "#ffd200",
      glow: "#fff4a0",
      summary: "WarGreymon gathers a sun and hurls it. Explodes on impact.",
      levels: [
        { damage: 70, cooldown: 2.4, count: 1, speed: 210, radius: 16, explode: 70, knockback: 140, life: 2.2 },
        { damage: 85, cooldown: 2.2, count: 1, speed: 220, radius: 18, explode: 82, knockback: 150, life: 2.3 },
        { damage: 105, cooldown: 2.0, count: 1, speed: 230, radius: 20, explode: 96, knockback: 160, life: 2.4 },
        { damage: 130, cooldown: 1.85, count: 1, speed: 240, radius: 22, explode: 110, knockback: 170, life: 2.5 },
        { damage: 160, cooldown: 1.7, count: 1, speed: 250, radius: 24, explode: 128, knockback: 180, life: 2.6 }
      ]
    },
    sludgeToss: {
      id: "sludgeToss",
      name: "Sludge Toss",
      type: "projectile",
      maxLevel: 5,
      signature: true,
      color: "#b6d94c",
      glow: "#e8ff8a",
      summary: "Numemon's messy lob. Slow, but it sticks and splatters.",
      levels: [
        { damage: 16, cooldown: 1.1, count: 1, speed: 220, pierce: 0, radius: 10, spread: 0.2, knockback: 30, slow: 0.7, slowTime: 0.8 },
        { damage: 20, cooldown: 1.0, count: 2, speed: 230, pierce: 0, radius: 11, spread: 0.25, knockback: 34, slow: 0.65, slowTime: 0.9 },
        { damage: 26, cooldown: 0.9, count: 2, speed: 240, pierce: 1, radius: 12, spread: 0.28, knockback: 38, slow: 0.6, slowTime: 1.0 },
        { damage: 32, cooldown: 0.82, count: 3, speed: 250, pierce: 1, radius: 13, spread: 0.3, knockback: 42, slow: 0.55, slowTime: 1.1 },
        { damage: 40, cooldown: 0.74, count: 3, speed: 260, pierce: 1, radius: 14, spread: 0.32, knockback: 46, slow: 0.5, slowTime: 1.2 }
      ]
    },
    blueBlaster: {
      id: "blueBlaster",
      name: "Blue Blaster",
      type: "projectile",
      maxLevel: 5,
      color: "#4aa7ff",
      glow: "#b8e0ff",
      summary: "A freezing burst of blue flame at the nearest foe.",
      levels: [
        { damage: 13, cooldown: 0.72, count: 1, speed: 350, pierce: 0, radius: 6, spread: 0.14, knockback: 38 },
        { damage: 17, cooldown: 0.64, count: 1, speed: 370, pierce: 0, radius: 7, spread: 0.14, knockback: 42 },
        { damage: 21, cooldown: 0.56, count: 2, speed: 390, pierce: 1, radius: 7, spread: 0.2, knockback: 48 },
        { damage: 27, cooldown: 0.5, count: 2, speed: 410, pierce: 1, radius: 8, spread: 0.22, knockback: 52 },
        { damage: 34, cooldown: 0.44, count: 3, speed: 430, pierce: 2, radius: 9, spread: 0.24, knockback: 58 }
      ]
    },
    howlingBlaster: {
      id: "howlingBlaster",
      name: "Howling Blaster",
      type: "projectile",
      maxLevel: 5,
      signature: true,
      color: "#7ecbff",
      glow: "#e8f6ff",
      summary: "Garurumon's blue fire stream. Fast and piercing.",
      levels: [
        { damage: 30, cooldown: 1.05, count: 1, speed: 420, pierce: 3, radius: 10, spread: 0.08, knockback: 70 },
        { damage: 38, cooldown: 0.95, count: 1, speed: 440, pierce: 3, radius: 11, spread: 0.08, knockback: 80 },
        { damage: 48, cooldown: 0.86, count: 2, speed: 460, pierce: 4, radius: 12, spread: 0.16, knockback: 90 },
        { damage: 60, cooldown: 0.78, count: 2, speed: 480, pierce: 4, radius: 13, spread: 0.18, knockback: 100 },
        { damage: 76, cooldown: 0.7, count: 3, speed: 500, pierce: 5, radius: 14, spread: 0.2, knockback: 110 }
      ]
    },
    wolfClaw: {
      id: "wolfClaw",
      name: "Wolf Claw",
      type: "arc",
      maxLevel: 5,
      signature: true,
      color: "#c9e8ff",
      glow: "#ffffff",
      summary: "WereGarurumon's wide freezing slash.",
      levels: [
        { damage: 40, cooldown: 0.95, range: 70, arc: 1.2, duration: 0.18, knockback: 120 },
        { damage: 50, cooldown: 0.86, range: 78, arc: 1.28, duration: 0.19, knockback: 130 },
        { damage: 64, cooldown: 0.78, range: 88, arc: 1.36, duration: 0.2, knockback: 140 },
        { damage: 80, cooldown: 0.7, range: 98, arc: 1.45, duration: 0.21, knockback: 155 },
        { damage: 100, cooldown: 0.64, range: 110, arc: 1.55, duration: 0.22, knockback: 170 }
      ]
    },
    gracefulCannon: {
      id: "gracefulCannon",
      name: "Graceful Cannon",
      type: "missile",
      maxLevel: 5,
      signature: true,
      color: "#9ad8ff",
      glow: "#ffffff",
      summary: "MetalGarurumon's homing beam-missiles.",
      levels: [
        { damage: 32, cooldown: 1.2, count: 3, speed: 300, pierce: 0, radius: 7, homing: 7, knockback: 55, life: 1.9 },
        { damage: 40, cooldown: 1.1, count: 3, speed: 320, pierce: 1, radius: 8, homing: 7.4, knockback: 60, life: 2.0 },
        { damage: 50, cooldown: 1.0, count: 4, speed: 340, pierce: 1, radius: 8, homing: 7.8, knockback: 70, life: 2.1 },
        { damage: 64, cooldown: 0.9, count: 4, speed: 360, pierce: 1, radius: 9, homing: 8.2, knockback: 80, life: 2.2 },
        { damage: 80, cooldown: 0.82, count: 5, speed: 380, pierce: 2, radius: 10, homing: 8.6, knockback: 90, life: 2.3 }
      ]
    },
    bubbleBlow: {
      id: "bubbleBlow",
      name: "Bubble Blow",
      type: "projectile",
      maxLevel: 3,
      color: "#c8f0ff",
      glow: "#ffffff",
      summary: "A short-range bubble spit. Weak, but it is a start.",
      levels: [
        { damage: 6, cooldown: 1.15, count: 1, speed: 200, pierce: 0, radius: 5, spread: 0.1, knockback: 16, life: 0.42 },
        { damage: 8, cooldown: 1.05, count: 1, speed: 210, pierce: 0, radius: 5, spread: 0.1, knockback: 18, life: 0.46 },
        { damage: 10, cooldown: 0.95, count: 1, speed: 220, pierce: 0, radius: 6, spread: 0.12, knockback: 20, life: 0.5 }
      ]
    },
    spitFire: {
      id: "spitFire",
      name: "Spit Fire",
      type: "projectile",
      maxLevel: 3,
      color: "#ff9a3a",
      glow: "#ffd27a",
      summary: "Koromon's tiny fire spit. Close range and modest punch.",
      levels: [
        { damage: 9, cooldown: 0.95, count: 1, speed: 240, pierce: 0, radius: 5, spread: 0.12, knockback: 22, life: 0.52 },
        { damage: 12, cooldown: 0.88, count: 1, speed: 255, pierce: 0, radius: 6, spread: 0.12, knockback: 26, life: 0.56 },
        { damage: 15, cooldown: 0.8, count: 1, speed: 270, pierce: 0, radius: 6, spread: 0.14, knockback: 30, life: 0.6 }
      ]
    },
    frostyBubbles: {
      id: "frostyBubbles",
      name: "Frosty Bubbles",
      type: "projectile",
      maxLevel: 3,
      color: "#9ad8ff",
      glow: "#e8f6ff",
      summary: "Tsunomon's chilly bubble spit. Short and sharp.",
      levels: [
        { damage: 9, cooldown: 0.95, count: 1, speed: 240, pierce: 0, radius: 5, spread: 0.12, knockback: 22, life: 0.52 },
        { damage: 12, cooldown: 0.88, count: 1, speed: 255, pierce: 0, radius: 6, spread: 0.12, knockback: 26, life: 0.56 },
        { damage: 15, cooldown: 0.8, count: 1, speed: 270, pierce: 0, radius: 6, spread: 0.14, knockback: 30, life: 0.6 }
      ]
    }
  };

  var STAT_UPGRADES = {
    speed: {
      id: "speed",
      name: "Speed Up",
      summary: "Move 12% faster.",
      maxLevel: 5,
      apply: function (stats, level) {
        stats.speedMul *= 1.12;
      }
    },
    magnet: {
      id: "magnet",
      name: "Magnet Field",
      summary: "Pull XP and snacks from farther away.",
      maxLevel: 5,
      apply: function (stats, level) {
        stats.magnetMul *= 1.22;
      }
    },
    maxHp: {
      id: "maxHp",
      name: "Vital Boost",
      summary: "Raise max Health and heal a little.",
      maxLevel: 5,
      apply: function (stats, level) {
        stats.maxHpMul *= 1.16;
        stats.healOnTake = 0.2;
      }
    },
    damage: {
      id: "damage",
      name: "Power Up",
      summary: "All attacks deal 14% more damage.",
      maxLevel: 5,
      apply: function (stats, level) {
        stats.damageMul *= 1.14;
      }
    },
    cooldown: {
      id: "cooldown",
      name: "Quick Claws",
      summary: "Weapons fire 10% more often.",
      maxLevel: 5,
      apply: function (stats, level) {
        stats.cooldownMul *= 0.9;
      }
    }
  };

  /* Evolution rules:
   * to: form id
   * minLevel, minFood (meals eaten), minHappiness, minHpRatio
   * optional: kind "neglect" | "recover" | "standard"
   */
  var SPECIES = {
    digitama_agumon: {
      id: "digitama_agumon",
      name: "Digitama",
      stage: "Egg",
      line: "agumon",
      color: "#e88928",
      belly: "#f3ddb0",
      radius: 10,
      base: { maxHp: 70, speed: 42, magnet: 70, damage: 1 },
      startWeapon: null,
      eggFrame: "egg_08",
      hatchTo: "botamon",
      evolutions: []
    },
    digitama_gabumon: {
      id: "digitama_gabumon",
      name: "Digitama",
      stage: "Egg",
      line: "gabumon",
      color: "#4aa7ff",
      belly: "#e8f0ff",
      radius: 10,
      base: { maxHp: 70, speed: 42, magnet: 70, damage: 1 },
      startWeapon: null,
      eggFrame: "egg_09",
      hatchTo: "punimon",
      evolutions: []
    },
    botamon: {
      id: "botamon",
      name: "Botamon",
      stage: "Baby",
      line: "agumon",
      color: "#2a2a30",
      belly: "#f0e8c0",
      radius: 8,
      base: { maxHp: 62, speed: 108, magnet: 74, damage: 0.7 },
      startWeapon: "bubbleBlow",
      evolutions: [
        { to: "koromon", kind: "standard", minLevel: 2, minFood: 2, minHappiness: 35, minHpRatio: 0.3 }
      ]
    },
    koromon: {
      id: "koromon",
      name: "Koromon",
      stage: "In-Training",
      line: "agumon",
      color: "#e87880",
      belly: "#f3ddb0",
      radius: 9,
      base: { maxHp: 82, speed: 124, magnet: 80, damage: 0.85 },
      startWeapon: "spitFire",
      evolutions: [
        { to: "agumon", kind: "standard", minLevel: 4, minFood: 5, minHappiness: 45, minHpRatio: 0.35 }
      ]
    },
    punimon: {
      id: "punimon",
      name: "Punimon",
      stage: "Baby",
      line: "gabumon",
      color: "#e06078",
      belly: "#f8d0d8",
      radius: 8,
      base: { maxHp: 62, speed: 108, magnet: 74, damage: 0.7 },
      startWeapon: "bubbleBlow",
      evolutions: [
        { to: "tsunomon", kind: "standard", minLevel: 2, minFood: 2, minHappiness: 35, minHpRatio: 0.3 }
      ]
    },
    tsunomon: {
      id: "tsunomon",
      name: "Tsunomon",
      stage: "In-Training",
      line: "gabumon",
      color: "#e8d0a0",
      belly: "#f4e8c8",
      radius: 9,
      base: { maxHp: 82, speed: 126, magnet: 80, damage: 0.85 },
      startWeapon: "frostyBubbles",
      evolutions: [
        { to: "gabumon", kind: "standard", minLevel: 4, minFood: 5, minHappiness: 45, minHpRatio: 0.35 }
      ]
    },
    agumon: {
      id: "agumon",
      name: "Agumon",
      stage: "Rookie",
      line: "agumon",
      starter: true,
      color: "#f0a030",
      belly: "#f3ddb0",
      radius: 16,
      base: { maxHp: 110, speed: 150, magnet: 86, damage: 1 },
      startWeapon: "pepperBreath",
      evolutions: [
        {
          to: "greymon",
          kind: "standard",
          minLevel: 8,
          minFood: 15,
          minHappiness: 55,
          minHpRatio: 0.4
        },
        {
          to: "numemon",
          kind: "neglect",
          minLevel: 8,
          maxFood: 7,
          maxHappiness: 25,
          minHpRatio: 0
        }
      ]
    },
    greymon: {
      id: "greymon",
      name: "Greymon",
      stage: "Champion",
      line: "agumon",
      color: "#e88928",
      belly: "#f0d7a4",
      radius: 22,
      base: { maxHp: 160, speed: 145, magnet: 94, damage: 1.15 },
      signatureWeapon: "megaFlame",
      evolutions: [
        {
          to: "metalgreymon",
          kind: "standard",
          minLevel: 15,
          minFood: 40,
          minHappiness: 65,
          minHpRatio: 0.5
        }
      ]
    },
    metalgreymon: {
      id: "metalgreymon",
      name: "MetalGreymon",
      stage: "Ultimate",
      color: "#c45a3a",
      belly: "#6a7a88",
      radius: 26,
      base: { maxHp: 220, speed: 148, magnet: 102, damage: 1.3 },
      signatureWeapon: "gigaDestroyer",
      evolutions: [
        {
          to: "wargreymon",
          kind: "standard",
          minLevel: 22,
          minFood: 75,
          minHappiness: 75,
          minHpRatio: 0.6
        }
      ]
    },
    wargreymon: {
      id: "wargreymon",
      name: "WarGreymon",
      stage: "Mega",
      color: "#e8a020",
      belly: "#f3e2b0",
      radius: 26,
      base: { maxHp: 280, speed: 160, magnet: 114, damage: 1.5 },
      signatureWeapon: "terraForce",
      evolutions: []
    },
    numemon: {
      id: "numemon",
      name: "Numemon",
      stage: "Champion",
      color: "#7a5aa0",
      belly: "#c9b07a",
      radius: 20,
      base: { maxHp: 140, speed: 120, magnet: 90, damage: 0.85 },
      signatureWeapon: "sludgeToss",
      evolutions: [
        {
          to: "greymon",
          kind: "recover",
          minLevel: 10,
          minFood: 22,
          minHappiness: 70,
          minHpRatio: 0.5
        }
      ]
    },
    gabumon: {
      id: "gabumon",
      name: "Gabumon",
      stage: "Rookie",
      line: "gabumon",
      starter: true,
      unlock: { type: "evolveTo", form: "greymon", alsoTime: 180 },
      unlockHint: "Evolve Agumon into Greymon, or survive 3:00 in a single run.",
      color: "#d8dce8",
      belly: "#f0c878",
      radius: 16,
      base: { maxHp: 108, speed: 152, magnet: 86, damage: 1 },
      startWeapon: "blueBlaster",
      evolutions: [
        {
          to: "garurumon",
          kind: "standard",
          minLevel: 8,
          minFood: 15,
          minHappiness: 55,
          minHpRatio: 0.4
        },
        {
          to: "numemon",
          kind: "neglect",
          minLevel: 8,
          maxFood: 7,
          maxHappiness: 25,
          minHpRatio: 0
        }
      ]
    },
    garurumon: {
      id: "garurumon",
      name: "Garurumon",
      stage: "Champion",
      line: "gabumon",
      color: "#f4f6fa",
      belly: "#3a4a6a",
      radius: 22,
      base: { maxHp: 155, speed: 165, magnet: 94, damage: 1.15 },
      signatureWeapon: "howlingBlaster",
      evolutions: [
        {
          to: "weregarurumon",
          kind: "standard",
          minLevel: 15,
          minFood: 40,
          minHappiness: 65,
          minHpRatio: 0.5
        }
      ]
    },
    weregarurumon: {
      id: "weregarurumon",
      name: "WereGarurumon",
      stage: "Ultimate",
      color: "#e8ecf4",
      belly: "#2a3548",
      radius: 24,
      base: { maxHp: 210, speed: 170, magnet: 102, damage: 1.3 },
      signatureWeapon: "wolfClaw",
      evolutions: [
        {
          to: "metalgarurumon",
          kind: "standard",
          minLevel: 22,
          minFood: 75,
          minHappiness: 75,
          minHpRatio: 0.6
        }
      ]
    },
    metalgarurumon: {
      id: "metalgarurumon",
      name: "MetalGarurumon",
      stage: "Mega",
      color: "#b8c4d4",
      belly: "#6aa0d0",
      radius: 26,
      base: { maxHp: 270, speed: 175, magnet: 114, damage: 1.5 },
      signatureWeapon: "gracefulCannon",
      evolutions: []
    }
  };

  var STARTERS = ["agumon", "gabumon"];

  /* Egg-pick options. `line` matches SPECIES.line and the rookie id. */
  var EGGS = [
    { id: "agumon", name: "Agumon Line", egg: "digitama_agumon", hatch: "botamon", frame: "egg_08", blurb: "Hatches into Botamon, then Koromon, then Agumon." },
    { id: "gabumon", name: "Gabumon Line", egg: "digitama_gabumon", hatch: "punimon", frame: "egg_09", blurb: "Hatches into Punimon, then Tsunomon, then Gabumon." }
  ];

  /* The egg always hatches at exactly `time` seconds (no shortcuts).
   * No enemies spawn until `enemyLead` seconds before the hatch, then the
   * opening wave floods in (`openingFlood` Pagumon). */
  var HATCH = {
    time: 8,             /* Nov 20: 8 s, the same as a respawned egg (RESPAWN.hatchSec) */
    enemyLead: 1,
    openingFlood: 4,
    feedBonus: 0,
    protectBonus: 0,
    protectRadius: 90
  };

  /* Hold-E rescue. Solo mode (starting party size 1) gets one self-revive
   * charge per round after a terminal death. Party mode (humans + configured
   * CPU teammates >= 2 at start) is teammate-only, needs 2 living, no self
   * or last-survivor exception. */
  var PARTY_REVIVE = {
    hold: 3,
    radius: 80,
    hpRatio: 0.4,
    tamerHpRatio: 0.5,
    minLiving: 2
  };

  /* Mission weather (the list of skies and their numbers) lives in js/weather.js. */

  var LINES = {
    agumon: { egg: "digitama_agumon", baby: "botamon", training: "koromon", rookie: "agumon", champion: "greymon" },
    gabumon: { egg: "digitama_gabumon", baby: "punimon", training: "tsunomon", rookie: "gabumon", champion: "garurumon" }
  };

  var ENEMIES = {
    pagumon: {
      id: "pagumon",
      name: "Pagumon",
      role: "swarm",
      color: "#c9b7e8",
      accent: "#4a3560",
      radius: 11,
      hp: 18,
      speed: 108,
      damage: 8,
      xp: 3,
      contactCd: 0.55
    },
    gazimon: {
      id: "gazimon",
      name: "Gazimon",
      role: "bruiser",
      color: "#c4a06a",
      accent: "#3a2a18",
      radius: 15,
      hp: 48,
      speed: 78,
      damage: 14,
      xp: 7,
      contactCd: 0.6
    },
    demidevimon: {
      id: "demidevimon",
      name: "DemiDevimon",
      role: "fast",
      color: "#6a6a8a",
      accent: "#e8e8f0",
      radius: 13,
      hp: 32,
      speed: 128,
      damage: 12,
      xp: 8,
      contactCd: 0.5,
      fly: true
    },
    kuwagamon: {
      id: "kuwagamon",
      name: "Kuwagamon",
      role: "boss",
      color: "#c43a3a",
      accent: "#2a1010",
      radius: 34,
      hp: 520,
      speed: 70,
      damage: 24,
      xp: 60,
      contactCd: 0.7,
      elite: true,
      boss: true
    }
  };

  /* Wave timeline: at `at` seconds, these spawn rates (seconds per spawn) apply.
   * Later entries replace earlier ones. Bosses use `bossEvery` after `bossAt`.
   */
  var WAVES = [
    { at: 0, rates: { pagumon: 2.2 }, cap: 6, hpMul: 0.75, dmgMul: 0.7, spdMul: 0.9 },
    { at: 24, rates: { pagumon: 1.25 }, cap: 12, hpMul: 0.85, dmgMul: 0.85, spdMul: 0.95 },
    { at: 50, rates: { pagumon: 0.7, gazimon: 2.8 }, cap: 28, hpMul: 1, dmgMul: 1, spdMul: 1 },
    { at: 90, rates: { pagumon: 0.55, gazimon: 1.8, demidevimon: 2.4 }, cap: 52, hpMul: 1.35, dmgMul: 1.12, spdMul: 1.08 },
    { at: 150, rates: { pagumon: 0.42, gazimon: 1.3, demidevimon: 1.6 }, cap: 64, hpMul: 1.6, dmgMul: 1.2, spdMul: 1.12 },
    { at: 240, rates: { pagumon: 0.32, gazimon: 0.95, demidevimon: 1.15 }, cap: 76, hpMul: 2.0, dmgMul: 1.3, spdMul: 1.16 },
    { at: 360, rates: { pagumon: 0.26, gazimon: 0.75, demidevimon: 0.9 }, cap: 88, hpMul: 2.6, dmgMul: 1.42, spdMul: 1.2 }
  ];

  var BOSSES = { firstAt: 75, every: 90, type: "kuwagamon", hpScalePer: 0.45 };

  /* Rare late-game field Megas (not bosses). Tunable. Challenge in late waves should come from Ultimates, not Mega density. */
  var MEGA_SPAWN = {
    /* Field Megas (the big roaming ones). Really rare for the first three
     * years: from Winter of Year 1 one may show up once a season. From Year 4
     * (72 min) they come often, two at a time. Always brutal. */
    firstAt: 1080,
    rareUntil: 4320,
    rareEvery: 360,
    rareChance: 0.3,
    interval: 40,
    cooldown: 55,
    maxOnScreen: 2,
    hpMul: 9,
    dmgMul: 1.6,
    spdMul: 1.08,
    includeMegaPlus: true
  };

  /* Slow, deliberate leveling (Nov 13): the curve is much steeper than
   * a typical survivors game so each level — and each evolution — is earned. */
  var XP = {
    base: 9,
    power: 1.78,
    orbValue: 4,
    debugXpMul: 12
  };

  /* Hit knockback: every hit gives the enemy a short shove away from the
   * attack. `scale` turns a weapon's knockback value into launch speed;
   * the shove eases out over ~0.2s. Bosses and Megas are much heavier. */
  var KNOCKBACK = { scale: 22, min: 10, decay: 11, bossMul: 0.3, megaMul: 0.15, eliteMul: 0.6, maxSpeed: 520, stun: 0.12,
    /* Push strength by the attacker's stage: Baby, In-Training, Rookie,
     * Champion, Ultimate, Mega. Weak at first, grows as you evolve. */
    stageMul: [0.3, 0.5, 0.75, 1.0, 1.25, 1.5] };

  var PLAYER = {
    pickupRadius: 18,
    iFrame: 0.7,
    /* No health comes back on its own (restRegen 0; it was 3% a second after 3 s
     * without a hit). Healing is food, the farm, drops, the Recovery skill
     * (skill-tree.js "rg") and a Water ally's passive. */
    restAfter: 3,
    restRegen: 0,
    invulnFlash: 0.08
  };

  var SAVE_KEY = "dbh_save_v1";

  var PALETTE = {
    ink: "#1a1230",
    night: "#071224",
    bg0: "#0c1c28",
    bg1: "#10261e",
    teal: "#34c8c0",
    mint: "#7cf0c0",
    gold: "#f0c020",
    orange: "#f07818",
    fire: "#ff6030",
    cream: "#ffe9b8",
    grid: "rgba(52,200,192,0.10)",
    xp: "#7cf0c0",
    meat: "#e85a4a",
    toy: "#ffb0e0",
    hud: "#e8f0f8"
  };

  var FX = {
    particleCap: 220,
    particleCapLow: 70,
    trailInterval: 0.028
  };

  function xpForLevel(level) {
    var early = PACING.jobEarly[(level | 0) - 1];
    return Math.max(1, Math.round((XP.base * Math.pow(level, XP.power) + 8 * level) * (early || 1)));
  }

  function happinessTier(value) {
    var i;
    for (i = 0; i < HAPPINESS_TIERS.length; i++) {
      if (value >= HAPPINESS_TIERS[i].min) return HAPPINESS_TIERS[i];
    }
    return HAPPINESS_TIERS[HAPPINESS_TIERS.length - 1];
  }

  function waveAt(time) {
    var found = WAVES[0];
    var i;
    for (i = 0; i < WAVES.length; i++) {
      if (time >= WAVES[i].at) found = WAVES[i];
    }
    return found;
  }

  global.DBH = {
    CARE: CARE,
    HAPPINESS_TIERS: HAPPINESS_TIERS,
    WEAPONS: WEAPONS,
    STAT_UPGRADES: STAT_UPGRADES,
    SPECIES: SPECIES,
    STARTERS: STARTERS,
    EGGS: EGGS,
    HATCH: HATCH,
    PARTY_REVIVE: PARTY_REVIVE,
    LINES: LINES,
    ENEMIES: ENEMIES,
    WAVES: WAVES,
    BOSSES: BOSSES,
    MEGA_SPAWN: MEGA_SPAWN,
    XP: XP,
    PLAYER: PLAYER,
    KNOCKBACK: KNOCKBACK,
    TAMER: TAMER,
    FOOD: FOOD,
    rollFoodKind: rollFoodKind,
    CROPS: CROPS,
    CROP_ORDER: CROP_ORDER,
    SEED_DROP: SEED_DROP,
    seedId: seedId,
    cropOfSeed: cropOfSeed,
    isSeed: isSeed,
    rollSeedKind: rollSeedKind,
    DIET: DIET,
    dietOf: dietOf,
    gardenPlots: gardenPlots,
    cropStage: cropStage,
    LEASH: LEASH,
    PACING: PACING,
    LEVEL_PAUSE: LEVEL_PAUSE,
    SKILL_CARDS: SKILL_CARDS,
    TERRAIN: TERRAIN,
    STORM: STORM,
    LIVING: LIVING,
    NESTS: NESTS,
    LEVELS: LEVELS,
    MODES: MODES,
    RESPAWN: RESPAWN,
    BOUNTY: BOUNTY,
    NEMESIS: NEMESIS,
    FACTIONS: FACTIONS,
    PVP: PVP,
    ALLY_GROWTH: ALLY_GROWTH,
    WAR: WAR,
    RIVAL: RIVAL,
    VIRUS: VIRUS,
    RANK: RANK,
    LAB: LAB,
    MEMORY: MEMORY,
    ITEMS: ITEMS,
    TROPHY: TROPHY,
    GRASSFIRE: GRASSFIRE,
    STATUS: STATUS,
    LORD: LORD,
    REGION: REGION,
    ALLY: ALLY,
    SHINY: SHINY,
    BURST: BURST,
    LAVA: LAVA,
    PACKS: PACKS,
    FAINT: FAINT,
    NEGLECT: NEGLECT,
    SAVE_KEY: SAVE_KEY,
    PALETTE: PALETTE,
    FX: FX,
    xpForLevel: xpForLevel,
    happinessTier: happinessTier,
    waveAt: waveAt,
    /* End-of-round survivor brawl. everyLevels: 1 = after every level-up, 3 = every third. */
    /* What digivolving gives on the spot, per digivolution (hatching does
     * not count): attack, attack rate and partner speed, on top of the new
     * form's bigger health. */
    /* The tamer's (base) level: the same XP gems as the partner, `xpMul`
     * times the requirement (7 since Nov 18; it was 3.5). Status points and what the six stats do follow
     * the Ragnarok Online rules in js/ro-stats.js. Wiped when the run ends. */
    TAMER_LEVEL: { xpMul: 7, luckyEvoPer: 0.004, luckyEvoMax: 0.25 },
    /* Eggs beyond the five starters open by defeating that Baby in the wild:
     * `first` for the first egg won, `step` more for each one after. */
    EGG_UNLOCK: { first: 1000, step: 250, starters: ["agumon", "gabumon", "jyarimon", "chibomon", "poyomon"] },
    EVO_BOOST: { damage: 0.08, cooldown: 0.03, speed: 0.03, minHpRatio: 0.75, maxCount: 6 },
    /* Saying "not yet": the offer returns after this many levels, and each
     * wait hands out ONE of these at random. Small on purpose. */
    EVO_HOLD: {
      everyLevels: 5,
      perks: [
        { id: "tough", stat: "hp", mul: 1.05, label: "Tough: +5% health" },
        { id: "keen", stat: "dmg", mul: 1.04, label: "Keen: +4% attack" },
        { id: "quick", stat: "cd", mul: 0.97, label: "Quick: attacks 3% faster" },
        { id: "nimble", stat: "spd", mul: 1.04, label: "Nimble: +4% speed" },
        { id: "greedy", stat: "magnet", mul: 1.12, label: "Greedy: pulls drops from farther" }
      ]
    },
    /* Nov 21: no brawl screen, ever. PvP is the real-time fight out on the map (pvp-sim.js),
     * the same as meeting any other Digimon: you keep walking your tamer with WASD and your
     * partners just fight. The brawl code stays for its tests; nothing in a run starts one. */
    BRAWL_OFF: true,
    BRAWL_CFG: {
      everyLevels: 1,
      minLevel: 2,
      skipEgg: true,
      /* Dynamic party: 1..N humans + optional CPU. Default 0 bots — solo is the base game. */
      slots: null,
      botCount: 0,
      botCountMax: 5,
      partyCap: 6,
      maxPlayers: 6,
      soloMode: "skip", /* "skip" | "bonus" when fewer than 2 fighters */
      soloBonusSeconds: 12,
      oddsSeconds: 4.2,
      reviveSeconds: 2.4,
      resultSeconds: 3.2,
      maxFightSeconds: 40,
      arenaW: 720,
      arenaH: 520,
      arenaD: 520,
      baseHp: 96,
      baseDamage: 11,
      regenPerSec: 2.2,
      attackCd: 0.48,
      dashCd: 3.0,
      alwaysDownBots: 1
    },
    /* Digifarm intermission (ids 14, 17). Visit gaps are battle-time intervals 3, 6, 10, then +4 minutes — not absolute due-stamps at t=3/6/10. */
    FARM_CFG: {
      /* Nov 20: the farm is visited when you choose (the "Farm" button, G), not on a timer. The world
       * keeps going while you're there; you can't go with an enemy within blockRadius, and it takes
       * chargeSec of standing still to get there. You come back where you left. */
      onDemand: true, blockRadius: 380, chargeSec: 2, returnShield: 2,
      intervalMinutes: [3, 6, 10],
      intervalPlus: 4,
      stayCapSeconds: 120,
      warnAt: [15, 5],
      petJoy: 8,
      petRadius: 58,
      trainJoy: 6,
      trainBond: 10,
      trainCooldown: 0,   /* no wait between training sessions (Nov 18) */
      fullnessDecayPerSec: 0.85,
      hungerDrainMult: 0.05,
      careMistakeFullnessRatio: 0.30,
      careMistakeJoyHit: 8,
      careMistakeBondHit: 6,
      exitHungerPrompt: "icon",
      /* Enlarged fenced yard. Stations sit in the infield; the agility
       * track is a black ring just inside the fence (see farm.js trackGeom). */
      stations: {
        bag:   { id: "bag",   x: 260, y: 430, stat: "offense",       label: "Punching bag", gain: 12, diminish: 0.65, timeCost: 6, fullnessCost: 8, radius: 48 },
        board: { id: "board", x: 520, y: 250, stat: "intelligence",  label: "Chalkboard",    gain: 12, diminish: 0.65, timeCost: 6, fullnessCost: 6, radius: 48 },
        track: { id: "track", x: 1248, y: 420, cx: 660, cy: 420, rx: 588, ry: 328, width: 44, inset: 30, lapsTarget: 1.25, stat: "agility", label: "Running track", gain: 12, diminish: 0.65, timeCost: 8, fullnessCost: 8, radius: 36 },
        bond:  { id: "bond",  x: 1020, y: 480, stat: "bond",          label: "Play station",  gain: 10, diminish: 0.7,  timeCost: 8, fullnessCost: 0, radius: 54 }
      },
      /* Vegetable garden: plots in the south infield (see farm-art.js). */
      garden: { x: 494, y: 540, cols: 3, rows: 2, plotW: 96, plotH: 58, gapX: 22, gapY: 20, radius: 46 },
      yardW: 1320,
      yardH: 820,
      shed: { x: 800, y: 200, w: 140, h: 90 },
      heal: {
        hp: 0.2,
        tamerHp: 0.2,
        dropChance: 0.3,
        eliteChance: 0.6,
        bossChance: 1,
        worldEvery: 9
      }
    },
    /* Battle clock counts down, then up in red. Spawn ramp is overtime only. */
    /* The battle clock counts up from 0:00. Difficulty comes from the
     * seasons (js/seasons.js), not from an overtime ramp. */
    BATTLE_CFG: {
      countUp: true,
      duration: 600,
      overtime: false,
      overtimeRamp: 0,
      overtimeRampMax: 1
    },
    /* Persistent post-brawl currency (not the in-run Bits purse). */
    DIGIBITS: {
      name: "DigiBits",
      winReward: 8,
      betPool: 6,
      minBetPayout: 1
    },
    FARM_HUNGER_DRAIN_MULT: 0.05
  };
})(window);
