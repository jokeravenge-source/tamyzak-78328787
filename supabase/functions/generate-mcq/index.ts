import { protect } from "../_shared/guard.ts";
import { requireUser } from "../_shared/auth.ts";
import { generateText, Output } from "npm:ai";
import { z } from "npm:zod";
import { createLovableAiGatewayProvider } from "../_shared/ai-gateway.ts";
import { claimFeature } from "../_shared/entitlement.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_STUDY_CHARS = 180_000;
const MAX_PAGE_IMAGES = 20;
const QUESTIONS_PER_BATCH = 15;
const MODEL = "google/gemini-3.5-flash";

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const questionSchema = z.object({
  question: z.string(),
  choices: z.array(z.string()),
  answer_index: z.number(),
  hint: z.string(),
  explanation: z.string(),
});

const cleanExtractedText = (value: unknown) => {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_STUDY_CHARS);
};

const shuffleChoices = (question: z.infer<typeof questionSchema>) => {
  const correct = question.choices[question.answer_index];
  const choices = [...question.choices];
  for (let index = choices.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [choices[index], choices[target]] = [choices[target], choices[index]];
  }
  return { ...question, choices, answer_index: choices.indexOf(correct) };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const guard = await protect(req, "generate-mcq", { max: 3, windowSeconds: 60, maxBytes: 25 * 1024 * 1024 });
  if (!guard.ok) return new Response(JSON.stringify({ error: guard.error }), { status: guard.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const auth = await requireUser(req);
  if (!auth.ok) return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const body = await req.json();
    const language = body.language === "ar" ? "Arabic" : "English";
    const content = cleanExtractedText(body.text);
    const pageImages = Array.isArray(body.pageImages)
      ? body.pageImages
          .filter((image: unknown) => typeof image === "string" && image.startsWith("data:image/"))
          .slice(0, MAX_PAGE_IMAGES)
      : [];
    const pdfData = typeof body.fileData === "string" && body.fileData.startsWith("data:application/pdf;base64,")
      ? body.fileData
      : "";

    if (!content && pageImages.length === 0 && !pdfData) return json({ error: "Missing study material" }, 400);

    const limited = await enforceRateLimit(req, "mcq", 3, 60);
    if (!limited.ok) return json({ error: limited.error }, limited.status);

    const entitlement = await claimFeature(req, "mcq");
    if (!entitlement.ok) return json({ error: entitlement.error, upgrade: entitlement.status === 429 }, entitlement.status);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI service is not configured" }, 500);

    const requestedCount = Math.max(1, Math.min(100, Number(body.count) || 10));
    const batchSizes: number[] = [];
    let remaining = requestedCount;
    while (remaining > 0) {
      const batchSize = Math.min(QUESTIONS_PER_BATCH, remaining);
      batchSizes.push(batchSize);
      remaining -= batchSize;
    }

    const sourceParts: Array<Record<string, unknown>> = [{
      type: "text",
      text: content
        ? `EXTRACTED SOURCE TEXT:\n${content}`
        : "No reliable selectable text was extracted. Read the attached source directly.",
    }];

    if (pdfData) {
      sourceParts.push({
        type: "file",
        data: pdfData,
        mediaType: "application/pdf",
        filename: typeof body.fileName === "string" ? body.fileName.slice(0, 200) : "study-material.pdf",
      });
    } else {
      for (const image of pageImages) sourceParts.push({ type: "image", image });
    }

    const gateway = createLovableAiGatewayProvider(apiKey);
    const system = `You create rigorous scientific MCQs in ${language}. The attached material is your ONLY source of truth.

SOURCE RULES:
- Every question, correct answer, distractor, hint, and explanation must be directly supported by the source.
- Use only scientific or academic content explicitly present in the source: definitions, mechanisms, formulas, reactions, processes, diagrams, tables, values, classifications, and stated cause-and-effect relationships.
- Never use outside knowledge, general trivia, document metadata, page numbers, titles, author names, or questions about what the document discusses.
- Keep terminology and difficulty faithful to the source. Distractors must be plausible and belong to the same scientific topic.
- If a source section is unreadable, ignore it rather than inventing information.
- Write all question content only in ${language}.`;

    const outputs = await Promise.all(batchSizes.map(async (batchSize, batchIndex) => {
      const { output } = await generateText({
        model: gateway(MODEL),
        system,
        messages: [{
          role: "user",
          content: [
            ...sourceParts,
            {
              type: "text",
              text: `Generate ${batchSize} distinct MCQs. This is batch ${batchIndex + 1} of ${batchSizes.length}; vary the covered source concepts. Each question needs exactly four choices, one answer index from 0 to 3, a non-revealing hint, and a source-grounded explanation.`,
            },
          ],
        }],
        output: Output.object({ schema: z.object({ questions: z.array(questionSchema) }) }),
      });
      return output.questions;
    }));

    const questions = outputs
      .flat()
      .filter((question) =>
        question.question.trim().length > 0
        && question.choices.length === 4
        && Number.isInteger(question.answer_index)
        && question.answer_index >= 0
        && question.answer_index <= 3
        && question.explanation.trim().length > 0
      )
      .slice(0, requestedCount)
      .map(shuffleChoices);
    if (questions.length === 0) return json({ error: "No readable scientific content was found in the file." }, 422);
    return json({ questions });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("generate-mcq failed", message);
    if (/429|rate.?limit/i.test(message)) return json({ error: "The AI service is busy. Please retry shortly." }, 429);
    if (/402|credit/i.test(message)) return json({ error: "AI credits are exhausted. Add credits in Settings → Plans & credits." }, 402);
    if (/timeout|timed out|abort/i.test(message)) return json({ error: "The file took too long to process. Try fewer questions or a smaller PDF." }, 504);
    return json({ error: `MCQ generation failed: ${message}` }, 500);
  }
});