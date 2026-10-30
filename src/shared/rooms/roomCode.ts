import { ROOM_CONFIG } from "./config";

const { codeAlphabet, codeLength, codeGroupSize } = ROOM_CONFIG;

/** Returns a random integer in [0, max). Injected so callers pick the RNG. */
export type RandomIndex = (max: number) => number;

/** The first character is the region prefix so a code alone routes to the right server. */
export function generateRoomCode(regionPrefix: string, randomIndex: RandomIndex): string {
  let code = regionPrefix;
  while (code.length < codeLength) code += codeAlphabet[randomIndex(codeAlphabet.length)];
  return code;
}

/** Strips anything outside the alphabet (spaces, dashes). */
export function normalizeRoomCode(input: string): string {
  return [...input].filter((ch) => codeAlphabet.includes(ch)).join("");
}

/** Splits a (possibly partial) code into groups for display: "482913" → "482 913". */
export function formatRoomCode(code: string): string {
  const groups: string[] = [];
  for (let i = 0; i < code.length; i += codeGroupSize) groups.push(code.slice(i, i + codeGroupSize));
  return groups.join(" ");
}

/** Length of a fully formatted code, for input limits. */
export const FORMATTED_CODE_LENGTH = formatRoomCode("0".repeat(codeLength)).length;

export function isValidRoomCode(code: string): boolean {
  return code.length === codeLength && [...code].every((ch) => codeAlphabet.includes(ch));
}

export function regionPrefixOf(code: string): string {
  return code.charAt(0);
}
