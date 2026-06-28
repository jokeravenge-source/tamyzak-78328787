import { useRef, useState } from "react";
import { ArrowLeft, Upload, Sparkles, Loader2, FileText, RotateCw, ClipboardCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type AppLanguage } from "@/components/LanguageGate";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { extractStudyMaterial } from "@/lib/fileText";

const copy = {
  en: {
    title: "Al-Musahhih",
    desc: "Upload your written answer sheet and the official answer key. The AI compares them and scores you.",
    userBox: "Your written answers",
    keyBox: "Correct answers (PDF)",
    userHint: "PDF, DOCX, TXT or photo (JPG/PNG)",
    keyHint: "PDF only",
    pick: "Choose a file",
    correct: "Grade my paper",
    grading: "Grading…",
    reading: "Reading files…",
    total: "Total result",
    restart: "New paper",
    perQ: "Per-question breakdown",
    feedback: "Feedback",
    score: "Score",
    tooBig: "File too large. Max 25MB.",
    badUser: "Use PDF, DOCX, TXT, or an image.",
    badKey: "The answer key must be a PDF.",
    needBoth: "Upload both files first.",
    noText: "Could not read content from the files.",
    overall: "Overall feedback",
  },
  ar: {
    title: "المُصحِّح",
    desc: "ارفع ورقة إجاباتك المكتوبة وارفع نموذج الإجابة الصحيحة، وسيقوم الذكاء الاصطناعي بالمقارنة والتصحيح.",
    userBox: "ورقة إجاباتك",
    keyBox: "نموذج الإجابة (PDF)",
    userHint: "PDF أو DOCX أو TXT أو صورة (JPG/PNG)",
    keyHint: "PDF فقط",
    pick: "اختر ملفاً",
    correct: "صحّح ورقتي",
    grading: "جارٍ التصحيح…",
    reading: "جارٍ قراءة الملفات…",
    total: "النتيجة الإجمالية",
    restart: "ورقة جديدة",
    perQ: "تفصيل السؤال بسؤال",
    feedback: "ملاحظات",
    score: "الدرجة",
    tooBig: "الملف كبير جداً. الحد الأقصى 25 ميجابايت.",
    badUser: "استخدم PDF أو DOCX أو TXT أو صورة.",
    badKey: "نموذج الإجابة يجب أن يكون PDF.",
    needBoth: "ارفع كلا الملفين أولاً.",
    noText: "تعذرت قراءة محتوى الملفات.",
    overall: "تعليق عام",
  },
} as const;

type ItemGrade = { question: string; student_answer: string; correct_answer: string; score: number; max: number; feedback: string };
type GradeResult = { items: ItemGrade[]; total: number; max: number; overall: string };

const MAX_BYTES = 25 * 1024 * 1024;

const isImage = (f: File) => /\.(png|jpe?g|webp)$/i.test(f.name) || f.type.startsWith("image/");
const isPdf = (f: File) => /\.pdf$/i.test(f.name) || f.type === "application/pdf";

const readImageAsDataUrl = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result || ""));
    r.onerror = () => rej(new Error("read failed"));
    r.readAsDataURL(f);
  });

