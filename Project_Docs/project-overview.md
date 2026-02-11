# Smart-Eval AI - Project Overview

## Next-Generation Automated Exam Grading & Feedback System

**Version:** 1.1  
**Status:** In Progress  
**Team:** Team Smart-Eval  
**Department:** Computer Science & Engineering  
**Semester:** 4th Semester  
**Last Updated:** February 2026  
**Project Duration:** February 3, 2026 - March 31, 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [Core Features](#4-core-features)
5. [Success Metrics](#5-success-metrics)
6. [Project Scope](#6-project-scope)
7. [Stakeholders](#7-stakeholders)
8. [Constraints & Assumptions](#8-constraints--assumptions)
9. [Risks & Mitigations](#9-risks--mitigations)
10. [Glossary](#10-glossary)
11. [Related Documents](#11-related-documents)
12. [Team Members](#12-team-members)

---

## 1. Executive Summary

Smart-Eval AI is a web-based platform designed to revolutionize the evaluation process of engineering examination papers. By integrating Artificial Intelligence (OCR & Natural Language Processing) with a Full-Stack web architecture, the system automates the grading of student answer sheets.

Unlike traditional optical mark recognition (OMR) which only handles multiple-choice questions, Smart-Eval AI is designed to **read, understand, and grade subjective engineering answers**.

### Key Differentiators

- **Contextual Grading**: Professors can influence grades based on external parameters (Attendance, Discipline, Class Activity)
- **Adjustable Strictness**: Evaluation strictness can be tuned per examination
- **Transparent Feedback**: Students receive detailed explanations for mark deductions
- **Digital Re-evaluation**: Streamlined challenge/re-evaluation workflow

---

## 2. Problem Statement

### Current Challenges in Academic Evaluation

| Problem | Impact |
|---------|--------|
| **Subjectivity & Bias** | Different teachers grade differently; scores depend on evaluator's mood, fatigue, or personal bias |
| **Lack of Feedback** | Students receive final numbers without understanding why marks were lost |
| **Time-Consuming** | Grading hundreds of handwritten bundles takes weeks, delaying results |
| **Disconnected Data** | Academic performance is treated separately from holistic performance metrics |

### Target Users

1. **Teachers/Professors** - Need efficient grading with maintained control
2. **Students** - Need transparency and feedback on evaluations
3. **Academic Administrators** - Need standardized, scalable evaluation systems

---

## 3. Solution Overview

Smart-Eval AI implements a **3-tier system architecture**:

### Tier 1: Teacher Dashboard (The Controller)
- Upload and digitize exam papers
- Configure grading parameters and strictness
- Review AI suggestions and override when necessary

### Tier 2: AI Processing Engine (The Brain)
- Handwriting recognition via OCR
- Semantic analysis against master answer keys
- Automatic justification generation for deductions

### Tier 3: Student Portal (The Feedback Loop)
- View detailed digital report cards
- Access AI-generated feedback comments
- Submit grade challenges for manual review

---

## 4. Core Features

### 4.1 Parameter Tweak Engine (USP)

The unique selling proposition allowing teachers to customize evaluation:

- **Strictness Slider**: Lenient → Moderate → Strict
- **Holistic Weights**: Link grades to attendance, discipline, class participation
- **Conditional Logic**: "If answer is borderline (40-50%) AND attendance > 85%, award higher mark"

### 4.2 Intelligent Grading

- Semantic comparison against model answers
- Technical keyword detection
- Logic flow analysis
- Concept coverage evaluation

### 4.3 Transparency Features

- Per-question feedback comments
- Mark deduction justifications
- Digital challenge submission
- Audit trail for all evaluations

---

## 5. Success Metrics

| Metric | Target |
|--------|--------|
| Grading Time Reduction | 60% faster than manual |
| Result Declaration Speed | < 1 week post-exam |
| Student Satisfaction | > 80% find feedback helpful |
| Teacher Override Rate | < 20% of AI suggestions |
| Challenge Resolution Time | < 48 hours |

---

## 6. Project Scope

### In Scope (MVP - 2 Month Prototype)
- Teacher dashboard with upload functionality
- Basic OCR for clear handwriting samples
- LLM-based semantic grading for CS theory questions
- Student portal with results and feedback view
- Basic challenge submission workflow

### Out of Scope (Future Phases)
- Diagram/graph recognition
- Mathematical equation parsing
- Multi-language support
- Real-time proctoring integration
- Mobile applications

---

## 7. Stakeholders

| Role | Responsibilities |
|------|------------------|
| Product Owner | Feature prioritization, stakeholder communication |
| Tech Lead | Architecture decisions, code quality |
| Frontend Developer | React.js UI development |
| Backend Developer | Flask API development |
| AI/ML Engineer | OCR and LLM integration |
| QA Engineer | Testing and quality assurance |

---

## 8. Constraints & Assumptions

### Constraints
- 2-month development timeline
- Limited to clear handwriting samples for MVP
- Single subject domain (Computer Science theory) for prototype
- Dependent on Local LLM/Vision Model performance (LM Studio)

### Assumptions
- Teachers will provide well-structured model answer keys
- Students have web browser access for portal
- Institutional data (attendance, discipline) is available via API or import

---

## 9. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| OCR accuracy issues | High | High | Limit MVP to clear handwriting; implement confidence thresholds |
| LLM hallucination in grading | Medium | High | Human-in-the-loop review; confidence scores |
| Hardware resource limitations | Medium | High | Model quantization; batch processing |
| Scope creep | High | Medium | Strict sprint planning; feature freeze |
| Data privacy concerns | Medium | High | On-premise deployment option; encryption |

---

## 10. Glossary

| Term | Definition |
|------|------------|
| **OCR** | Optical Character Recognition - converting images to text |
| **LLM** | Large Language Model - AI for semantic understanding |
| **Holistic Grading** | Incorporating non-exam factors into evaluation |
| **Model Answer Key** | Reference answers provided by teachers |
| **Challenge** | Student request for grade re-evaluation |
| **JWT** | JSON Web Token - secure authentication mechanism |
| **REST API** | Representational State Transfer API - web service architecture |
| **MVP** | Minimum Viable Product - core features for initial release |

---

## 11. Related Documents

| Document | Description | Link |
|----------|-------------|------|
| **PRD.md** | Product Requirements Document - Detailed functional requirements, user stories, acceptance criteria | [View PRD](PRD.md) |
| **Design.md** | UI/UX Design Document - Design system, wireframes, screen mockups, interaction patterns | [View Design](design.md) |
| **Architecture.md** | Technical Architecture - System diagrams, database schema, API design, security | [View Architecture](architecture.md) |
| **Roadmap.md** | Development Roadmap - Sprint planning, milestones, story points, release schedule | [View Roadmap](roadmap.md) |
| **API_DOCS.md** | API Documentation - Complete API contract for frontend-backend communication | [View API Docs](API_DOCS.md) |

---

## 12. Team Members

### Team Smart-Eval - 4th Semester, CSE

| Role | Name | Responsibilities | Contact |
|------|------|------------------|---------|
| **Product Owner** | TBD | Feature prioritization, stakeholder communication, sprint demos | - |
| **Tech Lead** | TBD | Architecture decisions, code reviews, technical guidance | - |
| **Frontend Developer** | TBD | React.js development, UI implementation, state management | - |
| **Backend Developer** | TBD | Flask API development, database design, authentication | - |
| **AI/ML Engineer** | TBD | OCR integration, LLM prompt engineering, grading algorithm | - |
| **QA/DevOps** | TBD | Testing, CI/CD pipeline, deployment | - |

> **Note:** Update team member names and contacts once finalized.

---

## 13. Quick Start Guide

### Prerequisites
- Node.js 18+ (Frontend)
- Python 3.11+ (Backend)
- MongoDB 7.0+
- Redis 7.0+
- Docker & Docker Compose

### Development Setup
```bash
# Clone repository
git clone https://github.com/team-dad/smart-eval-ai.git
cd smart-eval-ai

# Start all services
docker-compose up -d

# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# MongoDB: localhost:27017
# Redis: localhost:6379
```

### Environment Variables
```bash
# Backend (.env)
FLASK_ENV=development
MONGODB_URI=mongodb://localhost:27017/smarteval
REDIS_URL=redis://localhost:6379
LM_STUDIO_VISION_URL=http://localhost:1234/v1
LM_STUDIO_LLM_URL=http://localhost:1234/v1
JWT_SECRET_KEY=your_secret

# Frontend (.env)
REACT_APP_API_URL=http://localhost:5000/api/v1
```

---

## 14. Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | Team Smart-Eval | Initial draft |
| 1.1 | February 2026 | Team Smart-Eval | Added TOC, related docs, team section, quick start guide |
