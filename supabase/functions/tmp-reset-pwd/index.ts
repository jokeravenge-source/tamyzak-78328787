// TEMPORARY one-off admin utility. Deleted immediately after use.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TARGET_EMAIL = "samaraa505r@gmail.com";
const NEW_PASSWORD = "samaraa123";

Deno.serve(async () => {
  const h = { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` };
  let userId: string | null = null;
  for (let page = 1; page <= 50 && !userId; page++) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=1000`, { headers: h });
    const d = await r.json();
    const users: any[] = d?.users ?? [];
    if (!users.length) break;
    const f = users.find((u) => u.email?.toLowerCase() === TARGET_EMAIL);
    if (f) userId = f.id;
  }
  if (!userId) return new Response(JSON.stringify({ ok: false, error: "user_not_found" }), { status: 404 });
  const up = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: { ...h, "Content-Type": "application/json" },
    body: JSON.stringify({ password: NEW_PASSWORD }),
  });
  const txt = await up.text();
  return new Response(JSON.stringify({ ok: up.ok, status: up.status, body: txt }), { headers: { "Content-Type": "application/json" } });
});
