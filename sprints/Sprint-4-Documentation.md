# Sprint 4: OCR Integration & Async Processing

**Duration:** Week 7-8  
**Status:** ✅ Complete  
**Date Completed:** March 10, 2026

---

## 🎯 Sprint Goals

Implement OCR text extraction from answer sheet images/PDFs using configurable Vision models, with multi-page PDF support, per-page result storage, and Celery-based async processing.

### Objectives
- Build OCR service with multi-provider support (Ollama, OpenAI-compatible, LM Studio)
- Add PDF-to-image conversion for multi-page documents
- Store per-page OCR results in MongoDB
- Set up Celery + Redis async task processing
- Create grading API endpoints for OCR management
- Build grading service orchestrator
- Add OCR UI to ExamDetailsPage (Run OCR, View Text, Retry)
- Create LLM service placeholder for Sprint 5

---

## 📋 Completed Tasks

### 1. Dependencies Installation
- ✅ `celery==5.3.4` - Async task queue
- ✅ `redis==5.0.1` - Celery broker & result backend
- ✅ `requests==2.31.0` - HTTP calls to Vision APIs
- ✅ `Pillow==10.2.0` - Image handling
- ✅ `PyMuPDF==1.24.0` - PDF-to-image conversion
- ✅ `httpx==0.26.0` - Async HTTP client

### 2. OCR Service (SEAI-013)
**File:** `smart-eval-backend/services/ocr_service.py` (~240 lines)

**Three → Four Provider Abstraction:**

| Provider | Endpoint | Image Format | Config Value |
|---|---|---|---|
| `ollama` | `POST /api/chat` | `images[]` (base64 array) | `VISION_PROVIDER=ollama` |
| `openai` | `POST /v1/chat/completions` | `image_url` (data URL) | `VISION_PROVIDER=openai` |
| `lmstudio` | `POST /api/v1/chat` | `input[]` with `data_url` | `VISION_PROVIDER=lmstudio` |
| `openrouter` | `POST /chat/completions` | `image_url` (data URL) + API key | `VISION_PROVIDER=openrouter` |

**Features:**
- ✅ Provider-agnostic design via environment variables
- ✅ Four providers: Ollama, OpenAI-compatible, LM Studio, OpenRouter
- ✅ PDF-to-image conversion using PyMuPDF at 200 DPI
- ✅ Multi-page PDF support (each page processed individually)
- ✅ Per-page OCR results returned as list
- ✅ Supported file types: PNG, JPG, JPEG, PDF
- ✅ 10-minute timeout for slow machines
- ✅ `max_tokens: 7096` for OpenAI-compatible provider
- ✅ Error handling for connection failures, timeouts, unsupported files

**Public API:**
```python
# Returns list of per-page results
OCRService.extract_text(image_path) -> [
    {'page_number': 1, 'text': '...', 'confidence': 1.0, 'processed_at': datetime},
    {'page_number': 2, 'text': '...', 'confidence': 1.0, 'processed_at': datetime},
]

# Batch extraction across multiple files
OCRService.extract_text_from_multiple(image_paths) -> [...]
```

**PDF Conversion:**
```python
@staticmethod
def _pdf_to_images_b64(pdf_path: str) -> list:
    doc = fitz.open(pdf_path)
    pages = []
    for page in doc:
        pix = page.get_pixmap(dpi=200)
        img_bytes = pix.tobytes("png")
        b64 = base64.b64encode(img_bytes).decode("utf-8")
        pages.append((b64, "image/png"))
    doc.close()
    return pages
```

**LM Studio Native API Payload:**
```python
payload = {
    "model": model,
    "input": [
        {"type": "text", "content": "Extract all handwritten and printed text..."},
        {"type": "image", "data_url": f"data:{mime_type};base64,{image_b64}"}
    ],
    "temperature": 0,
    "stream": False
}
```

**Prompt Used:**
> "Extract all handwritten and printed text from this image accurately. Return only the extracted text, no commentary."

### 3. Grading Service Orchestrator (SEAI-014)
**File:** `smart-eval-backend/services/grading_service.py` (~109 lines)

