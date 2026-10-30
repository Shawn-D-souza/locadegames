import { FREE_TIER } from "../config";

interface GraphQlResponse {
  data?: { viewer?: { accounts?: Array<Record<string, Array<{ sum?: Record<string, number> }>>> } } | null;
  errors?: Array<{ message: string }> | null;
}

/** Runs one dataset query and adds up `sum` across all returned groups. */
export async function fetchDatasetSums(apiToken: string, queryText: string, dataset: string): Promise<Record<string, number>> {
  const response = await fetch(FREE_TIER.analyticsEndpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: queryText }),
  });
  if (!response.ok) throw new Error(`Analytics API HTTP ${response.status}`);

  const body = (await response.json()) as GraphQlResponse;
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join("; "));

  const groups = body.data?.viewer?.accounts?.[0]?.[dataset];
  if (!groups) throw new Error(`No data for ${dataset}`);

  const totals: Record<string, number> = {};
  for (const group of groups) {
    for (const [name, value] of Object.entries(group.sum ?? {})) totals[name] = (totals[name] ?? 0) + value;
  }
  return totals;
}
