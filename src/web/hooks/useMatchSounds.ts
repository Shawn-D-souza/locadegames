import { useEffect, useRef } from "react";
import type { GameState } from "../../shared/games/registry";
import type { Seat } from "../../shared/games/types";
import type { PlayerId } from "../../shared/rooms/types";
import type { MatchLook } from "../games/matchLook";
import { playHaptic } from "../services/hapticPlayer";
import { playSound, playSoundSequence } from "../services/soundPlayer";
import { matchEndingSteps, type EndingTone } from "../sound/cues/endingCues";
import { timerTake, timerVolume } from "../sound/cues/clockCues";

/** A mark you didn't place sits back a little; watching, a little more. */
const OPPONENT_VOLUME = 0.8;
const WATCHING_VOLUME = 0.65;
interface MatchSoundOptions {
  /** One match of one tournament. */
  matchKey: string;
  game: GameState;
  /** The game's look: which sounds its moves make. */
  look: MatchLook<GameState>;
  ending: EndingTone | null;
  /** Who quit, if someone did: there's no last move or win line then. */
  leaver: PlayerId | null;
  yourTurn: boolean;
  /** Your seat in the match, or null watching. */
  viewer: Seat | null;
  /** Your turn's last seconds, when showing. */
  countdown: number | null;
}

/** A turn-based match's sounds and what they feel like: each move landing (the opponent's is your cue to move, so your turn has no sound of its own; you feel it too), your last seconds, and the ending in time with its animation. */
export function useMatchSounds({ matchKey, game, look, ending, leaver, yourTurn, viewer, countdown }: MatchSoundOptions) {
  const watching = viewer === null;
  const movesPlayed = look.movesPlayed(game);
  const lastSeen = useRef({ matchKey, moves: movesPlayed, yourTurn, game });
  useEffect(() => {
    const seen = lastSeen.current;
    const sameMatch = seen.matchKey === matchKey;
    const moved = sameMatch && movesPlayed > seen.moves;
    if (ending === null && moved) {
      const mine = seen.yourTurn;
      const volume = watching ? WATCHING_VOLUME : mine ? 1 : OPPONENT_VOLUME;
      const steps = look.moveSteps(seen.game, game, viewer);
      if (steps.length) playSoundSequence(steps.map((step) => ({ ...step, volume: (step.volume ?? 1) * volume })));
      // Your own mark was felt when you tapped; watchers feel none of them.
      if (steps.length && !mine && !watching && look.opponentMoved) playHaptic(look.opponentMoved);
    }
    lastSeen.current = { matchKey, moves: movesPlayed, yourTurn, game };
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
    const mark = quit ? null : look.lastMarkSound(endingGame.current);
    const handle = playSoundSequence(
      matchEndingSteps(ending, {
        lastMove: mark && { sound: mark.sound, variant: mark.variant, volume: ending === "lose" ? OPPONENT_VOLUME : ending === "watch" ? WATCHING_VOLUME : 1 },
        line: !quit && look.winningLine(endingGame.current) !== null,
      }),
    );
    return () => handle.stop();
    // A match's look never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ending, quit, matchKey]);
}
