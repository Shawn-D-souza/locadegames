import type { CSSProperties } from "react";
import { getPlayerColor, quitColor, type PlayerColor } from "../../theme";

/** CSS variables that let any component paint itself in a player's color. */
export function playerStyle(colorIndex: number): CSSProperties {
  return colorStyle(getPlayerColor(colorIndex));
}

/** The same variables in the grey of a player who quit (their pieces left on a board). */
export function quitStyle(): CSSProperties {
  return colorStyle(quitColor());
}

function colorStyle(color: PlayerColor): CSSProperties {
  return {
    "--player": color.base,
    "--player-dark": color.dark,
    "--player-tint": color.tint,
    "--player-light": color.light,
    "--player-wash": color.wash,
    "--player-edge": color.edge,
    "--player-edge-light": color.edgeLight,
    "--player-text": color.text,
  } as CSSProperties;
}
