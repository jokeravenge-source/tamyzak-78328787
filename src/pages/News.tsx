import { useEffect, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, Newspaper } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AppLanguage } from "@/components/LanguageGate";
import { supabase } from "@/integrations/supabase/client";

type NewsItem = { id: string; title: string; description: string; image_path: string | null; link: string | null; created_at: string };

const copy = {
  en: { title: "News", empty: "No news yet. Check back soon!", prev: "Previous", next: "Next", openLink: "Open link" },
  ar: { title: "الأخبار", empty: "لا توجد أخبار بعد. عد قريباً!", prev: "السابق", next: "التالي", openLink: "فتح الرابط" },
} as const;

const News = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const t = copy[language];
  const [items, setItems] = useState<NewsItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("news").select("*").order("created_at", { ascending: false });
      setItems((data ?? []) as NewsItem[]);
      setLoading(false);
    })();
    const ch = supabase.channel("news_feed").on("postgres_changes", { event: "*", schema: "public", table: "news" }, async () => {
      const { data } = await supabase.from("news").select("*").order("created_at", { ascending: false });
      setItems((data ?? []) as NewsItem[]);
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const cur = items[idx];
  const imgUrl = (path: string | null) => path ? supabase.storage.from("news").getPublicUrl(path).data.publicUrl : null;

  return (
    <main className="px-4 py-12 relative overflow-hidden" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <button onClick={onBack} aria-label="Back" className="absolute top-6 left-6 z-20 w-11 h-11 rounded-full border border-white/10 bg-secondary/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all">
        <ArrowLeft className="w-5 h-5" />
      </button>

      <header className="text-center max-w-2xl mx-auto z-10 relative mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/40 backdrop-blur mb-4">
          <Newspaper className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t.title}</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold gradient-text">{t.title}</h1>
      </header>

      <section className="max-w-2xl mx-auto relative z-10">
        {loading ? (
          <div className="h-80 rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur animate-pulse" />
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">{t.empty}</p>
        ) : (
          <div
            className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth -mx-4 px-4"
            style={{ scrollbarWidth: "thin" }}
          >
            {items.map((cur) => (
              <motion.article
                key={cur.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="snap-center shrink-0 w-full max-w-2xl rounded-3xl overflow-hidden border border-primary/30 bg-secondary/40 backdrop-blur shadow-[var(--shadow-glow)] flex flex-col"
              >
                {cur.image_path && (
                  <img src={imgUrl(cur.image_path)!} alt={cur.title} className="w-full max-h-96 object-cover" />
                )}
                <div className="p-6">
                  <p className="text-xs text-muted-foreground mb-2">{new Date(cur.created_at).toLocaleDateString()}</p>
                  <h2 className="text-2xl font-bold mb-3 text-foreground">{cur.title}</h2>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{cur.description}</p>
                  {cur.link && (
                    <a
                      href={cur.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 px-4 h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
                    >
                      <ExternalLink className="w-4 h-4" /> {t.openLink}
                    </a>
                  )}
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default News;