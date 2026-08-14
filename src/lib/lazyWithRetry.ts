import { lazy as reactLazy, type ComponentType } from "react";

const RELOAD_KEY = "chunk-reload-at";

/**
 * Lazy import that survives stale build chunks after a deploy.
 * When a dynamic import fails (old hashed file no longer exists),
 * we hard-reload once to pick up the new index.html/asset map.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return reactLazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem(RELOAD_KEY);
      return mod;
    } catch (err) {
      const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
      // only reload once per 10s to avoid infinite loops
      if (Date.now() - last > 10_000) {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
        window.location.reload();
        // keep the promise pending while the page reloads
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
}
