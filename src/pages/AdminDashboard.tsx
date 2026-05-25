import { useEffect, useState } from "react";
import { Shield, LogOut, FileText, Check, Trash2, Loader2, Download, Clock, Layers, Bell, Plus, Send, Newspaper, Upload } from "lucide-react";
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
  type Tab = "pending" | "approved" | "flashcards" | "notifications" | "news";
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
  type Notif = { id: string; title: string; body: string; created_at: string };
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [notifForm, setNotifForm] = useState({ title: "", body: "" });
  const loadNotifs = async () => {
    const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
    setNotifs((data ?? []) as Notif[]);
  };
  useEffect(() => { if (tab === "notifications") loadNotifs(); }, [tab]);
  const sendNotif = async () => {
    if (!notifForm.title.trim()) return toast.error("Title required");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("notifications").insert({ ...notifForm, created_by: u.user?.id });
    if (error) return toast.error(error.message);
    toast.success("Notification sent to all users");
    setNotifForm({ title: "", body: "" });
    loadNotifs();
  };
  const delNotif = async (id: string) => {
    if (!confirm("Delete this notification?")) return;
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setNotifs((r) => r.filter((x) => x.id !== id));
  };

  // News state
  type NewsRow = { id: string; title: string; description: string; image_path: string | null; created_at: string };
  const [news, setNews] = useState<NewsRow[]>([]);
  const [newsForm, setNewsForm] = useState<{ title: string; description: string; file: File | null }>({ title: "", description: "", file: null });
  const [newsBusy, setNewsBusy] = useState(false);
  const loadNews = async () => {
    const { data } = await supabase.from("news").select("*").order("created_at", { ascending: false });
    setNews((data ?? []) as NewsRow[]);
  };
  useEffect(() => { if (tab === "news") loadNews(); }, [tab]);
  const newsImageUrl = (p: string | null) => p ? supabase.storage.from("news").getPublicUrl(p).data.publicUrl : null;
  const postNews = async () => {
    if (!newsForm.title.trim()) return toast.error("Title required");
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
      const { error } = await supabase.from("news").insert({ title: newsForm.title, description: newsForm.description, image_path, created_by: u.user?.id });
      if (error) throw error;
      toast.success("News posted — all users notified");
      setNewsForm({ title: "", description: "", file: null });
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
        <div className="flex gap-2 border-b border-white/10 mb-6">
          <button onClick={() => setTab("pending")} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === "pending" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <Clock className="w-4 h-4 inline mr-1.5" />Summaries — Pending
          </button>
          <button onClick={() => setTab("approved")} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === "approved" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <Check className="w-4 h-4 inline mr-1.5" />Summaries — Approved
          </button>
          <button onClick={() => setTab("flashcards")} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === "flashcards" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <Layers className="w-4 h-4 inline mr-1.5" />Flashcards
          </button>
          <button onClick={() => setTab("notifications")} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === "notifications" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <Bell className="w-4 h-4 inline mr-1.5" />Notifications
          </button>
          <button onClick={() => setTab("news")} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === "news" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <Newspaper className="w-4 h-4 inline mr-1.5" />News
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