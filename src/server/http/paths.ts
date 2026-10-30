/** URL routes served by the Worker. */
export const ROUTES = {
  createRoom: "/api/rooms",
} as const;

const ROOM_SOCKET_PATH = /^\/api\/rooms\/([^/]+)\/ws$/;

/** Returns the raw room code from `/api/rooms/:code/ws`, or null. */
export function matchRoomSocketPath(pathname: string): string | null {
  return ROOM_SOCKET_PATH.exec(pathname)?.[1] ?? null;
}
