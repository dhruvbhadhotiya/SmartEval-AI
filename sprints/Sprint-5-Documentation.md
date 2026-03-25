# Sprint 5: LLM Grading Engine

**Duration:** Week 9-10  
**Status:** ✅ Complete  
**Date Completed:** March 24, 2026

---

## 🎯 Sprint Goals

Implement full AI-powered grading pipeline using LLMs to evaluate student answers against model answers. Build evaluation storage model, grading configuration UI, model answer input interface, and evaluation results viewer — completing the end-to-end grading workflow started in Sprint 4.

### Objectives
- Build LLM grading service with 4-provider support (Ollama, OpenAI-compatible, LM Studio, OpenRouter)
- Engineer grading prompts with configurable strictness levels
- Create `Evaluation` model to store per-question grading results
- Add grading endpoints to existing API (`/grading/exams/:id/grade`, etc.)
- Allow teachers to save structured model answers per question
- Build `GradingConfigPanel`, `ModelAnswerModal`, and `EvaluationModal` React components
- Implement background-threaded batch grading (server-side, survives tab close)
- Add frontend polling for real-time status updates during grading
- Fix statistics calculation and score display in answer sheets table

---

## 📋 Completed Tasks

### 1. LLM Service — Full Implementation (SEAI-017)
**File:** `smart-eval-backend/services/llm_service.py` (~365 lines)

**Four Provider Abstraction:**

| Provider | Endpoint | Auth | Config Value |
|---|---|---|---|
| `ollama` | `POST /api/chat` | None | `LLM_PROVIDER=ollama` |
| `openai` | `POST /chat/completions` | None | `LLM_PROVIDER=openai` |
| `lmstudio` | `POST /chat/completions` | None | `LLM_PROVIDER=lmstudio` |
| `openrouter` | `POST /chat/completions` | Bearer API key | `LLM_PROVIDER=openrouter` |

**Public API:**
```python
# Grade a single question
LLMService.grade_answer(
    student_text, model_answer, max_marks,
    strictness, keywords, concepts, question_number
) -> {
    'marks_awarded': float,
    'max_marks': float,
    'feedback': str,
    'confidence': float,
    'keywords_found': list,
    'keywords_missing': list,
    'concepts_covered': list,
    'concepts_missing': list,
}

# Grade all questions for one sheet
LLMService.grade_full_sheet(
    ocr_text, parsed_answers, strictness
) -> [per_question_result, ...]
```

**Prompt Engineering:**

Grading prompt includes:
- Maximum marks
- Strictness instruction (see below)
- Model answer text
- Keywords and concepts to check for
- Student's OCR-extracted answer

**Strictness Levels:**

| Level | Behavior |
|---|---|
| `lenient` | Generous partial credit; marks awarded if student shows understanding even with minor errors |
| `moderate` | Balanced scoring; partial credit for partial understanding, deductions for significant gaps |
| `strict` | Rigorous evaluation; only precise, complete, accurate answers receive full marks |

**Response Parsing:**
- Expects JSON from LLM (may be wrapped in markdown code fences)
- Strips ` ```json ` / ` ``` ` wrappers before parsing
- Falls back to zero marks + raw text if parsing fails
- Clamps `marks_awarded` to `[0, max_marks]`

**Timeout:** 5 minutes per question (300s)

---

### 2. Grading Algorithm (SEAI-018)
**File:** `smart-eval-backend/services/grading_service.py` (extended to ~357 lines)

**`grade_answer_sheet(answer_sheet_id)` Pipeline:**
```
AnswerSheet (status: ocr_completed / graded / failed / processing)
    → Validate status
    → Load Exam + parsed_answers
    → Concatenate OCR text from all pages
    → For each ParsedAnswer:
        LLMService.grade_answer(ocr_text, pa.answer_text, pa.max_marks, ...)
    → Build QuestionEvaluation[] list
    → Aggregate: total_marks_awarded, total_max_marks, percentage
    → Create or update Evaluation document
    → AnswerSheet.status = 'graded'
    → Add processing log entry
```

**Percentage Normalization:**
- Uses `exam.max_marks` (overall exam maximum) for percentage, not sum of per-question marks
- Ensures statistics match the exam's configured mark scheme

