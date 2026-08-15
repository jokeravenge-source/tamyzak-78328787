import { protect } from "../_shared/guard.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const guard = await protect(req, "youtube-playlist", { max: 15, windowSeconds: 60 });
  if (!guard.ok) return new Response(JSON.stringify({ error: guard.error }), { status: guard.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const url = new URL(req.url);
    let listId = url.searchParams.get("list") || url.searchParams.get("playlistId") || url.searchParams.get("playlist_id");
    if (!listId && (req.method === "POST" || req.method === "PUT" || req.method === "PATCH")) {
      try {
        const body = await req.json();
        listId = body?.list || body?.playlistId || body?.playlist_id || null;
      } catch (_) { /* ignore */ }
    }
    if (!listId) {
      return new Response(JSON.stringify({ error: "Missing list" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(listId)}`;
    const res = await fetch(feedUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Playlist not found", status: res.status }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const xml = await res.text();
    const titleMatch = xml.match(/<title>([^<]+)<\/title>/);
    const playlistTitle = titleMatch ? titleMatch[1] : "Playlist";
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
    const videos = entries.map((m) => {
      const e = m[1];
      const id = (e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1] || "";
      const title = (e.match(/<title>([^<]+)<\/title>/) || [])[1] || "";
      const author = (e.match(/<name>([^<]+)<\/name>/) || [])[1] || "";
      const published = (e.match(/<published>([^<]+)<\/published>/) || [])[1] || "";
      return { id, title, author, published, thumbnail: id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : "" };
    }).filter(v => v.id);
    return new Response(JSON.stringify({ playlistId: listId, title: playlistTitle, videos }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});