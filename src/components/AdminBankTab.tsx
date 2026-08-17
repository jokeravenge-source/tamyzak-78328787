import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Search, Library, Calculator, ListChecks } from "lucide-react";

type Kind = "text" | "problems" | "mcq";

const TEXT_SUBJECTS = ["arabic", "english", "math", "chemistry", "biology", "physics", "islamic", "french"] as const;
const PROBLEM_SUBJECTS = ["math", "chemistry", "biology", "physics"] as const;
const MCQ_SUBJECTS = ["physics", "chemistry", "biology", "english", "french", "arabic", "islamic"] as const;

type TextRow = {
  id: string; subject: string; chapter: number; chapter_title: string | null; section: string | null;
  language: string; question: string; answer: string; difficulty: string; source: string | null;
};
type ProblemRow = {
  id: string; subject: string; chapter: number; chapter_title: string | null; section: string | null;
  language: string; problem: string; solution: string; final_answer: string | null; difficulty: string; source: string | null;
};
type McqRow = {
  id: string; subject: string; chapter: number; chapter_title: string | null; section: string | null;
  language: string; question: string; choices: string[]; answer_index: number; explanation: string | null;
  difficulty: string; source: string | null;
};
type AnyRow = TextRow | ProblemRow | McqRow;

const PAGE = 50;

