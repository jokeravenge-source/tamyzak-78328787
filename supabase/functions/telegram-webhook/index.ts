import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

async function deriveSecret(apiKey: string): Promise<string> {
  const data = new TextEncoder().encode(`telegram-webhook:${apiKey}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function safeEqual(a: string | null, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const SITE_URL = "https://tamyazak.site/?src=telegram";
const WELCOME_TEXT =
  "👋 <b>أهلاً بك في تميّزك!</b>\n\n" +
  "تم فتح البوت بنجاح ✅\n" +
  "الآن انتقل إلى الموقع وأكمل تسجيل الدخول لربط حسابك واستلام التذكيرات:\n" +
  `${SITE_URL}`;
const WELCOME_KEYBOARD = {
  inline_keyboard: [[{ text: "🌐 افتح الموقع وأكمل التسجيل", url: SITE_URL }]],
};

async function tg(method: string, body: unknown) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY")!;
  const res = await fetch(`${GATEWAY_URL}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TELEGRAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok && data.ok, data, status: res.status };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
  if (!TELEGRAM_API_KEY) return new Response("TELEGRAM_API_KEY missing", { status: 500 });

  const expected = await deriveSecret(TELEGRAM_API_KEY);
  const actual = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (!safeEqual(actual, expected)) return new Response("Unauthorized", { status: 401 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const update = await req.json().catch(() => null);
  const message = update?.message ?? update?.edited_message;
  const chatId = message?.chat?.id;
  const fromId = message?.from?.id;
  const username = message?.from?.username ?? null;
  const text: string = message?.text ?? "";

  if (!chatId || !fromId) return new Response(JSON.stringify({ ok: true }));

  let token: string | null = null;
  if (text.startsWith("/start")) {
    const parts = text.split(/\s+/);
    token = parts[1] ?? null;
  }

  // Find the verification row. Prefer match by token (new link); fall back to telegram_user_id (re-check).
  let row: { user_id: string; token: string } | null = null;
  if (token) {
    const { data } = await supabase
      .from("telegram_verifications")
      .select("user_id, token")
      .eq("token", token)
      .maybeSingle();
    row = data ?? null;
  }
  if (!row) {
    const { data } = await supabase
      .from("telegram_verifications")
      .select("user_id, token")
      .eq("telegram_user_id", fromId)
      .maybeSingle();
    row = data ?? null;
  }

  if (!row) {
    await tg("sendMessage", {
      chat_id: chatId,
      text: WELCOME_TEXT,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: WELCOME_KEYBOARD,
    });
    return new Response(JSON.stringify({ ok: true }));
  }

  await supabase
    .from("telegram_verifications")
    .update({
      telegram_user_id: fromId,
      telegram_username: username,
      last_checked_at: new Date().toISOString(),
      last_error: null,
      verified: true,
    })
    .eq("user_id", row.user_id);

  await tg("sendMessage", {
    chat_id: chatId,
    text: "✅ <b>تم الربط بنجاح!</b>\n\nارجع الآن إلى الموقع وأكمل تسجيل الدخول لتصلك تذكيرات الامتحانات والمهام.",
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: WELCOME_KEYBOARD,
  });

  return new Response(JSON.stringify({ ok: true }));
});