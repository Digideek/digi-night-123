# Digi Night

(Renamed from Digimon Bullet Heaven on Nov 17. The game folder keeps its old name, `digimon-bullet-heaven`, so the launchers and existing saves carry on working.)

A fan-made, browser-based Vampire Survivors–style shooter. You move, your Digimon attacks on its own, you scoop up XP, and you raise your partner carefully enough to evolve.

This is an unofficial, non-commercial fan project and is not affiliated with Bandai Namco or Toei Animation. **Digimon** and its official sprites are the property of **Bandai Namco Entertainment Inc.** and **Toei Animation Co., Ltd.** Sprites used in the game were sourced from community fan archives; credits are listed in `assets/sprites/SOURCES.md`. Nothing is for sale.

## How to play


## Art direction

**Digimon:** official *Digimon UP* sprites (side-view pixel art with the game’s own idle and walk cycles, flipped for facing), drawn with nearest-neighbor scaling and no smoothing. The live roster is the full official *Digimon UP* set (**281** species, **264** of them in the evolution tree), packed as per-species atlases in `assets/sprites/atlases-up-all/` and lazy-loaded by the current form, upcoming branches, and the current enemy wave. Story / World DS battle slices are kept only as a fallback. Credits and every raw file are listed in `assets/sprites/SOURCES.md` and `assets/sprites/SOURCES-up-all.md`. HUD icons, items, projectiles, and terrain remain original art. The tamer is an official **Digimon World 3** (PlayStation) overworld sprite, nearest-neighbor scaled to about 56px standing height, with a 4-direction idle and walk (side flipped for left). A character select screen at the start of a run lets you pick among the distinct DW3 tamer sheets that could be reached (Junior, Takumi, and Minori). After that you pick a Digitama (Agumon line, Gabumon line, or Random). Credits and gaps are listed in `assets/sprites/SOURCES.md`.

**Style:** official character pixels at a nearest-neighbor scale sized to the 56px tamer. Baby (Botamon, Punimon) and In-Training (Koromon, Tsunomon, Pagumon) forms are about a third to half the tamer's height. Rookies (Agumon, Gabumon, and the Gazimon / DemiDevimon swarm) are about the tamer's height or a little shorter. Champions and above stay at native 1×, so they read clearly larger, with large forms (Kuwagamon, MetalGreymon) capped to about a quarter of the shortest viewport side on phones. Original UI and terrain are baked at a 3× integer scale, with `imageSmoothingEnabled = false` everywhere.

**Palette:** a fixed Digital World set in `js/sprites.js` (`C`) and `js/data.js` (`PALETTE`) — warm mid greens and soft earth tones behind the official sprites, gold/orange UI, mint XP, and a small cyan digital accent on water foam and File Island-style landmarks.

**Outline / lighting (original art):** items and props are ringed in ink (`K`). A single upper-left key light: cream highlights on top-left faces, darker ramps and drop shadows offset down-right, plus a soft vignette.

**Terrain:** a 16×16 hand-authored tileset (grass variants, dirt paths and data-pool edges with wavy autotiling, cliff tops with a lit rim and a darker vertical south face) is chunk-generated from a deterministic seed and pre-rendered to offscreen canvases. The spawn clearing stays calm and low-noise; paths, water, ledges, flowers, tall grass, trees, rocks, and a shrine or data monolith cluster toward the edges. Props y-sort with the tamer and Digimon. Debug mode is locked behind a developer passcode (see `js/devlock.js`); `?debug=<passcode>`?debug=1&hud=clean` (or U in a debug session) hides the debug panel for screenshots.hud=clean` (or U in a debug session) hides the debug panel for screenshots.

Open `index.html` directly (double-click it, or drag it into a browser) or serve the folder with any static server:

```bash
# from this folder
python3 -m http.server 8000
# then visit http://localhost:8000
```

There is no build step, no npm, and no internet dependency. Classic `<script>` tags are used so `file://` works.

For a Tesla in-car browser, you must host this at a public URL (the car cannot open a local zip). See *Next steps* below.

### Controls

| Action | Keyboard | Gamepad | Touch |
| --- | --- | --- | --- |
| Move | WASD or arrow keys | Left stick or D-pad | On-screen joystick (bottom left) |
| Send partner after an enemy | Left-click the enemy (gold brackets mark it) | — | Tap the enemy |
| Confirm / pick a tamer, egg, or upgrade | Enter or Space | A | Tap the card or button, then Start on the tamer and egg screens |
| Back | Esc (from pause, shop, DigiBank, or game over) | B | Tap the UI button |
| Pause | Esc or P | Start | Pause button (top right) |
| Open shop | Q (while Jijimon is visiting, or any time in debug) | Y | Shop button (top right) |
| Capture | C (Data Chip + KO charge for that stage + foe at or below 25% HP) | X | Capture button when a marked target is in range |
| Use Restore Disk | R | — | Tap the bag chip, or Use in the pause menu |

