import type { Flashcard } from "@/data/flashcards";

// Lightweight, language-aware topic detection for a deck of flashcards.
// No external NLP — purely frequency-based keyword clustering so it works
// across every subject (physics, chem, bio, arabic, english, french, islamic).

const EN_STOP = new Set<string>([
  "the","a","an","of","and","or","to","in","on","for","with","is","are","was","were",
  "be","been","being","by","at","as","from","that","this","these","those","it","its",
  "what","which","who","whom","whose","when","where","why","how","does","do","did",
  "can","could","should","would","may","might","will","shall","has","have","had",
  "not","no","yes","than","then","so","such","into","about","over","under","between",
  "among","also","more","most","less","least","very","much","many","some","any",
  "each","every","all","both","one","two","three","other","another","same","define",
  "name","list","give","state","mention","describe","explain","compare","contrast",
  "their","there","they","them","he","she","his","her","you","your","we","our","i",
  "if","but","because","while","during","before","after","per","via","using","use",
  "used","example","examples","type","types","kind","kinds","form","forms","value",
  "values","term","terms","called","known","mean","means","meaning","known",
]);

const AR_STOP = new Set<string>([
  "في","من","الى","إلى","على","عن","مع","او","أو","و","ثم","ما","ماذا","ماهو",
  "ماهي","هل","كيف","لماذا","متى","اين","أين","ذلك","تلك","هذا","هذه","هؤلاء",
  "التي","الذي","الذين","اللواتي","اللاتي","كان","كانت","يكون","تكون","يوجد",
  "هي","هو","هم","هن","انت","أنت","انتم","أنتم","نحن","انا","أنا","قد","لقد",
  "اي","أي","ايضا","أيضا","عند","عندما","حيث","حتى","لكي","كي","لان","لأن",
  "اذا","إذا","لو","لم","لن","لا","ليس","ليست","غير","بين","حول","فوق","تحت",
  "كل","بعض","معظم","اكثر","أكثر","اقل","أقل","نوع","انواع","أنواع","تعريف",
  "عرف","عرّف","اذكر","أذكر","ما هو","ما هي","ماهو","ماهي","قانون","صيغة",
  "وحدة","وحدات","مثال","امثلة","أمثلة","رمز","قيمة","قيم","سبب","اسباب","أسباب",
  "تأثير","العلاقة","علاقة","يسمى","تسمى","عبارة","البيت","ابو","أبو","بن","ابن",
]);

function normalizeAr(s: string) {
  return s
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "") // diacritics + tatweel
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه");
}

function tokenize(text: string, lang: "ar" | "en"): string[] {
  if (!text) return [];
  if (lang === "ar") {
    const norm = normalizeAr(text);
    return (norm.match(/[\u0600-\u06FF]+/g) ?? [])
      .filter((w) => w.length >= 3 && !AR_STOP.has(w));
  }
  return (text.toLowerCase().match(/[a-z][a-z\-]{2,}/g) ?? [])
    .filter((w) => !EN_STOP.has(w));
}

function detectLang(sample: string): "ar" | "en" {
  return /[\u0600-\u06FF]/.test(sample) ? "ar" : "en";
}

export interface TopicGroup {
  key: string;
  label: string;
  cards: Flashcard[];
}

export interface TopicResult {
  topics: TopicGroup[]; // first item is always "All"
  allKey: string;
}

const ALL_KEY = "__all__";
const GENERAL_KEY = "__general__";

