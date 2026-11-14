/** Pool's screen (its table drawing, aiming and playback) is its own download, so the room opens fast; the room hub preloads it. */
export const loadPool = () => import("./PoolScreen");
