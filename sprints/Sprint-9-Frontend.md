# Sprint 9 — Frontend Polish & Production Build

**Branch:** `frontend-sprint`
**Date:** 2026-04-18
**Goal:** Ship a clean, minimal, production-ready React + Vite + TS frontend that consumes the existing Flask backend at `/api/v1/*` with **zero backend changes**.

---

## 1. Scope & Constraints

**In scope (frontend only):**
- Auth (login, register, logout, refresh, password reset).
- Teacher: dashboard, exam CRUD, paper/model upload, bulk sheet upload, processing status, review/override grading, publish results, challenge queue.
- Student: dashboard, result list, detailed result view, raise challenge, download report.
- Shared: profile, notifications, error/loading UX, offline banner, 404.

**Out of scope:**
- Any backend or API contract change.
- New external libraries beyond what's already in `package.json` (already 5 runtime deps that matter: `react`, `react-dom`, `react-router-dom`, `axios`, `@reduxjs/toolkit` + `react-redux`). No new deps unless essential.
- PWA service worker (defer — not needed for college submission).

**Hard rules:**
- All API calls go through `src/services/*.ts` — no `axios` calls inside components.
- All routes lazy-loaded via `React.lazy` + `Suspense`.
- Mobile-first responsive (Tailwind `sm:` `md:` `lg:` breakpoints).
- ARIA labels on every interactive element; semantic HTML (`<main>`, `<nav>`, `<button>`).
- `VITE_API_BASE_URL` env var — never hardcode URLs.
- No `any` types in new code.

---

## 2. File Tree (target after sprint)

```
smart-eval-frontend/
├── .env.example                  # VITE_API_BASE_URL
├── index.html
├── package.json                  # NO new deps
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts                # build: minify+treeshake, manualChunks
├── nginx.conf                    # already exists
├── Dockerfile                    # already exists
├── README.md                     # rewritten with setup/deploy
└── src/
    ├── main.tsx
    ├── App.tsx                   # router shell + Suspense
    ├── index.css                 # tailwind layers + design tokens
    ├── vite-env.d.ts
    │
    ├── app/
    │   ├── store.ts              # RTK store
    │   └── hooks.ts              # typed useAppDispatch / useAppSelector
    │
    ├── services/
    │   ├── api.ts                # axios instance (already good)
    │   ├── authService.ts
    │   ├── examService.ts
    │   ├── gradingService.ts
    │   ├── studentService.ts     # results + challenges
    │   ├── notificationService.ts
    │   └── userService.ts
    │
    ├── features/                 # RTK slices only
    │   ├── auth/authSlice.ts
    │   ├── exams/examsSlice.ts
    │   ├── grading/gradingSlice.ts     # convert from .js → .ts
    │   ├── results/resultsSlice.ts     # convert from .js → .ts
    │   └── notifications/notifSlice.ts
    │
    ├── hooks/
    │   ├── useAuth.ts            # convert .js → .ts
    │   ├── useExam.ts
    │   ├── useGrading.ts
    │   └── useToast.ts
    │
    ├── components/
    │   ├── ErrorBoundary.tsx
    │   ├── OfflineBanner.tsx
    │   ├── ProtectedRoute.tsx
    │   ├── ToastProvider.tsx
    │   ├── common/               # convert .jsx → .tsx
    │   │   ├── Button.tsx
    │   │   ├── Card.tsx
    │   │   ├── Input.tsx
    │   │   ├── Modal.tsx
    │   │   ├── Table.tsx
    │   │   ├── Spinner.tsx       # NEW
    │   │   ├── EmptyState.tsx    # NEW
    │   │   └── PageHeader.tsx    # NEW
    │   ├── layout/               # NEW
    │   │   ├── AppShell.tsx      # sidebar + topbar
    │   │   ├── Sidebar.tsx
    │   │   └── TopBar.tsx
    │   ├── teacher/              # already in .tsx ✓
    │   └── student/              # convert .jsx → .tsx
    │
    └── pages/
        ├── LoginPage.tsx
        ├── RegisterPage.tsx          # NEW
        ├── ForgotPasswordPage.tsx    # NEW
        ├── ProfilePage.tsx           # NEW (shared)
        ├── NotFoundPage.tsx
        ├── teacher/
        │   ├── DashboardPage.tsx
        │   ├── ExamDetailsPage.tsx
        │   ├── GradingReviewPage.tsx
        │   └── ChallengeQueuePage.tsx
        └── student/
            ├── StudentDashboardPage.tsx
            ├── ResultDetailPage.tsx
            └── ChallengePage.tsx     # NEW
```

---

## 3. Routes

| Path | Page | Guard |
|------|------|-------|
| `/login` | LoginPage | public |
| `/register` | RegisterPage | public |
| `/forgot-password` | ForgotPasswordPage | public |
| `/` | redirects by role | auth |
| `/teacher` | DashboardPage | teacher |
| `/teacher/exams/:examId` | ExamDetailsPage | teacher |
| `/teacher/exams/:examId/review` | GradingReviewPage | teacher |
| `/teacher/challenges` | ChallengeQueuePage | teacher |
| `/student` | StudentDashboardPage | student |
| `/student/results/:examId` | ResultDetailPage | student |
| `/student/challenges` | ChallengePage | student |
| `/profile` | ProfilePage | auth |
| `*` | NotFoundPage | — |

