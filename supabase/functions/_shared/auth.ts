import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

export type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string };

/** Validates the caller's Supabase JWT. Returns 401 when missing/invalid. */
export async function requireUser(req: Request): Promise<AuthResult> {
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
  const { data, error } = await supabase.auth.getClaims(token);
  const userId = data?.claims?.sub as string | undefined;
  if (error || !userId) return { ok: false, status: 401, error: "Invalid session." };
  return { ok: true, userId };
}

/** Validates the caller's JWT and that they have the `admin` role. */
export async function requireAdmin(req: Request): Promise<AuthResult> {
  const user = await requireUser(req);
  if (!user.ok) return user;
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) return { ok: false, status: 403, error: "Forbidden." };
  return user;
}