The canvas scales to the viewport. Buttons are large for in-car touch. A USB or Bluetooth controller works through the Gamepad API.

### Goal

You move a **tamer**. Each run starts with a **Digitama** beside you. The field stays quiet while it incubates: no enemies spawn until second 19, then the opening wave floods in, and the egg hatches at exactly 20 seconds (no shortcuts). After the hatch, your Digimon is a companion: it roams to engage threats near you (and comes back if you get too far), and all weapons fire from its position. It grows from Baby to In-Training to a Rookie, then along a branching care-gated tree (the original Agumon / Gabumon / Numemon gates are unchanged if you play a mixed-care standard route). What you feed most, how you treat them, and which attributes you defeat can open alternate Champions and beyond. Survive escalating waves; later waves draw extra species from the same roster. Battle time runs through the **seasons** (Spring, Summer, Fall, Winter, 6 minutes each, looping into a new year), and every season that passes makes enemies tougher. The **minimap** in the top right shows drops, teammates, Megas, bosses, and Jijimon's shop; the counter under it shows the current year and season. Enemies drop teal XP gems, **Bits**, food (meat, fish, berries), and occasional pink toys. Bits are picked up like other orbs (magnet works) and the run total sits on the HUD. **Jijimon** visits on a cycle (first at 38s, then about every 85s, stays 32s) and opens a shop — or press Q / the Shop button while he is out. Prices of the same item climb each time you buy it in a run (the panel always shows the next price). Food packs go to the carry stack; a Data Chip, Restore Disk, and Care Reset go in the bag; a Training Ball and Power Chip apply immediately; the Digi-Egg of Courage and Crest of Courage stay in the run as evolution keys. Leveling pauses the run and offers **3 random upgrades**.

A **Data Chip** is only half of a capture. KOs fill a charge on the HUD (`Capture 52 KOs: Baby ✓ Rookie/Mega ✓ Champion 52/70`). A weakened non-boss (25% HP or less) in range can be chipped only if that charge meets the target's stage: Baby 15, In-Training 25, Rookie and Mega (including Mega+) 40, Champion 70, Armor 90, Ultimate 120. Mega rarity comes from spawns, not a higher KO gate — field Megas appear only in later waves, at most one at a time, with a cooldown, a large HP multiplier, a name warning, and a health bar. Any attempt, success or fail, resets the charge to 0. Success chance still scales with remaining HP, the stage gap vs. your partner, and tamer level. A captured Digimon joins as a second ally (one active, up to three in reserve; swap from the pause menu) and is stored in the **DigiBank** between runs (view it from the title screen; you can bring one banked form as your starting ally). Bosses cannot be captured. Data Chips stay in Jijimon's shop but do nothing until the charge is high enough for the foe in front of you. Persistence stays in the same profile object through `js/storage.js` (`digibank`, `bankDeploy`).

The **magnet** and pickup radius belong to the tamer. Enemies drop **meat, fish, berries and seeds**; seeds are planted in the Digi Farm garden and grow while you battle; picking them up stores them in your bag (no limit, counts shown in the HUD). Food is never eaten in battle — you feed your partner from the bag at the **Digi Farm**.

Two life bars: **You** (tamer). If this hits 0, the run ends. **Pal** (Digimon) is the Health care meter. If it hits 0 the partner **faints** for a few seconds (no attacks, joy drops) and then revives at low HP.

## Care and evolution

Care meters belong to the **Digimon**, shown in the HUD and on the pause screen:

- **Health (Pal HP)** — the partner’s life. Starving and enemy hits chip it. At 0 they faint, not end the run. Below 25% they enter Desperation.
- **Fullness (Eat)** — decays over time. The tamer picks up **meat** (most filling), **fish** (balanced), or **berries** (most joy) and must deliver them in the feed ring. Each successful hand-off counts toward evolution.
- **Happiness (Joy)** — rises from delivered meals, kill streaks (every 5 KOs quickly), and pink toys. Falls when they starve, sit at low fullness, take hits, faint, or stay in Desperation.

