/* Keyboard, Gamepad API, and touch virtual joystick. */
(function (global) {
  "use strict";

  var keys = Object.create(null);
  var keysEdge = Object.create(null);
  var padEdge = Object.create(null);
  var prevPad = Object.create(null);

  var moveX = 0;
  var moveY = 0;
  var confirm = false;
  var back = false;
  var pause = false;

  var joy = {
    active: false,
    visible: false,
    pointerId: null,
    originX: 0,
    originY: 0,
    knobX: 0,
    knobY: 0,
    dx: 0,
    dy: 0,
    max: 54
  };

  var lastSource = "keyboard";
  var touchMode = false;
  var touchReviveHeld = false;
  var reviveHoldEligible = false;

  function setTouchReviveHeld(on) { touchReviveHeld = !!on; }
  function setReviveHoldEligible(on) { reviveHoldEligible = !!on; }
  function isInteractHeld() {
    var k = keys.e || keys.E;
    var yHeld = false, pads, i, gp;
    if (typeof navigator !== "undefined" && navigator.getGamepads) {
      pads = navigator.getGamepads();
      for (i = 0; i < pads.length; i++) {
        gp = pads[i];
        if (gp && gp.buttons && gp.buttons[3] && gp.buttons[3].pressed) yHeld = true;
      }
    }
    return !!(k || touchReviveHeld || yHeld);
  }
  var padConnected = false;
  var aimX = 0, aimY = 0, aimAngle = 0, aimStick = false;
  var pointer = { x: 0, y: 0, inCanvas: false, worldReady: false };
  var clicks = [];
  var rsX = 0, rsY = 0;
  /* Pinch zoom + two-finger yaw. Defaults match the pre-WebGL camera. */
  var camera = { zoom: 1, rot: 0, minZoom: 0.7, maxZoom: 1.8, gesturing: false };
  var pointers = Object.create(null);
  var pinch = { active: false, dist: 0, angle: 0, zoom0: 1, rot0: 0 };
  var GLYPHS = {
    keyboard: { move: "WASD", aim: "Mouse", interact: "E", feed: "F", capture: "E", shop: "Q", pause: "Esc", menu: "Tab", confirm: "Enter", back: "Esc", punch: "Space", slots: "1–9", dash: "Shift" },
    mouse:    { move: "WASD", aim: "Mouse", interact: "E", feed: "F", capture: "E", shop: "Q", pause: "Esc", menu: "Tab", confirm: "Enter", back: "Esc", punch: "Space", slots: "1–9", dash: "Shift" },
    gamepad:  { move: "LS", aim: "RS", interact: "Y", capture: "X", shop: "Y", pause: "Start", menu: "Back", confirm: "A", back: "B", punch: "A", slots: "LB/RB", dash: "RT" },
    touch:    { move: "Stick", aim: "Drag", interact: "Tap", capture: "Capture", shop: "Shop", pause: "❚❚", menu: "Menu", confirm: "Tap", back: "Back", punch: "Punch", slots: "Slots", dash: "Dash", camera: "Pinch / twist" }
  };
  var listeners = { confirm: [], back: [], pause: [], nav: [], shop: [], capture: [], useMedicine: [], interact: [], slot: [], slotDelta: [], menu: [], source: [] };

  function emit(name, detail) {
    var list = listeners[name] || [];
    var i;
    for (i = 0; i < list.length; i++) list[i](detail);
  }

  function setSource(src) {
    var changed = lastSource !== src;
    lastSource = src;
    if (changed) emit("source", src);
  }

  function glyph(action) {
    var set = GLYPHS[lastSource] || GLYPHS.keyboard;
    return set[action] || action;
  }

  function prompt(action, label) {
    return (label || action) + " [" + glyph(action) + "]";
  }

  function applyGlyphs(root) {
    if (typeof document === "undefined") return;
    var scope = root || document;
    var nodes = scope.querySelectorAll("[data-glyph]");
    var i, n, act, lab;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      act = n.getAttribute("data-glyph");
      lab = n.getAttribute("data-glyph-label");
      if (n.getAttribute("data-glyph-mode") === "bare") n.textContent = glyph(act);
      else n.textContent = prompt(act, lab || n.getAttribute("data-glyph-fallback") || "");
    }
    var titled = scope.querySelectorAll("[data-glyph-title]");
    for (i = 0; i < titled.length; i++) {
      n = titled[i];
      act = n.getAttribute("data-glyph-title");
      lab = n.getAttribute("data-glyph-label") || n.getAttribute("data-base-title") || "";
      n.setAttribute("title", prompt(act, lab));
    }
  }

  function on(name, fn) {
    if (!listeners[name]) listeners[name] = [];
    listeners[name].push(fn);
  }

  function keyOf(e) {
    return e.key;
  }

  function isMoveKey(k) {
    return k === "w" || k === "W" || k === "a" || k === "A" || k === "s" || k === "S" ||
      k === "d" || k === "D" || k === "ArrowUp" || k === "ArrowDown" ||
      k === "ArrowLeft" || k === "ArrowRight";
  }

  /* Typing a name or room code must not steer the game. */
  function isTyping(e) {
    var t = e && e.target, tag = t && t.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || (t && t.isContentEditable);
  }

  function onKeyDown(e) {
    if (isTyping(e)) return;
    var k = keyOf(e);
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Spacebar", "Enter", "Escape"].indexOf(k) !== -1 ||
        isMoveKey(k)) {
      e.preventDefault();
    }
    if (!keys[k]) keysEdge[k] = true;
    keys[k] = true;
    setSource("keyboard");
    if (k === "Enter" || k === " " || k === "Spacebar") emit("confirm");
    if (k === "Escape") {
      if (global.DBH && (DBH.state === "paused" || DBH.state === "tamer" || DBH.state === "egg" || DBH.state === "gameover" || DBH.state === "shop" || DBH.state === "bank" || DBH.state === "farm" || DBH.state === "lobby" || DBH.state === "join")) emit("back");
      else emit("pause");
    }
    if (k === "Tab") { e.preventDefault(); emit("menu"); }
    if (k === "p" || k === "P") emit("pause");
    if (k === "q" || k === "Q") emit("shop");
    if (k === "r" || k === "R") emit("useMedicine");
    if (k === "e" || k === "E") emit("interact");
    if (k === "f" || k === "F") emit("feed");
    if (k >= "1" && k <= "9") emit("slot", k.charCodeAt(0) - 49);
    if (k === "ArrowLeft" || k === "a" || k === "A") emit("nav", -1);
    if (k === "ArrowRight" || k === "d" || k === "D") emit("nav", 1);
    if (k === "ArrowUp" || k === "w" || k === "W") emit("nav", -1);
    if (k === "ArrowDown" || k === "s" || k === "S") emit("nav", 1);
  }

  function onKeyUp(e) {
    keys[keyOf(e)] = false;
  }

  function keyboardAxis() {
    var x = 0, y = 0;
    if (keys.a || keys.A || keys.ArrowLeft) x -= 1;
    if (keys.d || keys.D || keys.ArrowRight) x += 1;
    if (keys.w || keys.W || keys.ArrowUp) y -= 1;
    if (keys.s || keys.S || keys.ArrowDown) y += 1;
    return { x: x, y: y };
  }

  function dead(v, z) {
    return Math.abs(v) < z ? 0 : v;
  }

  function readGamepad() {
    var pads = navigator.getGamepads ? navigator.getGamepads() : [];
    var i, p, bx, by, ax, ay, len;
    var found = null;
    for (i = 0; i < pads.length; i++) {
      if (pads[i] && pads[i].connected) { found = pads[i]; break; }
    }
    padConnected = !!found;
    if (!found) return { x: 0, y: 0, buttons: [] };

    ax = dead(found.axes[0] || 0, 0.25);
    ay = dead(found.axes[1] || 0, 0.25);
    bx = 0;
    by = 0;
    if (found.buttons[14] && found.buttons[14].pressed) bx -= 1;
    if (found.buttons[15] && found.buttons[15].pressed) bx += 1;
    if (found.buttons[12] && found.buttons[12].pressed) by -= 1;
    if (found.buttons[13] && found.buttons[13].pressed) by += 1;
    if (Math.abs(bx) > Math.abs(ax)) ax = bx;
    if (Math.abs(by) > Math.abs(ay)) ay = by;
    len = Math.sqrt(ax * ax + ay * ay);
    if (len > 1) { ax /= len; ay /= len; }

    function pressed(idx) {
      return found.buttons[idx] && found.buttons[idx].pressed;
    }
    function edge(name, isDown) {
      if (isDown && !prevPad[name]) padEdge[name] = true;
      prevPad[name] = isDown;
    }
    edge("a", pressed(0));
    edge("b", pressed(1));
    edge("x", pressed(2));
    edge("y", pressed(3));
    edge("start", pressed(9) || pressed(8));
    edge("left", pressed(14) || ax < -0.6);
    edge("right", pressed(15) || ax > 0.6);
    edge("up", pressed(12) || ay < -0.6);
    edge("down", pressed(13) || ay > 0.6);
    edge("lb", pressed(4));
    edge("rb", pressed(5));
    edge("select", pressed(8));

    if (padEdge.a) { setSource("gamepad"); emit("confirm"); }
    if (padEdge.b) { setSource("gamepad"); emit("back"); }
    if (padEdge.start) { setSource("gamepad"); emit("pause"); }
    if (padEdge.x) { setSource("gamepad"); emit("capture"); }
    if (padEdge.y) { setSource("gamepad"); if (!reviveHoldEligible) emit("shop"); emit("interact"); }
    if (padEdge.select) { setSource("gamepad"); emit("menu"); }
    if (padEdge.lb) { setSource("gamepad"); emit("slotDelta", -1); }
    if (padEdge.rb) { setSource("gamepad"); emit("slotDelta", 1); }
    if (padEdge.left || padEdge.up) emit("nav", -1);
    if (padEdge.right || padEdge.down) emit("nav", 1);

    /* Right stick aim (axes 2/3, fallback 4/5). Independent of movement. */
    rsX = dead(found.axes[2] != null ? found.axes[2] : 0, 0.25);
    rsY = dead(found.axes[3] != null ? found.axes[3] : 0, 0.25);
    if (Math.abs(rsX) < 0.01 && Math.abs(rsY) < 0.01) {
      rsX = dead(found.axes[4] || 0, 0.25);
      rsY = dead(found.axes[5] || 0, 0.25);
    }
    if (Math.abs(rsX) > 0.25 || Math.abs(rsY) > 0.25) {
      aimStick = true;
      aimAngle = Math.atan2(rsY, rsX);
      setSource("gamepad");
    } else {
      aimStick = false;
    }

    if (len > 0.25) setSource("gamepad");
    return { x: ax, y: ay };
  }

  function joySet(clientX, clientY) {
    var dx = clientX - joy.originX;
    var dy = clientY - joy.originY;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len > joy.max) {
      dx = (dx / len) * joy.max;
      dy = (dy / len) * joy.max;
      len = joy.max;
    }
    joy.knobX = dx;
    joy.knobY = dy;
    joy.dx = len < 8 ? 0 : dx / joy.max;
    joy.dy = len < 8 ? 0 : dy / joy.max;
  }

  function clampCamZoom(z) {
    return Math.max(camera.minZoom, Math.min(camera.maxZoom, z));
  }

  function setCamZoom(z) { camera.zoom = clampCamZoom(z); }
  function resetCamera() { camera.zoom = 1; camera.rot = 0; camera.gesturing = false; }

  function isJoyPointer(id) { return joy.pointerId != null && id === joy.pointerId; }

  function camFingers() {
    var ids = [], id;
    for (id in pointers) {
      if (Object.prototype.hasOwnProperty.call(pointers, id) && !isJoyPointer(+id) && pointers[id].type === "touch") {
        ids.push(id);
      }
    }
    return ids;
  }

  function fingerPair() {
    var ids = camFingers();
    if (ids.length < 2) return null;
    var a = pointers[ids[0]], b = pointers[ids[1]];
    if (!a || !b) return null;
    var dx = b.x - a.x, dy = b.y - a.y;
    return {
      dist: Math.sqrt(dx * dx + dy * dy) || 1,
      angle: Math.atan2(dy, dx)
    };
  }

  function beginPinch() {
    var p = fingerPair();
    if (!p) return;
    pinch.active = true;
    pinch.dist = p.dist;
    pinch.angle = p.angle;
    pinch.zoom0 = camera.zoom;
    pinch.rot0 = camera.rot;
    camera.gesturing = true;
  }

  function updatePinch() {
    if (!pinch.active) { beginPinch(); return; }
    var p = fingerPair();
    if (!p) { endPinch(); return; }
    var z = pinch.zoom0 * (p.dist / (pinch.dist || 1));
    setCamZoom(z);
    camera.rot = pinch.rot0 + (p.angle - pinch.angle);
  }

  function endPinch() {
    pinch.active = false;
    camera.gesturing = camFingers().length >= 2;
  }

  function trackPointer(e, down) {
    var canvas = document.getElementById("game");
    if (!canvas) return;
    var r = canvas.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top;
    var inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
    if (down === true) {
      pointers[e.pointerId] = { x: x, y: y, type: e.pointerType, inside: inside };
    } else if (down === false) {
      delete pointers[e.pointerId];
    } else if (pointers[e.pointerId]) {
      pointers[e.pointerId].x = x;
      pointers[e.pointerId].y = y;
      pointers[e.pointerId].inside = inside;
    }
    /* One-finger aim follows the pointer; two-finger camera leaves aim alone. */
    if (!camera.gesturing && !isJoyPointer(e.pointerId) && (e.pointerType !== "touch" || inside)) {
      pointer.x = x;
      pointer.y = y;
      pointer.inCanvas = inside;
    }
    if (e.pointerType === "touch" && camFingers().length >= 2) {
      if (!pinch.active) beginPinch();
      else updatePinch();
    }
  }

  function bindJoystick(el, baseEl, knobEl) {
    if (!el) return;

    function show() {
      joy.visible = true;
      el.classList.add("is-visible");
    }

    function hideKnob() {
      joy.active = false;
      joy.pointerId = null;
      joy.dx = 0;
      joy.dy = 0;
      joy.knobX = 0;
      joy.knobY = 0;
      if (knobEl) {
        knobEl.style.transform = "translate(-50%,-50%)";
      }
    }

    function startAt(id, x, y) {
      var rect = baseEl.getBoundingClientRect();
      joy.active = true;
      joy.pointerId = id;
      joy.originX = rect.left + rect.width / 2;
      joy.originY = rect.top + rect.height / 2;
      show();
      joySet(x, y);
      if (knobEl) {
        knobEl.style.transform = "translate(calc(-50% + " + joy.knobX + "px), calc(-50% + " + joy.knobY + "px))";
      }
    }

    el.addEventListener("pointerdown", function (e) {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      e.preventDefault();
      touchMode = e.pointerType !== "mouse";
      setSource("touch");
      show();
      startAt(e.pointerId, e.clientX, e.clientY);
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
    });

    el.addEventListener("pointermove", function (e) {
      if (!joy.active || e.pointerId !== joy.pointerId) return;
      e.preventDefault();
      joySet(e.clientX, e.clientY);
      if (knobEl) {
        knobEl.style.transform = "translate(calc(-50% + " + joy.knobX + "px), calc(-50% + " + joy.knobY + "px))";
      }
    });

    function end(e) {
      if (joy.pointerId !== null && e.pointerId !== joy.pointerId) return;
      hideKnob();
    }
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("lostpointercapture", end);

    global.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "touch") {
        touchMode = true;
        show();
      }
    }, { passive: true });
  }

  function poll() {
    padEdge = Object.create(null);
    var kb = keyboardAxis();
    var gp = readGamepad();
    var jx = joy.active ? joy.dx : 0;
    var jy = joy.active ? joy.dy : 0;
    var x = kb.x + gp.x + jx;
    var y = kb.y + gp.y + jy;
    var len = Math.sqrt(x * x + y * y);
    if (len > 1) { x /= len; y /= len; }
    moveX = x;
    moveY = y;
    if (!aimStick && pointer.inCanvas) {
      /* mouse aim is resolved by the game with camera; keep last angle unless stick is in use */
    }
    confirm = !!keysEdge.Enter || !!keysEdge[" "] || !!keysEdge.Spacebar || !!padEdge.a;
    back = !!keysEdge.Escape || !!padEdge.b;
    pause = !!keysEdge.p || !!keysEdge.P || !!padEdge.start ||
      (!!keysEdge.Escape && !(global.DBH && DBH.state === "paused"));
    keysEdge = Object.create(null);
    return { x: moveX, y: moveY, interactHeld: isInteractHeld() };
  }

  function consumeConfirm() {
    var c = confirm;
    confirm = false;
    return c;
  }

  function setup() {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", function (e) {
      var canvas = document.getElementById("game");
      if (!canvas) return;
      var r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.inCanvas = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= r.width && pointer.y <= r.height;
      if (pointer.inCanvas) setSource("mouse");
    });
    window.addEventListener("mousedown", function (e) {
      if (e.button === 0) setSource("mouse");
    });
    window.addEventListener("wheel", function (e) {
      var canvas = document.getElementById("game");
      if (!canvas) return;
      var r = canvas.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      e.preventDefault();
      setSource("mouse");
      /* The wheel zooms the view. At the farm it still flips through the
       * item slots (hold Ctrl there to zoom). */
      var atFarm = global.DBH && global.DBH.state === "farm";
      if (!atFarm || e.ctrlKey || e.metaKey) {
        var next = camera.zoom * (e.deltaY > 0 ? 0.92 : 1.08);
        setCamZoom(next);
        return;
      }
      emit("slotDelta", e.deltaY > 0 ? 1 : -1);
    }, { passive: false });
    window.addEventListener("pointerdown", function (e) {
      trackPointer(e, true);
      /* Click / tap directly on the game canvas: queue it so the game can
       * send the partner after the enemy under the cursor. HUD buttons sit
       * above the canvas, so they never land here. */
      if (e.target && e.target.id === "game" && !isJoyPointer(e.pointerId) &&
          (e.pointerType !== "mouse" || e.button === 0)) {
        var cv = e.target.getBoundingClientRect();
        clicks.push({ x: e.clientX - cv.left, y: e.clientY - cv.top, type: e.pointerType });
        if (clicks.length > 4) clicks.shift();
      }
    }, { passive: true });
    window.addEventListener("pointermove", function (e) {
      trackPointer(e, null);
      if (pinch.active && e.pointerType === "touch") {
        try { e.preventDefault(); } catch (err) {}
      }
    }, { passive: false });
    function pointerEnd(e) {
      trackPointer(e, false);
      if (camFingers().length < 2) endPinch();
    }
    window.addEventListener("pointerup", pointerEnd, { passive: true });
    window.addEventListener("pointercancel", pointerEnd, { passive: true });
    window.addEventListener("blur", function () {
      keys = Object.create(null);
      joy.active = false;
      joy.dx = 0;
      joy.dy = 0;
    });
    window.addEventListener("gamepadconnected", function () {
      padConnected = true;
      setSource("gamepad");
    });
    window.addEventListener("gamepaddisconnected", function () {
      var pads = navigator.getGamepads ? navigator.getGamepads() : [];
      var i, any = false;
      for (i = 0; i < pads.length; i++) if (pads[i]) any = true;
      padConnected = any;
    });
  }

  global.DBH = global.DBH || {};
  global.DBH.input = {
    setup: setup,
    poll: poll,
    on: on,
    bindJoystick: bindJoystick,
    consumeConfirm: consumeConfirm,
    joy: joy,
    get moveX() { return moveX; },
    get moveY() { return moveY; },
    get lastSource() { return lastSource; },
    set lastSource(v) { setSource(v); },
    get touchMode() { return touchMode; },
    get padConnected() { return padConnected; },
    get keys() { return keys; },
    get aimAngle() { return aimAngle; },
    get aimStick() { return aimStick; },
    get rsX() { return rsX; },
    get rsY() { return rsY; },
    pointer: pointer,
    consumeClick: function () { return clicks.length ? clicks.shift() : null; },
    clearClicks: function () { clicks.length = 0; },
    camera: camera,
    setCamZoom: setCamZoom,
    resetCamera: resetCamera,
    glyph: glyph,
    prompt: prompt,
    applyGlyphs: applyGlyphs,
    setSource: setSource,
    GLYPHS: GLYPHS,
    setAimAngle: function (a) { if (!aimStick) aimAngle = a; },
    setTouchReviveHeld: setTouchReviveHeld,
    setReviveHoldEligible: setReviveHoldEligible,
    isInteractHeld: isInteractHeld
  };
})(window);
