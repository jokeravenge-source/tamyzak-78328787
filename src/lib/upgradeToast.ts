import { toast } from "sonner";

/**
 * The timezone all daily AI-tool quotas reset in. Kept in one place so UI
 * copy stays in sync with the SQL function `claim_daily_feature`.
 */
export const RESET_TIMEZONE = "Asia/Baghdad" as const;
export const RESET_LABEL_EN = "resets at midnight Baghdad time (UTC+3)";
export const RESET_LABEL_AR = "يُعاد الضبط عند منتصف الليل بتوقيت بغداد (UTC+3)";

/**
 * Show a friendly toast for AI feature errors. When the edge function returns
 * `upgrade: true` (HTTP 429), nudge the user toward Premium.
 */
export function handleAiError(err: any, opts?: { onUpgrade?: () => void; language?: "en" | "ar" }) {
  const lang = opts?.language ?? "en";
  const upgrade = err?.upgrade ?? err?.context?.upgrade;
  const message = err?.message || err?.error || (lang === "ar" ? "حدث خطأ" : "Something went wrong");
  if (upgrade || /429|free uses|free daily use|Premium/i.test(String(message))) {
    toast.error(
      lang === "ar"
        ? `استهلكت حدّك اليومي لهذه الأداة. ${RESET_LABEL_AR}.`
        : `You've reached today's usage limit for this tool. It ${RESET_LABEL_EN}.`,
    );
    return;
  }
  toast.error(message);
}