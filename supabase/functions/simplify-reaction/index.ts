import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = await requireUser(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { equation, label, language } = await req.json();
    if (!equation || typeof equation !== "string") {
      return new Response(JSON.stringify({ error: "Missing equation" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const lang = language === "ar" ? "ar" : "en";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const system = lang === "ar"
      ? `أنت معلّم كيمياء عضوية بارع في صناعة طرق حفظ سهلة للطلاب. أعطِ الطالب طريقة تذكّر للتفاعل المُعطى.
أعد JSON صالحًا فقط بهذا الشكل:
{
  "phrase": "جملة قصيرة جدًا وجذابة بالعربية تساعد على حفظ التفاعل (مثل قافية أو شعار)",
  "mnemonic": "عبارة/حروف أولى أو قصة قصيرة جدًا لربط المتفاعلات بالنواتج",
  "steps": ["خطوة 1 مختصرة", "خطوة 2", "خطوة 3"],
  "trick": "نصيحة ذكية أو حيلة للتمييز بين هذا التفاعل وما يشبهه"
}
بدون أي شرح خارج JSON.`
      : `You are an organic chemistry tutor who makes memorable mnemonics. Help the student remember the given reaction.
Return ONLY valid JSON of this shape:
{
  "phrase": "A very short catchy phrase or rhyme to remember the reaction",
  "mnemonic": "An acronym/first-letter trick or a tiny story linking reactants to products",
  "steps": ["Step 1 short", "Step 2", "Step 3"],
  "trick": "A smart tip to distinguish this reaction from similar-looking ones"
}
No prose outside the JSON.`;

    const user = `Reaction: ${equation}\n${label ? `Context: ${label}` : ""}`;

    const res = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ error: `AI error: ${errText}` }), { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { phrase: String(raw).slice(0, 400) }; }

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});