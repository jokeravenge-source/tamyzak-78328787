import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Upload, Loader2, FileText, Image as ImageIcon, Wand2, RotateCw, Eye, EyeOff, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { type AppLanguage } from "@/components/LanguageGate";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { extractStudyMaterial } from "@/lib/fileText";
import { handleAiError } from "@/lib/upgradeToast";
import { useSubscription } from "@/hooks/useSubscription";

const copy = {
  en: {
    title: "Problem Generator",
    desc: "Upload a file with problems and get fresh ones in the same style.",
    back: "Back",
    upload: "Upload a file or photo",
    drop: "PDF, DOCX, image, or TXT — up to 20MB",
    count: "How many problems?",
    generate: "Generate",
    generating: "Generating…",
    reading: "Reading file…",
    noText: "Could not read this file. Try another one.",
    tooBig: "File too large. Max 20MB.",
    badType: "Unsupported file. Use PDF, DOCX, image, or TXT.",
    show: "Show solution",
    hide: "Hide solution",
    solution: "Solution",
    problem: "Problem",
    prev: "Previous",
    next: "Next",
    regen: "Generate another set",
    empty: "No problems yet — upload a file to start.",
    premiumOnly: "This tool is available for Premium members only.",
  },
  ar: {
    title: "مولّد المسائل",
    desc: "ارفع ملفاً يحتوي مسائل واحصل على مسائل جديدة بنفس النمط.",
    back: "رجوع",
    upload: "ارفع ملفاً أو صورة",
    drop: "PDF أو DOCX أو صورة أو TXT — حتى 20 ميجابايت",
    count: "كم مسألة؟",
    generate: "توليد",
    generating: "جارٍ التوليد…",
    reading: "جارٍ قراءة الملف…",
    noText: "تعذّرت قراءة هذا الملف. جرّب ملفاً آخر.",
    tooBig: "الملف كبير جداً. الحد الأقصى 20 ميجابايت.",
    badType: "نوع الملف غير مدعوم. استخدم PDF أو DOCX أو صورة أو TXT.",
    show: "إظهار الحل",
    hide: "إخفاء الحل",
    solution: "الحل",
    problem: "المسألة",
    prev: "السابق",
    next: "التالي",
    regen: "توليد مجموعة أخرى",
    empty: "لا توجد مسائل بعد — ارفع ملفاً للبدء.",
    premiumOnly: "هذه الأداة متاحة للمشتركين في البريميوم فقط.",
  },
} as const;

type Problem = { statement: string; solution: string };

const COUNT_OPTIONS = [5, 10, 20] as const;
const STORAGE_KEY = "app_problem_gen_last_v1";

