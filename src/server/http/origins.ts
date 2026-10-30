/** Matches an Origin against a comma-separated allow list; "*" matches exactly one subdomain label. */
export function isOriginAllowed(origin: string | null, allowList: string): boolean {
  if (!origin) return false;
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
