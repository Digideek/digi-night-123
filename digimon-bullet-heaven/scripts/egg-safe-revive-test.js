#!/usr/bin/env node
/* Egg immunity / no pre-hatch spawns, and hold-E revive under the latest
 * solo self-revive vs party teammate-only rules. */
"use strict";
const path = require("path");
const root = path.join(__dirname, "..");
const party = require(path.join(root, "js/party-rules.js"));
const mission = require(path.join(root, "js/net/mission-sim.js"));
const authMod = require(path.join(root, "js/net/authority.js"));

function dataFixture() {
  return {
    SPECIES: {
      digitama: { name: "Digitama", stage: "Egg", hatchTo: "agumon", base: { maxHp: 30, speed: 40, damage: 0 } },
      agumon: { name: "Agumon", stage: "Rookie", base: { maxHp: 40, speed: 90, damage: 4 }, startWeapon: "pepperBreath" },
      gabumon: { name: "Gabumon", stage: "Rookie", base: { maxHp: 40, speed: 90, damage: 4 } },
      patamon: { name: "Patamon", stage: "Rookie", base: { maxHp: 36, speed: 90, damage: 4 } }
    },
    ENEMIES: { pagumon: { name: "Pagumon", hp: 28, speed: 42, damage: 7, contactCd: 0.7, xp: 6, color: "#a87840", radius: 12 } },
    WEAPONS: { pepperBreath: { maxLevel: 5, type: "projectile", levels: [{ damage: 4, cooldown: 0.4, speed: 300, radius: 6, life: 1 }] } },
    CARE: { fullnessDecayPerSec: 2, fullnessMax: 100, happinessMax: 100, hitHappinessLoss: 2, heavyHitHappinessLoss: 6, heavyHitRatio: 0.25, killStreakWindow: 4, killStreakEvery: 5, killStreakHappiness: 4, desperationHpRatio: 0.2, desperationHappinessDrain: 2, startFullness: 80 },
    HATCH: { time: 24, feedBonus: 8, protectBonus: 0.5, protectRadius: 90 },
    FAINT: { reviveHpRatio: 0.4, duration: 3.2 },
    PARTY_REVIVE: { hold: 3, radius: 80, hpRatio: 0.4, tamerHpRatio: 0.5, minLiving: 2 },
    TAMER: { speed: 168, radius: 10, iFrame: 0.05, maxHp: 100 },
    PLAYER: { iFrame: 0.05, pickupRadius: 18 },
    FARM_CFG: { stayCapSeconds: 45, intervalMinutes: [3, 6, 10], intervalPlus: 4, heal: { hp: 0.2, tamerHp: 0.2, dropChance: 0, worldEvery: 0 } },
    BRAWL: { everyLevels: 99, minLevel: 99, skipEgg: true, resultSeconds: 0.1, payoutSeconds: 0.1 },
    waveAt: function () { return { cap: 14, spdMul: 1, dmgMul: 1, hpMul: 1, rates: { pagumon: 0.3 } }; }
  };
}

function assert(cond, msg) { if (!cond) throw new Error(msg); }

function hold(sim, id, seconds, on) {
  let seq = (sim.players[0] && sim.players[0].seqAck) || 0;
  const ticks = Math.ceil(seconds / sim.dt);
  for (let i = 0; i < ticks; i++) {
    seq += 1;
    sim.pushInput({ id: id, inputs: [{ seq: seq, x: 0, y: 0, interact: !!on, interactHeld: !!on }] });
    sim.step();
  }
}

function stepFor(sim, seconds) {
  const ticks = Math.ceil(seconds / sim.dt);
  for (let i = 0; i < ticks; i++) sim.step();
}

