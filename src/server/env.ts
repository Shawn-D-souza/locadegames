import type { RegionServer } from "./rooms/RegionServer";

/** Bindings, vars and secrets declared in wrangler.jsonc / `wrangler secret put`. */
export interface Env {
  REGION_SERVER: DurableObjectNamespace<RegionServer>;
  USAGE: KVNamespace;
  ALLOWED_ORIGINS: string;
  CF_API_TOKEN?: string;
  CF_ACCOUNT_ID?: string;
}
