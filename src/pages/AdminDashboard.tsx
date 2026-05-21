import { useEffect, useState } from "react";
import { Shield, LogOut, FileText, Check, Trash2, Loader2, Download, Clock } from "lucide-react";
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
  const [tab, setTab] = useState<"pending" | "approved">("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = async () => {
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
        </div>

        {loading ? (
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