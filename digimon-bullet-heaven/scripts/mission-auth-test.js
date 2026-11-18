#!/usr/bin/env node
/* Six-client mission authority test at 150ms / 10% loss.
 * Authority owns enemies, HP, pickups, and bits. Client-asserted
 * damage/currency is rejected. No ports are opened. */
"use strict";
const path = require("path");
const root = path.join(__dirname, "..");
const mission = require(path.join(root, "js/net/mission-sim.js"));
const authMod = require(path.join(root, "js/net/authority.js"));
const tr = require(path.join(root, "js/net/transport.js"));

const N = 6, LAT = 150, LOSS = 0.10, JIT = 20, SECONDS = 3, HZ = authMod.TICK_HZ;

function keyWorld(snap) {
  const enemies = (snap.enemies || []).map((e) => e._id + ":" + Math.round(e.hp * 10) + ":" + e.type).sort().join("|");
  const orbs = (snap.orbs || []).map((o) => (o.id || "") + ":" + o.kind + ":" + o.value).sort().join("|");
  const bits = snap.players && snap.players[0] ? snap.players[0].bits : snap.bits;
  return { enemies: enemies, orbs: orbs, kills: snap.kills, bits: bits, enemyCount: (snap.enemies || []).length, orbCount: (snap.orbs || []).length };
}

function main() {
  const nowRef = { t: 0 };
  const now = () => nowRef.t;
  const sim = new mission.MissionSim({ hz: HZ, seed: 42, viewW: 1280, viewH: 720 });
  const authority = new authMod.Authority({ sim: sim, hz: HZ, seed: 42, mission: true });

  const clients = [];
  for (let i = 0; i < N; i++) {
    const id = "p" + i;
    const pair = tr.pairSimulated({ latencyMs: LAT, jitterMs: JIT, loss: LOSS, seed: 20 + i, now: now });
    const box = { id: id, pair: pair, last: null };
    pair.client.subscribe((msg) => { if (msg && (msg.kind === "snapshot" || msg.enemies)) box.last = msg; });
    pair.server.subscribe((msg) => { if (msg && msg.type === "input") authority.onMessage(msg); });
    authority.onSnapshot((snap) => { pair.server.send(snap); });
    authority.join({ id: id, kind: i === 0 ? "host-client" : "client", hasTamer: true, form: "agumon", x: i * 16, y: 0, hp: 80, maxHp: 80, tamerHp: 100, tamerMaxHp: 100 });
    clients.push(box);
  }

  const e0 = sim.spawnEnemy("pagumon", { x: 80, y: 0 });
  const hp0 = e0.hp;
  const bits0 = sim.players[0].bits;
  const r1 = authority.onMessage({ type: "damage", id: "p1", target: e0._id, damage: 9999 });
  const r2 = authority.onMessage({ type: "grantBits", id: "p2", grantBits: 5000 });
  const r3 = authority.onMessage({ type: "setHp", id: "p0", hpSet: 1 });
  if (r1.ok || r2.ok || r3.ok) throw new Error("illegal messages were accepted");
  if (e0.hp !== hp0) throw new Error("client-asserted damage applied");
  if (sim.players[0].bits !== bits0) throw new Error("client-asserted currency applied");

  let seq = 0;
  const ticks = SECONDS * HZ;
  for (let t = 0; t < ticks; t++) {
    nowRef.t = t * (1000 / HZ);
    for (let i = 0; i < N; i++) {
      seq += 1;
      clients[i].pair.client.send({
        type: "input",
        id: clients[i].id,
        inputs: [{ seq: seq, x: Math.cos((t / HZ) + i), y: Math.sin((t / HZ) * 0.7 + i), atk: true }]
      });
      clients[i].pair.client.flush(nowRef.t);
      clients[i].pair.server.flush(nowRef.t);
    }
    authority.step();
    for (let i = 0; i < N; i++) {
      clients[i].pair.server.flush(nowRef.t);
      clients[i].pair.client.flush(nowRef.t);
    }
  }

  /* Lossless catch-up. */
  for (let i = 0; i < N; i++) {
    clients[i].pair.client.setSim({ loss: 0, latencyMs: 0, jitterMs: 0 });
    clients[i].pair.server.setSim({ loss: 0, latencyMs: 0, jitterMs: 0 });
  }
  const final = authority.snapshot(true);
  for (let i = 0; i < N; i++) clients[i].pair.server.send(final);
  nowRef.t += 1;
  for (let i = 0; i < N; i++) {
    clients[i].pair.client.flush(nowRef.t);
    clients[i].pair.server.flush(nowRef.t);
  }

  const truth = keyWorld(final);
  const errors = [];
  let received = 0;
  for (let i = 0; i < N; i++) {
    if (!clients[i].last) { errors.push(clients[i].id + " never received a snapshot"); continue; }
    received += 1;
    const got = keyWorld(clients[i].last);
    if (got.enemies !== truth.enemies) errors.push(clients[i].id + " enemy/HP mismatch");
    if (got.orbs !== truth.orbs) errors.push(clients[i].id + " pickup mismatch");
    if (got.kills !== truth.kills) errors.push(clients[i].id + " kill mismatch");
    if (got.bits !== truth.bits) errors.push(clients[i].id + " bits mismatch");
  }

  const v = authority.validateProgression({ bits: truth.bits + 999, xp: 0, level: 99 });
  if (v.ok) errors.push("forged progression was accepted");
  if (!v.clashes || v.clashes.indexOf("bits") < 0) errors.push("bits clash not reported");
  if (truth.kills === 0 && truth.enemyCount === 0) errors.push("mission sim produced no combat world");
  if (final.rejected < 3) errors.push("expected illegal messages counted, got " + final.rejected);

  console.log("mission-auth-test: 6 clients, " + LAT + "ms, " + (LOSS * 100) + "% loss, " + SECONDS + "s");
  console.log("  tick " + authority.tick + ", snaps " + received + "/" + N +
    ", enemies " + truth.enemyCount + ", orbs " + truth.orbCount +
    ", kills " + truth.kills + ", bits " + truth.bits + ", rejected " + final.rejected);
  if (errors.length) {
    errors.forEach((e) => console.error("  FAIL", e));
    process.exit(1);
  }
  console.log("OK");
}

main();
