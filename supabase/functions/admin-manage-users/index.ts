const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

async function getCallerUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON, Authorization: authHeader },
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.id ?? null;
}

async function isAdmin(userId: string): Promise<boolean> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${userId}&role=eq.admin&select=role`,
    { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } },
  );
  if (!res.ok) return false;
  const arr = await res.json().catch(() => []);
  return Array.isArray(arr) && arr.length > 0;
}

async function getAuthUser(userId: string) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
  });
  if (!r.ok) return null;
  return await r.json().catch(() => null);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const callerId = await getCallerUserId(req.headers.get("Authorization"));
    if (!callerId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!(await isAdmin(callerId))) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");

    if (action === "search") {
      const q = String(body?.q || "").trim();
      if (!q) {
        return new Response(JSON.stringify({ users: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Search profiles by display_name (case-insensitive)
      const url = `${SUPABASE_URL}/rest/v1/profiles?display_name=ilike.%25${encodeURIComponent(q)}%25&select=user_id,display_name&limit=25`;
      const r = await fetch(url, {
        headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
      });
      const profiles: { user_id: string; display_name: string }[] = await r.json().catch(() => []);

      // Enrich with email + banned status
      const users = await Promise.all(
        (profiles ?? []).map(async (p) => {
          const u = await getAuthUser(p.user_id);
          const banned_until = u?.banned_until ?? null;
          const isBanned = !!banned_until && new Date(banned_until).getTime() > Date.now();
          return {
            user_id: p.user_id,
            display_name: p.display_name,
            email: u?.email ?? null,
            banned: isBanned,
            banned_until,
          };
        }),
      );
      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "ban" || action === "unban") {
      const targetId = String(body?.user_id || "");
      if (!targetId) {
        return new Response(JSON.stringify({ error: "missing user_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (targetId === callerId) {
        return new Response(JSON.stringify({ error: "cannot_ban_self" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Block banning other admins
      if (await isAdmin(targetId)) {
        return new Response(JSON.stringify({ error: "cannot_ban_admin" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const ban_duration = action === "ban" ? "876000h" : "none";
      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${targetId}`, {
        method: "PUT",
        headers: {
          apikey: SERVICE_ROLE,
          Authorization: `Bearer ${SERVICE_ROLE}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ban_duration }),
      });
      if (!r.ok) {
        const txt = await r.text();
        return new Response(JSON.stringify({ error: txt }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_sessions") {
      const targetId = String(body?.user_id || "");
      if (!targetId) {
        return new Response(JSON.stringify({ error: "missing user_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const url = `${SUPABASE_URL}/rest/v1/study_sessions?user_id=eq.${targetId}&select=id,subject,mission,duration_seconds,points,mission_completed,created_at&order=created_at.desc&limit=200`;
      const r = await fetch(url, {
        headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
      });
      const sessions = await r.json().catch(() => []);
      return new Response(JSON.stringify({ sessions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_session") {
      const sessionId = String(body?.session_id || "");
      if (!sessionId) {
        return new Response(JSON.stringify({ error: "missing session_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Delete awarded points first (source=session, ref_id=session uuid)
      await fetch(
        `${SUPABASE_URL}/rest/v1/user_points?source=eq.session&ref_id=eq.${sessionId}`,
        { method: "DELETE", headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } },
      );
      const r = await fetch(`${SUPABASE_URL}/rest/v1/study_sessions?id=eq.${sessionId}`, {
        method: "DELETE",
        headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
      });
      if (!r.ok) {
        const txt = await r.text();
        return new Response(JSON.stringify({ error: txt }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown_action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});