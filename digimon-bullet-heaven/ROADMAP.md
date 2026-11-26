# Roadmap

## Phase 1 — Art pass (shipped)

Chunky integer-scaled pixel art, a fixed Digital World palette, baked sprite sheets, juiced particles (trails, hit sparks, dissolve deaths, evolution flash), stylized HUD, and a reduced-effects toggle. The tamer/companion split, proximity feeding, and neglect tiers ship in this phase too.

## Phase 2a — Egg-hatch starter (shipped)

A run now starts from a **Digitama** picked after the tamer select (Agumon line, Gabumon line, or Random). The egg wobbles beside the tamer, cannot attack, and hatches after **24s**, or sooner if you feed it (−8s per meal) or defeat foes near it (−0.5s each within 90px). Early waves are gentle. Hatch uses the same evolution flash, then:

- Agumon line: Botamon → Koromon → Agumon (existing Rookie gates onward)
- Gabumon line: Punimon → Tsunomon → Gabumon (existing Rookie gates onward)

Baby / In-Training forms have short-range weak attacks and quick care gates (Baby: Lv 2, 2 meals, 35 joy; In-Training: Lv 4, 5 meals, 45 joy). The Numemon neglect branch still starts at Rookie, so a neglected In-Training form just stays put until you care for it (or it later hits the Rookie neglect path). The Gabumon egg stays locked behind the existing Gabumon unlock. Debug: **Y** hatch now, **1–4** force Baby / In-Training / Rookie / Champion. Last egg pick is stored through `js/storage.js`.


## Phase 2c — Full branching tree (shipped)

