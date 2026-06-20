import type { Flashcard } from "@/data/flashcards";
import type { TopicGroup } from "@/lib/flashcardTopics";

// Official sub-topic divisions per (subject, chapter), taken from the
// "دفتر مراجعة المتميزين 2026" curriculum booklet. Cards are routed
// into these topics by keyword matching (case-insensitive, Arabic
// diacritics stripped). Topics listed first win on ties, so place
// the most specific sub-topics before the broader ones.

export interface TopicDef {
  key: string;
  ar: string;
  en: string;
  kwAr?: string[];
  kwEn?: string[];
}

const P_CH1: TopicDef[] = [
  { key: "rc", ar: "دوائر RC", en: "RC circuits",
    kwAr: ["دائرة RC", "زمن الاسترخاء", "شحن", "تفريغ"],
    kwEn: ["rc-circuit", "rc circuit", "time constant", "charging", "discharging"] },
  { key: "stored-energy", ar: "الطاقة المختزنة", en: "Stored Energy",
    kwAr: ["الطاقة المختزنة", "طاقة المجال الكهربائي"],
    kwEn: ["stored energy", "energy stored", "electric field energy"] },
  { key: "combinations", ar: "ربط المتسعات", en: "Combinations",
    kwAr: ["على التوالي", "على التوازي", "ربط المتسعات"],
    kwEn: ["series", "parallel", "combination"] },
  { key: "dielectric", ar: "العازل", en: "Dielectric",
    kwAr: ["عازل", "العازل", "ثابت العزل"],
    kwEn: ["dielectric", "permittivity"] },
  { key: "factors", ar: "العوامل المؤثرة", en: "Factors Affecting Capacitance",
    kwAr: ["العوامل المؤثرة", "المسافة بين الصفيحتين", "مساحة الصفيحة"],
    kwEn: ["factors affecting", "plate area", "distance between plates", "separation"] },
  { key: "parallel-plate", ar: "المتسعة ذات الصفيحتين", en: "Parallel-plate Capacitor",
    kwAr: ["متسعة الصفيحتين", "الصفيحتين المتوازيتين"],
    kwEn: ["parallel-plate", "parallel plate"] },
  { key: "types", ar: "أنواع المتسعات", en: "Types of Capacitors",
    kwAr: ["أنواع المتسعات", "متسعة كروية", "متسعة اسطوانية"],
    kwEn: ["types of capacitor", "spherical capacitor", "cylindrical capacitor", "variable capacitor"] },
  { key: "applications", ar: "تطبيقات المتسعات", en: "Applications",
    kwAr: ["تطبيقات", "استخدامات المتسعة"],
    kwEn: ["application", "applications", "uses of capacitor"] },
  { key: "capacitance", ar: "السعة", en: "Capacitance",
    kwAr: ["السعة", "سعة المتسعة"],
    kwEn: ["capacitance"] },
  { key: "capacitor", ar: "المتسعة", en: "Capacitor",
    kwAr: ["متسعة", "المتسعة"],
    kwEn: ["capacitor"] },
];

const P_CH2: TopicDef[] = [
  { key: "lenz", ar: "قانون لنز", en: "Lenz's Law",
    kwAr: ["لنز", "قانون لنز"], kwEn: ["lenz"] },
  { key: "faraday", ar: "قانون فاراداي", en: "Faraday's Law",
    kwAr: ["فاراداي", "قانون فاراداي"], kwEn: ["faraday"] },
  { key: "flux", ar: "الفيض المغناطيسي", en: "Magnetic Flux",
    kwAr: ["الفيض المغناطيسي", "الفيض"], kwEn: ["magnetic flux", "flux"] },
  { key: "eddy", ar: "تيارات إيدي", en: "Eddy Currents",
    kwAr: ["إيدي", "تيارات دوامية"], kwEn: ["eddy"] },
  { key: "self-inductance", ar: "الحث الذاتي", en: "Self Inductance",
    kwAr: ["الحث الذاتي", "معامل الحث الذاتي"], kwEn: ["self inductance", "self-inductance"] },
  { key: "mutual", ar: "الحث المتبادل", en: "Mutual Induction",
    kwAr: ["الحث المتبادل"], kwEn: ["mutual induction", "mutual inductance"] },
  { key: "inductance-energy", ar: "الطاقة في المحث", en: "Energy in Inductor",
    kwAr: ["الطاقة في الملف", "الطاقة الكامنة في المحث"],
    kwEn: ["energy in inductor", "potential energy in inductance"] },
  { key: "generator", ar: "المولدات الكهربائية", en: "Electric Generators",
    kwAr: ["مولد", "المولد"], kwEn: ["generator"] },
  { key: "motor", ar: "محركات DC", en: "DC Motors",
    kwAr: ["محرك", "المحرك"], kwEn: ["motor"] },
  { key: "motional-emf", ar: "القوة الدافعة الحركية", en: "Motional EMF",
    kwAr: ["القوة الدافعة الحركية"], kwEn: ["motional emf", "motional electromotive"] },
  { key: "induced-current", ar: "التيار المحتث", en: "Induced Current",
    kwAr: ["التيار المحتث", "التيار المستحث"], kwEn: ["induced current"] },
  { key: "induced-field", ar: "المجال الكهربائي المحتث", en: "Induced Electric Field",
    kwAr: ["المجال الكهربائي المحتث"], kwEn: ["induced electric field"] },
  { key: "magnetism-intro", ar: "مقدمة المغناطيسية", en: "Magnetism Intro",
    kwAr: ["المغناطيسية", "المغناطيس"], kwEn: ["magnetism", "magnet"] },
  { key: "applications", ar: "تطبيقات الحث", en: "Applications",
    kwAr: ["تطبيقات الحث"], kwEn: ["application", "applications"] },
];

