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
    const cdnHost = Deno.env.get("BUNNY_STREAM_CDN_HOSTNAME");
    if (!bunnyKey || !bunnyLib) return json({ error: "Bunny not configured" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) return json({ error: "unauthenticated" }, 401);

    const { video_id } = await req.json();
    if (!video_id) return json({ error: "video_id required" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: video } = await admin
      .from("course_videos")
      .select("id, course_id, bunny_video_guid, bunny_library_id")
      .eq("id", video_id)
      .maybeSingle();
    if (!video) return json({ error: "video not found" }, 404);

    const { data: canTeach } = await userClient.rpc("is_course_teacher", { _course: video.course_id });
    if (!canTeach) return json({ error: "forbidden" }, 403);

    // Fetch metadata from Bunny
    const metaRes = await fetch(
      `https://video.bunnycdn.com/library/${video.bunny_library_id}/videos/${video.bunny_video_guid}`,
      { headers: { AccessKey: bunnyKey, accept: "application/json" } },
    );
    let duration_sec: number | null = null;
    let thumbnail_url: string | null = null;
    if (metaRes.ok) {
      const meta = await metaRes.json();
      if (typeof meta?.length === "number") duration_sec = Math.round(meta.length);
      if (cdnHost) thumbnail_url = `https://${cdnHost}/${video.bunny_video_guid}/thumbnail.jpg`;
    }

    const { data: updated, error } = await admin
      .from("course_videos")
      .update({ duration_sec, thumbnail_url, is_published: true })
      .eq("id", video_id)
      .select()
      .single();
    if (error) return json({ error: error.message }, 500);
    return json({ video: updated });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});