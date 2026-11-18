/* Client prediction (own tamer), interpolation buffer for remotes,
 * and input redundancy (resend last N). Does not take over solo play
 * unless ?net=sim is on and a sim session is started.
 */
(function (global) {
  "use strict";
  var isNode = typeof module === "object" && module.exports;
  var root = isNode ? global : window;
  var D = (root.DBH = root.DBH || {});

  function NetClient(opts) {
    opts = opts || {};
    this.id = opts.id || "local";
    this.transport = opts.transport;
    this.interpMs = opts.interpMs || 100;
    this.predSpeed = opts.speed || 168;
    this.seq = 0;
    this.history = [];
    this.predicted = { x: 0, y: 0 };
    this.buffer = [];
    this.acked = 0;
    this.lastSnap = null;
    var self = this;
    if (this.transport && this.transport.subscribe) {
      this.transport.subscribe(function (msg) { self.onMessage(msg); });
    }
  }

  NetClient.prototype.queueInput = function (x, y, atk) {
    this.seq += 1;
    var inp = { seq: this.seq, x: x || 0, y: y || 0, atk: !!atk };
    this.history.push(inp);
    if (this.history.length > 24) this.history.shift();
    /* Client-side prediction for own tamer. */
    var len = Math.sqrt(inp.x * inp.x + inp.y * inp.y);
    var nx = len > 1 ? inp.x / len : inp.x, ny = len > 1 ? inp.y / len : inp.y;
    this.predicted.x += nx * this.predSpeed * (1 / 25);
    this.predicted.y += ny * this.predSpeed * (1 / 25);
    if (this.transport && this.transport.send) {
      this.transport.send({ type: "input", id: this.id, inputs: this.history.slice(-8) });
    }
    return inp;
  };

  NetClient.prototype.onMessage = function (msg) {
    if (!msg) return;
    if (msg.kind === "snapshot" || msg.type === "snapshot") {
      this.lastSnap = msg;
      this.buffer.push({ t: now(), snap: msg });
      var i, e;
      for (i = 0; i < (msg.entities || []).length; i++) {
        e = msg.entities[i];
        if (e.id === this.id) {
          this.acked = e.ack || this.acked;
          /* Reconcile: snap to authority. A full snapshot is authoritative
             (dropped inputs were skipped); otherwise replay unacked inputs. */
          this.predicted.x = e.x;
          this.predicted.y = e.y;
          var h, inp, len;
          if (!msg.full) {
            for (h = 0; h < this.history.length; h++) {
              if (this.history[h].seq > this.acked) {
                inp = this.history[h];
                len = Math.sqrt((inp.x || 0) * (inp.x || 0) + (inp.y || 0) * (inp.y || 0)) || 1;
                this.predicted.x += (inp.x / len) * this.predSpeed * (1 / 25);
                this.predicted.y += (inp.y / len) * this.predSpeed * (1 / 25);
              }
            }
          }
          this.history = this.history.filter(function (inp) { return inp.seq > (e.ack || 0); });
        }
      }
    }
  };

  NetClient.prototype.interpolate = function (id, at) {
    at = (at != null ? at : now()) - this.interpMs;
    var buf = this.buffer;
    if (buf.length < 2) {
      var last = this.lastSnap && entityOf(this.lastSnap, id);
      return last ? { x: last.x, y: last.y } : null;
    }
    var a = null, b = null, i;
    for (i = 0; i < buf.length - 1; i++) {
      if (buf[i].t <= at && buf[i + 1].t >= at) { a = buf[i]; b = buf[i + 1]; break; }
    }
    if (!a) { a = buf[buf.length - 2]; b = buf[buf.length - 1]; }
    var ea = entityOf(a.snap, id), eb = entityOf(b.snap, id);
    if (!ea || !eb) return ea || eb || null;
    var u = (b.t === a.t) ? 1 : (at - a.t) / (b.t - a.t);
    if (u < 0) u = 0; if (u > 1) u = 1;
    return { x: ea.x + (eb.x - ea.x) * u, y: ea.y + (eb.y - ea.y) * u };
  };

  function entityOf(snap, id) {
    var i;
    if (!snap || !snap.entities) return null;
    for (i = 0; i < snap.entities.length; i++) if (snap.entities[i].id === id) return snap.entities[i];
    return null;
  }

  function now() {
    return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
  }

  function bindSimUi() {
    if (typeof document === "undefined") return;
    var q = "";
    try { q = String(location.search || ""); } catch (e) {}
    if (q.indexOf("net=sim") < 0) return;
    var root = document.getElementById("net-sim");
    if (!root) return;
    root.hidden = false;
    function bind(id, label, unit, apply) {
      var el = document.getElementById(id), v = document.getElementById(id + "-v");
      if (!el) return;
      function sync() { if (v) v.textContent = el.value + unit; apply(+el.value); }
      el.addEventListener("input", sync);
      sync();
    }
    var sim = D.net && D.net._sim;
    bind("net-lat", "lat", "ms", function (n) { if (sim) { sim.client.setSim({ latencyMs: n }); sim.server.setSim({ latencyMs: n }); } });
    bind("net-jit", "jit", "ms", function (n) { if (sim) { sim.client.setSim({ jitterMs: n }); sim.server.setSim({ jitterMs: n }); } });
    bind("net-loss", "loss", "%", function (n) { if (sim) { sim.client.setSim({ loss: n / 100 }); sim.server.setSim({ loss: n / 100 }); } });
  }

  var api = { NetClient: NetClient, bindSimUi: bindSimUi };
  D.net = D.net || {};
  D.net.client = api;
  if (!isNode && typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", bindSimUi);
  }
  if (isNode) module.exports = api;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