const P_CH3: TopicDef[] = [
  { key: "resonance", ar: "الرنين", en: "Resonance",
    kwAr: ["الرنين", "رنين"], kwEn: ["resonance", "resonant"] },
  { key: "qf", ar: "معامل الجودة", en: "Quality Factor",
    kwAr: ["معامل الجودة", "QF"], kwEn: ["quality factor"] },
  { key: "rlc-parallel", ar: "دائرة R-L-C التوازي", en: "R-L-C Parallel",
    kwAr: ["التوازي", "R-L-C على التوازي"], kwEn: ["parallel"] },
  { key: "rlc-series", ar: "دائرة R-L-C التوالي", en: "R-L-C Series",
    kwAr: ["التوالي", "R-L-C على التوالي", "الممانعة"], kwEn: ["series", "impedance", "r-l-c", "rlc"] },
  { key: "lc-oscillation", ar: "التذبذب الكهرومغناطيسي", en: "EM Oscillation",
    kwAr: ["التذبذب", "دائرة LC"], kwEn: ["oscillation", "lc circuit"] },
  { key: "power-factor", ar: "معامل القدرة", en: "Power Factor",
    kwAr: ["معامل القدرة", "القدرة الحقيقية", "القدرة الظاهرية"],
    kwEn: ["power factor", "real power", "apparent power"] },
  { key: "pure-capacitor", ar: "المتسعة النقية", en: "Pure Capacitor",
    kwAr: ["متسعة نقية", "ممانعة سعوية", "السعوية"],
    kwEn: ["capacitive reactance", "pure capacitor", "xc"] },
  { key: "pure-inductor", ar: "المحث النقي", en: "Pure Inductor",
    kwAr: ["محث نقي", "ممانعة حثية", "الحثية"],
    kwEn: ["inductive reactance", "pure inductor", "xl"] },
  { key: "pure-resistor", ar: "المقاومة النقية", en: "Pure Resistor",
    kwAr: ["مقاومة نقية"], kwEn: ["pure resistor", "pure resistance"] },
  { key: "effective", ar: "القيمة الفعالة", en: "Effective Values",
    kwAr: ["الفعالة", "التيار الفعال"], kwEn: ["effective", "rms"] },
  { key: "ac-intro", ar: "مقدمة التيار المتناوب", en: "AC Intro",
    kwAr: ["التيار المتناوب", "متناوب"], kwEn: ["ac current", "alternating", "ac circuit"] },
];

const P_CH4: TopicDef[] = [
  { key: "radar", ar: "الرادار", en: "Radar",
    kwAr: ["رادار"], kwEn: ["radar"] },
  { key: "propagation", ar: "انتشار الموجات", en: "Propagation",
    kwAr: ["موجة أرضية", "موجة سماوية", "موجة فضائية", "الانتشار"],
    kwEn: ["ground wave", "sky wave", "space wave", "propagation"] },
  { key: "modulation", ar: "التضمين", en: "Modulation (AM/FM/PM)",
    kwAr: ["التضمين", "AM", "FM"], kwEn: ["modulation", "am", "fm", "carrier"] },
  { key: "transmit-receive", ar: "الإرسال والاستقبال", en: "Transmission & Reception",
    kwAr: ["الإرسال", "الاستقبال"], kwEn: ["transmission", "receiving", "receiver"] },
  { key: "maxwell", ar: "نظرية ماكسويل", en: "Maxwell's Theory",
    kwAr: ["ماكسويل"], kwEn: ["maxwell", "displacement current"] },
  { key: "generation", ar: "توليد الموجات", en: "Wave Generation",
    kwAr: ["توليد الموجات", "الشحنات المتذبذبة"],
    kwEn: ["accelerating charges", "oscillating charges", "generating"] },
  { key: "em-waves", ar: "الموجات الكهرومغناطيسية", en: "EM Waves",
    kwAr: ["كهرومغناطيسية"], kwEn: ["electromagnetic wave", "em wave"] },
];

