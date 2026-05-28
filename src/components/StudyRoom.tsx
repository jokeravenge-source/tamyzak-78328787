import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CharacterAvatar, type CharacterTraits, type Gender } from "./CharacterAvatar";
import { Users } from "lucide-react";

type Occupant = {
  user_id: string;
  subject: string;
  mission: string;
  display_name: string;
  gender: Gender | null;
  character: Partial<CharacterTraits> | null;
};

const SUBJECT_LABEL: Record<string, { en: string; ar: string }> = {
  islamic: { en: "Islamic", ar: "التربية الإسلامية" },
  arabic: { en: "Arabic", ar: "العربية" },
  english: { en: "English", ar: "الإنجليزية" },
  french: { en: "French", ar: "الفرنسية" },
  math: { en: "Math", ar: "الرياضيات" },
  physics: { en: "Physics", ar: "الفيزياء" },
  chemistry: { en: "Chemistry", ar: "الكيمياء" },
  biology: { en: "Biology", ar: "الأحياء" },
};

export default function StudyRoom({ language }: { language: "en" | "ar" }) {
  const [people, setPeople] = useState<Occupant[]>([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      // Consider sessions active if last_seen_at within last 2 minutes
      const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { data: active } = await supabase
        .from("active_sessions")
        .select("user_id,subject,mission,last_seen_at")
        .gte("last_seen_at", since);
      if (!mounted) return;
      const rows = active ?? [];
      if (rows.length === 0) { setPeople([]); return; }
      const ids = rows.map((r: any) => r.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id,display_name,gender,character")
        .in("user_id", ids);
      const pmap = new Map<string, any>();
      (profs ?? []).forEach((p: any) => pmap.set(p.user_id, p));
      setPeople(
        rows.map((r: any) => {
          const p = pmap.get(r.user_id) ?? {};
          return {
            user_id: r.user_id,
            subject: r.subject,
            mission: r.mission,
            display_name: p.display_name ?? "Student",
            gender: (p.gender ?? "male") as Gender,
            character: p.character ?? null,
          };
        })
      );
    };

    load();
    const ch = supabase
      .channel("active_sessions_room")
      .on("postgres_changes", { event: "*", schema: "public", table: "active_sessions" }, () => load())
      .subscribe();
    const interval = window.setInterval(load, 30000);
    return () => { mounted = false; supabase.removeChannel(ch); window.clearInterval(interval); };
  }, []);

  const label = language === "ar" ? "غرفة الدراسة" : "Study Room";
  const empty = language === "ar" ? "لا يوجد أحد يدرس الآن. كن أوّل من يبدأ!" : "No one is studying right now. Be the first!";

  return (
    <section className="max-w-5xl mx-auto mb-10">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          {label}
          <span className="text-xs text-muted-foreground font-normal">
            ({people.length} {language === "ar" ? "الآن" : "live"})
          </span>
        </h2>
        <span className="flex items-center gap-1.5 text-xs text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          live
        </span>
      </div>

      {/* 2D Room */}
      <div
        className="relative rounded-3xl border border-primary/30 overflow-hidden shadow-2xl"
        style={{
          background:
            "linear-gradient(180deg, hsl(var(--secondary)) 0%, hsl(var(--secondary)) 55%, hsl(var(--muted)) 55%, hsl(var(--muted)) 100%)",
          minHeight: 280,
        }}
      >
        {/* Wall details */}
        <div className="absolute inset-x-0 top-0 h-[55%] pointer-events-none">
          {/* window */}
          <div className="absolute top-6 left-8 w-24 h-20 rounded-md border-4 border-primary/40 bg-primary/10 grid grid-cols-2 grid-rows-2">
            <div className="border border-primary/30" />
            <div className="border border-primary/30" />
            <div className="border border-primary/30" />
            <div className="border border-primary/30" />
          </div>
          {/* clock */}
          <div className="absolute top-8 right-10 w-12 h-12 rounded-full border-4 border-primary/40 bg-background/40 flex items-center justify-center text-xs">
            <span className="w-1 h-4 bg-primary/70 absolute" style={{ transformOrigin: "bottom", transform: "translateY(-25%) rotate(40deg)" }} />
            <span className="w-1 h-3 bg-primary/70 absolute" style={{ transformOrigin: "bottom", transform: "translateY(-20%) rotate(-30deg)" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          </div>
          {/* shelf */}
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-40 h-1.5 bg-primary/30 rounded" />
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1">
            {["#ef4444","#3b82f6","#10b981","#f59e0b","#a855f7"].map((c, i) => (
              <div key={i} className="w-3 h-6 rounded-sm" style={{ background: c, opacity: 0.85 }} />
            ))}
          </div>
        </div>

        {/* Floor line */}
        <div className="absolute left-0 right-0 top-[55%] h-px bg-primary/30" />

        {/* People */}
        {people.length === 0 ? (
          <div className="relative z-10 flex items-center justify-center" style={{ minHeight: 280 }}>
            <p className="text-sm text-muted-foreground bg-background/60 backdrop-blur px-4 py-2 rounded-full">{empty}</p>
          </div>
        ) : (
          <div className="relative z-10 pt-6 pb-6 px-4 flex flex-wrap gap-4 justify-center items-end" style={{ minHeight: 280 }}>
            {people.map((p) => {
              const subj = SUBJECT_LABEL[p.subject];
              const subjLabel = subj ? (language === "ar" ? subj.ar : subj.en) : p.subject;
              return (
                <div key={p.user_id} className="flex flex-col items-center group" style={{ width: 110 }}>
                  {/* Name tag */}
                  <div className="mb-1 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur border border-primary/30 text-xs font-medium max-w-[110px] truncate">
                    {p.display_name}
                  </div>
                  {/* Character on a desk */}
                  <div className="relative">
                    <CharacterAvatar gender={p.gender} traits={p.character ?? undefined} size={88} />
                    {/* desk */}
                    <div className="w-24 h-3 -mt-2 mx-auto rounded-sm bg-gradient-to-b from-primary/40 to-primary/20 border border-primary/40" />
                    {/* desk legs */}
                    <div className="flex justify-between w-20 mx-auto">
                      <div className="w-1 h-3 bg-primary/40" />
                      <div className="w-1 h-3 bg-primary/40" />
                    </div>
                  </div>
                  {/* Subject chip */}
                  <div className="mt-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 max-w-[110px] truncate">
                    {subjLabel}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}