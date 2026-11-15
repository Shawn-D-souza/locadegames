# Checkers

Format: **tournament** (Swiss-style, 1v1 matches; see the tournament rules in [`CLAUDE.md`](../../CLAUDE.md)). Catalog id `checkers`, 2+ players.

Checkers as most people know it: American / English rules on an 8 × 8 board, 12 men each, captures forced. Our own look: white and pale indigo squares, pieces in the players' colors, kings wearing the platform's gold crown.

> This doc is Checkers' source of truth: rules, owner decisions, how it works, its look and its files. Platform-wide rules, the tournament and the room flow are in [`CLAUDE.md`](../../CLAUDE.md); the shared visual language, including the turn-based match screen and its endings, is in [`DESIGN.md`](../../DESIGN.md). Update this doc in the same change whenever something about Checkers changes.

---

## Rules (owner decisions unless marked)

- **1v1**, played as the platform's tournament.
- **American / English rules** (owner decision; not Russian / Brazilian or International): 8 × 8, pieces only on the dark squares, 12 men each on the three rows nearest their side. Men move one square diagonally forward and **capture forward only**; kings move and capture one square diagonally in any direction (no flying kings).
- **Seats:** seat 0 starts at the bottom and moves first. Who starts is fair, never always the host (CLAUDE.md, Fair starts).
- **Captures are forced** (owner decision): when any of your pieces can jump, you must jump, and a chain of jumps is played to its end (you may pick which chain; it need not be the longest). A piece can't be jumped twice in one move; jumped pieces leave the board as the move ends.
- **Crowning:** a man reaching the far row becomes a king, and that **ends its move** even if, as a king, it could jump again (American rule).
- **Winning:** the other side has no pieces left, or none that can move, on their turn.
- **Draws** (owner decision: automatic, no draw offers): **40 moves each** (80 in all) with no capture and no man moving; or **the same position, with the same side to move, a third time**. Both only count kings shuffling, since a capture or a man moving can never be undone.
- **Turn timer: 30 s per move** (owner decision, the same as tic-tac-toe); the countdown shows only in the last 5 s. When it runs out, **the first legal move in the board's reading order** is played (my call: deterministic, and seldom a good one), the whole of a chain included.
- Rules are pure (`createGame` / `applyMove`); the server validates every move, turn and seat.

## Numbers (`src/shared/games/checkers/config.ts`)

`size` 8, `startRows` 3, `quietMovesEach` 40, `repetitions` 3, `turnTimeMs` 30 000. Squares are numbered row by row from the top: square `row × 8 + column`; a dark square has `row + column` odd. On screen: a hop takes `checkerHop` (180 ms), a jumped piece shrinks away over `checkerTaken` (220 ms) as the jumping piece passes over it, a jumping piece grows by `checkerJumpLift` at the top of its jump (`src/theme/motion.ts`).

## How it works

- **A move** on the wire is `{ from, path }`: the start square and every square it lands on, in order. It is checked against the full list of legal moves (`legalMoves`: forced captures, chains to their end), so a part of a chain is refused (`INVALID_MOVE`).
- **State** (`CheckersState`): the 64 squares (a piece is its seat and whether it's a king), whose turn, the winner, a draw and why, the last move with what it took and whether it crowned, the move count, the count of quiet moves and the positions since the last capture or man move (`positionKey`, for the repetition rule). It travels in the room view as JSON (one message per move).
- **Client:** the match screen is the shared one; the game's look (`look.tsx`, in `MATCH_LOOKS`) hands it the board, the `largeBoard` layout and the piece for the seat cards. The look has `playsMovesOut`: the board plays every move out, its sounds and feels included, and the match's ending waits until the last one has.
- **Your view:** the board is turned round on the second seat's phone, so your own pieces are always at the bottom (my call; watchers see the first seat's side, `view.ts`).
- **Moving** (`useCheckersInput`): tap one of your pieces to pick it up (its square takes your light color with a ring in your full color, since the light color alone is about as pale as the square for many colors, and the squares it can go to show a dot), then tap one of those; or drag it there (let go anywhere else and it goes back, still picked up). When a capture is forced, the squares of the pieces that can capture take your light color, their ring pulsing, only they pick up, and a tap on another of yours is a small no. **A chain of jumps is made a hop at a time** with the same piece, each hop shown at once with its sound and feel; the move is sent once it can go no further. The whole move goes in one message, so the turn's clock runs across the hops. A button per square you can tap serves screen readers, keyboards and the iPhone's tap tick; fingers and the mouse are handled by the board's area.
- **The other player's moves play out** (`useMoveReplay`): the position before the move shows while its piece slides along its path (`MovingChecker`, one hop each, a jump growing as it goes over), each jumped piece shrinking away as it passes, then a crown pops on a man that reached the far row. Your own moves aren't played again (they showed as you made them); one played for you when your time ran out is. The cards stay on the mover until it has played out.

