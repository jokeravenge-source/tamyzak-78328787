const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } | null {
  const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1];
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ext = mime.split("/")[1]?.split("+")[0] ?? "jpg";
  return { blob: new Blob([bytes], { type: mime }), ext };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const TOKEN = Deno.env.get("HUMAN_GRADER_BOT_TOKEN");
    const CHAT_ID = Deno.env.get("HUMAN_GRADER_CHAT_ID");
    if (!TOKEN || !CHAT_ID) {
      return new Response(JSON.stringify({ error: "Human grader bot not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const telegramUsername = String(body.telegramUsername ?? "").trim().replace(/^@+/, "").slice(0, 64);
    const subject = String(body.subject ?? "").slice(0, 60);
    const subjectCode = String(body.subjectCode ?? "").toLowerCase().slice(0, 30);
    const chapter = String(body.chapter ?? "").slice(0, 200);
    const examText = String(body.examText ?? "").slice(0, 3500);
    const studentText = String(body.studentText ?? "").slice(0, 3500);
    const aiScore = body.aiScore != null ? String(body.aiScore).slice(0, 40) : "";
    const reason = String(body.reason ?? "").slice(0, 500);
    const images: string[] = Array.isArray(body.studentImages)
      ? body.studentImages.filter((s: unknown) => typeof s === "string" && (s as string).startsWith("data:image/")).slice(0, 10)
      : [];

    // Route to subject-specific Telegram group.
    const SUBJECT_CHATS: Record<string, string> = {
      physics:   "-1004498749305",
      chemistry: "-1003710019898",
      math:      "-1004420333283",
      biology:   "-1004461471633",
    };
    const routed = SUBJECT_CHATS[subjectCode];
    const TARGET_CHAT_ID = routed ?? CHAT_ID;
    const withThread = <T extends Record<string, unknown>>(payload: T): T => payload;
    const appendThread = (_fd: FormData) => {};

    if (!telegramUsername || !/^[A-Za-z0-9_]{4,32}$/.test(telegramUsername)) {
      return new Response(JSON.stringify({ error: "Invalid Telegram username" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!studentText && images.length === 0) {
      return new Response(JSON.stringify({ error: "No answer to send" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const header =
      `📝 <b>طلب تصحيح بشري</b>\n` +
      `👤 المستخدم: @${esc(telegramUsername)}\n` +
      (subject ? `📚 المادة: ${esc(subject)}\n` : "") +
      (chapter ? `📖 الفصل: ${esc(chapter)}\n` : "") +
      (aiScore ? `🤖 درجة الذكاء: ${esc(aiScore)}\n` : "") +
      (reason ? `\n💬 ملاحظة الطالب:\n${esc(reason)}\n` : "");

    const base = `https://api.telegram.org/bot${TOKEN}`;

    // 1. Header message
    const hRes = await fetch(`${base}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withThread({ chat_id: TARGET_CHAT_ID, text: header, parse_mode: "HTML" })),
    });
    if (!hRes.ok) {
      const t = await hRes.text();
      return new Response(JSON.stringify({ error: `Telegram sendMessage failed: ${t}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Exam text (long → chunked)
    if (examText) {
      const parts = examText.match(/[\s\S]{1,3500}/g) ?? [];
      for (const p of parts) {
        await fetch(`${base}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(withThread({ chat_id: TARGET_CHAT_ID, text: `📄 الامتحان:\n\n${p}` })),
        });
      }
    }

    // 3. Student typed answer
    if (studentText) {
      const parts = studentText.match(/[\s\S]{1,3500}/g) ?? [];
      for (const p of parts) {
        await fetch(`${base}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(withThread({ chat_id: TARGET_CHAT_ID, text: `✍️ إجابة الطالب:\n\n${p}` })),
        });
      }
    }

    // 4. Images → sendMediaGroup in batches of 10 (Telegram cap), else sendPhoto
    if (images.length) {
      for (const group of chunk(images, 10)) {
        if (group.length === 1) {
          const b = dataUrlToBlob(group[0]);
          if (!b) continue;
          const fd = new FormData();
          fd.append("chat_id", TARGET_CHAT_ID);
          appendThread(fd);
          fd.append("caption", "📷 ورقة الإجابة");
          fd.append("photo", b.blob, `answer.${b.ext}`);
          await fetch(`${base}/sendPhoto`, { method: "POST", body: fd });
        } else {
          const fd = new FormData();
          fd.append("chat_id", TARGET_CHAT_ID);
          appendThread(fd);
          const media = group.map((_, i) => ({
            type: "photo",
            media: `attach://file${i}`,
            ...(i === 0 ? { caption: "📷 ورقة الإجابة" } : {}),
          }));
          fd.append("media", JSON.stringify(media));
          group.forEach((url, i) => {
            const b = dataUrlToBlob(url);
            if (b) fd.append(`file${i}`, b.blob, `answer${i}.${b.ext}`);
          });
          await fetch(`${base}/sendMediaGroup`, { method: "POST", body: fd });
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, routed: Boolean(routed), subjectCode: routed ? subjectCode : "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});