import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, LogIn, LogOut, Plus, Trash2, Check, X, ShieldAlert, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type MCQ = { question: string; choices: string[]; answer_index: number; hint?: string; explanation?: string };
type MCQSet = { id: string; teacher_id: string; topic_key: string; title: string; questions: MCQ[]; created_at: string };
type Pending = {
  id: string;
  teacher_id: string;
  topic_key: string;
  action: "delete" | "add";
  question_index: number | null;
  new_question: MCQ | null;
  status: "pending" | "approved" | "rejected";
  requested_by: string | null;
  created_at: string;
};

const TEACHER_ID = "mohammed-anzi";
const LEC_COUNTS: Record<"ar" | "en", number> = { ar: 23, en: 22 };
const OWNER_EMAIL = "majs11@gmail.com";
type Mode = "admin" | "reviewer";

function buildTopicKey(lang: "ar" | "en", n: number) {
  return `anzi-${lang}-ch3-lec${n}-exam`;
}
function labelFor(topicKey: string) {
  const m = /^anzi-(ar|en)-ch3-lec(\d+)-exam$/.exec(topicKey);
  if (!m) return topicKey;
  return `${m[1].toUpperCase()} · Lecture ${m[2]}`;
}

export default function AdminMcqReview() {
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem("mcqReviewMode") as Mode) || "reviewer");

  const isOwner = (userEmail ?? "").toLowerCase() === OWNER_EMAIL;

  const check = async () => {
    setChecking(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setIsAdmin(false); setUserEmail(null); setChecking(false); return; }
    setUserEmail(u.user.email ?? null);
    const { data: role } = await supabase
      .from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    setIsAdmin(!!role);
    setChecking(false);
  };
  useEffect(() => { check(); }, []);

  // This standalone route bypasses the app-level theme initializer.
  useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains("theme-notion-dark");
    root.classList.add("theme-notion-dark");
    return () => { if (!had) root.classList.remove("theme-notion-dark"); };
  }, []);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "admin" && email.trim().toLowerCase() !== OWNER_EMAIL) {
        throw new Error("Only the owner account can sign in as Admin");
      }
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      localStorage.setItem("mcqReviewMode", mode);
      await check();
    } catch (err: any) {
      toast.error(err.message || "Sign-in failed");
    } finally { setBusy(false); }
  };
  const signOut = async () => { await supabase.auth.signOut(); await check(); };

  if (checking) {
    return <div className="theme-notion-dark min-h-screen grid place-items-center bg-background text-foreground"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (!userEmail) {
    return (
      <div className="theme-notion-dark min-h-screen grid place-items-center bg-background text-foreground p-6">
        <form onSubmit={signIn} className="w-full max-w-sm rounded-lg border border-border bg-card text-card-foreground p-6 space-y-4 shadow-card">
          <h1 className="text-xl font-bold">MCQ Review · Sign-In</h1>
          <p className="text-sm text-muted-foreground">Choose how you want to sign in</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setMode("admin")}
              className={`h-10 rounded-md border text-sm font-medium ${mode === "admin" ? "border-primary bg-primary/15 text-primary" : "border-input bg-background text-foreground hover:bg-secondary"}`}>
              Admin
            </button>
            <button type="button" onClick={() => setMode("reviewer")}
              className={`h-10 rounded-md border text-sm font-medium ${mode === "reviewer" ? "border-primary bg-primary/15 text-primary" : "border-input bg-background text-foreground hover:bg-secondary"}`}>
              Reviewer
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {mode === "admin"
              ? "Admin can approve or reject pending changes (owner account only)."
              : "Reviewer can propose add/delete requests for approval."}
          </p>
          <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-background border border-input text-foreground placeholder:text-muted-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-background border border-input text-foreground placeholder:text-muted-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />} Sign in
          </Button>
        </form>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="theme-notion-dark min-h-screen grid place-items-center bg-background text-foreground p-6">
        <div className="w-full max-w-md rounded-lg border border-destructive/40 bg-card text-card-foreground p-6 space-y-3 text-center shadow-card">
          <ShieldAlert className="w-8 h-8 text-destructive mx-auto" />
          <p className="font-semibold">This account is not an admin.</p>
          <p className="text-xs text-muted-foreground">{userEmail}</p>
          <Button onClick={signOut} variant="outline" size="sm">
            <LogOut className="w-4 h-4" /> Sign out
          </Button>
        </div>
      </div>
    );
  }

  const effectiveMode: Mode = mode === "admin" && isOwner ? "admin" : "reviewer";
  return <ReviewPanel userEmail={userEmail} onSignOut={signOut} mode={effectiveMode} />;
}

