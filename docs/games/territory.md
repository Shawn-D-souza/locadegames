# Territory

Format: **arena** (one real-time match for the whole room). Catalog id `territory`, 2–8 players.

An original territory-capture game in the style of Paper.io 2 (our own look and rules, not a copy). Leave your land, draw a trail, come home: the trail and everything it closed off become your land.

> This doc is Territory's source of truth: rules, owner decisions, how it works, its look and its files. Platform-wide rules, the arena format and the room flow are in [`CLAUDE.md`](../../CLAUDE.md); the shared visual language is in [`DESIGN.md`](../../DESIGN.md). Update this doc in the same change whenever something about Territory changes.

---

## Rules (owner decisions, 2026-10-31)

- **Match:** everyone in the room plays one match together. 3 s countdown; at most 3 minutes; ends early when one player (or none) is left.
- **Arena:** round. Its radius grows with √players (`arenaBaseRadius + arenaRadiusPerSqrtPlayer · √n`). Everyone starts on a small disc of land on a ring around the middle, heading along the ring.
- **Steering:** 360°. Drag anywhere on the screen: an invisible floating joystick (nothing drawn, owner decision 2026-11-01); the head turns toward the drag direction at a fast but limited rate ("quick arcs"). Arrows / WASD on desktop.
- **Capturing:** outside your land you leave a trail. Get back home and the trail (its full width) plus every area it closed off becomes your land, taken from anyone who had it. Areas closed off against the wall count too, except the biggest one (that is the rest of the arena).
- **Exact land (hard requirement):** captured land is exactly the shape drawn: sharp turns stay sharp, curves stay curves, no grid and no smoothing after capture. The trail starts exactly at the edge of your land; neighbours' land meets with no gaps or seams; captures along the wall reach the wall.
- **Out:** someone's head touching your trail cuts you (crossing your own trail is allowed). Losing all your land, or quitting, also puts you out. **No respawns:** you watch the rest.
- **Land cut in two (owner decision, 2026-11-01):** when someone's capture cuts a piece of your land into parts, you keep only the part you're standing on; the other parts **vanish** (nobody gets them, so the leader can't snowball by slicing small players). Out on a trail, you keep the part your trail left from (or the nearest part to it). Chosen for fun: a leader can't safely sit inside their land until time runs out, comebacks stay possible, and slicing is a gamble because the slicer's trail runs through land where the owner moves freely. Land that was already separate (won by cutting someone) stays yours; a separate piece you're not on keeps its biggest part if it gets cut.
- **Trapping:** a loop that takes **all** of someone's land knocks them out, credited to the player who took it ("Ana took all your land."). Trapping only their head (they're out on a trail) is not a kill. **Slivers count as nothing (2026-11-01):** a leftover strip thinner than `minLandThickness` (0.4 trail widths) vanishes, so taking someone's land but for an invisible edge knocks them out.
- **Full lap (owner decision, 2026-11-01):** going all the way round the arena along the wall and home captures everything inside, which is everyone's land: an instant win (~44 s alone with 2 players, ~65 s with 8). Kept as a legendary high-risk play: everyone is inside the loop, so anyone can cut it. (Trails are no longer on the minimap, owner decision 2026-11-01, so a lap is harder to see coming; watch for this in playtests.) If playtests show laps win too often, the fallback is: an area with a living opponent's head inside is not captured.
- **Land of a player who goes out:** goes to the player who cut them (as in Paper.io). If they went out any other way, it vanishes. A quitter's land vanishes (my call; owner may change).
- **Heads are solid:** they never overlap. Meeting head-on, both stop and nobody is out; steering away frees them; a glancing touch slides past. The collision disc is as wide as the drawn head, so heads stop when they touch, like at the wall.
- **Wall:** heads slide along it.
- **Away players** (locked phone, lost connection) keep going straight (sliding along the wall). No timeout.
- **Cut timing:** favour the victim. The server judges at its own moment, with no rewind (no lag compensation). Within one step, captures are processed before cuts.
- **Ranking:** players still in, by land share; then players who are out, by how long they lasted. Ties share a place; everyone in first place is a champion (shared win) and gets a room trophy.
- **Server restart mid-match:** the match is lost and the room goes back to its hub (my call).

