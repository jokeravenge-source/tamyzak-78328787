import { ArrowLeft, Sparkles, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import type { AppLanguage } from "@/components/LanguageGate";

export const TOOL_PLACEHOLDER_KEY = "app_tool_placeholder_v1";

type ToolMeta = {
  en: string;
  ar: string;
  descEn?: string;
  descAr?: string;
};

const readMeta = (): ToolMeta | null => {
  try {
    const raw = localStorage.getItem(TOOL_PLACEHOLDER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ToolMeta;
  } catch {
    return null;
  }
};

const ToolPlaceholder = ({
  language,
  onBack,
}: {
  language: AppLanguage;
  onBack: () => void;
}) => {
  const isRTL = language === "ar";
  const [meta, setMeta] = useState<ToolMeta | null>(() => readMeta());
  useEffect(() => {
    setMeta(readMeta());
  }, []);
  const title = meta ? (isRTL ? meta.ar : meta.en) : isRTL ? "أداة" : "Tool";
  const desc = meta
    ? isRTL
      ? meta.descAr ?? "هذه الأداة قيد التطوير وستتوفر قريباً."
      : meta.descEn ?? "This tool is under active development and will be available soon."
    : isRTL
      ? "هذه الأداة قيد التطوير."
      : "This tool is under active development.";

  return (
    <main dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-background pb-28">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors mb-8"
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
          {isRTL ? "رجوع" : "Back"}
        </button>

        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-secondary/30 backdrop-blur p-8 md:p-12">
          <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-accent/20 blur-3xl" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-secondary/50 backdrop-blur mb-6">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                {isRTL ? "قريباً" : "Coming Soon"}
              </span>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mb-6">
              <Wrench className="w-8 h-8 text-primary" />
            </div>
            <h1
              className="text-3xl md:text-5xl font-bold gradient-text leading-tight mb-4"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {title}
            </h1>
            <p className="text-muted-foreground md:text-lg max-w-xl">{desc}</p>

            <div className="mt-8 grid sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-card/60 p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                  {isRTL ? "الحالة" : "Status"}
                </p>
                <p className="text-sm font-semibold">
                  {isRTL ? "قيد التطوير" : "In development"}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card/60 p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                  {isRTL ? "متاح لـ" : "Available for"}
                </p>
                <p className="text-sm font-semibold">
                  {isRTL ? "أعضاء البريميوم" : "Premium members"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ToolPlaceholder;