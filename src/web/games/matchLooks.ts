import type { TurnGameId } from "../../shared/games/catalog";
import type { GameState } from "../../shared/games/registry";
import { CHECKERS_LOOK } from "./checkers/look";
import { CHESS_LOOK } from "./chess/look";
import { FOURINAROW_LOOK } from "./fourinarow/look";
import { SEABATTLE_LOOK } from "./seabattle/look";
import { TICTACTOE_LOOK } from "./tictactoe/look";
import { ULTIMATE_LOOK } from "./ultimate/look";
import type { MatchLook } from "./matchLook";

/** Each game's look keeps its own state type; the match screen reads the state through the game it belongs to. */
const anyState = <State extends GameState>(look: MatchLook<State>) => look as unknown as MatchLook<GameState>;

/** The board, layout and sounds of every turn-based game on the match screen. */
export const MATCH_LOOKS: Record<TurnGameId, MatchLook<GameState>> = {
  tictactoe: anyState(TICTACTOE_LOOK),
  ultimate: anyState(ULTIMATE_LOOK),
  seabattle: anyState(SEABATTLE_LOOK),
  fourinarow: anyState(FOURINAROW_LOOK),
  checkers: anyState(CHECKERS_LOOK),
  chess: anyState(CHESS_LOOK),
};
