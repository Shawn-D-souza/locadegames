import { useEffect, useReducer } from "react";
import { isGameOver } from "../../../shared/games/seabattle/rules";
import type { SeaBattleState } from "../../../shared/games/seabattle/types";
import type { Seat } from "../../../shared/games/types";
import { durations } from "../../../theme";
import { SEABATTLE_CLIENT } from "./config";

/** A cannonball on its way. */
export interface Volley {
  /** The shot count it makes: tells volleys apart (a new one remounts the ball and the cannon's kick). */
  key: number;
  shooter: Seat;
  cell: number;
  /** How long until it leaves the muzzle: the other's cannon swings onto the cell first; yours fires as you let go. */
  delayMs: number;
  /** The server has it, so its result is in the game. */
  known: boolean;
}

interface VolleyState {
  /** The last game seen, and the one from before the shot in the air (drawn until it lands). */
  game: SeaBattleState;
  before: SeaBattleState;
  volley: Volley | null;
  /** The ball is down. */
  landed: boolean;
  /** Its splash or blast has had its moment: after a miss the boards may trade places. */
  settled: boolean;
}

type VolleyAction =
  | { type: "game"; game: SeaBattleState }
  | { type: "fire"; shooter: Seat; cell: number }
  | { type: "land" | "settle" | "drop"; key: number };

const start = (game: SeaBattleState): VolleyState => ({ game, before: game, volley: null, landed: false, settled: false });

function reduce(state: VolleyState, action: VolleyAction): VolleyState {
  switch (action.type) {
    case "fire":
      return { game: state.game, before: state.game, volley: { key: state.game.shots + 1, shooter: action.shooter, cell: action.cell, delayMs: 0, known: false }, landed: false, settled: false };
    case "land":
      return state.volley?.key === action.key ? { ...state, landed: true } : state;
    case "settle":
      return state.volley?.key === action.key ? { ...state, settled: true } : state;
    case "drop":
      return state.volley?.key === action.key && !state.volley.known ? { ...state, volley: null } : state;
    case "game":
      return seen(state, action.game);
  }
}

/** A room view came in: a new shot starts a volley (or is the one you already fired); anything else just shows. */
function seen(state: VolleyState, game: SeaBattleState): VolleyState {
  const prev = state.game;
  if (game.shots === prev.shots && game.phase === prev.phase) return { ...state, game };
  const shot = game.lastShot;
  const oneShot = game.shots === prev.shots + 1 && shot !== null && game.phase === "fire";
  const mine = state.volley && !state.volley.known && shot && state.volley.shooter === shot.seat && state.volley.cell === shot.cell;
  // Yours, in the air already: now its result is known.
  if (oneShot && mine) return { ...state, game, before: prev, volley: { ...state.volley!, known: true } };
  // Several shots came at once (back from sleep): shown as they are. One that ended the match plays out like any other.
  if (!oneShot) return start(game);
  return { game, before: prev, volley: { key: game.shots, shooter: shot.seat, cell: shot.cell, delayMs: durations.cannonTurn, known: true }, landed: false, settled: false };
}

/**
 * Plays each shot out before its result shows: the cannon swings and fires, the ball flies, and only when it lands
 * does the hit or miss appear (until then the game from before the shot is drawn); after a miss the boards trade
 * places once its splash has had its moment. Your own ball leaves as you let go, before the server answers, so
 * firing never waits on the network.
 */
export function useVolley(game: SeaBattleState) {
  const [state, dispatch] = useReducer(reduce, game, start);
  // A new room view is taken in while rendering, so a fresh result never shows for a frame before its ball flies.
  if (state.game !== game) dispatch({ type: "game", game });
  const { volley, landed, settled, before } = state;
  const key = volley?.key ?? null;
  const delay = volley?.delayMs ?? 0;
  const resolved = volley !== null && landed && volley.known;

  useEffect(() => {
    if (key === null) return;
    const timer = setTimeout(() => dispatch({ type: "land", key }), delay + durations.shotFlight);
    return () => clearTimeout(timer);
  }, [key, delay]);
  useEffect(() => {
    if (key === null || !landed) return;
    // Down and its result in: it has its moment. Down with no answer from the server: it never counted.
    const timer = resolved
      ? setTimeout(() => dispatch({ type: "settle", key }), durations.shotSettle)
      : setTimeout(() => dispatch({ type: "drop", key }), SEABATTLE_CLIENT.shotAnswerWaitMs);
    return () => clearTimeout(timer);
  }, [key, landed, resolved]);

  const over = isGameOver(game);
  const waiting = volley !== null && volley.known && !landed;
  return {
    /** The game as drawn: from before the shot in the air until it lands. */
    shown: waiting ? before : game,
    /** Whose shot the boards are laid out for: the shooter's until the splash has had its moment (the last one's until it's down). */
    turn: volley !== null && volley.known && !(over ? landed : settled) ? before.turn : game.turn,
    /** The match is over but the shot that ended it is still in the air. */
    finishing: over && waiting,
    volley,
    /** The ball is in the air (no new shot until it's down and answered). */
    flying: volley !== null && !resolved,
    /** It landed, with its result: the splash or blast plays. */
    impact: resolved ? volley : null,
    fire: (shooter: Seat, cell: number) => dispatch({ type: "fire", shooter, cell }),
  };
}
