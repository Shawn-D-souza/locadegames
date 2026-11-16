# Chess

Format: **tournament** (Swiss-style, 1v1 matches; see the tournament rules in [`CLAUDE.md`](../../CLAUDE.md)). Catalog id `chess`, 2+ players.

Chess with the full rules (castling, en passant, promotion, check and checkmate) and a chess clock: 10 minutes each plus 5 seconds a move, at most 2 minutes for any one move. Our own look: our own drawn pieces in the players' colors on Checkers' board.

> This doc is Chess' source of truth: rules, owner decisions, how it works, its look and its files. Platform-wide rules, the tournament and the room flow are in [`CLAUDE.md`](../../CLAUDE.md); the shared visual language, including the turn-based match screen and its endings, is in [`DESIGN.md`](../../DESIGN.md). Update this doc in the same change whenever something about Chess changes.

---

## Rules (owner decisions unless marked)

- **1v1**, played as the platform's tournament.
- **The full rules of chess** (FIDE): every piece's moves, castling on both sides (never out of, through or into check), en passant, promotion, check; a move may never leave your own king in check.
- **Seats:** seat 0 starts at the bottom and moves first, like White. Who starts is fair, never always the host (CLAUDE.md, Fair starts).
- **Promotion: you pick** the piece (queen, rook, bishop or knight; owner decision, not always a queen).
- **Winning:** checkmate, or the other player running out of time.
- **Time** (owner decision): **a clock of 10 minutes each, with 5 seconds added after each of your moves** (10 + 5; owner decision, changed from 20 minutes with no increment), and **at most 2 minutes for any one move**. Running out of either is **an instant loss**: no move is played for you (unlike the other turn-based games). That holds even when the other player has too little left to mate (owner decision: "instant loss"; FIDE would call that a draw).
- **Draws are all automatic** (owner decision: no draw offers): stalemate; neither side able to mate (kings alone, a king and one bishop or knight against a king, or only bishops all on squares of one color); the same position (same side to move, same castling and en passant chances) a third time; 50 moves each with no capture and no pawn moving.
- **Resigning** is the match screen's ✕ (the platform's quit: the other player wins).
- Rules are pure (`createGame` / `applyMove`); the server validates every move, turn, seat and the time it took.

## Numbers (`src/shared/games/chess/config.ts`)

`size` 8, `clockMs` 600 000 (10 min), `incrementMs` 5 000 (5 s), `moveLimitMs` 120 000 (2 min), `quietMovesEach` 50, `repetitions` 3. The catalog's `turnTimeMs` is the move limit; each turn's real one is the game's `turnTimeMs(state)`. Squares are numbered row by row from the top: square `row × 8 + column`, so `a8` is 0 and `h1` is 63; a light square has `row + column` even. On screen: a move slides in `chessSlide` (220 ms), a piece taken shrinks away over `checkerTaken` as the mover arrives, a promoted pawn's new piece pops on over `slow` (`src/theme/motion.ts`). A card's clock turns urgent with `clockWarnMs` (30 s) left (`src/web/config.ts`).

A match takes at most 20 minutes plus 5 s for every move played (a 40-move game: about 27 minutes), so a tournament of 5–8 players (3 rounds) can take well over an hour.

## How it works

- **A move** on the wire is `{ from, to, promotion? }`: castling is the king's move two squares toward the rook. It is checked against every legal move (`legalMoves`), so a promotion without a piece named is refused (`INVALID_MOVE`). `moves.ts` holds the board's geometry, attacks and move generation; `rules.ts` the game around it. The move generator is checked against the standard perft counts.
- **State** (`ChessState`): the 64 squares, whose turn, castling rights, the en passant square, **each player's clock as the current turn began**, the winner and how (checkmate, clock, move limit), a draw and why, the last move with what it did (what it took and where, the castling rook's move, a promotion, check), the move count, the count of quiet moves and the positions since the last capture or pawn move (for the repetition rule). It travels in the room view as JSON (one message per move).
- **The clock** (a platform addition for Chess): the tournament hands `applyMove` the time the move took by the server's clock (`spentMs`, from the turn's start), which comes off the mover's clock before the 5 s increment goes on. A turn lasts the move limit or the mover's clock, whichever is less (`turnTimeMs`), so the platform's usual timeout claims end it: when it runs out, the server's `expire` makes the mover lose (`clock` or `moveLimit`). A move arriving after the deadline loses on time too, whoever claims first. Nothing runs on the server between moves.
- **Client:** the match screen is the shared one; the game's look (`look.tsx`, its own download through `matchLooks.ts`) hands it the board, the `largeBoard` layout, the king for the seat cards, `playsMovesOut`, **`clocks`** (each card shows its player's time, the mover's running down; when the move's limit will run out first, its last 30 s show instead, marked `MOVE`) and **`endDetail`** (why it ended, under the result: "Checkmate", "Out of time", "Over 2 min on a move", "Stalemate", "Nobody can checkmate", "Same position 3 times", "50 moves, no capture").
- **Your view:** the board is turned round on the second seat's phone, so your own pieces are always at the bottom (my call, as in Checkers; watchers see the first seat's side, `view.ts`). Squares are named as players say them (`e4`) for screen readers.
- **Moving** (`useChessInput`): tap one of your pieces to pick it up (its square takes your light color with a ring in your full color; dots where it can go, a ring round a piece it can take), then tap one of those; or drag it there (let go anywhere else and it goes back, still picked up). A tap on one of yours that can't move is a small no. A pawn put down on the far row opens the **promotion picker** over the board (`PromotionPicker`: the four pieces in your color; a tap beside them puts the pawn back).
- **Every move plays out** (`useMovePlayback`): your own at once as you make it (not waiting for the server), the other player's as it arrives: the position before it shows while the piece slides over, the piece it takes shrinking away as it arrives, a castling rook sliding alongside, a promoted pawn turning into its new piece as it lands. The cards stay on the mover until it has played out, and the match's ending waits for the last move. A king in check stands on a pale coral square (still there after checkmate).

