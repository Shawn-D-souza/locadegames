import { useEffect, useId, useRef, type RefObject } from "react";
import { colors } from "../../../theme";
import { HEADCRASH_CLIENT_CONFIG } from "./config";

/** The tile's frame (100×100 units), like the other tiles: an ink outline with rounded corners. */
const FRAME = { inset: 2, corner: 10, outline: 2.5 };
/** Tile units per meter of the game: the cars keep the game's own proportions. */
const SCALE = 15;
const LINE = 1.6;
/** The bowl's rock, and the water in front of it along the bottom. */
const BOWL = "M-4 30 C-2 78 24 86 50 86 C76 86 102 78 104 30 L104 104 L-4 104 Z";
const WATER = "M0 92 C10 89 18 95 28 92 C38 89 46 95 56 92 C66 89 74 95 84 92 C92 90 96 93 100 92 L100 100 L0 100 Z";
/** The spiky burst between the falling car and the head under it. */
const BURST = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * 2 * Math.PI;
  const reach = i % 2 === 0 ? 9 : 4.5;
  return `${(Math.cos(angle) * reach).toFixed(2)},${(Math.sin(angle) * reach).toFixed(2)}`;
}).join(" ");

/**
 * The two cars (tile units, y down), drawn by the game's own car code so they look exactly as in a match: blue
 * standing on the bowl's floor facing left, red in the air (wheels hanging) coming down nose first on its driver's head.
 */
const CARS = [
  { id: 1, x: 56, y: 70, angle: 0, facing: -1, onGround: true },
  { id: 0, x: 40, y: 36, angle: (-38 * Math.PI) / 180, facing: 1, onGround: false },
] as const;

/** Draws the cars on the tile's canvas, with the game's drawing code (loaded on demand; the room preloads it anyway). */
function useCars(canvas: RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let live = true;
    let observer: ResizeObserver | undefined;
    void Promise.all([import("./render/drawCar"), import("./render/palette")]).then(([{ drawCar, WHEEL_REST }, { carPaint }]) => {
      if (!live) return;
      const draw = () => {
        const ratio = window.devicePixelRatio || 1;
        el.width = Math.round(el.clientWidth * ratio);
        el.height = Math.round(el.clientHeight * ratio);
        const ctx = el.getContext("2d");
        if (!ctx) return;
        const unit = el.width / 100;
        for (const car of CARS) {
          // Meters, y up, around the car's spot.
          ctx.setTransform(unit * SCALE, 0, 0, -unit * SCALE, car.x * unit, car.y * unit);
          const squeeze = car.onGround ? WHEEL_REST : 0;
          drawCar(ctx, 0, 0, car.angle, { paint: carPaint(car.id), facing: car.facing, wheelTurn: 0.4, wheelSqueeze: [squeeze, squeeze], dazedFor: null });
        }
      };
      draw();
      observer = new ResizeObserver(draw);
      observer.observe(el);
    });
    return () => {
      live = false;
      observer?.disconnect();
    };
  }, [canvas]);
}

/**
 * The game tile: the moment that scores. A blue car on the floor of a rock bowl in the sky, a red one coming down
 * on its driver's head, the burst between them, and the water along the bottom. The cars are the game's own.
 */
export function HeadCrashArt() {
  const clip = `${useId()}-frame`;
  const canvas = useRef<HTMLCanvasElement>(null);
  useCars(canvas);
  const frameRect = { x: FRAME.inset, y: FRAME.inset, width: 100 - 2 * FRAME.inset, height: 100 - 2 * FRAME.inset, rx: FRAME.corner };
  // Three layers: the sky, the cars (canvas), then the burst, the bowl, the water in front and the frame over them.
  return (
    <span className="relative block size-full" aria-hidden="true">
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full">
        <rect {...frameRect} fill={colors.sky} />
      </svg>
      <canvas ref={canvas} className="absolute inset-0 size-full" />
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full">
        <defs>
          <clipPath id={clip}>
            <rect {...frameRect} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clip})`}>
          <g transform="translate(55 51)">
            <polygon points={BURST} fill={colors.white} stroke={colors.ink} strokeWidth={LINE} strokeLinejoin="round" />
            <circle r="2.6" fill={colors.waiting} />
          </g>
          <path d={BOWL} fill={colors.ground} stroke={colors.ink} strokeWidth={FRAME.outline} />
          <path d={WATER} fill={colors.water} opacity={HEADCRASH_CLIENT_CONFIG.look.waterAlpha} />
        </g>
        <rect {...frameRect} fill="none" stroke={colors.ink} strokeWidth={FRAME.outline} />
      </svg>
    </span>
  );
}
