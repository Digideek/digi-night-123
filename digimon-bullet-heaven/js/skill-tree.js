/* Skill tree (Nov 16): Ragnarok-style job skills for the partner.
 *
 * Each job level (a Digimon level-up) gives ONE skill point. Points go into
 * the tree of the Digimon's line:
 *
 *   Moves     level 1 to 10. A bigger move needs the form that knows it and
 *             the smaller move of the same kind at Lv 3 first, the way a
 *             Ragnarok skill needs its prerequisite. An aura needs any shot
 *             at Lv 5; an orbit needs an aura at Lv 3.
 *   Passives  the old Power Up / Quick Claws / Vital Boost / Speed Up /
 *             Magnet cards, now masteries with ten levels each.
 *
 * Only the biggest learned move of each kind (shot, claw, aura, orbit)
 * fires; the smaller ones it grew out of each add a little damage to it per
 * level, so points spent on the way up are not wasted.
 *
 * Move data has 3 or 5 power steps; the ten skill levels walk through those
 * steps and add a bit of damage in between (see moveLevel).
 */
(function (root) {
  "use strict";
  var MAX = 10;
  var SLOTS = ["primary", "melee", "aura", "orbit", "special", "tech"];
  var SLOT_NAME = { primary: "Shots", melee: "Claws", aura: "Auras", orbit: "Orbits", special: "Signature", tech: "Techniques" };
  /* in these kinds every learned move fires; nothing replaces anything */
  var MULTI = { special: 1, tech: 1 };
  var STAGE_NAME = ["Baby", "In-Training", "Rookie", "Champion", "Ultimate", "Mega"];
  var RULES = { prereqLevel: 3, auraNeedsShot: 5, orbitNeedsAura: 3, betweenSteps: 0.07, legacyPerLevel: 0.015 };
  /* per level */
  var PASSIVES = [
    { id: "pw", name: "Power Mastery", per: 0.04, text: "+4% damage with every move", icon: "damage" },
    { id: "qk", name: "Quick Mastery", per: 0.03, text: "every move comes 3% sooner", icon: "cooldown" },
    { id: "vt", name: "Vital Mastery", per: 0.05, text: "+5% max HP", icon: "maxHp" },
    { id: "fl", name: "Fleet Foot", per: 0.03, text: "+3% movement speed", icon: "speed" },
    { id: "mg", name: "Data Magnet", per: 0.08, text: "+8% pickup range", icon: "magnet" },
    { id: "rg", name: "Recovery", per: 0.002, text: "heals 0.2% of max HP a second", icon: "medicine" }
  ];
  var PASSIVE_BY = {};
  PASSIVES.forEach(function (p) { PASSIVE_BY[p.id] = p; });

  function metaOf(data, id) { return (data.MOVE_META && data.MOVE_META[id]) || null; }
  function lvOf(skills, id) { return (skills && skills[id]) || 0; }

  /* the whole tree for a form: every move of its line, plus any move learned
   * earlier that the line does not have (kept after a change of line) */
  function tree(data, form, skills) {
    var chain = data.moveChain ? data.moveChain(form) : { stage: 0, primary: [], melee: [], aura: [], orbit: [] };
    for (s = 0; s < SLOTS.length; s++) if (!chain[SLOTS[s]]) chain[SLOTS[s]] = [];
    var out = { stage: chain.stage, family: chain.family, slots: {}, passives: PASSIVES }, s, i, k, m, have = {};
    for (s = 0; s < SLOTS.length; s++) {
      out.slots[SLOTS[s]] = chain[SLOTS[s]].map(function (e) { have[e.id] = 1; return { id: e.id, tier: e.tier, slot: SLOTS[s] }; });
    }
    for (k in (skills || {})) {
      if (have[k] || PASSIVE_BY[k] || !(skills[k] > 0)) continue;
      m = metaOf(data, k);
      if (m && out.slots[m.slot]) out.slots[m.slot].push({ id: k, tier: m.tier, slot: m.slot, legacy: true });
    }
    for (s = 0; s < SLOTS.length; s++) out.slots[SLOTS[s]].sort(function (a, b) { return a.tier - b.tier; });
    return out;
  }

  function bestInSlot(data, skills, slot, minLevel) {
    var k, m, best = null;
    for (k in (skills || {})) {
      if (PASSIVE_BY[k] || !(skills[k] >= (minLevel || 1))) continue;
      m = metaOf(data, k);
      if (m && m.slot === slot && (!best || m.tier > best.tier)) best = { id: k, tier: m.tier, level: skills[k] };
    }
    return best;
  }

  /* why a skill cannot take a point right now, or null if it can */
  function blocked(data, form, skills, id) {
    var t = tree(data, form, skills), s, i, list, e, prev, nm;
    if (PASSIVE_BY[id]) return lvOf(skills, id) >= MAX ? "Mastered" : null;
    for (s = 0; s < SLOTS.length; s++) {
      list = t.slots[SLOTS[s]];
      for (i = 0; i < list.length; i++) {
        e = list[i];
        if (e.id !== id) continue;
        if (lvOf(skills, id) >= MAX) return "Mastered";
        if (lvOf(skills, id) > 0) return null;                       /* already known: can always be raised */
        if (e.tier > t.stage) return "Reach " + (STAGE_NAME[e.tier] || "a later form");
        /* the smaller move of the same kind, or any move of that kind at least as big */
        prev = null;
        for (var j = i - 1; j >= 0; j--) if (list[j].tier < e.tier) { prev = list[j]; break; }
        if (prev && !bestInSlot(data, skills, e.slot, RULES.prereqLevel)) {
          nm = (data.WEAPONS && data.WEAPONS[prev.id] && data.WEAPONS[prev.id].name) || prev.id;
          return "Needs " + nm + " Lv " + RULES.prereqLevel;
        }
        if (prev) {
          var b = bestInSlot(data, skills, e.slot, RULES.prereqLevel);
          if (!b || b.tier < prev.tier) return "Needs " + ((data.WEAPONS[prev.id] && data.WEAPONS[prev.id].name) || prev.id) + " Lv " + RULES.prereqLevel;
        }
        if (e.slot === "aura" && !bestInSlot(data, skills, "primary", RULES.auraNeedsShot)) return "Needs a shot at Lv " + RULES.auraNeedsShot;
        if (e.slot === "orbit" && !bestInSlot(data, skills, "aura", RULES.orbitNeedsAura)) return "Needs an aura at Lv " + RULES.orbitNeedsAura;
        return null;
      }
    }
    return "Not in this Digimon's tree";
  }

  /* skill level 1..10 -> which power step of the move's data to use, and the
   * damage bonus for the levels in between steps */
  function moveLevel(data, id, level) {
    var def = data.WEAPONS && data.WEAPONS[id], n = (def && def.levels && def.levels.length) || 1;
    var L = Math.max(1, Math.min(MAX, level || 1));
    var step = Math.max(1, Math.min(n, Math.ceil(L * n / MAX)));
    var first = Math.floor((step - 1) * MAX / n) + 1;
    return { step: step, bonus: 1 + RULES.betweenSteps * Math.max(0, L - first) };
  }

  /* the moves that actually fire: the biggest learned one of each kind */
  function active(data, skills) {
    var out = [], s, b, k, m, extra, ml;
    for (s = 0; s < SLOTS.length; s++) {
      if (MULTI[SLOTS[s]]) {
        for (k in skills) {
          if (PASSIVE_BY[k] || !(skills[k] > 0)) continue;
          m = metaOf(data, k);
          if (!m || m.slot !== SLOTS[s]) continue;
          ml = moveLevel(data, k, skills[k]);
          out.push({ id: k, slot: SLOTS[s], skill: skills[k], level: ml.step, bonus: ml.bonus });
        }
        continue;
      }
      b = bestInSlot(data, skills, SLOTS[s], 1);
      if (!b) continue;
      extra = 0;
      for (k in skills) {
        if (k === b.id || PASSIVE_BY[k] || !(skills[k] > 0)) continue;
        m = metaOf(data, k);
        if (m && m.slot === SLOTS[s]) extra += skills[k];
      }
      ml = moveLevel(data, b.id, b.level);
      out.push({ id: b.id, slot: SLOTS[s], skill: b.level, level: ml.step, bonus: ml.bonus * (1 + RULES.legacyPerLevel * extra) });
    }
    return out;
  }

  function passiveMul(skills) {
    return {
      damage: 1 + PASSIVE_BY.pw.per * lvOf(skills, "pw"),
      cooldown: Math.pow(1 - PASSIVE_BY.qk.per, lvOf(skills, "qk")),
      hp: 1 + PASSIVE_BY.vt.per * lvOf(skills, "vt"),
      speed: 1 + PASSIVE_BY.fl.per * lvOf(skills, "fl"),
      magnet: 1 + PASSIVE_BY.mg.per * lvOf(skills, "mg"),
      regen: PASSIVE_BY.rg.per * lvOf(skills, "rg")
    };
  }

  /* what a CPU partner (or a player who stepped away) does with a point:
   * learn the biggest new move it can, else raise what it fires */
  function autoPick(data, form, skills) {
    var t = tree(data, form, skills), s, i, list, act, best = null;
    for (s = 0; s < SLOTS.length; s++) {
      list = t.slots[SLOTS[s]];
      for (i = list.length - 1; i >= 0; i--) if (!lvOf(skills, list[i].id) && !blocked(data, form, skills, list[i].id)) return list[i].id;
    }
    act = active(data, skills);
    for (i = 0; i < act.length; i++) if (act[i].skill < MAX && (!best || act[i].skill < best.skill)) best = act[i];
    if (best) return best.id;
    for (i = 0; i < PASSIVES.length; i++) if (lvOf(skills, PASSIVES[i].id) < MAX) return PASSIVES[i].id;
    return null;
  }

  /* Level-up cards (data.js SKILL_CARDS): up to n different skills that could
   * take a point right now, drawn at random. A move not learned yet weighs
   * most, a move already known next, a mastery least. New skills are only
   * ever learned from these cards; a point can always go into something
   * already known instead. */
  function offer(data, form, skills, rnd, n) {
    var C = data.SKILL_CARDS || {}, t = tree(data, form, skills), pool = [], out = [], s, i, list, id, tot, r, k;
    for (s = 0; s < SLOTS.length; s++) {
      list = t.slots[SLOTS[s]];
      for (i = 0; i < list.length; i++) {
        id = list[i].id;
        if (blocked(data, form, skills, id)) continue;
        pool.push({ id: id, w: lvOf(skills, id) > 0 ? (C.ownedWeight || 2) : (C.newWeight || 3) });
      }
    }
    for (i = 0; i < PASSIVES.length; i++) if (lvOf(skills, PASSIVES[i].id) < MAX) pool.push({ id: PASSIVES[i].id, w: C.passiveWeight || 1 });
    n = Math.min(n || C.count || 3, pool.length);
    while (out.length < n) {
      tot = 0; for (i = 0; i < pool.length; i++) tot += pool[i].w;
      r = (rnd ? rnd() : Math.random()) * tot; k = 0;
      for (i = 0; i < pool.length; i++) { r -= pool[i].w; k = i; if (r <= 0) break; }
      out.push(pool[k].id); pool.splice(k, 1);
    }
    return out;
  }

  var api = { MAX: MAX, MULTI: MULTI, SLOTS: SLOTS, SLOT_NAME: SLOT_NAME, STAGE_NAME: STAGE_NAME, RULES: RULES, PASSIVES: PASSIVES, PASSIVE_BY: PASSIVE_BY,
    tree: tree, blocked: blocked, active: active, moveLevel: moveLevel, passiveMul: passiveMul, autoPick: autoPick, bestInSlot: bestInSlot, offer: offer };
  if (root.DBH) root.DBH.SKILLS = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
