import type { TournamentGameId } from "./catalog";
import { ticTacToeGame } from "./tictactoe/game";
import type { TicTacToeState } from "./tictactoe/types";
import type { MatchGame } from "./types";
import { ultimateGame } from "./ultimate/game";
import type { UltimateState } from "./ultimate/types";

/** State of any game a match can hold. Becomes a union as games are added. */
export type GameState = TicTacToeState | UltimateState;

/** Rules for each game in the catalog. */
export const MATCH_GAMES: Record<TournamentGameId, MatchGame<GameState, unknown>> = {
  tictactoe: ticTacToeGame as MatchGame<GameState, unknown>,
  ultimate: ultimateGame as MatchGame<GameState, unknown>,
};