**`grade_exam_sheets(exam_id)` Batch Flow:**
```
Find all sheets: status ∈ {ocr_completed, graded, failed, processing}
    → Grade each sheet individually (per-sheet try/except)
    → Aggregate exam statistics:
        average_score = mean(all evaluation percentages)
        highest_score = max(...)
        lowest_score = min(...)
    → exam.update_statistics(...)
```

**Overall Feedback Tiers:**

| Score | Feedback |
|---|---|
| ≥ 90% | "Excellent performance!" |
| ≥ 75% | "Good performance. Minor areas for improvement." |
| ≥ 50% | "Average performance. Several concepts need review." |
| ≥ 35% | "Below average. Significant gaps in understanding." |
| < 35% | "Needs improvement. Core concepts require revision." |

---

### 3. Evaluation Model (SEAI-018)
**File:** `smart-eval-backend/models/evaluation.py` (~120 lines)

**`QuestionEvaluation` (EmbeddedDocument):**
```python
question_number: IntField
max_marks: FloatField
marks_awarded: FloatField
feedback: StringField
confidence: FloatField           # 0.0 – 1.0 from LLM
keywords_found: ListField        # subset of configured keywords found in answer
keywords_missing: ListField      # keywords the student omitted
concepts_covered: ListField      # concepts the student demonstrated
concepts_missing: ListField      # concepts the student missed
```

**`Evaluation` (Document):**
```python
answer_sheet_id: ReferenceField(AnswerSheet)  # unique
exam_id: ReferenceField(Exam)
question_evaluations: ListField(EmbeddedDocumentField(QuestionEvaluation))

# Aggregates
total_marks_awarded: FloatField
total_max_marks: FloatField
percentage: FloatField            # (total_awarded / exam.max_marks) × 100
overall_feedback: StringField
overall_confidence: FloatField    # average of per-question confidence

# Config snapshot
strictness: StringField           # 'lenient' | 'moderate' | 'strict'
status: StringField               # 'pending' | 'completed' | 'failed' | 'overridden'
graded_at: DateTimeField
```

**Indexes:** `answer_sheet_id`, `exam_id`, `status`, `-created_at`

---

### 4. Feedback Generation (SEAI-019)

Feedback is generated at two levels:

**Per-Question** (via LLM prompt):
- Max 100 words
- Specific, actionable
- Names missing keywords and concepts
- Included in `QuestionEvaluation.feedback`

**Overall** (via `GradingService._generate_overall_feedback()`):
- Tier-based summary (see table above)
- Includes raw `awarded/max` in message
- Stored in `Evaluation.overall_feedback`

Both are displayed in `EvaluationModal`.

---

### 5. Grading API Endpoints (SEAI-017 / SEAI-020)
**File:** `smart-eval-backend/api/v1/grading/routes.py` (extended to ~380 lines)

**4 New Endpoints:**

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `POST /grading/exams/:exam_id/grade` | POST | Teacher | Batch grade all eligible sheets |
| `POST /grading/sheets/:sheet_id/grade` | POST | Teacher | Grade single sheet (synchronous) |
| `GET /grading/sheets/:sheet_id/evaluation` | GET | Teacher | Retrieve grading results |
| `GET /grading/exams/:exam_id/evaluations` | GET | Teacher | List all evaluations for exam |

**Batch Grade Details (`POST /grading/exams/:id/grade`):**
- Immediately marks all eligible sheets (`ocr_completed`, `failed`) as `processing`
- Spawns a **background daemon thread** with a copy of the Flask app context
- Returns HTTP 200 immediately: `{ status: 'grading_started', sheets_queued: N }`
- Thread runs `GradingService.grade_exam_sheets()` in the background
- Grading **survives browser tab close** — no dependency on the HTTP connection

```python
# Thread setup
import threading
app = current_app._get_current_object()

def run_grading():
    with app.app_context():
        GradingService.grade_exam_sheets(exam_id)

thread = threading.Thread(target=run_grading, daemon=True)
thread.start()
```

---

