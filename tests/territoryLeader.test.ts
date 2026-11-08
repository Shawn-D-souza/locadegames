import { describe, expect, it } from "vitest";
import { leaderOf } from "../src/web/games/territory/engine/leader";

describe("leaderOf", () => {
  it("crowns whoever has the most land", () => {
    expect(leaderOf([{ id: 0, area: 5 }, { id: 3, area: 9 }, { id: 1, area: 2 }])).toBe(3);
  });

  it("crowns no one while the top is a tie (the start) or nobody has land", () => {
    expect(leaderOf([{ id: 0, area: 9 }, { id: 1, area: 9 }, { id: 2, area: 4 }])).toBeNull();
    expect(leaderOf([{ id: 0, area: 9 }, { id: 1, area: 4 }, { id: 2, area: 9 }])).toBeNull();
    expect(leaderOf([])).toBeNull();
    expect(leaderOf([{ id: 0, area: 0 }])).toBeNull();
  });

  it("crowns the leader even when others are tied below them", () => {
    expect(leaderOf([{ id: 0, area: 4 }, { id: 1, area: 4 }, { id: 2, area: 9 }])).toBe(2);
  });
});