export function groupFlashcardsByTopic(
  cards: Flashcard[],
  uiLang: "ar" | "en",
): TopicResult {
  if (cards.length < 6) {
    return {
      allKey: ALL_KEY,
      topics: [
        {
          key: ALL_KEY,
          label: uiLang === "ar" ? "الكل" : "All",
          cards: [...cards],
        },
      ],
    };
  }

  const sample = cards.slice(0, 5).map((c) => c.q + " " + c.a).join(" ");
  const lang = detectLang(sample);

  // Build df (document frequency) per token across questions (weighted) + answers.
  const tokensPerCard: string[][] = cards.map((c) => {
    const qTokens = tokenize(c.q, lang);
    const aTokens = tokenize(c.a, lang);
    // Questions matter more for topic-of-card than answers.
    return [...qTokens, ...qTokens, ...aTokens];
  });

  const df = new Map<string, number>();
  tokensPerCard.forEach((toks) => {
    const uniq = new Set(toks);
    uniq.forEach((t) => df.set(t, (df.get(t) ?? 0) + 1));
  });

  const N = cards.length;
  const minDf = Math.max(3, Math.ceil(N * 0.06));
  const maxDf = Math.max(minDf + 1, Math.floor(N * 0.55));

  const candidates = [...df.entries()]
    .filter(([t, f]) => f >= minDf && f <= maxDf && t.length >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([t]) => t);

  if (candidates.length === 0) {
    return {
      allKey: ALL_KEY,
      topics: [
        { key: ALL_KEY, label: uiLang === "ar" ? "الكل" : "All", cards: [...cards] },
      ],
    };
  }

  // Assign each card to its highest-df candidate token that it contains
  // (questions weighted x2 via tokensPerCard above).
  const buckets = new Map<string, Flashcard[]>();
  const assigned = new Array<string | null>(cards.length).fill(null);

  cards.forEach((card, i) => {
    const toks = new Set(tokensPerCard[i]);
    let best: string | null = null;
    let bestScore = -1;
    for (const t of candidates) {
      if (!toks.has(t)) continue;
      const score = df.get(t) ?? 0;
      if (score > bestScore) {
        bestScore = score;
        best = t;
      }
    }
    assigned[i] = best;
    const key = best ?? GENERAL_KEY;
    const arr = buckets.get(key) ?? [];
    arr.push(card);
    buckets.set(key, arr);
  });

  // Merge buckets that are too small into General.
  const minBucket = Math.max(3, Math.ceil(N * 0.05));
  const general: Flashcard[] = buckets.get(GENERAL_KEY) ?? [];
  const finalBuckets: { key: string; cards: Flashcard[] }[] = [];
  for (const [key, arr] of buckets) {
    if (key === GENERAL_KEY) continue;
    if (arr.length < minBucket) {
      general.push(...arr);
    } else {
      finalBuckets.push({ key, cards: arr });
    }
  }

  finalBuckets.sort((a, b) => b.cards.length - a.cards.length);
  // cap to 8 topics, dump rest into General
  const MAX_TOPICS = 8;
  if (finalBuckets.length > MAX_TOPICS) {
    const extra = finalBuckets.splice(MAX_TOPICS);
    extra.forEach((b) => general.push(...b.cards));
  }

  const labelize = (token: string) => {
    if (lang === "ar") return token; // Arabic tokens are already meaningful words.
    return token.charAt(0).toUpperCase() + token.slice(1);
  };

  const topics: TopicGroup[] = [
    { key: ALL_KEY, label: uiLang === "ar" ? "الكل" : "All", cards: [...cards] },
    ...finalBuckets.map((b) => ({
      key: b.key,
      label: labelize(b.key),
      cards: b.cards,
    })),
  ];

  if (general.length > 0) {
    topics.push({
      key: GENERAL_KEY,
      label: uiLang === "ar" ? "عام" : "General",
      cards: general,
    });
  }

  // If clustering ended up putting everything in one bucket, drop the chips.
  const nonAll = topics.filter((t) => t.key !== ALL_KEY);
  if (nonAll.length <= 1) {
    return {
      allKey: ALL_KEY,
      topics: [{ key: ALL_KEY, label: uiLang === "ar" ? "الكل" : "All", cards: [...cards] }],
    };
  }

  return { allKey: ALL_KEY, topics };
}