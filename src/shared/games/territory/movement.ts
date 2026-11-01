import { TERRITORY_CONFIG } from "./config";
import type { Point } from "./types";

/**
 * Head movement as exact integer math, so the client's prediction of its own head lands on the
 * same units as the server. Step vectors are rounded once per heading; sqrt (used at the wall)
 * is exactly rounded on every JavaScript engine.
 */

const { angleSteps, speedPerStep, turnPerStep } = TERRITORY_CONFIG;

const STEP_X = new Int32Array(angleSteps);
const STEP_Y = new Int32Array(angleSteps);
for (let h = 0; h < angleSteps; h++) {
  const angle = (2 * Math.PI * h) / angleSteps;
  STEP_X[h] = Math.round(Math.cos(angle) * speedPerStep);
  STEP_Y[h] = Math.round(Math.sin(angle) * speedPerStep);
}

export function normalizeAngle(angle: number): number {
  return ((angle % angleSteps) + angleSteps) % angleSteps;
}

/** Angle steps for a direction vector (screen or world: +y is down). */
export function angleOf(dx: number, dy: number): number {
  return normalizeAngle(Math.round((Math.atan2(dy, dx) / (2 * Math.PI)) * angleSteps));
}

export function angleToRadians(angle: number): number {
  return (2 * Math.PI * angle) / angleSteps;
}

/** Heading after one step of turning toward `target` the short way, at most the turn rate. */
export function turnToward(heading: number, target: number): number {
  const half = angleSteps / 2;
  const diff = normalizeAngle(target - heading + half) - half;
  const turn = Math.max(-turnPerStep, Math.min(turnPerStep, diff));
  return normalizeAngle(heading + turn);
}

/** Pulls a point back inside the circle of radius `limit` (sliding along the wall). */
export function clampToCircle(x: number, y: number, limit: number): Point {
  const distSq = x * x + y * y;
  if (distSq <= limit * limit) return { x, y };
  const scale = limit / Math.sqrt(distSq);
  return { x: Math.trunc(x * scale), y: Math.trunc(y * scale) };
}

export interface HeadMotion {
  x: number;
  y: number;
  heading: number;
}

/** One step: turn toward the target, move forward, stay inside the wall. */
export function moveHead(head: HeadMotion, target: number, limit: number): HeadMotion {
  const heading = turnToward(head.heading, target);
  const p = clampToCircle(head.x + STEP_X[heading]!, head.y + STEP_Y[heading]!, limit);
  return { x: p.x, y: p.y, heading };
}

/**
 * Heads are solid: overlapping heads are pushed apart equally (head-on they stop; a glancing touch
 * slides). Moves the heads in place, in array order (the server passes them by id; so does prediction).
 */
export function separateHeads(players: readonly Point[], limit: number) {
  const minGap = TERRITORY_CONFIG.headRadius * 2;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const a = players[i]!;
        const b = players[j]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        if (distSq >= minGap * minGap) continue;
        const dist = Math.sqrt(distSq);
        // Exactly on top of each other: push apart along x, lower id to the left.
        const nx = dist === 0 ? 1 : dx / dist;
        const ny = dist === 0 ? 0 : dy / dist;
        const push = (minGap - dist) / 2;
        Object.assign(a, clampInside(a.x - nx * push, a.y - ny * push, limit));
        Object.assign(b, clampInside(b.x + nx * push, b.y + ny * push, limit));
      }
    }
  }
}

function clampInside(x: number, y: number, limit: number): Point {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const distSq = rx * rx + ry * ry;
  if (distSq <= limit * limit) return { x: rx, y: ry };
  const scale = limit / Math.sqrt(distSq);
  return { x: Math.trunc(rx * scale), y: Math.trunc(ry * scale) };
}
