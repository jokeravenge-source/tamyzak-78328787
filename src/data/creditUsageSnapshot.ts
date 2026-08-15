// Snapshot of Lovable platform credit usage for this workspace.
// Lovable billing data is not queryable from the app, so this file is refreshed
// manually (ask the assistant: "refresh the credits snapshot").
export const CREDITS_SNAPSHOT = {
  capturedAt: "2026-08-15",
  periodStart: "2026-08-08",
  periodEnd: "2026-09-08",
  totalGranted: 1814.82,
  totalRemaining: 5,
  periodUsed: 577.8024524,
  dailyRemaining: 5,
  dailyGrant: 5,
  grants: [
    { key: "daily", granted: 5, remaining: 5 },
    { key: "billing", granted: 200, remaining: 0 },
    { key: "rollover", granted: 200, remaining: 0 },
    { key: "top-up", granted: 1309.82, remaining: 0 },
    { key: "bonus", granted: 100, remaining: 0 },
  ],
  items: [
    { item: "Cloud realtime", credits: 266.448545171 },
    { item: "Build mode messages", credits: 191.5 },
    { item: "Cloud egress", credits: 33.755790673 },
    { item: "AI Gateway google/gemini-3.5-flash output tokens", credits: 20.8838404 },
    { item: "Project Monitoring", credits: 20.1 },
    { item: "Cloud compute micro", credits: 14.851512 },
    { item: "AI Gateway google/gemini-3.5-flash input tokens", credits: 10.01634 },
    { item: "AI Gateway google/gemini-3.1-flash-image image output", credits: 5.9136 },
    { item: "AI Gateway google/gemini-2.5-pro output tokens", credits: 4.74612 },
    { item: "AI Gateway google/gemini-2.5-flash output tokens", credits: 3.2318 },
    { item: "AI Gateway google/gemini-3-flash-preview output tokens", credits: 2.231232 },
    { item: "AI Gateway google/gemini-3-flash-preview input tokens", credits: 1.4052 },
    { item: "AI Gateway openai/gpt-4o-mini-tts audio output", credits: 1.232976 },
    { item: "AI Gateway google/gemini-2.5-flash input tokens", credits: 0.772302 },
    { item: "AI Gateway google/gemini-2.5-pro input tokens", credits: 0.29334 },
    { item: "Cloud cached egress", credits: 0.195710752 },
    { item: "Cloud Worker Days", credits: 0.09 },
    { item: "Cloud functions", credits: 0.0706 },
    { item: "Cloud file storage", credits: 0.043634684 },
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
