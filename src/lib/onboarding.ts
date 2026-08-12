import { supabase } from "@/integrations/supabase/client";
import { getChaptersForSubject, type ChapterMeta } from "@/data/subjectChapters";
import { buildBattleMcqs, type BattleMCQ } from "@/lib/battleMcqBank";
import { cardKey } from "@/lib/srs";
import type { SyncedTodo } from "@/lib/todosSync";

export type OnboardingSubject =
  | "physics" | "chemistry" | "biology" | "arabic" | "english" | "french" | "islamic";

export const ONBOARDING_SUBJECTS: { code: OnboardingSubject; en: string; ar: string }[] = [
  { code: "physics", en: "Physics", ar: "الفيزياء" },
  { code: "chemistry", en: "Chemistry", ar: "الكيمياء" },
  { code: "biology", en: "Biology", ar: "الأحياء" },
  { code: "arabic", en: "Arabic", ar: "اللغة العربية" },
  { code: "english", en: "English", ar: "اللغة الإنكليزية" },
  { code: "french", en: "French", ar: "اللغة الفرنسية" },
  { code: "islamic", en: "Islamic Education", ar: "التربية الإسلامية" },
];

/** Predefined weak-area topics per subject — the chapters already used app-wide. */
export function weakTopicsFor(subject: OnboardingSubject): ChapterMeta[] {
  return getChaptersForSubject(subject).filter((c) => !c.locked);
}

export function topicLabel(t: ChapterMeta, language: "ar" | "en") {
  return language === "ar" ? t.arTitle : t.title;
}

export function subjectLabelFor(subject: OnboardingSubject, language: "ar" | "en") {
  const s = ONBOARDING_SUBJECTS.find((x) => x.code === subject);
  return s ? (language === "ar" ? s.ar : s.en) : subject;
}

/* ---------------- persisted onboarding profile ---------------- */

export type OnboardingProfile = {
  completed: boolean;
  subject: OnboardingSubject;
  topics: number[];        // chapter numbers picked as weak areas
  weakestTopic: number;    // chapter number with the lowest diagnostic score
  score: number;           // correct answers
  total: number;
  telegramOptIn: boolean;
  completedAt: string;
};

const KEY = "tmz_onboarding_v1";

export function readOnboarding(): OnboardingProfile | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OnboardingProfile) : null;
  } catch {
    return null;
  }
}

export function saveOnboarding(p: OnboardingProfile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
    window.dispatchEvent(new Event("app:onboarding-updated"));
  } catch {
    /* ignore */
  }
}

export function isOnboardingDone(): boolean {
  return !!readOnboarding()?.completed;
}

/** Marks onboarding as done locally (minimal record) without a full profile. */
function markLocalDone() {
  const cur = readOnboarding();
  saveOnboarding({
    completed: true,
    subject: cur?.subject ?? "physics",
    topics: cur?.topics ?? [],
    weakestTopic: cur?.weakestTopic ?? 1,
    score: cur?.score ?? 0,
    total: cur?.total ?? 0,
    telegramOptIn: cur?.telegramOptIn ?? false,
    completedAt: cur?.completedAt ?? new Date().toISOString(),
  });
}

/** Persists the "onboarded" flag on the account so it never shows again, on any device. */
export async function markOnboardedRemote(): Promise<void> {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase
      .from("student_profile")
      .upsert({ user_id: u.user.id, onboarded: true }, { onConflict: "user_id" });
  } catch { /* ignore */ }
}

/**
 * Returns true when this account already completed onboarding (ever).
 * Also backfills the server flag when only the local record exists.
 */
export async function syncOnboardingWithServer(): Promise<boolean> {
  const localDone = isOnboardingDone();
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return localDone;
    const { data } = await supabase
      .from("student_profile")
      .select("onboarded")
      .eq("user_id", u.user.id)
      .maybeSingle();
    if (data?.onboarded) {
      if (!localDone) markLocalDone();
      return true;
    }
    if (localDone) await markOnboardedRemote();
    return localDone;
  } catch {
    return localDone;
  }
}

/* ---------------- diagnostic questions ---------------- */

export function buildDiagnostic(subject: OnboardingSubject, count = 5): BattleMCQ[] {
  const seed = (Date.now() % 100000) + 1;
  const qs = buildBattleMcqs(subject, count, seed);
  return qs.length ? qs : buildBattleMcqs("general", count, seed);
}

/* ---------------- deck auto-generation (SRS) ---------------- */

/**
 * Seeds `flashcard_reviews` with cards for the weakest topic so they show up
 * in the existing "due today" review queue as a ready-made deck.
 */
export async function seedWeakTopicDeck(opts: {
  subject: OnboardingSubject;
  chapter: number;
  language: "ar" | "en";
  size?: number;
}): Promise<number> {
  const { subject, chapter, language, size = 10 } = opts;
  const pool = buildBattleMcqs(subject, size, (chapter + 7) * 131);
  if (!pool.length) return 0;
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return 0;
    const nowIso = new Date().toISOString();
    const rows = pool.map((m) => ({
      user_id: u.user!.id,
      card_key: cardKey(subject, String(chapter), m.q),
      subject,
      chapter: String(chapter),
      question: m.q,
      answer: m.choices[m.answer],
      language,
      ease: 2.5,
      interval_days: 0,
      reps: 0,
      lapses: 0,
      last_rating: null,
      due_at: nowIso,
    }));
    const { error } = await supabase
      .from("flashcard_reviews")
      .upsert(rows, { onConflict: "user_id,card_key", ignoreDuplicates: true });
    if (error) return 0;
    return rows.length;
  } catch {
    return 0;
  }
}

/* ---------------- suggested to-do tasks ---------------- */

const TODO_KEY = "app_todos_v1";
const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function todayDayKey(): string {
  // JS: 0=Sunday ... 6=Saturday → app week starts on Saturday
  const js = new Date().getDay();
  return DAYS[(js + 1) % 7];
}

/** Adds 1–2 suggested tasks for the weak subject/topic without touching existing ones. */
export function addSuggestedTodos(opts: {
  subject: OnboardingSubject;
  topic: ChapterMeta;
  language: "ar" | "en";
}): SyncedTodo[] {
  const { subject, topic, language } = opts;
  const subj = subjectLabelFor(subject, language);
  const label = topicLabel(topic, language);
  const texts = language === "ar"
    ? [`راجع بطاقات ${subj} — ${label}`, `حل أسئلة اختيار من متعدد في ${label}`]
    : [`Review ${subj} flashcards — ${label}`, `Solve MCQs on ${label}`];

  let items: SyncedTodo[] = [];
  try {
    items = JSON.parse(localStorage.getItem(TODO_KEY) || "[]") as SyncedTodo[];
  } catch {
    items = [];
  }
  const existing = new Set(items.map((t) => (t.text || "").trim()));
  const day = todayDayKey();
  const added = texts
    .filter((t) => !existing.has(t))
    .map((t, i) => ({ id: `onb-${Date.now()}-${i}`, text: t, done: false, day }));
  if (!added.length) return items;

  const next = [...items, ...added];
  try {
    localStorage.setItem(TODO_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("app:todos-changed"));
  } catch {
    /* ignore */
  }
  return next;
}
