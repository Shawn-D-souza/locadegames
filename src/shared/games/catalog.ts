import { DOTSCLASH_CONFIG } from "./dotsclash/config";
import { HEADCRASH_CONFIG } from "./headcrash/config";
import { SEABATTLE_CONFIG } from "./seabattle/config";
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
export interface TurnGameInfo extends BaseGameInfo {
  format: "tournament";
  play: "turns";
  turnTimeMs: number;
}

/** A 1v1 real-time game: the same tournament, each match played live (the server runs it in memory, like an arena match). */
export interface LiveGameInfo extends BaseGameInfo {
  format: "tournament";
  play: "live";
}

export type TournamentGameInfo = TurnGameInfo | LiveGameInfo;

/** A real-time game: everyone in the room plays one match together in one arena. */
export interface ArenaGameInfo extends BaseGameInfo {
  format: "arena";
}

/** A turn-based game everyone in the room plays together on one board, taking turns (not 1v1, so no tournament). */
export interface PartyGameInfo extends BaseGameInfo {
  format: "party";
  turnTimeMs: number;
}

export type GameInfo = TournamentGameInfo | ArenaGameInfo | PartyGameInfo;

/** Every game the platform offers. */
export const GAMES = [
  {
    id: "tictactoe",
    name: "Tic-tac-toe",
    minPlayers: 2,
    format: "tournament",
    play: "turns",
    turnTimeMs: TICTACTOE_CONFIG.turnTimeMs,
  },
  {
    id: "ultimate",
    name: "Ultimate Tic-tac-toe",
    minPlayers: 2,
    format: "tournament",
    play: "turns",
    turnTimeMs: ULTIMATE_CONFIG.turnTimeMs,
  },
  {
    id: "seabattle",
    name: "Sea Battle",
    minPlayers: 2,
    format: "tournament",
    play: "turns",
    turnTimeMs: SEABATTLE_CONFIG.turnTimeMs,
  },
  {
    id: "headcrash",
    name: "Head Crash",
    minPlayers: HEADCRASH_CONFIG.minPlayers,
    format: "tournament",
    play: "live",
  },
  {
    id: "territory",
    name: "Territory",
    minPlayers: TERRITORY_CONFIG.minPlayers,
    format: "arena",
  },
  {
    id: "dotsclash",
    name: "Dots Clash",
    minPlayers: DOTSCLASH_CONFIG.minPlayers,
    format: "party",
    turnTimeMs: DOTSCLASH_CONFIG.turnTimeMs,
  },
] as const satisfies readonly GameInfo[];

type CatalogEntry = (typeof GAMES)[number];
export type GameId = CatalogEntry["id"];
export type TournamentGameId = Extract<CatalogEntry, { format: "tournament" }>["id"];
export type TurnGameId = Extract<CatalogEntry, { play: "turns" }>["id"];
export type LiveGameId = Extract<CatalogEntry, { play: "live" }>["id"];
export type ArenaGameId = Extract<CatalogEntry, { format: "arena" }>["id"];
export type PartyGameId = Extract<CatalogEntry, { format: "party" }>["id"];

export function isGameId(value: unknown): value is GameId {
  return GAMES.some((game) => game.id === value);
}

export function getGame(id: GameId): GameInfo {
  return GAMES.find((game) => game.id === id)!;
}

export function isTournamentGame(id: GameId): id is TournamentGameId {
  return getGame(id).format === "tournament";
}

/** Whether a tournament game's matches are played live (real time) rather than turn by turn. */
export function isLiveGame(id: GameId): id is LiveGameId {
  const game = getGame(id);
  return game.format === "tournament" && game.play === "live";
}

export function getTurnGame(id: TurnGameId): TurnGameInfo {
  return getGame(id) as TurnGameInfo;
}

export function isPartyGame(id: GameId): id is PartyGameId {
  return getGame(id).format === "party";
}

export function getPartyGame(id: PartyGameId): PartyGameInfo {
  return getGame(id) as PartyGameInfo;
}
