import type { PlayerId } from "../../rooms/types";

/** A point in world units (integers). Same shape as Clipper2's Point64. */
export interface Point {
  x: number;
  y: number;
}

/** One closed ring of a land polygon. */
export type Ring = Point[];

/**
 * A player's land: outer rings and hole rings (opposite winding), never overlapping each other,
 * so both even-odd and non-zero filling draw it the same. Empty when they have none.
 */
export type Land = Ring[];

export type OutReason = "cut" | "land" | "quit";

export interface TerritoryPlayer {
  id: PlayerId;
  x: number;
  y: number;
  /** Direction of travel, in angle steps (0 = +x, increasing toward +y). */
  heading: number;
  /** Direction the player is steering toward; the head turns to it at the turn rate. */
  target: number;
  land: Land;
  /** Path outside their own land: starts exactly on its edge, ends at the head. Empty while home. */
  trail: Point[];
  alive: boolean;
  /** Step they went out on. */
  outTick: number | null;
  outReason: OutReason | null;
  /** Who knocked them out: the player who cut them (and got their land) or who took the last of their land. */
  cutBy: PlayerId | null;
}

export interface TerritoryState {
  /** Steps simulated so far (0 = start positions, before the first step). */
  tick: number;
  radius: number;
  players: TerritoryPlayer[];
  ended: boolean;
}

/** A player's whole land after a change (sent whole, so every device draws exactly the server's shape). */
export interface LandChange {
  id: PlayerId;
  land: Land;
}

export type TerritoryEvent =
  /** Left their land: the trail starts at `point`, on the land's edge. */
  | { type: "trailStart"; id: PlayerId; point: Point }
  /** Came home at `point` (on the land's edge): the trail and what it enclosed became land. */
  | { type: "capture"; id: PlayerId; point: Point; lands: LandChange[] }
  /**
   * Went out: cut (their land, their trail up to the cut and the cutter's own trail become the cutter's
   * land, so it stays one piece), lost all land, or quit (land vanishes). `lands` has everyone's change.
   */
  | { type: "out"; id: PlayerId; reason: OutReason; by: PlayerId | null; lands: LandChange[] };
