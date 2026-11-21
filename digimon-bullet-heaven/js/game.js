/* Digi Night (was Digimon Bullet Heaven) — engine, combat, care, and screens. */
(function (global) {
  "use strict";

  var D = global.DBH;
  var canvas, ctx, viewW = 1280, viewH = 720;
  var state = "title";
  var run = null;
  var camX = 0, camY = 0, shake = 0;
  var enemies = [];
  var patches = [];            /* fire, puddles, ice and goo on the ground (data.js STATUS) */
  var fronts = [], terrSeen = "", warToastT = -99;
  var nemList = null;          /* nemeses: [id, x, y, tier, title, form, level] */
  var nestList = [];           /* the nests near us (nest-sim.js): [x, y, biome, count, cap, kind] */   /* biome wars (war-sim.js): contested cells, the territory last applied */
  var bullets = [];
  var orbs = [];
  var particles = [];
  var floats = [];
  var arcs = [];
  var lastT = 0;
  var selectedStarter = "agumon";
  var selectedTamer = "byte";
  var selectedEgg = "agumon";
  var selectedCpuBots = 0;
  var selectedMode = "open";   /* run modes (data.js MODES, modes-sim.js): open / survival / ranked / weekly */
  var menuItems = [];
  var menuIndex = 0;
  var pendingLevels = 0;
  var missionAuth = null, missionAcc = 0, missionSeq = 0, missionLocalId = "local";
  var ultShake = null;   /* a Mega ultimate on its way: the big shake when it goes off */
  var hpLag = null;   /* the partner's over-head health bar: where the white "just lost" chunk has drained to */
  var missionEvents = [];
  function online() { return (D.online && D.online.active && D.online.active()) ? D.online : null; }
  var evoTimer = 0;
  var evoInfo = null;
  var muted = false;
  var audioCtx = null;
  var debug = false;
  var cleanHud = false;
  var helpOn = false;
  var save = { eggKills: {}, eggUnlocks: {}, unlocks: {}, bestTime: 0, bestForm: "", digibank: [], bankDeploy: null, discoveries: { species: {}, edges: {} } };
  var bankCursor = 0;
  var shopTab = "all";
  var shopReturnState = "playing";
  var shopFlashId = null;
  var bankConfirming = false;
  var reducedFx = false;
  var partPool = [];
  var evoFlash = 0;
  var titleTime = 0;
  var fps = 60;
  var fpsAccum = 0;
  var fpsFrames = 0;
  var FX_KEY = "dbh_reduced_fx";

  var el = {};

  function $(id) { return document.getElementById(id); }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  function dist2(ax, ay, bx, by) {
    var dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  }

  function len(x, y) { return Math.sqrt(x * x + y * y); }

  function norm(x, y) {
    var l = len(x, y);
    if (l < 0.0001) return { x: 0, y: 0 };
    return { x: x / l, y: y / l };
  }

  function hash(ix, iy) {
    var n = (ix * 374761393 + iy * 668265263) | 0;
    n = (n ^ (n >>> 13)) * 1274126177;
    return (n >>> 0) / 4294967296;
  }

  function actorRad(id) {
    var def = (D.SPECIES && D.SPECIES[id]) || (D.ENEMIES && D.ENEMIES[id]) || {};
    var base = def.radius || 12;
    if (D.sprites && D.sprites.bodyRadius) return D.sprites.bodyRadius(id, base);
    var sc = (D.sprites && D.sprites.officialScale) ? D.sprites.officialScale(id) : 1;
    return Math.max(6, Math.round(base * sc));
  }

  /* cross: 0 walks, 1 swims, 2 flies (biomes.js crossOf) */
  function slideMove(x, y, dx, dy, rad, cross) {
    if (D.world && D.world.moveSlide) return D.world.moveSlide(x, y, dx, dy, rad, cross);
    return { x: x + dx, y: y + dy };
  }

  function crossOf(id) { return D.biomes && D.biomes.crossOf ? D.biomes.crossOf(id) : 0; }
  /* a flying or swimming partner goes out over the water, but stays within LIVING.leash of the tamer there */
  function partnerSlide(dx, dy) {
    var cr = crossOf(run.form), pos = slideMove(run.mx, run.my, dx, dy, actorRad(run.form), cr), L = (D.LIVING && D.LIVING.leash) || 220, dn, dO;
    if (cr && D.world && D.world.openWaterAt && (D.world.openWaterAt(pos.x, pos.y) || (D.world.hazardNear && D.world.hazardNear(pos.x, pos.y, 2)))) {
      dn = dist2(pos.x, pos.y, run.x, run.y); dO = dist2(run.mx, run.my, run.x, run.y);
      if (dn > L * L && dn > dO) return { x: run.mx, y: run.my };
    }
    return pos;
  }

  function isWalkable(x, y, rad) {
    if (D.world && D.world.isRaised) return !D.world.isRaised(x, y, rad);
    return true;
  }

  function snapWalkable(x, y, rad, maxR, cross) {
    if (D.world && D.world.nearestWalkable) return D.world.nearestWalkable(x, y, maxR || 240, rad == null ? 8 : rad, cross);
    return { x: x, y: y };
  }

  function formatTime(t) {
    var s = Math.floor(t);
    var m = Math.floor(s / 60);
    s = s % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  /* ---------- Save ---------- */
  function applyProfile(parsed) {
    if (parsed && typeof parsed === "object") {
      save.unlocks = parsed.unlocks || {};
      save.eggKills = (parsed.eggKills && typeof parsed.eggKills === "object") ? parsed.eggKills : {};
      save.eggUnlocks = (parsed.eggUnlocks && typeof parsed.eggUnlocks === "object") ? parsed.eggUnlocks : {};
      save.bestTime = parsed.bestTime || 0;
      save.bestForm = parsed.bestForm || "";
      save.digibank = Array.isArray(parsed.digibank) ? parsed.digibank : [];
      save.bankDeploy = parsed.bankDeploy || null;
      save.memories = (parsed.memories && typeof parsed.memories === "object") ? parsed.memories : {};
      save.trophies = Array.isArray(parsed.trophies) ? parsed.trophies : [];
      save.items = (parsed.items && typeof parsed.items === "object") ? parsed.items : {};
      save.hub = (parsed.hub && typeof parsed.hub === "object") ? parsed.hub : {};          /* what the hub remembers: eggs seen, the rival score */
      save.discoveries = (D.rarity && D.rarity.normalizeDiscoveries)
        ? D.rarity.normalizeDiscoveries(parsed.discoveries)
        : (parsed.discoveries || { species: {}, edges: {} });
    }
  }

  function loadSave() {
    if (!D.storage) return Promise.resolve();
    return D.storage.loadProfile().then(applyProfile);
  }

  function writeSave() {
    if (!D.storage) return Promise.resolve(false);
    return D.storage.saveProfile(save);
  }

  function applyAuthoritativeAccount(acc) {
    if (!acc || !save) return;
    if (acc.discoveries) {
      save.discoveries = (D.rarity && D.rarity.normalizeDiscoveries)
        ? D.rarity.normalizeDiscoveries(acc.discoveries)
        : acc.discoveries;
    }
    if (acc.speciesUnlocks) {
      var id;
      for (id in acc.speciesUnlocks) {
        if (acc.speciesUnlocks[id]) save.unlocks[id] = true;
      }
    }
    writeSave();
  }

  /* Eggs: five are open from the start. Each of the others opens once you
   * have defeated enough wild Digimon of that exact Baby kind, counted
   * across every run on this device. The target climbs with each egg won. */
  function eggDefOf(id) {
    var list = D.EGGS || [], i;
    for (i = 0; i < list.length; i++) if (list[i].id === id || list[i].hatch === id) return list[i];
    return null;
  }
  function eggKillTarget() {
    var U = D.EGG_UNLOCK || { first: 1000, step: 250 }, n = 0, k;
    for (k in save.eggUnlocks) if (save.eggUnlocks[k]) n += 1;
    return U.first + U.step * n;
  }
  function eggState(def) {
    if (!def) return { open: false, kills: 0, need: 0 };
    if (def.starter || save.eggUnlocks[def.id]) return { open: true, kills: save.eggKills[def.hatch] || 0, need: 0 };
    return { open: false, kills: save.eggKills[def.hatch] || 0, need: eggKillTarget(), name: (D.SPECIES[def.hatch] && D.SPECIES[def.hatch].name) || def.hatch };
  }
  /* Egg lines are opened in the Hatchery now (raise one to Rookie): D.unlockEgg. */
  D.unlockEgg = function (id) {
    var def = eggDefOf(id);
    if (!def || def.starter || save.eggUnlocks[def.id]) return false;
    save.eggUnlocks[def.id] = true; writeSave();
    return true;
  };
  D.eggState = eggState;

  function isUnlocked(id) {
    var sp = D.SPECIES[id];
    if (!sp.unlock) return true;
    return !!save.unlocks[id];
  }

  function grantUnlock(id, reason) {
    if (missionAuth) return false;
    if (save.unlocks[id]) return false;
    save.unlocks[id] = true;
    writeSave();
    if (run) {
      run.unlocksThisRun = run.unlocksThisRun || [];
      run.unlocksThisRun.push({ id: id, reason: reason });
    }
    return true;
  }

  function checkUnlocks() {
    if (!run || missionAuth) return;
    var id, sp, u;
    for (id in D.SPECIES) {
      sp = D.SPECIES[id];
      if (!sp.unlock || save.unlocks[id]) continue;
      u = sp.unlock;
      if (u.type === "evolveTo" && run.formsReached[u.form]) grantUnlock(id, "evolved");
      else if (u.alsoTime && run.time >= u.alsoTime) grantUnlock(id, "time");
    }
  }

  /* ---------- Audio ---------- */
  function beep(freq, dur, type, vol) {
    if (muted) return;
    try {
      if (!audioCtx) audioCtx = new (global.AudioContext || global.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      var o = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      o.type = type || "square";
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.035, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + dur);
    } catch (e) {}
  }

  function sfx(name) {
    if (name === "xp") beep(720, 0.06, "square", 0.02);
    else if (name === "meat") beep(220, 0.1, "triangle", 0.04);
    else if (name === "toy") beep(520, 0.12, "sine", 0.04);
    else if (name === "hit") beep(180, 0.05, "sawtooth", 0.03);
    else if (name === "hurt") beep(140, 0.12, "square", 0.05);
    else if (name === "level") { beep(440, 0.1, "square", 0.05); setTimeout(function () { beep(660, 0.14, "square", 0.05); }, 80); }
    else if (name === "evo") { beep(330, 0.18, "sawtooth", 0.05); setTimeout(function () { beep(495, 0.2, "sawtooth", 0.05); }, 160); setTimeout(function () { beep(660, 0.28, "square", 0.06); }, 320); }
    else if (name === "dead") beep(90, 0.4, "sawtooth", 0.06);
    else if (name === "ui") beep(400, 0.04, "square", 0.02);
    else if (name === "pick") beep(880, 0.08, "square", 0.035);
    else if (name === "buy") { beep(880, 0.07, "square", 0.04); setTimeout(function () { beep(1170, 0.1, "square", 0.04); }, 70); }
  }

  /* ---------- State ---------- */
  function debugPanelOn(s) {
    s = s || state;
    return !!debug && !cleanHud && (s === "playing" || s === "levelup" || s === "paused" || s === "evolution" || s === "shop" || s === "farm");
  }

  function setCleanHud(on) {
    cleanHud = !!on;
    if (el.debug) el.debug.classList.toggle("is-on", debugPanelOn());
  }

  function setState(s) {
    /* projection and egg are chosen on one screen now (js/hub.js); the old tamer screen is retired */
    if (s === "tamer") s = "setup";
    D._prevState = state;
    state = s;
    D.state = s;
    if (missionAuth && missionAuth.setLocalPause) missionAuth.setLocalPause(s === "paused" && !online());
    el.title.classList.toggle("is-on", s === "title");
    if ($("lobby-screen")) $("lobby-screen").classList.toggle("is-on", s === "lobby");
    if ($("join-screen")) $("join-screen").classList.toggle("is-on", s === "join");
    if (el.tamerScreen) el.tamerScreen.classList.toggle("is-on", s === "tamer");
    if ($("setup-screen")) $("setup-screen").classList.toggle("is-on", s === "setup");
    if (s === "setup") { el.hud.classList.remove("is-on"); renderEggSelect(); if (D.hub) D.hub.openSetup(); focusMenu(); }
    if (el.eggScreen) el.eggScreen.classList.toggle("is-on", s === "egg");
    el.levelup.classList.toggle("is-on", s === "levelup");
    el.pause.classList.toggle("is-on", s === "paused");
    el.evoScreen.classList.toggle("is-on", s === "evolution");
    el.gameover.classList.toggle("is-on", s === "gameover");
    if (el.shopScreen) el.shopScreen.classList.toggle("is-on", s === "shop");
    if (el.bankScreen) el.bankScreen.classList.toggle("is-on", s === "bank");
    if (el.brawlScreen) el.brawlScreen.classList.toggle("is-on", s === "brawl");
    if (el.farmScreen) el.farmScreen.classList.toggle("is-on", s === "farm");
    if (el.cosmeticsScreen) el.cosmeticsScreen.classList.toggle("is-on", s === "cosmetics");
    if (document.getElementById("lab-screen")) document.getElementById("lab-screen").classList.toggle("is-on", s === "lab");
    if (document.getElementById("hatchery-screen")) document.getElementById("hatchery-screen").classList.toggle("is-on", s === "hatchery");
    if (s === "hatchery") { el.hud.classList.remove("is-on"); if (el.debug) el.debug.classList.remove("is-on"); if (D.hatchery) D.hatchery.render(); focusMenu(); }
    if (s === "lab") { el.hud.classList.remove("is-on"); if (el.debug) el.debug.classList.remove("is-on"); if (D.lab) D.lab.render(); focusMenu(); }
    el.hud.classList.toggle("is-on", s === "playing" || s === "levelup" || s === "paused" || s === "evolution" || s === "shop" || s === "farm");
    if (s === "brawl") {
      el.hud.classList.remove("is-on");
      if (el.debug) el.debug.classList.remove("is-on");
    } else if (s !== "brawl" && D.brawl && D.brawl.isActive && D.brawl.isActive() && D.brawl.endQuiet) {
      /* leaving brawl unexpectedly */
    }
    if (el.debug) el.debug.classList.toggle("is-on", debugPanelOn(s));
    if (s === "title") {
      el.hud.classList.remove("is-on");
      if (el.debug) el.debug.classList.remove("is-on");
      renderTitle();
      focusMenu();
    }
    if (s === "shop") { renderShop(); focusMenu(); }
    if (s === "bank") {
      el.hud.classList.remove("is-on");
      if (el.debug) el.debug.classList.remove("is-on");
      renderBank();
      focusMenu();
    }
    if (s === "cosmetics") {
      el.hud.classList.remove("is-on");
      if (el.debug) el.debug.classList.remove("is-on");
      renderCabinet();
      focusMenu();
    }
    if (s === "tamer") {
      el.hud.classList.remove("is-on");
      if (el.debug) el.debug.classList.remove("is-on");
      renderTamerSelect();
      focusMenu();
    }
    if (s === "egg") {
      el.hud.classList.remove("is-on");
      if (el.debug) el.debug.classList.remove("is-on");
      renderEggSelect();
      focusMenu();
    }
    if (s === "paused") { renderPause(); focusMenu(); }
    if (s === "levelup") focusMenu();
    if (s === "gameover") focusMenu();
    if (s === "lobby" || s === "join") {
      el.hud.classList.remove("is-on");
      if (el.debug) el.debug.classList.remove("is-on");
      focusMenu();
    }
    if (D.onStateChange) { try { D.onStateChange(s, D._prevState); } catch (errState) {} }
    if (s === "farm") {
      if (D.farm && D.farm.render) D.farm.render();
      if (D.input && D.input.applyGlyphs) D.input.applyGlyphs();
    }
    if (D.input && D.input.applyGlyphs) D.input.applyGlyphs();
  }

  function rebuildStats() {
    var s = { speedMul: 1, magnetMul: 1, maxHpMul: 1, damageMul: 1, cooldownMul: 1 };
    var id, n, i, def;
    for (id in run.statLevels) {
      def = D.STAT_UPGRADES[id];
      n = run.statLevels[id];
      for (i = 0; i < n; i++) def.apply(s, i + 1);
    }
    var sp = D.SPECIES[run.form];
    var newMax = Math.round(sp.base.maxHp * s.maxHpMul);
    if (newMax > run.maxHp) {
      run.hp += (newMax - run.maxHp) * 0.25 + 6;
    }
    run.maxHp = newMax;
    if (run.hp > run.maxHp) run.hp = run.maxHp;
    run.stats = s;
  }

  function xpNeeded(level) { return D.xpForLevel(level); }

  function lineIdOf(form) {
    var sp = D.SPECIES[form];
    if (sp && sp.line) return sp.line;
    if (D.LINES && D.LINES[form]) return form;
    return "agumon";
  }

  function lineStages(line) {
    return (D.LINES && D.LINES[line]) || D.LINES.agumon;
  }

  function isEggForm(form) {
    if (D.partyRules) return D.partyRules.isEggForm(form, D);
    var sp = D.SPECIES[form];
    return !!(sp && sp.stage === "Egg");
  }

  function partyCtx() {
    if (!run) return { startingPartySize: 1, partyReviveCharge: 0, phase: state, data: D };
    return {
      run: run,
      cpus: run.cpuMates || [],
      ally: run.ally,
      startingPartySize: run.startingPartySize,
      partyReviveCharge: run.partyReviveCharge,
      phase: state === "brawl" ? "brawl" : (state === "farm" ? "farm" : "playing"),
      data: D
    };
  }

  /* Enemies stay away while the egg incubates and flood in `enemyLead`
   * seconds before it hatches. */
  function spawnsOpen() {
    if (!run) return false;
    if (isEggForm(run.form)) {
      var lead = (D.HATCH && D.HATCH.enemyLead != null) ? D.HATCH.enemyLead : 1;
      return (run.hatchLeft || 0) <= lead + 1e-6;
    }
    return partyCombatReady();
  }

  function partyCombatReady() {
    if (D.partyRules) return D.partyRules.hasHatchedCombatant(partyCtx(), D);
    return !!(run && !isEggForm(run.form) && run.hp > 0 && !(run.faint > 0));
  }

  var reviveUi = { prompt: null, progress: 0, eligible: false };

  function tickRevive(dt, held) {
    var R = D.partyRules;
    if (!R || !run) return reviveUi;
    var ctx = partyCtx();
    var reviver = {
      id: "local", x: run.x, y: run.y, mx: run.mx, my: run.my,
      tamerHp: run.tamerHp, tamerMaxHp: run.tamerMaxHp, hp: run.hp, maxHp: run.maxHp,
      faint: run.faint, downed: run.downed, hasTamer: true, form: run.form, ref: run
    };
    var out = R.tickHold(run, { dt: dt, held: !!held, data: D, ctx: ctx, reviver: reviver });
    if (ctx.partyReviveCharge != null) run.partyReviveCharge = ctx.partyReviveCharge;
    reviveUi = out;
    return out;
  }

  function forceWeather(id) {
    if (!debug || !run) return false;
    if (!D.weather) return false;
    var store = (missionAuth && missionAuth.sim) ? missionAuth.sim : run;
    D.weather.force(store, id, { data: D });
    run.weather = D.weather.snapshot(store);
    var label = (D.weather.mods(store, { data: D }) || {}).label || id;
    addFloat(run.x, run.y - 40, label, "#ffe080");
    updateHud();
    return true;
  }

  function startFormForLine(line) {
    var stages = lineStages(line);
    return (stages && stages.egg) || line;
  }


  function formNameSafe(id) {
    return (D.SPECIES && D.SPECIES[id] && D.SPECIES[id].name) || id || "?";
  }

  function cpuFormPool() {
    var table = (D.session && D.session.BOT_FORMS_BY_TIER) || {};
    var list = (table[1] || ["gabumon", "patamon", "biomon", "veemon", "palmon", "gomamon"]).slice();
    return list;
  }

  function spawnCpuMates() {
    if (!run) return;
    var n = run.cpuBots || 0;
    var cap = ((D.BRAWL_CFG && (D.BRAWL_CFG.partyCap || D.BRAWL_CFG.maxPlayers)) || 6) - 1;
    if (n > cap) n = cap;
    run.cpuMates = [];
    if (n <= 0) return;
    var used = {};
    if (run.form) used[run.form] = true;
    if (run.starter) used[run.starter] = true;
    var hatchTo = D.SPECIES && D.SPECIES[run.form] && D.SPECIES[run.form].hatchTo;
    if (hatchTo) used[hatchTo] = true;
    var pool = cpuFormPool().filter(function (id) { return !used[id]; });
    if (!pool.length) pool = cpuFormPool();
    var i, form, rec, ang, pos, sp, wpn;
    for (i = 0; i < n; i++) {
      form = pool[i % pool.length] || "patamon";
      var guard = 0;
      while (used[form] && guard < pool.length) { form = pool[(i + guard + 1) % pool.length]; guard++; }
      used[form] = true;
      if (!D.SPECIES || !D.SPECIES[form]) form = "gabumon";
      if (!D.SPECIES || !D.SPECIES[form]) continue;
      rec = D.SPECIES[form];
      ang = -0.4 + i * 0.55;
      pos = snapWalkable(run.x + Math.cos(ang) * (54 + i * 18), run.y + Math.sin(ang) * (36 + i * 12), actorRad(form), 240);
      wpn = rec.startWeapon ? { id: rec.startWeapon, level: 1, cd: 0.4 + i * 0.1 } : { id: "pea", level: 1, cd: 0.5 };
      if (wpn.id && D.WEAPONS && !D.WEAPONS[wpn.id]) wpn.id = (D.WEAPONS.pepperBreath ? "pepperBreath" : Object.keys(D.WEAPONS)[0]);
      run.cpuMates.push({
        id: "cpu-" + (i + 1),
        form: form,
        name: rec.name || form,
        hasTamer: false,
        x: pos.x,
        y: pos.y,
        facing: 1,
        moving: false,
        hp: rec.base && rec.base.maxHp ? rec.base.maxHp : 40,
        maxHp: rec.base && rec.base.maxHp ? rec.base.maxHp : 40,
        invuln: 0,
        weapon: wpn,
        color: ["#6ad0ff", "#e060b0", "#7cf0c0", "#ff8a40", "#c0a0ff"][i % 5],
        target: null
      });
    }
    if (D.sprites && D.sprites.preloadSpecies) {
      D.sprites.preloadSpecies(run.cpuMates.map(function (c) { return c.form; }), true);
    }
  }

  function nearestHeal(x, y) {
    var best = null, bestD = 1e15, i, o, d;
    for (i = 0; i < orbs.length; i++) {
      o = orbs[i];
      if (o.kind !== "heal") continue;
      d = dist2(x, y, o.x, o.y);
      if (d < bestD) { bestD = d; best = o; }
    }
    return bestD < 180 * 180 ? best : null;
  }

  function nearestBulletThreat(x, y, rad) {
    var i, b, d, best = null, bestD = 1e15;
    /* Enemy projectiles are not separately stored — dodge close enemies instead. */
    for (i = 0; i < enemies.length; i++) {
      d = dist2(x, y, enemies[i].x, enemies[i].y);
      if (d < (rad + (enemies[i].radius || 12) + 36) * (rad + (enemies[i].radius || 12) + 36) && d < bestD) {
        bestD = d; best = enemies[i];
      }
    }
    return best;
  }

  function updateCpuMates(dt) {
    if (!run || !run.cpuMates) return;
    var i, a;
    for (i = 0; i < run.cpuMates.length; i++) {
      a = run.cpuMates[i];
      if (a.hp <= 0) continue;
      updateCpuMate(dt, a);
    }
  }

  function updateCpuMate(dt, a) {
    a.invuln = Math.max(0, a.invuln - dt);
    var rad = actorRad(a.form);
    var desiredX = a.x, desiredY = a.y;
    var threat = nearestBulletThreat(a.x, a.y, rad);
    var heal = (a.hp / a.maxHp < 0.8) ? nearestHeal(a.x, a.y) : null;
    var target = nearestEnemy(a.x, a.y);
    a.target = target;
    if (heal && a.hp / a.maxHp < 0.55) {
      desiredX = heal.x; desiredY = heal.y;
    } else if (threat && dist2(a.x, a.y, threat.x, threat.y) < 50 * 50) {
      desiredX = a.x - (threat.x - a.x);
      desiredY = a.y - (threat.y - a.y) + 28;
    } else if (target) {
      var ed = Math.sqrt(dist2(a.x, a.y, target.x, target.y));
      if (ed > 64) { desiredX = target.x; desiredY = target.y; }
      else if (ed < 28) { desiredX = a.x - (target.x - a.x); desiredY = a.y - (target.y - a.y); }
      if (target.x !== a.x) a.facing = target.x < a.x ? -1 : 1;
    } else {
      /* Independent roam — no follow-the-tamer. Soft recall only if totally lost. */
      var dParty = Math.sqrt(dist2(a.x, a.y, run.mx, run.my));
      if (dParty > 420) { desiredX = run.mx; desiredY = run.my; }
    }
    var vx = desiredX - a.x, vy = desiredY - a.y;
    var sp = (D.SPECIES[a.form] && D.SPECIES[a.form].base && D.SPECIES[a.form].base.speed) || 70;
    sp *= 1.02;
    var l = len(vx, vy);
    if (l > 4) {
      var pos = slideMove(a.x, a.y, (vx / l) * sp * dt, (vy / l) * sp * dt, rad, crossOf(a.form));
      a.moving = Math.abs(pos.x - a.x) + Math.abs(pos.y - a.y) > 0.2;
      a.x = pos.x;
      a.y = pos.y;
    } else a.moving = false;
    if (Math.sqrt(dist2(a.x, a.y, run.x, run.y)) > 620) {
      var back = snapWalkable(run.mx + 40, run.my - 10, rad, 200);
      a.x = back.x; a.y = back.y;
    }
    if (a.weapon && D.WEAPONS && D.WEAPONS[a.weapon.id] && typeof updateAllyWeapon === "function") {
      updateAllyWeapon(dt, a);
    }
  }

  function hurtCpuMate(a, dmg) {
    if (!a || a.invuln > 0 || a.hp <= 0 || isEggForm(a.form)) return;
    a.hp -= dmg;
    a.invuln = 0.4;
    burst(a.x, a.y, "#ffb080", 6, 80);
    if (a.hp <= 0) {
      a.hp = 0;
      addFloat(a.x, a.y - 24, (a.name || "CPU") + " down!", "#c0a0ff");
    }
  }

  function tryCpuHealPickup(o) {
    var i, a, d, best = null, bestD = 1e15;
    for (i = 0; i < (run.cpuMates || []).length; i++) {
      a = run.cpuMates[i];
      if (!a || a.hp <= 0 || a.hp >= a.maxHp) continue;
      d = Math.sqrt(dist2(o.x, o.y, a.x, a.y));
      if (d < ((D.PLAYER && D.PLAYER.pickupRadius) || 16) + 10 && d < bestD) { bestD = d; best = a; }
    }
    if (!best) return false;
    var h = (D.FARM_CFG && D.FARM_CFG.heal) || {};
    var amt = best.maxHp * (h.hp != null ? h.hp : 0.2);
    best.hp = Math.min(best.maxHp, best.hp + amt);
    addFloat(best.x, best.y - 24, "Heal!", "#7cf0c0");
    burst(o.x, o.y, "#7cf0c0", 8, 80);
    sfx("xp");
    return true;
  }

  function startRun(starterId, tamerId, hatchSpec) {
    if (D.attackFx && D.attackFx.clearGround) D.attackFx.clearGround();
    if (D.hitFx) D.hitFx.clear();
    if (D.evoLog) D.evoLog.startRun(starterId);
    if (D.minimap) D.minimap.clear();
    if (tamerId && isKnownTamer(tamerId)) selectedTamer = tamerId;
    var line = lineIdOf(starterId);
    if (starterId === "digitama_agumon") line = "agumon";
    if (starterId === "digitama_gabumon") line = "gabumon";
    if (D.LINES && D.LINES[starterId]) line = starterId;
    var formId = startFormForLine(line);
    var sp = D.SPECIES[formId] || D.SPECIES[starterId];
    if (!sp) return;
    run = {
      starter: line,
      line: line,
      form: formId,
      tamerId: selectedTamer || "junior",
      x: 0,
      y: 0,
      facing: 1,
      tdir: "down",
      mx: -40,
      my: 8,
      mfacing: 1,
      monStuck: 0,
      aim: 0,
      tamerHp: D.TAMER.maxHp,
      tamerMaxHp: D.TAMER.maxHp,
      tamerInvuln: 0.8,
      monInvuln: 0,
      faint: 0,
      carry: [],
      feedCd: 0,
      feedAnim: 0,
      acquireCd: 0,
      monTarget: null,
      monMoving: false,
      worldFoodAcc: 0,
      hp: sp.base.maxHp,
      maxHp: sp.base.maxHp,
      level: 1,
      xp: 0,
      xpNext: xpNeeded(1),
      weapons: sp.startWeapon ? [{ id: sp.startWeapon, level: 1, cd: 0.2 }] : [],
      hatchLeft: (D.HATCH && D.HATCH.time) || 20,
      hatchMax: (D.HATCH && D.HATCH.time) || 20,
      statLevels: {},
      stats: { speedMul: 1, magnetMul: 1, maxHpMul: 1, damageMul: 1, cooldownMul: 1 },
      fullness: D.CARE.startFullness,
      happiness: D.CARE.startHappiness,
      foodEaten: 0,
      foodCounts: {},
      careMistakes: 0,
      killsAttribute: {},
      killsSpecies: {},
      bossesBeaten: 0,
      faints: 0,
      desperationTime: 0,
      starveLock: false,
      partners: [],
      items: [],
      time: 0,
      kills: 0,
      invuln: 1.2,
      killStreak: 0,
      streakTimer: 0,
      peakHappiness: D.CARE.startHappiness,
      formsReached: {},
      lastBoss: -999,
      openingSpawned: false,
      spawnAcc: {},
      desperation: false,
      unlocksThisRun: [],
      ended: false,
      bits: 0,
      shopBought: {},
      bag: {},
      atkBoost: 0,
      merchant: null,
      ally: null,
      reserve: [],
      captureFx: null,
      captureKills: 0,
      captureAnnouncedNeed: 0,
      lastMegaAt: -999,
      megaAcc: 0,
      lastBrawlLevel: 0,
      session: null,
      pendingBrawl: false,
      farmVisitIndex: 0,
      farmWarns: {},
      pendingFarm: false,
      pendingAtkBoost: 0,
      bond: 0,
      farmTraining: 0,
      trainStats: { offense: 0, intelligence: 0, agility: 0 },
      trainVisits: { bag: 0, board: 0, track: 0, bond: 0 },
      bondTrain: 0,
      chipThrow: null,
      cpuBots: (D.online && D.online.isGuest && D.online.isGuest()) ? 0 : selectedCpuBots,
      cpuMates: [],
      startingPartySize: 1,
      partyReviveCharge: 1,
      downed: false,
      reviveHold: null
    };
    if (D.rarity && D.rarity.resetRun) D.rarity.resetRun(run);
    run.formsReached[formId] = true;
    /* the run's mode (modes-sim.js): the Weekly Map is the same world for everyone this week; Ranked and Weekly bring no CPU partners or DigiBank help */
    run.mode = guestNow() ? "open" : selectedMode;
    run.week = run.mode === "weekly" && D.weekOf ? D.weekOf() : null;
    if (run.mode === "ranked" || run.mode === "weekly") { run.cpuBots = 0; hatchSpec = null; }
    if (run.week && D.weekSeed) run.worldSeed = D.weekSeed(run.week);
    run.worldSeed = (D._shotSeed || run.worldSeed || ((Date.now() ^ ((Math.random() * 0x7fffffff) | 0)) >>> 0)) || 1;
    if (D.world && D.world.reset) D.world.reset(run.worldSeed);
    preloadForRun();
    var spawnT = snapWalkable(0, 0, D.TAMER.radius, 320);
    run.x = spawnT.x;
    run.y = spawnT.y;
    var spawnM = snapWalkable(run.x - 36, run.y + 8, actorRad(formId), 320);
    run.mx = spawnM.x;
    run.my = spawnM.y;
    enemies = [];
    bullets = [];
    orbs = [];
    particles = [];
    floats = [];
    arcs = [];
    camX = run.x;
    camY = run.y;
    /* a Hatchery partner comes in as it is: no egg, its own form and job level */
    if (hatchSpec && D.SPECIES[hatchSpec.form]) {
      var hsp = D.SPECIES[hatchSpec.form];
      run.form = hatchSpec.form; run.hatchLeft = 0; run.level = hatchSpec.level || 1; run.xp = 0; run.xpNext = xpNeeded(run.level);
      run.maxHp = (hsp.base && hsp.base.maxHp) || run.maxHp; run.hp = run.maxHp;
      run.weapons = hsp.startWeapon ? [{ id: hsp.startWeapon, level: 1, cd: 0.2 }] : [];
      run.hatchery = hatchSpec;
    }
    shake = 0;
    prints = []; printLast = {}; livingFx = { landed: {}, iceT: -9, warnT: -99, warned: false };
    fronts = []; terrSeen = ""; warToastT = -99; nestList = []; pvpSeen = {};
    pendingLevels = 0;
    lastT = 0;
    setState("playing");
    var deployForm = save.bankDeploy && (typeof save.bankDeploy === "object" ? save.bankDeploy.form : save.bankDeploy);
    if (deployForm && D.SPECIES[deployForm] && !(D.online && D.online.isGuest && D.online.isGuest()) && run.mode !== "ranked" && run.mode !== "weekly") {
      spawnAlly(deployForm, run.x + 48, run.y - 16);
    }
    spawnCpuMates();
    run.startingPartySize = 1 + (run.cpuMates ? run.cpuMates.length : 0);
    run.partyReviveCharge = 1;
    run.downed = false;
    if (D.weather) D.weather.startRunWeather(run, { data: D });
    bootMissionAuth();
    updateHud();
    beep(330, 0.08, "square", 0.03);
  }

  /* ---------- Host-authoritative mission (in-process) ---------- */
  function missionAccount() {
    var acc = (D.cosmetics && D.cosmetics.getState && D.cosmetics.getState()) || {};
    acc.discoveries = (save && save.discoveries) || acc.discoveries;
    acc.speciesUnlocks = (save && save.unlocks) || acc.speciesUnlocks;
    return acc;
  }

  function bootMissionAuth() {
    missionAuth = null;
    missionAcc = 0;
    missionSeq = 0;
    if (!D.net || !D.net.authority || !D.net.mission) return;
    var localId = (run.session && (run.session.localId || run.session.local)) || "local";
    missionLocalId = localId;
    var sim = new D.net.mission.MissionSim({
      hz: D.net.authority.TICK_HZ || 25,
      seed: run.worldSeed,
      data: D,
      viewW: viewW,
      viewH: viewH
    });
    var auth = new D.net.authority.Authority({
      sim: sim,
      hz: D.net.authority.TICK_HZ || 25,
      mission: true,
      data: D,
      viewW: viewW,
      viewH: viewH,
      seed: run.worldSeed,
      debug: !!debug,
      allowDebugIntents: !!debug,
      account: missionAccount(),
      persist: function (acc) {
        if (D.cosmetics && D.cosmetics.applyAuthoritative) D.cosmetics.applyAuthoritative(acc);
        applyAuthoritativeAccount(acc);
      }
    });
    run.memory = memoryTier(run.starter);
    run.gear = D.items ? D.items.loadout() : null;
    run.lab = D.lab ? D.lab.levels() : null;   /* the Lab's boosts ride in with the tamer */
    sim.bootstrapFromRun(run);
    sim.evoChoice = true; /* digivolution asks first (Digivolve / Not yet) */
    sim.skillTree = !!(D.SKILLS && D.moveChain); /* job levels give skill points for the tree, not a card pick */
    if (!auth.slots[0] || !auth.slots[0].id) {
      auth.join({ id: localId, kind: "host-client", hasTamer: true, form: run.form, x: run.x, y: run.y, mx: run.mx, my: run.my, hp: run.hp, maxHp: run.maxHp, tamerHp: run.tamerHp, tamerMaxHp: run.tamerMaxHp, fullness: run.fullness, happiness: run.happiness, bits: run.bits, xp: run.xp, xpNext: run.xpNext, level: run.level, weapons: run.weapons, hatchLeft: run.hatchLeft, lab: D.lab ? D.lab.levels() : null, gear: D.items ? D.items.loadout() : null });
    }
    missionAuth = auth;
    D.missionAuth = auth;
    var lp0 = sim.player(localId); if (lp0 && !lp0.name && D.profile && D.profile.name) lp0.name = D.profile.name() || "";   /* a nemesis carries your name */
    /* a Hatchery partner: the digivolutions it has behind it, the skill points of its job levels, and what it ate */
    if (run.hatchery && !run.hatchery.applied) {
      var hp0 = sim.player(localId);
      if (hp0) {
        run.hatchery.applied = true;
        hp0.form = run.hatchery.form; hp0.hatchLeft = 0; hp0.formSince = sim.time || 0;
        hp0.evoCount = Math.max(0, (run.hatchery.route || []).length - 1);
        hp0.skillPoints = (hp0.skillPoints || 0) + Math.max(0, (run.hatchery.level || 1) - 1);
        hp0.hatchBias = run.hatchery.bias || null;
        hp0.skills = {}; hp0.weapons = [];
        if (sim._seedSkills) sim._seedSkills(hp0);
        if (sim._rollOffer) sim._rollOffer(hp0);
      }
    }
    holdAuthEvents(auth);
    /* Online play: the host wires guests into this authority; a guest swaps
     * it for a proxy that talks to the host. */
    if (D.online && D.online.onAuthBoot) {
      var swapped = D.online.onAuthBoot(auth, run);
      if (swapped && swapped !== auth) { missionAuth = swapped; D.missionAuth = swapped; }
      if (D.online.active && D.online.active() && D.online.myId) missionLocalId = D.online.myId() || missionLocalId;
    }
  }

  /* Authority.step() hands its events to snapshot listeners and clears them,
   * so a later snapshot(true) never saw kills, hatches, evolutions or farm
   * warnings. Keep them here until the next client read. */
  function holdAuthEvents(auth) {
    missionEvents = [];
    if (!auth || !auth.onSnapshot || auth._eventsHeld) return;
    auth._eventsHeld = true;
    auth.onSnapshot(function (snap) {
      if (auth !== missionAuth) return;
      if (snap && snap.events && snap.events.length) Array.prototype.push.apply(missionEvents, snap.events);
      if (missionEvents.length > 400) missionEvents.splice(0, missionEvents.length - 400);
    });
  }

  function takeMissionSnapshot() {
    var snap = missionAuth.snapshot(true);
    if (snap && missionEvents.length) {
      snap.events = missionEvents.concat(snap.events || []);
      missionEvents = [];
    }
    return snap;
  }

  function syncMissionHost() {
    if (!missionAuth || !run) return;
    missionAuth.syncHost({
      form: run.form,
      hp: run.hp,
      maxHp: run.maxHp,
      tamerHp: run.tamerHp,
      tamerMaxHp: run.tamerMaxHp,
      fullness: run.fullness,
      happiness: run.happiness,
      bits: run.bits,
      xp: run.xp,
      xpNext: run.xpNext,
      level: run.level,
      weapons: run.weapons,
      atkBoost: run.atkBoost,
      hatchLeft: run.hatchLeft,
      pendingLevels: pendingLevels
    });
    if (missionAuth.sim) {
      missionAuth.sim.viewW = viewW;
      missionAuth.sim.viewH = viewH;
    }
  }

  function replaceArr(dst, src) {
    dst.length = 0;
    var i;
    if (!src) return dst;
    for (i = 0; i < src.length; i++) dst.push(src[i]);
    return dst;
  }

  var seenEnemyTypes = {};
  function applyMissionSnapshot(snap) {
    if (!snap || !run) return;
    var list = snap.players || [];
    var p = null, i;
    for (i = 0; i < list.length; i++) if (list[i].id === missionLocalId) p = list[i];
    if (!p && list.length) p = list[0];
    if (p) {
      run.x = p.x; run.y = p.y;
      run.vx = p.vx; run.vy = p.vy;
      run.facing = p.facing; run.tdir = p.tdir || run.tdir; run.moving = p.moving;
      run.tamerHp = p.tamerHp; run.tamerMaxHp = p.tamerMaxHp; run.tamerInvuln = p.tamerInvuln;
      run.mx = p.mx; run.my = p.my; run.mfacing = p.mfacing; run.monMoving = p.monMoving;
      run.hp = p.hp; run.maxHp = p.maxHp; run.monInvuln = p.monInvuln; run.faint = p.faint;
      run.fullness = p.fullness; run.happiness = p.happiness;
      run.bits = p.bits; run.xp = p.xp; run.xpNext = p.xpNext; run.level = p.level;
      run.kills = p.kills; run.aim = p.aim;
      run.desperation = p.desperation;
      run.atkBoost = p.atkBoost;
      run.focusId = p.focusId != null ? p.focusId : null;
      run.trust = p.trust || null; run.allied = p.allied || null; run.myId = p.id;   /* faction trust (faction-sim.js) */
      run.pvpFlag = !!p.pvpFlag; run.pvpOffAt = p.pvpOffAt || 0;                    /* the PvP flag (pvp-sim.js) */
      if (p.md) run.md = p.md;                                                        /* respawns, bounty, bests (modes-sim.js) */
      if (p.weapons) run.weapons = p.weapons;
      if (p.form) run.form = p.form;
      if (p.bag) run.bag = p.bag;
      if (p.items) run.items = p.items;
      if (p.shopBought) run.shopBought = p.shopBought;
      if (p.captureKills != null) run.captureKills = p.captureKills;
      run.killsBy = p.killsBy || {};
      if (p.trainStats) run.trainStats = p.trainStats;
      if (p.trainVisits) run.trainVisits = p.trainVisits;
      if (p.bondTrain != null) run.bondTrain = p.bondTrain;
      if (p.careMistakes != null) run.careMistakes = p.careMistakes;
      if (p.foodEaten != null) run.foodEaten = p.foodEaten;
      if (p.foodCounts) run.foodCounts = p.foodCounts;
      if (p.reserve) run.reserve = p.reserve;
      if (p.hatchLeft != null) run.hatchLeft = p.hatchLeft;
      if (p.pendingFarm != null) run.pendingFarm = p.pendingFarm;
      if (p.pendingBrawl != null) run.pendingBrawl = p.pendingBrawl;
      if (p.lastFarmAt != null) run.lastFarmAt = p.lastFarmAt;
      if (p.farmDueAt != null) run.farmDueAt = p.farmDueAt;
      if (p.farmVisitIndex != null) run.farmVisitIndex = p.farmVisitIndex;
      if (p.lastBrawlLevel != null) run.lastBrawlLevel = p.lastBrawlLevel;
      if (p.bond != null) run.bond = p.bond;
      if (p.mood) run.mood = p.mood;
      if (p.ignoredSeconds != null) run.ignoredSeconds = p.ignoredSeconds;
      if (p.windows) run.windows = p.windows;
      if (p.clock) run.clock = p.clock;
      if (p.formsReached) run.formsReached = p.formsReached;
      if (p.starveCycles != null) run.starveCycles = p.starveCycles;
      if (p.refusedFoodCycles != null) run.refusedFoodCycles = p.refusedFoodCycles;
      if (p.statLevels) run.statLevels = p.statLevels;
      if (p.levelOffers) run.levelOffers = p.levelOffers;
      if (p.pendingLevels != null) pendingLevels = p.pendingLevels;
      if (p.downed != null) run.downed = !!p.downed;
      run.evoOffer = p.evoOffer || null;
      run.burst = p.burst || 0; run.burstLeft = p.burstLeft || 0; run.burstForm = p.burstForm || null; run.burstStyle = p.burstStyle || null; run.shiny = !!p.shiny; run.passives = p.passives || [];
      run.tamerLevel = p.tamerLevel || 1; run.tamerXp = p.tamerXp || 0; run.tamerXpNext = p.tamerXpNext || 1;
      run.statPoints = p.statPoints || 0; run.attrs = p.attrs || null; run.attrBonus = p.attrBonus || null;
      run.skills = p.skills || null; run.skillPoints = p.skillPoints || 0; run.skillOffer = p.skillOffer || null;
      run.evoHoldUntil = p.evoHoldUntil || 0;
    }
    run.others = [];
    for (i = 0; i < list.length; i++) {
      /* a friend away at the farm isn't in the world to be drawn (Nov 20) */
      if (list[i] !== p && list[i].id !== missionLocalId && !list[i].atFarm) run.others.push({
        id: list[i].id, x: list[i].x, y: list[i].y, mx: list[i].mx, my: list[i].my, hasTamer: list[i].hasTamer,
        form: list[i].form, facing: list[i].facing, tdir: list[i].tdir, moving: list[i].moving,
        mfacing: list[i].mfacing, monMoving: list[i].monMoving, hp: list[i].hp, maxHp: list[i].maxHp,
        tamerHp: list[i].tamerHp, tamerMaxHp: list[i].tamerMaxHp, tamerInvuln: list[i].tamerInvuln, monInvuln: list[i].monInvuln,
        faint: list[i].faint, downed: list[i].downed, level: list[i].level, hatchLeft: list[i].hatchLeft, burstForm: list[i].burstForm || null, burstStyle: list[i].burstStyle || null, shiny: !!list[i].shiny,
        trust: list[i].trust || null, pvpFlag: !!list[i].pvpFlag, bounty: (list[i].md && list[i].md.bo) || 0
      });
    }
    pvpWatch();
    if (snap.startingPartySize != null) run.startingPartySize = snap.startingPartySize;
    if (snap.partyReviveCharge != null) run.partyReviveCharge = snap.partyReviveCharge;
    if (Object.prototype.hasOwnProperty.call(snap, "reviveHold")) run.reviveHold = snap.reviveHold;
    if (snap.weather) run.weather = snap.weather;
    run.rival = snap.rival || null;
    if (Object.prototype.hasOwnProperty.call(snap, "merchant")) run.merchant = snap.merchant;
    if (snap.clock) run.clock = snap.clock;
    if (snap.lifecycle) run.lifecycle = snap.lifecycle;
    if (snap.time != null) run.time = snap.time;
    if (snap.kills != null) run.kills = snap.kills;
    run.cpuMates = snap.cpus || run.cpuMates || [];
    run.ally = snap.ally || (snap.ally === null ? null : run.ally);
    replaceArr(enemies, snap.enemies);
    patches = snap.patches || [];
    if (!missionAuth && snap.soak != null && D.world && D.world.setSoak) D.world.setSoak(snap.soak);
    /* who holds the land (the host decides; a guest's world follows) */
    if (snap.terr != null && snap.terr !== terrSeen && D.world && D.world.applyTerritory) { terrSeen = snap.terr; if (!missionAuth) D.world.applyTerritory(snap.terr); }
    fronts = snap.fronts || fronts;
    nestList = snap.nests || nestList;
    nemList = snap.nems || null;                                                    /* every nemesis alive (nemesis-sim.js) */
    if (D.sprites && D.sprites.preloadSpecies) {
      for (i = 0; i < enemies.length; i++) {
        if (!seenEnemyTypes[enemies[i].type]) { seenEnemyTypes[enemies[i].type] = true; D.sprites.preloadSpecies(enemies[i].type, true); }
      }
    }
    replaceArr(orbs, snap.orbs);
    replaceArr(bullets, snap.bullets);
    if (snap.arcs) replaceArr(arcs, snap.arcs);
    processAuthEvents(snap.events);
    if (snap.pendingLevels != null && snap.pendingLevels > pendingLevels) pendingLevels = snap.pendingLevels;
    if (state === "playing" && pendingLevels > 0 && run.levelOffers && run.levelOffers.length) openLevelUp();
    if (snap.runOver && !run.ended) endRun();
  }

  var OWN_EVENTS = { hurt: 1, faint: 1, revive: 1, hatch: 1, evolve: 1, "skill.add": 1, "evo.hold": 1, "evo.offer": 1, "dna.offer": 1, "dna.asked": 1, "dna.fail": 1, "dna.done": 1, "dna.revert": 1, shiny: 1, "ally.join": 1, "ally.absorbed": 1, "tamer.level": 1, "evo.lucky": 1, "stat.add": 1, level: 1, downed: 1, unlock: 1, capture: 1, shop: 1, bits: 1, "farm.return": 1, "farm.due": 1, "farm.warn": 1, "farm.enter": 1, discover: 1, levelup: 1, "level.offers": 1, "brawl.due": 1 };
  function processAuthEvents(ev) {
    var i, e;
    for (i = 0; i < (ev || []).length; i++) {
      e = ev[i];
      if (D.profile) D.profile.onEvent(e, missionLocalId, run);
      if (D.items) D.items.onEvent(e, missionLocalId, run);
      if (e.id != null && e.id !== missionLocalId && OWN_EVENTS[e.type] && online()) {
        /* someone else's moment: a small callout, never our own cut-in */
        if (D.online.otherEvent) D.online.otherEvent(e, { float: addFloat, burst: burst, run: run });
        /* a friend's partner levelled: their fireworks, quietly */
        if (e.type === "level" && e.skillPoints != null) {
          for (var oi = 0; oi < (run.others || []).length; oi++) if (String(run.others[oi].id) === String(e.id)) levelFxJob(run.others[oi].mx, monHeadY(run.others[oi].form, run.others[oi].my), true);
        }
        continue;
      }
      if (e.type === "war.flip" || e.type === "war.skirmish" || e.type === "war.lord") { warEvent(e); continue; }
      if (e.type === "trust") { trustEvent(e); continue; }
      if (e.type === "pvp.ko") { pvpKoEvent(e); continue; }
      if (e.type === "nemesis.kill" || e.type === "nemesis.rise" || e.type === "nemesis.down") { nemesisEvent(e); continue; }
      if (e.type === "respawn" || e.type === "bounty.set" || e.type === "bounty.claimed" || e.type === "mode.mega") { modeEvent(e); continue; }
      if (e.type === "pvp.flag") { pvpFlagEvent(e); continue; }
      if (e.type === "hurt") {
        shake = Math.max(shake, e.who === "tamer" ? 8 : 6);
        if (e.who === "tamer" || e.who === "mon") sfx("hurt");
        if (e.bolt) addFloat(run.mx, run.my - 30, "Struck!", "#cfe6ff");
        if (e.who === "mon" && D.hitFx && e.amount > 0) D.hitFx.hurt(run.mx, run.my, e.amount, e.amount / Math.max(1, run.maxHp));
      } else if (e.type === "fx") {
        if (e.k === "miss") { addFloat(e.x, e.y - 8, "miss", "#aab4ca"); continue; }
        if (e.k === "dodge") { addFloat(e.x, e.y - 8, "dodge", "#8fe0d0"); continue; }
        if (e.k === "lucky") { addFloat(e.x, e.y - 8, "lucky!", "#ffe14a"); continue; }
        if (e.k === "burn") { addFloat(e.x, e.y - 6, "Burn", "#ff8a2a"); burst(e.x, e.y + 14, "#ff7a1a", 6, 110); continue; }
        if (e.k === "alert") { addFloat(e.x, e.y - 8, "!", "#ff5a4a"); sfx("hurt"); continue; }
        if (e.k === "st") {
          /* a new mark on an enemy: say so, but not for every one of a crowd at once */
          if (ST_LOOK[e.s] && run.time - stFloatT > 0.12) { stFloatT = run.time; addFloat(e.x, e.y - 4, ST_LOOK[e.s][0], ST_LOOK[e.s][1]); }
          continue;
        }
        if (e.k === "steam") { burst(e.x, e.y, "#e8f4ff", 10, 120); burst(e.x, e.y - 8, "#ffffff", 5, 70); continue; }
        if (e.k === "scorch") {
          /* grass burnt away (the host's world already knows; a guest's learns it here) */
          if (D.world && D.world.burn && D.GRASSFIRE) D.world.burn(e.x, e.y, e.r, e.at, D.GRASSFIRE.regrow, D.GRASSFIRE.sprout);
          burst(e.x, e.y - 4, "#4a3a30", 8, 80); burst(e.x, e.y, "#ff9a3a", 5, 120);
          continue;
        }
        if (e.k === "rshot") { rivalShot(e); continue; }
        if (e.k === "boltwarn") { boltWarns.push({ x: e.x, y: e.y, t: e.t || 0.9, max: e.t || 0.9 }); continue; }
        if (e.k === "bolt") { strikeFx(e.x, e.y, e.r || 60); continue; }
        if (e.k === "frost") { burst(e.x, e.y, "#c4ecff", 14, 150); addFloat(e.x, e.y - 10, "Frozen over", "#bfe8ff"); continue; }
        if (livingEvent(e)) continue;
        if (e.k === "weak") { addFloat(e.x, e.y - 6, "Weak!", e.id != null ? "#ff6a5a" : "#ff9a3a"); continue; }
        if (e.k === "resist") { addFloat(e.x, e.y - 6, "Resist", e.id != null ? "#8fd0ff" : "#8a94a8"); continue; }
        if (e.k === "crit") { addFloat(e.x, e.y - 14, "CRIT!", "#ffe14a"); burst(e.x, e.y, "#ffe14a", 8, 150); continue; }
        if (D.attackFx) D.attackFx.event(e);
        if (e.k === "boom") shake = Math.max(shake, (e.r || 60) < 45 ? 0 : (e.q ? 2.5 : 5));
        else if (e.k === "zap" || e.k === "slam") shake = Math.max(shake, 3);
        else if (e.k === "burst") shake = Math.max(shake, 2);
      } else if (e.type === "hit") {
        /* the number, the spark, the squash, the jolt (hit-fx.js) */
        if (D.hitFx && e.x != null) {
          var hOwn = e.by != null && e.by === missionLocalId, hMate = e.by != null && !hOwn, hSrc = null, hi;
          if (hOwn) hSrc = { x: run.mx, y: run.my };
          else if (hMate) { for (hi = 0; hi < (run.others || []).length; hi++) if (String(run.others[hi].id) === String(e.by)) hSrc = { x: run.others[hi].mx, y: run.others[hi].my }; }
          else if (e.bolt) hSrc = { x: e.x, y: e.y - 120 };
          D.hitFx.hit(e, { own: hOwn, mate: hMate, bolt: !!e.bolt, frac: e.f || 0, radius: e.r || 12, sx: hSrc ? hSrc.x : null, sy: hSrc ? hSrc.y : null });
        }
      } else if (e.type === "kill") {
        if (e.killer !== "rival" && e.killer !== "wild") {   /* the rival's kills are not yours, nor is one wild Digimon killing another */
          shake = Math.max(shake, e.boss ? 10 : 3);
          /* data for the Hatchery: one piece per kill, of that enemy's element (js/hatchery.js); an infected one pays more (data.js VIRUS.pay) */
          if (run && D.hatchery && D.moveFamilyOf) { var hk = D.moveFamilyOf(e.enemyType) || "beast"; run.dataBy = run.dataBy || {}; run.dataBy[hk] = (run.dataBy[hk] || 0) + D.hatchery.killWorth(e) + (e.virus && D.VIRUS ? D.VIRUS.pay.data : 0); }
          if (e.virus && e.x != null) { addFloat(e.x, e.y - 34, "Infected " + spName(e.enemyType) + " down", "#d9a8ff"); burst(e.x, e.y - 6, "#b05cff", 22, 240); }
        }
        if (e.x != null) burst(e.x, e.y, e.killer === "wild" ? "#b05cff" : "#ffe080", e.boss ? 24 : 12, e.boss ? 220 : 140);
        if (D.hitFx && e.x != null) {
          var kOwn = e.killer !== "rival" && e.killer !== "wild" && (e.killer == null || e.killer === missionLocalId);
          /* tough: it had more health than your partner has */
          D.hitFx.kill(e, { own: kOwn ? true : false, big: !!(e.big || e.boss), tough: (e.hp || 0) >= (run.maxHp || 1) * 1.5, radius: e.r || 12, sx: kOwn ? run.mx : null, sy: kOwn ? run.my : null });
        } else sfx("hit");
      } else if (e.type === "pickup") {
        if ((isFoodKind(e.kind) || (D.isSeed && D.isSeed(e.kind))) && e.who !== "cpu" && (!e.id || e.id === missionLocalId)) showFoodPickup(e.kind, e.x, e.y);
        else sfx("xp");
      } else if (e.type === "spawn" && (e.boss || e.mega)) {
        if (e.mega) {
          var megaName = (D.ENEMIES[e.enemyType] && D.ENEMIES[e.enemyType].name) || (D.SPECIES[e.enemyType] && D.SPECIES[e.enemyType].name) || e.enemyType || "Mega";
          addFloat(e.x || run.x, (e.y || run.y) - 48, "MEGA — " + megaName + "!", "#ffb040");
          showNoticeToast("MEGA — " + megaName + " appears!", "is-mega");
        } else {
          addFloat(run.x, run.y - 48, "A boss appears!", "#ff8080");
        }
      } else if (e.type === "faint") {
        addFloat(run.mx, run.my - 28, "Fainted!", "#ffb080");
      } else if (e.type === "revive") {
        addFloat(run.mx, run.my - 28, "Revived!", "#7cf0c0");
      } else if (e.type === "hatch" || e.type === "evolve") {
        beginEvolution({ to: e.to, kind: e.kind || e.type, from: e.from, applied: true });
        if ((e.kind || e.type) === "hatch" && run.memory && memoryOf(run.starter)) { showNoticeToast("It remembers being " + spName(memoryOf(run.starter).form) + ".  +" + run.memory + " skill point" + (run.memory > 1 ? "s" : "") + " to spend."); noticeToastTimer = 5; }
        if (e.boost) evoBoostNote = { t: 0.4, text: "Digivolved!  +" + e.boost.hp + " HP  \u00b7  ATK +" + e.boost.atk + "%  \u00b7  RATE +" + e.boost.rate + "%  \u00b7  SPD +" + e.boost.spd + "%" };
      } else if (e.type === "tamer.level") {
        showNoticeToast("Base level " + e.level + "!  +" + (e.gain || 3) + " status points. Press T to spend them.");
        noticeToastTimer = 4.5;
        addFloat(run.x, run.y - 44, "Tamer Lv " + e.level + "!", "#d9c4ff");
        levelFxBase(e.gain || 3);
      } else if (e.type.indexOf("rival.") === 0) {
        rivalEvent(e);
      } else if (e.type.indexOf("virus.") === 0) {
        virusEvent(e);
      } else if (e.type === "evo.lucky") {
        evoLuckyNote = true;
      } else if (e.type === "evo.offer") {
        sfx("level");
      } else if (e.type === "prop.used") {
        if (D.world && D.world.markUsed) D.world.markUsed(e.key);
        if (e.kind === "spire") {
          burst(e.x, e.y - 40, "#c050ff", 46, 360); burst(e.x, e.y - 20, "#1a1622", 26, 240); shake = Math.max(shake, 10); sfx("hurt");
          showNoticeToast(e.enemyType ? "The spire breaks.  " + spName(e.enemyType) + " steps out of the dark!" : "The spire breaks."); noticeToastTimer = 4.5;
        } else {
          burst(e.x, e.y - 12, "#7cf0c0", 22, 220); sfx("level");
        }
      } else if (e.type === "lord.down") {
        var lb = D.biomes && D.biomes.DEFS[e.biome];
        showNoticeToast("The lord of " + (lb ? lb.name : "the land") + " has fallen!  " + spName(e.enemyType) + " is gone for this run."); noticeToastTimer = 6;
        burst(e.x, e.y, "#ffe27a", 40, 340); burst(e.x, e.y, "#ffffff", 20, 240); shake = Math.max(shake, 12); sfx("level");
        if (D.profile && e.id === missionLocalId) D.profile.award("lord");
      } else if (e.type === "ally.join") {
        showNoticeToast(spName(e.form) + " joined you.  Passive: " + allyPassiveText(e.passive) + "."); noticeToastTimer = 5;
      } else if (e.type === "ally.evolve") {
        if (D.sprites && D.sprites.preloadSpecies) D.sprites.preloadSpecies(e.to, true);
        addFloat(e.x, e.y - 34, spName(e.from) + " digivolved!", "#c0a0ff"); burst(e.x, e.y - 8, "#c0a0ff", 22, 220);
        showNoticeToast("Your ally digivolved into " + spName(e.to) + ".  Passive: " + allyPassiveText(e.passive) + "."); noticeToastTimer = 4.5; sfx("level");
      } else if (e.type === "ally.level") {
        addFloat(e.x, e.y - 30, "Ally Lv " + e.level, "#c0a0ff");
      } else if (e.type === "ally.absorbed") {
        showNoticeToast(spName(e.form) + " became part of your partner." + (e.kept ? "  Kept for this run: " + allyPassiveText(e.passive) + "." : "  (You already hold that passive twice.)") + "  You can catch another ally now."); noticeToastTimer = 7;
      } else if (e.type === "shiny") {
        run.shiny = true;
        if (D.evoLog && D.evoLog.noteShiny) D.evoLog.noteShiny(e.form);
        if (e.first) shinyNote = { t: 2.6, form: e.form };
      } else if (e.type === "burst.start") {
        if (e.to && D.sprites && D.sprites.preloadSpecies) D.sprites.preloadSpecies(e.to, true);
        var bl = burstLook(e.family), bst = (D.BURST.styles && D.BURST.styles[e.style]) || {};
        addFloat(e.x, e.y - 58, "WARP DIGIVOLVE!", bl.col);
        if (bst.label) addFloat(e.x, e.y - 40, bst.label + "!", bl.col2);
        burst(e.x, e.y - 8, bl.col, 34, 320); burst(e.x, e.y - 8, bl.col2, 18, 210);
        if (e.id === missionLocalId) { shake = Math.max(shake, 7); sfx("level"); showNoticeToast("Warp burst!  " + spName(e.to) + (bst.label ? ", " + bst.label : "") + ", for " + (e.time || 6) + " seconds."); noticeToastTimer = 2.5; }
      } else if (e.type === "ult.start") {
        /* a Mega's ultimate (moves.js ULT): the whole show is attack-fx.js ult() */
        if (D.attackFx && D.attackFx.ult) D.attackFx.ult(e);
        addFloat(e.x, e.y - 74, (e.name || "Ultimate").toUpperCase() + "!", "#ffe27a");
        shake = Math.max(shake, 6); sfx("level");
        ultShake = { t: 0, at: e.windup || 0.8 };
        if (e.id === missionLocalId) { showNoticeToast(spName(e.form) + ": " + (e.name || "Ultimate") + "!  " + (e.say || "")); noticeToastTimer = 4; }
      } else if (e.type === "ult.end") {
        burst(e.x, e.y - 8, "#fff6c0", 18, 200);
      } else if (e.type === "burst.end") {
        burst(e.x, e.y - 8, "#cfe8ff", 14, 180);
      } else if (e.type.indexOf("dna.") === 0) {
        dnaEvent(e);
      } else if (e.type === "evo.hold") {
        showNoticeToast("Not yet." + (e.label ? "  " + e.label + "." : "") + "  It will ask again at Lv " + e.nextLevel + ".");
        addFloat(run.mx, run.my - 40, e.label ? e.label.split(":")[0] + "!" : "Not yet", "#ffe27a");
        burst(run.mx, run.my - 8, "#ffe27a", 10, 120);
      } else if (e.type === "farm.return" && e.careMistake) {
        addFloat(run.mx, run.my - 28, "Care mistake…", "#ffd36a");
      } else if (e.type === "merchant") {
        addFloat(e.x || run.x, (e.y || run.y) - 36, "Jijimon's Shop!", "#ffe080");
        if (e.form && D.sprites && D.sprites.preloadSpecies) D.sprites.preloadSpecies(e.form, true);
      } else if (e.type === "level" && e.skillPoints != null) {
        /* the fireworks go up first; the skill window follows a moment later so it does not cover them */
        if (e.pause > 0 && (state === "playing" || state === "farm")) levelWinQueue = { t: state === "playing" ? LEVEL_FX.windowDelay : 0, pause: e.pause, hold: !!e.hold, level: e.level };
        else if (e.pause > 0 && missionAuth && e.id === missionLocalId) { missionAuth.act({ type: "breather.end", id: missionLocalId }); showNoticeToast("Job level " + e.level + "!  +1 skill point. Press K to spend it."); }
        else showNoticeToast("Job level " + e.level + "!  +1 skill point. Press K to spend it.");
        addFloat(run.mx, run.my - 44, "Job Lv " + e.level + "!", "#9fe8ff");
        levelFxJob(run.mx, monHeadY(run.form, run.my));
      } else if (e.type === "level" && state === "playing") {
        /* pendingLevels / offers applied from snapshot */
      } else if (e.type === "discover") {
        /* persisted via guest provider; nothing to author here */
      } else if (e.type === "unlock") {
        if (e.form && save) save.unlocks[e.form] = true;
        if (e.form && D.SPECIES[e.form]) addFloat(run.x, run.y - 36, (D.SPECIES[e.form].name || e.form) + " unlocked", "#ffe080");
      } else if (e.type === "farm.due" || e.type === "farm.warn") {
        if (e.type === "farm.warn" && e.seconds) showNoticeToast("Farm visit in " + Math.ceil(e.seconds) + "s", "is-farm");
      } else if (e.type === "brawl.due") {
        /* UI follows snapshot pendingBrawl / phase */
      } else if (e.type === "downed") {
        addFloat(run.x, run.y - 36, "Hold to revive", "#7cf0c0");
      }
    }
  }

  function updatePlayingAuth(dt, inp) {
    var speedFace = inp.x;
    if (speedFace > 0.15) run.facing = 1;
    else if (speedFace < -0.15) run.facing = -1;
    syncAim();
    if (run.chipThrow) {
      run.chipThrow.t -= dt;
      if (run.chipThrow.t <= 0) run.chipThrow = null;
    }
    missionSeq += 1;
    var authIn = { seq: missionSeq, x: inp.x || 0, y: inp.y || 0, atk: !!inp.fire, aim: run.aim, interact: !!(inp.interactHeld || inp.interact) };
    var clicked = consumeEnemyClick();
    if (clicked) authIn.focus = clicked._id;
    else if (lastGroundClick) authIn.go = [lastGroundClick.x, lastGroundClick.y];
    lastGroundClick = null;
    missionAuth.onMessage({
      type: "input",
      id: missionLocalId,
      inputs: [authIn]
    });
    if (online() && online().drivesClock()) {
      /* online: a background-safe clock in js/net/online.js steps the sim */
      missionAcc = 0;
    } else {
      missionAcc += dt;
      var step = missionAuth.dt || 0.04;
      var guard = 0;
      while (missionAcc >= step && guard < 8) {
        missionAuth.step();
        missionAcc -= step;
        guard += 1;
      }
      applyMissionSnapshot(takeMissionSnapshot());
      if (!run || run.ended) return;
      smoothBetweenTicks(guard, missionAcc / step, step);
      tickNoticeToast(dt);
      if (run.captureFx) {
        run.captureFx.t -= dt;
        if (run.captureFx.t <= 0) run.captureFx = null;
      }
      followAuthLifecycle();
      return;
    }
    applyMissionSnapshot(takeMissionSnapshot());
    if (!run || run.ended) return;
    tickNoticeToast(dt);
    if (run.captureFx) {
      run.captureFx.t -= dt;
      if (run.captureFx.t <= 0) run.captureFx = null;
    }
    followAuthLifecycle();
  }

  /* The world is simulated 25 times a second but drawn 60 or more. Shown
   * raw, everything moves in little jumps against a smoothly gliding camera,
   * which reads as the tamer and Digimon shaking as they walk. So what is
   * drawn slides from the previous tick's position to the latest one.
   * Display only: the sim never reads these back. */
  var tickLerp = { prev: null, cur: null, run: null };
  function tickCapture() {
    var c = { x: run.x, y: run.y, mx: run.mx, my: run.my, e: {} }, i, en;
    for (i = 0; i < enemies.length; i++) { en = enemies[i]; if (en && en._id != null) c.e[en._id] = [en.x, en.y]; }
    return c;
  }
  function smoothBetweenTicks(stepped, alpha, step) {
    var T = tickLerp, a = clamp(alpha, 0, 1), i, en, p, c, b;
    if (T.run !== run) { T.run = run; T.prev = T.cur = null; }
    if (stepped || !T.cur) {
      c = tickCapture(); p = T.cur || c;
      if (stepped > 1) {
        /* several ticks ran this frame: slide from where things were one tick ago, not from the last frame */
        var f = (stepped - 1) / stepped, k, q = { x: p.x + (c.x - p.x) * f, y: p.y + (c.y - p.y) * f, mx: p.mx + (c.mx - p.mx) * f, my: p.my + (c.my - p.my) * f, e: {} };
        for (k in c.e) if (p.e[k]) q.e[k] = [p.e[k][0] + (c.e[k][0] - p.e[k][0]) * f, p.e[k][1] + (c.e[k][1] - p.e[k][1]) * f];
        p = q;
      }
      T.prev = p; T.cur = c;
    }
    p = T.prev; c = T.cur;
    function mixed(u, v) { return Math.abs(v - u) > 90 ? v : u + (v - u) * a; }   /* a jump that big is a teleport: do not slide */
    run.x = mixed(p.x, c.x); run.y = mixed(p.y, c.y);
    run.mx = mixed(p.mx, c.mx); run.my = mixed(p.my, c.my);
    for (i = 0; i < enemies.length; i++) {
      en = enemies[i];
      if (!en || !p.e[en._id] || !c.e[en._id]) continue;
      en.x = mixed(p.e[en._id][0], c.e[en._id][0]);
      en.y = mixed(p.e[en._id][1], c.e[en._id][1]);
    }
    /* shots have a known velocity: step them back to where they are mid-tick */
    for (i = 0; i < bullets.length; i++) {
      b = bullets[i];
      if (b && b.vx != null) { b.x -= b.vx * step * (1 - a); b.y -= b.vy * step * (1 - a); }
    }
  }

  /* Online: the world keeps running behind level-up, pause, shop and the
   * evolution cut-in, so keep reading the authority while they are open. */
  function onlineIdle(dt) {
    missionSeq += 1;
    missionAuth.onMessage({ type: "input", id: missionLocalId, inputs: [{ seq: missionSeq, x: 0, y: 0, atk: false, aim: run.aim, interact: false }] });
    applyMissionSnapshot(takeMissionSnapshot());
    if (!run || run.ended) return;
    updateFx(dt);
    tickNoticeToast(dt);
    if (online() && ((online().wantsFarm && online().wantsFarm()) || (online().wantsBrawl && online().wantsBrawl())) && (state === "levelup" || state === "paused" || state === "shop")) {
      if (state === "shop") closeShop();
      else setState("playing");
    }
  }

  /* ---------- Combat helpers ---------- */
  function nearestEnemy(x, y) {
    var best = null, bestD = 1e15, i, e, d;
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i];
      d = dist2(x, y, e.x, e.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  function obtainPart() {
    return partPool.length ? partPool.pop() : {
      x: 0, y: 0, vx: 0, vy: 0, color: "#fff", life: 0, max: 1, size: 3,
      type: "pixel", additive: false, grow: 0, grav: 1
    };
  }

  function addParticle(x, y, vx, vy, color, life, size, type, additive, grav) {
    var cap = reducedFx ? ((D.FX && D.FX.particleCapLow) || 70) : ((D.FX && D.FX.particleCap) || 220);
    var p;
    if (particles.length >= cap) p = particles.shift();
    else { p = obtainPart(); particles.push(p); }
    p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.color = color; p.life = life; p.max = life;
    p.size = size || 3; p.type = type || "pixel";
    p.additive = !!additive; p.grow = 0;
    p.grav = grav == null ? (p.type === "trail" || p.type === "glow" ? 0 : 1) : grav;
    return p;
  }

  function addFloat(x, y, text, color) {
    floats.push({ x: x, y: y, text: text, color: color || "#fff", life: 0.7, max: 0.7, pop: 0 });
  }

  /* a projection's foot lands (sprites.js drawTamer): a puff on dirt and sand, a ripple in a puddle,
   * a spray of snow, and the faint ring it stands on blinks where the foot touched */
  function tamerStep(key, x, y) {
    if (!run || state !== "playing" || !D.world) return;
    var W = D.world, puddle = W.inPuddle && W.inPuddle(x, y + 2), tile = (D.sprites && D.sprites.TILE) || 16, b, mat, i, col;
    if (puddle) { addParticle(x + rand(-3, 3), y + 3, 0, 0, "rgba(200,235,255,0.9)", 0.6, 3, "ripple", false, 0); for (i = 0; i < 2; i++) addParticle(x + rand(-4, 4), y + 1, rand(-14, 14), rand(-30, -16), "#cfeaff", 0.3, 2, "pixel", false, 1.4); return; }
    if (W.snowAt && W.snowAt(x, y)) { for (i = 0; i < 3; i++) addParticle(x + rand(-4, 4), y + 2, rand(-16, 16), rand(-18, -6), "#f4f8ff", rand(0.3, 0.5), 2, "pixel", false, 0.8); return; }
    b = W.biomeAt ? W.biomeAt(x, y) : null;
    mat = W.materialAt ? W.materialAt(Math.floor(x / tile), Math.floor(y / tile)) : 0;
    if (mat === 1 || (b && (b.id === "desert" || b.id === "volcano"))) {
      col = b && b.id === "desert" ? "#e6c98a" : b && b.id === "volcano" ? "#8a7a74" : "#b89a6a";
      for (i = 0; i < (reducedFx ? 1 : 3); i++) addParticle(x + rand(-5, 5), y + 2, rand(-12, 12), rand(-10, -3), col, rand(0.35, 0.6), rand(2, 3), "pixel", false, 0.15);
    }
  }
  if (D.sprites) D.sprites.onTamerStep = tamerStep;
  function burst(x, y, color, n, speed) {
    var i, a, sp, nn;
    nn = reducedFx ? Math.ceil(n * 0.4) : n;
    for (i = 0; i < nn; i++) {
      a = rand(0, Math.PI * 2);
      sp = rand(24, speed);
      addParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, color, rand(0.28, 0.65), rand(2, 5), "pixel", false, 0.35);
    }
  }

  function dropLoot(e, def) {
    var waveMul = debug ? D.XP.debugXpMul : 1;
    var xpAmt = Math.round(def.xp * (0.85 + Math.random() * 0.3) * waveMul);
    if (D.weather) xpAmt = D.weather.xpValue(xpAmt, run, D);
    spawnOrb("xp", e.x, e.y, xpAmt);
    var bits = D.bitsForEnemy ? D.bitsForEnemy(def) : 3;
    spawnOrb("bits", e.x + rand(-10, 10), e.y + rand(-8, 8), bits);
    var meatChance = def.boss ? D.CARE.bossMeatDropChance : (def.elite ? D.CARE.eliteMeatDropChance : D.CARE.meatDropChance);
    var healCfg = (D.FARM_CFG && D.FARM_CFG.heal) || {};
    var healChance = def.boss ? (healCfg.bossChance != null ? healCfg.bossChance : 1)
      : (def.elite ? (healCfg.eliteChance != null ? healCfg.eliteChance : 0.6)
      : (healCfg.dropChance != null ? healCfg.dropChance : 0.3));
    if (Math.random() < healChance) spawnOrb("heal", e.x + rand(-8, 8), e.y + rand(-8, 8), 1);
    if (Math.random() < meatChance) {
      var fk = D.rollFoodKind ? D.rollFoodKind(Math.random()) : "meat";
      spawnOrb(fk, e.x + rand(-9, 9), e.y + rand(-7, 7), 1);
    }
    if (D.SEED_DROP && D.rollSeedKind) {
      var sChance = def.boss ? D.SEED_DROP.bossChance : (def.elite ? D.SEED_DROP.eliteChance : D.SEED_DROP.chance);
      if (Math.random() < sChance) spawnOrb(D.rollSeedKind(Math.random()), e.x + rand(-9, 9), e.y + rand(-7, 7), 1);
    }
  }

  function spawnOrb(kind, x, y, value) {
    if (orbs.length > 180) {
      var i, best = 0, bestD = -1, d;
      for (i = 0; i < orbs.length; i++) {
        if (orbs[i].kind !== "xp") continue;
        d = dist2(orbs[i].x, orbs[i].y, run.x, run.y);
        if (d > bestD) { bestD = d; best = i; }
      }
      orbs.splice(best, 1);
    }
    var snapped = snapWalkable(x, y, 8, 180);
    orbs.push({ kind: kind, x: snapped.x, y: snapped.y, value: value, vx: rand(-40, 40), vy: rand(-60, -10), magnet: false });
  }

  function hurtEnemy(e, dmg, kbX, kbY, knock) {
    e.hp -= dmg;
    e.flash = 0.1;
    (function () {
      var K = D.KNOCKBACK || { scale: 22, min: 10, bossMul: 0.3, megaMul: 0.15, eliteMul: 0.6, maxSpeed: 520, stun: 0.12 };
      var l = Math.sqrt((kbX || 0) * (kbX || 0) + (kbY || 0) * (kbY || 0));
      if (l < 0.0001) return;
      var dfk = D.ENEMIES[e.type] || {};
      var power = Math.max(K.min || 0, knock || 0) * (K.scale || 22);
      if (K.stageMul && D.partnerStageIdx) power *= K.stageMul[Math.max(0, Math.min(K.stageMul.length - 1, D.partnerStageIdx(run.form)))];
      if (e.mega) power *= K.megaMul; else if (e.boss || dfk.boss) power *= K.bossMul; else if (dfk.elite) power *= K.eliteMul;
      e.kvx = (e.kvx || 0) + (kbX / l) * power;
      e.kvy = (e.kvy || 0) + (kbY / l) * power;
      var sp = Math.sqrt(e.kvx * e.kvx + e.kvy * e.kvy);
      if (sp > K.maxSpeed) { e.kvx *= K.maxSpeed / sp; e.kvy *= K.maxSpeed / sp; }
      e.kbStun = Math.max(e.kbStun || 0, K.stun || 0.12);
    })();
    addFloat(e.x, e.y - e.radius - 6, String(Math.round(dmg)), "#ffe8a0");
    if (e.hp <= 0) {
      var def = D.ENEMIES[e.type];
      run.kills += 1;
      noteCaptureKill();
      recordKill(e.type, def);
      run.killStreak += 1;
      run.streakTimer = D.CARE.killStreakWindow;
      if (run.killStreak > 0 && run.killStreak % D.CARE.killStreakEvery === 0) {
        run.happiness = clamp(run.happiness + D.CARE.killStreakHappiness, 0, D.CARE.happinessMax);
        addFloat(run.x, run.y - 28, "Streak +Joy", "#ffd36a");
      }
      burst(e.x, e.y, def.color, def.boss ? 32 : 14, def.boss ? 280 : 160);
      burst(e.x, e.y, "#1a1230", def.boss ? 10 : 5, def.boss ? 180 : 90);
      if (!reducedFx) {
        addParticle(e.x, e.y, 0, 0, def.color, 0.22, def.boss ? 38 : 18, "glow", true, 0);
      }
      dropLoot(e, def);
      if (isEggForm(run.form) && D.HATCH) {
        var pr = D.HATCH.protectRadius || 90;
        if (dist2(e.x, e.y, run.mx, run.my) <= pr * pr) {
          if (D.HATCH.protectBonus) run.hatchLeft = Math.max(0, (run.hatchLeft || 0) - D.HATCH.protectBonus);
        }
      }
      e.dead = true;
      shake = Math.max(shake, def.boss ? 10 : 3);
      sfx("hit");
    }
  }

  function hurtTamer(dmg) {
    if (run.downed || run.tamerInvuln > 0 || run.tamerHp <= 0) return;
    run.tamerHp -= dmg;
    run.tamerInvuln = D.TAMER.iFrame;
    shake = Math.max(shake, 8);
    burst(run.x, run.y, "#ff8080", 8, 120);
    sfx("hurt");
    if (run.tamerHp <= 0) {
      run.tamerHp = 0;
      if (D.partyRules && !D.partyRules.isPartyMode(partyCtx()) && (run.partyReviveCharge || 0) > 0) {
        run.downed = true;
        addFloat(run.x, run.y - 36, "Hold to revive", "#7cf0c0");
      } else {
        endRun();
      }
    }
  }

  function hurtMon(dmg) {
    if (isEggForm(run.form)) return;
    if (run.faint > 0 || run.monInvuln > 0 || run.hp <= 0) return;
    var incoming = dmg * (run.desperation ? D.CARE.desperationDamageIn : 1);
    run.hp -= incoming;
    run.monInvuln = D.PLAYER.iFrame;
    if (D.rarity && D.rarity.noteMonHit) D.rarity.noteMonHit(run);
    shake = Math.max(shake, 6);
    burst(run.mx, run.my, "#ffb080", 8, 110);
    if (incoming >= run.maxHp * D.CARE.heavyHitRatio) {
      run.happiness = clamp(run.happiness - D.CARE.heavyHitHappinessLoss, 0, D.CARE.happinessMax);
    } else {
      run.happiness = clamp(run.happiness - D.CARE.hitHappinessLoss, 0, D.CARE.happinessMax);
    }
    sfx("hurt");
    if (run.hp <= 0) {
      run.hp = 0;
      noteFaint();
      addFloat(run.mx, run.my - 28, "Fainted!", "#c0a0ff");
      burst(run.mx, run.my, "#c0a0ff", 16, 140);
    }
  }

  function hurtPlayer(dmg) { hurtTamer(dmg); }

  /* ---------- Weapons ---------- */
  function dmgMul() {
    var tier = D.happinessTier(run.happiness);
    var sp = D.SPECIES[run.form];
    var boost = (run.atkBoost > 0 && D.CAPTURE) ? D.CAPTURE.atkBoostMul : 1;
    return run.stats.damageMul * sp.base.damage * tier.damage * (run.desperation ? D.CARE.desperationDamageOut : 1) * boost;
  }

  function neglectState() {
    var n = D.NEGLECT;
    var out = { move: 1, fire: 1, acquire: 1, tags: [] };
    /* Low hunger is silent in combat — no move/fire/acquire penalties or Hungry/Starving tags. */
    if (state !== "playing") {
      if (run.fullness <= n.starvingFullness) { out.move *= n.starving.move; out.fire *= n.starving.fire; out.acquire *= n.starving.acquire; out.tags.push("Starving"); }
      else if (run.fullness <= n.hungryFullness) { out.move *= n.hungry.move; out.fire *= n.hungry.fire; out.acquire *= n.hungry.acquire; out.tags.push("Hungry"); }
    }
    if (run.happiness < n.miserableHappiness) { out.move *= n.miserable.move; out.fire *= n.miserable.fire; out.acquire *= n.miserable.acquire; out.tags.push("Miserable"); }
    else if (run.happiness < n.sadHappiness) { out.move *= n.sad.move; out.fire *= n.sad.fire; out.acquire *= n.sad.acquire; out.tags.push("Sad"); }
    if (run.faint > 0) out.tags.push("Fainted");
    return out;
  }

  function fireRateMul() {
    var tier = D.happinessTier(run.happiness);
    var ngl = neglectState();
    return (tier.fireRate * ngl.fire * (run.desperation ? D.CARE.desperationFireRate : 1)) / run.stats.cooldownMul;
  }

  function extraShots() {
    return D.happinessTier(run.happiness).extraShots;
  }

  function fireProjectile(def, lv, ang, kind) {
    var n = norm(Math.cos(ang), Math.sin(ang));
    bullets.push({
      x: run.mx + n.x * 14,
      y: run.my + n.y * 8,
      vx: n.x * lv.speed,
      vy: n.y * lv.speed,
      damage: lv.damage * dmgMul(),
      radius: lv.radius,
      pierce: lv.pierce || 0,
      life: lv.life || 1.6,
      color: def.color,
      glow: def.glow,
      kind: kind || "projectile",
      knockback: lv.knockback || 0,
      homing: lv.homing || 0,
      explode: lv.explode || 0,
      slow: lv.slow,
      slowTime: lv.slowTime,
      hit: {}
    });
  }

  function weaponReach(def, lv) {
    if (def.type === "arc") return lv.range || 80;
    if (def.type === "aura") return lv.radius || 52;
    var r = (lv.speed || 320) * (lv.life || 1.2) + (lv.radius || 6);
    return lv.homing ? r * 1.3 : r;
  }
  function weaponTarget(w, def, lv) {
    var reach = weaponReach(def, lv), best = null, bestD = 1e15, i, e, d, rr;
    var pref = run.monTarget;
    if (pref && !pref.dead && enemies.indexOf(pref) >= 0) {
      rr = reach + (pref.radius || 10);
      if (dist2(run.mx, run.my, pref.x, pref.y) <= rr * rr) return pref;
    }
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i];
      if (e.dead) continue;
      d = dist2(run.mx, run.my, e.x, e.y);
      rr = reach + (e.radius || 10);
      if (d <= rr * rr && d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  function fireWeapon(w, preTarget) {
    var def = D.WEAPONS[w.id];
    if (!def) return;
    var lv = def.levels[Math.min(w.level, def.maxLevel) - 1];
    var target = preTarget || run.monTarget || nearestEnemy(run.x, run.y);
    var ang = run.aim;
    if (target) ang = Math.atan2(target.y - run.my, target.x - run.mx);
    run.aim = ang;
    var count = (lv.count || 1) + extraShots();
    var spread = lv.spread || 0.15;
    var i, a, mid;
    if (def.type === "projectile" || def.type === "missile" || def.type === "nova") {
      mid = (count - 1) / 2;
      for (i = 0; i < count; i++) {
        a = ang + (i - mid) * spread;
        fireProjectile(def, lv, a, def.type === "nova" ? "nova" : (def.type === "missile" ? "missile" : "projectile"));
      }
    } else if (def.type === "arc") {
      arcs.push({
        angle: ang,
        range: lv.range,
        arc: lv.arc,
        damage: lv.damage * dmgMul(),
        knockback: lv.knockback || 0,
        life: lv.duration,
        max: lv.duration,
        color: def.color,
        hit: {}
      });
    }
    /* aura + orbit tick in updateWeapons */
  }

  function updateWeapons(dt) {
    var i, w, def, lv, rate, j, e, ox, oy, dx, dy, d, ang, count, spinR, size;
    if (run.faint > 0 || isEggForm(run.form)) return;
    rate = fireRateMul();
    for (i = 0; i < run.weapons.length; i++) {
      w = run.weapons[i];
      def = D.WEAPONS[w.id];
      if (!def) continue;
      lv = def.levels[Math.min(w.level, def.maxLevel) - 1];
      if (def.type === "aura") {
        w.cd -= dt;
        if (w.cd <= 0) {
          w.cd = lv.cooldown / rate;
          for (j = 0; j < enemies.length; j++) {
            e = enemies[j];
            if (dist2(run.mx, run.my, e.x, e.y) <= Math.pow(lv.radius + e.radius, 2)) {
              hurtEnemy(e, lv.damage * dmgMul(), e.x - run.mx, e.y - run.my, 20);
            }
          }
        }
      } else if (def.type === "orbit") {
        count = lv.count;
        spinR = lv.radius;
        size = lv.size;
        w.spin = (w.spin || 0) + lv.spin * dt;
        for (j = 0; j < enemies.length; j++) {
          e = enemies[j];
          for (ox = 0; ox < count; ox++) {
            ang = w.spin + (Math.PI * 2 * ox) / count;
            dx = run.mx + Math.cos(ang) * spinR - e.x;
            dy = run.my + Math.sin(ang) * spinR - e.y;
            if (dx * dx + dy * dy < Math.pow(size + e.radius, 2)) {
              e._orbHit = e._orbHit || {};
              if (!e._orbHit[w.id] || run.time - e._orbHit[w.id] > lv.cooldown / rate) {
                e._orbHit[w.id] = run.time;
                hurtEnemy(e, lv.damage * dmgMul(), -dx, -dy, 30);
              }
            }
          }
        }
      } else {
        w.cd -= dt;
        if (w.cd <= 0) {
          /* Attack on the move: only spend the shot on something in reach. */
          var tgtW = weaponTarget(w, def, lv);
          if (!tgtW && (def.type === "projectile" || def.type === "arc")) { w.cd = 0; continue; }
          w.cd = lv.cooldown / rate;
          fireWeapon(w, tgtW);
        }
      }
    }

    for (i = arcs.length - 1; i >= 0; i--) {
      var a = arcs[i];
      a.life -= dt;
      for (j = 0; j < enemies.length; j++) {
        e = enemies[j];
        if (a.hit[j + ":" + e.x]) continue;
        dx = e.x - run.mx;
        dy = e.y - run.my;
        d = len(dx, dy);
        if (d > a.range + e.radius) continue;
        ang = Math.atan2(dy, dx) - a.angle;
        while (ang > Math.PI) ang -= Math.PI * 2;
        while (ang < -Math.PI) ang += Math.PI * 2;
        if (Math.abs(ang) <= a.arc / 2 + 0.15) {
          a.hit[j + ":" + e.x] = true;
          hurtEnemy(e, a.damage, dx, dy, a.knockback);
        }
      }
      if (a.life <= 0) arcs.splice(i, 1);
    }
  }

  function explodeAt(x, y, radius, damage, knock) {
    var i, e, dx, dy, d;
    burst(x, y, "#ffd200", 22, 220);
    shake = Math.max(shake, 9);
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i];
      dx = e.x - x;
      dy = e.y - y;
      d = len(dx, dy);
      if (d < radius + e.radius) hurtEnemy(e, damage * (1 - d / (radius + 40)), dx, dy, knock);
    }
  }

  function updateBullets(dt) {
    var i, b, j, e, dx, dy, n, target, sp;
    for (i = bullets.length - 1; i >= 0; i--) {
      b = bullets[i];
      if (b.homing) {
        target = nearestEnemy(b.x, b.y);
        if (target) {
          n = norm(target.x - b.x, target.y - b.y);
          b.vx += n.x * b.homing * 60 * dt;
          b.vy += n.y * b.homing * 60 * dt;
          sp = len(b.vx, b.vy);
          if (sp > 0) {
            var cap = D.WEAPONS.gigaDestroyer.levels[0].speed + 80;
            if (sp > cap) { b.vx = b.vx / sp * cap; b.vy = b.vy / sp * cap; }
          }
        }
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (!reducedFx) {
        b._trail = (b._trail || 0) + dt;
        if (b._trail >= ((D.FX && D.FX.trailInterval) || 0.028)) {
          b._trail = 0;
          addParticle(b.x, b.y, b.vx * -0.08, b.vy * -0.08, b.glow || b.color || "#ffb040", 0.18, Math.max(3, (b.radius || 6) * 0.7), "trail", true, 0);
        }
      }
      if (b.life <= 0 || dist2(b.x, b.y, run.x, run.y) > 1600 * 1600) {
        if (b.explode) explodeAt(b.x, b.y, b.explode, b.damage, b.knockback);
        bullets.splice(i, 1);
        continue;
      }
      for (j = 0; j < enemies.length; j++) {
        e = enemies[j];
        if (e.dead) continue;
        dx = b.x - e.x;
        dy = b.y - e.y;
        if (dx * dx + dy * dy < Math.pow(b.radius + e.radius, 2)) {
          if (b.hit[e._id]) continue;
          b.hit[e._id] = true;
          hurtEnemy(e, b.damage, b.vx, b.vy, b.knockback);
          if (b.slow && b.slowTime) {
            e.slow = b.slow;
            e.slowTime = b.slowTime;
          }
          if (b.explode) {
            explodeAt(b.x, b.y, b.explode, b.damage, b.knockback);
            bullets.splice(i, 1);
            break;
          }
          b.pierce -= 1;
          if (b.pierce < 0) {
            bullets.splice(i, 1);
            break;
          }
        }
      }
    }
  }

  /* ---------- Enemies / waves ---------- */
  var nextId = 1;

  function spawnEnemy(type) {
    var flags = arguments.length > 1 && arguments[1] ? arguments[1] : {};
    if (!flags.fieldMega && !flags.keepType && D.weather) {
      type = D.weather.remapType(type, run, D, Math.random);
    }
    var def = D.ENEMIES[type];
    if (!def) return;
    if (D.sprites && D.sprites.preloadSpecies) D.sprites.preloadSpecies(type, true);
    var wave = D.waveAt(run.time);
    var margin = 36;
    var halfW = viewW / 2 + margin;
    var halfH = viewH / 2 + margin;
    var side = (Math.random() * 4) | 0;
    var sx, sy;
    if (side === 0) { sx = run.x - halfW; sy = run.y + rand(-halfH, halfH); }
    else if (side === 1) { sx = run.x + halfW; sy = run.y + rand(-halfH, halfH); }
    else if (side === 2) { sy = run.y - halfH; sx = run.x + rand(-halfW, halfW); }
    else { sy = run.y + halfH; sx = run.x + rand(-halfW, halfW); }
    var hpMul = wave.hpMul;
    var fieldMega = !!flags.fieldMega;
    var megaCfg = D.MEGA_SPAWN || {};
    if (def.boss) {
      var nBoss = Math.max(0, Math.floor((run.time - D.BOSSES.firstAt) / D.BOSSES.every));
      hpMul *= 1 + nBoss * D.BOSSES.hpScalePer;
    }
    if (fieldMega) hpMul *= (megaCfg.hpMul != null ? megaCfg.hpMul : 8);
    enemies.push({
      _id: nextId++,
      type: type,
      x: sx,
      y: sy,
      hp: def.hp * hpMul,
      maxHp: def.hp * hpMul,
      facing: 1,
      flash: 0,
      hitCd: 0,
      slow: 1,
      slowTime: 0,
      radius: actorRad(type),
      dead: false,
      mega: fieldMega,
      dmgMul: fieldMega ? (megaCfg.dmgMul != null ? megaCfg.dmgMul : 1.45) : 1,
      spdMul: 1
    });
    if (D.weather) D.weather.applySpawnStats(enemies[enemies.length - 1], run, D);
    if (fieldMega) {
      var megaName = def.name || type;
      addFloat(sx, sy - 48, "MEGA — " + megaName + "!", "#ffb040");
      showNoticeToast("MEGA — " + megaName + " appears!", "is-mega");
      sfx("hurt");
    }
  }

  function updateSpawns(dt) {
    var wave = D.stageWave ? D.stageWave(run.time, D.partnerStageIdx(run.form), run.worldSeed || 1) : D.waveAt(run.time);
    var type, acc, rate, nonBoss = 0, i;
    for (i = 0; i < enemies.length; i++) {
      if (!(D.ENEMIES[enemies[i].type] && D.ENEMIES[enemies[i].type].boss)) nonBoss += 1;
    }
    if (!spawnsOpen()) return;
    if (!run.openingSpawned) {
      run.openingSpawned = true;
      var opening = (D.HATCH && D.HATCH.openingFlood) || 6;
      for (i = 0; i < opening; i++) { spawnEnemy("pagumon"); nonBoss += 1; }
    }
    var rates = D.stageWave ? wave.rates : currentWaveRates(wave);
    for (type in rates) {
      if (!Object.prototype.hasOwnProperty.call(rates, type)) continue;
      if (D.sprites && D.sprites.preloadSpecies) D.sprites.preloadSpecies(type, false);
      rate = rates[type];
      var ot = (D.farm && D.farm.overtimeMul) ? D.farm.overtimeMul(run) : 1;
      var spawnMul = D.weather ? D.weather.spawnIntervalScale(run, D) : 1;
      var capMul = D.weather ? D.weather.spawnCapScale(run, D) : 1;
      acc = (run.spawnAcc[type] || 0) + dt * ot * spawnMul;
      var cap = Math.floor((wave.cap + Math.max(0, Math.floor((ot - 1) * 2))) * capMul);
      while (acc >= rate) {
        acc -= rate;
        if (nonBoss < cap) {
          spawnEnemy(type);
          nonBoss += 1;
        }
      }
      run.spawnAcc[type] = acc;
    }
    maybeSpawnFieldMega(dt, wave, nonBoss);
    if (run.time >= D.BOSSES.firstAt && (run.time - Math.max(D.BOSSES.firstAt, run.lastBoss + (run.lastBoss < 0 ? 0 : 0))) >= 0) {
      if (run.lastBoss < 0 || run.time - run.lastBoss >= D.BOSSES.every) {
        var bossType = bossTypeForTime();
        spawnEnemy(bossType);
        run.lastBoss = run.time;
        var bossName = (D.ENEMIES[bossType] && D.ENEMIES[bossType].name) || bossType;
        addFloat(run.x, run.y - 48, bossName + " appears!", "#ff8080");
      }
    }
  }

  /* Enemies may touch a Digimon but never stand inside it. */
  function separateEnemy(e, x, y, rad) {
    var dx = e.x - x, dy = e.y - y, min = (e.radius || 10) + rad, d2 = dx * dx + dy * dy;
    if (d2 >= min * min) return;
    var d = Math.sqrt(d2);
    if (d < 0.001) { var a0 = (e._id || 1) * 2.399; dx = Math.cos(a0); dy = Math.sin(a0); d = 1; }
    var pos = slideMove(e.x, e.y, x + dx / d * min - e.x, y + dy / d * min - e.y, Math.max(4, (e.radius || 10) * 0.6), crossOf(e.type));
    e.x = pos.x; e.y = pos.y;
  }

  function updateEnemies(dt) {
    var i, e, def, wave, spd, n, dmg;
    wave = D.waveAt(run.time);
    for (i = enemies.length - 1; i >= 0; i--) {
      e = enemies[i];
      if (e.dead) { enemies.splice(i, 1); continue; }
      def = D.ENEMIES[e.type];
      e.flash = Math.max(0, e.flash - dt);
      e.hitCd = Math.max(0, e.hitCd - dt);
      if (e.slowTime > 0) e.slowTime -= dt;
      else e.slow = 1;
      var wSpd = D.weather ? D.weather.enemySpeedScale(run, D) : 1;
      spd = def.speed * wave.spdMul * e.slow * wSpd;
      if (def.fly) e.y += Math.sin(run.time * 5 + e._id) * 12 * dt;
      var tDist = dist2(e.x, e.y, run.x, run.y);
      var mDist = (run.faint > 0 || isEggForm(run.form)) ? 1e15 : dist2(e.x, e.y, run.mx, run.my);
      var aDist = (run.ally && run.ally.hp > 0 && !isEggForm(run.ally.form)) ? dist2(e.x, e.y, run.ally.x, run.ally.y) : 1e15;
      var ax = run.x, ay = run.y, closest = tDist;
      if (mDist < closest) { closest = mDist; ax = run.mx; ay = run.my; }
      if (aDist < closest) { closest = aDist; ax = run.ally.x; ay = run.ally.y; }
      var ci, cm, cDist;
      for (ci = 0; ci < (run.cpuMates || []).length; ci++) {
        cm = run.cpuMates[ci];
        if (!cm || cm.hp <= 0 || isEggForm(cm.form)) continue;
        cDist = dist2(e.x, e.y, cm.x, cm.y);
        if (cDist < closest) { closest = cDist; ax = cm.x; ay = cm.y; }
      }
      n = norm(ax - e.x, ay - e.y);
      if (e.kbStun > 0) e.kbStun -= dt;
      else { e.x += n.x * spd * dt; e.y += n.y * spd * dt; }
      if (e.kvx || e.kvy) {
        var kp = slideMove(e.x, e.y, e.kvx * dt, e.kvy * dt, Math.max(4, e.radius * 0.6), crossOf(e.type));
        e.x = kp.x; e.y = kp.y;
        var kdec = Math.exp(-((D.KNOCKBACK && D.KNOCKBACK.decay) || 11) * dt);
        e.kvx *= kdec; e.kvy *= kdec;
        if (Math.abs(e.kvx) + Math.abs(e.kvy) < 4) { e.kvx = 0; e.kvy = 0; }
      }
      if (n.x !== 0) e.facing = n.x < 0 ? -1 : 1;
      if (run.faint <= 0 && !isEggForm(run.form)) separateEnemy(e, run.mx, run.my, actorRad(run.form));
      if (run.ally && run.ally.hp > 0) separateEnemy(e, run.ally.x, run.ally.y, actorRad(run.ally.form));
      mDist = dist2(e.x, e.y, run.mx, run.my);
      if (run.ally) aDist = dist2(e.x, e.y, run.ally.x, run.ally.y);
      var wAtk = D.weather ? D.weather.enemyAtkScale(run, D) : 1;
      dmg = def.damage * wave.dmgMul * (e.dmgMul || 1) * wAtk;
      if (e.hitCd <= 0 && tDist < Math.pow(e.radius + D.TAMER.radius, 2)) {
        hurtTamer(dmg);
        e.hitCd = def.contactCd;
      }
      if (run.faint <= 0 && !isEggForm(run.form) && (e.hitCdM || 0) <= 0 && mDist < Math.pow(e.radius + actorRad(run.form) + 3, 2)) {
        hurtMon(dmg);
        e.hitCdM = def.contactCd;
      }
      if (run.ally && (e.hitCdA || 0) <= 0 && aDist < Math.pow(e.radius + actorRad(run.ally.form) + 3, 2)) {
        hurtAlly(dmg);
        e.hitCdA = def.contactCd;
      }
      e.hitCdCpu = e.hitCdCpu || {};
      for (ci = 0; ci < (run.cpuMates || []).length; ci++) {
        cm = run.cpuMates[ci];
        if (!cm || cm.hp <= 0 || isEggForm(cm.form)) continue;
        cDist = dist2(e.x, e.y, cm.x, cm.y);
        e.hitCdCpu[cm.id] = Math.max(0, (e.hitCdCpu[cm.id] || 0) - dt);
        if ((e.hitCdCpu[cm.id] || 0) <= 0 && cDist < Math.pow(e.radius + actorRad(cm.form) * 0.7, 2)) {
          hurtCpuMate(cm, dmg);
          e.hitCdCpu[cm.id] = def.contactCd;
        }
      }
      e.hitCdM = Math.max(0, (e.hitCdM || 0) - dt);
      e.hitCdA = Math.max(0, (e.hitCdA || 0) - dt);
    }
  }

  /* ---------- Pickups & care ---------- */

  function pickFoodType() {
    var id, def, total = 0, roll;
    for (id in D.FOOD) total += D.FOOD[id].dropWeight;
    roll = Math.random() * total;
    for (id in D.FOOD) {
      roll -= D.FOOD[id].dropWeight;
      if (roll <= 0) return id;
    }
    return "meat";
  }

  function isFoodKind(kind) { return !!(D.FOOD && D.FOOD[kind]); }

  function monSpeed() {
    var sp = D.SPECIES[run.form];
    var ngl = neglectState();
    return sp.base.speed * 1.08 * ngl.move * (run.desperation ? D.CARE.desperationSpeed : 1);
  }

  /* ---------- feed menu (F) ----------
   * Walk up to your Digimon and press F, at the farm or in the middle of a
   * fight: a little strip of what is in the bag pops up. Pick with the number
   * keys or a tap; it eats on the spot and the game never pauses. F or Esc
   * closes it, and so does walking away. */
  var feedMenu = { open: false, ids: [], sig: "" };
  var evoBoostNote = null, evoLuckyNote = false;

  /* ---------- skill tree ----------
   * One skill point per job level. K (or the chip under the bars) opens the
   * tree for the partner's line; the game keeps running. */
  var skillsUi = { open: false, sig: "" };
  function skillsActive() { return !!(run && !run.ended && D.SKILLS && run.skills && !isEggForm(run.form) && (state === "playing" || state === "farm" || state === "paused")); }
  function toggleSkills(force) {
    skillsUi.open = force != null ? !!force : !skillsUi.open;
    if (!skillsActive()) skillsUi.open = false;
    skillsUi.view = "cards";                       /* a pending offer is always shown first */
    skillsUi.sig = "";
    tickSkills();
  }
  /* A job level-up opens the tree in the middle of the screen for a few
   * seconds (nothing can hurt the partner meanwhile). When the time is up it
   * shrinks back to the chip; a point not spent is kept. */
  var levelWin = { t: 0, max: 0 };
  function levelWindow(sec, hold) {
    var panel = $("skills-panel"), bar;
    levelWin.t = levelWin.max = sec;
    levelWin.at = Date.now();              /* it appears under the cursor: a click already on its way does not pick a card */
    levelWin.hold = !!hold;                /* solo: no countdown, enemies wait until the window closes */
    toggleSkills(true);
    if (!panel || panel.hidden) {          /* the window could not open: do not leave the enemies waiting */
      levelWin.t = 0;
      if (missionAuth && run && !run.ended) missionAuth.act({ type: "breather.end", id: missionLocalId });
      return;
    }
    panel.classList.add("is-center");
    bar = $("skills-timer");
    if (!bar) { bar = document.createElement("div"); bar.id = "skills-timer"; bar.innerHTML = "<i></i><span></span>"; panel.insertBefore(bar, panel.firstChild); }
    bar.hidden = false;
  }
  function levelWindowEnd(keepOpen) {
    var panel = $("skills-panel"), bar = $("skills-timer"), early = levelWin.t > 0.15;
    levelWin.t = 0;
    /* closed before the time ran out: the breather ends now, enemies come on again */
    if (early && missionAuth && run && !run.ended) missionAuth.act({ type: "breather.end", id: missionLocalId });
    if (panel) panel.classList.remove("is-center");
    if (bar) bar.hidden = true;
    if (!keepOpen) toggleSkills(false);
  }
  function tickLevelWindow(dt) {
    if (!(levelWin.t > 0)) return;
    var panel = $("skills-panel"), bar = $("skills-timer");
    if (!panel || panel.hidden || !skillsUi.open) { levelWindowEnd(true); return; }     /* closed by hand: the point is kept */
    if (!levelWin.hold && (state === "playing" || state === "farm")) levelWin.t -= dt || 0;
    if (bar) {
      bar.firstChild.style.width = levelWin.hold ? "100%" : Math.max(0, 100 * levelWin.t / levelWin.max) + "%";
      bar.lastChild.textContent = levelWin.hold ? "Enemies wait while this is open" : "Safe for " + Math.max(0, levelWin.t).toFixed(1) + "s  \u00b7  closing this ends it";
    }
    if (levelWin.t <= 0) levelWindowEnd(false);
  }
  function addSkill(id) {
    if (!missionAuth || !run || !(run.skillPoints > 0)) return;
    if (levelWin.t > 0 && Date.now() - (levelWin.at || 0) < LEVEL_FX.clickGuard * 1000) return;
    var res = missionAuth.act({ type: "skill.add", id: missionLocalId, skill: id }) || { ok: false };
    if (!res.ok) { if (res.reason) showNoticeToast(res.reason); return; }
    applyMissionSnapshot(takeMissionSnapshot());
    sfx("ui");
    skillsUi.sig = "";
    skillsUi.view = "cards";
    tickSkills();
    updateHud();
    /* the point is spent: the level-up window has done its job */
    if (levelWin.t > 0 && !(run.skillPoints > 0)) levelWindowEnd(false);
  }
  function tickSkills() {
    var chip = $("skills-chip"), panel = $("skills-panel"), SK = D.SKILLS, on = skillsActive();
    if (!chip || !panel || !SK) return;
    chip.hidden = !on;
    if (!on) { panel.hidden = true; skillsUi.open = false; return; }
    var pts = run.skillPoints || 0, sk = run.skills || {}, t, act, firing = {}, html = "", i, s, list, e, def, lv, why, sig, rows, btns, ml, ico, cv, g, p, legacy;
    $("skills-chip-text").textContent = "Job Lv " + (run.level || 1) + (pts ? "" : "  \u00b7  Skills" + kh("skills"));
    $("skills-chip-badge").hidden = !pts;
    $("skills-chip-badge").textContent = pts + (pts === 1 ? " pt" : " pts") + kh("skills");
    chip.classList.toggle("has-points", pts > 0);
    panel.hidden = !skillsUi.open;
    if (!skillsUi.open) return;
    /* Level-up cards: with a point to spend and an offer waiting, the panel
     * shows the three cards. "Skip" turns to the tree, where the point can
     * go into anything already known. New skills come only from cards. */
    var offer = (D.SKILL_CARDS && run.skillOffer ? run.skillOffer : []).filter(function (id) { return !SK.blocked(D, run.form, sk, id); });
    var cardsOn = !!(D.SKILL_CARDS && run.skillOffer), showCards = pts > 0 && offer.length > 0 && skillsUi.view !== "tree";
    skillsUi.cards = showCards ? offer : null;
    sig = run.form + "|" + pts + "|" + JSON.stringify(sk) + "|" + (showCards ? "c" : "t") + offer.join(",");
    if (sig === skillsUi.sig) return;
    skillsUi.sig = sig;
    if (showCards) {
      $("skills-title").textContent = ((D.SPECIES[run.form] && D.SPECIES[run.form].name) || "Partner") + "  \u00b7  Job Lv " + (run.level || 1);
      $("skills-points").textContent = "Choose one  (" + pts + (pts === 1 ? " point" : " points") + " to spend)";
      html = "<div class='skill-cards'>";
      for (i = 0; i < offer.length; i++) {
        e = offer[i]; p = SK.PASSIVE_BY[e]; def = D.WEAPONS[e] || { name: e }; lv = sk[e] || 0;
        html += "<button type='button' class='skill-card" + (lv ? "" : " is-new") + "' data-skill='" + e + "'><kbd>" + (i + 1) + "</kbd>" +
          "<canvas width='48' height='48' data-ico='" + (p ? p.icon : e) + "'></canvas>" +
          "<b>" + (p ? p.name : def.name) + "</b>" +
          "<i>" + (lv ? "Lv " + lv + " \u2192 " + (lv + 1) : "NEW") + "</i>" +
          "<span>" + (p ? p.text + " per level" : (def.summary || "")) + "</span></button>";
      }
      html += "</div><button type='button' class='skill-skip' id='skill-skip'>Skip the cards: raise something I already know</button>";
      rows = $("skills-rows");
      rows.innerHTML = html;
      btns = rows.querySelectorAll("canvas");
      for (i = 0; i < btns.length; i++) {
        cv = btns[i]; ico = D.sprites.getIcon && D.sprites.getIcon(cv.getAttribute("data-ico"));
        g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
        if (ico) g.drawImage(ico, 0, 0, 48, 48);
      }
      btns = rows.querySelectorAll(".skill-card");
      for (i = 0; i < btns.length; i++) btns[i].addEventListener("click", function (ev) { addSkill(this.getAttribute("data-skill")); ev.preventDefault(); });
      $("skill-skip").addEventListener("click", function () { skillsUi.view = "tree"; skillsUi.sig = ""; sfx("ui"); tickSkills(); });
      return;
    }
    function cardOnly(id, level) { return cardsOn && !(level > 0) && offer.indexOf(id) < 0; }
    if (cardsOn) html += "<div class='skill-note'>New skills come from level-up cards. Here a point can raise anything you already know." +
      (pts > 0 && offer.length ? " <button type='button' id='skill-back'>Back to the cards</button>" : "") + "</div>";
    t = SK.tree(D, run.form, sk); act = SK.active(D, sk);
    for (i = 0; i < act.length; i++) firing[act[i].id] = act[i];
    $("skills-title").textContent = ((D.SPECIES[run.form] && D.SPECIES[run.form].name) || "Partner") + "  \u00b7  Job Lv " + (run.level || 1);
    $("skills-points").textContent = "Skill points: " + pts;
    for (s = 0; s < SK.SLOTS.length; s++) {
      list = t.slots[SK.SLOTS[s]];
      if (!list.length) continue;
      html += "<div class='skill-group'>" + SK.SLOT_NAME[SK.SLOTS[s]] + "</div>";
      for (i = 0; i < list.length; i++) {
        e = list[i]; def = D.WEAPONS[e.id] || { name: e.id }; lv = sk[e.id] || 0; why = SK.blocked(D, run.form, sk, e.id);
        legacy = lv > 0 && !firing[e.id];
        html += "<div class='skill-row" + (why && !lv ? " is-locked" : "") + (firing[e.id] ? " is-firing" : "") + "'><canvas width='36' height='36' data-ico='" + e.id + "'></canvas>" +
          "<span class='skill-name'>" + def.name + "<span class='skill-sub'>" +
          (firing[e.id] ? "In use" + (firing[e.id].bonus > 1.001 ? "  \u00b7  +" + Math.round((firing[e.id].bonus - 1) * 100) + "% damage" : "") : (legacy ? "Adds to the bigger move" : (why && !lv ? why : (SK.STAGE_NAME[e.tier] || "") + " move"))) + "</span></span>" +
          "<span class='skill-lv'>Lv " + lv + "/" + SK.MAX + "</span>" +
          "<button type='button' data-skill='" + e.id + "'" + (why || pts < 1 || cardOnly(e.id, lv) ? " disabled" : "") + ">+</button></div>";
      }
    }
    html += "<div class='skill-group'>Masteries</div>";
    for (i = 0; i < SK.PASSIVES.length; i++) {
      p = SK.PASSIVES[i]; lv = sk[p.id] || 0;
      html += "<div class='skill-row'><canvas width='36' height='36' data-ico='" + p.icon + "'></canvas><span class='skill-name'>" + p.name + "<span class='skill-sub'>" + p.text + " per level</span></span>" +
        "<span class='skill-lv'>Lv " + lv + "/" + SK.MAX + "</span><button type='button' data-skill='" + p.id + "'" + (lv >= SK.MAX || pts < 1 || cardOnly(p.id, lv) ? " disabled" : "") + ">+</button></div>";
    }
    rows = $("skills-rows");
    rows.innerHTML = html;
    btns = rows.querySelectorAll("canvas");
    for (i = 0; i < btns.length; i++) {
      cv = btns[i]; ico = D.sprites.getIcon && D.sprites.getIcon(cv.getAttribute("data-ico"));
      g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
      if (ico) g.drawImage(ico, 0, 0, 36, 36);
    }
    btns = rows.querySelectorAll("button[data-skill]");
    for (i = 0; i < btns.length; i++) btns[i].addEventListener("click", function (ev) { addSkill(this.getAttribute("data-skill")); ev.preventDefault(); });
    if ($("skill-back")) $("skill-back").addEventListener("click", function () { skillsUi.view = "cards"; skillsUi.sig = ""; sfx("ui"); tickSkills(); });
  }

  /* ---------- tamer level and stat points ----------
   * The tamer levels slowly off the same XP. Each level gives 10 points to
   * put into the partner's six stats. T (or the chip under the bars) opens
   * the panel; the game keeps running. Everything here resets with the run. */
  var statsUi = { open: false, sig: "", seen: 0 }, statArrowOn = false;
  /* points that arrived since the status window was last open */
  function statsUnseen() { return !!run && (run.statPoints || 0) > (statsUi.seen || 0) && !statsUi.open; }
  function statsActive() { return !!(run && !run.ended && D.TAMER_LEVEL && D.RO && (state === "playing" || state === "farm" || state === "paused" || state === "levelup")); }
  function toggleStats(force) {
    statsUi.open = force != null ? !!force : !statsUi.open;
    if (!statsActive()) statsUi.open = false;
    statsUi.sig = "";
    tickStats();
  }
  function addStat(stat, n) {
    if (!missionAuth || !run || !(run.statPoints > 0)) return;
    var res = missionAuth.act({ type: "stat.add", id: missionLocalId, stat: stat, n: n }) || { ok: false };
    if (!res.ok) return;
    applyMissionSnapshot(takeMissionSnapshot());
    sfx("ui");
    statsUi.sig = "";
    tickStats();
    updateHud();
  }
  function tickStats() {
    var chip = $("stats-chip"), panel = $("stats-panel"), RO = D.RO, on = statsActive() && !!RO;
    if (!chip || !panel || !RO) return;
    chip.hidden = !on || isEggForm(run.form);
    if (!on) { panel.hidden = true; statsUi.open = false; return; }
    var pts = run.statPoints || 0, lvl = run.tamerLevel || 1, at = run.attrs || RO.fresh(), bo = run.attrBonus || {}, i, id, html = "", sig, rows, btns, c, dv, cheapest = 99;
    for (i = 0; i < RO.ORDER.length; i++) if ((at[RO.ORDER[i]] || 1) < RO.CFG.cap) cheapest = Math.min(cheapest, RO.cost(at[RO.ORDER[i]] || 1));
    var canSpend = pts >= cheapest;
    $("stats-chip-text").textContent = "Base Lv " + lvl + (canSpend ? "" : "  \u00b7  Status" + kh("stats"));
    $("stats-chip-badge").hidden = !canSpend;
    $("stats-chip-badge").textContent = pts + " pts" + kh("stats");
    chip.classList.toggle("has-points", canSpend);
    /* say so the first few times points arrive, and again if they sit unspent */
    if (canSpend && (pts > (statsUi.lastPts || 0) || run.time - (statsUi.nagAt || 0) > 60) && !statsUi.open) {
      if ((statsUi.nudges || 0) < 3 || pts <= (statsUi.lastPts || 0)) {
        showNoticeToast("You have " + pts + " stat points to spend.  " + (D.input.lastSource === "touch" ? "Tap the gold Base button." : D.input.lastSource === "gamepad" ? "Press R3." : "Press T, or click the gold Base button.")); noticeToastTimer = 4;
        statsUi.nudges = (statsUi.nudges || 0) + 1;
      }
      statsUi.nagAt = run.time;
    }
    statsUi.lastPts = pts;
    /* what the window has shown you is seen; spending brings the mark down with it */
    if (statsUi.open || pts < (statsUi.seen || 0)) statsUi.seen = pts;
    panel.hidden = !statsUi.open;
    if (!statsUi.open) return;
    $("stats-title").textContent = "Base Lv " + lvl + "   \u00b7   Job Lv " + (run.level || 1);
    $("stats-xp-fill").style.width = Math.round(clamp((run.tamerXp || 0) / (run.tamerXpNext || 1), 0, 1) * 100) + "%";
    $("stats-points").textContent = "Status points: " + pts;
    sig = pts + "|" + lvl + "|" + RO.ORDER.map(function (k) { return (at[k] || 1) + "+" + (bo[k] || 0); }).join(",");
    if (sig === statsUi.sig) return;
    statsUi.sig = sig;
    for (i = 0; i < RO.ORDER.length; i++) {
      id = RO.ORDER[i]; c = RO.cost(at[id] || 1);
      html += "<div class='stat-row'><span class='stat-name'>" + RO.NAMES[id] + "<span class='stat-desc'>" + RO.TEXT[id] + "</span></span>" +
        "<span class='stat-val'>" + (at[id] || 1) + (bo[id] ? "<i>+" + bo[id] + "</i>" : "") + "</span>" +
        "<button type='button' data-stat='" + id + "' data-n='1'" + (pts < c || (at[id] || 1) >= RO.CFG.cap ? " disabled" : "") + " title='Costs " + c + "'>+1 <small>(" + c + ")</small></button>" +
        "<button type='button' data-stat='" + id + "' data-n='10'" + (pts < c || (at[id] || 1) >= RO.CFG.cap ? " disabled" : "") + " title='Raise up to ten times'>+10</button></div>";
    }
    dv = RO.derive(RO.plus(at, bo), lvl);
    html += "<div class='stat-derived'>" +
      "<span>ATK <b>" + dv.atk + "</b></span><span>MATK <b>" + dv.matkMin + "~" + dv.matkMax + "</b></span>" +
      "<span>HIT <b>" + dv.hit + "</b></span><span>FLEE <b>" + dv.flee + "</b></span>" +
      "<span>CRIT <b>" + dv.crit.toFixed(1) + "%</b></span><span>Lucky dodge <b>" + dv.perfectDodge.toFixed(1) + "%</b></span>" +
      "<span>Attack speed <b>+" + Math.round((1 / dv.delayMul - 1) * 100) + "%</b></span><span>Cast speed <b>+" + Math.round((1 / dv.castMul - 1) * 100) + "%</b></span>" +
      "<span>Max HP <b>+" + Math.round((dv.hpMul - 1) * 100) + "%</b></span><span>DEF <b>" + dv.softDef.toFixed(1) + "</b></span></div>";
    (function () {
      var EL = D.ELEMENTS, el = EL && EL.elementOf(run.form), at2 = EL && EL.attributeOf(run.form), nm;
      if (!el) return;
      nm = function (k) { return "<b style='color:" + EL.COLORS[k] + "'>" + EL.NAMES[k] + "</b>"; };
      html += "<div class='stat-derived stat-element'><span>Element " + nm(el) + (at2 && EL.ATTR_BEATS[at2] ? " &middot; <b>" + at2 + "</b>" : "") + "</span>" +
        "<span>Strong vs " + EL.BEATS[el].map(nm).join(", ") + "</span>" +
        "<span>Weak to " + EL.weakTo(el).map(nm).join(", ") + "</span>" +
        (at2 && EL.ATTR_BEATS[at2] ? "<span>" + at2 + " beats <b>" + EL.ATTR_BEATS[at2] + "</b></span>" : "") + "</div>";
    })();
    rows = $("stats-rows");
    rows.innerHTML = html;
    btns = rows.querySelectorAll("button");
    for (i = 0; i < btns.length; i++) btns[i].addEventListener("click", function (ev) { addStat(this.getAttribute("data-stat"), +this.getAttribute("data-n")); ev.preventDefault(); });
  }

  /* ---------- digivolve prompt ----------
   * When a digivolution is ready the partner asks first. Digivolve now for
   * the jump in health, attack and speed, or say "not yet": it keeps
   * levelling as it is, earns one small random perk, and asks again five
   * levels later. The game does not pause for it. */
  /* the key for an action on the device in hand: " [K]", " [View]", or nothing on touch */
  function kh(action) { return D.input && D.input.hint ? D.input.hint(action) : ""; }
  function evoOfferShown() { return !!(run && !run.ended && run.evoOffer && state === "playing" && !run.downed && !isEggForm(run.form)); }
  function tickEvoOffer(dt) {
    var box = $("evo-offer"), on = evoOfferShown(), nm;
    if (box) {
      if (on && box.hidden) {
        nm = (D.SPECIES[run.form] && D.SPECIES[run.form].name) || "Your partner";
        $("evo-offer-title").textContent = nm + " is ready to digivolve!";
        $("evo-offer-sub").textContent = "Digivolve now for more health, attack and speed. Or wait: a small bonus now, and it asks again in " + ((D.EVO_HOLD && D.EVO_HOLD.everyLevels) || 5) + " levels.";
      }
      box.hidden = !on;
    }
    if (evoBoostNote && state === "playing") {
      evoBoostNote.t -= dt || 0;
      if (evoBoostNote.t <= 0) { showNoticeToast((evoLuckyNote ? "A lucky twist!  " : "") + evoBoostNote.text); evoLuckyNote = false; noticeToastTimer = 4; addFloat(run.mx, run.my - 46, "Power up!", "#ffe27a"); evoBoostNote = null; }
    }
  }
  function answerEvoOffer(yes) {
    if (!evoOfferShown() || !missionAuth) return false;
    var res = missionAuth.act({ type: yes ? "evolve" : "evolve.hold", id: missionLocalId }) || { ok: false };
    run.evoOffer = null;
    if ($("evo-offer")) $("evo-offer").hidden = true;
    if (yes && !res.ok && res.reason === "not-ready") showNoticeToast("It is not ready any more. It will ask again when it is.");
    sfx("ui");
    return !!res.ok;
  }
  /* ---------- DNA digivolution (js/dna.js) ----------
   * J near a teammate whose partner is the other half asks them; they get
   * a prompt. Each tamer picks their own result. The game does not pause. */
  var dnaBox = null;   /* { mode: "pick" | "answer", options, t, from } */
  function spName(id) { return (D.SPECIES[id] && D.SPECIES[id].name) || id; }
  function allyPassiveText(fam) { var A = D.ALLY && D.ALLY.passives && D.ALLY.passives[fam]; return A ? A.label : "none"; }
  function dnaMate() {
    var DNA = D.DNA, o, i, best = null, bd = 1e15, d;
    if (!DNA || !run || run.ended || state !== "playing" || run.downed || isEggForm(run.form)) return null;
    for (i = 0; i < (run.others || []).length; i++) {
      o = run.others[i];
      if (o.downed || o.faint > 0 || !DNA.find(run.form, o.form)) continue;
      d = (o.mx - run.mx) * (o.mx - run.mx) + (o.my - run.my) * (o.my - run.my);
      if (d <= DNA.CFG.range * DNA.CFG.range && d < bd) { bd = d; best = o; }
    }
    /* nobody to pair with: your own caught ally, if it is the other half */
    if (!best && run.ally && run.ally.hp > 0 && DNA.find(run.form, run.ally.form)) best = { form: run.ally.form, ally: true };
    return best;
  }
  function dnaClose() { dnaBox = null; if ($("dna-box")) $("dna-box").hidden = true; }
  function dnaSend(intent) { intent.id = missionLocalId; return missionAuth ? (missionAuth.act(intent) || { ok: false }) : { ok: false }; }
  function dnaPick(i) {
    if (!dnaBox) return;
    var to = dnaBox.options[i], mode = dnaBox.mode;
    if (i >= 0 && !to) return;
    dnaClose();
    sfx("ui");
    if (mode === "pick") { if (i >= 0) dnaSend({ type: "dna.ask", to: to }); }
    else dnaSend({ type: "dna.answer", ok: i >= 0, to: to || "" });
  }
  function dnaOpen(mode, options, title, sub, t) {
    var box = $("dna-box"), row = $("dna-row"), i, b;
    if (!box || !row) return;
    dnaBox = { mode: mode, options: options, t: t || 0 };
    $("dna-title").textContent = title; $("dna-sub").textContent = sub;
    row.innerHTML = "";
    for (i = 0; i < options.length; i++) {
      b = document.createElement("button"); b.type = "button";
      b.innerHTML = "<kbd>" + (i + 1) + "</kbd>" + spName(options[i]);
      (function (k) { b.addEventListener("click", function () { dnaPick(k); }); })(i);
      row.appendChild(b);
    }
    b = document.createElement("button"); b.type = "button"; b.className = "no";
    b.innerHTML = "<kbd>N</kbd>" + (mode === "pick" ? "Cancel" : "Not now");
    b.addEventListener("click", function () { dnaPick(-1); });
    row.appendChild(b);
    box.hidden = false;
  }
  function dnaAsk() {
    var mate = dnaMate(), pair, opts;
    if (!mate || dnaBox) return;
    pair = D.DNA.find(run.form, mate.form); opts = D.DNA.results(pair);
    if (opts.length > 1) dnaOpen("pick", opts, "DNA Digivolve", "Pick the form your " + spName(run.form) + " becomes. " + (mate.ally ? "Your ally joins it for good and you keep its passive." : "Your teammate picks their own."), 0);
    else { sfx("ui"); dnaSend({ type: "dna.ask", to: opts[0] }); }
  }
  function dnaEvent(e) {
    var who, g;
    if (e.type === "dna.offer") {
      who = (D.online && D.online.playerName && D.online.playerName(e.from)) || "A teammate";
      dnaOpen("answer", e.options || [], who + " wants to DNA Digivolve!", "Their " + spName(e.fromForm) + " and your " + spName(run.form) + ". Pick the form yours becomes, or say not now.", e.time || 15);
      sfx("level");
    } else if (e.type === "dna.asked") {
      showNoticeToast("Asked to DNA Digivolve. Waiting for their answer...");
    } else if (e.type === "dna.fail") {
      if (dnaBox && dnaBox.mode === "answer") dnaClose();
      g = e.why === "gate" ? ((e.mine ? "Your partner needs" : "Their partner needs") + " Lv " + e.level + " and " + e.minutes + " minutes in this form first.")
        : e.why === "declined" ? "They said not now."
        : e.why === "timeout" ? "The DNA Digivolve request ran out."
        : e.why === "far" ? "Too far apart to DNA Digivolve."
        : e.why === "nobody" ? "No matching partner close enough."
        : "The DNA Digivolve fell through.";
      showNoticeToast(g);
    } else if (e.type === "dna.done") {
      dnaClose();
      showNoticeToast("DNA Digivolution!  " + spName(e.from) + " became " + spName(e.to) + ".  If it is knocked down it drops back.");
      addFloat(run.mx, run.my - 52, "DNA Digivolve!", "#8fe0ff"); burst(run.mx, run.my - 8, "#8fe0ff", 26, 240);
    } else if (e.type === "dna.revert") {
      showNoticeToast("The DNA form came apart: back to " + spName(e.to) + ".");
    }
  }
  function tickDna(dt) {
    var hint = $("dna-hint"), mate = dnaBox ? null : dnaMate();
    if (dnaBox && dnaBox.t > 0) { dnaBox.t -= dt || 0; if (dnaBox.t <= 0) dnaClose(); }
    if (dnaBox && (state !== "playing" || !run || run.ended)) dnaClose();
    if (hint) {
      if (mate) { hint.innerHTML = "<kbd>E</kbd>DNA Digivolve with " + (mate.ally ? "your ally " : "") + spName(mate.form); hint.hidden = false; }
      else hint.hidden = true;
    }
  }
  /* ---------- warp burst (data.js BURST) ----------
   * The chip under the bars fills as the meter does. R (or a tap) spends it. */
  /* shinies: a line when it happens, and a twinkle on any shiny partner */
  var shinyNote = null, shinyTw = 0;
  function tickShiny(dt) {
    var i, o;
    if (shinyNote && state === "playing") {
      shinyNote.t -= dt || 0;
      if (shinyNote.t <= 0) {
        showNoticeToast("\u2726 A shiny " + spName(shinyNote.form) + "!  One in a thousand. It stays shiny from here on.");
        noticeToastTimer = 7; sfx("level");
        addFloat(run.mx, run.my - 56, "\u2726 SHINY! \u2726", "#ffe27a");
        burst(run.mx, run.my - 10, "#ffffff", 26, 260); burst(run.mx, run.my - 10, "#ffe27a", 20, 200);
        shinyNote = null;
      }
    }
    if (state !== "playing" || !run || run.ended) return;
    shinyTw -= dt || 0;
    if (shinyTw > 0) return;
    shinyTw = 0.22;
    function tw(x, y) { addParticle(x + (Math.random() - 0.5) * 34, y - 6 - Math.random() * 34, 0, -14, Math.random() < 0.5 ? "#ffffff" : "#ffe27a", 0.5, 3, "pixel", false, 0); }
    if (run.shiny && !isEggForm(run.form) && !(run.faint > 0)) tw(run.mx, run.my);
    for (i = 0; i < (run.others || []).length; i++) { o = run.others[i]; if (o.shiny) tw(o.mx, o.my); }
  }
  var burstUi = { pre: null, glow: 0 };
  /* Every burst wears its Digimon's element: gold rays for the holy ones,
   * purple gears for machines, flames, ice shards, leaves, wisps... */
  var BURST_LOOK = {
    holy:    { col: "#ffe27a", col2: "#ffffff", shape: "ray" },
    machine: { col: "#b060ff", col2: "#e8d0ff", shape: "gear" },
    fire:    { col: "#ff7a1a", col2: "#ffd24a", shape: "flame" },
    ice:     { col: "#8ad8ff", col2: "#ffffff", shape: "shard" },
    water:   { col: "#4aa7ff", col2: "#c8f0ff", shape: "ripple" },
    dark:    { col: "#a050e0", col2: "#e0b8ff", shape: "wisp" },
    nature:  { col: "#7ae04a", col2: "#e8ffb0", shape: "leaf" },
    wind:    { col: "#8fe0d0", col2: "#ffffff", shape: "streak" },
    beast:   { col: "#ffb060", col2: "#fff0d0", shape: "slash" },
    slime:   { col: "#a8c83a", col2: "#e8f08a", shape: "blob" }
  };
  function burstLook(family) { return BURST_LOOK[family] || BURST_LOOK.fire; }
  function burstSparks(x, y, form) {
    var fam = D.moveFamilyOf ? D.moveFamilyOf(form) : "fire", L = burstLook(fam), pool = D.movePool ? D.movePool(form) : null;
    burst(x + (Math.random() - 0.5) * 24, y - 12, Math.random() < 0.6 ? L.col : L.col2, 2, 130);
    /* the element's own bits (embers, glitter, leaves...) from the attack effects */
    if (D.attackFx && pool && pool.primary && !reducedFx) D.attackFx.event({ type: "fx", k: "tick", w: pool.primary, x: x + (Math.random() - 0.5) * 30, y: y - 6 - Math.random() * 20 });
  }
  /* drawn under the partner while it bursts */
  function drawBurstAura(ctx, x, y, form, style, t) {
    var fam = D.moveFamilyOf ? D.moveFamilyOf(form) : "fire", L = burstLook(fam), i, a, r, n, k, G;
    function sq(px, py, s, col, rot) {
      ctx.save(); ctx.translate(px, py); if (rot) ctx.rotate(rot);
      ctx.fillStyle = col; ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore();
    }
    function bar(ang, r0, len, w, col) {
      ctx.save(); ctx.translate(x, y - 8); ctx.rotate(ang);
      ctx.fillStyle = col; ctx.fillRect(r0, -w / 2, len, w); ctx.restore();
    }
    ctx.save();
    /* footing: a turning ring of pixels in the element's colour */
    n = 14; r = 30 + Math.sin(t * 8) * 2;
    for (i = 0; i < n; i++) { a = t * 2.2 + (Math.PI * 2 * i) / n; sq(x + Math.cos(a) * r, y + 2 + Math.sin(a) * r * 0.42, 4, i % 2 ? L.col : L.col2); }
    if (L.shape === "ray") {
      ctx.globalAlpha = 0.55;
      for (i = 0; i < 10; i++) bar(t * 0.9 + (Math.PI * 2 * i) / 10, 16, 22 + 12 * Math.sin(t * 7 + i * 1.7), i % 2 ? 3 : 5, i % 2 ? L.col2 : L.col);
      ctx.globalAlpha = 1;
      for (i = 0; i < 4; i++) { k = (t * 0.6 + i * 0.25) % 1; sq(x - 30 + i * 20 + Math.sin(t * 3 + i) * 6, y - 60 + k * 50, 4, L.col2, k * 3); }   /* drifting feathers */
    } else if (L.shape === "gear") {
      for (k = 0; k < 2; k++) {
        r = k ? 20 : 36; n = k ? 6 : 9;
        for (i = 0; i < n; i++) { a = (k ? -1.8 : 1.2) * t + (Math.PI * 2 * i) / n; sq(x + Math.cos(a) * r, y - 8 + Math.sin(a) * r, k ? 6 : 8, k ? L.col2 : L.col, a); }
        for (i = 0; i < n * 2; i++) { a = (k ? -1.8 : 1.2) * t + (Math.PI * i) / n; sq(x + Math.cos(a) * (r - 6), y - 8 + Math.sin(a) * (r - 6), 3, "#3a1a5a"); }
      }
    } else if (L.shape === "flame") {
      for (i = 0; i < 9; i++) { a = -Math.PI * (0.08 + 0.84 * i / 8); k = 10 + 9 * Math.abs(Math.sin(t * 11 + i * 2.3)); bar(a, 20, k, 6, i % 2 ? L.col : L.col2); bar(a, 20 + k, k * 0.5, 3, "#fff6c8"); }
    } else if (L.shape === "shard") {
      for (i = 0; i < 6; i++) { a = -t * 1.6 + (Math.PI * 2 * i) / 6; sq(x + Math.cos(a) * 34, y - 10 + Math.sin(a) * 20 + Math.sin(t * 5 + i) * 3, 8, i % 2 ? L.col : L.col2, Math.PI / 4); }
    } else if (L.shape === "ripple") {
      for (k = 0; k < 2; k++) { r = 14 + ((t * 44 + k * 22) % 44); ctx.globalAlpha = 1 - (r - 14) / 44; for (i = 0; i < 16; i++) { a = (Math.PI * 2 * i) / 16; sq(x + Math.cos(a) * r, y + 2 + Math.sin(a) * r * 0.45, 4, k ? L.col2 : L.col); } }
      ctx.globalAlpha = 1;
    } else if (L.shape === "wisp") {
      for (i = 0; i < 6; i++) { a = (i % 2 ? -2.6 : 2.1) * t + i * 1.05; r = 22 + (i % 3) * 8; sq(x + Math.cos(a) * r, y - 12 + Math.sin(a) * r * 0.7, 7, i % 2 ? "#2a0f44" : L.col); sq(x + Math.cos(a - 0.35) * r, y - 12 + Math.sin(a - 0.35) * r * 0.7, 4, L.col2); }
    } else if (L.shape === "leaf") {
      for (i = 0; i < 7; i++) { a = t * 3.4 + (Math.PI * 2 * i) / 7; sq(x + Math.cos(a) * 32, y - 10 + Math.sin(a * 1.0) * 16 + Math.sin(t * 6 + i) * 4, i % 2 ? 6 : 4, i % 2 ? L.col : L.col2, a * 2); }
    } else if (L.shape === "streak") {
      for (k = 0; k < 3; k++) for (i = 0; i < 6; i++) { a = t * 6 + k * 2.1 + i * 0.13; sq(x + Math.cos(a) * (26 + k * 6), y - 10 + Math.sin(a) * (14 + k * 4), 5 - i * 0.6, i ? L.col : L.col2); }
    } else if (L.shape === "slash") {
      k = Math.floor(t * 9);
      for (i = 0; i < 3; i++) { a = ((k * 2.39996 + i * 0.5) % (Math.PI * 2)); bar(a, 14, 26, 3, i === 1 ? L.col2 : L.col); }
    } else {
      for (i = 0; i < 6; i++) { k = (t * 0.9 + i / 6) % 1; sq(x - 26 + i * 10.4, y + 4 - k * 46, 7 - k * 4, i % 2 ? L.col : L.col2); }
    }
    /* Guardian: the edge of its ring */
    if (style === "guardian") {
      G = (D.BURST.styles && D.BURST.styles.guardian) || {}; r = G.pulseRadius || 125;
      k = (t / (G.pulseEvery || 0.4)) % 1;
      ctx.globalAlpha = 0.85 - k * 0.6;
      for (i = 0; i < 32; i++) { a = t * 0.5 + (Math.PI * 2 * i) / 32; sq(x + Math.cos(a) * r * (0.86 + 0.14 * k), y + Math.sin(a) * r * (0.86 + 0.14 * k), i % 2 ? 6 : 4, i % 2 ? L.col : L.col2, a); }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  function myUlt() { return run && D.megaUltimate ? D.megaUltimate(run.form) : null; }
  function doBurst() {
    if (state !== "playing" || !run || run.ended || !missionAuth) return;
    if ((run.burst || 0) < 100 || run.burstLeft > 0) { if (!(run.burstLeft > 0)) { showNoticeToast((myUlt() ? myUlt().name : "Warp burst") + " is still charging (" + Math.floor(run.burst || 0) + "%)."); noticeToastTimer = 1.6; } return; }
    missionAuth.act({ type: "burst", id: missionLocalId });
  }
  function tickAllyChip() {
    var c = $("ally-chip"), a = run && run.ally, on = !!(run && !run.ended && state === "playing" && ((a && a.hp > 0) || (run.passives && run.passives.length))), txt;
    if (!c) return;
    c.hidden = !on;
    if (!on) return;
    txt = (a && a.hp > 0 ? spName(a.form) + " Lv " + (a.level || 1) + ": " + allyPassiveText(a.passive) : "No ally") +
      (run.passives && run.passives.length ? "  \u00b7  kept: " + run.passives.map(allyPassiveText).join(", ") : "");
    if (c.textContent !== txt) c.textContent = txt;
  }
  function tickBurst(dt) {
    var chip = $("burst-chip"), on = !!(run && !run.ended && (state === "playing") && !isEggForm(run.form) && D.BURST), pct, T, list, i, o;
    if (chip) {
      chip.hidden = !on;
      if (on) {
        pct = run.burstLeft > 0 ? Math.round(100 * run.burstLeft / D.BURST.time) : Math.floor(run.burst || 0);
        chip.style.setProperty("--fill", pct + "%");
        chip.className = run.burstLeft > 0 ? "active" : (pct >= 100 ? "full" : "");
        T = myUlt();
        $("burst-chip-text").textContent = T ? (pct >= 100 ? T.name.toUpperCase() + " READY" + kh("burst") : T.name + " " + pct + "%") : (run.burstLeft > 0 ? "WARP  " + run.burstLeft.toFixed(1) + "s" : (pct >= 100 ? "WARP READY" + kh("burst") : "Warp " + pct + "%"));
        if (ultShake) { ultShake.t += dt || 0; if (ultShake.t >= ultShake.at) { shake = Math.max(shake, 16); sfx("hurt"); ultShake = null; } }
      }
    }
    if (!on) return;
    /* have the burst form's sprite ready before it is needed */
    if ((run.burst || 0) > 40 && burstUi.pre !== run.form) {
      burstUi.pre = run.form;
      T = D.EVO_TREE || (typeof EVO_TREE !== "undefined" ? EVO_TREE : null);
      list = (T && T.branches && T.branches[run.form]) || [];
      for (i = 0; i < list.length; i++) if (list[i].kind === "standard" && list[i].to) { if (D.sprites && D.sprites.preloadSpecies) D.sprites.preloadSpecies(list[i].to, true); break; }
    }
    /* a crackling glow on anyone mid-burst */
    burstUi.glow -= dt || 0;
    if (burstUi.glow <= 0) {
      burstUi.glow = 0.07;
      if (run.burstLeft > 0 && run.burstForm) burstSparks(run.mx, run.my, run.burstForm);
      for (i = 0; i < (run.others || []).length; i++) { o = run.others[i]; if (o.burstForm) burstSparks(o.mx, o.my, o.burstForm); }
    }
  }
  /* ---- the rival (its rules are in net/rival-sim.js; this is its voice and its look) ----
   * `run.rival` is the simulation's view of it each snapshot: name, form,
   * levels, health, where it and its tamer are, what it is doing, the score. */
  var RIVAL_SAY = {
    spot: ["There you are.", "Found you.", "Let's see how much you've grown.", "I've been training. Have you?", "Don't hold back.", "You again. Good."],
    lost: ["Running? Fine. Next time.", "Go on, then.", "Hmph."],
    down: ["...next time.", "You got stronger. So will I.", "Tch. Remember this.", "This isn't over."],
    won: ["Too slow.", "All that time, and this is it?", "Train harder."]
  };
  function rivalLine(k) { var l = RIVAL_SAY[k]; return l[Math.floor(Math.random() * l.length)]; }
  function rivalTitle(e) { return e.name + "'s " + spName(e.form); }
  function rivalScore(e) { return "You " + e.wins + " · " + e.name + " " + e.losses; }
  function rivalToast(text, secs) { showNoticeToast(text, "is-rival"); noticeToastTimer = secs || 4.5; }
  function rivalNear(e) { return e.x != null && Math.abs(e.x - camX) < viewW && Math.abs(e.y - camY) < viewH; }
  /* infected Digimon (js/net/virus-sim.js): purple, and after any Digimon they can see */
  function virusEvent(e) {
    var near = e.x != null && Math.abs(e.x - camX) < viewW * 0.6 && Math.abs(e.y - camY) < viewH * 0.6;
    if (e.type === "virus.spawn") {
      showNoticeToast("An infected " + kindName(e.enemyType) + " is loose nearby.", "is-virus");
    } else if (e.type === "virus.infect") {
      if (e.caught && near) { burst(e.x, e.y - 8, "#b05cff", 18, 200); addFloat(e.x, e.y - 30, "Infected!", "#d9a8ff"); }
    } else if (e.type === "virus.evolve") {
      if (D.sprites && D.sprites.preloadSpecies) D.sprites.preloadSpecies(e.form, true);
      if (near) {
        burst(e.x, e.y - 10, "#ffffff", 26, 280); burst(e.x, e.y - 10, "#b05cff", 22, 240);
        addFloat(e.x, e.y - 50, kindName(e.form) + "!", "#d9a8ff"); sfx("evo");
        showNoticeToast("The infected " + kindName(e.from) + " digivolved to " + kindName(e.form) + ".", "is-virus");
      }
    }
  }
  /* a slow purple ring at its feet and motes rising off it */
  function drawVirusMark(en) {
    var t = run.time + (en._id % 17) * 0.37, r = (en.radius || 12) + 6, i, k, a;
    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(t * 3.2) * 0.12; ctx.strokeStyle = "#b05cff"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(en.x, en.y - 1, r, r * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
    for (i = 0; i < 4; i++) {
      k = ((t * 0.55 + i * 0.25) % 1 + 1) % 1; a = i * 2.4 + (en._id % 7);
      ctx.globalAlpha = (1 - k) * 0.5; ctx.fillStyle = i % 2 ? "#e2b0ff" : "#8a2be2";
      ctx.fillRect(Math.round(en.x + Math.cos(a + t * 0.8) * r * 0.75) - 1, Math.round(en.y - 4 - k * (en.radius * 2 + 16)), 3, 3);
    }
    ctx.restore();
  }
  function rivalEvent(e) {
    if (e.form && D.sprites && D.sprites.preloadSpecies) D.sprites.preloadSpecies(e.form, true);
    if (e.type === "rival.enter") {
      rivalToast("You are not the only tamer out here. " + e.name + " and a " + spName(e.form) + " are somewhere on this map, hunting and growing like you. The pink mark on the minimap's rim points their way. If they see your partner, they will come for it.", 9);
    } else if (e.type === "rival.spot") {
      rivalToast((e.first ? "Your rival " : "") + rivalTitle(e) + " (job level " + e.level + ") has seen you!", 4.5);
      addFloat(e.x, e.y - 60, "!", "#ff5aa8");
      addFloat(e.x, e.y - 44, "“" + rivalLine("spot") + "”", "#ff9ad0");
      burst(e.x, e.y - 10, "#ff5aa8", 22, 240); shake = Math.max(shake, 5);
      if (D.audio) D.audio.sfx("rival");
    } else if (e.type === "rival.lost") {
      if (rivalNear(e)) addFloat(e.x, e.y - 44, "“" + rivalLine("lost") + "”", "#ff9ad0");
    } else if (e.type === "rival.evolve") {
      if (e.near && rivalNear(e)) { burst(e.x, e.y - 10, "#ffffff", 30, 300); burst(e.x, e.y - 10, "#ff5aa8", 20, 220); addFloat(e.x, e.y - 50, spName(e.form) + "!", "#ffd0ea"); sfx("evo"); }
      rivalToast(e.name + "'s " + spName(e.from) + " digivolved to " + spName(e.form) + ".", 4.5);
    } else if (e.type === "rival.farm") {
      if (e.near) rivalToast(e.name + " has gone back to the farm for a while.", 3.5);
    } else if (e.type === "rival.back") {
      /* said only once it is beaten and returns: a rest at the farm passes without comment */
      if (run.rivalWasDown) { run.rivalWasDown = false; rivalToast(rivalTitle(e) + " is back on the map.  " + rivalScore(e) + ".", 4.5); }
    } else if (e.type === "rival.down") {
      run.rivalWasDown = true;
      if (!e.by || e.by === missionLocalId || !(D.online && D.online.active && D.online.active())) bankTrophy(e);
      addFloat(e.x, e.y - 56, "“" + rivalLine("down") + "”", "#ff9ad0");
      rivalToast("You beat " + rivalTitle(e) + "!  " + e.name + " carries it off to recover.  " + rivalScore(e) + ".", 6.5);
      burst(e.x, e.y, "#ff5aa8", 34, 320); burst(e.x, e.y, "#ffe27a", 18, 240);
      if (D.audio) D.audio.sfx("base");
    } else if (e.type === "rival.won") {
      run.rivalBeatYou = { name: e.name, form: e.form, level: e.level };
      addFloat(run.mx, run.my - 60, "“" + rivalLine("won") + "”", "#ff9ad0");
    }
  }
  /* one of its moves coming at your partner: a streak for a shot, a slash for a blow */
  function rivalShot(e) {
    var i, k, n = reducedFx ? 3 : 7, col = e.col || "#ff7ab8", dx = e.tx - e.x, dy = e.ty - e.y, l = Math.sqrt(dx * dx + dy * dy) || 1, a;
    if (e.arc) {
      for (i = 0; i < n; i++) { a = Math.atan2(dy, dx) + (i / (n - 1) - 0.5) * 1.5; addParticle(e.tx - Math.cos(a) * 16, e.ty - Math.sin(a) * 16, Math.cos(a + 1.3) * 120, Math.sin(a + 1.3) * 120, i % 2 ? "#ffffff" : col, 0.16, 4, "pixel", true, 0); }
    } else {
      for (i = 0; i < n; i++) { k = i / n; addParticle(e.x + dx * k, e.y + dy * k, dx / l * 60, dy / l * 60, i % 3 ? col : "#ffffff", 0.1 + k * 0.14, 3, "pixel", true, 0); }
    }
    addParticle(e.tx, e.ty, 0, 0, col, 0.18, 3, "ring", true, 0);
  }
  /* its tamer: a hologram like yours, in its own colour, a few steps behind its partner */
  function drawRivalTamer() {
    var rv = run.rival, ids, id;
    if (!rv || rv.eid == null || !D.sprites.drawTamer) return;
    ids = D.sprites.getTamerList ? D.sprites.getTamerList() : [];
    id = ids.length ? ids[(rv.tamer + (ids[rv.tamer % ids.length] && ids[rv.tamer % ids.length].id === run.tamerId ? 1 : 0)) % ids.length].id : run.tamerId;
    ctx.save();
    ctx.globalAlpha = 0.9;
    D.sprites.drawTamer(ctx, rv.tx, rv.ty, rv.tf || 1, run.time, false, !!rv.tm, false, "side", id, "rival");
    ctx.globalAlpha = 1;
    ctx.font = "bold 10px Trebuchet MS, sans-serif"; ctx.textAlign = "center"; ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(20,6,16,0.85)"; ctx.fillStyle = "#ff9ad0";
    ctx.strokeText(rv.name, rv.tx, rv.ty - 62); ctx.fillText(rv.name, rv.tx, rv.ty - 62);
    ctx.restore();
  }
  /* a line when the tamer walks into a new biome */
  var biomeSeen = { id: null, t: 0, run: null };
  function tickBiome(dt) {
    if (state !== "playing" || !run || run.ended || !D.world || !D.world.biomeAt) return;
    biomeSeen.t -= dt || 0;
    if (biomeSeen.t > 0) return;
    biomeSeen.t = 0.6;
    var b = D.world.biomeAt(run.x, run.y);
    if (!b) return;
    if (biomeSeen.run !== run) { biomeSeen.run = run; biomeSeen.id = b.id; return; }
    if (b.id === biomeSeen.id) return;
    biomeSeen.id = b.id;
    if (!(noticeToastTimer > 0)) { showNoticeToast("Entering " + b.name); noticeToastTimer = 2.6; }
  }
  var frameStep = 0.016, stepTick = 0;
  var lastGroundClick = null;
  var BOSS_LOOK = { bossScale: 1.35, megaScale: 1.5, lordScale: 2.0 };

  function feedFoodList() {
    var out = [], order = ["meat", "fish", "berry"].concat(D.CROP_ORDER || []), i, k;
    for (i = 0; i < order.length; i++) if (D.FOOD && D.FOOD[order[i]] && bagCount(order[i]) > 0) out.push(order[i]);
    for (k in (D.FOOD || {})) if (order.indexOf(k) < 0 && bagCount(k) > 0) out.push(k);
    return out;
  }
  function feedSpot() {
    /* where the tamer and partner are, in whichever place we are standing */
    var v = state === "farm" && D.farm && D.farm.get && D.farm.get();
    if (v) return { x: v.x, y: v.y, mx: v.mx, my: v.my, reach: (D.FARM && D.FARM.petRadius) || 58 };
    return { x: run.x, y: run.y, mx: run.mx, my: run.my, reach: (D.LEASH && D.LEASH.fieldFeedRadius) || 64 };
  }
  /* Feeding works from any distance (Nov 16): the partner kept running off mid-fight. */
  function feedNear() { return true; }
  function feedSay(text, color, onMon) {
    var s = feedSpot();
    if (state === "farm" && D.farm) { farmFloat(onMon ? s.mx : s.x, (onMon ? s.my : s.y) - 30, text, color); return; }
    addFloat(onMon ? s.mx : s.x, (onMon ? s.my : s.y) - 30, text, color);
  }
  function farmFloat(x, y, text, color) {
    addFloat(x, y, text, color);
    showNoticeToast(text);
  }
  function closeFeedMenu() {
    feedMenu.open = false;
    feedMenu.sig = "";
    var box = $("feed-menu");
    if (box) box.hidden = true;
  }
  function toggleFeedMenu() {
    if (feedMenu.open) { closeFeedMenu(); return; }
    if (!run || run.ended || (state !== "playing" && state !== "farm")) return;
    if (state === "farm" && D.farm && D.farm.get && D.farm.get() && D.farm.get().activity) return;
    if (isEggForm(run.form)) { feedSay("Eggs don't eat yet", "#ffd36a"); return; }
    if (run.downed || run.faint > 0) { feedSay("It can't eat right now", "#ffd36a"); return; }
    if (!feedNear()) { feedSay("Get closer to feed", "#ffd36a"); return; }
    if (!feedFoodList().length) { feedSay("No food in the bag", "#ffd36a"); return; }
    feedMenu.open = true;
    renderFeedMenu();
  }
  function renderFeedMenu() {
    var box = $("feed-menu"), list = $("feed-menu-list");
    if (!box || !list) return;
    var ids = feedFoodList(), i, sig = "", html = "", def, ico, cv, g, btns;
    for (i = 0; i < ids.length; i++) sig += ids[i] + ":" + bagCount(ids[i]) + ";";
    feedMenu.ids = ids;
    box.hidden = false;
    box.classList.toggle("is-farm", state === "farm");
    if (sig === feedMenu.sig) return;
    feedMenu.sig = sig;
    for (i = 0; i < ids.length; i++) {
      def = D.FOOD[ids[i]];
      html += "<button type='button' class='feed-chip' data-i='" + i + "' title='" + def.name + "'>" +
        (i < 9 ? "<kbd>" + (i + 1) + "</kbd>" : "") + "<canvas width='24' height='24'></canvas>" +
        "<span class='feed-name'>" + def.name + "</span><span class='feed-n'>x" + bagCount(ids[i]) + "</span></button>";
    }
    list.innerHTML = html;
    btns = list.querySelectorAll(".feed-chip");
    for (i = 0; i < btns.length; i++) {
      def = D.FOOD[ids[i]];
      ico = def.veg ? (D.farmArt && D.farmArt.itemIcon && D.farmArt.itemIcon(ids[i])) : (D.sprites.getIcon && D.sprites.getIcon(ids[i] + "Pack"));
      cv = btns[i].querySelector("canvas");
      g = cv.getContext("2d");
      g.imageSmoothingEnabled = false;
      if (ico) g.drawImage(ico, 0, 0, 24, 24);
      else { g.fillStyle = def.color || "#fff"; g.fillRect(6, 6, 12, 12); }
      btns[i].addEventListener("click", (function (n) { return function (ev) { ev.preventDefault(); feedPick(n); }; })(i));
    }
  }
  function tickFeedMenu() {
    if (!run || run.ended || (state !== "playing" && state !== "farm") || run.downed || !feedNear()) { closeFeedMenu(); return; }
    if (!feedFoodList().length) { closeFeedMenu(); return; }
    renderFeedMenu();
  }
  function feedPick(i) {
    var kind = feedMenu.ids[i], def, res;
    if (!feedMenu.open || !kind) return false;
    def = D.FOOD[kind];
    if (state === "farm" && D.farm) {
      D.farm.feed(kind);
    } else {
      if (!missionAuth) return false;
      res = missionAuth.act({ type: "field.feed", id: missionLocalId, food: kind }) || { ok: false };
      if (res.refused) { burst(run.mx, run.my - 6, "#c0b8a0", 6, 70); sfx("hurt"); return false; }
      if (!res.ok) { addFloat(run.x, run.y - 28, res.reason || "Can't feed", "#ff8080"); return false; }
      applyMissionSnapshot(takeMissionSnapshot());
      run.feedAnim = 0.4;
      addFloat(run.mx, run.my - 32, def.name + "! +" + def.fullness, def.color);
      if (res.balanced) addFloat(run.mx, run.my - 50, "Balanced diet! \u2665", "#a8f080");
      burst(run.mx, run.my - 8, def.color, 12, 130);
      sfx("meat");
      updateHud();
    }
    if (!feedFoodList().length) closeFeedMenu(); else renderFeedMenu();
    return true;
  }

  function tryFeed() {
    /* Feeding is farm-only. */
    if (state === "playing") return;
    if (!run.carry.length || run.faint > 0) return;
    if (run.feedCd > 0) return;
    var d = Math.sqrt(dist2(run.x, run.y, run.mx, run.my));
    if (d > D.LEASH.feedRadius) return;
    if (D.rarity && D.rarity.shouldRefuseFeed && D.rarity.shouldRefuseFeed(run)) {
      run.feedCd = 0.7;
      /* No "refused" copy — the turn-down is silent on purpose. */
      burst(run.mx, run.my - 6, "#c0b8a0", 6, 70);
      sfx("hurt");
      return;
    }
    var kind = run.carry.shift();
    var def = D.FOOD[kind] || D.FOOD.meat;
    run.fullness = clamp(run.fullness + def.fullness, 0, D.CARE.fullnessMax);
    run.happiness = clamp(run.happiness + def.happiness, 0, D.CARE.happinessMax);
    run.foodEaten += 1;
    run.foodCounts = run.foodCounts || {};
    run.foodCounts[kind] = (run.foodCounts[kind] || 0) + 1;
    run.feedCd = 0.38;
    run.feedAnim = 0.4;
    if (isEggForm(run.form) && D.HATCH && D.HATCH.feedBonus) {
      run.hatchLeft = Math.max(0, (run.hatchLeft || 0) - D.HATCH.feedBonus);
      addFloat(run.mx, run.my - 44, "Hatch sped up!", "#ffe080");
    }
    addFloat(run.mx, run.my - 32, def.name + "! +" + def.fullness, def.color);
    burst(run.mx, run.my - 8, def.color, 12, 130);
    if (!reducedFx) addParticle(run.mx, run.my, 0, 0, def.color, 0.28, 24, "glow", true, 0);
    sfx("meat");
  }

  function updateMon(dt) {
    var L = D.LEASH;
    run.feedCd = Math.max(0, run.feedCd - dt);
    run.feedAnim = Math.max(0, run.feedAnim - dt);
    run.monInvuln = Math.max(0, run.monInvuln - dt);
    if (run.faint > 0) {
      run.faint -= dt;
      run.monMoving = false;
      run.monTarget = null;
      var far = Math.sqrt(dist2(run.mx, run.my, run.x, run.y));
      if (far > 360) {
        var pn = norm(run.x - run.mx, run.y - run.my);
        var fpos = partnerSlide(pn.x * 40 * dt, pn.y * 40 * dt);
        run.mx = fpos.x;
        run.my = fpos.y;
      }
      if (run.faint <= 0) {
        run.hp = Math.max(1, run.maxHp * D.FAINT.reviveHpRatio);
        addFloat(run.mx, run.my - 28, "Revived!", "#7cf0c0");
        burst(run.mx, run.my, "#7cf0c0", 12, 120);
      }
      return;
    }
    var ngl = neglectState();
    run.acquireCd -= dt;
    var period = 0.16 / Math.max(0.2, ngl.acquire);
    var focus = run.monFocus;
    if (focus && (focus.dead || enemies.indexOf(focus) < 0 || isEggForm(run.form) ||
        Math.sqrt(dist2(focus.x, focus.y, run.x, run.y)) > L.returnRadius * 1.6)) focus = run.monFocus = null;
    if (isEggForm(run.form)) {
      run.monTarget = null;
    } else if (focus) {
      run.monTarget = focus;
    } else if (!run.monTarget || run.monTarget.dead || run.acquireCd <= 0) {
      run.monTarget = nearestEnemy(run.x, run.y);
      run.acquireCd = period;
    }
    var desiredX, desiredY, target = run.monTarget;
    var dTamer = Math.sqrt(dist2(run.mx, run.my, run.x, run.y));
    if (focus) {
      var fd = Math.sqrt(dist2(run.mx, run.my, focus.x, focus.y));
      if (fd > L.holdRange) { desiredX = focus.x; desiredY = focus.y; }
      else { desiredX = run.mx; desiredY = run.my; }
      run.aim = Math.atan2(focus.y - run.my, focus.x - run.mx);
      if (focus.x !== run.mx) run.mfacing = focus.x < run.mx ? -1 : 1;
    } else if (isEggForm(run.form)) {
      desiredX = run.x - run.facing * Math.min(L.offsetBehind, 32);
      desiredY = run.y + 8;
    } else if (dTamer > L.returnRadius) {
      desiredX = run.x - run.facing * L.offsetBehind;
      desiredY = run.y + 6;
    } else if (target && dTamer < L.roamRadius) {
      var ed = Math.sqrt(dist2(run.mx, run.my, target.x, target.y));
      if (ed > L.holdRange) { desiredX = target.x; desiredY = target.y; }
      else { desiredX = run.mx; desiredY = run.my; }
      run.aim = Math.atan2(target.y - run.my, target.x - run.mx);
      if (target.x !== run.mx) run.mfacing = target.x < run.mx ? -1 : 1;
    } else {
      desiredX = run.x - run.facing * L.offsetBehind;
      desiredY = run.y + 6;
    }
    var monRad = actorRad(run.form);
    var dest = snapWalkable(desiredX, desiredY, monRad, 160, crossOf(run.form));
    desiredX = dest.x;
    desiredY = dest.y;
    var vx = desiredX - run.mx, vy = desiredY - run.my;
    var vd = Math.sqrt(vx * vx + vy * vy);
    var spd = monSpeed();
    var prevX = run.mx, prevY = run.my;
    if (vd > 4) {
      var step = Math.min(vd, spd * dt);
      var sx = vx / vd * step, sy = vy / vd * step;
      var pos = partnerSlide(sx, sy);
      var moved = Math.abs(pos.x - run.mx) + Math.abs(pos.y - run.my);
      if (moved < step * 0.25 && vd > 16) {
        var px = -vy / vd, py = vx / vd;
        var tryOff = [48, 80, 120, -48, -80, -120];
        var ti, wx, wy, steered;
        for (ti = 0; ti < tryOff.length; ti++) {
          wx = sx + px * tryOff[ti];
          wy = sy + py * tryOff[ti];
          steered = partnerSlide(wx, wy);
          if (Math.abs(steered.x - run.mx) + Math.abs(steered.y - run.my) > 1) {
            pos = steered;
            break;
          }
        }
      }
      run.mx = pos.x;
      run.my = pos.y;
      run.monMoving = true;
      var mvx = run.mx - prevX, mvy = run.my - prevY;
      if (Math.abs(mvx) > 2) run.mfacing = mvx < 0 ? -1 : 1;
    } else {
      run.monMoving = false;
    }
    dTamer = Math.sqrt(dist2(run.mx, run.my, run.x, run.y));
    if (dTamer < L.unstick && dTamer > 0.1) {
      pos = partnerSlide((run.mx - run.x) / dTamer * (L.unstick - dTamer), (run.my - run.y) / dTamer * (L.unstick - dTamer));
      run.mx = pos.x;
      run.my = pos.y;
    }
    var progressed = Math.sqrt(dist2(prevX, prevY, run.mx, run.my));
    if (dTamer > 80 && progressed < 8 * dt && vd > 20) run.monStuck = (run.monStuck || 0) + dt;
    else run.monStuck = 0;
    if (run.monStuck > 1.8) {
      var warp = snapWalkable(run.x - run.facing * L.offsetBehind, run.y + 6, monRad, 200);
      run.mx = warp.x;
      run.my = warp.y;
      run.monStuck = 0;
    }
    tryFeed();
  }

  function spawnWorldFood(dt) {
    run.worldFoodAcc = (run.worldFoodAcc || 0) + dt;
    var healCfg = (D.FARM_CFG && D.FARM_CFG.heal) || {};
    var every = healCfg.worldEvery || 9;
    if (run.worldFoodAcc < every) return;
    run.worldFoodAcc = 0;
    var ang = Math.random() * Math.PI * 2;
    var dist = 80 + Math.random() * Math.min(viewW, viewH) * 0.35;
    spawnOrb("heal", run.x + Math.cos(ang) * dist, run.y + Math.sin(ang) * dist, 1);
  }

  function eatOrb(o) {
    if (o.kind === "xp") {
      run.xp += o.value;
      sfx("xp");
      tryLevel();
    } else if (isFoodKind(o.kind) || (D.isSeed && D.isSeed(o.kind))) {
      addToBag(o.kind, o.value || 1);
      showFoodPickup(o.kind, o.x, o.y);
    } else if (o.kind === "heal" || o.kind === "toy") {
      applyGroundHeal(o);
    } else if (o.kind === "bits") {
      run.bits = (run.bits || 0) + (o.value || 1);
      addFloat(run.x, run.y - 26, "+" + (o.value || 1) + " Bits", "#ffe080");
      sfx("xp");
    }
    return true;
  }


  /* ---------- Shop, bag, capture, ally, DigiBank ---------- */
  function bagCount(id) {
    if (id === "_veg" || id === "_seed") {
      var total = 0, k;
      var list = D.CROP_ORDER || [];
      for (k = 0; k < list.length; k++) total += (run && run.bag && run.bag[id === "_veg" ? list[k] : "seed_" + list[k]]) || 0;
      return total;
    }
    return (run && run.bag && run.bag[id]) || 0;
  }
  function addToBag(id, n) {
    run.bag = run.bag || {};
    run.bag[id] = (run.bag[id] || 0) + (n || 1);
  }
  function takeFromBag(id, n) {
    n = n || 1;
    if (bagCount(id) < n) return false;
    run.bag[id] -= n;
    return true;
  }
  function grantBits(n) {
    /* In-run bits are authority-owned. This helper is only used off the
     * message bus when no authority is attached (legacy fallback). */
    if (missionAuth) return (run && run.bits) || 0;
    run.bits = (run.bits || 0) + n;
  }
  function shopBoughtCount(id) {
    return (run.shopBought && run.shopBought[id]) || 0;
  }
  function nextShopPrice(id) {
    return D.shopPrice ? D.shopPrice(id, shopBoughtCount(id)) : 0;
  }
  function merchantActive() {
    if (!run || !D.SHOP) return false;
    if (run.time < D.SHOP.firstAt) return false;
    var cycle = (run.time - D.SHOP.firstAt) % D.SHOP.every;
    return cycle < D.SHOP.linger;
  }
  function merchantInRange() {
    if (!run || !run.merchant) return false;
    return Math.sqrt(dist2(run.x, run.y, run.merchant.x, run.merchant.y)) <= (D.SHOP.interactRadius || 72);
  }
  function canOpenShop() {
    if (!run) return false;
    if (state === "farm" || (D.farm && D.farm.isActive && D.farm.isActive())) return true;
    if (missionAuth) return !!(run.merchant && run.merchant.open);
    return !!(merchantActive() || debug);
  }
  function showFoodPickup(kind, x, y) {
    var def = D.FOOD && D.FOOD[kind];
    if (!def && D.isSeed && D.isSeed(kind)) {
      var crop = D.CROPS[D.cropOfSeed(kind)];
      def = { name: crop.name + " Seeds", color: "#c8e070" };
    }
    if (!def || !run) return;
    addFloat(run.x, run.y - 30, "+1 " + def.name + " (" + bagCount(kind) + ")", def.color);
    if (x != null) burst(x, y, def.color, 8, 80);
    sfx("meat");
  }

  function applyGroundHeal(o) {
    var h = (D.FARM_CFG && D.FARM_CFG.heal) || {};
    var hpAmt = run.maxHp * (h.hp != null ? h.hp : 0.2);
    var tAmt = run.tamerMaxHp * (h.tamerHp != null ? h.tamerHp : 0.2);
    run.hp = Math.min(run.maxHp, run.hp + hpAmt);
    run.tamerHp = Math.min(run.tamerMaxHp, run.tamerHp + tAmt);
    if (run.faint > 0 && run.hp > 0) run.faint = 0;
    addFloat(run.x, run.y - 28, "Heal!", "#7cf0c0");
    burst(o.x, o.y, "#7cf0c0", 10, 90);
    sfx("xp");
  }

  function updateMerchant() {
    if (!run || !D.SHOP) return;
    if (missionAuth) return;
    if (merchantActive()) {
      if (!run.merchant) {
        var off = snapWalkable(run.x + 80, run.y - 20, 14, 240);
        run.merchant = { x: off.x, y: off.y, form: D.SHOP.merchantId || "jijimon" };
        if (D.sprites && D.sprites.preloadSpecies) D.sprites.preloadSpecies(run.merchant.form, true);
        addFloat(off.x, off.y - 36, "Jijimon's Shop!", "#ffe080");
      }
    } else if (run.merchant && state !== "shop") {
      run.merchant = null;
    }
  }
  function openShop() {
    if (!run || run.ended) return false;
    if (state !== "playing" && state !== "paused" && state !== "shop" && state !== "farm") return false;
    if (!canOpenShop()) {
      addFloat(run.x, run.y - 28, "Jijimon isn't here", "#ffd36a");
      return false;
    }
    if (state !== "shop") shopReturnState = state;
    setState("shop");
    return true;
  }
  function closeShop() {
    if (state !== "shop") return;
    var back = shopReturnState || "playing";
    shopReturnState = "playing";
    setState(back);
    if (back === "farm" && D.farm && D.farm.render) D.farm.render();
  }
  function shopOwnedCount(item) {
    if (!run || !item) return 0;
    var i, n = 0;
    if (item.kind === "food") {
      return bagCount(item.food);
    }
    if (item.kind === "consumable") return bagCount(item.id);
    if (item.kind === "key") return (run.items.indexOf(item.item || item.id) >= 0) ? 1 : 0;
    if (item.kind === "instant") return shopBoughtCount(item.id);
    return 0;
  }
  function shopOwnedLabel(item) {
    var n = shopOwnedCount(item);
    if (item.kind === "key") return n ? "Owned" : "Not owned";
    if (item.kind === "food") return "In farm bag ×" + n;
    if (item.kind === "instant") return n ? ("Used ×" + n + " this run") : "Not used yet";
    return "Owned ×" + n;
  }
  function shopBlockReason(item, price) {
    if (item.kind === "key" && shopOwnedCount(item)) return "Already owned";
    if ((run.bits || 0) < price) return "Need " + price + " Bits (have " + (run.bits || 0) + ")";
    return "";
  }
  function setShopTab(id) {
    shopTab = id || "all";
    if (state === "shop") renderShop();
  }
  function paintShopIcon(cv, item) {
    if (!cv || !D.sprites || !D.sprites.getIcon) return;
    var ico = D.sprites.getIcon(item.icon || item.id);
    if (!ico) return;
    var size = 48;
    if (cv.width !== size || cv.height !== size) { cv.width = size; cv.height = size; }
    var ic = cv.getContext("2d");
    ic.imageSmoothingEnabled = false;
    ic.clearRect(0, 0, size, size);
    ic.drawImage(ico, 0, 0, size, size);
  }
  function paintShopJiji() {
    var cv = $("shop-jiji");
    if (!cv || state !== "shop" || !D.sprites) return;
    var size = syncPreviewCanvas(cv);
    var c = cv.getContext("2d");
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, size.w, size.h);
    if (D.sprites.preloadSpecies) D.sprites.preloadSpecies("jijimon", true);
    var nativeH = (D.sprites.visualHeight && D.sprites.visualHeight("jijimon")) || 72;
    var scale = previewDrawScale(nativeH, cv, 1, 3);
    paintPreviewScaled(c, size.w, size.h, scale, function (ctx) {
      if (D.sprites.drawPartner) D.sprites.drawPartner(ctx, "jijimon", 0, 0, 1, 1, titleTime, false, false, false);
    });
  }
  function updateShopScrollHint() {
    var box = $("shop-rows");
    var hint = $("shop-scroll-hint");
    if (!box || !hint) return;
    var more = box.scrollHeight > box.clientHeight + 10 && (box.scrollTop + box.clientHeight < box.scrollHeight - 8);
    hint.hidden = !more;
  }
  function renderShopTabs() {
    var bar = $("shop-tabs");
    if (!bar || !D.SHOP) return;
    var cats = D.SHOP.categories || [];
    bar.innerHTML = "";
    cats.forEach(function (cat) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "shop-tab" + (shopTab === cat.id ? " is-on" : "");
      btn.setAttribute("role", "tab");
      btn.dataset.tab = cat.id;
      btn.textContent = cat.name;
      btn.addEventListener("click", function () { setShopTab(cat.id); sfx("ui"); });
      bar.appendChild(btn);
    });
  }
  function renderShop() {
    var rows = $("shop-rows");
    var bitsEl = $("shop-bits");
    if (bitsEl) bitsEl.textContent = String(run && run.bits ? run.bits : 0);
    if (!rows || !D.SHOP || !run) return;
    renderShopTabs();
    if (D.sprites && D.sprites.preloadSpecies) D.sprites.preloadSpecies("jijimon", true);
    paintShopJiji();
    rows.innerHTML = "";
    var lastSec = "";
    var cats = D.SHOP.categories || [];
    var showAll = shopTab === "all";
    D.SHOP.catalog.forEach(function (item) {
      if (!showAll && item.category && item.category !== shopTab) return;
      if (showAll && item.category && item.category !== lastSec) {
        lastSec = item.category;
        var sec = document.createElement("div");
        sec.className = "shop-section";
        var ci, label = lastSec;
        for (ci = 0; ci < cats.length; ci++) if (cats[ci].id === lastSec) label = cats[ci].name;
        sec.textContent = label;
        rows.appendChild(sec);
      }
      var price = nextShopPrice(item.id);
      var next = D.shopPrice(item.id, shopBoughtCount(item.id) + 1);
      var why = shopBlockReason(item, price);
      var can = !why;
      var row = document.createElement("button");
      row.type = "button";
      row.className = "shop-row" + (can ? "" : " is-locked") + (shopFlashId === item.id ? " is-flash" : "");
      row.dataset.id = item.id;
      row.innerHTML = '<canvas class="shop-ico" width="48" height="48"></canvas>' +
        '<div class="info"><div class="title"></div><div class="desc"></div><div class="owned"></div><div class="why"></div></div>' +
        '<div class="buy-col"><div class="price"></div><span class="btn shop-buy">Buy</span></div>';
      row.querySelector(".title").textContent = item.name;
      row.querySelector(".desc").textContent = item.desc;
      var ownedTxt = shopOwnedLabel(item);
      if (item.id === "dataChip") ownedTxt += " · " + catchHudText();
      row.querySelector(".owned").textContent = ownedTxt;
      var whyEl = row.querySelector(".why");
      if (why) whyEl.textContent = why;
      else whyEl.remove();
      var priceEl = row.querySelector(".price");
      priceEl.innerHTML = price + " Bits" + (next !== price ? '<span class="next">Then ' + next + "</span>" : "");
      if (shopBoughtCount(item.id) > 0) priceEl.classList.add("is-steep");
      paintShopIcon(row.querySelector(".shop-ico"), item);
      var buyLab = row.querySelector(".shop-buy");
      buyLab.textContent = can ? "Buy" : "—";
      (function (id, ok) {
        row.addEventListener("click", function () { if (ok) buyShopItem(id); });
      })(item.id, can);
      rows.appendChild(row);
    });
    if (!rows.onscroll) rows.addEventListener("scroll", updateShopScrollHint);
    focusMenu();
    updateShopScrollHint();
  }
  function addFoodToCarry(kind, count) {
    /* Legacy hook: shop food now packs into the farm bag. */
    return addFoodToBag(kind, count);
  }
  function addFoodToBag(kind, count) {
    addToBag(kind, count || 1);
    if (el.carryRow) el.carryRow.dataset.sig = "";
    return 0;
  }
  function applyShopItem(item) {
    if (item.kind === "food") {
      addFoodToBag(item.food, item.count || 3);
      addFloat(run.x, run.y - 28, item.name + " packed for the farm", (D.FOOD[item.food] && D.FOOD[item.food].color) || "#ffe080");
    } else if (item.kind === "consumable") {
      addToBag(item.id, 1);
      addFloat(run.x, run.y - 28, item.name + " packed for the farm", "#ffe080");
    } else if (item.kind === "instant") {
      addToBag(item.id, 1);
      addFloat(run.x, run.y - 28, item.name + " packed for the farm", "#ffe080");
    } else if (item.kind === "key") {
      var key = item.item || item.id;
      if (run.items.indexOf(key) < 0) run.items.push(key);
      addFloat(run.x, run.y - 28, item.name + " obtained!", "#ffe080");
    }
  }
  function buyShopItem(id) {
    if (!run) return false;
    var item = D.shopItem && D.shopItem(id);
    if (!item) return false;
    var price = nextShopPrice(id);
    var why = shopBlockReason(item, price);
    if (why) {
      addFloat(run.x, run.y - 28, why, "#ff8080");
      return false;
    }
    if (missionAuth) {
      var bought = missionAuth.act({ type: "shop.buy", id: missionLocalId, item: id });
      if (!bought.ok) {
        addFloat(run.x, run.y - 28, bought.reason || why, "#ff8080");
        return false;
      }
      applyMissionSnapshot(takeMissionSnapshot());
    } else {
      run.bits -= price;
      run.shopBought = run.shopBought || {};
      run.shopBought[id] = (run.shopBought[id] || 0) + 1;
      applyShopItem(item);
    }
    sfx("buy");
    shopFlashId = id;
    if (state === "shop") renderShop();
    setTimeout(function () {
      if (shopFlashId === id) shopFlashId = null;
    }, 450);
    updateHud();
    return true;
  }
  function farmOnlyOk(id) {
    if (state === "farm") return true;
    addFloat(run.x, run.y - 28, "Use this on the Digifarm", "#ffd36a");
    return false;
  }
  function useJoyToy() {
    if (!farmOnlyOk("joyToy")) return false;
    run.happiness = clamp(run.happiness + ((D.CAPTURE && D.CAPTURE.toyJoy) || 30), 0, D.CARE.happinessMax);
    addFloat(run.mx, run.my - 32, "Play! +Joy", "#ffb0e0");
    sfx("toy");
    return true;
  }
  function useAtkBoost() {
    if (!farmOnlyOk("atkBoost")) return false;
    run.pendingAtkBoost = (run.pendingAtkBoost || 0) + ((D.CAPTURE && D.CAPTURE.atkBoostTime) || 12);
    addFloat(run.mx, run.my - 36, "Power ready for battle", "#ff8030");
    return true;
  }
  function useVitamin() {
    if (!run) return false;
    if (!farmOnlyOk("vitamin")) return false;
    if (!takeFromBag("vitamin")) {
      addFloat(run.x, run.y - 28, "No Power Vitamin", "#ff8080");
      return false;
    }
    run.happiness = clamp(run.happiness + 16, 0, D.CARE.happinessMax);
    run.bond = clamp((run.bond || 0) + 12, 0, 100);
    addFloat(run.mx, run.my - 32, "Vitamin! +Joy +Bond", "#ffe080");
    sfx("level");
    updateHud();
    return true;
  }
  function useMedicine() {
    if (!run) return false;
    if (!farmOnlyOk("medicine")) return false;
    if (!takeFromBag("medicine")) {
      addFloat(run.x, run.y - 28, "No Restore Disk", "#ff8080");
      return false;
    }
    var frac = D.CAPTURE.medicineHeal;
    run.hp = Math.min(run.maxHp, run.hp + run.maxHp * frac);
    run.tamerHp = Math.min(run.tamerMaxHp, run.tamerHp + run.tamerMaxHp * frac);
    if (run.faint > 0 && run.hp > 0) {
      run.faint = 0;
      addFloat(run.mx, run.my - 28, "Revived!", "#7cf0c0");
    }
    addFloat(run.x, run.y - 28, "Restored!", "#7cf0c0");
    burst(run.x, run.y, "#7cf0c0", 10, 80);
    updateHud();
    return true;
  }
  function useEraser() {
    if (!run) return false;
    if (!farmOnlyOk("eraser")) return false;
    if (!takeFromBag("eraser")) return false;
    run.careMistakes = Math.max(0, (run.careMistakes || 0) - 1);
    addFloat(run.mx, run.my - 32, "Care mistake erased", "#c0e0ff");
    updateHud();
    return true;
  }
  function useBagItem(id) {
    if (missionAuth && state === "farm" && id !== "dataChip") {
      var itemR = missionAuth.act({ type: "farm.item", id: missionLocalId, item: id });
      if (!itemR || !itemR.ok) return false;
      applyMissionSnapshot(takeMissionSnapshot());
      if (itemR.effect === "vitamin") { addFloat(run.mx, run.my - 32, "Vitamin! +Joy +Bond", "#ffe080"); sfx("level"); }
      else if (itemR.effect === "eraser") addFloat(run.mx, run.my - 32, "Care mistake erased", "#c0e0ff");
      else if (itemR.effect === "medicine") addFloat(run.x, run.y - 28, "Restored!", "#7cf0c0");
      else if (itemR.effect === "toy") { addFloat(run.mx, run.my - 32, "Play! +Joy", "#ffb0e0"); sfx("toy"); }
      else if (itemR.effect === "boost") addFloat(run.mx, run.my - 36, "Power ready for battle", "#ff8030");
      updateHud();
      return true;
    }
    if (id === "medicine") return useMedicine();
    if (id === "eraser") return useEraser();
    if (id === "vitamin") return useVitamin();
    if (id === "dataChip") return tryCapture();
    if (id === "atkBoost" && takeFromBag("atkBoost")) { return useAtkBoost(); }
    if (id === "joyToy" && takeFromBag("joyToy")) { return useJoyToy(); }
    if (D.FOOD && D.FOOD[id] && state === "farm" && D.farm) return D.farm.feed(id);
    return false;
  }
  function renderBagRow() {
    var row = el.bagRow;
    if (!row || !run) return;
    if (el.carryRow) el.carryRow.hidden = true;
    var ids = (state === "farm") ? ["medicine", "eraser", "vitamin", "joyToy", "atkBoost"] : ["dataChip", "meat", "fish", "berry", "_veg", "_seed"];
    var iconFor = { meat: "meatPack", fish: "fishPack", berry: "berryPack" };
    var i, id, n, html = "", sig = "";
    for (i = 0; i < ids.length; i++) {
      id = ids[i];
      n = bagCount(id);
      sig += id + ":" + n + ";";
      if (!n) continue;
      html += "<button type='button' class='bag-chip' data-id='" + id + "'><canvas width='24' height='24'></canvas><span>" + n + "</span></button>";
    }
    if (row.dataset.sig === sig) return;
    row.dataset.sig = sig;
    row.innerHTML = html;
    var chips = row.querySelectorAll(".bag-chip"), ctx2, ico;
    for (i = 0; i < chips.length; i++) {
      id = chips[i].getAttribute("data-id");
      ico = (id === "_veg" || id === "_seed")
        ? (D.farmArt && D.farmArt.itemIcon(id === "_veg" ? "carrot" : "seed_carrot"))
        : (D.sprites.getIcon && D.sprites.getIcon(iconFor[id] || id));
      if (iconFor[id] || id === "_veg") chips[i].title = "Saved for the farm";
      if (id === "_seed") chips[i].title = "Seeds — plant them at the farm";
      if (ico) {
        ctx2 = chips[i].querySelector("canvas").getContext("2d");
        ctx2.imageSmoothingEnabled = false;
        ctx2.drawImage(ico, 0, 0, 24, 24);
      }
      chips[i].addEventListener("click", (function (itemId) {
        return function () {
          if (itemId === "_seed" && state !== "farm") {
            if (run) addFloat(run.x, run.y - 30, "Plant seeds at the farm", "#ffd36a");
            return;
          }
          if ((isFoodKind(itemId) || itemId === "_veg") && state !== "farm") {
            /* tapping food in the bag is the touch way to open the feed menu */
            if (!feedMenu.open) toggleFeedMenu();
            return;
          }
          if (state === "playing" || state === "farm" || state === "paused") useBagItem(itemId);
        };
      })(id));
    }
  }
  function renderPauseExtra() {
    var box = el.pauseExtra || $("pause-extra");
    if (!box || !run) return;
    var html = "<div class='pause-cols'><div class='pause-col'>";
    var keys = ["dataChip", "medicine", "eraser", "vitamin", "joyToy", "atkBoost", "meat", "fish", "berry"], i, id, item;
    html += "<div class='row-label'>Bag</div>";
    var any = false;
    for (i = 0; i < keys.length; i++) {
      id = keys[i];
      if (!bagCount(id)) continue;
      any = true;
      item = D.shopItem && D.shopItem(id);
      html += "<div class='pause-item'><span>" + ((item && item.name) || id) + " ×" + bagCount(id) + "</span>" +
        "<button type='button' class='btn ghost pause-use' data-use='" + id + "'>Use</button></div>";
    }
    if (run.items && run.items.length) {
      html += "<div class='pause-small'>Keys: " + run.items.join(", ") + "</div>";
    }
    if (!any && (!run.items || !run.items.length)) html += "<div class='pause-empty'>Nothing in the bag yet.</div>";
    html += "</div><div class='pause-col'><div class='row-label'>Ally</div>";
    if (run.ally) {
      html += "<div class='pause-ally'><span>Active: " + ((D.SPECIES[run.ally.form] && D.SPECIES[run.ally.form].name) || run.ally.form) +
        " Lv " + (run.ally.level || 1) + " (" + Math.round(run.ally.hp) + "/" + run.ally.maxHp + ")  \u00b7  passive: " + allyPassiveText(run.ally.passive) + "</span></div>";
    } else html += "<div class='pause-empty'>No ally yet. Catch a wild Digimon to gain one.</div>";
    if (run.passives && run.passives.length) html += "<div class='pause-ally'><span>Kept from DNA digivolving: " + run.passives.map(allyPassiveText).join(", ") + "</span></div>";
    for (i = 0; i < (run.reserve || []).length; i++) {
      html += "<div class='pause-ally'><span>Reserve: " + (run.reserve[i].name || run.reserve[i].form) + "</span>" +
        "<button type='button' class='btn ghost pause-swap' data-swap='" + i + "'>Swap in</button></div>";
    }
    html += "</div></div>";
    box.innerHTML = html;
    var btns = box.querySelectorAll("[data-use]"), b;
    for (i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", (function (itemId) {
        return function () { useBagItem(itemId); renderPause(); };
      })(btns[i].getAttribute("data-use")));
    }
    btns = box.querySelectorAll("[data-swap]");
    for (i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", (function (idx) {
        return function () { swapAlly(idx); };
      })(parseInt(btns[i].getAttribute("data-swap"), 10)));
    }
  }


  function captureKills() {
    return (run && run.captureKills) || 0;
  }
  function setCaptureKills(n) {
    if (!run) return 0;
    run.captureKills = Math.max(0, n || 0);
    return run.captureKills;
  }
  function fillCaptureCharge(n) {
    var steps = (D.CAPTURE && D.CAPTURE.hudSteps) || [];
    var maxNeed = 120, i;
    for (i = 0; i < steps.length; i++) if (steps[i].need > maxNeed) maxNeed = steps[i].need;
    var to = n != null ? n : maxNeed;
    var prev = captureKills();
    setCaptureKills(to);
    run.captureAnnouncedNeed = to;
    var crossed = D.captureThresholdCrossed && D.captureThresholdCrossed(prev, to);
    if (crossed) showNoticeToast(crossed.toast || "Capture charge ready!", "is-ready");
    else if (to >= 15) showNoticeToast("Capture charge filled (" + to + " KOs)", "is-ready");
    updateHud();
    if (state === "shop") renderShop();
    return to;
  }
  function resetCaptureCharge() {
    if (!run) return;
    run.captureKills = 0;
    run.captureAnnouncedNeed = 0;
  }
  /* Catching counts kills of ONE kind of Digimon (this run). */
  function kindKills(type) { return (run && run.killsBy && run.killsBy[type]) || 0; }
  function kindName(type) { return (D.SPECIES[type] && D.SPECIES[type].name) || (D.ENEMIES[type] && D.ENEMIES[type].name) || type; }
  function chargeReadyFor(e) {
    if (!e || !run) return false;
    var need = D.captureKoNeeded ? D.captureKoNeeded(e) : 30;
    return kindKills(e.type) >= need;
  }
  function chargeBlockReason(e) {
    var need = D.captureKoNeeded ? D.captureKoNeeded(e) : 30;
    var have = kindKills(e.type);
    if (have >= need) return "";
    return "Defeat " + (need - have) + " more " + kindName(e.type);
  }
  /* HUD line: the kind you are closest to being able to catch */
  function catchHudText() {
    var by = (run && run.killsBy) || {}, k, need, best = null, bestR = -1, r, ready = [];
    for (k in by) {
      if (!by[k] || !D.ENEMIES[k] || D.ENEMIES[k].boss) continue;
      need = D.captureKoNeeded ? D.captureKoNeeded(k) : 30;
      r = by[k] / need;
      run.catchSaid = run.catchSaid || {};
      if (r < 1) run.catchSaid[k] = false;
      else if (!run.catchSaid[k]) {
        /* the moment a kind becomes catchable, say so once */
        run.catchSaid[k] = true;
        showNoticeToast("You can try to catch " + kindName(k) + " now. Get near one and press E (" + Math.round(((D.CAPTURE && D.CAPTURE.chance) || 0.1) * 100) + "% chance).", "is-ready");
        sfx("ui");
      }
      if (r >= 1) ready.push(kindName(k));
      else if (r > bestR) { bestR = r; best = kindName(k) + " " + by[k] + "/" + need; }
    }
    if (ready.length) return "Catch ready: " + ready.slice(0, 2).join(", ") + (ready.length > 2 ? " +" + (ready.length - 2) : "") + " (E)";
    return best ? "Catch: " + best : "Catch: defeat many of one kind";
  }
  function noteCaptureKill() {
    if (!run) return;
    var prev = run.captureKills || 0;
    run.captureKills = prev + 1;
    var crossed = D.captureThresholdCrossed && D.captureThresholdCrossed(prev, run.captureKills);
    if (crossed && crossed.need > (run.captureAnnouncedNeed || 0)) {
      run.captureAnnouncedNeed = crossed.need;
      showNoticeToast(crossed.toast || "Capture charge ready!", "is-ready");
      sfx("ui");
    }
  }
  var noticeToastTimer = 0;
  function showNoticeToast(text, cls) {
    var elToast = $("capture-toast");
    if (!elToast) return;
    /* a line from the rival is not talked over by a routine notice */
    if (noticeToastTimer > 0.3 && elToast.className.indexOf("is-rival") >= 0 && !(cls && cls.indexOf("is-rival") >= 0)) return;
    if (noticeToastTimer > 0.3 && elToast.className.indexOf("is-item") >= 0 && !(cls && cls.indexOf("is-rival") >= 0)) return;   /* nor is a drop */
    elToast.textContent = text;
    elToast.className = "is-on" + (cls ? " " + cls : "");
    noticeToastTimer = 2.4;
  }
  function tickNoticeToast(dt) {
    if (noticeToastTimer <= 0) return;
    noticeToastTimer -= dt || 0;
    if (noticeToastTimer <= 0) {
      var elToast = $("capture-toast");
      if (elToast) elToast.className = "";
    }
  }
  function countFieldMegas() {
    var n = 0, i;
    for (i = 0; i < enemies.length; i++) if (enemies[i].mega && !enemies[i].dead) n += 1;
    return n;
  }
  function pickMegaFieldType() {
    var cfg = D.MEGA_SPAWN || {};
    var stages = ["Ultimate (Mega)"];
    if (cfg.includeMegaPlus !== false) stages.push("Ultimate (Mega+)");
    var pool = [], s, src, i, e;
    for (s = 0; s < stages.length; s++) {
      src = (D.EVO_TREE && D.EVO_TREE.enemies && D.EVO_TREE.enemies[stages[s]]) || [];
      for (i = 0; i < src.length; i++) {
        e = src[i];
        if (!e || !e.id) continue;
        if (D.ENEMIES[e.id] || D.SPECIES[e.id]) pool.push(e.id);
      }
    }
    if (!pool.length) {
      ["wargreymon", "metalgarurumon"].forEach(function (id) {
        if (D.ENEMIES[id] || D.SPECIES[id]) pool.push(id);
      });
    }
    if (!pool.length) return null;
    return pool[(Math.random() * pool.length) | 0];
  }
  function maybeSpawnFieldMega(dt, wave, nonBoss) {
    var cfg = D.MEGA_SPAWN;
    if (!run || !cfg) return nonBoss;
    if (run.time < (cfg.firstAt != null ? cfg.firstAt : 360)) return nonBoss;
    if (D.MEGA_MIN_STAGE != null && D.partnerStageIdx && D.partnerStageIdx(run.form) < D.MEGA_MIN_STAGE) return nonBoss;
    run.megaAcc = (run.megaAcc || 0) + dt;
    var interval = cfg.interval != null ? cfg.interval : 32;
    if (run.megaAcc < interval) return nonBoss;
    run.megaAcc = 0;
    var maxN = cfg.maxOnScreen != null ? cfg.maxOnScreen : 1;
    var cd = cfg.cooldown != null ? cfg.cooldown : 50;
    if (countFieldMegas() >= maxN) return nonBoss;
    if (run.lastMegaAt != null && run.lastMegaAt >= 0 && run.time - run.lastMegaAt < cd) return nonBoss;
    /* Field Megas are reserved encounters and must not be starved by the regular cap. */
    var type = pickMegaFieldType();
    if (!type) return nonBoss;
    if (!D.ENEMIES[type] && D.SPECIES[type]) {
      /* allow a known Mega partner form as a field encounter */
      spawnDebugEnemy(type, null, null, { fieldMega: true });
    } else {
      spawnEnemy(type, { fieldMega: true });
    }
    run.lastMegaAt = run.time;
    return nonBoss + 1;
  }
  function isCatchableMark(e) {
    if (!e || e.dead || !run) return false;
    return captureEligible(e, false).ok && chargeReadyFor(e);
  }

  function camZoom() {
    return (D.input && D.input.camera && D.input.camera.zoom) || 1;
  }
  function camRot() {
    return (D.input && D.input.camera && D.input.camera.rot) || 0;
  }
  function camSpan() {
    if (D.gl && D.gl.viewSpan) return D.gl.viewSpan({ viewW: viewW, viewH: viewH, zoom: camZoom(), rot: camRot() });
    return { w: viewW, h: viewH };
  }
  function applyWorldCamera(g, cx, cy, sx, sy) {
    var HF = D.hitFx;
    g.translate(Math.round(viewW / 2 + (sx || 0) + (HF ? HF.kickX() : 0)), Math.round(viewH / 2 + (sy || 0) + (HF ? HF.kickY() : 0)));
    var rot = camRot(), z = camZoom() * (HF ? HF.zoom() : 1);
    if (rot) g.rotate(rot);
    if (z !== 1) g.scale(z, z);
    g.translate(-cx, -cy);
  }
  function screenToWorldPt(ptr) {
    if (D.gl && D.gl.screenToWorld) {
      return D.gl.screenToWorld(ptr, { x: camX, y: camY, viewW: viewW, viewH: viewH, zoom: camZoom(), rot: camRot() });
    }
    return { x: camX + (ptr.x - viewW / 2), y: camY + (ptr.y - viewH / 2) };
  }
  /* Click-to-attack: returns the enemy under the latest canvas click/tap
   * (sprites stand above their feet, so the hit box leans upward). */
  function consumeEnemyClick() {
    var c = D.input && D.input.consumeClick ? D.input.consumeClick() : null;
    if (!c || !run || isEggForm(run.form)) return null;
    var w = c.world || screenToWorldPt(c);
    if (!w) return null;
    lastGroundClick = null;
    var i, e, r, d, best = null, bestD = 1e15;
    var slack = c.type === "touch" ? 26 : 16;
    /* the gold arrow over the hologram is a button: clicking it opens the status window */
    if (statArrowOn && Math.abs(w.x - run.x) <= 16 + slack * 0.5 && w.y >= run.y - 104 - slack * 0.5 && w.y <= run.y - 54 + slack * 0.5) { toggleStats(true); sfx("ui"); return null; }
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i];
      if (!e || e.dead) continue;
      r = Math.max((e.radius || 12) * 1.5, (e.radius || 12) + slack);
      d = dist2(w.x, w.y, e.x, e.y - (e.radius || 12) * 0.6);
      if (d < r * r && d < bestD) { bestD = d; best = e; }
    }
    if (best) {
      run.focusMarkT = 0.5;
      addFloat(best.x, best.y - (best.radius || 12) - 26, "Go!", "#ffe080");
      sfx("ui");
    } else if (!run.downed) {
      /* a click on open ground calls the partner over to that spot */
      lastGroundClick = { x: Math.round(w.x), y: Math.round(w.y) };
      run.goMark = { x: w.x, y: w.y, t: 1.1 };
      sfx("ui");
    }
    return best;
  }
  /* RT on a controller: send the partner at the enemy the right stick points
   * to (or the one you're walking toward, or the nearest). */
  function sendPartnerAtAim() {
    if (!run || run.ended || isEggForm(run.form) || run.downed) return;
    var ang = null, mx = D.input.moveX, my = D.input.moveY, i, e, dx, dy, d, da, sc, best = null, bestSc = 1e15;
    if (D.input.aimStick) ang = D.input.aimAngle;
    else if (Math.abs(mx) + Math.abs(my) > 0.2) ang = Math.atan2(my, mx);
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i];
      if (!e || e.dead || e.zz) continue;
      dx = e.x - run.x; dy = e.y - run.y; d = Math.sqrt(dx * dx + dy * dy);
      if (d > 460) continue;
      sc = d;
      if (ang != null) {
        da = Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - ang), Math.cos(Math.atan2(dy, dx) - ang)));
        if (da > 0.9) continue;
        sc = d * (1 + da * 1.5);
      }
      if (sc < bestSc) { bestSc = sc; best = e; }
    }
    if (!best) { showNoticeToast("No enemy that way."); noticeToastTimer = 1.2; return; }
    if (D.input.pushClick) D.input.pushClick({ world: { x: best.x, y: best.y - (best.radius || 12) * 0.6 }, type: "pad" });
  }
  function focusedEnemy() {
    if (!run) return null;
    var id = run.focusId, i;
    if (id == null) return run.monFocus && !run.monFocus.dead ? run.monFocus : null;
    for (i = 0; i < enemies.length; i++) if (enemies[i]._id === id && !enemies[i].dead) return enemies[i];
    return null;
  }
  /* A shrinking ring where the partner was told to go. */
  function drawGoMarker() {
    var g = run && run.goMark, u, r;
    if (!g) return;
    g.t -= frameStep;
    if (g.t <= 0) { run.goMark = null; return; }
    u = g.t / 1.1; r = 6 + 16 * u;
    ctx.save();
    ctx.globalAlpha = Math.min(1, u * 2);
    ctx.strokeStyle = "#7cf0c0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(g.x, g.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#e8fff4";
    ctx.fillRect(Math.round(g.x) - 1, Math.round(g.y) - 1, 3, 3);
    ctx.restore();
  }
  /* Gold corner brackets around the enemy the player clicked. */
  function drawFocusMarker() {
    var fe = focusedEnemy();
    if (!fe) return;
    var r = Math.max(16, (fe.radius || 12) * 1.5);
    var cy = fe.y - (fe.radius || 12) * 0.6;
    var pulse = 1 + Math.sin((run.time || 0) * 9) * 0.08 + (run.focusMarkT > 0 ? run.focusMarkT * 0.8 : 0);
    var h = Math.round(r * pulse), k = Math.max(5, Math.round(h * 0.45));
    var x0 = Math.round(fe.x), y0 = Math.round(cy);
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(10,8,20,0.75)";
    var pass, sides = [[-1, -1], [1, -1], [-1, 1], [1, 1]], si, sx, sy;
    for (pass = 0; pass < 2; pass++) {
      if (pass === 1) { ctx.lineWidth = 2; ctx.strokeStyle = "#ffd200"; }
      for (si = 0; si < 4; si++) {
        sx = sides[si][0]; sy = sides[si][1];
        ctx.beginPath();
        ctx.moveTo(x0 + sx * h, y0 + sy * (h - k));
        ctx.lineTo(x0 + sx * h, y0 + sy * h);
        ctx.lineTo(x0 + sx * (h - k), y0 + sy * h);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function pointerWorld() {
    var ptr = D.input && D.input.pointer;
    if (!ptr || !ptr.inCanvas) return null;
    if (D.input && D.input.camera && D.input.camera.gesturing) return null;
    if (D.gl && D.gl.screenToWorld) {
      return D.gl.screenToWorld(ptr, { x: camX, y: camY, viewW: viewW, viewH: viewH, zoom: camZoom(), rot: camRot() });
    }
    return { x: camX + (ptr.x - viewW / 2), y: camY + (ptr.y - viewH / 2) };
  }
  function angleDiff(a, b) {
    var d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return Math.abs(d);
  }
  function syncAim() {
    if (!run) return 0;
    if (D.input && D.input.aimStick) {
      run.aim = D.input.aimAngle;
      return run.aim;
    }
    var pw = pointerWorld();
    if (pw) {
      run.aim = Math.atan2(pw.y - run.y, pw.x - run.x);
      if (D.input && D.input.setAimAngle) D.input.setAimAngle(run.aim);
      return run.aim;
    }
    if (run.aim == null) run.aim = run.facing >= 0 ? 0 : Math.PI;
    return run.aim;
  }
  function throwRange() {
    return ((D.CAPTURE && D.CAPTURE.range) || 92) * 2.2;
  }
  function captureTarget() {
    if (!run) return null;
    var i, e, d, ang, da, score, best = null, bestScore = -1e9;
    var range = throwRange();
    var nearRange = (D.CAPTURE && D.CAPTURE.range) || 92;
    var aim = syncAim();
    var pw = pointerWorld();
    var mouseBest = null, mouseD = 36;
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i];
      if (e.dead || e.virus) continue;          /* an infected Digimon cannot be caught */
      d = Math.sqrt(dist2(run.x, run.y, e.x, e.y));
      if (pw) {
        var md = Math.sqrt(dist2(pw.x, pw.y, e.x, e.y));
        if (md < mouseD && d <= range) { mouseD = md; mouseBest = e; }
      }
      ang = Math.atan2(e.y - run.y, e.x - run.x);
      da = angleDiff(ang, aim);
      if (d <= range && da < 0.55) {
        score = (1 - da / 0.55) * 2 + (1 - d / range);
        if (score > bestScore) { bestScore = score; best = e; }
      } else if (!best && d <= nearRange) {
        best = e;
        bestScore = -d;
      }
    }
    return mouseBest || best;
  }
  function drawAim() {
    if (!run || state !== "playing") return;
    /* The aim still follows the pointer, but nothing is drawn for it: no
     * line from the ghost and no dot (removed Nov 16). */
    syncAim();
    ctx.save();
    var tgt = captureTarget();
    if (tgt) {
      ctx.strokeStyle = "rgba(255,224,80,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tgt.x, tgt.y - 4, (tgt.radius || 12) + 10, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (run.chipThrow) {
      var u = 1 - (run.chipThrow.t / (run.chipThrow.max || 0.16));
      var cx = run.chipThrow.x + (run.chipThrow.tx - run.chipThrow.x) * u;
      var cy = run.chipThrow.y + (run.chipThrow.ty - run.chipThrow.y) * u;
      ctx.fillStyle = "#6ad0ff";
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  function captureEligible(e, force) {
    if (!e) return { ok: false, reason: "No foe nearby" };
    var def = D.ENEMIES[e.type];
    if (def && def.boss && !(e && e.mega)) return { ok: false, reason: "Can't capture bosses" };
    var hpRatio = e.maxHp > 0 ? e.hp / e.maxHp : 1;
    return { ok: true, hpRatio: hpRatio };
  }
  /* E beside a black spire or a data cache (data.js TERRAIN) */
  function usableProp() {
    if (!run || run.ended || run.downed || !D.world || !D.world.usableNear || !D.TERRAIN) return null;
    return D.world.usableNear(run.x, run.y, D.TERRAIN.useRadius || 78);
  }
  function tryUseProp() {
    var u = usableProp(), res;
    if (!u || !missionAuth) return false;
    res = missionAuth.act({ type: "prop.use", id: missionLocalId, tx: u.tx, ty: u.ty });
    if (res && !res.ok && res.reason) addFloat(run.x, run.y - 40, res.reason, "#ffd36a");
    return !!(res && res.ok);
  }

  function tryCapture(opts) {
    opts = opts || {};
    if (!run || run.ended) return { ok: false, reason: "no run" };
    if (missionAuth) {
      if ((opts.force || opts.roll != null || opts.chance != null || opts.free) && !missionAuth.allowDebugIntents) {
        return { ok: false, reason: "rejected" };
      }
      var eA = opts.enemy || captureTarget();
      var cap = missionAuth.act({ type: "capture", id: missionLocalId, enemyId: eA && eA._id });
      applyMissionSnapshot(takeMissionSnapshot());
      if (eA) {
        run.chipThrow = { x: run.x, y: run.y - 8, tx: eA.x, ty: eA.y - 8, t: 0.16, max: 0.16 };
        run.captureFx = { x: eA.x, y: eA.y, t: 0.85, ok: !!cap.ok, form: cap.form || eA.type };
      }
      if (cap.ok) { addFloat(run.x, run.y - 36, "Captured!", "#6ad0ff"); sfx("level"); }
      else if (cap.reason && cap.reason !== "rejected") addFloat(run.x, run.y - 28, cap.reason, "#ff8080");
      else if (cap.chance != null) { addFloat(run.x, run.y - 36, "Broke free!", "#ff8080"); sfx("hurt"); }
      updateHud();
      return cap;
    }
    if (state !== "playing" && !opts.force && opts.chance == null && opts.roll == null) return { ok: false, reason: "not playing" };
    var e = opts.enemy || captureTarget();
    var elig = captureEligible(e, opts.force);
    if (!elig.ok) {
      addFloat(run.x, run.y - 28, elig.reason, "#ff8080");
      return { ok: false, reason: elig.reason };
    }
    if (!opts.force && !chargeReadyFor(e)) {
      var why = chargeBlockReason(e);
      addFloat(run.x, run.y - 28, why, "#ff8080");
      return { ok: false, reason: why, blocked: "charge", kills: captureKills() };
    }
    if (!opts.force && !opts.free && !takeFromBag("dataChip")) {
      addFloat(run.x, run.y - 28, "Need a Data Chip", "#ff8080");
      return { ok: false, reason: "Need a Data Chip" };
    }
    run.chipThrow = { x: run.x, y: run.y - 8, tx: e.x, ty: e.y - 8, t: 0.16, max: 0.16 };
    var chance = opts.chance != null ? opts.chance : (opts.force ? 1 : D.captureChance(e, run));
    var roll = opts.roll != null ? opts.roll : Math.random();
    var success = roll < chance;
    resetCaptureCharge();
    run.captureFx = { x: e.x, y: e.y, t: 0.85, ok: success, form: e.type };
    burst(e.x, e.y, success ? "#6ad0ff" : "#ff8080", success ? 22 : 10, 160);
    if (success) {
      var form = e.type;
      e.dead = true;
      addFloat(e.x, e.y - 36, "Captured!", "#6ad0ff");
      sfx("level");
      joinCaptured(form);
      bankCaptured(form);
    } else {
      addFloat(e.x, e.y - 36, "Broke free!", "#ff8080");
      sfx("hurt");
    }
    updateHud();
    return { ok: success, chance: chance, roll: roll, form: e.type };
  }
  function allyRecord(form) {
    var sp = D.SPECIES[form] || D.ENEMIES[form] || {};
    return { form: form, name: sp.name || form, stage: sp.stage || "", attribute: sp.attribute || "" };
  }
  function joinCaptured(form) {
    if (D.sprites && D.sprites.preloadSpecies) D.sprites.preloadSpecies(form, true);
    if (!run.ally) spawnAlly(form);
    else if (run.reserve.length >= D.CAPTURE.reserveMax) {
      addFloat(run.x, run.y - 40, "Reserve full — sent to DigiBank", "#ffe080");
    } else {
      run.reserve.push(allyRecord(form));
      addFloat(run.x, run.y - 40, ((D.SPECIES[form] && D.SPECIES[form].name) || form) + " in reserve", "#6ad0ff");
    }
  }
  function spawnAlly(form, x, y) {
    var sp = D.SPECIES[form] || {};
    var en = D.ENEMIES[form] || {};
    var base = sp.base || {};
    var pos = snapWalkable(x != null ? x : run.x + 40, y != null ? y : run.y - 20, actorRad(form), 240);
    var maxHp = Math.max(20, Math.round((base.maxHp || en.hp || 40) * ((D.CAPTURE && D.CAPTURE.allyHpMul) || 0.85)));
    var wpn = base.startWeapon || sp.startWeapon || "pepperBreath";
    if (!D.WEAPONS[wpn]) wpn = "pepperBreath";
    run.ally = {
      form: form,
      x: pos.x,
      y: pos.y,
      facing: 1,
      moving: false,
      hp: maxHp,
      maxHp: maxHp,
      invuln: 0.4,
      weapon: { id: wpn, level: 1, cd: 0.25 },
      target: null
    };
    if (D.sprites && D.sprites.preloadSpecies) D.sprites.preloadSpecies(form, true);
    addFloat(pos.x, pos.y - 32, ((sp.name) || form) + " joins!", "#6ad0ff");
    return run.ally;
  }
  function withdrawAlly(reason) {
    if (!run || !run.ally) return;
    var rec = allyRecord(run.ally.form);
    addFloat(run.ally.x, run.ally.y - 28, reason || "Ally retreated!", "#c0a0ff");
    if (run.reserve.length < D.CAPTURE.reserveMax) run.reserve.push(rec);
    run.ally = null;
  }
  function swapAlly(index) {
    if (!run || index < 0 || index >= run.reserve.length) return false;
    var next = run.reserve[index];
    var prev = run.ally ? allyRecord(run.ally.form) : null;
    run.reserve.splice(index, 1);
    if (prev) run.reserve.push(prev);
    spawnAlly(next.form, run.x + 40, run.y - 16);
    if (state === "paused") renderPause();
    return true;
  }
  function hurtAlly(dmg) {
    if (!run || !run.ally || run.ally.invuln > 0 || isEggForm(run.ally.form)) return;
    run.ally.hp -= dmg;
    run.ally.invuln = 0.4;
    burst(run.ally.x, run.ally.y, "#ffb080", 6, 80);
    if (run.ally.hp <= 0) withdrawAlly("Ally retreated!");
  }
  function updateAlly(dt) {
    var a = run && run.ally;
    if (!a) return;
    a.invuln = Math.max(0, a.invuln - dt);
    var L = D.CAPTURE;
    var dT = Math.sqrt(dist2(a.x, a.y, run.x, run.y));
    var desiredX = a.x, desiredY = a.y;
    var target = nearestEnemy(a.x, a.y);
    a.target = target;
    if (target) {
      var ed = Math.sqrt(dist2(a.x, a.y, target.x, target.y));
      if (ed > 70) { desiredX = target.x; desiredY = target.y; }
      if (target.x !== a.x) a.facing = target.x < a.x ? -1 : 1;
    } else if (dT > L.allyComfort) {
      desiredX = run.x;
      desiredY = run.y;
    }
    var vx = desiredX - a.x, vy = desiredY - a.y;
    var sp = (D.SPECIES[a.form] && D.SPECIES[a.form].base && D.SPECIES[a.form].base.speed) || 70;
    sp *= 0.95;
    var l = len(vx, vy);
    if (l > 4) {
      var pos = slideMove(a.x, a.y, (vx / l) * sp * dt, (vy / l) * sp * dt, actorRad(a.form), crossOf(a.form));
      a.moving = Math.abs(pos.x - a.x) + Math.abs(pos.y - a.y) > 0.2;
      a.x = pos.x;
      a.y = pos.y;
    } else a.moving = false;
    if (dT > L.allyLeash * 1.8) {
      var back = snapWalkable(run.x + 36, run.y - 16, actorRad(a.form), 200);
      a.x = back.x;
      a.y = back.y;
    }
    updateAllyWeapon(dt, a);
  }
  function updateAllyWeapon(dt, a) {
    if (!a.weapon) return;
    var def = D.WEAPONS[a.weapon.id];
    if (!def) return;
    var lv = def.levels[Math.min(a.weapon.level, def.maxLevel) - 1];
    a.weapon.cd -= dt;
    if (a.weapon.cd > 0) return;
    var target = a.target || nearestEnemy(a.x, a.y);
    if (!target) return;
    a.weapon.cd = (lv.cooldown || 1) * D.CAPTURE.allyCd;
    var ang = Math.atan2(target.y - a.y, target.x - a.x);
    fireAllyShot(def, lv, ang, a);
  }
  function fireAllyShot(def, lv, ang, a) {
    var n = norm(Math.cos(ang), Math.sin(ang));
    var kind = def.type === "nova" ? "nova" : (def.type === "missile" ? "missile" : "projectile");
    var sp = D.SPECIES[a.form] || {};
    var dmg = (lv.damage || 6) * ((sp.base && sp.base.damage) || 1) * (run.stats.damageMul || 1) * D.CAPTURE.allyDmg;
    if (run.atkBoost > 0) dmg *= D.CAPTURE.atkBoostMul;
    if (a.target) {
      var reach = (a.target.radius || 12) + (lv.radius || 6) + 22;
      if (dist2(a.x, a.y, a.target.x, a.target.y) <= reach * reach) {
        hurtEnemy(a.target, dmg, a.target.x - a.x, a.target.y - a.y, 16);
      }
    }
    if (def.type === "aura" || def.type === "orbit") {
      var j, e;
      for (j = 0; j < enemies.length; j++) {
        e = enemies[j];
        if (dist2(a.x, a.y, e.x, e.y) <= Math.pow((lv.radius || 40) + e.radius, 2)) {
          hurtEnemy(e, dmg, e.x - a.x, e.y - a.y, 16);
        }
      }
      return;
    }
    bullets.push({
      x: a.x + n.x * 14,
      y: a.y + n.y * 8,
      vx: n.x * (lv.speed || 220),
      vy: n.y * (lv.speed || 220),
      damage: dmg,
      radius: lv.radius || 6,
      pierce: lv.pierce || 0,
      life: lv.life || 1.6,
      color: def.color,
      glow: def.glow,
      kind: kind,
      knockback: lv.knockback || 0,
      homing: lv.homing || 0,
      explode: lv.explode || 0,
      slow: lv.slow,
      slowTime: lv.slowTime,
      hit: {},
      fromAlly: true
    });
  }
  function bankCaptured(form) {
    save.digibank = save.digibank || [];
    var rec = allyRecord(form);
    rec.capturedAt = Date.now();
    if (save.digibank.length >= D.CAPTURE.bankMax) save.digibank.shift();
    save.digibank.push(rec);
    writeSave();
  }
  function openBank() {
    bankConfirming = false;
    setState("bank");
  }
  function closeBank() {
    if (state === "bank") setState("title");
  }
  function recMatchesDeploy(rec) {
    var d = save.bankDeploy;
    if (!d || !rec) return false;
    if (typeof d === "object") return d.form === rec.form && d.capturedAt === rec.capturedAt;
    return d === rec.form;
  }
  function deployedRecord() {
    var list = save.digibank || [], i;
    for (i = 0; i < list.length; i++) if (recMatchesDeploy(list[i])) return list[i];
    return null;
  }
  function bankStatLine(rec) {
    var sp = (D.SPECIES && D.SPECIES[rec.form]) || {};
    var base = sp.base || {};
    var en = (D.ENEMIES && D.ENEMIES[rec.form]) || {};
    var hp = base.maxHp || en.hp;
    var atk = base.damage;
    var spd = base.speed || en.speed;
    var wpn = (sp.startWeapon && D.WEAPONS[sp.startWeapon] && D.WEAPONS[sp.startWeapon].name) || "";
    var parts = [];
    if (hp != null) parts.push("HP " + hp);
    if (atk != null) parts.push("ATK " + atk);
    if (spd != null) parts.push("SPD " + spd);
    if (wpn) parts.push(wpn);
    return parts.join(" · ");
  }
  function paintBankCard(cv, form, empty) {
    if (!cv || !D.sprites) return;
    var size = syncPreviewCanvas(cv);
    var c = cv.getContext("2d");
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, size.w, size.h);
    if (empty || !form) {
      c.strokeStyle = "rgba(192,200,212,0.45)";
      c.lineWidth = 2;
      c.setLineDash([5, 5]);
      c.beginPath();
      c.ellipse(size.w / 2, size.h * 0.58, size.w * 0.22, size.h * 0.28, 0, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);
      return;
    }
    var nativeH = (D.sprites.visualHeight && D.sprites.visualHeight(form)) || 54;
    var scale = previewDrawScale(nativeH, cv, 1, 8);
    /* Target ~70% of the card: previewDrawScale already fills most of the canvas height. */
    paintPreviewScaled(c, size.w, size.h, scale, function (ctx) {
      if (D.sprites.drawPartner) D.sprites.drawPartner(ctx, form, 0, 0, 1, 1, titleTime, false, false, false);
    });
  }
  function paintBankPreviews() {
    if (state !== "bank") return;
    var grid = $("bank-grid");
    if (!grid) return;
    var cards = grid.querySelectorAll(".bank-card");
    var i, cv, form;
    for (i = 0; i < cards.length; i++) {
      cv = cards[i].querySelector("canvas");
      form = cards[i].dataset.form;
      paintBankCard(cv, form, cards[i].classList.contains("is-empty"));
    }
  }
  function renderBank() {
    renderMemories();
    var grid = $("bank-grid");
    var sub = $("bank-sub");
    var banner = $("bank-deploy-banner");
    var confirm = $("bank-confirm");
    var confirmMsg = $("bank-confirm-msg");
    var actions = $("bank-actions");
    var list = save.digibank || [];
    var cap = (D.CAPTURE && D.CAPTURE.bankMax) || 12;
    var deploy = deployedRecord();
    if (sub) {
      sub.textContent = list.length
        ? (list.length + " / " + cap + " stored. Pick a card, then bring that ally on your next run — or release it.")
        : "No captures yet. Build a KO charge, weaken a non-boss, and use a Data Chip. Empty slots show the bank's capacity (up to " + cap + ").";
    }
    if (banner) {
      if (deploy) {
        banner.className = "bank-deploy-banner";
        banner.textContent = "Next run ally: " + (deploy.name || deploy.form);
      } else {
        banner.className = "bank-deploy-banner is-empty";
        banner.textContent = "No ally set for the next run.";
      }
    }
    if (confirm) {
      confirm.hidden = !bankConfirming;
      if (bankConfirming && confirmMsg && list[bankCursor]) {
        confirmMsg.textContent = "Release " + (list[bankCursor].name || list[bankCursor].form) + " from the DigiBank? This cannot be undone.";
      }
    }
    if (actions) actions.hidden = !!bankConfirming;
    if (!grid) return;
    grid.innerHTML = "";
    if (bankCursor >= list.length) bankCursor = Math.max(0, list.length - 1);
    var idx, rec, btn, cv, name, stage, stats, badge, capI, wrap;
    for (idx = 0; idx < cap; idx++) {
      rec = list[idx];
      if (rec) {
        btn = document.createElement("button");
        btn.type = "button";
        btn.className = "bank-card" + (idx === bankCursor ? " is-selected" : "") + (recMatchesDeploy(rec) ? " is-deploy" : "");
        btn.dataset.form = rec.form;
        btn.dataset.idx = String(idx);
        wrap = document.createElement("div");
        wrap.className = "preview-wrap";
        cv = document.createElement("canvas");
        cv.width = 200;
        cv.height = 200;
        cv.className = "pixelated preview-cv";
        wrap.appendChild(cv);
        btn.appendChild(wrap);
        if (recMatchesDeploy(rec)) {
          badge = document.createElement("div");
          badge.className = "badge";
          badge.textContent = "NEXT RUN";
          btn.appendChild(badge);
        }
        name = document.createElement("div");
        name.className = "name";
        name.textContent = rec.name || rec.form;
        btn.appendChild(name);
        stage = document.createElement("div");
        stage.className = "stage";
        stage.textContent = (rec.stage || "") + (rec.attribute && rec.attribute !== "None" ? " · " + rec.attribute : (D.SPECIES[rec.form] && D.SPECIES[rec.form].attribute && D.SPECIES[rec.form].attribute !== "None" ? " · " + D.SPECIES[rec.form].attribute : ""));
        if (!stage.textContent) stage.textContent = rec.stage || "";
        btn.appendChild(stage);
        stats = document.createElement("div");
        stats.className = "stats";
        stats.textContent = bankStatLine(rec);
        btn.appendChild(stats);
        btn.addEventListener("click", function (ev) {
          var i = parseInt(this.dataset.idx, 10);
          bankCursor = i;
          bankConfirming = false;
          renderBank();
          sfx("ui");
        });
        grid.appendChild(btn);
        if (D.sprites && D.sprites.preloadSpecies) D.sprites.preloadSpecies(rec.form, true);
      } else {
        capI = document.createElement("div");
        capI.className = "bank-card is-empty";
        wrap = document.createElement("div");
        wrap.className = "preview-wrap";
        cv = document.createElement("canvas");
        cv.width = 200;
        cv.height = 200;
        cv.className = "pixelated preview-cv";
        wrap.appendChild(cv);
        capI.appendChild(wrap);
        name = document.createElement("div");
        name.className = "name";
        name.textContent = "Empty";
        capI.appendChild(name);
        stage = document.createElement("div");
        stage.className = "stage";
        stage.textContent = "Open slot";
        capI.appendChild(stage);
        grid.appendChild(capI);
      }
    }
    paintBankPreviews();
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(function () { paintBankPreviews(); });
    }
    var rel = $("btn-bank-release");
    var dep = $("btn-bank-deploy");
    if (rel) rel.disabled = !list[bankCursor];
    if (dep) dep.disabled = !list[bankCursor];
    focusMenu();
  }
  function deploySelected() {
    var list = save.digibank || [];
    if (!list[bankCursor]) return;
    save.bankDeploy = { form: list[bankCursor].form, capturedAt: list[bankCursor].capturedAt };
    writeSave();
    renderBank();
    sfx("pick");
  }
  function armBankRelease() {
    if (!(save.digibank || [])[bankCursor]) return;
    bankConfirming = true;
    renderBank();
    focusMenu();
  }
  function confirmBankRelease() {
    var list = save.digibank || [];
    var rec = list[bankCursor];
    if (!rec) { bankConfirming = false; renderBank(); return; }
    if (recMatchesDeploy(rec)) save.bankDeploy = null;
    list.splice(bankCursor, 1);
    save.digibank = list;
    bankConfirming = false;
    if (bankCursor >= list.length) bankCursor = Math.max(0, list.length - 1);
    writeSave();
    renderBank();
    sfx("ui");
  }

  function updateOrbs(dt) {
    var i, o, magnet, d, n, pull;
    magnet = D.TAMER.magnet * run.stats.magnetMul;
    for (i = orbs.length - 1; i >= 0; i--) {
      o = orbs[i];
      o.vy += 90 * dt;
      o.vx *= 0.9;
      o.vy *= 0.9;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      d = Math.sqrt(dist2(o.x, o.y, run.x, run.y));
      if (d < magnet || o.magnet) {
        o.magnet = true;
        n = norm(run.x - o.x, run.y - o.y);
        pull = 420 + (magnet - d) * 2;
        o.x += n.x * pull * dt;
        o.y += n.y * pull * dt;
        d = Math.sqrt(dist2(o.x, o.y, run.x, run.y));
        if (!reducedFx && o.kind === "xp" && Math.random() < 0.12) {
          addParticle(o.x, o.y, n.x * 40, n.y * 40, "#7cf0c0", 0.16, 2, "trail", true, 0);
        }
      }
      if (d < D.PLAYER.pickupRadius + 8) {
        if (eatOrb(o) !== false) orbs.splice(i, 1);
        continue;
      }
      if (o.kind === "heal" && tryCpuHealPickup(o)) {
        orbs.splice(i, 1);
      }
    }
  }

  function updateCare(dt) {
    var c = D.CARE;
    /* Battle is the main hunger drain. Farm uses its own trickle. Brawl does not call this. */
    if (state === "playing" && !isEggForm(run.form)) {
      run.fullness = Math.max(0, run.fullness - c.fullnessDecayPerSec * dt);
    }
    if (run.streakTimer > 0) {
      run.streakTimer -= dt;
      if (run.streakTimer <= 0) run.killStreak = 0;
    }
    run.desperation = run.hp > 0 && run.hp / run.maxHp < c.desperationHpRatio;
    if (run.desperation) {
      run.happiness = Math.max(0, run.happiness - c.desperationHappinessDrain * dt);
      run.desperationTime = (run.desperationTime || 0) + dt;
    }
    /* Care mistakes from hunger are applied on farm exit, not mid-combat. */
    if (run.happiness > run.peakHappiness) run.peakHappiness = run.happiness;
    if (run.evoLock > 0) run.evoLock = Math.max(0, run.evoLock - dt);
    if (D.rarity && D.rarity.tick) {
      D.rarity.tick(run, dt, { dist: Math.sqrt(dist2(run.x, run.y, run.mx, run.my)), silentHunger: state === "playing" });
    }
  }

  /* ---------- Level & evolution ---------- */
  function tryLevel() {
    while (run.xp >= run.xpNext) {
      run.xp -= run.xpNext;
      run.level += 1;
      run.xpNext = xpNeeded(run.level);
      pendingLevels += 1;
    }
    if (pendingLevels > 0 && state === "playing") openLevelUp();
  }

  function buildPool() {
    var pool = [];
    var owned = {};
    var i, id, w, def, st, lv;
    for (i = 0; i < run.weapons.length; i++) owned[run.weapons[i].id] = run.weapons[i];
    for (id in D.WEAPONS) {
      def = D.WEAPONS[id];
      if (def.signature) continue;
      if (owned[id]) {
        if (owned[id].level < def.maxLevel) {
          lv = owned[id].level + 1;
          pool.push({ kind: "weapon", id: id, next: lv, title: def.name, desc: def.summary, label: "Lv " + owned[id].level + " → " + lv });
        }
      } else {
        pool.push({ kind: "weapon", id: id, next: 1, title: def.name, desc: def.summary, label: "New ability" });
      }
    }
    for (id in D.STAT_UPGRADES) {
      st = D.STAT_UPGRADES[id];
      lv = run.statLevels[id] || 0;
      if (lv < st.maxLevel) {
        pool.push({ kind: "stat", id: id, next: lv + 1, title: st.name, desc: st.summary, label: "Lv " + lv + " → " + (lv + 1) });
      }
    }
    return pool;
  }


  function ensureSession(opts) {
    opts = opts || {};
    if (!run || !D.session) return null;
    var botCount = opts.botCount != null ? opts.botCount : (run.cpuBots != null ? run.cpuBots : selectedCpuBots);
    var needFresh = !run.session || opts.freshSession || opts.botForms || opts.botNames || opts.botTiers || opts.botCount != null;
    if (run.session && !needFresh && run.session.bots && run.session.bots().length !== botCount) needFresh = true;
    if (needFresh) {
      run.session = D.session.createLocal({
        seed: (run.worldSeed || 1) ^ ((opts.salt || 0) >>> 0),
        local: { name: "You", tamerId: run.tamerId || "junior", form: run.form },
        botForms: opts.botForms,
        botNames: opts.botNames,
        botTiers: opts.botTiers,
        botCount: botCount
      });
    }
    var loc = run.session.local && run.session.local();
    if (loc) {
      loc.form = isEggForm(run.form) && D.SPECIES[run.form] ? (D.SPECIES[run.form].hatchTo || run.form) : run.form;
      loc.tamerId = run.tamerId || loc.tamerId;
    }
    return run.session;
  }

  function startBrawl(opts) {
    if (!run || run.ended) return false;
    if (!D.brawl || !D.brawl.begin) return false;
    opts = opts || {};
    var sess = ensureSession(opts);
    if (!sess) return false;
    if (!missionAuth) {
      run.lastBrawlLevel = run.level;
      run.pendingBrawl = false;
    }
    setState("brawl");
    var result = D.brawl.begin(Object.assign({ session: sess }, opts));
    if (result && result.skipped) {
      if (state === "brawl") setState("playing");
      addFloat(run.x, run.y - 28, "Brawl skipped — no challengers", "#ffe080");
      return false;
    }
    return true;
  }

  function maybeStartBrawl() {
    if (!run || state === "evolution" || state === "brawl" || state === "farm") return false;
    if (missionAuth) {
      if (missionAuth.sim && missionAuth.sim.phase === "brawl") return startBrawl({ fromAuth: true });
      if (!run.pendingBrawl) return false;
      return startBrawl({ fromAuth: true });
    }
    if (!D.brawl || !D.brawl.shouldBrawl || !D.brawl.shouldBrawl(run)) return false;
    return startBrawl();
  }

  function startFarm(opts) {
    opts = opts || {};
    if (!run || !D.farm) return false;
    if (state === "brawl" || state === "evolution" || state === "levelup" || state === "shop") {
      if (opts.scheduled && !missionAuth) run.pendingFarm = true;
      return false;
    }
    if (D.farm.isActive && D.farm.isActive()) {
      if (state !== "farm" && state !== "shop") {
        setState("farm");
        if (D.farm.render) D.farm.render();
      }
      return true;
    }
    if (opts.scheduled && !missionAuth) run.pendingFarm = false;
    D.farm.begin(opts);
    return true;
  }

  function maybeStartFarm() {
    if (!run || !D.farm) return false;
    if (state === "evolution" || state === "brawl" || state === "levelup" || state === "farm" || state === "shop") return false;
    if (missionAuth) {
      if (missionAuth.sim && missionAuth.sim.phase === "farm") return startFarm({ scheduled: true, fromAuth: true });
      if (!run.pendingFarm) return false;
      return startFarm({ scheduled: true, fromAuth: true });
    }
    if (!(run.pendingFarm || D.farm.shouldVisit(run))) return false;
    return startFarm({ scheduled: true });
  }

  function resumeAfterIntermission() {
    if (state !== "playing") return;
    if (maybeStartBrawl()) return;
    maybeStartFarm();
  }

  function applyPendingBoost() {
    if (!run || !run.pendingAtkBoost) return;
    run.atkBoost = (run.atkBoost || 0) + run.pendingAtkBoost;
    run.pendingAtkBoost = 0;
    addFloat(run.mx, run.my - 36, "Power up!", "#ff8030");
  }

  function tickFarmSchedule() {
    if (!run || !D.farm) return false;
    if (missionAuth) return maybeStartFarm();
    D.farm.warn(run);
    if (D.farm.shouldVisit(run)) {
      run.pendingFarm = true;
      return maybeStartFarm();
    }
    return false;
  }

  function followAuthLifecycle() {
    if (!missionAuth || !run) return;
    var phase = missionAuth.sim && missionAuth.sim.phase;
    if (phase === "farm") maybeStartFarm();
    else if (phase === "brawl") maybeStartBrawl();
    else if (state === "playing") {
      maybeStartBrawl();
      maybeStartFarm();
    }
  }

  function takeUpgrade(choice) {
    var i, found = false;
    if (missionAuth) {
      var up = missionAuth.act({ type: "levelup", id: missionLocalId, kind: choice.kind, choice: choice.id, token: choice.token });
      if (!up || !up.ok) return;
      pendingLevels = up.pending;
      applyMissionSnapshot(takeMissionSnapshot());
      sfx("pick");
    } else {
    if (choice.kind === "weapon") {
      for (i = 0; i < run.weapons.length; i++) {
        if (run.weapons[i].id === choice.id) {
          run.weapons[i].level = choice.next;
          found = true;
        }
      }
      if (!found) run.weapons.push({ id: choice.id, level: 1, cd: 0.1 });
    } else if (choice.kind === "stat") {
      run.statLevels[choice.id] = choice.next;
      rebuildStats();
    }
    sfx("pick");
      pendingLevels = Math.max(0, pendingLevels - 1);
    }
    if (pendingLevels > 0) openLevelUp();
    else {
      setState("playing");
      checkEvolution();
      if (state === "playing") resumeAfterIntermission();
    }
  }

  function decorateOffer(ch) {
    var def, st;
    if (ch.kind === "weapon") {
      def = D.WEAPONS && D.WEAPONS[ch.id];
      ch.title = ch.title || (def && def.name) || ch.id;
      ch.desc = ch.desc || (def && def.summary) || "";
      ch.label = ch.label || (ch.next === 1 ? "New move" : ("Lv " + (ch.next - 1) + " → " + ch.next));
    } else {
      st = D.STAT_UPGRADES && D.STAT_UPGRADES[ch.id];
      ch.title = ch.title || (st && st.name) || ch.id;
      ch.desc = ch.desc || (st && st.summary) || "";
      ch.label = ch.label || ("Lv " + ((ch.next || 1) - 1) + " → " + ch.next);
    }
    return ch;
  }
  function openLevelUp() {
    var pool, picks = [], i, k, copy;
    if (missionAuth) {
      if (!(run.levelOffers && run.levelOffers.length) && missionAuth.progression && missionAuth.sim) {
        var lp = missionAuth.sim.player(missionLocalId) || missionAuth.sim.players[0];
        if (lp) missionAuth.progression.rollOffers(lp);
        if (lp && lp.levelOffers) run.levelOffers = lp.levelOffers;
      }
      picks = (run.levelOffers || []).map(decorateOffer);
    } else {
      pool = buildPool();
      copy = pool.slice();
      for (i = 0; i < 3 && copy.length; i++) {
        k = (Math.random() * copy.length) | 0;
        picks.push(copy.splice(k, 1)[0]);
      }
    }
    if (!picks.length) {
      pendingLevels = 0;
      setState("playing");
      return;
    }
    sfx("level");
    el.levelupSub.textContent = "Level " + run.level + " — pick one. A / Enter / tap to confirm.";
    el.levelupCards.innerHTML = "";
    for (i = 0; i < picks.length; i++) {
      (function (ch, idx) {
        var btn = document.createElement("button");
        btn.type = "button";
        var rarity = ch.kind === "stat" ? "common" : (ch.next === 1 ? "rare" : "uncommon");
        btn.className = "card is-" + rarity + (idx === 0 ? " is-selected" : "");
        btn.innerHTML = '<div class="card-top"><canvas class="card-ico" width="36" height="36"></canvas><div class="kind"></div></div>' +
          '<div class="title"></div><div class="lvl"></div><div class="desc"></div>';
        btn.querySelector(".kind").textContent = (ch.kind === "weapon" ? (ch.from ? "Move evolves" : (ch.next === 1 ? "New move" : "Upgrade")) : "Stat") + " · " + rarity;
        btn.querySelector(".title").textContent = ch.title;
        btn.querySelector(".lvl").textContent = ch.label;
        btn.querySelector(".desc").textContent = ch.desc;
        var ico = D.sprites.getIcon && D.sprites.getIcon(ch.id);
        if (ico) {
          var ic = btn.querySelector(".card-ico").getContext("2d");
          ic.imageSmoothingEnabled = false;
          ic.drawImage(ico, 0, 0, 36, 36);
        }
        btn.addEventListener("click", function () { takeUpgrade(ch); });
        el.levelupCards.appendChild(btn);
      })(picks[i], i);
    }
    setState("levelup");
  }

  function noteFaint() {
    run.faint = D.FAINT.duration;
    run.happiness = clamp(run.happiness - D.FAINT.joyLoss, 0, D.CARE.happinessMax);
    run.desperation = false;
    run.faints = (run.faints || 0) + 1;
    run.careMistakes = (run.careMistakes || 0) + 1;
    if (D.rarity && D.rarity.noteFaintSignal) D.rarity.noteFaintSignal(run);
  }

  function recordKill(type, def) {
    run.killsSpecies = run.killsSpecies || {};
    run.killsAttribute = run.killsAttribute || {};
    run.killsSpecies[type] = (run.killsSpecies[type] || 0) + 1;
    var attr = (def && def.attribute) || (D.SPECIES[type] && D.SPECIES[type].attribute);
    if (attr) run.killsAttribute[attr] = (run.killsAttribute[attr] || 0) + 1;
    if (def && def.boss) run.bossesBeaten = (run.bossesBeaten || 0) + 1;
    if (D.rarity && D.rarity.noteKill) D.rarity.noteKill(run);
  }

  function evoStats() {
    if (!run) return {};
    var stats = {
      level: run.level,
      meals: run.foodEaten,
      joy: run.happiness,
      happiness: run.happiness,
      hpRatio: run.maxHp ? run.hp / run.maxHp : 1,
      careMistakes: run.careMistakes || 0,
      foodCounts: run.foodCounts || {},
      killsAttribute: run.killsAttribute || {},
      killsSpecies: run.killsSpecies || {},
      bossesBeaten: run.bossesBeaten || 0,
      faints: run.faints || 0,
      desperationTime: run.desperationTime || 0,
      partners: run.partners || [],
      items: run.items || [],
      trainStats: run.trainStats || { offense: 0, intelligence: 0, agility: 0 },
      offense: (run.trainStats && run.trainStats.offense) || 0,
      intelligence: (run.trainStats && run.trainStats.intelligence) || 0,
      agility: (run.trainStats && run.trainStats.agility) || 0,
      bondTrain: run.bondTrain || 0,
      formTime: Math.max(0, (run.time || 0) - (run.formSince || 0)),
      runTime: run.time || 0
    };
    if (D.rarity && D.rarity.attachStats) D.rarity.attachStats(stats, run);
    if (save && save.discoveries) stats.discoveries = save.discoveries;
    return stats;
  }

  function statsForTree(stats) {
    stats = Object.assign({}, stats || evoStats());
    if (D.uniqueMostFood) stats.mostFood = D.uniqueMostFood(stats.foodCounts) || "__none__";
    return stats;
  }

  function preloadForRun() {
    if (!D.sprites || !D.sprites.preloadSpecies || !run) return;
    var start = isEggForm(run.form) && D.SPECIES[run.form] ? D.SPECIES[run.form].hatchTo : run.form;
    var urgent = [start, "pagumon", "gazimon", "demidevimon", "kuwagamon"];
    if (D.standardLine) urgent = urgent.concat(D.standardLine(start, 8));
    urgent.push("jijimon");
    D.sprites.preloadSpecies(urgent, true);
    if (D.nextForms) D.sprites.preloadSpecies((D.nextForms(start) || []).map(function (b) { return b.to; }), false);
    if (D.reachableFrom) D.sprites.preloadSpecies(D.reachableFrom(start, 2), false);
  }

  function preloadForm(id) {
    if (!id || !D.sprites || !D.sprites.preloadSpecies) return;
    D.sprites.preloadSpecies(id, true);
    if (D.nextForms) D.sprites.preloadSpecies((D.nextForms(id) || []).map(function (b) { return b.to; }), false);
  }

  function mulberry(seed) {
    var s = (seed || 1) >>> 0;
    return function () {
      s += 0x6D2B79F5;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pickEnemyPool(stageDisplay, role, count, rnd, used) {
    var src = (D.EVO_TREE && D.EVO_TREE.enemies && D.EVO_TREE.enemies[stageDisplay]) || [];
    var list = src.filter(function (e) {
      if (used[e.id]) return false;
      if (role && e.role !== role) return false;
      return !!D.ENEMIES[e.id];
    });
    var i, j, tmp, out = [];
    for (i = list.length - 1; i > 0; i--) {
      j = Math.floor(rnd() * (i + 1));
      tmp = list[i]; list[i] = list[j]; list[j] = tmp;
    }
    for (i = 0; i < list.length && out.length < count; i++) {
      used[list[i].id] = true;
      out.push(list[i].id);
    }
    return out;
  }

  function extraWaveRates(time) {
    var extras = {}, used = { pagumon: 1, gazimon: 1, demidevimon: 1, kuwagamon: 1 };
    var rnd = mulberry((run && run.worldSeed) || 1);
    var add = function (ids, rate) {
      var i;
      for (i = 0; i < ids.length; i++) extras[ids[i]] = rate;
    };
    if (time >= 90) add(pickEnemyPool("Child (Rookie)", "swarm", 2, rnd, used), 2.8);
    if (time >= 90) add(pickEnemyPool("Child (Rookie)", "fast", 1, rnd, used), 3.2);
    if (time >= 150) add(pickEnemyPool("Adult (Champion)", "bruiser", 2, rnd, used), 3.6);
    if (time >= 150) add(pickEnemyPool("Child (Rookie)", "fast", 1, rnd, used), 2.6);
    if (time >= 240) add(pickEnemyPool("Perfect (Ultimate)", "elite", 2, rnd, used), 4.4);
    if (time >= 240) add(pickEnemyPool("Adult (Champion)", "fast", 1, rnd, used), 3.2);
    if (time >= 360) add(pickEnemyPool("Perfect (Ultimate)", "elite", 2, rnd, used), 3.6);
    if (time >= 360) add(pickEnemyPool("Perfect (Ultimate)", "bruiser", 1, rnd, used), 4.8);
    return extras;
  }

  function currentWaveRates(wave) {
    var rates = {}, k, extra;
    for (k in wave.rates) if (Object.prototype.hasOwnProperty.call(wave.rates, k)) rates[k] = wave.rates[k];
    extra = extraWaveRates(run.time);
    for (k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) rates[k] = extra[k];
    return rates;
  }

  function bossTypeForTime() {
    if (run && D.stageBoss) return D.stageBoss(D.partnerStageIdx(run.form), run.worldSeed || 1, (run.bossCount = (run.bossCount || 0) + 1));
    if (!run || run.bossesBeaten <= 0) return D.BOSSES.type;
    var src = (D.EVO_TREE && D.EVO_TREE.enemies && D.EVO_TREE.enemies["Ultimate (Mega)"]) || [];
    var bosses = src.filter(function (e) { return e.role === "boss" && D.ENEMIES[e.id]; }).map(function (e) { return e.id; });
    if (!bosses.length) return D.BOSSES.type;
    var rnd = mulberry(((run.worldSeed || 1) + run.bossesBeaten * 9973) >>> 0);
    return bosses[Math.floor(rnd() * bosses.length)];
  }

  function nextEvoRules() {
    if (D.nextForms && run) return D.nextForms(run.form) || [];
    return (D.SPECIES[run.form] && D.SPECIES[run.form].evolutions) || [];
  }


  function evoStatus(rule) {
    var cond = rule.conditions || rule;
    var stats = statsForTree();
    var joy = stats.joy;
    var parts = [];
    function addMin(label, have, need, fmtHave, fmtNeed) {
      if (need == null) return;
      parts.push({ label: label, ok: have >= need, val: (fmtHave != null ? fmtHave : have) + "/" + (fmtNeed != null ? fmtNeed : need) });
    }
    function addMax(label, have, need, fmtHave) {
      if (need == null) return;
      parts.push({ label: label, ok: have <= need, val: (fmtHave != null ? fmtHave : have) + "≤" + need });
    }
    addMin("Lv", stats.level, cond.minLevel);
    addMax("Lv", stats.level, cond.maxLevel);
    addMin("Food", stats.meals, cond.minFood);
    addMax("Food", stats.meals, cond.maxFood);
    addMin("Joy", joy, cond.minHappiness, String(Math.round(joy)));
    addMax("Joy", joy, cond.maxHappiness, String(Math.round(joy)));
    if (cond.minHpRatio != null) {
      var hp = Math.round((stats.hpRatio || 0) * 100);
      parts.push({ label: "HP", ok: (stats.hpRatio || 0) >= cond.minHpRatio, val: hp + "%/" + Math.round(cond.minHpRatio * 100) + "%" });
    }
    addMin("Faints", stats.faints, cond.minFaints);
    addMin("Mistakes", stats.careMistakes, cond.minCareMistakes);
    addMin("Bosses", stats.bossesBeaten, cond.minBossesBeaten);
    if (cond.minDesperationTime != null) addMin("Desp", Math.round(stats.desperationTime || 0), cond.minDesperationTime);
    if (cond.mostFood) {
      var mf = stats.mostFood && stats.mostFood !== "__none__" ? stats.mostFood : "—";
      parts.push({ label: "Food type", ok: mf === cond.mostFood, val: mf + "/" + cond.mostFood });
    }
    if (cond.minKillsAttribute) {
      var attr;
      for (attr in cond.minKillsAttribute) {
        addMin(attr + " KOs", (stats.killsAttribute && stats.killsAttribute[attr]) || 0, cond.minKillsAttribute[attr]);
      }
    }
    if (cond.minKillsSpecies) {
      var sp;
      for (sp in cond.minKillsSpecies) {
        addMin((D.SPECIES[sp] ? D.SPECIES[sp].name : sp) + " KOs", (stats.killsSpecies && stats.killsSpecies[sp]) || 0, cond.minKillsSpecies[sp]);
      }
    }
    if (cond.requiresPartner) parts.push({ label: "Partner", ok: false, val: cond.requiresPartner });
    if (cond.item) parts.push({ label: "Item", ok: (stats.items || []).indexOf(cond.item) !== -1, val: cond.item });
    var ready = D.EVO_TREE && D.EVO_TREE.conditionsMet
      ? D.EVO_TREE.conditionsMet(cond, stats)
      : false;
    /* Fallback for old-shaped rules if the tree is missing. */
    if (!D.EVO_TREE && rule.kind === "neglect") {
      ready = run.level >= (rule.minLevel || 0) && run.foodEaten <= (rule.maxFood || 0) && run.happiness <= (rule.maxHappiness || 0);
    }
    return { ready: ready, parts: parts };
  }

  function standardOrRecover() {
    return null;
  }

  function neglectRule() {
    return null;
  }

  function applyForm(to, kind) {
    var prev = run.form;
    var sp = D.SPECIES[to];
    if (!sp) return { from: prev, to: to, kind: kind, fromName: prev, toName: to, weapon: null };
    var ratio = run.hp / run.maxHp;
    run.form = to;
    run.formSince = run.time || 0;
    run.formsReached[to] = true;
    rebuildStats();
    run.hp = clamp(run.maxHp * Math.max(ratio, 0.45) + 12, 1, run.maxHp);
    function grantWeapon(id, bump) {
      if (!id || !D.WEAPONS[id]) return;
      var i, found = false;
      for (i = 0; i < run.weapons.length; i++) {
        if (run.weapons[i].id === id) {
          if (bump) run.weapons[i].level += 1;
          found = true;
        }
      }
      if (!found) run.weapons.push({ id: id, level: 1, cd: 0.15 });
    }
    grantWeapon(sp.startWeapon, false);
    grantWeapon(sp.signatureWeapon, true);
    checkUnlocks();
    preloadForm(to);
    return { from: prev, to: to, kind: kind, fromName: (D.SPECIES[prev] && D.SPECIES[prev].name) || prev, toName: sp.name, weapon: sp.signatureWeapon || sp.startWeapon };
  }

  function beginEvolution(rule) {
    var fromId = (rule && rule.from) || (run && run.form);
    var info;
    if (D.evoLog && rule && rule.to) D.evoLog.record(fromId, rule.to);
    if (rule && rule.applied) {
      info = {
        from: fromId,
        to: rule.to,
        kind: rule.kind,
        fromName: (D.SPECIES[fromId] && D.SPECIES[fromId].name) || fromId,
        toName: (D.SPECIES[rule.to] && D.SPECIES[rule.to].name) || rule.to,
        weapon: null
      };
    } else {
      info = applyForm(rule.to, rule.kind);
    }
    if (!missionAuth && D.rarity && D.rarity.noteDiscovery && save) {
      if (D.rarity.noteDiscovery(save, fromId, rule.to, { kind: rule.kind, to: rule.to, from: fromId })) {
        writeSave();
      }
    }
    evoInfo = info;
    evoTimer = 2.15;
    el.evoFrom.textContent = info.fromName;
    el.evoTo.textContent = info.toName;
    el.evoNote.textContent = rule.kind === "neglect"
      ? "Poor care triggered a leftover evolution…"
      : (rule.kind === "recover"
        ? "Good care brought them back from the scrap pile!"
        : (rule.kind === "hatch"
        ? "The Digitama hatched!"
        : (rule.kind === "warp"
        ? "A warp evolution!"
        : (rule.kind === "dark"
        ? "A dark evolution took hold…"
        : (rule.kind === "special"
        ? "A branching path opened!"
        : (rule.kind === "armor"
        ? "Armor evolution!"
        : (rule.kind === "fusion"
        ? "Jogress evolution!"
        : (rule.kind === "mode"
        ? "Mode change!"
        : ((D.WEAPONS[info.weapon] ? "Learned " + D.WEAPONS[info.weapon].name + "!" : "A new stage awakened."))))))))));
    burst(run.mx, run.my, "#ffd200", reducedFx ? 16 : 48, 320);
    burst(run.mx, run.my, "#fff8f0", reducedFx ? 8 : 20, 220);
    if (!reducedFx) {
      addParticle(run.mx, run.my, 0, 0, "#ffe080", 0.55, 20, "ring", true, 0);
      addParticle(run.mx, run.my, 0, 0, "#ffb020", 0.85, 28, "ring", true, 0);
    }
    evoFlash = 1;
    if (el.evoPopFlash) el.evoPopFlash.style.opacity = "0";
    sfx("evo");
    if (D.skipEvoCinema) {
      evoTimer = 0;
      setState("playing");
      return;
    }
    setState("evolution");
  }

  function checkEvolution() {
    if (!run || state !== "playing") return;
    if (isEggForm(run.form)) return;
    if (run.evoLock > 0) return;
    var pick = D.pickEvolution ? D.pickEvolution(run.form, evoStats()) : null;
    if (pick && pick.to && pick.to !== run.form) beginEvolution(pick);
  }

  /* the end-of-run record for the boards: the sim's own when we host it, our snapshot's when we are a guest */
  function runRecord() {
    var sim = missionAuth && missionAuth.sim, p = sim && sim.player && sim.player(missionLocalId), rec, md = run.md || {}, landBy = {}, parts, i, f, bt = 0, k;
    if (p && sim._runRecord) return sim._runRecord(p);
    if (D.world && D.world.territoryString) { parts = D.world.territoryString().split(";"); for (i = 0; i < parts.length; i++) { f = parts[i].split(",")[2]; if (f) landBy[f] = (landBy[f] || 0) + 1; } }
    rec = { mode: "open", week: null, seed: run.worldSeed, time: Math.round(run.time || 0), level: Math.max(run.level || 1, md.pk || 0), kills: run.kills || 0,
      lords: md.lo || 0, bosses: run.bossesBeaten || 0, pvp: md.pw || 0, megaAt: md.mg ? Math.round(md.mg) : null, respawns: md.rs || 0, faction: null, landBy: landBy, form: run.form };
    for (k in (run.trust || {})) if (run.trust[k] > bt) { bt = run.trust[k]; rec.faction = k; }
    rec.score = D.modeScore ? D.modeScore(D, rec) : 0;
    return rec;
  }

  /* ---------- Run end ---------- */
  function endRun() {
    if (!run || run.ended) return;
    run.ended = true;
    sfx("dead");
    checkUnlocks();
    if (run.time > save.bestTime) save.bestTime = run.time;
    save.bestForm = run.form;
    var rankPay = D.profile ? D.profile.runEnded(run) : null;
    var memNote = leaveMemory();
    var dataGot = D.hatchery ? D.hatchery.bank(run.dataBy || {}, run.time) : null;
    if (!run.gear && D.items) run.gear = D.items.loadout();       /* a guest's run: what it had on */
    var itemEnd = D.items ? D.items.endRun(run) : null;
    writeSave();
    var lines = [
      ["Time", formatTime(run.time)],
      ["Form", D.SPECIES[run.form].name + " · " + D.SPECIES[run.form].stage],
      ["Level", String(run.level)],
      ["KOs", String(run.kills)],
      ["Meals eaten", String(run.foodEaten)],
      ["Peak joy", String(Math.round(run.peakHappiness))],
      ["Weapons", String(run.weapons.length)]
    ];
    if (run.rival) {
      save.hub = save.hub || {};
      save.hub.rivalWins = (save.hub.rivalWins || 0) + (run.rival.wins || 0);
      save.hub.rivalLosses = (save.hub.rivalLosses || 0) + (run.rival.losses || 0);
      save.hub.lastRival = { name: run.rival.name, form: run.rival.form, level: run.rival.level, wins: run.rival.wins || 0, beat: !!run.rivalBeatYou, time: Math.floor(run.time) };
      writeSave();
    }
    /* the boards (js/boards.js, boards-server.js): the run's record and score */
    var rec = runRecord(), md = modeDef(rec.mode);
    lines.unshift(["Mode", (md && md.name) || "Open World"]);
    lines.push(["Score", String(rec.score)]);
    if (rec.respawns) lines.push(["Respawns", String(rec.respawns)]);
    if (rec.megaAt) lines.push(["Mega at", formatTime(rec.megaAt)]);
    var gb = document.getElementById("go-board");
    if (!gb && el.goSummary && el.goSummary.parentNode) { gb = document.createElement("p"); gb.id = "go-board"; gb.className = "go-board"; el.goSummary.parentNode.insertBefore(gb, el.goSummary.nextSibling); }
    if (gb) { gb.hidden = true; gb.textContent = ""; }
    if (D.boards && D.boards.signedIn() && rec.time >= 60) {
      if (gb) { gb.hidden = false; gb.textContent = "Sending the run to the League…"; }
      D.boards.submit(rec).then(function (j) { if (gb) { gb.textContent = j && j.ok ? D.boards.placedText(j) : "The League could not take this run" + (j && j.reason ? ": " + j.reason : "") + "."; } });
    }
    if (run.rival) lines.push(["Rival", run.rival.name + "'s " + spName(run.rival.form) + " (job level " + run.rival.level + "): you " + run.rival.wins + ", " + run.rival.name + " " + run.rival.losses]);
    el.goTitle.textContent = (run.hp <= 0 || run.downed) ? "RUN OVER" : "RUN ENDED";
    el.goSub.textContent = run.rivalBeatYou ? D.SPECIES[run.form].name + " was beaten by " + run.rivalBeatYou.name + "'s " + spName(run.rivalBeatYou.form) + " after " + formatTime(run.time) + "."
      : D.SPECIES[run.form].name + " lasted " + formatTime(run.time) + " in the Digital Field.";
    el.goSummary.innerHTML = lines.map(function (r) {
      return "<div><span class='k'></span><span class='v'></span></div>";
    }).join("");
    var nodes = el.goSummary.querySelectorAll("div");
    var i;
    for (i = 0; i < nodes.length; i++) {
      nodes[i].querySelector(".k").textContent = lines[i][0];
      nodes[i].querySelector(".v").textContent = lines[i][1];
    }
    if (run.unlocksThisRun && run.unlocksThisRun.length) {
      el.goUnlock.hidden = false;
      el.goUnlock.textContent = "Unlocked " + run.unlocksThisRun.map(function (u) { return D.SPECIES[u.id].name; }).join(", ") + "!";
    } else {
      el.goUnlock.hidden = true;
    }
    showRankPay(rankPay);
    var ct = document.getElementById("capture-toast");
    if (ct) { ct.className = ""; noticeToastTimer = 0; }   /* no in-run notice left hanging over the run-over screen */
    var gl = document.getElementById("go-loot"), li, lh = "";
    if (gl) {
      if (itemEnd) for (li = 0; li < itemEnd.loot.length; li++) lh += "<span class='is-" + itemEnd.loot[li].rarity + "'>" + rankEsc(itemEnd.loot[li].name) + (itemEnd.loot[li].dupe ? " (+" + itemEnd.loot[li].dupe + " DigiBits)" : "") + "</span>";
      gl.hidden = !(lh || (itemEnd && (itemEnd.spent || itemEnd.kept)));
      gl.innerHTML = (lh ? "<b>Found this run</b>" + lh : "") + (itemEnd && itemEnd.spent ? "<small>Used up: " + rankEsc(itemEnd.spent) + ".</small>" : "") + (itemEnd && itemEnd.kept ? "<small>The scroll did not fit this partner's line, so you keep it.</small>" : "");
    }
    var gd = document.getElementById("go-data"), gk, gl = [];
    if (gd) {
      for (gk in (dataGot || {})) gl.push("+" + dataGot[gk] + " " + D.hatchery.typeName(gk));
      gd.hidden = !gl.length;
      gd.textContent = gl.length ? "Data for the Hatchery: " + gl.join(", ") + "." : "";
    }
    var gm = document.getElementById("go-memory");
    if (gm) { gm.hidden = !memNote; gm.textContent = memNote || ""; }
    setState("gameover");
  }

  /* The Tamer Rank block on the run-over screen: what the run paid, the bar
   * filling from where it was, and anything a new rank opened. */
  /* ---------- DigiBank memories (data.js MEMORY) ---------- */
  function memoryOf(line) { return (save.memories && line && save.memories[line]) || null; }
  function memoryTier(line) { var m = memoryOf(line); return m ? (m.tier || 0) : 0; }
  function lineName(line) { var L = D.EGGS || [], i; for (i = 0; i < L.length; i++) if (L[i].id === line) return L[i].name; return line; }
  function memoryText(line) {
    var m = memoryOf(line);
    return m ? "Memory of " + spName(m.form) + ": hatches with " + m.tier + " skill point" + (m.tier > 1 ? "s" : "") + "." : "";
  }
  /* the run is over: does this partner leave a better memory than the line had? */
  function leaveMemory() {
    var M = D.MEMORY, sp = run && D.SPECIES[run.form], line = run && run.starter, st, tier, old, rec;
    if (!M || !sp || !line) return "";
    st = sp.stageKey || sp.stage; tier = M.tier[st] || (/Mega/.test(st || "") ? M.tier.Mega : 0);
    if (!tier) return "";
    old = memoryOf(line);
    if (old && (old.tier > tier || (old.tier === tier && (old.time || 0) >= run.time))) return "";
    rec = { form: run.form, stage: st, tier: tier, time: Math.floor(run.time), at: Date.now(), shiny: !!run.shiny };
    save.memories = save.memories || {}; save.memories[line] = rec;
    writeSave();
    return (old && old.tier === tier ? spName(run.form) + "'s memory replaces the one in the DigiBank. " : spName(run.form) + " left a memory in the DigiBank. ") +
      "Your next " + lineName(line) + " hatches with " + tier + " skill point" + (tier > 1 ? "s" : "") + " to spend.";
  }
  function renderMemories() {
    var box = document.getElementById("bank-memories"), lines = Object.keys(save.memories || {}), h = "", i, m, cvs;
    if (!box) return;
    lines.sort(function (a, b) { return (save.memories[b].tier - save.memories[a].tier) || ((save.memories[b].time || 0) - (save.memories[a].time || 0)); });
    h = "<h3 class='mem-head'>Memories <small>" + lines.length + "</small></h3>";
    if (!lines.length) h += "<p class='mem-none'>None yet. Raise a partner to Champion or beyond; when its run ends it leaves a memory here, and the next egg of its line hatches with a head start.</p>";
    else {
      h += "<div class='mem-grid'>";
      for (i = 0; i < lines.length; i++) {
        m = save.memories[lines[i]];
        h += "<div class='mem-card is-t" + m.tier + "'><canvas width='72' height='72' data-form='" + rankEsc(m.form) + "'></canvas><div><b>" + rankEsc(spName(m.form)) + "</b><span>" + rankEsc(m.stage || "") + " \u00b7 lasted " + formatTime(m.time || 0) + "</span>" +
          "<small>" + rankEsc(lineName(lines[i])) + " hatches with +" + m.tier + " skill point" + (m.tier > 1 ? "s" : "") + "</small></div></div>";
      }
      h += "</div>";
    }
    box.innerHTML = h;
    cvs = box.querySelectorAll("canvas");
    for (i = 0; i < cvs.length; i++) {
      var c2 = cvs[i].getContext("2d"); c2.imageSmoothingEnabled = false; c2.clearRect(0, 0, 72, 72);
      try { D.sprites.drawPartner(c2, cvs[i].getAttribute("data-form"), 36, 66, 1, 0.5, 0); } catch (e) {}
    }
  }

  /* ---------- items (js/items.js): the stash lives in the save; notices and the screen-side crests ---------- */
  D.stash = { get: function () { return (save.items = save.items || {}); }, write: function () { writeSave(); } };
  D.itemToast = function (text, rarity, x, y, floatText) {
    var elT = $("capture-toast");
    if (elT) { elT.textContent = text; elT.className = "is-on is-item is-" + (rarity || "common"); noticeToastTimer = 6; }
    if (x != null && floatText && state === "playing") { addFloat(x, y - 40, floatText, rarity === "prismatic" ? "#e2c8ff" : rarity === "rare" ? "#7cf0ff" : "#ffe27a"); burst(x, y, rarity === "prismatic" ? "#c79bff" : "#ffe27a", 26, 260); }
  };
  /* Weather Eye: say what is coming once, a minute ahead */
  var forecastSaid = null;
  function forecastTick() {
    var w = run && run.weather, id, rec;
    if (!w || !w.next || !D.items || !D.items.fxOn("weather")) { if (!w || !w.next) forecastSaid = null; return; }
    id = D.weather && D.weather.canonicalId ? D.weather.canonicalId(w.next) : w.next;
    if (forecastSaid === id + "|" + Math.round(w.duration) || id === (D.weather.canonicalId ? D.weather.canonicalId(w.id) : w.id)) return;
    forecastSaid = id + "|" + Math.round(w.duration);
    if (id === "clear") return;
    rec = D.WEATHER && D.WEATHER.catalog && D.WEATHER.catalog[id];
    D.itemToast("Weather Eye: " + ((rec && (rec.label || rec.name)) || id) + " in about " + Math.max(5, Math.round((w.duration - w.t) / 5) * 5) + " seconds.", "common");
  }

  /* ---------- rival trophies (data.js TROPHY) ---------- */
  function bankTrophy(e) {
    var T = D.TROPHY || { max: 40 }, list, rec, i, worst;
    if (!run || !e || !e.name) return;
    save.trophies = list = save.trophies || [];
    rec = run._trophy;
    if (rec && list.indexOf(rec) >= 0) { rec.form = e.form; rec.level = Math.max(rec.level || 0, e.level || 0); rec.times = (rec.times || 1) + 1; rec.time = Math.floor(run.time); }
    else {
      rec = run._trophy = { name: e.name, form: e.form, level: e.level || 1, times: 1, time: Math.floor(run.time), at: Date.now(), mine: run.form };
      list.push(rec);
      while (list.length > T.max) {          /* full shelf: the weakest, oldest one makes room */
        worst = 0;
        for (i = 1; i < list.length; i++) if (list[i] !== rec && (list[worst] === rec || list[i].level < list[worst].level || (list[i].level === list[worst].level && list[i].at < list[worst].at))) worst = i;
        list.splice(worst, 1);
      }
    }
    writeSave();
  }
  function trophyList() {
    return (save.trophies || []).slice().sort(function (a, b) { return (b.level - a.level) || (b.at - a.at); });
  }

  var rankAnim = 0;
  function rankEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return "&#" + c.charCodeAt(0) + ";"; }); }
  function showRankPay(pay) {
    var box = document.getElementById("go-rank"), R = D.profile && D.profile.rank, i, h, steps, at, bar, lab, token = ++rankAnim;
    if (!box) return;
    if (!pay || !R) { box.hidden = true; return; }
    box.hidden = false;
    h = "<div class='go-rank-head'><span class='go-rank-badge' id='go-rank-badge'>RANK " + pay.before.rank + "</span><span class='go-rank-gain'>+" + pay.total + " rank XP" + (pay.bits ? "  \u00b7  +" + pay.bits + " DigiBits" : "") + "</span></div>" +
      "<div class='go-rank-bar'><i id='go-rank-fill'></i></div><div class='go-rank-num' id='go-rank-num'></div><div class='go-rank-parts'>";
    for (i = 0; i < pay.parts.length; i++) h += "<span>" + rankEsc(pay.parts[i][0]) + " <b>+" + pay.parts[i][1] + "</b></span>";
    h += "</div><div class='go-rank-ups' id='go-rank-ups'></div>";
    box.innerHTML = h;
    bar = document.getElementById("go-rank-fill"); lab = document.getElementById("go-rank-num");
    function paint(xp) {
      var s = R.at(xp);
      bar.style.width = (s.max ? 100 : Math.round(100 * s.into / s.need)) + "%";
      lab.textContent = s.max ? "Top rank" : s.into + " / " + s.need + " to rank " + (s.rank + 1);
      document.getElementById("go-rank-badge").textContent = "RANK " + s.rank;
      return s.rank;
    }
    var shown = paint(pay.before.xp), t0 = 0, from = pay.before.xp, to = pay.after.xp, upsBox = document.getElementById("go-rank-ups"), upI = 0;
    function frame(ts) {
      if (token !== rankAnim || !bar.isConnected) return;
      if (!t0) t0 = ts + 450;
      var k = Math.max(0, Math.min(1, (ts - t0) / (900 + 500 * pay.ups.length))), e = 1 - Math.pow(1 - k, 3), r = paint(Math.round(from + (to - from) * e)), u, d;
      while (r > shown) {
        shown++;
        u = pay.ups[upI++];
        if (u) {
          d = document.createElement("div"); d.className = "go-rank-up";
          d.innerHTML = "<b>Rank " + u.rank + "!</b> +" + u.bits + " DigiBits" + (u.title ? " · new title: <b>" + rankEsc(u.title) + "</b>" : "");
          upsBox.appendChild(d);
          if (D.audio) D.audio.sfx("base");
          box.classList.remove("is-pop"); void box.offsetWidth; box.classList.add("is-pop");
        }
      }
      if (k < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- Update / draw ---------- */
  function updatePlaying(dt) {
    var inp = D.input.poll();
    if (levelWin.t > 0 && inp) { inp.x = 0; inp.y = 0; }   /* choosing a skill: the pair is locked in place (mission-sim.js p.choosing) */
    if (missionAuth) {
      updatePlayingAuth(dt, inp);
      return;
    }
    var held = !!(inp.interactHeld || inp.interact);
    if (run.downed) {
      run.tamerInvuln = Math.max(0, run.tamerInvuln - dt);
      tickRevive(dt, held);
      if (D.weather) D.weather.tick(run, dt, { data: D, phase: "playing", combatReady: partyCombatReady() });
      updateMon(dt);
      updateCare(dt);
      if (!run || run.ended) return;
      updateHudRevive(held);
      return;
    }
    var speed = D.TAMER.speed * run.stats.speedMul;
    var tpos = slideMove(run.x, run.y, inp.x * speed * dt, inp.y * speed * dt, D.TAMER.radius);
    run.x = tpos.x;
    run.y = tpos.y;
    if (inp.x > 0.15) run.facing = 1;
    else if (inp.x < -0.15) run.facing = -1;
    run.moving = Math.abs(inp.x) + Math.abs(inp.y) > 0.15;
    if (run.moving) {
      if (Math.abs(inp.y) > Math.abs(inp.x) + 0.05) run.tdir = inp.y > 0 ? "down" : "up";
      else run.tdir = "side";
    }
    run.tamerInvuln = Math.max(0, run.tamerInvuln - dt);
    syncAim();
    var clickedLocal = consumeEnemyClick();
    if (clickedLocal) run.monFocus = clickedLocal;
    run.time += dt;
    if (D.weather) D.weather.tick(run, dt, { data: D, phase: "playing", combatReady: partyCombatReady() });
    tickRevive(dt, held);
    if (run.chipThrow) {
      run.chipThrow.t -= dt;
      if (run.chipThrow.t <= 0) run.chipThrow = null;
    }
    updateMon(dt);
    updateCare(dt);
    if (!run || run.ended) return;
    updateSpawns(dt);
    spawnWorldFood(dt);
    updateWeapons(dt);
    updateAlly(dt);
    updateCpuMates(dt);
    updateBullets(dt);
    updateEnemies(dt);
    updateOrbs(dt);
    updateMerchant(dt);
    tickNoticeToast(dt);
    if (run.atkBoost > 0) {
      run.atkBoost = Math.max(0, run.atkBoost - dt);
      if (run.atkBoost === 0) addFloat(run.mx, run.my - 28, "Power faded", "#c0c8d4");
    }
    if (run.captureFx) {
      run.captureFx.t -= dt;
      if (run.captureFx.t <= 0) run.captureFx = null;
    }
    checkUnlocks();
    if (isEggForm(run.form)) {
      run.hatchLeft = Math.max(0, (run.hatchLeft == null ? ((D.HATCH && D.HATCH.time) || 8) : run.hatchLeft) - dt);
      if (run.hatchLeft <= 0) { doHatch(); return; }
    } else {
      checkEvolution();
    }
    if (state === "playing") tickFarmSchedule();
  }

  function doHatch() {
    if (!run || !isEggForm(run.form)) return;
    var to = D.SPECIES[run.form] && D.SPECIES[run.form].hatchTo;
    if (!to || !D.SPECIES[to]) return;
    run.hatchLeft = 0;
    beginEvolution({ to: to, kind: "hatch" });
  }

  function forceLineStage(slot) {
    if (missionAuth && !missionAuth.allowDebugIntents) return false;
    if (!run) return false;
    var line = run.line || lineIdOf(run.form);
    var stages = lineStages(line);
    var to = stages && stages[slot];
    if (!to || !D.SPECIES[to]) return false;
    if (to === run.form) return true;
    applyForm(to, slot === "baby" ? "hatch" : "standard");
    run.hatchLeft = 0;
    burst(run.mx, run.my, "#ffd200", reducedFx ? 10 : 28, 260);
    addFloat(run.mx, run.my - 32, D.SPECIES[to].name + "!", "#ffe080");
    sfx("evo");
    return true;
  }

  function updateFx(dt) {
    var i, p, f;
    if (run && run.focusMarkT > 0) run.focusMarkT = Math.max(0, run.focusMarkT - dt * 2);
    shake = Math.max(0, shake - dt * 18);
    frameStep = dt; stepTick = (stepTick + 1) % 30000;
    if (state === "playing") { riverHint(dt); tickFarmGo(dt); } else if (farmGo) farmGo = null;
    if (D.attackFx) D.attackFx.update(dt);
    if (evoFlash > 0) evoFlash = Math.max(0, evoFlash - dt * 1.6);
    for (i = particles.length - 1; i >= 0; i--) {
      p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.grav) p.vy += 40 * p.grav * dt;
      if (p.type === "ring") p.size += 90 * dt;
      if (p.type === "ripple") p.size += 16 * dt;
      if (p.type === "glow") p.size *= 1 + dt * 1.8;
      if (p.life <= 0) {
        partPool.push(particles.splice(i, 1)[0]);
      }
    }
    for (i = floats.length - 1; i >= 0; i--) {
      f = floats[i];
      f.life -= dt;
      f.pop += dt;
      f.y -= 36 * dt;
      if (f.life <= 0) floats.splice(i, 1);
    }
    camX += (run.x - camX) * Math.min(1, 7 * dt);
    camY += (run.y - camY) * Math.min(1, 7 * dt);
  }

  /* ---- level-up celebrations (Nov 17) ----
   * Job level: three little rockets go up over the partner and burst, with a
   * bright jingle. Base level: a pillar of light and rings round the
   * hologram, an emote bubble with a gold arrow over its head, and a short
   * fanfare. While status points sit unspent a small gold arrow keeps
   * bobbing over the hologram. */
  var LEVEL_FX = { windowDelay: 0.08, clickGuard: 0.3, emoteTime: 2.8 };   /* the skill window opens almost at once (it waited 0.9 s); the fireworks play behind it */
  var levelFx = [], levelWinQueue = null;
  var FW_COLS = ["#ff7ad0", "#6ae0ff", "#ffe14a", "#8cff9a", "#c9a0ff", "#ff9a5a"];
  function monHeadY(form, footY) {
    var h = (form && D.sprites.ensureHeight && D.sprites.ensureHeight(form)) || 40;
    return footY + 5 - clamp(h, 26, 84) - 6;
  }
  function levelFxJob(x, headY, quiet) {
    var i, c0 = (Math.random() * FW_COLS.length) | 0;
    for (i = 0; i < 3; i++) {
      levelFx.push({ k: "rocket", t: -i * 0.2, x: x + (i - 1) * 24 + rand(-5, 5), y0: headY, y: headY, top: headY - 20 - rand(0, 16) - (i === 1 ? 14 : 0), col: FW_COLS[(c0 + i * 2) % FW_COLS.length], quiet: !!quiet });
    }
    if (!quiet && D.audio) D.audio.sfx("job");
  }
  function levelFxBase(gain) {
    levelFx.push({ k: "emote", t: 0, gain: gain || 0 });
    levelFx.push({ k: "pillar", t: 0 });
    var i, a;
    for (i = 0; i < 18; i++) {
      a = (i / 18) * Math.PI * 2;
      addParticle(run.x + Math.cos(a) * 16, run.y - 4 + Math.sin(a) * 7, Math.cos(a) * 26, -rand(50, 120), i % 2 ? "#ffe27a" : "#c9a0ff", rand(0.6, 1.1), 3, "pixel", true, -0.2);
    }
    addParticle(run.x, run.y - 6, 0, 0, "#ffe27a", 0.6, 10, "ring", true, 0);
    addParticle(run.x, run.y - 6, 0, 0, "#c9a0ff", 0.8, 4, "ring", true, 0);
    if (D.audio) D.audio.sfx("base");
  }
  function tickLevelFx(dt) {
    var i, f, k, a, sp;
    if (levelWinQueue) {
      levelWinQueue.t -= dt;
      if (levelWinQueue.t <= 0) {
        f = levelWinQueue; levelWinQueue = null;
        if (run && !run.ended && (state === "playing" || state === "farm")) levelWindow(f.pause, f.hold);
        else if (missionAuth && run && !run.ended) { missionAuth.act({ type: "breather.end", id: missionLocalId }); showNoticeToast("Job level " + f.level + "!  +1 skill point. Press K to spend it."); }
      }
    }
    if (!run) { levelFx.length = 0; return; }
    for (i = levelFx.length - 1; i >= 0; i--) {
      f = levelFx[i];
      f.t += dt;
      if (f.k === "rocket") {
        if (f.t < 0) continue;
        if (f.t < 0.26) {
          k = f.t / 0.26; f.y = f.y0 + (f.top - f.y0) * (1 - (1 - k) * (1 - k));
          addParticle(f.x + rand(-1, 1), f.y + 3, rand(-6, 6), rand(20, 50), "#fff2b0", 0.22, 2, "pixel", true, 0.2);
        } else {
          /* pop: a ring of sparks that hang and fall, a white heart, a quick ring */
          for (k = 0; k < 18; k++) {
            a = (k / 18) * Math.PI * 2 + 0.2; sp = k % 2 ? rand(96, 120) : rand(58, 74);
            addParticle(f.x, f.top, Math.cos(a) * sp, Math.sin(a) * sp - 16, k % 4 === 3 ? "#ffffff" : f.col, rand(0.7, 1.05), k % 2 ? 5 : 4, "pixel", true, 1.7);
          }
          for (k = 0; k < 6; k++) { a = rand(0, Math.PI * 2); addParticle(f.x, f.top, Math.cos(a) * 30, Math.sin(a) * 30, "#ffffff", 0.45, 3, "pixel", true, 0.8); }
          addParticle(f.x, f.top, 0, 0, f.col, 0.32, 4, "ring", true, 0);
          addParticle(f.x, f.top, 0, 0, "#ffffff", 0.16, 7, "glow", true, 0);
          if (!f.quiet && D.audio) D.audio.sfx("pop");
          levelFx.splice(i, 1);
        }
      } else if (f.k === "emote") {
        if (f.t > LEVEL_FX.emoteTime) levelFx.splice(i, 1);
      } else if (f.k === "pillar") {
        if (f.t > 0.7) levelFx.splice(i, 1);
      }
    }
  }
  function goldArrow(x, y, s) {
    /* a chunky up arrow, outlined */
    function part(col, o) {
      ctx.fillStyle = col;
      ctx.fillRect(x - s * 0.5 - o, y - s * 2 - o, s + o * 2, s + o * 2);
      ctx.fillRect(x - s * 1.5 - o, y - s - o, s * 3 + o * 2, s + o * 2);
      ctx.fillRect(x - s * 2.5 - o, y - o, s * 5 + o * 2, s + o * 2);
      ctx.fillRect(x - s - o, y + s - o, s * 2 + o * 2, s * 2 + o * 2);
    }
    part("#3a2408", 1); part("#ffd23a", 0);
    ctx.fillStyle = "#fff6c0"; ctx.fillRect(x - s * 0.5, y - s * 2, s, s); ctx.fillRect(x - s, y + s, Math.max(1, s * 0.5), s * 2);
  }
  function drawLevelFx() {
    if (!run) return;
    var i, f, k, a, y, bob, w, h, hasEmote = false;
    for (i = 0; i < levelFx.length; i++) {
      f = levelFx[i];
      if (f.k === "pillar") {
        k = f.t / 0.7; a = (1 - k) * 0.5;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = a; ctx.fillStyle = "#c9a0ff";
        ctx.fillRect(run.x - 15 + k * 6, run.y - 150, 30 - k * 12, 150);
        ctx.globalAlpha = a * 0.9; ctx.fillStyle = "#ffffff";
        ctx.fillRect(run.x - 5 + k * 3, run.y - 150, 10 - k * 6, 150);
        ctx.restore();
      } else if (f.k === "emote") {
        hasEmote = true;
        /* pops in with a bounce, bobs, fades at the end */
        k = Math.min(1, f.t / 0.18); k = k < 1 ? k * (1.9 - 0.9 * k) : 1;
        a = clamp((LEVEL_FX.emoteTime - f.t) / 0.4, 0, 1);
        bob = Math.sin(f.t * 7) * 2;
        w = 30 * k; h = 26 * k; y = run.y - 66 + bob - h;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = "#1a1230"; ctx.fillRect(Math.round(run.x - w / 2 - 2), Math.round(y - 2), Math.round(w + 4), Math.round(h + 4));
        ctx.fillRect(Math.round(run.x - 4), Math.round(y + h + 1), 8, 3); ctx.fillRect(Math.round(run.x - 2), Math.round(y + h + 4), 4, 2);
        ctx.fillStyle = "#f4ecff"; ctx.fillRect(Math.round(run.x - w / 2), Math.round(y), Math.round(w), Math.round(h));
        ctx.fillRect(Math.round(run.x - 2), Math.round(y + h), 4, 3);
        ctx.fillStyle = "#d9c4ff"; ctx.fillRect(Math.round(run.x - w / 2), Math.round(y + h - 3), Math.round(w), 3);
        if (k >= 1) goldArrow(Math.round(run.x), Math.round(y + 11 - Math.abs(Math.sin(f.t * 7)) * 2), 3);
        ctx.restore();
      }
    }
    /* Points you have not looked at yet: a small gold arrow keeps bobbing over the hologram. It goes
     * once the status window has been opened, and comes back when the next points arrive. */
    statArrowOn = statsUnseen() && state !== "evolution" && !isEggForm(run.form);
    if (!hasEmote && statArrowOn) {
      ctx.save();
      ctx.globalAlpha = 0.75 + Math.sin(titleTime * 5) * 0.25;
      goldArrow(Math.round(run.x), Math.round(run.y - 70 + Math.sin(titleTime * 4) * 3), 2);
      ctx.restore();
    }
  }

  /* ---- lightning (the host's storm decides where; this is how it looks) ---- */
  var bolts = [], boltWarns = [], skyFlash = 0;
  function boltPath(x0, y0, x1, y1, n, jit) {
    var pts = [[x0, y0]], i, k;
    for (i = 1; i < n; i++) { k = i / n; pts.push([x0 + (x1 - x0) * k + rand(-jit, jit), y0 + (y1 - y0) * k + rand(-jit * 0.3, jit * 0.3)]); }
    pts.push([x1, y1]);
    return pts;
  }
  function strikeFx(x, y, r) {
    var top = y - 720, sx = x + rand(-140, 140), main = boltPath(sx, top, x, y, 13, 26), b = { life: 0.34, max: 0.34, x: x, y: y, r: r, paths: [main] }, i, j, a;
    for (i = 0; i < 2; i++) { j = 4 + ((Math.random() * 6) | 0); b.paths.push(boltPath(main[j][0], main[j][1], main[j][0] + rand(-150, 150), main[j][1] + rand(90, 200), 5, 16)); }
    bolts.push(b);
    skyFlash = 0.7;
    shake = Math.max(shake, 9);
    for (i = 0; i < 22; i++) { a = rand(0, Math.PI * 2); addParticle(x, y - 4, Math.cos(a) * rand(80, 280), Math.sin(a) * rand(50, 180) - 60, i % 3 ? "#eaf4ff" : "#ffe680", rand(0.25, 0.6), rand(2, 4), "pixel", true, 1.4); }
    addParticle(x, y, 0, 0, "#eaf4ff", 0.35, 8, "ring", true, 0);
    if (D.audio) { var d = Math.sqrt(dist2(x, y, run.x, run.y)); D.audio.sfx("thunder", d < 260 ? 1 : (d < 520 ? 0.75 : 0.5)); }
  }
  function tickBolts(dt) {
    var i;
    for (i = bolts.length - 1; i >= 0; i--) { bolts[i].life -= dt; if (bolts[i].life <= 0) bolts.splice(i, 1); }
    for (i = boltWarns.length - 1; i >= 0; i--) { boltWarns[i].t -= dt; if (boltWarns[i].t <= -0.1) boltWarns.splice(i, 1); }
    if (skyFlash > 0) skyFlash = Math.max(0, skyFlash - dt * 2.6);
  }
  function drawBoltWarns() {
    var i, w, k, n, a, t = titleTime, j, x0, y0;
    for (i = 0; i < boltWarns.length; i++) {
      w = boltWarns[i]; k = 1 - clamp(w.t / w.max, 0, 1);
      ctx.save();
      /* the air crackles where it is about to land: a ring closing in, sparks jumping */
      ctx.globalAlpha = 0.25 + k * 0.5; ctx.strokeStyle = "#cfe6ff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(w.x, w.y, 70 - k * 34, (70 - k * 34) * 0.72, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.12 + k * 0.16; ctx.fillStyle = "#dfeeff";
      ctx.beginPath(); ctx.ellipse(w.x, w.y, 30, 22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.9; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5;
      n = 3;
      for (j = 0; j < n; j++) {
        if (ph(Math.floor(t * 18) + j * 7, i + 3) > 0.45 + k * 0.3) continue;
        a = ph(Math.floor(t * 18), j + i * 5) * Math.PI * 2; x0 = w.x + Math.cos(a) * 26; y0 = w.y + Math.sin(a) * 18;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + 5, y0 - 9); ctx.lineTo(x0 - 3, y0 - 13); ctx.lineTo(x0 + 4, y0 - 24); ctx.stroke();
      }
      ctx.restore();
    }
  }
  function drawBolts() {
    var i, b, a, j, p, k;
    for (i = 0; i < bolts.length; i++) {
      b = bolts[i]; a = clamp(b.life / b.max, 0, 1);
      if (b.life < b.max - 0.07 && Math.sin(b.life * 90) < -0.2) a *= 0.35;      /* it flickers as it dies */
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (j = 0; j < b.paths.length; j++) {
        p = b.paths[j];
        ctx.globalAlpha = a * (j ? 0.35 : 0.5); ctx.strokeStyle = "#6aa8ff"; ctx.lineWidth = j ? 5 : 10;
        ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (k = 1; k < p.length; k++) ctx.lineTo(p[k][0], p[k][1]); ctx.stroke();
        ctx.globalAlpha = a * (j ? 0.7 : 1); ctx.strokeStyle = "#ffffff"; ctx.lineWidth = j ? 2 : 4;
        ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (k = 1; k < p.length; k++) ctx.lineTo(p[k][0], p[k][1]); ctx.stroke();
      }
      ctx.globalAlpha = a * 0.7; ctx.fillStyle = "#eaf4ff";
      ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * (1.2 - a * 0.5), b.r * 0.8 * (1.2 - a * 0.5), 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  /* ---------- The living map (Nov 20, world.js) ---------- */
  var livingFx = { landed: {}, iceT: -9, warnT: -99, warned: false };
  function polyBox(polys) { return D.net.mission.MissionSim.polyBox(polys); }
  /* what the host's world did, done to ours too (the host's own world already has it: these are no-ops there) */
  function livingEvent(e) {
    var W = D.world, MS = D.net && D.net.mission && D.net.mission.MissionSim, b;
    if (!W) return false;
    if (e.k === "icewater") {
      if (W.freezeArea) W.freezeArea(e.x, e.y, e.r, e.until);
      if (run.time - livingFx.iceT > 0.25) { livingFx.iceT = run.time; burst(e.x, e.y, "#e4f6ff", 7, 90); burst(e.x, e.y, "#ffffff", 3, 50); }
      return true;
    }
    if (e.k === "icepoly") {
      if (W.freezeTest && MS && e.polys) { b = polyBox(e.polys); W.freezeTest(function (px, py) { return MS.inPolys(e.polys, px, py, 1.05); }, b[0], b[1], b[2], b[3], e.until); }
      return true;
    }
    if (e.k === "fell") { if (W.fellArea) W.fellArea(e.x, e.y, e.r, e.at); return true; }
    if (e.k === "fellp") {
      if (W.fellTest && MS && e.polys) { b = polyBox(e.polys); W.fellTest(function (px, py) { return MS.inPolys(e.polys, px, py, 1); }, b[0], b[1], b[2], b[3], e.x, e.y, e.at); }
      return true;
    }
    if (e.k === "allylv") {
      addFloat(e.x, e.y, "Lv " + e.alv + "!", "#ffe27a"); burst(e.x, e.y + 8, "#ffe27a", 8, 120);
      return true;
    }
    if (e.k === "allyevo") {
      burst(e.x, e.y, "#ffffff", 20, 220); burst(e.x, e.y, "#ffd200", 16, 180);
      addFloat(e.x, e.y - 40, spName(e.to) + "!", "#ffe080");
      if (run && e.owner != null && e.owner === run.myId) { showNoticeToast("Your ally " + spName(e.from) + " digivolved into " + spName(e.to) + "!"); noticeToastTimer = 3.5; sfx("evo"); }
      return true;
    }
    if (e.k === "rally") { addFloat(e.x, e.y, "Joins you!", warColor(e.fac)); burst(e.x, e.y + 10, warColor(e.fac), 8, 120); return true; }
    if (e.k === "nesthatch") {
      /* a new one comes out of the nest: shell bits and a puff */
      burst(e.x, e.y - 4, "#f4ecd8", 10, 110); burst(e.x, e.y - 2, "#c8b890", 6, 70);
      return true;
    }
    if (e.k === "pudzap") {
      burst(e.x, e.y, "#ffe14a", 16, 200); burst(e.x, e.y, "#bfe8ff", 10, 140);
      addFloat(e.x, e.y - 12, "Shocked through!", "#ffe14a");
      return true;
    }
    return false;
  }
  /* A tree knocked flat: it topples away from the blast (speeding up as it goes, with a thump of dust),
   * lies there a couple of minutes, leaves a stump, then grows back. */
  function drawFallen(pr, kind, f) {
    var base = kind.replace(/_used$/, ""), k, a, sc;
    if (f.state === 2) { D.sprites.drawProp(ctx, "stump", pr.x, pr.y); return; }
    if (f.state === 3) {
      sc = 0.3 + 0.7 * clamp(f.grow, 0, 1);
      ctx.save(); ctx.translate(pr.x, pr.y); ctx.scale(sc, sc); ctx.translate(-pr.x, -pr.y);
      D.sprites.drawProp(ctx, base, pr.x, pr.y);
      ctx.restore();
      return;
    }
    k = clamp(f.age / 0.7, 0, 1);
    a = f.dir * (Math.PI / 2) * 0.94 * k * k;
    if (k >= 1 && !livingFx.landed[pr.fk + "@" + f.at]) {
      livingFx.landed[pr.fk + "@" + f.at] = 1;
      if (f.age < 2) { burst(pr.x + f.dir * 34, pr.y - 4, "#8a7a5a", 12, 120); burst(pr.x + f.dir * 18, pr.y - 2, "#5a4a30", 6, 80); shake = Math.max(shake, 2); }
    }
    D.sprites.drawProp(ctx, "stump", pr.x, pr.y);
    ctx.save();
    if (f.left < 8) ctx.globalAlpha = clamp(f.left / 8, 0, 1);
    ctx.translate(pr.x, pr.y - 4); ctx.rotate(a); ctx.translate(-pr.x, -(pr.y - 4));
    D.sprites.drawProp(ctx, base, pr.x, pr.y - 4);
    ctx.restore();
  }
  /* the three z's, outline and all, baked once onto one strip (Nov 21): drawn as text they were
   * six separate textures per sleeper, and at night, with half the field asleep, that broke the
   * draw into a hundred-odd extra batches a frame */
  var zzzStrip = null;
  function zzzSprite() {
    if (zzzStrip) return zzzStrip;
    var c = document.createElement("canvas"), g, i;
    c.width = 3 * 24; c.height = 24;
    g = c.getContext("2d");
    g.textAlign = "center"; g.textBaseline = "alphabetic"; g.lineWidth = 3; g.lineJoin = "round";
    for (i = 0; i < 3; i++) {
      g.font = "bold " + (8 + i * 2) + "px Trebuchet MS, sans-serif";
      g.strokeStyle = "rgba(10,14,30,0.85)"; g.fillStyle = "#cfe0ff";
      g.strokeText("z", i * 24 + 12, 17); g.fillText("z", i * 24 + 12, 17);
    }
    return (zzzStrip = c);
  }
  function drawZzz(en) {
    var t = run.time, top = en.y - (en.radius || 10) * 1.8 - 8, i, ph2, x, y, zs = zzzSprite();
    ctx.save();
    for (i = 0; i < 3; i++) {
      ph2 = (t * 0.45 + i / 3 + (en._id % 7) * 0.13) % 1;
      x = en.x + 6 + ph2 * 12 + Math.sin(ph2 * 6 + i) * 2; y = top - ph2 * 18;
      ctx.globalAlpha = Math.sin(ph2 * Math.PI) * 0.9;
      ctx.drawImage(zs, i * 24, 0, 24, 24, x - 12, y - 17, 24, 24);
    }
    ctx.restore();
  }
  /* rain-filled puddles and ponds: muddy rim, water, a highlight; rings when it is still raining; ice in winter */
  /* an uneven, irregular rim: the same wobble every frame for the same puddle */
  function puddleBlob(p, scale, dy) {
    var n = 22, j, th, rr, a1 = (p.h1 || 0) * 6.28, a2 = (p.h2 || 0) * 6.28;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + dy);                       /* from the centre, so the WebGL fan fills it right */
    for (j = 0; j <= n; j++) {
      th = j / n * Math.PI * 2;
      rr = p.r * scale * (1 + 0.13 * Math.sin(3 * th + a1) + 0.07 * Math.sin(5 * th + a2) - 0.03);
      ctx.lineTo(p.x + Math.cos(th) * rr, p.y + dy + Math.sin(th) * rr * 0.62);
    }
    ctx.closePath();
    ctx.fill();
  }
  function drawPuddles() {
    if (!D.world || !D.world.puddlesIn) return;
    var span = camSpan(), list = D.world.puddlesIn(camX - span.w / 2 - 20, camY - span.h / 2 - 20, camX + span.w / 2 + 20, camY + span.h / 2 + 20), i, p, k, ry, wet, frozen, t = run.time, ph2, rx, cx, cy;
    if (!list.length) return;
    wet = D.weather && D.weather.wetness ? D.weather.wetness(run) : 0;
    frozen = D.world.season === "winter";
    ctx.save();
    for (i = 0; i < list.length; i++) {
      p = list[i]; ry = p.r * 0.62;
      /* soaked into the ground, not stamped on it (Nov 21): a damp halo that fades out, an
       * uneven wobbly edge, and a few wet spots where it has seeped out past the rim. All of it
       * stays inside world.js PUD_SPILL x r, which is kept clear of cliffs and water. */
      ctx.globalAlpha = 0.16; ctx.fillStyle = "#2a2014";
      puddleBlob(p, 1.1, 2);                       /* x1.17 wobble = 1.29, inside PUD_SPILL */
      ctx.globalAlpha = 0.22;
      puddleBlob(p, 1.04, 1);
      for (k = 0; k < (p.r > 20 ? 3 : 2); k++) {
        var sa = (p.h1 * 6.28) + k * 2.2 + p.h2, sr = p.r * (0.14 + 0.1 * ph(p.x + k, p.y));
        cx = p.x + Math.cos(sa) * p.r * 1.0; cy = p.y + Math.sin(sa) * ry * 1.0;
        ctx.globalAlpha = frozen ? 0.45 : 0.3; ctx.fillStyle = frozen ? "#cfe6f2" : (p.pond ? "#2a6478" : "#3a7a8e");
        ctx.beginPath(); ctx.ellipse(cx, cy, sr, sr * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = frozen ? 0.85 : (p.pond ? 0.78 : 0.62);
      ctx.fillStyle = frozen ? "#cfe6f2" : (p.pond ? "#2a6478" : "#3a7a8e");
      puddleBlob(p, 1, 0);
      ctx.globalAlpha = frozen ? 0.8 : 0.35; ctx.fillStyle = frozen ? "#ffffff" : "#a8e0f0";
      ctx.beginPath(); ctx.ellipse(p.x - p.r * 0.25, p.y - ry * 0.3, p.r * 0.45, ry * 0.28, -0.15, 0, Math.PI * 2); ctx.fill();
      if (!frozen && wet > 0.15) {
        /* raindrops landing */
        ctx.strokeStyle = "#d8f4ff"; ctx.lineWidth = 1;
        for (k = 0; k < Math.max(2, Math.round(p.r / 9)); k++) {
          ph2 = (t * 1.3 + ph(k * 7.1, p.x * 0.01 + p.y * 0.013)) % 1;
          cx = p.x + (ph(k, p.x) - 0.5) * p.r * 1.3; cy = p.y + (ph(p.y, k) - 0.5) * ry * 1.2;
          rx = 1.5 + ph2 * 6;
          ctx.globalAlpha = (1 - ph2) * 0.7 * wet;
          ctx.beginPath(); ctx.ellipse(cx, cy, rx, rx * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
        }
      }
    }
    ctx.restore();
  }
  /* move-made ice that is about to give way: cracks that spread and flicker */
  function drawThinIce() {
    if (!D.world || !D.world.thinIceInView) return;
    var span = camSpan(), list = D.world.thinIceInView(camX, camY, span.w, span.h, 5), i, q, k, a, len, T = (D.sprites && D.sprites.TILE) || 48, f;
    if (!list.length) return;
    ctx.save(); ctx.lineWidth = 2;
    for (i = 0; i < list.length; i++) {
      q = list[i]; f = 1 - q.left / 5;
      ctx.globalAlpha = (0.45 + 0.4 * f) * (Math.sin(run.time * (6 + f * 14) + q.x) > -0.3 ? 1 : 0.4);
      ctx.strokeStyle = f > 0.6 ? "#3a6a88" : "#7aa8c4";
      for (k = 0; k < 3; k++) {
        a = ph(q.x + k, q.y) * Math.PI * 2; len = T * (0.2 + 0.3 * f) * (0.6 + ph(q.y, k));
        ctx.beginPath(); ctx.moveTo(q.x, q.y);
        ctx.lineTo(q.x + Math.cos(a) * len * 0.5 + 3, q.y + Math.sin(a) * len * 0.5);
        ctx.lineTo(q.x + Math.cos(a) * len, q.y + Math.sin(a) * len);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  /* Footprints in snow: every walker leaves a trail that fades over half a minute */
  var prints = [], printLast = {};
  var PRINT = { life: 30, max: 900 };
  function stepPrints(id, x, y, size) {
    var L = printLast[id], dx, dy, d, a, side;
    if (!L) { printLast[id] = { x: x, y: y, acc: 0, side: 1, seen: run.time }; return; }
    L.seen = run.time;
    dx = x - L.x; dy = y - L.y; d = Math.sqrt(dx * dx + dy * dy);
    L.x = x; L.y = y;
    if (d < 0.2 || d > 60) { L.acc = 0; return; }
    L.acc += d;
    if (L.acc < 11 * size) return;
    L.acc = 0;
    if (!D.world.snowAt(x, y)) return;
    a = Math.atan2(dy, dx); side = (L.side = -L.side);
    prints.push({ x: x - Math.sin(a) * side * 3.2 * size, y: y + Math.cos(a) * side * 2.2 * size, a: a, t: run.time, s: size });
    if (prints.length > PRINT.max) prints.splice(0, prints.length - PRINT.max);
  }
  function drawPrints() {
    if (!D.world || !D.world.snowAt || !run) return;
    var i, o, en, def, k;
    stepPrints("t", run.x, run.y + 2, 0.85);
    if (!isEggForm(run.form)) stepPrints("m", run.mx, run.my, 1.1);
    for (i = 0; i < (run.others || []).length; i++) { o = run.others[i]; stepPrints("ot" + o.id, o.x, o.y + 2, 0.85); stepPrints("om" + o.id, o.mx, o.my, 1.1); }
    for (i = 0; i < enemies.length; i++) {
      en = enemies[i]; def = D.ENEMIES && D.ENEMIES[en.type];
      if (def && def.fly) continue;
      stepPrints("e" + en._id, en.x, en.y, clamp((en.radius || 10) / 12, 0.7, 2.6));
    }
    if (stepTick % 600 === 0) for (k in printLast) if (run.time - printLast[k].seen > 3) delete printLast[k];
    while (prints.length && run.time - prints[0].t > PRINT.life) prints.shift();
    if (!prints.length) return;
    var span = camSpan(), x0 = camX - span.w / 2 - 10, x1 = camX + span.w / 2 + 10, y0 = camY - span.h / 2 - 10, y1 = camY + span.h / 2 + 10, p, age;
    ctx.save();
    for (i = 0; i < prints.length; i++) {
      p = prints[i];
      if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
      age = run.time - p.t;
      ctx.globalAlpha = 0.5 * clamp((PRINT.life - age) / 10, 0, 1);
      ctx.fillStyle = "#7c90b0";
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 2.8 * p.s, 1.7 * p.s, p.a, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha *= 0.6; ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.ellipse(p.x + Math.cos(p.a) * 1.2, p.y + 1, 2.2 * p.s, 1 * p.s, p.a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  /* the first time a river stops you, say why (once a run) */
  function riverHint(dt) {
    if (!run || livingFx.warned || !D.world || !D.world.openWaterAt) return;
    livingFx.warnT -= dt;
    if (livingFx.warnT > 0) return;
    livingFx.warnT = 0.4;
    var i, a;
    for (i = 0; i < 8; i++) {
      a = (Math.PI * 2 * i) / 8;
      if (D.world.openWaterAt(run.x + Math.cos(a) * 22, run.y + Math.sin(a) * 22)) {
        livingFx.warned = true;
        showNoticeToast("Too deep to wade. Find a ford, wait for winter, or freeze it with an ice move", "is-season is-winter");
        return;
      }
    }
  }

  /* ---------- Biome wars (Nov 20, war-sim.js) ---------- */
  function biomeName(id) { var BD = D.biomes && D.biomes.DEFS; return (BD && BD[id] && BD[id].name) || id; }
  function warColor(id) { return (D.WAR && D.WAR.color && D.WAR.color[id]) || "#ffffff"; }
  function warEvent(e) {
    if (!run) return;
    var near, d;
    if (e.type === "war.flip") {
      /* a guest's world learns it from the snapshot's territory too; this keeps it prompt */
      if (!missionAuth && D.world && D.world.setOwner) D.world.setOwner(e.cx, e.cy, e.to);
      d = Math.sqrt((e.x - run.x) * (e.x - run.x) + (e.y - run.y) * (e.y - run.y));
      near = d < 1400;
      if (near) burst(e.x, e.y, warColor(e.to), 10, 160);
      if (near && run.time - warToastT > 30) {
        warToastT = run.time;
        showNoticeToast(biomeName(e.to) + " is pushing into " + biomeName(e.from), "is-season is-war");
      }
      return;
    }
    if (e.type === "war.skirmish") {
      addFloat(e.x, e.y - 20, biomeName(e.a) + " vs " + biomeName(e.b), "#ffd27a");
      if (D.minimap && D.minimap.mark) {
        var mk = "war-" + e.x + "," + e.y;
        D.minimap.mark(mk, { x: e.x, y: e.y, color: "#ffb040" });
        setTimeout(function () { if (D.minimap) D.minimap.unmark(mk); }, 40000);
      }
      return;
    }
    if (e.type === "war.lord") {
      showNoticeToast(biomeName(e.side) + "'s lord has fallen. Its borders are caving in", "is-season is-war");
      burst(e.x, e.y, warColor(e.side), 24, 260);
    }
  }
  /* A nest: a ring of woven twigs and data-grass, with eggs in it for as many as live there (up to
   * five drawn), speckled in the biome's colour. An alpha nest is ringed with stones; an empty one is
   * just the ring. */
  function drawNests() {
    if (!nestList || !nestList.length) return;
    var cs = camSpan(), i, n, x, y, k, a, eggs, c, r;
    ctx.save();
    for (i = 0; i < nestList.length; i++) {
      n = nestList[i]; x = n[0]; y = n[1];
      if (Math.abs(x - camX) > cs.w / 2 + 60 || Math.abs(y - camY) > cs.h / 2 + 60) continue;
      c = warColor(n[2]); r = n[5] === "alpha" ? 30 : 24;
      ctx.globalAlpha = 0.35; ctx.fillStyle = "#1a120a";
      ctx.beginPath(); ctx.ellipse(x, y + 3, r + 4, (r + 4) * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#4a3620"; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.48, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2a1c10"; ctx.beginPath(); ctx.ellipse(x, y + 1, r * 0.66, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      /* twigs round the rim */
      ctx.strokeStyle = "#8a6a40"; ctx.lineWidth = 2;
      for (k = 0; k < 14; k++) {
        a = (Math.PI * 2 * k) / 14 + ph(x, k) * 0.3;
        ctx.beginPath();
        ctx.moveTo(Math.round(x + Math.cos(a) * r * 0.75), Math.round(y + Math.sin(a) * r * 0.36));
        ctx.lineTo(Math.round(x + Math.cos(a + 0.5) * r * 1.02), Math.round(y + Math.sin(a + 0.5) * r * 0.5));
        ctx.stroke();
      }
      ctx.fillStyle = c; ctx.globalAlpha = 0.7;
      for (k = 0; k < 6; k++) { a = ph(k, y) * Math.PI * 2; ctx.fillRect(Math.round(x + Math.cos(a) * r * 0.9), Math.round(y + Math.sin(a) * r * 0.44), 2, 2); }
      ctx.globalAlpha = 1;
      if (n[5] === "alpha") {
        ctx.fillStyle = "#8a8a94";
        for (k = 0; k < 5; k++) { a = (Math.PI * 2 * k) / 5 + 0.3; ctx.fillRect(Math.round(x + Math.cos(a) * (r + 7) - 3), Math.round(y + Math.sin(a) * (r + 7) * 0.5 - 4), 6, 5); }
      }
      eggs = Math.min(5, n[3]);
      for (k = 0; k < eggs; k++) {
        var ex = Math.round(x + (k - (eggs - 1) / 2) * 7), ey = Math.round(y - 3 + (k % 2) * 3);
        ctx.fillStyle = "#1a1410"; ctx.beginPath(); ctx.ellipse(ex, ey, 4, 5.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#f2ead6"; ctx.beginPath(); ctx.ellipse(ex, ey, 3, 4.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = c; ctx.fillRect(ex - 1, ey - 2, 2, 2); ctx.fillRect(ex + 1, ey + 1, 1, 1);
      }
    }
    ctx.restore();
  }
  /* ---------- PvP and allies that grow (Nov 20, pvp-sim.js) ---------- */
  function trustedList(tr) { var F = D.FACTIONS, out = [], k; if (!F || !tr) return out; for (k in tr) if (tr[k] >= F.trusted) out.push(k); return out; }
  /* the simulation's rule: both flags up; or each backed by some biome, and no biome backing both */
  function pvpFoe(o) {
    var A = trustedList(run && run.trust), B = trustedList(o && o.trust), i;
    if (o && o.hasTamer && run && run.pvpFlag && o.pvpFlag) return true;
    if (!A.length || !B.length || !o.hasTamer) return false;
    for (i = 0; i < A.length; i++) if (B.indexOf(A[i]) >= 0) return false;
    return true;
  }
  var pvpSeen = {};
  function pvpWatch() {
    var i, o, foe, name;
    if (!run || !run.others) return;
    for (i = 0; i < run.others.length; i++) {
      o = run.others[i]; foe = pvpFoe(o);
      if (foe && !pvpSeen[o.id]) {
        name = (online() && online().playerName && online().playerName(o.id)) || "Another tamer";
        showNoticeToast(name + " backs " + trustedList(o.trust).map(biomeName).join(" & ") + ". You're at war: your partners will fight on sight", "is-season is-war");
        noticeToastTimer = 4.5;
      }
      pvpSeen[o.id] = foe;
    }
  }
  /* the PvP flag: up at once, down only after PVP.flagOff seconds (so it can't be dropped mid-fight) */
  function togglePvp() {
    if (!run || run.ended || !missionAuth || (state !== "playing" && state !== "farm")) return;
    var want = !(run.pvpFlag && !run.pvpOffAt);
    if (missionAuth.act) missionAuth.act({ type: "pvp.flag", id: missionLocalId, on: want });
    sfx("ui");
  }
  function pvpFlagEvent(e) {
    if (!run || e.id !== run.myId) {
      if (e.on && run && run.pvpFlag && !e.offAt) { showNoticeToast(((online() && online().playerName && online().playerName(e.id)) || "Another tamer") + " raised their PvP flag. Both flags are up: fight!", "is-season is-war"); noticeToastTimer = 3.5; }
      return;
    }
    if (e.on && !e.offAt) showNoticeToast("PvP flag up: any tamer with theirs up can fight you.", "is-season is-war");
    else if (e.on) showNoticeToast("Lowering your PvP flag: still up for " + Math.max(0, Math.round(e.offAt - run.time)) + " seconds.", "is-season is-war");
    else showNoticeToast("PvP flag down.", "is-season is-war");
    noticeToastTimer = 3;
  }
  function tickPvpChip() {
    var c = el.hudPvp || $("hud-pvp");
    if (!c) return;
    var show = !!(run && !run.ended && (state === "playing" || state === "farm") && D.PVP);
    c.hidden = !show;
    if (!show) return;
    c.textContent = run.pvpFlag ? (run.pvpOffAt ? "PvP lowering… " + Math.max(0, Math.ceil(run.pvpOffAt - run.time)) + "s" : "PvP ON" + kh("pvp")) : "PvP off" + kh("pvp");
    c.classList.toggle("is-urgent", !!run.pvpFlag);
  }
  /* crossed golden swords over a tamer whose PvP flag is up */
  function drawPvpFlag(x, y) {
    ctx.save();
    ctx.strokeStyle = "rgba(10,10,20,0.9)"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x - 6, y + 6); ctx.lineTo(x + 6, y - 6); ctx.moveTo(x + 6, y + 6); ctx.lineTo(x - 6, y - 6); ctx.stroke();
    ctx.strokeStyle = "#ffd24a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 6, y + 6); ctx.lineTo(x + 6, y - 6); ctx.moveTo(x + 6, y + 6); ctx.lineTo(x - 6, y - 6); ctx.stroke();
    ctx.fillStyle = "#c08a2a"; ctx.fillRect(x - 7, y + 3, 4, 2); ctx.fillRect(x + 3, y + 3, 4, 2);
    ctx.restore();
  }
  function drawPvpMark(o) {
    var x = Math.round(o.mx), y = Math.round(o.my - 54 + Math.sin(run.time * 4) * 1.5);
    ctx.save();
    ctx.globalAlpha = 0.6 + Math.sin(run.time * 6) * 0.2; ctx.strokeStyle = "#ff4a5a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(o.mx, o.my - 2, 22, 11, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1; ctx.strokeStyle = "rgba(10,10,20,0.9)"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x - 6, y - 6); ctx.lineTo(x + 6, y + 6); ctx.moveTo(x + 6, y - 6); ctx.lineTo(x - 6, y + 6); ctx.stroke();
    ctx.strokeStyle = "#ff6a6a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 6, y - 6); ctx.lineTo(x + 6, y + 6); ctx.moveTo(x + 6, y - 6); ctx.lineTo(x - 6, y + 6); ctx.stroke();
    ctx.restore();
  }
  /* other tamers' profile names, under them, on a dark tag in their lobby colour (Nov 20) */
  var nameTags = [];
  function drawNameTags() {
    var i, t, lw, lx, ly;
    if (!nameTags.length) return;
    ctx.save();
    ctx.font = "bold 12px Trebuchet MS, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    for (i = 0; i < nameTags.length; i++) {
      t = nameTags[i];
      lw = Math.ceil(ctx.measureText(t.label).width) + 12; lx = Math.round(t.x - lw / 2); ly = Math.round(t.y + 12);
      ctx.fillStyle = "rgba(8,10,24,0.72)"; ctx.fillRect(lx, ly, lw, 15);
      ctx.fillStyle = t.col; ctx.fillRect(lx, ly, 2, 15); ctx.fillRect(lx + lw - 2, ly, 2, 15);
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(8,10,24,0.85)"; ctx.strokeText(t.label, Math.round(t.x), ly + 12);
      ctx.fillStyle = t.col; ctx.fillText(t.label, Math.round(t.x), ly + 12);
    }
    ctx.restore();
  }
  /* ---------- nemeses (nemesis-sim.js) ---------- */
  var NEM_COL = ["#ff5a4a", "#ff3a6a", "#e04aff", "#ff8a1a", "#ffd23a", "#9aff4a", "#ffffff"];
  function nemCol(t) { return NEM_COL[Math.min(NEM_COL.length, Math.max(1, t)) - 1]; }
  function drawNemesis(en) {
    var t = en.nem || 1, col = nemCol(t), r = (en.radius || 12) * (1.3 + 0.08 * t), sh = (D.stageHeight ? D.stageHeight(en.type) : (en.radius || 12) * 2.6) * (en.nemScale || 1), y = Math.round(en.y - sh * 0.74 - 16), pulse = Math.sin(run.time * (3 + t)) * 0.5 + 0.5;
    ctx.save();
    /* a ring of its colour under it, and flames of it rising off it */
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.35 + pulse * 0.3; ctx.strokeStyle = col; ctx.lineWidth = 2 + Math.min(4, t * 0.6);
    ctx.beginPath(); ctx.ellipse(en.x, en.y + 2, r, r * 0.38, 0, 0, Math.PI * 2); ctx.stroke();
    if (!reducedFx && Math.random() < 0.25 + t * 0.05) addParticle(en.x + rand(-r * 0.7, r * 0.7), en.y - rand(0, (en.radius || 12) * 1.6), rand(-6, 6), rand(-40, -20), col, rand(0.4, 0.7), rand(2, 3 + t * 0.4), "glow", true, 0);
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    /* the title, with a skull for each title it holds (up to five) */
    var txt = en.nemTitle || "Nemesis", sk = "", k;
    for (k = 0; k < Math.min(5, t); k++) sk += "\u2620";
    ctx.font = "bold " + (12 + Math.min(4, t)) + "px Trebuchet MS, sans-serif"; ctx.textAlign = "center"; ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(10,4,12,0.92)"; ctx.fillStyle = col;
    ctx.strokeText(txt, en.x, y); ctx.fillText(txt, en.x, y);
    ctx.font = "bold 9px sans-serif"; ctx.lineWidth = 3;
    ctx.strokeText(sk + "  Lv " + (en.lv || 1), en.x, y + 11); ctx.fillStyle = "#ffe0e0"; ctx.fillText(sk + "  Lv " + (en.lv || 1), en.x, y + 11);
    ctx.restore();
  }
  function nemesisEvent(e) {
    if (!run) return;
    var me = e.victim === run.myId || e.victim === missionLocalId || e.by === run.myId || e.by === missionLocalId, nm = spName(e.form);
    if (e.type === "nemesis.kill") {
      burst(e.x, e.y, nemCol(e.tier), 24, 220); shake = Math.max(shake, 10);
      var vName = e.victim != null && online() && online().playerName ? online().playerName(e.victim) : "";
      showNoticeToast(e.tier <= 1 && (e.kills || 1) <= 1
        ? (me ? "That " + nm + " remembers beating you. It grew stronger: watch for \u201c" + e.title + "\u201d, level " + e.lv + "."
              : (vName || "A friend") + "'s partner was beaten by a " + nm + ". It is now \u201c" + e.title + "\u201d, level " + e.lv + ".")
        : "\u201c" + e.title + "\u201d (" + nm + ") has beaten " + (me ? "you" : (vName || "another tamer")) + " too and grows: level " + e.lv + ".", "is-season is-war");
      noticeToastTimer = 5.5; sfx("hurt");
    } else if (e.type === "nemesis.rise") {
      burst(e.x, e.y, nemCol(e.tier), 30, 260);
      if (e.from !== e.form) addFloat(e.x, e.y - 40, spName(e.from) + " \u2192 " + nm + "!", nemCol(e.tier));
      if (e.tier > 1) { showNoticeToast("A nemesis rises: now a " + ((D.NEMESIS && D.NEMESIS.titles[Math.min(e.tier, D.NEMESIS.titles.length) - 1]) || "monster") + (e.from !== e.form ? ", and it digivolved into " + nm : "") + ".", "is-season is-war"); noticeToastTimer = 4.5; }
    } else if (e.type === "nemesis.down") {
      burst(e.x, e.y, nemCol(e.tier), 40, 300); shake = Math.max(shake, 14);
      showNoticeToast((e.by === run.myId || e.by === missionLocalId ? "Revenge! You beat " : "Someone beat ") + "\u201c" + e.title + "\u201d." + (e.by === run.myId || e.by === missionLocalId ? " +" + e.bits + " Bits, and its XP is scattered around it." : ""), "is-season");
      noticeToastTimer = 5; sfx("level");
    }
  }
  /* Open World respawns, bounties, a first Mega (modes-sim.js) */
  function modeEvent(e) {
    if (!run) return;
    var me = e.id === run.myId || e.id === missionLocalId, who = (online() && online().playerName && online().playerName(e.id)) || "Another tamer";
    if (e.type === "respawn") {
      burst(e.x, e.y, "#ffe9a8", 16, 160);
      if (!me) return;
      camX = e.x; camY = e.y; run.ended = false;
      showNoticeToast("Your partner fell, but you are not out. It is an egg again, back near the start where the land is gentle. Base level and stat points kept" +
        (e.peak > 3 ? "; it earns extra XP until it is near job level " + e.peak + " again." : "."), "is-season");
      noticeToastTimer = 6; sfx("level");
    } else if (e.type === "bounty.set") {
      showNoticeToast(me ? "You have beaten " + e.streak + " tamers in a row: there is a " + e.bits + " Bit bounty on your head!" : who + " is on a " + e.streak + " win streak: " + e.bits + " Bit bounty on them.", "is-season is-war");
      noticeToastTimer = 4.5;
    } else if (e.type === "bounty.claimed") {
      showNoticeToast(me ? "Bounty claimed! +" + e.bits + " Bits." : who + " claimed a " + e.bits + " Bit bounty.", "is-season is-war");
      noticeToastTimer = 4.5; if (me) sfx("level");
    } else if (e.type === "mode.mega" && me) {
      showNoticeToast("Mega reached at " + formatTime(e.at) + ". That time goes on the boards when the run ends.", "is-season");
      noticeToastTimer = 4;
    }
  }
  function drawBounty(o) {
    var x = Math.round(o.mx), y = Math.round(o.my - 70 + Math.sin(run.time * 3) * 1.5);
    ctx.save();
    ctx.font = "bold 10px Trebuchet MS, sans-serif"; ctx.textAlign = "center"; ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(10,10,20,0.9)"; ctx.fillStyle = "#ffd23a";
    ctx.strokeText("BOUNTY " + o.bounty, x, y); ctx.fillText("BOUNTY " + o.bounty, x, y);
    ctx.restore();
  }
  function pvpKoEvent(e) {
    if (!run) return;
    burst(e.x, e.y, "#ff6a6a", 18, 220);
    if (e.loser === run.myId) {
      showNoticeToast("Beaten by another tamer: your pair was knocked back home to the farm" + (e.bits ? " and lost " + e.bits + " Bits" : "") + ".", "is-season is-war");
      noticeToastTimer = 5; sfx("hurt");
      farmGo = null;
      if (online() && online().isGuest && online().isGuest() && online().goFarm) online().goFarm();
      else startFarm({ onDemand: true });
    } else if (e.winner === run.myId) {
      showNoticeToast("You beat another tamer's partner!" + (e.bits ? " +" + e.bits + " Bits" : "") + (e.bounty ? " And the bounty on them: +" + e.bounty + "." : ""), "is-season is-war");
      noticeToastTimer = 4; sfx("level");
    }
  }
  /* Ragnarok-style level tag beside the health bar: grey well below you (little XP), white near your
   * level, orange above, red far above (it hits hard) */
  function drawEnemyLevel(en, barX, barY, barH) {
    var L = D.LEVELS, d = (en.lv || 1) - (run.level || 1), col = d >= 6 ? "#ff5a5a" : (d >= 2 ? "#ffb04a" : (d >= -L.freeBelow ? "#f2f2f2" : "#8a90a0"));
    ctx.save();
    ctx.font = "bold 9px Trebuchet MS, sans-serif"; ctx.textAlign = "right"; ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(10,10,20,0.85)"; ctx.fillStyle = col;
    ctx.strokeText(String(en.lv), barX - 2, barY + barH + 1); ctx.fillText(String(en.lv), barX - 2, barY + barH + 1);
    ctx.restore();
  }
  /* an ally that has grown: its level in gold under its feet */
  function drawAllyLevel(en) {
    var t = "Lv " + en.alv, y = Math.round(en.y + 14);
    ctx.save();
    ctx.font = "bold 10px Trebuchet MS, sans-serif"; ctx.textAlign = "center"; ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(10,10,20,0.85)"; ctx.fillStyle = "#ffe27a";
    ctx.strokeText(t, en.x, y); ctx.fillText(t, en.x, y);
    ctx.restore();
  }

  /* ---------- Going to the farm (Nov 20) ----------
   * Press G (or the Farm chip): stand still for FARM_CFG.chargeSec with no
   * enemy close and you are at the farm. The world keeps going meanwhile;
   * leave the farm and you are back where you stood. */
  var farmGo = null;
  function farmOnDemand() { return !!(D.FARM_CFG && D.FARM_CFG.onDemand); }
  /* the same rule as the simulation's (mission-sim.js _hostileNear), on what we can see */
  function farmBlocked() {
    var F = D.FARM_CFG || {}, r2 = Math.pow(F.blockRadius || 380, 2), i, en;
    if (!run) return null;
    for (i = 0; i < enemies.length; i++) {
      en = enemies[i];
      if (en.dead || en.zz || (en.rally != null && en.rally === run.myId) || (en.fac && trustsFac(en.fac))) continue;
      if (dist2(en.x, en.y, run.x, run.y) < r2 || dist2(en.x, en.y, run.mx, run.my) < r2) return en;
    }
    return null;
  }
  function askFarm() {
    if (!run || run.ended || state !== "playing" || !farmOnDemand() || isEggForm(run.form)) return;
    if (farmGo) { farmGo = null; showNoticeToast("Farm trip called off."); noticeToastTimer = 2; return; }
    if (farmBlocked()) { showNoticeToast("Not with enemies this close."); noticeToastTimer = 2.5; sfx("hurt"); return; }
    farmGo = { left: (D.FARM_CFG.chargeSec || 2), x: run.x, y: run.y };
    sfx("ui");
  }
  function tickFarmGo(dt) {
    if (!farmGo || !run) return;
    if (Math.abs(run.x - farmGo.x) + Math.abs(run.y - farmGo.y) > 6) { farmGo = null; showNoticeToast("Moved: farm trip called off."); noticeToastTimer = 2; return; }
    if (farmBlocked()) { farmGo = null; showNoticeToast("An enemy came close: farm trip called off."); noticeToastTimer = 2.5; sfx("hurt"); return; }
    burst(run.x + (Math.random() - 0.5) * 30, run.y - Math.random() * 30, "#7affb0", 1, 40);
    farmGo.left -= dt;
    if (farmGo.left > 0) return;
    farmGo = null;
    if (online() && online().isGuest && online().isGuest() && online().goFarm) { online().goFarm(); return; }
    startFarm({ onDemand: true });
  }
  /* at the farm, the world keeps going (solo, or hosting without the online clock) */
  function stepWorldAway(dt) {
    if (!farmOnDemand() || !missionAuth || !run || run.ended) return;
    if (online() && online().drivesClock()) return;
    missionAcc += dt;
    var step = missionAuth.dt || 0.04, guard = 0;
    while (missionAcc >= step && guard < 8) { missionAuth.step(); missionAcc -= step; guard += 1; }
    applyMissionSnapshot(takeMissionSnapshot());
    tickNoticeToast(dt);
  }

  /* ---------- Faction trust (Nov 20, faction-sim.js) ---------- */
  function trustsFac(fac) { return !!(run && run.trust && D.FACTIONS && (run.trust[fac] || 0) >= D.FACTIONS.trusted); }
  function trustEvent(e) {
    if (!run || e.id !== run.myId) return;
    var n = biomeName(e.fac);
    if (e.level === "trusted") showNoticeToast(n + " trusts you now: its Digimon leave you be, and your attacks pass over them", "is-season is-war");
    else if (e.level === "allied") showNoticeToast(n + " fights at your side! A few of its Digimon will rally to you", "is-season is-war");
    else if (e.level === "cooling") showNoticeToast(n + " no longer fights for you, but still trusts you", "is-season is-war");
    else if (e.level === "hostile") showNoticeToast(n + " has turned against you", "is-season is-war");
    noticeToastTimer = 4;
  }
  /* a friendly biome's Digimon: a small heart in its colour over it; one fighting for you also gets a ring */
  function drawFriendMark(en) {
    var c = warColor(en.fac), top = Math.round(en.y - (en.radius || 10) * 2 - (en.war ? 20 : 8)), x = Math.round(en.x - 4), mine = en.rally != null && en.rally === run.myId;
    ctx.save();
    if (mine) {
      ctx.globalAlpha = 0.55 + Math.sin(run.time * 5 + en._id) * 0.15; ctx.strokeStyle = c; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(en.x, en.y - 2, (en.radius || 10) + 6, ((en.radius || 10) + 6) * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "rgba(10,10,20,0.85)";
    ctx.fillRect(x - 1, top, 11, 7); ctx.fillRect(x + 1, top + 7, 7, 2); ctx.fillRect(x + 3, top + 9, 3, 1);
    ctx.fillStyle = c;
    ctx.fillRect(x, top + 1, 4, 4); ctx.fillRect(x + 5, top + 1, 4, 4); ctx.fillRect(x + 1, top + 5, 7, 2); ctx.fillRect(x + 3, top + 7, 3, 1);
    if (mine) { ctx.fillStyle = "#ffffff"; ctx.fillRect(x + 1, top + 2, 1, 1); ctx.fillRect(x + 6, top + 2, 1, 1); }
    ctx.restore();
  }
  /* the HUD strip: each biome you have any standing with, its trust, and whether it leaves you be or fights for you */
  var trustSig = "";
  function tickTrustHud() {
    var box = $("hud-trust"), F = D.FACTIONS, list = [], k, sig, html, i, t, cls;
    if (!box || !F) return;
    if (!run || state !== "playing" || !run.trust) { if (!box.hidden) box.hidden = true; trustSig = ""; return; }
    for (k in run.trust) if (run.trust[k] >= 1) list.push([k, run.trust[k]]);
    list.sort(function (a, b) { return b[1] - a[1]; });
    list = list.slice(0, 4);
    sig = list.map(function (q) { return q[0] + Math.round(q[1]) + (run.allied && run.allied[q[0]] ? "A" : ""); }).join("|");
    if (sig === trustSig) return;
    trustSig = sig;
    box.hidden = !list.length;
    html = "";
    for (i = 0; i < list.length; i++) {
      k = list[i][0]; t = list[i][1];
      cls = run.allied && run.allied[k] ? "is-ally" : (t >= F.trusted ? "is-trusted" : "");
      html += '<div class="trust-row ' + cls + '" title="' + biomeName(k) + ": " + Math.round(t) + ' trust"><i style="background:' + warColor(k) + '"></i><b>' + biomeName(k) +
        '</b><span class="trust-bar"><span style="width:' + Math.round(t) + '%;background:' + warColor(k) + '"></span><em style="left:' + F.trusted + '%"></em></span><s>' +
        (cls === "is-ally" ? "★" : (cls ? "♥" : "")) + "</s></div>";
    }
    box.innerHTML = html;
  }

  /* a soldier of a biome war: a small pennant in its biome's colour */
  function drawWarBanner(en) {
    var top = Math.round(en.y - (en.radius || 10) * 2 - 6), x = Math.round(en.x - 1), c = warColor(en.war), wave = Math.sin(run.time * 6 + en._id) * 1.5;
    ctx.save();
    ctx.fillStyle = "rgba(10,10,20,0.85)"; ctx.fillRect(x - 1, top - 1, 3, 14);
    ctx.fillStyle = "#e8e0d0"; ctx.fillRect(x, top, 1, 12);
    ctx.fillStyle = "rgba(10,10,20,0.85)";
    ctx.beginPath(); ctx.moveTo(x + 1, top - 1); ctx.lineTo(x + 11 + wave, top + 3); ctx.lineTo(x + 1, top + 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(x + 1, top); ctx.lineTo(x + 9 + wave, top + 3); ctx.lineTo(x + 1, top + 6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  /* contested ground: a haze of the attacker's colour that thickens as the cell is about to fall,
   * with sparks crackling where the two sides meet */
  function drawFronts() {
    if (!fronts || !fronts.length || !D.world || !D.world.TERR) return;
    var T = (D.sprites && D.sprites.TILE) || 48, span = D.world.TERR * T, cs = camSpan(), i, f, x, y, k, g, a, c, NB = [[1, 0], [-1, 0], [0, 1], [0, -1]], ex, ey, t = run.time;
    ctx.save();
    for (i = 0; i < fronts.length; i++) {
      f = fronts[i]; x = (f[0] + 0.5) * span; y = (f[1] + 0.5) * span;
      if (Math.abs(x - camX) > cs.w / 2 + span || Math.abs(y - camY) > cs.h / 2 + span) continue;
      a = f[3] / 100; c = warColor(f[2]);
      g = ctx.createRadialGradient(x, y, span * 0.1, x, y, span * 0.75);
      ctx.globalAlpha = (0.1 + 0.22 * a) * (0.85 + 0.15 * Math.sin(t * 2 + f[0]));
      g.addColorStop(0, c); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(x - span, y - span, span * 2, span * 2);
      for (k = 0; k < 4; k++) {
        if (D.world.cellOwner(f[0] + NB[k][0], f[1] + NB[k][1]) !== f[2]) continue;
        ex = x + NB[k][0] * span * 0.5; ey = y + NB[k][1] * span * 0.5;
        for (var s2 = 0; s2 < 3; s2++) {
          if (ph(t * 7 + s2, f[0] * 3 + k) > 0.35 + 0.4 * (1 - a)) continue;
          ctx.globalAlpha = 0.5 + 0.5 * a; ctx.fillStyle = s2 ? c : "#ffffff";
          ctx.fillRect(Math.round(ex + (ph(s2, t * 3 + k) - 0.5) * span * (NB[k][1] ? 0.9 : 0.15)), Math.round(ey + (ph(t * 3 + k, s2) - 0.5) * span * (NB[k][0] ? 0.9 : 0.15)), 3, 3);
        }
      }
    }
    ctx.restore();
  }

  /* charred grass: a dark, ragged stain a tile wide, embers for the first seconds, fading as it grows back */
  function drawScorch() {
    if (!D.world || !D.world.burntInView) return;
    var span = camSpan(), list = D.world.burntInView(camX, camY, span.w, span.h), T = (D.sprites && D.sprites.TILE) || 48, i, b, a, k, t = run ? run.time : 0;
    if (!list.length) return;
    ctx.save();
    /* two passes, so the char blobs (one texture) and the specks (another) each go in one batch */
    ctx.fillStyle = "#1a110c";
    for (i = 0; i < list.length; i++) {
      b = list[i];
      a = Math.min(1, b.age / 0.5) * (b.state === 2 ? clamp(b.left / b.sprout, 0, 1) : 1);
      ctx.globalAlpha = 0.5 * a;
      for (k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.ellipse(b.x + (ph(b.tx * 3 + k, b.ty) - 0.5) * T * 0.4, b.y + (ph(b.tx, b.ty * 3 + k) - 0.5) * T * 0.4, T * (0.42 + ph(b.tx + k, b.ty + 7) * 0.22), T * (0.32 + ph(b.tx + 9, b.ty + k) * 0.18), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (i = 0; i < list.length; i++) {
      b = list[i];
      a = Math.min(1, b.age / 0.5) * (b.state === 2 ? clamp(b.left / b.sprout, 0, 1) : 1);
      ctx.globalAlpha = 0.35 * a; ctx.fillStyle = "#6a5a50";
      for (k = 0; k < 4; k++) ctx.fillRect(Math.round(b.x + (ph(b.tx + k * 5, b.ty + 2) - 0.5) * T * 0.8), Math.round(b.y + (ph(b.tx + 3, b.ty + k * 5) - 0.5) * T * 0.7), 3, 2);
      if (b.age < 12 && b.state === 1) {
        for (k = 0; k < 3; k++) {
          if (Math.sin(t * (5 + k) + b.tx * 3 + b.ty + k * 2) < 0.2) continue;
          ctx.globalAlpha = (1 - b.age / 12) * 0.9; ctx.fillStyle = k % 2 ? "#ff8a2a" : "#ffd24a";
          ctx.fillRect(Math.round(b.x + (ph(b.tx + k, b.ty * 2) - 0.5) * T * 0.8), Math.round(b.y + (ph(b.tx * 2, b.ty + k) - 0.5) * T * 0.7), 2, 2);
        }
      }
    }
    ctx.restore();
  }

  /* ---- status effects: what is on the ground and what is on an enemy ---- */
  var ST = { burn: 1, freeze: 2, wet: 4, root: 8, shock: 16, bleed: 32, poison: 64, curse: 128, daze: 256, chill: 512 };
  var ST_LOOK = {
    burn: ["Burn!", "#ff8a2a"], freeze: ["Frozen!", "#bfe8ff"], wet: ["Soaked", "#4aa7ff"], root: ["Rooted", "#6fc24a"], shock: ["Shock!", "#ffe14a"],
    bleed: ["Bleed", "#e0464a"], poison: ["Poison", "#b06ad0"], curse: ["Cursed", "#a060d0"], daze: ["Dazed", "#ffe27a"], chill: ["Chilled", "#9ad8ff"], gust: ["Gust!", "#8fe0d0"]
  };
  var ST_PIPS = [["wet", "#4aa7ff"], ["chill", "#bfe8ff"], ["root", "#6fc24a"], ["shock", "#ffe14a"], ["bleed", "#e0464a"], ["poison", "#b06ad0"], ["curse", "#a060d0"], ["daze", "#ffe27a"]];
  var stFloatT = 0;
  function ph(a, b) { var n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); }
  /* Nov 21: only what is on screen, and all the flames in one additive pass at the end
   * (switching the blend mode or texture per patch broke the draw into hundreds of batches) */
  var fireList = [];
  function drawPatches() {
    var i, q, a, k, n, fx, fy, hgt, t = run ? run.time : 0, sq = 0.72, span = camSpan(), pad = 80;
    var vx0 = camX - span.w / 2 - pad, vx1 = camX + span.w / 2 + pad, vy0 = camY - span.h / 2 - pad, vy1 = camY + span.h / 2 + pad;
    fireList.length = 0;
    for (i = 0; i < patches.length; i++) {
      q = patches[i];
      if (q.x + q.r < vx0 || q.x - q.r > vx1 || q.y + q.r < vy0 || q.y - q.r > vy1) continue;
      a = Math.max(0, Math.min(1, q.t / 0.7, (q.max - q.t) / 0.2 + 0.25));
      ctx.save();
      if (q.kind === "wet") {
        ctx.globalAlpha = 0.34 * a; ctx.fillStyle = "#3f86e0";
        ctx.beginPath(); ctx.ellipse(q.x, q.y, q.r, q.r * sq, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.5 * a; ctx.strokeStyle = "#cfe8ff"; ctx.lineWidth = 2;
        for (k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(q.x + (ph(q.id, k) - 0.5) * q.r, q.y + (ph(q.id, k + 9) - 0.5) * q.r * sq, q.r * 0.22, q.r * 0.08, 0, Math.PI, Math.PI * 1.9); ctx.stroke(); }
      } else if (q.kind === "ice") {
        ctx.globalAlpha = 0.6 * a; ctx.fillStyle = "#c4ecff";
        ctx.beginPath(); ctx.ellipse(q.x, q.y, q.r, q.r * sq, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.85 * a; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5;
        for (k = 0; k < 4; k++) {
          fx = q.x + (ph(q.id, k) - 0.5) * q.r * 1.2; fy = q.y + (ph(q.id, k + 5) - 0.5) * q.r * sq;
          ctx.beginPath(); ctx.moveTo(fx - 8, fy - 3); ctx.lineTo(fx, fy); ctx.lineTo(fx + 7, fy - 5); ctx.moveTo(fx, fy); ctx.lineTo(fx + 2, fy + 6); ctx.stroke();
        }
        ctx.strokeStyle = "#8cc8ec"; ctx.lineWidth = 2; ctx.globalAlpha = 0.6 * a;
        ctx.beginPath(); ctx.ellipse(q.x, q.y, q.r, q.r * sq, 0, 0, Math.PI * 2); ctx.stroke();
      } else if (q.kind === "goo") {
        ctx.globalAlpha = 0.6 * a; ctx.fillStyle = "#7c8a2c";
        ctx.beginPath(); ctx.ellipse(q.x, q.y, q.r, q.r * sq, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#b8c84a";
        for (k = 0; k < 5; k++) {
          n = (t * 0.8 + ph(q.id, k)) % 1;
          ctx.globalAlpha = 0.7 * a * (1 - n);
          ctx.beginPath(); ctx.arc(q.x + (ph(q.id, k + 3) - 0.5) * q.r * 1.3, q.y + (ph(q.id, k + 7) - 0.5) * q.r * sq, 2 + n * 4, 0, Math.PI * 2); ctx.fill();
        }
      } else {
        /* fire: scorched ground now, the tongues of flame after the loop */
        ctx.globalAlpha = 0.4 * a; ctx.fillStyle = "#24140c";
        ctx.beginPath(); ctx.ellipse(q.x, q.y, q.r, q.r * sq, 0, 0, Math.PI * 2); ctx.fill();
        fireList.push(q, a);
      }
      ctx.restore();
    }
    if (!fireList.length) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (i = 0; i < fireList.length; i += 2) {
      q = fireList[i]; a = fireList[i + 1];
      {
        n = Math.max(5, Math.round(q.r / 4));
        for (k = 0; k < n; k++) {
          fx = q.x + (ph(q.id, k) - 0.5) * q.r * 1.7; fy = q.y + (ph(q.id, k + 31) - 0.5) * q.r * sq * 1.6;
          if ((fx - q.x) * (fx - q.x) / (q.r * q.r) + (fy - q.y) * (fy - q.y) / (q.r * q.r * sq * sq) > 1) continue;
          if (D.world.groundAt && D.world.groundAt(fx, fy) === "water") continue;     /* no flames on water */
          hgt = (9 + ph(q.id, k + 61) * 13) * (0.7 + 0.3 * Math.sin(t * 13 + k * 2.1)) * a;
          ctx.globalAlpha = 0.75 * a; ctx.fillStyle = "#ff6a1a";
          ctx.beginPath(); ctx.moveTo(fx - 4, fy); ctx.quadraticCurveTo(fx - 3 + Math.sin(t * 9 + k) * 2, fy - hgt * 0.6, fx + Math.sin(t * 7 + k) * 3, fy - hgt); ctx.quadraticCurveTo(fx + 4, fy - hgt * 0.5, fx + 4, fy); ctx.fill();
          ctx.globalAlpha = 0.8 * a; ctx.fillStyle = "#ffd24a";
          ctx.beginPath(); ctx.moveTo(fx - 2, fy); ctx.quadraticCurveTo(fx, fy - hgt * 0.4, fx + Math.sin(t * 7 + k) * 1.5, fy - hgt * 0.6); ctx.quadraticCurveTo(fx + 2, fy - hgt * 0.3, fx + 2, fy); ctx.fill();
        }
      }
    }
    ctx.restore();
  }
  /* the marks on one enemy: ice round a frozen one, flames on a burning one, small pips for the rest */
  function drawEnemyStatus(en, barX, barY) {
    var b = en.st | 0, r = en.radius || 12, t = run.time, k, n = 0, fx, hgt;
    if (!b) return;
    ctx.save();
    if (b & ST.freeze) {
      /* a block of ice: a cut-cornered slab, see-through, with a hard pale edge */
      var ix = en.x - r * 1.2, iy = en.y - r * 2.4, iw = r * 2.4, ih = r * 2.7, cut = Math.min(8, r * 0.5);
      ctx.beginPath(); ctx.moveTo(ix + cut, iy); ctx.lineTo(ix + iw - cut, iy); ctx.lineTo(ix + iw, iy + cut); ctx.lineTo(ix + iw, iy + ih - cut); ctx.lineTo(ix + iw - cut, iy + ih); ctx.lineTo(ix + cut, iy + ih); ctx.lineTo(ix, iy + ih - cut); ctx.lineTo(ix, iy + cut); ctx.closePath();
      ctx.globalAlpha = 0.36; ctx.fillStyle = "#7ecbff"; ctx.fill();
      ctx.globalAlpha = 0.85; ctx.strokeStyle = "#d8f2ff"; ctx.lineWidth = 2; ctx.stroke();
      ctx.globalAlpha = 0.8; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ix + iw * 0.18, iy + ih * 0.3); ctx.lineTo(ix + iw * 0.4, iy + ih * 0.12); ctx.moveTo(ix + iw * 0.2, iy + ih * 0.5); ctx.lineTo(ix + iw * 0.3, iy + ih * 0.42); ctx.stroke();
    }
    if (b & ST.burn) {
      for (k = 0; k < 3; k++) {
        fx = en.x + (k - 1) * r * 0.75; hgt = (14 + r * 0.9) * (0.7 + 0.3 * Math.sin(t * 14 + k * 2 + en._id));
        var fb = en.y - r * 0.2 - (k === 1 ? r * 0.5 : 0), fw = 4 + r * 0.25;
        ctx.globalAlpha = 0.85; ctx.fillStyle = "#ff6a1a";
        ctx.beginPath(); ctx.moveTo(fx - fw, fb); ctx.quadraticCurveTo(fx - fw + Math.sin(t * 8 + k) * 2, fb - hgt * 0.6, fx + Math.sin(t * 7 + k) * 2, fb - hgt); ctx.quadraticCurveTo(fx + fw, fb - hgt * 0.4, fx + fw, fb); ctx.fill();
        ctx.fillStyle = "#ffd24a";
        ctx.beginPath(); ctx.moveTo(fx - fw * 0.5, fb); ctx.quadraticCurveTo(fx, fb - hgt * 0.4, fx + Math.sin(t * 7 + k), fb - hgt * 0.6); ctx.quadraticCurveTo(fx + fw * 0.5, fb - hgt * 0.3, fx + fw * 0.5, fb); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    for (k = 0; k < ST_PIPS.length; k++) if (b & ST[ST_PIPS[k][0]]) {
      ctx.fillStyle = "rgba(8,10,24,0.85)"; ctx.fillRect(barX + n * 7 - 1, barY - 8, 7, 7);
      ctx.fillStyle = ST_PIPS[k][1]; ctx.fillRect(barX + n * 7, barY - 7, 5, 5);
      n++;
    }
    ctx.restore();
  }

  /* Water you can read without colour (Nov 21): wavy white ripple lines drift across every
   * open-water tile and now and then a glint flashes; lava swells with bubbles that pop.
   * Gravel never moves, so even in grey the water reads as water. */
  function wHash(a, b) { var h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function drawWaterFx() {
    if (!D.world || !D.world.waterInView) return;
    var span = camSpan(), list = D.world.waterInView(camX, camY, span.w, span.h), T = (D.sprites && D.sprites.TILE) || 48, P = T / 16;
    var t = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000, i, w, h1, h2, x0, y0, ph, a, ox, oy, k, r, u, lavaOn = 0;
    if (!list.length) return;
    ctx.save();
    for (i = 0; i < list.length; i++) {
      w = list[i];
      x0 = w[0] * T; y0 = w[1] * T;
      h1 = wHash(w[0], w[1]); h2 = wHash(w[1] + 77, w[0] - 31);
      if (w[2] === 2) { lavaOn = 1; continue; }
      /* two ripple lines per tile, drifting east with the current and breathing in and out */
      for (k = 0; k < (w[3] ? 2 : 1); k++) {
        ph = t * (0.35 + h1 * 0.2) + h2 * 6.28 + k * 3.1;
        a = 0.35 + 0.45 * Math.max(0, Math.sin(ph));
        if (a < 0.08) continue;
        oy = w[3] ? Math.floor((k ? 0.68 : 0.22) * 16 + h1 * 4) : 8;
        ox = w[3] ? Math.floor(((t * (5 + h2 * 4) + h1 * 16 + k * 8) % 16)) : 5 + Math.floor(h2 * 3);
        ctx.globalAlpha = a;
        ctx.fillStyle = "#f2fbff";
        /* a little "~": up, across, down, across */
        ctx.fillRect(x0 + ((ox) % 16) * P, y0 + (oy + 1) * P, P * 2, P);
        ctx.fillRect(x0 + ((ox + 2) % 16) * P, y0 + oy * P, P * 2, P);
        ctx.fillRect(x0 + ((ox + 4) % 16) * P, y0 + (oy + 1) * P, P * 2, P);
        if (w[3]) ctx.fillRect(x0 + ((ox + 6) % 16) * P, y0 + oy * P, P * 2, P);
      }
      /* a glint, now and then */
      u = (t * 0.5 + h1 * 13) % 7;
      if (w[3] && u < 0.35) {
        ctx.globalAlpha = 1 - u / 0.35;
        ctx.fillStyle = "#ffffff";
        ox = x0 + (3 + Math.floor(h2 * 10)) * P; oy = y0 + (3 + Math.floor(h1 * 10)) * P;
        ctx.fillRect(ox, oy - P, P, P * 3); ctx.fillRect(ox - P, oy, P * 3, P);
      }
    }
    if (lavaOn) for (i = 0; i < list.length; i++) {
      w = list[i];
      if (w[2] !== 2) continue;
      x0 = w[0] * T; y0 = w[1] * T;
      h1 = wHash(w[0], w[1]); h2 = wHash(w[1] + 77, w[0] - 31);
      /* lots of little bubbles: each rises, swells a pixel or two and pops (edge tiles keep them
       * in the middle, clear of the bank) */
      for (k = 0; k < (w[3] ? 5 : 3); k++) {
        var hb = wHash(w[0] * 7 + k * 131, w[1] * 5 - k * 71), hc = wHash(w[1] * 3 + k * 53, w[0] * 11 + k * 17);
        var ub = (t / (0.9 + hb * 1.3) + hc) % 1, inset = w[3] ? 2 : 5;
        var bx = x0 + (inset + hb * (16 - inset * 2)) * P, by = y0 + (inset + hc * (16 - inset * 2)) * P;
        if (ub < 0.75) {
          var rb = Math.max(1, Math.round(1 + 1.6 * (ub / 0.75))) * P * 0.5;
          ctx.globalAlpha = 0.95;
          ctx.fillStyle = "#2a0a02"; ctx.fillRect(Math.round(bx - rb - P * 0.5), Math.round(by - rb - P * 0.5), Math.round(rb * 2 + P), Math.round(rb * 2 + P));
          ctx.fillStyle = ub > 0.5 ? "#fff0a0" : "#ffc23a"; ctx.fillRect(Math.round(bx - rb), Math.round(by - rb), Math.round(rb * 2), Math.round(rb * 2));
        } else if (ub < 0.85) {
          ctx.globalAlpha = 1 - (ub - 0.75) / 0.1;
          ctx.fillStyle = "#ffe48a";
          ctx.fillRect(bx - P * 1.5, by, P, P); ctx.fillRect(bx + P * 0.5, by, P, P); ctx.fillRect(bx - P * 0.5, by - P, P, P);
        }
      }
      if (!w[3]) continue;
      u = (t / (2.2 + h1 * 1.6) + h2) % 1;               /* 0..1 through one bubble's life */
      ox = x0 + (4 + h2 * 8) * P; oy = y0 + (4 + h1 * 8) * P;
      if (u < 0.8) {
        r = (1 + 4 * (u / 0.8)) * P;
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#1a0602";
        ctx.beginPath(); ctx.arc(ox, oy, r + P, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffcf4a";
        ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff3b8";
        ctx.fillRect(ox - r * 0.5, oy - r * 0.5, P, P);
      } else {
        /* pop: a ring flying out */
        r = (5 + 6 * ((u - 0.8) / 0.2)) * P;
        ctx.globalAlpha = 1 - (u - 0.8) / 0.2;
        ctx.strokeStyle = "#ffe48a"; ctx.lineWidth = P;
        ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawWorld() {
    var span = camSpan();
    var vw = span.w, vh = span.h;
    if (D.world && D.world.drawGround) {
      D.world.drawGround(ctx, camX, camY, vw, vh);
      drawWaterFx();
      drawPuddles();
      drawNests();
      drawFronts();
      drawThinIce();
      drawPrints();
      drawScorch();
      drawPatches();
      if (D.attackFx && D.attackFx.drawGround) D.attackFx.drawGround(ctx);
      drawBoltWarns();
      return;
    }
    var cell = (D.sprites && D.sprites.TILE) || 48;
    var x0 = camX - vw / 2 - cell;
    var y0 = camY - vh / 2 - cell;
    var x1 = camX + vw / 2 + cell;
    var y1 = camY + vh / 2 + cell;
    var ix, iy;
    for (ix = Math.floor(x0 / cell); ix <= Math.ceil(x1 / cell); ix++) {
      for (iy = Math.floor(y0 / cell); iy <= Math.ceil(y1 / cell); iy++) {
        D.sprites.drawTile(ctx, ix * cell, iy * cell, 0);
      }
    }
  }

  function draw() {
    if (!ctx) return;
    var glr = D.gl && D.gl.renderer;
    var sx = 0, sy = 0;
    if (run && shake > 0 && !reducedFx) {
      sx = Math.round(rand(-shake, shake));
      sy = Math.round(rand(-shake, shake));
    }
    if (glr && glr.ok && !glr.lost) {
      glr.beginFrame({ zoom: 1, rot: 0, shakeX: 0, shakeY: 0 });
    } else if (ctx.isWebGL) {
      return;
    } else {
      /* No silent Canvas2D fallback on #game. If WebGL is down, skip the frame. */
      return;
    }
    ctx.imageSmoothingEnabled = false;
    try {
    if (state === "brawl" && D.brawl && D.brawl.draw) {
      D.brawl.draw(ctx, viewW, viewH);
      return;
    }
    if (state === "farm" && D.farm && D.farm.draw) {
      D.farm.draw(ctx, viewW, viewH, titleTime);
      if (D.sprites.drawVignette) D.sprites.drawVignette(ctx, viewW, viewH, false, titleTime);
      return;
    }
    var time = run ? run.time : titleTime;
    if (D.sprites.drawParallax) {
      D.sprites.drawParallax(ctx, camX, camY, viewW, viewH, time, reducedFx);
    } else {
      ctx.fillStyle = D.PALETTE.bg0;
      ctx.fillRect(0, 0, viewW, viewH);
    }
    if (!run) {
      if (D.sprites.drawVignette) D.sprites.drawVignette(ctx, viewW, viewH, false, titleTime);
      return;
    }
    ctx.save();
    applyWorldCamera(ctx, camX, camY, sx, sy);
    drawWorld();
    var i, o, e, b, a, w, def, lv, ang, ox, oy, p;
    for (i = 0; i < orbs.length; i++) {
      o = orbs[i];
      if (D.sprites.drawPickup) {
        if (o.kind === "xp" && D.PACING && D.PACING.xpOrbScale) { ctx.save(); ctx.translate(o.x, o.y); ctx.scale(D.PACING.xpOrbScale, D.PACING.xpOrbScale); D.sprites.drawPickup(ctx, o.kind, 0, 0, run.time); ctx.restore(); }
        else D.sprites.drawPickup(ctx, o.kind, o.x, o.y, run.time);
      }
      else if (o.kind === "xp") D.sprites.drawXpOrb(ctx, o.x, o.y, run.time);
      else if (o.kind === "meat") D.sprites.drawMeat(ctx, o.x, o.y, run.time);
      else D.sprites.drawToy(ctx, o.x, o.y, run.time);
    }
    /* Enemies are y-sorted with props and the tamer / partner below. */
    for (i = 0; i < run.weapons.length; i++) {
      w = run.weapons[i];
      def = D.WEAPONS[w.id];
      if (!def) continue;
      lv = def.levels[Math.min(w.level, def.maxLevel) - 1];
      if (def.type === "aura") D.sprites.drawAura(ctx, run.mx, run.my, lv.radius, def.color, run.time, def);
      if (def.type === "orbit") {
        for (ox = 0; ox < lv.count; ox++) {
          /* orbs ride the shared run clock, the same as the sim that makes them hit */
          ang = run.time * (lv.spin || 2.4) + (Math.PI * 2 * ox) / lv.count;
          D.sprites.drawOrbitOrb(ctx, run.mx + Math.cos(ang) * lv.radius, run.my + Math.sin(ang) * lv.radius, lv.size, def.color, run.time, def, run.mx, run.my, ang, lv.radius);
        }
      }
    }
    for (i = 0; i < arcs.length; i++) {
      a = arcs[i];
      var arcX = run.mx, arcY = run.my, oi;
      if (a.ownerId && a.ownerId !== missionLocalId && run.others) {
        for (oi = 0; oi < run.others.length; oi++) if (run.others[oi].id === a.ownerId) { arcX = run.others[oi].mx; arcY = run.others[oi].my; }
      }
      D.sprites.drawArc(ctx, arcX, arcY, a.angle, a.range, a.arc, a.color, a.life / a.max, a);
    }
    for (i = 0; i < bullets.length; i++) {
      b = bullets[i];
      if (b.kind === "nova") D.sprites.drawNova(ctx, b, run.time);
      else D.sprites.drawProjectile(ctx, b, run.time);
    }
    var evoReady = false;
    var evRules = nextEvoRules(), ri, std = null;
    for (ri = 0; ri < evRules.length; ri++) if (evRules[ri].kind !== "neglect") { std = evRules[ri]; break; }
    if (std && evoStatus(std).ready) evoReady = true;
    var monFlash = run.monInvuln > 0 && Math.floor(run.monInvuln / D.PLAYER.invulnFlash) % 2 === 0;
    var tamerFlash = run.tamerInvuln > 0 && Math.floor(run.tamerInvuln / D.PLAYER.invulnFlash) % 2 === 0;
    var scale = 1;
    if (state === "evolution") scale = 1 + (1 - evoTimer / 2.15) * 0.45;
    if (run.feedAnim > 0) scale *= 1.08;
    var slump = (run.faint > 0) ? 0.9 : 1;
    if (run.carry.length) {
      var inFeed = Math.sqrt(dist2(run.x, run.y, run.mx, run.my)) <= D.LEASH.feedRadius;
      ctx.save();
      ctx.strokeStyle = inFeed ? "rgba(124,240,192,0.75)" : "rgba(240,192,48,0.4)";
      ctx.lineWidth = inFeed ? 3 : 2;
      if (!inFeed) ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(run.mx, run.my, D.LEASH.feedRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      if (inFeed) {
        ctx.fillStyle = "rgba(232,248,232,0.95)";
        ctx.font = "bold 13px Trebuchet MS, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("FEED", run.mx, run.my - 48);
      }
      ctx.restore();
    }
    function paintMon() {
      if (isEggForm(run.form) && D.sprites.drawEgg) {
        var tense = run.hatchMax ? (1 - (run.hatchLeft || 0) / run.hatchMax) > 0.65 : false;
        var frameId = (D.SPECIES[run.form] && D.SPECIES[run.form].eggFrame) || "egg_08";
        D.sprites.drawEgg(ctx, frameId, run.mx, run.my, run.time, monFlash && state !== "evolution", tense);
      } else {
        if (run.burstLeft > 0 && run.burstForm) drawBurstAura(ctx, run.mx, run.my, run.burstForm, run.burstStyle, run.time);
        if (run.shiny) D.sprites.setShiny(true);
        D.sprites.drawPartner(ctx, run.burstForm || run.form, run.mx, run.my, run.mfacing || 1, scale * slump, run.time, monFlash && state !== "evolution", run.desperation && run.faint <= 0, run.monMoving && run.faint <= 0);
        D.sprites.setShiny(false);
        if (state === "playing" && run.monMoving && run.faint <= 0 && D.attackFx && D.sprites.footfall && D.sprites.footfall(run.form, run.time, frameStep, 0)) D.attackFx.dust(run.mx, run.my + 2, false);
      }
      var ngl = neglectState();
      if (ngl.tags.length && run.faint <= 0 && D.sprites.drawSweat) {
        D.sprites.drawSweat(ctx, run.mx + 14, run.my - 28, run.time);
      }
      if (run.faint > 0) {
        ctx.fillStyle = "rgba(192,160,255,0.9)";
        ctx.font = "bold 12px Trebuchet MS, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("FAINTED", run.mx, run.my + 10);
      }
      paintMonXp();
    }
    /* A small XP bar riding over the partner's head, so you can watch it
     * creep toward the next level without looking away from the fight. */
    function paintMonXp() {
      if (state === "evolution" || isEggForm(run.form) || !(run.xpNext > 0)) return;
      var h = (D.sprites.ensureHeight && D.sprites.ensureHeight(run.form)) || 40;
      var top = Math.round(run.my + 5 - clamp(h, 26, 84) - 15);
      var w = 34, x0 = Math.round(run.mx - w / 2), r = clamp(run.xp / run.xpNext, 0, 1);
      var ready = pendingLevels > 0;
      /* its health, right under the XP: wider, and it turns from green to
       * amber to red as it empties (this replaced the "Pal" bar in the HUD) */
      var hw = 44, hx = Math.round(run.mx - hw / 2), hy = top + 6, hr = run.maxHp > 0 ? clamp(run.hp / run.maxHp, 0, 1) : 0, hfill = Math.max(hr > 0 ? 1 : 0, Math.round(hw * hr));
      var hcrit = hr < 0.25 || run.faint > 0, hblink = hcrit && (Math.floor(run.time * 6) & 1);
      ctx.fillStyle = hblink ? "rgba(120,16,16,0.95)" : "rgba(8,10,22,0.85)";
      ctx.fillRect(hx - 1, hy - 1, hw + 2, 7);
      ctx.fillStyle = "#3a1418";
      ctx.fillRect(hx, hy, hw, 5);
      if (hpLag == null || hpLag < hr || state !== "playing") hpLag = hr; else hpLag = Math.max(hr, hpLag - 0.012);
      if (hpLag > hr) { ctx.fillStyle = "#ffffff"; ctx.fillRect(hx + hfill, hy, Math.round(hw * hpLag) - hfill, 5); }   /* the chunk just lost */
      ctx.fillStyle = run.faint > 0 ? "#6a5a8a" : (hr > 0.5 ? "#4ad86a" : (hr > 0.25 ? "#f0c030" : "#f04a3a"));
      ctx.fillRect(hx, hy, hfill, 5);
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.fillRect(hx, hy, hfill, 1);
      ctx.fillStyle = "rgba(8,10,22,0.55)";
      ctx.fillRect(hx + Math.round(hw / 4), hy, 1, 5); ctx.fillRect(hx + Math.round(hw / 2), hy, 1, 5); ctx.fillRect(hx + Math.round(hw * 3 / 4), hy, 1, 5);
      ctx.fillStyle = "rgba(8,10,22,0.8)";
      ctx.fillRect(x0 - 1, top - 1, w + 2, 6);
      ctx.fillStyle = "#1c2a44";
      ctx.fillRect(x0, top, w, 4);
      ctx.fillStyle = ready ? "#ffe27a" : "#58d8ff";
      ctx.fillRect(x0, top, Math.max(r > 0 ? 1 : 0, Math.round(w * (ready ? 1 : r))), 4);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillRect(x0, top, Math.max(r > 0 ? 1 : 0, Math.round(w * (ready ? 1 : r))), 1);
      ctx.font = "bold 9px Trebuchet MS, sans-serif";
      ctx.textAlign = "right";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(8,10,22,0.85)";
      ctx.strokeText("Lv" + (run.level || 1), x0 - 3, top + 5);
      ctx.fillStyle = "#e8f4ff";
      ctx.fillText("Lv" + (run.level || 1), x0 - 3, top + 5);
      ctx.textAlign = "left";
    }
    function paintTamer() {
      if (D.sprites.drawTamer) D.sprites.drawTamer(ctx, run.x, run.y, run.facing, run.time, tamerFlash, run.moving, evoReady, run.tdir || "side", run.tamerId, "me");
      if (run.pvpFlag) drawPvpFlag(Math.round(run.x), Math.round(run.y - 66));
      /* the tamer's own (slow) XP bar, in violet so it is not mistaken for the partner's */
      if (state !== "evolution" && run.tamerXpNext > 0 && D.TAMER_LEVEL && !isEggForm(run.form)) {
        var tw = 26, tx0 = Math.round(run.x - tw / 2), ty0 = Math.round(run.y - 50), tr = clamp((run.tamerXp || 0) / run.tamerXpNext, 0, 1), tp = run.statPoints > 0;
        ctx.fillStyle = "rgba(8,10,22,0.8)";
        ctx.fillRect(tx0 - 1, ty0 - 1, tw + 2, 5);
        ctx.fillStyle = "#2a2144";
        ctx.fillRect(tx0, ty0, tw, 3);
        ctx.fillStyle = tp ? "#ffe27a" : "#b48cff";
        ctx.fillRect(tx0, ty0, Math.max(tr > 0 ? 1 : 0, Math.round(tw * (tp ? 1 : tr))), 3);
        ctx.font = "bold 9px Trebuchet MS, sans-serif";
        ctx.textAlign = "right";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(8,10,22,0.85)";
        ctx.strokeText("Lv" + (run.tamerLevel || 1), tx0 - 3, ty0 + 4);
        ctx.fillStyle = "#e6d8ff";
        ctx.fillText("Lv" + (run.tamerLevel || 1), tx0 - 3, ty0 + 4);
        ctx.textAlign = "left";
      }
      for (var ci = 0; ci < run.carry.length; ci++) {
        if (D.sprites.drawPickup) D.sprites.drawPickup(ctx, run.carry[ci], run.x - 12 + ci * 14, run.y - 30, run.time);
      }
    }
    var actors = [], propList, pi;
    function enqueue(yy, zz, fn) { actors.push({ y: yy, z: zz, draw: fn }); }
    nameTags.length = 0;
    if (D.world && D.world.propsInView) {
      propList = D.world.propsInView(camX, camY, camSpan().w, camSpan().h);
      var useNow = usableProp();
      for (pi = 0; pi < propList.length; pi++) {
        (function (pr) {
          enqueue(pr.y, 0, function () {
            var kind = pr.kind, spent = pr.key && D.world.isUsed(pr.key), sway = 0, gy;
            if (spent) kind += "_used";
            var burnSt = pr.tk && D.world.burnState ? D.world.burnState(pr.tk) : 0;
            if (burnSt) kind = (pr.tuft ? "tallgrass" : "meadow") + (burnSt === 1 ? "_burnt" : "_sprout");
            if (pr.grass && !burnSt) {
              /* tall grass rustles round whoever is wading through it */
              gy = pr.y - run.y;
              if (Math.abs(pr.x - run.x) < 30 && gy > -6 && gy < 34) sway = Math.sin(run.time * 22 + pr.x) * 1.6;
              gy = pr.y - run.my;
              if (!sway && Math.abs(pr.x - run.mx) < 30 && gy > -6 && gy < 34) sway = Math.sin(run.time * 22 + pr.x) * 1.6;
            }
            var fall = pr.fk && D.world.fallOf ? D.world.fallOf(pr.fk) : null;
            if (fall) { drawFallen(pr, kind, fall); return; }
            if (D.sprites.drawProp) D.sprites.drawProp(ctx, kind, pr.x + sway, pr.y);
            else D.sprites.drawDecor(ctx, pr.x, pr.y, kind);
            if (pr.kind === "spire" && !spent) {
              ctx.save();
              ctx.globalCompositeOperation = "lighter";
              ctx.globalAlpha = 0.22 + Math.sin(run.time * 3 + pr.x) * 0.1;
              ctx.fillStyle = "#b048f0";
              ctx.beginPath(); ctx.ellipse(pr.x, pr.y - 62, 15, 36, 0, 0, Math.PI * 2); ctx.fill();
              ctx.restore();
            }
            if (useNow && pr.key === useNow.key) {
              var label = (kh("interact") ? kh("interact").slice(1) + " " : "") + (pr.kind === "spire" ? "Break the spire" : "Open");
              ctx.save();
              ctx.font = "bold 13px Trebuchet MS, sans-serif"; ctx.textAlign = "center"; ctx.lineWidth = 3;
              ctx.strokeStyle = "rgba(8,10,24,0.9)"; ctx.fillStyle = pr.kind === "spire" ? "#e2b0ff" : "#b8ffe4";
              gy = pr.y - (pr.kind === "spire" ? 108 : 34);
              ctx.strokeText(label, pr.x, gy); ctx.fillText(label, pr.x, gy);
              ctx.restore();
            }
          });
        })(propList[pi]);
      }
    }
    for (i = 0; i < enemies.length; i++) {
      (function (en) {
        enqueue(en.y, 1, function () {
          /* bosses are drawn bigger than the rank and file so they read at a glance */
          var bigMul = en.lord ? BOSS_LOOK.lordScale : (en.mega ? BOSS_LOOK.megaScale : (en.boss ? BOSS_LOOK.bossScale : 1));
          if (en.nem) bigMul *= en.nemScale || 1;                                     /* a nemesis grows with every title */
          var pk = D.hitFx ? D.hitFx.punchOf(en._id) : null;
          if (pk) {
            /* just hit: squashed, and leaning away from the blow (pivot at its feet) */
            ctx.save();
            ctx.translate(en.x + pk.ox, en.y + pk.oy);
            ctx.scale(1 + 0.16 * pk.k, 1 - 0.13 * pk.k);
            ctx.translate(-en.x, -en.y);
            D.sprites.drawEnemy(ctx, en.type, en.x, en.y, run.time, en.flash > 0 || pk.k > 0.45, en.facing, bigMul, en._id, undefined, en.virus ? "virus" : null);
            ctx.restore();
          } else D.sprites.drawEnemy(ctx, en.type, en.x, en.y, run.time, en.flash > 0, en.facing, bigMul, en._id, undefined, en.virus ? "virus" : null);
          if (en.virus) drawVirusMark(en);
          if (en.zz) drawZzz(en);
          if (en.war) drawWarBanner(en);
          if (en.fac && (en.rally != null || trustsFac(en.fac))) drawFriendMark(en);
          if (en.alv > 1) drawAllyLevel(en);
          if (en.nem) drawNemesis(en);
          /* dust where feet land: every step for bosses, now and then for the pack */
          if (D.attackFx && D.sprites.footfall && !(D.ENEMIES[en.type] && D.ENEMIES[en.type].fly) && (bigMul > 1 || en._id % 3 === 0) &&
              D.sprites.footfall(en.type, run.time, frameStep, en._id)) D.attackFx.dust(en.x, en.y + 2, bigMul > 1);
          if (en.rival) {
            /* the rival's partner: a pink ring under it, whose it is and its job level over it, its health */
            ctx.save();
            var rvI = run.rival || {}, rvHot = rvI.state === "fight";
            ctx.globalAlpha = (rvHot ? 0.75 : 0.45) + Math.sin(run.time * (rvHot ? 9 : 4)) * 0.2; ctx.strokeStyle = "#ff5aa8"; ctx.lineWidth = rvHot ? 3 : 2;
            ctx.beginPath(); ctx.ellipse(en.x, en.y - 2, en.radius + 9, (en.radius + 9) * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = 1;
            var rvTop = Math.round(en.y - en.radius * 2 - 30), rvText = "RIVAL  Lv " + (rvI.level || 1);
            ctx.font = "bold 12px Trebuchet MS, sans-serif"; ctx.textAlign = "center"; ctx.lineWidth = 3;
            ctx.strokeStyle = "rgba(20,6,16,0.9)"; ctx.fillStyle = "#ff9ad0";
            ctx.strokeText(rvText, en.x, rvTop); ctx.fillText(rvText, en.x, rvTop);
            ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.fillRect(Math.round(en.x - 21), rvTop + 4, 42, 5);
            ctx.fillStyle = "#ff5aa8"; ctx.fillRect(Math.round(en.x - 21), rvTop + 4, Math.round(42 * clamp(en.hp / Math.max(1, en.maxHp), 0, 1)), 5);
            ctx.restore();
          }
          var barW = en.mega ? 42 : (en.boss ? 34 : 24);
          var barH = en.mega ? 6 : (en.boss ? 5 : 4);
          var barY = Math.round(en.y - en.radius * (en.boss && !en.mega ? 1.25 : 1) - (en.mega ? 22 : (en.boss ? 20 : 14)));
          var barX = Math.round(en.x - barW / 2);
          if (en.st) drawEnemyStatus(en, barX, barY);
          if (en.lv && !en.rival && D.LEVELS) drawEnemyLevel(en, barX, barY, barH);
          if (!en.rival && (en.mega || en.boss || en.virus || (en.maxHp > 0 && en.hp < en.maxHp))) {
            ctx.fillStyle = "rgba(0,0,0,0.65)";
            ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = en.virus ? "#b05cff" : (en.mega ? "#ffb040" : (en.boss ? "#ff7a3a" : "#e05050"));
            ctx.fillRect(barX, barY, Math.round(barW * clamp(en.hp / en.maxHp, 0, 1)), barH);
          }
          if (en.mega) {
            var pulse = 0.72 + Math.sin(run.time * 6) * 0.28;
            ctx.save();
            ctx.globalAlpha = pulse;
            ctx.strokeStyle = "#ffb040";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(en.x, en.y - 4, en.radius + 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = "#ffb040";
            ctx.font = "bold 12px Trebuchet MS, sans-serif";
            ctx.textAlign = "center";
            ctx.lineWidth = 3;
            ctx.strokeStyle = "rgba(10,8,20,0.8)";
            var megaLabel = "MEGA  " + (((D.ENEMIES[en.type] && D.ENEMIES[en.type].name) || (D.SPECIES[en.type] && D.SPECIES[en.type].name) || en.type));
            ctx.strokeText(megaLabel, en.x, barY - 6);
            ctx.fillText(megaLabel, en.x, barY - 6);
            ctx.restore();
          }
          if (en.lord) {
            ctx.save();
            ctx.fillStyle = "#ffe27a"; ctx.font = "bold 13px Trebuchet MS, sans-serif"; ctx.textAlign = "center"; ctx.lineWidth = 3; ctx.strokeStyle = "rgba(10,8,20,0.85)";
            var lordLabel = "LORD  " + ((D.ENEMIES[en.type] && D.ENEMIES[en.type].name) || (D.SPECIES[en.type] && D.SPECIES[en.type].name) || en.type);
            ctx.strokeText(lordLabel, en.x, en.y - en.radius * 2.4 - 22);
            ctx.fillText(lordLabel, en.x, en.y - en.radius * 2.4 - 22);
            ctx.restore();
          }
          if (isCatchableMark(en)) {
            var cPulse = 0.65 + Math.sin(run.time * 8) * 0.35;
            ctx.save();
            ctx.globalAlpha = cPulse;
            ctx.strokeStyle = "#6ad0ff";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 3]);
            ctx.beginPath();
            ctx.arc(en.x, en.y - 2, en.radius + 14, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = "#6ad0ff";
            ctx.font = "bold 11px Trebuchet MS, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("CATCH", en.x, en.y + en.radius + 16);
            ctx.restore();
          }
        });
      })(enemies[i]);
    }
    enqueue(run.my, 2, paintMon);
    enqueue(run.y, 2, paintTamer);
    if (run.rival && run.rival.eid != null) enqueue(run.rival.ty, 2, drawRivalTamer);
    if (run.ally) {
      enqueue(run.ally.y, 2, function () {
        var flash = run.ally.invuln > 0 && Math.floor(run.ally.invuln / D.PLAYER.invulnFlash) % 2 === 0;
        if (D.sprites.drawPartner) {
          D.sprites.drawPartner(ctx, run.ally.form, run.ally.x, run.ally.y, run.ally.facing || 1, 1, run.time, flash, false, run.ally.moving);
        }
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(Math.round(run.ally.x - 12), Math.round(run.ally.y + 6), 24, 4);
        ctx.fillStyle = "#6ad0ff";
        ctx.fillRect(Math.round(run.ally.x - 12), Math.round(run.ally.y + 6), Math.round(24 * clamp(run.ally.hp / run.ally.maxHp, 0, 1)), 4);
        ctx.fillStyle = "rgba(106,208,255,0.95)";
        ctx.font = "bold 11px Trebuchet MS, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("ALLY", run.ally.x, run.ally.y + 18);
      });
    }
    (run.cpuMates || []).forEach(function (cm) {
      if (!cm || cm.hp <= 0) return;
      enqueue(cm.y, 2, function () {
        var flash = cm.invuln > 0 && Math.floor(cm.invuln / ((D.PLAYER && D.PLAYER.invulnFlash) || 0.1)) % 2 === 0;
        if (D.sprites && D.sprites.drawPartner) {
          D.sprites.drawPartner(ctx, cm.form, cm.x, cm.y, cm.facing || 1, 1, run.time, flash, false, cm.moving);
        }
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(Math.round(cm.x - 12), Math.round(cm.y + 6), 24, 4);
        ctx.fillStyle = cm.color || "#e060b0";
        ctx.fillRect(Math.round(cm.x - 12), Math.round(cm.y + 6), Math.round(24 * clamp(cm.hp / cm.maxHp, 0, 1)), 4);
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.font = "bold 11px Trebuchet MS, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(cm.name || formNameSafe(cm.form), cm.x, cm.y + 18);
      });
    });
    /* Other players' tamers and partners (online). */
    (run.others || []).forEach(function (o) {
      if (!o || o.form == null) return;
      var info = (D.online && D.online.playerInfo && D.online.playerInfo(o.id)) || {};
      var col = info.color || "#6ad0ff";
      if (D.sprites && D.sprites.preloadSpecies && !seenEnemyTypes["o:" + o.form]) { seenEnemyTypes["o:" + o.form] = true; D.sprites.preloadSpecies(o.form, true); }
      enqueue(o.my, 2, function () {
        var mFlash = o.monInvuln > 0 && Math.floor(o.monInvuln / D.PLAYER.invulnFlash) % 2 === 0;
        if (isEggForm(o.form) && D.sprites.drawEgg) {
          D.sprites.drawEgg(ctx, (D.SPECIES[o.form] && D.SPECIES[o.form].eggFrame) || "egg_08", o.mx, o.my, run.time + 0.37, false, (o.hatchLeft || 0) < 6);
        } else if (D.sprites.drawPartner) {
          if (o.burstForm) drawBurstAura(ctx, o.mx, o.my, o.burstForm, o.burstStyle, run.time);
          if (o.shiny) D.sprites.setShiny(true);
          D.sprites.drawPartner(ctx, o.burstForm || o.form, o.mx, o.my, o.mfacing || 1, o.faint > 0 ? 0.9 : 1, run.time, mFlash, false, o.monMoving && !(o.faint > 0));
          D.sprites.setShiny(false);
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.fillRect(Math.round(o.mx - 12), Math.round(o.my + 6), 24, 4);
          ctx.fillStyle = col;
          ctx.fillRect(Math.round(o.mx - 12), Math.round(o.my + 6), Math.round(24 * clamp((o.hp || 0) / (o.maxHp || 1), 0, 1)), 4);
          if (pvpFoe(o)) drawPvpMark(o);
          if (o.bounty) drawBounty(o);
        }
        if (o.faint > 0 || o.downed) {
          ctx.fillStyle = "rgba(192,160,255,0.9)";
          ctx.font = "bold 11px Trebuchet MS, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(o.downed ? "DOWN" : "FAINTED", o.mx, o.my + 20);
        }
      });
      if (o.hasTamer === false) return;
      enqueue(o.y, 2, function () {
        var tFlash = o.tamerInvuln > 0 && Math.floor(o.tamerInvuln / D.PLAYER.invulnFlash) % 2 === 0;
        ctx.save();
        if (D.sprites.drawTamer) D.sprites.drawTamer(ctx, o.x, o.y, o.facing || 1, run.time, tFlash, o.moving && !o.downed, false, o.tdir || "side", info.tamerId || "junior", "ot" + o.id);
        ctx.restore();
        if (o.pvpFlag) drawPvpFlag(Math.round(o.x), Math.round(o.y - 66));
        /* their profile name under them (drawn over grass and all: drawNameTags) */
        nameTags.push({ x: o.x, y: o.y, label: info.name || "Tamer", col: col });
      });
    });
    if (run.merchant) {
      enqueue(run.merchant.y, 2, function () {
        /* Jijimon stands at 5/6 of the tamer's height on the field. */
        var mForm = run.merchant.form || "jijimon";
        var mTargetH = Math.round(56 * ((D.SHOP && D.SHOP.merchantHeightRatio) || 5 / 6));
        var mNativeH = (D.sprites.visualHeight && D.sprites.visualHeight(mForm)) || mTargetH;
        var mMul = mNativeH > 0 ? mTargetH / mNativeH : 1;
        if (D.sprites.drawPartner) {
          ctx.save();
          ctx.translate(Math.round(run.merchant.x), Math.round(run.merchant.y));
          ctx.scale(mMul, mMul);
          D.sprites.drawPartner(ctx, mForm, 0, 0, 1, 1, run.time, false, false, false);
          ctx.restore();
        }
        ctx.fillStyle = "rgba(255,224,128,0.95)";
        ctx.font = "bold 13px Trebuchet MS, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("SHOP", run.merchant.x, run.merchant.y - mTargetH - 12);
        if (merchantInRange()) ctx.fillText("Q / tap Shop", run.merchant.x, run.merchant.y - mTargetH + 2);
      });
    }
    actors.sort(function (a, b) { return a.y === b.y ? a.z - b.z : a.y - b.y; });
    for (i = 0; i < actors.length; i++) actors[i].draw();
    if (run.captureFx) {
      var cf = run.captureFx;
      var u = 1 - Math.max(0, Math.min(cf.t, 0.85)) / 0.85;
      ctx.save();
      ctx.globalAlpha = 1 - u;
      ctx.strokeStyle = cf.ok ? "#6ad0ff" : "#ff8080";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cf.x, cf.y, 18 + u * 28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = cf.ok ? "rgba(106,208,255,0.45)" : "rgba(255,128,128,0.45)";
      ctx.beginPath();
      ctx.arc(cf.x, cf.y, 8 + u * 46, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = cf.ok ? "#6ad0ff" : "#ff8080";
      ctx.font = "bold 16px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(cf.ok ? "CAPTURED!" : "BROKE FREE!", cf.x, cf.y - 62);
      ctx.restore();
    }
    drawFocusMarker();
    drawGoMarker();
    drawAim();
    for (i = 0; i < particles.length; i++) pDraw(particles[i]);
    if (D.attackFx) D.attackFx.draw(ctx);
    drawBolts();
    drawLevelFx();
    if (D.hitFx) D.hitFx.draw(ctx);
    drawNameTags();
    for (i = 0; i < floats.length; i++) {
      var f = floats[i];
      var pop = 1 + Math.sin(Math.min(1, f.pop / 0.12) * Math.PI) * 0.28;
      ctx.globalAlpha = clamp(f.life / 0.25, 0, 1);
      ctx.fillStyle = f.color;
      ctx.font = "bold " + Math.round(14 * pop) + "px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(10,8,20,0.7)";
      ctx.lineWidth = 3;
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (run && state !== "farm" && state !== "title") drawSeasonFx();
    if (D.weather && run && run.weather && state === "playing") {
      D.weather.draw(ctx, viewW, viewH, run, time, reducedFx);
    }
    if (D.hitFx && run && state !== "title") D.hitFx.drawScreen(ctx, viewW, viewH);
    if (D.sprites.drawVignette) D.sprites.drawVignette(ctx, viewW, viewH, !!(run && run.desperation && state !== "title"), time);
    if (evoFlash > 0) {
      ctx.fillStyle = "rgba(255,248,220," + (evoFlash * 0.65).toFixed(3) + ")";
      ctx.fillRect(0, 0, viewW, viewH);
    }
    } finally {
      if (glr && glr.ok && !glr.lost) glr.endFrame();
    }
  }

  function pDraw(p) {
    var a = clamp(p.life / p.max, 0, 1);
    ctx.save();
    if (p.additive && !reducedFx) ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;
    if (p.type === "ripple") {
      ctx.globalAlpha = a * 0.75; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size, p.size * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (p.type === "ring") {
      ctx.globalAlpha = a * 0.7;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.type === "glow" || p.type === "trail") {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      var s = Math.max(2, Math.round(p.size));
      ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
    }
    ctx.restore();
  }

  function setBar(node, ratio, pulse, low) {
    if (!node) return;
    var i = node.querySelector("i");
    if (i) i.style.width = (clamp(ratio, 0, 1) * 100).toFixed(1) + "%";
    node.classList.toggle("is-pulse", !!pulse);
    node.classList.toggle("is-low", !!low);
  }

  function setHpReadout(numId, bar, cur, max, critical) {
    var n = $(numId);
    var c = Math.max(0, Math.round(cur || 0));
    var m = Math.max(0, Math.round(max || 0));
    if (n) n.textContent = c + "/" + m;
    if (bar) bar.classList.toggle("is-critical", !!critical);
  }

  function updateHudRevive() {
    var prompt = $("revive-prompt");
    var fill = $("revive-bar-fill");
    var label = $("revive-label");
    var btn = $("btn-revive");
    var R = D.partyRules;
    var held = D.input && D.input.isInteractHeld && D.input.isInteractHeld();
    var ctx = partyCtx();
    var eligible = false, text = "Hold to revive", progress = 0;
    if (run && R && state === "playing") {
      var reviver = { id: "local", x: run.x, y: run.y, mx: run.mx, my: run.my, tamerHp: run.tamerHp, tamerMaxHp: run.tamerMaxHp, hp: run.hp, maxHp: run.maxHp, faint: run.faint, downed: run.downed, hasTamer: true, form: run.form, ref: run };
      if (R.soloSelfReviveEligible(reviver, ctx, D)) {
        eligible = true;
        text = "Hold to revive";
      } else if (R.isPartyMode(ctx)) {
        var tgt = R.pickTeammateTarget(reviver, ctx, D);
        if (tgt && R.teammateReviveEligible(reviver, tgt, ctx, D)) {
          eligible = true;
          text = "Hold to revive " + ((tgt.ref && tgt.ref.name) || tgt.form || "teammate");
        }
      }
      if (run.reviveHold && run.reviveHold.t != null) {
        var need = (R.cfg({ data: D }).hold) || 3;
        progress = Math.min(1, (run.reviveHold.t || 0) / need);
      } else if (reviveUi && reviveUi.progress) progress = reviveUi.progress;
      if (reviveUi && reviveUi.prompt) text = reviveUi.prompt;
      /* Online: pick a downed friend back up (the host counts the hold). */
      var netRev = online() && online().reviveUi && online().reviveUi();
      if (netRev) { eligible = true; text = netRev.text; progress = netRev.progress; }
    }
    if (D.input && D.input.setReviveHoldEligible) D.input.setReviveHoldEligible(eligible);
    if (prompt) {
      prompt.hidden = !eligible;
      if (label) label.textContent = text;
      if (fill) fill.style.width = (progress * 100).toFixed(1) + "%";
    }
    if (btn) {
      var touch = D.input && (D.input.touchMode || (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0));
      btn.hidden = !(eligible && touch);
    }
  }

  /* ---------- Seasons ---------- */
  var seasonFlash = 0;
  function seasonTime() {
    if (!run) return 0;
    if (missionAuth && missionAuth.sim) return missionAuth.sim.time || 0;
    return run.time || 0;
  }
  function updateSeason() {
    if (!run || !D.seasons) return null;
    var si = D.seasons.info(seasonTime());
    if (D.world && D.world.setSeason) D.world.setSeason(si.id);
    if (D.world && D.world.setTime) D.world.setTime(seasonTime());
    if (run.seasonIdx == null) {
      run.seasonIdx = si.index;
    } else if (si.index !== run.seasonIdx) {
      run.seasonIdx = si.index;
      seasonFlash = 1;
      showNoticeToast("Year " + si.year + " — " + si.label + "! Enemies grow stronger" + (si.id === "winter" ? " · the rivers are freezing over" : (si.id === "spring" && si.index > 0 ? " · the ice is breaking up" : "")), "is-season is-" + si.id);
      sfx("level");
      if (el.hudSeason) {
        el.hudSeason.classList.remove("is-new");
        void el.hudSeason.offsetWidth;
        el.hudSeason.classList.add("is-new");
      }
    }
    if (el.hudSeason) {
      if (el.hudSeason.dataset.season !== si.id) el.hudSeason.dataset.season = si.id;
      if (el.hudSeasonYear) el.hudSeasonYear.textContent = "Year " + si.year;
      var dnow = D.seasons.dayInfo ? D.seasons.dayInfo(seasonTime()) : null;
      if (el.hudSeasonName) el.hudSeasonName.textContent = si.label + (dnow && dnow.id !== "day" ? " \u00b7 " + dnow.label : "");
      if (dnow && el.hudSeason.dataset.day !== dnow.id) el.hudSeason.dataset.day = dnow.id;
      if (dnow && state === "playing") {
        if (dnow.id === "night" && !run.nightOn) { run.nightOn = true; if (!isEggForm(run.form)) { showNoticeToast("Night falls. Wild Digimon grow restless: faster, and quicker to notice you.", "is-night"); noticeToastTimer = 4; } }
        else if (dnow.id !== "night" && run.nightOn) { run.nightOn = false; showNoticeToast("Daybreak.", "is-dawn"); noticeToastTimer = 2.5; }
      }
      el.hudSeason.style.setProperty("--season-progress", (si.progress * 100).toFixed(1) + "%");
      el.hudSeason.title = si.label + " ends in " + formatTime(si.left);
    }
    return si;
  }
  /* Day and night (seasons.js dayInfo): a warm wash at dusk, a deep blue
   * one after dark, a pale one at dawn. After dark the hologram, the
   * partner and anything burning throw a little light of their own. */
  function toScreen(x, y) {
    var z = camZoom();
    return { x: (x - camX) * z + viewW / 2, y: (y - camY) * z + viewH / 2, z: z };
  }
  /* A soft pool of light. It used to be 4-8 stacked translucent ellipses per light, painted
   * every frame; with a field of burning grass at night that was a lot of overdraw. Now each
   * colour is baked once into a small radial-gradient sprite (uploaded once, Nov 21) and a
   * light is a single quad. Same look: bright core to about a fifth, fading to the edge. */
  var glowSprites = {};
  function glowSprite(col) {
    var c = glowSprites[col], g, gr;
    if (c) return c;
    c = document.createElement("canvas"); c.width = c.height = 64;
    g = c.getContext("2d");
    gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, col); gr.addColorStop(0.22, col);
    gr.addColorStop(0.6, D.seasons && D.seasons.rgba ? D.seasons.rgba(g, col, 0.45) : col);
    gr.addColorStop(1, D.seasons && D.seasons.rgba ? D.seasons.rgba(g, col, 0) : "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (glowSprites[col] = c);
  }
  function glow(x, y, r, col, a) {
    var p = toScreen(x, y), rr = r * p.z;
    if (p.x + rr < 0 || p.x - rr > viewW || p.y + rr < 0 || p.y - rr > viewH) return;
    ctx.globalAlpha = Math.min(1, a * 0.8);
    ctx.drawImage(glowSprite(col), p.x - rr, p.y - rr * 0.8, rr * 2, rr * 1.6);
  }
  function drawDayNight() {
    if (!D.seasons.dayInfo) return;
    var d = D.seasons.dayInfo(seasonTime()), i, q, fl;
    ctx.save();
    ctx.globalAlpha = 1;
    if (d.dusk > 0.01) { ctx.fillStyle = D.seasons.rgba(ctx, "#ff7a2a", 0.14 * d.dusk); ctx.fillRect(0, 0, viewW, viewH); }
    if (d.dawn > 0.01) { ctx.fillStyle = D.seasons.rgba(ctx, "#ffb4c8", 0.10 * d.dawn); ctx.fillRect(0, 0, viewW, viewH); }
    if (d.dark > 0.01) {
      ctx.fillStyle = D.seasons.rgba(ctx, "#050a2a", 0.46 * d.dark); ctx.fillRect(0, 0, viewW, viewH);
      if (!reducedFx) {
        ctx.globalCompositeOperation = "lighter";
        ctx.imageSmoothingEnabled = true;
        glow(run.x, run.y - 22, 120, "#2a6a8a", 0.5 * d.dark);
        if (!run.faint) glow(run.mx, run.my - 14, 95, "#6a5030", 0.45 * d.dark);
        /* the nearest dozen fires light the dark; past that more glow adds nothing you'd see */
        var lit = 0;
        for (i = 0; i < patches.length && lit < 12; i++) {
          q = patches[i]; if (q.kind !== "fire") continue;
          if (Math.abs(q.x - camX) > viewW || Math.abs(q.y - camY) > viewH) continue;
          fl = 0.8 + Math.sin(run.time * 11 + q.id) * 0.2;
          glow(q.x, q.y - 6, q.r * 2.4, "#a84a10", 0.6 * d.dark * fl * Math.min(1, q.t / 0.6));
          lit++;
        }
      }
    }
    ctx.restore();
    if (skyFlash > 0) {
      ctx.save(); ctx.globalAlpha = 1;
      ctx.fillStyle = D.seasons.rgba(ctx, "#e6f0ff", 0.55 * skyFlash);
      ctx.fillRect(0, 0, viewW, viewH);
      ctx.restore();
    }
  }
  /* which piece of music fits this moment (audio.js) */
  var musicBossT = 0;
  function tickMusic(dt) {
    if (!D.audio) return;
    var sc = null, amb = 0, i, e, big = false, t, wid, si, dn;
    if (state === "title" || state === "tamer" || state === "setup" || state === "egg" || state === "lobby" || state === "join" || state === "bank" || state === "cosmetics" || state === "lab" || state === "hatchery") sc = "title";
    else if (state === "farm") sc = "farm";
    else if (state === "brawl") sc = "boss";
    else if (state === "gameover" || !run) sc = null;
    else {
      for (i = 0; i < enemies.length; i++) { e = enemies[i]; if (!e.dead && (e.boss || e.mega || (e.lord && e.hp < e.maxHp))) { big = true; break; } }
      if (run.rival && run.rival.state === "fight") big = true;
      if (big) musicBossT = 3; else if (musicBossT > 0) musicBossT -= dt;
      t = seasonTime();
      wid = run.weather && D.weather ? D.weather.canonicalId(run.weather.id) : "clear";
      if (musicBossT > 0) sc = "boss";
      else if (wid === "eclipse") sc = "eclipse";
      else if (D.seasons && D.seasons.dayInfo) { si = D.seasons.info(t); dn = D.seasons.dayInfo(t); sc = si.id + (dn.dark > 0.5 ? "_night" : ""); }
      if (D.weather && D.weather.wetness && run.weather) amb = D.weather.wetness(run);
    }
    D.audio.setScene(sc);
    D.audio.setAmbience("rain", state === "playing" || state === "paused" || state === "levelup" ? amb : 0);
  }
  var ambientLast = 0;
  function drawSeasonFx() {
    if (!run || !D.seasons || !D.world) return;
    var now = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
    var realDt = ambientLast ? Math.min(0.25, now - ambientLast) : 0;
    var dt = Math.min(0.05, realDt);
    ambientLast = now;
    if (state !== "playing") dt = 0;
    var sid = D.world.season;
    D.seasons.drawGrade(ctx, viewW, viewH, sid);
    drawDayNight();
    D.seasons.drawAmbient(ctx, viewW, viewH, sid, dt, reducedFx);
    if (seasonFlash > 0) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = D.seasons.rgba(ctx, "#ffffff", seasonFlash * 0.55);
      ctx.fillRect(0, 0, viewW, viewH);
      seasonFlash = Math.max(0, seasonFlash - realDt * 1.2);
    }
  }

  /* ---------- Minimap ---------- */
  var MINI = {
    range: 1050,          /* world px from the tamer to the map edge */
    every: 0.066,
    last: 0,
    matCache: {},
    matCount: 0,
    terrain: null,
    tCenter: null,
    tSeason: null,
    events: {}
  };
  var MINI_GROUND = {
    spring: ["#4f8a3a", "#8a6840", "#2a8a98", "#6e8a4c"],
    summer: ["#6f9a3a", "#a08050", "#2aa0b0", "#8a9a50"],
    fall:   ["#a8702c", "#7a5434", "#2a6a78", "#b0783a"],
    winter: ["#dfe9ef", "#a9b4bd", "#9fd0e2", "#f0f6fa"]
  };
  function miniMat(tx, ty) {
    var k = tx + "," + ty;
    var v = MINI.matCache[k];
    if (v !== undefined) return v;
    v = (D.world && D.world.materialAt) ? D.world.materialAt(tx, ty) : 0;
    if (MINI.matCount > 60000) { MINI.matCache = {}; MINI.matCount = 0; }
    MINI.matCache[k] = v;
    MINI.matCount += 1;
    return v;
  }
  function miniTerrain(ctrTx, ctrTy, halfTiles, season) {
    var key = ctrTx + "," + ctrTy;
    var tv = D.world.territoryVersion ? D.world.territoryVersion() : 0;
    if (MINI.terrain && MINI.tCenter === key && MINI.tSeason === season && MINI.tTerr === tv) return MINI.terrain;
    MINI.tTerr = tv;
    var size = halfTiles * 2 + 1;
    var c = MINI.terrain || document.createElement("canvas");
    if (c.width !== size) { c.width = size; c.height = size; }
    var g = c.getContext("2d");
    var img = g.createImageData(size, size);
    var pal = MINI_GROUND[season] || MINI_GROUND.spring;
    var rgb = pal.map(function (h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; });
    var x, y, m, col, i, bid, bcol, BD = D.biomes && D.biomes.DEFS;
    for (y = 0; y < size; y++) {
      for (x = 0; x < size; x++) {
        m = miniMat(ctrTx - halfTiles + x, ctrTy - halfTiles + y);
        col = rgb[m] || rgb[0];
        /* each biome has its own colours on the map; the green ones still follow the season */
        bid = D.world.biomeIdAt ? D.world.biomeIdAt(ctrTx - halfTiles + x, ctrTy - halfTiles + y) : "plains";
        if (bid !== "plains" && BD && BD[bid] && !(BD[bid].seasonal && season === "winter")) {
          bcol = BD[bid].mini[m] || BD[bid].mini[0];
          col = [parseInt(bcol.substr(1, 2), 16), parseInt(bcol.substr(3, 2), 16), parseInt(bcol.substr(5, 2), 16)];
        }
        i = (y * size + x) * 4;
        img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    MINI.terrain = c;
    MINI.tCenter = key;
    MINI.tSeason = season;
    return c;
  }
  function drawMinimap(force) {
    var cv = el.minimap;
    if (!cv || !run) return;
    var now = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
    if (!force && now - MINI.last < MINI.every) return;
    MINI.last = now;
    var g = cv.getContext("2d");
    var W = cv.width, H = cv.height, cxm = W / 2, cym = H / 2;
    var R = MINI.range, k = (W / 2) / R;
    var ox = run.x, oy = run.y;
    var TILE = (D.sprites && D.sprites.TILE) || 48;
    var season = (D.world && D.world.season) || "spring";
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, H);
    /* Terrain: one pixel per tile, scaled up and offset for smooth scroll. */
    var halfTiles = Math.ceil(R / TILE) + 1;
    var ctrTx = Math.floor(ox / TILE), ctrTy = Math.floor(oy / TILE);
    var terr = miniTerrain(ctrTx, ctrTy, halfTiles, season);
    var tpx = TILE * k;
    var tx0 = cxm + ((ctrTx - halfTiles) * TILE - ox) * k;
    var ty0 = cym + ((ctrTy - halfTiles) * TILE - oy) * k;
    g.globalAlpha = 0.9;
    g.drawImage(terr, Math.round(tx0), Math.round(ty0), Math.round(terr.width * tpx), Math.round(terr.height * tpx));
    g.globalAlpha = 1;
    /* View rectangle */
    var span = camSpan();
    g.strokeStyle = "rgba(255,255,255,0.35)";
    g.lineWidth = 1;
    g.strokeRect(Math.round(cxm + (camX - span.w / 2 - ox) * k) + 0.5, Math.round(cym + (camY - span.h / 2 - oy) * k) + 0.5, Math.round(span.w * k), Math.round(span.h * k));

    function pos(x, y) { return { x: cxm + (x - ox) * k, y: cym + (y - oy) * k }; }
    function inside(p, m) { return p.x >= m && p.y >= m && p.x <= W - m && p.y <= H - m; }
    function edge(p, m) {
      /* Clamp an off-map marker onto the border along its bearing. */
      var dx = p.x - cxm, dy = p.y - cym;
      var s = Math.max(Math.abs(dx) / (cxm - m), Math.abs(dy) / (cym - m), 1);
      return { x: cxm + dx / s, y: cym + dy / s, clamped: s > 1 };
    }
    function dot(p, r, col, ring) {
      g.fillStyle = col;
      g.beginPath(); g.arc(p.x, p.y, r, 0, Math.PI * 2); g.fill();
      if (ring) { g.strokeStyle = ring; g.lineWidth = 1.5; g.stroke(); }
    }
    function diamond(p, r, col, ring) {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(p.x, p.y - r); g.lineTo(p.x + r, p.y); g.lineTo(p.x, p.y + r); g.lineTo(p.x - r, p.y);
      g.closePath(); g.fill();
      if (ring) { g.strokeStyle = ring; g.lineWidth = 1.5; g.stroke(); }
    }
    function square(p, r, col, ring) {
      g.fillStyle = col;
      g.fillRect(Math.round(p.x - r), Math.round(p.y - r), r * 2, r * 2);
      if (ring) { g.strokeStyle = ring; g.lineWidth = 1.5; g.strokeRect(Math.round(p.x - r) + 0.5, Math.round(p.y - r) + 0.5, r * 2 - 1, r * 2 - 1); }
    }
    var pulse = 0.5 + 0.5 * Math.sin(now * 6);
    var i, p, e, o, def, big = [];

    /* Regular enemies: faint red specks. */
    g.fillStyle = "rgba(255,90,90,0.7)";
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i];
      if (!e || e.dead) continue;
      def = D.ENEMIES[e.type];
      if (e.mega || e.boss || (def && def.boss)) { big.push(e); continue; }
      p = pos(e.x, e.y);
      if (inside(p, 1)) g.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 2, 2);
    }
    /* Drops */
    for (i = 0; i < orbs.length; i++) {
      o = orbs[i];
      if (o.kind === "xp" || o.kind === "bits") continue;
      p = pos(o.x, o.y);
      if (!inside(p, 2)) continue;
      if (o.kind === "heal") square(p, 2, "#7cf0c0");
      else if (D.FOOD && D.FOOD[o.kind]) square(p, 2, D.FOOD[o.kind].color || "#e85a4a");
      else if (D.isSeed && D.isSeed(o.kind)) square(p, 2, "#c8e070");
      else square(p, 2, "#ffb0e0");
    }
    /* Custom events (D.minimap.mark) */
    var id, ev;
    for (id in MINI.events) {
      if (!Object.prototype.hasOwnProperty.call(MINI.events, id)) continue;
      ev = MINI.events[id];
      p = edge(pos(ev.x, ev.y), 6);
      g.globalAlpha = p.clamped ? 0.75 + 0.25 * pulse : 1;
      diamond(p, 5, ev.color || "#c080ff", "#1a1024");
      g.globalAlpha = 1;
    }
    /* Jijimon's shop */
    if (run.merchant) {
      p = edge(pos(run.merchant.x, run.merchant.y), 6);
      square(p, 4, "#ffd040", "#3a2400");
      g.fillStyle = "#3a2400"; g.font = "bold 8px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText("$", p.x, p.y + 0.5);
    }
    /* Teammates: CPU mates, captured ally, other tamers */
    var mates = (run.cpuMates || []).slice();
    if (run.ally && run.ally.hp > 0) mates.push(run.ally);
    for (i = 0; i < mates.length; i++) {
      if (!mates[i] || mates[i].x == null) continue;
      p = edge(pos(mates[i].x, mates[i].y), 5);
      dot(p, 3.5, mates[i].color || "#6ad0ff", "#0a1420");
    }
    var others = run.others || [];
    for (i = 0; i < others.length; i++) {
      if (others[i].x == null) continue;
      p = edge(pos(others[i].x, others[i].y), 5);
      dot(p, 4, "#6ad0ff", "#ffffff");
    }
    /* The rival: pink. Bright while it is on the field; a small dim mark on the rim, direction only,
     * while it is off in its own range (so you can go looking for it, or keep away). */
    var scan = D.items && D.items.fxOn("scan");
    if (run.rival && (run.rival.eid != null || (scan && run.rival.state === "elsewhere"))) { p = edge(pos(run.rival.x, run.rival.y), 6); g.globalAlpha = 0.75 + 0.25 * pulse; dot(p, 4 + pulse, "#ff5aa8", "#ffffff"); g.globalAlpha = 1; }
    else if (run.rival && run.rival.state === "elsewhere") { p = edge(pos(run.rival.x, run.rival.y), 4); g.globalAlpha = 0.55; dot(p, 2.5, "#ff5aa8", "#2a0f20"); g.globalAlpha = 1; }
    /* Rival Scan: its job level beside the mark */
    if (scan && run.rival && (run.rival.eid != null || run.rival.state === "elsewhere") && D.px && D.px.drawText) {
      p = edge(pos(run.rival.x, run.rival.y), 6);
      D.px.drawText(g, "LV" + (run.rival.level || 1), Math.max(2, Math.min(p.x - 8, (MINI.size || 150) - 30)), Math.max(2, p.y + (p.y > 20 ? -14 : 8)), 1, "#ffd0ea");
    }
    /* nemeses: a big pulsing mark in their colour, pinned to the edge when off the map */
    var ni, nm2;
    for (ni = 0; nemList && ni < nemList.length; ni++) {
      nm2 = nemList[ni]; p = edge(pos(nm2[1], nm2[2]), 6);
      g.globalAlpha = 0.7 + 0.3 * pulse; dot(p, 4 + Math.min(3, nm2[3] * 0.5) + pulse, nemCol(nm2[3]), "#140408"); g.globalAlpha = 1;
    }
    /* infected Digimon: purple marks, pinned to the edge when off the map */
    var vi, ve;
    for (vi = 0; vi < enemies.length; vi++) {
      ve = enemies[vi]; if (!ve || ve.dead || !ve.virus) continue;
      p = edge(pos(ve.x, ve.y), 5); g.globalAlpha = 0.75 + 0.25 * pulse; dot(p, 3.2, "#b05cff", "#1c0530"); g.globalAlpha = 1;
    }
    /* Egg Sense: the kinds you can catch, as yellow marks */
    if (D.items && D.items.fxOn("eggsense") && run.killsBy) {
      var ei, en2, need2;
      for (ei = 0; ei < enemies.length; ei++) {
        en2 = enemies[ei]; if (!en2 || en2.dead || en2.boss || en2.rival || en2.virus) continue;
        need2 = D.captureKoNeeded ? D.captureKoNeeded(en2.type) : 30;
        if ((run.killsBy[en2.type] || 0) >= need2) { p = edge(pos(en2.x, en2.y), 4); dot(p, 2.5, "#ffe24a", "#3a2c00"); }
      }
    }
    /* Bosses and Megas: big, pulsing, pinned to the edge when off-map. */
    for (i = 0; i < big.length; i++) {
      e = big[i];
      p = edge(pos(e.x, e.y), 7);
      g.globalAlpha = 0.7 + 0.3 * pulse;
      if (e.mega) diamond(p, 6 + pulse * 1.5, "#ff9a20", "#ffffff");
      else dot(p, 5 + pulse * 1.5, "#ff3030", "#ffffff");
      g.globalAlpha = 1;
    }
    /* Partner and tamer */
    if (run.mx != null) dot(pos(run.mx, run.my), 3, "#ffd200", "#3a2a00");
    g.save();
    g.translate(cxm, cym);
    var ang = run.aim != null ? run.aim : (run.facing >= 0 ? 0 : Math.PI);
    g.rotate(ang);
    g.fillStyle = "#ffffff";
    g.strokeStyle = "#0a0a14";
    g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(6, 0); g.lineTo(-4, -4); g.lineTo(-2, 0); g.lineTo(-4, 4); g.closePath();
    g.stroke(); g.fill();
    g.restore();
  }
  D.minimap = {
    /* Point-of-interest hook for future events: D.minimap.mark("egg-hunt", { x, y, color }). */
    mark: function (id, opts) { if (id == null || !opts) return; MINI.events[id] = { x: opts.x, y: opts.y, color: opts.color, label: opts.label }; },
    unmark: function (id) { delete MINI.events[id]; },
    clear: function () { MINI.events = {}; },
    redraw: function () { drawMinimap(true); }
  };

  function updateHud() {
    tickTrustHud();
    tickPvpChip();
    if (run && state !== "title") {
      updateSeason();
      var mmHide = state === "farm" || state === "brawl";
      if (el.minimapWrap && el.minimapWrap.hidden !== mmHide) el.minimapWrap.hidden = mmHide;
      if (!mmHide) drawMinimap(false);
    }
    if (!run) return;
    var tamerRatio = run.tamerMaxHp ? run.tamerHp / run.tamerMaxHp : 0;
    var monRatio = run.maxHp ? run.hp / run.maxHp : 0;
    if (el.barTamer) setBar(el.barTamer, tamerRatio, !!run.downed, tamerRatio < 0.3 || run.downed);
    setBar(el.barHp, monRatio, run.desperation, monRatio < 0.25 || run.faint > 0);
    setHpReadout("bar-num-tamer", el.barTamer, run.tamerHp, run.tamerMaxHp, tamerRatio < 0.15 || run.downed);
    setHpReadout("bar-num-hp", el.barHp, run.hp, run.maxHp, monRatio < 0.15 || run.faint > 0);
    setBar(el.barXp, run.xp / run.xpNext, false, false);
    /* hover readouts: exact XP and how far along */
    var jx = Math.floor(run.xp || 0), jn = Math.max(1, Math.ceil(run.xpNext || 1)), jt = "Job XP  " + jx + " / " + jn + "  (" + Math.floor(100 * jx / jn) + "%)";
    var bx = Math.floor(run.tamerXp || 0), bn = Math.max(1, Math.ceil(run.tamerXpNext || 1)), bt = "Base XP  " + bx + " / " + bn + "  (" + Math.floor(100 * bx / bn) + "%)";
    if (el.barXp && el.barXp.parentNode.getAttribute("data-tip") !== jt) el.barXp.parentNode.setAttribute("data-tip", jt);
    if ($("skills-chip") && $("skills-chip").getAttribute("data-tip") !== jt) $("skills-chip").setAttribute("data-tip", jt);
    if ($("stats-chip") && $("stats-chip").getAttribute("data-tip") !== bt) $("stats-chip").setAttribute("data-tip", bt);
    var fullLow = state !== "playing" && run.fullness < D.CARE.lowFullnessThreshold;
    setBar(el.barFull, run.fullness / D.CARE.fullnessMax, fullLow, fullLow);
    setBar(el.barHappy, run.happiness / D.CARE.happinessMax, false, run.happiness < 20);
    if (el.carryRow) el.carryRow.hidden = true;
    if (el.hudBits) el.hudBits.textContent = (run.bits || 0) + " Bits";
    if (el.btnShop) {
      var shopOk = canOpenShop();
      el.btnShop.disabled = !shopOk && state === "playing";
      el.btnShop.classList.toggle("is-open", !!(run.merchant && merchantActive()));
    }
    var capT = captureTarget();
    var capOk = !!(capT && captureEligible(capT, false).ok && chargeReadyFor(capT));
    var catchTxt = catchHudText();
    if (el.btnCapture) {
      el.btnCapture.hidden = catchTxt.indexOf("ready") < 0;
      el.btnCapture.disabled = !capOk;
    }
    if (el.hudCapture) {
      el.hudCapture.textContent = catchTxt;
      el.hudCapture.classList.toggle("is-ready", catchTxt.indexOf("ready") >= 0);
    }
    renderBagRow();
    var clock = (D.farm && D.farm.battleClock) ? D.farm.battleClock(run) : { text: formatTime(run.time), overtime: false };
    el.hudTimer.textContent = clock.text;
    el.hudTimer.classList.toggle("is-overtime", !!clock.overtime);
    var fc = (D.farm && D.farm.farmCountdown) ? D.farm.farmCountdown(run) : null;
    if (el.hudFarm && farmOnDemand()) {
      /* the Farm button (Nov 20): greyed with an enemy close, a countdown while you stand still */
      var near = state === "playing" ? farmBlocked() : null;
      el.hudFarm.hidden = state !== "playing" || isEggForm(run.form);
      el.hudFarm.textContent = farmGo ? "Going… " + Math.max(0, farmGo.left).toFixed(1) + "s" : (near ? "Farm: enemies near" : "Farm" + kh("farm"));
      el.hudFarm.classList.toggle("is-warn", !!near && !farmGo);
      el.hudFarm.classList.toggle("is-urgent", !!farmGo);
    } else if (el.hudFarm) {
      var showFarmCd = !!(fc && state === "playing");
      el.hudFarm.hidden = !showFarmCd;
      if (showFarmCd) {
        el.hudFarm.textContent = fc.text;
        el.hudFarm.classList.toggle("is-warn", fc.warn === 15);
        el.hudFarm.classList.toggle("is-urgent", fc.warn === 5);
      }
    }
    if (el.hudWeather) {
      var wsnap = run.weather || (D.weather ? D.weather.snapshot(run) : null);
      var wid = wsnap && wsnap.id;
      var showW = !!(state === "playing" && wid && wid !== "clear");
      el.hudWeather.hidden = !showW;
      if (showW) {
        el.hudWeather.textContent = wsnap.label || wid;
        el.hudWeather.classList.toggle("is-eclipse", wid === "eclipse");
        el.hudWeather.classList.toggle("is-meteorShower", wid === "meteorShower");
        el.hudWeather.classList.toggle("is-rain", wid === "rain");
        el.hudWeather.classList.toggle("is-storm", wid === "storm");
      }
    }
    updateHudRevive();
    if (el.promptBar && D.input && D.input.applyGlyphs) {
      el.promptBar.hidden = !(state === "playing" || state === "farm" || state === "shop" || state === "paused" || state === "brawl" || state === "levelup");
      D.input.applyGlyphs(el.promptBar);
    }
    el.hudLevel.textContent = "Lv " + run.level;
    el.hudKills.textContent = run.kills + " KOs";
    el.hudForm.textContent = D.SPECIES[run.form].name;
    var rules = nextEvoRules();
    var good = null, i;
    if (isEggForm(run.form)) {
      var left = Math.max(0, run.hatchLeft || 0);
      var frac = run.hatchMax ? 1 - (left / run.hatchMax) : 0;
      el.evoStrip.innerHTML = "<b>Hatching</b> — " + left.toFixed(1) + "s  ·  " + (left > ((D.HATCH && D.HATCH.enemyLead) || 1) ? "all quiet… for now" : "here they come!");
      el.evoStrip.classList.toggle("is-ready", frac >= 0.8 || left <= 3);
    } else if (!debug) {
      /* Evolutions are secret: no "Next" hint, no requirements. */
      if (el.evoStrip.innerHTML) el.evoStrip.innerHTML = "";
      el.evoStrip.classList.remove("is-ready");
    } else {
    good = D.closestBranch ? D.closestBranch(run.form, evoStats()) : null;
    if (!good && rules.length) {
      for (i = 0; i < rules.length; i++) if (rules[i].kind !== "neglect" && rules[i].kind !== "fallback") { good = rules[i]; break; }
    }
    if (!good) {
      el.evoStrip.innerHTML = "<b>Mega form reached.</b> Keep fighting!";
      el.evoStrip.classList.remove("is-ready");
    } else {
      var st = evoStatus(good);
      var secret = D.isSecretBranch && D.isSecretBranch(good, evoStats()) && !st.ready;
      var target = secret ? "???" : ((D.SPECIES[good.to] && D.SPECIES[good.to].name) || good.to);
      var bits = st.parts.map(function (p) {
        return "<span class='" + (p.ok ? "ok" : "no") + "'>" + p.label + " " + p.val + (p.ok ? " ✓" : "") + "</span>";
      }).join(" · ");
      el.evoStrip.innerHTML = "<b>Next: " + target + "</b> — " + bits;
      el.evoStrip.classList.toggle("is-ready", st.ready);
    }
    }
    var tier = D.happinessTier(run.happiness);
    var bonus = [];
    if (tier.fireRate > 1) bonus.push("ATK SPD +" + Math.round((tier.fireRate - 1) * 100) + "%");
    if (tier.extraShots) bonus.push("+" + tier.extraShots + " shot");
    if (tier.damage > 1) bonus.push("DMG +" + Math.round((tier.damage - 1) * 100) + "%");
    if (tier.fireRate < 1) bonus.push("ATK SPD " + Math.round((tier.fireRate - 1) * 100) + "%");
    if (tier.damage < 1) bonus.push("DMG " + Math.round((tier.damage - 1) * 100) + "%");
    var ngl = neglectState();
    /* Hungry/Starving must not appear on the combat HUD — hunger has no battle penalty. */
    var tags = ngl.tags.filter(function (tag) { return tag !== "Starving" && tag !== "Hungry"; });
    if (run.desperation && run.faint <= 0) tags.push("Desperation");
    if (run.atkBoost > 0) tags.push("Power +" + Math.round(run.atkBoost) + "s");
    el.moodStrip.dataset.tier = tier.id;
    el.moodStrip.textContent = "Mood: " + tier.name + (bonus.length ? " — " + bonus.join("  ") : "") + (tags.length ? "  ·  " + tags.join(" · ") : "");
    el.despBanner.classList.toggle("is-on", run.desperation && state === "playing");
    el.vignette.classList.toggle("is-on", run.desperation && (state === "playing" || state === "levelup"));
    if (el.secretVeil) {
      var mir = !!(run.windows && run.windows.miracle && run.windows.miracle.open);
      var omen = !!(run.windows && run.windows.omen && run.windows.omen.open);
      el.secretVeil.classList.toggle("is-miracle", mir);
      el.secretVeil.classList.toggle("is-omen", omen && !mir);
    }
    if (D.rarity && D.rarity.renderDebug) D.rarity.renderDebug(el.tierDebug, run, evoStats(), save);
  }

  function renderPause() {
    if (!run) return;
    el.pauseForm.textContent = D.SPECIES[run.form].name + " · " + D.SPECIES[run.form].stage + " · " + formatTime(run.time);
    var rules = nextEvoRules();
    var i, st, rule, secret, name, kindLabel;
    /* portrait, tags and the four headline numbers */
    var cv = $("pause-cv"), tags = $("pause-tags"), tiles = $("pause-tiles"), EL = D.ELEMENTS, elx = EL && EL.elementOf(run.form), atx = EL && EL.attributeOf(run.form), sh, g, k, th = "";
    if (cv) {
      g = cv.getContext("2d"); g.imageSmoothingEnabled = false; g.clearRect(0, 0, cv.width, cv.height);
      try {
        if (run.shiny) D.sprites.setShiny(true);
        sh = D.sprites.getSheet(run.form, "idle", 0, false);
        D.sprites.setShiny(false);
        if (sh && sh.width) { k = Math.min((cv.width - 8) / sh.width, (cv.height - 8) / sh.height); g.drawImage(sh, Math.round((cv.width - sh.width * k) / 2), Math.round(cv.height - 4 - sh.height * k), Math.round(sh.width * k), Math.round(sh.height * k)); }
      } catch (e2) { D.sprites.setShiny(false); }
    }
    if (tags) {
      if (elx) th += "<span class='pause-tag' style='border-color:" + EL.COLORS[elx] + ";color:" + EL.COLORS[elx] + "'>" + EL.NAMES[elx] + "</span>";
      if (atx && atx !== "None" && atx !== "Unknown") th += "<span class='pause-tag'>" + atx + "</span>";
      if (run.shiny) th += "<span class='pause-tag is-shiny'>\u2726 Shiny</span>";
      var pb = D.world && D.world.biomeAt ? D.world.biomeAt(run.x, run.y) : null;
      if (pb) th += "<span class='pause-tag'>" + pb.name + "</span>";
      tags.innerHTML = th;
    }
    function tile(v, l) { return "<div class='pause-tile'><b>" + v + "</b><span>" + l + "</span></div>"; }
    if (tiles) tiles.innerHTML = tile(run.level || 1, "Job level") + tile(run.tamerLevel || 1, "Base level") + tile(run.kills || 0, "KOs") + tile(run.bits || 0, "Bits") + (run.rival ? tile(run.rival.wins + " \u2013 " + run.rival.losses, "vs " + run.rival.name + " (Lv " + run.rival.level + ")") : "");
    function meter(label, v, cls, note) {
      return "<div class='pause-meter'><span>" + label + "</span><div class='pause-track'><i class='" + cls + "' style='width:" + Math.round(clamp(v, 0, 100)) + "%'></i></div><b>" + Math.round(v) + (note ? " <small>" + note + "</small>" : "") + "</b></div>";
    }
    var html = meter("Fullness", run.fullness, "is-food", "") + meter("Happiness", run.happiness, "is-joy", D.happinessTier(run.happiness).name + (run.desperation ? ", desperate" : ""));
    if (!debug) rules = [];
    else if (!rules.length) html += "<div class='ok'>Final form reached.</div>";
    else html += "<div class='evo-list-label'>Possible next forms (debug)</div>";
    for (i = 0; i < rules.length; i++) {
      rule = rules[i];
      if (rule.kind === "fallback") continue;
      st = evoStatus(rule);
      secret = D.isSecretBranch && D.isSecretBranch(rule, evoStats()) && !st.ready;
      name = secret ? "???" : ((D.SPECIES[rule.to] && D.SPECIES[rule.to].name) || rule.to);
      kindLabel = rule.kind === "neglect" ? "Neglect: " : rule.kind === "recover" ? "Recovery: " : (secret ? "Secret: " : "Evolve to ");
      html += "<div class='evo-branch" + (secret ? " is-secret" : "") + (st.ready ? " is-ready" : "") + "'><b>" + kindLabel + name + "</b>" +
        (secret ? " <span class='no'>???</span>" : " — " + st.parts.map(function (p) { return "<span class='" + (p.ok ? "ok" : "no") + "'>" + p.label + (p.ok ? " ✓" : "") + "</span>"; }).join(" · ") +
        (st.ready ? " <span class='ok'>READY</span>" : "")) + "</div>";
    }
    html += "<div class='pause-small'>Meals " + (run.foodEaten || 0) + "  \u00b7  Care mistakes " + (run.careMistakes || 0) + "  \u00b7  Faints " + (run.faints || 0) + "</div>";
    el.pauseCare.innerHTML = html;
    renderPauseExtra();
    var fxBtn = $("btn-fx");
    if (fxBtn) fxBtn.textContent = reducedFx ? "Effects: Reduced" : "Effects: Full";
  }

  function renderTitle() {
    var logo = $("title-logo");
    if (logo && D.titleScene && D.titleScene.paintLogo && D.titleScene.paintLogo(logo)) {
      /* painted by js/title-scene.js */
    } else if (logo && D.sprites.drawLogo) {
      if (logo.width !== 720) { logo.width = 720; logo.height = 140; }
      var lctx = logo.getContext("2d");
      lctx.imageSmoothingEnabled = false;
      lctx.clearRect(0, 0, logo.width, logo.height);
      D.sprites.drawWord(lctx, "DIGI", 36, 30, 6, "#f0c020", 1);
      D.sprites.drawWord(lctx, "NIGHT", 36 + 6 * 6 * 4 + 30, 30, 6, "#9ab0ff", 1);
    }
    var row = el.starterRow;
    if (row) {
      row.innerHTML = "";
      row.classList.add("is-hidden");
    }
    renderPartyOption();
    return;
    D.STARTERS.forEach(function (id) {
      var sp = D.SPECIES[id];
      var unlocked = isUnlocked(id);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "starter" + (id === selectedStarter ? " is-selected" : "") + (unlocked ? "" : " is-locked");
      btn.dataset.id = id;
      var cv = document.createElement("canvas");
      cv.width = 192;
      cv.height = 160;
      cv.style.width = "192px";
      cv.style.height = "160px";
      cv.className = "pixelated";
      btn.appendChild(cv);
      var name = document.createElement("div");
      name.className = "name";
      name.textContent = unlocked ? sp.name : "???";
      btn.appendChild(name);
      var stage = document.createElement("div");
      stage.className = "stage";
      stage.textContent = unlocked ? sp.stage : "Locked";
      btn.appendChild(stage);
      if (!unlocked) {
        var lock = document.createElement("div");
        lock.className = "lock";
        lock.textContent = "🔒";
        btn.appendChild(lock);
        var hint = document.createElement("div");
        hint.className = "hint";
        hint.textContent = sp.unlockHint || "Locked";
        btn.appendChild(hint);
      } else {
        var hint2 = document.createElement("div");
        hint2.className = "hint";
        hint2.textContent = "Starts with " + (D.WEAPONS[sp.startWeapon] ? D.WEAPONS[sp.startWeapon].name : "a basic attack");
        btn.appendChild(hint2);
      }
      btn.addEventListener("click", function () {
        if (!unlocked) { sfx("ui"); return; }
        selectedStarter = id;
        renderTitle();
        sfx("ui");
      });
      row.appendChild(btn);
      var c = cv.getContext("2d");
      c.imageSmoothingEnabled = false;
      c.clearRect(0, 0, 192, 160);
      if (unlocked) D.sprites.drawPartner(c, id, 96, 130, 1, 2.2, performance.now() / 1000, false, false, false);
      else if (D.sprites.drawSilhouette) D.sprites.drawSilhouette(c, id, 96, 130, 2.2);
      else {
        c.fillStyle = "#1a2840";
        c.beginPath();
        c.ellipse(96, 90, 28, 40, 0, 0, Math.PI * 2);
        c.fill();
      }
    });
  }

  function isKnownTamer(id) {
    var list, i;
    if (!id) return false;
    if (D.sprites && D.sprites.getTamerList) {
      list = D.sprites.getTamerList();
      for (i = 0; i < list.length; i++) if (list[i].id === id) return true;
    }
    return false;
  }

  function renderCabinet() {
    var grid = $("cosmetics-grid");
    if (!grid || !D.cosmetics) return;
    var bitsEl = $("cosmetics-bits");
    if (bitsEl) bitsEl.textContent = D.cosmetics.currencyName() + " " + D.cosmetics.bits();
    var html = "", kinds = ["title", "digivice", "farm"], ki, list, i, it, owned, eq, cls, price;
    for (ki = 0; ki < kinds.length; ki++) {
      html += "<h3 class='cosmetics-kind'>" + (kinds[ki] === "digivice" ? "Digivice" : kinds[ki] === "farm" ? "Farm backdrop" : "Titles") + "</h3>";
      html += "<div class='cosmetics-row'>";
      list = D.cosmetics.catalog({ kind: kinds[ki] });
      for (i = 0; i < list.length; i++) {
        it = list[i];
        owned = D.cosmetics.isUnlocked(it.id);
        eq = D.cosmetics.equipped(it.kind) === it.id;
        cls = "cosmetics-card" + (owned ? " is-owned" : "") + (eq ? " is-equipped" : "") + (it.legendary ? " is-legendary" : "");
        price = it.legendary ? (owned ? "Found" : "Not for sale") : it.rank ? (owned ? "Earned" : "Tamer Rank " + it.rank) : (it.price ? (it.price + " DigiBits") : "Free");
        html += "<button type='button' class='" + cls + "' data-cid='" + it.id + "'>";
        html += "<strong>" + it.name + "</strong>";
        html += "<span class='sub'>" + it.desc + "</span>";
        html += "<span class='cosmetics-price'>" + price + (eq ? " · Equipped" : (owned && !it.legendary ? " · Equip" : "")) + "</span>";
        html += "</button>";
      }
      html += "</div>";
    }
    grid.innerHTML = html;
    var btns = grid.querySelectorAll(".cosmetics-card"), b;
    for (i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function (ev) {
        var id = ev.currentTarget.getAttribute("data-cid");
        var rec = D.cosmetics.item(id);
        if (!rec) return;
        if (D.cosmetics.isUnlocked(id)) {
          D.cosmetics.equip(id);
        } else if (rec.rank) {
          showNoticeToast("Reach Tamer Rank " + rec.rank + " to earn this.");
        } else if (!rec.legendary) {
          var r = D.cosmetics.buyAndEquip(id);
          if (!r.ok && r.reason === "broke") showNoticeToast("Need " + rec.price + " DigiBits");
        } else {
          showNoticeToast("This one isn't sold.");
        }
        renderCabinet();
        renderPartyOption();
        if (D.cosmetics.applyDom) D.cosmetics.applyDom();
      });
    }
  }

  function persistSettings() {
    if (!D.storage) return;
    D.storage.saveSettings({ reducedFx: reducedFx, selectedTamer: selectedTamer, selectedEgg: selectedEgg, cpuBots: selectedCpuBots, mode: selectedMode });
  }

  function setCpuBots(n) {
    var max = (D.BRAWL_CFG && D.BRAWL_CFG.botCountMax != null) ? D.BRAWL_CFG.botCountMax : 5;
    selectedCpuBots = Math.max(0, Math.min(max, n | 0));
    persistSettings();
    renderPartyOption();
    return selectedCpuBots;
  }

  function renderPartyOption() {
    var n = $("cpu-count");
    if (n) n.textContent = String(selectedCpuBots);
    var you = $("party-you-name");
    if (you) {
      var title = (D.cosmetics && D.cosmetics.titleLabel && D.cosmetics.titleLabel()) || "";
      you.textContent = title ? ("You · " + title) : "You";
    }
    var bitsChip = $("title-digibits");
    if (bitsChip && D.cosmetics) bitsChip.textContent = D.cosmetics.currencyName() + " " + D.cosmetics.bits();
    var wrap = $("party-cpu");
    if (wrap) {
      wrap.setAttribute("data-count", String(selectedCpuBots));
      wrap.classList.toggle("is-solo", selectedCpuBots === 0);
    }
    var minus = $("btn-cpu-minus");
    var plus = $("btn-cpu-plus");
    if (minus) minus.disabled = selectedCpuBots <= 0;
    if (plus) plus.disabled = selectedCpuBots >= ((D.BRAWL_CFG && D.BRAWL_CFG.botCountMax) || 5);
  }

  function syncPreviewCanvas(cv) {
    var fallback = cv.width || 240;
    var w = Math.max(1, Math.round(cv.clientWidth || fallback));
    var h = Math.max(1, Math.round(cv.clientHeight || fallback));
    if (cv.width !== w || cv.height !== h) {
      cv.width = w;
      cv.height = h;
    }
    return { w: w, h: h };
  }

  function previewDrawScale(nativeH, cv, minS, maxS) {
    var pad = Math.max(10, Math.round(cv.height * 0.06));
    var fit = (cv.height - pad) / Math.max(1, nativeH);
    var s = Math.min(fit, maxS);
    s = Math.floor(s * 2 + 0.0001) / 2;
    if (s < minS && fit >= minS) s = minS;
    if (s < 1) s = Math.max(1, Math.floor(fit * 2) / 2);
    return s;
  }

  function paintPreviewScaled(ctx, w, h, scale, drawAtOrigin) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(w / 2), Math.round(h - Math.max(8, h * 0.06)));
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = false;
    drawAtOrigin(ctx);
    ctx.restore();
  }

    function renderTamerSelect() {
    var row = el.tamerRow || $("tamer-row");
    if (!row) return;
    row.innerHTML = "";
    var list = (D.sprites && D.sprites.getTamerList) ? D.sprites.getTamerList() : [
      { id: "junior", name: "Junior" },
      { id: "takumi", name: "Takumi" },
      { id: "minori", name: "Minori" }
    ];
    if (!isKnownTamer(selectedTamer)) selectedTamer = list[0].id;
    list.forEach(function (t) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tamer-card" + (t.id === selectedTamer ? " is-selected" : "");
      btn.dataset.id = t.id;
      var cv = document.createElement("canvas");
      cv.width = 240;
      cv.height = 240;
      cv.className = "pixelated preview-cv";
      btn.appendChild(cv);
      var name = document.createElement("div");
      name.className = "name";
      name.textContent = t.name;                    /* the colour; the character's name is the profile name */
      btn.appendChild(name);
      btn.addEventListener("click", function () {
        selectedTamer = t.id;
        persistSettings();
        paintTamerSelection();
        sfx("ui");
      });
      row.appendChild(btn);
    });
    var who = D.profile && D.profile.name && D.profile.name(), sub = row.parentNode && row.parentNode.querySelector(".sub");
    if (sub) sub.textContent = (who ? who + ", pick" : "Pick") + " your projection: how you appear in the Digital World.";
    paintTamerPreviews();
  }

  function paintTamerSelection() {
    var row = el.tamerRow || $("tamer-row");
    if (!row) return;
    var cards = row.querySelectorAll(".tamer-card");
    var i;
    for (i = 0; i < cards.length; i++) {
      cards[i].classList.toggle("is-selected", cards[i].dataset.id === selectedTamer);
    }
  }

  function paintTamerPreviews() {
    if (state !== "tamer") return;
    var row = el.tamerRow || $("tamer-row");
    if (!row || !D.sprites || !D.sprites.drawTamer) return;
    var cards = row.querySelectorAll(".tamer-card");
    var i, cv, c, id, size, scale;
    for (i = 0; i < cards.length; i++) {
      cv = cards[i].querySelector("canvas");
      if (!cv) continue;
      id = cards[i].dataset.id;
      size = syncPreviewCanvas(cv);
      c = cv.getContext("2d");
      c.imageSmoothingEnabled = false;
      c.clearRect(0, 0, size.w, size.h);
      scale = previewDrawScale(56, cv, 3, 4);
      paintPreviewScaled(c, size.w, size.h, scale, function (ctx) {
        D.sprites.drawTamer(ctx, 0, 0, 1, titleTime, false, false, false, "down", id);
      });
    }
  }

  function confirmTamerAndStart() {
    persistSettings();
    setState("egg");
  }

  function isEggUnlocked(eggDef) {
    if (!eggDef) return false;
    return eggState(eggDef).open;
  }

  function renderEggSelect() {
    var row = el.eggRow || $("egg-row");
    if (!row) return;
    row.innerHTML = "";
    var list = (D.EGGS || []).slice();
    list.forEach(function (egg) {
      var unlocked = isEggUnlocked(egg);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tamer-card egg-card" + (egg.id === selectedEgg ? " is-selected" : "") + (unlocked ? "" : " is-locked");
      btn.dataset.id = egg.id;
      var cv = document.createElement("canvas");
      cv.width = 240;
      cv.height = 240;
      cv.className = "pixelated preview-cv";
      btn.appendChild(cv);
      var name = document.createElement("div");
      name.className = "name";
      name.textContent = unlocked ? egg.name : "???";
      btn.appendChild(name);
      var from = document.createElement("div");
      from.className = "from";
      from.textContent = unlocked ? (egg.blurb || "DigiEgg") : ((D.SPECIES[egg.unlockId] && D.SPECIES[egg.unlockId].unlockHint) || "Locked");
      btn.appendChild(from);
      if (!unlocked) {
        var lock = document.createElement("div");
        lock.className = "lock";
        lock.textContent = "🔒";
        btn.appendChild(lock);
      }
      btn.addEventListener("click", function () {
        if (!unlocked) { sfx("ui"); return; }
        /* every click shuffles that egg's shell pattern */
        if (D.sprites.rollEggPattern) D.sprites.rollEggPattern(egg.frame);
        selectedEgg = egg.id;
        persistSettings();
        paintEggSelection();
        sfx("ui");
      });
      row.appendChild(btn);
    });
    /* Random option */
    var randBtn = document.createElement("button");
    randBtn.type = "button";
    randBtn.className = "tamer-card egg-card" + (selectedEgg === "random" ? " is-selected" : "");
    randBtn.dataset.id = "random";
    var rcv = document.createElement("canvas");
    rcv.width = 240;
    rcv.height = 240;
    rcv.className = "pixelated preview-cv";
    randBtn.appendChild(rcv);
    var rname = document.createElement("div");
    rname.className = "name";
    rname.textContent = "Random Egg";
    randBtn.appendChild(rname);
    var rfrom = document.createElement("div");
    rfrom.className = "from";
    rfrom.textContent = "A surprise from your unlocked Digitama.";
    randBtn.appendChild(rfrom);
    randBtn.addEventListener("click", function () {
      selectedEgg = "random";
      persistSettings();
      paintEggSelection();
      sfx("ui");
    });
    row.appendChild(randBtn);
    paintEggPreviews();
  }

  function paintEggSelection() {
    var row = el.eggRow || $("egg-row");
    if (!row) return;
    var cards = row.querySelectorAll(".egg-card");
    var i;
    for (i = 0; i < cards.length; i++) {
      cards[i].classList.toggle("is-selected", cards[i].dataset.id === selectedEgg);
    }
  }

  function paintEggPreviews() {
    if (state !== "egg") return;
    var row = el.eggRow || $("egg-row");
    if (!row || !D.sprites || !D.sprites.drawEgg) return;
    var cards = row.querySelectorAll(".egg-card");
    var eggs = D.EGGS || [];
    var i, cv, c, id, def, frame, unlockedEggs, pick, size, scale;
    unlockedEggs = eggs.filter(isEggUnlocked);
    for (i = 0; i < cards.length; i++) {
      cv = cards[i].querySelector("canvas");
      if (!cv) continue;
      id = cards[i].dataset.id;
      size = syncPreviewCanvas(cv);
      c = cv.getContext("2d");
      c.imageSmoothingEnabled = false;
      c.clearRect(0, 0, size.w, size.h);
      scale = previewDrawScale(30, cv, 4, 7);
      if (id === "random") {
        pick = unlockedEggs.length ? unlockedEggs[Math.floor(titleTime / 0.7) % unlockedEggs.length] : eggs[0];
        frame = pick && pick.frame;
      } else {
        def = null;
        eggs.forEach(function (e) { if (e.id === id) def = e; });
        if (def && !isEggUnlocked(def)) {
          paintPreviewScaled(c, size.w, size.h, scale, function (ctx) {
            ctx.fillStyle = "#1a2840";
            ctx.beginPath();
            ctx.ellipse(0, -16, 10, 14, 0, 0, Math.PI * 2);
            ctx.fill();
          });
          continue;
        }
        frame = def && def.frame;
      }
      if (frame) {
        paintPreviewScaled(c, size.w, size.h, scale, function (ctx) {
          D.sprites.drawEgg(ctx, frame, 0, 0, titleTime, false, false);
        });
      }
    }
  }

  function resolveEggPick() {
    var eggs = D.EGGS || [];
    var unlocked = eggs.filter(isEggUnlocked);
    if (selectedEgg === "hatchery" && D.hatchery && D.hatchery.ready() && !online()) return "hatchery";
    if (selectedEgg === "random") {
      /* a random egg is a surprise all the way down: any line at all, locked or not, and any shell */
      if (D.sprites.rollEggPattern) D.sprites.rollEggPattern();
      if (!eggs.length) return "agumon";
      return eggs[(Math.random() * eggs.length) | 0].id;
    }
    var i;
    for (i = 0; i < eggs.length; i++) {
      if (eggs[i].id === selectedEgg && isEggUnlocked(eggs[i])) return selectedEgg;
    }
    return unlocked.length ? unlocked[0].id : "agumon";
  }

  function modeDef(id) { var l = (D.MODES && D.MODES.list) || [], i; for (i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  function guestNow() { return !!(D.online && D.online.isGuest && D.online.isGuest()); }
  function confirmEggAndStart() {
    if (D.titleScene && D.titleScene.blockStart && D.titleScene.blockStart()) { sfx("ui"); return; }
    var line = resolveEggPick();
    selectedStarter = line;
    persistSettings();
    /* Online: picking an egg leads to the lobby (or straight into a game
     * that is already running) instead of a solo run. */
    if (line === "hatchery") {
      /* it is spent the moment the run starts */
      var spec = D.hatchery.take();
      selectedEgg = (spec && spec.line) || "agumon"; selectedStarter = selectedEgg; persistSettings();
      if (spec) { startRun(spec.line || "agumon", selectedTamer, spec); return; }
      line = resolveEggPick();
    }
    if (D.online && D.online.interceptStart && D.online.interceptStart(line, selectedTamer)) return;
    startRun(line, selectedTamer);
  }

  /* ---------- Menu focus ---------- */
  function visibleChoices() {
    var screen = document.querySelector(".screen.is-on");
    if (!screen) return [];
    return Array.prototype.slice.call(screen.querySelectorAll(".card, .starter:not(.is-locked), .tamer-card:not(.is-locked), .egg-card:not(.is-locked), button.btn, button.shop-tab, button.shop-row, button.bank-card:not(.is-empty), button.bag-chip, button.hub-tile, button.hub-face"))
      .filter(function (n) { return n.getClientRects().length > 0 && !n.disabled; });
  }

  function focusMenu(offset) {
    menuItems = visibleChoices();
    if (!menuItems.length) return;
    if (typeof offset === "number") menuIndex = (menuIndex + offset + menuItems.length) % menuItems.length;
    else {
      menuIndex = 0;
      for (var i = 0; i < menuItems.length; i++) {
        if (state === "tamer" && menuItems[i].classList.contains("tamer-card") && menuItems[i].dataset.id === selectedTamer) {
          menuIndex = i;
          break;
        }
        if (state === "egg" && menuItems[i].classList.contains("egg-card") && menuItems[i].dataset.id === selectedEgg) {
          menuIndex = i;
          break;
        }
        if (menuItems[i].id === "btn-start" || menuItems[i].id === "hub-play" || menuItems[i].id === "btn-setup-start" || menuItems[i].classList.contains("card") || menuItems[i].id === "btn-resume" || menuItems[i].id === "btn-retry") {
          menuIndex = i;
          break;
        }
      }
    }
    Array.prototype.forEach.call(document.querySelectorAll(".is-selected"), function (n) { if (menuItems.indexOf(n) < 0 && /^BUTTON$/.test(n.tagName)) n.classList.remove("is-selected"); });
    menuItems.forEach(function (n, i) { n.classList.toggle("is-selected", i === menuIndex); });
    var it = menuItems[menuIndex];
    if (it && it.dataset && it.dataset.id && !it.classList.contains("is-locked")) {
      if (it.classList.contains("starter")) selectedStarter = it.dataset.id;
      if (it.classList.contains("tamer-card") && !it.classList.contains("egg-card")) {
        selectedTamer = it.dataset.id;
        paintTamerSelection();
      }
      if (it.classList.contains("egg-card")) {
        selectedEgg = it.dataset.id;
        paintEggSelection();
      }
    }
  }

  function confirmMenu() {
    if (state === "playing") return;
    menuItems = visibleChoices();
    var it = menuItems[menuIndex] || menuItems[0];
    if (state === "tamer") {
      if (it && it.id === "btn-tamer-back") { it.click(); return; }
      confirmTamerAndStart();
      return;
    }
    if (state === "egg") { setState("title"); return; }       /* the egg screen is a gallery now: confirming leaves it */
    if (it) it.click();
  }

  /* ---------- Debug ---------- */
  function speciesRoster() {
    var ids = [], id;
    for (id in D.SPECIES) {
      if (!Object.prototype.hasOwnProperty.call(D.SPECIES, id)) continue;
      if (D.SPECIES[id].stage === "Egg") continue;
      ids.push(id);
    }
    ids.sort();
    return ids;
  }

  function forceSpecies(id, withCinema) {
    if (!run || !id) return false;
    id = D.resolveSpeciesId ? D.resolveSpeciesId(id) : id;
    if (!D.SPECIES[id]) return false;
    preloadForm(id);
    if (withCinema && state === "playing") {
      beginEvolution({ to: id, kind: "debug" });
      return true;
    }
    applyForm(id, "debug");
    run.evoLock = 1.2;
    updateHud();
    return true;
  }

  function cycleSpecies(dir) {
    if (!run) return null;
    var ids = speciesRoster();
    var i = ids.indexOf(run.form);
    if (i < 0) i = 0;
    else i = (i + (dir || 1) + ids.length) % ids.length;
    forceSpecies(ids[i], false);
    addFloat(run.mx, run.my - 36, D.SPECIES[ids[i]].name, "#ffe080");
    return ids[i];
  }

  function showBranchEval() {
    if (!run) return [];
    var list = nextEvoRules();
    var stats = evoStats();
    var picked = D.pickEvolution ? D.pickEvolution(run.form, stats) : null;
    var lines = [], i, b, st, nm;
    lines.push("From " + ((D.SPECIES[run.form] && D.SPECIES[run.form].name) || run.form) +
      "  lv" + run.level + " meals " + run.foodEaten + " joy " + Math.round(run.happiness) +
      " mostFood=" + ((D.uniqueMostFood && D.uniqueMostFood(run.foodCounts)) || "—"));
    for (i = 0; i < list.length; i++) {
      b = list[i];
      st = evoStatus(b);
      nm = (D.SPECIES[b.to] && D.SPECIES[b.to].name) || b.to;
      lines.push((picked && picked.to === b.to && picked.kind === b.kind ? "→ " : "  ") +
        b.kind + " " + nm + (st.ready ? " READY" : "") +
        " [" + st.parts.map(function (p) { return p.label + ":" + p.val; }).join(", ") + "]");
    }
    if (el.debugEvoLog) {
      el.debugEvoLog.hidden = false;
      el.debugEvoLog.textContent = lines.join("\n");
    }
    try { console.log(lines.join("\n")); } catch (err) {}
    return list;
  }

  function debugAction(name) {
    if (!debug || !run || (state !== "playing" && name !== "xp")) {
      if (!(debug && run && state === "playing")) {
        if (!(debug && run && name === "evo" && state === "playing")) {
          if (!(debug && run && state === "playing")) {
            /* still allow during playing only */
          }
        }
      }
    }
    if (missionAuth && !missionAuth.allowDebugIntents) return;
    if (!debug || !run || run.ended) return;
    if (name === "bits" || name === "shop" || name === "capture" || name === "charge" || name === "farm" || name === "overtime" || name === "healorb" || name === "farmdue" || name === "weatherEclipse" || name === "weatherMeteor" || name === "weatherRain" || name === "weatherStorm" || name === "weatherClear") {
      /* allowed from shop, farm, or playing */
    } else if (state !== "playing" && name !== "hp" && state !== "farm") return;
    if (name === "xp") {
      run.xp += run.xpNext;
      tryLevel();
    } else if (name === "food") {
      var kinds = ["meat", "fish", "berry"];
      var fk = kinds[(run.foodEaten || 0) % 3];
      addToBag(fk, 3);
      addFloat(run.x, run.y - 28, "Bagged " + fk, "#e85a4a");
    } else if (name === "feed") {
      run.fullness = D.CARE.fullnessMax;
      run.foodEaten += 5;
      addFloat(run.mx, run.my - 28, "+5 meals", "#e85a4a");
      checkEvolution();
    } else if (name === "happy") {
      run.happiness = D.CARE.happinessMax;
      checkEvolution();
    } else if (name === "hp") {
      run.hp = run.maxHp;
      run.tamerHp = run.tamerMaxHp;
      run.faint = 0;
    } else if (name === "hurt") {
      run.tamerHp = run.tamerMaxHp * 0.2;
    } else if (name === "hurtmon") {
      run.hp = run.maxHp * 0.2;
    } else if (name === "evo") {
      var list = nextEvoRules();
      var rule = D.closestBranch ? D.closestBranch(run.form, evoStats()) : null;
      var i, cond;
      if (!rule) {
        for (i = 0; i < list.length; i++) if (list[i].kind === "standard" || list[i].existingGate) { rule = list[i]; break; }
      }
      if (!rule) return;
      cond = rule.conditions || rule;
      if (cond.minLevel) { run.level = Math.max(run.level, cond.minLevel); run.xpNext = xpNeeded(run.level); }
      if (cond.minFood) run.foodEaten = Math.max(run.foodEaten, cond.minFood);
      if (cond.minHappiness) run.happiness = Math.max(run.happiness, cond.minHappiness);
      run.fullness = D.CARE.fullnessMax;
      if (cond.minHpRatio) run.hp = Math.max(run.hp, run.maxHp * cond.minHpRatio + 1);
      run.faint = 0;
      if (D.rarity && D.rarity.debugSatisfy) D.rarity.debugSatisfy(run, rule);
      if (state === "playing") checkEvolution();
    } else if (name === "cycle") {
      cycleSpecies(1);
    } else if (name === "cycleback") {
      cycleSpecies(-1);
    } else if (name === "eval") {
      showBranchEval();
    } else if (name === "hatch") {
      doHatch();
    } else if (name === "baby" || name === "training" || name === "rookie" || name === "champion") {
      forceLineStage(name);
    } else if (name === "bits") {
      grantBits(100);
      addFloat(run.x, run.y - 28, "+100 Bits", "#ffe080");
      if (state === "shop") renderShop();
    } else if (name === "shop") {
      openShop();
    } else if (name === "capture") {
      tryCapture({ force: true });
    } else if (name === "charge") {
      fillCaptureCharge();
      addFloat(run.x, run.y - 28, "Capture charge filled", "#6ad0ff");
    } else if (name === "brawl") {
      startBrawl();
    } else if (name === "farm") {
      startFarm({ scheduled: false });
    } else if (name === "overtime") {
      var limit = (D.BATTLE_CFG && D.BATTLE_CFG.duration) || 600;
      run.time = Math.max(run.time, limit + 8);
      addFloat(run.x, run.y - 28, "Overtime", "#ff6060");
    } else if (name === "healorb") {
      spawnOrb("heal", run.x + 40, run.y - 10, 1);
    } else if (name === "farmdue") {
      var next = (D.farm && D.farm.nextAt) ? D.farm.nextAt(run) : 180;
      run.time = Math.max(0, next - 16);
    } else if (name === "weatherEclipse") {
      forceWeather("eclipse");
    } else if (name === "weatherMeteor") {
      forceWeather("meteorShower");
    } else if (name === "weatherRain") {
      forceWeather("rain");
    } else if (name === "weatherStorm") {
      forceWeather("storm");
    } else if (name === "weatherClear") {
      forceWeather("clear");
    }
    updateHud();
  }


  function evoFormHeight(form) {
    if (isEggForm(form)) return 30;
    if (D.sprites && D.sprites.visualHeight) {
      var h = D.sprites.visualHeight(form);
      if (h > 0) return h;
    }
    var sp = D.SPECIES[form];
    return (sp && sp.base && sp.base.radius) ? sp.base.radius * 3 : 54;
  }

  function paintEvoSprite(cv, form, t, flash, hidden) {
    if (!cv || !D.sprites) return;
    var size = syncPreviewCanvas(cv);
    var ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size.w, size.h);
    if (hidden || !form) return;
    var nativeH = evoFormHeight(form);
    var scale = previewDrawScale(nativeH, cv, 1, 8);
    var eggFrame = D.SPECIES[form] && D.SPECIES[form].eggFrame;
    if (isEggForm(form) && D.sprites.drawEgg) {
      paintPreviewScaled(ctx, size.w, size.h, scale, function (c0) {
        D.sprites.drawEgg(c0, eggFrame, 0, 0, t, !!flash, false);
      });
      return;
    }
    if (D.sprites.drawPartner) {
      /* Draw at in-game size (scale 1), then nearest-neighbor upscale to fill the portrait. */
      paintPreviewScaled(ctx, size.w, size.h, scale, function (c0) {
        D.sprites.drawPartner(c0, form, 0, 0, 1, 1, t, !!flash, false, false);
      });
    }
  }

  function paintEvoPortraits() {
    if (state !== "evolution" || !evoInfo) return;
    var elapsed = 2.15 - (evoTimer || 0);
    var flashAmt = 0;
    var u;
    if (elapsed > 0.32 && elapsed < 0.85) {
      u = (elapsed - 0.32) / 0.53;
      flashAmt = u < 0.35 ? u / 0.35 : 1 - (u - 0.35) / 0.65;
      if (flashAmt < 0) flashAmt = 0;
    }
    if (el.evoPopFlash) el.evoPopFlash.style.opacity = String(flashAmt);
    var showTo = elapsed >= 0.45;
    var toFlash = elapsed >= 0.4 && elapsed < 0.7;
    if (el.evoToSide) el.evoToSide.classList.toggle("is-flashing", toFlash);
    paintEvoSprite(el.evoFromCv, evoInfo.from, titleTime, false, false);
    paintEvoSprite(el.evoToCv, evoInfo.to, titleTime, toFlash, !showTo);
  }

  /* ---------- Loop ---------- */
  function frame(now) {
    var dt = lastT ? (now - lastT) / 1000 : 0;
    lastT = now;
    perfTick(dt);
    if (dt > 0.05) dt = 0.05;
    titleTime += dt;
    if (state === "tamer") paintTamerPreviews();
    if (D.hub) D.hub.tick(dt, state);
    if (state === "egg") paintEggPreviews();
    if (state === "evolution") paintEvoPortraits();
    if (state === "shop") paintShopJiji();
    if (state === "bank") paintBankPreviews();
    fpsFrames += 1;
    fpsAccum += dt;
    if (fpsAccum >= 1) { fps = fpsFrames / fpsAccum; fpsFrames = 0; fpsAccum = 0; }
    if (feedMenu.open) tickFeedMenu();
    tickEvoOffer(dt);
    tickDna(dt);
    tickBiome(dt);
    tickBurst(dt);
    tickLevelWindow(dt);
    tickLevelFx(state === "playing" || state === "farm" ? dt : 0);
    tickBolts(state === "playing" ? dt : 0);
    tickMusic(dt);
    tickAllyChip();
    tickShiny(dt);
    if (D.profile) D.profile.tick(run, state);
    if (state === "playing" && run) forecastTick();
    tickStats();
    tickSkills();
    /* hitstop: on a critical, a kill or a heavy blow the fight holds still for a few
     * hundredths of a second (solo only: online the clock belongs to everyone) */
    var held = false;
    if (D.hitFx) {
      D.hitFx.update(dt);
      held = state === "playing" && !online() && D.hitFx.stopping(dt);
    }
    if (state === "playing" && run && !run.ended) {
      if (!held) updatePlaying(dt);
    } else if (state === "brawl" && D.brawl && D.brawl.update) {
      D.brawl.update(dt);
    } else if (state === "farm" && D.farm && D.farm.update) {
      D.farm.update(dt);
      stepWorldAway(dt);
    } else {
      D.input.poll();
      if (run && !run.ended && missionAuth && online() && (state === "levelup" || state === "paused" || (state === "shop" && shopReturnState !== "farm") || state === "evolution")) onlineIdle(dt);
    }
    if (state === "evolution") {
      evoTimer -= dt;
      if (run) {
        updateFx(dt);
        if (evoTimer <= 0) {
          setState("playing");
          resumeAfterIntermission();
        }
      }
    } else if (run && (state === "playing" || state === "levelup" || state === "paused")) {
      if (state === "playing" && !held) updateFx(dt);
    }
    if (noticeToastTimer > 0 && state !== "playing") tickNoticeToast(dt);
    if (run && (state === "playing" || state === "levelup" || state === "paused" || state === "evolution" || state === "farm" || state === "shop")) updateHud();
    draw();
    requestAnimationFrame(frame);
  }

  /* Keeping up on any machine (Nov 16). The frame is fill-rate bound: almost
   * all of its cost is pixels, not game logic. So when frames run slow for
   * a while the picture is drawn at a lower resolution and stretched (PERF.q
   * steps down, never back up in the same session), and a browser that is
   * drawing without the graphics card gets told so once. */
  var PERF = { q: 1, steps: [1, 0.75, 0.55, 0.4], i: 0, acc: 0, n: 0, wait: 3, soft: false, told: false, slowMs: 30 };
  function perfProbe() {
    try {
      var gl = D.gl && D.gl.renderer && D.gl.renderer.gl, ext = gl && gl.getExtension("WEBGL_debug_renderer_info");
      var name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "") : "";
      PERF.name = name;
      if (/swiftshader|llvmpipe|software|basic render/i.test(name)) { PERF.soft = true; PERF.i = 2; PERF.q = PERF.steps[2]; }
    } catch (e) {}
  }
  function perfTick(rawDt) {
    if (state !== "playing" && state !== "farm") { PERF.acc = PERF.n = 0; return; }
    if (PERF.soft && !PERF.told && state === "playing") {
      PERF.told = true;
      showNoticeToast("This browser is drawing without your graphics card, so the game is running in low detail. Turn on graphics (hardware) acceleration in the browser's settings and restart it.");
      noticeToastTimer = 9;
    }
    if (PERF.wait > 0) { PERF.wait -= rawDt; return; }
    if (rawDt > 0.5) return;                      /* a tab switch or a hitch, not a slow machine */
    PERF.acc += rawDt; PERF.n += 1;
    if (PERF.n < 90) return;
    var avg = (PERF.acc / PERF.n) * 1000;
    PERF.acc = PERF.n = 0;
    if (avg > PERF.slowMs && PERF.i < PERF.steps.length - 1) {
      PERF.i += 1; PERF.q = PERF.steps[PERF.i]; PERF.wait = 3;
      resize();
    }
  }
  D.perf = PERF;

  function resize() {
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2) * PERF.q;
    canvas.width = Math.max(1, Math.floor(viewW * dpr));
    canvas.height = Math.max(1, Math.floor(viewH * dpr));
    canvas.style.width = viewW + "px";
    canvas.style.height = viewH + "px";
    if (D.sprites && D.sprites.setViewSize) D.sprites.setViewSize(viewW, viewH);
    if (D.gl && D.gl.renderer && D.gl.renderer.resize) D.gl.renderer.resize(viewW, viewH, dpr);
    if (state === "shop") updateShopScrollHint();
    if (state === "bank") paintBankPreviews();
  }

  function togglePause() {
    if (state === "playing") setState("paused");
    else if (state === "paused") setState("playing");
  }

  function stampHudIcons() {
    var map = { hp: "bar-label-hp", xp: "bar-label-xp", food: "bar-label-food", joy: "bar-label-joy" };
    var name, node, ico, img;
    for (name in map) {
      node = $(map[name]) || document.querySelector('[data-ico="' + name + '"]');
      ico = D.sprites.getIcon && D.sprites.getIcon(name);
      if (!node || !ico) continue;
      if (node.querySelector("img")) continue;
      img = document.createElement("img");
      img.src = ico.toDataURL();
      img.alt = "";
      img.width = 24;
      img.height = 24;
      img.className = "hud-ico";
      node.insertBefore(img, node.firstChild);
    }
  }

  function showWebGLUnsupported(reason) {
    var box = $("webgl-unsupported");
    var why = $("webgl-unsupported-reason");
    if (why && reason) why.textContent = reason;
    if (box) box.hidden = false;
  }

  function boot() {
    canvas = $("game");
    ctx = null;
    if (D.gl && D.gl.attach) {
      D.gl.renderer = D.gl.attach(canvas, { viewW: viewW, viewH: viewH });
    }
    if (!D.gl || !D.gl.renderer || !D.gl.renderer.ok) {
      showWebGLUnsupported((D.gl && D.gl.renderer && D.gl.renderer.reason) || "WebGL is not available in this browser.");
    } else {
      ctx = D.gl.renderer.ctx;
      canvas.addEventListener("webglcontextlost", function () {
        var r = $("webgl-restore");
        if (r) r.hidden = false;
      });
      canvas.addEventListener("webglcontextrestored", function () {
        var r = $("webgl-restore");
        if (r) r.hidden = true;
        if (D.gl && D.gl.renderer) {
          ctx = D.gl.renderer.ctx;
          resize();
        }
      });
    }
    el = {
      hud: $("hud"),
      barTamer: $("bar-tamer"),
      barHp: $("bar-hp"),
      carryRow: $("carry-row"),
      barXp: $("bar-xp"),
      barFull: $("bar-full"),
      barHappy: $("bar-happy"),
      hudTimer: $("hud-timer"),
      minimap: $("minimap"),
      minimapWrap: $("minimap-wrap"),
      hudSeason: $("hud-season"),
      hudSeasonYear: $("hud-season-year"),
      hudSeasonName: $("hud-season-name"),
      hudFarm: $("hud-farm"),
      hudWeather: $("hud-weather"),
      promptBar: $("prompt-bar"),
      farmScreen: $("farm-screen"),
      hudLevel: $("hud-level"),
      hudKills: $("hud-kills"),
      hudCapture: $("hud-capture"),
      hudForm: $("hud-form"),
      hudBits: $("hud-bits"),
      bagRow: $("bag-row"),
      btnShop: $("btn-shop"),
      btnCapture: $("btn-capture"),
      shopScreen: $("shop-screen"),
      bankScreen: $("bank-screen"),
      cosmeticsScreen: $("cosmetics-screen"),
      pauseExtra: $("pause-extra"),
      evoStrip: $("evo-strip"),
      moodStrip: $("mood-strip"),
      despBanner: $("desperation-banner"),
      vignette: $("vignette"),
      title: $("title-screen"),
      tamerScreen: $("tamer-screen"),
      tamerRow: $("tamer-row"),
      eggScreen: $("egg-screen"),
      eggRow: $("egg-row"),
      levelup: $("levelup-screen"),
      pause: $("pause-screen"),
      evoScreen: $("evolution-screen"),
      gameover: $("gameover-screen"),
      starterRow: $("starter-row"),
      levelupCards: $("levelup-cards"),
      levelupSub: $("levelup-sub"),
      pauseForm: $("pause-form"),
      pauseCare: $("pause-care"),
      evoFrom: $("evo-from"),
      evoTo: $("evo-to"),
      evoFromCv: $("evo-from-cv"),
      evoToCv: $("evo-to-cv"),
      evoToSide: $("evo-to-side"),
      evoPopFlash: $("evo-pop-flash"),
      debugEvoLog: $("debug-evo-log"),
      evoNote: $("evo-note"),
      goTitle: $("go-title"),
      goSub: $("go-sub"),
      goUnlock: $("go-unlock"),
      goSummary: $("go-summary"),
      debug: $("debug-panel"),
      joystick: $("joystick"),
      help: $("help-box"),
      tierDebug: $("tier-debug"),
      secretVeil: $("secret-veil"),
      brawlScreen: $("brawl-screen")
    };

    var params = {};
    try {
      var q = (location.search || "").replace(/^\?/, "").split("&");
      var i, p;
      for (i = 0; i < q.length; i++) {
        p = q[i].split("=");
        if (p[0]) params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || "1");
      }
    } catch (e) {}
    /* Locked: only the developer passcode (js/devlock.js) turns this on. */
    debug = !!(D.devLock && D.devLock.allowDebug(params.debug));
    cleanHud = params.hud === "clean" || params.hud === "0" || params.hidepanel === "1" || params.hide === "1";
    if (params.seed) D._shotSeed = (parseInt(params.seed, 10) || 1) >>> 0;
    if (D.rarity && D.rarity.setDebugEnabled) {
      D.rarity.setDebugEnabled(debug && (params.tiers === "1" || params.tiers === "true" || params.tierdebug === "1"));
    }

    loadSave();
    perfProbe();
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("contextmenu", function (e) { e.preventDefault(); });

    D.input.setup();
    D.input.bindJoystick($("joystick"), $("joy-base"), $("joy-knob"));
    if (navigator.maxTouchPoints > 0) $("joystick").classList.add("is-forced");
    (function bindReviveButton() {
      var btn = $("btn-revive");
      if (!btn || !D.input || !D.input.setTouchReviveHeld) return;
      function on(e) { e.preventDefault(); D.input.setTouchReviveHeld(true); btn.classList.add("is-held"); }
      function off() { D.input.setTouchReviveHeld(false); btn.classList.remove("is-held"); }
      btn.addEventListener("pointerdown", on);
      window.addEventListener("pointerup", off);
      window.addEventListener("pointercancel", off);
    })();

    D.input.on("confirm", function () {
      if (state === "brawl" && D.brawl) { D.brawl.confirm(); return; }
      if (state === "farm" && D.farm) { D.farm.interact(); return; }
      confirmMenu();
    });
    D.input.on("back", function () {
      if (feedMenu.open) { closeFeedMenu(); return; }
      if (state === "brawl" && D.brawl) { D.brawl.back(); return; }
      if (state === "farm" && D.farm) { D.farm.end("ready"); return; }
      if (state === "paused") setState("playing");
      else if (state === "shop") closeShop();
      else if (state === "bank") closeBank();
      else if (state === "tamer") { if (D.online && D.online.cancelSetup) D.online.cancelSetup(); setState("title"); }
      else if (state === "egg") setState("tamer");
      else if (state === "lobby" || state === "join") { if (D.online && D.online.leave) D.online.leave("back"); setState("title"); }
      else if (state === "gameover") { if (D.online && D.online.leave) D.online.leave("title"); setState("title"); run = null; }
    });
    D.input.on("pause", function () {
      if (state === "brawl" && D.brawl) { D.brawl.togglePause(); return; }
      if (state === "farm") return;
      togglePause();
    });
    D.input.on("nav", function (dir) {
      if (state === "brawl" && D.brawl) { D.brawl.nav(dir); return; }
      if (state !== "playing" && state !== "farm") focusMenu(dir);   /* at the farm the keys only walk: the buttons are for the mouse */
    });
    D.input.on("shop", function () { if (state === "playing" || state === "farm") openShop(); });
    D.input.on("capture", function () { if (state === "playing") tryCapture(); });
    D.input.on("useMedicine", function () { if (state === "farm") useMedicine(); else if (state === "playing") doBurst(); });
    if ($("burst-chip")) $("burst-chip").addEventListener("click", function () { doBurst(); });
    /* E is the one interact key: the shop, a spire or cache, a Digimon you can
     * catch, a DNA partner, in that order, whichever is in reach. (C and J
     * still work for catching and DNA; nothing on screen mentions them.) */
    D.input.on("interact", function () { interactNow(); });
    function interactNow() {
      var ct;
      if (state === "farm" && D.farm) { D.farm.interact(); return; }
      if (state !== "playing") return;
      if (merchantInRange()) { openShop(); return; }
      if (usableProp()) { tryUseProp(); return; }
      ct = captureTarget();
      if (ct && chargeReadyFor(ct)) { tryCapture({ enemy: ct }); return; }
      if (!dnaBox && dnaMate()) { dnaAsk(); return; }
      if (ct) tryCapture({ enemy: ct });   /* not ready yet: say why */
    }
    D.input.on("feed", function () { toggleFeedMenu(); });

    /* ---- controller: the buttons a run needs, and steering the small windows ---- */
    function padPopup() {
      if (state !== "playing" && state !== "farm") return null;
      var b;
      if (dnaBox && (b = $("dna-box")) && !b.hidden) return b;
      if (evoOfferShown() && (b = $("evo-offer")) && !b.hidden) return b;
      if (feedMenu.open && (b = $("feed-menu")) && !b.hidden) return b;
      if ((b = $("skills-panel")) && !b.hidden) return b;
      if ((b = $("stats-panel")) && !b.hidden) return b;
      return null;
    }
    function padButtons(box) {
      return Array.prototype.filter.call(box.querySelectorAll("button"), function (n) {
        return !n.hidden && !n.disabled && n.offsetParent !== null && !/close$/.test(n.id || "");
      });
    }
    function padMark(box, step) {
      var list = padButtons(box), i = +(box.getAttribute("data-pad") || 0);
      if (!list.length) return null;
      if (box.getAttribute("data-pad") == null || list.indexOf(box._padSel) < 0) i = 0;
      else i = (list.indexOf(box._padSel) + (step || 0) + list.length) % list.length;
      list.forEach(function (n, k) { n.classList.toggle("is-padsel", k === i); });
      box.setAttribute("data-pad", i);
      box._padSel = list[i];
      return list[i];
    }
    function padClose(box) {
      if (!box) return;
      if (box.id === "dna-box") dnaPick(-1);
      else if (box.id === "evo-offer") answerEvoOffer(false);
      else if (box.id === "feed-menu") closeFeedMenu();
      else if (box.id === "skills-panel") toggleSkills(false);
      else if (box.id === "stats-panel") toggleStats(false);
    }
    function padActive() { return D.input.lastSource === "gamepad"; }
    D.input.on("nav", function (dir) {
      var box;
      if (!padActive() || !(box = padPopup())) return;
      padMark(box, dir);
    });
    D.input.on("confirm", function () {
      var box, b;
      if (!padActive() || !(box = padPopup())) return;
      b = box._padSel && box.contains(box._padSel) ? box._padSel : padMark(box, 0);
      if (b) { b.click(); sfx("ui"); }
      setTimeout(function () { var bx = padPopup(); if (bx) padMark(bx, 0); }, 60);
    });
    D.input.on("back", function () {
      var box;
      if (!padActive() || !(box = padPopup()) || box.id === "feed-menu") return;   /* the feed menu already closes on back */
      padClose(box);
    });
    D.input.on("padButton", function (b) {
      if (state !== "playing") return;
      if (b === "lb") toggleFeedMenu();
      else if (b === "rb") doBurst();
      else if (b === "lt") askFarm();
      else if (b === "select") { if (skillsActive()) toggleSkills(); }
      else if (b === "r3") { if (statsActive()) toggleStats(); }
      else if (b === "l3") togglePvp();
      else if (b === "rt") sendPartnerAtAim();
    });
    setInterval(function () {
      var box = padActive() ? padPopup() : null;
      D.input.padMenu = !!box;
      if (box && !(box._padSel && box.contains(box._padSel) && box._padSel.offsetParent)) padMark(box, 0);
      if (!box) Array.prototype.forEach.call(document.querySelectorAll(".is-padsel"), function (n) { n.classList.remove("is-padsel"); });
    }, 120);

    /* ---- what the phone buttons need to know, and what they do ---- */
    D.hud = {
      act: function (what) {
        if (what === "burst") doBurst();
        else if (what === "farm") askFarm();
        else if (what === "feed") toggleFeedMenu();
        else if (what === "skills") { if (skillsActive()) toggleSkills(); }
        else if (what === "stats") { if (statsActive()) toggleStats(); }
        else if (what === "pvp") togglePvp();
        else if (what === "shop") { if (state === "playing" || state === "farm") openShop(); }
        else if (what === "interact") interactNow();
      },
      info: function () {
        var o = { on: !!(run && !run.ended && state === "playing"), egg: true }, ct, T;
        if (!o.on) return o;
        o.egg = isEggForm(run.form);
        T = myUlt();
        o.burstName = T ? T.name : "Warp";
        o.burstPct = run.burstLeft > 0 ? Math.round(100 * run.burstLeft / ((D.BURST && D.BURST.time) || 1)) : Math.floor(run.burst || 0);
        o.burstLive = run.burstLeft > 0;
        o.burstOn = !!D.BURST && !o.egg;
        o.farmOn = farmOnDemand() && !o.egg;
        o.farmGoing = farmGo ? Math.max(0, farmGo.left) : 0;
        o.act = merchantInRange() ? "Shop" : usableProp() ? "Use" : null;
        if (!o.act) { ct = captureTarget(); if (ct && chargeReadyFor(ct)) o.act = "Catch"; }
        if (!o.act && !dnaBox && dnaMate()) o.act = "DNA";
        o.feedOn = !o.egg;
        o.down = !!(run.downed || run.faint > 0);
        o.pvp = !!D.PVP;
        o.pvpUp = !!run.pvpFlag;
        return o;
      }
    };
    window.addEventListener("keydown", function (ev) {
      if (ev.repeat || state !== "playing") return;
      var tg = ev.target && ev.target.tagName;
      if (tg === "INPUT" || tg === "TEXTAREA") return;
      if (!dnaBox && skillsUi.open && skillsUi.cards && ev.key >= "1" && ev.key <= "9" && skillsUi.cards[+ev.key - 1]) {
        addSkill(skillsUi.cards[+ev.key - 1]); ev.preventDefault(); ev.stopImmediatePropagation(); return;
      }
      if (dnaBox) {
        if (ev.key >= "1" && ev.key <= "9") { dnaPick(+ev.key - 1); ev.preventDefault(); ev.stopImmediatePropagation(); }
        else if (ev.key === "n" || ev.key === "N" || ev.key === "Escape") { dnaPick(-1); ev.preventDefault(); ev.stopImmediatePropagation(); }
      }
    }, true);
    if ($("dna-hint")) $("dna-hint").addEventListener("click", function () { dnaAsk(); });
    window.addEventListener("keydown", function (ev) {
      if (!evoOfferShown() || ev.repeat) return;
      if (ev.key === "y" || ev.key === "Y") answerEvoOffer(true);
      else if (ev.key === "n" || ev.key === "N") answerEvoOffer(false);
    });
    window.addEventListener("keydown", function (ev) {
      if (ev.repeat || !(ev.key === "t" || ev.key === "T")) return;
      if (ev.target && /INPUT|TEXTAREA/.test(ev.target.tagName || "")) return;
      if (statsActive()) toggleStats();
    });
    window.addEventListener("keydown", function (ev) {
      if (ev.repeat || !(ev.key === "g" || ev.key === "G")) return;
      if (ev.target && /INPUT|TEXTAREA/.test(ev.target.tagName || "")) return;
      askFarm();
    });
    if ($("hud-farm")) $("hud-farm").addEventListener("click", function () { askFarm(); });
    window.addEventListener("keydown", function (ev) {
      if (ev.repeat || debug || !(ev.key === "v" || ev.key === "V")) return;
      if (ev.target && /INPUT|TEXTAREA/.test(ev.target.tagName || "")) return;
      togglePvp();
    });
    if ($("hud-pvp")) $("hud-pvp").addEventListener("click", function () { togglePvp(); });
    window.addEventListener("keydown", function (ev) {
      if (ev.repeat || !(ev.key === "k" || ev.key === "K")) return;
      if (ev.target && /INPUT|TEXTAREA/.test(ev.target.tagName || "")) return;
      if (skillsActive()) toggleSkills();
    });
    if ($("skills-chip")) $("skills-chip").addEventListener("click", function () { toggleSkills(); });
    if ($("skills-close")) $("skills-close").addEventListener("click", function () { toggleSkills(false); });
    if ($("stats-chip")) $("stats-chip").addEventListener("click", function () { toggleStats(); });
    if ($("stats-close")) $("stats-close").addEventListener("click", function () { toggleStats(false); });
    if ($("btn-evo-yes")) $("btn-evo-yes").addEventListener("click", function () { answerEvoOffer(true); });
    if ($("btn-evo-no")) $("btn-evo-no").addEventListener("click", function () { answerEvoOffer(false); });
    D.input.on("slot", function (i) {
      if (feedMenu.open) { feedPick(i); return; }
      if (state === "farm" && D.farm) D.farm.selectSlot(i);
    });
    D.input.on("slotDelta", function (dir) {
      if (state === "farm" && D.farm) D.farm.scrollSlot(dir);
    });
    D.input.on("menu", function () {
      if (state === "playing") setState("paused");
      else if (state === "paused") setState("playing");
      else if (state === "shop") closeShop();
    });
    D.input.on("source", function () {
      if (D.input && D.input.applyGlyphs) D.input.applyGlyphs();
      if (el.promptBar) {
        el.promptBar.setAttribute("data-source", D.input.lastSource);
      }
    });

    if (D.farm && D.farm.install) {
      D.farm.install({
        sfx: sfx,
        getRun: function () { return run; },
        setState: setState,
        warn: function (mark, left) {
          var msg = mark <= 5 ? "Farm visit in 5 seconds!" : "Farm visit in 15 seconds";
          showNoticeToast(msg);
          if (el.hudFarm) {
            el.hudFarm.hidden = false;
            el.hudFarm.textContent = "Farm in 00:" + (mark < 10 ? "0" : "") + mark;
            el.hudFarm.classList.toggle("is-warn", mark === 15);
            el.hudFarm.classList.toggle("is-urgent", mark === 5);
          }
        },
        float: function (x, y, text, color) {
          addFloat(x, y, text, color);
          if (state === "farm") showNoticeToast(text);
        },
        useItem: useBagItem,
        openShop: openShop,
        getBank: function () { return (save && save.digibank) || []; },
        act: function (intent) { return missionAuth ? missionAuth.act(intent) : { ok: false, reason: "no-auth" }; },
        hasAuth: function () { return !!missionAuth; },
        getAuth: function () { return missionAuth; },
        localId: function () { return missionLocalId; },
        onReturn: function (reason) {
          applyPendingBoost();
          if (state === "farm" || (D.farm && !D.farm.isActive())) setState("playing");
          updateHud();
        }
      });
    }

    if (D.brawl && D.brawl.install) {
      D.brawl.install({
        sfx: sfx,
        isEggForm: isEggForm,
        onDone: function (m) {
          if (state === "brawl") setState("playing");
          if (m && m.skipped) addFloat(run.x, run.y - 28, "Brawl skipped — no challengers", "#ffe080");
          resumeAfterIntermission();
        },
        onSkip: function () {
          if (state === "brawl") setState("playing");
          if (run) addFloat(run.x, run.y - 28, "Brawl skipped — no challengers", "#ffe080");
          resumeAfterIntermission();
        }
      });
    }
    if ($("brawl-atk")) {
      $("brawl-atk").addEventListener("click", function (e) {
        e.preventDefault();
        if (D.brawl && D.brawl.queueAttack) D.brawl.queueAttack();
      });
    }
    if ($("btn-brawl-resume")) {
      $("btn-brawl-resume").addEventListener("click", function () {
        if (D.brawl) D.brawl.togglePause();
      });
    }
    if ($("btn-brawl-skip")) {
      $("btn-brawl-skip").addEventListener("click", function () {
        if (D.brawl && D.brawl.get && D.brawl.get()) {
          var m = D.brawl.get();
          if (D.brawl.forcePhase) D.brawl.forcePhase("result");
          else if (D.brawl.finish) D.brawl.finish();
        }
      });
    }

    if ($("btn-cpu-minus")) $("btn-cpu-minus").addEventListener("click", function () { setCpuBots(selectedCpuBots - 1); sfx("ui"); });
    if ($("btn-cpu-plus")) $("btn-cpu-plus").addEventListener("click", function () { setCpuBots(selectedCpuBots + 1); sfx("ui"); });
    if ($("btn-cabinet")) $("btn-cabinet").addEventListener("click", function () { setState("cosmetics"); sfx("ui"); });
    if ($("btn-log")) $("btn-log").addEventListener("click", function () { if (D.evoLog) D.evoLog.open(); sfx("ui"); });
    if ($("btn-pause-log")) $("btn-pause-log").addEventListener("click", function () { if (D.evoLog) D.evoLog.open(); sfx("ui"); });
    if ($("btn-cosmetics-back")) $("btn-cosmetics-back").addEventListener("click", function () { setState("title"); sfx("ui"); });
    $("btn-start").addEventListener("click", function () {
      if (!isUnlocked(selectedStarter)) return;
      setState("tamer");
    });
    if ($("btn-bank")) $("btn-bank").addEventListener("click", function () { openBank(); });
    if ($("btn-bank-back")) $("btn-bank-back").addEventListener("click", function () { closeBank(); });
    if ($("btn-bank-deploy")) $("btn-bank-deploy").addEventListener("click", function () { deploySelected(); });
    if ($("btn-bank-clear")) $("btn-bank-clear").addEventListener("click", function () { save.bankDeploy = null; writeSave(); renderBank(); });
    if ($("btn-bank-release")) $("btn-bank-release").addEventListener("click", function () { armBankRelease(); });
    if ($("btn-bank-release-yes")) $("btn-bank-release-yes").addEventListener("click", function () { confirmBankRelease(); });
    if ($("btn-bank-release-no")) $("btn-bank-release-no").addEventListener("click", function () { bankConfirming = false; renderBank(); });
    if ($("btn-shop-close")) $("btn-shop-close").addEventListener("click", function () { closeShop(); });
    if ($("btn-shop")) $("btn-shop").addEventListener("click", function () { if (state === "playing" || state === "paused") openShop(); });
    if ($("btn-capture")) $("btn-capture").addEventListener("click", function () { if (state === "playing") tryCapture(); });
    if ($("btn-tamer-start")) {
      $("btn-tamer-start").addEventListener("click", function () { confirmTamerAndStart(); });
    }
    if ($("btn-tamer-back")) {
      $("btn-tamer-back").addEventListener("click", function () { setState("title"); });
    }
    if ($("btn-egg-start")) {
      $("btn-egg-start").addEventListener("click", function () { confirmEggAndStart(); });
    }
    if ($("btn-egg-back")) {
      $("btn-egg-back").addEventListener("click", function () { setState("title"); });
    }
    $("btn-help").addEventListener("click", function () {
      helpOn = !helpOn;
      el.help.hidden = !helpOn;
    });
    $("btn-pause").addEventListener("click", togglePause);
    $("btn-resume").addEventListener("click", function () { setState("playing"); });
    $("btn-quit").addEventListener("click", function () { if (D.online && D.online.leave) D.online.leave("quit"); endRun(); setState("title"); run = null; });
    $("btn-retry").addEventListener("click", function () {
      /* Online: back to the lobby together instead of a private restart. */
      if (D.online && D.online.afterRun && D.online.afterRun()) { run = null; return; }
      var s = run ? run.starter : selectedStarter;
      startRun(s);
    });
    $("btn-title").addEventListener("click", function () { if (D.online && D.online.leave) D.online.leave("title"); setState("title"); run = null; });
    $("btn-mute").addEventListener("click", function () {
      muted = !muted;
      if (D.audio) D.audio.setMuted(muted);
      $("btn-mute").textContent = muted ? "\u2715" : "\u266a";
      $("btn-mute").title = muted ? "Sound is off" : "Sound is on";
    });
    if ($("btn-music")) {
      var paintMusic = function () { var on = !D.audio || D.audio.musicOn(); $("btn-music").classList.toggle("is-off", !on); $("btn-music").title = on ? "Music is on" : "Music is off"; };
      paintMusic();
      $("btn-music").addEventListener("click", function () { if (D.audio) D.audio.setMusic(!D.audio.musicOn()); paintMusic(); });
    }
    if ($("btn-fx")) {
      $("btn-fx").addEventListener("click", function () {
        reducedFx = !reducedFx;
        D.reducedFx = reducedFx;
        persistSettings();
        $("btn-fx").textContent = reducedFx ? "Effects: Reduced" : "Effects: Full";
        sfx("ui");
      });
    }

    var dbgBtns = el.debug.querySelectorAll("button[data-dbg]");
    var bi;
    for (bi = 0; bi < dbgBtns.length; bi++) {
      dbgBtns[bi].addEventListener("click", (function (n) {
        return function () { debugAction(n); };
      })(dbgBtns[bi].getAttribute("data-dbg")));
    }

    if ($("btn-hide-debug")) {
      $("btn-hide-debug").addEventListener("click", function () { setCleanHud(true); });
    }

    /* Debug keys: F food, H happy, X xp, E meet evo, K hurt, U hide panel */
    window.addEventListener("keydown", function (ev) {
      if (!debug) return;
      if (state === "farm" && ("eEfF123456789".indexOf(ev.key) >= 0 || ev.key === "Tab")) return;
      if (ev.key === "u" || ev.key === "U") { setCleanHud(!cleanHud); return; }
      if (ev.key === "F") debugAction("food");
      if (ev.key === "G") debugAction("feed");
      if (ev.key === "H") debugAction("happy");
      if (ev.key === "X") debugAction("xp");
      if (ev.key === "E") debugAction("evo");
      if (ev.key === "y" || ev.key === "Y") debugAction("hatch");
      if (ev.key === "1") debugAction("baby");
      if (ev.key === "2") debugAction("training");
      if (ev.key === "3") debugAction("rookie");
      if (ev.key === "4") debugAction("champion");
      if (ev.key === "K") debugAction("hurt");
      if (ev.key === "M") debugAction("hurtmon");
      if (ev.key === "]" || ev.key === ".") debugAction("cycle");
      if (ev.key === "[" || ev.key === ",") debugAction("cycleback");
      if (ev.key === "b" || ev.key === "B") debugAction("eval");
      if (ev.key === "=" || ev.key === "$" || ev.key === "+") debugAction("bits");
      if (ev.key === "o" || ev.key === "O") debugAction("shop");
      if (ev.key === "v" || ev.key === "V") debugAction("capture");
      if (ev.key === "n" || ev.key === "N") debugAction("charge");
      if (ev.key === "j" || ev.key === "J") debugAction("brawl");
      if (ev.key === "I") debugAction("farm");
      if (ev.key === "L") debugAction("overtime");
      if (ev.key === "T") debugAction("healorb");
      if (ev.key === "Z") debugAction("farmdue");
    });

    function finishBoot() {
      stampHudIcons();
      setState("title");
      requestAnimationFrame(frame);
    }
    var bootP = loadSave();
    if (D.storage) {
      bootP = bootP.then(function () { return D.storage.loadSettings(); }).then(function (s) {
        if (s && s.reducedFx) { reducedFx = true; D.reducedFx = true; }
        if (s && s.selectedTamer && isKnownTamer(s.selectedTamer)) selectedTamer = s.selectedTamer;
        if (s && s.selectedEgg) selectedEgg = s.selectedEgg;
        if (s && s.mode && modeDef(s.mode)) selectedMode = s.mode;
        if (s && s.cpuBots != null) selectedCpuBots = Math.max(0, Math.min(((D.BRAWL_CFG && D.BRAWL_CFG.botCountMax) || 5), s.cpuBots | 0));
        renderPartyOption();
      });
      if (D.cosmetics && D.cosmetics.load) {
        bootP = Promise.resolve(bootP).then(function () { return D.cosmetics.load(); }).then(function () {
          renderPartyOption();
          if (D.cosmetics.applyDom) D.cosmetics.applyDom();
          if (D.cosmetics.onChange) D.cosmetics.onChange(function () { renderPartyOption(); });
        });
      }
    }
    if (D.sprites && D.sprites.loadOfficial) {
      bootP = Promise.resolve(bootP).then(function () { return D.sprites.loadOfficial(); });
    }
    if (D.sprites && D.sprites.loadTamer) {
      bootP = Promise.resolve(bootP).then(function () { return D.sprites.loadTamer(); });
    }
    if (D.sprites && D.sprites.loadEggs) {
      bootP = Promise.resolve(bootP).then(function () { return D.sprites.loadEggs(); });
    }
    Promise.resolve(bootP).then(finishBoot).catch(finishBoot);
  }

  D.state = state;
  D.uiSfx = function (name) { sfx(name); };
  /* Narrow bridge for js/net/online.js (online play). */
  D.bridge = {
    getAuth: function () { return missionAuth; },
    setAuth: function (auth, localId) {
      missionAuth = auth;
      D.missionAuth = auth;
      if (localId) missionLocalId = localId;
      missionEvents = [];
      holdAuthEvents(auth);
    },
    localId: function () { return missionLocalId; },
    account: function () { return missionAccount(); },
    persist: function (acc) {
      if (D.cosmetics && D.cosmetics.applyAuthoritative) D.cosmetics.applyAuthoritative(acc);
      applyAuthoritativeAccount(acc);
    },
    view: function () { return { w: viewW, h: viewH }; },
    toast: function (text, cls) { showNoticeToast(text, cls); },
    float: function (x, y, text, color) { addFloat(x, y, text, color); },
    endRun: function () { endRun(); },
    dropRun: function () { run = null; missionAuth = null; D.missionAuth = null; },
    pushEvents: function (list) { if (list && list.length) Array.prototype.push.apply(missionEvents, list); },
    startFarm: function () { return startFarm({ scheduled: true, fromAuth: true }); },
    selected: function () { return { tamer: selectedTamer, egg: selectedEgg, starter: selectedStarter }; },
    isDebug: function () { return debug; }
  };
  D.getRun = function () { return run; };
  if (D.hitFx) D.hitFx.attach({ particle: addParticle, reduced: function () { return reducedFx; } });
  /* for the profile card */
  D.setTamer = function (id) { if (isKnownTamer(id)) selectedTamer = id; };
  D.saveInfo = function () {
    var n = 0, i, list = D.EGGS || [];
    for (i = 0; i < list.length; i++) if (list[i].starter || save.eggUnlocks[list[i].id]) n += 1;
    var mt = {}, k;
    for (k in (save.memories || {})) if (save.memories[k] && save.memories[k].tier) mt[k] = save.memories[k].tier;
    return { eggs: n, eggsTotal: list.length, bestTime: save.bestTime || 0, bestForm: save.bestForm || "", memTiers: mt, trophies: (save.trophies || []).length, rivalWins: (save.hub && save.hub.rivalWins) || 0 };
  };
  D.getState = function () { return state; };
  D.debugAction = debugAction;
  D.startRun = startRun;
  D.getMissionAuth = function () { return missionAuth; };
  D.startBrawl = startBrawl;
  D.maybeStartBrawl = maybeStartBrawl;
  D.startFarm = startFarm;
  D.openFarm = startFarm;
  D.maybeStartFarm = maybeStartFarm;
  D.resumeAfterIntermission = resumeAfterIntermission;
  D.ensureSession = ensureSession;
  D.getSession = function () { return run && run.session; };
  D.getBrawl = function () { return D.brawl && D.brawl.get ? D.brawl.get() : null; };
  D.getSelectedTamer = function () { return selectedTamer; };
  D.setSelectedTamer = function (id) { if (isKnownTamer(id)) selectedTamer = id; };
  D.getSelectedEgg = function () { return selectedEgg; };
  /* what js/hub.js reads and sets: the same choices the old menus made */
  function menuEggs() {
    var list = D.EGGS || [], out = [], i, d, st, firstOpen = null;
    for (i = 0; i < list.length; i++) {
      d = list[i]; st = eggState(d);
      if (st.open && !firstOpen) firstOpen = d;
      out.push({ id: d.id, name: d.name, frame: d.frame, locked: !st.open, hatch: d.hatch,
        blurb: st.open ? (d.blurb || "") : "Locked. Raise one to Rookie in the Hatchery to open this line." });
    }
    /* your Hatchery partner, once it has hatched: one run, instead of an egg (not online) */
    var hs = D.hatchery && !online() ? D.hatchery.state() : null;
    if (hs && hs.ready) out.unshift({ id: "hatchery", name: (D.SPECIES[hs.egg.form] && D.SPECIES[hs.egg.form].name) || hs.egg.form, hatchery: true, form: hs.egg.form, frame: firstOpen ? firstOpen.frame : "egg_08", locked: false,
      scale: [0.95, 0.9, 0.8, 0.55][hs.egg.stage - 1] || 0.7,
      blurb: "From your Hatchery: a " + D.hatchery.rules.STAGES[hs.egg.stage] + ", job level " + (D.hatchery.rules.CFG.level[hs.egg.stage - 1] || 1) + ". One run only. When it falls it is gone, and a new egg takes its place." });
    out.push({ id: "random", name: "Random egg", frame: firstOpen ? firstOpen.frame : "egg_08", random: true, locked: false, blurb: "A surprise: any egg in the game, even ones you haven't opened." });
    return out;
  }
  D.menu = { focus: function () { focusMenu(); },
    go: function (s) { setState(s); sfx("ui"); },
    start: function () { confirmEggAndStart(); },
    name: function () { return (D.profile && D.profile.name && D.profile.name()) || ""; },
    tamer: function () { return selectedTamer; },
    setTamer: function (id) { if (isKnownTamer(id)) { selectedTamer = id; persistSettings(); } },
    egg: function () { return selectedEgg; },
    setEgg: function (id) { selectedEgg = id; persistSettings(); },
    eggs: menuEggs,
    eggFrame: function () { var l = menuEggs(), i; for (i = 0; i < l.length; i++) if (l[i].id === selectedEgg) return l[i].frame; return l.length ? l[0].frame : "egg_08"; },
    cpu: function () { return selectedCpuBots; },
    mode: function () { return selectedMode; },
    modes: function () { return (D.MODES && D.MODES.list) || []; },
    setMode: function (id) { if (modeDef(id)) { selectedMode = id; persistSettings(); } return selectedMode; },
    setCpu: function (n) { return setCpuBots(n); },
    cpuMax: function () { return (D.BRAWL_CFG && D.BRAWL_CFG.botCountMax != null) ? D.BRAWL_CFG.botCountMax : 5; },
    online: function () { return !!online(); },
    eggsSeen: function () { save.hub = save.hub || {}; save.hub.eggsSeen = D.saveInfo().eggs; writeSave(); },
    /* three forms of your egg's line for the Discoveries tile: shown if you have reached them, shadows if not */
    route: function () {
      var L = lineStages(selectedEgg === "random" ? "agumon" : selectedEgg), seen = (save.discoveries && save.discoveries.species) || {};
      return [L.training, L.rookie, L.champion].map(function (id) { return { id: id, seen: !!seen[id] }; });
    },
    memoryText: memoryText,
    gear: function () { return D.items ? D.items.summary() : []; },
    trophies: trophyList,
    info: function () {
      var i = D.saveInfo(), h = save.hub || {};
      return { eggs: i.eggs, eggsTotal: i.eggsTotal, eggsSeen: h.eggsSeen == null ? i.eggs : h.eggsSeen, bits: D.cosmetics && D.cosmetics.bits ? D.cosmetics.bits() : 0,
        rival: h.lastRival || null, rivalWins: h.rivalWins || 0, rivalLosses: h.rivalLosses || 0 };
    }
  };
  D.setSelectedEgg = function (id) { selectedEgg = id; };
  D.getCpuBots = function () { return selectedCpuBots; };
  D.setCpuBots = setCpuBots;
  D.doHatch = doHatch;
  D.grantUnlock = grantUnlock;
  D.forceLineStage = forceLineStage;
  D.forceSpecies = forceSpecies;
  D.forceWeather = forceWeather;
  D.getWeather = function () { return run && run.weather; };
  D.cycleSpecies = cycleSpecies;
  D.evaluateBranches = showBranchEval;
  D.evoStats = evoStats;
  D.checkEvolution = checkEvolution;
  D.isEggForm = isEggForm;
  D.isDebug = function () { return debug; };
  D.setCleanHud = setCleanHud;
  D.isCleanHud = function () { return cleanHud; };
  D.debugClearEnemies = function () { enemies.length = 0; if (missionAuth && missionAuth.sim) missionAuth.sim.enemies.length = 0; };
  D.openShop = openShop;
  D.closeShop = closeShop;
  D.buyShopItem = buyShopItem;
  D.tryCapture = tryCapture;
  D.fillCaptureCharge = fillCaptureCharge;
  D.setCaptureKills = function (n) { var v = setCaptureKills(n); updateHud(); if (state === "shop") renderShop(); return v; };
  D.getCaptureKills = captureKills;
  D.chargeReadyFor = chargeReadyFor;
  D.addToBag = function (id, n) { if (!run) return 0; addToBag(id, n); updateHud(); return bagCount(id); };
  D.bagCount = bagCount;
  D.giveBits = function (n) { if (!run) return 0; grantBits(n == null ? 100 : n); if (state === "shop") renderShop(); updateHud(); return run.bits; };
  D.getBank = function () { return (save.digibank || []).slice(); };
  D.getSave = function () { return save; };
  D.openBank = openBank;
  D.closeBank = closeBank;
  D.swapAlly = swapAlly;
  D.useItem = useBagItem;
  D.spawnAlly = spawnAlly;
  D.clearFx = function () { floats.length = 0; particles.length = 0; if (D.attackFx) D.attackFx.clear(); };
  D.setState = setState;
  D.clearLevelUp = function () {
    pendingLevels = 0;
    if (state === "levelup") setState("playing");
  };
  D.step = function (seconds) {
    var left = seconds == null ? 0.05 : seconds;
    var n;
    if (state === "playing" && run && !run.ended) {
      while (left > 0) {
        n = Math.min(0.05, left);
        updatePlaying(n);
        left -= n;
      }
    } else if (state === "brawl" && D.brawl && D.brawl.update) {
      while (left > 0) {
        n = Math.min(0.05, left);
        D.brawl.update(n);
        left -= n;
      }
    } else if (state === "farm" && D.farm && D.farm.update) {
      while (left > 0) {
        n = Math.min(0.05, left);
        D.farm.update(n);
        left -= n;
      }
    }
    draw();
    updateHud();
    return run ? run.time : 0;
  };
  D.redraw = function () { draw(); updateHud(); };
  D.getEnemies = function () { return enemies.slice(); };
  D.getBullets = function () { return bullets.slice(); };
  function spawnDebugEnemy(type, x, y, opts) {
    opts = opts || {};
    if (!run) return null;
    var def = D.ENEMIES[type];
    var sp = D.SPECIES[type] || {};
    if (!def && !sp.id && !sp.name) return null;
    var cfg = D.MEGA_SPAWN || {};
    var fieldMega = !!opts.fieldMega;
    var baseHp = (def && def.hp) || 16;
    var hpMul = fieldMega ? (cfg.hpMul != null ? cfg.hpMul : 8) : 1;
    var px = x != null ? x : run.x + 48;
    var py = y != null ? y : run.y;
    var e = {
      _id: nextId++,
      type: type,
      x: px,
      y: py,
      hp: baseHp * hpMul,
      maxHp: baseHp * hpMul,
      facing: px < run.x ? 1 : -1,
      flash: 0,
      hitCd: 0,
      hitCdM: 0,
      slow: 1,
      slowTime: 0,
      radius: (def && def.radius) || actorRad(type) || 12,
      dead: false,
      mega: fieldMega,
      dmgMul: fieldMega ? (cfg.dmgMul != null ? cfg.dmgMul : 1.45) : 1
    };
    if (opts.hpRatio != null) e.hp = Math.max(1, e.maxHp * opts.hpRatio);
    enemies.push(e);
    if (D.sprites && D.sprites.preloadSpecies) D.sprites.preloadSpecies(type, true);
    return e;
  }
  D.debugSpawn = function (type, x, y, opts) { return spawnDebugEnemy(type, x, y, opts); };
  D.setView = function (x, y) {
    if (run) { run.x = x; run.y = y; }
    camX = x; camY = y;
  };
  D.getCam = function () { return { x: camX, y: camY, w: viewW, h: viewH, zoom: camZoom(), rot: camRot(), seed: run && run.worldSeed }; };
  D.getFps = function () { return fps; };
  D.glInfo = function () { return (D.gl && D.gl.renderer && D.gl.renderer.info) ? D.gl.renderer.info() : { ok: false, webgl: false, fullFrameBlit: false }; };
  Object.defineProperty(D, "reducedFx", { get: function () { return reducedFx; }, set: function (v) { reducedFx = !!v; } });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
