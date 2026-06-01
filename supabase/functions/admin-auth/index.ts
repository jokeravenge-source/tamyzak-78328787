const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Server-side ONLY. Never expose this map to the client.
const ADMIN_CREDENTIALS: Record<string, string> = {
  "majs11@gmail.com": "majs11",
  "hareer-herself@gmail.com": "Adminhareer123",
  "mustafa@gmail.com": "adminmustafa123",
  "abdallah6dhs@gmail.com": "adminabdallah123",
  "haneenherself@gmail.com": "adminhaneen123",
  "kszolg0-dwldbx-txxeyzasmamohammed848@gmail.com": "Asmamohammed20102010",
  "neneworkfordhs@gamil.com": "nene0work0for0DHS",
  "sx97623@gmail.com": "adminmustafa123",
  "asmamohammed848@gmail.com": "Asmamohammed20102010",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const body = await req.json().catch(() => ({}));
    const rawEmail = typeof body?.email === "string" ? body.email : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const email = rawEmail.trim().toLowerCase();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "invalid_credentials" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expected = ADMIN_CREDENTIALS[email];
    // Constant-time-ish: always do a comparison even if email unknown
    const isMatch = !!expected && expected === password;
    if (!isMatch) {
      // Small artificial delay to slow brute force
      await new Promise((r) => setTimeout(r, 400));
      return new Response(JSON.stringify({ error: "invalid_credentials" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure auth user exists and password is set correctly (idempotent)
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, email_confirm: true }),
    });
    const createData = await createRes.json().catch(() => ({}));
    let userId: string | null = createData?.id ?? null;

    if (!userId) {
      // User likely exists — look it up and force password
      let page = 1;
      while (!userId && page <= 50) {
        const listRes = await fetch(
          `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=1000`,
          { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } },
        );
        const listData = await listRes.json();
        const users: any[] = listData?.users ?? [];
        if (users.length === 0) break;
        const found = users.find((u: any) => u.email?.toLowerCase() === email);
        if (found) { userId = found.id; break; }
        page += 1;
      }
      if (userId) {
        await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
          method: "PUT",
          headers: {
            apikey: SERVICE_ROLE,
            Authorization: `Bearer ${SERVICE_ROLE}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password, email_confirm: true }),
        });
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "provision_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure admin role
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

    return new Response(JSON.stringify({ ok: true, email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});