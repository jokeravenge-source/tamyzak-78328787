const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMINS = [
  { email: "mustafa@gmail.com", password: "adminmustafa123" },
  { email: "abdallah6dhs@gmail.com", password: "adminabdallah123" },
  { email: "haneenherself@gmail.com", password: "adminhaneen123" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const results: any[] = [];
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

      if (!userId) {
        // Look up existing user
        const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(a.email)}`, {
          headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
        });
        const listData = await listRes.json();
        const found = listData?.users?.find((u: any) => u.email?.toLowerCase() === a.email.toLowerCase());
        userId = found?.id ?? null;

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