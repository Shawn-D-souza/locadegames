import { homeProgress } from "../../../shared/games/ludo/board";
import type { LudoState } from "../../../shared/games/ludo/types";
import { clusterSpots, spotOf, type LudoLayout, type Point } from "./geometry";
import type { PawnPose } from "./motion";

/** Pawns home huddle a little smaller than on a square, so they fit the pad in their triangle on every board. */
const HOME_PAWN = 0.82;

/** A pawn where it is drawn now. */
export interface PlacedPawn {
  seat: number;
  pawn: number;
  at: Point;
  /** How high off the board (a hop), in board units. */
  lift: number;
  squash: number;
  /** 1 full size; smaller sharing a square. */
  scale: number;
  /** On the move: drawn over the rest. */
  moving: boolean;
}

/**
 * Every pawn still on the board (a quitter's leave it), where it is drawn: those an action is moving at their pose
 * (`moving`, keyed `seat:pawn`), the rest where the game has them, pawns sharing a square (or home) huddled in it, smaller. Lower
 * pawns come later, so they stand in front; the moving ones last of all.
 */
export function placePawns(game: LudoState, layout: LudoLayout, armOf: (seat: number) => number, moving: ReadonlyMap<string, PawnPose>): PlacedPawn[] {
  const home = homeProgress(layout.board);
  const groups = new Map<string, { seat: number; pawn: number; at: Point; home: boolean }[]>();
  const resting: PlacedPawn[] = [];
  const inMotion: PlacedPawn[] = [];
  game.pawns.forEach((pawns, seat) => {
    if (game.quitOrder.includes(seat)) return;
    pawns.forEach((progress, pawn) => {
      const pose = moving.get(`${seat}:${pawn}`);
      if (pose) {
        inMotion.push({ seat, pawn, at: pose.at, lift: pose.lift, squash: pose.squash, scale: 1, moving: true });
        return;
      }
      const at = spotOf(layout, armOf(seat), pawn, progress);
      // A base has a spot for each pawn; squares and the home triangle are shared.
      if (progress < 0) {
        resting.push({ seat, pawn, at, lift: 0, squash: 0, scale: layout.basePawn, moving: false });
        return;
      }
      const key = `${at.x.toFixed(2)},${at.y.toFixed(2)}`;
      groups.set(key, [...(groups.get(key) ?? []), { seat, pawn, at, home: progress >= home }]);
    });
  });
  for (const here of groups.values()) {
    const { offsets, scale } = clusterSpots(here.length);
    const size = here[0]!.home ? HOME_PAWN : 1;
    here.forEach(({ seat, pawn, at }, i) => {
      const reach = offsets[i]!;
      const offset = { x: reach.x * size * layout.cell, y: reach.y * size * layout.cell };
      resting.push({ seat, pawn, at: { x: at.x + offset.x, y: at.y + offset.y }, lift: 0, squash: 0, scale: scale * size, moving: false });
    });
  }
  return [...resting.sort((a, b) => a.at.y - b.at.y), ...inMotion];
}
