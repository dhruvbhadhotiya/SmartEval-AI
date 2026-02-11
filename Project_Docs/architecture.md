# Smart-Eval AI - Architecture Document

**Version:** 1.1  
**Status:** In Progress  
**Author:** Team Smart-Eval  
**Last Updated:** February 2026

---

## 1. Architecture Overview

### 1.1 System Context Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL SYSTEMS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ Local Vision│    │  Local LLM  │    │  University │    │    Email    │  │
│  │ (LM Studio) │    │ (LM Studio) │    │  Data API   │    │   Service   │  │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘  │
│         │                  │                  │                  │         │
└─────────┼──────────────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │                  │
          └──────────────────┼──────────────────┼──────────────────┘
                             │                  │
                             ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SMART-EVAL AI SYSTEM                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         PRESENTATION LAYER                             │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │  │
│  │  │ Teacher Portal  │  │ Student Portal  │  │  Admin Portal   │        │  │
│  │  │   (React.js)    │  │   (React.js)    │  │   (React.js)    │        │  │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘        │  │
│  └───────────┼────────────────────┼────────────────────┼─────────────────┘  │
│              └────────────────────┼────────────────────┘                    │
│                                   ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                          API GATEWAY LAYER                             │  │
│  │                         (Flask + Nginx)                                │  │
│  └───────────────────────────────┬───────────────────────────────────────┘  │
│                                  │                                          │
│  ┌───────────────────────────────┼───────────────────────────────────────┐  │
│  │                         SERVICE LAYER                                  │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │  │
│  │  │     Auth     │  │    Exam      │  │   Grading    │  │  Student   │ │  │
│  │  │   Service    │  │   Service    │  │   Service    │  │  Service   │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │  Challenge   │  │ Notification │  │   Analytics  │                 │  │
│  │  │   Service    │  │   Service    │  │   Service    │                 │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                  │                                          │
│  ┌───────────────────────────────┼───────────────────────────────────────┐  │
│  │                       AI PROCESSING LAYER                              │  │
│  │  ┌──────────────────────┐  ┌──────────────────────┐                   │  │
│  │  │    OCR Processor     │  │   LLM Grading Engine │                   │  │
│  │  │  (Local Vision /     │  │  (Local LLM via      │                   │  │
│  │  │    LM Studio)        │  │     LM Studio)       │                   │  │
│  │  └──────────────────────┘  └──────────────────────┘                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                  │                                          │
│  ┌───────────────────────────────┼───────────────────────────────────────┐  │
│  │                         DATA LAYER                                     │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │   MongoDB    │  │    Redis     │  │     S3 /     │                 │  │
│  │  │  (Primary)   │  │   (Cache)    │  │    MinIO     │                 │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Frontend** | React.js 18 | Modern, component-based, large ecosystem |
| **State Management** | Redux Toolkit | Predictable state, dev tools |
| **UI Framework** | Tailwind CSS | Rapid styling, design system friendly |
| **Backend** | Flask (Python 3.11) | AI library integration, simplicity |
| **API Style** | REST | Simplicity for MVP, well understood |
| **Database** | MongoDB 7.0 | Flexible schema for variable content |
| **Cache** | Redis 7.0 | Session management, API caching |
| **File Storage** | MinIO / AWS S3 | Scalable object storage |
| **OCR** | Local Vision (LM Studio) | Data privacy, no API costs |
| **OCR Fallback** | Tesseract 5.0 | Open source, no API costs |
| **LLM** | Local LLM (LM Studio) | Privacy, offline capability |
| **Task Queue** | Celery + Redis | Async processing for AI tasks |
| **Web Server** | Nginx | Reverse proxy, static files |
| **Containerization** | Docker | Consistent environments |
| **Orchestration** | Docker Compose | MVP deployment simplicity |

---

## 2. Component Architecture

### 2.1 Frontend Architecture

