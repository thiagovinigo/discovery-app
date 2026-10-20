# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Discovery ao Done" is a Product Management "second brain" (UI and prompts in pt-BR). It captures discovery interviews (mic/tab audio, typed notes, imported transcripts), surfaces live interview questions (Mom Test, JTBD, 5 Whys), and generates OKRs, epics, user stories with Gherkin, tasks and a PRD. It also lets the PO interview themselves with a copilot, keep stakeholders, notes and a meeting agenda. It is a client-only React 19 + Vite + TypeScript app with no backend. The repo is public (`github.com/thiagovinigo/discovery-app`, branch `main`), so never commit secrets. `BACKLOG.md` is the product backlog and records what is done.

## Commands

```bash
npm install
npm run dev       # Vite dev server (http://localhost:5173)
npm run build     # tsc -b && vite build (type-check is part of the build)
npm run lint      # oxlint (not ESLint); config in .oxlintrc.json. A few old warnings are expected.
npm test          # vitest run (jsdom + Testing Library + fake-indexeddb)
npx vitest run src/services/noteService.test.ts   # a single test file
```

`tsc -b` also type-checks test files, which Vitest does not, so run it after writing tests. Source files use CRLF line endings; keep them when editing with scripts.

## Architecture

**Single-component routing.** `src/App.tsx` owns the UI state (recording, notices, shortcuts, handlers) and picks a screen from `activeView` (the `AppView` union exported from `components/Sidebar.tsx`). There is no router. To add a screen: extend `AppView`, add a `Sidebar` item, add a render branch in `App.tsx`. Screens are presentational: they receive the project and callbacks, and `App.tsx` calls the services and then `refresh()`.

**Single source of state.** `state/useProjects.ts` holds `projects` and the derived `activeProject`. Services write through `storageService.updateProject(projectId, fn)` (immutable update) and the screen then calls `refresh()`. There is no seed or mock project: a fresh install has zero projects and `getActiveProject()` can return `null`, so `App.tsx` renders an empty-state shell.

**Data model.** `src/types/discovery.ts` defines `DiscoveryProject`: `sessions`, `okrs`, `epics` → `features` → `userStories`, `prd`, `leanCanvas`, `decisionLog`, `personas`, `bugReports`, and the optional `stakeholders`, `notes`, `scheduledMeetings` and `interview`. Optional arrays are normalized to `[]` on load. Sessions hold transcript, live questions, pain points, JTBDs, mind map, user flow, plus `type` (`MeetingType`), `participantIds`, `objective`, `agenda` and the `assistant` state.

**Persistence (`services/storageService.ts`).** `localStorage` holds projects and settings (`discovery_done_*_v1` keys), including the user's API key. `saveAllProjects` mirrors to IndexedDB through a serial queue; `restoreFromIndexedDb` recovers if localStorage is empty. Ids come from `services/ids.ts` (`newId(prefix)`).

**Domain services** (each has a `.test.ts`):
- `stakeholderService`: stakeholders and the interest × influence matrix, session participants and current speaker.
- `interviewService`: the 10-question PO interview (`INTERVIEW_STEPS`), `applyAnswer` (pure, writes PRD fields/stakeholders), follow-ups with a local rule or AI.
- `noteService`: notes with tags and search; promote a note to a decision or to a story under the "Anotações do projeto" epic.
- `meetingService`: scheduled meetings; `startMeeting` creates the live session with type, participants, objective and agenda.
- `meetingCopilotService`: `buildAgenda` (suggests agenda from gaps) and the closing note (`#fechamento`).
- `assistantService`: the live-room assistant by conversation type (interview, alignment, discovery, refinement).
- `knowledgeService`: `searchProjectKnowledge`, a local search that cites where each hit came from.
- `backlogMerge`, `sessionService`, `studioAgentService`, `exportService`.

**AI layer.** `aiClient.callAI` is the single entry point (OpenAI default, Gemini alternative, key and model from `storageService`). `geminiService.ts` is a facade over `services/ai/{prompts,normalizers,heuristics,types}`. `agentService.ts` has `PROJECT_AGENTS`, `buildProjectContext` and `chatWithProject`. Every AI feature must work without a key: it falls back to local rules and marks the result as generated without AI. A failure with a key configured must not overwrite the user's existing data. `chatWithProject` answers from `searchProjectKnowledge` when there is no key.

## Conventions

- Services are pure or take `projectId` and use `updateProject`; never mutate objects in place.
- Write the test first, then the code. Component tests use Testing Library and query by role/label text.
- `window.confirm` is avoided in new UI (it blocks browser automation); use an inline two-step confirmation.
- A repo hook ("GateGuard") blocks the first Write/Edit of each file until you state the callers, the data shape and the user's instruction; state them in text and retry the same call.

## Gotchas

- The API key lives only in the user's `localStorage`. Never hardcode one. A real key was once in the code (removed before the first commit); the user still has to revoke it.
- `tsconfig.json` is a references file. App code is checked via `tsconfig.app.json`, Vite config via `tsconfig.node.json`.
- `exportToPRD` still emits fixed fictional approvals (see E6.5 in `BACKLOG.md`).
- `dist/`, `node_modules/`, `coverage/` and `backup-projetos/` are gitignored.