### 6. Model Answer & Grading Config Endpoints
**File:** `smart-eval-backend/api/v1/exams/routes.py` (extended)

**`POST /exams/:exam_id/model-answer/parsed`:**
```json
// Request body
{
  "answers": [
    {
      "question_number": 1,
      "max_marks": 10,
      "answer_text": "A binary search tree is...",
      "keywords": ["BST", "binary", "O(log n)"],
      "concepts": ["definition", "properties", "complexity"]
    }
  ]
}
```
- Validates `question_number` and `max_marks` are present and positive
- Replaces entire `exam.model_answer.parsed_answers` list on each call
- Returns updated exam dict on success

**`PUT /exams/:exam_id/grading-config`:**
```json
{
  "strictness": "lenient | moderate | strict",
  "keyword_mode": "exact | synonyms"
}
```
- Validates `strictness` ∈ `{lenient, moderate, strict}`
- Validates `keyword_mode` ∈ `{exact, synonyms}`
- Creates `grading_config` if not present on exam

**`POST /exams/:exam_id/model-answer/extract`:**
- Runs OCR on the uploaded model answer PDF
- Returns `{ pages: [{ page_number, text, confidence, processed_at }] }`
- Useful for auto-populating model answer text from an existing PDF
- `processed_at` serialized to ISO string before response

**`POST /exams/:exam_id/question-paper/extract`:**
- Same as above but for the question paper PDF

---

### 7. Grading Configuration UI — GradingConfigPanel (SEAI-020)
**File:** `smart-eval-frontend/src/components/teacher/GradingConfigPanel.tsx` (~145 lines)

**UI Layout:**
- Card section "Grading Configuration" (right sidebar of ExamDetailsPage)
- **Strictness:** 3-button toggle (Lenient / Moderate / Strict)
  - Active button highlighted blue
  - Descriptive subtitle per option
- **Keyword Mode:** 2-button toggle (Synonyms / Exact)
- **Save button** — calls `PUT /exams/:id/grading-config`
- Success/error feedback banner

**Props:**
```typescript
interface GradingConfigPanelProps {
  examId: string
  currentStrictness?: string    // default: 'moderate'
  currentKeywordMode?: string   // default: 'synonyms'
  onUpdated: () => void
}
```

---

### 8. Model Answer Input — ModelAnswerModal (SEAI-013 / SEAI-017)
**File:** `smart-eval-frontend/src/components/teacher/ModelAnswerModal.tsx` (~340 lines)

**Features:**
- **"Extract from PDF" button** (header, right side)  
  Calls `POST /exams/:id/model-answer/extract` → OCR runs on uploaded PDF → Pre-fills `answer_text` of Q1 with full extracted text

- **Per-question form blocks:**
  - Max Marks (number input, validated > 0)
  - Model Answer Text (textarea, required)
  - Keywords (comma-separated, raw string — split only on save)
  - Concepts (comma-separated, raw string — split only on save)

- **Comma typing fix:** Keywords and concepts stored as raw strings in separate state (`keywordsRaw`, `conceptsRaw`), parsed to arrays only at save time

- **Pre-population:** Receives `existingAnswers` prop from parent; populates form from existing `exam.model_answer.parsed_answers`

- **Dynamic questions:** Add Question / Remove Question buttons

- **Footer:** Shows total configured marks vs exam max marks

**Props:**
```typescript
interface ModelAnswerModalProps {
  examId: string
  existingAnswers?: ParsedAnswer[]
  maxMarks: number
  onClose: () => void
  onSaved: () => void
}
```

---

### 9. Evaluation Results Viewer — EvaluationModal (SEAI-019)
**File:** `smart-eval-frontend/src/components/teacher/EvaluationModal.tsx` (~165 lines)

**Layout (two-column):**

**Header:**
- Overall score: `X/Y (Z%)`  — color coded (green ≥75%, yellow ≥50%, red <50%)
- Confidence badge (top-right corner)
- Overall feedback text (italic, subdued)

**Left Column — Per-Question Evaluations:**
- Question number + marks (`Q1: 8/10`)
- Horizontal progress bar (color reflects score ratio)
- Feedback text (AI-generated)
- Keywords: ✅ found (green badge) / ❌ missing (strikethrough red)
- Concepts: covered (blue badge) / missing (gray strikethrough)

