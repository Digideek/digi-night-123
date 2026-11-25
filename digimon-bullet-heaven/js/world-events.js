/* Digi Night — rare world events on the screen (17z33). The host's sim decides them (net/event-sim.js);
 * every player sees the same thing here, from the events it sends (game.js passes on wev.*):
 *   wev.warn   a big warning card: what, which way and how far, how long until it starts
 *   wev.start  it's here (the card again, shorter)
 *   wev.state  once a second: where it is, time left, its health. Draws the chip under the warning
 *              spot and the mark on the minimap; a guest who joins halfway picks it up from this.
 *   wev.end    how it went, and what you were paid (everybody is, whatever side they're on)
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});
  var KIND = {
    outbreak: { icon: "☣", color: "#7dff6a", title: "Virus outbreak!",
      warn: "A Patient Zero is spreading a virus {dir}. Everyone, hunt it down together before it gets away. It shows in {t}.",
      go: "Patient Zero is loose {dir}. Its carriers are with it. Beat it before {left} is up!",
      won: "Patient Zero is down and the outbreak is over. Well done, all of you!",
      lost: "Patient Zero got away, and left the virus behind it. Watch out for the infected." },
    surge: { icon: "◈", color: "#c070ff", title: "Dark Area surge!",
      warn: "The Dark Area is breaking through {dir}. A rift opens in {t} and the Glitch will swallow the land round it, fast.",
      go: "The rift is open {dir} and the land is turning to Glitch. Beat the Surge Lord to push it back. {left} left!",
      won: "The Surge Lord is beaten! The Dark Area pulls back and the land goes home: {back} areas handed back.",
      lost: "Too late: the Dark Area keeps the {held} areas it took." },
    rampage: { icon: "✸", color: "#ff7040", title: "A Mega on the rampage!",
      warn: "Something huge is coming {dir}. A Mega on the rampage shows in {t}. Team up and bring it down.",
      go: "The rampaging Mega is here, {dir}. Bring it down before it moves on ({left})!",
      won: "The rampaging Mega is down! What a team.",
      lost: "The Mega moved on. Maybe next time." }
  };
  function $(id) { return document.getElementById(id); }
  function sound(n) { try { if (D.audio && D.audio.sfx) D.audio.sfx(n); } catch (e) {} }
  function clock(t) { t = Math.max(0, Math.floor(t || 0)); var m = Math.floor(t / 60), s = t % 60; return m + ":" + (s < 10 ? "0" : "") + s; }
  function spName(id) { var S = D.SPECIES && D.SPECIES[id], E = D.ENEMIES && D.ENEMIES[id]; return (S && S.name) || (E && E.name) || id || ""; }
  var DIRS = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"];
  var ARROWS = ["→", "↘", "↓", "↙", "←", "↖", "↑", "↗"];
  function where(run, x, y) {
    var dx = x - run.x, dy = y - run.y, d = Math.sqrt(dx * dx + dy * dy), oct = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8, tiles = Math.round(d / 48);
    if (tiles < 8) return { text: "right here", arrow: "●", tiles: tiles };
    return { text: "about " + tiles + " steps " + DIRS[oct], arrow: ARROWS[oct], tiles: tiles };
  }
  function fill(s, o) { return s.replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }); }

  /* ---------- the big card ---------- */
  var card = null, cardT = 0;
  function show(kind, title, text, ms, good) {
    var K = KIND[kind] || KIND.outbreak;
    if (!card) {
      card = document.createElement("div"); card.id = "wev-card"; card.hidden = true;
      card.innerHTML = '<div class="wev-kicker">World event</div><div class="wev-title"><span class="wev-icon"></span><b></b></div><p></p>';
      (document.getElementById("app") || document.body).appendChild(card);
      card.addEventListener("click", function () { card.hidden = true; });
    }
    card.className = good === true ? "is-won" : (good === false ? "is-lost" : "");
    card.style.setProperty("--wev", K.color);
    card.querySelector(".wev-icon").textContent = K.icon;
    card.querySelector("b").textContent = title;
    card.querySelector("p").textContent = text;
    card.hidden = false;
    cardT = Date.now() + (ms || 9000);
  }

  /* ---------- the chip: what, where, time left, health ---------- */
  var chip = null, cur = null, lastHtml = "";
  function paintChip(run) {
    if (!cur || !run) { if (chip) chip.hidden = true; return; }
    var K = KIND[cur.kind] || KIND.outbreak, w = where(run, cur.x, cur.y), left = cur.left, html;
    if (!chip) {
      chip = document.createElement("div"); chip.id = "wev-chip"; chip.hidden = true;
      chip.title = "A world event: everyone in the run can team up on it, whatever side they're on";
      (document.getElementById("app") || document.body).appendChild(chip);
    }
    chip.style.setProperty("--wev", K.color);
    html = '<span class="wev-icon">' + K.icon + '</span><b>' + (cur.name || K.title) + '</b>' +
      '<span class="wev-dir">' + w.arrow + ' ' + w.tiles + '</span>' +
      '<span class="wev-time">' + (cur.phase === "warn" ? "in " : "") + clock(left) + '</span>';
    if (cur.phase === "live") html += '<span class="wev-hp"><span style="width:' + Math.max(0, Math.min(100, cur.hp)) + '%"></span></span>';
    if (html !== lastHtml) { chip.innerHTML = html; lastHtml = html; }
    chip.hidden = false;
  }
  function mark(e) { if (D.minimap && D.minimap.mark) D.minimap.mark("wev", { x: e.x, y: e.y, color: (KIND[e.kind] || KIND.outbreak).color }); }
  function unmark() { if (D.minimap && D.minimap.unmark) D.minimap.unmark("wev"); }

  function myPay(e, run) {
    if (!e.pay || !run) return null;
    return e.pay[run.myId] || e.pay.local || null;
  }

  function onEvent(e, run) {
    if (!run) return;
    var K = KIND[e.kind] || KIND.outbreak, w, pay, txt, st;
    if (e.type === "wev.warn" || e.type === "wev.start" || e.type === "wev.state") {
      cur = { kind: e.kind, name: e.name, x: e.x, y: e.y, left: e.left, phase: e.phase, hp: e.hp, n: e.n, at: Date.now() };
      mark(e);
      w = where(run, e.x, e.y);
      if (e.type === "wev.warn") { show(e.kind, K.title, fill(K.warn, { dir: w.text, t: clock(e.left) }), 11000); sound("rival"); }
      if (e.type === "wev.start") { show(e.kind, K.title, fill(K.go, { dir: w.text, left: clock(e.left) }) + (e.bossType ? " (" + spName(e.bossType) + ")" : ""), 8000); sound("thunder"); }
      paintChip(run);
      return;
    }
    if (e.type === "wev.end") {
      cur = null; unmark(); paintChip(run);
      if (e.why === "gone") return;
      pay = myPay(e, run);
      txt = fill(e.won ? K.won : K.lost, { back: e.back || 0, held: e.held || 0 });
      if (e.won && pay) txt += " You get " + pay.xp + " XP and " + pay.bits + " bits" + (pay.full ? "." : " (half, for not making it there).");
      if (e.won && pay && e.crew > 1) txt += " Crew bonus: " + e.crew + " tamers came, +" + Math.round(100 * Math.min(D.WORLD_EVENTS.together.crewMax, D.WORLD_EVENTS.together.crew * (e.crew - 1))) + "% for everyone.";
      show(e.kind, e.won ? "Victory!" : (e.kind === "outbreak" ? "It got away" : "Time's up"), txt, 10000, !!e.won);
      sound(e.won ? "base" : "dead");
      if (e.won && pay && D.profile) {
        if (D.profile.bump) D.profile.bump("wevWins");
        if (D.profile.award) {
          if (pay.full) { D.profile.award("wev"); D.profile.award(e.kind === "outbreak" ? "wevOutbreak" : (e.kind === "surge" ? "wevSurge" : "wevRampage")); }
          st = D.profile.stats ? D.profile.stats() : {};
          if ((st.wevWins || 0) >= 3) D.profile.award("wevVet");
        }
      }
    }
  }

  /* every frame (game.js): count the clock down between the host's updates, hide the card */
  function tick(dt) {
    var run = D.getRun ? D.getRun() : null, st = D.getState ? D.getState() : "";
    if (card && !card.hidden && Date.now() > cardT) card.hidden = true;
    if (!run || run.ended || st === "title") { if (cur) { cur = null; unmark(); } if (chip) chip.hidden = true; if (card) card.hidden = true; return; }
    if (cur) {
      if (st !== "playing") cur.at = Date.now();
      if (st === "playing") cur.left = Math.max(0, cur.left - dt);
      if (st === "playing" && Date.now() - cur.at > 8000) { cur = null; unmark(); }      /* no word from the host for a while: it's over */
    }
    paintChip(run);
  }

  D.worldEvents = { onEvent: onEvent, tick: tick, KIND: KIND, current: function () { return cur; } };
})(typeof window !== "undefined" ? window : this);
