/* Level-up card icons (Nov 15).
 *
 * Every move gets an icon that says what it is: its family's emblem (flame,
 * ice shard, droplet, dark orb, star, gear, leaf, slime, gust, fang, or
 * bubbles) framed by its type (a shot in flight, a starburst blast, claw
 * rakes, an aura ring, or orbiting orbs). The five stat upgrades have their
 * own. Art comes from scripts/art/make_move_icons.py (assets/icons/moves/).
 * If a picture is missing the old icon is used.
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});
  var S = D.sprites;
  if (!S || typeof document === "undefined") return;

  var FAMS = ["fire", "ice", "water", "dark", "holy", "machine", "nature", "slime", "wind", "beast", "bubble"];
  var KINDS = ["shot", "blast", "claw", "aura", "orbit"];
  var STATS = ["speed", "magnet", "maxHp", "damage", "cooldown"];
  var art = {}, i, j;

  function load(key) {
    var img = new Image();
    img.onload = function () {
      var c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      c.getContext("2d").drawImage(img, 0, 0);
      art[key] = c;
    };
    img.src = "assets/icons/moves/" + key + ".png";
  }
  for (i = 0; i < FAMS.length; i++) for (j = 0; j < KINDS.length; j++) load(FAMS[i] + "_" + KINDS[j]);
  for (i = 0; i < STATS.length; i++) load("stat_" + STATS[i]);

  /* which picture a move or upgrade should wear */
  function keyFor(id) {
    if (STATS.indexOf(id) >= 0 && D.STAT_UPGRADES && D.STAT_UPGRADES[id]) return "stat_" + id;
    var def = D.WEAPONS && D.WEAPONS[id];
    if (!def) return null;
    var st = D.attackFx && D.attackFx.styleOf ? D.attackFx.styleOf(id, def.color) : { fam: "fire", tier: 1 };
    var kind = def.type === "arc" ? "claw" : (def.type === "aura" ? "aura" : (def.type === "orbit" ? "orbit" : (def.type === "nova" || st.tier >= 4 ? "blast" : "shot")));
    return (FAMS.indexOf(st.fam) >= 0 ? st.fam : "fire") + "_" + kind;
  }

  /* Signatures and techniques (Nov 18) draw their own icon, in the move's own
   * colours, by what the move does: a ray, a thing falling on a mark, a trap
   * in its ring, a returning blade, a shockwave, a chain of sparks, a spray. */
  var kitArt = {};
  var ICON_KIND = { hammerSpark: "chain", arcticBlizzard: "beam" };
  function kitIcon(id) {
    if (kitArt[id]) return kitArt[id];
    var def = D.WEAPONS[id], st = D.attackFx && D.attackFx.styleOf ? D.attackFx.styleOf(id, def.color) : null;
    var pal = st ? st.look.pal : ["#333", def.color, def.glow, "#fff"], kind = ICON_KIND[id] || (def.fan ? "fan" : (def.type === "march" ? "strike" : def.type)), N = 18, g = [], x, y, i, a, r, dx, dy, d;
    if (st && st.look.shape === "orb") pal = [pal[3], pal[2], pal[1], pal[0]];   /* dark-hearted looks run light to dark */
    for (i = 0; i < N * N; i++) g.push(-1);
    function put(px, py, c) { px = Math.round(px); py = Math.round(py); if (px >= 1 && py >= 1 && px < N - 1 && py < N - 1 && c > g[py * N + px]) g[py * N + px] = c; }
    function disc(cx, cy, rad, c) { for (y = 0; y < N; y++) for (x = 0; x < N; x++) if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= rad * rad) put(x, y, c); }
    function line(x0, y0, x1, y1, c) { var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2, j; for (j = 0; j <= n; j++) put(x0 + (x1 - x0) * j / n, y0 + (y1 - y0) * j / n, c); }
    function diamond(cx, cy, rad, c) { for (y = 0; y < N; y++) for (x = 0; x < N; x++) if (Math.abs(x - cx) + Math.abs(y - cy) <= rad) put(x, y, c); }
    if (kind === "beam") {
      for (x = 3; x <= 15; x++) { put(x, 11 - (x - 3) * 0.5 - 2, 1); put(x, 11 - (x - 3) * 0.5 + 2, 1); put(x, 11 - (x - 3) * 0.5 - 1, 2); put(x, 11 - (x - 3) * 0.5 + 1, 2); put(x, 11 - (x - 3) * 0.5, 3); }
      disc(4, 11, 2.6, 2); disc(4, 11, 1.2, 3);
      put(13, 2, 2); put(16, 9, 2); put(9, 13, 1); put(7, 4, 1);
    } else if (kind === "strike") {
      line(8.5, 1, 8.5, 6, 1); line(6, 2, 6, 4, 1); line(11, 2, 11, 4, 1);
      diamond(8.5, 9, 3.6, 1); diamond(8.5, 9, 2.4, 2); diamond(8.5, 9.5, 1, 3);
      for (i = 0; i < 12; i++) { a = (Math.PI * 2 * i) / 12; if (i % 2) put(8.5 + Math.cos(a) * 6.4, 14.5 + Math.sin(a) * 1.8, 2); }
      put(3, 13, 1); put(14, 13, 1);
    } else if (kind === "mine") {
      for (i = 0; i < 16; i++) { a = (Math.PI * 2 * i) / 16; if (i % 2 === 0) put(8.5 + Math.cos(a) * 7, 9 + Math.sin(a) * 6.4, 1); }
      disc(8.5, 9, 4.2, 1); disc(8.5, 9, 3, 2); disc(7.6, 8.2, 1.1, 3);
      put(8.5, 3, 3); put(8.5, 2, 2);
    } else if (kind === "boomerang") {
      for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
        dx = x - 9.5; dy = y - 8.5; r = Math.sqrt(dx * dx + dy * dy); d = Math.sqrt((dx + 3.6) * (dx + 3.6) + (dy - 2.6) * (dy - 2.6));
        if (r <= 6.6 && d >= 5.6) put(x, y, r > 5.4 ? 1 : (d < 6.6 ? 3 : 2));
      }
      for (i = 0; i < 5; i++) { a = 2.2 + i * 0.36; put(8 + Math.cos(a) * 7.4, 9.5 + Math.sin(a) * 7.4, 1); }
      put(2, 9, 2);
    } else if (kind === "burst") {
      for (i = 0; i < 16; i++) { a = (Math.PI * 2 * i) / 16; put(8.5 + Math.cos(a) * 6.6, 8.5 + Math.sin(a) * 6.6, i % 2 ? 1 : 2); put(8.5 + Math.cos(a) * 6, 8.5 + Math.sin(a) * 6, i % 2 ? 1 : 2); }
      for (i = 0; i < 8; i++) { a = (Math.PI * 2 * i) / 8 + 0.39; put(8.5 + Math.cos(a) * 4, 8.5 + Math.sin(a) * 4, 1); }
      disc(8.5, 8.5, 2.3, 2); disc(8.5, 8.5, 1.1, 3);
    } else if (kind === "chain") {
      line(3, 13, 7, 9, 2); line(7, 9, 6, 6, 2); line(6, 6, 11, 8, 2); line(11, 8, 10, 4, 2); line(10, 4, 14, 3, 2);
      disc(3, 13, 1.5, 3); disc(8.6, 7.4, 1.6, 3); disc(14, 3.4, 1.6, 3);
      put(13, 12, 1); put(15, 10, 1); put(3, 4, 1);
    } else {
      for (i = -1; i <= 1; i++) { a = i * 0.62; line(3, 9, 3 + Math.cos(a) * 6, 9 + Math.sin(a) * 6, 1); diamond(3 + Math.cos(a) * 10.5, 9 + Math.sin(a) * 10.5, 2.4, 2); diamond(3 + Math.cos(a) * 10.5, 9 + Math.sin(a) * 10.5, 1, 3); }
      disc(3, 9, 1.4, 2);
    }
    var c = document.createElement("canvas"), k = c.getContext("2d"), o;
    c.width = c.height = N * 2;
    /* a dark edge round everything, the way the painted icons have one */
    k.fillStyle = "#1a1420";
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
      if (g[y * N + x] >= 0) continue;
      o = (x > 0 && g[y * N + x - 1] >= 0) || (x < N - 1 && g[y * N + x + 1] >= 0) || (y > 0 && g[(y - 1) * N + x] >= 0) || (y < N - 1 && g[(y + 1) * N + x] >= 0);
      if (o) k.fillRect(x * 2, y * 2, 2, 2);
    }
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) if (g[y * N + x] >= 0) { k.fillStyle = pal[g[y * N + x]]; k.fillRect(x * 2, y * 2, 2, 2); }
    kitArt[id] = c;
    return c;
  }

  /* a move that is a thing (a missile, a fish, a torpedo) wears a picture of the thing */
  function spriteIcon(id) {
    if (kitArt[id]) return kitArt[id];
    var sp = D.attackFx.shotSprite(id), c = document.createElement("canvas"), k = c.getContext("2d"), sc = sp.width <= 20 ? 1.5 : 1, n = id === "marchingFishes" ? 3 : 1, i;
    c.width = c.height = 36;
    k.imageSmoothingEnabled = false;
    if (n > 1) { for (i = 0; i < n; i++) k.drawImage(sp, 1 + (i === 1 ? 14 : i * 3), 2 + i * 11, sp.width, sp.height); }
    else { k.translate(18, 18); k.rotate(-0.5); k.drawImage(sp, -sp.width * sc / 2, -sp.height * sc / 2, sp.width * sc, sp.height * sc); }
    kitArt[id] = c;
    return c;
  }

  var orig = S.getIcon;
  S.getIcon = function (name) {
    if (D.WEAPONS && D.WEAPONS[name] && (D.WEAPONS[name].grows || ICON_KIND[name] || (D.WEAPONS[name].was && /^(beam|chain|strike|march|boomerang)$/.test(D.WEAPONS[name].type)))) return kitIcon(name);
    if (D.WEAPONS && D.WEAPONS[name] && D.attackFx && D.attackFx.shotSprite && D.attackFx.shotSprite(name)) return spriteIcon(name);
    var k = keyFor(name);
    if (k && art[k]) return art[k];
    return orig ? orig(name) : null;
  };
  D.moveIcons = { keyFor: keyFor, ready: function (k) { return !!art[k]; } };
})(typeof window !== "undefined" ? window : this);
