import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_chapters",
  title: "List chapters for a subject",
  description: "List uploaded chapter folders available for a given subject.",
  inputSchema: {
    subject: z.string().min(1).describe("Subject id, e.g. physics, chemistry, biology."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ subject }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { data, error } = await supabase.rpc("list_subject_chapters", { _subject: subject });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const chapters = (data ?? []).map((r: { chapter: string }) => r.chapter);
    return {
      content: [{ type: "text", text: JSON.stringify(chapters, null, 2) }],
      structuredContent: { subject, chapters },
    };
  },
});