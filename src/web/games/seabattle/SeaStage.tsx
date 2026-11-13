import { clsx } from "clsx";
import type { CSSProperties, ReactNode } from "react";
import { spacing } from "../../../theme";
import { useElementSize } from "../../hooks/useElementSize";
import { STAGE, STAGE_LENGTH, type Place, type StageLayout } from "./stageGeometry";

interface SeaStageProps {
  layout: StageLayout;
  landscape: boolean;
  /** Their waters are the big board (they're being fired at). */
  farBig: boolean;
  far: ReactNode;
  near: ReactNode;
  /** The two fleets' rows: theirs, then yours. */
  strip: ReactNode;
  /** Over everything: the cannon, a ball in flight. */
  children?: ReactNode;
}

const MOVES = "transition-[translate,scale] duration-board-swap ease-flight";

const placed = (place: Place): CSSProperties => ({ translate: `calc(var(--sea-l) * ${place.x}) calc(var(--sea-l) * ${place.y})`, scale: String(place.scale) });

/**
 * Both players' waters in the room the screen leaves (the stage is sized from it, so nothing scrolls on any screen):
 * the one being fired at big, the other small, the fleets between them. When the turn passes they trade sizes,
 * gliding (only `translate` and `scale` move, so it stays smooth on any phone). One big-board width is `--sea-l`.
 */
export function SeaStage({ layout, landscape, farBig, far, near, strip, children }: SeaStageProps) {
  const [roomRef, room] = useElementSize<HTMLDivElement>();
  // The big board as wide as the room allows, and the whole stage no taller (less room for the result tag under it).
  const high = room.height - spacing[4];
  const length = Math.floor(landscape ? Math.min(high, room.width / STAGE_LENGTH) : Math.min(room.width, high / STAGE_LENGTH));
  const board = (big: boolean) => clsx("absolute top-0 left-0 w-(--sea-l) origin-top-left", MOVES, big ? "z-raised" : "pointer-events-none");
  return (
    <div ref={roomRef} className="flex min-h-0 flex-1 items-center justify-center">
      <div
        className="relative isolate flex-none"
        style={{ "--sea-l": `${Math.max(0, length)}px`, width: `calc(var(--sea-l) * ${layout.width})`, height: `calc(var(--sea-l) * ${layout.height})` } as CSSProperties}
      >
        <div className={board(farBig)} style={placed(layout.far)}>
          {far}
        </div>
        <div className={board(!farBig)} style={placed(layout.near)}>
          {near}
        </div>
        {/* In landscape it stands up between the boards, a quarter turn round its corner. */}
        <div
          className={clsx("absolute top-0 left-0 flex w-(--sea-l) origin-top-left flex-col justify-between", MOVES)}
          style={{ height: `calc(var(--sea-l) * ${STAGE.strip})`, ...placed({ ...layout.strip, scale: 1 }), rotate: landscape ? "90deg" : undefined }}
        >
          {strip}
        </div>
        {children}
      </div>
    </div>
  );
}