```
src/
├── app/
│   ├── store.js              # Redux store configuration
│   └── rootReducer.js        # Combined reducers
├── components/
│   ├── common/               # Shared components
│   │   ├── Button/
│   │   ├── Card/
│   │   ├── Input/
│   │   ├── Modal/
│   │   └── Table/
│   ├── teacher/              # Teacher-specific components
│   │   ├── ExamCard/
│   │   ├── GradingPanel/
│   │   ├── ParameterSlider/
│   │   └── ReviewInterface/
│   └── student/              # Student-specific components
│       ├── ResultCard/
│       ├── FeedbackView/
│       └── ChallengeForm/
├── features/                 # Redux slices by feature
│   ├── auth/
│   │   ├── authSlice.js
│   │   └── authAPI.js
│   ├── exams/
│   │   ├── examsSlice.js
│   │   └── examsAPI.js
│   ├── grading/
│   │   ├── gradingSlice.js
│   │   └── gradingAPI.js
│   └── results/
│       ├── resultsSlice.js
│       └── resultsAPI.js
├── hooks/                    # Custom React hooks
│   ├── useAuth.js
│   ├── useExam.js
│   └── useGrading.js
├── pages/                    # Route pages
│   ├── teacher/
│   │   ├── Dashboard.jsx
│   │   ├── ExamSetup.jsx
│   │   ├── GradingReview.jsx
│   │   └── ChallengeQueue.jsx
│   └── student/
│       ├── Dashboard.jsx
│       ├── ResultDetail.jsx
│       └── ChallengeSubmit.jsx
├── services/                 # API client services
│   ├── api.js               # Axios instance
│   ├── authService.js
│   ├── examService.js
│   └── gradingService.js
├── utils/                    # Utilities
│   ├── constants.js
│   ├── formatters.js
│   └── validators.js
└── App.jsx                   # Main app component
```

### 2.2 Backend Architecture

```
smart_eval_api/
├── app/
│   ├── __init__.py           # Flask app factory
│   ├── config.py             # Configuration classes
│   └── extensions.py         # Flask extensions init
├── api/
│   ├── __init__.py
│   ├── v1/
│   │   ├── __init__.py       # Blueprint registration
│   │   ├── auth/
│   │   │   ├── __init__.py
│   │   │   ├── routes.py     # Auth endpoints
│   │   │   └── schemas.py    # Request/response schemas
│   │   ├── exams/
│   │   │   ├── __init__.py
│   │   │   ├── routes.py
│   │   │   └── schemas.py
│   │   ├── grading/
│   │   │   ├── __init__.py
│   │   │   ├── routes.py
│   │   │   └── schemas.py
│   │   ├── students/
│   │   │   ├── __init__.py
│   │   │   ├── routes.py
│   │   │   └── schemas.py
│   │   └── challenges/
│   │       ├── __init__.py
│   │       ├── routes.py
│   │       └── schemas.py
├── services/
│   ├── __init__.py
│   ├── auth_service.py       # Authentication logic
│   ├── exam_service.py       # Exam management
│   ├── grading_service.py    # Grading orchestration
│   ├── ocr_service.py        # OCR processing
│   ├── llm_service.py        # LLM integration
│   ├── storage_service.py    # File storage
│   └── notification_service.py
├── models/
│   ├── __init__.py
│   ├── user.py               # User model
│   ├── exam.py               # Exam model
│   ├── answer_sheet.py       # Answer sheet model
│   ├── evaluation.py         # Evaluation results
│   └── challenge.py          # Challenge model
├── tasks/
│   ├── __init__.py
│   ├── celery_app.py         # Celery configuration
│   ├── ocr_tasks.py          # OCR processing tasks
│   └── grading_tasks.py      # Grading tasks
├── utils/
│   ├── __init__.py
│   ├── decorators.py         # Custom decorators
│   ├── exceptions.py         # Custom exceptions
│   └── helpers.py            # Utility functions
├── tests/
│   ├── __init__.py
│   ├── conftest.py           # Pytest fixtures
│   ├── unit/
│   └── integration/
├── migrations/               # Database migrations
├── requirements.txt
├── Dockerfile
└── wsgi.py                   # WSGI entry point
```

---

## 3. Data Architecture

### 3.1 Database Schema (MongoDB)

#### Users Collection
```javascript
{
  _id: ObjectId,
  email: String,                    // unique, indexed
  password_hash: String,
  role: String,                     // "teacher" | "student" | "admin"
  profile: {
    name: String,
    department: String,
    employee_id: String,            // for teachers
    roll_number: String,            // for students
    avatar_url: String
  },
  settings: {
    notifications: {
      email: Boolean,
      in_app: Boolean
    },
    default_strictness: String      // teachers only
  },
  created_at: Date,
  updated_at: Date,
  last_login: Date
}
```

