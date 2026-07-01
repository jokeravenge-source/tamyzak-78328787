import { useState } from "react";
import { ArrowLeft, Ruler, BookOpen, RotateCcw, Calculator, ArrowRightLeft } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const copy = {
  en: {
    title: "Physics Laws & Units",
    desc: "Quick reference for formulas and unit conversions.",
    back: "Back",
    laws: "Laws",
    converter: "Converter",
    search: "Search laws...",
    value: "Value",
    from: "From",
    to: "To",
    convert: "Convert",
    result: "Result",
    reset: "Reset",
  },
  ar: {
    title: "قوانين ووحدات الفيزياء",
    desc: "مرجع سريع للقوانين والتحويلات.",
    back: "رجوع",
    laws: "القوانين",
    converter: "المحوّل",
    search: "ابحث عن قانون...",
    value: "القيمة",
    from: "من",
    to: "إلى",
    convert: "حوّل",
    result: "النتيجة",
    reset: "إعادة",
  },
} as const;

const PHYSICS_LAWS = {
  en: [
    { name: "Speed", formula: "v = d / t", desc: "Average speed equals distance divided by time." },
    { name: "Acceleration", formula: "a = Δv / t", desc: "Acceleration equals change in velocity over time." },
    { name: "Force", formula: "F = m × a", desc: "Newton's second law: force equals mass times acceleration." },
    { name: "Weight", formula: "W = m × g", desc: "Weight equals mass times gravitational acceleration." },
    { name: "Density", formula: "ρ = m / V", desc: "Density equals mass divided by volume." },
    { name: "Pressure", formula: "P = F / A", desc: "Pressure equals force divided by area." },
    { name: "Work", formula: "W = F × d", desc: "Work equals force times displacement in force direction." },
    { name: "Power", formula: "P = W / t", desc: "Power equals work divided by time." },
    { name: "Kinetic Energy", formula: "KE = ½ m v²", desc: "Energy of motion." },
    { name: "Potential Energy", formula: "PE = m × g × h", desc: "Gravitational potential energy." },
    { name: "Ohm's Law", formula: "V = I × R", desc: "Voltage equals current times resistance." },
    { name: "Power (Electric)", formula: "P = V × I", desc: "Electric power equals voltage times current." },
    { name: "Resistance", formula: "R = ρ L / A", desc: "Resistance depends on resistivity, length, and area." },
    { name: "Wave Speed", formula: "v = f × λ", desc: "Wave speed equals frequency times wavelength." },
    { name: "Lens Power", formula: "P = 1 / f", desc: "Lens power is reciprocal of focal length in meters." },
  ],
  ar: [
    { name: "السرعة", formula: "v = d / t", desc: "السرعة المتوسطة تساوي المسافة مقسومة على الزمن." },
    { name: "التسارع", formula: "a = Δv / t", desc: "التسارع يساوي التغيّر في السرعة على الزمن." },
    { name: "القوة", formula: "F = m × a", desc: "قانون نيوتن الثاني: القوة تساوي الكتلة في التسارع." },
    { name: "الوزن", formula: "W = m × g", desc: "الوزن يساوي الكتلة في التسارع الثقالي." },
    { name: "الكثافة", formula: "ρ = m / V", desc: "الكثافة تساوي الكتلة مقسومة على الحجم." },
    { name: "الضغط", formula: "P = F / A", desc: "الضغط يساوي القوة مقسومة على المساحة." },
    { name: "الشغل", formula: "W = F × d", desc: "الشغل يساوي القوة في الإزاحة باتجاه القوة." },
    { name: "القدرة", formula: "P = W / t", desc: "القدرة تساوي الشغل مقسومة على الزمن." },
    { name: "الطاقة الحركية", formula: "KE = ½ m v²", desc: "طاقة الحركة." },
    { name: "الطاقة الكامنة", formula: "PE = m × g × h", desc: "الطاقة الكامنة الثقالية." },
    { name: "قانون أوم", formula: "V = I × R", desc: "الفولتية تساوي التيار في المقاومة." },
    { name: "القدرة الكهربائية", formula: "P = V × I", desc: "القدرة الكهربائية تساوي الفولتية في التيار." },
    { name: "المقاومة", formula: "R = ρ L / A", desc: "المقاومة تعتمد على المقاومية والطول والمساحة." },
    { name: "سرعة الموجة", formula: "v = f × λ", desc: "سرعة الموجة تساوي التردد في الطول الموجي." },
    { name: "قوة العدسة", formula: "P = 1 / f", desc: "قوة العدسة هي مقلوب البعد البؤري بالمتر." },
  ],
};

