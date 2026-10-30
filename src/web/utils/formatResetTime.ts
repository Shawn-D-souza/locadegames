/** "5:30 AM" style time in the viewer's own timezone. */
export function formatResetTime(resetAt: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(resetAt);
}