**Right Column — Student's OCR Text:**
- Full concatenated OCR text
- Monospace `<pre>` block, scrollable
- Fixed label "Student Answer (OCR)"

**OCR Text Fix:** `handleViewEvaluation` now fetches the full answer sheet (with `include_ocr=true`) concurrently with the evaluation to ensure OCR text is always populated:
```typescript
const [evalResponse, sheetResponse] = await Promise.all([
  gradingService.getEvaluation(sheet.id),
  gradingService.getAnswerSheet(sheet.id),
])
```

---

### 10. ExamDetailsPage Enhancements
**File:** `smart-eval-frontend/src/pages/teacher/ExamDetailsPage.tsx`

**New Grading UI Elements:**

| Element | Purpose |
|---|---|
| "Run Grading" button | Triggers `POST /grading/exams/:id/grade` |
| "Grade" per-sheet button | Individual sheet grading |
| "View Evaluation" per-sheet button | Opens EvaluationModal |
| Score column in table | Shows `{score}%` for graded sheets |
| Grading status banner | Shows "Grading started in background for N sheet(s)..." |
| Model Answers button | Opens ModelAnswerModal |

**Polling Mechanism (auto-refresh during grading):**
```typescript
// Polls every 5 seconds while any sheet has status 'processing'
useEffect(() => {
  const hasProcessing = answerSheets.some(s => s.status === 'processing')
  if (hasProcessing || isGrading) {
    pollingRef.current = window.setInterval(async () => {
      await loadAnswerSheets()
      dispatch(fetchExamById(examId))
    }, 5000)
  } else {
    clearInterval(pollingRef.current)
  }
}, [answerSheets, isGrading])
```

**Action Buttons per Sheet Status:**

| Status | Available Actions |
|---|---|
| `uploaded` | Run OCR |
| `ocr_completed` | View Text, Grade |
| `graded` | View Text, View Evaluation |
| `failed` | Retry OCR |
| `processing` | *(none — status badge only)* |

---

### 11. Score Field in AnswerSheet.to_dict()
**File:** `smart-eval-backend/models/answer_sheet.py`

Added score lookup to `to_dict()` for graded sheets:
```python
if self.status == 'graded':
    from models.evaluation import Evaluation
    evaluation = Evaluation.objects(answer_sheet_id=self).first()
    if evaluation:
        data['score'] = evaluation.percentage
        data['marks_awarded'] = evaluation.total_marks_awarded
        data['max_marks'] = evaluation.total_max_marks
```

---

### 12. Question Paper OCR View
**File:** `smart-eval-frontend/src/pages/teacher/ExamDetailsPage.tsx`

- "Extract Text (OCR)" button appears on the Question Paper section header (only when a PDF is uploaded)
- After extraction, text displays **inline** below the file upload zone (max 15 lines, scrollable)
- "View Full Text" button opens a full-screen modal
- Closing the modal does **not** clear the text — it persists until the page reloads

---

## 🐛 Bugs Fixed

### 1. Grading Returned "Grading failed" with `sheet.id` Undefined
**Issue:** `POST /api/v1/grading/sheets/undefined/grade` — 404 on every sheet

**Root Cause:** Frontend referenced `sheet._id` (undefined) instead of `sheet.id`.

**Fix:**
```typescript
// BEFORE
const response = await gradingService.gradeSheet(sheet._id)

// AFTER
const response = await gradingService.gradeSheet(sheet.id)
```

---

### 2. All Error Responses Returned HTTP 200
**Issue:** `error_response("msg", 404)` returned HTTP 200 — axios treated all errors as success.

**Root Cause:** `error_response()` only returned a plain dict. Flask auto-wrapped it in a 200 response.

**Fix:** Made `error_response()` detect numeric vs string codes:
```python
def error_response(message, code=None, details=None):
    if isinstance(code, int):
        return jsonify(response), http_status   # proper HTTP status
    return response                              # plain dict (auth routes wrap themselves)
```

---

