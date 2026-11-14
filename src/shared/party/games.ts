import type { PartyGameId } from "../games/catalog";
import { dotsClashGame } from "../games/dotsclash/game";
import { snakesLaddersGame } from "../games/snakesladders/game";
import type { PartyGame } from "../games/types";
import type { PartyStates } from "./types";

/** Any party game's state. */
export type PartyState = PartyStates[PartyGameId];

/** Rules for each party game in the catalog. */
export const PARTY_GAMES: { [K in PartyGameId]: PartyGame<PartyStates[K], unknown> } = {
  dotsclash: dotsClashGame as PartyGame<PartyStates["dotsclash"], unknown>,
  snakesladders: snakesLaddersGame as PartyGame<PartyStates["snakesladders"], unknown>,
};

/** The rules of the game `gameId`, taking any party game's state (the party keeps the two together). */
export function partyRules(gameId: PartyGameId): PartyGame<PartyState, unknown> {
  return PARTY_GAMES[gameId] as PartyGame<PartyState, unknown>;
}