## Cost (free tier)

Like tic-tac-toe per move: each move (a whole chain of jumps included) is one WebSocket message (DO requests bill at 20:1) and one SQLite row write; nothing runs between turns. A game takes many more moves than tic-tac-toe's 9, so a match costs several times as much. The state is a few KB of JSON at most (the positions kept for the repetition rule are most of it, and only while kings shuffle). Not measured yet.

## Look

- **Board:** the shared white outlined card (`BoardFrame`, `checker` spacing) the 64 squares touching each other and its outline (the corner squares rounded with it, like Ultimate's board), white and pale indigo (`checkerSquare`). The last move's start and end squares are a little deeper (`checkerTrail`).
- **Pieces** (`Checker`) are in the player's color with an ink outline and a groove round the edge, like a turned wooden piece seen from above. **Your own have a ring pressed in** in your dark color, as in 4 in a Row (`isRinged`, `src/web/games/pieceMark.ts`; watching, the second seat's). **Kings wear the gold crown**; your own king's groove is pressed deeper instead of the ring the crown covers.
- **Endings** are the platform's "All in" ones (DESIGN.md, Match screen) without a win line (a win takes the other's pieces or leaves them stuck): the board fills with the winner's color round the squares, the loser's pieces fade back, and on the winner's phone the winner's pieces jump one after another. A draw shakes.
- **Tile art:** the whole 8 × 8 board a few moves in, its squares to the outline, plain pieces in the first two player colors (owner direction: the full board, so it can't be taken for the other games' close-ups of cells and discs). Its dark squares are a step deeper (`checkerArtSquare`) so the checkerboard reads at that size.

## Sound

`src/web/games/checkers/sounds.ts`, wooden pieces on a wooden board:

- **A step** (`checkersStep`): one soft wooden tock as the piece sets down; three takes, played in turn (owner: fine as it is).
- **A jump** (`checkersCapture`): a clean double clack, one wooden piece striking the other (owner pick, by ear, out of four: a double clack, a sharp snap, a thud with the taken piece sliding away, a round pop; after a clack with the taken piece knocked away under it was turned down). A chain climbs: each further capture a step higher (take = its place in the chain), so a double or a triple sounds like one.
- **Crowned** (`checkersCrowned`): a quick rising call on the mallets with a tine on top (my call, not yet heard by the owner).
- Every sound lands on its hop's own time (`moveTiming.ts`), played by the board as it plays the move out; the other player's sit back a little, a watcher's more (the match screen's volumes). **Endings** are the platform's (the board's thump, then each phone's result), with no win line.

## Haptics

`src/web/games/checkers/haptics.ts`, on the platform's levels (see DESIGN.md, Haptics):

