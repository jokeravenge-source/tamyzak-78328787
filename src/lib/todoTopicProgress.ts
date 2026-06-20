// Match To-Do items against flashcard topic labels and report per-topic progress.
// Read-only — reads `app_todos_v1` from localStorage and listens to the
// `app:todos-changed` event so chips can re-render when todos change.

import { useEffect, useState } from "react";

type Todo = { id: string; text: string; done: boolean; day?: string };

const STORAGE_KEY = "app_todos_v1";

function normalize(s: string): string {
  return s
    .toLowerCase()
    // strip Arabic diacritics
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    // normalize alef variants
    .replace(/[\u0622\u0623\u0625]/g, "\u0627")
    .replace(/\u0649/g, "\u064A")
    .replace(/\u0629/g, "\u0647")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readTodos(): Todo[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function useTodos(): Todo[] {
  const [todos, setTodos] = useState<Todo[]>(() => readTodos());
  useEffect(() => {
    const sync = () => setTodos(readTodos());
    window.addEventListener("app:todos-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("app:todos-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return todos;
}

export type TopicProgress = { matched: number; done: number };

/** A todo matches a topic when its text contains the topic label (or vice versa)
 *  after normalization. Falls back to no-match (0/0) when nothing relates. */
export function topicProgress(label: string, todos: Todo[], context?: string): TopicProgress {
  const lab = normalize(label);
  if (!lab) return { matched: 0, done: 0 };
  const ctx = context ? normalize(context) : "";
  let matched = 0;
  let done = 0;
  for (const t of todos) {
    const txt = normalize(t.text || "");
    if (!txt) continue;
    const hit =
      txt.includes(lab) ||
      lab.includes(txt) ||
      (ctx && txt.includes(ctx) && (txt.includes(lab.split(" ")[0]) || lab.includes(txt.split(" ")[0])));
    if (hit) {
      matched++;
      if (t.done) done++;
    }
  }
  return { matched, done };
}