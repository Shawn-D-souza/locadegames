import { nextUtcMidnight } from "../../shared/time/nextUtcMidnight";
import type { UsageMetricKey } from "../config";
import type { MetricReading, UsageStatus } from "./usageStatus";

/** Pure: turns today's readings into an open/full status. Full if any metric reaches `stopAtRatio`. */
export function evaluateUsage(
  readings: MetricReading[],
  failed: UsageMetricKey[],
  limits: Record<UsageMetricKey, number>,
  stopAtRatio: number,
  now: Date,
): UsageStatus {
  const metrics = readings.map((reading) => {
    const limit = limits[reading.key];
    return { ...reading, limit, ratio: reading.used / limit };
  });
  const full = metrics.some((m) => m.ratio >= stopAtRatio);
  return {
    state: full ? "full" : "open",
    resetAt: full ? nextUtcMidnight(now).toISOString() : null,
    checkedAt: now.toISOString(),
    metrics,
    failed,
  };
}
