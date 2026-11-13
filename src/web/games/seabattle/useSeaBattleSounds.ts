import { useEffect, useRef } from "react";
import type { Seat } from "../../../shared/games/types";
import { durations } from "../../../theme";
import { playHaptic, playHapticSequence } from "../../services/hapticPlayer";
import { playSound, playSoundSequence } from "../../services/soundPlayer";
import { CANNON_READY_VOLUME, landingCue, shotVolume, type ImpactKind } from "./seaBattleCues";
import type { Volley } from "./useVolley";

interface SeaBattleSoundOptions {
  /** Your seat, or null watching. */
  viewer: Seat | null;
  /** Whose cannon is on the stage, as it shows it (null placing and at the end). */
  shooter: Seat | null;
  /** The ball on its way. */
  volley: Volley | null;
  /** It landed, with what it did. */
  landed: { key: number; shooter: Seat; kind: ImpactKind } | null;
  /** The cell you're aiming at while you hold. */
  aim: number | null;
}

/**
 * Sea Battle's firing, heard and felt on the stage's own timeline (not when the room view comes in): a cannon's
 * boom as its ball leaves (yours felt as you let go), the landing (a splash, or a blast, felt when it's your shot or
 * your ship), the next shooter's cannon clunking in once the boards have traded places (felt when it's yours), and a
 * click as your aim moves cell to cell. The last shot and the ending are the match screen's (`look.lastMarkSound`).
 */
export function useSeaBattleSounds({ viewer, shooter, volley, landed, aim }: SeaBattleSoundOptions) {
  useEffect(() => {
    if (!volley) return;
    // The other's cannon swings onto its cell first (silently); yours fires as you let go.
    playSoundSequence([{ sound: "seaBattleCannonFire", at: volley.delayMs, volume: shotVolume(volley.shooter, viewer) }]);
    if (volley.shooter === viewer) playHaptic("seaBattleFire");
    // Once per ball: a volley keeps its key from leaving the muzzle to landing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volley?.key]);

  useEffect(() => {
    if (!landed) return;
    const { sound, volume, feel } = landingCue(landed.kind, landed.shooter, viewer);
    playSound(sound, { volume });
    // A sinking's own feel takes over from the hit's.
    if (feel) playHaptic(feel);
    // Once per landing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landed?.key]);

  // The next shooter's cannon comes in as the boards finish trading places (also as firing starts). Not on the way in.
  const lastShooter = useRef(shooter);
  useEffect(() => {
    const before = lastShooter.current;
    lastShooter.current = shooter;
    if (shooter === null || shooter === before) return;
    playSoundSequence([{ sound: "seaBattleCannonReady", at: durations.boardSwap, volume: shotVolume(shooter, viewer) * CANNON_READY_VOLUME }]);
    if (shooter === viewer) playHapticSequence([{ haptic: "seaBattleYourTurn", at: durations.boardSwap }]);
    // Once per change of shooter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shooter]);

  useEffect(() => {
    if (aim !== null) playSound("seaBattleAim");
  }, [aim]);
}
