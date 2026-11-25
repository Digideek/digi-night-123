/* Story mode (17z33): Jijimon walks you through the game, one goal at a time.
 *
 * The whole party shares the goals. A goal marked "all" is done when every tamer in the run has done
 * it (hatch, feed your partner, learn a move...); "party" goals add up what everyone does (beat 5
 * wild Digimon each, beat a boss together). The rest of the game opens up as you go: no rival, no
 * virus outbreaks and no world events at first, and Tokomon doesn't ask about the turf war until
 * that's the goal. When the last goal is done the run goes on with everything on.
 *
 * The host decides; every screen hears story.step (a new goal, with Jijimon's words), story.state
 * (once a second: the goal, progress, who has done it) and story.done (js/modes-ui.js draws them).
 */
(function (root) {
  "use strict";
  var STAGE = { Egg: -1, Baby: 0, "In-Training": 1, Rookie: 2, Champion: 3, Ultimate: 4, Mega: 5, Armor: 3 };
  /* id, who must do it ("all" every tamer, "party" a total), what Jijimon says, the short goal, what opens */
  /* who: "talk" is a lesson with nothing to do (what's waiting between runs): it moves on after `sec` seconds and
   * pays no XP. (17z33, Isaac: "if someone plays the story mode they're going to know everything") */
  var STEPS = [
    { id: "hatch", who: "all", say: "Welcome, young tamer! I'm Jijimon. That egg beside you is your partner. Stay close: it hatches in a moment.", goal: "Hatch your egg" },
    { id: "kills", who: "party", per: 5, say: "Your partner fights all by itself: walk near wild Digimon and it attacks. Click one to send it after that one. Watch the numbers: a gold CRIT is a critical hit, and MISS means it dodged.", goal: "Beat wild Digimon" },
    { id: "feed", who: "all", say: "Beaten Digimon drop food, and it goes in your bag. Your partner eats at the farm: walk to the glowing gate in the middle of the start, press E, and feed it there (F). A well-fed partner digivolves down the best routes.", goal: "Feed your partner at the farm" },
    { id: "level", who: "all", n: 5, say: "The teal gems are experience. There are two levels to grow: your partner's job level (the Job Lv chip) and your own base level as its tamer (Base Lv). Both go up as you fight.", goal: "Reach job level 5" },
    { id: "skill", who: "all", say: "Every job level gives your partner a skill point. Press K, or tap the Job Lv chip, and pick a card: a new move, or a stronger one. Only a few moves can be equipped at once (2 now, 3 as a Rookie, 4 from Champion): swap them in that window. The squares at the bottom right show each one recharging.", goal: "Learn a move (K)" },
    { id: "evolve", who: "all", say: "Grow enough and your partner digivolves into a new form! When it asks, say yes. Baby, In-Training, Rookie, Champion, Ultimate, and at the very top, Mega.", goal: "Digivolve" },
    { id: "stats", who: "all", say: "Your base level gives stat points. Press T, or tap the Base Lv chip, and raise one. STR: claws and bites. INT: special moves. VIT: health. AGI: speed and dodging. DEX: landing hits. LUK: criticals and lucky digivolutions.", goal: "Raise a stat (T)" },
    { id: "side", who: "all", say: "The biomes here are at war over the land. Tokomon will ask whose side you're on. Back one and its Digimon start to trust you, or stay free and just survive.", goal: "Pick a side (or just survive)", opens: "turf" },
    { id: "train", who: "all", say: "The farm is more than a kitchen. Go back through a farm gate (the Farm chip shows the way) and train your partner there: each station raises a stat, and a perfect run raises it most.", goal: "Train at the farm" },
    { id: "rookie", who: "all", say: "Now let's see a real Digimon! Keep fighting and digivolve again. Careful: another tamer is out here now, with a partner of their own.", goal: "Reach Rookie", opens: "rival" },
    { id: "weak", who: "party", per: 3, say: "Every move has an element. An up arrow on a number means your foe is weak to it and takes extra; a down arrow means it resists. If you only see down arrows, try another biome.", goal: "Hit a weakness" },
    { id: "warp", who: "all", say: "Fighting fills your warp meter. When it's full, press R to warp digivolve for a few seconds: a much stronger form, for a moment. At Mega, the same button fires its ultimate.", goal: "Warp digivolve (R)" },
    { id: "boss", who: "party", n: 1, say: "The big ones with a crown lead the strongest nests. Beat one. Together if you can!", goal: "Beat a boss", opens: "virus" },
    { id: "champion", who: "all", say: "Last fighting lesson: become a Champion. After that, the whole Digital World is open: rivals, outbreaks, wars and all.", goal: "Reach Champion", opens: "events" },
    { id: "hatchery", who: "talk", sec: 16, say: "Something for when this run ends. Every Digimon you beat leaves data. On the main menu, feed it to an egg in the Hatchery and raise a Digimon of your own. Raise one to Rookie and its whole egg line opens for good.", goal: "Between runs: the Hatchery" },
    { id: "blood", who: "talk", sec: 18, say: "The Hatchery has three slots, each its own family. Take one into a run: reach Mega and its bloodline earns traits its children keep. Fall too young and the line suffers. The ones left at home go on expeditions and bring back data, coins, and sometimes a rare egg.", goal: "Bloodlines and expeditions" },
    { id: "modes", who: "talk", sec: 18, say: "When you know your way around, try the rest. Survival: everything on, as long as you can last. Night Siege: grow by day, then guard the Digi-eggs from waves all night, with fences you build. Versus: race a friend to Mega, then fight. Duel: your Hatchery Digimon, straight into the arena.", goal: "Other ways to play" },
    { id: "league", who: "talk", sec: 15, say: "And log in on the online server: every run you finish there can land on the League, from Survival and Night Siege to how fast you finish my story. Back a biome in the faction season, too.", goal: "The League" }
  ];
  function install(MissionSim) {
    function stageOf(sim, p) {
      if (sim._isEgg && sim._isEgg(p.form)) return -1;
      var sp = sim.data.SPECIES && sim.data.SPECIES[p.form];
      return sp && STAGE[sp.stage] != null ? STAGE[sp.stage] : 0;
    }
    function attrSum(p) { var k, n = 0; for (k in (p.attrs || {})) n += +p.attrs[k] || 0; return n; }
    function skillSum(p) { var k, n = 0; for (k in (p.skills || {})) if (k.charAt(0) !== "!" && typeof p.skills[k] === "number") n += p.skills[k]; return n; }
    /* where a tamer stands on a goal: a number toward `need` */
    function progressOf(sim, st, p, base) {
      var b = (base && base[p.id]) || {};
      switch (st.id) {
        case "hatch": return stageOf(sim, p) >= 0 ? 1 : 0;
        case "kills": return Math.max(0, (p.kills || 0) - (b.kills || 0));
        case "feed": return (p.foodEaten || 0) > (b.food || 0) ? 1 : 0;
        case "level": return p.level || 1;
        case "skill": return skillSum(p) > (b.skill || 0) ? 1 : 0;
        case "stats": return attrSum(p) > (b.attr || 0) ? 1 : 0;
        case "train": return (p.trainCount || 0) > (b.train || 0) ? 1 : 0;
        case "weak": return Math.max(0, (p.weakHits || 0) - (b.weak || 0));
        case "warp": return (p.burstUses || 0) > (b.warp || 0) ? 1 : 0;
        case "evolve": return stageOf(sim, p) > (b.stage == null ? 0 : b.stage) || (p.evoCount || 0) > (b.evo || 0) ? 1 : 0;
        case "side": return p.side || p.free ? 1 : 0;
        case "rookie": return stageOf(sim, p) >= 2 ? 1 : 0;
        case "boss": return Math.max(0, (p.bossesBeaten || 0) + (p.lordsBeaten || 0) - (b.boss || 0));
        case "champion": return stageOf(sim, p) >= 3 ? 1 : 0;
      }
      return 0;
    }
    MissionSim.prototype._storyPlayers = function () {
      var out = [], i, p;
      for (i = 0; i < this.players.length; i++) { p = this.players[i]; if (p.hasTamer !== false && p.kind !== "cpu" && !p.away) out.push(p); }
      return out;
    };
    /* what is open so far (turf, rival, virus, events) */
    MissionSim.prototype._storyOpen = function (what) {
      var st = this.story, i;
      if (!st) return true;
      if (st.done) return true;
      for (i = 0; i <= st.i && i < STEPS.length; i++) if (STEPS[i].opens === what) return true;
      return false;
    };
    MissionSim.prototype._storyGates = function () {
      this.noRival = !this._storyOpen("rival");
      this.noVirus = !this._storyOpen("virus");
      this.noEvents = !this._storyOpen("events");
    };
    MissionSim.prototype._storyStart = function (i) {
      var st = this.story, ps = this._storyPlayers(), k, p;
      st.i = i; st.base = {};
      for (k = 0; k < ps.length; k++) { p = ps[k]; st.base[p.id] = { kills: p.kills || 0, food: p.foodEaten || 0, skill: skillSum(p), stage: stageOf(this, p), evo: p.evoCount || 0, attr: attrSum(p), train: p.trainCount || 0, weak: p.weakHits || 0, warp: p.burstUses || 0, boss: (p.bossesBeaten || 0) + (p.lordsBeaten || 0) }; }
      st.stateT = 0; st.t0 = this.time || 0;
      this._storyGates();
      this.emit({ type: "story.step", n: i, of: STEPS.length, id: STEPS[i].id, say: STEPS[i].say, goal: STEPS[i].goal, opens: STEPS[i].opens || null, sec: STEPS[i].sec || 0 });
    };
    MissionSim.prototype._storyStatus = function () {
      var st = this.story, s = STEPS[st.i], ps = this._storyPlayers(), i, p, v, done = 0, tot = 0, who = [], need;
      if (!s) return null;
      if (s.who === "talk") return { have: 0, need: 1, ok: (this.time || 0) - (st.t0 || 0) >= s.sec, who: [], talk: true };
      need = s.who === "party" ? (s.per ? s.per * Math.max(1, ps.length) : (s.n || 1)) : (s.n || 1);
      for (i = 0; i < ps.length; i++) {
        p = ps[i]; v = progressOf(this, s, p, st.base);
        if (s.who === "party") tot += v;
        else { if (v >= need) done++; who.push({ id: p.id, ok: v >= need }); }
      }
      if (s.who === "party") return { have: Math.min(tot, need), need: need, ok: tot >= need, who: [] };
      return { have: done, need: ps.length, ok: ps.length > 0 && done >= ps.length, who: who, each: need > 1 ? need : 0 };
    };
    MissionSim.prototype._updateStory = function (dt) {
      var st = this.story, now;
      if (!st) { st = this.story = { i: 0, done: false }; this._storyStart(0); return; }
      this._storyGates();
      if (st.done) return;
      now = this._storyStatus();
      st.stateT -= dt;
      if (now && now.ok) {
        /* a small reward for each goal: some XP for everyone (a lesson just moves on) */
        var ps = this._storyPlayers(), i;
        if (!now.talk) this.emit({ type: "story.clear", n: st.i, id: STEPS[st.i].id, goal: STEPS[st.i].goal });
        for (i = 0; i < (now.talk ? 0 : ps.length); i++) { ps[i].xp = (ps[i].xp || 0) + Math.round(this._xpNeeded(ps[i].level || 1) * 0.25); if (this._tryLevel) this._tryLevel(ps[i]); }
        if (st.i + 1 >= STEPS.length) {
          st.done = true; this._storyGates();
          this.emit({ type: "story.done", say: "You did it! You've learned everything I can teach you. This run goes on with the whole Digital World open. Go see how far you can get, tamer!" });
          return;
        }
        this._storyStart(st.i + 1);
        return;
      }
      if (st.stateT <= 0 && now && !now.talk) {
        st.stateT = 1;
        this.emit({ type: "story.state", n: st.i, of: STEPS.length, id: STEPS[st.i].id, goal: STEPS[st.i].goal, have: now.have, need: now.need, each: now.each || 0, who: now.who, party: STEPS[st.i].who === "party" });
      }
    };
  }
  install.STEPS = STEPS;
  var isNode = typeof module !== "undefined" && module.exports;
  if (isNode) module.exports = install;
  else { root.DBH = root.DBH || {}; root.DBH.installStory = install; root.DBH.STORY_STEPS = STEPS; }
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
