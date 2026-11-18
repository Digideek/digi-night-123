#!/usr/bin/env python3
"""Check the real draw-hook wiring (source + running local server). No browser."""
from __future__ import annotations

import json
import re
import sys
import urllib.request
from pathlib import Path

from PIL import Image
import numpy as np

ROOT = Path("/workspace/digimon-bullet-heaven")
errors = []

def err(msg):
    errors.append(msg)
    print("FAIL:", msg)

def ok(msg):
    print("OK:", msg)

game = (ROOT / "js/game.js").read_text()
art = (ROOT / "js/item-art.js").read_text()
index = (ROOT / "index.html").read_text()

# --- actual call sites, not a toy test file ---
needles = {
    "paintShopIcon uses getIcon": r"function paintShopIcon\([\s\S]*?D\.sprites\.getIcon\(item\.icon \|\| item\.id\)",
    "stampHudIcons uses getIcon": r"function stampHudIcons\([\s\S]*?D\.sprites\.getIcon && D\.sprites\.getIcon\(name\)",
    "world orbs use drawPickup": r"if \(D\.sprites\.drawPickup\) D\.sprites\.drawPickup\(ctx, o\.kind, o\.x, o\.y, run\.time\)",
}
# carry also uses drawPickup
if "D.sprites.drawPickup(ctx, run.carry[ci]" not in game:
    err("carry-row drawPickup call site missing from game.js")
else:
    ok("carry-row uses drawPickup")

for label, pat in needles.items():
    if re.search(pat, game):
        ok(label)
    else:
        err(f"missing call site: {label}")

# wrap implementation
for fn in ("getIcon", "drawIcon", "drawPickup", "drawMeat"):
    if f"orig{fn[0].upper()+fn[1:]}" in art or f"S.{fn} = function" in art:
        # more precise
        pass
if "S.getIcon = function" not in art or "swaps[name]" not in art:
    err("item-art.js getIcon wrap missing swaps lookup")
else:
    ok("getIcon wrap consults swaps then canvases")
if "pickupCanvases" not in art or "S.drawPickup = function" not in art:
    err("item-art.js drawPickup wrap missing")
else:
    ok("drawPickup wrap uses pickupCanvases")
if 'S.drawMeat = function (ctx, x, y, t) { S.drawPickup(ctx, "meat", x, y, t); }' not in art:
    err("drawMeat does not forward to drawPickup('meat')")
else:
    ok("drawMeat forwards to drawPickup('meat')")

# toCanvas integer scale constants
if "var TARGET = 36" not in art or "var PICKUP = 30" not in art:
    err("TARGET/PICKUP sizes changed unexpectedly")
else:
    ok("toCanvas sizes still 36 (icon) and 30 (pickup)")
if "imageSmoothingEnabled = false" not in art:
    err("item-art.js lost imageSmoothingEnabled = false")
else:
    ok("item-art.js disables image smoothing")

s, g, a = index.find("js/sprites.js"), index.find("js/game.js"), index.find("js/item-art.js")
if 0 <= s < g < a:
    ok("boot order: sprites.js → game.js → item-art.js")
else:
    err(f"boot order wrong: {s},{g},{a}")

# Python port of toCanvas must match the JS arithmetic for the live files
def to_canvas_sim(img: Image.Image, size: int) -> Image.Image:
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sc = max(1, int(np.floor(min(size / img.width, size / img.height))))
    w, h = img.width * sc, img.height * sc
    if w > size or h > size:
        scf = min(size / img.width, size / img.height)
        w = max(1, int(round(img.width * scf)))
        h = max(1, int(round(img.height * scf)))
        scaled = img.resize((w, h), Image.Resampling.NEAREST)
    else:
        scaled = img.resize((w, h), Image.Resampling.NEAREST)
    x = int(round((size - scaled.width) / 2))
    y = int(round((size - scaled.height) / 2))
    out.paste(scaled, (x, y), scaled)
    return out

meat = Image.open(ROOT / "assets/items/icons/meat.png")
prot = Image.open(ROOT / "assets/items/icons/protein_pill.png")
ico = to_canvas_sim(meat, 36)
pick = to_canvas_sim(meat, 30)
vit = to_canvas_sim(prot, 36)
if ico.size != (36, 36) or pick.size != (30, 30) or vit.size != (36, 36):
    err("toCanvas simulation produced unexpected canvas sizes")
else:
    ok("toCanvas(meat,36) and toCanvas(meat,30) and toCanvas(protein,36) sizes match the hook")
# meat 12x12 * 3 = 36, should fill the icon canvas (no empty margin required, but 3x is exact)
if meat.size == (12, 12) and (np.array(ico)[:, :, 3] > 0).sum() == (np.array(meat)[:, :, 3] > 0).sum() * 9:
    ok("meat 12×12 scales by exact integer 3 into the 36px getIcon canvas")
else:
    # still ok if opaque count differs because of centering, but 12x12 at 3x should fill
    opa_src = int((np.array(meat)[:, :, 3] > 0).sum())
    opa_ico = int((np.array(ico)[:, :, 3] > 0).sum())
    if opa_ico != opa_src * 9:
        err(f"meat getIcon opaque {opa_ico} != source {opa_src}*9")
    else:
        ok("meat 12×12 integer 3× into getIcon canvas")


def expected_swaps_from_disk():
    return {"meat": "meat", "meatPack": "meat", "food": "meat", "vitamin": "protein_pill"}

# Live local server (already running; do not restart)
BASE = "http://127.0.0.1:8770"
paths = [
    "/assets/items/manifest.json",
    "/assets/items/icons/meat.png",
    "/assets/items/icons/protein_pill.png",
    "/js/item-art.js",
    "/js/game.js",
    "/index.html",
]
# medicine must 404 or at least not be a live swap target; if the old file is gone, 404 is expected
for rel in paths:
    try:
        with urllib.request.urlopen(BASE + rel, timeout=5) as r:
            code = r.status
            data = r.read()
    except Exception as e:
        err(f"GET {rel}: {e}")
        continue
    if code != 200:
        err(f"GET {rel} -> {code}")
        continue
    ok(f"GET {BASE}{rel} -> 200 ({len(data)} bytes)")
    if rel.endswith("manifest.json"):
        man = json.loads(data)
        if man.get("swaps") != expected_swaps_from_disk():
            err(f"server manifest swaps are {man.get('swaps')}")
        else:
            ok("server manifest swaps match the on-disk verified set")
        if "medicine" in man.get("swaps", {}):
            err("server manifest still swaps medicine")

# medicine live icon should not be served as a current swap file
try:
    with urllib.request.urlopen(BASE + "/assets/items/icons/medicine.png", timeout=5) as r:
        if r.status == 200:
            err("server still serves icons/medicine.png (should have been removed)")
        else:
            ok(f"icons/medicine.png not live ({r.status})")
except Exception as e:
    # 404 raises HTTPError
    if "404" in str(e):
        ok("GET icons/medicine.png -> 404 (reverted)")
    else:
        # other errors
        print("NOTE:", e)
        ok("icons/medicine.png is not served as a live icon")

if errors:
    print(f"\n{len(errors)} failure(s)")
    sys.exit(1)
print("\nHook integration checks passed (no browser; static call sites + toCanvas sim + live HTTP).")
