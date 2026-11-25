/* Skill tree (Nov 16): Ragnarok-style job skills for the partner.
 *
 * Each job level (a Digimon level-up) gives ONE skill point. Points go into
 * the tree of the Digimon's line:
 *
 *   Moves     level 1 to 10. A bigger move needs the form that knows it and
 *             the smaller move of the same kind at Lv 7 first (17z33; it was 3), the way a
 *             Ragnarok skill needs its prerequisite. An aura needs any shot
 *             at Lv 5; an orbit needs an aura at Lv 3.
 *   Passives  the old Power Up / Quick Claws / Vital Boost / Speed Up /
 *             Magnet cards, now masteries with ten levels each.
 *
 * Equipped moves (17z33, Isaac): only so many learned moves can be in use at once: 2 for a Baby or an
 * In-Training, 3 for a Rookie, 4 from Champion up, and the Lab's Move Slot adds one at every stage.
 * The player swaps them any time in the skills window (K). A bigger move needs the smaller one of its
 * kind at Lv 7 (it was 3). See EQUIP and fixEquip below.
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
  var RULES = { prereqLevel: 7, auraNeedsShot: 5, orbitNeedsAura: 3, betweenSteps: 0.07, legacyPerLevel: 0.03 };
  /* per level */
  var PASSIVES = [
    { id: "pw", name: "Power Mastery", per: 0.04, text: "+4% damage with every move", icon: "damage" },
    { id: "qk", name: "Quick Mastery", per: 0.03, text: "every move comes 3% sooner", icon: "cooldown" },
    { id: "vt", name: "Vital Mastery", per: 0.05, text: "+5% max HP", icon: "maxHp" },
    { id: "fl", name: "Fleet Foot", per: 0.03, text: "+3% movement speed", icon: "speed" },
    { id: "mg", name: "Data Magnet", per: 0.08, text: "+8% pickup range", icon: "magnet" },
    { id: "rg", name: "Recovery", per: 0.002, text: "heals 0.2% of max HP a second", icon: "medicine" }
  ];
  /* how many moves can be equipped, by stage (Baby, In-Training, Rookie, Champion, Ultimate, Mega) */
  /* focus: an equipped move hits this much harder. A partner used to fire every move it knew (6 to 16 by
   * Champion); now it fires 3 or 4, so each one carries more of the load (scripts/siege-boss-bench.js). */
  var EQUIP = { byStage: [2, 2, 3, 4, 4, 4], focus: 1.75 };
  var PASSIVE_BY = {};
  PASSIVES.forEach(function (p) { PASSIVE_BY[p.id] = p; });

  /* Signature sets (17z33, moves.js SIG_INFO): a move that grows replaces the one it grew from, and
   * the Rookie choice locks the other side (and what it would have grown into) for the run. Both are
   * kept in the skills record itself, so they travel with it everywhere it goes:
   *   skills["!" + id] = 1   locked: the other side of a choice was taken
   *   skills["!" + id] = 2   grown: it became its upgrade and is gone */
  var GONE = "!", LOCKED = 1, GREW = 2;
  function sigOf(data, id) { return (data.SIG_INFO && data.SIG_INFO[id]) || null; }
  function nameOf(data, id) { return (data.WEAPONS && data.WEAPONS[id] && data.WEAPONS[id].name) || id; }
  /* the move this one is cut off by, if a choice upstream went the other way */
  function lockedBy(data, skills, id) {
    var g = sigOf(data, id), guard = 0;
    while (g && guard++ < 8) {
      if (skills && skills[GONE + id] === LOCKED) return g.rival || id;
      if (!g.up) return null;
      id = g.up; g = sigOf(data, id);
    }
    return null;
  }
  /* the side that was taken, or whatever it has grown into since */
  function takenSide(data, skills, taken) {
    var k = taken, n, guard = 0;
    while (k && !(skills && skills[k] > 0) && guard++ < 8) { n = sigOf(data, k); k = n && n.upTo; }
    return k || taken;
  }
  /* after a point goes into a signature move for the first time */
  function learned(data, skills, id) {
    var g = sigOf(data, id), was;
    if (!g || !skills) return;
    if (g.up && skills[g.up] > 0) {
      was = skills[g.up];
      skills[id] = Math.max(skills[id] || 1, Math.round(was * 0.75));   /* most of the old move's levels carry over */
      delete skills[g.up];
      skills[GONE + g.up] = GREW;
    }
    if (g.rival && !(skills[g.rival] > 0)) skills[GONE + g.rival] = LOCKED;
  }
  /* one line for the card / tree: what this move does to the others */
  function sigNote(data, skills, id) {
    var g = sigOf(data, id);
    if (!g) return "";
    if (g.up) return "Grows from " + nameOf(data, g.up) + " (replaces it)";
    if (g.rival) return "Choice: locks " + nameOf(data, g.rival) + " for this run";
    if (g.upTo) return "Grows into " + nameOf(data, g.upTo) + " later";
    return "";
  }

  function metaOf(data, id) { return (data.MOVE_META && data.MOVE_META[id]) || null; }
  function lvOf(skills, id) { return (skills && skills[id]) || 0; }

  /* the whole tree for a form: every move of its line, plus any move learned
   * earlier that the line does not have (kept after a change of line) */
  function tree(data, form, skills) {
    var chain = data.moveChain ? data.moveChain(form) : { stage: 0, primary: [], melee: [], aura: [], orbit: [] };
    for (s = 0; s < SLOTS.length; s++) if (!chain[SLOTS[s]]) chain[SLOTS[s]] = [];
    var out = { stage: chain.stage, family: chain.family, slots: {}, passives: PASSIVES }, s, i, k, m, have = {};
    for (s = 0; s < SLOTS.length; s++) {
      out.slots[SLOTS[s]] = chain[SLOTS[s]].filter(function (e) { return !(skills && skills[GONE + e.id] === GREW); })
        .map(function (e) { have[e.id] = 1; return { id: e.id, tier: e.tier, slot: SLOTS[s] }; });
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
        var lb = lockedBy(data, skills, id);
        if (lb) return "Locked: you took " + nameOf(data, takenSide(data, skills, lb));
        if (e.tier > t.stage) return "Reach " + (STAGE_NAME[e.tier] || "a later form");
        var sg = sigOf(data, id);
        if (sg && sg.up && !(lvOf(skills, sg.up) >= RULES.prereqLevel)) return "Needs " + nameOf(data, sg.up) + " Lv " + RULES.prereqLevel;
        if (MULTI[e.slot]) return null;                              /* signatures and techniques stand on their own */
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
  function autoPick(data, form, skills, slots) {
    var t = tree(data, form, skills), s, i, list, act, best = null, e, g, b;
    /* with a slot count: fill the empty move slots first */
    if (slots && active(data, skills).length < slots) for (s = 0; s < SLOTS.length; s++) {
      list = t.slots[SLOTS[s]];
      for (i = list.length - 1; i >= 0; i--) if (!lvOf(skills, list[i].id) && !blocked(data, form, skills, list[i].id)) return list[i].id;
    }
    /* first (17z33, with the Lv 7 gate): a bigger move this form could have, held back only by the level of
     * the one before it, so raise that one */
    for (s = 0; s < SLOTS.length; s++) {
      list = t.slots[SLOTS[s]];
      for (i = list.length - 1; i >= 0; i--) {
        e = list[i];
        if (lvOf(skills, e.id) || e.tier > t.stage || lockedBy(data, skills, e.id)) continue;
        g = sigOf(data, e.id);
        if (g && g.up) { if (lvOf(skills, g.up) > 0 && lvOf(skills, g.up) < RULES.prereqLevel) return g.up; continue; }
        if (MULTI[SLOTS[s]]) continue;
        b = bestInSlot(data, skills, SLOTS[s], 1);
        if (b && b.tier < e.tier && b.level < RULES.prereqLevel) return b.id;
      }
    }
    /* a new move: with every slot already full, only one that takes over from a smaller one of its kind */
    for (s = 0; s < SLOTS.length; s++) {
      list = t.slots[SLOTS[s]];
      for (i = list.length - 1; i >= 0; i--) if (!lvOf(skills, list[i].id) && !blocked(data, form, skills, list[i].id) && (!slots || (!MULTI[SLOTS[s]] && bestInSlot(data, skills, SLOTS[s], 1)) || (sigOf(data, list[i].id) && sigOf(data, list[i].id).up))) return list[i].id;
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
        pool.push({ id: id, w: lvOf(skills, id) > 0 ? (C.ownedWeight || 2) : (C.newWeight || 3) * (sigOf(data, id) && sigOf(data, id).up ? 2 : 1) });
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

  /* ---------- equipped moves ---------- */
  function slotCount(stageIdx, extra) {
    var l = EQUIP.byStage, i = Math.max(0, Math.min(l.length - 1, stageIdx | 0));
    return l[i] + (extra || 0);
  }
  /* the move that took over from `id`: the bigger one of the same kind, or what a signature grew into */
  function successor(data, id, ids) {
    var m = metaOf(data, id), i, g, k, guard = 0;
    if (m && !MULTI[m.slot]) {
      for (i = 0; i < ids.length; i++) { var mi = metaOf(data, ids[i]); if (mi && mi.slot === m.slot) return ids[i]; }
      return null;
    }
    k = id;
    while (k && guard++ < 8) { g = sigOf(data, k); k = g && g.upTo; if (k && ids.indexOf(k) >= 0) return k; }
    return null;
  }
  /* What is equipped after something changed. prev is the last { list, known, n } (or null the first time).
   * Moves that grew or were replaced keep their place under their new name; a move just learned goes in if
   * there is room; when the number of slots grows (a new stage), the free slots fill up; when it shrinks,
   * the last ones come off. Returns { list, known, n, left }: left = new moves that didn't fit. */
  function fixEquip(data, skills, prev, n) {
    var ids = active(data, skills).map(function (a) { return a.id; }), out = [], left = [], i, id, r, first = !(prev && prev.list);
    var list = first ? ids : prev.list, known = (prev && prev.known) || [], grew = !first && n > (prev.n || 0);
    for (i = 0; i < list.length; i++) {
      id = list[i];
      if (ids.indexOf(id) >= 0) { if (out.indexOf(id) < 0) out.push(id); continue; }
      r = successor(data, id, ids);
      if (r && out.indexOf(r) < 0 && list.indexOf(r) < 0) out.push(r);
    }
    for (i = 0; i < ids.length; i++) {
      id = ids[i];
      if (out.indexOf(id) >= 0) continue;
      var isNew = known.indexOf(id) < 0 && successorOfAny(id);
      if (out.length < n && (first || grew || isNew)) out.push(id);
      else if (isNew && !first) left.push(id);
    }
    /* a move counts as new unless it simply took over from one that was known */
    function successorOfAny(id2) { for (var j = 0; j < known.length; j++) if (successor(data, known[j], [id2]) === id2) return false; return true; }
    return { list: out.slice(0, n), known: ids, n: n, left: left };
  }

  /* a player's swap: put `id` on (taking `drop` off if every slot is full), or take it off with off = true.
   * `ids` are the moves it could use (active). Returns { ok, list } or { ok: false, reason }. */
  function applyEquip(list, ids, id, drop, off, n) {
    list = (list || []).slice();
    if (ids.indexOf(id) < 0) return { ok: false, reason: "Learn that move first" };
    if (off) {
      if (list.indexOf(id) < 0) return { ok: false, reason: "Not equipped" };
      if (list.length <= 1) return { ok: false, reason: "Keep at least one move" };
      list.splice(list.indexOf(id), 1);
      return { ok: true, list: list };
    }
    if (list.indexOf(id) >= 0) return { ok: false, reason: "Already equipped" };
    if (list.length >= n) {
      if (!drop || list.indexOf(drop) < 0) return { ok: false, reason: "Every slot is full: pick a move to swap out" };
      list[list.indexOf(drop)] = id;
    } else list.push(id);
    return { ok: true, list: list };
  }

  var api = { MAX: MAX, MULTI: MULTI, SLOTS: SLOTS, SLOT_NAME: SLOT_NAME, STAGE_NAME: STAGE_NAME, RULES: RULES, PASSIVES: PASSIVES, PASSIVE_BY: PASSIVE_BY,
    tree: tree, blocked: blocked, active: active, moveLevel: moveLevel, passiveMul: passiveMul, autoPick: autoPick, bestInSlot: bestInSlot, offer: offer,
    learned: learned, sigNote: sigNote, GONE: GONE, EQUIP: EQUIP, slotCount: slotCount, fixEquip: fixEquip, applyEquip: applyEquip };
  if (root.DBH) root.DBH.SKILLS = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
