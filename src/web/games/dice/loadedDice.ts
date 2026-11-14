/**
 * Development only: a playtest can line up the next dice (`window.loadedDice = [6, 6, 3]`), so it reaches its moments (a
 * ladder, a capture, the finish) at once instead of waiting on luck. The dev server (`npm run dev:server`) accepts them; production
 * builds never send them and the production server ignores them.
 */
declare global {
  interface Window {
    loadedDice?: number[];
  }
}

/** What a tap on ROLL sends: the next loaded die in development, if a playtest set one, otherwise a plain roll. */
export function rollMove(): "roll" | { die: number } {
  if (!import.meta.env.DEV) return "roll";
  const die = window.loadedDice?.shift();
  return die === undefined ? "roll" : { die };
}