**Features:**
- ✅ Single sheet processing with status tracking
- ✅ Batch processing for all exam sheets
- ✅ Per-page OCR result storage (separate `OCRResult` per page)
- ✅ Processing log entries (started → completed/failed)
- ✅ Automatic page count update on `original_file.pages`
- ✅ Re-processes failed sheets on retry

**Methods:**

| Method | Description |
|---|---|
| `process_answer_sheet(id)` | OCR single sheet → stores per-page results, updates status |
| `process_exam_sheets(exam_id)` | Processes all `uploaded` + `failed` sheets for an exam |

**Processing Flow:**
```
AnswerSheet (status: uploaded/failed)
    → status: processing
    → Resolve file path from original_file.url
    → OCRService.extract_text(abs_path)
    → Store OCRResult[] (one per page)
    → Update original_file.pages
    → status: ocr_completed
    (on error → status: failed)
```

### 4. LLM Service Placeholder (Sprint 5)
**File:** `smart-eval-backend/services/llm_service.py`

**Features:**
- ✅ Stub implementation for Sprint 5
- ✅ `grade_answer()` returns placeholder response
- ✅ Configurable via `LLM_PROVIDER`, `LLM_API_URL`, `LLM_MODEL`

```python
class LLMService:
    @staticmethod
    def grade_answer(extracted_text, model_answer, rubric=None):
        return {
            'score': 0.0,
            'feedback': 'Grading not yet implemented (Sprint 5).',
            'confidence': 0.0
        }
```

### 5. Celery + Redis Async Processing (SEAI-015)
**File:** `smart-eval-backend/tasks/celery_app.py` (~28 lines)

**Configuration:**
```python
celery = Celery('smart-eval')
celery.conf.update(
    broker_url=os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0'),
    result_backend=os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0'),
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    timezone='UTC',
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,  # One task at a time for GPU-heavy work
)
```

**File:** `smart-eval-backend/tasks/ocr_tasks.py` (~33 lines)

**Celery Tasks:**

| Task Name | Function | Description |
|---|---|---|
| `ocr.process_sheet` | `process_sheet_task(answer_sheet_id)` | Process single sheet async |
| `ocr.process_exam` | `process_exam_task(exam_id)` | Process all exam sheets async |

- Both tasks create Flask app context for database access
- Start worker: `celery -A tasks.celery_app.celery worker --loglevel=info --pool=solo`

**Note:** Sync mode (default) works without Redis. Async mode (`?async=true`) requires Redis running on `localhost:6379`.

### 6. Grading API Endpoints (SEAI-016)
**File:** `smart-eval-backend/api/v1/grading/routes.py` (~170 lines)

**5 New Endpoints:**

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/grading/exams/:id/process` | POST | Teacher | Trigger OCR for all pending sheets |
| `/api/v1/grading/sheets/:id/process` | POST | Teacher | Trigger OCR for single sheet |
| `/api/v1/grading/exams/:id/sheets` | GET | Teacher | List answer sheets with filters |
| `/api/v1/grading/sheets/:id` | GET | Teacher | Get sheet detail with OCR results |
| `/api/v1/grading/tasks/:id` | GET | Teacher | Check async Celery task status |

**Query Parameters:**

| Endpoint | Param | Description |
|---|---|---|
| `*/process` | `?async=true` | Offload to Celery (requires Redis) |
| `*/sheets` | `?status=uploaded` | Filter by status |
| `*/sheets` | `?include_ocr=true` | Include OCR text in response |

**Response Examples:**

```json
// POST /api/v1/grading/exams/:id/process (sync)
{
  "data": {
    "exam_id": "69a97a0be4a062db1ed25a92",
    "total": 1,
    "processed": 1,
    "failed": 0,
    "results": [
      {
        "answer_sheet_id": "69aff3b628852b82cad4df55",
        "status": "ocr_completed",
        "pages": 3,
        "text_length": 4521
      }
    ]
  },
  "message": "OCR processing complete"
}
```

**Blueprint Registration:**
```python
# api/v1/__init__.py
from api.v1.grading import grading_bp
api_v1.register_blueprint(grading_bp)
```

### 7. AnswerSheet Model Enhancement (SEAI-017)
**File:** `smart-eval-backend/models/answer_sheet.py` (~130 lines)

**Embedded Documents:**

```python
class OriginalFile(EmbeddedDocument):
    url = StringField(required=True)
    pages = IntField(default=1)
    uploaded_at = DateTimeField(default=datetime.utcnow)

