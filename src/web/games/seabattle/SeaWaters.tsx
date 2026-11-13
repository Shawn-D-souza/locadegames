import { clsx } from "clsx";
import { memo, useRef, useState, type PointerEvent, type ReactNode, type Ref } from "react";
import { CELL_COUNT, SEABATTLE_CONFIG } from "../../../shared/games/seabattle/config";
import { shipCells, shipLength } from "../../../shared/games/seabattle/fleet";
import { MARK, type CellMark, type Ship } from "../../../shared/games/seabattle/types";
import { BoardFrame, type BoardEnding } from "../../components/BoardFrame";
import { playerStyle } from "../../utils/playerStyle";
import { Crosshair } from "./Crosshair";
import { cellName } from "./positions";
import { cellAtPoint } from "./seaGeometry";
import { SeaMarks } from "./SeaMarks";
import { ShipHull, type HullLook } from "./ShipHull";
import type { ImpactKind } from "./seaBattleCues";
import { ShotImpact } from "./ShotImpact";
import { tileLook } from "./tileLook";

export interface HullOnBoard {
  ship: Ship;
  /** Its place in the fleet (which ship, its length). */
  index: number;
  look: HullLook;
}

/** A cannonball that just landed here: its splash or blast plays once (`key` tells shots apart). */
export interface Impact {
  key: number;
  cell: number;
  kind: ImpactKind;
}

interface SeaWatersProps {
  /** Names the board for screen readers and playtests ("Ben's waters", "Your fleet"). */
  label: string;
  marks: readonly CellMark[];
  /** Ships drawn on it, and whose they are (their color). */
  hulls: readonly HullOnBoard[];
  ownerId: number;
  /** The cell shot last, when it was shot here: its mark pops in. */
  freshCell: number | null;
  impact?: Impact | null;
  /** Your turn to fire here: press and hold to aim (the crosshair follows your finger), let go to fire; slide off to cancel. */
  shooterId: number | null;
  onFire?(cell: number): void;
  /** Where you're aiming, as it changes (null: nowhere): your cannon follows it. */
  onAim?(cell: number | null): void;
  /** Set once the match is over: shown on the board (the result tag), the sea fading so the winner's color comes through. */
  ending?: BoardEnding | null;
  tagLandsAtMs?: number;
  /** Placing: the hulls take presses (drag, tap). */
  editHull?(index: number): { label: string; onPointerDown(event: PointerEvent<HTMLButtonElement>): void };
  /** Over everything (a ship being dragged). */
  children?: ReactNode;
  /** The board's frame (its first children are its cells). */
  ref?: Ref<HTMLDivElement | null>;
  /** The tiles' area: where a finger is, which cell. */
  tilesRef?: Ref<HTMLDivElement | null>;
}

const SIZE = SEABATTLE_CONFIG.boardSize;

const MARK_WORDS: Record<CellMark, string> = { [MARK.none]: "", [MARK.miss]: ", miss", [MARK.hit]: ", hit" };

const setRef = <T,>(ref: Ref<T | null> | undefined, el: T | null) => {
  if (typeof ref === "function") ref(el);
  else if (ref) ref.current = el;
};

/** One player's waters: 64 rounded tiles on the white card, their ships over them, and every shot's mark on top. */
export const SeaWaters = memo(function SeaWaters({
  label,
  marks,
  hulls,
  ownerId,
  freshCell,
  impact = null,
  shooterId,
  onFire,
  onAim,
  ending = null,
  tagLandsAtMs = 0,
  editHull,
  children,
  ref,
  tilesRef,
}: SeaWatersProps) {
  const tiles = useRef<HTMLDivElement | null>(null);
  const [aim, setAim] = useState<number | null>(null);
  const aiming = useRef(false);
  const canFire = shooterId !== null && onFire !== undefined;
  const fadeSea = ending !== null && ending.winnerId !== null;
  const open = (cell: number) => canFire && marks[cell] === MARK.none;

  // A sunk ship lies on open tiles; it smokes from its middle.
  const wrecks = hulls.filter((hull) => hull.look === "wreck");
  const wrecked = new Set(wrecks.flatMap(({ ship, index }) => shipCells(ship, shipLength(index)) ?? []));
  const smoking = wrecks.map(({ ship, index }) => ship.cell + Math.floor(shipLength(index) / 2) * (ship.vertical ? SIZE : 1));

  const aimAt = (cell: number | null) => {
    setAim(cell);
    onAim?.(cell);
  };
  const cellUnder = (event: PointerEvent) => {
    if (!tiles.current) return null;
    const { row, col } = cellAtPoint(tiles.current.getBoundingClientRect(), event.clientX, event.clientY);
    return row >= 0 && row < SIZE && col >= 0 && col < SIZE ? row * SIZE + col : null;
  };

  return (
    // The container the tiles are sized from: a board drawn small keeps its look.
    <div
      className={clsx("@container", canFire && "touch-none select-none")}
      onPointerDown={(event) => {
        const cell = canFire ? cellUnder(event) : null;
        if (cell === null) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        aiming.current = true;
        aimAt(cell);
      }}
      onPointerMove={(event) => {
        if (!aiming.current) return;
        const cell = cellUnder(event);
        if (cell !== aim) aimAt(cell);
      }}
      onPointerUp={(event) => {
        if (!aiming.current) return;
        aiming.current = false;
        aimAt(null);
        const cell = cellUnder(event);
        if (cell !== null && open(cell)) onFire!(cell);
      }}
      onPointerCancel={() => {
        aiming.current = false;
        aimAt(null);
      }}
    >
      <BoardFrame
        ref={(el) => setRef(ref, el)}
        label={label}
        size={SIZE}
        spacing="sea"
        winningLine={null}
        isDraw={ending?.tone === "draw"}
        ending={ending}
        countUp
        tagLandsAtMs={tagLandsAtMs}
      >
        {Array.from({ length: CELL_COUNT }, (_, cell) => (
          <button
            key={cell}
            type="button"
            className={clsx(
              "aspect-square rounded-(--sea-tile-radius) transition-colors duration-fast ease-out",
              tileLook(marks[cell], wrecked.has(cell)),
              open(cell) && "cursor-crosshair",
              fadeSea && "animate-fade-back",
            )}
            disabled={!open(cell)}
            aria-label={`${cellName(cell)}${MARK_WORDS[marks[cell]!]}`}
            // A press fires when the finger lifts (above); Enter or Space on a focused cell fires at once.
            onClick={(event) => {
              if (event.detail === 0 && open(cell)) onFire!(cell);
            }}
          />
        ))}
        {/* The tiles' area. Taps go through to the cells; only a ship being placed takes them. */}
        <div
          ref={(el) => {
            tiles.current = el;
            setRef(tilesRef, el);
          }}
          className="pointer-events-none absolute inset-(--sea-tile-gap)"
        >
          {hulls.map(({ ship, index, look }) => (
            <ShipHull key={index} ship={ship} index={index} colorId={ownerId} look={look} editable={editHull?.(index)} />
          ))}
          <SeaMarks marks={marks} wrecked={wrecked} smoking={smoking} fresh={freshCell} />
          {impact && <ShotImpact key={impact.key} cell={impact.cell} kind={impact.kind} />}
          {aim !== null && shooterId !== null && (
            <div className="absolute inset-0" style={playerStyle(shooterId)}>
              <Crosshair cell={aim} open={open(aim)} />
            </div>
          )}
          {children}
        </div>
      </BoardFrame>
    </div>
  );
});
