/* Shared egg-safety and party-revive rules for the browser and Node authority.
 * Starting party size (humans + configured CPU teammates) is frozen at run
 * start: a party does not become "solo" when members die or disconnect.
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});

  function dataOf(ctx) {
    return (ctx && ctx.data) || D;
  }

  function cfg(ctx) {
    var raw = (dataOf(ctx).PARTY_REVIVE) || {};
    var faint = dataOf(ctx).FAINT || {};
    return {
      hold: raw.hold != null ? raw.hold : 3,
      radius: raw.radius != null ? raw.radius : 80,
      hpRatio: raw.hpRatio != null ? raw.hpRatio : (faint.reviveHpRatio != null ? faint.reviveHpRatio : 0.4),
      tamerHpRatio: raw.tamerHpRatio != null ? raw.tamerHpRatio : 0.5,
      minLiving: raw.minLiving != null ? raw.minLiving : 2
    };
  }

  function isEggForm(form, data) {
    var table = (data && data.SPECIES) || D.SPECIES;
    var sp = table && form && table[form];
    return !!(sp && sp.stage === "Egg");
  }

  function isLivingMon(m, data) {
    if (!m) return false;
    if ((m.hp || 0) <= 0) return false;
    if ((m.faint || 0) > 0) return false;
    return true;
  }

  function monPos(m) {
    if (!m) return null;
    if (m.mx != null && m.my != null && (m.hasTamer || m.form)) return { x: m.mx, y: m.my };
    return { x: m.x || 0, y: m.y || 0 };
  }

  /* Party Digimon units: human partners, CPU teammates, optional mid-run ally. */
  function partyUnits(ctx) {
    var list = [], i, p, c;
    var players = (ctx && (ctx.players || (ctx.run && ctx.run._players))) || (ctx && ctx.players) || [];
    if (ctx && ctx.players) {
      for (i = 0; i < ctx.players.length; i++) {
        p = ctx.players[i];
        list.push({
          id: p.id, kind: "player", form: p.form, hp: p.hp, maxHp: p.maxHp,
          faint: p.faint || 0, x: p.mx, y: p.my, hasTamer: !!p.hasTamer,
          tamerHp: p.tamerHp, tamerMaxHp: p.tamerMaxHp, ref: p
        });
      }
    } else if (ctx && ctx.run) {
      var run = ctx.run;
      list.push({
        id: "local", kind: "player", form: run.form, hp: run.hp, maxHp: run.maxHp,
        faint: run.faint || 0, x: run.mx, y: run.my, hasTamer: true,
        tamerHp: run.tamerHp, tamerMaxHp: run.tamerMaxHp, ref: run
      });
    }
    var cpus = (ctx && ctx.cpus) || (ctx && ctx.run && ctx.run.cpuMates) || [];
    for (i = 0; i < cpus.length; i++) {
      c = cpus[i];
      if (!c) continue;
      list.push({
        id: c.id || ("cpu-" + i), kind: "cpu", form: c.form, hp: c.hp, maxHp: c.maxHp,
        faint: 0, x: c.x, y: c.y, hasTamer: false, ref: c
      });
    }
    var ally = (ctx && ctx.ally) || (ctx && ctx.run && ctx.run.ally);
    if (ally && ally.form) {
      list.push({
        id: ally.id || "ally", kind: "ally", form: ally.form, hp: ally.hp, maxHp: ally.maxHp,
        faint: 0, x: ally.x, y: ally.y, hasTamer: false, ref: ally
      });
    }
    return list;
  }

  function livingCount(ctx, data) {
    var u = partyUnits(ctx), n = 0, i;
    for (i = 0; i < u.length; i++) if (isLivingMon(u[i], data)) n += 1;
    return n;
  }

  function hasHatchedCombatant(ctx, data) {
    var u = partyUnits(ctx), i;
    data = data || dataOf(ctx);
    for (i = 0; i < u.length; i++) {
      if (isLivingMon(u[i], data) && !isEggForm(u[i].form, data)) return true;
    }
    return false;
  }

  function startingPartySize(ctx) {
    if (ctx && ctx.startingPartySize != null) return ctx.startingPartySize;
    if (ctx && ctx.run && ctx.run.startingPartySize != null) return ctx.run.startingPartySize;
    var humans = 0, i;
    if (ctx && ctx.players) {
      for (i = 0; i < ctx.players.length; i++) if (ctx.players[i].hasTamer !== false) humans += 1;
      if (!humans) humans = ctx.players.length || 1;
    } else humans = 1;
    var cpus = (ctx && ctx.cpus) || (ctx && ctx.run && ctx.run.cpuMates) || [];
    return humans + cpus.length;
  }

  function isPartyMode(ctx) {
    return startingPartySize(ctx) >= 2;
  }

  function isBrawl(ctx) {
    if (!ctx) return false;
    if (ctx.phase === "brawl") return true;
    if (ctx.state === "brawl") return true;
    if (ctx.run && ctx.run._state === "brawl") return true;
    return false;
  }

  function dist2(ax, ay, bx, by) {
    var dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  }

  function isDownedUnit(u) {
    if (!u) return false;
    return (u.hp || 0) <= 0 || (u.faint || 0) > 0;
  }

  function reviverAlive(reviver) {
    if (!reviver) return false;
    if (reviver.hasTamer !== false && (reviver.tamerHp != null)) return reviver.tamerHp > 0;
    return (reviver.hp || 0) > 0 && !(reviver.faint > 0);
  }

  /* Nearest downed teammate that is not the reviver's own mon (no self-revive in party). */
  function pickTeammateTarget(reviver, ctx, data) {
    var c = cfg({ data: data });
    var rx = (reviver && (reviver.x != null ? reviver.x : reviver.mx)) || 0;
    var ry = (reviver && (reviver.y != null ? reviver.y : reviver.my)) || 0;
    var units = partyUnits(ctx);
    var i, u, d, best = null, bestD = c.radius * c.radius;
    var selfId = reviver && (reviver.id || "local");
    for (i = 0; i < units.length; i++) {
      u = units[i];
      if (u.id === selfId || u.kind === "player" && (u.id === selfId)) continue;
      if (u.ref === reviver) continue;
      if (!isDownedUnit(u)) continue;
      d = dist2(rx, ry, u.x || 0, u.y || 0);
      if (d <= bestD) { bestD = d; best = u; }
    }
    return best;
  }

  function teammateReviveEligible(reviver, target, ctx, data) {
    if (isBrawl(ctx)) return false;
    if (!isPartyMode(ctx)) return false;
    if (!reviverAlive(reviver)) return false;
    if (livingCount(ctx, data) < cfg({ data: data }).minLiving) return false;
    if (!target || !isDownedUnit(target)) return false;
    var selfId = reviver && (reviver.id || "local");
    if (target.id === selfId || target.ref === reviver) return false;
    var c = cfg({ data: data });
    var rx = (reviver.x != null ? reviver.x : reviver.mx) || 0;
    var ry = (reviver.y != null ? reviver.y : reviver.my) || 0;
    return dist2(rx, ry, target.x || 0, target.y || 0) <= c.radius * c.radius;
  }

  /* Solo self-revive is for an otherwise terminal death (tamer down) so the run can continue. */
  function soloSelfReviveEligible(reviver, ctx, data) {
    if (isBrawl(ctx)) return false;
    if (isPartyMode(ctx)) return false;
    if (!reviver) return false;
    var charge = (ctx && ctx.partyReviveCharge != null) ? ctx.partyReviveCharge
      : (ctx && ctx.run && ctx.run.partyReviveCharge != null) ? ctx.run.partyReviveCharge
      : 0;
    if (charge <= 0) return false;
    var downed = !!(reviver.downed || (ctx && ctx.run && ctx.run.downed) || (reviver.tamerHp != null && reviver.tamerHp <= 0));
    return downed;
  }

  function applyMonRevive(target, data) {
    if (!target || !target.ref) return false;
    var c = cfg({ data: data });
    var m = target.ref;
    var maxHp = m.maxHp || target.maxHp || 1;
    m.hp = Math.max(1, Math.round(maxHp * c.hpRatio));
    if (m.maxHp == null) m.maxHp = maxHp;
    m.faint = 0;
    m.monInvuln = Math.max(m.monInvuln || 0, 0.6);
    m.invuln = Math.max(m.invuln || 0, 0.6);
    return true;
  }

  function applySoloSelfRevive(reviver, data) {
    if (!reviver) return false;
    var c = cfg({ data: data });
    if (reviver.tamerMaxHp) {
      reviver.tamerHp = Math.max(1, Math.round(reviver.tamerMaxHp * c.tamerHpRatio));
    } else if (reviver.tamerHp != null) {
      reviver.tamerHp = Math.max(1, reviver.tamerHp || 1);
    }
    reviver.tamerInvuln = Math.max(reviver.tamerInvuln || 0, 0.8);
    reviver.downed = false;
    if ((reviver.hp || 0) <= 0 || (reviver.faint || 0) > 0) {
      var maxHp = reviver.maxHp || 1;
      reviver.hp = Math.max(1, Math.round(maxHp * c.hpRatio));
      reviver.faint = 0;
      reviver.monInvuln = Math.max(reviver.monInvuln || 0, 0.6);
    }
    return true;
  }

  /*
   * Authority-owned hold tick. Completes atomically. Interrupted holds
   * never spend the solo charge. Brawl clears any in-flight hold.
   */
  function tickHold(store, opts) {
    opts = opts || {};
    var data = opts.data;
    var dt = opts.dt || 0;
    var held = !!opts.held;
    var ctx = opts.ctx || store;
    var reviver = opts.reviver;
    var out = { hold: store.reviveHold || null, completed: false, spent: false, cancelled: false, prompt: null, progress: 0, reason: null };
    var c = cfg({ data: data });

    function clear(reason) {
      if (store.reviveHold) out.cancelled = true;
      store.reviveHold = null;
      out.hold = null;
      out.progress = 0;
      out.reason = reason || "cancelled";
      return out;
    }

    if (isBrawl(ctx)) return clear("brawl");
    if (!held) return clear(store.reviveHold ? "release" : null);

    var kind = null, target = null;
    if (!isPartyMode(ctx) && soloSelfReviveEligible(reviver, ctx, data)) {
      kind = "self";
    } else if (isPartyMode(ctx)) {
      target = pickTeammateTarget(reviver, ctx, data);
      if (target && teammateReviveEligible(reviver, target, ctx, data)) kind = "team";
    }
    if (!kind) return clear(store.reviveHold ? "ineligible" : null);

    var key = kind === "self" ? "self" : (target && target.id);
    var hold = store.reviveHold;
    if (!hold || hold.kind !== kind || hold.targetId !== key) {
      hold = { kind: kind, targetId: key, t: 0 };
    }
    hold.t = (hold.t || 0) + dt;
    store.reviveHold = hold;
    out.hold = hold;
    out.progress = Math.min(1, hold.t / c.hold);
    out.prompt = kind === "self"
      ? "Hold to revive"
      : ("Hold to revive " + ((target && target.ref && target.ref.name) || (target && target.form) || "teammate"));

    if (hold.t + 1e-6 >= c.hold) {
      var ok = false;
      if (kind === "self") {
        if (!soloSelfReviveEligible(reviver, ctx, data)) return clear("ineligible");
        ok = applySoloSelfRevive(reviver, data);
        if (ok) {
          if (ctx.partyReviveCharge != null) ctx.partyReviveCharge = Math.max(0, ctx.partyReviveCharge - 1);
          if (ctx.run && ctx.run.partyReviveCharge != null) ctx.run.partyReviveCharge = Math.max(0, ctx.run.partyReviveCharge - 1);
          if (store.partyReviveCharge != null && store !== ctx) store.partyReviveCharge = Math.max(0, store.partyReviveCharge - 1);
          out.spent = true;
        }
      } else {
        if (!teammateReviveEligible(reviver, target, ctx, data)) return clear("ineligible");
        ok = applyMonRevive(target, data);
      }
      store.reviveHold = null;
      out.hold = null;
      out.completed = !!ok;
      out.progress = ok ? 1 : 0;
      out.reason = ok ? "complete" : "failed";
    }
    return out;
  }

  function resetRoundCharge(ctx) {
    if (!ctx) return 1;
    ctx.partyReviveCharge = 1;
    if (ctx.run) ctx.run.partyReviveCharge = 1;
    ctx.reviveHold = null;
    return 1;
  }

  function clearHold(ctx) {
    if (ctx) ctx.reviveHold = null;
    if (ctx && ctx.run) ctx.run.reviveHold = null;
  }

  var api = {
    cfg: cfg,
    isEggForm: isEggForm,
    isLivingMon: isLivingMon,
    partyUnits: partyUnits,
    livingCount: livingCount,
    hasHatchedCombatant: hasHatchedCombatant,
    startingPartySize: startingPartySize,
    isPartyMode: isPartyMode,
    isBrawl: isBrawl,
    pickTeammateTarget: pickTeammateTarget,
    teammateReviveEligible: teammateReviveEligible,
    soloSelfReviveEligible: soloSelfReviveEligible,
    applyMonRevive: applyMonRevive,
    applySoloSelfRevive: applySoloSelfRevive,
    tickHold: tickHold,
    resetRoundCharge: resetRoundCharge,
    clearHold: clearHold,
    isDownedUnit: isDownedUnit,
    reviverAlive: reviverAlive
  };

  D.partyRules = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
