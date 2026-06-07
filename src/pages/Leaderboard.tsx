import { useEffect, useState } from "react";
import { ArrowLeft, Trophy, Loader2, Medal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { AppLanguage } from "@/components/LanguageGate";
import CurvedNavBar from "@/components/CurvedNavBar";
import type { MainMenuChoice } from "@/pages/MainMenu";
import { rankFor, RANKS } from "@/lib/points";
import { CharacterAvatar, type Gender, type CharacterTraits } from "@/components/CharacterAvatar";

type Row = { user_id: string; name: string; points: number; gender: Gender | null; traits: Partial<CharacterTraits> | null };

const Leaderboard = ({
  language,
  onBack,
  onNav,
}: {
  language: AppLanguage;
  onBack: () => void;
  onNav: (c: MainMenuChoice) => void;
}) => {
  const isAr = language === "ar";
  const t = (en: string, ar: string) => (isAr ? ar : en);
  const [rows, setRows] = useState<Row[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setMe(u.user?.id ?? null);
      // Paginate user_points to bypass the default 1000-row cap so totals match AccountCenter.
      const pageSize = 1000;
      const totals = new Map<string, number>();
      let from = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data: page, error } = await supabase
          .from("user_points")
          .select("user_id, points")
          .range(from, from + pageSize - 1);
        if (error) break;
        (page ?? []).forEach((r: any) => {
          totals.set(r.user_id, (totals.get(r.user_id) ?? 0) + (r.points ?? 0));
        });
        if (!page || page.length < pageSize) break;
        from += pageSize;
      }
      const profilesRes = await supabase
        .from("profiles")
        .select("user_id, display_name, gender, character");
      const names = new Map<string, string>();
      const genders = new Map<string, Gender | null>();
      const characters = new Map<string, Partial<CharacterTraits> | null>();
      (profilesRes.data ?? []).forEach((p: any) => {
        names.set(p.user_id, p.display_name || "Student");
        genders.set(p.user_id, (p.gender as Gender) ?? null);
        characters.set(p.user_id, (p.character as Partial<CharacterTraits>) ?? null);
      });
      const list: Row[] = Array.from(totals.entries())
        .map(([user_id, points]) => ({ user_id, points, name: names.get(user_id) || "Student", gender: genders.get(user_id) ?? null, traits: characters.get(user_id) ?? null }))
        .sort((a, b) => b.points - a.points);
      setRows(list);
      setLoading(false);
    })();
  }, []);

  return (
    <main className="min-h-screen px-4 py-12 md:py-16 pb-32 relative overflow-hidden" dir={isAr ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <button onClick={onBack} className="absolute top-6 left-6 z-20 w-11 h-11 rounded-full border border-white/10 bg-secondary/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition">
        <ArrowLeft className="w-5 h-5" />
      </button>

      <header className="text-center max-w-2xl mx-auto z-10 relative">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/40 backdrop-blur mb-5">
          <Trophy className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("Leaderboard", "المتصدرون")}</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-3">{t("Top Students", "أبطال النقاط")}</h1>
        <p className="text-muted-foreground">{t("Earn points by sharing summaries, finishing flashcards, and scoring full marks.", "اربح النقاط بمشاركة الملخصات وإنهاء البطاقات والحصول على العلامة الكاملة.")}</p>
      </header>

      <section className="max-w-2xl mx-auto mt-10 relative z-10">
        <div className="mb-6 rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/20 via-secondary/80 to-accent/20 backdrop-blur p-5 shadow-[0_20px_60px_hsl(var(--primary)/0.35)] relative overflow-hidden" dir="rtl">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/30 blur-3xl" />
          <div className="flex items-center gap-4 relative">
            <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shrink-0">
              <Trophy className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-[0.25em] text-primary font-semibold mb-1">
                {t("Congratulations!", "تهانينا!")} 🎉
              </p>
              <p className="text-lg font-bold text-foreground">
                {t("Congrats to ", "تهانينا لـ ")}<span className="gradient-text">Harrer</span>
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t("for completing the challenge!", "على إكمال التحدي!")}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur p-3 md:p-4">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : rows.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">{t("No points yet. Be the first!", "لا توجد نقاط بعد. كن الأول!")}</p>
          ) : (
            <ol className="space-y-2">
              {rows.map((r, i) => {
                const rank = rankFor(r.points);
                const isMe = r.user_id === me;
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                return (
                  <li
                    key={r.user_id}
                    className={`flex items-center gap-4 rounded-2xl p-3 md:p-4 border transition ${
                      isMe ? "border-primary bg-primary/10" : "border-white/5 bg-background/30"
                    }`}
                  >
                    <div className="w-9 text-center text-lg font-bold text-muted-foreground">
                      {medal ?? `#${i + 1}`}
                    </div>
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-background/40 border border-white/10 shrink-0">
                      <CharacterAvatar seed={r.user_id} gender={r.gender ?? "male"} traits={r.traits} size={48} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{r.name}{isMe && <span className="text-primary text-xs ml-2">({t("you", "أنت")})</span>}</p>
                      <span
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-1"
                        style={{ backgroundColor: `${rank.color}22`, color: rank.color, border: `1px solid ${rank.color}66` }}
                      >
                        <Medal className="w-3 h-3" />
                        {isAr ? rank.label.ar : rank.label.en}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold gradient-text leading-none">{r.points}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{t("pts", "نقطة")}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-secondary/40 backdrop-blur p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">{t("Ranks", "المراتب")}</p>
          <div className="flex flex-wrap gap-2">
            {RANKS.map((r) => (
              <span
                key={r.key}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
                style={{ backgroundColor: `${r.color}22`, color: r.color, border: `1px solid ${r.color}66` }}
              >
                <Medal className="w-3 h-3" />
                {isAr ? r.label.ar : r.label.en} · {r.min}+
              </span>
            ))}
          </div>
        </div>
      </section>

      <CurvedNavBar language={language} active="leaderboard" onSelect={onNav} />
    </main>
  );
};

export default Leaderboard;