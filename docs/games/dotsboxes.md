# Dots & Boxes

Format: **party** (everyone in the room on one board, taking turns; not 1v1, so no tournament). Catalog id `dotsboxes`, 2–8 players.

The classic paper game for the whole room: take turns drawing a line between two dots; draw a box's fourth side and it's yours, and you draw again. Most boxes when the lines run out wins. Ours puts up to 8 players on one board that grows with the room.

> This doc is Dots & Boxes' source of truth: rules, owner decisions, how it works, its look and its files. Platform-wide rules and the room flow are in [`CLAUDE.md`](../../CLAUDE.md); the shared visual language is in [`DESIGN.md`](../../DESIGN.md). Update this doc in the same change whenever something about Dots & Boxes changes.

---

## Rules (owner decisions, 2026-11-15, unless marked)

- **Everyone plays on one board** (party format, not a 1v1 tournament), 2–8 players. Only players in the room when the host starts take part; anyone joining later watches.
- **A turn is one line** between two dots next to each other, across or down, that isn't drawn yet.
- **Classic extra turn:** drawing a box's fourth side wins it (a line can win two at once) and you **draw again**; a line that wins nothing passes the turn on. Every line is drawn by hand, nothing is taken for you, so leaving the last boxes of a chain on purpose (the double-cross) stays possible.
- **The end:** once every line is drawn. **Most boxes wins**; players level on the most **share the win** (the platform's rule), each with a trophy.
- **Turn order (the platform's Fair starts):** whoever has gone first least in this room's party games goes earlier; ties in an order picked from the server's random number.
- **Timer: 30 s** per line (owner decision); each extra line after a box gets a fresh 30 s. The countdown shows only in the last 5 s. When it runs out a line is drawn for you (my call, deterministic, no luck): the line that wins the most boxes, if any wins one; else the first line that leaves no box with three sides; else the line that hands the next player the fewest boxes. Ties: the first in line order.
- **Quitting** (the ✕ or the phone's back button after a confirm, or leaving the room) takes you out: you're skipped, and **your boxes stay on the board in grey** (my call, like Dots Clash) but can't make you place above anyone who stayed. If only one player is left, the game ends and they win. A dropped connection or a hidden browser keeps you in, and the timer draws for you.
- **Ranking:** everyone who stayed by boxes (level: the same place), then the quitters, the last to quit first. The results show **each player's boxes** (like Carrom's points).

## Numbers (`src/shared/games/dotsboxes/config.ts`)

`turnTimeMs` 30 000, `lineMs` 200, `boxMs` 300. **Board size by players** (boxes per side; owner left it to me, checked to fit): 2 → 5×5, 3–4 → 6×6, 5–6 → 7×7, 7–8 → 8×8 (64 boxes, 144 lines, about 8 boxes each; a box is about 35px on a 320px phone).

Line numbers (`board.ts`): horizontal lines first, row by row (`row × size + col`, rows 0 … size), then vertical (`size × (size + 1) + row × (size + 1) + col`). Box `row × size + col`. The line number is the move on the wire.

The next line's clock starts once the line has drawn in (`lineMs`), and any box it won has filled (`+ boxMs`).

## How it works

- **Format `party`** (catalog: `format: "party"`, `turnTimeMs`). The room keeps a `Party` (`src/shared/party/`); one JSON message per line, nothing between turns (the room sleeps), and no server timers: whoever's turn it is claims a timeout (everyone does if they're away), named by the line count (`moves`), and the server checks its own clock.
- **State** (`DotsBoxesState`): board size, which lines are drawn, who won each box, whose turn, the line count, who quit and in what order, the last line (who drew it and the boxes it won), over. Nothing is secret, so phones get the whole state.
- **Rules** are pure (`rules.ts`): `applyMove`, `autoMove` (with `boxesHandedOver`: how many boxes a line hands over, playing out every box it opens), `quitSeat`, `finalPlaces`, `winners`.
- **Client:** the board is plain DOM. Each open line is a button whose tap area is a **diamond** centred on it (the halves of the two boxes beside it nearest to it, `clip-path`), so the diamonds tile the board and a finger always takes the nearest line. **Your line shows the moment you tap** (owner direction: waiting for the server felt slow): your phone plays it with the same rules (`applyMove`), boxes and sounds included, and the server's copy then takes over unchanged (the line count is the same, so nothing plays twice). If the server refuses it (`lastError`, as in Carrom), the board goes back to the server's. No second tap until the server has answered.

## Cost (free tier)

Like tic-tac-toe per move: one WebSocket message and one SQLite row write per line, nothing between turns. A game is every line once: 60 lines (2 players) to 144 (7–8 players). The room view is about 1–2 KB larger than a tic-tac-toe one. Not measured yet.

## Look

Built from Dots Clash's party screen (my calls, for the owner to change):

- **Layout:** the players' row and the whose-turn banner on top, the board under it, fitting the screen's height (Dots Clash's layout). On a phone held sideways they sit beside the board; for 7×7 and 8×8 boards (5+ players) in any landscape, in a 240px column (`partySide`), the players' row in lines of 4. The ✕ sits in the top-left corner while you're in; once you quit (or watching), a header with the back arrow and settings, and late joiners get a `WATCHING LIVE` badge.
- **Players' row:** everyone's tile in their color, in turn order, **with their boxes so far on it** (it widens to fit), `YOU` under yours; whose turn it is hops; quitters fade, grey.
- **Banner:** your turn fills with your color (`YOUR TURN!`, after a box `BOX! GO AGAIN!`, `2 BOXES! GO AGAIN!`); someone else's is white, `ANA'S TURN`. Last 5 s in a bubble.
- **Background:** the light wash of whose turn it is, then the winner's (yours, if you share the win).
- **Board:** a white card with an ink edge, ink dots at the corners. Open lines are faint lavender (`tileEdge`), so you see where lines can go. Drawn lines are ink and **draw in from their middle**; **the latest line stays in its drawer's color until the next one** (my call: with 8 players a new line is easy to miss). A won box **stamps in** in its winner's color (grey for a quitter) just after its line, **filling the whole square** edge to edge, its lines and dots drawn over it (owner direction). On your turn, hovering with a mouse shows the line in your light color, pressing shows it in your color (slide off to take it back).
- **Someone quits:** a short notice at the top (`CY QUIT`).
- **Ending** (each phone its own, then the results by themselves after 4 s or a tap), once the last line has drawn in: the board thumps and the banner turns into your result: `YOU WIN!` (or `SHARED WIN!`) in your color, tilted with a trophy, with sun rays behind the board; the others a white `YOU'RE 2ND`; late watchers an ink `ANA WINS!` (`ANA & BEN WIN!`).
- **Results:** the platform's (champion card, a `RANKING` card with place, name, `QUIT` and each player's boxes).
- **Tile art:** a 3×3 board whose won boxes form an **L** for Locade, each box in a different player's color (owner direction), with a few more lines drawn so it's still a game in play.

## Sound

`src/web/games/dotsboxes/sounds.ts`, pen and paper with round pops (my calls):

- **A line drawn** (anyone's): a short felt-tip stroke with a tick as the pen lifts (`dotsBoxesLine`, 4 takes in turn). Someone else's sits back a little; watching, more.
- **A box won,** as it fills in: a round pop with a soft mallet, a step higher for every box the same player wins in the same turn, so a run climbs the scale (`dotsBoxesBox`). **Your own** is fuller, with a bright ring an octave up (`dotsBoxesYourBox`). Two boxes on one line pop one after the other.
- **Your turn** has no sound (the last line's sound is the cue). The last 5 seconds tick (`timerTick`).
- **Ending:** the platform's (the board's thump, then the win fanfare, the loss sting, or the watchers' chord).

## Haptics

`src/web/games/dotsboxes/haptics.ts`:

- **Your line:** `light`, the moment your finger lands (`LineTarget`). iPhones get their tap tick here too.
- **A box you win:** `medium`, with its sound (`dotsBoxesYourBox` in `soundHaptics.ts`).
- **Your turn comes round:** `light`.
- **Ending:** the platform's. Others' lines and boxes aren't felt.

## Files

| Path | Purpose |
|---|---|
| `src/shared/games/dotsboxes/config.ts` | Numbers above, `boardSizeFor(players)`, `lineMs(boxesWon)` |
| `src/shared/games/dotsboxes/types.ts` | `DotsBoxesState`, `BoxesSeat` |
| `src/shared/games/dotsboxes/board.ts` | Line and box numbering: `lineCount`, `lineAt`, `sidesOf`, `boxesBeside`, `sidesDrawn` |
| `src/shared/games/dotsboxes/rules.ts` | Pure rules: `createGame`, `applyMove` (a box won: draw again), `canDraw`, `autoMove`, `boxesHandedOver`, `quitSeat`, `finalPlaces`, `winners`, `boxesOf` |
| `src/shared/games/dotsboxes/game.ts` | Plugged into the party format (`PartyGame`): a line, a timeout's auto line, the line drawing in timing the next turn |
| `src/web/games/dotsboxes/DotsBoxesScreen.tsx` | The game screen: players' row with boxes, turn banner, board (your line drawn at once, taken back if refused), quit notices, ✕, ending |
| `src/web/games/dotsboxes/BoxesBoard.tsx` | The board: card, won boxes, open and drawn lines (the latest in its drawer's color), dots, the lines' tap areas |
| `src/web/games/dotsboxes/LineTarget.tsx` | One open line's tap area: a diamond around it, the line previewed on hover and press, felt as your finger lands |
| `src/web/games/dotsboxes/geometry.ts` | Where lines, dots, boxes and tap areas sit, in boxes (`--box`, from the board's width in `cqw`) |
| `src/web/games/dotsboxes/useDotsBoxesSounds.ts` | Which sound and feel plays when |
| `src/web/games/dotsboxes/DotsBoxesArt.tsx` | Tile art |
| `src/web/games/dotsboxes/sounds.ts` | Its sounds (in `GAME_SOUNDS` and `SOUNDS`, `soundBook.ts`) |
| `src/web/games/dotsboxes/haptics.ts` | Its feels (in `HAPTICS`, `hapticBook.ts`; a row in `soundHaptics.ts`) |
| `tests/dotsboxes.test.ts` | Board sizes, line numbering, turns, boxes won (one or two) and drawing again, the end and shared wins, ranking, quits, auto moves, the party format's timing and timeouts |
| `scripts/playtest/dotsboxes.mjs` | Playtest: lines in turn order, a box won (heard, felt, on the players' row) and drawing again, a quit on your turn, a second quit ending the game, each phone's ending, results, back to the room |
| `scripts/screenshots/dotsboxes.mjs` | Screenshots: your turn, a box won (go again), another's turn, quit popup, the winner's ending, another's place, results, a full room of 8 on the 8×8 board |

## Ideas for later

- **A 1v1 tournament version** on the platform's Swiss tournament (the classic strategy game).
- Rectangular boards taller than wide on phones, for more boxes without shrinking them.
- Measure a full 8-player game's cost once people play it.
