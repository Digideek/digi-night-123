/* PvP between real players, and allies that grow (Nov 20; data.js PVP, ALLY_GROWTH).
 *
 * PvP follows the factions (faction-sim.js). Two tamers are at war when each
 * is trusted by at least one biome and no biome trusts them both: back
 * Freezeland while your friend backs Ember Crags and your partners fight on
 * sight; back the same biome and you are on the same side. Nobody who backs
 * no one can be attacked, and nobody at the farm.
 *
 *   An enemy tamer's partner within PVP.reach is fought with every move on its
 *   own cooldown, at PVP.share of the move's damage (the rival's way of
 *   fighting, rival-sim.js), with the shot drawn between them.
 *   The PvP flag (PVP.flagOff): two tamers who both raise it fight whoever
 *   backs them; lowering it takes flagOff seconds.
 *   Beaten: no death. The loser's pair is knocked back home to the farm with
 *   PVP.koHp of its health, and the winner takes PVP.bits of the loser's Bits.
 *   Back from the farm, the loser gets a longer shield (PVP.koShield).
 *
 * Allies that grow: a Digimon rallied to you (faction-sim.js) earns
 * experience from its own kills and a share of yours. Each level it gets
 * tougher and hits harder; at ALLY_GROWTH.evolveAt levels it digivolves into
 * its line's standard next form. If it leaves your side it keeps all of it,
 * and a nest remembers its veterans when its herd goes home.
 */
