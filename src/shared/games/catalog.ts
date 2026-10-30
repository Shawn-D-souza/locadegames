import { TICTACTOE_CONFIG } from "./tictactoe/config";

export interface GameInfo {
  id: string;
  name: string;
  /** Fewest players in the room needed to start it. Extra players make it a tournament. */
  minPlayers: number;
  turnTimeMs: number;
}

/**
 * Every game the platform offers. All games are 1v1 matches for now; with more players
 * in the room than a match holds, the room runs a Swiss-style tournament (points, no knockouts).
 */
export const GAMES = [
  {
    id: "tictactoe",
    name: "Tic-tac-toe",
    minPlayers: 2,
    turnTimeMs: TICTACTOE_CONFIG.turnTimeMs,
  },
] as const satisfies readonly GameInfo[];

export type GameId = (typeof GAMES)[number]["id"];

export function isGameId(value: unknown): value is GameId {
  return GAMES.some((game) => game.id === value);
}

export function getGame(id: GameId): GameInfo {
  return GAMES.find((game) => game.id === id)!;
}
