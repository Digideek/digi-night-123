/* Run modes, respawning, scores and bounties (Nov 20; data.js MODES, RESPAWN, BOUNTY).
 *
 *   open      Open World (the default): when your partner falls you are not
 *             out. Same map, same tamer (base level, stat points, Bits, bag
 *             and standing with the factions all kept); your partner starts
 *             over as its line's Digi Egg near the start, where the land stays
 *             low level (nest-sim.js keeps the start's nests on Babies and
 *             In-Training all run long). While it is well below the best job
 *             level it reached this run it earns RESPAWN.catchUp x the XP, so
 *             climbing back is a grind, not a wall.
 *   survival  one life: the run ends when every partner is down.
 *   ranked    one life, scored for the Ranked board; no CPU partners.
 *   weekly    one life on the week's map (the same seed for everyone, from the
 *             week number), scored for the Weekly board.
 *
 * Score (all modes keep one; ranked and weekly are the ones that count):
 *   minutes survived x 10 + best job level x 25 + kills + lords x 300 +
 *   bosses x 60 + PvP wins x 150 + 2000 for reaching a Mega (sooner is more).
 *
 * Bounties: a tamer who beats BOUNTY.streak other tamers in a row without
 * losing gets a price on their head (BOUNTY.base Bits, +BOUNTY.per for each
 * further win). Whoever beats them takes it on top of the usual share.
 */
