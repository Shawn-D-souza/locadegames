/**
 * The site itself (same origin: the Worker serves the web client too) is always allowed. Other origins must match the
 * comma-separated allow list, where "*" matches exactly one subdomain label.
 */
export function isOriginAllowed(origin: string | null, allowList: string, selfOrigin: string): boolean {
  if (!origin) return false;
  if (origin === selfOrigin) return true;
  return allowList
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .some((pattern) => {
      if (!pattern.includes("*")) return pattern === origin;
      const escaped = pattern.split("*").map((part) => part.replace(/[.+?^${}()|[\]\\/]/g, "\\$&"));
      return new RegExp(`^${escaped.join("[a-z0-9-]+")}$`, "i").test(origin);
    });
}

export function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
