import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

export type GuardResult = { ok: true } | { ok: false; status: number; error: string };

/** Best-effort caller identity: authenticated user id, else client IP. */
export function callerKey(req: Request): string {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload?.sub) return `u:${payload.sub}`;
    } catch (_e) { /* fall through to IP */ }
  }
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown";
  return `ip:${ip}`;
}

/**
 * Flood protection that also covers unauthenticated callers (per IP).
 * Fails open only on infrastructure errors so a DB hiccup never blocks the app.
 */
export async function guardRequest(
  req: Request,
  feature: string,
  maxRequests = 10,
  windowSeconds = 60,
): Promise<GuardResult> {
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: allowed, error } = await admin.rpc("check_edge_rate_limit", {
      _key: callerKey(req),
      _feature: feature,
      _max_requests: maxRequests,
      _window_seconds: windowSeconds,
    });
    if (error) return { ok: true };
    if (!allowed) {
      return {
        ok: false,
        status: 429,
        error: "Too many requests. Please slow down and try again in a minute.",
      };
    }
    return { ok: true };
  } catch (_e) {
    return { ok: true };
  }
}

/** Rejects oversized payloads before they are parsed (memory-exhaustion protection). */
export function checkBodySize(req: Request, maxBytes = 8 * 1024 * 1024): GuardResult {
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > maxBytes) {
    return { ok: false, status: 413, error: "Request payload is too large." };
  }
  return { ok: true };
}

/** Combined flood + payload guard. */
export async function protect(
  req: Request,
  feature: string,
  opts: { max?: number; windowSeconds?: number; maxBytes?: number } = {},
): Promise<GuardResult> {
  const size = checkBodySize(req, opts.maxBytes);
  if (!size.ok) return size;
  return await guardRequest(req, feature, opts.max ?? 10, opts.windowSeconds ?? 60);
}
