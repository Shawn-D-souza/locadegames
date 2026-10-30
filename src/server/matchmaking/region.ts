import { REGION_CONFIG, REGION_PREFIXES, type Region } from "../config";
import type { Env } from "../env";

interface RequestLocation {
  continent?: string;
  longitude?: string;
}

/** Picks the nearest region we run in from Cloudflare's request geolocation. */
export function pickRegion(location: RequestLocation | undefined): Region {
  const longitude = Number(location?.longitude ?? NaN);
  switch (location?.continent) {
    case "NA":
      return longitude < REGION_CONFIG.northAmericaWestLongitude ? "wnam" : "enam";
    case "SA":
      return "sam";
    case "EU":
      return "weur";
    case "AS":
      return longitude < REGION_CONFIG.middleEastMaxLongitude ? "me" : "apac";
    case "OC":
    case "AN":
      return "oc";
    case "AF":
      return "afr";
    default:
      return REGION_CONFIG.fallback;
  }
}

export function regionForPrefix(prefix: string): Region | null {
  const entry = Object.entries(REGION_PREFIXES).find(([, p]) => p === prefix);
  return entry ? (entry[0] as Region) : null;
}

export function regionServerStub(namespace: Env["REGION_SERVER"], region: Region) {
  return namespace.getByName(`${REGION_CONFIG.durableObjectNamePrefix}${region}`, { locationHint: region });
}
