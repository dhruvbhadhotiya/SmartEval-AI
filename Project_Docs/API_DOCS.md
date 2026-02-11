# Smart-Eval AI - API Documentation

**Version:** 1.1  
**Base URL:** `https://api.smarteval.ai/api/v1`  
**Status:** In Progress  
**Author:** Team Smart-Eval  
**Last Updated:** February 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Response Format](#2-response-format)
3. [Authentication Endpoints](#3-authentication-endpoints)
4. [Exam Management Endpoints](#4-exam-management-endpoints-teacher)
5. [Grading Endpoints](#5-grading-endpoints-teacher)
6. [Results Endpoints](#6-results-endpoints-student)
7. [Challenge Endpoints](#7-challenge-endpoints)
8. [User Profile Endpoints](#8-user-profile-endpoints)
9. [Notification Endpoints](#9-notification-endpoints)
10. [Health & Utility Endpoints](#10-health--utility-endpoints)
11. [WebSocket Events](#11-websocket-events-real-time-updates)
12. [Rate Limiting](#12-rate-limiting)
13. [SDK Examples](#13-sdk-examples)
14. [Changelog](#14-changelog)
15. [Contact](#15-contact)

---

## 1. Overview

This document defines the API contract between the React.js frontend and Flask backend for Smart-Eval AI. All endpoints follow RESTful conventions and use JSON for request/response bodies.

### 1.1 API Conventions

| Aspect | Convention |
|--------|------------|
| **Protocol** | HTTPS only |
| **Content-Type** | `application/json` (except file uploads) |
| **Date Format** | ISO 8601 (`2026-01-15T10:30:00Z`) |
| **Pagination** | Query params: `page`, `limit` |
| **Error Format** | Standardized error response object |
| **Versioning** | URL path (`/api/v1/`) |

### 1.2 Authentication

All protected endpoints require JWT authentication via Bearer token:

```http
Authorization: Bearer <access_token>
```

---

## 2. Response Format

### 2.1 Success Response

```json
{
  "success": true,
  "data": { /* response payload */ },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 2.2 Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### 2.3 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | External service down |

---

## 3. Authentication Endpoints

### 3.1 Register User

Creates a new user account.

```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "professor@university.edu",
  "password": "SecurePass123!",
  "role": "teacher",
  "profile": {
    "name": "Dr. Sharma",
    "department": "Computer Science",
    "employee_id": "EMP001"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "65a1b2c3d4e5f6789012abcd",
    "email": "professor@university.edu",
    "role": "teacher",
    "profile": {
      "name": "Dr. Sharma",
      "department": "Computer Science"
    },
    "created_at": "2026-01-10T10:30:00Z"
  }
}
```

---

### 3.2 Login

Authenticates user and returns tokens.

```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "professor@university.edu",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJSUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 900,
    "user": {
      "id": "65a1b2c3d4e5f6789012abcd",
      "email": "professor@university.edu",
      "role": "teacher",
      "profile": {
        "name": "Dr. Sharma"
      }
    }
  }
}
```

---

### 3.3 Refresh Token

Generates new access token using refresh token.

```http
POST /auth/refresh
```

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJSUzI1NiIs..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIs...",
    "expires_in": 900
  }
}
```

---

### 3.4 Logout

Invalidates the current session.

```http
POST /auth/logout
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

### 3.5 Request Password Reset

Sends password reset email.

```http
POST /auth/password/reset
```

**Request Body:**
```json
{
  "email": "professor@university.edu"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Password reset email sent"
  }
}
```

---

### 3.6 Complete Password Reset

Resets password with token.

```http
PUT /auth/password/reset
```

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "new_password": "NewSecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Password reset successful"
  }
}
```

---

## 4. Exam Management Endpoints (Teacher)

### 4.1 List Exams

Returns all exams for the authenticated teacher.

```http
GET /exams
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page |
| `status` | string | all | Filter by status |
| `sort` | string | -created_at | Sort field |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "65a1b2c3d4e5f6789012abcd",
      "title": "DSA Mid-Term Examination",
      "subject": "Data Structures & Algorithms",
      "exam_date": "2026-01-15",
      "status": "grading",
      "statistics": {
        "total_sheets": 50,
        "graded": 45,
        "reviewed": 30
      },
      "created_at": "2026-01-10T10:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "totalPages": 1
  }
}
```

---

### 4.2 Create Exam

Creates a new exam.

```http
POST /exams
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "DSA Mid-Term Examination",
  "subject": "Data Structures & Algorithms",
  "exam_date": "2026-01-15"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "65a1b2c3d4e5f6789012abcd",
    "title": "DSA Mid-Term Examination",
    "subject": "Data Structures & Algorithms",
    "exam_date": "2026-01-15",
    "status": "draft",
    "created_at": "2026-01-10T10:30:00Z"
  }
}
```

---

### 4.3 Get Exam Details

Returns detailed exam information.

```http
GET /exams/:examId
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "65a1b2c3d4e5f6789012abcd",
    "title": "DSA Mid-Term Examination",
    "subject": "Data Structures & Algorithms",
    "exam_date": "2026-01-15",
    "status": "grading",
    "question_paper": {
      "file_url": "https://storage.smarteval.ai/exams/abc/question_paper.pdf",
      "uploaded_at": "2026-01-10T11:00:00Z"
    },
    "model_answer": {
      "file_url": "https://storage.smarteval.ai/exams/abc/model_answer.pdf",
      "parsed_answers": [
        {
          "question_number": 1,
          "max_marks": 20,
          "answer_text": "A Binary Search Tree is...",
          "keywords": ["BST", "binary", "search", "O(log n)"],
          "concepts": ["definition", "properties", "complexity"]
        }
      ]
    },
    "grading_config": {
      "strictness": "moderate",
      "holistic_params": {
        "attendance": {
          "enabled": true,
          "weight": 5,
          "threshold": 75,
          "direction": "higher"
        },
        "discipline": {
          "enabled": false,
          "weight": 0
        }
      },
      "keyword_mode": "synonyms"
    },
    "statistics": {
      "total_sheets": 50,
      "graded": 45,
      "reviewed": 30,
      "average_score": 68.5,
      "highest_score": 95,
      "lowest_score": 32
    },
    "created_at": "2026-01-10T10:30:00Z",
    "updated_at": "2026-01-12T14:20:00Z"
  }
}
```

---

### 4.4 Update Exam

Updates exam details.

```http
PUT /exams/:examId
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "DSA Mid-Term Examination (Updated)",
  "subject": "Data Structures & Algorithms",
  "exam_date": "2026-01-16"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "65a1b2c3d4e5f6789012abcd",
    "title": "DSA Mid-Term Examination (Updated)",
    "updated_at": "2026-01-12T15:00:00Z"
  }
}
```

---

### 4.5 Delete Exam

Deletes an exam (only if status is draft).

```http
DELETE /exams/:examId
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Exam deleted successfully"
  }
}
```

---

### 4.6 Upload Question Paper

Uploads the question paper PDF/image.

```http
POST /exams/:examId/question-paper
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
| Field | Type | Description |
|-------|------|-------------|
| `file` | File | PDF or image file (max 10MB) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "file_url": "https://storage.smarteval.ai/exams/abc/question_paper.pdf",
    "file_name": "question_paper.pdf",
    "file_size": 524288,
    "uploaded_at": "2026-01-10T11:00:00Z"
  }
}
```

---

### 4.7 Upload Model Answer

Uploads and parses the model answer.

```http
POST /exams/:examId/model-answer
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "answers": [
    {
      "question_number": 1,
      "max_marks": 20,
      "answer_text": "A Binary Search Tree (BST) is a binary tree data structure where each node has at most two children...",
      "keywords": ["BST", "binary", "search", "left subtree", "right subtree", "O(log n)"],
      "concepts": ["definition", "properties", "time complexity", "example"]
    },
    {
      "question_number": 2,
      "max_marks": 15,
      "answer_text": "AVL tree rotations are performed to maintain balance...",
      "keywords": ["AVL", "rotation", "left rotation", "right rotation", "balance factor"],
      "concepts": ["definition", "types", "when to apply", "example"]
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total_questions": 2,
    "total_marks": 35,
    "saved_at": "2026-01-10T11:30:00Z"
  }
}
```

---

### 4.8 Update Grading Configuration

Sets grading parameters.

```http
PUT /exams/:examId/config
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "strictness": "moderate",
  "holistic_params": {
    "attendance": {
      "enabled": true,
      "weight": 5,
      "threshold": 75,
      "direction": "higher"
    },
    "discipline": {
      "enabled": false,
      "weight": 0
    }
  },
  "keyword_mode": "synonyms"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Grading configuration updated",
    "config": {
      "strictness": "moderate",
      "holistic_params": { /* ... */ },
      "keyword_mode": "synonyms"
    }
  }
}
```

---

### 4.9 Bulk Upload Answer Sheets

Uploads multiple student answer sheets.

```http
POST /exams/:examId/answer-sheets
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
| Field | Type | Description |
|-------|------|-------------|
| `files[]` | File[] | Array of PDF/image files (max 100 files, 10MB each) |

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "batch_id": "batch_abc123",
    "total_files": 50,
    "accepted": 48,
    "rejected": 2,
    "rejected_files": [
      {
        "filename": "sheet_15.pdf",
        "reason": "File corrupted"
      },
      {
        "filename": "sheet_22.pdf",
        "reason": "File too large"
      }
    ],
    "status": "processing",
    "estimated_completion": "2026-01-10T12:30:00Z"
  }
}
```

---

### 4.10 List Answer Sheets

Returns all answer sheets for an exam.

```http
GET /exams/:examId/answer-sheets
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page |
| `status` | string | all | Filter: uploaded, processing, graded, reviewed |
| `sort` | string | student_id | Sort field |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "sheet_abc123",
      "student": {
        "id": "student_xyz",
        "name": "Rahul Kumar",
        "roll_number": "CS2022034"
      },
      "status": "graded",
      "ocr_confidence": 94.5,
      "total_score": 72,
      "max_score": 100,
      "uploaded_at": "2026-01-10T11:00:00Z",
      "graded_at": "2026-01-10T12:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

### 4.11 Start AI Processing

Initiates OCR and grading for all unprocessed sheets.

```http
POST /exams/:examId/process
Authorization: Bearer <token>
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "job_id": "job_xyz789",
    "sheets_to_process": 50,
    "status": "queued",
    "estimated_completion": "2026-01-10T14:00:00Z"
  }
}
```

---

### 4.12 Get Processing Status

Returns current processing status.

```http
GET /exams/:examId/process/status
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "job_id": "job_xyz789",
    "status": "processing",
    "progress": {
      "total": 50,
      "ocr_completed": 45,
      "grading_completed": 30,
      "failed": 2
    },
    "estimated_remaining": "15 minutes",
    "started_at": "2026-01-10T12:00:00Z"
  }
}
```

---

### 4.13 Get Exam Statistics

Returns aggregated statistics.

```http
GET /exams/:examId/statistics
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_students": 50,
      "graded": 48,
      "pending": 2,
      "challenged": 3
    },
    "scores": {
      "average": 68.5,
      "median": 70,
      "highest": 95,
      "lowest": 32,
      "std_deviation": 12.3
    },
    "distribution": [
      { "range": "0-40", "count": 5 },
      { "range": "41-60", "count": 12 },
      { "range": "61-80", "count": 25 },
      { "range": "81-100", "count": 8 }
    ],
    "question_analysis": [
      {
        "question_number": 1,
        "average_score": 14.5,
        "max_marks": 20,
        "difficulty_rating": "moderate"
      }
    ]
  }
}
```

---

### 4.14 Publish Results

Makes results visible to students.

```http
POST /exams/:examId/publish
Authorization: Bearer <token>
```

**Request Body (optional):**
```json
{
  "student_ids": ["student_abc", "student_xyz"],
  "notify_students": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "published_count": 50,
    "published_at": "2026-01-12T10:00:00Z",
    "notifications_sent": 50
  }
}
```

---

## 5. Grading Endpoints (Teacher)

### 5.1 List Sheets for Review

Returns answer sheets ready for review.

```http
GET /grading/exams/:examId/sheets
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | all | graded, reviewed, flagged |
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "sheet_abc123",
      "student": {
        "name": "Rahul Kumar",
        "roll_number": "CS2022034",
        "attendance_percentage": 87
      },
      "status": "graded",
      "ai_score": 72,
      "reviewed": false,
      "flagged": false,
      "graded_at": "2026-01-10T12:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

### 5.2 Get Sheet Evaluation

Returns detailed evaluation for a single sheet.

```http
GET /grading/sheets/:sheetId
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "sheet_abc123",
    "exam": {
      "id": "exam_xyz",
      "title": "DSA Mid-Term Examination"
    },
    "student": {
      "id": "student_123",
      "name": "Rahul Kumar",
      "roll_number": "CS2022034",
      "attendance_percentage": 87,
      "discipline_score": 92
    },
    "original_file": {
      "url": "https://storage.smarteval.ai/sheets/abc/original.pdf",
      "pages": 5
    },
    "ocr_results": {
      "overall_confidence": 94.5,
      "pages": [
        {
          "page_number": 1,
          "text": "Question 1: Binary Search Tree...",
          "confidence": 96.2
        }
      ]
    },
    "questions": [
      {
        "number": 1,
        "max_marks": 20,
        "ai_evaluation": {
          "score": 15,
          "confidence": 0.87,
          "breakdown": {
            "keyword_match": { "score": 4, "max": 5 },
            "concept_coverage": { "score": 4, "max": 5 },
            "logic_flow": { "score": 3, "max": 5 },
            "completeness": { "score": 4, "max": 5 }
          },
          "feedback": "Good understanding of BST structure. Missing O(log n) complexity analysis. Example shows insertion but not search.",
          "missing_concepts": ["time complexity", "search operation"]
        },
        "holistic_adjustment": {
          "applied": true,
          "adjustment": 2,
          "reason": "Attendance > 85%"
        },
        "final_score": 17,
        "final_feedback": "Good understanding of BST structure. Missing O(log n) complexity analysis.",
        "override": null
      }
    ],
    "total_score": 72,
    "max_total": 100,
    "status": "graded",
    "reviewed": false
  }
}
```

---

### 5.3 Override Question Grade

Modifies the grade for a specific question.

```http
PUT /grading/sheets/:sheetId/questions/:questionNumber
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "new_score": 18,
  "new_feedback": "Upon review, the student's explanation of BST properties was more complete than initially assessed.",
  "reason": "Student correctly explained all 5 BST properties in different terminology"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "question_number": 1,
    "original_score": 15,
    "new_score": 18,
    "override": {
      "applied": true,
      "reason": "Student correctly explained all 5 BST properties in different terminology",
      "overridden_by": "teacher_abc",
      "overridden_at": "2026-01-12T14:30:00Z"
    },
    "new_total_score": 75
  }
}
```

---

### 5.4 Approve Sheet

Marks a sheet as reviewed and approved.

```http
POST /grading/sheets/:sheetId/approve
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "sheet_id": "sheet_abc123",
    "status": "reviewed",
    "approved_by": "teacher_abc",
    "approved_at": "2026-01-12T15:00:00Z"
  }
}
```

---

### 5.5 Bulk Approve Sheets

Approves multiple sheets at once.

```http
POST /grading/exams/:examId/approve-all
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "sheet_ids": ["sheet_abc123", "sheet_def456", "sheet_ghi789"]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "approved_count": 3,
    "approved_at": "2026-01-12T15:30:00Z"
  }
}
```

---

### 5.6 Flag Sheet for Review

Flags a sheet that needs additional attention.

```http
POST /grading/sheets/:sheetId/flag
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "reason": "OCR confidence too low for Q3 - needs manual verification"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "sheet_id": "sheet_abc123",
    "flagged": true,
    "reason": "OCR confidence too low for Q3 - needs manual verification"
  }
}
```

---

## 6. Results Endpoints (Student)

### 6.1 List Student Results

Returns all published results for the authenticated student.

```http
GET /results
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page |
| `sort` | string | -published_at | Sort field |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "result_abc123",
      "exam": {
        "id": "exam_xyz",
        "title": "DSA Mid-Term Examination",
        "subject": "Data Structures & Algorithms",
        "date": "2026-01-15"
      },
      "total_score": 72,
      "max_score": 100,
      "percentage": 72.0,
      "grade": "B+",
      "class_rank": 12,
      "total_students": 50,
      "class_average": 65.5,
      "published_at": "2026-01-12T10:00:00Z",
      "has_pending_challenge": false
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

---

### 6.2 Get Detailed Result

Returns question-wise breakdown for a specific exam.

```http
GET /results/:examId
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "exam": {
      "id": "exam_xyz",
      "title": "DSA Mid-Term Examination",
      "subject": "Data Structures & Algorithms",
      "date": "2026-01-15"
    },
    "student": {
      "name": "Rahul Kumar",
      "roll_number": "CS2022034"
    },
    "summary": {
      "total_score": 72,
      "max_score": 100,
      "percentage": 72.0,
      "grade": "B+",
      "class_rank": 12,
      "total_students": 50,
      "class_average": 65.5
    },
    "questions": [
      {
        "number": 1,
        "title": "Explain Binary Search Tree with examples",
        "max_marks": 20,
        "score": 17,
        "original_answer_url": "https://storage.smarteval.ai/sheets/abc/page1.jpg",
        "feedback": {
          "overall": "Good understanding of BST structure. Missing O(log n) complexity analysis.",
          "positives": [
            "Definition correct",
            "Properties explained well (4/5 covered)"
          ],
          "improvements": [
            "Missing: Time complexity analysis O(log n)",
            "Example: Insertion shown, search not demonstrated"
          ]
        },
        "holistic_adjustment": {
          "applied": true,
          "adjustment": 2,
          "reason": "Attendance > 85%"
        },
        "can_challenge": true,
        "challenge_status": null
      },
      {
        "number": 2,
        "title": "Implement AVL tree rotations",
        "max_marks": 15,
        "score": 13,
        "original_answer_url": "https://storage.smarteval.ai/sheets/abc/page2.jpg",
        "feedback": {
          "overall": "Good implementation of rotations.",
          "positives": [
            "All four rotation types covered",
            "Code logic correct"
          ],
          "improvements": [
            "Missing balance factor calculation in code"
          ]
        },
        "holistic_adjustment": null,
        "can_challenge": true,
        "challenge_status": null
      }
    ],
    "published_at": "2026-01-12T10:00:00Z"
  }
}
```

---

### 6.3 Download Result PDF

Generates and downloads a PDF report card.

```http
GET /results/:examId/download
Authorization: Bearer <token>
```

**Response (200 OK):**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="DSA_MidTerm_CS2022034.pdf"

[PDF Binary Content]
```

