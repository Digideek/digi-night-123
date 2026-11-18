/* Storage provider interface: local cache + a cloud-save stub.
 * Game code should keep using D.storage.*; this module adds identity,
 * a swappable provider, and a Firebase/Supabase-shaped stub that does
 * not connect. No accounts are provisioned.
 */
(function (global) {
  "use strict";

  var isNode = typeof module === "object" && module.exports;
  var D = ((isNode ? global : global) && (global.DBH = global.DBH || {})) || {};
  D = global.DBH;

  function LocalProvider(store) {
    this.store = store || (D.storage);
  }
  LocalProvider.prototype.name = "local";
  LocalProvider.prototype.loadProfile = function () { return this.store.loadProfile(); };
  LocalProvider.prototype.saveProfile = function (data) { return this.store.saveProfile(data); };
  LocalProvider.prototype.loadSettings = function () { return this.store.loadSettings(); };
  LocalProvider.prototype.saveSettings = function (data) { return this.store.saveSettings(data); };
  LocalProvider.prototype.loadCosmetics = function () { return this.store.loadCosmetics(); };
  LocalProvider.prototype.saveCosmetics = function (data) { return this.store.saveCosmetics(data); };
  LocalProvider.prototype.clearAll = function () { return this.store.clear(); };

  /* Cloud stub — same method names, never hits a network. Ready to be
   * replaced with a Firebase/Supabase adapter that talks per player id. */
  function CloudSaveStub(opts) {
    this.opts = opts || {};
    this.name = "cloud-stub";
    this.connected = false;
  }
  CloudSaveStub.prototype._no = function () {
    return Promise.resolve({ ok: false, reason: "Cloud saves are not connected. Playing as a local guest." });
  };
  CloudSaveStub.prototype.connect = function () { return this._no(); };
  CloudSaveStub.prototype.loadProfile = function () { return this._no(); };
  CloudSaveStub.prototype.saveProfile = function () { return this._no(); };
  CloudSaveStub.prototype.loadSettings = function () { return this._no(); };
  CloudSaveStub.prototype.saveSettings = function () { return this._no(); };
  CloudSaveStub.prototype.loadCosmetics = function () { return this._no(); };
  CloudSaveStub.prototype.saveCosmetics = function () { return this._no(); };
  CloudSaveStub.prototype.clearAll = function () { return this._no(); };

  var GUEST_KEY = "dbh_identity_v1";

  function guestIdentity() {
    var id = "guest-local";
    try {
      var raw = (typeof localStorage !== "undefined") && localStorage.getItem(GUEST_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.id) return parsed;
      }
      id = "guest-" + Math.random().toString(36).slice(2, 10);
      var rec = { id: id, kind: "guest", name: "Guest" };
      if (typeof localStorage !== "undefined") localStorage.setItem(GUEST_KEY, JSON.stringify(rec));
      return rec;
    } catch (e) {
      return { id: id, kind: "guest", name: "Guest" };
    }
  }

  var identity = { id: "guest-local", kind: "guest", name: "Guest" };
  var provider = null;
  var cloud = new CloudSaveStub();

  function install(opts) {
    opts = opts || {};
    identity = guestIdentity();
    provider = opts.provider || new LocalProvider(D.storage);
    D.storageProvider = api;
    return api;
  }

  var api = {
    LocalProvider: LocalProvider,
    CloudSaveStub: CloudSaveStub,
    install: install,
    identity: function () { return identity; },
    provider: function () { return provider; },
    cloud: function () { return cloud; },
    /* Merge helper for a later cloud pull: never silently discard a richer guest save. */
    mergeCosmetics: function (local, remote) {
      local = local || {};
      remote = remote || {};
      var bits = Math.max(local.digiBits || 0, remote.digiBits || 0);
      var unlocked = Object.assign({}, remote.unlocked || {}, local.unlocked || {});
      var equipped = local.equipped || remote.equipped || null;
      return { digiBits: bits, unlocked: unlocked, equipped: equipped, legendaryDropped: !!(local.legendaryDropped || remote.legendaryDropped) };
    }
  };

  if (!isNode) {
    if (typeof document !== "undefined") {
      document.addEventListener("DOMContentLoaded", function () { install(); });
    } else install();
  } else {
    install();
    module.exports = api;
  }
  D.storageProvider = api;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
