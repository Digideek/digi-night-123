#!/usr/bin/env node
/* Validate js/evolution-tree.js against frames-up-all/.
 * Checks:
 *  - every referenced species has frames (idle_0.png)
 *  - no unexpected dead ends
 *  - every Baby I and Baby II can reach a Mega or Mega+
 *  - no cycles except intentional recover / mode loops
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TREE = require(path.join(ROOT, "js/evolution-tree.js"));
const RARITY = require(path.join(ROOT, "js/rarity.js"));
const GATES = require(path.join(ROOT, "js/evo-stat-gates.js"));
const FRAMES = path.join(ROOT, "assets/sprites/frames-up-all");
const MANIFEST = JSON.parse(
  fs.readFileSync(path.join(ROOT, "assets/sprites/up-manifest.json"), "utf8")
);

const TERMINAL = new Set(["Mega", "Mega+"]);
// Armor is terminal only when it has no outgoing non-neglect path.
const INTENTIONAL_KINDS = new Set(["recover", "mode"]);

const species = TREE.species;
const branches = TREE.branches;

let failed = 0;
const errors = [];
const warnings = [];

function fail(msg) {
  failed++;
  errors.push(msg);
}

function warn(msg) {
  warnings.push(msg);
}

function hasFrames(id) {
  const dir = path.join(FRAMES, id);
  /* The loose frames are source art and live in their own zip since build 16zm.
   * Without them, check what the game really loads: the packed sheet. */
  if (!fs.existsSync(FRAMES)) return fs.existsSync(path.join(ROOT, "assets/sprites/atlases-up-all", id + ".png"));
  return fs.existsSync(path.join(dir, "idle_0.png"));
}

function isTerminal(id) {
  const rec = species[id];
  if (!rec) return false;
  if (TERMINAL.has(rec.stage)) {
    const outs = branches[id] || [];
    // Mega with a mode/mega+ continuation is not a dead-end failure
    return !outs.some((b) =>
      ["mode", "standard", "fallback", "special", "warp", "fusion"].includes(b.kind)
    );
  }
  if (rec.stage === "Armor") {
    const outs = branches[id] || [];
    return !outs.some((b) =>
      ["standard", "fallback", "special", "warp", "mode"].includes(b.kind)
    );
  }
  return false;
}

// 1. Every tree species and every branch target has frames.
for (const id of Object.keys(species)) {
  if (!hasFrames(id)) fail(`species ${id} is in the tree but has no frames at frames-up-all/${id}/idle_0.png`);
  for (const b of branches[id] || []) {
    if (!species[b.to]) fail(`${id} → ${b.to} (${b.kind}) references a species not in the tree`);
    else if (!hasFrames(b.to)) fail(`${id} → ${b.to} (${b.kind}) has no frames`);
    if (b.partner) {
      for (const p of String(b.partner).split("+")) {
        if (p && !hasFrames(p) && !MANIFEST.species[p]) {
          warn(`${id} → ${b.to} fusion partner ${p} has no frames (jogress will not be available)`);
        }
      }
    }
    if (b.conditions && b.conditions.requiresPartner) {
      for (const p of String(b.conditions.requiresPartner).split("+")) {
        if (p && !species[p] && !MANIFEST.species[p]) {
          warn(`${id} fusion requires missing partner ${p}`);
        }
      }
    }
  }
}

// Manifest species that are not skins should usually be in the tree.
const SKINS = new Set([
  "agumon_adventure", "biyomon_adventure", "gabumon_adventure",
  "gatomon_adventure", "gomamon_adventure", "veemon_adventure02",
  "wormmon_adventure02", "wargreymon_adventure", "metalgarurumon_adventure",
  "guilmon_tamers", "devimon_normal", "etemon_normal", "machinedramon_normal",
  "gekkomon_beatbreak", "gekkomon_runevent", "gekkomon_runevent_fever",
  "gekkomon_runevent_shadow",
]);
for (const id of Object.keys(MANIFEST.species)) {
  if (SKINS.has(id)) continue;
  if (!species[id]) warn(`manifest species ${id} is not a tree node (ok if it is a skin or unused)`);
  if (!hasFrames(id)) fail(`manifest species ${id} is missing frames`);
}

