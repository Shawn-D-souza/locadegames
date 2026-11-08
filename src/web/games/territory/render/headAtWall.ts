import { TERRITORY_CONFIG } from "../../../../shared/games/territory/config";
import { TERRITORY_CLIENT_CONFIG } from "../config";

const W = TERRITORY_CONFIG.trailWidth;
const LOOK = TERRITORY_CLIENT_CONFIG.look;
const HALF = (LOOK.headSize * W) / 2;
const CORNER = LOOK.head.corner * W;
const SIDE = LOOK.head.side * W;
const TILT = LOOK.head.tilt;

export interface HeadPose {
  x: number;
  y: number;
  angle: number;
}

/**
 * Where to draw a head so all of it stays inside the wall and touches it. The game stops a head when its
 * trail's edge touches the wall, and the drawn head is wider than the trail (and its corners reach farther
 * when it's turned, higher while it hops), so at the wall it is drawn moved just enough that the cube touches the wall's inner
 * edge. Only the drawing moves; away from the wall the head is drawn where it is.
 */
export function headAtWall(head: HeadPose, radius: number, lift = 0): HeadPose {
  const distance = Math.hypot(head.x, head.y);
  if (distance === 0) return head;
  const ux = head.x / distance;
  const uy = head.y / distance;
  const pushed = distance + headReach(head.angle, ux, uy, lift) - (radius - (LOOK.wallLine * W) / 2);
  if (pushed <= 0) return head;
  return { x: head.x - pushed * ux, y: head.y - pushed * uy, angle: head.angle };
}

/**
 * How far the drawn cube reaches from its spot along (ux, uy), exactly as `drawHeads.ts` draws it: its
 * bottom (a rounded square turned with the head, then squashed top to bottom by the tilt), its top (the
 * same, raised one side's height), lifted by any hop, and the soft outline around them. The crest isn't counted: at the
 * wall it tucks behind the wall's line.
 */
export function headReach(angle: number, ux: number, uy: number, lift = 0): number {
  // The squash by the tilt, seen from the direction's side: a rounded square's reach along v (not a unit vector).
  const vx = ux;
  const vy = uy * TILT;
  const along = vx * Math.cos(angle) + vy * Math.sin(angle);
  const across = -vx * Math.sin(angle) + vy * Math.cos(angle);
  const square = (HALF - CORNER) * (Math.abs(along) + Math.abs(across)) + CORNER * Math.hypot(vx, vy);
  const raised = Math.max(0, -uy) * (SIDE + lift);
  return square + raised + (LOOK.head.outline * W) / 2;
}
