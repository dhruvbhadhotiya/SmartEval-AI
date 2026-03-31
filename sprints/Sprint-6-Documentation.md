# Sprint 6: Teacher Review Interface & Groq Cloud Integration

**Duration:** Week 11-12
**Status:** Complete
**Date Completed:** March 27, 2026

---

## Sprint Goals

Implement the human-in-the-loop review layer that allows teachers to review, override, and approve AI-generated grades before publishing. Add Groq Cloud as a new API provider for both OCR and grading. Improve model answer extraction with LLM-powered question parsing and keyword/concept extraction. Fix all issues from the Sprint 5 PR review.

### Objectives
- Add grade override capability with audit trail (original marks, reason, teacher ID)
- Build single-sheet and bulk approval workflow (status: graded -> reviewed)
- Create dedicated GradingReviewPage with sorting, filtering, and batch selection
- Build ReviewInterface with side-by-side PDF viewer and editable evaluation
- Add holistic grading parameters UI (attendance factor)
- Enhance ExamDetailsPage with review navigation
- Add Groq Cloud API provider (vision + grading)
- Add interactive API provider selection at server startup
- Auto-extract keywords/concepts from model answer PDFs using LLM
- Improve OCR answer separation by question number
- Fix all 11 issues from Sprint 5 Copilot PR review

---

## Completed Tasks

### 1. Evaluation Model Enhancement (SEAI-021)
**File:** `smart-eval-backend/models/evaluation.py`

Added override tracking fields to `QuestionEvaluation` embedded document:

| Field | Type | Purpose |
|---|---|---|
| `override_applied` | BooleanField | Flag indicating grade was manually changed |
| `original_marks` | FloatField | AI-assigned score before override |
| `override_reason` | StringField | Required justification for the override |
| `overridden_by` | StringField | Teacher user ID who made the override |
| `overridden_at` | DateTimeField | Timestamp of the override |

Updated `Evaluation.to_dict()` to serialize all override fields in the API response.

### 2. Answer Sheet Model Enhancement
**File:** `smart-eval-backend/models/answer_sheet.py`

Extended `to_dict()` to include score data for `reviewed` and `overridden` statuses (previously only `graded` sheets included score in serialization).

### 3. Grade Override Endpoint (SEAI-022)
**File:** `smart-eval-backend/api/v1/grading/routes.py`

```
PUT /api/v1/grading/sheets/:sheetId/questions/:qNum
Body: { "marks_awarded": float, "feedback": string, "reason": string }
Auth: Teacher (must own the exam)
```

**Logic:**
- Validates marks within 0 to max_marks range
- Stores original marks on first override only
- Updates marks, feedback, override metadata
- Recalculates `Evaluation.total_marks_awarded` and `percentage`
- Sets evaluation status to `overridden`

### 4. Sheet Approval Endpoint (SEAI-023)
**File:** `smart-eval-backend/api/v1/grading/routes.py`

```
POST /api/v1/grading/sheets/:sheetId/approve
Auth: Teacher
```

- Transitions sheet status from `graded` to `reviewed`
- Adds processing log entry (stage: review, status: approved)
- Increments exam `statistics.reviewed` counter
- Idempotent: returns success for already-reviewed sheets

### 5. Bulk Approval Endpoint (SEAI-024)
**File:** `smart-eval-backend/api/v1/grading/routes.py`

```
POST /api/v1/grading/exams/:examId/approve-all
Body: { "sheet_ids": ["id1", "id2"] }  (optional)
Auth: Teacher
```

- If `sheet_ids` provided: approves specified sheets
- If empty/missing: approves ALL graded sheets for the exam
- Returns `{ approved_count, already_reviewed, failed }`
- Updates exam statistics with total reviewed count

### 6. Frontend Service Layer (SEAI-021)
**File:** `smart-eval-frontend/src/services/gradingService.ts`

Added three new API methods:
- `overrideQuestionGrade(sheetId, questionNumber, data)` - PUT override
- `approveSheet(sheetId)` - POST single approval
- `bulkApprove(examId, sheetIds?)` - POST bulk approval

