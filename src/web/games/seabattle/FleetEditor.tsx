import { useEffect, useRef, useState, type PointerEvent } from "react";
import { CELL_COUNT, SEABATTLE_CONFIG } from "../../../shared/games/seabattle/config";
import { fitsAt, shipLength } from "../../../shared/games/seabattle/fleet";
import { MARK, type CellMark, type Fleet, type Ship } from "../../../shared/games/seabattle/types";
import { PillButton } from "../../components/PillButton";
import { playSound } from "../../services/soundPlayer";
import { SEABATTLE_CLIENT } from "./config";
import { DraggedShip } from "./DraggedShip";
import { FleetDock } from "./FleetDock";
import { cellName } from "./positions";
import { SHIPS_OVERLAP } from "./seaBattleText";
import { cellAtPoint } from "./seaGeometry";
import { SeaLayout } from "./SeaLayout";
import { SeaWaters } from "./SeaWaters";
import { ShipHull } from "./ShipHull";
import { grabbedAt, shipUnder } from "./fleetMoves";
import { useFleetDraft } from "./useFleetDraft";

const SIZE = SEABATTLE_CONFIG.boardSize;

interface FleetEditorProps {
  /** The line above the board. */
  status: string;
  myId: number;
  /** Your fleet as the server has it, once you're ready (the editor stays, its buttons off, until the other is ready too). */
  placed: Fleet | null;
  /** Local time placing runs out. */
  endsAt: number;
  send(fleet: Fleet): void;
}

interface Drag {
  index: number;
  /** Which of its cells the finger holds. */
  grab: number;
  vertical: boolean;
  /** Picked up from the board (a tap turns it, a drop off the board docks it) or from the dock. */
  fromBoard: boolean;
  startX: number;
  startY: number;
  moved: boolean;
  /** Where it would land now, or null with the finger off the board. */
  ship: Ship | null;
  /** The finger, and one cell's size on screen: the ship follows it off the board. */
  x: number;
  y: number;
  cellPx: number;
}

const NO_MARKS: readonly CellMark[] = Array<CellMark>(CELL_COUNT).fill(MARK.none);

/**
 * Placing your fleet: drag each ship from the dock onto the board, drag one to move it (off the board to dock it
 * again), tap one to turn it around the cell pressed, SHUFFLE for a random layout, READY once all are down.
 */
