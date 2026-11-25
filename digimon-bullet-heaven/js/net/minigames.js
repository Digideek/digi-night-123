/* Digi Night — the farm's training mini games (17z33). DOM-free: the authority (net/progression.js) runs
 * them, and js/farm-train.js draws them from the same state.
 *
 *   strike  (punching bag, Offense)      a needle sweeps a bar; press E when it's on the gold mark.
 *                                        5 strikes, each graded, and each one faster.
 *   memory  (chalkboard, Intelligence)   watch a pattern of shapes light up, then repeat it (1-4 or
 *                                        click). Two rounds: 3 shapes, then 5.
 *   lanes   (running track, Agility)     your partner runs laps of the track itself; rocks drop onto it
 *                                        (a shadow first) and hurdles stand in the way. Switch between
 *                                        the inner and outer lane (E, or tap A / D) to dodge them. 14 s.
 *
 * Each ends with a score (0.45 to 1.25) and a grade, and the score scales the training gain. preview()
 * says what a session at a station would give right now, by grade, for the signs and the result card.
 */
(function (global) {
  "use strict";
  var isNode = typeof module === "object" && module.exports;
  var root = isNode ? global : window;
  var D = (root.DBH = root.DBH || {});

  var VAL = { perfect: 1.25, great: 1.05, good: 0.85, miss: 0.45 };
  var GRADES = [["perfect", 1.2, "Perfect!"], ["great", 1.0, "Great!"], ["good", 0.8, "Good"], ["miss", 0, "Okay"]];
  var KIND = { bag: "strike", board: "memory", track: "lanes" };
  var INFO = {
    strike: { title: "Power Strike", how: "Press E when the needle is on the gold mark. 5 strikes, each faster." },
    memory: { title: "Pattern Recall", how: "Watch the shapes light up, then repeat them: 1-4 or click. Two rounds." },
    lanes: { title: "Rockfall Run", how: "Your partner runs the track. Switch lanes (E, or tap A / D) to dodge rocks and hurdles." }
  };
  var SHAPES = ["▲", "●", "■", "★"];
  var STRIKE = { total: 5, speed: 0.85, faster: 1.13, cool: 0.3, perfect: 0.035, great: 0.075, good: 0.13, dur: 16 };
  /* lanes: px/s, lane offsets from the track's middle, the warning before a rock lands, how close counts */
  var LANES = { dur: 14, speed: 300, off: [-11, 11], swap: 7, warn: 0.75, hitLen: 16, rockAhead: [330, 450], hurdleAhead: [480, 600],
    hurdle: 0.3, aimed: 0.6, firstAt: 0.6, every: [1.05, 0.035, 0.55], clearGap: 110, stumble: 0.5, stumbleMul: 0.4 };
  var MEMORY = { lens: [3, 5], step: 0.75, lit: 0.55, gap: 0.5, between: 0.7, inputBase: 3, inputPer: 1 };

  function gradeOf(score) { var i; for (i = 0; i < GRADES.length; i++) if (score >= GRADES[i][1]) return { id: GRADES[i][0], label: GRADES[i][2] }; return { id: "miss", label: "Okay" }; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function create(station, rng, geom) {
    var kind = KIND[station], a;
    rng = rng || Math.random;
    if (!kind) return null;
    if (kind === "strike") a = { kind: kind, t: 0, dur: STRIKE.dur, n: 0, total: STRIKE.total, needle: 0, dir: 1, speed: STRIKE.speed, zone: 0.2 + rng() * 0.6, marks: [], cool: 0 };
    else if (kind === "lanes") {
      geom = geom || { cx: 660, cy: 420, rx: 588, ry: 328, width: 44 };
      a = { kind: kind, t: 0, dur: LANES.dur, g: { cx: geom.cx, cy: geom.cy, rx: geom.rx, ry: geom.ry, width: geom.width || 44 }, s: 0, lane: 1, lp: 1, hz: [], next: LANES.firstAt, hits: 0, flash: 0, stumble: 0, hid: 0, held: false };
      a.peri = table(a.g).len;
    }
    else { a = { kind: kind, t: 0, dur: 40, round: 0, lens: MEMORY.lens.slice(), seq: [], phase: "show", pt: 0, idx: 0, right: 0, total: 0, last: null }; a.total = a.lens.reduce(function (s, n) { return s + n; }, 0); newRound(a, rng); }
    a.done = false;
    return a;
  }
  function newRound(a, rng) {
    var i, n = a.lens[a.round];
    a.seq = [];
    for (i = 0; i < n; i++) a.seq.push(Math.floor(rng() * SHAPES.length) % SHAPES.length);
    a.phase = "show"; a.pt = 0; a.idx = 0;
  }
  function endRound(a) { a.phase = "between"; a.pt = 0; }

  function step(a, dt, inp, rng) {
    var i, r, every;
    a.t += dt;
    if (a.kind === "strike") {
      if (a.cool > 0) a.cool -= dt;
      a.needle += a.dir * a.speed * dt;
      if (a.needle > 1) { a.needle = 2 - a.needle; a.dir = -1; }
      if (a.needle < 0) { a.needle = -a.needle; a.dir = 1; }
      if (a.t >= a.dur) { while (a.n < a.total) { a.marks.push({ g: "miss", at: a.needle }); a.n++; } a.done = true; }
    } else if (a.kind === "lanes") {
      var L = LANES, ix = inp ? Math.max(Math.abs(inp.x || 0), Math.abs(inp.y || 0)) : 0, h, ds, other, sp;
      /* a tap of a direction switches lanes too (once per tap) */
      if (ix > 0.5 && !a.held) { a.lane = 1 - a.lane; a.held = true; } else if (ix < 0.3) a.held = false;
      a.lp += clamp(a.lane - a.lp, -L.swap * dt, L.swap * dt);
      if (a.flash > 0) a.flash -= dt;
      if (a.stumble > 0) a.stumble -= dt;
      a.s += L.speed * (a.stumble > 0 ? L.stumbleMul : 1) * dt;
      a.next -= dt;
      if (a.next <= 0 && a.t < a.dur - 1.5) {
        var hurdle = rng() < L.hurdle, ahead = hurdle ? L.hurdleAhead : L.rockAhead, lane = rng() < L.aimed ? a.lane : (rng() < 0.5 ? 0 : 1);
        sp = a.s + ahead[0] + rng() * (ahead[1] - ahead[0]);
        /* never close both lanes at once */
        other = null;
        for (i = 0; i < a.hz.length; i++) if (Math.abs(a.hz[i].s - sp) < L.clearGap) other = a.hz[i];
        if (other) lane = other.lane;
        a.hz.push({ id: ++a.hid, kind: hurdle ? "hurdle" : "rock", s: sp, lane: lane, land: hurdle ? a.t : a.t + L.warn, t0: a.t });
        every = L.every; a.next = Math.max(every[2], every[0] - a.t * every[1]);
      }
      var myLane = a.lp > 0.5 ? 1 : 0;
      for (i = a.hz.length - 1; i >= 0; i--) {
        h = a.hz[i]; ds = h.s - a.s;
        if (!h.hit && !h.passed && a.t >= h.land && Math.abs(ds) < L.hitLen && h.lane === myLane) { h.hit = true; a.hits++; a.flash = 0.4; a.stumble = L.stumble; }
        if (ds < -L.hitLen && !h.hit) h.passed = true;
        if (ds < -320) a.hz.splice(i, 1);
      }
      if (a.t >= a.dur) a.done = true;
    } else if (a.kind === "memory") {
      a.pt += dt;
      if (a.phase === "show" && a.pt >= a.seq.length * MEMORY.step + MEMORY.gap) { a.phase = "input"; a.pt = 0; }
      else if (a.phase === "input" && a.pt >= MEMORY.inputBase + a.seq.length * MEMORY.inputPer) endRound(a);   /* too slow: the rest count as wrong */
      else if (a.phase === "between" && a.pt >= MEMORY.between) {
        a.round++;
        if (a.round >= a.lens.length) a.done = true; else newRound(a, rng);
      }
      if (a.t >= a.dur) a.done = true;
    }
  }
  /* big steps are cut up so nothing tunnels through */
  function tick(a, dt, inp, rng) {
    if (!a || a.done) return a;
    rng = rng || Math.random;
    var left = dt;
    while (left > 1e-6 && !a.done) { var s = Math.min(0.05, left); step(a, s, inp, rng); left -= s; }
    return a;
  }
  function input(a, kind, value, rng) {
    if (!a || a.done) return null;
    rng = rng || Math.random;
    if (a.kind === "lanes" && (kind === "interact" || kind === "confirm")) { a.lane = 1 - a.lane; return { lane: a.lane }; }
    if (a.kind === "strike" && (kind === "interact" || kind === "confirm")) {
      if (a.cool > 0) return null;
      var d = Math.abs(a.needle - a.zone), g = d <= STRIKE.perfect ? "perfect" : (d <= STRIKE.great ? "great" : (d <= STRIKE.good ? "good" : "miss"));
      a.marks.push({ g: g, at: a.needle, zone: a.zone });
      a.n++; a.speed *= STRIKE.faster; a.zone = 0.2 + rng() * 0.6; a.cool = STRIKE.cool;
      if (a.n >= a.total) a.done = true;
      return { grade: g };
    }
    if (a.kind === "memory" && (kind === "choice" || kind === "slot")) {
      var v = +value;
      if (a.phase !== "input" || !(v >= 0 && v < SHAPES.length)) return null;
      var ok = v === a.seq[a.idx];
      a.last = { v: v, ok: ok, t: a.t };
      if (ok) { a.right++; a.idx++; if (a.idx >= a.seq.length) endRound(a); }
      else endRound(a);
      return { ok: ok };
    }
    return null;
  }
  /* 0.45 to 1.25: what the session was worth */
  function score(a) {
    if (!a) return 0.7;
    var i, s = 0, f;
    if (a.kind === "strike") {
      for (i = 0; i < a.total; i++) s += VAL[(a.marks[i] && a.marks[i].g) || "miss"];
      return s / a.total;
    }
    if (a.kind === "lanes") {
      if (!a.done && a.t < a.dur * 0.5) return VAL.miss;
      return a.hits === 0 ? VAL.perfect : (a.hits === 1 ? VAL.great : (a.hits <= 3 ? VAL.good : Math.max(VAL.miss, VAL.good - 0.1 * (a.hits - 3))));
    }
    if (a.kind === "memory") {
      f = a.right / Math.max(1, a.total);
      return f >= 1 ? VAL.perfect : (f >= 0.75 ? VAL.great : (f >= 0.5 ? VAL.good : VAL.miss + 0.4 * f));
    }
    return 0.7;
  }
  function summary(a) {
    if (!a) return "";
    if (a.kind === "strike") { var c = { perfect: 0, great: 0, good: 0, miss: 0 }; a.marks.forEach(function (m) { c[m.g]++; }); return ["perfect", "great", "good", "miss"].filter(function (k) { return c[k]; }).map(function (k) { return c[k] + " " + k; }).join(", "); }
    if (a.kind === "lanes") return a.hits ? "hit by " + a.hits + " rock" + (a.hits === 1 ? "" : "s") : "not hit once";
    if (a.kind === "memory") return a.right + " of " + a.total + " shapes";
    return "";
  }

  /* What a session at this station gives right now (before the score), and why. Reads, never changes, p. */
  function preview(FC, st, p) {
    FC = FC || {}; p = p || {};
    var visits = (p.trainVisits && p.trainVisits[st.id]) || 0;
    var dim = st.diminish != null ? st.diminish : 0.65;
    var repeat = Math.pow(dim, visits);
    var FR = FC.fresh || { max: 3, start: 3, tired: [0.7, 0.45, 0.25] };
    var freshLeft = p.trainFresh == null ? (FR.start != null ? FR.start : 3) : p.trainFresh;
    var TL = FR.tired || [0.7, 0.45, 0.25];
    var tired = freshLeft > 0 ? 1 : TL[Math.min(TL.length - 1, p.trainTired || 0)];
    var gate = 1 + Math.min(FC.gateBonusMax != null ? FC.gateBonusMax : 1, (FC.gateBonus || 0.1) * (p.farmGates || 0));
    var boost = p.trainBoost > 1 ? p.trainBoost : 1;
    var base = (st.gain || 10) * repeat * tired * gate * boost;
    return {
      base: base, repeat: repeat, visits: visits, fresh: freshLeft > 0, tired: tired, gate: gate, boost: boost,
      perfect: Math.max(1, Math.round(base * VAL.perfect)), great: Math.max(1, Math.round(base * VAL.great)),
      good: Math.max(1, Math.round(base * VAL.good)), miss: Math.max(1, Math.round(base * VAL.miss))
    };
  }

  /* the track: an ellipse walked by arc length, so the partner runs at an even speed all the way round */
  var tables = {};
  function table(g) {
    var key = g.cx + "," + g.cy + "," + g.rx + "," + g.ry, T = tables[key], N = 720, i, ang, x, y, px, py, len = 0;
    if (T) return T;
    T = { ang: [], cum: [], len: 0 };
    for (i = 0; i <= N; i++) {
      ang = (i / N) * Math.PI * 2; x = g.cx + g.rx * Math.cos(ang); y = g.cy + g.ry * Math.sin(ang);
      if (i) len += Math.sqrt((x - px) * (x - px) + (y - py) * (y - py));
      T.ang.push(ang); T.cum.push(len); px = x; py = y;
    }
    T.len = len; tables[key] = T;
    return T;
  }
  /* where distance s along the track is, off px from the middle of it (+ is the outside) */
  function trackPoint(g, s, off) {
    var T = table(g), L = T.len, lo = 0, hi = T.cum.length - 1, mid, f, ang, c, sn, nx, ny, n;
    s = ((s % L) + L) % L;
    while (hi - lo > 1) { mid = (lo + hi) >> 1; if (T.cum[mid] <= s) lo = mid; else hi = mid; }
    f = (s - T.cum[lo]) / Math.max(1e-6, T.cum[hi] - T.cum[lo]);
    ang = T.ang[lo] + (T.ang[hi] - T.ang[lo]) * f;
    c = Math.cos(ang); sn = Math.sin(ang);
    nx = c / g.rx; ny = sn / g.ry; n = Math.sqrt(nx * nx + ny * ny) || 1;
    return { x: g.cx + g.rx * c + (nx / n) * (off || 0), y: g.cy + g.ry * sn + (ny / n) * (off || 0), dx: -g.rx * sn, dy: g.ry * c };
  }
  function laneOff(a, lp) { var o = LANES.off; return o[0] + (o[1] - o[0]) * (lp == null ? a.lp : lp); }
  /* the partner's place on the track right now */
  function lanesPos(a) { return trackPoint(a.g, a.s, laneOff(a)); }

  var api = { create: create, tick: tick, input: input, score: score, summary: summary, gradeOf: gradeOf, preview: preview, KIND: KIND, INFO: INFO, SHAPES: SHAPES, VAL: VAL, STRIKE: STRIKE, LANES: LANES, MEMORY: MEMORY,
    trackPoint: trackPoint, trackLen: function (g) { return table(g).len; }, laneOff: laneOff, lanesPos: lanesPos };
  D.minigames = api;
  if (isNode) module.exports = api;
})(typeof window !== "undefined" ? window : global);
