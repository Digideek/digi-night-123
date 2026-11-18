/* Authority-owned mission weather. Visuals and a player-facing name
 * are client-side; spawn, HP, damage, speed, XP, and hidden-tier
 * weighting are simulated only on the host. Tier names never appear
 * in player UI. */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});

  /* The one list of skies and their numbers (it used to be written out in
   * data.js as well, and the two had drifted apart; these are the numbers the
   * game was really using). Labels are player-facing; multipliers are the live
   * simulation values. Published as DBH.WEATHER for anything that reads it there. */
  var CATALOG = {
    clear: {
      id: "clear",
      label: "Clear",
      spawnMul: 1,
      capMul: 1,
      enemyHpMul: 1,
      enemyAtkMul: 1,
      enemySpdMul: 1,
      xpMul: 1,
      tierWeights: null,
      remapChance: 0,
      weight: 0.50
    },
    /* never in the first season; a hard stretch with better XP */
    eclipse: {
      id: "eclipse",
      label: "Eclipse",
      minTime: 360,
      spawnMul: 1.8,
      capMul: 1.5,
      enemyHpMul: 1.5,
      enemyAtkMul: 1.25,
      enemySpdMul: 1.08,
      xpMul: 1.5,
      tierWeights: null,
      remapChance: 0,
      weight: 0.28
    },
    meteorShower: {
      id: "meteorShower",
      label: "Meteor Shower",
      spawnMul: 0.9,
      capMul: 1,
      enemyHpMul: 1.15,
      enemyAtkMul: 1.1,
      enemySpdMul: 1,
      xpMul: 2,
      /* Hidden 1–5 weights. Never shown to players. */
      tierWeights: [0.4, 0.7, 1.3, 2.2, 3.0],
      remapChance: 0.62,
      weight: 0.22
    },
    /* Rain wets the field: fire on the ground burns out sooner and creeps
     * less. A thunderstorm also throws lightning (data.js STORM). */
    rain: {
      id: "rain",
      label: "Rain",
      spawnMul: 1, capMul: 1, enemyHpMul: 1, enemyAtkMul: 1, enemySpdMul: 1, xpMul: 1,
      tierWeights: null, remapChance: 0, wet: 1,
      weight: 0.30
    },
    storm: {
      id: "storm",
      label: "Thunderstorm",
      minTime: 150,
      spawnMul: 1.15, capMul: 1.1, enemyHpMul: 1, enemyAtkMul: 1, enemySpdMul: 1.04, xpMul: 1.15,
      tierWeights: null, remapChance: 0, wet: 1, lightning: 1,
      weight: 0.20
    }
  };

  var SCHEDULE = {
    firstDelay: 42,
    resumeDelay: 16,
    minDuration: 50,
    maxDuration: 70,
    fade: 6,
    afterSpecialClearBias: 1.6
  };

  var FX_CAP = 48;
  var METEOR_CAP = 16;

  function dataOf(ctx) {
    return (ctx && ctx.data) || D;
  }

  function catalogOf(ctx) {
    var w = dataOf(ctx).WEATHER;
    return (w && w.catalog) || CATALOG;
  }

  function scheduleOf(ctx) {
    var w = dataOf(ctx).WEATHER;
    return (w && w.schedule) || SCHEDULE;
  }

  function canonicalId(id) {
    if (id === "meteorTower") return "meteorShower";
    return id || "clear";
  }

  function idOf(store) {
    return canonicalId((store && store.weather && store.weather.id) || "clear");
  }

  function mods(store, ctx) {
    var cat = catalogOf(ctx);
    var id = idOf(store);
    return cat[id] || cat.clear || CATALOG.clear;
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function fadeT(store) {
    if (!store || !store.weather) return 1;
    var w = store.weather;
    var fade = w.fadeMax || 0;
    if (fade <= 0) return 1;
    var t = w.fadeT != null ? w.fadeT : fade;
    return Math.max(0, Math.min(1, t / fade));
  }

  /* Blended multipliers during a transition so modifiers do not snap or leak. */
  /* Weather mods with the current season's difficulty folded in. */
  function liveMods(store, ctx) {
    var m = weatherLiveMods(store, ctx);
    var S = D.seasons;
    return (S && S.applyTo) ? S.applyTo(m, store) : m;
  }

  function weatherLiveMods(store, ctx) {
    var cat = catalogOf(ctx);
    var cur = mods(store, ctx);
    var w = store && store.weather;
    if (!w || !w.fromId || fadeT(store) >= 1) return cur;
    var prev = cat[w.fromId] || cat.clear || CATALOG.clear;
    var t = fadeT(store);
    return {
      id: cur.id,
      label: cur.label,
      spawnMul: lerp(prev.spawnMul, cur.spawnMul, t),
      capMul: lerp(prev.capMul, cur.capMul, t),
      enemyHpMul: lerp(prev.enemyHpMul, cur.enemyHpMul, t),
      enemyAtkMul: lerp(prev.enemyAtkMul, cur.enemyAtkMul, t),
      enemySpdMul: lerp(prev.enemySpdMul, cur.enemySpdMul, t),
      xpMul: lerp(prev.xpMul, cur.xpMul, t),
      tierWeights: t >= 0.5 ? cur.tierWeights : prev.tierWeights,
      remapChance: t >= 0.5 ? cur.remapChance : prev.remapChance
    };
  }

  function makeState(id, sched, fromId) {
    sched = sched || SCHEDULE;
    return {
      id: id || "clear",
      fromId: fromId || null,
      t: 0,
      duration: 0,
      fadeT: 0,
      fadeMax: sched.fade,
      nextDelay: 0,
      locked: false
    };
  }

  function clearPhase(store, ctx) {
    var sched = scheduleOf(ctx);
    store.weather = makeState("clear", sched, null);
    store.weather.locked = true;
    store.weather.duration = 0;
    store.weather.nextDelay = 0;
    return store.weather;
  }

  function resumePlaying(store, ctx) {
    var sched = scheduleOf(ctx);
    store.weather = makeState("clear", sched, null);
    store.weather.locked = false;
    store.weather.nextDelay = sched.resumeDelay;
    store.weather.duration = 0;
    return store.weather;
  }

  function startRunWeather(store, ctx) {
    var sched = scheduleOf(ctx);
    store.weather = makeState("clear", sched, null);
    store.weather.nextDelay = sched.firstDelay;
    store.weather.locked = false;
    return store.weather;
  }

  function pickNext(store, rng, ctx) {
    var cat = catalogOf(ctx);
    var cur = idOf(store);
    var keys = Object.keys(cat);
    var i, id, rec, w, total = 0, roll;
    var weights = {};
    for (i = 0; i < keys.length; i++) {
      id = keys[i];
      rec = cat[id];
      w = rec.weight != null ? rec.weight : 0;
      /* some skies only come once a run is under way (no eclipse in Spring) */
      if (rec.minTime && ((store && store.time) || 0) < rec.minTime) w = 0;
      if (id === cur && keys.length > 1) w *= 0.35;
      if (cur !== "clear" && id === "clear") w *= (scheduleOf(ctx).afterSpecialClearBias || 1);
      if (w < 0) w = 0;
      weights[id] = w;
      total += w;
    }
    if (total <= 0) return "clear";
    roll = (rng ? rng() : Math.random()) * total;
    for (i = 0; i < keys.length; i++) {
      roll -= weights[keys[i]];
      if (roll <= 0) return keys[i];
    }
    return "clear";
  }

  function rollDuration(rng, ctx) {
    var s = scheduleOf(ctx);
    var u = rng ? rng() : Math.random();
    return s.minDuration + u * (s.maxDuration - s.minDuration);
  }

  function combatReady(opts) {
    if (!opts || !opts.combatReady) return false;
    return true;
  }

  function tick(store, dt, opts) {
    opts = opts || {};
    var sched = scheduleOf(opts);
    if (!store.weather) startRunWeather(store, opts);
    var w = store.weather;
    if (opts.phase && opts.phase !== "playing") {
      clearPhase(store, opts);
      return store.weather;
    }
    if (w.locked) return w;
    if (!combatReady(opts)) {
      w.id = "clear";
      w.fromId = null;
      w.t = 0;
      w.duration = 0;
      w.fadeT = w.fadeMax;
      return w;
    }
    if (w.fadeT < w.fadeMax) w.fadeT = Math.min(w.fadeMax, w.fadeT + dt);
    if (w.nextDelay > 0) {
      w.nextDelay -= dt;
      if (w.nextDelay > 0) return w;
      w.nextDelay = 0;
    }
    if (!w.duration) {
      var nxt = w.next || pickNext(store, opts.rng, opts);
      w.next = null;
      if (nxt !== w.id) {
        w.fromId = w.id;
        w.id = nxt;
        w.fadeT = 0;
        w.fadeMax = sched.fade;
      }
      w.t = 0;
      w.duration = rollDuration(opts.rng, opts);
      return w;
    }
    w.t += dt;
    /* the next sky is settled a minute ahead (a Weather Eye crest reads it) */
    if (!w.next && w.duration - w.t <= (sched.forecast || 60)) w.next = pickNext(store, opts.rng, opts);
    if (w.t >= w.duration) {
      w.duration = 0;
      w.t = 0;
    }
    return w;
  }

  function force(store, id, ctx) {
    var sched = scheduleOf(ctx);
    id = canonicalId(id);
    var prev = idOf(store);
    store.weather = makeState(id, sched, prev === id ? null : prev);
    store.weather.duration = rollDuration(null, ctx);
    store.weather.fadeT = store.weather.fromId ? 0 : sched.fade;
    store.weather.locked = false;
    store.weather.nextDelay = 0;
    return store.weather;
  }

  function tierOf(type, data) {
    data = data || D;
    if (data.tierOf) return Math.max(1, Math.min(5, data.tierOf(type) || 1));
    if (data.rarity && data.rarity.tierOf) return Math.max(1, Math.min(5, data.rarity.tierOf(type) || 1));
    var sp = data.SPECIES && data.SPECIES[type];
    if (sp && sp.tier) return Math.max(1, Math.min(5, sp.tier));
    return 1;
  }

  function enemyPool(data) {
    var pool = [], id, def, sp, en = (data && data.ENEMIES) || {};
    for (id in en) {
      if (!Object.prototype.hasOwnProperty.call(en, id)) continue;
      def = en[id];
      if (!def || def.boss) continue;
      sp = data.SPECIES && data.SPECIES[id];
      if (sp && sp.stage === "Egg") continue;
      pool.push(id);
    }
    return pool;
  }

  function remapType(type, store, data, rng) {
    var m = liveMods(store, { data: data });
    if (!m.tierWeights || !m.remapChance) return type;
    var roll = rng ? rng() : Math.random();
    if (roll >= m.remapChance) return type;
    var pool = enemyPool(data);
    /* Rare spawns still respect the season's timeline: nothing more than one
     * stage above what the field is made of, and no Megas in the rare-Mega
     * years. (Before, a meteor shower could drop an Ultimate on a Baby.) */
    if (data.stageTier && data.partnerStageIdx && store && store.time != null) {
      var pst = store._partnerStageIdx ? store._partnerStageIdx() : 0;
      var tier = Math.floor(data.stageTier(store.time, pst) + 1e-6);
      var megaCfg = data.MEGA_SPAWN || {};
      var hi = Math.min(tier + 1, (megaCfg.rareUntil != null && store.time < megaCfg.rareUntil) ? 4 : 5), lo = Math.max(0, tier - 1);
      pool = pool.filter(function (pid) { var si = data.partnerStageIdx(pid); return si >= lo && si <= hi; });
    }
    if (!pool.length) return type;
    var i, id, w, total = 0, weights = [];
    for (i = 0; i < pool.length; i++) {
      id = pool[i];
      w = m.tierWeights[tierOf(id, data) - 1] || 1;
      weights.push(w);
      total += w;
    }
    if (total <= 0) return type;
    roll = (rng ? rng() : Math.random()) * total;
    for (i = 0; i < pool.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  function applySpawnStats(e, store, data) {
    if (!e) return e;
    var m = liveMods(store, { data: data });
    /* HP is baked at spawn. Attack and speed use live scales so they
     * drop when a front ends and do not leak into farm or brawl. */
    e.hp *= m.enemyHpMul;
    e.maxHp *= m.enemyHpMul;
    e.weatherId = idOf(store);
    return e;
  }

  function spawnIntervalScale(store, data) {
    var m = liveMods(store, { data: data });
    return m.spawnMul || 1;
  }

  function spawnCapScale(store, data) {
    var m = liveMods(store, { data: data });
    return m.capMul || 1;
  }

  function enemySpeedScale(store, data) {
    var m = liveMods(store, { data: data });
    return m.enemySpdMul || 1;
  }

  function enemyAtkScale(store, data) {
    var m = liveMods(store, { data: data });
    return m.enemyAtkMul || 1;
  }

  function xpValue(base, store, data) {
    var m = liveMods(store, { data: data });
    return Math.max(1, Math.round((base || 0) * (m.xpMul || 1)));
  }

  function snapshot(store) {
    var w = (store && store.weather) || makeState("clear", SCHEDULE, null);
    return {
      id: w.id,
      fromId: w.fromId,
      t: w.t,
      duration: w.duration,
      fadeT: w.fadeT,
      fadeMax: w.fadeMax,
      nextDelay: w.nextDelay,
      locked: !!w.locked,
      label: ((catalogOf({}).clear && catalogOf({})[w.id]) || CATALOG[w.id] || CATALOG.clear).label
    };
  }

  /* Client-only bounded particles. Never affects simulation. */
  var fx = { motes: [], meteors: [], drops: [], splash: [], farT: 4, farFlash: 0, t: 0 };

  /* how much of weather `k` is in the sky right now, 0..1, through the fade in and out */
  function amount(store, k) {
    if (!store || !store.weather) return 0;
    var id = idOf(store), from = canonicalId(store.weather.fromId), f = fadeT(store);
    if (!store.weather.fromId) return id === k ? 1 : 0;
    return (id === k ? f : 0) + (from === k && id !== k ? 1 - f : 0);
  }
  function wetness(store) { return Math.max(amount(store, "rain"), amount(store, "storm")); }

  function draw(ctx, viewW, viewH, store, time, reduced) {
    if (!ctx || !store || !store.weather) return;
    var id = idOf(store);
    var rainA = wetness(store), stormA = amount(store, "storm");
    if (rainA > 0.01) drawRain(ctx, viewW, viewH, rainA, stormA, reduced);
    else { fx.drops.length = 0; fx.splash.length = 0; }
    if (id === "clear" && fadeT(store) >= 1 && !store.weather.fromId) return;
    var a = fadeT(store);
    if (store.weather.fromId === "eclipse" && id === "clear") a = 1 - a;
    if (canonicalId(store.weather.fromId) === "meteorShower" && id === "clear") a = 1 - a;
    var showEclipse = id === "eclipse" || store.weather.fromId === "eclipse";
    var showMeteor = canonicalId(id) === "meteorShower" || canonicalId(store.weather.fromId) === "meteorShower";
    var cap = reduced ? Math.min(18, FX_CAP) : FX_CAP;
    var mcap = reduced ? 8 : METEOR_CAP;
    fx.t = time || 0;

    if (showEclipse && a > 0.01) {
      ctx.save();
      ctx.globalAlpha = 0.55 * a;
      ctx.fillStyle = "rgba(8, 6, 22, 1)";
      ctx.fillRect(0, 0, viewW, viewH);
      /* (The tint covers the whole screen evenly; no separate band across the top.) */
      /* Occulted sun, upper-right. */
      var cx = viewW * 0.78, cy = viewH * 0.16, r = Math.min(viewW, viewH) * 0.07;
      ctx.globalAlpha = 0.85 * a;
      ctx.fillStyle = "#f0d080";
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.95 * a;
      ctx.fillStyle = "#0b0814";
      ctx.beginPath();
      ctx.arc(cx + r * 0.22, cy - r * 0.08, r * 0.92, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      maintainMotes(viewW, viewH, cap, a, time);
      drawMotes(ctx, a);
    } else {
      fx.motes.length = 0;
    }

    if (showMeteor && a > 0.01) {
      ctx.save();
      ctx.globalAlpha = 0.16 * a;
      ctx.fillStyle = "rgba(32, 10, 14, 1)";
      ctx.fillRect(0, 0, viewW, viewH);
      ctx.restore();
      maintainMeteors(viewW, viewH, mcap, a, time, reduced);
      drawMeteors(ctx, a);
    } else {
      fx.meteors.length = 0;
    }
  }

  /* ---- rain: streaks that land all over the screen, a slant that the wind
   * swings, a splash where each one lands, and in a storm more of it,
   * harder, with far-off flashes. Screen space, never the simulation. */
  var rainLast = 0;
  function newDrop(viewW, viewH, anywhere) {
    var far = Math.random() < 0.4, fall = (far ? 90 : 150) + Math.random() * 130;
    var end = Math.random() * (viewH + 30);                 /* where on the ground it lands: anywhere, top to bottom */
    return { x: -0.15 * viewW + Math.random() * viewW * 1.45, end: end, y: anywhere ? end - Math.random() * fall : end - fall, len: far ? 9 + Math.random() * 6 : 14 + Math.random() * 10, v: (far ? 520 : 760) + Math.random() * 260, far: far };
  }
  function drawRain(ctx, viewW, viewH, a, storm, reduced) {
    var now = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
    var dt = rainLast ? Math.min(0.05, now - rainLast) : 0.016, i, d, k, wind, want, sx, seg, col, s;
    rainLast = now;
    want = Math.round((reduced ? 90 : 230) * (1 + storm * 0.7) * a * Math.max(0.6, Math.min(1.8, (viewW * viewH) / 900000)));
    wind = -0.22 - storm * 0.3 + Math.sin(now * 0.7) * 0.08 * (1 + storm * 2);
    while (fx.drops.length < want) fx.drops.push(newDrop(viewW, viewH, true));
    if (fx.drops.length > want + 20) fx.drops.length = want;
    ctx.save();
    /* overcast */
    ctx.globalAlpha = 1;
    ctx.fillStyle = tint(ctx, "#0c1830", 0.14 * a + 0.16 * storm);
    ctx.fillRect(0, 0, viewW, viewH);
    for (i = fx.drops.length - 1; i >= 0; i--) {
      d = fx.drops[i];
      d.y += d.v * dt * (1 + storm * 0.25);
      d.x += d.v * dt * wind;
      if (d.y >= d.end) {
        if (!d.far && fx.splash.length < (reduced ? 20 : 60)) fx.splash.push({ x: d.x, y: d.end, t: 0 });
        fx.drops[i] = newDrop(viewW, viewH, false);
        continue;
      }
      col = tint(ctx, d.far ? "#8fb0e0" : "#cfe2ff", d.far ? 0.3 * a : 0.55 * a);
      ctx.fillStyle = col;
      seg = d.len / 3;
      for (k = 0; k < 3; k++) {
        sx = d.x - wind * seg * (2 - k);
        ctx.fillRect(Math.round(sx), Math.round(d.y - seg * (3 - k)), d.far ? 1 : 2, Math.ceil(seg));
      }
    }
    for (i = fx.splash.length - 1; i >= 0; i--) {
      s = fx.splash[i]; s.t += dt;
      if (s.t > 0.22) { fx.splash.splice(i, 1); continue; }
      k = s.t / 0.22;
      ctx.fillStyle = tint(ctx, "#dcecff", 0.5 * a * (1 - k));
      ctx.fillRect(Math.round(s.x - 2 - k * 5), Math.round(s.y - k * 3), 2, 2);
      ctx.fillRect(Math.round(s.x + 1 + k * 5), Math.round(s.y - k * 3), 2, 2);
      ctx.fillRect(Math.round(s.x - 3 - k * 3), Math.round(s.y + 1), Math.round(7 + k * 6), 1);
    }
    /* a storm flickers on the horizon between the bolts that land */
    if (storm > 0.6) {
      fx.farT -= dt;
      if (fx.farT <= 0) {
        fx.farT = 5 + Math.random() * 7;
        fx.farFlash = 0.5;
        if (D.audio) D.audio.sfx("thunder", 0.3);
      }
    }
    if (fx.farFlash > 0) {
      ctx.fillStyle = tint(ctx, "#dfeaff", 0.22 * fx.farFlash * (Math.sin(now * 60) > -0.3 ? 1 : 0.3));
      ctx.fillRect(0, 0, viewW, viewH);
      fx.farFlash = Math.max(0, fx.farFlash - dt * 2.2);
    }
    ctx.restore();
  }
  /* the WebGL layer wants translucent fills pre-multiplied (see seasons.js rgba) */
  function tint(ctx, col, a) {
    if (D.seasons && D.seasons.rgba) return D.seasons.rgba(ctx, col, Math.max(0, Math.min(1, a)));
    var n = parseInt(col.slice(1), 16);
    return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + Math.max(0, Math.min(1, a)).toFixed(3) + ")";
  }

  function maintainMotes(viewW, viewH, cap, a, time) {
    var i, m;
    while (fx.motes.length < cap * 0.5) {
      fx.motes.push({
        x: Math.random() * viewW,
        y: Math.random() * viewH,
        v: 8 + Math.random() * 16,
        s: 1 + Math.random() * 2,
        p: Math.random()
      });
    }
    if (fx.motes.length > cap) fx.motes.length = cap;
    for (i = 0; i < fx.motes.length; i++) {
      m = fx.motes[i];
      m.y += m.v * 0.016;
      m.x += Math.sin((time || 0) * 0.6 + m.p * 8) * 0.15;
      if (m.y > viewH + 4) { m.y = -4; m.x = Math.random() * viewW; }
    }
  }

  function drawMotes(ctx, a) {
    var i, m;
    ctx.save();
    for (i = 0; i < fx.motes.length; i++) {
      m = fx.motes[i];
      ctx.globalAlpha = 0.25 * a * (0.5 + m.p * 0.5);
      ctx.fillStyle = "#d8c0ff";
      ctx.fillRect(m.x, m.y, m.s, m.s);
    }
    ctx.restore();
  }

  function maintainMeteors(viewW, viewH, cap, a, time, reduced) {
    var i, m, need = reduced ? 0.4 : 0.75;
    if (fx.meteors.length < cap && Math.random() < need) {
      fx.meteors.push({
        x: Math.random() * viewW * 1.2,
        y: -20 - Math.random() * 80,
        vx: -220 - Math.random() * 180,
        vy: 320 + Math.random() * 220,
        life: 0.7 + Math.random() * 0.6,
        max: 1,
        w: 1.5 + Math.random() * 2
      });
    }
    if (fx.meteors.length > cap) fx.meteors.length = cap;
    for (i = fx.meteors.length - 1; i >= 0; i--) {
      m = fx.meteors[i];
      m.x += m.vx * 0.016;
      m.y += m.vy * 0.016;
      m.life -= 0.016;
      if (m.life <= 0 || m.y > viewH + 40 || m.x < -40) fx.meteors.splice(i, 1);
    }
  }

  function drawMeteors(ctx, a) {
    var i, m, len;
    ctx.save();
    for (i = 0; i < fx.meteors.length; i++) {
      m = fx.meteors[i];
      len = 18 + m.w * 10;
      ctx.globalAlpha = Math.max(0, m.life / (m.max || 1)) * 0.85 * a;
      ctx.strokeStyle = "#ffd090";
      ctx.lineWidth = m.w;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - (m.vx / 400) * len, m.y - (m.vy / 400) * len);
      ctx.stroke();
    }
    ctx.restore();
  }

  function resetFx() { fx.motes.length = 0; fx.meteors.length = 0; fx.drops.length = 0; fx.splash.length = 0; fx.farFlash = 0; }

  var api = {
    CATALOG: CATALOG,
    SCHEDULE: SCHEDULE,
    FX_CAP: FX_CAP,
    METEOR_CAP: METEOR_CAP,
    mods: mods,
    liveMods: liveMods,
    idOf: idOf,
    canonicalId: canonicalId,
    tick: tick,
    force: force,
    clearPhase: clearPhase,
    resumePlaying: resumePlaying,
    startRunWeather: startRunWeather,
    pickNext: pickNext,
    remapType: remapType,
    applySpawnStats: applySpawnStats,
    spawnIntervalScale: spawnIntervalScale,
    spawnCapScale: spawnCapScale,
    enemySpeedScale: enemySpeedScale,
    enemyAtkScale: enemyAtkScale,
    xpValue: xpValue,
    snapshot: snapshot,
    amount: amount,
    wetness: wetness,
    draw: draw,
    resetFx: resetFx,
    fadeT: fadeT,
    tierOf: tierOf
  };

  if (!D.WEATHER) D.WEATHER = { catalog: CATALOG, schedule: SCHEDULE };
  D.weather = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