## Cost (free tier)

Like Checkers per move: each move is one WebSocket message (DO requests bill at 20:1) and one SQLite row write; nothing runs between turns (the clock is worked out from the turn's start time, with no server timer). A game takes many more moves than tic-tac-toe's 9 (often 60–100 plies), so a match costs several times as much. The state is a few KB of JSON (the positions kept for the repetition rule are most of it, and only since the last capture or pawn move). Checking a move works out every legal move a few times (well under a millisecond). Not measured yet.

## Look

- **Board:** Checkers' board (the same squares and colors: white and pale indigo `checkerSquare`), in the shared `BoardFrame` (`checker` spacing). A king in check: `chessCheck`, a pale coral.
- **No highlight of the last move** (owner decision): unlike Checkers, the squares a move left and reached aren't marked; you see it play out as it slides over.
- **Pieces** (`ChessPiece`, shapes in `pieceShapes.ts`): our own drawing (no piece set copied) of classic tournament-set silhouettes (owner direction: shapes that look finished and professional): smooth symmetric curves in the player's color with one ink outline, each on the same two-step base (a wide foot, a narrower step): a pawn's ball head over its collar, a rook's tower with three battlements and a ring, a knight's horse head (ear, eye, nostril, mane), a bishop's mitre with its diagonal cut and a ball on top, a queen's five-pointed coronet with balls on its points, a king's two-lobed headdress under a cross. **Your own have a band pressed into the foot of the base** in your dark color, like the ring in Checkers and 4 in a Row (`isRinged`; watching, the second seat's). The seat cards show each player's king.
- **Clocks** on the seat cards: an ink pill with the time in the games' number font, coral and blinking once urgent.
- **Endings** are the platform's "All in" ones (DESIGN.md, Match screen) without a win line: the board fills with the winner's color round the squares, the loser's pieces fade back, and on the winner's phone the winner's pieces jump one after another. A draw shakes. The result tag says why it ended.
- **Tile art:** a 4 × 4 corner of the board up close: the first player's knight checking the other's king (its square coral), a pawn behind (so it can't be taken for Checkers' whole board).

## Sound

`src/web/games/chess/sounds.ts`, weighted wooden pieces on a wooden board (my calls, not yet heard by the owner):

- **A move** (`chessMove`): one low, soft wooden tock as the piece sets down (heavier than a checker); three takes, played in turn.
- **A capture** (`chessCapture`): a hard knock on the piece taken, then the mover's tock.
- **Castling** (`chessCastle`): two tocks close together, king then rook.
- **Check** (`chessCheck`): two falling notes on the tines, just after the piece lands; a call to look, never an alarm.
- **A promotion** (`chessPromote`): a quick rising call on the mallets with a tine on top.
- Every sound lands on the move's own time (`moveTiming.ts`), played by the board as it plays the move out; the other player's sit back a little, a watcher's more (the match screen's volumes). The last seconds tick as on every turn-based game. **Endings** are the platform's (the board's thump, then each phone's result), with no win line.

## Haptics

`src/web/games/chess/haptics.ts`, on the platform's levels (see DESIGN.md, Haptics):

