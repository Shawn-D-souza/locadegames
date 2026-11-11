/** Head Crash's code (its physics, netcode and drawing) is its own download, so the room opens fast; the room hub preloads it. */
export const loadHeadCrash = () => import("./HeadCrashScreen");
