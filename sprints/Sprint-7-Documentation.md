# Sprint 7: Student Portal & Challenge System

**Duration:** Week 13-14
**Status:** Complete
**Date Completed:** April 4, 2026

---

## Sprint Goals

Implement the complete student-facing portal that allows students to log in, view their published exam results with detailed question-wise feedback, and submit grade challenges. Add a teacher-facing challenge queue for reviewing and resolving student challenges. Enable exam result publishing from the teacher workflow.

### Objectives
- Student registration and login with roll number support (SEAI-026)
- Results dashboard listing all published exam results (SEAI-027)
- Detailed result view with question-wise breakdown, feedback, keywords/concepts (SEAI-028)
- Challenge submission per question with justification and status tracking (SEAI-029)
- Teacher challenge queue with filtering, sorting, and resolve workflow (SEAI-030)
- Exam publish/unpublish endpoints for result visibility control

### User Stories (24 points total)

| ID | Story | Points | Status |
|---|---|---|---|
| SEAI-026 | Student Registration & Login | 3 | Complete |
| SEAI-027 | Results Dashboard | 5 | Complete |
| SEAI-028 | Detailed Result View | 8 | Complete |
| SEAI-029 | Challenge Submission | 5 | Complete |
| SEAI-030 | Challenge Queue (Teacher) | 3 | Complete |

---

## Completed Tasks

### 1. Challenge Model (Backend)
**File:** `smart-eval-backend/models/challenge.py`

New MongoEngine Document with embedded documents for structured challenge data:

| Class | Fields | Purpose |
|---|---|---|
| `ChallengedQuestion` | question_number, original_score, max_marks, student_justification (max 500 chars) | Single challenged question within a request |
| `ScoreChange` | question_number, old_score, new_score | Audit trail for accepted score changes |
| `ChallengeResolution` | resolved_by (User ref), resolved_at, decision, comments, score_changes[] | Teacher resolution details |
| `Challenge` | evaluation_id, student_id, exam_id, challenged_questions[], status, resolution, timestamps | Main document |

**Status lifecycle:** `pending` → `under_review` → `accepted` | `rejected`

**Indexes:** evaluation_id, student_id, exam_id, status, -created_at, compound (exam_id, status)

### 2. Student Results API (Backend)
**File:** `smart-eval-backend/api/v1/students/routes.py`

Blueprint registered at `/results` prefix under `/api/v1`.

#### `GET /api/v1/results`
- **Auth:** Student (JWT + role_required)
- **Logic:** Finds student's answer sheets → filters to published exams → joins evaluation scores
- **Response:** Array of `{ exam_id, exam_title, subject, exam_date, max_marks, published_at, total_score, total_max, percentage, overall_feedback, status, has_challenge }`
- **Sorting:** Published date descending

#### `GET /api/v1/results/:examId`
- **Auth:** Student
- **Logic:** Verifies exam is published → finds student's sheet/evaluation → builds question-wise breakdown
- **Response:** `{ exam, student, summary, questions[], answer_sheet, published_at }`
- **Question data includes:** marks_awarded, max_marks, feedback, confidence, keywords_found/missing, concepts_covered/missing, can_challenge, challenge_status, override info

**Helper functions:**
- `_has_pending_challenge()` — checks for pending/under_review challenges on an evaluation
- `_get_question_challenge_status()` — returns challenge status for a specific question number

### 3. Challenge API (Backend)
**File:** `smart-eval-backend/api/v1/challenges/routes.py`

Blueprint registered at `/challenges` prefix under `/api/v1`.

#### `POST /api/v1/challenges`
- **Auth:** Student
- **Validation:** Exam must be published, justification required (max 500 chars), no duplicate pending challenges per question
- **Logic:** Finds evaluation via answer sheet → creates Challenge with ChallengedQuestion entries (captures original_score at submission time)
- **Response:** 201 with challenge data

#### `GET /api/v1/challenges`
- **Auth:** Student or Teacher (role-aware filtering)
- **Params:** `?exam_id=...&status=...`
- **Student view:** Own challenges only
- **Teacher view:** Challenges for exams they own
- **Enrichment:** Adds exam_title, exam_subject, student_name, student_roll

