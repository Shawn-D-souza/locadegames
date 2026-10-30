/** Cryptographically random integer in [0, max). */
export function randomIndex(max: number): number {
  const [value] = crypto.getRandomValues(new Uint32Array(1));
  return value! % max;
}
