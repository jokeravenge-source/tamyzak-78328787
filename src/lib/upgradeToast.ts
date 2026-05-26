import { toast } from "sonner";

/**
 * Show a friendly toast for AI feature errors. When the edge function returns
 * `upgrade: true` (HTTP 429), nudge the user toward Premium.
 */
export function handleAiError(err: any, opts?: { onUpgrade?: () => void; language?: "en" | "ar" }) {
  const lang = opts?.language ?? "en";
  const upgrade = err?.upgrade ?? err?.context?.upgrade;
  const message = err?.message || err?.error || (lang === "ar" ? "حدث خطأ" : "Something went wrong");
  if (upgrade || /429|free uses|Premium/i.test(String(message))) {
    toast.error(
      lang === "ar"
        ? "استهلكت 5 استخدامات اليومية. رقّ إلى البريميوم للاستخدام غير المحدود."
        : "You've used your 5 free uses today. Upgrade to Premium for unlimited access.",
      {
        action: opts?.onUpgrade
          ? { label: lang === "ar" ? "ترقية" : "Upgrade", onClick: opts.onUpgrade }
          : undefined,
      },
    );
    return;
  }
  toast.error(message);
}