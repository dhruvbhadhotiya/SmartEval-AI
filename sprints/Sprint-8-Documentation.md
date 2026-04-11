# Sprint 8: Polish, Testing & Launch Prep

**Duration:** Week 15-16
**Status:** Complete
**Date Completed:** April 11, 2026

---

## Sprint Goals

Prepare the Smart-Eval MVP for production readiness by adding email notifications, a publish preview workflow, comprehensive error handling, performance optimizations, and security hardening.

### Objectives
- Email notification service for key events (SEAI-033)
- Results publication preview workflow with statistics (SEAI-032 completion)
- Challenge notification triggers for student and teacher (SEAI-031 completion)
- Frontend error handling: ErrorBoundary, 404 page, toast system, offline banner (SEAI-034)
- Performance optimization: lazy-loaded routes, vendor bundle splitting (SEAI-035)
- Security hardening: rate limiting, security headers, SmartEvalException handler (SEAI-036)

### User Stories (24 points total)

| ID | Story | Points | Status |
|---|---|---|---|
| SEAI-031 | Challenge Resolution (notification trigger) | 5 | Complete |
| SEAI-032 | Results Publication Workflow (preview + email) | 3 | Complete |
| SEAI-033 | Email Notifications | 5 | Complete |
| SEAI-034 | Error Handling & Edge Cases | 5 | Complete |
| SEAI-035 | Performance Optimization | 3 | Complete |
| SEAI-036 | Security Audit | 3 | Complete |

---

## Completed Tasks

### 1. Email Notification Service (Backend)
**File:** `smart-eval-backend/services/notification_service.py`

Full-featured email notification service with HTML email templates:

| Function | Trigger | Recipients |
|---|---|---|
| `notify_results_published()` | Teacher publishes exam | All students with assigned sheets |
| `notify_challenge_received()` | Student submits challenge | Exam's teacher |
| `notify_challenge_resolved()` | Teacher resolves challenge | Challenging student |

**Design decisions:**
- Graceful degradation: when `MAIL_ENABLED=false` (default), notifications are logged but not sent
- HTML templates are inline (no external template files) for simplicity
- All notification calls are wrapped in try/except in the routes — a failed email never blocks the primary action
- Uses Flask-Mail for SMTP integration

**Email template structure:**
- SmartEval branded header (blue bar)
- Content section with status-appropriate styling
- Score change tables for accepted challenges
- Footer with "automated message" disclaimer

### 2. Email Configuration (Backend)
**Files:** `smart-eval-backend/app/config.py`, `smart-eval-backend/app/extensions.py`

Added to `Config` class:

| Setting | Default | Purpose |
|---|---|---|
| `MAIL_ENABLED` | `false` | Master switch — no emails unless explicitly enabled |
| `MAIL_SERVER` | `smtp.gmail.com` | SMTP server |
| `MAIL_PORT` | `587` | SMTP port |
| `MAIL_USE_TLS` | `true` | TLS encryption |
| `MAIL_USERNAME` | `""` | SMTP username |
| `MAIL_PASSWORD` | `""` | SMTP password (app password for Gmail) |
| `MAIL_DEFAULT_SENDER` | `noreply@smarteval.app` | From address |

Flask-Mail is lazily initialised in `extensions.py` — only when `MAIL_ENABLED=true`.

### 3. Notification Wiring (Backend)
**Files:** `smart-eval-backend/api/v1/exams/routes.py`, `smart-eval-backend/api/v1/challenges/routes.py`

- **Publish endpoint** (`POST /api/v1/exams/:examId/publish`): After setting status to `published`, queries all answer sheets for assigned students, collects their emails, and calls `notify_results_published()`.
- **Challenge submit** (`POST /api/v1/challenges`): After creating the challenge, looks up the teacher who owns the exam and calls `notify_challenge_received()`.
- **Challenge resolve** (`PUT /api/v1/challenges/:challengeId/resolve`): After saving the resolution, looks up the student and calls `notify_challenge_resolved()` with the decision, comments, and any score changes.

### 4. Publish Preview Endpoint (Backend)
**File:** `smart-eval-backend/api/v1/exams/routes.py`

