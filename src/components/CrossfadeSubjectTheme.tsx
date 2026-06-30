import { useEffect, useState } from "react";
import { subjectThemes } from "@/lib/subjectThemes";
import type { AppSubject } from "@/pages/Subjects";

const CROSSFADE_DURATION = 700;

type ThemeLayerProps = {
  subject: AppSubject;
  direction: "in" | "out";
  className?: string;
};

const ThemeLayer = ({ subject, direction, className }: ThemeLayerProps) => {
  const theme = subjectThemes[subject];
  if (!theme) return null;
  return (
    <div
      className={`pointer-events-none absolute inset-0 ${
        direction === "in" ? "animate-theme-crossfade-in" : "animate-theme-crossfade-out"
      } ${className ?? ""}`}
      aria-hidden
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.tint}`} />
      <img
        src={theme.image}
        alt=""
        loading="lazy"
        width={1024}
        height={1024}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(90vw,720px)] h-auto opacity-[0.06] md:opacity-[0.08] select-none"
      />
    </div>
  );
};

type CrossfadeSubjectThemeProps = {
  subject: AppSubject;
  previousSubject?: AppSubject | null;
  onComplete?: () => void;
};

const CrossfadeSubjectTheme = ({
  subject,
  previousSubject,
  onComplete,
}: CrossfadeSubjectThemeProps) => {
  const [current, setCurrent] = useState<AppSubject>(subject);
  const [previous, setPrevious] = useState<AppSubject | null>(() => {
    if (previousSubject && previousSubject !== subject) return previousSubject;
    return null;
  });

  useEffect(() => {
    if (subject !== current) {
      setPrevious(current);
      setCurrent(subject);
    }
  }, [subject, current]);

  useEffect(() => {
    if (!previous) return;
    const timer = window.setTimeout(() => {
      setPrevious(null);
      onComplete?.();
    }, CROSSFADE_DURATION);
    return () => window.clearTimeout(timer);
  }, [previous, onComplete]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {previous && <ThemeLayer subject={previous} direction="out" />}
      <ThemeLayer subject={current} direction="in" />
    </div>
  );
};

export default CrossfadeSubjectTheme;