Evolution itself is evaluated from `js/evolution-tree.js` (`window.EVO_TREE`, 264 nodes and 1,327 branches). The HUD **Next:** line shows the closest reachable branch. Pause lists every possible next form and its requirements; unmet secret branches (warp, dark, special, and so on) show as **???**. A meat, fish, or berry majority can open official food routes; neglect still leads to Numemon (and other care-mistake forms); excellent late care plus a boss can warp. The shop's **Digi-Egg of Courage** satisfies the tree's existing `item: "digimental"` armor gates (Veemon → Flamedramon and the other official armor lines) without changing those default conditions. The **Crest of Courage** can stand in for the boss requirement on warp branches only — a default warp still works with a boss and no crest. Design notes: `docs/EVOLUTION.md`.

Low fullness and/or low joy also make the partner **sluggish** (stacks with the joy combat tiers and with Desperation):

| Status | Trigger | Effect |
| --- | --- | --- |
| Hungry | Fullness 19–40 | Slower move and attack, slower targeting |
| Starving | Fullness 0–18 | Much slower move, attack, and targeting; slump + sweat |
| Sad | Joy 20–39 | Slightly slower move and targeting |
| Miserable | Joy 0–19 | Clearly slower move and targeting; sweat drop |

### Happiness combat bonuses

Joy is not just flavor. It is tiered and shown under the evolution strip:

| Mood | Joy | Effect |
| --- | --- | --- |
| Miserable | 0–19 | −12% attack speed, −10% damage |
| Unhappy | 20–39 | No bonus |
| Content | 40–69 | +10% attack speed |
| Happy | 70–89 | +20% attack speed, **+1 projectile** |
| Joyful | 90–100 | +35% attack speed, **+1 projectile**, +10% damage |

### Desperation

When the Digimon’s HP drops **below 25%**, they enter **Desperation**: a red vignette, a banner, and a glowing sprite. Outgoing damage, movement speed, and fire rate jump, but incoming damage rises and happiness drains quickly. Get health back (Vital Boost heals when you pick it; staying alive and evolving also tops HP up) to leave the mode.

### Evolution requirements (v1)

Evolution is **care-gated**, not a free level-up. The HUD lists the next standard form and a live checklist. Poor care blocks the proper form; severe neglect on a Rookie can branch into Numemon. Good care can still recover Numemon into Greymon.

Exact v1 thresholds (also defined in `js/data.js`):

**Agumon → Greymon** (standard)

- Level 8
- 15 meals eaten
- Happiness 55+
- Current HP at least 40% of max

**Greymon → MetalGreymon**

- Level 15
- 40 meals eaten (cumulative)
- Happiness 65+
- Current HP at least 50% of max

**MetalGreymon → WarGreymon**

- Level 22
- 75 meals eaten (cumulative)
- Happiness 75+
- Current HP at least 60% of max

**Agumon (or Gabumon) → Numemon** (neglect branch)

- Level 8
- 7 or fewer meals eaten
- Happiness 25 or lower

**Numemon → Greymon** (recovery)

- Level 10
- 22 meals eaten
- Happiness 70+
- Current HP at least 50% of max

Gabumon (unlockable) uses the same care numbers along Gabumon → Garurumon → WereGarurumon → MetalGarurumon, with the same neglect/recovery branch through Numemon.

Each successful evolution changes the sprite and grants a **signature attack**: Nova Blast, Giga Destroyer, Terra Force (Agumon line); Howling Blaster, Kaiser Nail, Metal Wolf Claw (Gabumon line); Sludge Toss (Numemon).

### Unlocks

Survive **3:00** in a single run, or evolve Agumon into **Greymon**, to unlock Gabumon as a starter. All persistence goes through `js/storage.js` (`loadProfile` / `saveProfile` / `clear`, plus settings). The default adapter uses `localStorage`; swapping in Firebase or Supabase later should not require game-logic changes. Captured Digimon are stored on the same profile as `digibank` (cap 12).

## Debug mode

Add `?debug=1` to the URL (works on `file://` and http):

```
index.html?debug=1
http://localhost:8000/?debug=1
```

Effects:

