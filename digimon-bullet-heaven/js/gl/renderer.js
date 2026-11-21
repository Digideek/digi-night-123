/* Native WebGL1 world renderer. No build step, works on file:// and localhost.
 * Sprites, terrain chunks, and baked props are uploaded as textures and drawn
 * as batched quads. Canvas2D is used only to bake assets/text, never to
 * present the main frame. A 2D-like painter lets existing draw functions
 * submit GPU geometry instead of a hidden 2D framebuffer blit.
 */
(function (global) {
  "use strict";

  var D = (global.DBH = global.DBH || {});
  var MAX_QUADS = 2048;
  var FLOATS_PER_VERT = 8; /* x y u v r g b a */
  var VERTS_PER_QUAD = 6;

  var VS = [
    "attribute vec2 a_pos;",
    "attribute vec2 a_uv;",
    "attribute vec4 a_color;",
    "uniform vec2 u_view;",
    "uniform vec2 u_center;",
    "uniform vec2 u_shake;",
    "uniform float u_zoom;",
    "uniform float u_rot;",
    "varying vec2 v_uv;",
    "varying vec4 v_color;",
    "void main() {",
    "  vec2 p = a_pos - u_center;",
    "  float c = cos(u_rot), s = sin(u_rot);",
    "  p = vec2(c * p.x - s * p.y, s * p.x + c * p.y) * u_zoom;",
    "  p += u_center + u_shake;",
    "  vec2 clip = vec2((p.x / u_view.x) * 2.0 - 1.0, 1.0 - (p.y / u_view.y) * 2.0);",
    "  gl_Position = vec4(clip, 0.0, 1.0);",
    "  v_uv = a_uv;",
    "  v_color = a_color;",
    "}"
  ].join("\n");

  var FS = [
    "precision mediump float;",
    "varying vec2 v_uv;",
    "varying vec4 v_color;",
    "uniform sampler2D u_tex;",
    "void main() {",
    "  vec4 t = texture2D(u_tex, v_uv);",
    "  vec4 outc = t * v_color;",
    "  if (outc.a < 0.003) discard;",
    "  gl_FragColor = outc;",
    "}"
  ].join("\n");

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error("shader: " + log);
    }
    return sh;
  }

  function parseColor(style, alpha) {
    var r = 1, g = 1, b = 1, a = alpha == null ? 1 : alpha;
    if (!style) return [r, g, b, a];
    if (typeof style !== "string") {
      if (style && style._isGradient) return [1, 1, 1, a];
      if (style && style._isPattern) return [1, 1, 1, a];
      return [r, g, b, a];
    }
    var s = style.trim(), m, n;
    if (s.charAt(0) === "#") {
      n = s.slice(1);
      if (n.length === 3) {
        r = parseInt(n.charAt(0) + n.charAt(0), 16) / 255;
        g = parseInt(n.charAt(1) + n.charAt(1), 16) / 255;
        b = parseInt(n.charAt(2) + n.charAt(2), 16) / 255;
      } else if (n.length >= 6) {
        r = parseInt(n.slice(0, 2), 16) / 255;
        g = parseInt(n.slice(2, 4), 16) / 255;
        b = parseInt(n.slice(4, 6), 16) / 255;
        if (n.length >= 8) a *= parseInt(n.slice(6, 8), 16) / 255;
      }
      return [r, g, b, a];
    }
    m = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
    if (m) {
      r = +m[1] / 255; g = +m[2] / 255; b = +m[3] / 255;
      if (m[4] != null) a *= +m[4];
      return [r, g, b, a];
    }
    return [r, g, b, a];
  }

  function Renderer(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ok = false;
    this.reason = "";
    this.gl = null;
    this.lost = false;
    this.viewW = opts.viewW || 1280;
    this.viewH = opts.viewH || 720;
    this.dpr = opts.dpr || 1;
    this.zoom = 1;
    this.rot = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.stats = { frames: 0, quads: 0, flushes: 0, textures: 0, bakedPaths: 0, fullFrameBlit: false, webgl: false };
    this._textures = [];
    this._texMap = typeof WeakMap !== "undefined" ? new WeakMap() : null;
    this._texId = 0;
    this._white = null;
    this._circle = null;
    this._ring = null;
    this._prog = null;
    this._buf = null;
    this._data = new Float32Array(MAX_QUADS * VERTS_PER_QUAD * FLOATS_PER_VERT);
    this._q = 0;
    this._curTex = null;
    this._additive = false;
    this._wantAdd = false;
    this._smooth = false;
    this.ctx = null;
    this._init();
  }

  Renderer.prototype._init = function () {
    var canvas = this.canvas;
    var gl = null;
    var attrs = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: true };
    try { gl = canvas.getContext("webgl", attrs) || canvas.getContext("experimental-webgl", attrs); } catch (e) { gl = null; }
    if (!gl) {
      this.ok = false;
      this.reason = "WebGL is not available in this browser.";
      return;
    }
    this.gl = gl;
    this.ok = true;
    this.stats.webgl = true;
    var vs = compile(gl, gl.VERTEX_SHADER, VS);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FS);
    var p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.bindAttribLocation(p, 0, "a_pos");
    gl.bindAttribLocation(p, 1, "a_uv");
    gl.bindAttribLocation(p, 2, "a_color");
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      this.ok = false;
      this.reason = "WebGL program failed to link.";
      return;
    }
    this._prog = p;
    this._u = {
      view: gl.getUniformLocation(p, "u_view"),
      center: gl.getUniformLocation(p, "u_center"),
      shake: gl.getUniformLocation(p, "u_shake"),
      zoom: gl.getUniformLocation(p, "u_zoom"),
      rot: gl.getUniformLocation(p, "u_rot"),
      tex: gl.getUniformLocation(p, "u_tex")
    };
    this._buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._buf);
    gl.bufferData(gl.ARRAY_BUFFER, this._data.byteLength, gl.DYNAMIC_DRAW);
    this._white = this._makeSolid();
    this._none = this._makeClear();
    this._circle = this._makeCircle(false);
    this._ring = this._makeCircle(true);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    this._setBlend(false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    var self = this;
    canvas.addEventListener("webglcontextlost", function (ev) {
      ev.preventDefault();
      self.lost = true;
      self.ok = false;
      self._texMap = typeof WeakMap !== "undefined" ? new WeakMap() : null;
      self._textures = [];
      self._white = self._circle = self._ring = self._none = null;
      self._curTex = null;
    }, false);
    canvas.addEventListener("webglcontextrestored", function () {
      self.lost = false;
      self._init();
    }, false);
    this.ctx = new GL2D(this);
  };

  Renderer.prototype._setBlend = function (add) {
    var gl = this.gl;
    if (!gl) return;
    this._additive = !!add;
    if (add) gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  };

  Renderer.prototype._makeSolid = function () {
    var c = document.createElement("canvas");
    c.width = 2; c.height = 2;
    var g = c.getContext("2d");
    g.fillStyle = "#fff";
    g.fillRect(0, 0, 2, 2);
    return this.upload(c, { nearest: true, wrap: "clamp" });
  };

  /* fully transparent: what a failed upload draws as (Nov 21: it used to be solid white) */
  Renderer.prototype._makeClear = function () {
    var c = document.createElement("canvas");
    c.width = 2; c.height = 2;
    return this.upload(c, { nearest: true, wrap: "clamp" });
  };
  /* Free the GPU copy of a canvas nobody will draw again (world.js does this when it throws
   * away a map chunk). Nothing was ever freed before: every chunk redrawn (walking somewhere
   * new, grass burning, ice, seasons, territory) left its old texture behind until the graphics
   * card ran out, and then the next upload failed and drew solid white: the random bright
   * blocks over the map. */
  Renderer.prototype.release = function (src) {
    var rec = this._texMap && src ? this._texMap.get(src) : null;
    if (!rec || !this.gl || rec === this._white || rec === this._none || rec === this._circle) return;
    this.flush();
    if (this._curTex === rec) this._curTex = null;
    try { this.gl.deleteTexture(rec.tex); } catch (e) {}
    this._texMap.delete(src);
    this.stats.live = Math.max(0, (this.stats.live || 0) - 1);
  };

  Renderer.prototype._makeCircle = function (ring) {
    var s = 64, c = document.createElement("canvas");
    c.width = s; c.height = s;
    var g = c.getContext("2d");
    g.clearRect(0, 0, s, s);
    g.fillStyle = "#fff";
    g.strokeStyle = "#fff";
    g.beginPath();
    g.arc(s / 2, s / 2, ring ? s * 0.42 : s * 0.48, 0, Math.PI * 2);
    if (ring) { g.lineWidth = s * 0.12; g.stroke(); }
    else g.fill();
    return this.upload(c, { nearest: false, wrap: "clamp" });
  };

  Renderer.prototype.upload = function (src, opts) {
    opts = opts || {};
    if (!this.gl || !src) return this._white;
    var rec = this._texMap && this._texMap.get(src);
    if (rec && rec.tex && !opts.dirty) {
      rec.nearest = opts.nearest != null ? opts.nearest : rec.nearest;
      return rec;
    }
    var gl = this.gl;
    var tex = rec && rec.tex ? rec.tex : gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    var wrap = opts.wrap === "repeat" ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    var filt = opts.nearest ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt);
    var failed = false;
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      /* out of video memory doesn't throw, it just leaves an error behind */
      if ((src.width || 0) * (src.height || 0) > 4096 && gl.getError() === gl.OUT_OF_MEMORY) failed = true;
    } catch (e) {
      failed = true;
    }
    if (failed) {
      /* draw nothing this frame (not a white block) and try again next time */
      if (!rec) { try { gl.deleteTexture(tex); } catch (e2) {} }
      return this._none || this._white;
    }
    rec = rec || { tex: tex, id: ++this._texId, w: src.width || 1, h: src.height || 1 };
    rec.w = src.width || rec.w;
    rec.h = src.height || rec.h;
    rec.nearest = !!opts.nearest;
    rec.wrap = opts.wrap || "clamp";
    if (this._texMap) { if (!this._texMap.get(src)) this.stats.live = (this.stats.live || 0) + 1; this._texMap.set(src, rec); }
    this.stats.textures = this._texId;
    return rec;
  };

  Renderer.prototype.subUpload = function (rec, subs) {
    var gl = this.gl, i, sb;
    if (!gl || !rec || !rec.tex) { subs.length = 0; return; }
    this.flush();
    gl.bindTexture(gl.TEXTURE_2D, rec.tex);
    for (i = 0; i < subs.length; i++) {
      sb = subs[i];
      try { gl.texSubImage2D(gl.TEXTURE_2D, 0, sb.x, sb.y, gl.RGBA, gl.UNSIGNED_BYTE, sb.c); } catch (e) {}
    }
    subs.length = 0;
  };

  Renderer.prototype.invalidate = function (src) {
    this.upload(src, { dirty: true });
  };

  Renderer.prototype.resize = function (viewW, viewH, dpr) {
    this.viewW = viewW;
    this.viewH = viewH;
    this.dpr = dpr || 1;
    var gl = this.gl;
    if (!gl) return;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  };

  Renderer.prototype.setCamera = function (opt) {
    opt = opt || {};
    if (opt.zoom != null) this.zoom = opt.zoom;
    if (opt.rot != null) this.rot = opt.rot;
    if (opt.shakeX != null) this.shakeX = opt.shakeX;
    if (opt.shakeY != null) this.shakeY = opt.shakeY;
  };

  Renderer.prototype.beginFrame = function (opt) {
    if (opt) this.setCamera(opt);
    var gl = this.gl;
    if (!gl || this.lost) return;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.027, 0.07, 0.14, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this._q = 0;
    this._curTex = null;
    this.stats.quads = 0;
    this.stats.flushes = 0;
    if (this.ctx && this.ctx._reset) this.ctx._reset();
  };

  Renderer.prototype.endFrame = function () {
    this.flush();
    this.stats.frames += 1;
  };

  Renderer.prototype.flush = function () {
    if (!this.gl || this._q <= 0) return;
    var gl = this.gl;
    var n = this._q * VERTS_PER_QUAD;
    gl.useProgram(this._prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._buf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._data.subarray(0, n * FLOATS_PER_VERT));
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    gl.enableVertexAttribArray(2);
    var stride = FLOATS_PER_VERT * 4;
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 8);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 16);
    gl.uniform2f(this._u.view, this.viewW, this.viewH);
    gl.uniform2f(this._u.center, this.viewW / 2, this.viewH / 2);
    gl.uniform2f(this._u.shake, this.shakeX || 0, this.shakeY || 0);
    gl.uniform1f(this._u.zoom, this.zoom || 1);
    gl.uniform1f(this._u.rot, this.rot || 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, (this._curTex && this._curTex.tex) || (this._white && this._white.tex));
    gl.uniform1i(this._u.tex, 0);
    if (this._wantAdd !== this._additive) this._setBlend(this._wantAdd);
    gl.drawArrays(gl.TRIANGLES, 0, n);
    this.stats.flushes += 1;
    this.stats.quads += this._q;
    this._q = 0;
  };

  Renderer.prototype._bind = function (rec, additive) {
    rec = rec || this._white;
    additive = !!additive;
    if (this._curTex !== rec || this._wantAdd !== additive || this._q >= MAX_QUADS) {
      this.flush();
      this._curTex = rec;
      this._wantAdd = additive;
    }
  };

  /* Quad in CSS pixels. uv 0-1. color rgba 0-1. */
  Renderer.prototype.quad = function (x0, y0, x1, y1, x2, y2, x3, y3, u0, v0, u1, v1, u2, v2, u3, v3, r, g, b, a, rec, additive) {
    this._bind(rec, additive);
    var d = this._data, i = this._q * VERTS_PER_QUAD * FLOATS_PER_VERT;
    function vert(x, y, u, v) {
      d[i++] = x; d[i++] = y; d[i++] = u; d[i++] = v;
      d[i++] = r; d[i++] = g; d[i++] = b; d[i++] = a;
    }
    vert(x0, y0, u0, v0);
    vert(x1, y1, u1, v1);
    vert(x2, y2, u2, v2);
    vert(x0, y0, u0, v0);
    vert(x2, y2, u2, v2);
    vert(x3, y3, u3, v3);
    this._q += 1;
  };

  Renderer.prototype.rect = function (x, y, w, h, r, g, b, a, rec, u0, v0, u1, v1, additive) {
    rec = rec || this._white;
    u0 = u0 == null ? 0 : u0; v0 = v0 == null ? 0 : v0;
    u1 = u1 == null ? 1 : u1; v1 = v1 == null ? 1 : v1;
    this.quad(x, y, x + w, y, x + w, y + h, x, y + h,
      u0, v0, u1, v0, u1, v1, u0, v1, r, g, b, a, rec, additive);
  };

  Renderer.prototype.info = function () {
    var gl = this.gl, dbg = "";
    try {
      var ext = gl && gl.getExtension("WEBGL_debug_renderer_info");
      if (ext) dbg = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "";
    } catch (e) {}
    return {
      ok: this.ok && !this.lost,
      webgl: !!(this.gl && this.ok),
      lost: this.lost,
      reason: this.reason,
      version: this.gl ? (this.gl.getParameter(this.gl.VERSION) || "WebGL") : "",
      vendor: dbg,
      viewW: this.viewW,
      viewH: this.viewH,
      zoom: this.zoom,
      rot: this.rot,
      textures: this.stats.textures,
      quads: this.stats.quads,
      flushes: this.stats.flushes,
      frames: this.stats.frames,
      bakedPaths: this.stats.bakedPaths,
      fullFrameBlit: false,
      mainContext: this.gl ? "webgl" : "none"
    };
  };

  /* ---------- 2D-like painter that emits WebGL quads ---------- */
  function ident() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; }
  function mul(A, B) {
    return {
      a: A.a * B.a + A.c * B.b,
      b: A.b * B.a + A.d * B.b,
      c: A.a * B.c + A.c * B.d,
      d: A.b * B.c + A.d * B.d,
      e: A.a * B.e + A.c * B.f + A.e,
      f: A.b * B.e + A.d * B.f + A.f
    };
  }
  function apply(M, x, y) { return { x: M.a * x + M.c * y + M.e, y: M.b * x + M.d * y + M.f }; }

  function Gradient(kind, x0, y0, x1, y1, r0, r1) {
    this._isGradient = true;
    this.kind = kind;
    this.x0 = x0; this.y0 = y0; this.x1 = x1; this.y1 = y1;
    this.r0 = r0 || 0; this.r1 = r1 || 0;
    this.stops = [];
  }
  Gradient.prototype.addColorStop = function (t, c) { this.stops.push({ t: t, c: c }); };

  function Pattern(img, repeat) { this._isPattern = true; this.img = img; this.repeat = repeat || "repeat"; }

  function GL2D(r) {
    this._r = r;
    this.canvas = r.canvas;
    this.isWebGL = true;
    this._reset();
  }

  GL2D.prototype._reset = function () {
    this._m = ident();
    this._stack = [];
    this.globalAlpha = 1;
    this.globalCompositeOperation = "source-over";
    this.fillStyle = "#000";
    this.strokeStyle = "#000";
    this.lineWidth = 1;
    this.lineCap = "butt";
    this.lineJoin = "miter";
    this.font = "16px sans-serif";
    this.textAlign = "start";
    this.textBaseline = "alphabetic";
    this.imageSmoothingEnabled = false;
    this.imageSmoothingQuality = "low";
    this._dash = [];
    this._path = [];
    this._clip = null;
  };

  GL2D.prototype.save = function () {
    this._stack.push({
      m: { a: this._m.a, b: this._m.b, c: this._m.c, d: this._m.d, e: this._m.e, f: this._m.f },
      globalAlpha: this.globalAlpha,
      globalCompositeOperation: this.globalCompositeOperation,
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      lineCap: this.lineCap,
      font: this.font,
      textAlign: this.textAlign,
      textBaseline: this.textBaseline,
      imageSmoothingEnabled: this.imageSmoothingEnabled,
      dash: this._dash.slice()
    });
  };
  GL2D.prototype.restore = function () {
    var s = this._stack.pop();
    if (!s) return;
    this._m = s.m;
    this.globalAlpha = s.globalAlpha;
    this.globalCompositeOperation = s.globalCompositeOperation;
    this.fillStyle = s.fillStyle;
    this.strokeStyle = s.strokeStyle;
    this.lineWidth = s.lineWidth;
    this.lineCap = s.lineCap;
    this.font = s.font;
    this.textAlign = s.textAlign;
    this.textBaseline = s.textBaseline;
    this.imageSmoothingEnabled = s.imageSmoothingEnabled;
    this._dash = s.dash;
  };

  GL2D.prototype.setTransform = function (a, b, c, d, e, f) {
    /* Boot/draw used to pass devicePixelRatio here for Canvas2D backing-store
     * units. WebGL uses a CSS-pixel viewport, so a uniform dpr scale is ignored. */
    if (b === 0 && c === 0 && Math.abs(a - d) < 1e-6 && Math.abs(a - 1) > 0.01 && Math.abs(e) < 1e-6 && Math.abs(f) < 1e-6) {
      this._m = ident();
      return;
    }
    this._m = { a: a, b: b, c: c, d: d, e: e, f: f };
  };
  GL2D.prototype.resetTransform = function () { this._m = ident(); };
  GL2D.prototype.translate = function (x, y) { this._m = mul(this._m, { a: 1, b: 0, c: 0, d: 1, e: x, f: y }); };
  GL2D.prototype.scale = function (x, y) { this._m = mul(this._m, { a: x, b: 0, c: 0, d: y == null ? x : y, e: 0, f: 0 }); };
  GL2D.prototype.rotate = function (ang) {
    var c = Math.cos(ang), s = Math.sin(ang);
    this._m = mul(this._m, { a: c, b: s, c: -s, d: c, e: 0, f: 0 });
  };

  GL2D.prototype._add = function () {
    return this.globalCompositeOperation === "lighter" || this.globalCompositeOperation === "plus-lighter";
  };

  GL2D.prototype._col = function (style) { return parseColor(style, this.globalAlpha); };

  GL2D.prototype.clearRect = function (x, y, w, h) {
    var c = [0.027, 0.07, 0.14, 1];
    this._fillBox(x, y, w, h, c, this._r._white);
  };

  GL2D.prototype._fillBox = function (x, y, w, h, col, rec, u0, v0, u1, v1) {
    var p0 = apply(this._m, x, y);
    var p1 = apply(this._m, x + w, y);
    var p2 = apply(this._m, x + w, y + h);
    var p3 = apply(this._m, x, y + h);
    this._r.quad(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y,
      u0 == null ? 0 : u0, v0 == null ? 0 : v0, u1 == null ? 1 : u1, v0 == null ? 0 : v0,
      u1 == null ? 1 : u1, v1 == null ? 1 : v1, u0 == null ? 0 : u0, v1 == null ? 1 : v1,
      col[0], col[1], col[2], col[3], rec || this._r._white, this._add());
  };

  GL2D.prototype.fillRect = function (x, y, w, h) {
    var fs = this.fillStyle;
    if (fs && fs._isPattern && fs.img) {
      this._fillPattern(x, y, w, h, fs);
      return;
    }
    if (fs && fs._isGradient) {
      this._fillGradientRect(x, y, w, h, fs);
      return;
    }
    this._fillBox(x, y, w, h, this._col(fs), this._r._white);
  };

  GL2D.prototype.strokeRect = function (x, y, w, h) {
    var lw = this.lineWidth || 1;
    this._strokeSeg(x, y, x + w, y, lw);
    this._strokeSeg(x + w, y, x + w, y + h, lw);
    this._strokeSeg(x + w, y + h, x, y + h, lw);
    this._strokeSeg(x, y + h, x, y, lw);
  };

  GL2D.prototype._fillPattern = function (x, y, w, h, pat) {
    /* WebGL1 REPEAT wrap requires power-of-two textures. Farm grass is 448px,
     * so tile with individual clamp quads instead. */
    var rec = this._r.upload(pat.img, { nearest: !this.imageSmoothingEnabled, wrap: "clamp" });
    var tw = pat.img.width || rec.w, th = pat.img.height || rec.h;
    if (!tw || !th) { this._fillBox(x, y, w, h, [1, 1, 1, this.globalAlpha], this._r._white); return; }
    var x1 = x + w, y1 = y + h;
    var sx = Math.floor(x / tw) * tw;
    var sy = Math.floor(y / th) * th;
    var tx, ty, ox, oy, dw, dh, u0, v0, u1, v1;
    for (ty = sy; ty < y1; ty += th) {
      for (tx = sx; tx < x1; tx += tw) {
        ox = Math.max(tx, x);
        oy = Math.max(ty, y);
        dw = Math.min(tx + tw, x1) - ox;
        dh = Math.min(ty + th, y1) - oy;
        if (dw <= 0 || dh <= 0) continue;
        u0 = (ox - tx) / tw; v0 = (oy - ty) / th;
        u1 = u0 + dw / tw; v1 = v0 + dh / th;
        this._fillBox(ox, oy, dw, dh, [1, 1, 1, this.globalAlpha], rec, u0, v0, u1, v1);
      }
    }
  };

  var gradCache = {};
  GL2D.prototype._fillGradientRect = function (x, y, w, h, g) {
    var key = g.kind + ":" + (g.stops || []).map(function (s) { return s.t + s.c; }).join(",") + ":" + Math.round(w) + "x" + Math.round(h);
    var cnv = gradCache[key];
    if (!cnv) {
      cnv = document.createElement("canvas");
      var vert = g.kind !== "radial" && Math.abs(g.x1 - g.x0) < Math.abs(g.y1 - g.y0);
      cnv.width = vert ? 4 : 256;
      cnv.height = vert ? 256 : (g.kind === "radial" ? 256 : 4);
      var c2 = cnv.getContext("2d");
      var grd;
      if (g.kind === "radial") {
        var cx = cnv.width / 2, cy = cnv.height / 2, r1 = cnv.width / 2;
        grd = c2.createRadialGradient(cx, cy, 0, cx, cy, r1);
      } else if (vert) grd = c2.createLinearGradient(0, 0, 0, cnv.height);
      else grd = c2.createLinearGradient(0, 0, cnv.width, 0);
      var i, stops = g.stops.slice().sort(function (a, b) { return a.t - b.t; });
      for (i = 0; i < stops.length; i++) grd.addColorStop(Math.max(0, Math.min(1, stops[i].t)), stops[i].c);
      c2.fillStyle = grd;
      c2.fillRect(0, 0, cnv.width, cnv.height);
      gradCache[key] = cnv;
    }
    var rec = this._r.upload(cnv, { nearest: false, wrap: "clamp" });
    this._fillBox(x, y, w, h, [1, 1, 1, this.globalAlpha], rec);
  };

  GL2D.prototype.createLinearGradient = function (x0, y0, x1, y1) { return new Gradient("linear", x0, y0, x1, y1); };
  GL2D.prototype.createRadialGradient = function (x0, y0, r0, x1, y1, r1) { return new Gradient("radial", x0, y0, x1, y1, r0, r1); };
  GL2D.prototype.createPattern = function (img, repeat) { return new Pattern(img, repeat); };

  GL2D.prototype.drawImage = function (img, a, b, c, d, e, f, g, h) {
    if (!img) return;
    var sx, sy, sw, sh, dx, dy, dw, dh;
    if (arguments.length <= 4) {
      sx = 0; sy = 0; sw = img.width; sh = img.height;
      dx = a; dy = b; dw = c != null ? c : sw; dh = d != null ? d : sh;
    } else if (arguments.length === 5) {
      sx = 0; sy = 0; sw = img.width; sh = img.height;
      dx = a; dy = b; dw = c; dh = d;
    } else {
      sx = a; sy = b; sw = c; sh = d; dx = e; dy = f; dw = g; dh = h;
    }
    var rec = this._r.upload(img, { nearest: !this.imageSmoothingEnabled, wrap: "clamp" });
    /* a shared sprite sheet that just had something added (sprites.js atlasOf): send only the
     * new rectangles, not the whole sheet */
    if (img.__subs && img.__subs.length) this._r.subUpload(rec, img.__subs);
    var tw = rec.w || img.width || 1, th = rec.h || img.height || 1;
    var u0 = sx / tw, v0 = sy / th, u1 = (sx + sw) / tw, v1 = (sy + sh) / th;
    this._fillBox(dx, dy, dw, dh, [1, 1, 1, this.globalAlpha], rec, u0, v0, u1, v1);
  };

  GL2D.prototype.beginPath = function () { this._path = []; };
  GL2D.prototype.closePath = function () { this._path.push({ k: "close" }); };
  GL2D.prototype.moveTo = function (x, y) { this._path.push({ k: "move", x: x, y: y }); };
  GL2D.prototype.lineTo = function (x, y) { this._path.push({ k: "line", x: x, y: y }); };
  GL2D.prototype.rect = function (x, y, w, h) {
    this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h); this.lineTo(x, y + h); this.closePath();
  };
  GL2D.prototype.arc = function (x, y, r, a0, a1, ccw) {
    this._path.push({ k: "ellipse", x: x, y: y, rx: r, ry: r, rot: 0, a0: a0, a1: a1, ccw: !!ccw });
  };
  GL2D.prototype.ellipse = function (x, y, rx, ry, rot, a0, a1, ccw) {
    this._path.push({ k: "ellipse", x: x, y: y, rx: rx, ry: ry, rot: rot || 0, a0: a0, a1: a1, ccw: !!ccw });
  };
  GL2D.prototype.quadraticCurveTo = function (cpx, cpy, x, y) {
    this._path.push({ k: "quad", cpx: cpx, cpy: cpy, x: x, y: y });
  };

  GL2D.prototype._pathKind = function () {
    var p = this._path, i, e = 0, l = 0, q = 0, other = 0;
    for (i = 0; i < p.length; i++) {
      if (p[i].k === "ellipse") e++;
      else if (p[i].k === "line" || p[i].k === "move" || p[i].k === "close") l++;
      else if (p[i].k === "quad") q++;
      else other++;
    }
    if (e === 1 && q === 0 && other === 0 && l <= 1) return "ellipse";
    if (e === 0 && q === 0 && other === 0) return "poly";
    return "complex";
  };

  /* Curves become short straight segments (Nov 21). A path with a quadraticCurveTo used to
   * be drawn on a scratch canvas and uploaded as a new texture every time, with two batch
   * flushes: a grass fire's flickering flames did that ~250 times a frame and the frame rate
   * fell through the floor in lightning storms. Flattened, it goes down the fast poly path. */
  GL2D.prototype._flattenQuads = function () {
    var p = this._path, out = [], i, n, lx = 0, ly = 0, sx = 0, sy = 0, k, t, u, steps, has = false;
    for (i = 0; i < p.length; i++) if (p[i].k === "quad") { has = true; break; }
    if (!has) return false;
    for (i = 0; i < p.length; i++) {
      n = p[i];
      if (n.k === "move") { out.push(n); lx = sx = n.x; ly = sy = n.y; }
      else if (n.k === "line") { out.push(n); lx = n.x; ly = n.y; }
      else if (n.k === "close") { out.push(n); lx = sx; ly = sy; }
      else if (n.k === "quad") {
        /* about one segment per 14 px of curve: a flame a few pixels tall needs only 2-3 */
        steps = Math.max(2, Math.min(10, Math.ceil((Math.abs(n.x - lx) + Math.abs(n.y - ly) + Math.abs(n.cpx - lx) + Math.abs(n.cpy - ly)) / 14)));
        for (k = 1; k <= steps; k++) {
          t = k / steps; u = 1 - t;
          out.push({ k: "line", x: u * u * lx + 2 * u * t * n.cpx + t * t * n.x, y: u * u * ly + 2 * u * t * n.cpy + t * t * n.y });
        }
        lx = n.x; ly = n.y;
      } else out.push(n);
    }
    this._path = out;
    return true;
  };

  GL2D.prototype.fill = function () {
    this._flattenQuads();
    var kind = this._pathKind();
    var col = this._col(this.fillStyle);
    var add = this._add();
    if (kind === "ellipse") {
      var e = this._first("ellipse");
      this._fillEllipse(e, col, add);
      return;
    }
    if (kind === "poly" && this._path.length >= 3) {
      this._fillPoly(col, add);
      return;
    }
    this._bakePath(true, false);
  };

  GL2D.prototype.stroke = function () {
    this._flattenQuads();
    var kind = this._pathKind();
    var lw = this.lineWidth || 1;
    if (kind === "ellipse") {
      this._strokeEllipse(this._first("ellipse"), lw);
      return;
    }
    if (kind === "poly") {
      this._strokePoly(lw);
      return;
    }
    this._bakePath(false, true);
  };

  GL2D.prototype._first = function (k) {
    var i;
    for (i = 0; i < this._path.length; i++) if (this._path[i].k === k) return this._path[i];
    return null;
  };

  GL2D.prototype._fillEllipse = function (e, col, add) {
    if (!e) return;
    var rec = this._r._circle;
    /* Unit circle texture mapped onto the ellipse AABB. */
    var p0 = apply(this._m, e.x - e.rx, e.y - e.ry);
    var p1 = apply(this._m, e.x + e.rx, e.y - e.ry);
    var p2 = apply(this._m, e.x + e.rx, e.y + e.ry);
    var p3 = apply(this._m, e.x - e.rx, e.y + e.ry);
    this._r.quad(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y,
      0, 0, 1, 0, 1, 1, 0, 1, col[0], col[1], col[2], col[3], rec, add);
  };

  GL2D.prototype._strokeEllipse = function (e, lw) {
    if (!e) return;
    var col = this._col(this.strokeStyle);
    var dashOn = this._dash && this._dash.length;
    var a0 = e.a0 || 0;
    var a1 = (e.a1 == null) ? (Math.PI * 2) : e.a1;
    var span = e.ccw ? (a0 - a1) : (a1 - a0);
    while (span <= 0) span += Math.PI * 2;
    var steps = Math.max(48, Math.min(256, Math.ceil((e.rx + e.ry) * span / 6)));
    var rot = e.rot || 0, c = Math.cos(rot), s = Math.sin(rot);
    var dash = dashOn ? (this._dash[0] || 8) : 0;
    var gap = dashOn && this._dash[1] != null ? this._dash[1] : dash;
    var acc = 0, on = true, i, t0, t1, p0x, p0y, p1x, p1y, lx, ly, dlen;
    function ptX(a) { lx = Math.cos(a) * e.rx; ly = Math.sin(a) * e.ry; return e.x + c * lx - s * ly; }
    function ptY(a) { lx = Math.cos(a) * e.rx; ly = Math.sin(a) * e.ry; return e.y + s * lx + c * ly; }
    for (i = 0; i < steps; i++) {
      t0 = a0 + (e.ccw ? -1 : 1) * span * (i / steps);
      t1 = a0 + (e.ccw ? -1 : 1) * span * ((i + 1) / steps);
      p0x = ptX(t0); p0y = ptY(t0);
      p1x = ptX(t1); p1y = ptY(t1);
      if (!dashOn || on) this._strokeSeg(p0x, p0y, p1x, p1y, lw, col);
      if (dashOn) {
        dlen = Math.sqrt((p1x - p0x) * (p1x - p0x) + (p1y - p0y) * (p1y - p0y));
        acc += dlen;
        if (acc >= (on ? dash : gap)) { acc = 0; on = !on; }
      }
    }
  };

  GL2D.prototype._strokeSeg = function (x0, y0, x1, y1, lw, col) {
    col = col || this._col(this.strokeStyle);
    var dx = x1 - x0, dy = y1 - y0, len = Math.sqrt(dx * dx + dy * dy) || 0.001;
    var nx = (-dy / len) * (lw / 2), ny = (dx / len) * (lw / 2);
    var a = apply(this._m, x0 + nx, y0 + ny);
    var b = apply(this._m, x1 + nx, y1 + ny);
    var c = apply(this._m, x1 - nx, y1 - ny);
    var d = apply(this._m, x0 - nx, y0 - ny);
    this._r.quad(a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y,
      0, 0, 1, 0, 1, 1, 0, 1, col[0], col[1], col[2], col[3], this._r._white, this._add());
  };

  GL2D.prototype._strokePoly = function (lw) {
    var p = this._path, i, last = null, start = null, n;
    for (i = 0; i < p.length; i++) {
      n = p[i];
      if (n.k === "move") { last = n; start = n; }
      else if (n.k === "line" && last) { this._strokeSeg(last.x, last.y, n.x, n.y, lw); last = n; }
      else if (n.k === "close" && last && start) { this._strokeSeg(last.x, last.y, start.x, start.y, lw); last = start; }
    }
  };

  GL2D.prototype._fillPoly = function (col, add) {
    /* Fan triangulation from the first vertex. Good enough for convex farm/fence shapes. */
    var pts = [], p = this._path, i, n, start = null;
    for (i = 0; i < p.length; i++) {
      n = p[i];
      if (n.k === "move") { start = n; pts.push(n); }
      else if (n.k === "line") pts.push(n);
      else if (n.k === "close" && start) pts.push(start);
    }
    if (pts.length < 3) return;
    var rec = this._r._white;
    for (i = 1; i < pts.length - 1; i++) {
      var a = apply(this._m, pts[0].x, pts[0].y);
      var b = apply(this._m, pts[i].x, pts[i].y);
      var c = apply(this._m, pts[i + 1].x, pts[i + 1].y);
      /* Degenerate quad (repeat last) */
      this._r.quad(a.x, a.y, b.x, b.y, c.x, c.y, c.x, c.y,
        0, 0, 1, 0, 1, 1, 0, 1, col[0], col[1], col[2], col[3], rec, add);
    }
  };

  /* Bake an unusual path to a tight Canvas2D texture and blit it — not a full frame. */
  var pathScratch = null;
  GL2D.prototype._bakePath = function (doFill, doStroke) {
    var p = this._path, i, n, minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    function consider(x, y) {
      if (x < minX) minX = x; if (y < minY) minY = y;
      if (x > maxX) maxX = x; if (y > maxY) maxY = y;
    }
    for (i = 0; i < p.length; i++) {
      n = p[i];
      if (n.x != null) consider(n.x, n.y);
      if (n.k === "ellipse") {
        consider(n.x - n.rx, n.y - n.ry);
        consider(n.x + n.rx, n.y + n.ry);
      }
      if (n.cpx != null) consider(n.cpx, n.cpy);
    }
    if (maxX < minX) return;
    var pad = (this.lineWidth || 1) + 4;
    minX = Math.floor(minX - pad); minY = Math.floor(minY - pad);
    maxX = Math.ceil(maxX + pad); maxY = Math.ceil(maxY + pad);
    var w = Math.max(2, Math.min(1024, maxX - minX));
    var h = Math.max(2, Math.min(1024, maxY - minY));
    if (!pathScratch) pathScratch = document.createElement("canvas");
    if (pathScratch.width !== w) pathScratch.width = w;
    if (pathScratch.height !== h) pathScratch.height = h;
    var c2 = pathScratch.getContext("2d");
    c2.setTransform(1, 0, 0, 1, 0, 0);
    c2.clearRect(0, 0, w, h);
    c2.translate(-minX, -minY);
    c2.fillStyle = typeof this.fillStyle === "string" ? this.fillStyle : "#fff";
    c2.strokeStyle = typeof this.strokeStyle === "string" ? this.strokeStyle : "#fff";
    c2.lineWidth = this.lineWidth;
    c2.lineCap = this.lineCap;
    c2.globalAlpha = 1;
    c2.beginPath();
    for (i = 0; i < p.length; i++) {
      n = p[i];
      if (n.k === "move") c2.moveTo(n.x, n.y);
      else if (n.k === "line") c2.lineTo(n.x, n.y);
      else if (n.k === "close") c2.closePath();
      else if (n.k === "ellipse") c2.ellipse(n.x, n.y, n.rx, n.ry, n.rot || 0, n.a0 || 0, n.a1 == null ? Math.PI * 2 : n.a1, n.ccw);
      else if (n.k === "quad") c2.quadraticCurveTo(n.cpx, n.cpy, n.x, n.y);
    }
    if (doFill) c2.fill();
    if (doStroke) c2.stroke();
    this._r.stats.bakedPaths += 1;
    /* Flush around the reused scratch so a later bake cannot overwrite a
     * texture still sitting in the current quad batch. */
    this._r.flush();
    var rec = this._r.upload(pathScratch, { nearest: !this.imageSmoothingEnabled, dirty: true, wrap: "clamp" });
    this._fillBox(minX, minY, w, h, [1, 1, 1, this.globalAlpha], rec);
    this._r.flush();
  };

  GL2D.prototype.clip = function () { /* world draws rarely clip; ignored at present. */ };
  GL2D.prototype.setLineDash = function (d) { this._dash = d ? d.slice() : []; };
  GL2D.prototype.getLineDash = function () { return this._dash.slice(); };

  var textCache = {}, textCacheN = 0;
  GL2D.prototype._textCanvas = function (text, stroke) {
    var key = (stroke ? "s:" : "f:") + this.font + "|" + this.textAlign + "|" + (stroke ? this.strokeStyle : this.fillStyle) + "|" + text;
    if (textCache[key]) return textCache[key];
    var c = document.createElement("canvas");
    var g = c.getContext("2d");
    g.font = this.font;
    var w = Math.ceil(g.measureText(text).width) + 8;
    var h = 48;
    var px = 16, m = this.font.match(/(\d+)px/);
    if (m) px = +m[1];
    h = Math.ceil(px * 2 + 8);
    c.width = Math.max(2, w);
    c.height = h;
    g.font = this.font;
    g.textAlign = "left";
    g.textBaseline = "alphabetic";
    g.lineWidth = this.lineWidth || 3;
    g.lineJoin = "round";
    var x = 4, y = Math.round(px * 1.15);
    if (stroke) {
      g.strokeStyle = typeof this.strokeStyle === "string" ? this.strokeStyle : "#000";
      g.strokeText(text, x, y);
    } else {
      g.fillStyle = typeof this.fillStyle === "string" ? this.fillStyle : "#fff";
      g.fillText(text, x, y);
    }
    var rec = { canvas: c, x: x, y: y, w: w, h: h, px: px };
    if (textCacheN > 256) {
      /* the old words go, and their copies on the graphics card with them (Nov 21) */
      for (var tk in textCache) if (textCache[tk] && textCache[tk].canvas) this._r.release(textCache[tk].canvas);
      textCache = {}; textCacheN = 0;
    }
    textCache[key] = rec; textCacheN++;
    return rec;
  };

  GL2D.prototype._drawText = function (text, x, y, stroke) {
    if (text == null) return;
    text = String(text);
    var rec = this._textCanvas(text, stroke);
    var offX = 0;
    if (this.textAlign === "center") offX = -rec.w / 2 + 4;
    else if (this.textAlign === "right" || this.textAlign === "end") offX = -rec.w + 8;
    var offY = -rec.y;
    if (this.textBaseline === "top") offY = 0;
    else if (this.textBaseline === "middle") offY = -rec.h / 2;
    var tex = this._r.upload(rec.canvas, { nearest: false, wrap: "clamp" });
    this._fillBox(x + offX, y + offY, rec.canvas.width, rec.canvas.height, [1, 1, 1, this.globalAlpha], tex);
  };

  GL2D.prototype.fillText = function (text, x, y) { this._drawText(text, x, y, false); };
  GL2D.prototype.strokeText = function (text, x, y) { this._drawText(text, x, y, true); };
  GL2D.prototype.measureText = function (text) {
    var c = document.createElement("canvas").getContext("2d");
    c.font = this.font;
    return c.measureText(text == null ? "" : String(text));
  };

  /* Camera helpers (CSS pixels). */
  function screenToWorld(ptr, cam) {
    cam = cam || {};
    var viewW = cam.viewW || 1280, viewH = cam.viewH || 720;
    var zoom = cam.zoom || 1, rot = cam.rot || 0;
    var lx = (ptr.x - viewW / 2 - (cam.shakeX || 0)) / zoom;
    var ly = (ptr.y - viewH / 2 - (cam.shakeY || 0)) / zoom;
    var c = Math.cos(-rot), s = Math.sin(-rot);
    return { x: (cam.x || 0) + (lx * c - ly * s), y: (cam.y || 0) + (lx * s + ly * c) };
  }

  function viewSpan(cam) {
    var zoom = Math.max(0.05, cam && cam.zoom || 1);
    var rot = (cam && cam.rot) || 0;
    var w = (cam.viewW || 1280) / zoom, h = (cam.viewH || 720) / zoom;
    var pad = Math.abs(Math.sin(rot)) * w + Math.abs(Math.cos(rot)) * h;
    return { w: Math.max(w, pad), h: Math.max(h, pad) };
  }

  function attach(canvas, opts) {
    var r = new Renderer(canvas, opts || {});
    return r;
  }

  D.gl = {
    Renderer: Renderer,
    GL2D: GL2D,
    attach: attach,
    screenToWorld: screenToWorld,
    viewSpan: viewSpan,
    renderer: null
  };
  if (typeof module === "object" && module.exports) module.exports = D.gl;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