The Digimon UP roster is in: **281** species (atlases in `assets/sprites/atlases-up-all/`, ~19 MB of PNGs) and `js/evolution-tree.js` (`window.EVO_TREE`: 264 nodes, 1,327 branches). Runs lazy-load only the current egg line, upcoming branches, and the current wave’s enemies so the Tesla / phone boot stays light; the atlas index ships as `js/up-atlas-index.js` so `file://` does not need `fetch`. Evolution is `EVO_TREE.pickEvolution` with a thin merge wrapper that keeps the existing Agumon / Gabumon / Numemon gates identical on a mixed-care standard route. Alternate official paths (meat / fish / berry majorities, neglect, warp, dark, and so on) can still win when their extra conditions are met. The HUD Next hint and the pause-menu list read the same tree (unmet secret branches show as ???). Later waves pull extra enemies by stage from the tree; the first boss is still Kuwagamon. Debug: **]** / **[** cycle forms, **B** evaluate branches. Details: `docs/EVOLUTION.md`.

## Phase 2b — Capture items and shop (shipped)

Enemies drop **Bits** (amount scaled by stage; bosses ×4). The tamer magnets them up like XP, and a run total sits on the HUD. **Jijimon** visits the field (first at 38s, then every 85s, stays 32s) and a Shop button / **Q** / gamepad Y opens a pause shop that works with keyboard, gamepad, and touch, including Tesla and phone layouts. Each repurchase of the same item in a run multiplies its price by 1.5 (the panel shows the next price). The catalog: meat / fish / berry packs (they count toward favorite-food evos), a Restore Disk, a Training Ball, a Care Reset, a temporary Power Chip, Data Chips, a Digi-Egg of Courage (`digimental`, official armor branches), and a Crest of Courage (substitutes for the warp boss gate only; default warps still work without it). Icons are original 12×12 pixel art in `js/sprites.js`.

A **Data Chip** captures a non-boss at or below 25% HP in range. Chance scales with remaining HP, stage gap, and tamer level, with a clear captured / broke-free flash. Success joins one active ally (follows and auto-attacks) plus a reserve of 3; swap in the pause menu. Captures persist in the profile **DigiBank** through `js/storage.js` (view from the title screen; optionally bring one as a starting ally). Early runs can afford about 2–3 cheap purchases (Pagumon drops ~3 Bits; meat pack 12, Data Chip 25). Debug: **=** Bits, **O** shop, **V** force capture.

## Phase 3 — Cloud saves and multiplayer

**Cloud saves.** Keep `js/storage.js` as the only persistence boundary (`loadProfile` / `saveProfile` / `clear`, already Promise-based). A later adapter can talk to Firebase or Supabase without touching combat code.

- *Firebase:* mature anonymous auth, Realtime Database or Firestore, generous offline cache. Heavier SDK, vendor lock-in, security rules to write carefully.
- *Supabase:* Postgres + Row Level Security, a small official JS client, easy anonymous/session auth, straightforward JSON documents. Slightly more ops (policies, backups) if self-hosting.

Recommended start: **anonymous auth**, one profile document per user (`unlocks`, `bestTime`, `bestForm`, settings). Sync on title, after a run, and after an unlock. Conflicts: **last-write-wins on settings**, **union on unlocks**, **max on bestTime** so a stale client cannot wipe a better run.

**Multiplayer.** Two viable shapes:

- *WebRTC peer co-op:* no server cost, one tamer hosts, the other joins via a short code. Fine for two-player “two tamers, shared or paired partners” in a private lobby. NAT traversal and cheats are the weak points.
- *Small authoritative server:* a tiny Node (or similar) tick host that validates movement, drops, and kills. Better for public rooms and anti-cheat; needs hosting.


**Party and invite codes (local scaffolding).** The game is fully playable with one human. A pre-run title option sets **CPU teammates to 0–5 (default 0)**. Session slots are dynamic — `1..N` humans plus any optional bots — and are hard-capped at **6**. Invite-code join is stubbed in `js/session.js` (`redeemInvite`). CPU teammates are lone Digimon with no tamer; they fight on their own AI in missions and brawls. The end-of-round brawl uses the same top-down field camera as missions, laid out for up to 6 fighters. With fewer than two fighters it is skipped by default (or a short tunable solo bonus if `BRAWL_CFG.soloMode` is `"bonus"`). If anyone is down, exactly one random dead player is revived; if all survive, no revive. Odds, betting (up to 5 bettors), and a DigiBits payout screen apply whenever two or more participants are present. Details: `docs/COOP.md`. Live mission combat, field-mega spawns, merchant windows, level-up offer tokens, farm outcomes, and brawl fight physics/AI/KO/winner detection tick an in-process host-authoritative `MissionSim` + `BrawlSim` + `Progression` (clients submit input and intent only; the browser does not nominate a winner or roll spendable rewards; `?debug=1` does not bypass the authority). Rarity tick, discovery/unlock persistence, farm and brawl due scheduling, phase-resume timers, and solo-local vs network pause now live on the in-process authority; remaining presentation and AI nuance gaps are listed in `docs/NETCODE.md`. Browser-first platform (the mission / farm / brawl world frame is native WebGL 1; Canvas 2D remains for asset baking, text textures, and non-`#game` UI canvases — see `docs/PLATFORM.md`) and storage plans are in `docs/NETCODE.md` and `docs/PLATFORM.md`. Foundations are in-tree, not a live network service. Cloud saves are not urgent; local guest storage is the prototype.

Either way, serializable state should include: tamer pose and HP, Digimon pose/form/HP/care meters/faint, carry stack, enemy seeds or snapshots, orb list, wave clock, and RNG seed. Weapons and upgrades are IDs plus levels, not live closures. Prefer sending inputs and letting both sides simulate, with occasional snapshots for corrections.

## Nov 13 update (shipped)

- Click / tap an enemy to send the partner straight after it (`focus` input → `MissionSim._setFocus`; overrides the roam leash until the target dies or the tamer gets 1.6× the return radius away).
- Egg: hatches at exactly 20s (`HATCH.time`), no feed / protect shortcuts. No spawns until `HATCH.enemyLead` (1s) before hatch, then `HATCH.openingFlood` (10) Pagumon.
- Battle food drops (meat / fish / berry by `FOOD.dropWeight`, chance `CARE.meatDropChance`) go into the bag with no cap; feeding stays farm-only.
- Field Jijimon drawn at 5/6 of the tamer's height (`SHOP.merchantHeightRatio`).

## Nov 13 update 2 (shipped)

- **Minimap** (top right, `#minimap`, drawn in `game.js drawMinimap`): terrain around the tamer, view box, tamer arrow, partner, teammates (CPU mates, captured ally, other tamers), drops (food / heal / toys), faint enemy specks, pulsing Megas (orange diamond) and bosses (red), Jijimon's shop ($). Megas, bosses, teammates, the shop and events stick to the map edge when off-screen. Future events: `DBH.minimap.mark(id, { x, y, color })` / `unmark(id)`.
- **Seasons** (`js/seasons.js`): Spring → Summer → Fall → Winter, 6 minutes of battle time each, looping into the next year. Each season passed raises enemy HP (+20%), damage (+10%), speed (+3%, capped), spawn rate (+10%) and cap (+8%), plus +8% XP, folded into `weather.liveMods`. Terrain, trees and flowers recolor per season (snow, orange leaves, blossoms), with ambient petals / pollen / leaves / snow and a toast when the season changes.
- **Season counter** under the minimap: "Year N · Season" with a progress bar.

## Nov 13 update 3 (shipped)

- **Clock** counts up from 00:00; the overtime ramp is off (`BATTLE_CFG.countUp`). Seasons carry the difficulty.
- **Slow leveling**: steeper XP curve (`XP.base 9, power 1.78`); the authority now uses `xpForLevel` (it was using a flat 8+6L).
- **Hard evolution** (`js/evo-hardmode.js`): leaving a stage needs time in the current form *and* a level — Baby 3 min / Lv 4, In-Training 5 min / Lv 8, Rookie 8 min / Lv 14, Champion 12 min / Lv 20, Ultimate 15 min / Lv 28, Mega 20 min / Lv 36 — on top of each branch's secret conditions. `EVO_TREE.pickEvolution` now honours the wrapped `conditionsMet`, so the rarity and stat-cap layers actually apply.
- **Stage-matched enemies** (`js/stage-waves.js`): the field follows the partner's stage (Baby → Babies + In-Training + rare Rookie, and so on). Bosses come from one stage up; field Megas wait until the partner is a Champion.
- **Secret evolutions**: the "Next:" HUD line and the pause-menu requirement list are gone (debug only).
- **Digivolution Log** (`js/evo-log.js`, title + pause): every run's route and a form grid with ??? for forms never reached. Never shows how.
- **Farming**: enemies drop seeds (6 crops); plant in the garden's 6 plots at the farm; crops grow in battle time (carrot 2.5 min … potato 12 min) and are harvested into the bag. Vegetables feed and heal; meat + veg is a balanced diet (extra joy and healing). Authority intents `farm.plant` / `farm.harvest`.
- **Vegetable routes**: hidden diet branches into Budmon, Palmon / Lalamon / Mushroomon, RedVegiemon / Yakiimon / Togemon / Woodmon / Sunflowmon, Jagamon / Cherrymon.
- **Farm rebuild** (`js/farm-art.js`): pixel-art lawn, clay running track, dirt paths, post-and-rail fence with gate, punching bag gantry, chalkboard easel, picnic play area, Jijimon's cottage, garden with scarecrow, well, hay, trough, tree line; seasons apply. Compact farm panel.
- **Fixes**: the authority now counts boss kills and kills by attribute / species (evolution routes that need them could never fire before).

## Nov 14 update (shipped)

- **Title screen** (`js/title-scene.js`, `css/title.css`): pixel-art hill with the Digi Egg, tamer and two baby Digimon under a sky that cycles through day, sunset, night, meteor shower, rain, thunderstorm, eclipse and daybreak. Pixel-font menu buttons. Tap the egg to make it hop.
- **Egg pick**: one egg on the hill with arrows / swipe, a name plate, and locked eggs shown as silhouettes.
- **Online co-op** (`../host-game.js`, `js/net/online.js`, `js/online-ui.js`): Host Online / Join Game, room codes, invite links, lobby, late join, reconnect, downed + hold-to-revive, shared farm break. See `../HOSTING.md`. Brawls are off online.
- **Fixes**: movement used the oldest queued stick input (about half a second late at 60 fps, half speed under 25 fps) — the newest input now wins. Authority events (hatch cut-in, kill sparks, boss / Mega notices, farm warnings, capture charge, Digivolution Log entries) were being dropped before the screen read them; they are held until read now.

## Nov 15 update (shipped)

- **Slow burn** (`js/stage-waves.js`): the enemy tier follows battle time first, the partner second. Baby I in Spring, In-Training through Summer, first Rookies in Fall, Rookies main by the end of Year 1, Champions slowly through Year 2, Ultimates late in Year 3. Never more than 1.3 tiers above the partner. Tune `TIER_KEYS`.
- **Thinner field**: about 7 enemies at the start, 10 at minute 6, ~26 at minute 24, packed only from Year 2 on. Opening flood 10 -> 5. Tune `FIELD`.
- **Tougher enemies** (`js/species-catalog.js` `STAGE_ENEMY`): roughly double HP, ~40% more damage, a bit more XP each.
- **Speed**: tamer 168 -> 160; early enemies run at 92-96% of that, so the tamer and partner are only a hair faster. Season speed-up per season 3% -> 2%.
- **Fix**: level-up stat picks (Speed Up, Magnet Field, Power Up, Quick Claws, Vital Boost) were recorded but had no effect in the authority. They work now.
- **Online brawl** (`js/net/online.js`, `js/net/progression.js`): real roster, standing tamers fight, downed tamers bet, one random revive, per-player payouts.

## Nov 15, second pass (shipped)

- **One stage per season** (`js/stage-waves.js` `TIER_KEYS`): Spring Baby + In-Training with Rookies trickling in at the very end; Summer Rookies rising, Champions near the end; Fall Champions rising, Ultimates near the end; Winter Ultimates. Partner cap loosened to 2.5 tiers.
- **Megas** (`js/data.js` `MEGA_SPAWN`): for the first three years only a rare field Mega (30% roll once a season from minute 18, one at a time, no Mega bosses). From Year 4 (72 min) Megas join the regular field and field Megas come every ~55 s, two at a time. Field Mega: 9x HP, 1.6x damage, slightly faster.
- **RPG-style balance** (`js/species-catalog.js` `STAGE_ENEMY`): a further ~+40% HP and ~+20% damage per stage, slightly fewer enemies and a lower late-game cap.

## Nov 15, third pass (shipped)

- **Terrain for enemies** (`js/net/mission-sim.js` `_steer`, `_flowField`): enemies slide along cliffs and path around them (breadth-first flow field per target when the straight line is blocked). Spawns snap to walkable ground.
- **Body collision** (`_resolveBodies`): enemies push each other apart and can never stand on a tamer, a partner, an egg, the captured ally or a CPU teammate.
- **Untargetable tamer** (`TAMER.invulnerable`): no tamer HP, no bar, enemies only go for Digimon. Solo: the run ends when the partner goes down. Online: the partner is downed until a teammate revives it; the run ends when every partner is down.
- **Curated move pools** (`js/moves.js`): ten move families plus named Agumon and Gabumon lines; four slots (primary, melee, aura, orbit) that open up by stage. Moves carry over on digivolution and a level-up offers to evolve them into the bigger version.
- **Gritty pass**: fewer enemies again, more HP, slower movement and a slower hit rhythm; tamer 160 -> 150; partner attacks 12% slower; partner fights closer to the tamer and runs with it; a slow HP regen after 4 s without a hit.

## Nov 15, fourth pass: attack looks

- New `js/attack-fx.js`: every move family has its own pixel shot shape, trail and impact (fire, ice, water, dark, holy, machine, nature, slime, wind, beast, plus the baby bubble). Bigger tiers draw bigger and hit louder. Melee is a claw rake instead of a flat wedge; auras are turning pixel rings; orbit orbs leave a tail.
- The sim sends small "fx" events (cast, hit, boom, slash, tick, pulse) and bullets carry their move id, so friends online see the same effects.
- Orbit moves now really orbit and hit what the orbs touch (before, the authority fired them as plain shots). Aura damage now counts Attack boosts.
- Drawing note: the GL canvas only fills simple convex shapes, so curved pieces are built from small quads.

## Nov 15, fifth pass: bosses, XP bar, feed menu

- Bosses are drawn 1.35x (field Megas 1.5x) with a 1.2x body and an always-on orange health bar.
- XP bar and level over the partner's head in battle (gold when a level-up is waiting).
- F opens a feed menu next to the partner, at the farm and in battle (new `field.feed` intent; instant, no pause). Number keys or tap to pick; tapping food in the bag opens it on phones. E is still interact.

## Nov 15, sixth pass: new tamers, walk feel

- Eight original tamers (Kai, Mika, Ren, Nori, Tobi, Suki, Dax, Juno; cel-shaded with tinted outlines to sit beside the Digimon UP sprites) replace the Digimon World 3 ones. They are drawn by `scripts/art/make_tamers.py` (edit the TAMERS table for colours, hair, outfit; rerun to regenerate): 40x56, six-step walk in down / up / side.
- Walk feel for every Digimon (`WALK_FEEL` in sprites.js): frames play a little faster, each creature starts at its own point in the cycle, plus a small hop, forward lean, landing squash and dust. Digimon without walk frames get a bigger hop.
- The Digimon UP walk frames themselves were left alone: they are already full 9-19 frame cycles.
- Six digital ghost characters (Byte, Glim, Zap, Ember, Nyx, Null), one shape in six colours, from the same generator (GHOSTS table).
- Human tamers retired: the six ghosts are the only playable characters (humans can be redrawn with `make_tamers.py --humans`). Old Digimon World 3 tamer frames removed.
- Removed the sky band across the top of the farm and the upper-screen bands in eclipse and meteor weather (the whole-screen tint stays). Key hints now say E for interact, F for feed; hold-to-revive is E.
- Baby to In-Training gate: 2 minutes in form and level 3 (was 3 minutes and level 4).

## Nov 15, seventh pass: pickup art

- New drop art from `scripts/art/make_items.py` (assets/items/pickups/): XP crystal (2 frames), spinning DigiBit coin (4 frames), meat, fish, berry, six seed packets. `js/pickup-art.js` draws them with a ground shadow, coloured glow, bob and twinkle, and reuses meat / fish / berry / bits for the bag, shop and HUD icons. The health cross is unchanged.

## Nov 15, eighth pass: digivolve choice

- When a digivolution is ready the partner asks first (Y Digivolve / N Not yet, or tap). The game does not pause. CPU partners and away players still digivolve automatically.
- "Not yet": the partner keeps levelling as it is, gets ONE small random perk (`EVO_HOLD.perks` in data.js: health, attack, attack rate, speed or pickup range) and asks again 5 levels later. Requirements are re-checked when you accept.
- Digivolving gives an instant step up per digivolution (`EVO_BOOST`): +8% attack, 3% faster attacks, +3% partner speed, the new form's bigger health and at least 75% of it filled. Shown in a banner.
- Hidden held-back routes (`HOLD_ROUTES` in evo-hardmode.js): Koromon > Guilmon, Agumon > Growlmon, Gabumon > Leomon, Greymon > Garudamon, Garurumon > Wingdramon (one hold in that form), MetalGreymon > Gallantmon (two holds). Covered by scripts/evo-hold-test.js.

## Nov 15, ninth pass: feel fixes

- Hunger: `CARE.fullnessDecayPerSec` 1.05 > 0.55.
- Shaking while moving: the sim ticks 25x a second; drawn positions of the tamer, partner, enemies and shots now slide between ticks (`smoothBetweenTicks` in game.js, solo only; online guests already interpolate, the online host does not yet). Also dropped the extra hop/lean on Digimon that have real walk frames, and the ghosts no longer bob up and down inside their moving frames.
- Early game: `FIELD` rate0 0.2 > 0.32, rate6 0.42 > 0.52, cap0 3 > 5, cap6 6 > 8; Baby enemies hp 16 > 20, dmg 5 > 6, speed 112 > 116; In-Training hp 32 > 38, dmg 8 > 9, speed 115 > 118; opening wave 3 > 4.
- Click-to-move: clicking open ground calls the partner to that spot (within `LEASH.goRadius` of the tamer); it waits `LEASH.goHold` (1.5 s) and then fights on its own again. Clicking an enemy still orders an attack.

## Nov 15, tenth pass: tamer level and stats

- HUD: the level chip is gone (level shows over the partner); bag items moved to the bottom left; the mouse wheel zooms (0.7x to 1.8x; at the farm it still scrolls item slots, Ctrl+wheel zooms there).
- Tamer level (`TAMER_LEVEL` in data.js): same XP gems, 3.5x the requirement. Each level gives 10 stat points. T or the chip under the bars opens the panel; nothing pauses. All of it resets with the run.
- Stats: Strength (+1.5% physical = melee/claw moves), Intelligence (+1.5% special = shots, auras, orbs, blasts), Agility (attacks 1% faster, floor at half), Dexterity (+0.8% accuracy), Vitality (+2% health), Luck (+0.6% crit on a 3% base, 2x damage; and up to a 25% chance at digivolve time to land on one of the form's other real routes).
- Misses: enemies have `evade` (species-catalog.js `evadeOf`: by stage, +fast, +flying, +ghost, bosses low). A dodged strike does nothing and shows "miss"; a dodged shot flies on. CPU partners never roll.

## Nov 15, eleventh pass: level-up card icons

- New icons from `scripts/art/make_move_icons.py` (assets/icons/moves/): each move shows its family emblem framed by its type (shot, blast, claw, aura, orbit); the five stat upgrades have their own. `js/move-icons.js` picks the icon per move. Shown at 54px on the cards.

## Nov 16: patterned eggs

- Ten shell patterns per starter line (dots, spots, stripes, zigzag, flames, stars, patches, sash, diamonds, cracked) from `scripts/art/make_eggs.py`, in warm colours for the Agumon line and cool for Gabumon. A pattern is rolled per egg; flipping to an egg on the title screen or clicking its card rolls again, and the Random Egg rolls line and shell.

## Nov 16: an egg for every Baby

- `js/egg-lines.js` adds an egg line for each Baby I in the tree (22 in all with the two originals): a Digitama species, a LINES entry and a picker entry, all unlocked (the Gabumon lock is gone). Shell art for each (ten patterns, colours read from the Baby's own sprite) comes from `scripts/art/make_eggs.py` and is fetched the first time an egg is shown.

## Nov 16 (later): egg unlocks and catching

- Eggs: five open at the start (`EGG_UNLOCK.starters`: Agumon, Gabumon, Jyarimon, Chibomon, Poyomon lines). Each other egg opens after defeating that exact Baby in the wild, counted across runs in the save (`eggKills`, `eggUnlocks`): 1000 for the first egg won, +250 for each after (`EGG_UNLOCK.first` / `.step`). The Random Egg can hatch any line, locked or not.
- A wandering Baby (stage-waves.js `BABY_VISITOR`, about one spawn in seven, a different Baby kind each minute) keeps every Baby turning up all run.
- Catching: per-kind kill tally for the run (`killsBy`). Enough of one kind (`CAPTURE.koByStage`: Baby 20, In-Training 25, Rookie 30, Champion/Armor 35, Ultimate 40, Mega 45, Mega+ 50) allows a try on that kind at a flat `CAPTURE.chance` (10%). Hit or miss, that kind's tally resets. No Data Chip and no weakening needed any more.

## Nov 16 (third pass): Ragnarok-style status, Baby swarms

- `js/ro-stats.js` holds the classic Ragnarok Online (pre-Renewal) rules, covered by scripts/ro-stats-test.js: all stats start at 1 with 48 points; reaching the level after L gives floor(L/5)+3; raising a stat at x costs floor((x-1)/10)+2; cap 99. Base level = tamer, Job level = Digimon.
- Derived: status ATK (STR, bits of DEX and LUK) scales physical moves; MATK (INT) scales special moves; Hit = Lv + DEX, Flee = Lv + AGI, chance to hit = 80 + Hit - Flee (5..100, 95 max for enemies); attack delay x (1 - AGI/250 - DEX/1000); HP x (1 + VIT/100) and a flat soft DEF; crit 1 + LUK*0.3 % for +40% and ignores Flee; perfect dodge 1 + LUK/10 %. The partner can now dodge enemy hits.
- Adaptations: no SP or casting (INT is special-move damage only); ATK/MATK become damage multipliers (`ATK_SCALE` 100, `MATK_SCALE` 160); soft DEF is VIT x 0.12 per hit; enemy levels are set to this game's slow base levelling (species-catalog.js `STAGE_LV`); job bonus = +2 to the element's stat, +1 VIT per digivolution, +1 LUK per two.
- Baby swarms (stage-waves.js `SWARM`): from 0:45, packs of 2 to 5 Baby kinds (a new set each minute), 0.12/s rising to 0.9/s, with their own limit (3 rising to 18) outside the normal enemy cap; they never get the late-game HP boost.
- Cast timer: INT (with DEX) now sets the speed of special moves, delay x (1 - INT/250 - DEX/300); AGI (with DEX) keeps physical moves, delay x (1 - AGI/250 - DEX/1000). Shown in the panel as Attack speed and Cast speed.

## 2026-11-16f — Skill tree (Ragnarok style)
- Job level up = 1 skill point; the three-card pick is gone (`sim.skillTree`).
- `js/skill-tree.js`: moves Lv 1-10 per line (Shots / Claws / Auras / Orbits), bigger move needs the form that knows it + the smaller move at Lv 3; aura needs a shot at Lv 5, orbit an aura at Lv 3. Only the biggest learned move per kind fires; smaller ones add 1.5 %/level.
- Masteries (Power, Quick, Vital, Fleet Foot, Data Magnet) replace the old stat cards.
- Panel on K / chip under the bars; `skill.add` intent (host-checked, works for guests). CPU and away partners spend automatically.
- A downed partner can no longer call a brawl.

## 2026-11-16g — Elements
- `js/elements.js`: no gear, a Digimon's element is its move family and its moves carry it. Attribute triangle Vaccine > Virus > Data > Vaccine (x1.2 / x0.85; Free, Unknown, None neutral) multiplied by a ten-element table: strong x1.5, resisted x0.75 when the defender's element beats yours, same element x0.5. Bubble Blow and Headbutt have no element.
- fire > ice, nature, machine · ice > wind, nature, water · water > fire, machine · nature > water, slime · wind > beast, slime · machine > beast, wind, ice · beast > nature, dark · slime > machine, fire, holy · dark > holy, beast · holy > dark, slime.
- Applied on the authority both ways (`MissionSim._elemMul` in `hurtEnemy` / `hurtMon`), so it works online. "Weak!" / "Resist" floats (at most one per target every 0.7 s). The stat panel (T) shows the partner's element, what it beats and what it is weak to. Enemy kinds now read their type from the tree for their element. Brawls do not use elements yet. Test: scripts/elements-test.js.

## 2026-11-16h — Ghost restyle
- `scripts/art/make_tamers.py` ghosts redrawn as holograms: see-through body (solid at the crown, thinning toward a wispy hem), coloured rim instead of a black outline, soft halo, faint scanlines, data spark antenna and drifting flecks.
- A face each: Byte smile, Glim "ooh" with blush, Zap big grin, Ember frown with brows, Nyx flat line and sleepy lids, Null smirk with a raised brow (`GHOST_FACE`).

## 2026-11-16i — Named moves for every egg line
- `js/moves.js` `EGG_LINES`: 17 more named lines (Veemon, Guilmon, Wormmon, Hagurumon, Gotsumon, Keramon, Biyomon, Hawkmon, Tentomon, Gomamon, Patamon, Palmon, Renamon, Zubamon, Armadillomon, Salamon, Terriermon), so all 22 eggs have their own shots, claws, aura and orbit along the standard route. Where routes meet (Imperialdramon, Garudamon, MetalGarurumon) the move is shared. Off-route forms still use their family's set.
- Each new line has its own look (`look`: shape + colours, `fx` = borrowed trail/impact), registered in `js/attack-fx.js` as `L_<line>`: blue flame for Veemon, crimson orbs for Guilmon, yellow bolts for Tentomon, pink petals for Palmon, and so on.
- A line's family is also its element (Keramon line is now Dark, Gotsumon line Machine).

## 2026-11-16j — DNA digivolution
- `js/dna.js`: pairs, range and gates. Live pairs (both halves and a result have sprites): ExVeemon + Stingmon > Paildramon or DinoBeemon; Aquilamon + Gatomon > Silphymon; Ankylomon + Angemon > Shakkoumon; ExVeemon + Tyrannomon > Megadramon or Paildramon (virtual pet pairing). Pre-wired but off until the result has art: Omnimon, Mastemon, Millenniummon, GraceNovamon.
- Flow (host-checked, `dna.ask` / `dna.answer` in progression.js, relayed for guests): stand within 110 px of a teammate whose partner is the other half, press J (or tap the chip) and pick a result if there are two; they get a 15 s prompt, pick their own result (1 / 2) or say not now (N). Each partner becomes what its own tamer picked.
- Gates on both partners: Champion halves Lv 16 and 5 minutes in form; Ultimate Lv 24 / 8 min; Mega Lv 30 / 10 min.
- A downed DNA partner drops back to its earlier form (and loses that digivolution's boost); the other keeps its DNA form. Digivolving onward makes it permanent. Human teammates only (online); CPU teammates never reach these forms. Test: scripts/dna-test.js.

## 2026-11-16k — Slow-machine safety net
- Profiled in headless Chrome: game logic is about 3% of a frame, about 135 draw calls and 1,000 vertices, no per-frame texture uploads; identical when served and when opened from the file. The frame cost is pixels. With software rendering (no graphics card) a 1600x900 window ran at 11 fps.
- `PERF` in game.js: if frames average slower than 30 ms over 90 frames the picture is drawn at 75%, 55%, then 40% resolution and stretched (HUD stays sharp; never steps back up in a session). A browser reporting a software renderer starts at 55% and shows a one-time notice to turn on graphics acceleration. Software-rendered test: 11 fps before, 30 to 37 fps after.

## 2026-11-16l — Tuning
- Click-to-move: the partner waits 0.75 s at the spot before fighting on its own again (`LEASH.goHold`, was 1.5).
- Farm visits last 120 s (`FARM_CFG.stayCapSeconds`, was 60).

## 2026-11-16m — Endless Digital World
- The map was already generated from position with no edge; it now has eight biomes (`js/biomes.js`), picked per tile in world.js from three slow noise fields (`BIOME_F` 0.014, roughly 70 tiles across; shares set against the measured noise spread). The first 30 tiles around the start are always File Plains.
- File Plains, Native Forest, Server Desert, Freezeland, Sludge Marsh, Ember Crags, Circuit City, Dark Area. Each has its own ground, path, "water" (ice, toxic sludge, lava, data streams, void), plateau and wall colours, how much cliff / water / path it has, its own props, digital touches baked into the ground (grid dots, buried chips, glowing cracks, circuit traces, static), and minimap colours.
- New props drawn in biomes.js: cactus, telephone pole, data crystal, ice crystal, server rack, dead tree, glowing mushroom, lava vent, glitch shard, buried gear, floating binary digits; snowy tree and rock reuse the winter recolour.
- Seasons recolour only the green biomes (plains, forest, marsh). A line names the biome when you walk into a new one.
- `materialAt` and the biome lookup are remembered per tile (collision asks for the same tiles many times a tick).
- Not changed: which enemies appear where, and lava / sludge are walkable like water was.

## 2026-11-16n — Solid lava, idle packs
- Lava (Ember Crags) blocks movement for everyone, like a plateau (`solidWater` in biomes.js, `world.isRaised`). Less of it and fewer walls there (water 0.69, cliff 0.64) so the crags stay passable. Sludge, ice and void pools are still walkable.
- Burn (`LAVA` in data.js): a partner within 14 px of lava loses 3% of max HP every half second, never the last hit point. Enemies are not burned.
- Idle packs (`PACKS`): from 1:15, every 50 to 85 s, 8 to 14 of one current-wave kind appear 620 to 900 px away and mill around their spot at 30% speed. A tamer or partner within 185 px of any of them, or a hit on one, wakes the whole pack ("!" float). Up to two packs at a time, outside the normal enemy limit; a pack left 2600 px behind is removed. Test: scripts/packs-lava-test.js.

## 2026-11-16o — Warp burst
- `BURST` in data.js. A meter on each partner: +0.55 a second while enemies are out, plus 3.2 for every enemy's-worth of health dealt in damage (x5 against bosses and Megas). Shown as a chip under the bars; full, it pulses "WARP READY [R]".
- R (or tapping the chip) spends it: for 6 s the partner is drawn as the standard next form of its line (`MissionSim._burstForm`, tree branches of kind "standard" only, so no secret route is ever shown), fires that form's shot and claw at their top level with 0.3x the delay and +35% damage, +35 points of crit chance, moves 1.7x as fast, darts to the nearest enemy within 330 px, and takes half damage. Then it is itself again. A form with no standard next form bursts as itself.
- The real form never changes underneath (`p.burstForm` is display only), so levels, digivolution checks, DNA forms and elements are untouched. No charge is gained while a burst runs. CPU and away partners use theirs when an enemy is near. Host-checked `burst` intent, relayed for guests. Test: scripts/burst-test.js.

## 2026-11-16p — Burst styles
- Three warp burst styles (`BURST.styles` in data.js; `burstStyleOf` in moves.js picks by body type, then element; 77 Strikers, 103 Bombarders, 84 Guardians over the roster):
  - Striker (insects, beast men, warriors, knights, blade types; beast / nature / wind): darts enemy to enemy with its best claw (one stage early if the line has a bigger one), 0.22x delay, +55 crit, 1.9x speed.
  - Bombarder (dinosaurs, dragons, sea beasts, birds, ghosts, demons; fire / ice / water / slime / dark): stays where it is and pours out its biggest shot at 0.24x delay, +50% damage, every shot exploding (52 px).
  - Guardian (angels, machines, rock types; holy / machine): stays by its tamer in a 125 px ring that pulses every 0.4 s for damage and a 190 knockback, fires at 0.5x delay, takes a quarter damage.
- Each burst is dressed in its element (`BURST_LOOK`, `drawBurstAura` in game.js): gold rays and feathers (holy), purple turning gears (machine), flame tongues, ice shards, ripples, dark wisps, leaves, wind streaks, claw slashes, bubbles; plus the element's own particles and a style call-out ("Striker!") at the start.

## 2026-11-16q — Salamon is a Guardian
- Salamon's burst style follows its Holy element again (Guardian) instead of the hand-set Striker. Gatomon stays a Striker.

## 2026-11-16r — Shinies
- `SHINY.chance` 0.001 in data.js: rolled in `_applyForm` on every digivolution (never the hatch, never a DNA drop-back). Once `p.shiny` is set it stays for every later form, DNA forms and warp bursts included. Sent in snapshots, so teammates see it.
- The look is a per-Digimon palette swap in sprites.js (`shinyCanvas`): the sprite's main colour and second colour (by hue, judged on chroma) each move to their own new hue from a list of contrasting pairs (lime/purple, hot pink/teal, cyan/orange, violet/yellow, gold/blue...), picked per species and never close to its normal colours; smaller details shift with them; shading is kept; outlines, eyes, claws stay. Mostly grey or white Digimon have their pale parts coloured instead. Recoloured frames are cached the first time each is drawn.
- A twinkle on any shiny partner, a "SHINY!" call-out and line when it happens, and a star on that form in the Digivolution Log. Test: scripts/shiny-test.js.

## 2026-11-16s — Profile, achievements, party slots
- `js/profile.js`: one profile per browser (name, ghost, date made, totals, achievements) in localStorage `dbh_profile_v1`. The title screen asks for it the first time; after that a chip in the top right shows who you are and opens your card, where name and ghost can be changed. The profile's name is the online name and its ghost is the default ghost.
- 17 achievements, counted from the game's own events (`D.profile.onEvent` from processAuthEvents): first digivolution, Champion / Ultimate / Mega, holding back, warp burst, DNA, shiny, boss, wild Mega, catch, egg unlock, 100 / 1,000 / 10,000 KOs, a full year, an online run. A banner drops in when one is earned.
- Lobby: the six slots are a party. Empty ones are "+ Invite" buttons (copy the invite link); filled ones show name, ghost, egg and achievement count, and open that player's card: ghost, egg picked, eggs unlocked, Digimon raised, longest run, runs, KOs, shinies and achievements. The card rides in the roster (`N.setProfile`, `prof` message, size-capped and escaped on display).
- Not included: passwords or logging in from another device (needs the account server that is parked); the game save and Digivolution Log are still one per browser.

## 2026-11-16t — Regional Digimon, and a real ally
- Regions (`REGION.share` 0.7 in data.js; `homeOf` in biomes.js): every kind has a home biome by what it is (ice and holy in Freezeland, machines in Circuit City, dark in the Dark Area, dinosaurs / reptiles / rock in Server Desert, insects and plants in Native Forest, sea and slime in Sludge Marsh, other fire in Ember Crags, birds and beasts in File Plains; a Baby lives where its line's Rookie lives). 70% of ordinary spawns, Baby swarms and idle packs are swapped for a same-stage native of the biome the tamer stands in; a kind already at home is never swapped; bosses and Megas are untouched. A locked egg's card says where its Baby lives.
- The caught ally (`ALLY` in data.js):
  - one attack every 7 s at 60% damage, with its own form's move (it used to fire Pepper Breath like a second partner);
  - earns half the XP of every defeat, levels up, and digivolves along its standard line only (leaving Baby at Lv 3, In-Training 6, Rookie 12, Champion 20, Ultimate 30);
  - a passive by element while it is out: fire +8% attack, ice attacks 7% sooner, water heals 0.4% a second, nature +12% max health, wind +10% partner speed, machine 8% less damage taken, beast +6% crit, slime +25% pickup range, dark warp burst charges 20% faster, holy +5% lucky dodge;
  - DNA digivolving: with no teammate in range, J pairs your partner with the ally if it is the other half (same level and time gate on the partner). The ally is absorbed, its passive stays with the partner for the run (up to two of the same), the next reserve Digimon steps up and the slot is free for another catch.
- An ally chip under the bars shows its level and passive and any kept passives; the pause menu lists them too. Test: scripts/ally-region-test.js.

## 2026-11-16u — Lords of the land
- `LORD` in data.js. world.js marks a lair in about half of every 56 x 56 tile block: open ground with the same biome all around it, never within 38 tiles of the start, ringed by six standing stones. In a test of the first 14,000 px around the start there were 62 lairs across all eight biomes, the nearest about 4,000 px out.
- When a tamer comes within 1,500 px the lair's lord is brought in: a native of that biome (picked per lair), a Champion in Year 1, an Ultimate in Year 2, a Mega from Year 3 (or the nearest stage below that the biome has). It is a boss with 2.6x a boss's health (+60% a year) and 1.35x damage (+0.2 a year), drawn at twice size with a "LORD" label.
- It stands at its stones, wandering a few steps, until a tamer or partner is within 230 px or it is hit; then it chases. Left 2,600 px behind while asleep it is put away and returns when you come back.
- Beaten, it drops ten double-value XP orbs and 60 Bits, the lair stays empty for the run, and it earns the Land Lord achievement. Test: scripts/lord-test.js.

## 2026-11-16v — No starting points; Digimon profile pictures
- Status points start at 0 (`RO.CFG.startPoints`, was 48). The first base level brings 3, as every level already did (floor(L/5)+3).
- The profile picture is one of 16 well-known partners (Agumon, Gabumon, Biyomon, Tentomon, Palmon, Gomamon, Patamon, Gatomon, Veemon, Wormmon, Hawkmon, Armadillomon, Guilmon, Renamon, Terriermon, Salamon) instead of a ghost (`PICS` in profile.js). It shows on the title chip and the profile card; the card still says which ghost the player uses, and the ghost is picked on its own screen as before. A profile made earlier shows Agumon until changed.

## 2026-11-16w — XP readouts, a level-up breather, a tidier pause menu
- Hovering the XP bar or the Job chip shows "Job XP 12 / 47 (25%)"; hovering the Base chip shows the same for base XP (`data-tip`, set in updateHud).
- Job level-up (`LEVEL_PAUSE.time` 5 in data.js): the partner cannot be hurt for 5 s and, in a solo run, every enemy stands still (`sim.enemyFreeze`); online only the levelling partner is protected, so one player's level-up does not freeze everyone's fight. The skill tree opens centre screen with a countdown bar and shrinks back to the chip when the time is up or it is closed; an unspent point is kept.
- Pause menu rebuilt: portrait with element / attribute / biome / shiny tags, four tiles (job level, base level, KOs, Bits), fullness and happiness meters, Bag and Ally side by side, and the buttons in their own footer so nothing overlaps (the body scrolls if it is long). Narrow screens stack it and hide the HUD chips behind it.

## 2026-11-16x — Pacing pass
`PACING` in data.js. Measured with the same scripted player over the first 150 s (egg hatches at 20 s): before, first job level at 37 s, first base level at 70 s, third base level at 145 s, 11 KOs; after, 25 s, 33 to 37 s, 75 to 81 s, 17 KOs.
- Rewards up front: the first six job levels cost 55% to 93% of the curve (9, 26, 57, 104, 168, 248 XP; was 17, 47, 88, 138, 198, 266) and the first four base levels 60% to 90%.
- A busier opening: for the first 3 minutes (easing back over the next 2) 45% more spawns, 2 more allowed on the field, and enemies with 62% of their health, so there are more fights and each ends sooner. Enemies now arrive 3 or 4 together at one edge instead of one by one (`_queueSpawn`). Idle packs start at 0:30 (was 1:15).
- Better kills: XP is pulled in from 125 px (was 90) at 430 px/s (was 220), XP orbs are drawn 35% bigger, and a job level-up pulls in every pickup within 650 px. First boss at 1:15 (was 1:35), then every 90 s (was 100).
- Beats: "A boss is coming in 30 seconds" with a countdown chip under the clock, and a line saying which way a new idle pack is gathering. Biome and lord lines already existed.

## 2026-11-16y — No aim line
- The line from the ghost toward the pointer, and the dot on it, are no longer drawn (`drawAim` in game.js). Aiming itself is unchanged, and the yellow ring on a catchable target and the thrown data chip are still shown.

## 2026-11-16z — Hologram projections
- The playable characters are now eight hologram projections of a tamer (`holo_frame` in scripts/art/make_tamers.py): one slim human figure, identical on purpose and told apart by colour only (cyan, pink, lime, amber, violet, white, plus new red Rune and blue Echo). See-through light with a bright rim, scanlines, two faint points for a face, a glitch tear on one walk frame, motes rising, and a ring of light on the ground it is projected from. Same frame size and file layout as before, so nothing else changed; `--ghosts` on that script redraws the blob ghosts.
- The select screen shows them as two rows of four on desktop and phone. Wording says "projection" instead of "ghost".

## 2026-11-16za — Level-up cards; closing the window ends the breather
- Each job level deals three random cards (`SKILL_CARDS` in data.js; `SK.offer` in skill-tree.js; `sim._rollOffer`, sent to the client as `skillOffer`). A card is a skill the point can go into right now: a new move, a known move's next level, or a mastery. New moves are 3x as likely as a mastery, known moves 2x. No rerolls.
- Take a card (click, or keys 1 to 3) to spend the point. "Skip the cards" turns to the old tree, where the point can only raise something already known; "Back to the cards" returns. A new skill is learned only from a card (`skill.add` refuses it otherwise, host and guest). With points left over, new cards are dealt after each spend; digivolving re-deals for the new form.
- The 5 s breather now lasts only while the level-up window is open: closing it (X, K, or spending the point) sends `breather.end`, which unfreezes enemies in a solo run and leaves the partner 0.35 s of protection. A kept point can be spent later with K, without a breather.
- Test: scripts/cards-test.js. farming-test's XP-curve floor lowered to 1800 (it had been failing since the 16x pacing pass made early levels cheaper).

## 2026-11-16zb — Projections with their own look
- The eight projections are redrawn by `scripts/art/holo2.py` (`holo2_frame`, called from make_tamers.py): each has its own outline (Byte spiky hair and goggles, Glim twin tails and dress, Zap cap and backpack, Ember ponytail and scarf, Nyx hood and cloak, Null bob and visor, Rune mohawk and cape, Echo long hair and headphones), a dark inked edge, two-tone shading and inner pen lines. Faces are still only points of light; the ground ring, motes and glitch tear are kept.
- `python3 scripts/art/make_tamers.py` redraws the frames; `--holo1` restores the all-alike projections, `--ghosts` the blob ghosts. `python3 scripts/art/holo2.py out.png` draws a preview sheet only. No game code changed.

## 2026-11-16zc — Projections have no names
- Byte, Glim, Zap, Ember, Nyx, Null, Rune and Echo are gone as names: the character is called by the player's profile name. `TAMER_IDS` in sprites.js keeps the ids (saves and online play are unchanged) but `name` is now only the colour, which is all a select card shows.
- The select screen says "<profile name>, pick your projection"; a profile card says "Cyan projection". Teammates' name tags already used the profile name.

## 2026-11-16zd — No free healing, show sizes, a real walk, feed from anywhere
- Health no longer comes back on its own (`PLAYER.restRegen` 0; it was 3% a second after 3 s unhit). New mastery card "Recovery" (`rg` in skill-tree.js): 0.2% of max HP a second per level, up to Lv 10. A Water ally's passive (0.4% a second) still heals, as do food, drops and the farm.
- Sizes follow the show (species-catalog.js): a tamer stands about 46 px (`TAMER_H`); `STAGE_SIZE` gives each stage a height as a multiple of that (Baby 0.38, In-Training 0.5, Rookie 0.8, Champion 2.0, Ultimate 2.4, Mega 2.6) and `SHOW_SIZE` overrides about 190 Digimon whose size is known (Greymon 2.6, Gatomon 0.6, Angemon 1.5, MetalGreymon 3.0, WarGreymon 1.9). sprites.js no longer has its own height list. Hitboxes are unchanged (`OLD_TARGETS` keeps the hand-tuned ones where they were).
- Projection walk (scripts/art/holo2.py): from the side the legs have a thigh and shin with a knee that bends as the foot swings through, both arms swing with an elbow, and the body rises and sinks with each step; from the front and back a knee comes up and the weight shifts over the standing leg. `python3 scripts/art/holo2.py --walk out.png` draws a strip.
- Feeding has no distance check, in the field or at the farm (game.js `feedNear`, progression.js `field.feed`, farm.js `feed`). Petting at the farm still needs you close.
- Test: scripts/regen-feed-test.js.

## 2026-11-16ze — Man-shaped Champions stand taller
- Angemon, Leomon, Meramon, MadLeomon, Stingmon, ExVeemon, Gargomon, Flarerizamon, SkullKnightmon, Devimon, Oboromon, Gladimon, Guardromon and Machmon are raised in `SHOW_SIZE` so that the visible figure (measured in the browser, not the sprite frame) is about 1.4 to 1.65 times a tamer; Devimon about 1.95. Their own next forms were raised to stay ahead: MagnaAngemon, Seraphimon, Myotismon, LadyDevimon.

## 2026-11-16zf — WarGreymon as tall as Greymon
- WarGreymon and BlackWarGreymon go from 1.9 to 2.55 in `SHOW_SIZE`, which puts the visible figure level with Greymon's (about 2.4 tamers).

## 2026-11-16zg — Terrain pass: ruins, black spires, tall grass, props at one pixel scale
- New `js/terrain-art.js`: every field prop is painted in code at 1 art pixel = 1 world pixel (the tamers' density; the old props were 3x3 blocks), with one look: a dark inked outline and each shape lit from the upper left. Redrawn: tree, snow tree, dead tree, rock, snow rock, mushroom, cactus, pole, gear, server, vent, crystals, shard, bits, monolith, shrine, tall grass, flowers. New: pillar, broken pillar, wall, boulder, bush, stump, log, pebbles, spire, cache, meadow grass. sprites.js `decorCanvas` uses it first; seasons still recolour. The ground tiles are still drawn in 3-pixel blocks.
- Solid props (world.js `SOLID`): pillars, broken pillars, walls, boulders, spires and caches block tamers, partners and enemies at their foot (`pointRaised`). Trees, rocks and the rest can still be walked through.
- Ruins: about a quarter of 9 x 9 tile patches are ruins, where pillars, broken pillars, walls and rubble stand on grass and across paths.
- Black spires (`TERRAIN` in data.js): at most one in a 26 x 26 tile cell (70% of cells). Press E within 78 px: the spire breaks and an evil mini boss steps out beside it (Year 1 a Champion such as Devimon, Year 2 an Ultimate such as Myotismon, Year 3 on a Mega such as Piedmon), a boss with 75% of a normal boss's health that drops 6 XP orbs and 25 Bits on top of its usual loot. Each spire works once a run.
- Data caches: at most one in a 14 x 14 tile cell (55%). Press E to open: 6 to 14 Bits and 3 XP orbs, once.
- Both go through a new `prop.use` action (progression.js; allowed for guests in online.js); the `prop.used` event marks it spent for every player.
- Meadows: patches of tall grass in the grassland, forest and swamp, three rows of blades a tile, drawn in depth order so anyone standing in it is covered to about the waist; the blades rustle round the tamer and partner. Looks only.
- Each biome scatters more: bushes, stumps, logs, boulders and pebbles join the old lists (biomes.js).
- Test: scripts/terrain-test.js.

## 2026-11-16zh — Status effects, ground patches and element reactions
`STATUS` in data.js; logic in mission-sim.js (`_applyElement`, `_tickStatus`, `_maybePatch`, `_addPatch`, `_updatePatches`), all called from `hurtEnemy`, so it covers partners, allies and teammates. Enemy hits apply none of it, and patches never touch tamers or partners.
- Marks, by the move's element (chance per hit): fire Burn 25% (a quarter of the hit's damage each second for 3 s), ice Freeze 15% (1.2 s; bosses are Chilled, 60% speed, instead), water Soak 35% (85% speed, 5 s), nature Root 20% (40% speed, 2 s), wind Gust 20% (double knockback, winded 0.35 s), machine Shock 15% (stunned 0.6 s), beast Bleed 20% (18% a second, 4 s), slime Poison 25% (12% a second, 6 s, 85% speed), dark Curse 20% (takes 1.2x, 4 s), holy Daze 20% (deals 0.7x, 4 s). Times are halved on bosses.
- Reactions on an enemy: water puts a burn out; fire dries a soaked enemy (no burn that hit) and thaws a frozen one, leaving it soaked; ice on a soaked enemy freezes it for sure and 1.7x as long, and puts a burn out; wind on a burning enemy spreads the burn within 84 px; machine on a soaked enemy shocks twice as often for twice as long.
- Ground patches: fire, water, ice and slime hits can leave one where they land (5% to 45% by the move's tier, radius 28 to 68 px, at most 36 at once). Fire burns what stands in it (3.5 s), a puddle soaks (8 s), an ice sheet chills (6 s), goo poisons (6 s).
- Reactions on the ground: water puts fire out and washes goo away; fire dries a puddle, melts ice to a puddle and sets goo alight; ice freezes a puddle into a sheet and smothers fire; wind fans fire wider and dries puddles. Fire on grass (grassland, forest, swamp) lasts 1.8x as long and creeps outward up to two steps.
- Seen: patches are drawn on the ground (game.js `drawPatches`); a burning enemy has flames, a frozen one a block of ice, the rest a row of coloured pips over its health bar, and a new mark floats its name. Patches and marks travel in the snapshot (enemy `st` bits, `patches`), online too.
- Test: scripts/status-test.js.

## 2026-11-16zi — Level-up window with no timer; more, weaker enemies
- Level-up: `LEVEL_PAUSE` is now `{ time: 600, coopTime: 20 }` and the `level` event carries `hold`. In a solo run the window has no countdown: enemies stand still and the partner cannot be hurt until the window closes or the point is spent (`breather.end`); 600 s is only a backstop. If the window cannot open, the client ends the hold at once. Online the levelling partner alone is safe, for 20 s at most, with the countdown as before. The game clock keeps running while the window is open.
- 30% more enemies all run long: `FIELD` in stage-waves.js (spawns 0.42 to 0.68 a second over the first six minutes, was 0.32 to 0.52; on-screen limit 7 to 10, was 5 to 8; later growth and ceilings up the same).
- Health by stage for the rank and file: `PACING.stageHp` (Baby 0.28, In-Training 0.38, Rookie 0.5, Champion 0.65, Ultimate 0.75, Mega 0.9), applied at spawn, swarm Babies included; bosses, lords, spire bosses and field Megas are untouched. It replaces the flat 62% opening discount (`openHp` 1). Hits to kill with the partner's main move, before and after: at 0:20 Baby 3 to 1, In-Training 4 to 3; at 5:00 Baby 3 to 1, In-Training 5 to 2; at 7:00 (Agumon) Rookie 8 to 4; at 13:00 (Greymon) Rookie 2-3 to 1-2, Champion 8 to 5; at 20:00 (MetalGreymon) Champion 6-10 to 4-7, Ultimate 32 to 24.

## 2026-11-16zj — Scaling check; a base-stats button you cannot miss
- Measured hits to kill for a typical partner at each stage (main move, skill and stat points spent) against each enemy stage. Same stage: Baby 1, In-Training 2, Rookie 2-3, Champion 5, Ultimate 8 (was 17), then 4 for a Mega partner. One stage down: 1-2. Two down: 1. One stage up: 3, 4-6, 8, 8.
- Changes in `PACING` (data.js): `stageHp` Ultimate 0.75 to 0.33 and Mega 0.9 to 0.7 (an Ultimate partner hits barely harder than a Champion when its new moves are Lv 1, so Ultimates were a wall); `lateHp` toughens Ultimates 2.5% a minute from minute 24 (the field stays on Ultimates until minute 72 while the partner keeps growing); `belowShare` 0.4 (was 0.2) puts more of the stage below in the field to cut through. Bosses, lords, spire bosses and field Megas are untouched.
- Base stats: with points to spend the chip turns gold, swells and glows, shows the count, and has a "Spend your stat points!" pointer beside it (style.css `#stats-chip.has-points`). A notice says so the first three times points arrive, and again every minute they sit unspent.

## 2026-11-16zk — Enemies follow the clock; your build decides
- The field no longer waits for the partner: `PACING.followPartner` false removes the old cap of 2.5 stages above the partner (stage-waves.js `tierFor`). The stage in the field is set by time alone.
- Status points count for much more: `ATK_SCALE` 20 and `MATK_SCALE` 30 in ro-stats.js (were 100 and 160). With points spent a build hits about 1.3x at base level 8, 1.7x at 13, 2.2x at 18, 2.9x at 25 and 4.1x at 35; before it was 1.06x to 1.58x.
- Enemy health follows the clock at that pace: `PACING.buildHp` ([minute, multiplier]: 1 at 0, 1.1 at 4, 1.25 at 9, 1.5 at 15, 1.8 at 22, 2.15 at 32, 2.6 at 50, 3.2 at 80), on every enemy including bosses and lords, not swarm Babies. It never looks at the player.
- Measured hits to kill (main move): with points spent the table of 16zj is unchanged (same stage: Rookie 2-3, Champion 5, Ultimate 8, then 4 for a Mega). With points never spent: Champion 8 at 15 min, Ultimate 11 at 22 min, 11 at 32 min and 12 at 50 min, and bosses take up to 2.6 times as long.
- Growth: each base level from 2 on adds one stat by itself (`RO.levelBonus`), in the order favoured stat, VIT, second stat, DEX, favoured stat, LUK, where the favoured stat follows the Digimon's element as the digivolution bonus already did. It shows in the Status window as the "+n" beside each stat.
- Test: scripts/balance-test.js.

## 2026-11-16zl — Digi Night: music, level-up fanfare, day and night, rain and lightning, grass that burns
- **Name.** The game is Digi Night (two words). Title logo (title-scene.js `paintLogo`: DIGI in gold, NIGHT in moonlight with a crescent; the two words stack on a narrow screen so the profile chip no longer covers them), page title, invite share text, README. The game folder is still `digimon-bullet-heaven` and the save keys are unchanged, so launchers and existing saves carry on.
- **Sound** (new `js/audio.js`, no audio files). Music is written as data (`TRACKS`: key, scale, a chord a bar, and lead / arpeggio / bass / drum parts in scale degrees) and played by a look-ahead scheduler on pulse and triangle voices. Pieces: title, farm, spring, summer, fall, winter, and two 8-bit dubstep pieces (wobble bass through a swept filter, half-time drums, a four-bar build into a looping drop): `boss` while a boss, Mega or roused lord is on the field and in the brawl, `eclipse` during an eclipse. Each season has a night version: the same tune in a darker scale with a driving bass and four-on-the-floor kick. game.js `tickMusic` picks the piece; changes crossfade. Rain has a hiss. The ♫ button turns music on and off (remembered); ♪ still mutes everything.
- **Level-ups.** Job level: three small fireworks go up over the partner's head and burst, with a bright jingle and a pop each; the skill window now opens 0.9 s later (`LEVEL_FX.windowDelay`) so it does not cover them (enemies are already held). Friends' partners show the fireworks too, without the sound. Base level: a pillar of light and rings round the hologram, an emote bubble with a gold arrow over its head for 2.8 s, and a short fanfare. While status points are unspent a small gold arrow keeps bobbing over the hologram.
- **Day and night** (seasons.js `DAY`, `dayInfo`). A day is 180 s of battle time, on the clock the game already kept for evolution (rarity.js `DAY_SECONDS`): dawn, day, dusk from 1:44, night from about 2:15 to 2:55, twice a season. The screen takes a warm wash at dusk, deep blue at night (the hologram, the partner and fires glow), pale at dawn; the season chip reads "Spring · Night". At night enemies move 15% faster, idle packs notice you from 1.5x as far, and bites come 1.25x as often, all easing in with the dark.
- **Weather.** Rain and Thunderstorm join Clear, Eclipse and Meteor Shower (data.js `WEATHER.catalog`; a storm never in the first 2:30). Rain is drawn over the whole screen, each drop landing at its own height with a splash, slanting with a wind that gusts in a storm. **Fix:** the simulation's weather was never sent to the screen in a solo run (authority.js snapshot left it out), so the eclipse and meteor shower skies and the weather chip never appeared in battle, though their effects applied. They do now. The title screen's rain is redrawn the same way (it used to thin out down the screen).
- **Lightning** (data.js `STORM`, mission-sim.js `_updateStorm` / `_aimBolt` / `_strike`). Every 3.5 to 7.5 s of a storm a bolt comes down within 460 px of a tamer, 40% of the time right on an enemy. The ground crackles for 0.9 s first. It takes 40% of the full health of each enemy within 62 px (5% for bosses, Megas and lords) and shocks it; a partner within 46 px loses 10% of its health, never its last point; tamers are never hit. It leaves fire where it lands (not on water or rock).
- **Grass burns** (data.js `GRASSFIRE`, world.js `burn` / `burnState` / `isTallGrass`). Any fire on grass (a bolt, a fire move's patch, a spreading fire) chars the tiles under it: the ground is stained, tall grass becomes charred stubs and no longer hides anyone, and charred ground cannot burn again. Fire landing in tall grass catches 60% of the time whatever the move, and runs up to four steps through it (two in short grass); it creeps more readily in summer and fall, far less in winter, and in rain it creeps less and burns out sooner unless lightning lit it. The map is seeded, so the scorch is still there when you come back: it grows back after 170 s of battle time, as short shoots for the last 45. Guests get the same picture through the `scorch` event.
- Debug panel: Weather: Rain, Weather: Thunderstorm.
- Test: scripts/night-storm-test.js.

## 2026-11-16zm — Duplicate clean-up: source art in its own zip, two code duplicates merged
- **Source art split out.** The game zip no longer carries the loose frame images it never loads: `assets/sprites/frames-up-all`, `raw`, `frames-story`, `preview_frames`, `frames-tamer-goggle-kid`, `frames-tamer-prev`, and everything in `assets/sprites/frames` except `digiegg` and `tamers` (which the game does load). They are in `digi-night-source-art.zip`, same paths; unzip it over the game folder before running `scripts/bake-up-all.py` or `scripts/build-evo-tree.py`. The `framesDir` entries in evolution-tree.js are notes for those scripts and are not read by the game.
- **One day clock.** New `js/day-clock.js` holds `DAY_SECONDS`, `periodOfHour` and `periodOfCycle`. rarity.js and net/rarity-sim.js each had their own identical copy; both now use this one, and seasons.js takes the day length and the dusk / night marks from it.
- **One weather list.** The list of skies was written out in both data.js and weather.js, and the two had drifted (the eclipse in weather.js was the old harsher one; the game used data.js's). It now lives only in weather.js, with the numbers the game was using (eclipse: spawns 1.8x, limit 1.5x, health 1.5x, attack 1.25x, speed 1.08x, XP 1.5x, never in the first season), and is published as `DBH.WEATHER`. Nothing changes in play.
- scripts/weather-test.js now checks those numbers, runs on a real clock, and expects rain and storms too.
- Standing rule from Nov 17: check the files for copies and duplicates at the start of every work session.

## 2026-11-16zn — Hit feel
New `js/hit-fx.js` (settings in its `CFG`); nothing about what a hit does has changed, only how it looks and sounds.
- **Damage numbers.** Chunky pixel digits pop out of the enemy and fall away: white for an ordinary hit, gold with a "!" for a critical, orange for a weakness, grey for a resisted hit, pale blue for lightning, red over your partner when it is hurt. A hit worth more than half the enemy's health is a size bigger, a critical a size bigger again. Blows on one enemy within 0.1 s add into one number. At most 44 on screen (16 with reduced effects). Drawn from a small baked digit sheet, not text.
- **Impact.** A star where the blow lands and chips flying on past it; the enemy squashes and leans away for 0.16 s; a kill throws chunks the way the blow was going, with a ring (bigger for a boss).
- **Camera.** A jolt along the line of your partner's blow that springs straight back (1.4 px a hit, 5 a critical, 3 a kill, 6 a tough kill, 12 a boss); a critical, a tough kill and a boss kill also push the view in 1 to 4.5% for a moment. Friends' hits and lightning do not move your camera.
- **Hitstop** (solo runs only; online the clock is shared). The fight holds still for 45 ms on a critical, 30 ms on a kill, 70 ms on a tough kill (the enemy had 1.5x your partner's health or more), 170 ms on a boss, Mega or lord, and 60 ms when your partner loses a tenth of its health in one blow. Short holds cannot come closer than 0.14 s apart, so a crowd dying never becomes a stutter (ten kills a second holds about 17% of the time).
- **Partner hurt.** A red number, and for a real blow a red wince round the screen edge.
- **Sound** (audio.js): a thud per hit (at most one every 65 ms, pitched a little differently each time), a crack for a critical, a crunch for a kill, a boom and a short flourish for a boss.
- Simulation: the `hit` event now carries `c` (critical), `m` (1 weak, -1 resisted), `f` (share of the enemy's health), `r`, `k` (killing blow) and `by`; `kill` carries `big`, `r` and `hp`. Online, up to ten trimmed `hit` events a snapshot now reach guests so they see numbers too (they were dropped before).
- Reduced effects: fewer numbers and chips, a gentler jolt, no push in.
- Test: scripts/hit-feel-test.js.

## 2026-11-16zo — The rival; numbers for burn, poison and bleed
- **The rival** (data.js `RIVAL`; mission-sim.js `_pickRival`, `_updateRival`, `_lineForm`; game.js `rivalEvent`). Every run has one: a Digimon of another egg line (never yours) with a name from a list of sixteen, fixed by the run's seed so everyone online meets the same one. It first comes 2:30 in, then four minutes after each time it was last seen off, with a 20-second warning and a countdown chip under the clock.
  - It arrives as its own line's form at the stage your partner is at that moment (Baby for a Baby, Champion for a Champion, along its plain well-known route), so it grows as yours does.
  - It is a boss in all but bulk: half a boss's health for that stage, 6% faster, and for each time you have beaten it 15% more health and damage. Below 40% health it digs in and speeds up 18%.
  - Beat it within 75 seconds and it pays 8 XP orbs (1.5x) and 30 Bits (+10 for each earlier win), then comes back stronger. If it is still standing when the 75 seconds are up it walks off and the round is its; there is a small bar over its head for how long it will stay. A farm visit that clears the field mid-duel does not count either way.
  - On screen: a pink ring under it, "RIVAL  <name>" over it, a line of talk when it arrives, digs in, loses or leaves, its own entrance sting, and the boss music. The score is kept for the run: in the notices, as a tile in the pause menu and on the run-over summary. Its notices are not overwritten by routine ones.
- **Burn, poison and bleed numbers.** What each takes is added up and shown once a second as a small number drifting up beside the enemy: orange for burn, purple for poison, dark red for bleed (mission-sim.js `_tickStatus` sends a `hit` event with `dot`; hit-fx.js `dot`). No spark, jolt, sound or hold for these.
- Online: the rival flag travels in the enemy flags (bit 16) and its events reach guests like any other.
- Test: scripts/rival-test.js.

## 2026-11-16zp — The rival is another tamer on the map
The timed-duel rival of 16zo is gone. New `js/net/rival-sim.js` (numbers in data.js `RIVAL`); game.js `rivalEvent`, `drawRivalTamer`, `rivalShot`.
- **Who.** Another tamer with a partner from another egg line (never yours), named from a list, the same for everyone online (fixed by the run's seed). It enters the map 45 s after the fight starts, at job level 1 and base level 1 with its first move, and is there for the whole run.
- **Same rules as you.** Its partner is kept as a record shaped like a player's, so it uses your XP curves (`_xpNeeded`, `_tamerNeed`), your status point gains, costs and formulas (`RO.pointsFor`, `RO.cost`, `_derived`), the skill tree's own move picker for its skill points, and `_stats` / `_fireFrom` for what its moves do. It gets a wild Digimon's XP for killing it, into both levels, like you.
- **Its build.** Status points go where its moves use them: a line that fights with claws and bites leans on STR with AGI behind it, a line that fights with shots on INT with DEX; both take Vitality; neither wastes a point on the stat it cannot use. It spends everything it has earned and nothing it has not (checked in the test).
- **Digivolving.** Along its line's plain route, when it has both the job level (3, 8, 15, 24, 34) and the time in its form (100, 220, 400, 600, 900 s).
- **On the field** (within 900 px of a tamer) its partner is a real body: it walks round cliffs and water like the wild ones do, goes for the nearest wild Digimon within 460 px and kills it with its own moves. Those kills are its own: its XP, no KO for you, nothing dropped, no egg-unlock credit. Its tamer, a hologram in another colour with its name overhead, keeps a few steps behind. A pink ring, "RIVAL  Lv N" and a health bar mark the partner; a pink dot marks it on the minimap.
- **Elsewhere** (further off) it has no body and earns at 15 kills a minute of whatever the wild Digimon of the moment are worth, times its talent (0.8 to 1.15, rolled per run), and every one to two minutes heads back toward you. Left alone it is In-Training by about 3 minutes, a Rookie by 7, a Champion by 18.
- **It attacks on sight.** Your partner within 290 px and it comes for it, with its real moves at 60% of what they do to a wild Digimon, each on its own cooldown; shooters hang back, brawlers close in. Your Flee, perfect dodge and Vitality work against it as against anything. Get 640 px away and it gives up, then leaves your partner alone for 40 s. Its health is a partner's by your rules times 3, so a duel is a fight and not a blink. The boss music plays while it is on you.
- **If it kills your partner** the run is over like any other death; the run-over screen says who did it. **If you beat its partner** you get 10 XP orbs (2x) and 40 Bits (+15 for each earlier win), its tamer carries it off for 150 s (it earns nothing meanwhile), and it comes back healed, no weaker, and keeps growing. The score is kept for the run (pause menu tile, run-over summary).
- **Farm breaks.** Every 6 minutes of battle time (never in the middle of a fight with you) it is gone for 40 s and comes back healed, with 3 extra status points from training and what it would have earned out there.
- Wild Digimon do not attack it; only you can hurt it.
- Snapshot carries `rival` (authority and online); new events `rival.enter / spot / lost / evolve / farm / back / down / won`, and `fx rshot` for its moves on your partner.
- Test: scripts/rival-test.js (rewritten).

## 2026-11-16zq — The partner no longer strains toward far-off Digimon
- Before: the partner headed for the wild Digimon nearest its tamer however far away that was, so with something near the edge of the screen it kept pulling out to the end of its 130 px leash and back.
- Now (data.js `LEASH.seekRadius`, mission-sim.js `_movePartner`): it only goes for one within 300 px of the tamer, about a third of the screen across. Anything further it leaves alone and stays at heel until it comes nearer. Its moves still fire at whatever is within their own reach, and an enemy you click is chased exactly as before.
- Test: scripts/seek-test.js.

## 2026-11-16zr — A hub and a run setup after the title

- **Hub** (`js/hub.js`, `css/hub.css`): the title screen's button column is replaced by four
  animated tiles — Play (large, gold, glowing), Eggs, Discoveries, Online (opens to Host / Join) —
  with the profile chip top-left, DigiBits and music top-right, and DigiBank / Cabinet / How to Play
  along the bottom. Tiles lift and glow on hover or focus. A pink strip under the tiles shows the
  rival record once a run has met one. The old buttons stay in the page, hidden, and the tiles press
  them, so every flow behind them is unchanged.
- **Run setup**: one screen replaces the separate tamer and egg screens. Three cards (projection,
  egg, who is coming) with arrows, swipe and position dots; locked eggs show their unlock progress
  and grey out START; a preview strip shows the chosen pair walking and says what will happen.
- The old egg screen is now the Eggs gallery (DONE returns to the hub). State "tamer" maps to
  "setup". `D.menu` in game.js is the small API the hub uses.
- No Settings tile: there is no settings screen to open yet.

## 2026-11-16zs — Tamer Rank (continuity, 1 of 4)

- Every run now pays **rank XP** to the profile when it ends (`data.js RANK`, logic in `profile.js`):
  10 per minute survived, 0.25 per KO, a bonus for the stage the partner reached (Rookie 50,
  Champion 120, Ultimate 260, Mega 500), 30 per boss, 40 per rival win. Ranks never reset; cap 50.
  Rank r to r+1 costs 120 + 45 x (r - 1).
- Each new rank pays DigiBits (15 + 5 x rank). Ranks 3, 5, 10, 15, 20, 30, 40, 50 open a title in
  the Cabinet that can only be earned, not bought.
- Shown on the run-over screen (bar fills, rank-ups pop with a sound), on the hub profile chip, and
  on the profile card other players see in a lobby.
- Still to come, one build each: the Lab, DigiBank memories, rival trophies.

## 2026-11-16zt — The Lab (continuity, 2 of 4)

- **The Lab** (`js/lab.js`, `data.js LAB`, a LAB button on the hub): DigiBits buy six small
  permanent boosts, five levels each at 25 / 50 / 90 / 140 / 200 (3,030 for everything):
  Vital Data (+2% partner health per level), Battle Data (+1.5% damage), Scan Range (+5% pickup
  range), Study Data (+2% job XP), Farm Pass (+6 s per farm visit), Bit Finder (+5% in-run Bits).
- Levels live on the profile and ride into the run with the tamer (`mission-sim.js _lab`), solo and
  online; a guest's levels travel on their profile card. A purchase applies from the next run.
- Every finished run now pays DigiBits: 1 per 8 rank XP, on top of the rank-up payouts.
- Not included on purpose: an earlier egg hatch (the 20 seconds is a fixed rule).

## 2026-11-16zu — DigiBank memories (continuity, 3 of 4)

- A partner that ends its run as a Champion or beyond leaves a **memory** for its egg line
  (`data.js MEMORY`, saved as `save.memories`). One per line; a higher stage (or the same stage
  and a longer run) replaces it.
- The next egg of that line hatches with skill points already in hand: Champion 1, Ultimate 2,
  Mega 3 (`mission-sim.js join: memory`). Solo and online (a guest's tiers ride on the profile card).
- Shown on the run-over screen, on the egg card in run setup, in a Memories section of the
  DigiBank, and as a notice at the hatch. Also: in-run notices no longer hang over the run-over screen.

## 2026-11-16zv — Rival trophies (continuity, 4 of 4)

- Beating the rival banks a **trophy** (`save.trophies`, `data.js TROPHY`, cap 40): one per rival
  per run, kept at the strongest state it was beaten in, with a count if beaten more than once.
  Online, the trophy goes to the player whose partner landed the win.
- The hub's rival strip is now a button showing the lifetime record and trophy count; it opens the
  **Trophy Room** (`hub.js openTrophies`): record, the last rival to beat you, and every trophy,
  strongest first.
- The profile card (yours, and the one others see in a lobby) gains "bosses beaten" and
  "rival trophies".
- This closes the four continuity builds: Tamer Rank, the Lab, DigiBank memories, rival trophies.

## 2026-11-16zw — Digi Farm visual pass

- **Ground** (`farm-art.js paintGround`): the per-pixel speckle is gone. Grass is three flat tones in
  broad patches with small blade marks; the infield is mown in bands; wildflowers gather in drifts
  outside the fence. Paths are packed earth with a dark rim, lighter worn middles, pebbles, and
  grass leaning over the edge. The track has shaded kerbs and a dark outer lip. The garden is a
  timber-edged bed. Stone under the well and chalkboard, worn ground under the hay, trough and blanket.
- **Layout** (`farm.js ensureScene`): a round yard in the middle with lanes bending out to each
  station, instead of straight spokes; the gate lane runs on into the woods.
- **Woods and planting**: the lollipop trees are replaced by the Digital World's own trees, bushes,
  rocks, stumps, flowers, mushrooms and tall grass (`D.sprites.drawProp`), in a deep belt round the
  fence and tucked into the yard's corners. They follow the seasons like the world's do.
- **Signs**: station names are timber plates in the pixel font, not smoothed system text.
- Scarecrow: burlap head with stitches and straw cuffs instead of a smiley face.
- Nothing about how the farm plays changed: same stations, positions, track and garden.

## 2026-11-16zx — Ready for a web host

- `host-game.js` runs unchanged at home and now also as a hosted server: it takes the port from
  `PORT`, reads its public address from `PUBLIC_URL` / `RAILWAY_PUBLIC_DOMAIN` / `RENDER_EXTERNAL_URL`,
  and skips the browser launch, tunnel and port-hopping when hosted.
- New beside it: `package.json` (`npm start`), `package-lock.json`, `.gitignore`. No dependencies.
- `HOSTING.md` opens with the step-by-step for Railway (GitHub Desktop, private repository, deploy,
  generate a domain) and how to update the hosted game.

## 2026-11-16zy — Level-up lock

- While the level-up skill window is open, the player who levelled is **locked in place**
  (`mission-sim.js p.choosing`): the tamer and partner cannot move, the partner does not attack, and
  nothing can hurt it. Closing the window (`breather.end`) releases all three at once.
- Solo: enemies still wait, as before, until the window closes. Co-op: everyone else plays on; the
  lock and the protection both run out with the window's 20 seconds. CPU partners are never locked.
- This closes the exploit of walking (or hitting things) for free while a skill pick was pending.

## 2026-11-16zz — The rival keeps to itself

- The rival no longer homes in. It **enters 2,200 px away** (about two screens) and keeps to a
  **home range** of 1,500 px around that spot (`data.js RIVAL.enterAt / roam`, `rival-sim.js
  _rivalHome / _rivalRoam`). Its waypoints are in its own range, never around the tamers. Before, it
  arrived about 1,500 px off and its very first waypoint was within 420 px of you.
- It only turns on you inside its sight (290 px), as before. On the field it leaves alone wild Digimon
  within 520 px of a tamer (`shy`): chasing the crowd around you was walking it straight to you.
- While it wanders near you with nothing of its own to fight it still grows at its usual pace
  (`fieldGain`), so being close does not stunt it.
- After a defeat or a farm break it comes back at a fresh range 2,200 px from you. If you travel more
  than 4,200 px from its range, it settles a new one the same distance from you.
- Minimap: a small dim pink mark on the rim points toward the rival while it is off in its range.

## 2026-11-17a — Badges: 133 of them

- The 18 achievements became **133 badges** (`js/badges.js`: the list and every rule in one file).
  Nine kinds: Growth 32, Combat 23, Rival 9, Survival 16, World 13, Farm 12, Collection 17,
  Together 7, Mastery 4. Four tiers: Bronze 33, Silver 38, Gold 36, **Prismatic 26** (the hard ones:
  250,000 KOs, five years in one run, a Mega before winter, every Digimon raised, and so on).
  Eight are **secret** and show as "???" until earned. All 18 old ids are kept, so nothing is lost.
- A profile that already has the totals is given what it is owed the first time it loads.
- **Badges page** (hub button BADGES, or "All badges" on your profile): every badge by kind, with
  a progress bar on the counted ones. The profile card, yours and the one friends see in a lobby,
  shows the earned ones as chips coloured by tier, rarest first.
- Toasts queue when several land at once and are coloured by tier.
- New lifetime totals on the profile for them: lords, rival wins, spires, caches, feeds, harvests,
  training, play, shop buys, revives, brawl wins, holds, Ultimates and Megas raised.

## 2026-11-17b — Items: rare drops you keep

- **Three kinds** (`data.js ITEMS`, `js/items.js`), all found, none bought:
  - **Crest Pieces** plug into the Digivice: Weather Eye, Egg Sense, Farm Clock (common), Rival Scan,
    Hatch Light (rare), Twin Crest (prismatic). One slot; the Lab's new **Digivice Port** (300
    DigiBits) adds a second. Dropped by biome lords (1 in 2).
  - **Charms** are worn by the partner, one slot: ten element charms (+10% to that element's moves),
    Magnet Bell, Hearty Charm (common), Swift Tag, Leech Charm (rare), Old Clock, Prism Shard
    (prismatic). Dropped by bosses.
  - **One-run items**, one per run, used up by it: Protein (common), Lucky Charm, Rival Bait (rare),
    Second Wind (prismatic). Dropped by bosses and rivals.
  - A beaten rival also leaves a **scroll** of one of its trained skills. Packed like a one-run item;
    a partner whose line has that skill learns it at once (passives fit every line). A scroll that
    did not fit is kept.
- **Drop rates:** a boss 1 in 3 (60% charm, 40% one-run item); rarity 75% common, 21% rare, 4%
  prismatic. Gear you already own turns into DigiBits (15 / 40 / 120).
- **Where:** an ITEMS button on the hub and an ITEMS line on the run setup open the same screen.
  Finds are announced in the run and listed on the run-over screen.
- In the run: `mission-sim.js _gear / _gearStart / _scrollTry`; the screen-side crests (minimap
  marks, the forecast) are in game.js. The weather now settles its next sky a minute ahead so the
  Weather Eye has something to read. A guest's gear rides on the profile card.

## 2026-11-17c — Clean-up (no gameplay change)

- Removed the old attack drawing from `js/sprites.js` (projectile, nova, aura, orbit orb, arc, their
  pixel sheets and `classicShots`). `js/attack-fx.js` had replaced all five since the attack visual
  pass and nothing read the old copies.
- Moved `assets/items/proof/` (57 unused trial and proof images, 2.1 MB) out of the game into
  `digi-night-source-art-item-proofs.zip`.

## 2026-11-17d — More moves from Baby on, and the health bar on the partner

- **Two new kinds of move** (`js/moves.js`, "Signatures and techniques"), both learnable as a Baby,
  so the level-up cards are no longer Bubble Blow and masteries:
  - **Signature**: one per line, and only that line has it. Agumon Baby Burner, Gabumon Icicle Fang,
    Veemon Boom Boom Punch, Guilmon Hazard Mine, Wormmon Web Snare, Hagurumon Darkness Gear,
    Gotsumon Angry Rock, Keramon Crazy Giggle, Biyomon Ember Feathers, Hawkmon Feather Slash,
    Tentomon Static Jump, Gomamon Fish Geyser, Patamon Holy Glint, Palmon Root Breaker, Renamon Fox
    Leaves, Zubamon Spin Edge, Armadillomon Diamond Shell, Salamon Echo Bark, Terriermon Blazing
    Fire. A form outside the named lines gets its element's one (`FAM_SPECIAL`).
  - **Techniques**: four that every Digimon can learn, with no element: Byte Burst, Bubble Trap,
    Glitch Chain, Pixel Meteor.
- They do not replace one another the way shots and claws do: every one learned fires on its own
  slow clock (`skill-tree.js MULTI`). They hold their fire with nothing in reach, and they hit harder
  as the partner's stage rises (`moves.js GROW`), so a point spent as a Baby still counts later.
- **Seven new kinds of attack** in the run (`mission-sim.js _fireKit`): beam, strike (falls from the
  sky or comes up out of the ground a moment later), mine, boomerang, burst, chain, and fan.
- **How they look** (`attack-fx.js`, "signatures and techniques"): each kind has its own picture in
  the move's own colours, and each move has its own icon drawn by what it does (`move-icons.js`).
- **Health bar**: the "Pal" bar is gone from the HUD. The partner's health now rides over its head,
  right under its XP bar: green, amber under half, red and blinking under a quarter, with the chunk
  just lost shown white for a moment (`game.js paintMonXp`).
- `node scripts/kit-test.js` covers the new moves.

## 2026-11-17e — A move of its own for every form: Agumon and Gomamon lines

The shot a form learns is that form's famous attack, and now it plays like it instead of being the
last one drawn bigger. Done line by line (`js/moves.js`, "A move of its own for every form"; looks
in `js/attack-fx.js` `SHOT_STYLE` / `drawFormShot`). These two lines first, to set the bar.

- **Agumon line**
  - Pepper Breath: a fireball with a comet tail that bursts and splashes what is next to it.
  - **Nova Blast** (Greymon; was "Mega Flame", same id `megaFlame`): one huge slow fireball with
    flames standing off it and smoke behind, and a big blast where it lands.
  - Giga Destroyer: real missiles that swing out wide, turn, hunt and explode.
  - Terra Force: a sun is gathered over the partner's head for 0.45 s, then thrown.
- **Gomamon line**
  - Sea Foam (Bukamon): a clump of bubbles, several at once, close in.
  - Marching Fishes: a school of little fish, each its own colour, that fan out and chase.
  - Harpoon Torpedo: the horn leaves slowly, its shell bursts off, and the torpedo inside rockets
    after the target and explodes.
  - Hammer Spark: the hammer comes down and a row of lightning strikes walks out toward the target.
  - Arctic Blizzard: a widening cone of driven snow that blows three times and grows ice on
    whatever it catches.
- New in the run (`mission-sim.js`): shots that steer and keep their speed (`lv.turn`, after an
  optional `turnDelay`), shots that change partway (`lv.boost`), gathered casts (`def.charge`), the
  "march" kind, and beams that widen (`lv.cone`) and repeat (`lv.pulses`). Hunting shots no longer
  fire with nothing in reach.
- The missile, the fish and the torpedo have their own card icons; Hammer Spark and Arctic Blizzard
  get drawn ones.
- Small bursts (under 45 px) no longer shake the screen.
- `node scripts/form-moves-test.js`. The other seventeen lines are still to do.

## 2026-11-17f — A move of its own for every form: the other seventeen lines

Every line's shots are now rebuilt the way Agumon's and Gomamon's were in 17e: 80 more moves, each
doing its own thing and drawn its own way.

- **How it is written** (`js/moves.js`, "The other seventeen lines"): one table, `REMAKE`. Each move
  names what it does and its numbers are worked out from what the move did before, so strength stays
  about where it was. `scripts/form-moves-test.js` fires every one at a single enemy and holds it to
  between 0.4x and 2x the shot it replaced (most land near 0.8x and make it up by hitting more than
  one enemy).
- **Names changed**: WereGarurumon had Garurumon's shot; it now has **Kaiser Nail** (new id
  `kaiserNail`). MetalGarurumon's "Graceful Cannon" is now **Metal Wolf Claw** (same id).
- **New in the run** (`mission-sim.js`): beams that cross (`fork`) or fire side by side (`twin`);
  charged beams and strikes; strikes that rain round the target or burst up in rings round the
  partner; a full circle of shots (`full`); a stream that sprays (`jitter`); shots that pass through
  hitting each enemy once (`once`) or again every so often (`tick`); steering shots turn tighter the
  longer they hunt, so they cannot circle a target for ever. Piercing shots now cut each enemy once.
- **How they look** (`attack-fx.js`, `SHOTS` / `drawStyled`): eleven ways to draw a shot (missile,
  sprite, the move's own shape thrown, a ball of the line's fire, an orb, a tracer, a travelling cut,
  a helix, a bird of fire, a tornado, a net, bubbles), plus jaws for Hot Bite, a fist on the front of
  Hand of Fate, bars of sound for Puppy Howling, a web where Sticky Net lands and a seal where a
  talisman goes off.
- Beam, chain and strike shots get icons drawn by what they do; the missiles, the pinecone and the
  talisman wear their own sprite.
- Not touched: the shared In-Training shots of forms outside the named lines (Spit Fire, Frosty
  Bubbles), and claws, auras and orbits.

## 2026-11-17g — Mega ultimates on R, and E as the one interact key

- **Mega ultimates** (`js/moves.js` `ULT`, `megaUltimate`; `mission-sim.js` `_startUlt` / `_updateUlts`):
  a Mega has nothing to warp into, so with a full meter R fires its signature move once, across a
  430 px circle. Ordinary enemies inside die; bosses, Megas, lords and the rival lose a share of
  their health (a quarter unless the move says otherwise); the outer edge of the circle is only hurt,
  a band just outside is only marked, and everything further is untouched, so there are always
  survivors at the fringes. The partner cannot be hurt while it plays, and it does not refill its
  own meter.
- **The signature move is out of the Mega's skill tree** (`moveChain` stops at the Ultimate's shot).
  A Mega fights with everything else. An Ultimate that warps to Mega still throws it for those seconds.
- **Each one has its own shape and twist**: Terra Force (a sun; crater and burning ground), Metal Wolf
  Claw (hurts and freezes for six seconds instead of killing), Positron Laser (a beam swung right
  round; 40% to bosses), Shield of the Just (six seconds unhurtable), Atomic Ray (six rays, stun),
  Hang On Death (rings of stone, everything thrown outward), Catastrophe Cannon (curse and rot),
  Crimson Flare (firestorm, a third of health back), Giga Blaster (lightning everywhere), Arctic
  Blizzard (the field iced over), Seven Heavens (seven pillars; 45% to bosses, heals), Forbidden
  Temptation (rooted survivors, drains health back), Spirit Strike (four fox spirits; survivors
  dragged inward), Legend Wave (one cut across the field), Fire Tornado (breaks into four tornadoes),
  Mega Barrage (missiles on everything). Megas outside the named lines use their element's.
- **The show** is `attack-fx.js` `ult()`: the field darkens while it is gathered, a ring shows how far
  it will reach, then it goes off. Terra Force's crater is `drawGround`, drawn with the ground patches.
- The HUD chip reads the move's name at Mega ("TERRA FORCE READY [R]").
- **E interacts with everything** (`game.js`, the "interact" handler): the shop, a spire or cache, a
  catchable Digimon, a DNA partner, in that order. Prompts say E. C and J still work but are no
  longer mentioned. F still feeds.
- `node scripts/ultimate-test.js`.

## 2026-11-17h — Ultimates with their own ground, and marks that last

- **Each ultimate covers its own shape of ground** (`moves.js` `ULT.shape`, `mission-sim.js`
  `_ultPolys` / `inPolys`), no longer one shared circle: Terra Force a circle; Arctic Blizzard an
  uneven sheet (some arms reach half again as far as others, different every time); Metal Wolf Claw
  and Shield of the Just cones ahead; Atomic Ray a six-pointed star; Catastrophe Cannon and Legend
  Wave lanes straight ahead with torn edges; Crimson Flare two wings; Forbidden Temptation a
  five-petalled flower; Spirit Strike a four-armed pinwheel; Giga Blaster, Mega Barrage and Seven
  Heavens separate strikes with gaps between. The outline is lit while it is gathered.
- **They leave the ground marked for minutes** (`ULT.mark`, `attack-fx.js` `bakeMark` /
  `drawGround`): a sheet of ice for 3 minutes (2.5 for Metal Wolf Claw), Terra Force's scorched
  field and crater for 3 minutes, Legend Wave's gash for 3, broken stone, star and ring burns, a
  cursed trench, holy ground, a bed of flowers, a field of small craters. A mark is painted once
  and stays until its time is up or a new run starts.
- **Marked ground does something** (`ULT.zone`): enemies on the ice are slowed for as long as it
  lasts; Terra Force's field burns whatever crosses it for 25 s; Catastrophe Cannon's trench curses
  for a minute; Seven Heavens' ground dazes for 30 s; Crimson Flare's burns for 15 s; Rosemon's
  flowers root for 20 s.
- **C and J are gone.** E catches and starts a DNA digivolution; nothing else does.

## 2026-11-17i — The Hatchery

- **A page of its own** on the title screen (new HATCHERY tile; `js/hatchery.js`, `#hatchery-screen`):
  one egg on a stand under the title sky, your data by type, and feed buttons.
- **Data** is what a run pays: one piece per enemy defeated, of that enemy's element (12 for a boss,
  20 for a Mega or lord), and 4 plain a minute survived. The game over screen lists it. Kept on the
  profile (`profile.hatch()`).
- **One egg at a time, random by rarity**: Common 44%, Uncommon 33%, Rare 18%, Mythic 5%. The five
  starting lines are Common; the other seventeen are spread over the rest. Which line is inside is
  decided when it hatches, from the lines of that rarity.
- **Slow on purpose**: 250 data to hatch, then 600, 1400 and 3200 to reach In-Training, Rookie and
  Champion (5450 in all). Your first two eggs cost half. It stops at Champion.
- **What it becomes is not fixed**: each possible form is weighted. The standard one starts ahead,
  data of a form's element multiplies its weight (up to six times), the sky over the title screen
  when you fed it adds half again to the elements that sky favours, and plain data and nothing else
  is how you get a Numemon. Fed fire, Agumon becomes Greymon about two times in three.
- **Raising one to Rookie opens its egg line.** Kills no longer open eggs; that was the old way.
- **Take it into one run** from the egg picker on the run setup screen (solo only). It starts as
  itself, with no egg, at job level 1 / 3 / 8 / 14 by stage and the skill points that go with it,
  and it is spent: a new egg is on the stand afterward. In the field it follows the same hidden
  rules, and its diet still pulls it toward routes of the elements it was raised on
  (`progression.js` `_hatchRoute`).
- `node scripts/hatchery-test.js`.

## 2026-11-17j — Infected Digimon

- **Wild Digimon carrying a virus** (`data.js` `VIRUS`, `js/net/virus-sim.js`): tinted purple, with a
  purple ring, health bar and minimap mark. The first wanders in after 75 s, then one every 55 to
  85 s while fewer than two that came on their own are alive. Rookies at first, Champions from 5
  minutes, Ultimates from 18.
- **Who they attack**, in order: a tamer's side if one is within 430 px; otherwise the nearest wild
  Digimon that is not infected; other infected ones only when nothing else is in sight; otherwise
  they roam. Bosses, Megas, lords and the rival are left alone and cannot be infected.
- **Tougher**: three times the health and half again the damage of a plain one of the kind.
- **Their kills are nobody's**: nothing dropped, not counted for you. A Digimon they hit fights back
  for 3 s and can kill them, which also pays nothing.
- **They grow**: each kill gives back a tenth of their health, and after 4 / 6 / 12 / 24 / 40 kills
  (by stage, Baby to Ultimate) they digivolve where they stand, still infected.
- **They spread it from Champion up**: a wild Digimon that survives the hit catches it 30% of the
  time (1.6x health, 1.2x damage: weaker than one that came with it). Never more than six infected
  at once. A partner cannot catch it.
- **They cannot be caught** with E.
- **Beating one yourself** drops 5 extra XP orbs and 18 bits, and pays 8 extra Hatchery data.
- `node scripts/virus-test.js`.

## 2026-11-17k — Lighter infection tint, tester mode

- **Infected Digimon are half as purple**: the wash on the sprite is halved and the ring and motes
  are fainter. The purple health bar and minimap mark are unchanged.
- **Tester mode** (`js/tester.js`): type the code on the title screen or a menu, or open
  `index.html?tester=<code>`. Only a hash of the code is in the file. A TESTER chip appears; it or
  the ` key opens the panel: become any form, digivolve now, shiny, heal, god mode, fill the warp
  meter, add job and base levels, skill and status points and Bits, move the clock on, swap day and
  night, set the weather, spawn any enemy (normal, infected or boss), clear the field, and for the
  profile 10,000 DigiBits, 5,000 of each data and every egg line.
- **Nothing from tester mode is kept**: going in copies everything the game has saved in the
  browser aside; leaving, reloading or closing the tab puts it back and throws away the rest.
- The run tools work in solo runs only. `node scripts/tester-test.js`.

## 2026-11-17l — Slower base levels, longer music

- **Base levels come much slower** (`TAMER_LEVEL.xpMul` 3.5 to 7, `PACING.baseEarly` now makes the
  first four levels cost more instead of less). Base level 2 takes 139 XP (was 19), level 4 takes
  949 in all (was 243), level 10 takes 18,074 (was 8,734). Job levels are unchanged.
- **Every music track is arranged as a song** (`js/audio.js` `FORM`): each has a second phrase and
  chord progression, and plays as intro, verse, verse with a harmony line, second phrase twice, a
  quiet break, then both phrases a step higher. Loops are 90 to 146 s (were 13 to 21 s).
- **The two dubstep tracks** (boss, eclipse) have three sets of wobble bars instead of one, a
  melodic break between drops, rebuilds with a riser, and drops a minor third higher: about two
  minutes before they repeat (were 14 s).
- `node scripts/music-test.js`.

## 2026-11-17m — Two-hit Babies, the status arrow

- **Baby enemies take two hits at the start** (`PACING.stageHp` Baby I 0.28 to 0.37: 7.6 health
  against a fresh partner's 6 a hit). About a third more damage makes it one hit again: six points
  in STR for claw moves, eight in INT for bubble and breath moves. Other stages are unchanged.
- **The gold arrow over the hologram goes away once the status window has been opened**, even with
  points left unspent, and returns when the next points arrive. It used to stay for as long as any
  point was unspent.
- **The arrow is a button**: clicking or tapping it opens the status window.

## 2026-11-17n — Farm: walking, keys, training

- **The hologram walks at the farm**: its walk animation plays while it moves and it turns to face
  up and down as well as sideways. The farm was never told it was moving or which way it faced.
- **Movement keys only move you at the farm**: WASD and the arrows no longer step through STALL,
  RETURN, TRAIN, PET / USE and the food chips. Those are for the mouse.
- **No wait between training sessions** (`FARM_CFG.trainCooldown` 8 s to 0).

## 2026-11-17o — Champion sizes

- **Undersized Champions raised** (`species-catalog.js` `SHOW_SIZE`). Sizes were set on the sprite
  frame, which is taller than the Digimon drawn in it, so a size of 1.8 tamers was showing at 1.35.
  Measured what is actually drawn for all 78 Champions and raised 38 of them: Dokugumon 1.35 to 1.9
  tamers tall (2.7 wide), Garurumon 1.35 to 1.6, Monochromon 1.56 to 1.8, Devidramon 1.65 to 1.95,
  Kyubimon 1.04 to 1.45, Woodmon 1.24 to 1.6, Bakemon 0.65 to 1.15, Numemon 0.61 to 0.95, and the
  child-shaped ones (Sistermon, Petermon, Aegiomon) to about one tamer.
- Left alone: the man-shaped ones (Angemon, Leomon, Meramon: a head or two over a tamer already), the
  ones that were already about twice a tamer (Greymon, Kuwagamon, Birdramon), and the ones that are
  small in the show (Gatomon, Gekomon, Vilemon).
- **The cap that shrinks big sprites on small windows is looser** (24% to 32% of the window's
  shorter side). It was shrinking Seadramon on a 720-high window.

## 2026-11-17p — A bigger Lab, the seed window

- **Six more Lab boosts** (`LAB.list`, five levels each, same prices): Warp Coil (the warp meter
  fills by itself 4% faster a level), Swift Data (partner move speed +1%), Field Notes (base XP
  +2%), Data Tap (Hatchery data from a run +4%), Green Thumb (crops grow 4% faster), Full Belly
  (fullness lasts 3% longer). Twelve boosts and the Digivice Port; the page is three columns.
- **Planting asks which seed**: pressing E at an empty plot opens a small window listing the seeds
  you hold, with each one's grow time and count. Click one or press its number; Esc or walking away
  closes it. It asks again for every plot.

## 2026-11-17q — Accounts

- **A username and password** on the web address (`accounts-server.js` beside `host-game.js`,
  `js/account.js`). The game asks you to log in or create an account before anything else; the
  profile's name starts as the username.
- **The save is kept on the server**: fetched at login, sent back every 15 s and when the tab closes.
  It is everything the game keeps in the browser except device settings (music, low detail).
- A new account takes the progress already in that browser. Two computers on one account: the
  server counts saves, and the one that is out of date is told to reload rather than overwrite.
- Passwords: salted scrypt hash only. Login tokens: only their SHA-256 is stored. Twelve tries per
  five minutes per address. No recovery for a forgotten password.
- **Needs a Railway Volume** mounted at `/data` (HOSTING.md); the login screen says so until there is
  one. Off for `start-online.bat` unless `--accounts`. Tester mode never syncs.
- Log out is in the profile panel. `node scripts/accounts-test.js`.

## 2026-11-17r — The skill window opens at once

- On a job level the skill window used to wait 0.9 s behind the fireworks. It now opens about a
  tenth of a second after the level (`LEVEL_FX.windowDelay`), and its pop-in is quicker.
- Because it appears under the cursor, a click in its first 0.3 s does not pick a card.

## 2026-11-17t — The living map

Built on 17r (17s's oversized Dokugumon is not carried over; Dokugumon stays at its 17o size).

- **Water is a wall unless it is frozen** (`world.js` ICE). Rivers now wind across the map, about
  three tiles wide, with a ford every 30 tiles or so along each one (`isFord`), so no bank is a dead
  end (`scripts/living-test.js` walks the map: 97–99% of open ground reachable). Lakes are a little
  smaller (`LAKE_TRIM`). Lava is unchanged. Enemies path round water the same way they do cliffs.
- **What freezes it**: Freezeland lakes are always ice. Winter freezes the seasonal country's rivers
  and lakes, shallows first, over 50 s; spring thaws them over 70 s. An ice shot flying over open
  water leaves a strip of ice behind it (30 s, `ICE.bridgeSec`), as does an ice patch on the ground
  (`LIVING.patchIceSec`) and an ice ultimate's whole area (for as long as its mark lasts). Ice from a
  move cracks and flickers for its last 5 s. Anyone still on it when it goes is put back on the bank.
  The first time a river stops you, a note says how to cross.
- **Wild routines** (`_packRoutine`, `LIVING.routine`): an undisturbed pack moves as one herd, grazes
  about its spot and walks down to open water to drink. At night it sleeps (Zzz) and notices you
  from less than half as far, so you can sneak past. Virus packs never sleep and prowl wider after dark.
- **Footprints in snow**: every walker on snow (Freezeland, or anywhere in winter) leaves prints
  sized to it, fading over 30 s. Flyers leave none.
- **Big blasts fell trees** (`LIVING.fellR` = 64 px or wider, lightning, every ultimate): the tree
  topples away from the blast with a thump of dust, lies 2.5 minutes, rots to a stump, grows back.
- **Rain fills puddles** (`PUD`): low spots fill as the rain goes on, the deepest into ponds; they
  dry out after (faster in summer) and freeze in winter. Standing in one soaks you (wet: slower,
  and the element rules carry on); fire landing in one hisses out; lightning into one shocks
  everything standing in the same puddle.
- Online: the host decides; ice, felled trees and puddle depth reach guests as events/snapshot.
- `scripts/regen-feed-test.js` now clears stray pickups while it measures healing (a dropped heal
  could land on it depending on the random draw).

## 2026-11-17u — Biome wars

- **Bigger biomes**: about twice as wide (`world.js` BIOME_F 0.014 to 0.0075), with smooth ragged
  borders; lairs are spaced further apart to match (LAIR_CELL 84). Lakes now get land bridges at the
  same stride as river fords, so the bigger swamps don't wall anything off.
- **Territory** (`world.js`): the map is cut into 8x8-tile cells. The land's shape (cliffs, water,
  lairs) always comes from the biome it was born as; who *holds* a cell decides its look, props, tall
  grass, what its water is (a conquered lake can become lava or ice), its regional Digimon and the lord
  that spawns in its lair. A taken cell spreads a few wobbly tiles past its edges. Resets every run.
- **The wars** (`js/net/war-sim.js`, data.js `WAR`): near the players, every border cell feels a push
  from the neighbour pressing it hardest; pressure fills and the cell changes hands, a cell at a time.
  Strength = season (Freezeland in winter, crags and desert in summer, forest and plains in spring,
  swamp in fall; Dark Area after dark) x a slow wobble per front / (1 + its recent dead near there).
  A death counts for the biome the Digimon lives in (`biomes.homeOf`), whoever killed it.
- **Tipping a war**: hunt one side's Digimon at a front and the other side pushes in (a handful of
  kills makes a cell fall in well under a minute). Kill a biome's lord and every front near it caves
  in for a few minutes ("Its borders are caving in").
- **Skirmishes**: every 30-45 s at a front you can see, a squad of each side's natives (at the stage
  the field is at) forms up on its own side and they fight, with a pennant in their biome's colour.
  They leave you alone unless you come within 150 px or hit them; then they turn on you. Winners hold
  the ground a while, then drift off.
- On screen: contested ground glows in the attacker's colour with sparks along the line, a toast when
  a biome pushes in near you, "X vs Y" over a skirmish (and a marker on the minimap), which redraws
  as the borders move.
- Online: the host runs the wars; guests get the territory and the contested cells in each snapshot.
- `scripts/war-test.js`.

## 2026-11-17v — Flyers and swimmers cross water

- `biomes.crossOf(id)`: 2 = flies (birds, angels, ghosts, pixies, winged dragons and bugs such as
  Patamon, Tentomon/Kabuterimon, Stingmon, ExVeemon, Pegasusmon), 1 = swims (aquatic, amphibian,
  crustacean, mollusk, sea animal/beast, plus Bukamon and Pichimon), 0 = walks.
- Swimmers go over open water; fliers go over water and lava. Cliffs still stop everyone. Their
  pathfinding uses its own map (`_solid` / `_flowField` take the level), so they come straight across.
- **Your partner** follows the same rule, but over water it goes no further than `LIVING.leash`
  (220 px) from you. **You (the tamer) still need a ford or ice.** Walkers are unchanged.
- `scripts/cross-test.js`.

## 2026-11-17w — Living populations (no more waves)

First step of the open-world direction (next: faction trust, then the farm button).
- **No waves**: the timed spawns, the opening flood, the Baby swarms, the timed bosses ("boss in
  30 seconds") and the timed off-screen packs are gone. `_updateSpawns` now runs the nests, field
  Megas, war skirmishes and lords; `_updatePacks` only looks after herds that already exist.
- **Nests** (`world.js nestsNear`, `js/net/nest-sim.js`, data.js `NESTS`): fixed spots on the map
  (one per 15x15 tiles about 57% of the time, and four always within 12-19 tiles of the start). Kinds:
  herd (natives of the nest's biome at the season's stage), nursery (Babies and In-Training all run
  long, for egg kill counts), alpha (a boss leads the herd). Drawn as a twig nest with an egg for
  each one living there.
- Within 980 px of a tamer a nest's herd comes out and lives its day (graze, drink, sleep). Leave it
  2600 px behind and it goes home, not killed. Every death takes one from its nest; it breeds back one
  every 40 s (out of sight too); while its herd is out, a new one visibly hatches from the nest.
- Nests grow with the years (6 a herd, +1 a year, up to 11) and their kind follows the season's
  stage. A nest in conquered land is resettled by the winner, two at first.
- **Fix**: the host's snapshot (authority.js) and the online packing (online.js) never carried the
  puddle depth, territory, fronts, sleeping Zzz or war pennants from 17t/17u. They do now (`soak`,
  `terr`, `fronts`, `nests`; enemy bit 64 = asleep, slot 11 = war side).
- Removed with the waves: the boss countdown chip, the "pack is gathering" notice, PACING.beatBoss,
  the old PACKS spawn settings. `scripts/nest-test.js`; packs-lava and egg-safe-revive tests use nests.
- Still left from the old loop: `game.js updateSpawns` (only runs if the simulation can't start).

## 2026-11-17x — Faction trust

Second step of the open-world direction (next: the "Go to farm" button and the world running while you're there).
- **Trust per biome, per tamer, 0-100** (`js/net/faction-sim.js`, data.js `FACTIONS`). Earned in the run:
  every Digimon you kill gives +6 to each biome bordering that spot (within 3 cells) and -12 to its own;
  bosses x2.5, lords x9. A landed hit costs 0.5 (4 if that biome trusted you), at most twice a second.
  Trust you stop earning fades after a minute, 0.25 a second.
- **Trusted (40+)**: that biome's Digimon don't target or bite you or your partner, your partner doesn't
  pick them, and your shots, blasts and ultimates pass over them. Click one to attack it on purpose
  (that hits, and costs trust). Its herds don't wake for you.
- **Allied (100, held until it falls below 85)**: up to 3 of its Digimon near you rally to you (a ring
  in its colour), follow you and go for anything hostile within 320 px of you. Their kills count half
  toward your standing. They drift off if you get more than 1100 px away or the alliance lapses.
- Several biomes can trust you at once; turn on one and its trust drains until it's hostile again.
  Rivals, infected Digimon, field Megas and spire bosses belong to nobody.
- Screen: a trust strip under the season chip (bar, trust line, ♥ trusted, ★ allied), a heart over a
  friendly biome's Digimon, toasts when a biome trusts you, allies with you, or turns on you.
- Nest members fight for the biome that holds their nest (`e.fac`). Online: trust and allies ride in the
  player snapshot; enemies carry their biome and who they've rallied to. `scripts/faction-test.js`.

## 2026-11-17y — The farm when you choose

Last step of the open-world direction.
- **No timed farm visits** (`FARM_CFG.onDemand`): nothing comes due, no "Farm in" countdown or warnings,
  no auto-return from the farm.
- **The Farm chip / G**: stand still for 2 s (`chargeSec`) with no enemy within 380 px (`blockRadius`) of
  you or your partner and you're at the farm. Moving, or an enemy coming close, calls it off; the chip
  shows "Farm: enemies near" while you can't. Asleep, trusting or rallied Digimon don't count. The
  simulation checks again (`_hostileNear`) and can refuse.
- **The world keeps going**: the farm no longer changes the phase. Your pair is taken out of the world
  (`p.atFarm`): no target, no bites, no lightning or lava, no moving or attacking, hunger and rarity run
  at the farm's own rate. Wars, nests, the rival and everyone else carry on; toasts from the world still
  come in. Solo, the game keeps stepping the simulation while the farm screen is up.
- **Coming back**: Return puts you exactly where you stood, with a 2 s shield (`returnShield`).
- **Online**: a friend can go on their own (`online.goFarm`: "farmGo" to the host, their visit runs on
  their device, "farmDone" brings them back); they vanish from everyone's screen while they're away.
  The old whole-party farm break is no longer triggered. `scripts/farm-go-test.js`.

## 2026-11-17z — PvP and allies that grow

- **PvP by faction** (`js/net/pvp-sim.js`, data.js `PVP`): two tamers are at war when each is trusted
  by at least one biome and no biome trusts them both. Back nobody and you can't be fought; nobody at the
  farm can be. Enemy partners within 240 px fight on sight: every move on its own cooldown at half its
  damage (the rival's way), the shot drawn between them. A red ring and crossed swords mark an enemy
  tamer's partner; a toast says when someone's backing puts you at war.
- **Beaten = knocked back home**: at 8% health a partner is beaten, not killed: the pair goes to the
  farm with 30% health, the winner takes 25% of the loser's Bits, and the loser comes back with a 6 s
  shield. Guests go to their farm the same way.
- **Allies that grow** (`ALLY_GROWTH`): a Digimon rallied to you levels from its own kills (1 each, 4 a
  boss) and 35% of each of yours; each level +12% health (heals 30%) and +10% damage, up to Lv 12. At Lv 4
  and Lv 8 it digivolves into its line's standard next form ("Your ally X digivolved into Y!"). Its level
  shows in gold under it.
- **It keeps its growth**: after it leaves your side it stays as it is; when its herd goes home its nest
  remembers it (up to 4 veterans) and sends it back out as it was. `scripts/pvp-test.js`.

## 2026-11-17z2 — The PvP flag

- **A PvP flag** (chip under the Farm chip, or V): when two tamers both have theirs up, their partners
  fight, whoever backs them (even the same biome). It goes up at once; lowering it takes 10 s
  (`PVP.flagOff`), so it can't be dropped to slip out of a fight. Faction wars still apply with it down.
- Golden crossed swords over any tamer with the flag up; the chip turns red while yours is up and counts
  down while it's being lowered. Toasts when you raise or lower it, and when a flagged tamer meets yours.
- `pvp.flag` intent (progression.js), forwarded for guests (online.js); `scripts/pvp-test.js` covers it.

## 2026-11-17z3 — Ragnarok-style levels, and a map that never runs empty

- **Enemy levels** (data.js `LEVELS`, mission-sim.js `_levelUp`): every wild Digimon gets a level inside
  its stage's band (Baby 1-4 ... Champion 14-24, Ultimate 22-32, Mega 30-42), higher the further from the
  start (up to 12000 px), a little at random; bosses and alpha leaders +3, lords +6, field Megas at the top.
  Shown beside its health bar: grey well below you, white near, orange above, red far above.
- **Properly tough**: x1.8 health (+5% a level within its band), x1.4 damage; XP x1.7.
- **The level gap** (vs your partner's job level): above you it hits 5% harder a level (up to x2) and gives
  6% more XP a level (up to +60%); more than 3 levels below you, 15% less XP a level down to 5%. Weak
  ones die fast but won't level you.
- **Mega never under an hour**: run-clock gates on top of the stage gates (evo-hardmode.js `minRunTime`):
  Champion from 10 min, Ultimate from 30 min, Mega from 60 min of the run.
- **Never empty**: a nest below 2 breeds back 3x as fast; and when fewer than 6 wild Digimon are within
  1200 px of a tamer, a small wandering herd of the local biome drifts in from off-screen every 40-70 s.
- Fix: the ally growth level from 17z shared a field with the enemy level, so every Rookie and up showed a
  gold "Lv" tag; the ally level is its own field now (`alv`).
- `scripts/levels-test.js`; faction-test now wins back the trust a click cost before its contact check.

## 2026-11-17z4 — Run modes, respawning, and the League
- **Run modes** on the setup screen (data.js `MODES`, js/net/modes-sim.js): **Open World** (respawn, the
  default), **Survival** (one life), **Ranked** (one life, no CPU partners, no Hatchery partner or DigiBank
  ally) and **Weekly Map** (one life on this week's map: the seed comes from the ISO week, so everyone
  gets the same world Monday to Sunday).
- **Respawning** (Open World, `RESPAWN`): when your partner or tamer falls, the partner becomes its line's
  Digi Egg again and hatches 8 s later near the start, with 6 s of shield. Same map and tamer: base level,
  stat points, Bits, bag and faction standing are kept; job level, skills and moves start over. The world
  and your friends carry on.
- **The start stays low** (nest-sim.js `_startZone`): within 2200 px of the start the nests hold Babies and
  In-Training all run long, within 4500 px up to Rookie; no alpha leaders or field Megas there. Wanderers
  follow the same rule.
- **Catch-up XP**: x1.75 XP while the partner is more than 2 job levels below the best it reached this run.
- **Bounties** (`BOUNTY`): beat 3 tamers in a row without losing and there are 300 Bits on your head
  (+150 per further win), shown above your partner. Whoever beats you takes them on top of the usual share.
- **Scores**: minutes x10 + best level x25 + KOs + lords x300 + bosses x60 + PvP wins x150 + up to 2000 for
  a Mega (less the later past an hour). Shown on the run-over screen with Mode, Respawns and Mega time.
- **The League** (boards-server.js, js/boards.js; needs an account on the online server): boards for
  highest level, fastest Mega, longest survival, most lords, PvP wins, Ranked score and this week's Weekly
  Map score. A LEAGUE button on the hub, and your bests and places on your profile. A run is sent when it
  ends (1 minute or longer); the server checks it against what a run that long could reach.
- **Faction seasons**: back one biome a week in the League. Every run you finish adds the land that biome
  had conquered (+3 per PvP win). When the week turns, backers of the winner claim 600 DigiBits, the rest
  120.
- `scripts/modes-test.js`. Kept in `boards.json` next to the accounts (the Railway Volume).

## 2026-11-17z5 — A quicker hatch
- The starting egg hatches in **8 s** (was 20), the same as a respawned egg (data.js `HATCH.time`). The
  wild Digimon still come out of their nests 1 s before it hatches. Setup screen and How to Play updated.

## 2026-11-17z6 — New icons for the Items, the Lab and the Badges
- `js/icon-art.js`: every icon is drawn on a 32 x 32 pixel grid and shaded the way pixel artists do it by
  hand: five-tone ramps per material (cool shadows, warm lights), light from the top left with lit and
  shadow rims, contact shadows where one part sits on another, and a tinted outline.
- **Items** (all 26 plus scrolls), each with its own design: Crest Pieces are plug-in tags for the
  Digivice with a metal bezel and an original emblem; Charms hang from a cord (flame, snowflake, drop,
  crescent, winged halo, cog, leaf, slime, gale, fang, magnet bell, heart, winged tag, blood drop, pocket
  watch, prism shard); one-run items (protein tub, four-leaf clover, meat on a hook, feather and heart).
  Rare items glow blue, prismatic ones get a rainbow burst and sparkles; ones not found yet are a dark
  silhouette with a padlock.
- **The Lab**: 13 new icons (heart, sword, radar dish, book, barn, coin stack, coil, winged boot,
  notebook, data tap, watering can, food bowl, Digivice); a maxed upgrade glows gold.
- **Badges**: a medal for each, its tier in the metal (bronze, silver, gold with a sunburst edge,
  prismatic in violet with sparkles) and an emblem for its group; not earned yet shows the same medal in
  cold greys, secret ones a "?". Earned badges on the profile carry a small medal too.

## 2026-11-17z7 — An emblem for every badge
- All 133 badges have their own emblem on their medal (js/icon-art.js `EMBLEM`): a sprouting egg, rank
  chevrons, crowns, stopwatches with a sun, leaf or bolt for the speed ones, an open hand, an hourglass,
  dice, sparkles, level bars, crossed swords, flames, horned skulls, a split crown, an axe, a castle
  tower, a slingshot, a baby bottle, the rival mask, a top hat, a white flag, trophies, the four
  seasons, the moon, a gravestone, a dove, a coin pile, black spires, chests, data chips, a paw, a DNA
  helix, shopping bags, meat, turnips, a punching bag, eggs and egg baskets, a magnifier, the whole
  tree, photo frames, flasks, rank stars, linked rings, a medic's cross, a title belt, a rosette.
- Badges on one ladder (100 / 1,000 / 10,000 KOs and so on) share the emblem and show their rung with
  gold pips under it; the medal's metal shows the tier.

## 2026-11-17z8 — The projections walk properly
- New frames (scripts/art/holo3.py, written by make_tamers.py): the same eight outfits on a rigged walk.
  Eight walk frames per view (was six) and a four-frame breathing idle (was two).
  - Side: thigh and shin solved to the foot, the planted foot slides back under the body while the other
    lifts and reaches; the far leg and arm drawn behind in a deeper tone; arms swing opposite the legs,
    the elbow bending on the forward swing; the near arm has its own edge against the body.
  - Front and back: the swinging leg lifts with a bent knee and reaches toward or away from you, arms
    swing opposite with foreshortening, the hips settle over the standing leg at each contact.
  - The body dips at each footfall and rises as the legs pass; the head, hair, capes and scarves follow
    a beat later. The baked glitch tears are gone.
- In the game (js/sprites.js drawTamer): the walk is driven by distance travelled (one cycle per 56 px),
  so the feet keep pace with the ground and stop mid-step when you stop; a soft glow in the projection's
  own colour, a scan band rising through it every few seconds, a lean into a sideways walk, a quick
  squash when it turns, a rare flicker, and a sliced glitch when it is hit.
- Footfalls (game.js tamerStep): a puff of dust on dirt, sand and ash, a ripple and splash in puddles,
  a spray in snow.

## 2026-11-17z9 — One lobby screen for picking and inviting
- Hosting or joining now goes straight to one screen (index.html #lobby-screen, js/online-ui.js):
  - **Your pick**: your projection walks in place on a glowing platform and turns (toward you, side,
    away, other side); arrows flip through projections and eggs, it beams back in on each change, and the
    egg sits on its own stand beside it with its line's blurb. Click the platform for the next colour.
  - **Invite**: one big COPY INVITE LINK button (the link shown under it, "LINK COPIED" when done),
    Share where the device has it, the room code up top; every empty slot is an invite button too.
  - **Everyone's picks, live**: each slot shows the tamer's projection and egg as they flip through
    them, with CHOOSING / READY / IN GAME / AWAY (online.js setPick, new "pick" message).
  - **Ready check**: friends press READY to lock in (changing the pick un-readies them); the host's
    START glows once everyone is ready, and still works earlier (latecomers drop in). The host picks the
    mode in the footer; friends see it.

## 2026-11-17z10 — Nemeses
- `js/net/nemesis-sim.js`, data.js `NEMESIS`. The wild Digimon that lands the blow that beats a tamer's
  partner becomes that tamer's **Rival**: +6 levels, x1.5 health (healed in full), x1.22 damage, it
  digivolves on the spot, leaves its herd, and carries a title over its head ("Isaac's Nemesis", with a
  skull per title and its level) in a glowing ring, bigger with every title, and a mark on everyone's
  minimap wherever it is.
- It keeps growing with no ceiling: every partner it beats (yours or a friend's) is worth 10 points,
  every wild Digimon it kills 1 (4 for a boss, lord or another nemesis), and each kill makes it a little
  stronger. Titles at 10 / 20 / 35 / 55 / 80 / 110 / 150 points, then one more every 50: Nemesis, Scourge,
  Tyrant, Warlord, Calamity, Doom, Apocalypse, Apocalypse II... It digivolves again with each title.
- When no tamer's side is within 650 px it hunts other biomes' Digimon (and they fight back), or roams.
  From Tyrant it gathers a herd of its own biome's Digimon (2 more per title) that follow it and join
  its fights, and their kills feed it. From Warlord, standing in another biome's land for 8 s takes that
  land for its biome.
- Beating it pays 60 Bits per title it held and scatters a ring of XP around it.
- Toasts when it is made, rises a title (and digivolves), and when it is finally beaten.
- `scripts/nemesis-test.js`.

## 2026-11-17z11 — Nemesis titles renamed
- The first title is now "Nemesis" ("Isaac's Nemesis"), so it no longer shares a name with the rival
  tamers; the second is "Scourge". Then Tyrant, Warlord, Calamity, Doom, Apocalypse as before.

## 2026-11-17z12 — Names under friends, and nemeses named after the right tamer
- Each other tamer's profile name now sits under them on a small dark tag edged in their lobby colour,
  drawn over grass and everything else so it never hides (game.js drawNameTags; it was a plain label
  above their heads before, which tall grass and the PvP flag could cover).
- A nemesis takes the name of whichever tamer it beats first ("Ren's Nemesis" when it beats Ren's
  partner); checked with two browsers online. Names changed in the lobby follow into the running game.
- The message when a friend's partner is beaten names them ("Ren's partner was beaten by a ...").

## 2026-11-17z13 — Deep playtest and fixes
Played in the browser with an autoplay bot (the real game at up to 40x speed, picking skill cards
from the level-up window, spending stat points, bursting, answering digivolution prompts) for 40+
game minutes at a time; every one of the 22 egg lines taken from its egg to its last digivolution
with moves learned and a fight at every stage; Survival, Ranked, Weekly and Open World runs to the
end; the farm, pause and online co-op. No script errors, no missing files.
- Every line reaches Mega (Agumon: WarGreymon, Gabumon: MetalGarurumon, Chibomon: Imperialdramon,
  Jyarimon: Gallantmon, Relemon: Sakuyamon, Cotsucomon: Jijimon...), learning 9-13 moves on the way.
- Fix: a respawn could come back as another line's egg when two lines share a form (Yuramon came
  back as a Pupumon egg); the partner now remembers the egg it hatched from (progression.js).
- Fix: the respawn shield ran out while the egg was still hatching, so a nemesis waiting at the start
  beat the new Baby the moment it hatched, again and again. The shield now starts at the hatch, the
  respawn spot is the one furthest from any nemesis or much stronger Digimon, and nemeses keep out of
  the Baby zone round the start (a sanctuary; they stop at its edge).
- Fix: the start was a death spiral for a fresh Baby (36 respawns in 40 minutes in one run): herds of
  In-Training at up to level 8, toughened x1.8 health and x1.4 damage. In the Baby zone the wild ones
  are now level 3 at most and not toughened (data.js RESPAWN.startLv); the same run then had 2.

## 2026-11-17z14 — A well-fed playtest, and a start that is safe for a Baby
Autoplay again for 75 game minutes at a time, this time keeping the partner fed and happy (and a
run where it collected food and fed it on farm trips with G). Fed, it takes the good route
(Botamon → Koromon → Agumon) every time instead of the neglect one (Pagumon, Gazimon). Each death
was logged with what stood next to it, which showed why a fresh Baby kept dying at the start:
- Champion and Ultimate war squads were forming up in the Baby zone, and infected Digimon were
  spawning on young partners there. Now: no war skirmishes in the Baby zone and only up to Rookie in
  the Rookie zone; no virus spawns on a partner under job level 10 there.
- The Baby zone still allowed In-Training herds of 5 or 6 at the respawn spot. Now there is a
  "cradle" (1300 px round the start) with Babies only, at most level 2; herds in the Baby zone are
  2-3 strong.
- The run clock was still making start-zone Digimon tougher and harder-hitting 30+ minutes in. Wild
  Digimon in the Baby zone now ignore the clock (their own base health, damage and speed).
- Whole packs from out in the world chased a respawned partner into the start. A Digimon from
  outside now stops at the edge of the Baby zone and walks back out if it wandered in.
- The respawn spot is the one furthest from any wild Digimon; the shield after hatching is 10 s; a
  partner beaten within 30 s of hatching makes no nemesis.
Deaths in the same 75-minute run: 36 before, 10 after (all but two out in the world, where they
belong). Tests updated for the start rules.

## 2026-11-17z15 — A first-time tour with Jijimon
- `js/tour.js`. The first time a new player reaches the front page (after making a profile), Jijimon
  walks them through it: five welcome cards on what makes Digi Night different (one open world,
  biomes at war for land, nemeses, respawning), then the front page one button at a time, everything
  else dimmed and the button ringed in gold with a speech bubble: Play, Hatchery, Eggs, Discoveries,
  Online, DigiBits, Lab, Items, DigiBank, Cabinet, Badges, League, How to Play.
- The first time they open the run setup screen: projection, egg, mode, who is coming, then three
  cards on how to play (moving and the partner, food and the farm with G, levelling, digivolving, R
  for warp or a Mega's ultimate), ending on Start.
- Next / Back / Skip tour (skip skips both parts); Enter, arrows and Esc work too. It shows once
  (localStorage), and How to Play has a "Replay the tour" button. Not shown to someone arriving
  through an invite link until they reach the front page. Works on phone-sized screens.

## 2026-11-17z16 — Phones and controllers
- **Phone layout** (`css/touch.css`, `js/touch-ui.js`): on a touch screen the run's HUD is cut to the
  essentials (Pal / XP / food / joy bars, minimap, season, timer, Pause). Keyboard hints like [K] [T] [G]
  are gone on touch. Taps no longer flip the hints back to keyboard (phones send a fake mouse event
  after each tap). Everything folded away is in a ☰ run menu: Skills, Status, Shop, PvP flag,
  music, sound, and the run's numbers. A gold dot shows when there are points to spend.
- **Thumb controls:** a floating stick that appears wherever the left thumb lands, low on the left
  (above the panel at the farm). Four round buttons bottom right:
  - Warp / the Mega's ultimate, with a charge ring
  - Feed
  - Farm, with a countdown
  - Act, shown only when something is in reach (Shop, Use, Catch, DNA)

  Skills / Status chips show only when there are points to spend. The windows over the run get
  bigger buttons.
- **Front page and run setup on phones:** a one-row front page when the phone is on its side, shorter
  tiles upright. The setup screen becomes one scrolling column (it used to overlap itself). The tour
  scrolls to the button it's pointing at.
- **Controller:**
  - New buttons: LB feed, RB warp / ultimate, LT farm, RT sends the partner at whatever the right stick
    points to, View skills, R3 status, L3 PvP flag.
  - The level-up cards, digivolve offer, DNA pick, feed menu and status window are steered with the
    D-pad + A, and B closes them (the stick stops walking you meanwhile). The selection is ringed gold.
  - Fixed: View/Select used to pause and unpause in the same press.
  - The tour works on a pad (A next, B back, Start skip), and its how-to-play cards describe the device
    you're using.
  - The hint bar shows the new buttons, and How to Play lists the full mapping for all three.

## 2026-11-17z17 — Terrain you can read without colour; the rival's tamer walks
- A colour-blind tester couldn't tell plateaus from grass and kept running into them. Blocked ground
  now reads by shape and contrast, not hue (`js/world.js`):
  - every open edge of a plateau has a near-black outline
  - plateau tops have a regular diagonal hatch (grass is only ever random speckle)
  - each cliff face has a dark foot and outlined sides
  - water and lava have a solid dark shoreline
  Checked in a simulated deuteranopia view.
- The rival's tamer used to follow its Digimon in a straight line, over water, lava and cliffs. It now
  walks like you do: steered round blocked ground with the same pathing the Digimon use, and it never
  stands on a cliff or in the water. When its partner flies or swims somewhere it can't follow, it
  catches up on the near bank (`_rivalTamerStep`, `scripts/rival-terrain-test.js`).

## 2026-11-17z18 — Water that reads as water without colour
- With colour taken away, water's bright random specks looked like gravel.
- **New water look:** a calm, dark tone with soft bands (`js/world.js` waterColorBase). Any biome's
  water, such as swamp sludge or a desert oasis, is darkened until it sits well below the
  ground's brightness.
- **Movement:** small white "~" ripple lines drift across every open-water tile and breathe in and
  out, with an occasional glint. Lava swells with dark-rimmed bubbles that pop in a ring. Gravel
  never moves, so even in grey it reads as water (`game.js` drawWaterFx, `world.js` waterInView:
  each chunk lists its open-water and lava tiles once). Frozen water gets none of this, since you
  can walk on ice.
- Checked in plains, swamp, desert and volcano, in colour and in a simulated deuteranopia view.

## 2026-11-17z19 — Busier lava
- Every lava tile now has a cluster of small bubbles (five in open lava, three near the bank) that
  swell a pixel or two, brighten and pop in a little burst, each on its own clock. They're drawn
  alongside the big bubbles (`game.js` drawWaterFx).

## 2026-11-17z20 — Lightning fires, night and storms no longer tank the frame rate
Measured, not guessed: a scripted run with frame timing and a CPU profile across clear day / night /
night storm / night storm with lightning setting grass alight (`tools/perf.py`). Software-GL numbers,
so real devices are much faster in absolute terms; what matters is the ratio.

| | before | after |
|---|---|---|
| day, clear | 29 ms, 261 batches | 28 ms, 78 batches |
| night, clear | 33 ms, 355 | 25 ms, 90 |
| night, storm | 39 ms, 387 | 28 ms, 101 |
| night, storm, lightning fires | **96 ms, 1,130** | **35 ms, 109** |

- **The big one, fire flames:** each flame is a curved shape, and the WebGL layer could not draw
  curves. It drew every one on a scratch canvas and uploaded it as a new texture, with two pipeline
  flushes: about 250 times a frame in a grass fire. Curves are now cut into short straight segments
  and go down the normal fast path (`renderer.js` `_flattenQuads`). This also helps the flames on
  burning enemies.
- **Night lights:** each light was 4–8 stacked translucent ellipses (heavy overdraw where fires
  overlap). It is now one pre-baked soft-glow sprite per colour, skipped when off screen, with only
  the nearest dozen fires lighting the dark.
- **Fire patches** are skipped when off screen, and all flames draw in one additive pass. Scorch
  marks draw in two passes, so they don't flip textures per tile.
- **Sleeping Digimon's "Zzz"** (half the field sleeps at night) was six text textures per sleeper. It
  is now one baked strip.
- **Trees, rocks and their shadows** now come from one shared sprite sheet (`sprites.js`
  `atlasOf`). New props are sent to the GPU as just their own rectangle (`renderer.subUpload`). This
  removes ~180 batch breaks a frame all the time, not just in storms.

## 2026-11-17z21 — No fire on water
- Fire could sit on water: fire moves and ultimates landing in a lake lit it, and a fire patch (~44 px)
  lit on the bank spilled its flames over the water, as did grass fire creeping along a shore. Only
  lightning checked the ground, and only at one point.
- All fire now goes through one rule (`mission-sim.js` `_addPatch`):
  - on water or lava it becomes steam
  - next to water the patch shrinks until it stays on the bank, and right at the edge it doesn't
    light at all
  - no single flame is drawn over water (`game.js`)
- `scripts/fire-water-test.js` checks 30 real lake shores: fire aimed at water, fire lit on the bank,
  a minute of spreading grass fire, and lightning into a lake. The previous build failed 3 of the 5
  checks (2,100 frames of fire on water); this one passes all 5.

## 2026-11-17z22 — Puddles keep off cliffs and water, and soak in
- Rain ponds (up to ~4 tiles across) were drawn over cliff edges, the walls under them and
  riverbanks. That hid the outline, so a pond read as a ramp up a plateau or a bridge across a river.
  Walking never actually changed (checked: 4,000 spots identical wet or dry), but it looked as if
  it should. Each puddle now has a maximum size, worked out once per spot (`world.js`
  `puddleRoom`), that keeps its whole drawn outline (wobble and damp halo included) 6 px clear of
  cliff tops, cliff walls and water/lava. A spot with no room grows no puddle.
- They soak in instead of sitting on top as perfect ovals (`game.js` `puddleBlob`): an irregular
  wobbly rim (the same wobble every frame for each puddle), a damp halo fading into the ground, and
  a couple of faint wet spots seeping past the edge.
- `scripts/puddle-terrain-test.js`: 1,911 puddles across three fully soaked maps, 602 of them next to a
  cliff or water. None touches one (the previous build had 462 that did).

## 2026-11-17z23 — PvP: only by choice, fought in real time, nobody stuck
- **No PvP unless both flags are up.** Two players backing rival biomes used to be at war
  automatically, with no flag, so players met and found themselves fighting. Now `_pvpFoes` is
  simply "both flags up". The flag starts down every run.
- **Real-time PvP on the map.** With both flags up, the other tamer's partner is just another
  Digimon to your partner. It spots it when it comes near, runs at it and fights it with its moves,
  going for whichever is closer, the wild one or the rival. Click or tap the other's partner (or
  aim and RT) to order the attack (`_setPvpFocus`, input `pvp`, relayed for guests). A knockout
  still sends the loser home to the farm with no death.
- **Stuck in place online:** each level-up locked you and your partner for up to 20 s while the
  cards were up, but online the world keeps going. Closing the window on a guest only asked the
  host to let go, so you jittered and snapped back. Online, level-ups no longer lock you; the cards
  come up and you get 3 s of cover. Solo is unchanged (the world waits with you).
- **Brawl arena:** your Digimon ran down the screen and stuck as if Down were held. In an arena that
  overlapped a cliff or water, each tick moved the fighter off the blocked ground to the nearest
  walkable spot (possibly outside the arena) and clamped it back in. Now the arena is placed on
  clear ground, a fighter moves only where steered and stops at walls, and spawns avoid blocked
  ground (shared `brawl-sim.js` `step` for host and offline). On the old build, 4 of 25 brawls
  beside cliffs had a fighter run off with no input; now none do.
- **Mouse in brawls:** left-click anywhere on the arena punches, right-click dashes, and the hint
  says so.
- Tests: `pvp-realtime-test.js`, `brawl-terrain-test.js`; `pvp-test.js` and `level-lock-test.js` updated
  to the new rules.

## 2026-11-17z24 — Digimon fight by themselves; clicks only target or move
- **One rule everywhere:** a Digimon attacks by itself, the way it fights wild ones. Clicking (or
  tapping) only ever picks a target or moves it.
- **Map PvP** (both flags up): your partner goes for theirs by itself, as built in 17z23. Click their
  Digimon to target it, or open ground to pull yours away.
- **Brawl arena:** your fighter now auto-attacks whoever is in reach (the one you picked first) and
  goes for the nearest when idle. Click a fighter to target it, or open ground to move there; it
  holds that spot for 2 s. The stick or keys steer it directly. The Punch button and the 17z23
  click-to-punch / right-click-dash are gone (`brawl-sim.js` `_applyInput`, `brawl.js` `clickAt`,
  `game.js` pointer handler; guests send the target on the PvP channel).
- **The real "Down held" bug:** the authority keeps one input history per player, sorted by sequence
  number, and fed the brawl "the last one after sorting". The brawl numbers its inputs from 1 again,
  so that was always the last field input from before the brawl, replayed every tick. Whatever you
  were pressing as the fight began stuck, and nothing pressed in the brawl got through. Now the
  brawl gets the input just sent (`authority.js`). Checked in the browser: holding D moves it right,
  a click moves it to the spot, and with nothing pressed it fights on its own.

## 2026-11-17z25 — No brawl screen; PvP is just a fight on the map
- The brawl screen never comes up any more (`data.js` `BRAWL_OFF`, checked in progression's
  brawl-due / `brawl.begin` and in game.js `startBrawl` / `maybeStartBrawl`). The brawl code and its
  tests stay; nothing in a run starts one.
- PvP is only ever the real-time fight out on the map, the same as meeting any other Digimon:
  - both flags up
  - WASD / stick keeps walking your tamer
  - the two partners fight by themselves
  - a click only targets a Digimon or moves yours away
- Checked: with a CPU teammate (which used to bring brawls), five level-ups in the browser stayed in
  normal play, and A kept walking the tamer. `pvp-realtime-test.js`: holding a direction walks the
  tamer 600 px while its partner keeps fighting the other.
- How to Play: brawl and betting lines removed.

## 2026-11-17z26 — The random white blocks on the map
- Flat white tile-edged blocks would appear over the ground at random, more often after a while and
  in storms. Cause: the WebGL renderer never freed a texture. Every map chunk that was redrawn
  (walking somewhere new, grass burning, ice, seasons, territory changes) left its old texture
  (~630 KB) on the graphics card. When the card ran out, the next upload failed, and a failed
  upload was drawn with the plain white texture, so that whole patch of ground came out white.
- Fixes:
  - **Chunks:** throwing a chunk away now frees its texture (`world.js` `dropChunk` /
    `dropAllChunks`, `renderer.release`).
  - **Text:** the text cache frees its textures when it empties.
  - **Failed uploads:** they now draw nothing for that frame and retry, instead of white
    (`renderer._none`; out-of-memory is detected with `getError`).
- Measured (live GPU textures while travelling and changing seasons): before, 64 → 751 after eight
  jumps and still climbing; now map chunks hold at ~71, the cache size. What still grows is
  only small Digimon sprite frames, a few KB each, once per species you meet.

## 2026-11-17z27 — Baby nests breed back fast
- Players ran out of Baby Digimon. Every nest bred back one Digimon per 40 s, and the baby nests
  round the start held only 3.
- Nests of Baby I / In-Training Digimon now breed every 10 s (`NESTS.babyBreedSec`) and hold 2 more
  (`babyCapAdd`, 3 → 5 round the start). That applies both while you're there and to their catch-up
  while you're away. Other nests are unchanged (`nest-sim.js` `_nestBaby` / `_nestBreed`).
- `scripts/baby-nest-test.js`: clear all 5 baby nests by the start; the first one is back in 5 s, and
  90 s later 20 babies are out again.

## 2026-11-17z28 — Biome loyalty takes real work
- Allies came within a minute or two: every kill by a border gave the neighbouring biome 6 trust,
  and 100 is allied (17 kills).
- Now (`data.js` FACTIONS, `faction-sim.js` `_trustEarn` / `_trustStageW`):
  - **Base gain:** 1.5 per kill.
  - **Stage weight:** Baby ×0.25, In-Training ×0.5, Rookie ×1, Champion ×2, Ultimate ×3.5, Mega ×6
    (Mega+ ×7, Armor ×2).
  - **Taper:** gains shrink as trust climbs, down to a quarter near the top.
  - **Per-minute cap:** a biome gives at most 8 trust a minute.
  - Losses, fading and the rally rules are unchanged.
- **Result:**
  - At the very best (strong Digimon, fighting non-stop): ~5 min to trusted, ~13 min to allies.
  - Grinding babies: ~10 min to trusted, ~40 min to allies.
  - 20 kills in a rush no longer earn trust at all. Checked in `faction-test.js`.

## 2026-11-17z29 — Nemeses grow slower and don't camp the start
- **How many form is unchanged:** every Digimon that beats a partner still becomes a nemesis.
- **4 levels a win** (was 6; `NEMESIS.perKill.lv`).
- **No forced digivolution:** it used to digivolve the moment it first won, and again with every new
  title. Now it digivolves only when its level reaches the bottom of the next form's stage band
  (`LEVELS.band`), from any source: winning, feeding on wild Digimon, a new title's +2
  (`nemesis-sim.js` `_nemGrow`). A Lv 7 Rookie that wins (Lv 11, Champion needs 14) stays a Rookie.
- **It leaves the start:** after beating you, a nemesis heads out past the whole low-level area (the
  Rookie zone + 700 px) for `leaveSec` (90 s), whoever is about. One left waiting at the edge of the
  start's sanctuary gives up after `edgeWait` (6 s) and wanders off too. It can still chase you back
  in later.

## 2026-11-17z30 — You can see who your friends are
- **Friendship meter** (under the minimap, "Biome friendship"). Each biome you have any standing with,
  and the one you're standing in ("· here"), shows:
  - a status: Neutral, ♥ Friendly (15+), ♥ Trusted (40+) or ★ Allies (100)
  - a bar in the biome's colour with marks at Friendly and Trusted
  - how far to go ("16/40 to trusted", "44/100 to allies")
- **Tiny speech bubbles**, one on screen at a time, gone in 2–3 s, drawn over everything. At each
  milestone the nearest Digimon of that biome says a few words:
  - "Thanks, friend!" (Friendly, new `warm` milestone in `faction-sim.js`)
  - "We trust you!", "We've got your back!" (Trusted, Allies)
  - "Traitor!" (turned against you)
- **Growls:** when a herd spots you, now and then one growls ("Grrr!", "Die!", "Attack!"), with a
  7 s cooldown, and friendly lines take priority.
- **Over their heads:**
  - a faint heart in the biome's colour for Digimon warming to you
  - the full heart for trusted ones
  - a small red sword for 9 s over a herd that's just spotted you
- `game.js`: `say` / `herdAlert` / `drawBubble` / `drawAngryMark` / `tickTrustHud`;
  `data.js` `FACTIONS.warmAt`.

## 2026-11-17z31 — Opened chests go away
- An opened data cache (chest) used to stay on the map as an open chest, and stayed solid, so it got
  in the way. Now it fades out over ~1 s once opened and is gone. Its spot is walkable straight away
  (`world.js` `solidProp` skips a used cache; `game.js` `cacheFade`). Broken spires still stay as
  they are.
- Checked in the browser: walked up, pressed E, the chest faded and its spot stopped blocking.

## 2026-11-17z32 — PvP is the ordinary fight
- Flagged PvP partners stood still and traded damage numbers: a shortcut that hurt the other partner
  directly on a timer, with no real moves, no movement and no tie to their tamer.
- **Stand-ins** (`pvp-sim.js` `_pvpProxyIn` / `_pvpProxyOut` / `_pvpHit` / `_pvpSkip`). Each partner in a
  PvP fight gets an invisible stand-in, slipped into the enemy list only while partners pick targets
  and fire, and while shots and ultimates land. Your partner treats the other one exactly as a wild
  Digimon:
  - noticed within its usual seek range
  - fought with every one of its moves (projectiles, arcs, beams, the lot)
  A hit on the stand-in lands on the real partner (`PVP.share`, now 70%, with its own dodge and the
  same knock-out home to the farm). Only someone at war with its owner can target a stand-in, and
  it's gone before the wild Digimon move, the snapshot is taken, or anything is counted. The old
  direct-damage loop is gone.
- **Footwork** (`mission-sim.js` `_duelStep`):
  - It circles the other partner at fighting range, switching direction every second or two,
    drifting in and out, and sometimes side-stepping hard.
  - It never goes further than its leash from you: at the edge, it side-steps along the side facing
    the opponent so its moves still reach.
  - Walk away and it comes with you, still firing.
  - Clicking their partner is an ordinary attack order on its stand-in.
- Checked online with two browsers, both flagged: the host's partner moved 766 px in 8 s, shots in
  the air, both took damage, no errors. `pvp-realtime-test.js`: real moves land; it moves ~1,200 px in
  8 s, never still more than 0.6 s; it stays within ~100 px of a tamer walking off. `pvp-test.js`
  updated.

## 2026-11-17z33 — No more stuck blur, no ground rebuild storm, biomes in sync online
- **Host invisible, partner frozen after a PvP loss** (`progression.js` farm.enter, `game.js`
  maybeStartFarm). A PvP knock-out sets `atFarm` and opens the farm; farm.enter saw atFarm already
  set and returned "already there" without opening a visit, so farm.return found nothing to close and
  atFarm stayed on: the sim stopped moving that partner and friends' screens left that tamer out
  (they skip anyone at the farm). Guests leave through farmDone, which clears it, so only the host
  (and solo) got stuck, matching the report (host: lagging, blurry, invisible to the friend,
  partner stuck; lava on the host's map only). Now farm.enter only says "already" when a visit is
  really open, and doesn't refuse a knocked-out tamer for enemies being close. A knock-out while a
  window is open (skill tree, evolution) now opens the farm as soon as you are back in play instead
  of leaving you flagged with no farm. Checked with the server and two browsers: KO, leave the farm:
  atFarm clears and the friend sees the host again; KO during the level window: the farm opens after.
- **The "blur" in the photo was the war fronts** (`game.js` `drawFronts`): every contested cell drew a
  soft radial glow twice its own size in the attacker's colour; with a few dozen contested cells
  round you they piled into a pale green/blue fog over the middle of the screen. Now a crisp line
  of 4 px blocks along the edge being pushed across, in the attacker's colour, more of it lit and
  brighter as the pressure builds, with the sparks kept. No soft glow at all.
- **Guests never saw biome changes** (`game.js` `followsHost`). The host's world is the simulation's;
  a guest's world is meant to copy the host's territory (snapshot `terr`), the `war.flip` events and
  puddle depth (`soak`). All three were gated on `!missionAuth`, but on a guest missionAuth is the
  stand-in that relays the host, never null, so a guest's map stayed on the native borders while the
  host's moved (and puddles never filled for guests). Reported as "biomes are not in sync", with
  "he can't see me / my Digimon is stuck" alongside: two maps that disagree on what is tall grass,
  water and ice, plus the ground rebuild storm below hogging the screen that had the flips.
  Now gated on "no simulation here, or an online guest". Checked with the real server and two
  browsers: after border flips host and guest hold the same territory string (6 cells each), each
  sees the other move, and the guest's partner follows its tamer on the host.
- **The real lag** (`world.js` chunk cache): reported as starting "as soon as the biomes start to
  change around me", on the host's screen only. The baked-ground cache kept an order list of chunk
  keys for evicting old ones, but a chunk thrown away early (a biome flip redraws the 3x3 chunks
  round a cell; ice does the same) left its key in the list. After a handful of flips near you the
  list was full of keys for chunks on screen, so every rebuild evicted a chunk still in view, which
  was rebuilt the next frame and evicted the next: measured ~430 chunk rebuilds a second while
  standing still after 40 nearby flips (0 before). Bigger screens show more chunks, so it starts
  sooner. Now a plain least-recently-used cache: each chunk notes the last frame it was used, and
  the one used longest ago goes, never one drawn this frame. Same test: 0 rebuilds a second; moving
  ~9,000 px across biomes throws away 44 chunks and the ground is complete.
- The game went blurry mid-run and stayed that way. The auto-quality step (`game.js` `PERF`) lowered the
  drawing resolution whenever frames ran slow and was built never to raise it again, so one storm or
  a burst of lightning fires could leave it at 55% or 40% for the rest of the session, smoothed up to
  full size (the blur).
- Now: it only steps down after two slow stretches in a row (~5 s); with a real graphics card it
  never goes below 75%; once frames are comfortably fast (<19 ms) for ~10 s it steps back up, and if
  stepping up turns out too much it waits longer each time before trying again (up to 8x). A browser
  drawing without the graphics card still starts low, as before.
- When it is drawing below screen resolution the canvas is stretched with crisp pixels
  (`image-rendering: pixelated`) instead of a blur.
- Lag: in a run the parallax sky was painted full-screen under the ground, which always covers it:
  one whole-screen layer per frame for nothing; skipped. Measured overdraw (clear day ~7.5x the
  screen, night storm ~8.6x) is otherwise ground, the day/night tint, rain overcast and the two
  vignette layers.
- Checked headless: under a sustained 45 ms/frame load it dropped 1 -> 0.75 and held there, and
  came back to 1 ~10 s after the load ended; no page errors.

## 2026-11-17z33 (cont.) — Signature sets: moves of their own for every Baby, In-Training, Rookie and Champion
- Asked for: more signature moves that belong only to that Digimon and fit it (2 for Baby and
  In-Training, 3 for Rookie and Champion), keeping what you learned at earlier stages, some moves that
  upgrade into a better one and replace it while others stay as they are, and a few branching
  choices locked for the whole run.
- **228 new moves** (`moves.js` SIG_SETS / SIG_ROLE): 12 per line for all 19 lines, each named and
  shaped for that Digimon (Botamon's Fizz Bubbles, Koromon's Bounce Drop, Greymon's Meteor Breath,
  Tentomon's Buzz Field, Togemon's Hundred Jab...). The full list is in SIGNATURE_MOVES.md.
  Same slot order in every line:
  - Baby: a seed move that grows, and a keeper
  - In-Training: the seed grows (replaces it), plus a keeper
  - Rookie: it grows again; a choice of two (taking one locks the other for the run); a keeper
  - Champion: it grows a last time; the Rookie choice grows into its own Champion move (the locked
    side's stays locked); a keeper
  So a partner gains 2 / 2 / 3 / 3 moves at the four stages, as asked.
- Built from the seven signature kinds (ray, drop / rise, ground trap, boomerang, shockwave, chain,
  spray) with each move's own shape, trap, ray, chain or blade look (attack-fx.js mergeSigLooks) and
  element (elements.js; Ash Snort is fire, Kabuterimon's moves are electric). Power by role: the
  growing move gets stronger each step (x0.9 -> 1.1 -> 1.3 -> 1.55, a little faster too, and an
  extra hop / shot / mine from Rookie), choices x1.15 / x1.45, keepers x0.9 to x1.2; all still grow
  with the partner's stage like every signature.
- Rules (`skill-tree.js`): a growing move needs the one before it at Lv 3; learning it removes the
  old one and keeps ~75% of its levels (skills["!" + old] = 2). Taking one side of a choice locks the
  other (skills["!" + other] = 1), and the lock follows down the chain to the Champion move. The
  marks live in the skills record, so they sync online and reset with it. Level-up cards never offer
  a locked or grown move; growing moves turn up twice as often. Signatures no longer need "the
  smaller move of the same kind" (they all fire). Same rules for CPU partners, rivals (auto-pick) and
  rival skill scrolls.
- Skill window: cards carry a tag ("Grows from Boiling Bubbles (replaces it)", "Choice: locks Scorch
  Mark for this run"); the tree shows "Locked: you took Dash Claw", "grows into X later", and the
  help text explains both.
- `scripts/signature-test.js` (new): 12 per line, unique, all with elements; the Agumon line stage by
  stage (opens, grows, replaces, locks, lock follows to Champion, keepers stay open); 200 card offers
  never show a locked or grown move; 76 auto-built partners over every line never hold both sides or
  a move next to its upgrade; through the simulation a locked pick is refused and learned moves fire.
  kit-test updated (a Baby now has 8 moves to pick from). Checked in the browser as Agumon: cards and
  tree read right, all five learned signatures fired on enemies, no errors.

## 2026-11-17z33 (cont.) — Signature sets: Ultimate and Mega
- 136 more (`moves.js` SIG_HIGH): each Ultimate and each Mega adds three, in the same pattern as
  Champion: the growing move grows again (Meteor Breath -> Hatch Barrage -> Sun Meteor), the Rookie
  choice grows again along the side you took (Horn Charge -> Trident Lunge -> Cyclone Drill; the
  other side stays locked to the end), and a new keeper (Iron Wing Gust, Shield Bash). 16 lines have
  both; Wormmon's (DinoBeemon) and Armadillomon's (Meteormon) end at Ultimate; Hawkmon's line has no
  Ultimate or Mega, so it ends at Aquilamon. 364 signature moves in all; SIGNATURE_MOVES.md lists
  every one by line.
- Power: Ultimate x1.8 / 1.7 / 1.7 / 1.35, Mega x2.1 / 2.0 / 2.0 / 1.55 (growing, path A, path B,
  keeper), with an extra two shots / hops / mines from Ultimate. Balance check: with everything
  levelled, all signatures together were 2.6x the main shot at Champion and 4.4x at Mega, which
  buried the shots; every new signature now hits at 0.55 (SIG_POWER): 1.6x at Champion, 2.5x at Mega.
- signature-test.js: counts per line by the stages it has; the Agumon line grows on to WarGreymon;
  the locked side stays locked to Mega; MetalGreymon's moves open and WarGreymon's wait; each step of
  a growing move hits harder; auto-built partners through all six stages keep the rules. Checked in
  the browser as WarGreymon: the tree reads right and the Ultimate and Mega moves fire, no errors.

## 2026-11-17z33 (cont.) — Difficulty held where it was, a smidge harder
- Asked: keep it as hard as before the signature sets, maybe a smidge harder (last playtest was
  "pretty close to exactly where I needed it").
- Measured (tools: a typical card-picking build at a typical job level per stage, 60 runs per line,
  every line, against the same with the signature sets taken out): partners now hit 0.92x / 0.91x /
  1.05x / 1.14x / 1.21x / 1.30x as hard at Baby / In-Training / Rookie / Champion / Ultimate / Mega
  (more moves spread the early points thinner; later the extra moves add up).
- `data.js` LEVELS.stageHp: wild Digimon's health by their stage 0.97 / 0.96 / 1.1 / 1.2 (Armor too) /
  1.27 / 1.37, which cancels that and leaves every stage ~5% tougher to kill than before. Applied in
  `_levelUp`, so lords and bosses follow; the gentle start zone is untouched. Damage unchanged.

## 2026-11-17z33 (cont.) — Drops come to you
- Reported: with the magnet, drops no longer come to the character; they fly round the screen.
- Cause (`mission-sim.js` `_updateOrbs`): once pulled in, a drop chased whichever of tamer and partner
  was nearer *that tick*, so it swung after a partner darting round a fight; and it was moved toward
  every player in turn, so with friends it was tugged back and forth.
- Now: the tamer or the partner coming within magnet reach pulls a drop in, but it flies to a tamer,
  the nearest, and keeps to that one (to the partner only if there is no tamer); it starts at the old
  pace and speeds up to 2.2x so it catches a tamer on the run. New: a drop within 2.5x the magnet
  reach drifts toward the nearest tamer at 38 px/s (data.js PACING driftReach / driftSpeed). Players
  at the farm or away don't pull. The partner still picks up anything it touches.
- `scripts/pickup-test.js` (new): a drop pulled in by the partner goes straight to the tamer and never
  swings back; a tamer running at 260 px/s is caught in 0.4 s; a nearby drop drifts ~40 px a second;
  far ones stay put; with two tamers it goes straight to the nearer one.

## 2026-11-17z33 (cont.) — The snow-border lag, measured and fixed at the root
- Reported again: next to the snow biome as it grew, the host's resolution dropped, it lagged badly
  and the friend lost sight of the host; asked whether it had really been recreated, and why a good
  PC would lag on a pixel game.
- Recreated for real (`scripts/perf-snow-browser.js`): the real server, two Chrome players, the host
  on a snow border out of the start area, snow made strong so it wins the war there by itself, the
  host walking about, 40 s, both screens measured. On 17z32 it reproduces: snow took 38-46 cells on
  the host's map and 0 on the friend's, both screens fell to the lowest resolution.
- Why only the host: the host's browser runs the whole world for everyone, on one CPU thread, between
  its own frames; a graphics card doesn't help with that. What hit it when a border moved near you:
  - every border move wiped the whole map's remembered biomes and props and told the pathfinding the
    whole map had changed, so every enemy's paths and every solid tile were worked out again; the
    same for every ice attack, and the whole ground was thrown away and baked again in one frame
    each time the season's ice stepped up (24 times a season) -> now (world.js mapChanged /
    mapChanges, mission-sim.js _navForget) only the tiles a change touched are forgotten, and only
    paths crossing them; the whole map only on a new map or an ice step
  - ground chunks were rebuilt all at once in the frame they changed -> now marked stale, kept on
    screen, and rebuilt two a frame (a season change: 24 chunks in one frame before, 2 a frame over
    12 frames now)
  - every Digimon was tested against every other for crowding, three times a tick -> bucketed on a
    grid, same pairs
  - after every ground chunk sent to the graphics card the renderer asked it for errors, which makes
    the CPU wait for the card to finish everything queued: one stall per chunk -> at most once a
    second (unless 600+ textures are loaded)
  - when the host fell behind it ran up to six world steps back to back before drawing again (eight
    solo) -> at most two between frames online, three solo; a slow moment runs the world a touch
    slow instead of freezing the screen
- Same 40 s test, host, before -> after: world simulation 7.8 s -> 5.6 s of CPU, longest single step
  77-109 ms -> 52 ms, ground chunks built 162 -> 30 (633 ms -> 133 ms), worst frame's JavaScript
  196-282 ms -> 100 ms (a cloud VM drawing without a graphics card; a gaming PC is several times
  faster on all of it). Both screens hold the same map; each sees the other.
- Not done: moving the host's world simulation into a background thread. Measured, it was not the
  cause (bursts were), and it would rebuild how the host and the online code share the world.

## 2026-11-17z33 (cont.) — Performance readout, one-pass screen washes, far Digimon rest
- Asked for all three, with "don't cut corners, don't lower the quality, don't let it mismatch
  when my friend is somewhere else".
- **Performance readout** (`js/perf-hud.js`, F3 or Pause > Performance, remembered in settings): a
  small box, bottom left, refreshed twice a second: FPS; frame time and worst; the game's own work a
  frame; the world simulation per step, worst and steps a second (where it runs: host or solo);
  ground redrawn a second; Digimon in the world and near players; drawing resolution; the graphics
  chip (with a warning when the browser is drawing without the graphics card); host / guest / solo.
  Off, it costs nothing. Lines turn amber when something is slow.
- **Screen washes in one pass**: the season's grade and dusk / dawn / night were up to four
  full-screen fills a frame; flat washes stacked with normal blending come to one wash exactly
  (`seasons.js` tintStack). The vignette's warm light and dark edge were two full-screen gradient
  textures; layered once into one texture they're drawn in one pass (`sprites.js`, WebGL only; the
  low-detail 2D path is unchanged; the desperation pulse stays its own layer). Pixel-compared through
  the game's own renderer: largest difference 2/255 (rounding), no pixel off by more than 2. Rain's
  overcast is left as its own pass on purpose: snowflakes and petals are drawn between it and the
  washes, so merging it would change how they look.
- **Far Digimon rest** (`data.js` SIM_LOD, `mission-sim.js` _updateEnemies): a plain wild Digimon
  more than 2600 px (about twice any screen) from every tamer, partner, ally, CPU teammate, rival and
  nemesis is updated one tick in four with the time it missed, so it ends where it would have been
  (3 px apart after 624 px of walking in the test); pairs of resting ones aren't pushed apart until
  their own tick. War soldiers, nemeses, rivals, the infected, lords and Digimon fighting each other
  are always updated every tick, wherever they are. A friend anywhere counts like you: in a
  two-player check with the two of you 18,000 px apart, all 63 Digimon near either of you were
  updated every tick. Honest note: the world already lets herds nobody is near go, so few Digimon
  are ever this far from everyone; it is a safety net for big maps and later features more than a
  big win today.
- `scripts/lod-test.js` (new): near ones every tick; far ones 1 in 4; same ground covered; a friend
  6000 px from you keeps their Digimon on every tick; soldiers, infected, nemeses, lords never slowed;
  300 far Digimon: 45,000 -> 11,250 updates in 150 ticks.

## 2026-11-17z33 (cont.) — Use the graphics card
- Asked: make the game use the graphics card by itself, and explain when it can't.
- `gl/renderer.js`: the WebGL context now asks for `powerPreference: "high-performance"` (a laptop with
  two graphics chips gets the gaming one, not the built-in one), and no longer keeps
  `preserveDrawingBuffer` (nothing reads the screen back; on some cards it cost a whole-screen copy a
  frame). Checked: the game draws as before.
- A page can't turn the browser's hardware acceleration back on; that's the browser's setting. So
  `js/gpu-help.js`: when the game finds it's drawing without the graphics card (the chip's name, and
  now also the browser refusing a context with `failIfMajorPerformanceCaveat`), a pop-up says so once
  a visit, at the title or hub (never mid-fight), with the steps for the browser it's in (Chrome,
  Edge, Brave, Opera, Firefox; Safari note), the settings address with a Copy button, "Still slow
  after that?" (update the graphics driver; Windows Settings > System > Display > Graphics > set the
  browser to High performance on laptops; F3 shows the chip in use) and the other browsers' steps.
  "Don't show again" is remembered on that computer. Pause > Graphics help opens it any time (the
  button only shows when there's no graphics card in use). It sits above the first-time tour (which
  covered it on a brand-new profile, caught in testing) and below the sign-in screen.

## 2026-11-17z33 (cont.) — The turf war is the point (if you want it)
- Asked: make the biome wars the angle of the whole game: pick a side and help it dominate; say so in
  the tutorial, have a Digimon pop up and suggest picking a faction (optional, never mandatory), and
  "or you can go in any direction and see how long you can survive".
- Tutorial (`tour.js`): Jijimon's welcome now has "The heart of it: turf wars" and "Pick a side...
  or don't"; the setup tour's last card says a little Digimon will ask which side you're on. How to
  Play opens with a paragraph on the turf wars.
- `js/turf.js` (new):
  - 22 s into a run Tokomon pops up from the bottom: the biomes holding land round the start (a disc
    of 12 cells, ~4,600 px), each with its share (an underdog is marked under 10%), "Just survive"
    and "Later". Number keys pick. It goes by itself after 40 s; Pause > Your side asks again any
    time and you can switch sides.
  - your side's share shows under the minimap (YOUR SIDE, the share, a bar to the 50% mark); the
    messenger calls out 30% / 40% / 45% (when above where you started) and warns if your side is
    nearly wiped out.
  - at 50% of that land the war is yours: a victory card ("Ember Crags rules the land!", the
    share, how long it took, a comeback line for an underdog), the run goes on.
  - Badges, new Turf War group: Pledged (pick a side), Kingmaker (win), Warlord (5 wins), Against All
    Odds (secret: win for a side that started under 10%). The run's rank pay adds "Turf war won"
    (200) and "...for the underdog" (150) (data.js RANK.pay turfWar / turfUnderdog).
  - Each player picks their own side online; every screen reads the same territory.
  - Numbers measured over 40 maps: the disc holds ~441 cells and ~6 biomes, the biggest ~26%, the
    smallest a few percent, so a big side has to roughly double its land and an underdog has a
    long climb. All in TURF (turf.js) to tune.
- Checked in the browser: asked at 22 s with six sides; picking the 2% Ember Crags earned Pledged;
  as it took land the 32 / 41 / 46% calls came and at 51% the victory card, Kingmaker and Against
  All Odds; Just survive leaves you a free agent and the messenger stays quiet; Pause > Your side
  brings him back; key 2 picked Sludge Marsh. No errors.

## 2026-11-17z33 (cont.) — One friendly biome at a time; rare world events
- One side only (faction-sim.js _trustEarn, progression.js "side.pick"): only your side's
  Digimon can come to trust or ally with you. If you haven't picked, nothing is handed to you:
  every biome you help warms to you, and the first one you win over all the way (to trusted)
  becomes your side; the others drop back to neutral and Tokomon says who won you over. Never
  win one over and you stay sideless. (When one kill wins over two at once, the one holding more
  ground round it goes first.) Picking another side, from Tokomon or Pause > Your side,
  drops the old one (allies too) back to neutral. "Just survive" makes you a free agent: nobody
  warms to you. Online, each player has their own side; a guest's pick goes to the host as an
  intent. scripts/one-side-test.js.
- World events (net/event-sim.js on the host, js/world-events.js on every screen). Rolled once a
  run: about 55% of runs have none, 35% one, 10% two, between 8 and 50 minutes in, at least 10
  minutes apart (WORLD_EVENTS in data.js). Each gets a 25 s warning card on every screen with
  which way and how far, then a chip at the top (direction, distance, time left, health) and a
  minimap marker.
  - Virus outbreak: a Patient Zero (infected Champion, Ultimate after 20 min) with two carriers.
    Ignore it for 5 min and it slips away, infecting the Digimon round it.
  - Dark Area surge: a rift turns the land round it to Glitch, a ring at a time (up to 9×9 areas;
    never the cradle round the start), and a Surge Lord (a Dark Area Ultimate, Mega after 30 min)
    comes out. Beat it and every area goes back to whoever held it; run out of time and the
    Glitch keeps it.
  - Rampaging Mega: beat it in 6 min or it moves on.
  - Health grows 60% per extra tamer. When it falls, every tamer in the run is paid whatever
    their side: 60% of a level's XP plus bits (more later on); half for anyone who never came near.
  - Badges: Answered the Call, Patient Zero, Rift Sealer, Mega Breaker, Old Hand (3).
    Dev console on the host: DBH.wevForce("outbreak" | "surge" | "rampage").
- Tested: scripts/world-events-test.js (odds over 4000 runs, each event won and lost, pay for
  two players on different sides, land handed back). In two browsers a forced surge showed
  the same warning, chip and Glitch land on both screens, and both players got paid and badges.

## 2026-11-17z33 (cont.) — Every signature move looks like itself (move revamp, pass 1)
- Before: the 364 signature moves were drawn by seven generic drawers with the line's colours and a
  shape, 50 different looks in all (every burst was the same ring of blocks).
- Now each move has a recipe (js/sig-fx.js): what it's made of (37 motifs: bubbles, petals,
  feathers, snowflakes, rocks, notes, hearts, skulls, swords, gems, fish, missiles...), its colours,
  how its kind plays out (75 forms: a burst can bloom, crack the ground, spin into a vortex, ring out
  as sound, go up in a ring of flame; a beam can be a ray, a drill, a helix, a rake of claws, a horn
  charge, a bolt, a bite; a strike can be a meteor, a rain, a dive, a pillar, a bomb, a geyser,
  spikes, vines, a sword out of the ground; traps are coals, buds, runes, pits, crystals, charms,
  eyes, spore clouds...), how a shot flies (sways, corkscrews, flutters, hops, comet tails), its
  trail, its hit and its wind-up. Chosen from the move's name and description, then a resolver
  makes all 364 different (no two share kind + form + motif + trail; in a line, two of the same kind
  never share a form). A move that grew from another is drawn bigger with more layers.
- Drawn by js/sig-fx-draw.js (only canvas calls the WebGL renderer supports); attack-fx.js hands it
  the signature moves' events and shots, everything else is as before. Cosmetic only, same on
  every screen. Measured in the browser: the effects cost the same per frame as before.
- moves-gallery.html: every line's signature moves side by side, looping (click one to replay,
  slow motion button). scripts/sig-fx-test.js.

## 2026-11-17z33 (cont.) — Move looks hand-tuned; a long two-player playtest
- sig-fx.js HAND: 188 of the 364 moves hand-picked (motif / colours / form / trail / impact) where the
  automatic pass got it wrong (Kyubimon's moves are blue foxfire, Zudomon's Flail Storm a whirling
  hammer not lightning, Gargomon's shells are missiles, Garurumon's are fangs and frost...). The hand
  picks go into the resolver first, so everything stays different (scripts/sig-fx-test.js).
- Playtest (host + guest, two browsers, about 3 min): sides, real digivolving on both, both Megas with
  full signature sets, a snow war, a Dark Area surge start to finish, PvP, a long stretch. No errors,
  same map / clock / positions on both, nothing rejected; the new move effects cost the same per
  frame as the old ones (A/B in the same run).
- Fixed from it: a world event's clock stopped while anyone's partner was back in its egg
  (mission-sim.js now runs _updateWev outside the "spawns open" check).
- WHATS_NEW.md: what changed in 17z33 and what to try.

## 2026-11-17z33 (cont.) — Pick your egg from a grid
- A friend new to Digimon couldn't tell what the egg picker was. js/egg-grid.js: every egg at once,
  five across (three on a phone), scrolling. An opened egg shows the egg and the baby it hatches
  into, its name, its element and range ("Fire · up close") and two of its signature moves; an unopened one is a silhouette
  ("???", with how to open it). Hover (or tap once on a touch screen) for a card with how it plays in one
  line ("Fire. Fights up close: drops attacks from above and knocks back crowds.", worked out from its
  signature moves; what it turns into is left to the pictures), its signature moves, and every digivolution path you've reached with that egg, drawn as a row of
  Digimon (from the save's discoveries.edges). Click (tap again) to take it; arrows / Enter / Esc work.
- Opens from the run setup (the egg picture, its name, or "See all eggs"), the online lobby (tap
  the egg's name) and the Your Digi Eggs screen ("See all eggs"). The arrows still work as before.
- Still pictures (anything drawn with t = 0 and not moving: the egg grid, its path chips, the
  digivolution log, hub portraits) now use each Digimon's most typical idle frame, worked out once
  per species (sprites.js stillFrame: the frame most like all the others), so a blink or a twitch is
  never the one frozen. Hovered cards still animate. Relemon's sprite has its eyes shut in every
  frame (that's the art), so it still looks that way.

## 2026-11-17z33 (cont.) — Detailed move emblems
- js/sig-icons.js: every move's emblem on the level-up cards and in the skill tree is painted at
  128 x 128 from its own look (sig-fx.js recipe): an enamel badge in its colours with a bevelled rim,
  its form drawn behind (the path a shot flies, petals of a bloom, cracks of a quake, a vortex, a
  ray / drill / helix / claw rake / jaws, a meteor tail, rain, a pillar, a geyser, vines, a trap's
  coals / puddle / rune / web / pit / paw prints, a saw or wheel, a chain of sparks, notes, fish...),
  the motif shaded smoothly from its depth with a light from the top left and a dark outline (one,
  or three in a fan / falling, by how it plays), its trail as small accents, a gold pip per growth.
  All 364 signature emblems differ; other moves get the same treatment from their attack look;
  stat skills keep their pictures. move-icons.js paint() shows them smooth (the old pixel ones crisp),
  and the card icons are a little bigger (64 px on level-up cards, 56 px in the skill tree).
- Look-alikes: moves of the same element and motif (16 boulder moves, 14 flames...) only differed by
  their faint backdrop. Each one in such a group now gets its own badge shape (rounded square,
  circle, shield, diamond, hexagon, octagon), a tint nudge (lighter / darker, a little round the
  colour wheel, never far enough to read as another element) and its own treatment of the motif
  (plain, glowing, cracked, split in two, ringed, a pair). sig-icons.js variantOf.

## 2026-11-17z33 (cont.) — Four modes and the main menu
- data.js MODES: each mode has a group; MODES.main is the menu's four (story, survival, siege, versus).
  Survival holds open / survival ("One Life") / ranked / weekly. SIEGE and VERSUS hold the numbers.
- net/modes-sim.js _updateModeRules (called after _updateSpawns) runs the mode's own update;
  _oneLife includes siege. _runRecord adds nights, story, vs.
- net/story-sim.js: 11 goals (STEPS), "all" (every tamer) or "party" (a total, per player for kills).
  Gates noRival / noVirus / noEvents until the goal that opens each; story.step / state / clear / done.
- net/siege-sim.js: nights off the day clock (startAt 0.6 to endAt 0.965), rings of attackers round
  each standing tamer (e.siege, allowed into the Baby zone), stage pools by night, boss every 3rd,
  dawn pay; siege.warn / night / boss / dawn / state.
- net/versus-sim.js: homes at +-spread, caches and mini bosses (a sleeping pack) in the middle, then
  the showdown: arena, clears wild Digimon, wraps _pvpFoes / _pvpKo / _respawn for Versus; rounds,
  countdown, roundSec, best of toWin; vs.* events; runOver at the end.
- rival-sim.js honours noRival. Lobby (online-ui.js): the four modes plus Survival's rules; Versus
  can't start alone. Guests take the host's mode (game.js run.mode from online.hostMode()).
- js/modes-ui.js: the top chip, Jijimon's card (with his sprite), toasts, the 3-2-1 countdown, game
  over lines and title. turf.js holds Tokomon back in Story until the side goal.
- hub.js / hub.css: four mode tiles with their own little scenes, a smaller row (Hatchery, Eggs,
  Discoveries, Online), setup shows only the chosen mode (Survival: its rules). tour.js points at the
  four modes. scripts/modes-test.js.
- Follow-up: the Online tile is gone. Hub small row is three wide (Hatchery, Eggs, Discoveries) so it
  doesn't line up under the mode cards; "Join a friend" chip in #hub-top; setup's strip has JUST PLAY
  and INVITE FRIENDS (hosts a room in the chosen mode, btn-online-host); the party card's Online pick
  is gone. tour.js points at the join chip.
- Follow-up: setup strip summary removed (setup-sum now only holds a blocking warning); hub.js paintGear
  draws a socket per loadout slot (items.slots(): 1-2 crests, the second locked till the Lab Port;
  charm; one-run item or scroll) with icon-art emblems. game.js pushes your own name tag (profile
  name, lobby colour online). online-ui.js lobby cards drop the projection colour.
- Follow-up: holograms without legs. scripts/art/holo4.py (make_tamers.py uses it; --holo3 for the
  old walk): holo3's outfits drawn at 1.5x through a scaling ImageDraw (60 x 84 frames), a 1-px ink,
  rim light, two-step shade, seam shadows, eye glints, fine scanlines; below the waist a tapering
  column dissolved by ordered dither and row slips, a faint beam and the ring. "walk" frames are a
  glide (float, arms held back). sprites.js: shown 1:1 in the world (0.72 in key-less menu calls),
  a slow hover, drawHoloMist (motes drifting down from the waist, streaming behind when moving) and
  drawHoloTrail (afterimages of the upper body); no footsteps.
- Secret reward projection "smoke" (Black): holo4.py STYLE smoke (dark fill, silver-grey outline,
  broad shoulders, cap, a pixel cigarette drawn over the lit figure, TIPS per frame); sprites.js
  TAMER_IDS secret + faint glow, SMOKE_TIPS, drawSmoke (ember, a drag every 7 s with a flare, an
  exhaled puff, a wisp), getTamerList hides secret ones until unlockTamer(id) (localStorage
  dbh_secret_<id>). The unlock code on the projection picker is still to be chosen.
- Chat: net/online.js sendChat / chatPost (host stamps name and colour, cleans, caps at 140, 5 per
  6 s), "chat" and "chatlog" (last 20 to a newcomer); js/chat-ui.js: lobby box under the players,
  in-run line at the bottom left (Enter / Esc, fading lines, touch button); input.js releaseKeys so the
  tamer stops while typing.
- Secret unlock: chat-ui.js slash codes (lobby only, never sent; FNV-1a hash of the lowercased line
  in CODES, so the words aren't in the source) -> sprites.unlockTamer("smoke"), menu.setTamer, and
  online-ui picked() so the room sees it.
- Care: data.js CARE (hungryAt, starveAt, starve speed/damage/joy, rest, boss/level/faint/fav joy,
  fullRefuse, softer hit losses), FOOD rebalanced, favouriteFood / isFavourite. mission-sim.js
  _updateCare (starving flag into stats, rest, flags in the snapshot), joy on boss kills, level ups,
  faints. progression.js: full refusal, favourite bonus. rarity-sim.js: sulky refusal only over 45%.
  game.js: food bubble over hungry partners, ♥ in the feed menu, refusal and favourite floats.
  scripts/care-test.js; lifecycle test moved to the new refusal rule.
- Shinies: SHINY.evoBoost 0.025 / hatchBoost 0.05; progression.js rolls on the hatch too and stores
  p.shinyBoost (max HP at the form change; damage, mon speed, cooldown in the stats); toast and pause
  tag. sprites.js shinyMapFor "dark" Digimon get their dark body recoloured. shiny-test updated.
- Shiny moment: game.js shinyMoment (DOM #shiny-moment, CSS animations, 3.2 s = SHINY.guardSec),
  local pause when solo, "shiny.guard" intent (progression.js, once per new shiny: mon + tamer invuln;
  whitelisted for guests in online.js). shiny-test covers the guard.
- Farm gates: js/farm-gates.js (home gate north of the start, one by each nest whose cell your side
  holds; drawn by depth, E / Y / Act within FARM_GATES.reach). game.js enterGate / gateHint, the Farm
  chip points to the nearest gate (and a minimap mark), F out in the world only tells you to go to
  the farm, touch Feed/Farm buttons gone (Act says Farm at a gate). progression.js field.feed is off
  unless FARM_CFG.fieldFeed. CARE.fullnessDecayPerSec 0.2. Story, tour, help, prompt bar updated.
- Farm training economy: data.js CARE.fill (fav 33 / normal 25 / dislike 17), dislikeJoy, bagMax 10,
  dislikedFood / isDisliked / foodFill; FARM_CFG trainMinFull 33, gateBonus 0.1 (max +100%), fresh
  {max 3, start 3, killsPer 10, tired [0.7, 0.45, 0.25]}, station costs 25 (play 10). progression.js
  _eat by taste, trainStart food gate, _finishTrain fresh / tired / gate multipliers. mission-sim.js
  _bagFull (food left on the ground), _gateCount -> p.farmGates (every 2 s), kills -> trainFresh, fields
  in the record (FARM_KEYS carries trainFresh / trainTired back from a friend's farm). game.js /
  farm.js: F silent in the world, ☹ in the feed menu, fill shown, bag x/10, farm panel line, training
  floats. care-test extended; progression-auth-test feeds it to 34 before training.
- Spire gamble: js/net/spire-sim.js (installed like the modes): _spireRoll (TERRAIN.spire.roll), _spireBreak
  (swarm / pack spawned with e.spireGroup; big queued behind a spire.rumble, spawned by _updateSpires with
  spdMul), _spireKill -> _spireClear (chest_<tier> orb, spire.cleared), _openChest on pickup (Bits from
  TERRAIN.spire.chests, chest.open). progression.js prop.use calls it. game.js toasts by tier, rumble shake,
  drawChest. Enemy speed honours e.spdMul. scripts/spire-test.js.
- Chest contents: TERRAIN.spire.chests[tier] {bits, data, loot weights} + dataTypes. _openChest rolls a rare
  food into p.bag (_chestLoot) and a data element; chest.open carries food / dataType / data, and game.js
  adds the data to run.dataBy (banked by hatchery.bank at run end). Six rare foods in data.js FOOD (rare:
  true; D.RARE_FOODS): foodFill / isFavourite / isDisliked / dietOf / _foodCount skip taste and the bag cap.
  progression.js _rareEat: trainBoost (used by _finishTrain), statUp (trainStats), evoFruit (_luckyRoute
  chance, kept if no rare route), mistakes. trainBoost / evoFruit in the snapshot and FARM_KEYS. Icons in
  make_items.py (pickup-art.js). Feed menu / farm row / bag row show them (gold star). spire-test extended.
- Garden rework: veg lose hpHeal (DIET.hpHealBonus gone; progression _eat and farm.js local feed don't heal).
  Each veg has stat / per / desc; data.js vegBoosts(foodCounts) (capped at VEG_MAX 10 meals each) is applied
  in mission-sim _stats: monSpeedMul, cooldownMul, damageMul, magnetMul, allyGuard, allyMaxHp (the existing
  allyMaxHp path rescales maxHp). Field food has desc text. farming-test covers it.
- The bag: js/inventory-ui.js (I key, D.hud.act("inv"), touch-ui Bag button, prompt-bar glyph, input hint
  "inv"). Groups via FOOD / isSeed / SHOP.catalog for names and descriptions; discard through
  progression "bag.discard" (in INTENTS and online ACTS). The bag-row cap is a button that opens it.
- Farm mini games: js/net/minigames.js (DOM-free; create / tick (sub-stepped) / input / score / summary /
  gradeOf / preview). progression.js trainStart makes activity.mg for bag / board / track; _tickFarmActivity
  ticks it (dodge: the stick steers the partner, _tickFarmYard leaves the tamer still); trainInput feeds it
  and settles at once when it's done; _finishTrain uses preview() for the gain and emits grade, before /
  after, detail and the breakdown (base, repeat, fresh / tired, gateMul, boost, nextGreat). makeQuiz, the
  bag beat and the track laps on the authority are gone. js/farm-train.js: panel (#train-game), result card
  (#train-result), signLine() under the station signs in farm.js. scripts/minigames-test.js.
- Next for the farm (talked about): a tighter layout, rest / bed, visitors, a request board, an
  evolution peek.
- Rockfall Run on the track: minigames.js kind "lanes" (LANES cfg): arc-length table of the track ellipse
  (trackPoint / trackLen / lanesPos), two lanes at +/-11 px, rocks (warn 0.75 s) and hurdles spawned ahead,
  never closing both lanes (clearGap), stumble on a hit; E or a direction tap switches lane. progression puts
  the partner at lanesPos each tick; farm.js camera follows it (scale 0.9, raised). farm-train.js drawWorld:
  start gate, quarter-lap posts, rocks with growing shadows, hurdles, dust; compact panel with an oval map.
- Farm look: FARM_CFG stations (board 235,390 / bag 470,390 / bond 975,380), garden y 530, shed 590,196.
  farm.js ensureScene: plaza pad (kind "plaza"), trainYard / playYard rects (geo.yards), straight 44 px paths,
  beds by the door, lamps / benches / crates / barrels / planters. farm-art.js: dithered grass with tufts and
  straight mow stripes, cobble paths with kerb (cob palette), ringed flagstone plaza, timber-edged yards
  (sand raked), raised timber-framed garden beds on straw; new props lamp, bench, crates, barrel, planter.
  CSS: the farm panel as a slim grid bar (wide screens).
- Checked: trainStats (offense / intelligence / agility) have no combat effect anywhere; they only feed
  evo-stat-gates.js caps (strength: maxInt 48 / maxAgi 80; wisdom: maxOff 40, off <= 2x int; speed: maxOff 48;
  balance: ratios) and rarity extras; bondTrain feeds bond (T2 minBond 70). farm-train.js DOES text on the
  result card and the mini game panel. Open question for Isaac: give training a real combat effect?
- Training into stats: ro-stats.js FARM {per 10, map offense->str+dex, intelligence->int+luk, agility->agi,
  bond->vit} and farmBonus(); mission-sim _attrParts (level / evo / farm) and _jobBonus = their sum; snapshot
  attrParts + moveMul [partner %, tamer %, track %, boots]. data.js SPEEDS {trackPer 0.005, trackMax 0.6,
  boots {per 0.06, max 5}}; _stats: monSpeedMul x track, speedMul x boots (the partner's existing
  max(tamer x 1.04 / 1.08) keeps it ahead). Shop: sprintBoots, kind "upgrade" (max) in shop.js / progression
  shop.buy / game.js labels; icon in sprites.js. Status window: game.js tickStats two columns (stats-cols),
  detail sheet with lit lines and +1 previews. farm-train.js DOES + the stat-points line on the card.
  scripts/train-stats-test.js.
- Farm exit: FARM_CFG.noTimeLimit (progression farm.tick no longer auto-returns) and exitGate {y 784, reach 66};
  farm.js exitPoint / nearExit: interact there -> end("ready"); drawn with farm-gates.js draw (opt sign
  "WORLD", hint; the plate fits its word). btn-farm-return removed (btn-farm-status instead); Esc at the farm
  closes Status / Skills / bag, else a toast. Track and garden signs moved clear of the gate.
- Tidy-up: catchHudText returns "" with nothing under way (chip hidden); btn-shop hidden while unusable;
  .evo-strip:empty hidden; CSS body:has(#farm-screen.is-on) hides hud-pvp / hud-kills / hud-capture / btn-shop /
  prompt-bar / burst-chip / btn-pause; index.html: farm-stay and btn-farm-train removed (btn-farm-bag), Skills
  off the prompt bar; farm.js: btn-farm-pet is the context button (label from what's near), farm-mood without
  joy / fullness / meals, the Garden plate removed.
- Shop only via Jijimon + E: removed btn-shop, input "shop" (Q), hud.act("shop"), btn-farm-shop (now
  btn-farm-skills), touch-ui Shop. openShop is reached from interactNow (merchantInRange) and farm interact
  (the cottage).
- One-run items: gear.uses (array) everywhere (mission-sim _gearClean max useSlotsMax 4, _gear includes uses
  (fx xp, crop, shiny), _gearStart loops them (attr -> p.itemAttr -> _attrParts.item, bits, belly));
  items.js eq.uses + useSlots() (ITEMS.useSlots 3 + Lab "kit"), equip pushes the oldest out, endRun spends all;
  drops: ITEMS.drop.field / elite / chest (items.onEvent on kill and chest.open). 11 new cons in data.js with
  icon-art; hub.js paintGear 7 sockets (CSS 7 columns). items-test and lab-test updated.
- Shop rework: shop.js SHOP.always / pool / stockCount, catalogue with fixed prices and perVisit, seed packets and
  six Digimentals (applyDigimentals narrows the tree's "digimental" armor condition per route; called from
  Progression's constructor), shopKey (farm.since / merchant.visit), shopStock (seeded per visit and tamer),
  shopLeft. progression shop.buy: in stock and per-visit limits (p.shopVisit, in the snapshot and FARM_KEYS),
  ticket (trainFresh +1), seeds; bag.use (gateKey / map spent, lure spawns a pack of the best catch kind).
  world.js spiresNear; game.js useTool (gate key -> startFarm, map -> minimap marks for 120 s), renderShop
  from the stock with the shelf / this-visit sections; inventory Use button (canUse). Icons in sprites.js.
  DigiBits renamed DigiCoins everywhere players see it. scripts/shop-test.js.
- Pickups: PACING.magnetRadius 50 (was 125), driftReach / driftSpeed gone; mission-sim _updateOrbs: only the
  tamer's circle (the partner's position for a tamerless partner) pulls a drop in or eats it; nothing drifts;
  once pulled in it flies to that tamer. moveMul[4] = magnetMul %; game.js drawMagnetRing (shown while a drop
  is within 2.6x of it) and a Pickup range line in the Status sheet. pickup-test rewritten.
- Landscape (PokeTide-style pass, step 1): world.js finishGround(ctx, cx, cy) runs once per chunk after Pass 1,
  on art pixels in world coordinates via getImageData: grass tone patches (fbm on a 4-pixel grid, blended,
  Bayer-dithered steps; darker under meadows), tufts (natural biomes, per-tile hash), water depth (tiles to the
  nearest bank, up to 3, bilinear; lighter teal shallows, darker deep; skips frozen, solidWater, edge pixels),
  path pebbles. About +2.7 ms per chunk build. meadowRows/meadowAt: rows jittered and thinned at the field's
  edge. game.js drawWaterFx: ripples on about a third of tiles, a short fading line drifting with the current;
  glints rarer. Shadows already existed (sprites.shadow, terrainArt.SPREAD).
  Step 2 (done, below).
- Landscape step 2: finishGround now repaints shores and path edges from a per-pixel material code: each
  tile's material blurred exactly (Gaussian, sigma 6.6 art px, via erf weights WT over the 3x3 tiles) and
  thresholded at 0.5 +- value-noise wobble (4-px world grid). Codes 1 grass / 2 path / 3 water (incl. lava and
  Freezeland ice) / 4 seasonal ice (left as drawn) / 0 cliff (cliffs count -1, keeping a grass lip). Tiles
  whose 3x3 neighbourhood is one material skip the blur (uni). Shore distance by a two-sweep city-block
  transform (capped at 4): 1 ink (0.85), 2 ink 0.45 over water, 3 foam 0.5, depth shading only past 3.
  Colours come from grassColor / pathColor / waterColor with the tile cache's tx,ty (variant*3, variant*5),
  memoised per biome+season in shoreCache. Paths lightened 20% in natural biomes (colour-blind contrast), lip
  0.55. rasterTile frozenLook: dark blue-grey rim. scenery(): reeds on banks, flower clumps (season-scaled).
  game.js: wind sway on grass/tuft props (whole pixels); removed the duplicate drawDecor call (every prop was
  drawn twice). Cost measured over 150 chunks: about +3.5 ms per chunk build in total for the finishing pass.
  Colour-blind check: /tmp/cvd.py (Machado matrices) over screenshots of all eight biomes.
  Next: done in step 3 (below) for lighting and borders.
- Landscape step 3: game.js BIOME_MOOD {wash, vig} per biome; tickMood samples biomeAt over a 5x3 grid
  across the screen (premultiplied, so a half-forest screen gets half the green) and eases at 0.8/s;
  moodWash joins the season grade in drawDayNight's single tintStack pass; drawBiomeShade (on top of the plain sprites.drawVignette) is one stretched
  radial sprite tinted per colour step (cached, max 40), skipped with reducedFx. world.js finishGround:
  bM (biome per tile in the margin grid), lq (liquid kind: 1 water, 2 lava; each counts -1 to the other so
  they never touch), liqT (the tile a liquid pixel takes its colour from), mixB (another biome within 2
  tiles), borderBiome: the biome at a point warped up to 13 art px by slow noise (bgrid/bgrid2, period 30),
  blurred with the shore weights, the top two decided from the first by id (so both sides agree) with a
  small Bayer dither. Applied to grass, paths, cliff tops (colour from cliffTopColor with the tile's own
  mask, so outlines stay) and water colour (never into or out of solidWater or snow). Cost: about +3 ms per
  chunk where borders run through the chunk, nothing elsewhere.
  Next: done in step 4 (below).
- Landscape step 4: shore distance capped at 5 (bands 3 and 4 exact); finishGround bakes two N x N (art
  pixel) foam masks per chunk with open-water shore (not lava / Freezeland ice) into ch.foam {a, b}
  (released with the chunk); drawGround draws them scaled x3 after the chunks, one global wave
  (sin(t*0.85)): band a 0.1-0.34, band b 0 to 0.32 (squared), still at 0.18 / 0 with reducedFx.
  sprites.drawProp(ctx, kind, x, y, sway): two slices (bottom 40% on an art-pixel row fixed, crown moved).
  game.js: SWAY_TREE {tree, snowtree}, crown from the grass wind wave (phase -0.6, x2.2 / x0.6), off with
  reducedFx; autumn leaves (maybeLeaf from each tree drawn, 0.4% a frame, max 40; drawLeaves after the
  actors, dark edge under each). world.js scenery: plateau tops (centre pixel code 0): tufts in natural
  biomes outside winter, pebbles anywhere, only where all pixels within 3 are plateau.
  Next ideas: done in step 5 (below).
- Landscape step 5: game.js drawBiomeMotes (after drawLeaves): 26 spawn tries a second at random points
  in view, kept by biomeAt: snow -> flakes (with a shadow pixel), forest (plains 30%) at night (dayInfo
  dark > 0.3, not winter) -> fireflies (glowSprite, additive), volcano / swamp -> a random inner liquid tile
  from waterInView: lava -> embers rising, swamp water -> bubbles that pop into a ring. Max 90, off with
  reducedFx, frozen when not playing. world.js finishGround bakes ch.lava: four art-pixel frames of crust
  (value noise, shifted per frame, crust alpha 150-220, crack band alpha 120) inside lava past its outline;
  drawGround cross-fades frame f to f+1 every 3 s (frame 0 with reducedFx); released with the chunk.
- Landscape perf check: per-frame CPU (headless, 120 frames, forest and volcano): drawGround 0.2-0.34 ms,
  drawWaterFx 0.05-0.24, drawLeaves ~0, drawBiomeMotes 0.02-0.3, drawSeasonFx 0.12-0.27; motes/leaves 0 with
  reducedFx. Foam and lava overlays now carry a box (ch.foam.box, ch.lava.box, art pixels) and drawGround
  draws only that sub-rectangle (part()), cutting overdraw on chunks with a little shore.
- Holograms: sprites.js holoPool (cached radial sprite per glow colour, two stretched quads, additive,
  0.34 day / 0.14 faint tamers, x dark again after the wash), holoScan (four phases of the frame's own
  shape with every 4th row white, kept on sheet.__scan; frame chosen by t*7, frame 0 with reducedFx; drawn
  additive 0.2 / 0.08), drawHoloMist: ten pixels rising ~60 px from the mist and fading (off with
  reducedFx). drawTamer stores S.lit {sheet, transform, colour}; litTamers(ctx, dark, t) redraws each
  projection drawn this frame additively (0.55 x dark, 0.25 for faint ones) plus its pool, called from
  game.js drawDayNight right after the wash with applyWorldCamera (worldShake keeps the frame's shake).
  Decided against: shading on the figure, water reflections, a hit glitch.
- Longer clock (Isaac: "everything a little longer", 35%): day-clock.js DAY_SECONDS 243 (was 180),
  seasons.js CFG.lengthSec 486 (was 360), two days a season kept. Fallbacks updated (profile, badges,
  nest-sim, spire-sim, mission-sim, world.js, siege-sim). stage-waves timeTier reads the clock in 6-minute-
  season units (x 360 / lengthSec), so one Digimon stage per season holds; FIELD spawn ramp (per minute)
  untouched. Badge fastc uses the season length. Tests now read DAY.lengthSec / CFG.lengthSec instead of
  180 / 360 / 1440 (badges, lord, terrain, night-storm, modes, seasons).
- Then (Isaac): seasons.js CFG.step x1.1 (hp .22, atk .11, spd .022, spawn .11, cap .088; xp .08 kept);
  stage-waves FIELD x~1.1 (rate0 .46, rate6 .75, perMin .043, max 2.15; cap0 7.7, cap6 11, perMin .48, max 37).
- Test pass (17z33): browser smoke scripts kept in /tmp only (smoke-modes, smoke-fight, engage, online2 via
  host-game.js on :8800, farmui, hub, soak, cycle, phone). Fixes: turf.js waits on D.levelWindowOpen (game.js)
  and steps aside if the picker opens over it; badges fastu/fastm use seasonLen() x2 / x3; MEGA_SPAWN
  firstAt 1458, rareUntil 5832, rareEvery 486; badges-test times in season units.
  Open questions for Isaac: Tokomon's side question in Versus and Night Siege (only Story holds it back);
  on phones the joystick overlaps the Mood panel and the HUD still shows key hints ([K], [T]).
- Isaac "fix all 3": modes-ui NO_TURF {versus, siege} in holdTurf. world.js buildChunk: the last ground row
  copied (destination-over) into 3 rows of the face strip below, so LINEAR sampling at render scale 1.5
  (phone DPR 2: canvas 1266x585) no longer blends it with transparency (the dark line at every chunk edge).
  input.js sets body.kb-ui for a keyboard; style.css hides #joystick under kb-ui / pad-ui without touch-ui.
  New scripts/turf-hold-test.js (holdTurf per mode + the chunk strip fix). 70 test files.
- Moves (Isaac): moves.js gives SIG_INFO tier 5 beam/burst/strike/nova moves without a charge charge 0.3 and
  D.isBigMove(id) = has a charge (46). mission-sim hit events carry w (the move). hit-fx: hitstop only for
  bigMove && frac >= 0.2, or tough && (frac >= 0.35 or crit && frac >= 0.2), tough/boss kills, hurt >= 10%
  (CFG.stop.big 0.05); ordinary kills and crits no longer hold. game.js passes bigMove / tough (enemy maxHp from
  damage / f vs run.maxHp * 1.5). attack-fx: maybeMark on boom/burst/slam/erupt/zap (big, tier >= 4 or r >= 50)
  and big hits, one per spot; MARK_SHAPE per family baked at art px (x3), 5 s, max 24 (8 low), drawn in
  drawGround; light() list from flashes, shots (fire/holy/machine/ice) and young marks, drawLights(ctx, dark)
  from drawDayNight after litTamers. Tests: hit-feel-test rewritten for the new holds; new move-feel-test.
- Night Siege, Primary Village (Isaac): data.js SIEGE.nest {eggs 5, ring 40, offset 110, eggR 13, hp 300, aggro 420,
  release 520, biteMul 1}. siege-sim.js _siegeNest (below players[0] at the start), _siegeAct (in _updateEnemies'
  bite chain for e.siege: null = chase as usual when a tamer/partner/ally is within aggro, held with release;
  else the nearest live egg, idle and biting when in reach), _siegeBite (contactCd, siege.egg / siege.eggLost /
  siege.nestLost + runOver reason "nest"); waves and the boss spawn round the nest; dawn mends live eggs;
  siege.state / siege.dawn carry eggs. Snapshot nest {x, y, eggs [[x, y, hp, max]]}: authority.js copies it,
  online.js packs it as pv (ns is the wild nests!). game.js drawNestBed (ground), drawNestEgg (y-sorted,
  real egg art, cracks, bar, shell pieces), drawNestArrow (screen edge, dusk and night), minimap "nest" mark.
  modes-ui: eggs in the chip, toasts, "THE EGGS ARE GONE", siegeState(). Tests: siege-nest-test (new),
  modes-test co-op wave now round the nest.
  Not done: Elecmon (not in the game; would need new art of an existing character). Next: different nights,
  then talk through building.
- Primary Village extras (Isaac): SIEGE.nest kinds (8 Babies, egg art egg_<kind>), hatchAfter 3, helpers 3,
  helperHpPerNight 0.6, hpPerNight 0.3, repairCost 60 + repairPerNight 20 x nights, repairReach 130, raidFrom 2,
  raidChance 0.2. siege-sim: eggs carry age and k; _siegeHatch at dawn (addCpu with siegeKid, fallen ones
  cleared, siege.hatch, fresh egg); _siegeRepair + "siege.repair" intent (progression INTENTS, online ACTS);
  e.raider skips the aggro check. Snapshot: eggs [x, y, hp, max, k], nest.cost, nest.night; enemies raider (online
  flag bit 128). game.js: nestEggFrame, nestRepairInRange / tryNestRepair (E, after the shop), drawNestLabel,
  drawRaiderMark. modes-ui: hatch / repair messages, raider note on the night card. modes-test's boss check now
  runs with unbreakable eggs. Watch in playtests: egg health against raiders on later nights.
- Wood and fences (Isaac): data.js SIEGE.fence {spots 12, rx 124, ry 92, hp 220, hpPerNight 0.3, wood 3, coins 10,
  reach 60, hold 0.8, woodChance 0.15, woodRaider 0.35, woodBoss 6}. siege-sim: nest.fences [{x, y, hp, max, built}]
  on an ellipse, nest.wood {id: n} (no cap); ringAt / _siegeFenceFor (attacker outside, target inside, piece standing
  in its stretch) / _siegeAtFence (bite {fence: i}) / _siegeFenceBite (siege.fenceDown) / _siegeBlock (mission-sim
  move: an attacker can't step through a standing piece; players are never blocked) / _siegeBuild ("siege.build"
  intent {i}: day, reach, wood, coins; siege.build event) / _siegeWoodDrop (_dropLoot, only with a siege nest) /
  _siegeGetWood (_updateOrbs kind "wood"). _siegeAct now gets the chase target (ax, ay). Dawn mends standing pieces.
  Snapshot nest.fences [x, y, hp, max, built], nest.wood; siege.state wood + fences. online.js: ACTS + host copies
  intent.i; guest act returns pending for siege.repair / siege.build (was a false "rejected" float). Art: make_items.py
  wood(). game.js: fenceSpotInRange / startFenceBuild / tickFenceBuild (hold E or pad Y via interactHeld; touch:
  tap and stand still) / drawFence (pegs, posts + rails, lean, stumps) / drawHoldRing / drawFenceLabel; touch act
  "Build" and "Fix egg". modes-ui: wood + fence in the chip, build / fenceDown toasts. Test: siege-fence-test (new).
  _spawnOrb's cap (180) now drops the furthest XP orb, else the furthest non-wood one (was index 0, any kind).
- Special nights, endless (Isaac: no winning, it goes until you die): data.js SIEGE.nights {from 2, every 2, order
  swarm / flyer / giant / raider, swarm {count 2.2, countPerLap 0.4, hp 0.55, spd 1.3, back 1}, giant {hp 1.6,
  hpPerLap 0.4, scale 2, guards 0.5, at 0.15}, raider {chance 0.85}} and SIEGE.endless {hp 0.15, dmg 0.06, more 0.5,
  max 24} past stages.length. siege-sim: nightKind / _siegeKind (kind + lap), _siegeType(night, flyers) (crossOf 2),
  _siegeWave applies the kind (e.swarm, e.spdMul; e.over for flyers: _siegeFenceFor / _siegeBlock skip it; raider
  chance; rng only drawn when the chance is above 0), _siegeToughen (endless), _siegeGiant (boss, e.giant scale,
  radius x scale, siege.giant; replaces the ordinary boss). siege.warn / night / state carry kind. Snapshot and
  online e[19]: giant. game.js: giant drawn x scale with "GIANT" over a wider bar. modes-ui: NIGHT_KIND names,
  tags and lines on the warn and night cards, the big text, "tonight: TAG" in the chip, siege.giant toast.
  Test: siege-nights-test (new). Balance flag: siege bosses inherit the open world's time-based boss health
  (452k on night 6 against ~740 for an attacker); worth watching in playtests. Next: maybe more to build (a tower,
  spikes), an end screen with nights / hatched / fences, then Isaac's playtest.
- Night Siege, nothing else (Isaac): _updateSiege sets noRival, noVirus, noEvents (outbreak, surge, rampage) and
  the new noWar; war-sim _updateWar (borders and skirmishes) and nemesis-sim's land-taking skip on noWar. Seasons
  (and winter ice) still turn. siege-nights-test checks 90 s of a siege night: no virus, rival, wev.* or war.flip,
  while Survival flips borders in the same time.
- Night Siege's shorter day (Isaac: 25% quicker, about 3 minutes): data.js SIEGE.dayLen 182. seasons.js useMode(mode)
  sets DAY.lengthSec and dayClock.DAY_SECONDS (siege: dayLen, else the clock's 243); called by modes-sim
  _updateModeRules each tick and by game.js at run start and in updatePlaying (guests too). rarity.js /
  net/rarity-sim.js read CLOCK.DAY_SECONDS live. Season length unchanged (486 s). Siege tests and modes-test use
  SG.dayLen; siege-nights-test checks both lengths.
- Versus, race to Mega (Isaac): data.js VERSUS race 420, bossAt [105, 210, 315], start [agumon, gabumon, veemon],
  meter 100, evoLv {Rookie 4, Champion 7, Armor 7, Ultimate 10}, meterKill 1 / Elite 3 / Boss 8, cacheMeter 6 x
  cacheMeterVal 5 ("evo" orbs, art make_items.py evo()), bossMeter [60, 60, 80], leadBy 25, leadMul 0.75.
  versus-sim: sharedXp false (bug: co-op XP sharing ran in Versus); _vsStage / _vsNeedLv / _vsProgress /
  _vsLeader / _vsMeterAdd (race only, below Mega, capped; middle cut for the leader; vs.meter event) / _vsBossHit
  (mission-sim hurtEnemy, damage after crit and element, capped at the hp left) / _vsKill (_killEnemy; boss pool
  split by e.vsDmg, vs.bossDown) / _vsRookie (a real Rookie with a next form, else start[0]) / _vsEvo (progression
  tickPlaying in Versus: hatch straight into p.vsRookie, then the standard route when meter + level; vs.evo).
  vs.state players carry meter / need / top. Join rec vsRookie (host: game.js; guests: online.js from prof.vr).
  js/vs-rookie.js (new): list (start + Rookies in evo-log forms whose standard line reaches Mega), get / set
  (localStorage dbh_vs_rookie; sends the profile card), step. evo-log noteForm; the Hatchery notes forms it grows
  (stage 2+). Lobby (online-ui): YOUR ROOKIE in place of the egg in Versus, Rookie sprites on the stand and cards.
  modes-ui: meter bar + words in the chip, vs.evo / vs.bossDown, new start card. game.js: "+N DIGIVOLVE" float.
  Test: versus-evo-test (new). Not done: in Versus a partner only takes its line's standard route (no special or
  dark routes). Measured: a partner standing still at home gets about 85 kills and Lv 8-9 in 7 minutes (so not
  Champion from kills alone); moving players do much more. Playtest the pace. Next (Isaac): Ragnarok-style damage
  numbers on every hit.
- Versus follow-ups (Isaac): Hatchery-only Rookies: hatchery.js keeps H.rookies (the form at stage 3) and exports
  rookies() (plus the current egg's route if it has reached Rookie); vs-rookie.js lists start + those (evo-log
  noteForm removed again). Gang up: versus-sim _vsPower (stage, level, hp) / _vsAim each showdown tick with 3+
  players (your click, kept as p.vsPick through a wrapped _setPvpFocus, else the strongest standing; quiet
  _setPvpFocus(pid, foe, true) so no focus event spam); picks cleared each round; vs.state players carry aim /
  pick. modes-ui vsAim() + "after X (your pick / strongest)" in the chip, showdown card text for 3+; game.js
  drawVsAim (ring + TARGET / YOUR TARGET). Tests: versus-evo-test (Hatchery list, three-way aim), hatchery-test
  (rookies kept). Checked online with three players. Mega stays at Lv 10 until Isaac has played it.
- Damage numbers (Isaac): hit-fx.js: no merging (CFG.merge gone; CFG.fan 0.12 fans same-instant hits on one
  enemy left/right and up); numbers 140 / low 48; glyphs ^ v C R I T (weak ^, resist v, crit "!" + small CRIT);
  hurt() no longer makes a number (flash and hold only); the hurt colour gone. game.js: hurt wince only for your
  own partner (e.id); no number for a PvP hit on your own partner (e.pvp). pvp-sim _pvpHit emits a hit event
  {pvp, damage, by} at the partner. mission-sim: the puddle zap emits hit events. online.js: 32 hits a snapshot
  (was 10), x/y rounded, pvp passed and mapped with wid(). hit-feel-test updated (own numbers, 100 fast hits,
  arrows, no partner number); versus-evo-test checks the PvP hit event.
- MISS (Isaac): hit-fx.js miss(e) (glyphs M, S; kind "miss"; drifts, fans out at one spot) replaces game.js's plain
  addFloat for fx k "miss" (mission-sim _roll emits one for every miss). hit-feel-test: five misses, five MISS; 20
  forced misses in the sim, 20 events.
- Siege end screen: siege-sim tally() (hatched, rebuilt, lost, built, broken, wood, bosses, giants) in sg.tally,
  sent with siege.state and siege.nestLost; modes-ui gameoverLines adds the rows. siege-fence-test checks it.
  Versus target: drawVsAim redrawn bolder (ground ring + turning brackets, arrow, boxed label); sameId() fixes
  the host being "local" in vs.state but "h" in a guest's run.others (the marker never drew for guests).
- Siege boss health, measured (Isaac: leave it high for now, measure first). scripts-free bench, /tmp/bx/ttk.js:
  a partner levelled the usual way (first skill offered, stats spread) against the night's boss, 60 s:
    night 3 boss (3.4k hp early in the night, ~27-37k later): Agumon Lv8 avg hit 12 (max 22), 15 dps: ~3.7 min.
      Greymon Lv14 avg hit 28 (max 49), 23 dps: ~2.5 min. The night lasts 66 s.
    night 6 giant (364k-579k): Greymon Lv16 avg hit 49, 31 dps: ~3.3 hours. MetalGreymon Lv24 40 dps: ~2.5 hours.
    night 9 boss (703k): MetalGreymon Lv26 44 dps: ~4.4 hours. night 12 giant (3M): WarGreymon Lv36 35 dps: ~24 h.
  Cause: siege bosses take the open world's boss health, which grows with run time (bosses.hpScalePer per
  `every` seconds) and x6 for a stage boss, on top of the siege endless climb. Awaiting Isaac's call.
- Damage progression checked (Isaac: "why isn't attack progressing?"). It does: the earlier bench never spent skill
  points (sim.skillTree was off in the harness) or status points, and took the first card. scripts/siege-boss-bench.js
  (new, not a test) builds a partner the way a player would (each stage in turn, skill points into its own main move,
  status points into INT/DEX). Focused build: night 3 Agumon job/base 12: 42 a hit (max 79), 117 DPS; night 6
  Greymon 18: 142 (max 320), 265 DPS; night 9 Greymon 24: 265, 583 DPS; night 12 MetalGreymon 30: 273 (max 638),
  6.8 hits/s, 1,854 DPS; night 18 WarGreymon 40: 2,973 DPS. Points left unspent or spread thin leave a partner
  hitting for single digits. Siege bosses still unchanged; proposal for Isaac: about 6,000 x 1.3 a night from
  night 3 (giant x1.6), ~50 s for a built partner.
- Siege bosses (Isaac): data.js SIEGE.boss {hp 6000, from 3, perNight 1.3, perPlayer 0.6}; siege-sim _siegeBossHp
  sets the night boss's and the giant's health outright (giant x nights.giant.hp + hpPerLap a lap; endless toughen
  still raises their damage). Dawn: bosses stay (siege.dawn stay [types]); modes-ui dawn card names them.
  Mega punch: moves.js D.MEGA_PUNCH 1.6; mission-sim _megaPunch (form at stage 5 and the move in its moveChain
  primary line, cached) in _fireFrom. Bench after: n3 51 s, n6 giant 80 s, n9 50 s, n12 giant 55 s, n18 giant 122 s;
  WarGreymon max 860, 4,023 DPS. Tests: siege-nights-test (boss hp, giant, stays past dawn, two tamers),
  move-feel-test (Mega punch).
- Siege co-op scaling (Isaac): data.js SIEGE.perPlayer {more 0.4, hp 0.2} (was a flat +1 attacker a tamer);
  _siegeWave: wave size, the wave's top (max / endless max) and the live cap x (1 + more x extra tamers); each
  ordinary attacker's health x (1 + hp x extra). Bosses keep boss.perPlayer 0.6. siege-nights-test: three tamers
  1.8x as many (16 vs 9) and 1.40x the health.
- Bloodlines (Isaac; no pairing, one Hatchery Digimon at a time): data.js BLOODLINE {mega 2, great 1, seconds 1200,
  nights 6, max 5, cap 16, stat 2, power 0.04, learn 0.06, skill 1, shiny 0.5, names, weights}. hatchery.js: H.blood
  {gen, traits, tree (last 40), live}; use() starts a generation (spec.blood {gen, traits}); runEnded(r) awards
  traits (pickTrait: element's favoured stat 40, its partner stat 15, power 15, learn / skill / shiny 10; max and
  cap) and adds the tree entry; traitText; the page's Bloodline box and Family tree (css/hub.css .blood-*).
  game.js: endRun calls D.hatchery.runEnded with mega / peak / seconds / nights / story (modes-ui state(run)); the
  line goes on the run-over screen (go-memory); the hatchery apply block sets p.blood (sim._bloodClean) and the
  Head Start points. mission-sim: _blood / _bloodAttr (attrParts.blood, in _jobBonus) / _bloodXp (both XP paths)
  / Power in _stats; progression: Lucky Scales in the shiny roll; status window line "from its bloodline".
  Test: bloodline-test (new). Next on Isaac's list: Expeditions, per-mode leaderboards, a straight Duel mode with
  Hatchery Digimon (no levelling, no losses).
- Duel (Isaac): data.js MODES list "duel" (group versus, online), VERSUS.duel {fallback agumon, fallbackLevel 8}.
  versus-sim: _isVs() (versus or duel) for the showdown rules; a duel skips the race (vs.start duel: 1, then
  _vsShowdownStart at once); _duelClean (a hatched form up to Champion, level, bloodline) on join rec.duel;
  _duelSetup in progression tickPlaying (quiet _applyForm kind "duel": no scene, no shiny roll; level, evoCount,
  bloodline, _duelSpend skill points, full health; duel.ready); _duelSpend (main move, melee, then autoPick; the
  boss bench uses it too). modes-sim runs duel through _updateVersus. hatchery.js duelSpec() (the stand's Digimon,
  not spent); profile card hd; online.js addGuest duel; game.js host join duel, no CPUs, and endRun pays nothing for
  a duel (no rank, memory or data). online-ui: KIND Race / Duel under Versus, the duel picker (no arrows),
  cards, fightMode() for "needs someone". modes-ui: duel card, duel.ready fallback toast, chip, end screen.
  Test: duel-test (new). Next on Isaac's list: Expeditions, per-mode leaderboards.
- Leaderboards per mode (Isaac): boards-server.js boards story (storyTime, low), siege (nights), versus (vsWins),
  duel (duelWins); the five Survival boards only take Survival-group runs; cleanRec takes nights / storyDone /
  vsWin / tag {form, gen} with plausibility checks; e.tags[board] keeps what each best (or latest win) was done
  with; me.bests has the new ones. js/boards.js: tabs Story / Night Siege / Versus / Duel, a line on what each
  counts, the tag under each name (form, "Hatchery Gen N"). game.js endRun: rec.nights / storyDone / vsWin (from
  modes-ui state, so guests too) and rec.tag; submits for every mode when it counts. css/hub.css .league-tag /
  .league-about. Test: boards-mode-test (new, drives boards-server.js). Next on Isaac's list: Expeditions.
- Expeditions (Isaac): data.js EXPEDITION {minSec 60, capMin 30, data 4, coins 3, stageMul [0.5, 0.75, 1, 1.4],
  genBonus 0.05, genMax 0.5, itemPer 0.03, itemMax 0.5, eggPer 0.012, eggMax 0.3}. hatchery.js expedition(H, r)
  (the stand's hatched Digimon, not used, not a duel: data of its element into H.data, coins, item and egg rolls,
  H.exped.last), eggLead makes newEgg pick Rare or Mythic once; page: expeditionEnd (pays coins via
  cosmetics.grantBits, an item via items.pick("cons") + give), expText, the #hatch-exped note. game.js endRun:
  the report on the run-over screen (go-data). Test: expedition-test (new). Isaac's list from this round is done
  (Bloodlines, Duel, per-mode boards, Expeditions).
- Hatchery slots + death (Isaac): BLOODLINE.slots 3, lose {Ultimate 1, Champion 3, Armor 3}; EXPEDITION.team 0.15.
  hatchery.js: H.slots [{egg, blood}], H.sel; clean() migrates and mirrors the selected slot into H.egg / H.blood;
  syncSlot after any rule that replaces them; select / inSlot; freshBlood (line numbers); runEnded finds the slot
  whose line is live and applies the death rules (r.died, r.diedStage; Mega first = valorous; loseTraits takes the
  biggest first; erased lines start fresh, the old one kept in blood.ended); expedition takes the whole team. Page:
  slot cards (#hatch-slots), every empty slot gets an egg, the bloodline note on falls, tree marks. game.js: run.hatchStage
  / hatchMega from snapshots, run.hatchFell on the first respawn, run.overReason from runOver; endRun passes died /
  diedStage (partner or party reason, or a fall) and shows erased / lost lines. Tests: bloodline-test (slots, death
  rules, judged in its own slot), expedition-test (team).
- Night Siege nest loss = a fall for a Hatchery Digimon (game.js fellNow includes runOver reason "nest"). Hatchery
  feeding readout: hatchery.js renderFed / fedRow (#hatch-fed: e.now "since it last grew", e.fed "all it has
  eaten"; bar + named list with amounts and %), css .fed-*; the stand panel scrolls when tall.
- Duels just for fun (Isaac): boards-server.js drops the duel board; a duel submit (won or lost, 5 s apart, its own
  limit) only adds to e.duelWins / duelLosses and answers { duel: { wins, losses } }; me.bests has both. boards.js:
  the Duel tab shows the record (css .league-record); placedText says it. game.js sends every finished duel.
  boards-mode-test updated.
- League glow-up (Isaac: "pretty… in your face… a lot going on"): boards.js open()/paint() rewritten as a
  full-screen .lg overlay: #lg-sky canvas (one rAF loop: twinkling stars + the podium sprites, stopped on close via
  stopAnim), CSS beams, shimmer title, MODE map (colour, motif icon, group) for emblem tabs drawn by the new
  D.iconArt.motif(cv, name, {tier, spark}); podium (2/1/3) with tag.form sprites from D.sprites.getSheet; HOW map
  for the YOU banner; Duel ring (conic-gradient); faction tug bar (FAC_COL, named pieces >= 12%). Old .league-*
  CSS removed from hub.css, replaced by .lg-*; .lg.is-still when D.reducedFx.
- Story teaches everything (Isaac): story-sim.js STEPS 11 -> 18: new stats (attr sum up), train (p.trainCount, set where
  progression emits farm.train), weak (party, per 3, p.weakHits: hurtEnemy when hitEv.m > 0 for a player's hit), warp
  (p.burstUses on a successful burst intent); the old farm step became train. who "talk" lessons (hatchery, blood,
  modes, league; sec 15-18, timed from st.t0, no story.clear, no XP, no story.state). story.step carries sec;
  modes-ui shows "Lesson n of 18" for sec ms; the goal chip is clickable (.is-click) to show Jijimon's words again.
  modes-test covers the new goals and lessons.
- Tutorial refresh: tour.js HUB (modes with endless Siege and Duel, Hatchery slots/bloodlines/expeditions, League
  boards), SETUP (rules, setup-gear, btn-setup-invite, "Two kinds of level": job K / base T), How to Play in
  index.html (Four ways to play, Two kinds of level, Damage numbers, League, Hatchery slots and bloodlines,
  Expeditions). The HUD says "Base Lv", so the text does too.
- Equipped moves (Isaac): skill-tree.js EQUIP { byStage [2,2,3,4,4,4], focus 1.75 }, slotCount(stage, extra),
  fixEquip(data, skills, prev {list, known, n}, n) -> { list, known, n, left } (successor keeps a grown/replaced
  move's place; new moves go in if there's room; free slots fill when n grows; hand-removed stay off),
  applyEquip(list, ids, id, drop, off, n) (host and guest preview). RULES.prereqLevel 3 -> 7, legacyPerLevel
  0.015 -> 0.03. autoPick(data, form, skills, slots): fill empty slots, then raise the prerequisite holding a bigger
  move back, then new moves only as successors. mission-sim _syncMoves filters by p.equip (p.equipKnown,
  p.equipN; emits skill.full), equipSlots(p) (Lab moveslot +1, capped by max), weapon.cdMax, snapshot wc/equip/
  equipN; online FAST wc in P; progression intent skill.equip {skill, drop, off}; online ACTS + guest preview.
  Guest previews for skill.add / stat.add / skill.equip now read G.slow (the fast record has no skills).
  game.js: equipMove / equipStrip / swap mode in the skills window, skill.full toast, tickMoveBar (#move-bar,
  conic sweep from --cd). LAB moveslot (1500, max 1, unit "move"), icon-art LAB.moveslot. New
  scripts/equip-test.js; signature/form-moves/kit/lab tests updated. Bench after: n3 83 dps, n6 293, n9 725,
  n12 1678, n18 3154.
- Sharp zoom (Isaac): input.js camera.stops / camera.sharp from zoomStops(k) (k = min(devicePixelRatio, 2); sharp
  zooms are n / k in [0.75, maxZoom 2], plus minZoom 0.7 as a soft wide view if none below 0.95); setPixelDensity
  (game.js resize), stepZoom (one wheel notch, trackpad deltas add up to 50), pinch snaps on release, reset picks
  the sharp stop nearest 100%; emits "zoom" -> game.js toast. Props/tamer are 1 world unit per art pixel, the
  ground 3 (sprites.js SCALE); Digimon use per-species scales (officialScale: 0.16 to 6, median 0.82), so they
  can't all be exact. PERF.q < 1 (performance mode) draws below screen resolution, and then nothing is exact.
- Multiplayer (Isaac picked spectating + shared world events). Events already existed (event-sim.js); new
  WORLD_EVENTS.together { players 2, first [300,600], every [900,1500], crew 0.2, crewMax 0.6 }: _wevTogether keeps
  a timer while 2+ tamers are in (_wevTogAt; after an event, from _wevLastEnd), unshifting onto _wevSched; the
  rare roll still applies if sooner. Crew = tamers in ev.came; xp/bits x (1 + crew bonus); wev.end carries crew.
  Spectating is client-only (the host broadcasts all enemies): game.js spec {id, on, ax}, tickSpectate (downed +
  online), specList (others up), specStep (left/right edges of inp.x, the bar's arrows), camera follows specFocus,
  #spec-bar. Parked for later (Isaac): donating data to a Digimon while spectating, to buff a teammate's partner
  or a wild one against rivals; guard against griefing (once per death, a cap, enemy boosts only where there
  are real sides).
- Farm feeding (Isaac): FARM_CFG.follow { gap 84, leash 120 } and D.farmFollow (data.js), used by farm.js (local) and
  progression._tickFarmYard (host): follows only past the leash, stops at gap; arrives gap away (farm.enter, the
  local visit). feed() and item use need nearPartner() (petRadius 58). Prompt over the partner in farm.js draw()
  (after the station prompts, same order as interact()).
- Starving fix (Isaac): mission-sim _hungerCheck(p) (starving/hungry flags + stats refresh) called from _updateCare,
  progression._eat (farm.feed), farm.tick, and the belly item. scripts/hunger-test.js.
- Sizes (Isaac): species-catalog.js STAGE_GROW { Baby I, Baby II, Rookie: 1.12 } applied in stageHeight (over
  STAGE_SIZE and SHOW_SIZE); bodyRadius follows. regen-feed-test now expects Rookies ~90% of a tamer.
- No refusing food (Isaac): progression._grudge(p, kind) replaces the refusals in field.feed and farm.feed: when
  shouldRefuseFeed says sulky/stubborn it eats anyway, refusedFoodCycles += 1 once per starveCycles (p.grudgeCycle),
  emits farm.refuse {grudge} (Picky Eater) and returns grudge: true (float "Sulking, but it ate it"). The legacy
  local paths (game.js tryFeed, farm.js without auth) no longer refuse. The T5 minRefusedFood extras still open.
- Farm panel (Isaac): index.html .farm-main (#farm-slots food tiles + #btn-farm-pet) and #farm-mood as a one-line hint;
  farm.js render() paints .farm-food tiles (paintFood, cached by sig; click picks, click again feeds), slotList is food
  only, Pet button calls pet(). Old .farm-slot / .farm-actions CSS removed (both copies and the 2x2 media block).