(function (root) {
  "use strict";
  /* r: { time (s), level, kills, lords, bosses, pvp, megaAt (s or null) }. The server checks scores with this too. */
  function scoreOf(data, r) {
    var sc = (data && data.MODES && data.MODES.score) || {}, s;
    s = (r.time || 0) / 60 * (sc.perMinute || 10) + (r.level || 1) * (sc.perLevel || 25) + (r.kills || 0) * (sc.perKill || 1) +
      (r.lords || 0) * (sc.perLord || 300) + (r.bosses || 0) * (sc.perBoss || 60) + (r.pvp || 0) * (sc.perPvp || 150);
    if (r.megaAt) s += Math.max(sc.megaMin || 500, (sc.mega || 2000) - Math.max(0, r.megaAt / 60 - 60) * (sc.megaLatePerMin || 15));
    return Math.round(s);
  }
  /* The week, ISO style ("2026-W47", Monday to Sunday, UTC): the weekly map and the faction season run on it. */
  function weekOf(ms) {
    var d = new Date(ms == null ? Date.now() : ms), day, th, y, w;
    d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    day = d.getUTCDay() || 7;
    th = new Date(d.getTime() + (4 - day) * 86400000);          /* the Thursday of this week decides its year */
    y = th.getUTCFullYear();
    w = Math.floor((th - Date.UTC(y, 0, 1)) / 86400000 / 7) + 1;
    return y + "-W" + (w < 10 ? "0" : "") + w;
  }
  function weekBefore(id) { var m = /^(\d+)-W(\d+)$/.exec(id || ""), t; if (!m) return null; t = Date.UTC(+m[1], 0, 4) + ((+m[2]) - 1) * 7 * 86400000; return weekOf(t - 7 * 86400000); }
  /* the same map for everyone that week */
  function weekSeed(id) {
    var h = 2166136261, i, s = "digi-night-weekly|" + id;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) || 1;
  }
  function install(MissionSim, U) {
    var dist2 = U.dist2;

    /* a sim nobody set a mode on (tests, tools) plays by the old one-life rules; game.js always sets one */
    MissionSim.prototype._mode = function () { return this.runMode || "survival"; };
    MissionSim.prototype._oneLife = function () { var m = this._mode(); return m === "survival" || m === "ranked" || m === "weekly" || m === "siege"; };
    /* each mode's own rules, once a tick (story-sim.js, siege-sim.js, versus-sim.js) */
    MissionSim.prototype._updateModeRules = function (dt) {
      var m = this._mode(), SN = this.data.seasons;
      if (SN && SN.useMode) SN.useMode(m);                 /* Night Siege's shorter days (seasons.js) */
      if (m === "story" && this._updateStory) this._updateStory(dt);
      else if (m === "siege" && this._updateSiege) this._updateSiege(dt);
      else if ((m === "versus" || m === "duel") && this._updateVersus) this._updateVersus(dt);
    };

    /* the line's Digi Egg for a partner: the one it hatched from, or the line it belongs to */
    MissionSim.prototype._eggFor = function (p) {
      var L = this.data.LINES || {}, k, s, S = this.data.SPECIES || {};
      if (p.eggForm && S[p.eggForm]) return p.eggForm;
      for (k in L) {
        if (!L[k] || !L[k].egg || !S[L[k].egg]) continue;
        if (L[k].baby === p.form || L[k].training === p.form || L[k].rookie === p.form || L[k].champion === p.form) return L[k].egg;
        if (this._lineForm) for (s = 0; s < 6; s++) if (this._lineForm(L[k].baby, s) === p.form) return L[k].egg;
      }
      for (k in L) if (L[k] && L[k].egg && S[L[k].egg]) return L[k].egg;
      return null;
    };

    /* fallen in Open World: back near the start with a fresh egg of the same line */
    MissionSim.prototype._respawn = function (p) {
      var R = this.data.RESPAWN || {}, egg = this._eggFor(p), S = this.data.SPECIES || {}, a, r, s, base;
      if (!egg) return false;
      p.peakLevel = Math.max(p.peakLevel || 1, p.level || 1);
      p.respawns = (p.respawns || 0) + 1;
      p.form = egg; p.eggForm = egg;
      p.hatchLeft = R.hatchSec || 8;
      p.respawnShield = R.shield || 6;                                   /* the shield starts when it hatches, not before */
      p.formSince = this.time;
      p.level = 1; p.xp = 0; p.xpNext = this._xpNeeded ? this._xpNeeded(1) : 10;
      p.skills = {}; p.skillPoints = 0; p.skillOffer = null; p.levelOffers = []; p.pendingLevels = 0;
      p.weapons = []; p.evoCount = 0; p.evoOffer = null; p.formHolds = 0; p.evoHoldUntil = 0;
      p.burst = 0; p.burstLeft = 0; p.burstForm = null; p.ultLock = false; p.focusId = null;
      base = (S[egg] && S[egg].base) || {};
      p.maxHp = base.maxHp || p.maxHp || 30; p.hp = p.maxHp;
      p.faint = 0; p.downed = false; p.tamerHp = p.tamerMaxHp || p.tamerHp || 100;
      /* the spot near the start furthest from any nemesis or anything far above its level (playtest, Nov 20:
       * a nemesis waiting at the start beat a freshly hatched Baby again and again) */
      var near = R.near || [250, 520], k, bestS = null, bestD = -1, cand, dmin, j, en;
      for (k = 0; k < 8; k++) {
        a = this.rng() * Math.PI * 2; r = near[0] + this.rng() * (near[1] - near[0]);
        cand = this._snap(Math.cos(a) * r, Math.sin(a) * r, 12, 300);
        dmin = 1e12;
        for (j = 0; j < this.enemies.length; j++) {          /* any wild Digimon counts; a nemesis or a much stronger one as if twice as close */
          en = this.enemies[j]; if (en.dead || en.rally) continue;
          dmin = Math.min(dmin, ((en.x - cand.x) * (en.x - cand.x) + (en.y - cand.y) * (en.y - cand.y)) / ((en.nemesis || (en.lv || 1) > 10) ? 4 : 1));
        }
        if (dmin > bestD) { bestD = dmin; bestS = cand; }
      }
      s = bestS;
      p.x = s.x; p.y = s.y; p.mx = s.x + 26; p.my = s.y + 6;
      p.monInvuln = R.shield || 6; p.tamerInvuln = R.shield || 6;
      this.emit({ type: "respawn", id: p.id, x: Math.round(p.x), y: Math.round(p.y), form: egg, peak: p.peakLevel, n: p.respawns });
      return true;
    };
    /* climbing back after a respawn: more XP while well below this run's best */
    MissionSim.prototype._catchUp = function (p) {
      var R = this.data.RESPAWN;
      if (!R || !p || !p.peakLevel || this._oneLife()) return 1;
      return (p.level || 1) < p.peakLevel - (R.catchUpGap || 2) ? (R.catchUp || 1.75) : 1;
    };

    /* the run's score for a player (see the top of this file) */
    MissionSim.prototype._score = function (p) {
      return scoreOf(this.data, { time: this.time, level: Math.max(p.level || 1, p.peakLevel || 1), kills: p.kills, lords: p.lordsBeaten, bosses: p.bossesBeaten, pvp: p.pvpWins, megaAt: p.megaAt });
    };
    /* what the end-of-run report carries for the boards (game.js sends it to the server) */
    MissionSim.prototype._runRecord = function (p) {
      var w = this.data.world, F = this.data.FACTIONS, best = null, bt = 0, k, landBy = {}, parts, i, f;
      if (p.trust) for (k in p.trust) if (p.trust[k] > bt) { bt = p.trust[k]; best = k; }
      if (best && F && bt < F.trusted) best = null;
      /* the land each biome had conquered by the end (war-sim.js): what the faction seasons count */
      if (w && w.territoryString) {
        parts = w.territoryString().split(";");
        for (i = 0; i < parts.length; i++) { f = parts[i].split(",")[2]; if (f) landBy[f] = (landBy[f] || 0) + 1; }
      }
      return {
        mode: this._mode(), week: this.week || null, seed: this.seed, time: Math.round(this.time || 0),
        level: Math.max(p.level || 1, p.peakLevel || 1), kills: p.kills || 0, lords: p.lordsBeaten || 0, bosses: p.bossesBeaten || 0,
        pvp: p.pvpWins || 0, megaAt: p.megaAt ? Math.round(p.megaAt) : null, respawns: p.respawns || 0,
        score: this._score(p), faction: best, landBy: landBy, form: p.form,
        nights: this._siegeNights ? this._siegeNights() : 0,                                 /* Night Siege (17z33) */
        story: this.story ? (this.story.done ? "done" : this.story.i) : null,
        vs: this.vs && this.vs.phase === "done" ? { winner: this.vs.winner, wins: this.vs.wins } : null
      };
    };
    /* notes for the boards: first time at Mega, lords beaten */
    MissionSim.prototype._noteStage = function (p) {
      var sp = this.data.SPECIES && this.data.SPECIES[p.form];
      if (!p.megaAt && sp && sp.stage === "Mega") { p.megaAt = this.time; this.emit({ type: "mode.mega", id: p.id, at: Math.round(this.time) }); }
    };

    /* ---------- bounties ---------- */
    MissionSim.prototype._bountyOnKo = function (win, lose) {
      var B = this.data.BOUNTY, take = 0;
      if (!B) return 0;
      if (lose.bounty) {
        take = lose.bounty;
        win.bits = (win.bits || 0) + take;
        this.emit({ type: "bounty.claimed", id: win.id, from: lose.id, bits: take });
        lose.bounty = 0;
      }
      lose.pvpStreak = 0;
      win.pvpStreak = (win.pvpStreak || 0) + 1;
      if (win.pvpStreak >= B.streak) {
        win.bounty = B.base + B.per * (win.pvpStreak - B.streak);
        this.emit({ type: "bounty.set", id: win.id, bits: win.bounty, streak: win.pvpStreak });
      }
      return take;
    };
  }

  var isNode = typeof module !== "undefined" && module.exports;
  install.score = scoreOf; install.weekOf = weekOf; install.weekBefore = weekBefore; install.weekSeed = weekSeed;
  if (isNode) module.exports = install;
  else { root.DBH = root.DBH || {}; root.DBH.installModes = install; root.DBH.modeScore = scoreOf; root.DBH.weekOf = weekOf; root.DBH.weekSeed = weekSeed; root.DBH.weekBefore = weekBefore; }
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
