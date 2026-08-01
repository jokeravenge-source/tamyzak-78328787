import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

export type RateLimitResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/**
 * Short-window rate limit (default: 5 requests per 60s per user per feature).
 * Backed by the SQL function `check_rate_limit`. Returns 401 when unauthenticated
 * and 429 when the caller is sending too many requests.
 */
export async function enforceRateLimit(
  req: Request,
  feature: string,
  maxRequests = 5,
  windowSeconds = 60,
): Promise<RateLimitResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Sign in to use this feature." };
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: allowed, error } = await supabase.rpc("check_rate_limit", {
    _feature: feature,
    _max_requests: maxRequests,
    _window_seconds: windowSeconds,
  });
  if (error) return { ok: false, status: 500, error: error.message };
  if (!allowed) {
    return {
      ok: false,
      status: 429,
      error: "Too many requests. Please wait a minute before trying again.",
    };
  }
  return { ok: true };
}
