import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Ban, Copy, Crown, DoorOpen, Link2, LogOut, MessageCircle, Plus, Send, Timer, Trash2, Users } from "lucide-react";
import { censorText, findBannedWords } from "@/lib/censor";
import { CharacterAvatar, type CharacterTraits, type Gender } from "./CharacterAvatar";

type Room = { id: string; code: string; name: string; owner_id: string };
type Member = { user_id: string; display_name: string; gender?: Gender; character?: CharacterTraits | null };
type Message = { id: string; user_id: string; display_name: string; body: string; created_at: string };
type Presence = { elapsed_seconds: number; is_running: boolean; subject: string };

const LS_KEY = "study_room_active_v1";

const fmtClock = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${p(h)}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
};

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function PrivateStudyRooms({ language, children }: { language: "en" | "ar"; children?: React.ReactNode }) {
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
  const [presence, setPresence] = useState<Record<string, Presence>>({});
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
        share: "مشاركة الرابط", linkCopied: "تم نسخ رابط الغرفة",
        owner: "صاحب الغرفة", del: "حذف الرسالة", ban: "حظر", banned: "تم حظر العضو",
        banConfirm: "هل تريد حظر هذا الطالب من الغرفة؟", youBanned: "تم حظرك من هذه الغرفة",
        deleted: "تم حذف الرسالة", roomView: "قاعة الدراسة",
        makeOwner: "تعيين كصاحب الغرفة", ownerChanged: "تم نقل ملكية الغرفة",
        transferConfirm: "هل تريد جعل هذا الطالب صاحب الغرفة؟", noTimer: "لا يوجد مؤقّت",
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
        share: "Share link", linkCopied: "Room link copied",
        owner: "Owner", del: "Delete message", ban: "Ban", banned: "Member banned",
        banConfirm: "Ban this student from the room?", youBanned: "You are banned from this room",
        deleted: "Message deleted", roomView: "Study hall",
        makeOwner: "Make owner", ownerChanged: "Room ownership transferred",
        transferConfirm: "Make this student the room owner?", noTimer: "No timer",
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
    const [{ data: mem }, { data: msg }, { data: roomRow }] = await Promise.all([
      supabase.from("study_room_members").select("user_id,display_name").eq("room_id", roomId),
      supabase.from("study_room_messages")
        .select("id,user_id,display_name,body,created_at")
        .eq("room_id", roomId).order("created_at", { ascending: true }).limit(200),
      supabase.from("study_rooms").select("id,code,name,owner_id").eq("id", roomId).maybeSingle(),
    ]);
    if (roomRow) setRoom(roomRow as Room);
    const base = (mem ?? []) as Member[];
    if (base.length > 0) {
      const ids = base.map((m) => m.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id,gender,character")
        .in("user_id", ids);
      const { data: sess } = await supabase
        .from("active_sessions")
        .select("user_id,elapsed_seconds,is_running,subject")
        .in("user_id", ids);
      setPresence(
        Object.fromEntries(
          (sess ?? []).map((s: any) => [
            s.user_id,
            { elapsed_seconds: s.elapsed_seconds ?? 0, is_running: !!s.is_running, subject: s.subject ?? "" },
          ]),
        ),
      );
      const byId = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      setMembers(
        base.map((m) => {
          const p = byId.get(m.user_id);
          return {
            ...m,
            gender: (p?.gender === "female" ? "female" : "male") as Gender,
            character: (p?.character ?? null) as CharacterTraits | null,
          };
        }),
      );
    } else {
      setMembers(base);
      setPresence({});
    }
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

  // Refresh member timers periodically
  useEffect(() => {
    if (!room) return;
    const id = setInterval(() => loadRoom(room.id), 15000);
    return () => clearInterval(id);
  }, [room, loadRoom]);

  // Tick running timers locally between refreshes
  useEffect(() => {
    const id = setInterval(() => {
      setPresence((prev) => {
        const next: Record<string, Presence> = {};
        let changed = false;
        for (const [k, v] of Object.entries(prev)) {
          if (v.is_running) { next[k] = { ...v, elapsed_seconds: v.elapsed_seconds + 1 }; changed = true; }
          else next[k] = v;
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

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
    await joinByCode(code);
  };

  const joinByCode = async (code: string) => {
    if (!userId) { toast.error(L.signIn); return; }
    setBusy(true);
    try {
      const { data } = await supabase.from("study_rooms")
        .select("id,code,name,owner_id").eq("code", code).eq("is_active", true).maybeSingle();
      if (!data) { toast.error(L.notFound); return; }
      const { error } = await supabase.from("study_room_members")
        .upsert({ room_id: data.id, user_id: userId, display_name: displayName }, { onConflict: "room_id,user_id" });
      if (error) { toast.error(L.youBanned); return; }
      localStorage.setItem(LS_KEY, data.id);
      setRoom(data as Room);
      setJoinCode("");
      loadRoom(data.id);
      toast.success(L.joined);
    } finally { setBusy(false); }
  };

  // Auto-join from a shared invite link: /room?code=ABC123
  const autoJoined = useRef(false);
  useEffect(() => {
    if (!userId || autoJoined.current) return;
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) return;
    autoJoined.current = true;
    joinByCode(code.trim().toUpperCase());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const isOwner = !!room && room.owner_id === userId;

  const shareLink = () => {
    if (!room) return;
    const url = `${window.location.origin}/room?code=${room.code}`;
    if (navigator.share) {
      navigator.share({ title: room.name, url }).catch(() => {
        navigator.clipboard?.writeText(url);
        toast.success(L.linkCopied);
      });
    } else {
      navigator.clipboard?.writeText(url);
      toast.success(L.linkCopied);
    }
  };

  const deleteMessage = async (id: string) => {
    if (!room) return;
    const { error } = await supabase.from("study_room_messages").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(L.deleted);
    loadRoom(room.id);
  };

  const banMember = async (m: Member) => {
    if (!room || !userId) return;
    if (!window.confirm(L.banConfirm)) return;
    const { error } = await supabase.from("study_room_bans")
      .insert({ room_id: room.id, user_id: m.user_id, display_name: m.display_name, banned_by: userId });
    if (error && !error.message.includes("duplicate")) { toast.error(error.message); return; }
    await supabase.from("study_room_members").delete().eq("room_id", room.id).eq("user_id", m.user_id);
    await supabase.from("study_room_messages").delete().eq("room_id", room.id).eq("user_id", m.user_id);
    toast.success(L.banned);
    loadRoom(room.id);
  };

  const transferOwnership = async (m: Member) => {
    if (!room || !userId) return;
    if (!window.confirm(L.transferConfirm)) return;
    const { error } = await supabase.from("study_rooms")
      .update({ owner_id: m.user_id }).eq("id", room.id);
    if (error) { toast.error(error.message); return; }
    toast.success(L.ownerChanged);
    loadRoom(room.id);
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
      <section className="max-w-3xl mx-auto mb-8 rounded-2xl border border-primary/30 bg-secondary/40 backdrop-blur p-5" dir={ar ? "rtl" : "ltr"}>
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
        {children && <div className="mt-5 pt-5 border-t border-white/10">{children}</div>}
      </section>
    );
  }

  return (
    <section className="max-w-3xl mx-auto mb-8 rounded-2xl border border-primary/30 bg-secondary/40 backdrop-blur p-5" dir={ar ? "rtl" : "ltr"}>
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

      <button
        onClick={shareLink}
        className="w-full mb-3 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary flex items-center justify-center gap-1.5">
        <Link2 className="w-3.5 h-3.5" /> {L.share}
      </button>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
        <Users className="w-3.5 h-3.5" /> {L.members}: {members.length}
      </div>

      {/* Traditional study hall */}
      <div
        className="relative rounded-2xl border border-primary/30 overflow-hidden mb-4"
        style={{
          background:
            "linear-gradient(180deg, hsl(var(--secondary)) 0%, hsl(var(--secondary)) 52%, hsl(var(--muted)) 52%, hsl(var(--muted)) 100%)",
          minHeight: 220,
        }}
      >
        {/* Wall: chalkboard, clock, pennants */}
        <div className="absolute inset-x-0 top-0 h-[52%] pointer-events-none">
          <div className="absolute top-5 left-1/2 -translate-x-1/2 w-40 h-16 rounded-md border-4 border-primary/40 bg-primary/10 flex items-center justify-center">
            <span className="text-[10px] tracking-[0.25em] text-primary/80">{L.roomView}</span>
          </div>
          <div className="absolute top-4 right-5 w-8 h-8 rounded-full border-4 border-primary/40 bg-background/40 flex items-center justify-center">
            <span className="w-1 h-3 bg-primary/70 absolute" style={{ transformOrigin: "bottom", transform: "translateY(-25%) rotate(35deg)" }} />
            <span className="w-1 h-2 bg-primary/70 absolute" style={{ transformOrigin: "bottom", transform: "translateY(-20%) rotate(-40deg)" }} />
          </div>
          <div className="absolute top-3 left-5 flex gap-1">
            {["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#a855f7"].map((c, i) => (
              <div key={i} className="w-2 h-4 rounded-sm" style={{ background: c, opacity: 0.85 }} />
            ))}
          </div>
        </div>
        <div className="absolute left-0 right-0 top-[52%] h-px bg-primary/30" />

        <div className="relative z-10 pt-16 pb-5 px-3 flex flex-wrap gap-4 justify-center items-end">
          {members.map((m) => {
            const mine = m.user_id === userId;
            const roomOwner = m.user_id === room.owner_id;
            return (
              <div key={m.user_id} className="flex flex-col items-center" style={{ width: 96 }}>
                <div className={`mb-1 px-2 py-0.5 rounded-full backdrop-blur border text-[10px] font-medium max-w-[96px] truncate ${mine ? "bg-primary text-primary-foreground border-primary" : "bg-background/80 border-primary/30"}`}>
                  {mine ? (ar ? "أنت" : "You") : m.display_name}
                </div>
                <div className="relative">
                  <CharacterAvatar gender={m.gender ?? "male"} traits={m.character ?? undefined} size={76} />
                  {/* Wooden desk */}
                  <div className="w-20 h-3 -mt-2 mx-auto rounded-sm bg-gradient-to-b from-primary/40 to-primary/20 border border-primary/40" />
                  <div className="flex justify-between w-16 mx-auto">
                    <div className="w-0.5 h-3 bg-primary/40" />
                    <div className="w-0.5 h-3 bg-primary/40" />
                  </div>
                </div>
                {roomOwner && (
                  <span className="mt-1 text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">{L.owner}</span>
                )}
                <span className={`mt-1 flex items-center gap-1 text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-full border ${presence[m.user_id]?.is_running ? "bg-primary/15 text-primary border-primary/30" : "bg-background/60 text-muted-foreground border-white/10"}`}>
                  <Timer className="w-2.5 h-2.5" />
                  {presence[m.user_id] ? fmtClock(presence[m.user_id].elapsed_seconds) : "--:--"}
                </span>
                {isOwner && !mine && (
                  <div className="mt-1 flex flex-col items-center gap-0.5">
                    <button onClick={() => transferOwnership(m)} className="text-[10px] text-primary/90 hover:text-primary flex items-center gap-0.5">
                      <Crown className="w-3 h-3" /> {L.makeOwner}
                    </button>
                    <button onClick={() => banMember(m)} className="text-[10px] text-destructive/80 hover:text-destructive flex items-center gap-0.5">
                      <Ban className="w-3 h-3" /> {L.ban}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
            <div key={m.id} className={`flex items-center gap-1 ${mine ? "justify-end" : "justify-start"}`}>
              {(isOwner || mine) && (
                <button onClick={() => deleteMessage(m.id)} aria-label={L.del} title={L.del}
                  className="order-first text-muted-foreground/60 hover:text-destructive shrink-0">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
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

      {children && <div className="mt-5 pt-5 border-t border-white/10">{children}</div>}
    </section>
  );
}
