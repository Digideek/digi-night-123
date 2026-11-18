# Digimon UP full-roster sprite sources

This folder set is an unofficial, non-commercial fan archive for Isaac’s private
Digimon bullet-heaven project. **Digimon** and all related character designs,
names, and official sprites are the property of **Bandai Namco Entertainment Inc.**,
**Toei Animation Co., Ltd.**, and their licensors. Nothing here is for sale.

This document covers the **full Digimon UP roster** under `frames-up-all/` and
`atlases-up-all/`. Credits for the original 16-species in-game set, the Digimon
World 3 tamers, and older Story / World DS fallbacks remain in
`assets/sprites/SOURCES.md`.

## What was collected

Every species with official **Digimon UP** idle and walk animations in the
community bake at [dannyphang/digimon-up-sprites](https://github.com/dannyphang/digimon-up-sprites)
(commit `4eaee71cc949953e45ce5a77564469ba93e36907`, 2026-11-03). That archive
renders the game’s own animations to PNG frames at 16 fps (`idle` and `walking`;
the archive also has `attack` and `faint`, which are not copied here).

- **280** baked species (including costume and event variants such as
  `agumon_adventure` and `gekkomon_runevent_fever`).
- **1** gap fill: **Jijimon**, which has a profile and is a canonical Mega for
  several Ultimate forms (Etemon, Monzaemon, Digitamamon, Garbagemon, Piximon,
  etc.) but had no bake in the archive. The Wikimon still
  [Jijimon_up.png](https://wikimon.net/File:Jijimon_up.png) (uploader **Garmmon**,
  65×69) is used as a static idle and walk. Archived at
  `raw/wikimon-up/Jijimon_up.png`.

The in-game folder `demidevilmon` is stored here as `demidevimon` to match the
existing roster (DemiDevimon / Picodevimon). `tri` in the profile database is
an alias of **Tanemon**; `piccolomon` is an alias of **Piximon**. Those aliases
are recorded in `up-manifest.json`.

## How the frames were trimmed

The same rule as the current 16-species set:

- Load every official `idle` and `walking` frame (they share one canvas).
- Take the union bounding box of non-transparent pixels.
- Add 1px of padding, clamped to the source canvas.
- Write `idle_0.png` … and `walk_0.png` … into `frames-up-all/<species-id>/`.

The already-approved trims for the current 16 (Agumon, Greymon, MetalGreymon,
WarGreymon, Numemon, Gabumon, Garurumon, MetalGarurumon, WereGarurumon,
Pagumon, DemiDevimon, Kuwagamon, Botamon, Koromon, Tsunomon, Punimon, Gazimon)
were **copied byte-for-byte** from `assets/sprites/frames/` so a later merge
cannot drift.

Per-species sprite sheets (PNG atlas + JSON) live in `atlases-up-all/`. Use
those at runtime and lazy-load by evolution line; the loose frames are the
source of truth and match the existing loader layout.

Playback is **16 frames a second**, matching the source bake.

## Names, stages, attributes

English display names, stages, attributes, types, and the official
`evolves_from` / `evolves_to` lists come from `digimon.json` in the same
repository, which quotes the official Digimon Encyclopedia at
[digimon.net](https://digimon.net/reference_en/).

Stages are shown with Wikimon’s dual names in the manifest and the evolution
tree (for example Child (Rookie), Adult (Champion), Perfect (Ultimate),
Ultimate (Mega)).

Thirty-two baked folders had no profile in `digimon.json`. Costume and event
variants inherit the base species’ profile. Distinct species were filled from
Wikimon (level / attribute / type, plus evolution notes used in
`docs/EVOLUTION.md`):

| id | Display name | Wikimon | Stage (Wikimon) | Attribute |
| --- | --- | --- | --- | --- |
| aegiomon | Aegiomon | [Aegiomon](https://wikimon.net/Aegiomon) | Adult (Champion) | Vaccine |
| aegiochusmon | Aegiochusmon | [Aegiochusmon](https://wikimon.net/Aegiochusmon) | Perfect (Ultimate) | Vaccine |
| apollomon | Apollomon | [Apollomon](https://wikimon.net/Apollomon) | Ultimate (Mega) | Vaccine |
| dianamon | Dianamon | [Dianamon](https://wikimon.net/Dianamon) | Ultimate (Mega) | Data |
| minervamon | Minervamon | [Minervamon](https://wikimon.net/Minervamon) | Ultimate (Mega) | Virus |
| blackwargreymon | BlackWarGreymon | [BlackWarGreymon](https://wikimon.net/BlackWarGreymon) | Ultimate (Mega) | Virus |
| kimeramon | Kimeramon | [Kimeramon](https://wikimon.net/Kimeramon) (Chimairamon) | Perfect (Ultimate) | Data |
| magnamon | Magnamon | [Magnamon](https://wikimon.net/Magnamon) | Armor | Free |
| malomyotismon | MaloMyotismon | [MaloMyotismon](https://wikimon.net/MaloMyotismon) (Belial Vamdemon) | Ultimate (Mega) | Virus |
| shoutmon_xroswars | Shoutmon | [Shoutmon](https://wikimon.net/Shoutmon) | Child (Rookie) | Data |
| guardromon_gold | Guardromon (Gold) | [Guardromon (Gold)](https://wikimon.net/Guardromon_(Gold)) | Adult (Champion) | Free |
| chiropmon_beatbreak | Chiropmon | [Chiropmon](https://wikimon.net/Chiropmon) | Child (Rookie) | Virus |
| pristimon_beatbreak | Pristimon | [Pristimon](https://wikimon.net/Pristimon) | Child (Rookie) | Vaccine |
| murasamemon_beatbreak | Murasamemon | [Murasamemon](https://wikimon.net/Murasamemon) | Perfect (Ultimate) | Virus |
| atratusmon_beatbreak | Atratusmon | [Atratusmon](https://wikimon.net/Atratusmon) | Ultimate (Mega) | Data |
| jijimon | Jijimon | [Jijimon](https://wikimon.net/Jijimon) | Ultimate (Mega) | Vaccine |

Wikimon UP stills (uploader **Garmmon**, files `*_up.png`) were already used as
the art-family reference for the original 16 and are listed per species in
`up-manifest.json` (`wikimonStill`). They were not re-downloaded for species
that already have a full idle + walk bake.

## Payload

See `up-manifest.json` → `payload` for the measured byte counts. In short, the
loose trimmed frames are much larger than the packed atlases, so a car / phone
browser should load **atlases by evolution line and current enemy wave**, not
the whole roster up front.

## What is not in this set

- Official UP idle/walk bakes for Jijimon (still only, as above).
- Jupitermon (canonical Mega for Aegiochusmon), VenomMyotismon, JewelBeemon,
  Anubismon, Elecmon, Flaremon, Cougarmon, Habakirimon, Night Chiropmon,
  Wolvermon, and other species that appear in Wikimon evolution lists but have
  no UP bake here. Substitutions are documented in `docs/EVOLUTION.md`.
- Attack, faint, stun, and evolve animations from the bake (idle + walk only,
  to match the current game).
- Human / tamer sprites (Digimon UP has none). Tamers stay on Digimon World 3
  sheets, credited in `SOURCES.md`.

Profiles for `jijimon`, `piccolomon`, and `tri` exist in `digimon.json` but had
no `baked/` folder. `piccolomon` and `tri` are aliases of Piximon and Tanemon,
which do have bakes. Jijimon was filled from the Wikimon still.

## Atypical event bakes

Two Gekkomon run-event skins are included because they are in the official bake, but they are not normal character walks and are not evolution-tree nodes:

- `gekkomon_runevent_fever` — a large purple burst effect (trimmed 236×236), not a standing Gekkomon.
- `gekkomon_runevent_shadow` — a 40×6 ground-shadow sliver; the character body is missing from the idle/walk frames.

The regular `gekkomon` and `gekkomon_beatbreak` walks are complete and used as the playable / tree form.
