const RELOADED_AT_KEY = "locade:staleBuildReloadAt";
/** Don't reload again within this long, so a file that's really missing can't loop the page. */
const RELOAD_GUARD_MS = 60_000;

/**
 * After a deploy, a page opened before it may ask for a game's file by its old name, which is gone.
 * Reload once instead: the page comes back with the new files, and a refresh inside a room rejoins the same seat.
 */
export function installStaleBuildReload(): void {
  window.addEventListener("vite:preloadError", (event) => {
    let last = 0;
    try {
      last = Number(sessionStorage.getItem(RELOADED_AT_KEY)) || 0;
    } catch {
      // Storage blocked: still reload, the guard just can't be kept.
    }
    if (Date.now() - last < RELOAD_GUARD_MS) return;
    event.preventDefault();
    try {
      sessionStorage.setItem(RELOADED_AT_KEY, String(Date.now()));
    } catch {
      // As above.
    }
    window.location.reload();
  });
}