#### `GET /api/v1/challenges/:challengeId`
- **Auth:** Student (own) or Teacher (exam owner)
- **Enrichment:** Adds current_feedback and current_score from evaluation for each challenged question

#### `PUT /api/v1/challenges/:challengeId/resolve`
- **Auth:** Teacher (must own the exam)
- **Body:** `{ decision: "accepted"|"rejected", comments, score_changes[] }`
- **On accept:** Updates evaluation question scores, sets override fields, recalculates totals/percentage, sets evaluation status to `overridden`
- **Creates:** ChallengeResolution with full audit trail (resolved_by, score_changes)

### 4. Exam Publish/Unpublish Endpoints (Backend)
**File:** `smart-eval-backend/api/v1/exams/routes.py`

#### `POST /api/v1/exams/:examId/publish`
- **Auth:** Teacher (exam owner)
- **Validation:** Exam must be in `reviewing` status
- **Action:** Sets status to `published`, records `published_at` timestamp

#### `POST /api/v1/exams/:examId/unpublish`
- **Auth:** Teacher (exam owner)
- **Validation:** Exam must be `published`
- **Action:** Reverts status to `reviewing`, clears `published_at`

### 5. Blueprint Registration (Backend)
**File:** `smart-eval-backend/api/v1/__init__.py`

Registered two new sub-blueprints:
```python
from api.v1.students import student_bp
from api.v1.challenges import challenge_bp
api_v1.register_blueprint(student_bp)      # /api/v1/results/*
api_v1.register_blueprint(challenge_bp)    # /api/v1/challenges/*
```

### 6. Student Service (Frontend)
**File:** `smart-eval-frontend/src/services/studentService.ts`

TypeScript API service with interfaces and methods:

| Interface | Purpose |
|---|---|
| `StudentResult` | Dashboard result card data |
| `QuestionResult` | Question-wise evaluation data with challenge fields |
| `ResultDetail` | Full detailed result with exam, student, summary, questions |
| `ChallengeQuestion` | Challenge submission payload |
| `ChallengeData` | Full challenge with resolution, enriched fields |

| Method | Endpoint |
|---|---|
| `getResults()` | GET /api/v1/results |
| `getResultDetail(examId)` | GET /api/v1/results/:examId |
| `submitChallenge(examId, questions)` | POST /api/v1/challenges |
| `getChallenges(params?)` | GET /api/v1/challenges |
| `getChallengeDetail(id)` | GET /api/v1/challenges/:id |
| `resolveChallenge(id, resolution)` | PUT /api/v1/challenges/:id/resolve |

### 7. Student Dashboard Page (Frontend)
**File:** `smart-eval-frontend/src/pages/student/StudentDashboardPage.tsx`

- Header with student name, roll number, and logout
- Results list rendered as clickable cards with score-based coloring:
  - Green: >= 75%
  - Yellow: >= 50%
  - Red: < 50%
- Shows exam title, subject, dates, score/percentage
- "Challenge Pending" badge for active challenges
- Empty state with icon when no results published
- Loading spinner and error handling

### 8. Result Detail Page (Frontend)
**File:** `smart-eval-frontend/src/pages/student/ResultDetailPage.tsx`

- Overall score summary card with percentage, marks, and overall feedback
- Question-wise breakdown cards with:
  - Score display with color-coded progress bar
  - AI-generated feedback text
  - Keywords found (green) and missing (red, strikethrough)
  - Concepts covered (blue) and missing (gray, strikethrough)
  - Challenge status badges (pending/under_review/accepted/rejected)
  - "Teacher Adjusted" badge for overridden grades
- Inline challenge submission form:
  - Textarea with 500 character limit and counter
  - Submit/Cancel buttons with loading state
  - Only shown for questions eligible for challenge (can_challenge=true, no existing challenge)
- Back navigation to dashboard

### 9. Teacher Challenge Queue Page (Frontend)
**File:** `smart-eval-frontend/src/pages/teacher/ChallengeQueuePage.tsx`

- Header with quick stats: total, pending, in review, accepted, rejected
- Controls: status filter dropdown, date sort, refresh button
- Challenge table with columns: Student (name + roll), Exam (title + subject), Questions (Q numbers), Status (badge), Submitted date, Actions
- Resolve modal:
  - Shows all challenged questions with student justification and current AI feedback
  - Accept/Reject radio selection
  - Score adjustment inputs per question (only shown when accepting)
  - Comments textarea
  - Resolution details display for already-resolved challenges
