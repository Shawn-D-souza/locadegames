import { useId, type CSSProperties } from "react";
import { playerStyle } from "../../utils/playerStyle";
import { STAGE, type CannonAim } from "./stageGeometry";

interface CannonProps {
  colorId: number;
  aim: CannonAim;
  /** A shot leaving it (`key` tells shots apart): it fires once it has swung round (`delayMs`). */
  shot: { key: number; delayMs: number } | null;
}

/**
 * Its outlines are part of the drawing (bold, like the reference), so they scale with it: a cannon drawn small keeps
 * its look. In the drawing's own units (the mount is 80 across).
 */
const BOLD: CSSProperties = { strokeWidth: 6 };
const OUTLINED = "stroke-ink [stroke-linejoin:round]";
const stop = (color: string, opacity = 1): CSSProperties => ({ stopColor: `var(--color-${color})`, stopOpacity: opacity });

/**
 * The shooter's cannon on their small board, chunky and simple (after the owner's reference): a round mount in their
 * color, shaded, casting a soft shadow, and a short fat iron barrel seen a little from behind (a shine down its lit
 * side, its muzzle a thick rim facing you with the dark bore inside), all in bold outlines, turning toward the cell aimed at. Firing, the whole cannon squashes
 * and swells, the barrel kicks back, the muzzle flashes and puffs smoke. It comes in once the boards have traded places.
 */
export function Cannon({ colorId, aim, shot }: CannonProps) {
  const flash = `${useId()}-flash`;
  const size = `calc(var(--sea-l) * ${STAGE.cannon})`;
  const fired = { "--shot-delay": `${shot?.delayMs ?? 0}ms` } as CSSProperties;
  return (
    <div
      className="pointer-events-none absolute top-0 left-0 z-raised"
      style={{ width: size, height: size, translate: `calc(var(--sea-l) * ${aim.at.x} - 50%) calc(var(--sea-l) * ${aim.at.y} - 50%)`, ...playerStyle(colorId) }}
      aria-hidden="true"
    >
      <div className="size-full animate-cannon-in">
        <div key={shot?.key ?? "ready"} className={shot ? "size-full animate-cannon-kick" : "size-full"} style={fired}>
          {/* The mount is round: it doesn't turn, so its shading and shadow stay put, the light from the top left. */}
          <svg viewBox="-50 -50 100 100" className="absolute inset-0 size-full overflow-visible">
            <circle cx={7} cy={9} r={43} className="fill-ink opacity-closed-board" />
            <circle r={40} className={`fill-player-dark ${OUTLINED}`} style={BOLD} />
            <circle cx={-4} cy={-4} r={31} className="fill-player" />
          </svg>
          <div className="relative size-full transition-[rotate] duration-cannon-turn ease-out" style={{ rotate: `${aim.angle}deg` }}>
            <svg viewBox="-50 -50 100 100" className="size-full overflow-visible">
              <defs>
                <radialGradient id={flash}>
                  <stop offset="0" style={stop("white")} />
                  <stop offset="0.35" style={stop("gold-light")} />
                  <stop offset="0.7" style={stop("gold")} />
                  <stop offset="1" style={stop("gold", 0)} />
                </radialGradient>
              </defs>
              <g className={shot ? "animate-recoil" : undefined} style={fired}>
                {/* A short fat tube, rounded at the back, a shine down its lit side; its muzzle a thick rim, the inside wall
                    showing above the dark bore. */}
                <path d="M -22 -36 L -22 14 A 22 22 0 0 0 22 14 L 22 -36 Z" className={`fill-iron ${OUTLINED}`} style={BOLD} />
                <rect x={-15} y={-14} width={9} height={22} rx={4.5} className="fill-white opacity-rays" />
                <ellipse cy={-36} rx={27} ry={15} className={`fill-iron-dark ${OUTLINED}`} style={BOLD} />
                <ellipse cy={-30} rx={19} ry={8} className="fill-black" />
                {shot && <circle cy={-50} r={26} fill={`url(#${flash})`} className="origin-center animate-muzzle-flash transform-fill" style={fired} />}
              </g>
            </svg>
            {/* Smoke out of the muzzle, drifting off. */}
            {shot && <span className="absolute top-[-4%] left-1/2 size-1/2 -translate-1/2 animate-muzzle-smoke rounded-pill sea-smoke motion-reduce:hidden" style={fired} />}
          </div>
        </div>
      </div>
    </div>
  );
}