### 3. Grading Stuck at "processing" — Tab Close Stops Grading
**Issue:** `isGrading` spinner never cleared; sheet status never updated after closing the page.

**Root Cause:** Batch grading ran synchronously in the request handler. Closing the tab cancelled the HTTP request and killed the grading mid-way.

**Fix:**
- Backend: Marks sheets `processing` immediately, then spawns background thread
- Frontend: `isGrading` spinner clears immediately on response (`grading_started`)
- Frontend: Polling interval auto-refreshes every 5s while any sheet is `processing`

---

### 4. Statistics Showing Wrong Percentage (60% instead of 80%)
**Issue:** `Evaluation.percentage` was calculated as `total_awarded / sum(per_question_max_marks) × 100`, which diverged from the exam's configured max score.

**Root Cause:** If the teacher configured partial model answers (e.g. only 2 questions totaling 5 marks), but the exam had `max_marks=10`, the percentage was out of 5.

**Fix:**
```python
# BEFORE
percentage = (total_awarded / total_max * 100) if total_max > 0 else 0.0

# AFTER — normalize to exam's max_marks
exam_max = exam.max_marks or total_max
percentage = (total_awarded / exam_max * 100) if exam_max > 0 else 0.0
```

---

### 5. "No OCR Text Available" in Evaluation Modal
**Issue:** EvaluationModal always showed "No OCR text available" even for graded sheets.

**Root Cause:** `handleViewEvaluation` stored the sheet from the `answerSheets` list state, which was loaded without `include_ocr=true` — so `ocr_results` was always empty.

**Fix:** Fetch the full sheet (with OCR text) in parallel when opening evaluation:
```typescript
const [evalResponse, sheetResponse] = await Promise.all([
  gradingService.getEvaluation(sheet.id),
  gradingService.getAnswerSheet(sheet.id),  // includes OCR text
])
```

---

### 6. Cannot Type Comma in Keywords/Concepts Fields
**Issue:** Typing `,` immediately split the string and removed the comma from the input.

**Root Cause:** `onChange` handler called `value.split(',').map(trim).filter(Boolean)` on every keystroke, consuming the comma.

**Fix:** Introduced raw string state for keywords and concepts:
```typescript
const [keywordsRaw, setKeywordsRaw] = useState<Record<number, string>>({})
// onChange: setKeywordsRaw(prev => ({ ...prev, [idx]: e.target.value }))
// On save: keywords = keywordsRaw[idx].split(',').map(s => s.trim()).filter(Boolean)
```

---

### 7. Existing Model Answers Not Pre-Populated
**Issue:** Opening "Model Answers" always showed a blank form, discarding previously saved answers.

**Root Cause:** `ModelAnswerModal` was rendered without the `existingAnswers` prop — parent passed `undefined`.

**Fix:**
- Added `parsed_answers` field to the `Exam` TypeScript interface in `examService.ts`
- Passed `currentExam.model_answer?.parsed_answers` as `existingAnswers` prop

---

### 8. Extract from PDF Returned HTTP 400
**Issue:** `POST /exams/:id/model-answer/extract` always returned 400 even when OCR succeeded.

**Root Cause 1:** `ValidationError` exceptions from OCR provider failures (connection errors, timeouts) were caught as 400 (client error), masking the real server-side error.

**Root Cause 2:** `success_response()` returns a plain dict — Flask serialized it with a 200 header but `processed_at: datetime` objects caused a JSON serialization error, which Flask converted to a 400.

**Fix:**
- Changed `ValidationError` in extract endpoints to return HTTP 500 with logged error message
- Added explicit `jsonify()` wrapping on success response
- Added datetime → ISO string serialization:
```python
for page in page_results:
    if hasattr(page.get('processed_at', ''), 'isoformat'):
        page['processed_at'] = page['processed_at'].isoformat()
return jsonify(success_response(data={'pages': page_results}, ...))
```

---

## 🔑 Key Features Implemented

### LLM Grading Engine
- **4-provider support** — Ollama, OpenAI-compatible, LM Studio, OpenRouter
- **Configurable strictness** — Lenient / Moderate / Strict with natural language guidance
- **Per-question scoring** — each question graded independently
- **Keyword & concept tracking** — found/missing lists returned per question
- **Confidence scoring** — 0.0–1.0 per question from LLM
- **Safe response parsing** — JSON extracted from markdown fences, fallback on parse failure
- **5-minute timeout** — accommodates slow local GPUs