#### Exams Collection
```javascript
{
  _id: ObjectId,
  teacher_id: ObjectId,             // ref: users
  title: String,
  subject: String,
  exam_date: Date,
  status: String,                   // "draft" | "configuring" | "grading" | "reviewing" | "published"
  
  question_paper: {
    file_url: String,
    uploaded_at: Date
  },
  
  model_answer: {
    file_url: String,
    parsed_answers: [{
      question_number: Number,
      max_marks: Number,
      answer_text: String,
      keywords: [String],
      concepts: [String]
    }]
  },
  
  grading_config: {
    strictness: String,             // "lenient" | "moderate" | "strict"
    holistic_params: {
      attendance: {
        enabled: Boolean,
        weight: Number,             // 0-20
        threshold: Number,          // percentage
        direction: String           // "higher" | "lower"
      },
      discipline: {
        enabled: Boolean,
        weight: Number
      }
    },
    keyword_mode: String            // "exact" | "synonyms"
  },
  
  statistics: {
    total_sheets: Number,
    graded: Number,
    reviewed: Number,
    average_score: Number,
    highest_score: Number,
    lowest_score: Number
  },
  
  created_at: Date,
  updated_at: Date,
  published_at: Date
}
```

#### AnswerSheets Collection
```javascript
{
  _id: ObjectId,
  exam_id: ObjectId,                // ref: exams
  student_id: ObjectId,             // ref: users
  
  original_file: {
    url: String,
    pages: Number,
    uploaded_at: Date
  },
  
  ocr_results: [{
    page_number: Number,
    text: String,
    confidence: Number,
    processed_at: Date
  }],
  
  status: String,                   // "uploaded" | "processing" | "graded" | "reviewed" | "challenged"
  
  processing_log: [{
    stage: String,
    status: String,
    timestamp: Date,
    details: Object
  }],
  
  created_at: Date,
  updated_at: Date
}
```

#### Evaluations Collection
```javascript
{
  _id: ObjectId,
  answer_sheet_id: ObjectId,        // ref: answer_sheets
  exam_id: ObjectId,                // ref: exams
  student_id: ObjectId,             // ref: users
  
  question_evaluations: [{
    question_number: Number,
    max_marks: Number,
    
    ai_evaluation: {
      score: Number,
      confidence: Number,
      breakdown: {
        keyword_match: Number,
        concept_coverage: Number,
        logic_flow: Number
      },
      feedback: String,
      evaluated_at: Date
    },
    
    holistic_adjustment: {
      applied: Boolean,
      reason: String,
      adjustment: Number
    },
    
    final_score: Number,
    final_feedback: String,
    
    override: {
      applied: Boolean,
      original_score: Number,
      new_score: Number,
      reason: String,
      overridden_by: ObjectId,
      overridden_at: Date
    }
  }],
  
  total_score: Number,
  max_total: Number,
  percentage: Number,
  grade: String,
  
  reviewed_by: ObjectId,
  reviewed_at: Date,
  
  created_at: Date,
  updated_at: Date
}
```

#### Challenges Collection
```javascript
{
  _id: ObjectId,
  evaluation_id: ObjectId,          // ref: evaluations
  student_id: ObjectId,             // ref: users
  exam_id: ObjectId,                // ref: exams
  
  challenged_questions: [{
    question_number: Number,
    original_score: Number,
    student_justification: String
  }],
  
  status: String,                   // "pending" | "under_review" | "accepted" | "rejected"
  
  resolution: {
    resolved_by: ObjectId,
    resolved_at: Date,
    decision: String,
    comments: String,
    score_changes: [{
      question_number: Number,
      old_score: Number,
      new_score: Number
    }]
  },
  
  created_at: Date,
  updated_at: Date
}
```

### 3.2 Indexing Strategy

```javascript
// Users
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "profile.roll_number": 1 })
db.users.createIndex({ "role": 1 })

// Exams
db.exams.createIndex({ "teacher_id": 1, "status": 1 })
db.exams.createIndex({ "created_at": -1 })

// Answer Sheets
db.answer_sheets.createIndex({ "exam_id": 1, "student_id": 1 })
db.answer_sheets.createIndex({ "status": 1 })

// Evaluations
db.evaluations.createIndex({ "exam_id": 1 })
db.evaluations.createIndex({ "student_id": 1 })
db.evaluations.createIndex({ "exam_id": 1, "student_id": 1 }, { unique: true })

// Challenges
db.challenges.createIndex({ "exam_id": 1, "status": 1 })
db.challenges.createIndex({ "student_id": 1 })
```

