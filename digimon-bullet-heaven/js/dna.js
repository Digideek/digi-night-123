/* DNA digivolution (Nov 16): two tamers, two partners, one moment.
 *
 * Two players whose partners are the two halves of a pair stand close
 * together. One presses J (and picks a result if the pair has more than
 * one); the other gets a prompt, picks their own result and accepts, or
 * declines. Nothing happens without both. Each partner becomes the form
 * its own tamer picked.
 *
 * It still has to be earned: both partners need the pair's level and time
 * in their current form (DNA.gates, by the stage of the two halves).
 *
 * If a DNA partner is knocked down it drops back to the form it had before;
 * the other one keeps its DNA form. Digivolving onward from a DNA form
 * makes it permanent.
 *
 * A pair is only offered when both halves and at least one result are in
 * the roster, so the entries marked "needs art" switch themselves on the
 * day those sprites are added.
 */
(function (root) {
  "use strict";
  var D = root.DBH || (root.DBH = {});
  var PAIRS = [
    { a: "exveemon", b: "stingmon", to: ["paildramon", "dinobeemon"] },
    { a: "aquilamon", b: "gatomon", to: ["silphymon"] },
    { a: "ankiromon", b: "angemon", to: ["shakkoumon"] },
    { a: "exveemon", b: "tyrannomon", to: ["megadramon", "paildramon"] },      /* virtual pet (Pendulum Progress) pairing */
    /* needs art: the results below are not in the roster yet */
    { a: "wargreymon", b: "metalgarurumon", to: ["omnimon"] },
    { a: "angewomon", b: "ladydevimon", to: ["mastemon"] },
    { a: "kimeramon", b: "machinedramon", to: ["millenniummon"] },
    { a: "apollomon", b: "dianamon", to: ["gracenovamon"] }
  ];
  var CFG = {
    range: 110,            /* how close the two partners must be */
    answerRange: 220,      /* they may drift a little while the other decides */
    offerTime: 15,         /* seconds the prompt stays up */
    retry: 12,             /* seconds before the same tamer can ask again after a no */
    gates: {               /* by stage of the two halves: level and seconds in the current form */
      Champion: { level: 16, time: 300 },
      Armor: { level: 16, time: 300 },
      Ultimate: { level: 24, time: 480 },
      Mega: { level: 30, time: 600 }
    }
  };
  function has(id) { return !!(D.SPECIES && D.SPECIES[id]); }
  function results(pair) { return pair.to.filter(has); }
  /* the pair two forms make, or null */
  function find(fa, fb) {
    var i, p;
    for (i = 0; i < PAIRS.length; i++) {
      p = PAIRS[i];
      if (((p.a === fa && p.b === fb) || (p.a === fb && p.b === fa)) && results(p).length) return p;
    }
    return null;
  }
  function gateFor(form) {
    var sp = D.SPECIES && D.SPECIES[form], k = sp && (sp.stageKey || sp.stage);
    return CFG.gates[k] || CFG.gates.Champion;
  }
  /* live pairs, for docs and tests */
  function active() { return PAIRS.filter(function (p) { return has(p.a) && has(p.b) && results(p).length; }); }
  D.DNA = { PAIRS: PAIRS, CFG: CFG, find: find, results: results, gateFor: gateFor, active: active };
  if (typeof module !== "undefined" && module.exports) module.exports = D.DNA;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
