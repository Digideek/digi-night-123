#!/usr/bin/env python3
"""DEPRECATED writer for the first JPEG pass.

Do not run this file to refresh gameplay icons. It would overwrite verified
Wikimon meat/protein crops with the rejected Giant Bomb JPEG extracts.
Use scripts/finalize-verified-item-art.py instead.
"""
from __future__ import annotations

import sys
if __name__ == "__main__" and "force-old-jpeg-extract" not in sys.argv:
    sys.stderr.write(
        "Refusing to run: this script writes the rejected JPEG meat/protein/"
        "medicine extracts. Use scripts/finalize-verified-item-art.py\n"
    )
    sys.exit(2)


import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/workspace/digimon-bullet-heaven")
OUT = ROOT / "assets" / "items"
ICONS = OUT / "icons"
RAW = OUT / "raw"
RESEARCH = Path("/tmp/dwc-research")

GP3 = RESEARCH / "gb" / "430551-digimon_world_championship_gp3.jpg"
MED = RESEARCH / "gb" / "586753-gfs_97204_2_11.jpg"
PG010 = RESEARCH / "press" / "pg_010.jpg"
FEED = RESEARCH / "Digimon_Feeding.png"

# Giant Bomb / Pocket Gamer / Wikimon originals copied beside the crops
RAW_COPY = {
    "giantbomb/430551-digimon_world_championship_gp3.jpg": GP3,
    "giantbomb/586753-gfs_97204_2_11.jpg": MED,
    "pocketgamer/digimon_world_championship_010.jpg": PG010,
    "wikimon/Digimon_Feeding.png": FEED,
}

# Care toolbar on gp3 (256x385 English Training / "Protein remaining").
# Well interiors measured between yellow hex frames; meat mid estimated
# from 26px pitch (protein mid=64 => meat mid=38). y covers the well only.
CARE_Y0, CARE_Y1 = 368, 383
CARE_CROPS = [
    # id, x0, x1, label, confidence, use
    ("meat", 30, 49, "Care menu Feed icon — classic yellow-orange meat", "high", "swap"),
    ("protein_pill", 56, 74, "Care menu Protein icon — gray/white capsule pill", "high", "swap"),
    ("care_syringe_or_clean", 81, 99, "Care toolbar icon 3 — syringe-like tool; may be Clean or a medical tool, not confidently labeled", "low", "manifest"),
    ("care_tool_4", 108, 126, "Care toolbar icon 4 — unidentified gray tool", "low", "manifest"),
    ("care_pack_or_bandage", 133, 151, "Care toolbar icon 5 — gray/white pack; possible Bandage, not confirmed", "low", "manifest"),
    ("care_bottle_toolbar", 159, 177, "Care toolbar icon 6 — small bottle/dropper; possible Medicine toolbar icon, not used as the primary medicine swap", "medium", "manifest"),
]

# Confirmed medicine (クスリ) portrait in a white card on the Japanese Training screen.
# White-pixel bbox was (29,75)-(45,91); padded to include the pill edge.
MEDICINE_BOX = (27, 73, 48, 94)  # x0,y0,x1,y1 exclusive-ish; refined in extract

# Hunt toolbar on Pocket Gamer shot 010 (higher-quality native JPEG).
HUNT_Y0, HUNT_Y1 = 368, 383
HUNT_CROPS = [
    ("hunt_hand", 30, 49, "Hunt toolbar hand (Move / cursor), not an item", "high", "skip"),
    ("hunt_food", 56, 75, "Hunt Food bait icon — striped yellow bun/meatball (attracts Digimon)", "high", "manifest"),
    ("hunt_gun", 82, 101, "Hunt Gun icon — stun gun", "high", "manifest"),
    ("hunt_fence", 109, 127, "Hunt toolbar icon 4 — likely fence/spike trap", "medium", "manifest"),
    ("hunt_bomb_dark", 135, 153, "Hunt toolbar icon 5 — dark sphere, likely a bomb/trap", "medium", "manifest"),
    ("hunt_bomb_light", 161, 179, "Hunt toolbar icon 6 — light sphere, likely a bomb/trap", "medium", "manifest"),
    ("hunt_boot_or_tool", 188, 206, "Hunt toolbar icon 7 — boot or tool, not confidently labeled", "low", "manifest"),
]


def load(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def crop_xy(im: Image.Image, x0, y0, x1, y1) -> Image.Image:
    return im.crop((int(x0), int(y0), int(x1), int(y1)))


def flood_key(im: Image.Image, is_bg, *start_points) -> Image.Image:
    """Flood from starts (or all edges) through pixels where is_bg(r,g,b) is true."""
    arr = np.array(im)
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3].astype(int)
    bg = np.zeros((h, w), dtype=bool)
    for y in range(h):
        for x in range(w):
            r, g, b = rgb[y, x]
            bg[y, x] = is_bg(r, g, b)
    seen = np.zeros((h, w), dtype=bool)
    from collections import deque
    q = deque()
    if start_points:
        for x, y in start_points:
            if 0 <= x < w and 0 <= y < h:
                q.append((y, x))
                seen[y, x] = True
    else:
        for x in range(w):
            q.append((0, x)); seen[0, x] = True
            q.append((h - 1, x)); seen[h - 1, x] = True
        for y in range(h):
            q.append((y, 0)); seen[y, 0] = True
            q.append((y, w - 1)); seen[y, w - 1] = True
    kill = np.zeros((h, w), dtype=bool)
    while q:
        y, x = q.popleft()
        if not bg[y, x]:
            continue
        kill[y, x] = True
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx]:
                seen[ny, nx] = True
                if bg[ny, nx]:
                    q.append((ny, nx))
    arr[kill, 3] = 0
    return Image.fromarray(arr)


