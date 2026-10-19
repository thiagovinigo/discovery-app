# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Discovery ao Done" is a Product Management "second brain" (UI and prompts in pt-BR). It captures discovery interviews (mic/tab audio, typed notes, imported transcripts), surfaces live interview questions (Mom Test, JTBD, 5 Whys), and generates OKRs, epics, user stories with Gherkin, tasks and a PRD. It is a client-only React 19 + Vite + TypeScript app. There is no backend, no test suite and no git repository.

## Commands

```bash
npm install
npm run dev       # Vite dev server
npm run build     # tsc -b && vite build (type-check is part of the build)
npm run lint      # oxlint (not ESLint); config in .oxlintrc.json
npm run preview   # serve the production build
```

There is no test runner configured, so there is no single-test command. Verify changes with `npm run build` and `npm run lint`.

## Architecture

**Single-component routing.** `src/App.tsx` is a large component that owns nearly all state: the project list, the active project, recording state, notices and keyboard shortcuts. There is no router. `activeView` (the `AppView` union exported from `components/Sidebar.tsx`) selects which `*View` component renders. To add a screen, extend `AppView`, add a `Sidebar` entry and add a render branch in `App.tsx`.

**Data model.** `src/types/discovery.ts` defines `DiscoveryProject`, which holds `sessions` (`MeetingSession`), `okrs`, `epics` → `features` → `userStories`, `prd`, `leanCanvas`, `decisionLog`, `personas` and `bugReports`. Sessions hold the transcript, live questions, pain points, JTBDs, mind-map nodes and edges, and user-flow steps.

**Persistence (`services/storageService.ts`).** Everything lives in the browser:
- `localStorage` holds projects and settings under `discovery_done_*_v1` keys.
- `saveAllProjects` also mirrors projects to IndexedDB. This is the fallback when the localStorage quota is hit.
- Many helpers (`addBugReport`, `updateStoryChecklists`, `createNewSession`) read the active project from storage, mutate it and save it. They ignore their `projectId` argument.
- `getAllProjects` backfills missing fields and mock data for `proj-1`. `INITIAL_MOCK_PROJECT` (in `mockDataService.ts`) seeds first launch.

**AI layer.** There are two providers and one dispatcher:
- `aiClient.callAI` is the entry point. It picks the provider (OpenAI is the default, Gemini the alternative), key and model from `storageService`, then calls `openAiClient.callOpenAI` or `geminiClient.callGemini`. Both support retries and a JSON-mode flag. `parseJsonLoose` parses model JSON output leniently.
- `geminiService.ts` holds the domain prompts and parsers: live analysis, question generation and backlog generation. `agentService.ts` defines `PROJECT_AGENTS` (scoped prompt agents), `buildProjectContext`, `runAgent` and `chatWithProject`.
- With no usable key or on AI failure, the app falls back to offline keyword heuristics and sample backlog data. Per the README, a failure with a key configured must not overwrite the user's existing backlog.
- Audio transcription goes through `audioService.ts` (Web Speech API, Chrome/Edge works best) and `transcribeAudioWithWhisper` in `openAiClient.ts`.

**Other services.** `exportService.ts` handles Markdown and Jira CSV export. `githubCrawlerService.ts` is a separate service used for repo crawling.

## Gotchas

- **A real OpenAI API key is hardcoded** as `DEFAULT_OPENAI_KEY` in `src/services/storageService.ts`. It is the fallback when the user has not set a key. Do not copy it anywhere. It should be removed and rotated, and the README says the app expects the user's own key.
- The README mentions only Gemini, but the code defaults to OpenAI (`gpt-4o-mini`; Gemini default `gemini-2.5-flash`).
- `tsconfig.json` is a references file. App code is checked via `tsconfig.app.json` and Vite config via `tsconfig.node.json`. `tsc -b` runs both.
- `dist/` and `node_modules/` are present in the working tree.
