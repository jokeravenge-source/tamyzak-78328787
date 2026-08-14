// Snapshot of Lovable platform credit usage for this workspace.
// Lovable billing data is not queryable from the app, so this file is refreshed
// manually (ask the assistant: "refresh the credits snapshot").
export const CREDITS_SNAPSHOT = {
  capturedAt: "2026-08-14",
  periodStart: "2026-08-08",
  periodEnd: "2026-09-08",
  totalGranted: 1764.82,
  totalRemaining: 2.3,
  periodUsed: 525.5024524,
  dailyRemaining: 2.3,
  dailyGrant: 5,
  grants: [
    { key: "daily", granted: 5, remaining: 2.3 },
    { key: "billing", granted: 200, remaining: 0 },
    { key: "rollover", granted: 200, remaining: 0 },
    { key: "top-up", granted: 1259.82, remaining: 0 },
    { key: "bonus", granted: 100, remaining: 0 },
  ],
  items: [
    { item: "Cloud realtime", credits: 243.391159785 },
    { item: "Build mode messages", credits: 182.0 },
    { item: "Cloud egress", credits: 29.912991274 },
    { item: "Project Monitoring", credits: 17.8 },
    { item: "AI Gateway google/gemini-3.5-flash output tokens", credits: 17.3736604 },
    { item: "Cloud compute micro", credits: 12.381936 },
    { item: "AI Gateway google/gemini-3.5-flash input tokens", credits: 8.22951 },
    { item: "AI Gateway google/gemini-2.5-pro output tokens", credits: 3.53024 },
    { item: "AI Gateway google/gemini-3.1-flash-image image output", credits: 3.2256 },
    { item: "AI Gateway google/gemini-2.5-flash output tokens", credits: 2.326 },
    { item: "AI Gateway google/gemini-3-flash-preview output tokens", credits: 2.087028 },
    { item: "AI Gateway google/gemini-3-flash-preview input tokens", credits: 1.247926 },
    { item: "AI Gateway openai/gpt-4o-mini-tts audio output", credits: 0.78576 },
    { item: "AI Gateway google/gemini-2.5-flash input tokens", credits: 0.6229692 },
    { item: "AI Gateway google/gemini-2.5-pro input tokens", credits: 0.21775 },
    { item: "Cloud cached egress", credits: 0.190156081 },
    { item: "Cloud Worker Days", credits: 0.07 },
    { item: "Cloud functions", credits: 0.05892 },
    { item: "Cloud file storage", credits: 0.03567814 },
    { item: "Cloud compute pico", credits: 0.00774192 },
  ],
};

export type CreditCategory = "Realtime" | "Build (editing)" | "AI models" | "Cloud infra" | "Monitoring";

export function categorize(item: string): CreditCategory {
  if (item.startsWith("AI Gateway")) return "AI models";
  if (item.toLowerCase().includes("realtime")) return "Realtime";
  if (item.toLowerCase().includes("build mode")) return "Build (editing)";
  if (item.toLowerCase().includes("monitoring")) return "Monitoring";
  return "Cloud infra";
}