class OCRResult(EmbeddedDocument):
    page_number = IntField(required=True)
    text = StringField(default='')
    confidence = FloatField(default=0.0)
    processed_at = DateTimeField()

class ProcessingLog(EmbeddedDocument):
    stage = StringField(required=True)       # 'ocr', 'grading', etc.
    status = StringField(required=True)      # 'started', 'completed', 'failed'
    timestamp = DateTimeField(default=datetime.utcnow)
    details = DictField()
```

**Status Choices (Updated):**
```python
status = StringField(
    choices=['uploaded', 'processing', 'ocr_completed', 'graded', 'reviewed', 'challenged', 'failed'],
    default='uploaded'
)
```

**New Statuses Added:**
- `ocr_completed` - OCR finished, text extracted
- `failed` - OCR or processing error

**Indexes:**
```python
meta = {
    'indexes': ['exam_id', 'student_id', 'status', '-created_at',
                {'fields': ['exam_id', 'student_id'], 'unique': False}]
}
```

### 8. Bulk Upload Enhancement
**File:** `smart-eval-backend/api/v1/exams/routes.py` (lines 280-360)

**Enhancement:** Bulk upload now creates proper `AnswerSheet` MongoDB documents.

```python
# For each uploaded file:
sheet_doc = AnswerSheetDoc(
    exam_id=exam,
    student_id=exam.teacher_id,  # placeholder until student accounts
    original_file=OriginalFile(
        url=file_info['file_url'],
        pages=1,
        uploaded_at=datetime.utcnow()
    ),
    status='uploaded'
)
sheet_doc.save()
```

### 9. Environment Configuration (SEAI-018)
**File:** `smart-eval-backend/.env`

**New Variables:**
```env
# Redis (Required for Celery async processing)
REDIS_URL=redis://localhost:6379/0

# Celery (Async processing)
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# AI Vision Model (OCR - extracts text from answer sheet images)
# VISION_PROVIDER: "ollama", "openai", or "lmstudio"
VISION_PROVIDER=lmstudio
VISION_API_URL=http://127.0.0.1:1234
VISION_MODEL=lightonocr-2-1b-ocr-soup

# AI LLM Model (Grading - Sprint 5)
# LLM_PROVIDER: "ollama", "openai", "lmstudio", or "openrouter"
LLM_PROVIDER=ollama
LLM_API_URL=http://localhost:11434/api/chat
LLM_MODEL=llama3

# OpenRouter (cloud API - free tier available)
# Get your key from: https://openrouter.ai/keys
OPENROUTER_API_KEY=
```

### 10. Frontend Grading Service (SEAI-019)
**File:** `smart-eval-frontend/src/services/gradingService.ts` (~88 lines)

**TypeScript Interfaces:**
```typescript
interface AnswerSheet {
  id: string;
  exam_id: string;
  student_id: string;
  status: string;
  original_file: { url: string; pages: number; uploaded_at: string };
  ocr_results?: Array<{
    page_number: number;
    text: string;
    confidence: number;
    processed_at: string;
  }>;
  processing_log: Array<{
    stage: string;
    status: string;
    timestamp: string;
    details?: any;
  }>;
  created_at: string;
  updated_at: string;
}

interface ProcessingResult {
  exam_id: string;
  total: number;
  processed: number;
  failed: number;
  results: any[];
}

