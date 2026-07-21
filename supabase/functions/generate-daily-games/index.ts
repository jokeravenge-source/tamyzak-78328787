// Owner-only endpoint that asks the AI to design 30 distinct 2D mini-games
// for the current Baghdad month. Each day 1..30 gets its own engine + spec
// derived from that day's rotating subject and the admin-uploaded Ch1
// flashcards (with a curated fallback). Results are upserted into the
// public.daily_games table which the client reads at runtime.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUBJECT_ROTATION = ["physics", "chemistry", "biology", "arabic", "english", "french", "islamic"] as const;
const ENGINES = ["falling", "match", "memory", "bubblePop", "laneSort", "pathDoors", "wordCannon", "revealGrid"] as const;

type Card = { question: string; answer: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return json({ error: "auth required" }, 401);
    }
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "not signed in" }, 401);
    const { data: roles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) return json({ error: "admin only" }, 403);

    const admin = createClient(url, service);

    const now = new Date();
    const shifted = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const monthKey = `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
    const daysInMonth = new Date(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 0).getDate();
    const dayCount = Math.min(30, daysInMonth);

    // Preload admin flashcards per subject for Ch1 so we send them to the AI.
    const cardsBySubject: Record<string, Card[]> = {};
    for (const s of SUBJECT_ROTATION) {
      const { data } = await admin
        .from("custom_flashcards")
        .select("question, answer")
        .eq("subject", s)
        .eq("approved", true)
        .in("chapter", ["1", "ch1", "Ch1", "chapter 1", "Chapter 1"])
        .limit(40);
      cardsBySubject[s] = data ?? [];
    }

    // Build a single prompt asking the model to design all 30 games at once.
    // We keep the JSON schema flat and constraint-free (per ai-sdk knowledge)
    // and clamp/validate the parsed result afterwards.
    const plan = Array.from({ length: dayCount }, (_, i) => {
      const day = i + 1;
      const subject = SUBJECT_ROTATION[(day - 1) % SUBJECT_ROTATION.length];
      return { day, subject, sampleFlashcards: cardsBySubject[subject].slice(0, 10) };
    });

    const systemPrompt = [
      "You are a 2D game designer for a bilingual (Arabic + English) study app for Iraqi 6th-grade (سادس علمي) students.",
      "Your job: for each requested day, design ONE distinct mini-game round using the day's subject and the provided Chapter 1 flashcards.",
      "The engines that already exist and can be selected:",
      `- ${ENGINES.join(", ")}`,
      "Engine reference:",
      "  falling      — choices fall from the top; tap the correct one before it hits the floor.",
      "  match        — 2D grid: match term tiles with their answer tiles under a timer.",
      "  memory       — flip tiles two at a time to pair term↔definition.",
      "  bubblePop    — bubbles carry answers; pop only the ones matching the current prompt.",
      "  laneSort     — drag flashcards into the correct labeled bin (e.g. metal / non-metal).",
      "  pathDoors    — walk a lane, pick the correct door each round.",
      "  wordCannon   — aim + shoot the correct term at a moving target.",
      "  revealGrid   — a hidden image is uncovered as the player answers correctly.",
      "Rules:",
      "1. Every day MUST feel different from adjacent days — vary engine and theme so day N ≠ day N-1 and day N ≠ day N+1.",
      "2. Themes must be subject-appropriate (physics = circuits, chemistry = beakers/atoms, biology = cells, arabic/islamic = calligraphy motifs, english/french = books).",
      "3. tutorial.en and tutorial.ar must be one short sentence each — clear, kid-friendly.",
      "4. title.en and title.ar are 2-4 word game names.",
      "5. count is 6..10, timerSec is 45..120 (or null when the engine doesn't use a timer), passThreshold is 0.5..0.75.",
      "6. theme.gradient is a Tailwind gradient body like 'from-sky-500/20 via-fuchsia-500/10 to-amber-500/10'.",
      "7. theme.accent is a Tailwind color name (sky, emerald, amber, rose, fuchsia, violet, cyan, orange, lime).",
      "8. theme.motif is a single emoji.",
      "Return STRICT JSON: { \"days\": [ { day, subject, engine, spec: { engine, title:{en,ar}, tutorial:{en,ar}, count, timerSec, passThreshold, theme:{gradient,accent,motif} } } ] }",
      "No markdown, no prose, no code fences.",
    ].join("\n");

    const userPrompt = JSON.stringify({ monthKey, plan }, null, 2);

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": lovableKey,
        "X-Lovable-AIG-SDK": "edge-function",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-pro-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const body = await aiRes.text();
      return json({ error: "AI gateway error", status: aiRes.status, details: body }, aiRes.status === 402 ? 402 : 500);
    }
    const aiJson = await aiRes.json();
    const content: string = aiJson?.choices?.[0]?.message?.content ?? "";
    const parsed = safeParse(content);
    if (!parsed || !Array.isArray(parsed.days)) {
      return json({ error: "AI returned unparseable JSON", raw: content.slice(0, 500) }, 502);
    }

    // Validate + clamp each entry, upsert into daily_games.
    const rows = parsed.days
      .map((d: any, idx: number) => sanitize(d, idx + 1, monthKey))
      .filter((r: any) => r != null);
    if (!rows.length) return json({ error: "no valid days generated" }, 502);

    const { error: upErr } = await admin.from("daily_games").upsert(rows, { onConflict: "day" });
    if (upErr) return json({ error: "db upsert failed", details: upErr.message }, 500);

    return json({ ok: true, month: monthKey, count: rows.length, rows });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeParse(s: string): any {
  try { return JSON.parse(s); } catch {}
  const m = s.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

function sanitize(d: any, expectedDay: number, monthKey: string) {
  if (!d || typeof d !== "object") return null;
  const day = clampInt(d.day, 1, 31, expectedDay);
  const subject = SUBJECT_ROTATION.includes(d.subject) ? d.subject : SUBJECT_ROTATION[(day - 1) % SUBJECT_ROTATION.length];
  const engine = ENGINES.includes(d.engine) ? d.engine : "falling";
  const spec = d.spec ?? {};
  const theme = spec.theme ?? {};
  const cleanSpec = {
    engine,
    title: {
      en: str(spec?.title?.en, 40) || "Daily Challenge",
      ar: str(spec?.title?.ar, 40) || "تحدي اليوم",
    },
    tutorial: {
      en: str(spec?.tutorial?.en, 200) || "Answer as many as you can.",
      ar: str(spec?.tutorial?.ar, 200) || "أجب على أكبر عدد ممكن.",
    },
    count: clampInt(spec.count, 4, 12, 8),
    timerSec: spec.timerSec == null ? null : clampInt(spec.timerSec, 20, 180, 75),
    passThreshold: clampNum(spec.passThreshold, 0.4, 0.9, 0.6),
    theme: {
      gradient: str(theme.gradient, 120) || "from-sky-500/20 via-fuchsia-500/10 to-amber-500/10",
      accent: str(theme.accent, 20) || "sky",
      motif: str(theme.motif, 4) || "✨",
    },
  };
  return { day, month_key: monthKey, subject, engine, spec: cleanSpec, updated_at: new Date().toISOString() };
}

function clampInt(v: unknown, lo: number, hi: number, def: number): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return def;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}
function clampNum(v: unknown, lo: number, hi: number, def: number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  if (!Number.isFinite(n)) return def;
  return Math.max(lo, Math.min(hi, n));
}
function str(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}