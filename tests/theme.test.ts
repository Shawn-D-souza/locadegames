import { describe, expect, it } from "vitest";
import { colors, contrastRatio, getPlayerColor, playerColors } from "../src/theme";

/** WCAG minimum for large/bold text, which is what player bars and buttons use. */
const LARGE_TEXT_CONTRAST = 3;
/** WCAG minimum for normal text, e.g. the result details on the match screen wash. */
const TEXT_CONTRAST = 4.5;

describe("theme contrast", () => {
  it("gives every player color readable text", () => {
    playerColors.forEach((_, index) => {
      const color = getPlayerColor(index);
      expect(contrastRatio(color.base, color.text), color.name).toBeGreaterThanOrEqual(LARGE_TEXT_CONTRAST);
    });
  });

  it("keeps ink text readable on every player's screen wash", () => {
    playerColors.forEach((_, index) => {
      const color = getPlayerColor(index);
      expect(contrastRatio(color.wash, colors.ink), color.name).toBeGreaterThanOrEqual(TEXT_CONTRAST);
    });
  });

  it("keeps white button text readable on coral and ink", () => {
    expect(contrastRatio(colors.coral, colors.white)).toBeGreaterThanOrEqual(LARGE_TEXT_CONTRAST);
    expect(contrastRatio(colors.ink, colors.white)).toBeGreaterThanOrEqual(LARGE_TEXT_CONTRAST);
  });
});
