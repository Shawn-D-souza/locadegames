import { FREE_TIER, type UsageMetricKey } from "../config";

/**
 * One GraphQL query per metric, so a field Cloudflare renames only disables that
 * metric (logged) instead of the whole check. Datasets are account-wide.
 */
export interface UsageQuery {
  key: UsageMetricKey;
  dataset: string;
  fields: string[];
  toValue(sums: Record<string, number>): number;
}

const field = (sums: Record<string, number>, name: string) => sums[name] ?? 0;

export const USAGE_QUERIES: UsageQuery[] = [
  {
    key: "workerRequests",
    dataset: "workersInvocationsAdaptive",
    fields: ["requests"],
    toValue: (s) => field(s, "requests"),
  },
  {
    key: "durableObjectRequests",
    dataset: "durableObjectsInvocationsAdaptiveGroups",
    fields: ["requests"],
    toValue: (s) => field(s, "requests"),
  },
  {
    key: "durableObjectDurationGbSeconds",
    dataset: "durableObjectsPeriodicGroups",
    fields: ["activeTime"],
    toValue: (s) => (field(s, "activeTime") / FREE_TIER.microsecondsPerSecond) * FREE_TIER.durableObjectMemoryGb,
  },
  {
    key: "sqliteRowsRead",
    dataset: "durableObjectsPeriodicGroups",
    fields: ["rowsRead"],
    toValue: (s) => field(s, "rowsRead"),
  },
  {
    key: "sqliteRowsWritten",
    dataset: "durableObjectsPeriodicGroups",
    fields: ["rowsWritten"],
    toValue: (s) => field(s, "rowsWritten"),
  },
];

const ACCOUNT_ID = /^[a-f0-9]{32}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Builds the query text. Inputs are validated, so inlining them is safe. */
export function buildUsageQuery(query: UsageQuery, accountId: string, date: string): string {
  if (!ACCOUNT_ID.test(accountId)) throw new Error("CF_ACCOUNT_ID must be a 32-character hex id");
  if (!DATE.test(date)) throw new Error(`Bad date: ${date}`);
  return `{
  viewer {
    accounts(filter: { accountTag: "${accountId}" }) {
      ${query.dataset}(limit: 10000, filter: { date_geq: "${date}" }) {
        sum { ${query.fields.join(" ")} }
      }
    }
  }
}`;
}
