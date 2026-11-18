# Digimon World Championship item icon sources

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
| Wikimon File:Digimon_Feeding.png | Official dual-screen Training / Feeding screenshot (514×768). Left 512×768 is exact 2× of native 256×384 (right 2 columns nearly black). This is the source of the **verified** meat and protein crops. https://wikimon.net/File:Digimon_Feeding.png — original: https://wikimon.net/images/e/e4/Digimon_Feeding.png |
| Giant Bomb screenshot gallery (wiki-origin) | Native 256×385 English Training (“Protein remaining”) and Japanese Training (クスリ). Useful for labeling the toolbar, but JPEG extracts of meat / protein / medicine were visually poor or ambiguous and were **reverted**. https://wiki-origin.giantbomb.com/wiki/Games/Digimon_World_Championship/Images |
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
| `raw/wikimon/Digimon_Feeding.png` (514×768) | https://wikimon.net/images/e/e4/Digimon_Feeding.png | https://wikimon.net/File:Digimon_Feeding.png | **Verified meat + protein source** |
| `raw/giantbomb/430551-digimon_world_championship_gp3.jpg` (256×385) | https://www.giantbomb.com/a/uploads/original/1/11300/430551-digimon_world_championship_gp3.jpg | https://wiki-origin.giantbomb.com/wiki/Games/Digimon_World_Championship/Images | Label cross-check only; earlier crops rejected |
| `raw/giantbomb/586753-gfs_97204_2_11.jpg` (256×384) | https://www.giantbomb.com/a/uploads/original/0/3715/586753-gfs_97204_2_11.jpg | https://wiki-origin.giantbomb.com/wiki/Games/Digimon_World_Championship/Images | クスリ context; medicine portrait **unverified / reverted** |
| `raw/pocketgamer/digimon_world_championship_010.jpg` (256×385) | https://media.pocketgamer.com/artwork/na-xcl/digimon_world_championship_010.jpg | https://www.pocketgamer.com/digimon-world-championship/e3-2008-digimon-world-championship-digivoles-on-your-digi-ds/ | Hunt toolbar references only |

## Gameplay swaps (verified only)

Gameplay mechanics, prices, and stat effects were not changed. Procedural art remains the fallback when a file is missing or a mapping is reverted. `js/item-art.js` wraps `getIcon` / `drawPickup` / `drawMeat` after `game.js`.

| Icon file | Identification | Confidence | Existing item ids swapped | Source crop (on left 512×768) |
| --- | --- | --- | --- | --- |
| `icons/meat.png` (12×12) | Care-menu **Feed** meat (classic yellow-orange Championship meat), selected well, “Food remaining” screen | identity **high**; pixel quality **medium-high** (2× screenshot, glow keyed, slight softness, tight box to exclude the gold frame) | `meat`, `meatPack`, `food` (HUD + shop + world pickup) | (118, 728)–(142, 752), then BOX 2:1 |
| `icons/protein_pill.png` (12×9) | Care-menu **Protein** capsule, unselected well immediately right of Feed | identity **high** (slot cross-checked on the English Protein-remaining screen); pixel quality **medium** | `vitamin` (Power Vitamin; previously had no ICO) | (164, 738)–(188, 756), then BOX 2:1 |

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

Original-context annotated proofs (moved out of the game in 17c; they are in `digi-night-source-art-item-proofs.zip`, and the script recreates `proof/` if run):

- `proof/wikimon_feeding_context_annotated.png` — full Feeding screenshot with “Food remaining” log, leftover-tray warning, and boxed used crops + coordinates
- `proof/wikimon_meat_crop_proof.png` — raw well, keyed 2×, native, and `toCanvas` 36/30 hook simulation
- `proof/wikimon_protein_crop_proof.png` — same for the Protein capsule
- `proof/rejected_and_unverified_context.png` — rejected gp3 meat/protein and unverified medicine portrait in original UI
- `proof/hook_tocanvas_simulation.png` — Python port of the actual `item-art.js` `toCanvas` sizes used by `getIcon` / `drawPickup`
- `contact-sheet.png`, `before-after.png` — updated after the verification pass