def trim_alpha(im: Image.Image, pad: int = 1) -> Image.Image:
    arr = np.array(im)
    a = arr[:, :, 3]
    ys, xs = np.where(a > 0)
    if len(xs) == 0:
        return im
    x0, x1 = max(0, xs.min() - pad), min(im.width, xs.max() + 1 + pad)
    y0, y1 = max(0, ys.min() - pad), min(im.height, ys.max() + 1 + pad)
    return im.crop((x0, y0, x1, y1))



def keep_main_components(im: Image.Image, min_pixels: int = 8) -> Image.Image:
    """Drop stray gold-frame crumbs; keep the largest blob and any reasonably large neighbors."""
    import numpy as np
    from collections import deque
    arr = np.array(im)
    h, w = arr.shape[:2]
    opa = arr[:, :, 3] > 0
    seen = np.zeros((h, w), dtype=bool)
    blobs = []
    for y in range(h):
        for x in range(w):
            if not opa[y, x] or seen[y, x]:
                continue
            q = deque([(y, x)])
            seen[y, x] = True
            pts = [(y, x)]
            while q:
                cy, cx = q.popleft()
                for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and opa[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
                        pts.append((ny, nx))
            blobs.append(pts)
    if not blobs:
        return im
    blobs.sort(key=len, reverse=True)
    keep = set()
    largest = len(blobs[0])
    for pts in blobs:
        if len(pts) >= min_pixels or len(pts) >= largest * 0.25:
            keep.update(pts)
    for y in range(h):
        for x in range(w):
            if opa[y, x] and (y, x) not in keep:
                arr[y, x, 3] = 0
    return Image.fromarray(arr)


def pad_square(im: Image.Image, size: int | None = None) -> Image.Image:
    w, h = im.size
    side = size or max(w, h)
    out = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    out.paste(im, ((side - w) // 2, (side - h) // 2), im)
    return out


def is_gold_frame(r, g, b):
    return r > 170 and g > 120 and b < 110 and r > b + 60 and g > b + 30


def is_unselected_well_bg(r, g, b):
    """Dark hexagonal well + gold frame. Leaves mid/light gray icon pixels."""
    lum = (r + g + b) / 3.0
    if lum < 100:
        return True
    if is_gold_frame(r, g, b):
        return True
    return False


def is_selected_well_bg(r, g, b):
    """Green selection glow, dark well, water — but NOT yellow/orange item pixels."""
    lum = (r + g + b) / 3.0
    if lum < 55:
        return True
    # green glow: G leads R
    if g > r + 8 and g > 80:
        return True
    # pale green wash
    if g >= r and (g - r) >= 5 and g > 120 and b < g and b > 40:
        return True
    if b > r + 20 and b > 80 and b >= g:
        return True
    return False


def is_toolbar_bg(r, g, b, selected=False):
    if selected:
        return is_selected_well_bg(r, g, b)
    return is_unselected_well_bg(r, g, b)


def is_white_card_bg(r, g, b):
    lum = (r + g + b) / 3
    # white / pale card
    if lum > 200 and abs(r - g) < 30 and abs(g - b) < 30:
        return True
    # light gray card / JPEG fringe
    if lum > 170 and abs(r - g) < 25 and abs(g - b) < 25:
        return True
    # water blue around the card
    if b > r + 15 and b > 80 and b >= g:
        return True
    # dark chrome of the rounded card if it's at the edge (handled by flood)
    if lum < 40:
        return True
    return False


def extract_toolbar(im: Image.Image, x0, y0, x1, y1, selected=False) -> Image.Image:
    c = crop_xy(im, x0, y0, x1, y1)
    keyed = flood_key(c, lambda r, g, b: is_toolbar_bg(r, g, b, selected=selected))
    # Punch leftover gold-frame pixels on the 2px border only
    arr = __import__('numpy').array(keyed)
    h, w = arr.shape[:2]
    for y in range(h):
        for x in range(w):
            if x < 2 or y < 2 or x >= w - 2 or y >= h - 2:
                r, g, b, a = arr[y, x]
                if a and is_gold_frame(int(r), int(g), int(b)):
                    arr[y, x, 3] = 0
    return trim_alpha(keep_main_components(Image.fromarray(arr)), pad=1)


def extract_medicine(im: Image.Image) -> Image.Image:
    c = crop_xy(im, *MEDICINE_BOX)
    keyed = flood_key(c, is_white_card_bg)
    return trim_alpha(keep_main_components(keyed, min_pixels=6), pad=1)


def nn_scale(im: Image.Image, mul: int) -> Image.Image:
    return im.resize((im.width * mul, im.height * mul), Image.Resampling.NEAREST)


def main():
    ICONS.mkdir(parents=True, exist_ok=True)
    RAW.mkdir(parents=True, exist_ok=True)

    # Archive raw screenshots + URL sidecars later via SOURCES.md
    for rel, src in RAW_COPY.items():
        dest = RAW / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        if src.exists():
            shutil.copy2(src, dest)
            print("raw", dest, dest.stat().st_size)

    entries = []
    gp3 = load(GP3)
    for sid, x0, x1, label, conf, use in CARE_CROPS:
        icon = extract_toolbar(gp3, x0, CARE_Y0, x1, CARE_Y1, selected=(sid == "meat"))
        path = ICONS / f"{sid}.png"
        icon.save(path)
        entries.append({
            "id": sid,
            "file": f"icons/{sid}.png",
            "width": icon.width,
            "height": icon.height,
            "label": label,
            "confidence": conf,
            "use": use,
            "source_file": "raw/giantbomb/430551-digimon_world_championship_gp3.jpg",
            "source_url": "https://www.giantbomb.com/a/uploads/original/1/11300/430551-digimon_world_championship_gp3.jpg",
            "source_page": "https://wiki-origin.giantbomb.com/wiki/Games/Digimon_World_Championship/Images",
            "crop": [x0, CARE_Y0, x1, CARE_Y1],
            "screen": "English Training (Protein remaining log) care toolbar",
        })
        print("care", sid, icon.size, "opaque", int(np.array(icon)[:,:,3].astype(bool).sum()))

    med_im = load(MED)
    medicine = extract_medicine(med_im)
    medicine.save(ICONS / "medicine.png")
    entries.append({
        "id": "medicine",
        "file": "icons/medicine.png",
        "width": medicine.width,
        "height": medicine.height,
        "label": "Medicine (クスリ) item portrait — round brown pill/bottle shown while curing illness",
        "confidence": "high",
        "use": "swap",
        "source_file": "raw/giantbomb/586753-gfs_97204_2_11.jpg",
        "source_url": "https://www.giantbomb.com/a/uploads/original/0/3715/586753-gfs_97204_2_11.jpg",
        "source_page": "https://wiki-origin.giantbomb.com/wiki/Games/Digimon_World_Championship/Images",
        "crop": list(MEDICINE_BOX),
        "screen": "Japanese Training screen, クスリのこり / illness cured",
    })
    print("medicine", medicine.size, "opaque", int(np.array(medicine)[:,:,3].astype(bool).sum()))

    pg = load(PG010)
    for sid, x0, x1, label, conf, use in HUNT_CROPS:
        if use == "skip":
            continue
        icon = extract_toolbar(pg, x0, HUNT_Y0, x1, HUNT_Y1, selected=(sid == "hunt_food"))
        path = ICONS / f"{sid}.png"
        icon.save(path)
        entries.append({
            "id": sid,
            "file": f"icons/{sid}.png",
            "width": icon.width,
            "height": icon.height,
            "label": label,
            "confidence": conf,
            "use": use,
            "source_file": "raw/pocketgamer/digimon_world_championship_010.jpg",
            "source_url": "https://media.pocketgamer.com/artwork/na-xcl/digimon_world_championship_010.jpg",
            "source_page": "https://www.pocketgamer.com/digimon-world-championship/e3-2008-digimon-world-championship-digivoles-on-your-digi-ds/",
            "crop": [x0, HUNT_Y0, x1, HUNT_Y1],
            "screen": "English Hunt toolbar (native 256x385 JPEG)",
        })
        print("hunt", sid, icon.size, "opaque", int(np.array(icon)[:,:,3].astype(bool).sum()))

    # Gameplay swaps: existing item ids only. Mechanics unchanged.
    swaps = {
        "meat": "meat",
        "meatPack": "meat",
        "food": "meat",
        "vitamin": "protein_pill",
        "medicine": "medicine",
    }
    manifest = {
        "game": "Digimon World Championship (Nintendo DS, 2008); JP title Digimon Championship. There is no Pokémon Championship DS.",
        "note": "Icons cropped from public official screenshots (JPEG). No sprite sheet for these items was found on The Spriters Resource or Sprite Database. Transparency keyed; pixels not redrawn. Nearest-neighbor in-game.",
        "sprites": entries,
        "swaps": swaps,
        "unmatched_existing_ids": [
            "fish", "berry", "fishPack", "berryPack", "joyToy", "eraser",
            "atkBoost", "dataChip", "digimental", "crest", "heal", "toy", "bits", "xp", "hp"
        ],
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print("manifest written", len(entries), "sprites")

    # 8x previews for QA
    qa = OUT / "qa"
    qa.mkdir(exist_ok=True)
    for e in entries:
        im = Image.open(OUT / e["file"])
        nn_scale(im, 8).save(qa / f"{e['id']}_x8.png")


if __name__ == "__main__":
    main()
