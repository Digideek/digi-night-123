#!/usr/bin/env python3
"""Build js/evolution-tree.js, docs/EVOLUTION.md and docs/evo-tree*.png
from official Digimon UP / encyclopedia relationships, restricted to
species we have sprites for. Does not wire anything into the live game.
"""
from __future__ import annotations

import json
import math
import re
import sys
from collections import defaultdict, deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/workspace/digimon-bullet-heaven")
MANIFEST_PATH = ROOT / "assets/sprites/up-manifest.json"
PROFILES_PATH = Path("/tmp/digimon-up-sprites/digimon.json")
FRAMES = ROOT / "assets/sprites/frames-up-all"
OUT_JS = ROOT / "js/evolution-tree.js"
OUT_MD = ROOT / "docs/EVOLUTION.md"
OUT_TREE = ROOT / "docs/evo-tree.png"
OUT_AGU = ROOT / "docs/evo-tree-agumon.png"
OUT_GAB = ROOT / "docs/evo-tree-gabumon.png"

ALIASES = {
    "demidevilmon": "demidevimon",
    "tri": "tanemon",
    "piccolomon": "piximon",
}

# Costume / event skins — assets only, not tree nodes.
SKINS = {
    "agumon_adventure", "biyomon_adventure", "gabumon_adventure",
    "gatomon_adventure", "gomamon_adventure", "veemon_adventure02",
    "wormmon_adventure02", "wargreymon_adventure", "metalgarurumon_adventure",
    "guilmon_tamers", "devimon_normal", "etemon_normal", "machinedramon_normal",
    "gekkomon_beatbreak", "gekkomon_runevent", "gekkomon_runevent_fever",
    "gekkomon_runevent_shadow",
}

STAGE_RANK = {
    "Baby I": 0,
    "Baby II": 1,
    "Rookie": 2,
    "Champion": 3,
    "Armor": 3,
    "Ultimate": 4,
    "Mega": 5,
    "Mega+": 6,
    "Unknown": 2,
}

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

PRIORITY = {
    "warp": 100,
    "armor": 90,
    "fusion": 80,
    "mode": 75,
    "dark": 70,
    "special": 60,
    "recover": 55,
    "standard": 50,
    "neglect": 35,
    "fallback": 20,
}

TERMINAL_STAGES = {"Mega", "Mega+", "Armor"}

# Classic "good care" next form when several official untagged options exist.
MAIN_NEXT = {
    "botamon": "koromon",
    "koromon": "agumon",
    "agumon": "greymon",
    "greymon": "metalgreymon",
    "metalgreymon": "wargreymon",
    "punimon": "tsunomon",
    "tsunomon": "gabumon",
    "gabumon": "garurumon",
    "garurumon": "weregarurumon",
    "weregarurumon": "metalgarurumon",
    "yuramon": "tanemon",
    "tanemon": "palmon",
    "palmon": "togemon",
    "togemon": "lillymon",
    "lillymon": "rosemon",
    "poyomon": "tokomon",
    "tokomon": "patamon",
    "patamon": "angemon",
    "angemon": "magnaangemon",
    "magnaangemon": "seraphimon",
    "nyokimon": "yokomon",
    "yokomon": "biyomon",
    "biyomon": "birdramon",
    "birdramon": "garudamon",
    "garudamon": "phoenixmon",
    "pichimon": "bukamon",
    "bukamon": "gomamon",
    "gomamon": "ikkakumon",
    "ikkakumon": "zudomon",
    "zudomon": "vikemon",
    "motimon": "tentomon",
    "tentomon": "kabuterimon",
    "kabuterimon": "megakabuterimon",
    "megakabuterimon": "herculeskabuterimon",
    "putimon": "cupimon",
    "cupimon": "patamon",
    "chibomon": "demiveemon",
    "demiveemon": "veemon",
    "veemon": "exveemon",
    "exveemon": "wingdramon",
    "wingdramon": "slayerdramon" if False else "imperialdramon_dragonmode",
    # wingdramon official next? we'll let data decide if slayerdramon missing; prefer imperial only from paildramon
    "paildramon": "imperialdramon_dragonmode",
    "imperialdramon_dragonmode": "imperialdramon_fightermode",
    "gigimon": "guilmon",
    "jyarimon": "gigimon",
    "guilmon": "growlmon",
    "growlmon": "wargrowlmon",
    "wargrowlmon": "gallantmon",
    "relemon": "viximon",
    "viximon": "renamon",
    "renamon": "kyubimon",
    "kyubimon": "taomon",
    "taomon": "sakuyamon",
    "zerimon": "gummymon",
    "gummymon": "terriermon",
    "terriermon": "gargomon",
    "gargomon": "rapidmon",
    "rapidmon": "megagargomon",
    "leafmon": "minomon",
    "minomon": "wormmon",
    "wormmon": "stingmon",
    "stingmon": "dinobeemon",
    "pururumon": "poromon",
    "poromon": "hawkmon",
    "hawkmon": "aquilamon",
    "aquilamon": "garudamon",
    "pabumon": "motimon",
    "pupumon": "tanemon",
    "yukimibotamon": "nyaromon",
    "nyaromon": "salamon",
    "salamon": "gatomon",
    "gatomon": "angewomon",
    "angewomon": "magnadramon",
    "kuramon": "tsumemon",
    "tsumemon": "keramon",
    "keramon": "vilemon",
    "vilemon": "infermon",
    "infermon": "diablomon",
    "diablomon": "armageddemon",
    "pagumon": "demidevimon",
    "demidevimon": "devimon",
    "devimon": "myotismon",
    "myotismon": "piedmon",
    "candlemon": "meramon",
    "meramon": "bluemeramon",
    "gotsumon": "monochromon",
    "hagurumon": "guardromon",
    "guardromon": "andromon",
    "andromon": "hiandromon",
    "solarmon": "guardromon",
    "choromon": "kapurimon" if False else "missimon",
    "missimon": "hagurumon",
    "cotsucomon": "kakkinmon",
    "kakkinmon": "gotsumon",
    "sakumon": "sakuttomon",
    "sakuttomon": "zubamon",
    "zubamon": "zubaeagermon",
    "zubaeagermon": "duramon",
    "duramon": "durandamon",
    "ludomon": "tialudomon",
    "tialudomon": "raijiludomon",
    "raijiludomon": "bryweludramon",
    "armadillomon": "ankiromon",
    "ankiromon": "meteormon",
    "lalamon": "sunflowmon",
    "sunflowmon": "lilamon",
    "lilamon": "rosemon",
    "budmon": "lalamon",
    "gekkomon": "gekomon",
    "gekomon": "shogungekomon",
    "shogungekomon": "vikemon",
    "espimon": "hoverespimon",
    "hoverespimon": "tankdramon",
    "hi-commandramon": "tankdramon",
    "tankdramon": "machinedramon",
    "ghostmon": "bakemon",
    "bakemon": "myotismon",
    "dracmon": "devimon",
    "gizamon": "gesomon",
    "seadramon": "megaseadramon",
    "megaseadramon": "metalseadramon",
    "aegiomon": "aegiochusmon",
    "aegiochusmon": "apollomon",
    "chiropmon_beatbreak": "devimon",
    "pristimon_beatbreak": "gladimon",
    "gladimon": "knightmon",
    "knightmon": "slashangemon",
    "murasamemon_beatbreak": "minervamon",
    "kimeramon": "armageddemon",
    "guardromon_gold": "andromon",
    "shoutmon_xroswars": "greymon",
    "numemon": "monzaemon",
    "raremon": "garbagemon",
    "garbagemon": "jijimon",
    "etemon": "jijimon",
    "digitamamon": "jijimon",
    "monzaemon": "jijimon",
    "piximon": "jijimon",
    "cherrymon": "rosemon",
    "jagamon": "rosemon",
}

