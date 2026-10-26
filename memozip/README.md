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

Start the FastAPI backend first (http://127.0.0.1:8000). The dev server forwards `/api` to it (`vite.config.ts`), so there is nothing else to configure. Create an account on the register page, or sign in.

## Structure

```
src/
  components/     Reusable pieces (Navbar, ThemeSwitcher, …) (ui/ holds the primitives: Button, Card, Modal, Dropdown…)
  layouts/        AppLayout (centered navbar on large screens, bottom tab bar below 1024px), AuthLayout, ProtectedRoute
  pages/          One file per screen (Home, Upload, QuizConfig, QuizTake, QuizResults, …)
  hooks/          useQuery, useTheme, useAuth, usePageTitle
  services/api/   The only layer the UI uses to reach the backend (auth, documents, quizzes, …)
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

## Backend integration

All network code is in `src/services/api/`. Pages only import `api` from there.

- `http.ts`: fetch wrapper. Camelizes responses, snake_cases JSON bodies, sends cookies (and a Bearer header if the login response contains `access_token`), retries once after `POST /auth/refresh` on a 401, and sends the user back to the login page if the session cannot be renewed.
- `mappers.ts`: turns backend payloads into the UI types in `src/types`. **If a field is named differently in your responses, fix it here only.**
- `invalidate.ts`: after every successful mutation, services call `notify()` and mounted `useQuery` hooks refetch.

| UI call | Endpoint |
|---|---|
| auth.getCurrentUser / login / register / logout | GET /auth/me, POST /auth/login, POST /auth/register, POST /auth/logout (+ POST /auth/refresh) |
| documents.list / get / rename / remove | GET /documents, GET /documents/{id}, PATCH /documents/{id}, DELETE /documents/{id} |
| documents.upload / retry | POST /documents/upload (then polls GET /documents/{id} while `status` is processing, then POST /documents/{id}/topics if topics are empty), POST /documents/{id}/retry |
| quizzes.generate / list / get | POST /documents/{id}/quizzes, GET /documents/quizzes/saved, GET /documents/quizzes/{id} |
| quizzes.startAttempt / submit / attempts / attempt | POST .../attempts/start, POST .../attempts, GET .../{id}/attempts, GET /documents/quizzes/attempts/{id} |
| quizzes.save / rename / remove | PATCH .../{id}/save, PATCH .../{id}, DELETE .../{id} |
| summaries.generate / get / regenerate | POST /documents/{id}/summary, GET /library/summaries/{id}, POST /documents/summaries/{id}/regenerate |
| summaries.save / rename / remove | PATCH .../save, PATCH .../{id}, DELETE .../{id} (under /documents/summaries) |
| folders.* | GET/POST /folders, GET/PATCH/DELETE /folders/{id} |
| resources.list | GET /library (folder page: GET /library/folders/{id}) |
| resources.move | PATCH /documents/{id} {folder_id}, PATCH /library/quizzes/{id}/folder, PATCH /library/summaries/{id}/folder |
| chat.conversations.* / sendMessage / suggestions | GET/POST /conversations, GET/PATCH/DELETE /conversations/{id}, POST /conversations/{id}/messages, GET /chat/suggestions |
| stats.get | GET /stats |

Things the frontend assumes (check them against `/docs` when something looks empty or returns 422):

- `GET /documents/{id}` returns `topics` (list of `{id, name}`), `size_bytes` and `page_count`.
- Login/register accept JSON `{email, password}` and `{name, email, password}`. If login uses OAuth2 form data (`username`), change `login()` in `auth.ts`.
- A quiz question has `id, type, prompt, options, topic_id`. Correct answers and explanations may be hidden until submission: the graded attempt should then carry `correct_answer` and `explanation` on each answer, plus `topic_scores` (`topic_id`, `topic_name`, `score`) and `analysis_text`.
- `POST .../attempts` takes `{attempt_id, answers: [{question_id, answer}]}`; unanswered questions are sent with an empty answer.
- `POST /conversations/{id}/messages` takes `{content}` and returns the assistant message, with `sources` (`document_id`, `page_start`, `page_end`, `section`).
- `GET /library` accepts `type`, `folder_id` and `q` (`resources.ts` sends a few spellings of each).
- There is no `PATCH /auth/me` yet: quiz defaults are stored in the browser, and editing name or email shows "isn't available yet". Add the endpoint and it starts working with no frontend change.

## Accessibility

Semantic landmarks and a skip link, visible focus rings, native radios/checkboxes behind custom controls, labelled inputs with linked errors, focus-trapped modals that restore focus, `aria-live` for status updates, reduced-motion support, 44px touch targets and 16px inputs on mobile.
