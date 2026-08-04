// Simple client-side moderation for study-room chat.
// Blocks cursing and romantic/"love" talk so rooms stay study-focused.

const CURSE_WORDS = [
  // English
  "fuck", "fuk", "fck", "shit", "bitch", "bastard", "asshole", "dick", "pussy",
  "cunt", "slut", "whore", "nigga", "nigger", "damn", "crap", "wtf", "stfu",
  // Arabic
  "كس", "طيز", "خرا", "زبي", "زب", "شرموط", "شرموطه", "شرموطة", "قحبه", "قحبة",
  "عرص", "منيوك", "منيوج", "كلب ابن", "يلعن", "لعنه عليك", "حيوان",
];

const LOVE_WORDS = [
  // English
  "i love you", "love you", "babe", "baby", "honey", "darling", "sexy", "kiss",
  "kisses", "hot girl", "hot boy", "girlfriend", "boyfriend", "marry me", "crush on",
  // Arabic
  "احبك", "أحبك", "بحبك", "حبيبي", "حبيبتي", "قلبي", "عمري", "روحي", "غرام",
  "عشق", "اعشقك", "أعشقك", "بوسه", "بوسة", "قبلة", "حبيب قلبي", "تزوجيني", "خطيبتي",
];

const BANNED = [...CURSE_WORDS, ...LOVE_WORDS];

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[0@]/g, "o")
    .replace(/[1!]/g, "i")
    .replace(/\$/g, "s")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Returns the banned terms found in the message (empty array when clean). */
export function findBannedWords(text: string): string[] {
  const norm = normalize(text);
  const padded = ` ${norm} `;
  const hits: string[] = [];
  for (const word of BANNED) {
    const w = normalize(word);
    if (!w) continue;
    if (w.includes(" ") ? padded.includes(` ${w} `) || norm.includes(w) : padded.includes(` ${w} `)) {
      hits.push(word);
    }
  }
  return Array.from(new Set(hits));
}

export function isMessageAllowed(text: string) {
  return findBannedWords(text).length === 0;
}

/** Extra safety net: mask anything that slipped through on render. */
export function censorText(text: string) {
  let out = text;
  for (const word of BANNED) {
    if (!word.trim()) continue;
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(escaped, "gi"), (m) => "*".repeat(m.length));
  }
  return out;
}