---

## 4. API Design

### 4.1 API Endpoints

#### Authentication
```
POST   /api/v1/auth/register          # Register new user
POST   /api/v1/auth/login             # Login
POST   /api/v1/auth/logout            # Logout
POST   /api/v1/auth/refresh           # Refresh token
POST   /api/v1/auth/password/reset    # Request password reset
PUT    /api/v1/auth/password/reset    # Complete password reset
```

#### Exams (Teacher)
```
GET    /api/v1/exams                  # List teacher's exams
POST   /api/v1/exams                  # Create new exam
GET    /api/v1/exams/:id              # Get exam details
PUT    /api/v1/exams/:id              # Update exam
DELETE /api/v1/exams/:id              # Delete exam

POST   /api/v1/exams/:id/question-paper    # Upload question paper
POST   /api/v1/exams/:id/model-answer      # Upload model answer
PUT    /api/v1/exams/:id/config            # Update grading config

POST   /api/v1/exams/:id/answer-sheets     # Bulk upload answer sheets
GET    /api/v1/exams/:id/answer-sheets     # List answer sheets
GET    /api/v1/exams/:id/statistics        # Get exam statistics

POST   /api/v1/exams/:id/process           # Start AI processing
POST   /api/v1/exams/:id/publish           # Publish results
```

#### Grading (Teacher)
```
GET    /api/v1/grading/exams/:examId/sheets              # List sheets for review
GET    /api/v1/grading/sheets/:sheetId                   # Get sheet evaluation
PUT    /api/v1/grading/sheets/:sheetId/questions/:qNum   # Override question grade
POST   /api/v1/grading/sheets/:sheetId/approve           # Approve sheet
POST   /api/v1/grading/exams/:examId/approve-all         # Bulk approve
```

#### Results (Student)
```
GET    /api/v1/results                     # List student's results
GET    /api/v1/results/:examId             # Get detailed result
GET    /api/v1/results/:examId/download    # Download PDF report
```

#### Challenges
```
POST   /api/v1/challenges                  # Submit challenge (student)
GET    /api/v1/challenges                  # List challenges (filtered by role)
GET    /api/v1/challenges/:id              # Get challenge details
PUT    /api/v1/challenges/:id/resolve      # Resolve challenge (teacher)
```

### 4.2 Request/Response Examples

#### Create Exam
```http
POST /api/v1/exams
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "DSA Mid-Term Examination",
  "subject": "Data Structures & Algorithms",
  "exam_date": "2026-01-15"
}

Response: 201 Created
{
  "id": "65a1b2c3d4e5f6789012abcd",
  "title": "DSA Mid-Term Examination",
  "subject": "Data Structures & Algorithms",
  "exam_date": "2026-01-15",
  "status": "draft",
  "created_at": "2026-01-10T10:30:00Z"
}
```

#### Get Evaluation Result
```http
GET /api/v1/results/65a1b2c3d4e5f6789012abcd
Authorization: Bearer <token>

Response: 200 OK
{
  "exam": {
    "id": "65a1b2c3d4e5f6789012abcd",
    "title": "DSA Mid-Term Examination",
    "date": "2026-01-15"
  },
  "student": {
    "name": "Rahul Kumar",
    "roll_number": "CS2022034"
  },
  "total_score": 72,
  "max_score": 100,
  "percentage": 72.0,
  "grade": "B+",
  "questions": [
    {
      "number": 1,
      "title": "Explain Binary Search Tree",
      "max_marks": 20,
      "score": 15,
      "feedback": "Good understanding of BST structure. Missing O(log n) complexity analysis.",
      "breakdown": {
        "definition": { "score": 5, "max": 5 },
        "properties": { "score": 4, "max": 5 },
        "complexity": { "score": 0, "max": 5 },
        "example": { "score": 4, "max": 5 }
      },
      "holistic_adjustment": {
        "applied": true,
        "adjustment": 2,
        "reason": "Attendance > 85%"
      },
      "can_challenge": true
    }
  ]
}
```