- XP orbs are worth 12×, so leveling is fast.
- A debug panel appears (and these keys work): **X** grant enough XP to level, **F** add a food item to the tamer’s carry stack, **G** fill the partner’s belly and add 5 meals, **H** fill happiness, **E** meet the next evolution’s requirements and trigger it, **Y** hatch the egg now, **1 / 2 / 3 / 4** force Baby / In-Training / Rookie / Champion of the current line, **]** or **.** cycle the partner through the full roster, **[** or **,** cycle backward, **B** print and show a branch evaluation (every next form and whether its conditions are met), **K** drop tamer HP to 20%, **M** drop partner HP to 20% (Desperation), **=** / **$** grant 100 Bits, **O** open the shop, **V** force-capture the nearest foe, **N** fill the capture KO charge. There is also a Fill both HP button. `DBH.forceSpecies(id)`, `DBH.cycleSpecies(dir)`, `DBH.evaluateBranches()`, `DBH.openShop()`, `DBH.buyShopItem(id)`, `DBH.tryCapture(opts)`, `DBH.giveBits(n)`, `DBH.fillCaptureCharge()`, `DBH.setCaptureKills(n)`, `DBH.getCaptureKills()`, and `DBH.getBank()` are also exported.

## How to add a Digimon

All species live in `js/data.js` under `SPECIES`.

1. Add a form entry:

```javascript
myomon: {
  id: "myomon",
  name: "Myomon",
  stage: "Rookie",
  starter: true,          // show on the title screen if listed in STARTERS
  color: "#88ccff",
  belly: "#e8f6ff",
  radius: 16,
  base: { maxHp: 110, speed: 150, magnet: 86, damage: 1 },
  startWeapon: "pepperBreath",   // or a new weapon id
  // unlock: { type: "evolveTo", form: "greymon", alsoTime: 180 },
  // unlockHint: "How to unlock this starter.",
  evolutions: [
    {
      to: "nextform",
      kind: "standard",    // "standard" | "neglect" | "recover"
      minLevel: 8,
      minFood: 15,
      minHappiness: 55,
      minHpRatio: 0.4
    }
  ]
}
```

2. If it is a starter, append its id to `STARTERS`.
3. For a neglect path, add a second rule with `kind: "neglect"`, `maxFood`, and `maxHappiness` instead of the minimums.
4. Draw the form in `js/sprites.js` (`FORM_DRAW` plus a `drawMyomon` function). Until you do, the game will fall back to the Agumon shape.
5. If the evolution should teach a new attack, set `signatureWeapon` on the *destination* form and define that weapon in `WEAPONS`.

## How to add an ability

Add an entry to `WEAPONS` in `js/data.js`:

```javascript
mySkill: {
  id: "mySkill",
  name: "My Skill",
  type: "projectile",   // projectile | missile | nova | aura | orbit | arc
  maxLevel: 5,
  color: "#ffaa00",
  glow: "#ffe08a",
  summary: "Short description shown on the level-up card.",
  levels: [
    { damage: 14, cooldown: 0.7, count: 1, speed: 340, pierce: 0, radius: 6, spread: 0.16, knockback: 40 }
    // …up to maxLevel
  ]
}
```

- Leave `signature` unset so the skill can appear in the random level-up pool.
- Set `signature: true` for evolution-only attacks (they are granted when the form is reached, not offered as cards).
- Type notes: `aura` uses `radius` + tick `cooldown`; `orbit` uses `count`, `radius`, `size`, `spin`; `arc` uses `range`, `arc`, `duration`; `missile` adds `homing`; `nova` adds `explode` (blast radius).

Stat upgrades go in `STAT_UPGRADES` with an `apply(stats, level)` function that mutates `speedMul`, `magnetMul`, `maxHpMul`, `damageMul`, or `cooldownMul`.

Enemies and wave timing are in `ENEMIES`, `WAVES`, and `BOSSES`. Care rates are in `CARE`. Happiness tiers are in `HAPPINESS_TIERS`.

## File layout

```
index.html              # UI shells, HUD, menus
css/style.css           # Tesla / phone layout
js/data.js              # species, weapons, enemies, care, food, waves
js/shop.js              # Bits economy, shop catalog, capture chance
js/storage.js           # profile + settings persistence (Promise API)
js/sprites.js           # procedural canvas art plus shop/item pixel icons
js/input.js             # keyboard, Gamepad API, virtual joystick
js/game.js              # loop, combat, care, evolution, screens
screenshots/            # captured at 1280×720 and one phone size
README.md
```

## Known limitations

- Balance is a first pass; later minutes can get dense on slower devices.
- Only two starter lines are wired (Agumon playable from the start, Gabumon after unlock).
- Sound is tiny Web Audio beeps, not music.
- No online features and no backend — everything is local.

## Hosting for a Tesla

A Tesla browser cannot install an app or open a zip off a USB stick reliably. Upload this folder to any static host and bookmark the HTTPS URL in the car:

- GitHub Pages (push the folder, enable Pages on the branch)
- Netlify or Cloudflare Pages (drag-and-drop the folder)
- Any other static file host

Then open the URL in the Tesla browser, landscape. Plug in a controller if you have one, or use the touch joystick.
