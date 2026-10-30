import type { RefObject } from "react";
import { colors, durations, getPlayerColor } from "../../theme";
import { CLIENT_CONFIG } from "../config";
import { spawnConfetti, spawnSparksAlong, spawnStars, type Particle } from "../utils/particles";
import { seededRandom } from "../utils/seededRandom";
import { Particles } from "./Particles";

interface WinParticlesProps {
  /** The board on screen; cell positions are read from it when the burst starts. */
  board: RefObject<HTMLDivElement | null>;
  /** Winning cells, or null (a quit has no line: no sparks). */
  line: readonly number[] | null;
  /** The winner's color. */
  colorId: number;
  lineAt: number;
  celebrateAt: number;
  sparks?: boolean;
  stars?: boolean;
  confetti?: boolean;
}

/** The winner's particles: sparks off the win line, stars where the result tag lands, confetti fluttering out of the board. */
export function WinParticles({ board, line, colorId, lineAt, celebrateAt, sparks = true, stars = true, confetti = true }: WinParticlesProps) {
  const spawn = (): Particle[] => {
    const el = board.current;
    if (!el) return [];
    const random = seededRandom(CLIENT_CONFIG.particles.seed);
    const mine = getPlayerColor(colorId);
    const rect = el.getBoundingClientRect();
    // The board's first children are its cells, in order.
    const center = (cell: number) => {
      const r = el.children[cell]!.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    const middle = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    return [
      ...(sparks && line
        ? spawnSparksAlong(random, center(line[0]!), center(line[line.length - 1]!), [colors.white, mine.base, colors.waiting], lineAt, durations.lineDraw)
        : []),
      ...(stars ? spawnStars(random, { x: middle.x, y: rect.bottom }, colors.waiting, celebrateAt) : []),
      ...(confetti ? spawnConfetti(random, middle, [mine.base, mine.dark, mine.tint, colors.white, colors.waiting], celebrateAt) : []),
    ];
  };
  return <Particles spawn={spawn} />;
}
