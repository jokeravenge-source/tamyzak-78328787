import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Youtube, Play, Search as SearchIcon, X, ListVideo, Loader2, Users2, Plus, Trash2 } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "yt_player_recents_v1";

type Recent = { id: string; title: string; url: string; added: number };
type PlaylistVideo = { id: string; title: string; author: string; thumbnail: string; published: string };
type PlaylistData = { playlistId: string; title: string; videos: PlaylistVideo[] };
type TeacherRow = { id: string; name: string; playlist_id: string; playlist_url: string | null };

function extractPlaylistId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (/^(PL|UU|LL|FL|RD|OL)[A-Za-z0-9_-]{10,}$/.test(s)) return s;
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    const list = u.searchParams.get("list");
    if (list && /^[A-Za-z0-9_-]{10,}$/.test(list)) return list;
  } catch { /* */ }
  return null;
}

// Extract a YouTube video ID from any common URL format the user might paste:
// watch?v=, youtu.be/, /embed/, /shorts/, /live/, or a raw 11-char id.
function extractId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host.endsWith("youtube.com") || host === "youtube-nocookie.com") {
      const v = u.searchParams.get("v");
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      const i = parts.findIndex((p) => p === "embed" || p === "shorts" || p === "live" || p === "v");
      if (i >= 0 && parts[i + 1] && /^[A-Za-z0-9_-]{11}$/.test(parts[i + 1])) return parts[i + 1];
    }
  } catch {
    /* not a URL */
  }
  const m = s.match(/[A-Za-z0-9_-]{11}/);
  return m ? m[0] : null;
}

