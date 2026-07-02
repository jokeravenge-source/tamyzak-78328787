import { useEffect, useState } from "react";

export type NavVisibilityMode = "always" | "auto-hide";

export const NAV_VISIBILITY_KEY = "app_nav_visibility_mode_v1";
export const NAV_VISIBILITY_EVENT = "app:nav-visibility-changed";

export function getNavVisibilityMode(): NavVisibilityMode {
  try {
    const v = localStorage.getItem(NAV_VISIBILITY_KEY);
    return v === "auto-hide" ? "auto-hide" : "always";
  } catch {
    return "always";
  }
}

export function setNavVisibilityMode(mode: NavVisibilityMode) {
  try {
    localStorage.setItem(NAV_VISIBILITY_KEY, mode);
    window.dispatchEvent(new CustomEvent(NAV_VISIBILITY_EVENT, { detail: { mode } }));
  } catch { /* ignore */ }
}

/**
 * Returns whether the bottom nav bar should be visible right now.
 * "always" → always true. "auto-hide" → hide on scroll down, show on scroll up / near top.
 */
export function useNavVisibility(): boolean {
  const [mode, setMode] = useState<NavVisibilityMode>(() => getNavVisibilityMode());
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ mode: NavVisibilityMode }>).detail;
      setMode(detail?.mode ?? getNavVisibilityMode());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === NAV_VISIBILITY_KEY) setMode(getNavVisibilityMode());
    };
    window.addEventListener(NAV_VISIBILITY_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(NAV_VISIBILITY_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (mode === "always") {
      setVisible(true);
      return;
    }
    let lastY = window.scrollY;
    let ticking = false;
    const THRESHOLD = 8;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - lastY;
        if (y < 40) {
          setVisible(true);
        } else if (dy > THRESHOLD) {
          setVisible(false);
        } else if (dy < -THRESHOLD) {
          setVisible(true);
        }
        lastY = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mode]);

  return mode === "always" ? true : visible;
}