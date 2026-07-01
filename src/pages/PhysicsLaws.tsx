import { useState } from "react";
import { ArrowLeft, Ruler, BookOpen, Lightbulb, Sparkles } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";
import { Input } from "@/components/ui/input";

const copy = {
  en: {
    title: "Physics Laws",
    desc: "Quick reference for formulas with memory aids.",
    back: "Back",
    search: "Search laws...",
    mnemonic: "Mnemonic",
    showMnemonic: "Show mnemonic",
    hideMnemonic: "Hide mnemonic",
  },
  ar: {
    title: "قوانين الفيزياء",
    desc: "مرجع سريع للقوانين مع حيل للحفظ.",
    back: "رجوع",
    search: "ابحث عن قانون...",
    mnemonic: "حيلة الحفظ",
    showMnemonic: "أظهر حيلة الحفظ",
    hideMnemonic: "إخفاء حيلة الحفظ",
  },
} as const;


const PHYSICS_LAWS = {
  en: [
    { name: "Capacitance (geometry)", formula: "C = ε₀·A / d", desc: "Capacitance from plate area and separation.", mnemonic: "\"Eyad\" (ε A / d) — remember it as one Arabic name: ε-A-d." },
    { name: "Capacitance (charge)", formula: "C = Q / ΔV", desc: "Capacitance from charge and voltage.", mnemonic: "\"CQV\" cup: fill the Cup (C) with Quantity of charge (Q) divided by Voltage (V)." },
    { name: "Electric field between plates", formula: "E = ΔV / d", desc: "Uniform field between two plates.", mnemonic: "Volts per meter — say it out loud, that IS the formula." },
    { name: "Dielectric — Capacitance", formula: "C_K = K · C", desc: "Dielectric always multiplies capacitance.", mnemonic: "K is a Kicker — it ALWAYS boosts C, whether connected or disconnected." },
    { name: "Dielectric — Voltage (isolated)", formula: "ΔV_K = ΔV / K", desc: "Voltage drops with K when battery is removed.", mnemonic: "Isolated = Injured: V gets DIVIDED by K." },
    { name: "Energy stored", formula: "PE = ½ Q·ΔV = ½ C·ΔV² = ½ Q²/C", desc: "Three interchangeable forms.", mnemonic: "\"Half of Queen Victoria\" — ½ Q V. Swap Q or V using C = Q/V to get the other two." },
    { name: "Series capacitors", formula: "1/C_eq = 1/C₁ + 1/C₂ + …", desc: "Series adds reciprocals; charge is shared.", mnemonic: "Series = Same charge (Q_T = Q₁ = Q₂). Reciprocals because life is hard in series." },
    { name: "Parallel capacitors", formula: "C_eq = C₁ + C₂ + …", desc: "Parallel adds directly; voltage is shared.", mnemonic: "Parallel = Plus. Same Voltage across each." },
    { name: "Two capacitors series shortcut", formula: "C_eq = (C₁·C₂)/(C₁+C₂)", desc: "Only for exactly two in series.", mnemonic: "\"Product over Sum\" — the P.O.S. trick, only for TWO." },
    { name: "Moving rod EMF", formula: "ε = B·l·v", desc: "EMF induced in a rod moving in a magnetic field.", mnemonic: "\"BLV\" — Bells, Lights, Voltage: the rod rings up EMF." },
    { name: "Rod current", formula: "I = B·l·v / R", desc: "Ohm's law applied to the induced EMF.", mnemonic: "Same BLV, just divide by R — Ohm always takes his cut." },
    { name: "Inductor EMF", formula: "ε_L = -L · (ΔI/Δt)", desc: "Self-induced EMF opposes current change.", mnemonic: "\"L for Lazy\" — the coil resists any change in current (minus sign)." },
    { name: "Inductive reactance", formula: "X_L = 2π·f·L", desc: "Opposition of inductor to AC.", mnemonic: "\"L Likes high f\" — bigger frequency, bigger block." },
    { name: "Capacitive reactance", formula: "X_C = 1 / (2π·f·C)", desc: "Opposition of capacitor to AC.", mnemonic: "\"C Chills at high f\" — opposite of L, so it's the reciprocal." },
    { name: "AC impedance (series RLC)", formula: "Z = √(R² + (X_L − X_C)²)", desc: "Pythagoras for RLC circuits.", mnemonic: "Right triangle: R on the base, (X_L − X_C) up the side, Z is the hypotenuse." },
    { name: "Resonance frequency", formula: "f_r = 1 / (2π√(LC))", desc: "X_L = X_C → circuit is purely resistive.", mnemonic: "\"LC dance floor\" — at f_r, L and C cancel out and only R is left." },
    { name: "Power factor", formula: "Pf = R / Z = cos φ", desc: "Ratio of real to apparent power.", mnemonic: "\"Cos of the angle\" — R over Z, always ≤ 1." },
    { name: "Antenna length", formula: "L = λ / 4", desc: "Quarter-wave antenna length.", mnemonic: "\"Quarter Wave\" — divide wavelength by 4." },
    { name: "Wave speed", formula: "c = f · λ", desc: "Wave equation for light and sound.", mnemonic: "\"Cats Follow Lions\" — c = f × λ." },
    { name: "Double-slit fringe spacing", formula: "Δy = λ·L / d", desc: "Distance between bright fringes.", mnemonic: "\"Lambda Loves Long\" travel L, hates small d." },
    { name: "Diffraction grating", formula: "d·sin θ = n·λ", desc: "Order n bright line from grating.", mnemonic: "\"D-sine equals N-lambda\" — sing it: d sin = nλ." },
    { name: "Photon energy", formula: "E = h·f = h·c / λ", desc: "Energy of a single photon.", mnemonic: "\"Half\" the alphabet: h · f. Bigger frequency → bigger punch." },
    { name: "Max KE of photoelectron", formula: "KE_max = h·f − W", desc: "Einstein photoelectric equation.", mnemonic: "\"Photon pays the doorman (W), keeps the rest as KE.\"" },
    { name: "Stopping potential", formula: "eV_s = KE_max", desc: "Voltage needed to stop the fastest electron.", mnemonic: "\"e times Vs stops KE\" — the wall's voltage matches the electron's energy." },
    { name: "de Broglie wavelength", formula: "λ = h / (m·v)", desc: "Matter wave of a moving particle.", mnemonic: "\"h over momentum\" — heavier or faster → shorter wave." },
    { name: "Transistor current", formula: "I_E = I_C + I_B", desc: "Emitter current = collector + base.", mnemonic: "\"Emitter Eats\" both C and B currents." },
    { name: "Transistor current gain", formula: "α = I_C / I_E,  β = I_C / I_B", desc: "α (common-base) and β (common-emitter).", mnemonic: "α = C over E (small, <1). β = C over B (big)." },
    { name: "Power gain", formula: "G = α · A_V", desc: "Total power gain of an amplifier.", mnemonic: "\"G = alpha times voltage gain\" — multiply the two gains you already know." },
  ],
  ar: [
    { name: "سعة المتسعة (من الأبعاد)", formula: "C = ε₀ · A / d", desc: "تُستخدم عند وجود مساحة الصفيحة والبعد بينها.", mnemonic: "احفظها كاسم \"إياد\": (إ)بسلون ε — (ا)ي A — (د)ي d. ε A / d." },
    { name: "سعة المتسعة (شحنة وجهد)", formula: "C = Q / ΔV", desc: "تُستخدم عند وجود الشحنة وفرق الجهد.", mnemonic: "\"كوب\": C = Q / V. اذا ذُكرت الشحنة وفرق الجهد فقط، ما تستخدم قانون إياد." },
    { name: "المجال الكهربائي بين الصفيحتين", formula: "E = ΔV / d", desc: "المجال المنتظم بين لوحي متسعة.", mnemonic: "الوحدة نفسها هي القانون: فولت لكل متر (V/m)." },
    { name: "السعة بعد إدخال العازل", formula: "C_K = K · C", desc: "K تكبّر السعة دائماً، متصلة كانت أو منفصلة.", mnemonic: "\"K كبّر\" — العازل يضرب السعة × K في كل الحالات." },
    { name: "فرق الجهد بعد العازل (منفصلة)", formula: "ΔV_K = ΔV / K", desc: "عند فصل البطارية: الجهد يقسم على K.", mnemonic: "منفصلة = مقسومة: الفولتية تنقسم على K، بينما الشحنة تبقى ثابتة." },
    { name: "الشحنة بعد العازل (متصلة)", formula: "Q_K = K · Q", desc: "عند بقاء البطارية موصولة: الشحنة تُضرب بـ K.", mnemonic: "متصلة = مضروبة: الجهد ثابت (Q_K = K·Q)." },
    { name: "الطاقة المخزونة في المتسعة", formula: "PE = ½ Q·ΔV = ½ C·ΔV² = ½ Q²/C", desc: "ثلاث صيغ لنفس الطاقة.", mnemonic: "\"نص في نص\": ½ Q V. بدّل Q أو V بعلاقة C = Q/V تحصل على الصيغتين الأخريين." },
    { name: "التوالي", formula: "1/C_eq = 1/C₁ + 1/C₂ + …", desc: "بالتوالي: الشحنة نفسها والجهود تُجمع.", mnemonic: "\"توالي = تساوي الشحنة\" Q_T = Q₁ = Q₂. المقلوبات لأن الحياة صعبة بالتوالي." },
    { name: "التوازي", formula: "C_eq = C₁ + C₂ + …", desc: "بالتوازي: الجهد نفسه والسعات تُجمع مباشرة.", mnemonic: "\"توازي = تجميع\" — نفس الفولتية على كل متسعة." },
    { name: "متسعتان بالتوالي (اختصار)", formula: "C_eq = (C₁·C₂)/(C₁+C₂)", desc: "فقط عند وجود متسعتين بالتوالي.", mnemonic: "\"الضرب على الجمع\" — يصلح فقط لاثنتين، ولا يصلح لثلاث." },
    { name: "القوة الدافعة للساق الموصلة", formula: "ε = B · l · v", desc: "قوة دافعة كهربائية مستحثة في ساق تتحرك.", mnemonic: "\"BLV\" — بيبسي بارد للجميع: B ثم l ثم v." },
    { name: "تيار الساق الموصلة", formula: "I = B·l·v / R", desc: "قانون أوم مع القوة الدافعة المستحثة.", mnemonic: "نفس BLV، فقط قسمناها على R، لأن أوم دائماً يأخذ حصته." },
    { name: "القوة الدافعة الذاتية للملف", formula: "ε_L = −L · (ΔI/Δt)", desc: "الملف يقاوم تغيّر التيار.", mnemonic: "\"L = كسول\" — يعارض أي تغيّر، لذلك الإشارة سالبة." },
    { name: "المفاعلة الحثية", formula: "X_L = 2π · f · L", desc: "معارضة الملف للتيار المتناوب.", mnemonic: "\"L يحب التردد العالي\" — كلما زاد f زادت المعارضة." },
    { name: "المفاعلة السعوية", formula: "X_C = 1 / (2π · f · C)", desc: "معارضة المتسعة للتيار المتناوب.", mnemonic: "\"C عكس L\" — كلما زاد f قلّت المعارضة (مقلوب)." },
    { name: "الممانعة (RLC توالي)", formula: "Z = √(R² + (X_L − X_C)²)", desc: "فيثاغورس لدوائر RLC.", mnemonic: "مثلث قائم: R القاعدة، (X_L − X_C) الارتفاع، Z الوتر." },
    { name: "تردد الرنين", formula: "f_r = 1 / (2π√(LC))", desc: "عندما X_L = X_C تصبح الدائرة مقاومة صرفة.", mnemonic: "\"LC تلغي بعضها\" عند الرنين، لا يبقى إلا R." },
    { name: "معامل القدرة", formula: "Pf = R / Z = cos φ", desc: "نسبة القدرة الحقيقية إلى الظاهرية.", mnemonic: "\"جيب تمام الزاوية\" = R على Z، ولا يتجاوز 1 أبداً." },
    { name: "طول الهوائي", formula: "L = λ / 4", desc: "طول الهوائي ربع الطول الموجي.", mnemonic: "\"ربع الموجة\" — اقسم λ على 4." },
    { name: "سرعة الموجة", formula: "c = f · λ", desc: "معادلة الموجات للضوء والصوت.", mnemonic: "\"c = f × λ\" — احفظها كأغنية قصيرة." },
    { name: "فاصلة الهدب (شقان)", formula: "Δy = λ·L / d", desc: "المسافة بين الأهداب المضيئة.", mnemonic: "\"لامدا تحب المسافات الطويلة L وتكره d الصغيرة.\"" },
    { name: "محزز الحيود", formula: "d · sin θ = n · λ", desc: "خط مضيء من الرتبة n.", mnemonic: "\"دي سين يساوي إن لامدا\" — رددها بصوت عالٍ." },
    { name: "طاقة الفوتون", formula: "E = h · f = h·c / λ", desc: "طاقة فوتون واحد.", mnemonic: "\"h × f\" — كلما زاد التردد زادت الضربة." },
    { name: "الطاقة الحركية العظمى للإلكترون", formula: "KE_max = h·f − w", desc: "معادلة أينشتاين للتأثير الكهروضوئي.", mnemonic: "\"الفوتون يدفع أجرة البواب (w) ويحتفظ بالباقي كطاقة حركية.\"" },
    { name: "جهد الإيقاف", formula: "e · V_s = KE_max", desc: "الجهد اللازم لإيقاف أسرع إلكترون.", mnemonic: "\"e Vs يوقف KE\" — الجدار الكهربائي يساوي طاقة الإلكترون." },
    { name: "طول موجة دي برولي", formula: "λ = h / (m · v)", desc: "الطول الموجي المرافق للجسيم المتحرك.", mnemonic: "\"h على الزخم\" — كلما زادت الكتلة أو السرعة قصر الطول الموجي." },
    { name: "تيارات الترانزستور", formula: "I_E = I_C + I_B", desc: "تيار الباعث = تيار المجمّع + تيار القاعدة.", mnemonic: "\"الباعث يأكل الاثنين\" — I_E تجمع C و B." },
    { name: "ربح تيار الترانزستور", formula: "α = I_C / I_E ،  β = I_C / I_B", desc: "α (قاعدة مشتركة) و β (باعث مشترك).", mnemonic: "α = C على E (أصغر من 1). β = C على B (أكبر بكثير)." },
    { name: "ربح القدرة", formula: "G = α · A_V", desc: "ربح القدرة الكلي للمكبّر.", mnemonic: "\"G = ألفا × ربح الفولتية\" — ضرب ما تحفظه أصلاً." },
  ],
};


