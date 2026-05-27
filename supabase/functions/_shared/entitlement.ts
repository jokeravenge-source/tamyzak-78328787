import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

export type EntitlementResult =
  | { ok: true; userId: string; bypassed: boolean }
  | { ok: false; status: number; error: string };

/**
 * Validates the incoming JWT and reserves one daily use of `feature` for the
 * authenticated user. Premium users (active subscription in any environment)
 * are bypassed by the SQL function and never consume quota.
 *
 * Returns 401 if no auth, 429 if quota is exhausted.
 */
export async function claimFeature(req: Request, feature: string): Promise<EntitlementResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Sign in to use this feature." };
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return { ok: false, status: 401, error: "Invalid session." };
  }
  const userId = userData.user.id;

  const { data: allowed, error } = await supabase.rpc("claim_daily_feature", { _feature: feature });
  if (error) {
    return { ok: false, status: 500, error: error.message };
  }
  if (!allowed) {
    return {
      ok: false,
      status: 429,
      error: "You've used your 5 free uses today. Upgrade to Premium for unlimited access.",
    };
  }
  return { ok: true, userId, bypassed: false };
}