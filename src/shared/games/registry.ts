import type { GameId } from "./catalog";
import { ticTacToeGame } from "./tictactoe/game";
import type { TicTacToeState } from "./tictactoe/types";
import type { MatchGame } from "./types";

/** State of any game a match can hold. Becomes a union as games are added. */
export type GameState = TicTacToeState;

/** Rules for each game in the catalog. */
export const MATCH_GAMES: Record<GameId, MatchGame<GameState, unknown>> = {
  tictactoe: ticTacToeGame as MatchGame<GameState, unknown>,
};