# Existing in-game gates — must stay unchanged as the good-care / neglect / recover
# branches for the current two starter lines.
def _gate(level, food, joy, hp):
    return {"minLevel": level, "minFood": food, "minHappiness": joy, "minHpRatio": hp}

EXISTING_GATES = {
    ("botamon", "koromon"): ("standard", _gate(2, 2, 35, 0.3)),
    ("koromon", "agumon"): ("standard", _gate(4, 5, 45, 0.35)),
    ("punimon", "tsunomon"): ("standard", _gate(2, 2, 35, 0.3)),
    ("tsunomon", "gabumon"): ("standard", _gate(4, 5, 45, 0.35)),
    ("agumon", "greymon"): ("standard", _gate(8, 15, 55, 0.4)),
    ("agumon", "numemon"): ("neglect", {"minLevel": 8, "maxFood": 7, "maxHappiness": 25, "minHpRatio": 0}),
    ("greymon", "metalgreymon"): ("standard", _gate(15, 40, 65, 0.5)),
    ("metalgreymon", "wargreymon"): ("standard", _gate(22, 75, 75, 0.6)),
    ("gabumon", "garurumon"): ("standard", _gate(8, 15, 55, 0.4)),
    ("gabumon", "numemon"): ("neglect", {"minLevel": 8, "maxFood": 7, "maxHappiness": 25, "minHpRatio": 0}),
    ("garurumon", "weregarurumon"): ("standard", _gate(15, 40, 65, 0.5)),
    ("weregarurumon", "metalgarurumon"): ("standard", _gate(22, 75, 75, 0.6)),
    ("numemon", "greymon"): ("recover", _gate(10, 22, 70, 0.5)),
}

THRESH = {
    "standard": {
        0: _gate(2, 2, 35, 0.3),
        1: _gate(4, 5, 45, 0.35),
        2: _gate(8, 15, 55, 0.4),
        3: _gate(15, 40, 65, 0.5),
        4: _gate(22, 75, 75, 0.6),
        5: _gate(28, 100, 85, 0.7),
    },
    "fallback": {
        0: _gate(3, 1, 20, 0.15),
        1: _gate(5, 3, 25, 0.2),
        2: _gate(10, 10, 35, 0.25),
        3: _gate(16, 28, 40, 0.3),
        4: _gate(22, 50, 50, 0.4),
        5: _gate(26, 70, 60, 0.45),
    },
    "neglect": {
        0: {"minLevel": 3, "maxFood": 1, "maxHappiness": 20, "minHpRatio": 0},
        1: {"minLevel": 5, "maxFood": 3, "maxHappiness": 25, "minHpRatio": 0},
        2: {"minLevel": 8, "maxFood": 7, "maxHappiness": 25, "minHpRatio": 0},
        3: {"minLevel": 15, "maxFood": 20, "maxHappiness": 30, "minHpRatio": 0},
        4: {"minLevel": 20, "maxFood": 35, "maxHappiness": 35, "minHpRatio": 0},
        5: {"minLevel": 24, "maxFood": 50, "maxHappiness": 40, "minHpRatio": 0},
    },
}

# Extra canonical / documented links for species that had no digimon.json profile,
# or official priors whose mid-forms are missing from the sprite set.
EXTRA_LINKS = [
    ("salamon", "aegiomon", "special", "Elecmon (usual prior) has no UP sprite; Salamon is the closest Vaccine rookie in the set."),
    ("patamon", "aegiomon", "special", "Alternate Vaccine/Data holy rookie prior; Elecmon is missing."),
    ("aegiomon", "aegiochusmon", "standard", "Canonical Aegiomon line."),
    ("aegiochusmon", "apollomon", "fallback", "Canonical Mega is Jupitermon (no UP sprite). Apollomon is the closest Olympos XII Mega in the set."),
    ("taomon", "dianamon", "special", "Official Wikimon evolution; moon-aspect alternative to Sakuyamon."),
    ("lilamon", "minervamon", "special", "Official Wikimon evolution."),
    ("lillymon", "minervamon", "special", "Official Wikimon evolution."),
    ("ladydevimon", "minervamon", "special", "Official Wikimon evolution."),
    ("monzaemon", "minervamon", "special", "Official Wikimon evolution."),
    ("digitamamon", "minervamon", "special", "Official Wikimon evolution."),
    ("knightmon", "minervamon", "special", "Official Wikimon evolution."),
    ("myotismon", "malomyotismon", "special", "Adventure 02 Mega. VenomMyotismon has no UP sprite, so this is the available dark Mega."),
    ("infermon", "malomyotismon", "special", "Listed among official priors on Wikimon."),
    ("metalgreymon", "blackwargreymon", "dark", "Virus MetalGreymon dark Mega."),
    ("megadramon", "blackwargreymon", "dark", "Official prior form."),
    ("wargrowlmon", "blackwargreymon", "special", "Official prior form."),
    ("agumon", "blackwargreymon", "warp", "Official dark warp evolution."),
    ("veemon", "magnamon", "armor", "Digimental of Miracles (future shop item)."),
    ("guardromon_gold", "magnamon", "armor", "Official armor path."),
    ("solarmon", "guardromon_gold", "special", "Official prior form."),
    ("zubamon", "guardromon_gold", "special", "Official prior form."),
    ("shoutmon_xroswars", "guardromon_gold", "special", "Official prior form."),
    ("guardromon", "guardromon_gold", "special", "Gold subspecies."),
    ("guardromon_gold", "andromon", "standard", "Official next form."),
    ("guardromon_gold", "duramon", "special", "Official next form."),
    ("koromon", "shoutmon_xroswars", "special", "Official Xros Wars prior form."),
    ("gigimon", "shoutmon_xroswars", "special", "Official prior form."),
    ("tokomon", "shoutmon_xroswars", "special", "Official prior form."),
    ("shoutmon_xroswars", "greymon", "standard", "Official listed evolution."),
    ("shoutmon_xroswars", "growlmon", "special", "Official listed evolution (meat-heavy)."),
    ("gekkomon", "atratusmon_beatbreak", "warp", "Official Beat Break warp."),
    ("chiropmon_beatbreak", "devimon", "standard", "Official mid-forms (Night Chiropmon, Nosferamon) have no UP sprites; Devimon is the closest Virus bat/dark Adult."),
    ("chiropmon_beatbreak", "bakemon", "special", "Alternate dark Adult."),
    ("pristimon_beatbreak", "gladimon", "standard", "Official mid-forms (Wolvermon, Artiomon, Bearcatmon) have no UP sprites; Gladimon is the closest Vaccine warrior Adult."),
    ("pristimon_beatbreak", "leomon", "special", "Alternate Vaccine Adult."),
    ("madleomon", "murasamemon_beatbreak", "special", "Official prior Cougarmon has no UP sprite; MadLeomon is the closest Virus Beast Man Adult."),
    ("weregarurumon", "murasamemon_beatbreak", "special", "Beast Man alternate Perfect."),
    ("murasamemon_beatbreak", "minervamon", "standard", "Official Mega Habakirimon has no UP sprite; Minervamon is the closest Virus warrior Mega."),
    ("murasamemon_beatbreak", "heavyleomon", "special", "Alternate beast Mega."),
    ("greymon", "kimeramon", "special", "Composite Perfect. Unlocks after KOs of several attributes."),
    ("kuwagamon", "kimeramon", "special", "Official fusion component."),
    ("kabuterimon", "kimeramon", "special", "Official fusion component."),
    ("garurumon", "kimeramon", "special", "Official fusion component."),
    ("kimeramon", "armageddemon", "standard", "Official evolution."),
    ("kimeramon", "machinedramon", "dark", "Alternate dark Mega."),
    ("bluemeramon", "apollomon", "special", "Flaremon (canonical prior) has no UP sprite; BlueMeramon is the closest fire Perfect."),
    ("lavogaritamon", "apollomon", "special", "Alternate fire Perfect prior."),
]