const P_CH5: TopicDef[] = [
  { key: "scattering", ar: "تشتت الضوء", en: "Scattering",
    kwAr: ["تشتت"], kwEn: ["scattering"] },
  { key: "polarization", ar: "استقطاب الضوء", en: "Polarization",
    kwAr: ["استقطاب"], kwEn: ["polarization", "polarized"] },
  { key: "grating", ar: "محزوز الحيود", en: "Diffraction Grating",
    kwAr: ["محزوز", "محزوز الحيود"], kwEn: ["grating"] },
  { key: "diffraction", ar: "الحيود", en: "Diffraction",
    kwAr: ["الحيود", "حيود"], kwEn: ["diffraction"] },
  { key: "thin-films", ar: "الأغشية الرقيقة", en: "Thin Films",
    kwAr: ["الأغشية", "غشاء رقيق"], kwEn: ["thin film", "thin films"] },
  { key: "young", ar: "تجربة يونغ", en: "Young's Double Slit",
    kwAr: ["يونغ", "الشقين"], kwEn: ["young", "double slit"] },
  { key: "interference", ar: "تداخل الضوء", en: "Interference",
    kwAr: ["تداخل"], kwEn: ["interference"] },
];

const P_CH6: TopicDef[] = [
  { key: "mass-energy", ar: "تكافؤ الكتلة والطاقة", en: "Mass-Energy Equivalence",
    kwAr: ["تكافؤ", "الكتلة والطاقة"], kwEn: ["mass-energy", "mass energy"] },
  { key: "lorentz", ar: "تحويلات لورنتز", en: "Lorentz Transformations",
    kwAr: ["لورنتز"], kwEn: ["lorentz"] },
  { key: "relativity", ar: "النسبية", en: "Relativity",
    kwAr: ["النسبية", "نسبية"], kwEn: ["relativity", "relativistic"] },
  { key: "uncertainty", ar: "مبدأ هايزنبرغ", en: "Heisenberg Uncertainty",
    kwAr: ["هايزنبرغ", "اللاتعيين", "الارتياب"],
    kwEn: ["heisenberg", "uncertainty"] },
  { key: "matter-waves", ar: "موجات المادة", en: "Matter Waves",
    kwAr: ["دي برولي", "موجات المادة"], kwEn: ["de broglie", "matter wave"] },
  { key: "particles-waves", ar: "الجسيمات والموجات", en: "Particles and Waves",
    kwAr: ["جسيمية", "موجية"], kwEn: ["particle", "wave-particle"] },
  { key: "photoelectric", ar: "التأثير الكهروضوئي", en: "Photoelectric Effect",
    kwAr: ["الكهروضوئي", "الضوئي الكهربائي"], kwEn: ["photoelectric"] },
  { key: "blackbody", ar: "إشعاع الجسم الأسود", en: "Blackbody / Planck",
    kwAr: ["الجسم الأسود", "بلانك"], kwEn: ["blackbody", "planck", "quantum theory"] },
];

const P_CH7: TopicDef[] = [
  { key: "transistor", ar: "الترانزستور", en: "Transistor",
    kwAr: ["ترانزستور"], kwEn: ["transistor"] },
  { key: "diode-types", ar: "أنواع الثنائيات", en: "Diode Types",
    kwAr: ["أنواع الثنائيات", "زينر", "LED"], kwEn: ["zener", "led", "types of diode"] },
  { key: "biasing", ar: "الانحياز", en: "Biasing",
    kwAr: ["الانحياز", "انحياز أمامي", "انحياز عكسي"],
    kwEn: ["biasing", "forward bias", "reverse bias"] },
  { key: "pn-diode", ar: "الثنائي PN", en: "PN Diode",
    kwAr: ["ثنائي", "PN"], kwEn: ["pn diode", "p-n"] },
  { key: "extrinsic", ar: "أشباه الموصلات غير النقية", en: "Extrinsic Semiconductors",
    kwAr: ["غير النقية", "المطعمة", "تطعيم"], kwEn: ["extrinsic", "doped", "doping", "n-type", "p-type"] },
  { key: "intrinsic", ar: "أشباه الموصلات النقية", en: "Intrinsic Semiconductors",
    kwAr: ["النقية"], kwEn: ["intrinsic"] },
  { key: "bands", ar: "حزم الطاقة", en: "Energy Bands",
    kwAr: ["حزم الطاقة", "حزمة التكافؤ", "حزمة التوصيل"],
    kwEn: ["energy band", "valence band", "conduction band"] },
  { key: "cond-insul-semi", ar: "موصل/عازل/شبه موصل", en: "Conductor/Insulator/Semiconductor",
    kwAr: ["موصل", "عازل", "شبه موصل"],
    kwEn: ["conductor", "insulator", "semiconductor"] },
  { key: "orbits", ar: "المدارات ومستويات الطاقة", en: "Orbits & Energy Levels",
    kwAr: ["المدارات", "مستويات الطاقة"], kwEn: ["orbit", "energy level"] },
];

