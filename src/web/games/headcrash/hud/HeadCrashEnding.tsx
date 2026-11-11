import { useEffect, useRef, type CSSProperties } from "react";
import type { PlayerId } from "../../../../shared/rooms/types";
import { colors, getPlayerColor } from "../../../../theme";
import { Particles } from "../../../components/Particles";
import { ResultTag, type ResultTone } from "../../../components/ResultTag";
import { CLIENT_CONFIG } from "../../../config";
import { playSoundSequence } from "../../../services/soundPlayer";
import { spawnConfetti, spawnStars } from "../../../utils/particles";
import { playerStyle } from "../../../utils/playerStyle";
import { seededRandom } from "../../../utils/seededRandom";
import { HEADCRASH_CLIENT_CONFIG } from "../config";
import { headCrashEndingSteps } from "../headCrashCues";

interface HeadCrashEndingProps {
  tone: ResultTone;
  label: string;
  /** Tournament points this result earned you; null hides them. */
  points: number | null;
  /** Why it ended, when unusual ("Ana quit"). */
  detail: string | null;
  /** Whose color the tag takes: the winner's (yours for a win). */
  colorId: PlayerId;
  myId: PlayerId;
}

const HUD = HEADCRASH_CLIENT_CONFIG.hud;

/**
 * The end of the match, over the arena (where the last hit has just played): a result tag stamps on near the
 * bottom, like every game's. Your win: in your color, tilted, a trophy, points counting up, confetti and stars.
 */
export function HeadCrashEnding({ tone, label, points, detail, colorId, myId }: HeadCrashEndingProps) {
  const tagRef = useRef<HTMLDivElement>(null);

  // (The whole thing plays out: taps don't skip it.)
  useEffect(() => {
    const handle = playSoundSequence(headCrashEndingSteps(tone));
    return () => handle.stop();
  }, [tone]);

  const burst = () => {
    const random = seededRandom(CLIENT_CONFIG.particles.seed);
    const mine = getPlayerColor(myId);
    const tag = tagRef.current?.getBoundingClientRect();
    const middle = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    return [
      ...spawnConfetti(random, middle, [mine.base, mine.dark, mine.tint, colors.white, colors.waiting], HUD.endTagAtMs),
      ...(tag ? spawnStars(random, { x: tag.left + tag.width / 2, y: tag.bottom }, colors.waiting, HUD.endTagAtMs) : []),
    ];
  };

  return (
    <>
      {/* The tag straddles this box's bottom edge; the stamp waits for the last hit to play out. */}
      <div
        ref={tagRef}
        className="pointer-events-none absolute inset-x-0 bottom-12"
        style={{ ...playerStyle(colorId), "--celebrate-at": `${HUD.endTagAtMs}ms` } as CSSProperties}
      >
        <ResultTag tone={tone} label={label} points={points} detail={detail} countUp landsAtMs={HUD.endTagAtMs} />
      </div>
      {tone === "win" && <Particles spawn={burst} />}
    </>
  );
}
