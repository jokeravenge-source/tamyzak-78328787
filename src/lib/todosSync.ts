import { supabase } from "@/integrations/supabase/client";

export type SyncedTodo = { id: string; text: string; done: boolean; day?: string };

export function getISOWeek(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${weekNo}`;
}

export async function pushTodos(items: SyncedTodo[]) {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("student_todos").upsert(
      { user_id: u.user.id, items: items as unknown as never, week_key: getISOWeek(), updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    // Notify any parent dashboard listening on this user's channel.
    try {
      const ch = supabase.channel(`todos:${u.user.id}`);
      await ch.subscribe();
      await ch.send({ type: "broadcast", event: "todos-changed", payload: { at: Date.now() } });
      await supabase.removeChannel(ch);
    } catch { /* noop */ }
  } catch { /* noop */ }
}

export async function pullTodos(): Promise<SyncedTodo[] | null> {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const { data, error } = await supabase
      .from("student_todos")
      .select("items")
      .eq("user_id", u.user.id)
      .maybeSingle();
    if (error || !data) return null;
    const items = (data as { items: unknown }).items;
    return Array.isArray(items) ? (items as SyncedTodo[]) : null;
  } catch {
    return null;
  }
}