const Essay = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const t = copy[language];
  const rtl = language === "ar";
  const [userFile, setUserFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  const userRef = useRef<HTMLInputElement>(null);
  const keyRef = useRef<HTMLInputElement>(null);

  const pickUser = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_BYTES) { toast.error(t.tooBig); return; }
    if (!(isImage(f) || isPdf(f) || /\.(docx|txt)$/i.test(f.name) || f.type.startsWith("text/"))) { toast.error(t.badUser); return; }
    setUserFile(f);
  };
  const pickKey = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_BYTES) { toast.error(t.tooBig); return; }
    if (!isPdf(f)) { toast.error(t.badKey); return; }
    setKeyFile(f);
  };

  const collect = async (f: File): Promise<{ text: string; images: string[] }> => {
    if (isImage(f)) {
      const url = await readImageAsDataUrl(f);
      return { text: "", images: [url] };
    }
    const m = await extractStudyMaterial(f);
    return { text: m.text || "", images: m.pageImages || [] };
  };

  const handleGrade = async () => {
    if (!userFile || !keyFile) { toast.error(t.needBoth); return; }
    setLoading(true);
    try {
      toast.loading(t.reading, { id: "rd" });
      const [u, k] = await Promise.all([collect(userFile), collect(keyFile)]);
      toast.dismiss("rd");
      if (!u.text && !u.images.length) { toast.error(t.noText); setLoading(false); return; }
      if (!k.text && !k.images.length) { toast.error(t.noText); setLoading(false); return; }
      toast.loading(t.grading, { id: "gr" });
      const { data, error } = await supabase.functions.invoke("essay-coach", {
        body: {
          mode: "correct",
          language,
          studentText: u.text, studentImages: u.images,
          keyText: k.text, keyImages: k.images,
        },
      });
      toast.dismiss("gr");
      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);
      setResult(data as GradeResult);
    } catch (e: any) {
      toast.dismiss();
      toast.error(e.message || "Failed to grade");
    } finally {
      setLoading(false);
    }
  };

  const restart = () => { setResult(null); setUserFile(null); setKeyFile(null); };

  const DropBox = ({ file, onPick, hint, inputRef, accept, onClear }: {
    file: File | null; onPick: () => void; hint: string; inputRef: React.RefObject<HTMLInputElement>; accept: string; onClear: () => void;
  }) => (
    <div
      onClick={onPick}
      className="cursor-pointer border-2 border-dashed border-primary/30 hover:border-primary rounded-2xl p-6 text-center transition relative"
    >
      <input ref={inputRef} type="file" className="hidden" accept={accept}
        onChange={(e) => { if (inputRef === userRef) pickUser(e.target.files?.[0] ?? null); else pickKey(e.target.files?.[0] ?? null); e.currentTarget.value = ""; }} />
      {file ? (
        <div className="flex flex-col items-center gap-2">
          <FileText className="w-9 h-9 text-primary" />
          <p className="font-medium text-sm truncate max-w-full">{file.name}</p>
          <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-secondary/70 hover:bg-secondary flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Upload className="w-9 h-9 text-primary" />
          <p className="font-medium">{t.pick}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      )}
    </div>
  );

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
            <ClipboardCheck className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">AI</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-3">{t.title}</h1>
          <p className="text-muted-foreground md:text-lg">{t.desc}</p>
        </header>

        {!result && (
          <div className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur p-6 md:p-8 space-y-6 animate-fade-up">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold block mb-2">{t.userBox}</label>
                <DropBox file={userFile} onPick={() => userRef.current?.click()} hint={t.userHint} inputRef={userRef}
                  accept=".pdf,.docx,.txt,image/*,application/pdf,text/plain"
                  onClear={() => setUserFile(null)} />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-2">{t.keyBox}</label>
                <DropBox file={keyFile} onPick={() => keyRef.current?.click()} hint={t.keyHint} inputRef={keyRef}
                  accept=".pdf,application/pdf"
                  onClear={() => setKeyFile(null)} />
              </div>
            </div>
            <Button onClick={handleGrade} disabled={!userFile || !keyFile || loading} className="w-full h-12 text-base">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {t.grading}</> : <><Sparkles className="w-4 h-4" /> {t.correct}</>}
            </Button>
          </div>
        )}

        {result && (
          <div className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur p-8 md:p-10 animate-fade-up">
            <div className="text-center mb-8">
              <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground mb-3">{t.total}</p>
              <p className="text-6xl md:text-7xl font-bold gradient-text mb-2">{result.total} / {result.max}</p>
              <p className="text-2xl text-muted-foreground">{result.max > 0 ? Math.round((result.total / result.max) * 100) : 0}%</p>
            </div>
            {result.overall && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mb-6">
                <p className="text-sm font-semibold text-primary mb-1">{t.overall}</p>
                <p className="text-sm whitespace-pre-wrap">{result.overall}</p>
              </div>
            )}
            <p className="text-sm font-semibold mb-3">{t.perQ}</p>
            <div className="space-y-3 mb-8 max-h-[28rem] overflow-y-auto">
              {result.items.map((it, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-background/30 p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">{i + 1}. {it.question}</span>
                    <span className="text-primary font-bold whitespace-nowrap">{it.score} / {it.max}</span>
                  </div>
                  {it.student_answer && <p className="text-xs text-muted-foreground mb-1"><b>{rtl ? "إجابتك:" : "Your answer:"}</b> {it.student_answer}</p>}
                  {it.correct_answer && <p className="text-xs text-muted-foreground mb-1"><b>{rtl ? "الإجابة الصحيحة:" : "Correct:"}</b> {it.correct_answer}</p>}
                  {it.feedback && <p className="text-xs mt-2"><b>{t.feedback}:</b> {it.feedback}</p>}
                </div>
              ))}
            </div>
            <Button onClick={restart} className="h-12 px-8 mx-auto flex"><RotateCw className="w-4 h-4" /> {t.restart}</Button>
          </div>
        )}
      </div>
    </main>
  );
};

export default Essay;