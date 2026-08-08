import { protect } from "../_shared/guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const guard = await protect(req, "verify-captcha", 20, 60);
  if (guard) return guard;

  let token = "";
  try {
    const body = await req.json();
    token = typeof body?.token === "string" ? body.token : "";
  } catch {
    return json({ error: "Invalid body" }, 400);
  }
  if (!token || token.length > 5000) return json({ success: false, error: "missing-token" }, 400);

  const secret = Deno.env.get("RECAPTCHA_SECRET_KEY");
  if (!secret) {
    // Not configured yet — do not lock users out.
    return json({ success: true, skipped: true });
  }

  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = await res.json();
    return json({ success: !!data.success, errors: data["error-codes"] ?? [] }, data.success ? 200 : 400);
  } catch (e) {
    console.error("[verify-captcha] verification failed", e);
    return json({ success: false, error: "verification-failed" }, 502);
  }
});