interface TaskStatus {
  task_id: string;
  status: 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE';
  result?: any;
}
```

**API Methods:**

| Method | Endpoint | Description |
|---|---|---|
| `startOCRProcessing(examId, useAsync)` | POST `…/exams/:id/process` | Trigger OCR for exam |
| `processSheet(sheetId, useAsync)` | POST `…/sheets/:id/process` | Process single sheet |
| `getAnswerSheets(examId, params?)` | GET `…/exams/:id/sheets` | List sheets with filters |
| `getAnswerSheet(sheetId)` | GET `…/sheets/:id` | Get sheet with OCR results |
| `getTaskStatus(taskId)` | GET `…/tasks/:id` | Check async task status |

### 11. ExamDetailsPage OCR UI (SEAI-020)
**File:** `smart-eval-frontend/src/pages/teacher/ExamDetailsPage.tsx` (~608 lines)

**New State:**
```typescript
const [answerSheets, setAnswerSheets] = useState<AnswerSheet[]>([]);
const [isProcessingOCR, setIsProcessingOCR] = useState(false);
const [ocrMessage, setOcrMessage] = useState<string | null>(null);
const [selectedSheet, setSelectedSheet] = useState<AnswerSheet | null>(null);
```

**New Functions:**
- `loadAnswerSheets()` - Fetches sheets from grading API on mount
- `handleRunOCR()` - Triggers bulk OCR processing, shows results summary
- `handleProcessSingleSheet(sheetId)` - Single sheet OCR trigger
- `handleViewOCR(sheetId)` - Fetches sheet with OCR text, opens modal
- `getSheetStatusColor(status)` - Returns color class for status badge

**Answer Sheets Table:**

| Column | Content |
|---|---|
| # | Row number |
| File | Original filename (truncated) |
| Status | Color-coded badge |
| Uploaded | Formatted date |
| Actions | Run OCR / View Text / Retry |

**Status Badge Colors:**

| Status | Color |
|---|---|
| `uploaded` | Gray |
| `processing` | Yellow |
| `ocr_completed` | Blue |
| `graded` | Green |
| `reviewed` | Purple |
| `failed` | Red |

**Action Buttons per Row:**

| Sheet Status | Button | Action |
|---|---|---|
| `uploaded` | "Run OCR" (blue) | Trigger OCR |
| `ocr_completed` | "View Text" (blue link) | Open OCR results modal |
| `failed` | "Retry" (orange link) | Re-trigger OCR |

**OCR Result Viewer Modal:**
- Full-screen overlay with backdrop
- Per-page OCR text display
- Page number headers
- Confidence percentage per page
- Monospace `<pre>` text block
- Close button

**Bulk "Run OCR" Button:**
- Green button in Answer Sheets header
- Spinner during processing
- Disabled while processing
- Success/failure summary banner

---

## 🐛 Bugs Fixed

### 1. LM Studio Endpoint Mismatch (Round 1)
**Issue:** `POST /responses/chat/completions` — "Unexpected endpoint"

**Root Cause:** `VISION_PROVIDER` was incorrectly set to `LM_STUDIO_VISION_URL` (an invalid value), causing fallback to `ollama` provider which appended wrong path segments.

**Fix:** Set `VISION_PROVIDER=openai` and `VISION_API_URL=http://127.0.0.1:1234/v1`

### 2. LM Studio Endpoint Mismatch (Round 2)
**Issue:** Still hitting `POST /responses/chat/completions` — wrong path construction

**Root Cause:** OpenAI provider URL path construction produced incorrect endpoint for LM Studio.

**Fix:** Added dedicated `lmstudio` provider using native `/api/v1/chat` endpoint with `input[]` array format.

### 3. LM Studio `max_tokens` Rejection
**Issue:** `"Unrecognized key(s) in object: 'max_tokens'"` from LM Studio native API

**Root Cause:** LM Studio's native `/api/v1/chat` endpoint does not accept `max_tokens` parameter.

**Fix:** Removed `max_tokens` from `_call_lmstudio()` payload. Kept it only in `_call_openai()`.

### 4. PDF Sent as Raw Base64 to Vision Model
**Issue:** `"Invalid base64-encoded image data in input.data_url"` from LM Studio

**Root Cause:** PDF files were being sent as `data:application/pdf;base64,...` directly to the vision model. Vision models expect actual image data (PNG/JPEG), not raw PDF bytes.

**Fix:** Added PDF-to-image conversion using PyMuPDF:
```python
import fitz  # PyMuPDF

def _pdf_to_images_b64(pdf_path):
    doc = fitz.open(pdf_path)
    for page in doc:
        pix = page.get_pixmap(dpi=200)
        img_bytes = pix.tobytes("png")
        # base64 encode and send as image/png
```

### 5. Bulk "Run OCR" Skipped Failed Sheets
**Issue:** "OCR complete: 0 processed, 0 failed out of 0" — despite having 1 sheet

