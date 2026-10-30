import { describe, expect, it } from "vitest";
import { sanitizePlayerName } from "../src/shared/rooms/playerName";
import { NAME_ADJECTIVES, NAME_ANIMALS, randomName } from "../src/web/utils/randomName";

describe("randomName", () => {
  it("joins an adjective and an animal", () => {
    expect(randomName(() => 0)).toBe(`${NAME_ADJECTIVES[0]} ${NAME_ANIMALS[0]}`);
    expect(randomName(() => 0.999999)).toBe(`${NAME_ADJECTIVES.at(-1)} ${NAME_ANIMALS.at(-1)}`);
  });

  it("only makes names the server accepts unchanged", () => {
    for (const adjective of NAME_ADJECTIVES) {
      for (const animal of NAME_ANIMALS) {
        const name = `${adjective} ${animal}`;
        expect(sanitizePlayerName(name)).toBe(name);
      }
    }
  });
});
