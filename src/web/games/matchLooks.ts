import { useEffect, useState } from "react";
import type { TurnGameId } from "../../shared/games/catalog";
import type { GameState } from "../../shared/games/registry";
import type { MatchLook } from "./matchLook";

type AnyLook = MatchLook<GameState>;
/** Each game's look keeps its own state type; the match screen reads the state through the game it belongs to. */
const anyState = <State extends GameState>(look: MatchLook<State>) => look as unknown as AnyLook;

/** Each turn-based game's board, layout and sounds, its own download so the room opens fast (the room hub preloads them). */
const LOADERS: Record<TurnGameId, () => Promise<AnyLook>> = {
  tictactoe: () => import("./tictactoe/look").then((m) => anyState(m.TICTACTOE_LOOK)),
  ultimate: () => import("./ultimate/look").then((m) => anyState(m.ULTIMATE_LOOK)),
  seabattle: () => import("./seabattle/look").then((m) => anyState(m.SEABATTLE_LOOK)),
  fourinarow: () => import("./fourinarow/look").then((m) => anyState(m.FOURINAROW_LOOK)),
  checkers: () => import("./checkers/look").then((m) => anyState(m.CHECKERS_LOOK)),
  chess: () => import("./chess/look").then((m) => anyState(m.CHESS_LOOK)),
};

const loaded = new Map<TurnGameId, AnyLook>();

/** Downloads a game's match look (once) and keeps it for `useMatchLook`. */
export function loadMatchLook(gameId: TurnGameId): Promise<AnyLook> {
  return LOADERS[gameId]().then((look) => {
    loaded.set(gameId, look);
    return look;
  });
}

/** Every turn-based game's look, fetched while friends gather. */
export function preloadMatchLooks() {
  for (const gameId of Object.keys(LOADERS) as TurnGameId[]) void loadMatchLook(gameId);
}

/** The game's match look, or undefined while it downloads. */
export function useMatchLook(gameId: TurnGameId | null): AnyLook | undefined {
  const [, setReady] = useState(0);
  const look = gameId ? loaded.get(gameId) : undefined;
  useEffect(() => {
    if (gameId && !look) void loadMatchLook(gameId).then(() => setReady((n) => n + 1));
  }, [gameId, look]);
  return look;
}
