import { describe, expect, it } from "vitest";
import { isGameId } from "../src/shared/games/catalog";
import { sanitizePlayerName } from "../src/shared/rooms/playerName";
import {
  FORMATTED_CODE_LENGTH,
  formatRoomCode,
  generateRoomCode,
  isValidRoomCode,
  normalizeRoomCode,
  regionPrefixOf,
} from "../src/shared/rooms/roomCode";
import { REGION_PREFIXES } from "../src/server/config";
import { claimRoomCode } from "../src/server/matchmaking/claimRoomCode";
import { pickRegion, regionForPrefix } from "../src/server/matchmaking/region";
import { isOriginAllowed } from "../src/server/http/origins";

describe("game catalog", () => {
  it("accepts only listed game ids", () => {
    expect(isGameId("tictactoe")).toBe(true);
    expect(isGameId("chess")).toBe(false);
    expect(isGameId(null)).toBe(false);
  });
});

describe("room codes", () => {
  it("generates valid codes with the region prefix", () => {
    let i = 0;
    const code = generateRoomCode("4", () => i++);
    expect(code).toBe("401234");
    expect(isValidRoomCode(code)).toBe(true);
    expect(regionPrefixOf(code)).toBe("4");
  });

  it("normalizes user input and formats codes in groups", () => {
    expect(normalizeRoomCode(" 482-91 3 ")).toBe("482913");
    expect(isValidRoomCode("48291A")).toBe(false);
    expect(isValidRoomCode("48291")).toBe(false);
    expect(formatRoomCode("482913")).toBe("482 913");
    expect(formatRoomCode("4829")).toBe("482 9");
    expect(FORMATTED_CODE_LENGTH).toBe(7);
  });

  it("gives every region its own prefix from the code alphabet", () => {
    const prefixes = Object.values(REGION_PREFIXES);
    expect(new Set(prefixes).size).toBe(prefixes.length);
    for (const [region, prefix] of Object.entries(REGION_PREFIXES)) {
      expect(isValidRoomCode(prefix.padEnd(6, "0"))).toBe(true);
      expect(regionForPrefix(prefix)).toBe(region);
    }
  });

  it("retries taken codes and never reuses one", async () => {
    const taken = new Set(["400001", "400002"]);
    const candidates = ["400001", "400002", "400003"];
    const tryCreate = async (code: string) => !taken.has(code) && !!taken.add(code);
    expect(await claimRoomCode(() => candidates.shift()!, tryCreate, 5)).toBe("400003");
    expect(await claimRoomCode(() => "400001", tryCreate, 5)).toBeNull();
  });
});

describe("regions", () => {
  it("maps request geolocation to a region", () => {
    expect(pickRegion({ continent: "NA", longitude: "-122.4" })).toBe("wnam");
    expect(pickRegion({ continent: "NA", longitude: "-74" })).toBe("enam");
    expect(pickRegion({ continent: "EU" })).toBe("weur");
    expect(pickRegion({ continent: "AS", longitude: "55.3" })).toBe("me");
    expect(pickRegion({ continent: "AS", longitude: "77.2" })).toBe("apac");
    expect(pickRegion(undefined)).toBe("enam");
  });
});

describe("player names", () => {
  it("trims, collapses whitespace and limits length", () => {
    expect(sanitizePlayerName("  Sam   the  Great ")).toBe("Sam the Great");
    expect(sanitizePlayerName("a".repeat(40))).toHaveLength(16);
    expect(sanitizePlayerName("   ")).toBeNull();
    expect(sanitizePlayerName("\u0007")).toBeNull();
  });
});

describe("origins", () => {
  const allow = "https://locadegames.pages.dev, https://*.locadegames.pages.dev";
  it("matches exact and preview origins only", () => {
    expect(isOriginAllowed("https://locadegames.pages.dev", allow)).toBe(true);
    expect(isOriginAllowed("https://abc123.locadegames.pages.dev", allow)).toBe(true);
    expect(isOriginAllowed("https://evil.com", allow)).toBe(false);
    expect(isOriginAllowed("https://a.b.locadegames.pages.dev", allow)).toBe(false);
    expect(isOriginAllowed("https://locadegames.pages.dev.evil.com", allow)).toBe(false);
    expect(isOriginAllowed(null, allow)).toBe(false);
  });
});
