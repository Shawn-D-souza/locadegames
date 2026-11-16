/**
 * Development only: a playtest can line up what the next cards turned for the first time turn out to be
 * (`window.loadedCards = ["new", "match"]`: a picture nobody has seen yet, or the open card's partner), so it reaches its moments (a
 * pair, a miss, the last pair) at once instead of waiting on luck. The dev server (`npm run dev:server`) accepts them;
 * production builds never send them and the production server ignores them.
 */
declare global {
  interface Window {
    loadedCards?: ("match" | "new")[];
  }
}

/** What a tap on card `card` sends: the next loaded deal in development, if a playtest set one, otherwise the card. */
export function turnMove(card: number): number | { card: number; deal: "match" | "new" } {
  if (!import.meta.env.DEV) return card;
  const deal = window.loadedCards?.shift();
  return deal === undefined ? card : { card, deal };
}
