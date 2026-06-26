import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, FlaskConical, Search, ChevronRight, ChevronLeft, RotateCcw, Eye, CheckCircle2, XCircle, Sparkles, Loader2 } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Reaction = {
  n: number;
  eq: string;
  notes?: string;
  labels?: string;
};

type Section = {
  id: string;
  titleAr: string;
  titleEn: string;
  formulaAr: string;
  reactions: Reaction[];
};

const SECTIONS: Section[] = [
  {
    id: "alkyl-halides",
    titleAr: "أولاً: هاليد الألكيل",
    titleEn: "Alkyl Halides",
    formulaAr: "R–X   حيث X = Cl, Br, I",
    reactions: [
      { n: 1, eq: "R–CH=CH₂  +  HX  →  R–X", labels: "ألكين + هاليد هيدروجين → هاليد ألكيل" },
      { n: 2, eq: "R–X  +  KOH  ── (مائي, Δ) ──►  R–OH  +  KX", labels: "هاليد ألكيل → كحول" },
      { n: 3, eq: "R–X  +  KOH  ── (كحولي / C₂H₅OH) ──►  R–CH=CH₂  +  H₂O  +  KX", labels: "هاليد ألكيل → ألكين" },
      { n: 4, eq: "R–X  +  Mg  ── (إيثر جاف) ──►  R–Mg–X", labels: "هاليد ألكيل + مغنيسيوم → كاشف جرينيارد" },
    ],
  },
  {
    id: "alcohols",
    titleAr: "ثانياً: الكحولات",
    titleEn: "Alcohols",
    formulaAr: "R–OH",
    reactions: [
      { n: 1, eq: "R–CH=CH₂  +  H₂O  ── (H₂SO₄ مركز ساخن) ──►  R–OH", labels: "ألكين + ماء → كحول" },
      { n: 2, eq: "R–OH  +  Na  →  R–O–Na  +  ½ H₂↑", labels: "كحول → ألكوكسيد الصوديوم" },
      { n: 3, eq: "R–OH  +  PCl₃ (أو PCl₅)  ── (بيريدين) ──►  R–X", labels: "كحول → هاليد ألكيل" },
      { n: 4, eq: "R–OH  +  HX  →  R–X  +  H₂O", labels: "كحول → هاليد ألكيل" },
      { n: 5, eq: "R–OH  ── (H₂SO₄ مركز, 170°C, –H₂O) ──►  R–CH=CH₂  +  H₂O", labels: "كحول → ألكين" },
      { n: 6, eq: "R–CH₂–OH  +  HCl  ── (ZnCl₂ / كاشف لوكاس) ──►  N.R", labels: "كحول أولي + كاشف لوكاس" },
      { n: 7, eq: "R–CH(OH)–R  +  HCl  ── (ZnCl₂) ──►  R–CH(Cl)–R  +  H₂O", labels: "كحول ثانوي + كاشف لوكاس" },
      { n: 8, eq: "R₃C–OH  +  HCl  ── (ZnCl₂) ──►  R₃C–Cl  +  H₂O", labels: "كحول ثالثي + كاشف لوكاس" },
      { n: 9, eq: "R–CH₂–OH  ── [O] / KMnO₄/H⁺ ──►  R–CHO  ── [O] / KMnO₄/H⁺ ──►  R–COOH", labels: "كحول أولي → ألدهيد → حمض كربوكسيلي" },
      { n: 10, eq: "R–CH(OH)–R  ── (KMnO₄/H⁺) ──►  R–CO–R", labels: "كحول ثانوي → كيتون" },
      { n: 11, eq: "R₃C–OH  ── (KMnO₄/H⁺) ──►  N.R", labels: "كحول ثالثي" },
    ],
  },
  {
    id: "ethers",
    titleAr: "ثالثاً: الإيثرات",
    titleEn: "Ethers",
    formulaAr: "R–O–R",
    reactions: [
      { n: 1, eq: "R–O–Na  +  R–X  →  R–O–R  +  NaX", labels: "ألكوكسيد الصوديوم + هاليد ألكيل → إيثر" },
      { n: 2, eq: "R–O–R  +  H₂O  ── (H₂SO₄ مخفف, Δ) ──►  R–OH  +  R–OH", labels: "إيثر + ماء → كحولان" },
      { n: 3, eq: "R–O–R  +  H₂SO₄  ── (مركز بارد) ──►  [R–O(H)–R]⁺ HSO₄⁻", labels: "ملح الأوكسونيوم للإيثر" },
      { n: 4, eq: "R–O–R  +  PCl₅  →  R–Cl  +  R–Cl  +  POCl₃", labels: "إيثر → هاليد ألكيل" },
    ],
  },
  {
    id: "carbonyls",
    titleAr: "رابعاً وخامساً: الألدهيد والكيتون",
    titleEn: "Aldehydes & Ketones",
    formulaAr: "R–CHO  ,  R–CO–R",
    reactions: [
      { n: 1, eq: "R–CHO  +  H₂  ── (Ni / Red) ──►  R–CH₂–OH", labels: "ألدهيد → كحول أولي" },
      { n: 2, eq: "R–CO–R  +  H₂  ── (Ni / Red) ──►  R–CH(OH)–R", labels: "كيتون → كحول ثانوي" },
      { n: 3, eq: "R–CHO  ── (Zn/Hg, HCl) ──►  R–CH₃", labels: "ألدهيد → ألكان" },
      { n: 4, eq: "R–CO–R  ── (Zn/Hg, HCl) ──►  R–CH₂–R", labels: "كيتون → ألكان" },
      { n: 5, eq: "R–CHO  +  H₂N–NH₂  →  R–CH=N–NH₂  +  H₂O", labels: "ألدهيد + هيدرازين → ألدهيد هيدرازون" },
      { n: 6, eq: "R–CO–R  +  H₂N–NH₂  →  R₂C=N–NH₂  +  H₂O", labels: "كيتون + هيدرازين → كيتون هيدرازون" },
      { n: 7, eq: "R–CHO  +  2 Ag(NH₃)₂OH  →  R–COONH₄  +  2 Ag↓  +  H₂O  +  3 NH₃", labels: "ألدهيد + كاشف تولن → مرآة الفضة" },
      { n: 8, eq: "R–CO–R  +  2 Ag(NH₃)₂OH  →  N.R", labels: "كيتون + كاشف تولن" },
      { n: 9, eq: "R–CHO  +  2 Cu²⁺  +  5 OH⁻  →  R–COO⁻  +  Cu₂O↓  +  3 H₂O", labels: "ألدهيد + محلول فهلنك → راسب أحمر" },
      { n: 10, eq: "R–CO–R  +  2 Cu²⁺  +  5 OH⁻  →  N.R", labels: "كيتون + محلول فهلنك" },
    ],
  },
  {
    id: "carboxylic",
    titleAr: "سادساً: الأحماض الكربوكسيلية",
    titleEn: "Carboxylic Acids",
    formulaAr: "R–COOH",
    reactions: [
      { n: 1, eq: "R–Mg–X  +  CO₂  ── (إيثر جاف) ──►  R–COO–Mg–X", labels: "كاشف جرينيارد + CO₂" },
      { n: 2, eq: "R–COO–Mg–X  +  H₂O / H⁺  →  R–COOH  +  Mg(OH)X", labels: "تحلل مائي → حمض كربوكسيلي" },
      { n: 3, eq: "R–COOH  +  NaOH  →  R–COONa  +  H₂O", labels: "حمض + قاعدة → ملح" },
      { n: 4, eq: "R–COOH  +  NaHCO₃  →  R–COONa  +  CO₂↑  +  H₂O", labels: "حمض + بيكربونات الصوديوم" },
      { n: 5, eq: "R–COOH  ── (LiAlH₄) ──►  R–CH₂–OH", labels: "اختزال الحمض → كحول أولي" },
    ],
  },
  {
    id: "esters",
    titleAr: "سابعاً: الإسترات",
    titleEn: "Esters",
    formulaAr: "R–CO–O–R",
    reactions: [
      { n: 1, eq: "R–COCl  +  R–OH  →  R–CO–O–R  +  HCl", labels: "كلوريد الحمض + كحول → إستر" },
      { n: 2, eq: "R–CO–O–R  +  H₂O  ⇌ (H⁺)  R–COOH  +  R–OH", labels: "تحلل حمضي للإستر" },
      { n: 3, eq: "R–CO–O–R  +  NaOH  ── (H₂O, Δ) ──►  R–COONa  +  R–OH", labels: "تحلل قاعدي → ألكانوات الصوديوم + كحول" },
    ],
  },
  {
    id: "amines",
    titleAr: "ثامناً: الأمينات",
    titleEn: "Amines",
    formulaAr: "R–NH₂",
    reactions: [
      { n: 1, eq: "R–X  +  NH₃  →  R–NH₃⁺ X⁻", labels: "هاليد ألكيل + أمونيا → ملح الأمين" },
      { n: 2, eq: "R–NH₃⁺ X⁻  ── (NaOH) ──►  R–NH₂  +  NaX  +  H₂O", labels: "ملح الأمين → أمين" },
      { n: 3, eq: "R–OH  +  NH₃  ── (Al₂O₃, Δ) ──►  R–NH₂  +  H₂O", labels: "كحول + أمونيا → أمين" },
      { n: 4, eq: "R–NH₂  +  HCl  →  R–NH₃⁺ Cl⁻", labels: "أمين + HCl → ملح أمين" },
      { n: 5, eq: "R–COCl  +  R–NH₂  →  R–CO–NH–R  +  HCl", labels: "أمين + كلوريد الحمض → N-ألكيل أميد" },
    ],
  },
];