function ReviewPanel({ userEmail, onSignOut, mode }: { userEmail: string; onSignOut: () => void; mode: Mode }) {
  const canModerate = mode === "admin";
  const [sets, setSets] = useState<MCQSet[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from("teacher_topic_mcqs").select("id, teacher_id, topic_key, title, questions, created_at")
        .eq("teacher_id", TEACHER_ID).order("topic_key"),
      supabase.from("teacher_mcq_pending_changes").select("*").eq("status", "pending").order("created_at", { ascending: false }),
    ]);
    setSets((s ?? []) as unknown as MCQSet[]);
    setPending((p ?? []) as unknown as Pending[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setsByKey = useMemo(() => {
    const m = new Map<string, MCQSet>();
    sets.forEach((s) => m.set(s.topic_key, s));
    return m;
  }, [sets]);

  const pendingByKey = useMemo(() => {
    const m = new Map<string, Pending[]>();
    pending.forEach((p) => {
      const arr = m.get(p.topic_key) ?? [];
      arr.push(p); m.set(p.topic_key, arr);
    });
    return m;
  }, [pending]);

  const requestDelete = async (topicKey: string, questionIndex: number) => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("teacher_mcq_pending_changes").insert({
      teacher_id: TEACHER_ID, topic_key: topicKey, action: "delete",
      question_index: questionIndex, requested_by: u.user?.id, status: "pending",
    });
    if (error) return toast.error(error.message);
    toast.success("Delete request submitted (needs approval)");
    load();
  };

  const requestAdd = async (topicKey: string, q: MCQ) => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("teacher_mcq_pending_changes").insert({
      teacher_id: TEACHER_ID, topic_key: topicKey, action: "add",
      new_question: q as any, requested_by: u.user?.id, status: "pending",
    });
    if (error) return toast.error(error.message);
    toast.success("Add request submitted (needs approval)");
    load();
  };

  const approve = async (change: Pending) => {
    const set = setsByKey.get(change.topic_key);
    if (change.action === "delete") {
      if (!set || change.question_index == null) return toast.error("Target set missing");
      const next = set.questions.filter((_, i) => i !== change.question_index);
      const { error } = await supabase.from("teacher_topic_mcqs").update({ questions: next as any }).eq("id", set.id);
      if (error) return toast.error(error.message);
    } else {
      if (!change.new_question) return toast.error("Missing question");
      if (set) {
        const next = [...set.questions, change.new_question];
        const { error } = await supabase.from("teacher_topic_mcqs").update({ questions: next as any }).eq("id", set.id);
        if (error) return toast.error(error.message);
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("teacher_topic_mcqs").insert({
          teacher_id: TEACHER_ID, topic_key: change.topic_key,
          title: labelFor(change.topic_key), questions: [change.new_question] as any,
          created_by: u.user?.id,
        });
        if (error) return toast.error(error.message);
      }
    }
    const { data: u2 } = await supabase.auth.getUser();
    await supabase.from("teacher_mcq_pending_changes").update({
      status: "approved", reviewed_by: u2.user?.id, reviewed_at: new Date().toISOString(),
    }).eq("id", change.id);
    toast.success("Approved & applied");
    load();
  };

  const reject = async (change: Pending) => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("teacher_mcq_pending_changes").update({
      status: "rejected", reviewed_by: u.user?.id, reviewed_at: new Date().toISOString(),
    }).eq("id", change.id);
    if (error) return toast.error(error.message);
    toast.success("Rejected");
    load();
  };

  const allLectures: Array<{ lang: "ar" | "en"; n: number; topicKey: string }> = [];
  (["ar", "en"] as const).forEach((lang) => {
    for (let n = 1; n <= LEC_COUNTS[lang]; n++) allLectures.push({ lang, n, topicKey: buildTopicKey(lang, n) });
  });

  return (
    <div className="theme-notion-dark min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 text-card-foreground backdrop-blur px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">{canModerate ? "Admin" : "Reviewer"} · MCQ Review</h1>
          <p className="text-xs text-muted-foreground">{userEmail}</p>
        </div>
        <Button onClick={onSignOut} variant="outline" size="sm">
          <LogOut className="w-4 h-4" /> Sign out
        </Button>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-8">
        <section>
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-3">
            Pending approvals ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending changes.</p>
          ) : (
            <ul className="space-y-2">
              {pending.map((c) => (
                 <li key={c.id} className="rounded-lg border border-primary/50 bg-primary/10 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                       <p className="text-xs uppercase tracking-widest text-primary font-semibold">
                        {c.action === "delete" ? "Delete question" : "Add question"} · {labelFor(c.topic_key)}
                      </p>
                      {c.action === "delete" ? (
                        <p className="mt-1 text-sm">
                          Question #{(c.question_index ?? 0) + 1}
                          {setsByKey.get(c.topic_key)?.questions[c.question_index ?? -1]?.question
                             ? ` — ${setsByKey.get(c.topic_key)?.questions[c.question_index ?? -1]?.question.slice(0, 120)}`
                            : ""}
                        </p>
                      ) : (
                        <div className="mt-1 text-sm">
                          <p className="font-medium">{c.new_question?.question}</p>
                          <ul className="text-xs text-muted-foreground mt-1 list-disc ms-5">
                            {(c.new_question?.choices ?? []).map((ch, i) => (
                               <li key={i} className={i === c.new_question?.answer_index ? "text-primary font-semibold" : ""}>{ch}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                       {canModerate ? (
                         <>
                           <Button onClick={() => approve(c)} size="sm" className="h-8 px-3 text-xs">
                             <Check className="w-3.5 h-3.5" /> Approve
                           </Button>
                           <Button onClick={() => reject(c)} variant="outline" size="sm" className="h-8 px-3 text-xs">
                             <X className="w-3.5 h-3.5" /> Reject
                           </Button>
                         </>
                       ) : (
                         <span className="text-xs text-muted-foreground italic">Awaiting admin</span>
                       )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-3">Lectures</h2>
          {loading ? (
            <div className="p-6 text-center"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
          ) : (
            <ul className="space-y-2">
              {allLectures.map(({ lang, n, topicKey }) => {
                const set = setsByKey.get(topicKey);
                const pend = pendingByKey.get(topicKey) ?? [];
                const isOpen = !!open[topicKey];
                return (
                   <li key={topicKey} className="rounded-lg border border-border bg-card text-card-foreground overflow-hidden">
                     <Button
                       variant="ghost"
                      onClick={() => setOpen((o) => ({ ...o, [topicKey]: !o[topicKey] }))}
                       className="w-full h-auto flex items-center justify-between rounded-none p-3 text-start hover:bg-secondary hover:text-secondary-foreground"
                    >
                      <span className="flex items-center gap-2 font-semibold text-sm">
                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        {lang.toUpperCase()} · Lecture {n}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {set ? `${set.questions.length} MCQs` : "No MCQs yet"}
                        {pend.length ? ` · ${pend.length} pending` : ""}
                      </span>
                     </Button>
                    {isOpen && (
                      <div className="border-t border-border p-3 space-y-3">
                        {set && set.questions.length > 0 ? (
                          <ol className="space-y-2">
                            {set.questions.map((q, i) => (
                               <li key={i} className="rounded-md border border-border bg-secondary text-secondary-foreground p-3">
                                <p className="text-sm font-medium">{i + 1}. {q.question}</p>
                                <ul className="mt-1 ms-5 text-xs list-disc">
                                  {q.choices.map((c, j) => (
                                     <li key={j} className={j === q.answer_index ? "text-primary font-semibold" : "text-muted-foreground"}>{c}</li>
                                  ))}
                                </ul>
                                <div className="mt-2 flex justify-end">
                                   <Button onClick={() => requestDelete(topicKey, i)} variant="outline" size="sm"
                                     className="h-7 px-2 border-destructive/50 text-destructive text-xs hover:bg-destructive/10 hover:text-destructive">
                                    <Trash2 className="w-3 h-3" /> Request delete
                                   </Button>
                                </div>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="text-xs text-muted-foreground">No questions yet.</p>
                        )}
                        <AddQuestionForm onSubmit={(q) => requestAdd(topicKey, q)} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function AddQuestionForm({ onSubmit }: { onSubmit: (q: MCQ) => void }) {
  const [question, setQuestion] = useState("");
  const [choices, setChoices] = useState(["", "", "", ""]);
  const [answer, setAnswer] = useState(0);
  const submit = () => {
    if (!question.trim() || choices.some((c) => !c.trim())) return toast.error("Fill all fields");
    onSubmit({ question: question.trim(), choices: choices.map((c) => c.trim()), answer_index: answer });
    setQuestion(""); setChoices(["", "", "", ""]); setAnswer(0);
  };
  return (
    <div className="rounded-md border border-primary/40 bg-primary/10 p-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Add question (needs approval)</p>
      <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Question"
        className="w-full min-h-16 p-2 rounded-md bg-background border border-input text-foreground placeholder:text-muted-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {choices.map((c, i) => (
          <label key={i} className="flex items-center gap-2 text-sm">
            <input type="radio" name="ans" checked={answer === i} onChange={() => setAnswer(i)} />
            <input value={c} onChange={(e) => setChoices((cs) => cs.map((x, j) => j === i ? e.target.value : x))}
              placeholder={`Choice ${i + 1}`}
              className="flex-1 h-9 px-2 rounded-md bg-background border border-input text-foreground placeholder:text-muted-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
        ))}
      </div>
      <div className="flex justify-end">
        <Button onClick={submit} size="sm" className="h-8 px-3 text-xs">
          <Plus className="w-3.5 h-3.5" /> Submit for approval
        </Button>
      </div>
    </div>
  );
}