- **Picking up** one of your pieces: a `selection` tick. A tap on one of yours that can't move (another must capture): the platform's `refused`.
- **Your hop landing:** `medium` for a step, `heavy` for a jump, a two-pulse `checkersCrowned` when a man is crowned.
- **The other player's move** (your turn): `light` as it has played out, `medium` if it jumped one of yours. Watchers feel none, and the move that ends the match lands into the ending's own thump.
- **iPhones** get their tap tick on a tap on a piece or a square (`hapticTarget` on the square buttons); drags and landings aren't felt there.

---

## Files

| Path | Purpose |
|---|---|
| `src/shared/games/checkers/config.ts` | Board size, starting rows, draw rules, turn time |
| `src/shared/games/checkers/types.ts` | Pieces, squares, the move (`CheckersMove`), the move played (`PlayedMove`), state |
| `src/shared/games/checkers/rules.ts` | Pure `createGame` / `applyMove`, every legal move (`legalMoves`: forced captures, chains to their end, crowning ends a move), the square jumped (`jumpedBetween`), positions for the repetition rule (`positionKey`), the timeout's move (`firstLegalMove`), reading a move off the wire (`parseMove`) |
| `src/shared/games/checkers/game.ts` | `MatchGame` adapter |
| `src/web/games/checkers/look.tsx` | Its look on the match screen (`MATCH_LOOKS`): board, large layout, the piece for the cards, `playsMovesOut` |
| `src/web/games/checkers/CheckersBoard.tsx` | The 8 × 8 squares in the shared `BoardFrame`, turned round for the second seat; what shows while a move plays out or while you make yours, the moving piece, the square buttons, the other player's move's sounds and feel |
| `src/web/games/checkers/CheckersSquare.tsx` | One square: light or dark, the trail, picked up, must capture, the target dot, its piece shrinking away when jumped, the ending's jump and fade |
| `src/web/games/checkers/Checker.tsx` | A piece in its player's color (yours ringed), a king's crown (popping on when just crowned) |
| `src/web/games/checkers/MovingChecker.tsx` | The piece moving over the squares, sliding along its route (a jump growing as it goes over) |
| `src/web/games/checkers/useCheckersInput.ts` | Picking a piece up and putting it down by tap or drag, a chain a hop at a time, forced captures; each hop's sound and feel |
| `src/web/games/checkers/useMoveReplay.ts` | Plays out each move this phone didn't make itself |
| `src/web/games/checkers/moveTiming.ts` | When a move's hops land, its pieces are taken and its crown pops on: the animation, the sounds and the feels |
| `src/web/games/checkers/view.ts` | Squares to places on screen and back, turned round for the second seat |
| `src/web/games/checkers/CheckersArt.tsx` | Tile art |
| `src/web/games/checkers/sounds.ts` | Its sounds: `checkersStep`, `checkersCapture`, `checkersCrowned`; a move's sounds on its hops' times (`moveSoundSteps`) |
| `src/web/games/checkers/haptics.ts` | Its feels: `checkersPicked`, `checkersYourStep`, `checkersYourJump`, `checkersCrowned`, `checkersOpponentMoved`, `checkersOpponentJumped` |
| `tests/checkers.test.ts` | Rules (setup, steps, forced captures, chains to their end, men forward only and kings every way, never jumping a piece twice, crowning ends a move, both ways to win, both draws, the wire, the timeout's move, 200 random games stay legal), the board turned round, a move's timings and sounds |
| `scripts/playtest/checkers.mjs` | Playtest: 2 players play a short game found with the rules (21 moves): taps and a drag, a forced capture refusing another piece, chains of jumps a hop at a time, a crowning, the win, each phone's result, sounds and haptics, the results, back to the room |
| `scripts/screenshots/checkers.mjs` | Screenshots: a capture that must be taken, a game under way with kings, a piece picked up, the winner's ending |

## Ideas for later

- Show the other player's picked-up piece live; costs a message per pick, so only if it's missed.
- A draw offer button, if the automatic rules turn out not to be enough.
- Other rule sets (Russian / Brazilian with flying kings, International 10 × 10) as a choice when starting.
