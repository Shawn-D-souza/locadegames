import { ROOM_CONFIG } from "./config";

/** Collapses whitespace and strips control characters; returns null if unusable. */
export function sanitizePlayerName(input: string): string | null {
  // eslint-disable-next-line no-control-regex
  const cleaned = input.replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim();
  const name = [...cleaned].slice(0, ROOM_CONFIG.nameMaxLength).join("");
  return name.length >= ROOM_CONFIG.nameMinLength ? name : null;
}
