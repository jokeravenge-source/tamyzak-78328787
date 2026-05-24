import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";
const CHANNELS = ["@HD_PHYS", "@a6th_DHS", "@sad6ths"];

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

async function checkAllChannels(tgUserId: number): Promise<{ ok: boolean; missing: string[]; error?: string }> {
  const missing: string[] = [];
  for (const ch of CHANNELS) {
    const r = await tg("getChatMember", { chat_id: ch, user_id: tgUserId });
    if (!r.ok) {
      return { ok: false, missing, error: `Could not check ${ch}: ${JSON.stringify(r.data)}` };
    }
    const status = r.data?.result?.status;
    if (!status || status === "left" || status === "kicked") {
      missing.push(ch);
    }
  }
  return { ok: missing.length === 0, missing };
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
      text: "👋 Please open the app and tap 'Verify with Telegram' first to get your personal link.",
    });
    return new Response(JSON.stringify({ ok: true }));
  }

  const check = await checkAllChannels(fromId);
  await supabase
    .from("telegram_verifications")
    .update({
      telegram_user_id: fromId,
      telegram_username: username,
      verified: check.ok,
      last_checked_at: new Date().toISOString(),
      last_error: check.error ?? null,
    })
    .eq("user_id", row.user_id);

  if (check.ok) {
    await tg("sendMessage", {
      chat_id: chatId,
      text: "✅ Verified! You're subscribed to all required channels. You can return to the app now.",
    });
  } else if (check.error) {
    await tg("sendMessage", {
      chat_id: chatId,
      text: "⚠️ Something went wrong while checking your subscriptions. Please try again later.",
    });
  } else {
    await tg("sendMessage", {
      chat_id: chatId,
      text: `❌ You're not yet subscribed to:\n${check.missing.join("\n")}\n\nJoin them, then send /start again here to re-check.`,
    });
  }

  return new Response(JSON.stringify({ ok: true }));
});