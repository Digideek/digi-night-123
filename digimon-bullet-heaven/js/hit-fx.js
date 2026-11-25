/* Digi Night — how a hit feels (Nov 17).
 *
 * Nothing here changes what a hit does; the simulation decides that. This
 * is what it looks and sounds like on the screen:
 *
 *   numbers   chunky pixel damage numbers that pop out of the enemy and
 *             fall away, one for every single hit (17z33, Isaac: never added
 *             together, so you see what each hit did), in every mode, PvP
 *             included. Bigger for a bigger share of its health. A critical
 *             is bigger again, gold, with "!" and a small CRIT over it; a
 *             weakness is orange with an up arrow, a resisted hit grey with
 *             a down arrow (shapes as well as colours); pale blue for
 *             lightning. Hits on one enemy in the same instant fan out so
 *             each stays readable. Nothing is shown for hits on your own
 *             partner (Isaac). Every miss shows MISS in the same letters.
 *   sparks    a quick star where the blow lands, chips flying on past it.
 *   punch     the enemy squashes and leans away for a moment.
 *   kick      the camera jolts along the line of the blow and springs back;
 *             a critical or a boss kill also pushes the view in a touch.
 *   hitstop   only on a big hit (17z33, Isaac: "not every hit, only big hits"):
 *             one blow taking a big share of an enemy's health, a critical
 *             that is also big, a tough or boss kill, or a heavy hit on your
 *             partner. Ordinary kills and small criticals never pause. The
 *             hold is a few hundredths of a second (solo runs only; online
 *             the clock is shared).
 *   sound     a thump per hit, a sharper crack for a critical, a crunch for
 *             a kill, a boom for a boss.
 *
 * game.js feeds it hit / kill / hurt events and asks it for the camera kick,
 * each enemy's squash, and whether the fight is being held this frame.
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});

  var CFG = {
    numbers: 140, numbersLow: 48,             /* most on screen at once (low: reduced effects); every hit gets its own */
    fan: 0.12,                                /* hits on one enemy this close together fan out instead of overlapping */
    life: 0.75, critLife: 1.0,
    stop: { big: 0.05, toughKill: 0.07, bossKill: 0.17, hurt: 0.06 },
    bigFrac: 0.35, bigCritFrac: 0.2,          /* a "big hit": this share of the enemy's full health (a critical: less) */
    stopGap: 0.14,                            /* at least this long between two short holds */
    kick: { hit: 1.4, crit: 5, kill: 3, toughKill: 6, bossKill: 12, hurt: 5 },
    zoom: { crit: 0.012, toughKill: 0.016, bossKill: 0.045 },
    punchTime: 0.16,
    soundGap: 0.065
  };

  /* ---------- 5x7 digits, baked once per colour with a dark outline ---------- */
  var GLYPHS = {
    "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
    "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
    "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
    "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
    "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
    "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
    "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
    "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
    "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
    "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
    /* an arrow beside the number: up for a weakness, down for a resisted hit (not colour alone) */
    "^": ["00100", "01110", "11111", "00100", "00100", "00100", "00000"],
    "v": ["00000", "00100", "00100", "00100", "11111", "01110", "00100"],
    "C": ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
    "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    "I": ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
    "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    "M": ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"]
  };
  var ORDER = "0123456789!^vCRITMS", CW = 7, CH = 9;
  var COLORS = {
    norm: ["#ffffff", "#c9d4ea"], crit: ["#fff2a0", "#ffb81a"], weak: ["#ffc08a", "#ff6a2a"],
    resist: ["#b4bfd4", "#77839c"], burn: ["#ffb060", "#ff6a1a"], poison: ["#d8a8f0", "#a05ad0"], bleed: ["#e87078", "#b02a34"], bolt: ["#eaf6ff", "#8cc4ff"], mate: ["#d6dcec", "#9aa6c0"], miss: ["#dfe6f4", "#9aa8c4"]
  };
  var sheets = {};
  function sheet(kind) {
    if (sheets[kind]) return sheets[kind];
    if (typeof document === "undefined") return null;
    var c = document.createElement("canvas"), g, i, x, y, rows, ox, col = COLORS[kind] || COLORS.norm, dx, dy;
    c.width = CW * ORDER.length; c.height = CH;
    g = c.getContext("2d");
    for (i = 0; i < ORDER.length; i++) {
      rows = GLYPHS[ORDER.charAt(i)]; ox = i * CW + 1;
      g.fillStyle = "#0a0c1c";
      for (y = 0; y < 7; y++) for (x = 0; x < 5; x++) if (rows[y].charAt(x) === "1") for (dy = -1; dy <= 1; dy++) for (dx = -1; dx <= 1; dx++) g.fillRect(ox + x + dx, 1 + y + dy, 1, 1);
      for (y = 0; y < 7; y++) for (x = 0; x < 5; x++) if (rows[y].charAt(x) === "1") { g.fillStyle = y < 3 ? col[0] : col[1]; g.fillRect(ox + x, 1 + y, 1, 1); }
    }
    sheets[kind] = c;
    return c;
  }

  var nums = [], sparks = [], punch = {}, punchN = 0;
  var kickX = 0, kickY = 0, zoomP = 0, stopT = 0, stopCool = 0, hurtFlash = 0, soundT = 0, clock = 0;
  var host = null;      /* { particle(x, y, vx, vy, col, life, size, type, additive, grav), reduced() } from game.js */

  function reduced() { return !!(host && host.reduced && host.reduced()); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function snd(name, arg) { if (D.audio) D.audio.sfx(name, arg); }

  function hold(sec) {
    if (sec < 0.1 && stopCool > 0) return;            /* short holds may not chain into a stutter */
    if (sec > stopT) stopT = sec;
  }
  function kick(dx, dy, amt) {
    var l = Math.sqrt(dx * dx + dy * dy) || 1, k = reduced() ? 0.4 : 1;
    kickX += (dx / l) * amt * k; kickY += (dy / l) * amt * k;
    l = Math.sqrt(kickX * kickX + kickY * kickY);
    if (l > 16) { kickX *= 16 / l; kickY *= 16 / l; }
  }

  /* e: the hit event { enemyId, damage, x, y, c (critical), m (1 weak, -1 resisted), k (it killed) }
   * o: { own, mate, bolt, frac (damage as a share of the enemy's full health), radius, sx, sy (where the blow came from), big,
 *      bigMove (one of the big, wound-up moves), tough (the enemy has half again your partner's health) } */
  function hit(e, o) {
    o = o || {};
    if (e.dot) return dot(e, o);
    var kind = e.c ? "crit" : (e.m > 0 ? "weak" : (e.m < 0 ? "resist" : (o.bolt ? "bolt" : (o.mate ? "mate" : "norm"))));
    var val = Math.max(1, Math.round(e.damage || 0)), r = o.radius || 12, frac = o.frac || 0, i, n, cap = reduced() ? CFG.numbersLow : CFG.numbers, near = 0, key = e.enemyId != null ? e.enemyId : "p" + e.pvp;
    var dx = o.sx != null ? e.x - o.sx : rnd(-1, 1), dy = o.sy != null ? e.y - o.sy : -1, l = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= l; dy /= l;
    /* every hit is its own number (never added together); ones landing on the same enemy at the same moment
       fan out, alternately left and right and a little higher each, so none hides another */
    for (i = nums.length - 1; i >= 0; i--) if (nums[i].id === key && nums[i].t < CFG.fan && !nums[i].dot) near++;
    if (nums.length >= cap) nums.shift();
    n = { id: key, x: e.x + rnd(-4, 4) + (near ? (near % 2 ? 1 : -1) * Math.ceil(near / 2) * 20 : 0), y: e.y - r - 8 - Math.min(6, near) * 10,
      vx: dx * 26 + rnd(-18, 18) + (near ? (near % 2 ? 1 : -1) * 22 : 0), vy: -rnd(90, 125), val: val, kind: kind, frac: frac, t: 0, life: e.c ? CFG.critLife : CFG.life, a: o.mate ? 0.75 : 1 };
    nums.push(n);
    n.size = 2 + (n.frac > 0.5 ? 1 : 0) + (n.kind === "crit" ? 1 : 0);
    /* the enemy squashes and leans away from the blow */
    if (e.enemyId != null) {
      if (!punch[e.enemyId]) punchN++;
      punch[e.enemyId] = { t: 0, dx: dx, dy: dy, k: e.c ? 1.5 : 1 };
    }
    /* a star where it lands, chips flying on past */
    if (sparks.length < 40) sparks.push({ x: e.x - dx * r * 0.5, y: e.y - r * 0.6 - dy * r * 0.3, t: 0, life: e.c ? 0.16 : 0.1, s: (e.c ? 15 : 9) + Math.min(8, r * 0.3), col: e.c ? "#ffe14a" : (e.m > 0 ? "#ffa050" : "#ffffff"), rot: rnd(0, 0.8) });
    if (host && host.particle && !o.mate) {
      var chips = reduced() ? 1 : (e.c ? 5 : 2);
      for (i = 0; i < chips; i++) host.particle(e.x, e.y - r * 0.6, dx * rnd(90, 220) + rnd(-50, 50), dy * rnd(90, 220) + rnd(-90, 10), e.c ? "#ffe14a" : "#f4f6ff", rnd(0.18, 0.34), e.c ? 3 : 2, "pixel", true, 1.2);
    }
    if (o.own) {
      kick(dx, dy, e.c ? CFG.kick.crit : CFG.kick.hit);
      if (e.c && !reduced()) zoomP = Math.max(zoomP, CFG.zoom.crit);
      /* only a big hit holds the fight for a moment: a big move landing a real share, or a heavy blow
         (or a critical) on a tough enemy. Knocking out small fry in one go is never "big". */
      if ((o.bigMove && frac >= CFG.bigCritFrac) || (o.tough && (frac >= CFG.bigFrac || (e.c && frac >= CFG.bigCritFrac)))) hold(CFG.stop.big);
    }
    if (!o.mate && clock - soundT >= CFG.soundGap) { soundT = clock; snd(e.c ? "crit" : "hit", Math.min(1, 0.55 + frac)); }
  }

  /* a hit that missed (17z33, Isaac: every miss says so): MISS in the same pixel letters, pale and small, drifting
     up off the target; misses at one spot at the same moment fan out like the numbers do */
  function miss(e) {
    var cap = reduced() ? CFG.numbersLow : CFG.numbers, near = 0, i, n;
    for (i = nums.length - 1; i >= 0; i--) { n = nums[i]; if (n.kind === "miss" && n.t < CFG.fan && Math.abs(n.x0 - e.x) < 12 && Math.abs(n.y0 - e.y) < 12) near++; }
    if (nums.length >= cap) nums.shift();
    nums.push({ id: "miss", x0: e.x, y0: e.y, x: e.x + rnd(-3, 3) + (near ? (near % 2 ? 1 : -1) * Math.ceil(near / 2) * 26 : 0), y: e.y - 4 - Math.min(6, near) * 10,
      vx: rnd(-14, 14), vy: -rnd(55, 75), val: "MISS", kind: "miss", frac: 0, t: 0, life: 0.7, a: 0.95, size: 1.5, dot: true });
  }

  /* what a burn, poison or bleed took in the last second: a small number in its own colour
   * that drifts up beside the enemy. No spark, no squash, no jolt, no sound. */
  var DOT_SIDE = { burn: -1, poison: 1, bleed: 0 };
  function dot(e, o) {
    var cap = reduced() ? CFG.numbersLow : CFG.numbers, r = o.radius || e.r || 12;
    if (!COLORS[e.dot]) return;
    if (nums.length >= cap) nums.shift();
    nums.push({ id: e.enemyId, dot: true, x: e.x + (DOT_SIDE[e.dot] || 0) * (r * 0.7 + 6), y: e.y - r - 2, vx: 0, vy: -34, val: Math.max(1, Math.round(e.damage || 0)), kind: e.dot, frac: 0, t: 0, life: 0.8, a: 0.95, size: 1.5 });
  }

  /* e: the kill event { x, y, boss }. o: { own, radius, big (boss, Mega or lord), tough (a stage above the rank and file), sx, sy } */
  function kill(e, o) {
    o = o || {};
    var r = o.radius || 12, dx = o.sx != null ? e.x - o.sx : 0, dy = o.sy != null ? e.y - o.sy : -1, l = Math.sqrt(dx * dx + dy * dy) || 1, i, n, a, sp, cols = ["#ffffff", "#ffe080", "#ffb040"];
    dx /= l; dy /= l;
    if (host && host.particle) {
      n = reduced() ? 4 : (o.big ? 26 : (o.tough ? 14 : 9));
      for (i = 0; i < n; i++) {
        /* chunks thrown mostly the way the blow was going */
        a = Math.atan2(dy, dx) + rnd(-1.25, 1.25); sp = rnd(110, o.big ? 420 : 280);
        host.particle(e.x, e.y - r * 0.5, Math.cos(a) * sp, Math.sin(a) * sp - rnd(30, 120), cols[i % 3], rnd(0.3, o.big ? 0.9 : 0.6), o.big ? rnd(3, 7) : rnd(3, 5), "pixel", i % 2 === 0, 2.2);
      }
      host.particle(e.x, e.y - r * 0.5, 0, 0, "#ffffff", o.big ? 0.42 : 0.24, o.big ? 14 : 6, "ring", true, 0);
      if (o.big) host.particle(e.x, e.y - r * 0.5, 0, 0, "#ffe080", 0.6, 6, "ring", true, 0);
    }
    if (o.own !== false) {
      kick(dx, dy, o.big ? CFG.kick.bossKill : (o.tough ? CFG.kick.toughKill : CFG.kick.kill));
      if (o.big || o.tough) hold(o.big ? CFG.stop.bossKill : CFG.stop.toughKill);   /* ordinary kills never pause */
      if (!reduced() && (o.big || o.tough)) zoomP = Math.max(zoomP, o.big ? CFG.zoom.bossKill : CFG.zoom.toughKill);
    }
    snd(o.big ? "bigkill" : "kill");
    soundT = clock;
  }

  /* your partner is hit: `ratio` of its full health gone in one blow. No number (Isaac): the red wince and,
     for a heavy blow, the jolt say it. */
  function hurt(x, y, amount, ratio, sx, sy) {
    if (ratio >= 0.04) hurtFlash = Math.max(hurtFlash, Math.min(1, 0.35 + ratio * 3));
    if (ratio >= 0.1) { hold(CFG.stop.hurt); kick(sx != null ? x - sx : rnd(-1, 1), sy != null ? y - sy : rnd(-1, 1), CFG.kick.hurt); }
  }

  /* real time, every frame, whether or not the fight is being held */
  function update(dt) {
    var i, n, s, id, p, d;
    clock += dt;
    for (i = nums.length - 1; i >= 0; i--) {
      n = nums[i]; n.t += dt;
      if (n.t >= n.life) { nums.splice(i, 1); continue; }
      n.x += n.vx * dt; n.y += n.vy * dt;
      if (!n.dot) { n.vy += 260 * dt; n.vx *= Math.max(0, 1 - dt * 2.5); }
    }
    for (i = sparks.length - 1; i >= 0; i--) { s = sparks[i]; s.t += dt; if (s.t >= s.life) sparks.splice(i, 1); }
    if (punchN) for (id in punch) { p = punch[id]; p.t += dt; if (p.t >= CFG.punchTime) { delete punch[id]; punchN--; } }
    d = Math.exp(-dt * 20); kickX *= d; kickY *= d;
    if (Math.abs(kickX) < 0.05) kickX = 0;
    if (Math.abs(kickY) < 0.05) kickY = 0;
    zoomP *= Math.exp(-dt * 11); if (zoomP < 0.0005) zoomP = 0;
    if (hurtFlash > 0) hurtFlash = Math.max(0, hurtFlash - dt * 3.5);
    if (stopCool > 0) stopCool -= dt;
  }
  /* is the fight being held this frame? (uses the hold up as it answers) */
  function stopping(dt) {
    if (!(stopT > 0)) return false;
    stopT -= dt;
    if (stopT <= 0) { stopT = 0; stopCool = CFG.stopGap; }
    return true;
  }
  /* squash for one enemy: null, or { k 0..1.5, ox, oy } */
  function punchOf(id) {
    var p = punchN ? punch[id] : null, u;
    if (!p) return null;
    u = 1 - p.t / CFG.punchTime;
    return { k: u * u * p.k, ox: p.dx * 4 * u * p.k, oy: p.dy * 3 * u * p.k };
  }

  /* in the world, over the actors */
  function draw(ctx) {
    var i, s, n, u, k, a, str, sh, sc, w, x, j, ci, pop;
    for (i = 0; i < sparks.length; i++) {
      s = sparks[i]; u = s.t / s.life; k = s.s * (0.5 + u * 0.8); a = 1 - u;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = a; ctx.fillStyle = s.col;
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.fillRect(-k, -1.5, k * 2, 3); ctx.fillRect(-1.5, -k, 3, k * 2);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-k * 0.6, -1, k * 1.2, 2); ctx.fillRect(-1, -k * 0.6, 2, k * 1.2);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(-2.5, -2.5, 5, 5);
      ctx.restore();
    }
    for (i = 0; i < nums.length; i++) {
      n = nums[i];
      sh = sheet(n.kind);
      if (!sh) continue;
      str = String(n.val) + (n.kind === "crit" ? "!" : (n.kind === "weak" ? "^" : (n.kind === "resist" ? "v" : "")));
      /* pops out big, settles, fades at the end */
      pop = n.dot ? 1 : (n.t < 0.1 ? 1.7 - 7 * n.t : 1);
      sc = n.size * pop;
      a = Math.min(1, (n.life - n.t) / 0.22) * (n.a || 1);
      w = str.length * (CW - 1) * sc;
      x = n.x - w / 2;
      ctx.save();
      ctx.globalAlpha = a;
      for (j = 0; j < str.length; j++) {
        ci = ORDER.indexOf(str.charAt(j));
        if (ci >= 0) ctx.drawImage(sh, ci * CW, 0, CW, CH, Math.round(x + j * (CW - 1) * sc), Math.round(n.y - CH * sc), Math.round(CW * sc), Math.round(CH * sc));
      }
      /* a critical says so in words, small, over the number */
      if (n.kind === "crit") {
        var cs = Math.max(1, Math.round(sc * 0.5)), cw = 4 * (CW - 1) * cs, cx = n.x - cw / 2, cy = n.y - CH * sc - 2;
        for (j = 0; j < 4; j++) { ci = ORDER.indexOf("CRIT".charAt(j)); ctx.drawImage(sh, ci * CW, 0, CW, CH, Math.round(cx + j * (CW - 1) * cs), Math.round(cy - CH * cs), CW * cs, CH * cs); }
      }
      ctx.restore();
    }
  }
  /* over the whole screen: a red wince when the partner is hurt */
  function drawScreen(ctx, w, h) {
    if (!(hurtFlash > 0.01)) return;
    var a = 0.16 * hurtFlash, col = D.seasons && D.seasons.rgba ? D.seasons.rgba(ctx, "#ff2a2a", a) : "rgba(255,42,42," + a.toFixed(3) + ")", t = Math.round(Math.min(w, h) * 0.07);
    ctx.save();
    ctx.globalAlpha = 1; ctx.fillStyle = col;
    ctx.fillRect(0, 0, w, t); ctx.fillRect(0, h - t, w, t); ctx.fillRect(0, t, t, h - t * 2); ctx.fillRect(w - t, t, t, h - t * 2);
    ctx.fillStyle = D.seasons && D.seasons.rgba ? D.seasons.rgba(ctx, "#ff2a2a", a * 0.4) : col;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  function clear() { nums.length = 0; sparks.length = 0; punch = {}; punchN = 0; kickX = kickY = zoomP = stopT = hurtFlash = 0; }

  D.hitFx = {
    CFG: CFG,
    attach: function (h) { host = h; },
    hit: hit, kill: kill, hurt: hurt, miss: miss,
    update: update, stopping: stopping, punchOf: punchOf,
    draw: draw, drawScreen: drawScreen, clear: clear,
    kickX: function () { return kickX; }, kickY: function () { return kickY; }, zoom: function () { return 1 + zoomP; },
    _state: function () { return { nums: nums.length, sparks: sparks.length, stop: stopT, kick: [kickX, kickY], zoom: zoomP, punch: punchN, list: nums.map(function (n) { return { val: n.val, kind: n.kind, size: n.size }; }) }; }
  };
  if (typeof module === "object" && module.exports) module.exports = D.hitFx;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
