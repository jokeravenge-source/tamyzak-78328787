import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Pencil, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "site_visit_session_v1";

function AnimatedDigit({ digit }: { digit: string }) {
  return (
    <span className="relative inline-block w-[0.6em] h-[1em] overflow-hidden align-middle">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={digit}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="absolute inset-0 flex items-center justify-center tabular-nums"
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default function VisitCounter({
  isAdmin = false,
  inline = false,
}: {
  isAdmin?: boolean;
  inline?: boolean;
}) {
  const [count, setCount] = useState<number>(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [pulse, setPulse] = useState(false);
  const incremented = useRef(false);

  // Load + increment once per browser session (shared across all users via backend)
  useEffect(() => {
    if (incremented.current) return;
    incremented.current = true;
    (async () => {
      const alreadyCounted =
        typeof window !== "undefined" && !!sessionStorage.getItem(SESSION_KEY);
      if (!alreadyCounted) {
        try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
        const { data, error } = await supabase.rpc("increment_site_visits");
        if (!error && data != null) {
          setCount(Number(data));
          setPulse(true);
          setTimeout(() => setPulse(false), 900);
          return;
        }
      }
      const { data } = await supabase
        .from("site_stats")
        .select("count")
        .eq("id", "global")
        .maybeSingle();
      if (data?.count != null) setCount(Number(data.count));
    })();
  }, []);

  // Poll every 20s so the number stays roughly live for everyone
  useEffect(() => {
    const t = setInterval(async () => {
      const { data } = await supabase
        .from("site_stats")
        .select("count")
        .eq("id", "global")
        .maybeSingle();
      if (data?.count != null) {
        setCount((prev) => {
          const next = Number(data.count);
          if (next !== prev) {
            setPulse(true);
            setTimeout(() => setPulse(false), 700);
          }
          return next;
        });
      }
    }, 20000);
    return () => clearInterval(t);
  }, []);

  const saveEdit = async () => {
    const n = Math.max(0, Math.floor(Number(draft)));
    if (Number.isFinite(n)) {
      const { data, error } = await supabase.rpc("set_site_visits", { _count: n });
      if (!error && data != null) {
        setCount(Number(data));
        setPulse(true);
        setTimeout(() => setPulse(false), 900);
      }
    }
    setEditing(false);
  };

  const digits = count.toLocaleString("en-US").split("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, type: "spring", stiffness: 220, damping: 22 }}
      className={inline ? "inline-flex" : "fixed bottom-4 left-4 z-40"}
    >
      <motion.div
        animate={pulse ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="group relative flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-2 shadow-lg backdrop-blur-md"
      >
        <span className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <motion.span
          animate={{ scale: pulse ? [1, 1.4, 1] : 1, rotate: pulse ? [0, -10, 10, 0] : 0 }}
          transition={{ duration: 0.7 }}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary"
        >
          <Eye className="h-3.5 w-3.5" />
        </motion.span>

        {editing ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              type="number"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") setEditing(false);
              }}
              className="w-24 rounded-md border border-border bg-background px-2 py-0.5 text-xs outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              onClick={saveEdit}
              className="rounded-full p-1 text-emerald-500 hover:bg-emerald-500/10"
              aria-label="Save"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-full p-1 text-rose-500 hover:bg-rose-500/10"
              aria-label="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Visits</span>
              <span className="text-sm font-bold text-foreground leading-none flex items-center">
                {digits.map((d, i) =>
                  /\d/.test(d) ? (
                    <AnimatedDigit key={`${i}-${digits.length}`} digit={d} />
                  ) : (
                    <span key={`s-${i}`} className="px-[1px]">{d}</span>
                  )
                )}
              </span>
            </div>
            {isAdmin && (
              <button
                onClick={() => {
                  setDraft(String(count));
                  setEditing(true);
                }}
                className="ml-1 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Edit visit count"
                title="Edit visit count"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  );
}