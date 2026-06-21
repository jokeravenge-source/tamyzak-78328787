import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: row } = await admin
      .from("telegram_verifications")
      .select("telegram_user_id")
      .eq("user_id", u.user.id)
      .maybeSingle();

    if (!row?.telegram_user_id) {
      return new Response(JSON.stringify({ ok: false, linked: false, error: "Not linked yet" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verified = true;
    const missing: string[] = [];
    await admin
      .from("telegram_verifications")
      .update({
        verified,
        last_checked_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("user_id", u.user.id);

    return new Response(JSON.stringify({ ok: true, linked: true, verified, missing }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});