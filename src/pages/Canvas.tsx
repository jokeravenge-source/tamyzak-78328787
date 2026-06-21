import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";
import NotesCanvasBlock, { type CanvasData } from "@/components/NotesCanvasBlock";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "app_standalone_canvas_v1";

const Canvas = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const isRTL = language === "ar";
  const [data, setData] = useState<CanvasData>({ items: [], height: 720 });
  const [loaded, setLoaded] = useState(false);

  // Load once: prefer per-user key, fall back to anonymous
  useEffect(() => {
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const key = u.user ? `${STORAGE_KEY}:${u.user.id}` : STORAGE_KEY;
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.items)) setData(parsed);
        }
      } catch { /* ignore */ }
      setLoaded(true);
    })();
  }, []);

  // Autosave on change
  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const key = u.user ? `${STORAGE_KEY}:${u.user.id}` : STORAGE_KEY;
        localStorage.setItem(key, JSON.stringify(data));
      } catch { /* ignore */ }
    })();
  }, [data, loaded]);

  return (
    <div className="min-h-screen w-full bg-background text-foreground" dir={isRTL ? "rtl" : "ltr"}>
      <header className="sticky top-0 z-30 h-12 backdrop-blur-md bg-background/70 border-b border-border flex items-center px-3 gap-2">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label={isRTL ? "رجوع" : "Back"}
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
        </button>
        <h1 className="text-sm font-bold">{isRTL ? "اللوحة" : "Canvas"}</h1>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {isRTL ? "الحفظ تلقائي" : "Autosaved"}
        </span>
      </header>
      <main className="max-w-6xl mx-auto px-3 md:px-6 py-4">
        <NotesCanvasBlock data={data} onChange={setData} language={language} />
      </main>
    </div>
  );
};

export default Canvas;