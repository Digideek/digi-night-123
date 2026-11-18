#!/usr/bin/env node
/* Six-client local sim: 150ms latency, 10% loss. Asserts clients stay in
 * sync with the authority after a reliable snapshot catch-up. */
"use strict";
const authMod = require("../js/net/authority.js");
const tr = require("../js/net/transport.js");
const cl = require("../js/net/client.js");

const LAT = 150, LOSS = 0.10, JIT = 20;
const N = 6;
const SECONDS = 4;
const HZ = 25;

function main() {
  const authority = new authMod.Authority({ hz: HZ });
  const clients = [];
  const nowRef = { t: 0 };
  const now = () => nowRef.t;

  for (let i = 0; i < N; i++) {
    const pair = tr.pairSimulated({ latencyMs: LAT, jitterMs: JIT, loss: LOSS, seed: 10 + i, now });
    const id = "p" + i;
    const client = new cl.NetClient({ id: id, transport: pair.client, speed: 168 });
    pair.client.now = now;
    pair.server.now = now;
    pair.server.subscribe((msg) => {
      if (msg && msg.type === "input") authority.pushInput(msg);
    });
    authority.onSnapshot((snap) => { pair.server.send(snap); });
    authority.join({ id: id, kind: i === 0 ? "local" : "client", x: i * 10, y: 0, hasTamer: i === 0 });
    clients.push({ id, client, pair });
  }

  const ticks = SECONDS * HZ;
  const errors = [];
  for (let t = 0; t < ticks; t++) {
    nowRef.t = t * (1000 / HZ);
    for (let i = 0; i < N; i++) {
      const ang = (t / HZ) + i;
      clients[i].client.queueInput(Math.cos(ang), Math.sin(ang), false);
      clients[i].pair.client.flush(nowRef.t);
      clients[i].pair.server.flush(nowRef.t);
    }
    authority.step();
    for (let i = 0; i < N; i++) {
      clients[i].pair.server.flush(nowRef.t);
      clients[i].pair.client.flush(nowRef.t);
    }
  }

  /* Lossless catch-up: zero-latency reliable snapshot, as a real transport would retry. */
  for (let i = 0; i < N; i++) {
    clients[i].pair.client.setSim({ loss: 0, latencyMs: 0, jitterMs: 0 });
    clients[i].pair.server.setSim({ loss: 0, latencyMs: 0, jitterMs: 0 });
  }
  const snap = authority.snapshot(true);
  for (let i = 0; i < N; i++) clients[i].pair.server.send(snap);
  nowRef.t += 1;
  for (let i = 0; i < N; i++) {
    clients[i].pair.client.flush(nowRef.t);
    clients[i].pair.server.flush(nowRef.t);
  }

  let maxErr = 0;
  let received = 0;
  for (let i = 0; i < N; i++) {
    if (clients[i].client.lastSnap) received++;
    else errors.push(clients[i].id + " never received a snapshot");
    const truth = snap.entities.find((e) => e.id === clients[i].id);
    const pred = clients[i].client.predicted;
    if (!truth) { errors.push("missing entity " + clients[i].id); continue; }
    const dx = pred.x - truth.x, dy = pred.y - truth.y;
    const err = Math.sqrt(dx * dx + dy * dy);
    if (err > maxErr) maxErr = err;
    if (err > 48) errors.push(clients[i].id + " drifted " + err.toFixed(1) + "px from authority");
  }

  console.log("net-sim-test: 6 clients, " + LAT + "ms, " + (LOSS * 100) + "% loss, " + SECONDS + "s");
  console.log("  authority tick " + authority.tick + ", snapshots received " + received + "/" + N + ", max pose error " + maxErr.toFixed(2) + "px");
  if (errors.length) {
    errors.forEach((e) => console.log("  ERROR " + e));
    console.log("FAIL");
    process.exit(1);
  }
  console.log("OK");
}

main();
