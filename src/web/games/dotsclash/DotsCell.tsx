import { clsx } from "clsx";
import type { CSSProperties } from "react";
import { DOTSCLASH_CONFIG } from "../../../shared/games/dotsclash/config";
import { hapticTarget, playHaptic } from "../../services/hapticPlayer";
import { DotPips } from "./DotPips";
import { incomingFlight, outgoingFlight } from "./flights";

const DIRECTIONS = [0, 1, 2, 3] as const;

/** A dot coming in over the board's far edge this wave: its direction and its owner's colors. */
export interface IncomingDot {
  dir: number;
  paint: CSSProperties | undefined;
}

interface DotsCellProps {
  /** Its owner's colors (`playerStyle` / `quitStyle`), or undefined while empty. */
  paint: CSSProperties | undefined;
  dots: number;
  /** Bursting this wave: 4 of its dots fly out to the neighbours. */
  bursting: boolean;
  /** Dots from a tile on the far side of the board landing here this wave (the board wraps). */
  incoming: readonly IncomingDot[];
  /** You may tap it now: its edge changes a little, and it squashes as you press (flat: no lip, the tiles stay one clean grid). */
  playable: boolean;
  /** Your color, so an empty tile you may pick lights in it as you press. */
  youPaint: CSSProperties;
  label: string;
  onTap(): void;
}

/** A flying dot: above every tile (the tile itself makes no layer of its own), outlined in its color so it shows on white. */
function FlyingDot({ style }: { style: CSSProperties }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-raised animate-dot-fly" style={style}>
      <DotPips count={1} flying />
    </span>
  );
}

/**
 * One tile: rounded and white while empty; taken, it fills with its owner's color and shows their dots. A burst sends
 * 4 dots flying from where they sat to the four neighbours (over the edge and in on the other side) with a ring
 * flashing out; any left over stay. A tile whose dots change settles them in with a little squash.
 */
export function DotsCell({ paint, dots, bursting, incoming, playable, youPaint, label, onTap }: DotsCellProps) {
  const staying = bursting ? Math.max(0, dots - DOTSCLASH_CONFIG.burstAt) : dots;
  return (
    <button
      ref={hapticTarget}
      type="button"
      // Rounded in proportion, so a 9×9 board's small tiles and a 6×6 board's big ones have the same shape.
      className={clsx(
        "relative aspect-square rounded-[22%] border-hair transition-[scale,background-color,border-color] duration-fast ease-out",
        // An empty tile's faint edge, so white tiles read on the plain page; a taken one's is its color. On your turn
        // only the edge of a tile you may tap changes, a little (owner direction): darker on yours, a soft version of your color on an empty one.
        paint ? clsx("bg-player", playable ? "border-player-edge" : "border-player") : clsx("bg-white", playable ? "border-player-edge-light" : "border-tile-edge"),
        playable && "cursor-pointer active:scale-(--transform-press-scale)",
        playable && !paint && "active:bg-player-light",
      )}
      style={paint ?? youPaint}
      disabled={!playable}
      aria-label={label}
      onClick={() => {
        // Felt the moment the finger lands; its sound waits until the server has accepted it.
        playHaptic("dotsClashTap");
        onTap();
      }}
    >
      {/* A new owner or count remounts the dots, so they settle in. */}
      {staying > 0 && <DotPips key={`${label}:${staying}`} count={staying} className="animate-dot-land" />}
      {bursting && (
        <>
          <span className="pointer-events-none absolute inset-[18%] animate-burst-ring rounded-pill border-thin border-player-text" aria-hidden="true" />
          {DIRECTIONS.map((dir) => (
            <FlyingDot key={dir} style={outgoingFlight(dir)} />
          ))}
        </>
      )}
      {incoming.map(({ dir, paint: from }) => (
        <FlyingDot key={`in${dir}`} style={{ ...from, ...incomingFlight(dir) }} />
      ))}
    </button>
  );
}
