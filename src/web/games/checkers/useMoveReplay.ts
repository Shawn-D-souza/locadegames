import { useEffect, useState } from "react";
import type { CheckersMove, CheckersState, PlayedMove, Square } from "../../../shared/games/checkers/types";
import { moveMs } from "./moveTiming";

/** A move being played out on the board: the position before it, and the move. */
export interface Replay {
  plies: number;
  before: readonly Square[];
  move: PlayedMove;
}

const sameMove = (a: CheckersMove, b: CheckersMove) => a.from === b.from && a.path.join() === b.path.join();

/**
 * Plays out each move this phone didn't make itself (the other player's, or one played for you when time ran out):
 * the position before it shows while its piece slides along its path, then the new one. A move you made yourself was
 * shown as you made it, so it isn't played again. `sent`: the move you sent and the move count it was sent at.
 */
export function useMoveReplay(game: CheckersState, sent: { plies: number; move: CheckersMove } | null): Replay | null {
  const [seen, setSeen] = useState({ plies: game.plies, squares: game.squares });
  const [replay, setReplay] = useState<Replay | null>(null);
  if (seen.plies !== game.plies) {
    setSeen({ plies: game.plies, squares: game.squares });
    const move = game.lastMove;
    const mine = sent !== null && move !== null && sent.plies + 1 === game.plies && sameMove(sent.move, move);
    setReplay(move !== null && game.plies === seen.plies + 1 && !mine ? { plies: game.plies, before: seen.squares, move } : null);
  }
  useEffect(() => {
    if (!replay) return;
    const timer = setTimeout(() => setReplay(null), moveMs(replay.move));
    return () => clearTimeout(timer);
  }, [replay]);
  return replay;
}
