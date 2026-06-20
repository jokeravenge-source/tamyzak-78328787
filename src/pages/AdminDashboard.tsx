import { useEffect, useState } from "react";
import { Shield, LogOut, FileText, Check, Trash2, Loader2, Download, Clock, Layers, Bell, Plus, Send, Newspaper, Upload, Users as UsersIcon, Search, Ban, RotateCcw, UserCog, X, Timer, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SUMMARY_SUBJECTS } from "./Summaries";

type Row = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  subject: string;
  file_path: string;
  approved: boolean;
  created_at: string;
};

const AdminDashboard = ({ onLogout }: { onLogout: () => void }) => {
  type Tab = "pending" | "approved" | "flashcards" | "notifications" | "news" | "users" | "usernames" | "aifiles";
  const [tab, setTab] = useState<Tab>("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = async () => {
    if (tab !== "pending" && tab !== "approved") return;
    setLoading(true);
    const { data, error } = await supabase
      .from("summaries")
      .select("*")
      .eq("approved", tab === "approved")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, [tab]);

  // Flashcards state
  type FC = { id: string; subject: string; chapter: string; language: string; question: string; answer: string; created_at: string; approved: boolean; created_by: string | null };
  const [fcs, setFcs] = useState<FC[]>([]);
  const [fcLoading, setFcLoading] = useState(false);
  const [fcForm, setFcForm] = useState({ subject: "physics", chapter: "1", language: "en", question: "", answer: "" });
  const [fcFilter, setFcFilter] = useState<"pending" | "approved">("pending");
  const loadFcs = async () => {
    setFcLoading(true);
    const { data } = await supabase
      .from("custom_flashcards")
      .select("*")
      .eq("approved", fcFilter === "approved")
      .order("created_at", { ascending: false });
    setFcs((data ?? []) as FC[]);
    setFcLoading(false);
  };
  useEffect(() => { if (tab === "flashcards") loadFcs(); }, [tab, fcFilter]);
  const addFc = async () => {
    if (!fcForm.question.trim() || !fcForm.answer.trim()) return toast.error("Question and answer required");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("custom_flashcards").insert({ ...fcForm, created_by: u.user?.id, approved: true });
    if (error) return toast.error(error.message);
    toast.success("Flashcard added");
    setFcForm({ ...fcForm, question: "", answer: "" });
    loadFcs();
  };
  const approveFc = async (id: string) => {
    const { error } = await supabase.from("custom_flashcards").update({ approved: true }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Approved");
    setFcs((r) => r.filter((x) => x.id !== id));
  };
  const delFc = async (id: string) => {
    if (!confirm("Delete this flashcard?")) return;
    const { error } = await supabase.from("custom_flashcards").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setFcs((r) => r.filter((x) => x.id !== id));
  };

  // Notifications state
  type Notif = { id: string; title: string; body: string; link: string | null; created_at: string };
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [notifForm, setNotifForm] = useState({ title: "", body: "", link: "" });
  const loadNotifs = async () => {
    const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
    setNotifs((data ?? []) as Notif[]);
  };
  useEffect(() => { if (tab === "notifications") loadNotifs(); }, [tab]);
  const sendNotif = async () => {
    if (!notifForm.title.trim()) return toast.error("Title required");
    const link = notifForm.link.trim();
    if (link && !/^https?:\/\//i.test(link)) return toast.error("Link must start with http:// or https://");
    const { data: u } = await supabase.auth.getUser();
    const { data: inserted, error } = await supabase.from("notifications").insert({ title: notifForm.title, body: notifForm.body, link: link || null, created_by: u.user?.id }).select("id").single();
    if (error) return toast.error(error.message);
    toast.success("Notification sent to all users");
    try {
      const { data: tg } = await supabase.functions.invoke("telegram-notify", {
        body: { title: notifForm.title, body: notifForm.body, link: link || null, audience: "all", notification_key: `notif:${inserted?.id}` },
      });
      if (tg && typeof tg === "object" && "sent" in (tg as Record<string, unknown>)) {
        const t = tg as { sent: number; failed: number; total: number };
        toast.success(`Telegram: ${t.sent}/${t.total} delivered${t.failed ? ` (${t.failed} failed)` : ""}`);
      }
    } catch (e: any) {
      toast.error(`Telegram push failed: ${e?.message ?? e}`);
    }
    setNotifForm({ title: "", body: "", link: "" });
    loadNotifs();
  };
  const delNotif = async (id: string) => {
    if (!confirm("Delete this notification?")) return;
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setNotifs((r) => r.filter((x) => x.id !== id));
  };

  // News state
  type NewsRow = { id: string; title: string; description: string; image_path: string | null; link: string | null; created_at: string };
  const [news, setNews] = useState<NewsRow[]>([]);
  const [newsForm, setNewsForm] = useState<{ title: string; description: string; link: string; file: File | null }>({ title: "", description: "", link: "", file: null });
  const [newsBusy, setNewsBusy] = useState(false);
  const loadNews = async () => {
    const { data } = await supabase.from("news").select("*").order("created_at", { ascending: false });
    setNews((data ?? []) as NewsRow[]);
  };
  useEffect(() => { if (tab === "news") loadNews(); }, [tab]);
  const newsImageUrl = (p: string | null) => p ? supabase.storage.from("news").getPublicUrl(p).data.publicUrl : null;
  const postNews = async () => {
    if (!newsForm.title.trim()) return toast.error("Title required");
    const linkTrim = newsForm.link.trim();
    if (linkTrim) {
      try { new URL(linkTrim); } catch { return toast.error("Invalid link URL"); }
    }
    setNewsBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      let image_path: string | null = null;
      if (newsForm.file) {
        const ext = newsForm.file.name.split(".").pop() || "jpg";
        const path = `${u.user?.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("news").upload(path, newsForm.file);
        if (upErr) throw upErr;
        image_path = path;
      }
      const { data: newsRow, error } = await supabase.from("news").insert({ title: newsForm.title, description: newsForm.description, image_path, link: linkTrim || null, created_by: u.user?.id }).select("id").single();
      if (error) throw error;
      toast.success("News posted — all users notified");
      try {
        const { data: tg } = await supabase.functions.invoke("telegram-notify", {
          body: { title: `📰 ${newsForm.title}`, body: newsForm.description, link: linkTrim || null, audience: "all", notification_key: `news:${newsRow?.id}` },
        });
        if (tg && typeof tg === "object" && "sent" in (tg as Record<string, unknown>)) {
          const t = tg as { sent: number; failed: number; total: number };
          toast.success(`Telegram: ${t.sent}/${t.total} delivered${t.failed ? ` (${t.failed} failed)` : ""}`);
        }
      } catch (e: any) {
        toast.error(`Telegram push failed: ${e?.message ?? e}`);
      }
      setNewsForm({ title: "", description: "", link: "", file: null });
      loadNews();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setNewsBusy(false);
    }
  };
  const delNews = async (n: NewsRow) => {
    if (!confirm("Delete this news item?")) return;
    if (n.image_path) await supabase.storage.from("news").remove([n.image_path]);
    const { error } = await supabase.from("news").delete().eq("id", n.id);
    if (error) return toast.error(error.message);
    setNews((r) => r.filter((x) => x.id !== n.id));
  };

  // Users / Bans state
  type UserRow = { user_id: string; display_name: string; email: string | null; banned: boolean; banned_until: string | null };
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<UserRow[]>([]);
  const [userBusy, setUserBusy] = useState(false);
  const [userActionId, setUserActionId] = useState<string | null>(null);
  const searchUsers = async () => {
    if (!userQuery.trim()) { setUserResults([]); return; }
    setUserBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-users", { body: { action: "search", q: userQuery.trim() } });
    setUserBusy(false);
    if (error) return toast.error(error.message);
    setUserResults(((data as any)?.users ?? []) as UserRow[]);
  };
  const toggleBan = async (u: UserRow) => {
    const action = u.banned ? "unban" : "ban";
    if (action === "ban" && !confirm(`Ban ${u.display_name}? They won't be able to sign in.`)) return;
    setUserActionId(u.user_id);
    const { data, error } = await supabase.functions.invoke("admin-manage-users", { body: { action, user_id: u.user_id } });
    setUserActionId(null);
    if (error || (data as any)?.error) return toast.error(error?.message ?? (data as any)?.error ?? "Failed");
    toast.success(action === "ban" ? "User banned" : "User unbanned");
    setUserResults((r) => r.map((x) => x.user_id === u.user_id ? { ...x, banned: !u.banned } : x));
  };

  // Per-user study sessions (admin can view + delete)
  type SessionRow = { id: string; subject: string; mission: string | null; duration_seconds: number; points: number; mission_completed: boolean; created_at: string };
  const [openSessionsFor, setOpenSessionsFor] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionBusyId, setSessionBusyId] = useState<string | null>(null);
  const toggleSessions = async (u: UserRow) => {
    if (openSessionsFor === u.user_id) { setOpenSessionsFor(null); setSessions([]); return; }
    setOpenSessionsFor(u.user_id);
    setSessions([]);
    setSessionsLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-users", { body: { action: "list_sessions", user_id: u.user_id } });
    setSessionsLoading(false);
    if (error || (data as any)?.error) return toast.error(error?.message ?? (data as any)?.error ?? "Failed");
    setSessions(((data as any)?.sessions ?? []) as SessionRow[]);
  };
  const deleteSession = async (s: SessionRow) => {
    if (!confirm(`Delete this ${s.subject} session (${Math.round(s.duration_seconds / 60)} min, ${s.points} pts)? Points awarded will also be removed.`)) return;
    setSessionBusyId(s.id);
    const { data, error } = await supabase.functions.invoke("admin-manage-users", { body: { action: "delete_session", session_id: s.id } });
    setSessionBusyId(null);
    if (error || (data as any)?.error) return toast.error(error?.message ?? (data as any)?.error ?? "Failed");
    toast.success("Session deleted");
    setSessions((r) => r.filter((x) => x.id !== s.id));
  };
  const fmtDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  // Username change requests state
  type UReq = { id: string; user_id: string; current_name: string | null; requested_name: string; status: string; created_at: string };
  const [ureqs, setUreqs] = useState<UReq[]>([]);
  const [ureqLoading, setUreqLoading] = useState(false);
  const [ureqBusyId, setUreqBusyId] = useState<string | null>(null);
  const loadUreqs = async () => {
    setUreqLoading(true);
    const { data, error } = await supabase
      .from("username_requests")
      .select("id, user_id, current_name, requested_name, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setUreqs((data ?? []) as UReq[]);
    setUreqLoading(false);
  };
  useEffect(() => { if (tab === "usernames") loadUreqs(); }, [tab]);

  // AI Files (subject reference indexing)
  const SUBJECTS = ["biology","physics","chemistry","arabic","french","english"];
  type StorageObj = { name: string };
  type IndexedRow = { file_name: string; char_count: number; updated_at: string };
  const [aiSubject, setAiSubject] = useState("biology");
  const [aiFiles, setAiFiles] = useState<StorageObj[]>([]);
  const [aiIndexed, setAiIndexed] = useState<IndexedRow[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [aiUploading, setAiUploading] = useState(false);
  const loadAi = async () => {
    setAiLoading(true);
    const [filesRes, idxRes] = await Promise.all([
      supabase.storage.from("files").list(aiSubject, { limit: 100 }),
      supabase.from("subject_file_text").select("file_name,char_count,updated_at").eq("subject", aiSubject),
    ]);
    setAiFiles((filesRes.data ?? []).filter((o) => o.name && !o.name.startsWith(".") && o.name !== ".lovkeep"));
    setAiIndexed((idxRes.data ?? []) as IndexedRow[]);
    setAiLoading(false);
  };
  useEffect(() => { if (tab === "aifiles") loadAi(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab, aiSubject]);
  const uploadAi = async (file: File) => {
    setAiUploading(true);
    const path = `${aiSubject}/${file.name}`;
    const { error } = await supabase.storage.from("files").upload(path, file, { upsert: true });
    setAiUploading(false);
    if (error) return toast.error(error.message);
    toast.success("Uploaded. Click Index to extract text.");
    loadAi();
  };
  const indexOne = async (name: string) => {
    setAiBusy(name);
    const { data, error } = await supabase.functions.invoke("index-subject-file", { body: { subject: aiSubject, file_name: name } });
    setAiBusy(null);
    if (error) return toast.error(error.message);
    const r = (data as { results?: Array<{ ok: boolean; chars?: number; error?: string }> })?.results?.[0];
    if (r?.ok) toast.success(`Indexed (${r.chars} chars)`); else toast.error(r?.error ?? "Index failed");
    loadAi();
  };
  const indexAll = async () => {
    setAiBusy("__all__");
    const { data, error } = await supabase.functions.invoke("index-subject-file", { body: { subject: aiSubject, all: true } });
    setAiBusy(null);
    if (error) return toast.error(error.message);
    const results = (data as { results?: Array<{ ok: boolean }> })?.results ?? [];
    toast.success(`Indexed ${results.filter((x) => x.ok).length}/${results.length} files`);
    loadAi();
  };
  const deleteAi = async (name: string) => {
    if (!confirm(`Delete ${name} from storage and index?`)) return;
    await supabase.storage.from("files").remove([`${aiSubject}/${name}`]);
    await supabase.from("subject_file_text").delete().eq("subject", aiSubject).eq("file_name", name);
    toast.success("Deleted");
    loadAi();
  };
  const decideUreq = async (r: UReq, decision: "approved" | "rejected") => {
    const { data: u } = await supabase.auth.getUser();
    setUreqBusyId(r.id);
    const { error } = await supabase
      .from("username_requests")
      .update({ status: decision, reviewed_by: u.user?.id, reviewed_at: new Date().toISOString() })
      .eq("id", r.id);
    setUreqBusyId(null);
    if (error) return toast.error(error.message);
    toast.success(decision === "approved" ? "Name change approved" : "Request rejected");
    setUreqs((rs) => rs.filter((x) => x.id !== r.id));
  };

  const approve = async (id: string) => {
    const { error } = await supabase.from("summaries").update({ approved: true }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Approved");
    setRows((r) => r.filter((x) => x.id !== id));
  };

  const remove = async (id: string, path: string) => {
    if (!confirm("Delete this file permanently?")) return;
    await supabase.storage.from("summaries").remove([path]);
    const { error } = await supabase.from("summaries").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    setRows((r) => r.filter((x) => x.id !== id));
  };

  const view = async (path: string) => {
    const { data, error } = await supabase.storage.from("summaries").createSignedUrl(path, 120);
    if (error || !data) return toast.error(error?.message ?? "Failed");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const subjLabel = (code: string) => SUMMARY_SUBJECTS.find((s) => s.code === code)?.en ?? code;
  const subjTag = (code: string) => SUMMARY_SUBJECTS.find((s) => s.code === code)?.tag ?? `#${code}`;

  return (
    <main className="min-h-screen px-4 py-10 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <header className="max-w-6xl mx-auto flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text leading-tight">Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground">Manage uploaded content</p>
          </div>
        </div>
        <button onClick={logout} className="inline-flex items-center gap-2 px-3 h-10 rounded-xl border border-white/10 bg-secondary/60 hover:bg-secondary text-sm">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </header>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex gap-2 border-b border-white/10 mb-6 overflow-x-auto no-scrollbar">
          <button onClick={() => setTab("pending")} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${tab === "pending" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <Clock className="w-4 h-4 inline mr-1.5" />Summaries — Pending
          </button>
          <button onClick={() => setTab("approved")} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${tab === "approved" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <Check className="w-4 h-4 inline mr-1.5" />Summaries — Approved
          </button>
          <button onClick={() => setTab("flashcards")} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${tab === "flashcards" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <Layers className="w-4 h-4 inline mr-1.5" />Flashcards
          </button>
          <button onClick={() => setTab("notifications")} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${tab === "notifications" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <Bell className="w-4 h-4 inline mr-1.5" />Notifications
          </button>
          <button onClick={() => setTab("news")} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${tab === "news" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <Newspaper className="w-4 h-4 inline mr-1.5" />News
          </button>
          <button onClick={() => setTab("users")} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${tab === "users" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <UsersIcon className="w-4 h-4 inline mr-1.5" />Users
          </button>
          <button onClick={() => setTab("usernames")} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${tab === "usernames" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <UserCog className="w-4 h-4 inline mr-1.5" />Username Requests
          </button>
          <button onClick={() => setTab("aifiles")} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${tab === "aifiles" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <BookOpen className="w-4 h-4 inline mr-1.5" />AI Files
          </button>
        </div>

        {tab === "flashcards" ? (
          <div className="space-y-6">
            <div className="rounded-2xl p-5 border border-white/10 bg-secondary/40 backdrop-blur space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Add flashcard</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select value={fcForm.subject} onChange={(e) => setFcForm({ ...fcForm, subject: e.target.value })} className="h-10 px-3 rounded-lg bg-background border border-white/10 text-sm">
                  {["physics","chemistry","biology","english","french","arabic"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <input value={fcForm.chapter} onChange={(e) => setFcForm({ ...fcForm, chapter: e.target.value })} placeholder="Chapter (e.g. 1)" className="h-10 px-3 rounded-lg bg-background border border-white/10 text-sm" />
                <select value={fcForm.language} onChange={(e) => setFcForm({ ...fcForm, language: e.target.value })} className="h-10 px-3 rounded-lg bg-background border border-white/10 text-sm">
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                </select>
              </div>
              <textarea value={fcForm.question} onChange={(e) => setFcForm({ ...fcForm, question: e.target.value })} placeholder="Question" rows={2} className="w-full px-3 py-2 rounded-lg bg-background border border-white/10 text-sm" />
              <textarea value={fcForm.answer} onChange={(e) => setFcForm({ ...fcForm, answer: e.target.value })} placeholder="Answer" rows={3} className="w-full px-3 py-2 rounded-lg bg-background border border-white/10 text-sm" />
              <button onClick={addFc} className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm">
                <Plus className="w-4 h-4" /> Add flashcard
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setFcFilter("pending")} className={`px-3 py-1.5 rounded-full text-xs border ${fcFilter === "pending" ? "bg-primary text-primary-foreground border-primary" : "border-white/10 bg-secondary/40 text-muted-foreground"}`}>
                <Clock className="w-3 h-3 inline mr-1" /> Pending review
              </button>
              <button onClick={() => setFcFilter("approved")} className={`px-3 py-1.5 rounded-full text-xs border ${fcFilter === "approved" ? "bg-primary text-primary-foreground border-primary" : "border-white/10 bg-secondary/40 text-muted-foreground"}`}>
                <Check className="w-3 h-3 inline mr-1" /> Approved
              </button>
            </div>
            {fcLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : fcs.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">{fcFilter === "pending" ? "No pending submissions." : "No approved flashcards yet."}</p>
            ) : (
              <div className="grid gap-3">
                {fcs.map((f) => (
                  <article key={f.id} className="rounded-2xl p-4 border border-white/10 bg-secondary/40 backdrop-blur flex flex-wrap items-start gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mb-1">
                        <span className="px-2 py-0.5 rounded-full border border-primary/30 text-primary">{f.subject}</span>
                        <span>Ch {f.chapter}</span>
                        <span>· {f.language.toUpperCase()}</span>
                        {!f.approved && <span className="px-2 py-0.5 rounded-full border border-amber-500/40 text-amber-400">Pending</span>}
                      </div>
                      <p className="font-medium">{f.question}</p>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{f.answer}</p>
                    </div>
                    {!f.approved && (
                      <button onClick={() => approveFc(f.id)} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm">
                        <Check className="w-4 h-4" /> Approve
                      </button>
                    )}
                    <button onClick={() => delFc(f.id)} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm">
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : tab === "notifications" ? (
          <div className="space-y-6">
            <div className="rounded-2xl p-5 border border-white/10 bg-secondary/40 backdrop-blur space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><Send className="w-4 h-4 text-primary" /> Send notification to everyone</h3>
              <input value={notifForm.title} onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value })} placeholder="Title" className="w-full h-10 px-3 rounded-lg bg-background border border-white/10 text-sm" />
              <textarea value={notifForm.body} onChange={(e) => setNotifForm({ ...notifForm, body: e.target.value })} placeholder="Message (optional)" rows={3} className="w-full px-3 py-2 rounded-lg bg-background border border-white/10 text-sm" />
              <input value={notifForm.link} onChange={(e) => setNotifForm({ ...notifForm, link: e.target.value })} placeholder="Link (optional, https://...)" className="w-full h-10 px-3 rounded-lg bg-background border border-white/10 text-sm" />
              <button onClick={sendNotif} className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm">
                <Send className="w-4 h-4" /> Send
              </button>
            </div>
            {notifs.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">No notifications yet.</p>
            ) : (
              <div className="grid gap-3">
                {notifs.map((n) => (
                  <article key={n.id} className="rounded-2xl p-4 border border-white/10 bg-secondary/40 backdrop-blur flex items-start gap-4">
                    <Bell className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold">{n.title}</h4>
                      {n.body && <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{n.body}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                    <button onClick={() => delNotif(n.id)} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm">
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : tab === "news" ? (
          <div className="space-y-6">
            <div className="rounded-2xl p-5 border border-white/10 bg-secondary/40 backdrop-blur space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><Newspaper className="w-4 h-4 text-primary" /> Post news</h3>
              <input value={newsForm.title} onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })} placeholder="Title" className="w-full h-10 px-3 rounded-lg bg-background border border-white/10 text-sm" />
              <textarea value={newsForm.description} onChange={(e) => setNewsForm({ ...newsForm, description: e.target.value })} placeholder="Description" rows={4} className="w-full px-3 py-2 rounded-lg bg-background border border-white/10 text-sm" />
              <input value={newsForm.link} onChange={(e) => setNewsForm({ ...newsForm, link: e.target.value })} placeholder="Link (optional, https://...)" className="w-full h-10 px-3 rounded-lg bg-background border border-white/10 text-sm" />
              <label className="inline-flex items-center gap-2 px-3 h-10 rounded-lg border border-white/10 bg-background text-sm cursor-pointer hover:border-primary/40">
                <Upload className="w-4 h-4" />
                <span>{newsForm.file ? newsForm.file.name : "Choose image (optional)"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setNewsForm({ ...newsForm, file: e.target.files?.[0] ?? null })} />
              </label>
              <div>
                <button disabled={newsBusy} onClick={postNews} className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm disabled:opacity-60">
                  {newsBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Post & notify
                </button>
              </div>
            </div>
            {news.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">No news yet.</p>
            ) : (
              <div className="grid gap-3">
                {news.map((n) => (
                  <article key={n.id} className="rounded-2xl p-4 border border-white/10 bg-secondary/40 backdrop-blur flex items-start gap-4">
                    {n.image_path ? (
                      <img src={newsImageUrl(n.image_path)!} alt={n.title} className="w-24 h-24 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-24 h-24 rounded-xl bg-primary/15 flex items-center justify-center shrink-0"><Newspaper className="w-6 h-6 text-primary" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold">{n.title}</h4>
                      {n.description && <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap line-clamp-3">{n.description}</p>}
                      {n.link && <a href={n.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline break-all mt-1 inline-block">{n.link}</a>}
                      <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                    <button onClick={() => delNews(n)} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm">
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : tab === "users" ? (
          <div className="space-y-6">
            <div className="rounded-2xl p-5 border border-white/10 bg-secondary/40 backdrop-blur space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><UsersIcon className="w-4 h-4 text-primary" /> Search users by name</h3>
              <div className="flex gap-2">
                <input
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") searchUsers(); }}
                  placeholder="Type a display name..."
                  className="flex-1 h-10 px-3 rounded-lg bg-background border border-white/10 text-sm"
                />
                <button onClick={searchUsers} disabled={userBusy} className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm disabled:opacity-60">
                  {userBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Search
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Banning a user blocks them from signing in. Admin accounts cannot be banned.</p>
            </div>
            {userResults.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">{userBusy ? "Searching..." : "No results yet — enter a name above."}</p>
            ) : (
              <div className="grid gap-3">
                {userResults.map((u) => (
                  <article key={u.user_id} className="rounded-2xl p-4 border border-white/10 bg-secondary/40 backdrop-blur">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                        <UsersIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{u.display_name}</h3>
                          {u.banned && <span className="text-xs px-2 py-0.5 rounded-full border border-red-500/40 text-red-400">Banned</span>}
                        </div>
                        {u.email && <p className="text-xs text-muted-foreground mt-0.5 break-all">{u.email}</p>}
                      </div>
                      <button
                        onClick={() => toggleSessions(u)}
                        className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-white/10 hover:border-primary/40 text-sm"
                      >
                        <Timer className="w-4 h-4" />
                        {openSessionsFor === u.user_id ? "Hide sessions" : "Sessions"}
                      </button>
                      <button
                        onClick={() => toggleBan(u)}
                        disabled={userActionId === u.user_id}
                        className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm disabled:opacity-60 ${u.banned ? "border border-primary/40 text-primary hover:bg-primary/10" : "border border-red-500/40 text-red-400 hover:bg-red-500/10"}`}
                      >
                        {userActionId === u.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : (u.banned ? <RotateCcw className="w-4 h-4" /> : <Ban className="w-4 h-4" />)}
                        {u.banned ? "Unban" : "Ban"}
                      </button>
                    </div>
                    {openSessionsFor === u.user_id && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        {sessionsLoading ? (
                          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                        ) : sessions.length === 0 ? (
                          <p className="text-center text-sm text-muted-foreground py-4">No saved sessions for this user.</p>
                        ) : (
                          <ul className="grid gap-2">
                            {sessions.map((s) => (
                              <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-background/40 px-3 py-2 text-sm">
                                <span className="px-2 py-0.5 rounded-full border border-primary/30 text-primary text-xs">{s.subject}</span>
                                <span className="font-medium">{fmtDuration(s.duration_seconds)}</span>
                                <span className="text-xs text-muted-foreground">+{s.points} pts</span>
                                {s.mission_completed && <span className="text-xs text-primary">✓ mission</span>}
                                {s.mission && <span className="text-xs text-muted-foreground truncate max-w-[260px]">— {s.mission}</span>}
                                <span className="text-[11px] text-muted-foreground ms-auto">{new Date(s.created_at).toLocaleString()}</span>
                                <button
                                  onClick={() => deleteSession(s)}
                                  disabled={sessionBusyId === s.id}
                                  className="inline-flex items-center gap-1 px-2 h-8 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs disabled:opacity-60"
                                >
                                  {sessionBusyId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                  Delete
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : tab === "usernames" ? (
          <div className="space-y-6">
            <div className="rounded-2xl p-5 border border-white/10 bg-secondary/40 backdrop-blur">
              <h3 className="font-semibold flex items-center gap-2"><UserCog className="w-4 h-4 text-primary" /> Pending username change requests</h3>
              <p className="text-xs text-muted-foreground mt-1">Approve to update the user's display name. Reject to deny the change.</p>
            </div>
            {ureqLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : ureqs.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">No pending username requests.</p>
            ) : (
              <div className="grid gap-3">
                {ureqs.map((r) => (
                  <article key={r.id} className="rounded-2xl p-4 border border-white/10 bg-secondary/40 backdrop-blur flex flex-wrap items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                      <UserCog className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-[220px]">
                      <div className="text-xs text-muted-foreground">From</div>
                      <div className="font-medium">{r.current_name || <span className="italic text-muted-foreground">(no name)</span>}</div>
                      <div className="text-xs text-muted-foreground mt-1">To</div>
                      <div className="font-semibold text-primary">{r.requested_name}</div>
                      <p className="text-[11px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={ureqBusyId === r.id}
                        onClick={() => decideUreq(r, "approved")}
                        className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm disabled:opacity-60"
                      >
                        {ureqBusyId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approve
                      </button>
                      <button
                        disabled={ureqBusyId === r.id}
                        onClick={() => decideUreq(r, "rejected")}
                        className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm disabled:opacity-60"
                      >
                        <X className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">No items.</p>
        ) : (
          <div className="grid gap-3">
            {rows.map((r) => (
              <article key={r.id} className="rounded-2xl p-4 border border-white/10 bg-secondary/40 backdrop-blur flex flex-wrap items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{r.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full border border-primary/30 text-primary">{subjTag(r.subject)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{subjLabel(r.subject)} · {new Date(r.created_at).toLocaleDateString()}</p>
                  {r.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => view(r.file_path)} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-white/10 hover:border-primary/40 text-sm">
                    <Download className="w-4 h-4" /> View
                  </button>
                  {!r.approved && (
                    <button onClick={() => approve(r.id)} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm">
                      <Check className="w-4 h-4" /> Approve
                    </button>
                  )}
                  <button onClick={() => remove(r.id, r.file_path)} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm">
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default AdminDashboard;