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
      /* Nov 21: only ever by choice. Two tamers fight only when BOTH have raised the PvP flag;
       * backing rival biomes no longer starts a fight on its own (players ran into each other
       * with no flag up and found themselves at war). The flag starts down every run. */
      return !!(a.pvpFlag && b.pvpFlag);
    };
    MissionSim.prototype._updatePvp = function (dt) {
      var P = this.data.PVP, i, j, a, b, d, best, bd, w, def, lv, cd, dmg, s, k, mul;
      if (!P) return;
      /* a flag being lowered comes down when its time is up */
      for (i = 0; i < this.players.length; i++) {
        a = this.players[i];
        if (a.pvpFlag && a.pvpOffAt && this.time >= a.pvpOffAt) { a.pvpFlag = false; a.pvpOffAt = 0; this.emit({ type: "pvp.flag", id: a.id, on: false, offAt: 0 }); }
      }
      /* the fighting itself is the ordinary kind now (Nov 21): see the stand-ins below */
    };

    /* ---- real-time PvP through the normal fight (Nov 21) ----
     * Players found their partners just stood still trading damage numbers. Now each partner in a
     * PvP fight gets a stand-in: an invisible target that sits on it, slipped into the enemy list
     * only while partners pick targets and fire, and while shots and ultimates land. To your
     * partner the other one is then exactly a wild Digimon: it is noticed, chased, circled and
     * hit with every move (projectiles, arcs, beams, the lot), and your partner keeps to your
     * side when you walk off. A hit on a stand-in is passed on to the real partner (PVP.share of
     * it, its own dodge, the same knock-out home to the farm). Nobody else ever sees a stand-in:
     * only someone at war with its owner targets it, and it is gone before the wild Digimon move,
     * the snapshot is taken, or anything is counted. */
    MissionSim.prototype._pvpProxyIn = function () {
      var P = this.data.PVP, i, j, a, b, px, any;
      this._pvpIn = this._pvpIn || [];
      if (!P || this.players.length < 2 || this._pvpIn.length) return;
      this._pvpProxies = this._pvpProxies || {};
      for (i = 0; i < this.players.length; i++) {
        b = this.players[i];
        if (b.atFarm || b.downed || b.faint > 0 || !(b.hp > 0) || this._isEgg(b.form)) continue;
        for (j = 0, any = false; j < this.players.length && !any; j++) { a = this.players[j]; if (a !== b && this._pvpFoes(a, b)) any = true; }
        if (!any) continue;
        px = this._pvpProxies[b.id] || (this._pvpProxies[b.id] = { _id: -1000 - i, pvpOf: b.id, st: 0, hitCd: 0 });
        px.x = b.mx; px.y = b.my; px.type = b.form; px.hp = b.hp; px.maxHp = b.maxHp; px.dead = false;
        px.radius = this._actorRad ? this._actorRad(b.form) : 12; px.lv = b.level || 1;
        this.enemies.push(px);
        this._pvpIn.push(px);
      }
    };
    MissionSim.prototype._pvpProxyOut = function () {
      var i, k;
      if (!this._pvpIn || !this._pvpIn.length) return;
      for (i = 0; i < this._pvpIn.length; i++) { k = this.enemies.indexOf(this._pvpIn[i]); if (k >= 0) this.enemies.splice(k, 1); }
      this._pvpIn.length = 0;
    };
    /* only someone at war with its owner may target a stand-in */
    MissionSim.prototype._pvpSkip = function (me, e) {
      if (!e || !e.pvpOf) return false;
      if (!me || me.id === e.pvpOf) return true;
      var o = this.player(e.pvpOf);
      return !o || !this._pvpFoes(me, o);
    };
    /* a hit on a stand-in lands on the real partner */
    MissionSim.prototype._pvpHit = function (e, dmg, owner) {
      var P = this.data.PVP, att = owner && owner.id != null ? this.player(owner.id) : null, foe = this.player(e.pvpOf), d;
      if (!P || !att || !foe || !this._pvpFoes(att, foe) || foe.monInvuln > 0 || !(foe.hp > 0)) return false;
      d = (dmg || 0) * P.share;
      if (att.mx !== foe.mx) att.mfacing = foe.mx < att.mx ? -1 : 1;
      /* its own damage number, like any hit (17z33): pvp names whose partner took it */
      this.emit({ type: "hit", pvp: foe.id, damage: d, x: foe.mx, y: foe.my, r: e.radius || 12, f: Math.round(100 * d / Math.max(1, foe.maxHp)) / 100, by: att.id });
      if (foe.hp - d <= foe.maxHp * P.koAt) { this._pvpKo(att, foe); return true; }
      this.hurtMon(foe, d, { type: att.form, hit: 0, pvp: att.id });
      if (!(foe.hp > 0)) { foe.hp = 1; this._pvpKo(att, foe); }
      e.hp = foe.hp;
      return true;
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
