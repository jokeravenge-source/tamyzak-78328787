import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Play, Pause, SkipBack, Volume2, X, Pencil, Headphones, Loader2, Check, AlertTriangle, Lightbulb, Eye } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import audioAsset from "@/assets/surah-al-imran-90-94.mp3.asset.json";
import audioBaqarah from "@/assets/surah-al-baqarah-153-157.mp3.asset.json";
import audioAnbiya from "@/assets/surah-al-anbiya-1-7.mp3.asset.json";
import audioNisa from "@/assets/surah-an-nisa-unit3.mp3.asset.json";
import audioIsra from "@/assets/surah-al-isra-30-39.mp3.asset.json";

type Line = { t: number; ar: string };

// Replace these timestamps and text to re-sync with a different recitation.
const IMRAN_LINES: Line[] = [
  { t: 0,    ar: "إِنَّ الَّذِينَ كَفَرُوا بَعْدَ إِيمَانِهِمْ ثُمَّ ازْدَادُوا كُفْرًا" },
  { t: 8,    ar: "لَّن تُقْبَلَ تَوْبَتُهُمْ وَأُولَٰئِكَ هُمُ الضَّالُّونَ" },
  { t: 16,   ar: "إِنَّ الَّذِينَ كَفَرُوا وَمَاتُوا وَهُمْ كُفَّارٌ" },
  { t: 24,   ar: "فَلَن يُقْبَلَ مِنْ أَحَدِهِم مِّلْءُ الْأَرْضِ ذَهَبًا وَلَوِ افْتَدَىٰ بِهِ" },
  { t: 34,   ar: "أُولَٰئِكَ لَهُمْ عَذَابٌ أَلِيمٌ وَمَا لَهُم مِّن نَّاصِرِينَ" },
  { t: 45,   ar: "لَن تَنَالُوا الْبِرَّ حَتَّىٰ تُنفِقُوا مِمَّا تُحِبُّونَ" },
  { t: 54,   ar: "وَمَا تُنفِقُوا مِن شَيْءٍ فَإِنَّ اللَّهَ بِهِ عَلِيمٌ" },
  { t: 64,   ar: "كُلُّ الطَّعَامِ كَانَ حِلًّا لِّبَنِي إِسْرَائِيلَ" },
  { t: 72,   ar: "إِلَّا مَا حَرَّمَ إِسْرَائِيلُ عَلَىٰ نَفْسِهِ مِن قَبْلِ أَن تُنَزَّلَ التَّوْرَاةُ" },
  { t: 83,   ar: "قُلْ فَأْتُوا بِالتَّوْرَاةِ فَاتْلُوهَا إِن كُنتُمْ صَادِقِينَ" },
  { t: 94,   ar: "فَمَنِ افْتَرَىٰ عَلَى اللَّهِ الْكَذِبَ مِن بَعْدِ ذَٰلِكَ" },
  { t: 102,  ar: "فَأُولَٰئِكَ هُمُ الظَّالِمُونَ" },
  { t: 107,  ar: "قُلْ صَدَقَ اللَّهُ ۗ فَاتَّبِعُوا مِلَّةَ إِبْرَاهِيمَ حَنِيفًا" },
  { t: 114,  ar: "وَمَا كَانَ مِنَ الْمُشْرِكِينَ" },
];

const BAQARAH_LINES: Line[] = [
  { t: 0,    ar: "يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ" },
  { t: 22,   ar: "وَلَا تَقُولُوا لِمَن يُقْتَلُ فِي سَبِيلِ اللَّهِ أَمْوَاتٌ ۚ بَلْ أَحْيَاءٌ وَلَٰكِن لَّا تَشْعُرُونَ" },
  { t: 40,   ar: "وَلَنَبْلُوَنَّكُم بِشَيْءٍ مِّنَ الْخَوْفِ وَالْجُوعِ وَنَقْصٍ مِّنَ الْأَمْوَالِ وَالْأَنفُسِ وَالثَّمَرَاتِ ۗ وَبَشِّرِ الصَّابِرِينَ" },
  { t: 62,   ar: "الَّذِينَ إِذَا أَصَابَتْهُم مُّصِيبَةٌ قَالُوا إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ" },
  { t: 72,   ar: "أُولَٰئِكَ عَلَيْهِمْ صَلَوَاتٌ مِّن رَّبِّهِمْ وَرَحْمَةٌ ۚ وَأُولَٰئِكَ هُمُ الْمُهْتَدُونَ" },
];