### Async Background Grading
- **Daemon thread** — batch grading runs server-side regardless of connection
- **Immediate feedback** — API returns `grading_started` instantly
- **Frontend polling** — auto-refreshes every 5s while any sheet is `processing`
- **No Redis required** — works in development without Celery/Redis setup

### Structured Evaluation Storage
- `Evaluation` document linked to `AnswerSheet` (1:1, unique)
- Per-question `QuestionEvaluation` embedded array
- Keyword found/missing and concept covered/missing arrays
- Overall feedback and confidence aggregates
- Score included in `AnswerSheet.to_dict()` for graded sheets

### Teacher UI Components
- **GradingConfigPanel** — strictness and keyword mode toggles, saved to backend
- **ModelAnswerModal** — per-question editor with PDF extraction, comma-safe input, pre-population from existing data
- **EvaluationModal** — side-by-side view: score summary + per-question details + OCR text
- **Question Paper OCR** — inline text viewer with optional full modal

---

## 📊 Code Statistics

### Backend

**New Files:**
| File | Lines | Purpose |
|---|---|---|
| `models/evaluation.py` | ~120 | Evaluation + QuestionEvaluation documents |
| `tasks/grading_tasks.py` | ~3 | Celery placeholder (grading uses threading in dev) |

**Modified Files:**
| File | Changes |
|---|---|
| `services/llm_service.py` | Replaced placeholder with full 4-provider implementation (~365 lines) |
| `services/grading_service.py` | Added `grade_answer_sheet()`, `grade_exam_sheets()`, `_generate_overall_feedback()` (+248 lines) |
| `api/v1/grading/routes.py` | Added 4 grading endpoints, threading for batch, +180 lines |
| `api/v1/exams/routes.py` | Added `model-answer/parsed`, `grading-config`, `model-answer/extract`, `question-paper/extract` (+130 lines) |
| `models/answer_sheet.py` | Added `score`, `marks_awarded`, `max_marks` to `to_dict()` |
| `utils/helpers.py` | Fixed `error_response()` to return proper HTTP status codes for numeric codes |

**Total New Backend Code:** ~1,046 lines

### Frontend

**New Files:**
| File | Lines | Purpose |
|---|---|---|
| `components/teacher/GradingConfigPanel.tsx` | ~145 | Strictness + keyword mode config UI |
| `components/teacher/ModelAnswerModal.tsx` | ~340 | Per-question model answer editor |
| `components/teacher/EvaluationModal.tsx` | ~165 | Grading results viewer |

**Modified Files:**
| File | Changes |
|---|---|
| `pages/teacher/ExamDetailsPage.tsx` | Added grading buttons, polling, QP OCR view, modal integrations (+250 lines) |
| `services/gradingService.ts` | Added `startGrading`, `gradeSheet`, `getEvaluation`, `getExamEvaluations`, `saveParsedModelAnswers`, `updateGradingConfig`, `extractModelAnswerText`, `extractQuestionPaperText` (+107 lines) |
| `services/examService.ts` | Added `parsed_answers` to `Exam.model_answer` TypeScript interface |

**Total New Frontend Code:** ~1,007 lines

### Dependencies
No new packages required (all providers use `requests` — already installed in Sprint 4).

---

## 🏗️ Architecture

