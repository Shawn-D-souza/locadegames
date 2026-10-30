import type { CSSProperties } from "react";
import { getPlayerColor } from "../../theme";

/** CSS variables that let any component paint itself in a player's color. */
export function playerStyle(colorIndex: number): CSSProperties {
  const color = getPlayerColor(colorIndex);
  return {
    "--player": color.base,
    "--player-dark": color.dark,
    "--player-tint": color.tint,
    "--player-wash": color.wash,
    "--player-text": color.text,
  } as CSSProperties;
}