Split detail (`keepConnected` in `capture.ts`): parts are matched to the piece they came from; "where you stand" is your head, or your trail's start while you're out; a point within `anchorSlack` of a piece counts as on it. A part is a sliver when shrinking it by half of `minLandThickness` leaves nothing; slivers are dropped first.

Cut detail: you are cut when another head's center gets within half a trail width of your trail (`cutReach`), except your trail's last `headGraceLength` (right behind your own head). When several heads cross a trail in one step, the closest cuts it (then the lowest id). If the cutter is also out that step, the land goes to the first player still in along the chain of cutters.

## Numbers (`src/shared/games/territory/config.ts`)

Integer world units; the trail is 1000 wide. 20 steps/s. Speed 320 per step (6.4 trail widths/s). Headings in 4096 steps; turning at most 280 per step (~490°/s). Head collision radius 600. Arena radius 20,000 + 15,000·√players (360-gon). Start land: radius 3000 (48-gon) on a ring at 0.55 of the radius.

---

## How it works

- **Land model:** exact polygons in integer world units, with [Clipper2](https://github.com/AngusJohnson/Clipper2) (`clipper2-ts`). A capture is: union(land, the trail stroked to its full width with round joins and ends, plus a "skirt" beyond the wall wherever the trail runs along it) ∩ arena, then every newly enclosed open area is filled. Open areas come from a polytree of arena − land; new ones are matched to old ones by exact area + bounds; wall-touching ones are found with a thin band inside the wall.
- **Movement:** deterministic integer math (precomputed step vectors per heading), clamped inside the wall, so the client's prediction lands on the same units as the server.
- **Server:** the region Durable Object runs the match in memory, stepping on a 25 ms `setInterval` (only while a match runs, so the DO hibernates otherwise). After a stall it skips time instead of fast-forwarding. Inputs carry the step they apply on; the server queues them (clamped to a lead limit) and counts late ones.
- **Wire (binary, `wire.ts`):** a snapshot per step (every head: position, heading, target, last applied input, late count; plus events: trail start, capture with the new land polygons of everyone affected, out). A full sync on join, reconnect or a client's `sync` request. Pong carries client time, server time and the time of step 0. Client → server: input (seq, step, target, only when the steering changes, at most one per step, quantized), ping, sync. Points are zigzag-varint deltas.
- **Client netcode (`src/web/games/territory/engine/`):**
  - Server clock from the fastest round trips among recent pings, slewed gently.
  - Others drawn ~100 ms+ in the past, interpolated; the delay adapts to how late snapshots arrive; up to 3 steps of extrapolation after a hiccup.
  - **Your own head is predicted ahead** by rtt/2 + 2·jitter + 20 ms (+ a boost while the server reports late inputs). Inputs are stamped with the predicted step, so the server applies them on the same step. The prediction is recomputed every frame from the server's latest state plus unacknowledged inputs; changes are eased out (60 ms half-life).
  - Other heads block yours in the prediction with the server's own code (they keep steering toward their last known target, as the server does). On screen your head is also kept out of others' drawn heads, since they are drawn in the past.
  - Your own captures are predicted with the server's capture code and swapped for the server's when it arrives (they are identical; a test checks it). Your land is drawn in two layers so land you just lost stays until the other player's capture is drawn.
  - Your own events, and knockouts you caused, show at once; the rest when their step is drawn.
  - A gap in steps or a woken tab asks for a full sync.
- **Measured:** full flow at 60 fps in headless Chromium; 0 own-head corrections under a simulated 60 ± 25 ms one-way delay; heads never closer than touching in a live head-on test.

## Cost (free tier)

The DO stays awake while a match runs, and every input message is a DO request. Measured: an 8-player, 3-minute match uses about 3 s of CPU in total (0.8 ms per step on average, worst 42 ms); snapshots average ~335 B (~6.7 KB/s per player). Watch the DO request and GB-s numbers once people play it.

---

## Look

Full screen, drawn on a canvas (Canvas 2D), every color from the theme. No header; the HUD floats on top of the arena.

- **Arena:** a round white plate with the dot grid, a thick ink wall with a lip; beyond the wall is plain `line` lavender. The camera follows your own head (about 18 trail widths across the short side); watchers, and you once you're out, see the whole arena.
- **Land:** each player's land is a flat shape in their color, **raised** on a solid lip in its dark shade (like the buttons), exactly the shape that was drawn. Neighbours' land meets with no seam (a hairline same-color stroke hides anti-aliasing seams). New land flashes white and fades (450 ms). Land cut off from its owner sinks and fades away (700 ms).
- **Trenches (owner idea, 2026-11-01):** a trail crossing someone's raised land runs at floor level in a trench cut through it: the land's dark side shows along the trench's far edge. Drawn by putting trails under the land and cutting each trail out of the land's lips and tops on a scratch layer (only when a trail actually crosses someone's land). The cut is 1.5 device px narrower on each side than the trail, so the land overlaps the trail's edge and no white anti-aliasing line shows between them.
- **Trail:** a clean band in a lighter tint of the player's color, edged in the full color, starting exactly at the edge of their land, with round joins.
- **Head:** a rounded block in the player's color with an ink outline and lip, two white eyes looking where it goes. Other players have a small white name tag outlined in their color above their head. A player who goes out bursts into pieces of their color.
- **HUD:** top left: ✕ (quit, asks "Quit this game?" first) and the clock in a white pill, which turns coral in the last 10 s. Top right: the land table, a small bar per player in their color (place, name, land share), best first, your own row with a lip and always shown. Under the clock: knockout notices ("Ana cut Ben", "You took Ben's land", "Ben quit"), at most 3, each for 3 s. Bottom left: the minimap (the arena and every land, redrawn 5 times a second; no trails, owner decision 2026-11-01), with every player drawn on it every frame as a tiny copy of their head (rounded block, ink outline and lip, turned the way they go; yours bigger and on top), so they glide instead of flickering.
- **Countdown:** a big numeral on a white disc with a lip in the upper half, so your head stays in view; the land table waits until play starts.
- **Knockouts (2026-11-01):** a player who goes out bursts into pieces. Your own knockout of someone stamps `CUT BEN!` (or `TOOK BEN'S LAND!`) in your color over the arena with a ring of stars, and the view gives a light shake; going out yourself gives a hard shake.
- **Out:** a `TabCard` at the bottom: `YOU'RE OUT!` ("Cut by Ana." / "Ana took all your land." / "Your land is gone." / "You quit this match.") for 4 s, then a `WATCHING` badge at the bottom (`WATCHING LIVE` for room members who joined late).
- **Ending (owner: "do a good winning animation like tic-tac-toe", 2026-11-01):** the camera pulls out to the whole arena with a thump; everyone but the winners washes out; rays in the winner's color turn behind the arena; a big copy of each winner's head drops onto them with a crown; then the result tag stamps on near the bottom like tic-tac-toe's (`YOU WIN!` / `SHARED WIN!` in your color with a trophy and your land share counting up to the exact figure, confetti and stars; `YOU LOST` with your place; watchers `ANA WINS!`). No names, minimap, table or "tap" text. It moves on to the results by itself after 6 s; a tap does nothing (owner decision 2026-11-01: a stray tap skipped it). Timings in `look` / `hud` of the client config.
- **Results:** the arena results screen (see DESIGN.md, Scoreboard & results): land share for players still in, time survived for the rest.
- **Tile art:** a small arena with two raised lands and a trail on its way home.

---

## Files

| Path | Purpose |
|---|---|
| `src/shared/games/territory/config.ts` | Gameplay numbers (speeds, sizes, arena, match length) |
| `src/shared/games/territory/types.ts` | Points, rings, land, players, state, events |
| `src/shared/games/territory/geometry.ts` | Bounds, areas, point in land, exact edge crossings, segment distances, trimming a polyline's end |
| `src/shared/games/territory/arena.ts` | Arena radius / polygon / wall band, head limit, spawns, start land |
| `src/shared/games/territory/movement.ts` | 4096-step angles, limited turning, wall slide, solid heads (`separateHeads`, shared with prediction) |
| `src/shared/games/territory/capture.ts` | Exact land with Clipper2: trail area + closed-off areas, subtract, merge, land pieces, keeping one part of a cut piece (`keepConnected`) |
| `src/shared/games/territory/simulation.ts` | `createTerritory`, `stepTerritory`: quits, moves, head blocking, trails, captures, cuts, land to the cutter, end |
| `src/shared/games/territory/ranking.ts` | Land shares (basis points), places |
| `src/shared/games/territory/wire.ts` | Binary snapshot / full sync / pong / input encoding |
| `src/server/arena/territoryMatch.ts` | One live match: input queue by step, stall skip, encoded snapshots, full sync, results |
| `src/web/games/territory/TerritoryScreen.tsx` | Canvas + HUD: ✕ / back, clock, land table, countdown, out / end cards, WATCHING badge |
| `src/web/games/territory/useTerritoryGame.ts` | Wires client, renderer and controls to one animation-frame loop; wake on visibility; dev-only `window.territory` |
| `src/web/games/territory/loadTerritory.ts` | Lazy chunk loader (the room hub preloads it) |
| `src/web/games/territory/TerritoryArt.tsx` | Tile art |
| `src/web/games/territory/config.ts` | Client numbers: netcode, camera, look, controls, HUD |
| `src/web/games/territory/engine/` | Netcode, no drawing: `serverClock.ts`, `replica.ts` (server state rebuilt from snapshots + history for drawing in the past), `prediction.ts` (`OwnPredictor`: own head, trail and capture ahead of the server), `territoryClient.ts` (receive, steer, resync, interpolation delay and lead, corrections, effects, frame + HUD view), `frame.ts` (view types) |
| `src/web/games/territory/render/` | Canvas 2D: `territoryRenderer.ts` (one frame; scratch layer for trenches), `drawWorld.ts` (floor, land lips and tops, trenches, trails, vanishing land, heads, effects, wall), `drawEnding.ts` (thump, shake, rays, wash, winners' crowned heads), `drawOverlay.ts` (names, minimap map + per-frame heads), `camera.ts` (follow / overview), `paths.ts` (cached `Path2D`), `palette.ts` (theme colors per player) |
| `src/web/games/territory/input/steeringInput.ts` | Invisible floating joystick + arrows / WASD |
| `src/web/games/territory/hud/` | `LandTable`, `MatchClock`, `CountdownDisc`, `StatusCard` (out card), `KnockoutFeed` (notices under the clock), `KillPop` (your knockout's stamp + stars), `TerritoryEnding` (the result tag, share count-up, confetti) |
| `tests/territory.test.ts` | Movement, exact captures, enemy islands, wall captures, land pieces and keeping the part you're on, sliced land vanishing, knockout by taking all land, knockout when only a sliver is left, cuts, head blocking, ranking, wire format |
| `tests/territoryNetcode.test.ts` | Replica rebuilds the server state exactly, gap detection, prediction lands on the server's spot (steering and head-on blocking), predicted capture equals the server's |
| `src/web/preview/territory/` | Dev-only `?preview=territory`: `TerritoryPreview` (WIN / LOSE / WATCH / KILL, replay), `TerritoryStage` (one moment on the real renderer and HUD pieces), `territoryScene.ts` (a scripted 3-player match made with the shared simulation, as a frame and a finished arena) |
| `scripts/playtest/territory.mjs` | Playtest: 3 players; countdown, a loop becoming land, a cut (stamp, notice, out card), a quit, the winner's ending, the results |
| `scripts/screenshots.mjs` | Shots 25–33: countdown, trail, captured, quit popup, out, watching, ended, results |

## Ideas for later

- Sound and vibration, a short glow on capture. The owner may send more Paper.io screenshots for visual tuning.
