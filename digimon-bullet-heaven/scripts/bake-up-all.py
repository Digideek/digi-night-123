#!/usr/bin/env python3
"""Trim every Digimon UP idle/walk bake into frames-up-all/, pack atlases,
write up-manifest.json and contact sheet(s). Does not touch in-game js/css/html.
"""
from __future__ import annotations

import json
import math
import shutil
import sys
from collections import Counter
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/workspace/digimon-bullet-heaven")
BAKED = Path("/tmp/digimon-up-sprites/baked")
PROFILES = Path("/tmp/digimon-up-sprites/digimon.json")
EXISTING_FRAMES = ROOT / "assets/sprites/frames"
OUT_FRAMES = ROOT / "assets/sprites/frames-up-all"
OUT_ATLAS = ROOT / "assets/sprites/atlases-up-all"
MANIFEST_PATH = ROOT / "assets/sprites/up-manifest.json"
PREVIEW_DIR = ROOT / "assets/sprites"
WIKIMON_STILL = ROOT / "assets/sprites/raw/wikimon-up"
REPO_COMMIT = "4eaee71cc949953e45ce5a77564469ba93e36907"
REPO_URL = "https://github.com/dannyphang/digimon-up-sprites"
FPS = 16

# Bake folder name -> in-game species id
FOLDER_TO_ID = {
    "demidevilmon": "demidevimon",
}

# Costume / event skins: still shipped as assets, but marked as variants.
VARIANT_OF = {
    "agumon_adventure": "agumon",
    "biyomon_adventure": "biyomon",
    "gabumon_adventure": "gabumon",
    "gatomon_adventure": "gatomon",
    "gomamon_adventure": "gomamon",
    "veemon_adventure02": "veemon",
    "wormmon_adventure02": "wormmon",
    "wargreymon_adventure": "wargreymon",
    "metalgarurumon_adventure": "metalgarurumon",
    "guilmon_tamers": "guilmon",
    "devimon_normal": "devimon",
    "etemon_normal": "etemon",
    "machinedramon_normal": "machinedramon",
    "gekkomon_beatbreak": "gekkomon",
    "gekkomon_runevent": "gekkomon",
    "gekkomon_runevent_fever": "gekkomon",
    "gekkomon_runevent_shadow": "gekkomon",
}

# Profiles missing from digimon.json (Wikimon + inherited variant data).
# stage uses encyclopedia names; manifest maps them to Wikimon dual names.
EXTRA_PROFILES = {
    "aegiomon": {
        "name": "Aegiomon",
        "stage": "Champion",
        "attribute": "Vaccine",
        "type": "God Man",
        "source": "https://wikimon.net/Aegiomon",
    },
    "aegiochusmon": {
        "name": "Aegiochusmon",
        "stage": "Ultimate",
        "attribute": "Vaccine",
        "type": "God Man",
        "source": "https://wikimon.net/Aegiochusmon",
    },
    "apollomon": {
        "name": "Apollomon",
        "stage": "Mega",
        "attribute": "Vaccine",
        "type": "Holy Beast",
        "source": "https://wikimon.net/Apollomon",
    },
    "atratusmon_beatbreak": {
        "name": "Atratusmon",
        "stage": "Mega",
        "attribute": "Data",
        "type": "Mutation",
        "source": "https://wikimon.net/Atratusmon",
    },
    "blackwargreymon": {
        "name": "BlackWarGreymon",
        "stage": "Mega",
        "attribute": "Virus",
        "type": "Dragon Man",
        "source": "https://wikimon.net/BlackWarGreymon",
    },
    "chiropmon_beatbreak": {
        "name": "Chiropmon",
        "stage": "Rookie",
        "attribute": "Virus",
        "type": "Mammal",
        "source": "https://wikimon.net/Chiropmon",
    },
    "dianamon": {
        "name": "Dianamon",
        "stage": "Mega",
        "attribute": "Data",
        "type": "God Man",
        "source": "https://wikimon.net/Dianamon",
    },
    "guardromon_gold": {
        "name": "Guardromon (Gold)",
        "stage": "Champion",
        "attribute": "Free",
        "type": "Machine",
        "source": "https://wikimon.net/Guardromon_(Gold)",
    },
    "kimeramon": {
        "name": "Kimeramon",
        "stage": "Ultimate",
        "attribute": "Data",
        "type": "Composite",
        "source": "https://wikimon.net/Kimeramon",
    },
    "magnamon": {
        "name": "Magnamon",
        "stage": "Armor",
        "attribute": "Free",
        "type": "Holy Dragon",
        "source": "https://wikimon.net/Magnamon",
    },
    "malomyotismon": {
        "name": "MaloMyotismon",
        "stage": "Mega",
        "attribute": "Virus",
        "type": "Demon Lord",
        "source": "https://wikimon.net/MaloMyotismon",
    },
    "minervamon": {
        "name": "Minervamon",
        "stage": "Mega",
        "attribute": "Virus",
        "type": "God Man",
        "source": "https://wikimon.net/Minervamon",
    },
    "murasamemon_beatbreak": {
        "name": "Murasamemon",
        "stage": "Ultimate",
        "attribute": "Virus",
        "type": "Beast Man",
        "source": "https://wikimon.net/Murasamemon",
    },
    "pristimon_beatbreak": {
        "name": "Pristimon",
        "stage": "Rookie",
        "attribute": "Vaccine",
        "type": "Puppet",
        "source": "https://wikimon.net/Pristimon",
    },
    "shoutmon_xroswars": {
        "name": "Shoutmon",
        "stage": "Rookie",
        "attribute": "Data",
        "type": "Small Dragon",
        "source": "https://wikimon.net/Shoutmon",
    },
    "jijimon": {
        "name": "Jijimon",
        "stage": "Mega",
        "attribute": "Vaccine",
        "type": "Ancient",
        "source": "https://wikimon.net/Jijimon",
    },
}

