import type { MemoryFace } from "../../../shared/games/memory/types";
import { getPlayerColor } from "../../../theme";
import { PICTURE_ART } from "./pictureArt";

/** A face's name for screen readers and playtests: "red knight", "blue die showing 3". */
export function faceName(face: MemoryFace): string {
  return `${getPlayerColor(face.color).name.toLowerCase()} ${PICTURE_ART[face.picture].name}`;
}
