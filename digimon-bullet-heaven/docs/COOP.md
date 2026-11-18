# Co-op notes (invite codes, party, brawl)

This is design + local scaffolding only. Nothing here publishes a link, opens a tunnel, or starts a real network game. See `docs/NETCODE.md` for the host-authoritative plan and `docs/PLATFORM.md` for the browser-first launch target.

Solo and local mission play now goes through an in-process `Authority` + `MissionSim` (six slots, input-only ingress, snapshots out). The host machine is not a player-save source. Nothing here is deployed.

## Invite codes

`js/session.js` keeps a message-style event layer (`session.send`, `session.on`) and a `LocalTransport` that just echoes events in-process. `session.redeemInvite(code)` is a **stub**: it returns `{ ok: false, reason: "Invite-code networking is not wired yet." }` and does not connect.

Later, a host can mint a short code and a guest can redeem it. The authority/transport split in `js/net/` is the hook for swapping in WebRTC data channels (with a TURN/relay fallback) without rewriting the brawl. Until that lands, one human on this machine is enough to play a full run.

## Dynamic party — CPU teammates are optional lone Digimon

The game is **fully playable with one human**. CPU/AI teammates are an option, not a requirement.

- Pre-run party control on the title screen: **CPU teammates: 0–5**, **default 0**.
- The choice is stored with settings through `js/storage.js` (`cpuBots`) and copied onto the run.
- Session slots are dynamic: **1..N humans + optional bots**, **hard-capped at 6 total**. There is no requirement to fill 6 slots. `BRAWL_CFG.botCount` defaults to `0`; `botCountMax` is `5`; `partyCap` / `maxPlayers` is `6`.
- **CPU teammates have no tamer.** Each CPU is a lone Digimon: no tamer sprite, no follow-the-tamer logic. In missions it moves, picks up ground heals, dodges and fights on its own AI. In brawls it is just the Digimon. Lobby, party, odds and betting cards show only the Digimon's name (no tamer portrait or tamer name). Human players keep their tamers.
- `session.addPlayer` can append a local, bot, or future remote player. A joining human can displace a bot if the lobby is already at 6. Humans who join later via invite codes are added the same way, without padding the lobby with CPUs.

## Brawl and party size

The end-of-round brawl uses the same top-down slanted bullet-heaven camera and mission terrain as the field, laid out for up to 6 fighters (larger arena and spawn ring at 5–6, camera eased toward the group).

- **Fewer than 2 fighters** (solo, no bots, no other humans): the brawl is **skipped** by default (`BRAWL_CFG.soloMode = "skip"`). A toast reports it, and the run continues (including a pending Digifarm visit).
- Set `soloMode` to `"bonus"` for a short tunable solo exhibition (`soloBonusSeconds`, default 12s) against a training dummy. That dummy is not a party teammate.
- **2 or more participants** (up to 6 in the arena): odds (multi-way percents when 3+), a single random revive if anyone is down, and dead-player betting all still apply. If at least one player is dead, revive **exactly one** random dead player; if all survive, no revive; never exceed 6 in the arena. Up to 5 dead bettors can place a pick. Hidden rarity still gives a small edge; labels stay off the player UI.
- Wins and correct bets pay persistent **DigiBits** (see the Cabinet). A short payout screen follows the result. Defeating a hidden high-tier (Legendary) form can grant a mysterious cosmetic set that is not sold in the Cabinet.
- Forced debug brawls can still pass `botCount` / `botForms` to stand in a lobby for shots and tests.

See also Phase 3 in `ROADMAP.md`.
