import type { PlayerId } from "../../shared/rooms/types";
import type { Tournament } from "../../shared/tournament/types";

/** Name of an entrant, even after they left the room. */
export function entrantName(t: Tournament, id: PlayerId): string {
  return t.entrants.find((e) => e.id === id)?.name ?? "?";
}

/** "ROUND 2 OF 3"; a one-round tournament is just "MATCH". */
export function roundLabel(t: Tournament): string {
  return t.totalRounds === 1 ? "MATCH" : `ROUND ${t.rounds.length} OF ${t.totalRounds}`;
}

/** "Ana", "Ana and Ben", "Ana, Ben and Cy". */
export function joinNames(names: string[]): string {
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
