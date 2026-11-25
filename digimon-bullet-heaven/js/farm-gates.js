/* Digi Night — farm gates (17z33). The farm is a place you walk to now, not a button.
 *
 * A glowing Digi-gate (a pixel archway with a little fence and a FARM sign) stands in the middle of
 * the start area, and another beside every nest your side has taken over (the nest's cell held by
 * your side: world.js cellOwner, turf.js run.turf.side). Walk up to one and press E (or tap Act) to
 * go in. The nearest one is marked on the minimap, and the Farm chip says which way it is.
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});
  var CFG = { reach: 72, nestOffset: [46, -6] };
  D.FARM_GATES = CFG;
  var home = null, homeSeed = null;

  function homeGate() {
    var W = D.world, run = D.getRun ? D.getRun() : null, seed = run && run.worldSeed;
    if (home && homeSeed === seed) return home;
    var s = W && W.nearestWalkable ? W.nearestWalkable(0, -110, 600, 24) : null;      /* just north of where a run starts, so you see it at once */
    home = { x: s ? s.x : 0, y: s ? s.y : -110, kind: "home" }; homeSeed = seed;
    return home;
  }
  function sideOf(run) { return (run && run.turf && run.turf.side) || null; }
  function ownerAt(x, y) {
    var W = D.world, span;
    if (!W || !W.cellOwner || !W.TERR || !W.TILE) return null;
    span = W.TERR * (typeof W.TILE === "function" ? W.TILE() : W.TILE);
    return W.cellOwner(Math.floor(x / span), Math.floor(y / span));
  }
  /* every gate you can use right now */
  function list(run, nests) {
    var out = [homeGate()], side = sideOf(run), i, n;
    if (side) for (i = 0; i < (nests || []).length; i++) {
      n = nests[i];
      if (ownerAt(n[0], n[1]) === side) out.push({ x: n[0] + CFG.nestOffset[0], y: n[1] + CFG.nestOffset[1], kind: "nest", biome: n[2] });
    }
    return out;
  }
  function nearest(run, nests) {
    var l = list(run, nests), best = null, bd = 1e18, i, d;
    if (!run) return null;
    for (i = 0; i < l.length; i++) { d = (l[i].x - run.x) * (l[i].x - run.x) + (l[i].y - run.y) * (l[i].y - run.y); if (d < bd) { bd = d; best = l[i]; } }
    if (best) best.dist = Math.sqrt(bd);
    return best;
  }
  function inReach(run, nests) { var g = nearest(run, nests); return g && g.dist <= CFG.reach ? g : null; }

  /* ---------- drawing: an archway of glowing pixels, a fence, a sign ---------- */
  /* opt (17z33): { sign, hint } for the same gate used another way (the way out, inside the farm) */
  function draw(ctx, g, t, near, col, opt) {
    var x = 0, y = 0, k, a, glow = 0.55 + 0.25 * Math.sin(t * 2.4 + g.x * 0.01), c = col || "#7cf0c0";
    ctx.save();
    ctx.translate(Math.round(g.x), Math.round(g.y)); ctx.scale(1.35, 1.35);
    /* the ground ring */
    ctx.globalAlpha = 0.35; ctx.fillStyle = "#0a1a14"; ctx.beginPath(); ctx.ellipse(x, y + 2, 34, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.5 + 0.3 * glow; ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y + 1, 30, 9, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    /* a little fence either side */
    ctx.fillStyle = "#8a6a40";
    for (k = -1; k <= 1; k += 2) {
      ctx.fillRect(x + k * 24 - 1, y - 12, 3, 13); ctx.fillRect(x + k * 34 - 1, y - 10, 3, 11);
      ctx.fillRect(Math.min(x + k * 24, x + k * 34) - 1, y - 9, 12, 2); ctx.fillRect(Math.min(x + k * 24, x + k * 34) - 1, y - 4, 12, 2);
    }
    /* the arch: two posts and a curve of pixel blocks */
    ctx.fillStyle = "#1c2a3c"; ctx.fillRect(x - 19, y - 40, 6, 40); ctx.fillRect(x + 13, y - 40, 6, 40);
    ctx.fillStyle = "#2c4058"; ctx.fillRect(x - 18, y - 40, 2, 40); ctx.fillRect(x + 14, y - 40, 2, 40);
    for (k = 0; k <= 10; k++) {
      a = Math.PI + (Math.PI * k) / 10;
      ctx.fillStyle = k % 2 ? "#2c4058" : "#1c2a3c";
      ctx.fillRect(Math.round(x + Math.cos(a) * 16) - 3, Math.round(y - 40 + Math.sin(a) * 14) - 3, 6, 6);
    }
    /* the light inside it */
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.28 + 0.22 * glow; ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(x - 13, y); ctx.lineTo(x - 13, y - 40); ctx.quadraticCurveTo(x, y - 60, x + 13, y - 40); ctx.lineTo(x + 13, y); ctx.closePath(); ctx.fill();
    for (k = 0; k < 6; k++) {                                       /* motes drifting up through it */
      var ph = ((t * 0.5 + k / 6) % 1);
      ctx.globalAlpha = (1 - ph) * 0.8; ctx.fillRect(Math.round(x - 9 + ((k * 37) % 18)), Math.round(y - 4 - ph * 44), 2, 2);
    }
    if (near) { ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 8); ctx.beginPath(); ctx.ellipse(x, y + 1, 40, 13, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    /* the sign over it */
    var lbl = (opt && opt.sign) || "FARM", hw;
    ctx.font = "bold 8px Trebuchet MS, sans-serif"; hw = Math.max(15, Math.ceil(ctx.measureText(lbl).width / 2) + 5);   /* the plate fits its word */
    ctx.fillStyle = "#3a2a14"; ctx.fillRect(x - hw, y - 66, hw * 2, 12); ctx.fillStyle = "#c89a58"; ctx.fillRect(x - hw + 1, y - 65, hw * 2 - 2, 10);
    ctx.fillStyle = "#3a2a14"; ctx.textAlign = "center"; ctx.fillText(lbl, x, y - 57);
    if (near) {
      ctx.font = "bold 11px Trebuchet MS, sans-serif"; ctx.lineWidth = 3; ctx.strokeStyle = "rgba(8,10,24,0.9)"; ctx.fillStyle = "#ffffff";
      var txt = (opt && opt.hint) || (D.input && D.input.touchMode ? "Tap Act: go to the farm" : "E: go to the farm");
      ctx.strokeText(txt, x, y + 24); ctx.fillText(txt, x, y + 24);
    }
    ctx.restore();
  }
  D.farmGates = { list: list, nearest: nearest, inReach: inReach, draw: draw, home: homeGate, CFG: CFG };
})(typeof window !== "undefined" ? window : this);
