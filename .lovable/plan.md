## Problem
The tutor is still returning “I found uploaded files… ask admin to click Index” because the request body shows `clientContext: ""`. That means the browser did not extract readable text from the 55MB bucket PDF before calling the backend. The backend then tries the direct Gemini file path, but logs show `gemini_direct_generate_failed` with `400 INVALID_ARGUMENT`, so it falls back to the Index message.

## Plan
1. **Remove the broken direct-Gemini PDF fallback**
   - Stop using uploaded Gemini File API refs for this chat path since it is consistently returning `INVALID_ARGUMENT`.
   - If the client sends no extracted text, do not show the “click Index” message as the main path.

2. **Make the client extract the bucket PDF reliably**
   - Use the same robust PDF.js settings already used in `src/lib/fileText.ts`: object URL loading, cMaps, standard fonts, wasm path, cleanup batches, and page sampling.
   - Extract up to the needed text limit from the selected chapter bucket file before invoking `subject-agent`.
   - Remove the short timeout that allows `clientContext` to be sent empty for large PDFs.

3. **Add visible extraction failure feedback**
   - If the PDF text extraction truly fails or produces no text, show a clear in-chat message that the PDF may be scanned/image-only or unreadable, instead of sending an empty request that triggers the old fallback.

4. **Simplify backend response generation**
   - Keep the backend focused on answering from `clientContext` or indexed text.
   - Use one reliable Lovable AI model call with timeout handling, not multiple candidate calls or the failing file upload path.

5. **Validate the actual flow**
   - Confirm the network request to `subject-agent` includes non-empty `clientContext` for `biology/ch1`.
   - Confirm a test question such as “cell” gets a content answer or a clear “not in uploaded files” response, not the Index message.

## Technical details
- Main files: `src/components/SubjectAgent.tsx`, `supabase/functions/subject-agent/index.ts`.
- The current failure signal is the network request body: `clientContext: ""`.
- The current backend failure signal is edge logs: `gemini_direct_generate_failed 400 INVALID_ARGUMENT`.
- The fix should prioritize browser-side PDF extraction from Lovable Cloud storage buckets, matching your requirement to rely on bucket files.