- Full CRUD lifecycle from listing through resolution

### 10. Route Wiring (Frontend)
**File:** `smart-eval-frontend/src/App.tsx`

Added new route imports and protected routes:

| Route | Component | Role |
|---|---|---|
| `/dashboard/challenges` | ChallengeQueuePage | teacher |
| `/student/dashboard` | StudentDashboardPage | student |
| `/student/results/:examId` | ResultDetailPage | student |

Existing role-based redirect at `/` already handles: teacher → `/dashboard`, student → `/student/dashboard`.

Removed old placeholder `.jsx` files:
- `pages/student/Dashboard.jsx`
- `pages/student/ResultDetail.jsx`
- `pages/student/ChallengeSubmit.jsx`

---

## File Tree Changes

### New Files Created
```
smart-eval-backend/
  models/challenge.py                          # Challenge document model
  api/v1/students/routes.py                    # Student results endpoints (replaced placeholder)
  api/v1/challenges/routes.py                  # Challenge CRUD endpoints (replaced placeholder)

smart-eval-frontend/
  src/services/studentService.ts               # Student/Challenge API service
  src/pages/student/StudentDashboardPage.tsx    # Student results dashboard
  src/pages/student/ResultDetailPage.tsx        # Detailed result + challenge submission
  src/pages/teacher/ChallengeQueuePage.tsx      # Teacher challenge queue + resolve
```

### Files Modified
```
smart-eval-backend/
  api/v1/__init__.py                           # Registered student_bp and challenge_bp
  api/v1/students/__init__.py                  # Updated module export
  api/v1/challenges/__init__.py                # Updated module export
  api/v1/exams/routes.py                       # Added publish/unpublish endpoints

smart-eval-frontend/
  src/App.tsx                                  # Added 3 new routes + imports
```

### Files Deleted
```
smart-eval-frontend/
  src/pages/student/Dashboard.jsx              # Old placeholder
  src/pages/student/ResultDetail.jsx           # Old placeholder
  src/pages/student/ChallengeSubmit.jsx        # Old placeholder
```

---

## API Endpoints Summary

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/results` | Student | List published results |
| GET | `/api/v1/results/:examId` | Student | Detailed question-wise result |
| POST | `/api/v1/challenges` | Student | Submit grade challenge |
| GET | `/api/v1/challenges` | Student/Teacher | List challenges (role-filtered) |
| GET | `/api/v1/challenges/:id` | Student/Teacher | Challenge detail |
| PUT | `/api/v1/challenges/:id/resolve` | Teacher | Accept or reject challenge |
| POST | `/api/v1/exams/:examId/publish` | Teacher | Publish exam results |
| POST | `/api/v1/exams/:examId/unpublish` | Teacher | Unpublish exam results |

---

## Known Limitations & Notes

1. **Student-AnswerSheet Mapping:** The `student_id` field on AnswerSheet is currently set to `teacher_id` as a placeholder (from Sprint 4). Real student assignment will need a proper upload or enrollment flow.

2. **Student Registration:** Students can register via the existing `/api/v1/auth/register` endpoint with `role: "student"`. No separate registration flow was needed since the auth system already supports multiple roles. Roll number is stored in `profile.roll_number`.

3. **Challenge Deduplication:** A student cannot submit a second pending challenge for the same question number on the same evaluation. Accepted/rejected challenges do not block new challenges.

4. **Score Recalculation:** When a challenge is accepted with score changes, the evaluation's `total_marks_awarded` and `percentage` are recalculated from all question evaluations, and status is set to `overridden`.

5. **No Pagination:** Results and challenge lists currently return all records without pagination. Should be addressed in Sprint 8 if data volume grows.

---

## Dependencies on Previous Sprints

- **Sprint 4 (OCR):** AnswerSheet model with student_id, original_file
- **Sprint 5 (Grading):** Evaluation model with QuestionEvaluation, scoring fields
- **Sprint 6 (Review):** Override tracking fields (override_applied, original_marks, override_reason), reviewed status, exam statistics