MEAT_KEYS = ("tyranno", "flare", "meramon", "tusk", "monochrom", "growl", "lavorvo", "greymon", "birdra", "wargrowl", "flamedra", "darktyranno", "devidra", "gigadra", "megadra")
FISH_KEYS = ("seadra", "ikkaku", "geso", "shell", "frigi", "diver", "ebidra", "oct", "crab", "syako", "sango", "gomamon", "zudo", "megasea", "torto", "whale", "marin", "icemon", "polar")
BERRY_KEYS = ("togemon", "sunflow", "woodmon", "kiwimon", "palmon", "lilly", "lila", "unimon", "leomon", "mojya", "vegie", "yaki", "mushroom", "pumpkin", "cherry", "lalamon", "jaga", "hudiemon")
MEAT_TYPES = ("dragon", "dinosaur", "reptile", "flame", "fire", "dark dragon")
FISH_TYPES = ("sea", "aquatic", "ice", "water", "crustacean")
BERRY_TYPES = ("plant", "vegetation", "fairy", "holy", "beast", "nature")

NEGLECT_PREF = {
    0: ["pagumon", "tsumemon", "demimeramon", "tumblemon"],
    1: ["gazimon", "demidevimon", "gizamon", "mushroomon", "ghostmon", "kokatorimon"],
    2: ["numemon", "raremon", "roachmon", "bakemon", "redvegiemon"],
    3: ["garbagemon", "warumonzaemon", "raremon", "datamon"],
    4: ["jijimon", "piedmon", "machinedramon", "puppetmon", "warumonzaemon"],
    5: ["armageddemon", "apocalymon"],
}


def sid(name: str) -> str:
    return ALIASES.get(name, name)


def parse_evo(raw: str) -> dict | None:
    raw = raw.strip()
    if not raw:
        return None
    tag = None
    partner = None
    base = raw
    m = re.match(r"^([A-Za-z0-9_-]+)(?:\[([^\]]+)\])?(?:\(\+(.+)\))?$", raw)
    if m:
        base, tag, partner = m.group(1), m.group(2), m.group(3)
    else:
        # fusion-from style a+b
        if "+" in raw and "[" not in raw:
            parts = raw.split("+")
            base = parts[0]
            partner = "+".join(parts[1:])
            tag = "fusion"
    base = sid(base)
    kind = "plain"
    if tag == "mistake":
        kind = "neglect"
    elif tag == "dark":
        kind = "dark"
    elif tag == "warp":
        kind = "warp"
    elif tag == "armor":
        kind = "armor"
    elif tag == "mode":
        kind = "mode"
    elif tag == "fusion" or partner:
        kind = "fusion"
        if partner:
            # partners may be comma/plus separated
            partner = "+".join(sid(p.strip()) for p in re.split(r"[+,]", partner) if p.strip())
    return {"to": base, "kind": kind, "partner": partner, "raw": raw}