// 2. Dead ends: non-terminals must have standard + fallback + neglect.
for (const id of Object.keys(species)) {
  if (isTerminal(id)) continue;
  const rec = species[id];
  const outs = branches[id] || [];
  if (rec.stage === "Mega" || rec.stage === "Mega+") continue;
  if (rec.stage === "Armor" && outs.length === 0) continue;
  const kinds = new Set(outs.map((b) => b.kind));
  if (!kinds.has("standard") && !kinds.has("fallback")) {
    fail(`dead end: ${id} (${rec.stage}) has no standard/fallback branch`);
  }
  if (!kinds.has("neglect") && rec.stage !== "Armor") {
    fail(`dead end: ${id} (${rec.stage}) has no neglect branch`);
  }
  if (outs.length === 0) fail(`dead end: ${id} (${rec.stage}) has zero outgoing branches`);
}

// 3. Every Baby I and Baby II can reach a Mega or Mega+ (ignoring fusion-only
//    gates, because a solo run may not have a partner).
function canReachMega(start) {
  const q = [start];
  const seen = new Set([start]);
  while (q.length) {
    const cur = q.shift();
    const rec = species[cur];
    if (rec && (rec.stage === "Mega" || rec.stage === "Mega+")) return true;
    for (const b of branches[cur] || []) {
      if (b.kind === "fusion") continue;
      if (!seen.has(b.to) && species[b.to]) {
        seen.add(b.to);
        q.push(b.to);
      }
    }
  }
  return false;
}

const babies = Object.keys(species).filter((id) =>
  species[id].stage === "Baby I" || species[id].stage === "Baby II"
);
for (const id of babies) {
  if (!canReachMega(id)) {
    fail(`Baby ${id} (${species[id].name}) cannot reach a Mega / Mega+ along any non-fusion path`);
  }
}

// 4. Cycles. Allowed if every edge in the cycle is recover or mode, or the
//    cycle is a recover loop that also uses a neglect / standard edge back
//    through a neglect form (Agumon → Numemon → Greymon → ... is OK if at
//    least one edge is recover, or neglect+recover).
function findCycles() {
  const cycles = [];
  const color = {}; // 0 unvisited, 1 in stack, 2 done
  const stack = [];

  function dfs(u) {
    color[u] = 1;
    stack.push(u);
    for (const b of branches[u] || []) {
      const v = b.to;
      if (!species[v]) continue;
      if (color[v] === 1) {
        const idx = stack.indexOf(v);
        const nodes = stack.slice(idx).concat(v);
        const edges = [];
        for (let i = 0; i < nodes.length - 1; i++) {
          const kinds = (branches[nodes[i]] || [])
            .filter((x) => x.to === nodes[i + 1])
            .map((x) => x.kind);
          edges.push({ from: nodes[i], to: nodes[i + 1], kinds });
        }
        cycles.push({ nodes, edges });
      } else if (!color[v]) {
        dfs(v);
      }
    }
    stack.pop();
    color[u] = 2;
  }

  for (const id of Object.keys(species)) {
    if (!color[id]) dfs(id);
  }
  return cycles;
}

function cycleIntentional(c) {
  // A cycle is intentional if every closed walk uses only recover/mode, OR
  // it contains at least one recover or mode edge (neglect ⇄ recover loops,
  // Sistermon, Imperialdramon, Diaboromon).
  return c.edges.every((e) => e.kinds.length && e.kinds.every((k) => INTENTIONAL_KINDS.has(k) || k === "fallback"))
    || c.edges.some((e) => e.kinds.some((k) => INTENTIONAL_KINDS.has(k)));
}

const cycles = findCycles();
const unexpected = [];
// Dedup cycles by rotated node signature
const seenSig = new Set();
for (const c of cycles) {
  const core = c.nodes.slice(0, -1);
  const rot = core.concat(core).join(">");
  let sig = null;
  for (let i = 0; i < core.length; i++) {
    const s = core.slice(i).concat(core.slice(0, i)).join(">");
    if (seenSig.has(s)) {
      sig = s;
      break;
    }
    if (!sig || s < sig) sig = s;
  }
  if (seenSig.has(sig)) continue;
  seenSig.add(sig);
  if (!cycleIntentional(c)) unexpected.push(c);
}