Updated `QuestionEvaluation` interface with override fields. Updated `AnswerSheet` interface with `marks_awarded` and `max_marks`. Extended `updateGradingConfig` to accept `holistic_params`.

### 7. GradingReviewPage (SEAI-025)
**File:** `smart-eval-frontend/src/pages/teacher/GradingReviewPage.tsx` (NEW)

**Route:** `/dashboard/exams/:examId/review`

**Features:**
- Header with exam title, subject, and stats badges (total/graded/reviewed/avg)
- Filter bar: status dropdown (All, Graded, Reviewed)
- Sort options: date asc/desc, score asc/desc
- Answer sheets table with checkbox selection column
- "Approve Selected" and "Approve All Graded" buttons
- Per-row "Review" (opens ReviewInterface) and "Approve" actions
- Confirmation dialog before bulk approve
- Back navigation to ExamDetailsPage

### 8. ReviewInterface Component (SEAI-025)
**File:** `smart-eval-frontend/src/components/teacher/ReviewInterface.tsx` (NEW)

**Full-screen side-by-side review layout:**

| Left Pane | Right Pane |
|---|---|
| PDF viewer (react-pdf-viewer) | AI Evaluation summary |
| Falls back to image for JPG/PNG | Per-question score cards |
| Zoom & page navigation via plugin | Inline editing with override reason |

**Features:**
- PDF/image viewer using `@react-pdf-viewer/core` with default layout plugin
- Score summary bar with color-coded percentage and confidence badge
- Per-question cards with progress bars, keywords, and concepts
- Click "Edit" to enter inline editing mode (score input, feedback textarea, reason field)
- "Save Override" calls PUT endpoint, updates evaluation in-place
- Orange border/badge for overridden questions showing original marks
- Approve button transitions sheet to reviewed status
- Previous/Next navigation between sheets in the review list
- Sheet counter label (e.g., "Sheet 3 of 12")

### 9. Routing Update
**File:** `smart-eval-frontend/src/App.tsx`

Added protected route: `/dashboard/exams/:examId/review` -> `GradingReviewPage`

### 10. ExamDetailsPage Enhancement
**File:** `smart-eval-frontend/src/pages/teacher/ExamDetailsPage.tsx`

- Added "Review Grades" button (indigo) in Answer Sheets header toolbar
- Button only shows when graded or reviewed sheets exist
- Score column now displays for both `graded` and `reviewed` status sheets
- Added View Text and View Evaluation actions for `reviewed` status sheets

### 11. GradingConfigPanel Holistic Parameters
**File:** `smart-eval-frontend/src/components/teacher/GradingConfigPanel.tsx`

Added holistic parameters section below existing strictness/keyword controls:
- Attendance factor toggle (on/off)
- Weight slider (0-20%)
- Threshold input (attendance % needed)
- Direction dropdown (higher/lower marks for borderline students)
- All params saved via existing `PUT /exams/:id/grading-config` endpoint

---

## Files Modified

