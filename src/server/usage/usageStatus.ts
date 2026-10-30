import type { UsageMetricKey } from "../config";

export interface MetricReading {
  key: UsageMetricKey;
  used: number;
}

export interface MetricUsage extends MetricReading {
  limit: number;
  ratio: number;
}

/** What the cron stores in KV and room creation reads back. */
export interface UsageStatus {
  state: "open" | "full";
  /** ISO time new rooms are allowed again; null while open. */
  resetAt: string | null;
  checkedAt: string;
  metrics: MetricUsage[];
  /** Metrics whose query failed this round (not counted). */
  failed: UsageMetricKey[];
}
