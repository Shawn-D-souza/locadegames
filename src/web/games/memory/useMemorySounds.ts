import { useEffect, useRef } from "react";
import { MEMORY_CONFIG } from "../../../shared/games/memory/config";
import type { MemoryState } from "../../../shared/games/memory/types";
import { playHaptic } from "../../services/hapticPlayer";
import { playSound, playSoundSequence } from "../../services/soundPlayer";
import { timerTake, timerVolume } from "../../sound/cues/clockCues";
import { matchEndingSteps, type EndingTone } from "../../sound/cues/endingCues";
import { FLIP_TAKES, PAIR_TAKES } from "./sounds";

/** Someone else's cards sit back a little; watching, a little more. */
const OTHERS_VOLUME = 0.8;
const WATCHING_VOLUME = 0.65;

interface MemorySoundOptions {
  /** One game from the next. */
  gameKey: number;
  game: MemoryState;
  /** Your seat, or null watching. */
  mySeat: number | null;
  /** Your turn's last seconds, when showing. */
  countdown: number | null;
  /** Set once the game is over. */
  ending: EndingTone | null;
}

/**
 * The game's sounds, timed to the cards: every card's flick as it turns over; then, for a turn's second card, the pair
 * ringing (a step higher for every pair the same player finds in a row; yours fuller, and felt) or the miss falling and,
 * once it has shown, its cards turning back; your turn coming round (felt); your last seconds; the ending. Your tap is
 * felt in `MemoryCard` as your finger lands.
 */
export function useMemorySounds({ gameKey, game, mySeat, countdown, ending }: MemorySoundOptions) {
  const watching = mySeat === null;
  const seen = useRef({ gameKey, game, run: 0 });
  useEffect(() => {
    const before = seen.current;
    const move = game.lastMove;
    const next = before.gameKey === gameKey && game.moves === before.game.moves + 1 && move !== null;
    const second = next && move.cards.length === 2;
    // Pairs found in a row by the same player: the run climbs (a first card keeps it, a miss ends it).
    const sameRun = next && before.game.lastMove?.seat === move.seat && (before.game.lastMove.matched || before.game.lastMove.cards.length === 1);
    const run = !next ? 0 : !second ? (sameRun ? before.run : 0) : move.matched ? (sameRun ? before.run : 0) + 1 : 0;
    seen.current = { gameKey, game, run };
    if (!next) return;
    const volume = watching ? WATCHING_VOLUME : move.seat === mySeat ? 1 : OTHERS_VOLUME;
    playSound("memoryFlip", { variant: game.moves % FLIP_TAKES, volume });
    const { flipMs, missShowMs } = MEMORY_CONFIG;
    if (second && move.matched) {
      const pair = move.seat === mySeat ? "memoryYourPair" : "memoryPair";
      playSoundSequence([{ sound: pair, at: flipMs, variant: Math.min(run - 1, PAIR_TAKES - 1), volume }]);
    } else if (second) {
      playSoundSequence([
        { sound: "memoryMiss", at: flipMs, volume },
        { sound: "memoryTurnBack", at: flipMs + missShowMs, volume },
      ]);
    }
    // The game's latest state is read when the move count changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey, game.moves]);

  // The turn coming round to you, after someone's miss or their quit, is a nudge.
  const myTurn = mySeat !== null && !game.over && game.turn === mySeat;
  const wasMine = useRef(myTurn);
  useEffect(() => {
    if (myTurn && !wasMine.current) playHaptic("memoryYourTurn");
    wasMine.current = myTurn;
  }, [myTurn]);

  useEffect(() => {
    if (countdown !== null && countdown > 0) playSound("timerTick", { variant: timerTake(countdown), volume: timerVolume(countdown) });
  }, [countdown]);

  useEffect(() => {
    if (ending === null) return;
    const handle = playSoundSequence(matchEndingSteps(ending, { lastMove: null, line: false }));
    return () => handle.stop();
  }, [ending, gameKey]);
}
