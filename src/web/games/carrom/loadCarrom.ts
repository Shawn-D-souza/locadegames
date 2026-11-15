/** Carrom's screen (its board drawing, striker and playback) is its own download, so the room opens fast; the room hub preloads it. */
export const loadCarrom = () => import("./CarromScreen");
