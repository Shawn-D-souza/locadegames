# Pool

Format: **party** (everyone in the room round one table, taking turns; not 1v1, so no tournament). Catalog id `pool`, 2–4 players (the first game with a cap).

8-ball pool for 2, 3 or 4: everyone's balls are in their own color, so it's not solids against stripes but each player against the table. Clear yours, then sink the black. No aim line, so nobody can work out the perfect shot: it's about feel, and it stays fun.

> This doc is Pool's source of truth: rules, owner decisions, how it works, its look and its files. Platform-wide rules and the room flow are in [`CLAUDE.md`](../../CLAUDE.md); the shared visual language is in [`DESIGN.md`](../../DESIGN.md). Update this doc in the same change whenever something about Pool changes.

---

## Rules (owner decisions, 2026-11-14, unless marked)

- **2–4 players round one table** (owner decision: the first game limited to 4). With more than 4 in the room the tile shows `MAX 4` and the host can't start it (`maxPlayers` in the catalog; the server refuses with `TOO_MANY_PLAYERS`). Only players in the room when the host starts take part; anyone joining later watches.
- **The balls are shared out** (owner decision: 4 and 3, not 5 and 4, so a game is about as long however many play, and the table isn't crowded): **7 each for 2** (the classic 15-ball rack), **4 each for 3** and **3 each for 4** (a 13-ball rack). Plus the black, in the middle of the rack. Everyone knows their color from the start (no "first pot claims a group"). The rack's other spots are filled in an order picked from the server's random number, so nobody's balls always sit at the front.
- **Hit your own first** (owner decision): the cue ball must touch one of your balls first, or the black once yours are all down. **On the break any ball may be touched first.**
- **Shoot again** (owner decision) when one of yours went in and the shot was no foul, **even if someone else's went in with it** (theirs stays down: a gift to them). Otherwise the turn passes. Someone else's ball going in on its own stays down too.
- **Fouls just pass the turn** (owner decision: no ball in hand): the cue ball going in (it goes back where it was before the shot, or the nearest free spot to it if a ball has rolled there), touching no ball, or touching someone else's ball first. Nothing else happens.
- **The black:** in after all of yours, with no foul: **you win, and the game ends** (owner decision: no playing on for 2nd and 3rd). In **before your balls are all down: you're out at once** (owner decision), and that includes: on the break (owner decision: the penalty always applies), on the same shot as your last ball (owner decision), and with the cue ball going in too or any other foul (owner decision). Out: your balls leave the table, the black goes back on the foot spot (or the nearest free spot), and the others carry on; if only one is left in, they win.
- **No aim assist** (owner decision): no aim line, no ghost ball, no path; only the cue itself, pointing where you aim. **No spin** (owner decision: simple controls for now).
- **Everything with the cue** (owner direction: no power button): sweep your finger round the cue ball, anywhere on or around the table, and the cue turns with it (on the stick it follows your finger: owner direction, not from its opposite side; from anywhere, so a ball in a corner can be aimed out of it: owner direction); take hold of the cue (touch the stick or the cue ball, or a long press anywhere: owner decision, so a ball in a corner can be pulled back from where there's room) and pull it straight back (owner direction: back only, never forward), then let go to shoot.
- **Calling pockets:** not needed (my call: casual, any pocket counts).
- **Timer: 30 s** a shot (owner decision). The countdown shows only in the last 5 s. If it runs out, the turn passes, no foul (owner decision). But **3 run out in a row puts you out** (owner decision: otherwise a game could go on forever, with someone away or stalling; no shot limit or final round): it's the same as quitting (your balls leave the table, and you're ranked with the quitters); any shot you take, even a foul, starts the count again. The second miss in a row warns you.
- **Quitting** (the ✕ or the phone's back button after a confirm, or leaving the room) puts you out: your balls leave the table, your turn passes on. A dropped connection or a hidden browser keeps you in, and the timer passes your turn.
- **Places** (my call): the winner, then whoever was still in, fewest balls left first (level players share a place), then those out by the black (the latest first), then quitters (the latest first). The winner gets the room trophy.
- **Turn order (the platform's Fair starts rule):** whoever has gone first least in this room's party games breaks; then round the table.

## Numbers (`src/shared/games/pool/config.ts`)

`turnTimeMs` 30 000, `missedTurnsOut` 3, `maxPlayers` 4, `ballsEach` 7 / 4 / 3. Table 100 × 50 units inside the cushions (2:1), ball radius 1.7 (a bit bigger than a real table's, so balls read on a phone), pockets' mouths about two balls wide (`cornerMouth` 5 from the corner along each rail, `sideMouth` 3.6 either side of the middle: generous, since there's no aim line). The holes are round: a corner's middle 0.3 out past the cloth's corner (diagonally), radius 3.1; a middle pocket's 0.8 out past the cloth's edge, radius 2.6 (inside the 3.6 rail). Head spot (the break) at 25, foot spot (the rack's front ball, the black put back) at 75.

**Physics:** 360 steps a second; the hardest shot sends the cue ball at 260 units/s (2.6 table lengths a second; owner direction: 420 was too fast), speed growing as power^1.5 so the first half of the pull has room for soft shots; the cloth slows a ball by 10 units/s² plus 0.14 of its speed per second (smooth, so slower shots still glide); bounces keep 0.94 of the speed along the hit ball on ball, 0.72 off a cushion, 0.5 off a jaw. Measured: a full break rolls about 4.5 s and pots about 0.6 balls with 15, 1.5 with 13; a straight shot to a corner at half power pots.

**How a shot plays out** (`shotMs`; the server starts the next turn's clock after it): the cue strikes (`leadMs` 350), the balls roll for as long as the simulation says, then `settleMs` 450 for what follows (the cue ball or the black put back popping on, an out player's balls leaving).

## How it works

- **Format `party`**, like Ludo: the room keeps a `Party` with the game's whole state (`PoolState`), one JSON message per shot, no server timers (whoever's turn it is claims a timeout once it runs out, everyone does if they're away), and the room sleeps between shots. The game plugs into the party format through `PartyGame` (`game.ts`; registered in `PARTY_GAMES`). The rack is made from the server's random number for the game (`create(players, seed)`, which every party game gets; the others ignore it).
- **A shot** is `{ dx, dy, power }`: the direction the cue ball is struck and how hard (0 … 1). The server makes the direction a unit vector, plays the shot out in full (`physics.ts`), applies the rules (`rules.ts`) and stores where every ball stopped, with the shot and **where every ball stood before it** (`last.before`), so any phone can play it out from the start.
- **Deterministic physics, so nothing is ever corrected:** fixed steps, and only adding, multiplying, dividing and square roots (never `Math.sin`, `exp` or the like, which can differ in their last digit between browsers). The same start and shot give the same result to the last digit on the server and on every phone; numbers survive the JSON round trip exactly. Contacts: balls pushed apart and an equal-mass bounce along the line between their middles; cushions are straight lines broken by the pockets' mouths, with round jaws at their ends; a ball drops once its middle is over a hole, like on a real table (owner direction: a ball must never look as if it floats over a hole), or crosses a cushion's line through a mouth (`table.ts`).
- **Every phone sees the strike and the roll at the same moment** (owner direction: players sitting side by side): the server took the shot at `turnStartedAt - shotMs` on its clock, so each phone starts it then on its own clock (the room view's `serverNow`), plays the cue's strike during `leadMs` (which also covers the shot reaching the other phones), then rolls the balls frame by frame (`shotFrames`: the shot simulated again, a frame every 60th of a second). A phone the shot reached late skips its first moments: the path is the same everywhere, so it lands exactly where everyone else is. The shooter's cue stays drawn back where they let go until the shot comes back (one round trip), then strikes like everyone else's.
- **The others don't see you aim** (owner decision: it would cost a message per move of the cue, and sync matters more): only the strike once you shoot.
- **Loaded shots, development only:** a dev server (`LOADED_DICE=1`) lets a playtest place the balls before a shot (`table`: `[x, y, on]` per ball) and aim it (`window.loadedShots`, `loadedShots.ts`), so it reaches its moments at once; production never sends a table and the production server ignores it.

## Cost (free tier)

One WebSocket message and one SQLite row write per shot, nothing between them (no aiming traffic). The room row grows with the stored `before` positions (16 balls). Server CPU per shot: simulating it, about 1–3 ms warm (a full break about 3 ms; the first shot in a fresh isolate more, while the code warms up). Not measured on Cloudflare yet.

## Look

Built from the shared language: ink on paper, players as colors, one coral action.

- **Layout** (owner direction: the table as big as it can be, no big box under it, and **the table never changes size**, whatever the messages): the table lies along the screen's long side: **in portrait it stands up**, the head rail (where the break comes from) at the bottom near you; **in landscape it lies down**, the head rail on the left. In portrait the area above it is always `poolTop` tall: the players' row beside the corner button, the status card under it (or the ending's result); the table takes all the height left, reaching into the screen's side margins. In landscape the table on the left (as wide as the screen allows) and the players' row and the card beside it. The corner button is ✕ while you're in and a back arrow once you're out or watching (no header bar appearing).
- **Players' row:** everyone's disc in turn order with **how many balls they have left** on it (a small ink ball once they're on the black); whose shot it is stands bigger and hops; out and quit players fade.
- **Table** (canvas, `drawTable.ts`; owner direction: light, not dark): a thin wood rail with rounded corners outlined in ink, meeting the bright blue cloth directly (owner direction: no cushions drawn; never green: the green player's color); six deep round holes at the cloth's corners and middles, drawn **exactly where balls drop** (owner direction: a ball must never look as if it floats over a hole; cutting the holes off at the cloth's edge looked odd, square cloth corners over round holes): a ball whose middle is over a hole has dropped, so one resting on the lip always has cloth under its middle and hangs over the hole by less than half. Flat colors, no shine.
- **Balls:** flat discs in their player's color with an ink outline; **yours carry a white dot** (like the board games' pawns); the cue ball white; the black a shade off the pockets, outlined in ink like the rest (owner direction). No numbers.
- **The cue:** a long tapered stick behind the cue ball: ink tip, pale maple shaft, the butt in the shooter's color, drawn on a layer over the whole screen (owner direction: always on top, never cut off at the table's edge; touches pass through it). On your shot it points where you aim and follows your finger back as you pull (a full pull is 22 table units); once struck it rushes in during the lead, on every phone.
- **Your shot** (`useCueControl`, `cueGrip.ts`): the screen washes in your color and the status card under the players' row (white, ink outline: readable on every player's color, owner direction; `PoolStatus`) says **YOUR SHOT!**, **SHOOT AGAIN!** or **SINK THE BLACK!** with the last seconds, and until your first shot of the game "Drag to aim · hold & pull back to shoot". **Anywhere on the screen** takes part in your shot (owner direction: a long press outside the table works too; the corner button and popups keep their own touches), and nothing on the screen gets selected, scrolled or a copy bubble under a held finger. **Turning:** touch anywhere and sweep round the cue ball: the cue turns by the angle your finger turns through round the ball, never jumping (on the stick it follows your finger exactly; further from the ball, finer). **Shooting:** take hold of the cue: touch the stick (within 4.5 units of it) or the cue ball, or **hold a finger still anywhere for 350 ms** (moving less than 1.2 units; owner decision, for a ball in a corner with no room behind it). A long press taking hold shows as one small twitch of the cue, back and straight in again (owner direction: no ring, nothing that stays), and a tick on Android (iPhones can't: only taps). Then your first 1.2 units of movement decide: straight back draws it back (the further, the harder), anything else (sideways, forward) turns it; let go to shoot. Back where you took hold and let go, it takes no shot; turning never shoots. Someone else's: `ANA'S SHOT`, `ANA SHOOTS AGAIN`.
- **A shot** (the same on every phone): the strike, the balls rolling, each ball dropping sinks into its pocket, shrinking; then a cue ball or black put back pops on, and an out player's balls shrink away.
- **Notices** in the status card's second line for a moment once a shot has played out (every message in one place, never over the table or the card): `SCRATCH! TURN OVER` / `ANA SCRATCHED`, `NO BALL HIT! TURN OVER` / `ANA HIT NOTHING`, `WRONG BALL FIRST! TURN OVER` / `ANA HIT THE WRONG BALL FIRST`, `THE BLACK, TOO EARLY! YOU'RE OUT` / `ANA SANK THE BLACK: OUT!`, `ALL IN! NOW THE BLACK` / `ANA IS ON THE BLACK`, `OUT OF TIME! TURN OVER` / `ANA RAN OUT OF TIME`, `OUT OF TIME! ONE MORE: YOU'RE OUT` (your second miss in a row), `3 TURNS MISSED! YOU'RE OUT` / `ANA MISSED 3 TURNS: OUT!`, `CY QUIT`.
- **Ending** (each phone its own, then the results by themselves after 4 s or a tap): your result stamps in at the top in place of the players' row (`TurnBanner`, as in Ludo).
- **Results:** the platform's (champion card, a `RANKING` card; `QUIT` on a quitter's bar; no numbers).
- **Tile art:** a close-up of the table's corner: blue cloth up to a wood rail with a corner pocket, a rack of balls in four players' colors with the black in its middle (one with your white dot), the cue lined up behind the cue ball.

## Sound

`src/web/games/pool/sounds.ts`, a pool table in a quiet room (my calls).

- **The strike:** a short woody knock with the leather tip's softness, three takes by power (`poolStrike`).
- **Ball on ball:** the sharp crack of solid resin (owner direction: they sounded like plastic): a burst of contact noise, the ball's short glassy ping (a few modes far apart, around 3.3–4 kHz, gone within a few ms) and a quick low knock for its weight; never the wood block's close modes ringing on, which made a hollow toy. Louder the harder the hit, four takes a little apart (`poolClack`). **Cushions:** a dull, rubbery thud (`poolCushion`). Hits softer than a threshold make none; clicks closer together than 28 ms (thuds 45 ms) blur into one; a shot makes at most 28, so a break clatters without a wall of noise.
- **A drop:** a hollow knock and a short rattle as it rolls away under the table (`poolPocket`); **one of yours** (whoever shot it): two bright tines climbing on top, at full volume (`poolPotted`).
- **A foul:** two dull knocks falling (`poolFoul`). **Out by the black:** a heavy blow, three notes falling away (`poolOut`).
- Someone else's shot sits back a little (0.8), watching more (0.65). The last 5 seconds tick (`timerTick`). **Ending:** the platform's. Which sound plays when is pure (`shotCues.ts`), timed from the simulation's own events; a shot that reached a phone late plays its sounds from where it is.

## Haptics

`src/web/games/pool/haptics.ts`. Your own shot, and your balls; never a click or a cushion (a break would buzz on and on).

- **A long press takes hold of the cue:** `selection` (Android only). **Your strike:** `medium`. **One of yours goes in** (whoever shot it): `light`, `medium`. **Your foul:** two `light`. **Out by the black:** `heavy`, then `light`. **Your shot comes round:** `light` (not again after potting one of yours).
- **iPhones:** nothing on the table (it's held and dragged, not tapped; `hapticTarget` is for taps). **Ending:** the platform's.

## Files

| Path | Purpose |
|---|---|
| `src/shared/games/pool/config.ts` | Numbers above; `shotMs` (how long a shot plays out) |
| `src/shared/games/pool/types.ts` | `PoolState`, `PoolBall`, `BallOwner`, `PoolShot`, `ShotOutcome`, `PoolShotResult` (with `before`), `PoolTimeout`, `PoolFoul` |
| `src/shared/games/pool/table.ts` | The table's shape for the physics and the drawing: cushions, jaws, the round holes (`POCKETS`, `holeAt`: the hole a ball's middle is over, `pocketAt`), the mouths |
| `src/shared/games/pool/physics.ts` | `simulate`: a shot played out, deterministic to the last digit; a `ShotWatcher` sees every step and event (the phones) |
| `src/shared/games/pool/rack.ts` | `ballsEach`, `rack` (the black in the middle, the rest in an order from the seed), `freeSpot` (a ball put back), `blackSpot` |
| `src/shared/games/pool/rules.ts` | Pure rules: `createGame`, `parseMove` (a shot; a placed table on a dev server only), `applyMove`, `expire`, `quitSeat`, `finalPlaces`, `ballsLeft`, `onTheBlack`, `isIn` |
| `src/shared/games/pool/game.ts` | Plugged into the party format (`PartyGame`) |
| `src/web/games/pool/loadPool.ts` | Pool's screen as its own download (preloaded by the room hub) |
| `src/web/games/pool/PoolScreen.tsx` | The game screen: players' row, whose shot, table, notices, ✕, ending |
| `src/web/games/pool/PoolStatus.tsx` | The status card under the players' row: whose shot it is with the last seconds, and a second line for what just happened, how to shoot, or watching |
| `src/web/games/pool/PoolTable.tsx` | The table's canvas, sized to the room it gets, and the cue's layer over the whole screen; a finger on it or round it in table units; the cue's place as data for playtests |
| `src/web/games/pool/useCueControl.ts`, `cueGrip.ts` | Your shot with the cue: turning it, taking hold (on the cue or a long press), pulling, letting go; where a touch grips the cue, the turn a finger sweeps round the ball (`turnBy`), turning or pulling back, how far a pull back goes (pure) |
| `src/web/games/pool/tableView.ts` | The table on screen: standing up in portrait or lying down, fitted (`fitView`), the canvas transform, a touch back in table units (`toTable`) and a table point on screen (`toScreen`) |
| `src/web/games/pool/drawTable.ts` | Drawing the table, the balls and the cue |
| `src/web/games/pool/look.ts` | Client-only numbers (rail (wide enough for the holes), cue, a full pull, where the cue grips, the long press and its twitch, drop, aim and pull dead zones) and colors (`POOL_PAINT`) |
| `src/web/games/pool/shotFrames.ts` | A shot simulated again into frames, drops and events (`shotFrames`, `ballsAt`) |
| `src/web/games/pool/tableScene.ts` | What's drawn now: the balls at rest, rolling, sinking or popping back (`sceneBalls`), the cue striking or aimed |
| `src/web/games/pool/useShotPlayback.ts` | Plays each shot at the same moment on every phone, from the server's time |
| `src/web/games/pool/shotNotice.ts` | The notice a shot leaves |
| `src/web/games/pool/shotCues.ts`, `usePoolSounds.ts` | Which sound and feel plays when in a shot (pure); playing them, your turn, the last seconds, the ending |
| `src/web/games/pool/loadedShots.ts` | Development only: playtests' placed tables and aims |
| `src/web/games/pool/PoolArt.tsx` | Tile art (owner direction: half the table as it stands in the game, not a corner close-up): the wood rail round three sides, the two corner holes at the top (no middle holes), the rack with the black in its middle, the white cue ball in the middle under it with the cue straight behind it, like a break |
| `src/web/games/pool/sounds.ts` | Its sounds (in `GAME_SOUNDS` and `SOUNDS`, `soundBook.ts`) |
| `src/web/games/pool/haptics.ts` | Its feels (in `HAPTICS`, `hapticBook.ts`; none in `soundHaptics.ts`: they come from `shotCues`) |
| `tests/pool.test.ts` | The rack, the physics the same every time (also through JSON), potting and shooting again, the break, fouls and the scratched cue ball, the black early and legal, timeouts (three in a row put you out) and quits, places, parsing, the party (seeded rack, clock after a shot, timeouts), frames ending where the server's balls did, cue timings, gripping, turning and pulling the cue, the table view |
| `scripts/playtest/pool.mjs` | Playtest (loaded shots, taken by pulling the cue back): one of yours in and shooting again, a long press taking hold of the cue, a foul, out by the black, the black to win, the ending, results, back to the room |
| `scripts/screenshots/pool.mjs` | Screenshots: your shot at the rack, someone else's shot, the table after a real break, the winner's ending, results |

## Ideas for later

- **Spin** (top, back, side) once the simple controls have been played (owner decision: not for now).
- **Seeing others aim** (the cue turning live), if the free tier allows it later.
- **Measure a shot's CPU and a game's cost** on Cloudflare once people play it.