VARIANT_DISPLAY = {
    "agumon_adventure": "Agumon (Adventure)",
    "biyomon_adventure": "Biyomon (Adventure)",
    "gabumon_adventure": "Gabumon (Adventure)",
    "gatomon_adventure": "Gatomon (Adventure)",
    "gomamon_adventure": "Gomamon (Adventure)",
    "veemon_adventure02": "Veemon (Adventure 02)",
    "wormmon_adventure02": "Wormmon (Adventure 02)",
    "wargreymon_adventure": "WarGreymon (Adventure)",
    "metalgarurumon_adventure": "MetalGarurumon (Adventure)",
    "guilmon_tamers": "Guilmon (Tamers)",
    "devimon_normal": "Devimon (Normal)",
    "etemon_normal": "Etemon (Normal)",
    "machinedramon_normal": "Machinedramon (Normal)",
    "gekkomon_beatbreak": "Gekkomon (Beat Break)",
    "gekkomon_runevent": "Gekkomon (Run Event)",
    "gekkomon_runevent_fever": "Gekkomon (Run Event Fever)",
    "gekkomon_runevent_shadow": "Gekkomon (Run Event Shadow)",
}

# Encyclopedia stage -> Wikimon dual name used in the manifest / tree
STAGE_DISPLAY = {
    "Baby I": "Baby I",
    "Baby II": "Baby II (In-Training)",
    "Rookie": "Child (Rookie)",
    "Champion": "Adult (Champion)",
    "Ultimate": "Perfect (Ultimate)",
    "Mega": "Ultimate (Mega)",
    "Mega+": "Ultimate (Mega+)",
    "Armor": "Armor",
    "Hybrid": "Hybrid",
    "Unknown": "Unknown",
}

WIKIMON_FILE = {
    # A few known filename quirks
    "demidevimon": "Picodevimon_up.png",
    "tsunomon": "Tunomon_up.png",
    "metalgreymon": "Metalgreymon_up.png",
    "metalgarurumon": "Metalgarurumon_up.png",
    "wargreymon": "Wargreymon_up.png",
    "weregarurumon": "Weregarurumon_up.png",
}


def species_id(folder: str) -> str:
    return FOLDER_TO_ID.get(folder, folder)


def load_profiles() -> dict:
    raw = json.loads(PROFILES.read_text())
    by = {p["folder"]: p for p in raw}
    return by


def list_pngs(folder: Path) -> list[Path]:
    return sorted(folder.glob("*.png"), key=lambda p: p.name)


def union_bbox(images: list[Image.Image]) -> tuple[int, int, int, int] | None:
    union = None
    for im in images:
        b = im.getbbox()
        if not b:
            continue
        if union is None:
            union = list(b)
        else:
            union[0] = min(union[0], b[0])
            union[1] = min(union[1], b[1])
            union[2] = max(union[2], b[2])
            union[3] = max(union[3], b[3])
    return tuple(union) if union else None