| File | Type | Changes |
|------|------|---------|
| `smart-eval-backend/models/evaluation.py` | Modified | Added 5 override tracking fields + BooleanField import + to_dict serialization |
| `smart-eval-backend/models/answer_sheet.py` | Modified | Score lookup for reviewed/overridden status |
| `smart-eval-backend/api/v1/grading/routes.py` | Modified | Added 3 endpoints: override, approve, bulk-approve; removed unused jsonify import; fixed ExamStatistics dict-style access |
| `smart-eval-backend/api/v1/exams/routes.py` | Modified | LLM-powered model answer parsing; server-side validation for parsed answers |
| `smart-eval-backend/app/config.py` | Modified | Added GROQ_API_KEY, GROQ_VISION_MODEL, GROQ_LLM_MODEL config vars |
| `smart-eval-backend/run.py` | Modified | Interactive CLI provider selection at startup |
| `smart-eval-backend/services/llm_service.py` | Modified | Added groqcloud provider + `parse_model_answer_text()` method + improved grading prompt |
| `smart-eval-backend/services/ocr_service.py` | Modified | Added groqcloud provider + improved OCR prompts for question separation |
| `smart-eval-backend/services/grading_service.py` | Modified | Fixed status filter for grading eligibility |
| `smart-eval-backend/.env.example` | Modified | Added Groq Cloud config entries |
| `smart-eval-frontend/src/services/gradingService.ts` | Modified | 3 new API methods + updated interfaces |
| `smart-eval-frontend/src/pages/teacher/GradingReviewPage.tsx` | **NEW** | Full review list page (~250 lines) |
| `smart-eval-frontend/src/components/teacher/ReviewInterface.tsx` | **NEW** | Side-by-side review component (~310 lines) |
| `smart-eval-frontend/src/App.tsx` | Modified | Added review route |
| `smart-eval-frontend/src/pages/teacher/ExamDetailsPage.tsx` | Modified | Review Grades button, fixed polling, fixed grading button condition |
| `smart-eval-frontend/src/components/teacher/GradingConfigPanel.tsx` | Modified | Holistic parameters UI + fixed error handling |
| `smart-eval-frontend/src/components/teacher/ModelAnswerModal.tsx` | Modified | Auto-populate parsed questions with keywords/concepts; fixed raw state management; fixed error handling |

---

## API Endpoints Summary

### New Endpoints (Sprint 6)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| PUT | `/api/v1/grading/sheets/:sheetId/questions/:qNum` | Override a question's grade |
| POST | `/api/v1/grading/sheets/:sheetId/approve` | Approve a single sheet |
| POST | `/api/v1/grading/exams/:examId/approve-all` | Bulk approve sheets |

### Existing Endpoints Used

| Method | Endpoint | Used By |
|--------|----------|---------|
| GET | `/api/v1/grading/exams/:examId/sheets` | GradingReviewPage list |
| GET | `/api/v1/grading/sheets/:sheetId` | ReviewInterface sheet data |
| GET | `/api/v1/grading/sheets/:sheetId/evaluation` | ReviewInterface evaluation |
| PUT | `/api/v1/exams/:examId/grading-config` | GradingConfigPanel holistic params |

---

## User Flow

1. Teacher navigates to ExamDetailsPage after grading is complete
2. Clicks "Review Grades" button to open GradingReviewPage
3. Sees all graded/reviewed sheets with scores and status badges
4. Can filter by status, sort by score or date
5. Clicks "Review" on a sheet to open ReviewInterface
6. Left pane shows original answer sheet PDF, right pane shows AI evaluation
7. Clicks "Edit" on any question to override the score with a reason
8. Clicks "Approve" to mark the sheet as reviewed
9. Uses Previous/Next to navigate between sheets
10. Returns to list, selects multiple sheets, clicks "Approve Selected"
11. Or clicks "Approve All Graded" for batch approval

---

## Technical Notes

