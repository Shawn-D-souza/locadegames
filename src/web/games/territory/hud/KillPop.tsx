import { useEffect, useState, type CSSProperties } from "react";
import { colors } from "../../../../theme";
import { Particles } from "../../../components/Particles";
import { CLIENT_CONFIG } from "../../../config";
import { spawnStars } from "../../../utils/particles";
import { playerStyle } from "../../../utils/playerStyle";
import { seededRandom } from "../../../utils/seededRandom";
import { TERRITORY_CLIENT_CONFIG } from "../config";

interface KillPopProps {
  /** "CUT BEN!" */
  label: string;
  /** Your color. */
  colorId: number;
}

/**
 * Your knockout, celebrated: a stamp in your color over your head (the middle of the screen) and a ring of
 * stars bursting around you. Plays once, then goes.
 */
export function KillPop({ label, colorId }: KillPopProps) {
  const [shown, setShown] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShown(false), TERRITORY_CLIENT_CONFIG.hud.killPopMs);
    return () => clearTimeout(timer);
  }, []);
  if (!shown) return null;
  const stars = () => spawnStars(seededRandom(CLIENT_CONFIG.particles.seed), { x: window.innerWidth / 2, y: window.innerHeight / 2 }, colors.waiting, 0);
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-1/4 flex justify-center"
      style={{ ...playerStyle(colorId), "--celebrate-at": "0ms" } as CSSProperties}
    >
      <span className="rotate-(--transform-stamp-tilt) animate-stamp rounded-pill border-thin border-ink bg-player px-4 py-1 font-display text-title font-black text-player-text uppercase shadow-lip-medium">
        {label}
      </span>
      <Particles spawn={stars} />
    </div>
  );
}
