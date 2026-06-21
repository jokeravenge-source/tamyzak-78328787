import { claimFeature } from "../_shared/entitlement.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";
const MAX_CHAT_MESSAGES = 20;
const MAX_CONTINUATIONS = 4;

const SYSTEM_SCHEDULE_AR = `أنت "رفيق التميز" - مساعد ذكي لطالب ثانوي يساعده على تنظيم جدوله الدراسي الأسبوعي.

مهمتك:
1. اسأل الطالب بأسلوب ودود عن: المواد التي يريد دراستها هذا الأسبوع، عدد مرات كل مادة، الأيام المتاحة، وعدد المحاضرات أو الفصول لكل مادة.
2. بعد معرفة المواد، اسأله صراحةً: "هل لديك امتحان قريب في أي من هذه المواد؟" — وإذا كانت الإجابة نعم، اسأله عن المادة وموعد الامتحان وما الدرجة التي يطمح للحصول عليها (مثلاً 90/100). اجعل خطة هذه المادة أكثف وأقرب لمستوى الدرجة المستهدفة (درجة أعلى = جلسات أكثر ومراجعة وحل أسئلة وزارية). إذا قال لا، أكمل بخطة مراجعة عادية.
3. اطرح سؤالاً واحداً أو سؤالين في كل رسالة - لا تُغرقه بأسئلة كثيرة.
4. عندما تجمع كل التفاصيل، اقترح خطة أسبوعية واضحة موزعة على أيام الأسبوع، مع إعطاء أولوية للمواد التي لها امتحان وتكييف الكثافة حسب الدرجة المستهدفة.
5. عند اقتراح الخطة النهائية، اكتب الخطة بشكل واضح للطالب ثم أضف في نهاية الرسالة كتلة JSON بالشكل التالي بالضبط (مهم جداً):

\`\`\`json
{"tasks":[{"day":"السبت","text":"مراجعة الفصل الأول من الفيزياء"},{"day":"الأحد","text":"حل تمارين الكيمياء"}]}
\`\`\`

6. للمواد التي لها امتحان، اذكر الهدف داخل نص المهمة (مثال: "مراجعة الفيزياء — استهداف 95/100 للامتحان").
7. أيام الأسبوع المسموحة فقط: السبت، الأحد، الإثنين، الثلاثاء، الأربعاء، الخميس، الجمعة.
8. اسأل الطالب هل يوافق على الخطة قبل اعتمادها.
9. أجب دائماً بالعربية بأسلوب محفّز ومختصر.`;

