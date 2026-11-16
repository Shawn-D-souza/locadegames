import type { ComponentType } from "react";
import type { GameId } from "../../shared/games/catalog";
import { CheckersArt } from "./checkers/CheckersArt";
import { ChessArt } from "./chess/ChessArt";
import { DotsBoxesArt } from "./dotsboxes/DotsBoxesArt";
import { DotsClashArt } from "./dotsclash/DotsClashArt";
import { FourInARowArt } from "./fourinarow/FourInARowArt";
import { HeadCrashArt } from "./headcrash/HeadCrashArt";
import { LudoArt } from "./ludo/LudoArt";
import { MemoryArt } from "./memory/MemoryArt";
import { CarromArt } from "./carrom/CarromArt";
import { PoolArt } from "./pool/PoolArt";
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
  fourinarow: { Art: FourInARowArt },
  checkers: { Art: CheckersArt },
  chess: { Art: ChessArt },
  seabattle: { Art: SeaBattleArt },
  headcrash: { Art: HeadCrashArt },
  territory: { Art: TerritoryArt },
  dotsclash: { Art: DotsClashArt },
  dotsboxes: { Art: DotsBoxesArt },
  memory: { Art: MemoryArt },
  snakesladders: { Art: SnakesLaddersArt },
  ludo: { Art: LudoArt },
  pool: { Art: PoolArt },
  carrom: { Art: CarromArt },
};
