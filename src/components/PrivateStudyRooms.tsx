import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, DoorOpen, LogOut, MessageCircle, Plus, Send, Users } from "lucide-react";
import { censorText, findBannedWords } from "@/lib/censor";

type Room = { id: string; code: string; name: string; owner_id: string };
type Member = { user_id: string; display_name: string };
type Message = { id: string; user_id: string; display_name: string; body: string; created_at: string };

const LS_KEY = "study_room_active_v1";

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function PrivateStudyRooms({ language }: { language: "en" | "ar" }) {
  const ar = language === "ar";
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("Student");
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [roomName, setRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const L = ar
    ? {
        title: "غرف الدراسة الخاصة", create: "إنشاء غرفة", join: "انضمام",
        roomName: "اسم الغرفة", code: "رمز الغرفة", enterCode: "أدخل الرمز",
        chat: "الدردشة", send: "إرسال", leave: "مغادرة الغرفة", copied: "تم نسخ الرمز",
        members: "الأعضاء", placeholder: "اكتب رسالة...", notFound: "لا توجد غرفة بهذا الرمز",
        blocked: "رسالتك تحتوي على كلمات غير مسموح بها (شتائم أو كلام عاطفي).",
        needName: "اكتب اسم الغرفة", signIn: "سجّل الدخول لاستخدام الغرف الخاصة",
        joined: "تم الانضمام إلى الغرفة", hint: "شارك الرمز مع أصدقائك ليدرسوا معك.",
        empty: "لا توجد رسائل بعد — ابدأ الحديث!",
      }
    : {
        title: "Private study rooms", create: "Create room", join: "Join",
        roomName: "Room name", code: "Room code", enterCode: "Enter code",
        chat: "Chat", send: "Send", leave: "Leave room", copied: "Code copied",
        members: "Members", placeholder: "Type a message...", notFound: "No room with that code",
        blocked: "Your message contains words that aren't allowed (cursing or love talk).",
        needName: "Type a room name", signIn: "Sign in to use private rooms",
        joined: "Joined the room", hint: "Share the code with friends so they can study with you.",
        empty: "No messages yet — say hi!",
      };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) return;
      setUserId(u.id);
      const { data: prof } = await supabase
        .from("profiles").select("display_name").eq("user_id", u.id).maybeSingle();
      setDisplayName(prof?.display_name || u.email?.split("@")[0] || "Student");
    })();
  }, []);

  const loadRoom = useCallback(async (roomId: string) => {
    const [{ data: mem }, { data: msg }] = await Promise.all([
      supabase.from("study_room_members").select("user_id,display_name").eq("room_id", roomId),
      supabase.from("study_room_messages")
        .select("id,user_id,display_name,body,created_at")
        .eq("room_id", roomId).order("created_at", { ascending: true }).limit(200),
    ]);
    setMembers((mem ?? []) as Member[]);
    setMessages((msg ?? []) as Message[]);
  }, []);

  // Restore last room
  useEffect(() => {
    if (!userId) return;
    const saved = localStorage.getItem(LS_KEY);
    if (!saved) return;
    (async () => {
      const { data } = await supabase.from("study_rooms")
        .select("id,code,name,owner_id").eq("id", saved).maybeSingle();
      if (data) { setRoom(data as Room); loadRoom(data.id); }
      else localStorage.removeItem(LS_KEY);
    })();
  }, [userId, loadRoom]);

  // Realtime chat + members
  useEffect(() => {
    if (!room) return;
    const ch = supabase
      .channel(`study_room_${room.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "study_room_messages", filter: `room_id=eq.${room.id}` }, () => loadRoom(room.id))
      .on("postgres_changes", { event: "*", schema: "public", table: "study_room_members", filter: `room_id=eq.${room.id}` }, () => loadRoom(room.id))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [room, loadRoom]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const createRoom = async () => {
    if (!userId) { toast.error(L.signIn); return; }
    if (!roomName.trim()) { toast.error(L.needName); return; }
    setBusy(true);
    try {
      let created: Room | null = null;
      for (let i = 0; i < 5 && !created; i++) {
        const { data, error } = await supabase.from("study_rooms")
          .insert({ code: makeCode(), name: roomName.trim(), owner_id: userId })
          .select("id,code,name,owner_id").maybeSingle();
        if (!error && data) created = data as Room;
        else if (error && !error.message.includes("duplicate")) throw error;
      }
      if (!created) throw new Error("could not create room");
      await supabase.from("study_room_members")
        .insert({ room_id: created.id, user_id: userId, display_name: displayName });
      localStorage.setItem(LS_KEY, created.id);
      setRoom(created);
      setRoomName("");
      loadRoom(created.id);
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally { setBusy(false); }
  };

  const joinRoom = async () => {
    if (!userId) { toast.error(L.signIn); return; }
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setBusy(true);
    try {
      const { data } = await supabase.from("study_rooms")
        .select("id,code,name,owner_id").eq("code", code).eq("is_active", true).maybeSingle();
      if (!data) { toast.error(L.notFound); return; }
      await supabase.from("study_room_members")
        .upsert({ room_id: data.id, user_id: userId, display_name: displayName }, { onConflict: "room_id,user_id" });
      localStorage.setItem(LS_KEY, data.id);
      setRoom(data as Room);
      setJoinCode("");
      loadRoom(data.id);
      toast.success(L.joined);
    } finally { setBusy(false); }
  };

  const leaveRoom = async () => {
    if (!room || !userId) return;
    await supabase.from("study_room_members").delete().eq("room_id", room.id).eq("user_id", userId);
    localStorage.removeItem(LS_KEY);
    setRoom(null); setMembers([]); setMessages([]);
  };

  const send = async () => {
    if (!room || !userId) return;
    const body = draft.trim();
    if (!body) return;
    if (findBannedWords(body).length > 0) { toast.error(L.blocked); return; }
    setDraft("");
    const { error } = await supabase.from("study_room_messages")
      .insert({ room_id: room.id, user_id: userId, display_name: displayName, body });
    if (error) { toast.error(error.message); setDraft(body); return; }
    loadRoom(room.id);
  };

  if (!room) {
    return (
      <section className="max-w-2xl mx-auto mb-8 rounded-2xl border border-primary/30 bg-secondary/40 backdrop-blur p-5" dir={ar ? "rtl" : "ltr"}>
        <div className="flex items-center gap-2 mb-1 text-primary font-semibold">
          <DoorOpen className="w-4 h-4" /> <span>{L.title}</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">{L.hint}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex gap-2">
            <input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder={L.roomName}
              className="flex-1 min-w-0 rounded-xl bg-background/60 border border-primary/30 px-3 py-2 text-sm" />
            <button onClick={createRoom} disabled={busy}
              className="rounded-xl bg-primary text-primary-foreground px-3 py-2 text-sm font-medium flex items-center gap-1 disabled:opacity-50">
              <Plus className="w-4 h-4" /> {L.create}
            </button>
          </div>
          <div className="flex gap-2">
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder={L.enterCode}
              className="flex-1 min-w-0 rounded-xl bg-background/60 border border-primary/30 px-3 py-2 text-sm font-mono tracking-widest" />
            <button onClick={joinRoom} disabled={busy}
              className="rounded-xl border border-primary/50 px-3 py-2 text-sm font-medium">{L.join}</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-2xl mx-auto mb-8 rounded-2xl border border-primary/30 bg-secondary/40 backdrop-blur p-5" dir={ar ? "rtl" : "ltr"}>
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <DoorOpen className="w-4 h-4 text-primary" />
        <span className="font-semibold">{room.name}</span>
        <button
          onClick={() => { navigator.clipboard?.writeText(room.code); toast.success(L.copied); }}
          className="ms-auto flex items-center gap-1 text-xs font-mono tracking-widest rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-primary">
          {room.code} <Copy className="w-3 h-3" />
        </button>
        <button onClick={leaveRoom} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          <LogOut className="w-3.5 h-3.5" /> {L.leave}
        </button>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
        <Users className="w-3.5 h-3.5" /> {L.members}: {members.length}
        <span className="truncate">— {members.map((m) => m.display_name).join(", ")}</span>
      </div>

      <div className="flex items-center gap-2 text-xs text-primary mb-2">
        <MessageCircle className="w-3.5 h-3.5" /> {L.chat}
      </div>
      <div ref={listRef} className="h-56 overflow-y-auto rounded-xl border border-primary/20 bg-background/40 p-3 space-y-2 mb-3">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center pt-16">{L.empty}</p>
        ) : messages.map((m) => {
          const mine = m.user_id === userId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-secondary border border-primary/20"}`}>
                {!mine && <div className="text-[10px] opacity-70 mb-0.5">{m.display_name}</div>}
                <div className="whitespace-pre-wrap break-words">{censorText(m.body)}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={L.placeholder} maxLength={500}
          className="flex-1 min-w-0 rounded-xl bg-background/60 border border-primary/30 px-3 py-2 text-sm" />
        <button onClick={send} className="rounded-xl bg-primary text-primary-foreground px-3 py-2 text-sm flex items-center gap-1">
          <Send className="w-4 h-4" /> {L.send}
        </button>
      </div>
    </section>
  );
}
