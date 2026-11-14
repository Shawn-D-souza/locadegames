import { useEffect, useState } from "react";
import { actionMs } from "../../../shared/games/ludo/config";
import type { LudoAction, LudoState } from "../../../shared/games/ludo/types";

interface Playback {
  /** One game from the next (its start time). */
  gameKey: number;
  moves: number;
  /** The action playing out, or null once it has (or after a jump: reconnecting, a new game). */
  action: LudoAction | null;
  /** How far into it, in ms. */
  ms: number;
}

/**
 * Plays each action out on screen from the moment it arrives, the same on every phone (the die, the pawn's hops, pawns
 * captured flying home), frame by frame; `ms` is how far in. The game itself has already moved on: what the screen
 * works out from it (whose turn, who finished, the ending) waits while `action` is set. A jump just shows the board.
 */
export function useActionPlayback(game: LudoState, gameKey: number): { action: LudoAction | null; ms: number } {
  const [stored, setPlayback] = useState<Playback>({ gameKey, moves: game.moves, action: null, ms: 0 });
  // A new action starts in this very render, so nothing on screen sees the game's new state a frame early.
  let playback = stored;
  if (playback.gameKey !== gameKey || playback.moves !== game.moves) {
    const next = playback.gameKey === gameKey && game.moves === playback.moves + 1;
    playback = { gameKey, moves: game.moves, action: next ? game.last : null, ms: 0 };
    setPlayback(playback);
  }

  const { action } = playback;
  useEffect(() => {
    if (!action) return;
    const length = actionMs(action);
    let start: number | null = null;
    let frame = 0;
    const tick = (time: number) => {
      start ??= time;
      const ms = time - start;
      setPlayback((p) => (p.action !== action ? p : ms < length ? { ...p, ms } : { ...p, action: null, ms: 0 }));
      if (ms < length) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [action]);

  return { action, ms: playback.ms };
}
