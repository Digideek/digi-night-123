/* Faction trust (Nov 20; data.js FACTIONS).
 *
 * Every biome keeps a trust meter for each tamer, 0 to 100. Nobody picks a
 * side at the start: trust is earned, and lost, in the run.
 *
 *   Kill a biome's Digimon, and every biome bordering that spot gains trust
 *   (you are fighting their enemy at the front); the biome you killed it from
 *   loses some. A boss or a lord counts for more.
 *   Hit a biome's Digimon and it loses a little trust, more if it trusted you.
 *   Trust you stop earning fades back toward nothing after a minute.
 *
 *   TRUSTED (40+): that biome's Digimon leave you and your partner alone, your
 *   partner doesn't go for them, and your shots and blasts pass through them.
 *   To attack one on purpose, click it: that hits, and costs a lot of trust.
 *   ALLIED (100, and it holds until it falls below `allyHold`): a few of its
 *   Digimon near you rally to you (cap `rallyCap`), follow you about and go for
 *   anything hostile to you that comes near.
 *
 * Several biomes can trust you at once (they still fight each other), and you
 * can switch sides: kill one side's Digimon and its trust drains away until
 * it is hostile again. Rivals, infected Digimon, field Megas and spire bosses
 * belong to no biome: they are always hostile.
 */