const SYSTEM_SCHEDULE_EN = `You are "Excellence Companion" - an AI assistant helping a high-school student organize their weekly study schedule.

Your job:
1. Ask the student in a friendly tone about: the subjects they want to study this week, how many times each, which days they have available, and how many lectures/chapters per subject.
2. After you know the subjects, explicitly ask: "Do you have an upcoming exam in any of these subjects?" — If yes, ask which subject, the exam date, and the target grade they want to achieve (e.g. 90/100). Make that subject's plan denser and tuned to the target grade (higher target = more sessions, revision, and past-paper practice). If no, continue with a normal study plan.
3. Ask only one or two questions per message - don't overwhelm.
4. Once you have all the details, propose a clear weekly plan distributed across the days, prioritizing exam subjects and scaling intensity to the target grade.
5. When proposing the FINAL plan, write it clearly for the student, then append a JSON block at the END of the message with this exact format:

\`\`\`json
{"tasks":[{"day":"Saturday","text":"Review Physics chapter 1"},{"day":"Sunday","text":"Solve chemistry exercises"}]}
\`\`\`

6. For exam subjects, include the goal inside the task text (e.g. "Physics revision — target 95/100 for the exam").
7. Allowed days only: Saturday, Sunday, Monday, Tuesday, Wednesday, Thursday, Friday.
8. Ask the student to approve the plan before finalizing.
9. Be motivating, concise, and reply in English.`;

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
  const json200 = (obj: Record<string, unknown>) =>
    new Response(JSON.stringify(obj), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const { mode, messages, language } = await req.json();
    const ar = language === "ar";
    if (!mode || !Array.isArray(messages)) {
      return json200({ reply: ar ? "حدث خطأ في الطلب. حاول مرة أخرى." : "Bad request. Please try again." });
    }
    const ent = await claimFeature(req, "agent");
    if (!ent.ok) {
      // Always 200 so the client never sees "non-2xx" – pass upgrade flag in the body.
      return json200({ error: ent.error, upgrade: ent.status === 429, reply: ent.error });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const safeMessages = messages
      .filter((m: { role?: string; content?: unknown }) =>
        m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
      )
      .slice(-MAX_CHAT_MESSAGES);

    const convo: Array<{ role: string; content: string }> = [
      { role: "system", content: systemFor(mode, language) },
      ...safeMessages,
    ];
    let fullReply = "";
    let finishReason = "stop";

    // Fetch the AI gateway with a per-attempt timeout and one retry on transient failures.
    const callAi = async (): Promise<Response> => {
      const attempt = async () => {
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 55_000);
        try {
          return await fetch(AI_URL, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: AI_MODEL, messages: convo, max_tokens: 8192 }),
            signal: ctrl.signal,
          });
        } finally {
          clearTimeout(to);
        }
      };
      try {
        const r = await attempt();
        if (r.status >= 500 || r.status === 408) {
          // transient – retry once after a short backoff
          await new Promise((res) => setTimeout(res, 800));
          return await attempt();
        }
        return r;
      } catch {
        await new Promise((res) => setTimeout(res, 800));
        return await attempt();
      }
    };

    for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
      let resp: Response;
      try {
        resp = await callAi();
      } catch (err) {
        console.error("[companion] ai fetch failed", err);
        return json200({
          reply: fullReply || (ar ? "تعذّر الاتصال بالخدمة. حاول مرة أخرى." : "Could not reach the service. Please try again."),
          temporary: true,
        });
      }

      if (!resp.ok) {
        if (resp.status === 429) {
          return json200({
            reply: (fullReply || "") + (ar ? "\n\nالطلبات كثيرة الآن. حاول بعد قليل." : "\n\nToo many requests, try again shortly."),
            temporary: true,
          });
        }
        if (resp.status === 402) {
          return json200({
            reply: (fullReply || "") + (ar ? "\n\nميزة الذكاء غير متاحة حالياً." : "\n\nAI temporarily unavailable."),
            temporary: true,
          });
        }
        if (fullReply) return json200({ reply: fullReply });
        const t = await resp.text().catch(() => "");
        console.error("[companion] ai non-ok", resp.status, t.slice(0, 500));
        return json200({
          reply: ar ? "تعذر الرد الآن. حاول مرة أخرى." : "Couldn't respond right now. Please try again.",
          temporary: true,
        });
      }

      let data: any;
      try {
        data = await resp.json();
      } catch {
        if (fullReply) return json200({ reply: fullReply });
        return json200({
          reply: ar ? "تعذر قراءة الرد. حاول مرة أخرى." : "Could not parse the response. Please try again.",
          temporary: true,
        });
      }
      const chunk = data.choices?.[0]?.message?.content ?? "";
      finishReason = data.choices?.[0]?.finish_reason ?? "stop";
      fullReply += chunk;

      if (finishReason !== "length") break;

      // Continue the response seamlessly
      convo.push({ role: "assistant", content: chunk });
      convo.push({ role: "user", content: ar ? "تابع من حيث توقفت بدون تكرار." : "Continue from where you stopped without repeating." });
    }

    if (!fullReply) fullReply = ar ? "تعذر الرد الآن." : "Couldn't respond right now.";

    return json200({ reply: fullReply });
  } catch (e) {
    console.error("[companion] fatal", e);
    return new Response(
      JSON.stringify({ reply: "Couldn't respond right now. Please try again.", error: String(e) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  }
});