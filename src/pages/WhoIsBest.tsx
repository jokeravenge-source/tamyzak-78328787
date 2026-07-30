import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Upload, Trophy, ImagePlus, X } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";

type Poll = { id: string; question: string; is_active: boolean; created_at: string };
type Option = { id: string; poll_id: string; label: string; image_path: string | null; sort_order: number };
type OptionRow = Option & { created_by?: string | null; guest_key?: string | null };
type Vote = { poll_id: string; option_id: string; user_id: string | null; guest_key?: string | null };

const T = (lang: AppLanguage, ar: string, en: string) => (lang === "ar" ? ar : en);

const GUEST_KEY_STORAGE = "who_is_best_guest_key_v1";
const getGuestKey = () => {
  let k = localStorage.getItem(GUEST_KEY_STORAGE);
  if (!k) {
    k = crypto.randomUUID();
    localStorage.setItem(GUEST_KEY_STORAGE, k);
  }
  return k;
};

const publicUrl = (path: string | null) => {
  if (!path) return null;
  return supabase.storage.from("polls").getPublicUrl(path).data.publicUrl;
};

const WhoIsBest = ({ language, onBack, isAdmin }: { language: AppLanguage; onBack: () => void; isAdmin: boolean }) => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newQ, setNewQ] = useState("");

  const loadPolls = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("polls")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setPolls((data as Poll[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadPolls(); }, []);

  const createPoll = async () => {
    if (!newQ.trim()) return;
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase.from("polls").insert({ question: newQ.trim(), created_by: userRes.user?.id });
    if (error) return toast.error(error.message);
    toast.success(T(language, "تم النشر", "Posted"));
    setNewQ(""); setShowCreate(false); loadPolls();
  };

  const deletePoll = async (id: string) => {
    if (!confirm(T(language, "حذف السؤال؟", "Delete question?"))) return;
    const { error } = await supabase.from("polls").delete().eq("id", id);
    if (error) return toast.error(error.message);
    loadPolls();
  };

  if (selectedPoll) {
    return <PollDetail language={language} isAdmin={isAdmin} poll={selectedPoll} onBack={() => setSelectedPoll(null)} />;
  }

  const rtl = language === "ar";

  return (
    <main dir={rtl ? "rtl" : "ltr"} className="min-h-screen bg-background pb-28">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
        <button onClick={onBack} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" />
          {T(language, "رجوع", "Back")}
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
            <Trophy className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{T(language, "من الأفضل؟", "Who is the best?")}</h1>
            <p className="text-sm text-muted-foreground">{T(language, "صوّت على الأسئلة", "Vote on questions")}</p>
          </div>
        </div>

        {isAdmin && (
          <div className="mb-4">
            {showCreate ? (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <textarea value={newQ} onChange={(e) => setNewQ(e.target.value)} rows={2} placeholder={T(language, "اكتب السؤال...", "Write the question...")} className="w-full rounded-lg border border-border bg-background p-3 text-sm" />
                <div className="flex gap-2">
                  <button onClick={createPoll} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground font-medium text-sm">{T(language, "نشر", "Post")}</button>
                  <button onClick={() => { setShowCreate(false); setNewQ(""); }} className="h-10 px-4 rounded-lg border border-border text-sm">{T(language, "إلغاء", "Cancel")}</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowCreate(true)} className="w-full h-11 rounded-xl border border-dashed border-border bg-card hover:bg-secondary flex items-center justify-center gap-2 text-sm font-medium">
                <Plus className="h-4 w-4" /> {T(language, "أضف سؤالاً", "Add question")}
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center text-muted-foreground py-12">{T(language, "جارٍ التحميل...", "Loading...")}</div>
        ) : polls.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">{T(language, "لا توجد أسئلة بعد", "No questions yet")}</div>
        ) : (
          <div className="grid gap-3">
            {polls.map((p) => (
              <div key={p.id} className="group relative rounded-2xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition cursor-pointer" onClick={() => setSelectedPoll(p)}>
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                    <Trophy className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base leading-snug">{p.question}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(p.created_at).toLocaleDateString(language === "ar" ? "ar" : "en")}</p>
                  </div>
                  {isAdmin && (
                    <button onClick={(e) => { e.stopPropagation(); deletePoll(p.id); }} className="h-8 w-8 rounded-lg border border-border hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

const PollDetail = ({ language, isAdmin, poll, onBack }: { language: AppLanguage; isAdmin: boolean; poll: Poll; onBack: () => void }) => {
  const [options, setOptions] = useState<Option[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const guestKey = useMemo(() => getGuestKey(), []);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const rtl = language === "ar";

  const load = async () => {
    setLoading(true);
    const [{ data: opts }, { data: vts }, { data: userRes }] = await Promise.all([
      supabase.from("poll_options").select("*").eq("poll_id", poll.id).order("sort_order").order("created_at"),
      supabase.from("poll_votes").select("*").eq("poll_id", poll.id),
      supabase.auth.getUser(),
    ]);
    const uid = userRes.user?.id ?? null;
    setOptions((opts as Option[]) || []);
    setVotes((vts as Vote[]) || []);
    setUserId(uid);
    setMyVote(
      ((vts as Vote[]) || []).find((v) =>
        uid ? v.user_id === uid : v.guest_key === guestKey,
      )?.option_id ?? null,
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, [poll.id]);

  const totalVotes = votes.length;
  const countByOption = useMemo(() => {
    const m: Record<string, number> = {};
    for (const v of votes) m[v.option_id] = (m[v.option_id] || 0) + 1;
    return m;
  }, [votes]);

  const sortedOptions = useMemo(
    () =>
      [...options].sort(
        (a, b) =>
          (countByOption[b.id] || 0) - (countByOption[a.id] || 0) ||
          a.sort_order - b.sort_order,
      ),
    [options, countByOption],
  );

  const addOption = async () => {
    if (!newLabel.trim() && !newFile) return;
    setUploading(true);
    try {
      let image_path: string | null = null;
      if (newFile) {
        const ext = newFile.name.split(".").pop() || "png";
        const key = `${poll.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("polls").upload(key, newFile, { contentType: newFile.type });
        if (upErr) throw upErr;
        image_path = key;
      }
      const { error } = await supabase.from("poll_options").insert({
        poll_id: poll.id,
        label: newLabel.trim() || T(language, "خيار", "Option"),
        image_path,
        sort_order: options.length,
        created_by: userId,
        guest_key: userId ? null : guestKey,
      } as any);
      if (error) throw error;
      setNewLabel(""); setNewFile(null); setShowAdd(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setUploading(false); }
  };

  const deleteOption = async (o: Option) => {
    if (!confirm(T(language, "حذف الخيار؟", "Delete option?"))) return;
    if (o.image_path) await supabase.storage.from("polls").remove([o.image_path]);
    const { error } = await supabase.from("poll_options").delete().eq("id", o.id);
    if (error) return toast.error(error.message);
    load();
  };

  const vote = async (optionId: string) => {
    let error;
    if (userId) {
      ({ error } = await supabase.from("poll_votes").upsert(
        { poll_id: poll.id, option_id: optionId, user_id: userId },
        { onConflict: "poll_id,user_id" },
      ));
    } else {
      ({ error } = await supabase.from("poll_votes").upsert(
        { poll_id: poll.id, option_id: optionId, user_id: null, guest_key: guestKey } as any,
        { onConflict: "poll_id,guest_key" },
      ));
    }
    if (error) return toast.error(error.message);
    setMyVote(optionId);
    load();
  };

  return (
    <main dir={rtl ? "rtl" : "ltr"} className="min-h-screen bg-background pb-28">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
        <button onClick={onBack} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" />
          {T(language, "رجوع", "Back")}
        </button>

        <div className="rounded-2xl border border-border bg-gradient-to-br from-yellow-400/10 to-orange-500/10 p-6 mb-6">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg flex-shrink-0">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-snug">{poll.question}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {totalVotes} {T(language, "صوت", totalVotes === 1 ? "vote" : "votes")}
              </p>
            </div>
          </div>
        </div>

        {(
          <div className="mb-4">
            {showAdd ? (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder={T(language, "اسم الخيار", "Option label")} className="w-full h-11 rounded-lg border border-border bg-background px-3 text-sm" />
                <label className="flex items-center gap-2 h-11 px-3 rounded-lg border border-dashed border-border bg-background cursor-pointer hover:bg-secondary">
                  <ImagePlus className="h-4 w-4" />
                  <span className="text-sm truncate">{newFile ? newFile.name : T(language, "أضف صورة (اختياري)", "Add image (optional)")}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setNewFile(e.target.files?.[0] ?? null)} />
                </label>
                <div className="flex gap-2">
                  <button disabled={uploading} onClick={addOption} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50 inline-flex items-center gap-2">
                    {uploading && <Upload className="h-4 w-4 animate-pulse" />}
                    {T(language, "أضف", "Add")}
                  </button>
                  <button onClick={() => { setShowAdd(false); setNewLabel(""); setNewFile(null); }} className="h-10 px-4 rounded-lg border border-border text-sm">{T(language, "إلغاء", "Cancel")}</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAdd(true)} className="w-full h-11 rounded-xl border border-dashed border-border bg-card hover:bg-secondary flex items-center justify-center gap-2 text-sm font-medium">
                <Plus className="h-4 w-4" /> {T(language, "أضف مدرساً", "Add teacher")}
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center text-muted-foreground py-12">{T(language, "جارٍ التحميل...", "Loading...")}</div>
        ) : options.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">{T(language, "لا توجد خيارات بعد", "No options yet")}</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {sortedOptions.map((o) => {
              const count = countByOption[o.id] || 0;
              const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
              const selected = myVote === o.id;
              const img = publicUrl(o.image_path);
              return (
                <div key={o.id} className={`group relative rounded-2xl border-2 bg-card overflow-hidden transition ${selected ? "border-primary shadow-lg" : "border-border hover:border-primary/40"}`}>
                  {img && (
                    <div className="aspect-[4/3] bg-secondary overflow-hidden">
                      <img src={img} alt={o.label} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-base">{o.label}</h3>
                      {(isAdmin ||
                        (userId && (o as OptionRow).created_by === userId) ||
                        (!userId && (o as OptionRow).guest_key === guestKey)) && (
                        <button onClick={() => deleteOption(o)} className="h-7 w-7 rounded-lg border border-border hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{count} {T(language, "صوت", count === 1 ? "vote" : "votes")}</span>
                        <span>{pct}%</span>
                      </div>
                    </div>
                    <button onClick={() => vote(o.id)} className={`w-full h-10 rounded-lg text-sm font-medium transition ${selected ? "bg-primary text-primary-foreground" : "border border-border hover:bg-secondary"}`}>
                      {selected ? T(language, "صوتك ✓", "Your vote ✓") : T(language, "صوّت", "Vote")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};

export default WhoIsBest;