# Hanguk — Korean for the working professor (design spec)

Date: 2026-09-26. Status: approved in chat.

## Goal

A personal mobile web app (PWA) that trains Korean listening, speaking,
reading and writing for a researcher/professor whose daily Korean is
teaching, presenting and discussing work. Level starts at TOPIK 3-4.
Content is generated on demand by Claude and is grounded in the user's
field (CFD, multiphase flow, chemical engineering, university life).

## Non-goals (v1)

- No accounts, no multi-device sync, no server.
- No audio upload for pronunciation scoring. Speech goes through the
  browser's speech recognition (text), then to Claude.
- No app-store build.

## Platform

- Target device: Samsung Galaxy S24, Chrome. Installed via
  "Add to Home screen".
- Stack: Vite + Preact + TypeScript. Plain CSS with design tokens.
  Tests: Vitest for logic. Manual QA on phone.
- Hosting: GitHub Pages from a public repo. No secrets in the repo.
- AI: Claude API called directly from the browser
  (`anthropic-dangerous-direct-browser-access` header). Default model
  `claude-sonnet-5`. API key entered once in Settings, stored in
  `localStorage`, never leaves the device except to api.anthropic.com.
- Speech out: `speechSynthesis` with a `ko-KR` voice (Samsung TTS).
  Speech in: `webkitSpeechRecognition`, `lang = "ko-KR"`.
- Storage: IndexedDB (via `idb`) for lessons done, vocab cards, SRS
  state. Export/import as one JSON file.

## Modules

Every lesson starts by picking a **context**:
`teaching` (giảng dạy), `presenting` (thuyết trình), `discussing`
(thảo luận công việc). The context and the user's field are injected
into every Claude prompt.

1. **Listen (Nghe).** Claude returns a short Korean script (80-150
   words) plus 3 multiple-choice comprehension questions and a
   Vietnamese gloss. TTS plays it; speed 0.7x/1.0x. User answers, sees
   score, then the transcript with tappable words.
2. **Speak (Nói).**
   - *Shadow:* Claude returns 6 sentences for the context. User taps
     mic, repeats one. App compares recognized text with target
     (char-level similarity) and shows the diff.
   - *Roleplay:* Claude plays a student or colleague. User speaks, app
     sends recognized text, Claude replies (spoken by TTS) and after
     6 turns gives feedback: honorific level, naturalness, 3 better
     phrasings.
3. **Read (Đọc).** Claude returns a 150-250 word text (abstract,
   department notice, work email) with 3 questions. Tapping a word
   shows meaning (from a glossary Claude returns with the text) and
   a "save" button.
4. **Write (Viết).** Claude returns a prompt (email to a professor,
   slide speaker notes, meeting minutes). User types. Claude returns
   corrected text, a list of edits (original → fixed → one-line
   reason), and a 1-5 score.
5. **Vocab (Từ vựng).** SM-2 spaced repetition. Cards come from
   "save" buttons in the other modules. Fields: Korean, Vietnamese,
   example sentence, source context. Daily review queue on the home
   screen.

Level: stored as a number 3-6. Each lesson result updates a rolling
score per skill; when the 10-lesson average is above 85 %, the level
for that skill goes up by one and prompts ask for harder content.

## Architecture

```
src/
  app.tsx            routes (hash router), layout, nav
  api/claude.ts      one function: chat(messages, schema) -> parsed JSON
  api/prompts/       one file per module; pure functions returning
                     system + user prompt; all ask for strict JSON
  speech/tts.ts      speak(text, rate), stop(), voice picking
  speech/stt.ts      listenOnce(): Promise<string>
  store/db.ts        idb schema: lessons, cards, settings
  store/srs.ts       pure SM-2 functions
  store/level.ts     pure level-update functions
  lib/diff.ts        char-level diff for shadowing and writing
  modules/listen/    ui + flow
  modules/speak/
  modules/read/
  modules/write/
  modules/vocab/
  pages/home.tsx     today's queue, level per skill, start buttons
  pages/settings.tsx api key, model, voice, export/import
```

Rules: prompt builders, SRS, level and diff are pure and unit tested.
UI components call one flow function per module. No module imports
another module's UI.

## Data flow

Home → pick module + context → prompt builder → `chat()` → Claude JSON
→ validated with a zod schema → rendered → user acts → result saved to
`lessons` → level updated → cards saved to `cards`.

## Error handling

- Missing API key → banner linking to Settings.
- Network / 4xx / 5xx → toast with the message, retry button, the
  lesson state is kept.
- Claude JSON that fails schema validation → one automatic retry with
  a "return only JSON" reminder, then an error toast.
- No `ko-KR` voice → warn on Settings, still show text.
- Speech recognition denied or unsupported → module falls back to a
  text box.

## Testing

- Vitest: `srs.ts`, `level.ts`, `diff.ts`, every prompt builder
  (snapshot of prompt text + schema parse of a fixture reply).
- Manual phone QA checklist in `docs/qa.md`: install, mic, TTS,
  each module end to end, export/import, offline shell loads.
