# Smart-Eval AI — Frontend

Production-ready React + TypeScript SPA for Smart-Eval AI. Mobile-first, accessible, code-split, and wired to the existing Flask backend at `/api/v1/*`.

## Tech stack

- **React 18** + **TypeScript 5**
- **Vite 7** (build, dev server, HMR)
- **React Router 6** (lazy routes, code splitting)
- **Redux Toolkit** + **react-redux** (auth, exams, notifications)
- **Axios** (HTTP, with JWT refresh interceptor)
- **Tailwind CSS 3** (design tokens + utility-first styling)

No new runtime dependencies were added in this sprint.

## Prerequisites

- Node.js **>= 18**
- A running Smart-Eval AI backend (default: `http://localhost:5000`)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# edit VITE_API_BASE_URL if your backend runs on a different host/port
```

### Environment variables

| Name | Description | Default |
|------|-------------|---------|
| `VITE_API_BASE_URL` | Backend base URL (no trailing slash, no `/api/v1`) | `http://localhost:5000` |

## Scripts

```bash
npm run dev        # Start Vite dev server on http://localhost:3000
npm run build      # Type-check + production build to ./dist
npm run preview    # Serve the production build locally
npm run lint       # ESLint
```

## Project structure

```
src/
├── app/                    # Redux store + typed hooks
├── components/
│   ├── common/             # Button, Card, Input, Modal, Table, Spinner, EmptyState, PageHeader
│   ├── layout/             # AppShell, Sidebar, TopBar
│   ├── student/            # student-facing widgets
│   ├── teacher/            # teacher-facing widgets
│   ├── ErrorBoundary.tsx
│   ├── OfflineBanner.tsx
│   ├── ProtectedRoute.tsx
│   └── ToastProvider.tsx
├── features/               # RTK slices (auth, exams, notifications)
├── hooks/                  # custom React hooks
├── pages/                  # route-level components (lazy-loaded)
│   ├── teacher/
│   └── student/
├── services/               # axios-based API clients (one per backend domain)
├── App.tsx
├── main.tsx
└── index.css
```

## Routing

| Path | Role | Page |
|------|------|------|
| `/login` | public | Login |
| `/register` | public | Register |
| `/forgot-password` | public | Password reset request |
| `/teacher` | teacher | Dashboard |
| `/teacher/exams/:examId` | teacher | Exam details |
| `/teacher/exams/:examId/review` | teacher | Grading review |
| `/teacher/challenges` | teacher | Challenge queue |
| `/student` | student | Results dashboard |
| `/student/results/:examId` | student | Result detail |
| `/student/challenges` | student | My challenges |
| `/profile` | any | Profile + change password |

Legacy `/dashboard/*` paths redirect to `/teacher/*` automatically.

## Production build

```bash
npm install
npm run build
npm run preview
```

`dist/` contains a fully static bundle with:

- Route-level code splitting via `React.lazy`
- Manual vendor chunking (`react-vendor`, `redux`, `http`, `pdf`, `vendor`)
- ESBuild minification
- No source maps in production

## Docker

A `Dockerfile` and `nginx.conf` ship with the project. From the repo root:

```bash
docker build -t smarteval-frontend ./smart-eval-frontend
docker run --rm -p 8080:80 smarteval-frontend
```

For a full local stack, use the root `docker-compose.yml` which wires this frontend to the Flask backend.

## Backend integration

All HTTP calls go through `src/services/api.ts`, which:

- Reads `VITE_API_BASE_URL` from env at build time.
- Attaches the JWT access token from `localStorage` on every request.
- Catches 401s and transparently refreshes the access token using the refresh token.
- Redirects to `/login` if the refresh fails.

Service modules consume specific backend domains:

| Service | Endpoints |
|---------|-----------|
| `authService` | `/api/v1/auth/*` |
| `examService` | `/api/v1/exams/*` |
| `gradingService` | `/api/v1/grading/*` |
| `studentService` | `/api/v1/results/*`, `/api/v1/challenges/*` |
| `notificationService` | `/api/v1/notifications/*` |
| `userService` | `/api/v1/users/*` |

No backend changes are required to run this frontend — it consumes the existing API contract documented in `../Project_Docs/API_DOCS.md`.

## Accessibility

- Semantic HTML (`<header>`, `<main>`, `<nav>`, `<form>`).
- ARIA attributes on dialogs, alerts, status indicators.
- Visible focus rings (`:focus-visible`).
- Keyboard-dismissable modals (Escape).

## Browser support

Targets per `package.json` browserslist — modern evergreen browsers (>0.2% market share); excludes Opera Mini and dead browsers.

---

For full product context, see `../Project_Docs/`. For sprint history, see `../sprints/`.
