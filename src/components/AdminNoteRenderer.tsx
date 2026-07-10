import type { AppLanguage } from "@/components/LanguageGate";

export type AdminNoteBlock =
  | { type: "callout"; emoji?: string; text: string }
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "numbered"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "divider" };

export const STUDY_GUIDE_TEMPLATE: AdminNoteBlock[] = [
  { type: "callout", emoji: "💡", text: "Quick overview of what this study guide covers." },
  { type: "heading", level: 1, text: "Chapter overview" },
  { type: "paragraph", text: "Write a short paragraph introducing the topic and why it matters." },
  { type: "heading", level: 2, text: "Key concepts" },
  { type: "bullets", items: ["First key concept", "Second key concept", "Third key concept"] },
  { type: "heading", level: 2, text: "Important formulas / facts" },
  { type: "numbered", items: ["Formula or fact one", "Formula or fact two"] },
  { type: "quote", text: "A memorable quote or definition worth highlighting." },
  { type: "divider" },
  { type: "heading", level: 2, text: "Summary" },
  { type: "paragraph", text: "Wrap up with the 3 takeaways every student should remember." },
];

export const AdminNoteRenderer = ({
  blocks,
  language,
}: {
  blocks: AdminNoteBlock[];
  language: AppLanguage;
}) => {
  const isRTL = language === "ar";
  return (
    <article
      dir={isRTL ? "rtl" : "ltr"}
      className="prose prose-invert max-w-none space-y-4 text-foreground"
    >
      {blocks.map((b, i) => {
        if (b.type === "callout") {
          return (
            <div
              key={i}
              className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4"
            >
              <span className="text-2xl leading-none">{b.emoji || "💡"}</span>
              <p className="text-sm md:text-base leading-relaxed m-0 whitespace-pre-wrap">
                {b.text}
              </p>
            </div>
          );
        }
        if (b.type === "heading") {
          const size =
            b.level === 1
              ? "text-3xl md:text-4xl font-bold"
              : b.level === 2
              ? "text-2xl md:text-3xl font-semibold"
              : "text-xl md:text-2xl font-semibold";
          return (
            <div key={i} className={`${size} tracking-tight text-foreground mt-6 mb-2`}>
              {b.text}
            </div>
          );
        }
        if (b.type === "paragraph") {
          return (
            <p key={i} className="text-base leading-relaxed whitespace-pre-wrap m-0">
              {b.text}
            </p>
          );
        }
        if (b.type === "bullets") {
          return (
            <ul key={i} className="list-disc ps-6 space-y-1.5 m-0">
              {b.items.map((it, j) => (
                <li key={j} className="text-base leading-relaxed">
                  {it}
                </li>
              ))}
            </ul>
          );
        }
        if (b.type === "numbered") {
          return (
            <ol key={i} className="list-decimal ps-6 space-y-1.5 m-0">
              {b.items.map((it, j) => (
                <li key={j} className="text-base leading-relaxed">
                  {it}
                </li>
              ))}
            </ol>
          );
        }
        if (b.type === "quote") {
          return (
            <blockquote
              key={i}
              className="border-s-4 border-primary/60 bg-secondary/40 rounded-e-xl px-4 py-3 italic text-muted-foreground m-0"
            >
              {b.text}
            </blockquote>
          );
        }
        if (b.type === "divider") {
          return <hr key={i} className="border-white/10 my-6" />;
        }
        return null;
      })}
    </article>
  );
};