const P_CH8: TopicDef[] = [
  { key: "laser-apps", ar: "تطبيقات الليزر", en: "Laser Applications",
    kwAr: ["تطبيقات الليزر"], kwEn: ["laser application", "applications of laser"] },
  { key: "laser-types", ar: "أنواع الليزر", en: "Laser Types",
    kwAr: ["أنواع الليزر"], kwEn: ["types of laser", "laser type"] },
  { key: "laser-levels", ar: "أنظمة مستويات الليزر", en: "Laser Levels Systems",
    kwAr: ["مستويات الليزر", "ثلاثي المستويات", "رباعي المستويات"],
    kwEn: ["level system", "three-level", "four-level"] },
  { key: "population", ar: "انعكاس التعداد", en: "Population Inversion",
    kwAr: ["انعكاس التعداد", "بولتزمان"], kwEn: ["population inversion", "boltzmann"] },
  { key: "laser-mechanism", ar: "عمل الليزر", en: "Laser Mechanism",
    kwAr: ["آلية الليزر", "الانبعاث المستحث"],
    kwEn: ["stimulated emission", "spontaneous emission", "laser action"] },
  { key: "laser-props", ar: "خصائص الليزر", en: "Laser Properties",
    kwAr: ["خصائص الليزر"], kwEn: ["properties of laser", "laser properties", "coherent"] },
  { key: "laser", ar: "الليزر والميزر", en: "Laser & Maser",
    kwAr: ["ليزر", "ميزر"], kwEn: ["laser", "maser"] },
  { key: "compton", ar: "ظاهرة كومبتون", en: "Compton Effect",
    kwAr: ["كومبتون"], kwEn: ["compton"] },
  { key: "xrays", ar: "الأشعة السينية", en: "X-Rays",
    kwAr: ["السينية", "الأشعة السينية"], kwEn: ["x-ray", "x ray"] },
  { key: "spectra-types", ar: "أنواع الأطياف", en: "Types of Spectra",
    kwAr: ["أنواع الأطياف"], kwEn: ["types of spectra"] },
  { key: "hydrogen", ar: "طيف الهيدروجين", en: "Hydrogen Spectrum",
    kwAr: ["الهيدروجين"], kwEn: ["hydrogen"] },
  { key: "bohr", ar: "نموذج بور", en: "Bohr Model",
    kwAr: ["بور"], kwEn: ["bohr"] },
  { key: "spectra", ar: "الأطياف", en: "Spectra",
    kwAr: ["طيف", "الأطياف"], kwEn: ["spectrum", "spectra"] },
];

// Chemistry
const C_CH1: TopicDef[] = [
  { key: "gibbs", ar: "الطاقة الحرة", en: "Gibbs Free Energy",
    kwAr: ["جبس", "الطاقة الحرة"], kwEn: ["gibbs", "free energy"] },
  { key: "entropy", ar: "الإنتروبي", en: "Entropy",
    kwAr: ["الإنتروبي", "العشوائية"], kwEn: ["entropy"] },
  { key: "spontaneous", ar: "التلقائية", en: "Spontaneous Processes",
    kwAr: ["تلقائي", "التلقائية"], kwEn: ["spontaneous"] },
  { key: "calculation", ar: "حساب المحتوى الحراري", en: "Calculating Enthalpy",
    kwAr: ["هس", "حساب المحتوى الحراري"], kwEn: ["hess", "calculating enthalpy"] },
  { key: "types-enthalpy", ar: "أنواع المحتوى الحراري", en: "Types of Enthalpy",
    kwAr: ["محتوى التكوين", "محتوى الاحتراق"],
    kwEn: ["enthalpy of formation", "enthalpy of combustion", "types of enthalpy"] },
  { key: "thermochemical", ar: "المعادلات الكيموحرارية", en: "Thermochemical Equations",
    kwAr: ["كيموحرارية"], kwEn: ["thermochemical"] },
  { key: "enthalpy", ar: "المحتوى الحراري", en: "Enthalpy",
    kwAr: ["المحتوى الحراري", "الإنثالبي"], kwEn: ["enthalpy"] },
  { key: "heat", ar: "الحرارة", en: "Heat & Properties",
    kwAr: ["الحرارة", "السعة الحرارية"], kwEn: ["heat", "heat capacity", "specific heat"] },
  { key: "thermo-terms", ar: "مصطلحات الديناميكا", en: "Thermodynamic Terms",
    kwAr: ["نظام", "محيط", "وحدات الطاقة"],
    kwEn: ["system", "surrounding", "state function", "units of energy"] },
];

