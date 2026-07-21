import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Owner-only control that asks the AI to design 30 new daily games for
 *  the current Baghdad month and writes them to public.daily_games. */
export default function RegenerateDailyGamesButton() {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (busy) return;
    if (!confirm("Regenerate all 30 daily games for this month? This will overwrite existing entries.")) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-daily-games", { body: {} });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const count = (data as any)?.count ?? 0;
      toast.success(`Generated ${count} daily games for ${(data as any)?.month ?? "this month"}`);
    } catch (e: any) {
      toast.error(`Regenerate failed: ${e?.message ?? "unknown error"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={run}
      disabled={busy}
      className="inline-flex items-center gap-2 px-3 h-10 rounded-xl border border-white/10 bg-primary/10 hover:bg-primary/20 text-sm font-medium disabled:opacity-60"
      title="Ask the AI to design 30 daily games for this month"
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
      {busy ? "Generating…" : "Regenerate 30 games"}
    </button>
  );
}