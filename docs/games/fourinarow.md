# 4 in a Row

Format: **tournament** (Swiss-style, 1v1 matches; see the tournament rules in [`CLAUDE.md`](../../CLAUDE.md)). Catalog id `fourinarow`, 2+ players.

Drop discs into a standing board of 7 columns and 6 rows; they fall to the lowest empty hole, and four of yours in a line wins. The game everyone knows under another name, under a plain one of ours (owner decision: not that name, nor its blue rack with red and yellow discs; our white board, holes and player colors).

> This doc is 4 in a Row's source of truth: rules, owner decisions, how it works, its look and its files. Platform-wide rules, the tournament and the room flow are in [`CLAUDE.md`](../../CLAUDE.md); the shared visual language, including the turn-based match screen and its endings, is in [`DESIGN.md`](../../DESIGN.md). Update this doc in the same change whenever something about 4 in a Row changes.

---

## Rules (owner decisions unless marked)

- **1v1**, played as the platform's tournament (owner decision: with three or more on one board you can't block everyone's threats, so it turns into luck and kingmaking).
- **Discs drop from above** (owner decision: gravity is the game; placing anywhere, or at random, isn't). A move is a column; the disc lands on the lowest empty hole. A full column takes no more.
- **Seats:** seat 0 drops first. Who starts is fair, never always the host (the platform's rule, CLAUDE.md, Fair starts); moving first is a real advantage here.
- **Winning:** four or more of your discs in a line: across, down or diagonal. A disc that joins two runs wins with the whole run (five, six or seven). **A full board with no line is a draw** (draws are a normal tournament result).
- **Turn timer: 30 s per move** (owner decision, the same as tic-tac-toe); the countdown shows only in the last 5 s. When it runs out, the disc drops in **the leftmost column with room** (owner decision: deterministic, and a weak move, so running out of time costs something).
- Rules are pure (`createGame` / `applyMove`); the server validates every move, turn and seat (a full column is refused as `CELL_TAKEN`).

## Numbers (`src/shared/games/fourinarow/config.ts`)

`columns` 7, `rows` 6, `lineLength` 4, `turnTimeMs` 30 000. Cells are numbered row by row from the top: cell `row × 7 + column`. The move on the wire is the column, 0–6. A disc falls the whole board in `discFall` (190 ms, `src/theme/motion.ts`); a shorter fall takes less, with the square root of the distance as under gravity (`fallMs`, `drop.ts`), so every landing is down before the ending's thump.

## How it works

- **State** (`FourInARowState`): the 42 cells, whose turn, the winner and their run end to end, `isDraw`, and the cell the last disc landed in. It travels in the room view as JSON like tic-tac-toe's (one message per move).
- **Client:** the match screen is the shared one; the game's look (`look.ts`, its own download through `matchLooks.ts`) hands it the board, the `largeBoard` layout (seven columns need the width; in landscape the board sits beside the stacked cards, sized to the screen's height), the disc for the seat cards (`Piece`) and the sound each disc makes.
- **Dropping** (owner decision: a tap and a drag are one gesture; `useDropAim`): a finger down on the board shows your disc in the row above it, over the column under the finger, lights that column's empty holes and shows a faint ghost in the hole it would fill; sliding sideways moves it column by column (a tick each); letting go drops it there. A tap is a press and a let-go in the same column. **Sliding off the board before letting go drops nothing** (my call, so a half-made drag never forces a move). With a mouse the disc also follows the pointer before the click. Your disc stays over its column until the server's answer brings it down. A button per column (only on your turn) serves screen readers, keyboards (a key press drops at once) and the iPhone's tap tick; fingers and the mouse are handled by the board's area.

## Cost (free tier)

Like tic-tac-toe per move: each move is one WebSocket message (DO requests bill at 20:1) and one SQLite row write; nothing runs between turns. A game is up to 42 moves instead of 9, so a match costs up to about 5× a tic-tac-toe match. Not measured yet.

## Look

- **Board:** the shared white outlined card (`BoardFrame`, `rack` spacing: holes 4px apart, a deeper base so the result tag on the bottom edge leaves the bottom row in sight). Holes are pale round wells with an ink outline. **While you aim, the column lights up** (owner decision: the column, not the holes discs would land in): its empty holes in a pale indigo (`aimColumn`; owner decision: not your own color, which looked like discs), the hole your disc would fill holding your disc's faint ghost.
- **The aiming row** above the board is one hole tall and always there (nothing moves): your disc waits in it over the column you aim at, sliding between columns. Discs fall into their holes from this row, the other player's too, gathering speed, then **bounce at the bottom** (owner direction): squash as they land, bounce up about a quarter of a hole, land, a smaller bounce, settled (`disc-drop`; `discBounce`, 420 ms).
- **Discs** are in the player's color with **their own ink outline**, and **fill their hole completely** (owner decisions: no rim of the hole round them, and an outline of their own). A disc is drawn as a round box the hole's size with the hole's own border, lying exactly over the hole's outline, so the two are one line with nothing showing between them (owner direction; two drawn circles left a thin white line). **Your own discs have a ring pressed in** in your dark color, the other player's are plain, every game (owner decisions: one side's discs plain, the other's with a subtle mark, so they can be told apart without color; always the same side, never whoever plays second; mine, like the dot on your pawn in the other board games; watching, the second seat's; `isRinged`, `opacity.discRing`). The seat cards show each player's disc, ringed the same way.
- **Endings** are the platform's "All in" ones (DESIGN.md, Match screen): the win line runs through the run of discs, a white band draws round inside each winning disc as the line draws (my call: the board fills with the winner's color, the same as their discs, so the band keeps them standing out), the other holes fade back, and on the winner's phone the winning holes jump one after another, discs and all.
- **Tile art:** a close-up of the board in the middle of a game, 4 × 4 holes rather than all 7 × 6, so the discs are big enough to read on a tile (owner direction): red three along the bottom, about to drop the fourth.