def trim_box(images: list[Image.Image]) -> tuple[int, int, int, int]:
    """Shared bounding box plus 1px padding, clamped to the source canvas."""
    w, h = images[0].size
    box = union_bbox(images)
    if not box:
        return (0, 0, w, h)
    x0, y0, x1, y1 = box
    x0 = max(0, x0 - 1)
    y0 = max(0, y0 - 1)
    x1 = min(w, x1 + 1)
    y1 = min(h, y1 + 1)
    if x1 <= x0 or y1 <= y0:
        return (0, 0, w, h)
    return (x0, y0, x1, y1)


def save_png(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, format="PNG", optimize=True, compress_level=9)


def copy_existing(src_id: str, dest_id: str) -> dict | None:
    src = EXISTING_FRAMES / src_id
    if not src.is_dir():
        return None
    dest = OUT_FRAMES / dest_id
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)
    idle = walk = 0
    size = None
    for p in sorted(src.glob("idle_*.png")) + sorted(src.glob("walk_*.png")):
        shutil.copy2(p, dest / p.name)
        if size is None:
            with Image.open(p) as im:
                size = im.size
        if p.name.startswith("idle_"):
            idle += 1
        else:
            walk += 1
    return {"idle": idle, "walk": walk, "w": size[0] if size else 0, "h": size[1] if size else 0, "copied": True}


def bake_from_raw(folder: str, dest_id: str) -> dict:
    idle_dir = BAKED / folder / "idle"
    walk_dir = BAKED / folder / "walking"
    idle_paths = list_pngs(idle_dir)
    walk_paths = list_pngs(walk_dir)
    if not idle_paths:
        raise RuntimeError(f"{folder}: no idle frames")
    images = []
    groups = []
    for label, paths in (("idle", idle_paths), ("walk", walk_paths)):
        imgs = [Image.open(p).convert("RGBA") for p in paths]
        groups.append((label, imgs))
        images.extend(imgs)
    # All frames of one Digimon should share a canvas; if not, pad to a
    # common size with feet (bottom) and horizontal center aligned.
    sizes = {im.size for im in images}
    if len(sizes) > 1:
        max_w = max(s[0] for s in sizes)
        max_h = max(s[1] for s in sizes)
        aligned = []
        new_groups = []
        for label, imgs in groups:
            padded = []
            for im in imgs:
                canvas = Image.new("RGBA", (max_w, max_h), (0, 0, 0, 0))
                x = (max_w - im.size[0]) // 2
                y = max_h - im.size[1]
                canvas.paste(im, (x, y))
                padded.append(canvas)
            new_groups.append((label, padded))
            aligned.extend(padded)
        groups, images = new_groups, aligned
    box = trim_box(images)
    dest = OUT_FRAMES / dest_id
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)
    counts = {"idle": 0, "walk": 0}
    for label, imgs in groups:
        for i, im in enumerate(imgs):
            cropped = im.crop(box)
            save_png(cropped, dest / f"{label}_{i}.png")
            counts[label] += 1
        for im in imgs:
            im.close()
    tw, th = box[2] - box[0], box[3] - box[1]
    return {"idle": counts["idle"], "walk": counts["walk"], "w": tw, "h": th, "copied": False}


def bake_still(png_path: Path, dest_id: str) -> dict:
    im = Image.open(png_path).convert("RGBA")
    box = trim_box([im])
    cropped = im.crop(box)
    dest = OUT_FRAMES / dest_id
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)
    save_png(cropped, dest / "idle_0.png")
    save_png(cropped, dest / "walk_0.png")
    return {"idle": 1, "walk": 1, "w": cropped.size[0], "h": cropped.size[1], "copied": False, "still": True}


