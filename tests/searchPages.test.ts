import { describe, expect, it } from "vitest";
import { GAMES } from "../src/shared/games/catalog";
import { GAME_COPY } from "../src/web/search/content/gameCopy";
import { GAMES_INDEX_COPY, TOPIC_COPY } from "../src/web/search/content/topicCopy";

/** About what Google shows before cutting a result's headline and text off. */
const LIMITS = { title: 65, description: 160 };

describe("pages made for search", () => {
  it("fit their titles and descriptions into a Google result", () => {
    const pages = [...Object.values(GAME_COPY), ...Object.values(TOPIC_COPY), GAMES_INDEX_COPY];
    const tooLong = pages.flatMap((page) => [
      ...(page.title.length > LIMITS.title ? [`title (${page.title.length}): ${page.title}`] : []),
      ...(page.description.length > LIMITS.description ? [`description (${page.description.length}): ${page.title}`] : []),
    ]);
    expect(tooLong).toEqual([]);
  });

  it("give every game its own address and link only to other games", () => {
    const slugs = [...Object.values(GAME_COPY).map((copy) => copy.slug), ...Object.values(TOPIC_COPY).map((copy) => copy.slug)];
    const selfLinks = GAMES.filter((game) => GAME_COPY[game.id].related.includes(game.id)).map((game) => game.id);
    expect({ unique: new Set(slugs).size, selfLinks }).toEqual({ unique: slugs.length, selfLinks: [] });
  });
});
