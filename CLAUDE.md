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

**Hash routing, one big component.** `src/App.tsx` (~1,300 lines, still the biggest debt, see E4.3 in `BACKLOG.md`) owns the UI state (recording, notices, shortcuts, handlers) and picks a screen from `activeView` (the `AppView` union exported from `components/Sidebar.tsx`). `state/useHashView.ts` keeps `activeView` in `location.hash` (`#/backlog`); there is no router library. To add a screen: extend `AppView`, register it in the exhaustive `VIEW_REGISTRY`, add a `Sidebar` item (the sidebar is the only menu) and a render branch in `App.tsx`. Screens are presentational: they receive the project and callbacks, and `App.tsx` calls the services and then `refresh()`. Handlers for the PO screens and the backlog live in `state/projectActions.ts` and `state/backlogActions.ts` (pure factories with explicit deps, not hooks, because `App` returns early when there is no project).

**Live room (`live_room`).** A sticky control bar (record, focus mode, "Encerrar reunião"), a collapsible room preparation block, the transcript on the left (`LiveTranscriptionView`, with per-segment "Quem falou") and four tabs on the right: Tópicos & Perguntas (`TopicsPanel` + `LiveQuestionPrompter`), Mapa mental (`MindMapCanvas`), Jornada (`UserFlowView`) and Ata (`MinutesPanel`). Edits to a session go through `sessionService.editMindMap(projectId, sessionId, fn)` (a generic immutable session edit despite the name) and then `refresh()`.

**Single source of state.** `state/useProjects.ts` holds `projects` and the derived `activeProject`. Services write through `storageService.updateProject(projectId, fn)` (immutable update) and the screen then calls `refresh()`. There is no seed or mock project: a fresh install has zero projects and `getActiveProject()` can return `null`, so `App.tsx` renders an empty-state shell.

**Data model.** `src/types/discovery.ts` defines `DiscoveryProject`: `sessions`, `okrs`, `epics` → `features` → `userStories`, `prd`, `leanCanvas`, `decisionLog`, `personas`, `bugReports`, and the optional `stakeholders`, `notes`, `scheduledMeetings` and `interview`. Optional arrays are normalized to `[]` on load. Sessions hold transcript, live questions, pain points, JTBDs, mind map, user flow, plus `type` (`MeetingType`), `participantIds`, `objective`, `agenda`, the `assistant` state and `minutes` (`MeetingMinutes`). Mind map nodes form a tree (`parentId`, type `topic`; derived nodes have ids prefixed `mm-`, user-written ones have `manual: true`; derived nodes the user deleted are listed in `mindMapHiddenIds`). Journey steps follow the same idea (`manual`, derived ids prefixed `jf-`, `userFlowHiddenIds`). Backlog items (epic/feature/story/task) carry optional `BacklogMeta` (origin, validation, verification, `sliceOf`, change history).

**Persistence (`services/storageService.ts`).** `localStorage` holds projects and settings (`discovery_done_*_v1` keys), including the user's API key. `saveAllProjects` mirrors to IndexedDB through a serial queue; `restoreFromIndexedDb` recovers if localStorage is empty. Ids come from `services/ids.ts` (`newId(prefix)`).

**Domain services** (each has a `.test.ts`):
- `stakeholderService`: stakeholders and the interest × influence matrix, session participants and current speaker.
- `interviewService`: the 10-question PO interview (`INTERVIEW_STEPS`), `applyAnswer` (pure, writes PRD fields/stakeholders), follow-ups with a local rule or AI.
- `noteService`: notes with tags and search; promote a note to a decision or to a story under the "Anotações do projeto" epic.
- `meetingService`: scheduled meetings; `startMeeting` creates the live session with type, participants, objective and agenda.
- `meetingCopilotService`: `buildAgenda` (suggests agenda from gaps) and the closing note (`#fechamento`).
- `assistantService`: the live-room assistant by conversation type (interview, alignment, discovery, refinement).
- `knowledgeService`: `searchProjectKnowledge`, a local search that cites where each hit came from.
- Live room, all rule-based so they work without a key: `topicService` (topics from the interviewee's words and the questions still missing per topic), `mindMapService` (`buildMindMap`, `syncMindMap`, layout, rename/add/delete that survive re-analysis), `journeyService` (steps from "primeiro/depois/por fim", friction, edit/move/remove), `minutesService` (minutes with decisions, actions with owner/deadline, open questions, Markdown), `speakerService` (suggests who spoke from text clues; browsers cannot separate voices by sound). `interviewQuestionService` judges questions (`reviewQuestion`: hypothetical, leading, opinion, closed, compound), builds follow-ups anchored in the interviewee's own words (`followUpsFor`, `suggestFollowUps`) and filters AI questions (`filterQuestions`); every fixed question in the app must pass `reviewQuestion` (there is a test), and AI prompts carry `INTERVIEW_QUESTION_RULES`. Write interview questions about recent facts (last time, how many, who), never "would you use/pay". `sessionService.mergeAnalysis` runs follow-ups + topic questions + `syncMindMap` + `syncJourney` after every analysis, and `closeMeeting` also builds the minutes.
- Backlog engine (E8): `backlogItemService`, `verificationService`, `backlogProposals` (item-by-item proposals, apply only accepted), `evidenceService`, `slicingService`, `backlogHistoryService` (undo, last 5), `exportTrace`, `insightService`.
- `backlogMerge`, `sessionService`, `studioAgentService`, `exportService`. `state/useDictation.ts` is the voice-dictation hook used by Notes.

**AI layer.** `aiClient.callAI` is the single entry point (OpenAI default, Gemini alternative, key and model from `storageService`). `geminiService.ts` is a facade over `services/ai/{prompts,normalizers,heuristics,types}`. `agentService.ts` has `PROJECT_AGENTS`, `buildProjectContext` and `chatWithProject`. Every AI feature must work without a key: it falls back to local rules and marks the result as generated without AI. A failure with a key configured must not overwrite the user's existing data. `chatWithProject` answers from `searchProjectKnowledge` when there is no key.

## Conventions

- Services are pure or take `projectId` and use `updateProject`; never mutate objects in place.
- Write the test first, then the code. Component tests use Testing Library and query by role/label text.
- `window.confirm` is avoided in new UI (it blocks browser automation); use an inline two-step confirmation.
- A repo hook ("GateGuard") blocks the first Write/Edit of each file until you state the callers, the data shape and the user's instruction; state them in text and retry the same call.

## Gotchas

- The API key lives only in the user's `localStorage`. Never hardcode one. A real key was once in the code (removed before the first commit); the user still has to revoke it.
- `tsconfig.json` is a references file. App code is checked via `tsconfig.app.json`, Vite config via `tsconfig.node.json`.
- Exports and generated views must derive only from project data (no fixed example content, see E6.5). Fields with no data show "Não informado".
- The live-room panels (map, journey, topics) are deliberately domain-agnostic: do not add keyword lists biased to one business domain.
- `dist/`, `node_modules/`, `coverage/` and `backup-projetos/` are gitignored.
