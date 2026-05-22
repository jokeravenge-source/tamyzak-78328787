import { useEffect } from "react";
import { applyTheme } from "./ThemePicker";

const REDO_KEY = "flashcard_redo_required_v1";
const ZOMBIE_KEY = "zombie_mode_active_v1";

export const setRedoRequired = (subject: string, chapter: string, minutes = 10) => {
  const payload = { subject, chapter, deadline: Date.now() + minutes * 60 * 1000 };
  localStorage.setItem(REDO_KEY, JSON.stringify(payload));
};

export const clearRedoAndZombie = () => {
  localStorage.removeItem(REDO_KEY);
  localStorage.removeItem(ZOMBIE_KEY);
  document.documentElement.classList.remove("zombie-mode");
  window.dispatchEvent(new Event("app:zombie-changed"));
};

export const isZombieActive = () => localStorage.getItem(ZOMBIE_KEY) === "1";

const evaluate = () => {
  if (localStorage.getItem(ZOMBIE_KEY) === "1") {
    document.documentElement.classList.add("zombie-mode");
    applyTheme("zombie" as any);
    return;
  }
  const raw = localStorage.getItem(REDO_KEY);
  if (!raw) return;
  try {
    const p = JSON.parse(raw) as { deadline: number };
    if (Date.now() > p.deadline) {
      localStorage.setItem(ZOMBIE_KEY, "1");
      document.documentElement.classList.add("zombie-mode");
      applyTheme("zombie" as any);
      window.dispatchEvent(new Event("app:zombie-changed"));
    }
  } catch {}
};

const ZombieGuard = () => {
  useEffect(() => {
    evaluate();
    const i = setInterval(evaluate, 30_000);
    return () => clearInterval(i);
  }, []);
  return null;
};

export default ZombieGuard;