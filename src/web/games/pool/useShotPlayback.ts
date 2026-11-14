import { useEffect, useState } from "react";
import { shotMs } from "../../../shared/games/pool/config";
import type { PoolShotResult, PoolState } from "../../../shared/games/pool/types";
import { shotFrames, type ShotFrames } from "./shotFrames";

/** A shot playing out on screen. */
export interface ShotPlayback {
  shot: PoolShotResult;
  frames: ShotFrames;
  /** How far in (ms): the cue's strike first (`leadMs`), then the roll, then the settle. */
  ms: number;
  /** When it started, on this phone's clock (`Date.now`). */
  startedAt: number;
}

interface Stored {
  gameKey: number;
  moves: number;
  shot: PoolShotResult | null;
  frames: ShotFrames | null;
  /** When the shot started, on this phone's clock (`Date.now`). */
  startedAt: number;
}

/**
 * Plays each shot out on screen, at the same moment on every phone: the server took the shot at
 * `turnStartedAt - shotMs` on its clock (its next turn starts once the shot has played out), so each phone starts it
 * then on its own clock, and a phone the shot reached late skips its first moments (the balls' path is the same on
 * every phone to the last digit, so skipping ahead lands exactly where everyone else is). The game itself has already
 * moved on: what the screen works out from it (whose turn, who is out, the ending) waits while a shot plays. A jump
 * (reconnecting, a new game) just shows the table.
 */
export function useShotPlayback(game: PoolState, gameKey: number, turnStartedAt: number, clockOffsetMs: number): ShotPlayback | null {
  const [stored, setStored] = useState<Stored>({ gameKey, moves: game.moves, shot: null, frames: null, startedAt: 0 });
  // A new shot starts in this very render, so nothing on screen sees the game's new state a frame early.
  let playback = stored;
  if (playback.gameKey !== gameKey || playback.moves !== game.moves) {
    const last = game.last;
    const next = playback.gameKey === gameKey && game.moves === playback.moves + 1 && last?.kind === "shot";
    // A shot long over (a phone waking up) ends on its first frame.
    const startedAt = next ? turnStartedAt - shotMs(last.steps) - clockOffsetMs : 0;
    playback = { gameKey, moves: game.moves, shot: next ? last : null, frames: next ? shotFrames(last) : null, startedAt };
    setStored(playback);
  }

  const [now, setNow] = useState(() => Date.now());
  const { shot, startedAt } = playback;
  useEffect(() => {
    if (!shot) return;
    const end = startedAt + shotMs(shot.steps);
    let frame = 0;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      if (time < end) frame = requestAnimationFrame(tick);
      else setStored((s) => (s.shot === shot ? { ...s, shot: null, frames: null } : s));
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [shot, startedAt]);

  if (!playback.shot || !playback.frames) return null;
  return { shot: playback.shot, frames: playback.frames, ms: Math.max(0, now - startedAt), startedAt };
}
