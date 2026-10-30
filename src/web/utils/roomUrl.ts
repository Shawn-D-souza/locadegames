const ROOM_PARAM = "room";

/** The `?room=CODE` share link lets friends open straight into a room. */
export function readRoomFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get(ROOM_PARAM);
}

export function setRoomInUrl(code: string | null): void {
  const url = new URL(window.location.href);
  if (code) url.searchParams.set(ROOM_PARAM, code);
  else url.searchParams.delete(ROOM_PARAM);
  window.history.replaceState(null, "", url);
}

export function buildShareLink(code: string): string {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set(ROOM_PARAM, code);
  return url.toString();
}
