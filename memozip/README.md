# MemoZip — frontend

Calm, minimal study app: upload a course, then generate quizzes and summaries, ask questions about the content, and track what you've mastered.

**Stack:** React 18 · TypeScript · Vite 5 · Tailwind CSS 3.4 · react-router-dom 6 · lucide-react

> This code was written without network access, so it has **not been compiled or type-checked yet**. Run `npm run build` first; expect at most a few small type fixes.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
```

The demo user is signed in automatically (log out from the account menu to see the auth pages; any email/password works).

## Structure

```
src/
  components/     Reusable pieces (Navbar, ThemeSwitcher, …) (ui/ holds the primitives: Button, Card, Modal, Dropdown…)
  layouts/        AppLayout (centered navbar on large screens, bottom tab bar below 1024px), AuthLayout, ProtectedRoute
  pages/          One file per screen (Home, Upload, QuizConfig, QuizTake, QuizResults, …)
  hooks/          useQuery, useTheme, useAuth, usePageTitle
  services/api/   The only layer the UI uses to reach data (auth, documents, quizzes, …)
  data/           Mock data + in-memory store (db.ts)
  utils/          Scoring, formatting, validation, helpers
  theme/          Theme list and storage key
  styles/         index.css: theme tokens as CSS variables
```

## Theming

Three complete palettes, switchable from the navbar (or Settings → Appearance), applied instantly with a short color fade and remembered under `memozip-theme`:

| | Tokyo Night / Amethyst (default) | Neon Amber (Monokai / Terminal Code) | Frost (Nord / Deep Arctic) |
|---|---|---|---|
| Background | `#0F0C20` | `#18181B` | `#1E293B` |
| Primary | `#A855F7` | `#EAB308` | `#38BDF8` |
| Warning / decay | `#FB923C` | `#EF4444` | `#FBBF24` |
| Mastery | `#34D399` | `#22C55E` | `#14B8A6` |
| Text | `#F3E8FF` | `#FAFAFA` | `#F8FAFC` |

Everything lives in `src/styles/index.css`. Each theme is a block of semantic variables (`--background`, `--surface`, `--border`, `--text`, `--muted`, `--primary`, `--warning`, `--mastery`, …) selected by `data-theme` on `<html>`. `tailwind.config.js` maps class names (`bg-bg`, `bg-accent`, `text-warn-text`, …) to those variables, so components never contain colors and every part of the UI follows the active theme automatically. Beyond color, each theme also sets its own corner radius (`--radius-scale`), heading font (Figtree vs JetBrains Mono) and page backdrop (amethyst glow, editor dot grid, or a faint northern-light wash).

The theme ids stored in `localStorage` and in `users.theme` stay `tokyo-night`, `monokai` and `nord`; only the display names changed (`src/theme/themes.ts`).

**Adding a theme:** add a `[data-theme='name']` block with the same variables, add the name to `ThemeName` (`src/types`) and an entry in `src/theme/themes.ts`.

Small text uses lighter tints where needed (`--warning-text` red in Monokai, `--mastery-text` teal in Nord) so it stays AA-readable. Meaning is never carried by color alone (labels and percentages always appear).

## Brand

The mark is an "M" whose center closes like a zipper, with the pull hanging from it (memory, compressed). In the app it is `LogoMark` / `Logo` (`src/components/Logo.tsx`) drawn with theme tokens, so it recolors with the active theme, and the browser-tab favicon is rebuilt on every theme change (`src/theme/favicon.ts`). Static files for each theme (mark, horizontal lockup, single-color mark) are in `public/brand/`. The lockup text uses Figtree; install it or outline the text before using the lockups in print.

## AI Chat

`/chat` (nav item "AI Chat") is a general study assistant. Pick **All my courses** or one course, ask a question, and each answer shows where it came from (course, pages, section) with a link back to the course. Conversations are saved and reopen from the History menu (`/chat/:id`); chats can be deleted. The per-course page `/documents/:id/ask` still exists and is reached from a course.

Backend contract (`src/services/api/chat.ts`): `send(scope, question)` returns `{ answer, source? }` (`scope` is `'all'` or a document id), plus `suggestions(scope)` and `conversations.list/get/save/remove`. Types: `Conversation`, `ChatMessage`, `SourceRef` in `src/types`.

## Connecting the FastAPI backend

1. Set `VITE_USE_MOCK=false` and `VITE_API_URL=http://localhost:8000` (see `.env.example`).
2. Re-implement each module in `src/services/api/` with real requests, keeping the same function names and return types (`src/types/index.ts` is the contract). `http.ts` is the place for a shared fetch wrapper, auth header and error mapping.
3. Delete `src/data/db.ts`, `src/data/mockData.ts` and `src/services/api/mockGenerators.ts`.
4. `useQuery` currently refetches when the mock store changes. With a real backend, call `refetch()` after mutations or switch to TanStack Query.

## Mock behavior to know about

- Quiz generation draws from per-document question banks, so it can return fewer questions than requested.
- Uploaded files get placeholder topics and questions; nothing is actually read.
- "Ask" and AI Chat answers use keyword matching and say so honestly when nothing matches.
- Data lives in memory and resets on reload (only the theme and logged-out state persist).

## Accessibility

Semantic landmarks and a skip link, visible focus rings, native radios/checkboxes behind custom controls, labelled inputs with linked errors, focus-trapped modals that restore focus, `aria-live` for status updates, reduced-motion support, 44px touch targets and 16px inputs on mobile.
