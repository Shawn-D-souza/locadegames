# Carrom

Format: **party** (everyone in the room round one board, taking turns; not 1v1, so no tournament). Catalog id `carrom`, 2–4 players.

Point carrom for 2, 3 or 4, each playing for themselves: anyone may pocket any coin, whites are worth 20, blacks 10, and the queen 50 once covered. One board per game; most points wins. Your shot plays on your phone the moment you let go, with no wait for the server.

> This doc is Carrom's source of truth: rules, owner decisions, how it works, its look and its files. Platform-wide rules and the room flow are in [`CLAUDE.md`](../../CLAUDE.md); the shared visual language is in [`DESIGN.md`](../../DESIGN.md). Update this doc in the same change whenever something about Carrom changes.

---

## Rules (owner decisions, 2026-11-15, unless marked)

- **2–4 players round one board, one side each** (owner decision: at most 4). With more than 4 in the room the tile shows `MAX 4` and the host can't start it (`maxPlayers` in the catalog; the server refuses with `TOO_MANY_PLAYERS`). With 2 you sit opposite each other; with 3 or 4, round the board in turn order (my call), the turn passing to the right. Only players in the room when the host starts take part; anyone joining later watches.
- **Point carrom** (owner decision): no colors to own. Anyone may pocket any coin: **white 20, black 10**. 9 white and 9 black round the queen, in the classic start (the queen in the middle, 6 touching her, 12 round those; white and black taking turns all the way round: my call).
- **No teams** (owner decision): with 4, everyone plays for themselves.
- **The queen: 50, but only once covered** (owner decision): a coin must go in **with her** on the same shot, or **on your next shot**; else she goes back in the middle. If she's the last coin on the board, she counts at once (nothing left to cover her with). Running out of time or quitting while she waits to be covered sends her back too.
- **Shoot again** when a coin went in and the shot was no foul (and the queen didn't just go back).
- **Foul: the striker in a pocket** (owner decision: **-10**, not a coin owed; a score may go below 0, otherwise a foul before your first coin would cost nothing). The coins that went in with it go back in the middle (my call, as in classic carrom), the queen too, and the turn passes. Nothing else is a foul (touching no coin is fine).
- **The striker** stands on your baseline, anywhere between its two end circles, but **not on a coin** (classic rule). **Shots go forward only** (owner decision): never back at coins behind you; at most nearly sideways.
- **One board per game** (owner decision). It ends once **every coin is in**. **Most points wins; players level on top share the win** (and each gets the room trophy), as the platform's shared titles. If everyone else quits, the last one in ends it.
- **A real flick** (owner direction, 2026-11-15: an arrow and a separate way to turn the aim felt like it only shot straight): pull back from the striker **in any direction** and let go; it shoots the opposite way to your pull, as hard as the pull is long. **No arrow, no aim line** (owner direction). **No spin, no thumbing** (simple controls).
- **Timer: 45 s** a shot, as in Pool; the countdown shows only in the last 5 s. If it runs out, the turn passes. **3 run out in a row puts you out** (as quitting); any shot starts the count again.
- **Quitting** (the ✕ or the back button after a confirm, or leaving the room) puts you out: the coins stay (they're everyone's), your points no longer count for a place, your turn passes on.
- **Places:** most points first (level players share a place), then quitters (the latest first). Final points show on the results.
- **Turn order (the platform's Fair starts rule):** whoever has gone first least in this room's party games breaks; then round the board.

## Numbers (`src/shared/games/carrom/config.ts`)

`turnTimeMs` 30 000, `missedTurnsOut` 3, `maxPlayers` 4, points white 20 / black 10 / queen 50, `foulPenalty` 10. Board 100 × 100 units inside the frame; coin radius 2.3, striker 3.1 (a little bigger than a real board's, so they read on a phone); holes radius 3.0, each one's middle 3.0 in from both walls of its corner (owner decision, 2026-11-15: 3.4 made it too easy; 3.0 is a real board's proportion to the coins). Baseline: the striker's middle 15 in from its wall, up to 30 either side of the middle. Shots must be at least 0.06 forward.

**Physics:** 360 steps a second; the hardest flick sends the striker at 270 units/s (owner direction: 300 was a little too fast), speed growing as power^1.5; the powdered board slows a disc by 28 units/s² plus 0.22 of its speed per second; bounces keep 0.9 of the speed along the hit disc on disc, 0.62 off the frame; the striker weighs 2.7 coins (real: 15 g against 5.5 g), so on a hard straight shot it follows a coin in.

**Fast coins pop out** (owner decision, 2026-11-15: the game was a bit too easy; `rim` in the config): a disc reaching a hole at up to 90 units/s always drops; faster, its path must run closer to the hole's middle, down to 0.35 of the radius at 220 units/s and up, or it clips the rim and bounces back out (keeping half its speed into the hole; it knocks like the frame). Measured on aimed shots (a coin between the middle and a corner, struck at the hole with up to 1.7° of error): normal strength (0.6) goes in 36% of the time with or without the rim; hard shots (0.75 to full) 21–29% instead of 41–48%; a careful player (0.6° of error, normal strength) 83%. So good aim at sensible strength is rewarded, slamming isn't. Before (holes 3.4, top speed 300, no rim) the same aimed shots went in 47% of the time.

**How a shot plays out** (`shotMs`; the server starts the next turn's clock after it): the discs slide for as long as the simulation says, then `settleMs` 450 (coins put back popping on, the striker leaving the board). No lead before the strike.

## How it works

- **Format `party`**, like Pool: the room keeps a `Party` with the game's whole state (`CarromState`: the coins, everyone's points, the queen waiting to be covered), one JSON message per shot, no server timers (whoever's turn it is claims a timeout once it runs out), and the room sleeps between shots. Plugged in through `PartyGame` (`game.ts`; in `PARTY_GAMES`). Final places carry each player's points (`PartyPlace.score`), shown on the results.
- **A shot** is `{ at, dx, dy, power }`: where the striker stands on your baseline, the direction (made a unit vector) and how hard (0 … 1). The server checks it (on your baseline, clear of the coins, forward), plays it out (`physics.ts`), applies the rules (`rules.ts`) and stores where every coin stopped, with the shot and **every coin as it lay before** (`last.before`), so any phone can play it.
- **Deterministic physics** (the same as Pool's: fixed steps, only adding, multiplying, dividing and square roots; equal results on the server and every phone to the last digit, through JSON too). Discs push apart by weight and bounce along the line between their middles; the frame is four straight walls; a disc drops once its middle is over a hole, unless it came too fast and off-centre (it's put back on the rim and bounced out).
- **Your shot is instant** (owner direction: Pool's wait for the server felt slow). The moment you let go, your phone plays the shot from its own copy of the game with the same rules the server runs (`applyMove`), so it knows the result at once; it sends the shot, and when the server's copy comes back it's the same shot, so nothing changes (`useShotPlayback`; if it ever differed, the server's would play instead). If the server refuses it (your time had already been claimed), the board goes back to the server's.
- **Everyone else's phone catches up** (owner direction: keep the phones together): the shot reaches them a moment after it was flicked. It plays from the start as it arrives, 1.35 times as fast until it's level with the shooter's, then at normal speed (`playbackClock.ts`), so two phones side by side end together and nothing jumps. A phone more than 1.2 s behind (waking up) jumps to where everyone is. Sounds follow the same clock.
- **The others don't see you aim** (as in Pool: no traffic while aiming): only the shot once flicked.
- **Loaded shots, development only:** a dev server (`LOADED_DICE=1`) lets a playtest place the coins before a shot (`table`: `[x, y, on]` per coin) and place and aim the striker (`window.loadedCarromShots`, `loadedShots.ts`); production never sends a table and the production server ignores it.

## Cost (free tier)

One WebSocket message and one SQLite row write per shot, nothing between them (no aiming traffic). The room row holds the 19 coins' `before` positions. Server CPU per shot: a full break about 3 ms warm (measured locally; the first shot in a fresh isolate more). Not measured on Cloudflare yet.

## Look

Built from the shared language: ink on paper, players as colors, one coral action.

- **Layout** (as Pool): **the board turns so your side is at the bottom** (owner decision: you always shoot up the screen; watchers see side 0 at the bottom). In portrait the players' row and the status card sit above the square board (always `carromTop` tall, so the board never changes size), the two together in the middle of the screen; in landscape the board on the left, as big as the screen allows, the row and the card beside it. The corner button is ✕ while you're in, a back arrow once you've quit or watch.
- **Players' row:** everyone's disc in turn order with **their points** on it (the disc widens for 3 digits or a minus); whose shot it is stands bigger and hops; quitters fade.
- **Board** (canvas, `drawBoard.ts`): a darker wood frame outlined in ink round a pale birch surface whose corners curve round the holes exactly (owner direction: no corner of the surface left past a hole); each side's baseline as two thin brown lines a striker apart with a circle at each end; two rings in the middle; an arrow from each corner toward the middle (an arrowhead into the corner, a small ring at its inner end); four deep round holes, drawn **exactly where discs drop**. Flat colors.
- **Coins:** flat discs outlined in ink, each with a faint groove ring: **white** coins plain white, **black** coins a deep indigo black (outlined, so they show going into the holes), **the queen magenta** (the party accent: never a player's color).
- **The striker:** bigger, in **its shooter's color**, with a white groove. On your shot it stands on your baseline; no arrow, no aim line (owner direction). **Only while you pull it back** (owner direction, 2026-11-15): a subtle see-through band in your color **behind** it, toward your finger (the opposite way to the shot; nothing ever in front of it), widest where it leaves the striker (0.8 of its width) and narrowing to a point, as long as your pull: up to 16 units past the striker at full power, no longer after that. No outline, no arrowhead: the pull stretching, not a pointer. It goes the moment you let go or push back to where you took hold, and only you see it. (If it doesn't work out, the next thing to try is a subtle arrow with the same rules.)
- **Your shot** (`useStrikerControl`, `strikerGrip.ts`): the screen washes in your color, the status card says **YOUR SHOT!**, **SHOOT AGAIN!** or **COVER THE QUEEN!** with the last seconds, and until your first shot "Slide · pull back any way · let go". Anywhere on the screen takes part (the corner button and popups keep their touches). **Take hold of the striker** (within 5 units of it); the first 1.2 units decide: **close along the baseline** (twice as much along it as across) **slides** it, following your finger and skipping past any coin in the way; **anything else pulls it back like a sling**: let go and it shoots the opposite way to your finger (kept forward: a pull toward the far side shoots nearly sideways at most), a full pull (22 units) or more at full power, further only steadying the aim. Where the striker has no room behind it, **hold a finger still anywhere for 350 ms** (Android ticks) and pull back from there. Back where you took hold and let go, it takes no shot; sliding never shoots.
- **A shot** (the same on every phone): the striker flicked from its spot, the discs sliding, each one dropping sinking into its hole; then coins put back popping on in the middle, and the striker shrinking away.
- **Notices** in the status card's second line once a shot has played out: `+30!` / `ANA +30`, `THE QUEEN! NOW COVER HER` / `ANA POCKETED THE QUEEN (50 IF COVERED)`, `QUEEN COVERED! +70` / `ANA COVERED THE QUEEN: +70`, `NOT COVERED! THE QUEEN GOES BACK` / `ANA DIDN'T COVER THE QUEEN`, `STRIKER IN! -10` / `ANA POCKETED THE STRIKER: -10` (with `· QUEEN BACK` when she goes back too), and the timeouts as Pool's.
- **Ending** (each phone its own, then the results after 4 s or a tap): your result at the top in place of the players' row (`TurnBanner`): `YOU WIN!`, `SHARED WIN!`, `YOU'RE 2ND`, or who won.
- **Results:** the platform's (champion card, a `RANKING` card with **everyone's final points**; `QUIT` on a quitter's bar).
- **Tile art:** the whole board as it lies in the game, your side at the bottom: the frame, the surface curving round the four holes, the baselines, the coins packed round the magenta queen, and the striker in a player's color on the bottom baseline, like a break (no arrow).

## Sound

`src/web/games/carrom/sounds.ts`, a carrom board in a quiet room (my calls).

- **The flick:** a fingernail's sharp snap and the striker's short knock, three takes by power (`carromFlick`).
- **Disc on disc:** the short dry click of flat wooden coins, four takes a little apart, louder the harder the hit (`carromClack`). **The frame:** a solid, dull knock of thick wood (`carromWall`). Hits softer than a threshold make none; clicks closer than 28 ms (knocks 45 ms) blur into one; at most 28 a shot.
- **A drop:** a soft knock and the net taking it with a hush (`carromPocket`). **Points on your shot:** two bright tines climbing (`carromScored`). **The queen in:** three quick notes rising, for everyone (`carromQueen`). **Covered:** a climbing flourish landing on a ringing chord (`carromCovered`). **Back in the middle:** two notes falling (`carromQueenBack`). **A foul:** two dull knocks falling (`carromFoul`).
- Someone else's shot sits back a little (0.8), watching more (0.65). The last 5 seconds tick (`timerTick`). **Ending:** the platform's. Which sound plays when is pure (`shotCues.ts`), timed from the simulation's own events and put on each phone's clock (catching up, or from where it is if late).

## Haptics

`src/web/games/carrom/haptics.ts`. Your own shot and what it scores; never a click or a knock (a break would buzz on and on).

- **A long press takes hold of the striker:** `selection` (Android only). **Your flick:** `medium`. **A coin in on your shot:** `light`, `medium` (once a shot). **You covered the queen:** `light`, `medium`, `heavy`. **Your queen went back:** `medium`, `light`. **Your foul:** two `light`. **Your shot comes round:** `light` (not again after a coin in).
- **iPhones:** nothing on the board (it's held and dragged, not tapped). **Ending:** the platform's.

## Files

| Path | Purpose |
|---|---|
| `src/shared/games/carrom/config.ts` | Numbers above; `shotMs` (how long a shot plays out) |
| `src/shared/games/carrom/types.ts` | `CarromState`, `CarromCoin`, `CoinKind`, `CarromSide`, `CarromShot`, `ShotOutcome`, `QueenNews`, `CarromShotResult` (with `before`), `CarromTimeout` |
| `src/shared/games/carrom/board.ts` | The board's shape for the physics, the rules and the drawing: the holes (`POCKETS`, `holeAt`), each side's directions (`sideFrame`), seats to sides (`sideOf`), the striker on a baseline (`strikerSpot`, `alongBaseline`, `strikerFits`), the start (`startingCoins`), where a coin put back goes (`centreSpot`) |
| `src/shared/games/carrom/physics.ts` | `simulate`: a shot played out, deterministic to the last digit, the striker heavier, fast off-centre discs bouncing off a hole's rim (`rimOut`); a `ShotWatcher` sees every step and event (the phones) |
| `src/shared/games/carrom/rules.ts` | Pure rules: `createGame`, `parseMove` (a shot; a placed board on a dev server only), `shotAllowed`, `applyMove` (points, the queen, fouls, coins put back), `expire`, `quitSeat`, `finalPlaces` (with points), `winners` (shared), `coinsLeft` |
| `src/shared/games/carrom/game.ts` | Plugged into the party format (`PartyGame`) |
| `src/web/games/carrom/loadCarrom.ts` | Carrom's screen as its own download (preloaded by the room hub) |
| `src/web/games/carrom/CarromScreen.tsx` | The game screen: players' row with points, whose shot, the board, notices, ✕, ending; your shot worked out on the phone the moment you let go |
| `src/web/games/carrom/CarromBoard.tsx` | The board's canvas, sized to the room it gets and turned to your side; a finger anywhere in board units; the striker's place and the ways forward and along your baseline as data for playtests |
| `src/web/games/carrom/boardView.ts` | The board on screen: fitted and turned (`fitView`), the canvas transform, a touch back in board units (`toBoard`) and a board point on screen (`toScreen`) |
| `src/web/games/carrom/drawBoard.ts` | Drawing the board, the coins and striker, and the band behind the striker while you pull back (`drawPullBand`) |
| `src/web/games/carrom/look.ts` | Client-only numbers (frame, lines, a full pull, the pull's band, the grip, sliding or pulling, the long press, drops, the catch-up) and colors (`CARROM_PAINT`) |
| `src/web/games/carrom/useStrikerControl.ts`, `strikerGrip.ts` | Your shot: taking hold (on the striker, or a long press), sliding it, pulling back (the pull now, for the band), letting go; where a touch grips, sliding or pulling (`holdIntent`), the flick from a pull (`slingOf`: the opposite way, kept forward by `forwardAim`, as hard as the pull is long), sliding past coins (`slideTo`, `nearestFit`) (pure) |
| `src/web/games/carrom/shotFrames.ts` | A shot simulated again into frames, drops and events (`shotFrames`, `discsAt`) |
| `src/web/games/carrom/boardScene.ts` | What's drawn now: the coins at rest (and your striker), sliding, sinking, popping back, the striker leaving (`sceneDiscs`) |
| `src/web/games/carrom/useShotPlayback.ts`, `playbackClock.ts` | Plays each shot: yours at once from this phone's copy (checked against the server's), everyone else's as it arrives, catching up with the shooter's (`shownMs`, `localMs`, pure) |
| `src/web/games/carrom/shotNotice.ts` | The notice a shot leaves |
| `src/web/games/carrom/shotCues.ts`, `useCarromSounds.ts` | Which sound and feel plays when in a shot (pure); playing them on this phone's clock, your turn, the last seconds, the ending |
| `src/web/games/carrom/loadedShots.ts` | Development only: playtests' placed boards and shots |
| `src/web/games/carrom/CarromArt.tsx` | Tile art |
| `src/web/games/carrom/sounds.ts` | Its sounds (in `GAME_SOUNDS` and `SOUNDS`, `soundBook.ts`) |
| `src/web/games/carrom/haptics.ts` | Its feels (in `HAPTICS`, `hapticBook.ts`; none in `soundHaptics.ts`: they come from `shotCues`) |
| `tests/carrom.test.ts` | The start, the physics the same every time (also through JSON), the rim (fast and off-centre bounces out, dead centre or softer drops), points and shooting again, fouls (below 0, coins back), the queen (covered at once, next shot, back), placing and direction checks, the end and shared wins, places, timeouts and quits, the clock after a shot, frames ending where the server's coins did, cues, the catch-up clock, the striker's controls (sliding, a flick the opposite way to any pull), the board turned |
| `scripts/playtest/carrom.mjs` | Playtest (loaded shots, taken by pulling the striker back): sliding the striker, the band showing only while pulling and growing with it, a white in and shooting again, the queen in and covered, a long press and a foul, the last coin ending the board, the ending, results with points, back to the room |
| `scripts/screenshots/carrom.mjs` | Screenshots: your shot at the start, someone else's (the board turned to their side), the board after a real break, the winner's ending, results |

## Ideas for later

- **Teams of 2** (partners opposite), if the owner wants them.
- **Thumbing** and a striker that may shoot back at coins behind the baseline, once the simple controls have been played.
- **Seeing others aim** (the striker sliding and being pulled back live), if the free tier allows it.
- **Instant shots for Pool** too (the same approach), if it feels better in Carrom.
- **Measure a shot's CPU and a game's cost** on Cloudflare once people play it.
