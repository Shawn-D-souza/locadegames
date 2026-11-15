import { useEffect, useRef } from "react";
import { DOTSBOXES_CONFIG } from "../../../shared/games/dotsboxes/config";
import type { DotsBoxesState } from "../../../shared/games/dotsboxes/types";
import { playHaptic } from "../../services/hapticPlayer";
import { playSound, playSoundSequence } from "../../services/soundPlayer";
import { timerTake, timerVolume } from "../../sound/cues/clockCues";
import { matchEndingSteps, type EndingTone } from "../../sound/cues/endingCues";
import { BOX_TAKES, LINE_TAKES } from "./sounds";

/** Someone else's line and boxes sit back a little; watching, a little more. */
const OTHERS_VOLUME = 0.8;
const WATCHING_VOLUME = 0.65;
/** Two boxes won by one line: the second pops this long after the first. */
const SECOND_BOX_MS = 90;

interface DotsBoxesSoundOptions {
  /** One game from the next. */
  gameKey: number;
  game: DotsBoxesState;
  /** Your seat, or null watching. */
  mySeat: number | null;
  /** Your turn's last seconds, when showing. */
  countdown: number | null;
  /** Set once the game is over. */
  ending: EndingTone | null;
}

/**
 * The game's sounds, timed to the board: every line's pen stroke as it draws in, then each box it won popping in, a
 * step higher for every box the same player wins in a row (yours fuller, and felt); your turn coming round (felt);
 * your last seconds; the ending. Your line is felt in `LineTarget` as your finger lands.
 */
export function useDotsBoxesSounds({ gameKey, game, mySeat, countdown, ending }: DotsBoxesSoundOptions) {
  const watching = mySeat === null;
  const seen = useRef({ gameKey, game, run: 0 });
  useEffect(() => {
    const before = seen.current;
    const move = game.lastMove;
    const next = before.gameKey === gameKey && game.moves === before.game.moves + 1 && move !== null;
    // Boxes won in a row by the same player in one turn: the run climbs.
    const sameTurn = next && before.game.lastMove?.seat === move.seat && before.game.lastMove.boxes.length > 0;
    const run = next ? (sameTurn ? before.run : 0) + move.boxes.length : 0;
    seen.current = { gameKey, game, run };
    if (!next) return;
    const volume = watching ? WATCHING_VOLUME : move.seat === mySeat ? 1 : OTHERS_VOLUME;
    playSound("dotsBoxesLine", { variant: game.moves % LINE_TAKES, volume });
    const box = move.seat === mySeat ? "dotsBoxesYourBox" : "dotsBoxesBox";
    const first = run - move.boxes.length;
    playSoundSequence(
      move.boxes.map((_, i) => ({ sound: box, at: DOTSBOXES_CONFIG.lineMs + i * SECOND_BOX_MS, variant: Math.min(first + i, BOX_TAKES - 1), volume })),
    );
    if (mySeat !== null && !game.over && game.turn === mySeat && before.game.turn !== mySeat) playHaptic("dotsBoxesYourTurn");
    // The board's latest state is read when the move count changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey, game.moves]);

  useEffect(() => {
    if (countdown !== null && countdown > 0) playSound("timerTick", { variant: timerTake(countdown), volume: timerVolume(countdown) });
  }, [countdown]);

  useEffect(() => {
    if (ending === null) return;
    const handle = playSoundSequence(matchEndingSteps(ending, { lastMove: null, line: false }));
    return () => handle.stop();
  }, [ending, gameKey]);
}
