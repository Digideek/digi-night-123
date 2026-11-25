/* Digi Night — the modes on the screen (17z33). The host's sim runs them (net/story-sim.js,
 * net/siege-sim.js, net/versus-sim.js); every player sees the same thing here from the events it
 * sends (game.js passes on story.*, siege.*, vs.*):
 *
 *   a chip at the top    Story: the goal and how far the party has got. Night Siege: day or night,
 *                        how long till the next, the attackers, the nights held. Versus: the race
 *                        clock and both levels, then the rounds.
 *   a card               Jijimon with each new goal; night falling and dawn coming; the showdown
 *   the countdown        3, 2, 1, FIGHT before each Versus round
 *   the game over        each mode's own lines (gameoverLines, gameoverTitle)
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});
  if (typeof document === "undefined") return;
  function $(id) { return document.getElementById(id); }
  function app() { return $("app") || document.body; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function sound(n) { try { if (D.audio && D.audio.sfx) D.audio.sfx(n); } catch (e) {} }
  function clock(t) { t = Math.max(0, Math.floor(t || 0)); var m = Math.floor(t / 60), s = t % 60; return m + ":" + (s < 10 ? "0" : "") + s; }
  function spName(id) { var S = D.SPECIES && D.SPECIES[id], E = D.ENEMIES && D.ENEMIES[id]; return (S && S.name) || (E && E.name) || id || ""; }
  function mine(run, id) { return id != null && run && (String(id) === String(run.myId) || (run.myId == null && id === "local")); }
  function nameOf(run, id) {
    if (mine(run, id)) return "You";
    var n = D.online && D.online.playerName ? D.online.playerName(id) : null;
    return n || "Your opponent";
  }
  var COL = { story: "#7cf0c0", siege: "#9a8cff", night: "#9a8cff", day: "#ffd23a", versus: "#ff6a5a", duel: "#ff6a5a" };

  /* ---------- state, per run ---------- */
  var st = null, runRef = null;
  function S(run) { if (run !== runRef) { runRef = run; st = { story: null, siege: null, vs: null, toastT: 0, countT: 0, cardT: 0 }; hideAll(); } return st; }

  /* ---------- the card ---------- */
  var card = null, face = null, faceT = 0;
  function show(kind, kicker, title, text, ms, who) {
    if (!card) {
      card = document.createElement("div"); card.id = "mode-card"; card.hidden = true;
      card.innerHTML = '<canvas class="mc-face" width="96" height="96"></canvas><div class="mc-body"><div class="mc-kicker"></div><div class="mc-title"></div><p></p><small class="mc-tap">Tap to close</small></div>';
      app().appendChild(card);
      card.addEventListener("click", function () { card.hidden = true; });
      face = card.querySelector(".mc-face");
    }
    card.style.setProperty("--mc", COL[kind] || "#ffd23a");
    card.className = who ? "has-face" : "";
    card.dataset.who = who || "";
    card.querySelector(".mc-kicker").textContent = kicker || "";
    card.querySelector(".mc-title").textContent = title || "";
    card.querySelector("p").textContent = text || "";
    card.hidden = false;
    st.cardT = Date.now() + (ms || 8000);
    if (who && D.sprites && D.sprites.preloadSpecies) try { D.sprites.preloadSpecies(who, true); } catch (e) {}
  }
  function paintFace(dt) {
    if (!card || card.hidden || !card.dataset.who || !face) return;
    faceT += dt;
    var c = face.getContext("2d"), Sp = D.sprites, h;
    c.imageSmoothingEnabled = false; c.clearRect(0, 0, 96, 96);
    if (!Sp || !Sp.drawPartner) return;
    h = (Sp.visualHeight && Sp.visualHeight(card.dataset.who)) || 60;
    c.save(); c.translate(48, 90); var k = Math.min(1.6, 78 / h); c.scale(k, k);
    try { Sp.drawPartner(c, card.dataset.who, 0, 0, 1, 1, faceT, false, false, false); } catch (e) {}
    c.restore();
  }

  /* ---------- the chip ---------- */
  var chip = null, lastHtml = "";
  function chipHtml(html, kind) {
    if (!chip) {
      chip = document.createElement("div"); chip.id = "mode-chip"; chip.hidden = true; app().appendChild(chip);
      /* Story: click the goal chip to hear Jijimon's words for it again */
      chip.addEventListener("click", function () { var s = st.story; if (s && !s.done && s.say) show("story", s.kick, s.goal, s.say, 11000, "jijimon"); });
    }
    chip.style.setProperty("--mc", COL[kind] || "#ffd23a");
    chip.classList.toggle("is-click", kind === "story");
    if (html !== lastHtml) { chip.innerHTML = html; lastHtml = html; }
    chip.hidden = !html;
    document.body.classList.toggle("has-mode-chip", !!html);
  }

  /* ---------- a short line ---------- */
  var toastEl = null;
  function toast(text, kind, sec) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.id = "mode-toast"; toastEl.hidden = true; app().appendChild(toastEl); }
    toastEl.style.setProperty("--mc", COL[kind] || "#ffd23a");
    toastEl.textContent = text; toastEl.hidden = false;
    st.toastT = Date.now() + (sec || 3.5) * 1000;
  }

  /* ---------- the Versus countdown ---------- */
  var big = null;
  function bigText(text, color) {
    if (!big) { big = document.createElement("div"); big.id = "mode-big"; big.hidden = true; app().appendChild(big); }
    big.style.color = color || "#ffd23a";
    big.textContent = text; big.hidden = !text;
    if (text) { big.classList.remove("is-pop"); void big.offsetWidth; big.classList.add("is-pop"); }
  }

  function hideAll() {
    if (card) card.hidden = true; if (toastEl) toastEl.hidden = true; if (big) big.hidden = true;
    chipHtml("", null);
    if (D.minimap && D.minimap.unmark) { D.minimap.unmark("vs"); D.minimap.unmark("siege"); }
  }

  /* ---------- Story ---------- */
  function storyChip(s) {
    var h = '<span class="mc-ico" title="Click to hear Jijimon again">★</span><b>' + (s.n + 1) + '/' + s.of + '</b><span class="mc-goal">' + esc(s.goal) + '</span>';
    if (s.need > 1 || s.who && s.who.length > 1) h += '<span class="mc-prog">' + (s.party ? s.have + ' / ' + s.need : s.have + ' of ' + s.need + ' done') + '</span>';
    return h;
  }
  function onStory(e, run) {
    var s = st.story = st.story || {};
    if (e.type === "story.step") {
      s.n = e.n; s.of = e.of; s.goal = e.goal; s.id = e.id; s.have = 0; s.need = 1; s.who = null; s.party = false;
      s.say = e.say; s.kick = (e.sec ? "Lesson " : "Goal ") + (e.n + 1) + " of " + e.of;
      show("story", (e.sec ? "Lesson " : "Goal ") + (e.n + 1) + " of " + e.of, e.goal, e.say, e.sec ? e.sec * 1000 - 400 : (e.n === 0 ? 12000 : 11000), "jijimon");
      if (e.n > 0) sound("base");
    } else if (e.type === "story.state") {
      s.n = e.n; s.of = e.of; s.goal = e.goal; s.id = e.id; s.have = e.have; s.need = e.need; s.who = e.who; s.party = e.party;
      /* a goal everyone has to do: say so when you're done and waiting on the others */
      var me = (e.who || []).filter(function (w) { return mine(run, w.id); })[0];
      s.waiting = !!(me && me.ok && e.have < e.need);
    } else if (e.type === "story.clear") {
      toast("✓ Goal done: " + e.goal, "story", 3);
      sound("ui");
    } else if (e.type === "story.done") {
      s.done = true;
      show("story", "Story complete", "You did it!", e.say, 14000, "jijimon");
      sound("rival");
    }
    paintStory();
  }
  function paintStory() {
    var s = st.story;
    if (!s || s.done) { chipHtml("", null); return; }
    chipHtml(storyChip(s) + (s.waiting ? '<span class="mc-wait">waiting on your team</span>' : ""), "story");
  }
  /* Tokomon waits to ask about the turf war until that's the goal (turf.js) */
  /* Tokomon's "pick a side" question: only in Story (once its side goal comes up) and Survival. Versus is a
   * 10-minute race and Night Siege is about holding out, so he never asks there. */
  var NO_TURF = { versus: 1, duel: 1, siege: 1 };
  function holdTurf(run) {
    if (run && NO_TURF[run.mode]) return true;
    if (!run || run.mode !== "story") return false;
    var s = S(run).story, order = D.STORY_STEPS || [], side = -1, i;
    for (i = 0; i < order.length; i++) if (order[i].id === "side") side = i;
    return !(s && (s.done || (s.n != null && s.n >= side)));
  }

  /* ---------- Night Siege ---------- */
  /* Night Siege's special nights (data.js SIEGE.nights): a name and a word-mark each, never colour alone */
  var NIGHT_KIND = {
    swarm: { name: "Swarm night", tag: "SWARM", line: "A swarm: far more of them, smaller and faster. Fences and moves that hit a crowd help." },
    flyer: { name: "Flyer night", tag: "FLYERS", line: "Flyers: they come over rivers and cliffs, and fly right over your fences. Stay near the eggs." },
    giant: { name: "Giant night", tag: "GIANT", line: "A giant: one huge boss comes in early with a few guards. Build fences in its way and hit it hard." },
    raider: { name: "Raider night", tag: "RAIDERS", line: "Raiders: nearly all of them ignore you and go straight for the eggs. Chase them down." }
  };
  function onSiege(e, run) {
    var g = st.siege = st.siege || { survived: 0 };
    if (e.type === "siege.state") { g.day = e.day; g.night = e.night; g.toNight = e.toNight; g.toDawn = e.toDawn; g.attackers = e.attackers; g.survived = e.survived; g.standing = e.standing; g.of = e.of; g.eggs = e.eggs; g.eggsOf = e.eggsOf; g.kind = e.kind; g.tally = e.tally || g.tally; g.wood = e.wood ? (e.wood[run && run.myId] || e.wood.local || 0) : 0; g.fences = e.fences || 0; g.at = Date.now(); }
    else if (e.type === "siege.warn") { show("night", "Night " + e.night, NIGHT_KIND[e.kind] ? NIGHT_KIND[e.kind].name + " is coming" : "Night is coming", (NIGHT_KIND[e.kind] ? NIGHT_KIND[e.kind].line + " " : "") + "In " + e.inSec + " seconds the wild Digimon come for the Digi-eggs at the nest, wave after wave, till dawn. Get back to the nest, heal up and eat. The arrow points the way.", 7000); sound("rival"); }
    else if (e.type === "siege.night") {
      show("night", "Night " + e.night, NIGHT_KIND[e.kind] ? NIGHT_KIND[e.kind].name + "!" : "Here they come!", (NIGHT_KIND[e.kind] ? NIGHT_KIND[e.kind].line + " " : "") + "Guard the eggs till dawn: they go for the nest unless you're near them, then they turn on you." + (D.SIEGE && D.SIEGE.nest && e.night >= D.SIEGE.nest.raidFrom ? " Watch for raiders (a cracked egg over them): they ignore you and go straight for the eggs." : "") + (e.boss ? " Something big is coming with them tonight." : "") + " Lose every egg, or your partner, and it's over.", 7500);
      bigText("NIGHT " + e.night + (NIGHT_KIND[e.kind] ? " · " + NIGHT_KIND[e.kind].tag : ""), "#c8b8ff"); st.countT = 1.6; sound("thunder");
    }
    else if (e.type === "siege.eggLost") { toast(e.left ? "An egg was smashed! " + e.left + " of " + e.of + " left." : "The last egg is gone...", "night", 4); sound("crit"); }
    else if (e.type === "siege.nestLost") { g.nestLost = true; if (e.tally) g.tally = e.tally; }
    else if (e.type === "siege.hatch") { show("day", "Primary Village", "An egg hatched!", spName(e.form) + " made it through " + ((D.SIEGE && D.SIEGE.nest && D.SIEGE.nest.hatchAfter) || 3) + " nights and hatched. It fights at your side now, and a new egg takes its place in the nest.", 6500); sound("pop"); }
    else if (e.type === "siege.repair") { toast("Egg rebuilt (" + e.cost + " coins). " + e.left + " of " + e.of + " in the nest.", "day", 3); sound("pop"); }
    else if (e.type === "siege.build") { if (e.id === (run && run.myId) || (e.id === "local" && !(run && run.myId))) toast("Fence up (" + e.wood + " wood, " + e.coins + " coins). " + e.woodLeft + " wood left.", "day", 2.5); sound("pop"); }
    else if (e.type === "siege.fenceDown") { if (!g.fenceT || Date.now() - g.fenceT > 5000) { g.fenceT = Date.now(); toast("A fence was broken!", "night", 2.5); } sound("crit"); }
    else if (e.type === "siege.egg") { if (!g.eggHitT || Date.now() - g.eggHitT > 6000) { g.eggHitT = Date.now(); toast("They're at the eggs!", "night", 2.5); } }
    else if (e.type === "siege.giant") { toast("The giant is here: " + spName(e.enemyType) + "!", "night", 4.5); if (D.minimap && D.minimap.mark) D.minimap.mark("siege", { x: e.x, y: e.y, color: "#ff5a6a" }); sound("rival"); }
    else if (e.type === "siege.boss") { toast("A boss has joined the attack: " + spName(e.enemyType) + "!", "night", 4); if (D.minimap && D.minimap.mark) D.minimap.mark("siege", { x: e.x, y: e.y, color: "#ff5a6a" }); sound("rival"); }
    else if (e.type === "siege.dawn") {
      var pay = (e.pay && (e.pay[run.myId] || e.pay.local)) || null;
      g.survived = e.night;
      show("day", "Dawn", "You made it through night " + e.night + "!", (e.fled ? e.fled + " attackers ran off. " : "") + (e.stay && e.stay.length ? spName(e.stay[0]) + (e.stay.length > 1 ? " and " + (e.stay.length - 1) + " more boss" + (e.stay.length > 2 ? "es" : "") : "") + " didn't: a boss stays till you beat it, and it's still after the eggs. " : "") + (pay ? "Everyone standing gets paid: +" + pay.xp + " XP and " + pay.bits + " bits. " : "") + "Level up while it's light: the next night is harder.", 7500);
      bigText("DAWN", "#ffd23a"); st.countT = 1.6; sound("base");
      if (D.minimap && D.minimap.unmark) D.minimap.unmark("siege");
    }
    paintSiege();
  }
  function paintSiege() {
    var g = st.siege, h, el;
    if (!g || g.day == null) { chipHtml("", null); return; }
    el = g.at ? (Date.now() - g.at) / 1000 : 0;
    if (g.night) h = '<span class="mc-ico">☾</span><b>Night ' + g.day + '</b><span class="mc-time">dawn in ' + clock(g.toDawn - el) + '</span><span class="mc-prog">' + g.attackers + ' attacking</span>';
    else h = '<span class="mc-ico">☀</span><b>Day ' + g.day + '</b><span class="mc-time">night in ' + clock(g.toNight - el) + '</span>';
    if (NIGHT_KIND[g.kind]) h += '<span class="mc-prog">' + (g.night ? "" : "tonight: ") + NIGHT_KIND[g.kind].tag + '</span>';
    h += '<span class="mc-held">' + g.survived + ' night' + (g.survived === 1 ? "" : "s") + ' held</span>';
    if (g.of > 1) h += '<span class="mc-prog">' + g.standing + '/' + g.of + ' standing</span>';
    if (g.eggsOf) h += '<span class="mc-prog">eggs ' + g.eggs + '/' + g.eggsOf + '</span>';
    if (g.eggsOf) h += '<span class="mc-prog">wood ' + (g.wood || 0) + (g.fences ? ' · fence ' + g.fences : '') + '</span>';
    chipHtml(h, g.night ? "night" : "day");
  }

  /* ---------- Versus ---------- */
  function onVs(e, run) {
    var v = st.vs = st.vs || { wins: {} };
    if (e.type === "vs.start" && e.duel) { show("versus", "Duel", "Fight!", "Your Hatchery Digimon as it is, bloodline and all, straight into the arena. Nothing is levelled and nothing is lost: it's just as it was when this is over. First to two rounds wins." + ((e.players || []).length >= 3 ? " Tap or click a rival's partner to go after it; until you do, yours goes for the strongest." : ""), 7000); sound("rival"); }
    else if (e.type === "duel.ready") { if (mine(run, e.id) && e.fallback) toast("Nothing hatched in your Hatchery yet, so you fight as Agumon (Lv " + e.level + "). Hatch an egg to bring your own.", "versus", 5); }
    else if (e.type === "vs.start") { show("versus", "Versus", "Race to Mega!", "You have " + Math.round(e.race / 60) + " minutes. Fill your DIGIVOLVE meter (top of the screen): kills fill it a little, the middle a lot. The caches drop orange DIGIVOLVE orbs, and a mini boss pays everyone by how much damage they did to it, so hit it where it's weak. A full meter and enough levels and you digivolve on the spot, all the way to Mega. Then you fight it out: best of three.", 12000); sound("rival"); }
    else if (e.type === "vs.evo") { if (mine(run, e.id)) { bigText(e.mega ? "MEGA!" : "DIGIVOLVED!", "#ffb040"); st.countT = 1.4; toast(spName(e.from) + " digivolved into " + spName(e.to) + "!", "versus", 3.5); } else toast(nameOf(run, e.id) + "'s partner digivolved into " + spName(e.to) + (e.mega ? ": a Mega!" : "."), "versus", 3.5); sound("base"); }
    else if (e.type === "vs.bossDown") { var myS = null, kk; for (kk in (e.shares || {})) if (mine(run, kk)) myS = e.shares[kk]; toast("Mini boss down! " + (myS != null ? "Your damage earned +" + Math.round(myS) + " DIGIVOLVE." : "You didn't hit it, so you got none of it."), "versus", 4); }
    else if (e.type === "vs.state") { v.phase = e.phase; v.left = e.left; v.round = e.round; v.players = e.players; v.at = Date.now(); }
    else if (e.type === "vs.cache") { toast("A cache of experience just dropped in the middle!", "versus", 3.5); if (D.minimap && D.minimap.mark) D.minimap.mark("vs", { x: e.x, y: e.y, color: "#7cf0c0" }); v.markT = Date.now() + 15000; }
    else if (e.type === "vs.boss") { toast("A mini boss is in the middle: " + spName(e.enemyType) + ". Beat it for a big boost!", "versus", 4.5); if (D.minimap && D.minimap.mark) D.minimap.mark("vs", { x: e.x, y: e.y, color: "#ff5a6a" }); v.markT = Date.now() + 40000; sound("rival"); }
    else if (e.type === "vs.down") { if (mine(run, e.id)) toast("Your partner fell. It's back at your side of the map: keep going!", "versus", 4); }
    else if (e.type === "vs.showdown" && run.mode === "duel") { if (D.minimap && D.minimap.unmark) D.minimap.unmark("vs"); }
    else if (e.type === "vs.showdown") { show("versus", "Time's up", "Showdown!", "Into the arena! Your partners fight; tamers can't be hurt. First to two rounds wins." + ((e.players || []).length >= 3 ? " It's every partner for themselves: tap or click a rival's partner to send yours after it. Until you do, it goes for the strongest one standing, so gang up on the leader." : ""), (e.players || []).length >= 3 ? 8000 : 5000); if (D.minimap && D.minimap.unmark) D.minimap.unmark("vs"); sound("thunder"); }
    else if (e.type === "vs.round") { v.wins = e.wins || {}; v.round = e.round; v.count = e.countdown; st.countT = 0.01; v.countAt = Date.now(); if (card) card.hidden = true; }
    else if (e.type === "vs.ko") { bigText(mine(run, e.winner) ? "KNOCKOUT!" : "KNOCKED OUT", mine(run, e.winner) ? "#ffd23a" : "#ff6a5a"); st.countT = 1.4; }
    else if (e.type === "vs.time") { toast("Time! The partner with the most health left takes round " + e.round + ".", "versus", 3); }
    else if (e.type === "vs.roundEnd") { v.wins = e.wins || {}; toast(e.winner == null ? "Round " + e.round + ": a draw" : "Round " + e.round + " to " + (mine(run, e.winner) ? "you!" : nameOf(run, e.winner)), "versus", 3); }
    else if (e.type === "vs.end") {
      v.done = true; v.winner = e.winner; v.wins = e.wins || {};
      var won = mine(run, e.winner), score = scoreLine(run, e.wins, e.players);
      show("versus", "Match over · " + score, won ? "You win!" : nameOf(run, e.winner) + " wins", won ? "What a fight. Your partner is the strongest out there, for now." : "So close! Race harder next time: the caches and mini bosses in the middle make all the difference.", 7000);
      bigText(won ? "YOU WIN!" : "YOU LOSE", won ? "#ffd23a" : "#ff6a5a"); st.countT = 3; sound(won ? "base" : "rival");
    }
    paintVs(run);
  }
  function scoreLine(run, wins, players) {
    var me = 0, them = 0, k;
    for (k in (wins || {})) { if (mine(run, k)) me = wins[k]; else them = Math.max(them, wins[k]); }
    return me + "–" + them;
  }
  /* the DIGIVOLVE meter: a bar with its number, and what it's waiting on in words (not colour alone) */
  function meterHtml(p) {
    var M = (D.VERSUS && D.VERSUS.meter) || 100, m = Math.max(0, Math.min(M, p.meter || 0)), pc = Math.round(100 * m / M), note;
    if (p.top) return '<span class="mc-prog">MEGA</span>';
    note = m >= M ? (p.level < p.need ? "full · needs Lv " + p.need : "full") : pc + "%";
    return '<span class="mc-meter" title="DIGIVOLVE meter"><small>DIGIVOLVE</small><i><u style="width:' + pc + '%"></u></i><em>' + note + '</em></span>';
  }
  function paintVs(run) {
    var v = st.vs, h = "", el, i, p, me = null, foe = null;
    if (!v || !v.phase) { chipHtml("", null); return; }
    for (i = 0; i < (v.players || []).length; i++) { p = v.players[i]; if (mine(run, p.id)) me = p; else if (!foe || p.level > foe.level) foe = p; }
    el = v.at ? (Date.now() - v.at) / 1000 : 0;
    if (v.phase === "race") {
      h = '<span class="mc-ico">⚔</span><b>' + clock(v.left - el) + '</b>';
      if (me) h += '<span class="mc-me">You Lv ' + me.level + ' ' + esc(spName(me.form)) + '</span>' + meterHtml(me);
      if (foe) h += '<span class="mc-vs">vs</span><span class="mc-foe">' + esc(nameOf(run, foe.id)) + ' Lv ' + foe.level + ' ' + esc(spName(foe.form)) + ' · ' + (foe.top ? "Mega" : (foe.meter || 0) + "%") + '</span>';
    } else {
      h = '<span class="mc-ico">⚔</span><b>' + (v.phase === "done" ? "Final" : "Round " + Math.max(1, v.round)) + '</b><span class="mc-me">You ' + ((me && v.wins[me.id]) || 0) + '</span><span class="mc-vs">–</span><span class="mc-foe">' + ((foe && v.wins[foe.id]) || 0) + ' ' + esc(foe ? nameOf(run, foe.id) : "") + '</span>';
      if (v.phase === "showdown" && v.left > 0) h += '<span class="mc-time">' + clock(v.left - el) + '</span>';
      if (v.phase === "showdown" && me && me.aim) h += '<span class="mc-prog">after ' + esc(nameOf(run, me.aim)) + (me.pick ? " (your pick)" : " (strongest)") + '</span>';
    }
    chipHtml(h, "versus");
  }

  /* ---------- in and out ---------- */
  function onEvent(e, run) {
    if (!run) return;
    S(run);
    if (e.type.indexOf("story.") === 0) onStory(e, run);
    else if (e.type.indexOf("siege.") === 0) onSiege(e, run);
    else if (e.type.indexOf("vs.") === 0) onVs(e, run);
  }
  var acc = 0, hidden = false;
  function tick(dt) {
    var run = D.getRun ? D.getRun() : null, state = D.getState ? D.getState() : "", v;
    if (!run || run.ended || (state !== "playing" && state !== "paused")) { if (!hidden) { hidden = true; hideAll(); } return; }
    hidden = false;
    S(run);
    if (card && !card.hidden && Date.now() > st.cardT) card.hidden = true;
    if (toastEl && !toastEl.hidden && Date.now() > st.toastT) toastEl.hidden = true;
    paintFace(dt);
    /* the Versus countdown: 3, 2, 1, FIGHT */
    v = st.vs;
    if (v && v.countAt) {
      var left = v.count - (Date.now() - v.countAt) / 1000;
      if (left > 0) { var n = Math.ceil(left); if (n !== v.shown) { v.shown = n; bigText(String(n), "#ffffff"); sound("ui"); } }
      else { v.countAt = 0; v.shown = 0; bigText("FIGHT!", "#ff6a5a"); st.countT = 0.9; sound("thunder"); }
    } else if (st.countT > 0) { st.countT -= dt; if (st.countT <= 0 && big) big.hidden = true; }
    if (v && v.markT && Date.now() > v.markT) { v.markT = 0; if (D.minimap && D.minimap.unmark) D.minimap.unmark("vs"); }
    acc += dt;
    if (acc < 0.25) return;
    acc = 0;
    if (run.mode === "siege") paintSiege(); else if (run.mode === "versus" || run.mode === "duel") paintVs(run); else if (run.mode === "story") paintStory();
  }

  /* ---------- the game over screen ---------- */
  function gameoverLines(lines, rec, run) {
    var s = st && runRef === run ? st : null;
    if (run.mode === "siege") {
      /* the end screen (17z33): how the nest did, after the nights held */
      var T = (s && s.siege && s.siege.tally) || {}, sl = [["Nights survived", String(Math.max(rec.nights || 0, (s && s.siege && s.siege.survived) || 0))],
        ["Eggs hatched", String(T.hatched || 0)], ["Eggs smashed", String(T.lost || 0) + (T.rebuilt ? " (" + T.rebuilt + " rebuilt)" : "")],
        ["Fences built", String(T.built || 0) + (T.broken ? " (" + T.broken + " broken)" : "")], ["Wood gathered", String(T.wood || 0)]];
      if (T.bosses || T.giants) sl.push(["Bosses beaten", String(T.bosses || 0) + (T.giants ? " + " + T.giants + " giant" + (T.giants === 1 ? "" : "s") : "")]);
      Array.prototype.splice.apply(lines, [1, 0].concat(sl));
    }
    if (run.mode === "story" && s && s.story) lines.splice(1, 0, ["Story", s.story.done ? "Complete!" : "Goal " + ((s.story.n || 0) + 1) + " of " + (s.story.of || (D.STORY_STEPS || []).length) + ": " + s.story.goal]);
    if ((run.mode === "versus" || run.mode === "duel") && s && s.vs && s.vs.done) lines.splice(1, 0, [run.mode === "duel" ? "Duel" : "Versus", (mine(run, s.vs.winner) ? "You won " : nameOf(run, s.vs.winner) + " won ") + scoreLine(run, s.vs.wins)]);
  }
  function gameoverTitle(el, run) {
    var s = st && runRef === run ? st : null;
    if ((run.mode === "versus" || run.mode === "duel") && s && s.vs && s.vs.done) { el.goTitle.textContent = mine(run, s.vs.winner) ? "YOU WIN!" : "YOU LOSE"; el.goSub.textContent = (run.mode === "duel" ? "Duel, " : "Versus, ") + scoreLine(run, s.vs.wins) + "." + (run.mode === "duel" ? " Your Hatchery Digimon is just as it was." : ""); }
    else if (run.mode === "siege") {
      var n = Math.max((s && s.siege && s.siege.survived) || 0, 0);
      if (s && s.siege && s.siege.nestLost) el.goTitle.textContent = "THE EGGS ARE GONE";
      el.goSub.textContent = (s && s.siege && s.siege.nestLost ? "The nest fell. " : "") + D.SPECIES[run.form].name + " held out for " + n + " night" + (n === 1 ? "" : "s") + ".";
    }
    else if (run.mode === "story" && s && s.story && s.story.done) el.goTitle.textContent = "STORY COMPLETE";
    hideAll();
  }

  /* the siege clock as the HUD knows it (game.js points to the nest at dusk and at night) */
  function siegeState() {
    var g = st && st.siege, el;
    if (!g || g.day == null) return null;
    el = g.at ? (Date.now() - g.at) / 1000 : 0;
    return { night: !!g.night, toNight: g.night ? 0 : Math.max(0, (g.toNight || 0) - el), eggs: g.eggs, eggsOf: g.eggsOf };
  }
  /* Versus showdown with three or more: who my partner is after (versus-sim.js _vsAim), and whether I picked it */
  function vsAim() {
    var v = st.vs, i, p, run = D.getRun ? D.getRun() : null;
    if (!v || v.phase !== "showdown" || !v.players || !run) return null;
    for (i = 0; i < v.players.length; i++) { p = v.players[i]; if (mine(run, p.id) && p.aim) return { id: p.aim, pick: !!p.pick }; }
    return null;
  }
  D.modesUi = { onEvent: onEvent, tick: tick, holdTurf: holdTurf, gameoverLines: gameoverLines, gameoverTitle: gameoverTitle, siegeState: siegeState, vsAim: vsAim,
    /* this run's mode state (siege nights, story progress), for the end of the run (game.js: bloodlines) */
    state: function (run) { return st && runRef === run ? st : null; } };
})(typeof window !== "undefined" ? window : this);
