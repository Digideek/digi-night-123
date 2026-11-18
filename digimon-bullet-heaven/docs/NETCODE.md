# Host-authoritative netcode

> Nov 14: online co-op is live through `host-game.js` (relay + static server) and `js/net/online.js`. The host browser runs the authority; friends send input and intents and receive snapshots. See `HOSTING.md`. The notes below describe the in-process authority it is built on; the "not shipped" list predates this.

Status: **local / in-process only**. Nothing here opens a socket, publishes a
link, or talks to a VPS. Solo mission play now ticks an in-process
`Authority` + `MissionSim` (the human host is just a client of that
authority). The `?net=sim` sliders and the headless tests remain available
for lossy-link checks.

## Model

Game logic is separated from transport.

- `js/net/mission-sim.js` is the DOM-free **mission world**: tamer and
  partner movement, CPU lone Digimon, enemy spawn/chase/contact, projectiles,
  loot orbs, in-run bits/XP, battle hunger drain (no combat penalty),
  **field-mega** spawns/cooldowns (`MEGA_SPAWN` firstAt / interval /
  cooldown / maxOnScreen / hpMul / dmgMul / includeMegaPlus), and
  **merchant placement + open window** (`SHOP` firstAt / every / linger).
  It is the only legal mutator of those systems during play.
- `js/net/brawl-sim.js` is the DOM-free **brawl fight**: survival, exactly
  one revive, odds/ready timers, bot AI, movement, collision, attacks,
  KO, and winner detection (last living, or highest HP with a stable id
  tie-break at the time cap). The browser draws snapshots and submits
  input / bets / ready. It does not nominate a winner.
- `js/net/progression.js` is the DOM-free **intent validator** for capture,
  hatch, evolution, level-up *offers and spends*, shop buys, farm
  enter/tick/care/training, and brawl begin/bet/ready. Clients submit a
  named intent only. Level offers are authority-rolled per-player tokens;
  a choice is accepted only once for a live token. Forged payloads
  (`force`/`roll`/`gain`/`setForm`/`syncHost`/`grantBits`/`legendaryDrop`/
  `brawl.settle` / nominated `winnerId`) are rejected. `brawl.conclude`
  over the message bus is always rejected; payouts run from
  `concludeFromSim()` after the sim has a winner. Production ignores
  client `force`/`roll`/`debug` assertions. Relaxing that requires an
  explicit constructor flag `allowDebugIntents: true` (local-dev / test
  host only). A `?debug=1` URL does **not** enable it.
- `js/net/authority.js` is a deterministic-ish **authority**: fixed 25 Hz
  tick, **6 slots**, accepts player **input** and legal progression
  intents, emits snapshots (with sequence / ack) and short events. When
  phase is `brawl`, `step()` ticks `BrawlSim` instead of the mission
  world and settles from the sim. When playing, it drives `MissionSim`
  and `Progression.afterPlayingTick` (hatch, auto-evolve, offer rolls).
  It runs in-process and headless (`node scripts/authority-headless.js`
  — that entry point does **not** listen on a port). `onMessage`
  **rejects** client-asserted damage, HP, XP, currency, form, winners,
  and `syncHost` writebacks. Account DigiBits / unlocks /
  `settledPayouts` are committed through `cosmetics.applyAuthoritative`
  into the device-local guest provider.
- The **host is just another client** of the authority. In a future WebRTC
  layout the authority peer still owns the sim; the hosting player is a
  client to it, same as everyone else.
- `js/net/transport.js` defines the transport interface:
  - `LocalTransport` / `LoopbackPair` for in-process tests
  - `SimulatedTransport` for latency, jitter, loss, and reorder
  - `WebSocketTransport` and `WebRTCTransport` **skeletons** (data-channel
    + TURN config shaped, disabled unless a private host sets `enable`).
    They do not connect in this tree.
- `js/net/client.js` does client-side prediction for the local tamer,
  reconciles against authority acks, interpolates remote entities from a
  short buffer, and resends the last N inputs.

Invite-code join stays a **stub** in `js/session.js` (`redeemInvite`).
Wiring a code to a WebRTC data channel (with TURN/relay fallback) is
planned, not shipped. See `docs/COOP.md`.

## Rural-upload tolerance (designed, locally testable)

- Predict own movement; interpolate remotes (~100 ms buffer)
- Resend last 8–16 inputs
- Delta-ready snapshot payload with tick + per-entity ack (full snapshots
  today; a later pass can omit unchanged fields)
- Loss / reorder tolerated via seq dedupe and the sim transport
- Server-side lag compensation helper on the authority

Dev simulator: add `?net=sim` to show latency / jitter / loss sliders.
`node scripts/net-sim-test.js` runs six clients at **150 ms / 10% loss**
and checks tamer poses stay in sync with the authority after a short drain.
`node scripts/mission-auth-test.js` does the same for **authority-owned
enemies, HP, pickups, and bits**, and asserts that client-asserted
damage/currency is rejected. `node scripts/progression-auth-test.js`
covers forged reward / form / training / capture rejection, valid hatch
and evolution, offer-token level-up, farm auto-return + care mistake,
brawl six-cap / exactly-one revive / betting / sim-derived winner,
brawl→farm queue, and payout idempotency across a guest-cache reload.
`node scripts/brawl-auth-test.js` checks headless brawl outcome
determinism (same seed, same winner and poses), forged winner
rejection, farm/brawl/farm sequence, field-mega / merchant window
ownership, and production ignore of client `force`/`roll`/`debug`.

