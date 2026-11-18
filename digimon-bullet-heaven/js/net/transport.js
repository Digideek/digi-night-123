/* Transport interface. Local + a lossy simulator for dev. WebSocket and
 * WebRTC skeletons are behind config and do not open ports or connect
 * unless a later host explicitly enables them (not authorized here).
 */
(function (global) {
  "use strict";
  var isNode = typeof module === "object" && module.exports;
  var root = isNode ? global : window;
  var D = (root.DBH = root.DBH || {});

  function Base() {
    this._handlers = [];
    this.role = "client";
  }
  Base.prototype.subscribe = function (fn) { this._handlers.push(fn); return fn; };
  Base.prototype.unsubscribe = function (fn) {
    this._handlers = this._handlers.filter(function (h) { return h !== fn; });
  };
  Base.prototype._emit = function (msg) {
    var list = this._handlers.slice(), i;
    for (i = 0; i < list.length; i++) list[i](msg);
  };
  Base.prototype.connect = function () { return this; };
  Base.prototype.close = function () {};
  Base.prototype.send = function (msg) { this._emit(msg); };

  function LocalTransport() { Base.call(this); }
  LocalTransport.prototype = Object.create(Base.prototype);
  LocalTransport.prototype.constructor = LocalTransport;

  /* Bidirectional in-process pair (client <-> authority). */
  function LoopbackPair() {
    this.a = new LocalTransport();
    this.b = new LocalTransport();
    var self = this;
    var aSend = this.a.send.bind(this.a);
    var bSend = this.b.send.bind(this.b);
    this.a.send = function (msg) { bSend(msg); };
    this.b.send = function (msg) { aSend(msg); };
  }

  function SimulatedTransport(opts) {
    Base.call(this);
    this.opts = {
      latencyMs: (opts && opts.latencyMs) != null ? opts.latencyMs : 150,
      jitterMs: (opts && opts.jitterMs) != null ? opts.jitterMs : 20,
      loss: (opts && opts.loss) != null ? opts.loss : 0.1,
      seed: (opts && opts.seed) || 1
    };
    this._peer = null;
    this._q = [];
    this._rng = (function (s) {
      return function () {
        s = (s + 0x6D2B79F5) >>> 0;
        var t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    })(this.opts.seed);
    this.now = (opts && opts.now) || function () {
      return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    };
  }
  SimulatedTransport.prototype = Object.create(Base.prototype);
  SimulatedTransport.prototype.constructor = SimulatedTransport;
  SimulatedTransport.prototype.attachPeer = function (peer) { this._peer = peer; };
  SimulatedTransport.prototype.setSim = function (opts) { Object.assign(this.opts, opts || {}); };
  SimulatedTransport.prototype.send = function (msg) {
    if (this._rng() < this.opts.loss) return; /* drop */
    var delay = this.opts.latencyMs + (this._rng() * 2 - 1) * this.opts.jitterMs;
    if (delay < 0) delay = 0;
    /* Reorder possible when jitter exceeds spacing. */
    this._q.push({ at: this.now() + delay, msg: msg });
    this._q.sort(function (a, b) { return a.at - b.at; });
  };
  SimulatedTransport.prototype.flush = function (now) {
    now = now != null ? now : this.now();
    var i, rec, delivered = 0;
    while (this._q.length && this._q[0].at <= now) {
      rec = this._q.shift();
      if (this._peer) this._peer._emit(rec.msg);
      else this._emit(rec.msg);
      delivered++;
    }
    return delivered;
  };

  function pairSimulated(opts) {
    var c = new SimulatedTransport(Object.assign({ seed: 1 }, opts));
    var s = new SimulatedTransport(Object.assign({ seed: 2 }, opts));
    c.attachPeer(s);
    s.attachPeer(c);
    return { client: c, server: s };
  }

  function WebSocketTransport(opts) {
    Base.call(this);
    this.opts = opts || {};
    this.url = this.opts.url || null;
    this._ws = null;
    this.enabled = !!this.opts.enable;
  }
  WebSocketTransport.prototype = Object.create(Base.prototype);
  WebSocketTransport.prototype.connect = function () {
    /* Intentionally a no-op unless enable+url are set by a private host.
     * This project does not open ports or connect to a public endpoint. */
    if (!this.enabled || !this.url) return this;
    return this;
  };
  WebSocketTransport.prototype.send = function () { /* not connected */ };

  function WebRTCTransport(opts) {
    Base.call(this);
    this.opts = opts || {};
    this.enabled = !!this.opts.enable;
    /* iceServers / TURN would go here when a private host configures them. */
    this.iceServers = this.opts.iceServers || [];
  }
  WebRTCTransport.prototype = Object.create(Base.prototype);
  WebRTCTransport.prototype.connect = function () {
    if (!this.enabled) return this;
    return this;
  };
  WebRTCTransport.prototype.send = function () { /* not connected */ };

  var api = {
    LocalTransport: LocalTransport,
    LoopbackPair: LoopbackPair,
    SimulatedTransport: SimulatedTransport,
    pairSimulated: pairSimulated,
    WebSocketTransport: WebSocketTransport,
    WebRTCTransport: WebRTCTransport
  };
  D.net = D.net || {};
  D.net.transport = api;
  if (isNode) module.exports = api;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
