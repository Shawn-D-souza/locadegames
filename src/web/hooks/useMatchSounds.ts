import { useEffect, useRef } from "react";
import type { TicTacToeState } from "../../shared/games/tictactoe/types";
import type { PlayerId } from "../../shared/rooms/types";
import { lastMarkSound } from "../games/tictactoe/sounds";
import { playSound, playSoundSequence } from "../services/soundPlayer";
import { matchEndingSteps, type EndingTone } from "../sound/cues/endingCues";
import { timerTake, timerVolume } from "../sound/cues/clockCues";

/** A mark you didn't place sits back a little; watching, a little more. */
const OPPONENT_VOLUME = 0.8;
const WATCHING_VOLUME = 0.65;
interface MatchSoundOptions {
  /** One match of one tournament. */
  matchKey: string;
  game: TicTacToeState;
  ending: EndingTone | null;
  /** Who quit, if someone did: there's no last move or win line then. */
  leaver: PlayerId | null;
  yourTurn: boolean;
  watching: boolean;
  /** Your turn's last seconds, when showing. */
  countdown: number | null;
}

/** A turn-based match's sounds: each mark landing (the opponent's is your cue to move, so your turn has no sound of its own), your last seconds, and the ending in time with its animation. */
export function useMatchSounds({ matchKey, game, ending, leaver, yourTurn, watching, countdown }: MatchSoundOptions) {
  const movesPlayed = game.board.filter((cell) => cell !== null).length;
  const lastSeen = useRef({ matchKey, moves: movesPlayed, yourTurn });
  useEffect(() => {
    const seen = lastSeen.current;
    const sameMatch = seen.matchKey === matchKey;
    const moved = sameMatch && movesPlayed > seen.moves;
    if (ending === null) {
      const mark = moved ? lastMarkSound(game) : null;
      const mine = seen.yourTurn;
      if (mark) playSound(mark.sound, { variant: mark.variant, volume: watching ? WATCHING_VOLUME : mine ? 1 : OPPONENT_VOLUME });
    }
    lastSeen.current = { matchKey, moves: movesPlayed, yourTurn };
    // The board's latest state is read when the move count or match changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchKey, movesPlayed, ending, yourTurn, watching]);

  useEffect(() => {
    if (countdown !== null && countdown > 0) playSound("timerTick", { variant: timerTake(countdown), volume: timerVolume(countdown) });
  }, [countdown]);

  // Plays the moment the ending starts on screen; a tap that skips it cuts the sound short with it.
  const endingGame = useRef(game);
  useEffect(() => {
    endingGame.current = game;
  });
  const quit = leaver !== null;
  useEffect(() => {
    if (ending === null) return;
    const mark = quit ? null : lastMarkSound(endingGame.current);
    const handle = playSoundSequence(
      matchEndingSteps(ending, {
        lastMove: mark && { sound: mark.sound, variant: mark.variant, volume: ending === "lose" ? OPPONENT_VOLUME : ending === "watch" ? WATCHING_VOLUME : 1 },
        line: !quit && endingGame.current.winningLine !== null,
      }),
    );
    return () => handle.stop();
  }, [ending, quit, matchKey]);
}