const C_CH2: TopicDef[] = [
  { key: "lechatelier", ar: "مبدأ لوتشاتلييه", en: "Le Chatelier",
    kwAr: ["لوتشاتلييه", "لوشاتلييه"], kwEn: ["le chatelier", "chatelier"] },
  { key: "factors", ar: "العوامل المؤثرة في الاتزان", en: "Factors Affecting Equilibrium",
    kwAr: ["العوامل المؤثرة"], kwEn: ["factors affecting"] },
  { key: "quotient", ar: "حاصل التفاعل Q", en: "Reaction Quotient",
    kwAr: ["حاصل التفاعل"], kwEn: ["reaction quotient", "q"] },
  { key: "kp-kc", ar: "Kp و Kc", en: "Kp & Kc Relationship",
    kwAr: ["Kp", "Kc"], kwEn: ["kp", "kc"] },
  { key: "constant", ar: "ثابت الاتزان", en: "Equilibrium Constant",
    kwAr: ["ثابت الاتزان"], kwEn: ["equilibrium constant"] },
  { key: "mass-action", ar: "قانون فعل الكتلة", en: "Law of Mass Action",
    kwAr: ["فعل الكتلة"], kwEn: ["mass action"] },
  { key: "homo-hetero", ar: "متجانس/غير متجانس", en: "Homogeneous / Heterogeneous",
    kwAr: ["متجانس", "غير متجانس"], kwEn: ["homogeneous", "heterogeneous"] },
  { key: "reversible", ar: "التفاعلات الانعكاسية", en: "Reversible Reactions",
    kwAr: ["الانعكاسي", "انعكاسية"], kwEn: ["reversible", "irreversible"] },
];

const C_CH3: TopicDef[] = [
  { key: "ksp", ar: "ثابت الذوبان Ksp", en: "Solubility Product",
    kwAr: ["ثابت الذوبان", "Ksp"], kwEn: ["ksp", "solubility product"] },
  { key: "buffer", ar: "المحاليل المنظمة", en: "Buffer Solutions",
    kwAr: ["المحاليل المنظمة", "منظم"], kwEn: ["buffer"] },
  { key: "common-ion", ar: "الأيون المشترك", en: "Common Ion Effect",
    kwAr: ["الأيون المشترك"], kwEn: ["common ion"] },
  { key: "solvolysis", ar: "التحلل بالمذيب", en: "Solvolysis",
    kwAr: ["التحلل بالمذيب", "التميؤ"], kwEn: ["solvolysis", "hydrolysis"] },
  { key: "ph", ar: "الأس الهيدروجيني", en: "pH",
    kwAr: ["الأس الهيدروجيني", "pH"], kwEn: ["ph", "hydrogen ion exponent"] },
  { key: "water-ion", ar: "التأين الذاتي للماء", en: "Self-Ionization of Water",
    kwAr: ["تأين الماء"], kwEn: ["self-ionization", "ionization of water", "kw"] },
  { key: "weak", ar: "الإلكتروليتات الضعيفة", en: "Weak Electrolytes",
    kwAr: ["الإلكتروليتات الضعيفة", "تفكك"], kwEn: ["weak electrolyte", "dissociation"] },
  { key: "electrolytes", ar: "الإلكتروليتات", en: "Electrolytes",
    kwAr: ["إلكتروليت"], kwEn: ["electrolyte"] },
];

const C_CH4: TopicDef[] = [
  { key: "batteries", ar: "البطاريات وخلايا الوقود", en: "Batteries & Fuel Cells",
    kwAr: ["بطارية", "خلايا الوقود"], kwEn: ["battery", "batteries", "fuel cell"] },
  { key: "electrolytic", ar: "الخلايا التحليلية", en: "Electrolytic Cells",
    kwAr: ["الخلايا التحليلية", "التحليل الكهربائي"], kwEn: ["electrolytic", "electrolysis"] },
  { key: "faraday-law", ar: "قوانين فاراداي", en: "Faraday's Laws",
    kwAr: ["فاراداي"], kwEn: ["faraday's law", "faraday law"] },
  { key: "galvanic", ar: "الخلايا الجلفانية", en: "Galvanic Cells",
    kwAr: ["الجلفانية", "جلفاني"], kwEn: ["galvanic"] },
  { key: "agents", ar: "العوامل المؤكسدة/المختزلة", en: "Oxidizing & Reducing Agents",
    kwAr: ["العامل المؤكسد", "العامل المختزل"], kwEn: ["oxidizing agent", "reducing agent"] },
  { key: "redox", ar: "تفاعلات الأكسدة والاختزال", en: "Redox Reactions",
    kwAr: ["الأكسدة والاختزال", "أكسدة-اختزال"],
    kwEn: ["oxidation-reduction", "redox", "oxidation reduction"] },
  { key: "oxidation-number", ar: "أعداد التأكسد", en: "Oxidation Numbers",
    kwAr: ["عدد التأكسد", "أعداد التأكسد"], kwEn: ["oxidation number"] },
  { key: "ec-cells", ar: "الخلايا الكهروكيميائية", en: "Electrochemical Cells",
    kwAr: ["كهروكيميائية"], kwEn: ["electrochemical cell"] },
];

