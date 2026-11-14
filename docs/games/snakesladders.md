# Snakes & Ladders

Format: **party** (everyone in the room on one board, taking turns; not 1v1, so no tournament). Catalog id `snakesladders`, 2–8 players.

The classic race up a 10 × 10 board: roll the die, climb the ladders, slide down the snakes. Everyone races on one board, and the game goes on until everyone but one is home, so every player gets a place.

> This doc is Snakes & Ladders' source of truth: rules, owner decisions, how it works, its look and its files. Platform-wide rules and the room flow are in [`CLAUDE.md`](../../CLAUDE.md); the shared visual language is in [`DESIGN.md`](../../DESIGN.md). Update this doc in the same change whenever something about Snakes & Ladders changes.

---

## Rules (owner decisions, 2026-11-14, unless marked)

- **Everyone plays on one board**, up to the room's 8 players. Only players in the room when the host starts take part; anyone joining later watches.
- **One player at a time**, in turn order. On your turn you tap **ROLL!**; the server rolls the die.
- **Direct start:** pieces start off the board, and your first roll moves you straight on (a 3 puts you on square 3). No 6 needed.
- **Ladders** take you up from their foot to their top, **snakes** down from their head to their tail.
- **A 6 rolls again.** **Three 6s in a row** cancel the whole turn: your piece goes back to **the square that turn began on** (not the start). A 6 that doesn't move you (too big to finish) still rolls again and still counts.
- **Reaching 100 needs the exact roll.** A roll that would go past it **doesn't move you**: you stay where you are (the piece shakes; the roller is told what they need: `YOU NEED A 3!`).
- **Landing on someone does nothing:** pieces share the square.
- **The game goes on until everyone but one is home** (owner decision: a ranked list, not stopping at the first). Places follow the order players got home; the last one still racing takes the next place. With 2 players the first home wins.
- **Winner:** whoever got home first; they get the room trophy.
- **Players who are home** keep watching until the end.
- **Timer: 30 s** per roll (owner decision). The countdown shows only in the last 5 s. When it runs out, **the server rolls for you** (a fresh random number), exactly as if you had tapped, so an away player never holds everyone up.
- **Quitting** (the ✕ or the phone's back button after a confirm, or leaving the room) puts you out: your piece leaves the board, your turn passes on, and you rank **below everyone who got home or was still racing; a later quit ranks above an earlier one**. If a quit leaves just one player racing, the game ends there. Only a real quit does this: a dropped connection or a hidden browser keeps you in, and the timer rolls for you.
- **Turn order (my call, the platform's Fair starts rule):** whoever has gone first least in this room's party games (one count for Dots Clash and Snakes & Ladders) goes earlier; ties in an order picked from the server's random number.
- **One fixed board for now** (owner decision: classic, no random or alternative layouts yet). The layout is our own (my call), picked by a search over layouts: no ladder or snake comes within most of a square of another, so the board reads clearly, and a game is not too long (see Numbers).
- **Each roll plays out in full on every phone, slowly enough to enjoy** (owner direction 2026-11-14: the first timings were too fast): the die tumbles to rest, a beat with its face up, then the piece hops square by square, then climbs or slides. The next roll's clock starts once it has played out, so nobody's time goes on watching it.

## Numbers (`src/shared/games/snakesladders/config.ts`, board in `board.ts`)

`turnTimeMs` 30 000, `finish` 100, `columns` 10, `sixesLimit` 3.

**The board:** ladders 3→23, 11→31, 36→64, 39→59, 61→84, 68→90; snakes 24→8, 29→9, 52→33, 53→35, 75→55, 88→67, 93→77. By simulation a player needs about **27 turns** to get home (median 26, 9 in 10 within 41); playing on until all but one is home takes about 21 rounds with 2 players, 29 with 4 and 36 with 8. One at a time, so a full room's game is long (some 250 rolls; owner decision).

**How a roll plays out** (shared, as the server times the next roll by it; `rollMs`; owner direction: slower, 2026-11-14): the die tumbles to rest `dieMs` 1 050, then shows its face `settleMs` 320, each square hopped `hopMs` 290, a ladder's climb `climbMs` 1 150, a snake's slide `slideMs` 1 600, a roll too big shakes the piece `stuckMs` 700, three 6s fly it back `backMs` 1 250. A roll of 4 up a ladder takes about 3.7 s.

## How it works

- **Format `party`**, like Dots Clash: the room keeps a `Party` with the game's whole state (`SnakesLaddersState`), one JSON message per roll (`"roll"`), no server timers (whoever's turn it is claims a timeout once it runs out, everyone does if they're away), and the room sleeps between rolls. The game plugs into the party format through `PartyGame` (`game.ts`; registered in `PARTY_GAMES`).
- **Dice:** the shared die (`src/shared/games/dice.ts`, also Ludo's): the server rolls each die from a fresh random number (`crypto.getRandomValues`, the `seed` every move and timeout gets), never from anything a phone could know ahead. The rules are pure given the die (`applyMove(state, seat, die)`), so they are tested exactly.
- **Loaded dice, development only:** `npm run dev:server` sets `LOADED_DICE=1`, and then a move may name its die (`{ die: 6 }`), so playtests reach a ladder, a snake or the finish at once. In development the client sends one only if a playtest lined it up (`window.loadedDice`, `src/web/games/dice/loadedDice.ts`); production builds always send `"roll"`, and the production server (no `LOADED_DICE`) refuses anything else.
- **State:** each seat's square (0 off the board, 100 home), whose turn, the roll count (`moves`: a timeout names it), 6s in a row this turn and the square it began on, who got home in what order, who quit in what order, and the last roll (`SnakesRoll`: the die, from, where counting ended, where it rests, what kind: move, ladder, snake, stuck, three 6s; whether it rolls again; whether it got home).
- **Client:** every phone plays each roll out from the moment it arrives (`useRollPlayback`, frame by frame), the moving piece placed by `pieceAt(roll, ms)` from the same geometry the board is drawn with (it slides down exactly the snake you see). Until a roll has played out, the turn stays with whoever rolled and what it did (who got home, the ending) waits. A jump (reconnecting) just shows the board.

## Cost (free tier)

Like Dots Clash per move: one WebSocket message and one SQLite row write per roll, nothing between rolls. A game is about 27 rolls per player plus 6s (more for those still racing at the end): roughly 60–300 rolls for 2–8 players. Not measured yet.

## Look

Built from the shared language: ink on paper, players as colors, one coral action.

- **Layout:** in portrait, the players' row on top, the board under it (up to 520px, fitting the screen's height), and under the board, near your thumb, the **roll bar**: the die beside either your coral `ROLL!` or the banner saying whose turn it is. In landscape (any: the board's 100 squares need the height) the board sits on the left with the players' row and the roll bar in a column beside it. The ✕ sits in the top-left corner while you're still racing; once home, out or watching, a header with the back arrow (leave the room) and settings; late joiners get a `WATCHING LIVE` badge.
- **Players' row:** the shared one (`TurnStrip`), as round discs like the pieces: whose turn hops, `YOU` under yours, a player who is home shows their place on their disc, a quitter fades in grey.
- **Your turn vs someone else's:** your disc hops, the screen washes in your color and the coral **ROLL!** pops in (**ROLL AGAIN!** after a 6), with the last 5 seconds in a white bubble. Someone else's turn: a white banner `ANA'S TURN` (`ANA ROLLS AGAIN` after a 6), the screen in their color. Once you're home: a quiet second line, "You're 1st · watching".
- **Board:** one card, ink-outlined, squares white and pale lavender in turn (`snakesSquare`), numbered small in each square's corner (up from the bottom-left, winding), square 100 crowned with the gold crown. **Ladders** are white rails and rungs outlined in ink with a solid ink lip. **Snakes** (owner direction 2026-11-14: the first ones, fat at the head thinning to the tail with spots, didn't look good; the next, thick and banded, looked like worms) are **slim**, indigo (`snake`, never a player color), **speckled** (owner's pick 2026-11-14, from six tried on a preview page; flat one-color marks (a stripe, dots, bands, diamonds, a zigzag) read like stickers, not skin): a pale belly (`snakeBelly`) down one side, from right under the head into the tail on every snake (owner direction), so the slim body looks round, and bold ink specks over its back (bold, as a snake is only about 10 px wide on a phone; seeded by where the snake is, so the same on every phone), cut to the body's shape (`snakeSkin.ts`). The body is like a real snake's body: a slim neck behind a head wider than it, then the body, then a long taper to a fine tail, swaying gently; the head narrows to a round snout, with two eyes with a glint and a coral tongue, and nothing else on it (owner direction 2026-11-14: a lavender patch on top was taken off). Drawn in board units (`geometry.ts`), so the art and the pieces' paths agree.
- **Pieces** (owner direction 2026-11-14: the round tokens with a lip under them looked cheap): **the logo's pawn** in the player's color, outlined in ink, one white shine on its head, **flat, no shadow**; **yours has a white dot on its body**. Pawns sharing a square huddle in it, smaller (two side by side, up to four in a square, more in a 3 × 3; the back ones behind). A quitter's pawn leaves the board. The players' row keeps simple discs.
- **A roll** (the same on every phone): the die is thrown in, lands and hops once turning over twice, then tumbles over its edges a quarter turn at a time, each tumble quicker and lower, a new face each time, like a real die (owner direction 2026-11-14: it bounced like a ball; `DIE_HITS`, shared with its sound), and comes to rest on the roll with a little squash; a beat; then the piece hops square by square in arcs, landing each with a squash (popping onto square 1 if it wasn't on the board); then climbs straight up the ladder or slides down the snake's own curve, slow at the head and gathering speed, and lands with a squash. Too big a roll: the piece shakes where it stands. Three 6s: it flies back in a high arc to where the turn began (off the board if that's where it was).
- **Notices** at the top once a roll has played out: `YOU'RE 1ST!` / `ANA IS 2ND!`, `THREE 6s! BACK YOU GO` / `ANA: THREE 6s!`, `YOU NEED A 3!` (only the roller), `CY QUIT`.
- **Ending** (each phone its own, then the results by themselves after 4 s or a tap): the board thumps and the banner turns into your result: your win in your color, tilted with a trophy, `YOU WIN!`, with sun rays behind the board; the others a white `YOU'RE 2ND`; late watchers an ink `ANA WINS!`.
- **Results:** the platform's (champion card, a `RANKING` card with places; `QUIT` on a quitter's bar; no numbers).
- **Tile art** (owner direction 2026-11-14: the first, a diagonal ladder and a thin snake on stripes, looked weak, and a close-up made the squares too big for what stood on them): a 3 × 3 corner of the board in its checkerboard, everything at the board's own scale so each thing sits in its squares as in the game: a ladder climbing two squares up the left column with a red pawn standing at its foot, a speckled snake winding down from the top-right square, the die lying in the bottom-right square showing a 6.

## Sound

`src/web/games/snakesladders/sounds.ts`, a board game on a desk (my calls; the platform's sounds as they are):

- **The die** (anyone's roll; the shared one, `dice/sounds.ts`, also Ludo's; owner direction 2026-11-14: like a real die, and matching the game and the platform; even knocks, a glassy clack, a drum-like thud and thin "plastic spoon" clicks weren't liked, and a die made from real physics didn't match the game): from the toy box, a small wooden toy die tumbling on the same hollow board the pawns hop on. A crisp wooden clack (`woodTap`, untuned and quickly damped, so it never rings) with the board's knock under it on every landing you see (the throw's corner and face, then each tumble over an edge), the same clack every time, only softer, then two tiny ones as it rocks to rest (`dieRoll`, 3 takes). The small, crisp wooden die is the owner's pick (2026-11-14) of three tried on a preview page (a chunkier die, and one with a note as its face shows, were the others).
- **Each hop** (owner direction: wooden, to match the die): the pawn's wooden knock as it lands, tuned a step up the scale each square of the roll, with the hollow board soft under it (`snakesLaddersHop`).
- **A 6:** two bright tines, the second higher: roll again (`dieSix`, the shared die's).
- **A ladder:** a quick run of mallets up the scale, one per rung (`snakesLaddersLadder`). **A snake:** mallets falling down the scale, quicker as it goes, then a low bubbly plop at the tail (`snakesLaddersSnake`).
- **Too big a roll:** two dull, low knocks (`snakesLaddersStuck`). **Three 6s:** a heavy blow, two notes falling away (`snakesLaddersThreeSixes`).
- **Home:** a quick run up to the player's own note with a ring above it (`snakesLaddersHome`, take = their color).
- Someone else's roll sits back a little (0.8), watching more (0.65). Your turn has no sound (the last roll is the cue). The last 5 seconds tick (`timerTick`). **Ending:** the platform's.
- Which sound plays when is pure (`rollCues.ts`), timed from the shared roll timings.

## Haptics

`src/web/games/snakesladders/haptics.ts`. Only **your own roll** is felt (others' rolls and every hop are not: nothing constant):

- **Your die comes to rest:** `medium`. **A 6:** two `light` (the shared die's: `dieLands`, `dieSix`).
- **Your ladder:** `light` then `medium`. **Your snake:** `heavy`, then a late `light`. **Your three 6s:** the same.
- **You get home:** `light`, `medium`, `heavy`.
- **Your roll comes round:** `light` (not again after a 6: that one is felt with the 6).
- **iPhones:** the tick on tapping ROLL! (the button's own). **Ending:** the platform's.

## Files

| Path | Purpose |
|---|---|
| `src/shared/games/snakesladders/config.ts` | Numbers above, `rollMs` (how long a roll plays out) |
| `src/shared/games/snakesladders/types.ts` | `SnakesLaddersState`, `SnakesRoll`, `RollKind`, `SnakesSeat` |
| `src/shared/games/snakesladders/board.ts` | The board: `LADDERS`, `SNAKES`, `jumpFrom`, `squareCell` (a square's column and row) |
| `src/shared/games/snakesladders/rules.ts` | Pure rules: `createGame`, `applyMove` (a die), `rollFrom` (what a die does), `parseMove` (`"roll"`, or `{ die }` on a dev server), `quitSeat`, `finalPlaces`, `isIn`, `hasQuit`, `hasFinished` |
| `src/shared/games/snakesladders/game.ts` | Plugged into the party format (`PartyGame`): the die from the server's number, a timeout rolls |
| `src/web/games/snakesladders/SnakesLaddersScreen.tsx` | The game screen: players' row, board, roll bar, notices, ✕, ending |
| `src/web/games/snakesladders/SnakesBoard.tsx`, `BoardArt.tsx`, `Piece.tsx` | The board (squares, numbers (never past the caption size), crowned 100, pawns huddling per square), its ladders and snakes (SVG, drawn once), a piece on the board (squashing onto its base as it lands; the pawn itself is the shared `components/Pawn.tsx`, also in the tile art) |
| `src/web/games/snakesladders/geometry.ts` | Board units: square centers, a snake's swaying spine, body (slim neck, long tail), a ladder's rails and rungs, where a rolled piece is at any moment and how squashed (`pieceAt`), pieces sharing a square |
| `src/web/games/snakesladders/snakeSkin.ts` | The snakes' speckled skin (`snakeSkin`: the belly and the specks, in board units) |
| `src/web/games/snakesladders/useRollPlayback.ts` | Plays each roll out frame by frame from when it arrives |
| `src/web/games/snakesladders/rollCues.ts`, `useSnakesLaddersSounds.ts` | Which sound and feel plays when in a roll (pure); playing them, your turn, the last seconds, the ending |
| `src/web/games/snakesladders/SnakesLaddersArt.tsx` | Tile art |
| `src/web/games/snakesladders/sounds.ts` | Its sounds (in `GAME_SOUNDS` with the shared die's, and `SOUNDS`, `soundBook.ts`) |
| `src/shared/games/dice.ts`, `src/web/games/dice/` | The die, shared with Ludo: its timings and the server's roll (`DICE_CONFIG`, `dieFrom`, `loadedDie`); the roll bar under the board (`RollBar.tsx`), the die (`Die.tsx`), how it lands and tumbles (`dieMotion.ts`: `DIE_HITS`, shared by the picture and the sound), loaded dice for playtests (`loadedDice.ts`), its sounds and feels (`sounds.ts`, `haptics.ts`) |
| `src/web/games/snakesladders/haptics.ts` | Its feels (in `HAPTICS`, `hapticBook.ts`; none in `soundHaptics.ts`: only your own roll is felt, from `rollCues`) |
| `tests/snakesladders.test.ts` | The board (winding, no snake or ladder ending where another starts), first roll on, ladders, snakes, sharing a square, the exact finish, rolling again, three 6s, playing on to all but one, quits and places, parsing (loaded dice only on a dev server), roll timings, the party (server dice, clock after a roll, timeout rolls, champion and ranking), cue timings |
| `scripts/playtest/snakesladders.mjs` | Playtest (loaded dice): a ladder, rolling again, three 6s, a snake, too big a roll, the first home while the game goes on, a quit ending it, each phone's ending, results, back to the room |
| `scripts/screenshots/snakesladders.mjs` | Screenshots: rolling again, your turn, another's turn (two pieces sharing a square), home and watching, the winner's ending, another's place, results |

## Ideas for later

- **More boards** (owner decision: not for now): a few fixed layouts, or one made at random per game from the server's number, kept to the same spacing and game length.
- **A shorter game for a full room:** a smaller board or a quicker timer for players who are away, if 8-player games feel long.
- Measure a full 8-player game's cost once people play it.