const PhysicsLaws = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  return <PhysicsLawsInner language={language} onBack={onBack} />;
};

type Law = { name: string; formula: string; desc: string; mnemonic?: string };

const LawCard = ({ law, rtl, t }: { law: Law; rtl: boolean; t: (typeof copy)[AppLanguage] }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-white/10 bg-secondary/40 backdrop-blur p-5 transition hover:border-primary/40">
      <h3 className="font-bold text-foreground mb-1">{law.name}</h3>
      <div className="font-mono text-lg text-primary mb-2">{law.formula}</div>
      <p className="text-sm text-muted-foreground">{law.desc}</p>
      {law.mnemonic && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            {open ? t.hideMnemonic : t.showMnemonic}
          </button>
          {open && (
            <div className="mt-2 rounded-xl border border-primary/30 bg-primary/5 p-3 flex gap-2 animate-fade-up" dir={rtl ? "rtl" : "ltr"}>
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/90 leading-relaxed">{law.mnemonic}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const PhysicsLawsInner = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const t = copy[language];
  const rtl = language === "ar";
  const [search, setSearch] = useState("");

  const filtered = PHYSICS_LAWS[language].filter((l) =>
    `${l.name} ${l.formula} ${l.desc}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen px-4 py-12 md:py-16 relative overflow-hidden" dir={rtl ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <button onClick={onBack} className="absolute top-6 left-6 z-20 w-11 h-11 rounded-full border border-white/10 bg-secondary/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition">
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="max-w-4xl mx-auto relative z-10">
        <header className="text-center mb-10 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/40 backdrop-blur mb-5">
            <Ruler className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{rtl ? "أدوات" : "Tools"}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-3">{t.title}</h1>
          <p className="text-muted-foreground md:text-lg">{t.desc}</p>
        </header>

        <div className="space-y-4 animate-fade-up">
          <div className="relative">
            <BookOpen className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" style={{ [rtl ? "right" : "left"]: "1rem" }} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.search}
              className="h-12 rounded-2xl bg-secondary/40 border-white/10 pl-12 pr-12"
              dir={rtl ? "rtl" : "ltr"}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((law) => (
              <LawCard key={law.name} law={law} rtl={rtl} t={t} />
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-10">{rtl ? "لا توجد نتائج" : "No results"}</p>
          )}
        </div>
      </div>
    </main>
  );
};

export default PhysicsLaws;
