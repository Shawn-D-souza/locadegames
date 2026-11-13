import { useCallback, useEffect, useRef, useState } from "react";
import { FLEET_SIZE } from "../../../shared/games/seabattle/config";
import { completeFleet, fitsAt, isValidFleet, randomFleet, type FleetDraft } from "../../../shared/games/seabattle/fleet";
import type { Fleet, Ship } from "../../../shared/games/seabattle/types";
import { SEABATTLE_CLIENT } from "./config";
import { overlapping, turnedShip } from "./fleetMoves";

const EMPTY: FleetDraft = Array<Ship | null>(FLEET_SIZE).fill(null);

interface FleetDraftOptions {
  /** The fleet the server already has from you (sent, or after a reconnect): shown as it is, nothing more to send. */
  placed: Fleet | null;
  /** Local time placing runs out: the fleet on screen is sent just before. */
  endsAt: number;
  send(fleet: Fleet): void;
}

/**
 * Your fleet while you place it (owner decision: you place every ship yourself). It starts with every ship off the
 * board, in the dock; a ship is dragged on, moved where it fits, turned (always, even onto another), dragged back off,
 * or SHUFFLE puts them all in a random layout. READY sends it once every ship is down and none overlap. If time is
 * about to run out first, the ships already down stay and the rest go in random spots.
 */
export function useFleetDraft({ placed, endsAt, send }: FleetDraftOptions) {
  const [draft, setDraft] = useState<FleetDraft>(EMPTY);
  const [sentHere, setSent] = useState(false);
  const fleet: FleetDraft = placed ?? draft;
  const sent = sentHere || placed !== null;
  const clashing = overlapping(fleet);
  const complete = fleet.every((ship) => ship !== null) && isValidFleet(fleet as Fleet);
  const latest = useRef({ fleet, sent, send });
  useEffect(() => {
    latest.current = { fleet, sent, send };
  });

  // Reads the latest fleet, so the timer below always sends what's on screen (finished where it isn't).
  const sendNow = useCallback(() => {
    const { fleet: now, sent: already, send: deliver } = latest.current;
    if (already) return;
    latest.current.sent = true;
    setSent(true);
    deliver(completeFleet(now, Math.random));
  }, []);

  useEffect(() => {
    const timer = setTimeout(sendNow, Math.max(0, endsAt - SEABATTLE_CLIENT.autoReadyLeadMs - Date.now()));
    return () => clearTimeout(timer);
  }, [endsAt, sendNow]);

  const set = (index: number, ship: Ship | null) => {
    if (!sent) setDraft(fleet.map((s, i) => (i === index ? ship : s)));
  };

  return {
    fleet,
    sent,
    /** Every ship down, none overlapping: READY may send it. */
    complete,
    clashing,
    ready: () => complete && sendNow(),
    shuffle: () => !sent && setDraft(randomFleet(Math.random)),
    /** Puts a ship down where it fits (a drop where it doesn't changes nothing). */
    move: (index: number, ship: Ship) => {
      if (fitsAt(fleet, index, ship)) set(index, ship);
    },
    /** Back to the dock. */
    lift: (index: number) => set(index, null),
    turn: (index: number, grab: number) => {
      const ship = fleet[index];
      if (ship) set(index, turnedShip(ship, index, grab));
    },
  };
}
