import type { PartyGameId } from "../games/catalog";
import { carromGame } from "../games/carrom/game";
import { dotsBoxesGame } from "../games/dotsboxes/game";
import { dotsClashGame } from "../games/dotsclash/game";
import { ludoGame } from "../games/ludo/game";
import { poolGame } from "../games/pool/game";
import { snakesLaddersGame } from "../games/snakesladders/game";
import type { PartyGame } from "../games/types";
import type { PartyStates } from "./types";

/** Any party game's state. */
export type PartyState = PartyStates[PartyGameId];

/** Rules for each party game in the catalog. */
export const PARTY_GAMES: { [K in PartyGameId]: PartyGame<PartyStates[K], unknown> } = {
  dotsclash: dotsClashGame as PartyGame<PartyStates["dotsclash"], unknown>,
  dotsboxes: dotsBoxesGame as PartyGame<PartyStates["dotsboxes"], unknown>,
  snakesladders: snakesLaddersGame as PartyGame<PartyStates["snakesladders"], unknown>,
  ludo: ludoGame as PartyGame<PartyStates["ludo"], unknown>,
  pool: poolGame as PartyGame<PartyStates["pool"], unknown>,
  carrom: carromGame as PartyGame<PartyStates["carrom"], unknown>,
};

/** The rules of the game `gameId`, taking any party game's state (the party keeps the two together). */
export function partyRules(gameId: PartyGameId): PartyGame<PartyState, unknown> {
  return PARTY_GAMES[gameId] as PartyGame<PartyState, unknown>;
}
