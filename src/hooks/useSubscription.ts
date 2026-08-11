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

    let uid: string | null = null;
    let lastFetch = 0;
    const onFocus = () => {
      if (!uid || document.hidden) return;
      if (Date.now() - lastFetch < 30000) return;
      lastFetch = Date.now();
      fetchSub(uid);
    };
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoading(false); return; }
      setUserId(u.user.id);
      uid = u.user.id;
      lastFetch = Date.now();
      await fetchSub(u.user.id);
      // Cost: subscription rows change rarely, so we re-check on focus
      // (throttled) instead of holding a realtime channel open.
      window.addEventListener("focus", onFocus);
      document.addEventListener("visibilitychange", onFocus);
    })();

    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  return { subscription: sub, isPremium: isActive(sub), loading, userId };
}