import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, LogIn, LogOut, Plus, Trash2, Check, X, ShieldAlert, ChevronDown, ChevronRight } from "lucide-react";

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

  // Force dark theme for this admin page
  useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains("dark");
    root.classList.add("dark");
    return () => { if (!had) root.classList.remove("dark"); };
  }, []);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      await check();
    } catch (err: any) {
      toast.error(err.message || "Sign-in failed");
    } finally { setBusy(false); }
  };
  const signOut = async () => { await supabase.auth.signOut(); await check(); };

  if (checking) {
    return <div className="min-h-screen grid place-items-center bg-background text-foreground"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (!userEmail) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground p-6">
        <form onSubmit={signIn} className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 space-y-4">
          <h1 className="text-xl font-bold">Admin Sign-In</h1>
          <p className="text-sm text-muted-foreground">MCQ review panel</p>
          <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm" />
          <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm" />
          <button type="submit" disabled={busy}
            className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />} Sign in
          </button>
        </form>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground p-6">
        <div className="w-full max-w-md rounded-2xl border border-destructive/40 bg-card p-6 space-y-3 text-center">
          <ShieldAlert className="w-8 h-8 text-destructive mx-auto" />
          <p className="font-semibold">This account is not an admin.</p>
          <p className="text-xs text-muted-foreground">{userEmail}</p>
          <button onClick={signOut} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border text-sm">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </div>
    );
  }

  return <ReviewPanel userEmail={userEmail} onSignOut={signOut} />;
}

function ReviewPanel({ userEmail, onSignOut }: { userEmail: string; onSignOut: () => void }) {
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
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Admin · MCQ Review</h1>
          <p className="text-xs text-muted-foreground">{userEmail}</p>
        </div>
        <button onClick={onSignOut} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border text-sm">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
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
                <li key={c.id} className="rounded-xl border border-yellow-500/40 bg-yellow-500/5 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-widest text-yellow-600 font-semibold">
                        {c.action === "delete" ? "Delete question" : "Add question"} · {labelFor(c.topic_key)}
                      </p>
                      {c.action === "delete" ? (
                        <p className="mt-1 text-sm">
                          Question #{(c.question_index ?? 0) + 1}
                          {setsByKey.get(c.topic_key)?.questions[c.question_index ?? -1]?.question
                            ? ` — ${setsByKey.get(c.topic_key)!.questions[c.question_index!].question.slice(0, 120)}`
                            : ""}
                        </p>
                      ) : (
                        <div className="mt-1 text-sm">
                          <p className="font-medium">{c.new_question?.question}</p>
                          <ul className="text-xs text-muted-foreground mt-1 list-disc ms-5">
                            {(c.new_question?.choices ?? []).map((ch, i) => (
                              <li key={i} className={i === c.new_question?.answer_index ? "text-emerald-600 font-semibold" : ""}>{ch}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => approve(c)} className="h-8 px-3 rounded-lg bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => reject(c)} className="h-8 px-3 rounded-lg border border-border text-xs inline-flex items-center gap-1">
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
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
                  <li key={topicKey} className="rounded-xl border border-border bg-card">
                    <button
                      onClick={() => setOpen((o) => ({ ...o, [topicKey]: !o[topicKey] }))}
                      className="w-full flex items-center justify-between p-3 text-start"
                    >
                      <span className="flex items-center gap-2 font-semibold text-sm">
                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        {lang.toUpperCase()} · Lecture {n}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {set ? `${set.questions.length} MCQs` : "No MCQs yet"}
                        {pend.length ? ` · ${pend.length} pending` : ""}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="border-t border-border p-3 space-y-3">
                        {set && set.questions.length > 0 ? (
                          <ol className="space-y-2">
                            {set.questions.map((q, i) => (
                              <li key={i} className="rounded-lg border border-border p-3">
                                <p className="text-sm font-medium">{i + 1}. {q.question}</p>
                                <ul className="mt-1 ms-5 text-xs list-disc">
                                  {q.choices.map((c, j) => (
                                    <li key={j} className={j === q.answer_index ? "text-emerald-600 font-semibold" : "text-muted-foreground"}>{c}</li>
                                  ))}
                                </ul>
                                <div className="mt-2 flex justify-end">
                                  <button onClick={() => requestDelete(topicKey, i)}
                                    className="inline-flex items-center gap-1 h-7 px-2 rounded-lg border border-destructive/50 text-destructive text-xs hover:bg-destructive/10">
                                    <Trash2 className="w-3 h-3" /> Request delete
                                  </button>
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
    <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Add question (needs approval)</p>
      <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Question"
        className="w-full min-h-16 p-2 rounded-lg bg-background border border-border text-sm" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {choices.map((c, i) => (
          <label key={i} className="flex items-center gap-2 text-sm">
            <input type="radio" name="ans" checked={answer === i} onChange={() => setAnswer(i)} />
            <input value={c} onChange={(e) => setChoices((cs) => cs.map((x, j) => j === i ? e.target.value : x))}
              placeholder={`Choice ${i + 1}`}
              className="flex-1 h-9 px-2 rounded-lg bg-background border border-border text-sm" />
          </label>
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={submit}
          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
          <Plus className="w-3.5 h-3.5" /> Submit for approval
        </button>
      </div>
    </div>
  );
}