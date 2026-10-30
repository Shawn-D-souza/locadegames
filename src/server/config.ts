/** Server-side numbers: regions and free-tier protection. */

/** Durable Object location hints we run in, each with its room-code prefix (must be in the code alphabet). */
export const REGION_PREFIXES = {
  wnam: "1",
  enam: "2",
  sam: "3",
  weur: "4",
  me: "5",
  apac: "6",
  oc: "7",
  afr: "8",
} as const satisfies Partial<Record<DurableObjectLocationHint, string>>;

export type Region = keyof typeof REGION_PREFIXES;

export const REGION_CONFIG = {
  fallback: "enam" as Region,
  /** North America west of this longitude goes to wnam. */
  northAmericaWestLongitude: -100,
  /** Asia west of this longitude (Middle East) goes to me. */
  middleEastMaxLongitude: 60,
  durableObjectNamePrefix: "region:",
  /** Fresh codes tried when one is already taken (100,000 per region, so collisions are rare). */
  maxCodeAttempts: 5,
} as const;

export type UsageMetricKey =
  | "workerRequests"
  | "durableObjectRequests"
  | "durableObjectDurationGbSeconds"
  | "sqliteRowsRead"
  | "sqliteRowsWritten";

export const FREE_TIER = {
  /** Stop creating rooms once any metric reaches this share of its daily limit. */
  stopAtRatio: 0.85,
  /** Workers Free plan daily limits (reset 00:00 UTC). Confirm in the Cloudflare dashboard. */
  dailyLimits: {
    workerRequests: 100_000,
    durableObjectRequests: 100_000,
    durableObjectDurationGbSeconds: 13_000,
    sqliteRowsRead: 5_000_000,
    sqliteRowsWritten: 100_000,
  } satisfies Record<UsageMetricKey, number>,
  /** Durable Objects are billed at 128 MB while active. */
  durableObjectMemoryGb: 0.125,
  microsecondsPerSecond: 1_000_000,
  analyticsEndpoint: "https://api.cloudflare.com/client/v4/graphql",
  statusKey: "usage-status",
  /** KV entry outlives a missed day of checks, then expires. */
  statusTtlSeconds: 2 * 24 * 60 * 60,
  /** Per-isolate cache of the KV status, to save KV reads. */
  statusCacheMs: 60_000,
} as const;
