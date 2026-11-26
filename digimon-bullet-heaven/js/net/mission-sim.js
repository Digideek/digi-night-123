/* DOM-free mission simulation. Authority is the only legal mutator of
 * HP, enemy state, pickups, in-run bits, XP, and battle hunger.
 * No document, canvas, or audio. Runnable in the browser and in Node.
 */
(function (global) {
  "use strict";
  /* how far each equipped move is from ready, 0 (ready) to 1 (just used), for the move bar (17z33) */
  function wcOf(p) { var w = p.weapons || [], o = [], i; for (i = 0; i < w.length; i++) o.push(w[i].cdMax > 0 ? Math.round(100 * Math.max(0, Math.min(1, (w[i].cd || 0) / w[i].cdMax))) / 100 : 0); return o; }
  var isNode = typeof module === "object" && module.exports;
  var root = isNode ? global : window;
  var D = (root.DBH = root.DBH || {});
  if (isNode) {
    try { if (!(D.net && D.net.rarity)) require("./rarity-sim.js"); } catch (err) {}
    try { if (!D.partyRules) require("../party-rules.js"); } catch (err) {}
    try { if (!D.weather) require("../weather.js"); } catch (err) {}
  }
  function rarityApi() { return (D.net && D.net.rarity) || null; }
  function partyRules() { return D.partyRules || null; }
  function weatherApi() { return D.weather || null; }

  var ILLEGAL_TYPES = {
    damage: 1, hurt: 1, grant: 1, grantBits: 1, setBits: 1, setHp: 1,
    heal: 1, kill: 1, setXp: 1, setFullness: 1, currency: 1, bits: 1,
    xpDelta: 1, applyDamage: 1, pickup: 1
  };

  function mulberry(seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function len(x, y) { return Math.sqrt(x * x + y * y); }
  function dist2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  function hash01(str) { var h = 2166136261, i; str = String(str); for (i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; } return h / 4294967296; }
  function norm(x, y) { var l = len(x, y); return l < 1e-6 ? { x: 0, y: 0 } : { x: x / l, y: y / l }; }

  function defaults() {
    return {
      care: { fullnessDecayPerSec: 1.05, fullnessMax: 100, happinessMax: 100, hitHappinessLoss: 2, heavyHitHappinessLoss: 6, heavyHitRatio: 0.25, killStreakWindow: 4, killStreakEvery: 5, killStreakHappiness: 4, desperationHpRatio: 0.2, desperationHappinessDrain: 2, desperationDamageIn: 1, meatDropChance: 0.3, eliteMeatDropChance: 0.6, bossMeatDropChance: 1 },
      tamer: { speed: 168, radius: 10, iFrame: 0.6, maxHp: 100 },
      player: { iFrame: 0.35, pickupRadius: 18 },
      leash: { offsetBehind: 36, returnRadius: 140, roamRadius: 120, holdRange: 70 },
      faint: { reviveHpRatio: 0.4 },
      enemies: { pagumon: { name: "Pagumon", hp: 28, speed: 42, damage: 7, contactCd: 0.7, xp: 6, color: "#a87840", radius: 12 } },
      bosses: { firstAt: 90, every: 90, type: "pagumon", hpScalePer: 0.35 },
      farmHeal: { hp: 0.2, tamerHp: 0.2, dropChance: 0.3, eliteChance: 0.6, bossChance: 1, worldEvery: 9 }
    };
  }

  function MissionSim(opts) {
    opts = opts || {};
    this.hz = opts.hz || 25;
    this.dt = 1 / this.hz;
    this.viewW = opts.viewW || 1280;
    this.viewH = opts.viewH || 720;
    this.data = opts.data || D;
    this._defs = defaults();
    this.clockHour = opts.clockHour != null ? opts.clockHour : 12;
    this.reset(opts.seed || 1);
  }

  MissionSim.prototype.attachData = function (data) {
    this.data = data || this.data;
    return this;
  };

  MissionSim.prototype._isEgg = function (form) {
    var R = partyRules();
    if (R) return R.isEggForm(form, this.data);
    var sp = this.data && this.data.SPECIES && this.data.SPECIES[form];
    return !!(sp && sp.stage === "Egg");
  };

  MissionSim.prototype._combatReady = function () {
    var R = partyRules();
    if (R) return R.hasHatchedCombatant(this, this.data);
    var i, p, c;
    for (i = 0; i < this.players.length; i++) {
      p = this.players[i];
      if ((p.hp || 0) > 0 && !(p.faint > 0) && !this._isEgg(p.form)) return true;
    }
    for (i = 0; i < this.cpus.length; i++) {
      c = this.cpus[i];
      if (c && (c.hp || 0) > 0 && !this._isEgg(c.form)) return true;
    }
    return false;
  };

  /* No spawns while any tamer's egg is still incubating, until
   * HATCH.enemyLead seconds before it hatches (default 1s). */
  MissionSim.prototype._spawnsOpen = function () {
    var hcfg = (this.data && this.data.HATCH) || {};
    var lead = hcfg.enemyLead != null ? hcfg.enemyLead : 1;
    var i, p, egg = false, ready = true;
    for (i = 0; i < this.players.length; i++) {
      p = this.players[i];
      if (p.hasTamer === false || !this._isEgg(p.form)) continue;
      egg = true;
      if ((p.hatchLeft || 0) > lead + 1e-6) ready = false;
    }
    /* The quiet window only covers the opening incubation; a late joiner
     * with an egg does not pause a fight that is already under way. */
    if (egg && this.time < (hcfg.time || 20) + 0.5) return ready;
    return this._combatReady();
  };

  MissionSim.prototype._stampParty = function () {
    var humans = 0, i;
    for (i = 0; i < this.players.length; i++) if (this.players[i].hasTamer !== false) humans += 1;
    if (!humans) humans = Math.max(1, this.players.length);
    this.startingPartySize = humans + (this.cpus ? this.cpus.length : 0);
  };

  MissionSim.prototype.freezeParty = function (size) {
    if (size != null) this.startingPartySize = size;
    else this._stampParty();
    this._partyFrozen = true;
    if (this.partyReviveCharge == null) this.partyReviveCharge = 1;
    return this.startingPartySize;
  };

  MissionSim.prototype.addCpu = function (rec) {
    rec = rec || {};
    var sp = this.data && this.data.SPECIES && this.data.SPECIES[rec.form];
    var c = {
      id: rec.id || ("cpu-" + (this.cpus.length + 1)),
      form: rec.form || "gabumon",
      name: rec.name || (sp && sp.name) || rec.form || "CPU",
      hasTamer: false,
      x: rec.x != null ? rec.x : 40,
      y: rec.y != null ? rec.y : 0,
      facing: rec.facing || 1,
      hp: rec.hp != null ? rec.hp : ((sp && sp.base && sp.base.maxHp) || rec.maxHp || 40),
      maxHp: rec.maxHp || rec.hp || ((sp && sp.base && sp.base.maxHp) || 40),
      invuln: 0,
      moving: false,
      weapon: rec.weapon || { id: "pepperBreath", level: 1, cd: 0 }
    };
    this.cpus.push(c);
    if (!this._partyFrozen) this._stampParty();
    return c;
  };

  MissionSim.prototype._tickRevive = function (p, inp, dt) {
    var R = partyRules();
    if (!R || !p) return;
    var held = !!(inp && (inp.interact || inp.interactHeld));
    /* each tamer has its own hold (17z33): one shared hold was wiped every tick by whoever wasn't holding,
     * so with two or more players a revive could never finish */
    var reviver = p, before = p.reviveHold, out = R.tickHold(p, { dt: dt, held: held, data: this.data, ctx: this, reviver: reviver }), t;
    if (p.id === this.localId || !this.localId || this.players.length === 1) this.reviveHold = p.reviveHold || null;   /* the host's own bar (snapshot) */
    /* a friend picked up: back on its feet where it fell, Digimon and all (17z33; it used to stay "downed") */
    if (out && out.completed && before && before.kind === "team" && (t = this.player(before.targetId)) && t.downed) {
      t.downed = false; t.downLeft = null; t.faint = 0;
      t.tamerHp = Math.max(1, Math.round((t.tamerMaxHp || 100) * ((this.data.PARTY_REVIVE && this.data.PARTY_REVIVE.tamerHpRatio) || 0.5)));
      t.monInvuln = Math.max(t.monInvuln || 0, 2); t.tamerInvuln = Math.max(t.tamerInvuln || 0, 2);
      this.emit({ type: "revive", id: t.id, by: p.id, team: true });
    }
  };

  MissionSim.prototype.reset = function (seed) {
    this.seed = (seed >>> 0) || 1;
    this.rng = mulberry(this.seed);
    this.tick = 0;
    this.time = 0;
    this.phase = "playing";
    this.players = [];
    this.cpus = [];
    this.ally = null;
    this.enemies = [];
    this.orbs = [];
    this.bullets = [];
    this.arcs = [];
    this.events = [];
    this.inputs = {};
    this.nextId = 1;
    this.spawnAcc = {};
    this.openingSpawned = false;
    this.lastBoss = -1e9;
    this.worldFoodAcc = 0;
    this.pendingLevels = 0;
    this.runOver = false;
    this.kills = 0;
    this.rejected = 0;
    this.localId = null;
    this.megaAcc = 0;
    this.lastMegaAt = -1e9;
    this.merchant = null;
    this.farm = null;
    this.brawl = null;
    this.brawlSim = null;
    this.clockHour = this.clockHour != null ? this.clockHour : 12;
    this.lifecycle = this.lifecycle || { resume: null, pendingFarm: false, pendingBrawl: false };
    this.startingPartySize = 0;
    this._partyFrozen = false;
    this.partyReviveCharge = 1;
    this.reviveHold = null;
    this.catches = [];
    this.spireChests = [];
    if (weatherApi()) weatherApi().startRunWeather(this, { data: this.data });
    else this.weather = { id: "clear", fromId: null, t: 0, duration: 0, fadeT: 6, fadeMax: 6, nextDelay: 42, locked: false };
    return this;
  };

  MissionSim.prototype._care = function () { return (this.data && this.data.CARE) || this._defs.care; };
  MissionSim.prototype._tamer = function () { return (this.data && this.data.TAMER) || this._defs.tamer; };
  MissionSim.prototype._player = function () { return (this.data && this.data.PLAYER) || this._defs.player; };
  MissionSim.prototype._leash = function () { return (this.data && this.data.LEASH) || this._defs.leash; };
  MissionSim.prototype._enemies = function () { return (this.data && this.data.ENEMIES) || this._defs.enemies; };
  MissionSim.prototype._bosses = function () { return (this.data && this.data.BOSSES) || this._defs.bosses; };
  MissionSim.prototype._heal = function () {
    var f = this.data && this.data.FARM_CFG && this.data.FARM_CFG.heal;
    return f || this._defs.farmHeal;
  };

  /* Highest stage among the tamers' partners (0 Baby .. 5 Mega). */
  MissionSim.prototype._partnerStageIdx = function () {
    var fn = this.data && this.data.partnerStageIdx;
    if (!fn) return 2;
    var i, p, best = 0, any = false;
    for (i = 0; i < this.players.length; i++) {
      p = this.players[i];
      if (p.hasTamer === false) continue;
      any = true;
      best = Math.max(best, fn(p.form));
    }
    return any ? best : 2;
  };

  MissionSim.prototype._wave = function (t) {
    if (this.data && this.data.stageWave) return this.data.stageWave(t, this._partnerStageIdx(), this.seed);
    if (this.data && this.data.waveAt) return this.data.waveAt(t);
    return { cap: 14, spdMul: 1, dmgMul: 1, hpMul: 1, rates: { pagumon: 1.5 } };
  };

  MissionSim.prototype._actorRad = function (id) {
    var data = this.data || {};
    var def = (data.SPECIES && data.SPECIES[id]) || (data.ENEMIES && data.ENEMIES[id]) || this._enemies()[id] || {};
    var base = def.radius || 12;
    if (data.sprites && data.sprites.bodyRadius) return data.sprites.bodyRadius(id, base);
    return Math.max(6, base);
  };

  /* cross: 0 walks, 1 swims, 2 flies (biomes.js crossOf: who can go over water) */
  MissionSim.prototype._slide = function (x, y, dx, dy, rad, cross) {
    var w = this.data && this.data.world;
    if (w && w.moveSlide) return w.moveSlide(x, y, dx, dy, rad, cross);
    return { x: x + dx, y: y + dy };
  };

  MissionSim.prototype._snap = function (x, y, rad, maxR, cross) {
    var w = this.data && this.data.world;
    if (w && w.nearestWalkable) return w.nearestWalkable(x, y, maxR || 240, rad == null ? 8 : rad, cross);
    return { x: x, y: y };
  };

  MissionSim.prototype.emit = function (ev) {
    ev.tick = this.tick;
    ev.time = this.time;
    this.events.push(ev);
  };

  MissionSim.isIllegal = function (msg) {
    if (!msg) return false;
    if (msg.type && ILLEGAL_TYPES[msg.type]) return true;
    if (msg.damage != null || msg.grantBits != null || msg.bitsDelta != null) return true;
    if (msg.hpSet != null || msg.setHp != null || msg.xpDelta != null) return true;
    if (msg.fullnessSet != null || msg.currency != null) return true;
    return false;
  };

  /* Client messages may only carry movement / intent. Anything that
   * asserts damage, currency, XP, or HP is rejected and ignored. */
  MissionSim.prototype.ingest = function (msg) {
    if (!msg) return { ok: false, reason: "empty" };
    if (MissionSim.isIllegal(msg)) {
      this.rejected += 1;
      this.emit({ type: "rejected", reason: "client-asserted", kind: msg.type || "payload", id: msg.id || null });
      return { ok: false, reason: "rejected" };
    }
    if (msg.type && msg.type !== "input" && msg.type !== "inputs" && !msg.inputs && msg.seq == null) {
      this.rejected += 1;
      this.emit({ type: "rejected", reason: "unknown", kind: msg.type, id: msg.id || null });
      return { ok: false, reason: "unknown" };
    }
    this.pushInput(msg);
    return { ok: true };
  };

  MissionSim.prototype.pushInput = function (msg) {
    if (!msg || !msg.id) return;
    var list = this.inputs[msg.id];
    if (!list) return;
    var batch = msg.inputs || [msg];
    var i, inp, j, seen;
    for (i = 0; i < batch.length; i++) {
      inp = batch[i];
      /* Click-to-attack: the client may only name an enemy id. The sim
       * checks it exists and is alive; the partner does the rest. */
      if (inp.focus !== undefined) this._setFocus(msg.id, inp.focus);
      /* clicked another tamer's partner while you are both flagged for PvP: go after it */
      if (inp.pvp) this._setPvpFocus(msg.id, inp.pvp);
      /* Click-to-move: "come over here". The partner walks to the spot and
       * waits a moment before it goes back to picking its own fights. */
      if (inp.go) this._setGo(msg.id, inp.go);
      /* Right-click the ground (17z33): attack that spot */
      if (inp.strike) this._setStrike(msg.id, inp.strike);
      if (inp.seq == null) continue;
      seen = false;
      for (j = 0; j < list.length; j++) if (list[j].seq === inp.seq) { seen = true; break; }
      if (!seen) {
        list.push({
          seq: inp.seq,
          x: inp.x || 0,
          y: inp.y || 0,
          atk: !!inp.atk,
          aim: inp.aim,
          interact: !!inp.interact,
          capture: !!inp.capture
        });
      }
    }
    list.sort(function (a, b) { return a.seq - b.seq; });
    if (list.length > 32) list.splice(0, list.length - 32);
  };

  MissionSim.prototype.join = function (rec) {
    rec = rec || {};
    if (this.players.length >= 6) return null;
    var t = this._tamer();
    var p = {
      id: rec.id,
      slot: this.players.length,
      kind: rec.kind || "client",
      hasTamer: rec.hasTamer !== false && rec.kind !== "bot",
      form: rec.form || "agumon",
      x: rec.x || 0,
      y: rec.y || 0,
      vx: 0,
      vy: 0,
      facing: 1,
      tdir: "side",
      moving: false,
      tamerHp: rec.tamerHp != null ? rec.tamerHp : (t.maxHp || 100),
      tamerMaxHp: rec.tamerMaxHp || t.maxHp || 100,
      tamerInvuln: 0,
      mx: rec.mx != null ? rec.mx : (rec.x || 0) + 28,
      my: rec.my != null ? rec.my : (rec.y || 0) + 8,
      mfacing: -1,
      monMoving: false,
      hp: rec.hp != null ? rec.hp : 80,
      maxHp: rec.maxHp || 80,
      monInvuln: 0,
      faint: 0,
      fullness: rec.fullness != null ? rec.fullness : 80,
      happiness: rec.happiness != null ? rec.happiness : 60,
      bits: rec.bits || 0,
      lab: this._labClean(rec.lab),
      /* a DigiBank memory of this egg line: skill points waiting for the hatch */
      gear: this._gearClean(rec.gear),
      blood: this._bloodClean(rec.blood),                                 /* a Hatchery partner's bloodline (hatchery.js) */
      vsRookie: typeof rec.vsRookie === "string" ? rec.vsRookie.slice(0, 40) : null,   /* Versus: the Rookie you start as */
      duel: this._duelClean ? this._duelClean(rec.duel) : null,                       /* Duel: your Hatchery Digimon as it is */
      memory: Math.max(0, Math.min((this.data && this.data.MEMORY && this.data.MEMORY.max) || 3, Math.floor(+rec.memory || 0))),
      skillPoints: Math.max(0, Math.min((this.data && this.data.MEMORY && this.data.MEMORY.max) || 3, Math.floor(+rec.memory || 0))),
      xp: rec.xp || 0,
      xpNext: rec.xpNext || 10,
      level: rec.level || 1,
      kills: rec.kills || 0,
      weapons: rec.weapons ? rec.weapons.slice() : [{ id: "pepperBreath", level: 1, cd: 0, spin: 0 }],
      seqAck: 0,
      aim: 0,
      monTarget: null,
      focusId: null,
      acquireCd: 0,
      killStreak: 0,
      streakTimer: 0,
      desperation: false,
      atkBoost: 0,
      hatchLeft: rec.hatchLeft,
      downed: !!rec.downed,
      bag: rec.bag ? Object.assign({}, rec.bag) : {},
      items: rec.items ? rec.items.slice() : [],
      shopBought: rec.shopBought ? Object.assign({}, rec.shopBought) : {},
      captureKills: rec.captureKills || 0,
      trainStats: rec.trainStats ? Object.assign({}, rec.trainStats) : { offense: 0, intelligence: 0, agility: 0 },
      trainVisits: rec.trainVisits ? Object.assign({}, rec.trainVisits) : { bag: 0, board: 0, track: 0, bond: 0 },
      bondTrain: rec.bondTrain || 0,
      careMistakes: rec.careMistakes || 0,
      foodEaten: rec.foodEaten || 0,
      foodCounts: rec.foodCounts ? Object.assign({}, rec.foodCounts) : {},
      reserve: rec.reserve ? rec.reserve.slice() : [],
      partners: rec.partners ? rec.partners.slice() : [],
      statLevels: rec.statLevels ? Object.assign({}, rec.statLevels) : {},
      evoLock: rec.evoLock || 0,
      farmVisitIndex: rec.farmVisitIndex || 0,
      pendingFarm: !!rec.pendingFarm,
      lastBrawlLevel: rec.lastBrawlLevel,
      killsAttribute: rec.killsAttribute ? Object.assign({}, rec.killsAttribute) : {},
      killsSpecies: rec.killsSpecies ? Object.assign({}, rec.killsSpecies) : {},
      bossesBeaten: rec.bossesBeaten || 0,
      faints: rec.faints || 0,
      peakHappiness: rec.happiness || rec.peakHappiness || 0,
      lastFarmAt: rec.lastFarmAt || 0,
      pendingBrawl: !!rec.pendingBrawl,
      formsReached: rec.formsReached ? Object.assign({}, rec.formsReached) : {},
      worldSeed: rec.worldSeed || this.seed
    };
    var R = rarityApi();
    if (R && R.resetRun) R.resetRun(p, this.seed);
    if (p.form) p.formsReached[p.form] = true;
    this._gearStart(p);
    this.players.push(p);
    this.inputs[p.id] = [];
    if (!this.localId) this.localId = p.id;
    if (!this._partyFrozen) this._stampParty();
    this.emit({ type: "join", id: p.id, slot: p.slot });
    return p;
  };

  MissionSim.prototype.leave = function (id) {
    var i;
    for (i = 0; i < this.players.length; i++) if (this.players[i].id === id) {
      this.emit({ type: "leave", id: id, slot: this.players[i].slot });
      this.players.splice(i, 1);
      delete this.inputs[id];
      return true;
    }
    return false;
  };

  MissionSim.prototype.player = function (id) {
    var i;
    for (i = 0; i < this.players.length; i++) if (this.players[i].id === id) return this.players[i];
    return null;
  };

  /* Privileged host merge after farm / evo / shop — not a client message. */
  MissionSim.prototype.syncHost = function (patch) {
    var p = this.player(this.localId) || this.players[0];
    if (!p || !patch) return p;
    var k, allowed = ["form", "hp", "maxHp", "tamerHp", "tamerMaxHp", "fullness", "happiness", "bits", "xp", "xpNext", "level", "weapons", "atkBoost", "hatchLeft", "pendingLevels"];
    for (k = 0; k < allowed.length; k++) {
      if (patch[allowed[k]] != null) {
        if (allowed[k] === "weapons") p.weapons = patch.weapons.slice();
        else if (allowed[k] === "pendingLevels") this.pendingLevels = patch.pendingLevels;
        else p[allowed[k]] = patch[allowed[k]];
      }
    }
    return p;
  };

  MissionSim.prototype.grantBits = function (id, n) {
    var p = this.player(id) || this.player(this.localId) || this.players[0];
    if (!p || !n) return 0;
    p.bits = Math.max(0, (p.bits || 0) + n);
    this.emit({ type: "bits", id: p.id, amount: n, bits: p.bits, source: "host" });
    return p.bits;
  };

  MissionSim.prototype.spendBits = function (id, n) {
    var p = this.player(id) || this.player(this.localId) || this.players[0];
    if (!p) return false;
    if ((p.bits || 0) < n) return false;
    p.bits -= n;
    this.emit({ type: "bits", id: p.id, amount: -n, bits: p.bits, source: "host" });
    return true;
  };

  MissionSim.prototype.bootstrapFromRun = function (run) {
    if (!run) return this;
    var localId = (run.session && (run.session.localId || run.session.local)) || "local";
    this.localId = localId;
    this.time = run.time || 0;
    this.kills = run.kills || 0;
    this.seed = run.worldSeed || this.seed;
    this.rng = mulberry(this.seed);
    this.runMode = run.mode || this.runMode || "survival";   /* modes-sim.js; game.js always sends one */
    this.week = run.week || null;
    if (!this.player(localId)) {
      this.join({
        id: localId,
        kind: "host-client",
        hasTamer: true,
        form: run.form,
        x: run.x, y: run.y, mx: run.mx, my: run.my,
        hp: run.hp, maxHp: run.maxHp,
        tamerHp: run.tamerHp, tamerMaxHp: run.tamerMaxHp || run.tamerHp,
        fullness: run.fullness, happiness: run.happiness,
        bits: run.bits, xp: run.xp, xpNext: run.xpNext, level: run.level,
        kills: run.kills, weapons: run.weapons, hatchLeft: run.hatchLeft,
        farmVisitIndex: run.farmVisitIndex, lastFarmAt: run.lastFarmAt,
        pendingFarm: run.pendingFarm, pendingBrawl: run.pendingBrawl,
        lastBrawlLevel: run.lastBrawlLevel, formsReached: run.formsReached,
        worldSeed: run.worldSeed, lab: run.lab, memory: run.memory, gear: run.gear
      });
    } else {
      this.syncHost({
        form: run.form, hp: run.hp, maxHp: run.maxHp, tamerHp: run.tamerHp,
        fullness: run.fullness, happiness: run.happiness, bits: run.bits,
        xp: run.xp, xpNext: run.xpNext, level: run.level, weapons: run.weapons,
        hatchLeft: run.hatchLeft
      });
    }
    var i, c, a;
    this.cpus = [];
    for (i = 0; i < (run.cpuMates || []).length; i++) {
      c = run.cpuMates[i];
      this.cpus.push({
        id: c.id || ("cpu-" + i),
        form: c.form,
        name: c.name,
        hasTamer: false,
        x: c.x, y: c.y, facing: c.facing || 1,
        hp: c.hp, maxHp: c.maxHp, invuln: 0,
        moving: false, weapon: c.weapon || { id: "pepperBreath", level: 1, cd: 0 }
      });
    }
    if (run.ally && run.ally.form) {
      a = run.ally;
      this.ally = { form: a.form, x: a.x, y: a.y, hp: a.hp, maxHp: a.maxHp, facing: a.facing || 1, weapon: a.weapon, invuln: 0 };
    }
    this.freezeParty(run.startingPartySize != null ? run.startingPartySize : undefined);
    if (run.partyReviveCharge != null) this.partyReviveCharge = run.partyReviveCharge;
    if (run.weather && weatherApi()) this.weather = run.weather;
    else if (weatherApi()) weatherApi().startRunWeather(this, { data: this.data });
    return this;
  };

  /* The newest input wins. The old code used the *oldest* queued input, one
   * per tick: at 60 fps the queue filled to 32 and the tamer answered the
   * stick about half a second late. If no fresh input arrived this tick
   * (slow frame, network jitter) the last one holds for a few ticks, so the
   * tamer no longer stutters or walks at half speed on a slow device. */
  MissionSim.prototype._takeInput = function (p) {
    var list = this.inputs[p.id] || [];
    var inp = null;
    if (list.length) {
      inp = list[list.length - 1];
      if (inp.seq > p.seqAck) p.seqAck = inp.seq;
      list.length = 0;
      p._heldInp = inp;
      p._heldTicks = 0;
      return inp;
    }
    if (p._heldInp && (p._heldTicks || 0) < 8) {
      p._heldTicks = (p._heldTicks || 0) + 1;
      return p._heldInp;
    }
    return null;
  };

  /* Level-up stat picks (Speed Up, Magnet, Power Up, Quick Claws, Vital
   * Boost) were recorded but never applied here; build them from statLevels. */
  /* ---------- items (data.js ITEMS): what a tamer plugged in, put on and packed for this run ---------- */
  MissionSim.prototype._gearClean = function (raw) {
    var I = this.data && this.data.ITEMS, out = { crest: [], charm: null, use: null, uses: [], scroll: null }, by = {}, i, id, max = (I && I.useSlotsMax) || 4;
    if (!I || !raw || typeof raw !== "object") return out;
    for (i = 0; i < I.list.length; i++) by[I.list[i].id] = I.list[i];
    for (i = 0; i < (raw.crest || []).length && out.crest.length < 2; i++) { id = raw.crest[i]; if (by[id] && by[id].kind === "crest" && out.crest.indexOf(id) < 0) out.crest.push(id); }
    if (by[raw.charm] && by[raw.charm].kind === "charm") out.charm = raw.charm;
    /* 17z33: up to four one-run items (three, the Lab's Kit Bag a fourth); a scroll takes one of the places */
    var list = (raw.uses && raw.uses.length ? raw.uses : (raw.use ? [raw.use] : []));
    for (i = 0; i < list.length && out.uses.length < max; i++) { id = list[i]; if (by[id] && by[id].kind === "cons" && out.uses.indexOf(id) < 0) out.uses.push(id); }
    out.use = out.uses[0] || null;
    if (out.uses.length < max && typeof raw.scroll === "string" && raw.scroll.length < 40) out.scroll = raw.scroll;
    return out;
  };
  /* everything its gear changes, as one set of numbers */
  MissionSim.prototype._gear = function (p) {
    if (p && p._gearMods) return p._gearMods;
    var I = this.data && this.data.ITEMS, m = { elem: {}, burst: 1, magnet: 1, hp: 1, leech: 0, farm: 0, earlyXp: 1, earlyUntil: 0, shiny: 1, burstTime: 0, xp: 1, crop: 1 }, g = p && p.gear, ids, i, j, fx;
    if (I && g) {
      ids = (g.crest || []).concat(g.charm ? [g.charm] : [], g.uses || (g.use ? [g.use] : []));
      for (i = 0; i < ids.length; i++) for (j = 0; j < I.list.length; j++) if (I.list[j].id === ids[i]) {
        fx = I.list[j].fx || {};
        if (fx.elem) m.elem[fx.elem] = 1.1;
        if (fx.burst) m.burst *= fx.burst; if (fx.magnet) m.magnet *= fx.magnet; if (fx.hp) m.hp *= fx.hp;
        if (fx.leech) m.leech += fx.leech; if (fx.farm) m.farm += fx.farm; if (fx.shiny) m.shiny *= fx.shiny; if (fx.burstTime) m.burstTime += fx.burstTime;
        if (fx.earlyXp) { m.earlyXp = fx.earlyXp; m.earlyUntil = fx.earlyUntil || 180; }
        if (fx.xp) m.xp *= fx.xp; if (fx.crop) m.crop *= fx.crop;          /* 17z33: one-run items */
      }
    }
    if (p) p._gearMods = m;
    return m;
  };
  /* the one-run item, set up as the tamer joins */
  MissionSim.prototype._gearStart = function (p) {
    var I = this.data && this.data.ITEMS, g = p.gear, i, j, k, fx = null, uses;
    if (!I || !g) return;
    uses = g.uses || (g.use ? [g.use] : []);
    for (j = 0; j < uses.length; j++) {
      fx = null;
      for (i = 0; i < I.list.length; i++) if (I.list[i].id === uses[j]) fx = I.list[i].fx;
      if (!fx) continue;
      if (fx.level && (p.level || 1) < fx.level) { p.skillPoints = (p.skillPoints || 0) + (fx.level - (p.level || 1)); p.level = fx.level; p.xp = 0; p.xpNext = this._xpNeeded(p.level); }
      if (fx.luckyShiny) p.luckyShiny = fx.luckyShiny;
      if (fx.wind) p.secondWind = true;
      if (fx.bait) this.rivalBait = true;
      /* 17z33: a head start: stat points, Bits, a full belly and a packed lunch */
      if (fx.attr) { p.itemAttr = p.itemAttr || {}; for (k in fx.attr) p.itemAttr[k] = (p.itemAttr[k] || 0) + fx.attr[k]; p._statsKey = null; }
      if (fx.bits) p.bits = (p.bits || 0) + fx.bits;
      if (fx.belly) { p.fullness = (this.data.CARE && this.data.CARE.fullnessMax) || 100; p.bag = p.bag || {}; p.bag.meat = (p.bag.meat || 0) + fx.belly; this._hungerCheck(p); }
    }
    if (g.scroll) p.scroll = g.scroll;
  };
  /* a rival's scroll: the first time the partner is in a form whose tree has that skill, it learns
   * it (or, already knowing it, gains a level in it). Passives fit every line. */
  MissionSim.prototype._scrollTry = function (p) {
    var SK = this._sk(), id = p.scroll, tr, s, i, fits = false;
    if (!SK || !id || this._isEgg(p.form) || p._scrollForm === p.form) return;
    p._scrollForm = p.form;
    if (SK.PASSIVE_BY[id]) fits = true;
    else { tr = SK.tree(this.data, p.form, p.skills || {}); for (s in tr.slots) for (i = 0; i < tr.slots[s].length; i++) if (tr.slots[s][i].id === id) fits = true; }
    /* a signature from a scroll keeps to the same rules as one from a card (17z33) */
    if (fits && this.data.SIG_INFO && this.data.SIG_INFO[id] && !((p.skills || {})[id] > 0) && SK.blocked(this.data, p.form, p.skills || {}, id)) fits = false;
    if (!fits) return;
    p.skills = p.skills || {};
    var fresh = !(p.skills[id] > 0);
    p.skills[id] = Math.min(SK.MAX || 10, (p.skills[id] || 0) + 1);
    if (fresh && SK.learned) SK.learned(this.data, p.skills, id);
    p.scroll = null;
    this._syncMoves(p);
    this.emit({ type: "scroll.learned", id: p.id, skill: id, level: p.skills[id] });
  };

  /* ---------- the Lab (data.js LAB): permanent boosts a tamer brings into the run ---------- */
  MissionSim.prototype._labClean = function (raw) {
    var L = this.data && this.data.LAB, out = {}, i, id, n;
    if (!L || !raw || typeof raw !== "object") return out;
    for (i = 0; i < L.list.length; i++) { id = L.list[i].id; n = Math.floor(+raw[id] || 0); if (n > 0) out[id] = Math.min(L.list[i].max || L.cost.length, n); }
    return out;
  };
  /* multipliers (and farm seconds) from a player's Lab levels */
  MissionSim.prototype._lab = function (p) {
    if (p && p._labMods) return p._labMods;
    var L = this.data && this.data.LAB, m = { hp: 1, dmg: 1, magnet: 1, xp: 1, bits: 1, farm: 0, burst: 1, speed: 1, bxp: 1, data: 1, crop: 1, belly: 1, moveslot: 0 }, i, u, n;
    if (L && p && p.lab) for (i = 0; i < L.list.length; i++) {
      u = L.list[i]; n = Math.min(p.lab[u.id] || 0, u.max || 99); if (!n) continue;
      if (u.stat === "farm" || u.stat === "moveslot") m[u.stat] += u.per * n; else if (m[u.stat] != null) m[u.stat] *= 1 + u.per * n;
    }
    if (p) p._labMods = m;
    return m;
  };

  MissionSim.prototype._stats = function (p) {
    var defs = this.data && this.data.STAT_UPGRADES, lv = p.statLevels || {}, key = "", id, i, s;
    if (!defs) return p.stats || null;
    for (id in lv) if (Object.prototype.hasOwnProperty.call(lv, id)) key += id + lv[id] + ",";
    var ec = p.evoCount || 0, pk = p.perks || {}, EB = (this.data && this.data.EVO_BOOST) || {};
    key += "e" + ec + "p" + (pk.dmg || 1) + "/" + (pk.cd || 1) + "/" + (pk.spd || 1) + "/" + (pk.magnet || 1);
    var RO = this._ro(), dv = RO ? this._derived(p) : null, at = RO ? this._attrsEff(p) : {};
    key += "a" + (at.str || 0) + "." + (at.int || 0) + "." + (at.agi || 0) + "." + (at.dex || 0) + "." + (at.luk || 0);
    var SK = this._sk(), pm = SK ? SK.passiveMul(p.skills || {}) : null;
    if (pm) key += "s" + pm.damage + "/" + pm.cooldown + "/" + pm.speed + "/" + pm.magnet;
    var PV = this._passives(p);
    var VB = this.data.vegBoosts ? this.data.vegBoosts(p.foodCounts) : null;     /* 17z33: the garden's lasting boosts */
    var BP = this.data.BLOODLINE ? 1 + this.data.BLOODLINE.power * this._blood(p, "power") : 1;   /* 17z33: a bloodline's Power */
    var SPD = this.data.SPEEDS || {}, trackSpd = Math.min(SPD.trackMax || 0.6, ((p.trainStats && p.trainStats.agility) || 0) * (SPD.trackPer || 0.005));
    var boots = Math.min((SPD.boots && SPD.boots.max) || 5, (p.shopBought && p.shopBought.sprintBoots) || 0);
    key += "k" + Math.round(trackSpd * 1000) + "b" + boots;
    key += "v" + PV.key + "B" + BP + (VB ? "g" + VB.key : "") + (p.starving ? "h" : "") + (p.shiny ? "S" + (p.shinyBoost || 0) : "");
    if (p._statsKey === key && p.stats) return p.stats;
    s = { speedMul: 1, magnetMul: 1, maxHpMul: 1, damageMul: 1, cooldownMul: 1, monSpeedMul: 1 };
    for (id in lv) if (defs[id] && defs[id].apply) for (i = 0; i < lv[id]; i++) defs[id].apply(s, i + 1);
    /* every digivolution is a step up in everything; holding back earns small perks */
    s.damageMul *= (1 + (EB.damage || 0) * ec) * (pk.dmg || 1);
    s.cooldownMul *= Math.pow(1 - (EB.cooldown || 0), ec) * (pk.cd || 1);
    s.monSpeedMul = (1 + (EB.speed || 0) * ec) * (pk.spd || 1);
    s.magnetMul *= (pk.magnet || 1);
    /* skill-tree masteries */
    if (pm) { s.damageMul *= pm.damage; s.cooldownMul *= pm.cooldown; s.speedMul *= pm.speed; s.magnetMul *= pm.magnet; }
    /* ally passives: the one walking beside you, and any kept from DNA digivolving with one */
    s.damageMul *= PV.damage; s.cooldownMul *= PV.cooldown; s.monSpeedMul *= PV.monSpeed; s.magnetMul *= PV.magnet;
    var LB = this._lab(p), GR = this._gear(p);
    s.damageMul *= LB.dmg * BP; s.magnetMul *= LB.magnet * GR.magnet;
    s.monSpeedMul *= LB.speed;
    if (p.shiny && p.shinyBoost) { var sb = 1 + p.shinyBoost; s.damageMul *= sb; s.monSpeedMul *= sb; s.cooldownMul /= sb; }   /* 17z33: a shiny is a little stronger in everything */
    if (p.starving) { var CR = this._care(); s.monSpeedMul *= CR.starveSpeed || 0.8; s.damageMul *= CR.starveDamage || 0.85; }   /* 17z33: starving */
    /* 17z33: three speeds. Attack speed is AGI (ro-stats.js); the partner's run speed grows with the running
     * track's Agility training; the tamer's own speed is Sprint Boots. The partner always keeps ahead of the
     * tamer (_movePartner). */
    s.monSpeedMul *= 1 + trackSpd; s.trackSpeed = trackSpd;
    if (boots) { s.speedMul *= 1 + boots * ((SPD.boots && SPD.boots.per) || 0.06); s.boots = boots; }
    if (VB) { s.monSpeedMul *= 1 + VB.speed; s.cooldownMul /= 1 + VB.rate; s.damageMul *= 1 + VB.damage; s.magnetMul *= 1 + VB.magnet; }
    s.allyMaxHp = PV.maxHp * LB.hp * GR.hp * (VB ? 1 + VB.hp : 1); s.allyGuard = PV.guard * (VB ? 1 / (1 + VB.guard) : 1); s.allyCrit = PV.crit; s.allyDodge = PV.dodge; s.allyRegen = PV.regen; s.allyBurst = PV.burst;
    /* status points (js/ro-stats.js): STR -> physical, INT -> special, AGI/DEX -> attack speed */
    s.physMul = dv ? dv.physMul : 1;
    s.specMul = dv ? dv.specMul : 1;
    /* AGI speeds physical moves, INT (the cast timer) speeds special ones */
    s.physCdMul = dv ? dv.delayMul : 1;
    s.specCdMul = dv ? dv.castMul : 1;
    p._statsKey = key; p.stats = s;
    return s;
  };

  /* ---------- the caught ally (data.js ALLY) ---------- */
  MissionSim.prototype._allyOwner = function () { return this.player(this.localId) || this.players[0] || null; };
  /* every passive a partner has right now, multiplied together */
  MissionSim.prototype._passives = function (p) {
    var A = this.data.ALLY, out = { damage: 1, cooldown: 1, monSpeed: 1, magnet: 1, maxHp: 1, guard: 1, crit: 0, dodge: 0, regen: 0, burst: 1, key: "", list: [] }, i, f, d;
    if (!A || !p) return out;
    var list = (p.passives || []).slice();
    if (this.ally && this.ally.hp > 0 && this.ally.passive && p === this._allyOwner()) list.push(this.ally.passive);
    for (i = 0; i < list.length; i++) {
      f = list[i]; d = A.passives[f];
      if (!d) continue;
      out.list.push(f);
      if (d.damage) out.damage *= d.damage; if (d.cooldown) out.cooldown *= d.cooldown; if (d.monSpeed) out.monSpeed *= d.monSpeed;
      if (d.magnet) out.magnet *= d.magnet; if (d.maxHp) out.maxHp *= d.maxHp; if (d.guard) out.guard *= d.guard;
      if (d.crit) out.crit += d.crit; if (d.dodge) out.dodge += d.dodge; if (d.regen) out.regen += d.regen; if (d.burst) out.burst *= d.burst;
    }
    out.key = out.list.join(",");
    return out;
  };
  /* fit out a newly caught (or newly digivolved) ally: its move, its passive, its health */
  MissionSim.prototype._allyKit = function (a, fresh) {
    var D2 = this.data, sp = D2.SPECIES && D2.SPECIES[a.form], pool = D2.movePool ? D2.movePool(a.form) : null, W = D2.WEAPONS || {}, A = D2.ALLY || {};
    var wid = (pool && pool.primary && W[pool.primary]) ? pool.primary : ((a.weapon && a.weapon.id) || "pepperBreath");
    a.weapon = { id: wid, level: 1, cd: 0 };
    a.passive = D2.moveFamilyOf ? D2.moveFamilyOf(a.form) : null;
    if (fresh) { a.level = a.level || 1; a.xp = a.xp || 0; a.atkT = 2; }
    var base = Math.max(20, Math.round(((sp && sp.base && sp.base.maxHp) || 40) * 0.85 * (1 + (A.hpPerLevel || 0) * ((a.level || 1) - 1))));
    var ratio = a.maxHp ? a.hp / a.maxHp : 1;
    a.maxHp = base; a.hp = Math.max(1, Math.round(base * Math.max(ratio, fresh ? 1 : 0.6)));
    a.stats = { damageMul: A.damageMul != null ? A.damageMul : 0.6 };
    return a;
  };
  MissionSim.prototype._allyXpNext = function (lv) { var A = this.data.ALLY || {}; return Math.round((A.xpBase || 14) * Math.pow(lv, A.xpPower || 1.6)); };
  /* XP from a defeat; levels; and a straight-line digivolution when it is due */
  MissionSim.prototype._allyGain = function (xp) {
    var A = this.data.ALLY, a = this.ally, sp, st, need, to;
    if (!A || !a || !(a.hp > 0) || this._isEgg(a.form)) return;
    if (a.level == null) this._allyKit(a, true);
    a.xp = (a.xp || 0) + xp * A.xpShare;
    while (a.xp >= this._allyXpNext(a.level)) {
      a.xp -= this._allyXpNext(a.level);
      a.level += 1;
      a.maxHp = Math.round(a.maxHp * (1 + A.hpPerLevel)); a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.25);
      sp = this.data.SPECIES && this.data.SPECIES[a.form]; st = sp && (sp.stageKey || sp.stage);
      need = A.evolveAt[st];
      to = need && a.level >= need ? this._burstForm(a.form) : a.form;     /* the standard next form, nothing else */
      if (to !== a.form) {
        var from = a.form;
        a.form = to; this._allyKit(a, false); a.hp = a.maxHp;
        this._statsDirty = true;
        this.emit({ type: "ally.evolve", from: from, to: to, x: a.x, y: a.y, level: a.level, passive: a.passive });
      } else this.emit({ type: "ally.level", level: a.level, x: a.x, y: a.y });
    }
  };

  MissionSim.prototype._moveTamer = function (p, inp, dt) {
    var t = this._tamer();
    var speed = t.speed || 168;
    this._stats(p);
    if (p.stats && p.stats.speedMul) speed *= p.stats.speedMul;
    var ix = 0, iy = 0;
    if (inp && !(p.choosing > 0)) {            /* choosing a skill: the tamer stands still */
      var l = len(inp.x || 0, inp.y || 0);
      ix = l > 1 ? inp.x / l : (inp.x || 0);
      iy = l > 1 ? inp.y / l : (inp.y || 0);
    }
    var pos = this._slide(p.x, p.y, ix * speed * dt, iy * speed * dt, t.radius || 10);
    p.x = pos.x; p.y = pos.y;
    p.vx = ix * speed; p.vy = iy * speed;
    p.moving = Math.abs(ix) + Math.abs(iy) > 0.15;
    if (ix > 0.15) p.facing = 1;
    else if (ix < -0.15) p.facing = -1;
    if (p.moving) {
      if (Math.abs(iy) > Math.abs(ix) + 0.05) p.tdir = iy > 0 ? "down" : "up";
      else p.tdir = "side";
    }
    p.tamerInvuln = Math.max(0, p.tamerInvuln - dt);
    if (inp && inp.aim != null) p.aim = inp.aim;
  };

  /* Footwork against another tamer's partner (Nov 21): it doesn't plant its feet and trade
   * numbers. It circles at fighting range, switches direction every second or two, drifts in and
   * out, and now and then side-steps hard, firing all the while (its moves aim by themselves). */
  MissionSim.prototype._duelStep = function (p, t, dt) {
    var L = this._leash(), dx = p.mx - t.x, dy = p.my - t.y, a = Math.atan2(dy, dx), r;
    p.duelT = (p.duelT == null ? 0 : p.duelT) - dt;
    if (p.duelT <= 0) { p.duelDir = this.rng() < 0.5 ? -1 : 1; p.duelT = 1.1 + this.rng() * 1.2; p.duelDash = this.rng() < 0.3 ? 0.35 : 0; }
    p.duelDash = Math.max(0, (p.duelDash || 0) - dt);
    r = Math.max(70, (L.holdRange || 70) + 25) + Math.sin(this.time * 1.7 + (p.id ? p.id.length : 1)) * 22;
    a += (p.duelDir || 1) * (p.duelDash > 0 ? 1.1 : 0.55);
    return { x: t.x + Math.cos(a) * r, y: t.y + Math.sin(a) * r * 0.8 };
  };
  MissionSim.prototype._movePartner = function (p, dt) {
    var L = this._leash();
    p.monInvuln = Math.max(0, p.monInvuln - dt);
    var rad = this._actorRad(p.form);
    if (p.downed && this._tamer().invulnerable) { p.faint = 999; p.monMoving = false; p.monTarget = null; return; }
    if (p.faint > 0) {
      p.faint -= dt;
      p.monMoving = false;
      p.monTarget = null;
      if (p.faint <= 0) {
        p.hp = Math.max(1, p.maxHp * ((this.data && this.data.FAINT && this.data.FAINT.reviveHpRatio) || this._defs.faint.reviveHpRatio));
        this.emit({ type: "revive", id: p.id });
      }
      return;
    }
    /* choosing a skill (level-up window open): the pair is locked in place. It cannot
     * move, attack or be hurt, so the pause cannot be used to walk out of trouble. */
    if (p.scroll) this._scrollTry(p);
    if (p.choosing > 0) {
      p.choosing -= dt;
      p.monInvuln = Math.max(p.monInvuln || 0, Math.min(p.choosing, 0.35));
      p.monMoving = false; p.monTarget = null;
      return;
    }
    /* a breather: HP creeps back once nothing has hit it for a while */
    p.sinceHit = (p.sinceHit || 0) + dt;
    var PL = this._player();
    if (PL.restRegen && p.sinceHit > (PL.restAfter || 5) && p.hp > 0 && p.hp < p.maxHp && !this._isEgg(p.form)) {
      p.hp = Math.min(p.maxHp, p.hp + p.maxHp * PL.restRegen * dt);
    }
    /* the Recovery skill: the only health that comes back by itself (a Water ally adds its own) */
    var rgSk = this._sk(), rgLv = (p.skills && p.skills.rg) || 0;
    if (rgSk && rgLv > 0 && rgSk.PASSIVE_BY.rg && p.hp > 0 && p.hp < p.maxHp && !this._isEgg(p.form)) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * rgSk.PASSIVE_BY.rg.per * rgLv * dt);
    var following = false;
    var focus = this._isEgg(p.form) ? null : this._enemyById(p.focusId);
    /* an order to attack a spot on the ground (17z33): it runs out, or ends if you run too far off */
    var strike = p.strike, GS = this.data.GROUND_STRIKE || {};
    if (strike) {
      strike.left -= dt;
      if (strike.left <= 0 || this._isEgg(p.form) || dist2(strike.x, strike.y, p.x, p.y) > Math.pow((GS.maxRange || 380) * 1.4, 2)) strike = p.strike = null;
    }
    var dTamer = Math.sqrt(dist2(p.mx, p.my, p.x, p.y));
    var focusLeash = (L.focusRadius || (L.returnRadius || 310) * 1.6);
    if (focus && Math.sqrt(dist2(focus.x, focus.y, p.x, p.y)) > focusLeash) focus = null;
    if (!focus) p.focusId = null;
    var target = focus || (this._isEgg(p.form) ? null : this._nearestEnemy(p.x, p.y));
    /* it only goes looking for a fight this close to its tamer (LEASH.seekRadius); anything
     * further off it leaves alone until it comes nearer, though its moves still fire at whatever is in their reach */
    if (target && !focus && L.seekRadius && dist2(target.x, target.y, p.x, p.y) > Math.pow(L.seekRadius + (target.radius || 10), 2)) target = null;
    p.monTarget = target;
    var desiredX, desiredY;
    var go = p.goTo;
    if (go) {
      go.left -= dt;
      if (!go.arrived && dist2(p.mx, p.my, go.x, go.y) < 100) go.arrived = true;
      if (go.arrived) go.hold -= dt;
      if (go.hold <= 0 || go.left <= -2 || (!go.arrived && go.left <= 0) || dTamer > (L.returnRadius || 175) * 1.8) go = p.goTo = null;
    }
    if (strike) {
      /* close enough that every move reaches it, then stand and let fly (it doesn't walk into the water) */
      var sd = Math.sqrt(dist2(p.mx, p.my, strike.x, strike.y)), sk = GS.stand || 70;
      if (sd > sk) { desiredX = strike.x + (p.mx - strike.x) / sd * sk; desiredY = strike.y + (p.my - strike.y) / sd * sk; }
      else { desiredX = p.mx; desiredY = p.my; }
      p.aim = Math.atan2(strike.y - p.my, strike.x - p.mx);
      if (strike.x !== p.mx) p.mfacing = strike.x < p.mx ? -1 : 1;
    } else if (go) {
      /* called over: walk to the spot, then stand there for a moment */
      desiredX = go.arrived ? p.mx : go.x; desiredY = go.arrived ? p.my : go.y;
      if (target) { p.aim = Math.atan2(target.y - p.my, target.x - p.mx); }
    } else if (focus) {
      /* Ordered attack: go straight for the clicked enemy, ignoring the
       * normal roam leash, until it dies or the tamer runs too far off. */
      var fd = Math.sqrt(dist2(p.mx, p.my, focus.x, focus.y)), fw;
      if (focus.pvpOf && fd <= L.holdRange + 90) { fw = this._duelStep(p, focus, dt); desiredX = fw.x; desiredY = fw.y; }
      else if (fd > L.holdRange) { desiredX = focus.x; desiredY = focus.y; }
      else { desiredX = p.mx; desiredY = p.my; }
      p.aim = Math.atan2(focus.y - p.my, focus.x - p.mx);
      if (focus.x !== p.mx) p.mfacing = focus.x < p.mx ? -1 : 1;
    } else if (this._isEgg(p.form) && p.hasTamer) {
      desiredX = p.x - p.facing * Math.min(L.offsetBehind || 36, 32);
      desiredY = p.y + 8;
    } else if (!p.hasTamer) {
      desiredX = p.mx; desiredY = p.my;
    } else if (target && target.pvpOf && !(p.moving && dTamer > (L.runClose || 54)) && dTamer < L.returnRadius * 1.4) {
      /* PvP (Nov 21): on its toes round the other partner, but never further than its leash from you */
      var dw = this._duelStep(p, target, dt), lx = dw.x - p.x, ly = dw.y - p.y, ll = Math.sqrt(lx * lx + ly * ly), lim = L.roamRadius || 130;
      if (ll > lim) {
        /* can't circle that far: side-step to and fro along the edge of its range instead */
        var ta = Math.atan2(target.y - p.y, target.x - p.x) + (p.duelDir || 1) * (p.duelDash > 0 ? 0.55 : 0.3);
        dw = { x: p.x + Math.cos(ta) * lim * 0.9, y: p.y + Math.sin(ta) * lim * 0.9 };     /* on the side facing it, so its moves still reach */
      }
      desiredX = dw.x; desiredY = dw.y;
      p.aim = Math.atan2(target.y - p.my, target.x - p.mx);
      if (target.x !== p.mx) p.mfacing = target.x < p.mx ? -1 : 1;
    } else if (dTamer > L.returnRadius || (p.moving && dTamer > (L.runClose || 54))) {
      /* While the tamer is on the move the partner runs with it (still
       * firing), so leading it away from a crowd actually works. Stand
       * still and it digs in and fights. */
      desiredX = p.x - p.facing * L.offsetBehind;
      desiredY = p.y + 6;
      following = true;
    } else if (target && dTamer < L.roamRadius) {
      var ed = Math.sqrt(dist2(p.mx, p.my, target.x, target.y)), tw;
      if (target.pvpOf && ed <= L.holdRange + 90) { tw = this._duelStep(p, target, dt); desiredX = tw.x; desiredY = tw.y; }
      else if (ed > L.holdRange) { desiredX = target.x; desiredY = target.y; }
      else { desiredX = p.mx; desiredY = p.my; }
      p.aim = Math.atan2(target.y - p.my, target.x - p.mx);
      if (target.x !== p.mx) p.mfacing = target.x < p.mx ? -1 : 1;
    } else {
      desiredX = p.x - p.facing * L.offsetBehind;
      desiredY = p.y + 6;
      following = true;
    }
    /* Warp burst: dart from enemy to enemy instead of holding a spot */
    var BUm = p.burstLeft > 0 ? this._burstCfg(p) : null, bt;
    if (BUm && BUm.style === "striker" && !this._isEgg(p.form)) {
      bt = (focus && !focus.dead) ? focus : this._nearestInReach(p.mx, p.my, BUm.seek);
      if (bt && dist2(bt.x, bt.y, p.x, p.y) < Math.pow(BUm.seek * 1.4, 2)) {
        desiredX = bt.x - (bt.x < p.mx ? -1 : 1) * ((bt.radius || 10) + 16); desiredY = bt.y; following = false;
        p.mfacing = bt.x < p.mx ? -1 : 1;
      }
    }
    var dest = this._snap(desiredX, desiredY, rad, 160, this._crossOf(p.form));
    var vx = dest.x - p.mx, vy = dest.y - p.my;
    var vd = Math.sqrt(vx * vx + vy * vy);
    var spd = 90;
    var sp = this.data && this.data.SPECIES && this.data.SPECIES[p.form] && this.data.SPECIES[p.form].base;
    if (sp && sp.speed) spd = sp.speed * 1.15;
    spd = Math.max(spd, (this._tamer().speed || 160) * 1.04 * ((p.stats && p.stats.speedMul) || 1));
    spd *= (p.stats && p.stats.monSpeedMul) || 1;
    if (BUm) spd *= BUm.speedMul;
    /* Running with the tamer: keep pace (it still fires on the way). */
    if (following && p.hasTamer) {
      var ts = (this._tamer().speed || 168) * ((p.stats && p.stats.speedMul) || 1);
      spd = Math.max(spd, ts * 1.08);
    }
    if (vd > 4) {
      var step = Math.min(vd, spd * dt);
      var pcr = this._crossOf(p.form), pos = this._slide(p.mx, p.my, vx / vd * step, vy / vd * step, rad, pcr);
      if (pcr && this._leashed(p, pos)) pos = { x: p.mx, y: p.my };
      p.monMoving = Math.abs(pos.x - p.mx) + Math.abs(pos.y - p.my) > 0.2;
      p.mx = pos.x; p.my = pos.y;
    } else p.monMoving = false;
  };

  /* A partner that can fly or swim may go out over the water, but not further than
   * LIVING.leash from its tamer while it is over it (the tamer still needs a ford or ice). */
  MissionSim.prototype._leashed = function (p, pos) {
    var w = this.data.world, L = (this.data.LIVING && this.data.LIVING.leash) || 220;
    if (!p.hasTamer || !w || !w.openWaterAt || !(w.openWaterAt(pos.x, pos.y) || (w.hazardNear && w.hazardNear(pos.x, pos.y, 2)))) return false;
    var dNew = dist2(pos.x, pos.y, p.x, p.y), dOld = dist2(p.mx, p.my, p.x, p.y);
    return dNew > L * L && dNew > dOld;
  };

  /* Is anything that would fight this tamer within r of them or their partner? (asleep, trusting or
   * fighting at their side doesn't count) — the farm can't be reached with one this close. */
  MissionSim.prototype._hostileNear = function (p, r) {
    var i, e, fac, r2 = r * r;
    for (i = 0; i < this.enemies.length; i++) {
      e = this.enemies[i];
      if (e.dead || e.zz || e.rally === p.id) continue;
      fac = this._factionOf ? this._factionOf(e) : null;
      if (fac && this._trusts && this._trusts(p, fac)) continue;
      if (dist2(e.x, e.y, p.x, p.y) < r2 || dist2(e.x, e.y, p.mx, p.my) < r2) return e;
    }
    return null;
  };

  MissionSim.prototype._moveCpu = function (c, dt) {
    c.invuln = Math.max(0, (c.invuln || 0) - dt);
    if (c.hp <= 0) return;
    var rad = this._actorRad(c.form);
    var heal = (c.hp / c.maxHp < 0.55) ? this._nearestOrb(c.x, c.y, "heal") : null;
    var target = this._nearestEnemy(c.x, c.y);
    var desiredX = c.x, desiredY = c.y;
    var host = this.player(this.localId) || this.players[0];
    if (heal) { desiredX = heal.x; desiredY = heal.y; }
    else if (target) {
      var ed = Math.sqrt(dist2(c.x, c.y, target.x, target.y));
      if (ed > 64) { desiredX = target.x; desiredY = target.y; }
      else if (ed < 28) { desiredX = c.x - (target.x - c.x); desiredY = c.y - (target.y - c.y); }
      if (target.x !== c.x) c.facing = target.x < c.x ? -1 : 1;
    } else if (host) {
      var dParty = Math.sqrt(dist2(c.x, c.y, host.mx, host.my));
      if (dParty > 420) { desiredX = host.mx; desiredY = host.my; }
    }
    var vx = desiredX - c.x, vy = desiredY - c.y;
    var l = len(vx, vy);
    var spd = 72;
    var sp = this.data && this.data.SPECIES && this.data.SPECIES[c.form] && this.data.SPECIES[c.form].base;
    if (sp && sp.speed) spd = sp.speed * 1.02;
    if (l > 4) {
      var pos = this._slide(c.x, c.y, (vx / l) * spd * dt, (vy / l) * spd * dt, rad, this._crossOf(c.form));
      c.moving = Math.abs(pos.x - c.x) + Math.abs(pos.y - c.y) > 0.2;
      c.x = pos.x; c.y = pos.y;
    } else c.moving = false;
    if (!this._isEgg(c.form)) this._fireFrom(c, dt, c.x, c.y, target, c.weapon);
  };

  MissionSim.prototype._enemyById = function (id) {
    if (id == null) return null;
    for (var i = 0; i < this.enemies.length; i++) {
      if (this.enemies[i]._id === id && !this.enemies[i].dead) return this.enemies[i];
    }
    return null;
  };

  MissionSim.prototype._setGo = function (pid, pt) {
    var p = this.player(pid), L = this._leash();
    if (!p || !pt || this._isEgg(p.form) || p.downed) return false;
    var x = +pt[0], y = +pt[1];
    if (!isFinite(x) || !isFinite(y)) return false;
    /* only somewhere near the tamer: this is for calling it in, not scouting */
    var max = L.goRadius || 300, dx = x - p.x, dy = y - p.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d > max) { x = p.x + dx / d * max; y = p.y + dy / d * max; }
    var s = this._snap(x, y, this._actorRad(p.form), 120);
    p.goTo = { x: s.x, y: s.y, hold: L.goHold || 0.75, left: 5, arrived: false };
    p.focusId = null; p.strike = null;
    this.emit({ type: "go", id: p.id, x: s.x, y: s.y });
    return true;
  };

  /* 17z33: attack a spot on the ground (data.js GROUND_STRIKE) */
  MissionSim.prototype._setStrike = function (pid, pt) {
    var p = this.player(pid), GS = this.data.GROUND_STRIKE || {}, x, y, dx, dy, d, max = GS.maxRange || 380;
    if (!p || !pt || this._isEgg(p.form) || p.downed || p.faint > 0) return false;
    x = +pt[0]; y = +pt[1];
    if (!isFinite(x) || !isFinite(y)) return false;
    dx = x - p.x; dy = y - p.y; d = Math.sqrt(dx * dx + dy * dy);
    if (d > max) { x = p.x + dx / d * max; y = p.y + dy / d * max; }
    p.strike = { x: x, y: y, left: GS.sec || 3 };
    p.focusId = null; p.goTo = null; p.pvpFocus = null;
    this.emit({ type: "strike", id: p.id, x: Math.round(x), y: Math.round(y) });
    return true;
  };
  /* what a move leaves where it lands on the ground: the same patches as on a hit, but every time */
  MissionSim.prototype._strikeGround = function (g) {
    var p = this.player(g.owner), w = this.data.world, I = w && w.ICE;
    if (!p) return;
    if (g.el === "ice" && w && w.openWaterAt && w.waterNear && w.waterNear(g.x, g.y, 30)) this._freezeWater(g.x, g.y, (I && I.shotR) || 40, this.time + ((I && I.bridgeSec) || 30));
    this._maybePatch(g.x, g.y, g.el, g.dmg, p, g.wid, true);
    this.emit({ type: "fx", k: "land", w: g.wid, x: Math.round(g.x), y: Math.round(g.y), el: g.el || null });
  };

  /* clicked the other tamer's partner (PvP): an ordinary attack order on its stand-in (pvp-sim.js) */
  MissionSim.prototype._setPvpFocus = function (pid, foeId, quiet) {
    var p = this.player(pid), f = this.player(String(foeId)), px;
    if (!p || !f || f === p || !this._pvpFoes || !this._pvpFoes(p, f)) return false;
    this._pvpProxies = this._pvpProxies || {};
    px = this._pvpProxies[f.id] || (this._pvpProxies[f.id] = { _id: -1000 - this.players.indexOf(f), pvpOf: f.id, st: 0, hitCd: 0 });
    p.pvpFocus = f.id; p.focusId = px._id; p.goTo = null;
    if (!quiet) this.emit({ type: "focus", id: p.id, pvp: f.id, x: f.mx, y: f.my });   /* quiet: chosen for it (versus-sim.js), not clicked */
    return true;
  };
  MissionSim.prototype._setFocus = function (pid, enemyId) {
    var p = this.player(pid);
    if (!p) return false;
    p.strike = null;
    if (enemyId != null && enemyId !== -1) p.goTo = null;
    if (enemyId == null || enemyId === -1) { p.focusId = null; return true; }
    var e = this._enemyById(+enemyId);
    if (!e) return false;
    p.focusId = e._id;
    this.emit({ type: "focus", id: p.id, enemyId: e._id, x: e.x, y: e.y });
    return true;
  };

  MissionSim.prototype._nearestEnemy = function (x, y) {
    var i, e, best = null, bestD = 1e15, d, me = this._actor;
    for (i = 0; i < this.enemies.length; i++) {
      e = this.enemies[i];
      if (e.dead || (e.pvpOf && this._pvpSkip(me, e)) || (me && !e.pvpOf && this._spares && this._spares(me.id, e))) continue;
      d = dist2(x, y, e.x, e.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  };

  MissionSim.prototype._nearestOrb = function (x, y, kind) {
    var i, o, best = null, bestD = 1e15, d;
    for (i = 0; i < this.orbs.length; i++) {
      o = this.orbs[i];
      if (kind && o.kind !== kind) continue;
      d = dist2(x, y, o.x, o.y);
      if (d < bestD) { bestD = d; best = o; }
    }
    return best;
  };

  MissionSim.prototype._weaponDef = function (id) {
    var W = this.data && this.data.WEAPONS;
    if (W && W[id]) return W[id];
    return {
      type: "projectile", color: "#ffe080",
      levels: [{ damage: 10, cooldown: 0.7, count: 1, speed: 340, pierce: 0, radius: 6, spread: 0.16, knockback: 40, life: 1.2 }],
      maxLevel: 1
    };
  };

  /* is this move a Mega's main move (its primary line), for MEGA_PUNCH? cached per form */
  MissionSim.prototype._megaPunch = function (form, id) {
    var d = this.data, c, list, i;
    if (!d.MEGA_PUNCH || !d.moveChain || !d.moveStageIdx || d.moveStageIdx(form) < 5) return false;
    c = (this._punchOf = this._punchOf || {})[form];
    if (!c) { c = {}; list = d.moveChain(form).primary || []; for (i = 0; i < list.length; i++) c[list[i].id] = 1; this._punchOf[form] = c; }
    return !!c[id];
  };
  MissionSim.prototype._fireFrom = function (owner, dt, ox, oy, target, weapon) {
    if (!weapon) return;
    var def = this._weaponDef(weapon.id);
    if (!def || !def.levels || !def.levels.length) def = this._weaponDef(null);
    var lv = def.levels[Math.min(weapon.level || 1, def.maxLevel || def.levels.length) - 1] || def.levels[0];
    var oStats = owner && owner.stats;
    var dmgMul = (oStats && oStats.damageMul) || 1;
    /* claws and bites are physical (Strength); everything else is special (Intelligence) */
    if (oStats) dmgMul *= (def.type === "arc" ? oStats.physMul : oStats.specMul) || 1;
    dmgMul *= weapon.bonus || 1;   /* skill levels between a move's power steps */
    /* signatures and techniques grow with the partner's stage (moves.js GROW) */
    if (def.grows && owner && owner.form && this.data.MOVE_GROW && this.data.moveStageIdx) dmgMul *= this.data.MOVE_GROW[Math.max(0, Math.min(5, this.data.moveStageIdx(owner.form)))] || 1;
    if (owner && owner.form && this._megaPunch(owner.form, def.id)) dmgMul *= this.data.MEGA_PUNCH;   /* a Mega's main move hits harder */
    var BU = owner && owner.burstLeft > 0 ? this._burstCfg(owner) : null;
    if (BU) dmgMul *= BU.damageMul;
    if (def.type === "orbit") { this._orbitHit(ox, oy, def, lv, owner, dmgMul); return; }
    weapon.cd = (weapon.cd || 0) - dt;
    if (weapon.cd > 0) return;
    weapon.cd = weapon.cdMax = (lv.cooldown || 0.7) * Math.max(0.35, ((oStats && oStats.cooldownMul) || 1) * ((oStats && (def.type === "arc" ? oStats.physCdMul : oStats.specCdMul)) || 1)) * ((this.data.MOVE_PACE && this.data.MOVE_PACE.cooldownMul) || 1) * (BU ? BU.cooldownMul : 1);
    var ang = 0;
    if (target) ang = Math.atan2(target.y - oy, target.x - ox);
    var count = lv.count || 1;
    var spread = lv.spread || 0.15;
    var mid = (count - 1) / 2;
    var i, a, sp, life;
    if (def.type === "aura") {
      this._auraHit(ox, oy, lv, owner, def.id, dmgMul);
      return;
    }
    if (def.type === "arc") {
      this.arcs.push({ angle: ang, range: lv.range || 80, arc: lv.arc || 1, damage: lv.damage * dmgMul, knockback: lv.knockback || 0, life: lv.duration || 0.2, max: lv.duration || 0.2, color: def.color, wid: def.id, hit: {}, ownerId: owner.id });
      return;
    }
    if (def.type === "burst" || def.type === "beam" || def.type === "chain" || def.type === "strike" || def.type === "mine" || def.type === "boomerang" || def.type === "march") {
      if (def.charge && !BU) {
        this._casts = this._casts || [];
        this._casts.push({ kind: "kit", t: def.charge, ownerId: owner.id, def: def, lv: lv, x: ox, y: oy, a: ang, tid: target ? target._id : null, dmgMul: dmgMul });
        this.emit({ type: "fx", k: "charge", w: def.id, x: ox + Math.cos(ang) * 16, y: oy + Math.sin(ang) * 16 - 6, t: def.charge, r: Math.max(8, (lv.width || 24) * 0.4) });
        return;
      }
      this._fireKit(def, lv, owner, ox, oy, target, ang, dmgMul);
      return;
    }
    /* a move that is gathered before it is thrown (Terra Force): the shot leaves a moment later */
    if (def.charge && !BU) {
      this._casts = this._casts || [];
      this._casts.push({ kind: "shots", t: def.charge, ownerId: owner.id, def: def, lv: lv, x: ox, y: oy - 34, a: ang, tid: target ? target._id : null, dmgMul: dmgMul });
      this.emit({ type: "fx", k: "charge", w: def.id, x: ox, y: oy - 34, t: def.charge, r: lv.radius || 16 });
      return;
    }
    this._shots(def, lv, owner.id, ox, oy, ang, dmgMul, (BU && BU.explode) || 0);
  };

  /* the bullets of one cast. lv.boost: the shot changes partway (Harpoon
   * Torpedo: the horn splits and the torpedo inside lights up). */
  MissionSim.prototype._shots = function (def, lv, ownerId, ox, oy, ang, dmgMul, burstExplode) {
    var count = lv.count || 1, spread = lv.full ? (Math.PI * 2) / count : (lv.spread || 0.15), mid = (count - 1) / 2, i, a, sp = lv.speed || 320, life = lv.life || 1.2, b;
    for (i = 0; i < count; i++) {
      a = ang + (lv.full ? i : i - mid) * spread;
      /* lv.jitter: a stream that sprays a little (Gatling Attack) */
      if (lv.jitter) a += Math.sin(this.time * 97.3 + i * 5.1) * lv.jitter;
      b = {
        x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        damage: lv.damage * dmgMul, pierce: lv.pierce || 0, radius: lv.radius || 6,
        life: life, knockback: lv.knockback || 0, ownerId: ownerId,
        color: def.color, homing: lv.boost ? 0 : (lv.homing || 0), explode: Math.max(lv.explode || 0, burstExplode || 0), wid: def.id,
        kind: def.type === "nova" ? "nova" : (def.type === "missile" ? "missile" : "projectile")
      };
      /* lv.turn: it steers (so many radians a second) and keeps its speed, instead of being pulled */
      if (lv.turn) { b.homing = 0; b.turn = lv.boost ? 0 : lv.turn; b.turnWait = lv.turnDelay || 0; }
      /* lv.once: it passes through and hits each enemy once; lv.tick: once every so often (Fire Tornado) */
      if (lv.once || lv.tick) { b.once = {}; b.pierce = 999; if (lv.tick) { b.tick = lv.tick; b.tickT = lv.tick; } }
      else if (lv.single && b.pierce) b.once = {};   /* pierces, but cuts each enemy only once on the way through */
      if (lv.boost) { b.boostAt = life - lv.boost; b.boostMul = lv.boostMul || 2; b.boostHoming = lv.turn ? 0 : (lv.homing || 0); b.boostTurn = lv.turn || 0; }
      this.bullets.push(b);
    }
    this.emit({ type: "fx", k: "cast", w: def.id, x: ox, y: oy, a: ang });
  };

  /* Signatures and techniques (moves.js KIT): the kinds of attack that are
   * not a plain shot, claw, aura or orbit. */
  MissionSim.prototype._fireKit = function (def, lv, owner, ox, oy, target, ang, dmgMul) {
    var i, e, dx, dy, d, r, dmg = (lv.damage || 8) * dmgMul, wid = def.id, self = this;
    if (def.type === "burst") {
      r = lv.radius || 60;
      this.emit({ type: "fx", k: "burst", w: wid, x: ox, y: oy, r: r });
      for (i = 0; i < this.enemies.length; i++) {
        e = this.enemies[i];
        if (e.dead) continue;
        dx = e.x - ox; dy = e.y - oy;
        if (dx * dx + dy * dy <= (r + e.radius) * (r + e.radius)) this.hurtEnemy(e, dmg, dx || 1, dy, lv.knockback || 0, owner, null, wid);
      }
      return;
    }
    if (def.type === "march") {
      /* a row of bursts walking out from the partner toward the target (Hammer Spark) */
      if (!target) return;
      var mn = lv.count || 3, mstep = lv.step || 46;
      this._strikes = this._strikes || [];
      this.emit({ type: "fx", k: "slam", w: wid, x: ox, y: oy, a: ang });
      for (i = 0; i < mn; i++) this._strikes.push({ x: ox + Math.cos(ang) * mstep * (i + 1), y: oy + Math.sin(ang) * mstep * (i + 1), t: 0.08 + i * (lv.gap || 0.1), r: lv.explode || 36, damage: dmg, knockback: lv.knockback || 0, ownerId: owner.id, wid: wid, zap: def.land === "erupt" ? 0 : 1, erupt: def.land === "erupt" ? 1 : 0 });
      return;
    }
    if (def.type === "beam" && (lv.fork || lv.twin) && !this._split) {
      /* two at once: crossing (Vee Laser) or side by side (Atomic Blaster) */
      this._split = 1;
      if (lv.fork) { this._fireKit(def, lv, owner, ox, oy, target, ang - lv.fork, dmgMul); this._fireKit(def, lv, owner, ox, oy, target, ang + lv.fork, dmgMul); }
      else { this._fireKit(def, lv, owner, ox - Math.sin(ang) * lv.twin, oy + Math.cos(ang) * lv.twin, target, ang, dmgMul); this._fireKit(def, lv, owner, ox + Math.sin(ang) * lv.twin, oy - Math.cos(ang) * lv.twin, target, ang, dmgMul); }
      this._split = 0;
      return;
    }
    if (def.type === "beam") {
      var L = lv.range || 120, half = (lv.width || 16) / 2, cx = Math.cos(ang), cy = Math.sin(ang), along, off;
      /* a move that keeps blowing (Arctic Blizzard): the same beam again, a beat apart */
      if (lv.pulses > 1 && !this._pulsing) {
        this._casts = this._casts || [];
        for (i = 1; i < lv.pulses; i++) this._casts.push({ kind: "beam", t: i * (lv.gap || 0.14), ownerId: owner.id, def: def, lv: lv, x: ox, y: oy, a: ang, dmgMul: dmgMul, n: i });
      }
      this.emit({ type: "fx", k: "beam", w: wid, x: ox, y: oy, a: ang, len: L, wd: half * 2, cone: lv.cone ? 1 : 0, n: this._pulsing || 0, of: lv.pulses || 1 });
      for (i = 0; i < this.enemies.length; i++) {
        e = this.enemies[i];
        if (e.dead) continue;
        dx = e.x - ox; dy = e.y - oy;
        along = dx * cx + dy * cy;
        if (along < -e.radius || along > L + e.radius) continue;
        off = Math.abs(dx * cy - dy * cx);
        if (off > half * (lv.cone ? 0.3 + 0.7 * Math.max(0, along) / L : 1) + e.radius) continue;
        if (this.hurtEnemy(e, dmg, cx, cy, lv.knockback || 0, owner, null, wid) !== false) this.emit({ type: "fx", k: lv.cone ? "spike" : "tick", w: wid, x: e.x, y: e.y, r: e.radius });
      }
      return;
    }
    if (def.type === "chain") {
      if (!target) return;
      var pts = [Math.round(ox), Math.round(oy)], cur = target, seen = {}, hop, best, bd, jump = lv.jump || 90, fall = 1;
      for (hop = 0; hop <= (lv.hops || 2) && cur; hop++) {
        seen[cur._id] = 1;
        pts.push(Math.round(cur.x), Math.round(cur.y));
        this.hurtEnemy(cur, dmg * fall, cur.x - pts[pts.length - 4], cur.y - pts[pts.length - 3], lv.knockback || 0, owner, null, wid);
        fall *= 0.85;
        best = null; bd = 1e15;
        for (i = 0; i < this.enemies.length; i++) {
          e = this.enemies[i];
          if (e.dead || seen[e._id]) continue;
          d = dist2(cur.x, cur.y, e.x, e.y);
          if (d <= (jump + e.radius) * (jump + e.radius) && d < bd) { bd = d; best = e; }
        }
        cur = best;
      }
      this.emit({ type: "fx", k: "chain", w: wid, x: ox, y: oy, pts: pts });
      return;
    }
    if (def.type === "strike") {
      if (!target) return;
      this._strikes = this._strikes || [];
      var sn = lv.count || 1, sx, sy, sa, sd;
      for (i = 0; i < sn; i++) {
        sx = target.x; sy = target.y; sd = (lv.delay || 0.4) + i * (lv.gap || 0);
        if (lv.pattern === "ring") {
          /* rings of them round the partner, the second ring further out and later */
          sa = ang + (Math.PI * 2 * i) / (lv.per || sn) + (i >= (lv.per || sn) ? Math.PI / (lv.per || sn) : 0);
          sd = (lv.delay || 0.3) + (i >= (lv.per || sn) ? 0.16 : 0);
          sx = ox + Math.cos(sa) * (lv.ring || 70) * (i >= (lv.per || sn) ? 1.8 : 1); sy = oy + Math.sin(sa) * (lv.ring || 70) * (i >= (lv.per || sn) ? 1.8 : 1);
        } else if (i > 0) {
          /* the first on the target, the rest scattered round it */
          sa = this.time * 7.7 + i * 2.4;
          sx += Math.cos(sa) * (lv.scatter || 0) * (0.55 + 0.45 * Math.abs(Math.sin(i * 3.3 + this.time)));
          sy += Math.sin(sa) * (lv.scatter || 0) * (0.55 + 0.45 * Math.abs(Math.sin(i * 3.3 + this.time)));
        }
        this._strikes.push({ x: sx, y: sy, t: sd, r: lv.explode || 40, damage: dmg, knockback: lv.knockback || 0, ownerId: owner.id, wid: wid, zap: def.land === "zap" ? 1 : 0, erupt: def.land === "erupt" ? 1 : 0 });
        if (def.land !== "zap") this.emit({ type: "fx", k: "drop", w: wid, x: sx, y: sy, t: sd, r: lv.explode || 40, up: def.drop === "rise" ? 1 : 0 });
      }
      return;
    }
    if (def.type === "mine") {
      /* tossed part of the way to the target; the oldest one goes when there are too many */
      var mx = ox, my = oy, mine = [], reach = 0.6;
      if (target) { mx = ox + (target.x - ox) * reach; my = oy + (target.y - oy) * reach; }
      for (i = 0; i < this.bullets.length; i++) if (this.bullets[i].mine && this.bullets[i].wid === wid && this.bullets[i].ownerId === owner.id) mine.push(this.bullets[i]);
      if (mine.length >= (lv.max || 2)) mine[0].life = 0;
      this.bullets.push({ x: mx, y: my, vx: 0, vy: 0, damage: dmg, pierce: 0, radius: lv.radius || 9, life: lv.life || 7, knockback: lv.knockback || 0, ownerId: owner.id,
        color: def.color, homing: 0, explode: lv.explode || 40, wid: wid, kind: "projectile", mine: true });
      this.emit({ type: "fx", k: "cast", w: wid, x: mx, y: my, a: -Math.PI / 2 });
      return;
    }
    if (def.type === "boomerang") {
      var sp = lv.speed || 280, out = lv.out || 0.5;
      this.bullets.push({ x: ox, y: oy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, damage: dmg, pierce: 999, radius: lv.radius || 8, life: out * 3.2, knockback: lv.knockback || 0, ownerId: owner.id,
        color: def.color, homing: 0, explode: 0, wid: wid, kind: "projectile", back: out * 2.2, once: {} });
      this.emit({ type: "fx", k: "cast", w: wid, x: ox, y: oy, a: ang });
      return;
    }
    void self;
  };

  /* Orbit moves: the orbs circle the partner on the shared clock (so every
   * screen draws them in the same place) and hurt what they touch. */
  MissionSim.prototype._orbitHit = function (ox, oy, def, lv, owner, dmgMul) {
    var count = lv.count || 1, R = lv.radius || 48, size = lv.size || 8, spin = this.time * (lv.spin || 2.4);
    var cd = (lv.cooldown || 0.25) * ((this.data.MOVE_PACE && this.data.MOVE_PACE.cooldownMul) || 1);
    if (owner && owner.stats) cd *= Math.max(0.35, (owner.stats.cooldownMul || 1) * (owner.stats.specCdMul || 1));   /* orbs are special moves */
    var i, j, e, a, dx, dy, rr;
    for (i = 0; i < this.enemies.length; i++) {
      e = this.enemies[i];
      if (e.dead) continue;
      rr = (size + e.radius) * (size + e.radius);
      for (j = 0; j < count; j++) {
        a = spin + (Math.PI * 2 * j) / count;
        dx = e.x - (ox + Math.cos(a) * R); dy = e.y - (oy + Math.sin(a) * R);
        if (dx * dx + dy * dy > rr) continue;
        e._orb = e._orb || {};
        if (e._orb[owner.id + def.id] != null && this.time - e._orb[owner.id + def.id] < cd) continue;
        e._orb[owner.id + def.id] = this.time;
        this.emit({ type: "fx", k: "hit", w: def.id, x: e.x, y: e.y, a: Math.atan2(dy, dx) });
        this.hurtEnemy(e, lv.damage * dmgMul, dx, dy, 30, owner, null, def.id);
        break;
      }
    }
  };

  MissionSim.prototype._auraHit = function (ox, oy, lv, owner, wid, dmgMul) {
    var i, e, r = lv.radius || 52;
    this.emit({ type: "fx", k: "pulse", w: wid, x: ox, y: oy, r: r });
    for (i = 0; i < this.enemies.length; i++) {
      e = this.enemies[i];
      if (e.dead) continue;
      if (dist2(ox, oy, e.x, e.y) <= (r + e.radius) * (r + e.radius)) {
        this.emit({ type: "fx", k: "tick", w: wid, x: e.x, y: e.y });
        this.hurtEnemy(e, lv.damage * (dmgMul || 1), e.x - ox, e.y - oy, 20, owner, null, wid);
      }
    }
  };

  /* How far a weapon's attack actually reaches from the partner. */
  MissionSim.prototype._weaponReach = function (w) {
    var def = this._weaponDef(w.id);
    if (!def || !def.levels || !def.levels.length) def = this._weaponDef(null);
    var lv = def.levels[Math.min(w.level || 1, def.maxLevel || def.levels.length) - 1] || def.levels[0];
    if (def.type === "aura" || def.type === "burst") return (lv.radius || 52) * (def.type === "burst" ? 0.8 : 1);
    if (def.type === "arc" || def.type === "beam" || def.type === "chain" || def.type === "strike" || def.type === "mine") return lv.range || 80;
    if (def.type === "march") return (lv.step || 46) * ((lv.count || 3) + 0.5);
    if (def.type === "boomerang") return (lv.speed || 280) * (lv.out || 0.5);
    var r = (lv.speed || 320) * (lv.life || 1.2) + (lv.radius || 6);
    return lv.homing ? r * 1.3 : r;
  };

  /* Nearest live enemy to (x, y) whose edge is within `reach`. */
  MissionSim.prototype._nearestInReach = function (x, y, reach) {
    var i, e, best = null, bestD = 1e15, d, rr, me = this._actor;
    for (i = 0; i < this.enemies.length; i++) {
      e = this.enemies[i];
      if (e.dead || (e.pvpOf && this._pvpSkip(me, e)) || (me && !e.pvpOf && this._spares && this._spares(me.id, e))) continue;
      d = dist2(x, y, e.x, e.y);
      rr = reach + (e.radius || 10);
      if (d <= rr * rr && d < bestD) { bestD = d; best = e; }
    }
    return best;
  };

  /* The partner attacks on the move: each weapon aims at something it can
   * actually reach from where the partner is (the clicked target first),
   * and holds its shot instead of wasting it on enemies out of range. */
  MissionSim.prototype._updateWeapons = function (p, dt) {
    if (p.faint > 0) return;
    if (this._isEgg(p.form)) return;
    if (p.choosing > 0) return;                 /* no free hits while the skill window is open */
    var i, w, target, reach, pref = p.monTarget, def, rr;
    var list = (p.burstLeft > 0 && p.burstWeapons && p.burstWeapons.length) ? p.burstWeapons : (p.weapons || []);
    for (i = 0; i < list.length; i++) {
      w = list[i];
      def = this._weaponDef(w.id) || {};
      reach = this._weaponReach(w);
      target = null;
      if (pref && !pref.dead) {
        rr = reach + (pref.radius || 10);
        if (dist2(p.mx, p.my, pref.x, pref.y) <= rr * rr) target = pref;
      }
      if (p.strike && !(p.burstLeft > 0)) {
        /* attacking a spot on the ground (17z33): every move goes there, if it reaches */
        rr = reach + 30;
        if (dist2(p.mx, p.my, p.strike.x, p.strike.y) > rr * rr || def.type === "aura" || def.type === "orbit") { w.cd = Math.max(0, (w.cd || 0) - dt); continue; }
        var cd0 = w.cd || 0, sx = p.strike.x, sy = p.strike.y;
        if (sx !== p.mx) p.mfacing = sx < p.mx ? -1 : 1;
        this._fireFrom(p, dt, p.mx, p.my, { x: sx, y: sy, radius: 6, ground: true }, w);
        if ((w.cd || 0) > cd0) {
          /* it fired: where it comes down, the ground takes its element (a moment later, as the move gets there) */
          var lvd = (def.levels && def.levels[Math.min(w.level || 1, def.levels.length) - 1]) || {};
          this._groundHits = this._groundHits || [];
          this._groundHits.push({ t: Math.min(0.6, Math.sqrt(dist2(p.mx, p.my, sx, sy)) / 420) + (def.charge || 0), x: sx, y: sy, owner: p.id, wid: w.id,
            el: this._shotElement({ wid: w.id, ownerId: p.id }), dmg: lvd.damage || 10 });
        }
        continue;
      }
      if (!target) target = this._nearestInReach(p.mx, p.my, reach);
      if (!target && (def.type === "projectile" || def.type === "arc" || !def.type || def.grows || def.type === "beam" || def.type === "march" || def.type === "missile")) {
        w.cd = Math.max(0, (w.cd || 0) - dt);
        continue;
      }
      if (target && target.x !== p.mx) p.mfacing = target.x < p.mx ? -1 : 1;
      this._fireFrom(p, dt, p.mx, p.my, target, w);
    }
  };

  MissionSim.prototype._updateBullets = function (dt) {
    var i, b, j, e, n, sp, hit, st, bo;
    /* moves aimed at the ground (17z33) coming down */
    for (i = (this._groundHits || []).length - 1; i >= 0; i--) {
      st = this._groundHits[i]; st.t -= dt;
      if (st.t > 0) continue;
      this._groundHits.splice(i, 1);
      this._strikeGround(st);
    }
    /* strikes on their way down (or up) */
    for (i = (this._strikes || []).length - 1; i >= 0; i--) {
      st = this._strikes[i];
      st.t -= dt;
      if (st.t > 0) continue;
      this._strikes.splice(i, 1);
      if (st.zap) this.emit({ type: "fx", k: "zap", w: st.wid, x: st.x, y: st.y, r: st.r });
      else if (st.erupt) this.emit({ type: "fx", k: "erupt", w: st.wid, x: st.x, y: st.y, r: st.r });
      else this.emit({ type: "fx", k: "boom", w: st.wid, x: st.x, y: st.y, a: -Math.PI / 2, r: st.r, q: 1 });
      this._explode(st.x, st.y, st.r, st.damage * 1.25, st.knockback, st.ownerId, st.wid);
    }
    /* casts that were gathered, or that keep coming */
    for (i = (this._casts || []).length - 1; i >= 0; i--) {
      st = this._casts[i];
      st.t -= dt;
      if (st.t > 0) continue;
      this._casts.splice(i, 1);
      bo = this.player(st.ownerId);
      if (bo && (bo.faint > 0 || bo.downed)) continue;
      if (st.kind === "kit") {
        e = null;
        for (j = 0; j < this.enemies.length; j++) if (this.enemies[j]._id === st.tid && !this.enemies[j].dead) e = this.enemies[j];
        if (!e) e = this._nearestInReach(bo ? bo.mx : st.x, bo ? bo.my : st.y, this._weaponReach({ id: st.def.id, level: 1 }) * 1.2);
        this._fireKit(st.def, st.lv, bo || { id: st.ownerId }, bo ? bo.mx : st.x, bo ? bo.my : st.y, e, e ? Math.atan2(e.y - (bo ? bo.my : st.y), e.x - (bo ? bo.mx : st.x)) : st.a, st.dmgMul);
      } else if (st.kind === "beam") {
        /* it follows the partner while it blows */
        this._pulsing = st.n;
        this._fireKit(st.def, st.lv, bo || { id: st.ownerId }, bo ? bo.mx : st.x, bo ? bo.my : st.y, null, st.a, st.dmgMul);
        this._pulsing = 0;
      } else {
        e = null;
        for (j = 0; j < this.enemies.length; j++) if (this.enemies[j]._id === st.tid && !this.enemies[j].dead) e = this.enemies[j];
        if (!e) e = this._nearestInReach(st.x, st.y, (st.lv.speed || 320) * (st.lv.life || 1.2));
        this._shots(st.def, st.lv, st.ownerId, st.x, st.y, e ? Math.atan2(e.y - st.y, e.x - st.x) : st.a, st.dmgMul, 0);
      }
    }
    for (i = this.bullets.length - 1; i >= 0; i--) {
      b = this.bullets[i];
      if (b.boostAt != null && b.life <= b.boostAt) {
        /* the shell comes off: faster, and now it hunts */
        b.boostAt = null;
        e = this._nearestEnemy(b.x, b.y);
        sp = len(b.vx, b.vy) * b.boostMul;
        n = e ? norm(e.x - b.x, e.y - b.y) : norm(b.vx, b.vy);
        b.vx = n.x * sp; b.vy = n.y * sp; b.homing = b.boostHoming; b.turn = b.boostTurn;
        this.emit({ type: "fx", k: "split", w: b.wid, x: b.x, y: b.y, a: Math.atan2(b.vy, b.vx) });
      }
      if (b.tick) { b.tickT -= dt; if (b.tickT <= 0) { b.tickT = b.tick; b.once = {}; } }
      if (b.turn && b.turnWait > 0) b.turnWait -= dt;
      else if (b.turn) {
        e = this._nearestEnemy(b.x, b.y);
        if (e) {
          sp = len(b.vx, b.vy);
          n = Math.atan2(e.y - b.y, e.x - b.x) - Math.atan2(b.vy, b.vx);
          while (n > Math.PI) n -= Math.PI * 2;
          while (n < -Math.PI) n += Math.PI * 2;
          b.turn += b.turn * dt * 1.2;   /* it turns tighter the longer it has been hunting, so it cannot circle for ever */
          n = Math.atan2(b.vy, b.vx) + Math.max(-b.turn * dt, Math.min(b.turn * dt, n));
          b.vx = Math.cos(n) * sp; b.vy = Math.sin(n) * sp;
        }
      }
      if (b.back != null) {
        /* a boomerang: out, then home to whoever threw it */
        bo = this.player(b.ownerId);
        if (b.back > 0 && b.life <= b.back) { b.back = 0; b.once = {}; b.miss = null; if (!bo) { b.vx = -b.vx; b.vy = -b.vy; } }
        if (b.back === 0 && bo) {
          sp = len(b.vx, b.vy) || 280;
          n = norm(bo.mx - b.x, bo.my - b.y);
          b.vx = n.x * sp; b.vy = n.y * sp;
          if (dist2(b.x, b.y, bo.mx, bo.my) < 18 * 18) b.life = 0;
        }
      }
      if (b.homing) {
        var t = this._nearestEnemy(b.x, b.y);
        if (t) {
          n = norm(t.x - b.x, t.y - b.y);
          b.vx += n.x * b.homing * 60 * dt;
          b.vy += n.y * b.homing * 60 * dt;
        }
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b._el === undefined) b._el = this._shotElement(b);
      if (b._el === "ice") this._iceTrail(b, dt);
      hit = false;
      for (j = 0; j < this.enemies.length; j++) {
        e = this.enemies[j];
        if (e.dead) continue;
        if (e.rival && b.ownerId === "rival") continue;
        if (this._spares && this._spares(b.ownerId, e)) continue;   /* passes through a biome that trusts you */
        if (b.miss && b.miss[e._id]) continue;
        if (b.once && b.once[e._id]) continue;
        if (dist2(b.x, b.y, e.x, e.y) <= (b.radius + e.radius) * (b.radius + e.radius)) {
          if (b.once) b.once[e._id] = 1;
          /* a dodged shot flies on past that enemy */
          var rl = this._roll(e, b.ownerId);
          if (!rl) { (b.miss || (b.miss = {}))[e._id] = 1; continue; }
          this.emit({ type: "fx", k: b.explode ? "boom" : "hit", w: b.wid, x: b.x, y: b.y, a: b.mine ? -Math.PI / 2 : Math.atan2(b.vy, b.vx), r: b.explode || 0, q: b.mine ? 1 : 0 });
          this.hurtEnemy(e, b.damage, b.vx, b.vy, b.knockback, { id: b.ownerId }, rl, b.wid);
          if (b.explode) this._explode(b.x, b.y, b.explode, b.damage * 0.6, b.knockback, b.ownerId, b.wid);
          if ((b.pierce || 0) <= 0) { hit = true; break; }
          b.pierce -= 1;
        }
      }
      if (hit || b.life <= 0) this.bullets.splice(i, 1);
    }
    for (i = this.arcs.length - 1; i >= 0; i--) {
      var a = this.arcs[i];
      a.life -= dt;
      var host = this.player(a.ownerId) || this.players[0];
      var ox = host ? host.mx : 0, oy = host ? host.my : 0;
      for (j = 0; j < this.enemies.length; j++) {
        e = this.enemies[j];
        if (e.dead) continue;
        var dx = e.x - ox, dy = e.y - oy;
        var d = len(dx, dy);
        if (d > a.range + e.radius) continue;
        var ang = Math.atan2(dy, dx) - a.angle;
        while (ang > Math.PI) ang -= Math.PI * 2;
        while (ang < -Math.PI) ang += Math.PI * 2;
        if (Math.abs(ang) <= a.arc / 2 + 0.15) {
          var key = e._id;
          if (a.hit[key]) continue;
          a.hit[key] = true;
          this.emit({ type: "fx", k: "slash", w: a.wid, x: e.x, y: e.y, a: Math.atan2(dy, dx) });
          this.hurtEnemy(e, a.damage, dx, dy, a.knockback, host, null, a.wid);
        }
      }
      if (a.life <= 0) this.arcs.splice(i, 1);
    }
  };

  MissionSim.prototype._explode = function (x, y, radius, damage, knock, ownerId, wid) {
    var i, e, dx, dy, d;
    this._fellTrees(x, y, radius);
    for (i = 0; i < this.enemies.length; i++) {
      e = this.enemies[i];
      if (e.dead) continue;
      dx = e.x - x; dy = e.y - y; d = len(dx, dy);
      if (d < radius + e.radius) this.hurtEnemy(e, damage * (1 - d / (radius + 40)), dx, dy, knock, { id: ownerId }, null, wid);
    }
  };

  /* Push the enemy away from the hit: a velocity impulse that eases out,
   * so the shove is visible instead of a teleport. */
  /* Stronger pushes from more evolved attackers (partner, ally or CPU). */
  MissionSim.prototype._knockStageMul = function (owner) {
    var K = this.data && this.data.KNOCKBACK, table = K && K.stageMul;
    var fn = this.data && this.data.partnerStageIdx;
    if (!table || !fn) return 1;
    var id = owner && owner.id, form = null, i;
    if (id != null) {
      var pl = this.player(id);
      if (pl) form = pl.form;
      else if (this.ally && this.ally.id === id) form = this.ally.form;
      else for (i = 0; i < this.cpus.length; i++) if (this.cpus[i] && this.cpus[i].id === id) form = this.cpus[i].form;
    }
    if (!form) { var host = this.player(this.localId) || this.players[0]; form = host && host.form; }
    if (!form) return 1;
    var idx = Math.max(0, Math.min(table.length - 1, fn(form)));
    return table[idx];
  };

  MissionSim.prototype._knockback = function (e, kbX, kbY, knock, stageMul) {
    var K = (this.data && this.data.KNOCKBACK) || { scale: 22, min: 10, decay: 11, bossMul: 0.3, megaMul: 0.15, eliteMul: 0.6, maxSpeed: 520, stun: 0.12 };
    var l = Math.sqrt((kbX || 0) * (kbX || 0) + (kbY || 0) * (kbY || 0));
    if (l < 0.0001) return;
    var power = Math.max(K.min || 0, knock || 0) * (K.scale || 22) * (stageMul == null ? 1 : stageMul);
    var def = this._enemies()[e.type] || {};
    if (e.mega) power *= K.megaMul;
    else if (e.boss || def.boss) power *= K.bossMul;
    else if (def.elite) power *= K.eliteMul;
    e.kvx = (e.kvx || 0) + (kbX / l) * power;
    e.kvy = (e.kvy || 0) + (kbY / l) * power;
    var sp = Math.sqrt(e.kvx * e.kvx + e.kvy * e.kvy), mx = K.maxSpeed || 520;
    if (sp > mx) { e.kvx *= mx / sp; e.kvy *= mx / sp; }
    e.kbStun = Math.max(e.kbStun || 0, K.stun || 0.12);
  };

  /* Enemies may touch a Digimon but never stand inside it. */
  MissionSim.prototype._separateFrom = function (e, x, y, rad) {
    var dx = e.x - x, dy = e.y - y;
    var min = (e.radius || 10) + rad;
    var d2 = dx * dx + dy * dy;
    if (d2 >= min * min) return;
    var d = Math.sqrt(d2);
    if (d < 0.001) { var a = (e._id || 1) * 2.399; dx = Math.cos(a); dy = Math.sin(a); d = 1; }
    var nx = dx / d, ny = dy / d;
    var pos = this._slide(e.x, e.y, x + nx * min - e.x, y + ny * min - e.y, Math.max(4, (e.radius || 10) * 0.6), this._crossOf(e.type));
    e.x = pos.x; e.y = pos.y;
  };

  /* ---- Ragnarok-style status (js/ro-stats.js) ---- */
  MissionSim.prototype._ro = function () {
    var d = this.data;
    return (d && d.RO && d.TAMER_LEVEL) ? d.RO : null;
  };
  /* every tamer starts with all stats at 1 and 48 points to place */
  MissionSim.prototype._attrs = function (p) {
    var RO = this._ro();
    if (!RO || !p) return null;
    if (!p.attrs || !p.attrsRO) {
      p.attrs = RO.fresh();
      p.attrsRO = true;
      p.statPoints = (p.kind === "cpu" || p.hasTamer === false) ? 0 : RO.CFG.startPoints;
      p._statsKey = null;
    }
    return p.attrs;
  };
  MissionSim.prototype._jobBonus = function (p) {
    var RO = this._ro(), fam = this.data.moveFamilyOf ? this.data.moveFamilyOf(p.form) : null;
    var pa = this._attrParts(p);
    return RO.plus(RO.plus(RO.plus(RO.plus(pa.level, pa.evo), pa.farm), pa.item), pa.blood);
  };
  /* the green bonus, by where it comes from (17z33): base-level growth, digivolving, farm training */
  MissionSim.prototype._attrParts = function (p) {
    var RO = this._ro(), fam = this.data.moveFamilyOf ? this.data.moveFamilyOf(p.form) : null, tamer = !(p.kind === "cpu" || p.hasTamer === false);
    return {
      level: tamer ? RO.levelBonus(p.tamerLevel || 1, fam) : RO.jobBonus(0, fam, 0),
      evo: RO.jobBonus(this._isEgg(p.form) ? 0 : (p.evoCount || 0), fam, 0),
      farm: tamer && RO.farmBonus ? RO.farmBonus(p.trainStats, p.bondTrain) : RO.jobBonus(0, fam, 0),
      item: RO.plus(RO.jobBonus(0, fam, 0), p.itemAttr || null),         /* 17z33: seeds from one-run items */
      blood: RO.plus(RO.jobBonus(0, fam, 0), this._bloodAttr(p))           /* 17z33: its bloodline's stat traits (hatchery.js) */
    };
  };
  /* a Hatchery partner's bloodline (data.js BLOODLINE): how many levels of trait k it carries */
  MissionSim.prototype._bloodClean = function (b) {
    var B = this.data.BLOODLINE, out, k;
    if (!B || !b || typeof b !== "object" || !b.traits) return null;
    out = { gen: Math.max(1, Math.min(9999, b.gen | 0)), traits: {} };
    for (k in B.names) if (b.traits[k] > 0) out.traits[k] = Math.min(B.max, b.traits[k] | 0);
    return out;
  };
  MissionSim.prototype._blood = function (p, k) { return (p && p.blood && p.blood.traits && p.blood.traits[k]) || 0; };
  MissionSim.prototype._bloodAttr = function (p) {
    var B = this.data.BLOODLINE, out = null, k, S = ["str", "agi", "vit", "int", "dex", "luk"];
    if (!B || !p || !p.blood) return null;
    for (k = 0; k < S.length; k++) if (this._blood(p, S[k])) { out = out || {}; out[S[k]] = this._blood(p, S[k]) * B.stat; }
    return out;
  };
  MissionSim.prototype._bloodXp = function (p) { var B = this.data.BLOODLINE; return B ? 1 + B.learn * this._blood(p, "learn") : 1; };
  MissionSim.prototype._attrsEff = function (p) {
    var RO = this._ro();
    return RO.plus(this._attrs(p), this._jobBonus(p));
  };
  MissionSim.prototype._derived = function (p) {
    var RO = this._ro();
    return RO.derive(this._attrsEff(p), p.tamerLevel || 1);
  };

  /* Does this strike land? 0 = dodged, 1 = hit, more = critical.
   * Only a tamer's partner rolls. A critical ignores Flee; otherwise the
   * chance to hit is 80 + Hit - Flee. */
  MissionSim.prototype._roll = function (e, ownerId) {
    var p = ownerId != null ? this.player(ownerId) : null;
    var RO = this._ro();
    if (!p || !RO || p.kind === "cpu") return 1;
    var dv = this._derived(p);
    if (this.rng() * 100 < dv.crit + (p.burstLeft > 0 && this.data.BURST ? this._burstCfg(p).critBonus : 0) + ((p.stats && p.stats.allyCrit) || 0)) {
      this.emit({ type: "fx", k: "crit", x: e.x, y: e.y - (e.radius || 10) });
      return dv.critMul;
    }
    if (this.rng() * 100 >= RO.hitChance(dv.hit, e.flee || 0, 100)) {
      this.emit({ type: "fx", k: "miss", x: e.x, y: e.y - (e.radius || 10) });
      return 0;
    }
    return 1;
  };

  /* Element + attribute multiplier for a hit, with a throttled
   * "Weak!" / "Resist" float over whoever was struck. */
  MissionSim.prototype._elemMul = function (wid, attackerForm, defenderForm, tgt, x, y, id) {
    var EL = this.data.ELEMENTS;
    if (!EL || !attackerForm || !defenderForm) return 1;
    var m = EL.mult(wid, attackerForm, defenderForm), v = EL.verdict(m);
    if (v && tgt && (tgt._elT == null || this.time - tgt._elT >= EL.CFG.floatGap)) {
      tgt._elT = this.time;
      this.emit({ type: "fx", k: v, x: x, y: y, id: id });
    }
    return m;
  };

  function curve(keys, x) {
    var i, a, b;
    if (x <= keys[0][0]) return keys[0][1];
    for (i = 1; i < keys.length; i++) { a = keys[i - 1]; b = keys[i]; if (x <= b[0]) return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); }
    return keys[keys.length - 1][1];
  }
  /* ---- status effects and ground patches (data.js STATUS) ---- */
  var DOT_SHOWN = { burn: 1, poison: 1, bleed: 1 };
  var ST_BITS = { burn: 1, freeze: 2, wet: 4, root: 8, shock: 16, bleed: 32, poison: 64, curse: 128, daze: 256, chill: 512 };
  MissionSim.ST_BITS = ST_BITS;
  function stBits(e) { var b = 0, k; if (e.st) for (k in e.st) if (e.st[k].t > 0 && ST_BITS[k]) b |= ST_BITS[k]; return b; }
  MissionSim.prototype._setStatus = function (e, name, time, opt) {
    opt = opt || {};
    e.st = e.st || {};
    var cur = e.st[name], fresh = !cur || cur.t <= 0;
    e.st[name] = { t: Math.max(time, cur ? cur.t : 0), dps: Math.max(opt.dps || 0, cur ? cur.dps || 0 : 0), owner: opt.owner || (cur && cur.owner) || null };
    if (fresh && !opt.quiet) this.emit({ type: "fx", k: "st", s: name, x: e.x, y: e.y - (e.radius || 10) - 8 });
  };
  /* ---------- The living map (Nov 20, world.js) ---------- */
  MissionSim.prototype._shotElement = function (b) {
    var E = this.data && this.data.ELEMENTS, o = b.ownerId != null && this.player(b.ownerId);
    return (E && E.moveElement && o && o.form) ? E.moveElement(b.wid, o.form) : null;
  };
  /* an ice shot over open water leaves a strip of ice behind it: a bridge for a while */
  MissionSim.prototype._iceTrail = function (b, dt) {
    var w = this.data.world, I = w && w.ICE;
    if (!w || !w.openWaterAt || !I) return;
    b._iceT = (b._iceT || 0) - dt;
    if (b._iceT > 0 || !w.openWaterAt(b.x, b.y)) return;
    b._iceT = 0.1;
    this._freezeWater(b.x, b.y, I.shotR || 40, this.time + (I.bridgeSec || 30));
  };
  MissionSim.prototype._freezeWater = function (x, y, r, until) {
    var w = this.data.world;
    if (!w || !w.freezeArea) return 0;
    var n = w.freezeArea(x, y, r, until);
    if (n) this.emit({ type: "fx", k: "icewater", x: Math.round(x), y: Math.round(y), r: Math.round(r), until: Math.round(until * 10) / 10 });
    return n;
  };
  /* a big blast knocks the trees round it flat (data.js FELL_R: how big is big) */
  MissionSim.prototype._fellTrees = function (x, y, r) {
    var w = this.data.world;
    if (!w || !w.fellArea || !(r >= ((this.data.LIVING && this.data.LIVING.fellR) || 64))) return 0;
    var n = w.fellArea(x, y, r, this.time);
    if (n) this.emit({ type: "fx", k: "fell", x: Math.round(x), y: Math.round(y), r: Math.round(r), at: this.time });
    return n;
  };
  /* Rain fills the low spots (world.js PUD); whatever stands in a puddle is soaked */
  MissionSim.prototype._updatePuddles = function (dt) {
    var w = this.data.world, i, e, SN = this.data.seasons, winter;
    if (!w || !w.stepSoak) return;
    w.stepSoak(this._wet(), dt);
    this._pudT = (this._pudT || 0) - dt;
    if (this._pudT > 0 || !(w.soak() > 0.05)) return;
    this._pudT = 0.5;
    winter = SN && SN.info && SN.info(this.time).id === "winter";
    if (winter) return;                                   /* frozen over: nothing to splash in */
    for (i = 0; i < this.enemies.length; i++) {
      e = this.enemies[i];
      if (e.dead || (this._enemies()[e.type] || {}).fly) continue;
      if (w.inPuddle(e.x, e.y)) this._setStatus(e, "wet", 1.5, { quiet: true });
    }
  };

  MissionSim.prototype._steam = function (x, y, k) { this.emit({ type: "fx", k: k || "steam", x: x, y: y }); };
  /* the hit's element meets the enemy: reactions first, then the element's own mark. Returns the knockback multiplier. */
  MissionSim.prototype._applyElement = function (e, el, dmg, owner) {
    var S = this.data && this.data.STATUS, c = S && S[el];
    if (!c) return 1;
    var st = e.st || (e.st = {}), big = !!(e.boss || e.mega || e.lord), tm = big ? (S.bossTime || 0.5) : 1, chance = c.chance, time = (c.time || 0) * tm, i, o, d, top = e.y - (e.radius || 10);
    if (el === "water" && st.burn) { delete st.burn; this._steam(e.x, top); }
    if (el === "fire") {
      if (st.freeze) { delete st.freeze; this._setStatus(e, "wet", S.water.time * tm, { quiet: true }); this._steam(e.x, top); return 1; }
      if (st.wet) { delete st.wet; this._steam(e.x, top); return 1; }
      if (st.chill) delete st.chill;
    }
    if (el === "ice") {
      if (st.burn) { delete st.burn; this._steam(e.x, top); return 1; }
      if (st.wet) {
        delete st.wet;
        if (big) this._setStatus(e, "chill", S.chillTime || 2.4, {}); else this._setStatus(e, "freeze", S.ice.time * (S.ice.wetMul || 1.7), {});
        return 1;
      }
    }
    if (el === "wind" && st.burn) {
      for (i = 0; i < this.enemies.length; i++) {
        o = this.enemies[i]; if (o === e || o.dead) continue;
        d = dist2(e.x, e.y, o.x, o.y);
        if (d <= c.spread * c.spread && !(o.st && (o.st.wet || o.st.freeze))) this._setStatus(o, "burn", st.burn.t, { dps: st.burn.dps, owner: st.burn.owner });
      }
    }
    if (el === "machine" && st.wet) { chance *= 2; time *= 2; }
    if (this.rng() >= chance) return 1;
    if (c.s === "burn") { if (!st.wet && !st.freeze) this._setStatus(e, "burn", time, { dps: dmg * c.dps, owner: owner }); }
    else if (c.s === "freeze") { if (big) this._setStatus(e, "chill", S.chillTime || 2.4, {}); else this._setStatus(e, "freeze", time, {}); }
    else if (c.s === "bleed" || c.s === "poison") this._setStatus(e, c.s, time, { dps: dmg * c.dps, owner: owner });
    else if (c.s === "gust") { if (!big) this._setStatus(e, "stun", c.stun, { quiet: true }); this.emit({ type: "fx", k: "st", s: "gust", x: e.x, y: top - 8 }); return c.knock || 1; }
    else this._setStatus(e, c.s, time, {});
    return 1;
  };
  /* timers, damage over time, and what the marks do to speed. Returns false if it died. */
  MissionSim.prototype._tickStatus = function (e, dt) {
    var st = e.st, S = this.data && this.data.STATUS, k, s, slow = 1, stun = false, owner = null;
    if (!st || !S) { e.stSlow = 1; e.stStun = false; return true; }
    for (k in st) {
      s = st[k]; s.t -= dt;
      if (s.t <= 0) { delete st[k]; continue; }
      if (s.dps) {
        e.hp -= s.dps * dt; owner = s.owner || owner;
        /* what burn, poison and bleed take is added up and shown as one small number a second */
        if (DOT_SHOWN[k]) { e.dotAcc = e.dotAcc || {}; e.dotAcc[k] = (e.dotAcc[k] || 0) + s.dps * dt; }
      }
      if (S.slow[k]) slow *= S.slow[k];
      if (k === "freeze" || k === "shock" || k === "stun") stun = true;
    }
    e.stSlow = slow; e.stStun = stun;
    if (e.dotAcc) {
      e.dotT = (e.dotT || 0) + dt;
      if (e.dotT >= 1 || e.hp <= 0) {
        e.dotT = 0;
        for (k in e.dotAcc) if (e.dotAcc[k] >= 0.5) this.emit({ type: "hit", dot: k, enemyId: e._id, damage: e.dotAcc[k], x: e.x, y: e.y, r: e.radius || 10, f: 0, by: null });
        e.dotAcc = null;
      }
    }
    if (e.hp <= 0 && !e.dead) { this._killEnemy(e, owner); return false; }
    return true;
  };
  MissionSim.prototype._maybePatch = function (x, y, el, dmg, owner, wid, sure) {
    var S = this.data && this.data.STATUS, P = S && S.patch, i, q, kind, tier, M;
    if (!P) return;
    this.patches = this.patches || [];
    if (el === "wind") {
      for (i = this.patches.length - 1; i >= 0; i--) {
        q = this.patches[i];
        if (dist2(x, y, q.x, q.y) > (q.r + 60) * (q.r + 60)) continue;
        if (q.kind === "fire") { q.r = Math.min(P.maxRadius, q.r * 1.15); q.t = Math.min(q.max, q.t + 1); }
        else if (q.kind === "wet") { q.t -= 2; if (q.t <= 0) this.patches.splice(i, 1); }
      }
      return;
    }
    kind = P.kinds[el];
    if (!kind || (!sure && (this._patchT || 0) > this.time)) return;
    M = this.data.MOVE_META; tier = (wid && M && M[wid] && M[wid].tier) || 1;
    var chance = P.chance[Math.min(tier, P.chance.length - 1)], GF = this.data.GRASSFIRE, wld = this.data.world;
    /* fire landing in tall grass nearly always catches */
    if (kind === "fire" && GF && wld && wld.isTallGrass && wld.isTallGrass(x, y)) chance = Math.max(chance, GF.tallIgnite);
    if (!sure && this.rng() >= chance) return;
    this._patchT = this.time + P.gap;
    this._addPatch(kind, x, y, Math.min(P.maxRadius, P.radius + P.perTier * tier), dmg * (kind === "goo" ? P.gooDps : P.fireDps), owner, 0);
  };
  MissionSim.prototype._addPatch = function (kind, x, y, r, dps, owner, gen) {
    var S = this.data && this.data.STATUS, P = S && S.patch, list = this.patches || (this.patches = []), w = this.data.world, i, q, life, reach;
    if (!P) return null;
    /* fire never sits on water (Nov 21): on water or lava it is just steam, and next to it the
     * patch is pulled in until it stays on the bank */
    if (kind === "fire" && w) {
      if (w.groundAt && w.groundAt(x, y) === "water") { if (this._steam) this._steam(x, y); return null; }
      if (w.waterNear) { while (r > 14 && w.waterNear(x, y, r * 0.9)) r *= 0.8; if (w.waterNear(x, y, 10)) { if (this._steam) this._steam(x, y); return null; } }
    }
    /* what is already on the ground here reacts first */
    for (i = list.length - 1; i >= 0 && kind; i--) {
      q = list[i]; reach = (r + q.r) * 0.75;
      if (dist2(x, y, q.x, q.y) > reach * reach) continue;
      if (q.kind === kind) { q.t = q.max; q.r = Math.max(q.r, r); q.dps = Math.max(q.dps || 0, dps || 0); kind = null; }
      else if (kind === "fire") {
        if (q.kind === "wet") { list.splice(i, 1); this._steam(q.x, q.y); kind = null; }
        else if (q.kind === "ice") { q.kind = "wet"; q.t = q.max = P.life.wet * 0.6; this._steam(q.x, q.y); kind = null; }
        else if (q.kind === "goo") { q.kind = "fire"; q.t = q.max = P.life.fire * 1.5; q.dps = Math.max(q.dps || 0, dps || 0); kind = null; }
      } else if (kind === "wet") {
        if (q.kind === "fire") { list.splice(i, 1); this._steam(q.x, q.y); }
        else if (q.kind === "goo") list.splice(i, 1);
      } else if (kind === "ice") {
        if (q.kind === "wet") { q.kind = "ice"; q.t = q.max = P.life.ice * 1.3; this._steam(q.x, q.y, "frost"); if (w && w.waterNear && w.waterNear(q.x, q.y, q.r + 24)) this._freezeWater(q.x, q.y, q.r * 1.25, this.time + ((this.data.LIVING && this.data.LIVING.patchIceSec) || 30)); kind = null; }
        else if (q.kind === "fire") { list.splice(i, 1); this._steam(q.x, q.y); kind = null; }
      } else if (kind === "goo") {
        if (q.kind === "fire") { q.t = Math.min(q.max, q.t + 1.5); kind = null; }
      }
    }
    if (!kind) return null;
    var LV = this.data.LIVING || {};
    if (kind === "ice" && w && w.waterNear && w.waterNear(x, y, r + 24)) this._freezeWater(x, y, r * 1.25, this.time + (LV.patchIceSec || 30));
    if (kind === "fire" && w && w.inPuddle && w.inPuddle(x, y) && !this._boltFire) { this._steam(x, y); return null; }
    life = P.life[kind] || 4;
    q = { id: (this._patchSeq = (this._patchSeq || 0) + 1), kind: kind, x: x, y: y, r: r, t: life, max: life, dps: dps || 0, owner: owner || null, gen: gen || 0, tick: 0, sp: 0 };
    if (kind === "fire" && w && w.isGrass && w.isGrass(x, y)) {
      var GF = this.data.GRASSFIRE || {}, wet = this._boltFire ? 0 : this._wet();
      q.bolt = !!this._boltFire;                      /* lit by lightning: rain does not hold it back, nor the fires it starts */
      q.grass = true; q.tall = !!(w.isTallGrass && w.isTallGrass(x, y));
      q.t = q.max = life * P.grassLife * (1 - wet * (1 - (GF.wetLife == null ? 1 : GF.wetLife)));
      /* the grass under it is gone until it grows back (world.js burn) */
      if (w.burn) w.burn(x, y, r * 0.8, this.time, GF.regrow, GF.sprout);
      this.emit({ type: "fx", k: "scorch", x: x, y: y, r: r * 0.8, at: this.time });
    }
    list.push(q);
    if (list.length > P.max) list.shift();
    return q;
  };
  MissionSim.prototype._updatePatches = function (dt) {
    var S = this.data && this.data.STATUS, P = S && S.patch, list = this.patches, w = this.data.world, i, j, q, e, rr, a, nx, ny;
    if (!P || !list || !list.length) return;
    var GF = this.data.GRASSFIRE || {}, creep = 1, SS = this.data.seasons, wetNow = this._wet();
    if (GF.season && SS && SS.info) creep = GF.season[SS.info(this.time).id] || 1;
    var dryCreep = creep;
    creep *= 1 - wetNow * (1 - (GF.wetSpread == null ? 1 : GF.wetSpread));
    for (i = list.length - 1; i >= 0; i--) {
      q = list[i]; q.t -= dt;
      if (q.t <= 0) { list.splice(i, 1); continue; }
      q.tick += dt;
      if (q.tick >= 0.25) {
        q.tick = 0;
        for (j = 0; j < this.enemies.length; j++) {
          e = this.enemies[j]; if (e.dead) continue;
          rr = q.r + (e.radius || 10) * 0.5;
          if (dist2(q.x, q.y, e.x, e.y) > rr * rr) continue;
          if (q.kind === "fire") { if (e.st && e.st.wet) delete e.st.wet; else if (!(e.st && e.st.freeze)) this._setStatus(e, "burn", 1.2, { dps: q.dps, owner: q.owner, quiet: true }); }
          else if (q.kind === "wet") { if (e.st && e.st.burn) delete e.st.burn; this._setStatus(e, "wet", 1.5, { quiet: true }); }
          else if (q.kind === "ice") this._setStatus(e, "chill", 1, { quiet: true });
          else if (q.kind === "goo") this._setStatus(e, "poison", 1.5, { dps: q.dps, owner: q.owner, quiet: true });
        }
      }
      /* fire on grass creeps outward: further through tall grass, readier in a dry season, less in the rain */
      if (q.kind === "fire" && q.grass && q.gen < (q.tall && GF.tallSpreadGen ? GF.tallSpreadGen : P.spreadGen)) {
        q.sp += dt;
        if (q.sp >= P.spreadEvery) {
          q.sp = 0;
          if (this.rng() < (q.tall && GF.tallSpreadChance ? GF.tallSpreadChance : P.spreadChance) * (q.bolt ? dryCreep : creep)) {
            a = this.rng() * Math.PI * 2; nx = q.x + Math.cos(a) * q.r * 1.7; ny = q.y + Math.sin(a) * q.r * 1.7;
            if (w && w.isGrass && w.isGrass(nx, ny)) { this._boltFire = !!q.bolt; this._addPatch("fire", nx, ny, q.r * 0.9, q.dps, q.owner, q.gen + 1); this._boltFire = false; }
          }
        }
      }
    }
  };

  /* how wet the field is, 0..1 (rain or a storm, through their fade) */
  MissionSim.prototype._wet = function () {
    var W = weatherApi();
    return W && W.wetness ? W.wetness(this) : 0;
  };
  /* ---- lightning (data.js STORM) ---- */
  MissionSim.prototype._updateStorm = function (dt) {
    var ST = this.data && this.data.STORM, W = weatherApi(), list = this.bolts || (this.bolts = []), i, b;
    if (!ST || !W) return;
    if (W.idOf(this) === "storm" && W.fadeT(this) >= 0.5 && this._combatReady()) {
      this._boltT = (this._boltT == null ? 2.5 : this._boltT) - dt;
      if (this._boltT <= 0) {
        this._boltT = ST.every[0] + this.rng() * (ST.every[1] - ST.every[0]);
        this._aimBolt(ST);
      }
    } else this._boltT = null;
    for (i = list.length - 1; i >= 0; i--) {
      b = list[i]; b.t -= dt;
      if (b.t <= 0) { list.splice(i, 1); this._strike(b.x, b.y, ST); }
    }
  };
  MissionSim.prototype._aimBolt = function (ST) {
    var who = [], i, p, e, near = [], a, d, x, y, r2 = ST.range[1] * ST.range[1];
    for (i = 0; i < this.players.length; i++) { p = this.players[i]; if (p.hasTamer && !p.away) who.push(p); }
    if (!who.length) return;
    p = who[Math.floor(this.rng() * who.length) % who.length];
    if (this.rng() < ST.seekEnemy) {
      for (i = 0; i < this.enemies.length; i++) { e = this.enemies[i]; if (!e.dead && dist2(e.x, e.y, p.x, p.y) < r2) near.push(e); }
    }
    if (near.length) { e = near[Math.floor(this.rng() * near.length) % near.length]; x = e.x; y = e.y; }
    else {
      a = this.rng() * Math.PI * 2; d = ST.range[0] + this.rng() * (ST.range[1] - ST.range[0]);
      x = p.x + Math.cos(a) * d; y = p.y + Math.sin(a) * d * 0.75;
    }
    this.bolts.push({ x: x, y: y, t: ST.warn });
    this.emit({ type: "fx", k: "boltwarn", x: x, y: y, t: ST.warn });
  };
  MissionSim.prototype._strike = function (x, y, ST) {
    ST = ST || this.data.STORM;
    var i, e, p, dmg, big, rr, hits = 0, w = this.data.world, pud = w && w.inPuddle ? w.inPuddle(x, y) : null;
    this.emit({ type: "fx", k: "bolt", x: x, y: y, r: ST.radius });
    this._fellTrees(x, y, Math.max(ST.radius, ((this.data.LIVING && this.data.LIVING.fellR) || 64)));
    /* a bolt into a puddle runs through the whole of it */
    if (pud) {
      for (i = 0; i < this.enemies.length; i++) {
        e = this.enemies[i];
        if (e.dead || dist2(x, y, e.x, e.y) <= ST.radius * ST.radius) continue;
        if (w.inPuddle(e.x, e.y) === null || dist2(pud.x, pud.y, e.x, e.y) > pud.r * pud.r) continue;
        this._setStatus(e, "shock", ST.shock, {});
        var pz = Math.max(ST.minDamage, e.maxHp * ST.enemy * 0.5);
        e.hp -= pz; e.flash = 0.15;
        this.emit({ type: "hit", enemyId: e._id, damage: pz, x: e.x, y: e.y, r: e.radius || 10, f: Math.round(100 * pz / Math.max(1, e.maxHp)) / 100, bolt: 1, by: null });   /* its number too */
        if (e.hp <= 0) this._killEnemy(e, null);
      }
      this.emit({ type: "fx", k: "pudzap", x: Math.round(pud.x), y: Math.round(pud.y), r: Math.round(pud.r) });
    }
    for (i = 0; i < this.enemies.length; i++) {
      e = this.enemies[i]; if (e.dead) continue;
      rr = ST.radius + (e.radius || 10) * 0.5;
      if (dist2(x, y, e.x, e.y) > rr * rr) continue;
      big = !!(e.boss || e.mega || e.lord);
      dmg = Math.max(ST.minDamage, e.maxHp * (big ? ST.big : ST.enemy));
      e.hp -= dmg; e.flash = 0.15; hits++;
      this._setStatus(e, "shock", ST.shock * (big ? 0.5 : 1), {});
      this.emit({ type: "hit", enemyId: e._id, damage: dmg, x: e.x, y: e.y, r: e.radius || 10, f: Math.round(100 * dmg / Math.max(1, e.maxHp)) / 100, bolt: 1, by: null });
      if (e.hp <= 0) this._killEnemy(e, null);
    }
    /* a partner standing under it is hurt too, though never finished off; tamers are never struck */
    for (i = 0; i < this.players.length; i++) {
      p = this.players[i];
      if (p.atFarm || this._isEgg(p.form) || p.faint > 0 || p.downed || !(p.hp > 1) || p.monInvuln > 0) continue;
      if (dist2(x, y, p.mx, p.my) > ST.partnerRadius * ST.partnerRadius) continue;
      dmg = Math.min(p.hp - 1, Math.max(1, (p.maxHp || 1) * ST.partner));
      if (dmg <= 0) continue;
      p.hp -= dmg; p.sinceHit = 0;
      this.emit({ type: "hurt", who: "mon", id: p.id, amount: dmg, hp: p.hp, bolt: true });
    }
    /* and it leaves fire where it landed (not on water or rock faces) */
    if (!(w && w.groundAt) || w.groundAt(x, y) === "land") {
      this._boltFire = true;
      this._addPatch("fire", x, y, ST.fireRadius, ST.fireDps[0] + ST.fireDps[1] * (this.time / 60), null, 0);
      this._boltFire = false;
    }
    return hits;
  };

  /* the rival lives in js/net/rival-sim.js */
  MissionSim.prototype.hurtEnemy = function (e, dmg, kbX, kbY, knock, owner, rolled, wid) {
    if (e && e.pvpOf) return this._pvpHit ? this._pvpHit(e, dmg, owner) : false;   /* a PvP stand-in (pvp-sim.js) */
    if (e.rival && owner && owner.id === "rival") return false;        /* its own moves pass through it */
    if (!e || e.dead) return false;
    /* a biome that trusts you is left alone by your side's shots and blasts, unless you clicked it (faction-sim.js) */
    var hitter = owner && !owner.wild && owner.id != null ? this.player(owner.id) : null;
    if (hitter && this._spares && this._spares(owner.id, e)) return false;
    if (hitter && this._trustHit) this._trustHit(hitter, e);
    if (e.war && owner && !owner.wild) e.warHit = true;               /* a soldier you hit turns on you (war-sim.js) */
    if (rolled == null) {
      rolled = this._roll(e, owner && owner.id);
      if (!rolled) return false;
    }
    dmg *= rolled;
    var atk = owner && ((owner.id != null && this.player(owner.id)) || owner);
    var elM = 1;
    if (atk && atk.form) { elM = this._elemMul(wid, atk.form, e.type, e, e.x, e.y - (e.radius || 10) - 6); dmg *= elM; }
    /* a charm: its element hits a little harder, a critical gives a little back */
    var GH = (atk && atk.gear && atk.id != null && atk === this.player(atk.id)) ? this._gear(atk) : null, gEl;
    if (GH) {
      gEl = this.data.ELEMENTS && this.data.ELEMENTS.moveElement ? this.data.ELEMENTS.moveElement(wid, atk.form) : null;
      if (gEl && GH.elem[gEl]) dmg *= GH.elem[gEl];
      if (GH.leech && rolled > 1 && atk.hp > 0) atk.hp = Math.min(atk.maxHp, atk.hp + atk.maxHp * GH.leech);
    }
    /* dealing damage charges the warp burst */
    var BC = this.data.BURST;
    if (BC && atk && atk.id != null && atk === this.player(atk.id) && !(atk.burstLeft > 0) && !atk.ultLock) {
      atk.burst = Math.min(100, (atk.burst || 0) + (GH ? GH.burst : 1) * ((atk.stats && atk.stats.allyBurst) || 1) * BC.perDamage * Math.min(1, dmg / Math.max(1, e.maxHp)) * ((e.boss || e.mega) ? BC.bossMul : 1));
    }
    /* the move's element leaves its mark, and may leave some of itself on the ground */
    var stEl = (atk && atk.form && this.data.ELEMENTS && this.data.STATUS) ? this.data.ELEMENTS.moveElement(wid, atk.form) : null, stKnock = 1;
    if (e.st && e.st.curse && this.data.STATUS) dmg *= this.data.STATUS.dark.taken;
    if (stEl) { stKnock = this._applyElement(e, stEl, dmg, owner); this._maybePatch(e.x, e.y, stEl, dmg, owner, wid); }
    if (e.vsBoss && atk && atk.id != null && this._vsBossHit) this._vsBossHit(e, this.player(atk.id), Math.min(dmg, Math.max(0, e.hp)));   /* Versus: who hurt the mini boss */
    e.hp -= dmg;
    e.flash = 0.1;
    this._knockback(e, kbX, kbY, (knock || 0) * stKnock, this._knockStageMul(owner));
    /* c: a critical. m: 1 it was weak to this, -1 it resisted. f: share of its full health. k: this blow killed it. */
    var hitEv = { type: "hit", enemyId: e._id, damage: dmg, x: e.x, y: e.y, r: e.radius || 10, f: Math.round(100 * dmg / Math.max(1, e.maxHp)) / 100, c: rolled > 1 ? 1 : 0, m: elM > 1.05 ? 1 : (elM < 0.95 ? -1 : 0), by: owner && owner.id != null ? owner.id : null };
    if (wid) hitEv.w = wid;                                           /* the move, so a big move's hit can feel big (17z33) */
    if (hitEv.m > 0 && atk && atk.id != null && atk === this.player(atk.id)) atk.weakHits = (atk.weakHits || 0) + 1;   /* Story's weakness goal */
    this.emit(hitEv);
    if (e.hp <= 0) { hitEv.k = 1; this._killEnemy(e, owner); }
    return true;
  };

  MissionSim.prototype._killEnemy = function (e, owner) {
    if (this._warLossOf) this._warLossOf(e);                          /* its biome feels the loss at the front */
    if (this._nestLoss) this._nestLoss(e);                            /* and its nest is one fewer */
    if (e.wev && this._wevDown) this._wevDown(e, owner);               /* a world event's boss is down (event-sim.js) */
    /* the rival's kills are its own: its XP, nothing dropped for you */
    if (owner && owner.id === "rival" && this._rivalKill) return this._rivalKill(e);
    /* a wild Digimon's kill (an infected one's, or one fighting it off) is nobody's: nothing dropped */
    if (owner && owner.wild && this._wildKill) return this._wildKill(e, owner);
    if (e.rival && this._rivalDown) this._rivalDown(e, owner);
    e.dead = true;
    e.hp = 0;
    this.kills += 1;
    var p = (owner && this.player(owner.id)) || this.player(this.localId) || this.players[0];
    if (this._vsKill && this.vs) this._vsKill(e, owner && this.player(owner.id));   /* Versus: the DIGIVOLVE meter */
    this._lootFor = p;                                                            /* whose level the XP is measured against (_xpGap) */
    if (p && this._trustKill && !(owner && owner.wild)) this._trustKill(p, e);     /* faction-sim.js: who is glad of it, who isn't */
    if (p && this._allyShare && !(owner && owner.wild)) this._allyShare(p, e);     /* pvp-sim.js: the Digimon at your side learn from it */
    if (p) {
      p.kills = (p.kills || 0) + 1;
      p.captureKills = (p.captureKills || 0) + 1;
      /* per-kind tally for catching: enough of one kind earns a try at that kind */
      p.killsBy = p.killsBy || {};
      p.killsBy[e.type] = (p.killsBy[e.type] || 0) + 1;
      if (owner && this.player(owner.id) === p) this._catchSpot(p, e);        /* enough of this kind: it lies there to be caught */
      p.killStreak = (p.killStreak || 0) + 1;
      /* 17z33: beating wild Digimon out in the world freshens it up for training */
      var FR0 = this.data.FARM_CFG && this.data.FARM_CFG.fresh;
      if (FR0) {
        if (p.trainFresh == null) p.trainFresh = FR0.start != null ? FR0.start : 3;
        p.trainKills = (p.trainKills || 0) + 1;
        if (p.trainKills >= (FR0.killsPer || 10)) { p.trainKills = 0; if (p.trainFresh < (FR0.max || 3)) { p.trainFresh += 1; this.emit({ type: "train.fresh", id: p.id, fresh: p.trainFresh }); } }
      }
      p.streakTimer = this._care().killStreakWindow || 4;
      var c = this._care();
      if (p.killStreak > 0 && p.killStreak % (c.killStreakEvery || 5) === 0) {
        p.happiness = clamp((p.happiness || 0) + (c.killStreakHappiness || 4), 0, c.happinessMax || 100);
      }
      /* Encounter totals that evolution branches read. */
      var kdef = this._enemies()[e.type] || {};
      if (e.boss) { p.bossesBeaten = (p.bossesBeaten || 0) + 1; p.happiness = clamp((p.happiness || 0) + (c.bossJoy || 8), 0, c.happinessMax || 100); }   /* a big win together */
      p.killsSpecies = p.killsSpecies || {};
      p.killsSpecies[e.type] = (p.killsSpecies[e.type] || 0) + 1;
      if (kdef.attribute) {
        p.killsAttribute = p.killsAttribute || {};
        p.killsAttribute[kdef.attribute] = (p.killsAttribute[kdef.attribute] || 0) + 1;
      }
      var Rk = rarityApi();
      if (Rk && Rk.noteKill) Rk.noteKill(p);
    }
    if (e.lord && p) p.lordsBeaten = (p.lordsBeaten || 0) + 1;   /* for the boards (modes-sim.js) */
    if (e.nemesis && this._nemesisDown) this._nemesisDown(e, p);  /* a nemesis beaten at last (nemesis-sim.js) */
    if (e.lord) {
      /* the lord of the land is down: gone for this run, and it pays well */
      var LD = this.data.LORD || {}, ldef = this._enemies()[e.type] || { xp: 20 }, oi, oa;
      this.lairs = this.lairs || {}; this.lairs[e.lairKey] = "dead";
      for (oi = 0; oi < (LD.xpOrbs || 8); oi++) { oa = (Math.PI * 2 * oi) / (LD.xpOrbs || 8); this._spawnOrb("xp", e.x + Math.cos(oa) * 34, e.y + Math.sin(oa) * 26, Math.round((ldef.xp || 20) * (LD.xpMul || 2))); }
      this._spawnOrb("bits", e.x, e.y + 10, LD.bits || 60);
      this.emit({ type: "lord.down", id: p ? p.id : null, enemyType: e.type, biome: e.lairBiome, x: e.x, y: e.y });
    }
    if (e.spireGroup && this._spireKill) this._spireKill(e);           /* all a spire let out beaten: a chest (spire-sim.js) */
    if (e.spire) {
      /* the thing from the spire pays a little extra */
      var SPc = (this.data.TERRAIN && this.data.TERRAIN.spire) || {}, sdef = this._enemies()[e.type] || { xp: 20 }, si, sa;
      for (si = 0; si < (SPc.xpOrbs || 6); si++) { sa = (Math.PI * 2 * si) / (SPc.xpOrbs || 6); this._spawnOrb("xp", e.x + Math.cos(sa) * 28, e.y + Math.sin(sa) * 22, Math.round(sdef.xp || 20)); }
      this._spawnOrb("bits", e.x, e.y + 10, SPc.bits || 25);
    }
    if (this.ally && this.ally.hp > 0) this._allyGain((this._enemies()[e.type] || { xp: 6 }).xp || 6);
    this._dropLoot(e);
    if (e.virus && this._virusPay) this._virusPay(e);
    this.emit({ type: "kill", enemyId: e._id, enemyType: e.type, x: e.x, y: e.y, killer: p ? p.id : null, boss: !!e.boss, big: !!(e.boss || e.mega || e.lord), r: e.radius || 10, hp: Math.round(e.maxHp), virus: e.virus ? 1 : 0 });
  };

  MissionSim.prototype._dropLoot = function (e) {
    var def = this._enemies()[e.type] || { xp: 6 };
    var rng = this.rng;
    var xp = Math.round((def.xp || 6) * (0.85 + rng() * 0.3) * (e.boss && !def.boss ? 5 : 1));
    /* Ragnarok-style: more for the field's toughness, scaled by how far it was above or below the one who beat it */
    var LVd = this.data.LEVELS;
    if (LVd) xp = Math.max(1, Math.round(xp * LVd.xpMul * this._xpGap(e, this._lootFor || this.player(this.localId) || this.players[0])));
    if (weatherApi()) xp = weatherApi().xpValue(xp, this, this.data);
    this._spawnOrb("xp", e.x, e.y, xp);
    var bits = 3;
    if (this.data && this.data.bitsForEnemy) bits = this.data.bitsForEnemy(def);
    this._spawnOrb("bits", e.x + (rng() - 0.5) * 20, e.y + (rng() - 0.5) * 16, bits);
    if (this._siegeWoodDrop && this.siege && this.siege.nest) this._siegeWoodDrop(e);   /* Night Siege only: wood for fences */
    var heal = this._heal();
    var chance = e.boss || def.boss ? (heal.bossChance != null ? heal.bossChance : 1)
      : (def.elite ? (heal.eliteChance != null ? heal.eliteChance : 0.6)
        : (heal.dropChance != null ? heal.dropChance : 0.3));
    if (rng() < chance) this._spawnOrb("heal", e.x + (rng() - 0.5) * 16, e.y + (rng() - 0.5) * 16, 1);
    var care = (this.data && this.data.CARE) || this._defs.care;
    var foodChance = (e.boss || def.boss) ? (care.bossMeatDropChance != null ? care.bossMeatDropChance : 1)
      : (def.elite ? (care.eliteMeatDropChance != null ? care.eliteMeatDropChance : 0.6)
        : (care.meatDropChance != null ? care.meatDropChance : 0.22));
    if (rng() < foodChance) {
      var roll = rng();
      var kind = (this.data && this.data.rollFoodKind) ? this.data.rollFoodKind(roll) : "meat";
      this._spawnOrb(kind, e.x + (rng() - 0.5) * 18, e.y + (rng() - 0.5) * 14, 1);
    }
    var sd = (this.data && this.data.SEED_DROP) || null;
    if (sd && this.data.rollSeedKind) {
      var seedChance = (e.boss || def.boss) ? sd.bossChance : (def.elite ? sd.eliteChance : sd.chance);
      if (rng() < seedChance) this._spawnOrb(this.data.rollSeedKind(rng()), e.x + (rng() - 0.5) * 18, e.y + (rng() - 0.5) * 14, 1);
    }
  };

  MissionSim.prototype._spawnOrb = function (kind, x, y, value) {
    if (this.orbs.length > 180) {
      var i, best = 0, bestD = -1, d, pass, host = this.player(this.localId) || this.players[0];
      /* the furthest XP orb goes first; if there are none, the furthest anything but wood (Night Siege's fences) */
      for (pass = 0; pass < 2 && bestD < 0; pass++) for (i = 0; i < this.orbs.length; i++) {
        if (pass === 0 ? this.orbs[i].kind !== "xp" : this.orbs[i].kind === "wood") continue;
        d = host ? dist2(this.orbs[i].x, this.orbs[i].y, host.x, host.y) : 0;
        if (d > bestD) { bestD = d; best = i; }
      }
      this.orbs.splice(best, 1);
    }
    var s = this._snap(x, y, 8, 180);
    this.orbs.push({ id: this.nextId++, kind: kind, x: s.x, y: s.y, value: value, vx: 0, vy: 0, magnet: false });
  };

  /* Regional Digimon (data.js REGION): a native of the biome the tamer is
   * in, of the same stage as `type`, or null to leave the spawn as it is. */
  MissionSim.prototype._nativeFor = function (type) {
    var R = this.data.REGION, w = this.data.world, BI = this.data.biomes, host = this.player(this.localId) || this.players[0];
    if (!R || !w || !w.biomeAt || !BI || !BI.homeOf || !host) return null;
    var b = w.biomeAt(host.x, host.y), defs = this._enemies(), d0 = defs[type], k, key, list;
    if (!b || !d0 || d0.boss) return null;
    if (BI.homeOf(type) === b.id) return null;                 /* already at home */
    if (this.rng() >= R.share) return null;
    this._natives = this._natives || {};
    key = b.id + "|" + d0.stageDisplay;
    list = this._natives[key];
    if (!list) {
      list = [];
      for (k in defs) if (defs[k] && !defs[k].boss && defs[k].stageDisplay === d0.stageDisplay && BI.homeOf(k) === b.id) list.push(k);
      list.sort();
      this._natives[key] = list;
    }
    return list.length ? list[(this.rng() * list.length) | 0] : null;
  };

  MissionSim.prototype.spawnEnemy = function (type, flags) {
    flags = flags || {};
    if (!flags.fieldMega && !flags.boss && !flags.keepType) { var nat = this._nativeFor(type); if (nat) { type = nat; flags.keepType = true; } }
    if (!flags.fieldMega && !flags.keepType && weatherApi()) {
      type = weatherApi().remapType(type, this, this.data, this.rng);
    }
    var def = this._enemies()[type];
    if (!def) {
      var sp = this.data && this.data.SPECIES && this.data.SPECIES[type];
      if (!sp) return null;
      def = {
        name: sp.name || type,
        hp: (sp.base && sp.base.maxHp) || 80,
        speed: 44,
        damage: 10,
        contactCd: 0.7,
        radius: sp.radius || 14
      };
    }
    var host = this.player(this.localId) || this.players[0];
    var hx = host ? host.x : 0, hy = host ? host.y : 0;
    var wave = this._wave(this.time);
    var margin = 36;
    var halfW = this.viewW / 2 + margin;
    var halfH = this.viewH / 2 + margin;
    var side = (this.rng() * 4) | 0;
    var sx, sy;
    if (flags.x != null) { sx = flags.x; sy = flags.y; }
    else if (side === 0) { sx = hx - halfW; sy = hy + (this.rng() * 2 - 1) * halfH; }
    else if (side === 1) { sx = hx + halfW; sy = hy + (this.rng() * 2 - 1) * halfH; }
    else if (side === 2) { sy = hy - halfH; sx = hx + (this.rng() * 2 - 1) * halfW; }
    else { sy = hy + halfH; sx = hx + (this.rng() * 2 - 1) * halfW; }
    if (flags.x == null) { var spot = this._snap(sx, sy, 12, 260); sx = spot.x; sy = spot.y; }
    var hpMul = flags.fodder ? 1 : (wave.hpMul || 1);   /* swarm Babies never toughen up */
    var bosses = this._bosses();
    var isBoss = !!def.boss || !!flags.boss;
    var PCs = this.data && this.data.PACING;
    if (PCs && PCs.stageHp && !flags.boss && !def.boss && !flags.fieldMega && PCs.stageHp[def.stageDisplay]) hpMul *= PCs.stageHp[def.stageDisplay];
    /* enemy health follows the clock at the pace of a build with its points spent */
    if (PCs && PCs.buildHp && !flags.fodder) hpMul *= curve(PCs.buildHp, this.time / 60);
    var lateH = PCs && PCs.lateHp && !flags.boss && !def.boss && !flags.fieldMega && PCs.lateHp[def.stageDisplay];
    if (lateH) hpMul *= Math.min(lateH.max || 3, 1 + Math.max(0, this.time / 60 - lateH.from) * lateH.perMin);
    if (flags.boss && !def.boss) hpMul *= (bosses.stageHpMul || 6);
    if (isBoss) {
      var nBoss = Math.max(0, Math.floor((this.time - (bosses.firstAt || 90)) / (bosses.every || 90)));
      hpMul *= 1 + nBoss * (bosses.hpScalePer || 0.35);
    }
    var megaCfg = (this.data && this.data.MEGA_SPAWN) || {};
    if (flags.fieldMega) hpMul *= (megaCfg.hpMul != null ? megaCfg.hpMul : 8);
    var e = {
      _id: this.nextId++,
      type: type,
      x: sx, y: sy,
      hp: def.hp * hpMul,
      maxHp: def.hp * hpMul,
      facing: 1, flash: 0, hitCd: 0, hitCdM: 0, hitCdA: 0, hitCdCpu: {},
      slow: 1, slowTime: 0,
      /* bosses stand out: a bigger body (and a bigger sprite on screen) */
      radius: this._actorRad(type) * (flags.fieldMega ? 1.35 : (isBoss ? 1.2 : 1)),
      dead: false,
      boss: isBoss,
      lv: def.lv || 1,
      flee: Math.round((def.flee || 0) * (isBoss && !def.boss ? 0.7 : 1)),
      hit: (def.hit || 0) + (isBoss && !def.boss ? 3 : 0),
      mega: !!flags.fieldMega,
      dmgMul: flags.fieldMega ? (megaCfg.dmgMul != null ? megaCfg.dmgMul : 1.45) : 1,
      spdMul: flags.fieldMega ? (megaCfg.spdMul || 1) : 1
    };
    if (weatherApi()) weatherApi().applySpawnStats(e, this, this.data);
    this._levelUp(e, def, flags);
    this.enemies.push(e);
    if ((isBoss || flags.fieldMega) && !flags.quiet) this.emit({ type: "spawn", enemyId: e._id, enemyType: type, boss: isBoss, mega: !!flags.fieldMega, x: sx, y: sy });
    return e;
  };

  /* A wild Digimon's level (data.js LEVELS): inside its stage's band, higher further from the start,
   * bosses, lords and field Megas above; and the toughness that comes with it. */
  MissionSim.prototype._levelUp = function (e, def, flags) {
    var L = this.data && this.data.LEVELS, b, far, lv;
    if (!L || e.rival) return;
    b = (def && L.band[def.stageDisplay]) || [1, 4];
    far = Math.min(1, Math.sqrt(e.x * e.x + e.y * e.y) / L.farPx);
    lv = b[0] + (b[1] - b[0]) * (L.farFrac * far + (1 - L.farFrac) * this.rng());
    if (flags && flags.fieldMega) lv = b[1] + L.bossLv;
    else if (e.boss) lv += L.bossLv;
    e.lv = Math.max(1, Math.round(lv));
    /* the gentle start (playtest, Nov 20): in the Baby zone round the start (RESPAWN.zone) the wild ones
     * are low level and not toughened, so a partner that has just hatched (again) can find its feet */
    var Z = this._startZone ? this._startZone(e.x, e.y) : 0, R = this.data.RESPAWN;
    e.z0 = Z;                                                   /* where it came from: an outsider does not follow anyone into the start */
    if (Z >= 2 && !e.boss && !(flags && flags.fieldMega)) {
      e.lv = Math.min(e.lv, Z === 3 ? 2 : ((R && R.startLv) || 3));
      /* and the run clock does not make them tougher either (the field's growth is for out in the world) */
      e.hp = e.maxHp = Math.round(((def && def.hp) || e.maxHp) * ((R && R.startHp) || 1));
      return;
    }
    e.hp = e.maxHp = Math.round(e.maxHp * L.hpMul * ((L.stageHp && def && L.stageHp[def.stageDisplay]) || 1) * (1 + L.hpPerLv * Math.max(0, e.lv - b[0])));
    e.dmgMul = (e.dmgMul || 1) * L.dmgMul;
  };
  /* the gap between a Digimon's level and a partner's job level (data.js LEVELS) */
  MissionSim.prototype._xpGap = function (e, p) {
    var L = this.data && this.data.LEVELS, d;
    if (!L || !p || !e) return 1;
    d = (e.lv || 1) - (p.level || 1);
    if (d >= 0) return 1 + Math.min(L.xpCapAbove, d * L.xpPerLvAbove);
    d = -d - L.freeBelow;
    return d <= 0 ? 1 : Math.max(L.xpFloor, 1 - d * L.xpPerLvBelow);
  };
  MissionSim.prototype._dmgGap = function (e, p) {
    var L = this.data && this.data.LEVELS, d;
    if (!L || !p || !e) return 1;
    d = (e.lv || 1) - (p.level || 1);
    return d > 0 ? 1 + Math.min(L.dmgCapAbove, d * L.dmgPerLvAbove) : 1;
  };

  /* Enemies arrive a few at a time (data.js PACING.group): each one that
   * is due waits in a short queue, and when the group is full they all come
   * in together at one spot. Returns how many were spawned just now. */
  MissionSim.prototype._queueSpawn = function (type, room) {
    var G = this.data.PACING && this.data.PACING.group, q, i, e0, e, n = 0, a, r, s2;
    if (!G) { if (room > 0) { this.spawnEnemy(type); return 1; } return 0; }
    q = this.spawnQueue = this.spawnQueue || [];
    if (!this.groupNeed) this.groupNeed = G.min + Math.floor(this.rng() * (G.max - G.min + 1));
    if (q.length < this.groupNeed) q.push(type);
    if (q.length < this.groupNeed || room <= 0) return 0;
    for (i = 0; i < q.length && n < room; i++) {
      if (!e0) { e0 = e = this.spawnEnemy(q[i]); }
      else {
        a = this.rng() * Math.PI * 2; r = (0.4 + 0.6 * this.rng()) * G.spread;
        s2 = this._snap(e0.x + Math.cos(a) * r, e0.y + Math.sin(a) * r, 12, 140);
        e = this.spawnEnemy(q[i], { x: s2.x, y: s2.y });
      }
      if (e) n++;
    }
    this.spawnQueue = []; this.groupNeed = 0;
    return n;
  };

  MissionSim.prototype._updateSpawns = function (dt) {
    var wave = this._wave(this.time);
    var host = this.player(this.localId) || this.players[0];
    var combatReady = this._spawnsOpen();
    if (combatReady) {
    /* Nov 20: no more waves, Baby swarms or timed bosses. Every wild Digimon now lives in a nest
     * (nest-sim.js) and comes onto the map from there; bosses lead the alpha nests. */
    this._updateNests(dt, wave, host);
    if (this._updateWanderers) this._updateWanderers(dt, wave, host);
    this._updateFieldMega(dt);
    this._updatePacks(dt, wave, host);
    if (this._updateWar) this._updateWar(dt, wave, host);
    this._updateLords(dt, host);
    }
    /* rare world events (event-sim.js): their clock runs even while a partner is back in its egg */
    if (this._updateWev) this._updateWev(dt);
    this._updateMerchant();
    var heal = this._heal();
    this.worldFoodAcc += dt;
    if (heal.worldEvery && this.worldFoodAcc >= heal.worldEvery) {
      this.worldFoodAcc -= heal.worldEvery;
      if (host) {
        var ang = this.rng() * Math.PI * 2;
        var r = 80 + this.rng() * 160;
        this._spawnOrb("heal", host.x + Math.cos(ang) * r, host.y + Math.sin(ang) * r, 1);
      }
    }
  };

  /* ---------- Warp burst (data.js BURST) ---------- */
  /* the standard next form of a line: the one everybody knows, never a secret route */
  MissionSim.prototype._burstForm = function (form) {
    var T = this.data.EVO_TREE || (typeof EVO_TREE !== "undefined" ? EVO_TREE : null);
    var list = (T && T.branches && T.branches[form]) || [], i;
    for (i = 0; i < list.length; i++) if (list[i].kind === "standard" && list[i].to && this.data.SPECIES && this.data.SPECIES[list[i].to]) return list[i].to;
    return form;
  };
  /* the burst numbers for a partner right now: the base set with its style's on top */
  MissionSim.prototype._burstCfg = function (p) {
    var B = this.data.BURST, st, o, k;
    if (!B || !p || !(p.burstLeft > 0)) return null;
    if (p._burstCfg && p._burstCfg.style === p.burstStyle) return p._burstCfg;
    st = (B.styles && B.styles[p.burstStyle]) || {}; o = {};
    for (k in B) if (k !== "styles") o[k] = B[k];
    for (k in st) o[k] = st[k];
    o.style = p.burstStyle;
    return (p._burstCfg = o);
  };
  MissionSim.prototype.startBurst = function (p) {
    var B = this.data.BURST, W = this.data.WEAPONS || {};
    if (!B || !p || this._isEgg(p.form) || p.downed || p.faint > 0 || !(p.hp > 0)) return { ok: false, reason: "down" };
    if (p.burstLeft > 0) return { ok: false, reason: "active" };
    if ((p.burst || 0) < 100) return { ok: false, reason: "charging" };
    var U = this.data.megaUltimate ? this.data.megaUltimate(p.form) : null;
    if (U) return this._startUlt(p, U);
    var to = this._burstForm(p.form), pool = this.data.movePool ? this.data.movePool(to) : null, ws = [], own;
    var style = this.data.burstStyleOf ? this.data.burstStyleOf(to) : "bombarder";
    function add(id) { if (id && W[id]) ws.push({ id: id, level: W[id].maxLevel || (W[id].levels || []).length || 1, cd: 0 }); }
    if (pool) {
      /* a striker uses its claw, a bombarder its shot, a guardian its shot inside the ring */
      if (style === "striker") {
        /* its best claw: the line's biggest one it could know by now, or one stage early (it is a burst) */
        var ch = this.data.moveChain ? this.data.moveChain(to) : null, best = null, ci;
        for (ci = 0; ch && ci < ch.melee.length; ci++) if (ch.melee[ci].tier <= ch.stage + 1) best = ch.melee[ci].id;
        add(best || pool.melee || pool.primary);
      }
      else add(pool.primary || pool.melee);
    }
    if (!ws.length) { own = (p.weapons || [])[0]; if (own) add(own.id); }
    p.burst = 0; p.burstLeft = B.time + (p.gear ? this._gear(p).burstTime : 0); p.burstForm = to; p.burstWeapons = ws; p.burstStyle = style; p._burstCfg = null; p.burstPulse = 0;
    p.burstAura = (pool && pool.aura) || (ws[0] && ws[0].id) || null;
    this.emit({ type: "burst.start", id: p.id, to: to, from: p.form, x: p.mx, y: p.my, time: B.time, style: style, family: this.data.moveFamilyOf ? this.data.moveFamilyOf(to) : null });
    return { ok: true, to: to, style: style };
  };
  /* ---------- Mega ultimates (moves.js ULT) ---------- */
  /* The ground an ultimate covers, as one or more outlines round a middle
   * point. Each is { cx, cy, pts: [x0, y0, x1, y1, ...] }. */
  MissionSim.prototype._ultPolys = function (U, x, y, a) {
    var S = U.shape || { k: "circle" }, r = U.r, out = [], pts = [], i, n, th, f, p1 = this.rng() * 6.283, p2 = this.rng() * 6.283, p3 = this.rng() * 6.283, self = this;
    function polar(fn, N, cx, cy) { var q = [], j, t, rr; for (j = 0; j < N; j++) { t = (Math.PI * 2 * j) / N; rr = fn(t); q.push(Math.round(cx + Math.cos(t) * rr), Math.round(cy + Math.sin(t) * rr)); } return { cx: Math.round(cx), cy: Math.round(cy), pts: q, polar: 1 }; }
    if (S.k === "ragged") {
      out.push(polar(function (t) { var m = 0.5 + 0.26 * Math.sin(2 * t + p1) + 0.16 * Math.sin(3 * t + p2) + 0.1 * Math.sin(5 * t + p3); return r * (S.lo + (S.hi - S.lo) * Math.max(0, Math.min(1, m)) + (self.rng() - 0.5) * 0.07); }, 72, x, y));
    } else if (S.k === "lobes") {
      out.push(polar(function (t) { return r * (S.base + S.depth * Math.abs(Math.cos(S.n * (t - a - (S.off || 0)) / 2))); }, 96, x, y));
    } else if (S.k === "star") {
      for (i = 0; i < S.n * 2; i++) { th = a + (Math.PI * i) / S.n; f = r * (i % 2 ? S.inner : S.outer); pts.push(Math.round(x + Math.cos(th) * f), Math.round(y + Math.sin(th) * f)); }
      out.push({ cx: Math.round(x), cy: Math.round(y), pts: pts });
    } else if (S.k === "wedge") {
      pts.push(Math.round(x - Math.cos(a) * 30), Math.round(y - Math.sin(a) * 30));
      for (i = 0; i <= 24; i++) { th = a - S.half + (2 * S.half * i) / 24; f = r * S.len * (1 + (S.rag ? (0.5 * Math.sin(i * 1.9 + p1) + (this.rng() - 0.5)) * S.rag : 0)); pts.push(Math.round(x + Math.cos(th) * f), Math.round(y + Math.sin(th) * f)); }
      out.push({ cx: Math.round(x + Math.cos(a) * r * S.len * 0.55), cy: Math.round(y + Math.sin(a) * r * S.len * 0.55), pts: pts });
    } else if (S.k === "beam" || S.k === "band") {
      var ca = Math.cos(a), sa = Math.sin(a), b0 = -(S.back || 0.15) * r, b1 = S.len * r, w = S.w * r;
      /* a lane with torn edges: down one side, back up the other */
      for (i = 0; i <= 16; i++) { f = b0 + (b1 - b0) * i / 16; th = w * (1 + (this.rng() - 0.5) * 0.22) * (i === 16 ? 0.7 : 1); pts.push(Math.round(x + ca * f - sa * th), Math.round(y + sa * f + ca * th)); }
      for (i = 16; i >= 0; i--) { f = b0 + (b1 - b0) * i / 16; th = w * (1 + (this.rng() - 0.5) * 0.22) * (i === 16 ? 0.7 : 1); pts.push(Math.round(x + ca * f + sa * th), Math.round(y + sa * f - ca * th)); }
      out.push({ cx: Math.round(x + ca * (b0 + b1) / 2), cy: Math.round(y + sa * (b0 + b1) / 2), pts: pts });
      if (S.k === "beam") out.push(polar(function () { return r * 0.36; }, 20, x, y));
    } else if (S.k === "discs") {
      n = S.n;
      for (i = 0; i < n; i++) {
        if (S.hex) { th = a + (Math.PI * 2 * i) / 6; f = i ? r * S.within : 0; }
        else { th = i * 2.39996 + p1; f = r * S.within * Math.sqrt((i + 0.5) / n) * (0.85 + this.rng() * 0.3); }
        out.push(polar(function () { return r * S.r; }, 18, x + Math.cos(th) * f, y + Math.sin(th) * f));
      }
    } else {
      out.push(polar(function () { return r * (S.r || 1); }, 56, x, y));
    }
    return out;
  };
  /* is (px, py) on that ground, with every outline grown or shrunk by s about its own middle? */
  function inPolys(polys, px, py, s) {
    var k, P, q, i, j, n, x, y, xi, yi, xj, yj, inside;
    for (k = 0; k < polys.length; k++) {
      P = polys[k]; q = P.pts; n = q.length / 2; x = P.cx + (px - P.cx) / s; y = P.cy + (py - P.cy) / s; inside = false;
      for (i = 0, j = n - 1; i < n; j = i++) {
        xi = q[i * 2]; yi = q[i * 2 + 1]; xj = q[j * 2]; yj = q[j * 2 + 1];
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-9) + xi)) inside = !inside;
      }
      if (inside) return true;
    }
    return false;
  }
  MissionSim.inPolys = inPolys;
  /* the box round a set of outlines (also used by game.js for the guests' copy of the world) */
  MissionSim.polyBox = MissionSim.prototype._polyBox = function (polys) {
    var b = [1e9, 1e9, -1e9, -1e9], k, i, q;
    for (k = 0; k < polys.length; k++) { q = polys[k].pts; for (i = 0; i < q.length; i += 2) { b[0] = Math.min(b[0], q[i]); b[1] = Math.min(b[1], q[i + 1]); b[2] = Math.max(b[2], q[i]); b[3] = Math.max(b[3], q[i + 1]); } }
    return b;
  };
  MissionSim.prototype._startUlt = function (p, U) {
    var t = this._nearestInReach(p.mx, p.my, U.r * 1.3), a = t ? Math.atan2(t.y - p.my, t.x - p.mx) : (p.facing < 0 ? Math.PI : 0);
    if (p.ultLock) return { ok: false, reason: "active" };
    p.burst = 0; p.ultLock = true;
    p.monInvuln = Math.max(p.monInvuln || 0, U.windup + U.spread + 0.4 + (U.shield || 0));
    this._ults = this._ults || [];
    var polys = this._ultPolys(U, p.mx, p.my, a);
    this._ults.push({ ownerId: p.id, U: U, t: 0, x: p.mx, y: p.my, a: a, fired: false, hits: [], leeched: 0, polys: polys });
    this.emit({ type: "ult.start", id: p.id, w: U.id, name: U.name, form: p.form, pat: U.pat, x: p.mx, y: p.my, r: U.r, a: a, windup: U.windup, spread: U.spread, pop: U.pop || "", style: U.style || "", shield: U.shield || 0, say: U.say || "",
      polys: polys, mark: U.mark || null, discs: !!(U.shape && U.shape.k === "discs") });
    return { ok: true, ult: U.id };
  };
  MissionSim.prototype._updateUlts = function (dt) {
    var list = this._ults || [], zs = this._zones || [], i, j, u, U, p, e, d, dx, dy, fr, delay, h, big, dmg, n, k, a, q, lv, z, W = this.data.WEAPONS || {};
    /* marked ground: whoever stands on it keeps getting its status */
    for (i = zs.length - 1; i >= 0; i--) {
      z = zs[i]; z.t += dt; z.tick -= dt;
      if (z.t >= z.max) { zs.splice(i, 1); continue; }
      if (z.tick > 0) continue;
      z.tick = 0.5;
      for (j = 0; j < this.enemies.length; j++) {
        e = this.enemies[j];
        if (e.dead || !(e.hp > 0) || !inPolys(z.polys, e.x, e.y, 1)) continue;
        this._setStatus(e, z.status, 1.2, z.status === "burn" ? { dps: e.maxHp * ((e.boss || e.mega || e.lord || e.rival) ? 0.004 : 0.04), owner: this.player(z.ownerId), quiet: !!(e.st && e.st.burn) } : { quiet: !!(e.st && e.st[z.status]) });
      }
    }
    for (i = list.length - 1; i >= 0; i--) {
      u = list[i]; U = u.U; p = this.player(u.ownerId); u.t += dt;
      if (!u.fired && u.t >= U.windup) {
        u.fired = true;
        for (j = 0; j < this.enemies.length; j++) {
          e = this.enemies[j]; if (e.dead) continue;
          dx = e.x - u.x; dy = e.y - u.y; d = Math.sqrt(dx * dx + dy * dy);
          if (d > U.r * 3) continue;
          /* 2 well inside, 1 at the edge, 0 in the band just outside */
          lv = inPolys(u.polys, e.x, e.y, 0.86) ? 2 : (inPolys(u.polys, e.x, e.y, 1) ? 1 : (inPolys(u.polys, e.x, e.y, 1.22) ? 0 : -1));
          if (lv < 0) continue;
          fr = ((Math.atan2(dy, dx) - u.a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2);
          if (U.pat === "sweep") delay = fr;
          else if (U.pat === "storm" || U.pat === "orbs") delay = Math.abs(Math.sin(e._id * 12.9898 + 4.1)) % 1;
          else if (U.pat === "spiral") delay = 0.5 * Math.min(1, d / U.r) + 0.5 * fr;
          else if (U.pat === "wall" || U.pat === "cannon") delay = Math.max(0, Math.min(1, (dx * Math.cos(u.a) + dy * Math.sin(u.a)) / (2 * U.r)));
          else delay = Math.min(1, d / (U.r * 1.4));
          u.hits.push({ e: e, t: u.t + delay * U.spread, lv: lv });
        }
        /* what it leaves burning or puddled: one in the middle, the rest in a ring */
        if (U.patch && this._addPatch) {
          for (k = 0; k < U.patch.n; k++) {
            a = u.a + (Math.PI * 2 * k) / Math.max(1, U.patch.n - 1);
            q = this._addPatch(U.patch.kind, u.x + (k ? Math.cos(a) * U.r * 0.5 : 0), u.y + (k ? Math.sin(a) * U.r * 0.5 : 0), U.patch.r, p ? p.maxHp * 0.02 : 4, p, 9);
            if (q && q.max != null) { q.t = q.max = U.patch.life; }
          }
        }
        /* the living map: trees inside go down; an ice mark freezes every bit of water it covers */
        var wld = this.data.world, uB = this._polyBox(u.polys), upol = u.polys;
        if (wld && wld.fellTest && wld.fellTest(function (px, py) { return inPolys(upol, px, py, 1); }, uB[0], uB[1], uB[2], uB[3], u.x, u.y, this.time))
          this.emit({ type: "fx", k: "fellp", polys: upol, x: Math.round(u.x), y: Math.round(u.y), at: this.time });
        if (U.mark && U.mark.k === "ice" && wld && wld.freezeTest && wld.freezeTest(function (px, py) { return inPolys(upol, px, py, 1.05); }, uB[0], uB[1], uB[2], uB[3], this.time + U.mark.time))
          this.emit({ type: "fx", k: "icepoly", polys: upol, until: this.time + U.mark.time });
        if (U.zone) { this._zones = zs; zs.push({ polys: u.polys, status: U.zone[0], t: 0, max: U.zone[1], tick: 0.5, ownerId: u.ownerId }); if (zs.length > 6) zs.shift(); }
        if (p && U.heal && p.hp > 0) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * U.heal);
        /* its own shot, fired outward in every direction (Fire Tornado) */
        if (p && U.after && W[U.id]) { lv = W[U.id].levels[W[U.id].levels.length - 1]; for (k = 0; k < U.after; k++) this._shots(W[U.id], lv, p.id, u.x, u.y, u.a + (Math.PI * 2 * k) / U.after, 1.5, 0); }
      }
      for (j = u.hits.length - 1; j >= 0; j--) {
        h = u.hits[j]; if (h.t > u.t) continue;
        u.hits.splice(j, 1); e = h.e;
        if (e.dead || !(e.hp > 0)) continue;
        big = !!(e.boss || e.mega || e.lord || e.rival);
        dx = e.x - u.x; dy = e.y - u.y;
        if (h.lv >= 1) {
          /* x2.4 of its health, so a resisted hit still kills an ordinary enemy; the edge is only a quarter of that */
          dmg = big ? e.maxHp * (U.boss || 0.25) : e.maxHp * (U.dmg || 2.4) * (h.lv === 1 ? 0.25 : 1);
          n = U.knock || 120;
          this.hurtEnemy(e, dmg, n < 0 ? -dx : (dx || 1), n < 0 ? -dy : dy, Math.abs(n) * (big ? 0.3 : 1), p || { id: u.ownerId }, 1, U.id);
          if (U.leech && p && p.hp > 0 && u.leeched < U.leech) { u.leeched += 0.02; p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.02); }
        }
        if (e.dead || !(e.hp > 0)) continue;
        /* survivors, and the band just outside, are marked */
        k = (big ? 0.4 : 1) * (h.lv === 0 ? 0.6 : 1);
        if (U.status) { if (U.status[0] === "freeze" && big) this._setStatus(e, "chill", U.status[1] * 0.6, {}); else this._setStatus(e, U.status[0], U.status[1] * k, U.status[0] === "burn" ? { dps: e.maxHp * 0.05, owner: p } : {}); }
        if (U.dot) this._setStatus(e, U.dot[0], U.dot[1] * k, { dps: e.maxHp * (big ? 0.01 : 0.06), owner: p });
      }
      if (u.fired && !u.hits.length && u.t > U.windup + U.spread + 0.3) {
        if (p) p.ultLock = false;
        list.splice(i, 1);
        this.emit({ type: "ult.end", id: u.ownerId, x: u.x, y: u.y });
      }
    }
  };

  MissionSim.prototype._updateBurst = function (p, dt) {
    var B = this.data.BURST;
    if (!B || this._isEgg(p.form)) return;
    if (p.burstLeft > 0) {
      p.burstLeft -= dt;
      if (p.burstLeft <= 0 || p.downed || p.faint > 0) {
        p.burstLeft = 0; p.burstForm = null; p.burstWeapons = null; p.burstStyle = null; p._burstCfg = null;
        this.emit({ type: "burst.end", id: p.id, x: p.mx, y: p.my });
        return;
      }
      /* Guardian: a ring that pulses, hurting and throwing back whatever is inside */
      var G = this._burstCfg(p), W = this.data.WEAPONS || {}, i, e, d, bw, lv, dmg;
      if (G && G.pulseEvery) {
        p.burstPulse = (p.burstPulse || 0) - dt;
        if (p.burstPulse <= 0) {
          p.burstPulse = G.pulseEvery;
          bw = p.burstWeapons && p.burstWeapons[0]; lv = bw && W[bw.id] && W[bw.id].levels[Math.min(bw.level, W[bw.id].levels.length) - 1];
          dmg = ((lv && lv.damage) || 10) * G.pulseDamage * G.damageMul * ((p.stats && p.stats.damageMul) || 1) * ((p.stats && p.stats.specMul) || 1);
          this.emit({ type: "fx", k: "pulse", w: p.burstAura, x: p.mx, y: p.my, r: G.pulseRadius });
          for (i = 0; i < this.enemies.length; i++) {
            e = this.enemies[i];
            if (e.dead) continue;
            d = dist2(p.mx, p.my, e.x, e.y);
            if (d <= Math.pow(G.pulseRadius + (e.radius || 10), 2)) this.hurtEnemy(e, dmg, e.x - p.mx, e.y - p.my, G.pulseKnock, p, null, p.burstAura);
          }
        }
      }
      return;
    }
    if (p.downed || p.faint > 0 || !this._spawnsOpen()) return;
    /* a max-health passive arrives or leaves with the ally */
    var wantHp = (p.stats && p.stats.allyMaxHp) || 1, hadHp = p._allyHpMul || 1;
    if (wantHp !== hadHp && p.maxHp) {
      p.maxHp = Math.round(p.maxHp / hadHp * wantHp);
      p.hp = wantHp > hadHp ? Math.min(p.maxHp, p.hp * wantHp / hadHp) : Math.min(p.hp, p.maxHp);
      p._allyHpMul = wantHp;
    }
    p.burst = Math.min(100, (p.burst || 0) + B.passive * dt * ((p.stats && p.stats.allyBurst) || 1) * (p.gear ? this._gear(p).burst : 1) * this._lab(p).burst);
    if (p.stats && p.stats.allyRegen && p.hp > 0 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * p.stats.allyRegen * dt);
    /* CPU partners and tamers who stepped away use it when there is something to use it on */
    if (p.burst >= 100 && (p.kind === "cpu" || p.away || p.hasTamer === false) && this._nearestInReach(p.mx, p.my, 200)) this.startBurst(p);
  };

  /* Lava scorches a partner standing right at its edge. Never the last
   * hit point, and never enemies (no luring hordes into it for free kills). */
  MissionSim.prototype._updateLava = function (dt) {
    var L = this.data && this.data.LAVA, w = this.data && this.data.world, i, p, dmg;
    if (!L || !w || !w.hazardNear) return;
    for (i = 0; i < this.players.length; i++) {
      p = this.players[i];
      if (p.atFarm || this._isEgg(p.form) || p.faint > 0 || p.downed || !(p.hp > 1)) continue;
      if (!w.hazardNear(p.mx, p.my, L.edge)) { p.burnT = 0; continue; }
      p.burnT = (p.burnT || 0) + dt;
      if (p.burnT < L.every) continue;
      p.burnT -= L.every;
      dmg = Math.min(p.hp - 1, Math.max(L.minDamage, (p.maxHp || 1) * L.damage));
      if (dmg <= 0) continue;
      p.hp -= dmg;
      p.sinceHit = 0;
      this.emit({ type: "hurt", who: "mon", id: p.id, amount: dmg, hp: p.hp, burn: true });
      this.emit({ type: "fx", k: "burn", x: p.mx, y: p.my - 20, id: p.id });
    }
  };

  /* Lords (data.js LORD): the huge native boss at each lair. Brought in
   * while its lair is still off-screen; asleep (like an idle pack of one)
   * until someone comes close. */
  MissionSim.prototype._updateLords = function (dt, host) {
    var L = this.data.LORD, w = this.data.world, BI = this.data.biomes, i, l, st, k, e, list, defs, want, s2, type, year, S;
    if (!L || !w || !w.lairsNear || !BI || !BI.homeOf || !host) return;
    this.lordT = (this.lordT || 0) - dt;
    if (this.lordT > 0) return;
    this.lordT = 1.5;
    this.lairs = this.lairs || {}; this.packs = this.packs || {};
    /* one that was left far behind and removed can come back later */
    var alive = {};
    for (i = 0; i < this.enemies.length; i++) if (this.enemies[i].lord && !this.enemies[i].dead) alive[this.enemies[i].lairKey] = 1;
    for (k in this.lairs) if (this.lairs[k] === "out" && !alive[k]) delete this.lairs[k];
    list = w.lairsNear(host.x, host.y, L.spawnAt);
    S = this.data.SEASONS_CFG || {}; year = Math.floor(this.time / (((S.lengthSec || 486) * 4) || 1944));
    defs = this._enemies();
    for (i = 0; i < list.length; i++) {
      l = list[i]; st = this.lairs[l.key];
      if (st) continue;
      if (dist2(host.x, host.y, l.x, l.y) > L.spawnAt * L.spawnAt) continue;
      /* a native of that biome, of this year's stage (or the nearest stage below that has one) */
      type = null;
      for (s2 = Math.min(year, L.stages.length - 1); s2 >= 0 && !type; s2--) {
        want = [];
        for (k in defs) if (defs[k] && defs[k].stageDisplay === L.stages[s2] && BI.homeOf(k) === l.biome) want.push(k);
        want.sort();
        if (want.length) type = want[Math.floor(hash01(l.key + "|" + s2) * want.length)];
      }
      if (!type) { this.lairs[l.key] = "none"; continue; }
      e = this.spawnEnemy(type, { x: l.x, y: l.y, boss: true, keepType: true, quiet: true });
      if (!e) continue;
      e.lord = true; e.lairKey = l.key; e.lairBiome = l.biome;
      if (this.data.LEVELS) e.lv += this.data.LEVELS.lordLv - this.data.LEVELS.bossLv;   /* a lord is the top of its country */
      e.radius *= L.size;
      e.maxHp = e.hp = e.maxHp * L.hpMul * (1 + L.hpPerYear * year);
      e.dmgMul = (e.dmgMul || 1) * (L.dmgMul + L.dmgPerYear * year);
      e.pack = "lord:" + l.key; e.homeX = l.x; e.homeY = l.y; e.wx = l.x; e.wy = l.y; e.wT = 2;
      this.packs[e.pack] = { awake: false, x: l.x, y: l.y, lord: true };
      this.lairs[l.key] = "out";
    }
  };

  /* Herds (nests and lords' packs) standing about until someone comes close: drop the ones that
   * are gone, and let the rest live their day (_packRoutine). Packs no longer appear on a timer:
   * every herd comes out of a nest (nest-sim.js). */
  MissionSim.prototype._updatePacks = function (dt, wave, host) {
    var i, e, alive = {}, k;
    if (!host) return;
    this.packs = this.packs || {};
    for (i = 0; i < this.enemies.length; i++) { e = this.enemies[i]; if (e.pack && !e.dead) alive[e.pack] = 1; }
    for (k in this.packs) if (!alive[k]) delete this.packs[k];
    for (k in this.packs) if (!this.packs[k].awake && !this.packs[k].lord) this._packRoutine(this.packs[k], dt);
  };

  /* ---------- Wild routines (Nov 20) ----------
   * A pack nobody has disturbed lives its day: it grazes about as one herd,
   * wanders down to the nearest open water to drink, and beds down when
   * night falls (Zzz: it notices you from much closer, so you can sneak by).
   * Virus packs are the exception: they stay up and prowl wider after dark. */
  MissionSim.prototype._packRoutine = function (PK, dt) {
    var L = (this.data.LIVING && this.data.LIVING.routine) || {}, SN = this.data.seasons, w = this.data.world;
    var dark = SN && SN.darkOf ? SN.darkOf(this) : 0, spd, d, n, nx, ny, spot;
    if (PK.cx == null) { PK.cx = PK.hx = PK.tx = PK.x; PK.cy = PK.hy = PK.ty = PK.y; PK.task = "graze"; PK.tT = 3; }
    if (!PK.night && dark > 0.5) { if (PK.task !== "sleep") { PK.task = "sleep"; PK.tx = PK.cx; PK.ty = PK.cy; } return; }
    if (PK.task === "sleep") { PK.task = "graze"; PK.tT = 2 + this.rng() * 4; }
    PK.tT -= dt;
    if (PK.tT <= 0) {
      spot = this.rng() < (L.drinkChance || 0.45) ? this._drinkSpot(PK) : null;
      if (spot) { PK.task = "drink"; PK.tx = spot.x; PK.ty = spot.y; PK.tT = (L.drinkSec || 22) + this.rng() * 10; }
      else {
        PK.task = "graze";
        var roam = (L.roam || 220) * (PK.night && dark > 0.5 ? (L.prowl || 2) : 1), a = this.rng() * Math.PI * 2, r = roam * (0.3 + 0.7 * this.rng());
        nx = PK.hx + Math.cos(a) * r; ny = PK.hy + Math.sin(a) * r;
        if (!this._navReady() || this._lineClear(PK.cx, PK.cy, nx, ny, 14)) { PK.tx = nx; PK.ty = ny; }
        PK.tT = (L.grazeSec || 18) + this.rng() * 14;
      }
    }
    /* the herd's middle walks on, slowly; its members follow it about */
    d = Math.sqrt((PK.tx - PK.cx) * (PK.tx - PK.cx) + (PK.ty - PK.cy) * (PK.ty - PK.cy));
    if (d > 4) {
      spd = (L.herdSpeed || 9) * (PK.night && dark > 0.5 ? (L.prowlSpeed || 1.6) : 1) * dt;
      n = Math.min(1, spd / d);
      nx = PK.cx + (PK.tx - PK.cx) * n; ny = PK.cy + (PK.ty - PK.cy) * n;
      if (w && w.isRaised && w.isRaised(nx, ny, 12)) { PK.tx = PK.cx; PK.ty = PK.cy; PK.tT = Math.min(PK.tT, 1); }
      else { PK.cx = nx; PK.cy = ny; }
    }
  };
  /* the nearest bank of open water within reach of the herd, if any */
  MissionSim.prototype._drinkSpot = function (PK) {
    var w = this.data.world, L = (this.data.LIVING && this.data.LIVING.routine) || {}, reach = L.drinkReach || 420, r, k, a, x, y, b, bx, by;
    if (!w || !w.openWaterAt || !this._navReady()) return null;
    var off = this.rng() * Math.PI * 2;
    for (r = 90; r <= reach; r += 55) {
      for (k = 0; k < 16; k++) {
        a = off + (Math.PI * 2 * k) / 16; x = PK.cx + Math.cos(a) * r; y = PK.cy + Math.sin(a) * r;
        if (!w.openWaterAt(x, y)) continue;
        /* step back toward the herd until there is ground to stand on */
        for (b = 30; b < r; b += 18) {
          bx = x - Math.cos(a) * b; by = y - Math.sin(a) * b;
          if (!w.isRaised(bx, by, 12)) return this._lineClear(PK.cx, PK.cy, bx, by, 14) ? { x: bx, y: by } : null;
        }
      }
    }
    return null;
  };

  MissionSim.prototype._pickMegaType = function (cfg) {
    cfg = cfg || {};
    var stages = ["Ultimate (Mega)"];
    if (cfg.includeMegaPlus !== false) stages.push("Ultimate (Mega+)");
    var pool = [], s, src, i, e, tree;
    tree = (this.data && this.data.EVO_TREE) || (typeof D !== "undefined" && D.EVO_TREE) || null;
    if (tree && tree.enemies) {
      for (s = 0; s < stages.length; s++) {
        src = tree.enemies[stages[s]] || [];
        for (i = 0; i < src.length; i++) {
          e = src[i];
          if (!e || !e.id) continue;
          if ((this.data.ENEMIES && this.data.ENEMIES[e.id]) || (this.data.SPECIES && this.data.SPECIES[e.id])) pool.push(e.id);
        }
      }
    }
    if (!pool.length) {
      ["wargreymon", "metalgarurumon"].forEach(function (id) { pool.push(id); }.bind(this));
      /* Keep configured rare-mega identity even if the catalog is thin. */
      pool = pool.filter(function (id) {
        return (this.data.ENEMIES && this.data.ENEMIES[id]) || (this.data.SPECIES && this.data.SPECIES[id]);
      }.bind(this));
    }
    if (!pool.length) return null;
    return pool[(this.rng() * pool.length) | 0];
  };

  MissionSim.prototype._updateFieldMega = function (dt) {
    var cfg = this.data && this.data.MEGA_SPAWN;
    if (!cfg) return;
    if (this.time < (cfg.firstAt != null ? cfg.firstAt : 360)) return;
    /* Rare era (before cfg.rareUntil): one roll per rareEvery seconds, at
     * most one Mega on the field. After that they come on a short timer. */
    var rare = cfg.rareUntil != null && this.time < cfg.rareUntil;
    this.megaAcc = (this.megaAcc || 0) + dt;
    var interval = rare ? (cfg.rareEvery || 360) : (cfg.interval != null ? cfg.interval : 32);
    if (this.megaAcc < interval) return;
    this.megaAcc = 0;
    if (rare && this.rng() > (cfg.rareChance != null ? cfg.rareChance : 0.3)) return;
    var maxN = rare ? 1 : (cfg.maxOnScreen != null ? cfg.maxOnScreen : 1);
    var cd = cfg.cooldown != null ? cfg.cooldown : 50;
    var n = 0, i;
    for (i = 0; i < this.enemies.length; i++) if (this.enemies[i].mega && !this.enemies[i].dead) n += 1;
    if (n >= maxN) return;
    if (this.lastMegaAt != null && this.lastMegaAt >= 0 && this.time - this.lastMegaAt < cd) return;
    var hp0 = this.player(this.localId) || this.players[0];
    if (hp0 && this._startZone && this._startZone(hp0.x, hp0.y)) return;   /* the start stays low (modes-sim.js / nest-sim.js) */
    var type = this._pickMegaType(cfg);
    if (!type) return;
    this.spawnEnemy(type, { fieldMega: true });
    this.lastMegaAt = this.time;
  };

  MissionSim.prototype._updateMerchant = function () {
    var S = this.data && this.data.SHOP;
    if (!S) { this.merchant = null; return; }
    var first = S.firstAt != null ? S.firstAt : 38;
    var every = S.every != null ? S.every : 85;
    var linger = S.linger != null ? S.linger : 32;
    var open = this.time >= first && ((this.time - first) % every) < linger;
    if (open) {
      if (!this.merchant) {
        var host = this.player(this.localId) || this.players[0];
        var hx = host ? host.x + 80 : 80, hy = host ? host.y - 20 : 0;
        var pos = this._snap(hx, hy, 14, 240);
        this.merchant = { x: pos.x, y: pos.y, form: S.merchantId || "jijimon", open: true, visit: this.time };   /* visit: his stock (shop.js shopStock) */
        this.emit({ type: "merchant", x: pos.x, y: pos.y, form: this.merchant.form });
      } else {
        this.merchant.open = true;
      }
    } else {
      this.merchant = null;
    }
  };

  MissionSim.prototype._updateEnemies = function (dt) {
    var i, e, def, wave, spd, n, dmg, p, ci, cm, closest, ax, ay, tDist, mDist;
    wave = this._wave(this.time);
    var frozen = this.enemyFreeze > 0;
    if (frozen) this.enemyFreeze -= dt;
    /* after dark they notice you from further off and bite more often (seasons.js DAY) */
    if (this._updateNemeses) this._updateNemeses(dt);
    var SN = this.data.seasons, nightAggro = SN && SN.aggroScale ? SN.aggroScale(this) : 1, nightRate = SN && SN.atkRateScale ? SN.atkRateScale(this) : 1;
    /* Far from everyone (17z33): a plain wild Digimon further than LOD.far from every tamer,
     * partner, ally, CPU teammate, rival and nemesis is updated one tick in LOD.every, with all the
     * time it missed, so it ends up where it would have been. Nobody can see it (LOD.far is about
     * twice what any screen shows) and nothing near anyone changes; soldiers of a war, nemeses,
     * rivals, the infected and Digimon fighting each other are always updated every tick. */
    var LOD = this.data.SIM_LOD, baseDt = dt, watchers = null, lodTick = 0, lodFar2 = 0, w2, wi;
    if (LOD && LOD.every > 1) {
      lodTick = this._lodTick = (this._lodTick || 0) + 1;
      lodFar2 = LOD.far * LOD.far;
      watchers = [];
      for (p = 0; p < this.players.length; p++) { watchers.push(this.players[p].x, this.players[p].y, this.players[p].mx, this.players[p].my); }
      if (this.ally) watchers.push(this.ally.x, this.ally.y);
      for (ci = 0; ci < this.cpus.length; ci++) if (this.cpus[ci]) watchers.push(this.cpus[ci].x, this.cpus[ci].y);
      for (i = 0; i < this.enemies.length; i++) { e = this.enemies[i]; if (!e.dead && (e.rival || e.nemesis)) watchers.push(e.x, e.y); }
    }
    for (i = this.enemies.length - 1; i >= 0; i--) {
      e = this.enemies[i];
      dt = baseDt;
      if (e.dead) { this.enemies.splice(i, 1); continue; }
      if (watchers && !e.rival && !e.nemesis && e.nemLead == null && !e.virus && !e.war && !e.rally && !(e.foeT > 0) && !e.lord && !e.wev) {
        w2 = 1e18;
        for (wi = 0; wi < watchers.length && w2 > lodFar2; wi += 2) w2 = Math.min(w2, dist2(e.x, e.y, watchers[wi], watchers[wi + 1]));
        if (w2 > lodFar2) {
          e._lodDt = (e._lodDt || 0) + baseDt;
          if ((lodTick + (e._id || 0)) % LOD.every !== 0) { e._lodIdle = true; continue; }
          dt = Math.min(e._lodDt, baseDt * LOD.every * 2);
          e._lodDt = 0;
        } else if (e._lodDt) { dt = baseDt + Math.min(e._lodDt, baseDt * LOD.every); e._lodDt = 0; }
      } else if (e._lodDt) { dt = baseDt + Math.min(e._lodDt, baseDt * LOD.every); e._lodDt = 0; }
      e._lodIdle = false;
      def = this._enemies()[e.type] || { speed: 40, damage: 7, contactCd: 0.7 };
      e.flash = Math.max(0, e.flash - dt);
      if (frozen) continue;                      /* a level-up breather: nobody moves, nobody bites */
      if (!this._tickStatus(e, dt)) continue;    /* burn, poison and the rest; it may die of them */
      if (e.stStun) continue;                    /* frozen solid or shocked */
      if (e.rival && this._rivalAct) { this._rivalAct(e, dt); continue; }   /* the rival thinks for itself (rival-sim.js) */
      e.hitCd = Math.max(0, e.hitCd - dt * nightRate);
      e.hitCdM = Math.max(0, e.hitCdM - dt * nightRate);
      e.hitCdA = Math.max(0, (e.hitCdA || 0) - dt * nightRate);
      if (e.slowTime > 0) e.slowTime -= dt;
      else e.slow = 1;
      var wSpd = weatherApi() ? weatherApi().enemySpeedScale(this, this.data) : 1;
      spd = (def.speed || 40) * (e.z0 >= 2 ? 1 : (wave.spdMul || 1)) * (e.slow || 1) * wSpd * (e.stSlow == null ? 1 : e.stSlow) * (e.rivalSpd || 1) * (e.vSpd || 1) * (e.spdMul || 1);
      closest = 1e15; ax = e.x; ay = e.y;
      var tamerSafe = !!this._tamer().invulnerable, tKey = null, fbD = 1e15, fbX = e.x, fbY = e.y, fbKey = null;
      var eFac = this._factionOf ? this._factionOf(e) : null;
      for (p = 0; p < this.players.length; p++) {
        var pl = this.players[p];
        if (pl.atFarm || (eFac && this._trusts(pl, eFac))) continue;  /* away at the farm, or trusted (faction-sim.js): not a target */
        if (tamerSafe) {
          /* nothing to fight: mill around the nearest tamer instead */
          if (pl.hasTamer && !pl.away) { tDist = dist2(e.x, e.y, pl.x, pl.y); if (tDist < fbD) { fbD = tDist; fbX = pl.x; fbY = pl.y; fbKey = "t:" + pl.id; } }
        } else if (pl.hasTamer && !(this.coop && (pl.downed || pl.away))) {
          tDist = dist2(e.x, e.y, pl.x, pl.y);
          if (tDist < closest) { closest = tDist; ax = pl.x; ay = pl.y; tKey = "t:" + pl.id; }
        }
        if (pl.faint <= 0 && pl.hp > 0 && !pl.downed && !this._isEgg(pl.form)) {
          mDist = dist2(e.x, e.y, pl.mx, pl.my);
          if (mDist < closest) { closest = mDist; ax = pl.mx; ay = pl.my; tKey = "m:" + pl.id; }
        }
      }
      if (this.ally && this.ally.hp > 0 && !this._isEgg(this.ally.form)) {
        var aDist = dist2(e.x, e.y, this.ally.x, this.ally.y);
        if (aDist < closest) { closest = aDist; ax = this.ally.x; ay = this.ally.y; tKey = "ally"; }
      }
      for (ci = 0; ci < this.cpus.length; ci++) {
        cm = this.cpus[ci];
        if (!cm || cm.hp <= 0 || this._isEgg(cm.form)) continue;
        var cDist = dist2(e.x, e.y, cm.x, cm.y);
        if (cDist < closest) { closest = cDist; ax = cm.x; ay = cm.y; tKey = "c:" + cm.id; }
      }
      /* A pack that has not noticed anyone mills about its spot. One of
       * them seeing a tamer or partner, or being hit, wakes them all. */
      var milling = false, PK = e.pack && this.packs && this.packs[e.pack], PC = this.data.PACKS;
      if (e.pack && PK && !PK.awake && PC && !e.rally) {
        var near = Math.min(closest, fbD);
        if (e.lord && this.data.LORD) PC = { aggro: this.data.LORD.aggro, wander: this.data.LORD.wander, idleSpeed: PC.idleSpeed, forgetAt: this.data.LORD.forgetAt };
        var LR = (this.data.LIVING && this.data.LIVING.routine) || {}, asleep = PK.task === "sleep", agR = PC.aggro * (asleep ? (LR.sleepAggro || 0.45) : nightAggro);
        if (near < agR * agR || e.hp < e.maxHp) {
          PK.awake = true;
          this.emit({ type: "fx", k: "alert", x: e.x, y: e.y - (e.radius || 10) - 10 });
        } else if (near > PC.forgetAt * PC.forgetAt) {
          if (this._allyHome) this._allyHome(e);   /* a veteran is remembered by its nest */
          e.dead = true;                      /* left far behind: quietly gone */
          continue;
        } else {
          milling = true;
          e.zz = asleep ? 1 : 0;
          e.wT = (e.wT || 0) - dt;
          if (e.wT <= 0) {
            e.wT = 1.5 + this.rng() * 3;
            var wa = this.rng() * Math.PI * 2, wr = this.rng() * PC.wander;
            if (PK.cx != null && !PK.lord) {
              /* keep its place in the herd, closer in round a watering hole */
              var tight = PK.task === "drink" ? 0.45 : 0.8;
              wr *= PK.task === "drink" ? 0.35 : 0.5;
              e.wx = PK.cx + (e.ox || 0) * tight + Math.cos(wa) * wr; e.wy = PK.cy + (e.oy || 0) * tight + Math.sin(wa) * wr;
            } else { e.wx = e.homeX + Math.cos(wa) * wr; e.wy = e.homeY + Math.sin(wa) * wr; }
          }
          if (asleep) { e.wx = e.x; e.wy = e.y; }
        }
      }
      var idle = false;
      if (!milling && e.zz) e.zz = 0;
      if (milling) {
        ax = e.wx; ay = e.wy; spd *= PC.idleSpeed;
        idle = dist2(e.x, e.y, ax, ay) < 36;
      } else
      if (tKey == null && tamerSafe && fbKey) {
        ax = fbX; ay = fbY; tKey = fbKey;
        idle = fbD < 110 * 110; /* close enough: stand off, there is nothing to hit */
      }
      /* An infected Digimon picks its own fight (virus-sim.js): null means a tamer's side is in
       * sight and it comes for them like anything else. One it has hit turns on it for a while. */
      /* the start is the Babies' (playtest, Nov 20): a Digimon from out in the world does not follow a
       * tamer's side into the Baby zone (a whole pack chased a freshly hatched partner in, again and again);
       * it stops at the edge, and one that wandered in walks back out */
      var Zs = this.data.RESPAWN && this.data.RESPAWN.zone;
      if (Zs && this._startZone && e.z0 != null && e.z0 < 2 && !e.rally && !e.rival && !e.nemesis && !e.virus && !e.siege) {   /* Night Siege attackers come in anyway */
        if (this._startZone(e.x, e.y) >= 2) { var dz0 = Math.sqrt(e.x * e.x + e.y * e.y) || 1, rz0 = Zs.baby + 120; ax = e.x / dz0 * rz0; ay = e.y / dz0 * rz0; tKey = null; milling = false; idle = false; }
        else if (tKey != null && this._startZone(ax, ay) >= 2) { tKey = null; idle = true; }
      }
      var bite = null;
      if (e.rally && this._rallyAct) bite = this._rallyAct(e, dt);    /* fighting at a tamer's side (faction-sim.js) */
      else if (e.nemesis && this._nemesisAct) { e.vCd = Math.max(0, (e.vCd || 0) - dt); bite = this._nemesisAct(e, closest, dt); }   /* nemesis-sim.js */
      else if (e.nemLead != null && this._nemFollow) { e.vCd = Math.max(0, (e.vCd || 0) - dt); bite = this._nemFollow(e, closest, dt); }
      else if (e.virus && this._virusTarget) { bite = this._virusTarget(e, closest, dt); if (e.dead) continue; }
      else if (e.foeT > 0 && this._wildFoe) bite = this._wildFoe(e, dt);
      else if (e.war && this._warAct) { bite = this._warAct(e, closest, dt); if (e.dead) continue; }
      else if (e.siege && this._siegeAct) bite = this._siegeAct(e, closest, dt, ax, ay);   /* Night Siege: the eggs, unless you're near */
      if (bite) { milling = false; idle = !!bite.idle; ax = bite.x; ay = bite.y; tKey = null; }
      /* Enemies obey the terrain like the tamer does: they walk around
       * cliffs (flow field when the straight line is blocked). */
      n = idle ? { x: 0, y: 0 } : (milling ? norm(ax - e.x, ay - e.y) : this._steer(e, ax, ay, tKey, dt));
      /* A freshly hit enemy is shoved back and briefly stops advancing. */
      if (e.kbStun > 0) e.kbStun -= dt;
      else if (!idle) {
        var mv = this._slide(e.x, e.y, n.x * spd * dt, n.y * spd * dt, this._navRad(e), this._crossOf(e.type)), ex0 = e.x, ey0 = e.y;
        e.x = mv.x; e.y = mv.y;
        if (e.siege && this._siegeBlock) this._siegeBlock(e, ex0, ey0);      /* a standing fence stops it (siege-sim.js) */
      }
      if (e.kvx || e.kvy) {
        var kpos = this._slide(e.x, e.y, e.kvx * dt, e.kvy * dt, Math.max(4, (e.radius || 10) * 0.6), this._crossOf(e.type));
        e.x = kpos.x; e.y = kpos.y;
        var kd = Math.exp(-(((this.data && this.data.KNOCKBACK) || {}).decay || 11) * dt);
        e.kvx *= kd; e.kvy *= kd;
        if (Math.abs(e.kvx) + Math.abs(e.kvy) < 4) { e.kvx = 0; e.kvy = 0; }
      }
      if (n.x !== 0) e.facing = n.x < 0 ? -1 : 1;
      /* No standing on a Digimon or a tamer: partner, tamer, captured ally,
       * CPU teammates. They can crowd right up against them. */
      for (p = 0; p < this.players.length; p++) {
        var sp2 = this.players[p];
        if (sp2.faint <= 0 && sp2.hp > 0 && !this._isEgg(sp2.form)) this._separateFrom(e, sp2.mx, sp2.my, this._actorRad(sp2.form));
        else if (this._isEgg(sp2.form)) this._separateFrom(e, sp2.mx, sp2.my, 9);
        if (sp2.hasTamer && !sp2.away) this._separateFrom(e, sp2.x, sp2.y, this._tamer().radius || 10);
      }
      if (this.ally && this.ally.hp > 0 && !this._isEgg(this.ally.form)) this._separateFrom(e, this.ally.x, this.ally.y, this._actorRad(this.ally.form));
      for (ci = 0; ci < this.cpus.length; ci++) {
        cm = this.cpus[ci];
        if (cm && cm.hp > 0 && !this._isEgg(cm.form)) this._separateFrom(e, cm.x, cm.y, this._actorRad(cm.form));
      }
      var wAtk = weatherApi() ? weatherApi().enemyAtkScale(this, this.data) : 1;
      dmg = (def.damage || 7) * (e.z0 >= 2 ? 1 : (wave.dmgMul || 1)) * (e.dmgMul || 1) * wAtk * (e.st && e.st.daze && this.data.STATUS ? this.data.STATUS.holy.dealt : 1);
      if (bite && bite.fence != null) { if (bite.fence >= 0) this._siegeFenceBite(e, bite.fence, dmg, def); }
      else if (bite && bite.egg != null) { if (bite.egg >= 0) this._siegeBite(e, bite.egg, dmg, def); }
      else if (bite) { if (!bite.wander) this._wildBite(e, bite, dmg * (e.war && this.data.WAR ? this.data.WAR.fightMul : 1), dt); }
      else this._contactHits(e, def, dmg, dt);
    }
    dt = baseDt;
    this._resolveBodies();
  };

  /* A few relaxation rounds: enemies push each other apart, then are pushed
   * off tamers and Digimon last so those are never stood on. */
  MissionSim.prototype._resolveBodies = function () {
    var it, i, e, p, sp, ci, cm, tr = this._tamer().radius || 10;
    for (it = 0; it < 3; it++) {
      this._separateEnemies();
      for (i = 0; i < this.enemies.length; i++) {
        e = this.enemies[i];
        if (e.dead || e._lodIdle) continue;                          /* far from everyone: nobody to push off */
        for (p = 0; p < this.players.length; p++) {
          sp = this.players[p];
          if (sp.away) continue;
          if (this._isEgg(sp.form)) this._separateFrom(e, sp.mx, sp.my, 9);
          else if (!sp.downed && sp.hp > 0) this._separateFrom(e, sp.mx, sp.my, this._actorRad(sp.form));
          if (sp.hasTamer) this._separateFrom(e, sp.x, sp.y, tr);
        }
        if (this.ally && this.ally.hp > 0 && !this._isEgg(this.ally.form)) this._separateFrom(e, this.ally.x, this.ally.y, this._actorRad(this.ally.form));
        for (ci = 0; ci < this.cpus.length; ci++) {
          cm = this.cpus[ci];
          if (cm && cm.hp > 0 && !this._isEgg(cm.form)) this._separateFrom(e, cm.x, cm.y, this._actorRad(cm.form));
        }
      }
    }
  };

  /* ---------- Terrain steering and body collision (Nov 15) ---------- */
  MissionSim.prototype._navRad = function (e) { return Math.max(4, (e.radius || 10) * 0.6); };
  /* can this kind go over water? (by kind; a Digimon that digivolves takes its new body's) */
  MissionSim.prototype._crossOf = function (id) {
    var BI = this.data && this.data.biomes;
    return BI && BI.crossOf ? BI.crossOf(id) : 0;
  };

  MissionSim.prototype._tileSize = function () {
    var w = this.data && this.data.world;
    return (w && w.TILE && w.TILE()) || 0;
  };

  /* Is this tile solid? Cached per world seed and ice state. */
  MissionSim.prototype._solid = function (tx, ty, cross) {
    var w = this.data.world, T = this._navT, nav = this._nav, key = tx + "," + ty + (cross ? "|" + cross : ""), v;
    v = nav.solid[key];
    if (v !== undefined) return v;
    v = w.isRaised((tx + 0.5) * T, (ty + 0.5) * T, T * 0.34, cross) ? 1 : 0;
    if (cross && nav.cross) nav.cross[cross] = 1;
    if (nav.count++ > 40000) { nav.solid = {}; nav.count = 0; }
    nav.solid[key] = v;
    return v;
  };

  MissionSim.prototype._navReady = function () {
    var w = this.data && this.data.world, T = this._tileSize();
    if (!w || !w.isRaised || !T) return false;
    var seed = w.getSeed ? w.getSeed() : 0, ice = w.iceVersion ? w.iceVersion() : 0, nav = this._nav, ch, i;
    /* the map changes when water freezes or thaws or a border moves (world.js mapChanges): only the
     * tiles it touched are worked out afresh, and only paths that cross them; the whole map only for
     * a new map or the season's ice stepping (17z33; it used to be the whole map every time) */
    if (nav && nav.seed === seed && this._navT === T && nav.ice !== ice && w.mapChanges) {
      ch = w.mapChanges(nav.ice);
      if (ch) { for (i = 0; i < ch.length; i++) this._navForget(ch[i]); nav.ice = ice; }
    }
    if (!this._nav || this._nav.seed !== seed || this._navT !== T || this._nav.ice !== ice) {
      this._nav = { seed: seed, ice: ice, solid: {}, count: 0, fields: {}, cross: {} };
      this._navT = T;
    }
    return true;
  };
  /* forget what is solid in a tile box (and a tile round it), and any path that crosses it */
  MissionSim.prototype._navForget = function (box) {
    var nav = this._nav, tx, ty, k, c, key, f, x0 = box[0] - 1, y0 = box[1] - 1, x1 = box[2] + 1, y1 = box[3] + 1, sufs = [""];
    for (c in nav.cross) sufs.push("|" + c);
    for (ty = y0; ty < y1; ty++) for (tx = x0; tx < x1; tx++) {
      key = tx + "," + ty;
      for (k = 0; k < sufs.length; k++) if (nav.solid[key + sufs[k]] !== undefined) delete nav.solid[key + sufs[k]];
    }
    for (k in nav.fields) {
      f = nav.fields[k];
      if (f.R == null || f.tx + f.R < x0 || f.tx - f.R > x1 || f.ty + f.R < y0 || f.ty - f.R > y1) continue;
      f.at = -1e9;                                               /* worked out again the next time it is asked */
    }
  };

  /* Breadth-first distance field around a target, R tiles each way. */
  MissionSim.prototype._flowField = function (key, x, y, cross) {
    var T = this._navT, nav = this._nav, R = 20, W = R * 2 + 1;
    if (cross) key += "|" + cross;
    var tx = Math.floor(x / T), ty = Math.floor(y / T);
    var f = nav.fields[key];
    if (f && f.tx === tx && f.ty === ty && this.time - f.at < 1.5) return f;
    if (f && this.time - f.at < 0.3) return f;
    if (!f) f = nav.fields[key] = { d: new Int16Array(W * W), q: new Int32Array(W * W) };
    f.tx = tx; f.ty = ty; f.at = this.time; f.R = R; f.W = W;
    var d = f.d, q = f.q, head = 0, tail = 0, i, c, cx, cy, nx, ny, k, nd;
    for (i = 0; i < d.length; i++) d[i] = -1;
    /* start from the target's tile, or the nearest open one if it stands
     * tight against a cliff */
    var sx = R, sy = R;
    if (this._solid(tx, ty, cross)) {
      var best = -1, bx, by;
      for (by = -1; by <= 1; by++) for (bx = -1; bx <= 1; bx++) {
        if (!this._solid(tx + bx, ty + by, cross) && best < 0) { best = 1; sx = R + bx; sy = R + by; }
      }
    }
    d[sy * W + sx] = 0; q[tail++] = sy * W + sx;
    var DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1];
    while (head < tail) {
      c = q[head++]; cx = c % W; cy = (c / W) | 0; nd = d[c] + 1;
      for (k = 0; k < 8; k++) {
        nx = cx + DX[k]; ny = cy + DY[k];
        if (nx < 0 || ny < 0 || nx >= W || ny >= W) continue;
        i = ny * W + nx;
        if (d[i] !== -1) continue;
        if (this._solid(tx - R + nx, ty - R + ny, cross)) { d[i] = -2; continue; }
        /* no cutting corners between two cliff tiles */
        if (k >= 4 && (this._solid(tx - R + cx + DX[k], ty - R + cy, cross) || this._solid(tx - R + cx, ty - R + cy + DY[k], cross))) continue;
        d[i] = nd; q[tail++] = i;
      }
    }
    return f;
  };

  /* Clear straight line? Sampled every half tile. */
  MissionSim.prototype._lineClear = function (x0, y0, x1, y1, rad, cross) {
    var w = this.data.world, T = this._navT;
    var dx = x1 - x0, dy = y1 - y0, len = Math.sqrt(dx * dx + dy * dy);
    var n = Math.min(60, Math.ceil(len / (T * 0.5))), i, t;
    for (i = 1; i < n; i++) {
      t = i / n;
      if (w.isRaised(x0 + dx * t, y0 + dy * t, rad, cross)) return false;
    }
    return true;
  };

  /* Unit direction an enemy should walk to reach (ax, ay). */
  MissionSim.prototype._steer = function (e, ax, ay, key, dt) {
    var direct = norm(ax - e.x, ay - e.y), cross = this._crossOf(e.type);
    if (!key || !this._navReady()) return direct;
    e.navT = (e.navT || 0) - dt;
    if (e.navT <= 0 || e.navKey !== key) {
      e.navT = 0.22 + ((e._id || 0) % 7) * 0.02;
      e.navKey = key;
      e.navDirect = this._lineClear(e.x, e.y, ax, ay, this._navRad(e), cross);
    }
    if (e.navDirect) return direct;
    var T = this._navT, f = this._flowField(key, ax, ay, cross), W = f.W, R = f.R;
    var cx = Math.floor(e.x / T) - f.tx + R, cy = Math.floor(e.y / T) - f.ty + R;
    if (cx < 0 || cy < 0 || cx >= W || cy >= W) return direct;
    var here = f.d[cy * W + cx], k, nx, ny, v, best = here < 0 ? 32767 : here, bx = 0, by = 0, found = false;
    var DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1];
    for (k = 0; k < 8; k++) {
      nx = cx + DX[k]; ny = cy + DY[k];
      if (nx < 0 || ny < 0 || nx >= W || ny >= W) continue;
      v = f.d[ny * W + nx];
      if (v < 0) continue;
      if (k >= 4 && (f.d[cy * W + nx] < 0 || f.d[ny * W + cx] < 0)) continue;
      if (v < best) { best = v; bx = DX[k]; by = DY[k]; found = true; }
    }
    if (!found) return direct;
    /* aim for the centre of the next tile on the way */
    var gx = (f.tx - R + cx + bx + 0.5) * T, gy = (f.ty - R + cy + by + 0.5) * T;
    return norm(gx - e.x, gy - e.y);
  };

  /* Enemies take up space: they shove each other apart instead of
   * stacking on one spot. Bigger ones give way less. */
  /* Bodies only push the ones beside them. Bucketed on a coarse grid (17z33): it used to test every
   * Digimon on the map against every other, three times a tick, so a war's worth of soldiers next to
   * the host (or any crowd) cost the square of the crowd. Same pairs, same order, far fewer tests. */
  MissionSim.prototype._separateEnemies = function () {
    var list = this.enemies, n = list.length, i, j, a, b, dx, dy, min, d2, d, push, wa, wb, nx, ny, pa, pb, ang;
    var CELL = 96, grid = this._sepGrid || (this._sepGrid = {}), key, gx, gy, ox, oy, bucket, bi, big = 0, cells = this._sepCells || (this._sepCells = []);
    if ((this._sepN = (this._sepN || 0) + 1) > 600) { this._sepGrid = grid = {}; this._sepN = 0; }      /* drop buckets of places long left behind */
    for (i = 0; i < n; i++) { a = list[i]; if (!a.dead && (a.radius || 10) > big) big = a.radius || 10; }
    if (big * 2 > CELL) CELL = Math.ceil(big * 2);
    for (key in grid) grid[key].length = 0;
    for (i = 0; i < n; i++) {
      a = list[i];
      if (a.dead) continue;
      key = (Math.floor(a.x / CELL) + 32768) * 65536 + (Math.floor(a.y / CELL) + 32768);
      (grid[key] || (grid[key] = [])).push(i);
    }
    for (i = 0; i < n; i++) {
      a = list[i];
      if (a.dead) continue;
      gx = Math.floor(a.x / CELL); gy = Math.floor(a.y / CELL);
      cells.length = 0;
      for (oy = -1; oy <= 1; oy++) for (ox = -1; ox <= 1; ox++) { bucket = grid[(gx + ox + 32768) * 65536 + (gy + oy + 32768)]; if (bucket) for (bi = 0; bi < bucket.length; bi++) if (bucket[bi] > i) cells.push(bucket[bi]); }
      cells.sort(function (p, q) { return p - q; });
      for (bi = 0; bi < cells.length; bi++) {
        j = cells[bi];
        b = list[j];
        if (b.dead || (a._lodIdle && b._lodIdle)) continue;            /* both resting far from everyone: sorted out on their own tick */
        dx = b.x - a.x; dy = b.y - a.y;
        min = (a.radius || 10) + (b.radius || 10);
        if (dx > min || dx < -min || dy > min || dy < -min) continue;
        d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        d = Math.sqrt(d2);
        if (d < 0.01) { ang = ((a._id || 1) * 2.399 + (b._id || 2)) % 6.283; nx = Math.cos(ang); ny = Math.sin(ang); d = 0; }
        else { nx = dx / d; ny = dy / d; }
        push = (min - d) * 0.5;
        wa = (a.radius || 10) * (a.radius || 10); wb = (b.radius || 10) * (b.radius || 10);
        pa = this._slide(a.x, a.y, -nx * push * 2 * wb / (wa + wb), -ny * push * 2 * wb / (wa + wb), this._navRad(a), this._crossOf(a.type));
        pb = this._slide(b.x, b.y, nx * push * 2 * wa / (wa + wb), ny * push * 2 * wa / (wa + wb), this._navRad(b), this._crossOf(b.type));
        a.x = pa.x; a.y = pa.y; b.x = pb.x; b.y = pb.y;
      }
    }
  };

  MissionSim.prototype._contactHits = function (e, def, dmg, dt) {
    var tR = this._tamer().radius || 10;
    var p, pl, ci, cm, d, fac = this._factionOf ? this._factionOf(e) : null;
    for (p = 0; p < this.players.length; p++) {
      pl = this.players[p];
      if (pl.atFarm || (fac && this._trusts(pl, fac))) continue;      /* away at the farm, or a biome that trusts you: no bite */
      var gdmg = dmg * this._dmgGap(e, pl);                            /* one above your level hits harder (data.js LEVELS) */
      if (pl.hasTamer && !this._tamer().invulnerable && e.hitCd <= 0 && dist2(e.x, e.y, pl.x, pl.y) < Math.pow(e.radius + tR, 2)) {
        this.hurtTamer(pl, gdmg);
        e.hitCd = def.contactCd || 0.7;
      }
      if (pl.faint <= 0 && !this._isEgg(pl.form) && e.hitCdM <= 0 && dist2(e.x, e.y, pl.mx, pl.my) < Math.pow(e.radius + this._actorRad(pl.form) + 5, 2)) {
        this.hurtMon(pl, gdmg, e);
        e.hitCdM = def.contactCd || 0.7;
      }
    }
    if (this.ally && this.ally.hp > 0 && !this._isEgg(this.ally.form) && (e.hitCdA || 0) <= 0 && dist2(e.x, e.y, this.ally.x, this.ally.y) < Math.pow(e.radius + this._actorRad(this.ally.form) + 3, 2)) {
      this.ally.hp = Math.max(0, this.ally.hp - dmg);
      e.hitCdA = def.contactCd || 0.7;
      this.emit({ type: "hurt", who: "ally", amount: dmg });
    }
    e.hitCdCpu = e.hitCdCpu || {};
    for (ci = 0; ci < this.cpus.length; ci++) {
      cm = this.cpus[ci];
      if (!cm || cm.hp <= 0 || this._isEgg(cm.form)) continue;
      e.hitCdCpu[cm.id] = Math.max(0, (e.hitCdCpu[cm.id] || 0) - dt);
      d = dist2(e.x, e.y, cm.x, cm.y);
      if (e.hitCdCpu[cm.id] <= 0 && d < Math.pow(e.radius + this._actorRad(cm.form) + 3, 2)) {
        if (cm.invuln <= 0) {
          cm.hp -= dmg;
          cm.invuln = 0.4;
          if (cm.hp <= 0) { cm.hp = 0; this.emit({ type: "cpuDown", id: cm.id, name: cm.name }); }
          else this.emit({ type: "hurt", who: "cpu", id: cm.id, amount: dmg });
        }
        e.hitCdCpu[cm.id] = def.contactCd || 0.7;
      }
    }
  };

  /* ---------- catching (17z33, Isaac) ----------
   * Beat enough of one kind (CAPTURE.koByStage) and the next of it you defeat doesn't vanish: it lies where it
   * fell for CAPTURE.waitSec, for you alone (online, nobody else can take it). Walk up and press E for one try
   * (progression.js capture). Fail, or wait too long, and it fades away. Bosses, the infected, nemeses, rival
   * tamers' partners and raiders never stay down to be caught, and not in Versus. */
  MissionSim.prototype._catchSpot = function (p, e) {
    var data = this.data, C = data.CAPTURE || {}, def = (data.ENEMIES && data.ENEMIES[e.type]) || this._enemies()[e.type] || {}, need, m = this._mode ? this._mode() : "";
    if (!p || p.hasTamer === false || p.kind === "cpu" || m === "versus" || m === "duel") return null;
    if ((def.boss && !e.mega) || e.virus || e.nem || e.nemesis || e.rival || e.raider || e.lord) return null;
    need = data.captureKoNeeded ? data.captureKoNeeded(e) : 45;
    if ((p.killsBy[e.type] || 0) < need) return null;
    p.killsBy[e.type] = 0;
    this.catches = this.catches || [];
    this._catchN = (this._catchN || 0) + 1;
    var c = { id: this._catchN, type: e.type, x: Math.round(e.x), y: Math.round(e.y), owner: p.id, until: this.time + (C.waitSec || 20) };
    this.catches.push(c);
    this.emit({ type: "catch.spot", id: p.id, n: c.id, form: e.type, x: c.x, y: c.y, sec: C.waitSec || 20 });
    return c;
  };
  MissionSim.prototype._tickCatches = function () {
    var i, c, L = this.catches;
    if (!L || !L.length) return;
    for (i = L.length - 1; i >= 0; i--) {
      c = L[i];
      if (this.time >= c.until || !this.player(c.owner)) { L.splice(i, 1); this.emit({ type: "catch.gone", id: c.owner, n: c.id, form: c.type, x: c.x, y: c.y }); }
    }
  };

  MissionSim.prototype.hurtTamer = function (p, dmg) {
    if (this._tamer().invulnerable) return;
    if (p.downed || p.tamerInvuln > 0 || p.tamerHp <= 0) return;
    p.tamerHp -= dmg;
    p.tamerInvuln = this._tamer().iFrame || 0.6;
    this.emit({ type: "hurt", who: "tamer", id: p.id, amount: dmg, hp: p.tamerHp });
    if (p.tamerHp <= 0) {
      p.tamerHp = 0;
      if (this._fall && this._fall(p)) return;   /* Story: back near the start; Open World with friends: down, on a timer (modes-sim.js) */
      var R = partyRules();
      var canSelf = R && !R.isPartyMode(this) && (this.partyReviveCharge || 0) > 0;
      if (canSelf) {
        p.downed = true;
        this.emit({ type: "downed", id: p.id });
      } else if (this.coop) {
        /* Online co-op: a fallen tamer waits for a teammate. The run only
         * ends when every tamer is down. */
        p.downed = true;
        this.emit({ type: "downed", id: p.id, coop: true });
        var ti, anyUp = false;
        for (ti = 0; ti < this.players.length; ti++) {
          if (this.players[ti].hasTamer !== false && !this.players[ti].downed && !this.players[ti].away) anyUp = true;
        }
        if (!anyUp) {
          this.runOver = true;
          this.emit({ type: "runOver", id: p.id, reason: "party" });
        }
      } else {
        this.runOver = true;
        this.emit({ type: "runOver", id: p.id, reason: "tamer" });
      }
    }
  };

  MissionSim.prototype.hurtMon = function (p, dmg, from) {
    if (this._isEgg(p.form)) return;
    if (p.faint > 0 || p.monInvuln > 0 || p.hp <= 0) return;
    var c = this._care();
    var RO = this._ro(), dv = (RO && p.kind !== "cpu") ? this._derived(p) : null;
    if (dv && from) {
      /* Luck first (a perfect dodge beats anything), then Flee against the enemy's Hit */
      var slip = this.rng() * 100 < dv.perfectDodge + ((p.stats && p.stats.allyDodge) || 0) ? "lucky" : (this.rng() * 100 >= RO.hitChance(from.hit || 0, dv.flee, 95) ? "dodge" : null);
      if (slip) {
        p.monInvuln = Math.max(p.monInvuln || 0, 0.25);
        this.emit({ type: "fx", k: slip, x: p.mx, y: p.my - 18, id: p.id });
        return;
      }
    }
    /* Vitality's soft defence shaves a flat amount off every hit (never below 1) */
    if (dv) dmg = Math.max(1, dmg - dv.softDef);
    if (p.burstLeft > 0 && this.data.BURST) dmg *= this._burstCfg(p).guard;
    if (p.stats && p.stats.allyGuard) dmg *= p.stats.allyGuard;
    if (from && from.type) dmg = Math.max(1, dmg * this._elemMul(null, from.type, p.form, p, p.mx, p.my - 26, p.id));
    var incoming = dmg * (p.desperation ? (c.desperationDamageIn || 1) : 1);
    p.hp -= incoming;
    p.sinceHit = 0;
    p.monInvuln = this._player().iFrame || 0.35;
    if (incoming >= p.maxHp * (c.heavyHitRatio || 0.25)) p.happiness = clamp((p.happiness || 0) - (c.heavyHitHappinessLoss || 6), 0, c.happinessMax || 100);
    else p.happiness = clamp((p.happiness || 0) - (c.hitHappinessLoss || 2), 0, c.happinessMax || 100);
    this.emit({ type: "hurt", who: "mon", id: p.id, amount: incoming, hp: p.hp });
    var R = rarityApi();
    if (R && R.noteMonHit) R.noteMonHit(p);
    if (p.hp <= 0 && p.secondWind) {            /* Second Wind: once a run, the finishing blow is not */
      p.secondWind = false;
      p.hp = Math.max(1, p.maxHp * 0.5); p.monInvuln = 3;
      this.emit({ type: "secondwind", id: p.id, x: p.mx, y: p.my });
      return;
    }
    if (p.hp <= 0) {
      p.hp = 0;
      p.faints = (p.faints || 0) + 1;
      if (R && R.noteFaintSignal) R.noteFaintSignal(p);
      p.happiness = clamp((p.happiness || 0) + (c.faintJoy != null ? c.faintJoy : -12), 0, c.happinessMax || 100);   /* fainting is no fun */
      if (!this._tamer().invulnerable) {
        p.faint = 4;
        this.emit({ type: "faint", id: p.id });
        return;
      }
      /* The partner is the stake. Online it stays down until a teammate
       * revives it and the run ends when every partner is down; solo, the
       * run ends here. */
      p.faint = 999;
      p.monMoving = false;
      p.monTarget = null;
      /* whoever landed that blow remembers it (nemesis-sim.js) */
      if (from && from._id != null && this._nemesisKill) this._nemesisKill(from, p);
      /* Story: it starts over as an egg near the start; Open World with friends: down, on a timer (modes-sim.js _fall) */
      if (this._fall && this._fall(p)) return;
      if (this.coop) {
        p.downed = true;
        this.emit({ type: "downed", id: p.id, coop: true });
        var ti, anyUp = false, q;
        for (ti = 0; ti < this.players.length; ti++) {
          q = this.players[ti];
          if (!q.downed && !q.away) anyUp = true;
        }
        if (!anyUp) {
          this.runOver = true;
          this.emit({ type: "runOver", id: p.id, reason: "party" });
        }
      } else {
        p.downed = true;
        this.emit({ type: "faint", id: p.id });
        this.runOver = true;
        this.emit({ type: "runOver", id: p.id, reason: "partner" });
      }
    }
  };

  MissionSim.prototype._updateOrbs = function (dt) {
    var i, o, p, d, rad, eaten, pl, mag, best, bd, n, tx, ty, sp;
    var pickR = this._player().pickupRadius || 18;
    var PG = this.data.PACING || {}, base = PG.magnetSpeed || 220;
    for (i = this.orbs.length - 1; i >= 0; i--) {
      o = this.orbs[i];
      eaten = false;
      rad = pickR;
      /* Pickups (17z33, reworked): a drop stays exactly where it fell until it is inside a tamer's
       * magnet circle (PACING.magnetRadius x the pickup-range boosts: corn, the Magnet Bell, the Lab's
       * Scan Range, level-up picks...). Then it flies straight to that tamer and keeps to it. Nothing
       * drifts, and the partner doesn't pull drops in (a job level-up still does: levelMagnet). */
      best = null; bd = 1e18;
      var isFood = !!(this.data && this.data.FOOD && this.data.FOOD[o.kind]);
      for (p = 0; p < this.players.length; p++) {
        pl = this.players[p];
        if (pl.atFarm || pl.away) continue;
        if (isFood && this._bagFull(pl)) continue;                          /* 17z33: a full bag leaves food on the ground */
        tx = pl.hasTamer === false ? pl.mx : pl.x; ty = pl.hasTamer === false ? pl.my : pl.y;
        d = Math.sqrt(dist2(o.x, o.y, tx, ty));
        if (d < rad + 8) { this._eatOrb(pl, o); eaten = true; break; }
        mag = (PG.magnetRadius || 50) * ((pl.stats && pl.stats.magnetMul) || 1) + (pl.kind === "client" ? (PG.remoteMagnet || 0) : 0);   /* a guest: make up the lag */
        if (d < mag) o.magnet = true;
        if (o.to === pl.id) { best = pl; bd = -1; }
        else if (bd >= 0 && d < bd && (o.magnet || o.to == null)) { best = pl; bd = d; }
      }
      if (!eaten && o.magnet && best) {
        o.to = best.id;
        tx = best.hasTamer === false ? best.mx : best.x;
        ty = best.hasTamer === false ? best.my : best.y;
        /* starts at the old pace and speeds up, so it catches a tamer on the run */
        o.v = Math.min(base * 2.2, (o.v || base * 0.8) + base * 1.6 * dt);
        d = Math.sqrt(dist2(o.x, o.y, tx, ty));
        sp = Math.min(o.v * dt, d);
        if (d > 0.01) { n = norm(tx - o.x, ty - o.y); o.x += n.x * sp; o.y += n.y * sp; }
        if (d - sp < rad + 8) { this._eatOrb(best, o); eaten = true; }
      }
      if (!eaten && o.kind === "heal") {
        for (p = 0; p < this.cpus.length; p++) {
          var c = this.cpus[p];
          if (!c || c.hp <= 0 || c.hp >= c.maxHp) continue;
          d = Math.sqrt(dist2(o.x, o.y, c.x, c.y));
          if (d < pickR + 10) {
            var h = this._heal();
            c.hp = Math.min(c.maxHp, c.hp + c.maxHp * (h.hp != null ? h.hp : 0.2));
            this.emit({ type: "pickup", kind: "heal", who: "cpu", id: c.id, x: o.x, y: o.y });
            eaten = true;
            break;
          }
        }
      }
      if (eaten) this.orbs.splice(i, 1);
    }
  };

  /* 17z33: how much food a tamer carries (seeds don't count), and the cap */
  MissionSim.prototype._foodCount = function (p) { var F = this.data && this.data.FOOD, n = 0, k; for (k in (p.bag || {})) if (F && F[k] && !F[k].rare) n += p.bag[k] || 0; return n; };
  MissionSim.prototype._bagFull = function (p) { var c = this._care(); return !!c.bagMax && this._foodCount(p) >= c.bagMax; };
  /* farm gates this tamer's side holds: nests in land its side owns (farm-gates.js shows the same) */
  MissionSim.prototype._gateCount = function (p) {
    var W = this.data && this.data.world, k, st, n = 0, span;
    if (!p || !p.side || !W || !W.cellOwner || !W.TERR || !W.TILE) return 0;
    span = W.TERR * (typeof W.TILE === "function" ? W.TILE() : W.TILE);
    for (k in this.nests || {}) { st = this.nests[k]; if (W.cellOwner(Math.floor(st.x / span), Math.floor(st.y / span)) === p.side) n++; }
    return n;
  };
  MissionSim.prototype._eatOrb = function (p, o) {
    var h = this._heal();
    if (o.kind === "xp") {
      if (this.coop && this.sharedXp !== false) {
        /* Co-op: an XP gem counts for every tamer, so nobody falls behind. */
        var xi, xp2;
        for (xi = 0; xi < this.players.length; xi++) {
          xp2 = this.players[xi];
          xp2.xp = (xp2.xp || 0) + (o.value || 0) * this._lab(xp2).xp * this._bloodXp(xp2) * this._gear(xp2).xp * (this.time < this._gear(xp2).earlyUntil ? this._gear(xp2).earlyXp : 1) * this._catchUp(xp2);
          this._tryLevel(xp2);
          this._tamerXp(xp2, (o.value || 0) * this._lab(xp2).bxp);
        }
      } else {
        p.xp = (p.xp || 0) + (o.value || 0) * this._lab(p).xp * this._bloodXp(p) * this._gear(p).xp * (this.time < this._gear(p).earlyUntil ? this._gear(p).earlyXp : 1) * this._catchUp(p);
        this._tamerXp(p, (o.value || 0) * this._lab(p).bxp);
        this._tryLevel(p);
      }
    } else if (o.kind === "bits") {
      p._bitFrac = (p._bitFrac || 0) + (o.value || 0) * this._lab(p).bits;
      p.bits = (p.bits || 0) + Math.floor(p._bitFrac); p._bitFrac -= Math.floor(p._bitFrac);
    } else if (o.kind === "evo") {
      if (this._vsMeterAdd) this._vsMeterAdd(p, o.value || 1, true, o.x, o.y);   /* Versus: a cache's DIGIVOLVE orb */
    } else if (o.kind === "wood") {
      if (this._siegeGetWood) this._siegeGetWood(p, o.value || 1);       /* Night Siege's fences; no limit */
    } else if (o.kind === "heal") {
      p.hp = Math.min(p.maxHp, p.hp + p.maxHp * (h.hp != null ? h.hp : 0.2));
      if (p.hasTamer) p.tamerHp = Math.min(p.tamerMaxHp, p.tamerHp + p.tamerMaxHp * (h.tamerHp != null ? h.tamerHp : 0.2));
    } else if (String(o.kind).indexOf("chest_") === 0) {
      if (this._openChest) this._openChest(p, o.kind);                 /* a spire's chest (spire-sim.js) */
    } else if (this.data && ((this.data.FOOD && this.data.FOOD[o.kind]) || (this.data.isSeed && this.data.isSeed(o.kind)))) {
      /* Food is stored, never eaten in battle. No bag limit. */
      p.bag = p.bag || {};
      p.bag[o.kind] = (p.bag[o.kind] || 0) + (o.value || 1);
    }
    this.emit({ type: "pickup", kind: o.kind, id: p.id, value: o.value, x: o.x, y: o.y, bits: p.bits, xp: p.xp, hp: p.hp });
  };

  MissionSim.prototype._xpNeeded = function (level) {
    if (this.data && this.data.xpNeeded) return this.data.xpNeeded(level);
    if (this.data && this.data.xpForLevel) return this.data.xpForLevel(level);
    return 8 + level * 6;
  };

  /* The tamer earns the same XP as the partner but needs far more of it.
   * Each tamer level gives stat points to spend on the partner. */
  MissionSim.prototype._tamerNeed = function (level) {
    var TL = (this.data && this.data.TAMER_LEVEL) || {};
    var PC = (this.data && this.data.PACING) || {}, early = PC.baseEarly ? PC.baseEarly[(level | 0) - 1] : 1;
    return Math.max(1, Math.round(this._xpNeeded(level) * (TL.xpMul || 3.5) * (early || 1)));
  };
  MissionSim.prototype._tamerXp = function (p, amount) {
    var TL = this.data && this.data.TAMER_LEVEL;
    if (!TL || !p || p.kind === "cpu" || p.hasTamer === false) return;
    p.tamerLevel = p.tamerLevel || 1;
    p.tamerXpNext = p.tamerXpNext || this._tamerNeed(p.tamerLevel);
    p.tamerXp = (p.tamerXp || 0) + amount;
    while (p.tamerXp >= p.tamerXpNext) {
      p.tamerXp -= p.tamerXpNext;
      p.tamerLevel += 1;
      p.tamerXpNext = this._tamerNeed(p.tamerLevel);
      /* Ragnarok rule: reaching the level after L gives floor(L / 5) + 3 status points */
      var RO = this._ro(), gain = RO ? RO.pointsFor(p.tamerLevel - 1) : (TL.points || 10);
      this._attrs(p);
      p.statPoints = (p.statPoints || 0) + gain;
      p._statsKey = null;
      this.emit({ type: "tamer.level", id: p.id, level: p.tamerLevel, points: p.statPoints, gain: gain });
    }
  };

  /* ---- skill tree (js/skill-tree.js) ---- */
  MissionSim.prototype._sk = function () {
    var d = this.data;
    return (this.skillTree && d && d.SKILLS && d.moveChain) ? d.SKILLS : null;
  };
  /* rebuild what the partner fires from what it has learned: the biggest
   * move of each kind, at the power its skill level gives */
  MissionSim.prototype._syncMoves = function (p) {
    var SK = this._sk();
    if (!SK || !p) return;
    p.skills = p.skills || {};
    var act = SK.active(this.data, p.skills), old = p.weapons || [], out = [], i, j, w;
    /* only the equipped ones fire (17z33, Isaac: 2 / 3 / 4 by stage, +1 from the Lab) */
    if (SK.fixEquip) {
      var n = this.equipSlots(p), eq = SK.fixEquip(this.data, p.skills, p.equip ? { list: p.equip, known: p.equipKnown || [], n: p.equipN || 0 } : null, n), on = {};
      p.equip = eq.list; p.equipKnown = eq.known; p.equipN = n;
      for (i = 0; i < eq.left.length; i++) if (p.kind !== "cpu" && p.hasTamer !== false) this.emit({ type: "skill.full", id: p.id, move: eq.left[i], n: n });
      for (i = 0; i < eq.list.length; i++) on[eq.list[i]] = i + 1;
      act = act.filter(function (a) { return on[a.id]; }).sort(function (a, b) { return on[a.id] - on[b.id]; });
    }
    for (i = 0; i < act.length; i++) {
      w = { id: act[i].id, level: act[i].level, cd: 0.15, bonus: act[i].bonus * ((SK.EQUIP && SK.fixEquip && SK.EQUIP.focus) || 1), skill: act[i].skill };
      for (j = 0; j < old.length; j++) if (old[j].id === w.id) w.cd = old[j].cd || 0;
      out.push(w);
    }
    p.weapons = out;
    p._statsKey = null;
  };
  /* how many moves this partner can have equipped: by stage, +1 with the Lab's Move Slot */
  MissionSim.prototype.equipSlots = function (p) {
    var SK = this._sk(), st = this.data.moveStageIdx ? this.data.moveStageIdx(p.form) : 2;
    return SK && SK.slotCount ? SK.slotCount(st, (this._lab(p).moveslot || 0)) : 99;
  };
  /* a partner that has moves but no skills yet (fresh from the egg, caught,
   * or handed a form directly) starts its tree from what it already fires */
  MissionSim.prototype._seedSkills = function (p) {
    var SK = this._sk(), i, w, pool;
    if (!SK || !p || this._isEgg(p.form)) return;
    p.skills = p.skills || {};
    for (i in p.skills) if (p.skills[i] > 0 && !SK.PASSIVE_BY[i]) { this._syncMoves(p); return; }
    for (i = 0; i < (p.weapons || []).length; i++) { w = p.weapons[i]; if (this.data.MOVE_META && this.data.MOVE_META[w.id]) p.skills[w.id] = Math.max(1, Math.min(SK.MAX, (w.level || 1) * 2 - 1)); }
    if (!Object.keys(p.skills).length) { pool = this.data.movePool(p.form); if (pool && pool.primary) p.skills[pool.primary] = 1; }
    this._syncMoves(p);
  };
  /* Level-up cards: make sure a partner with a point to spend has an offer. */
  MissionSim.prototype._rollOffer = function (p) {
    var SK = this._sk();
    if (!SK || !SK.offer || !this.data.SKILL_CARDS || !p || this._isEgg(p.form)) return;
    if (p.kind === "cpu" || p.away || p.hasTamer === false) return;
    if (!((p.skillPoints || 0) > 0)) { p.skillOffer = null; return; }
    if (p.skillOffer && p.skillOffer.length) return;
    p.skillOffer = SK.offer(this.data, p.form, p.skills || {}, this.rng, this.data.SKILL_CARDS.count);
  };
  MissionSim.prototype._autoSkill = function (p) {
    var SK = this._sk(), id, guard = 0;
    if (!SK || !p || this._isEgg(p.form)) return; /* an egg keeps its points until it hatches */
    p.skills = p.skills || {};
    while (SK && (p.skillPoints || 0) > 0 && guard++ < 60) {
      id = SK.autoPick(this.data, p.form, p.skills || {}, this.equipSlots(p));
      if (!id) break;
      var fresh = !(p.skills[id] > 0);
      p.skills[id] = (p.skills[id] || 0) + 1;
      p.skillPoints -= 1;
      if (fresh && SK.learned) SK.learned(this.data, p.skills, id);
    }
    this._syncMoves(p);
  };

  MissionSim.prototype._tryLevel = function (p) {
    var SK = this._sk();
    while (SK && p.xp >= p.xpNext) {
      /* job level up: one skill point, no card pick */
      p.xp -= p.xpNext;
      p.level += 1;
      p.xpNext = this._xpNeeded(p.level);
      p.skillPoints = (p.skillPoints || 0) + 1;
      this._rollOffer(p);
      /* a level-up pulls in everything lying about nearby */
      var PL = this.data.PACING, oi2;
      if (PL && PL.levelMagnet) for (oi2 = 0; oi2 < this.orbs.length; oi2++) if (dist2(this.orbs[oi2].x, this.orbs[oi2].y, p.mx, p.my) < PL.levelMagnet * PL.levelMagnet) this.orbs[oi2].magnet = true;
      /* a breather to spend the point (data.js LEVEL_PAUSE) */
      var LP = this.data.LEVEL_PAUSE;
      var lpT = LP ? (this.coop ? (LP.coopTime || LP.time) : LP.time) : 0;
      if (LP && lpT > 0) {
        if (this.coop) {
          /* online the world doesn't stop for one player's level-up (17z33, Isaac): you and your partner sit in a
           * shield instead. You stay put, nothing can hurt you, your partner doesn't attack, and it all ends the
           * moment you pick or close the window (breather.end). The others play on around you. */
          if (!(p.kind === "cpu" || p.away || p.hasTamer === false)) {
            p.choosing = lpT;
            p.monInvuln = Math.max(p.monInvuln || 0, lpT);
            p.tamerInvuln = Math.max(p.tamerInvuln || 0, lpT);
          }
        } else {
          p.monInvuln = Math.max(p.monInvuln || 0, lpT);
          if (!(p.kind === "cpu" || p.away || p.hasTamer === false)) p.choosing = lpT;
          this.enemyFreeze = Math.max(this.enemyFreeze || 0, lpT);
        }
      }
      this.emit({ type: "level", id: p.id, level: p.level, pending: 0, skillPoints: p.skillPoints, pause: lpT || 0, hold: !this.coop, lock: true });
      if (p.kind === "cpu" || p.away || p.hasTamer === false) this._autoSkill(p);
    }
    while (p.xp >= p.xpNext) {
      p.xp -= p.xpNext;
      p.level += 1;
      p.xpNext = this._xpNeeded(p.level);
      p.pendingLevels = (p.pendingLevels || 0) + 1;
      if (p.id === this.localId || !this.localId) this.pendingLevels = p.pendingLevels;
      p.happiness = clamp((p.happiness || 0) + (this._care().levelJoy || 3), 0, this._care().happinessMax || 100);
      this.emit({ type: "level", id: p.id, level: p.level, pending: p.pendingLevels });
    }
  };

  /* starving / hungry from the belly right now. Called every care tick, and the moment it eats (the farm
   * doesn't run the care tick, so a partner fed there used to stay slow until you left; 17z33, Isaac). */
  MissionSim.prototype._hungerCheck = function (p) {
    var c = this._care(), egg = this._isEgg(p.form);
    var starving = !egg && (p.fullness || 0) <= (c.starveAt != null ? c.starveAt : 10);
    if (starving !== !!p.starving) { p.starving = starving; p._statsKey = null; this.emit({ type: "starving", id: p.id, on: starving }); }
    p.hungry = !egg && (p.fullness || 0) < (c.hungryAt || 35);
    return starving;
  };
  MissionSim.prototype._updateCare = function (p, dt) {
    var c = this._care(), egg = this._isEgg(p.form), hmax = c.happinessMax || 100, i, e, q, near;
    if (this.phase === "playing" && !egg) {
      p.fullness = Math.max(0, (p.fullness || 0) - (c.fullnessDecayPerSec || 1.05) / this._lab(p).belly * dt);
    }
    /* 17z33: hunger is a need (slower and weaker when starving), happiness is how you treat it */
    var starving = this._hungerCheck(p);
    if (starving && this.phase === "playing") p.happiness = Math.max(0, (p.happiness || 0) - (c.starveJoyPerSec || 0.8) * dt);
    /* a rest somewhere quiet: standing still, fed, nothing wild close by */
    p._restChk = (p._restChk || 0) - dt;
    if (p._restChk <= 0) {
      p._restChk = 0.5;
      near = false; q = (c.restQuiet || 320) * (c.restQuiet || 320);
      for (i = 0; i < this.enemies.length && !near; i++) { e = this.enemies[i]; if (!e.dead && !e.pvpOf && dist2(e.x, e.y, p.mx, p.my) < q) near = true; }
      p._quiet = !near;
    }
    if (!egg && p._quiet && !p.monMoving && !p.moving && p.faint <= 0 && !p.downed && !p.atFarm && (p.fullness || 0) > (c.hungryAt || 35) && this.phase === "playing") {
      p.restT = (p.restT || 0) + dt;
      if (p.restT > (c.restAfter || 2.5) && (p.happiness || 0) < (c.restJoyCap || 85)) p.happiness = Math.min(c.restJoyCap || 85, (p.happiness || 0) + (c.restJoyPerSec || 0.9) * dt);
    } else p.restT = 0;
    p.resting = (p.restT || 0) > (c.restAfter || 2.5);
    p._gateChk = (p._gateChk || 0) - dt;
    if (p._gateChk <= 0) { p._gateChk = 2; p.farmGates = this._gateCount(p); }
    p.happiness = clamp(p.happiness || 0, 0, hmax);
    if (p.streakTimer > 0) {
      p.streakTimer -= dt;
      if (p.streakTimer <= 0) p.killStreak = 0;
    }
    p.desperation = p.hp > 0 && p.hp / p.maxHp < (c.desperationHpRatio || 0.2);
    if (p.desperation) p.happiness = Math.max(0, p.happiness - (c.desperationHappinessDrain || 2) * dt);
    if (p.atkBoost > 0) p.atkBoost = Math.max(0, p.atkBoost - dt);
  };

  MissionSim.prototype.step = function () {
    var dt = this.dt;
    this.tick += 1;
    if (this.phase !== "playing" || this.runOver) {
      if (this.phase !== "playing") {
        if (weatherApi()) weatherApi().clearPhase(this, { data: this.data, phase: this.phase });
        if (partyRules()) partyRules().clearHold(this);
      }
      return this.snapshot(true);
    }
    this.time += dt;
    if (this.data.world && this.data.world.setTime) this.data.world.setTime(this.time);
    if (weatherApi()) {
      weatherApi().tick(this, dt, { data: this.data, phase: this.phase, rng: this.rng, combatReady: this._combatReady() });
    }
    var i, p, inp;
    if (this._pvpProxyIn) this._pvpProxyIn();                          /* PvP stand-ins, for picking targets and firing */
    for (i = 0; i < this.players.length; i++) {
      p = this.players[i];
      inp = this._takeInput(p);
      if (p.hasTamer && (!p.downed || this._tamer().invulnerable)) this._moveTamer(p, inp, dt);
      else if (p.hasTamer) p.tamerInvuln = Math.max(0, (p.tamerInvuln || 0) - dt);
      if (p.atFarm) continue;             /* at the farm (Nov 20): out of the world, the farm screen looks after them */
      this._actor = p;                    /* whose partner is picking targets now (faction-sim.js: it passes over trusted biomes) */
      this._movePartner(p, dt);
      this._updateBurst(p, dt);
      if ((p.skillPoints || 0) > 0 && !(p.skillOffer && p.skillOffer.length)) this._rollOffer(p);
      if (!p.downed) this._updateWeapons(p, dt);
      this._actor = null;
      this._updateCare(p, dt);
      this._tickRarity(p, dt);
      this._tickRevive(p, inp, dt);
    }
    if (this._pvpProxyOut) this._pvpProxyOut();
    for (i = 0; i < this.cpus.length; i++) this._moveCpu(this.cpus[i], dt);
    if (this._updatePvp) this._updatePvp(dt);                         /* players at war (pvp-sim.js) */
    if (this.ally && this.ally.hp > 0) {
      /* Ally keeps pace with the local partner; full AI stays a later pass. */
      var host = this.player(this.localId) || this.players[0];
      if (host) {
        var adx = (host.mx + 24) - this.ally.x, ady = (host.my + 8) - this.ally.y;
        var al = len(adx, ady);
        if (al > 6) {
          var ap = this._slide(this.ally.x, this.ally.y, (adx / al) * 80 * dt, (ady / al) * 80 * dt, this._actorRad(this.ally.form), this._crossOf(this.ally.form));
          this.ally.x = ap.x; this.ally.y = ap.y;
        }
        /* a helper: one attack every few seconds, at a fraction of the damage */
        var AC = this.data.ALLY, al2 = this.ally, at2;
        if (!this._isEgg(al2.form)) {
          if (al2.level == null || !al2.stats) this._allyKit(al2, true);
          al2.atkT = (al2.atkT == null ? 2 : al2.atkT) - dt;
          if (al2.atkT <= 0) {
            at2 = this._nearestInReach(al2.x, al2.y, this._weaponReach(al2.weapon));
            if (at2) {
              al2.weapon.cd = 0;
              if (at2.x !== al2.x) al2.facing = at2.x < al2.x ? -1 : 1;
              this._fireFrom(al2, dt, al2.x, al2.y, at2, al2.weapon);
              al2.atkT = (AC && AC.attackEvery) || 7;
            } else al2.atkT = 0.3;
          }
        }
      }
    }
    this._updateSpawns(dt);
    if (this._updateModeRules) this._updateModeRules(dt);               /* Story, Night Siege, Versus (17z33) */
    if (this._updateSpires) this._updateSpires(dt);                     /* black spires: the big one after its rumble (spire-sim.js) */
    if (this._updateVirus) this._updateVirus(dt);
    if (this._pvpProxyIn) this._pvpProxyIn();                          /* ...and for shots and ultimates landing */
    this._updateUlts(dt);
    this._updateBullets(dt);
    if (this._pvpProxyOut) this._pvpProxyOut();
    this._updateEnemies(dt);
    this._updatePatches(dt);
    this._updatePuddles(dt);
    if (this._updateFactions) this._updateFactions(dt);
    this._updateStorm(dt);
    this._updateRival(dt);
    this._updateLava(dt);
    this._updateOrbs(dt);
    this._tickCatches(dt);
    return this.snapshot(false);
  };


  MissionSim.prototype._clock = function () {
    var R = rarityApi();
    if (R && R.clockOf) return R.clockOf(this.time, this.clockHour);
    return { hour: this.clockHour != null ? this.clockHour : 12, cycle: (this.time / 180) % 1 };
  };

  MissionSim.prototype._tickRarity = function (p, dt) {
    var R = rarityApi();
    if (!R || !p) return;
    p.time = this.time;
    p.worldSeed = this.seed;
    var dx = (p.x || 0) - (p.mx || 0), dy = (p.y || 0) - (p.my || 0);
    var dist = Math.sqrt(dx * dx + dy * dy);
    R.tick(p, dt, { dist: dist, clock: this._clock(), time: this.time, silentHunger: false });
    if ((p.happiness || 0) > (p.peakHappiness || 0)) p.peakHappiness = p.happiness;
  };

  MissionSim.prototype.snapshot = function (full) {
    var ev = this.events;
    if (full) {
      /* Keep events until a consuming snapshot (authority snapshot). */
    }
    var i, p, outP = [], e, outE = [], o, outO = [], b, outB = [], c, outC = [];
    for (i = 0; i < this.players.length; i++) {
      p = this.players[i];
      outP.push({
        id: p.id, slot: p.slot, kind: p.kind, form: p.form, hasTamer: p.hasTamer,
        x: p.x, y: p.y, vx: p.vx, vy: p.vy, facing: p.facing, tdir: p.tdir, moving: p.moving,
        tamerHp: p.tamerHp, tamerMaxHp: p.tamerMaxHp, tamerInvuln: p.tamerInvuln,
        mx: p.mx, my: p.my, mfacing: p.mfacing, monMoving: p.monMoving,
        hp: p.hp, maxHp: p.maxHp, monInvuln: p.monInvuln, faint: p.faint,
        fullness: p.fullness, happiness: p.happiness,
        bits: p.bits, xp: p.xp, xpNext: p.xpNext, level: p.level, kills: p.kills,
        aim: p.aim, ack: p.seqAck, desperation: p.desperation, atkBoost: p.atkBoost, hungry: !!p.hungry, starving: !!p.starving, resting: !!p.resting, focusId: p.focusId || null, strike: p.strike ? [Math.round(p.strike.x), Math.round(p.strike.y)] : null, trust: p.trust || null, allied: p.allied || null, atFarm: !!p.atFarm, pvpFlag: !!p.pvpFlag, pvpOffAt: p.pvpOffAt || 0,
        md: { pk: p.peakLevel || 0, rs: p.respawns || 0, bo: p.bounty || 0, st: p.pvpStreak || 0, mg: p.megaAt || 0, pw: p.pvpWins || 0, lo: p.lordsBeaten || 0 },
        weapons: p.weapons, wc: wcOf(p), choosing: p.choosing > 0 ? 1 : 0, mag: p.stats && p.stats.magnetMul ? Math.round(p.stats.magnetMul * 100) / 100 : 1, downLeft: p.downLeft != null ? Math.max(0, Math.round(p.downLeft * 10) / 10) : null, equip: p.equip || null, equipN: p.equipN || 0, bag: p.bag, items: p.items, shopBought: p.shopBought, garden: p.garden || [],
        captureKills: p.captureKills, killsBy: p.killsBy || null, trainStats: p.trainStats, trainVisits: p.trainVisits,
        bondTrain: p.bondTrain, careMistakes: p.careMistakes, foodEaten: p.foodEaten,
        foodCounts: p.foodCounts, reserve: p.reserve, partners: p.partners,
        statLevels: p.statLevels, evoLock: p.evoLock, hatchLeft: p.hatchLeft,
        skills: p.skills || null, skillPoints: p.skillPoints || 0, skillOffer: p.skillOffer || null,
        tamerLevel: p.tamerLevel || 1, tamerXp: p.tamerXp || 0, tamerXpNext: p.tamerXpNext || this._tamerNeed(p.tamerLevel || 1),
        statPoints: (this._attrs(p), p.statPoints || 0), attrs: p.attrs || null,
        attrBonus: this._ro() ? this._jobBonus(p) : null, attrParts: this._ro() ? this._attrParts(p) : null,
        moveMul: p.stats ? [Math.round(p.stats.monSpeedMul * 100), Math.round(p.stats.speedMul * 100), Math.round((p.stats.trackSpeed || 0) * 100), p.stats.boots || 0, Math.round(p.stats.magnetMul * 100)] : null,
        burst: Math.floor(p.burst || 0), burstLeft: p.burstLeft > 0 ? Math.round(p.burstLeft * 10) / 10 : 0, burstForm: p.burstLeft > 0 ? p.burstForm : null, burstStyle: p.burstLeft > 0 ? p.burstStyle : null, shiny: !!p.shiny, shinyBoost: p.shinyBoost || 0, passives: p.passives || [],
        evoOffer: p.evoOffer || null, evoCount: p.evoCount || 0, holdbacks: p.holdbacks || 0, evoHoldUntil: p.evoHoldUntil || 0,
        farmVisitIndex: p.farmVisitIndex, pendingFarm: p.pendingFarm,
        lastFarmAt: p.lastFarmAt || 0, farmDueAt: p.farmDueAt,
        pendingBrawl: !!p.pendingBrawl, lastBrawlLevel: p.lastBrawlLevel,
        pendingLevels: p.pendingLevels || 0,
        levelOffers: p.levelOffers || [],
        bond: p.bond, mood: p.mood, ignoredSeconds: p.ignoredSeconds || 0,
        ignoredDuringEvent: !!p.ignoredDuringEvent,
        starveCycles: p.starveCycles || 0, refusedFoodCycles: p.refusedFoodCycles || 0,
        refusedThisCycle: !!p.refusedThisCycle, windows: p.windows,
        omenSeen: !!p.omenSeen, miracleShimmer: p.miracleShimmer || 0,
        proximityClose: !!p.proximityClose, deliberateLoss: !!p.deliberateLoss,
        undamagedKills: p.undamagedKills || 0, peakHappiness: p.peakHappiness,
        trainFresh: p.trainFresh, trainTired: p.trainTired || 0, trainBoost: p.trainBoost || 0, evoFruit: p.evoFruit || 0, shopVisit: p.shopVisit || null, trainKills: p.trainKills || 0, farmGates: p.farmGates || 0,
        clock: p.clock, formsReached: p.formsReached || {},
        downed: !!p.downed
      });
    }
    for (i = 0; i < this.enemies.length; i++) {
      e = this.enemies[i];
      if (e.dead) continue;
      outE.push({ _id: e._id, type: e.type, x: e.x, y: e.y, hp: e.hp, maxHp: e.maxHp, facing: e.facing, flash: e.flash, radius: e.radius, dead: false, boss: e.boss, mega: e.mega, lord: !!e.lord, rival: !!e.rival, virus: !!e.virus, dmgMul: e.dmgMul, st: stBits(e), zz: e.zz ? 1 : 0, war: e.war || null, fac: this._factionOf ? this._factionOf(e) : null, rally: e.rally || null, alv: e.alv || 0, lv: e.lv || 1, nem: e.nem || 0, nemTitle: e.nemTitle || null, nemScale: e.nemScale || 1, raider: e.raider ? 1 : 0, giant: e.giant || 0 });
    }
    for (i = 0; i < this.orbs.length; i++) {
      o = this.orbs[i];
      outO.push({ id: o.id, kind: o.kind, x: o.x, y: o.y, value: o.value, magnet: o.magnet });
    }
    for (i = 0; i < this.bullets.length; i++) {
      b = this.bullets[i];
      outB.push({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, radius: b.radius, color: b.color, life: b.life, wid: b.wid, kind: b.kind });
    }
    for (i = 0; i < this.cpus.length; i++) {
      c = this.cpus[i];
      outC.push({ id: c.id, form: c.form, name: c.name, hasTamer: false, x: c.x, y: c.y, facing: c.facing, hp: c.hp, maxHp: c.maxHp, moving: c.moving, invuln: c.invuln, weapon: c.weapon });
    }
    return {
      kind: "snapshot",
      tick: this.tick,
      time: this.time,
      full: !!full,
      players: outP,
      patches: (this.patches || []).map(function (q) { return { id: q.id, kind: q.kind, x: q.x, y: q.y, r: q.r, t: q.t, max: q.max }; }),
      enemies: outE,
      orbs: outO,
      bullets: outB,
      arcs: this.arcs,
      cpus: outC,
      ally: this.ally,
      rival: this._rivalView ? this._rivalView() : null,
      events: ev,
      kills: this.kills,
      pendingLevels: this.pendingLevels,
      levelOffers: (function () {
        var loc = this.player(this.localId) || this.players[0];
        return loc && loc.levelOffers ? loc.levelOffers : [];
      }).call(this),
      merchant: this.merchant || null,
      runOver: this.runOver,
      catches: (this.catches || []).map(function (c) { return [c.id, c.type, c.x, c.y, c.owner, Math.max(0, Math.round((c.until - this.time) * 10) / 10)]; }, this),
      spireChests: (this.spireChests || []).map(function (c) { return [c.id, c.tier, Math.round(c.x), Math.round(c.y)]; }),
      nest: this.siege && this.siege.nest ? { x: this.siege.nest.x, y: this.siege.nest.y, eggs: this.siege.nest.eggs.map(function (g) { return [g.x, g.y, Math.round(g.hp), g.max, g.k || 0]; }), cost: this._siegeRepairCost ? this._siegeRepairCost() : 0, night: !!this.siege.inNight,
        fences: (this.siege.nest.fences || []).map(function (f) { return [f.x, f.y, Math.round(f.hp), f.max, f.built ? 1 : 0]; }), wood: this.siege.nest.wood } : null,
      rejected: this.rejected,
      farm: this.farm || null,
      brawl: (this.brawlSim && this.brawlSim.snapshot()) || this.brawl || null,
      phase: this.phase,
      clock: this._clock(),
      clockHour: this.clockHour,
      lifecycle: this.lifecycle || null,
      slots: 6,
      startingPartySize: this.startingPartySize || 0,
      partyReviveCharge: this.partyReviveCharge,
      reviveHold: this.reviveHold || null,
      soak: (this.data && this.data.world && this.data.world.soak) ? Math.round(this.data.world.soak() * 100) / 100 : 0,
      terr: (this.data && this.data.world && this.data.world.territoryString) ? this.data.world.territoryString() : "",
      fronts: this._frontList ? this._frontList() : null,
      nests: this._nestList ? this._nestList() : null,
      nems: this._nemList ? this._nemList() : null,
      weather: weatherApi() ? weatherApi().snapshot(this) : (this.weather || null)
    };
  };

  MissionSim.prototype.consumeEvents = function () {
    var ev = this.events;
    this.events = [];
    return ev;
  };

  if (isNode) require("./rival-sim.js")(MissionSim, { dist2: dist2, norm: norm });
  else if (root.DBH && root.DBH.installRival) root.DBH.installRival(MissionSim, { dist2: dist2, norm: norm });
  if (isNode) require("./virus-sim.js")(MissionSim, { dist2: dist2, norm: norm });
  else if (root.DBH && root.DBH.installVirus) root.DBH.installVirus(MissionSim, { dist2: dist2, norm: norm });
  if (isNode) require("./pvp-sim.js")(MissionSim, { dist2: dist2, norm: norm });
  else if (root.DBH && root.DBH.installPvp) root.DBH.installPvp(MissionSim, { dist2: dist2, norm: norm });
  if (isNode) require("./faction-sim.js")(MissionSim, { dist2: dist2, norm: norm });
  else if (root.DBH && root.DBH.installFactions) root.DBH.installFactions(MissionSim, { dist2: dist2, norm: norm });
  if (isNode) require("./nest-sim.js")(MissionSim, { dist2: dist2, norm: norm });
  else if (root.DBH && root.DBH.installNests) root.DBH.installNests(MissionSim, { dist2: dist2, norm: norm });
  if (isNode) require("./war-sim.js")(MissionSim, { dist2: dist2, norm: norm });
  else if (root.DBH && root.DBH.installWar) root.DBH.installWar(MissionSim, { dist2: dist2, norm: norm });
  if (isNode) require("./nemesis-sim.js")(MissionSim, { dist2: dist2, norm: norm });
  else if (root.DBH && root.DBH.installNemesis) root.DBH.installNemesis(MissionSim, { dist2: dist2, norm: norm });
  if (isNode) require("./modes-sim.js")(MissionSim, { dist2: dist2, norm: norm });
  else if (root.DBH && root.DBH.installModes) root.DBH.installModes(MissionSim, { dist2: dist2, norm: norm });
  if (isNode) require("./event-sim.js")(MissionSim, { dist2: dist2, norm: norm });
  else if (root.DBH && root.DBH.installWorldEvents) root.DBH.installWorldEvents(MissionSim, { dist2: dist2, norm: norm });
  ["story", "siege", "versus", "spire"].forEach(function (m) {
    var fn = { story: "installStory", siege: "installSiege", versus: "installVersus", spire: "installSpires" }[m];
    if (isNode) require("./" + m + "-sim.js")(MissionSim, { dist2: dist2, norm: norm });
    else if (root.DBH && root.DBH[fn]) root.DBH[fn](MissionSim, { dist2: dist2, norm: norm });
  });
  var api = { MissionSim: MissionSim, isIllegal: MissionSim.isIllegal };
  D.net = D.net || {};
  D.net.mission = api;
  if (isNode) module.exports = api;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