const CONVERSIONS = {
  en: [
    { label: "km/h → m/s", from: "km/h", to: "m/s", factor: 1 / 3.6 },
    { label: "m/s → km/h", from: "m/s", to: "km/h", factor: 3.6 },
    { label: "km → m", from: "km", to: "m", factor: 1000 },
    { label: "m → km", from: "m", to: "km", factor: 1 / 1000 },
    { label: "g → kg", from: "g", to: "kg", factor: 1 / 1000 },
    { label: "kg → g", from: "kg", to: "g", factor: 1000 },
    { label: "J → cal", from: "J", to: "cal", factor: 0.239 },
    { label: "cal → J", from: "cal", to: "J", factor: 1 / 0.239 },
    { label: "°C → °F", from: "°C", to: "°F", custom: (v: number) => v * 9 / 5 + 32 },
    { label: "°F → °C", from: "°F", to: "°C", custom: (v: number) => (v - 32) * 5 / 9 },
    { label: "min → s", from: "min", to: "s", factor: 60 },
    { label: "s → min", from: "s", to: "min", factor: 1 / 60 },
  ],
  ar: [
    { label: "كم/س → م/ث", from: "كم/س", to: "م/ث", factor: 1 / 3.6 },
    { label: "م/ث → كم/س", from: "م/ث", to: "كم/س", factor: 3.6 },
    { label: "كم → م", from: "كم", to: "م", factor: 1000 },
    { label: "م → كم", from: "م", to: "كم", factor: 1 / 1000 },
    { label: "غ → كغ", from: "غ", to: "كغ", factor: 1 / 1000 },
    { label: "كغ → غ", from: "كغ", to: "غ", factor: 1000 },
    { label: "جول → سعرة", from: "جول", to: "سعرة", factor: 0.239 },
    { label: "سعرة → جول", from: "سعرة", to: "جول", factor: 1 / 0.239 },
    { label: "°C → °F", from: "°C", to: "°F", custom: (v: number) => v * 9 / 5 + 32 },
    { label: "°F → °C", from: "°F", to: "°C", custom: (v: number) => (v - 32) * 5 / 9 },
    { label: "دقيقة → ثانية", from: "دقيقة", to: "ثانية", factor: 60 },
    { label: "ثانية → دقيقة", from: "ثانية", to: "دقيقة", factor: 1 / 60 },
  ],
};

const PhysicsLaws = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const t = copy[language];
  const rtl = language === "ar";
  const [search, setSearch] = useState("");
  const [value, setValue] = useState<string>("");
  const [selected, setSelected] = useState(CONVERSIONS[language][0].label);
  const [result, setResult] = useState<number | null>(null);

  const filtered = PHYSICS_LAWS[language].filter((l) =>
    `${l.name} ${l.formula} ${l.desc}`.toLowerCase().includes(search.toLowerCase())
  );

  const convert = () => {
    const conversion = CONVERSIONS[language].find((c) => c.label === selected);
    const v = parseFloat(value);
    if (!conversion || Number.isNaN(v)) return;
    const out = conversion.custom ? conversion.custom(v) : v * (conversion.factor ?? 1);
    setResult(Number(out.toFixed(4)));
  };

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

        <Tabs defaultValue="laws" className="w-full">
          <TabsList className="w-full h-12 mb-6 bg-secondary/60 backdrop-blur rounded-2xl border border-white/10">
            <TabsTrigger value="laws" className="flex-1 gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BookOpen className="w-4 h-4" /> {t.laws}
            </TabsTrigger>
            <TabsTrigger value="converter" className="flex-1 gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ArrowRightLeft className="w-4 h-4" /> {t.converter}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="laws" className="space-y-4 animate-fade-up">
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
                <div key={law.name} className="rounded-2xl border border-white/10 bg-secondary/40 backdrop-blur p-5 transition hover:border-primary/40">
                  <h3 className="font-bold text-foreground mb-1">{law.name}</h3>
                  <div className="font-mono text-lg text-primary mb-2">{law.formula}</div>
                  <p className="text-sm text-muted-foreground">{law.desc}</p>
                </div>
              ))}
            </div>
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-10">{rtl ? "لا توجد نتائج" : "No results"}</p>
            )}
          </TabsContent>

          <TabsContent value="converter" className="animate-fade-up">
            <div className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.value}</label>
                  <Input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={rtl ? "أدخل قيمة" : "Enter value"}
                    className="h-12 rounded-xl bg-background/40 border-white/10"
                    dir={rtl ? "rtl" : "ltr"}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.from} → {t.to}</label>
                  <select
                    value={selected}
                    onChange={(e) => { setSelected(e.target.value); setResult(null); }}
                    className="w-full h-12 rounded-xl bg-background/40 border border-white/10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {CONVERSIONS[language].map((c) => (
                      <option key={c.label} value={c.label}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={convert} className="flex-1 h-12 gap-2">
                  <Calculator className="w-4 h-4" /> {t.convert}
                </Button>
                <Button variant="outline" onClick={() => { setValue(""); setResult(null); }} className="h-12 gap-2">
                  <RotateCcw className="w-4 h-4" /> {t.reset}
                </Button>
              </div>
              {result !== null && (
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-1">{t.result}</p>
                  <p className="text-3xl md:text-4xl font-bold gradient-text">{result}</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default PhysicsLaws;