for (const c of unexpected) {
  const desc = c.edges
    .map((e) => `${e.from} -[${e.kinds.join("|")}]-> ${e.to}`)
    .join(" → ");
  fail(`unexpected cycle: ${desc}`);
}

// Existing gates present and unchanged.
const expectedGates = TREE.existingGatesPreserved || [];
for (const g of expectedGates) {
  const found = (branches[g.from] || []).find((b) => b.to === g.to && b.kind === g.kind);
  if (!found) {
    fail(`existing gate missing: ${g.from} → ${g.to} (${g.kind})`);
    continue;
  }
  const cond = found.conditions || {};
  const want = g.conditions || {};
  for (const k of Object.keys(want)) {
    if (JSON.stringify(cond[k]) !== JSON.stringify(want[k])) {
      fail(`existing gate changed: ${g.from} → ${g.to} (${g.kind}) ${k} expected ${JSON.stringify(want[k])} got ${JSON.stringify(cond[k])}`);
    }
  }
}


// 5. Hidden 5-tier rarity layer: every species and edge has a tier 1–5,
//    every species is reachable from a Baby, T1 backbone and MetalGreymon stay put.
if (!RARITY || typeof RARITY.validate !== "function") {
  fail("js/rarity.js did not export validate()");
} else {
  const rarity = RARITY.validate();
  if (!rarity.ok) {
    for (const e of rarity.errors) fail("rarity: " + e);
  }
  if (RARITY.tierOf("metalgreymon") !== 3) fail("rarity: metalgreymon must be tier 3");
  if (RARITY.tierOf("agumon") !== 1 || RARITY.tierOf("greymon") !== 1) fail("rarity: agumon/greymon must be tier 1");
  if (RARITY.tierOf("botamon") !== 1 || RARITY.tierOf("koromon") !== 1) fail("rarity: botamon/koromon must be tier 1");
}



// 6. Hidden competing-stat caps: no min>max, every species keeps a reachable
//    branch under lopsided training, and lopsided strength blocks balance
//    lines while still allowing a strength line.
if (!GATES || typeof GATES.validate !== "function") {
  fail("js/evo-stat-gates.js did not export validate()");
} else {
  if (typeof GATES.install === "function") GATES.install(TREE);
  const gates = GATES.validate(TREE);
  if (!gates.ok) {
    for (const e of gates.errors) fail("stat-gates: " + e);
  }
  if (!gates.lopsided || !gates.lopsided.blockedBalance || !gates.lopsided.allowedStrength) {
    fail("stat-gates: lopsided strength must block a balance line and allow a strength line");
  } else {
    console.log(`  stat caps    : lopsided STR blocks ${gates.lopsided.balance}, allows ${gates.lopsided.strength}`);
  }
}

// Report
const nSpecies = Object.keys(species).length;
const nBranches = Object.keys(branches).reduce((n, id) => n + (branches[id] || []).length, 0);
const nIntentional = cycles.length ? [...seenSig].length - unexpected.length : 0;

console.log(`Evolution tree validation`);
console.log(`  tree species : ${nSpecies}`);
console.log(`  branches     : ${nBranches}`);
console.log(`  babies       : ${babies.length} (all ${babies.every(canReachMega) ? "can" : "DO NOT all"} reach a Mega)`);
console.log(`  cycles found : ${[...seenSig].length} (${unexpected.length} unexpected, remainder treated as intentional recover/mode)`);
console.log(`  rarity       : ${RARITY && RARITY.validate ? "installed" : "MISSING"} (MetalGreymon T${RARITY.tierOf("metalgreymon")}, Agumon T${RARITY.tierOf("agumon")})`);
console.log(`  stat gates   : ${GATES && GATES.validate ? "installed" : "MISSING"}`);
console.log(`  warnings     : ${warnings.length}`);
console.log(`  errors       : ${errors.length}`);
for (const w of warnings) console.log("  WARN  " + w);
for (const e of errors) console.log("  ERROR " + e);
if (failed) {
  console.log("FAIL");
  process.exit(1);
}
console.log("OK");
