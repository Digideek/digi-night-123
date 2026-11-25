/* End-of-round survivor brawl, drawn in the same top-down slanted
 * bullet-heaven camera and terrain as the mission field.
 * CPU teammates are optional (default 0), have no tamer, and are named after
 * their Digimon. Session slots are dynamic, hard-capped at 6 (humans + bots).
 * Does not affect the run.
 */
(function (global) {
  "use strict";

  var D = (global.DBH = global.DBH || {});
  var match = null;
  var host = null;
  var betCursor = 0;
  var paused = false;

  function cfg() { return D.BRAWL_CFG || {}; }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function dist2(ax, ay, bx, by) {
    var dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  }

  function tierOf(id) { return (D.tierOf && D.tierOf(id)) || 1; }

  function formName(id) {
    return (D.SPECIES && D.SPECIES[id] && D.SPECIES[id].name) || id || "?";
  }

  function fighterHasTamer(f) {
    if (!f) return false;
    if (f.hasTamer != null) return !!f.hasTamer;
    if (f.player && f.player.hasTamer != null) return !!f.player.hasTamer;
    return f.kind === "local" || f.kind === "remote";
  }

  function playerTitle(f) {
    if (!fighterHasTamer(f)) return "";
    if (f.title) return f.title;
    if (f.player && f.player.title) return f.player.title;
    if ((f.kind === "local") && D.cosmetics && D.cosmetics.titleLabel) return D.cosmetics.titleLabel();
    return "";
  }

  function displayName(f) {
    if (!f) return "?";
    if (!fighterHasTamer(f)) return formName(f.form);
    var base = (f.kind === "local") ? (f.name || "You") : (f.name || formName(f.form));
    var title = playerTitle(f);
    return title ? (base + " · " + title) : base;
  }

  function bettorsOf(m) {
    return (m.fighters || []).filter(function (f) { return !f.fighting && !f.dummy; }).slice(0, 5);
  }

  function multiOddsLine(fighters, pct) {
    return fighters.map(function (f, i) {
      return formName(f.form) + " " + (pct[i] || 0) + "%";
    }).join("  ·  ");
  }

  function sfx(name) {
    if (host && host.sfx) host.sfx(name);
  }

  function winChances(fighters) {
    var i, t, s = [], sum = 0, edge = (D.rarity && D.rarity.BRAWL) ? null : null;
    var table = { 1: 0, 2: 0.08, 3: 0.16, 4: 0.24, 5: 0.32 };
    for (i = 0; i < fighters.length; i++) {
      t = fighters[i].tier || 1;
      s[i] = Math.exp((table[t] || 0) * 2.4);
      sum += s[i];
    }
    if (sum <= 0) sum = 1;
    return s.map(function (v) { return v / sum; });
  }

  function headlineOdds(fighters, chances) {
    if (fighters.length < 2) return "";
    var i, j, best = null, rec, odds, label, a, b, gap;
    for (i = 0; i < fighters.length; i++) {
      for (j = i + 1; j < fighters.length; j++) {
        if (D.brawlOdds) {
          rec = D.brawlOdds(fighters[i].tier, fighters[j].tier);
          gap = Math.abs(rec.a - 0.5);
        } else {
          rec = { a: 0.5, b: 0.5, label: "50–50" };
          gap = 0;
        }
        if (!best || gap > best.gap) {
          if (rec.a >= rec.b) { a = fighters[i]; b = fighters[j]; odds = rec.label; }
          else { a = fighters[j]; b = fighters[i]; odds = (D.brawlOdds(fighters[j].tier, fighters[i].tier) || rec).label; }
          best = { gap: gap, fav: a, dog: b, label: odds };
        }
      }
    }
    if (!best) return "";
    return formName(best.fav.form) + " favored " + best.label + " over " + formName(best.dog.form);
  }

  function percents(chances) {
    var raw = chances.map(function (c) { return Math.round(c * 100); });
    var sum = 0, i, err, best = 0;
    for (i = 0; i < raw.length; i++) { sum += raw[i]; if (raw[i] > raw[best]) best = i; }
    raw[best] += (100 - sum);
    for (i = 0; i < raw.length; i++) if (raw[i] < 1) raw[i] = 1;
    sum = 0;
    for (i = 0; i < raw.length; i++) sum += raw[i];
    raw[best] += (100 - sum);
    return raw;
  }

  function makeFighter(player, seedN) {
    var form = player.form;
    var sp = (D.SPECIES && D.SPECIES[form]) || {};
    var t = tierOf(form);
    var mods = (D.brawlMods && D.brawlMods(t)) || { hpMul: 1, regen: 1, extraMove: 0 };
    var hp = Math.round((cfg().baseHp || 96) * (mods.hpMul || 1) + ((sp.base && sp.base.maxHp) ? sp.base.maxHp * 0.15 : 0));
    return {
      id: player.id,
      player: player,
      name: player.name,
      form: form,
      tamerId: player.tamerId,
      color: player.color,
      kind: player.kind,
      hasTamer: player.hasTamer != null ? !!player.hasTamer : (player.kind === "local" || player.kind === "remote"),
      title: player.title || null,
      cosmetics: player.cosmetics || null,
      tier: t,
      mods: mods,
      hp: hp,
      maxHp: hp,
      x: 80 + player.slot * 140,
      y: 40 + (player.slot % 2) * 40,
      facing: player.slot % 2 === 0 ? 1 : -1,
      vx: 0, vy: 0,
      iFrame: 0,
      atkCd: 0,
      dashCd: 0,
      atkT: 0,
      dashT: 0,
      hurtT: 0,
      ko: false,
      fighting: false,
      revived: false,
      betOn: null,
      seed: seedN
    };
  }

  function living(m) {
    return (m.fighters || []).filter(function (f) { return f.fighting && !f.ko && f.hp > 0; });
  }

  function applySurvival(session, opts) {
    opts = opts || {};
    var rnd = (D.session && D.session.mulberry) ? D.session.mulberry((session.seed ^ (opts.salt || 0x51)) >>> 0) : Math.random;
    var local = session.local();
    var downMin = cfg().alwaysDownBots != null ? cfg().alwaysDownBots : 1;
    var i, p, downed = 0;
    if (opts.aliveMap) {
      for (i = 0; i < session.players.length; i++) {
        p = session.players[i];
        p.alive = opts.aliveMap[p.id] !== false;
        if (!p.alive) downed++;
      }
      return;
    }
    for (i = 0; i < session.players.length; i++) {
      p = session.players[i];
      if (p.kind === "local") {
        p.alive = opts.localAlive !== false;
      } else {
        p.alive = rnd() > 0.42;
        if (!p.alive) downed++;
      }
    }
    if (downed < downMin) {
      var bots = session.bots();
      for (i = 0; i < bots.length && downed < downMin; i++) {
        if (bots[i].alive) { bots[i].alive = false; downed++; }
      }
    }
    if (opts.localAlive === false && local) local.alive = false;
    if (opts.forceAliveIds) {
      opts.forceAliveIds.forEach(function (id) {
        var q = session.player(id);
        if (q) q.alive = true;
      });
    }
  }

  function pickRevive(session, fighters, opts) {
    var cap = (cfg().partyCap || cfg().maxPlayers || 6);
    var liveN = (fighters || []).filter(function (f) { return f.fighting; }).length;
    if (liveN >= cap) return null;
    var dead = session.players.filter(function (p) { return !p.alive; });
    if (!dead.length) return null;
    if (opts && opts.reviveId) {
      var forced = session.player(opts.reviveId);
      if (forced && !forced.alive) return forced;
    }
    var pool = dead;
    if (opts && opts.forbidReviveIds) {
      pool = dead.filter(function (p) { return opts.forbidReviveIds.indexOf(p.id) < 0; });
      if (!pool.length) pool = dead;
    }
    var rnd = (D.session && D.session.mulberry) ? D.session.mulberry((session.seed ^ 0xC0DE) >>> 0) : Math.random;
    return pool[Math.floor(rnd() * pool.length) % pool.length];
  }

  function authAct(intent) {
    var A = (D.getMissionAuth && D.getMissionAuth()) || (host && host.getAuth && host.getAuth());
    if (A && A.act) return A.act(intent);
    return { ok: false, reason: "no-auth" };
  }
  function hasAuth() {
    var A = (D.getMissionAuth && D.getMissionAuth()) || (host && host.getAuth && host.getAuth());
    return !!(A && A.act);
  }
  function getAuth() {
    return (D.getMissionAuth && D.getMissionAuth()) || (host && host.getAuth && host.getAuth()) || null;
  }
  var brawlSeq = 0;
  var brawlAcc = 0;
  function authSnap() {
    var A = getAuth();
    if (!A || !A.sim) return null;
    if (A.sim.brawlSim) return A.sim.brawlSim.snapshot();
    return A.sim.brawl || null;
  }
  function overlayFighter(local, snapF) {
    if (!local || !snapF) return local;
    local.form = snapF.form || local.form;
    local.hp = snapF.hp; local.maxHp = snapF.maxHp;
    local.x = snapF.x; local.y = snapF.y; local.vx = snapF.vx; local.vy = snapF.vy;
    local.facing = snapF.facing;
    local.atkT = snapF.atkT; local.dashT = snapF.dashT; local.hurtT = snapF.hurtT; local.iFrame = snapF.iFrame;
    local.ko = !!snapF.ko; local.fighting = !!snapF.fighting; local.alive = snapF.alive !== false;
    local.revived = !!snapF.revived; local.enteredFight = !!snapF.enteredFight;
    local.betOn = snapF.betOn; local.tier = snapF.tier || local.tier; local.mods = snapF.mods || local.mods;
    local.kind = snapF.kind || local.kind; local.hasTamer = snapF.hasTamer;
    return local;
  }
  function pullAuthMatch(m) {
    if (!m || !hasAuth()) return m;
    var snap = authSnap();
    if (!snap) return m;
    var i, j, sf, found;
    for (i = 0; i < (snap.fighters || []).length; i++) {
      sf = snap.fighters[i];
      found = false;
      for (j = 0; j < m.fighters.length; j++) if (m.fighters[j].id === sf.id) {
        overlayFighter(m.fighters[j], sf);
        found = true;
      }
      if (!found) {
        var nf = makeFighter({ id: sf.id, form: sf.form, kind: sf.kind, name: sf.name, color: sf.color, hasTamer: sf.hasTamer }, 0);
        overlayFighter(nf, sf);
        m.fighters.push(nf);
      }
    }
    m.floats = snap.floats || m.floats;
    m.id = snap.matchId || m.id;
    m.origin = snap.origin || m.origin;
    m.fightT = snap.fightT;
    m.soloBonus = !!snap.soloBonus;
    if (snap.payout) m.payout = snap.payout;
    if (snap.revivedId) {
      for (i = 0; i < m.fighters.length; i++) if (m.fighters[i].id === snap.revivedId) m.revivedFighter = m.fighters[i];
    }
    var localF = m.fighters.filter(function (x) { return x.kind === "local" || x.kind === "host-client"; })[0];
    m.localFights = !!(localF && localF.fighting);
    m.localBets = !!(localF && !localF.fighting && !m.soloBonus);
    if (snap.winnerId && !m.winner) {
      for (i = 0; i < m.fighters.length; i++) if (m.fighters[i].id === snap.winnerId) m.winner = m.fighters[i];
      if (m.phase !== "result" && m.phase !== "payout") {
        setPhase(m, "result");
        sfx(m.winner && (m.winner.kind === "local" || m.winner.kind === "host-client") ? "evo" : "ui");
      }
    } else if (snap.phase && snap.phase !== m.phase && m.phase !== "result" && m.phase !== "payout") {
      if (snap.phase === "fight" || snap.phase === "odds" || snap.phase === "revive") setPhase(m, snap.phase);
    }
    return m;
  }
  function stepAuth(dt) {
    var A = getAuth();
    if (!A || !A.step) return;
    /* online: the host clock (js/net/online.js) steps the authority */
    if (D.online && D.online.drivesClock && D.online.drivesClock()) return;
    brawlAcc += dt;
    var step = A.dt || 0.04, guard = 0;
    while (brawlAcc >= step && guard < 8) {
      A.step();
      brawlAcc -= step;
      guard += 1;
    }
  }

  function el(id) { return (typeof document !== "undefined") && document.getElementById(id); }

  function setPhase(m, phase) {
    m.phase = phase;
    m.phaseT = 0;
    if (m.session) m.session.send("brawl:phase", { phase: phase, matchId: m.id });
    renderUi(m);
  }

  function renderUi(m) {
    var root = el("brawl-screen");
    if (!root) return;
    root.classList.add("is-on");
    var odds = el("brawl-odds");
    var bet = el("brawl-bet");
    var revive = el("brawl-revive");
    var result = el("brawl-result");
    var payout = el("brawl-payout");
    var hud = el("brawl-hud");
    var atk = el("brawl-atk");
    var pauseEl = el("brawl-pause");
    function hide(node, on) {
      if (!node) return;
      node.hidden = !on;
      node.classList.toggle("is-on", !!on);
    }
    var showOdds = m.phase === "odds";
    var showBet = m.phase === "odds" && m.localBets;
    var showRevive = m.phase === "revive";
    var showResult = m.phase === "result";
    var showPayout = m.phase === "payout";
    var showFightHud = m.phase === "fight" || m.phase === "odds" || m.phase === "revive";
    hide(odds, showOdds);
    hide(bet, showBet);
    hide(revive, showRevive);
    hide(result, showResult);
    hide(payout, showPayout);
    hide(hud, m.phase === "fight");
    hide(atk, false);                     /* Nov 21: it attacks by itself, no Punch button */
    hide(pauseEl, paused);
    if (showRevive) renderRevive(m, revive);
    if (showOdds) renderOdds(m, odds);
    if (showBet) renderBet(m, bet);
    if (showResult) renderResult(m, result);
    if (showPayout) renderPayout(m, payout);
    if (m.phase === "fight") renderFightHud(m, hud);
    root.setAttribute("data-phase", m.phase);
    root.classList.toggle("is-betting", !!showBet);
    root.classList.toggle("is-fighting", m.phase === "fight");
    root.classList.toggle("is-paused", !!paused);
  }

  function portraitCanvas(f, size) {
    size = size || 96;
    var c = document.createElement("canvas");
    c.width = size; c.height = size;
    c.className = "pixelated brawl-cv";
    c.setAttribute("aria-hidden", "true");
    paintPortrait(c, f.form, 0, false);
    return c;
  }

  function spriteInkBox(ctx, w, h) {
    var data, i, x, y, a, minX = w, minY = h, maxX = -1, maxY = -1;
    try { data = ctx.getImageData(0, 0, w, h).data; }
    catch (err) { return null; }
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        a = data[(y * w + x) * 4 + 3];
        if (a > 10) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null;
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }

  var _portraitScratch = null;
  function paintPortrait(canvas, form, t, moving) {
    /* Contain-fit the full sprite (any stage) by its real ink bounding box. */
    if (!canvas || !D.sprites || !D.sprites.drawPartner) return;
    var ctx = canvas.getContext("2d");
    var w = canvas.width, h = canvas.height;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    if (!_portraitScratch) _portraitScratch = (typeof document !== "undefined") ? document.createElement("canvas") : null;
    if (!_portraitScratch) {
      D.sprites.drawPartner(ctx, form, Math.round(w / 2), Math.round(h * 0.88), 1, 1, t || 0, false, false, !!moving);
      return;
    }
    var sw = 384, sh = 384;
    if (_portraitScratch.width !== sw || _portraitScratch.height !== sh) {
      _portraitScratch.width = sw;
      _portraitScratch.height = sh;
    }
    var sctx = _portraitScratch.getContext("2d", { willReadFrequently: true });
    sctx.imageSmoothingEnabled = false;
    sctx.clearRect(0, 0, sw, sh);
    D.sprites.drawPartner(sctx, form, Math.round(sw / 2), Math.round(sh * 0.84), 1, 1, t || 0, false, false, !!moving);
    var box = spriteInkBox(sctx, sw, sh);
    if (!box || box.w < 2 || box.h < 2) {
      D.sprites.drawPartner(ctx, form, Math.round(w / 2), Math.round(h * 0.88), 1, 1, t || 0, false, false, !!moving);
      return;
    }
    var margin = Math.max(3, Math.round(Math.min(w, h) * 0.06));
    var scale = Math.min((w - margin * 2) / box.w, (h - margin * 2) / box.h);
    var dw = Math.max(1, Math.round(box.w * scale));
    var dh = Math.max(1, Math.round(box.h * scale));
    var dx = Math.round((w - dw) / 2);
    var dy = Math.round((h - dh) / 2);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(_portraitScratch, box.x, box.y, box.w, box.h, dx, dy, dw, dh);
  }

  function renderOdds(m, root) {
    if (!root) return;
    var fighters = m.fighters.filter(function (f) { return f.fighting; });
    var ch = winChances(fighters);
    var pct = percents(ch);
    var head = headlineOdds(fighters, ch);
    var multi = multiOddsLine(fighters, pct);
    var hint = m.localBets
      ? "You're out — bet on a winner. Tap a fighter, or use the d-pad / WASD and Confirm."
      : "Short brawl for fun. Doesn't change your run. Confirm or wait to start.";
    var html = "<div class='brawl-panel-inner'>";
    html += "<h2>SURVIVOR BRAWL</h2>";
    html += "<p class='brawl-headline' id='brawl-headline'>" + escapeHtml(fighters.length >= 3 ? multi : head) + "</p>";
    if (fighters.length >= 3 && head) html += "<p class='sub brawl-headline-pair'>" + escapeHtml(head) + "</p>";
    html += "<p class='sub' id='brawl-odds-sub'>" + escapeHtml(hint) + "</p>";
    html += "<div class='brawl-cards' id='brawl-cards' data-count='" + fighters.length + "'>";
    var i, f, cls;
    for (i = 0; i < fighters.length; i++) {
      f = fighters[i];
      cls = "brawl-card";
      if (f.revived) cls += " is-revived";
      if (f.kind === "local") cls += " is-you";
      if (m.localBets && m.betTarget === f.id) cls += " is-picked is-selected";
      if (m.localBets && !m.betTarget && i === betCursor) cls += " is-selected";
      html += "<button type='button' class='" + cls + "' data-fid='" + f.id + "'>";
      html += "<div class='brawl-card-cv-wrap'><canvas class='pixelated brawl-cv' width='96' height='96' data-form='" + f.form + "'></canvas></div>";
      var shown = displayName(f);
      var title = playerTitle(f);
      html += "<div class='brawl-card-name'>" + escapeHtml(shown) + (f.kind === "local" ? " <span class='you-tag'>YOU</span>" : "") + "</div>";
      html += "<div class='brawl-card-form'>" + escapeHtml(formName(f.form)) + (title && fighterHasTamer(f) ? "" : "") + (f.revived ? " · returned" : "") + "</div>";
      html += "<div class='brawl-odds-pct'>" + pct[i] + "%</div>";
      html += "<div class='brawl-odds-bar'><i style='width:" + pct[i] + "%;background:" + (f.color || "#f0c020") + "'></i></div>";
      html += "</button>";
    }
    html += "</div>";
    html += renderBettorStrip(m);
    html += "<div class='row center brawl-actions'>";
    if (m.localBets) {
      html += "<button type='button' class='btn' id='btn-brawl-lock'>" + (m.betLocked ? "Bet locked" : "Lock bet") + "</button>";
    }
    html += "<button type='button' class='btn " + (m.localBets ? "ghost" : "") + "' id='btn-brawl-go'>Fight!</button>";
    html += "</div></div>";
    root.innerHTML = html;
    bindOddsButtons(m, root);
    paintOddsCanvases(root, m.time || 0);
  }

  function bindOddsButtons(m, root) {
    var cards = root.querySelectorAll(".brawl-card");
    var i;
    for (i = 0; i < cards.length; i++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-fid");
          if (m.localBets) placeBet(m, id);
          else skipToFight(m);
        });
      })(cards[i]);
    }
    var go = root.querySelector("#btn-brawl-go");
    if (go) go.addEventListener("click", function () { skipToFight(m); });
    var lock = root.querySelector("#btn-brawl-lock");
    if (lock) lock.addEventListener("click", function () { lockBet(m); });
  }

  function paintOddsCanvases(root, t) {
    if (!root) return;
    var list = root.querySelectorAll("canvas[data-form]");
    var i;
    for (i = 0; i < list.length; i++) paintPortrait(list[i], list[i].getAttribute("data-form"), t, false);
  }

  function renderBettorStrip(m) {
    var list = bettorsOf(m);
    if (!list.length) return "";
    var html = "<div class='brawl-bettors' id='brawl-bettors'>";
    var i, f, pick, label;
    for (i = 0; i < list.length; i++) {
      f = list[i];
      pick = f.betOn ? m.fighters.filter(function (x) { return x.id === f.betOn; })[0] : null;
      if (f.kind === "local" && m.betTarget) pick = m.fighters.filter(function (x) { return x.id === m.betTarget; })[0] || pick;
      label = displayName(f) + (pick ? (" → " + formName(pick.form)) : (f.kind === "local" ? " — picking…" : " — watching"));
      html += "<span class='brawl-bettor'>" + escapeHtml(label) + "</span>";
    }
    html += "</div>";
    return html;
  }

  function renderPayout(m, root) {
    if (!root) return;
    var pay = m.payout || { awards: [], currency: "DigiCoins", localBits: 0, mysterious: false, legendaryDrop: [] };
    var html = "<div class='brawl-panel-inner brawl-payout-card'>";
    html += "<p class='brawl-revive-kicker'>PAYOUT</p>";
    html += "<h2>" + escapeHtml(pay.currency || "DigiCoins") + "</h2>";
    if (!pay.awards || !pay.awards.length) {
      html += "<p class='sub'>No " + escapeHtml(pay.currency || "DigiCoins") + " this time.</p>";
    } else {
      html += "<ul class='brawl-payout-list'>";
      var i, a, who, why;
      for (i = 0; i < pay.awards.length; i++) {
        a = pay.awards[i];
        who = m.fighters.filter(function (f) { return f.id === a.id; })[0];
        why = a.reason === "win" ? "brawl win" : "correct bet";
        html += "<li" + (a.local ? " class='is-you'" : "") + "><span>" + escapeHtml(who ? displayName(who) : a.id) + "</span>";
        html += "<span class='brawl-payout-why'>" + why + "</span>";
        html += "<strong>+" + a.amount + "</strong></li>";
      }
      html += "</ul>";
    }
    if (pay.mysterious) {
      html += "<p class='brawl-mystery'>A mysterious reward found its way to you.</p>";
    }
    if (pay.localBits != null) {
      html += "<p class='sub'>You have " + pay.localBits + " " + escapeHtml(pay.currency || "DigiCoins") + ".</p>";
    }
    html += "<div class='row center'><button type='button' class='btn' id='btn-brawl-payout-done'>Continue</button></div>";
    html += "</div>";
    root.innerHTML = html;
    var btn = el("btn-brawl-payout-done");
    if (btn) btn.addEventListener("click", function () { finish(m); });
  }

  function renderBet(m, root) {
    /* Combined into the odds cards when localBets. Keep a compact status line. */
    if (!root) return;
    var target = m.fighters.filter(function (f) { return f.id === m.betTarget; })[0];
    var text = m.betLocked
      ? ("Bet locked: " + (target ? formName(target.form) : "?"))
      : (target ? ("Picked " + formName(target.form) + " — lock it in or change your pick.") : "Pick a fighter to bet on.");
    root.innerHTML = "<p class='brawl-bet-status'>" + escapeHtml(text) + "</p>";
  }

  function renderRevive(m, root) {
    if (!root) return;
    var f = m.revivedFighter;
    if (!f) { root.innerHTML = ""; return; }
    var you = f.kind === "local";
    root.innerHTML = "<div class='brawl-panel-inner brawl-revive-card'>" +
      "<p class='brawl-revive-kicker'>" + (you ? "YOU'RE BACK" : "A FIGHTER RETURNS") + "</p>" +
      "<canvas class='pixelated brawl-cv brawl-revive-cv' id='brawl-revive-cv' width='160' height='160' data-form='" + f.form + "'></canvas>" +
      "<h2 id='brawl-revive-name'>" + escapeHtml(f.name) + "</h2>" +
      "<p class='sub'>" + escapeHtml(formName(f.form)) + " jumps back into the brawl!</p>" +
      "</div>";
    paintPortrait(el("brawl-revive-cv"), f.form, m.time || 0, true);
  }

  function renderResult(m, root) {
    if (!root) return;
    var w = m.winner;
    var bet = m.fighters.filter(function (f) { return f.id === m.betTarget; })[0];
    var called = m.localBets && w && m.betTarget === w.id;
    var line = "Just for fun — back to the field.";
    if (m.localBets) {
      if (!m.betTarget) line = "You didn't lock a bet. " + line;
      else if (called) line = "Nice call! " + line;
      else line = "Your pick didn't take it. " + line;
    } else if (w && w.kind === "local") {
      line = "You took the brawl! " + line;
    }
    root.innerHTML = "<div class='brawl-panel-inner'>" +
      "<p class='brawl-revive-kicker'>WINNER</p>" +
      (w ? "<canvas class='pixelated brawl-cv' id='brawl-win-cv' width='140' height='140' data-form='" + w.form + "'></canvas>" : "") +
      "<h2 id='brawl-win-name'>" + escapeHtml(w ? displayName(w) : "Draw") + "</h2>" +
      "<p class='sub'>" + (w ? escapeHtml(formName(w.form)) : "") + "</p>" +
      "<p class='sub' id='brawl-result-note'>" + escapeHtml(line) + "</p>" +
      "<div class='row center'><button type='button' class='btn' id='btn-brawl-done'>Continue</button></div>" +
      "</div>";
    if (w) paintPortrait(el("brawl-win-cv"), w.form, m.time || 0, true);
    var btn = el("btn-brawl-done");
    if (btn) btn.addEventListener("click", function () { finish(m); });
  }

  function renderFightHud(m, root) {
    if (!root) return;
    var live = m.fighters.filter(function (f) { return f.fighting; });
    var html = "<div class='brawl-bars'>";
    var i, f, pct;
    for (i = 0; i < live.length; i++) {
      f = live[i];
      pct = Math.max(0, Math.round((f.hp / f.maxHp) * 100));
      html += "<div class='brawl-barrow" + (f.ko ? " is-ko" : "") + (f.kind === "local" ? " is-you" : "") + "'>";
      html += "<span class='brawl-bar-name'>" + escapeHtml(f.kind === "local" ? "You" : f.name) + "</span>";
      html += "<div class='brawl-bar'><i style='width:" + pct + "%;background:" + (f.color || "#f0c020") + "'></i></div>";
      html += "</div>";
    }
    html += "</div>";
    html += renderBettorStrip(m);
    if (m.localBets && m.betTarget) {
      var t = m.fighters.filter(function (x) { return x.id === m.betTarget; })[0];
      html += "<div class='brawl-watching'>Watching — you bet on " + escapeHtml(t ? formName(t.form) : "?") + "</div>";
    }
    root.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function placeBet(m, targetId) {
    if (!m || !m.localBets || m.betLocked) return;
    var f = m.fighters.filter(function (x) { return x.id === targetId && x.fighting; })[0];
    if (!f) return;
    if (hasAuth()) {
      var localBettor = m.fighters.filter(function (x) { return x.kind === "local"; })[0];
      var betR = authAct({ type: "brawl.bet", id: localBettor && localBettor.id, targetId: targetId });
      if (!betR.ok) return;
    }
    m.betTarget = targetId;
    var i;
    for (i = 0; i < m.fighters.length; i++) if (m.fighters[i].fighting) {
      if (m.fighters[i].id === targetId) betCursor = i;
    }
    /* Convert cursor among fighting only */
    var live = m.fighters.filter(function (x) { return x.fighting; });
    for (i = 0; i < live.length; i++) if (live[i].id === targetId) betCursor = i;
    if (m.session) m.session.send("brawl:bet", { targetId: targetId }, m.session.localId);
    var localF = m.fighters.filter(function (x) { return x.kind === "local"; })[0];
    if (localF) localF.betOn = targetId;
    sfx("ui");
    renderUi(m);
  }

  function lockBet(m) {
    if (!m || !m.localBets) return;
    if (!m.betTarget) {
      var live = m.fighters.filter(function (f) { return f.fighting; });
      if (live[betCursor]) placeBet(m, live[betCursor].id);
    }
    if (!m.betTarget) return;
    m.betLocked = true;
    sfx("pick");
    renderUi(m);
  }

  function botBets(m) {
    var dead = m.fighters.filter(function (f) { return !f.fighting && f.kind !== "local" && !f.dummy; }).slice(0, 5);
    var live = m.fighters.filter(function (f) { return f.fighting; });
    if (!live.length) return;
    var rnd = (D.session && D.session.mulberry) ? D.session.mulberry((m.session.seed ^ 0xBE7) >>> 0) : Math.random;
    var i, pick;
    for (i = 0; i < dead.length; i++) {
      pick = live[Math.floor(rnd() * live.length) % live.length];
      dead[i].betOn = pick.id;
      if (m.session) m.session.send("brawl:bet", { targetId: pick.id }, dead[i].id);
    }
  }

  function skipToFight(m) {
    if (!m || (m.phase !== "odds" && m.phase !== "revive")) return;
    if (m.localBets && m.betTarget && !m.betLocked) m.betLocked = true;
    if (hasAuth()) {
      authAct({ type: "brawl.ready", id: m.session && m.session.localId });
      pullAuthMatch(m);
      return;
    }
    startFight(m);
  }

  function arenaSize(m) {
    var c = cfg();
    var n = 2;
    if (m && m.fighters) n = m.fighters.filter(function (f) { return f.fighting; }).length;
    var add = n >= 5 ? 140 : (n === 4 ? 60 : 0);
    return { w: (c.arenaW || 720) + add, h: (c.arenaH || c.arenaD || 520) + Math.round(add * 0.7) };
  }

  function spawnRingRadius(n) {
    if (n <= 1) return 0;
    if (n <= 2) return 78;
    if (n <= 4) return 108;
    return 148;
  }

  function fighterRad(f) {
    var id = f && f.form;
    var def = (D.SPECIES && D.SPECIES[id]) || {};
    var base = def.radius || 12;
    if (D.sprites && D.sprites.bodyRadius) return D.sprites.bodyRadius(id, base);
    return Math.max(6, base);
  }

  function snapPos(x, y, rad) {
    if (D.world && D.world.nearestWalkable) return D.world.nearestWalkable(x, y, 280, rad == null ? 10 : rad);
    return { x: x, y: y };
  }

  function moveFighter(f, dx, dy) {
    var rad = fighterRad(f);
    var pos;
    /* the same step the authority uses (net/brawl-sim.js): no teleporting, no getting pinned */
    if (D.net && D.net.brawl && D.net.brawl.step) {
      pos = D.net.brawl.step(D.world, (match && match.origin) || { x: 0, y: 0 }, arenaSize(match || m), f.x, f.y, dx, dy, rad);
      f.x = pos.x; f.y = pos.y;
      return;
    }
    if (D.world && D.world.moveSlide) pos = D.world.moveSlide(f.x, f.y, dx, dy, rad);
    else pos = { x: f.x + dx, y: f.y + dy };
    var origin = (match && match.origin) || { x: 0, y: 0 };
    var size = arenaSize(match || m);
    var hw = size.w / 2, hh = size.h / 2;
    pos.x = clamp(pos.x, origin.x - hw + 24, origin.x + hw - 24);
    pos.y = clamp(pos.y, origin.y - hh + 24, origin.y + hh - 24);
    if (D.world && D.world.isRaised && D.world.isRaised(pos.x, pos.y, rad)) {
      var snapped = snapPos(pos.x, pos.y, rad);
      pos = snapped || pos;
    }
    f.x = pos.x;
    f.y = pos.y;
  }

  function cameraFocus(m) {
    var live = m.fighters.filter(function (f) { return f.fighting && !f.ko; });
    if (!live.length) live = m.fighters.filter(function (f) { return f.fighting || f.ko; });
    var cx = 0, cy = 0, i;
    if (!live.length) return m.origin || { x: 0, y: 0 };
    for (i = 0; i < live.length; i++) { cx += live[i].x; cy += live[i].y; }
    cx /= live.length; cy /= live.length;
    var local = m.fighters.filter(function (f) { return f.kind === "local" && (f.fighting || f.ko); })[0];
    if (local && (local.fighting || local.ko) && !m.localBets) {
      var w = live.length >= 5 ? 0.62 : (live.length >= 4 ? 0.78 : 1);
      return { x: local.x * w + cx * (1 - w), y: local.y * w + cy * (1 - w) };
    }
    return { x: cx, y: cy };
  }

  function startFight(m) {
    if (hasAuth()) {
      authAct({ type: "brawl.ready", id: m.session && m.session.localId });
      pullAuthMatch(m);
      sfx("level");
      return;
    }
    var i, f, n = 0, live = m.fighters.filter(function (x) { return x.fighting; });
    var origin = m.origin || { x: 0, y: 0 };
    var ring = spawnRingRadius(live.length);
    for (i = 0; i < m.fighters.length; i++) {
      f = m.fighters[i];
      if (!f.fighting) continue;
      var ang = (n / Math.max(1, live.length)) * Math.PI * 2 - Math.PI / 2;
      var pos = snapPos(origin.x + Math.cos(ang) * ring, origin.y + Math.sin(ang) * ring, fighterRad(f));
      f.x = pos.x;
      f.y = pos.y;
      f.facing = (f.x < origin.x) ? 1 : -1;
      f.ko = false;
      f.hp = f.maxHp;
      f.iFrame = f.revived ? 1.1 : 0.2;
      f.enteredFight = true;
      if (hasAuth()) {
        var Au = D.getMissionAuth && D.getMissionAuth();
        var bf = Au && Au.sim && Au.sim.brawl && Au.sim.brawl.fighters;
        var bi;
        if (bf) for (bi = 0; bi < bf.length; bi++) if (bf[bi].id === f.id) bf[bi].enteredFight = true;
      }
      n++;
    }
    if (!m.soloBonus) botBets(m);
    setPhase(m, "fight");
    sfx("level");
  }

  function finish(m) {
    if (!m || m.done) return;
    m.done = true;
    if (m.session) m.session.send("brawl:end", { winnerId: m.winner && m.winner.id });
    if (hasAuth()) {
      var A = getAuth();
      if (A && A.setLocalPause) A.setLocalPause(false);
      if (A && A.act) A.act({ type: "brawl.dismiss" });
    }
    hideScreen();
    match = null;
    paused = false;
    if (host && host.onDone) host.onDone(m);
  }

  function hideScreen() {
    var root = el("brawl-screen");
    if (root) {
      root.classList.remove("is-on", "is-betting", "is-fighting", "is-paused");
      root.removeAttribute("data-phase");
    }
    ["brawl-odds", "brawl-bet", "brawl-revive", "brawl-result", "brawl-payout", "brawl-hud", "brawl-atk", "brawl-pause"].forEach(function (id) {
      var n = el(id);
      if (n) { n.hidden = true; n.classList.remove("is-on"); }
    });
  }


  function beginFromAuth(opts, session) {
    var origin = { x: 0, y: 0 };
    var run = (D.getRun && D.getRun()) || null;
    if (run) { origin.x = run.x || 0; origin.y = run.y || 0; }
    origin = snapPos(origin.x, origin.y, 12);
    var roster = [];
    var i, p, f;
    for (i = 0; i < session.players.length; i++) {
      p = session.players[i];
      roster.push({
        id: p.id,
        form: p.form,
        kind: p.kind,
        name: p.name,
        color: p.color,
        tamerId: p.tamerId,
        hasTamer: p.hasTamer,
        title: p.title
      });
    }
    var matchId = "brawl-" + (run && run.worldSeed || session.seed || 0) + "-" + (run && run.level || 0) + "-" + i;
    var started = authAct({
      type: "brawl.begin",
      id: session.localId || session.local || (roster[0] && roster[0].id),
      matchId: matchId,
      origin: origin,
      players: roster
    });
    if (!started || started.skipped) return { skipped: true, fighters: (started && started.fighters) || [] };
    brawlAcc = 0;
    brawlSeq = 0;
    var snap = started.snap || authSnap() || { fighters: started.fighters || [], phase: started.phase || "odds" };
    var fighters = [];
    for (i = 0; i < (snap.fighters || []).length; i++) {
      f = makeFighter({
        id: snap.fighters[i].id,
        form: snap.fighters[i].form,
        kind: snap.fighters[i].kind,
        name: snap.fighters[i].name,
        color: snap.fighters[i].color,
        hasTamer: snap.fighters[i].hasTamer,
        title: snap.fighters[i].title
      }, session.seed + i);
      overlayFighter(f, snap.fighters[i]);
      fighters.push(f);
    }
    var localF = fighters.filter(function (x) { return x.kind === "local" || x.kind === "host-client"; })[0];
    var revivedF = null;
    if (snap.revivedId || started.revivedId) {
      var rid = snap.revivedId || started.revivedId;
      for (i = 0; i < fighters.length; i++) if (fighters[i].id === rid) revivedF = fighters[i];
    }
    var m = {
      id: started.matchId || matchId,
      session: session,
      fighters: fighters,
      revivedFighter: revivedF,
      phase: snap.phase || started.phase || "odds",
      phaseT: snap.phaseT || 0,
      time: snap.time || 0,
      fightT: snap.fightT || 0,
      winner: null,
      localFights: !!(localF && localF.fighting),
      localBets: !!(localF && !localF.fighting),
      betTarget: null,
      betLocked: false,
      done: false,
      fx: [],
      floats: snap.floats || [],
      origin: snap.origin || origin,
      camX: (snap.origin && snap.origin.x) || origin.x,
      camY: (snap.origin && snap.origin.y) || origin.y,
      soloBonus: !!snap.soloBonus
    };
    betCursor = 0;
    paused = false;
    match = m;
    if (session) session.send("brawl:start", { matchId: m.id, revivedId: revivedF && revivedF.id });
    if (D.sprites && D.sprites.preloadSpecies) {
      D.sprites.preloadSpecies(fighters.map(function (x) { return x.form; }), true);
    }
    setPhase(m, m.phase);
    if (m.phase === "revive") sfx("evo");
    else if (m.phase === "fight") sfx("level");
    else sfx("ui");
    return m;
  }

  function begin(opts) {
    opts = opts || {};
    var session = opts.session;
    if (!session) return null;
    endQuiet();
    if (hasAuth()) return beginFromAuth(opts, session);
    applySurvival(session, opts);
    var i, p, f;
    var fighters = [];
    for (i = 0; i < session.players.length; i++) {
      p = session.players[i];
      f = makeFighter(p, (session.seed + i * 17) >>> 0);
      f.fighting = !!p.alive;
      fighters.push(f);
    }
    var revivedP = hasAuth() ? null : pickRevive(session, fighters, opts);
    var revivedF = null;
    if (revivedP) {
      revivedP.alive = true;
      for (i = 0; i < fighters.length; i++) if (fighters[i].id === revivedP.id) {
        fighters[i].fighting = true;
        fighters[i].revived = true;
        revivedF = fighters[i];
      }
    }
    var localF = fighters.filter(function (x) { return x.kind === "local"; })[0];
    var localFights = !!(localF && localF.fighting);
    var localBets = !!(localF && !localF.fighting);
    var fightingN = fighters.filter(function (x) { return x.fighting; }).length;
    var origin = { x: 0, y: 0 };
    var run = (D.getRun && D.getRun()) || null;
    if (run) { origin.x = run.x || 0; origin.y = run.y || 0; }
    origin = snapPos(origin.x, origin.y, 12);
    var soloBonus = false;
    if (fightingN < 2) {
      if ((cfg().soloMode || "skip") !== "bonus") {
        /* Solo / no challengers: skip the brawl entirely. Caller restores state. */
        return { skipped: true, fighters: fighters };
      }
      soloBonus = true;
      var dummyForm = (opts.dummyForm) || "greymon";
      if (D.SPECIES && !D.SPECIES[dummyForm]) dummyForm = "agumon";
      var dummy = makeFighter({
        id: "dummy",
        name: "Training Dummy",
        kind: "bot",
        form: dummyForm,
        tamerId: null,
        hasTamer: false,
        alive: true,
        color: "#9aa4b0"
      }, (session.seed ^ 0xD00) >>> 0);
      dummy.fighting = true;
      dummy.dummy = true;
      dummy.maxHp = Math.round((dummy.maxHp || 96) * 1.4);
      dummy.hp = dummy.maxHp;
      fighters.push(dummy);
      localBets = false;
      fightingN = fighters.filter(function (x) { return x.fighting; }).length;
    }
    var m = {
      id: "brawl-" + Date.now(),
      session: session,
      fighters: fighters,
      revivedFighter: soloBonus ? null : revivedF,
      phase: (soloBonus ? "fight" : (revivedF ? "revive" : "odds")),
      phaseT: 0,
      time: 0,
      fightT: 0,
      winner: null,
      localFights: localFights,
      localBets: soloBonus ? false : localBets,
      betTarget: null,
      betLocked: false,
      done: false,
      fx: [],
      floats: [],
      origin: origin,
      camX: origin.x,
      camY: origin.y,
      soloBonus: soloBonus
    };
    betCursor = 0;
    paused = false;
    match = m;
    if (session) session.send("brawl:start", { matchId: m.id, revivedId: m.revivedFighter && m.revivedFighter.id });
    if (D.sprites && D.sprites.preloadSpecies) {
      D.sprites.preloadSpecies(fighters.map(function (x) { return x.form; }), true);
    }
    setPhase(m, m.phase);
    if (m.soloBonus) startFight(m);
    else if (m.phase === "revive") sfx("evo");
    else sfx("ui");
    return m;
  }

  function endQuiet() {
    match = null;
    paused = false;
    hideScreen();
  }

  function update(dt) {
    var m = match;
    if (!m || m.done) return m;
    if (paused) {
      paintOddsCanvases(el("brawl-odds"), m.time);
      return m;
    }
    m.time += dt;
    m.phaseT += dt;
    /* online: every screen follows the host's brawl phase, not its own timer */
    if (hasAuth() && D.online && D.online.active && D.online.active()) pullAuthMatch(m);
    if (m.phase === "revive") {
      paintPortrait(el("brawl-revive-cv"), m.revivedFighter && m.revivedFighter.form, m.time, true);
      if (m.phaseT >= (cfg().reviveSeconds || 2.4)) setPhase(m, "odds");
      return m;
    }
    if (m.phase === "odds") {
      paintOddsCanvases(el("brawl-odds"), m.time);
      if (m.phaseT >= (cfg().oddsSeconds || 4.2)) skipToFight(m);
      return m;
    }
    if (m.phase === "result") {
      paintPortrait(el("brawl-win-cv"), m.winner && m.winner.form, m.time, true);
      if (m.phaseT >= (cfg().resultSeconds || 3.2)) setPhase(m, "payout");
      return m;
    }
    if (m.phase === "payout") {
      if (m.phaseT >= (cfg().payoutSeconds || 3.6)) finish(m);
      return m;
    }
    if (hasAuth()) {
      if (m.phase === "fight" && m.localFights) {
        var ainp = (D.input && D.input.poll) ? D.input.poll() : { x: 0, y: 0 };
        var atk = consumeAttack();
        var dash = consumeDash(m);
        brawlSeq += 1;
        var A = getAuth(), cl = _clickQueued; _clickQueued = null;
        if (A && A.onMessage) {
          var bi = { seq: brawlSeq, x: ainp.x || 0, y: ainp.y || 0, atk: atk, dash: dash };
          if (cl && cl.tgt) bi.tgt = cl.tgt;
          if (cl && cl.go) bi.go = cl.go;
          A.onMessage({
            type: "input",
            id: (m.session && (m.session.localId || m.session.local)) || (localFighterId(m)),
            inputs: [bi]
          });
        }
      }
      stepAuth(dt);
      pullAuthMatch(m);
      var focusA = cameraFocus(m);
      var lerpA = Math.min(1, 7 * dt);
      m.camX += (focusA.x - m.camX) * lerpA;
      m.camY += (focusA.y - m.camY) * lerpA;
      if (m.phase === "fight") {
        if (Math.floor(m.phaseT * 4) !== Math.floor((m.phaseT - dt) * 4)) renderFightHud(m, el("brawl-hud"));
      }
      return m;
    }
    if (m.phase === "fight") {
      updateFight(m, dt);
      if (m.phaseT * 0 === 0 && Math.floor(m.phaseT * 4) !== Math.floor((m.phaseT - dt) * 4)) renderFightHud(m, el("brawl-hud"));
    }
    return m;
  }

  function localFighterId(m) {
    var f = m && m.fighters.filter(function (x) { return x.kind === "local" || x.kind === "host-client"; })[0];
    return f ? f.id : "p0";
  }

  function updateFight(m, dt) {
    m.fightT += dt;
    var inp = (D.input && D.input.poll) ? D.input.poll() : { x: 0, y: 0 };
    var i, f, live;
    /* Local input as a session message so a later net layer can inject the same way. */
    if (m.localFights && m.session) {
      var atk = consumeAttack();
      var dash = consumeDash(m);
      m.session.send("brawl:input", { x: inp.x || 0, y: inp.y || 0, attack: atk, dash: dash }, m.session.localId);
      applyInput(m, m.session.localId, { x: inp.x || 0, y: inp.y || 0, attack: atk, dash: dash }, dt);
    }
    for (i = 0; i < m.fighters.length; i++) {
      f = m.fighters[i];
      if (!f.fighting || f.ko || f.kind !== "bot") continue;
      botThink(m, f, dt);
    }
    for (i = 0; i < m.fighters.length; i++) {
      f = m.fighters[i];
      if (!f.fighting) continue;
      integrate(m, f, dt);
    }
    separate(m);
    tickFx(m, dt);
    var focus = cameraFocus(m);
    var lerp = Math.min(1, 7 * dt);
    m.camX += (focus.x - m.camX) * lerp;
    m.camY += (focus.y - m.camY) * lerp;
    live = living(m);
    var limit = m.soloBonus ? (cfg().soloBonusSeconds || 12) : (cfg().maxFightSeconds || 40);
    if ((!m.soloBonus && live.length <= 1) || m.fightT >= limit) {
      declareWinner(m, live);
    }
  }

  var _atkQueued = false;
  var _dashQueued = false;
  function consumeAttack() {
    var k = D.input && D.input.keys;
    var down = _atkQueued;
    _atkQueued = false;
    if (k && (k[" "] || k.Spacebar || k.Enter || k.j || k.J || k.k || k.K || k.z || k.Z)) down = true;
    if (D.input && D.input.consumeConfirm && D.input.consumeConfirm()) down = true;
    return down;
  }
  function consumeDash(m) {
    var k = D.input && D.input.keys;
    var down = _dashQueued;
    _dashQueued = false;
    if (k && (k.Shift || k.shift || k.l || k.L)) down = true;
    return down;
  }
  function queueAttack() { _atkQueued = true; }
  /* a click in the arena (world coords): on a fighter, go for it; on open ground, move there */
  var _clickQueued = null;
  function clickAt(wx, wy) {
    var m = match, i, f, best = null, bd = 34 * 34, d, me = localFighterId(m);
    if (!m || m.phase !== "fight") return null;
    for (i = 0; i < m.fighters.length; i++) {
      f = m.fighters[i];
      if (!f.fighting || f.ko || f.id === me || f.kind === "local" || f.kind === "host-client") continue;
      d = dist2(wx, wy, f.x, f.y - 14);
      if (d < bd) { bd = d; best = f; }
    }
    _clickQueued = best ? { tgt: best.id } : { go: [Math.round(wx), Math.round(wy)] };
    return best ? "target" : "move";
  }
  function queueDash() { _dashQueued = true; }

  function applyInput(m, playerId, inp, dt) {
    var f = m.fighters.filter(function (x) { return x.id === playerId; })[0];
    if (!f || f.ko || !f.fighting) return;
    var speed = 210;
    f.vx = (inp.x || 0) * speed;
    f.vy = (inp.y || 0) * speed;
    if (inp.x > 0.2) f.facing = 1;
    else if (inp.x < -0.2) f.facing = -1;
    if (inp.dash) tryDash(m, f);
    if (inp.attack) tryAttack(m, f);
  }

  function botThink(m, f, dt) {
    f._ai = (f._ai || 0) + dt;
    var targets = living(m).filter(function (o) { return o.id !== f.id; });
    if (!targets.length) { f.vx = 0; f.vy = 0; return; }
    var i, best = targets[0], bd = 1e15, d;
    for (i = 0; i < targets.length; i++) {
      d = dist2(f.x, f.y, targets[i].x, targets[i].y);
      if (d < bd) { bd = d; best = targets[i]; }
    }
    var dx = best.x - f.x, dy = best.y - f.y;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var range = 48;
    var speed = 170 + (f.tier || 1) * 8;
    if (f.hp < f.maxHp * 0.28 && len < 90 && f._ai % 3 < 0.9) {
      f.vx = -(dx / len) * speed;
      f.vy = -(dy / len) * speed;
    } else if (len > range) {
      f.vx = (dx / len) * speed;
      f.vy = (dy / len) * speed;
      if (f.mods && f.mods.extraMove && len < 180 && f.dashCd <= 0) tryDash(m, f);
    } else {
      f.vx *= 0.4;
      f.vy *= 0.4;
      if (f.atkCd <= 0) tryAttack(m, f);
    }
    if (dx > 4) f.facing = 1;
    else if (dx < -4) f.facing = -1;
  }

  function tryAttack(m, f) {
    if (f.atkCd > 0 || f.ko || f.dashT > 0) return;
    f.atkCd = cfg().attackCd || 0.48;
    f.atkT = 0.22;
    sfx("hit");
    var range = 52, i, o, d, dmg, mods;
    mods = f.mods || {};
    dmg = (cfg().baseDamage || 11) * (0.92 + (f.tier || 1) * 0.03);
    for (i = 0; i < m.fighters.length; i++) {
      o = m.fighters[i];
      if (o === f || !o.fighting || o.ko || o.iFrame > 0) continue;
      d = Math.sqrt(dist2(f.x, f.y, o.x, o.y));
      if (d < range && (o.x - f.x) * f.facing >= -8) hit(m, f, o, dmg);
    }
  }

  function tryDash(m, f) {
    if (!f.mods || !f.mods.extraMove) return;
    if (f.dashCd > 0 || f.ko) return;
    f.dashCd = cfg().dashCd || 3;
    f.dashT = 0.22;
    var dx = f.vx, dy = f.vy, len = Math.sqrt(dx * dx + dy * dy);
    if (len < 8) { dx = f.facing; dy = 0; len = 1; }
    f.vx = (dx / len) * 520;
    f.vy = (dy / len) * 520;
    sfx("pick");
  }

  function hit(m, atk, def, dmg) {
    def.hp -= dmg;
    def.iFrame = 0.32;
    def.hurtT = 0.18;
    def.vx += atk.facing * 140;
    addFloat(m, def.x, def.y - 28, Math.round(dmg) + "", "#ffe8c0");
    if (m.session) m.session.send("brawl:hit", { from: atk.id, to: def.id, dmg: dmg });
    if (def.hp <= 0) {
      def.hp = 0;
      def.ko = true;
      def.vx = atk.facing * 80;
      addFloat(m, def.x, def.y - 40, "KO!", def.color || "#fff");
      sfx("dead");
      if (m.session) m.session.send("brawl:ko", { id: def.id });
    }
  }

  function integrate(m, f, dt) {
    f.atkCd = Math.max(0, f.atkCd - dt);
    f.dashCd = Math.max(0, f.dashCd - dt);
    f.iFrame = Math.max(0, f.iFrame - dt);
    f.atkT = Math.max(0, f.atkT - dt);
    f.dashT = Math.max(0, f.dashT - dt);
    f.hurtT = Math.max(0, f.hurtT - dt);
    if (f.ko) {
      f.vx *= Math.pow(0.05, dt);
      f.vy *= Math.pow(0.05, dt);
      moveFighter(f, f.vx * dt, f.vy * dt);
      return;
    }
    if (f.dashT > 0) {
      var i, o, dmg = (cfg().baseDamage || 11) * 0.85;
      for (i = 0; i < m.fighters.length; i++) {
        o = m.fighters[i];
        if (o === f || !o.fighting || o.ko || o.iFrame > 0) continue;
        if (Math.sqrt(dist2(f.x, f.y, o.x, o.y)) < 44) hit(m, f, o, dmg);
      }
    }
    moveFighter(f, f.vx * dt, f.vy * dt);
    f.vx *= Math.pow(0.08, dt);
    f.vy *= Math.pow(0.08, dt);
    if (!f.ko) {
      var regen = (cfg().regenPerSec || 2.2) * ((f.mods && f.mods.regen) || 1);
      f.hp = Math.min(f.maxHp, f.hp + regen * dt);
    }
  }

  function separate(m) {
    var i, j, a, b, dx, dy, d, push;
    for (i = 0; i < m.fighters.length; i++) {
      a = m.fighters[i];
      if (!a.fighting) continue;
      for (j = i + 1; j < m.fighters.length; j++) {
        b = m.fighters[j];
        if (!b.fighting) continue;
        dx = b.x - a.x; dy = b.y - a.y;
        d = Math.sqrt(dx * dx + dy * dy) || 0.001;
        if (d < 36) {
          push = (36 - d) / 2;
          moveFighter(a, -(dx / d) * push, -(dy / d) * push);
          moveFighter(b, (dx / d) * push, (dy / d) * push);
        }
      }
    }
  }

  function addFloat(m, x, y, text, color) {
    m.floats.push({ x: x, y: y, text: text, color: color || "#fff", life: 0.7, max: 0.7 });
  }

  function tickFx(m, dt) {
    var i, f;
    for (i = m.floats.length - 1; i >= 0; i--) {
      f = m.floats[i];
      f.life -= dt;
      f.y -= 36 * dt;
      if (f.life <= 0) m.floats.splice(i, 1);
    }
  }

  function declareWinner(m, live) {
    if (hasAuth()) {
      /* Winner is derived on the authority tick, never nominated here. */
      pullAuthMatch(m);
      return;
    }
    if (m.winner) return;
    if (live && live.length === 1) m.winner = live[0];
    else {
      var pool = m.fighters.filter(function (f) { return f.fighting; }).slice().sort(function (a, b) { return b.hp - a.hp; });
      m.winner = pool[0] || null;
    }
    if (m.session) m.session.send("brawl:end", { winnerId: m.winner && m.winner.id });
    if (hasAuth()) {
      var liveIds = (live || living(m)).map(function (f) { return f.id; });
      var conc = authAct({ type: "brawl.conclude", liveIds: liveIds, winnerId: m.winner && m.winner.id });
      m.payout = (conc && conc.payout) || m.payout;
    } else {
      m.payout = settlePayout(m);
    }
    setPhase(m, "result");
    sfx(m.winner && m.winner.kind === "local" ? "evo" : "ui");
  }

  function settlePayout(m) {
    var winnerId = m.winner && m.winner.id;
    var correct = [];
    var i, f, tier, defeatedLegendary = false;
    for (i = 0; i < m.fighters.length; i++) {
      f = m.fighters[i];
      if (!f.dummy && !f.fighting && f.betOn && winnerId && f.betOn === winnerId) correct.push(f.id);
      if (m.localBets && f.kind === "local" && m.betTarget && winnerId && m.betTarget === winnerId && correct.indexOf(f.id) < 0) correct.push(f.id);
      if (f.enteredFight && m.winner && f.id !== m.winner.id) {
        tier = f.tier || ((D.tierOf && f.form) ? D.tierOf(f.form) : 1);
        if (tier >= 5) defeatedLegendary = true;
      }
    }
    var localId = m.session && m.session.localId;
    if (D.cosmetics && D.cosmetics.settleBrawl) {
      return D.cosmetics.settleBrawl({
        localId: localId,
        winnerId: winnerId,
        correctBettorIds: correct,
        defeatedLegendary: defeatedLegendary
      });
    }
    return { awards: [], currency: "DigiCoins", localBits: 0, mysterious: false, legendaryDrop: [] };
  }

  function toScreen(x, y, vw, vh) {
    /* World space is already camera-transformed when this is used after translate. */
    return { x: x, y: y, scale: 1 };
  }

  function draw(ctx, vw, vh) {
    var m = match;
    if (!ctx) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    var time = m ? m.time : 0;
    var camX = m ? m.camX : 0, camY = m ? m.camY : 0;
    if (D.sprites && D.sprites.drawParallax) {
      D.sprites.drawParallax(ctx, camX, camY, vw, vh, time, !!(D.reducedFx));
    } else {
      ctx.fillStyle = (D.PALETTE && D.PALETTE.bg0) || "#1a2830";
      ctx.fillRect(0, 0, vw, vh);
    }
    var gest = (D.input && D.input.camera) || { zoom: 1, rot: 0 };
    var z = gest.zoom || 1, rot = gest.rot || 0;
    var span = (D.gl && D.gl.viewSpan) ? D.gl.viewSpan({ viewW: vw, viewH: vh, zoom: z, rot: rot }) : { w: vw, h: vh };
    ctx.save();
    ctx.translate(Math.round(vw / 2), Math.round(vh / 2));
    if (rot) ctx.rotate(rot);
    if (z !== 1) ctx.scale(z, z);
    ctx.translate(-camX, -camY);
    if (D.world && D.world.drawGround) D.world.drawGround(ctx, camX, camY, span.w, span.h);
    /* Soft arena ring so the field still reads as a brawl space. */
    if (m && m.origin) {
      var size = arenaSize(match || m);
      ctx.save();
      ctx.strokeStyle = "rgba(240, 192, 48, 0.28)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(m.origin.x, m.origin.y, size.w / 2 - 8, size.h / 2 - 8, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    var actors = [], i, pr, f, moving, flash, s, propList;
    if (D.world && D.world.propsInView) {
      propList = D.world.propsInView(camX, camY, span.w, span.h);
      for (i = 0; i < propList.length; i++) {
        (function (prop) {
          actors.push({ y: prop.y, draw: function () {
            if (D.sprites.drawProp) D.sprites.drawProp(ctx, prop.kind, prop.x, prop.y);
            else if (D.sprites.drawDecor) D.sprites.drawDecor(ctx, prop.x, prop.y, prop.kind);
          } });
        })(propList[i]);
      }
    }
    if (m) {
      for (i = 0; i < m.fighters.length; i++) {
        f = m.fighters[i];
        if (!f.fighting && !f.ko) continue;
        (function (ft) {
          actors.push({ y: ft.y, draw: function () {
            var mv = !ft.ko && (Math.abs(ft.vx) + Math.abs(ft.vy) > 18);
            var fl = ft.hurtT > 0 || (ft.revived && m.phase === "revive");
            if (ft.ko) ctx.globalAlpha = 0.55;
            if (D.sprites && D.sprites.drawPartner) {
              D.sprites.drawPartner(ctx, ft.form, ft.x, ft.y, ft.facing, 1, time, fl, false, mv && !ft.ko);
            }
            ctx.globalAlpha = 1;
            drawNameplate(ctx, ft, { x: ft.x, y: ft.y, scale: 1 }, vw);
            if (ft.atkT > 0 && !ft.ko) drawSwipe(ctx, ft, { x: ft.x, y: ft.y, scale: 1 });
          } });
        })(f);
      }
    }
    actors.sort(function (a, b) { return a.y - b.y; });
    for (i = 0; i < actors.length; i++) actors[i].draw();
    if (m) {
      for (i = 0; i < m.floats.length; i++) {
        f = m.floats[i];
        ctx.globalAlpha = Math.max(0, f.life / f.max);
        ctx.fillStyle = f.color;
        ctx.font = "bold 16px Trebuchet MS, sans-serif";
        ctx.textAlign = "center";
        ctx.strokeStyle = "rgba(10,8,20,0.7)";
        ctx.lineWidth = 3;
        ctx.strokeText(f.text, f.x, f.y);
        ctx.fillText(f.text, f.x, f.y);
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
    if (D.sprites && D.sprites.drawVignette) D.sprites.drawVignette(ctx, vw, vh, false, time);
    if (m && m.phase === "fight" && m.localFights) {
      ctx.fillStyle = "rgba(255,255,255,0.72)";
      ctx.font = "12px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      var hint = (D.input && D.input.prompt) ? (D.input.prompt("move", "Move") + "  ·  " + (D.input.lastSource === "touch" ? "It attacks by itself  ·  tap a fighter to go for it, or open ground to move" : "It attacks by itself  ·  click a fighter to go for it, or open ground to move") + extraHint(m)) : ("Move  ·  Confirm / Space / tap Punch to attack" + extraHint(m));
      if (m.soloBonus) hint = "Solo bonus  ·  " + hint;
      ctx.fillText(hint, vw / 2, vh - 14);
    }
    ctx.restore();
  }

  function extraHint(m) {
    var local = m.fighters.filter(function (f) { return f.kind === "local"; })[0];
    if (local && local.mods && local.mods.extraMove) return "  ·  Shift / L to dash";
    return "";
  }

  function drawNameplate(ctx, f, s, vw) {
    var w = 54, h = 5;
    var x = s.x - w / 2, y = s.y + 10;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = "#3a2010";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = f.ko ? "#666" : (f.color || "#f0c020");
    ctx.fillRect(x, y, w * clamp(f.hp / f.maxHp, 0, 1), h);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "11px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText((f.kind === "local" ? "You" : displayName(f)) + (f.ko ? "  KO" : ""), s.x, y - 4);
  }

  function drawSwipe(ctx, f, s) {
    ctx.save();
    ctx.translate(s.x, s.y - 20 * s.scale);
    ctx.scale(f.facing, 1);
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = "#ffe080";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(18 * s.scale, 0, 22 * s.scale, -0.8, 0.8);
    ctx.stroke();
    ctx.restore();
  }

  function confirm() {
    var m = match;
    if (!m || paused) return;
    if (m.phase === "revive") { setPhase(m, "odds"); return; }
    if (m.phase === "odds") {
      if (m.localBets && !m.betLocked) {
        var live = m.fighters.filter(function (f) { return f.fighting; });
        if (!m.betTarget && live[betCursor]) placeBet(m, live[betCursor].id);
        else lockBet(m);
        return;
      }
      skipToFight(m);
      return;
    }
    if (m.phase === "fight" && m.localFights) { queueAttack(); return; }
    if (m.phase === "result") setPhase(m, "payout");
    if (m.phase === "payout") finish(m);
  }

  function back() {
    var m = match;
    if (!m) return;
    if (paused) { togglePause(); return; }
    if (m.phase === "odds" || m.phase === "revive") skipToFight(m);
    else if (m.phase === "result") setPhase(m, "payout");
    else if (m.phase === "payout") finish(m);
    else togglePause();
  }

  function nav(dir) {
    var m = match;
    if (!m || !m.localBets || m.phase !== "odds" || m.betLocked) return;
    var live = m.fighters.filter(function (f) { return f.fighting; });
    if (!live.length) return;
    betCursor = (betCursor + (dir > 0 ? 1 : -1) + live.length) % live.length;
    sfx("ui");
    renderUi(m);
  }

  function togglePause() {
    if (!match || match.phase === "result" || match.phase === "payout") return;
    paused = !paused;
    var auth = host && host.getAuth && host.getAuth();
    if (auth && auth.setLocalPause) auth.setLocalPause(paused);
    renderUi(match);
  }

  function shouldBrawl(run) {
    if (host && host.hasAuth && host.hasAuth()) {
      return !!(run && (run.pendingBrawl || (run.lifecycle && run.lifecycle.pendingBrawl)));
    }
    var c = cfg();
    if (!run) return false;
    if (c.skipEgg) {
      var egg = (host && host.isEggForm && host.isEggForm(run.form)) ||
        (D.SPECIES && D.SPECIES[run.form] && D.SPECIES[run.form].stage === "Egg");
      if (egg) return false;
    }
    var every = Math.max(1, c.everyLevels || 1);
    var min = c.minLevel != null ? c.minLevel : 2;
    if (run.level < min) return false;
    if (run.lastBrawlLevel === run.level) return false;
    if (run.level % every !== 0) return false;
    if (partyCount(run) < 2 && (c.soloMode || "skip") !== "bonus") return false;
    return true;
  }

  function partyCount(run) {
    if (run && run.session && run.session.players) return run.session.players.length;
    var bots = 0;
    if (run && run.cpuBots != null) bots = run.cpuBots;
    else if (cfg().botCount != null) bots = cfg().botCount;
    return 1 + (bots || 0);
  }

  function install(h) { host = h || {}; }

  function get() { return match; }

  function isActive() { return !!match && !match.done; }

  /* Test helpers */
  function forcePhase(phase) {
    if (!match) return;
    if (phase === "fight" && match.phase !== "fight") startFight(match);
    else if (phase === "odds") setPhase(match, "odds");
    else if (phase === "revive") setPhase(match, "revive");
    else if (phase === "result") {
      if (hasAuth()) { pullAuthMatch(match); if (match.winner) setPhase(match, "result"); }
      else if (!match.winner) declareWinner(match, living(match));
      else setPhase(match, "result");
    } else if (phase === "payout") {
      if (hasAuth()) { pullAuthMatch(match); if (match.winner) setPhase(match, "payout"); }
      else {
        if (!match.payout && match.winner) match.payout = settlePayout(match);
        if (!match.winner) declareWinner(match, living(match));
        setPhase(match, "payout");
      }
    }
  }

  D.brawl = {
    install: install,
    begin: begin,
    update: update,
    draw: draw,
    confirm: confirm,
    back: back,
    nav: nav,
    togglePause: togglePause,
    shouldBrawl: shouldBrawl,
    get: get,
    isActive: isActive,
    finish: function () { if (match) finish(match); },
    endQuiet: endQuiet,
    forcePhase: forcePhase,
    queueAttack: queueAttack,
    clickAt: clickAt,
    queueDash: queueDash,
    placeBet: placeBet,
    hideScreen: hideScreen,
    partyCount: partyCount,
    winChances: winChances,
    headlineOdds: headlineOdds,
    displayName: displayName,
    arenaSize: arenaSize,
    spawnRingRadius: spawnRingRadius,
    pickRevive: pickRevive,
    applySurvival: applySurvival,
    settlePayout: function (m) { return m ? settlePayout(m) : null; },
    bettorsOf: bettorsOf
  };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
