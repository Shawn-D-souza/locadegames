import { useEffect, useRef } from "react";
import type { DotsClashState } from "../../../shared/games/dotsclash/types";
import type { PlayerId } from "../../../shared/rooms/types";
import { playHaptic } from "../../services/hapticPlayer";
import { playSound, playSoundSequence } from "../../services/soundPlayer";
import { timerTake, timerVolume } from "../../sound/cues/clockCues";
import { matchEndingSteps, type EndingTone } from "../../sound/cues/endingCues";
import { BURST_TAKES } from "./sounds";
import type { BoardMoment } from "./useChainPlayback";

/** Someone else's dot sits back a little; watching, a little more. */
const OTHERS_VOLUME = 0.8;
const WATCHING_VOLUME = 0.65;
/** The starts revealed: each player's note in turn, this far apart (a quick run up the scale; the board shows them at once). */
const REVEAL_STAGGER_MS = 70;
/** Your own chain is felt from this wave on as a heavier pulse: it has run on a while. */
const BIG_CHAIN_FROM = 3;

interface DotsClashSoundOptions {
  /** One game from the next. */
  gameKey: number;
  game: DotsClashState;
  /** Player id of each seat. */
  seatIds: readonly PlayerId[];
  /** Your seat, or null watching. */
  mySeat: number | null;
  moment: BoardMoment;
  /** A chain is still playing out on screen: what it did is heard once it settles. */
  playing: boolean;
  /** Your turn's last seconds, when showing. */
  countdown: number | null;
  /** Set once the game is over and its chain has settled. */
  ending: EndingTone | null;
}

/**
 * The game's sounds and feels, timed to the board on screen: your secret pick, every start revealed (each player's
 * note), each dot landing, each wave of a chain bursting a step higher, then who the chain knocked out (you, or
 * anyone else; losing some cells makes no sound: owner decision), your turn coming round, your last seconds, and the
 * ending. Felt: the starts revealed, each wave of your own chain, a knockout by your chain, your turn (your tap is felt
 * in `DotsCell`, being knocked out through its sound).
 */
export function useDotsClashSounds({ gameKey, game, seatIds, mySeat, moment, playing, countdown, ending }: DotsClashSoundOptions) {
  const watching = mySeat === null;
  // Your secret pick went in: your own note (nobody else hears where).
  const myPicked = mySeat !== null && game.phase === "pick" && game.picks[mySeat] !== null;
  useEffect(() => {
    if (myPicked) playSound("dotsClashStartPicked", { variant: seatIds[mySeat!] });
    // Once per pick: the seat and its color don't change during a game.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPicked]);

  // The starts revealed, or a tap: its dot lands now; what it did waits for its chain.
  const seen = useRef({ gameKey, game });
  const settled = useRef<{ before: DotsClashState; after: DotsClashState } | null>(null);
  useEffect(() => {
    const before = seen.current;
    seen.current = { gameKey, game };
    if (before.gameKey !== gameKey || game.moves !== before.game.moves + 1) return;
    const tap = game.lastMove;
    const volumeOf = (seat: number) => (watching ? WATCHING_VOLUME : seat === mySeat ? 1 : OTHERS_VOLUME);
    if (before.game.phase === "pick" && game.phase === "play") {
      const starts = seatIds.flatMap((id, seat) => (game.owners.includes(seat) ? [{ id, seat }] : []));
      playSoundSequence(
        starts.map(({ id, seat }, order) => ({ sound: "dotsClashStartPicked", at: order * REVEAL_STAGGER_MS, variant: id, volume: volumeOf(seat) })),
      );
      if (!watching) playHaptic("dotsClashStartsRevealed");
    } else if (tap !== null) {
      playSound("dotsClashDotAdded", { variant: Math.min(before.game.dots[tap.cell]!, 2), volume: volumeOf(tap.seat) });
    } else return;
    settled.current = { before: before.game, after: game };
    // The board's latest state is read when the move count changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey, game.moves]);

  // Each wave of a chain, a step higher; every wave of your own is felt, heavier once it runs on.
  useEffect(() => {
    if (moment.bursting.length === 0) return;
    playSound("dotsClashBurst", { variant: Math.min(moment.wave, BURST_TAKES - 1) });
    if (mySeat !== null && game.lastMove?.seat === mySeat) playHaptic(moment.wave < BIG_CHAIN_FROM ? "dotsClashBurst" : "dotsClashBigBurst");
    // One sound per wave: the moment changes once per wave.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moment]);

  // The chain has settled: who it knocked out.
  useEffect(() => {
    const change = settled.current;
    if (playing || !change) return;
    settled.current = null;
    const { before, after } = change;
    const wentOut = after.outAt.flatMap((at, seat) => (at !== null && before.outAt[seat] === null && !after.quit[seat] ? [seat] : []));
    if (mySeat !== null && wentOut.includes(mySeat)) playSound("dotsClashYouAreOut", { variant: seatIds[mySeat] });
    else if (wentOut.length > 0) {
      playSound("dotsClashPlayerOut", { variant: seatIds[wentOut[0]!], volume: watching ? WATCHING_VOLUME : 1 });
      // Your chain did it: felt (someone else's knockout isn't).
      if (mySeat !== null && after.lastMove?.seat === mySeat) playHaptic("dotsClashKnockedSomeoneOut");
    }
    if (mySeat !== null && !after.over && after.turn === mySeat && before.turn !== mySeat) playHaptic("dotsClashYourTurn");
    // Settles once per chain; the seats' players don't change during a game.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, mySeat, watching]);

  useEffect(() => {
    if (countdown !== null && countdown > 0) playSound("timerTick", { variant: timerTake(countdown), volume: timerVolume(countdown) });
  }, [countdown]);

  useEffect(() => {
    if (ending === null) return;
    const handle = playSoundSequence(matchEndingSteps(ending, { lastMove: null, line: false }));
    return () => handle.stop();
  }, [ending, gameKey]);
}
