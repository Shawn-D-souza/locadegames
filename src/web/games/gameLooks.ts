import type { ComponentType } from "react";
import type { GameId } from "../../shared/games/catalog";
import { HeadCrashArt } from "./headcrash/HeadCrashArt";
import { TerritoryArt } from "./territory/TerritoryArt";
import { TicTacToeArt } from "./tictactoe/TicTacToeArt";
import { UltimateArt } from "./ultimate/UltimateArt";

export interface GameLook {
  /** Square illustration shown on the game tile. */
  Art: ComponentType;
}

/** Client-only visuals for each game in the shared catalog. */
export const GAME_LOOKS: Record<GameId, GameLook> = {
  tictactoe: { Art: TicTacToeArt },
  ultimate: { Art: UltimateArt },
  headcrash: { Art: HeadCrashArt },
  territory: { Art: TerritoryArt },
};
