# Branching evolution tree (data only)

This is the design for a full branching evolution tree over the Digimon UP
roster. It is **not wired into the live game**. The module lives at
`js/evolution-tree.js` as `window.EVO_TREE` (also `require`-able from Node).
`js/data.js`, `js/game.js`, `index.html` and the CSS were left untouched so
the egg-hatch work can merge cleanly.

## Roster

- **264** species in the tree (costume / event skins are in the
  asset pack but are not separate evolution nodes).
- **1327** directed branches.
- Stage mix (tree nodes): Adult (Champion): 76, Armor: 6, Baby I: 22, Baby II (In-Training): 26, Child (Rookie): 40, Perfect (Ultimate): 59, Ultimate (Mega): 33, Ultimate (Mega+): 2.
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

- `botamon` → `koromon` (standard): {'minLevel': 2, 'minFood': 2, 'minHappiness': 35, 'minHpRatio': 0.3}
- `koromon` → `agumon` (standard): {'minLevel': 4, 'minFood': 5, 'minHappiness': 45, 'minHpRatio': 0.35}
- `punimon` → `tsunomon` (standard): {'minLevel': 2, 'minFood': 2, 'minHappiness': 35, 'minHpRatio': 0.3}
- `tsunomon` → `gabumon` (standard): {'minLevel': 4, 'minFood': 5, 'minHappiness': 45, 'minHpRatio': 0.35}
- `agumon` → `greymon` (standard): {'minLevel': 8, 'minFood': 15, 'minHappiness': 55, 'minHpRatio': 0.4}
- `agumon` → `numemon` (neglect): {'minLevel': 8, 'maxFood': 7, 'maxHappiness': 25, 'minHpRatio': 0}
- `greymon` → `metalgreymon` (standard): {'minLevel': 15, 'minFood': 40, 'minHappiness': 65, 'minHpRatio': 0.5}
- `metalgreymon` → `wargreymon` (standard): {'minLevel': 22, 'minFood': 75, 'minHappiness': 75, 'minHpRatio': 0.6}
- `gabumon` → `garurumon` (standard): {'minLevel': 8, 'minFood': 15, 'minHappiness': 55, 'minHpRatio': 0.4}
- `gabumon` → `numemon` (neglect): {'minLevel': 8, 'maxFood': 7, 'maxHappiness': 25, 'minHpRatio': 0}
- `garurumon` → `weregarurumon` (standard): {'minLevel': 15, 'minFood': 40, 'minHappiness': 65, 'minHpRatio': 0.5}
- `weregarurumon` → `metalgarurumon` (standard): {'minLevel': 22, 'minFood': 75, 'minHappiness': 75, 'minHpRatio': 0.6}
- `numemon` → `greymon` (recover): {'minLevel': 10, 'minFood': 22, 'minHappiness': 70, 'minHpRatio': 0.5}

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