All non-login pages mount inside `<AppShell>` (sidebar + topbar with role-aware nav, notification bell, profile menu).

---

## 4. API Integration Map

Already-correct base: `apiClient.baseURL = VITE_API_BASE_URL`, all calls prefixed with `/api/v1/...`.

| Service file | Endpoints |
|---|---|
| `authService.ts` | POST `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh`, `/auth/password/reset`, PUT `/auth/password/reset` |
| `examService.ts` | GET/POST `/exams`, GET/PUT/DELETE `/exams/:id`, POST `/exams/:id/question-paper`, POST `/exams/:id/model-answer`, PUT `/exams/:id/config`, POST `/exams/:id/answer-sheets`, GET `/exams/:id/answer-sheets`, POST `/exams/:id/process`, GET `/exams/:id/process/status`, GET `/exams/:id/statistics`, POST `/exams/:id/publish` |
| `gradingService.ts` | GET `/grading/exams/:id/sheets`, GET `/grading/sheets/:id`, PUT `/grading/sheets/:id/questions/:n`, POST `/grading/sheets/:id/approve`, POST `/grading/exams/:id/approve-all`, POST `/grading/sheets/:id/flag` |
| `studentService.ts` | GET `/results`, GET `/results/:examId`, GET `/results/:examId/download` (blob), POST `/challenges`, GET `/challenges`, GET `/challenges/:id` |
| `notificationService.ts` | GET `/notifications`, PUT `/notifications/:id/read`, PUT `/notifications/read-all` |
| `userService.ts` | GET/PUT `/users/me`, PUT `/users/me/password` |

All services return `response.data.data` (unwrap envelope) and throw a typed `ApiError` on failure.

---

## 5. Design System

- **Tokens (Tailwind theme extend):** primary `indigo-600 → violet-600` gradient, neutral grays, success `emerald-500`, danger `rose-500`.
- **Typography:** Inter via system stack fallback (no external font CDN to keep load fast).
- **Surfaces:** `bg-white/80 backdrop-blur` cards with `shadow-sm ring-1 ring-gray-900/5`.
- **Buttons:** primary (gradient), secondary (outline), ghost; all with focus rings, disabled states, loading spinner.
- **Spacing:** 4-pt grid, page padding `px-4 sm:px-6 lg:px-8`.
- **States to ship for every async surface:** loading skeleton, empty, error (with retry).

---

## 6. Production Optimizations (vite.config.ts)

- `build.minify: 'esbuild'` (default — keep).
- `build.rollupOptions.output.manualChunks`: split `react`, `react-dom`, `react-router-dom` into a `vendor` chunk; `pdfjs-dist` + `@react-pdf-viewer/*` into a lazy `pdf` chunk.
- `build.sourcemap: false` for prod.
- `define: { __APP_VERSION__: JSON.stringify(pkg.version) }`.
- Route-level `React.lazy` for every page.

---

## 7. Execution Order (granular tasks)

1. **Cleanup pass** — delete stale `.jsx` after .tsx replacements; remove unused files.
2. **Services layer** — finish/typing for all 6 service files; add `notificationService.ts`, `userService.ts`.
3. **Slices** — convert `.js` slices to `.ts`; add `notifSlice.ts`.
4. **Common components** — port `.jsx` → `.tsx` with proper props typing; add `Spinner`, `EmptyState`, `PageHeader`.
5. **Layout** — `AppShell`, `Sidebar`, `TopBar` (with NotificationBell + ProfileMenu).
6. **Auth pages** — Login (exists, polish), Register, ForgotPassword.
7. **Teacher pages** — verify dashboard, exam details, review, challenge queue all wired to real endpoints; add publish flow + statistics widgets.
8. **Student pages** — dashboard list, detail page (per-question feedback), download PDF, challenge submission.
9. **Profile page** — edit profile, change password.
10. **App shell wiring** — `App.tsx` with `BrowserRouter`, `Suspense` fallback, lazy routes, protected route guard.
11. **Vite config** — chunk splitting + env injection.
12. **README.md** — rewrite: prereqs, `.env.example`, dev/build/preview, Docker, deploy notes.
13. **Smoke build** — `npm run build && npm run preview`; verify no TS errors, bundle size sanity check.

---

## 8. Acceptance Criteria

- [ ] `npm install && npm run build && npm run preview` succeeds out-of-box on a clean clone with `.env` set.
- [ ] No TS errors, no console errors on first paint.
- [ ] Login → role-based redirect works against running backend.
- [ ] Every page has loading + error + empty states.
- [ ] Lighthouse mobile: Performance ≥ 85, Accessibility ≥ 95.
- [ ] No new runtime dependencies added.
- [ ] All routes are code-split (visible in `dist/assets`).

---

## 9. Risks

- Existing mixed `.jsx` / `.tsx` may have implicit `any` couplings — conversion will surface type errors. Mitigation: convert + fix in same commit per file.
- Backend response envelope (`success`/`data`) vs Flask tuple quirks (already handled in `api.ts` refresh path) — services must unwrap consistently.
- Bundle size from `pdfjs-dist` — must be in lazy chunk, not vendor.
