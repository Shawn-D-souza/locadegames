import { useEffect, useState } from "react";
import { rollMs } from "../../../shared/games/snakesladders/config";
import type { SnakesLaddersState, SnakesRoll } from "../../../shared/games/snakesladders/types";

interface Playback {
  /** One game from the next (its start time). */
  gameKey: number;
  moves: number;
  /** The roll playing out, or null once it has (or after a jump: reconnecting, a new game). */
  roll: SnakesRoll | null;
  /** How far into it, in ms. */
  ms: number;
}

/**
 * Plays each roll out on screen from the moment it arrives, the same on every phone (the die, the hops, the ladder or
 * snake), frame by frame; `ms` is how far in. The game itself has already moved on: what the screen works out from
 * it (whose turn, who finished, the ending) waits while `roll` is set. A jump (reconnecting) just shows the board.
 */
export function useRollPlayback(game: SnakesLaddersState, gameKey: number): { roll: SnakesRoll | null; ms: number } {
  const [stored, setPlayback] = useState<Playback>({ gameKey, moves: game.moves, roll: null, ms: 0 });
  // A new roll starts in this very render, so nothing on screen sees the game's new state a frame early.
  let playback = stored;
  if (playback.gameKey !== gameKey || playback.moves !== game.moves) {
    const next = playback.gameKey === gameKey && game.moves === playback.moves + 1;
    playback = { gameKey, moves: game.moves, roll: next ? game.lastRoll : null, ms: 0 };
    setPlayback(playback);
  }

  const { roll } = playback;
  useEffect(() => {
    if (!roll) return;
    const length = rollMs(roll);
    let start: number | null = null;
    let frame = 0;
    const tick = (time: number) => {
      start ??= time;
      const ms = time - start;
      setPlayback((p) => (p.roll !== roll ? p : ms < length ? { ...p, ms } : { ...p, roll: null, ms: 0 }));
      if (ms < length) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [roll]);

  return { roll, ms: playback.ms };
}
