/* Elements (Nov 16). No gear: a Digimon's element is what it is, and its
 * moves carry that element.
 *
 * Two layers multiply together on every hit, both ways (partner on enemy,
 * enemy on partner):
 *
 *   Attribute triangle   Vaccine > Virus > Data > Vaccine
 *                        with the edge x1.2, against it x0.85.
 *                        Free / Unknown / None are neutral.
 *
 *   Element table        ten elements (the move families).
 *                        Strong x1.5. If the defender's element is strong
 *                        against yours, your hit is resisted x0.75.
 *                        Same element x0.5.
 *
 *     fire    beats ice, nature, machine
 *     ice     beats wind, nature, water
 *     water   beats fire, machine
 *     nature  beats water, slime
 *     wind    beats beast, slime
 *     machine beats beast, wind, ice
 *     beast   beats nature, dark
 *     slime   beats machine, fire, holy
 *     dark    beats holy, beast
 *     holy    beats dark, slime      (dark/holy and slime/holy hurt each other)
 *
 * Bubble Blow and Headbutt have no element (only the triangle applies).
 * A total of x1.2 or more floats "Weak!", x0.85 or less floats "Resist".
 */
(function (root) {
  "use strict";
  var D = root.DBH || null;
  var CFG = { strong: 1.5, resist: 0.75, same: 0.5, attrEdge: 1.2, attrBehind: 0.85, weakFloat: 1.2, resistFloat: 0.85, floatGap: 0.7 };
  var ORDER = ["fire", "ice", "water", "nature", "wind", "machine", "beast", "slime", "dark", "holy"];
  var NAMES = { fire: "Fire", ice: "Ice", water: "Water", nature: "Nature", wind: "Wind", machine: "Machine", beast: "Beast", slime: "Slime", dark: "Dark", holy: "Holy" };
  var COLORS = { fire: "#ff8a2a", ice: "#7ecbff", water: "#4aa7ff", nature: "#6fc24a", wind: "#8fe0d0", machine: "#9aa7b8", beast: "#d0a060", slime: "#8a9a3a", dark: "#a060d0", holy: "#ffe27a" };
  var BEATS = {
    fire: ["ice", "nature", "machine"],
    ice: ["wind", "nature", "water"],
    water: ["fire", "machine"],
    nature: ["water", "slime"],
    wind: ["beast", "slime"],
    machine: ["beast", "wind", "ice"],
    beast: ["nature", "dark"],
    slime: ["machine", "fire", "holy"],
    dark: ["holy", "beast"],
    holy: ["dark", "slime"]
  };
  var ATTR_BEATS = { Vaccine: "Virus", Virus: "Data", Data: "Vaccine" };
  var NEUTRAL_MOVES = { bubbleBlow: 1, headbutt: 1, byteBurst: 1, bubbleTrap: 1, glitchChain: 1, pixelMeteor: 1 };

  function beats(a, b) { return !!(BEATS[a] && BEATS[a].indexOf(b) >= 0); }
  /* element of the attack against element of the defender */
  function elementMul(atk, def) {
    if (!atk || !def || !BEATS[atk] || !BEATS[def]) return 1;
    if (beats(atk, def)) return CFG.strong;
    if (atk === def) return CFG.same;
    if (beats(def, atk)) return CFG.resist;
    return 1;
  }
  function attrMul(a, d) {
    if (!a || !d) return 1;
    if (ATTR_BEATS[a] === d) return CFG.attrEdge;
    if (ATTR_BEATS[d] === a) return CFG.attrBehind;
    return 1;
  }
  function weakTo(el) { return ORDER.filter(function (o) { return beats(o, el); }); }

  /* --- lookups that need the game's data --- */
  var moveEl = null;
  function buildMoves() {
    var F = D && D.MOVE_FAMILIES, L = D && D.MOVE_LINES, k, i, ln;
    moveEl = {};
    if (!F) return;
    function put(id, fam) { if (id && !NEUTRAL_MOVES[id]) moveEl[id] = fam; }
    function putLine(id, fam) { if (id && !NEUTRAL_MOVES[id] && !moveEl[id]) moveEl[id] = fam; }   /* a shared move keeps its first owner's element */
    for (k in L || {}) {
      ln = L[k];
      for (i = 0; i < 6; i++) { putLine(ln.primary[i], ln.family); putLine(ln.melee[i], ln.family); }
      putLine(ln.aura, ln.family); putLine(ln.orbit, ln.family); putLine(ln.special, ln.family);
    }
    for (k in F) put(F[k].special, k);
    /* a family's own moves always carry that family's element */
    for (k in F) for (i = 0; i < F[k].ids.length; i++) put(F[k].ids[i], k);
  }
  function node(id) {
    var T = root.EVO_TREE;
    return (T && T.species && T.species[id]) || null;
  }
  var elCache = {}, attrCache = {};
  /* the element of a Digimon (partner form or enemy kind) */
  function elementOf(id) {
    if (!id || !D) return null;
    if (elCache[id] !== undefined) return elCache[id];
    var sp = D.SPECIES && D.SPECIES[id], out = null;
    if (sp && sp.hatchTo) out = null;                       /* eggs */
    else if (D.moveFamilyOf) out = D.moveFamilyOf(id);
    return (elCache[id] = out);
  }
  function attributeOf(id) {
    if (!id || !D) return null;
    if (attrCache[id] !== undefined) return attrCache[id];
    var sp = D.SPECIES && D.SPECIES[id], en = D.ENEMIES && D.ENEMIES[id], n = node(id);
    return (attrCache[id] = (sp && sp.attribute) || (en && en.attribute) || (n && n.attribute) || null);
  }
  function moveElement(wid, attackerId) {
    if (!moveEl) buildMoves();
    if (wid && NEUTRAL_MOVES[wid]) return null;
    if (wid && moveEl[wid]) return moveEl[wid];
    return elementOf(attackerId);
  }
  /* Total multiplier for a hit. wid may be null (a plain body hit: the
   * attacker's own element). */
  function mult(wid, attackerId, defenderId) {
    return elementMul(moveElement(wid, attackerId), elementOf(defenderId)) * attrMul(attributeOf(attackerId), attributeOf(defenderId));
  }
  function verdict(m) { return m >= CFG.weakFloat ? "weak" : (m <= CFG.resistFloat ? "resist" : null); }

  var api = { CFG: CFG, ORDER: ORDER, NAMES: NAMES, COLORS: COLORS, BEATS: BEATS, ATTR_BEATS: ATTR_BEATS,
    elementMul: elementMul, attrMul: attrMul, weakTo: weakTo, elementOf: elementOf, attributeOf: attributeOf,
    moveElement: moveElement, mult: mult, verdict: verdict };
  if (D) D.ELEMENTS = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
