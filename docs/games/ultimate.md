# Ultimate Tic-tac-toe

Format: **tournament** (Swiss-style, 1v1 matches; see the tournament rules in [`CLAUDE.md`](../../CLAUDE.md)). Catalog id `ultimate`, 2+ players.

Tic-tac-toe played on a 3×3 board of small tic-tac-toe boards: the cell you play in sends the other player to that small board, a small board you win becomes your square on the big board, and three in a row on the big board wins. A separate game next to tic-tac-toe (owner decision, 2026-11-08), under the name people know it by.

> This doc is Ultimate Tic-tac-toe's source of truth: rules, owner decisions, how it works, its look and its files. Platform-wide rules, the tournament and the room flow are in [`CLAUDE.md`](../../CLAUDE.md); the shared visual language, including the turn-based match screen and its endings, is in [`DESIGN.md`](../../DESIGN.md). Update this doc in the same change whenever something about Ultimate Tic-tac-toe changes.

---

## Rules (owner decisions, 2026-11-08, unless marked)

- **Seats:** seat 0 plays X and moves first, seat 1 plays O. Who gets X is fair, never always the host (the platform's rule, CLAUDE.md, Fair starts).
- **First move:** anywhere on the board (the usual rule; my call, no exception for the middle).
- **Where you play:** the cell's place in its small board (top left … bottom right) sends the other player to the small board in the same place on the big board.
- **Closed boards:** a small board that is won, or full with no line, takes no more moves. **Sent to a closed board, you may play in any open board.**
- **Winning a small board:** three in a row in it. It becomes that player's square on the big board.
- **A full small board with no line counts for nobody.**
- **Winning:** three small boards in a row on the big board. **Every small board closed with no line of three is a draw** (draws are a normal tournament result; owner decision: no tiebreak on boards won).
- **Turn timer: 30 s per move** (owner decision, 2026-11-08: first 20 s, then 30 s, the same as tic-tac-toe; a timer per move, not per game, keeps the server free of timers, so the room still sleeps between turns). The countdown shows only in the last 5 s. When it runs out, the auto move is played: **the first empty cell you may play in** (deterministic, so a timeout never depends on chance).
- Rules are pure (`createGame` / `applyMove`); the server validates every move, turn, seat and board.

## Numbers (`src/shared/games/ultimate/config.ts`)

`boardSize` 3 (small boards per side, and cells per side of each), `turnTimeMs` 30 000. Cells are numbered board by board: cell `board × 9 + place`, each 0–8 in reading order; that number is the move on the wire.

## How it works

- **State** (`UltimateState`): the 81 cells, the 9 small boards (`null` open, a seat for won, `"draw"` for full with no line), whose turn, `next` (the small board the player to move must play in, or `null` for any open board), the winner and their line of three small boards, `isDraw`, and the last cell played. It travels in the room view as JSON like tic-tac-toe's (one message per move; about 400 bytes more per room view).
- **Rules** reuse tic-tac-toe's line finding for both the small boards and the big one.
- **Client:** the match screen is the shared one; the game's look (`look.ts`, in `MATCH_LOOKS`) hands it the board, a larger layout, and the sounds each move makes (`ultimateCues.ts`).

## Cost (free tier)

Like tic-tac-toe per move: each move is one WebSocket message (DO requests bill at 20:1) and one SQLite row write; nothing runs between turns. A game is up to 81 moves instead of 9, so a match costs up to about 9× a tic-tac-toe match. Not measured yet.

## Look

- **Big board** (owner direction 2026-11-08, from a reference: one grid, no gaps): one continuous grid in the shared board frame, no padding, so the 81 cells get every pixel: thin ink lines between cells, lines twice as thick between small boards (each small board draws half of the line round it), a small rounded corner: about 30px cells on a 320px phone, 34px on a 360px one, 38px on a 390px iPhone; up to 520px wide in portrait. In landscape (laptops, tablets, a phone on its side) the seat cards stack beside it in a wider column and the board fills the screen's height, up to 720px (owner decision: on a laptop it was too small, about 340px, with too much space round it). The grid's width snaps down to whole pixels per cell (`BoardFrame`, flush: its 8 line widths plus a multiple of 9px), so no column starts between pixels; otherwise the lines blurred on laptops, worst on the right edge.
- **Cells** are white. **Where the player to move must play** (owner direction, same reference): the small board is lit in their tint with a **thick outline in their dark color** over its edge lines; on your turn **the whole highlight blinks, fading out completely** and back (owner decision: like the reference; a solid outline with only the tint blinking was confusing). On the other player's turn their board stays lit, steadily and lighter (`targetWaiting` opacity, 55%; owner decision: blinking on both turns was tried, the steady one at full strength was too dark and 45% a little too light), so you can tell whose turn it is at a glance. With a free move every open board is lit. Pressing a cell you may play lights it in your color. Only cells you may play in take a tap.
- **A small board won** (owner direction 2026-11-08: like the big win): once the last mark has popped in, **a win line slashes through its three marks** (the same line as the big win's, in the winner's color, `WinLine`); then the board **fills with a lighter version of the winner's color** (`light`, 35% toward white; owner decision: the dark color was too dark) and their **big mark stamps across it** (a glyph that nearly fills its box) over its small marks and line, which fade back (`--claim-at` in global.css: the mark's pop, then the line's draw); the grid lines stay. A full board with no line just fades its marks.
- **Pieces** are the same X and O as tic-tac-toe, in the player's color with an ink outline.
- **Endings** are the platform's "All in" ones (DESIGN.md, Match screen): the win line runs through three small boards, the other small boards fade so the winner's color comes through them, and on the winner's phone the big marks on the line jump one after another.
- **Tile art:** a small copy of the big board in the middle of a game, drawn like it (owner direction 2026-11-09): one grid with a thin line between every cell and thicker ones between small boards, each kind one width everywhere, its width snapped so all 81 cells are whole pixels (nothing cut short, no uneven lines): X's two won boards on the diagonal, O's one, the rest with a few small marks. The tile's name takes two lines.

## Sound

`src/web/games/ultimate/sounds.ts`:

- **X and O** are one small round bop each, a little lighter than tic-tac-toe's because there are many more; O is lower and longer. Each climbs a little as its small board fills (the take is how many marks that small board already held).
- **A small board won** gets its own small moment, starting as its line draws (`CLAIM_SOUND_AT`): a quick scoop with the line, then, as the big mark stamps on, your own gets a stamp with two bright notes going up (`ultimateYouClaimedBoard`); the other player's (or any, while watching) a softer scoop and a stamp with one low note (`ultimateBoardClaimed`: news, not a defeat). A board filling up with no line gets two quiet wooden knocks (`ultimateBoardFilledUp`). Each stays smaller than a match win.
- **Endings** are the platform's (the last mark, the board's thump, the win line, then each phone's result), started from `useMatchSounds`.

## Haptics

`src/web/games/ultimate/haptics.ts`, on the platform's levels (see DESIGN.md, Haptics):

- **Your mark:** `medium`, the moment your finger lands (`UltimateCell`). iPhones get their tap tick here too.
- **The other player's mark:** `light`: it's your turn (Android; `useMatchSounds`). Watchers feel no marks.
- **You win a small board:** a `selection` tick as its line draws, then `light` and `medium`, a small climb, as the big mark stamps on (on its sound, `ultimateYouClaimedBoard`). The other player winning one, or a board filling up, isn't felt (others' events stay out of your hand).
- **Endings** are the platform's.