- Override tracking preserves original AI marks on first override only (subsequent overrides update marks but don't change `original_marks`)
- Bulk approve uses atomic per-sheet updates with final statistics recount
- ReviewInterface reuses `@react-pdf-viewer/core` and `@react-pdf-viewer/default-layout` packages already in the project
- Score color helpers (`getScoreColor`, `getScoreBg`, `getConfidenceBadge`) are defined locally in ReviewInterface (same logic as EvaluationModal)
- The `holistic_params` are stored in the existing `grading_config.holistic_params` DictField — no new backend model needed

---

## Groq Cloud API Integration

### 12. Groq Cloud Provider (SEAI-026)

Added `groqcloud` as a 5th API provider for both Vision (OCR) and LLM (Grading):

| Purpose | Model | Endpoint |
|---------|-------|----------|
| Vision (OCR) | `meta-llama/llama-4-scout-17b-16e-instruct` | `https://api.groq.com/openai/v1/chat/completions` |
| LLM (Grading) | `openai/gpt-oss-120b` | `https://api.groq.com/openai/v1/chat/completions` |

**Configuration:**
- `GROQ_API_KEY` — API key from https://console.groq.com/keys
- `GROQ_VISION_MODEL` — Vision model (default: llama-4-scout)
- `GROQ_LLM_MODEL` — Grading model (default: gpt-oss-120b with `reasoning_effort: "medium"`)

**Files:**
- `config.py` — Added 3 new config vars
- `ocr_service.py` — Added `_call_groqcloud()` for vision
- `llm_service.py` — Added `_call_groqcloud()` for grading
- `.env` / `.env.example` — Added Groq Cloud entries

### 13. Interactive Provider Selection (SEAI-027)
**File:** `smart-eval-backend/run.py`

Server startup now presents a CLI menu:
```
============================================================
  Smart-Eval Server — API Provider Configuration
============================================================

--- Vision Provider (OCR / Text Extraction) ---
  Current: openrouter
  [1] Ollama (local)
  [2] OpenAI-compatible (LM Studio, vLLM, etc.)
  [3] LM Studio (native API)
  [4] OpenRouter (cloud - free tier)
  [5] Groq Cloud (fast cloud inference)
  [Enter] Keep current (openrouter)
```

- Separate selection for Vision and LLM providers
- Auto-sets correct API URLs and models per provider
- Press Enter to keep current `.env` settings

### 14. LLM-Powered Model Answer Parsing (SEAI-028)
**Files:** `llm_service.py`, `exams/routes.py`, `ModelAnswerModal.tsx`

When extracting text from a model answer PDF, the system now:
1. Runs OCR to extract raw text (existing behavior)
2. Sends the text to the LLM to parse into structured questions
3. For each question, extracts: answer text, keywords, and concepts
4. Returns `parsed_questions` alongside raw pages in the API response
5. Frontend auto-populates the Model Answer form with pre-filled keywords and concepts

**New LLM method:** `LLMService.parse_model_answer_text(ocr_text, max_marks)`

### 15. Improved Answer Separation (SEAI-029)

**OCR prompts updated** across all 5 providers to instruct the vision model:
> "Preserve the structure: if answers are labeled by question numbers (e.g., Q1, Q2, Ans 1, 1., 1)), keep those labels intact."

**Grading prompt updated** to instruct the LLM:
> "From the student's full answer sheet above, identify and extract ONLY the answer for Question N."

This ensures proper per-question grading even when the full OCR text is sent for each question.

---

## Sprint 5 PR Review Fixes (SEAI-030)

All 11 issues from the Copilot review (`Privious_Pull.md`) were resolved:

| # | Issue | Fix |
|---|-------|-----|
| 1 | Run Grading button enabled for already-graded sheets | Changed condition to `ocr_completed \|\| failed` |
| 2 | `removeQuestion` doesn't re-index `keywordsRaw`/`conceptsRaw` | Added state re-indexing on removal |
| 3 | Error handling shows `[object Object]` in ModelAnswerModal | Use `err?.response?.data?.error?.message` |
| 4 | Error handling shows `[object Object]` in GradingConfigPanel | Same fix |
| 5 | `grade_answer_sheet` allows `processing` status (OCR conflict) | Restricted to `ocr_completed`, `graded`, `processing` |
| 6 | `grade_exam_sheets` queries `processing` sheets (OCR conflict) | Kept `processing` in query since route sets it intentionally |
| 7 | Unused `jsonify` import in grading routes | Removed |
| 8 | No server-side validation for parsed model answers | Added validation: `question_number >= 1`, `max_marks > 0`, type checks |
| 9 | Raw keyword/concept maps not reset on PDF extract | Reset maps when overwriting answers |
| 10 | Polling useEffect recreates interval on every answerSheets update | Changed dependency to derived `shouldPoll` boolean |
| 11 | `approve_sheet`/`bulk_approve` treat `ExamStatistics` as dict | Fixed to use proper embedded document attribute access |