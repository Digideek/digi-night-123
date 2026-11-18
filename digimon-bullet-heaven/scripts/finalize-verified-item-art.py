#!/usr/bin/env python3
"""Verification pass for Championship item art.

Re-extracts only visually verified Feed meat and Protein capsule from the
Wikimon Feeding screenshot (left 512×768, ~2× native). Reverts medicine and
the earlier Giant Bomb JPEG meat/pill swaps. Does not redraw pixels, change
mechanics, or touch the game server.
"""
from __future__ import annotations

import json
import re
import shutil
import textwrap
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/workspace/digimon-bullet-heaven")
OUT = ROOT / "assets" / "items"
ICONS = OUT / "icons"
UNVER = OUT / "unverified"
PROOF = OUT / "proof"
TRIALS = PROOF / "trials"
QA = OUT / "qa"
RAW = OUT / "raw"
SPRITES_JS = ROOT / "js" / "sprites.js"

FEED_RAW = RAW / "wikimon" / "Digimon_Feeding.png"
GP3 = RAW / "giantbomb" / "430551-digimon_world_championship_gp3.jpg"
MED = RAW / "giantbomb" / "586753-gfs_97204_2_11.jpg"
PG010 = RAW / "pocketgamer" / "digimon_world_championship_010.jpg"

# Working space: left 512 columns of the 514×768 Wikimon PNG (right 2 cols nearly black).
# Coordinates below are in that 512×768 image (= exact 2× of a 256×384 native frame).
MEAT_BOX_2X = (118, 728, 142, 752)  # even-aligned, inside the selected Feed well
PROT_BOX_2X = (164, 738, 188, 756)

WIKIMON_URL = "https://wikimon.net/images/e/e4/Digimon_Feeding.png"
WIKIMON_PAGE = "https://wikimon.net/File:Digimon_Feeding.png"
GB_PAGE = "https://wiki-origin.giantbomb.com/wiki/Games/Digimon_World_Championship/Images"

FONT = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
FONTB = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")


def font(size, bold=False):
    p = FONTB if bold and FONTB.exists() else FONT
    return ImageFont.truetype(str(p), size)


def load_rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def feed512() -> Image.Image:
    im = load_rgba(FEED_RAW)
    return im.crop((0, 0, 512, min(768, im.height)))


def flood_key(im: Image.Image, is_bg) -> Image.Image:
    a = np.array(im)
    h, w = a.shape[:2]
    rgb = a[:, :, :3].astype(int)
    bg = np.zeros((h, w), dtype=bool)
    for y in range(h):
        for x in range(w):
            bg[y, x] = is_bg(*rgb[y, x])
    seen = np.zeros((h, w), dtype=bool)
    q = deque()
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
    a[kill, 3] = 0
    return Image.fromarray(a)


def drop_green(im: Image.Image) -> Image.Image:
    a = np.array(im)
    rgb = a[:, :, :3].astype(int)
    gdom = (a[:, :, 3] > 0) & (rgb[:, :, 1] > rgb[:, :, 0] + 8) & (rgb[:, :, 1] > 80)
    lime = (a[:, :, 3] > 0) & (rgb[:, :, 1] > rgb[:, :, 0] + 4) & (rgb[:, :, 1] > rgb[:, :, 2] + 20) & (rgb[:, :, 1] > 120)
    a[gdom | lime, 3] = 0
    return Image.fromarray(a)


def keep_main(im: Image.Image, min_pixels=8, frac=0.25) -> Image.Image:
    a = np.array(im)
    h, w = a.shape[:2]
    opa = a[:, :, 3] > 0
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
        if len(pts) >= min_pixels or len(pts) >= largest * frac:
            keep.update(pts)
    for y in range(h):
        for x in range(w):
            if opa[y, x] and (y, x) not in keep:
                a[y, x, 3] = 0
    return Image.fromarray(a)


def trim(im: Image.Image, pad=0) -> Image.Image:
    a = np.array(im)
    ys, xs = np.where(a[:, :, 3] > 0)
    if len(xs) == 0:
        return im
    return im.crop((
        max(0, int(xs.min()) - pad),
        max(0, int(ys.min()) - pad),
        min(im.width, int(xs.max()) + 1 + pad),
        min(im.height, int(ys.max()) + 1 + pad),
    ))


