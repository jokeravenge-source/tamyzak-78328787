import { defineTool } from "@lovable.dev/mcp-js";

const SUBJECTS = [
  { id: "physics", en: "Physics", ar: "الفيزياء" },
  { id: "chemistry", en: "Chemistry", ar: "الكيمياء" },
  { id: "biology", en: "Biology", ar: "الأحياء" },
  { id: "english", en: "English", ar: "الإنجليزية" },
  { id: "french", en: "French", ar: "الفرنسية" },
  { id: "arabic", en: "Arabic", ar: "العربية" },
  { id: "islamic", en: "Islamic Education", ar: "التربية الإسلامية" },
];

export default defineTool({
  name: "list_subjects",
  title: "List subjects",
  description: "List all study subjects available in the app.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: JSON.stringify(SUBJECTS, null, 2) }],
    structuredContent: { subjects: SUBJECTS },
  }),
});