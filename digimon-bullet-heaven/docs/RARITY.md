# Hidden 5-tier rarity (DEVELOPER ONLY)

This file is a secret design table. **Never surface tiers, rarity labels, or this document in the player-facing game.** No in-game wiki, no hints, no HUD badges. The only runtime view is `?debug=1&tiers=1`.

The layer lives in `js/rarity.js` and wraps `EVO_TREE.conditionsMet` at runtime. `js/evolution-tree.js` is not modified. Existing T1 numeric gates (Agumon → Greymon, etc.) keep their original minLevel / minFood / minHappiness / minHpRatio values.

## Tiers

- **Tier 1 Common** — Base forms and first evolutions (Agumon → Greymon). Almost everyone sees them. No extra rarity conditions.
- **Tier 2 Uncommon** — Second-stage or branching forms that need **one** real condition (friendship/bond threshold, undamaged KO streak, or an existing distinctive tree condition such as mostFood / item / attribute KOs). Missable, not brutal.
- **Tier 3 Rare** — Combination of the tree's stat minimums **plus** a hidden mood **plus** a time-of-day trigger (real local clock **or** the in-game 180s day cycle). MetalGreymon lives here. The Greymon → MetalGreymon fallback uses the same extras, so it is not a cheap skip. Might take run 3 or run 30.
- **Tier 4 Epic** — Single-run miracles: peak joy, a precise emotion (rapt / devoted), and a narrow `miracle` window that opens about once per session (~18s) and then closes for good.
- **Tier 5 Legendary** — Roughly one-in-a-hundred, nearly anti-designed. Examples: refuse food for several starve/farm cycles; ignore the partner during a silent omen pulse; deliberately faint during a short `trial` window. Should feel like a rumor.

Tiers 4–5 are slightly unfair on purpose: they test whether you were paying attention, not whether you were patient.

## Counts

| Tier | Species | Edges |
| --- | ---: | ---: |
| 1 Common | 125 | 409 |
| 2 Uncommon | 45 | 129 |
| 3 Rare | 47 | 410 |
| 4 Epic | 37 | 332 |
| 5 Legendary | 10 | 47 |

## Mood and signals

The player HUD still shows only the existing happiness strip (Joyful / Happy / Content / …). Hidden emotions (`fierce`, `proud`, `focused`, `rapt`, `devoted`, `stubborn`, `sulky`, `lonely`, `neglected`, `desperate`, `wary`) are derived from joy, proximity, undamaged streaks, refusals, starve cycles, and desperation. They appear only in the dev panel.

Tracked signals (on the run object, persisted discoveries only on the profile):

- `ignoredSeconds` — partner farther than 220px from the tamer
- `ignoredDuringEvent` — ignored while the silent once-per-run omen pulse is open
- `refusedFoodCycles` — feed attempts turned down (stubborn/sulky after a starve cycle; food is not consumed). Never refuses at critical hunger.
- `deliberateLoss` — partner fainted while the short `trial` window was open
- `undamagedKills` / `starveCycles` / `bond`

Time of day matches if **either** the real local clock **or** the in-game cycle (180s/day: dawn, morning, midday, dusk, night) is in the required period.

## Farm hooks (pending ids 14–17)

Digifarm care is still queued. Mood and signals are shaped so the farm can plug in without retuning this table:

- Interval schedule: **3, 6, 10** minutes, then **+4** minutes each later cycle (`D.rarity.farmIntervalMinutes(i)` / `D.FARM_CARE`).
- Call `D.rarity.onFarmCycle({ run, ignored, refusedFood, fed, event, seconds, careMistake, hungryExit })` from the intermission.
- Farm training writes `run.trainStats` (`offense`, `intelligence`, `agility`) and `run.bondTrain`. `attachStats` forwards them. Rarity extras may name `minOffense` / `maxOffense` (and intelligence / agility / bond).
- Pending: (14) farm intermission, (15) item split, (16) dual input, (17) farm interval schedule + battle countdown → overtime timer.

## Competing-stat caps (hidden)

Regular and hidden-rarity edges also carry **maximums on competing training
stats**. Derivation, tunables, and the brute/neglect fallback are documented
in `docs/EVOLUTION.md` and implemented in `js/evo-stat-gates.js` (wraps
`conditionsMet` after this rarity layer). There are no player-facing hints.
A lopsided strength build is blocked from a balance line and still allowed
on a strength line; every species keeps at least one reachable branch.

## Brawl edge (later co-op)

Every species has a `tier` field (`D.tierOf(id)`, also `D.SPECIES[id].tier`). `D.brawlMods(tier)` and `D.brawlOdds(tierA, tierB)` give a small HP / regen / extra-move edge. Example: tier 5 vs tier 1 lands near 72–28, not 99–1, so upsets stay possible. Odds UI and the brawl itself are not built in this pass.

Reachability: every species must remain reachable from a Baby or from a pre-existing root with no incoming edge (Beatbreak Chiropmon and Pristimon have no UP baby forms, so they are themselves starters). The rarity layer does not add or remove branches.

Discovery tracking is stored on the profile via `js/storage.js` (`save.discoveries.species` / `save.discoveries.edges`). It is not shown in the game over screen or any bestiary.

## Assignment rules

1. Baby I / Baby II / Rookie → tier 1. Standard (or recover) first Champions, and neglect-only leftovers such as Numemon, → tier 1.
2. Alternate Champions (special / dark / armor) and Armor forms → tier 2.
3. Ultimates → tier 3, unless they are *only* reachable by warp / fusion / dark / mode, in which case they are tier 4.
4. Megas with a standard/fallback path → tier 4. Standard-less Megas and every Mega+ → tier 5.
5. Edge tier follows the destination (so fallback to MetalGreymon is also 3). T1 destinations never gain hidden extras.

Hand overrides: MetalGreymon = 3 (fierce + dawn/dusk); WarGreymon / MetalGarurumon = 4; BlackWarGreymon, Apocalymon, Diaboromon, MaloMyotismon, Armageddemon, Imperialdramon Fighter Mode = 5; classic rookies and first Champions stay 1.

## Species table

| Id | Name | Stage | Tier |
| --- | --- | --- | ---: |
| `aegiochusmon` | Aegiochusmon | Ultimate | 3 |
| `aegiomon` | Aegiomon | Champion | 2 |
| `agumon` | Agumon | Rookie | 1 |
| `akatorimon` | Akatorimon | Champion | 2 |
| `andromon` | Andromon | Ultimate | 3 |
| `angemon` | Angemon | Champion | 1 |
| `angewomon` | Angewomon | Ultimate | 3 |
| `ankiromon` | Ankylomon | Champion | 1 |
| `apocalymon` | Apocalymon | Mega | 5 |
| `apollomon` | Apollomon | Mega | 4 |
| `aquilamon` | Aquilamon | Champion | 1 |
| `armadillomon` | Armadillomon | Rookie | 1 |
| `armageddemon` | Armageddemon | Mega+ | 5 |
| `atratusmon_beatbreak` | Atratusmon | Mega | 5 |
| `bakemon` | Bakemon | Champion | 1 |
| `birdramon` | Birdramon | Champion | 1 |
| `biyomon` | Biyomon | Rookie | 1 |
| `blackwargreymon` | BlackWarGreymon | Mega | 5 |
| `bluemeramon` | BlueMeramon | Ultimate | 3 |
| `botamon` | Botamon | Baby I | 1 |
| `bryweludramon` | BryweLudramon | Mega | 4 |
| `budmon` | Budmon | Baby II | 1 |
| `bukamon` | Bukamon | Baby II | 1 |
| `candlemon` | Candlemon | Rookie | 1 |
| `cherrymon` | Cherrymon | Ultimate | 3 |
| `chibomon` | Chibomon | Baby I | 1 |
| `chiropmon_beatbreak` | Chiropmon | Rookie | 1 |
| `choromon` | Choromon | Baby I | 1 |
| `clockmon` | Clockmon | Champion | 1 |
| `cotsucomon` | Cotsucomon | Baby I | 1 |
| `crabmon` | Crabmon | Rookie | 1 |
| `cupimon` | Cupimon | Baby II | 1 |
| `datamon` | Datamon | Ultimate | 3 |
| `demidevimon` | DemiDevimon | Rookie | 1 |
| `demimeramon` | DemiMeramon | Baby II | 1 |
| `demiveemon` | DemiVeemon | Baby II | 1 |
| `devidramon` | Devidramon | Champion | 1 |
| `devimon` | Devimon | Champion | 1 |
| `diablomon` | Diaboromon | Mega | 5 |
| `dianamon` | Dianamon | Mega | 5 |
| `digitamamon` | Digitamamon | Ultimate | 3 |
| `digmon` | Digmon | Armor | 2 |
| `dinobeemon` | Dinobeemon | Ultimate | 3 |
| `divermon` | Divermon | Ultimate | 3 |
| `dokugumon` | Dokugumon | Champion | 2 |
| `dracmon` | Dracmon | Rookie | 1 |
| `duramon` | Duramon | Ultimate | 3 |
| `durandamon` | Durandamon | Mega | 4 |
| `ebidramon` | Ebidramon | Champion | 1 |
| `espimon` | Espimon | Rookie | 1 |
| `etemon` | Etemon | Ultimate | 4 |
| `exveemon` | ExVeemon | Champion | 1 |
| `flamedramon` | Flamedramon | Armor | 2 |
| `flarerizamon` | Flarerizamon | Champion | 2 |
| `flymon` | Flymon | Champion | 1 |
| `frigimon` | Frigimon | Champion | 2 |
| `fumamon` | Fumamon | Ultimate | 4 |
| `gabumon` | Gabumon | Rookie | 1 |
| `gallantmon` | Gallantmon | Mega | 4 |
| `garbagemon` | Garbagemon | Ultimate | 3 |
| `gargomon` | Gargomon | Champion | 1 |
| `garudamon` | Garudamon | Ultimate | 3 |
| `garurumon` | Garurumon | Champion | 1 |
| `gatomon` | Gatomon | Champion | 1 |
| `gazimon` | Gazimon | Rookie | 1 |
| `gekkomon` | Gekkomon | Rookie | 1 |
| `gekomon` | Gekomon | Champion | 1 |
| `gesomon` | Gesomon | Champion | 1 |
| `ghostmon` | Ghostmon | Rookie | 1 |
| `gigadramon` | Gigadramon | Ultimate | 3 |
| `gigimon` | Gigimon | Baby II | 1 |
| `gizamon` | Gizamon | Rookie | 1 |
| `gladimon` | Gladimon | Champion | 1 |
| `golemon` | Golemon | Champion | 2 |
| `gomamon` | Gomamon | Rookie | 1 |
| `gotsumon` | Gotsumon | Rookie | 1 |
| `greymon` | Greymon | Champion | 1 |
| `growlmon` | Growlmon | Champion | 1 |
| `guardromon` | Guardromon | Champion | 1 |
| `guardromon_gold` | Guardromon (Gold) | Champion | 2 |
| `guilmon` | Guilmon | Rookie | 1 |
| `gummymon` | Gummymon | Baby II | 1 |
| `hagurumon` | Hagurumon | Rookie | 1 |
| `halsemon` | Halsemon | Armor | 2 |
| `hawkmon` | Hawkmon | Rookie | 1 |
| `heavyleomon` | HeavyLeomon | Mega | 4 |
| `herculeskabuterimon` | HerculesKabuterimon | Mega | 4 |
| `hi-commandramon` | Hi-Commandramon | Champion | 2 |
| `hiandromon` | HiAndromon | Mega | 4 |
| `hippogryphonmon` | Hippogryphonmon | Ultimate | 4 |
| `hoverespimon` | HoverEspimon | Champion | 1 |
| `hudiemon` | Hudiemon | Champion | 2 |
| `hydramon` | Hydramon | Mega | 5 |
| `icemon` | Icemon | Champion | 2 |
| `ikkakumon` | Ikkakumon | Champion | 1 |
| `imperialdramon_dragonmode` | Imperialdramon (Dragon Mode) | Mega | 4 |
| `imperialdramon_fightermode` | Imperialdramon (Fighter Mode) | Mega+ | 5 |
| `infermon` | Infermon | Ultimate | 3 |
| `jagamon` | Jagamon | Ultimate | 3 |
| `jazardmon` | Jazardmon | Champion | 2 |
| `jazarichmon` | Jazarichmon | Ultimate | 3 |
| `jijimon` | Jijimon | Mega | 4 |
| `jyarimon` | Jyarimon | Baby I | 1 |
| `kabuterimon` | Kabuterimon | Champion | 1 |
| `kakkinmon` | Kakkinmon | Baby II | 1 |
| `keramon` | Keramon | Rookie | 1 |
| `kimeramon` | Kimeramon | Ultimate | 4 |
| `kiwimon` | Kiwimon | Champion | 2 |
| `knightmon` | Knightmon | Ultimate | 3 |
| `kodokugumon` | Kodokugumon | Baby II | 1 |
| `kokabuterimon` | Kokabuterimon | Rookie | 1 |
| `kokatorimon` | Kokatorimon | Champion | 2 |
| `kokuwamon` | Kokuwamon | Rookie | 1 |
| `koromon` | Koromon | Baby II | 1 |
| `kuramon` | Kuramon | Baby I | 1 |
| `kuwagamon` | Kuwagamon | Champion | 1 |
| `kyubimon` | Kyubimon | Champion | 1 |
| `kyukimon` | Kyukimon | Ultimate | 4 |
| `ladydevimon` | LadyDevimon | Ultimate | 3 |
| `lalamon` | Lalamon | Rookie | 1 |
| `lavogaritamon` | Lavogaritamon | Ultimate | 3 |
| `lavorvomon` | Lavorvomon | Champion | 2 |
| `leafmon` | Leafmon | Baby I | 1 |
| `leomon` | Leomon | Champion | 2 |
| `lilamon` | Lilamon | Ultimate | 3 |
| `lillymon` | Lillymon | Ultimate | 3 |
| `loaderliomon` | Loaderliomon | Ultimate | 3 |
| `ludomon` | Ludomon | Rookie | 1 |
| `machinedramon` | Machinedramon | Mega | 4 |
| `machmon` | Machmon | Champion | 2 |
| `madleomon` | MadLeomon | Champion | 2 |
| `magnaangemon` | MagnaAngemon | Ultimate | 3 |
| `magnadramon` | Magnadramon | Mega | 4 |
| `magnamon` | Magnamon | Armor | 2 |
| `malomyotismon` | MaloMyotismon | Mega | 5 |
| `mammothmon` | Mammothmon | Ultimate | 3 |
| `marinbullmon` | Marinbullmon | Ultimate | 4 |
| `megadramon` | Megadramon | Ultimate | 3 |
| `megagargomon` | MegaGargomon | Mega | 4 |
| `megakabuterimon` | MegaKabuterimon | Ultimate | 3 |
| `megaseadramon` | MegaSeadramon | Ultimate | 3 |
| `mekanorimon` | Mekanorimon | Champion | 2 |
| `meramon` | Meramon | Champion | 1 |
| `metalgarurumon` | MetalGarurumon | Mega | 4 |
| `metalgreymon` | MetalGreymon | Ultimate | 3 |
| `metalseadramon` | MetalSeadramon | Mega | 4 |
| `meteormon` | Meteormon | Ultimate | 3 |
| `minervamon` | Minervamon | Mega | 4 |
| `minomon` | Minomon | Baby II | 1 |
| `missimon` | Missimon | Baby II | 1 |
| `mojyamon` | Mojyamon | Champion | 2 |
| `monochromon` | Monochromon | Champion | 1 |
| `monzaemon` | Monzaemon | Ultimate | 3 |
| `motimon` | Motimon | Baby II | 1 |
| `murasamemon_beatbreak` | Murasamemon | Ultimate | 4 |
| `mushroomon` | Mushroomon | Rookie | 1 |
| `myotismon` | Myotismon | Ultimate | 3 |
| `nefertimon` | Nefertimon | Armor | 2 |
| `numemon` | Numemon | Champion | 1 |
| `nyaromon` | Nyaromon | Baby II | 1 |
| `nyokimon` | Nyokimon | Baby I | 1 |
| `oboromon` | Oboromon | Champion | 2 |
| `octmon` | Octomon | Champion | 2 |
| `okuwamon` | Okuwamon | Ultimate | 3 |
| `otamamon` | Otamamon | Rookie | 1 |
| `pabumon` | Pabumon | Baby I | 1 |
| `pagumon` | Pagumon | Baby II | 1 |
| `paildramon` | Paildramon | Ultimate | 3 |
| `palmon` | Palmon | Rookie | 1 |
| `parrotmon` | Parrotmon | Ultimate | 4 |
| `patamon` | Patamon | Rookie | 1 |
| `pegasusmon` | Pegasusmon | Armor | 2 |
| `petermon` | Petermon | Champion | 2 |
| `phantomon` | Phantomon | Ultimate | 3 |
| `phoenixmon` | Phoenixmon | Mega | 4 |
| `pichimon` | Pichimon | Baby I | 1 |
| `piedmon` | Piedmon | Mega | 4 |
| `pinamon` | Pinamon | Baby II | 1 |
| `piximon` | Piximon | Ultimate | 3 |
| `polarbearmon` | Polarbearmon | Ultimate | 4 |
| `porcupamon` | Porcupamon | Champion | 2 |
| `poromon` | Poromon | Baby II | 1 |
| `poyomon` | Poyomon | Baby I | 1 |
| `pristimon_beatbreak` | Pristimon | Rookie | 1 |
| `pumpkinmon` | Pumpkinmon | Ultimate | 4 |
| `punimon` | Punimon | Baby I | 1 |
| `puppetmon` | Puppetmon | Mega | 5 |
| `pupumon` | Pupumon | Baby I | 1 |
| `pururumon` | Pururumon | Baby I | 1 |
| `putimon` | Putimon | Baby I | 1 |
| `puwamon` | Puwamon | Baby I | 1 |
| `raijiludomon` | RaijiLudomon | Ultimate | 3 |
| `rapidmon` | Rapidmon | Ultimate | 3 |
| `raremon` | Raremon | Champion | 1 |
| `redvegiemon` | RedVegiemon | Champion | 1 |
| `relemon` | Relemon | Baby I | 1 |
| `renamon` | Renamon | Rookie | 1 |
| `roachmon` | Roachmon | Champion | 1 |
| `rosemon` | Rosemon | Mega | 4 |
| `sakumon` | Sakumon | Baby I | 1 |
| `sakuttomon` | Sakuttomon | Baby II | 1 |
| `sakuyamon` | Sakuyamon | Mega | 4 |
| `salamon` | Salamon | Rookie | 1 |
| `sangomon` | Sangomon | Rookie | 1 |
| `scorpiomon` | Scorpiomon | Ultimate | 4 |
| `seadramon` | Seadramon | Champion | 2 |
| `seraphimon` | Seraphimon | Mega | 4 |
| `shakkoumon` | Shakkoumon | Ultimate | 3 |
| `shellmon` | Shellmon | Champion | 2 |
| `shogungekomon` | ShogunGekomon | Ultimate | 3 |
| `shoutmon_xroswars` | Shoutmon | Rookie | 1 |
| `silphymon` | Silphymon | Ultimate | 3 |
| `sistermon_ciel` | Sistermon Ciel | Champion | 2 |
| `sistermon_noir` | Sistermon Noir | Champion | 2 |
| `skadimon` | Skadimon | Mega | 4 |
| `skullknightmon` | SkullKnightmon | Champion | 2 |
| `slashangemon` | SlashAngemon | Mega | 4 |
| `solarmon` | Solarmon | Rookie | 1 |
| `starmon` | Starmon | Champion | 2 |
| `stingmon` | Stingmon | Champion | 1 |
| `sunflowmon` | Sunflowmon | Champion | 1 |
| `syakomon` | Syakomon | Rookie | 1 |
| `tanemon` | Tanemon | Baby II | 1 |
| `tankdramon` | Tankdramon | Ultimate | 3 |
| `tankmon` | Tankmon | Champion | 2 |
| `taomon` | Taomon | Ultimate | 3 |
| `tentomon` | Tentomon | Rookie | 1 |
| `terriermon` | Terriermon | Rookie | 1 |
| `tialudomon` | TiaLudomon | Champion | 1 |
| `tobiumon` | Tobiumon | Champion | 2 |
| `togemon` | Togemon | Champion | 1 |
| `tokomon` | Tokomon | Baby II | 1 |
| `tortomon` | Tortomon | Champion | 2 |
| `triceramon` | Triceramon | Ultimate | 4 |
| `troopmon` | Troopmon | Champion | 2 |
| `tsubumon` | Tsubumon | Baby I | 1 |
| `tsumemon` | Tsumemon | Baby II | 1 |
| `tsunomon` | Tsunomon | Baby II | 1 |
| `tumblemon` | Tumblemon | Baby II | 1 |
| `tuskmon` | Tuskmon | Champion | 2 |
| `tyrannomon` | Tyrannomon | Champion | 2 |
| `unimon` | Unimon | Champion | 2 |
| `upamon` | Upamon | Baby II | 1 |
| `valkyrimon` | Valkyrimon | Mega | 4 |
| `veemon` | Veemon | Rookie | 1 |
| `vikemon` | Vikemon | Mega | 4 |
| `vilemon` | Vilemon | Champion | 1 |
| `viximon` | Viximon | Baby II | 1 |
| `wargreymon` | WarGreymon | Mega | 4 |
| `wargrowlmon` | WarGrowlmon | Ultimate | 3 |
| `warumonzaemon` | WaruMonzaemon | Ultimate | 3 |
| `weregarurumon` | WereGarurumon | Ultimate | 3 |
| `wingdramon` | Wingdramon | Ultimate | 3 |
| `woodmon` | Woodmon | Champion | 2 |
| `wormmon` | Wormmon | Rookie | 1 |
| `yakiimon` | Yaki-imon | Champion | 2 |
| `yokomon` | Yokomon | Baby II | 1 |
| `youkomon` | Youkomon | Champion | 2 |
| `yukimibotamon` | YukimiBotamon | Baby I | 1 |
| `yuramon` | Yuramon | Baby I | 1 |
| `zerimon` | Zerimon | Baby I | 1 |
| `zubaeagermon` | ZubaEagermon | Champion | 1 |
| `zubamon` | Zubamon | Rookie | 1 |
| `zudomon` | Zudomon | Ultimate | 3 |

