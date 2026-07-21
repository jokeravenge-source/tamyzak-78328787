import { useState } from "react";
import { Loader2, ListOrdered, X, Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  day: number;
  month_key: string;
  subject: string;
  engine: string;
  spec: any;
};

function baghdadMonthKey(now = new Date()): string {
  const shifted = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Owner-only: reveals the full list of AI-generated daily games for the
 *  current Baghdad month so admins can preview what each day will play. */
export default function DailyGamesListButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("daily_games")
        .select("day, month_key, subject, engine, spec")
        .eq("month_key", baghdadMonthKey())
        .order("day", { ascending: true });
      if (error) throw error;
      setRows((data ?? []) as Row[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load daily games");
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setOpen(true);
    load();
  };

  const playDay = (day: number) => {
    try {
      sessionStorage.setItem("daily_game_preview_day", String(day));
      // MENU_STORAGE_KEY is defined in App.tsx as "app_menu_choice_v1"
      localStorage.setItem("app_menu_choice_v1", "dailyGame");
    } catch {}
    // Reload the app so the router picks up the menu choice and the
    // DailyGame page mounts with the preview day.
    window.location.href = "/";
  };

  return (
    <>
      <button
        onClick={openModal}
        className="inline-flex items-center gap-2 px-3 h-10 rounded-xl border border-white/10 bg-secondary/60 hover:bg-secondary text-sm font-medium"
        title="Reveal all daily games for this month"
      >
        <ListOrdered className="w-4 h-4" />
        Reveal daily games
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div
            className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold gradient-text">
                Daily Games — {baghdadMonthKey()}
              </h2>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : rows.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                No games generated for this month yet. Click "Regenerate 30 games" first.
              </p>
            ) : (
              <ul className="grid gap-2">
                {rows.map((r) => (
                  <li
                    key={r.day}
                    className="p-3 rounded-xl border border-white/10 bg-secondary/40 flex items-start gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center text-lg shrink-0">
                      {r.spec?.theme?.motif ?? "🎮"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                          Day {r.day}
                        </span>
                        <span className="text-sm font-semibold truncate">
                          {r.spec?.title?.en ?? "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          / {r.spec?.title?.ar ?? "—"}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                        <span>📚 {r.subject}</span>
                        <span>🎯 {r.engine}</span>
                        <span>#️⃣ {r.spec?.count ?? "?"} qs</span>
                        {r.spec?.timerSec != null && <span>⏱ {r.spec.timerSec}s</span>}
                        <span>✅ pass ≥ {Math.round((r.spec?.passThreshold ?? 0) * 100)}%</span>
                      </div>
                      {r.spec?.tutorial?.en && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {r.spec.tutorial.en}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => playDay(r.day)}
                      className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary text-xs font-semibold"
                      title={`Play day ${r.day}`}
                    >
                      <Play className="w-3.5 h-3.5" />
                      Play
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}