---

## 7. Challenge Endpoints

### 7.1 Submit Challenge (Student)

Submits a grade challenge for specific question(s).

```http
POST /challenges
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "exam_id": "exam_xyz",
  "challenged_questions": [
    {
      "question_number": 1,
      "justification": "I believe my explanation of time complexity was present on page 2, line 5-8. I mentioned O(log n) for search and insert operations. Please review."
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "challenge_abc123",
    "exam_id": "exam_xyz",
    "status": "pending",
    "challenged_questions": [
      {
        "question_number": 1,
        "original_score": 15,
        "justification": "I believe my explanation of time complexity was present on page 2, line 5-8..."
      }
    ],
    "submitted_at": "2026-01-13T09:00:00Z",
    "estimated_resolution": "2026-01-15T09:00:00Z"
  }
}
```

---

### 7.2 List Challenges

Returns challenges filtered by role (student sees own, teacher sees for their exams).

```http
GET /challenges
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `exam_id` | string | - | Filter by exam |
| `status` | string | all | pending, under_review, accepted, rejected |
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page |

**Response (200 OK) - Teacher View:**
```json
{
  "success": true,
  "data": [
    {
      "id": "challenge_abc123",
      "exam": {
        "id": "exam_xyz",
        "title": "DSA Mid-Term Examination"
      },
      "student": {
        "name": "Rahul Kumar",
        "roll_number": "CS2022034"
      },
      "challenged_questions": [
        {
          "question_number": 1,
          "original_score": 15,
          "max_marks": 20
        }
      ],
      "status": "pending",
      "submitted_at": "2026-01-13T09:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

---

### 7.3 Get Challenge Details

Returns full challenge information.

```http
GET /challenges/:challengeId
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "challenge_abc123",
    "exam": {
      "id": "exam_xyz",
      "title": "DSA Mid-Term Examination"
    },
    "student": {
      "id": "student_123",
      "name": "Rahul Kumar",
      "roll_number": "CS2022034"
    },
    "challenged_questions": [
      {
        "question_number": 1,
        "original_score": 15,
        "max_marks": 20,
        "original_feedback": "Good understanding of BST structure. Missing O(log n) complexity analysis.",
        "student_justification": "I believe my explanation of time complexity was present on page 2, line 5-8. I mentioned O(log n) for search and insert operations.",
        "original_answer_url": "https://storage.smarteval.ai/sheets/abc/page1.jpg"
      }
    ],
    "status": "pending",
    "submitted_at": "2026-01-13T09:00:00Z",
    "resolution": null
  }
}
```

---

### 7.4 Resolve Challenge (Teacher)

Accepts or rejects a challenge.

```http
PUT /challenges/:challengeId/resolve
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "decision": "accepted",
  "comments": "Upon re-review, the student did mention time complexity on page 2. The OCR missed this section due to handwriting. Awarding 3 additional marks.",
  "score_changes": [
    {
      "question_number": 1,
      "new_score": 18
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "challenge_abc123",
    "status": "accepted",
    "resolution": {
      "decision": "accepted",
      "comments": "Upon re-review, the student did mention time complexity on page 2...",
      "score_changes": [
        {
          "question_number": 1,
          "old_score": 15,
          "new_score": 18
        }
      ],
      "new_total_score": 75,
      "resolved_by": "teacher_abc",
      "resolved_at": "2026-01-14T11:00:00Z"
    }
  }
}
```

---

## 8. User Profile Endpoints

### 8.1 Get Current User Profile

```http
GET /users/me
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "user_abc123",
    "email": "professor@university.edu",
    "role": "teacher",
    "profile": {
      "name": "Dr. Sharma",
      "department": "Computer Science",
      "employee_id": "EMP001",
      "avatar_url": "https://storage.smarteval.ai/avatars/abc.jpg"
    },
    "settings": {
      "notifications": {
        "email": true,
        "in_app": true
      },
      "default_strictness": "moderate"
    },
    "created_at": "2026-01-01T10:00:00Z",
    "last_login": "2026-01-15T08:30:00Z"
  }
}
```

---

### 8.2 Update Profile

```http
PUT /users/me
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "profile": {
    "name": "Dr. Sharma (Updated)"
  },
  "settings": {
    "notifications": {
      "email": false
    },
    "default_strictness": "strict"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Profile updated successfully",
    "updated_at": "2026-01-15T10:00:00Z"
  }
}
```

---

### 8.3 Change Password

```http
PUT /users/me/password
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewSecurePass456!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully"
  }
}
```

---

## 9. Notification Endpoints

### 9.1 List Notifications

```http
GET /notifications
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `unread_only` | boolean | false | Filter unread only |
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "notif_abc123",
      "type": "result_published",
      "title": "New Result Available",
      "message": "Your DSA Mid-Term results have been published.",
      "data": {
        "exam_id": "exam_xyz"
      },
      "read": false,
      "created_at": "2026-01-12T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "unread_count": 2
  }
}
```

---

### 9.2 Mark Notification as Read

```http
PUT /notifications/:notificationId/read
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "notif_abc123",
    "read": true
  }
}
```

---

### 9.3 Mark All as Read

```http
PUT /notifications/read-all
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "marked_count": 5
  }
}
```

---

## 10. Health & Utility Endpoints

### 10.1 Health Check

```http
GET /health
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "checks": {
    "database": true,
    "cache": true,
    "storage": true,
    "ocr_api": true,
    "llm_api": true
  },
  "version": "1.0.0",
  "timestamp": "2026-01-15T10:00:00Z"
}
```

---

### 10.2 API Version

```http
GET /version
```

**Response (200 OK):**
```json
{
  "version": "1.0.0",
  "api_version": "v1",
  "build": "abc123",
  "environment": "production"
}
```

---

## 11. WebSocket Events (Real-time Updates)

### 11.1 Connection

```javascript
// Client connection
const socket = io('wss://api.smarteval.ai', {
  auth: { token: 'Bearer <access_token>' }
});
```

### 11.2 Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `processing:progress` | Server → Client | OCR/grading progress update |
| `processing:complete` | Server → Client | Processing finished |
| `result:published` | Server → Client | Results published |
| `challenge:received` | Server → Client | New challenge received (teacher) |
| `challenge:resolved` | Server → Client | Challenge resolved (student) |

**Example: Processing Progress**
```json
{
  "event": "processing:progress",
  "data": {
    "exam_id": "exam_xyz",
    "job_id": "job_abc",
    "stage": "grading",
    "progress": {
      "completed": 25,
      "total": 50,
      "percentage": 50
    }
  }
}
```

---

## 12. Rate Limiting

| Endpoint Category | Limit |
|-------------------|-------|
| Authentication | 10 requests/minute |
| File Upload | 20 requests/minute |
| AI Processing | 5 requests/minute |
| General API | 100 requests/minute |

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704789600
```

---

## 13. SDK Examples

### 13.1 Frontend (React + Axios)

```javascript
// services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Attempt token refresh
      const refreshToken = localStorage.getItem('refresh_token');
      const { data } = await api.post('/auth/refresh', { refresh_token: refreshToken });
      localStorage.setItem('access_token', data.data.access_token);
      
      // Retry original request
      error.config.headers.Authorization = `Bearer ${data.data.access_token}`;
      return api(error.config);
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 13.2 Example Service

```javascript
// services/examService.js
import api from './api';

export const examService = {
  // List exams
  getExams: async (params) => {
    const response = await api.get('/exams', { params });
    return response.data;
  },

  // Create exam
  createExam: async (examData) => {
    const response = await api.post('/exams', examData);
    return response.data;
  },

  // Upload answer sheets
  uploadAnswerSheets: async (examId, files, onProgress) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files[]', file));
    
    const response = await api.post(`/exams/${examId}/answer-sheets`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress(Math.round((e.loaded * 100) / e.total))
    });
    return response.data;
  },

  // Start processing
  startProcessing: async (examId) => {
    const response = await api.post(`/exams/${examId}/process`);
    return response.data;
  }
};
```

---

## 14. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | January 2026 | Initial API release |

---

## 15. Contact

For API support or questions:
- **Email:** api-support@smarteval.ai
- **Documentation:** https://docs.smarteval.ai
- **Status Page:** https://status.smarteval.ai
