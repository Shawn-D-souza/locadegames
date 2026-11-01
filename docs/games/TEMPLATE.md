# Game name

Format: **tournament** or **arena**. Catalog id `game-id`, min–max players.

One or two sentences: what the game is and what makes it ours.

> This doc is the game's source of truth: rules, owner decisions, how it works, its look and its files. Platform-wide rules and the room flow are in [`CLAUDE.md`](../../CLAUDE.md); the shared visual language is in [`DESIGN.md`](../../DESIGN.md). Update this doc in the same change whenever something about the game changes.

---

## Rules

Everything a player experiences, with owner decisions marked (date them when useful) and anything decided without the owner marked as such, so it can be changed.

## Numbers

Where the gameplay numbers live (the game's `config.ts`) and the important ones.

## How it works

Simulation, server hosting, wire format, client netcode or turn handling: only what is specific to this game.

## Cost (free tier)

What a match costs (CPU, requests, bandwidth), measured.

## Look

The game's own visuals (built from the shared design language): board or arena, pieces, HUD, endings, tile art.

## Files

| Path | Purpose |
|---|---|
| `scripts/playtest/<game>.mjs` | Playtest: its big moments end to end (add it to `GAMES` in `scripts/playtest.mjs`) |

## Ideas for later

Ideas not built yet (no progress notes: git and the dashboards show what is done and deployed).
