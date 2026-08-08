import { useState } from "react";
import GiftDailyScreen from "@/components/GiftDailyScreen";
import type { AppLanguage } from "@/components/LanguageGate";
import giftVideo from "@/assets/gift-premium.mp4.asset.json";

/**
 * Gift animation in the profile row. Tapping it opens the full-screen daily
 * gift question (one attempt per day, ministerial bank, chapters 1-2).
 */
export default function GiftMcqButton({ language }: { language: AppLanguage }) {
  const isAr = language === "ar";
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={isAr ? "سؤال هدية" : "Gift question"}
        title={isAr ? "سؤال الهدية اليومي" : "Daily gift question"}
        className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary transition-colors flex items-center justify-center overflow-hidden"
      >
        <video
          src={giftVideo.url}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      </button>

      {open && <GiftDailyScreen language={language} onClose={() => setOpen(false)} />}
    </>
  );
}
