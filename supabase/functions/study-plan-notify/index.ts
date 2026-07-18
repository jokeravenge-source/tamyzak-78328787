import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

async function tgSend(chatId: number, text: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY")!;
  const res = await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TELEGRAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && (data as { ok?: boolean })?.ok, data, status: res.status };
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type Task = { title: string; start?: string; end?: string };
type Day = { day: string; tasks: Task[] };
type Plan = {
  subject?: string;
  goal?: string;
  weeks?: number;
  tools?: string[];
  days?: Day[];
};

function formatPlan(plan: Plan, language: "ar" | "en"): string {
  const isAr = language === "ar";
  const lines: string[] = [];
  lines.push(isAr ? "📚 <b>خطة دراستك من مرشد تميّزك</b>" : "📚 <b>Your Tamayzak study plan</b>");
  if (plan.subject) lines.push((isAr ? "المادة: " : "Subject: ") + esc(plan.subject));
  if (plan.goal) lines.push((isAr ? "🎯 الهدف: " : "🎯 Goal: ") + esc(plan.goal));
  if (plan.tools?.length) lines.push((isAr ? "🛠 الأدوات: " : "🛠 Tools: ") + plan.tools.map(esc).join(", "));
  lines.push("");
  for (const d of plan.days ?? []) {
    lines.push(`<b>${esc(d.day)}</b>`);
    for (const t of d.tasks ?? []) {
      const time = t.start && t.end ? ` (${esc(t.start)}–${esc(t.end)})` : "";
      lines.push(`• ${esc(t.title)}${time}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u?.user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: v } = await admin
      .from("telegram_verifications")
      .select("telegram_user_id, verified")
      .eq("user_id", u.user.id)
      .eq("verified", true)
      .not("telegram_user_id", "is", null)
      .maybeSingle();

    const chatId = (v as { telegram_user_id: number | null } | null)?.telegram_user_id ?? null;
    if (!chatId) return json({ error: "telegram_not_verified" }, 400);

    const body = await req.json().catch(() => ({}));
    const kind: "plan" | "reminder" = body.kind === "reminder" ? "reminder" : "plan";
    const language: "ar" | "en" = body.language === "en" ? "en" : "ar";

    let text = "";
    if (kind === "plan") {
      const plan = body.plan as Plan | undefined;
      if (!plan) return json({ error: "missing_plan" }, 400);
      text = formatPlan(plan, language);
    } else {
      const title = String(body.title ?? "").slice(0, 200);
      const message = String(body.message ?? "").slice(0, 1200);
      if (!title && !message) return json({ error: "empty_reminder" }, 400);
      text = [title ? `⏰ <b>${esc(title)}</b>` : "", message ? esc(message) : ""].filter(Boolean).join("\n\n");
    }

    const res = await tgSend(chatId, text);
    if (!res.ok) return json({ error: "telegram_failed", detail: res.data, status: res.status }, 502);
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});