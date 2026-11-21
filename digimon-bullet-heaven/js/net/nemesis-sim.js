/* Nemeses (Nov 20; data.js NEMESIS).
 *
 * The wild Digimon that lands the blow that beats a tamer's partner becomes that tamer's Nemesis: it
 * gains levels, health and bite, heals, digivolves, and carries a title over its head ("Isaac's
 * Nemesis"). It leaves its herd and roams. Every partner it beats after that (yours or a friend's),
 * and every wild Digimon it kills, feeds it; with enough it takes the next title (Scourge, Tyrant,
 * Warlord, Calamity, Doom, Apocalypse, and on with no ceiling) and digivolves again.
 *
 *   it comes for a tamer's side when one is near; otherwise it hunts other biomes' Digimon, or roams
 *   from Tyrant on it gathers a herd of its own biome's Digimon that follow it and join its fights
 *   from Warlord on, standing in another biome's land a while takes that land for its biome
 *   beating it pays XP and Bits for every title it held
 * Its position, title and level go out to every screen (snapshot `nems`) for the minimap.
 */
(function (root) {
  "use strict";
  function install(MissionSim, U) {
    var dist2 = U.dist2;
    function cfg(sim) { return sim.data.NEMESIS; }

    MissionSim.prototype._nemTierOf = function (pts) {
      var N = cfg(this), i, t = 0;
      for (i = 0; i < N.tiers.length; i++) if (pts >= N.tiers[i]) t = i + 1;
      if (pts >= N.tiers[N.tiers.length - 1]) t += Math.floor((pts - N.tiers[N.tiers.length - 1]) / N.beyond);
      return t;
    };
    MissionSim.prototype._nemTitle = function (e) {
      var N = cfg(this), t = Math.max(1, e.nem || 1), name = N.titles[Math.min(t, N.titles.length) - 1];
      if (t > N.titles.length) name += " " + toRoman(t - N.titles.length + 1);
      return (e.nemBy ? e.nemBy + "'s " : "") + name;
    };
    function toRoman(n) { var r = "", v = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]], i; for (i = 0; i < v.length; i++) while (n >= v[i][0]) { r += v[i][1]; n -= v[i][0]; } return r; }

    /* it beat a tamer's partner */
    MissionSim.prototype._nemesisKill = function (e, p) {
      var N = cfg(this);
      if (!N || !e || e.dead || e.rally || e.rival || e.spire) return;
      /* a partner beaten just after it hatched makes no nemesis (playtest: the start filled with them) */
      var RS = this.data.RESPAWN;
      if (p && p.hatchedAt != null && RS && RS.freshSec && this.time - p.hatchedAt < RS.freshSec) return;
      if (!e.nemesis) {
        e.nemesis = true; e.nem = 0; e.nemPts = 0; e.nemKills = 0; e.nemWild = 0;
        e.nemBy = (p && p.name) ? String(p.name).slice(0, 14) : "";
        if (e.pack && this.packs && this.packs[e.pack] && this.packs[e.pack].awake === false) this.packs[e.pack].awake = true;
        e.fac = (this._factionOf && this._factionOf(e)) || e.fac;       /* it keeps fighting for the biome it came from */
        delete e.pack; delete e.nest; delete e.war;                     /* it leaves its herd and roams */
      }
      e.nemKills += 1;
      e.lv = (e.lv || 1) + N.perKill.lv;
      e.maxHp = Math.round(e.maxHp * N.perKill.hp); e.hp = e.maxHp;
      e.dmgMul = (e.dmgMul || 1) * N.perKill.dmg;
      this._nemPoints(e, N.pts.partner);
      this.emit({ type: "nemesis.kill", id: e._id, victim: p ? p.id : null, kills: e.nemKills, title: e.nemTitle, tier: e.nem, lv: e.lv, form: e.type, x: Math.round(e.x), y: Math.round(e.y) });
    };
    /* it killed another wild Digimon */
    MissionSim.prototype._nemesisFed = function (e, victim) {
      var N = cfg(this);
      if (!N || !e.nemesis || e.dead) return;
      e.nemWild = (e.nemWild || 0) + 1;
      e.maxHp = Math.round(e.maxHp * N.perWild.hp); e.hp = Math.min(e.maxHp, e.hp + e.maxHp * N.perWild.heal);
      e.dmgMul = (e.dmgMul || 1) * N.perWild.dmg;
      if (e.nemWild % N.perWild.lvEvery === 0) e.lv = (e.lv || 1) + 1;
      this._nemPoints(e, (victim && (victim.boss || victim.lord || victim.nemesis)) ? N.pts.big : N.pts.wild);
    };
    MissionSim.prototype._nemPoints = function (e, n) {
      var N = cfg(this), was = e.nem || 0, now, defs = this._enemies(), next, from, k;
      e.nemPts = (e.nemPts || 0) + n;
      now = Math.max(1, this._nemTierOf(e.nemPts));
      e.nem = now;
      for (k = was; k < now; k++) {                                     /* each new title: digivolve when the line goes further */
        if (k === 0) continue;                                          /* (the first title comes with the kill's growth) */
        from = e.type; next = this._burstForm ? this._burstForm(e.type) : e.type;
        if (next && next !== e.type && defs[next]) {
          e.type = next;
          e.maxHp = Math.round(Math.max(e.maxHp, (defs[next].hp || e.maxHp) * 2)); e.hp = e.maxHp;
          if (this._actorRad) e.radius = Math.max(e.radius || 10, Math.round(this._actorRad(next) * 0.9));
        }
        e.lv = (e.lv || 1) + 2;
        this.emit({ type: "nemesis.rise", id: e._id, from: from, form: e.type, tier: k + 1, x: Math.round(e.x), y: Math.round(e.y) });
      }
      if (was === 0) { from = e.type; next = this._burstForm ? this._burstForm(e.type) : e.type; if (next && next !== e.type && defs[next]) { e.type = next; if (this._actorRad) e.radius = Math.max(e.radius || 10, Math.round(this._actorRad(next) * 0.9)); this.emit({ type: "nemesis.rise", id: e._id, from: from, form: e.type, tier: 1, x: Math.round(e.x), y: Math.round(e.y) }); } }
      e.nemScale = Math.min(N.radiusMax, 1 + N.radiusPer * e.nem);
      e.nemTitle = this._nemTitle(e);
    };

    /* where it goes when no tamer's side is near: a fight with another biome's Digimon, or a roam */
    MissionSim.prototype._nemesisAct = function (e, closest, dt) {
      var N = cfg(this), i, o, d, best = null, bd = N.hunt * N.hunt, fac = this._factionOf ? this._factionOf(e) : null, a, r, s;
      /* the start is a sanctuary: a nemesis keeps out of the Baby zone (RESPAWN.zone.baby), so a partner
       * that has just hatched again is not beaten again the moment it hatches */
      var Z = this.data.RESPAWN && this.data.RESPAWN.zone, keep = Z ? Z.baby + 150 : 0, dc = Math.sqrt(e.x * e.x + e.y * e.y);
      if (keep && dc < keep) { r = (keep + 250) / Math.max(1, dc); return { x: e.x * r + (dc < 1 ? keep + 250 : 0), y: e.y * r }; }
      if (closest < N.notice * N.notice) {
        if (keep) { /* chasing someone into the sanctuary: stop at its edge */
          var stop = null;
          for (i = 0; i < this.players.length; i++) { o = this.players[i]; if (Math.sqrt(o.mx * o.mx + o.my * o.my) < Z.baby) stop = o; }
          if (stop && dist2(e.x, e.y, stop.mx, stop.my) < N.notice * N.notice && dc < keep + 200) return { x: e.x, y: e.y, wander: true, idle: true };
        }
        return null;
      }
      for (i = 0; i < this.enemies.length; i++) {
        o = this.enemies[i];
        if (o === e || o.dead || o.rally || o.rival || o.spire || o.nemLead === e._id) continue;
        if (fac && this._factionOf && this._factionOf(o) === fac) continue;
        d = dist2(e.x, e.y, o.x, o.y);
        if (d < bd) { bd = d; best = o; }
      }
      e.nemTgt = best ? best._id : null;
      if (best) { if (!best.foeT || best.foe !== e._id) { best.foe = e._id; best.foeT = 6; } return best; }
      if (e.nrx == null || dist2(e.x, e.y, e.nrx, e.nry) < 900 || (e.nrT = (e.nrT || 0) - dt) < 0) {
        a = this.rng() * Math.PI * 2; r = N.roam * (0.4 + this.rng() * 0.6);
        s = this._snap ? this._snap(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, 14, 300, this._crossOf ? this._crossOf(e.type) : 0) : { x: e.x, y: e.y };
        e.nrx = s.x; e.nry = s.y; e.nrT = 20;
      }
      return { x: e.nrx, y: e.nry, wander: true };
    };
    /* a member of its herd: fights what it fights, keeps close otherwise */
    MissionSim.prototype._nemFollow = function (f, closest, dt) {
      var N = cfg(this), L = this._enemyById ? this._enemyById(f.nemLead) : null, t, a;
      if (!L || L.dead) { delete f.nemLead; return null; }
      if (closest < N.notice * N.notice) return null;
      t = L.nemTgt != null && this._enemyById ? this._enemyById(L.nemTgt) : null;
      if (t && !t.dead) return t;
      a = ((f._id || 1) * 2.399) % 6.283;
      return { x: L.x + Math.cos(a) * 46, y: L.y + Math.sin(a) * 30, wander: true, idle: dist2(f.x, f.y, L.x + Math.cos(a) * 46, L.y + Math.sin(a) * 30) < 300 };
    };

    /* once a second: herds gather, land is taken */
    MissionSim.prototype._updateNemeses = function (dt) {
      var N = cfg(this), i, e, j, o, n, want, fac, w = this.data.world, span, cx, cy, own;
      if (!N) return;
      this._nemT = (this._nemT || 0) - dt;
      if (this._nemT > 0) return;
      this._nemT = 1;
      for (i = 0; i < this.enemies.length; i++) {
        e = this.enemies[i];
        if (!e.nemesis || e.dead) continue;
        fac = this._factionOf ? this._factionOf(e) : null;
        /* the herd */
        if (e.nem >= N.herdFrom && fac) {
          e.nemHerdT = (e.nemHerdT || 0) - 1;
          if (e.nemHerdT <= 0) {
            e.nemHerdT = N.herdEvery;
            want = N.herdPer * (e.nem - N.herdFrom + 1);
            for (n = 0, j = 0; j < this.enemies.length; j++) if (this.enemies[j].nemLead === e._id && !this.enemies[j].dead) n++;
            for (j = 0; j < this.enemies.length && n < want; j++) {
              o = this.enemies[j];
              if (o === e || o.dead || o.nemLead != null || o.nemesis || o.rally || o.rival || o.lord || o.boss || o.spire) continue;
              if (this._factionOf(o) !== fac || dist2(o.x, o.y, e.x, e.y) > N.herdReach * N.herdReach) continue;
              o.nemLead = e._id; delete o.pack; delete o.nest; delete o.war; n++;
              this.emit({ type: "fx", k: "alert", x: Math.round(o.x), y: Math.round(o.y - (o.radius || 10) - 10) });
            }
          }
        }
        /* the land */
        if (e.nem >= N.conquerFrom && fac && w && w.cellOwner && w.setOwner && w.TILE && w.TILE()) {
          span = w.TERR * w.TILE(); cx = Math.floor(e.x / span); cy = Math.floor(e.y / span); own = w.cellOwner(cx, cy);
          if (own && own !== fac) {
            if (e.nemCell !== cx + "," + cy) { e.nemCell = cx + "," + cy; e.nemCellT = 0; }
            e.nemCellT += 1;
            if (e.nemCellT >= N.conquerSec && w.setOwner(cx, cy, fac)) {
              e.nemCellT = 0;
              this.emit({ type: "war.flip", cx: cx, cy: cy, from: own, to: fac, x: Math.round((cx + 0.5) * span), y: Math.round((cy + 0.5) * span), nemesis: e._id });
            }
          } else e.nemCellT = 0;
        }
      }
    };
    /* beaten at last: a reward for every title it held */
    MissionSim.prototype._nemesisDown = function (e, p) {
      var N = cfg(this), R = N.reward, t = Math.max(1, e.nem || 1), k, a;
      for (k = 0; k < R.orbs + t * 2; k++) { a = (Math.PI * 2 * k) / (R.orbs + t * 2); this._spawnOrb("xp", e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 22, Math.round(R.xp * t / (R.orbs + t * 2) * 3)); }
      if (p) p.bits = (p.bits || 0) + R.bits * t;
      this.emit({ type: "nemesis.down", id: e._id, by: p ? p.id : null, title: e.nemTitle, tier: t, bits: R.bits * t, form: e.type, x: Math.round(e.x), y: Math.round(e.y) });
    };
    /* every nemesis alive, for the minimap: [id, x, y, tier, title, form, level] */
    MissionSim.prototype._nemList = function () {
      var out = [], i, e;
      for (i = 0; i < this.enemies.length; i++) { e = this.enemies[i]; if (e.nemesis && !e.dead) out.push([e._id, Math.round(e.x), Math.round(e.y), e.nem, e.nemTitle || "", e.type, e.lv || 1]); }
      return out.length ? out : null;
    };
  }

  var isNode = typeof module !== "undefined" && module.exports;
  if (isNode) module.exports = install;
  else { root.DBH = root.DBH || {}; root.DBH.installNemesis = install; }
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
