import { POOL_CONFIG } from "../../../shared/games/pool/config";
import { POCKETS } from "../../../shared/games/pool/table";
import { POOL_LOOK, POOL_PAINT } from "./look";

const { length: L, width: W } = POOL_CONFIG.table;
const R = POOL_CONFIG.ballRadius;
const RAIL = POOL_LOOK.rail;


/** A ball as it is drawn now: where, its color, whether it's yours (a white dot), and how big (sinking, popping back). */
export interface DrawBall {
  x: number;
  y: number;
  color: string;
  mine: boolean;
  /** 1 as normal; smaller while it sinks into a pocket or pops back onto the table. */
  scale: number;
}

/** The cue as drawn: lined up behind the cue ball along the shot (`dx, dy`, a unit vector), drawn back `pull` units. */
export interface DrawCue {
  x: number;
  y: number;
  dx: number;
  dy: number;
  pull: number;
  /** The butt: the shooter's color. */
  color: string;
}

/**
 * The table, in table units (the canvas already turned and scaled): a wood rail outlined in ink straight onto the cloth
 * (owner direction: no cushions drawn), and the six round holes at the cloth's corners and middles, exactly where balls
 * drop. Flat colors, no shine (DESIGN.md).
 * `px`: one screen pixel in table units.
 */
export function drawTable(ctx: CanvasRenderingContext2D, px: number) {
  ctx.fillStyle = POOL_PAINT.rail;
  ctx.strokeStyle = POOL_PAINT.railEdge;
  ctx.lineWidth = POOL_PAINT.outlineWidth * px;
  ctx.beginPath();
  // Inset by half the outline, so all of it shows inside the canvas.
  ctx.roundRect(-RAIL + px, -RAIL + px, L + 2 * RAIL - 2 * px, W + 2 * RAIL - 2 * px, RAIL * 0.9);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = POOL_PAINT.cloth;
  ctx.fillRect(0, 0, L, W);
  // The holes just as the physics has them: a ball whose middle is over one has dropped.
  ctx.fillStyle = POOL_PAINT.pocket;
  for (const hole of POCKETS) {
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The balls: flat discs in their colors with an ink outline; yours carry a white dot. `px`: one screen pixel in table units. */
export function drawBalls(ctx: CanvasRenderingContext2D, balls: readonly DrawBall[], px: number) {
  ctx.lineWidth = POOL_PAINT.outlineWidth * px;
  for (const ball of balls) {
    if (ball.scale <= 0) continue;
    const r = R * ball.scale;
    ctx.fillStyle = ball.color;
    ctx.strokeStyle = POOL_PAINT.outline;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (ball.mine) {
      ctx.fillStyle = POOL_PAINT.dot;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, r * POOL_LOOK.myDot, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** The cue: a long tapered stick, ink tip, pale maple shaft, the shooter's color at the butt, lined up behind the cue ball. */
export function drawCue(ctx: CanvasRenderingContext2D, cue: DrawCue, px: number) {
  const { cueLength, cueTip, cueButt, cueTipLength, cueGap } = POOL_LOOK;
  // From the tip back to the butt, along -d; across it, the perpendicular.
  const back = R + cueGap + cue.pull;
  const at = (along: number, side: number) => [cue.x - cue.dx * (back + along) - cue.dy * side, cue.y - cue.dy * (back + along) + cue.dx * side] as const;
  const half = (along: number) => (cueTip + ((cueButt - cueTip) * along) / cueLength) / 2;
  const piece = (from: number, to: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(...at(from, half(from)));
    ctx.lineTo(...at(to, half(to)));
    ctx.lineTo(...at(to, -half(to)));
    ctx.lineTo(...at(from, -half(from)));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  ctx.lineWidth = POOL_PAINT.outlineWidth * px * 0.75;
  ctx.strokeStyle = POOL_PAINT.outline;
  const buttStart = cueLength * 0.62;
  piece(cueTipLength, buttStart, POOL_PAINT.shaft);
  piece(buttStart, cueLength, cue.color);
  piece(0, cueTipLength, POOL_PAINT.tip);
}
