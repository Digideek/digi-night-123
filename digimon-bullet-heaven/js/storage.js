/* Single persistence gate. Game code must use these helpers, never localStorage.
 * load/save/clear return Promises so a later Firebase/Supabase adapter is a drop-in.
 */
(function (global) {
  "use strict";

  var PROFILE_KEY = "dbh_save_v1";
  var SETTINGS_KEY = "dbh_settings_v1";
  var COSMETICS_KEY = "dbh_cosmetics_v1";

  function read(key) {
    return new Promise(function (resolve) {
      try {
        var raw = localStorage.getItem(key);
        if (!raw) { resolve(null); return; }
        resolve(JSON.parse(raw));
      } catch (e) {
        resolve(null);
      }
    });
  }

  function write(key, value) {
    return new Promise(function (resolve) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        resolve(true);
      } catch (e) {
        resolve(false);
      }
    });
  }

  function remove(key) {
    return new Promise(function (resolve) {
      try { localStorage.removeItem(key); } catch (e) {}
      resolve(true);
    });
  }

  global.DBH = global.DBH || {};
  global.DBH.storage = {
    loadProfile: function () { return read(PROFILE_KEY); },
    saveProfile: function (data) { return write(PROFILE_KEY, data); },
    clearProfile: function () { return remove(PROFILE_KEY); },
    loadSettings: function () { return read(SETTINGS_KEY); },
    saveSettings: function (data) { return write(SETTINGS_KEY, data); },
    clearSettings: function () { return remove(SETTINGS_KEY); },
    clear: function () {
      return Promise.all([remove(PROFILE_KEY), remove(SETTINGS_KEY), remove(COSMETICS_KEY)]);
    },
    loadCosmetics: function () { return read(COSMETICS_KEY); },
    saveCosmetics: function (data) { return write(COSMETICS_KEY, data); },
    clearCosmetics: function () { return remove(COSMETICS_KEY); },
    emptyCosmetics: function () {
      return (global.DBH.cosmetics && global.DBH.cosmetics.emptyState)
        ? global.DBH.cosmetics.emptyState()
        : { digiBits: 0, unlocked: { "title-tamer": true, "digivice-standard": true, "farm-isle": true }, equipped: { title: "title-tamer", digivice: "digivice-standard", farm: "farm-isle" }, legendaryDropped: false, settledPayouts: {} };
    },
    normalizeCosmetics: function (raw) {
      if (global.DBH.cosmetics && global.DBH.cosmetics.normalize) return global.DBH.cosmetics.normalize(raw);
      var d = raw || {};
      var unlocked = d.unlocked && typeof d.unlocked === "object" ? d.unlocked : {};
      if (!unlocked["title-tamer"]) unlocked["title-tamer"] = true;
      if (!unlocked["digivice-standard"]) unlocked["digivice-standard"] = true;
      if (!unlocked["farm-isle"]) unlocked["farm-isle"] = true;
      return {
        digiBits: Math.max(0, d.digiBits | 0),
        unlocked: unlocked,
        equipped: {
          title: (d.equipped && d.equipped.title) || "title-tamer",
          digivice: (d.equipped && d.equipped.digivice) || "digivice-standard",
          farm: (d.equipped && d.equipped.farm) || "farm-isle"
        },
        legendaryDropped: !!(d && d.legendaryDropped),
        settledPayouts: (d && d.settledPayouts && typeof d.settledPayouts === "object") ? d.settledPayouts : {}
      };
    },
    /* Profile may include discoveries: { species: {id: {tier,at,from}}, edges: {from>to:kind: {tier,at}} } */
    emptyDiscoveries: function () { return { species: {}, edges: {} }; },
    normalizeDiscoveries: function (raw) {
      var d = raw || {};
      return {
        species: d.species && typeof d.species === "object" ? d.species : {},
        edges: d.edges && typeof d.edges === "object" ? d.edges : {}
      };
    }
  };
})(window);
