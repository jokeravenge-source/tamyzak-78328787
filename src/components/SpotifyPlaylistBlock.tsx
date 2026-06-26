import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Music2, Link2, X } from "lucide-react";

const STORAGE_KEY = "sessions:spotify_playlist_url";

// Accepts spotify.com or open.spotify.com URLs, returns embed src or null.
function toEmbedSrc(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // spotify:playlist:ID
  const uriMatch = trimmed.match(/^spotify:(playlist|album|track|episode|show|artist):([A-Za-z0-9]+)/i);
  if (uriMatch) return `https://open.spotify.com/embed/${uriMatch[1]}/${uriMatch[2]}`;
  try {
    const u = new URL(trimmed);
    if (!u.hostname.includes("spotify.com")) return null;
    // path like /playlist/ID or /embed/playlist/ID, optionally locale prefix /intl-xx/
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => ["playlist", "album", "track", "episode", "show", "artist"].includes(p));
    if (idx === -1 || !parts[idx + 1]) return null;
    const kind = parts[idx];
    const id = parts[idx + 1];
    return `https://open.spotify.com/embed/${kind}/${id}`;
  } catch {
    return null;
  }
}

export default function SpotifyPlaylistBlock({ language }: { language: "en" | "ar" }) {
  const [url, setUrl] = useState<string>("");
  const [input, setInput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setUrl(saved);
    } catch {}
  }, []);

  const L = language === "ar"
    ? {
        title: "قائمة تشغيل Spotify",
        placeholder: "الصق رابط قائمة Spotify",
        save: "ربط",
        change: "تغيير",
        remove: "إزالة",
        invalid: "رابط Spotify غير صالح",
        hint: "الصق رابط قائمة تشغيل من Spotify لتشغيلها هنا.",
      }
    : {
        title: "Spotify Playlist",
        placeholder: "Paste a Spotify playlist link",
        save: "Link",
        change: "Change",
        remove: "Remove",
        invalid: "Invalid Spotify link",
        hint: "Paste a Spotify playlist URL to play it here.",
      };

  const embed = url ? toEmbedSrc(url) : null;

  const save = () => {
    const src = toEmbedSrc(input);
    if (!src) { setError(L.invalid); return; }
    setError(null);
    setUrl(input.trim());
    try { localStorage.setItem(STORAGE_KEY, input.trim()); } catch {}
    setInput("");
  };

  const remove = () => {
    setUrl("");
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-secondary/30 backdrop-blur p-4">
      <div className="flex items-center gap-2 mb-3">
        <Music2 className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold">{L.title}</h3>
      </div>

      {embed ? (
        <div className="space-y-2">
          <iframe
            title="Spotify Playlist"
            src={embed}
            width="100%"
            height="152"
            frameBorder={0}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-xl"
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={remove} className="gap-1">
              <X className="w-3.5 h-3.5" /> {L.remove}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{L.hint}</p>
          <div className="flex gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Link2 className="w-4 h-4 text-muted-foreground" />
              <Input
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(null); }}
                placeholder={L.placeholder}
                onKeyDown={(e) => { if (e.key === "Enter") save(); }}
              />
            </div>
            <Button size="sm" onClick={save}>{L.save}</Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}