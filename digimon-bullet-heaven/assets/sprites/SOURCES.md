# Sprite sources and credits

This is an unofficial, non-commercial fan project. **Digimon** and all related character designs, names, and official sprites are the property of **Bandai Namco Entertainment Inc.**, **Toei Animation Co., Ltd.**, and their licensors. Nothing here is for sale.

Sprites were downloaded from community fan archives for personal use. They are **not** original art. Raw downloads keep their original filenames under `assets/sprites/raw/`. Sliced in-game frames live under `assets/sprites/frames/` (trimmed, not redrawn).

The Spriters Resource (Digimon World DS overworld sheets) was the preferred host, but downloads were blocked by Cloudflare from this environment, so the same games’ sprites were taken from Wikimon and the DigimonWiki Fandom sprite project instead.

## Standard set (used in the game)

**Style:** official **Digimon UP** sprites (Bandai Namco’s 2026 idle-raising RPG). Every species in the current roster has a UP sprite. In-game characters use the game’s own idle and walk animations, trimmed to a shared bounding box per species (not redrawn) and flipped horizontally for facing. Playback is 16 frames a second, matching the source. Story / World DS battle sprites are kept only as a load-time fallback under `assets/sprites/frames-story/`.

Animated frames were taken from the community bake of official UP animations at [dannyphang/digimon-up-sprites](https://github.com/dannyphang/digimon-up-sprites) (`baked/<name>/idle` and `baked/<name>/walking`). Matching single stills on Wikimon (uploader **Garmmon**, files `*_up.png`) are archived under `raw/wikimon-up/` and are the same art family already used for Gazimon.

### In-game forms (all swapped to Digimon UP)

| In-game form | Animation frames (idle + walk) | Trimmed size | Wikimon still | Archive folder | Notes |
| --- | --- | --- | --- | --- | --- |
| Agumon | 13 + 13 | 66×56 | [Agumon_up.png](https://wikimon.net/File:Agumon_up.png) | `baked/agumon` | Swapped from Story `Agumon_vg.gif` |
| Greymon | 13 + 13 | 59×66 | [Greymon_up.png](https://wikimon.net/File:Greymon_up.png) | `baked/greymon` | Swapped from Story `Greymon_vg.gif` |
| MetalGreymon | 16 + 13 | 103×93 | [Metalgreymon_up.png](https://wikimon.net/File:Metalgreymon_up.png) | `baked/metalgreymon` | Swapped from Story `MetalGreymon_vg.gif` |
| WarGreymon | 13 + 13 | 85×92 | [Wargreymon_up.png](https://wikimon.net/File:Wargreymon_up.png) | `baked/wargreymon` | Swapped from Story `WarGreymon_vg.gif` |
| Numemon | 19 + 13 | 52×62 | [Numemon_up.png](https://wikimon.net/File:Numemon_up.png) | `baked/numemon` | Swapped from Story `Numemon_vg.gif` |
| Gabumon | 13 + 13 | 63×59 | [Gabumon_up.png](https://wikimon.net/File:Gabumon_up.png) | `baked/gabumon` | Swapped from Story `Gabumon_vg.gif` |
| Garurumon | 13 + 13 | 91×64 | [Garurumon_up.png](https://wikimon.net/File:Garurumon_up.png) | `baked/garurumon` | Swapped from Story `Garurumon_vg.gif` |
| MetalGarurumon | 13 + 9 | 113×80 | [Metalgarurumon_up.png](https://wikimon.net/File:Metalgarurumon_up.png) | `baked/metalgarurumon` | Swapped from Story `MetalGarurumon_vg.gif` |
| WereGarurumon | 13 + 13 | 67×88 | [Weregarurumon_up.png](https://wikimon.net/File:Weregarurumon_up.png) | `baked/weregarurumon` | Swapped from a single Story battle still (now has a full idle + walk) |
| Pagumon | 16 + 13 | 48×42 | [Pagumon_up.png](https://wikimon.net/File:Pagumon_up.png) | `baked/pagumon` | Swapped from Story `Pagumon_vg.gif` |
| DemiDevimon | 19 + 13 | 77×61 | [Picodevimon_up.png](https://wikimon.net/File:Picodevimon_up.png) | `baked/demidevilmon` | Swapped from Story `DemiDevimon_vg.gif`. The animation archive uses the folder name `demidevilmon`; the Digimon is DemiDevimon (Picodevimon). |
| Kuwagamon | 13 + 10 | 109×107 | [Kuwagamon_up.png](https://wikimon.net/File:Kuwagamon_up.png) | `baked/kuwagamon` | Swapped from Story `Kuwagamon_vg.gif` |
| Botamon | 13 + 14 | 42×50 | [Botamon_up.png](https://wikimon.net/File:Botamon_up.png) | `baked/botamon` | Swapped from Story `Botamon_vg.gif` |
| Koromon | 13 + 9 | 55×52 | [Koromon_up.png](https://wikimon.net/File:Koromon_up.png) | `baked/koromon` | Swapped from Story `Koromon_vg.gif` |
| Tsunomon | 13 + 13 | 50×66 | [Tunomon_up.png](https://wikimon.net/File:Tunomon_up.png) | `baked/tsunomon` | Swapped from Story `Tsunomon_vg.gif`. Wikimon still uses the Japanese romanization Tunomon. |
| Punimon | 13 + 13 | 44×50 | [Punimon_up.png](https://wikimon.net/File:Punimon_up.png) | `baked/punimon` | Added for Phase 2a as the Gabumon-line Baby. Official UP idle + walk, same trim and 24px height target as Botamon. |
| Gazimon | 19 + 19 | 60×62 | [Gazimon_up.png](https://wikimon.net/File:Gazimon_up.png) | `baked/gazimon` | Already a Digimon UP still; now uses the full official idle + walk instead of a single pose |

**What was not swapped:** nothing on the current roster. Every playable form and every enemy has Digimon UP art. The human tamer now uses official **Digimon World 3** overworld sprites (see the tamer section below). The Story / World DS slices remain in `raw/fandom-vg/`, `raw/wikimon-dst/`, and `frames-story/` as the fallback if a UP frame fails to load.

Raw untrimmed animation frames live in `raw/digimon-up/<id>/{idle,walking}/`. Wikimon stills (all uploaded by Garmmon) live in `raw/wikimon-up/`. In-game trimmed frames live in `frames/<id>/`.

## Collected but not used as the in-game standard

### Digimon World 1 overworld (`raw/dw1/`)

Direct PNGs from https://digimon-world.net/archive/DigimonSprites/DW1/ (community archive of Digimon World, PlayStation). Four facing frames (`Name_0.png` … `Name_3.png`) at 16×16 for Agumon, Greymon, MetalGreymon, Numemon, Gabumon, Garurumon, WereGarurumon, Kuwagamon, Botamon, Koromon, and Tsunomon. **Missing from this set:** WarGreymon, MetalGarurumon, Pagumon, Gazimon, DemiDevimon, and a DigiEgg. Too small and incomplete compared with the Story battle set.

### Wikimon Story map stills (`raw/wikimon-dst/`)

Single overworld frames, same DS-family style, typically 15–38 px. Useful references, but they are not walk sheets. Uploaders: Garmmon, Grandy02, MK (Wikimon).

### Dawn / Dusk Digitama gallery (`raw/wikimon-other/Digitama_sbml1–4.png`)

Full 256×192 menu screenshots from Digimon Story Sunburst / Moonlight (Dawn / Dusk), uploaded to Wikimon by Digimonx. Fifteen egg icons were cropped into `frames/digiegg/`. The egg-hatch starter now uses **egg_08** (orange swirl) for the Agumon line and **egg_09** (blue swirl) for the Gabumon line, drawn at about 30px with a wobble. The other crops are kept as reference. The first blob in an automatic crop was a UI fragment and was discarded.

### Gazimon fallbacks (`raw/wikimon-other/`)

- `Gazimon_championship.png` — Digimon World Championship (DS) overworld, uploader Garmmon. Tiny and noisy; not used in-game.
- `Gazimon_battle_da02d1t.png` — Digimon Adventure 02: D1 Tamers battle sprite, uploader Grandy02. Recognizable but a different, older style.
- `Gazimon_dot.png` — alternate pixel icon, kept for reference.

### Fandom `*_dwds.png` (`raw/fandom-dwds/`)

Large PNGs named as if they were Digimon World DS sheets (uploaded to DigimonWiki by KrytenKoro). On inspection these are **3D character portraits / model renders**, not pixel sprite sheets, so they are not used in the game. Files kept as originally downloaded: Agumon, Greymon, WarGreymon, Numemon, Gabumon, Garurumon, WereGarurumon, MetalGarurumon, DemiDevimon.

### Digimon World 3 map (`raw/wikimon-other/Agumon_map_dw3.png`)

Single 22×29 overworld frame; kept only for the source comparison.

## Tamer (Digimon World 3 overworld)

The playable tamers are official **Digimon World 3** (PlayStation, 2002) overworld character sprites. Each sheet was sliced (transparent background; the Wikimon Atsushi GIF uses a green chroma key), nearest-neighbor scaled so the down-facing idle stands about **56px** tall, and packed onto a shared per-character canvas with feet at the bottom. Every tamer has 2 idle + 4 walk frames for down, up, and side; the side view is flipped for left. The game-drawn drop shadow and the tamer hitbox (`TAMER.radius` 11) are the same for every character. Live frames live in `assets/sprites/frames/tamers/<id>/`. Raw sheets are archived in `assets/sprites/raw/dw3/`. The previously used original 48×56 goggle-kid is kept in `assets/sprites/frames-tamer-goggle-kid/` (and the earlier 40×56 draft in `frames-tamer-prev/`) for comparison. The old 18×16 baked fallback remains in `js/sprites.js` if official frames fail to load.

A character select screen appears after you pick a starter and press Start Run. The last chosen tamer is stored in `dbh_settings_v1` through `js/storage.js` (`selectedTamer`).

### Playable (distinct overworld walk sheets)

All three sheets were downloaded from Wikimon, uploaded by **Blaze Dragon**. The Atsushi sheet itself credits the rip to **Raelys** and the now-dead `http://nekonineline.com/tsr/dw3/Main.htm`.

| In-game id | Display name | Source file | Idle-down native | Scale | In-game canvas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `junior` (default) | Junior | `raw/dw3/Digimon_World_3_-_Atsushi_spritesheet.gif` (620×332, 262 frames) | 18×30 | 56/30 ≈ 1.867 | 38×56 | US version name of the DW3 protagonist. Wikimon titles the sheet **Atsushi** (a Japanese sample name). Fandom’s Junior page uses this same art. Cap, forehead goggles, tan vest — the chunky determined kid. |
| `takumi` | Takumi | `raw/dw3/Digimon_World_3_-_Takumi_spritesheet.png` (418×236, 84 frames) | 18×30 | 56/30 ≈ 1.867 | 34×56 | Blond boy, same overworld camera. Side frames faced left on the sheet and were flipped. Only one official side-idle stand; `side_idle_1` duplicates `side_idle_0`. |
| `minori` | Minori | `raw/dw3/Digimon_World_3_-_Minori_spritesheet.png` (468×192, 84 frames) | 24×29 | 56/29 ≈ 1.931 | 46×58 | Red-pigtail girl, same overworld camera. Side frames faced left and were flipped. Only one official idle stand per facing; the second idle frame is a duplicate. Walk frames can be 2px taller than the 56px idle; feet stay at the bottom of the canvas. |

**Junior / Atsushi frame gaps:** the reachable overworld sheet has down-facing idle and walk, and both left and right side walks, plus many 3/4 and action poses, but **no dedicated back-facing (up) walk cycle**. Up idle and walk were filled by taking the official down frames, replacing the face and goggles with the back of the official blue cap, and adding a thin nape of official hair colors. The body and the leg cycle are the official down walk, unredrawn. This gap is only on Junior; Takumi and Minori include official up-facing idle and walk.

Named characters that were searched for and **not found** as overworld walk sheets (Wikimon File-namespace and Fandom allimages; The Spriters Resource and Sprite Database were blocked with 403/406 from this environment; the Raelys `nekonineline.com/tsr/dw3` site is dead and archive.org had no snapshot): **Junpei, Ken, Kotori, Lili, Ivy, Kenny, Teddy**. Junpei is the Japanese name of *Frontier’s* Takuya, not a DW3 tamer, and was not used as a rename for Junior.

### Collected but not used as playable tamers

Isometric field / battle humans from Digimon World 3 (Wikimon, uploader **DragoSaiHero3**), archived in `raw/dw3-npcs/`: Attacker, Chief, Chief Officer, Game Master, General, Guard, Mech Soldier, Soldier, Trooper. These are tall (~66–162px) stills from a different camera than the chibi overworld walkers, and they have no walk cycles, so they are not playable.

Earlier official-human searches that were not used (wrong density or unreachable) are kept for the record:

| Source | What was looked at | Why it was not used in-game |
| --- | --- | --- |
| Digimon UP animation bake (`dannyphang/digimon-up-sprites`, 280 `baked/` folders) | Full archive listing and `digimon.json` profiles | Digimon only — no player, tamer, or named human with idle/walk frames |
| Wikimon `*_up.png` stills and the [Digimon UP](https://wikimon.net/Digimon_UP) page | Prefixes for Player, Tamer, Taichi, Daisuke, Sui, Shion, Yuzu, Noah, and the other buddy tamers | No human UP sprite files. Promo art is a painted child, not a pixel walk sheet |
| Already-collected DS / Story human sheets in `raw/wikimon-tamer/` (Masaru, Kazuya, Yuji, Kogure, Koh, Sayo, mugshots, Tai/Davis illustrations) | Same files as the earlier tamer search | Chibi map density (~16–32 px) or illustrations; too coarse compared with the DW3 overworld sheets now in use |
| The Spriters Resource Koh/Sayo Dawn/Dusk walk sheet (792×480, DigistarDBZ) and DW3 tamer rips | Same as earlier | Still Cloudflare-blocked from this environment |

## What’s missing

- **Clean standalone DigiEgg sprite sheet** (not a menu screenshot) was not found in Digimon UP archives. Phase 2a uses the cropped Dawn/Dusk Digitama icons (egg_08 / egg_09) instead.
- **Junior’s official back-facing walk** was not on the reachable Atsushi/Junior overworld sheet; the up direction is a gap fill described in the tamer section.
- Overworld walk sheets for **Junpei, Ken, Kotori, Lili, Ivy, Kenny, and Teddy** were not reachable.
- The Spriters Resource Digimon World DS / Dawn / Dusk overworld sheets, and any additional DW3 rips hosted there, remain Cloudflare-blocked from this environment.

Story `vg.gif` battle sprites and Wikimon Story map/battle stills are no longer the in-game standard; they are kept as fallback and reference only (see above).

## Recommendation

Standardize on the **Digimon UP** official sprites (idle + walk bakes, with Wikimon `*_up.png` stills as the same-art reference). They are the newest official pixels, share one style across the full roster (including Gazimon, which never had a Story battle sheet, and WereGarurumon, which only had a still), and already include walk cycles. Keep the Story / World DS battle slices as a fallback only.

## Item icons (Digimon World Championship)

Care/consumable item art cropped from public Championship DS screenshots is documented in [`assets/items/SOURCES.md`](../items/SOURCES.md), with files under `assets/items/`.
