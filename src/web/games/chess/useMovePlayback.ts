import { useCallback, useEffect, useState } from "react";
import type { ChessState, PlayedMove, Square } from "../../../shared/games/chess/types";
import { moveMs } from "./moveTiming";
import type { Point } from "./view";

/** A move being played out on the board: the position before it, the move, and where its piece starts on screen when dragged there. */
export interface Playback {
  key: string;
  before: readonly Square[];
  move: PlayedMove;
  start: Point | null;
  /** This phone made it (its sounds and feels are yours). */
  own: boolean;
}

const sameMove = (a: PlayedMove, b: PlayedMove) => a.from === b.from && a.to === b.to && a.promotion === b.promotion;

/**
 * Plays every move out on the board: your own as you make it (at once, not waiting for the server), the other
 * player's as it arrives. The position before the move shows while its piece slides, then the new one. A move you made
 * isn't played again when the server's answer comes.
 */
export function useMovePlayback(game: ChessState) {
  const [seen, setSeen] = useState({ plies: game.plies, squares: game.squares });
  const [sent, setSent] = useState<{ plies: number; move: PlayedMove } | null>(null);
  const [playing, setPlaying] = useState<Playback | null>(null);
  if (seen.plies !== game.plies) {
    setSeen({ plies: game.plies, squares: game.squares });
    const move = game.lastMove;
    const mine = sent !== null && move !== null && sent.plies + 1 === game.plies && sameMove(sent.move, move);
    if (!mine) setPlaying(move !== null && game.plies === seen.plies + 1 ? { key: `move${game.plies}`, before: seen.squares, move, start: null, own: false } : null);
  }
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => setPlaying(null), moveMs(playing.move));
    return () => clearTimeout(timer);
  }, [playing]);

  /** Your move, played out at once as you send it (`start`: where you let go of it, when dragged). */
  const playOwn = useCallback(
    (move: PlayedMove, start: Point | null) => {
      setSent({ plies: game.plies, move });
      setPlaying({ key: `own${game.plies}`, before: game.squares, move, start, own: true });
    },
    [game.plies, game.squares],
  );

  return { playing, playOwn };
}