const ANBIYA_LINES: Line[] = [
  { t: 0,    ar: "اقْتَرَبَ لِلنَّاسِ حِسَابُهُمْ وَهُمْ فِي غَفْلَةٍ مُّعْرِضُونَ" },
  { t: 12,   ar: "مَا يَأْتِيهِم مِّن ذِكْرٍ مِّن رَّبِّهِم مُّحْدَثٍ إِلَّا اسْتَمَعُوهُ وَهُمْ يَلْعَبُونَ" },
  { t: 26,   ar: "لَاهِيَةً قُلُوبُهُمْ ۗ وَأَسَرُّوا النَّجْوَى الَّذِينَ ظَلَمُوا هَلْ هَٰذَا إِلَّا بَشَرٌ مِّثْلُكُمْ ۖ أَفَتَأْتُونَ السِّحْرَ وَأَنتُمْ تُبْصِرُونَ" },
  { t: 52,   ar: "قَالَ رَبِّي يَعْلَمُ الْقَوْلَ فِي السَّمَاءِ وَالْأَرْضِ ۖ وَهُوَ السَّمِيعُ الْعَلِيمُ" },
  { t: 66,   ar: "بَلْ قَالُوا أَضْغَاثُ أَحْلَامٍ بَلِ افْتَرَاهُ بَلْ هُوَ شَاعِرٌ فَلْيَأْتِنَا بِآيَةٍ كَمَا أُرْسِلَ الْأَوَّلُونَ" },
  { t: 90,   ar: "مَا آمَنَتْ قَبْلَهُم مِّن قَرْيَةٍ أَهْلَكْنَاهَا ۖ أَفَهُمْ يُؤْمِنُونَ" },
  { t: 102,  ar: "وَمَا أَرْسَلْنَا قَبْلَكَ إِلَّا رِجَالًا نُّوحِي إِلَيْهِمْ ۖ فَاسْأَلُوا أَهْلَ الذِّكْرِ إِن كُنتُمْ لَا تَعْلَمُونَ" },
];

const NISA_LINES: Line[] = [
  { t: 0,    ar: "يَا أَيُّهَا النَّاسُ اتَّقُوا رَبَّكُمُ الَّذِي خَلَقَكُم مِّن نَّفْسٍ وَاحِدَةٍ وَخَلَقَ مِنْهَا زَوْجَهَا وَبَثَّ مِنْهُمَا رِجَالًا كَثِيرًا وَنِسَاءً ۚ وَاتَّقُوا اللَّهَ الَّذِي تَسَاءَلُونَ بِهِ وَالْأَرْحَامَ ۚ إِنَّ اللَّهَ كَانَ عَلَيْكُمْ رَقِيبًا" },
  { t: 42,   ar: "وَآتُوا الْيَتَامَىٰ أَمْوَالَهُمْ ۖ وَلَا تَتَبَدَّلُوا الْخَبِيثَ بِالطَّيِّبِ ۖ وَلَا تَأْكُلُوا أَمْوَالَهُمْ إِلَىٰ أَمْوَالِكُمْ ۚ إِنَّهُ كَانَ حُوبًا كَبِيرًا" },
  { t: 66,   ar: "وَإِنْ خِفْتُمْ أَلَّا تُقْسِطُوا فِي الْيَتَامَىٰ فَانكِحُوا مَا طَابَ لَكُم مِّنَ النِّسَاءِ مَثْنَىٰ وَثُلَاثَ وَرُبَاعَ ۖ فَإِنْ خِفْتُمْ أَلَّا تَعْدِلُوا فَوَاحِدَةً أَوْ مَا مَلَكَتْ أَيْمَانُكُمْ ۚ ذَٰلِكَ أَدْنَىٰ أَلَّا تَعُولُوا" },
  { t: 108,  ar: "وَآتُوا النِّسَاءَ صَدُقَاتِهِنَّ نِحْلَةً ۚ فَإِن طِبْنَ لَكُمْ عَن شَيْءٍ مِّنْهُ نَفْسًا فَكُلُوهُ هَنِيئًا مَّرِيئًا" },
  { t: 126,  ar: "وَلَا تُؤْتُوا السُّفَهَاءَ أَمْوَالَكُمُ الَّتِي جَعَلَ اللَّهُ لَكُمْ قِيَامًا وَارْزُقُوهُمْ فِيهَا وَاكْسُوهُمْ وَقُولُوا لَهُمْ قَوْلًا مَّعْرُوفًا" },
];