def box2(im: Image.Image) -> Image.Image:
    w, h = im.size
    if w % 2 or h % 2:
        canvas = Image.new("RGBA", (w + w % 2, h + h % 2), (0, 0, 0, 0))
        canvas.paste(im, (0, 0))
        im = canvas
        w, h = im.size
    return im.resize((w // 2, h // 2), Image.Resampling.BOX)


def is_meat_bg(r, g, b) -> bool:
    r, g, b = int(r), int(g), int(b)
    lum = (r + g + b) / 3
    if lum < 48:
        return True
    if g > r + 8 and g > 80:
        return True
    if g >= r and (g - r) >= 4 and g > 140 and b < g and b > 40:
        return True
    if b > r + 20 and b > 80 and b >= g:
        return True
    return False


def is_prot_bg(r, g, b) -> bool:
    r, g, b = int(r), int(g), int(b)
    lum = (r + g + b) / 3.0
    if r > 170 and g > 120 and b < 110 and r > b + 60 and g > b + 30:
        return True
    if lum < 75:
        return True
    if b > r + 15 and b > 80:
        return True
    return False


def opaque_count(im: Image.Image) -> int:
    a = np.array(im)
    return int((a[:, :, 3] > 0).sum()) if a.ndim == 3 and a.shape[2] == 4 else 0


def nn(im: Image.Image, mul: int) -> Image.Image:
    return im.resize((im.width * mul, im.height * mul), Image.Resampling.NEAREST)


def checker(size, cell=8, c1=(36, 36, 42, 255), c2=(48, 48, 56, 255)):
    im = Image.new("RGBA", size, c1)
    d = ImageDraw.Draw(im)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if ((x // cell) + (y // cell)) % 2 == 0:
                d.rectangle([x, y, x + cell - 1, y + cell - 1], fill=c2)
    return im


def paste_checked(sprite: Image.Image, scale: int, pad=8) -> Image.Image:
    z = nn(sprite, scale)
    bg = checker((z.width + pad * 2, z.height + pad * 2))
    bg.paste(z, (pad, pad), z)
    return bg


def parse_sprite_colors():
    text = SPRITES_JS.read_text()
    block = re.search(r"var C = \{([\s\S]*?)\n  \};", text)
    colors = {}
    if not block:
        return colors
    for m in re.finditer(r"([A-Za-z])\s*:\s*\"#([0-9a-fA-F]{6})\"", block.group(1)):
        hx = m.group(2)
        colors[m.group(1)] = tuple(int(hx[i:i + 2], 16) for i in (0, 2, 4)) + (255,)
    return colors


def parse_ico_rows(name: str):
    text = SPRITES_JS.read_text()
    m = re.search(rf"    {name}: \[\n([\s\S]*?)\n    \]", text)
    if not m:
        return None
    return re.findall(r"\"([^\"]*)\"", m.group(1))


def parse_meat_rows():
    text = SPRITES_JS.read_text()
    m = re.search(r"  var MEAT = \[\n([\s\S]*?)\n  \];", text)
    if not m:
        return None
    return re.findall(r"\"([^\"]*)\"", m.group(1))


def bake(rows, colors, scale=3) -> Image.Image:
    h, w = len(rows), len(rows[0])
    im = Image.new("RGBA", (w * scale, h * scale), (0, 0, 0, 0))
    px = im.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in (".", " "):
                continue
            col = colors.get(ch)
            if not col:
                continue
            for dy in range(scale):
                for dx in range(scale):
                    px[x * scale + dx, y * scale + dy] = col
    return im


def to_canvas_sim(img: Image.Image, size: int) -> Image.Image:
    """Mirror js/item-art.js toCanvas: integer nearest-neighbor scale, centered."""
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sc = max(1, int(np.floor(min(size / img.width, size / img.height))))
    w, h = img.width * sc, img.height * sc
    if w > size or h > size:
        scf = min(size / img.width, size / img.height)
        w = max(1, int(round(img.width * scf)))
        h = max(1, int(round(img.height * scf)))
        scaled = img.resize((w, h), Image.Resampling.NEAREST)
    else:
        scaled = nn(img, sc)
    x = int(round((size - scaled.width) / 2))
    y = int(round((size - scaled.height) / 2))
    out.paste(scaled, (x, y), scaled)
    return out


def extract_meat(src512: Image.Image):
    raw = src512.crop(MEAT_BOX_2X)
    keyed = keep_main(drop_green(flood_key(raw, is_meat_bg)))
    native = trim(box2(keyed))
    keyed_trim = trim(keyed)
    return raw, keyed_trim, native


def extract_protein(src512: Image.Image):
    raw = src512.crop(PROT_BOX_2X)
    keyed = keep_main(flood_key(raw, is_prot_bg))
    native = trim(box2(keyed))
    keyed_trim = trim(keyed)
    return raw, keyed_trim, native


def archive_rejected():
    UNVER.mkdir(parents=True, exist_ok=True)
    mapping = {
        "meat.png": "gp3_meat_rejected.png",
        "protein_pill.png": "gp3_protein_pill_rejected.png",
        "medicine.png": "medicine_portrait_jp_unverified.png",
    }
    note = []
    for src_name, dest_name in mapping.items():
        src = ICONS / src_name
        dest = UNVER / dest_name
        if src.is_file() and not dest.is_file():
            shutil.copy2(src, dest)
            note.append(f"archived {src_name} -> unverified/{dest_name}")
        elif dest.is_file():
            note.append(f"kept existing unverified/{dest_name} (not overwritten)")
    (UNVER / "README.md").write_text(
        "Unverified or rejected Championship item crops. These must NOT replace in-game art.\n\n"
        "- `gp3_meat_rejected.png` — earlier Giant Bomb JPEG toolbar crop. The well was the Feed slot, "
        "but keying left a yellow flame/claw with stray pixels. Not used.\n"
        "- `gp3_protein_pill_rejected.png` — earlier crop of the Protein well; keyed into a grey wedge. Not used.\n"
        "- `medicine_portrait_jp_unverified.png` — brown sphere on a white card from the Japanese クスリ "
        "(medicine remaining / illness cured) screen. Screen text is medicine, but the art looks like a "
        "brown drumstick/meat and is visually similar to the Feeding-screen food portrait. Identity not "
        "visually verified. Reverted; Restore Disk keeps procedural art.\n"
    )
    return note


def draw_label(draw, xy, text, fill=(255, 255, 255), bg=(16, 16, 20, 220), size=14, bold=False):
    f = font(size, bold=bold)
    x, y = xy
    bbox = draw.textbbox((x, y), text, font=f)
    pad = 3
    draw.rectangle([bbox[0] - pad, bbox[1] - pad, bbox[2] + pad, bbox[3] + pad], fill=bg)
    draw.text((x, y), text, font=f, fill=fill)


def build_context_proof(src512: Image.Image, meat_native, prot_native):
    native = src512.resize((256, 384), Image.Resampling.BOX).convert("RGBA")
    # 3x for annotation
    sheet = nn(native, 3)
    d = ImageDraw.Draw(sheet)
    # Boxes in native * 3
    # meat 2x (118,728,142,752) -> native (59,364,71,376)
    meat_n = (59, 364, 71, 376)
    prot_n = (82, 369, 94, 378)
    def box(b, color, width=2):
        x0, y0, x1, y1 = [c * 3 for c in b]
        d.rectangle([x0 - 2, y0 - 2, x1 + 1, y1 + 1], outline=color, width=width)
    box(meat_n, (255, 50, 50))
    box(prot_n, (80, 200, 255))
    # Food remaining log on upper screen (native y ~ 150-190, x ~ 10-160) — measure-ish
    # From earlier upper 3x view: text is in the lower third of the upper 192px screen.
    # Upper screen native 0-192. Log text around y=155-190, x=8-150.
    d.rectangle([8 * 3, 155 * 3, 155 * 3, 190 * 3], outline=(80, 255, 120), width=3)
    # leftover trays near y=128-154, x=8-90
    d.rectangle([10 * 3, 126 * 3, 90 * 3, 154 * 3], outline=(255, 200, 60), width=2)
    # field food portrait white card — approximate from earlier look
    # lower screen starts y=192. Card was around left track. From 2x y 414+...
    # We'll label toolbar wells 1-8
    draw_label(d, (20, 20), "Wikimon File:Digimon_Feeding.png  —  left 512x768 BOX-downsampled to native 256x384, shown 3x", size=13, bold=True)
    draw_label(d, (20, 48), "English Training / Feeding  |  log: '41 / 40 / 39 Food remaining.'", size=13, fill=(180, 255, 180))
    draw_label(d, (8 * 3, 155 * 3 - 22), "CONTEXT LABEL: Food remaining (Feed was used)", size=12, fill=(180, 255, 180), bg=(0, 40, 0, 230))
    draw_label(d, (10 * 3, 126 * 3 - 22), "Leftover trays — generic scraps, NOT unique item art", size=11, fill=(255, 230, 140), bg=(40, 30, 0, 230))
    draw_label(d, (meat_n[0] * 3 - 10, meat_n[1] * 3 - 40), "2 FEED / MEAT  USED", size=12, fill=(255, 80, 80), bg=(40, 0, 0, 230), bold=True)
    draw_label(d, (meat_n[0] * 3 - 10, meat_n[1] * 3 - 22), "2x crop (118,728)-(142,752)", size=11, fill=(255, 180, 180), bg=(40, 0, 0, 230))
    draw_label(d, (prot_n[0] * 3 - 4, prot_n[1] * 3 - 40), "3 PROTEIN  USED", size=12, fill=(120, 220, 255), bg=(0, 20, 40, 230), bold=True)
    draw_label(d, (prot_n[0] * 3 - 4, prot_n[1] * 3 - 22), "2x crop (164,738)-(188,756)", size=11, fill=(180, 230, 255), bg=(0, 20, 40, 230))
    # toolbar well numbers roughly
    labels = [
        (32, 358, "1 Move"),
        (59, 350, ""),
        (82, 350, ""),
        (106, 358, "4 tool (unused)"),
        (132, 358, "5 pack? (unused)"),
        (158, 358, "6 tool (unused)"),
        (184, 358, "7 menu"),
        (210, 358, "8"),
    ]
    for x, y, t in labels:
        if t:
            draw_label(d, (x * 3 - 8, y * 3), t, size=10, fill=(240, 240, 240), bg=(0, 0, 0, 200))
    path = PROOF / "wikimon_feeding_context_annotated.png"
    sheet.convert("RGB").save(path, quality=95)
    return path


def build_crop_proof(title, raw, keyed2x, native, box, src_note, path, extra=""):
    # layout: raw 8x, keyed 8x, native 12x, game 36 (toCanvas 36) on checker, captions
    raw_s = nn(raw.convert("RGBA"), 8)
    key_s = paste_checked(keyed2x, 8, 12)
    nat_s = paste_checked(native, 12, 12)
    game = to_canvas_sim(native, 36)
    game_s = paste_checked(game, 4, 8)  # 144px
    pickup = to_canvas_sim(native, 30)
    pick_s = paste_checked(pickup, 4, 8)

    pad = 24
    header = 96
    col_w = max(raw_s.width, key_s.width, nat_s.width, game_s.width, 280) + 16
    width = pad * 2 + col_w * 4 + 30
    height = header + 40 + max(raw_s.height, key_s.height, nat_s.height) + 200
    canvas = Image.new("RGB", (width, height), (18, 18, 22))
    d = ImageDraw.Draw(canvas)
    d.text((pad, 12), title, font=font(18, True), fill=(245, 245, 245))
    for i, line in enumerate(textwrap.wrap(src_note + ("  " + extra if extra else ""), 110)):
        d.text((pad, 40 + i * 16), line, font=font(12), fill=(190, 190, 200))

    cols = [
        (raw_s.convert("RGB") if raw_s.mode != "RGB" else raw_s, "Raw crop 8x (no key)"),
        (key_s.convert("RGB"), f"Keyed 2x {keyed2x.size}  opaque={opaque_count(keyed2x)}"),
        (nat_s.convert("RGB"), f"BOX 2:1 native {native.size}  12x zoom"),
        (game_s.convert("RGB"), "item-art.js toCanvas 36px, shown 4x"),
    ]
    x = pad
    y = header
    for im, cap in cols:
        canvas.paste(im, (x, y))
        d.text((x, y + im.height + 8), cap, font=font(11), fill=(210, 210, 220))
        x += col_w
    # pickup row note
    canvas.paste(pick_s.convert("RGB"), (pad + col_w * 3, y + game_s.height + 40))
    d.text((pad + col_w * 3, y + game_s.height + 40 + pick_s.height + 6),
           "drawPickup toCanvas 30px, 4x", font=font(11), fill=(210, 210, 220))
    canvas.save(path, quality=95)
    return path


def build_rejected_proof():
    # gp3 toolbar + old icons + medicine context
    gp3 = Image.open(GP3).convert("RGB")
    # gp3 is 256x385; toolbar near y 360-385
    tb = gp3.crop((0, 330, 256, min(gp3.height, 385)))
    tb3 = nn(tb, 3)
    med = Image.open(MED).convert("RGB")
    # medicine card area
    med_c = med.crop((0, 40, 160, 200))
    med3 = nn(med_c, 3)

    old_meat = Image.open(UNVER / "gp3_meat_rejected.png").convert("RGBA")
    old_prot = Image.open(UNVER / "gp3_protein_pill_rejected.png").convert("RGBA")
    old_med = Image.open(UNVER / "medicine_portrait_jp_unverified.png").convert("RGBA")

    w, h = 1100, 820
    canvas = Image.new("RGB", (w, h), (18, 18, 22))
    d = ImageDraw.Draw(canvas)
    d.text((20, 12), "REJECTED / UNVERIFIED — not used as in-game art", font=font(20, True), fill=(255, 90, 90))
    d.text((20, 42), "Well identity on the Giant Bomb screens was often right; keyed extracts were not recognizable enough to replace game art.",
           font=font(13), fill=(210, 210, 210))

    canvas.paste(tb3, (20, 80))
    d.rectangle([20 + 30 * 3, 80 + (368 - 330) * 3, 20 + 49 * 3, 80 + (383 - 330) * 3], outline=(255, 80, 80), width=2)
    d.rectangle([20 + 56 * 3, 80 + (368 - 330) * 3, 20 + 74 * 3, 80 + (383 - 330) * 3], outline=(80, 200, 255), width=2)
    draw_label(d, (20, 80 + tb3.height + 6), "gp3 English Training toolbar (256x385 JPEG). Red=old meat crop (30,368)-(49,383). Cyan=old protein crop (56,368)-(74,383).", size=12)

    y = 80 + tb3.height + 50
    for im, cap, x in (
        (paste_checked(old_meat, 8), "REJECTED meat.png — flames/claw + stray pixels", 20),
        (paste_checked(old_prot, 8), "REJECTED protein_pill.png — grey wedge", 360),
        (paste_checked(old_med, 6), "UNVERIFIED medicine portrait — looks like a drumstick", 700),
    ):
        canvas.paste(im.convert("RGB"), (x, y))
        d.text((x, y + im.height + 6), "\n".join(textwrap.wrap(cap, 36)), font=font(12), fill=(255, 180, 180))

    canvas.paste(med3, (20, y + 220))
    d.rectangle([20 + 27 * 3, y + 220 + (73 - 40) * 3, 20 + 48 * 3, y + 220 + (94 - 40) * 3], outline=(255, 80, 80), width=2)
    d.text((20, y + 220 + med3.height + 8),
           "Japanese クスリのこり screen, crop (27,73)-(48,94). Log supports 'medicine used', but the white-card art is visually a brown meat-like sphere\n"
           "(similar to the Feeding-screen food portrait). Reverted; Restore Disk stays on procedural art.",
           font=font(12), fill=(220, 200, 200))
    path = PROOF / "rejected_and_unverified_context.png"
    canvas.save(path, quality=95)
    return path


def build_contact_sheet(entries, unverified_thumbs):
    """3-column sheet. Verified swaps first, then unused/unverified."""
    cell = 160
    label_w = 260
    cols = 2
    rows = entries
    header = 110
    width = 20 + cols * (cell + label_w + 20)
    height = header + 20 + ((len(rows) + cols - 1) // cols) * (cell + 16)
    canvas = Image.new("RGB", (width, height), (16, 16, 20))
    d = ImageDraw.Draw(canvas)
    d.text((20, 12), "Digimon World Championship (Nintendo DS) item icons — verification pass", font=font(18, True), fill=(245, 245, 245))
    d.text((20, 40), "Verified swaps are cropped from Wikimon Digimon_Feeding.png (left 512x768, BOX to native). Pixels not redrawn.", font=font(13), fill=(200, 200, 210))
    d.text((20, 62), "Medicine and the earlier JPEG meat/pill extracts were reverted. Unused toolbar fragments are references only — not in-game art.", font=font(13), fill=(200, 200, 210))
    d.text((20, 84), "Nearest-neighbor in-game via js/item-art.js. No sprite sheet exists on TSR / Sprite Database.", font=font(13), fill=(180, 180, 190))

    def status_color(e):
        u = e.get("use")
        if u == "swap":
            return (80, 220, 120)
        if u == "unverified_reference":
            return (255, 160, 80)
        return (180, 180, 190)

    for i, e in enumerate(rows):
        col = i % cols
        row = i // cols
        x = 20 + col * (cell + label_w + 20)
        y = header + row * (cell + 16)
        bg = checker((cell, cell))
        path = OUT / e["file"]
        if path.is_file():
            im = Image.open(path).convert("RGBA")
            scale = max(1, min(cell - 16, (cell - 16) * 8 // max(im.width, im.height)))
            # prefer integer 8x or 12x if it fits
            for cand in (12, 8, 6, 4, 3, 2, 1):
                if im.width * cand <= cell - 16 and im.height * cand <= cell - 16:
                    scale = cand
                    break
            z = nn(im, scale)
            bg.paste(z, ((cell - z.width) // 2, (cell - z.height) // 2), z)
        canvas.paste(bg.convert("RGB"), (x, y))
        lx = x + cell + 10
        d.text((lx, y + 16), e["id"], font=font(15, True), fill=(245, 245, 245))
        d.text((lx, y + 40), f"{e.get('use')}  |  {e.get('confidence')}", font=font(13, True), fill=status_color(e))
        d.text((lx, y + 62), f"{e.get('width')}x{e.get('height')} px", font=font(12), fill=(180, 180, 190))
        for j, line in enumerate(textwrap.wrap(e.get("label", ""), 36)[:5]):
            d.text((lx, y + 84 + j * 15), line, font=font(11), fill=(200, 200, 210))
    path = OUT / "contact-sheet.png"
    canvas.save(path, quality=95)
    return path


def build_before_after(colors, meat_icon, prot_icon):
    food = bake(parse_ico_rows("food"), colors, 3)
    meat_pack = bake(parse_ico_rows("meatPack"), colors, 3)
    meat_world = bake(parse_meat_rows(), colors, 3)
    medicine = bake(parse_ico_rows("medicine"), colors, 3)

    rows = [
        ("food (HUD icon)", food, meat_icon, "SWAP — Championship Feed meat"),
        ("meatPack (shop)", meat_pack, meat_icon, "SWAP — same Feed meat"),
        ("meat (world pickup)", meat_world, meat_icon, "SWAP — drawPickup hook, 30px bake"),
        ("vitamin (Power Vitamin, had no ICO)", None, prot_icon, "SWAP — care-menu Protein capsule"),
        ("medicine (Restore Disk)", medicine, medicine, "REVERTED — keep procedural art; Championship portrait unverified"),
    ]
    col_w, row_h, header, left = 220, 200, 70, 280
    width = left + col_w * 2 + 40
    height = header + row_h * len(rows) + 20
    canvas = Image.new("RGB", (width, height), (16, 16, 20))
    d = ImageDraw.Draw(canvas)
    d.text((20, 12), "Before (procedural)     After (verified Championship crop, or revert)", font=font(16, True), fill=(245, 245, 245))
    d.text((20, 40), "item-art.js toCanvas sizes: icons 36px, world pickup 30px. imageSmoothingEnabled = false.", font=font(12), fill=(180, 180, 190))

    for i, (label, before, after, note) in enumerate(rows):
        y = header + i * row_h
        d.text((20, y + 20), label, font=font(13, True), fill=(230, 230, 230))
        for j, line in enumerate(textwrap.wrap(note, 28)):
            d.text((20, y + 48 + j * 16), line, font=font(11), fill=(160, 220, 170) if "SWAP" in note else (255, 170, 120))
        def cell(im, target, x):
            bg = checker((180, 180))
            if im is None:
                td = ImageDraw.Draw(bg)
                td.text((40, 80), "no icon", font=font(14), fill=(200, 200, 80))
            else:
                baked = to_canvas_sim(im, target) if im.width <= 20 else im
                # If already 36 or so, just center; if source icon, toCanvas
                if im.width <= 24:
                    baked = to_canvas_sim(im, 36)
                else:
                    baked = im
                # show at 3x if 36, 2x if larger
                mul = 3 if baked.width <= 48 else 2
                z = nn(baked, mul) if baked.width * mul <= 164 else baked
                if z.width > 164 or z.height > 164:
                    z = baked
                bg.paste(z, ((180 - z.width) // 2, (180 - z.height) // 2), z if z.mode == "RGBA" else None)
            canvas.paste(bg.convert("RGB"), (x, y + 8))
        cell(before, 36, left)
        cell(after, 36, left + col_w)
    path = OUT / "before-after.png"
    canvas.save(path, quality=95)
    return path


def build_hook_proof(meat_icon, prot_icon):
    """Simulate the exact toCanvas sizes used by getIcon (36) and drawPickup (30)."""
    items = [
        ("getIcon('meat'|'food'|'meatPack')  →  36×36", to_canvas_sim(meat_icon, 36)),
        ("drawPickup('meat')  →  30×30", to_canvas_sim(meat_icon, 30)),
        ("getIcon('vitamin')  →  36×36", to_canvas_sim(prot_icon, 36)),
    ]
    width, height = 980, 320
    canvas = Image.new("RGB", (width, height), (16, 16, 20))
    d = ImageDraw.Draw(canvas)
    d.text((16, 10), "Integration hook simulation (Python port of item-art.js toCanvas, same integer nearest-neighbor rules)", font=font(14, True), fill=(245, 245, 245))
    d.text((16, 32), "Call sites: game.js paintShopIcon + stampHudIcons use getIcon; world orbs / carry use drawPickup. item-art.js wraps both after game.js.", font=font(12), fill=(190, 190, 200))
    x = 16
    for cap, im in items:
        z = paste_checked(im, 4, 8)
        canvas.paste(z.convert("RGB"), (x, 70))
        for j, line in enumerate(textwrap.wrap(cap, 28)):
            d.text((x, 70 + z.height + 8 + j * 15), line, font=font(12), fill=(210, 210, 220))
        x += z.width + 40
    path = PROOF / "hook_tocanvas_simulation.png"
    canvas.save(path, quality=95)
    return path


def write_manifest(meat, prot, unused_entries, unverified):
    sprites = [
        {
            "id": "meat",
            "file": "icons/meat.png",
            "width": meat.width,
            "height": meat.height,
            "label": "Care menu Feed icon — classic yellow-orange meat, selected well on the Wikimon Feeding / Training screen",
            "confidence": "high-identity, medium-high pixel quality",
            "use": "swap",
            "source_file": "raw/wikimon/Digimon_Feeding.png",
            "source_url": WIKIMON_URL,
            "source_page": WIKIMON_PAGE,
            "working_image": "left 512×768 of the 514×768 file (right 2 columns nearly black), exact 2× of 256×384",
            "crop_2x": list(MEAT_BOX_2X),
            "crop_native_equiv": [MEAT_BOX_2X[0] // 2, MEAT_BOX_2X[1] // 2, MEAT_BOX_2X[2] // 2, MEAT_BOX_2X[3] // 2],
            "process": "Flood-key green selection glow + dark well from edges; drop remaining green fringe; keep main component; BOX downsample 2:1; trim. Pixels not redrawn.",
            "screen": "English Training / Feeding, log '41 / 40 / 39 Food remaining.' Meat well is selected.",
            "quality_notes": "Source is a 2× official screenshot PNG, not a sprite-sheet rip. Slight softness and a tight crop to exclude the gold hex frame. Clearly recognizable as the Championship Feed meat (not the earlier flame/claw extract).",
        },
        {
            "id": "protein_pill",
            "file": "icons/protein_pill.png",
            "width": prot.width,
            "height": prot.height,
            "label": "Care menu Protein icon — unselected gray/white capsule immediately right of the Feed meat",
            "confidence": "high-identity, medium pixel quality",
            "use": "swap",
            "source_file": "raw/wikimon/Digimon_Feeding.png",
            "source_url": WIKIMON_URL,
            "source_page": WIKIMON_PAGE,
            "working_image": "left 512×768 of the 514×768 file, exact 2× of 256×384",
            "crop_2x": list(PROT_BOX_2X),
            "crop_native_equiv": [PROT_BOX_2X[0] // 2, PROT_BOX_2X[1] // 2, PROT_BOX_2X[2] // 2, PROT_BOX_2X[3] // 2],
            "process": "Flood-key gold frame + dark well (lum<75) + blue water from edges; keep main component; BOX downsample 2:1; trim. Pixels not redrawn.",
            "screen": "Same Feeding toolbar. Slot cross-checked against Giant Bomb English Training 'Protein remaining' screen, where this well is the Protein capsule.",
            "quality_notes": "Unselected; screenshot softness. Recognizable two-tone capsule with highlight. Earlier JPEG extract (grey wedge) was rejected.",
        },
    ]
    sprites.extend(unused_entries)
    manifest = {
        "game": "Digimon World Championship (Nintendo DS, 2008); JP title Digimon Championship. There is no Pokémon Championship DS.",
        "note": "Verification pass: only visually confirmed crops are swapped. Transparency keyed; pixels not redrawn. Nearest-neighbor in-game. No item sprite sheet was found on The Spriters Resource or Sprite Database.",
        "sprites": sprites,
        "swaps": {
            "meat": "meat",
            "meatPack": "meat",
            "food": "meat",
            "vitamin": "protein_pill",
        },
        "reverted": {
            "medicine": "Championship brown white-card portrait looks like a drumstick/meat and is not visually unique to medicine despite クスリ screen text. Restore Disk remains on procedural fallback. Crop kept under unverified/.",
        },
        "unmatched_existing_ids": [
            "medicine",
            "fish", "berry", "fishPack", "berryPack", "joyToy", "eraser",
            "atkBoost", "dataChip", "digimental", "crest", "heal", "toy", "bits", "xp", "hp",
        ],
        "unverified_references": unverified,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    return manifest


def unused_toolbar_entries():
    """Existing unused JPEG toolbar crops, downgraded to unverified references if still in icons/."""
    # Keep files where they are, but do not list poor ones as high-confidence usable icons.
    catalog = [
        ("hunt_food", "icons/hunt_food.png", "Hunt Food bait (striped bun) on the Pocket Gamer Hunt toolbar. Not care-menu meat. Unused — must not replace Feed meat.", "medium", "unverified_reference",
         "raw/pocketgamer/digimon_world_championship_010.jpg", [56, 368, 75, 383]),
        ("hunt_gun", "icons/hunt_gun.png", "Hunt toolbar icon, likely Gun; JPEG extract is soft/ambiguous. Unused.", "low", "unverified_reference",
         "raw/pocketgamer/digimon_world_championship_010.jpg", [82, 368, 101, 383]),
        ("hunt_fence", "icons/hunt_fence.png", "Hunt toolbar fragment, possible fence/trap. Visually poor. Unused.", "low", "unverified_reference",
         "raw/pocketgamer/digimon_world_championship_010.jpg", [109, 368, 127, 383]),
        ("hunt_bomb_dark", "icons/hunt_bomb_dark.png", "Hunt toolbar dark sphere, possible bomb/trap. Unused.", "low", "unverified_reference",
         "raw/pocketgamer/digimon_world_championship_010.jpg", [135, 368, 153, 383]),
        ("hunt_bomb_light", "icons/hunt_bomb_light.png", "Hunt toolbar light sphere, possible bomb/trap. Unused.", "low", "unverified_reference",
         "raw/pocketgamer/digimon_world_championship_010.jpg", [161, 368, 179, 383]),
        ("hunt_boot_or_tool", "icons/hunt_boot_or_tool.png", "Hunt toolbar fragment, boot or tool. Visually poor. Unused.", "low", "unverified_reference",
         "raw/pocketgamer/digimon_world_championship_010.jpg", [188, 368, 206, 383]),
        ("care_syringe_or_clean", "icons/care_syringe_or_clean.png", "Care toolbar well 4, syringe-like; may be Clean. Not labeled vaccine. Unused. Prefer the Wikimon toolbar in proof for shape; this file is a soft Giant Bomb JPEG extract.", "low", "unverified_reference",
         "raw/giantbomb/430551-digimon_world_championship_gp3.jpg", [81, 368, 99, 383]),
        ("care_tool_4", "icons/care_tool_4.png", "Care toolbar fragment. Unused, visually poor.", "low", "unverified_reference",
         "raw/giantbomb/430551-digimon_world_championship_gp3.jpg", [108, 368, 126, 383]),
        ("care_pack_or_bandage", "icons/care_pack_or_bandage.png", "Care toolbar possible Bandage/pack. Unconfirmed, JPEG quality poor. Unused.", "low", "unverified_reference",
         "raw/giantbomb/430551-digimon_world_championship_gp3.jpg", [133, 368, 151, 383]),
        ("care_bottle_toolbar", "icons/care_bottle_toolbar.png", "Care toolbar pointed tool (dropper or similar). Unused, not used as medicine.", "low", "unverified_reference",
         "raw/giantbomb/430551-digimon_world_championship_gp3.jpg", [159, 368, 177, 383]),
    ]
    entries = []
    for sid, rel, label, conf, use, src, crop in catalog:
        path = OUT / rel
        if not path.is_file():
            continue
        im = Image.open(path)
        entries.append({
            "id": sid,
            "file": rel,
            "width": im.width,
            "height": im.height,
            "label": label,
            "confidence": conf,
            "use": use,
            "source_file": src,
            "crop": crop,
            "screen": "Unused toolbar reference only; not a gameplay swap.",
        })
    return entries


def write_sources(meat, prot):
    text = f"""# Digimon World Championship item icon sources

This is an unofficial, non-commercial fan project. **Digimon** and these official UI/item graphics are the property of **Bandai Namco Entertainment Inc.**, **Toei Animation Co., Ltd.**, and their licensors. Nothing here is for sale. The owner accepted the copyright risk of using real Digimon sprites in this private project.

## Title correction

The request named “Pokémon Championship DS.” There is no game of that title matching these meat / vaccine / pill items. The source is **Digimon World Championship** (Nintendo DS, North America / PAL, 26 Aug 2008), also released in Japan as **Digimon Championship** (デジモンチャンピオンシップ, 14 Feb 2008).

Supporting sources:

- Wikimon: https://wikimon.net/Digimon_Championship
- The Spriters Resource game page: https://www.spriters-resource.com/ds_dsi/dwchampionship/
- Sprite Database: https://spritedatabase.net/game/1800
- Official Japanese product page: https://digimon-gameportal.bn-ent.net/product/ds_digimon03/cs1.html

In this game the care menu is **Move, Feed, Protein, Clean, Bandage, Medicine**. Feed uses a classic yellow-orange meat icon. Protein is described in guides as a **pill**. Medicine (クスリ) cures a cold. “Vaccine” is a Digimon **attribute** in this title, not a confirmed item name.

## What was and was not found

Searched public fan archives (no ROMs, no circumvention of Cloudflare-blocked hosts):

| Archive | Result |
| --- | --- |
| The Spriters Resource — Digimon World Championship | Only 3 **character** sheets. No item, food, or UI icon sheet. https://www.spriters-resource.com/ds_dsi/dwchampionship/ |
| Sprite Database — game 1800 | Character idles only. No item icons. https://spritedatabase.net/game/1800 |
| Wikimon / Garmmon Championship sprite index | Digimon stills, not item icons. |
| Wikimon File:Digimon_Feeding.png | Official dual-screen Training / Feeding screenshot (514×768). Left 512×768 is exact 2× of native 256×384 (right 2 columns nearly black). This is the source of the **verified** meat and protein crops. {WIKIMON_PAGE} — original: {WIKIMON_URL} |
| Giant Bomb screenshot gallery (wiki-origin) | Native 256×385 English Training (“Protein remaining”) and Japanese Training (クスリ). Useful for labeling the toolbar, but JPEG extracts of meat / protein / medicine were visually poor or ambiguous and were **reverted**. {GB_PAGE} |
| Pocket Gamer E3 2008 screenshots | Native Hunt toolbar (Food bait, gun, traps). Kept as unused references only; Hunt Food bait is **not** the care-menu meat. |
| MobyGames / GameFAQs image hosts | Cloudflare-blocked from this environment; not bypassed. |
| Digimon World (PlayStation) item sheets on TSR | **Not used.** Different game. |

No standalone item sprite sheet for Championship was found. Icons were **cropped** from public official screenshots and background-keyed to transparency. Pixels were not redrawn or invented.

## Verification pass (required before delivery)

A first pass cropped meat / protein / medicine from soft Giant Bomb JPEGs and claimed high confidence. Visual review rejected those live assets:

- `meat.png` looked like yellow flames / a claw with stray pale pixels (selection-glow keying ate the meat).
- `protein_pill.png` looked like a grey wedge (the capsule body was over-trimmed).
- `medicine.png` looked like a brown drumstick / meat, even though the Japanese screen text is クスリ.

Those files were moved to `unverified/` and are **not** gameplay art. Coordinates were re-checked against the raw screens (see `proof/`).

The Wikimon Feeding screenshot is the clearest public source of the care toolbar. Context labels: **“41 / 40 / 39 Food remaining.”** The selected yellow-orange well is the Feed / meat icon. The next well is an unselected grey-white Protein capsule (same slot as on the English “Protein remaining” Giant Bomb screen). Tight crops of those two wells, with glow/frame keyed and no redrawing, are the only swaps kept.

## Raw screenshots (archived under `raw/`)

| Local file | Direct URL | Page | Role |
| --- | --- | --- | --- |
| `raw/wikimon/Digimon_Feeding.png` (514×768) | {WIKIMON_URL} | {WIKIMON_PAGE} | **Verified meat + protein source** |
| `raw/giantbomb/430551-digimon_world_championship_gp3.jpg` (256×385) | https://www.giantbomb.com/a/uploads/original/1/11300/430551-digimon_world_championship_gp3.jpg | {GB_PAGE} | Label cross-check only; earlier crops rejected |
| `raw/giantbomb/586753-gfs_97204_2_11.jpg` (256×384) | https://www.giantbomb.com/a/uploads/original/0/3715/586753-gfs_97204_2_11.jpg | {GB_PAGE} | クスリ context; medicine portrait **unverified / reverted** |
| `raw/pocketgamer/digimon_world_championship_010.jpg` (256×385) | https://media.pocketgamer.com/artwork/na-xcl/digimon_world_championship_010.jpg | https://www.pocketgamer.com/digimon-world-championship/e3-2008-digimon-world-championship-digivoles-on-your-digi-ds/ | Hunt toolbar references only |

## Gameplay swaps (verified only)

Gameplay mechanics, prices, and stat effects were not changed. Procedural art remains the fallback when a file is missing or a mapping is reverted. `js/item-art.js` wraps `getIcon` / `drawPickup` / `drawMeat` after `game.js`.

| Icon file | Identification | Confidence | Existing item ids swapped | Source crop (on left 512×768) |
| --- | --- | --- | --- | --- |
| `icons/meat.png` ({meat.width}×{meat.height}) | Care-menu **Feed** meat (classic yellow-orange Championship meat), selected well, “Food remaining” screen | identity **high**; pixel quality **medium-high** (2× screenshot, glow keyed, slight softness, tight box to exclude the gold frame) | `meat`, `meatPack`, `food` (HUD + shop + world pickup) | (118, 728)–(142, 752), then BOX 2:1 |
| `icons/protein_pill.png` ({prot.width}×{prot.height}) | Care-menu **Protein** capsule, unselected well immediately right of Feed | identity **high** (slot cross-checked on the English Protein-remaining screen); pixel quality **medium** | `vitamin` (Power Vitamin; previously had no ICO) | (164, 738)–(188, 756), then BOX 2:1 |

### Reverted / not swapped

| Item | Action | Why |
| --- | --- | --- |
| `medicine` (Restore Disk) | **Reverted to procedural fallback** | The Japanese white-card portrait is contextually a medicine-use screen, but the art looks like a brown drumstick/meat and resembles the Feeding-screen food portrait. It must not replace Restore Disk. Crop retained as `unverified/medicine_portrait_jp_unverified.png` only. |
| Earlier `icons/meat.png` / `protein_pill.png` from gp3 JPEG | Rejected | Wrong visual (flames/claw, grey wedge). Archived under `unverified/`. |
| Hunt Food bait, Hunt gun/traps, other care-toolbar tools | Unused references only | Hunt bait is not care meat. JPEG fragments are soft or ambiguous. “Vaccine” is not a confirmed item. |

### Existing items left on fallback art

`medicine`, `fish`, `berry`, `fishPack`, `berryPack`, `joyToy`, `eraser`, `atkBoost`, `dataChip`, `digimental`, `crest`, `heal`, `toy`, `bits`, `xp`, `hp`.

## Remaining limitations (do not hide)

- There is still **no dumped native sprite sheet** for these items. Crops come from a 2× official screenshot, not lossless 1× tiles.
- No clean **unselected** (non-glow) Feed-meat still was found; the used meat crop is the selected well with the green glow keyed out.
- **No verified Medicine or Vaccine item icon.** The syringe-like care tool is unlabeled (Clean vs medical). Do not invent one.
- No Championship **fish / berry** icons appear in the screens we have (Feed food is meat).
- Screenshot softness remains visible at 3× in-game, especially on the Protein capsule.

## Extraction and proofs

`scripts/extract-championship-items.py` and `scripts/finalize-verified-item-art.py` record the verified rectangles, key backgrounds, BOX-downsample the 2× crops, and write transparent PNGs. In-game rendering is nearest-neighbor (`imageSmoothingEnabled = false`) via `js/item-art.js`.

Original-context annotated proofs (read these against the raw screens):

- `proof/wikimon_feeding_context_annotated.png` — full Feeding screenshot with “Food remaining” log, leftover-tray warning, and boxed used crops + coordinates
- `proof/wikimon_meat_crop_proof.png` — raw well, keyed 2×, native, and `toCanvas` 36/30 hook simulation
- `proof/wikimon_protein_crop_proof.png` — same for the Protein capsule
- `proof/rejected_and_unverified_context.png` — rejected gp3 meat/protein and unverified medicine portrait in original UI
- `proof/hook_tocanvas_simulation.png` — Python port of the actual `item-art.js` `toCanvas` sizes used by `getIcon` / `drawPickup`
- `contact-sheet.png`, `before-after.png` — updated after the verification pass
"""
    (OUT / "SOURCES.md").write_text(text)


def move_trials():
    TRIALS.mkdir(parents=True, exist_ok=True)
    seen = set()
    for p in list(PROOF.glob("try*.png")):
        if not p.is_file() or p.parent == TRIALS:
            continue
        key = p.resolve()
        if key in seen:
            continue
        seen.add(key)
        dest = TRIALS / p.name
        if dest.exists():
            p.unlink()
        else:
            shutil.move(str(p), str(dest))


def patch_extract_script():
    """Prevent a re-run of the old extract script from overwriting verified icons."""
    path = ROOT / "scripts" / "extract-championship-items.py"
    text = path.read_text()
    banner = (
        "#!/usr/bin/env python3\n"
        '"""DEPRECATED writer for the first JPEG pass.\n\n'
        "Do not run this file to refresh gameplay icons. It would overwrite verified\n"
        "Wikimon meat/protein crops with the rejected Giant Bomb JPEG extracts.\n"
        "Use scripts/finalize-verified-item-art.py instead.\n"
        '"""\n'
        "import sys\n"
        "if __name__ == '__main__' and 'force-old-jpeg-extract' not in sys.argv:\n"
        "    sys.stderr.write(\n"
        "        'Refusing to run: this script writes the rejected JPEG meat/protein/medicine '\n"
        "        'extracts. Use scripts/finalize-verified-item-art.py\\n'\n"
        "    )\n"
        "    sys.exit(2)\n\n"
    )
    # Prepend guard if not already present
    if "force-old-jpeg-extract" not in text:
        # drop existing shebang if present
        if text.startswith("#!"):
            text = text.split("\n", 1)[1]
        path.write_text(banner + text)


def main():
    ICONS.mkdir(parents=True, exist_ok=True)
    UNVER.mkdir(parents=True, exist_ok=True)
    PROOF.mkdir(parents=True, exist_ok=True)
    QA.mkdir(parents=True, exist_ok=True)

    notes = archive_rejected()
    src = feed512()
    src.save(PROOF / "wikimon_feed_512.png")

    meat_raw, meat_2x, meat = extract_meat(src)
    prot_raw, prot_2x, prot = extract_protein(src)
    print("meat native", meat.size, "opaque", opaque_count(meat), "2x", meat_2x.size)
    print("protein native", prot.size, "opaque", opaque_count(prot), "2x", prot_2x.size)

    meat.save(ICONS / "meat.png")
    prot.save(ICONS / "protein_pill.png")
    # keep 2x keyed copies for QA, not as live icons
    meat_2x.save(PROOF / "wikimon_meat_keyed_2x.png")
    prot_2x.save(PROOF / "wikimon_protein_keyed_2x.png")

    unused = unused_toolbar_entries()
    unverified = [
        {
            "id": "gp3_meat_rejected",
            "file": "unverified/gp3_meat_rejected.png",
            "reason": "Giant Bomb JPEG Feed well; keyed result looked like yellow flames/claw with stray pixels. Well identity was correct; art quality was not.",
            "crop": [30, 368, 49, 383],
            "source_file": "raw/giantbomb/430551-digimon_world_championship_gp3.jpg",
        },
        {
            "id": "gp3_protein_pill_rejected",
            "file": "unverified/gp3_protein_pill_rejected.png",
            "reason": "Giant Bomb JPEG Protein well; keyed result looked like a grey wedge.",
            "crop": [56, 368, 74, 383],
            "source_file": "raw/giantbomb/430551-digimon_world_championship_gp3.jpg",
        },
        {
            "id": "medicine_portrait_jp_unverified",
            "file": "unverified/medicine_portrait_jp_unverified.png",
            "reason": "Japanese クスリ screen white-card portrait looks like a brown drumstick/meat. Not used to replace Restore Disk.",
            "crop": [27, 73, 48, 94],
            "source_file": "raw/giantbomb/586753-gfs_97204_2_11.jpg",
        },
    ]
    manifest = write_manifest(meat, prot, unused, unverified)
    write_sources(meat, prot)

    colors = parse_sprite_colors()
    build_context_proof(src, meat, prot)
    build_crop_proof(
        "VERIFIED USED CROP — Feed / meat",
        meat_raw, meat_2x, meat, MEAT_BOX_2X,
        "Source: Wikimon Digimon_Feeding.png left 512x768. Crop (118,728)-(142,752). Screen log: 41/40/39 Food remaining. Selected well is Feed. Green glow keyed, gold frame excluded, not redrawn.",
        PROOF / "wikimon_meat_crop_proof.png",
    )
    build_crop_proof(
        "VERIFIED USED CROP — Protein capsule",
        prot_raw, prot_2x, prot, PROT_BOX_2X,
        "Source: same Feeding toolbar, unselected well immediately right of Feed. Crop (164,738)-(188,756). Slot matches the English 'Protein remaining' screen capsule. Gold frame + dark well keyed, not redrawn.",
        PROOF / "wikimon_protein_crop_proof.png",
    )
    build_rejected_proof()
    build_hook_proof(meat, prot)
    # contact sheet: verified first, then unused
    build_contact_sheet(manifest["sprites"], unverified)
    build_before_after(colors, meat, prot)

    for sid, im in (("meat", meat), ("protein_pill", prot)):
        nn(im, 8).save(QA / f"{sid}_x8.png")
        nn(im, 12).save(QA / f"{sid}_x12.png")

    move_trials()
    patch_extract_script()
    print("archived:", notes)
    print("done")


if __name__ == "__main__":
    main()