### Grading Pipeline
```
[Teacher: Model Answers configured]   [Teacher: Grading Config saved]
          │                                        │
          ▼                                        ▼
exam.model_answer.parsed_answers[]      exam.grading_config.strictness
{Q1: text, max_marks, keywords, concepts}         'lenient|moderate|strict'

[Teacher clicks "Run Grading"]
          │
          ▼
POST /api/v1/grading/exams/:id/grade
          │
          ├── Mark sheets → processing
          ├── Spawn background thread
          └── Return 200: { grading_started, sheets_queued }
                    │
          [Frontend polling every 5s]
                    │
          [Background Thread]
                    │
                    ▼
          GradingService.grade_exam_sheets()
                    │
          For each eligible sheet:
                    │
                    ▼
          OCR text (all pages concatenated)
                    │
          For each ParsedAnswer:
                    │
                    ▼
          LLMService.grade_answer(text, model, max_marks, strictness, keywords, concepts)
                    │
                    ▼
          POST to LLM Provider API (Ollama/OpenAI/LM Studio/OpenRouter)
                    │
                    ▼
          Parse JSON response: marks_awarded, feedback, confidence,
                               keywords_found/missing, concepts_covered/missing
                    │
                    ▼
          Build QuestionEvaluation[]
          Compute: total_marks, percentage, overall_feedback
          Create/update Evaluation document
          AnswerSheet.status = 'graded'
```

### Data Model
```
Exam
├── model_answer
│   ├── file_url
│   └── parsed_answers[]
│       ├── { question_number: 1, max_marks: 10, answer_text: "...", keywords: [], concepts: [] }
│       └── { question_number: 2, max_marks: 10, ... }
└── grading_config
    ├── strictness: 'moderate'
    └── keyword_mode: 'synonyms'

AnswerSheet
├── status: 'ocr_completed' → 'processing' → 'graded'
├── ocr_results[]
│   └── { page_number, text, confidence, processed_at }
└── to_dict() → includes score, marks_awarded, max_marks when status='graded'

Evaluation (1:1 to AnswerSheet)
├── total_marks_awarded: 8.0
├── total_max_marks: 10.0
├── percentage: 80.0               ← (awarded / exam.max_marks) × 100
├── overall_feedback: "Good performance..."
├── overall_confidence: 0.85
├── strictness: 'moderate'
└── question_evaluations[]
    └── { question_number, max_marks, marks_awarded, feedback,
          confidence, keywords_found, keywords_missing,
          concepts_covered, concepts_missing }
```

---

## 🧪 Testing Results

### End-to-End Grading Test
- **Provider:** OpenRouter (`google/gemini-2.0-flash-exp:free`)
- **Input:** Sociology exam — single answer sheet, 1 question, 20 marks max
- **Model answer:** 400-word sociological theory answer with 15 keywords, 10 concepts
- **Result:** ✅ Grading completed successfully
  - Score: 8/20 (40%)
  - Confidence: 85%
  - Keywords found: 10, missing: 5
  - Concepts covered: 3, missing: 7
  - Feedback: Specific critique of omitted Durkheim theory details

### Background Threading Test
- **Scenario:** Clicked "Run Grading" and immediately closed the browser tab
- **Result:** ✅ Grading completed server-side, status updated to `graded`
- **Verified via:** Backend logs + polling on reconnect

### Polling Test
- **Scenario:** Started grading for 3 sheets, watched the table update
- **Result:** ✅ Sheets transitioned from `processing` → `graded` one by one, every ~5s

---

## 📝 Configuration Guide

### LLM Provider Setup

**Ollama:**
```env
LLM_PROVIDER=ollama
LLM_API_URL=http://localhost:11434/api/chat
LLM_MODEL=llama3
```

**LM Studio:**
```env
LLM_PROVIDER=lmstudio
LLM_API_URL=http://127.0.0.1:1234/v1
LLM_MODEL=mistral-7b-instruct
```

**OpenRouter (Cloud — free tier):**
```env
LLM_PROVIDER=openrouter
LLM_API_URL=https://openrouter.ai/api/v1
LLM_MODEL=google/gemini-2.0-flash-exp:free
OPENROUTER_API_KEY=sk-or-...
```

**OpenAI-compatible (vLLM, custom):**
```env
LLM_PROVIDER=openai
LLM_API_URL=http://localhost:8000/v1
LLM_MODEL=your-model-name
```

---

## 🔄 Sprint 6 Preview

**Teacher Review Interface (SEAI-021 to SEAI-025):**
- Review list — all graded answer sheets with sort/filter
- Individual review interface — side-by-side original image + grades
- Grade override — teacher can adjust per-question marks with reason
- Bulk approve — approve multiple sheets in one action
- Challenge queue — teacher receives and resolves student grade challenges
