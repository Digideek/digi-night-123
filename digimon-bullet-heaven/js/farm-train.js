/* Digi Night — farm training on screen (17z33). The rules are in net/minigames.js and run on the authority;
 * this draws them:
 *
 *   the panel    while a session runs: its name, how to play, the game itself (the strike bar, the shapes,
 *                the rockfall) and a clock. The shapes can be clicked as well as pressed (1-4).
 *   the card     when it ends: the grade, "+15 Offense" big, the stat's bar filling from before to after,
 *                how it went ("4 perfect, 1 great") and why it gave that much (repeats, tiredness, farm
 *                gates, a Protein Steak), and what the next session there is worth.
 *   the signs    farm.js puts signLine() under each station's sign: the stat and what a Great session
 *                gives right now.
 *   the track    drawWorld(): the start gate and lap posts, and during Rockfall Run the rocks
 *                (a shadow first), hurdles and dust on the track itself.
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});
  if (typeof document === "undefined") return;
  function $(id) { return document.getElementById(id); }
  function MG() { return D.minigames; }
  var STAT = { offense: ["Offense", "#ff8a5a"], intelligence: ["Intelligence", "#6ab8ff"], agility: ["Agility", "#7ce07a"], bond: ["Bond", "#ff9ad0"] };
  /* 17z33: what each training stat does: free bonus points in the Status window (ro-stats.js farmBonus), the
   * track's Agility also the partner's run speed (data.js SPEEDS), and they steer which digivolutions are
   * open (js/evo-stat-gates.js caps each route type; js/rarity.js gives some Uncommon routes a bond of 70). */
  var DOES = {
    offense: "Every 10 Offense gives +1 STR and +1 DEX (harder physical hits, better aim). It also steers digivolution: over 40 closes wisdom routes (wizards, machines, plants), over 48 speed routes (birds, insects, sea); angel routes want it kept even with the others.",
    intelligence: "Every 10 Intelligence gives +1 INT and +1 LUK (stronger specials, faster casting, more crits). It also steers digivolution: over 48 closes strength routes (dragons, dinosaurs, warriors).",
    agility: "Every 10 Agility gives +1 AGI (attack speed, dodging), and every point makes your partner run 0.5% faster (up to +60%). Over 80 closes strength routes.",
    bond: "Every 10 Bond gives +1 VIT (more health, less damage taken), and it makes your partner happier. Some Uncommon digivolutions need a bond of 70."
  };

  var GCOL = { perfect: "#ffd23a", great: "#7cf0c0", good: "#9ac8ff", miss: "#c0b8a0" };
  var SHAPE_COL = ["#ff7a5a", "#6ab8ff", "#7ce07a", "#ffd23a"];

  function sim() { var a = D.getMissionAuth && D.getMissionAuth(); return a && a.sim; }
  function me() { var s = sim(); return s && (s.player(s.localId) || s.players[0]); }
  function act() { var s = sim(); return s && s.farm && s.farm.active ? s.farm.activity : null; }
  function stations() { return (D.FARM_CFG && D.FARM_CFG.stations) || {}; }

  /* under each station's sign: what it trains and what a Great session gives now */
  function signLine(id) {
    var st = stations()[id], p = me(), pv, S;
    if (!st || !MG() || !p) return null;
    S = STAT[st.stat] || [st.stat, "#fff"];
    pv = MG().preview(D.FARM_CFG, st, p);
    return { text: S[0] + " +" + pv.great + (MG().KIND[id] ? "  (Perfect +" + pv.perfect + ")" : ""), col: S[1] };
  }

  /* ---------- the panel ---------- */
  var panel = null, cv = null, g = null, btns = [];
  function build() {
    if (panel) return;
    panel = document.createElement("div");
    panel.id = "train-game"; panel.hidden = true;
    panel.innerHTML = "<div class='tg-head'><b id='tg-title'></b><span id='tg-stat'></span></div><div id='tg-how'></div>" +
      "<canvas id='tg-cv' width='420' height='150'></canvas><div id='tg-shapes'></div><div class='tg-clock'><i id='tg-clock'></i></div>";
    ($("hud") || document.body).appendChild(panel);
    cv = $("tg-cv"); g = cv.getContext("2d");
    var row = $("tg-shapes"), i, b;
    for (i = 0; i < 4; i++) {
      b = document.createElement("button"); b.type = "button"; b.className = "tg-shape"; b.setAttribute("data-v", i);
      b.innerHTML = "<kbd>" + (i + 1) + "</kbd><span style='color:" + SHAPE_COL[i] + "'>" + MG().SHAPES[i] + "</span>";
      b.addEventListener("click", function (ev) { ev.preventDefault(); if (D.farm && D.farm.selectSlot) D.farm.selectSlot(+this.getAttribute("data-v")); });
      row.appendChild(b); btns.push(b);
    }
  }
  function drawStrike(a) {
    var W = cv.width, H = cv.height, x0 = 24, x1 = W - 24, bw = x1 - x0, y = 54, h = 34, S = MG().STRIKE, i, m, cx;
    g.fillStyle = "#1a2236"; g.fillRect(x0, y, bw, h);
    cx = x0 + a.zone * bw;
    g.fillStyle = "rgba(154,200,255,0.35)"; g.fillRect(cx - S.good * bw, y, S.good * 2 * bw, h);
    g.fillStyle = "rgba(124,240,192,0.55)"; g.fillRect(cx - S.great * bw, y, S.great * 2 * bw, h);
    g.fillStyle = "#ffd23a"; g.fillRect(cx - S.perfect * bw, y, S.perfect * 2 * bw, h);
    g.strokeStyle = "#5a6a8c"; g.lineWidth = 2; g.strokeRect(x0, y, bw, h);
    var nx = x0 + a.needle * bw;
    g.fillStyle = a.cool > 0 ? "#8894aa" : "#ffffff"; g.fillRect(nx - 2, y - 10, 4, h + 20);
    g.beginPath(); g.moveTo(nx - 7, y - 12); g.lineTo(nx + 7, y - 12); g.lineTo(nx, y - 2); g.fill();
    /* the five strikes so far */
    for (i = 0; i < a.total; i++) {
      m = a.marks[i]; cx = W / 2 + (i - (a.total - 1) / 2) * 62;
      g.fillStyle = m ? GCOL[m.g] : "rgba(255,255,255,0.12)";
      g.beginPath(); g.arc(cx, 118, 11, 0, Math.PI * 2); g.fill();
      if (m) { g.fillStyle = "#0a1020"; g.font = "bold 10px system-ui, sans-serif"; g.textAlign = "center"; g.fillText(m.g === "perfect" ? "PERF" : m.g.toUpperCase(), cx, 121); }
    }
    m = a.marks[a.marks.length - 1];
    if (m && a.cool > 0) { g.fillStyle = GCOL[m.g]; g.font = "bold 20px system-ui, sans-serif"; g.textAlign = "center"; g.fillText(m.g === "miss" ? "Miss" : m.g.charAt(0).toUpperCase() + m.g.slice(1) + "!", W / 2, 38); }
    else { g.fillStyle = "#c9d4ea"; g.font = "13px system-ui, sans-serif"; g.textAlign = "center"; g.fillText("Strike " + Math.min(a.total, a.n + 1) + " of " + a.total, W / 2, 36); }
  }
  function drawMemory(a) {
    var W = cv.width, i, x, lit = -1, M = MG().MEMORY, k;
    if (a.phase === "show") { k = Math.floor(a.pt / M.step); if (k < a.seq.length && (a.pt - k * M.step) < M.lit) lit = k; }
    g.textAlign = "center";
    g.fillStyle = "#c9d4ea"; g.font = "13px system-ui, sans-serif";
    g.fillText("Round " + (a.round + 1) + " of " + a.lens.length + "  ·  " + (a.phase === "show" ? "Watch…" : (a.phase === "input" ? "Your turn: " + a.idx + " / " + a.seq.length : (a.last && !a.last.ok ? "Not quite" : "Nice!"))), W / 2, 26);
    for (i = 0; i < a.seq.length; i++) {
      x = W / 2 + (i - (a.seq.length - 1) / 2) * 64;
      g.fillStyle = i === lit ? "rgba(255,255,255,0.16)" : "#1a2236"; g.fillRect(x - 26, 44, 52, 60);
      g.strokeStyle = i === lit ? "#ffffff" : "#3a4866"; g.lineWidth = 2; g.strokeRect(x - 26, 44, 52, 60);
      var sh = null, col = "#fff";
      if (i === lit) { sh = MG().SHAPES[a.seq[i]]; col = SHAPE_COL[a.seq[i]]; }
      else if (a.phase !== "show" && i < a.idx) { sh = MG().SHAPES[a.seq[i]]; col = "#7cf0c0"; }
      else if (a.phase === "between" && a.last && !a.last.ok && i === a.idx) { sh = MG().SHAPES[a.seq[i]]; col = "#ff8a7a"; }
      else if (a.phase === "input" && i === a.idx) { sh = "?"; col = "#ffe08a"; }
      if (sh) { g.fillStyle = col; g.font = "bold 32px system-ui, sans-serif"; g.fillText(sh, x, 86); }
    }
    g.fillStyle = "#8f9ab2"; g.font = "12px system-ui, sans-serif"; g.fillText(a.right + " right so far", W / 2, 132);
  }
  /* the panel for the track: a small map of the oval, your lane and the clock */
  function drawLanes(a) {
    var W = cv.width, H = cv.height, g = a.g, k = Math.min((W - 200) / (g.rx * 2), (H - 16) / (g.ry * 2)), cx = W / 2, cy = H / 2, i, h, pt, me2;
    var mx = function (x) { return cx + (x - g.cx) * k; }, my = function (y) { return cy + (y - g.cy) * k; };
    var gc = cv.getContext("2d");
    gc.strokeStyle = "#6a4a30"; gc.lineWidth = 9; gc.beginPath(); gc.ellipse(cx, cy, g.rx * k, g.ry * k, 0, 0, Math.PI * 2); gc.stroke();
    gc.strokeStyle = "rgba(255,255,255,0.35)"; gc.lineWidth = 1; gc.beginPath(); gc.ellipse(cx, cy, g.rx * k, g.ry * k, 0, 0, Math.PI * 2); gc.stroke();
    for (i = 0; i < a.hz.length; i++) {
      h = a.hz[i]; if (h.passed || h.hit) continue;
      pt = MG().trackPoint(g, h.s, MG().LANES.off[h.lane]);
      gc.fillStyle = h.kind === "hurdle" ? "#ffffff" : (a.t >= h.land ? "#c8b8a0" : "rgba(255,120,90,0.8)");
      gc.fillRect(mx(pt.x) - 2, my(pt.y) - 2, 4, 4);
    }
    me2 = MG().lanesPos(a);
    gc.fillStyle = a.flash > 0 ? "#ff7a5a" : "#7ce07a"; gc.beginPath(); gc.arc(mx(me2.x), my(me2.y), 5, 0, Math.PI * 2); gc.fill();
    gc.fillStyle = "#c9d4ea"; gc.font = "13px system-ui, sans-serif"; gc.textAlign = "left";
    gc.font = "bold 16px system-ui, sans-serif";
    gc.fillStyle = a.flash > 0 ? "#ff7a5a" : "#c9d4ea"; gc.fillText("Hits: " + a.hits, 14, 30);
    gc.fillStyle = "#ffe08a"; gc.fillText((a.lane ? "Outer" : "Inner") + " lane", 14, 58);
    gc.textAlign = "right"; gc.fillStyle = "#c9d4ea"; gc.fillText(Math.max(0, Math.ceil(a.dur - a.t)) + "s", W - 14, 30);
  }

  /* ---------- the track itself (drawn by farm.js into the farm scene) ----------
   * Always: a start gate with a chequered banner and pennants, and quarter-lap posts.
   * During Rockfall Run: the shadows of falling rocks, the rocks, the hurdles, and dust behind the partner. */
  var dust = [];
  function rockArt(ctx, x, y, r, hit) {
    ctx.fillStyle = "#3a3230"; ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = hit ? "#a86a5a" : "#8c8078"; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = hit ? "#d09080" : "#b4a89c"; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#5c524c"; ctx.fillRect(Math.round(x + r * 0.2), Math.round(y + r * 0.1), 3, 2);
  }
  function drawWorld(ctx, add, t, g) {
    var M = MG(); if (!M || !g) return;
    var i, k, p0, p1, a = act(), mg = a && a.mg && a.mg.kind === "lanes" ? a.mg : null;
    /* quarter-lap posts on the outside */
    for (k = 1; k < 4; k++) {
      (function (q) {
        var pp = M.trackPoint(g, q, (g.width || 44) / 2 + 10);
        add(pp.y, function () {
          ctx.fillStyle = "#3a2414"; ctx.fillRect(Math.round(pp.x) - 2, Math.round(pp.y) - 20, 5, 22);
          ctx.fillStyle = "#f4f0e0"; ctx.fillRect(Math.round(pp.x) - 1, Math.round(pp.y) - 19, 3, 6);
          ctx.fillStyle = "#e05a3a"; ctx.fillRect(Math.round(pp.x) - 1, Math.round(pp.y) - 13, 3, 3);
        });
      })(k * M.trackLen(g) / 4);
    }
    /* the start gate across the track */
    p0 = M.trackPoint(g, 0, -(g.width || 44) / 2 - 4); p1 = M.trackPoint(g, 0, (g.width || 44) / 2 + 4);
    add(Math.max(p0.y, p1.y) + 2, function () {
      var x0 = Math.round(Math.min(p0.x, p1.x)), x1 = Math.round(Math.max(p0.x, p1.x)), y = Math.round(p0.y), top = y - 54, j;
      ctx.fillStyle = "#3a2414"; ctx.fillRect(x0 - 3, top, 6, 56); ctx.fillRect(x1 - 3, top, 6, 56);
      ctx.fillStyle = "#8a5c30"; ctx.fillRect(x0 - 2, top, 4, 55); ctx.fillRect(x1 - 2, top, 4, 55);
      ctx.fillStyle = "#1a1410"; ctx.fillRect(x0 - 6, top - 2, x1 - x0 + 12, 16);
      for (j = 0; j < (x1 - x0 + 8) / 4; j++) { ctx.fillStyle = (j % 2) ? "#ffffff" : "#1a1410"; ctx.fillRect(x0 - 4 + j * 4, top, 4, 6); ctx.fillStyle = (j % 2) ? "#1a1410" : "#ffffff"; ctx.fillRect(x0 - 4 + j * 4, top + 6, 4, 6); }
      /* pennants */
      var cols = ["#e05a3a", "#ffd23a", "#4ab0e0"], fl = Math.sin((t || 0) * 4) * 2;
      for (j = 0; j < 3; j++) { ctx.fillStyle = cols[j]; ctx.beginPath(); ctx.moveTo(x0 + 6 + j * ((x1 - x0 - 12) / 2), top + 13); ctx.lineTo(x0 + 12 + j * ((x1 - x0 - 12) / 2), top + 13); ctx.lineTo(x0 + 9 + j * ((x1 - x0 - 12) / 2) + fl, top + 22); ctx.fill(); }
    });
    if (!mg) { dust.length = 0; return; }
    /* dust behind the runner */
    var me3 = M.lanesPos(mg);
    if (Math.random() < 0.7) dust.push({ x: me3.x + (Math.random() - 0.5) * 8, y: me3.y + 4, r: 2 + Math.random() * 2, life: 0.5 });
    for (i = dust.length - 1; i >= 0; i--) { dust[i].life -= 0.016; dust[i].r += 0.12; if (dust[i].life <= 0) dust.splice(i, 1); }
    ctx.save();
    for (i = 0; i < dust.length; i++) { ctx.globalAlpha = Math.max(0, dust[i].life) * 0.7; ctx.fillStyle = "#d8c0a0"; ctx.beginPath(); ctx.arc(dust[i].x, dust[i].y, dust[i].r, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    /* hazards */
    for (i = 0; i < mg.hz.length; i++) {
      (function (h) {
        var off = M.LANES.off[h.lane], pt = M.trackPoint(g, h.s, off), nx = M.trackPoint(g, h.s, off + 1);
        var ux = nx.x - pt.x, uy = nx.y - pt.y;
        if (h.kind === "rock") {
          var fall = Math.max(0, (h.land - mg.t) / M.LANES.warn);
          /* the shadow grows as it comes down */
          ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = "#1a1008";
          ctx.beginPath(); ctx.ellipse(pt.x, pt.y + 3, 12 - fall * 7, 5 - fall * 2.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
          if (fall > 0) { ctx.save(); ctx.globalAlpha = 0.9; ctx.strokeStyle = "rgba(255,110,80," + (0.5 + 0.5 * Math.sin((t || 0) * 20)) + ")"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(pt.x, pt.y + 3, 14, 6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
          add(pt.y + 2, function () { rockArt(ctx, pt.x, pt.y - fall * 170 - 5, 10, h.hit); });
        } else {
          add(pt.y + 1, function () {
            var ax = pt.x - ux * 12, ay = pt.y - uy * 12, bx = pt.x + ux * 12, by = pt.y + uy * 12;
            ctx.fillStyle = "#3a2414"; ctx.fillRect(Math.round(ax) - 2, Math.round(ay) - 16, 4, 17); ctx.fillRect(Math.round(bx) - 2, Math.round(by) - 16, 4, 17);
            ctx.lineWidth = 7; ctx.strokeStyle = "#1a1410"; ctx.beginPath(); ctx.moveTo(ax, ay - 11); ctx.lineTo(bx, by - 11); ctx.stroke();
            ctx.lineWidth = 5; ctx.strokeStyle = h.hit ? "#a86a5a" : "#ffffff"; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(ax, ay - 11); ctx.lineTo(bx, by - 11); ctx.stroke();
            ctx.strokeStyle = h.hit ? "#703020" : "#e05a3a"; ctx.lineDashOffset = 4; ctx.beginPath(); ctx.moveTo(ax, ay - 11); ctx.lineTo(bx, by - 11); ctx.stroke();
            ctx.setLineDash([]); ctx.lineDashOffset = 0;
          });
        }
      })(mg.hz[i]);
    }
    /* a hit: the partner flashes */
    if (mg.flash > 0) { ctx.save(); ctx.globalAlpha = mg.flash; ctx.fillStyle = "#ff5a3a"; ctx.beginPath(); ctx.arc(me3.x, me3.y - 14, 22, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  }

  function tickPanel() {
    var a = act(), on = !!(a && a.mg && D.getState && D.getState() === "farm");
    if (!on) { if (panel) panel.hidden = true; return; }
    build();
    var mg = a.mg, st = stations()[a.id] || {}, S = STAT[st.stat] || ["", "#fff"], info = MG().INFO[mg.kind];
    panel.hidden = false;
    panel.classList.toggle("is-lanes", mg.kind === "lanes");
    var wantH = mg.kind === "lanes" ? 96 : 150; if (cv.height !== wantH) cv.height = wantH;
    $("tg-title").textContent = info.title;
    $("tg-stat").textContent = S[0]; $("tg-stat").style.color = S[1];
    $("tg-how").textContent = info.how + "  " + (DOES[st.stat] || "");
    $("tg-shapes").hidden = mg.kind !== "memory";
    for (var i = 0; i < btns.length; i++) btns[i].disabled = !(mg.kind === "memory" && mg.phase === "input");
    $("tg-clock").style.width = Math.max(0, 100 * (1 - mg.t / mg.dur)) + "%";
    g.clearRect(0, 0, cv.width, cv.height);
    if (mg.kind === "strike") drawStrike(mg); else if (mg.kind === "memory") drawMemory(mg); else drawLanes(mg);
  }

  /* ---------- the card ---------- */
  var card = null, cardT = 0, cardAnim = null;
  function result(e) {
    if (!card) {
      card = document.createElement("div"); card.id = "train-result"; card.hidden = true;
      ($("hud") || document.body).appendChild(card);
      card.addEventListener("click", function () { card.hidden = true; cardT = 0; });
    }
    var S = STAT[e.stat] || [e.stat, "#fff"], col = GCOL[e.grade] || "#fff", scale = Math.max(50, Math.ceil((e.after || 0) / 50) * 50);
    var why = ["Base " + e.base];
    if (e.repeat != null && e.repeat < 100) why.push("repeat " + e.repeat + "%");
    if (e.fresh === false) why.push("tired " + e.tired + "%");
    if (e.gateMul > 100) why.push("gates +" + (e.gateMul - 100) + "%");
    if (e.boost) why.push("Protein Steak x" + e.boost);
    why.push((e.gradeLabel || "").replace("!", "") + " x" + e.score);
    card.innerHTML = "<div class='tr-grade' style='color:" + col + "'>" + (e.gradeLabel || "") + "</div>" +
      "<div class='tr-gain' style='color:" + S[1] + "'>+" + e.gain + " " + S[0] + "</div>" +
      (e.detail ? "<div class='tr-detail'>" + e.detail + "</div>" : "") +
      "<div class='tr-bar'><i class='tr-old' style='width:" + (100 * e.before / scale) + "%;background:" + S[1] + "'></i><i class='tr-new' style='left:" + (100 * e.before / scale) + "%;width:0%'></i><span>" + S[0] + " " + e.before + " → <b>" + e.after + "</b></span></div>" +
      "<div class='tr-why'>" + why.join("  ·  ") + "</div>" +
      (D.RO && D.RO.FARM && D.RO.FARM.map[e.stat] ? (function () {
        var per = D.RO.FARM.per, got = Math.floor(e.after / per), was = Math.floor(e.before / per), names = D.RO.FARM.map[e.stat].map(function (k) { return D.RO.NAMES[k]; }).join(" and ");
        return "<div class='tr-pts'>" + (got > was ? "<b>+" + (got - was) + " " + names + "!</b>  " : "") + "Status bonus from this: +" + got + " " + names + "  \u00b7  next at " + (got + 1) * per + "</div>";
      })() : "") +
      (DOES[e.stat] ? "<div class='tr-does'>" + DOES[e.stat] + "</div>" : "") +
      "<div class='tr-next'>Next session here: about +" + e.nextGreat + " for a Great" + (e.freshLeft === 0 ? "  ·  out of fresh sessions: beat wild Digimon for more" : "  ·  fresh sessions left: " + e.freshLeft) + "</div>";
    card.hidden = false; cardT = 7;
    cardAnim = { w: 100 * e.gain / scale, t: 0 };
    card.classList.remove("is-pop"); void card.offsetWidth; card.classList.add("is-pop");
  }
  function tickCard(dt) {
    if (!card || card.hidden) return;
    cardT -= dt;
    if (cardAnim && cardAnim.t < 1) {
      cardAnim.t = Math.min(1, cardAnim.t + dt / 0.8);
      var n = card.querySelector(".tr-new"); if (n) n.style.width = (cardAnim.w * (1 - Math.pow(1 - cardAnim.t, 3))) + "%";
    }
    if (cardT <= 0 || (D.getState && D.getState() !== "farm")) card.hidden = true;
  }

  var last = 0;
  function tick() {
    var now = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000, dt = last ? Math.min(0.1, now - last) : 0.016;
    last = now;
    tickPanel(); tickCard(dt);
  }
  D.farmTrain = { tick: tick, result: result, signLine: signLine, drawWorld: drawWorld, STAT: STAT, DOES: DOES };
})(typeof window !== "undefined" ? window : this);
