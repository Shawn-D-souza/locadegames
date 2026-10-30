# Locade Games

A platform of online multiplayer mini-games: real-time action games (2D now, maybe 3D later) and turn-based games. Web first; an Android app comes later.

> **This file is the single latest source of truth for the project.** Whenever a decision, service, plan, file or folder changes, update the relevant section here in the same change. The project owner's latest direction takes precedence over anything in this file; when they conflict, this file must be updated to match. Visual design lives in [`DESIGN.md`](DESIGN.md).

---

## Rules

1. **Free tiers only until the platform earns money.** Don't add anything that costs money.
2. **Best value long-term.** As soon as revenue covers it, move to the cheapest option per player, even if that means leaving the current platform.
3. **No peer-to-peer.** Server-authoritative multiplayer only.
4. **Online setup goes to the owner.** When something needs setting up online (accounts, dashboards, settings, deploys), give the owner clear step-by-step instructions instead of assuming it's done.
5. **Run `npm run check` once a piece of work is finished** (typecheck + lint + build in one go), not after every code change, and fix what it finds before reporting done. Don't run `typecheck`, `lint` or `build` separately.
6. **No attribution lines in commits or PRs** (owner decision): no `Co-Authored-By`, `Claude-Session` or "Generated with" lines.

---

## Domain

- **Now:** the free Cloudflare Pages subdomain (`<project>.pages.dev`).
- **Later:** buy `locadegames.com` once the platform earns enough, then point it at Cloudflare.
- **Plan for the domain (owner decision):** players only ever see the `pages.dev` address; the game server's `workers.dev` address is never shown. Once the domain is bought, the site moves onto the Worker as static assets (Cloudflare's recommendation; one deploy, one origin, free asset requests) under `locadegames.com`, and `locadegames.pages.dev` redirects every path there (`_redirects`: `/* https://locadegames.com/:splat 301`). Then also change the `og:url` / `og:image` addresses in `src/web/index.html`. The Worker already accepts requests from its own origin, so that move needs no origin settings.

---

## Tech stack (current, free)

| Area | Choice |
|---|---|
| Language | TypeScript everywhere: client, server, shared game logic |
| Game client | Best fit per game. Typically Phaser for 2D action, plain web UI (React + Vite, Tailwind CSS 4) for turn-based, Three.js or Babylon.js for 3D |
| Frontend hosting | Cloudflare Pages (static `dist/web`, no Pages Functions) |
| Game servers | Cloudflare Durable Objects (SQLite-backed, free plan), WebSocket Hibernation API |
| Matchmaking | Cloudflare Worker; private rooms routed to the creator's nearest region |
| Usage tracking | Cloudflare GraphQL Analytics API, polled by a Worker cron every 10 min; status kept in Workers KV (free) |
| Tooling | npm (single package), TypeScript 6, Vite 8, Tailwind CSS 4 (`@tailwindcss/vite`, `clsx`), Vitest, ESLint (typescript-eslint, react-hooks, better-tailwindcss), Wrangler 4, Playwright (screenshots of every screen) |
| Accounts, profiles, leaderboards | Supabase (free) |
| Android (future) | Capacitor wrapping the web game |

---

## Architecture

- **Portable game logic.** Rules, physics and the tick loop are plain TypeScript with no Cloudflare-specific code. Only a thin adapter connects them to Durable Objects, so the same logic can later run on Node.js with minimal changes.
- **Shared logic.** Game logic is shared between client and server.
- **One Durable Object per region** runs many matches (not one per match) to save free-tier compute.
- **Action games:**
  - Clients send inputs; the server simulates at ~20 ticks/sec and sends state snapshots.
  - Client-side prediction for the local player, interpolation of other players (~100 ms behind), lag compensation for hits.