(function (root) {
  "use strict";
  function install(MissionSim, U) {
    var dist2 = U.dist2;

    MissionSim.prototype._facCfg = function () { return this.data && this.data.FACTIONS; };

    /* which biome a wild Digimon fights for (null: nobody's) */
    MissionSim.prototype._factionOf = function (e) {
      var BI = this.data.biomes;
      if (!e || e.rival || e.virus || e.mega || e.spire) return null;
      if (e.war) return e.war;
      if (e.fac) return e.fac;
      if (e.lord) return e.lairBiome || null;
      return BI && BI.homeOf ? BI.homeOf(e.type) : null;
    };
    MissionSim.prototype._trustOf = function (p, fac) { return (p && p.trust && fac && p.trust[fac]) || 0; };
    MissionSim.prototype._trusts = function (p, fac) {
      var F = this._facCfg();
      return !!(F && fac && p && this._trustOf(p, fac) >= F.trusted);
    };
    MissionSim.prototype._allied = function (p, fac) { return !!(p && p.allied && fac && p.allied[fac]); };
    /* does this player's side leave that Digimon alone? (a clicked one is fair game) */
    MissionSim.prototype._spares = function (ownerId, e) {
      if (ownerId == null || !e) return false;
      var p = this.player(ownerId);
      if (!p || p.focusId === e._id) return false;
      return this._trusts(p, this._factionOf(e));
    };

    MissionSim.prototype._trustAdd = function (p, fac, amt) {
      var F = this._facCfg(), was, now, lvl;
      if (!F || !p || !fac || !amt) return;
      p.trust = p.trust || {}; p.trustT = p.trustT || {}; p.allied = p.allied || {};
      was = p.trust[fac] || 0;
      now = Math.max(0, Math.min(F.max, was + amt));
      p.trust[fac] = Math.round(now * 10) / 10;
      if (amt > 0) p.trustT[fac] = this.time;
      if (!p.allied[fac] && now >= F.max) { p.allied[fac] = true; lvl = "allied"; }
      else if (p.allied[fac] && now < F.allyHold) { delete p.allied[fac]; lvl = now >= F.trusted ? "cooling" : "hostile"; }
      else if (was < F.trusted && now >= F.trusted) lvl = "trusted";
      else if (was >= F.trusted && now < F.trusted) lvl = "hostile";
      if (lvl) this.emit({ type: "trust", id: p.id, fac: fac, level: lvl, value: Math.round(now) });
    };

    /* a kill: the biomes bordering this spot are glad, its own biome is not */
    MissionSim.prototype._trustKill = function (p, e, share) {
      var F = this._facCfg(), w = this.data.world, fac = this._factionOf(e), big, seen = {}, c, cx, cy, b, R;
      if (!F || !p || !fac) return;
      share = share == null ? 1 : share;
      big = e.lord ? F.lordMul : (e.boss ? F.bossMul : 1);
      this._trustAdd(p, fac, -F.killLoss * big * share);
      if (!w || !w.cellOf || !w.cellOwner) return;
      c = w.cellOf(e.x, e.y); R = F.frontCells;
      for (cy = c.cy - R; cy <= c.cy + R; cy++) for (cx = c.cx - R; cx <= c.cx + R; cx++) {
        b = w.cellOwner(cx, cy);
        if (b && b !== fac) seen[b] = 1;
      }
      for (b in seen) this._trustAdd(p, b, F.killGain * big * share);
    };
    /* a hit that landed: a little trust lost, more from a biome that trusted you (rate-limited) */
    MissionSim.prototype._trustHit = function (p, e) {
      var F = this._facCfg(), fac = this._factionOf(e), k;
      if (!F || !p || !fac) return;
      p.trustHitT = p.trustHitT || {};
      k = fac;
      if ((p.trustHitT[k] || -9) > this.time - F.hitEvery) return;
      p.trustHitT[k] = this.time;
      this._trustAdd(p, fac, -(this._trusts(p, fac) ? F.hitLossTrusted : F.hitLoss));
    };

    /* fading, and the rally of an allied biome's Digimon */
    MissionSim.prototype._updateFactions = function (dt) {
      var F = this._facCfg(), i, j, p, fac, e, n, cand, d, best, bd;
      if (!F) return;
      this._facT = (this._facT || 0) - dt;
      if (this._facT > 0) return;
      var step = F.tick; this._facT = step;
      for (i = 0; i < this.players.length; i++) {
        p = this.players[i];
        if (!p.trust) continue;
        for (fac in p.trust) if (p.trust[fac] > 0 && this.time - ((p.trustT && p.trustT[fac]) || 0) > F.fadeAfter) this._trustAdd(p, fac, -F.fade * step);
      }
      /* release helpers who are no longer welcome or were left behind */
      for (j = 0; j < this.enemies.length; j++) {
        e = this.enemies[j];
        if (!e.rally || e.dead) continue;
        p = this.player(e.rally);
        if (!p || !this._allied(p, this._factionOf(e)) || dist2(e.x, e.y, p.x, p.y) > F.rallyLeave * F.rallyLeave) e.rally = null;
      }
      /* call new ones: the nearest of the allied biomes' Digimon, up to the cap */
      for (i = 0; i < this.players.length; i++) {
        p = this.players[i];
        if (!p.hasTamer || !p.allied) continue;
        n = 0;
        for (j = 0; j < this.enemies.length; j++) if (this.enemies[j].rally === p.id && !this.enemies[j].dead) n++;
        while (n < F.rallyCap) {
          best = null; bd = F.rallyReach * F.rallyReach;
          for (j = 0; j < this.enemies.length; j++) {
            cand = this.enemies[j];
            if (cand.dead || cand.rally || cand.lord || cand.boss || !this._allied(p, this._factionOf(cand))) continue;
            d = dist2(cand.x, cand.y, p.x, p.y);
            if (d < bd) { bd = d; best = cand; }
          }
          if (!best) break;
          best.rally = p.id; best.rallyOff = (n - 1) * 0.9;
          this.emit({ type: "fx", k: "rally", x: Math.round(best.x), y: Math.round(best.y - (best.radius || 10) - 8), fac: this._factionOf(best) });
          n++;
        }
      }
    };
    /* A rallied Digimon: goes for whatever is hostile to its tamer near them, else keeps close.
     * Returns a bite target like the wild ones (virus-sim.js _wildBite). */
    MissionSim.prototype._rallyAct = function (e, dt) {
      var F = this._facCfg(), p = this.player(e.rally), i, o, d, best = null, bd = F.guard * F.guard, a;
      if (!p) { e.rally = null; return null; }
      e.vCd = Math.max(0, (e.vCd || 0) - dt);
      for (i = 0; i < this.enemies.length; i++) {
        o = this.enemies[i];
        if (o === e || o.dead || o.rally === p.id || this._trusts(p, this._factionOf(o))) continue;
        d = dist2(p.x, p.y, o.x, o.y);
        if (d < bd) { bd = d; best = o; }
      }
      if (best) return best;
      a = (e.rallyOff || 0) + Math.PI * 0.75;
      return { x: p.x + Math.cos(a) * 70, y: p.y + Math.sin(a) * 45, wander: true, idle: dist2(e.x, e.y, p.x + Math.cos(a) * 70, p.y + Math.sin(a) * 45) < 30 * 30 };
    };
  }

  var isNode = typeof module !== "undefined" && module.exports;
  if (isNode) module.exports = install;
  else { root.DBH = root.DBH || {}; root.DBH.installFactions = install; }
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