---

## 5. AI Processing Pipeline

### 5.1 OCR Pipeline

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Image     │───►│   Pre-      │───►│    OCR      │───►│   Post-     │
│   Input     │    │  Processing │    │  Engine     │    │  Processing │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                         │                  │                   │
                         ▼                  ▼                   ▼
                   ┌───────────┐      ┌───────────┐      ┌───────────┐
                   │• Deskew   │      │• Google   │      │• Spell    │
                   │• Denoise  │      │  Vision   │      │  Check    │
                   │• Contrast │      │  OR       │      │• Format   │
                   │• Binarize │      │• Tesseract│      │• Segment  │
                   └───────────┘      └───────────┘      └───────────┘
```

### 5.2 Grading Pipeline

```python
# Pseudocode for grading flow
async def grade_answer(student_answer: str, model_answer: dict, config: dict) -> dict:
    
    # Step 1: Extract components
    keywords_found = extract_keywords(student_answer, model_answer['keywords'])
    concepts_covered = identify_concepts(student_answer, model_answer['concepts'])
    
    # Step 2: LLM semantic analysis
    llm_response = await llm_service.analyze(
        prompt=f"""
        Model Answer: {model_answer['text']}
        Student Answer: {student_answer}
        
        Evaluate based on:
        1. Keyword presence (list: {model_answer['keywords']})
        2. Concept coverage (list: {model_answer['concepts']})
        3. Logic flow and reasoning
        4. Completeness
        
        Strictness: {config['strictness']}
        
        Return JSON with scores and justification.
        """,
        response_format="json"
    )
    
    # Step 3: Calculate base score
    base_score = calculate_score(llm_response, model_answer['max_marks'])
    
    # Step 4: Apply holistic adjustments
    if config['holistic_params']['attendance']['enabled']:
        attendance = await get_student_attendance(student_id)
        if is_borderline(base_score) and attendance > config['holistic_params']['attendance']['threshold']:
            adjustment = calculate_adjustment(base_score, config)
            base_score += adjustment
    
    # Step 5: Generate feedback
    feedback = generate_feedback(llm_response, config['strictness'])
    
    return {
        'score': base_score,
        'confidence': llm_response['confidence'],
        'feedback': feedback,
        'breakdown': llm_response['breakdown']
    }
```

### 5.3 LLM Prompt Engineering

```python
GRADING_SYSTEM_PROMPT = """
You are an expert academic evaluator for engineering examinations.

Your task is to evaluate student answers against model answers with these criteria:
1. Technical accuracy - Are facts and concepts correct?
2. Completeness - Are all required points covered?
3. Clarity - Is the explanation clear and logical?
4. Keywords - Are technical terms used correctly?

Strictness Levels:
- LENIENT: Focus on core concepts. Accept reasonable synonyms. Partial credit for attempts.
- MODERATE: Balance accuracy and understanding. Minor errors acceptable.
- STRICT: Exact technical accuracy required. All points must be covered.

Output Format (JSON):
{
  "score_percentage": 0-100,
  "confidence": 0-1,
  "breakdown": {
    "accuracy": {"score": X, "max": 25, "notes": "..."},
    "completeness": {"score": X, "max": 25, "notes": "..."},
    "clarity": {"score": X, "max": 25, "notes": "..."},
    "keywords": {"score": X, "max": 25, "notes": "..."}
  },
  "missing_concepts": ["concept1", "concept2"],
  "feedback": "Constructive feedback for student..."
}
"""
```

---

## 6. Security Architecture

### 6.1 Authentication Flow

```
┌──────────┐                 ┌──────────┐                 ┌──────────┐
│  Client  │                 │   API    │                 │ Database │
└────┬─────┘                 └────┬─────┘                 └────┬─────┘
     │                            │                            │
     │  POST /auth/login          │                            │
     │  {email, password}         │                            │
     │───────────────────────────►│                            │
     │                            │  Find user by email        │
     │                            │───────────────────────────►│
     │                            │◄───────────────────────────│
     │                            │                            │
     │                            │  Verify password (bcrypt)  │
     │                            │  Generate JWT tokens       │
     │                            │                            │
     │  {access_token,            │                            │
     │   refresh_token}           │                            │
     │◄───────────────────────────│                            │
     │                            │                            │
     │  GET /api/resource         │                            │
     │  Authorization: Bearer     │                            │
     │───────────────────────────►│                            │
     │                            │  Verify JWT                │
     │                            │  Check permissions         │
     │  Response                  │                            │
     │◄───────────────────────────│                            │
