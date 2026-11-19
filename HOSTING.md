# Putting Digi Night on the web (always on, about $5 a month)

This puts the game at a web address that is always up. You and your friends open the
link in any browser; nobody runs anything at home. The zip is already set up for it.

**Host: Railway, Hobby plan.** $5 a month, which includes $5 of usage. This server
only hands out the game's files and passes messages between players, so it should
stay inside that. (Render's $7 Starter plan works the same way if you would rather
have a fixed price with no meter.)

You do this once. It takes about 20 minutes.

1. **Make a GitHub account** at https://github.com (free). GitHub holds the files; Railway reads them from there.
2. **Install GitHub Desktop** from https://desktop.github.com and sign in with that account.
3. **Unzip** the game somewhere it can stay, for example `Documents\digi-night`. You should see
   `host-game.js`, `package.json` and the `digimon-bullet-heaven` folder side by side.
4. In GitHub Desktop: **File > Add local repository**, pick that folder, and when it says it is not a
   repository yet, click **create a repository**. Leave the settings as they are and click **Create repository**.
5. Click **Publish repository**. Keep **"Keep this code private" ticked**. Click **Publish**.
6. **Make a Railway account** at https://railway.com: choose **Login with GitHub**. Pick the **Hobby** plan and add a card.
7. In Railway: **New Project > Deploy from GitHub repo**. The first time, it asks to connect GitHub:
   allow it for the `digi-night` repository. Then pick that repository. Railway builds and starts it on
   its own (it runs `npm start`); wait for the green **Active**.
8. Click the service box, open **Settings > Networking**, and click **Generate Domain**. If it asks for a
   port, use the one it suggests. You get an address like `digi-night-production.up.railway.app`.
9. **Open that address.** That is your game. Bookmark it and send it to friends.

**Playing together:** on the site choose **Online > Host a game**; the lobby gives an invite link that
already uses the web address. Friends open it, pick a tamer and egg, and join.

**Updating the game later:** unzip the new build over the same folder (replace everything), open
GitHub Desktop, type a few words in the Summary box, click **Commit to main**, then **Push origin**.
Railway picks it up and redeploys in a minute or two.

## Accounts: a username and password for every player

On the web address, the game now asks everyone to **log in or create an account** first, and each
account's save is kept on the server, so it is the same on any computer.

**Do this once, or every update will erase the accounts.** Railway throws away a service's files each
time it redeploys unless they are on a Volume:

1. Open your project in Railway. **Right-click the empty canvas** (or press Ctrl+K and type "volume") and choose **Volume**.
2. When it asks which service, pick your `digi-night` service.
3. For the **mount path** type `/data` and confirm.
4. Railway redeploys by itself. That is all: the game finds the Volume on its own.

Until that is done the login screen says, in orange, that the server has no storage attached.

- Usernames are 3 to 14 letters, numbers, spaces, `-` or `_`. Passwords are 6 characters or more.
- **There is no "forgot my password".** No email is collected, so a lost password cannot be recovered.
- Passwords are stored only as a scrambled hash; nobody, including you, can read them.
- Log out is in your profile (click your name on the title screen).
- A new account takes whatever progress is already in that browser, so nobody loses a profile they made before accounts existed.
- Playing the same account on two computers at once: the second one to save wins, and the other is told to reload.
- `start-online.bat` at home does **not** ask for accounts. To try them at home: `node host-game.js --accounts`.

Things to know:

- **Saves:** on the web address they belong to the account (see above). Opened from your own computer
  without accounts, they live in that browser as before.
- **Keep the repository private.** The game is an unofficial fan project using Digimon art; share the
  link with friends rather than publishing the files.
- Anyone who has the link can play. The host does not turn off when you close your browser.
- To stop paying: delete the project in Railway, or cancel the plan.
- `start-online.bat` still works exactly as before for playing from your own computer.

---

# Playing online from your own computer

Your computer hosts the game. Friends open a link in their browser — phone or
computer, nothing to download.

## 1. Start the server

You need Node.js once (free, https://nodejs.org — the "LTS" installer).

- **Windows:** double-click `start-online.bat`
- **Mac:** double-click `start-online.command` (first time: right-click → Open)
- **Anything:** `node host-game.js --tunnel`

A window opens and shows the addresses; your browser opens the game. Keep the
window open while you play.

## 2. Make a room

In the game: **Host Online** → pick your tamer and egg → the lobby shows a
room code and an **invite link**. Copy it and send it. Friends who open it type
a name, pick a tamer and egg, and land in your lobby. Press **Start Game** when
you like; anyone who arrives later drops into the running game.

## 3. Friends outside your home

The lobby tells you what the link can reach:

- **Home network only** — works for people on your Wi-Fi.
- **Works anywhere** — the link uses a public address.

Two ways to get a public address:

**A. Cloudflare quick tunnel (easiest, no account).** Install `cloudflared`
(https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/),
or drop `cloudflared.exe` next to `host-game.js`. The start file then creates a
tunnel on its own and the lobby link switches to a `…trycloudflare.com`
address. The address changes every time you start it. If you already use
ngrok (`ngrok http 8080`), that address is picked up automatically too.

**B. Port forwarding.** In your router, forward TCP port 8080 to this
computer, then paste `http://YOUR-PUBLIC-IP:8080` into "Public address" in the
lobby (or start with `node host-game.js --public http://YOUR-PUBLIC-IP:8080`).

## How online play works

- Up to 6 players. Everyone has their own tamer, egg and partner.
- XP gems count for every tamer. More tamers means more enemies.
- The fight does not stop for level-ups or the pause menu. You are safe from
  damage while you pick an upgrade.
- The Digi Farm is a shared break: the fight stops, everyone tends their own
  farm on their own screen, and it resumes when everyone is back.
- Tamers cannot be hurt. Your partner is what the enemies go for. A partner
  at 0 HP is down, not out: a teammate stands next to it and holds E (or the
  Revive button) for 3 seconds. Downed partners also get back up after a farm
  visit. The run ends when every partner is down.
- If a friend's connection drops or they reload, their partner waits about a
  minute; opening the invite link again puts them back in.
- The survivor brawl runs online too: when the host's partner levels up, every
  partner still standing goes into the ring. Players whose partner is down bet on
  the winner, and one of them is picked at random to be revived into the
  fight (and stands back up in the field afterwards). Winnings go into each
  player's own DigiBits.
- The host's browser tab runs the game. If the host closes it, the game ends.

Options: `--port 8081`, `--public <address>`, `--tunnel`, `--no-open`.
