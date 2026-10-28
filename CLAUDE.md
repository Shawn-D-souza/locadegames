# Locade Games

A platform of online multiplayer mini-games: real-time action games (2D now, maybe 3D later) and turn-based games. Web first; an Android app comes later.

> **This file is the single latest source of truth for the project.** Whenever a decision, service, plan, file or folder changes, update the relevant section here in the same change. The project owner's latest direction takes precedence over anything in this file; when they conflict, this file must be updated to match. Visual design lives in [`DESIGN.md`](DESIGN.md).

---

## Rules

1. **Free tiers only until the platform earns money.** Don't add anything that costs money.
2. **Best value long-term.** As soon as revenue covers it, move to the cheapest option per player, even if that means leaving the current platform.
3. **No peer-to-peer.** Server-authoritative multiplayer only.
4. **Online setup goes to the owner.** When something needs setting up online (accounts, dashboards, settings, deploys), give the owner clear step-by-step instructions instead of assuming it's done.
5. **The owner runs lint, typecheck and build commands.** Don't run them; say which ones to run.

---

## Domain

- **Now:** the free Cloudflare Pages subdomain (`<project>.pages.dev`).
- **Later:** buy `locadegames.com` once the platform earns enough, then point it at Cloudflare.

---

## Tech stack (current, free)

| Area | Choice |
|---|---|
| Language | TypeScript everywhere: client, server, shared game logic |
| Game client | Best fit per game. Typically Phaser for 2D action, plain web UI (e.g. React) for turn-based, Three.js or Babylon.js for 3D |
| Frontend hosting | Cloudflare Pages |
| Game servers | Cloudflare Durable Objects (SQLite-backed, free plan) |
| Matchmaking | Cloudflare Worker; routes players to the nearest region |
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
- **Low traffic:** batch inputs; use small binary messages instead of JSON for action games.

---

## Free-tier protection

- The Workers/Durable Objects free plan has daily limits (~100,000 requests/day plus compute); operations fail once exceeded. Limits reset at **00:00 UTC**.
- The matchmaking Worker tracks usage and **stops starting new matches at ~85%** of the limit. Running matches finish normally.
- Players see a friendly **"Servers full, back at [time]"** screen (time shown in their local timezone) instead of errors.

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

---

## Code standards

- **Code map.** Keep the [Code Map](#code-map) below listing every folder and key file with its purpose, so code is found without searching. Update it whenever files are added, moved or removed.
- **Single-purpose files.** One component per file. Split by responsibility, not line count: a file doing more than one job should be split; ~400 lines is a signal to check.
- **Separation of concerns.** Screens compose; components render; hooks hold stateful logic; services talk to the outside world (network, storage); utils are pure functions. In games, simulation, networking and rendering never mix.
- **No magic values.** Colors, spacing, radii and typography come from the theme in `src/theme/` (derived from `DESIGN.md`), never hard-coded. Gameplay numbers (tick rates, speeds, sizes, limits) live in each game's config.
- **Deterministic game logic.** Simulation is pure: state + inputs → new state, fixed timestep, seeded RNG, no I/O or timers, so client prediction and the server agree.

---

## Code Map

| Path | Purpose |
|---|---|
| `CLAUDE.md` | Project source of truth: rules, stack, architecture, standards, code map, status |
| `DESIGN.md` | Visual design language (colors, type, shapes, components, motion); source for `src/theme/` |

_Not yet created:_ `src/theme/` (theme tokens derived from `DESIGN.md`). No code exists yet.

---

## Status

_Last updated: 2026-10-28_

### Services

| Service | Used for | Plan | Status | Usage vs limits |
|---|---|---|---|---|
| Cloudflare Pages | Frontend hosting (`*.pages.dev`) | Free | Not set up | — (free plan: 500 builds/month) |
| Cloudflare Workers | Matchmaking Worker | Free | Not set up | — (free plan: ~100,000 requests/day, shared with Durable Objects; resets 00:00 UTC) |
| Cloudflare Durable Objects | Game servers (one per region, SQLite-backed) | Free | Not set up | — (free plan: daily request + compute duration limits; 5 GB SQLite storage) |
| Supabase | Accounts, profiles, leaderboards | Free | Not set up | — (free plan: 500 MB database, 50,000 monthly active users; projects pause after ~1 week of inactivity) |
| Domain | `locadegames.com` | — | Not bought (using `pages.dev`) | — |
| GitHub | Source code | — | Repo not created yet (not a git repo) | — |

Free-plan limits above are approximate; confirm in each dashboard and record actual usage here once services are live.

### What runs where

Nothing is deployed yet.

### Next to migrate (once revenue covers it)

1. Buy `locadegames.com` and point it at Cloudflare.
2. Game servers: Durable Objects → Node.js on Hetzner VPS (with Coolify + UptimeRobot).
3. Supabase Free → Pro when limits are reached.
