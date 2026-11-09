import { TERRITORY_CONFIG } from "./territory/config";
import { TICTACTOE_CONFIG } from "./tictactoe/config";
import { ULTIMATE_CONFIG } from "./ultimate/config";

interface BaseGameInfo {
  id: string;
  name: string;
  /** Fewest players in the room needed to start it. */
  minPlayers: number;
}

/** A 1v1 turn-based game: with more players in the room it becomes a Swiss-style tournament (points, no knockouts). */
export interface TournamentGameInfo extends BaseGameInfo {
  format: "tournament";
  turnTimeMs: number;
}

/** A real-time game: everyone in the room plays one match together in one arena. */
export interface ArenaGameInfo extends BaseGameInfo {
  format: "arena";
}

export type GameInfo = TournamentGameInfo | ArenaGameInfo;

/** Every game the platform offers. */
export const GAMES = [
  {
    id: "tictactoe",
    name: "Tic-tac-toe",
    minPlayers: 2,
    format: "tournament",
    turnTimeMs: TICTACTOE_CONFIG.turnTimeMs,
  },
  {
    id: "ultimate",
    name: "Ultimate Tic-tac-toe",
    minPlayers: 2,
    format: "tournament",
    turnTimeMs: ULTIMATE_CONFIG.turnTimeMs,
  },
  {
    id: "territory",
    name: "Territory",
    minPlayers: TERRITORY_CONFIG.minPlayers,
    format: "arena",
  },
] as const satisfies readonly GameInfo[];

type CatalogEntry = (typeof GAMES)[number];
export type GameId = CatalogEntry["id"];
export type TournamentGameId = Extract<CatalogEntry, { format: "tournament" }>["id"];
export type ArenaGameId = Extract<CatalogEntry, { format: "arena" }>["id"];

export function isGameId(value: unknown): value is GameId {
  return GAMES.some((game) => game.id === value);
}

export function getGame(id: GameId): GameInfo {
  return GAMES.find((game) => game.id === id)!;
}

export function isTournamentGame(id: GameId): id is TournamentGameId {
  return getGame(id).format === "tournament";
}

export function getTournamentGame(id: TournamentGameId): TournamentGameInfo {
  return getGame(id) as TournamentGameInfo;
}
