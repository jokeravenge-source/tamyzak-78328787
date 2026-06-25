import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, FlaskConical, Search } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";

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
  },
} as const;

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
                    <li key={r.n} className="p-5 hover:bg-secondary/40 transition-colors">
                      <div className="flex gap-3 items-start">
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
                      </div>
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