#### `GET /api/v1/exams/:examId/publish-preview`
- **Auth:** Teacher (exam owner)
- **Response:** Statistics summary before publishing:
  - `total_sheets`, `graded_count`, `ungraded_count`
  - `assigned_students`, `unassigned_sheets`
  - `average_score`, `highest_score`, `lowest_score`
  - `distribution`: 5-bucket score distribution (90-100, 75-89, 50-74, 33-49, below 33)
  - `ready_to_publish`: boolean — true only when graded_count > 0 AND assigned_students > 0

### 5. Publish Preview Modal (Frontend)
**File:** `smart-eval-frontend/src/pages/teacher/ExamDetailsPage.tsx`

- "Publish Results" button now opens a preview modal instead of directly publishing
- Modal shows: total sheets, graded count, assigned students, average score
- Score distribution breakdown (5 tiers with color coding)
- Warning banners for ungraded or unassigned sheets
- "Confirm Publish" button disabled unless `ready_to_publish` is true
- Dedicated "Unpublish" button with confirmation dialog

**New exam service methods:**
- `examService.getPublishPreview(examId)`
- `examService.publishResults(examId)`
- `examService.unpublishResults(examId)`

### 6. Error Boundary (Frontend)
**File:** `smart-eval-frontend/src/components/ErrorBoundary.tsx`

React class component that catches JavaScript errors anywhere in the child component tree:
- Shows user-friendly error page with icon and message
- Expandable "Error Details" section for debugging
- "Try Again" button (resets error state) and "Go Home" button
- Wraps the entire app in `App.tsx`

### 7. 404 Not Found Page (Frontend)
**File:** `smart-eval-frontend/src/pages/NotFoundPage.tsx`

- Large "404" display with descriptive message
- "Go Back" (browser history) and "Go Home" buttons
- Replaces the old catch-all `<Navigate to="/" />` redirect

### 8. Toast Notification System (Frontend)
**File:** `smart-eval-frontend/src/components/ToastProvider.tsx`

Context-based toast notification system:
- `ToastProvider` wraps the app, provides `showToast(message, type)` via context
- Types: `success` (green), `error` (red), `warning` (amber), `info` (blue)
- Auto-dismiss after 4 seconds with manual dismiss button
- Slide-in animation from right side
- `useToast()` hook for any component to trigger notifications

### 9. Offline Detection Banner (Frontend)
**File:** `smart-eval-frontend/src/components/OfflineBanner.tsx`

- Listens to browser `online`/`offline` events
- Shows a fixed red banner at the top when offline
- Automatically hides when connectivity is restored

### 10. Route-Based Code Splitting (Frontend)
**File:** `smart-eval-frontend/src/App.tsx`

- All page components loaded with `React.lazy()` + `Suspense`
- `PageLoader` component shown while chunks load
- Pages lazy-loaded: DashboardPage, ExamDetailsPage, GradingReviewPage, ChallengeQueuePage, StudentDashboardPage, ResultDetailPage, NotFoundPage
- LoginPage kept eager (first page users see)

### 11. Vite Build Optimization (Frontend)
**File:** `smart-eval-frontend/vite.config.ts`

- Manual chunks: `vendor` (react, react-dom, react-router-dom) and `redux` (@reduxjs/toolkit, react-redux) split into separate bundles
- Chunk size warning limit raised to 600KB

### 12. Rate Limiting (Backend)
**Files:** `smart-eval-backend/app/extensions.py`, `smart-eval-backend/api/v1/auth/routes.py`

- Flask-Limiter integrated with configurable storage backend (memory or Redis)
- Default global limit: 200 requests/hour
- Auth-specific limits:
  - `/auth/register`: 5 per minute
  - `/auth/login`: 10 per minute
  - `/auth/refresh`: 30 per minute
- 429 error handler returns structured JSON response

### 13. Security Headers (Backend)
**File:** `smart-eval-backend/app/__init__.py`

`@app.after_request` middleware adds to every response:

| Header | Value | Purpose |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME type sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-XSS-Protection` | `1; mode=block` | XSS filter (legacy browsers) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer leakage |
| `Cache-Control` | `no-store, no-cache, must-revalidate, max-age=0` | Prevent caching of API responses |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | HSTS (HTTPS only) |

### 14. SmartEvalException Handler (Backend)
**File:** `smart-eval-backend/app/__init__.py`

Global error handler for `SmartEvalException` and all its subclasses (ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ForbiddenError, ConflictError). Returns structured JSON with correct HTTP status code.

---

## File Tree Changes

### New Files Created
```
smart-eval-frontend/
  src/pages/NotFoundPage.tsx                   # 404 page
  src/components/ErrorBoundary.tsx              # Error boundary
  src/components/ToastProvider.tsx              # Toast notification system
  src/components/OfflineBanner.tsx              # Offline detection banner
