/* Digi Night — the turf war as the point of a run (17z33).
 *
 * The biomes fight over the land (war-sim.js, world.js territory). This makes that the angle of a
 * run, if you want it:
 *   - early in a run a little Digimon (Tokomon, the messenger) pops up and asks which side you're
 *     on: the biomes holding land round the start, with how much each holds, or "just survive".
 *     Nothing is forced; it goes away by itself, and Pause > Your side asks again any time.
 *   - your side's share of the land round the start (a disc of TURF.radius cells) shows under the
 *     minimap, with a mark at TURF.win; milestones on the way, a warning if it's being wiped out
 *   - when it holds TURF.win of that land, the war is yours: a victory card (the run goes on),
 *     a badge, and the run's rank pay counts it (profile.js "Turf war won"; more for an underdog,
 *     a side that started under TURF.underdog of the land)
 * It's all on this screen: each player picks their own side online, and the territory every
 * screen reads is the same (world.js applyTerritory). Kept on the run (run.turf).
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});
  var TURF = { radius: 12, win: 0.5, underdog: 0.1, askAt: 22, askHide: 40, every: 2, steps: [0.3, 0.4, 0.45], low: 0.06 };
  D.TURF = TURF;
  function $(id) { return document.getElementById(id); }
  function bname(id) { var BD = D.biomes && D.biomes.DEFS; return (BD && BD[id] && BD[id].name) || id; }
  function bcol(id) { return (D.WAR && D.WAR.color && D.WAR.color[id]) || "#ffffff"; }
  function sound(n) { try { if (D.audio && D.audio.sfx) D.audio.sfx(n); } catch (e) {} }
  function clock(t) { t = Math.floor(t || 0); var m = Math.floor(t / 60), s = t % 60; return m + ":" + (s < 10 ? "0" : "") + s; }

  /* the land round the start, by holder: { total, by: {biome: cells} } */
  function census() {
    var W = D.world, R = TURF.radius, x, y, o, by = {}, total = 0;
    if (!W || !W.cellOwner) return null;
    for (y = -R; y <= R; y++) for (x = -R; x <= R; x++) {
      if (x * x + y * y > R * R) continue;
      o = W.cellOwner(x, y); by[o] = (by[o] || 0) + 1; total++;
    }
    return { total: total, by: by };
  }
  function shareOf(c, id) { return c && c.total ? (c.by[id] || 0) / c.total : 0; }

  function T() {
    var run = D.getRun ? D.getRun() : null;
    if (!run) return null;
    return run.turf || (run.turf = { side: null, asked: false, askedAt: 0, start: 0, best: 0, step: 0, won: false, wonAt: 0, underdog: false, low: false, last: 0, share: 0, pledged: false });
  }

  /* ---------- the messenger and the choice ---------- */
  var card = null, raf = 0, cardOpenAt = 0;
  function guide(t) {
    var cv = $("turf-guide");
    if (!card || card.hidden || !cv) { raf = 0; return; }
    raf = requestAnimationFrame(guide);
    var c = cv.getContext("2d"), S = D.sprites, h;
    c.clearRect(0, 0, cv.width, cv.height); c.imageSmoothingEnabled = false;
    if (!S || !S.drawPartner) return;
    h = (S.visualHeight && S.visualHeight("tokomon")) || 40;
    c.save(); c.translate(36, 66 + Math.sin(t / 220) * 1.5);
    var sc = Math.min(2.4, 58 / h); c.scale(sc, sc);
    try { S.drawPartner(c, "tokomon", 0, 0, 1, 1, t / 1000, false, false, false); } catch (e) {}
    c.restore();
  }
  function buildCard() {
    if (card) return card;
    card = document.createElement("div");
    card.id = "turf-card"; card.hidden = true;
    card.setAttribute("role", "dialog");
    card.innerHTML = '<canvas id="turf-guide" width="72" height="72"></canvas><div class="turf-body"><div class="turf-who">Tokomon</div>' +
      '<p id="turf-say"></p><div class="turf-opts" id="turf-opts"></div>' +
      '<div class="turf-foot"><button type="button" id="turf-roam">Just survive</button><button type="button" id="turf-later">Later</button></div></div>';
    (document.getElementById("app") || document.body).appendChild(card);
    $("turf-roam").addEventListener("click", function () { choose(null); });
    $("turf-later").addEventListener("click", function () { hideCard(); });
    document.addEventListener("keydown", function (ev) {
      if (!card || card.hidden || ev.repeat) return;
      var tg = ev.target && ev.target.tagName;
      if (tg === "INPUT" || tg === "TEXTAREA") return;
      var b = card.querySelectorAll("#turf-opts button"), n = +ev.key;
      if (n >= 1 && n <= b.length) { b[n - 1].click(); ev.preventDefault(); ev.stopImmediatePropagation(); }
      else if (ev.key === "0") { choose(null); ev.preventDefault(); ev.stopImmediatePropagation(); }
    }, true);
    return card;
  }
  function openCard(again) {
    var t = T(), c = census(), list = [], k, i, html = "", sh, say;
    if (!t || !c) return;
    buildCard();
    for (k in c.by) list.push([k, c.by[k] / c.total]);
    list.sort(function (a, b) { return b[1] - a[1]; });
    list = list.slice(0, 6);
    for (i = 0; i < list.length; i++) {
      k = list[i][0]; sh = list[i][1];
      html += '<button type="button" data-side="' + k + '"' + (t.side === k ? ' class="is-mine"' : "") + '><i style="background:' + bcol(k) + '"></i><b>' + bname(k) + '</b>' +
        '<span>' + Math.round(sh * 100) + '%' + (sh < TURF.underdog ? ' · underdog' : "") + '</span><kbd>' + (i + 1) + '</kbd></button>';
    }
    $("turf-opts").innerHTML = html;
    Array.prototype.forEach.call($("turf-opts").querySelectorAll("button"), function (b) { b.addEventListener("click", function () { choose(b.getAttribute("data-side")); }); });
    say = again && t.side ? "Still with " + bname(t.side) + "? Or switch sides. The biomes won't hold it against you... much." :
      "Psst! The biomes round here are at war. Pick a side and help it take over the land! Or don't: head off any way you like and see how long you can last.";
    $("turf-say").textContent = say;
    card.hidden = false; cardOpenAt = Date.now();
    if (!raf) raf = requestAnimationFrame(guide);
    sound("ui");
  }
  function hideCard() { if (card) card.hidden = true; }
  function choose(side) {
    var t = T(), c = census();
    hideCard();
    if (!t) return;
    t.asked = true;
    if (!side) {
      if (D.simAct) D.simAct({ type: "side.pick", side: null });
      t.side = null; t.free = true; paintMeter(true);
      toast("Free agent! No biome will befriend you. Go anywhere and survive as long as you can. Pause > Your side if you change your mind.");
      return;
    }
    if (t.side === side) return;
    if (D.simAct) D.simAct({ type: "side.pick", side: side });       /* the simulation keeps trust to this one biome */
    adopt(t, side, c);
    if (D.profile && D.profile.award && !t.pledged) { t.pledged = true; D.profile.award("side"); }
    toast("You're with " + bname(side) + "! It holds " + Math.round(t.start * 100) + "% of the land round the start. Get it to " + Math.round(TURF.win * 100) + "%: hunt its enemies at the front and take down rival lords. Only your side will befriend you.");
    paintMeter(true);
    sound("ui");
  }
  function adopt(t, side, c) {
    t.side = side; t.start = shareOf(c, side); t.best = t.start; t.step = 0; t.low = false; t.underdog = t.start < TURF.underdog; t.share = t.start;
    if (!t.won) t.wonAt = 0;
    t.free = false;
  }
  /* the simulation decided (your first friend became your side), or confirmed a pick */
  function fromSim(e) {
    var t = T();
    if (!t) return;
    if (e.type === "side.auto" && e.side && t.side !== e.side) {
      adopt(t, e.side, census());
      t.asked = true; hideCard();
      if (D.profile && D.profile.award && !t.pledged) { t.pledged = true; D.profile.award("side"); }
      toast("You won " + bname(e.side) + " over! It trusts you now, so it's your side. The other biomes that were warming to you went back to neutral. Pause > Your side to switch.");
      paintMeter(true);
    }
  }

  /* ---------- the meter under the minimap ---------- */
  var meterSig = "";
  function paintMeter(force) {
    var box = $("hud-side"), t = T(), st = D.getState ? D.getState() : "", sig, pct, html;
    if (!box) return;
    if (!t || !t.side || st !== "playing") { if (!box.hidden) box.hidden = true; meterSig = ""; return; }
    pct = Math.round(t.share * 100);
    sig = t.side + pct + (t.won ? "W" : "");
    if (sig === meterSig && !force) return;
    meterSig = sig;
    box.hidden = false;
    html = '<div class="side-head">' + (t.won ? "★ Turf war won" : "Your side") + '</div>' +
      '<div class="side-row"><i style="background:' + bcol(t.side) + '"></i><b>' + bname(t.side) + '</b><u>' + pct + '%</u></div>' +
      '<span class="side-bar"><span style="width:' + Math.min(100, Math.round(t.share / TURF.win * 100)) + '%;background:' + bcol(t.side) + '"></span></span>' +
      '<small>' + (t.won ? "holds " + pct + "% of the land" : pct + "% of the land, " + Math.round(TURF.win * 100) + "% wins") + '</small>';
    box.innerHTML = html;
  }

  /* ---------- a little speech toast from the messenger ---------- */
  var toastEl = null, toastT = 0;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div"); toastEl.id = "turf-toast";
      (document.getElementById("app") || document.body).appendChild(toastEl);
    }
    toastEl.textContent = msg; toastEl.hidden = false; toastT = Date.now() + 6500;
  }

  /* ---------- victory ---------- */
  var win = null;
  function victory(t, run) {
    if (!win) {
      win = document.createElement("div"); win.id = "turf-win"; win.hidden = true;
      win.innerHTML = '<div class="tw-card"><div class="tw-rays"></div><div class="tw-kicker">Turf war won!</div><h2 id="tw-title"></h2><p id="tw-text"></p>' +
        '<button type="button" class="btn" id="tw-ok">Keep playing</button></div>';
      (document.getElementById("app") || document.body).appendChild(win);
      $("tw-ok").addEventListener("click", function () { win.hidden = true; });
    }
    $("tw-title").textContent = bname(t.side) + " rules the land!";
    $("tw-title").style.color = bcol(t.side);
    $("tw-text").textContent = "Your side now holds " + Math.round(t.share * 100) + "% of the land round the start" + (t.underdog ? ", and it started with just " + Math.round(t.start * 100) + "%. What a comeback!" : ".") +
      " It took " + clock(run.time) + ". The war goes on and so does your run: keep it, or see how far your side can spread.";
    win.hidden = false;
    sound("base");
    setTimeout(function () { if (win) win.hidden = true; }, 14000);
  }

  /* ---------- every frame (game.js) ---------- */
  var acc = 0;
  function tick(dt) {
    var run = D.getRun ? D.getRun() : null, st = D.getState ? D.getState() : "", t, c, s, i;
    if (toastEl && !toastEl.hidden && Date.now() > toastT) toastEl.hidden = true;
    if (!run || run.ended || st !== "playing") { if (card && !card.hidden && st !== "playing" && st !== "paused") hideCard(); paintMeter(); return; }
    t = T();
    /* not over the skill picker (a job level-up): Tokomon steps aside and asks again once it's closed */
    var busy = !!(D.levelWindowOpen && D.levelWindowOpen());
    if (busy && card && !card.hidden && !t.asked) { hideCard(); t.askedAt = 0; }
    if (!busy && !t.asked && !t.askedAt && run.time >= TURF.askAt && !(D.modesUi && D.modesUi.holdTurf(run)) && !(D.tour && D.tour.active()) && !(D.gpuHelp && D.gpuHelp.isOpen && D.gpuHelp.isOpen())) { t.askedAt = run.time; openCard(false); }
    if (card && !card.hidden && t.askedAt && run.time - t.askedAt > TURF.askHide && !t.asked) {
      t.asked = true; hideCard();
      toast("No rush. Pick a side any time from the pause menu, or just survive.");
    }
    acc += dt;
    if (acc < TURF.every || !t.side) { paintMeter(); return; }
    acc = 0;
    c = census(); s = shareOf(c, t.side); t.share = s;
    if (s > t.best) t.best = s;
    if (!t.won) {
      for (i = t.step; i < TURF.steps.length; i++) {
        if (s >= TURF.steps[i] && TURF.steps[i] > t.start + 0.02) {
          t.step = i + 1;
          toast(bname(t.side) + " holds " + Math.round(s * 100) + "% of the land! " + (i === TURF.steps.length - 1 ? "Almost there!" : "Keep pushing!"));
        } else break;
      }
      if (s >= TURF.win) {
        t.won = true; t.wonAt = run.time;
        if (D.profile) {
          if (D.profile.bump) D.profile.bump("warwins");            /* counted first, so the badge's save keeps it */
          if (D.profile.award) { D.profile.award("warwin"); if (t.underdog) D.profile.award("underdog"); }
          if (D.profile.stats && D.profile.award && (D.profile.stats().warwins || 0) >= 5) D.profile.award("warlord");
        }
        victory(t, run);
      }
    }
    if (!t.low && t.best > TURF.low + 0.04 && s < TURF.low) { t.low = true; toast(bname(t.side) + " is nearly wiped out! Help it, or switch sides from the pause menu."); }
    if (t.low && s > TURF.low + 0.03) t.low = false;
    paintMeter();
  }

  D.turf = { tick: tick, ask: function () { openCard(true); }, census: census, state: function () { return T(); }, fromSim: fromSim, TURF: TURF };
})(typeof window !== "undefined" ? window : this);