(function (root) {
  "use strict";
  function install(MissionSim, U) {
    var dist2 = U.dist2;

    /* ---------- PvP ---------- */
    MissionSim.prototype._trustedSet = function (p) {
      var F = this.data.FACTIONS, out = [], k;
      if (!F || !p || !p.trust) return out;
      for (k in p.trust) if (p.trust[k] >= F.trusted) out.push(k);
      return out;
    };
    MissionSim.prototype._pvpFoes = function (a, b) {
      var A, B, i;
      if (!a || !b || a === b || !a.hasTamer || !b.hasTamer || a.atFarm || b.atFarm || a.away || b.away) return false;
      if (a.pvpFlag && b.pvpFlag) return true;          /* both flagged for a fight, whoever backs them */
      A = this._trustedSet(a); B = this._trustedSet(b);
      if (!A.length || !B.length) return false;
      for (i = 0; i < A.length; i++) if (B.indexOf(A[i]) >= 0) return false;
      return true;
    };
    MissionSim.prototype._updatePvp = function (dt) {
      var P = this.data.PVP, i, j, a, b, d, best, bd, w, def, lv, cd, dmg, s, k, mul;
      if (!P) return;
      /* a flag being lowered comes down when its time is up */
      for (i = 0; i < this.players.length; i++) {
        a = this.players[i];
        if (a.pvpFlag && a.pvpOffAt && this.time >= a.pvpOffAt) { a.pvpFlag = false; a.pvpOffAt = 0; this.emit({ type: "pvp.flag", id: a.id, on: false, offAt: 0 }); }
      }
      if (this.players.length < 2) return;
      for (i = 0; i < this.players.length; i++) {
        a = this.players[i];
        if (a.atFarm || a.downed || a.faint > 0 || !(a.hp > 0) || this._isEgg(a.form) || !a.weapons) continue;
        best = null; bd = P.reach * P.reach;
        for (j = 0; j < this.players.length; j++) {
          b = this.players[j];
          if (!this._pvpFoes(a, b) || b.downed || b.faint > 0 || !(b.hp > 0) || this._isEgg(b.form) || b.monInvuln > 0) continue;
          d = dist2(a.mx, a.my, b.mx, b.my);
          if (d < bd) { bd = d; best = b; }
        }
        if (!best) continue;
        a.pvpCd = a.pvpCd || {};
        s = a.stats || {};
        for (k = 0; k < a.weapons.length; k++) {
          w = a.weapons[k]; def = this._weaponDef(w.id) || {};
          if (!def.levels || !def.levels.length) continue;
          lv = def.levels[Math.min(w.level || 1, def.maxLevel || def.levels.length) - 1] || def.levels[0];
          a.pvpCd[w.id] = (a.pvpCd[w.id] == null ? 0.3 + k * 0.15 : a.pvpCd[w.id]) - dt;
          if (a.pvpCd[w.id] > 0) continue;
          if (Math.sqrt(bd) > Math.min(P.reach, this._weaponReach(w)) + this._actorRad(best.form)) continue;
          mul = (s.damageMul || 1) * ((def.type === "arc" ? s.physMul : s.specMul) || 1);
          cd = (lv.cooldown || 0.7) * Math.max(0.35, s.cooldownMul || 1);
          if (def.type === "aura" || def.type === "orbit") cd = Math.max(cd, 0.5);
          a.pvpCd[w.id] = cd;
          dmg = (lv.damage || 8) * mul * P.share;
          if (best.mx !== a.mx) a.mfacing = best.mx < a.mx ? -1 : 1;
          this.emit({ type: "fx", k: "rshot", x: a.mx, y: a.my - 10, tx: best.mx, ty: best.my - 12, w: w.id, arc: def.type === "arc" ? 1 : 0, col: def.color });
          if (best.hp - dmg <= best.maxHp * P.koAt) { this._pvpKo(a, best); break; }
          this.hurtMon(best, dmg, { type: a.form, hit: 0, pvp: a.id });
          if (!(best.hp > 0)) { best.hp = 1; this._pvpKo(a, best); break; }
        }
      }
    };
    /* beaten by another tamer: home to the farm, a bit of health, some Bits to the winner */
    MissionSim.prototype._pvpKo = function (win, lose) {
      var P = this.data.PVP, take = Math.floor((lose.bits || 0) * P.bits);
      lose.hp = Math.max(1, Math.round(lose.maxHp * P.koHp));
      lose.atFarm = true; lose.pvpShield = P.koShield;
      lose.bits = Math.max(0, (lose.bits || 0) - take);
      win.bits = (win.bits || 0) + take;
      win.pvpWins = (win.pvpWins || 0) + 1;
      var bounty = this._bountyOnKo ? this._bountyOnKo(win, lose) : 0;   /* modes-sim.js */
      this.emit({ type: "pvp.ko", winner: win.id, loser: lose.id, bits: take, bounty: bounty, x: Math.round(lose.mx), y: Math.round(lose.my), form: lose.form, by: win.form });
    };

    /* ---------- allies that grow ---------- */
    MissionSim.prototype._allyXp = function (e, amt) {
      var G = this.data.ALLY_GROWTH, need, next, defs = this._enemies(), was;
      if (!G || !e || e.dead) return;
      e.alv = e.alv || 1;
      if (e.alv >= G.maxLevel) return;
      e.axp = (e.axp || 0) + amt;
      need = G.xpBase + G.xpPer * (e.alv - 1);
      while (e.axp >= need && e.alv < G.maxLevel) {
        e.axp -= need; e.alv += 1;
        e.maxHp = Math.round(e.maxHp * G.hpPer); e.hp = Math.min(e.maxHp, e.hp + e.maxHp * G.healPer);
        e.dmgMul = (e.dmgMul || 1) * G.dmgPer;
        this.emit({ type: "fx", k: "allylv", x: Math.round(e.x), y: Math.round(e.y - (e.radius || 10) - 10), alv: e.alv, id: e._id, to: e.rally });
        if (G.evolveAt.indexOf(e.alv) >= 0) {
          next = this._burstForm ? this._burstForm(e.type) : null;
          if (next && next !== e.type && defs[next]) {
            was = e.type; e.type = next;
            e.radius = defs[next].radius || e.radius;
            if (this._actorRad) e.radius = Math.max(e.radius, Math.round(this._actorRad(next) * 0.9));
            e.maxHp = Math.round(Math.max(e.maxHp, (defs[next].hp || e.maxHp) * Math.pow(G.hpPer, e.alv - 1))); e.hp = e.maxHp;
            this.emit({ type: "fx", k: "allyevo", x: Math.round(e.x), y: Math.round(e.y), from: was, to: next, owner: e.rally });
          }
        }
        need = G.xpBase + G.xpPer * (e.alv - 1);
      }
    };
    /* the tamer's kill: each Digimon fighting at their side takes a share */
    MissionSim.prototype._allyShare = function (p, victim) {
      var G = this.data.ALLY_GROWTH, i, e, amt;
      if (!G || !p) return;
      amt = G.share * (victim && (victim.boss || victim.lord) ? G.bossXp : 1);
      for (i = 0; i < this.enemies.length; i++) { e = this.enemies[i]; if (e.rally === p.id && !e.dead && e !== victim) this._allyXp(e, amt); }
    };
    /* one going home with its nest's herd: the nest remembers it */
    MissionSim.prototype._allyHome = function (e) {
      var st = e && e.nest && this.nests && this.nests[e.nest];
      if (!st || !(e.alv > 1)) return;
      st.vets = st.vets || [];
      st.vets.push({ type: e.type, alv: e.alv, axp: e.axp || 0, maxHp: e.maxHp, dmgMul: e.dmgMul || 1, radius: e.radius });
      if (st.vets.length > 4) st.vets.shift();
    };
  }

  var isNode = typeof module !== "undefined" && module.exports;
  if (isNode) module.exports = install;
  else { root.DBH = root.DBH || {}; root.DBH.installPvp = install; }
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
