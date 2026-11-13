import type { CSSProperties } from "react";
import { colors } from "../../../theme";

/** A sunk ship's burnt colors, in the variables a ship is drawn with (in place of its player's): a charred hull, a darker deck, dull fittings. */
export const WRECK_STYLE = {
  "--player": colors.char,
  "--player-dark": colors.charDeck,
  "--player-light": colors.charDeck,
  "--ship-part": colors.charPart,
} as CSSProperties;
