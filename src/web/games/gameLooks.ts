import type { ComponentType } from "react";
import type { GameId } from "../../shared/games/catalog";
import { DotsClashArt } from "./dotsclash/DotsClashArt";
import { HeadCrashArt } from "./headcrash/HeadCrashArt";
import { SeaBattleArt } from "./seabattle/SeaBattleArt";
import { SnakesLaddersArt } from "./snakesladders/SnakesLaddersArt";
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
  seabattle: { Art: SeaBattleArt },
  headcrash: { Art: HeadCrashArt },
  territory: { Art: TerritoryArt },
  dotsclash: { Art: DotsClashArt },
  snakesladders: { Art: SnakesLaddersArt },
};
