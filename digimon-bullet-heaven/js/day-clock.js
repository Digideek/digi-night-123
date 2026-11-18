/* Digi Night — the day clock, in one place.
 *
 * A day is DAY_SECONDS of battle time. periodOfCycle names the part of the
 * day from how far through it the run is (0..1); periodOfHour does the same
 * from a wall-clock hour. Used by rarity.js (evolution), net/rarity-sim.js
 * (the host's copy of the same rules) and seasons.js (the sky, the night).
 * These used to be written out separately in each of those files.
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});

  var DAY_SECONDS = 180;

  function periodOfHour(hour) {
    hour = ((hour % 24) + 24) % 24;
    if (hour >= 5 && hour < 7) return "dawn";
    if (hour >= 7 && hour < 11) return "morning";
    if (hour >= 11 && hour < 16) return "midday";
    if (hour >= 16 && hour < 19) return "dusk";
    return "night";
  }

  function periodOfCycle(frac) {
    frac = ((frac % 1) + 1) % 1;
    if (frac < 0.12) return "dawn";
    if (frac < 0.38) return "morning";
    if (frac < 0.58) return "midday";
    if (frac < 0.76) return "dusk";
    return "night";
  }

  var api = { DAY_SECONDS: DAY_SECONDS, DUSK_AT: 0.58, NIGHT_AT: 0.76, periodOfHour: periodOfHour, periodOfCycle: periodOfCycle };
  D.dayClock = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
