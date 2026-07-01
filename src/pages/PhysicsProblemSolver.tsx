import { useState, useRef } from "react";
import { ArrowLeft, Upload, Sparkles, Loader2, FileText, Calculator, Wand2, RotateCw, Image as ImageIcon, BookOpen, CheckCircle2, Trophy, Copy, Check, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { type AppLanguage } from "@/components/LanguageGate";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { extractStudyMaterial } from "@/lib/fileText";

const copy = {
  en: {
    title: "Physics Problem Solver",
    desc: "Upload or type a physics problem and get a step-by-step solution.",
    back: "Back",
    problem: "Your problem",
    placeholder: "Paste or type a physics problem here...",
    upload: "Upload a file or photo",
    drop: "PDF, image, or TXT — up to 100MB",
    selected: "Selected",
    solve: "Solve",
    solving: "Solving…",
    law: "Law used",
    steps: "Steps",
    answer: "Answer",
    new: "New problem",
    noText: "Could not read text from this file.",
    tooBig: "File too large. Max 100MB.",
    badType: "Unsupported file. Use PDF, image, or TXT.",
  },
  ar: {
    title: "حل مسائل الفيزياء",
    desc: "ارفع أو اكتب مسألة فيزياء واحصل على الحل خطوة بخطوة.",
    back: "رجوع",
    problem: "مسألتك",
    placeholder: "ألصق أو اكتب مسألة فيزياء هنا...",
    upload: "ارفع ملفاً أو صورة",
    drop: "PDF أو صورة أو TXT — حتى 100 ميجابايت",
    selected: "تم اختيار",
    solve: "احلل",
    solving: "جارٍ الحل…",
    law: "القانون المستخدم",
    steps: "الخطوات",
    answer: "الجواب",
    new: "مسألة جديدة",
    noText: "تعذرت قراءة النص من هذا الملف.",
    tooBig: "الملف كبير جداً. الحد الأقصى 100 ميجابايت.",
    badType: "نوع الملف غير مدعوم. استخدم PDF أو صورة أو TXT.",
  },
} as const;

type Solution = { law: string; steps: string[]; answer: string; unit?: string };

const PhysicsProblemSolver = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const t = copy[language];
  const rtl = language === "ar";
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [solution, setSolution] = useState<Solution | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 100 * 1024 * 1024) { toast.error(t.tooBig); return; }
    const ok = /\.(pdf|jpg|jpeg|png|webp|txt)$/i.test(f.name) || f.type.startsWith("image/") || f.type === "application/pdf" || f.type.startsWith("text/");
    if (!ok) { toast.error(t.badType); return; }
    setFile(f);
  };

  const handleSolve = async () => {
    if (!text.trim() && !file) return;
    setLoading(true);
    try {
      let imageUrl: string | undefined;
      let extractedText = text;
      if (file) {
        if (file.type.startsWith("image/")) {
          const { data: userData } = await supabase.auth.getUser();
          const uid = userData.user?.id;
          if (!uid) throw new Error("not authenticated");
          const { data: uploadData, error: uploadError } = await supabase.storage.from("summaries").upload(`${uid}/physics_solver/${Date.now()}_${file.name}`, file, { upsert: true });
          if (uploadError) throw uploadError;
          const { data: urlData } = await supabase.storage.from("summaries").createSignedUrl(uploadData?.path || "", 600);
          imageUrl = urlData?.signedUrl;
        } else {
          toast.loading(rtl ? "جارٍ قراءة الملف…" : "Reading file…", { id: "ext" });
          const material = await extractStudyMaterial(file);
          toast.dismiss("ext");
          if (material.text && material.text.trim().length > 20) {
            extractedText = material.text;
          } else if (material.pageImages?.length) {
            imageUrl = material.pageImages[0];
          } else {
            toast.error(t.noText);
            setLoading(false);
            return;
          }
        }
      }

      toast.loading(t.solving, { id: "sol" });
      const { data, error } = await supabase.functions.invoke("solve-physics-problem", {
        body: { text: extractedText, image_url: imageUrl, language },
      });
      toast.dismiss("sol");
      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);
      setSolution(data);
    } catch (e: any) {
      toast.dismiss();
      toast.error(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setText(""); setFile(null); setSolution(null);
  };

  const copyAnswer = async () => {
    if (!solution) return;
    const txt = `${solution.answer}${solution.unit ? " " + solution.unit : ""}`;
    try { await navigator.clipboard.writeText(txt); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

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

        {!solution ? (
          <div className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur p-8 space-y-8 animate-fade-up">
            <div>
              <label className="text-sm font-medium mb-2 block">{t.problem}</label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t.placeholder}
                className="min-h-[160px] rounded-2xl bg-background/40 border-white/10 text-base"
                dir={rtl ? "rtl" : "ltr"}
              />
            </div>

            <div
              onClick={() => inputRef.current?.click()}
              className="cursor-pointer border-2 border-dashed border-primary/30 hover:border-primary rounded-2xl p-8 text-center transition"
            >
              <input ref={inputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,application/pdf,image/*,text/plain"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-10 h-10 text-primary" />
                  <p className="font-medium">{file.name}</p>
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

            <Button onClick={handleSolve} disabled={loading || (!text.trim() && !file)} className="w-full h-12 text-base">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {t.solving}</> : <><Calculator className="w-4 h-4" /> {t.solve}</>}
            </Button>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-up">
            {/* Hero Answer */}
            <div className="relative overflow-hidden rounded-3xl p-8 md:p-10 text-center border border-emerald-400/30"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.15), hsl(var(--accent)/0.12) 60%, hsl(160 84% 39% / 0.18))" }}>
              <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full bg-emerald-400/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-primary/20 blur-3xl" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 mb-4">
                  <Trophy className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="text-[11px] uppercase tracking-[0.3em] text-emerald-200">{t.answer}</span>
                </div>
                <div className="flex items-end justify-center gap-2 flex-wrap">
                  <span className="text-5xl md:text-7xl font-black bg-gradient-to-br from-emerald-300 via-emerald-400 to-primary bg-clip-text text-transparent leading-none">
                    {solution.answer}
                  </span>
                  {solution.unit && (
                    <span className="text-2xl md:text-3xl font-semibold text-emerald-200/90 mb-1">{solution.unit}</span>
                  )}
                </div>
                <button
                  onClick={copyAnswer}
                  className="mt-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-background/40 hover:bg-background/60 border border-white/10 text-muted-foreground hover:text-foreground transition"
                >
                  {copied ? <><Check className="w-3.5 h-3.5" /> {rtl ? "تم النسخ" : "Copied"}</> : <><Copy className="w-3.5 h-3.5" /> {rtl ? "نسخ" : "Copy"}</>}
                </button>
              </div>
            </div>

            {/* Law Card */}
            <div className="group relative rounded-3xl p-6 md:p-7 border border-primary/25 bg-gradient-to-br from-primary/10 via-secondary/40 to-transparent backdrop-blur">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-primary/80 mb-1">{t.law}</p>
                  <p className="text-foreground/95 text-base md:text-lg font-medium leading-relaxed">{solution.law}</p>
                </div>
              </div>
            </div>

            {/* Steps Timeline */}
            <div className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur p-6 md:p-8">
              <div className="flex items-center gap-2 mb-6">
                <ListOrdered className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg">{t.steps}</h3>
                <span className="ms-auto text-xs text-muted-foreground">{solution.steps.length}</span>
              </div>
              <ol className="relative space-y-4">
                <div className={`absolute top-3 bottom-3 w-px bg-gradient-to-b from-primary/50 via-primary/20 to-transparent ${rtl ? "right-[18px]" : "left-[18px]"}`} />
                {solution.steps.map((step, i) => (
                  <li
                    key={i}
                    className="relative flex gap-4 rounded-2xl p-4 border border-white/5 bg-background/30 hover:bg-background/50 hover:border-primary/30 transition-all animate-fade-up"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center text-sm font-bold shadow-lg shadow-primary/30">
                        {i + 1}
                      </div>
                    </div>
                    <p className="text-foreground/90 leading-relaxed flex-1 pt-1">{step}</p>
                  </li>
                ))}
                <li className="relative flex gap-4 rounded-2xl p-4 border border-emerald-400/20 bg-emerald-500/5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <p className="text-emerald-200/90 leading-relaxed flex-1 pt-1 font-medium">
                    {rtl ? "الحل مكتمل" : "Solution complete"}
                  </p>
                </li>
              </ol>
            </div>

            <Button onClick={reset} className="w-full h-12 gap-2 rounded-2xl">
              <RotateCw className="w-4 h-4" /> {t.new}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
};

export default PhysicsProblemSolver;
