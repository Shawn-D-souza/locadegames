# Tic-tac-toe

Format: **tournament** (Swiss-style, 1v1 matches; see the tournament rules in [`CLAUDE.md`](../../CLAUDE.md)). Catalog id `tictactoe`, 2+ players.

> This doc is tic-tac-toe's source of truth: rules, owner decisions, its look and its files. Platform-wide rules, the tournament and the room flow are in [`CLAUDE.md`](../../CLAUDE.md); the shared visual language, including the turn-based match screen and its endings, is in [`DESIGN.md`](../../DESIGN.md). Update this doc in the same change whenever something about tic-tac-toe changes.

---

## Rules

- Classic 3×3: seat 0 plays X and moves first, seat 1 plays O. Three in a row (row, column or diagonal) wins; a full board with no line is a draw (draws are a normal tournament result).
- **Turn timer: 30 s per move** (owner decision); the countdown shows only in the last 5 s. When it runs out, the auto move is played: the first empty cell (deterministic, so the tournament never decides anything by chance).
- Rules are pure (`createGame` / `applyMove`); the server validates every move, turn and seat.

## Look

- **Board:** white outlined card. Cells are flat pale wells with a 2px ink outline; on your turn the empty cells turn white and get a small lip because you can tap them, and pressing squashes them. Pieces are drawn in the player's color with an ink outline (X for seat 0, O for seat 1, so shape backs up color); the winning line fills with that player's tint.
- **Seat cards** show the player's piece (X or O); the match screen and the "All in" endings (win line, board in the winner's color, marks jumping) are described in DESIGN.md, Match screen.
- **Tile art:** a small copy of the real board.

## Sound

`src/web/games/tictactoe/sounds.ts`:

- **X and O** are one round pop each; O is a little lower and longer, so you can tell who moved without looking. Both climb a little as the board fills (the take is the move number) and stay low: the board is the instrument, not a melody. The sound comes when the server has accepted the move.
- **Endings** are the platform's (the last mark, the board's thump, the win line, then each phone's result), started from `useMatchSounds`.

---

## Files

| Path | Purpose |
|---|---|
| `src/shared/games/tictactoe/config.ts` | Board size, turn time |
| `src/shared/games/tictactoe/types.ts` | Board, seat, state |
| `src/shared/games/tictactoe/rules.ts` | Pure `createGame` / `applyMove` / win + draw |
| `src/shared/games/tictactoe/game.ts` | `MatchGame` adapter + auto move |
| `src/web/games/tictactoe/TicTacToeArt.tsx` | Tile art |
| `src/web/components/Board.tsx`, `BoardCell.tsx`, `WinLine.tsx`, `Mark.tsx` | The board, its cells, the win line, the X / O glyphs (used by the match screen and the celebration preview) |
| `src/web/games/tictactoe/sounds.ts` | Its sounds: `ticTacToeMarkX`, `ticTacToeMarkO`; `lastMarkSound` (which mark the last move made) |
| `tests/tictactoe.test.ts` | Rules: moves, wins, draws, errors |
| `scripts/playtest/tictactoe.mjs` | Playtest: 2 players; start, a match to a win, each phone's result and sounds, the results, back to the room |
