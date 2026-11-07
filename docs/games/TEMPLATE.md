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

## Sound

The game's own sounds (built from the shared kit, room, scale and levels; see DESIGN.md, Sound): their character, and any choice worth recording.

## Haptics

What you feel and when (on the shared levels; see DESIGN.md, Haptics), and what an iPhone feels, since it only ticks on a tap.

## Files

| Path | Purpose |
|---|---|
| `src/web/games/<game>/sounds.ts` | Its sounds, named for what they're for (add them to `GAME_SOUNDS` and `SOUNDS` in `src/web/sound/soundBook.ts`) |
| `src/web/games/<game>/haptics.ts` | Its feels, named for what they're for (add them to `HAPTICS` in `src/web/haptics/hapticBook.ts`, and a row in `soundHaptics.ts` per sound that's felt) |
| `scripts/playtest/<game>.mjs` | Playtest: its big moments end to end (add it to `GAMES` in `scripts/playtest.mjs`) |

## Ideas for later

Ideas not built yet (no progress notes: git and the dashboards show what is done and deployed).
