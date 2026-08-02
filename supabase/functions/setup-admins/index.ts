import { protect } from "../_shared/guard.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Admins are loaded from the ADMIN_CREDENTIALS_JSON secret.
// Never hardcode credentials in source. Rotate by updating the secret.
function loadAdmins(): Array<{ email: string; password: string }> {
  const raw = Deno.env.get("ADMIN_CREDENTIALS_JSON") ?? "";
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const out: Array<{ email: string; password: string }> = [];
      for (const [email, password] of Object.entries(parsed)) {
        if (typeof password === "string") out.push({ email, password });
      }
      return out;
    }
  } catch (_e) { /* ignore */ }
  return [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const guard = await protect(req, "setup-admins", { max: 3, windowSeconds: 60, maxBytes: 25 * 1024 * 1024 });
  if (!guard.ok) return new Response(JSON.stringify({ error: guard.error }), { status: guard.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    // Auth guard: require a shared-secret token in the X-Setup-Token header.
    // Without this, anyone could re-provision admin accounts.
    const expected = Deno.env.get("SETUP_ADMINS_TOKEN") ?? "";
    const provided = req.headers.get("x-setup-token") ?? "";
    if (!expected || provided !== expected) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const results: any[] = [];
    const ADMINS = loadAdmins();
    for (const a of ADMINS) {
      // Create user (idempotent: ignore "already registered" errors)
      const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          apikey: SERVICE_ROLE,
          Authorization: `Bearer ${SERVICE_ROLE}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: a.email,
          password: a.password,
          email_confirm: true,
        }),
      });
      const createData = await createRes.json();
      let userId: string | null = createData?.id ?? null;
      const createError = !userId ? createData : null;

      if (!userId) {
        // Look up existing user by paginating through admin/users
        const target = a.email.toLowerCase();
        let page = 1;
        while (!userId && page <= 50) {
          const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=1000`, {
            headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
          });
          const listData = await listRes.json();
          const users: any[] = listData?.users ?? [];
          if (users.length === 0) break;
          const found = users.find((u: any) => u.email?.toLowerCase() === target);
          if (found) {
            userId = found.id;
            break;
          }
          page += 1;
        }

        // Ensure password is set to the requested value
        if (userId) {
          await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
            method: "PUT",
            headers: {
              apikey: SERVICE_ROLE,
              Authorization: `Bearer ${SERVICE_ROLE}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ password: a.password, email_confirm: true }),
          });
        }
      }

      if (userId) {
        // Insert admin role via PostgREST with service role
        await fetch(`${SUPABASE_URL}/rest/v1/user_roles`, {
          method: "POST",
          headers: {
            apikey: SERVICE_ROLE,
            Authorization: `Bearer ${SERVICE_ROLE}`,
            "Content-Type": "application/json",
            Prefer: "resolution=ignore-duplicates",
          },
          body: JSON.stringify({ user_id: userId, role: "admin" }),
        });
      }
      results.push({ email: a.email, userId, created: !!createData?.id });
    }
    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