const YoutubePlayer = ({ language, onBack, isAdmin = false }: { language: AppLanguage; onBack: () => void; isAdmin?: boolean }) => {
  const isRTL = language === "ar";
  const [tab, setTab] = useState<"mine" | "tamayzak">("mine");
  const [input, setInput] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [activeTeacher, setActiveTeacher] = useState<TeacherRow | null>(null);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [recents, setRecents] = useState<Recent[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recents.slice(0, 12)));
  }, [recents]);

  const thumb = useMemo(
    () => (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null),
    [videoId]
  );

  const play = (id: string, title?: string, url?: string) => {
    setVideoId(id);
    setError(null);
    setRecents((prev) => {
      const without = prev.filter((r) => r.id !== id);
      return [
        { id, title: title || url || `https://youtu.be/${id}`, url: url || `https://youtu.be/${id}`, added: Date.now() },
        ...without,
      ];
    });
  };

  const loadPlaylist = useCallback(async (pl: string) => {
    setPlaylistId(pl);
    setPlaylist(null);
    setLoadingPlaylist(true);
    setError(null);
    try {
      const client = supabase as unknown as { supabaseUrl: string; supabaseKey: string };
      const res = await fetch(
        `${client.supabaseUrl}/functions/v1/youtube-playlist?list=${encodeURIComponent(pl)}`,
        { headers: { apikey: client.supabaseKey ?? "", Authorization: `Bearer ${client.supabaseKey ?? ""}` } },
      );
      if (!res.ok) throw new Error("Failed to load playlist");
      const json = (await res.json()) as PlaylistData;
      setPlaylist(json);
      if (json.videos[0]) {
        setVideoId(json.videos[0].id);
      }
    } catch {
      setError(isRTL ? "تعذّر تحميل قائمة التشغيل" : "Couldn't load that playlist.");
    } finally {
      setLoadingPlaylist(false);
    }
  }, [isRTL]);

  const loadTeachers = useCallback(async () => {
    setTeachersLoading(true);
    const { data } = await supabase
      .from("player_teachers")
      .select("id,name,playlist_id,playlist_url")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    setTeachers((data as TeacherRow[]) ?? []);
    setTeachersLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "tamayzak") loadTeachers();
  }, [tab, loadTeachers]);

  const addTeacher = async () => {
    const pl = extractPlaylistId(newUrl);
    if (!newName.trim() || !pl) {
      setError(isRTL ? "أدخل اسم المدرس ورابط قائمة تشغيل صالح" : "Enter a teacher name and a valid playlist link.");
      return;
    }
    setSaving(true);
    const { error: err } = await supabase.from("player_teachers").insert({
      name: newName.trim(),
      playlist_id: pl,
      playlist_url: newUrl.trim(),
    });
    setSaving(false);
    if (err) {
      setError(isRTL ? "تعذّر إضافة المدرس" : "Couldn't add the teacher.");
      return;
    }
    setNewName("");
    setNewUrl("");
    setError(null);
    loadTeachers();
  };

  const removeTeacher = async (id: string) => {
    await supabase.from("player_teachers").delete().eq("id", id);
    if (activeTeacher?.id === id) { setActiveTeacher(null); setPlaylistId(null); setPlaylist(null); }
    loadTeachers();
  };

  const openTeacher = (t: TeacherRow) => {
    setActiveTeacher(t);
    setVideoId(null);
    loadPlaylist(t.playlist_id);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pl = extractPlaylistId(input);
    if (pl) {
      setInput("");
      loadPlaylist(pl);
      return;
    }
    const id = extractId(input);
    if (!id) {
      setError(isRTL ? "رابط يوتيوب أو قائمة تشغيل غير صالح" : "That doesn't look like a YouTube video or playlist link.");
      return;
    }
    setPlaylistId(null);
    setPlaylist(null);
    play(id, undefined, input.trim());
    setInput("");
  };

  const removeRecent = (id: string) =>
    setRecents((prev) => prev.filter((r) => r.id !== id));

  return (
    <main className="min-h-screen px-4 py-10 md:py-14" dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          {isRTL ? null : <ArrowLeft className="w-4 h-4" />}
          <span>{isRTL ? "رجوع" : "Back"}</span>
          {isRTL ? <ArrowLeft className="w-4 h-4 rotate-180" /> : null}
        </button>

        <header className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-border mb-3">
            <Youtube className="w-4 h-4 text-primary" />
            <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              {isRTL ? "مشغّل يوتيوب" : "YouTube Player"}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold gradient-text">
            {isRTL ? "شاهد دروسك بدون مغادرة التطبيق" : "Watch lessons without leaving the app"}
          </h1>
          <p className="mt-2 text-sm md:text-base text-muted-foreground">
            {isRTL
              ? "ألصق أي رابط يوتيوب وابدأ المشاهدة فوراً."
              : "Paste any YouTube link and start watching instantly."}
          </p>
        </header>

        <div className="flex gap-2 mb-6">
          {([
            { k: "mine" as const, ar: "شغّل فيديوك", en: "Play your video", Icon: Play },
            { k: "tamayzak" as const, ar: "فيديوهات تميّزك", en: "Tamayzak videos", Icon: Users2 },
          ]).map(({ k, ar, en, Icon }) => (
            <button
              key={k}
              onClick={() => { setTab(k); setError(null); }}
              className={`flex-1 h-11 rounded-xl border text-sm font-medium inline-flex items-center justify-center gap-2 transition ${tab === k ? "border-primary bg-primary/10 text-foreground" : "border-border bg-secondary/30 text-muted-foreground hover:border-primary"}`}
            >
              <Icon className="w-4 h-4" />
              {isRTL ? ar : en}
            </button>
          ))}
        </div>

        {tab === "mine" && (
        <form onSubmit={onSubmit} className="flex gap-2 mb-6">
          <div className="flex-1 relative">
            <SearchIcon className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? "right-3" : "left-3"} w-4 h-4 text-muted-foreground`} />
            <input
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); if (error) setError(null); }}
              placeholder={isRTL ? "ألصق رابط فيديو أو قائمة تشغيل..." : "Paste a YouTube video or playlist URL..."}
              className={`w-full h-11 rounded-xl border border-border bg-secondary/40 ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} text-sm focus:outline-none focus:border-primary`}
            />
          </div>
          <button
            type="submit"
            className="h-11 px-4 rounded-xl bg-primary text-primary-foreground font-medium text-sm inline-flex items-center gap-2 hover:opacity-90"
          >
            <Play className="w-4 h-4" />
            {isRTL ? "تشغيل" : "Play"}
          </button>
        </form>
        )}

        {tab === "tamayzak" && (
          <section className="mb-6">
            {isAdmin && (
              <div className="rounded-xl border border-border bg-secondary/30 p-3 mb-4 space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {isRTL ? "إضافة مدرس" : "Add a teacher"}
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={isRTL ? "اسم المدرس" : "Teacher name"}
                    className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary"
                  />
                  <input
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder={isRTL ? "رابط قائمة التشغيل" : "Playlist URL"}
                    className="h-10 flex-[2] rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary"
                  />
                  <button
                    onClick={addTeacher}
                    disabled={saving}
                    className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    {isRTL ? "أضف" : "Add"}
                  </button>
                </div>
              </div>
            )}

            {teachersLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                {isRTL ? "جارٍ التحميل..." : "Loading..."}
              </div>
            ) : teachers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                {isRTL ? "لا يوجد مدرسون بعد." : "No teachers yet."}
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {teachers.map((t) => (
                  <div key={t.id} className={`relative rounded-xl border p-3 transition ${activeTeacher?.id === t.id ? "border-primary bg-primary/10" : "border-border bg-secondary/30 hover:border-primary"}`}>
                    <button onClick={() => openTeacher(t)} className="w-full text-start">
                      <div className="flex items-center gap-2">
                        <Users2 className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm font-medium line-clamp-2">{t.name}</span>
                      </div>
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => removeTeacher(t.id)}
                        className="absolute top-1.5 end-1.5 text-muted-foreground hover:text-destructive"
                        aria-label="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {error && (
          <div className="mb-4 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="rounded-2xl overflow-hidden border border-border bg-black aspect-video mb-8 shadow-lg">
          {videoId ? (
            <iframe
              key={videoId}
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1${playlistId ? `&list=${playlistId}` : ""}`}
              title="YouTube player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-3 p-6">
              <Youtube className="w-12 h-12 text-primary/70" />
              <p className="text-sm">
                {isRTL ? "ألصق رابطاً أعلاه لبدء التشغيل" : "Paste a link above to start watching"}
              </p>
            </div>
          )}
        </div>

        {playlistId && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <ListVideo className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {playlist?.title || (isRTL ? "قائمة التشغيل" : "Playlist")}
              </h2>
              {playlist && (
                <span className="text-xs text-muted-foreground">· {playlist.videos.length}</span>
              )}
              <button
                onClick={() => { setPlaylistId(null); setPlaylist(null); }}
                className="ms-auto text-xs text-muted-foreground hover:text-foreground"
              >
                {isRTL ? "إغلاق" : "Close"}
              </button>
            </div>
            {loadingPlaylist ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                <Loader2 className="w-4 h-4 animate-spin" />
                {isRTL ? "جارٍ تحميل القائمة..." : "Loading playlist..."}
              </div>
            ) : playlist && playlist.videos.length > 0 ? (
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {playlist.videos.map((v, idx) => {
                  const active = v.id === videoId;
                  return (
                    <button
                      key={v.id}
                      onClick={() => play(v.id, v.title, `https://youtu.be/${v.id}`)}
                      className={`w-full flex gap-3 items-center text-start rounded-xl border p-2 transition ${active ? "border-primary bg-primary/10" : "border-border bg-secondary/30 hover:border-primary"}`}
                    >
                      <span className="text-xs text-muted-foreground w-6 text-center shrink-0">{idx + 1}</span>
                      <div className="w-32 aspect-video bg-black rounded overflow-hidden shrink-0">
                        <img src={v.thumbnail} alt="" loading="lazy" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium line-clamp-2">{v.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{v.author}</p>
                      </div>
                      {active && <Play className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
                {playlist.videos.length >= 15 && (
                  <p className="text-[11px] text-muted-foreground text-center pt-2">
                    {isRTL ? "يتم عرض أحدث 15 فيديو من القائمة." : "Showing the most recent 15 videos from the playlist."}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {isRTL ? "لا توجد فيديوهات في هذه القائمة." : "No videos found in this playlist."}
              </p>
            )}
          </section>
        )}

        {recents.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {isRTL ? "مشاهد حديثة" : "Recently played"}
              </h2>
              <button
                onClick={() => setRecents([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {isRTL ? "مسح الكل" : "Clear all"}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {recents.map((r) => (
                <div key={r.id} className="group relative rounded-xl overflow-hidden border border-border bg-secondary/30 hover:border-primary transition">
                  <button
                    onClick={() => play(r.id, r.title, r.url)}
                    className="block w-full text-left"
                    title={r.title}
                  >
                    <div className="aspect-video bg-black relative">
                      <img
                        src={`https://i.ytimg.com/vi/${r.id}/mqdefault.jpg`}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition">
                        <Play className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    </div>
                    <p className="px-2 py-1.5 text-[11px] text-muted-foreground line-clamp-1">{r.title}</p>
                  </button>
                  <button
                    onClick={() => removeRecent(r.id)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-background/70 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition"
                    aria-label="Remove"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {thumb && !videoId && (
          <img src={thumb} alt="" className="hidden" />
        )}
      </div>
    </main>
  );
};

export default YoutubePlayer;