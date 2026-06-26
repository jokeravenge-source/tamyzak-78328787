import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Music2, Link2, X, Play, Pause, LogOut, ExternalLink, Copy } from "lucide-react";
import {
  beginLogin, getAccessToken, getClientId, getRedirectUri,
  isConnected, logout, parsePlaylistUri, setClientId, clearClientId,
} from "@/lib/spotifyAuth";
import { toast } from "sonner";

declare global {
  interface Window {
    Spotify?: any;
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

const PLAYLIST_KEY = "sessions:spotify_context_uri";

function loadSdk(): Promise<void> {
  return new Promise((resolve) => {
    if (window.Spotify?.Player) return resolve();
    const existing = document.getElementById("spotify-web-playback-sdk");
    if (!existing) {
      const s = document.createElement("script");
      s.id = "spotify-web-playback-sdk";
      s.src = "https://sdk.scdn.co/spotify-player.js";
      s.async = true;
      document.head.appendChild(s);
    }
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    // SDK may already be loaded
    const id = window.setInterval(() => {
      if (window.Spotify?.Player) { window.clearInterval(id); resolve(); }
    }, 200);
  });
}

export default function SpotifyPlayerBlock({ language }: { language: "en" | "ar" }) {
  const [connected, setConnected] = useState<boolean>(isConnected());
  const [clientIdInput, setClientIdInput] = useState<string>(getClientId() || "");
  const [hasClientId, setHasClientId] = useState<boolean>(!!getClientId());
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [contextInput, setContextInput] = useState<string>("");
  const [contextUri, setContextUri] = useState<string>(() => localStorage.getItem(PLAYLIST_KEY) || "");
  const [playing, setPlaying] = useState(false);
  const [trackName, setTrackName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<any>(null);

  const L = language === "ar" ? {
    title: "Spotify (تشغيل كامل)",
    needClientId: "للاستماع للأغاني كاملة تحتاج إلى ربط حساب Spotify Premium الخاص بك.",
    step1: "١. أنشئ تطبيقًا في Spotify Developer Dashboard.",
    step2: "٢. أضف عنوان إعادة التوجيه التالي في إعدادات التطبيق:",
    step3: "٣. الصق Client ID هنا:",
    saveId: "حفظ",
    changeId: "تغيير Client ID",
    connect: "ربط Spotify Premium",
    disconnect: "قطع الاتصال",
    placeholderId: "Spotify Client ID",
    placeholderUri: "الصق رابط قائمة تشغيل أو ألبوم Spotify",
    play: "تشغيل",
    pause: "إيقاف",
    change: "تغيير القائمة",
    invalidUri: "رابط Spotify غير صالح",
    premiumOnly: "هذه الميزة تتطلب Spotify Premium.",
    copied: "تم نسخ الرابط",
    openDash: "فتح Spotify Dashboard",
    notReady: "المشغل غير جاهز بعد...",
  } : {
    title: "Spotify (Full Playback)",
    needClientId: "To play full songs, link your own Spotify Premium account.",
    step1: "1. Create an app in the Spotify Developer Dashboard.",
    step2: "2. Add this exact Redirect URI in your app settings:",
    step3: "3. Paste your Client ID below:",
    saveId: "Save",
    changeId: "Change Client ID",
    connect: "Connect Spotify Premium",
    disconnect: "Disconnect",
    placeholderId: "Spotify Client ID",
    placeholderUri: "Paste a Spotify playlist or album link",
    play: "Play",
    pause: "Pause",
    change: "Change playlist",
    invalidUri: "Invalid Spotify link",
    premiumOnly: "This feature requires Spotify Premium.",
    copied: "Redirect URI copied",
    openDash: "Open Spotify Dashboard",
    notReady: "Player not ready yet…",
  };

  // Initialize player once connected
  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    (async () => {
      await loadSdk();
      if (cancelled) return;
      const player = new window.Spotify.Player({
        name: "Tamyzak Study Player",
        getOAuthToken: async (cb: (t: string) => void) => {
          const t = await getAccessToken();
          if (t) cb(t);
        },
        volume: 0.6,
      });
      playerRef.current = player;
      player.addListener("ready", ({ device_id }: any) => { setDeviceId(device_id); setReady(true); });
      player.addListener("not_ready", () => setReady(false));
      player.addListener("player_state_changed", (s: any) => {
        if (!s) return;
        setPlaying(!s.paused);
        setTrackName(s.track_window?.current_track?.name || "");
      });
      player.addListener("authentication_error", ({ message }: any) => { setError(message); });
      player.addListener("account_error", () => { setError(L.premiumOnly); });
      player.addListener("initialization_error", ({ message }: any) => { setError(message); });
      await player.connect();
    })();
    return () => { cancelled = true; try { playerRef.current?.disconnect(); } catch {} };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  const saveClientId = () => {
    const v = clientIdInput.trim();
    if (!v) return;
    setClientId(v);
    setHasClientId(true);
  };

  const connect = async () => {
    try { await beginLogin(); }
    catch (e: any) { toast.error(e?.message || "Failed to start login"); }
  };

  const disconnect = () => {
    try { playerRef.current?.disconnect(); } catch {}
    logout();
    setConnected(false);
    setReady(false);
    setDeviceId(null);
  };

  const saveContext = () => {
    const uri = parsePlaylistUri(contextInput);
    if (!uri) { setError(L.invalidUri); return; }
    setError(null);
    setContextUri(uri);
    try { localStorage.setItem(PLAYLIST_KEY, uri); } catch {}
    setContextInput("");
    void playContext(uri);
  };

  const playContext = async (uri?: string) => {
    const target = uri || contextUri;
    if (!target) return;
    if (!deviceId) { toast.message(L.notReady); return; }
    const token = await getAccessToken();
    if (!token) return;
    const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ context_uri: target }),
    });
    if (res.status === 403) { setError(L.premiumOnly); return; }
    if (!res.ok && res.status !== 204) {
      const t = await res.text().catch(() => "");
      setError(`Spotify error ${res.status}: ${t.slice(0, 120)}`);
    }
  };

  const toggle = async () => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) await p.pause(); else {
      // If nothing loaded yet, start the saved context
      const state = await p.getCurrentState();
      if (!state) await playContext(); else await p.resume();
    }
  };

  // Refresh "connected" state after redirect callback in another tab/component
  useEffect(() => {
    const i = window.setInterval(() => setConnected(isConnected()), 1500);
    return () => window.clearInterval(i);
  }, []);

  const redirect = getRedirectUri();
  const copyRedirect = async () => {
    try { await navigator.clipboard.writeText(redirect); toast.success(L.copied); } catch {}
  };

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-secondary/30 backdrop-blur p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Music2 className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold">{L.title}</h3>
      </div>

      {!hasClientId ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{L.needClientId}</p>
          <p className="text-xs">{L.step1}{" "}
            <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer"
               className="text-primary hover:underline inline-flex items-center gap-1">
              {L.openDash}<ExternalLink className="w-3 h-3" />
            </a>
          </p>
          <p className="text-xs">{L.step2}</p>
          <div className="flex items-center gap-2 rounded-lg bg-background/60 border border-white/10 px-2 py-1.5">
            <code className="text-xs flex-1 truncate" dir="ltr">{redirect}</code>
            <Button size="sm" variant="ghost" onClick={copyRedirect} className="h-7 px-2">
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
          <p className="text-xs">{L.step3}</p>
          <div className="flex gap-2 flex-wrap">
            <Input value={clientIdInput} onChange={(e) => setClientIdInput(e.target.value)}
                   placeholder={L.placeholderId} className="flex-1 min-w-[200px]" dir="ltr" />
            <Button size="sm" onClick={saveClientId}>{L.saveId}</Button>
          </div>
        </div>
      ) : !connected ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{L.needClientId}</p>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={connect} className="gap-1">
              <Music2 className="w-3.5 h-3.5" /> {L.connect}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { clearClientId(); setHasClientId(false); }}>
              {L.changeId}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {!contextUri ? (
            <div className="flex gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Link2 className="w-4 h-4 text-muted-foreground" />
                <Input value={contextInput} onChange={(e) => { setContextInput(e.target.value); setError(null); }}
                       placeholder={L.placeholderUri} dir="ltr"
                       onKeyDown={(e) => { if (e.key === "Enter") saveContext(); }} />
              </div>
              <Button size="sm" onClick={saveContext} disabled={!ready}>{L.play}</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" onClick={toggle} disabled={!ready} className="gap-1">
                {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {playing ? L.pause : L.play}
              </Button>
              <div className="text-xs text-muted-foreground flex-1 truncate" dir="ltr">{trackName || (ready ? "" : L.notReady)}</div>
              <Button size="sm" variant="ghost" onClick={() => { setContextUri(""); try { localStorage.removeItem(PLAYLIST_KEY); } catch {} }}>
                <X className="w-3.5 h-3.5" /> {L.change}
              </Button>
            </div>
          )}
          <div className="flex items-center justify-end">
            <Button size="sm" variant="ghost" onClick={disconnect} className="gap-1 text-muted-foreground">
              <LogOut className="w-3.5 h-3.5" /> {L.disconnect}
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}