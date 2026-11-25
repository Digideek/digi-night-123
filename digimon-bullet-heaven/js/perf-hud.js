/* Performance readout (17z33). F3 (or the pause menu) shows a small box in the corner with what
 * this machine is really doing: frames a second, how long a frame takes, how much of that is the
 * game's own work, what the world simulation costs (on the host, who runs it for everyone), ground
 * redrawn, Digimon about, the drawing resolution and the graphics chip. It updates twice a second and
 * costs next to nothing; off, it costs nothing at all. Settings remember it (game.js perfHud). */
(function (root) {
  "use strict";
  var D = root.DBH = root.DBH || {};
  var on = false, box = null, frames = [], work = [], lastPaint = 0, simWrapped = null, simMs = 0, simN = 0, simMax = 0;
  var gb0 = 0, gms0 = 0, t0 = 0;

  function now() { return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now(); }
  function ensureBox() {
    if (box || typeof document === "undefined") return box;
    box = document.createElement("div");
    box.id = "perf-hud";
    box.setAttribute("aria-live", "off");
    document.body.appendChild(box);
    return box;
  }
  /* time the world simulation where it runs (this machine hosts it, or runs it solo) */
  function wrapSim() {
    var ma = D.getMissionAuth ? D.getMissionAuth() : null, sim = ma && ma.sim;
    if (!sim || sim === simWrapped || typeof sim.step !== "function" || sim.__perfWrapped) return;
    var orig = sim.step;
    sim.step = function () {
      if (!on) return orig.apply(this, arguments);
      var a = now(), v = orig.apply(this, arguments), d = now() - a;
      simMs += d; simN++; if (d > simMax) simMax = d;
      return v;
    };
    sim.__perfWrapped = true;
    simWrapped = sim;
  }
  function role() {
    var o = D.online;
    if (o && o.isGuest && o.isGuest()) return "Guest (the host runs the world)";
    if (o && o.role && o.role() === "host" && o.drivesClock && o.drivesClock()) return "Host (this PC runs the world for everyone)";
    return "Solo (this PC runs the world)";
  }
  function gpuLine() {
    var P = D.perf || {}, name = P.name || "unknown";
    name = name.replace(/^ANGLE \(/, "").replace(/\)$/, "").replace(/,\s*(OpenGL|Direct3D|Vulkan)[^,]*$/i, "");
    if (name.length > 46) name = name.slice(0, 44) + "..";
    return name + (P.soft ? "  (NO GRAPHICS CARD: turn on hardware acceleration)" : "");
  }
  function row(k, v, warn) { return "<div" + (warn ? " class='warn'" : "") + "><b>" + k + "</b> " + v + "</div>"; }
  function paint(t) {
    var secs = Math.max(0.001, (t - lastPaint) / 1000), i, sum = 0, worst = 0, wsum = 0, wworst = 0, fps, ws, run, ma, sim, near = 0, all = 0, p;
    for (i = 0; i < frames.length; i++) { sum += frames[i]; if (frames[i] > worst) worst = frames[i]; }
    for (i = 0; i < work.length; i++) { wsum += work[i]; if (work[i] > wworst) wworst = work[i]; }
    fps = frames.length / secs;
    ws = D.world && D.world.stats ? D.world.stats() : null;
    ma = D.getMissionAuth ? D.getMissionAuth() : null; sim = ma && ma.sim;
    run = D.getRun ? D.getRun() : null;
    if (sim && sim.enemies) {
      for (i = 0; i < sim.enemies.length; i++) {
        if (sim.enemies[i].dead) continue; all++;
        for (p = 0; p < sim.players.length; p++) if (Math.abs(sim.enemies[i].x - sim.players[p].x) < 1200 && Math.abs(sim.enemies[i].y - sim.players[p].y) < 1200) { near++; break; }
      }
    } else if (run && run.enemiesCount != null) all = run.enemiesCount;
    var html = "<div class='ttl'>Performance <span>F3 to hide</span></div>" +
      row("FPS", Math.round(fps), fps < 45) +
      row("Frame", (frames.length ? (sum / frames.length).toFixed(1) : "-") + " ms, worst " + Math.round(worst) + " ms", worst > 50) +
      row("Game work", (work.length ? (wsum / work.length).toFixed(1) : "-") + " ms a frame, worst " + Math.round(wworst), wworst > 25);
    if (simN) html += row("World", (simMs / simN).toFixed(1) + " ms a step, worst " + Math.round(simMax) + " (" + Math.round(simN / secs) + " steps/s)", simMax > 25);
    if (ws) html += row("Ground", Math.round((ws.builds - gb0) / secs) + " pieces/s (" + Math.round(ws.buildMs - gms0) + " ms)", ws.buildMs - gms0 > 30);
    if (all) html += row("Digimon", all + " in the world, " + near + " near players");
    html += row("Drawing", Math.round(((D.perf && D.perf.q) || 1) * 100) + "% resolution", D.perf && D.perf.q < 1) +
      row("Graphics", gpuLine(), D.perf && D.perf.soft) +
      row("Role", role());
    box.innerHTML = html;
    frames.length = 0; work.length = 0; simMs = 0; simN = 0; simMax = 0;
    if (ws) { gb0 = ws.builds; gms0 = ws.buildMs; }
    lastPaint = t;
  }
  function frame(nowMs, workMs) {
    if (!on) return;
    if (t0) frames.push(nowMs - t0);
    t0 = nowMs;
    work.push(workMs);
    if (nowMs - lastPaint >= 500) { wrapSim(); paint(nowMs); }
  }
  function set(v) {
    on = !!v;
    ensureBox();
    if (box) box.style.display = on ? "block" : "none";
    frames.length = 0; work.length = 0; simMs = 0; simN = 0; simMax = 0; t0 = 0; lastPaint = now();
    var ws = D.world && D.world.stats ? D.world.stats() : null;
    if (ws) { gb0 = ws.builds; gms0 = ws.buildMs; }
    if (on && box) box.innerHTML = "<div class='ttl'>Performance <span>F3 to hide</span></div><div>measuring...</div>";
    if (D.perfHud.onChange) D.perfHud.onChange(on);
  }
  D.perfHud = { frame: frame, set: set, toggle: function () { set(!on); }, isOn: function () { return on; }, onChange: null };
})(typeof window !== "undefined" ? window : this);
