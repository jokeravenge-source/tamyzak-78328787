import { useEffect, useState } from "react";
import { ArrowLeft, MessageSquareQuote, Trash2, Send, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { AppLanguage } from "@/components/LanguageGate";

const NAME_KEY = "advice_author_name_v1";

const t = {
  en: {
    title: "Advices", desc: "Ask the community for advice and help others.",
    newTopic: "New topic", topicTitle: "Topic title", topicBody: "Describe your question (optional)",
    post: "Post", cancel: "Cancel", comments: "Comments", noTopics: "No topics yet. Be the first to post.",
    namePrompt: "Enter your name", nameLabel: "Your name", save: "Save",
    writeComment: "Write a comment...", send: "Send", delete: "Delete",
    confirmDelete: "Delete this?",
  },
  ar: {
    title: "النصائح", desc: "اطلب النصيحة من المجتمع وساعد الآخرين.",
    newTopic: "موضوع جديد", topicTitle: "عنوان الموضوع", topicBody: "اشرح سؤالك (اختياري)",
    post: "نشر", cancel: "إلغاء", comments: "التعليقات", noTopics: "لا توجد مواضيع بعد. كن أول من ينشر.",
    namePrompt: "أدخل اسمك", nameLabel: "اسمك", save: "حفظ",
    writeComment: "اكتب تعليقاً...", send: "إرسال", delete: "حذف",
    confirmDelete: "حذف؟",
  },
} as const;

type Topic = { id: string; user_id: string; author_name: string; title: string; body: string; created_at: string };
type Comment = { id: string; topic_id: string; user_id: string; author_name: string; body: string; created_at: string };

const Advices = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const L = t[language];
  const dir = language === "ar" ? "rtl" : "ltr";
  const [topics, setTopics] = useState<Topic[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState<string>(() => localStorage.getItem(NAME_KEY) || "");
  const [askName, setAskName] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | (() => void)>(null);
  const [nameDraft, setNameDraft] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      if (data.user) {
        supabase.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle()
          .then(({ data: r }) => setIsAdmin(!!r));
      }
    });
    loadTopics();
  }, []);

  const loadTopics = async () => {
    const { data } = await supabase.from("advice_topics").select("*").order("created_at", { ascending: false });
    setTopics((data ?? []) as Topic[]);
  };
  const loadComments = async (topicId: string) => {
    const { data } = await supabase.from("advice_comments").select("*").eq("topic_id", topicId).order("created_at", { ascending: true });
    setComments((p) => ({ ...p, [topicId]: (data ?? []) as Comment[] }));
  };

  const ensureName = (action: () => void) => {
    if (name.trim()) { action(); return; }
    setNameDraft("");
    setPendingAction(() => action);
    setAskName(true);
  };

  const saveName = () => {
    const n = nameDraft.trim();
    if (!n) return;
    localStorage.setItem(NAME_KEY, n);
    setName(n);
    setAskName(false);
    if (pendingAction) { pendingAction(); setPendingAction(null); }
  };

  const createTopic = async () => {
    if (!newTitle.trim() || !userId) return;
    const { error } = await supabase.from("advice_topics").insert({
      user_id: userId, author_name: name, title: newTitle.trim(), body: newBody.trim(),
    });
    if (error) { toast.error(error.message); return; }
    setNewTitle(""); setNewBody(""); setCreating(false);
    loadTopics();
  };

  const sendComment = async (topicId: string) => {
    const body = (commentText[topicId] || "").trim();
    if (!body || !userId) return;
    const { error } = await supabase.from("advice_comments").insert({
      topic_id: topicId, user_id: userId, author_name: name, body,
    });
    if (error) { toast.error(error.message); return; }
    setCommentText((p) => ({ ...p, [topicId]: "" }));
    loadComments(topicId);
  };

  const deleteTopic = async (id: string) => {
    if (!confirm(L.confirmDelete)) return;
    const { error } = await supabase.from("advice_topics").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    loadTopics();
  };
  const deleteComment = async (topicId: string, id: string) => {
    if (!confirm(L.confirmDelete)) return;
    const { error } = await supabase.from("advice_comments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    loadComments(topicId);
  };

  return (
    <main className="min-h-screen px-4 py-10 md:py-16" dir={dir}>
      <button onClick={onBack} className="absolute top-6 left-6 z-20 w-11 h-11 rounded-full border border-white/10 bg-secondary/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-5 h-5" />
      </button>

      <header className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/40 backdrop-blur mb-4">
          <MessageSquareQuote className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{L.title}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-3">{L.title}</h1>
        <p className="text-muted-foreground">{L.desc}</p>
      </header>

      <div className="max-w-3xl mx-auto">
        <div className="flex justify-end mb-4">
          <Button onClick={() => ensureName(() => setCreating(true))} className="gap-2">
            <Plus className="w-4 h-4" /> {L.newTopic}
          </Button>
        </div>

        {creating && (
          <div className="rounded-2xl border border-white/10 bg-secondary/40 backdrop-blur p-5 mb-6 space-y-3">
            <Input placeholder={L.topicTitle} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} maxLength={140} />
            <Textarea placeholder={L.topicBody} value={newBody} onChange={(e) => setNewBody(e.target.value)} maxLength={2000} />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setCreating(false)}>{L.cancel}</Button>
              <Button onClick={createTopic} disabled={!newTitle.trim()}>{L.post}</Button>
            </div>
          </div>
        )}

        {askName && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur p-4">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-card p-6 space-y-4">
              <h3 className="text-lg font-semibold">{L.namePrompt}</h3>
              <Input placeholder={L.nameLabel} value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} maxLength={40} autoFocus />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setAskName(false)}>{L.cancel}</Button>
                <Button onClick={saveName} disabled={!nameDraft.trim()}>{L.save}</Button>
              </div>
            </div>
          </div>
        )}

        {topics.length === 0 && <p className="text-center text-muted-foreground py-12">{L.noTopics}</p>}

        <div className="space-y-4">
          {topics.map((tp) => {
            const open = openId === tp.id;
            const cs = comments[tp.id] ?? [];
            return (
              <div key={tp.id} className="rounded-2xl border border-white/10 bg-secondary/30 backdrop-blur overflow-hidden">
                <button className="w-full text-left p-5" onClick={() => { const newOpen = open ? null : tp.id; setOpenId(newOpen); if (newOpen) loadComments(tp.id); }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{tp.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{tp.author_name} · {new Date(tp.created_at).toLocaleDateString()}</p>
                      {tp.body && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{tp.body}</p>}
                    </div>
                    {(isAdmin || tp.user_id === userId) && (
                      <button onClick={(e) => { e.stopPropagation(); deleteTopic(tp.id); }} className="text-muted-foreground hover:text-destructive p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </button>

                {open && (
                  <div className="border-t border-white/10 p-5 space-y-3">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{L.comments}</p>
                    {cs.map((c) => (
                      <div key={c.id} className="rounded-lg bg-background/40 p-3 flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">{c.author_name}</p>
                          <p className="text-sm whitespace-pre-wrap break-words">{c.body}</p>
                        </div>
                        {(isAdmin || c.user_id === userId) && (
                          <button onClick={() => deleteComment(tp.id, c.id)} className="text-muted-foreground hover:text-destructive p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <Input
                        placeholder={L.writeComment}
                        value={commentText[tp.id] || ""}
                        onChange={(e) => setCommentText((p) => ({ ...p, [tp.id]: e.target.value }))}
                        onFocus={() => ensureName(() => {})}
                        maxLength={1000}
                      />
                      <Button onClick={() => ensureName(() => sendComment(tp.id))} disabled={!(commentText[tp.id] || "").trim()}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
};

export default Advices;