const C_CH5: TopicDef[] = [
  { key: "geometry", ar: "الأعداد التناسقية والأشكال", en: "Coordination Numbers & Geometry",
    kwAr: ["العدد التناسقي", "الشكل الهندسي"], kwEn: ["coordination number", "geometrical shape", "geometry"] },
  { key: "bonding", ar: "نظريات الترابط", en: "Bonding Theories",
    kwAr: ["نظرية الترابط", "VBT", "CFT"], kwEn: ["bonding theory", "valence bond", "crystal field"] },
  { key: "naming", ar: "تسمية المعقدات", en: "Naming Coordination Compounds",
    kwAr: ["تسمية المركبات", "تسمية المعقدات"], kwEn: ["naming"] },
  { key: "ean", ar: "قاعدة EAN", en: "EAN Rule",
    kwAr: ["EAN", "العدد الذري الفعال"], kwEn: ["ean", "effective atomic number"] },
  { key: "ligands", ar: "الليجاندات", en: "Ligands",
    kwAr: ["ليجاند", "ليكاند"], kwEn: ["ligand"] },
  { key: "double-salt", ar: "الأملاح المزدوجة والمعقدات", en: "Double Salt & Coordination",
    kwAr: ["الملح المزدوج", "المركبات التناسقية"],
    kwEn: ["double salt", "coordination compound"] },
];

const C_CH6: TopicDef[] = [
  { key: "precipitation", ar: "طرق الترسيب", en: "Precipitation Methods",
    kwAr: ["الترسيب"], kwEn: ["precipitation"] },
  { key: "volumetric", ar: "التحليل الحجمي", en: "Volumetric Analysis",
    kwAr: ["الحجمي", "المعايرة"], kwEn: ["volumetric", "titration"] },
  { key: "gravimetric", ar: "التحليل الوزني", en: "Gravimetric Analysis",
    kwAr: ["الوزني"], kwEn: ["gravimetric"] },
  { key: "quantitative", ar: "التحليل الكمي", en: "Quantitative Analysis",
    kwAr: ["الكمي"], kwEn: ["quantitative"] },
  { key: "qualitative", ar: "التحليل النوعي", en: "Qualitative Analysis",
    kwAr: ["النوعي"], kwEn: ["qualitative"] },
];

// Biology
const B_CH1: TopicDef[] = [
  { key: "division", ar: "الانقسام الخلوي", en: "Cell Division",
    kwAr: ["انقسام", "الانقسام", "الميتوزي", "الميوزي"],
    kwEn: ["mitosis", "meiosis", "cell division"] },
  { key: "activities", ar: "نشاطات الخلية", en: "Cell Activities",
    kwAr: ["النقل النشط", "الانتشار", "التناضح", "البلعمة"],
    kwEn: ["active transport", "diffusion", "osmosis", "phagocytosis"] },
  { key: "eukaryotic", ar: "الخلية حقيقية النواة", en: "Eukaryotic Cell",
    kwAr: ["حقيقية النواة", "الميتوكوندريا", "البلاستيدات", "ليسوسوم"],
    kwEn: ["eukaryotic", "mitochondria", "chloroplast", "lysosome", "nucleus"] },
  { key: "prokaryotic", ar: "الخلية بدائية النواة", en: "Prokaryotic Cell",
    kwAr: ["بدائية النواة", "البكتيريا"], kwEn: ["prokaryotic", "bacteria"] },
  { key: "size", ar: "حجم الخلية", en: "Cell Size",
    kwAr: ["حجم الخلية"], kwEn: ["cell size"] },
  { key: "theory", ar: "نظرية الخلية", en: "Cell Theory",
    kwAr: ["نظرية الخلية"], kwEn: ["cell theory"] },
];

const B_CH2: TopicDef[] = [
  { key: "nervous", ar: "النسيج العصبي", en: "Nervous Tissue",
    kwAr: ["العصبي", "العصبون"], kwEn: ["nervous", "neuron"] },
  { key: "muscle", ar: "النسيج العضلي", en: "Muscle Tissue",
    kwAr: ["عضلي", "العضلة"], kwEn: ["muscle", "muscular", "skeletal muscle", "smooth muscle", "cardiac"] },
  { key: "connective", ar: "النسيج الضام", en: "Connective Tissue",
    kwAr: ["الضام"], kwEn: ["connective"] },
  { key: "epithelial", ar: "النسيج الطلائي", en: "Epithelial Tissue",
    kwAr: ["الطلائي", "طلائي"], kwEn: ["epithelial", "epithelium"] },
  { key: "plant", ar: "الأنسجة النباتية", en: "Plant Tissues",
    kwAr: ["نباتي", "اللحاء", "الخشب"], kwEn: ["plant tissue", "phloem", "xylem"] },
  { key: "animal", ar: "الأنسجة الحيوانية", en: "Animal Tissues",
    kwAr: ["حيواني"], kwEn: ["animal tissue"] },
];

