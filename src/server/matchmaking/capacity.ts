import { FREE_TIER } from "../config";
import type { UsageStatus } from "../usage/usageStatus";

export type Capacity = { open: true } | { open: false; resetAt: string };

let cached: { status: UsageStatus | null; fetchedAt: number } | null = null;

/** Reads the status written by the usage cron. Missing/expired status means open. */
export async function getCapacity(kv: KVNamespace, now: number): Promise<Capacity> {
  if (!cached || now - cached.fetchedAt > FREE_TIER.statusCacheMs) {
    const status = await kv.get<UsageStatus>(FREE_TIER.statusKey, "json");
    cached = { status, fetchedAt: now };
  }
  const status = cached.status;
  if (status?.state === "full" && status.resetAt && Date.parse(status.resetAt) > now) {
    return { open: false, resetAt: status.resetAt };
  }
  return { open: true };
}