---

## Files

| Path | Purpose |
|---|---|
| `src/shared/games/ultimate/config.ts` | Board size, turn time, cell counts |
| `src/shared/games/ultimate/types.ts` | Cells, small boards, state |
| `src/shared/games/ultimate/rules.ts` | Pure `createGame` / `applyMove`, where you may play (`isPlayableBoard`), small boards judged and their lines, the auto move (`firstPlayableCell`) |
| `src/shared/games/ultimate/game.ts` | `MatchGame` adapter |
| `src/web/games/ultimate/look.ts` | Its look on the match screen (`MATCH_LOOKS`): board, large layout, move sounds |
| `src/web/games/ultimate/UltimateBoard.tsx` | The big board in the shared `BoardFrame` (flush: one continuous grid) |
| `src/web/games/ultimate/UltimateSmallBoard.tsx` | One small board: its half of the thick lines, where to play (tint, dark outline, the whole highlight blinking), the won board's fill and big mark |
| `src/web/games/ultimate/UltimateCell.tsx` | One cell: thin ink lines, the mark, tap + haptic |
| `src/web/games/ultimate/positions.ts` | Place names for screen readers ("top left square, middle cell") |
| `src/web/games/ultimate/UltimateArt.tsx` | Tile art |
| `src/web/games/ultimate/sounds.ts` | Its sounds: `ultimateMarkX`, `ultimateMarkO`, `ultimateYouClaimedBoard`, `ultimateBoardClaimed`, `ultimateBoardFilledUp`; `lastMarkSound` |
| `src/web/games/ultimate/ultimateCues.ts` | Which sounds a move makes as it lands, for whoever is looking, and when |
| `src/web/games/ultimate/haptics.ts` | Its feels: `ultimateMarkPlaced`, `ultimateOpponentMoved`, `ultimateBoardClaimed` |
| `tests/ultimate.test.ts` | Rules (sending, closed boards, full boards, wins, draws, errors, auto moves, 60 whole games stay legal), mark takes, move cues |
| `scripts/playtest/ultimate.mjs` | Playtest: 2 players; a 17-move game where each side wins a small board and X wins the diagonal; each phone's result, sounds and haptics, the results, back to the room |
| `scripts/screenshots/ultimate.mjs` | Screenshots: mid-game, a small board won by each side, on the phone sent to one small board |

## Ideas for later

- End a game as a draw as soon as neither player can still make a line of three, instead of playing out the closed-off boards.
- A clock for the whole game (say 3 minutes each) instead of one per move; needs the platform's turn timer to support it.
- Show the last move more clearly (a small dot or outline) for players who looked away.
