import { useEffect, useState } from "react";

type Props = {
  target: string; // ISO date
  language: "ar" | "en";
  title?: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

function diff(target: number) {
  const d = Math.max(0, target - Date.now());
  const days = Math.floor(d / 86400000);
  const hours = Math.floor((d % 86400000) / 3600000);
  const minutes = Math.floor((d % 3600000) / 60000);
  const seconds = Math.floor((d % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

const CountdownTimer = ({ target, language, title }: Props) => {
  const targetMs = new Date(target).getTime();
  const [t, setT] = useState(() => diff(targetMs));

  useEffect(() => {
    const id = setInterval(() => setT(diff(targetMs)), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  const labels = language === "ar"
    ? { d: "يوم", h: "ساعة", m: "دقيقة", s: "ثانية", default: "العدّ التنازلي إلى 7 آب" }
    : { d: "Days", h: "Hours", m: "Minutes", s: "Seconds", default: "Countdown to August 7" };

  const heading = title ?? labels.default;

  const cell = (val: number, label: string) => (
    <div className="flex flex-col items-center min-w-[64px] md:min-w-[96px] px-3 md:px-5 py-3 md:py-4 rounded-2xl bg-secondary/60 border border-white/10 backdrop-blur shadow-lg">
      <span className="text-3xl md:text-6xl font-bold tabular-nums gradient-text leading-none">
        {pad(val)}
      </span>
      <span className="mt-2 text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
    </div>
  );

  return (
    <section className="relative z-10 mx-auto mt-8 max-w-3xl text-center animate-fade-up">
      <div className="inline-block px-6 py-5 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent backdrop-blur">
        <p className="text-sm md:text-base font-semibold text-primary mb-4">{heading}</p>
        <div className="flex items-center justify-center gap-2 md:gap-4" dir="ltr">
          {cell(t.days, labels.d)}
          {cell(t.hours, labels.h)}
          {cell(t.minutes, labels.m)}
          {cell(t.seconds, labels.s)}
        </div>
      </div>
    </section>
  );
};

export default CountdownTimer;