def cond_for(kind: str, stage: str) -> dict:
    rank = min(STAGE_RANK.get(stage, 2), 5)
    table = "standard"
    if kind == "fallback":
        table = "fallback"
    elif kind == "neglect":
        table = "neglect"
    c = dict(THRESH[table][rank])
    if kind == "dark":
        c = dict(THRESH["standard"][rank])
        c["minFood"] = max(0, c.get("minFood", 0) // 2)
        c.pop("minHappiness", None)
        c["maxHappiness"] = 45
        c["minFaints"] = 2
        c["minDesperationTime"] = 8
        c["minCareMistakes"] = 2
    elif kind == "warp":
        # Skip ahead: harder than a normal next-stage evo.
        c = dict(THRESH["standard"][min(rank + 2, 5)])
        c["minHappiness"] = max(c.get("minHappiness", 0), 90)
        c["minHpRatio"] = max(c.get("minHpRatio", 0), 0.7)
        c["minBossesBeaten"] = 1
    elif kind == "armor":
        c = dict(THRESH["standard"][2])
        c["minHappiness"] = 60
        c["minBossesBeaten"] = 1
        c["item"] = "digimental"
    elif kind == "fusion":
        c = dict(THRESH["standard"][rank])
        c["minHappiness"] = 70
    elif kind == "mode":
        c = {"minLevel": THRESH["standard"][rank]["minLevel"], "minHappiness": 70, "minHpRatio": 0.5}
    elif kind == "recover":
        c = dict(THRESH["standard"][rank])
        c["minHappiness"] = max(c.get("minHappiness", 0), 70)
    elif kind == "special":
        c = dict(THRESH["standard"][rank])
        c["minHappiness"] = max(20, c.get("minHappiness", 55) - 10)
    return c


def classify_food(name: str, typ: str) -> str | None:
    n = (name or "").lower().replace(" ", "")
    t = (typ or "").lower()
    if any(k in n for k in MEAT_KEYS) or any(k in t for k in MEAT_TYPES):
        return "meat"
    if any(k in n for k in FISH_KEYS) or any(k in t for k in FISH_TYPES):
        return "fish"
    if any(k in n for k in BERRY_KEYS) or any(k in t for k in BERRY_TYPES):
        return "berry"
    return None


def is_terminal(stage: str, branches_out: list | None = None) -> bool:
    if stage == "Mega+":
        return True
    if stage == "Mega":
        # Mega is terminal unless it has a mode / fusion / mega+ branch
        if not branches_out:
            return True
        return not any(b.get("kind") in ("mode", "fusion", "standard", "fallback", "special", "dark", "warp") for b in branches_out)
    if stage == "Armor":
        return not branches_out
    return False


def load() -> tuple[dict, dict]:
    manifest = json.loads(MANIFEST_PATH.read_text())
    profiles = {p["folder"]: p for p in json.loads(PROFILES_PATH.read_text())}
    # remap profile keys
    remapped = {}
    for k, p in profiles.items():
        remapped[sid(k)] = p
    return manifest, remapped


def build_species(manifest: dict, profiles: dict) -> dict:
    out = {}
    for sid_, e in manifest["species"].items():
        if sid_ in SKINS:
            continue
        stage = e["stage"]
        typ = e.get("type") or ""
        attr = e.get("attribute") or "None"
        if attr in ("None", ""):
            attr = "None"
        out[sid_] = {
            "id": sid_,
            "name": e["name"],
            "stage": stage,
            "stageDisplay": e["stageDisplay"],
            "attribute": attr,
            "type": typ,
            "idleFrames": e["idleFrames"],
            "walkFrames": e["walkFrames"],
            "nativeWidth": e["nativeWidth"],
            "nativeHeight": e["nativeHeight"],
            "stillOnly": bool(e.get("stillOnly")),
            "framesDir": e["framesDir"],
            "atlas": e.get("atlas"),
        }
    return out


def official_evos(profiles: dict, species: dict) -> dict:
    """folder/id -> list of parsed evos, remapped and clipped to tree species."""
    evos = defaultdict(list)
    for pid, p in profiles.items():
        src = sid(pid)
        if src in SKINS or src not in species:
            continue
        for raw in p.get("evolves_to") or []:
            parsed = parse_evo(raw)
            if not parsed:
                continue
            if parsed["to"] in SKINS or parsed["to"] not in species:
                continue
            evos[src].append(parsed)
    return evos


def pick_standard(src: str, plains: list[str], species: dict) -> str | None:
    if src in MAIN_NEXT and MAIN_NEXT[src] in plains:
        return MAIN_NEXT[src]
    if src in MAIN_NEXT and MAIN_NEXT[src] in species and MAIN_NEXT[src] != src:
        # even if not in official plains (extra species)
        if MAIN_NEXT[src] in plains:
            return MAIN_NEXT[src]
    if not plains:
        return None
    # Prefer exactly one stage up
    sr = STAGE_RANK.get(species[src]["stage"], 2)
    one_up = [t for t in plains if STAGE_RANK.get(species[t]["stage"], 99) == sr + 1
              or (species[src]["stage"] == "Rookie" and species[t]["stage"] == "Armor")
              or (species[src]["stage"] == "Mega" and species[t]["stage"] == "Mega+")]
    # If src is Armor, one-up is Ultimate/Mega
    if one_up:
        # prefer same attribute
        same = [t for t in one_up if species[t]["attribute"] == species[src]["attribute"]]
        return (same or one_up)[0]
    later = [t for t in plains if STAGE_RANK.get(species[t]["stage"], -1) > sr]
    return (later or plains)[0]


def pick_neglect(src: str, official: list[str], species: dict, standard: str | None) -> str | None:
    if official:
        # prefer numemon / raremon when present
        for pref in ("numemon", "raremon", "garbagemon", "warumonzaemon", "roachmon", "bakemon", "datamon"):
            if pref in official:
                return pref
        return official[0]
    rank = STAGE_RANK.get(species[src]["stage"], 2)
    for cand in NEGLECT_PREF.get(rank, []):
        if cand in species and cand != src:
            return cand
    return standard


def make_branch(to: str, kind: str, src_stage: str, extra_cond: dict | None = None, note: str = "", partner: str | None = None, existing_gate: bool = False) -> dict:
    cond = cond_for(kind, src_stage)
    if extra_cond:
        cond = {**cond, **extra_cond}
    if partner:
        cond = {**cond, "requiresPartner": partner}
    b = {
        "to": to,
        "kind": kind,
        "priority": PRIORITY[kind] + (2 if existing_gate else 0),
        "conditions": cond,
    }
    if note:
        b["note"] = note
    if partner:
        b["partner"] = partner
    if existing_gate:
        b["existingGate"] = True
    return b


def build_branches(species: dict, evos: dict) -> dict:
    branches: dict[str, list] = {k: [] for k in species}

    def has(src, to, kind=None):
        for b in branches[src]:
            if b["to"] == to and (kind is None or b["kind"] == kind):
                return True
        return False

    def add(src, branch, overwrite=False):
        # Don't add self-loops except mode
        if branch["to"] == src and branch["kind"] != "mode":
            return
        if branch["to"] not in species:
            return
        existing = [b for b in branches[src] if b["to"] == branch["to"] and b["kind"] == branch["kind"]]
        if existing:
            if overwrite:
                branches[src] = [b for b in branches[src] if not (b["to"] == branch["to"] and b["kind"] == branch["kind"])]
                branches[src].append(branch)
            return
        branches[src].append(branch)

    # Official relationships
    for src, listed in evos.items():
        plains, mistakes, others = [], [], []
        for e in listed:
            if e["kind"] == "plain":
                plains.append(e["to"])
            elif e["kind"] == "neglect":
                mistakes.append(e["to"])
            else:
                others.append(e)
        standard = pick_standard(src, plains, species)
        # ExVeemon: MAIN_NEXT wingdramon is official plain; Paildramon is fusion
        if src in MAIN_NEXT and MAIN_NEXT[src] in species:
            if MAIN_NEXT[src] in plains or not plains:
                standard = MAIN_NEXT[src]
        stage = species[src]["stage"]
        if standard:
            note = "Canonical good-care branch."
            extra = None
            key = (src, standard)
            if key in EXISTING_GATES:
                kind, extra = EXISTING_GATES[key]
                add(src, make_branch(standard, kind, stage, extra, "Existing in-game good-care gate, unchanged.", existing_gate=True), overwrite=True)
            else:
                add(src, make_branch(standard, "standard", stage, note=note))
            # other plains become special (food / encounter)
            for t in plains:
                if t == standard:
                    continue
                food = classify_food(species[t]["name"], species[t]["type"])
                cond = cond_for("special", stage)
                note = "Official untagged evolution."
                if food:
                    cond = {**cond, "mostFood": food}
                    note = f"Official branch favoured when {food} is the food eaten most."
                # A few encounter hints
                if species[t]["attribute"] != species[src]["attribute"] and species[t]["attribute"] not in ("None", "Free", "Unknown"):
                    # fighting the opposite attribute nudges this way
                    vs = {"Vaccine": "Virus", "Virus": "Vaccine", "Data": "Virus"}.get(species[src]["attribute"])
                    if vs:
                        cond = {**cond, "minKillsAttribute": {vs: 12}}
                add(src, make_branch(t, "special", stage, cond, note))
        for t in mistakes:
            key = (src, t)
            if key in EXISTING_GATES:
                kind, extra = EXISTING_GATES[key]
                add(src, make_branch(t, kind, stage, extra, "Existing in-game neglect gate, unchanged.", existing_gate=True), overwrite=True)
            else:
                add(src, make_branch(t, "neglect", stage, note="Official care-mistake evolution."))
        for e in others:
            key = (src, e["to"])
            if key in EXISTING_GATES:
                kind, extra = EXISTING_GATES[key]
                add(src, make_branch(e["to"], kind, stage, extra, "Existing in-game gate, unchanged.", existing_gate=True), overwrite=True)
                continue
            note = f"Official {e['kind']} evolution."
            extra = None
            if e["kind"] == "special":
                extra = cond_for("special", stage)
            add(src, make_branch(e["to"], e["kind"], stage, extra, note, partner=e.get("partner")))

    # Extra documented links
    for src, to, kind, note in EXTRA_LINKS:
        if src not in species or to not in species:
            continue
        stage = species[src]["stage"]
        extra = None
        if kind == "special" and to == "kimeramon":
            extra = {**cond_for("special", stage), "minKillsAttribute": {"Vaccine": 8, "Data": 8, "Virus": 8}}
        if kind == "special" and to == "shoutmon_xroswars":
            extra = {**cond_for("special", stage), "mostFood": "meat"}
        if kind == "special" and to == "growlmon":
            extra = {**cond_for("special", stage), "mostFood": "meat"}
        if src == "agumon" and to == "blackwargreymon" and kind == "warp":
            extra = {**cond_for("warp", stage), "minFaints": 1, "minDesperationTime": 6}
        add(src, make_branch(to, kind, stage, extra, note))

    # Existing gates that might not have been in official lists (numemon → greymon recover)
    for (src, to), (kind, extra) in EXISTING_GATES.items():
        if src in species and to in species:
            add(src, make_branch(to, kind, species[src]["stage"], extra, "Existing in-game gate, unchanged.", existing_gate=True), overwrite=True)

    # Guarantee default + fallback + neglect for every non-terminal
    for src, rec in species.items():
        stage = rec["stage"]
        outgoing = branches[src]
        # Armor with no further evos is a valid terminal (Magnamon, Flamedramon may be terminal)
        if stage in ("Mega+",):
            continue
        # Mega is terminal unless it already has a mode/fusion onward
        onward = [b for b in outgoing if b["kind"] not in ("fusion",) or True]
        has_onward = [b for b in outgoing if b["to"] != src]
        if stage == "Mega" and not any(b["kind"] in ("mode", "standard", "fallback", "special", "dark", "warp", "fusion") for b in has_onward):
            continue
        if stage == "Armor" and not any(b["kind"] in ("standard", "fallback", "mode", "special", "warp") for b in has_onward):
            # still add neglect? Armor terminals don't need branches
            continue

        if stage in ("Mega", "Mega+") and not has_onward:
            continue

        standards = [b for b in outgoing if b["kind"] == "standard"]
        # If only specials exist, promote MAIN_NEXT or first special to standard
        if not standards:
            plains_like = [b for b in outgoing if b["kind"] in ("special", "fallback", "recover")]
            target = None
            if src in MAIN_NEXT and MAIN_NEXT[src] in species:
                target = MAIN_NEXT[src]
            elif plains_like:
                target = plains_like[0]["to"]
            elif has_onward:
                target = has_onward[0]["to"]
            if target:
                add(src, make_branch(target, "standard", stage, note="Default good-care branch (promoted so the line does not stall)."), overwrite=False)
                standards = [b for b in branches[src] if b["kind"] == "standard"]

        # Fallback to the same target as standard
        if standards and not any(b["kind"] == "fallback" for b in branches[src]):
            add(src, make_branch(standards[0]["to"], "fallback", stage, note="Looser gates so mid-care still evolves into the default form."))

        # Neglect
        if not any(b["kind"] == "neglect" for b in branches[src]):
            official_m = [b["to"] for b in branches[src] if b["kind"] == "neglect"]
            std = standards[0]["to"] if standards else None
            target = pick_neglect(src, official_m, species, std)
            if target:
                add(src, make_branch(target, "neglect", stage, note="Neglect / care-mistake branch."))

        # If this is a baby/child/adult/perfect and still has no standard, it's a problem we'll report.

    # Sort each list by priority desc, then name
    for src in branches:
        branches[src].sort(key=lambda b: (-b["priority"], b["to"]))
    return branches


def enemy_pool(species: dict) -> dict:
    """Role table by stage, keeping the current four roles stable."""
    existing = {
        "pagumon": {"role": "swarm", "note": "Current early swarm; unchanged."},
        "gazimon": {"role": "bruiser", "note": "Current mid bruiser; unchanged."},
        "demidevimon": {"role": "fast", "note": "Current fast flyer; unchanged."},
        "kuwagamon": {"role": "boss", "note": "Current rotating boss; unchanged."},
    }
    role_for_stage = {
        "Baby I": "swarm",
        "Baby II": "swarm",
        "Rookie": "swarm",
        "Champion": "bruiser",
        "Ultimate": "elite",
        "Mega": "boss",
        "Mega+": "boss",
        "Armor": "elite",
    }
    # A few named role tweaks
    fast_types = ("bird", "insect", "wind", "mammal", "fairy", "holy")
    bruiser_types = ("dragon", "dinosaur", "beast", "machine", "cyborg", "rock")
    pool = defaultdict(list)
    for sid_, rec in sorted(species.items(), key=lambda kv: (STAGE_RANK.get(kv[1]["stage"], 9), kv[1]["name"])):
        stage = rec["stage"]
        display = rec["stageDisplay"]
        if sid_ in existing:
            entry = {"id": sid_, "name": rec["name"], "attribute": rec["attribute"], **existing[sid_]}
            pool[display].append(entry)
            continue
        role = role_for_stage.get(stage, "bruiser")
        typ = (rec["type"] or "").lower()
        if stage == "Rookie" and any(k in typ for k in bruiser_types):
            role = "bruiser"
        if stage in ("Rookie", "Champion") and any(k in typ for k in fast_types):
            role = "fast"
        if stage == "Champion" and rec["attribute"] == "Virus" and "demon" in typ:
            role = "elite"
        entry = {"id": sid_, "name": rec["name"], "attribute": rec["attribute"], "role": role}
        pool[display].append(entry)
    return dict(pool)


def write_js(species: dict, branches: dict, enemies: dict, manifest: dict) -> None:
    payload = {
        "version": 1,
        "title": "Digimon UP branching evolution tree (data only, not wired into the live game)",
        "priority": PRIORITY,
        "priorityOrder": [
            "warp", "armor", "fusion", "mode", "dark", "special",
            "recover", "standard", "neglect", "fallback",
        ],
        "priorityNote": (
            "When several branches qualify, the highest priority wins. "
            "Neglect uses max-food / max-joy caps so it does not overlap a passing good-care check. "
            "Fallback has the loosest minimums and the lowest priority, so mid-care still evolves into the default form."
        ),
        "existingGatesPreserved": [
            {"from": a, "to": b, "kind": k, "conditions": c}
            for (a, b), (k, c) in EXISTING_GATES.items()
        ],
        "idAliases": ALIASES,
        "stageDisplay": STAGE_DISPLAY,
        "species": species,
        "branches": branches,
        "enemies": enemies,
        "payloadHint": manifest.get("payload"),
    }
    data_json = json.dumps(payload, indent=2)
    js = f"""/* Digimon UP branching evolution tree.
 * Standalone data module. Does not depend on game.js or data.js.
 * Not wired into the live game — merge later.
 *
 * Usage (browser): window.EVO_TREE
 * Usage (node):    const {{ EVO_TREE }} = require('./evolution-tree.js');
 */
(function (global) {{
  "use strict";

  var DATA = {data_json};

  function mostFood(foodCounts) {{
    if (!foodCounts) return null;
    var best = null, bestN = 0;
    for (var k in foodCounts) {{
      if (Object.prototype.hasOwnProperty.call(foodCounts, k) && foodCounts[k] > bestN) {{
        best = k;
        bestN = foodCounts[k];
      }}
    }}
    return best;
  }}

  function conditionsMet(cond, stats) {{
    if (!cond) return true;
    stats = stats || {{}};
    function has(n) {{ return cond[n] != null; }}
    if (has("minLevel") && (stats.level || 0) < cond.minLevel) return false;
    if (has("maxLevel") && (stats.level || 0) > cond.maxLevel) return false;
    if (has("minFood") && (stats.meals || 0) < cond.minFood) return false;
    if (has("maxFood") && (stats.meals || 0) > cond.maxFood) return false;
    if (has("minHappiness") && (stats.joy == null ? (stats.happiness || 0) : stats.joy) < cond.minHappiness) return false;
    if (has("maxHappiness") && (stats.joy == null ? (stats.happiness || 0) : stats.joy) > cond.maxHappiness) return false;
    if (has("minHpRatio") && (stats.hpRatio == null ? 1 : stats.hpRatio) < cond.minHpRatio) return false;
    if (has("maxHpRatio") && (stats.hpRatio == null ? 1 : stats.hpRatio) > cond.maxHpRatio) return false;
    if (has("minCareMistakes") && (stats.careMistakes || 0) < cond.minCareMistakes) return false;
    if (has("maxCareMistakes") && (stats.careMistakes || 0) > cond.maxCareMistakes) return false;
    if (has("minFaints") && (stats.faints || 0) < cond.minFaints) return false;
    if (has("maxFaints") && (stats.faints || 0) > cond.maxFaints) return false;
    if (has("minDesperationTime") && (stats.desperationTime || 0) < cond.minDesperationTime) return false;
    if (has("minBossesBeaten") && (stats.bossesBeaten || 0) < cond.minBossesBeaten) return false;
    if (cond.mostFood) {{
      var mf = stats.mostFood || mostFood(stats.foodCounts);
      if (mf !== cond.mostFood) return false;
    }}
    if (cond.minKillsAttribute) {{
      var ka = stats.killsAttribute || {{}};
      for (var attr in cond.minKillsAttribute) {{
        if ((ka[attr] || 0) < cond.minKillsAttribute[attr]) return false;
      }}
    }}
    if (cond.minKillsSpecies) {{
      var ks = stats.killsSpecies || {{}};
      for (var sp in cond.minKillsSpecies) {{
        if ((ks[sp] || 0) < cond.minKillsSpecies[sp]) return false;
      }}
    }}
    if (cond.requiresPartner) {{
      var have = stats.partners || stats.partnerId || [];
      if (typeof have === "string") have = [have];
      var needed = String(cond.requiresPartner).split("+");
      for (var i = 0; i < needed.length; i++) {{
        if (have.indexOf(needed[i]) === -1) return false;
      }}
    }}
    if (cond.item) {{
      var items = stats.items || [];
      if (items.indexOf(cond.item) === -1) return false;
    }}
    return true;
  }}

  function pickEvolution(fromId, stats) {{
    var list = (DATA.branches[fromId] || []).slice();
    list.sort(function (a, b) {{
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (!!b.existingGate !== !!a.existingGate) return a.existingGate ? -1 : 1;
      return String(a.to).localeCompare(String(b.to));
    }});
    var matched = [];
    for (var i = 0; i < list.length; i++) {{
      if (conditionsMet(list[i].conditions, stats)) matched.push(list[i]);
    }}
    return matched.length ? matched[0] : null;
  }}

  var EVO_TREE = {{
    version: DATA.version,
    priority: DATA.priority,
    priorityOrder: DATA.priorityOrder,
    species: DATA.species,
    branches: DATA.branches,
    enemies: DATA.enemies,
    existingGatesPreserved: DATA.existingGatesPreserved,
    idAliases: DATA.idAliases,
    stageDisplay: DATA.stageDisplay,
    payloadHint: DATA.payloadHint,
    conditionsMet: conditionsMet,
    pickEvolution: pickEvolution,
    mostFood: mostFood
  }};

  if (typeof module !== "undefined" && module.exports) {{
    module.exports = EVO_TREE;
    module.exports.EVO_TREE = EVO_TREE;
  }}
  global.EVO_TREE = EVO_TREE;
}})(typeof window !== "undefined" ? window : globalThis);
"""
    OUT_JS.parent.mkdir(parents=True, exist_ok=True)
    OUT_JS.write_text(js)
    print("wrote", OUT_JS, "bytes", OUT_JS.stat().st_size)


def interesting_branches(species: dict, branches: dict, root: str, depth_limit=6) -> list[str]:
    lines = []
    seen = set()

    def walk(src, prefix, depth):
        if depth > depth_limit or src in seen:
            return
        seen.add(src)
        outs = branches.get(src) or []
        # skip fallback clones in the highlight list except when they are the only path
        show = [b for b in outs if b["kind"] != "fallback"]
        for b in show:
            dest = species.get(b["to"], {"name": b["to"], "stageDisplay": "?"})
            srcn = species[src]["name"]
            cond = b["conditions"]
            bits = []
            for k in ("minLevel", "minFood", "minHappiness", "minHpRatio", "maxFood", "maxHappiness",
                      "mostFood", "minFaints", "minDesperationTime", "minBossesBeaten", "requiresPartner", "item"):
                if k in cond and cond[k] is not None:
                    bits.append(f"{k}={cond[k]}")
            note = f" — {b['note']}" if b.get("note") else ""
            lines.append(f"- {srcn} → {dest['name']} ({b['kind']}, {dest['stageDisplay']}): {', '.join(bits)}{note}")
            if b["kind"] in ("standard", "recover", "mode") or (b["kind"] == "special" and depth < 2):
                walk(b["to"], prefix, depth + 1)

    walk(root, "", 0)
    return lines


def write_md(species: dict, branches: dict, enemies: dict, manifest: dict, issues: list[str]) -> None:
    stage_counts = defaultdict(int)
    for rec in species.values():
        stage_counts[rec["stageDisplay"]] += 1
    n_branch = sum(len(v) for v in branches.values())
    preserved = "\n".join(
        f"- `{a}` → `{b}` ({k}): {c}" for (a, b), (k, c) in EXISTING_GATES.items()
    )
    agu = "\n".join(interesting_branches(species, branches, "botamon")[:40])
    gab = "\n".join(interesting_branches(species, branches, "punimon")[:40])

    md = f"""# Branching evolution tree (data only)

This is the design for a full branching evolution tree over the Digimon UP
roster. It is **not wired into the live game**. The module lives at
`js/evolution-tree.js` as `window.EVO_TREE` (also `require`-able from Node).
`js/data.js`, `js/game.js`, `index.html` and the CSS were left untouched so
the egg-hatch work can merge cleanly.

## Roster

- **{len(species)}** species in the tree (costume / event skins are in the
  asset pack but are not separate evolution nodes).
- **{n_branch}** directed branches.
- Stage mix (tree nodes): {', '.join(f'{k}: {v}' for k, v in sorted(stage_counts.items()))}.
- Sprites and payload figures: `assets/sprites/up-manifest.json` and
  `assets/sprites/SOURCES-up-all.md`.

## How a branch is chosen

Every non-terminal species has at least:

1. A **standard** (good-care / default) branch.
2. A **fallback** branch, almost always to the same form, with looser
   minimums so mid-care still evolves instead of stalling.
3. A **neglect** branch (Numemon / Raremon / Garbagemon / WaruMonzaemon /
   official care-mistake forms).

Plus any official warp, armor, dark, food, encounter, mode, recover, or
jogress (fusion) branches.

When several branches qualify at once, **highest priority wins**:

| Priority | Kind | Typical trigger |
| ---: | --- | --- |
| 100 | warp | Excellent care, high level, at least one boss — skips a stage |
| 90 | armor | Digimental (future shop item) plus a boss beaten |
| 80 | fusion | Jogress; requires a listed partner to be present |
| 75 | mode | Mode change (Imperialdramon, Sistermon, Diaboromon → Armageddemon) |
| 70 | dark | Faints, desperation-mode time, care mistakes, low-ish joy |
| 60 | special | Food type eaten most (meat / fish / berries), or encounter totals (KOs by attribute or species, bosses) |
| 55 | recover | Climbing back from a neglect form (e.g. Numemon → Greymon) |
| 50 | standard | The good-care default, including the current in-game gates |
| 35 | neglect | Max meal / joy caps, so it cannot fire on a passing good-care check |
| 20 | fallback | Loosest minimums; only wins when nothing else qualified |

`EVO_TREE.pickEvolution(fromId, stats)` implements this. `stats` may include
`level`, `meals`, `joy` (or `happiness`), `hpRatio`, `careMistakes`,
`foodCounts` / `mostFood`, `killsAttribute`, `killsSpecies`, `bossesBeaten`,
`faints`, `desperationTime`, `partners` / `partnerId`, and `items`.

## Existing gates, unchanged

These are the current Agumon / Gabumon / Numemon gates, copied exactly so a
later merge does not change present balance:

{preserved}

Numemon still has its official Perfect paths (Monzaemon, Etemon, Digitamamon,
Garbagemon, WaruMonzaemon) **in addition to** the existing recover-to-Greymon
branch.

## Sources

Official `evolves_from` / `evolves_to` lists come from
[dannyphang/digimon-up-sprites](https://github.com/dannyphang/digimon-up-sprites)
`digimon.json` (Digimon Encyclopedia wording), which already tags
`[mistake]`, `[dark]`, `[warp]`, `[armor]`, `[mode]`, and jogress
(`paildramon(+stingmon)`). Links were restricted to species that have frames
in `assets/sprites/frames-up-all/`.

Aliases: `demidevilmon` → `demidevimon`, `tri` → `tanemon`,
`piccolomon` → `piximon`.

Species that had no encyclopedia profile (Olympos XII Megas, Beat Break
mons, Shoutmon, Magnamon, Kimeramon, BlackWarGreymon, Guardromon (Gold),
MaloMyotismon, Jijimon) were wired from Wikimon, and only to other species
in this sprite set. Substitutions for missing mid-forms or Megas are noted
on the branch (`note` field) and in `SOURCES-up-all.md`.

Intentional cycles that the validator allows:

- Recover loops such as Agumon ⇄ Numemon ⇄ Greymon.
- Mode changes: Sistermon Ciel ⇄ Noir, Imperialdramon Dragon ⇄ Fighter,
  Diaboromon → Armageddemon.

Jogress branches are listed but will not fire in a solo run until a partner
system exists; every jogress species also has a solo default.

## Enemy pool

`EVO_TREE.enemies` groups every tree species by stage and assigns a role
(`swarm`, `fast`, `bruiser`, `elite`, `boss`). The current four — Pagumon
(swarm), Gazimon (bruiser), DemiDevimon (fast), Kuwagamon (boss) — keep those
roles. Baby I forms are listed but should stay rare or unused as enemies.
Lazy-load atlases for the current wave’s species plus the player’s line.

## Agumon egg (Botamon) — interesting branches

{agu}

## Gabumon egg (Punimon) — interesting branches

{gab}

## Validation

Run `node scripts/validate-evo.js`. It checks that every referenced species
has frames, that non-terminals are not dead ends, that every Baby I and
Baby II can reach a Mega / Mega+, and that the only cycles are the
intentional recover / mode ones.

## Wiring later (not done now)

Load `js/evolution-tree.js` after `js/data.js`, prefer `EVO_TREE.branches`
for any species in the tree, and keep the current `SPECIES[*].evolutions`
gates as the override for the live 16. Lazy-load `atlases-up-all/<id>.png`
by the starter egg line, any branch the run has reached, and the current
enemy wave.
"""
    if issues:
        md += "\n## Generator notes\n\n" + "\n".join(f"- {i}" for i in issues) + "\n"
    OUT_MD.parent.mkdir(parents=True, exist_ok=True)
    OUT_MD.write_text(md)
    print("wrote", OUT_MD)


def sprite_thumb(sid_: str, box: int) -> Image.Image:
    canvas = Image.new("RGBA", (box, box), (0, 0, 0, 0))
    path = FRAMES / sid_ / "idle_0.png"
    if not path.exists():
        return canvas
    im = Image.open(path).convert("RGBA")
    sw, sh = im.size
    scale = min((box - 4) / max(1, sw), (box - 4) / max(1, sh), 3.0)
    nw, nh = max(1, int(sw * scale)), max(1, int(sh * scale))
    im = im.resize((nw, nh), Image.Resampling.NEAREST)
    canvas.paste(im, ((box - nw) // 2, box - nh - 1), im)
    return canvas


def layout_and_draw(species: dict, branches: dict, roots: list[str] | None, out_path: Path, title: str, kinds_ok=None) -> None:
    """Column layout by stage, rows clustered around a primary predecessor."""
    if roots:
        # Include everything reachable either direction along included kinds? Forward from roots.
        inc = set(roots)
        q = deque(roots)
        while q:
            s = q.popleft()
            for b in branches.get(s, []):
                if kinds_ok and b["kind"] not in kinds_ok:
                    continue
                if b["to"] not in inc and b["to"] in species:
                    inc.add(b["to"])
                    q.append(b["to"])
        nodes = {k: v for k, v in species.items() if k in inc}
    else:
        nodes = dict(species)

    cols_order = ["Baby I", "Baby II", "Rookie", "Champion", "Armor", "Ultimate", "Mega", "Mega+"]
    # Armor shares a column visually to the right of Champion — keep separate
    groups = {c: [] for c in cols_order}
    for sid_, rec in nodes.items():
        st = rec["stage"]
        if st == "Unknown":
            st = "Rookie"
        groups.setdefault(st, []).append(sid_)

    # Sort each column by a "family key": walk standard edges backwards to a Baby I
    def family_key(sid_):
        seen = set()
        cur = sid_
        for _ in range(8):
            if cur in seen:
                break
            seen.add(cur)
            preds = []
            for src, bl in branches.items():
                if src not in nodes:
                    continue
                for b in bl:
                    if b["to"] == cur and b["kind"] in ("standard", "fallback", "recover"):
                        preds.append(src)
            if not preds:
                break
            # prefer lower stage
            preds.sort(key=lambda p: STAGE_RANK.get(nodes.get(p, species.get(p, {})).get("stage", "Rookie"), 9))
            nxt = preds[0]
            if STAGE_RANK.get(nodes.get(nxt, {}).get("stage", "Rookie"), 9) >= STAGE_RANK.get(nodes.get(cur, {}).get("stage", "Rookie"), 9):
                break
            cur = nxt
        return (species.get(cur, nodes.get(cur, {})).get("name", cur), species[sid_]["name"] if sid_ in species else sid_)

    for c in groups:
        groups[c].sort(key=family_key)

    col_w, row_h = 170, 92
    spr = 56
    header = 52
    footer = 24
    n_cols = len(cols_order)
    max_rows = max((len(groups[c]) for c in cols_order), default=1)
    width = 20 + n_cols * col_w
    height = header + max_rows * row_h + footer
    img = Image.new("RGBA", (width, height), (14, 16, 24, 255))
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
        font_b = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
        font_s = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 9)
    except OSError:
        font = font_b = font_s = ImageFont.load_default()

    draw.text((16, 12), title, fill=(240, 236, 220, 255), font=font_b)
    pos = {}
    for ci, c in enumerate(cols_order):
        x = 10 + ci * col_w + col_w // 2
        draw.text((x - 40, 32), STAGE_DISPLAY.get(c, c), fill=(180, 190, 210, 255), font=font_s)
        for ri, sid_ in enumerate(groups[c]):
            cx = 10 + ci * col_w + col_w // 2
            cy = header + ri * row_h + row_h // 2
            pos[sid_] = (cx, cy)

    kind_color = {
        "standard": (232, 176, 64, 200),
        "fallback": (120, 124, 140, 90),
        "neglect": (160, 96, 200, 180),
        "dark": (200, 64, 64, 180),
        "warp": (80, 200, 220, 200),
        "armor": (220, 180, 80, 200),
        "special": (80, 180, 110, 160),
        "recover": (230, 120, 160, 200),
        "mode": (240, 240, 240, 200),
        "fusion": (80, 140, 230, 160),
    }

    # Edges under nodes
    for src, bl in branches.items():
        if src not in pos:
            continue
        for b in bl:
            if b["to"] not in pos:
                continue
            if kinds_ok and b["kind"] not in kinds_ok and b["kind"] != "standard":
                # still draw standard always if kinds_ok set? handled above
                if b["kind"] not in (kinds_ok or []):
                    continue
            x1, y1 = pos[src]
            x2, y2 = pos[b["to"]]
            color = kind_color.get(b["kind"], (180, 180, 180, 140))
            # skip most fallback edges on the full tree to reduce clutter
            if not roots and b["kind"] == "fallback":
                continue
            draw.line((x1 + 28, y1, x2 - 28, y2), fill=color, width=2 if b["kind"] == "standard" else 1)

    # Nodes
    for sid_, (cx, cy) in pos.items():
        rec = nodes[sid_]
        box = (cx - 36, cy - 34, cx + 36, cy + 26)
        draw.rounded_rectangle(box, 8, fill=(28, 32, 44, 255), outline=(60, 66, 84, 255))
        thumb = sprite_thumb(sid_, spr)
        img.paste(thumb, (cx - spr // 2, cy - 32), thumb)
        label = rec["name"]
        if len(label) > 16:
            label = label[:15] + "…"
        tw = draw.textlength(label, font=font_s)
        draw.text((cx - tw / 2, cy + 26), label, fill=(220, 216, 200, 255), font=font_s)

    # Legend
    lx = 16
    ly = height - 18
    # actually put legend in header right
    lx = width - 520
    ly = 8
    for i, (k, col) in enumerate(kind_color.items()):
        x = lx + (i % 5) * 100
        y = ly + (i // 5) * 14
        draw.rectangle((x, y + 3, x + 12, y + 11), fill=col)
        draw.text((x + 16, y), k, fill=(200, 200, 210, 255), font=font_s)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, format="PNG", optimize=True)
    print("wrote", out_path, img.size)


def main() -> int:
    manifest, profiles = load()
    species = build_species(manifest, profiles)
    evos = official_evos(profiles, species)
    branches = build_branches(species, evos)

    issues = []
    # Light self-check (the Node validator is authoritative)
    for src, rec in species.items():
        outs = branches[src]
        stage = rec["stage"]
        if stage in ("Mega+",):
            continue
        if stage == "Mega" and not any(b["kind"] in ("mode", "fusion", "standard") for b in outs):
            continue
        if stage == "Armor" and not outs:
            continue
        kinds = {b["kind"] for b in outs}
        if stage not in ("Mega", "Mega+", "Armor") or (stage == "Armor" and outs and any(b["kind"] in ("standard", "special") for b in outs)):
            if stage not in ("Mega", "Mega+") and "standard" not in kinds and "fallback" not in kinds:
                issues.append(f"{src} ({stage}) has no standard/fallback branch")
            if stage not in ("Mega", "Mega+", "Armor") and "neglect" not in kinds:
                issues.append(f"{src} ({stage}) has no neglect branch")

    enemies = enemy_pool(species)
    write_js(species, branches, enemies, manifest)
    write_md(species, branches, enemies, manifest, issues)

    # Full tree: primary kinds (skip fallback clutter)
    layout_and_draw(
        species, branches, None, OUT_TREE,
        f"Digimon UP evolution tree  —  {len(species)} species  (fallback edges hidden)",
        kinds_ok={"standard", "neglect", "dark", "warp", "armor", "recover", "mode", "special", "fusion"},
    )
    layout_and_draw(
        species, branches, ["botamon", "digitama_agumon"] if "botamon" in species else ["agumon"],
        OUT_AGU,
        "Agumon egg line (from Botamon) — all branch kinds",
        kinds_ok=None,
    )
    layout_and_draw(
        species, branches, ["punimon"],
        OUT_GAB,
        "Gabumon egg line (from Punimon) — all branch kinds",
        kinds_ok=None,
    )
    print("species in tree", len(species), "issues", len(issues))
    for i in issues[:30]:
        print(" ", i)
    return 0


if __name__ == "__main__":
    sys.exit(main())
