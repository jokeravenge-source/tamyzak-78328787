import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return json({ error: "unauthenticated" }, 401);

    const body = await req.json();
    const video_id = String(body?.video_id ?? "");
    const percent = Math.max(0, Math.min(100, Math.round(Number(body?.percent ?? 0))));
    if (!video_id) return json({ error: "video_id required" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: video } = await admin
      .from("course_videos")
      .select("id, course_id")
      .eq("id", video_id)
      .maybeSingle();
    if (!video) return json({ error: "video not found" }, 404);

    // Enrollment check (or teacher)
    const { data: enrolled } = await userClient.rpc("is_course_enrolled", { _course: video.course_id });
    const { data: teacher } = await userClient.rpc("is_course_teacher", { _course: video.course_id });
    if (!enrolled && !teacher) return json({ error: "forbidden" }, 403);

    const { data: existing } = await admin
      .from("course_video_views")
      .select("id, max_percent")
      .eq("video_id", video_id)
      .eq("user_id", user.id)
      .maybeSingle();

    const newMax = Math.max(existing?.max_percent ?? 0, percent);
    const completed = newMax >= 90;

    if (existing) {
      await admin.from("course_video_views").update({
        max_percent: newMax,
        completed,
        last_seen_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await admin.from("course_video_views").insert({
        video_id,
        course_id: video.course_id,
        user_id: user.id,
        max_percent: newMax,
        completed,
      });
    }
    return json({ ok: true, max_percent: newMax, completed });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});