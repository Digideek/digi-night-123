/* Egg lines (Nov 16): an egg for every Baby Digimon in the game.
 *
 * The two hand-written lines in data.js (Agumon via Botamon, Gabumon via
 * Punimon) stay as they are. Every other Baby I in the evolution tree gets
 * an egg here: a Digitama species that hatches into it, and an entry in
 * DBH.EGGS for the picker. Five are open from the start; the others open
 * by defeating that Baby in the wild (EGG_UNLOCK in data.js).
 *
 * Shell art is "egg_<baby>" (ten patterns each, scripts/art/make_eggs.py).
 */
(function (root) {
  "use strict";
  var D = root.DBH;
  if (!D || !D.EGGS || !D.SPECIES) return;
  var TREE = D.EVO_TREE || (typeof EVO_TREE !== "undefined" ? EVO_TREE : null);
  if (!TREE || !TREE.species) return;

  function nameOf(id) { return (D.SPECIES[id] && D.SPECIES[id].name) || (TREE.species[id] && TREE.species[id].name) || id; }
  function nextOf(id) {
    var list = (TREE.branches && TREE.branches[id]) || [], i;
    for (i = 0; i < list.length; i++) if (list[i].kind === "standard" && list[i].to) return list[i].to;
    return null;
  }

  var have = {}, i, ids = [], id, base = D.SPECIES.digitama_agumon, next, after, blurb;
  for (i = 0; i < D.EGGS.length; i++) { have[D.EGGS[i].hatch] = 1; delete D.EGGS[i].unlockId; }   /* nothing is locked any more */
  for (id in TREE.species) if (TREE.species[id].stage === "Baby I" && D.SPECIES[id] && !have[id]) ids.push(id);
  ids.sort(function (a, b) { return nameOf(a) < nameOf(b) ? -1 : 1; });

  for (i = 0; i < ids.length; i++) {
    id = ids[i];
    next = nextOf(id); after = next && nextOf(next);
    blurb = "Hatches into " + nameOf(id) + (next ? ", then " + nameOf(next) : "") + (after ? ", then " + nameOf(after) : "") + ".";
    D.SPECIES["digitama_" + id] = {
      id: "digitama_" + id, name: "Digitama", stage: "Egg", line: id,
      color: D.SPECIES[id].color || "#c0c4d0", belly: "#f3ecd8", radius: 10,
      base: base ? JSON.parse(JSON.stringify(base.base)) : { maxHp: 70, speed: 42, magnet: 70, damage: 1 },
      startWeapon: null, eggFrame: "egg_" + id, hatchTo: id, evolutions: []
    };
    if (D.LINES) D.LINES[id] = { egg: "digitama_" + id, baby: id, training: next || id, rookie: after || next || id, champion: (after && nextOf(after)) || after || next || id };
    D.EGGS.push({ id: id, name: nameOf(id) + " Egg", egg: "digitama_" + id, hatch: id, frame: "egg_" + id, blurb: blurb });
  }
  /* five are open from the start; the rest are earned (see EGG_UNLOCK) */
  var starters = (D.EGG_UNLOCK && D.EGG_UNLOCK.starters) || ["agumon", "gabumon"];
  for (i = 0; i < D.EGGS.length; i++) D.EGGS[i].starter = starters.indexOf(D.EGGS[i].id) >= 0;
  D.EGGS.sort(function (a, b) { return (b.starter ? 1 : 0) - (a.starter ? 1 : 0); });
  D.EGG_LINE_COUNT = D.EGGS.length;
})(typeof window !== "undefined" ? window : globalThis);