**Root Cause:** `process_exam_sheets()` queried only `status='uploaded'`, but the sheet had already been marked `'failed'` from a previous attempt.

**Fix:** Changed query to include both statuses:
```python
# BEFORE
sheets = AnswerSheet.objects(exam_id=exam, status='uploaded')

# AFTER
sheets = AnswerSheet.objects(exam_id=exam, status__in=['uploaded', 'failed'])
```

### 6. Python Virtual Environment Broken
**Issue:** `python` command not found in backend venv

**Root Cause:** `pyvenv.cfg` pointed to uninstalled Windows Store Python path instead of installed Python 3.13.

**Fix:** Updated `env/pyvenv.cfg`:
```
home = C:\Users\Asus\AppData\Local\Programs\Python\Python313
```

---

## 🔑 Key Features Implemented

### OCR Pipeline
- **Multi-provider Vision model** support (Ollama, OpenAI-compatible, LM Studio, OpenRouter)
- **PDF-to-image conversion** at 200 DPI via PyMuPDF
- **Multi-page processing** — each page OCR'd individually
- **Per-page result storage** in MongoDB (`ocr_results[]`)
- **10-minute timeout** for slow GPU processing
- **Configurable via `.env`** — swap providers without code changes

### Async Processing
- **Celery + Redis** task queue for background OCR
- **Sync mode by default** — works without Redis during development
- **`?async=true`** query param to enable async
- **Task status polling** via dedicated endpoint
- **Single-worker prefetch** for GPU-heavy workloads

### Grading API
- **5 RESTful endpoints** for OCR management
- **JWT + role-based auth** on all endpoints
- **Ownership verification** through exam teacher check
- **Status filtering** and OCR text inclusion in responses
- **Bulk and single-sheet** processing

### OCR Frontend UI
- **Answer Sheets table** with status badges
- **Bulk "Run OCR"** button with loading spinner
- **Per-sheet actions** (Run OCR, View Text, Retry)
- **OCR result viewer modal** with per-page text display
- **Success/failure summary** banner after processing

---

## 📊 Code Statistics

### Backend
**New Files:** 8
- `services/ocr_service.py` - ~240 lines
- `services/grading_service.py` - ~109 lines
- `services/llm_service.py` - ~25 lines (placeholder)
- `api/v1/grading/routes.py` - ~170 lines
- `api/v1/grading/schemas.py` - ~5 lines (placeholder)
- `api/v1/grading/__init__.py` - ~3 lines
- `tasks/celery_app.py` - ~28 lines
- `tasks/ocr_tasks.py` - ~33 lines

**Modified Files:**
- `app/config.py` - Added 6 AI config keys
- `models/answer_sheet.py` - Added `ocr_completed`, `failed` statuses
- `api/v1/exams/routes.py` - Bulk upload creates AnswerSheet documents
- `api/v1/__init__.py` - Registered grading blueprint
- `requirements.txt` - Added 5 new packages
- `.env` / `.env.example` - Added Vision/LLM/Celery config

**Total New Backend Code:** ~613 lines

### Frontend
**New Files:** 1
- `services/gradingService.ts` - ~88 lines

**Modified Files:**
- `pages/teacher/ExamDetailsPage.tsx` - Added ~228 lines (OCR UI)

**Total New Frontend Code:** ~316 lines

### Dependencies
**Backend:** 5 new packages
- celery (5.3.4)
- redis (5.0.1)
- requests (2.31.0)
- Pillow (10.2.0)
- PyMuPDF (1.24.0)

---

## 🏗️ Architecture

### OCR Pipeline Architecture
```
[Answer Sheet PDF/Image]
        │
        ▼
[PyMuPDF: PDF → PNG per page]  (skip if already image)
        │
        ▼
[Base64 Encode each page]
        │
        ▼
[Provider Dispatch]
   ├── ollama:    POST /api/chat          (images[] field)
   ├── openai:      POST /v1/chat/completions (image_url)
   ├── openrouter:   POST /chat/completions    (image_url + API key)
   └── lmstudio:     POST /api/v1/chat          (input[] with data_url)
        │
        ▼
[Per-page OCR text response]
        │
        ▼
[Store OCRResult[] on AnswerSheet document]
   └── page_number, text, confidence, processed_at
```