## Full edge table

| From | To | Kind | Tier | Hidden extras |
| --- | --- | --- | ---: | --- |
| `aegiochusmon` | `apollomon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `aegiochusmon` | `apollomon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `aegiochusmon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `aegiomon` | `aegiochusmon` | fallback | 3 | mood="focused", timeOfDay=dawn|dusk |
| `aegiomon` | `aegiochusmon` | standard | 3 | mood="fierce", timeOfDay=dawn |
| `aegiomon` | `garbagemon` | neglect | 3 | mood="fierce", timeOfDay=dusk |
| `agumon` | `bakemon` | neglect | 1 | (none — existing gate only) |
| `agumon` | `blackwargreymon` | warp | 5 | minStarveCycles=3, minIgnoredSeconds=45, mood="neglected" |
| `agumon` | `devidramon` | dark | 1 | (none — existing gate only) |
| `agumon` | `flarerizamon` | special | 2 | (none — existing gate only) |
| `agumon` | `greymon` | fallback | 1 | (none — existing gate only) |
| `agumon` | `greymon` | standard | 1 | (none — existing gate only) |
| `agumon` | `meramon` | special | 1 | (none — existing gate only) |
| `agumon` | `monochromon` | special | 1 | (none — existing gate only) |
| `agumon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `agumon` | `tuskmon` | special | 2 | (none — existing gate only) |
| `agumon` | `tyrannomon` | special | 2 | (none — existing gate only) |
| `agumon` | `wargreymon` | warp | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `akatorimon` | `digitamamon` | fallback | 3 | mood="proud", timeOfDay=dawn |
| `akatorimon` | `digitamamon` | standard | 3 | mood="focused", timeOfDay=dawn |
| `akatorimon` | `garbagemon` | neglect | 3 | mood="proud", timeOfDay=dawn|dusk |
| `akatorimon` | `garudamon` | special | 3 | mood="focused", timeOfDay=dawn|dusk |
| `akatorimon` | `parrotmon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `akatorimon` | `piximon` | special | 3 | mood="focused", timeOfDay=midday |
| `andromon` | `hiandromon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `andromon` | `hiandromon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `andromon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `andromon` | `machinedramon` | dark | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `angemon` | `devimon` | dark | 1 | (none — existing gate only) |
| `angemon` | `garbagemon` | neglect | 3 | mood="proud", timeOfDay=midday |
| `angemon` | `hippogryphonmon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `angemon` | `magnaangemon` | fallback | 3 | mood="proud", timeOfDay=dawn|dusk |
| `angemon` | `magnaangemon` | standard | 3 | mood="focused", timeOfDay=night |
| `angemon` | `myotismon` | dark | 3 | mood="proud", timeOfDay=night |
| `angemon` | `shakkoumon` | fusion | 3 | mood="fierce", timeOfDay=dawn |
| `angewomon` | `jijimon` | neglect | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `angewomon` | `ladydevimon` | dark | 3 | mood="fierce", timeOfDay=dusk |
| `angewomon` | `magnadramon` | fallback | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `angewomon` | `magnadramon` | standard | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `angewomon` | `rosemon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `angewomon` | `seraphimon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `angewomon` | `valkyrimon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `ankiromon` | `garbagemon` | neglect | 3 | mood="proud", timeOfDay=dusk |
| `ankiromon` | `meteormon` | fallback | 3 | mood="proud", timeOfDay=dawn|dusk |
| `ankiromon` | `meteormon` | standard | 3 | mood="fierce", timeOfDay=night |
| `ankiromon` | `shakkoumon` | fusion | 3 | mood="fierce", timeOfDay=dawn |
| `ankiromon` | `triceramon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `ankiromon` | `zudomon` | special | 3 | mood="fierce", timeOfDay=dusk |
| `aquilamon` | `garbagemon` | neglect | 3 | mood="proud", timeOfDay=dawn|dusk |
| `aquilamon` | `garudamon` | fallback | 3 | mood="focused", timeOfDay=night |
| `aquilamon` | `garudamon` | standard | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `aquilamon` | `hippogryphonmon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `aquilamon` | `parrotmon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `aquilamon` | `silphymon` | fusion | 3 | mood="proud", timeOfDay=dawn|dusk |
| `armadillomon` | `ankiromon` | fallback | 1 | (none — existing gate only) |
| `armadillomon` | `ankiromon` | standard | 1 | (none — existing gate only) |
| `armadillomon` | `digmon` | armor | 2 | (none — existing gate only) |
| `armadillomon` | `golemon` | special | 2 | minUndamagedKills=8 |
| `armadillomon` | `monochromon` | special | 1 | (none — existing gate only) |
| `armadillomon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `armadillomon` | `shellmon` | special | 2 | (none — existing gate only) |
| `armadillomon` | `tortomon` | special | 2 | (none — existing gate only) |
| `bakemon` | `ladydevimon` | dark | 3 | mood="focused", timeOfDay=dawn |
| `bakemon` | `myotismon` | fallback | 3 | mood="proud", timeOfDay=midday |
| `bakemon` | `myotismon` | standard | 3 | mood="focused", timeOfDay=dusk |
| `bakemon` | `phantomon` | special | 3 | mood="focused", timeOfDay=midday |
| `bakemon` | `pumpkinmon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `bakemon` | `warumonzaemon` | neglect | 3 | mood="focused", timeOfDay=midday |
| `birdramon` | `garbagemon` | neglect | 3 | mood="proud", timeOfDay=midday |
| `birdramon` | `garudamon` | fallback | 3 | mood="proud", timeOfDay=dawn|dusk |
| `birdramon` | `garudamon` | standard | 3 | mood="proud", timeOfDay=night |
| `birdramon` | `hippogryphonmon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `birdramon` | `parrotmon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `biyomon` | `akatorimon` | special | 2 | (none — existing gate only) |
| `biyomon` | `aquilamon` | special | 1 | (none — existing gate only) |
| `biyomon` | `bakemon` | neglect | 1 | (none — existing gate only) |
| `biyomon` | `birdramon` | fallback | 1 | (none — existing gate only) |
| `biyomon` | `birdramon` | standard | 1 | (none — existing gate only) |
| `biyomon` | `kiwimon` | special | 2 | (none — existing gate only) |
| `biyomon` | `kokatorimon` | dark | 2 | (none — existing gate only) |
| `biyomon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `biyomon` | `unimon` | special | 2 | (none — existing gate only) |
| `bluemeramon` | `apollomon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `bluemeramon` | `jijimon` | neglect | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `bluemeramon` | `machinedramon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `bluemeramon` | `machinedramon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `bluemeramon` | `piedmon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `botamon` | `demimeramon` | special | 1 | (none — existing gate only) |
| `botamon` | `koromon` | fallback | 1 | (none — existing gate only) |
| `botamon` | `koromon` | standard | 1 | (none — existing gate only) |
| `botamon` | `pagumon` | neglect | 1 | (none — existing gate only) |
| `budmon` | `gazimon` | neglect | 1 | (none — existing gate only) |
| `budmon` | `lalamon` | fallback | 1 | (none — existing gate only) |
| `budmon` | `lalamon` | standard | 1 | (none — existing gate only) |
| `budmon` | `mushroomon` | special | 1 | (none — existing gate only) |
| `budmon` | `palmon` | special | 1 | (none — existing gate only) |
| `bukamon` | `crabmon` | special | 1 | (none — existing gate only) |
| `bukamon` | `gazimon` | neglect | 1 | (none — existing gate only) |
| `bukamon` | `gizamon` | special | 1 | (none — existing gate only) |
| `bukamon` | `gomamon` | fallback | 1 | (none — existing gate only) |
| `bukamon` | `gomamon` | standard | 1 | (none — existing gate only) |
| `bukamon` | `otamamon` | special | 1 | (none — existing gate only) |
| `bukamon` | `sangomon` | special | 1 | (none — existing gate only) |
| `bukamon` | `syakomon` | special | 1 | (none — existing gate only) |
| `candlemon` | `bakemon` | special | 1 | (none — existing gate only) |
| `candlemon` | `clockmon` | special | 1 | (none — existing gate only) |
| `candlemon` | `devimon` | dark | 1 | (none — existing gate only) |
| `candlemon` | `flarerizamon` | special | 2 | (none — existing gate only) |
| `candlemon` | `meramon` | fallback | 1 | (none — existing gate only) |
| `candlemon` | `meramon` | standard | 1 | (none — existing gate only) |
| `candlemon` | `raremon` | neglect | 1 | (none — existing gate only) |
| `candlemon` | `woodmon` | special | 2 | (none — existing gate only) |
| `cherrymon` | `hydramon` | special | 5 | minStarveCycles=3, minIgnoredSeconds=45, mood="neglected" |
| `cherrymon` | `jijimon` | neglect | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `cherrymon` | `jijimon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `cherrymon` | `puppetmon` | special | 5 | minRefusedFood=3, mood="stubborn" |
| `cherrymon` | `rosemon` | fallback | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `cherrymon` | `rosemon` | standard | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `chibomon` | `demiveemon` | fallback | 1 | (none — existing gate only) |
| `chibomon` | `demiveemon` | standard | 1 | (none — existing gate only) |
| `chibomon` | `pagumon` | neglect | 1 | (none — existing gate only) |
| `chiropmon_beatbreak` | `bakemon` | special | 1 | (none — existing gate only) |
| `chiropmon_beatbreak` | `devimon` | fallback | 1 | (none — existing gate only) |
| `chiropmon_beatbreak` | `devimon` | standard | 1 | (none — existing gate only) |
| `chiropmon_beatbreak` | `numemon` | neglect | 1 | (none — existing gate only) |
| `choromon` | `kakkinmon` | special | 1 | (none — existing gate only) |
| `choromon` | `missimon` | fallback | 1 | (none — existing gate only) |
| `choromon` | `missimon` | standard | 1 | (none — existing gate only) |
| `choromon` | `motimon` | special | 1 | (none — existing gate only) |
| `choromon` | `pagumon` | neglect | 1 | (none — existing gate only) |
| `choromon` | `sakuttomon` | special | 1 | (none — existing gate only) |
| `clockmon` | `andromon` | special | 3 | mood="focused", timeOfDay=dusk |
| `clockmon` | `datamon` | special | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `clockmon` | `garbagemon` | neglect | 3 | mood="proud", timeOfDay=dusk |
| `clockmon` | `knightmon` | fallback | 3 | mood="proud", timeOfDay=dusk |
| `clockmon` | `knightmon` | standard | 3 | mood="proud", timeOfDay=dusk |
| `clockmon` | `phantomon` | dark | 3 | mood="focused", timeOfDay=midday |
| `cotsucomon` | `kakkinmon` | fallback | 1 | (none — existing gate only) |
| `cotsucomon` | `kakkinmon` | standard | 1 | (none — existing gate only) |
| `cotsucomon` | `pagumon` | neglect | 1 | (none — existing gate only) |
| `cotsucomon` | `tumblemon` | special | 1 | (none — existing gate only) |
| `crabmon` | `ebidramon` | fallback | 1 | (none — existing gate only) |
| `crabmon` | `ebidramon` | standard | 1 | (none — existing gate only) |
| `crabmon` | `gesomon` | special | 1 | (none — existing gate only) |
| `crabmon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `crabmon` | `raremon` | neglect | 1 | (none — existing gate only) |
| `crabmon` | `seadramon` | special | 2 | (none — existing gate only) |
| `crabmon` | `shellmon` | special | 2 | (none — existing gate only) |
| `cupimon` | `gazimon` | neglect | 1 | (none — existing gate only) |
| `cupimon` | `patamon` | fallback | 1 | (none — existing gate only) |
| `cupimon` | `patamon` | standard | 1 | (none — existing gate only) |
| `cupimon` | `salamon` | special | 1 | (none — existing gate only) |
| `cupimon` | `terriermon` | special | 1 | (none — existing gate only) |
| `datamon` | `diablomon` | dark | 5 | minRefusedFood=3, mood="stubborn" |
| `datamon` | `hiandromon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `datamon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `datamon` | `machinedramon` | fallback | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `datamon` | `machinedramon` | standard | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `demidevimon` | `bakemon` | special | 1 | (none — existing gate only) |
| `demidevimon` | `devidramon` | special | 1 | (none — existing gate only) |
| `demidevimon` | `devimon` | fallback | 1 | (none — existing gate only) |
| `demidevimon` | `devimon` | standard | 1 | (none — existing gate only) |
| `demidevimon` | `dokugumon` | special | 2 | minUndamagedKills=8 |
| `demidevimon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `demidevimon` | `raremon` | neglect | 1 | (none — existing gate only) |
| `demidevimon` | `skullknightmon` | special | 2 | minBond=70 |
| `demidevimon` | `vilemon` | special | 1 | (none — existing gate only) |
| `demimeramon` | `candlemon` | fallback | 1 | (none — existing gate only) |
| `demimeramon` | `candlemon` | standard | 1 | (none — existing gate only) |
| `demimeramon` | `gazimon` | neglect | 1 | (none — existing gate only) |
| `demimeramon` | `ghostmon` | special | 1 | (none — existing gate only) |
| `demimeramon` | `solarmon` | special | 1 | (none — existing gate only) |
| `demiveemon` | `gazimon` | neglect | 1 | (none — existing gate only) |
| `demiveemon` | `veemon` | fallback | 1 | (none — existing gate only) |
| `demiveemon` | `veemon` | standard | 1 | (none — existing gate only) |
| `devidramon` | `garbagemon` | neglect | 3 | mood="fierce", timeOfDay=dawn |
| `devidramon` | `gigadramon` | fallback | 3 | mood="focused", timeOfDay=dusk |
| `devidramon` | `gigadramon` | standard | 3 | mood="fierce", timeOfDay=night |
| `devidramon` | `ladydevimon` | special | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `devidramon` | `megadramon` | special | 3 | mood="fierce", timeOfDay=dawn |
| `devidramon` | `myotismon` | special | 3 | mood="proud", timeOfDay=night |
| `devidramon` | `wingdramon` | special | 3 | mood="fierce", timeOfDay=dawn |
| `devimon` | `garbagemon` | neglect | 3 | mood="proud", timeOfDay=night |
| `devimon` | `infermon` | special | 3 | mood="proud", timeOfDay=dusk |
| `devimon` | `ladydevimon` | special | 3 | mood="focused", timeOfDay=night |
| `devimon` | `megadramon` | special | 3 | mood="fierce", timeOfDay=midday |
| `devimon` | `myotismon` | fallback | 3 | mood="focused", timeOfDay=night |
| `devimon` | `myotismon` | standard | 3 | mood="proud", timeOfDay=night |
| `devimon` | `phantomon` | special | 3 | mood="proud", timeOfDay=dawn |
| `devimon` | `skullknightmon` | special | 2 | minUndamagedKills=8 |
| `diablomon` | `armageddemon` | fallback | 5 | ignoredDuringEvent=true, mood="lonely" |
| `diablomon` | `armageddemon` | mode | 5 | deliberateLoss=true, sessionWindow="trial", mood="wary" |
| `diablomon` | `armageddemon` | neglect | 5 | minRefusedFood=2, ignoredDuringEvent=true, mood="stubborn" |
| `diablomon` | `armageddemon` | standard | 5 | deliberateLoss=true, sessionWindow="trial", mood="wary" |
| `digitamamon` | `jijimon` | fallback | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `digitamamon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `digitamamon` | `jijimon` | standard | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `digitamamon` | `minervamon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `digitamamon` | `piedmon` | dark | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `digitamamon` | `rosemon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `digmon` | `garbagemon` | neglect | 3 | mood="proud", timeOfDay=midday |
| `digmon` | `jagamon` | special | 3 | mood="focused", timeOfDay=dawn |
| `digmon` | `megakabuterimon` | special | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `digmon` | `shakkoumon` | fallback | 3 | mood="proud", timeOfDay=dusk |
| `digmon` | `shakkoumon` | standard | 3 | mood="fierce", timeOfDay=dusk |
| `dinobeemon` | `herculeskabuterimon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `dinobeemon` | `imperialdramon_dragonmode` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `dinobeemon` | `imperialdramon_dragonmode` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `dinobeemon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `divermon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `divermon` | `metalseadramon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `divermon` | `metalseadramon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `divermon` | `vikemon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `divermon` | `zudomon` | special | 3 | mood="proud", timeOfDay=dusk |
| `dokugumon` | `garbagemon` | neglect | 3 | mood="fierce", timeOfDay=dusk |
| `dokugumon` | `ladydevimon` | fallback | 3 | mood="proud", timeOfDay=dusk |
| `dokugumon` | `ladydevimon` | standard | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `dokugumon` | `myotismon` | special | 3 | mood="fierce", timeOfDay=midday |
| `dokugumon` | `okuwamon` | special | 3 | mood="fierce", timeOfDay=dawn |
| `dracmon` | `bakemon` | special | 1 | (none — existing gate only) |
| `dracmon` | `devidramon` | special | 1 | (none — existing gate only) |
| `dracmon` | `devimon` | fallback | 1 | (none — existing gate only) |
| `dracmon` | `devimon` | standard | 1 | (none — existing gate only) |
| `dracmon` | `porcupamon` | special | 2 | minUndamagedKills=8 |
| `dracmon` | `raremon` | neglect | 1 | (none — existing gate only) |
| `dracmon` | `vilemon` | special | 1 | (none — existing gate only) |
| `dracmon` | `youkomon` | special | 2 | (none — existing gate only) |
| `duramon` | `durandamon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `duramon` | `durandamon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `duramon` | `gallantmon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `duramon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `duramon` | `slashangemon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `ebidramon` | `garbagemon` | neglect | 3 | mood="focused", timeOfDay=dawn |
| `ebidramon` | `megaseadramon` | fallback | 3 | mood="focused", timeOfDay=dusk |
| `ebidramon` | `megaseadramon` | standard | 3 | mood="proud", timeOfDay=night |
| `ebidramon` | `scorpiomon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `ebidramon` | `shogungekomon` | special | 3 | mood="focused", timeOfDay=midday |
| `espimon` | `guardromon` | special | 1 | (none — existing gate only) |
| `espimon` | `hoverespimon` | fallback | 1 | (none — existing gate only) |
| `espimon` | `hoverespimon` | standard | 1 | (none — existing gate only) |
| `espimon` | `mekanorimon` | special | 2 | minBond=70 |
| `espimon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `etemon` | `jijimon` | fallback | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `etemon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `etemon` | `jijimon` | standard | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `etemon` | `machinedramon` | dark | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `etemon` | `piedmon` | dark | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `exveemon` | `dinobeemon` | fusion | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `exveemon` | `garbagemon` | neglect | 3 | mood="focused", timeOfDay=dusk |
| `exveemon` | `megadramon` | dark | 3 | mood="fierce", timeOfDay=dusk |
| `exveemon` | `paildramon` | fusion | 3 | mood="focused", timeOfDay=dusk |
| `exveemon` | `wingdramon` | fallback | 3 | mood="fierce", timeOfDay=dusk |
| `exveemon` | `wingdramon` | standard | 3 | mood="focused", timeOfDay=dawn |
| `flamedramon` | `garbagemon` | neglect | 3 | mood="proud", timeOfDay=dawn|dusk |
| `flamedramon` | `paildramon` | fallback | 3 | mood="focused", timeOfDay=night |
| `flamedramon` | `paildramon` | standard | 3 | mood="focused", timeOfDay=dusk |
| `flamedramon` | `wargrowlmon` | special | 3 | mood="proud", timeOfDay=dawn|dusk |
| `flamedramon` | `wingdramon` | special | 3 | mood="focused", timeOfDay=dawn|dusk |
| `flarerizamon` | `bluemeramon` | fallback | 3 | mood="proud", timeOfDay=dawn|dusk |
| `flarerizamon` | `bluemeramon` | standard | 3 | mood="focused", timeOfDay=dusk |
| `flarerizamon` | `garbagemon` | neglect | 3 | mood="focused", timeOfDay=dusk |
| `flarerizamon` | `lavogaritamon` | special | 3 | mood="focused", timeOfDay=dawn |
| `flarerizamon` | `megadramon` | dark | 3 | mood="fierce", timeOfDay=midday |
| `flarerizamon` | `metalgreymon` | special | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `flarerizamon` | `wargrowlmon` | special | 3 | mood="fierce", timeOfDay=midday |
| `flymon` | `dinobeemon` | special | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `flymon` | `garbagemon` | neglect | 3 | mood="proud", timeOfDay=midday |
| `flymon` | `megakabuterimon` | special | 3 | mood="proud", timeOfDay=dawn|dusk |
| `flymon` | `okuwamon` | fallback | 3 | mood="focused", timeOfDay=dusk |
| `flymon` | `okuwamon` | standard | 3 | mood="proud", timeOfDay=midday |
| `flymon` | `piximon` | special | 3 | mood="focused", timeOfDay=midday |
| `frigimon` | `garbagemon` | neglect | 3 | mood="fierce", timeOfDay=midday |
| `frigimon` | `mammothmon` | fallback | 3 | mood="fierce", timeOfDay=night |
| `frigimon` | `mammothmon` | standard | 3 | mood="focused", timeOfDay=dawn|dusk |
| `frigimon` | `monzaemon` | special | 3 | mood="fierce", timeOfDay=midday |
| `frigimon` | `polarbearmon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `frigimon` | `zudomon` | special | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `fumamon` | `jijimon` | neglect | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `fumamon` | `sakuyamon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `fumamon` | `sakuyamon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `fumamon` | `slashangemon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `gabumon` | `frigimon` | special | 2 | (none — existing gate only) |
| `gabumon` | `garurumon` | fallback | 1 | (none — existing gate only) |
| `gabumon` | `garurumon` | standard | 1 | (none — existing gate only) |
| `gabumon` | `leomon` | special | 2 | (none — existing gate only) |
| `gabumon` | `metalgarurumon` | warp | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `gabumon` | `mojyamon` | special | 2 | (none — existing gate only) |
| `gabumon` | `monochromon` | special | 1 | (none — existing gate only) |
| `gabumon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `gabumon` | `unimon` | special | 2 | (none — existing gate only) |
| `garbagemon` | `jijimon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `garbagemon` | `jijimon` | neglect | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `garbagemon` | `jijimon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `garbagemon` | `machinedramon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `garbagemon` | `piedmon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `garbagemon` | `puppetmon` | special | 5 | minStarveCycles=3, minIgnoredSeconds=45, mood="neglected" |
| `gargomon` | `garbagemon` | neglect | 3 | mood="fierce", timeOfDay=night |
| `gargomon` | `monzaemon` | special | 3 | mood="focused", timeOfDay=dusk |
| `gargomon` | `rapidmon` | fallback | 3 | mood="proud", timeOfDay=dusk |
| `gargomon` | `rapidmon` | standard | 3 | mood="fierce", timeOfDay=night |
| `gargomon` | `warumonzaemon` | dark | 3 | mood="fierce", timeOfDay=dawn |
| `garudamon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `garudamon` | `phoenixmon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `garudamon` | `phoenixmon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `garudamon` | `valkyrimon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `garurumon` | `garbagemon` | neglect | 3 | mood="fierce", timeOfDay=dawn |
| `garurumon` | `kimeramon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `garurumon` | `mammothmon` | special | 3 | mood="proud", timeOfDay=midday |
| `garurumon` | `skullknightmon` | dark | 2 | (none — existing gate only) |
| `garurumon` | `weregarurumon` | fallback | 3 | mood="focused", timeOfDay=dawn |
| `garurumon` | `weregarurumon` | standard | 3 | mood="focused", timeOfDay=night |
| `garurumon` | `zudomon` | special | 3 | mood="focused", timeOfDay=dusk |
| `gatomon` | `angewomon` | fallback | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `gatomon` | `angewomon` | standard | 3 | mood="fierce", timeOfDay=night |
| `gatomon` | `garbagemon` | neglect | 3 | mood="proud", timeOfDay=midday |
| `gatomon` | `kyukimon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `gatomon` | `ladydevimon` | dark | 3 | mood="fierce", timeOfDay=midday |
| `gatomon` | `lillymon` | special | 3 | mood="fierce", timeOfDay=dusk |
| `gatomon` | `nefertimon` | armor | 2 | (none — existing gate only) |
| `gatomon` | `silphymon` | fusion | 3 | mood="focused", timeOfDay=dawn|dusk |
| `gazimon` | `devidramon` | fallback | 1 | (none — existing gate only) |
| `gazimon` | `devidramon` | standard | 1 | (none — existing gate only) |
| `gazimon` | `devimon` | special | 1 | (none — existing gate only) |
| `gazimon` | `garurumon` | special | 1 | (none — existing gate only) |
| `gazimon` | `leomon` | special | 2 | (none — existing gate only) |
| `gazimon` | `madleomon` | dark | 2 | (none — existing gate only) |
| `gazimon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `gazimon` | `porcupamon` | special | 2 | minBond=70 |
| `gazimon` | `raremon` | neglect | 1 | (none — existing gate only) |
| `gazimon` | `tuskmon` | special | 2 | (none — existing gate only) |
| `gazimon` | `vilemon` | special | 1 | (none — existing gate only) |
| `gekkomon` | `atratusmon_beatbreak` | warp | 5 | deliberateLoss=true, sessionWindow="trial", mood="wary" |
| `gekkomon` | `fumamon` | warp | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `gekkomon` | `gekomon` | fallback | 1 | (none — existing gate only) |
| `gekkomon` | `gekomon` | standard | 1 | (none — existing gate only) |
| `gekkomon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `gekomon` | `digitamamon` | special | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `gekomon` | `garbagemon` | neglect | 3 | mood="focused", timeOfDay=dusk |
| `gekomon` | `shogungekomon` | fallback | 3 | mood="proud", timeOfDay=dusk |
| `gekomon` | `shogungekomon` | standard | 3 | mood="proud", timeOfDay=midday |
| `gesomon` | `divermon` | fallback | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `gesomon` | `divermon` | standard | 3 | mood="focused", timeOfDay=night |
| `gesomon` | `garbagemon` | neglect | 3 | mood="fierce", timeOfDay=dusk |
| `gesomon` | `marinbullmon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `gesomon` | `megaseadramon` | special | 3 | mood="proud", timeOfDay=dusk |
| `gesomon` | `myotismon` | dark | 3 | mood="focused", timeOfDay=dawn |
| `gesomon` | `scorpiomon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `ghostmon` | `bakemon` | fallback | 1 | (none — existing gate only) |
| `ghostmon` | `bakemon` | standard | 1 | (none — existing gate only) |
| `ghostmon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `ghostmon` | `oboromon` | special | 2 | (none — existing gate only) |
| `ghostmon` | `petermon` | special | 2 | minBond=70 |
| `gigadramon` | `jijimon` | neglect | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `gigadramon` | `machinedramon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `gigadramon` | `machinedramon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `gigadramon` | `metalseadramon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `gigadramon` | `wargreymon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `gigimon` | `gazimon` | neglect | 1 | (none — existing gate only) |
| `gigimon` | `guilmon` | fallback | 1 | (none — existing gate only) |
| `gigimon` | `guilmon` | standard | 1 | (none — existing gate only) |
| `gigimon` | `lavorvomon` | special | 2 | (none — existing gate only) |
| `gigimon` | `shoutmon_xroswars` | special | 1 | (none — existing gate only) |
| `gizamon` | `devidramon` | special | 1 | (none — existing gate only) |
| `gizamon` | `ebidramon` | special | 1 | (none — existing gate only) |
| `gizamon` | `gesomon` | fallback | 1 | (none — existing gate only) |
| `gizamon` | `gesomon` | standard | 1 | (none — existing gate only) |
| `gizamon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `gizamon` | `raremon` | neglect | 1 | (none — existing gate only) |
| `gizamon` | `seadramon` | special | 2 | (none — existing gate only) |
| `gizamon` | `tuskmon` | special | 2 | (none — existing gate only) |
| `gizamon` | `tyrannomon` | special | 2 | (none — existing gate only) |
| `gladimon` | `duramon` | special | 3 | mood="proud", timeOfDay=dawn |
| `gladimon` | `garbagemon` | neglect | 3 | mood="focused", timeOfDay=dawn |
| `gladimon` | `knightmon` | fallback | 3 | mood="focused", timeOfDay=dawn |
| `gladimon` | `knightmon` | standard | 3 | mood="focused", timeOfDay=night |
| `gladimon` | `skullknightmon` | dark | 2 | (none — existing gate only) |
| `golemon` | `garbagemon` | neglect | 3 | mood="focused", timeOfDay=dawn|dusk |
| `golemon` | `mammothmon` | fallback | 3 | mood="focused", timeOfDay=dusk |
| `golemon` | `mammothmon` | standard | 3 | mood="focused", timeOfDay=dawn |
| `golemon` | `meteormon` | special | 3 | mood="proud", timeOfDay=dawn |
| `golemon` | `triceramon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `golemon` | `zudomon` | special | 3 | mood="fierce", timeOfDay=night |
| `gomamon` | `ankiromon` | special | 1 | (none — existing gate only) |
| `gomamon` | `bakemon` | neglect | 1 | (none — existing gate only) |
| `gomamon` | `frigimon` | special | 2 | (none — existing gate only) |
| `gomamon` | `gesomon` | special | 1 | (none — existing gate only) |
| `gomamon` | `ikkakumon` | fallback | 1 | (none — existing gate only) |
| `gomamon` | `ikkakumon` | standard | 1 | (none — existing gate only) |
| `gomamon` | `mojyamon` | special | 2 | (none — existing gate only) |
| `gomamon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `gomamon` | `seadramon` | special | 2 | (none — existing gate only) |
| `gomamon` | `shellmon` | special | 2 | (none — existing gate only) |
| `gomamon` | `tortomon` | special | 2 | (none — existing gate only) |
| `gotsumon` | `ankiromon` | special | 1 | (none — existing gate only) |
| `gotsumon` | `gladimon` | special | 1 | (none — existing gate only) |
| `gotsumon` | `golemon` | special | 2 | (none — existing gate only) |
| `gotsumon` | `icemon` | special | 2 | (none — existing gate only) |
| `gotsumon` | `monochromon` | fallback | 1 | (none — existing gate only) |
| `gotsumon` | `monochromon` | standard | 1 | (none — existing gate only) |
| `gotsumon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `gotsumon` | `starmon` | special | 2 | minUndamagedKills=8 |
| `gotsumon` | `tankmon` | special | 2 | minUndamagedKills=8 |
| `gotsumon` | `tortomon` | special | 2 | (none — existing gate only) |
| `greymon` | `garbagemon` | neglect | 3 | mood="focused", timeOfDay=dawn|dusk |
| `greymon` | `gigadramon` | dark | 3 | mood="proud", timeOfDay=dawn |
| `greymon` | `kimeramon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `greymon` | `machinedramon` | dark | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `greymon` | `megadramon` | dark | 3 | mood="fierce", timeOfDay=dawn |
| `greymon` | `metalgreymon` | fallback | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `greymon` | `metalgreymon` | standard | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `greymon` | `triceramon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `greymon` | `wargrowlmon` | special | 3 | mood="proud", timeOfDay=dawn |
| `growlmon` | `garbagemon` | neglect | 3 | mood="focused", timeOfDay=night |
| `growlmon` | `lavogaritamon` | special | 3 | mood="fierce", timeOfDay=dawn |
| `growlmon` | `machinedramon` | dark | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `growlmon` | `megadramon` | dark | 3 | mood="proud", timeOfDay=dusk |
| `growlmon` | `metalgreymon` | special | 3 | mood="proud", timeOfDay=dawn|dusk |
| `growlmon` | `wargrowlmon` | fallback | 3 | mood="proud", timeOfDay=night |
| `growlmon` | `wargrowlmon` | standard | 3 | mood="proud", timeOfDay=dawn|dusk |
| `guardromon` | `andromon` | fallback | 3 | mood="focused", timeOfDay=dusk |
| `guardromon` | `andromon` | standard | 3 | mood="focused", timeOfDay=midday |
| `guardromon` | `datamon` | special | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `guardromon` | `guardromon_gold` | special | 2 | minBond=70 |
| `guardromon` | `rapidmon` | special | 3 | mood="fierce", timeOfDay=dawn |
| `guardromon` | `tankdramon` | special | 3 | mood="proud", timeOfDay=midday |
| `guardromon` | `warumonzaemon` | neglect | 3 | mood="proud", timeOfDay=dawn |
| `guardromon_gold` | `andromon` | fallback | 3 | mood="focused", timeOfDay=night |
| `guardromon_gold` | `andromon` | standard | 3 | mood="fierce", timeOfDay=dawn |
| `guardromon_gold` | `duramon` | special | 3 | mood="proud", timeOfDay=dawn|dusk |
| `guardromon_gold` | `garbagemon` | neglect | 3 | mood="proud", timeOfDay=night |
| `guardromon_gold` | `magnamon` | armor | 2 | (none — existing gate only) |
| `guilmon` | `devidramon` | dark | 1 | (none — existing gate only) |
| `guilmon` | `flarerizamon` | special | 2 | (none — existing gate only) |
| `guilmon` | `gallantmon` | warp | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `guilmon` | `growlmon` | fallback | 1 | (none — existing gate only) |
| `guilmon` | `growlmon` | standard | 1 | (none — existing gate only) |
| `guilmon` | `lavorvomon` | special | 2 | (none — existing gate only) |
| `guilmon` | `meramon` | special | 1 | (none — existing gate only) |
| `guilmon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `guilmon` | `tuskmon` | special | 2 | (none — existing gate only) |
| `guilmon` | `tyrannomon` | special | 2 | (none — existing gate only) |
| `gummymon` | `gazimon` | neglect | 1 | (none — existing gate only) |
| `gummymon` | `terriermon` | fallback | 1 | (none — existing gate only) |
| `gummymon` | `terriermon` | standard | 1 | (none — existing gate only) |
| `hagurumon` | `clockmon` | special | 1 | (none — existing gate only) |
| `hagurumon` | `gladimon` | special | 1 | (none — existing gate only) |
| `hagurumon` | `golemon` | special | 2 | minBond=70 |
| `hagurumon` | `guardromon` | fallback | 1 | (none — existing gate only) |
| `hagurumon` | `guardromon` | standard | 1 | (none — existing gate only) |
| `hagurumon` | `hi-commandramon` | special | 2 | minUndamagedKills=8 |
| `hagurumon` | `jazardmon` | special | 2 | (none — existing gate only) |
| `hagurumon` | `machmon` | special | 2 | (none — existing gate only) |
| `hagurumon` | `mekanorimon` | special | 2 | minUndamagedKills=8 |
| `hagurumon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `hagurumon` | `raremon` | neglect | 1 | (none — existing gate only) |
| `hagurumon` | `starmon` | special | 2 | (none — existing gate only) |
| `hagurumon` | `tankmon` | special | 2 | (none — existing gate only) |
| `hagurumon` | `troopmon` | special | 2 | (none — existing gate only) |
| `halsemon` | `garbagemon` | neglect | 3 | mood="fierce", timeOfDay=dusk |
| `halsemon` | `garudamon` | special | 3 | mood="focused", timeOfDay=dawn|dusk |
| `halsemon` | `hippogryphonmon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `halsemon` | `silphymon` | fallback | 3 | mood="proud", timeOfDay=midday |
| `halsemon` | `silphymon` | standard | 3 | mood="proud", timeOfDay=midday |
| `hawkmon` | `akatorimon` | special | 2 | minUndamagedKills=8 |
| `hawkmon` | `aquilamon` | fallback | 1 | (none — existing gate only) |
| `hawkmon` | `aquilamon` | standard | 1 | (none — existing gate only) |
| `hawkmon` | `birdramon` | special | 1 | (none — existing gate only) |
| `hawkmon` | `halsemon` | armor | 2 | (none — existing gate only) |
| `hawkmon` | `kiwimon` | special | 2 | (none — existing gate only) |
| `hawkmon` | `kokatorimon` | dark | 2 | (none — existing gate only) |
| `hawkmon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `hi-commandramon` | `garbagemon` | neglect | 3 | mood="fierce", timeOfDay=midday |
| `hi-commandramon` | `tankdramon` | fallback | 3 | mood="focused", timeOfDay=dawn|dusk |
| `hi-commandramon` | `tankdramon` | standard | 3 | mood="focused", timeOfDay=night |
| `hippogryphonmon` | `jijimon` | neglect | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `hippogryphonmon` | `magnadramon` | fallback | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `hippogryphonmon` | `magnadramon` | standard | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `hippogryphonmon` | `phoenixmon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `hippogryphonmon` | `valkyrimon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `hoverespimon` | `datamon` | special | 3 | mood="focused", timeOfDay=dusk |
| `hoverespimon` | `garbagemon` | neglect | 3 | mood="proud", timeOfDay=midday |
| `hoverespimon` | `jazarichmon` | special | 3 | mood="proud", timeOfDay=dusk |
| `hoverespimon` | `tankdramon` | fallback | 3 | mood="focused", timeOfDay=dawn |
| `hoverespimon` | `tankdramon` | standard | 3 | mood="fierce", timeOfDay=night |
| `hudiemon` | `garbagemon` | neglect | 3 | mood="fierce", timeOfDay=night |
| `hudiemon` | `lilamon` | fallback | 3 | mood="fierce", timeOfDay=dusk |
| `hudiemon` | `lilamon` | standard | 3 | mood="focused", timeOfDay=dawn |
| `hudiemon` | `lillymon` | special | 3 | mood="fierce", timeOfDay=night |
| `icemon` | `garbagemon` | neglect | 3 | mood="proud", timeOfDay=dawn |
| `icemon` | `mammothmon` | special | 3 | mood="proud", timeOfDay=dawn |
| `icemon` | `meteormon` | fallback | 3 | mood="focused", timeOfDay=midday |
| `icemon` | `meteormon` | standard | 3 | mood="focused", timeOfDay=dawn|dusk |
| `icemon` | `polarbearmon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `icemon` | `zudomon` | special | 3 | mood="proud", timeOfDay=midday |
| `ikkakumon` | `divermon` | special | 3 | mood="focused", timeOfDay=dusk |
| `ikkakumon` | `garbagemon` | neglect | 3 | mood="fierce", timeOfDay=dusk |
| `ikkakumon` | `mammothmon` | special | 3 | mood="proud", timeOfDay=midday |
| `ikkakumon` | `megaseadramon` | special | 3 | mood="fierce", timeOfDay=dusk |
| `ikkakumon` | `zudomon` | fallback | 3 | mood="fierce", timeOfDay=dusk |
| `ikkakumon` | `zudomon` | standard | 3 | mood="focused", timeOfDay=dawn|dusk |
| `imperialdramon_dragonmode` | `armageddemon` | neglect | 5 | minStarveCycles=3, minIgnoredSeconds=45, mood="neglected" |
| `imperialdramon_dragonmode` | `imperialdramon_fightermode` | fallback | 5 | minStarveCycles=3, minIgnoredSeconds=45, mood="neglected" |
| `imperialdramon_dragonmode` | `imperialdramon_fightermode` | mode | 5 | deliberateLoss=true, sessionWindow="trial", mood="wary" |
| `imperialdramon_dragonmode` | `imperialdramon_fightermode` | standard | 5 | deliberateLoss=true, sessionWindow="trial", mood="wary" |
| `infermon` | `armageddemon` | dark | 5 | minRefusedFood=3, mood="stubborn" |
| `infermon` | `diablomon` | fallback | 5 | minRefusedFood=3, mood="stubborn" |
| `infermon` | `diablomon` | standard | 5 | minRefusedFood=3, mood="stubborn" |
| `infermon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `infermon` | `malomyotismon` | special | 5 | minRefusedFood=2, ignoredDuringEvent=true, mood="stubborn" |
| `jagamon` | `jijimon` | neglect | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `jagamon` | `jijimon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `jagamon` | `puppetmon` | dark | 5 | deliberateLoss=true, sessionWindow="trial", mood="wary" |
| `jagamon` | `rosemon` | fallback | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `jagamon` | `rosemon` | standard | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `jagamon` | `vikemon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `jazardmon` | `garbagemon` | neglect | 3 | mood="focused", timeOfDay=night |
| `jazardmon` | `gigadramon` | special | 3 | mood="fierce", timeOfDay=night |
| `jazardmon` | `jazarichmon` | fallback | 3 | mood="focused", timeOfDay=midday |
| `jazardmon` | `jazarichmon` | standard | 3 | mood="focused", timeOfDay=dawn|dusk |
| `jazardmon` | `tankdramon` | special | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `jazarichmon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `jazarichmon` | `machinedramon` | fallback | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `jazarichmon` | `machinedramon` | standard | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `jyarimon` | `gigimon` | fallback | 1 | (none — existing gate only) |
| `jyarimon` | `gigimon` | standard | 1 | (none — existing gate only) |
| `jyarimon` | `pagumon` | neglect | 1 | (none — existing gate only) |
| `kabuterimon` | `garbagemon` | neglect | 3 | mood="fierce", timeOfDay=dawn |
| `kabuterimon` | `jagamon` | special | 3 | mood="fierce", timeOfDay=night |
| `kabuterimon` | `kimeramon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `kabuterimon` | `megakabuterimon` | fallback | 3 | mood="proud", timeOfDay=dawn|dusk |
| `kabuterimon` | `megakabuterimon` | standard | 3 | mood="proud", timeOfDay=dawn |
| `kabuterimon` | `okuwamon` | dark | 3 | mood="focused", timeOfDay=dawn |
| `kabuterimon` | `piximon` | special | 3 | mood="fierce", timeOfDay=night |
| `kakkinmon` | `gazimon` | neglect | 1 | (none — existing gate only) |
| `kakkinmon` | `gotsumon` | fallback | 1 | (none — existing gate only) |
| `kakkinmon` | `gotsumon` | standard | 1 | (none — existing gate only) |
| `kakkinmon` | `ludomon` | special | 1 | (none — existing gate only) |
| `kakkinmon` | `zubamon` | special | 1 | (none — existing gate only) |
| `keramon` | `infermon` | warp | 3 | mood="proud", timeOfDay=dawn |
| `keramon` | `raremon` | neglect | 1 | (none — existing gate only) |
| `keramon` | `roachmon` | neglect | 1 | (none — existing gate only) |
| `keramon` | `vilemon` | fallback | 1 | (none — existing gate only) |
| `keramon` | `vilemon` | standard | 1 | (none — existing gate only) |
| `kimeramon` | `armageddemon` | fallback | 5 | minRefusedFood=3, mood="stubborn" |
| `kimeramon` | `armageddemon` | standard | 5 | ignoredDuringEvent=true, mood="lonely" |
| `kimeramon` | `jijimon` | neglect | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `kimeramon` | `machinedramon` | dark | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `kiwimon` | `cherrymon` | special | 3 | mood="proud", timeOfDay=dawn|dusk |
| `kiwimon` | `garbagemon` | neglect | 3 | mood="proud", timeOfDay=midday |
| `kiwimon` | `garudamon` | special | 3 | mood="proud", timeOfDay=dawn |
| `kiwimon` | `lilamon` | fallback | 3 | mood="proud", timeOfDay=night |
| `kiwimon` | `lilamon` | standard | 3 | mood="focused", timeOfDay=dawn|dusk |
| `kiwimon` | `lillymon` | special | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `kiwimon` | `parrotmon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `kiwimon` | `piximon` | special | 3 | mood="fierce", timeOfDay=night |
| `knightmon` | `durandamon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `knightmon` | `gallantmon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `knightmon` | `hiandromon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `knightmon` | `jijimon` | neglect | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `knightmon` | `minervamon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `knightmon` | `seraphimon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `knightmon` | `slashangemon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `knightmon` | `slashangemon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `kodokugumon` | `dokugumon` | special | 2 | minUndamagedKills=8 |
| `kodokugumon` | `gazimon` | neglect | 1 | (none — existing gate only) |
| `kodokugumon` | `tentomon` | fallback | 1 | (none — existing gate only) |
| `kodokugumon` | `tentomon` | standard | 1 | (none — existing gate only) |
| `kodokugumon` | `wormmon` | special | 1 | (none — existing gate only) |
| `kokabuterimon` | `flymon` | fallback | 1 | (none — existing gate only) |
| `kokabuterimon` | `flymon` | standard | 1 | (none — existing gate only) |
| `kokabuterimon` | `kabuterimon` | special | 1 | (none — existing gate only) |
| `kokabuterimon` | `kuwagamon` | special | 1 | (none — existing gate only) |
| `kokabuterimon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `kokabuterimon` | `roachmon` | neglect | 1 | (none — existing gate only) |
| `kokabuterimon` | `tortomon` | special | 2 | (none — existing gate only) |
| `kokatorimon` | `digitamamon` | fallback | 3 | mood="fierce", timeOfDay=night |
| `kokatorimon` | `digitamamon` | standard | 3 | mood="focused", timeOfDay=dawn |
| `kokatorimon` | `garbagemon` | neglect | 3 | mood="focused", timeOfDay=dawn|dusk |
| `kokatorimon` | `parrotmon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `kokatorimon` | `piximon` | special | 3 | mood="proud", timeOfDay=dusk |
| `kokuwamon` | `clockmon` | fallback | 1 | (none — existing gate only) |
| `kokuwamon` | `clockmon` | standard | 1 | (none — existing gate only) |
| `kokuwamon` | `guardromon` | special | 1 | (none — existing gate only) |
| `kokuwamon` | `jazardmon` | special | 2 | (none — existing gate only) |
| `kokuwamon` | `kabuterimon` | special | 1 | (none — existing gate only) |
| `kokuwamon` | `kuwagamon` | special | 1 | (none — existing gate only) |
| `kokuwamon` | `mekanorimon` | special | 2 | (none — existing gate only) |
| `kokuwamon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `kokuwamon` | `roachmon` | neglect | 1 | (none — existing gate only) |
| `kokuwamon` | `tankmon` | special | 2 | minUndamagedKills=8 |
| `koromon` | `agumon` | fallback | 1 | (none — existing gate only) |
| `koromon` | `agumon` | standard | 1 | (none — existing gate only) |
| `koromon` | `gazimon` | neglect | 1 | (none — existing gate only) |
| `koromon` | `shoutmon_xroswars` | special | 1 | (none — existing gate only) |
| `kuramon` | `pagumon` | neglect | 1 | (none — existing gate only) |
| `kuramon` | `pagumon` | special | 1 | (none — existing gate only) |
| `kuramon` | `tsumemon` | fallback | 1 | (none — existing gate only) |
| `kuramon` | `tsumemon` | standard | 1 | (none — existing gate only) |
| `kuwagamon` | `dinobeemon` | special | 3 | mood="focused", timeOfDay=dawn|dusk |
| `kuwagamon` | `garbagemon` | neglect | 3 | mood="fierce", timeOfDay=dawn |
| `kuwagamon` | `kimeramon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `kuwagamon` | `megakabuterimon` | special | 3 | mood="focused", timeOfDay=midday |
| `kuwagamon` | `okuwamon` | fallback | 3 | mood="proud", timeOfDay=dawn|dusk |
| `kuwagamon` | `okuwamon` | standard | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `kuwagamon` | `piximon` | special | 3 | mood="focused", timeOfDay=dusk |
| `kyubimon` | `garbagemon` | neglect | 3 | mood="fierce", timeOfDay=dawn |
| `kyubimon` | `kyukimon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `kyubimon` | `ladydevimon` | dark | 3 | mood="focused", timeOfDay=dawn |
| `kyubimon` | `taomon` | fallback | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `kyubimon` | `taomon` | standard | 3 | mood="focused", timeOfDay=dawn |
| `kyukimon` | `jijimon` | neglect | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `kyukimon` | `sakuyamon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `kyukimon` | `sakuyamon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `kyukimon` | `slashangemon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `kyukimon` | `valkyrimon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `ladydevimon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `ladydevimon` | `minervamon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `ladydevimon` | `piedmon` | fallback | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `ladydevimon` | `piedmon` | standard | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `ladydevimon` | `rosemon` | dark | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `lalamon` | `kiwimon` | special | 2 | (none — existing gate only) |
| `lalamon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `lalamon` | `redvegiemon` | neglect | 1 | (none — existing gate only) |
| `lalamon` | `sunflowmon` | fallback | 1 | (none — existing gate only) |
| `lalamon` | `sunflowmon` | standard | 1 | (none — existing gate only) |
| `lalamon` | `togemon` | special | 1 | (none — existing gate only) |
| `lalamon` | `woodmon` | special | 2 | (none — existing gate only) |
| `lalamon` | `yakiimon` | special | 2 | (none — existing gate only) |
| `lavogaritamon` | `apollomon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `lavogaritamon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `lavogaritamon` | `machinedramon` | dark | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `lavogaritamon` | `phoenixmon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `lavogaritamon` | `phoenixmon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `lavogaritamon` | `wargreymon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `lavorvomon` | `flarerizamon` | special | 2 | (none — existing gate only) |
| `lavorvomon` | `garbagemon` | neglect | 3 | mood="focused", timeOfDay=midday |
| `lavorvomon` | `lavogaritamon` | fallback | 3 | mood="focused", timeOfDay=dusk |
| `lavorvomon` | `lavogaritamon` | standard | 3 | mood="focused", timeOfDay=dusk |
| `lavorvomon` | `metalgreymon` | special | 3 | mood="proud", timeOfDay=midday |
| `leafmon` | `minomon` | fallback | 1 | (none — existing gate only) |
| `leafmon` | `minomon` | standard | 1 | (none — existing gate only) |
| `leafmon` | `pagumon` | neglect | 1 | (none — existing gate only) |
| `leomon` | `etemon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `leomon` | `garbagemon` | neglect | 3 | mood="focused", timeOfDay=dusk |
| `leomon` | `kyukimon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `leomon` | `loaderliomon` | fallback | 3 | mood="proud", timeOfDay=dusk |
| `leomon` | `loaderliomon` | standard | 3 | mood="proud", timeOfDay=night |
| `leomon` | `madleomon` | dark | 2 | (none — existing gate only) |
| `leomon` | `mammothmon` | special | 3 | mood="proud", timeOfDay=night |
| `leomon` | `monzaemon` | special | 3 | mood="focused", timeOfDay=midday |
| `leomon` | `weregarurumon` | special | 3 | mood="focused", timeOfDay=night |
| `lilamon` | `hydramon` | special | 5 | minStarveCycles=3, minIgnoredSeconds=45, mood="neglected" |
| `lilamon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `lilamon` | `minervamon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `lilamon` | `rosemon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `lilamon` | `rosemon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `lillymon` | `hydramon` | special | 5 | deliberateLoss=true, sessionWindow="trial", mood="wary" |
| `lillymon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `lillymon` | `magnadramon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `lillymon` | `minervamon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `lillymon` | `rosemon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `lillymon` | `rosemon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `loaderliomon` | `heavyleomon` | fallback | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `loaderliomon` | `heavyleomon` | standard | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `loaderliomon` | `jijimon` | neglect | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `loaderliomon` | `machinedramon` | dark | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `loaderliomon` | `vikemon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `ludomon` | `hi-commandramon` | special | 2 | (none — existing gate only) |
| `ludomon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `ludomon` | `tankmon` | special | 2 | minUndamagedKills=8 |
| `ludomon` | `tialudomon` | fallback | 1 | (none — existing gate only) |
| `ludomon` | `tialudomon` | standard | 1 | (none — existing gate only) |
| `machinedramon` | `apocalymon` | fallback | 5 | minRefusedFood=2, ignoredDuringEvent=true, mood="stubborn" |
| `machinedramon` | `apocalymon` | fusion | 5 | deliberateLoss=true, sessionWindow="trial", mood="wary" |
| `machinedramon` | `apocalymon` | standard | 5 | ignoredDuringEvent=true, mood="lonely" |
| `machinedramon` | `armageddemon` | dark | 5 | ignoredDuringEvent=true, mood="lonely" |
| `machinedramon` | `armageddemon` | neglect | 5 | ignoredDuringEvent=true, mood="lonely" |
| `machmon` | `garbagemon` | neglect | 3 | mood="fierce", timeOfDay=dawn |
| `machmon` | `gigadramon` | special | 3 | mood="fierce", timeOfDay=dawn |
| `machmon` | `loaderliomon` | fallback | 3 | mood="proud", timeOfDay=dawn|dusk |
| `machmon` | `loaderliomon` | standard | 3 | mood="fierce", timeOfDay=night |
| `machmon` | `rapidmon` | special | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `machmon` | `tankdramon` | special | 3 | mood="focused", timeOfDay=dusk |
| `madleomon` | `loaderliomon` | fallback | 3 | mood="focused", timeOfDay=night |
| `madleomon` | `loaderliomon` | standard | 3 | mood="fierce", timeOfDay=midday |
| `madleomon` | `murasamemon_beatbreak` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `madleomon` | `skullknightmon` | dark | 2 | (none — existing gate only) |
| `madleomon` | `warumonzaemon` | neglect | 3 | mood="proud", timeOfDay=dusk |
| `madleomon` | `weregarurumon` | special | 3 | mood="proud", timeOfDay=midday |
| `magnaangemon` | `gallantmon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `magnaangemon` | `jijimon` | neglect | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `magnaangemon` | `magnadramon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `magnaangemon` | `seraphimon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `magnaangemon` | `seraphimon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `magnaangemon` | `slashangemon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `magnaangemon` | `valkyrimon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `mammothmon` | `jijimon` | neglect | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `mammothmon` | `metalgarurumon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `mammothmon` | `skadimon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `mammothmon` | `skadimon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `mammothmon` | `vikemon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `marinbullmon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `marinbullmon` | `metalseadramon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `marinbullmon` | `metalseadramon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `marinbullmon` | `vikemon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `megadramon` | `blackwargreymon` | dark | 5 | deliberateLoss=true, sessionWindow="trial", mood="wary" |
| `megadramon` | `imperialdramon_dragonmode` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `megadramon` | `jijimon` | neglect | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `megadramon` | `machinedramon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `megadramon` | `machinedramon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `megadramon` | `wargreymon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `megakabuterimon` | `herculeskabuterimon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `megakabuterimon` | `herculeskabuterimon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `megakabuterimon` | `jijimon` | neglect | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `megaseadramon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `megaseadramon` | `metalseadramon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `megaseadramon` | `metalseadramon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `megaseadramon` | `vikemon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `mekanorimon` | `andromon` | special | 3 | mood="focused", timeOfDay=dawn|dusk |
| `mekanorimon` | `datamon` | fallback | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `mekanorimon` | `datamon` | standard | 3 | mood="fierce", timeOfDay=dusk |
| `mekanorimon` | `garbagemon` | neglect | 3 | mood="focused", timeOfDay=midday |
| `mekanorimon` | `gigadramon` | special | 3 | mood="proud", timeOfDay=dusk |
| `mekanorimon` | `jazarichmon` | special | 3 | mood="fierce", timeOfDay=night |
| `mekanorimon` | `tankdramon` | special | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `meramon` | `bluemeramon` | fallback | 3 | mood="proud", timeOfDay=dawn |
| `meramon` | `bluemeramon` | standard | 3 | mood="proud", timeOfDay=night |
| `meramon` | `garbagemon` | neglect | 3 | mood="proud", timeOfDay=midday |
| `meramon` | `lavogaritamon` | special | 3 | mood="proud", timeOfDay=midday |
| `meramon` | `metalgreymon` | special | 3 | mood="fierce", timeOfDay=night |
| `meramon` | `wargrowlmon` | special | 3 | mood="proud", timeOfDay=dawn|dusk |
| `metalgreymon` | `blackwargreymon` | dark | 5 | ignoredDuringEvent=true, mood="lonely" |
| `metalgreymon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `metalgreymon` | `machinedramon` | dark | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `metalgreymon` | `wargreymon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `metalgreymon` | `wargreymon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `metalseadramon` | `apocalymon` | fallback | 5 | minRefusedFood=2, ignoredDuringEvent=true, mood="stubborn" |
| `metalseadramon` | `apocalymon` | fusion | 5 | ignoredDuringEvent=true, mood="lonely" |
| `metalseadramon` | `apocalymon` | standard | 5 | minStarveCycles=3, minIgnoredSeconds=45, mood="neglected" |
| `metalseadramon` | `armageddemon` | neglect | 5 | ignoredDuringEvent=true, mood="lonely" |
| `meteormon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `meteormon` | `machinedramon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `meteormon` | `metalgarurumon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `meteormon` | `metalgarurumon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `meteormon` | `piedmon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `meteormon` | `vikemon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `minomon` | `gazimon` | neglect | 1 | (none — existing gate only) |
| `minomon` | `kodokugumon` | special | 1 | (none — existing gate only) |
| `minomon` | `kokabuterimon` | special | 1 | (none — existing gate only) |
| `minomon` | `kokuwamon` | special | 1 | (none — existing gate only) |
| `minomon` | `wormmon` | fallback | 1 | (none — existing gate only) |
| `minomon` | `wormmon` | standard | 1 | (none — existing gate only) |
| `missimon` | `espimon` | special | 1 | (none — existing gate only) |
| `missimon` | `gazimon` | neglect | 1 | (none — existing gate only) |
| `missimon` | `hagurumon` | fallback | 1 | (none — existing gate only) |
| `missimon` | `hagurumon` | standard | 1 | (none — existing gate only) |
| `mojyamon` | `etemon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `mojyamon` | `mammothmon` | fallback | 3 | mood="fierce", timeOfDay=dawn |
| `mojyamon` | `mammothmon` | standard | 3 | mood="focused", timeOfDay=night |
| `mojyamon` | `monzaemon` | special | 3 | mood="proud", timeOfDay=midday |
| `mojyamon` | `piximon` | special | 3 | mood="focused", timeOfDay=midday |
| `mojyamon` | `polarbearmon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `mojyamon` | `warumonzaemon` | neglect | 3 | mood="proud", timeOfDay=night |
| `monochromon` | `digitamamon` | fallback | 3 | mood="fierce", timeOfDay=dusk |
| `monochromon` | `digitamamon` | standard | 3 | mood="focused", timeOfDay=dusk |
| `monochromon` | `garbagemon` | neglect | 3 | mood="focused", timeOfDay=dawn |
| `monochromon` | `megadramon` | special | 3 | mood="focused", timeOfDay=dusk |
| `monochromon` | `metalgreymon` | special | 3 | mood="fierce", timeOfDay=midday |
| `monochromon` | `meteormon` | special | 3 | mood="fierce", timeOfDay=dawn |
| `monochromon` | `triceramon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `monzaemon` | `jijimon` | fallback | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `monzaemon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `monzaemon` | `jijimon` | standard | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `monzaemon` | `minervamon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `monzaemon` | `sakuyamon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `monzaemon` | `seraphimon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `monzaemon` | `vikemon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `monzaemon` | `warumonzaemon` | dark | 3 | mood="focused", timeOfDay=dusk |
| `motimon` | `espimon` | special | 1 | (none — existing gate only) |
| `motimon` | `gazimon` | neglect | 1 | (none — existing gate only) |
| `motimon` | `gotsumon` | special | 1 | (none — existing gate only) |
| `motimon` | `hagurumon` | special | 1 | (none — existing gate only) |
| `motimon` | `kokabuterimon` | special | 1 | (none — existing gate only) |
| `motimon` | `kokuwamon` | special | 1 | (none — existing gate only) |
| `motimon` | `solarmon` | special | 1 | (none — existing gate only) |
| `motimon` | `tentomon` | fallback | 1 | (none — existing gate only) |
| `motimon` | `tentomon` | standard | 1 | (none — existing gate only) |
| `murasamemon_beatbreak` | `heavyleomon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `murasamemon_beatbreak` | `jijimon` | neglect | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `murasamemon_beatbreak` | `minervamon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `murasamemon_beatbreak` | `minervamon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `mushroomon` | `kiwimon` | special | 2 | (none — existing gate only) |
| `mushroomon` | `kuwagamon` | fallback | 1 | (none — existing gate only) |
| `mushroomon` | `kuwagamon` | standard | 1 | (none — existing gate only) |
| `mushroomon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `mushroomon` | `redvegiemon` | neglect | 1 | (none — existing gate only) |
| `mushroomon` | `sunflowmon` | special | 1 | (none — existing gate only) |
| `mushroomon` | `togemon` | special | 1 | (none — existing gate only) |
| `mushroomon` | `woodmon` | special | 2 | (none — existing gate only) |
| `mushroomon` | `yakiimon` | special | 2 | (none — existing gate only) |
| `myotismon` | `jijimon` | neglect | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `myotismon` | `malomyotismon` | special | 5 | minStarveCycles=3, minIgnoredSeconds=45, mood="neglected" |
| `myotismon` | `piedmon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `myotismon` | `piedmon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `nefertimon` | `angewomon` | special | 3 | mood="focused", timeOfDay=night |
| `nefertimon` | `garbagemon` | neglect | 3 | mood="fierce", timeOfDay=night |
| `nefertimon` | `kyukimon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `nefertimon` | `silphymon` | fallback | 3 | mood="focused", timeOfDay=midday |
| `nefertimon` | `silphymon` | standard | 3 | mood="fierce", timeOfDay=midday |
| `numemon` | `digitamamon` | special | 3 | mood="focused", timeOfDay=dawn|dusk |
| `numemon` | `etemon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `numemon` | `garbagemon` | neglect | 3 | mood="fierce", timeOfDay=dawn |
| `numemon` | `greymon` | recover | 1 | (none — existing gate only) |
| `numemon` | `monzaemon` | fallback | 3 | mood="proud", timeOfDay=dawn|dusk |
| `numemon` | `monzaemon` | standard | 3 | mood="focused", timeOfDay=dusk |
| `numemon` | `warumonzaemon` | dark | 3 | mood="fierce", timeOfDay=midday |
| `nyaromon` | `gatomon` | warp | 1 | (none — existing gate only) |
| `nyaromon` | `gazimon` | neglect | 1 | (none — existing gate only) |
| `nyaromon` | `gekkomon` | special | 1 | (none — existing gate only) |
| `nyaromon` | `ghostmon` | special | 1 | (none — existing gate only) |
| `nyaromon` | `salamon` | fallback | 1 | (none — existing gate only) |
| `nyaromon` | `salamon` | standard | 1 | (none — existing gate only) |
| `nyokimon` | `budmon` | special | 1 | (none — existing gate only) |
| `nyokimon` | `pagumon` | neglect | 1 | (none — existing gate only) |
| `nyokimon` | `tanemon` | special | 1 | (none — existing gate only) |
| `nyokimon` | `yokomon` | fallback | 1 | (none — existing gate only) |
| `nyokimon` | `yokomon` | standard | 1 | (none — existing gate only) |
| `oboromon` | `fumamon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `oboromon` | `garbagemon` | neglect | 3 | mood="fierce", timeOfDay=dusk |
| `oboromon` | `phantomon` | fallback | 3 | mood="fierce", timeOfDay=dawn |
| `oboromon` | `phantomon` | standard | 3 | mood="fierce", timeOfDay=dawn |
| `oboromon` | `skullknightmon` | special | 2 | minBond=70 |
| `octmon` | `divermon` | special | 3 | mood="fierce", timeOfDay=dusk |
| `octmon` | `garbagemon` | neglect | 3 | mood="fierce", timeOfDay=night |
| `octmon` | `marinbullmon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `octmon` | `scorpiomon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `octmon` | `shogungekomon` | fallback | 3 | mood="focused", timeOfDay=dawn |
| `octmon` | `shogungekomon` | standard | 3 | mood="fierce", timeOfDay=dawn |
| `okuwamon` | `herculeskabuterimon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `okuwamon` | `herculeskabuterimon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `okuwamon` | `jijimon` | neglect | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `okuwamon` | `rosemon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `otamamon` | `gekomon` | fallback | 1 | (none — existing gate only) |
| `otamamon` | `gekomon` | standard | 1 | (none — existing gate only) |
| `otamamon` | `gesomon` | special | 1 | (none — existing gate only) |
| `otamamon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `otamamon` | `octmon` | special | 2 | (none — existing gate only) |
| `otamamon` | `raremon` | neglect | 1 | (none — existing gate only) |
| `otamamon` | `seadramon` | special | 2 | (none — existing gate only) |
| `otamamon` | `shellmon` | special | 2 | (none — existing gate only) |
| `pabumon` | `motimon` | fallback | 1 | (none — existing gate only) |
| `pabumon` | `motimon` | standard | 1 | (none — existing gate only) |
| `pabumon` | `pagumon` | neglect | 1 | (none — existing gate only) |
| `pabumon` | `tanemon` | special | 1 | (none — existing gate only) |
| `pabumon` | `yokomon` | special | 1 | (none — existing gate only) |
| `pagumon` | `demidevimon` | fallback | 1 | (none — existing gate only) |
| `pagumon` | `demidevimon` | standard | 1 | (none — existing gate only) |
| `pagumon` | `dracmon` | special | 1 | (none — existing gate only) |
| `pagumon` | `gazimon` | neglect | 1 | (none — existing gate only) |
| `pagumon` | `gazimon` | special | 1 | (none — existing gate only) |
| `pagumon` | `ghostmon` | special | 1 | (none — existing gate only) |
| `pagumon` | `gizamon` | special | 1 | (none — existing gate only) |
| `paildramon` | `imperialdramon_dragonmode` | fallback | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `paildramon` | `imperialdramon_dragonmode` | standard | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `paildramon` | `jijimon` | neglect | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `paildramon` | `wargreymon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `palmon` | `bakemon` | neglect | 1 | (none — existing gate only) |
| `palmon` | `kiwimon` | special | 2 | (none — existing gate only) |
| `palmon` | `kuwagamon` | dark | 1 | (none — existing gate only) |
| `palmon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `palmon` | `redvegiemon` | neglect | 1 | (none — existing gate only) |
| `palmon` | `sunflowmon` | special | 1 | (none — existing gate only) |
| `palmon` | `togemon` | fallback | 1 | (none — existing gate only) |
| `palmon` | `togemon` | standard | 1 | (none — existing gate only) |
| `palmon` | `woodmon` | special | 2 | (none — existing gate only) |
| `palmon` | `yakiimon` | special | 2 | (none — existing gate only) |
| `parrotmon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `parrotmon` | `phoenixmon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `parrotmon` | `phoenixmon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `parrotmon` | `valkyrimon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `patamon` | `aegiomon` | special | 2 | minBond=70 |
| `patamon` | `angemon` | fallback | 1 | (none — existing gate only) |
| `patamon` | `angemon` | standard | 1 | (none — existing gate only) |
| `patamon` | `bakemon` | neglect | 1 | (none — existing gate only) |
| `patamon` | `devimon` | dark | 1 | (none — existing gate only) |
| `patamon` | `gatomon` | special | 1 | (none — existing gate only) |
| `patamon` | `leomon` | special | 2 | (none — existing gate only) |
| `patamon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `patamon` | `pegasusmon` | armor | 2 | (none — existing gate only) |
| `patamon` | `unimon` | special | 2 | (none — existing gate only) |
| `pegasusmon` | `garbagemon` | neglect | 3 | mood="fierce", timeOfDay=night |
| `pegasusmon` | `hippogryphonmon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `pegasusmon` | `magnaangemon` | special | 3 | mood="focused", timeOfDay=dawn|dusk |
| `pegasusmon` | `shakkoumon` | fallback | 3 | mood="proud", timeOfDay=dusk |
| `pegasusmon` | `shakkoumon` | standard | 3 | mood="focused", timeOfDay=night |
| `petermon` | `garbagemon` | neglect | 3 | mood="focused", timeOfDay=dusk |
| `petermon` | `phantomon` | special | 3 | mood="proud", timeOfDay=dawn |
| `petermon` | `piximon` | fallback | 3 | mood="fierce", timeOfDay=night |
| `petermon` | `piximon` | standard | 3 | mood="fierce", timeOfDay=midday |
| `petermon` | `pumpkinmon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `phantomon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `phantomon` | `piedmon` | fallback | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `phantomon` | `piedmon` | standard | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `pichimon` | `bukamon` | fallback | 1 | (none — existing gate only) |
| `pichimon` | `bukamon` | standard | 1 | (none — existing gate only) |
| `pichimon` | `pagumon` | neglect | 1 | (none — existing gate only) |
| `pichimon` | `upamon` | special | 1 | (none — existing gate only) |
| `piedmon` | `apocalymon` | fallback | 5 | minStarveCycles=3, minIgnoredSeconds=45, mood="neglected" |
| `piedmon` | `apocalymon` | fusion | 5 | minRefusedFood=2, ignoredDuringEvent=true, mood="stubborn" |
| `piedmon` | `apocalymon` | standard | 5 | ignoredDuringEvent=true, mood="lonely" |
| `piedmon` | `armageddemon` | neglect | 5 | minRefusedFood=3, mood="stubborn" |
| `pinamon` | `biyomon` | fallback | 1 | (none — existing gate only) |
| `pinamon` | `biyomon` | standard | 1 | (none — existing gate only) |
| `pinamon` | `gazimon` | neglect | 1 | (none — existing gate only) |
| `pinamon` | `kokatorimon` | special | 2 | minUndamagedKills=8 |
| `piximon` | `jijimon` | fallback | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `piximon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `piximon` | `jijimon` | standard | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `piximon` | `rosemon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `piximon` | `valkyrimon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `piximon` | `vikemon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `polarbearmon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `polarbearmon` | `metalgarurumon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `polarbearmon` | `skadimon` | fallback | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `polarbearmon` | `skadimon` | standard | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `polarbearmon` | `vikemon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `porcupamon` | `garbagemon` | neglect | 3 | mood="fierce", timeOfDay=night |
| `porcupamon` | `skullknightmon` | special | 2 | minUndamagedKills=8 |
| `porcupamon` | `warumonzaemon` | fallback | 3 | mood="fierce", timeOfDay=night |
| `porcupamon` | `warumonzaemon` | standard | 3 | mood="focused", timeOfDay=dawn|dusk |
| `poromon` | `gazimon` | neglect | 1 | (none — existing gate only) |
| `poromon` | `hawkmon` | fallback | 1 | (none — existing gate only) |
| `poromon` | `hawkmon` | standard | 1 | (none — existing gate only) |
| `poyomon` | `pagumon` | neglect | 1 | (none — existing gate only) |
| `poyomon` | `tokomon` | fallback | 1 | (none — existing gate only) |
| `poyomon` | `tokomon` | standard | 1 | (none — existing gate only) |
| `pristimon_beatbreak` | `gladimon` | fallback | 1 | (none — existing gate only) |
| `pristimon_beatbreak` | `gladimon` | standard | 1 | (none — existing gate only) |
| `pristimon_beatbreak` | `leomon` | special | 2 | minBond=70 |
| `pristimon_beatbreak` | `numemon` | neglect | 1 | (none — existing gate only) |
| `pumpkinmon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `pumpkinmon` | `piedmon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `pumpkinmon` | `puppetmon` | special | 5 | minRefusedFood=3, mood="stubborn" |
| `pumpkinmon` | `rosemon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `pumpkinmon` | `rosemon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `punimon` | `pagumon` | neglect | 1 | (none — existing gate only) |
| `punimon` | `tsunomon` | fallback | 1 | (none — existing gate only) |
| `punimon` | `tsunomon` | standard | 1 | (none — existing gate only) |
| `punimon` | `tumblemon` | special | 1 | (none — existing gate only) |
| `puppetmon` | `apocalymon` | fallback | 5 | ignoredDuringEvent=true, mood="lonely" |
| `puppetmon` | `apocalymon` | fusion | 5 | deliberateLoss=true, sessionWindow="trial", mood="wary" |
| `puppetmon` | `apocalymon` | standard | 5 | ignoredDuringEvent=true, mood="lonely" |
| `puppetmon` | `armageddemon` | neglect | 5 | deliberateLoss=true, sessionWindow="trial", mood="wary" |
| `pupumon` | `pagumon` | neglect | 1 | (none — existing gate only) |
| `pupumon` | `tanemon` | fallback | 1 | (none — existing gate only) |
| `pupumon` | `tanemon` | standard | 1 | (none — existing gate only) |
| `pururumon` | `pagumon` | neglect | 1 | (none — existing gate only) |
| `pururumon` | `poromon` | fallback | 1 | (none — existing gate only) |
| `pururumon` | `poromon` | standard | 1 | (none — existing gate only) |
| `putimon` | `cupimon` | fallback | 1 | (none — existing gate only) |
| `putimon` | `cupimon` | standard | 1 | (none — existing gate only) |
| `putimon` | `pagumon` | neglect | 1 | (none — existing gate only) |
| `puwamon` | `biyomon` | warp | 1 | (none — existing gate only) |
| `puwamon` | `pagumon` | neglect | 1 | (none — existing gate only) |
| `puwamon` | `pinamon` | fallback | 1 | (none — existing gate only) |
| `puwamon` | `pinamon` | standard | 1 | (none — existing gate only) |
| `raijiludomon` | `bryweludramon` | fallback | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `raijiludomon` | `bryweludramon` | standard | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `raijiludomon` | `heavyleomon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `raijiludomon` | `hiandromon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `raijiludomon` | `jijimon` | neglect | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `raijiludomon` | `slashangemon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `rapidmon` | `hiandromon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `rapidmon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `rapidmon` | `machinedramon` | dark | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `rapidmon` | `megagargomon` | fallback | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `rapidmon` | `megagargomon` | standard | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `rapidmon` | `slashangemon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `raremon` | `datamon` | neglect | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `raremon` | `garbagemon` | fallback | 3 | mood="focused", timeOfDay=midday |
| `raremon` | `garbagemon` | standard | 3 | mood="focused", timeOfDay=night |
| `raremon` | `infermon` | special | 3 | mood="fierce", timeOfDay=dusk |
| `raremon` | `warumonzaemon` | neglect | 3 | mood="proud", timeOfDay=dusk |
| `redvegiemon` | `cherrymon` | fallback | 3 | mood="proud", timeOfDay=dawn|dusk |
| `redvegiemon` | `cherrymon` | standard | 3 | mood="fierce", timeOfDay=night |
| `redvegiemon` | `garbagemon` | neglect | 3 | mood="focused", timeOfDay=dusk |
| `redvegiemon` | `jagamon` | special | 3 | mood="fierce", timeOfDay=dusk |
| `relemon` | `pagumon` | neglect | 1 | (none — existing gate only) |
| `relemon` | `viximon` | fallback | 1 | (none — existing gate only) |
| `relemon` | `viximon` | standard | 1 | (none — existing gate only) |
| `renamon` | `kyubimon` | fallback | 1 | (none — existing gate only) |
| `renamon` | `kyubimon` | standard | 1 | (none — existing gate only) |
| `renamon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `renamon` | `sakuyamon` | warp | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `renamon` | `youkomon` | dark | 2 | (none — existing gate only) |
| `roachmon` | `garbagemon` | fallback | 3 | mood="proud", timeOfDay=dawn |
| `roachmon` | `garbagemon` | standard | 3 | mood="focused", timeOfDay=dawn |
| `roachmon` | `okuwamon` | special | 3 | mood="focused", timeOfDay=dawn|dusk |
| `roachmon` | `warumonzaemon` | neglect | 3 | mood="focused", timeOfDay=midday |
| `sakumon` | `pagumon` | neglect | 1 | (none — existing gate only) |
| `sakumon` | `sakuttomon` | fallback | 1 | (none — existing gate only) |
| `sakumon` | `sakuttomon` | standard | 1 | (none — existing gate only) |
| `sakuttomon` | `gazimon` | neglect | 1 | (none — existing gate only) |
| `sakuttomon` | `solarmon` | special | 1 | (none — existing gate only) |
| `sakuttomon` | `zubamon` | fallback | 1 | (none — existing gate only) |
| `sakuttomon` | `zubamon` | standard | 1 | (none — existing gate only) |
| `salamon` | `aegiomon` | special | 2 | minUndamagedKills=8 |
| `salamon` | `angemon` | special | 1 | (none — existing gate only) |
| `salamon` | `frigimon` | special | 2 | (none — existing gate only) |
| `salamon` | `garurumon` | special | 1 | (none — existing gate only) |
| `salamon` | `gatomon` | fallback | 1 | (none — existing gate only) |
| `salamon` | `gatomon` | standard | 1 | (none — existing gate only) |
| `salamon` | `mojyamon` | special | 2 | (none — existing gate only) |
| `salamon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `salamon` | `sistermon_ciel` | special | 2 | (none — existing gate only) |
| `salamon` | `sistermon_noir` | dark | 2 | (none — existing gate only) |
| `salamon` | `unimon` | special | 2 | (none — existing gate only) |
| `sangomon` | `ebidramon` | fallback | 1 | (none — existing gate only) |
| `sangomon` | `ebidramon` | standard | 1 | (none — existing gate only) |
| `sangomon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `sangomon` | `raremon` | neglect | 1 | (none — existing gate only) |
| `sangomon` | `seadramon` | special | 2 | (none — existing gate only) |
| `sangomon` | `shellmon` | special | 2 | (none — existing gate only) |
| `sangomon` | `tobiumon` | special | 2 | (none — existing gate only) |
| `scorpiomon` | `jijimon` | neglect | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `scorpiomon` | `metalseadramon` | fallback | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `scorpiomon` | `metalseadramon` | standard | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `scorpiomon` | `vikemon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `seadramon` | `divermon` | special | 3 | mood="proud", timeOfDay=dawn |
| `seadramon` | `garbagemon` | neglect | 3 | mood="fierce", timeOfDay=dawn |
| `seadramon` | `marinbullmon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `seadramon` | `megaseadramon` | fallback | 3 | mood="proud", timeOfDay=dawn |
| `seadramon` | `megaseadramon` | standard | 3 | mood="proud", timeOfDay=dawn |
| `seadramon` | `scorpiomon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `shakkoumon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `shakkoumon` | `phoenixmon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `shakkoumon` | `seraphimon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `shakkoumon` | `slashangemon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `shakkoumon` | `vikemon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `shakkoumon` | `vikemon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `shellmon` | `digitamamon` | fallback | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `shellmon` | `digitamamon` | standard | 3 | mood="fierce", timeOfDay=dawn |
| `shellmon` | `divermon` | special | 3 | mood="focused", timeOfDay=dawn|dusk |
| `shellmon` | `garbagemon` | neglect | 3 | mood="fierce", timeOfDay=midday |
| `shellmon` | `marinbullmon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `shellmon` | `megaseadramon` | special | 3 | mood="focused", timeOfDay=night |
| `shellmon` | `scorpiomon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `shellmon` | `zudomon` | special | 3 | mood="fierce", timeOfDay=midday |
| `shogungekomon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `shogungekomon` | `metalseadramon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `shogungekomon` | `piedmon` | dark | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `shogungekomon` | `vikemon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `shogungekomon` | `vikemon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `shoutmon_xroswars` | `greymon` | fallback | 1 | (none — existing gate only) |
| `shoutmon_xroswars` | `greymon` | standard | 1 | (none — existing gate only) |
| `shoutmon_xroswars` | `growlmon` | special | 1 | (none — existing gate only) |
| `shoutmon_xroswars` | `guardromon_gold` | special | 2 | minUndamagedKills=8 |
| `shoutmon_xroswars` | `numemon` | neglect | 1 | (none — existing gate only) |
| `silphymon` | `jijimon` | neglect | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `silphymon` | `phoenixmon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `silphymon` | `rosemon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `silphymon` | `sakuyamon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `silphymon` | `slashangemon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `silphymon` | `valkyrimon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `silphymon` | `valkyrimon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `sistermon_ciel` | `angewomon` | special | 3 | mood="fierce", timeOfDay=dusk |
| `sistermon_ciel` | `garbagemon` | neglect | 3 | mood="proud", timeOfDay=midday |
| `sistermon_ciel` | `ladydevimon` | dark | 3 | mood="focused", timeOfDay=midday |
| `sistermon_ciel` | `sistermon_noir` | mode | 2 | minBond=70 |
| `sistermon_ciel` | `taomon` | fallback | 3 | mood="focused", timeOfDay=dusk |
| `sistermon_ciel` | `taomon` | standard | 3 | mood="focused", timeOfDay=dawn|dusk |
| `sistermon_noir` | `garbagemon` | neglect | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `sistermon_noir` | `ladydevimon` | fallback | 3 | mood="focused", timeOfDay=dawn|dusk |
| `sistermon_noir` | `ladydevimon` | standard | 3 | mood="proud", timeOfDay=night |
| `sistermon_noir` | `sistermon_ciel` | mode | 2 | minBond=70 |
| `sistermon_noir` | `weregarurumon` | special | 3 | mood="proud", timeOfDay=dawn |
| `skullknightmon` | `garbagemon` | neglect | 3 | mood="proud", timeOfDay=dusk |
| `skullknightmon` | `knightmon` | special | 3 | mood="fierce", timeOfDay=dusk |
| `skullknightmon` | `phantomon` | fallback | 3 | mood="focused", timeOfDay=dawn |
| `skullknightmon` | `phantomon` | standard | 3 | mood="fierce", timeOfDay=dawn |
| `solarmon` | `clockmon` | special | 1 | (none — existing gate only) |
| `solarmon` | `flarerizamon` | special | 2 | (none — existing gate only) |
| `solarmon` | `gladimon` | special | 1 | (none — existing gate only) |
| `solarmon` | `guardromon` | fallback | 1 | (none — existing gate only) |
| `solarmon` | `guardromon` | standard | 1 | (none — existing gate only) |
| `solarmon` | `guardromon_gold` | special | 2 | minUndamagedKills=8 |
| `solarmon` | `lavorvomon` | special | 2 | (none — existing gate only) |
| `solarmon` | `meramon` | special | 1 | (none — existing gate only) |
| `solarmon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `solarmon` | `raremon` | neglect | 1 | (none — existing gate only) |
| `solarmon` | `starmon` | special | 2 | (none — existing gate only) |
| `solarmon` | `tankmon` | special | 2 | (none — existing gate only) |
| `starmon` | `meteormon` | fallback | 3 | mood="proud", timeOfDay=night |
| `starmon` | `meteormon` | standard | 3 | mood="proud", timeOfDay=dawn |
| `starmon` | `monzaemon` | special | 3 | mood="focused", timeOfDay=midday |
| `starmon` | `piximon` | special | 3 | mood="proud", timeOfDay=dawn|dusk |
| `starmon` | `rapidmon` | special | 3 | mood="focused", timeOfDay=night |
| `starmon` | `shakkoumon` | special | 3 | mood="proud", timeOfDay=dawn|dusk |
| `starmon` | `warumonzaemon` | neglect | 3 | mood="proud", timeOfDay=dawn |
| `stingmon` | `dinobeemon` | fallback | 3 | mood="fierce", timeOfDay=midday |
| `stingmon` | `dinobeemon` | fusion | 3 | mood="focused", timeOfDay=dawn |
| `stingmon` | `dinobeemon` | standard | 3 | mood="fierce", timeOfDay=midday |
| `stingmon` | `garbagemon` | neglect | 3 | mood="proud", timeOfDay=dusk |
| `stingmon` | `okuwamon` | dark | 3 | mood="focused", timeOfDay=night |
| `stingmon` | `paildramon` | fusion | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `sunflowmon` | `cherrymon` | special | 3 | mood="proud", timeOfDay=dawn|dusk |
| `sunflowmon` | `garbagemon` | neglect | 3 | mood="proud", timeOfDay=midday |
| `sunflowmon` | `lilamon` | fallback | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `sunflowmon` | `lilamon` | standard | 3 | mood="focused", timeOfDay=midday |
| `sunflowmon` | `lillymon` | special | 3 | mood="proud", timeOfDay=night |
| `sunflowmon` | `pumpkinmon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `syakomon` | `ebidramon` | special | 1 | (none — existing gate only) |
| `syakomon` | `gesomon` | fallback | 1 | (none — existing gate only) |
| `syakomon` | `gesomon` | standard | 1 | (none — existing gate only) |
| `syakomon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `syakomon` | `octmon` | special | 2 | (none — existing gate only) |
| `syakomon` | `raremon` | neglect | 1 | (none — existing gate only) |
| `syakomon` | `seadramon` | special | 2 | (none — existing gate only) |
| `syakomon` | `shellmon` | special | 2 | (none — existing gate only) |
| `tanemon` | `gazimon` | neglect | 1 | (none — existing gate only) |
| `tanemon` | `palmon` | fallback | 1 | (none — existing gate only) |
| `tanemon` | `palmon` | standard | 1 | (none — existing gate only) |
| `tankdramon` | `hiandromon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `tankdramon` | `jijimon` | neglect | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `tankdramon` | `machinedramon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `tankdramon` | `machinedramon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `tankmon` | `andromon` | special | 3 | mood="focused", timeOfDay=night |
| `tankmon` | `gigadramon` | special | 3 | mood="proud", timeOfDay=dawn |
| `tankmon` | `metalgreymon` | special | 3 | mood="proud", timeOfDay=dawn|dusk |
| `tankmon` | `raijiludomon` | fallback | 3 | mood="fierce", timeOfDay=dusk |
| `tankmon` | `raijiludomon` | standard | 3 | mood="focused", timeOfDay=dusk |
| `tankmon` | `rapidmon` | special | 3 | mood="fierce", timeOfDay=midday |
| `tankmon` | `tankdramon` | special | 3 | mood="focused", timeOfDay=night |
| `tankmon` | `warumonzaemon` | neglect | 3 | mood="focused", timeOfDay=dawn |
| `taomon` | `dianamon` | special | 5 | ignoredDuringEvent=true, mood="lonely" |
| `taomon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `taomon` | `sakuyamon` | fallback | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `taomon` | `sakuyamon` | standard | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `tentomon` | `bakemon` | neglect | 1 | (none — existing gate only) |
| `tentomon` | `dokugumon` | dark | 2 | (none — existing gate only) |
| `tentomon` | `flymon` | special | 1 | (none — existing gate only) |
| `tentomon` | `kabuterimon` | fallback | 1 | (none — existing gate only) |
| `tentomon` | `kabuterimon` | standard | 1 | (none — existing gate only) |
| `tentomon` | `kuwagamon` | dark | 1 | (none — existing gate only) |
| `tentomon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `tentomon` | `roachmon` | neglect | 1 | (none — existing gate only) |
| `tentomon` | `stingmon` | special | 1 | (none — existing gate only) |
| `terriermon` | `gargomon` | fallback | 1 | (none — existing gate only) |
| `terriermon` | `gargomon` | standard | 1 | (none — existing gate only) |
| `terriermon` | `megagargomon` | warp | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `terriermon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `tialudomon` | `garbagemon` | neglect | 3 | mood="fierce", timeOfDay=night |
| `tialudomon` | `loaderliomon` | special | 3 | mood="fierce", timeOfDay=dawn |
| `tialudomon` | `raijiludomon` | fallback | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `tialudomon` | `raijiludomon` | standard | 3 | mood="proud", timeOfDay=night |
| `tobiumon` | `divermon` | fallback | 3 | mood="fierce", timeOfDay=dusk |
| `tobiumon` | `divermon` | standard | 3 | mood="fierce", timeOfDay=midday |
| `tobiumon` | `garbagemon` | neglect | 3 | mood="fierce", timeOfDay=midday |
| `tobiumon` | `marinbullmon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `tobiumon` | `megaseadramon` | special | 3 | mood="focused", timeOfDay=night |
| `togemon` | `cherrymon` | special | 3 | mood="proud", timeOfDay=midday |
| `togemon` | `garbagemon` | neglect | 3 | mood="fierce", timeOfDay=midday |
| `togemon` | `jagamon` | special | 3 | mood="fierce", timeOfDay=night |
| `togemon` | `lilamon` | special | 3 | mood="focused", timeOfDay=night |
| `togemon` | `lillymon` | fallback | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `togemon` | `lillymon` | standard | 3 | mood="focused", timeOfDay=dusk |
| `togemon` | `piximon` | special | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `togemon` | `pumpkinmon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `tokomon` | `gazimon` | neglect | 1 | (none — existing gate only) |
| `tokomon` | `patamon` | fallback | 1 | (none — existing gate only) |
| `tokomon` | `patamon` | standard | 1 | (none — existing gate only) |
| `tokomon` | `salamon` | special | 1 | (none — existing gate only) |
| `tokomon` | `shoutmon_xroswars` | special | 1 | (none — existing gate only) |
| `tortomon` | `garbagemon` | neglect | 3 | mood="focused", timeOfDay=dawn|dusk |
| `tortomon` | `jagamon` | fallback | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `tortomon` | `jagamon` | standard | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `tortomon` | `megakabuterimon` | special | 3 | mood="focused", timeOfDay=dawn|dusk |
| `tortomon` | `piximon` | special | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `tortomon` | `shakkoumon` | special | 3 | mood="focused", timeOfDay=midday |
| `tortomon` | `shogungekomon` | special | 3 | mood="fierce", timeOfDay=midday |
| `tortomon` | `triceramon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `tortomon` | `zudomon` | special | 3 | mood="proud", timeOfDay=night |
| `triceramon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `triceramon` | `vikemon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `triceramon` | `vikemon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `triceramon` | `wargreymon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `troopmon` | `tankdramon` | fallback | 3 | mood="proud", timeOfDay=midday |
| `troopmon` | `tankdramon` | standard | 3 | mood="fierce", timeOfDay=night |
| `troopmon` | `warumonzaemon` | neglect | 3 | mood="proud", timeOfDay=dawn|dusk |
| `tsubumon` | `pagumon` | neglect | 1 | (none — existing gate only) |
| `tsubumon` | `upamon` | fallback | 1 | (none — existing gate only) |
| `tsubumon` | `upamon` | standard | 1 | (none — existing gate only) |
| `tsumemon` | `demidevimon` | special | 1 | (none — existing gate only) |
| `tsumemon` | `dracmon` | special | 1 | (none — existing gate only) |
| `tsumemon` | `gazimon` | neglect | 1 | (none — existing gate only) |
| `tsumemon` | `gizamon` | special | 1 | (none — existing gate only) |
| `tsumemon` | `keramon` | fallback | 1 | (none — existing gate only) |
| `tsumemon` | `keramon` | standard | 1 | (none — existing gate only) |
| `tsumemon` | `kodokugumon` | special | 1 | (none — existing gate only) |
| `tsumemon` | `madleomon` | special | 2 | (none — existing gate only) |
| `tsunomon` | `gabumon` | fallback | 1 | (none — existing gate only) |
| `tsunomon` | `gabumon` | standard | 1 | (none — existing gate only) |
| `tsunomon` | `gazimon` | neglect | 1 | (none — existing gate only) |
| `tsunomon` | `gazimon` | special | 1 | (none — existing gate only) |
| `tsunomon` | `veemon` | special | 1 | (none — existing gate only) |
| `tumblemon` | `gazimon` | neglect | 1 | (none — existing gate only) |
| `tumblemon` | `gotsumon` | fallback | 1 | (none — existing gate only) |
| `tumblemon` | `gotsumon` | standard | 1 | (none — existing gate only) |
| `tumblemon` | `ludomon` | special | 1 | (none — existing gate only) |
| `tumblemon` | `zubamon` | special | 1 | (none — existing gate only) |
| `tuskmon` | `garbagemon` | neglect | 3 | mood="focused", timeOfDay=dawn|dusk |
| `tuskmon` | `mammothmon` | special | 3 | mood="fierce", timeOfDay=dusk |
| `tuskmon` | `megadramon` | fallback | 3 | mood="proud", timeOfDay=dawn|dusk |
| `tuskmon` | `megadramon` | standard | 3 | mood="focused", timeOfDay=dawn |
| `tuskmon` | `metalgreymon` | special | 3 | mood="proud", timeOfDay=night |
| `tuskmon` | `triceramon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `tuskmon` | `wargrowlmon` | special | 3 | mood="focused", timeOfDay=midday |
| `tyrannomon` | `garbagemon` | neglect | 3 | mood="focused", timeOfDay=night |
| `tyrannomon` | `lavogaritamon` | special | 3 | mood="focused", timeOfDay=dawn|dusk |
| `tyrannomon` | `megadramon` | dark | 3 | mood="proud", timeOfDay=midday |
| `tyrannomon` | `metalgreymon` | special | 3 | mood="proud", timeOfDay=dawn |
| `tyrannomon` | `piximon` | fallback | 3 | mood="proud", timeOfDay=dawn|dusk |
| `tyrannomon` | `piximon` | standard | 3 | mood="focused", timeOfDay=dusk |
| `tyrannomon` | `triceramon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `tyrannomon` | `wargrowlmon` | special | 3 | mood="proud", timeOfDay=midday |
| `unimon` | `garbagemon` | neglect | 3 | mood="proud", timeOfDay=midday |
| `unimon` | `hippogryphonmon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `unimon` | `magnaangemon` | fallback | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `unimon` | `magnaangemon` | standard | 3 | mood="focused", timeOfDay=night |
| `unimon` | `mammothmon` | special | 3 | mood="proud", timeOfDay=dawn|dusk |
| `unimon` | `piximon` | special | 3 | mood="proud", timeOfDay=dusk |
| `unimon` | `shakkoumon` | special | 3 | mood="focused", timeOfDay=night |
| `upamon` | `armadillomon` | fallback | 1 | (none — existing gate only) |
| `upamon` | `armadillomon` | standard | 1 | (none — existing gate only) |
| `upamon` | `gazimon` | neglect | 1 | (none — existing gate only) |
| `upamon` | `gekkomon` | special | 1 | (none — existing gate only) |
| `veemon` | `exveemon` | fallback | 1 | (none — existing gate only) |
| `veemon` | `exveemon` | standard | 1 | (none — existing gate only) |
| `veemon` | `flamedramon` | armor | 2 | (none — existing gate only) |
| `veemon` | `magnamon` | armor | 2 | (none — existing gate only) |
| `veemon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `veemon` | `tyrannomon` | special | 2 | (none — existing gate only) |
| `vilemon` | `infermon` | fallback | 3 | mood="fierce", timeOfDay=dawn|dusk |
| `vilemon` | `infermon` | standard | 3 | mood="focused", timeOfDay=dawn |
| `vilemon` | `ladydevimon` | special | 3 | mood="focused", timeOfDay=dawn|dusk |
| `vilemon` | `myotismon` | special | 3 | mood="proud", timeOfDay=dawn|dusk |
| `vilemon` | `phantomon` | special | 3 | mood="proud", timeOfDay=midday |
| `vilemon` | `piedmon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `vilemon` | `warumonzaemon` | neglect | 3 | mood="fierce", timeOfDay=midday |
| `viximon` | `gazimon` | neglect | 1 | (none — existing gate only) |
| `viximon` | `renamon` | fallback | 1 | (none — existing gate only) |
| `viximon` | `renamon` | standard | 1 | (none — existing gate only) |
| `wargrowlmon` | `blackwargreymon` | special | 5 | minRefusedFood=3, mood="stubborn" |
| `wargrowlmon` | `gallantmon` | fallback | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `wargrowlmon` | `gallantmon` | standard | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `wargrowlmon` | `jijimon` | neglect | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `wargrowlmon` | `machinedramon` | dark | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `wargrowlmon` | `wargreymon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `warumonzaemon` | `jijimon` | neglect | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `warumonzaemon` | `machinedramon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `warumonzaemon` | `machinedramon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `warumonzaemon` | `piedmon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `warumonzaemon` | `puppetmon` | special | 5 | minStarveCycles=3, minIgnoredSeconds=45, mood="neglected" |
| `weregarurumon` | `jijimon` | neglect | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `weregarurumon` | `magnadramon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `weregarurumon` | `metalgarurumon` | fallback | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `weregarurumon` | `metalgarurumon` | standard | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `weregarurumon` | `murasamemon_beatbreak` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `wingdramon` | `imperialdramon_dragonmode` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `wingdramon` | `imperialdramon_dragonmode` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `wingdramon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `wingdramon` | `wargreymon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `woodmon` | `cherrymon` | fallback | 3 | mood="focused", timeOfDay=night |
| `woodmon` | `cherrymon` | standard | 3 | mood="proud", timeOfDay=night |
| `woodmon` | `garbagemon` | neglect | 3 | mood="proud", timeOfDay=dusk |
| `woodmon` | `jagamon` | special | 3 | mood="proud", timeOfDay=dusk |
| `woodmon` | `pumpkinmon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `wormmon` | `dokugumon` | special | 2 | minUndamagedKills=8 |
| `wormmon` | `flymon` | special | 1 | (none — existing gate only) |
| `wormmon` | `hudiemon` | special | 2 | (none — existing gate only) |
| `wormmon` | `kuwagamon` | special | 1 | (none — existing gate only) |
| `wormmon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `wormmon` | `raremon` | neglect | 1 | (none — existing gate only) |
| `wormmon` | `roachmon` | neglect | 1 | (none — existing gate only) |
| `wormmon` | `stingmon` | fallback | 1 | (none — existing gate only) |
| `wormmon` | `stingmon` | standard | 1 | (none — existing gate only) |
| `wormmon` | `woodmon` | special | 2 | (none — existing gate only) |
| `yakiimon` | `garbagemon` | neglect | 3 | mood="proud", timeOfDay=night |
| `yakiimon` | `jagamon` | fallback | 3 | mood="focused", timeOfDay=dawn|dusk |
| `yakiimon` | `jagamon` | standard | 3 | mood="proud", timeOfDay=dawn |
| `yakiimon` | `pumpkinmon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `yokomon` | `biyomon` | fallback | 1 | (none — existing gate only) |
| `yokomon` | `biyomon` | standard | 1 | (none — existing gate only) |
| `yokomon` | `gazimon` | neglect | 1 | (none — existing gate only) |
| `yokomon` | `wormmon` | special | 1 | (none — existing gate only) |
| `youkomon` | `garbagemon` | neglect | 3 | mood="proud", timeOfDay=night |
| `youkomon` | `kyukimon` | special | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `youkomon` | `ladydevimon` | special | 3 | mood="focused", timeOfDay=night |
| `youkomon` | `taomon` | fallback | 3 | mood="focused", timeOfDay=dawn|dusk |
| `youkomon` | `taomon` | standard | 3 | mood="focused", timeOfDay=dawn|dusk |
| `yukimibotamon` | `frigimon` | warp | 2 | (none — existing gate only) |
| `yukimibotamon` | `icemon` | warp | 2 | (none — existing gate only) |
| `yukimibotamon` | `nyaromon` | fallback | 1 | (none — existing gate only) |
| `yukimibotamon` | `nyaromon` | standard | 1 | (none — existing gate only) |
| `yukimibotamon` | `pagumon` | neglect | 1 | (none — existing gate only) |
| `yuramon` | `budmon` | special | 1 | (none — existing gate only) |
| `yuramon` | `pagumon` | neglect | 1 | (none — existing gate only) |
| `yuramon` | `tanemon` | fallback | 1 | (none — existing gate only) |
| `yuramon` | `tanemon` | standard | 1 | (none — existing gate only) |
| `zerimon` | `gummymon` | fallback | 1 | (none — existing gate only) |
| `zerimon` | `gummymon` | standard | 1 | (none — existing gate only) |
| `zerimon` | `pagumon` | neglect | 1 | (none — existing gate only) |
| `zubaeagermon` | `duramon` | fallback | 3 | mood="fierce", timeOfDay=night |
| `zubaeagermon` | `duramon` | standard | 3 | mood="proud", timeOfDay=night |
| `zubaeagermon` | `garbagemon` | neglect | 3 | mood="proud", timeOfDay=dusk |
| `zubamon` | `gladimon` | special | 1 | (none — existing gate only) |
| `zubamon` | `guardromon_gold` | special | 2 | minBond=70 |
| `zubamon` | `numemon` | neglect | 1 | (none — existing gate only) |
| `zubamon` | `skullknightmon` | dark | 2 | (none — existing gate only) |
| `zubamon` | `tialudomon` | special | 1 | (none — existing gate only) |
| `zubamon` | `zubaeagermon` | fallback | 1 | (none — existing gate only) |
| `zubamon` | `zubaeagermon` | standard | 1 | (none — existing gate only) |
| `zudomon` | `jijimon` | neglect | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `zudomon` | `metalgarurumon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `zudomon` | `metalseadramon` | special | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `zudomon` | `vikemon` | fallback | 4 | mood="rapt", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
| `zudomon` | `vikemon` | standard | 4 | mood="devoted", minPeakJoy=90, minHpRatio=0.8, sessionWindow="miracle" |
