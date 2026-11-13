import { mixSeed, seededRandom } from "../../random";
import type { MoveResult, Seat } from "../types";
import { CELL_COUNT, FLEET_SIZE, SEABATTLE_CONFIG } from "./config";
import { isValidFleet, randomFleet, shipAt, shipCells, shipLength } from "./fleet";
import { MARK, type CellMark, type Fleet, type SeaBattleMove, type SeaBattleState } from "./types";

/**
 * Sea Battle, pure. Both players place their fleets at the same time, in secret; then they take turns firing at the
 * other's waters, and a hit fires again. A sunk ship shows to both. Whoever sinks the whole fleet first wins, at
 * once (owner decision 2026-11-13: no last turn for the other player; it confused more than the starter's small edge
 * was worth, and who starts is shared fairly anyway), so there are no draws.
 */

const other = (seat: Seat): Seat => (seat === 0 ? 1 : 0);
const emptyWaters = (): CellMark[] => Array<CellMark>(CELL_COUNT).fill(MARK.none);

export function createGame(starter: Seat): SeaBattleState {
  return {
    phase: "place",
    starter,
    turn: starter,
    fleets: [null, null],
    ready: [false, false],
    marks: [emptyWaters(), emptyWaters()],
    wrecks: [[], []],
    shots: 0,
    lastShot: null,
    winner: null,
  };
}

export const isGameOver = (state: SeaBattleState) => state.winner !== null;

/** The seat that may act now: both while placing (each until ready), the one whose turn it is while firing. */
export function seatsToMove(state: SeaBattleState): Seat[] {
  if (isGameOver(state)) return [];
  if (state.phase === "place") return ([0, 1] as const).filter((seat) => !state.ready[seat]);
  return [state.turn];
}

function place(state: SeaBattleState, seat: Seat, fleet: Fleet): MoveResult<SeaBattleState> {
  if (state.ready[seat]) return { ok: false, error: "INVALID_MOVE" };
  if (!isValidFleet(fleet)) return { ok: false, error: "INVALID_MOVE" };
  const fleets: SeaBattleState["fleets"] = [...state.fleets];
  const ready: SeaBattleState["ready"] = [...state.ready];
  fleets[seat] = fleet.map(({ cell, vertical }) => ({ cell, vertical }));
  ready[seat] = true;
  const placed = ready[0] && ready[1];
  return { ok: true, state: { ...state, fleets, ready, phase: placed ? "fire" : "place", turn: state.starter } };
}

/** `seat` fires at `cell` of the other player's waters. */
function fire(state: SeaBattleState, seat: Seat, cell: number): MoveResult<SeaBattleState> {
  if (!Number.isInteger(cell) || cell < 0 || cell >= CELL_COUNT) return { ok: false, error: "INVALID_MOVE" };
  const target = other(seat);
  if (state.marks[target][cell] !== MARK.none) return { ok: false, error: "CELL_TAKEN" };
  const fleet = state.fleets[target]!;
  const waters = [...state.marks[target]];
  const wrecks = [...state.wrecks[target]];
  const next: SeaBattleState = { ...state, shots: state.shots + 1, lastShot: { seat, cell } };
  const index = shipAt(fleet, cell);

  if (index === -1) {
    waters[cell] = MARK.miss;
    // A miss: the turn passes.
    next.turn = target;
  } else {
    waters[cell] = MARK.hit;
    const cells = shipCells(fleet[index]!, shipLength(index))!;
    if (cells.every((c) => waters[c] === MARK.hit)) wrecks.push({ ...fleet[index]!, index });
    // The whole fleet sunk wins; any other hit fires again (the turn stays).
    if (wrecks.length === FLEET_SIZE) next.winner = seat;
  }
  next.marks = seat === 0 ? [state.marks[0], waters] : [waters, state.marks[1]];
  next.wrecks = seat === 0 ? [state.wrecks[0], wrecks] : [wrecks, state.wrecks[1]];
  return { ok: true, state: next };
}

export function applyMove(state: SeaBattleState, seat: Seat, move: SeaBattleMove): MoveResult<SeaBattleState> {
  if (isGameOver(state)) return { ok: false, error: "GAME_OVER" };
  if ("place" in move) return state.phase === "place" ? place(state, seat, move.place) : { ok: false, error: "INVALID_MOVE" };
  if (state.phase !== "fire" || state.turn !== seat) return { ok: false, error: "NOT_YOUR_TURN" };
  return fire(state, seat, move.fire);
}

/** The shot fired for a player whose time ran out: the first untouched cell of the other's waters, in reading order (no luck). */
export function autoShot(state: SeaBattleState): number {
  return state.marks[other(state.turn)].indexOf(MARK.none);
}

/**
 * A turn ran out. Placing: everyone not ready yet gets a random fleet (`seed`: a fresh random number from the server,
 * so no phone can know it ahead). Firing: the auto shot.
 */
export function expire(state: SeaBattleState, seed: number): SeaBattleState {
  if (isGameOver(state)) return state;
  if (state.phase === "fire") {
    const result = fire(state, state.turn, autoShot(state));
    return result.ok ? result.state : state;
  }
  let next = state;
  for (const seat of seatsToMove(state)) {
    const result = place(next, seat, randomFleet(seededRandom(mixSeed(seed, seat))));
    if (result.ok) next = result.state;
  }
  return next;
}

/** How long the turn now running lasts. */
export const turnTimeMs = (state: SeaBattleState) =>
  state.phase === "place" ? SEABATTLE_CONFIG.placeTimeMs : SEABATTLE_CONFIG.turnTimeMs;

/** One player getting ready while the other still places keeps the placing clock running (only the start of firing restarts it). */
export const keepsClock = (before: SeaBattleState, after: SeaBattleState) => before.phase === "place" && after.phase === "place";

/** What `viewer` may see of a match being played: their own fleet only (watchers: none). Wrecks and shots are for all. */
export function viewFor(state: SeaBattleState, viewer: Seat | null): SeaBattleState {
  if (isGameOver(state)) return state;
  return { ...state, fleets: [viewer === 0 ? state.fleets[0] : null, viewer === 1 ? state.fleets[1] : null] };
}

/** Validates an untrusted move from the wire. */
export function parseMove(raw: unknown): SeaBattleMove | null {
  if (typeof raw !== "object" || raw === null) return null;
  const move = raw as Record<string, unknown>;
  if ("fire" in move) return Number.isInteger(move.fire) ? { fire: move.fire as number } : null;
  if (!Array.isArray(move.place) || move.place.length !== FLEET_SIZE) return null;
  const fleet: Fleet = [];
  for (const ship of move.place as unknown[]) {
    if (typeof ship !== "object" || ship === null) return null;
    const { cell, vertical } = ship as Record<string, unknown>;
    if (!Number.isInteger(cell) || typeof vertical !== "boolean") return null;
    fleet.push({ cell: cell as number, vertical });
  }
  return { place: fleet };
}
