/* Digi Night: the Rookie you bring to Versus (17z33, Isaac).
 *
 * In Versus everyone starts as a Rookie instead of an egg. Agumon, Gabumon and Veemon (data.js VERSUS.start)
 * are always there; any other Rookie joins them once you've raised it to Rookie in the Hatchery (Isaac: the
 * Hatchery only, not runs; hatchery.js rookies()). Only Rookies with a line that goes all the way to Mega
 * are offered, so everyone can get there. The pick is kept in localStorage and sent with your profile card
 * (profile.js `vr`); the host's sim checks it is a real Rookie (versus-sim.js _vsRookie) and falls back to
 * Agumon if not. Picked in the lobby when the host's mode is Versus (online-ui.js).
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});
  var KEY = "dbh_vs_rookie";

  function tree() { return D.EVO_TREE || global.EVO_TREE || null; }
  function stageOf(id) { var T = tree(), sp = T && T.species && T.species[id]; return sp ? sp.stage : null; }
  /* the standard line from a Rookie reaches Mega */
  function reachesMega(id) {
    var T = tree(), f = id, i, j, list, nx;
    if (!T || !T.branches) return false;
    for (i = 0; i < 4; i++) {
      list = T.branches[f] || []; nx = null;
      for (j = 0; j < list.length; j++) if (list[j].kind === "standard" && list[j].to && D.SPECIES && D.SPECIES[list[j].to]) { nx = list[j].to; break; }
      if (!nx) return false;
      if (stageOf(nx) === "Mega") return true;
      f = nx;
    }
    return false;
  }
  function usable(id) { return !!(id && D.SPECIES && D.SPECIES[id] && stageOf(id) === "Rookie" && reachesMega(id)); }
  function defaults() { return ((D.VERSUS && D.VERSUS.start) || ["agumon", "gabumon", "veemon"]).filter(usable); }
  function name(id) { var sp = D.SPECIES && D.SPECIES[id]; return (sp && sp.name) || id; }
  /* every Rookie you can bring: the three, then the ones you've raised, by name */
  function list() {
    var out = defaults(), have = {}, raised = D.hatchery && D.hatchery.rookies ? D.hatchery.rookies() : [], i, k, more = [];
    out.forEach(function (id) { have[id] = 1; });
    for (i = 0; i < raised.length; i++) { k = raised[i]; if (!have[k] && usable(k)) { have[k] = 1; more.push(k); } }
    more.sort(function (a, b) { return name(a).localeCompare(name(b)); });
    return out.concat(more);
  }
  function get() {
    var id = null, l = list();
    try { id = global.localStorage ? global.localStorage.getItem(KEY) : null; } catch (e) { id = null; }
    return l.indexOf(id) >= 0 ? id : l[0];
  }
  function set(id) {
    if (list().indexOf(id) < 0) return false;
    try { if (global.localStorage) global.localStorage.setItem(KEY, id); } catch (e) {}
    /* everyone (and the host's sim) learns it with your profile card */
    var N = D.online;
    if (N && N.role && N.role() && N.setProfile && D.profile && D.profile.card) N.setProfile(D.profile.card());
    return true;
  }
  function step(d) { var l = list(), i = l.indexOf(get()); return set(l[(i + d + l.length * 4) % l.length]) ? get() : null; }
  function isDefault(id) { return defaults().indexOf(id) >= 0; }

  D.vsRookie = { list: list, get: get, set: set, step: step, name: name, usable: usable, isDefault: isDefault };
  if (typeof module !== "undefined" && module.exports) module.exports = D.vsRookie;
})(typeof window !== "undefined" ? window : globalThis);