```

### Files Modified
```
smart-eval-backend/
  requirements.txt                             # Added Flask-Mail, Flask-Limiter
  app/config.py                                # Added email + rate limiting config
  app/extensions.py                            # Added Flask-Limiter, Flask-Mail init
  app/__init__.py                              # Security headers, SmartEvalException handler, 429 handler
  api/v1/auth/routes.py                        # Rate limiting decorators
  api/v1/exams/routes.py                       # Publish preview endpoint, notification wiring
  api/v1/challenges/routes.py                  # Notification wiring (submit + resolve)
  services/notification_service.py             # Full email notification service (was stub)
  .env.example                                 # Email + rate limiting config

smart-eval-frontend/
  src/App.tsx                                  # ErrorBoundary, ToastProvider, OfflineBanner, lazy loading, 404 route
  src/index.css                                # Toast slide-in animation
  src/services/examService.ts                  # publishPreview, publishResults, unpublishResults methods
  src/pages/teacher/ExamDetailsPage.tsx         # Publish preview modal, unpublish confirmation
  vite.config.ts                               # Manual chunks, chunk size limit
```

---

## API Endpoints Summary (New/Modified)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/exams/:examId/publish-preview` | Teacher | Preview statistics before publishing |
| POST | `/api/v1/exams/:examId/publish` | Teacher | Publish results (now sends email notifications) |
| POST | `/api/v1/challenges` | Student | Submit challenge (now notifies teacher) |
| PUT | `/api/v1/challenges/:id/resolve` | Teacher | Resolve challenge (now notifies student) |

---

## Dependencies Added

### Backend (`requirements.txt`)
| Package | Version | Purpose |
|---|---|---|
| Flask-Mail | 0.10.0 | Email sending via SMTP |
| Flask-Limiter | 3.5.0 | Rate limiting with pluggable storage |

### Frontend
No new npm dependencies. All features built with existing React/Router/Tailwind stack.

---

## Configuration Added (`.env.example`)

| Variable | Default | Required | Purpose |
|---|---|---|---|
| `MAIL_ENABLED` | `false` | No | Enable/disable email notifications |
| `MAIL_SERVER` | `smtp.gmail.com` | When enabled | SMTP server hostname |
| `MAIL_PORT` | `587` | When enabled | SMTP port |
| `MAIL_USE_TLS` | `true` | When enabled | Use TLS |
| `MAIL_USE_SSL` | `false` | When enabled | Use SSL |
| `MAIL_USERNAME` | `""` | When enabled | SMTP auth username |
| `MAIL_PASSWORD` | `""` | When enabled | SMTP auth password |
| `MAIL_DEFAULT_SENDER` | `noreply@smarteval.app` | When enabled | From address |
| `RATELIMIT_STORAGE_URI` | `memory://` | No | Rate limit storage backend |
| `RATELIMIT_DEFAULT` | `200 per hour` | No | Default global rate limit |

---

## Security Audit Checklist (SEAI-036)

| Check | Status | Notes |
|---|---|---|
| Dependency vulnerability scan | Done | No critical vulnerabilities in current deps |
| Security headers | Done | X-Content-Type-Options, X-Frame-Options, XSS-Protection, HSTS |
| Rate limiting | Done | Auth endpoints: 5-10/min, Global: 200/hr |
| Input validation | Done | Marshmallow schemas on all inputs, MongoEngine field types |
| JWT security | Done | Short-lived access tokens (15 min), refresh token rotation |
| CORS | Done | Configured per-environment via CORS_ORIGINS |
| Password security | Done | bcrypt hashing, strength validation |
| SQL/NoSQL injection | Done | MongoEngine ORM prevents injection |
| File upload validation | Done | Extension whitelist, size limits |
| Error handling | Done | No stack traces in production, structured error responses |

---

## Dependencies on Previous Sprints

- **Sprint 4 (OCR):** AnswerSheet model for student assignment queries in publish notifications
- **Sprint 5 (Grading):** Evaluation model for publish preview statistics
- **Sprint 6 (Review):** Override tracking for challenge resolution notifications
- **Sprint 7 (Student Portal):** Challenge model and routes for notification wiring, publish/unpublish endpoints