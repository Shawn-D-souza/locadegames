import { useEffect, useId, useRef } from "react";
import { TERRITORY_CONFIG } from "../../../shared/games/territory/config";
import { colors, getPlayerColor, lighten } from "../../../theme";
import { TERRITORY_CLIENT_CONFIG } from "./config";
import type { PlayerFrame } from "./engine/frame";

const LOOK = TERRITORY_CLIENT_CONFIG.look;
const RED = getPlayerColor(0);
const BLUE = getPlayerColor(1);

/** The tile's frame (100×100 units), like the tic-tac-toe tile's cells: the arena's floor with an ink outline. */
const FRAME = { inset: 2, corner: 10, outline: 2.5 };
const DOT = { every: 10, radius: 0.9 };
/** One trail width in tile units: everything else is in the game's own proportions to it (heads included). */
const TRAIL_WIDTH = 14;
/** Land raised on its lip; studs on it like in the game. */
const LIP = 4.5;
const STUD = { every: 11, radius: 2.6, side: 1.3 };
const BLUE_LAND = "M64 0 L100 0 L100 42 C92 48 80 46 74 38 C68 30 62 14 64 0 Z";
const RED_LAND = "M0 66 C14 58 30 62 38 72 C46 82 44 92 40 100 L0 100 Z";
/** Red's trail: out from under its land, a loop up and round, heading home. */
const RED_TRAIL = "M20 66 C14 42 26 24 44 24 C62 24 68 42 60 58";

/**
 * Each head (tile units), drawn by the game's own head code so it looks exactly as in a match: red at its
 * trail's end coming home, blue in its land heading off; both turned a little toward us (eyes showing).
 */
const HEADS = [
  { id: 0, x: 59, y: 62, angle: 2.2 },
  { id: 1, x: 84, y: 24, angle: 2.6 },
] as const;
/** World units per tile unit. */
const WORLD = TERRITORY_CONFIG.trailWidth / TRAIL_WIDTH;

/**
 * The game tile: a close-up of a match in the game's own look. The dotted floor; red and blue land raised
 * on their lips with studs; red's trail looping out and heading home; both heads as the game draws them
 * (loaded with the game's drawing code, which the room preloads anyway, so the room's own code stays small).
 */
export function TerritoryArt() {
  const id = useId();
  const canvas = useRef<HTMLCanvasElement>(null);
  const clip = `${id}-frame`;
  const dots = `${id}-dots`;
  const studs = (color: string) => `${id}-studs-${color}`;

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let live = true;
    let observer: ResizeObserver | undefined;
    void import("./render/drawHeads").then(({ drawHeads }) => {
      if (!live) return;
      const draw = () => {
        const ratio = window.devicePixelRatio || 1;
        el.width = Math.round(el.clientWidth * ratio);
        el.height = Math.round(el.clientHeight * ratio);
        const ctx = el.getContext("2d");
        if (!ctx) return;
        const scale = el.width / 100 / WORLD;
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        const players: PlayerFrame[] = HEADS.map((h) => ({
          id: h.id,
          isMe: false,
          head: { x: h.x * WORLD, y: h.y * WORLD, angle: h.angle },
          trail: null,
          land: [],
          home: [],
        }));
        drawHeads(ctx, players);
      };
      draw();
      observer = new ResizeObserver(draw);
      observer.observe(el);
    });
    return () => {
      live = false;
      observer?.disconnect();
    };
  }, []);

  return (
    <span className="relative block size-full" aria-hidden="true">
      <svg viewBox="0 0 100 100" className="size-full">
        <defs>
          <clipPath id={clip}>
            <rect x={FRAME.inset} y={FRAME.inset} width={100 - 2 * FRAME.inset} height={100 - 2 * FRAME.inset} rx={FRAME.corner} />
          </clipPath>
          <pattern id={dots} width={DOT.every} height={DOT.every} patternUnits="userSpaceOnUse">
            <circle cx={DOT.every / 2} cy={DOT.every / 2} r={DOT.radius} fill={colors.line} />
          </pattern>
          {[RED, BLUE].map((c) => (
            <pattern key={c.base} id={studs(c.base)} width={STUD.every} height={STUD.every} patternUnits="userSpaceOnUse">
              <circle cx={STUD.every / 2} cy={STUD.every / 2 + STUD.side} r={STUD.radius} fill={c.dark} />
              <circle cx={STUD.every / 2} cy={STUD.every / 2} r={STUD.radius} fill={lighten(c.base, 0.12)} />
            </pattern>
          ))}
        </defs>

        <g clipPath={`url(#${clip})`}>
          <rect width="100" height="100" fill={colors.background} />
          <rect width="100" height="100" fill={`url(#${dots})`} />
          {/* Trails run under the land, so red's leaves from under its edge. */}
          <path d={RED_TRAIL} fill="none" stroke={RED.base} strokeWidth={TRAIL_WIDTH} strokeLinecap="round" />
          <path
            d={RED_TRAIL}
            fill="none"
            stroke={lighten(RED.base, LOOK.trailLighten)}
            strokeWidth={TRAIL_WIDTH * LOOK.trailInnerShare}
            strokeLinecap="round"
          />
          {(
            [
              [BLUE, BLUE_LAND],
              [RED, RED_LAND],
            ] as const
          ).map(([color, land]) => (
            <g key={color.base}>
              <path d={land} fill={color.dark} transform={`translate(0 ${LIP})`} />
              <path d={land} fill={color.base} stroke={lighten(color.base, LOOK.landEdgeLighten)} strokeWidth="1.2" />
              <path d={land} fill={`url(#${studs(color.base)})`} />
            </g>
          ))}
        </g>
        <rect
          x={FRAME.inset}
          y={FRAME.inset}
          width={100 - 2 * FRAME.inset}
          height={100 - 2 * FRAME.inset}
          rx={FRAME.corner}
          fill="none"
          stroke={colors.ink}
          strokeWidth={FRAME.outline}
        />
      </svg>
      <canvas ref={canvas} className="absolute inset-0 size-full" />
    </span>
  );
}
