# Smart-Eval AI - Product Requirements Document (PRD)

**Document Version:** 1.1  
**Status:** In Progress  
**Author:** Team Smart-Eval  
**Last Updated:** February 2026

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Product Vision](#2-product-vision)
3. [User Personas](#3-user-personas)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [User Stories](#6-user-stories)
7. [Wireframes Reference](#7-wireframes-reference)
8. [Release Criteria](#8-release-criteria)
9. [Dependencies](#9-dependencies)
10. [Success Metrics](#10-success-metrics)
11. [Appendix](#11-appendix)
12. [Related Documents](#12-related-documents)
13. [Version History](#13-version-history)

---

## 1. Introduction

### 1.1 Purpose
This document defines the product requirements for Smart-Eval AI, an automated exam grading and feedback system. It serves as the single source of truth for all stakeholders regarding what the product will deliver.

### 1.2 Scope
This PRD covers the Minimum Viable Product (MVP) to be delivered within a 2-month timeline, focusing on a working prototype for Computer Science theory examinations.

### 1.3 Definitions & Acronyms
- **MVP**: Minimum Viable Product
- **OCR**: Optical Character Recognition
- **LLM**: Large Language Model
- **API**: Application Programming Interface

---

## 2. Product Vision

### 2.1 Vision Statement
*"To transform exam evaluation from a subjective, time-consuming process into an objective, transparent, and efficient system that benefits both educators and students."*

### 2.2 Target Market
- Engineering colleges and universities
- Large-scale examination boards
- Online education platforms

### 2.3 Value Proposition

| For | Who | The Product | That | Unlike |
|-----|-----|-------------|------|--------|
| Teachers | Grade hundreds of papers | Smart-Eval AI | Reduces grading time by 60% while maintaining control | Manual grading which is slow and inconsistent |
| Students | Want to understand their grades | Smart-Eval AI | Provides detailed feedback on every answer | Traditional systems that only show final marks |

---

## 3. User Personas

### 3.1 Persona 1: Professor Sharma (Teacher)
- **Age:** 45
- **Role:** Senior Professor, CSE Department
- **Pain Points:**
  - Spends 3 weeks grading 200 answer sheets per semester
  - Receives complaints about inconsistent grading
  - Cannot remember why specific marks were deducted during revaluation
- **Goals:**
  - Reduce grading workload
  - Maintain grading consistency
  - Have documented justification for grades

### 3.2 Persona 2: Rahul (Student)
- **Age:** 20
- **Role:** 4th Semester B.Tech Student
- **Pain Points:**
  - Never understands why marks were deducted
  - Revaluation process is opaque and slow
  - Feels grading is arbitrary
- **Goals:**
  - Understand mistakes to improve
  - Fair and transparent evaluation
  - Quick access to results

### 3.3 Persona 3: Dr. Gupta (HOD/Administrator)
- **Age:** 55
- **Role:** Head of Department
- **Pain Points:**
  - Result declaration delays affect academic calendar
  - Grading bias complaints are difficult to address
  - No analytics on departmental performance
- **Goals:**
  - Standardized evaluation across faculty
  - Faster result publication
  - Data-driven insights

---

## 4. Functional Requirements

### 4.1 Teacher Dashboard Module

#### FR-T001: User Authentication
- **Priority:** P0 (Must Have)
- **Description:** Teachers must be able to register, login, and manage their accounts
- **Acceptance Criteria:**
  - Email/password based authentication
  - Password reset functionality
  - Session management with secure tokens

#### FR-T002: Exam Creation
- **Priority:** P0 (Must Have)
- **Description:** Teachers can create new exam evaluation projects
- **Acceptance Criteria:**
  - Input exam name, subject, date
  - Upload question paper (PDF/Image)
  - Upload model answer key (text/PDF)
  - Define marks per question

#### FR-T003: Answer Sheet Upload
- **Priority:** P0 (Must Have)
- **Description:** Bulk upload of student answer sheets
- **Acceptance Criteria:**
  - Support PDF and image formats (JPG, PNG)
  - Batch upload (up to 100 sheets)
  - Progress indicator during upload
  - Automatic student ID extraction from sheets

#### FR-T004: Parameter Configuration
- **Priority:** P0 (Must Have)
- **Description:** Configure grading parameters before evaluation
- **Acceptance Criteria:**
  - Strictness slider (Lenient/Moderate/Strict)
  - Holistic weight toggles (Attendance, Discipline)
  - Weight percentage inputs (0-20%)
  - Conditional rules builder

#### FR-T005: Review & Override
- **Priority:** P0 (Must Have)
- **Description:** Review AI-graded answers and make corrections
- **Acceptance Criteria:**
  - Side-by-side view: original answer + AI evaluation
  - Edit marks for any question
  - Edit/add feedback comments
  - Bulk approve functionality
  - Override logging for audit

#### FR-T006: Results Publication
- **Priority:** P1 (Should Have)
- **Description:** Publish evaluated results to student portal
- **Acceptance Criteria:**
  - Preview before publish
  - Publish all or selective results
  - Email notification trigger
  - Unpublish option

#### FR-T007: Challenge Management
- **Priority:** P1 (Should Have)
- **Description:** Handle student grade challenges
- **Acceptance Criteria:**
  - View pending challenges
  - See student's justification
  - Accept/Reject with comments
  - Track challenge history

---

### 4.2 AI Processing Engine

#### FR-A001: OCR Processing
- **Priority:** P0 (Must Have)
- **Description:** Convert handwritten answer images to text
- **Acceptance Criteria:**
  - Process JPG, PNG, PDF inputs
  - Return extracted text with confidence score
  - Handle multi-page answers
  - Flag low-confidence extractions

#### FR-A002: Semantic Grading
- **Priority:** P0 (Must Have)
- **Description:** Compare student answers against model answers
- **Acceptance Criteria:**
  - Keyword matching with synonyms
  - Concept coverage scoring
  - Logic flow analysis
  - Partial credit allocation
  - Return score 0-100%

#### FR-A003: Justification Generation
- **Priority:** P0 (Must Have)
- **Description:** Generate explanations for mark deductions
- **Acceptance Criteria:**
  - Per-question feedback
  - Specific missing concepts cited
  - Constructive tone
  - Max 100 words per justification

#### FR-A004: Holistic Score Adjustment
- **Priority:** P1 (Should Have)
- **Description:** Adjust scores based on external parameters
- **Acceptance Criteria:**
  - Fetch attendance data
  - Apply configured weights
  - Log adjustment calculations
  - Show before/after scores

---

### 4.3 Student Portal Module

#### FR-S001: Student Authentication
- **Priority:** P0 (Must Have)
- **Description:** Students login to view their results
- **Acceptance Criteria:**
  - Roll number + password authentication
  - First-time password setup
  - Password recovery via email

#### FR-S002: Results Dashboard
- **Priority:** P0 (Must Have)
- **Description:** View all evaluated exams
- **Acceptance Criteria:**
  - List of evaluated exams
  - Overall score per exam
  - Status indicators (Published, Pending)
  - Sort/filter options

#### FR-S003: Detailed Result View
- **Priority:** P0 (Must Have)
- **Description:** View question-wise breakdown
- **Acceptance Criteria:**
  - Original answer image display
  - Marks obtained vs maximum
  - AI-generated feedback per question
  - Holistic adjustments shown

#### FR-S004: Challenge Submission
- **Priority:** P1 (Should Have)
- **Description:** Submit revaluation requests
- **Acceptance Criteria:**
  - Select specific question(s)
  - Text field for justification (500 char max)
  - Submit confirmation
  - Track challenge status

#### FR-S005: Notifications
- **Priority:** P2 (Nice to Have)
- **Description:** Receive updates on results and challenges
- **Acceptance Criteria:**
  - Email notifications
  - In-app notification center
  - Configurable preferences

---

## 5. Non-Functional Requirements

### 5.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-P001 | Page load time | < 3 seconds |
| NFR-P002 | OCR processing time | < 30 seconds per page |
| NFR-P003 | Grading API response | < 10 seconds per answer |
| NFR-P004 | Concurrent users | Support 100 simultaneous |
| NFR-P005 | Bulk upload processing | 100 sheets in < 10 minutes |

### 5.2 Security

| ID | Requirement |
|----|-------------|
| NFR-S001 | All data transmission over HTTPS |
| NFR-S002 | Passwords hashed with bcrypt |
| NFR-S003 | JWT tokens for API authentication |
| NFR-S004 | Role-based access control (RBAC) |
| NFR-S005 | Answer sheets encrypted at rest |
| NFR-S006 | Audit logs for all grade modifications |

### 5.3 Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-R001 | System uptime | 99.5% |
| NFR-R002 | Data backup frequency | Daily |
| NFR-R003 | Disaster recovery time | < 4 hours |
| NFR-R004 | Zero data loss on failures | Required |

### 5.4 Usability

| ID | Requirement |
|----|-------------|
| NFR-U001 | Mobile-responsive design |
| NFR-U002 | WCAG 2.1 AA accessibility compliance |
| NFR-U003 | Multi-language support (future) |
| NFR-U004 | Intuitive UI requiring < 30 min training |

### 5.5 Scalability

| ID | Requirement |
|----|-------------|
| NFR-SC001 | Horizontal scaling capability |
| NFR-SC002 | Support 10,000 students per institution |
| NFR-SC003 | Multi-tenant architecture ready |

---

## 6. User Stories

### Epic 1: Exam Setup

```
US-001: As a teacher, I want to create a new exam project so that I can organize evaluation by exam.
US-002: As a teacher, I want to upload the question paper so that it can be referenced during evaluation.
US-003: As a teacher, I want to define model answers so that the AI has a reference for grading.
US-004: As a teacher, I want to set marks per question so that grading is proportional.
```

### Epic 2: Answer Processing

```
US-005: As a teacher, I want to bulk upload answer sheets so that processing can begin.
US-006: As a teacher, I want the system to extract student IDs automatically so that I don't enter them manually.
US-007: As a teacher, I want to see OCR confidence scores so that I can review unclear extractions.
```

### Epic 3: Grading Configuration

```
US-008: As a teacher, I want to set grading strictness so that evaluation matches exam difficulty.
US-009: As a teacher, I want to include attendance in grading so that regular students benefit.
US-010: As a teacher, I want to define conditional rules so that borderline cases are handled fairly.
```

### Epic 4: Review & Publish

```
US-011: As a teacher, I want to review AI-graded answers so that I maintain quality control.
US-012: As a teacher, I want to override AI grades so that I can correct mistakes.
US-013: As a teacher, I want to publish results selectively so that I control release timing.
```

### Epic 5: Student Experience

```
US-014: As a student, I want to view my graded answers so that I understand my performance.
US-015: As a student, I want to see feedback per question so that I learn from mistakes.
US-016: As a student, I want to challenge a grade so that unfair deductions can be reviewed.
US-017: As a student, I want to track my challenge status so that I know when to expect resolution.
```

---

## 7. Wireframes Reference

### 7.1 Teacher Dashboard - Main View
```
+------------------------------------------------------------------+
|  SMART-EVAL AI                            [Prof. Sharma] [Logout] |
+------------------------------------------------------------------+
|  [+ New Exam]                                                     |
|                                                                   |
|  Recent Exams                                                     |
|  +------------------------------------------------------------+  |
|  | Exam Name        | Date       | Status      | Actions      |  |
|  |------------------------------------------------------------|  |
|  | DSA Mid-Term     | 15 Jan     | Grading     | [View]       |  |
|  | DBMS Final       | 10 Jan     | Published   | [View]       |  |
|  | OS Quiz 3        | 05 Jan     | Reviewing   | [View]       |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  Pending Challenges: 3                         [View All →]       |
+------------------------------------------------------------------+
```

### 7.2 Student Portal - Result View
```
+------------------------------------------------------------------+
|  SMART-EVAL AI                              [Rahul - CS2022034]   |
+------------------------------------------------------------------+
|  DSA Mid-Term Exam                                                |
|  Date: 15 Jan 2026                        Total: 72/100           |
|                                                                   |
|  Question 1: Explain Binary Search Tree           [15/20]         |
|  +------------------------------------------------------------+  |
|  | Your Answer:                  | Feedback:                   |  |
|  | [Image of handwritten        | ✓ Definition correct        |  |
|  |  answer displayed]           | ✗ Missing: Time complexity  |  |
|  |                              | ✗ No example provided       |  |
|  |                              |                             |  |
|  |                              | [Challenge This Grade]      |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  Question 2: ...                                                  |
+------------------------------------------------------------------+
```

---

## 8. Release Criteria

### MVP Release Checklist

- [ ] All P0 requirements implemented and tested
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] User acceptance testing completed (5 teachers, 20 students)
- [ ] Documentation complete
- [ ] Deployment runbook prepared

### Definition of Done (Per Feature)

- Code complete and peer-reviewed
- Unit tests written (>80% coverage)
- Integration tests passing
- UI/UX review approved
- Documentation updated
- Deployed to staging environment
- QA sign-off received

---

## 9. Dependencies

| Dependency | Type | Risk Level | Mitigation |
|------------|------|------------|------------|
| Local Vision (LM Studio) | Local Service | Medium | Tesseract as fallback |
| Local LLM (LM Studio) | Local Service | High | Quantized models |
| MongoDB Atlas | Infrastructure | Low | Self-hosted backup |
| Student Data API | Institutional | High | CSV import fallback |

---

## 10. Success Metrics

### Key Performance Indicators (KPIs)

| Metric | Baseline | MVP Target | Scale Target |
|--------|----------|------------|--------------|
| Grading time per paper | 15 min | 6 min | 3 min |
| Result declaration | 3 weeks | 1 week | 3 days |
| Teacher satisfaction | N/A | >70% | >85% |
| Student feedback utility | N/A | >60% | >80% |
| AI accuracy (vs manual) | N/A | >75% | >90% |

---

## 11. Appendix

### A. Competitive Analysis

| Feature | Smart-Eval AI | Gradescope | Manual Grading |
|---------|---------------|------------|----------------|
| Subjective answer grading | ✓ | Partial | ✓ |
| Handwriting OCR | ✓ | ✓ | N/A |
| Contextual parameters | ✓ | ✗ | Informal |
| Transparent feedback | ✓ | Partial | ✗ |
| Challenge workflow | ✓ | ✓ | Manual |
| Cost | Low | High | Time-intensive |

### B. Compliance Requirements

- FERPA compliance for student data (if US deployment)
- UGC guidelines for Indian universities
- GDPR considerations for EU expansion

---

## 12. Related Documents

| Document | Description |
|----------|-------------|
| [Design.md](design.md) | UI/UX Design - Wireframes and design system |
| [Architecture.md](architecture.md) | Technical Architecture - System design and database schema |
| [Roadmap.md](roadmap.md) | Development timeline - Sprint planning and milestones |
| [API_DOCS.md](API_DOCS.md) | API Documentation - Endpoint specifications |
| [project-overview.md](project-overview.md) | High-level project summary |

---

## 13. Version History

| Version | Date | Author | Changes |
|---------|------|--------|--------|
| 1.0 | January 2026 | Team Smart-Eval | Initial requirements draft |
| 1.1 | February 2026 | Team Smart-Eval | Added TOC, related docs, version history |