- Botamon → DemiMeramon (special, Baby II (In-Training)): minLevel=2, minFood=2, minHappiness=25, minHpRatio=0.3, mostFood=meat — Official branch favoured when meat is the food eaten most.
- DemiMeramon → Ghostmon (special, Child (Rookie)): minLevel=4, minFood=5, minHappiness=35, minHpRatio=0.35 — Official untagged evolution.
- Ghostmon → Oboromon (special, Adult (Champion)): minLevel=8, minFood=15, minHappiness=45, minHpRatio=0.4 — Official untagged evolution.
- Ghostmon → Petermon (special, Adult (Champion)): minLevel=8, minFood=15, minHappiness=45, minHpRatio=0.4 — Official untagged evolution.
- Ghostmon → Bakemon (standard, Adult (Champion)): minLevel=8, minFood=15, minHappiness=55, minHpRatio=0.4 — Canonical good-care branch.
- Bakemon → LadyDevimon (dark, Perfect (Ultimate)): minLevel=15, minFood=20, minHpRatio=0.5, maxHappiness=45, minFaints=2, minDesperationTime=8 — Official dark evolution.
- Bakemon → Phantomon (special, Perfect (Ultimate)): minLevel=15, minFood=40, minHappiness=55, minHpRatio=0.5 — Official untagged evolution.
- Bakemon → Pumpkinmon (special, Perfect (Ultimate)): minLevel=15, minFood=40, minHappiness=55, minHpRatio=0.5, mostFood=berry — Official branch favoured when berry is the food eaten most.
- Bakemon → Myotismon (standard, Perfect (Ultimate)): minLevel=15, minFood=40, minHappiness=65, minHpRatio=0.5 — Canonical good-care branch.
- Myotismon → MaloMyotismon (special, Ultimate (Mega)): minLevel=22, minFood=75, minHappiness=65, minHpRatio=0.6 — Adventure 02 Mega. VenomMyotismon has no UP sprite, so this is the available dark Mega.
- Myotismon → Piedmon (standard, Ultimate (Mega)): minLevel=22, minFood=75, minHappiness=75, minHpRatio=0.6 — Canonical good-care branch.
- Piedmon → Apocalymon (fusion, Ultimate (Mega)): minLevel=28, minFood=100, minHappiness=70, minHpRatio=0.7, requiresPartner=machinedramon+metalseadramon+puppetmon — Official fusion evolution.
- Piedmon → Apocalymon (standard, Ultimate (Mega)): minLevel=28, minFood=100, minHappiness=85, minHpRatio=0.7 — Default good-care branch (promoted so the line does not stall).
- Piedmon → Armageddemon (neglect, Ultimate (Mega+)): minLevel=24, minHpRatio=0, maxFood=50, maxHappiness=40 — Neglect / care-mistake branch.
- Myotismon → Jijimon (neglect, Ultimate (Mega)): minLevel=20, minHpRatio=0, maxFood=35, maxHappiness=35 — Neglect / care-mistake branch.
- Bakemon → WaruMonzaemon (neglect, Perfect (Ultimate)): minLevel=15, minHpRatio=0, maxFood=20, maxHappiness=30 — Official care-mistake evolution.
- Ghostmon → Numemon (neglect, Adult (Champion)): minLevel=8, minHpRatio=0, maxFood=7, maxHappiness=25 — Official care-mistake evolution.
- DemiMeramon → Solarmon (special, Child (Rookie)): minLevel=4, minFood=5, minHappiness=35, minHpRatio=0.35 — Official untagged evolution.
- Solarmon → Clockmon (special, Adult (Champion)): minLevel=8, minFood=15, minHappiness=45, minHpRatio=0.4 — Official untagged evolution.
- Solarmon → Flarerizamon (special, Adult (Champion)): minLevel=8, minFood=15, minHappiness=45, minHpRatio=0.4, mostFood=meat — Official branch favoured when meat is the food eaten most.
- Solarmon → Gladimon (special, Adult (Champion)): minLevel=8, minFood=15, minHappiness=45, minHpRatio=0.4 — Official untagged evolution.
- Solarmon → Guardromon (Gold) (special, Adult (Champion)): minLevel=8, minFood=15, minHappiness=45, minHpRatio=0.4 — Official prior form.
- Solarmon → Lavorvomon (special, Adult (Champion)): minLevel=8, minFood=15, minHappiness=45, minHpRatio=0.4, mostFood=meat — Official branch favoured when meat is the food eaten most.
- Solarmon → Meramon (special, Adult (Champion)): minLevel=8, minFood=15, minHappiness=45, minHpRatio=0.4, mostFood=meat — Official branch favoured when meat is the food eaten most.
- Solarmon → Starmon (special, Adult (Champion)): minLevel=8, minFood=15, minHappiness=45, minHpRatio=0.4 — Official untagged evolution.
- Solarmon → Tankmon (special, Adult (Champion)): minLevel=8, minFood=15, minHappiness=45, minHpRatio=0.4 — Official untagged evolution.
- Solarmon → Guardromon (standard, Adult (Champion)): minLevel=8, minFood=15, minHappiness=55, minHpRatio=0.4 — Canonical good-care branch.
- Guardromon → Datamon (special, Perfect (Ultimate)): minLevel=15, minFood=40, minHappiness=55, minHpRatio=0.5 — Official untagged evolution.
- Guardromon → Guardromon (Gold) (special, Adult (Champion)): minLevel=15, minFood=40, minHappiness=55, minHpRatio=0.5 — Gold subspecies.
- Guardromon → Rapidmon (special, Perfect (Ultimate)): minLevel=15, minFood=40, minHappiness=55, minHpRatio=0.5 — Official untagged evolution.
- Guardromon → Tankdramon (special, Perfect (Ultimate)): minLevel=15, minFood=40, minHappiness=55, minHpRatio=0.5 — Official untagged evolution.
- Guardromon → Andromon (standard, Perfect (Ultimate)): minLevel=15, minFood=40, minHappiness=65, minHpRatio=0.5 — Canonical good-care branch.
- Andromon → Machinedramon (dark, Ultimate (Mega)): minLevel=22, minFood=37, minHpRatio=0.6, maxHappiness=45, minFaints=2, minDesperationTime=8 — Official dark evolution.
- Andromon → HiAndromon (standard, Ultimate (Mega)): minLevel=22, minFood=75, minHappiness=75, minHpRatio=0.6 — Canonical good-care branch.
- Andromon → Jijimon (neglect, Ultimate (Mega)): minLevel=20, minHpRatio=0, maxFood=35, maxHappiness=35 — Neglect / care-mistake branch.
- Guardromon → WaruMonzaemon (neglect, Perfect (Ultimate)): minLevel=15, minHpRatio=0, maxFood=20, maxHappiness=30 — Official care-mistake evolution.
- Solarmon → Numemon (neglect, Adult (Champion)): minLevel=8, minHpRatio=0, maxFood=7, maxHappiness=25 — Official care-mistake evolution.
- Solarmon → Raremon (neglect, Adult (Champion)): minLevel=8, minHpRatio=0, maxFood=7, maxHappiness=25 — Official care-mistake evolution.
- DemiMeramon → Candlemon (standard, Child (Rookie)): minLevel=4, minFood=5, minHappiness=45, minHpRatio=0.35 — Canonical good-care branch.
- Candlemon → Devimon (dark, Adult (Champion)): minLevel=8, minFood=7, minHpRatio=0.4, maxHappiness=45, minFaints=2, minDesperationTime=8 — Official dark evolution.

