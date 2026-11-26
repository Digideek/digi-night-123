/* DOM-free authority progression: capture, hatch, evolve, level-up,
 * shop, farm outcomes, and brawl bets / revive / payouts.
 * Clients submit intent only. Costs, preconditions, stat gates, and
 * hidden-tier legendary entitlement are validated here.
 * No document, no ports, no cloud.
 */
(function (global) {
  "use strict";
  var isNode = typeof module === "object" && module.exports;
  var root = isNode ? global : window;
  var D = (root.DBH = root.DBH || {});
  if (isNode) {
    try { if (!(D.net && D.net.rarity)) require("./rarity-sim.js"); } catch (err) {}
    try { if (!(D.net && D.net.brawl)) require("./brawl-sim.js"); } catch (err) {}
    try { if (!D.partyRules) require("../party-rules.js"); } catch (err) {}
    try { if (!D.weather) require("../weather.js"); } catch (err) {}
    try { if (!D.minigames) require("./minigames.js"); } catch (err) {}
  }
  function MG() { return D.minigames || null; }
  function rarityApi() { return (D.net && D.net.rarity) || (D.rarity) || null; }

  var INTENTS = {
    capture: 1, hatch: 1, evolve: 1, "evolve.hold": 1, "pvp.flag": 1, "side.pick": 1, "dna.ask": 1, "dna.answer": 1, burst: 1, "breather.end": 1, "prop.use": 1, "stat.add": 1, "skill.add": 1, "skill.equip": 1, levelup: 1,
    "shop.buy": 1,
    "farm.enter": 1, "farm.tick": 1, "farm.pet": 1, "farm.feed": 1, "farm.plant": 1, "farm.harvest": 1,
    "field.feed": 1,
    "farm.item": 1, "farm.trainStart": 1, "farm.trainInput": 1, "farm.return": 1,
    "brawl.begin": 1, "brawl.bet": 1, "brawl.ready": 1, "brawl.conclude": 1,
    "brawl.dismiss": 1, "lifecycle.ack": 1, "shiny.guard": 1, "bag.discard": 1, "bag.use": 1, "siege.repair": 1, "siege.build": 1
  };

  var FORGED = {
    damage: 1, hurt: 1, grant: 1, grantBits: 1, setBits: 1, setHp: 1,
    heal: 1, kill: 1, setXp: 1, setFullness: 1, currency: 1, bits: 1,
    xpDelta: 1, applyDamage: 1, pickup: 1, legendaryDrop: 1,
    "brawl.settle": 1, "brawl.payout": 1, "brawl.award": 1,
    syncHost: 1, setForm: 1, grantWeapon: 1, trainGrant: 1,
    "rarity.spoof": 1, "rarity.tick": 1, "rarity.set": 1, setMood: 1, setBond: 1,
    setWindows: 1, setClock: 1, grantUnlock: 1, noteDiscovery: 1, discover: 1,
    unlock: 1, scheduleFarm: 1, scheduleBrawl: 1, "lifecycle.force": 1,
    debugSatisfy: 1, setIgnored: 1, setRarity: 1,
    "party.revive": 1, revive: 1, selfRevive: 1, forceRevive: 1,
    "weather.set": 1, "weather.force": 1
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function len(x, y) { return Math.sqrt(x * x + y * y); }

  function Progression(opts) {
    opts = opts || {};
    this.data = opts.data || D;
    this.debug = !!opts.debug;
    /* Client URL flags never set this. Only an explicit host/local-dev
     * constructor option may relax intent checks. */
    this.allowDebugIntents = opts.allowDebugIntents === true && this.debug;
    this.account = normalizeAccount(opts.account);
    this.settled = this.account.settledPayouts || {};
    this._persist = opts.persist || null;
    this._listeners = [];
    /* 17z33: each armor route asks for its own Digimental (shop.js) */
    if (this.data.applyDigimentals) this.data.applyDigimentals(this.data.EVO_TREE || (typeof EVO_TREE !== "undefined" ? EVO_TREE : null));
  }

  function normalizeAccount(raw) {
    raw = raw || {};
    var R = rarityApi();
    var disc = raw.discoveries;
    if (R && R.normalizeDiscoveries) disc = R.normalizeDiscoveries(disc);
    else disc = disc || { species: {}, edges: {} };
    return {
      digiBits: Math.max(0, raw.digiBits || 0),
      unlocked: raw.unlocked || {},
      equipped: raw.equipped || {},
      legendaryDropped: !!raw.legendaryDropped,
      settledPayouts: raw.settledPayouts || {},
      discoveries: disc,
      speciesUnlocks: raw.speciesUnlocks || {},
      settledDiscoveries: raw.settledDiscoveries || {}
    };
  }

  Progression.prototype.bind = function (authority) {
    this.authority = authority;
    return this;
  };

  Progression.prototype.onCommit = function (fn) { this._listeners.push(fn); };

  Progression.prototype.commitAccount = function () {
    this.account.settledPayouts = this.settled;
    this.account.settledDiscoveries = this.account.settledDiscoveries || {};
    var i, acc = this.account;
    if (this._persist) this._persist(acc);
    for (i = 0; i < this._listeners.length; i++) this._listeners[i](acc);
    return acc;
  };

  Progression.prototype.sim = function () {
    return this.authority && this.authority.sim;
  };

  Progression.prototype.player = function (id) {
    var sim = this.sim();
    if (!sim) return null;
    return (id && sim.player(id)) || sim.player(sim.localId) || sim.players[0] || null;
  };

  Progression.prototype.emit = function (ev) {
    var sim = this.sim();
    if (sim && sim.emit) sim.emit(ev);
    else if (this.authority) this.authority.events.push(ev);
  };

  Progression.prototype.isIllegal = function (msg) {
    if (!msg) return false;
    if (msg.type && FORGED[msg.type]) return true;
    if (msg.damage != null || msg.grantBits != null || msg.bitsDelta != null) return true;
    if (msg.hpSet != null || msg.xpDelta != null || msg.legendaryDrop) return true;
    if (msg.defeatedLegendary != null) return true;
    var R = rarityApi();
    if (R && R.isSpoof && R.isSpoof(msg)) return true;
    return false;
  };

  Progression.prototype.isIntent = function (type) { return !!INTENTS[type]; };

  /* Public ingress. Forged reward / form / training / capture fields are dropped. */
  Progression.prototype.act = function (intent) {
    if (!intent || !intent.type) return { ok: false, reason: "empty" };
    if (this.isIllegal(intent) || FORGED[intent.type]) {
      this.emit({ type: "rejected", reason: "client-asserted", kind: intent.type });
      return { ok: false, reason: "rejected" };
    }
    if (!INTENTS[intent.type]) return { ok: false, reason: "unknown" };
    var fn = this._handlers[intent.type];
    if (!fn) return { ok: false, reason: "unknown" };
    /* Production and URL-driven clients may not pass rolls, forced success,
     * free chips, or stat payloads. Only explicit server-side allowDebugIntents. */
    if (!this.allowDebugIntents) {
      if (intent.force || intent.roll != null || intent.chance != null || intent.free || intent.debug) {
        this.emit({ type: "rejected", reason: "forged-capture", kind: intent.type });
        return { ok: false, reason: "rejected" };
      }
      if (intent.gain != null || intent.trainStats || (intent.score != null && intent.type === "farm.trainStart")) {
        this.emit({ type: "rejected", reason: "forged-training", kind: intent.type });
        return { ok: false, reason: "rejected" };
      }
    }
    return fn.call(this, intent);
  };

  Progression.prototype._handlers = {};

  /* ---------- Shared run helpers ---------- */
  Progression.prototype._evoStats = function (p) {
    var data = this.data;
    var stats = {
      level: p.level || 1,
      meals: p.foodEaten || 0,
      joy: p.happiness || 0,
      happiness: p.happiness || 0,
      hpRatio: p.maxHp ? p.hp / p.maxHp : 1,
      careMistakes: p.careMistakes || 0,
      foodCounts: p.foodCounts || {},
      killsAttribute: p.killsAttribute || {},
      killsSpecies: p.killsSpecies || {},
      bossesBeaten: p.bossesBeaten || 0,
      faints: p.faints || 0,
      desperationTime: p.desperationTime || 0,
      partners: p.partners || [],
      items: p.items || [],
      trainStats: p.trainStats || { offense: 0, intelligence: 0, agility: 0 },
      offense: (p.trainStats && p.trainStats.offense) || 0,
      intelligence: (p.trainStats && p.trainStats.intelligence) || 0,
      agility: (p.trainStats && p.trainStats.agility) || 0,
      bondTrain: p.bondTrain || 0,
      formTime: Math.max(0, ((this.sim() && this.sim().time) || 0) - (p.formSince || 0)),
      runTime: (this.sim() && this.sim().time) || 0,
      /* times this partner has been told "not yet": in this form, and ever */
      formHolds: p.formHolds || 0,
      holdbacks: p.holdbacks || 0
    };
    if (data.uniqueMostFood) stats.mostFood = data.uniqueMostFood(stats.foodCounts) || "__none__";
    if (data.rarity && data.rarity.attachStats) data.rarity.attachStats(stats, p);
    else if (rarityApi() && rarityApi().attachStats) rarityApi().attachStats(stats, p);
    return stats;
  };

  Progression.prototype._isEgg = function (form) {
    var sp = this.data.SPECIES && this.data.SPECIES[form];
    if (sp && (sp.stage === "Egg" || sp.hatchTo)) return true;
    return false;
  };

  Progression.prototype._applyForm = function (p, to, kind) {
    var data = this.data;
    var sp = data.SPECIES && data.SPECIES[to];
    if (!sp) return { ok: false, reason: "unknown-form" };
    var prev = p.form;
    var ratio = p.maxHp ? p.hp / p.maxHp : 1;
    p.form = to;
    p.formSince = (this.sim() && this.sim().time) || 0;
    p.hatchLeft = kind === "hatch" ? 0 : p.hatchLeft;
    var base = sp.base || {};
    var EB = data.EVO_BOOST || {};
    var grew = kind !== "hatch" && prev && !this._isEgg(prev);
    var hpWas = p.maxHp || 0;
    if (grew) p.evoCount = Math.min(EB.maxCount || 6, (p.evoCount || 0) + 1);
    /* a digivolution can come out shiny; once shiny, always shiny */
    var SH = data.SHINY, simS = this.sim(), rollS = (simS && simS.rng) || Math.random, becameShiny = false;
    /* a Prism Shard triples the chance; a Lucky Charm makes the first digivolution of the run 20 times likelier */
    var shMul = (simS && simS._gear ? simS._gear(p).shiny : 1) * ((p.luckyShiny && kind !== "hatch") ? p.luckyShiny : 1);
    if (simS && simS._blood && data.BLOODLINE) shMul *= 1 + data.BLOODLINE.shiny * simS._blood(p, "shiny");   /* a bloodline's Lucky Scales */
    /* 17z33: hatching can come out shiny too, at the same chance; a shiny is a little stronger in
     * everything (SHINY.evoBoost when it turned shiny digivolving, SHINY.hatchBoost when it hatched shiny) */
    var hatching = kind === "hatch" && prev && this._isEgg(prev);
    if (SH && (grew || hatching) && kind !== "dna.revert" && kind !== "duel" && !p.shiny && rollS() < SH.chance * shMul) {
      p.shiny = true; becameShiny = true;
      p.shinyBoost = hatching ? (SH.hatchBoost || 0.05) : (SH.evoBoost || 0.025);
      p._statsKey = null;
      p.shinyGuardDue = 1;                          /* the shiny moment on its screen may ask for its guard once (shiny.guard) */
    }
    if (p.shiny && !p.shinyBoost) p.shinyBoost = SH ? (SH.evoBoost || 0.025) : 0.025;
    if (grew && kind !== "hatch" && kind !== "dna.revert") p.luckyShiny = 0;
    if (base.maxHp) {
      p.maxHp = Math.round(base.maxHp * Math.pow(1.16, (p.statLevels && p.statLevels.maxHp) || 0) * ((p.perks && p.perks.hp) || 1) * this._vitMul(p) * this._skillHpMul(p) * (1 + (p.shiny ? p.shinyBoost || 0 : 0)));
      /* a fresh form arrives in good shape: at least most of its health */
      p.hp = clamp(p.maxHp * Math.max(ratio, grew ? (EB.minHpRatio || 0.75) : 0.45) + 12, 1, p.maxHp);
      p._allyHpMul = 1;   /* an ally's max-health passive is put back on by the sim */
      p.skillOffer = null; /* a new form has new moves to offer: the cards are dealt again */
    }
    p.formHolds = 0;
    p.evoHoldUntil = 0;
    p.evoOffer = null;
    function grantWeapon(id, bump) {
      if (!id) return;
      var W = data.WEAPONS;
      if (W && !W[id]) return;
      p.weapons = p.weapons || [];
      var i, found = false;
      for (i = 0; i < p.weapons.length; i++) {
        if (p.weapons[i].id === id) {
          if (bump) p.weapons[i].level += 1;
          found = true;
        }
      }
      if (!found) p.weapons.push({ id: id, level: 1, cd: 0.15 });
    }
    if (data.movePool) {
      /* Moves carry over on digivolution. Only a partner with nothing at
       * all (fresh from the egg) is handed its first move; bigger versions
       * come as level-up choices. */
      if (!(p.weapons && p.weapons.length)) grantWeapon(data.movePool(to).primary, false);
    } else {
      grantWeapon(sp.startWeapon, false);
      grantWeapon(sp.signatureWeapon, true);
    }
    /* skill tree: a partner with moves but no tree yet starts from what it fires */
    var simT = this.sim();
    if (simT && simT._sk && simT._sk()) simT._seedSkills(p);
    p.evoLock = 2;
    p.formsReached = p.formsReached || {};
    p.formsReached[to] = true;
    if (kind !== "dna.revert") this._recordDiscovery(p, prev, to, kind || "standard");
    this._checkUnlocks(p);
    if (kind !== "duel") this.emit({ type: kind === "hatch" ? "hatch" : "evolve", id: p.id, from: prev, to: to, kind: kind || "standard",
      boost: grew ? { hp: Math.max(0, p.maxHp - hpWas), atk: Math.round((EB.damage || 0) * 100), rate: Math.round((EB.cooldown || 0) * 100), spd: Math.round((EB.speed || 0) * 100) } : null });
    if (p.shiny && kind !== "dna.revert") this.emit({ type: "shiny", id: p.id, form: to, first: becameShiny, boost: Math.round((p.shinyBoost || 0) * 1000) / 10, hatched: becameShiny && hatching });
    if (this.sim() && this.sim()._noteStage) this.sim()._noteStage(p);   /* first Mega, for the boards (modes-sim.js) */
    return { ok: true, from: prev, to: to, kind: kind || "standard" };
  };

  /* ---------- Hatch / evolve / level-up ---------- */
  Progression.prototype._handlers.hatch = function (intent) {
    var p = this.player(intent.id);
    if (!p) return { ok: false, reason: "no-player" };
    if (!this._isEgg(p.form)) return { ok: false, reason: "not-egg" };
    if ((p.hatchLeft || 0) > 0.05 && !this.allowDebugIntents) return { ok: false, reason: "not-ready" };
    if (intent.to) {
      var legit = this.data.SPECIES && this.data.SPECIES[p.form] && this.data.SPECIES[p.form].hatchTo;
      if (intent.to !== legit) {
        this.emit({ type: "rejected", reason: "forged-form", kind: "hatch", want: intent.to });
        return { ok: false, reason: "rejected" };
      }
    }
    var to = this.data.SPECIES && this.data.SPECIES[p.form] && this.data.SPECIES[p.form].hatchTo;
    if (!to) return { ok: false, reason: "no-hatch" };
    p.hatchedAt = (this.sim() && this.sim().time) || 0;
    p.eggForm = p.form;                          /* the line's own egg: a respawn comes back as this (modes-sim.js; lines share forms) */
    var hres = this._applyForm(p, to, "hatch");
    if (p.respawnShield) { p.monInvuln = Math.max(p.monInvuln || 0, p.respawnShield); p.tamerInvuln = Math.max(p.tamerInvuln || 0, p.respawnShield); p.respawnShield = 0; }   /* modes-sim.js */
    return hres;
  };

  Progression.prototype._handlers.evolve = function (intent) {
    var p = this.player(intent.id);
    if (!p) return { ok: false, reason: "no-player" };
    if (this._isEgg(p.form)) return { ok: false, reason: "egg" };
    if ((p.evoLock || 0) > 0) return { ok: false, reason: "locked" };
    var stats = this._evoStats(p);
    var pick = this.data.pickEvolution ? this.data.pickEvolution(p.form, stats) : null;
    if (!pick || !pick.to || pick.to === p.form) return { ok: false, reason: "not-ready" };
    if (intent.to && intent.to !== pick.to) {
      this.emit({ type: "rejected", reason: "forged-form", kind: "evolve", want: intent.to, legal: pick.to });
      return { ok: false, reason: "rejected" };
    }
    /* Luck: now and then a digivolution goes somewhere it had no business
     * going, onto one of this form's other real routes. Rare, and only
     * when the player chose to digivolve from the prompt. */
    var lucky = this._luckyRoute(p, pick);
    if (lucky) {
      var res = this._applyForm(p, lucky.to, lucky.kind || "special");
      if (res.ok) { res.lucky = true; this.emit({ type: "evo.lucky", id: p.id, to: lucky.to }); }
      return res;
    }
    /* A Hatchery partner: what it ate there still pulls. It may take another
     * of this form's real routes, one of an element it was raised on. */
    var hr = this._hatchRoute(p, pick);
    if (hr) return this._applyForm(p, hr.to, hr.kind || "special");
    return this._applyForm(p, pick.to, pick.kind || "standard");
  };

  /* The PvP flag (Nov 20, pvp-sim.js): on at once; off only after PVP.flagOff seconds, so it can't be
   * dropped to slip out of a fight. */
  /* Your side in the turf war (17z33, turf.js). One biome can be your friend at a time: picking a
   * side drops the old one back to neutral (and its rallied Digimon go home, faction-sim.js);
   * "just survive" (side null) means no biome befriends you at all. */
  Progression.prototype._handlers["side.pick"] = function (intent) {
    var sim = this.sim(), p = this.player(intent.id), BD = this.data.biomes && this.data.biomes.DEFS, side = intent.side || null, k;
    if (!sim || !p) return { ok: false, reason: "no-run" };
    if (side && !(BD && BD[side])) return { ok: false, reason: "no such biome" };
    if (side && p.side === side) return { ok: true, side: side };
    if (p.trust) for (k in p.trust) if (k !== side && p.trust[k] > 0) {
      p.trust[k] = 0;
      if (p.allied) delete p.allied[k];
      this.emit({ type: "trust", id: p.id, fac: k, level: "neutral", value: 0 });
    }
    p.side = side;
    p.free = !side;
    this.emit({ type: "side.pick", id: p.id, side: side });
    return { ok: true, side: side };
  };

  Progression.prototype._handlers["pvp.flag"] = function (intent) {
    var sim = this.sim(), p = this.player(intent.id), P = this.data.PVP || {};
    if (!sim || !p) return { ok: false, reason: "no-run" };
    if (intent.on) { p.pvpFlag = true; p.pvpOffAt = 0; }
    else if (p.pvpFlag && !p.pvpOffAt) p.pvpOffAt = sim.time + (P.flagOff || 10);
    this.emit({ type: "pvp.flag", id: p.id, on: !!p.pvpFlag, offAt: p.pvpOffAt || 0 });
    return { ok: true, on: !!p.pvpFlag, offAt: p.pvpOffAt || 0 };
  };

  /* the level-up window was closed early: the breather ends with it */
  /* Press E beside a black spire or a data cache (data.js TERRAIN, world.js).
   * A spire breaks and an evil mini boss steps out; a cache spills Bits and XP.
   * Each can be used once a run. */
  function strHash(s) { var h = 2166136261, i; for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; }
  Progression.prototype._handlers["prop.use"] = function (intent) {
    var sim = this.sim(), p = this.player(intent.id), T = this.data.TERRAIN, w = this.data.world;
    if (!sim || !p || !T || !w || !w.propAt) return { ok: false, reason: "no-world" };
    if (sim.phase && sim.phase !== "playing") return { ok: false, reason: "Not now" };
    if (p.downed) return { ok: false, reason: "Not while down" };
    var tx = intent.tx | 0, ty = intent.ty | 0, key = tx + "," + ty, kind = w.propAt(tx, ty);
    if (kind !== "spire" && kind !== "cache") return { ok: false, reason: "Nothing there" };
    sim.usedProps = sim.usedProps || {};
    if (sim.usedProps[key]) return { ok: false, reason: "Already used" };
    var tile = (sim._tileSize && sim._tileSize()) || 48, px = (tx + 0.5) * tile, py = (ty + 0.9) * tile, r = (T.useRadius || 78) + 30;
    var dx = (p.x || 0) - px, dy = (p.y || 0) - py, i, a, C, S, defs, year, s2, want, k, type = null, c, e, SC;
    if (dx * dx + dy * dy > r * r) return { ok: false, reason: "Get closer" };
    sim.usedProps[key] = 1;
    if (w.markUsed) w.markUsed(key);
    if (kind === "cache") {
      C = T.cache || {};
      sim._spawnOrb("bits", px, py + 16, Math.round((C.bits ? C.bits[0] + sim.rng() * (C.bits[1] - C.bits[0]) : 8)));
      for (i = 0; i < (C.xpOrbs || 3); i++) { a = Math.PI * (0.15 + 0.7 * i / Math.max(1, (C.xpOrbs || 3) - 1)); sim._spawnOrb("xp", px + Math.cos(a) * 26, py + 10 + Math.sin(a) * 18, Math.round(5 + sim.time / 40)); }
      this.emit({ type: "prop.used", kind: kind, key: key, x: px, y: py, id: p.id });
      return { ok: true, kind: kind };
    }
    /* 17z33: a gamble (spire-sim.js): most often a swarm of little ones, now and then a pack with a
     * Rookie at its head, rarely something huge after a rumble; beat everything for a chest */
    var res = sim._spireBreak ? sim._spireBreak(p, key, px, py) : { tier: "small", enemyType: null };
    this.emit({ type: "prop.used", kind: kind, key: key, x: px, y: py, id: p.id, tier: res.tier, enemyType: res.enemyType || null, count: res.count || 0 });
    return { ok: true, kind: kind, tier: res.tier, enemyType: res.enemyType || null };
  };

  Progression.prototype._handlers["breather.end"] = function (intent) {
    var sim = this.sim(), p = this.player(intent.id);
    if (!sim || !p) return { ok: false, reason: "no-player" };
    p.monInvuln = Math.min(p.monInvuln || 0, 0.35);
    p.choosing = 0;
    if (!sim.coop) sim.enemyFreeze = 0;
    return { ok: true };
  };
  Progression.prototype._handlers.burst = function (intent) {
    var sim = this.sim(), p = this.player(intent.id);
    if (!sim || !p || !sim.startBurst) return { ok: false, reason: "no-player" };
    var r = sim.startBurst(p);
    if (r && r.ok) p.burstUses = (p.burstUses || 0) + 1;      /* Story's warp goal */
    return r;
  };

  /* ---------- DNA digivolution (js/dna.js) ---------- */
  Progression.prototype._dnaReady = function (p) {
    var DNA = this.data.DNA, sim = this.sim(), g = DNA.gateFor(p.form);
    var t = Math.max(0, ((sim && sim.time) || 0) - (p.formSince || 0));
    return (p.level || 1) >= g.level && t >= g.time ? null : { level: g.level, minutes: Math.ceil(g.time / 60), who: p.id };
  };
  Progression.prototype._dnaUp = function (p) { return !!(p && !p.downed && !p.away && !(p.faint > 0) && p.hp > 0 && !this._isEgg(p.form)); };
  Progression.prototype._dnaFuse = function (p, to, withId) {
    var before = { from: p.form, evoCount: p.evoCount || 0, maxHp: p.maxHp };
    var res = this._applyForm(p, to, "dna");
    if (!res.ok) return res;
    p.dna = { from: before.from, to: to, evoCount: before.evoCount, with: withId };
    p.dnaOffer = null; p.dnaAsk = null;
    this.emit({ type: "dna.done", id: p.id, to: to, from: before.from, with: withId });
    return res;
  };
  Progression.prototype._handlers["dna.ask"] = function (intent) {
    var DNA = this.data.DNA, sim = this.sim(), p = this.player(intent.id), i, q, best = null, bd = 1e15, d, pair;
    if (!DNA || !sim || !p) return { ok: false, reason: "no-player" };
    if (!this._dnaUp(p)) return { ok: false, reason: "down" };
    if ((p.dnaCd || 0) > sim.time) return { ok: false, reason: "wait" };
    for (i = 0; i < sim.players.length; i++) {
      q = sim.players[i];
      if (q === p || !this._dnaUp(q) || !DNA.find(p.form, q.form)) continue;
      d = (q.mx - p.mx) * (q.mx - p.mx) + (q.my - p.my) * (q.my - p.my);
      if (d <= DNA.CFG.range * DNA.CFG.range && d < bd) { bd = d; best = q; }
    }
    /* no teammate to pair with: the caught ally will do, if it is the other half */
    var al = sim.ally, A = this.data.ALLY;
    if (!best && al && al.hp > 0 && sim._allyOwner && sim._allyOwner() === p && DNA.find(p.form, al.form)) {
      var gateA = this._dnaReady(p);
      if (gateA) {
        this.emit({ type: "dna.fail", id: p.id, why: "gate", level: gateA.level, minutes: gateA.minutes, mine: true });
        return { ok: false, reason: "gate", level: gateA.level, minutes: gateA.minutes };
      }
      var optsA = DNA.results(DNA.find(p.form, al.form)), toA = optsA.indexOf(intent.to) >= 0 ? intent.to : optsA[0];
      var kept = al.passive, had = 0, pi;
      var resA = this._dnaFuse(p, toA, "ally");
      if (!resA.ok) return resA;
      /* the ally is absorbed: its passive stays with the partner, and the slot is free again */
      p.passives = p.passives || [];
      for (pi = 0; pi < p.passives.length; pi++) if (p.passives[pi] === kept) had++;
      if (kept && had < ((A && A.stackMax) || 2)) p.passives.push(kept);
      sim.ally = null;
      if (p.reserve && p.reserve.length) {
        var nx = p.reserve.shift(), spN = this.data.SPECIES && this.data.SPECIES[nx.form], hpN = Math.max(20, Math.round(((spN && spN.base && spN.base.maxHp) || 40) * 0.85));
        sim.ally = { form: nx.form, x: p.mx + 30, y: p.my - 10, hp: hpN, maxHp: hpN, facing: 1, weapon: { id: "pepperBreath", level: 1, cd: 0.25 }, invuln: 0.4 };
        if (sim._allyKit) sim._allyKit(sim.ally, true);
      }
      this.emit({ type: "ally.absorbed", id: p.id, form: al.form, passive: kept, kept: !!(kept && had < ((A && A.stackMax) || 2)) });
      return { ok: true, fused: true, ally: true };
    }
    if (!best) { this.emit({ type: "dna.fail", id: p.id, why: "nobody" }); return { ok: false, reason: "nobody" }; }
    q = best; pair = DNA.find(p.form, q.form);
    var gate = this._dnaReady(p) || this._dnaReady(q);
    if (gate) {
      this.emit({ type: "dna.fail", id: p.id, why: "gate", level: gate.level, minutes: gate.minutes, mine: gate.who === p.id });
      return { ok: false, reason: "gate", level: gate.level, minutes: gate.minutes };
    }
    if (q.dnaOffer && q.dnaOffer.until > sim.time) return { ok: false, reason: "busy" };
    var opts = DNA.results(pair), aTo = opts.indexOf(intent.to) >= 0 ? intent.to : opts[0];
    if (q.kind === "cpu" || q.hasTamer === false) {
      this._dnaFuse(p, aTo, q.id); this._dnaFuse(q, aTo, p.id);
      return { ok: true, fused: true };
    }
    q.dnaOffer = { from: p.id, aTo: aTo, until: sim.time + DNA.CFG.offerTime };
    p.dnaAsk = { to: q.id, until: q.dnaOffer.until };
    this.emit({ type: "dna.offer", id: q.id, from: p.id, fromForm: p.form, options: opts, time: DNA.CFG.offerTime });
    this.emit({ type: "dna.asked", id: p.id, to: q.id, toForm: q.form });
    return { ok: true, asked: q.id };
  };
  Progression.prototype._handlers["dna.answer"] = function (intent) {
    var DNA = this.data.DNA, sim = this.sim(), q = this.player(intent.id), o = q && q.dnaOffer, p, pair, d, gate;
    if (!DNA || !sim || !q || !o) return { ok: false, reason: "no-offer" };
    q.dnaOffer = null;
    p = this.player(o.from);
    if (p) p.dnaAsk = null;
    if (o.until < sim.time) return { ok: false, reason: "late" };
    if (!intent.ok) {
      if (p) { p.dnaCd = sim.time + DNA.CFG.retry; this.emit({ type: "dna.fail", id: p.id, why: "declined" }); }
      return { ok: true, declined: true };
    }
    pair = p && DNA.find(p.form, q.form);
    d = p ? Math.sqrt((q.mx - p.mx) * (q.mx - p.mx) + (q.my - p.my) * (q.my - p.my)) : 1e9;
    gate = pair && (this._dnaReady(p) || this._dnaReady(q));
    if (!pair || !this._dnaUp(p) || !this._dnaUp(q) || d > DNA.CFG.answerRange || gate) {
      this.emit({ type: "dna.fail", id: q.id, why: d > DNA.CFG.answerRange ? "far" : "gone" });
      if (p) this.emit({ type: "dna.fail", id: p.id, why: d > DNA.CFG.answerRange ? "far" : "gone" });
      return { ok: false, reason: "gone" };
    }
    var opts = DNA.results(pair), bTo = opts.indexOf(intent.to) >= 0 ? intent.to : opts[0];
    var aTo = opts.indexOf(o.aTo) >= 0 ? o.aTo : opts[0];
    this._dnaFuse(p, aTo, q.id);
    this._dnaFuse(q, bTo, p.id);
    return { ok: true, fused: true };
  };
  /* each tick: prompts run out, and a downed DNA partner drops back */
  Progression.prototype._tickDna = function (p) {
    var sim = this.sim(), asker, hp, cnt;
    if (p.dnaOffer && p.dnaOffer.until < sim.time) {
      asker = this.player(p.dnaOffer.from);
      p.dnaOffer = null;
      this.emit({ type: "dna.fail", id: p.id, why: "timeout" });
      if (asker) { asker.dnaAsk = null; this.emit({ type: "dna.fail", id: asker.id, why: "timeout" }); }
    }
    if (!p.dna) return;
    if (p.form !== p.dna.to) { p.dna = null; return; }        /* digivolved onward: it is theirs now */
    if (p.downed) {
      cnt = p.dna.evoCount; hp = p.hp;
      var back = p.dna.from;
      p.dna = null;
      if (this._applyForm(p, back, "dna.revert").ok) {
        p.evoCount = cnt; p.hp = Math.min(hp, 0) <= 0 ? 0 : hp; p.evoOffer = null;
        this.emit({ type: "dna.revert", id: p.id, to: back });
      }
    }
  };

  /* Vitality: max HP x (1 + VIT / 100), job bonus included */
  Progression.prototype._vitMul = function (p) {
    var sim = this.sim();
    if (!sim || !sim._ro || !sim._ro()) return 1;
    return sim._derived(p).hpMul;
  };

  Progression.prototype._hatchRoute = function (p, pick) {
    var B = p.hatchBias, data = this.data, sim = this.sim(), rng = (sim && sim.rng) || Math.random;
    if (!B || !data.moveFamilyOf) return null;
    var tree = data.EVO_TREE || (typeof EVO_TREE !== "undefined" ? EVO_TREE : null);
    var list = (tree && tree.branches && tree.branches[p.form]) || [], pool = [{ b: null, w: 50 * (1 + 5 * (B[data.moveFamilyOf(pick.to)] || 0)) }], seen = {}, i, b, f, s = 0, r;
    for (i = 0; i < list.length; i++) {
      b = list[i];
      if (!b || !b.to || b.to === pick.to || b.to === p.form || seen[b.to]) continue;
      if (b.kind === "neglect" || b.kind === "fallback" || b.kind === "standard") continue;
      if (!(data.SPECIES && data.SPECIES[b.to]) || (data.moveStageIdx && data.moveStageIdx(b.to) !== data.moveStageIdx(pick.to))) continue;
      f = data.moveFamilyOf(b.to);
      if (!(B[f] > 0)) continue;
      seen[b.to] = 1; pool.push({ b: b, w: 5 * (1 + 5 * B[f]) });
    }
    for (i = 0; i < pool.length; i++) s += pool[i].w;
    r = rng() * s;
    for (i = 0; i < pool.length; i++) { r -= pool[i].w; if (r <= 0) return pool[i].b; }
    return null;
  };
  Progression.prototype._luckyRoute = function (p, pick) {
    var TL = this.data.TAMER_LEVEL, sim = this.sim();
    var luk = (sim && sim._ro && sim._ro()) ? sim._attrsEff(p).luk : ((p.attrs && p.attrs.luk) || 0);
    var fruit = p.evoFruit || 0;                                    /* an Evo Fruit (data.js FOOD): spent on this digivolution */
    p.evoFruit = 0;
    if (!fruit && (!TL || !luk || !p.evoOffer)) return null;
    var chance = Math.max(fruit, TL ? Math.min(TL.luckyEvoMax || 0.25, (luk || 0) * (TL.luckyEvoPer || 0.004)) : 0);
    var rng = (sim && sim.rng) || Math.random;
    if (rng() >= chance) return null;
    var tree = this.data.EVO_TREE || (typeof EVO_TREE !== "undefined" ? EVO_TREE : null);
    var list = (tree && tree.branches && tree.branches[p.form]) || [], pool = [], seen = {}, i, b;
    for (i = 0; i < list.length; i++) {
      b = list[i];
      if (!b || !b.to || b.to === pick.to || b.to === p.form || seen[b.to]) continue;
      if (b.kind === "neglect" || b.kind === "fallback" || b.kind === "standard") continue;
      if (!(this.data.SPECIES && this.data.SPECIES[b.to])) continue;
      seen[b.to] = 1; pool.push(b);
    }
    if (!pool.length && fruit) p.evoFruit = fruit;                  /* nowhere rare to go from here: the fruit keeps */
    return pool.length ? pool[Math.floor(rng() * pool.length) % pool.length] : null;
  };

  Progression.prototype._skillHpMul = function (p) {
    var sim = this.sim(), SK = sim && sim._sk && sim._sk();
    return SK ? SK.passiveMul(p.skills || {}).hp : 1;
  };

  /* Spend one skill point (one per job level) in the partner's skill tree. */
  /* Swap which learned moves are equipped (17z33, Isaac): any time, at no cost. */
  Progression.prototype._handlers["skill.equip"] = function (intent) {
    var p = this.player(intent.id), sim = this.sim(), SK = sim && sim._sk && sim._sk();
    if (!p || !SK || !SK.applyEquip) return { ok: false, reason: "no-player" };
    if (sim._isEgg(p.form)) return { ok: false, reason: "Not hatched yet" };
    sim._syncMoves(p);
    var ids = SK.active(this.data, p.skills || {}).map(function (a) { return a.id; });
    var r = SK.applyEquip(p.equip, ids, String(intent.skill || ""), intent.drop ? String(intent.drop) : null, !!intent.off, p.equipN || sim.equipSlots(p));
    if (!r.ok) return r;
    p.equip = r.list;
    sim._syncMoves(p);
    this.emit({ type: "skill.equip", id: p.id, equip: p.equip.slice() });
    return { ok: true, equip: p.equip.slice() };
  };
  Progression.prototype._handlers["skill.add"] = function (intent) {
    var p = this.player(intent.id), sim = this.sim(), SK = sim && sim._sk && sim._sk();
    if (!p || !SK) return { ok: false, reason: "no-player" };
    if (sim._isEgg(p.form)) return { ok: false, reason: "Not hatched yet" };
    var id = String(intent.skill || "");
    if (!((p.skillPoints || 0) > 0)) return { ok: false, reason: "No skill points" };
    p.skills = p.skills || {};
    var why = SK.blocked(this.data, p.form, p.skills, id);
    if (why) return { ok: false, reason: why };
    /* a skill not known yet can only be learned from the cards on offer */
    if (this.data.SKILL_CARDS && SK.offer && !(p.skills[id] > 0) && p.skillOffer && p.skillOffer.indexOf(id) < 0) return { ok: false, reason: "New skills come from level-up cards" };
    var hpWas = this._skillHpMul(p), fresh = !(p.skills[id] > 0);
    p.skills[id] = (p.skills[id] || 0) + 1;
    p.skillPoints -= 1;
    if (fresh && SK.learned) SK.learned(this.data, p.skills, id);     /* a signature that grows replaces its old move; a choice locks the other side */
    if (id === "vt" && p.maxHp) {
      var old = p.maxHp;
      p.maxHp = Math.round(p.maxHp / hpWas * this._skillHpMul(p));
      p.hp = Math.min(p.maxHp, (p.hp || 0) + Math.max(0, p.maxHp - old));
    }
    sim._syncMoves(p);
    /* the point is spent, and so is its offer; the next point gets a new one */
    p.skillOffer = null;
    if (sim._rollOffer) sim._rollOffer(p);
    this.emit({ type: "skill.add", id: p.id, skill: id, level: p.skills[id], left: p.skillPoints });
    return { ok: true, skill: id, level: p.skills[id], left: p.skillPoints };
  };

  /* Spend status points. Each raise costs more the higher the stat already
   * is (see js/ro-stats.js); `n` is how many raises to try for. */
  Progression.prototype._handlers["stat.add"] = function (intent) {
    var p = this.player(intent.id), sim = this.sim(), RO = sim && sim._ro && sim._ro();
    if (!p || !RO) return { ok: false, reason: "no-player" };
    var stat = String(intent.stat || ""), want = Math.max(1, Math.min(99, intent.n | 0 || 1)), done = 0, c;
    if (RO.ORDER.indexOf(stat) < 0) return { ok: false, reason: "unknown-stat" };
    var at = sim._attrs(p), was = this._vitMul(p);
    while (done < want && at[stat] < RO.CFG.cap) {
      c = RO.cost(at[stat]);
      if ((p.statPoints || 0) < c) break;
      p.statPoints -= c;
      at[stat] += 1;
      done += 1;
    }
    if (!done) return { ok: false, reason: at[stat] >= RO.CFG.cap ? "Already at 99" : "Not enough points" };
    if (stat === "vit" && p.maxHp) {
      var old = p.maxHp;
      p.maxHp = Math.round(p.maxHp / was * this._vitMul(p));
      p.hp = Math.min(p.maxHp, (p.hp || 0) + Math.max(0, p.maxHp - old));
    }
    p._statsKey = null;
    this.emit({ type: "stat.add", id: p.id, stat: stat, value: at[stat], left: p.statPoints });
    return { ok: true, stat: stat, value: at[stat], left: p.statPoints, raised: done };
  };

  /* "Not yet." The partner stays as it is and keeps levelling; the offer
   * comes back in a few levels. Waiting earns one small random perk, and a
   * few hidden routes only open for a partner that was held back. */
  Progression.prototype._handlers["evolve.hold"] = function (intent) {
    var p = this.player(intent.id);
    if (!p) return { ok: false, reason: "no-player" };
    if (!p.evoOffer) return { ok: false, reason: "no-offer" };
    var H = this.data.EVO_HOLD || {};
    var pool = H.perks || [], sim = this.sim();
    var rng = (sim && sim.rng) || Math.random;
    p.evoOffer = null;
    p.formHolds = (p.formHolds || 0) + 1;
    p.holdbacks = (p.holdbacks || 0) + 1;
    p.evoHoldUntil = (p.level || 1) + (H.everyLevels || 5);
    var perk = pool.length ? pool[Math.floor(rng() * pool.length) % pool.length] : null;
    if (perk) {
      p.perks = p.perks || {};
      p.perks[perk.stat] = (p.perks[perk.stat] || 1) * perk.mul;
      p.perkLog = (p.perkLog || []).concat([perk.id]);
      if (perk.stat === "hp" && p.maxHp) {
        var was = p.maxHp;
        p.maxHp = Math.round(p.maxHp * perk.mul);
        p.hp = Math.min(p.maxHp, (p.hp || 0) + (p.maxHp - was));
      }
      p._statsKey = null;
    }
    this.emit({ type: "evo.hold", id: p.id, perk: perk ? perk.id : null, label: perk ? perk.label : null, nextLevel: p.evoHoldUntil });
    return { ok: true, perk: perk ? perk.id : null, label: perk ? perk.label : null, nextLevel: p.evoHoldUntil };
  };

  Progression.prototype._levelPool = function (p) {
    var data = this.data;
    var pool = [], owned = {}, i, id, def, w;
    p.weapons = p.weapons || [];
    for (i = 0; i < p.weapons.length; i++) owned[p.weapons[i].id] = p.weapons[i];
    if (data.WEAPONS && data.movePool && data.MOVE_META) {
      /* Curated pools (js/moves.js): only this Digimon's own moves. An owned
       * move can level up, or evolve into the bigger version its new stage
       * allows; an empty slot can learn the move for that slot. */
      var mp = data.movePool(p.form), meta = data.MOVE_META, WD = data.WEAPONS;
      var slots = ["primary", "melee", "aura", "orbit"], bySlot = {}, s, own, target, m, tOwn, tNew;
      for (id in owned) {
        m = meta[id];
        if (m && (!bySlot[m.slot] || (meta[bySlot[m.slot].id] || {}).tier < m.tier)) bySlot[m.slot] = owned[id];
      }
      for (s = 0; s < slots.length; s++) {
        own = bySlot[slots[s]]; target = mp[slots[s]];
        if (own) {
          tOwn = (meta[own.id] || {}).tier || 0; tNew = target && meta[target] ? meta[target].tier : -1;
          if (target && target !== own.id && tNew > tOwn && WD[target]) {
            pool.push({ kind: "weapon", id: target, from: own.id, upgrade: true,
              next: Math.max(1, Math.min((WD[target].maxLevel || 5), (own.level || 1) - 1)),
              title: WD[target].name, label: WD[own.id].name + " → " + WD[target].name,
              desc: WD[own.id].name + " grows into " + WD[target].name + ". " + (WD[target].summary || "") });
          } else if (own.level < ((WD[own.id] && WD[own.id].maxLevel) || 5)) {
            pool.push({ kind: "weapon", id: own.id, next: own.level + 1 });
          }
        } else if (target && WD[target]) {
          pool.push({ kind: "weapon", id: target, next: 1 });
        }
      }
      /* anything owned from before the pools existed can still be trained */
      for (id in owned) {
        if (!meta[id] && WD[id] && owned[id].level < (WD[id].maxLevel || 5)) pool.push({ kind: "weapon", id: id, next: owned[id].level + 1 });
      }
    } else if (data.WEAPONS) {
      for (id in data.WEAPONS) {
        if (!Object.prototype.hasOwnProperty.call(data.WEAPONS, id)) continue;
        def = data.WEAPONS[id];
        if (def.signature) continue;
        if (owned[id]) {
          if (owned[id].level < (def.maxLevel || 5)) {
            pool.push({ kind: "weapon", id: id, next: owned[id].level + 1 });
          }
        } else {
          pool.push({ kind: "weapon", id: id, next: 1 });
        }
      }
    } else {
      pool.push({ kind: "stat", id: "damageMul", next: 1 });
    }
    if (data.STAT_UPGRADES) {
      for (id in data.STAT_UPGRADES) {
        if (!Object.prototype.hasOwnProperty.call(data.STAT_UPGRADES, id)) continue;
        def = data.STAT_UPGRADES[id];
        var lv = (p.statLevels && p.statLevels[id]) || 0;
        if (lv < (def.maxLevel || 9)) {
          pool.push({ kind: "stat", id: id, next: lv + 1, title: def.name, desc: def.summary, label: "Lv " + lv + " → " + (lv + 1) });
        }
      }
    } else {
      pool.push({ kind: "stat", id: "damageMul", next: (p.statLevels && p.statLevels.damageMul || 0) + 1 });
      pool.push({ kind: "stat", id: "maxHpMul", next: (p.statLevels && p.statLevels.maxHpMul || 0) + 1 });
    }
    return pool;
  };

  Progression.prototype.rollOffers = function (p) {
    if (!p) return [];
    var pool = this._levelPool(p);
    var picks = [], i, k, rec, token;
    var copy = pool.slice();
    var sim = this.sim();
    var rng = sim && sim.rng ? sim.rng : Math.random;
    for (i = 0; i < 3 && copy.length; i++) {
      k = Math.floor(rng() * copy.length) % copy.length;
      /* a move that can evolve is always on the table */
      if (i === 0) { var u; for (u = 0; u < copy.length; u++) if (copy[u].upgrade) { k = u; break; } }
      rec = copy.splice(k, 1)[0];
      token = "off-" + (sim && sim.tick || 0) + "-" + p.id + "-" + i + "-" + Math.floor(rng() * 1e9);
      rec.token = token;
      rec.used = false;
      picks.push(rec);
    }
    p.levelOffers = picks;
    this.emit({ type: "level.offers", id: p.id, offers: picks, pending: p.pendingLevels || (sim && sim.pendingLevels) || 0 });
    return picks;
  };

  Progression.prototype._handlers.levelup = function (intent) {
    var p = this.player(intent.id);
    var sim = this.sim();
    if (!p || !sim) return { ok: false, reason: "no-player" };
    var pending = p.pendingLevels != null ? p.pendingLevels : sim.pendingLevels;
    if ((pending || 0) <= 0) return { ok: false, reason: "no-pending" };
    if (!(p.levelOffers && p.levelOffers.length)) this.rollOffers(p);
    var i, legal = null;
    if (!intent.token) {
      this.emit({ type: "rejected", reason: "forged-choice", kind: "missing-token" });
      return { ok: false, reason: "rejected" };
    }
    for (i = 0; i < (p.levelOffers || []).length; i++) {
      if (p.levelOffers[i].token === intent.token && !p.levelOffers[i].used) { legal = p.levelOffers[i]; break; }
    }
    if (!legal) {
      this.emit({ type: "rejected", reason: "forged-choice", kind: intent.token });
      return { ok: false, reason: "rejected" };
    }
    if (legal.kind === "weapon") {
      p.weapons = p.weapons || [];
      var found = false;
      if (legal.from) {
        /* the old move becomes the new one, in place */
        for (i = 0; i < p.weapons.length; i++) {
          if (p.weapons[i].id === legal.from) { p.weapons[i] = { id: legal.id, level: legal.next, cd: 0.1 }; found = true; }
        }
      }
      for (i = 0; i < p.weapons.length && !found; i++) {
        if (p.weapons[i].id === legal.id) { p.weapons[i].level = legal.next; found = true; }
      }
      if (!found) p.weapons.push({ id: legal.id, level: legal.from ? legal.next : 1, cd: 0.1 });
    } else {
      p.statLevels = p.statLevels || {};
      p.statLevels[legal.id] = legal.next;
      if (legal.id === "maxHp") {
        /* Vital Boost: more partner HP, and a small heal */
        var hpWas = p.maxHp || 1;
        p.maxHp = Math.round(hpWas * 1.16);
        p.hp = Math.min(p.maxHp, (p.hp || 0) + (p.maxHp - hpWas) + p.maxHp * 0.2);
      }
    }
    legal.used = true;
    p.levelOffers = [];
    p.pendingLevels = Math.max(0, (p.pendingLevels != null ? p.pendingLevels : sim.pendingLevels) - 1);
    sim.pendingLevels = p.id === sim.localId || !sim.localId ? p.pendingLevels : sim.pendingLevels;
    if (sim.pendingLevels > (p.pendingLevels || 0) && p.id === sim.localId) sim.pendingLevels = p.pendingLevels;
    if (p.id === sim.localId) sim.pendingLevels = p.pendingLevels;
    var pending = p.pendingLevels;
    if (pending > 0) this.rollOffers(p);
    this.emit({ type: "levelup", id: p.id, choice: legal, token: legal.token, pending: pending, offers: p.levelOffers || [] });
    if (pending <= 0) this._markBrawlDue(p);
    return { ok: true, choice: legal, token: legal.token, pending: pending, offers: p.levelOffers || [] };
  };

  /* ---------- Capture ---------- */
  Progression.prototype._handlers.capture = function (intent) {
    var p = this.player(intent.id);
    var sim = this.sim();
    if (!p || !sim) return { ok: false, reason: "no-run" };
    if (sim.phase && sim.phase !== "playing" && !this.allowDebugIntents) return { ok: false, reason: "not-playing" };
    var e = null, i;
    if (intent.enemyId != null) {
      for (i = 0; i < sim.enemies.length; i++) if (sim.enemies[i]._id === intent.enemyId) e = sim.enemies[i];
    }
    if (!e) {
      var best = null, bestD = 1e15, d;
      for (i = 0; i < sim.enemies.length; i++) {
        if (sim.enemies[i].dead || sim.enemies[i].virus) continue;
        d = Math.pow(sim.enemies[i].x - p.x, 2) + Math.pow(sim.enemies[i].y - p.y, 2);
        if (d < bestD) { bestD = d; best = sim.enemies[i]; }
      }
      e = best;
    }
    if (!e || e.dead) return { ok: false, reason: "No foe nearby" };
    var data = this.data;
    var cap = data.CAPTURE || { hpThreshold: 0.35, reserveMax: 3 };
    var def = (data.ENEMIES && data.ENEMIES[e.type]) || {};
    if (e.virus) return { ok: false, reason: "Infected Digimon can't be caught" };
    if (def.boss && !e.mega) return { ok: false, reason: "Can't capture bosses" };
    /* Catching: you must have defeated enough of this exact kind this run.
     * Then it is a flat, small chance, and the tally for that kind starts
     * over whether it works or not. */
    var need = data.captureKoNeeded ? data.captureKoNeeded(e) : 30;
    p.killsBy = p.killsBy || {};
    var have = p.killsBy[e.type] || 0;
    var nm = (data.SPECIES && data.SPECIES[e.type] && data.SPECIES[e.type].name) || (def && def.name) || e.type;
    if (have < need) {
      return { ok: false, reason: "Defeat " + (need - have) + " more " + nm, blocked: "charge", have: have, need: need };
    }
    p.killsBy[e.type] = 0;
    p.captureKills = 0;
    var chance = cap.chance != null ? cap.chance : 0.1;
    var roll = sim.rng ? sim.rng() : Math.random();
    var success = roll < chance;
    if (success) {
      e.dead = true;
      e.hp = 0;
      this._joinCaptured(p, sim, e.type);
    }
    this.emit({ type: "capture", id: p.id, ok: success, form: e.type, chance: chance, enemyId: e._id, x: e.x, y: e.y });
    return { ok: success, chance: chance, form: e.type };
  };

  Progression.prototype._joinCaptured = function (p, sim, form) {
    var cap = (this.data.CAPTURE && this.data.CAPTURE.reserveMax) || 3;
    var rec = { form: form, name: form };
    var sp = this.data.SPECIES && this.data.SPECIES[form];
    if (sp) rec.name = sp.name || form;
    p.partners = p.partners || [];
    if (!sim.ally) {
      var maxHp = Math.max(20, Math.round(((sp && sp.base && sp.base.maxHp) || 40) * 0.85));
      sim.ally = { form: form, x: p.x + 40, y: p.y - 20, hp: maxHp, maxHp: maxHp, facing: 1, weapon: { id: "pepperBreath", level: 1, cd: 0.25 }, invuln: 0.4 };
      if (sim._allyKit) sim._allyKit(sim.ally, true);
      p.partners.push(form);
      this.emit({ type: "ally.join", id: p.id, form: form, passive: sim.ally.passive });
    } else {
      p.reserve = p.reserve || [];
      if (p.reserve.length >= cap) this.emit({ type: "captureBank", id: p.id, form: form });
      else p.reserve.push(rec);
    }
  };

  /* ---------- Shop ---------- */
  Progression.prototype._handlers["shop.buy"] = function (intent) {
    var p = this.player(intent.id);
    var sim = this.sim();
    if (!p || !sim) return { ok: false, reason: "no-run" };
    var data = this.data;
    var item = data.shopItem ? data.shopItem(intent.item) : (data.SHOP && data.SHOP.catalog && catalogItem(data.SHOP.catalog, intent.item));
    if (!item) return { ok: false, reason: "unknown-item" };
    var farmOpen = sim.phase === "farm" || (sim.farm && sim.farm.active);
    var shopOk = farmOpen || (sim.merchant && sim.merchant.open) || merchantActive(sim, data);
    if (!shopOk) return { ok: false, reason: "Jijimon isn't here" };
    p.shopBought = p.shopBought || {};
    var bought = p.shopBought[item.id] || 0;
    /* 17z33: only what Jijimon has this visit, and only so many of it */
    var skey = data.shopKey ? data.shopKey(sim) : "none";
    if (data.shopStock && data.shopStock(skey, p.id).indexOf(item.id) < 0) return { ok: false, reason: "Not in stock this visit" };
    if (!p.shopVisit || p.shopVisit.key !== skey) p.shopVisit = { key: skey, n: {} };
    if (item.perVisit && (p.shopVisit.n[item.id] || 0) >= item.perVisit) return { ok: false, reason: "Sold out this visit" };
    var price = data.shopPrice ? data.shopPrice(item.id, bought) : (item.price || 0);
    if (item.kind === "key" && (p.items || []).indexOf(item.item || item.id) >= 0) {
      return { ok: false, reason: "Already owned" };
    }
    if (item.kind === "upgrade" && bought >= (item.max || 1)) return { ok: false, reason: "Maxed out" };   /* 17z33: Sprint Boots */
    if ((p.bits || 0) < price) return { ok: false, reason: "Need " + price + " Bits (have " + (p.bits || 0) + ")" };
    p.bits -= price;
    p.shopBought[item.id] = bought + 1;
    p.shopVisit.n[item.id] = (p.shopVisit.n[item.id] || 0) + 1;
    p.bag = p.bag || {};
    if (item.kind === "food") p.bag[item.food] = (p.bag[item.food] || 0) + (item.count || 3);
    else if (item.kind === "seed") p.bag[item.seed] = (p.bag[item.seed] || 0) + (item.count || 1);
    else if (item.id === "ticket") {                        /* a fresh training session, now */
      var FR = (data.FARM_CFG && data.FARM_CFG.fresh) || { start: 3 };
      p.trainFresh = (p.trainFresh == null ? (FR.start != null ? FR.start : 3) : p.trainFresh) + 1;
    }
    else if (item.kind === "consumable" || item.kind === "instant") p.bag[item.id] = (p.bag[item.id] || 0) + 1;
    else if (item.kind === "key") {
      p.items = p.items || [];
      var key = item.item || item.id;
      if (p.items.indexOf(key) < 0) p.items.push(key);
    }
    this.emit({ type: "shop", id: p.id, item: item.id, price: price, bits: p.bits });
    return { ok: true, item: item.id, price: price, bits: p.bits };
  };

  function catalogItem(list, id) {
    var i;
    for (i = 0; i < (list || []).length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function merchantActive(sim, data) {
    var S = data.SHOP;
    if (!S || !sim) return false;
    if (sim.time < (S.firstAt || 90)) return false;
    var cycle = (sim.time - S.firstAt) % (S.every || 90);
    return cycle < (S.linger || 20);
  }

  /* ---------- Farm ---------- */
  Progression.prototype._handlers["farm.enter"] = function (intent) {
    var p = this.player(intent.id);
    var sim = this.sim();
    if (!p || !sim) return { ok: false, reason: "no-run" };
    if (sim.phase === "brawl") {
      p.pendingFarm = true;
      return { ok: false, reason: "queued", queued: true };
    }
    var c = (this.data.FARM_CFG) || {};
    var stay = (c.stayCapSeconds || 45) + (sim._lab ? sim._lab(p).farm : 0) + (sim._gear ? sim._gear(p).farm : 0);
    if (c.onDemand) {
      /* Nov 20: the world does not stop. The tamer and partner step out of it (p.atFarm: nothing can
       * reach them, they reach nothing) and come back to the same spot. Not with enemies close. */
      /* already there only if a visit is really open; a PvP knock-out (pvp-sim.js) sets atFarm first and
       * sends you here, and used to stop at this line, so no visit opened, farm.return found none to
       * close and atFarm stayed on for good: partner frozen, invisible to friends (17z33) */
      if (p.atFarm && sim.farm && sim.farm.active) return { ok: true, already: true };
      if (!p.atFarm && sim._hostileNear && sim._hostileNear(p, c.blockRadius || 380)) return { ok: false, reason: "Enemies are too close" };
      p.atFarm = true;
      stay = 1e9;
    } else {
      sim.phase = "farm";
      if (D.weather) D.weather.clearPhase(sim, { data: this.data, phase: "farm" });
    }
    if (D.partyRules) D.partyRules.clearHold(sim);
    var scheduled = !!intent.scheduled;
    var R = rarityApi();
    var dueIn = R && R.farmDueIn ? R.farmDueIn(p, sim.time, c) : 1;
    /* A client may request enter; only a due (or already-pending) visit is scheduled. */
    if (scheduled && dueIn > 0.05 && !p.pendingFarm) scheduled = false;
    if (scheduled) {
      p.lastFarmAt = sim.time;
      p.farmVisitIndex = (p.farmVisitIndex || 0) + 1;
    }
    p.pendingFarm = false;
    if (sim.lifecycle) sim.lifecycle.pendingFarm = false;
    p.farmDueAt = R && R.farmDueAt ? R.farmDueAt(p, c) : ((p.lastFarmAt || 0) + 180);
    var yc = this._yardClamp(c, c.yardW ? c.yardW / 2 : 660, c.yardH ? c.yardH / 2 : 420);
    sim.farm = {
      active: true,
      since: sim.time || 0,                      /* 17z33: which visit (the shop's stock follows it) */
      scheduled: scheduled,
      x: yc.x, y: yc.y, mx: yc.x + ((c.follow && c.follow.gap) || 84), my: yc.y + 8,   /* 17z33: it waits a few steps off, so feeding means walking up to it */
      facing: 1, mfacing: -1, moving: false, monMoving: false,
      time: 0,
      stayLeft: stay,
      stayMax: stay,
      trained: false,
      trainCd: 0,
      fed: 0,
      petted: 0,
      refused: 0,
      usedItem: false,
      careMistake: false,
      hungryExit: false,
      activity: null
    };
    this.emit({ type: "farm.enter", id: p.id, scheduled: !!intent.scheduled, stay: stay });
    return { ok: true, stay: stay };
  };

  Progression.prototype._handlers["farm.tick"] = function (intent) {
    var sim = this.sim();
    var p = this.player(intent.id);
    if (!sim || !sim.farm || !sim.farm.active || !p) return { ok: false, reason: "no-farm" };
    var dt = intent.dt || sim.dt || 0.04;
    var inp = intent.inp || { x: 0, y: 0 };
    var farm = sim.farm;
    farm.time += dt;
    farm.stayLeft = Math.max(0, farm.stayLeft - dt);
    farm.trainCd = Math.max(0, farm.trainCd - dt);
    var c = this.data.CARE || {};
    var fc = this.data.FARM_CFG || {};
    var mult = fc.hungerDrainMult != null ? fc.hungerDrainMult : 0.05;
    p.fullness = Math.max(0, (p.fullness || 0) - (c.fullnessDecayPerSec || 1.05) * mult / (sim._lab ? sim._lab(p).belly : 1) * dt);
    if (sim._hungerCheck) sim._hungerCheck(p);                        /* the belly still counts at the farm */
    this._tickFarmYard(p, farm, dt, inp, fc);
    if (farm.activity) this._tickFarmActivity(p, farm, dt, inp);
    var R = rarityApi();
    if (R && R.tick) {
      var dx = (farm.x || 0) - (farm.mx || 0), dy = (farm.y || 0) - (farm.my || 0);
      p.time = sim.time;
      R.tick(p, dt, { dist: Math.sqrt(dx * dx + dy * dy), clock: sim._clock ? sim._clock() : p.clock, time: sim.time, silentHunger: false });
    }
    if (farm.stayLeft <= 0 && !fc.noTimeLimit) return this.act({ type: "farm.return", id: p.id, reason: "auto" });
    return { ok: true, farm: farm, fullness: p.fullness };
  };

  Progression.prototype._tickFarmActivity = function (p, farm, dt, inp) {
    var a = farm.activity;
    var st = ((this.data.FARM_CFG && this.data.FARM_CFG.stations) || {})[a.id];
    if (!st) { farm.activity = null; return; }
    if (a.mg) {
      MG().tick(a.mg, dt, inp, (this.sim() && this.sim().rng) || Math.random);
      a.t = a.mg.t;
      if (a.mg.kind === "lanes") { var lp = MG().lanesPos(a.mg); a.mx = lp.x; a.my = lp.y; if (Math.abs(lp.dx) > 1) farm.mfacing = lp.dx > 0 ? 1 : -1; }
      farm.mx = a.mx; farm.my = a.my;
      if (a.mg.done) this._finishTrain(p, farm);
      return;
    }
    a.t += dt;
    farm.mx = a.mx; farm.my = a.my;
    if (a.t >= a.dur) this._finishTrain(p, farm);
  };

  function trackGeom(data) {
    var c = (data && data.FARM_CFG) || {};
    var st = (c.stations || {}).track || {};
    var W = c.yardW || 1320, H = c.yardH || 820;
    var width = st.width != null ? st.width : 44;
    var inset = st.inset != null ? st.inset : 30;
    return {
      cx: st.cx != null ? st.cx : W / 2,
      cy: st.cy != null ? st.cy : H / 2,
      rx: st.rx != null ? st.rx : (W - 40) / 2 - inset - width / 2,
      ry: st.ry != null ? st.ry : (H - 60) / 2 - inset - width / 2,
      width: width,
      lapsTarget: st.lapsTarget != null ? st.lapsTarget : 1.25
    };
  }


  Progression.prototype._finishTrain = function (p, farm) {
    var a = farm.activity;
    if (!a) return { ok: false };
    var st = ((this.data.FARM_CFG && this.data.FARM_CFG.stations) || {})[a.id];
    farm.activity = null;
    if (!st) return { ok: false, reason: "no-station" };
    p.trainVisits = p.trainVisits || { bag: 0, board: 0, track: 0, bond: 0 };
    p.trainStats = p.trainStats || { offense: 0, intelligence: 0, agility: 0 };
    var FC = this.data.FARM_CFG || {}, FR = FC.fresh || { max: 3, start: 3 };
    /* 17z33: the gain is the station's, after repeats, tiredness, farm gates and a Protein Steak (minigames.js
     * preview), times how well the mini game went */
    var pv = MG().preview(FC, st, p);
    var score = a.mg ? MG().score(a.mg) : (a.score || 0.7), grade = MG().gradeOf(score);
    if (p.trainFresh == null) p.trainFresh = FR.start != null ? FR.start : 3;
    if (p.trainFresh > 0) { p.trainFresh -= 1; p.trainTired = 0; } else p.trainTired = (p.trainTired || 0) + 1;
    p.trainBoost = 0;
    var gain = Math.max(1, Math.round(pv.base * score));
    p.trainVisits[a.id] = pv.visits + 1;
    var before;
    if (st.stat === "bond") {
      before = p.bondTrain || 0;
      p.bondTrain = clamp(before + gain, 0, 100);
      p.happiness = clamp((p.happiness || 0) + Math.round(gain * 0.35), 0, 100);
    } else {
      before = p.trainStats[st.stat] || 0;
      p.trainStats[st.stat] = before + gain;
      p.happiness = clamp((p.happiness || 0) + (FC.trainJoy || 6) * 0.5, 0, 100);
    }
    farm.trained = true;
    farm.trainCd = FC.trainCooldown || 0;
    var next = MG().preview(FC, st, p);
    p.trainCount = (p.trainCount || 0) + 1;                  /* Story's training goal */
    this.emit({ type: "farm.train", id: p.id, station: a.id, gain: gain, stat: st.stat, before: before, after: before + gain,
      grade: grade.id, gradeLabel: grade.label, score: Math.round(score * 100) / 100, detail: a.mg ? MG().summary(a.mg) : "",
      base: Math.round(pv.base * 10) / 10, repeat: Math.round(pv.repeat * 100), fresh: pv.fresh, tired: Math.round(pv.tired * 100),
      gates: p.farmGates || 0, gateMul: Math.round(pv.gate * 100), boost: pv.boost > 1 ? pv.boost : 0, freshLeft: p.trainFresh, nextGreat: next.great });
    return { ok: true, gain: gain, stat: st.stat, grade: grade.id };
  };

  Progression.prototype._handlers["farm.trainStart"] = function (intent) {
    var p = this.player(intent.id);
    var sim = this.sim();
    if (!p || !sim || !sim.farm || !sim.farm.active) return { ok: false, reason: "no-farm" };
    if (sim.farm.activity) return { ok: false, reason: "busy" };
    if (sim.farm.trainCd > 0) return { ok: false, reason: "cooldown" };
    var st = ((this.data.FARM_CFG && this.data.FARM_CFG.stations) || {})[intent.station];
    if (!st) return { ok: false, reason: "no-station" };
    var FC = this.data.FARM_CFG || {};
    if (st.fullnessCost && (p.fullness || 0) < (FC.trainMinFull || 33)) return { ok: false, reason: "Too hungry to train: feed it first" };   /* 17z33: food is the stamina */
    if (st.fullnessCost) p.fullness = Math.max(0, (p.fullness || 0) - st.fullnessCost);
    /* 17z33: the punching bag, chalkboard and track are short mini games (net/minigames.js); play is as before */
    var mg = MG() && MG().KIND[st.id] ? MG().create(st.id, sim.rng || Math.random, st.id === "track" ? trackGeom(this.data) : null) : null;
    sim.farm.activity = {
      id: st.id, t: 0, dur: mg ? mg.dur : (st.timeCost || 6), hits: 0, score: mg ? 0 : 0.65, cheer: 0, mg: mg,
      mx: st.x + 28, my: st.y + 8
    };
    return { ok: true, activity: sim.farm.activity };
  };

  Progression.prototype._handlers["farm.trainInput"] = function (intent) {
    var sim = this.sim();
    var farm = sim && sim.farm;
    var a = farm && farm.activity;
    if (!a) return { ok: false, reason: "no-activity" };
    if (a.mg) {
      var r = MG().input(a.mg, intent.kind, intent.value, sim.rng || Math.random);
      if (!r) return { ok: false, reason: "bad-input" };
      if (a.mg.done) { var p = this.player(intent.id); if (p) this._finishTrain(p, farm); }
      return { ok: true, res: r };
    }
    if (a.id === "bond" && (intent.kind === "interact" || intent.kind === "confirm")) {
      a.cheer = (a.cheer || 0) + 1;
      a.score = Math.min(1.2, a.score + 0.08);
      return { ok: true, score: a.score };
    }
    return { ok: false, reason: "bad-input" };
  };

  Progression.prototype._handlers["farm.pet"] = function (intent) {
    var p = this.player(intent.id);
    var sim = this.sim();
    if (!p || !sim || !sim.farm || !sim.farm.active) return { ok: false, reason: "no-farm" };
    if (sim.farm.activity) return this.act({ type: "farm.trainInput", id: intent.id, kind: "interact" });
    var joy = (this.data.FARM_CFG && this.data.FARM_CFG.petJoy) || 8;
    p.happiness = clamp((p.happiness || 0) + joy, 0, (this.data.CARE && this.data.CARE.happinessMax) || 100);
    sim.farm.petted += 1;
    this.emit({ type: "farm.pet", id: p.id, joy: joy });
    return { ok: true, joy: joy };
  };

  /* One meal: off the bag, into the belly. Vegetables restore a little
   * health; a balanced diet (meat + veg) makes every meal count for more. */
  Progression.prototype._eat = function (p, kind, def) {
    p.bag[kind] -= 1;
    /* 17z33: favourite a third, ordinary a quarter, disliked a sixth (data.js foodFill) */
    var fill = this.data.foodFill ? this.data.foodFill(p.form, kind) : (def.fullness || 20);
    p.fullness = clamp((p.fullness || 0) + fill, 0, (this.data.CARE && this.data.CARE.fullnessMax) || 100);
    var simE = this.sim(); if (simE && simE._hungerCheck) simE._hungerCheck(p);   /* fed: back up to speed at once */
    p._lastFill = fill;
    p._disAte = !!(this.data.isDisliked && this.data.isDisliked(p.form, kind));
    if (p._disAte) p.happiness = clamp((p.happiness || 0) + ((this.data.CARE && this.data.CARE.dislikeJoy) || -3), 0, (this.data.CARE && this.data.CARE.happinessMax) || 100);
    p.happiness = clamp((p.happiness || 0) + (def.happiness || 4), 0, (this.data.CARE && this.data.CARE.happinessMax) || 100);
    p._favAte = !!(this.data.isFavourite && this.data.isFavourite(p.form, kind));      /* its favourite: a lot happier (17z33) */
    if (p._favAte) p.happiness = clamp(p.happiness + ((this.data.CARE && this.data.CARE.favJoy) || 12), 0, (this.data.CARE && this.data.CARE.happinessMax) || 100);
    p.foodEaten = (p.foodEaten || 0) + 1;
    p.foodCounts = p.foodCounts || {};
    p.foodCounts[kind] = (p.foodCounts[kind] || 0) + 1;
    var diet = this.data.dietOf ? this.data.dietOf(p.foodCounts) : null;
    var dcfg = this.data.DIET || {};
    if (diet && diet.balanced) p.happiness = clamp((p.happiness || 0) + (def.happiness || 4) * (dcfg.joyBonus || 0.5), 0, (this.data.CARE && this.data.CARE.happinessMax) || 100);
    /* 17z33: meals don't heal; a vegetable's lasting boost comes from foodCounts (data.js vegBoosts, mission-sim _stats) */
    p._rareFx = def.rare ? this._rareEat(p, kind, def) : null;
    return diet;
  };
  /* What a rare food (data.js FOOD, rare: true) does beyond filling the belly. Returns what happened. */
  Progression.prototype._rareEat = function (p, kind, def) {
    var sim = this.sim(), rng = (sim && sim.rng) || Math.random, out = { kind: kind }, keys, k;
    if (def.trainMul) { p.trainBoost = Math.max(p.trainBoost || 1, def.trainMul); out.trainBoost = p.trainBoost; }
    if (def.statUp) {
      p.trainStats = p.trainStats || { offense: 0, intelligence: 0, agility: 0 };
      keys = ["offense", "intelligence", "agility"]; k = keys[Math.floor(rng() * keys.length) % keys.length];
      p.trainStats[k] = (p.trainStats[k] || 0) + def.statUp;
      out.stat = k; out.statUp = def.statUp;
    }
    if (def.evoChance) { p.evoFruit = Math.max(p.evoFruit || 0, def.evoChance); out.evoFruit = true; }
    if (def.mistakes) { p.careMistakes = (p.careMistakes || 0) + def.mistakes; out.mistakes = def.mistakes; out.careMistakes = p.careMistakes; }
    if (kind === "golden_meat") out.full = true;
    if (kind === "sweet_nut") out.joy = true;
    return out;
  };

  /* Feeding in the middle of a battle: walk up to your Digimon and hand it
   * something from the bag. Instant; it keeps fighting. */
  /* the shiny moment (17z33): a few seconds where nothing can hurt the tamer or the partner, once per new shiny */
  /* 17z33: use a tool from Jijimon's stall out in the world. The Gate Key and the Treasure Map are spent here
   * (the screen opens the farm / marks the spires); a Lure calls a pack of the kind you're closest to catching. */
  Progression.prototype._handlers["bag.use"] = function (intent) {
    var p = this.player(intent.id), sim = this.sim(), item = String(intent.item || ""), C = this.data.CAPTURE || {}, best = null, bestR = -1, k, need, r, i, n, a, c, e, made = 0;
    if (!p || !sim) return { ok: false, reason: "no-run" };
    if (["gateKey", "lure", "map"].indexOf(item) < 0) return { ok: false, reason: "Can't use that here" };
    if (!(p.bag && p.bag[item] > 0)) return { ok: false, reason: "None left" };
    if (sim.farm && sim.farm.active) return { ok: false, reason: "Use it out in the world" };
    if (item === "lure") {
      for (k in (p.killsBy || {})) {
        if (!p.killsBy[k] || !(this.data.ENEMIES && this.data.ENEMIES[k]) || this.data.ENEMIES[k].boss) continue;
        need = this.data.captureKoNeeded ? this.data.captureKoNeeded(k) : 30;
        r = p.killsBy[k] / need;
        if (r > bestR) { bestR = r; best = k; }
      }
      if (!best) return { ok: false, reason: "Beat some wild Digimon first: the Lure calls the kind you've beaten most" };
      n = (C.lurePack || 6);
      for (i = 0; i < n; i++) {
        a = (Math.PI * 2 * i) / n + (sim.rng ? sim.rng() : Math.random()) * 0.5;
        c = sim._snap ? sim._snap(p.x + Math.cos(a) * 300, p.y + Math.sin(a) * 300, 12, 200) : { x: p.x + Math.cos(a) * 300, y: p.y + Math.sin(a) * 300 };
        e = sim.spawnEnemy ? sim.spawnEnemy(best, { x: c.x, y: c.y, keepType: true, quiet: true }) : null;
        if (e) made++;
      }
      if (!made) return { ok: false, reason: "Nothing came" };
    }
    p.bag[item] -= 1;
    this.emit({ type: "bag.use", id: p.id, item: item, kind: best, count: made });
    return { ok: true, item: item, kind: best, count: made };
  };
  /* throw something out of the bag (17z33, the I inventory): to make room for better food, say */
  /* Night Siege: rebuild a smashed egg at the nest, by day, for DigiCoins (siege-sim.js) */
  Progression.prototype._handlers["siege.repair"] = function (intent) {
    var p = this.player(intent.id);
    if (!p) return { ok: false, reason: "no-player" };
    var sim = this.sim();
    if (!sim || !sim._siegeRepair || !(sim.siege && sim.siege.nest)) return { ok: false, reason: "Not in Night Siege" };
    return sim._siegeRepair(p);
  };
  /* Night Siege: put up a piece of fence round the nest, by day, for wood and coins (siege-sim.js) */
  Progression.prototype._handlers["siege.build"] = function (intent) {
    var p = this.player(intent.id), sim = this.sim();
    if (!p) return { ok: false, reason: "no-player" };
    if (!sim || !sim._siegeBuild || !(sim.siege && sim.siege.nest)) return { ok: false, reason: "Not in Night Siege" };
    return sim._siegeBuild(p, intent.i);
  };
  Progression.prototype._handlers["bag.discard"] = function (intent) {
    var p = this.player(intent.id), item = String(intent.item || ""), n = Math.max(1, Math.floor(+intent.n || 1));
    if (!p) return { ok: false, reason: "no-player" };
    p.bag = p.bag || {};
    if (!(p.bag[item] > 0)) return { ok: false, reason: "None left" };
    n = Math.min(n, p.bag[item]);
    p.bag[item] -= n;
    this.emit({ type: "bag.discard", id: p.id, item: item, n: n, left: p.bag[item] || 0 });
    return { ok: true, item: item, n: n, left: p.bag[item] || 0 };
  };
  Progression.prototype._handlers["shiny.guard"] = function (intent) {
    var p = this.player(intent.id), sec = (this.data.SHINY && this.data.SHINY.guardSec) || 3.2;
    if (!p || !p.shiny || !p.shinyGuardDue) return { ok: false, reason: "no-shiny" };
    p.shinyGuardDue = 0;
    p.monInvuln = Math.max(p.monInvuln || 0, sec); p.tamerInvuln = Math.max(p.tamerInvuln || 0, sec);
    this.emit({ type: "shiny.guard", id: p.id, sec: sec });
    return { ok: true, sec: sec };
  };
  Progression.prototype._handlers["field.feed"] = function (intent) {
    var p = this.player(intent.id);
    var sim = this.sim();
    if (!p || !sim) return { ok: false, reason: "no-run" };
    if (sim.farm && sim.farm.active) return this.act({ type: "farm.feed", id: intent.id, food: intent.food });
    if (!(this.data.FARM_CFG && this.data.FARM_CFG.fieldFeed)) return { ok: false, reason: "Feed it at the farm" };   /* 17z33: meals are at the farm */
    if (sim.phase && sim.phase !== "playing") return { ok: false, reason: "Not now" };
    if (p.downed) return { ok: false, reason: "It is down" };
    var kind = intent.food;
    var def = this.data.FOOD && this.data.FOOD[kind];
    if (!def) return { ok: false, reason: "no-food" };
    p.bag = p.bag || {};
    if (!(p.bag[kind] > 0)) return { ok: false, reason: "None left" };
    if ((p.fullness || 0) >= ((this.data.CARE && this.data.CARE.fullRefuse) || 96)) return { ok: false, reason: "It's full!", full: true };
    /* no distance check: the tamer can feed from anywhere */
    var grudge = this._grudge(p, kind);
    var diet = this._eat(p, kind, def);
    this.emit({ type: "field.feed", id: p.id, food: kind, fullness: p.fullness, balanced: !!(diet && diet.balanced), fav: !!p._favAte, grudge: grudge });
    return { ok: true, food: kind, fullness: p.fullness, balanced: !!(diet && diet.balanced), fav: !!p._favAte, grudge: grudge };
  };

  /* 17z33 (Isaac): a partner never refuses food any more. A sulking one (rarity-sim shouldRefuseFeed: stubborn or
   * sulky after going hungry) eats grudgingly instead, and that grudging meal counts where a refusal used to
   * (refusedFoodCycles, once per hunger cycle), so the rare routes that need a sulky partner still open. */
  Progression.prototype._grudge = function (p, kind) {
    var fn = (this.data.rarity && this.data.rarity.shouldRefuseFeed) || (rarityApi() && rarityApi().shouldRefuseFeed);
    if (!fn || !fn(p)) return false;
    var cyc = p.starveCycles || 0;
    if (p.grudgeCycle !== cyc) { p.grudgeCycle = cyc; p.refusedFoodCycles = (p.refusedFoodCycles || 0) + 1; }
    p.refusedThisCycle = false;
    this.emit({ type: "farm.refuse", id: p.id, food: kind, grudge: true });      /* badges: Picky Eater */
    return true;
  };

  Progression.prototype._handlers["farm.feed"] = function (intent) {
    var p = this.player(intent.id);
    var sim = this.sim();
    if (!p || !sim || !sim.farm || !sim.farm.active) return { ok: false, reason: "no-farm" };
    if (sim.farm.activity) return { ok: false, reason: "busy" };
    var kind = intent.food;
    var def = this.data.FOOD && this.data.FOOD[kind];
    if (!def) return { ok: false, reason: "no-food" };
    p.bag = p.bag || {};
    if (!(p.bag[kind] > 0)) return { ok: false, reason: "empty" };
    if ((p.fullness || 0) >= ((this.data.CARE && this.data.CARE.fullRefuse) || 96)) return { ok: false, reason: "It's full!", full: true };
    var grudge = this._grudge(p, kind);
    var diet = this._eat(p, kind, def);
    sim.farm.fed += 1;
    this.emit({ type: "farm.feed", id: p.id, food: kind, fullness: p.fullness, balanced: !!(diet && diet.balanced), fav: !!p._favAte, dis: !!p._disAte, fill: p._lastFill, rare: p._rareFx || null, grudge: grudge });
    return { ok: true, food: kind, fullness: p.fullness, balanced: !!(diet && diet.balanced), fav: !!p._favAte, dis: !!p._disAte, fill: p._lastFill, rare: p._rareFx || null, grudge: grudge };
  };

  Progression.prototype._plotNear = function (sim, idx) {
    var plots = this.data.gardenPlots ? this.data.gardenPlots(this.data.FARM_CFG) : [];
    var pl = plots[idx];
    if (!pl) return null;
    var f = sim.farm || {};
    if (f.x != null && f.y != null) {
      var dx = Math.max(pl.x - f.x, 0, f.x - (pl.x + pl.w));
      var dy = Math.max(pl.y - f.y, 0, f.y - (pl.y + pl.h));
      if (Math.sqrt(dx * dx + dy * dy) > (pl.radius || 46) + 20) return null;
    }
    return pl;
  };

  Progression.prototype._handlers["farm.plant"] = function (intent) {
    var p = this.player(intent.id);
    var sim = this.sim();
    if (!p || !sim || !sim.farm || !sim.farm.active) return { ok: false, reason: "no-farm" };
    if (sim.farm.activity) return { ok: false, reason: "busy" };
    var idx = intent.plot | 0;
    if (!this._plotNear(sim, idx)) return { ok: false, reason: "far" };
    var seed = intent.seed;
    var crop = this.data.cropOfSeed ? this.data.cropOfSeed(seed) : null;
    var def = crop && this.data.CROPS && this.data.CROPS[crop];
    if (!def) return { ok: false, reason: "no-seed" };
    p.bag = p.bag || {};
    if (!(p.bag[seed] > 0)) return { ok: false, reason: "empty" };
    p.garden = p.garden || [];
    if (p.garden[idx] && p.garden[idx].crop) return { ok: false, reason: "occupied" };
    p.bag[seed] -= 1;
    p.garden[idx] = { crop: crop, plantedAt: sim.time, readyAt: sim.time + (def.growSec || 180) / (sim._lab ? sim._lab(p).crop : 1) / (sim._gear ? (sim._gear(p).crop || 1) : 1) };
    this.emit({ type: "farm.plant", id: p.id, plot: idx, crop: crop });
    return { ok: true, plot: idx, crop: crop };
  };

  Progression.prototype._handlers["farm.harvest"] = function (intent) {
    var p = this.player(intent.id);
    var sim = this.sim();
    if (!p || !sim || !sim.farm || !sim.farm.active) return { ok: false, reason: "no-farm" };
    if (sim.farm.activity) return { ok: false, reason: "busy" };
    var idx = intent.plot | 0;
    if (!this._plotNear(sim, idx)) return { ok: false, reason: "far" };
    var plot = p.garden && p.garden[idx];
    if (!plot || !plot.crop) return { ok: false, reason: "empty" };
    if (sim.time < plot.readyAt) return { ok: false, reason: "growing", left: plot.readyAt - sim.time };
    var def = (this.data.CROPS && this.data.CROPS[plot.crop]) || { yield: [1, 2] };
    var lo = def.yield ? def.yield[0] : 1, hi = def.yield ? def.yield[1] : 2;
    var rng = sim.rng || Math.random;
    var n = lo + Math.floor(rng() * (hi - lo + 1));
    p.bag = p.bag || {};
    p.bag[plot.crop] = (p.bag[plot.crop] || 0) + n;
    var crop = plot.crop;
    p.garden[idx] = null;
    this.emit({ type: "farm.harvest", id: p.id, plot: idx, crop: crop, n: n });
    return { ok: true, plot: idx, crop: crop, n: n };
  };

  Progression.prototype._handlers["farm.item"] = function (intent) {
    var p = this.player(intent.id);
    var sim = this.sim();
    if (!p || !sim || !sim.farm || !sim.farm.active) return { ok: false, reason: "no-farm" };
    var id = intent.item;
    if (id === "meat" || id === "fish" || id === "berry") return this.act({ type: "farm.feed", id: intent.id, food: id });
    p.bag = p.bag || {};
    if (!(p.bag[id] > 0) && id !== "digimental" && id !== "crest") return { ok: false, reason: "empty" };
    if (id !== "digimental" && id !== "crest") p.bag[id] -= 1;
    sim.farm.usedItem = true;
    var cap = this.data.CAPTURE || {};
    var care = this.data.CARE || {};
    var joyMax = care.happinessMax || 100;
    var effect = null;
    if (id === "atkBoost") {
      p.pendingAtkBoost = (p.pendingAtkBoost || 0) + (cap.atkBoostTime != null ? cap.atkBoostTime : 12);
      effect = "boost";
    } else if (id === "vitamin") {
      p.happiness = clamp((p.happiness || 0) + 16, 0, joyMax);
      p.bondTrain = (p.bondTrain || 0) + 12;
      effect = "vitamin";
    } else if (id === "joyToy") {
      p.happiness = clamp((p.happiness || 0) + (cap.toyJoy != null ? cap.toyJoy : 30), 0, joyMax);
      effect = "toy";
    } else if (id === "eraser") {
      p.careMistakes = Math.max(0, (p.careMistakes || 0) - 1);
      effect = "eraser";
    } else if (id === "medicine") {
      var frac = cap.medicineHeal != null ? cap.medicineHeal : 0.35;
      p.hp = Math.min(p.maxHp, (p.hp || 0) + p.maxHp * frac);
      if (p.tamerMaxHp) p.tamerHp = Math.min(p.tamerMaxHp, (p.tamerHp || 0) + p.tamerMaxHp * frac);
      if (p.faint > 0 && p.hp > 0) p.faint = 0;
      effect = "medicine";
    }
    this.emit({ type: "farm.item", id: p.id, item: id, effect: effect });
    return { ok: true, item: id, effect: effect };
  };

  Progression.prototype._handlers["farm.return"] = function (intent) {
    var p = this.player(intent.id);
    var sim = this.sim();
    if (!p || !sim || !sim.farm) return { ok: false, reason: "no-farm" };
    if (!sim.farm.active) return { ok: true, already: true, careMistake: !!sim.farm.careMistake, hungryExit: !!sim.farm.hungryExit };
    if (sim.farm.activity) this._finishTrain(p, sim.farm);
    var fc = this.data.FARM_CFG || {};
    var max = (this.data.CARE && this.data.CARE.fullnessMax) || 100;
    var ratio = fc.careMistakeFullnessRatio != null ? fc.careMistakeFullnessRatio : 0.3;
    var hungry = (p.fullness || 0) <= max * ratio;
    sim.farm.hungryExit = hungry;
    var mistake = hungry && sim.farm.fed <= 0 && sim.farm.refused <= 0;
    if (mistake) {
      p.careMistakes = (p.careMistakes || 0) + 1;
      p.happiness = Math.max(0, (p.happiness || 0) - (fc.careMistakeJoyHit != null ? fc.careMistakeJoyHit : 8));
      p.bondTrain = Math.max(0, (p.bondTrain || 0) - (fc.careMistakeBondHit != null ? fc.careMistakeBondHit : 6));
      sim.farm.careMistake = true;
    }
    var report = {
      type: "farm.return",
      id: p.id,
      reason: intent.reason || "ready",
      careMistake: !!mistake,
      hungryExit: !!hungry,
      fed: sim.farm.fed,
      refused: sim.farm.refused,
      seconds: sim.farm.time
    };
    var ignored = sim.farm.petted <= 0 && sim.farm.fed <= 0 && !sim.farm.trained;
    var R = rarityApi();
    if (R && R.onFarmCycle) {
      R.onFarmCycle({
        run: p,
        ignored: ignored,
        refusedFood: sim.farm.refused > 0,
        fed: sim.farm.fed > 0,
        seconds: sim.farm.time,
        event: "farm",
        careMistake: !!mistake,
        hungryExit: !!hungry
      });
    }
    sim.farm.active = false;
    if (p.atFarm) {
      /* back where you left, with a moment to get your bearings */
      p.atFarm = false;
      var shield = Math.max(fc.returnShield || 2, p.pvpShield || 0);   /* longer after being beaten by another tamer (pvp-sim.js) */
      p.pvpShield = 0;
      p.monInvuln = Math.max(p.monInvuln || 0, shield);
      p.tamerInvuln = Math.max(p.tamerInvuln || 0, shield);
    } else {
      sim.phase = "playing";
      if (D.weather) D.weather.resumePlaying(sim, { data: this.data });
    }
    if (p.pendingAtkBoost) {
      p.atkBoost = (p.atkBoost || 0) + p.pendingAtkBoost;
      p.pendingAtkBoost = 0;
    }
    this.emit(report);
    this._planResume(sim, p, 0.35);
    return { ok: true, careMistake: !!mistake, hungryExit: !!hungry, refused: sim.farm.refused };
  };

  /* ---------- Brawl: sim-owned fight, bets, revive, payouts ---------- */
  Progression.prototype._brawlApi = function () {
    return (this.data && this.data.net && this.data.net.brawl)
      || (D.net && D.net.brawl)
      || (typeof module === "object" && module.exports && (function () { try { return require("./brawl-sim.js"); } catch (e) { return null; } })());
  };

  Progression.prototype._handlers["brawl.begin"] = function (intent) {
    var sim = this.sim();
    if (this.data && this.data.BRAWL_OFF) return { ok: true, skipped: true, reason: "off", fighters: [] };
    var p = this.player(intent.id);
    if (!sim) return { ok: false, reason: "no-run" };
    var cap = 6;
    var roster = (intent.players || intent.fighters || []).slice(0, cap);
    var api = this._brawlApi();
    if (!api || !api.BrawlSim) return { ok: false, reason: "no-brawl-sim" };
    var coop = !!sim.coop;
    if (coop) {
      /* Online: one brawl for everyone. The roster is the tamers actually in
       * the run (not a client's list), tamers still standing fight, downed
       * ones bet, and a second "begin" joins the brawl already under way. */
      var cur = sim.brawlSim && sim.brawlSim.match;
      if (sim.phase === "brawl" && cur && !cur.settled) {
        return { ok: true, matchId: cur.matchId, fighters: sim.brawlSim.snapshot().fighters, phase: cur.phase, revivedId: cur.revivedId, snap: sim.brawlSim.snapshot() };
      }
      roster = this._rosterFromSim().slice(0, cap);
      if (!intent.origin && p) intent.origin = { x: p.x, y: p.y };
    }
    var matchId = intent.matchId || ("brawl-" + (sim.tick || 0) + "-" + (p && p.level || 0));
    var bsim = new api.BrawlSim({ data: this.data, rng: sim.rng });
    var match = bsim.begin({
      matchId: matchId,
      seed: sim.seed,
      origin: intent.origin,
      players: roster,
      aliveProvided: coop
    });
    sim.phase = "brawl";
    if (D.weather) D.weather.clearPhase(sim, { data: this.data, phase: "brawl" });
    if (D.partyRules) D.partyRules.clearHold(sim);
    sim.brawlSim = bsim;
    sim.brawl = bsim.snapshot();
    if (p) {
      p.lastBrawlLevel = p.level;
      p.pendingBrawl = false;
    }
    if (sim.lifecycle) sim.lifecycle.pendingBrawl = false;
    if (match.skipped) {
      sim.phase = "playing";
      this.emit({ type: "brawl.skipped", matchId: matchId });
      return { ok: true, skipped: true, matchId: matchId, fighters: sim.brawl.fighters, phase: "skipped" };
    }
    this.emit({ type: "brawl.begin", matchId: matchId, count: match.fighters.length, phase: match.phase, revivedId: match.revivedId });
    return { ok: true, matchId: matchId, fighters: sim.brawl.fighters, phase: match.phase, revivedId: match.revivedId, snap: sim.brawl };
  };

  Progression.prototype.pickRevive = function () {
    var sim = this.sim();
    if (sim && sim.brawlSim) return sim.brawlSim.pickRevive();
    return null;
  };

  Progression.prototype._handlers["brawl.bet"] = function (intent) {
    var sim = this.sim();
    if (!sim || !sim.brawlSim) return { ok: false, reason: "no-brawl" };
    var r = sim.brawlSim.placeBet(intent.id, intent.targetId);
    sim.brawl = sim.brawlSim.snapshot();
    return r;
  };

  Progression.prototype._handlers["brawl.ready"] = function (intent) {
    var sim = this.sim();
    if (!sim || !sim.brawlSim) return { ok: false, reason: "no-brawl" };
    var r = sim.brawlSim.ready();
    sim.brawl = sim.brawlSim.snapshot();
    return r;
  };

  /* Clients (including the host browser) may not nominate a winner or live set.
   * Conclude only syncs payouts already derived from the authoritative sim. */
  Progression.prototype._handlers["brawl.conclude"] = function (intent) {
    var sim = this.sim();
    var brawl = sim && (sim.brawlSim ? sim.brawlSim.match : sim.brawl);
    if (!brawl) return { ok: false, reason: "no-brawl" };
    if (intent && (intent.winnerId != null || intent.liveIds || intent.defeatedLegendary != null)) {
      this.emit({ type: "rejected", reason: "forged-winner", kind: "brawl.conclude" });
      return { ok: false, reason: "rejected" };
    }
    return this.concludeFromSim();
  };

  Progression.prototype.afterBrawlTick = function () {
    var sim = this.sim();
    if (!sim || !sim.brawlSim || !sim.brawlSim.match) return null;
    sim.brawl = sim.brawlSim.snapshot();
    var ev = sim.brawlSim.consumeEvents();
    var i;
    for (i = 0; i < ev.length; i++) this.emit(ev[i]);
    var m = sim.brawlSim.match;
    if (m.winnerId && !m.settled) return this.concludeFromSim();
    if (m.settled && sim.lifecycle && sim.lifecycle.brawlResultDur != null) {
      sim.lifecycle.brawlResultAt = (sim.lifecycle.brawlResultAt || 0) + (sim.dt || 0.04);
      if (sim.lifecycle.brawlResultAt >= sim.lifecycle.brawlResultDur) {
        this.endBrawlPhase();
      }
    }
    return sim.brawl;
  };

  Progression.prototype.concludeFromSim = function () {
    var sim = this.sim();
    var brawl = sim && sim.brawlSim && sim.brawlSim.match;
    if (!brawl) return { ok: false, reason: "no-brawl" };
    if (brawl.settled && this.settled[brawl.matchId]) {
      return { ok: true, already: true, payout: brawl.payout, winnerId: brawl.winnerId };
    }
    var winnerId = brawl.winnerId;
    if (!winnerId) {
      this.emit({ type: "rejected", reason: "no-sim-winner", kind: "brawl.conclude" });
      return { ok: false, reason: "no-sim-winner" };
    }
    var defeatedLegendary = false, i, f, tier;
    for (i = 0; i < brawl.fighters.length; i++) {
      f = brawl.fighters[i];
      if (f.id !== winnerId && (f.enteredFight || f.fighting || f.tier >= 5)) {
        tier = (this.data.tierOf && f.form) ? this.data.tierOf(f.form) : (f.tier || 1);
        if (tier >= 5) defeatedLegendary = true;
      }
    }
    var payout = this._settle(brawl, winnerId, defeatedLegendary);
    brawl.payout = payout;
    brawl.settled = true;
    if (sim.brawl) { sim.brawl.payout = payout; sim.brawl.settled = true; sim.brawl.winnerId = winnerId; }
    /* Stay in brawl phase until the authority presentation timer elapses
     * (or the client dismisses after payout). UI cannot author the resume. */
    var bcfg = (this.data && this.data.BRAWL) || {};
    sim.lifecycle = sim.lifecycle || {};
    sim.lifecycle.brawlResultAt = 0;
    sim.lifecycle.brawlResultDur = (bcfg.resultSeconds != null ? bcfg.resultSeconds : 3.2) + (bcfg.payoutSeconds != null ? bcfg.payoutSeconds : 3.6);
    this.emit({ type: "brawl.payout", matchId: brawl.matchId, winnerId: winnerId, payout: payout });
    return { ok: true, payout: payout, winnerId: winnerId };
  };

  Progression.prototype.endBrawlPhase = function () {
    var sim = this.sim();
    if (!sim) return { ok: false, reason: "no-run" };
    if (sim.phase !== "brawl") return { ok: true, already: true, pendingFarm: !!(sim.players[0] && sim.players[0].pendingFarm) };
    var brawl = sim.brawlSim && sim.brawlSim.match;
    if (brawl && !brawl.settled) return { ok: false, reason: "unsettled" };
    sim.phase = "playing";
    if (sim.lifecycle) {
      sim.lifecycle.brawlResultDur = null;
      sim.lifecycle.brawlResultAt = 0;
    }
    if (D.partyRules) D.partyRules.resetRoundCharge(sim);
    if (D.weather) D.weather.resumePlaying(sim, { data: this.data });
    var p = sim.players[0];
    this._planResume(sim, p, 0.2);
    this.emit({ type: "brawl.ended", pendingFarm: !!(p && p.pendingFarm), pendingBrawl: !!(p && p.pendingBrawl) });
    return { ok: true, pendingFarm: !!(p && p.pendingFarm) };
  };

  Progression.prototype._settle = function (brawl, winnerId, defeatedLegendary) {
    if (this.settled[brawl.matchId]) return brawl.payout;
    var cfg = payoutCfg(this.data);
    var awards = [];
    var localId = this.sim() && this.sim().localId;
    awards.push({ id: winnerId, reason: "win", amount: cfg.winReward, local: winnerId === localId });
    var correct = [], i, f;
    for (i = 0; i < brawl.fighters.length; i++) {
      f = brawl.fighters[i];
      if (!f.fighting && f.betOn && f.betOn === winnerId) correct.push(f.id);
    }
    if (correct.length && cfg.betPool > 0) {
      var share = Math.max(cfg.minBetPayout, Math.floor(cfg.betPool / correct.length));
      for (i = 0; i < correct.length; i++) {
        awards.push({ id: correct[i], reason: "bet", amount: share, local: correct[i] === localId });
      }
    }
    var drop = [];
    if (defeatedLegendary && winnerId === localId && !this.account.legendaryDropped) {
      drop = ["title-boundless", "digivice-omen", "farm-unseen"];
      var d;
      for (d = 0; d < drop.length; d++) this.account.unlocked[drop[d]] = true;
      this.account.legendaryDropped = true;
    }
    for (i = 0; i < awards.length; i++) {
      if (awards[i].local) this.account.digiBits = Math.max(0, this.account.digiBits + awards[i].amount);
    }
    this.settled[brawl.matchId] = true;
    var payout = {
      matchId: brawl.matchId,
      currency: cfg.name,
      awards: awards,
      localBits: this.account.digiBits,
      legendaryDrop: drop,
      mysterious: drop.length > 0
    };
    this.commitAccount();
    return payout;
  };

  function payoutCfg(data) {
    var c = (data && data.DIGIBITS) || {};
    return {
      name: c.name || "DigiCoins",
      winReward: c.winReward != null ? c.winReward : 8,
      betPool: c.betPool != null ? c.betPool : 6,
      minBetPayout: c.minBetPayout != null ? c.minBetPayout : 1
    };
  }

  /* Called from the sim tick: hatch timer + auto-evolve. */
  Progression.prototype.tickPlaying = function (p, dt) {
    if (!p) return;
    var vsim = this.sim();
    if (vsim && vsim._vsEvo && vsim._mode && vsim._mode() === "versus" && vsim.vs) { vsim._vsEvo(p, this); return; }   /* Versus: the meter decides (versus-sim.js) */
    if (vsim && vsim._duelSetup && vsim._mode && vsim._mode() === "duel" && vsim.vs) { vsim._duelSetup(p, this); return; }   /* Duel: as it is, no digivolving */
    if (this._isEgg(p.form)) {
      p.hatchLeft = Math.max(0, (p.hatchLeft == null ? ((this.data.HATCH && this.data.HATCH.time) || 20) : p.hatchLeft) - dt);
      if (p.hatchLeft <= 0) this.act({ type: "hatch", id: p.id });
    } else {
      if (p.evoLock > 0) p.evoLock = Math.max(0, p.evoLock - dt);
      if ((p.evoLock || 0) > 0) return;
      var sim = this.sim();
      /* With a tamer at the controls the partner asks first; CPU partners
       * and anyone who has stepped away just digivolve. */
      if (!sim || !sim.evoChoice || p.kind === "cpu" || p.away || p.hasTamer === false) { this.act({ type: "evolve", id: p.id }); return; }
      if (p.evoOffer || p.downed) return;
      if ((p.level || 1) < (p.evoHoldUntil || 0)) return;
      p._evoPoll = (p._evoPoll || 0) - dt;
      if (p._evoPoll > 0) return;
      p._evoPoll = 0.5;
      var pick = this.data.pickEvolution ? this.data.pickEvolution(p.form, this._evoStats(p)) : null;
      if (pick && pick.to && pick.to !== p.form) {
        p.evoOffer = { n: (p.evoOfferN = (p.evoOfferN || 0) + 1), holds: p.formHolds || 0 };
        this.emit({ type: "evo.offer", id: p.id });
      }
    }
  };

  Progression.prototype.afterPlayingTick = function (dt) {
    var sim = this.sim();
    if (!sim) return;
    var i, p;
    for (i = 0; i < sim.players.length; i++) {
      p = sim.players[i];
      this.tickPlaying(p, dt);
      if (this.data.DNA && (p.dna || p.dnaOffer)) this._tickDna(p);
      if ((p.pendingLevels || 0) > 0 && !(p.levelOffers && p.levelOffers.length)) this.rollOffers(p);
      this._tickLifecycle(p, dt);
    }
    this._advanceResume(dt);
  };


  Progression.prototype._yardClamp = function (fc, x, y) {
    var w = (fc && fc.yardW) || 1320, h = (fc && fc.yardH) || 820;
    var x0 = 40, y0 = 60, x1 = w - 40, y1 = h - 40;
    function cl(v, a, b) { return v < a ? a : v > b ? b : v; }
    return { x: cl(x, x0, x1), y: cl(y, y0, y1) };
  };

  Progression.prototype._tickFarmYard = function (p, farm, dt, inp, fc) {
    if (farm && farm.activity && farm.activity.mg && farm.activity.mg.kind === "lanes") { farm.moving = false; return; }   /* the stick switches the partner's lane */
    var speed = ((this.data && this.data.TAMER && this.data.TAMER.speed) || 168);
    inp = inp || { x: 0, y: 0 };
    var nx = (farm.x || 0) + (inp.x || 0) * speed * dt;
    var ny = (farm.y || 0) + (inp.y || 0) * speed * dt;
    var cl = this._yardClamp(fc, nx, ny);
    farm.x = cl.x; farm.y = cl.y;
    farm.moving = Math.abs(inp.x || 0) + Math.abs(inp.y || 0) > 0.12;
    if (inp.x > 0.15) farm.facing = 1;
    else if (inp.x < -0.15) farm.facing = -1;
    /* which way the hologram walks: up, down or sideways (the run uses the same rule) */
    if (farm.moving) farm.tdir = Math.abs(inp.y || 0) > Math.abs(inp.x || 0) + 0.05 ? (inp.y > 0 ? "down" : "up") : "side";
    if (!farm.activity) {
      /* 17z33 (Isaac): it hangs back (data.js farmFollow), so feeding means walking up to it */
      var fol = this.data.farmFollow(farm.x, farm.y + 8, farm.mx == null ? farm.x - 84 : farm.mx, farm.my == null ? farm.y : farm.my, dt, fc);
      farm.mx = fol.mx; farm.my = fol.my;
      if (fol.moving) {
        farm.monMoving = true;
        if (farm.mx < farm.x - 4) farm.mfacing = 1;
        else if (farm.mx > farm.x + 4) farm.mfacing = -1;
      } else farm.monMoving = false;
    }
  };

  Progression.prototype._recordDiscovery = function (p, fromId, toId, kind) {
    var R = rarityApi();
    var acc = this.account;
    /* Online: a friend's evolutions never write into the host's save. */
    var simD = this.sim();
    if (simD && simD.coop && p && p.id && p.id !== simD.localId) return false;
    acc.discoveries = (R && R.normalizeDiscoveries) ? R.normalizeDiscoveries(acc.discoveries) : (acc.discoveries || { species: {}, edges: {} });
    acc.settledDiscoveries = acc.settledDiscoveries || {};
    var key = (R && R.discoveryKey) ? R.discoveryKey(fromId, toId, kind) : ("disc:" + (fromId || "") + ">" + (toId || "") + ":" + (kind || "standard"));
    var sim = this.sim();
    var at = sim ? Math.round((sim.time || 0) * 1000) / 1000 : 0;
    var tierFn = (this.data && this.data.tierOf) || (D.tierOf);
    var changed = false;
    if (R && R.noteDiscovery) {
      changed = R.noteDiscovery(acc, fromId, toId, { kind: kind || "standard", at: at }, at, tierFn);
    } else if (toId && !(acc.discoveries.species && acc.discoveries.species[toId])) {
      acc.discoveries.species = acc.discoveries.species || {};
      acc.discoveries.species[toId] = { at: at, from: fromId || "" };
      changed = true;
    }
    if (acc.settledDiscoveries[key] && !changed) return false;
    if (changed) {
      acc.settledDiscoveries[key] = true;
      this.emit({ type: "discover", id: p && p.id, from: fromId, to: toId, kind: kind || "standard", at: at, key: key });
      this.commitAccount();
    } else {
      acc.settledDiscoveries[key] = true;
    }
    return changed;
  };

  Progression.prototype._checkUnlocks = function (p) {
    var data = this.data;
    if (!p || !data || !data.SPECIES) return;
    var simU = this.sim();
    if (simU && simU.coop && p.id !== simU.localId) return;
    p.formsReached = p.formsReached || {};
    this.account.speciesUnlocks = this.account.speciesUnlocks || {};
    var id, sp, u, granted = [];
    for (id in data.SPECIES) {
      if (!Object.prototype.hasOwnProperty.call(data.SPECIES, id)) continue;
      sp = data.SPECIES[id];
      if (!sp.unlock || this.account.speciesUnlocks[id]) continue;
      u = sp.unlock;
      if (u.type === "evolveTo" && p.formsReached[u.form]) {
        this.account.speciesUnlocks[id] = true;
        granted.push({ id: id, reason: "evolved" });
      } else if (u.alsoTime && (p.time || (this.sim() && this.sim().time) || 0) >= u.alsoTime) {
        this.account.speciesUnlocks[id] = true;
        granted.push({ id: id, reason: "time" });
      }
    }
    var i;
    for (i = 0; i < granted.length; i++) {
      this.emit({ type: "unlock", id: p.id, form: granted[i].id, reason: granted[i].reason });
    }
    if (granted.length) this.commitAccount();
    return granted;
  };

  /* Replay a previously emitted discover/unlock without duplicating persist. */
  Progression.prototype.applyAccountEvent = function (ev) {
    if (!ev) return { ok: false, reason: "empty" };
    if (ev.type === "discover") {
      var again = this._recordDiscovery({ id: ev.id }, ev.from, ev.to, ev.kind);
      return { ok: true, changed: !!again, already: !again };
    }
    if (ev.type === "unlock") {
      this.account.speciesUnlocks = this.account.speciesUnlocks || {};
      if (this.account.speciesUnlocks[ev.form]) return { ok: true, already: true, changed: false };
      this.account.speciesUnlocks[ev.form] = true;
      this.commitAccount();
      return { ok: true, changed: true };
    }
    return { ok: false, reason: "unsupported" };
  };

  Progression.prototype._markBrawlDue = function (p) {
    var sim = this.sim();
    if (!p || !sim) return false;
    if (sim.noBrawl || (this.data && this.data.BRAWL_OFF)) return false; /* brawls are off (data.js BRAWL_OFF) */
    if (!(p.hp > 0)) return false; /* a partner that is down cannot call a brawl */
    var R = rarityApi();
    var cfg = (this.data && this.data.BRAWL) || {};
    var party = 1;
    if (R && R.partyCount) party = R.partyCount(sim, p, cfg);
    else party = (sim.players.length || 1) + ((sim.cpus && sim.cpus.length) || 0);
    var due = R && R.shouldBrawl
      ? R.shouldBrawl(p, { BRAWL: cfg, data: this.data, partyCount: party })
      : false;
    if (!due) return false;
    if (p.pendingBrawl) return true;
    p.pendingBrawl = true;
    sim.lifecycle = sim.lifecycle || {};
    sim.lifecycle.pendingBrawl = true;
    this.emit({ type: "brawl.due", id: p.id, level: p.level });
    if ((p.pendingLevels || 0) <= 0) this._planResume(sim, p, 0.4);
    return true;
  };

  Progression.prototype._markFarmDue = function (p) {
    var sim = this.sim();
    if (!p || !sim || sim.phase !== "playing") return false;
    if (this.data.FARM_CFG && this.data.FARM_CFG.onDemand) return false;      /* you go when you choose (Nov 20) */
    if (sim.farm && sim.farm.active) return false;
    var R = rarityApi();
    var cfg = (this.data && this.data.FARM_CFG) || {};
    var dueIn = R && R.farmDueIn ? R.farmDueIn(p, sim.time, cfg) : 1e9;
    p.farmDueAt = R && R.farmDueAt ? R.farmDueAt(p, cfg) : ((p.lastFarmAt || 0) + 180);
    if (dueIn > 0) return false;
    if (p.pendingFarm) return true;
    p.pendingFarm = true;
    sim.lifecycle = sim.lifecycle || {};
    sim.lifecycle.pendingFarm = true;
    this.emit({ type: "farm.due", id: p.id, at: p.farmDueAt, visit: p.farmVisitIndex || 0, time: sim.time });
    this._planResume(sim, p, 0.4);
    return true;
  };

  Progression.prototype._tickLifecycle = function (p, dt) {
    var sim = this.sim();
    if (!p || !sim || sim.phase !== "playing") return;
    this._checkUnlocks(p);
    this._markFarmDue(p);
    if ((p.pendingLevels || 0) <= 0) this._markBrawlDue(p);
    if (this.data && this.data.FARM_CFG && this.data.FARM_CFG.onDemand) return;
    var marks = ((this.data && this.data.FARM_CFG && this.data.FARM_CFG.warnAt) || [15, 5]);
    var R = rarityApi();
    var left = R && R.farmDueIn ? R.farmDueIn(p, sim.time, this.data && this.data.FARM_CFG) : 1e9;
    p.farmWarns = p.farmWarns || {};
    var key = String(p.farmVisitIndex || 0);
    var fired = p.farmWarns[key] || {};
    var i, m;
    for (i = 0; i < marks.length; i++) {
      m = marks[i];
      if (left <= m && left > 0 && !fired[m]) {
        fired[m] = true;
        p.farmWarns[key] = fired;
        this.emit({ type: "farm.warn", id: p.id, seconds: m, left: left });
      }
    }
  };

  Progression.prototype._planResume = function (sim, p, delay) {
    if (!sim) return;
    sim.lifecycle = sim.lifecycle || {};
    var next = "playing";
    if (p && p.pendingBrawl) next = "brawl";
    else if (p && p.pendingFarm) next = "farm";
    sim.lifecycle.resume = { next: next, t: 0, delay: delay != null ? delay : 0.3 };
    this.emit({ type: "lifecycle.resume", next: next, delay: sim.lifecycle.resume.delay });
  };

  Progression.prototype._advanceResume = function (dt) {
    var sim = this.sim();
    if (!sim || !sim.lifecycle || !sim.lifecycle.resume) return;
    if (sim.phase !== "playing") return;
    var r = sim.lifecycle.resume;
    r.t = (r.t || 0) + dt;
    if (r.t < (r.delay || 0)) return;
    var p = sim.players[0];
    if (p && ((p.pendingLevels || 0) > 0 || (p.evoLock || 0) > 0.05)) return;
    sim.lifecycle.resume = null;
    if (r.next === "brawl") this._startDueBrawl(p);
    else if (r.next === "farm") this._startDueFarm(p);
  };

  Progression.prototype._startDueFarm = function (p) {
    var sim = this.sim();
    if (!sim || sim.phase !== "playing") return { ok: false, reason: "busy" };
    if (!p || !p.pendingFarm) return { ok: false, reason: "not-due" };
    return this.act({ type: "farm.enter", id: p.id, scheduled: true });
  };

  Progression.prototype._rosterFromSim = function () {
    var sim = this.sim();
    if (!sim) return [];
    var out = [], i, p, c;
    for (i = 0; i < sim.players.length; i++) {
      p = sim.players[i];
      out.push({
        id: p.id, name: p.name || p.id, form: p.form, hp: p.hp, maxHp: p.maxHp,
        level: p.level, hasTamer: !!p.hasTamer, kind: p.kind || "client",
        local: p.id === sim.localId, color: p.color,
        alive: !p.downed && !p.away && !(this.data.SPECIES && this.data.SPECIES[p.form] && this.data.SPECIES[p.form].hatchTo)
      });
    }
    for (i = 0; i < (sim.cpus || []).length; i++) {
      c = sim.cpus[i];
      out.push({
        id: c.id, name: c.name || c.id, form: c.form, hp: c.hp, maxHp: c.maxHp,
        hasTamer: false, kind: "bot", local: false, alive: c.hp > 0
      });
    }
    return out;
  };

  Progression.prototype._startDueBrawl = function (p) {
    var sim = this.sim();
    if (!sim || sim.phase !== "playing") return { ok: false, reason: "busy" };
    if (!p || !p.pendingBrawl) return { ok: false, reason: "not-due" };
    var roster = this._rosterFromSim();
    if (roster.length < 2) {
      var cfg = (this.data && this.data.BRAWL) || {};
      if ((cfg.soloMode || "skip") !== "bonus") {
        p.pendingBrawl = false;
        if (sim.lifecycle) sim.lifecycle.pendingBrawl = false;
        this.emit({ type: "brawl.skipped", reason: "solo" });
        if (p.pendingFarm) this._planResume(sim, p, 0.15);
        return { ok: true, skipped: true };
      }
    }
    return this.act({ type: "brawl.begin", id: p.id, players: roster });
  };

  Progression.prototype._handlers["brawl.dismiss"] = function (intent) {
    var sim = this.sim();
    var brawl = sim && sim.brawlSim && sim.brawlSim.match;
    if (!brawl) return { ok: false, reason: "no-brawl" };
    if (!brawl.settled) return { ok: false, reason: "unsettled" };
    return this.endBrawlPhase();
  };

  Progression.prototype._handlers["lifecycle.ack"] = function (intent) {
    var sim = this.sim();
    if (!sim) return { ok: false, reason: "no-run" };
    /* Presentation ack only; cannot invent a due or skip an unsettled brawl. */
    if (sim.lifecycle && sim.lifecycle.resume) sim.lifecycle.resume.delay = 0;
    return { ok: true, resume: sim.lifecycle && sim.lifecycle.resume };
  };

  var api = { Progression: Progression, INTENTS: INTENTS, FORGED: FORGED, trackGeom: trackGeom };
  D.net = D.net || {};
  D.net.progression = api;
  if (isNode) module.exports = api;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
