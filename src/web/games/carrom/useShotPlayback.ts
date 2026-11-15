import { useEffect, useState } from "react";
import { shotMs } from "../../../shared/games/carrom/config";
import type { CarromShotResult, CarromState } from "../../../shared/games/carrom/types";
import { localMs, shownMs } from "./playbackClock";
import { shotFrames, type ShotFrames } from "./shotFrames";

/** Your own shot, worked out on this phone the moment you let go (the server's result will be the same, to the last digit). */
export interface LocalShot {
  gameKey: number;
  /** The game's move count when it was flicked: the turn it belongs to. */
  from: number;
  /** The game after it, as this phone worked it out. */
  state: CarromState;
  /** When you let go, on this phone's clock (`Date.now`). */
  startedAt: number;
}

/** A shot playing out on screen. */
export interface ShotPlayback {
  shot: CarromShotResult;
  frames: ShotFrames;
  /** How far in (ms): the slide, then the settle. */
  ms: number;
  /** When it started on this phone (`Date.now`), and how long after it was flicked that was (0: your own). */
  startedAt: number;
  lag: number;
  /** Someone else's has started on this phone (it does on the first frame after it arrived): its sounds wait for it. */
  started: boolean;
}

interface Stored {
  gameKey: number;
  moves: number;
  shot: CarromShotResult | null;
  frames: ShotFrames | null;
  /** When it started on this phone (`Date.now`): your own when you let go; someone else's on the first frame after it arrived (null until then). */
  startedAt: number | null;
  /** When the server took it, on this phone's clock: how far behind the shooter's this phone is comes from it. */
  serverTook: number;
  lag: number;
  /** The server's copy of this shot has been checked against the one this phone played. */
  checked: CarromShotResult | null;
}

/** Whether two copies of a shot are the same shot from the same coins (the server's and this phone's). */
function sameShot(a: CarromShotResult, b: CarromShotResult): boolean {
  return a.seat === b.seat && JSON.stringify(a.shot) === JSON.stringify(b.shot) && JSON.stringify(a.before) === JSON.stringify(b.before);
}

/**
 * Plays each shot out on screen. Your own starts the moment you let go (owner direction: instant), from the game as this
 * phone worked it out; when the server's copy comes back it's the same shot, so nothing changes (if it ever differs, the
 * server's plays instead). Someone else's starts as it arrives, from the beginning, and catches up with the shooter's
 * (`playbackClock`): the server took it at `turnStartedAt - shotMs` on its clock. The game itself has already moved on:
 * what the screen works out from it (whose turn, the points, the ending) waits while a shot plays. A jump (reconnecting,
 * a new game) just shows the board.
 */
export function useShotPlayback(game: CarromState, gameKey: number, turnStartedAt: number, clockOffsetMs: number, local: LocalShot | null): ShotPlayback | null {
  const [stored, setStored] = useState<Stored>({ gameKey, moves: game.moves, shot: null, frames: null, startedAt: 0, serverTook: 0, lag: 0, checked: null });
  const mine = local && local.gameKey === gameKey && local.from === game.moves ? local : null;
  const target = mine ? mine.state : game;
  const serverTook = (shot: CarromShotResult) => turnStartedAt - shotMs(shot.steps) - clockOffsetMs;

  // A new shot starts in this very render, so nothing on screen sees the game's new state a frame early.
  let playback = stored;
  if (playback.gameKey !== gameKey || playback.moves !== target.moves) {
    const last = target.last;
    const next = playback.gameKey === gameKey && target.moves === playback.moves + 1 && last?.kind === "shot";
    playback = {
      gameKey,
      moves: target.moves,
      shot: next ? last : null,
      frames: next ? shotFrames(last) : null,
      startedAt: mine ? mine.startedAt : null,
      serverTook: next && !mine ? serverTook(last) : 0,
      lag: 0,
      checked: mine ? null : next ? last : null,
    };
    setStored(playback);
  } else if (!mine && playback.shot && game.last?.kind === "shot" && playback.checked !== game.last) {
    // The server's copy of the shot this phone is playing: the same (it always should be), or play the server's.
    const same = sameShot(playback.shot, game.last);
    playback = same
      ? { ...playback, checked: game.last }
      : { ...playback, shot: game.last, frames: shotFrames(game.last), startedAt: null, serverTook: serverTook(game.last), checked: game.last };
    setStored(playback);
  }

  const [now, setNow] = useState(() => Date.now());
  const { shot, startedAt, lag } = playback;
  useEffect(() => {
    if (!shot) return;
    let frame = 0;
    const tick = () => {
      const time = Date.now();
      // Someone else's shot starts on the first frame after it arrived, as far behind the shooter's as it is.
      if (startedAt === null) {
        setStored((s) => (s.shot === shot ? { ...s, startedAt: time, lag: Math.max(0, time - s.serverTook) } : s));
        return;
      }
      const end = startedAt + localMs(shotMs(shot.steps), lag);
      setNow(time);
      if (time < end) frame = requestAnimationFrame(tick);
      else setStored((s) => (s.shot === shot ? { ...s, shot: null, frames: null } : s));
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [shot, startedAt, lag]);

  if (!playback.shot || !playback.frames) return null;
  // Not started yet (someone else's, until its first frame): its first moment.
  const ms = startedAt === null ? 0 : shownMs(Math.max(0, now - startedAt), lag);
  return { shot: playback.shot, frames: playback.frames, ms, startedAt: startedAt ?? 0, lag, started: startedAt !== null };
}
