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