const ISRA_LINES: Line[] = [
  { t: 0,   ar: "إِنَّ رَبَّكَ يَبْسُطُ الرِّزْقَ لِمَن يَشَاءُ وَيَقْدِرُ ۚ إِنَّهُ كَانَ بِعِبَادِهِ خَبِيرًا بَصِيرًا" },
  { t: 18,  ar: "وَلَا تَقْتُلُوا أَوْلَادَكُمْ خَشْيَةَ إِمْلَاقٍ ۖ نَّحْنُ نَرْزُقُهُمْ وَإِيَّاكُمْ ۚ إِنَّ قَتْلَهُمْ كَانَ خِطْئًا كَبِيرًا" },
  { t: 40,  ar: "وَلَا تَقْرَبُوا الزِّنَا ۖ إِنَّهُ كَانَ فَاحِشَةً وَسَاءَ سَبِيلًا" },
  { t: 52,  ar: "وَلَا تَقْتُلُوا النَّفْسَ الَّتِي حَرَّمَ اللَّهُ إِلَّا بِالْحَقِّ ۗ وَمَن قُتِلَ مَظْلُومًا فَقَدْ جَعَلْنَا لِوَلِيِّهِ سُلْطَانًا فَلَا يُسْرِف فِّي الْقَتْلِ ۖ إِنَّهُ كَانَ مَنصُورًا" },
  { t: 80,  ar: "وَلَا تَقْرَبُوا مَالَ الْيَتِيمِ إِلَّا بِالَّتِي هِيَ أَحْسَنُ حَتَّىٰ يَبْلُغَ أَشُدَّهُ ۚ وَأَوْفُوا بِالْعَهْدِ ۖ إِنَّ الْعَهْدَ كَانَ مَسْئُولًا" },
  { t: 102, ar: "وَأَوْفُوا الْكَيْلَ إِذَا كِلْتُمْ وَزِنُوا بِالْقِسْطَاسِ الْمُسْتَقِيمِ ۚ ذَٰلِكَ خَيْرٌ وَأَحْسَنُ تَأْوِيلًا" },
  { t: 120, ar: "وَلَا تَقْفُ مَا لَيْسَ لَكَ بِهِ عِلْمٌ ۚ إِنَّ السَّمْعَ وَالْبَصَرَ وَالْفُؤَادَ كُلُّ أُولَٰئِكَ كَانَ عَنْهُ مَسْئُولًا" },
  { t: 137, ar: "وَلَا تَمْشِ فِي الْأَرْضِ مَرَحًا ۖ إِنَّكَ لَن تَخْرِقَ الْأَرْضَ وَلَن تَبْلُغَ الْجِبَالَ طُولًا" },
  { t: 153, ar: "كُلُّ ذَٰلِكَ كَانَ سَيِّئُهُ عِندَ رَبِّكَ مَكْرُوهًا" },
  { t: 162, ar: "ذَٰلِكَ مِمَّا أَوْحَىٰ إِلَيْكَ رَبُّكَ مِنَ الْحِكْمَةِ ۖ وَلَا تَجْعَلْ مَعَ اللَّهِ إِلَٰهًا آخَرَ فَتُلْقَىٰ فِي جَهَنَّمَ مَلُومًا مَّدْحُورًا" },
];

