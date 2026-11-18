/* Digimon Bullet Heaven — developer lock (Nov 13).
 *
 * Debug mode (requirement lists, forced evolutions, the debug panel) is
 * locked. Only the passcode unlocks it:  index.html?debug=<passcode>
 * After that, the same browser can use plain ?debug=1. Use ?debug=off to
 * forget this browser. Only a SHA-256 hash of the passcode is stored here.
 */
(function (global) {
  "use strict";
  var D = global.DBH = global.DBH || {};
  var HASH = "863682d4aa954b1b15fbce69e6af21ec1abee652abf50a69a264a3b7c6d809df";
  var KEY = "dbh_dev_unlock_v1";

  /* Compact synchronous SHA-256 (UTF-8 input, hex output). */
  function sha256(str) {
    var K = [], H = [], i, j;
    function frac(x) { return ((x - Math.floor(x)) * 4294967296) | 0; }
    var n = 2, found = 0;
    while (found < 64) {
      var prime = true;
      for (j = 2; j * j <= n; j++) if (n % j === 0) { prime = false; break; }
      if (prime) { if (found < 8) H[found] = frac(Math.pow(n, 1 / 2)); K[found] = frac(Math.pow(n, 1 / 3)); found++; }
      n++;
    }
    var bytes = unescape(encodeURIComponent(str)), len = bytes.length;
    var words = [];
    for (i = 0; i < len; i++) words[i >> 2] |= (bytes.charCodeAt(i) & 255) << (24 - (i % 4) * 8);
    words[len >> 2] |= 0x80 << (24 - (len % 4) * 8);
    words[(((len + 8) >> 6) << 4) + 15] = len * 8;
    function rot(x, r) { return (x >>> r) | (x << (32 - r)); }
    var W = [], a, b, c, d, e, f, g, h, t1, t2;
    for (i = 0; i < words.length; i += 16) {
      a = H[0]; b = H[1]; c = H[2]; d = H[3]; e = H[4]; f = H[5]; g = H[6]; h = H[7];
      for (j = 0; j < 64; j++) {
        if (j < 16) W[j] = words[i + j] | 0;
        else {
          var s0 = rot(W[j - 15], 7) ^ rot(W[j - 15], 18) ^ (W[j - 15] >>> 3);
          var s1 = rot(W[j - 2], 17) ^ rot(W[j - 2], 19) ^ (W[j - 2] >>> 10);
          W[j] = (W[j - 16] + s0 + W[j - 7] + s1) | 0;
        }
        t1 = (h + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[j] + W[j]) | 0;
        t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    var out = "";
    for (i = 0; i < 8; i++) out += ("00000000" + (H[i] >>> 0).toString(16)).slice(-8);
    return out;
  }

  function stored() { try { return global.localStorage.getItem(KEY); } catch (e) { return null; } }
  function store(v) { try { if (v) global.localStorage.setItem(KEY, v); else global.localStorage.removeItem(KEY); } catch (e) {} }

  /* Returns true only for the passcode, or for a browser it already unlocked. */
  function allowDebug(value) {
    if (value == null || value === "") return false;
    if (value === "off" || value === "0") { store(null); return false; }
    if (sha256("dbh-dev:" + value) === HASH) { store(HASH); return true; }
    if ((value === "1" || value === "true") && stored() === HASH) return true;
    return false;
  }

  D.devLock = { allowDebug: allowDebug, sha256: sha256 };
  if (typeof module !== "undefined" && module.exports) module.exports = D.devLock;
})(typeof window !== "undefined" ? window : globalThis);
