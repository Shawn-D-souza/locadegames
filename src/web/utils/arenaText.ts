import type { Arena } from "../../shared/arena/types";
import type { PlayerId } from "../../shared/rooms/types";

/** Land share (hundredths of a percent) as shown: "7.36%". */
export function formatShare(share: number): string {
  return `${(share / 100).toFixed(2)}%`;
}

/** A land share split for showing the decimals smaller: "7.36%" → ["7", ".36%"]. */
export function splitShare(share: number): [whole: string, rest: string] {
  const text = formatShare(share);
  const dot = text.indexOf(".");
  return [text.slice(0, dot), text.slice(dot)];
}

/** A match clock: "2:05". Rounds up, so it shows 0:00 only when time is up. */
export function formatClock(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function arenaName(arena: Arena, id: PlayerId): string {
  return arena.entrants.find((e) => e.id === id)?.name ?? "?";
}

/** Several names as one: "Ana", "Ana & Ben", "Ana, Ben & Cy". */
export function arenaNames(arena: Arena, ids: readonly PlayerId[]): string {
  const names = ids.map((id) => arenaName(arena, id));
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}` : (names[0] ?? "");
}

/** A place: "1st", "2nd", "3rd", "4th". */
export function ordinal(place: number): string {
  const suffix = place % 100 >= 11 && place % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][place % 10] ?? "th");
  return `${place}${suffix}`;
}
