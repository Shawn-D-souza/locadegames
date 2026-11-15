import type { TurnGameId } from "./catalog";
import { checkersGame } from "./checkers/game";
import type { CheckersState } from "./checkers/types";
import { fourInARowGame } from "./fourinarow/game";
import type { FourInARowState } from "./fourinarow/types";
import { ticTacToeGame } from "./tictactoe/game";
import type { TicTacToeState } from "./tictactoe/types";
import { seaBattleGame } from "./seabattle/game";
import type { SeaBattleState } from "./seabattle/types";
import type { MatchGame } from "./types";
import { ultimateGame } from "./ultimate/game";
import type { UltimateState } from "./ultimate/types";

/** State of any turn-based game a match can hold. Becomes a union as games are added. */
export type GameState = TicTacToeState | UltimateState | SeaBattleState | FourInARowState | CheckersState;

/** Rules for each turn-based game in the catalog. */
export const MATCH_GAMES: Record<TurnGameId, MatchGame<GameState, unknown>> = {
  tictactoe: ticTacToeGame as MatchGame<GameState, unknown>,
  ultimate: ultimateGame as MatchGame<GameState, unknown>,
  seabattle: seaBattleGame as MatchGame<GameState, unknown>,
  fourinarow: fourInARowGame as MatchGame<GameState, unknown>,
  checkers: checkersGame as MatchGame<GameState, unknown>,
};
