import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import RankStone, { rankFromPoints, RANK_LABELS } from "./RankStone";
import { CharacterAvatar, type CharacterTraits, type Gender } from "./CharacterAvatar";
import { Flame, Clock, Trophy } from "lucide-react";

type Profile = {
  display_name: string;
  gender: Gender | null;
  character: Partial<CharacterTraits> | null;
  lifetime_points: number;
  current_streak: number;
  longest_streak: number;
  total_seconds: number;
};

export default function StudentProfileDialog({
  userId,
  language,
  onClose,
}: {
  userId: string | null;
  language: "en" | "ar";
  onClose: () => void;
}) {
  const isAr = language === "ar";
  const [data, setData] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) { setData(null); return; }
    let alive = true;
    setLoading(true);
    supabase.rpc("public_student_profile", { _user_id: userId }).then(({ data: d }) => {
      if (!alive) return;
      setData((d as unknown as Profile) ?? null);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [userId]);

  const points = data?.lifetime_points ?? 0;
  const rank = rankFromPoints(points);
  const hours = ((data?.total_seconds ?? 0) / 3600).toFixed(1);

  return (
    <Dialog open={!!userId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm" dir={isAr ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{isAr ? "ملف الطالب" : "Student profile"}</DialogTitle>
        </DialogHeader>
        {loading || !data ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {isAr ? "جارٍ التحميل..." : "Loading..."}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CharacterAvatar gender={data.gender ?? "male"} traits={data.character ?? undefined} size={72} />
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-foreground">{data.display_name}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {RANK_LABELS[rank][language]}
                </p>
              </div>
              <RankStone rank={rank} size={56} className="ms-auto" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-border bg-card p-3">
                <Trophy className="mx-auto h-4 w-4 text-primary" />
                <p className="mt-1 font-mono text-lg font-black tabular-nums">{points}</p>
                <p className="text-[11px] text-muted-foreground">{isAr ? "نقطة" : "points"}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <Flame className="mx-auto h-4 w-4 text-primary" />
                <p className="mt-1 font-mono text-lg font-black tabular-nums">{data.current_streak}</p>
                <p className="text-[11px] text-muted-foreground">{isAr ? "يوم متتالي" : "day streak"}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <Clock className="mx-auto h-4 w-4 text-primary" />
                <p className="mt-1 font-mono text-lg font-black tabular-nums">{hours}</p>
                <p className="text-[11px] text-muted-foreground">{isAr ? "ساعة دراسة" : "hours studied"}</p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}