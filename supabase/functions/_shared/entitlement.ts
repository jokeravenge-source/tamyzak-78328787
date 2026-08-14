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

  const token = authHeader.replace("Bearer ", "").trim();
  const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
  const userId = claimsData?.claims?.sub as string | undefined;
  if (claimsErr || !userId) {
    return { ok: false, status: 401, error: "Invalid session." };
  }

  const { data: allowed, error } = await supabase.rpc("claim_daily_feature", { _feature: feature });
  if (error) {
    return { ok: false, status: 500, error: error.message };
  }
  if (!allowed) {
    return {
      ok: false,
      status: 429,
      error: "You've reached today's usage limit for this tool. It resets at midnight Baghdad time (Asia/Baghdad, UTC+3).",
    };
  }
  return { ok: true, userId, bypassed: false };
}