```

### 6.2 Security Measures

| Aspect | Implementation |
|--------|----------------|
| **Password Storage** | bcrypt with cost factor 12 |
| **Token Type** | JWT with RS256 signing |
| **Access Token Expiry** | 15 minutes |
| **Refresh Token Expiry** | 7 days |
| **Token Storage** | HttpOnly, Secure, SameSite cookies |
| **API Rate Limiting** | 100 req/min per user |
| **File Upload** | Virus scan, type validation, size limits |
| **Data Encryption** | TLS 1.3 in transit, AES-256 at rest |
| **CORS** | Whitelist allowed origins |
| **Input Validation** | Schema validation on all inputs |
| **SQL/NoSQL Injection** | Parameterized queries, ODM |

### 6.3 Role-Based Access Control (RBAC)

```python
PERMISSIONS = {
    "admin": [
        "users:read", "users:write", "users:delete",
        "exams:read", "exams:write", "exams:delete",
        "results:read", "results:write",
        "challenges:read", "challenges:write",
        "analytics:read"
    ],
    "teacher": [
        "exams:read:own", "exams:write:own", "exams:delete:own",
        "results:read:own", "results:write:own",
        "challenges:read:own", "challenges:write:own"
    ],
    "student": [
        "results:read:own",
        "challenges:read:own", "challenges:write:own"
    ]
}
```

---

## 7. Deployment Architecture

### 7.1 Development Environment

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
    environment:
      - REACT_APP_API_URL=http://localhost:5000

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    volumes:
      - ./backend:/app
    environment:
      - FLASK_ENV=development
      - MONGODB_URI=mongodb://mongo:27017/smarteval
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis

  celery:
    build: ./backend
    command: celery -A tasks.celery_app worker --loglevel=info
    volumes:
      - ./backend:/app
    depends_on:
      - backend
      - redis

  mongo:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

volumes:
  mongo_data:
  minio_data:
```

### 7.2 Production Architecture

```
                              ┌─────────────────┐
                              │   CloudFlare    │
                              │   (CDN + WAF)   │
                              └────────┬────────┘
                                       │
                              ┌────────▼────────┐
                              │  Load Balancer  │
                              │    (Nginx)      │
                              └────────┬────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
     ┌────────▼────────┐     ┌────────▼────────┐     ┌────────▼────────┐
     │   Web Server    │     │   Web Server    │     │   Web Server    │
     │   (Container)   │     │   (Container)   │     │   (Container)   │
     └────────┬────────┘     └────────┬────────┘     └────────┬────────┘
              │                        │                        │
              └────────────────────────┼────────────────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
     ┌────────▼────────┐     ┌────────▼────────┐     ┌────────▼────────┐
     │  MongoDB        │     │     Redis       │     │   MinIO / S3    │
     │  (Replica Set)  │     │   (Cluster)     │     │  (File Storage) │
     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 8. Monitoring & Observability

### 8.1 Logging Strategy

```python
# Structured logging format
{
  "timestamp": "2026-01-15T10:30:00Z",
  "level": "INFO",
  "service": "grading-service",
  "trace_id": "abc123",
  "user_id": "user456",
  "action": "grade_answer",
  "exam_id": "exam789",
  "duration_ms": 1234,
  "ai_confidence": 0.87,
  "message": "Answer graded successfully"
}
```

### 8.2 Key Metrics

| Metric | Type | Alert Threshold |
|--------|------|-----------------|
| API Response Time (p95) | Histogram | > 3s |
| Error Rate | Counter | > 1% |
| OCR Processing Time | Histogram | > 60s |
| LLM API Latency | Histogram | > 30s |
| Queue Depth | Gauge | > 1000 |
| Active Users | Gauge | Informational |
| Grading Throughput | Counter | < 10/min |

### 8.3 Health Checks

```python
@app.route('/health')
def health_check():
    checks = {
        'database': check_mongodb(),
        'cache': check_redis(),
        'storage': check_minio(),
        'ocr_api': check_vision_api(),
        'llm_api': check_openai_api()
    }
    
    all_healthy = all(checks.values())
    status_code = 200 if all_healthy else 503
    
    return jsonify({
        'status': 'healthy' if all_healthy else 'unhealthy',
        'checks': checks,
        'timestamp': datetime.utcnow().isoformat()
    }), status_code