export function FleetEditor({ status, myId, placed, endsAt, send }: FleetEditorProps) {
  const draft = useFleetDraft({ placed, endsAt, send });
  const board = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragging = drag !== null;

  // While a ship is held, the whole window follows the finger (it may leave the ship, or the board).
  const live = useRef({ drag, draft });
  useEffect(() => {
    live.current = { drag, draft };
  });
  useEffect(() => {
    if (!dragging) return;
    const move = (event: globalThis.PointerEvent) => {
      const held = live.current.drag;
      if (!held || !board.current) return;
      const moved = held.moved || Math.hypot(event.clientX - held.startX, event.clientY - held.startY) >= SEABATTLE_CLIENT.dragThresholdPx;
      const rect = board.current.getBoundingClientRect();
      const { row, col } = cellAtPoint(rect, event.clientX, event.clientY);
      // Over the board, or within half a cell of it: it lands there (kept on the board).
      const margin = rect.width / SIZE / 2;
      const over =
        event.clientX >= rect.left - margin && event.clientX <= rect.right + margin && event.clientY >= rect.top - margin && event.clientY <= rect.bottom + margin;
      const ship = !moved ? held.ship : over ? shipUnder(held.index, held.vertical, held.grab, row, col) : null;
      if (moved && !held.moved) playSound("seaBattleShipPickedUp");
      setDrag({ ...held, moved, ship, x: event.clientX, y: event.clientY, cellPx: rect.width / SIZE });
    };
    const up = () => {
      const held = live.current.drag;
      const now = live.current.draft;
      setDrag(null);
      if (!held) return;
      // Each ending has its sound (and feel): turned, put down, refused where it doesn't fit, back to the dock.
      if (!held.moved) {
        if (!held.fromBoard) return;
        now.turn(held.index, held.grab);
        playSound("seaBattleShipTurned");
      } else if (held.ship) {
        const fits = fitsAt(now.fleet, held.index, held.ship);
        now.move(held.index, held.ship);
        playSound(fits ? "seaBattleShipPlaced" : "actionRefused");
      } else {
        if (held.fromBoard) now.lift(held.index);
        playSound("seaBattleShipDocked");
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [dragging]);

  const start = (index: number, grab: number, fromBoard: boolean, event: PointerEvent<HTMLButtonElement>) => {
    if (draft.sent || !board.current) return;
    event.preventDefault();
    const ship = draft.fleet[index] ?? null;
    const at = { x: event.clientX, y: event.clientY };
    setDrag({ index, grab, vertical: ship?.vertical ?? false, fromBoard, startX: at.x, startY: at.y, moved: false, ship, ...at, cellPx: board.current.getBoundingClientRect().width / SIZE });
  };
  const grabOnBoard = (index: number) => (event: PointerEvent<HTMLButtonElement>) => {
    const ship = draft.fleet[index];
    if (!ship || !board.current) return;
    const { row, col } = cellAtPoint(board.current.getBoundingClientRect(), event.clientX, event.clientY);
    start(index, grabbedAt(ship, row, col, shipLength(index)), true, event);
  };

  const held = drag?.moved ? drag : null;
  const dock = {
    fleet: draft.fleet,
    myId,
    lifted: held && !held.fromBoard ? held.index : null,
    onGrab: (index: number, grab: number, event: PointerEvent<HTMLButtonElement>) => start(index, grab, false, event),
  };
  return (
    <SeaLayout
      status={draft.clashing.size > 0 ? SHIPS_OVERLAP : status}
      big={
        <SeaWaters
          tilesRef={board}
          label="Your fleet"
          marks={NO_MARKS}
          hulls={draft.fleet.flatMap((ship, index) =>
            ship ? [{ ship, index, look: held?.index === index ? "revealed" : draft.clashing.has(index) ? "clashing" : "afloat" }] : [],
          )}
          ownerId={myId}
          freshCell={null}
          shooterId={null}
          editHull={
            draft.sent
              ? undefined
              : (index) => ({
                  label: `Ship of ${shipLength(index)} at ${cellName(draft.fleet[index]!.cell)}, ${draft.fleet[index]!.vertical ? "down" : "across"}: drag to move, tap to turn`,
                  onPointerDown: grabOnBoard(index),
                })
          }
        >
          {held?.ship && (
            <div className="pointer-events-none absolute inset-0">
              <ShipHull ship={held.ship} index={held.index} colorId={myId} look={fitsAt(draft.fleet, held.index, held.ship) ? "lifted" : "blocked"} />
            </div>
          )}
        </SeaWaters>
      }
      side={
        <>
          {/* The dock keeps its room once empty, so nothing moves when the last ship goes on. */}
          {/* Two roomy rows under the board or beside it on a laptop; three in a sideways phone's narrow column. */}
          <div className="contents sideways:hidden">
            <FleetDock shape="wide" {...dock} />
          </div>
          <div className="hidden sideways:contents">
            <FleetDock shape="narrow" {...dock} />
          </div>
          <div className="grid w-full grid-cols-2 gap-3 landscape:grid-cols-1">
            <PillButton variant="deep" sound="seaBattleShuffle" onClick={draft.shuffle} disabled={draft.sent}>
              SHUFFLE
            </PillButton>
            <PillButton onClick={draft.ready} disabled={draft.sent || !draft.complete}>
              READY!
            </PillButton>
          </div>
          {held && !held.ship && <DraggedShip index={held.index} vertical={held.vertical} grab={held.grab} x={held.x} y={held.y} cellPx={held.cellPx} colorId={myId} />}
        </>
      }
    />
  );
}
