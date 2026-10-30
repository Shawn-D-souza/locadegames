import { utcDateString } from "../../shared/time/nextUtcMidnight";
import { FREE_TIER, type UsageMetricKey } from "../config";
import type { Env } from "../env";
import { fetchDatasetSums } from "./analyticsClient";
import { evaluateUsage } from "./evaluateUsage";
import { buildUsageQuery, USAGE_QUERIES } from "./usageQueries";
import type { MetricReading } from "./usageStatus";

/** Cron job: measures today's account usage and stores open/full in KV. */
export async function checkUsage(env: Env, now: Date): Promise<void> {
  const { CF_API_TOKEN: token, CF_ACCOUNT_ID: accountId } = env;
  if (!token || !accountId) {
    console.warn("usage check skipped: CF_API_TOKEN / CF_ACCOUNT_ID not set");
    return;
  }

  const date = utcDateString(now);
  const results = await Promise.allSettled(
    USAGE_QUERIES.map(async (query): Promise<MetricReading> => {
      const sums = await fetchDatasetSums(token, buildUsageQuery(query, accountId, date), query.dataset);
      return { key: query.key, used: query.toValue(sums) };
    }),
  );

  const readings: MetricReading[] = [];
  const failed: UsageMetricKey[] = [];
  results.forEach((result, i) => {
    const key = USAGE_QUERIES[i]!.key;
    if (result.status === "fulfilled") readings.push(result.value);
    else {
      failed.push(key);
      console.error(`usage metric ${key} failed:`, String(result.reason));
    }
  });

  if (readings.length === 0) {
    console.error("usage check: every metric failed; keeping previous status");
    return;
  }

  const status = evaluateUsage(readings, failed, FREE_TIER.dailyLimits, FREE_TIER.stopAtRatio, now);
  await env.USAGE.put(FREE_TIER.statusKey, JSON.stringify(status), { expirationTtl: FREE_TIER.statusTtlSeconds });
  console.log("usage check", JSON.stringify(status));
}
