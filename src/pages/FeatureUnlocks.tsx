import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Flame, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import FeatureFacetCard from "@/components/FeatureFacetCard";
import PointsExplainer from "@/components/PointsExplainer";
import RankStone, { rankFromPoints, RANK_LABELS } from "@/components/RankStone";
import {
  FEATURE_MENU,
  fetchProgress,
  fetchTiers,
  fetchUnlockedKeys,
  type FeatureKey,
  type FeatureTier,
  type UserProgress,
} from "@/lib/unlocks";

const FeatureUnlocks = ({
  language,
  onBack,
  onNav,
  highlight,
}: {
  language: "en" | "ar";
  onBack: () => void;
  onNav: (menu: string) => void;
  highlight?: FeatureKey | null;
}) => {
  const isAr = language === "ar";
  const [tiers, setTiers] = useState<FeatureTier[]>([]);
  const [unlocked, setUnlocked] = useState<FeatureKey[]>([]);
  const [progress, setProgress] = useState<UserProgress>({
    lifetime_points: 0,
    current_streak: 0,
    longest_streak: 0,
    last_active_date: null,
  });
  useEffect(() => {
    const load = async () => {
      const [t, p, u] = await Promise.all([fetchTiers(), fetchProgress(), fetchUnlockedKeys()]);
      setTiers(t);
      setProgress(p);
      setUnlocked(u);
    };
    load();
    const onUpdate = () => load();
    window.addEventListener("app:progress-updated", onUpdate);
    const channel = supabase
      .channel("feature-unlocks-progress")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_progress" }, onUpdate)
      .subscribe();
    return () => {
      window.removeEventListener("app:progress-updated", onUpdate);
      supabase.removeChannel(channel);
    };
  }, []);
  const points = progress.lifetime_points;
  const rank = rankFromPoints(points);
  const Back = isAr ? ArrowRight : ArrowLeft;
  return (
    <main className="min-h-screen bg-background pb-32" dir={isAr ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6">
        <button
          onClick={onBack}
          className="mb-6 inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-secondary"
        >
          <Back className="h-4 w-4" />
          {isAr ? "رجوع" : "Back"}
        </button>
        <header className="mb-6">
          <h1 className="text-2xl font-black text-foreground">
            {isAr ? "فتح الأدوات بالنقاط" : "Unlock tools with points"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAr
              ? "نقاطك تتراكم للأبد — كل ما جمعت أكثر، انفتحت لك أدوات أقوى."
              : "Your points never go down — keep earning and stronger tools open up."}
          </p>
        </header>
        <section
          className="mb-8 flex items-center gap-4 border border-border bg-card/70 p-5"
          style={{
            clipPath:
              "polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)",
          }}
        >
          <RankStone rank={rank} size={72} glow={rank === "royal" || rank === "diamond"} />
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {RANK_LABELS[rank][language]}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-black tabular-nums text-foreground">{points}</span>
              <span className="text-xs text-muted-foreground">{isAr ? "نقطة" : "points"}</span>
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-primary" />
                {progress.current_streak} {isAr ? "يوم متتالي" : "day streak"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5" />
                {unlocked.length}/{tiers.length} {isAr ? "مفتوحة" : "unlocked"}
              </span>
            </div>
          </div>
        </section>
        <div className="space-y-4">
          {tiers.map((t) => (
            <FeatureFacetCard
              key={t.feature_key}
              tier={t}
              language={language}
              lifetimePoints={points}
              unlocked={unlocked.includes(t.feature_key)}
              highlighted={highlight === t.feature_key}
              onOpen={
                FEATURE_MENU[t.feature_key]
                  ? () => onNav(FEATURE_MENU[t.feature_key] as string)
                  : undefined
              }
            />
          ))}
        </div>
        <div className="mt-10">
          <PointsExplainer language={language} />
        </div>
      </div>
    </main>
  );
};

export default FeatureUnlocks;