- **Turn-based games:** no tick loop. The server validates moves and lets the Durable Object hibernate between turns.
- **Low traffic:** batch inputs; use small binary messages instead of JSON for action games. Turn-based games use small JSON messages.
- **Platform first, room first.** Home is only name + CREATE ROOM + JOIN WITH CODE (no game list there; it confused). A room is a session: friends gather, the **host picks a game** (others tap a game to *suggest* it; their avatars show on its tile), they play, return to the room, pick another. Games are listed in `src/shared/games/catalog.ts` (id, name, min players, turn time) with rules in `src/shared/games/registry.ts` (`MatchGame` interface in `games/types.ts`); client visuals in `src/web/games/gameLooks.ts`. Adding a game = catalog entry + `MatchGame` rules + look + board UI.
- **Private rooms only, up to 8 players** (`ROOM_CONFIG.maxPlayers`; premium may raise it to 12 later; never unlimited: cost grows with room size, one region DO, screen space). Players share the 6-digit code, shown as `482 913` (or the `?room=CODE` link). Digits only (owner decision): phones show the number keypad and codes are easy to read aloud; 6 digits (not 5) keep 100,000 codes per region so strangers can't easily guess a live room. No quick match or random matchmaking.
- **Every game is a Swiss-style tournament** (owner decision: draws are a normal result, so no knockouts, replays or thinking-time tiebreaks; pure, in `src/shared/tournament/`). Everyone plays every round; matches in a round run at the same time and whoever is free watches any live match. The tournament never decides anything by chance (owner decision; games themselves may use dice or luck):
  - Points (`TOURNAMENT_CONFIG`): win 2, draw 1, loss 0, bye 2 (sitting out counts as a win).
  - Rounds: `roundsFor(players)`: 2 players → 1 match, 3–4 → 2 rounds, 5–8 → 3 (same as a knockout would need).
  - Seeding: most session trophies, then earliest joiner. Round 1: best seed meets the weakest. Later rounds: ranked by points (then seed), each player meets the next one they haven't played (a rematch only if nothing else fits).
  - Who starts (seat 0): whoever has started fewer games, else the better ranked.
  - Round break (owner decision: everyone enters a round together and it starts at one exact moment): a round after the first gets one shared `startsAt`, `TOURNAMENT_CONFIG.roundBreakMs` (7 s) after the previous round ends. Moves before it are refused and the turn clock starts then. Phones show their own result first (4 s), then the round intro with a countdown, all keyed to that server time, so every match of the round begins at once. No server timer is needed.
  - Byes (odd players): the lowest-ranked player who hasn't had one yet.
  - Champions: most points after the last round. Players level on top points **share the title** (owner decision) and each gets a room trophy. A drawn 2-player match = both champions.
  - Turn timer: `turnTimeMs` per move (tic-tac-toe: 30 s, owner decision; the countdown shows only in the last 5 s); on expiry the game's deterministic `autoMove` is played. The server has no timers (so it can hibernate): clients in the match (or watchers if both players are away) send `timeout` claims after the deadline and the server checks its own clock.
  - Only players in the room when the host starts take part; anyone joining later watches and plays the next game.
  - Quitting (owner decision: the ✕ on the match screen or the phone's back button, after a confirm) forfeits your live match (the opponent gets the win) and takes you out of the rest of that game, but you **stay in the room** to watch and play the next one (`quit` message). Leaving the room (back on the points screen) does the same and then leaves. Either way you keep your points in the table, greyed, but are not paired again and can't be champion. Results show a champion card and the final points; the host picks PLAY AGAIN or BACK TO ROOM (everyone), and another player's back arrow takes only them to the room (owner decision: no LEAVE button on results).
- **One Worker deployment (`locade-server`).** It holds the matchmaking routes, the usage cron and the `RegionServer` Durable Object class. Folders keep them separate (`src/server/matchmaking`, `usage`, `rooms`).
- **Region in the room code.** The first digit of a code names the region (`1` wnam, `2` enam, `3` sam, `4` weur, `5` me, `6` apac, `7` oc, `8` afr). The other 5 digits are random. No duplicate codes: the region DO checks and stores a code in one synchronous step and refuses one it already has; the Worker then tries a fresh code (`claimRoomCode`, up to `maxCodeAttempts`). A joiner reaches the creator's region DO with no lookup. The region DO is `getByName("region:<hint>", { locationHint })`; the region comes from `request.cf` continent/longitude.
- **Request flow.** `POST /api/rooms` (no body, so no CORS preflight) checks capacity and creates the room over DO RPC. `GET /api/rooms/:code/ws` forwards the WebSocket upgrade to the region DO. Every action after that is one WebSocket message (DO requests bill at 20:1). Keepalive `ping`/`pong` uses `setWebSocketAutoResponse` and costs nothing.
- **Player names.** No accounts yet. On the first visit the client makes a random name ("Brave Otter", `src/web/utils/randomName.ts`) and saves it in `localStorage` once, so it never changes. It fills the name field for new players; if the field is left empty, that name is used, so nobody is blocked from playing. A typed name is remembered too.
- **Room state** is one JSON row per room in DO SQLite (players, host, phase, current tournament). Each player has an id (0–7, also their color) reclaimed after a disconnect with a per-player token kept in the tab's `sessionStorage`. If the token is gone (a sleeping phone often drops the tab's storage, or the link was reopened), joining with **the same name as an away player** takes that seat back: color, points and live match (owner decision: never a second seat for the same person; a connected player's seat is never taken). A phone waking up or coming back online reconnects at once. Room views carry `serverNow` so clients can draw turn timers. Rooms empty for more than 1 h, or older than 24 h since creation even if in use (owner decision: nobody plays 24 h straight; it also clears rooms left open in a tab), are swept lazily when rooms are created (no alarms).
- **Portable room layer.** `roomLogic.ts` holds pure reducers. `RoomService` talks only to the `RoomStore` / `RoomTransport` ports. `RegionServer` + `SqliteRoomStore` + `HibernationTransport` are the Cloudflare adapter; a Node.js host only needs new port implementations.
- **Security.** Origins are checked against `ALLOWED_ORIGINS` for both HTTP and WebSocket. The server validates every message, turn and seat, sanitizes names and caps message size.

---

## Free-tier protection

- The Workers Free plan has daily limits, and operations fail once they're exceeded. Limits reset at **00:00 UTC**:
  - 100,000 Worker requests
  - 100,000 Durable Object requests
  - 13,000 GB-s of DO duration
  - 5M SQLite rows read
  - 100,000 SQLite rows written
- A **cron trigger every 10 min** (`src/server/usage/checkUsage.ts`) queries the GraphQL Analytics API for today's account-wide totals. It runs one query per metric, so a renamed field only disables that one metric. The result goes to KV key `usage-status`.
- Room creation reads that status (cached 60 s per isolate) and **stops creating rooms at 85%** of any limit. Running rooms and rematches finish normally. If the analytics call fails, the previous status is kept; a `full` status expires on its own at `resetAt`.
- Players see a friendly **"Servers full, back at [time]"** screen (time shown in their local timezone) instead of errors. If the Worker is already over the hard limit (fetch fails with no CORS headers) and the browser is online, the client shows the same screen with the next 00:00 UTC.
- Limits and the 85% threshold live in `src/server/config.ts` (`FREE_TIER`). Secrets: `CF_API_TOKEN` (Account Analytics: Read) and `CF_ACCOUNT_ID`.

---

## Migration plan (once revenue covers it)

- **Game servers:** move from Durable Objects to Node.js WebSocket servers on Hetzner VPS. Same game logic; only the adapter changes.
- **Ops:** Coolify (free, self-hosted) for deploys from GitHub and auto-restarts. Automatic security updates on. UptimeRobot for alerts.
- **Regions:** start with one VPS near most players; add regions as players grow.
- **Stays the same:** Cloudflare Pages, matchmaking Worker, Supabase (Pro when needed), game clients.

---

## Rejected options

| Option | Why |
|---|---|
| Oracle Cloud | Bad signup experience |
| Peer-to-peer | Violates server-authoritative rule |
| Google Cloud free VM | Tiny bandwidth allowance, weak, US-only |
| AWS / GCP / Azure for game servers | Expensive outgoing data |
| Render free tier | Sleeps and drops connections |
| Quick match / random matchmaking | Owner decision: private rooms only (create → share code → join) |

---

## Code standards

- **Code map.** Keep the [Code Map](#code-map) below listing every folder and key file with its purpose, so code is found without searching. Update it whenever files are added, moved or removed.
- **Single-purpose files.** One component per file. Split by responsibility, not line count: a file doing more than one job should be split; ~400 lines is a signal to check.
- **Separation of concerns.** Screens compose; components render; hooks hold stateful logic; services talk to the outside world (network, storage); utils are pure functions. In games, simulation, networking and rendering never mix.
- **No magic values.** Colors, spacing, radii and typography come from the theme in `src/theme/` (derived from `DESIGN.md`), never hard-coded. Gameplay numbers (tick rates, speeds, sizes, limits) live in each game's config.
- **Styling: Tailwind first, CSS where it reads better** (owner decision). Components style themselves with Tailwind classes (`clsx` for conditions; no CSS Modules). Tailwind's own default theme is not loaded: `src/theme/tailwind.ts` turns our tokens into the whole theme, so only on-theme classes exist (`bg-ink`, `p-4`, `rounded-card`, `text-caption`, `min-h-tap`, `bg-player` for the player's color) and `npm run check` fails on unknown, conflicting or duplicate classes and on class order (`eslint-plugin-better-tailwindcss`; `npx eslint --fix` sorts them). Write CSS in `src/web/styles/` only where it reads better than classes: keyframes (`animations.css`, used as `animate-*`), visual recipes as `@utility` (`utilities.css`), base styles (`global.css`). Class lists kept in a constant are named `..._CLASSES`, so the lint rules check them too. No conflicting classes instead of overrides (pick one with a ternary).
- **Deterministic game logic.** Simulation is pure: state + inputs → new state, fixed timestep, seeded RNG, no I/O or timers, so client prediction and the server agree.

---

## Code Map

| Path | Purpose |
|---|---|
| `CLAUDE.md` | Project source of truth: rules, stack, architecture, standards, code map, status |
| `DESIGN.md` | Visual design language (colors, type, shapes, components, motion); source for `src/theme/` |
| `docs/SETUP.md` | Owner step-by-step: local dev, Worker + KV + secrets, Pages, auto-deploy plan |
| `package.json` | Single npm package; scripts `dev:web`, `dev:server`, `build`, `typecheck`, `lint`, `check` (typecheck + lint + build), `test`, `screenshots`, `icons`, `deploy:server` |
| `scripts/screenshots.mjs` | `npm run screenshots`: plays through every screen in headless Chromium (Playwright, with its own Vite on port 5199; needs `npm run dev:server`) and photographs each at 7 sizes into `screenshots/<size>/` plus `screenshots/index.html`; wipes the old set first |
| `scripts/icons.mjs` | `npm run icons`: renders the PNG icons, `favicon.ico` and the 1200×630 link preview `og-image.png` from `logo.svg` (Playwright, theme colors + fonts) into `src/web/public/`; rerun after changing the logo |
| `screenshots/` | Output of `npm run screenshots` (gitignored; the latest set only, for reference) |
| `wrangler.jsonc` | Worker `locade-server`: DO binding + SQLite migration, KV `USAGE`, cron `*/10 * * * *`, `ALLOWED_ORIGINS` |
| `tsconfig.json` / `.base` / `.web` / `.worker` / `.node` | Solution config; web (DOM), worker (Workers types, also covers `tests/`), node (Vite/Vitest configs) |
| `vite.config.ts` | Web build: React + Tailwind plugins, root `src/web`, output `dist/web`; dev proxy `/api` (incl. WebSocket) → `wrangler dev` so `--host` / phones work |
| `vitest.config.ts`, `eslint.config.js` | Test and lint config (lint includes the Tailwind class rules) |
| `.env.development` | `VITE_SERVER_URL` empty in dev (same origin via the Vite proxy); production value set in Pages |
| `.dev.vars.example` | Template for local Worker vars/secrets (`.dev.vars` is gitignored) |
| **`src/theme/`** | Theme tokens from `DESIGN.md`; the only source of visual values |
| `src/theme/colors.ts`, `players.ts`, `colorUtils.ts` | Brand/status colors; 12 player colors with dark/tint/wash/pattern; hex + contrast helpers (player bars pick white or ink text) |
| `src/theme/spacing.ts`, `radii.ts`, `typography.ts`, `motion.ts` | Spacing/layout + the `phone` breakpoint (`max-phone:` = small phones), radii (incl. art cells)/strokes/lips/opacity, fonts/type scale (+ fluid title size), durations/easings/transforms |
| `src/theme/tailwind.ts` | Tailwind plugin: the tokens as Tailwind's whole theme (no Tailwind defaults) + every token as a CSS variable on `:root` |
| `src/theme/cssVariables.ts`, `index.ts` | Tokens → CSS custom properties (`--color-ink`, `--duration-line-draw`, for the CSS files); barrel export |
| **`src/shared/`** | Pure TypeScript used by client and server |
| `src/shared/games/catalog.ts`, `registry.ts`, `types.ts` | Game list (`GAMES`, `GameId`, `getGame`), rules per game (`MATCH_GAMES`, `GameState`), the 1v1 `MatchGame` interface (`Seat`, outcomes, move errors) |
| `src/shared/games/tictactoe/` | `config.ts` (board size, turn time), `types.ts`, `rules.ts` (pure `createGame` / `applyMove` / win + draw), `game.ts` (`MatchGame` adapter + auto move) |
| `src/shared/protocol/` | `messages.ts` (client/server messages, `RoomView`, `PlayerView`), `parse.ts` (validation), `errors.ts` (error + close codes) |
| `src/shared/rooms/` | `config.ts` (max players, code alphabet, name length, TTLs, ping), `types.ts` (`PlayerId`), `roomCode.ts` (generate, normalize, `482 913` formatting), `playerName.ts` |
| `src/shared/tournament/` | `config.ts` (points per win / draw / bye), `types.ts` (tournament, round, match, standing), `tournament.ts` (pure Swiss: seeding, rounds, pairing without rematches, byes, moves, timeouts, forfeits, points, standings, shared champions) |
| `src/shared/time/nextUtcMidnight.ts` | Free-tier reset time and UTC date helpers |
| **`src/server/`** | Cloudflare Worker |
| `src/server/worker.ts` | Entry: origin check, routing, `scheduled()` cron; exports `RegionServer` |
| `src/server/env.ts`, `config.ts` | Env bindings type; regions/prefixes and `FREE_TIER` limits |
| `src/server/http/` | `json.ts` responses, `origins.ts` (allow list + CORS), `paths.ts` routes, `rejectSocket.ts` (close with a readable code) |
| `src/server/matchmaking/` | `routes.ts` (create room, forward WebSocket), `claimRoomCode.ts` (retry until a code is free), `region.ts` (geo → region, DO stub), `capacity.ts` (reads usage status), `randomIndex.ts` |
| `src/server/usage/` | `checkUsage.ts` (cron), `usageQueries.ts` (GraphQL per metric), `analyticsClient.ts`, `evaluateUsage.ts` (pure 85% rule), `usageStatus.ts` |
| `src/server/rooms/roomLogic.ts`, `roomRecord.ts` | Portable pure room reducers (join incl. same-name reclaim of an away seat / suggest / start (from the room or straight from the results) / move / timeout / quit / back to room / leave) and persisted record type |
| `src/server/rooms/roomService.ts`, `ports.ts` | Portable coordinator over `RoomStore` / `RoomTransport` / `PendingConnection` ports |
| `src/server/rooms/RegionServer.ts` | Durable Object adapter (one per region, many rooms, hibernation) |
| `src/server/rooms/sqliteRoomStore.ts`, `hibernationTransport.ts` | DO SQLite store; hibernatable-WebSocket transport + socket attachments |
| **`src/web/`** | React client (Vite root) |
| `src/web/index.html`, `main.tsx`, `App.tsx`, `config.ts` | Entry (icons, manifest and link-preview tags; `og:url` / `og:image` hold the full `pages.dev` address), theme vars + fonts, top-level view switch, client config |
| `src/web/public/` | Static files copied as-is to the site root: `logo.svg` (the logo, also the favicon), generated icons (`favicon.ico`, `apple-touch-icon.png`, `icon-192/512.png`, `icon-maskable-512.png`), `og-image.png` (link preview), `site.webmanifest` |
| `src/web/games/` | `gameLooks.ts` (tile art per game), `tictactoe/TicTacToeArt` (tile illustration: a small copy of the real board) |
| `src/web/screens/` | `HomeScreen` (name, create, join), `RoomScreen` (routes to hub / match / standings / champion (the hub again once you go back from the results), holding your just-finished match (or the one you watched) until its result has shown, even when the server has already started the next round or ended the tournament, quit / leave confirms + connection feedback + leave confirm), `LobbyScreen` (room hub: ROOM code + copy/share/QR, PLAYERS bars, GAMES grid; host tap starts, others suggest), `MatchScreen` (play or watch a match: two seat cards side by side, the lit one is whose turn / the winner, `DRAW!` after a draw, then the board; each phone gets its own ending, on the board so nothing moves, in the "All in" style (thump + freeze, win line with sparks, board fills with the winner's color, sun rays, canvas confetti, star ring, marks jumping, piece reactions, result tag with points ticking up; loser: droop + YOU LOST; draw: shrug + DRAW!), then it moves on by itself after 4 s or a tap; watchers of a live match get back + settings on top, a WATCHING LIVE badge above the cards and BACK TO SCORES), `StandingsScreen` (between matches, like the room hub: `ROUND n OF m` header, POINTS card, PLAYING NOW card with the round's matches and who sits out), `RoundIntroScreen` (break before rounds 2+: round title, you VS them or sitting out, centered countdown to the shared start, POINTS card), `ChampionScreen` (results: champion card, final POINTS, confetti; host's PLAY AGAIN / BACK TO ROOM; others' back arrow = just them back to the room), `JoiningScreen` (JOINING ROOM card with the code and hopping dots while the room connects), `ServersFullScreen` (`SERVERS FULL!` card, back-at time), `ErrorScreen` (`OOPS!!` card with the message) |
| `src/web/components/` | `PillButton` (primary coral, deep ink, share green), `IconButton`, `GameTile` (fixed square: art, name, voter avatars on the corner, NEEDS tab), `Icon` (app icon names → Lucide icons), `Header` (back, title (optional), settings gear), `ScreenLayout`, `TextField`, `NameField` (your name + `(YOU)` + pencil, tap to edit), `Divider` (dashed rule with `OR`), `SectionCard` (card with its label on the top edge), `TabCard` (card with its headline as an ink tab on the top edge: champion, error, servers full), `RoomCode` (the big code in its box), `LoadingDots` (three hopping dots), `PlayerBar` (room player row in their color with YOU / HOST / AWAY / trophy badges), `ChampionCard` (results hero on a `TabCard`: one champion in their color with a crowned avatar, or a crowned bar per champion for a shared title), `Badge` (small outlined pill: YOU, HOST, LIVE, WATCHING LIVE, DRAW, VS), `SeatCard` (one side of a match: X or O, name, YOU tab, last-5-s countdown (no timer row on the round intro); lit on their turn or as winner; crown + grow on a win, sad shake + fade on a loss), `QrCode` (SVG via `qrcode-generator`), `SettingsModal` (placeholder: music, sound effects, haptics coming soon), `Avatar`, `RoomCodePanel`, `Board` (fills with the winner's color after a win, shakes on a draw, holds the result tag), `ResultTag` (how the match ended for you, on the board's bottom edge, with tournament points), `BoardCell` (winning cells white, marks grow + glow on the winner's phone, other cells fade), `WinLine` (line drawn through the winning row), `Mark`, `Confetti` (falls from the top on the champion screen; champions' colors, no randomness), `WinParticles` (the winner's sparks, stars and confetti, positioned from the board on screen), `MatchCard` (one match of the round: winner ticked, QUIT, DRAW; live ones have a LIVE badge and a lip and open on tap), `ByeCard` (who sits the round out, dashed), `StandingsTable` (points: a bar per player in their color with place, name, YOU, points), `SunRays` (turning rays behind a winning board and the cards), `Particles` (canvas: fluttering confetti, sparks, stars), `Toast`, `Modal` (all styled with Tailwind classes) |
| `src/web/hooks/` | `useRoomConnection` (socket lifecycle, reconnect, reconnect on wake / online), `connectionState` (pure reducer, clock offset), `useTimeoutClaims` (asks the server to play expired turns), `useBackButtonGuard` (back button asks before quitting a live match), `useAutoContinue` (a finished match moves on by itself), `useBefore` (true until a time, keyed so clock jitter never restarts it; the round intro), `useCountUp` (points ticking up), `useNow`, `usePlayerName` (typed name + first-visit random name) |
| `src/web/services/` | `api.ts` (create room), `roomSocket.ts` (WebSocket wrapper + ping), `sessionStore.ts` (name, first-visit random name, seat tokens) |
| `src/web/utils/` | `formatResetTime`, `roomUrl` (share link / `?room=`), `playerStyle` (player color CSS vars), `randomName` (first-visit names), `tournamentText` (names, `ROUND 2 OF 3`, joining names for shared titles), `messages` (UI copy for errors), `particles` (pure particle physics + spawns), `seededRandom`, `celebrationTiming` (when the win line and the celebration start; matches the CSS variables) |
| `src/web/preview/` | **Dev-only** tool page at `?preview=celebrations` (dropped from production builds): `CelebrationPreview` (style / outcome / color controls, replay), `CelebrationStage` (a finished match on the real components), `celebrationStyles.ts` (A arcade, B punchy, C all in: the one in the game) |
| `src/web/styles/` | `global.css` (entry: Tailwind preflight + utilities, our theme plugin, base styles, `--line-at` / `--celebrate-at`: when a match's win line and celebration start), `animations.css` (every keyframe + its `animate-*` class), `utilities.css` (`@utility` recipes: `sun-rays`, `text-lip-*`, `text-title-fit`) |
| `tests/` | Vitest: rules, protocol, random names, room codes/regions/origins/names, tournament (rounds, seeding, Swiss pairing, who starts, byes, draws and shared titles, timeouts, forfeits), `RoomService` (in-memory ports in `tests/support/`), usage math, theme contrast |

## Status

_Last updated: 2026-10-30_

### Services

| Service | Used for | Plan | Status | Usage vs limits |
|---|---|---|---|---|
| Cloudflare Pages | Frontend hosting (`locadegames.pages.dev`) | Free | Live at `https://locadegames.pages.dev`; deploys on every push to `main` (GitHub connected) | — (free plan: 500 builds/month) |
| Cloudflare Workers | `locade-server`: matchmaking + usage cron | Free | Live at `https://locade-server.bringuonline.workers.dev` (on the owner's existing account subdomain; players never see it); Workers Builds deploys on every push to `main`, preview builds off | — (free plan: 100,000 requests/day; resets 00:00 UTC) |
| Cloudflare Durable Objects | `RegionServer`, one per region, SQLite-backed | Free | Live | — (free plan: 100,000 requests/day, 13,000 GB-s/day, 5M rows read/day, 100k rows written/day, 5 GB storage) |
| Workers KV | `USAGE` namespace: free-tier status | Free | Created (id in `wrangler.jsonc`) | — (free plan: 100,000 reads/day, 1,000 writes/day; cron uses ≤144 writes/day) |
| Cloudflare GraphQL Analytics API | Daily usage measurement | Free | Token `locade-usage-read` (Account Analytics: Read) stored as Worker secrets `CF_API_TOKEN` + `CF_ACCOUNT_ID` | — |
| Supabase | Accounts, profiles, leaderboards | Free | Not set up (not used yet) | — (free plan: 500 MB database, 50,000 monthly active users; projects pause after ~1 week of inactivity) |
| Domain | `locadegames.com` | — | Not bought (using `pages.dev`) | — |
| GitHub | Source code | Free | Local git repo; not pushed yet | — |

Free-plan limits above are approximate; confirm in each dashboard and record actual usage here once services are live.

### What exists

- Platform skeleton: home (create / join) → room hub (up to 8 players, host picks a game, others suggest) → Swiss-style tournament (everyone plays every round, points for win / draw / bye, parallel matches, 30 s turn timer, draws allowed and shared titles, spectating) → champion card + final points → play again or back to the room. Tic-tac-toe is the only game so far. Reconnect by token; leaving forfeits.
- New look (DESIGN.md): deep indigo ink `#312C85` on a pale dot grid, one coral action button, thin outlines, Roboto Condensed logo + Roboto Mono text. Home, the room hub, the tic-tac-toe match screen, the points screen, the round intro, the results screen, watching a match, the error, servers full and joining screens are redone, the first two to the owner's mockups (QR in a popup; host taps a game to start it directly, owner decision; settings gear is a placeholder). The match screen is kept calm (owner decision): no header, banner or timer bar; the countdown shows only in the last 5 s; the background is a light wash of the mover's color instead of the dot grid. Wins, draws and the champion reveal have short one-time animations (win line, bounce, shake, champion card, confetti). Every screen is now redone except the settings popup (a placeholder until music, sound and haptics exist). The word is **room**, not lobby (owner decision).
- Styling moved from CSS Modules to Tailwind CSS 4 on our own theme (same look). Every screen is photographed at 7 sizes (320px phone to desktop, plus sideways) with `npm run screenshots`; not yet checked on a real phone.
- Logo (owner's pick, 2026-10-30): an X, an O, a pawn and a die in player colors with the ink lip ("lots of small games with friends"; a controller with signal arcs was dropped as too AirConsole-like). Used as favicon, home-screen icons and the link preview.
- Free-tier protection: cron + KV status + "Servers full" screen.
- Verified locally with `wrangler dev`: room-full rejection, ping auto-response, reconnect by token, cron path, `SERVERS_FULL` gate; 3-player tournament end to end under the old knockout rules (early timeout claim refused, auto move, champion + trophy, back to room); the Swiss rules are covered by unit tests only so far. Unit tests pass. The new screens have not been checked on a real phone yet.
- Live (2026-10-30): the owner played a game on two phones on `locadegames.pages.dev`. The first cron run on the real account wrote `usage-status` with all five metrics and none failed, so the analytics field names work (Durable Object numbers still showed 0 minutes after the first games; Cloudflare's analytics lag a few minutes, so watch them fill in).

### What runs where

- Website: Cloudflare Pages, `https://locadegames.pages.dev` (built with `VITE_SERVER_URL=https://locade-server.bringuonline.workers.dev`).
- Game server: Worker `locade-server` at `https://locade-server.bringuonline.workers.dev` (Durable Objects, KV `USAGE`, cron every 10 min).
- Both deploy themselves on every push to `main`. Online for private testing only; no public launch until there are more games (owner decision).

### Next to migrate (once revenue covers it)

1. Buy `locadegames.com` and point it at Cloudflare.
2. Game servers: Durable Objects → Node.js on Hetzner VPS (with Coolify + UptimeRobot).
3. Supabase Free → Pro when limits are reached.
