// File: chunkRecovery.ts
// Purpose: Recovers from "stale chunk" failures after a new deployment.
// Logic/Approach: Vite fires `vite:preloadError` on window when a lazily
// imported chunk cannot be loaded. The usual cause on Vercel: this tab still
// runs the PREVIOUS deployment's index.html, whose hashed chunk files no
// longer exist on the host. One reload fetches the new index.html and fixes
// it. A sessionStorage flag stops a genuine outage (host down) from turning
// into an endless reload loop; it is cleared once the page has stayed up for
// a while, so the next deployment can recover again. If the reload is not
// allowed, the original error is left to propagate to the ErrorBoundary.
const RELOAD_FLAG_KEY = "vp.chunkReload";
const FLAG_RESET_AFTER_MS = 10_000;

// Reloads once when a stale lazy chunk fails to load after a new deploy.
export function installChunkReloadRecovery(): void {
  window.addEventListener("vite:preloadError", (event) => {
    try {
      if (window.sessionStorage.getItem(RELOAD_FLAG_KEY) === "1") return;
      window.sessionStorage.setItem(RELOAD_FLAG_KEY, "1");
    } catch {
      // Without storage there is no loop guard, so do not reload.
      return;
    }

    // Suppress the import error: the page is about to be replaced anyway.
    event.preventDefault();
    window.location.reload();
  });

  window.setTimeout(() => {
    try {
      window.sessionStorage.removeItem(RELOAD_FLAG_KEY);
    } catch {
      // Nothing to clean up if storage is unavailable.
    }
  }, FLAG_RESET_AFTER_MS);
}
