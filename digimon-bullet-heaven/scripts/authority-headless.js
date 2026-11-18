#!/usr/bin/env node
/* Headless authority entry. A later VPS would start this and point
 * transports at a private URL — no ports are opened here. */
"use strict";
const path = require("path");
const mission = require(path.join(__dirname, "../js/net/mission-sim.js"));
const auth = require(path.join(__dirname, "../js/net/authority.js"));
const sim = new mission.MissionSim({ seed: 1, hz: auth.TICK_HZ });
const a = new auth.Authority({ sim: sim, seed: 1 });
console.log("authority-headless ready", {
  hz: auth.TICK_HZ,
  slots: auth.SLOTS,
  tick: a.tick,
  mission: !!a.sim
});
console.log("No socket is listening. This process is a library check only.");
process.exit(0);
