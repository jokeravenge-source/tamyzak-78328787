import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";

export type SubscriptionRow = {
  id: string;
  status: string;
  product_id: string;
  price_id: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  environment: string;
};

function isActive(sub: SubscriptionRow | null): boolean {
  if (!sub) return false;
  if (!["active", "trialing", "past_due"].includes(sub.status)) return false;
  if (!sub.current_period_end) return true;
  return new Date(sub.current_period_end).getTime() > Date.now();
}

export function useSubscription() {
  const [sub, setSub] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const env = getPaddleEnvironment();

    const fetchSub = async (uid: string) => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", uid)
        .eq("environment", env)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (active) {
        setSub((data as SubscriptionRow | null) ?? null);
        setLoading(false);
      }
    };

    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoading(false); return; }
      setUserId(u.user.id);
      await fetchSub(u.user.id);
      channel = supabase
        .channel(`sub:${u.user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${u.user.id}` },
          () => fetchSub(u.user.id),
        )
        .subscribe();
    })();

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return { subscription: sub, isPremium: isActive(sub), loading, userId };
}