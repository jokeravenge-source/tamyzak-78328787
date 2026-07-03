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
    const bunnyKey = Deno.env.get("BUNNY_STREAM_API_KEY");
    const bunnyLib = Deno.env.get("BUNNY_STREAM_LIBRARY_ID");
    if (!bunnyKey || !bunnyLib) return json({ error: "Bunny not configured" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return json({ error: "unauthenticated" }, 401);

    const { chapter_id, title } = await req.json();
    if (!chapter_id || !title) return json({ error: "chapter_id and title required" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: chapter } = await admin
      .from("course_chapters")
      .select("id, course_id")
      .eq("id", chapter_id)
      .maybeSingle();
    if (!chapter) return json({ error: "chapter not found" }, 404);

    // Verify teacher/admin
    const { data: canTeach } = await admin.rpc("is_course_teacher", { _course: chapter.course_id });
    // rpc under service_role can't use auth.uid(); do it via user client
    const { data: canTeach2 } = await userClient.rpc("is_course_teacher", { _course: chapter.course_id });
    if (!canTeach2) return json({ error: "forbidden" }, 403);

    // Create Bunny video
    const bunnyRes = await fetch(`https://video.bunnycdn.com/library/${bunnyLib}/videos`, {
      method: "POST",
      headers: { AccessKey: bunnyKey, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!bunnyRes.ok) return json({ error: "bunny create failed", detail: await bunnyRes.text() }, 502);
    const bunny = await bunnyRes.json();
    const guid = bunny?.guid;
    if (!guid) return json({ error: "no guid returned" }, 502);

    // Insert DB row
    const { data: maxRow } = await admin
      .from("course_videos")
      .select("sort_order")
      .eq("chapter_id", chapter_id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (maxRow?.sort_order ?? 0) + 1;

    const { data: inserted, error: insErr } = await admin
      .from("course_videos")
      .insert({
        chapter_id,
        course_id: chapter.course_id,
        title,
        bunny_library_id: bunnyLib,
        bunny_video_guid: guid,
        sort_order: nextOrder,
        is_published: false,
        created_by: user.id,
      })
      .select()
      .single();
    if (insErr) return json({ error: insErr.message }, 500);

    return json({
      video: inserted,
      upload_url: `https://video.bunnycdn.com/library/${bunnyLib}/videos/${guid}`,
      upload_headers: { AccessKey: bunnyKey, "Content-Type": "application/octet-stream" },
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});