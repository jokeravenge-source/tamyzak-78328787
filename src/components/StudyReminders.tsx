import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { STUDY_PLAN_STORAGE_KEY } from "@/components/SubjectFocusPicker";
import type { AppLanguage } from "@/components/LanguageGate";

type Task = { title: string; start?: string; end?: string };
type Day = { day: string; tasks: (string | Task)[] };
type StoredPlan = {
  plan: { days?: Day[]; subject?: string };
  savedAt: number;
  language?: AppLanguage;
};

const FIRED_KEY = "app_study_plan_fired_v1";

function loadFired(): Record<string, number> {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}
function saveFired(f: Record<string, number>) {
  try { localStorage.setItem(FIRED_KEY, JSON.stringify(f)); } catch { /* ignore */ }
}

function todayDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function parseTimeToday(hhmm: string): number | null {
  const m = hhmm?.match?.(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mi = parseInt(m[2], 10);
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  const d = new Date();
  d.setHours(h, mi, 0, 0);
  return d.getTime();
}

async function notifyBrowser(title: string, body: string) {
  try {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    } else if (Notification.permission !== "denied") {
      const p = await Notification.requestPermission();
      if (p === "granted") new Notification(title, { body });
    }
  } catch { /* ignore */ }
}

const StudyReminders = ({ language }: { language: AppLanguage }) => {
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    // Ask for notification permission once, unobtrusively.
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => { /* ignore */ });
    }
  }, []);

  useEffect(() => {
    // Clear any old timers on re-run.
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];

    let raw: string | null = null;
    try { raw = localStorage.getItem(STUDY_PLAN_STORAGE_KEY); } catch { /* ignore */ }
    if (!raw) return;

    let stored: StoredPlan | null = null;
    try { stored = JSON.parse(raw) as StoredPlan; } catch { return; }
    if (!stored?.plan?.days?.length) return;

    const isAr = (stored.language ?? language) === "ar";

    // Interpret the plan as recurring for today: schedule every task's start & end
    // on today's clock. When a day rolls over, a fresh reload re-schedules.
    const dateKey = todayDateKey();
    const fired = loadFired();

    const fire = async (
      kind: "start" | "end",
      task: Task,
      dayLabel: string,
      firedKey: string,
    ) => {
      if (fired[firedKey]) return;
      fired[firedKey] = Date.now();
      saveFired(fired);

      const title =
        kind === "start"
          ? (isAr ? `⏰ ابدأ: ${task.title}` : `⏰ Start: ${task.title}`)
          : (isAr ? `✅ انتهى: ${task.title}` : `✅ Finished: ${task.title}`);
      const body =
        kind === "start"
          ? (isAr
              ? `${dayLabel} • ${task.start ?? ""}–${task.end ?? ""}\nحان وقت هذه المهمة.`
              : `${dayLabel} • ${task.start ?? ""}–${task.end ?? ""}\nTime to start this task.`)
          : (isAr
              ? `${dayLabel} • انتهى وقت هذه المهمة. جهّز نفسك للمهمة التالية.`
              : `${dayLabel} • Time is up. Get ready for the next task.`);

      toast(title, { description: body, duration: 12000 });
      notifyBrowser(title, body);
      supabase.functions.invoke("study-plan-notify", {
        body: {
          kind: "reminder",
          language: isAr ? "ar" : "en",
          title,
          message: body,
        },
      }).catch(() => { /* ignore */ });
    };

    const now = Date.now();
    // Only schedule for the first day of the plan today (most plans are same-day).
    const day = stored.plan.days[0];
    for (let ti = 0; ti < (day.tasks ?? []).length; ti++) {
      const rawTask = day.tasks[ti];
      const task: Task = typeof rawTask === "string" ? { title: rawTask } : rawTask;
      if (!task.start && !task.end) continue;

      if (task.start) {
        const at = parseTimeToday(task.start);
        if (at && at > now) {
          const firedKey = `${dateKey}|d0|t${ti}|start`;
          const timeout = window.setTimeout(
            () => fire("start", task, day.day, firedKey),
            at - now,
          );
          timersRef.current.push(timeout);
        }
      }
      if (task.end) {
        const at = parseTimeToday(task.end);
        if (at && at > now) {
          const firedKey = `${dateKey}|d0|t${ti}|end`;
          const timeout = window.setTimeout(
            () => fire("end", task, day.day, firedKey),
            at - now,
          );
          timersRef.current.push(timeout);
        }
      }
    }

    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
  }, [language]);

  return null;
};

export default StudyReminders;