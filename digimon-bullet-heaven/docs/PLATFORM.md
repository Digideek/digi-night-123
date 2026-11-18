# Launch platform

Target: **browser-first**, no install required. One hosted web build
should run on modern hardware-accelerated browsers, including Tesla's
in-car browser, plus PC and mobile. Optional later wrappers
(Windows / macOS / Linux / Android) and an installable fullscreen PWA
must use that same web build. This tree stays **private**; no public
hosting, auth, or account provisioning is authorized or implemented.

## Renderer audit (current vs target)

**Target:** the entire game in a **WebGL** browser tab, no download.
Wrappers (native shells, PWA install) are a **low priority** and must
keep using that same web build if they appear later. This pass does
**not** register a PWA, service worker, or native wrapper.

**Current:** the visible mission, farm, and brawl **world frame** is
drawn with **native WebGL 1**. The approach is a vanilla IIFE module
(`js/gl/renderer.js`) with a quad batcher, texture cache, and a
2D-like painter so existing `draw()` call sites submit **GPU quads**.
No bundler, no CDN, no Pixi/Three — this stays `file://` and localhost
compatible, with no build step. Sprites, terrain chunks, farm grass
tiles, baked farm props, and geometry (rects, ellipses, tracks, fence,
particles) are textured or solid quads in the WebGL context on
`#game`. This is **not** a full-frame Canvas 2D framebuffer uploaded
and labeled as a migration.

Canvas 2D is still used, on purpose, for:

- Offscreen asset baking (sprite sheets, world chunk caches, farm
  house/bag/board art, grass tiles, silhouette tints)
- Text glyphs and rare complex-path bakes as tight textures, never the
  whole `#game` frame
- Separate UI canvases (title / evo / shop / bag / bank / cosmetics
  portraits and icons) and HTML HUD bars/buttons

If `getContext("webgl")` fails, `#game` does **not** fall back to a 2D
context. An explicit `#webgl-unsupported` message is shown. Context
loss is handled (`webglcontextlost` / `webglcontextrestored`) with a
short restore banner and a rebuilt texture cache.

Camera stays **2D orthographic**. The slightly slanted look is still
the existing art, not a 3D camera or invented 3D assets, and not a
switch to side-view. Ink-box sprite fitting (`imageSmoothingEnabled =
false`, the same blit anchors) is preserved.

Vanilla HTML / CSS / JS, classic script tags, and `file://`
compatibility remain in force for this private copy. Sprites stay
lazy-loaded; textures are uploaded on first blit.

## Input

**Shipped today**

- Desktop: keyboard + mouse and gamepad at the same time (WASD, mouse /
  right-stick aim, E/F interact, 1–9 / wheel slots, Esc / Tab).
  **Ctrl / Cmd + wheel** zooms the 2D camera (plain wheel is still item
  slots).
- Mobile: on-screen left joystick for movement, tap cards/buttons, brawl
  Punch button. Prompts swap glyphs to the last device used.
- **Pinch to zoom** (clamped about 0.7–1.8) and **two-finger twist** to
  yaw the same top-down camera. The left move stick and one-finger aim
  drag are not stolen. `pointerWorld` inverts pan, zoom, and yaw.
  Default zoom 1 / rotation 0 matches the pre-migration view.

**Planned, not shipped**

- A fuller set of on-screen action buttons beyond the current joystick
  + contextual taps

## Packaging

- **PWA:** optional and **not registered**. There is no service worker in
  this tree, on purpose. A later host should serve a versioned manifest
  and a conservative worker that does not keep stale caches or silently
  replace a guest's local save.
- **Native wrappers:** not in this tree. If they appear later, they only
  load the same hosted web build.

## Networking vs the host-authoritative model

Browser-to-browser connections with a relay fallback should sit on the
existing net split (`docs/NETCODE.md`):

- WebRTC data channels to the **authority peer**
- TURN / relay fallback when a direct hole-punch fails
- The hosting player is still just a client of the authority
- Swapping that peer for a VPS is a transport URL/role change

Skeletons for WebRTC and WebSocket transports exist and are **disabled**.
They do not open ports. Live accounts, signaling, and TURN are not
provisioned.

## Accounts and saves

- Play works as a **local guest**. Profile, settings, discoveries, and
  DigiBits / cosmetics go through `js/storage.js` (promise-based local
  cache) and `js/storage-provider.js` (swappable provider + cloud stub).
  Local prototype storage is acceptable; cloud saves are **not urgent**.
  The provider interface stays replaceable so an authenticated
  cross-device durable account backend can plug in later, independent of
  the physical laptop or VPS that is hosting a match.
- The **authority validates progression** (in-run bits, XP, HP claims
  are not accepted from a client message; `validateProgression` is the
  hook for a claimed save patch). The host machine's disk is **not**
  the player save source.
- A later host would own version manifests, compatibility, account
  sessions, and availability. Merging a cloud pull must not silently
  discard a richer guest save (`mergeCosmetics` is the first helper).
- **No real cloud account, auth, or deploy is implemented.** No services
  are provisioned. The Cabinet and title screen say so.

## Versioning (planned)

A hosted release should publish a version manifest the client checks
before a PWA cache is used, and should refuse to boot a mismatched
build rather than quietly running stale code. Not implemented here.