- **Picking up** one of your pieces: a `selection` tick. A tap on one of yours that can't move: the platform's `refused`.
- **Your piece landing:** `medium` for a move, `heavy` for a capture, a two-pulse `chessPromoted` for a promotion.
- **The other player's move** (your turn), as it has played out: `light`, `medium` if it took one of yours, two `medium` pulses if it puts you in check (`chessChecked`). Watchers feel none, and the move that ends the match lands into the ending's own thump.
- **iPhones** get their tap tick on a tap on a piece or a square (`hapticTarget` on the square buttons and the promotion choices); drags and landings aren't felt there.

---

## Files

| Path | Purpose |
|---|---|
| `src/shared/games/chess/config.ts` | Board size, the clock and the move limit, draw rules |
| `src/shared/games/chess/types.ts` | Pieces, squares, the move (`ChessMove`), the move played (`PlayedMove`), castling rights, how it ended, state |
| `src/shared/games/chess/moves.ts` | The board's geometry (`squareAt`, `isLight`), the starting position, attacks (`isAttacked`, `inCheck`), playing a move on the board (`playOnBoard`: en passant, castling, promotion), every legal move (`legalMovesOn`), `insufficientMaterial` |
| `src/shared/games/chess/rules.ts` | Pure `createGame` / `applyMove` (with the time the move took), `legalMoves`, castling rights, the draws, positions for the repetition rule (`positionKey`), the turn's time (`turnTimeMs`), losing on time (`expire`), a clock as it stands (`clockLeft`), reading a move off the wire (`parseMove`) |
| `src/shared/games/chess/game.ts` | `MatchGame` adapter (with `turnTimeMs` and `expire`) |
| `src/web/games/chess/look.tsx` | Its look on the match screen (its own download through `matchLooks.ts`): board, large layout, the king for the cards, `playsMovesOut`, `clocks`, `endDetail` |
| `src/web/games/chess/endDetail.ts` | Why a game ended, in words for the result tag |
| `src/web/games/chess/ChessBoard.tsx` | The 8 × 8 squares in the shared `BoardFrame`, turned round for the second seat; what shows while a move plays out, the moving pieces, check, the square buttons, the promotion picker, each move's sounds and feels |
| `src/web/games/chess/ChessSquare.tsx` | One square: light or dark, check, picked up, a target dot or ring, its piece shrinking away when taken, the ending's jump and fade |
| `src/web/games/chess/ChessPiece.tsx` | A piece drawn in SVG in its player's color (yours banded) |
| `src/web/games/chess/pieceShapes.ts` | The six pieces' shapes in a 100-unit box (pure data): outlined parts, ink lines and dots, the shared two-step base, where the band runs |
| `src/web/games/chess/MovingPiece.tsx` | A piece sliding over the squares (or held under the finger) |
| `src/web/games/chess/PromotionPicker.tsx` | What a pawn on the far row becomes: four choices over the board |
| `src/web/games/chess/useChessInput.ts` | Picking a piece up and putting it down by tap or drag, a promotion waiting for its piece |
| `src/web/games/chess/useMovePlayback.ts` | Plays every move out: yours at once, the other player's as it arrives |
| `src/web/games/chess/moveTiming.ts` | When a move lands, its taken piece shrinks and a promotion pops on: the animation, the sounds and the feels |
| `src/web/games/chess/view.ts` | Squares to places on screen and back, turned round for the second seat; square names (`e4`) |
| `src/web/games/chess/ChessArt.tsx` | Tile art |
| `src/web/games/chess/sounds.ts` | Its sounds: `chessMove`, `chessCapture`, `chessCastle`, `chessCheck`, `chessPromote`; a move's sounds on its times (`moveSoundSteps`) |
| `src/web/games/chess/haptics.ts` | Its feels: `chessPicked`, `chessYourMove`, `chessYourCapture`, `chessPromoted`, `chessOpponentMoved`, `chessOpponentCaptured`, `chessChecked` |
| `tests/chess.test.ts` | Rules (setup, perft counts of the standard positions, castling and its rights, en passant, promotion, checkmate and pins, stalemate and every draw, the clock and losing on time, the clock in a tournament, the wire, 20 random games stay legal), the board turned round, a move's timings and sounds, why a game ended |
| `scripts/playtest/chess.mjs` | Playtest: 2 players play a short game checked with the rules (21 moves): both clocks, a refused piece, taps and a drag, captures, a promotion with the picker, castling, checkmate with each phone's result and why, sounds and haptics, the results, back to the room |
| `scripts/screenshots/chess.mjs` | Screenshots: the promotion picker, a game under way, a piece picked up, the winner's ending (checkmate) |

## Ideas for later

- Show the other player's picked-up piece live; costs a message per pick, so only if it's missed.
- A draw offer button, if the automatic rules turn out not to be enough.
- Other time controls (an increment, blitz) as a choice when starting.
- A list of the moves played, and the pieces each side has taken, beside the board.
