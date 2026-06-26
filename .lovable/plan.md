## Goal
Let the user paste any text and get back a whiteboard-style explainer video (animated drawings + Arabic voice-over) that simplifies it.

## Where it appears
1. **New page** `src/pages/TextToVideo.tsx` at route `/text-to-video`, listed as a card in the Study Tools grid (and surfaced on the home dashboard tools list).
2. **Inside Notes** (`src/pages/Notes.tsx`) — a new "حوّل إلى فيديو" button next to the existing PDF export, which prefills the new page with the note's text.

## How it works
1. User pastes/auto-fills text + picks language (AR default) + length (short / medium).
2. Frontend calls a new Edge Function `text-to-video`:
   - **Step 1 — Script:** Lovable AI (`google/gemini-3-flash-preview`) turns the text into 4–8 short scenes. Each scene = `{ narration, keyword, bullets[] }`, simplified in plain Arabic.
   - **Step 2 — Voice:** for each scene, call `openai/gpt-4o-mini-tts` to generate an MP3 narration (base64-returned).
   - Returns `{ scenes: [{ narration, bullets, keyword, audioBase64, durationSec }] }`.
3. Frontend renders the video **in-browser** (no server rendering needed):
   - A whiteboard-styled canvas (`<canvas>` + SVG handwriting effect) sequentially "draws" each scene's keyword/bullets while the matching narration audio plays.
   - Uses `MediaRecorder` + `canvas.captureStream()` + a `WebAudio` mixed audio track to record the playback into a WebM/MP4 blob the user can download.
   - Also offers an in-page **Preview & Play** mode without downloading.
4. Quota: gated by existing `claimFeature(req, "video")` so it shares the daily free limit.

## Technical details
- Edge function: `supabase/functions/text-to-video/index.ts` with CORS, JWT/entitlement check, structured tool-call output for the script, and parallel TTS calls.
- Client lib: `src/lib/whiteboardRenderer.ts` — handles the draw-text-stroke animation, audio sync, and `MediaRecorder` capture.
- UI: textarea, language toggle, length slider, generate button, then a player with Download MP4/WebM button.
- No new DB tables. No new secrets (uses `LOVABLE_API_KEY`).
- Arabic font: reuse Cairo already loaded site-wide for canvas text.

## Out of scope
- True AI video models (Veo/Sora) — not selected.
- Persisting generated videos in the cloud (download only).
