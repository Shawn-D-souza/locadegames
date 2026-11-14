import { useState } from "react";
import { armOf, boardFor, homeProgress } from "../../shared/games/ludo/board";
import { createGame } from "../../shared/games/ludo/rules";
import { ludoLayout } from "../games/ludo/geometry";
import { LudoBoard, type BoardPawn } from "../games/ludo/LudoBoard";
import { placePawns } from "../games/ludo/placePawns";
import { playerStyle } from "../utils/playerStyle";

/**
 * Pawns spread over the board for a look: each player one in the base, some on the track (two sharing a square; every
 * other player's first on its start square's star), one up the home column, and 1–4 home (some home pawns replace the rest).
 */
function sampleGame(players: number) {
  const game = createGame(players);
  const home = homeProgress(boardFor(players));
  game.pawns = game.pawns.map((_, seat) => {
    const spread = [-1, seat % 2 === 0 ? 0 : 3 + seat * 5, seat % 3 === 0 ? 9 : 20 + seat, home - 1];
    const homeCount = (seat % 4) + 1;
    return spread.map((p, i) => (i >= 4 - homeCount ? home : p));
  });
  return game;
}

/**
 * Dev-only: `?preview=ludo` draws every board size (2–8 players) with pawns on it, to judge the look and how it fits a
 * phone. `&players=N` shows just that one, full width.
 */
export function LudoPreview() {
  const fixed = Number(new URLSearchParams(window.location.search).get("players")) || null;
  const [players, setPlayers] = useState(fixed ?? 8);
  const board = boardFor(players);
  const layout = ludoLayout(board, 0);
  const game = sampleGame(players);
  const arm = (seat: number) => armOf(board, seat, players);
  const owners = Array.from({ length: board.arms }, (_, a) => {
    const seat = game.pawns.findIndex((_, s) => arm(s) === a);
    return seat === -1 ? null : { id: seat, quit: false };
  });
  const pawns: BoardPawn[] = placePawns(game, layout, arm, new Map()).map((p) => ({ ...p, paint: playerStyle(p.seat), mine: p.seat === 0 }));
  return (
    <div className="flex min-h-dvh flex-col items-center gap-4 bg-background p-4">
      {fixed === null && (
        <div className="flex gap-2">
          {[2, 3, 4, 5, 6, 7, 8].map((n) => (
            <button key={n} type="button" className="rounded-pill border-thin border-ink bg-white px-4 py-2 font-display" onClick={() => setPlayers(n)}>
              {n}
            </button>
          ))}
        </div>
      )}
      <div className="w-full max-w-board-large">
        <LudoBoard layout={layout} owners={owners} pawns={pawns} ended={false} label={`${players} players`} />
      </div>
    </div>
  );
}
