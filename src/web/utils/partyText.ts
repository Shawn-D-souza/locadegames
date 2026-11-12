import type { Party } from "../../shared/party/types";
import type { PlayerId } from "../../shared/rooms/types";

/** A player of a game everyone plays together, by the name they entered with (kept if they left the room). */
export function partyName(party: Party, id: PlayerId): string {
  return party.entrants.find((e) => e.id === id)?.name ?? "?";
}

/** A name with 's for whose turn it is: "ANA'S TURN" (names ending in s get only the apostrophe). */
export function possessive(name: string): string {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}
