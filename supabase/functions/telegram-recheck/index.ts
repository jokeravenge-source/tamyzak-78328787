import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";
const CHANNELS = ["@a6th_DHS", "@sad6ths", "@sadsworld"];

async function tg(method: string, body: unknown) {
  const res = await fetch(`${GATEWAY_URL}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      "X-Connection-Api-Key": Deno.env.get("TELEGRAM_API_KEY")!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok && data.ok, data };
}

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

    const missing: string[] = [];
    for (const ch of CHANNELS) {
      const r = await tg("getChatMember", { chat_id: ch, user_id: row.telegram_user_id });
      const status = r.data?.result?.status;
      if (!r.ok) {
        return new Response(JSON.stringify({ ok: false, linked: true, error: `Could not check ${ch}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!status || status === "left" || status === "kicked") missing.push(ch);
    }

    const verified = missing.length === 0;
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