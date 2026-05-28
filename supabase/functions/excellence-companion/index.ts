import { claimFeature } from "../_shared/entitlement.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";
const MAX_CHAT_MESSAGES = 20;

const SYSTEM_SCHEDULE_AR = `أنت "رفيق التميز" - مساعد ذكي لطالب ثانوي يساعده على تنظيم جدوله الدراسي الأسبوعي.

مهمتك:
1. اسأل الطالب بأسلوب ودود عن: المواد التي يريد دراستها هذا الأسبوع، عدد مرات كل مادة، الأيام المتاحة، وعدد المحاضرات أو الفصول لكل مادة.
2. اطرح سؤالاً واحداً أو سؤالين في كل رسالة - لا تُغرقه بأسئلة كثيرة.
3. عندما تجمع كل التفاصيل، اقترح خطة أسبوعية واضحة موزعة على أيام الأسبوع.
4. عند اقتراح الخطة النهائية، اكتب الخطة بشكل واضح للطالب ثم أضف في نهاية الرسالة كتلة JSON بالشكل التالي بالضبط (مهم جداً):

\`\`\`json
{"tasks":[{"day":"السبت","text":"مراجعة الفصل الأول من الفيزياء"},{"day":"الأحد","text":"حل تمارين الكيمياء"}]}
\`\`\`

5. أيام الأسبوع المسموحة فقط: السبت، الأحد، الإثنين، الثلاثاء، الأربعاء، الخميس، الجمعة.
6. اسأل الطالب هل يوافق على الخطة قبل اعتمادها.
7. أجب دائماً بالعربية بأسلوب محفّز ومختصر.`;

const SYSTEM_SCHEDULE_EN = `You are "Excellence Companion" - an AI assistant helping a high-school student organize their weekly study schedule.

Your job:
1. Ask the student in a friendly tone about: the subjects they want to study this week, how many times each, which days they have available, and how many lectures/chapters per subject.
2. Ask only one or two questions per message - don't overwhelm.
3. Once you have all the details, propose a clear weekly plan distributed across the days.
4. When proposing the FINAL plan, write it clearly for the student, then append a JSON block at the END of the message with this exact format:

\`\`\`json
{"tasks":[{"day":"Saturday","text":"Review Physics chapter 1"},{"day":"Sunday","text":"Solve chemistry exercises"}]}
\`\`\`

5. Allowed days only: Saturday, Sunday, Monday, Tuesday, Wednesday, Thursday, Friday.
6. Ask the student to approve the plan before finalizing.
7. Be motivating, concise, and reply in English.`;

const SYSTEM_PROBLEM_AR = `أنت "رفيق التميز" - مساعد ذكي ومتعاطف يساعد طالباً ثانوياً على حل مشكلة شخصية أو دراسية.

مهمتك:
1. اطلب من الطالب وصف مشكلته، ثم اطرح أسئلة مدروسة لفهم السياق (متى بدأت؟ ما الذي جربه؟ ما الذي يشعر به؟). سؤال أو سؤالين في كل رسالة فقط.
2. عندما تفهم المشكلة جيداً، اقترح خطة عملية مقسّمة إلى خطوات يومية صغيرة وقابلة للتنفيذ خلال الأسبوع.
3. عند اقتراح الخطة النهائية، اكتبها للطالب ثم أضف في نهاية الرسالة كتلة JSON بهذا الشكل بالضبط:

\`\`\`json
{"tasks":[{"day":"السبت","text":"خطوة عملية صغيرة"},{"day":"الإثنين","text":"خطوة أخرى"}]}
\`\`\`

4. أيام الأسبوع المسموحة فقط: السبت، الأحد، الإثنين، الثلاثاء، الأربعاء، الخميس، الجمعة.
5. اسأل الطالب هل يوافق على الخطة قبل اعتمادها.
6. كن متعاطفاً وداعماً وأجب دائماً بالعربية.`;

const SYSTEM_PROBLEM_EN = `You are "Excellence Companion" - a kind, empathetic AI helping a high-school student solve a personal or academic problem.

Your job:
1. Ask the student to describe the problem, then ask thoughtful follow-up questions (when did it start? what have they tried? how do they feel?). Only one or two questions per message.
2. Once you understand the problem well, propose a concrete plan broken into small daily steps the student can complete this week.
3. When proposing the FINAL plan, write it clearly, then append a JSON block at the END with this exact format:

\`\`\`json
{"tasks":[{"day":"Saturday","text":"A small concrete step"},{"day":"Monday","text":"Another step"}]}
\`\`\`

4. Allowed days only: Saturday, Sunday, Monday, Tuesday, Wednesday, Thursday, Friday.
5. Ask the student to approve the plan before finalizing.
6. Be warm, supportive, and reply in English.`;

function systemFor(mode: string, language: string): string {
  const ar = language === "ar";
  if (mode === "schedule") return ar ? SYSTEM_SCHEDULE_AR : SYSTEM_SCHEDULE_EN;
  return ar ? SYSTEM_PROBLEM_AR : SYSTEM_PROBLEM_EN;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { mode, messages, language } = await req.json();
    if (!mode || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "mode and messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ent = await claimFeature(req, "agent");
    if (!ent.ok) {
      return new Response(JSON.stringify({ error: ent.error, upgrade: ent.status === 429 }), {
        status: ent.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const safeMessages = messages
      .filter((m: { role?: string; content?: unknown }) =>
        m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
      )
      .slice(-MAX_CHAT_MESSAGES);

    const resp = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [{ role: "system", content: systemFor(mode, language) }, ...safeMessages],
      }),
    });

    const ar = language === "ar";
    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ reply: ar ? "الطلبات كثيرة الآن. حاول بعد قليل." : "Too many requests, try again shortly.", temporary: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ reply: ar ? "ميزة الذكاء غير متاحة حالياً." : "AI temporarily unavailable.", temporary: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await resp.text();
      return new Response(JSON.stringify({ error: t }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const reply = data.choices?.[0]?.message?.content ?? (ar ? "تعذر الرد الآن." : "Couldn't respond right now.");
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});