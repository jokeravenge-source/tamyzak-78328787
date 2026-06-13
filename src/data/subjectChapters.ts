export type ChapterMeta = { n: number; title: string; arTitle: string; subtitle: string; locked: boolean };

export const physicsChapters: ChapterMeta[] = [
  { n: 1, title: "Capacitors", arTitle: "المتسعات", subtitle: "", locked: false },
  { n: 2, title: "Electromagnetic Induction", arTitle: "الحث الكهرومغناطيسي", subtitle: "", locked: false },
  { n: 3, title: "Alternating Current", arTitle: "التيار المتناوب", subtitle: "", locked: false },
  { n: 4, title: "Electromagnetic Waves", arTitle: "الموجات الكهرومغناطيسية", subtitle: "", locked: false },
  { n: 5, title: "Physical Optics", arTitle: "البصريات الفيزيائية", subtitle: "", locked: false },
  { n: 6, title: "Modern Physics", arTitle: "الفيزياء الحديثة", subtitle: "", locked: false },
  { n: 7, title: "Solid State Electronics", arTitle: "إلكترونيات الحالة الصلبة", subtitle: "", locked: false },
  { n: 8, title: "Atomic Spectra and Laser", arTitle: "الأطياف الذرية والليزر", subtitle: "", locked: false },
];

export const biologyChapters: ChapterMeta[] = [
  { n: 1, title: "The Cell", arTitle: "الخلية", subtitle: "", locked: false },
  { n: 2, title: "Tissues", arTitle: "الأنسجة", subtitle: "", locked: false },
  { n: 3, title: "Reproduction", arTitle: "التكاثر", subtitle: "", locked: false },
  { n: 4, title: "Chapter 4", arTitle: "الفصل الرابع", subtitle: "", locked: true },
  { n: 5, title: "Genetics", arTitle: "الوراثة", subtitle: "", locked: false },
];

export const chemistryChapters: ChapterMeta[] = [
  { n: 1, title: "Chapter 1", arTitle: "الفصل الأول", subtitle: "", locked: false },
  { n: 2, title: "Chapter 2", arTitle: "الفصل الثاني", subtitle: "", locked: false },
  { n: 3, title: "Chapter 3", arTitle: "الفصل الثالث", subtitle: "", locked: false },
  { n: 4, title: "Chapter 4", arTitle: "الفصل الرابع", subtitle: "", locked: false },
  { n: 5, title: "Chapter 5", arTitle: "الفصل الخامس", subtitle: "", locked: false },
  { n: 6, title: "Chapter 6", arTitle: "الفصل السادس", subtitle: "", locked: false },
];

export const arabicChapters: ChapterMeta[] = [
  { n: 1, title: "Literature 1", arTitle: "الأدب الجزء الأول", subtitle: "", locked: false },
  { n: 2, title: "Istifham", arTitle: "الاستفهام", subtitle: "", locked: false },
];

export const frenchChapters: ChapterMeta[] = [
  { n: 1, title: "Negation", arTitle: "النفي", subtitle: "ne ... pas / jamais / plus", locked: false },
  { n: 2, title: "Interrogation", arTitle: "الاستفهام", subtitle: "Est-ce que / Inversion", locked: false },
  { n: 3, title: "Relative Pronouns", arTitle: "ضمائر الوصل", subtitle: "Qui / Que / Où / Dont", locked: false },
  { n: 4, title: "Feminization", arTitle: "التأنيث", subtitle: "Règles & exceptions", locked: false },
  { n: 5, title: "Plural", arTitle: "الجمع", subtitle: "Pluriel des noms & adjectifs", locked: false },
  { n: 6, title: "Adverbs", arTitle: "اشتقاق الظروف", subtitle: "-ment / -emment / -amment", locked: false },
];

export const englishChapters: ChapterMeta[] = Array.from({ length: 8 }, (_, i) => ({
  n: i + 1,
  title: `Unit ${i + 1}`,
  arTitle: `الوحدة ${i + 1}`,
  subtitle: "",
  locked: false,
}));

export const islamicChapters: ChapterMeta[] = [
  { n: 1, title: "الوحدة الأولى", arTitle: "الوحدة الأولى", subtitle: "", locked: false },
  { n: 2, title: "الوحدة الثانية", arTitle: "الوحدة الثانية", subtitle: "", locked: false },
  { n: 3, title: "الوحدة الثالثة", arTitle: "الوحدة الثالثة", subtitle: "", locked: false },
  { n: 4, title: "الوحدة الرابعة", arTitle: "الوحدة الرابعة", subtitle: "", locked: false },
];

export const mathChapters: ChapterMeta[] = Array.from({ length: 8 }, (_, i) => ({
  n: i + 1,
  title: `Chapter ${i + 1}`,
  arTitle: `الفصل ${i + 1}`,
  subtitle: "",
  locked: false,
}));

export type BankSubject = "physics" | "chemistry" | "biology" | "english" | "french" | "arabic" | "islamic" | "math";

export const SUBJECTS_ORDER: { code: BankSubject; en: string; ar: string }[] = [
  { code: "physics", en: "Physics", ar: "الفيزياء" },
  { code: "chemistry", en: "Chemistry", ar: "الكيمياء" },
  { code: "biology", en: "Biology", ar: "الأحياء" },
  { code: "english", en: "English", ar: "الإنجليزية" },
  { code: "french", en: "French", ar: "الفرنسية" },
  { code: "arabic", en: "Arabic", ar: "العربية" },
  { code: "islamic", en: "Islamic", ar: "الإسلامية" },
  { code: "math", en: "Mathematics", ar: "الرياضيات" },
];

export const getChaptersForSubject = (subject: BankSubject): ChapterMeta[] => {
  switch (subject) {
    case "physics": return physicsChapters;
    case "chemistry": return chemistryChapters;
    case "biology": return biologyChapters;
    case "english": return englishChapters;
    case "french": return frenchChapters;
    case "arabic": return arabicChapters;
    case "islamic": return islamicChapters;
    case "math": return mathChapters;
  }
};