## What this pass extracted

Live `updatePlaying` in the browser sends input to an in-process
authority and applies snapshots for movement, enemies, bullets, orbs,
HP, fullness (battle drain only), bits, XP, CPU mates, merchant, and
level offers. The renderer, HUD, and input stay in `js/game.js` /
`js/brawl.js` / `js/farm.js`. `syncHost` writebacks remain disabled.

Authority-owned (DOM-free; no toy duplicate systems):

- Capture, hatch, evolution application, shop buys, farm outcomes
  (including the 1320×820 yard and black perimeter track at 1.25 laps / 8s)
- Level-up **offers and application**: three tokens rolled per pending
  level on the authority; the client may spend one live token once
- Field-mega spawning and cooldowns, preserving `MEGA_SPAWN` rare-mega
  balance (firstAt 360 / interval 32 / cooldown 50 / maxOnScreen 1 /
  hpMul 8 / dmgMul 1.45 / includeMegaPlus)
- Merchant placement and open window from `SHOP` (firstAt 38 / every 85 /
  linger 32). Shop UI cannot open from a URL debug flag when an
  authority is attached
- Brawl physics, bot AI, collision, KO, survival, exactly-one revive,
  six-player cap, CPU `hasTamer: false`, betting, ready/odds timers, and
  winner detection. Payouts and Legendary entitlement (`tierOf` on
  registered forms) are idempotent by `matchId`. The host browser cannot
  name a winner; `concludeFromSim` reads the sim only
- **Rarity tick** (`js/net/rarity-sim.js`): bond, mood, ignoredSeconds,
  omen / miracle / trial windows, starve and refused-food cycles, using
  deterministic clock inputs (battle-time day cycle + host `clockHour`).
  Clients cannot spoof those fields, `setClock`, or `debugSatisfy`.
  `Date.now()` is not used on the authority path.
- **Discoveries and species unlocks** are authority events, persisted
  through the guest provider (`discoveries`, `speciesUnlocks`,
  `settledDiscoveries`) with idempotent replay.
- **Farm interval schedule**: battle-time gaps 3, then +6, then +10,
  then +4 minutes each later visit, stamped from `lastFarmAt` — not
  absolute due-stamps at t=3 / t=6 / t=10. Authority emits `farm.due` /
  `farm.warn` and may auto-enter after a short resume delay. UI requests
  `farm.enter` and displays the snapshot; it does not author `pendingFarm`.
- **Brawl due** (minLevel / everyLevels / lastBrawlLevel / skipEgg /
  party vs `soloMode`) is authored on the authority (`brawl.due`).
- **Phase resume timers**: after a sim-derived payout, result + payout
  durations elapse on the authority, which then `endBrawlPhase` and may
  start a queued farm. `brawl.dismiss` only skips remaining presentation
  after the match is already settled.
- **Solo local pause** (`Authority.setLocalPause`) is in-process
  presentation only. A `pause` message on the wire cannot freeze
  network / authority game time.
- Farm yard walking, care items (vitamin / medicine / eraser / joyToy /
  atkBoost), and refuse-feed / care-mistake resolution run on the
  authority. Hungry unfed exit is a care mistake; a refused meal is not.

`node scripts/lifecycle-auth-test.js` covers rarity spoof rejection,
deterministic clock and windows, farm interval math vs cumulative
stamps, lifecycle due under 150 ms / 10% loss, discovery/unlock replay
idempotency, the hunger care rule, and authority resume timers.

Production authority ignores client `force`/`roll`/`chance`/`free`/`debug`
assertions. `?debug=1` still shows the local debug HUD; it does not set
`allowDebugIntents`. That flag is only an explicit Authority constructor
option for a local-dev or test host.

## What is not shipped / still incomplete

- No live multiplayer, no VPS process, no TURN server, no public port,
  no deploy, no tunnel, no cloud provisioning. World rendering now uses
  native WebGL 1 on `#game` (see `docs/PLATFORM.md`); this pass still
  does not provision cloud, PWA, or public network wrappers.
- **Remaining client-side or presentation gaps** (full audit, with
  authority attached):
  - Ally follow/fire is still a simplified mission-sim stand-in;
    orbit-weapon nuance may still differ slightly from the historical
    `game.js` loop.
  - Particles, SFX, camera, HUD, and evolution cinematics (`evoTimer`)
    are presentation after authoritative events. `evoLock` (2s) and the
    cinema (2.15s) are close but not identical.
  - Title CPU-count selection (0–5, **default 0**, lone Digimon, no
    tamer) is a pre-run client option consumed at bootstrap.
  - `D.clearLevelUp` only hides local UI; it does not clear authority
    pending levels.
  - Offline / no-authority play still uses `js/rarity.js` tick,
    `tickFarmSchedule`, and local bag-item handlers. Those paths are
    skipped or routed through intents when `missionAuth` is attached.
  - A client can still *delay* sending `farm.enter` / `brawl.begin` for
    a fraction of a second; the authority will start the due
    intermission itself after the resume delay, so the client cannot
    suppress or forge the due flag.
- Storage remains the device-local **guest cache**; the cloud stub is
  not live. The provider only receives authority-validated account
  mutations (cosmetics, DigiBits, discoveries, species unlocks, settled
  payouts). The authority host's disk is not the player save source.