const SURAHS = [
  {
    id: "imran",
    labelAr: "آل عمران 90-94",
    labelEn: "Al-Imran 90-94",
    subtitleAr: "سورة آل عمران · الآيات 90 - 94",
    subtitleEn: "Surah Al-Imran · Verses 90 – 94",
    url: audioAsset.url,
    lines: IMRAN_LINES,
  },
  {
    id: "baqarah",
    labelAr: "البقرة 153-157",
    labelEn: "Al-Baqarah 153-157",
    subtitleAr: "سورة البقرة · الآيات 153 - 157",
    subtitleEn: "Surah Al-Baqarah · Verses 153 – 157",
    url: audioBaqarah.url,
    lines: BAQARAH_LINES,
  },
  {
    id: "anbiya",
    labelAr: "الأنبياء 1-7",
    labelEn: "Al-Anbiya 1-7",
    subtitleAr: "سورة الأنبياء · الآيات 1 - 7",
    subtitleEn: "Surah Al-Anbiya · Verses 1 – 7",
    url: audioAnbiya.url,
    lines: ANBIYA_LINES,
  },
  {
    id: "nisa",
    labelAr: "النساء 1-5",
    labelEn: "An-Nisa 1-5",
    subtitleAr: "سورة النساء · الآيات 1 - 5",
    subtitleEn: "Surah An-Nisa · Verses 1 – 5",
    url: audioNisa.url,
    lines: NISA_LINES,
  },
  {
    id: "isra",
    labelAr: "الإسراء 30-39",
    labelEn: "Al-Isra 30-39",
    subtitleAr: "سورة الإسراء · الآيات 30 - 39",
    subtitleEn: "Surah Al-Isra · Verses 30 – 39",
    url: audioIsra.url,
    lines: ISRA_LINES,
  },
];

const fmt = (s: number) => {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
};

