/* Digifarm intermission (roadmap ids 14, 17).
 * Feed / pet / items / training stations steer evolution and rarity mood/signals.
 * Battle time does not advance here. Hooks: D.rarity.onFarmCycle / farmIntervalMinutes.
 * Hunger trickles here at FARM_HUNGER_DRAIN_MULT of the battle rate.
 */
(function (global) {
  "use strict";

  var D = (global.DBH = global.DBH || {});
  var host = null;
  var visit = null;
  var grassCanvas = null;
  var grassSkin = null;

  function cfg() { return D.FARM_CFG || {}; }
  /* Nov 20: you come and go as you like (no auto-return); the world keeps going while you're here */
  function onDemand() { return !!cfg().onDemand; }

  function yardSize() {
    var c = cfg();
    return { w: c.yardW || 1320, h: c.yardH || 820 };
  }

  function fenceRect() {
    var y = yardSize();
    return { x0: 20, y0: 40, x1: y.w - 20, y1: y.h - 20 };
  }

  function clampInYard(x, y) {
    var f = fenceRect();
    return { x: clamp(x, f.x0 + 20, f.x1 - 20), y: clamp(y, f.y0 + 20, f.y1 - 20) };
  }

  function shedRect() {
    var s = cfg().shed;
    if (s) return s;
    return { x: 800, y: 200, w: 140, h: 90 };
  }

  function shopPoint() {
    var s = shedRect();
    return { x: s.x + (s.w || 140) / 2, y: s.y + (s.h || 90) - 10 };
  }

  /* Black running ring just inside the fence. Stations stay in the infield. */
  function trackGeom() {
    var st = (cfg().stations || {}).track || {};
    var f = fenceRect();
    var width = st.width != null ? st.width : 44;
    var inset = st.inset != null ? st.inset : 30;
    var cx = st.cx != null ? st.cx : (f.x0 + f.x1) / 2;
    var cy = st.cy != null ? st.cy : (f.y0 + f.y1) / 2;
    var rx = st.rx != null ? st.rx : (f.x1 - f.x0) / 2 - inset - width / 2;
    var ry = st.ry != null ? st.ry : (f.y1 - f.y0) / 2 - inset - width / 2;
    return { cx: cx, cy: cy, rx: rx, ry: ry, width: width, inset: inset, lapsTarget: st.lapsTarget != null ? st.lapsTarget : 1.25 };
  }

  function ellipsePerimeter(rx, ry) {
    var h = Math.pow(rx - ry, 2) / Math.pow(rx + ry, 2);
    return Math.PI * (rx + ry) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
  }

  function pointOnTrack(ang, g) {
    g = g || trackGeom();
    return { x: g.cx + g.rx * Math.cos(ang), y: g.cy + g.ry * Math.sin(ang) };
  }

  function distToTrack(x, y, g) {
    g = g || trackGeom();
    var dx = x - g.cx, dy = y - g.cy;
    var ang = Math.atan2(dy / Math.max(1, g.ry), dx / Math.max(1, g.rx));
    var p = pointOnTrack(ang, g);
    return dist(x, y, p.x, p.y);
  }

  function el(id) { return (typeof document !== "undefined") && document.getElementById(id); }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function sfx(name) { if (host && host.sfx) host.sfx(name); }

  function authAct(intent) {
    if (host && host.act) return host.act(intent);
    return { ok: false, reason: "no-auth" };
  }
  function hasAuth() { return !!(host && host.hasAuth && host.hasAuth()); }
  function localId() { return (host && host.localId && host.localId()) || "local"; }

  function pullAuth() {
    if (!hasAuth() || !visit) return;
    var auth = (host && host.getAuth && host.getAuth()) || (D.getMissionAuth && D.getMissionAuth());
    var sim = auth && auth.sim;
    var p = sim && (sim.player(localId()) || sim.players[0]);
    var run = host && host.getRun && host.getRun();
    if (p && run) {
      run.fullness = p.fullness;
      run.happiness = p.happiness;
      run.bag = p.bag || run.bag;
      run.trainStats = p.trainStats || run.trainStats;
      run.trainVisits = p.trainVisits || run.trainVisits;
      run.bondTrain = p.bondTrain;
      run.careMistakes = p.careMistakes;
      run.foodEaten = p.foodEaten;
      run.foodCounts = p.foodCounts || run.foodCounts;
      run.garden = p.garden || run.garden;
      run.hp = p.hp; run.maxHp = p.maxHp;
    }
    if (sim && sim.farm) {
      if (sim.farm.x != null) visit.x = sim.farm.x;
      if (sim.farm.y != null) visit.y = sim.farm.y;
      if (sim.farm.mx != null && !(sim.farm.activity && sim.farm.activity.id === "track")) visit.mx = sim.farm.mx;
      if (sim.farm.my != null && !(sim.farm.activity && sim.farm.activity.id === "track")) visit.my = sim.farm.my;
      if (sim.farm.facing != null) visit.facing = sim.farm.facing;
      visit.moving = !!sim.farm.moving;
      if (sim.farm.tdir) visit.tdir = sim.farm.tdir;
      if (sim.farm.mfacing != null) visit.mfacing = sim.farm.mfacing;
      visit.stayLeft = sim.farm.stayLeft;
      visit.trainCd = sim.farm.trainCd;
      visit.fed = sim.farm.fed;
      visit.petted = sim.farm.petted;
      visit.refused = sim.farm.refused;
      visit.trained = sim.farm.trained;
      visit.careMistake = sim.farm.careMistake;
      visit.hungryExit = sim.farm.hungryExit;
      if (sim.farm.activity && sim.farm.activity.id === "track") {
        visit.mx = sim.farm.activity.mx;
        visit.my = sim.farm.activity.my;
        visit.monMoving = true;
        if (visit.activity) {
          visit.activity.laps = sim.farm.activity.laps;
          visit.activity.angle = sim.farm.activity.angle;
          visit.activity.t = sim.farm.activity.t;
          visit.activity.score = sim.farm.activity.score;
        }
      }
      if (sim.farm.activity && visit.activity && sim.farm.activity.quiz) visit.activity.quiz = sim.farm.activity.quiz;
    }
  }

  function hungerMult() {
    var c = cfg();
    if (c.hungerDrainMult != null) return c.hungerDrainMult;
    if (D.FARM_HUNGER_DRAIN_MULT != null) return D.FARM_HUNGER_DRAIN_MULT;
    return 0.05;
  }

  function intervalMinutes(index) {
    var c = cfg();
    if (D.rarity && D.rarity.farmIntervalMinutes) {
      if (D.FARM_CARE) {
        D.FARM_CARE.intervalMinutes = c.intervalMinutes || D.FARM_CARE.intervalMinutes;
        D.FARM_CARE.intervalPlus = c.intervalPlus != null ? c.intervalPlus : D.FARM_CARE.intervalPlus;
      }
      return D.rarity.farmIntervalMinutes(index);
    }
    var seq = c.intervalMinutes || [3, 6, 10];
    var plus = c.intervalPlus != null ? c.intervalPlus : 4;
    if (index < seq.length) return seq[index];
    return seq[seq.length - 1] + plus * (index - seq.length + 1);
  }

  function nextAt(run) {
    if (!run) return intervalMinutes(0) * 60;
    if (run.farmDueAt != null) return run.farmDueAt;
    return (run.lastFarmAt || 0) + intervalMinutes(run.farmVisitIndex || 0) * 60;
  }

  function dueIn(run) {
    if (!run) return 1e9;
    return nextAt(run) - (run.time || 0);
  }

  function shouldVisit(run) {
    if (!run) return false;
    if (visit && visit.active) return false;
    /* When authority is attached, the due flag is authored there. */
    if (hasAuth()) return !!run.pendingFarm;
    return dueIn(run) <= 0;
  }

  function warn(run) {
    if (!run || !host) return;
    var left = dueIn(run);
    var marks = cfg().warnAt || [15, 5];
    run.farmWarns = run.farmWarns || {};
    var key = String(run.farmVisitIndex || 0);
    var fired = run.farmWarns[key] || {};
    var i, m;
    for (i = 0; i < marks.length; i++) {
      m = marks[i];
      if (left <= m && left > 0 && !fired[m]) {
        fired[m] = true;
        run.farmWarns[key] = fired;
        if (host.warn) host.warn(m, left);
      }
    }
  }

  function foodIds() { return ["meat", "fish", "berry"].concat(D.CROP_ORDER || []); }
  function seedIds() { return (D.CROP_ORDER || []).map(function (c) { return "seed_" + c; }); }

  function bagCount(run, id) {
    return (run && run.bag && run.bag[id]) || 0;
  }

  function stationList() {
    var c = cfg().stations || {};
    var order = ["bag", "board", "track", "bond"];
    var out = [], i, s;
    for (i = 0; i < order.length; i++) {
      s = c[order[i]];
      if (s) out.push(s);
    }
    return out;
  }

  function nearestStation(x, y) {
    var list = stationList(), i, s, d, best = null, bestD = 1e9, rad;
    for (i = 0; i < list.length; i++) {
      s = list[i];
      if (s.id === "track") {
        d = distToTrack(x, y);
        rad = (s.radius != null ? s.radius : 36) + (trackGeom().width || 44) / 2;
      } else {
        d = dist(x, y, s.x, s.y);
        rad = s.radius || 48;
      }
      if (d < rad && d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  function begin(opts) {
    opts = opts || {};
    var run = host && host.getRun && host.getRun();
    if (!run) return null;
    var c = cfg();
    var scheduled = !!opts.scheduled;
    if (scheduled && !hasAuth()) {
      run.farmVisitIndex = (run.farmVisitIndex || 0) + 1;
    }
    run.farmWarns = run.farmWarns || {};
    run.trainStats = run.trainStats || { offense: 0, intelligence: 0, agility: 0 };
    run.trainVisits = run.trainVisits || { bag: 0, board: 0, track: 0, bond: 0 };
    visit = {
      active: true,
      scheduled: scheduled,
      time: 0,
      stayLeft: (c.stayCapSeconds || 45) + (D.lab ? D.lab.mods().farm : 0) + (D.items ? D.items.farmBonus() : 0),
      stayMax: (c.stayCapSeconds || 45) + (D.lab ? D.lab.mods().farm : 0) + (D.items ? D.items.farmBonus() : 0),
      trained: false,
      trainCd: 0,
      fed: 0,
      petted: 0,
      refused: 0,
      usedItem: false,
      ignored: 0,
      selected: 0,
      x: (c.yardW || 1320) / 2,
      y: (c.yardH || 820) / 2 + 20,
      mx: (c.yardW || 1320) / 2 + 48,
      my: (c.yardH || 820) / 2 + 28,
      facing: 1,
      mfacing: -1,
      moving: false,
      monMoving: false,
      activity: null,
      particles: [],
      hungryExit: false
    };
    if (hasAuth()) {
      var res = authAct({ type: "farm.enter", id: localId(), scheduled: scheduled });
      /* on-demand (Nov 20): the simulation can still say no (an enemy got close) */
      if (onDemand() && res && !res.ok && !res.already) {
        visit = null;
        if (host && host.float) host.float(run.x, run.y - 30, res.reason || "Can't go now", "#ff9a7a");
        return null;
      }
    }
    if (host && host.setState) host.setState("farm");
    render();
    sfx("ui");
    return visit;
  }

  function hungryThreshold(run) {
    var max = (D.CARE && D.CARE.fullnessMax) || 100;
    var ratio = cfg().careMistakeFullnessRatio != null ? cfg().careMistakeFullnessRatio : 0.3;
    return max * ratio;
  }

  function isHungry(run) {
    if (!run) return false;
    return (run.fullness || 0) <= hungryThreshold(run);
  }

  function applyCareMistake(run, v) {
    if (!run || !v) return false;
    var hungry = isHungry(run);
    v.hungryExit = hungry;
    /* Refused food is a legendary path, not a player care mistake. */
    var mistake = hungry && v.fed <= 0 && v.refused <= 0;
    if (!mistake) return false;
    run.careMistakes = (run.careMistakes || 0) + 1;
    var joyHit = cfg().careMistakeJoyHit != null ? cfg().careMistakeJoyHit : 8;
    var bondHit = cfg().careMistakeBondHit != null ? cfg().careMistakeBondHit : 6;
    run.happiness = Math.max(0, (run.happiness || 0) - joyHit);
    run.bondTrain = Math.max(0, (run.bondTrain || 0) - bondHit);
    v.careMistake = true;
    return true;
  }

  function end(reason) {
    if (!visit || !visit.active) return;
    closeSeedMenu();
    var run = host && host.getRun && host.getRun();
    var ret = null;
    if (hasAuth()) {
      ret = authAct({ type: "farm.return", id: localId(), reason: reason || "ready" });
      pullAuth();
    } else if (visit.activity) finishActivity(true);
    var ignored = visit.petted <= 0 && visit.fed <= 0 && !visit.trained;
    var mistake = hasAuth() ? !!(ret && ret.careMistake) : applyCareMistake(run, visit);
    if (!hasAuth() && run && D.rarity && D.rarity.onFarmCycle) {
      D.rarity.onFarmCycle({
        run: run,
        ignored: ignored,
        refusedFood: visit.refused > 0,
        fed: visit.fed > 0,
        seconds: visit.time,
        event: "farm",
        careMistake: !!mistake,
        hungryExit: !!visit.hungryExit
      });
    }
    visit.active = false;
    var v = visit;
    visit = null;
    render();
    if (host && host.onReturn) host.onReturn(reason || "ready", v);
  }

  function dist(ax, ay, bx, by) {
    var dx = ax - bx, dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function hash2(x, y) {
    var n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
    n = (n ^ (n >>> 13)) >>> 0;
    n = Math.imul(n, 1274126177) >>> 0;
    return (n >>> 0) / 4294967296;
  }

  function farmSkin() {
    if (D.cosmetics && D.cosmetics.equipped) return D.cosmetics.equipped("farm") || "farm-isle";
    return "farm-isle";
  }

  function skinPalette(id) {
    if (id === "farm-sunset") return { base: "#6a9a3a", dark: "#3e6a22", light: "#c8d858", tuft: "#4e8628", flower: ["#f0a040", "#f0d060", "#e07070"], clover: "#3a7a28", sky0: "#f0b878", sky1: "#e8d090" };
    if (id === "farm-night") return { base: "#2e5a3a", dark: "#1a3a28", light: "#5a8a68", tuft: "#246044", flower: ["#c0d0f0", "#e0e8ff", "#b090d0"], clover: "#1e4a32", sky0: "#1a2848", sky1: "#3a5070" };
    if (id === "farm-shore") return { base: "#6aaa58", dark: "#3e7a38", light: "#d8d090", tuft: "#4e8a40", flower: ["#f0e0a0", "#80d0c0", "#f07080"], clover: "#3a8a48", sky0: "#8ec8e8", sky1: "#d8f0e0" };
    if (id === "farm-unseen") return { base: "#3a6a5a", dark: "#1e3a40", light: "#80e0c8", tuft: "#2a5a58", flower: ["#c0a0ff", "#80ffe0", "#f0e080"], clover: "#2a5048", sky0: "#1a1838", sky1: "#406070" };
    return { base: "#4e8a38", dark: "#2e6a24", light: "#8cbc50", tuft: "#3e7a28", flower: ["#f0c020", "#e07090", "#f4f0e0"], clover: "#3a7a28", sky0: "#8ec8f0", sky1: "#c8e8a8" };
  }

  function paintWrap(g, S, x, y, fn) {
    var ox, oy;
    for (oy = -S; oy <= S; oy += S) {
      for (ox = -S; ox <= S; ox += S) fn(x + ox, y + oy);
    }
  }

  function makeGrassPattern(skin) {
    var S = 448;
    var c = (typeof document !== "undefined") ? document.createElement("canvas") : null;
    if (!c) return null;
    c.width = c.height = S;
    var g = c.getContext("2d");
    var pal = skinPalette(skin);
    g.fillStyle = pal.base;
    g.fillRect(0, 0, S, S);
    var x, y, i, r, col;
    /* Soft color patches, wraparound. */
    for (i = 0; i < 70; i++) {
      x = (hash2(i, 11) * S);
      y = (hash2(i, 29) * S);
      r = 18 + hash2(i, 47) * 36;
      col = hash2(i, 61) > 0.55 ? pal.light : pal.dark;
      g.fillStyle = col;
      g.globalAlpha = 0.18 + hash2(i, 73) * 0.16;
      paintWrap(g, S, x, y, function (px, py) {
        g.beginPath();
        g.ellipse(px, py, r, r * 0.72, 0, 0, Math.PI * 2);
        g.fill();
      });
    }
    g.globalAlpha = 1;
    /* Blade strokes, lit from the top to match the slanted view. */
    for (i = 0; i < 1400; i++) {
      x = hash2(i, 3) * S;
      y = hash2(i, 7) * S;
      g.strokeStyle = hash2(i, 13) > 0.5 ? pal.tuft : pal.light;
      g.globalAlpha = 0.28 + hash2(i, 17) * 0.35;
      g.lineWidth = 1;
      paintWrap(g, S, x, y, function (px, py) {
        g.beginPath();
        g.moveTo(px, py);
        g.lineTo(px + (hash2(i, 19) - 0.5) * 4, py - 3 - hash2(i, 23) * 5);
        g.stroke();
      });
    }
    g.globalAlpha = 1;
    /* Tufts */
    for (i = 0; i < 90; i++) {
      x = hash2(i, 41) * S;
      y = hash2(i, 43) * S;
      g.fillStyle = pal.tuft;
      g.globalAlpha = 0.55;
      paintWrap(g, S, x, y, function (px, py) {
        var k;
        for (k = 0; k < 5; k++) {
          g.beginPath();
          g.moveTo(px, py);
          g.lineTo(px - 3 + k * 1.5, py - 5 - (k % 3));
          g.lineTo(px + 1, py);
          g.fill();
        }
      });
    }
    g.globalAlpha = 1;
    /* Clover */
    for (i = 0; i < 40; i++) {
      x = hash2(i, 101) * S;
      y = hash2(i, 103) * S;
      g.fillStyle = pal.clover;
      paintWrap(g, S, x, y, function (px, py) {
        var k, ang;
        for (k = 0; k < 3; k++) {
          ang = (k / 3) * Math.PI * 2;
          g.beginPath();
          g.ellipse(px + Math.cos(ang) * 2.2, py + Math.sin(ang) * 1.6, 2.1, 1.6, ang, 0, Math.PI * 2);
          g.fill();
        }
      });
    }
    /* Small flowers */
    for (i = 0; i < 28; i++) {
      x = hash2(i, 201) * S;
      y = hash2(i, 203) * S;
      col = pal.flower[i % pal.flower.length];
      g.fillStyle = col;
      paintWrap(g, S, x, y, function (px, py) {
        var k;
        for (k = 0; k < 5; k++) {
          g.beginPath();
          g.arc(px + Math.cos((k / 5) * Math.PI * 2) * 2.4, py + Math.sin((k / 5) * Math.PI * 2) * 1.8, 1.5, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = "#f8e070";
        g.beginPath();
        g.arc(px, py, 1.2, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = col;
      });
    }
    g.globalAlpha = 1;
    grassCanvas = c;
    grassSkin = skin;
    return c;
  }

  function ensureGrass() {
    var skin = farmSkin();
    if (!grassCanvas || grassSkin !== skin) makeGrassPattern(skin);
    return grassCanvas;
  }

  function fillGrass(ctx, vw, vh, camX, camY, skipSky) {
    var tile = ensureGrass();
    var pal = skinPalette(farmSkin());
    if (!tile) {
      ctx.fillStyle = pal.base;
      ctx.fillRect(0, 0, vw, vh);
    } else {
      var S = tile.width;
      var pat = ctx.createPattern(tile, "repeat");
      ctx.save();
      var ox = -((camX % S) + S) % S;
      var oy = -((camY % S) + S) % S;
      ctx.translate(ox, oy);
      ctx.fillStyle = pat;
      ctx.fillRect(-ox - S, -oy - S, vw + S * 2, vh + S * 2);
      ctx.restore();
    }
  }

  function paintSkyWash(ctx, vw, vh) {
    var pal = skinPalette(farmSkin());
    /* Soft sky wash at the top of the screen — camera and fence stay put. */
    var sky = ctx.createLinearGradient(0, 0, 0, Math.min(vh * 0.38, 180));
    sky.addColorStop(0, pal.sky0);
    sky.addColorStop(0.7, pal.sky1);
    sky.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, vw, Math.min(vh * 0.38, 180));
  }

  function camGesture() {
    var D = global.DBH;
    return (D && D.input && D.input.camera) || { zoom: 1, rot: 0 };
  }

  function diminish(base, visits, factor) {
    factor = factor != null ? factor : 0.65;
    return base * Math.pow(factor, Math.max(0, visits || 0));
  }

  function startActivity(st) {
    var run = host && host.getRun && host.getRun();
    if (!visit || !run || !st) return false;
    if (visit.activity) return false;
    if (visit.trainCd > 0) {
      if (host.float) host.float(visit.x, visit.y - 28, "Wait a moment", "#ffd36a");
      return false;
    }
    var act = {
      id: st.id,
      stat: st.stat,
      t: 0,
      dur: st.timeCost || 6,
      hits: 0,
      needed: st.id === "bag" ? 5 : (st.id === "board" ? 1 : 0),
      score: 0.65,
      beat: 0,
      window: 0,
      quiz: null,
      choice: -1,
      angle: 0,
      laps: 0,
      pace: 0,
      cheer: 0,
      buddy: pickBuddy(run),
      done: false
    };
    if (st.id === "board") act.quiz = makeQuiz();
    if (hasAuth()) {
      var started = authAct({ type: "farm.trainStart", id: localId(), station: st.id });
      if (!started.ok) {
        if (host.float) host.float(visit.x, visit.y - 28, started.reason === "cooldown" ? "Wait a moment" : (started.reason || "Can't train"), "#ffd36a");
        return false;
      }
      if (started.activity && started.activity.quiz) act.quiz = started.activity.quiz;
      pullAuth();
    } else if (st.fullnessCost) {
      run.fullness = Math.max(0, (run.fullness || 0) - st.fullnessCost);
    }
    visit.activity = act;
    if (st.id === "track") {
      var g0 = trackGeom();
      act.angle = 0;
      act.laps = 0;
      var p0 = pointOnTrack(0, g0);
      visit.mx = p0.x;
      visit.my = p0.y;
    } else {
      visit.mx = st.x + 28;
      visit.my = st.y + 8;
    }
    visit.monMoving = st.id === "track";
    render();
    sfx("ui");
    return true;
  }

  function pickBuddy(run) {
    if (run.ally && run.ally.form) return run.ally.form;
    if (run.reserve && run.reserve[0] && run.reserve[0].form) return run.reserve[0].form;
    var bank = null;
    if (host && host.getBank) bank = host.getBank();
    if (!bank && D.getBank) bank = D.getBank();
    if (!bank && host && host.save && host.save.digibank) bank = host.save.digibank;
    if (bank && bank.length) {
      var rec = bank[bank.length - 1];
      return (rec && (rec.form || rec.id)) || "patamon";
    }
    return "patamon";
  }

  function makeQuiz() {
    var shapes = ["○", "△", "□"];
    var answer = Math.floor(Math.random() * 3);
    return { prompt: "Which one matches  " + shapes[answer] + "  ?", options: shapes, answer: answer };
  }

  function activityInput(kind, value) {
    if (!visit || !visit.activity) return;
    var a = visit.activity;
    if (a.done) return;
    if (hasAuth()) authAct({ type: "farm.trainInput", id: localId(), kind: kind, value: value });
    if (a.id === "bag" && (kind === "interact" || kind === "confirm")) {
      if (a.window > 0) {
        a.hits += 1;
        a.score = Math.min(1.25, a.score + 0.12);
        a.window = 0;
        if (host.float) host.float(visit.mx, visit.my - 28, "Hit!", "#ffe080");
        sfx("ui");
      } else {
        a.score = Math.max(0.35, a.score - 0.06);
      }
    } else if (a.id === "board" && (kind === "slot" || kind === "choice")) {
      var pick = value;
      if (pick == null) return;
      a.choice = pick;
      a.score = (pick === a.quiz.answer) ? 1.15 : 0.55;
      a.hits = 1;
      if (host.float) host.float(visit.mx, visit.my - 28, pick === a.quiz.answer ? "Correct!" : "Nice try", pick === a.quiz.answer ? "#7cf0c0" : "#ffd36a");
      sfx(pick === a.quiz.answer ? "level" : "ui");
      a.t = Math.max(a.t, a.dur - 0.6);
    } else if (a.id === "bond" && (kind === "interact" || kind === "confirm")) {
      a.cheer += 1;
      a.score = Math.min(1.2, a.score + 0.08);
      spawnHeart(visit.activity);
      if (host.float) host.float(visit.mx, visit.my - 36, "♪", "#ffb0e0");
      sfx("toy");
    }
  }

  function spawnHeart(a) {
    if (!visit) return;
    visit.particles = visit.particles || [];
    visit.particles.push({
      x: (cfg().stations.bond ? cfg().stations.bond.x : 1020) + (Math.random() * 20 - 10),
      y: (cfg().stations.bond ? cfg().stations.bond.y : 480) - 20,
      vy: -28 - Math.random() * 16,
      life: 0.9,
      kind: Math.random() > 0.4 ? "heart" : "note"
    });
  }

  function finishActivity(silent) {
    var run = host && host.getRun && host.getRun();
    var a = visit && visit.activity;
    if (!a || !run) { if (visit) visit.activity = null; return; }
    if (hasAuth()) {
      /* Authority already applied the gain via farm.tick / farm.return. */
      pullAuth();
      visit.activity = null;
      visit.trained = true;
      render();
      return;
    }
    var st = (cfg().stations || {})[a.id];
    if (!st) { visit.activity = null; return; }
    var visits = (run.trainVisits && run.trainVisits[a.id]) || 0;
    var gain = diminish(st.gain || 10, visits, st.diminish) * (a.score || 0.7);
    gain = Math.max(1, Math.round(gain));
    run.trainVisits = run.trainVisits || { bag: 0, board: 0, track: 0, bond: 0 };
    run.trainVisits[a.id] = visits + 1;
    run.trainStats = run.trainStats || { offense: 0, intelligence: 0, agility: 0 };
    if (st.stat === "bond") {
      run.bondTrain = clamp((run.bondTrain || 0) + gain, 0, 100);
      run.happiness = clamp((run.happiness || 0) + Math.round(gain * 0.35), 0, (D.CARE && D.CARE.happinessMax) || 100);
    } else {
      run.trainStats[st.stat] = (run.trainStats[st.stat] || 0) + gain;
      run.happiness = clamp((run.happiness || 0) + (cfg().trainJoy || 6) * 0.5, 0, (D.CARE && D.CARE.happinessMax) || 100);
    }
    run.farmTraining = (run.farmTraining || 0) + 1;
    visit.trained = true;
    visit.trainCd = cfg().trainCooldown || 0;
    if (!silent && host.float) {
      var label = st.stat === "bond" ? ("Bond +" + gain) : (st.stat.charAt(0).toUpperCase() + st.stat.slice(1) + " +" + gain);
      host.float(visit.mx, visit.my - 36, label, "#ffe080");
    }
    if (!silent) sfx("level");
    if (!hasAuth() && D.rarity && D.rarity.tick) D.rarity.tick(run, 0, { dist: 0 });
    visit.activity = null;
    render();
  }

  function updateActivity(dt, inp) {
    var a = visit.activity;
    if (!a) return;
    var st = (cfg().stations || {})[a.id];
    a.t += dt;
    if (a.id === "bag") {
      a.beat += dt;
      if (a.window > 0) a.window -= dt;
      if (a.beat >= 0.62) {
        a.beat = 0;
        a.window = 0.34;
      }
      visit.mx = st.x + 26;
      visit.my = st.y + 6;
      visit.monMoving = a.window > 0.12;
      visit.mfacing = -1;
    } else if (a.id === "board") {
      visit.mx = st.x + 10;
      visit.my = st.y + 36;
      visit.monMoving = false;
    } else if (a.id === "track") {
      if (hasAuth()) {
        visit.monMoving = true;
        visit.mfacing = Math.cos((a.angle || 0)) >= 0 ? 1 : -1;
        /* Partner pose comes from the authority tick (full perimeter laps). */
      } else {
      var g = trackGeom();
      var peri = ellipsePerimeter(g.rx, g.ry);
      var targetLaps = g.lapsTarget || 1.25;
      var dur = a.dur || st.timeCost || 8;
      var distPerSec = peri * targetLaps / Math.max(0.5, dur);
      if (inp && (Math.abs(inp.x) + Math.abs(inp.y) > 0.25)) {
        a.pace = Math.min(1.3, a.pace + dt * 0.8);
        a.score = Math.min(1.25, a.score + dt * 0.12);
        distPerSec *= 1 + a.pace * 0.35;
      } else {
        a.pace = Math.max(0, a.pace - dt * 0.6);
      }
      /* Constant linear speed around the ellipse (not a tiny local loop). */
      var deriv = Math.sqrt(Math.pow(g.rx * Math.sin(a.angle), 2) + Math.pow(g.ry * Math.cos(a.angle), 2));
      a.angle += (distPerSec * dt) / Math.max(8, deriv);
      if (a.angle >= Math.PI * 2) {
        a.laps += Math.floor(a.angle / (Math.PI * 2));
        a.angle = a.angle % (Math.PI * 2);
      }
      var pt = pointOnTrack(a.angle, g);
      visit.mx = pt.x;
      visit.my = pt.y;
      visit.monMoving = true;
      visit.mfacing = Math.cos(a.angle) >= 0 ? 1 : -1;
      }
    } else if (a.id === "bond") {
      visit.mx = st.x - 16;
      visit.my = st.y + 18;
      visit.monMoving = false;
      visit.mfacing = 1;
      if (Math.floor(a.t * 3) !== Math.floor((a.t - dt) * 3) && Math.random() < 0.45) spawnHeart(a);
    }
    if (!hasAuth() && a.t >= a.dur) finishActivity(false);
    else if (hasAuth() && a.t >= a.dur) finishActivity(true);
  }

  function update(dt) {
    if (!visit || !visit.active) return visit;
    var run = host && host.getRun && host.getRun();
    if (!run) return visit;
    var c = cfg();
    var inp = (D.input && D.input.poll) ? D.input.poll() : { x: 0, y: 0 };
    var speed = (D.TAMER && D.TAMER.speed) || 168;
    visit.time += dt;
    visit.stayLeft = Math.max(0, visit.stayLeft - dt);
    visit.trainCd = Math.max(0, visit.trainCd - dt);
    tickSeedMenu();

    if (visit.activity) {
      /* Tamer can still wander a little; partner is in the activity. */
      if (!hasAuth()) {
        var pA = clampInYard(visit.x + (inp.x || 0) * speed * dt, visit.y + (inp.y || 0) * speed * dt);
        visit.x = pA.x; visit.y = pA.y;
        visit.moving = Math.abs(inp.x) + Math.abs(inp.y) > 0.12;
        if (visit.moving) visit.tdir = Math.abs(inp.y) > Math.abs(inp.x) + 0.05 ? (inp.y > 0 ? "down" : "up") : "side";
        if (inp.x > 0.15) visit.facing = 1;
        else if (inp.x < -0.15) visit.facing = -1;
      }
      updateActivity(dt, inp);
    } else if (!hasAuth()) {
      var pB = clampInYard(visit.x + (inp.x || 0) * speed * dt, visit.y + (inp.y || 0) * speed * dt);
      visit.x = pB.x; visit.y = pB.y;
      visit.moving = Math.abs(inp.x) + Math.abs(inp.y) > 0.12;
      if (visit.moving) visit.tdir = Math.abs(inp.y) > Math.abs(inp.x) + 0.05 ? (inp.y > 0 ? "down" : "up") : "side";
      if (inp.x > 0.15) visit.facing = 1;
      else if (inp.x < -0.15) visit.facing = -1;
      var tx = visit.x - visit.facing * 36, ty = visit.y + 8;
      var d = dist(visit.mx, visit.my, tx, ty);
      if (d > 8) {
        visit.mx += (tx - visit.mx) * Math.min(1, 3.2 * dt);
        visit.my += (ty - visit.my) * Math.min(1, 3.2 * dt);
        visit.monMoving = true;
        if (visit.mx < visit.x - 4) visit.mfacing = 1;
        else if (visit.mx > visit.x + 4) visit.mfacing = -1;
      } else visit.monMoving = false;
      if (d > (c.petRadius || 58)) visit.ignored += dt;
    }

    if (hasAuth()) {
      var tickR = authAct({ type: "farm.tick", id: localId(), dt: dt, inp: { x: inp.x || 0, y: inp.y || 0 } });
      pullAuth();
      if (tickR && tickR.careMistake != null && (!(D.getMissionAuth && D.getMissionAuth().sim && D.getMissionAuth().sim.farm && D.getMissionAuth().sim.farm.active))) {
        /* Auto-return already applied on the authority. Fall through to end(). */
      }
    } else {
      /* Farm trickle only — no happiness drain from the trickle itself. */
      var battleRate = (D.CARE && D.CARE.fullnessDecayPerSec) || 1.05;
      var decay = battleRate * hungerMult();
      run.fullness = Math.max(0, (run.fullness || 0) - decay * dt);
    }
    if (!hasAuth() && D.rarity && D.rarity.tick) {
      D.rarity.tick(run, dt, { dist: dist(visit.x, visit.y, visit.mx, visit.my) });
    }
    if (run.happiness > (run.peakHappiness || 0)) run.peakHappiness = run.happiness;

    if (visit.particles && visit.particles.length) {
      var i, p;
      for (i = visit.particles.length - 1; i >= 0; i--) {
        p = visit.particles[i];
        p.life -= dt;
        p.y += (p.vy || -24) * dt;
        if (p.life <= 0) visit.particles.splice(i, 1);
      }
    }

    if (visit.stayLeft <= 0 && !onDemand()) {
      end("auto");
      return visit;
    }
    if (Math.floor(visit.time * 4) !== Math.floor((visit.time - dt) * 4)) render();
    return visit;
  }

  function nearPartner() {
    if (!visit) return false;
    return dist(visit.x, visit.y, visit.mx, visit.my) <= (cfg().petRadius || 58);
  }

  function selectedKind(run) {
    var slots = slotList(run);
    var i = visit ? visit.selected : 0;
    return slots[i] || slots[0] || null;
  }

  function slotList(run) {
    var out = [], i, id, n, foods = foodIds();
    for (i = 0; i < foods.length; i++) {
      n = bagCount(run, foods[i]);
      if (n > 0) out.push({ id: foods[i], kind: "food", n: n });
    }
    var seeds = seedIds();
    for (i = 0; i < seeds.length; i++) {
      n = bagCount(run, seeds[i]);
      if (n > 0) out.push({ id: seeds[i], kind: "seed", n: n });
    }
    var items = ["vitamin", "medicine", "joyToy", "eraser", "atkBoost", "digimental", "crest"];
    for (i = 0; i < items.length; i++) {
      id = items[i];
      n = bagCount(run, id);
      if (id === "digimental" || id === "crest") {
        if (run.items && run.items.indexOf(id) >= 0) out.push({ id: id, kind: "key", n: 1 });
        continue;
      }
      if (n > 0) out.push({ id: id, kind: "item", n: n });
    }
    return out;
  }

  function takeBag(run, id, n) {
    n = n || 1;
    if (!run.bag || (run.bag[id] || 0) < n) return false;
    run.bag[id] -= n;
    return true;
  }

  function pet() {
    var run = host && host.getRun && host.getRun();
    if (!visit || !run) return false;
    if (visit.activity) { activityInput("interact"); return true; }
    if (!nearPartner()) {
      if (host.float) host.float(visit.x, visit.y - 28, "Get closer", "#ffd36a");
      return false;
    }
    if (hasAuth()) {
      var petR = authAct({ type: "farm.pet", id: localId() });
      pullAuth();
      if (petR.ok && host.float) host.float(visit.mx, visit.my - 32, "Pat! +" + (petR.joy || 8) + " Joy", "#ffb0e0");
      if (petR.ok) sfx("toy");
      render();
      return !!petR.ok;
    }
    var joy = cfg().petJoy || 8;
    run.happiness = clamp((run.happiness || 0) + joy, 0, (D.CARE && D.CARE.happinessMax) || 100);
    run.ignoredSeconds = Math.max(0, (run.ignoredSeconds || 0) - 12);
    visit.petted += 1;
    if (host.float) host.float(visit.mx, visit.my - 32, "Pat! +" + joy + " Joy", "#ffb0e0");
    sfx("toy");
    if (!hasAuth() && D.rarity && D.rarity.tick) D.rarity.tick(run, 0, { dist: 0 });
    render();
    return true;
  }

  function feed(kind) {
    var run = host && host.getRun && host.getRun();
    if (!visit || !run) return false;
    if (visit.activity) return false;
    kind = kind || (selectedKind(run) && selectedKind(run).id);
    if (!kind || !D.FOOD || !D.FOOD[kind]) {
      if (host.float) host.float(visit.x, visit.y - 28, "No food selected", "#ffd36a");
      return false;
    }
    if (!bagCount(run, kind)) {
      if (host.float) host.float(visit.x, visit.y - 28, "No " + kind, "#ff8080");
      return false;
    }
    if (hasAuth()) {
      var fed = authAct({ type: "farm.feed", id: localId(), food: kind });
      pullAuth();
      if (fed.refused) {
        if (host.float) host.float(visit.mx, visit.my - 28, "…", "#c0b8a0");
        sfx("hurt");
        render();
        return false;
      }
      if (!fed.ok) {
        if (host.float) host.float(visit.x, visit.y - 28, fed.reason || "Can't feed", "#ff8080");
        render();
        return false;
      }
      var defA = D.FOOD[kind];
      if (host.float) host.float(visit.mx, visit.my - 32, defA.name + "! +" + defA.fullness, defA.color);
      if (fed.balanced && host.float) host.float(visit.mx, visit.my - 50, "Balanced diet! ♥", "#a8f080");
      sfx("meat");
      render();
      return true;
    }
    if (D.rarity && D.rarity.shouldRefuseFeed && D.rarity.shouldRefuseFeed(run)) {
      visit.refused += 1;
      if (host.float) host.float(visit.mx, visit.my - 28, "…", "#c0b8a0");
      sfx("hurt");
      render();
      return false;
    }
    if (!takeBag(run, kind, 1)) return false;
    var def = D.FOOD[kind];
    run.fullness = clamp((run.fullness || 0) + def.fullness, 0, (D.CARE && D.CARE.fullnessMax) || 100);
    run.happiness = clamp((run.happiness || 0) + def.happiness, 0, (D.CARE && D.CARE.happinessMax) || 100);
    run.foodEaten = (run.foodEaten || 0) + 1;
    run.foodCounts = run.foodCounts || {};
    run.foodCounts[kind] = (run.foodCounts[kind] || 0) + 1;
    var dietL = D.dietOf ? D.dietOf(run.foodCounts) : null;
    var healL = def.hpHeal || 0;
    if (dietL && dietL.balanced) {
      run.happiness = clamp((run.happiness || 0) + (def.happiness || 4) * ((D.DIET && D.DIET.joyBonus) || 0.5), 0, (D.CARE && D.CARE.happinessMax) || 100);
      healL += (D.DIET && D.DIET.hpHealBonus) || 0.08;
      if (host.float) host.float(visit.mx, visit.my - 50, "Balanced diet! ♥", "#a8f080");
    }
    if (healL > 0 && run.maxHp) run.hp = Math.min(run.maxHp, (run.hp || 0) + run.maxHp * healL);
    visit.fed += 1;
    if (host.float) host.float(visit.mx, visit.my - 32, def.name + "! +" + def.fullness, def.color);
    sfx("meat");
    if (!hasAuth() && D.rarity && D.rarity.tick) D.rarity.tick(run, 0, { dist: 0 });
    render();
    return true;
  }

  function useItem(id) {
    var run = host && host.getRun && host.getRun();
    if (!visit || !run) return false;
    if (id === "meat" || id === "fish" || id === "berry") return feed(id);
    if (host.useItem) {
      var ok = host.useItem(id);
      if (ok) visit.usedItem = true;
      render();
      return ok;
    }
    return false;
  }

  function train() {
    var run = host && host.getRun && host.getRun();
    if (!visit || !run) return false;
    if (visit.activity) { activityInput("interact"); return true; }
    var st = nearestStation(visit.x, visit.y);
    if (!st) {
      if (host.float) host.float(visit.x, visit.y - 28, "Walk up to a station", "#ffd36a");
      return false;
    }
    return startActivity(st);
  }

  /* ---------- Garden ---------- */
  function plots() { return D.gardenPlots ? D.gardenPlots(cfg()) : []; }
  function gardenNow() {
    if (hasAuth()) {
      var auth = (host && host.getAuth && host.getAuth()) || (D.getMissionAuth && D.getMissionAuth());
      if (auth && auth.sim) return auth.sim.time || 0;
    }
    var run = host && host.getRun && host.getRun();
    return (run && run.time) || 0;
  }
  function nearestPlot(x, y) {
    var list = plots(), i, p, dx, dy, d, best = null, bestD = 1e9;
    for (i = 0; i < list.length; i++) {
      p = list[i];
      dx = Math.max(p.x - x, 0, x - (p.x + p.w));
      dy = Math.max(p.y - y, 0, y - (p.y + p.h));
      d = Math.sqrt(dx * dx + dy * dy);
      if (d < (p.radius || 46) && d < bestD) { bestD = d; best = p; }
    }
    return best;
  }
  function plotState(run, idx) {
    var g = (run && run.garden) || [];
    return g[idx] || null;
  }
  function firstSeed(run) {
    var sel = selectedKind(run);
    if (sel && sel.kind === "seed") return sel.id;
    var seeds = seedIds(), i;
    for (i = 0; i < seeds.length; i++) if (bagCount(run, seeds[i]) > 0) return seeds[i];
    return null;
  }
  function fmtLeft(sec) {
    sec = Math.max(0, Math.ceil(sec));
    var m = Math.floor(sec / 60), s2 = sec % 60;
    return m ? (m + "m " + (s2 < 10 ? "0" : "") + s2 + "s") : (s2 + "s");
  }
  /* ---- the seed window: planting an empty plot asks which seed goes in it ---- */
  var seedMenu = { open: false, plot: null, ids: [], sig: "" };
  function seedBox() {
    var box = document.getElementById("seed-menu"), feed;
    if (box || typeof document === "undefined") return box;
    box = document.createElement("div"); box.id = "seed-menu"; box.hidden = true;
    box.innerHTML = "<div class='feed-title'>Plant which seed?<span>click one, or press its number · Esc to cancel</span></div><div id='seed-menu-list'></div>";
    feed = document.getElementById("feed-menu");
    if (feed && feed.parentNode) feed.parentNode.insertBefore(box, feed.nextSibling); else document.body.appendChild(box);
    document.addEventListener("keydown", function (e) {
      var n;
      if (!seedMenu.open) return;
      if (e.key === "Escape") { closeSeedMenu(); e.preventDefault(); e.stopPropagation(); return; }
      n = parseInt(e.key, 10);
      if (n >= 1 && n <= seedMenu.ids.length) { seedPick(n - 1); e.preventDefault(); e.stopPropagation(); }
    }, true);
    return box;
  }
  function closeSeedMenu() { var box = document.getElementById("seed-menu"); seedMenu.open = false; seedMenu.plot = null; seedMenu.sig = ""; if (box) box.hidden = true; }
  function seedPick(i) {
    var plot = seedMenu.plot, id = seedMenu.ids[i];
    closeSeedMenu();
    if (plot && id) plotAction(plot, id);
  }
  function openSeedMenu(plot) {
    var run = host && host.getRun && host.getRun(), box = seedBox(), list, all = seedIds(), ids = [], i, html = "", def, btns, cv, g, ico, sig = "p" + plot.i;
    if (!run || !box) return;
    for (i = 0; i < all.length; i++) if (bagCount(run, all[i]) > 0) { ids.push(all[i]); sig += all[i] + bagCount(run, all[i]); }
    if (!ids.length) { closeSeedMenu(); return; }
    seedMenu.open = true; seedMenu.plot = plot; seedMenu.ids = ids; box.hidden = false;
    if (sig === seedMenu.sig) return;
    seedMenu.sig = sig;
    for (i = 0; i < ids.length; i++) {
      def = D.CROPS[D.cropOfSeed(ids[i])] || { name: ids[i], growSec: 0 };
      html += "<button type='button' class='feed-chip' data-i='" + i + "'>" + (i < 9 ? "<kbd>" + (i + 1) + "</kbd>" : "") + "<canvas width='24' height='24'></canvas>" +
        "<span class='feed-name'>" + def.name + "</span><span class='seed-time'>" + fmtLeft(def.growSec || 0) + "</span><span class='feed-n'>x" + bagCount(run, ids[i]) + "</span></button>";
    }
    list = document.getElementById("seed-menu-list"); list.innerHTML = html;
    btns = list.querySelectorAll(".feed-chip");
    for (i = 0; i < btns.length; i++) {
      cv = btns[i].querySelector("canvas"); g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
      ico = D.farmArt && D.farmArt.itemIcon ? D.farmArt.itemIcon(ids[i]) : null;
      if (ico) { try { g.drawImage(ico, 0, 0, 24, 24); } catch (e) {} } else { g.fillStyle = "#8fd06a"; g.fillRect(8, 8, 8, 8); }
      btns[i].addEventListener("click", (function (n) { return function (ev) { ev.preventDefault(); ev.stopPropagation(); seedPick(n); }; })(i));
    }
  }
  /* walking away from the plot, or the visit ending, puts the window away */
  function tickSeedMenu() {
    var pl = seedMenu.plot;
    if (!seedMenu.open) return;
    if (!visit || !visit.active || visit.activity || !pl || dist(visit.x, visit.y, pl.cx, pl.cy != null ? pl.cy : pl.y) > 150) closeSeedMenu();
  }

  function plotAction(plot, pickSeed) {
    var run = host && host.getRun && host.getRun();
    if (!run || !plot) return false;
    var st = plotState(run, plot.i);
    var now = gardenNow();
    var r;
    if (!st || !st.crop) {
      var seed = pickSeed || null;
      if (!seed) {
        /* an empty plot asks which seed, every time (the seed window below) */
        if (!firstSeed(run)) {
          if (host.float) host.float(plot.cx, plot.y - 10, "No seeds — enemies drop them", "#ffd36a");
          return false;
        }
        openSeedMenu(plot);
        return false;
      }
      var crop = D.cropOfSeed(seed), def = D.CROPS[crop];
      if (!def || bagCount(run, seed) <= 0) return false;
      if (hasAuth()) {
        r = authAct({ type: "farm.plant", id: localId(), plot: plot.i, seed: seed });
        pullAuth();
        if (!r || !r.ok) { if (host.float) host.float(plot.cx, plot.y - 10, "Can't plant here", "#ff8080"); return false; }
      } else {
        if (!takeBag(run, seed, 1)) return false;
        run.garden = run.garden || [];
        run.garden[plot.i] = { crop: crop, plantedAt: run.time || 0, readyAt: (run.time || 0) + def.growSec };
      }
      if (host.float) host.float(plot.cx, plot.y - 10, "Planted " + def.name + "!", "#a8f080");
      sfx("toy");
      render();
      return true;
    }
    if (now < st.readyAt) {
      var cdef = D.CROPS[st.crop] || { name: st.crop };
      if (host.float) host.float(plot.cx, plot.y - 10, cdef.name + " — grows while you battle (" + fmtLeft(st.readyAt - now) + ")", "#d8f0c0");
      return false;
    }
    var n = 0, cropId = st.crop;
    if (hasAuth()) {
      r = authAct({ type: "farm.harvest", id: localId(), plot: plot.i });
      pullAuth();
      if (!r || !r.ok) return false;
      n = r.n;
    } else {
      var yd = (D.CROPS[cropId] && D.CROPS[cropId].yield) || [1, 2];
      n = yd[0] + Math.floor(Math.random() * (yd[1] - yd[0] + 1));
      run.bag = run.bag || {};
      run.bag[cropId] = (run.bag[cropId] || 0) + n;
      run.garden[plot.i] = null;
    }
    if (host.float) host.float(plot.cx, plot.y - 10, "Harvested " + n + " " + (D.FOOD[cropId] ? D.FOOD[cropId].name : cropId) + "!", (D.FOOD[cropId] && D.FOOD[cropId].color) || "#ffe080");
    sfx("level");
    if (visit.particles) {
      for (var k = 0; k < 6; k++) visit.particles.push({ x: plot.cx + (k - 3) * 8, y: plot.cy, vy: -40 - k * 4, life: 0.9, kind: "leaf" });
    }
    render();
    return true;
  }

  function interact() {
    if (!visit || !visit.active) return;
    if (visit.activity) { activityInput("interact"); return; }
    var run = host && host.getRun && host.getRun();
    var shop = shopPoint();
    var stall = dist(visit.x, visit.y, shop.x, shop.y) < 70;
    if (stall && host.openShop) { host.openShop(); return; }
    var plotNear = nearestPlot(visit.x, visit.y);
    if (plotNear) { plotAction(plotNear); return; }
    var st = nearestStation(visit.x, visit.y);
    if (st) { startActivity(st); return; }
    var slot = selectedKind(run);
    if (slot && slot.kind === "food") { feed(slot.id); return; }
    if (slot && slot.kind === "item") { useItem(slot.id); return; }
    if (slot && slot.kind === "seed") {
      if (host.float) host.float(visit.x, visit.y - 28, "Walk to the garden to plant", "#d8f0c0");
      return;
    }
    pet();
  }

  function selectSlot(index) {
    if (!visit) return;
    if (visit.activity && visit.activity.id === "board") {
      activityInput("choice", index);
      return;
    }
    var run = host && host.getRun && host.getRun();
    var slots = slotList(run);
    if (!slots.length) return;
    visit.selected = ((index % slots.length) + slots.length) % slots.length;
    render();
  }

  function scrollSlot(dir) {
    if (!visit) return;
    visit.selected = (visit.selected || 0) + (dir > 0 ? 1 : -1);
    var run = host && host.getRun && host.getRun();
    var slots = slotList(run);
    if (!slots.length) { visit.selected = 0; return; }
    visit.selected = ((visit.selected % slots.length) + slots.length) % slots.length;
    sfx("ui");
    render();
  }

  function formatTime(t) {
    t = Math.max(0, t);
    var s = Math.ceil(t);
    var m = Math.floor(s / 60);
    s = s % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  function itemName(id) {
    if (D.FOOD && D.FOOD[id]) return D.FOOD[id].name;
    var crop = D.cropOfSeed && D.cropOfSeed(id);
    if (crop && D.CROPS && D.CROPS[crop]) return D.CROPS[crop].name + " Seeds";
    var it = D.shopItem && D.shopItem(id);
    if (it) return it.name;
    if (id === "vitamin") return "Power Vitamin";
    return id;
  }

  function promptFor(action, label) {
    return (D.input && D.input.prompt) ? D.input.prompt(action, label) : label;
  }

  function render() {
    var root = el("farm-screen");
    if (!root) return;
    if (!visit || !visit.active) {
      root.classList.remove("is-on");
      return;
    }
    root.classList.add("is-on");
    var run = host && host.getRun && host.getRun();
    var stay = el("farm-stay");
    if (stay) {
      if (onDemand()) { stay.textContent = "The world goes on without you"; stay.classList.remove("is-warn"); }
      else {
        stay.textContent = "Auto-return " + formatTime(visit.stayLeft);
        stay.classList.toggle("is-warn", visit.stayLeft <= 10);
      }
    }
    var mood = el("farm-mood");
    if (mood && run) {
      var joyName = (D.happinessTier && D.happinessTier(run.happiness).name) || "Content";
      var ts = run.trainStats || {};
      mood.textContent = "Joy " + Math.round(run.happiness || 0) + " · " + joyName +
        "  ·  Fullness " + Math.round(run.fullness || 0) +
        "  ·  Meals " + (run.foodEaten || 0) +
        ((D.dietOf && D.dietOf(run.foodCounts).balanced) ? "  ·  Diet: Balanced" : "") +
        (visit.refused ? "  ·  Turned down food ×" + visit.refused : "");
    }
    var icon = el("farm-hunger-icon");
    if (icon) {
      var show = (cfg().exitHungerPrompt || "icon") === "icon" && run && isHungry(run);
      icon.hidden = !show;
      icon.setAttribute("aria-hidden", show ? "false" : "true");
    }
    var ret = el("btn-farm-return");
    if (ret) ret.classList.toggle("is-hungry", !!(run && isHungry(run) && (cfg().exitHungerPrompt || "icon") === "icon"));
    var trainBtn = el("btn-farm-train");
    if (trainBtn) {
      var stNear = visit.activity ? (cfg().stations || {})[visit.activity.id] : nearestStation(visit.x, visit.y);
      var label = "Train";
      if (visit.activity) {
        if (visit.activity.id === "bag") label = "Punch";
        else if (visit.activity.id === "board") label = "Answer";
        else if (visit.activity.id === "bond") label = "Cheer";
        else label = "Running…";
      } else if (stNear) {
        if (stNear.id === "bag") label = "Punch";
        else if (stNear.id === "board") label = "Study";
        else if (stNear.id === "track") label = "Run";
        else if (stNear.id === "bond") label = "Play";
      }
      trainBtn.textContent = label;
    }
    var slotsEl = el("farm-slots");
    if (slotsEl && run) {
      var slots = slotList(run);
      if (visit.selected >= slots.length) visit.selected = 0;
      var html = "", i, s, cls;
      if (!slots.length) html = "<p class='sub'>Bag is empty. Visit Jijimon's stall for food and care items.</p>";
      for (i = 0; i < slots.length; i++) {
        s = slots[i];
        cls = "farm-slot" + (i === visit.selected ? " is-selected" : "") + (s.kind === "food" ? " is-food" : "") + (s.kind === "seed" ? " is-seed" : "");
        html += "<button type='button' class='" + cls + "' data-i='" + i + "' data-id='" + s.id + "'>";
        html += "<span class='farm-slot-key'>" + (i + 1) + "</span>";
        html += "<span class='farm-slot-name'>" + itemName(s.id) + "</span>";
        html += "<span class='farm-slot-n'>×" + s.n + "</span></button>";
      }
      slotsEl.innerHTML = html;
      var btns = slotsEl.querySelectorAll(".farm-slot"), b;
      for (i = 0; i < btns.length; i++) {
        btns[i].addEventListener("click", function (ev) {
          var idx = parseInt(ev.currentTarget.getAttribute("data-i"), 10);
          selectSlot(idx);
        });
        btns[i].addEventListener("dblclick", function (ev) {
          var id = ev.currentTarget.getAttribute("data-id");
          useItem(id) || feed(id);
        });
      }
    }
    bindFarmHud();
    if (D.input && D.input.applyGlyphs) D.input.applyGlyphs(root);
  }

  var farmHudBound = false;
  function bindFarmHud() {
    if (farmHudBound) return;
    farmHudBound = true;
    function on(id, fn) {
      var n = el(id);
      if (n) n.addEventListener("click", fn);
    }
    on("btn-farm-return", function () { end("ready"); });
    on("btn-farm-pet", function () { interact(); });
    on("btn-farm-train", function () { train(); });
    on("btn-farm-shop", function () { if (host && host.openShop) host.openShop(); });
  }

  /* Cached stylized File Island props. Visual only — anchors, hitboxes,
   * and shedRect / station x,y,radius stay unchanged. */
  var farmArt = null;

  function artCanvas(w, h) {
    if (typeof document === "undefined") return null;
    var c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  function fillRoundRect(ctx, x, y, w, h, r, fill) {
    roundRectPath(ctx, x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function woodFill(ctx, x, y, w, h, c0, c1, horiz) {
    var g, i, n;
    g = horiz
      ? ctx.createLinearGradient(x, y, x, y + h)
      : ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, c0);
    g.addColorStop(0.45, c1);
    g.addColorStop(1, c0);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.globalAlpha = 0.18;
    n = horiz ? Math.ceil(h / 5) : Math.ceil(w / 6);
    for (i = 0; i < n; i++) {
      ctx.strokeStyle = i % 3 === 0 ? "#3a2410" : "#d8b078";
      ctx.lineWidth = i % 4 === 0 ? 1.2 : 0.6;
      ctx.beginPath();
      if (horiz) {
        ctx.moveTo(x, y + 2 + i * 5 + Math.sin(i * 1.7) * 0.8);
        ctx.lineTo(x + w, y + 2 + i * 5 + Math.sin(i * 2.1) * 0.8);
      } else {
        ctx.moveTo(x + 2 + i * 6 + Math.sin(i) * 0.7, y);
        ctx.lineTo(x + 2 + i * 6 + Math.sin(i * 1.4) * 0.7, y + h);
      }
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function paintHouse(dst) {
    var ctx = dst.getContext("2d");
    var S = 2;
    var ox = 22 * S, oy = 56 * S;
    var bw = 140 * S, bh = 90 * S;
    ctx.scale(1, 1);
    /* contact shadow */
    ctx.fillStyle = "rgba(30, 22, 10, 0.32)";
    ctx.beginPath();
    ctx.ellipse(ox + bw * 0.5, oy + bh + 6 * S, bw * 0.56, 11 * S, 0, 0, Math.PI * 2);
    ctx.fill();
    /* right depth face — slanted 3/4, tucked under the eaves and
     * stopped at the foundation so it doesn't float past the house. */
    var depth = 14 * S;
    ctx.fillStyle = "#6a3e22";
    ctx.beginPath();
    ctx.moveTo(ox + bw, oy + 2 * S);
    ctx.lineTo(ox + bw + depth, oy + 10 * S);
    ctx.lineTo(ox + bw + depth, oy + bh - 8 * S);
    ctx.lineTo(ox + bw, oy + bh - 8 * S);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(ox + bw, oy + 2 * S);
    ctx.lineTo(ox + bw + depth, oy + 10 * S);
    ctx.lineTo(ox + bw + depth, oy + bh - 8 * S);
    ctx.lineTo(ox + bw, oy + bh - 8 * S);
    ctx.closePath();
    ctx.clip();
    woodFill(ctx, ox + bw, oy + 6 * S, depth, bh - 12 * S, "#5a341c", "#7a4a28", false);
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(ox + bw, oy + 6 * S, 3 * S, bh - 12 * S);
    ctx.restore();
    /* hip of the roof covering the side wall */
    ctx.fillStyle = "#8a3018";
    ctx.beginPath();
    ctx.moveTo(ox + bw / 2 + 10 * S, oy - 28 * S);
    ctx.lineTo(ox + bw + 12 * S, oy + 4 * S);
    ctx.lineTo(ox + bw + depth + 6 * S, oy + 12 * S);
    ctx.lineTo(ox + bw, oy + 4 * S);
    ctx.closePath();
    ctx.fill();
    /* stone foundation */
    fillRoundRect(ctx, ox - 2 * S, oy + bh - 10 * S, bw + 4 * S, 12 * S, 2 * S, "#6a5a48");
    woodFill(ctx, ox - 2 * S, oy + bh - 10 * S, bw + 4 * S, 12 * S, "#5a4a38", "#7a6a54", true);
    ctx.strokeStyle = "#3a2c20";
    ctx.lineWidth = 1 * S;
    ctx.strokeRect(ox - 2 * S, oy + bh - 10 * S, bw + 4 * S, 12 * S);
    /* front wall */
    woodFill(ctx, ox, oy, bw, bh - 8 * S, "#c4a06a", "#a07848", true);
    ctx.strokeStyle = "#5a3a1c";
    ctx.lineWidth = 1.4 * S;
    ctx.strokeRect(ox + 0.5 * S, oy + 0.5 * S, bw - S, bh - 8.5 * S);
    /* warm wall highlight (upper left) */
    var hg = ctx.createLinearGradient(ox, oy, ox, oy + 28 * S);
    hg.addColorStop(0, "rgba(255, 236, 200, 0.28)");
    hg.addColorStop(1, "rgba(255, 236, 200, 0)");
    ctx.fillStyle = hg;
    ctx.fillRect(ox, oy, bw * 0.7, 28 * S);
    /* corner trim */
    ctx.fillStyle = "#5a3a1c";
    ctx.fillRect(ox, oy, 4 * S, bh - 8 * S);
    ctx.fillRect(ox + bw - 4 * S, oy, 4 * S, bh - 8 * S);
    /* window — left of door, warm glow */
    var wx = ox + 16 * S, wy = oy + 22 * S, ww = 22 * S, wh = 22 * S;
    fillRoundRect(ctx, wx - 2 * S, wy - 2 * S, ww + 4 * S, wh + 4 * S, 2 * S, "#4a2c14");
    var wg = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
    wg.addColorStop(0, "#fff3c0");
    wg.addColorStop(1, "#e8b858");
    fillRoundRect(ctx, wx, wy, ww, wh, 1 * S, "#e8b858");
    ctx.fillStyle = wg;
    ctx.fillRect(wx, wy, ww, wh);
    ctx.strokeStyle = "#4a2c14";
    ctx.lineWidth = 1.5 * S;
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, wy);
    ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.moveTo(wx, wy + wh / 2);
    ctx.lineTo(wx + ww, wy + wh / 2);
    ctx.stroke();
    /* shutter hints */
    ctx.fillStyle = "#7a4a24";
    ctx.fillRect(wx - 5 * S, wy, 4 * S, wh);
    ctx.fillRect(wx + ww + S, wy, 4 * S, wh);
    /* door — same footprint as the previous dark rect (shop-centered) */
    var dx = ox + 48 * S, dy = oy + 40 * S, dw = 36 * S, dh = 50 * S;
    fillRoundRect(ctx, dx - 3 * S, dy - 3 * S, dw + 6 * S, dh + 3 * S, 3 * S, "#3a2414");
    var dg = ctx.createLinearGradient(dx, dy, dx + dw, dy);
    dg.addColorStop(0, "#5a3018");
    dg.addColorStop(0.45, "#7a4a28");
    dg.addColorStop(1, "#4a2814");
    fillRoundRect(ctx, dx, dy, dw, dh, 2 * S, "#6a3a20");
    ctx.fillStyle = dg;
    ctx.fillRect(dx, dy, dw, dh);
    ctx.strokeStyle = "#2a180c";
    ctx.lineWidth = 1.2 * S;
    ctx.strokeRect(dx + 3 * S, dy + 4 * S, dw - 6 * S, dh - 10 * S);
    ctx.beginPath();
    ctx.moveTo(dx + dw / 2, dy + 4 * S);
    ctx.lineTo(dx + dw / 2, dy + dh - 6 * S);
    ctx.stroke();
    /* knob */
    ctx.fillStyle = "#e8c860";
    ctx.beginPath();
    ctx.arc(dx + dw - 8 * S, dy + dh * 0.55, 2.2 * S, 0, Math.PI * 2);
    ctx.fill();
    /* roof — warm terracotta, highlight left, shadow right */
    var peakX = ox + bw / 2, peakY = oy - 40 * S;
    var leftE = ox - 12 * S, rightE = ox + bw + 12 * S, eveY = oy + 4 * S;
    /* underside / eave shadow */
    ctx.fillStyle = "rgba(40, 16, 8, 0.35)";
    ctx.beginPath();
    ctx.moveTo(leftE + 4 * S, eveY);
    ctx.lineTo(rightE - 4 * S, eveY);
    ctx.lineTo(ox + bw, oy + 8 * S);
    ctx.lineTo(ox, oy + 8 * S);
    ctx.closePath();
    ctx.fill();
    /* left slope highlight */
    var lg = ctx.createLinearGradient(leftE, eveY, peakX, peakY);
    lg.addColorStop(0, "#c04a24");
    lg.addColorStop(0.35, "#e88850");
    lg.addColorStop(0.7, "#d06030");
    lg.addColorStop(1, "#f0a060");
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(leftE, eveY);
    ctx.lineTo(peakX, peakY);
    ctx.lineTo(peakX, eveY);
    ctx.closePath();
    ctx.fill();
    /* right slope shadow */
    var rg = ctx.createLinearGradient(peakX, peakY, rightE, eveY);
    rg.addColorStop(0, "#c05830");
    rg.addColorStop(0.4, "#8a3018");
    rg.addColorStop(1, "#6a2010");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(peakX, peakY);
    ctx.lineTo(rightE, eveY);
    ctx.lineTo(peakX, eveY);
    ctx.closePath();
    ctx.fill();
    /* roof tiles */
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(leftE, eveY);
    ctx.lineTo(peakX, peakY);
    ctx.lineTo(rightE, eveY);
    ctx.closePath();
    ctx.clip();
    ctx.strokeStyle = "rgba(80, 20, 8, 0.28)";
    ctx.lineWidth = 1 * S;
    var i, t;
    for (i = 1; i <= 7; i++) {
      t = i / 8;
      ctx.beginPath();
      ctx.moveTo(leftE + (peakX - leftE) * t, eveY + (peakY - eveY) * t);
      ctx.lineTo(rightE - (rightE - peakX) * t, eveY + (peakY - eveY) * t);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255, 200, 140, 0.22)";
    for (i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(peakX - 18 * S + i * 8 * S, peakY + 8 * S);
      ctx.lineTo(leftE + 10 * S + i * 12 * S, eveY);
      ctx.stroke();
    }
    ctx.restore();
    /* ridge cap */
    ctx.strokeStyle = "#5a1c0c";
    ctx.lineWidth = 3.2 * S;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(leftE + 2 * S, eveY - 1 * S);
    ctx.lineTo(peakX, peakY - 2 * S);
    ctx.lineTo(rightE - 2 * S, eveY - 1 * S);
    ctx.stroke();
    ctx.strokeStyle = "#f0b070";
    ctx.lineWidth = 1.1 * S;
    ctx.beginPath();
    ctx.moveTo(leftE + 8 * S, eveY - 2 * S);
    ctx.lineTo(peakX, peakY - 3.4 * S);
    ctx.stroke();
    /* chimney on right slope */
    var cx = ox + bw * 0.72, cy = oy - 18 * S;
    ctx.fillStyle = "#6a4a3a";
    ctx.fillRect(cx, cy, 12 * S, 22 * S);
    woodFill(ctx, cx, cy, 12 * S, 22 * S, "#5a3a2c", "#7a5a48", true);
    ctx.fillStyle = "#4a2c20";
    ctx.fillRect(cx - 2 * S, cy - 4 * S, 16 * S, 6 * S);
    ctx.fillStyle = "rgba(220, 220, 224, 0.45)";
    ctx.beginPath();
    ctx.ellipse(cx + 6 * S, cy - 10 * S, 5 * S, 7 * S, 0, 0, Math.PI * 2);
    ctx.fill();
    /* fascia trim under eaves */
    ctx.strokeStyle = "#3a1c0c";
    ctx.lineWidth = 2 * S;
    ctx.beginPath();
    ctx.moveTo(leftE + 2 * S, eveY);
    ctx.lineTo(rightE - 2 * S, eveY);
    ctx.stroke();
  }

  function paintBagFrame(dst) {
    var ctx = dst.getContext("2d");
    var S = 2, ox = 36 * S, oy = 70 * S;
    /* contact shadow */
    ctx.fillStyle = "rgba(20, 14, 8, 0.35)";
    ctx.beginPath();
    ctx.ellipse(ox, oy + 10 * S, 20 * S, 6 * S, 0, 0, Math.PI * 2);
    ctx.fill();
    /* wooden base / platform */
    fillRoundRect(ctx, ox - 18 * S, oy + 2 * S, 36 * S, 9 * S, 2 * S, "#4a3018");
    woodFill(ctx, ox - 18 * S, oy + 2 * S, 36 * S, 9 * S, "#3a2410", "#6a4828", true);
    ctx.strokeStyle = "#2a1808";
    ctx.lineWidth = 1 * S;
    ctx.strokeRect(ox - 18 * S, oy + 2 * S, 36 * S, 9 * S);
    /* two posts + crossbeam */
    woodFill(ctx, ox - 16 * S, oy - 64 * S, 6 * S, 68 * S, "#6a4424", "#8a5a32", false);
    woodFill(ctx, ox + 10 * S, oy - 64 * S, 6 * S, 68 * S, "#6a4424", "#8a5a32", false);
    ctx.strokeStyle = "#3a2410";
    ctx.lineWidth = 1 * S;
    ctx.strokeRect(ox - 16 * S, oy - 64 * S, 6 * S, 68 * S);
    ctx.strokeRect(ox + 10 * S, oy - 64 * S, 6 * S, 68 * S);
    /* top beam */
    woodFill(ctx, ox - 20 * S, oy - 70 * S, 40 * S, 8 * S, "#8a5a32", "#c08a50", true);
    ctx.strokeStyle = "#3a2410";
    ctx.strokeRect(ox - 20 * S, oy - 70 * S, 40 * S, 8 * S);
    /* hook */
    ctx.strokeStyle = "#c0c4c8";
    ctx.lineWidth = 2 * S;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(ox, oy - 62 * S);
    ctx.lineTo(ox, oy - 54 * S);
    ctx.arc(ox, oy - 51 * S, 3 * S, -Math.PI / 2, Math.PI / 2, false);
    ctx.stroke();
  }

  function paintBagBody(dst) {
    var ctx = dst.getContext("2d");
    var S = 2, cx = 36 * S, cy = 28 * S;
    /* hanging ring + straps */
    ctx.strokeStyle = "#4a3020";
    ctx.lineWidth = 2.2 * S;
    ctx.beginPath();
    ctx.moveTo(cx, 2 * S);
    ctx.lineTo(cx, 8 * S);
    ctx.stroke();
    ctx.fillStyle = "#d8d0c4";
    ctx.beginPath();
    ctx.arc(cx, 2 * S, 3 * S, 0, Math.PI * 2);
    ctx.fill();
    /* bag body */
    var g = ctx.createLinearGradient(cx - 16 * S, cy, cx + 16 * S, cy);
    g.addColorStop(0, "#4a1c14");
    g.addColorStop(0.25, "#8a3a28");
    g.addColorStop(0.5, "#c06040");
    g.addColorStop(0.72, "#8a3a28");
    g.addColorStop(1, "#3a1410");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2 * S, 15 * S, 22 * S, 0, 0, Math.PI * 2);
    ctx.fill();
    /* padded top cap */
    ctx.fillStyle = "#d8c8a8";
    ctx.beginPath();
    ctx.ellipse(cx, cy - 16 * S, 9 * S, 4.5 * S, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a6a40";
    ctx.lineWidth = 1 * S;
    ctx.stroke();
    /* seams */
    ctx.strokeStyle = "rgba(255, 220, 180, 0.45)";
    ctx.lineWidth = 1 * S;
    ctx.setLineDash([3 * S, 2 * S]);
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2 * S, 10 * S, 18 * S, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(cx, cy - 14 * S);
    ctx.lineTo(cx, cy + 22 * S);
    ctx.stroke();
    /* straps */
    ctx.fillStyle = "#3a2418";
    ctx.fillRect(cx - 15 * S, cy - 6 * S, 30 * S, 3.2 * S);
    ctx.fillRect(cx - 14 * S, cy + 8 * S, 28 * S, 3.2 * S);
    ctx.fillStyle = "#c8a060";
    ctx.fillRect(cx + 8 * S, cy - 6.4 * S, 3 * S, 4 * S);
    ctx.fillRect(cx + 7 * S, cy + 7.6 * S, 3 * S, 4 * S);
    /* highlight */
    ctx.fillStyle = "rgba(255, 230, 200, 0.28)";
    ctx.beginPath();
    ctx.ellipse(cx - 5 * S, cy - 4 * S, 4 * S, 9 * S, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  function paintBoard(dst) {
    var ctx = dst.getContext("2d");
    var S = 2, cx = 44 * S, cy = 52 * S;
    /* contact shadow */
    ctx.fillStyle = "rgba(20, 14, 8, 0.3)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 32 * S, 22 * S, 5 * S, 0, 0, Math.PI * 2);
    ctx.fill();
    /* back leg */
    woodFill(ctx, cx + 10 * S, cy - 8 * S, 5 * S, 40 * S, "#5a3a1c", "#7a5228", false);
    /* front legs */
    woodFill(ctx, cx - 20 * S, cy - 2 * S, 5 * S, 34 * S, "#6a4424", "#8a5a32", false);
    woodFill(ctx, cx + 15 * S, cy - 2 * S, 5 * S, 34 * S, "#6a4424", "#8a5a32", false);
    ctx.strokeStyle = "#3a2410";
    ctx.lineWidth = 1 * S;
    ctx.strokeRect(cx - 20 * S, cy - 2 * S, 5 * S, 34 * S);
    ctx.strokeRect(cx + 15 * S, cy - 2 * S, 5 * S, 34 * S);
    /* frame */
    fillRoundRect(ctx, cx - 30 * S, cy - 48 * S, 60 * S, 46 * S, 3 * S, "#6a4424");
    woodFill(ctx, cx - 30 * S, cy - 48 * S, 60 * S, 46 * S, "#5a3a1c", "#8a5a30", true);
    ctx.strokeStyle = "#3a2410";
    ctx.lineWidth = 1.6 * S;
    roundRectPath(ctx, cx - 30 * S, cy - 48 * S, 60 * S, 46 * S, 3 * S);
    ctx.stroke();
    /* inner rebate */
    ctx.strokeStyle = "#c49a60";
    ctx.lineWidth = 1 * S;
    ctx.strokeRect(cx - 26 * S, cy - 44 * S, 52 * S, 34 * S);
    /* slate */
    var sg = ctx.createLinearGradient(cx - 24 * S, cy - 42 * S, cx + 24 * S, cy - 10 * S);
    sg.addColorStop(0, "#1a4a32");
    sg.addColorStop(0.5, "#246044");
    sg.addColorStop(1, "#143828");
    fillRoundRect(ctx, cx - 24 * S, cy - 42 * S, 48 * S, 30 * S, 1 * S, "#1e4a32");
    ctx.fillStyle = sg;
    ctx.fillRect(cx - 24 * S, cy - 42 * S, 48 * S, 30 * S);
    /* chalk wear */
    ctx.fillStyle = "rgba(230, 230, 210, 0.08)";
    ctx.fillRect(cx - 22 * S, cy - 28 * S, 44 * S, 10 * S);
    /* doodles */
    ctx.strokeStyle = "rgba(240, 236, 214, 0.92)";
    ctx.fillStyle = "rgba(240, 236, 214, 0.92)";
    ctx.lineWidth = 1.3 * S;
    ctx.lineCap = "round";
    ctx.font = (8 * S) + "px Trebuchet MS, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("A B C", cx - 20 * S, cy - 30 * S);
    /* star */
    ctx.beginPath();
    ctx.moveTo(cx + 10 * S, cy - 18 * S);
    ctx.lineTo(cx + 12 * S, cy - 12 * S);
    ctx.lineTo(cx + 18 * S, cy - 12 * S);
    ctx.lineTo(cx + 13 * S, cy - 8 * S);
    ctx.lineTo(cx + 15 * S, cy - 3 * S);
    ctx.lineTo(cx + 10 * S, cy - 6 * S);
    ctx.lineTo(cx + 5 * S, cy - 3 * S);
    ctx.lineTo(cx + 7 * S, cy - 8 * S);
    ctx.lineTo(cx + 2 * S, cy - 12 * S);
    ctx.lineTo(cx + 8 * S, cy - 12 * S);
    ctx.closePath();
    ctx.globalAlpha = 0.85;
    ctx.stroke();
    ctx.globalAlpha = 1;
    /* little mon doodle */
    ctx.beginPath();
    ctx.arc(cx - 10 * S, cy - 16 * S, 5 * S, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - 12 * S, cy - 17 * S, 0.8 * S, 0, Math.PI * 2);
    ctx.arc(cx - 8 * S, cy - 17 * S, 0.8 * S, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 14 * S, cy - 22 * S);
    ctx.lineTo(cx - 12 * S, cy - 20 * S);
    ctx.moveTo(cx - 6 * S, cy - 22 * S);
    ctx.lineTo(cx - 8 * S, cy - 20 * S);
    ctx.stroke();
    /* chalk tray */
    woodFill(ctx, cx - 26 * S, cy - 10 * S, 52 * S, 7 * S, "#8a5a30", "#c08a50", true);
    ctx.strokeStyle = "#3a2410";
    ctx.lineWidth = 1 * S;
    ctx.strokeRect(cx - 26 * S, cy - 10 * S, 52 * S, 7 * S);
    /* chalk sticks */
    ctx.fillStyle = "#f4f0e0";
    ctx.fillRect(cx - 16 * S, cy - 8.5 * S, 9 * S, 3 * S);
    ctx.fillStyle = "#f0d060";
    ctx.fillRect(cx - 4 * S, cy - 8.5 * S, 8 * S, 3 * S);
    /* eraser */
    fillRoundRect(ctx, cx + 8 * S, cy - 9 * S, 10 * S, 4.5 * S, 1 * S, "#3a2a28");
    ctx.fillStyle = "#c8b090";
    ctx.fillRect(cx + 8 * S, cy - 9 * S, 10 * S, 2 * S);
  }

  function ensureFarmArt() {
    if (visit && visit._flatArt) return null;
    if (farmArt && farmArt.house) return farmArt;
    var house = artCanvas((140 + 44) * 2, (90 + 86) * 2);
    var bagFrame = artCanvas(72 * 2, 90 * 2);
    var bagBody = artCanvas(72 * 2, 60 * 2);
    var board = artCanvas(88 * 2, 96 * 2);
    if (!house) return null;
    paintHouse(house);
    paintBagFrame(bagFrame);
    paintBagBody(bagBody);
    paintBoard(board);
    farmArt = {
      house: house, bagFrame: bagFrame, bagBody: bagBody, board: board,
      /* dest size and anchor in unscaled world pixels */
      houseW: 140 + 44, houseH: 90 + 86, houseOx: 22, houseOy: 56,
      bagW: 72, bagH: 90, bagOx: 36, bagOy: 70,
      bodyW: 72, bodyH: 60, bodyOx: 36, bodyOy: 28,
      boardW: 88, boardH: 96, boardOx: 44, boardOy: 52
    };
    return farmArt;
  }

  function blitArt(ctx, canvas, dx, dy, dw, dh) {
    if (!canvas) return;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(canvas, dx, dy, dw, dh);
    ctx.restore();
  }

  function drawStationBag(ctx, sx, sy, st, t) {
    var x = sx(st.x), y = sy(st.y);
    var sway = Math.sin((t || 0) * 6) * (visit && visit.activity && visit.activity.id === "bag" && visit.activity.window > 0 ? 6 : 1.5);
    var art = ensureFarmArt();
    if (art) {
      blitArt(ctx, art.bagFrame, x - art.bagOx, y - art.bagOy, art.bagW, art.bagH);
      blitArt(ctx, art.bagBody, x - art.bodyOx + sway, y - 48 - 8, art.bodyW, art.bodyH);
    } else {
      ctx.fillStyle = "#5a3a22";
      ctx.fillRect(x - 3, y - 36, 6, 40);
      ctx.fillStyle = "#3a2414";
      ctx.fillRect(x - 10, y + 2, 20, 6);
      ctx.fillStyle = "#8a5a32";
      ctx.beginPath();
      ctx.ellipse(x + sway, y - 44, 14, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#6a4024";
      ctx.beginPath();
      ctx.ellipse(x + sway, y - 44, 10, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d8c0a0";
      ctx.fillRect(x - 8 + sway, y - 52, 16, 4);
    }
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "11px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Bag", x, y + 18);
  }

  function drawStationBoard(ctx, sx, sy, st, t) {
    var x = sx(st.x), y = sy(st.y);
    var art = ensureFarmArt();
    if (art) {
      blitArt(ctx, art.board, x - art.boardOx, y - art.boardOy, art.boardW, art.boardH);
    } else {
      ctx.fillStyle = "#6a4424";
      ctx.beginPath();
      ctx.moveTo(x - 6, y + 28);
      ctx.lineTo(x, y - 6);
      ctx.lineTo(x + 6, y + 28);
      ctx.fill();
      ctx.fillStyle = "#5a3a1c";
      ctx.fillRect(x - 28, y - 44, 56, 40);
      ctx.fillStyle = "#2a5a38";
      ctx.fillRect(x - 24, y - 40, 48, 32);
      ctx.fillStyle = "#f0e8d0";
      ctx.font = "10px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("A  B  C", x, y - 22);
      ctx.fillStyle = "#d8c090";
      ctx.fillRect(x - 16, y - 8, 32, 3);
    }
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "11px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Board", x, y + 22);
  }

  function drawStationTrack(ctx, sx, sy, st) {
    var g = trackGeom();
    var cx = sx(g.cx), cy = sy(g.cy);
    var rx = g.rx, ry = g.ry, w = g.width || 44;
    ctx.save();
    /* Visibly black running ring along the inside of the fence.
     * Do not fill the infield — grass stays in the yard interior. */
    ctx.strokeStyle = "#0a0a0c";
    ctx.lineWidth = w;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#2a2a2e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx + w / 2 - 1, ry + w / 2 - 1, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(8, rx - w / 2 + 1), Math.max(6, ry - w / 2 + 1), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(70, 70, 74, 0.85)";
    ctx.lineWidth = 1;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    /* Start / finish mark on the east gate */
    var gate = pointOnTrack(0, g);
    var gx = sx(gate.x), gy = sy(gate.y);
    var nx = (g.rx ? (gate.x - g.cx) / g.rx : 1);
    var ny = (g.ry ? (gate.y - g.cy) / g.ry : 0);
    ctx.strokeStyle = "#e8e8e8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(gx - ny * (w / 2 - 2), gy + nx * (w / 2 - 2));
    ctx.lineTo(gx + ny * (w / 2 - 2), gy - nx * (w / 2 - 2));
    ctx.stroke();
    ctx.restore();
    var south = pointOnTrack(Math.PI / 2, g);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "11px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Track", sx(south.x), sy(south.y) + w / 2 + 14);
  }

  function drawStationBond(ctx, sx, sy, st, t) {
    var x = sx(st.x), y = sy(st.y);
    /* rug */
    ctx.fillStyle = "#7a3a3a";
    ctx.beginPath();
    ctx.ellipse(x, y + 22, 36, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c06060";
    ctx.beginPath();
    ctx.ellipse(x, y + 22, 28, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    /* crate */
    ctx.fillStyle = "#8a5a28";
    ctx.fillRect(x - 16, y - 6, 32, 16);
    ctx.fillStyle = "#6a4018";
    ctx.fillRect(x - 16, y - 8, 32, 4);
    /* CRT */
    var flicker = 0.72 + Math.sin((t || 0) * 14) * 0.22;
    ctx.fillStyle = "#2a2a28";
    ctx.fillRect(x - 18, y - 36, 36, 28);
    ctx.fillStyle = "#1a1a18";
    ctx.fillRect(x - 14, y - 32, 28, 18);
    ctx.fillStyle = "rgba(120, 220, 160," + flicker + ")";
    ctx.fillRect(x - 13, y - 31, 26, 16);
    /* knobs */
    ctx.fillStyle = "#c0c0b0";
    ctx.beginPath(); ctx.arc(x + 12, y - 10, 2, 0, Math.PI * 2); ctx.fill();
    /* console */
    ctx.fillStyle = "#3a3a48";
    ctx.fillRect(x - 34, y + 8, 16, 8);
    ctx.fillStyle = "#2a2a38";
    ctx.fillRect(x - 32, y + 6, 12, 3);
    /* controllers + cords */
    ctx.strokeStyle = "#2a2018";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 26, y + 16);
    ctx.quadraticCurveTo(x - 30, y + 28, x - 22, y + 30);
    ctx.moveTo(x - 22, y + 16);
    ctx.quadraticCurveTo(x + 8, y + 26, x + 18, y + 30);
    ctx.stroke();
    function pad(px, py) {
      ctx.fillStyle = "#3a3a3a";
      ctx.fillRect(px - 8, py - 5, 16, 10);
      ctx.fillStyle = "#2a2a2a";
      ctx.fillRect(px - 6, py - 3, 5, 5);
      ctx.fillStyle = "#c04040";
      ctx.beginPath(); ctx.arc(px + 4, py - 1, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    pad(x - 22, y + 32);
    pad(x + 18, y + 32);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "11px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Play", x, y + 48);
  }

  function drawActivityOverlay(ctx, sx, sy, t) {
    var a = visit.activity;
    if (!a) return;
    var st = (cfg().stations || {})[a.id];
    if (!st) return;
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "13px Trebuchet MS, sans-serif";
    if (a.id === "bag") {
      var flash = a.window > 0;
      ctx.fillStyle = flash ? "rgba(255,224,128,0.95)" : "rgba(255,255,255,0.85)";
      ctx.fillText(flash ? promptFor("interact", "Punch!") : "Watch the bag…", sx(st.x), sy(st.y) - 64);
    } else if (a.id === "board" && a.quiz) {
      ctx.fillStyle = "rgba(8,16,12,0.78)";
      var bx = sx(st.x), by = sy(st.y) - 86;
      ctx.fillRect(bx - 110, by - 10, 220, 62);
      ctx.fillStyle = "#e8f8d8";
      ctx.fillText(a.quiz.prompt, bx, by + 10);
      var i, lab;
      for (i = 0; i < 3; i++) {
        lab = promptFor("slot", String(i + 1)) + "  " + a.quiz.options[i];
        ctx.fillStyle = a.choice === i ? "#ffe080" : "#d0e8c0";
        ctx.fillText(lab, bx - 70 + i * 70, by + 36);
      }
    } else if (a.id === "track") {
      var tg = trackGeom();
      var tip = pointOnTrack(a.angle, tg);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText(promptFor("move", "Pace the lap") + "  ·  Lap " + (a.laps + 1), sx(tip.x), sy(tip.y) - 36);
    } else if (a.id === "bond") {
      ctx.fillStyle = "rgba(255,176,224,0.95)";
      ctx.fillText(promptFor("interact", "Cheer") + "  (optional)", sx(st.x), sy(st.y) - 52);
    }
    ctx.restore();
  }

  /* Baked farm scene: ground + fence + decoration list. Rebuilt when the
   * season or the farm skin changes. */
  var scene = null, sceneKey = "";
  function ensureScene() {
    var FA = D.farmArt;
    if (!FA || typeof document === "undefined") return null;
    if (visit && visit._flatArt) return null;
    var season = FA.season();
    var skin = farmSkin();
    var key = season + "|" + skin;
    if (scene && sceneKey === key) return scene;
    var pal = skinPalette(skin);
    var f = fenceRect();
    var g = trackGeom();
    var sts = cfg().stations || {};
    var shop = shopPoint();
    var gp = plots();
    var gx0 = gp.length ? gp[0].x : 494, gy0 = gp.length ? gp[0].y : 540;
    var gx1 = gp.length ? gp[gp.length - 1].x + gp[gp.length - 1].w : 826, gy1 = gp.length ? gp[gp.length - 1].y + gp[gp.length - 1].h : 676;
    var gcx = (gx0 + gx1) / 2;
    var cx = (f.x0 + f.x1) / 2, cy = (f.y0 + f.y1) / 2;
    /* a round yard in the middle; lanes run out from it to each station and down past the garden to the gate */
    var bagX = sts.bag ? sts.bag.x : 260, bagY = sts.bag ? sts.bag.y : 430, brdX = sts.board ? sts.board.x : 520, brdY = sts.board ? sts.board.y : 250;
    var bondX = sts.bond ? sts.bond.x : 1020, bondY = sts.bond ? sts.bond.y : 480;
    var paths = [
      [cx, cy, cx, cy, 132],
      [shop.x, shop.y + 8, shop.x, shop.y + 40, 44], [shop.x, shop.y + 40, cx + 30, cy - 30, 36],
      [cx, cy + 40, gcx, gy0 - 22, 38],
      [gcx, gy1 + 30, gcx, f.y1 + 150, 40],
      [cx - 40, cy, bagX + 70, bagY - 4, 30], [bagX + 70, bagY - 4, bagX + 30, bagY, 30],
      [cx - 20, cy - 40, brdX + 30, brdY + 70, 30], [brdX + 30, brdY + 70, brdX, brdY + 26, 30],
      [cx + 40, cy + 10, bondX - 70, bondY + 4, 30], [bondX - 70, bondY + 4, bondX - 36, bondY + 22, 30]
    ];
    var pads = [];
    pads.push({ x: 92, y: 124, rx: 46, ry: 26, kind: "stone" });
    pads.push({ x: 90, y: 776, rx: 52, ry: 24, kind: "worn" });
    pads.push({ x: 1232, y: 132, rx: 62, ry: 34, kind: "worn" }, { x: 1232, y: 776, rx: 66, ry: 28, kind: "worn" });
    if (sts.bond) pads.push({ x: sts.bond.x, y: sts.bond.y + 22, rx: 78, ry: 40, kind: "worn" });
    if (sts.bag) pads.push({ x: sts.bag.x, y: sts.bag.y + 2, rx: 50, ry: 26, kind: "sand" });
    if (sts.board) pads.push({ x: sts.board.x, y: sts.board.y + 6, rx: 50, ry: 24, kind: "stone" });
    var shed = shedRect();
    var beds = [
      { x: shed.x - 6, y: shed.y + (shed.h || 90) + 6, w: 54, h: 18 },
      { x: shed.x + (shed.w || 140) - 48, y: shed.y + (shed.h || 90) + 6, w: 54, h: 18 }
    ];
    var ground = FA.paintGround({
      bounds: { x0: -720, y0: -480, x1: 2040, y1: 1300 },
      fence: f, track: g, paths: paths, pads: pads, beds: beds,
      garden: { x: gx0, y: gy0, w: gx1 - gx0, h: gy1 - gy0, plots: gp },
      pal: pal
    });
    var fence = FA.paintFence(f, { x0: gcx - 60, x1: gcx + 60 });
    if (!ground || !fence) return null;
    var P = FA.props;
    var deco = [
      { x: 92, y: 118, art: P.well },
      { x: 1214, y: 104, art: P.hay }, { x: 1250, y: 126, art: P.hay }, { x: 1226, y: 140, art: P.hay },
      { x: 86, y: 770, art: P.trough },
      { x: 1236, y: 772, art: P.hay }, { x: 1196, y: 780, art: P.flowerPot }, { x: 1272, y: 760, art: P.flowerPot },
      { x: gx1 + 34, y: gy0 + 70, art: P.scarecrow },
      { x: gx0 - 30, y: gy0 + 26, art: P.gardenSign }
    ];
    /* Woods around the fence and planting in the yard's corners, from the same art the
     * Digital World uses (js/terrain-art.js through D.sprites.drawProp), so the farm sits in it. */
    function rnd(a, b2, c2) { var n = (Math.imul(a | 0, 374761393) + Math.imul(b2 | 0, 668265263) + Math.imul((c2 | 0) + 1, 1274126177)) >>> 0; n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0; return (n >>> 0) / 4294967296; }
    var world = !!(D.sprites && D.sprites.drawProp), winter = season === "winter";
    function plant(kind, x, y) { if (world) deco.push({ x: x, y: y, kind: kind }); else if (kind === "tree") deco.push({ x: x, y: y, art: (function (v) { return function () { return P.tree(v); }; })((x | 0) & 1) }); }
    var tx, ty, i = 0, r1, r2, onGate;
    for (ty = f.y0 - 330; ty <= f.y1 + 400; ty += 62) {
      for (tx = f.x0 - 520; tx <= f.x1 + 520; tx += 74) {
        i++;
        r1 = rnd(tx, ty, 5); r2 = rnd(tx, ty, 6);
        var px0 = tx + (r1 - 0.5) * 56 + ((((ty - f.y0) / 62) | 0) & 1) * 37, py0 = ty + (r2 - 0.5) * 40;
        var out = Math.max(f.x0 - px0, px0 - f.x1, f.y0 - 26 - py0, py0 - f.y1 - 34);     /* how far outside the fence */
        if (out < 30) continue;
        onGate = Math.abs(px0 - gcx) < 74 && py0 > f.y1;                                 /* keep the lane to the gate open */
        if (onGate) continue;
        var dens = out < 150 ? 0.62 : 0.9, rk = rnd(tx, ty, 7);
        if (rk > dens) { if (rk > 0.97) plant(rnd(tx, ty, 8) > 0.5 ? "rock" : "stump", px0, py0); else if (rk > 0.9) plant("bush", px0, py0); continue; }
        plant("tree", px0, py0);
        if (rnd(tx, ty, 9) > 0.7) plant("bush", px0 + 30, py0 + 14);
      }
    }
    /* inside the fence, outside the track: shrubs, flowers and stones tucked into the corners */
    var near = [[92, 118, 70], [1232, 122, 86], [86, 772, 70], [1232, 772, 90]], k, clear, ee;
    for (ty = f.y0 + 34; ty < f.y1 - 10; ty += 44) {
      for (tx = f.x0 + 34; tx < f.x1 - 20; tx += 52) {
        r1 = rnd(tx, ty, 15); r2 = rnd(tx, ty, 16);
        px0 = tx + (r1 - 0.5) * 36; py0 = ty + (r2 - 0.5) * 28;
        ee = Math.sqrt(Math.pow((px0 - g.cx) / (g.rx + g.width / 2 + 26), 2) + Math.pow((py0 - g.cy) / (g.ry + g.width / 2 + 22), 2));
        if (ee < 1) continue;
        clear = Math.abs(px0 - gcx) > 80 || py0 < f.y1 - 120;
        for (k = 0; k < near.length; k++) if (Math.abs(px0 - near[k][0]) < near[k][2] && Math.abs(py0 - near[k][1]) < 60) clear = false;
        if (!clear) continue;
        rk = rnd(tx, ty, 17);
        if (rk < 0.2) plant("bush", px0, py0);
        else if (rk < 0.42 && !winter) plant(rk < 0.31 ? "flower" : "flower2", px0, py0);
        else if (rk < 0.56) plant("tallgrass", px0, py0);
        else if (rk < 0.63) plant("rock", px0, py0);
        else if (rk < 0.67 && !winter) plant("mushroom", px0, py0);
        else if (rk < 0.7) plant("pebbles", px0, py0);
      }
    }
    /* a few flowers along the lanes and round the cottage */
    if (!winter) [[shop.x - 96, shop.y + 34], [shop.x + 98, shop.y + 30], [cx - 78, cy - 52], [cx + 84, cy + 46], [gx1 + 62, gy1 + 30], [gx0 - 84, gy0 + 96], [bagX - 62, bagY + 22], [brdX + 66, brdY + 30], [bondX + 86, bondY + 52]]
      .forEach(function (q, qi) { plant(qi & 1 ? "flower" : "flower2", q[0], q[1]); });
    plant("log", 1150, 742); plant("stump", 164, 96);
    var bd = D.seasons ? D.seasons.ground(pal.dark || "#2e6a24", "grass", season, 0.5) : (pal.dark || "#2e6a24");
    scene = { ground: ground, fence: fence, deco: deco, backdrop: bd };
    sceneKey = key;
    return scene;
  }

  function draw(ctx, vw, vh, t) {
    if (!visit || !ctx) return;
    var run = host && host.getRun && host.getRun();
    var c = cfg();
    var ysz = yardSize();
    var W = ysz.w, H = ysz.h;
    /* Keep the tamer above the compact farm panel. */
    var camX = visit.x, camY = visit.y + 70, camScale = 1;
    /* Same top-down angle. During a track lap, follow the partner so the
     * full perimeter circuit is visible. Overview zooms to fit the yard. */
    if (visit.activity && visit.activity.id === "track" && !visit._overview) {
      camX = visit.mx;
      camY = visit.my;
    }
    if (visit._shotCam) {
      camX = visit._shotCam.x;
      camY = visit._shotCam.y;
      camScale = visit._shotCam.scale != null ? visit._shotCam.scale : 2.2;
    } else if (visit._overview) {
      /* Extra vertical pad keeps the top fence under the sky wash / HUD. */
      camX = W / 2;
      camY = H / 2 + 36;
      camScale = Math.min(vw / (W + 96), vh / (H + 200));
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    var gest = camGesture();
    var z = camScale * (gest.zoom || 1);
    var rot = gest.rot || 0;
    ctx.save();
    ctx.translate(vw / 2, vh / 2);
    if (rot) ctx.rotate(rot);
    if (z !== 1) ctx.scale(z, z);
    ctx.translate(-camX, -camY);
    var spanW = vw / Math.max(0.05, z) + 160;
    var spanH = vh / Math.max(0.05, z) + 160;
    if (rot) {
      var pad = Math.abs(Math.sin(rot)) * spanW + Math.abs(Math.cos(rot)) * spanH;
      spanW = Math.max(spanW, pad + 160);
      spanH = Math.max(spanH, pad + 160);
    }
    var scene = ensureScene();
    var FA = D.farmArt;
    /* Backdrop beyond the baked ground (only visible when zoomed far out). */
    ctx.fillStyle = scene ? scene.backdrop : "#3e7a2a";
    ctx.fillRect(camX - spanW / 2, camY - spanH / 2, spanW, spanH);
    function sx(x) { return x; }
    function sy(y) { return y; }
    if (scene && FA) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(scene.ground.canvas, scene.ground.x, scene.ground.y, scene.ground.w, scene.ground.h);
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(camX - spanW / 2, camY - spanH / 2);
      fillGrass(ctx, spanW, spanH, camX, camY, true);
      ctx.restore();
    }
    var sts = c.stations || {};
    var shed = shedRect();
    var shop = shopPoint();
    var now = gardenNow();
    var items = [];
    function add(y, fn) { items.push({ y: y, fn: fn }); }

    if (scene && FA) {
      /* Flat things first: play blanket, crops, fence. */
      if (sts.bond) FA.blit(ctx, FA.props.playMat(), sts.bond.x, sts.bond.y + 26);
      var gp = plots(), gi, pst, stg, k, plant;
      for (gi = 0; gi < gp.length; gi++) {
        pst = plotState(run, gp[gi].i);
        if (!pst || !pst.crop) continue;
        stg = D.cropStage ? D.cropStage(pst, now) : 2;
        plant = FA.crop(pst.crop, stg);
        for (k = 0; k < 3; k++) {
          (function (px0, py0, pl, ripe) {
            add(py0, function () {
              FA.blitCanvas(ctx, pl, px0, py0, 3);
              if (ripe && Math.sin((t || 0) * 5 + px0) > 0.6) {
                ctx.fillStyle = "#fff8c0";
                ctx.fillRect(px0 + 8, py0 - 40, 3, 3);
              }
            });
          })(gp[gi].x + gp[gi].w * (0.2 + k * 0.3), gp[gi].y + 22 + (k === 1 ? 26 : 12), plant, stg === 2);
        }
      }
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(scene.fence.canvas, scene.fence.x, scene.fence.y, scene.fence.w, scene.fence.h);
      ctx.restore();
      /* Upright props, depth-sorted with the actors. */
      add(shed.y + (shed.h || 90) + 2, function () { FA.blit(ctx, FA.props.cottage(), shed.x + (shed.w || 140) / 2, shed.y + (shed.h || 90) + 2); });
      if (sts.bag) {
        add(sts.bag.y, function () {
          var sway = Math.sin((t || 0) * 6) * (visit && visit.activity && visit.activity.id === "bag" && visit.activity.window > 0 ? 6 : 1.5);
          FA.blit(ctx, FA.props.bagFrame(), sts.bag.x, sts.bag.y + 6);
          FA.blit(ctx, FA.props.bagBody(), sts.bag.x, sts.bag.y - 87, Math.round(sway));
        });
      }
      if (sts.board) add(sts.board.y, function () { FA.blit(ctx, FA.props.board(), sts.board.x, sts.board.y + 8); });
      var deco = scene.deco, di;
      for (di = 0; di < deco.length; di++) {
        if (deco[di].x < camX - spanW / 2 - 80 || deco[di].x > camX + spanW / 2 + 80 || deco[di].y < camY - spanH / 2 - 60 || deco[di].y > camY + spanH / 2 + 110) continue;
        (function (d0) { add(d0.y, function () { if (d0.kind) D.sprites.drawProp(ctx, d0.kind, d0.x, d0.y); else FA.blit(ctx, d0.art(), d0.x, d0.y); }); })(deco[di]);
      }
    } else {
      if (sts.track) drawStationTrack(ctx, sx, sy, sts.track);
      if (sts.bag) drawStationBag(ctx, sx, sy, sts.bag, t);
      if (sts.board) drawStationBoard(ctx, sx, sy, sts.board, t);
      if (sts.bond) drawStationBond(ctx, sx, sy, sts.bond, t);
    }

    /* actors */
    if (run && D.sprites && D.sprites.drawTamer) {
      add(visit.y, function () { D.sprites.drawTamer(ctx, sx(visit.x), sy(visit.y), visit.facing, t || 0, false, visit.moving, false, visit.tdir || "side", run.tamerId || "junior", "farm"); });
    }
    if (visit.activity && visit.activity.id === "bond") {
      var buddy = visit.activity.buddy || "patamon";
      var bx = (sts.bond ? sts.bond.x : 1020) + 18;
      var by = (sts.bond ? sts.bond.y : 480) + 16;
      if (run && D.sprites && D.sprites.drawPartner) add(by, function () { D.sprites.drawPartner(ctx, buddy, sx(bx), sy(by), -1, 1.05, t || 0, false, false, false); });
    }
    if (run && D.sprites && D.sprites.drawPartner) {
      add(visit.my, function () { D.sprites.drawPartner(ctx, run.form, sx(visit.mx), sy(visit.my), visit.mfacing, 1.2, t || 0, false, false, visit.monMoving); });
    }
    items.sort(function (a, b) { return a.y - b.y; });
    var ii;
    for (ii = 0; ii < items.length; ii++) items[ii].fn();

    /* Labels and prompts */
    ctx.textAlign = "center";
    ctx.font = "bold 12px Trebuchet MS, sans-serif";
    function label(text, x, y, col) {
      ctx.fillStyle = "rgba(10,8,20,0.65)";
      ctx.fillText(text, x + 1, y + 1);
      ctx.fillStyle = col || "rgba(255,255,255,0.95)";
      ctx.fillText(text, x, y);
    }
    /* station names: a small timber plate in the game's pixel lettering */
    function sign(text, x, y) {
      var PX = D.px, w, x0, y0;
      if (!PX || !PX.textWidth) { label(text, x, y); return; }
      text = String(text).toUpperCase();
      w = PX.textWidth(text, 2); x0 = Math.round(x - w / 2); y0 = Math.round(y - 12);
      ctx.fillStyle = "rgba(20,14,8,0.3)"; ctx.fillRect(x0 - 6, y0 - 3, w + 16, 26);
      ctx.fillStyle = "#3a2414"; ctx.fillRect(x0 - 9, y0 - 6, w + 18, 26);
      ctx.fillStyle = "#8a5c30"; ctx.fillRect(x0 - 7, y0 - 4, w + 14, 22);
      ctx.fillStyle = "#a87844"; ctx.fillRect(x0 - 7, y0 - 4, w + 14, 3);
      ctx.fillStyle = "#6e4826"; ctx.fillRect(x0 - 7, y0 + 15, w + 14, 3);
      PX.drawText(ctx, text, x0, y0, 2, "#fff2d0");
    }
    sign("Jijimon's Cottage", shop.x, shed.y - 78);
    if (sts.bag) sign("Punching Bag", sts.bag.x, sts.bag.y + 30);
    if (sts.board) sign("Chalkboard", sts.board.x, sts.board.y + 32);
    if (sts.bond) sign("Play", sts.bond.x, sts.bond.y + 54);
    var gpl = plots();
    if (gpl.length) sign("Garden", gpl[0].x + (gpl[gpl.length - 1].x + gpl[gpl.length - 1].w - gpl[0].x) / 2, gpl[gpl.length - 1].y + gpl[gpl.length - 1].h + 34);
    var gT = trackGeom();
    sign("Running Track", gT.cx + 150, gT.cy + gT.ry + gT.width / 2 + 16);

    ctx.font = "13px Trebuchet MS, sans-serif";
    if (dist(visit.x, visit.y, shop.x, shop.y) < 70 && !visit.activity) {
      label(promptFor("interact", "Shop"), sx(shop.x), sy(shop.y + 20));
    }
    var plotN = !visit.activity && nearestPlot(visit.x, visit.y);
    if (plotN) {
      var ps = plotState(run, plotN.i), ptxt;
      if (!ps || !ps.crop) ptxt = firstSeed(run) ? promptFor("interact", "Plant " + itemName(firstSeed(run)).replace(" Seeds", "")) : "Empty plot — find seeds in battle";
      else if (now >= ps.readyAt) ptxt = promptFor("interact", "Harvest " + ((D.CROPS[ps.crop] && D.CROPS[ps.crop].name) || ps.crop));
      else ptxt = ((D.CROPS[ps.crop] && D.CROPS[ps.crop].name) || ps.crop) + " · grows in battle · " + fmtLeft(ps.readyAt - now);
      label(ptxt, plotN.cx, plotN.y - 8, "#e8ffd0");
    }
    var near = !visit.activity && !plotN && nearestStation(visit.x, visit.y);
    if (near) {
      var verb = near.id === "bag" ? "Punch" : near.id === "board" ? "Study" : near.id === "track" ? "Run a lap" : "Play together";
      var nx = near.x, ny = near.y;
      if (near.id === "track") {
        var gNear = trackGeom();
        var angN = Math.atan2((visit.y - gNear.cy) / Math.max(1, gNear.ry), (visit.x - gNear.cx) / Math.max(1, gNear.rx));
        var pN = pointOnTrack(angN, gNear);
        nx = pN.x; ny = pN.y;
      }
      label(promptFor("interact", verb), sx(nx), sy(ny) - (near.id === "track" ? 28 : 64));
    }
    drawActivityOverlay(ctx, sx, sy, t);
    if (visit.particles) {
      var i, p;
      for (i = 0; i < visit.particles.length; i++) {
        p = visit.particles[i];
        ctx.globalAlpha = Math.max(0, p.life / 0.9);
        if (p.kind === "leaf") {
          ctx.fillStyle = "#8ad060";
          ctx.fillRect(sx(p.x), sy(p.y), 4, 4);
        } else {
          ctx.fillStyle = p.kind === "note" ? "#ffe080" : "#ff80c0";
          ctx.font = "14px Trebuchet MS, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(p.kind === "note" ? "♪" : "♥", sx(p.x), sy(p.y));
        }
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore(); /* world transform */
    /* (No sky band over the top of the yard: it read as a smear across the screen.) */
    ctx.restore(); /* outer */
  }

  function battleClock(run) {
    var limit = (D.BATTLE_CFG && D.BATTLE_CFG.duration) || 600;
    var t = (run && run.time) || 0;
    if (!D.BATTLE_CFG || D.BATTLE_CFG.countUp !== false) return { text: formatTime(Math.floor(t)), overtime: false, left: 0, over: 0, elapsed: t };
    if (t < limit) return { text: formatTime(limit - t), overtime: false, left: limit - t, over: 0 };
    return { text: "+" + formatTime(t - limit), overtime: true, left: 0, over: t - limit };
  }

  function overtimeMul(run) {
    var cfgB = D.BATTLE_CFG || {};
    if (!cfgB.overtime || cfgB.overtimeRamp === 0) return 1;
    var clock = battleClock(run);
    if (!clock.overtime) return 1;
    return Math.min(cfgB.overtimeRampMax || 3.5, 1 + clock.over * (cfgB.overtimeRamp || 0.12));
  }

  function farmCountdown(run) {
    var left = dueIn(run);
    var warnLv = 0;
    if (left <= 5 && left > 0) warnLv = 5;
    else if (left <= 15 && left > 0) warnLv = 15;
    return {
      left: left,
      text: left <= 0 ? "Farm now" : ("Farm in " + formatTime(left)),
      warn: warnLv
    };
  }

  function install(h) { host = h || {}; }

  function get() { return visit; }

  function isActive() { return !!(visit && visit.active); }

  D.farm = {
    install: install,
    begin: begin,
    update: update,
    draw: draw,
    end: end,
    returnToBattle: end,
    pet: pet,
    feed: feed,
    useItem: useItem,
    train: train,
    startActivity: startActivity,
    interact: interact,
    selectSlot: selectSlot,
    scrollSlot: scrollSlot,
    dueIn: dueIn,
    nextAt: nextAt,
    shouldVisit: shouldVisit,
    warn: warn,
    intervalMinutes: intervalMinutes,
    battleClock: battleClock,
    overtimeMul: overtimeMul,
    farmCountdown: farmCountdown,
    formatTime: formatTime,
    get: get,
    isActive: isActive,
    render: render,
    slotList: slotList,
    hungerMult: hungerMult,
    isHungry: isHungry,
    nearestStation: nearestStation,
    ensureGrass: ensureGrass,
    trackGeom: trackGeom,
    yardSize: yardSize,
    fenceRect: fenceRect,
    shedRect: shedRect,
    shopPoint: shopPoint,
    distToTrack: distToTrack,
    pointOnTrack: pointOnTrack
  };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
