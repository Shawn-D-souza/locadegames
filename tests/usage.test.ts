import { describe, expect, it } from "vitest";
import { nextUtcMidnight, utcDateString } from "../src/shared/time/nextUtcMidnight";
import { FREE_TIER } from "../src/server/config";
import { evaluateUsage } from "../src/server/usage/evaluateUsage";
import { buildUsageQuery, USAGE_QUERIES } from "../src/server/usage/usageQueries";

const NOW = new Date("2026-10-28T15:42:00Z");
const ACCOUNT = "0123456789abcdef0123456789abcdef";

describe("evaluateUsage", () => {
  it("stays open below the threshold", () => {
    const status = evaluateUsage([{ key: "workerRequests", used: 84_999 }], [], FREE_TIER.dailyLimits, 0.85, NOW);
    expect(status.state).toBe("open");
    expect(status.resetAt).toBeNull();
  });

  it("goes full when any metric hits 85% and resets at the next 00:00 UTC", () => {
    const status = evaluateUsage(
      [
        { key: "workerRequests", used: 10 },
        { key: "sqliteRowsWritten", used: 85_000 },
      ],
      ["sqliteRowsRead"],
      FREE_TIER.dailyLimits,
      0.85,
      NOW,
    );
    expect(status.state).toBe("full");
    expect(status.resetAt).toBe("2026-10-29T00:00:00.000Z");
    expect(status.failed).toEqual(["sqliteRowsRead"]);
  });
});

describe("usage queries", () => {
  it("converts Durable Object active time to GB-seconds", () => {
    const duration = USAGE_QUERIES.find((q) => q.key === "durableObjectDurationGbSeconds")!;
    expect(duration.toValue({ activeTime: 8_000_000 })).toBe(1);
  });

  it("builds a query for today and validates inputs", () => {
    const text = buildUsageQuery(USAGE_QUERIES[0]!, ACCOUNT, utcDateString(NOW));
    expect(text).toContain('accountTag: "0123456789abcdef0123456789abcdef"');
    expect(text).toContain('date_geq: "2026-10-28"');
    expect(() => buildUsageQuery(USAGE_QUERIES[0]!, 'x" }', "2026-10-28")).toThrow();
  });
});

describe("nextUtcMidnight", () => {
  it("rolls over months and years", () => {
    expect(nextUtcMidnight(new Date("2026-12-31T23:59:59Z")).toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});