function main() {
  const data = dataFixture();
  let fails = 0;
  function check(name, fn) {
    try { fn(); console.log("  ok  " + name); }
    catch (err) { fails += 1; console.log("  FAIL " + name + ": " + err.stack.split("\n")[0] + " — " + err.message); }
  }

  check("egg stays safe past damage, hunger, and lifecycle, and does not attack", function () {
    const sim = new mission.MissionSim({ hz: 25, seed: 1, data: data, viewW: 800, viewH: 600 });
    const p = sim.join({ id: "local", hasTamer: true, form: "digitama", x: 0, y: 0, mx: 8, my: 0, hp: 30, maxHp: 30, tamerHp: 100, tamerMaxHp: 100, fullness: 80, hatchLeft: 24 });
    sim.freezeParty(1);
    const hp0 = p.hp, full0 = p.fullness;
    sim.hurtMon(p, 999);
    assert(p.hp === hp0 && p.faint === 0, "hurtMon damaged the egg");
    const e = sim.spawnEnemy("pagumon", { x: p.mx, y: p.my, keepType: true });
    /* Even a forced debug spawn should not be produced by the scheduler;
     * contact still must not hurt the egg. */
    e.hitCdM = 0;
    sim._contactHits(e, data.ENEMIES.pagumon, 50, sim.dt);
    assert(p.hp === hp0, "contact damaged the egg");
    /* Remove the forced enemy and confirm the scheduler stays quiet. */
    sim.enemies = [];
    sim.openingSpawned = false;
    stepFor(sim, 8);
    assert(sim.enemies.length === 0, "enemies spawned before hatch: " + sim.enemies.length);
    assert(p.fullness === full0, "hunger drained on egg " + p.fullness);
    assert(p.form === "digitama", "form changed");
    const bulletsBefore = sim.bullets.length;
    p.weapons = [{ id: "pepperBreath", level: 1, cd: 0 }];
    sim._updateWeapons(p, 1);
    assert(sim.bullets.length === bulletsBefore, "egg fired a weapon");
    assert(!sim._combatReady(), "combatReady while still an egg");
  });

  check("hatch (or a hatched teammate) resumes enemy spawns; mixed party keeps the egg immune", function () {
    const sim = new mission.MissionSim({ hz: 25, seed: 2, data: data, viewW: 800, viewH: 600 });
    const p = sim.join({ id: "local", hasTamer: true, form: "digitama", x: 0, y: 0, mx: 8, my: 0, hp: 30, maxHp: 30, tamerHp: 100, tamerMaxHp: 100, fullness: 80, hatchLeft: 24 });
    sim.addCpu({ id: "cpu-1", form: "gabumon", x: 40, y: 0, hp: 40, maxHp: 40 });
    sim.freezeParty(2);
    assert(sim._combatReady(), "hatched CPU should open combat");
    /* Opening lull: nothing spawns until HATCH.enemyLead seconds before the
     * egg hatches, even with a hatched teammate. */
    /* Bare MissionSim has no Progression, so tick the hatch clock here. */
    const lead = data.HATCH.enemyLead != null ? data.HATCH.enemyLead : 1;
    function incubate(seconds) {
      const n = Math.ceil(seconds / sim.dt);
      for (let i = 0; i < n; i++) { p.hatchLeft = Math.max(0, p.hatchLeft - sim.dt); sim.step(); }
    }
    incubate(p.hatchLeft - lead - 0.3);
    assert(sim.enemies.length === 0, "enemies spawned during the egg lull: " + sim.enemies.length);
    incubate(0.6);
    assert(sim.enemies.length > 0, "no spawns once the egg is about to hatch");
    const hp0 = p.hp;
    sim.hurtMon(p, 80);
    assert(p.hp === hp0, "mixed-party egg took damage");
    /* Local hatch: flip form, spawns already running. */
    p.form = "agumon";
    p.hatchLeft = 0;
    assert(sim._combatReady(), "local hatch should stay ready");
  });

  check("solo dead hold completes once; second death is denied", function () {
    const sim = new mission.MissionSim({ hz: 25, seed: 3, data: data, viewW: 800, viewH: 600 });
    const p = sim.join({ id: "local", hasTamer: true, form: "agumon", x: 0, y: 0, mx: 8, my: 0, hp: 40, maxHp: 40, tamerHp: 100, tamerMaxHp: 100, hatchLeft: 0 });
    sim.freezeParty(1);
    assert(!party.isPartyMode(sim), "solo classified as party");
    assert(sim.partyReviveCharge === 1, "charge");
    p.tamerInvuln = 0;
    sim.hurtTamer(p, 999);
    assert(p.downed && p.tamerHp === 0 && !sim.runOver, "should be downed, not run-over");
    hold(sim, "local", 1.2, true);
    assert(p.downed && sim.partyReviveCharge === 1, "interrupted/partial hold spent the charge");
    hold(sim, "local", 0, false);
    hold(sim, "local", 3.2, true);
    assert(!p.downed && p.tamerHp > 0, "self-revive did not complete: hp=" + p.tamerHp);
    assert(sim.partyReviveCharge === 0, "charge not spent on success");
    p.tamerInvuln = 0;
    sim.hurtTamer(p, 999);
    assert(sim.runOver && p.tamerHp === 0, "second death should end the run");
    const hpAfter = p.tamerHp;
    hold(sim, "local", 3.2, true);
    assert(p.tamerHp === hpAfter && sim.runOver, "second self-revive succeeded");
  });

  check("interrupted hold does not spend the solo charge", function () {
    const sim = new mission.MissionSim({ hz: 25, seed: 4, data: data, viewW: 800, viewH: 600 });
    const p = sim.join({ id: "local", hasTamer: true, form: "agumon", x: 0, y: 0, hp: 40, maxHp: 40, tamerHp: 100, tamerMaxHp: 100 });
    sim.freezeParty(1);
    p.tamerInvuln = 0;
    sim.hurtTamer(p, 999);
    hold(sim, "local", 1.5, true);
    hold(sim, "local", 0.4, false);
    assert(sim.partyReviveCharge === 1 && p.downed, "charge spent on release");
    hold(sim, "local", 3.2, true);
    assert(!p.downed && p.tamerHp > 0 && sim.partyReviveCharge === 0, "resume after interrupt failed");
  });

  check("party teammate revive works with >=2 living and is not a free/self revive", function () {
    const sim = new mission.MissionSim({ hz: 25, seed: 5, data: data, viewW: 800, viewH: 600 });
    const p = sim.join({ id: "local", hasTamer: true, form: "agumon", x: 0, y: 0, mx: 0, my: 0, hp: 40, maxHp: 40, tamerHp: 100, tamerMaxHp: 100 });
    const c1 = sim.addCpu({ id: "cpu-1", form: "gabumon", x: 20, y: 0, hp: 0, maxHp: 40 });
    const c2 = sim.addCpu({ id: "cpu-2", form: "patamon", x: 80, y: 0, hp: 40, maxHp: 40 });
    sim.freezeParty(3);
    assert(party.isPartyMode(sim), "party not detected");
    assert(party.livingCount(sim, data) === 2, "living " + party.livingCount(sim, data));
    const charge = sim.partyReviveCharge;
    hold(sim, "local", 3.2, true);
    assert(c1.hp > 0, "teammate was not revived, hp=" + c1.hp);
    assert(sim.partyReviveCharge === charge, "party revive spent the solo charge");
  });

  check("party last survivor cannot revive; no self-revive; no free exception", function () {
    const sim = new mission.MissionSim({ hz: 25, seed: 6, data: data, viewW: 800, viewH: 600 });
    const p = sim.join({ id: "local", hasTamer: true, form: "agumon", x: 0, y: 0, hp: 40, maxHp: 40, tamerHp: 100, tamerMaxHp: 100 });
    const c1 = sim.addCpu({ id: "cpu-1", form: "gabumon", x: 16, y: 0, hp: 0, maxHp: 40 });
    const c2 = sim.addCpu({ id: "cpu-2", form: "patamon", x: 20, y: 0, hp: 0, maxHp: 40 });
    sim.freezeParty(3);
    assert(party.livingCount(sim, data) === 1, "setup living");
    hold(sim, "local", 3.2, true);
    assert(c1.hp === 0 && c2.hp === 0, "last-survivor revive worked");
    /* Starting size stays party even with one living. */
    assert(party.isPartyMode(sim) && sim.startingPartySize === 3, "party became solo");
    /* Tamer death in party is run-over, not a free self-revive. */
    p.tamerInvuln = 0;
    sim.hurtTamer(p, 999);
    assert(sim.runOver && !p.downed, "party tamer death should end the run, not down");
  });

  check("authority rejects instant/forged revive; brawl denies hold with no carryover", function () {
    const sim = new mission.MissionSim({ hz: 25, seed: 7, data: data, viewW: 800, viewH: 600 });
    const auth = new authMod.Authority({ sim: sim, hz: 25, seed: 7, mission: true, data: data });
    const p = sim.join({ id: "local", hasTamer: true, form: "agumon", x: 0, y: 0, hp: 40, maxHp: 40, tamerHp: 100, tamerMaxHp: 100 });
    sim.addCpu({ id: "cpu-1", form: "gabumon", x: 16, y: 0, hp: 0, maxHp: 40 });
    sim.addCpu({ id: "cpu-2", form: "patamon", x: 80, y: 0, hp: 40, maxHp: 40 });
    sim.freezeParty(3);
    const r1 = auth.onMessage({ type: "party.revive", id: "local", target: "cpu-1" });
    const r2 = auth.act({ type: "revive", id: "local", target: "cpu-1" });
    const r3 = auth.act({ type: "selfRevive", id: "local" });
    const r4 = auth.act({ type: "forceRevive", id: "local" });
    assert(!r1.ok && !r2.ok && !r3.ok && !r4.ok, "forged revive accepted");
    assert(sim.cpus[0].hp === 0, "forged revive applied");
    /* Start a hold, then flip to brawl: hold must clear and not complete. */
    hold(sim, "local", 1.5, true);
    assert(sim.reviveHold, "hold did not start");
    sim.phase = "brawl";
    hold(sim, "local", 2.0, true);
    assert(!sim.reviveHold, "hold carried into brawl");
    assert(sim.cpus[0].hp === 0, "teammate revived during brawl");
    sim.phase = "playing";
    /* No carryover completion on the next tick without a fresh hold. */
    stepFor(sim, 0.2);
    assert(sim.cpus[0].hp === 0, "carryover revive after brawl");
  });

  check("solo charge resets after a real brawl resume, not a farm visit", function () {
    const sim = new mission.MissionSim({ hz: 25, seed: 8, data: data, viewW: 800, viewH: 600 });
    const auth = new authMod.Authority({ sim: sim, hz: 25, seed: 8, mission: true, data: data });
    const p = sim.join({ id: "local", hasTamer: true, form: "agumon", x: 0, y: 0, hp: 40, maxHp: 40, tamerHp: 100, tamerMaxHp: 100, pendingFarm: true, lastFarmAt: -1e9 });
    sim.freezeParty(1);
    sim.partyReviveCharge = 0;
    const entered = auth.act({ type: "farm.enter", id: "local", scheduled: true });
    assert(entered.ok, "farm.enter " + (entered.reason || ""));
    const ret = auth.act({ type: "farm.return", id: "local" });
    assert(ret.ok, "farm.return");
    assert(sim.partyReviveCharge === 0, "farm return reset the solo charge");
    sim.phase = "brawl";
    sim.brawlSim = { match: { settled: true }, snapshot: function () { return { settled: true }; } };
    const ended = auth.progression.endBrawlPhase();
    assert(ended.ok, "endBrawl " + (ended.reason || ""));
    assert(sim.partyReviveCharge === 1, "brawl resume did not reset charge");
  });

  if (fails) {
    console.log("egg-safe-revive-test: " + fails + " failed");
    process.exit(1);
  }
  console.log("egg-safe-revive-test: all passed");
}

main();
