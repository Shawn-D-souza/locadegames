/** Free-tier daily limits reset at 00:00 UTC; returns the next reset after `now`. */
export function nextUtcMidnight(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

/** The UTC calendar date of `now` as YYYY-MM-DD. */
export function utcDateString(now: Date): string {
  return now.toISOString().slice(0, 10);
}