```

---

## 9. Disaster Recovery

### 9.1 Backup Strategy

| Data Type | Frequency | Retention | Location |
|-----------|-----------|-----------|----------|
| MongoDB | Daily full, hourly incremental | 30 days | S3 + Cross-region |
| Answer Sheets | Immediately on upload | 1 year | S3 + Cross-region |
| Audit Logs | Continuous | 2 years | S3 |
| Configuration | On change | 90 days | Git + S3 |

### 9.2 Recovery Procedures

```
RTO (Recovery Time Objective): 4 hours
RPO (Recovery Point Objective): 1 hour

Failover Steps:
1. Detect failure (automated monitoring)
2. DNS failover to secondary region
3. Restore from latest backup
4. Verify data integrity
5. Resume operations
6. Post-incident review
```

---

## 10. Future Scalability

### 10.1 Horizontal Scaling Points

1. **Web Servers**: Stateless, scale behind load balancer
2. **Celery Workers**: Add workers for AI processing
3. **MongoDB**: Sharding by exam_id for write scaling
4. **Redis**: Cluster mode for cache scaling

### 10.2 Migration Path to Microservices

```
Phase 1 (Current): Monolith
├── All services in single Flask app

Phase 2: Service Extraction
├── Auth Service (separate)
├── Grading Service (separate)
├── Notification Service (separate)
└── Core API (remaining)

Phase 3: Full Microservices
├── API Gateway
├── Auth Service
├── Exam Service
├── Grading Service
├── Student Service
├── Challenge Service
├── Notification Service
└── Analytics Service
```

---

## 11. Environment Configuration

### 11.1 Environment Variables

#### Backend (.env)
```bash
# Application
FLASK_ENV=development|staging|production
FLASK_DEBUG=1|0
SECRET_KEY=your-super-secret-key

# Database
MONGODB_URI=mongodb://localhost:27017/smarteval
MONGODB_DB_NAME=smarteval

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT Authentication
JWT_SECRET_KEY=your-jwt-secret
JWT_ACCESS_TOKEN_EXPIRES=900
JWT_REFRESH_TOKEN_EXPIRES=604800

# File Storage (MinIO/S3)
STORAGE_ENDPOINT=localhost:9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
STORAGE_BUCKET=smarteval

# OCR Service
OCR_PROVIDER=google|tesseract
GOOGLE_VISION_API_KEY=your-google-api-key

# LLM Service
LLM_PROVIDER=openai|gemini
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4
GEMINI_API_KEY=your-gemini-api-key

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Rate Limiting
RATE_LIMIT_DEFAULT=100/minute
RATE_LIMIT_AUTH=10/minute
```

#### Frontend (.env)
```bash
# API Configuration
REACT_APP_API_URL=http://localhost:5000/api/v1
REACT_APP_WS_URL=ws://localhost:5000

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_DARK_MODE=false

# Third-party Services
REACT_APP_SENTRY_DSN=your-sentry-dsn
```

### 11.2 Configuration by Environment

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| FLASK_DEBUG | 1 | 0 | 0 |
| MONGODB_URI | localhost | mongodb-staging | mongodb-cluster |
| OCR_PROVIDER | tesseract | google | google |
| LLM_PROVIDER | openai | openai | openai |
| RATE_LIMIT | 1000/min | 100/min | 100/min |

---

## 12. Related Documents

| Document | Description |
|----------|-------------|
| [PRD.md](PRD.md) | Product Requirements - Functional requirements and user stories |
| [Design.md](design.md) | UI/UX Design - Wireframes and design system |
| [Roadmap.md](roadmap.md) | Development timeline and sprint planning |
| [API_DOCS.md](API_DOCS.md) | Complete API contract documentation |
| [project-overview.md](project-overview.md) | High-level project summary |

---

## 13. Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | Team Smart-Eval | Initial architecture design |
| 1.1 | February 2026 | Team Smart-Eval | Added environment config, related docs, version history |