const COPY = {
  ar: {
    badge: "كيمياء عضوية",
    title: "تفاعلات العضوية",
    subtitle: "ملخّص مرتّب لـ 43 تفاعل عضوي مهم، مقسّم حسب المركّبات.",
    searchPh: "ابحث عن تفاعل، كاشف، أو ناتج…",
    count: "تفاعلات",
    noResults: "لا توجد تفاعلات مطابقة للبحث.",
    back: "رجوع",
    total: "إجمالي التفاعلات",
    open: "افتح التفاعل",
    reactants: "المتفاعلات",
    products: "النواتج",
    pool: "السحب والإفلات — اسحب القطع لمكانها الصحيح",
    check: "تحقق",
    reset: "إعادة",
    showAnswer: "أظهر الحل",
    correct: "إجابة صحيحة!",
    incorrect: "حاول مرّة أخرى",
    conditions: "الظروف",
    none: "لا يحدث تفاعل",
    tapHint: "انقر قطعة من الأسفل ثم انقر المنطقة لإضافتها — أو انقر القطعة المضافة لإرجاعها.",
    simplify: "بسّط لي التفاعل",
    simplifying: "جاري التبسيط…",
    phrase: "عبارة سهلة الحفظ",
    mnemonic: "حيلة الحفظ",
    steps: "الخطوات",
    trick: "نصيحة ذكية",
    simplifyError: "تعذّر التبسيط، حاول مرّة أخرى",
  },
  en: {
    badge: "Organic Chemistry",
    title: "Organic Reactions",
    subtitle: "A clean summary of 43 key organic reactions, grouped by compound.",
    searchPh: "Search reaction, reagent, or product…",
    count: "reactions",
    noResults: "No reactions match your search.",
    back: "Back",
    total: "Total reactions",
    open: "Open reaction",
    reactants: "Reactants",
    products: "Products",
    pool: "Drag-and-drop — place each piece in its correct side",
    check: "Check",
    reset: "Reset",
    showAnswer: "Show answer",
    correct: "Correct!",
    incorrect: "Try again",
    conditions: "Conditions",
    none: "No reaction",
    tapHint: "Tap a piece below then tap a zone to place it — tap a placed piece to return it.",
    simplify: "Simplify for memorization",
    simplifying: "Simplifying…",
    phrase: "Memorable phrase",
    mnemonic: "Mnemonic",
    steps: "Steps",
    trick: "Smart tip",
    simplifyError: "Could not simplify, please try again",
  },
} as const;