## Gabumon egg (Punimon) — interesting branches

- Punimon → Tumblemon (special, Baby II (In-Training)): minLevel=2, minFood=2, minHappiness=25, minHpRatio=0.3 — Official untagged evolution.
- Tumblemon → Ludomon (special, Child (Rookie)): minLevel=4, minFood=5, minHappiness=35, minHpRatio=0.35 — Official untagged evolution.
- Ludomon → Hi-Commandramon (special, Adult (Champion)): minLevel=8, minFood=15, minHappiness=45, minHpRatio=0.4 — Official untagged evolution.
- Ludomon → Tankmon (special, Adult (Champion)): minLevel=8, minFood=15, minHappiness=45, minHpRatio=0.4 — Official untagged evolution.
- Ludomon → TiaLudomon (standard, Adult (Champion)): minLevel=8, minFood=15, minHappiness=55, minHpRatio=0.4 — Canonical good-care branch.
- TiaLudomon → Loaderliomon (special, Perfect (Ultimate)): minLevel=15, minFood=40, minHappiness=55, minHpRatio=0.5 — Official untagged evolution.
- TiaLudomon → RaijiLudomon (standard, Perfect (Ultimate)): minLevel=15, minFood=40, minHappiness=65, minHpRatio=0.5 — Canonical good-care branch.
- RaijiLudomon → HeavyLeomon (special, Ultimate (Mega)): minLevel=22, minFood=75, minHappiness=65, minHpRatio=0.6, mostFood=berry — Official branch favoured when berry is the food eaten most.
- RaijiLudomon → HiAndromon (special, Ultimate (Mega)): minLevel=22, minFood=75, minHappiness=65, minHpRatio=0.6 — Official untagged evolution.
- RaijiLudomon → SlashAngemon (special, Ultimate (Mega)): minLevel=22, minFood=75, minHappiness=65, minHpRatio=0.6 — Official untagged evolution.
- RaijiLudomon → BryweLudramon (standard, Ultimate (Mega)): minLevel=22, minFood=75, minHappiness=75, minHpRatio=0.6 — Canonical good-care branch.
- RaijiLudomon → Jijimon (neglect, Ultimate (Mega)): minLevel=20, minHpRatio=0, maxFood=35, maxHappiness=35 — Neglect / care-mistake branch.
- TiaLudomon → Garbagemon (neglect, Perfect (Ultimate)): minLevel=15, minHpRatio=0, maxFood=20, maxHappiness=30 — Neglect / care-mistake branch.
- Ludomon → Numemon (neglect, Adult (Champion)): minLevel=8, minHpRatio=0, maxFood=7, maxHappiness=25 — Official care-mistake evolution.
- Tumblemon → Zubamon (special, Child (Rookie)): minLevel=4, minFood=5, minHappiness=35, minHpRatio=0.35 — Official untagged evolution.
- Zubamon → SkullKnightmon (dark, Adult (Champion)): minLevel=8, minFood=7, minHpRatio=0.4, maxHappiness=45, minFaints=2, minDesperationTime=8 — Official dark evolution.
- Zubamon → Gladimon (special, Adult (Champion)): minLevel=8, minFood=15, minHappiness=45, minHpRatio=0.4 — Official untagged evolution.
- Zubamon → Guardromon (Gold) (special, Adult (Champion)): minLevel=8, minFood=15, minHappiness=45, minHpRatio=0.4 — Official prior form.
- Zubamon → TiaLudomon (special, Adult (Champion)): minLevel=8, minFood=15, minHappiness=45, minHpRatio=0.4 — Official untagged evolution.
- Zubamon → ZubaEagermon (standard, Adult (Champion)): minLevel=8, minFood=15, minHappiness=55, minHpRatio=0.4 — Canonical good-care branch.
- ZubaEagermon → Duramon (standard, Perfect (Ultimate)): minLevel=15, minFood=40, minHappiness=65, minHpRatio=0.5 — Canonical good-care branch.
- Duramon → Gallantmon (special, Ultimate (Mega)): minLevel=22, minFood=75, minHappiness=65, minHpRatio=0.6, mostFood=berry — Official branch favoured when berry is the food eaten most.
- Duramon → SlashAngemon (special, Ultimate (Mega)): minLevel=22, minFood=75, minHappiness=65, minHpRatio=0.6 — Official untagged evolution.
- Duramon → Durandamon (standard, Ultimate (Mega)): minLevel=22, minFood=75, minHappiness=75, minHpRatio=0.6 — Canonical good-care branch.
- Duramon → Jijimon (neglect, Ultimate (Mega)): minLevel=20, minHpRatio=0, maxFood=35, maxHappiness=35 — Neglect / care-mistake branch.
- ZubaEagermon → Garbagemon (neglect, Perfect (Ultimate)): minLevel=15, minHpRatio=0, maxFood=20, maxHappiness=30 — Neglect / care-mistake branch.
- Zubamon → Numemon (neglect, Adult (Champion)): minLevel=8, minHpRatio=0, maxFood=7, maxHappiness=25 — Official care-mistake evolution.
- Tumblemon → Gotsumon (standard, Child (Rookie)): minLevel=4, minFood=5, minHappiness=45, minHpRatio=0.35 — Canonical good-care branch.
- Gotsumon → Ankylomon (special, Adult (Champion)): minLevel=8, minFood=15, minHappiness=45, minHpRatio=0.4, mostFood=meat — Official branch favoured when meat is the food eaten most.
- Gotsumon → Gladimon (special, Adult (Champion)): minLevel=8, minFood=15, minHappiness=45, minHpRatio=0.4 — Official untagged evolution.
- Gotsumon → Golemon (special, Adult (Champion)): minLevel=8, minFood=15, minHappiness=45, minHpRatio=0.4 — Official untagged evolution.
- Gotsumon → Icemon (special, Adult (Champion)): minLevel=8, minFood=15, minHappiness=45, minHpRatio=0.4, mostFood=fish — Official branch favoured when fish is the food eaten most.
- Gotsumon → Starmon (special, Adult (Champion)): minLevel=8, minFood=15, minHappiness=45, minHpRatio=0.4 — Official untagged evolution.
- Gotsumon → Tankmon (special, Adult (Champion)): minLevel=8, minFood=15, minHappiness=45, minHpRatio=0.4 — Official untagged evolution.
- Gotsumon → Tortomon (special, Adult (Champion)): minLevel=8, minFood=15, minHappiness=45, minHpRatio=0.4, mostFood=meat — Official branch favoured when meat is the food eaten most.
- Gotsumon → Monochromon (standard, Adult (Champion)): minLevel=8, minFood=15, minHappiness=55, minHpRatio=0.4 — Canonical good-care branch.
- Monochromon → Megadramon (special, Perfect (Ultimate)): minLevel=15, minFood=40, minHappiness=55, minHpRatio=0.5, mostFood=meat — Official branch favoured when meat is the food eaten most.
- Monochromon → MetalGreymon (special, Perfect (Ultimate)): minLevel=15, minFood=40, minHappiness=55, minHpRatio=0.5, mostFood=meat — Official branch favoured when meat is the food eaten most.
- Monochromon → Meteormon (special, Perfect (Ultimate)): minLevel=15, minFood=40, minHappiness=55, minHpRatio=0.5 — Official untagged evolution.
- Monochromon → Triceramon (special, Perfect (Ultimate)): minLevel=15, minFood=40, minHappiness=55, minHpRatio=0.5 — Official untagged evolution.

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