### Async Processing Architecture
```
[Frontend: Click "Run OCR"]
        │
        ▼
[POST /api/v1/grading/exams/:id/process]
        │
   ┌────┴────┐
   │ Sync    │ Async (?async=true)
   │ (default)│
   ▼         ▼
[GradingService.  [Celery Task]
 process_exam_     │
 sheets()]         ▼
   │          [Redis Queue]
   │               │
   ▼               ▼
[OCRService.  [Worker picks up]
 extract_text()]   │
   │               ▼
   ▼          [GradingService.
[Return       process_exam_
 results]     sheets()]
                   │
                   ▼
              [Poll GET /tasks/:id]
```

### Data Model
```
AnswerSheet
├── exam_id → Exam
├── student_id → User
├── original_file
│   ├── url: "/uploads/exams/.../file.pdf"
│   ├── pages: 3
│   └── uploaded_at: Date
├── ocr_results[]
│   ├── [0] { page_number: 1, text: "...", confidence: 1.0, processed_at: Date }
│   ├── [1] { page_number: 2, text: "...", confidence: 1.0, processed_at: Date }
│   └── [2] { page_number: 3, text: "...", confidence: 1.0, processed_at: Date }
├── status: "uploaded" → "processing" → "ocr_completed" → "graded" → ...
├── processing_log[]
│   ├── { stage: "ocr", status: "started", timestamp: Date }
│   └── { stage: "ocr", status: "completed", timestamp: Date, details: {pages: 3, total_characters: 4521} }
└── timestamps (created_at, updated_at)
```

---

## 🧪 Testing Results

### OCR Processing Test
- **Model:** `lightonocr-2-1b-ocr-soup` (LM Studio)
- **Input:** Multi-page PDF (university result document)
- **Provider:** `lmstudio` (native API)
- **Result:** ✅ Text extracted successfully
  - Prompt processing: ~70s
  - Token generation: ~214s (8.81 tokens/sec)
  - Total: ~284s for 1 page
  - Output: 1,884 tokens of structured text + HTML

### LM Studio Performance
- **Machine:** Laptop with RTX 4050 (6GB VRAM)
- **Image encoding:** ~57s
- **Image decoding:** ~12s
- **Total prompt processing:** ~70s per page
- **Generation speed:** ~8.81 tokens/sec

---

## 📝 Configuration Guide

### LM Studio Setup
1. Download and install LM Studio
2. Load a vision model (e.g., `lightonocr-2-1b-ocr-soup`)
3. Start the server (default port 1234)
4. Set in `.env`:
   ```env
   VISION_PROVIDER=lmstudio
   VISION_API_URL=http://127.0.0.1:1234
   VISION_MODEL=lightonocr-2-1b-ocr-soup
   ```

### OpenRouter Setup (Cloud)
1. Sign up at [openrouter.ai](https://openrouter.ai) (free tier available)
2. Create an API key at https://openrouter.ai/keys
3. Set in `.env`:
   ```env
   VISION_PROVIDER=openrouter
   VISION_API_URL=https://openrouter.ai/api/v1
   VISION_MODEL=google/gemini-2.0-flash-exp:free
   OPENROUTER_API_KEY=sk-or-...
   ```

### Ollama Setup
1. Install Ollama
2. Pull a vision model: `ollama pull llava`
3. Start server: `OLLAMA_HOST=0.0.0.0:11434 ollama serve`
4. Set in `.env`:
   ```env
   VISION_PROVIDER=ollama
   VISION_API_URL=http://localhost:11434/api/chat
   VISION_MODEL=llava
   ```

### Redis + Celery Setup (Optional)
1. Install Redis: `redis-server` on port 6379
2. Start Celery worker:
   ```bash
   celery -A tasks.celery_app.celery worker --loglevel=info --pool=solo
   ```
3. Use `?async=true` on process endpoints

---

## 🔄 Sprint 5 Preview

**LLM Grading Engine:**
- Replace `llm_service.py` placeholder with actual grading logic
- Prompt engineering for answer evaluation
- Rubric-based scoring
- Feedback generation
- Confidence scoring
- Grade review interface