// Parse equation into reactants / products / conditions
function parseReaction(eq: string): { reactants: string[]; products: string[]; conditions: string[]; nr: boolean } {
  // Normalize arrows: capture conditions inside ──(...)──► or ── ... ──►
  // Split on arrow markers
  const cleaned = eq.replace(/\s+/g, " ").trim();
  // Split on any arrow ("→", "►", "⇌"); keep middle chunks as conditions
  const parts = cleaned.split(/→|►|⇌/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return { reactants: [], products: [], conditions: [], nr: false };
  const reactantsStr = parts[0];
  const productsStr = parts[parts.length - 1];
  const condStrs = parts.slice(1, -1);
  // Strip leading/trailing "──" or "(...)" markers from each
  const strip = (s: string) => s.replace(/^[─\-—\s]+/, "").replace(/[─\-—\s]+$/, "").trim();
  const conditions = condStrs
    .map(strip)
    .map((s) => s.replace(/^\(|\)$/g, "").trim())
    .filter(Boolean);
  const splitPlus = (s: string) =>
    s
      .split(/\s\+\s/)
      .map((t) => t.trim())
      .filter(Boolean);
  const reactants = splitPlus(strip(reactantsStr));
  const productsClean = strip(productsStr);
  const nr = /^N\.?R\.?$/i.test(productsClean);
  const products = nr ? [] : splitPlus(productsClean);
  return { reactants, products, conditions, nr };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type ReactionDetailProps = {
  language: AppLanguage;
  section: Section;
  reaction: Reaction;
  onBack: () => void;
  onPrev?: () => void;
  onNext?: () => void;
};

type Token = { id: number; text: string };
type ZoneKey = "pool" | "reactants" | "products";

const ReactionDetail = ({ language, section, reaction, onBack, onPrev, onNext }: ReactionDetailProps) => {
  const t = COPY[language];
  const isRTL = language === "ar";
  const parsed = useMemo(() => parseReaction(reaction.eq), [reaction.eq]);
  const correctReactants = parsed.reactants;
  const correctProducts = parsed.products;

  const buildTokens = (): { tokens: Token[]; placement: Record<number, ZoneKey> } => {
    const all = [...correctReactants, ...correctProducts];
    const tokens = shuffle(all.map((text, idx) => ({ id: idx, text })));
    const placement: Record<number, ZoneKey> = {};
    tokens.forEach((tok) => (placement[tok.id] = "pool"));
    return { tokens, placement };
  };

  const [{ tokens, placement }, setState] = useState(buildTokens);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [simplifying, setSimplifying] = useState(false);
  const [simplified, setSimplified] = useState<{ phrase?: string; mnemonic?: string; steps?: string[]; trick?: string } | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const dragIdRef = useRef<number | null>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    setState(buildTokens());
    setSelected(null);
    setResult(null);
    setRevealed(false);
    setSimplified(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reaction.n, section.id]);

  const handleSimplify = async () => {
    setSimplifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("simplify-reaction", {
        body: { equation: reaction.eq, label: reaction.labels ?? "", language },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setSimplified(data as any);
    } catch (e) {
      toast.error(t.simplifyError);
    } finally {
      setSimplifying(false);
    }
  };

  const placeSelected = (zone: ZoneKey) => {
    if (selected == null) return;
    setState((prev) => ({ ...prev, placement: { ...prev.placement, [selected]: zone } }));
    setSelected(null);
    setResult(null);
  };

  const onTokenClick = (id: number) => {
    const where = placement[id];
    if (where === "pool") {
      setSelected(selected === id ? null : id);
    } else {
      // return to pool
      setState((prev) => ({ ...prev, placement: { ...prev.placement, [id]: "pool" } }));
      setResult(null);
    }
  };

  const onDragStartTok = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData("text/plain", String(id));
    e.dataTransfer.effectAllowed = "move";
  };

  const resolveZone = (x: number, y: number): ZoneKey | null => {
    const ghost = ghostRef.current;
    const prev = ghost?.style.display;
    if (ghost) ghost.style.display = "none";
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    if (ghost && prev !== undefined) ghost.style.display = prev;
    if (!el) return null;
    const z = el.closest("[data-drop-zone]") as HTMLElement | null;
    if (!z) return null;
    return (z.getAttribute("data-drop-zone") as ZoneKey) ?? null;
  };

  const startPointerDrag = (id: number, text: string, e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragIdRef.current = id;
    movedRef.current = false;
    const ghost = document.createElement("div");
    ghost.textContent = text;
    ghost.style.cssText =
      "position:fixed;left:0;top:0;z-index:9999;pointer-events:none;padding:6px 12px;border-radius:10px;" +
      "font:600 13px ui-monospace,monospace;color:hsl(var(--primary-foreground));" +
      "background:hsl(var(--primary));box-shadow:0 6px 20px hsl(var(--primary)/0.45);" +
      "transform:translate(-50%,-50%) scale(1.05);opacity:0.95";
    document.body.appendChild(ghost);
    ghostRef.current = ghost;
    ghost.style.left = `${e.clientX}px`;
    ghost.style.top = `${e.clientY}px`;
    const onMove = (ev: PointerEvent) => {
      if (Math.abs(ev.clientX - e.clientX) + Math.abs(ev.clientY - e.clientY) > 4) movedRef.current = true;
      if (ghostRef.current) {
        ghostRef.current.style.left = `${ev.clientX}px`;
        ghostRef.current.style.top = `${ev.clientY}px`;
      }
      ev.preventDefault();
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      if (ghostRef.current) { ghostRef.current.remove(); ghostRef.current = null; }
    };
    const onUp = (ev: PointerEvent) => {
      const zone = resolveZone(ev.clientX, ev.clientY);
      const did = dragIdRef.current;
      cleanup();
      dragIdRef.current = null;
      if (did == null) return;
      if (movedRef.current && zone) {
        setState((prev) => ({ ...prev, placement: { ...prev.placement, [did]: zone } }));
        setSelected(null);
        setResult(null);
      }
    };
    const onCancel = () => { cleanup(); dragIdRef.current = null; };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  };

  const onDropZone = (e: React.DragEvent, zone: ZoneKey) => {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData("text/plain"));
    if (Number.isNaN(id)) return;
    setState((prev) => ({ ...prev, placement: { ...prev.placement, [id]: zone } }));
    setSelected(null);
    setResult(null);
  };
  const allowDrop = (e: React.DragEvent) => e.preventDefault();

  const inZone = (zone: ZoneKey) => tokens.filter((tok) => placement[tok.id] === zone);

  const check = () => {
    const r = inZone("reactants").map((tk) => tk.text).sort();
    const p = inZone("products").map((tk) => tk.text).sort();
    const cr = [...correctReactants].sort();
    const cp = [...correctProducts].sort();
    const ok =
      r.length === cr.length &&
      p.length === cp.length &&
      r.every((v, i) => v === cr[i]) &&
      p.every((v, i) => v === cp[i]);
    setResult(ok ? "correct" : "incorrect");
  };

  const reset = () => {
    setState(buildTokens());
    setSelected(null);
    setResult(null);
    setRevealed(false);
  };

  const revealAnswer = () => {
    const placementNew: Record<number, ZoneKey> = {};
    // Assign tokens to their correct zone by matching text (first unused match)
    const used = new Set<number>();
    const assignFor = (texts: string[], zone: ZoneKey) => {
      for (const txt of texts) {
        const match = tokens.find((tk) => tk.text === txt && !used.has(tk.id));
        if (match) {
          placementNew[match.id] = zone;
          used.add(match.id);
        }
      }
    };
    assignFor(correctReactants, "reactants");
    assignFor(correctProducts, "products");
    tokens.forEach((tk) => {
      if (!(tk.id in placementNew)) placementNew[tk.id] = "pool";
    });
    setState((prev) => ({ ...prev, placement: placementNew }));
    setRevealed(true);
    setResult(null);
  };

  const Arrow = () => (
    <div className="flex flex-col items-center justify-center px-2 min-w-[80px]">
      {parsed.conditions.length > 0 && (
        <div className="text-[10px] md:text-xs text-muted-foreground text-center font-mono leading-tight mb-1 max-w-[180px]">
          {parsed.conditions.join(" · ")}
        </div>
      )}
      <div className="text-2xl text-primary font-bold">{isRTL ? "←" : "→"}</div>
    </div>
  );

  const Zone = ({ zone, label }: { zone: ZoneKey; label: string }) => {
    const items = inZone(zone);
    const isCorrectSide = revealed || result === "correct";
    return (
      <div
        data-drop-zone={zone}
        onDragOver={allowDrop}
        onDrop={(e) => onDropZone(e, zone)}
        onClick={() => selected != null && placeSelected(zone)}
        className={`flex-1 min-h-[120px] rounded-2xl border-2 border-dashed p-3 transition-colors ${
          selected != null
            ? "border-primary/70 bg-primary/5 cursor-pointer"
            : isCorrectSide
              ? "border-emerald-400/60 bg-emerald-50/40 dark:bg-emerald-950/20"
              : "border-border bg-card"
        }`}
      >
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
        <div className="flex flex-wrap gap-2">
          {items.length === 0 ? (
            <span className="text-xs text-muted-foreground italic">—</span>
          ) : (
            items.map((tk) => (
              <button
                key={tk.id}
                draggable
                onDragStart={(e) => onDragStartTok(e, tk.id)}
                onPointerDown={(e) => startPointerDrag(tk.id, tk.text, e)}
                onClick={(e) => {
                  e.stopPropagation();
                  onTokenClick(tk.id);
                }}
                className="font-mono text-sm px-3 py-1.5 rounded-lg bg-primary text-primary-foreground shadow-sm hover:opacity-90 touch-none select-none cursor-grab active:cursor-grabbing"
                dir="ltr"
              >
                {tk.text}
              </button>
            ))
          )}
        </div>
      </div>
    );
  };

  const poolTokens = inZone("pool");
  const parseable = correctReactants.length + correctProducts.length > 0;

  return (
    <div className="min-h-screen w-full bg-background text-foreground" dir={isRTL ? "rtl" : "ltr"}>
      <div className="sticky top-0 z-30 backdrop-blur-md bg-background/75 border-b border-border">
        <div className="max-w-4xl mx-auto px-5 md:px-8 h-14 flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors"
          >
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {t.back}
          </button>
          <p className="font-bold text-sm truncate">
            {isRTL ? section.titleAr : section.titleEn} · #{reaction.n}
          </p>
          <div className="flex items-center gap-1">
            {onPrev && (
              <button onClick={onPrev} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary" aria-label="prev">
                {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            )}
            {onNext && (
              <button onClick={onNext} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary" aria-label="next">
                {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-5 md:px-8 py-6 pb-24">
        {reaction.labels && (
          <p className="text-sm md:text-base text-foreground/80 mb-2">{reaction.labels}</p>
        )}
        <p className="text-xs text-muted-foreground mb-5">{t.tapHint}</p>

        {!parseable ? (
          <div className="p-5 rounded-2xl border border-border bg-card font-mono text-sm" dir="ltr">
            {reaction.eq}
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row items-stretch gap-3 md:gap-2 mb-5">
              <Zone zone="reactants" label={t.reactants} />
              <Arrow />
              {parsed.nr ? (
                <div className="flex-1 min-h-[120px] rounded-2xl border-2 border-dashed border-rose-300 dark:border-rose-900 p-3 flex items-center justify-center bg-rose-50/40 dark:bg-rose-950/20">
                  <span className="text-rose-600 dark:text-rose-300 font-bold text-sm">N.R — {t.none}</span>
                </div>
              ) : (
                <Zone zone="products" label={t.products} />
              )}
            </div>

            <div data-drop-zone="pool" className="rounded-2xl border border-border bg-card p-4 mb-4" onDragOver={allowDrop} onDrop={(e) => onDropZone(e, "pool")}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">{t.pool}</p>
              <div className="flex flex-wrap gap-2 min-h-[44px]">
                {poolTokens.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">—</span>
                ) : (
                  poolTokens.map((tk) => (
                    <button
                      key={tk.id}
                      draggable
                      onDragStart={(e) => onDragStartTok(e, tk.id)}
                      onPointerDown={(e) => startPointerDrag(tk.id, tk.text, e)}
                      onClick={() => onTokenClick(tk.id)}
                      className={`font-mono text-sm px-3 py-1.5 rounded-lg border transition-all touch-none select-none cursor-grab active:cursor-grabbing ${
                        selected === tk.id
                          ? "border-primary bg-primary/10 ring-2 ring-primary/40 scale-105"
                          : "border-border bg-background hover:bg-secondary"
                      }`}
                      dir="ltr"
                    >
                      {tk.text}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={check}
                disabled={parsed.nr}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40"
              >
                <CheckCircle2 className="w-4 h-4" />
                {t.check}
              </button>
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary"
              >
                <RotateCcw className="w-4 h-4" />
                {t.reset}
              </button>
              <button
                onClick={revealAnswer}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary"
              >
                <Eye className="w-4 h-4" />
                {t.showAnswer}
              </button>
              {result === "correct" && (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> {t.correct}
                </span>
              )}
              {result === "incorrect" && (
                <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 text-sm font-semibold">
                  <XCircle className="w-4 h-4" /> {t.incorrect}
                </span>
              )}
            </div>
          </>
        )}

        <div className="mt-6">
          <button
            onClick={handleSimplify}
            disabled={simplifying}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-sm font-semibold shadow hover:opacity-95 disabled:opacity-60"
          >
            {simplifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {simplifying ? t.simplifying : t.simplify}
          </button>
        </div>

        {simplified && (
          <div className="mt-4 rounded-2xl border border-violet-300/40 dark:border-violet-800/60 bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/20 p-5 space-y-4">
            {simplified.phrase && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-300 mb-1">{t.phrase}</p>
                <p className="text-lg md:text-xl font-bold leading-snug">{simplified.phrase}</p>
              </div>
            )}
            {simplified.mnemonic && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-300 mb-1">{t.mnemonic}</p>
                <p className="text-sm leading-relaxed">{simplified.mnemonic}</p>
              </div>
            )}
            {Array.isArray(simplified.steps) && simplified.steps.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-300 mb-1">{t.steps}</p>
                <ol className="list-decimal ms-5 space-y-1 text-sm">
                  {simplified.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </div>
            )}
            {simplified.trick && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-300 mb-1">{t.trick}</p>
                <p className="text-sm leading-relaxed">{simplified.trick}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 p-4 rounded-xl bg-secondary/40 border border-border">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            {isRTL ? "المعادلة الكاملة" : "Full equation"}
          </p>
          <p className="font-mono text-sm whitespace-pre-wrap break-words" dir="ltr">
            {reaction.eq}
          </p>
        </div>
      </main>
    </div>
  );
};

const OrganicEquations = ({
  language,
  onBack,
}: {
  language: AppLanguage;
  onBack: () => void;
}) => {
  const t = COPY[language];
  const isRTL = language === "ar";
  const [q, setQ] = useState("");
  const [selectedKey, setSelectedKey] = useState<{ sec: string; n: number } | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return SECTIONS;
    return SECTIONS
      .map((s) => ({
        ...s,
        reactions: s.reactions.filter((r) =>
          [r.eq, r.labels ?? "", s.titleAr, s.titleEn].join(" ").toLowerCase().includes(needle)
        ),
      }))
      .filter((s) => s.reactions.length > 0);
  }, [q]);

  const total = SECTIONS.reduce((acc, s) => acc + s.reactions.length, 0);

  if (selectedKey) {
    const sec = SECTIONS.find((s) => s.id === selectedKey.sec);
    const rx = sec?.reactions.find((r) => r.n === selectedKey.n);
    if (sec && rx) {
      const idx = sec.reactions.indexOf(rx);
      const prev = idx > 0 ? sec.reactions[idx - 1] : null;
      const next = idx < sec.reactions.length - 1 ? sec.reactions[idx + 1] : null;
      return (
        <ReactionDetail
          language={language}
          section={sec}
          reaction={rx}
          onBack={() => setSelectedKey(null)}
          onPrev={prev ? () => setSelectedKey({ sec: sec.id, n: prev.n }) : undefined}
          onNext={next ? () => setSelectedKey({ sec: sec.id, n: next.n }) : undefined}
        />
      );
    }
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground" dir={isRTL ? "rtl" : "ltr"}>
      <div className="sticky top-0 z-30 backdrop-blur-md bg-background/75 border-b border-border">
        <div className="max-w-4xl mx-auto px-5 md:px-8 h-14 flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors"
          >
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {t.back}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <FlaskConical className="w-4 h-4 text-primary" />
            </div>
            <p className="font-bold text-sm">{t.title}</p>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-5 md:px-8 py-8 pb-24">
        <header className="mb-6">
          <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider rounded-full mb-3">
            {t.badge}
          </span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
            {t.title}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">{t.subtitle}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {t.total}: <span className="font-bold text-foreground">{total}</span>
          </p>
        </header>

        <div className="relative mb-6">
          <Search className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 ${isRTL ? "right-3" : "left-3"} text-muted-foreground`} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.searchPh}
            className={`w-full h-11 rounded-xl border border-border bg-card text-sm outline-none focus:border-primary/60 transition-colors ${isRTL ? "pr-10 pl-4" : "pl-10 pr-4"}`}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-16">{t.noResults}</div>
        ) : (
          <div className="space-y-8">
            {filtered.map((s) => (
              <section key={s.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-gradient-to-br from-primary/5 to-transparent flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-base md:text-lg">{isRTL ? s.titleAr : s.titleEn}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">{s.formulaAr}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-primary/10 text-primary whitespace-nowrap">
                    {s.reactions.length} {t.count}
                  </span>
                </div>
                <ul className="divide-y divide-border">
                  {s.reactions.map((r) => (
                    <li key={r.n}>
                      <button
                        onClick={() => setSelectedKey({ sec: s.id, n: r.n })}
                        className="w-full text-start p-5 hover:bg-secondary/40 transition-colors flex gap-3 items-start"
                      >
                        <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                          {r.n}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p
                            className="font-mono text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap break-words"
                            dir="ltr"
                            style={{ textAlign: "left" }}
                          >
                            {r.eq}
                          </p>
                          {r.labels && (
                            <p className="text-xs text-muted-foreground mt-2">{r.labels}</p>
                          )}
                        </div>
                        <ChevronRight className={`w-4 h-4 text-muted-foreground mt-1 shrink-0 ${isRTL ? "rotate-180" : ""}`} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default OrganicEquations;