import { auth, defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import listSubjectsTool from "./tools/list-subjects";
import listChaptersTool from "./tools/list-chapters";
import getMyPointsTool from "./tools/get-my-points";
import getMyTodosTool from "./tools/get-my-todos";

// OAuth issuer must be the direct Supabase host, built from the project ref.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "tamyzak-mcp",
  title: "Tamyzak Study App",
  version: "0.1.0",
  instructions:
    "Tools for the Tamyzak study app. Use `list_subjects` and `list_chapters` to discover study material. Use `get_my_points` and `get_my_todos` to read the signed-in student's progress. Use `echo` to verify connectivity.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [echoTool, listSubjectsTool, listChaptersTool, getMyPointsTool, getMyTodosTool],
});