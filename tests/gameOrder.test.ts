import { describe, expect, it } from "vitest";
import { GAMES } from "../src/shared/games/catalog";
import { orderGames } from "../src/web/utils/gameOrder";

const order = (online: number) => orderGames(GAMES, online).map((game) => game.id);

describe("orderGames", () => {
  it("keeps the catalog's order with 2 players, moves tournaments down with 3+, and games the room can't start to the bottom", () => {
    const together = ["dotsclash", "territory", "dotsboxes", "ludo", "memory", "snakesladders"];
    const tournaments = ["fourinarow", "seabattle", "headcrash", "checkers", "chess", "tictactoe", "ultimate"];
    expect({ alone: order(1), two: order(2), four: order(4), five: order(5) }).toEqual({
      alone: GAMES.map((game) => game.id),
      two: GAMES.map((game) => game.id),
      four: ["dotsclash", "territory", "dotsboxes", "pool", "ludo", "memory", "carrom", "snakesladders", ...tournaments],
      five: [...together, ...tournaments, "pool", "carrom"],
    });
  });
});