export default function AdminBankTab() {
  const [kind, setKind] = useState<Kind>("text");
  const [subject, setSubject] = useState<string>("chemistry");
  const [chapter, setChapter] = useState<string>("all");
  const [language, setLanguage] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [chapters, setChapters] = useState<number[]>([]);

  const table = kind === "text" ? "bank_text_questions" : kind === "problems" ? "bank_problems" : "mcq_banks";
  const subjects = kind === "text" ? TEXT_SUBJECTS : kind === "problems" ? PROBLEM_SUBJECTS : MCQ_SUBJECTS;

  const [form, setForm] = useState({
    chapter: "1", chapter_title: "", section: "", language: "ar",
    question: "", answer: "", final_answer: "", difficulty: "medium",
    choices: ["", "", "", ""] as string[], answerIndex: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from(table).select("*", { count: "exact" }).eq("subject", subject);
    if (chapter !== "all") q = q.eq("chapter", Number(chapter));
    if (language !== "all") q = q.eq("language", language);
    if (search.trim()) {
      const col = kind === "problems" ? "problem" : "question";
      q = q.ilike(col, `%${search.trim()}%`);
    }
    const { data, count, error } = await q
      .order("chapter", { ascending: true })
      .order("sort_order", { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    setLoading(false);
    if (error) { toast({ title: "Load failed", description: error.message, variant: "destructive" }); return; }
    setRows((data ?? []) as unknown as AnyRow[]);
    setTotal(count ?? 0);
  }, [table, subject, chapter, language, search, page, kind]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from(table).select("chapter").eq("subject", subject);
      const uniq = Array.from(new Set((data ?? []).map((r: { chapter: number }) => r.chapter))).sort((a, b) => a - b);
      setChapters(uniq);
    })();
  }, [table, subject]);

  useEffect(() => { setPage(0); }, [kind, subject, chapter, language, search]);

  useEffect(() => {
    if (!subjects.includes(subject as never)) setSubject(subjects[0]);
  }, [kind, subject, subjects]);

  const pages = Math.max(1, Math.ceil(total / PAGE));

  const addRow = async () => {
    if (!form.question.trim() || (kind !== "mcq" && !form.answer.trim())) {
      toast({ title: "Question and answer are required", variant: "destructive" });
      return;
    }
    if (kind === "mcq" && form.choices.some((c) => !c.trim())) {
      toast({ title: "All 4 choices are required", variant: "destructive" });
      return;
    }
    const base = {
      subject,
      chapter: Number(form.chapter) || 1,
      chapter_title: form.chapter_title.trim() || null,
      section: form.section.trim() || null,
      language: form.language,
      difficulty: form.difficulty,
      source: "admin",
    };
    const payload = kind === "text"
      ? { ...base, question: form.question.trim(), answer: form.answer.trim() }
      : kind === "problems"
        ? { ...base, problem: form.question.trim(), solution: form.answer.trim(), final_answer: form.final_answer.trim() || null }
        : {
            ...base,
            question: form.question.trim(),
            choices: form.choices.map((c) => c.trim()),
            answer_index: form.answerIndex,
            explanation: form.answer.trim() || null,
          };
    const { error } = await supabase.from(table).insert(payload as never);
    if (error) { toast({ title: "Add failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Question added" });
    setForm({ ...form, question: "", answer: "", final_answer: "", choices: ["", "", "", ""], answerIndex: 0 });
    void load();
  };

  const removeRow = async (id: string) => {
    if (!confirm("Delete this question permanently?")) return;
    setBusyId(id);
    const { error } = await supabase.from(table).delete().eq("id", id);
    setBusyId(null);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    setRows((r) => r.filter((x) => x.id !== id));
    setTotal((t) => Math.max(0, t - 1));
  };

  const heading = useMemo(
    () => (kind === "text" ? "Text questions" : kind === "problems" ? "Problems" : "MCQ bank"),
    [kind],
  );

  const inputCls = "h-10 px-3 rounded-lg bg-background border border-white/10 text-sm";

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button onClick={() => setKind("text")} className={`px-3 py-1.5 rounded-full text-xs border ${kind === "text" ? "bg-primary text-primary-foreground border-primary" : "border-white/10 bg-secondary/40 text-muted-foreground"}`}>
          <Library className="w-3 h-3 inline mr-1" /> Text questions
        </button>
        <button onClick={() => setKind("problems")} className={`px-3 py-1.5 rounded-full text-xs border ${kind === "problems" ? "bg-primary text-primary-foreground border-primary" : "border-white/10 bg-secondary/40 text-muted-foreground"}`}>
          <Calculator className="w-3 h-3 inline mr-1" /> Problems
        </button>
        <button onClick={() => setKind("mcq")} className={`px-3 py-1.5 rounded-full text-xs border ${kind === "mcq" ? "bg-primary text-primary-foreground border-primary" : "border-white/10 bg-secondary/40 text-muted-foreground"}`}>
          <ListChecks className="w-3 h-3 inline mr-1" /> MCQ bank
        </button>
      </div>

      {/* Add form */}
      <div className="rounded-2xl p-5 border border-white/10 bg-secondary/40 backdrop-blur space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Add to {heading} — {subject}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input value={form.chapter} onChange={(e) => setForm({ ...form, chapter: e.target.value })} placeholder="Chapter number" className={inputCls} />
          <input value={form.chapter_title} onChange={(e) => setForm({ ...form, chapter_title: e.target.value })} placeholder="Chapter title" className={inputCls} />
          <input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="Section (optional)" className={inputCls} />
          <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className={inputCls}>
            <option value="ar">Arabic</option>
            <option value="en">English</option>
            {kind === "text" && <option value="fr">French</option>}
          </select>
        </div>
        <textarea value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder={kind === "problems" ? "Problem statement" : "Question"} rows={2} className="w-full px-3 py-2 rounded-lg bg-background border border-white/10 text-sm" />
        {kind === "mcq" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {form.choices.map((c, i) => (
              <label key={i} className="flex items-center gap-2">
                <input type="radio" name="mcq-answer" checked={form.answerIndex === i} onChange={() => setForm({ ...form, answerIndex: i })} className="accent-primary" />
                <input
                  value={c}
                  onChange={(e) => setForm({ ...form, choices: form.choices.map((x, j) => (j === i ? e.target.value : x)) })}
                  placeholder={`Choice ${String.fromCharCode(65 + i)}`}
                  className={`flex-1 ${inputCls}`}
                />
              </label>
            ))}
          </div>
        )}
        <textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} placeholder={kind === "text" ? "Answer" : kind === "problems" ? "Full solution steps" : "Explanation (optional)"} rows={3} className="w-full px-3 py-2 rounded-lg bg-background border border-white/10 text-sm" />
        {kind === "problems" && (
          <input value={form.final_answer} onChange={(e) => setForm({ ...form, final_answer: e.target.value })} placeholder="Final answer (optional)" className={`w-full ${inputCls}`} />
        )}
        <div className="flex items-center gap-3">
          <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className={inputCls}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <button onClick={addRow} className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm">
            <Plus className="w-4 h-4" /> Add question
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <select value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls}>
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={chapter} onChange={(e) => setChapter(e.target.value)} className={inputCls}>
          <option value="all">All chapters</option>
          {chapters.map((c) => <option key={c} value={String(c)}>Chapter {c}</option>)}
        </select>
        <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputCls}>
          <option value="all">All languages</option>
          <option value="ar">Arabic</option>
          <option value="en">English</option>
          <option value="fr">French</option>
        </select>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className={`w-full ps-9 ${inputCls}`} />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{total} question{total === 1 ? "" : "s"}</span>
        <div className="flex items-center gap-2">
          <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="px-2 py-1 rounded border border-white/10 disabled:opacity-40">Prev</button>
          <span>{page + 1} / {pages}</span>
          <button disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} className="px-2 py-1 rounded border border-white/10 disabled:opacity-40">Next</button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No questions here yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const q = "question" in r ? r.question : r.problem;
            const isMcq = "choices" in r;
            const a = isMcq
              ? (r as McqRow).explanation ?? ""
              : "answer" in r ? r.answer : (r as ProblemRow).solution;
            return (
              <li key={r.id} className="rounded-2xl p-4 border border-white/10 bg-secondary/30">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary">{r.subject}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground">Ch {r.chapter}{r.chapter_title ? ` · ${r.chapter_title}` : ""}</span>
                      {r.section && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground">{r.section}</span>}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground">{r.language}</span>
                      {r.source && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground">{r.source}</span>}
                    </div>
                    <p className="text-sm font-medium whitespace-pre-wrap break-words">{q}</p>
                    {isMcq && (
                      <ul className="mt-2 space-y-1">
                        {((r as McqRow).choices ?? []).map((c, i) => (
                          <li key={i} className={`text-xs ${i === (r as McqRow).answer_index ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                            {String.fromCharCode(65 + i)}) {c}
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-words">{a}</p>
                  </div>
                  <button onClick={() => removeRow(r.id)} disabled={busyId === r.id} className="shrink-0 p-2 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 disabled:opacity-50">
                    {busyId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}