## Sound

`src/web/games/fourinarow/sounds.ts`:

- **A disc dropping** (`fourInARowDiscLands` for a plain disc, `fourInARowRingedDiscLands` for a ringed one, so on your phone the ringed sound is yours): a **dry plastic clack** on the moment it lands (the board's own fall time), a click with a short, unpitched plastic body under it, then two smaller clacks as its bounce lands again (`DISC_BOUNCE`, the animation's own times). Owner pick, by ear, out of four styles (a plastic clack, a rattle down the slot then a clunk, a soft thud, a snap into place), after a wooden clack and a round plink with a ting were turned down. The take is the row it lands on: a disc into an empty column is the highest, and a fuller column's lower as the stack gets heavier; ringed discs sit a little under plain ones, so you can tell yours from the other's without looking. Not tuned to notes (plastic isn't).
- **Endings** are the platform's (the last disc, the board's thump, the win line, then each phone's result), started from `useMatchSounds`.

## Haptics

`src/web/games/fourinarow/haptics.ts`, on the platform's levels (see DESIGN.md, Haptics):

- **Aiming:** a `selection` tick each time your disc moves over another column while your finger is down; letting go is one more.
- **Landing:** `medium` as your disc lands, `light` as the other player's does (your turn), on the fall's own time (the board plays them, so they land with the clack; watchers feel none). The disc that ends the match lands into the ending's thump instead.
- **iPhones** get their tap tick on a tap on a column (`hapticTarget` on the column buttons); drags and landings aren't felt there.
- **Endings** are the platform's.

---

## Files

| Path | Purpose |
|---|---|
| `src/shared/games/fourinarow/config.ts` | Board size, line length, turn time |
| `src/shared/games/fourinarow/types.ts` | Cells, column (the move), state |
| `src/shared/games/fourinarow/rules.ts` | Pure `createGame` / `applyMove`, where a disc lands (`landingRow`), the run through a disc (`lineThrough`), the timeout's column (`leftmostOpenColumn`) |
| `src/shared/games/fourinarow/game.ts` | `MatchGame` adapter |
| `src/web/games/fourinarow/look.ts` | Its look on the match screen (its own download through `matchLooks.ts`): board, large layout, the disc for the cards, the sound of each disc |
| `src/web/games/fourinarow/FourInARowBoard.tsx` | The aiming row, the holes in the shared `BoardFrame`, the column buttons, the landings' feel |
| `src/web/games/fourinarow/FourInARowCell.tsx` | One hole: its disc falling in and bouncing, lit pale indigo while you aim at its column, the ghost, the winning band and jump |
| `src/web/games/fourinarow/useDropAim.ts` | Aiming with a finger or the mouse: press, slide, let go; sliding off cancels |
| `src/web/games/fourinarow/Disc.tsx` | A disc in its player's color with the hole's own outline (yours ringed), lying exactly over its hole; the winning band |
| `src/web/games/pieceMark.ts` | Which discs carry the ring (`isRinged`): yours; watching, the second seat's (shared with Checkers' pieces) |
| `src/web/games/fourinarow/drop.ts` | How long a disc falls into a row (`fallMs`) and when its bounce lands again (`DISC_BOUNCE`): the animation, the clacks and the feel |
| `src/web/games/fourinarow/FourInARowArt.tsx` | Tile art |
| `src/web/games/fourinarow/sounds.ts` | Its sounds: `fourInARowDiscLands`, `fourInARowRingedDiscLands`; `lastDiscSound` |
| `src/web/games/fourinarow/haptics.ts` | Its feels: `fourInARowAimMoved`, `fourInARowDiscDropped`, `fourInARowYourDiscLanded`, `fourInARowOpponentLanded` |
| `tests/fourinarow.test.ts` | Rules (gravity, wins in every direction, long runs, draws, errors, the timeout's column, 200 random games stay legal), fall times, which discs are ringed and how each sounds |
| `scripts/playtest/fourinarow.mjs` | Playtest: 2 players; taps and a drag drop discs, a drag slid off the board drops nothing, a win along the bottom, each phone's result, sounds and haptics, the results, back to the room |
| `scripts/screenshots/fourinarow.mjs` | Screenshots: a game under way, aiming a disc, the winner's ending |

## Ideas for later

- Show the other player's aim live (a faint disc over the column they're on); costs a message per column change, so only if it's missed.
- A few blocked holes per game, picked by the server's random number, so every board is a little different (keeps the gravity rule).
- End a game as a draw as soon as neither player can still make a line.