const B_CH3: TopicDef[] = [
  { key: "animals", ar: "التكاثر في الحيوانات", en: "Reproduction in Animals",
    kwAr: ["في الحيوانات", "حيواني"], kwEn: ["in animals", "animal reproduction"] },
  { key: "plants", ar: "التكاثر في النباتات", en: "Reproduction in Plants",
    kwAr: ["في النباتات", "زهرة", "بذرة"], kwEn: ["in plants", "flower", "seed", "pollination"] },
  { key: "fungi", ar: "التكاثر في الفطريات", en: "Reproduction in Fungi",
    kwAr: ["الفطريات"], kwEn: ["fungi", "fungus"] },
  { key: "protista", ar: "التكاثر في الطلائعيات", en: "Reproduction in Protista",
    kwAr: ["الطلائعيات", "البراميسيوم", "اليوغلينا"],
    kwEn: ["protista", "paramecium", "euglena"] },
  { key: "monera", ar: "التكاثر في البدائيات", en: "Reproduction in Monera",
    kwAr: ["البدائيات", "البكتيريا"], kwEn: ["monera", "bacteria"] },
  { key: "viruses", ar: "التكاثر في الفيروسات", en: "Reproduction in Viruses",
    kwAr: ["الفيروسات", "فيروس"], kwEn: ["virus", "viruses"] },
  { key: "parthenogenesis", ar: "التوالد العذري والخنثوية", en: "Parthenogenesis & Hermaphroditism",
    kwAr: ["العذري", "الخنثوية"], kwEn: ["parthenogenesis", "hermaphroditism"] },
  { key: "types", ar: "أنواع التكاثر", en: "Types of Reproduction",
    kwAr: ["أنواع التكاثر", "تكاثر جنسي", "تكاثر لا جنسي"],
    kwEn: ["types of reproduction", "sexual reproduction", "asexual"] },
];

const B_CH5: TopicDef[] = [
  { key: "molecular", ar: "الأساس الجزيئي للوراثة", en: "Molecular Basis of Genetics",
    kwAr: ["الجزيئي", "DNA", "RNA", "الحمض النووي"],
    kwEn: ["dna", "rna", "molecular", "nucleic acid"] },
  { key: "post-mendel", ar: "وراثة ما بعد مندل", en: "Post-Mendel Genetics",
    kwAr: ["ما بعد مندل", "السيادة غير التامة", "تعدد الأليلات"],
    kwEn: ["post mendel", "incomplete dominance", "co-dominance", "multiple alleles"] },
  { key: "mendel", ar: "وراثة مندل", en: "Mendelian Genetics",
    kwAr: ["مندل", "الانعزال", "التوزيع الحر"],
    kwEn: ["mendel", "segregation", "independent assortment"] },
  { key: "history", ar: "الوراثة قبل مندل", en: "Genetics Before Mendel",
    kwAr: ["قبل مندل"], kwEn: ["before mendel", "history of genetics"] },
];

// Arabic — chapters in the app: 1 = Lit1, 2 = Istifham, 3 = Madh/Dham,
// 4 = Ta'ajjub, 5 = Nida. Sub-topics from the PDF.
const A_ISTIFHAM: TopicDef[] = [
  { key: "majazi", ar: "الاستفهام المجازي", en: "Figurative",
    kwAr: ["مجازي", "المجازي"] },
  { key: "kam-ayy", ar: "كم وأي", en: "Kam & Ayy",
    kwAr: ["كم", "أي ", "اي "] },
  { key: "kayf-anna", ar: "كيف وأنى", en: "Kayf & Anna",
    kwAr: ["كيف", "أنى", "انى"] },
  { key: "ayna", ar: "أين وأنى", en: "Ayna",
    kwAr: ["أين", "اين"] },
  { key: "mata-ayyan", ar: "متى وأيان", en: "Mata & Ayyan",
    kwAr: ["متى", "أيان", "ايان"] },
  { key: "ma", ar: "ما (غير العاقل)", en: "Ma",
    kwAr: ["ما "] },
  { key: "man", ar: "من (العاقل)", en: "Man",
    kwAr: ["من "] },
  { key: "huruf", ar: "حرفا الاستفهام (هل/الهمزة)", en: "Particles (Hal/Hamza)",
    kwAr: ["هل", "الهمزة"] },
];

const A_TAAJJUB: TopicDef[] = [
  { key: "qiyasi-afil-bihi", ar: "أفعل به", en: "Af'il bihi",
    kwAr: ["أفعل به", "افعل به"] },
  { key: "qiyasi-ma-afalahu", ar: "ما أفعله", en: "Ma af'alahu",
    kwAr: ["ما أفعله", "ما افعله"] },
  { key: "sama-istifham", ar: "الاستفهام المتضمن التعجب", en: "Figurative Istifham",
    kwAr: ["استفهام", "المجازي"] },
  { key: "sama-istigh", ar: "الاستغاثة", en: "Istighatha",
    kwAr: ["استغاثة", "الاستغاثة"] },
  { key: "sama-ajab", ar: "عجب ومشتقاته", en: "Ajab",
    kwAr: ["عجب", "العجب"] },
  { key: "sama-subhan", ar: "سبحان ومشتقاته", en: "Subhan",
    kwAr: ["سبحان"] },
  { key: "sama-lillahi", ar: "لله در", en: "Lillahi darr",
    kwAr: ["لله در", "لله أيام", "لله مواعيد"] },
];

