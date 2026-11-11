import type { TurnGameId } from "../../shared/games/catalog";
import type { GameState } from "../../shared/games/registry";
import { TICTACTOE_LOOK } from "./tictactoe/look";
import { ULTIMATE_LOOK } from "./ultimate/look";
import type { MatchLook } from "./matchLook";

/** Each game's look keeps its own state type; the match screen reads the state through the game it belongs to. */
const anyState = <State extends GameState>(look: MatchLook<State>) => look as unknown as MatchLook<GameState>;

/** The board, layout and sounds of every turn-based game on the match screen. */
export const MATCH_LOOKS: Record<TurnGameId, MatchLook<GameState>> = {
  tictactoe: anyState(TICTACTOE_LOOK),
  ultimate: anyState(ULTIMATE_LOOK),
};
