import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { BANK_ROWS } from "./data.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-seed-token",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Authorize: either the internal seed token, or a signed-in admin.
  const seedToken = Deno.env.get("BANK_SEED_TOKEN");
  const provided = req.headers.get("x-seed-token");
  let authorized = Boolean(seedToken && provided && provided === seedToken);

  if (!authorized) {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) return json({ error: "Unauthorized" }, 401);
    const { data: claims } = await admin.auth.getClaims(token);
    const uid = claims?.claims?.sub as string | undefined;
    if (!uid) return json({ error: "Unauthorized" }, 401);
    const { data: role } = await admin
      .from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Forbidden" }, 403);
    authorized = true;
  }

  try {
    const { count: existing } = await admin
      .from("bank_text_questions")
      .select("id", { count: "exact", head: true })
      .eq("source", "ministerial");
    if ((existing ?? 0) > 0) {
      return json({ ok: true, skipped: true, existing });
    }

    let inserted = 0;
    const size = 200;
    for (let i = 0; i < BANK_ROWS.length; i += size) {
      const batch = BANK_ROWS.slice(i, i + size);
      const { error } = await admin.from("bank_text_questions").insert(batch);
      if (error) return json({ error: error.message, inserted }, 500);
      inserted += batch.length;
    }
    return json({ ok: true, inserted });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});