#!/usr/bin/env python3
"""Validate verified Championship item crops, reverted mappings, and hookup."""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image
import numpy as np

ROOT = Path("/workspace/digimon-bullet-heaven")
ITEMS = ROOT / "assets" / "items"
errors = []

def err(msg):
    errors.append(msg)
    print("FAIL:", msg)

def ok(msg):
    print("OK:", msg)

manifest = json.loads((ITEMS / "manifest.json").read_text())
sprites = {e["id"]: e for e in manifest["sprites"]}
swaps = manifest["swaps"]

expected_swaps = {"meat": "meat", "meatPack": "meat", "food": "meat", "vitamin": "protein_pill"}
if swaps != expected_swaps:
    err(f"swaps mismatch: {swaps} != {expected_swaps}")
else:
    ok(f"swaps {swaps}")

if "medicine" in swaps:
    err("medicine must not be swapped; portrait was reverted")
else:
    ok("medicine is not in swaps")

if "medicine" not in manifest["unmatched_existing_ids"]:
    err("medicine should be on the unmatched/fallback list")
else:
    ok("medicine listed as unmatched (procedural fallback)")

if not manifest.get("reverted", {}).get("medicine"):
    err("manifest.reverted.medicine missing")
else:
    ok("manifest records medicine revert")

for item_id, sid in swaps.items():
    if sid not in sprites:
        err(f"swap {item_id} -> missing sprite {sid}")
        continue
    path = ITEMS / sprites[sid]["file"]
    if not path.is_file():
        err(f"missing file {path}")
        continue
    im = Image.open(path)
    if im.mode != "RGBA":
        err(f"{path.name} mode is {im.mode}, expected RGBA")
        continue
    arr = np.array(im)
    opaque = int((arr[:, :, 3] > 0).sum())
    if opaque < 20:
        err(f"{path.name} has only {opaque} opaque pixels")
        continue
    if arr.shape[0] < 6 or arr.shape[1] < 6:
        err(f"{path.name} too small: {im.size}")
        continue
    ok(f"{item_id} -> {path.name} {im.size} opaque={opaque}")

# Live medicine icon must not exist (reverted)
if (ITEMS / "icons/medicine.png").is_file():
    err("icons/medicine.png still present; should be unverified only")
else:
    ok("icons/medicine.png removed from live icons")

# meat should have yellow/orange pixels (Championship meat, not green fringe)
meat = Image.open(ITEMS / "icons/meat.png")
m = np.array(meat)
mask = m[:, :, 3] > 0
if mask.any():
    rgb = m[:, :, :3][mask].astype(int)
    orangeish = ((rgb[:, 0] > 140) & (rgb[:, 1] > 80) & (rgb[:, 2] < rgb[:, 0] - 20)).mean()
    greenish = ((rgb[:, 1] > rgb[:, 0] + 8) & (rgb[:, 1] > 80)).mean()
    if orangeish < 0.4:
        err(f"meat.png does not look orange/yellow enough ({orangeish:.2f})")
    else:
        ok(f"meat orange/yellow fraction {orangeish:.2f}")
    if greenish > 0.08:
        err(f"meat.png still has substantial green glow fringe ({greenish:.2f})")
    else:
        ok(f"meat green-fringe fraction {greenish:.2f}")
    if meat.size != (12, 12):
        err(f"expected meat 12x12, got {meat.size}")
    else:
        ok("meat is 12x12 (integer 3x to 36)")

prot = Image.open(ITEMS / "icons/protein_pill.png")
if prot.size != (12, 9):
    err(f"expected protein_pill 12x9, got {prot.size}")
else:
    ok("protein_pill is 12x9")
pa = np.array(prot)
pmask = pa[:, :, 3] > 0
if pmask.any():
    prgb = pa[:, :, :3][pmask].astype(int)
    # capsule is grey/white, not a gold frame leftover
    gold = ((prgb[:, 0] > 170) & (prgb[:, 1] > 120) & (prgb[:, 2] < 110)).mean()
    if gold > 0.15:
        err(f"protein_pill still has substantial gold-frame pixels ({gold:.2f})")
    else:
        ok(f"protein_pill gold-frame fraction {gold:.2f}")

# unmatched list
for uid in ("medicine", "fish", "berry", "fishPack", "berryPack", "dataChip", "digimental", "crest"):
    if uid not in manifest["unmatched_existing_ids"]:
        err(f"{uid} should remain unmatched")
ok("unmatched list includes medicine, fish/berry and evo keys")

# raw sources
for rel in (
    "raw/wikimon/Digimon_Feeding.png",
    "raw/giantbomb/430551-digimon_world_championship_gp3.jpg",
    "raw/giantbomb/586753-gfs_97204_2_11.jpg",
    "raw/pocketgamer/digimon_world_championship_010.jpg",
):
    if not (ITEMS / rel).is_file():
        err(f"missing raw {rel}")
    else:
        ok(f"raw {rel}")

for rel in (
    "unverified/gp3_meat_rejected.png",
    "unverified/gp3_protein_pill_rejected.png",
    "unverified/medicine_portrait_jp_unverified.png",
    "unverified/README.md",
):
    if not (ITEMS / rel).is_file():
        err(f"missing {rel}")
    else:
        ok(f"archived {rel}")

index = (ROOT / "index.html").read_text()
if "js/item-art.js" not in index:
    err("index.html does not include js/item-art.js")
else:
    ok("index.html includes item-art.js")
# script order: sprites.js, then game.js, then item-art.js
s = index.find("js/sprites.js")
g = index.find("js/game.js")
a = index.find("js/item-art.js")
if not (0 <= s < g < a):
    err(f"script order wrong: sprites={s} game={g} item-art={a}")
else:
    ok("index.html script order: sprites.js, game.js, item-art.js")

art = (ROOT / "js/item-art.js").read_text()
if "getIcon" not in art or "drawPickup" not in art or "drawMeat" not in art:
    err("item-art.js does not wrap getIcon/drawPickup/drawMeat")
else:
    ok("item-art.js wraps getIcon, drawPickup, and drawMeat")

shop = (ROOT / "js/shop.js").read_text()
for needle in ('id: "meatPack"', 'id: "medicine"', 'id: "vitamin"', "base: 12", "base: 18", "base: 16"):
    if needle not in shop:
        err(f"shop.js may have lost {needle}")
ok("shop catalog strings still present")

for name in (
    "contact-sheet.png", "before-after.png", "SOURCES.md", "manifest.json",
    "proof/wikimon_feeding_context_annotated.png",
    "proof/wikimon_meat_crop_proof.png",
    "proof/wikimon_protein_crop_proof.png",
    "proof/rejected_and_unverified_context.png",
    "proof/hook_tocanvas_simulation.png",
):
    if not (ITEMS / name).is_file():
        err(f"missing deliverable {name}")
    else:
        ok(f"deliverable {name}")

# extract script must be guarded so it cannot clobber verified icons
extract = (ROOT / "scripts" / "extract-championship-items.py").read_text()
if "force-old-jpeg-extract" not in extract or "finalize-verified-item-art.py" not in extract:
    err("old extract-championship-items.py is not guarded against accidental overwrite")
else:
    ok("old JPEG extract script is guarded")

if errors:
    print(f"\n{len(errors)} failure(s)")
    sys.exit(1)
print("\nAll item-art checks passed.")
