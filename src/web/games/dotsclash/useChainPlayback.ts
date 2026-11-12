import { useEffect, useMemo, useState } from "react";
import { chainFrames, type ChainFrame } from "../../../shared/games/dotsclash/rules";
import type { DotsClashState } from "../../../shared/games/dotsclash/types";
import { DOTSCLASH_CONFIG } from "../../../shared/games/dotsclash/config";

/** What the board shows right now: the game, or a moment of the last tap's chain playing out. */
export interface BoardMoment {
  owners: DotsClashState["owners"];
  dots: number[];
  /** Cells bursting in this wave (their dots are flying to the neighbours). */
  bursting: number[];
  /** Which wave this is (0 = the first), for its sound. */
  wave: number;
  /** How long this moment shows. */
  ms: number;
}

interface Playback {
  /** One game from the next (its start time). */
  gameKey: number;
  moves: number;
  /** The game as it was before this tap: the next tap's chain starts from it. */
  game: DotsClashState;
  frames: ShownFrame[];
  index: number;
}

/** One moment of a chain on screen, how long it shows, and its wave. */
interface ShownFrame extends ChainFrame {
  ms: number;
  wave: number;
}

/**
 * A tap's frames as shown: the dot landing, then every wave the same time (never sped up or skipped): its dots fly,
 * then the board rests a moment with them landed, so a cell filling up to 4 is seen before it bursts. Adds up to
 * `chainMs`, which the next turn's clock waits for.
 */
function onScreen(chain: readonly ChainFrame[]): ShownFrame[] {
  const { landMs, waveMs, flyMs } = DOTSCLASH_CONFIG;
  return chain.flatMap((frame, index) => {
    const atRest = { ...frame, bursting: [], ms: index === 0 ? landMs : waveMs - flyMs, wave: Math.max(0, index - 1) };
    return frame.bursting.length > 0 ? [atRest, { ...frame, ms: flyMs, wave: index }] : [atRest];
  });
}

/**
 * Plays each tap's whole chain wave by wave, every wave the same length, from the same rules the server ran (so every
 * phone sees the same thing), then settles on the game as it is. The starts being revealed land together, like a tap's
 * dot. A new tap while one is still playing starts at once; a jump (reconnecting, a new game) shows the board as it
 * stands.
 */
export function useChainPlayback(game: DotsClashState, gameKey: number): { moment: BoardMoment; playing: boolean } {
  const [stored, setPlayback] = useState<Playback>({ gameKey, moves: game.moves, game, frames: [], index: 0 });
  // A new move starts its chain in this very render: what the screen works out from it (a knockout's notice, the
  // ending) must already see the chain playing, never the game's new state a render early.
  let playback = stored;
  if (playback.gameKey !== gameKey || playback.moves !== game.moves) {
    const tap = game.lastMove;
    const next = playback.gameKey === gameKey && game.moves === playback.moves + 1;
    const revealed = next && playback.game.phase === "pick" && game.phase === "play";
    const frames = revealed
      ? [{ owners: game.owners, dots: game.dots, bursting: [], ms: DOTSCLASH_CONFIG.landMs, wave: 0 }]
      : next && tap !== null
        ? onScreen(chainFrames(playback.game, tap.seat, tap.cell))
        : [];
    playback = { gameKey, moves: game.moves, game, frames, index: 0 };
    setPlayback(playback);
  } else if (playback.game !== game) {
    // Same turn, something else changed (a player quit): the next chain starts from this.
    playback = { ...playback, game };
    setPlayback(playback);
  }

  const { frames, index } = playback;
  useEffect(() => {
    if (index >= frames.length) return;
    const timer = setTimeout(() => setPlayback((p) => (p.frames === frames ? { ...p, index: p.index + 1 } : p)), frames[index]!.ms);
    return () => clearTimeout(timer);
  }, [frames, index]);

  const frame = frames[index];
  // The same object for as long as the same moment shows, so sounds play once per wave.
  const moment = useMemo<BoardMoment>(
    () =>
      frame
        ? { owners: frame.owners, dots: frame.dots, bursting: frame.bursting, wave: frame.wave, ms: frame.ms }
        : { owners: game.owners, dots: game.dots, bursting: [], wave: 0, ms: 0 },
    [frame, game.owners, game.dots],
  );
  return { moment, playing: frame !== undefined };
}