## Competing-stat caps (hidden)

Every evolution edge — standard tree gates and hidden rarity tiers — also has
**maximum** thresholds on *competing* training stats, in addition to the usual
minimums. Too much of the wrong stat blocks a path even if other conditions
are met, so choosing farm training stations is a strategic trade-off.

The layer lives in `js/evo-stat-gates.js` and wraps `TREE.conditionsMet` after
the rarity wrapper. **`js/evolution-tree.js` is not edited.** There are no UI
hints; caps stay hidden like rarity extras.

Tunables sit on `D.EVO_STAT_GATES` (defaults documented here). Themes are
derived from a branch's kind plus the target's type / name:

| Theme | Typical lines | Competing caps (defaults) |
| --- | --- | --- |
| strength | Dinosaur / dragon / warrior lines | `maxIntelligence` 48, loose `maxAgility` 80 |
| wisdom | Wizard / machine / vegetation | `maxOffense` 40, or `offense <= 2 × intelligence` |
| speed | Bird / insect / aquatic | `maxOffense` 48 (raw strength) |
| balance | Angel / holy / mixed | `offense <= 2 × intelligence` and the converse; similar agility ratios |
| brute | neglect / dark / fallback / recover, plus slime–undead types | no competing max |

If a species would have every outgoing edge capped, one neglect / dark /
fallback (or the last remaining edge) is marked **brute** so a lopsided build
always has a path. T1 standard routes such as Agumon → Greymon still work
with zero training — caps are maxima, not new minima. Rarity extras may add
tighter `maxOffense` / `minOffense` (and intelligence / agility) on T2–T5;
the tighter of the derived cap and the extra wins.

`node scripts/validate-evo.js` asserts no edge has min > max on the same
stat, that caps never make a node unreachable (including under lopsided
vectors), and that a lopsided strength spread blocks a balance line while
still allowing a strength line.
