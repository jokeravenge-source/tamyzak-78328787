import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useVisibilityGatedChannel } from "@/lib/realtimeVisibility";
import { CharacterAvatar, type CharacterTraits, type Gender } from "./CharacterAvatar";
import StudentProfileDialog from "./StudentProfileDialog";
import { Users } from "lucide-react";

type Occupant = {
  user_id: string;
  subject: string;
  mission: string;
  display_name: string;
  gender: Gender | null;
  character: Partial<CharacterTraits> | null;
  started_at: string;
  last_seen_at: string;
  elapsed_seconds: number;
  is_running: boolean;
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

const ROOM_CAPACITY = 20;
const PRESENCE_WINDOW_MS = 8 * 60 * 1000;

function formatHMS(totalSeconds: number) {
  const diff = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// Mirror Sessions exactly: while running, add wall-clock elapsed since last
// server heartbeat to elapsed_seconds. While paused, freeze on elapsed_seconds.
function computeElapsedSeconds(p: Occupant, nowMs: number) {
  if (!p.is_running) return p.elapsed_seconds;
  const sinceHeartbeat = Math.max(0, (nowMs - new Date(p.last_seen_at).getTime()) / 1000);
  return p.elapsed_seconds + sinceHeartbeat;
}

export default function StudyRoom({
  language,
  subject,
  currentUserId,
}: {
  language: "en" | "ar";
  subject: string;
  currentUserId?: string | null;
}) {
  const [people, setPeople] = useState<Occupant[]>([]);
  const [now, setNow] = useState(Date.now());
  const [openProfile, setOpenProfile] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      // Keep users visible through short network hiccups, background tab throttling,
      // and delayed reconnects instead of dropping them after one missed heartbeat.
      const since = new Date(Date.now() - PRESENCE_WINDOW_MS).toISOString();
      const { data: active, error: activeErr } = await supabase
        .from("active_sessions")
        .select("user_id,subject,mission,last_seen_at,started_at,elapsed_seconds,is_running")
        .eq("subject", subject)
        .gte("last_seen_at", since);
      if (!mounted) return;
      // On transient query errors, keep the previous list so characters don't flash out.
      if (activeErr) return;
      const rows = active ?? [];
      if (rows.length === 0) { setPeople([]); return; }
      const ids = rows.map((r: any) => r.user_id);
      const { data: profs, error: profErr } = await supabase
        .from("profiles")
        .select("user_id,display_name,gender,character")
        .in("user_id", ids);
      // If profile lookup fails, keep showing the previous render rather than wiping.
      if (profErr) return;
      const pmap = new Map<string, any>();
      (profs ?? []).forEach((p: any) => pmap.set(p.user_id, p));
      // Preserve previously-rendered character traits for users whose profile row
      // momentarily comes back empty (e.g., partial read), so avatars don't blank out.
      const prevById = new Map(people.map((p) => [p.user_id, p] as const));
      const mapped: Occupant[] = rows.map((r: any) => {
        const p = pmap.get(r.user_id) ?? {};
        const prev = prevById.get(r.user_id);
        return {
          user_id: r.user_id,
          subject: r.subject,
          mission: r.mission,
          display_name: p.display_name ?? prev?.display_name ?? "Student",
          gender: (p.gender ?? prev?.gender ?? "male") as Gender,
          character: p.character ?? prev?.character ?? null,
          started_at: r.started_at,
          last_seen_at: r.last_seen_at,
          elapsed_seconds: r.elapsed_seconds ?? 0,
          is_running: !!r.is_running,
        };
      });
      // Put current user first
      mapped.sort((a, b) => {
        if (currentUserId) {
          if (a.user_id === currentUserId) return -1;
          if (b.user_id === currentUserId) return 1;
        }
        return new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
      });
      setPeople(mapped.slice(0, ROOM_CAPACITY));
    };

    load();
    loadRef.current = load;
    return () => { mounted = false; };
    // `people` intentionally excluded — load() reads it via closure for fallback only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, currentUserId]);

  // Realtime updates only while the tab is visible; one fresh fetch on regain.
  useVisibilityGatedChannel(
    () =>
      supabase
        .channel(`active_sessions_room_${subject}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "active_sessions", filter: `subject=eq.${subject}` }, () => loadRef.current?.())
        .subscribe(),
    [subject],
    () => loadRef.current?.(),
  );

  const subj = SUBJECT_LABEL[subject];
  const subjLabel = subj ? (language === "ar" ? subj.ar : subj.en) : subject;
  const label = language === "ar" ? `غرفة ${subjLabel}` : `${subjLabel} Room`;
  const empty = language === "ar" ? "لا يوجد أحد يدرس هنا الآن. كن أوّل من يبدأ!" : "Empty room. Be the first to start!";
  const capacityLabel = language === "ar"
    ? `${people.length}/${ROOM_CAPACITY} داخل الغرفة`
    : `${people.length}/${ROOM_CAPACITY} inside`;

  return (
    <section className="mb-4">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          {label}
          <span className="text-xs text-muted-foreground font-normal">
            ({capacityLabel})
          </span>
        </h2>
      </div>

      {/* 2D Room */}
      <div
        className="relative rounded-2xl border border-primary/30 overflow-hidden shadow-xl"
        style={{
          background:
            "linear-gradient(180deg, hsl(var(--secondary)) 0%, hsl(var(--secondary)) 55%, hsl(var(--muted)) 55%, hsl(var(--muted)) 100%)",
          minHeight: 240,
        }}
      >
        {/* Wall details */}
        <div className="absolute inset-x-0 top-0 h-[55%] pointer-events-none">
          <div className="absolute top-4 left-6 w-16 h-14 rounded-md border-4 border-primary/40 bg-primary/10 grid grid-cols-2 grid-rows-2">
            <div className="border border-primary/30" />
            <div className="border border-primary/30" />
            <div className="border border-primary/30" />
            <div className="border border-primary/30" />
          </div>
          <div className="absolute top-6 right-8 w-10 h-10 rounded-full border-4 border-primary/40 bg-background/40 flex items-center justify-center text-xs">
            <span className="w-1 h-4 bg-primary/70 absolute" style={{ transformOrigin: "bottom", transform: "translateY(-25%) rotate(40deg)" }} />
            <span className="w-1 h-3 bg-primary/70 absolute" style={{ transformOrigin: "bottom", transform: "translateY(-20%) rotate(-30deg)" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          </div>
          <div className="absolute top-8 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-primary/30 rounded" />
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1">
            {["#ef4444","#3b82f6","#10b981","#f59e0b","#a855f7"].map((c, i) => (
              <div key={i} className="w-2.5 h-5 rounded-sm" style={{ background: c, opacity: 0.85 }} />
            ))}
          </div>
        </div>

        <div className="absolute left-0 right-0 top-[55%] h-px bg-primary/30" />

        {/* People */}
        {people.length === 0 ? (
          <div className="relative z-10 flex items-center justify-center" style={{ minHeight: 240 }}>
            <p className="text-sm text-muted-foreground bg-background/60 backdrop-blur px-4 py-2 rounded-full">{empty}</p>
          </div>
        ) : (
          <div className="relative z-10 pt-6 pb-6 px-4 flex flex-wrap gap-5 justify-center items-end" style={{ minHeight: 280 }}>
            {people.map((p) => {
              const isMe = currentUserId && p.user_id === currentUserId;
              return (
                <button
                  key={p.user_id}
                  type="button"
                  onClick={() => setOpenProfile(p.user_id)}
                  className="flex flex-col items-center transition-transform hover:scale-105"
                  style={{ width: 120 }}
                  aria-label={language === "ar" ? `ملف ${p.display_name}` : `${p.display_name} profile`}
                >
                  <div className={`mb-1 px-2 py-0.5 rounded-full backdrop-blur border text-xs font-medium max-w-[120px] truncate ${isMe ? "bg-primary text-primary-foreground border-primary" : "bg-background/80 border-primary/30"}`}>
                    {isMe ? (language === "ar" ? "أنت" : "You") : p.display_name}
                  </div>
                  <div className="relative">
                    <CharacterAvatar gender={p.gender} traits={p.character ?? undefined} size={96} />
                    <div className="w-24 h-3.5 -mt-3 mx-auto rounded-sm bg-gradient-to-b from-primary/40 to-primary/20 border border-primary/40" />
                    <div className="flex justify-between w-20 mx-auto">
                      <div className="w-0.5 h-3.5 bg-primary/40" />
                      <div className="w-0.5 h-3.5 bg-primary/40" />
                    </div>
                  </div>
                  <div className="mt-1.5 text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                    {formatHMS(computeElapsedSeconds(p, now))}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <StudentProfileDialog userId={openProfile} language={language} onClose={() => setOpenProfile(null)} />
    </section>
  );
}