const A_NIDA: TopicDef[] = [
  { key: "tarkheem", ar: "الترخيم", en: "Tarkheem",
    kwAr: ["ترخيم", "الترخيم"] },
  { key: "ab-um", ar: "أب وأم", en: "Ab/Um",
    kwAr: ["أب", "أم"] },
  { key: "moarraf-al", ar: "المنادى المعرف بأل", en: "Definite with Al",
    kwAr: ["المعرف بال", "المعرف بأل"] },
  { key: "hadhf", ar: "حذف حرف النداء", en: "Omission of Particle",
    kwAr: ["حذف حرف", "حذف أداة"] },
  { key: "munada-moarrab", ar: "المنادى المعرب", en: "Mu'arab Munada",
    kwAr: ["معرب", "المنادى المعرب"] },
  { key: "munada-mabni", ar: "المنادى المبني", en: "Mabni Munada",
    kwAr: ["مبني", "المنادى المبني"] },
  { key: "adawat", ar: "أدوات النداء", en: "Nida Particles",
    kwAr: ["يا", "أيا", "هيا", "أي "] },
];

const A_MADH_DHAM: TopicDef[] = [
  { key: "ism-makhsus", ar: "الاسم المخصوص", en: "Specified Noun",
    kwAr: ["المخصوص", "الاسم المخصوص"] },
  { key: "afal-dham", ar: "أفعال الذم", en: "Dham Verbs",
    kwAr: ["بئس", "لا حبذا"] },
  { key: "afal-madh", ar: "أفعال المدح", en: "Madh Verbs",
    kwAr: ["نعم", "حبذا"] },
  { key: "fail-states", ar: "حالات الفاعل", en: "Fa'il States",
    kwAr: ["ضمير مستتر", "اسم موصول", "معرف بال", "مضاف"] },
];

export const TOPIC_PRESETS: Record<string, TopicDef[]> = {
  "physics:1": P_CH1, "physics:2": P_CH2, "physics:3": P_CH3, "physics:4": P_CH4,
  "physics:5": P_CH5, "physics:6": P_CH6, "physics:7": P_CH7, "physics:8": P_CH8,
  "chemistry:1": C_CH1, "chemistry:2": C_CH2, "chemistry:3": C_CH3,
  "chemistry:4": C_CH4, "chemistry:5": C_CH5, "chemistry:6": C_CH6,
  "biology:1": B_CH1, "biology:2": B_CH2, "biology:3": B_CH3, "biology:5": B_CH5,
  "arabic:2": A_ISTIFHAM, "arabic:3": A_MADH_DHAM,
  "arabic:4": A_TAAJJUB, "arabic:5": A_NIDA,
};

function normalizeAr(s: string): string {
  return s
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه");
}

function prepText(text: string): { ar: string; en: string } {
  return {
    ar: normalizeAr(text),
    en: text.toLowerCase(),
  };
}

function matchScore(card: Flashcard, def: TopicDef): number {
  const blob = card.q + " \n " + card.a;
  const prepped = prepText(blob);
  let score = 0;
  if (def.kwAr) {
    for (const k of def.kwAr) {
      if (prepped.ar.includes(normalizeAr(k))) score += 1;
    }
  }
  if (def.kwEn) {
    for (const k of def.kwEn) {
      if (prepped.en.includes(k.toLowerCase())) score += 1;
    }
  }
  return score;
}

export function buildPresetGroups(
  subject: string,
  chapter: string,
  uiLang: "ar" | "en",
  cards: Flashcard[],
): TopicGroup[] | null {
  const defs = TOPIC_PRESETS[`${subject}:${chapter}`];
  if (!defs || cards.length === 0) return null;

  const buckets = new Map<string, Flashcard[]>();
  const general: Flashcard[] = [];

  for (const card of cards) {
    let bestKey: string | null = null;
    let bestScore = 0;
    let bestIndex = -1;
    defs.forEach((def, i) => {
      const s = matchScore(card, def);
      if (s > bestScore || (s > 0 && s === bestScore && bestIndex === -1)) {
        bestScore = s;
        bestKey = def.key;
        bestIndex = i;
      }
    });
    if (bestKey && bestScore > 0) {
      const arr = buckets.get(bestKey) ?? [];
      arr.push(card);
      buckets.set(bestKey, arr);
    } else {
      general.push(card);
    }
  }

  const groups: TopicGroup[] = [];
  for (const def of defs) {
    const arr = buckets.get(def.key);
    if (arr && arr.length > 0) {
      groups.push({
        key: def.key,
        label: uiLang === "ar" ? def.ar : def.en,
        cards: arr,
      });
    }
  }
  if (general.length > 0) {
    groups.push({
      key: "__general__",
      label: uiLang === "ar" ? "عام" : "General",
      cards: general,
    });
  }

  // Only useful if we actually split into multiple buckets.
  if (groups.length < 2) return null;
  return groups;
}