def pack_atlas(dest_id: str, info: dict) -> dict:
    folder = OUT_FRAMES / dest_id
    frames = []
    labels = []
    for label, count in (("idle", info["idle"]), ("walk", info["walk"])):
        for i in range(count):
            p = folder / f"{label}_{i}.png"
            frames.append(Image.open(p).convert("RGBA"))
            labels.append((label, i))
    if not frames:
        return {}
    fw, fh = frames[0].size
    pad = 1
    n = len(frames)
    max_w = 2048
    cols = min(n, max(1, max_w // (fw + pad))) if fw + pad <= max_w else 1
    rows = math.ceil(n / cols)
    aw = cols * (fw + pad) - pad
    ah = rows * (fh + pad) - pad
    atlas = Image.new("RGBA", (aw, ah), (0, 0, 0, 0))
    coords = {"idle": [], "walk": []}
    for i, im in enumerate(frames):
        r, c = divmod(i, cols)
        x = c * (fw + pad)
        y = r * (fh + pad)
        atlas.paste(im, (x, y))
        label, _idx = labels[i]
        coords[label].append({"x": x, "y": y, "w": fw, "h": fh})
        im.close()
    out = OUT_ATLAS / f"{dest_id}.png"
    save_png(atlas, out)
    meta = {
        "id": dest_id,
        "image": f"{dest_id}.png",
        "frameWidth": fw,
        "frameHeight": fh,
        "idle": info["idle"],
        "walk": info["walk"],
        "fps": FPS,
        "cols": cols,
        "rows": rows,
        "atlasWidth": aw,
        "atlasHeight": ah,
        "frames": coords,
    }
    (OUT_ATLAS / f"{dest_id}.json").write_text(json.dumps(meta, indent=2) + "\n")
    return {"atlasBytes": out.stat().st_size, "cols": cols, "rows": rows}


def wikimon_url(sid: str, folder: str) -> str:
    fname = WIKIMON_FILE.get(sid)
    if not fname:
        # default: Capitalized id + _up.png, with some cleanup
        base = sid.split("_")[0]
        fname = base[0].upper() + base[1:] + "_up.png"
    return f"https://wikimon.net/File:{fname}"


def display_name(sid: str, folder: str, profiles: dict) -> str:
    if sid in VARIANT_DISPLAY:
        return VARIANT_DISPLAY[sid]
    if folder in VARIANT_DISPLAY:
        return VARIANT_DISPLAY[folder]
    if folder in EXTRA_PROFILES:
        return EXTRA_PROFILES[folder]["name"]
    if sid in EXTRA_PROFILES:
        return EXTRA_PROFILES[sid]["name"]
    p = profiles.get(folder) or profiles.get(VARIANT_OF.get(folder, folder))
    if p:
        return p["name"]["en"]
    # Title-case the id as a last resort
    return sid.replace("_", " ").title()


def profile_fields(folder: str, sid: str, profiles: dict) -> dict:
    if folder in EXTRA_PROFILES:
        e = EXTRA_PROFILES[folder]
        return {k: e[k] for k in ("stage", "attribute", "type", "source")}
    if sid in EXTRA_PROFILES and folder not in profiles:
        e = EXTRA_PROFILES[sid]
        return {k: e[k] for k in ("stage", "attribute", "type", "source")}
    base = VARIANT_OF.get(folder, folder)
    # agumon_adventure -> agumon, but imperialdramon_dragonmode is its own profile
    p = profiles.get(folder) or profiles.get(base)
    if not p:
        return {"stage": "Unknown", "attribute": "", "type": "", "source": REPO_URL}
    return {
        "stage": p["stage"]["en"] or "Unknown",
        "attribute": p["attribute"]["en"] or "",
        "type": p["type"]["en"] or "",
        "source": p.get("source") or REPO_URL,
    }


def render_contact_sheets(entries: list[dict]) -> list[str]:
    """Paginated grid of idle_0 frames, feet on a shared baseline."""
    cell_w, cell_h, label_h = 110, 118, 28
    cols = 12
    per_page = 12 * 16  # 192
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
        font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
    except OSError:
        font = ImageFont.load_default()
        font_title = font

    # Sort: by stage order then name
    stage_rank = {k: i for i, k in enumerate(STAGE_DISPLAY.keys())}
    entries = sorted(entries, key=lambda e: (stage_rank.get(e["stage"], 99), e["name"].lower(), e["id"]))
    pages = []
    total_pages = max(1, math.ceil(len(entries) / per_page))
    for page_i in range(total_pages):
        chunk = entries[page_i * per_page : (page_i + 1) * per_page]
        rows = math.ceil(len(chunk) / cols)
        header = 40
        img_w = cols * cell_w + 20
        img_h = header + rows * (cell_h + label_h) + 16
        canvas = Image.new("RGBA", (img_w, img_h), (18, 20, 28, 255))
        draw = ImageDraw.Draw(canvas)
        title = f"Digimon UP roster  —  {len(entries)} species  —  page {page_i + 1}/{total_pages}"
        draw.text((12, 10), title, fill=(240, 236, 220, 255), font=font_title)
        for i, e in enumerate(chunk):
            r, c = divmod(i, cols)
            x0 = 10 + c * cell_w
            y0 = header + r * (cell_h + label_h)
            # cell background
            draw.rounded_rectangle((x0 + 2, y0 + 2, x0 + cell_w - 4, y0 + cell_h - 2), 6, fill=(28, 32, 44, 255))
            frame_path = OUT_FRAMES / e["id"] / "idle_0.png"
            if frame_path.exists():
                sprite = Image.open(frame_path).convert("RGBA")
                sw, sh = sprite.size
                scale = min((cell_w - 12) / max(1, sw), (cell_h - 10) / max(1, sh), 3.0)
                nw, nh = max(1, int(sw * scale)), max(1, int(sh * scale))
                sprite = sprite.resize((nw, nh), Image.Resampling.NEAREST)
                px = x0 + (cell_w - nw) // 2
                py = y0 + cell_h - 6 - nh  # feet on the baseline
                canvas.paste(sprite, (px, py), sprite)
            label = e["name"]
            if len(label) > 16:
                label = label[:15] + "…"
            tw = draw.textlength(label, font=font)
            draw.text((x0 + (cell_w - tw) / 2, y0 + cell_h + 4), label, fill=(220, 216, 200, 255), font=font)
        if total_pages == 1:
            out = PREVIEW_DIR / "preview-up-all.png"
        else:
            out = PREVIEW_DIR / f"preview-up-all-{page_i + 1}.png"
            if page_i == 0:
                # also write the first page under the canonical name
                pass
        save_png(canvas.convert("RGBA"), out)
        pages.append(str(out))
    if total_pages > 1:
        # copy page 1 to canonical name as well (already page-1); also write a
        # long vertical strip combining pages for a single-file preview.
        strip_w = 0
        imgs = [Image.open(p).convert("RGBA") for p in pages]
        strip_w = max(im.size[0] for im in imgs)
        strip_h = sum(im.size[1] for im in imgs) + 8 * (len(imgs) - 1)
        strip = Image.new("RGBA", (strip_w, strip_h), (18, 20, 28, 255))
        y = 0
        for im in imgs:
            strip.paste(im, (0, y))
            y += im.size[1] + 8
        canon = PREVIEW_DIR / "preview-up-all.png"
        save_png(strip, canon)
        pages.insert(0, str(canon))
    return pages


def dir_size(path: Path) -> int:
    return sum(p.stat().st_size for p in path.rglob("*") if p.is_file())


def main() -> int:
    profiles = load_profiles()
    baked_folders = sorted(p.name for p in BAKED.iterdir() if p.is_dir())
    print(f"baked folders: {len(baked_folders)}")
    if OUT_FRAMES.exists():
        shutil.rmtree(OUT_FRAMES)
    if OUT_ATLAS.exists():
        shutil.rmtree(OUT_ATLAS)
    OUT_FRAMES.mkdir(parents=True)
    OUT_ATLAS.mkdir(parents=True)

    entries = []
    missing_anim = []
    for folder in baked_folders:
        sid = species_id(folder)
        print(f"  baking {folder} -> {sid}", flush=True)
        # Prefer the already-approved trim for the current 16.
        copied = copy_existing(sid, sid)
        if copied:
            info = copied
        else:
            try:
                info = bake_from_raw(folder, sid)
            except Exception as exc:
                print(f"    ERROR {folder}: {exc}")
                missing_anim.append({"id": sid, "folder": folder, "reason": str(exc)})
                continue
        atlas = pack_atlas(sid, info)
        fields = profile_fields(folder, sid, profiles)
        entry = {
            "id": sid,
            "folder": folder,
            "name": display_name(sid, folder, profiles),
            "stage": fields["stage"],
            "stageDisplay": STAGE_DISPLAY.get(fields["stage"], fields["stage"]),
            "attribute": fields["attribute"] or "None",
            "type": fields["type"],
            "idleFrames": info["idle"],
            "walkFrames": info["walk"],
            "nativeWidth": info["w"],
            "nativeHeight": info["h"],
            "fps": FPS,
            "sourceUrl": f"{REPO_URL}/tree/main/baked/{folder}",
            "wikimonStill": wikimon_url(sid, folder),
            "profileSource": fields["source"],
            "trimmedFromExisting": bool(info.get("copied")),
            "variantOf": VARIANT_OF.get(folder) or VARIANT_OF.get(sid),
            "atlas": f"atlases-up-all/{sid}.png" if atlas else None,
            "atlasJson": f"atlases-up-all/{sid}.json" if atlas else None,
            "framesDir": f"frames-up-all/{sid}",
        }
        if not entry["variantOf"]:
            entry.pop("variantOf")
        entries.append(entry)

    # Jijimon still (no bake in the official repo)
    jijimon_png = WIKIMON_STILL / "Jijimon_up.png"
    if jijimon_png.exists() and not (OUT_FRAMES / "jijimon").exists():
        print("  baking jijimon from Wikimon still", flush=True)
        info = bake_still(jijimon_png, "jijimon")
        atlas = pack_atlas("jijimon", info)
        fields = EXTRA_PROFILES["jijimon"]
        entries.append({
            "id": "jijimon",
            "folder": None,
            "name": "Jijimon",
            "stage": fields["stage"],
            "stageDisplay": STAGE_DISPLAY[fields["stage"]],
            "attribute": fields["attribute"],
            "type": fields["type"],
            "idleFrames": info["idle"],
            "walkFrames": info["walk"],
            "nativeWidth": info["w"],
            "nativeHeight": info["h"],
            "fps": FPS,
            "sourceUrl": "https://wikimon.net/File:Jijimon_up.png",
            "wikimonStill": "https://wikimon.net/File:Jijimon_up.png",
            "profileSource": fields["source"],
            "trimmedFromExisting": False,
            "stillOnly": True,
            "animationNote": "No official UP idle/walk bake was in the archive; used the Wikimon UP still (uploader Garmmon) for both idle and walk.",
            "atlas": "atlases-up-all/jijimon.png",
            "atlasJson": "atlases-up-all/jijimon.json",
            "framesDir": "frames-up-all/jijimon",
        })
        missing_anim.append({
            "id": "jijimon",
            "folder": None,
            "reason": "No baked idle/walk in dannyphang/digimon-up-sprites; filled with Wikimon UP still (static).",
        })

    entries.sort(key=lambda e: (e["stage"], e["name"].lower(), e["id"]))
    frames_bytes = dir_size(OUT_FRAMES)
    atlas_png_bytes = sum(p.stat().st_size for p in OUT_ATLAS.glob("*.png"))
    atlas_json_bytes = sum(p.stat().st_size for p in OUT_ATLAS.glob("*.json"))
    stage_counts = Counter(e["stageDisplay"] for e in entries)
    attr_counts = Counter(e["attribute"] for e in entries)

    manifest = {
        "source": {
            "repo": REPO_URL,
            "commit": REPO_COMMIT,
            "note": "Official Digimon UP idle and walk frames, trimmed to a shared bounding box per species (1px padding, clamped). Playback 16 fps.",
        },
        "fps": FPS,
        "speciesCount": len(entries),
        "stageCounts": dict(stage_counts),
        "attributeCounts": dict(attr_counts),
        "payload": {
            "framesBytes": frames_bytes,
            "framesMB": round(frames_bytes / 1024 / 1024, 2),
            "atlasPngBytes": atlas_png_bytes,
            "atlasPngMB": round(atlas_png_bytes / 1024 / 1024, 2),
            "atlasJsonBytes": atlas_json_bytes,
            "frameFileCount": sum(1 for p in OUT_FRAMES.rglob("*.png")),
            "atlasCount": len(list(OUT_ATLAS.glob("*.png"))),
            "recommendation": (
                "Use per-species PNG atlases in atlases-up-all/ and lazy-load by evolution line "
                "(starter egg line first, then any branch the run unlocks, plus the current wave's enemy species). "
                "Individual frames in frames-up-all/ are the source of truth and match the existing 16-species layout."
            ),
        },
        "idAliases": {
            "demidevilmon": "demidevimon",
            "tri": "tanemon",
            "piccolomon": "piximon",
        },
        "missingAnimations": missing_anim,
        "species": {e["id"]: e for e in entries},
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n")
    print("wrote", MANIFEST_PATH)
    pages = render_contact_sheets(entries)
    print("contact sheets:", pages)
    print(f"species={len(entries)} frames={frames_bytes/1024/1024:.2f}MB atlases={atlas_png_bytes/1024/1024:.2f}MB")
    print("stage counts:", dict(stage_counts))
    return 0


if __name__ == "__main__":
    sys.exit(main())