const IslamicSurahs = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lineRefs = useRef<Array<HTMLLIElement | null>>([]);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [surahIdx, setSurahIdx] = useState(0);
  const surah = SURAHS[surahIdx];
  const LINES = surah.lines;

  type Mistake = { student_wrote?: string; should_be?: string; kind?: string; note?: string };
  type SurahResult = {
    verdict: "correct" | "minor_errors" | "incorrect";
    score?: number;
    summary?: string;
    correct_text?: string;
    mistakes?: Mistake[];
    tips?: string[];
  };

  const [mode, setMode] = useState<"listen" | "write">("listen");
  const [writeInput, setWriteInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<SurahResult | null>(null);
  const [submitted, setSubmitted] = useState("");

  // Reset write state when switching surah
  useEffect(() => {
    setWriteInput("");
    setResult(null);
    setSubmitted("");
  }, [surahIdx]);

  const t = {
    listen: language === "ar" ? "استماع" : "Listen",
    write: language === "ar" ? "اكتب وصحّح" : "Write & Check",
    placeholder: language === "ar" ? "اكتب الآيات هنا (لا حاجة للتشكيل)..." : "Write the verses here (no diacritics needed)...",
    check: language === "ar" ? "تحقّق" : "Check",
    checking: language === "ar" ? "جاري التحقق..." : "Checking...",
    correct: language === "ar" ? "صحيح" : "Correct",
    minor: language === "ar" ? "قريب من الصحيح" : "Almost correct",
    wrong: language === "ar" ? "غير صحيح" : "Incorrect",
    correctText: language === "ar" ? "النص الصحيح" : "Correct text",
    yourAnswer: language === "ar" ? "إجابتك (مع تمييز الأخطاء)" : "Your answer (mistakes highlighted)",
    notes: language === "ar" ? "ملاحظات المعلّم" : "Teacher's notes",
    tips: language === "ar" ? "نصائح للحفظ" : "Study tips",
    youWrote: language === "ar" ? "كتبتَ" : "You wrote",
    shouldBe: language === "ar" ? "والصواب" : "Should be",
    error: language === "ar" ? "تعذّر التحقق الآن. حاول مرة أخرى." : "Couldn't check right now.",
    ignoreDiacritics: language === "ar" ? "يتم تجاهل التشكيل تلقائياً" : "Diacritics are ignored automatically",
  };

  const kindLabel = (k?: string) => {
    if (language === "ar") {
      switch (k) {
        case "missing": return "كلمة ناقصة";
        case "extra": return "كلمة زائدة";
        case "wrong_word": return "كلمة خاطئة";
        case "spelling": return "خطأ إملائي";
        case "order": return "ترتيب خاطئ";
        default: return "";
      }
    }
    switch (k) {
      case "missing": return "missing word";
      case "extra": return "extra word";
      case "wrong_word": return "wrong word";
      case "spelling": return "spelling";
      case "order": return "wrong order";
      default: return "";
    }
  };

  const checkSurah = async () => {
    const text = writeInput.trim();
    if (!text || checking) return;
    setChecking(true);
    setResult(null);
    setSubmitted(text);
    try {
      const referenceText = LINES.map((l) => l.ar).join(" ");
      const surahName = language === "ar" ? surah.subtitleAr : surah.subtitleEn;
      const { data, error } = await supabase.functions.invoke("verify-surah", {
        body: { surah: text, language, surahName, referenceText },
      });
      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));
      setResult(data?.result as SurahResult);
    } catch {
      toast({ title: t.error, variant: "destructive" });
    } finally {
      setChecking(false);
    }
  };

  const renderAnnotated = (text: string, mistakes: Mistake[]) => {
    const wrongs = mistakes.map((m) => (m.student_wrote || "").trim()).filter(Boolean);
    if (wrongs.length === 0) return <span>{text}</span>;
    const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${wrongs.map(escape).join("|")})`, "g");
    const parts = text.split(re);
    return (
      <>
        {parts.map((p, i) =>
          wrongs.includes(p.trim()) ? (
            <mark key={i} className="bg-red-500/30 text-red-200 rounded px-1 mx-0.5 underline decoration-red-400 decoration-wavy underline-offset-4">{p}</mark>
          ) : (
            <span key={i}>{p}</span>
          )
        )}
      </>
    );
  };

  const activeIdx = (() => {
    let i = -1;
    for (let k = 0; k < LINES.length; k++) {
      if (time >= LINES[k].t) i = k;
      else break;
    }
    return i;
  })();

  useEffect(() => {
    if (activeIdx < 0) return;
    const el = lineRefs.current[activeIdx];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIdx]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const wasPlaying = !a.paused;
    a.pause();
    a.load();
    a.currentTime = 0;
    setTime(0);
    if (wasPlaying) {
      a.play().catch(() => {});
    }
  }, [surahIdx]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play();
    else a.pause();
  };

  const restart = () => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    a.play();
  };

  const seek = (val: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = val;
    setTime(val);
  };

  const jumpToLine = (t: number) => seek(t);

  const title = language === "ar" ? "سور إسلامية" : "Islamic Surahs";
  const subtitle = language === "ar" ? surah.subtitleAr : surah.subtitleEn;

  return (
    <main className="min-h-screen px-4 py-10 md:py-16 relative overflow-hidden" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <button
        onClick={onBack}
        className="absolute top-6 left-6 z-20 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-secondary/60 backdrop-blur text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
      >
        {language === "ar" ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
        <span className="hidden sm:inline">{language === "ar" ? "رجوع" : "Back"}</span>
      </button>

      <button
        onClick={onBack}
        aria-label={language === "ar" ? "خروج" : "Exit"}
        className="absolute top-6 right-6 z-20 w-10 h-10 inline-flex items-center justify-center rounded-full border border-white/10 bg-secondary/60 backdrop-blur text-muted-foreground hover:text-foreground hover:border-destructive/60 hover:bg-destructive/10 transition-all"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="max-w-3xl mx-auto relative z-10">
        <header className="text-center mb-8 animate-fade-up">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground mb-3">{title}</p>
          <h1 className="text-3xl md:text-5xl font-bold gradient-text" style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}>
            {subtitle}
          </h1>
        </header>

        <div className="rounded-3xl border border-border bg-card/85 backdrop-blur-xl shadow-[0_24px_60px_-20px_hsl(var(--primary)/0.35)] overflow-hidden">
          {/* Mode toggle */}
          <div className="px-6 md:px-8 pt-5 flex items-center justify-center gap-2" dir={language === "ar" ? "rtl" : "ltr"}>
            <button
              onClick={() => setMode("listen")}
              className={`px-4 py-1.5 rounded-full text-xs inline-flex items-center gap-1.5 border transition ${
                mode === "listen" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/50 text-muted-foreground border-border hover:text-foreground hover:border-primary/40"
              }`}
            >
              <Headphones className="w-3.5 h-3.5" /> {t.listen}
            </button>
            <button
              onClick={() => setMode("write")}
              className={`px-4 py-1.5 rounded-full text-xs inline-flex items-center gap-1.5 border transition ${
                mode === "write" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/50 text-muted-foreground border-border hover:text-foreground hover:border-primary/40"
              }`}
            >
              <Pencil className="w-3.5 h-3.5" /> {t.write}
            </button>
          </div>

          {/* Player */}
          <div className="p-6 md:p-8 border-b border-border" dir="ltr">
            <audio
              ref={audioRef}
              src={surah.url}
              preload="metadata"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onEnded={() => setPlaying(false)}
            />

            <div className="flex items-center gap-4">
              <button
                onClick={restart}
                aria-label="Restart"
                className="w-11 h-11 rounded-full border border-border bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={toggle}
                aria-label={playing ? "Pause" : "Play"}
                className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-[0_10px_30px_-8px_hsl(var(--primary)/0.6)] flex items-center justify-center hover:scale-105 active:scale-95 transition"
              >
                {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 translate-x-0.5" />}
              </button>

              <div className="flex-1 flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground w-10 text-right">{fmt(time)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.01}
                  value={time}
                  onChange={(e) => seek(parseFloat(e.target.value))}
                  className="flex-1 h-1.5 rounded-full appearance-none bg-secondary accent-primary cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${(time / (duration || 1)) * 100}%, hsl(var(--secondary)) ${(time / (duration || 1)) * 100}%, hsl(var(--secondary)) 100%)`,
                  }}
                />
                <span className="text-xs font-mono text-muted-foreground w-10">{fmt(duration)}</span>
              </div>

              <div className="hidden sm:flex items-center gap-2 w-32">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setVolume(v);
                    if (audioRef.current) audioRef.current.volume = v;
                  }}
                  className="flex-1 h-1 accent-primary cursor-pointer"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2" dir={language === "ar" ? "rtl" : "ltr"}>
              {SURAHS.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setSurahIdx(i)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition ${
                    i === surahIdx
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/50 text-muted-foreground border-border hover:text-foreground hover:border-primary/40"
                  }`}
                >
                  {language === "ar" ? s.labelAr : s.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Lyrics / Write */}
          {mode === "listen" ? (
          <div className="relative">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-card to-transparent z-10"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent z-10"
            />
            <ol
              dir="rtl"
              className="h-[26rem] overflow-y-auto px-6 md:px-10 py-12 space-y-5 scroll-smooth"
              style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
            >
              {LINES.map((line, i) => {
                const isActive = i === activeIdx;
                const isPast = i < activeIdx;
                return (
                  <li
                    key={i}
                    ref={(el) => { lineRefs.current[i] = el; }}
                    onClick={() => jumpToLine(line.t)}
                    className={`text-center cursor-pointer transition-all duration-500 leading-loose select-none ${
                      isActive
                        ? "text-primary font-bold text-2xl md:text-3xl scale-[1.04]"
                        : isPast
                          ? "text-muted-foreground/50 text-lg md:text-xl"
                          : "text-foreground/70 text-lg md:text-xl hover:text-foreground"
                    }`}
                  >
                    {line.ar}
                  </li>
                );
              })}
            </ol>
          </div>
          ) : (
            <div className="p-6 md:p-8 space-y-4" dir={language === "ar" ? "rtl" : "ltr"}>
              <p className="text-xs text-muted-foreground text-center">{t.ignoreDiacritics}</p>
              <Textarea
                value={writeInput}
                onChange={(e) => setWriteInput(e.target.value)}
                placeholder={t.placeholder}
                className="min-h-[220px] rounded-2xl bg-secondary/40 border-white/10 text-base"
                dir="rtl"
                style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
              />
              <button
                onClick={checkSurah}
                disabled={checking || !writeInput.trim()}
                className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {checking ? (<><Loader2 className="w-4 h-4 animate-spin" /> {t.checking}</>) : (<><Eye className="w-4 h-4" /> {t.check}</>)}
              </button>

              {result && (() => {
                const meta =
                  result.verdict === "correct"
                    ? { label: t.correct, Icon: Check, cls: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300" }
                    : result.verdict === "minor_errors"
                    ? { label: t.minor, Icon: AlertTriangle, cls: "border-amber-400/40 bg-amber-500/10 text-amber-300" }
                    : { label: t.wrong, Icon: X, cls: "border-red-400/40 bg-red-500/10 text-red-300" };
                return (
                  <div className="space-y-4 pt-2">
                    <div className={`rounded-3xl p-5 border backdrop-blur ${meta.cls}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <meta.Icon className="w-5 h-5" />
                        <span className="font-semibold">{meta.label}</span>
                        {typeof result.score === "number" && (
                          <span className="ms-auto text-xs opacity-80">{result.score}%</span>
                        )}
                      </div>
                      {result.summary && <p className="text-foreground/90 leading-relaxed">{result.summary}</p>}
                    </div>

                    {result.correct_text && (
                      <div className="rounded-3xl p-5 border border-emerald-400/30 bg-emerald-500/5">
                        <div className="text-xs uppercase tracking-[0.25em] text-emerald-300 mb-2">{t.correctText}</div>
                        <p className="text-foreground/90 leading-loose whitespace-pre-wrap text-lg" dir="rtl" style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}>
                          {result.correct_text}
                        </p>
                      </div>
                    )}

                    {submitted && result.mistakes && result.mistakes.length > 0 && (
                      <div className="rounded-3xl p-5 border border-amber-400/30 bg-amber-500/5">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-amber-300 mb-2">
                          <Pencil className="w-3.5 h-3.5" /> {t.yourAnswer}
                        </div>
                        <p className="text-foreground/90 leading-loose whitespace-pre-wrap text-lg" dir="rtl" style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}>
                          {renderAnnotated(submitted, result.mistakes)}
                        </p>
                      </div>
                    )}

                    {result.mistakes && result.mistakes.length > 0 && (
                      <div className="rounded-3xl p-5 border border-border bg-secondary/30">
                        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">{t.notes}</div>
                        <ol className="space-y-3" dir="rtl">
                          {result.mistakes.map((mk, i) => (
                            <li key={i} className="rounded-2xl border border-border bg-background/40 p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">{i + 1}</span>
                                {kindLabel(mk.kind) && (
                                  <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{kindLabel(mk.kind)}</span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm mb-2">
                                {mk.student_wrote ? (
                                  <span><span className="text-muted-foreground">{t.youWrote}: </span><span className="text-red-300 line-through">{mk.student_wrote}</span></span>
                                ) : null}
                                {mk.should_be ? (
                                  <span><span className="text-muted-foreground">{t.shouldBe}: </span><span className="text-emerald-300 font-semibold">{mk.should_be}</span></span>
                                ) : null}
                              </div>
                              {mk.note && <p className="text-foreground/80 text-sm leading-relaxed">{mk.note}</p>}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {result.tips && result.tips.length > 0 && (
                      <div className="rounded-3xl p-5 border border-primary/20 bg-primary/5">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary mb-2">
                          <Lightbulb className="w-3.5 h-3.5" /> {t.tips}
                        </div>
                        <ul className="list-disc ps-5 space-y-1 text-foreground/80">
                          {result.tips.map((tip, i) => <li key={i}>{tip}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {mode === "listen" && (
          <p className="text-center text-xs text-muted-foreground mt-6">
            {language === "ar" ? "اضغط على أي آية للانتقال إليها مباشرة" : "Tap any verse to jump to it"}
          </p>
        )}
      </div>
    </main>
  );
};

export default IslamicSurahs;