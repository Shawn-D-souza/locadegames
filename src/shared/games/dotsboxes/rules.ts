import type { MoveError, MoveResult, PartyPlace } from "../types";
import { boxesBeside, lineCount, sidesDrawn, sidesOf } from "./board";
import { boardSizeFor } from "./config";
import type { BoxesSeat, DotsBoxesState } from "./types";

/**
 * Dots & Boxes rules, pure and deterministic, so the server and every phone agree. Turn by turn, players draw one line
 * between two dots next to each other. Whoever draws a box's fourth side wins it and must draw again (owner decision:
 * the classic rule). Once every line is drawn, most boxes wins; players level on the most share the win.
 */

export function createGame(players: number): DotsBoxesState {
  const size = boardSizeFor(players);
  return {
    size,
    drawn: Array<boolean>(lineCount(size)).fill(false),
    boxes: Array<BoxesSeat | null>(size * size).fill(null),
    turn: 0,
    moves: 0,
    quit: Array<boolean>(players).fill(false),
    quitOrder: [],
    lastMove: null,
    over: false,
  };
}

/** Still playing: hasn't quit. */
export function isIn(state: DotsBoxesState, seat: BoxesSeat): boolean {
  return !state.quit[seat];
}

/** Boxes `seat` has won. */
export function boxesOf(state: Pick<DotsBoxesState, "boxes">, seat: BoxesSeat): number {
  return state.boxes.reduce<number>((sum, owner) => sum + (owner === seat ? 1 : 0), 0);
}

/** Validates an untrusted move from the wire: a line number (checked against the board when played). */
export function parseMove(raw: unknown): number | null {
  return typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw < 1024 ? raw : null;
}

/** A line `seat` may draw now. */
export function canDraw(state: DotsBoxesState, seat: BoxesSeat, line: number): boolean {
  return moveError(state, seat, line) === null;
}

function moveError(state: DotsBoxesState, seat: BoxesSeat, line: number): MoveError | null {
  if (state.over) return "GAME_OVER";
  if (state.turn !== seat) return "NOT_YOUR_TURN";
  if (!Number.isInteger(line) || line < 0 || line >= state.drawn.length) return "INVALID_MOVE";
  return state.drawn[line] ? "CELL_TAKEN" : null;
}

/** The boxes drawing `line` would close (its other three sides already drawn). */
function closedBy(size: number, drawn: readonly boolean[], line: number): number[] {
  return boxesBeside(size, line).filter((box) => sidesDrawn(size, drawn, box) === 3);
}

/** The next seat still in after `from`, going round; null if nobody else is. */
function nextInSeat(state: DotsBoxesState, from: BoxesSeat): BoxesSeat | null {
  const count = state.quit.length;
  for (let step = 1; step <= count; step++) {
    const seat = (from + step) % count;
    if (isIn(state, seat)) return seat;
  }
  return null;
}

/** Ends the game once every box is won, or when fewer than two players are left. */
function settle(state: DotsBoxesState): DotsBoxesState {
  const left = state.quit.filter((q) => !q).length;
  if (left > 1 && state.boxes.includes(null)) return state;
  return { ...state, over: true, turn: -1 };
}

export function applyMove(state: DotsBoxesState, seat: BoxesSeat, line: number): MoveResult<DotsBoxesState> {
  const error = moveError(state, seat, line);
  if (error) return { ok: false, error };
  const won = closedBy(state.size, state.drawn, line);
  const drawn = state.drawn.map((d, index) => d || index === line);
  const boxes = state.boxes.map((owner, box) => (won.includes(box) ? seat : owner));
  // A box won: draw again. Otherwise the turn goes on to the next player still in.
  const turn = won.length > 0 ? seat : (nextInSeat(state, seat) ?? seat);
  const next = settle({ ...state, drawn, boxes, turn, moves: state.moves + 1, lastMove: { seat, line, boxes: won } });
  return { ok: true, state: next };
}

/** Plays the line `line` on `drawn`, then keeps taking any box with three sides drawn: how many boxes that hands over. */
export function boxesHandedOver(size: number, drawn: readonly boolean[], line: number): number {
  const lines = [...drawn];
  lines[line] = true;
  let taken = 0;
  for (;;) {
    let found = -1;
    for (let box = 0; box < size * size && found === -1; box++) {
      if (sidesDrawn(size, lines, box) === 3) found = box;
    }
    if (found === -1) return taken;
    const open = sidesOf(size, found).find((side) => !lines[side])!;
    taken += closedBy(size, lines, open).length;
    lines[open] = true;
  }
}

/**
 * Drawn when a turn runs out; deterministic, no luck (my call): the line that wins the most boxes, if any wins one;
 * else the first line that leaves no box with three sides; else the one that hands the next player the fewest boxes.
 * Ties: the first line in order.
 */
export function autoMove(state: DotsBoxesState): number {
  const { size, drawn } = state;
  const open = drawn.flatMap((d, line) => (d ? [] : [line]));
  let best = -1;
  let bestWon = 0;
  for (const line of open) {
    const won = closedBy(size, drawn, line).length;
    if (won > bestWon) [best, bestWon] = [line, won];
  }
  if (best !== -1) return best;
  const safe = open.find((line) => boxesBeside(size, line).every((box) => sidesDrawn(size, drawn, box) < 2));
  if (safe !== undefined) return safe;
  let fewest = Infinity;
  for (const line of open) {
    const given = boxesHandedOver(size, drawn, line);
    if (given < fewest) [best, fewest] = [line, given];
  }
  return best;
}

/** `seat` quit (✕, or left the room): skipped from now on; their boxes stay on the board, grey. */
export function quitSeat(state: DotsBoxesState, seat: BoxesSeat): DotsBoxesState {
  if (state.over || !isIn(state, seat)) return state;
  const quit = state.quit.map((q, other) => q || other === seat);
  const left = { ...state, quit, quitOrder: [...state.quitOrder, seat] };
  const turn = state.turn === seat ? (nextInSeat(left, seat) ?? seat) : state.turn;
  return settle({ ...left, turn });
}

/**
 * The final order: everyone who stayed by boxes won (level: the same place), then the quitters, the last to quit
 * first. Everyone's boxes go with their place, to show on the results.
 */
export function finalPlaces(state: DotsBoxesState): PartyPlace[] {
  const seats = state.quit.map((_, seat) => seat);
  const stayed = seats.filter((seat) => isIn(state, seat)).sort((a, b) => boxesOf(state, b) - boxesOf(state, a) || a - b);
  const places: PartyPlace[] = [];
  stayed.forEach((seat, i) => {
    const level = i > 0 && boxesOf(state, stayed[i - 1]!) === boxesOf(state, seat);
    places.push({ seat, place: level ? places.at(-1)!.place : i + 1, quit: false, score: boxesOf(state, seat) });
  });
  for (const seat of [...state.quitOrder].reverse()) places.push({ seat, place: places.length + 1, quit: true, score: boxesOf(state, seat) });
  return places;
}

/** Everyone who stayed with the most boxes (a shared win when level); none if everyone quit. */
export function winners(state: DotsBoxesState): BoxesSeat[] {
  return state.over ? finalPlaces(state).filter((p) => p.place === 1 && !p.quit).map((p) => p.seat) : [];
}
