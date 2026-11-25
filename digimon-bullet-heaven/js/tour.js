/* Digi Night — the first-time tour (Nov 21).
 *
 * Jijimon walks a new player through the game, once:
 *   1. welcome      a few cards on what makes Digi Night different (open world, the turf wars
 *                   as the heart of it, pick a side or just survive, nemeses, respawning)
 *   2. the front page  everything dims but one button at a time, with a speech bubble on it:
 *                   the four modes, the Hatchery, Eggs, Discoveries, Join a friend, DigiCoins and what
 *                   they buy (the Lab), Items, the DigiBank, the Cabinet, Badges, the League, How to Play
 *   3. before the first run  the run setup screen the same way (projection, egg, rules, who is
 *                   coming, what you bring, Just play / Invite friends), then how to play: moving, your
 *                   partner, food and the farm, the two levels (job: skills, K; base: stats, T),
 *                   digivolving, warp and ultimates
 * (17z33: brought up to date: no Online tile, the four modes, three Hatchery slots, bloodlines and
 *  expeditions, endless Night Siege, Duel, a board for every mode, job and base levels.)
 * Skip ends it at any point; "Replay the tour" on the How to Play screen starts it again.
 * Done flags live in localStorage (dbh_tour_hub, dbh_tour_setup).
 *
 *   D.tour.start("hub" | "setup", force)   D.tour.reset()   D.tour.active()
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});
  function $(id) { return document.getElementById(id); }
  function store(k, v) { try { if (v === undefined) return global.localStorage.getItem(k); if (v === null) global.localStorage.removeItem(k); else global.localStorage.setItem(k, v); } catch (e) {} return null; }

  /* ---------- the scripts ---------- */
  var HUB = [
    { title: "Welcome to the Digital World!", text: "I'm Jijimon. I've watched a great many tamers come through here, so let me show you around before you set out. It won't take a minute." },
    { title: "One big, living world", text: "There are no waves here. Each run is an open world that keeps going: forests, deserts, snowfields, swamps, volcanoes, the Circuit and the Glitch. Rivers freeze in winter, trees fall, and wild Digimon live in nests and roam in herds." },
    { title: "The heart of it: turf wars", text: "The Digital World is split between biomes, and they're at war. Every border is a front line. Each side's Digimon fight for the land, and the lines really move: winners spread, losers shrink. Every run, the map starts fresh." },
    { title: "Pick a side... or don't", text: "Back a biome and help it take over: hunt its enemies at the front and bring down rival lords. Its Digimon will start to trust you, then fight beside you. Help your side swallow the map and the war is yours. Or ignore the war, head off in any direction, and see how long you can survive." },
    { title: "Mind who beats you", text: "If a wild Digimon beats your partner, it remembers. It grows stronger, digivolves, and wears your name as its title: your Nemesis. The more it wins, the worse it gets, with no ceiling. Beat it for a big reward." },
    { title: "Falling isn't the end", text: "In Story and Survival's Open World, a partner that falls hatches again from its egg near the start, where the land is gentle. You keep your tamer, your base level and your stat points, and climb back with bonus XP." },
    { el: "hub-modes", title: "Four ways to play", text: "Story: I'll walk you through everything, one goal at a time. Survival: everything on, last as long as you can. Night Siege: grow by day, then guard the Digi-eggs from waves every night, building fences with wood. It never ends: how many nights can you hold? Versus: race a real player to Mega, then fight. Or Duel straight away with your Hatchery Digimon. New here? Start with Story!" },
    { el: "hub-hatch", title: "The Hatchery", text: "Every Digimon you beat pays a piece of data. Feed it to an egg here to hatch and raise a Digimon between runs. Raise one to Rookie and its whole egg line opens up for good. There are three slots, each its own family. Take one into a run: reach Mega and its bloodline earns traits its children keep, but fall too young and the line suffers. The ones at home go on expeditions while you play." },
    { el: "hub-eggs", title: "Eggs", text: "Every egg line in the game, opened or not. Each one grows into different Digimon, all the way to Mega." },
    { el: "hub-disc", title: "Discoveries", text: "Your field guide: every Digimon you've met, fought or raised. Can you fill it?" },
    { el: "hub-join", title: "Playing with friends", text: "Pick any mode and choose Invite friends to send them a link. You explore the same world together, and you can even battle each other. Got an invite yourself? Tap Join a friend up here." },
    { el: "hub-bits", title: "DigiCoins", text: "DigiCoins are the money you keep between runs. Every run pays some, and more come from ranking up as a tamer and from League seasons. Spend them in the Lab, and on new looks for your farm and Digivice." },
    { el: "hub-lab", title: "The Lab", text: "Spend DigiCoins on permanent upgrades: more health, more power, a better Digivice. They help every run after you buy them." },
    { el: "hub-items", title: "Items", text: "Crest Pieces, Charms and one-run items you've found. Bosses, biome lords and beaten rivals drop them. Equip them here before a run." },
    { el: "hub-bank", title: "The DigiBank", text: "Partners that reached Champion or beyond leave a memory here, and Digimon you capture are kept here too. A memory gives the next egg of that line a head start." },
    { el: "hub-cabinet", title: "The Cabinet", text: "Your trophies and titles. Tamer ranks and big moments unlock titles to show off." },
    { el: "hub-badges", title: "Badges", text: "Over a hundred badges for everything from your first digivolution to beating a Mega. How many can you collect?" },
    { el: "hub-league", title: "The League", text: "A board for every mode: Survival (with Ranked and the Weekly Map), Story, Night Siege and Versus, plus your Duel record and faction seasons, where you back a biome for the week. Log in on the online server to take part." },
    { el: "hub-help", title: "How to Play", text: "All the details live here, and so does this tour if you ever want it again. Now press Play. I'll show you the setup screen too." }
  ];
  var SETUP = [
    { el: "setup-tamer", title: "Your projection", text: "This is you in the Digital World, a hologram. Pick any colour you like." },
    { el: "setup-egg", title: "Your Digi Egg", text: "Your partner hatches from this egg a few seconds into the run. Different eggs grow into different Digimon. Open more lines in the Hatchery." },
    { el: "setup-modes", title: "The rules", text: "In Survival you pick the rules here. Open World lets you respawn. One Life is just that. Ranked and the Weekly Map are one-life runs scored for the League. Other modes just show their name." },
    { el: "setup-party", title: "Who's coming", text: "Go alone, or bring CPU partners to fight beside you." },
    { el: "setup-gear", title: "What you bring", text: "A Crest Piece, a Charm and your one-run items. Bosses, biome lords and beaten rivals drop them. Locked slots open in the Lab. Tap here to change what you bring." },
    { el: "btn-setup-invite", title: "With friends", text: "Want friends along? Press Invite friends instead of Just play: you get a link to send them, and everyone meets in the lobby." },
    { title: "How to play", text: {
        keyboard: "Move with WASD or the arrow keys. Your partner fights on its own. Click a Digimon to send it after that one. Pick up the teal gems for XP.",
        touch: "Put your left thumb anywhere low on the left side and a stick appears under it: slide to walk. Your partner fights on its own. Tap a Digimon to send it after that one. Pick up the teal gems for XP.",
        gamepad: "Walk with the left stick. Your partner fights on its own. Point the right stick at a Digimon and pull RT to send it after that one. Pick up the teal gems for XP." } },
    { title: "Keep your partner happy", text: {
        keyboard: "Food drops go in your bag. Your partner eats at the farm: walk to the glowing Digi-gate in the middle of the start (or one at a nest your side has taken) and press E. Feed it, play with it and train it there. A well-fed, happy partner digivolves down the best routes. A neglected one... doesn't.",
        touch: "Food drops go in your bag. Your partner eats at the farm: walk to the glowing Digi-gate in the middle of the start (or one at a nest your side has taken) and tap Act. Feed it, play with it and train it there. A well-fed, happy partner digivolves down the best routes. A neglected one... doesn't.",
        gamepad: "Food drops go in your bag. Your partner eats at the farm: walk to the glowing Digi-gate in the middle of the start (or one at a nest your side has taken) and press Y. Feed it, play with it and train it there. A well-fed, happy partner digivolves down the best routes. A neglected one... doesn't." } },
    { title: "Two kinds of level", text: {
        keyboard: "Your partner has a job level: each one gives a skill point. Press K to spend it on new moves or stronger ones. You, the tamer, have a base level: it gives stat points. Press T to raise STR, AGI, VIT, INT, DEX or LUK. A badge on each chip says when you have points.",
        touch: "Your partner has a job level: each one gives a skill point. Tap the Job Lv chip to spend it on new moves or stronger ones. You, the tamer, have a base level: it gives stat points. Tap the Base Lv chip to raise STR, AGI, VIT, INT, DEX or LUK. A badge on each chip says when you have points.",
        gamepad: "Your partner has a job level: each one gives a skill point; press View to spend it on new moves. You, the tamer, have a base level: it gives stat points; press R3 to raise STR, AGI, VIT, INT, DEX or LUK. Steer those windows with the D-pad and A." } },
    { title: "Equipped moves", text: {
        keyboard: "Your partner only uses the moves it has equipped: 2 as a Baby or In-Training, 3 as a Rookie, 4 from Champion (one more with the Lab's Move Slot). Swap them any time in Skills (K). A bigger move needs the one before it at Lv 7. The squares at the bottom right are your equipped moves: grey and winding back while one recharges.",
        touch: "Your partner only uses the moves it has equipped: 2 as a Baby or In-Training, 3 as a Rookie, 4 from Champion (one more with the Lab's Move Slot). Swap them any time in Skills. A bigger move needs the one before it at Lv 7. The squares along the bottom are your equipped moves: grey and winding back while one recharges.",
        gamepad: "Your partner only uses the moves it has equipped: 2 as a Baby or In-Training, 3 as a Rookie, 4 from Champion (one more with the Lab's Move Slot). Swap them any time in Skills (View). A bigger move needs the one before it at Lv 7. The squares at the bottom right are your equipped moves: grey and winding back while one recharges." } },
    { title: "Grow stronger", text: {
        keyboard: "Meet your partner's needs and it digivolves: In-Training, Rookie, Champion, Ultimate and finally Mega. Watch the damage numbers: an up arrow means the foe is weak to that move, a down arrow means it resists. When the warp meter is full, press R to warp digivolve for a moment, or, at Mega, to fire its ultimate.",
        touch: "Meet your partner's needs and it digivolves: In-Training, Rookie, Champion, Ultimate and finally Mega. Watch the damage numbers: an up arrow means the foe is weak to that move, a down arrow means it resists. When the big round button fills, tap it to warp digivolve for a moment, or, at Mega, to fire its ultimate.",
        gamepad: "Meet your partner's needs and it digivolves: In-Training, Rookie, Champion, Ultimate and finally Mega. Watch the damage numbers: an up arrow means the foe is weak to that move, a down arrow means it resists. When the meter is full, press RB to warp digivolve for a moment, or, at Mega, to fire its ultimate." } },
    { el: "btn-setup-start", title: "Ready?", text: "That's everything you need. Out there, a little Digimon will ask which side you're on. Answer it or don't, it's up to you. In Story I'll be with you the whole way. Press Just play, and good luck, tamer!" }
  ];
  var SCRIPTS = { hub: HUB, setup: SETUP };
  var FLAG = { hub: "dbh_tour_hub", setup: "dbh_tour_setup" };

  /* ---------- the overlay ---------- */
  var cur = null, step = 0, root = null, raf = 0;
  function build() {
    if (root) return root;
    root = document.createElement("div");
    root.id = "tour";
    root.innerHTML =
      '<div class="tour-shade" id="tour-shade"></div>' +
      '<div class="tour-ring" id="tour-ring"></div>' +
      '<div class="tour-bubble" id="tour-bubble" role="dialog" aria-live="polite">' +
        '<canvas class="tour-guide" id="tour-guide" width="96" height="96"></canvas>' +
        '<div class="tour-body"><div class="tour-count" id="tour-count"></div><h3 id="tour-title"></h3><p id="tour-text"></p>' +
          '<div class="tour-btns"><button type="button" class="tour-skip" id="tour-skip">Skip tour</button><span></span>' +
          '<button type="button" class="tour-back" id="tour-back">Back</button><button type="button" class="tour-next" id="tour-next">Next</button></div></div>' +
      '</div>';
    ($("app") || document.body).appendChild(root);
    $("tour-next").addEventListener("click", function () { go(1); });
    $("tour-back").addEventListener("click", function () { go(-1); });
    $("tour-skip").addEventListener("click", function () { finish(true); });
    $("tour-shade").addEventListener("click", function () { go(1); });
    document.addEventListener("keydown", function (e) {
      if (!cur) return;
      if (e.key === "Escape") { finish(true); e.preventDefault(); e.stopPropagation(); }
      else if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") { go(1); e.preventDefault(); e.stopPropagation(); }
      else if (e.key === "ArrowLeft") { go(-1); e.preventDefault(); e.stopPropagation(); }
    }, true);
    global.addEventListener("resize", place);
    /* a controller: A next, B back, Start skips. Keys are handled above, so
     * whatever they send on to the game is just swallowed while the tour is up. */
    if (D.input && D.input.setGate) D.input.setGate(function (name, d) {
      if (!cur) return false;
      if (D.input.lastSource !== "gamepad") return name !== "source";
      if (name === "confirm") go(1);
      else if (name === "back") go(-1);
      else if (name === "pause") finish(true);
      else if (name === "nav") go(d > 0 ? 1 : -1);
      return true;
    });
    return root;
  }
  function guideLoop(t) {
    var cv = $("tour-guide");
    if (!cur || !cv) { raf = 0; return; }
    raf = requestAnimationFrame(guideLoop);
    var c = cv.getContext("2d"), S = D.sprites, h;
    c.clearRect(0, 0, cv.width, cv.height); c.imageSmoothingEnabled = false;
    if (!S || !S.drawPartner) return;
    h = (S.visualHeight && S.visualHeight("jijimon")) || 72;
    c.save(); c.translate(48, 88);
    var sc = Math.min(1.25, 76 / h); c.scale(sc, sc);
    try { S.drawPartner(c, "jijimon", 0, 0, 1, 1, t / 1000, false, false, false); } catch (e) {}
    c.restore();
  }
  function target() {
    var s = cur && cur[step], el = s && s.el ? $(s.el) : null;
    if (el && (el.hidden || !el.offsetParent || el.getBoundingClientRect().width < 4)) el = null;
    return el;
  }
  function place() {
    if (!cur) return;
    var el = target(), ring = $("tour-ring"), shade = $("tour-shade"), bub = $("tour-bubble"), r, pad = 8, W = global.innerWidth, H = global.innerHeight, bw, bh, bx, by;
    if (!ring || !bub) return;
    bw = Math.min(440, W - 24); bub.style.width = bw + "px";
    bh = bub.offsetHeight || 180;
    if (el) {
      r = el.getBoundingClientRect();
      ring.hidden = false; shade.classList.add("is-cut");
      ring.style.left = (r.left - pad) + "px"; ring.style.top = (r.top - pad) + "px";
      ring.style.width = (r.width + pad * 2) + "px"; ring.style.height = (r.height + pad * 2) + "px";
      /* the bubble goes wherever there is the most room: below, above, then beside */
      if (H - r.bottom > bh + 28) { by = r.bottom + pad + 14; bx = r.left + r.width / 2 - bw / 2; }
      else if (r.top > bh + 28) { by = r.top - pad - 14 - bh; bx = r.left + r.width / 2 - bw / 2; }
      else if (W - r.right > bw + 28) { bx = r.right + pad + 14; by = r.top + r.height / 2 - bh / 2; }
      else { bx = r.left - pad - 14 - bw; by = r.top + r.height / 2 - bh / 2; }
      bx = Math.max(12, Math.min(W - bw - 12, bx)); by = Math.max(12, Math.min(H - bh - 12, by));
    } else {
      ring.hidden = true; shade.classList.remove("is-cut");
      bx = (W - bw) / 2; by = Math.max(12, (H - bh) / 2);
    }
    bub.style.left = Math.round(bx) + "px"; bub.style.top = Math.round(by) + "px";
  }
  function paint() {
    var s = cur[step], tel = s.el ? $(s.el) : null;
    /* on a phone the setup screen scrolls: bring the button into view first */
    if (tel && tel.scrollIntoView) try { tel.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch (e) {}
    $("tour-title").textContent = s.title;
    var src = (D.input && D.input.lastSource) || "keyboard";
    $("tour-text").textContent = typeof s.text === "string" ? s.text : (s.text[src] || s.text.keyboard);
    $("tour-count").textContent = (step + 1) + " / " + cur.length;
    $("tour-back").hidden = step === 0;
    $("tour-next").textContent = step === cur.length - 1 ? "Got it!" : "Next";
    var b = $("tour-bubble"); b.classList.remove("is-in"); void b.offsetWidth; b.classList.add("is-in");
    place();
    setTimeout(place, 60);          /* after fonts and layout settle */
  }
  function go(d) {
    if (!cur) return;
    if (D.uiSfx) D.uiSfx("ui");
    var n = step + d;
    while (n >= 0 && n < cur.length && cur[n].el && !$(cur[n].el)) n += d;   /* a button this screen does not have */
    if (n >= cur.length) return finish(false);
    if (n < 0) return;
    step = n; paint();
  }
  var which = null;
  function finish(skipped) {
    if (which) store(FLAG[which], skipped ? "skipped" : "done");
    if (skipped && which === "hub") store(FLAG.setup, "skipped");      /* skip means skip the lot */
    cur = null; which = null;
    if (root) root.hidden = true;
  }
  function start(name, force) {
    if (!SCRIPTS[name]) return false;
    if (!force && store(FLAG[name])) return false;
    build();
    cur = SCRIPTS[name]; which = name; step = 0;
    root.hidden = false;
    if (!raf) raf = requestAnimationFrame(guideLoop);
    if (D.sprites && D.sprites.preloadSpecies) D.sprites.preloadSpecies("jijimon", true);
    paint();
    return true;
  }

  /* ---------- when to show it: the first time the front page and the setup screen are open and free ---------- */
  var lastState = null, seenT = 0;
  function blocked() {
    return !!($("profile-edit") || $("acct-screen") || (D.account && D.account.pending) || document.querySelector(".profile-overlay") || /[?&]room=/.test(global.location.search));
  }
  function watch() {
    var st = D.getState ? D.getState() : null;
    if (cur) { if ((which === "hub" && st !== "title") || (which === "setup" && st !== "setup" && st !== "tamer")) finish(false); return; }
    if (st !== lastState) { seenT = Date.now(); lastState = st; }
    if (Date.now() - seenT < 900 || blocked()) return;
    if (st === "title" && $("hub-modes") && !store(FLAG.hub)) start("hub");
    else if ((st === "setup" || st === "tamer") && $("setup-tamer") && !store(FLAG.setup)) start("setup");
  }
  function replayButton() {
    var box = $("help-box");
    if (!box || $("tour-replay")) return;
    var b = document.createElement("button");
    b.type = "button"; b.id = "tour-replay"; b.className = "px-close tour-replay"; b.textContent = "Replay the tour";
    b.addEventListener("click", function () {
      store(FLAG.hub, null); store(FLAG.setup, null);
      var c = $("btn-help-close"); if (c) c.click();
      setTimeout(function () { start("hub", true); }, 250);
    });
    box.insertBefore(b, box.firstChild.nextSibling);
  }
  function init() { replayButton(); global.setInterval(watch, 400); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  D.tour = { start: start, active: function () { return !!cur; }, reset: function () { store(FLAG.hub, null); store(FLAG.setup, null); }, _scripts: SCRIPTS };
})(typeof window !== "undefined" ? window : this);