const ProblemGenerator = ({
  language,
  onBack,
  onNav,
}: {
  language: AppLanguage;
  onBack: () => void;
  onNav?: (choice: string) => void;
}) => {
  const t = copy[language];
  const rtl = language === "ar";
  const inputRef = useRef<HTMLInputElement>(null);
  const { isPremium, loading: subLoading } = useSubscription();

  const [file, setFile] = useState<File | null>(null);
  const [count, setCount] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [index, setIndex] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);

  // Restore last batch
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { problems: Problem[]; count?: number };
      if (Array.isArray(parsed.problems) && parsed.problems.length) {
        setProblems(parsed.problems);
        if (parsed.count && COUNT_OPTIONS.includes(parsed.count as any)) setCount(parsed.count);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setShowSolution(false);
  }, [index]);

  const onFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { toast.error(t.tooBig); return; }
    const ok = /\.(pdf|docx|jpg|jpeg|png|webp|txt)$/i.test(f.name)
      || f.type.startsWith("image/")
      || f.type === "application/pdf"
      || f.type.startsWith("text/")
      || f.name.toLowerCase().endsWith(".docx");
    if (!ok) { toast.error(t.badType); return; }
    setFile(f);
  };

  const gatePremium = (): boolean => {
    if (subLoading) return true;
    if (!isPremium) {
      toast.error(t.premiumOnly, {
        action: onNav ? { label: rtl ? "ترقية" : "Upgrade", onClick: () => onNav("premium") } : undefined,
      });
      return false;
    }
    return true;
  };

  const handleGenerate = async () => {
    if (!file) { toast.error(t.badType); return; }
    if (!gatePremium()) return;
    setLoading(true);
    try {
      let sourceText = "";
      let imageUrl: string | undefined;

      if (file.type.startsWith("image/")) {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (!uid) throw new Error("not authenticated");
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("summaries")
          .upload(`${uid}/problem_gen/${Date.now()}_${file.name}`, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = await supabase.storage.from("summaries").createSignedUrl(uploadData?.path || "", 600);
        imageUrl = urlData?.signedUrl;
      } else {
        toast.loading(t.reading, { id: "ext" });
        const material = await extractStudyMaterial(file);
        toast.dismiss("ext");
        if (material.text && material.text.trim().length > 20) {
          sourceText = material.text;
        } else if (material.pageImages?.length) {
          imageUrl = material.pageImages[0];
        } else {
          toast.error(t.noText);
          setLoading(false);
          return;
        }
      }

      toast.loading(t.generating, { id: "gen" });
      const { data, error } = await supabase.functions.invoke("generate-similar-problems", {
        body: { text: sourceText, image_url: imageUrl, count, language },
      });
      toast.dismiss("gen");
      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);

      const list = Array.isArray(data?.problems) ? (data.problems as Problem[]) : [];
      if (!list.length) throw new Error(rtl ? "لم يتم توليد أي مسائل." : "No problems generated.");
      setProblems(list);
      setIndex(0);
      setShowSolution(false);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ problems: list, count }));
      } catch { /* ignore */ }
    } catch (e: any) {
      toast.dismiss();
      handleAiError(e, { language, onUpgrade: onNav ? () => onNav("premium") : undefined });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setProblems([]);
    setFile(null);
    setIndex(0);
    setShowSolution(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  const goto = (dir: 1 | -1) => {
    setDirection(dir);
    setIndex((i) => (i + dir + problems.length) % problems.length);
  };

  const current = problems[index];

  return (
    <main className="min-h-screen px-4 py-12 md:py-16 relative overflow-hidden" dir={rtl ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <button onClick={onBack} className="absolute top-6 left-6 z-20 w-11 h-11 rounded-full border border-white/10 bg-secondary/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition">
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="max-w-3xl mx-auto relative z-10">
        <header className="text-center mb-10 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/40 backdrop-blur mb-5">
            <Wand2 className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">AI</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-3">{t.title}</h1>
          <p className="text-muted-foreground md:text-lg">{t.desc}</p>
        </header>

        {problems.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur p-8 space-y-8 animate-fade-up">
            <div
              onClick={() => inputRef.current?.click()}
              className="cursor-pointer border-2 border-dashed border-primary/30 hover:border-primary rounded-2xl p-8 text-center transition"
            >
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.jpg,.jpeg,.png,.webp,.txt,application/pdf,image/*,text/plain"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-10 h-10 text-primary" />
                  <p className="font-medium break-all">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <ImageIcon className="w-10 h-10 text-primary" />
                  <p className="font-medium">{t.upload}</p>
                  <p className="text-xs text-muted-foreground">{t.drop}</p>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-3 block">{t.count}</label>
              <div className="flex flex-wrap gap-2">
                {COUNT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCount(n)}
                    className={`px-5 h-11 rounded-full text-sm font-semibold border transition ${
                      count === n
                        ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "border-white/10 bg-background/30 text-muted-foreground hover:text-foreground hover:border-primary/40"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={loading || !file} className="w-full h-12 text-base gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {t.generating}</> : <><Sparkles className="w-4 h-4" /> {t.generate}</>}
            </Button>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-up">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-mono">{index + 1} / {problems.length}</span>
              <button
                onClick={reset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-background/40 hover:bg-background/60 hover:text-foreground transition"
              >
                <RotateCw className="w-3.5 h-3.5" /> {t.regen}
              </button>
            </div>

            <div className="relative min-h-[280px]">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={index}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -direction * 40 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur p-6 md:p-8"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary">
                      {index + 1}
                    </div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-primary/80">{t.problem}</p>
                  </div>
                  <p className="text-foreground/95 text-base md:text-lg leading-relaxed whitespace-pre-wrap">
                    {current?.statement}
                  </p>

                  <div className="mt-6">
                    <button
                      onClick={() => setShowSolution((s) => !s)}
                      className="inline-flex items-center gap-2 px-4 h-10 rounded-full text-sm font-semibold border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition"
                    >
                      {showSolution ? <><EyeOff className="w-4 h-4" /> {t.hide}</> : <><Eye className="w-4 h-4" /> {t.show}</>}
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {showSolution && current?.solution && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-5 pt-5 border-t border-white/10">
                          <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-300/80 mb-3">{t.solution}</p>
                          <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{current.solution}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button
                variant="secondary"
                onClick={() => goto(rtl ? 1 : -1)}
                disabled={problems.length < 2}
                className="h-11 gap-2 rounded-full flex-1"
              >
                {rtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                {t.prev}
              </Button>
              <Button
                onClick={() => goto(rtl ? -1 : 1)}
                disabled={problems.length < 2}
                className="h-11 gap-2 rounded-full flex-1"
              >
                {t.next}
                {rtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default ProblemGenerator;
