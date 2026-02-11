# Smart-Eval AI - Design Document

**Version:** 1.1  
**Status:** In Progress  
**Author:** Team Smart-Eval  
**Last Updated:** February 2026

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [User Experience Design](#2-user-experience-design)
3. [Interface Design](#3-interface-design)
4. [Interaction Design](#4-interaction-design)
5. [Responsive Design](#5-responsive-design)
6. [Accessibility](#6-accessibility)
7. [Design Deliverables Checklist](#7-design-deliverables-checklist)
8. [Design Review Checklist](#8-design-review-checklist)
9. [Related Documents](#9-related-documents)
10. [Version History](#10-version-history)

---

## 1. Design Philosophy

### 1.1 Core Principles

1. **Clarity Over Complexity**: Every screen should have a clear purpose and minimal cognitive load
2. **Trust Through Transparency**: AI decisions must always be explainable and visible
3. **Human Control**: Teachers maintain ultimate authority; AI assists, doesn't replace
4. **Progressive Disclosure**: Show essential information first, details on demand
5. **Feedback-Driven**: Every action should have clear feedback and confirmation

### 1.2 Design Goals

- Reduce time-to-task for common workflows
- Build confidence in AI grading through visibility
- Enable efficient batch operations
- Support accessibility requirements

---

## 2. User Experience Design

### 2.1 User Flows

#### Flow 1: Teacher - Complete Exam Evaluation

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Login     │───►│  Dashboard  │───►│ Create Exam │───►│Upload Papers│
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                │
                                                                ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Publish    │◄───│   Review    │◄───│  Configure  │◄───│Upload Answer│
│  Results    │    │   Grades    │    │ Parameters  │    │    Key      │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

#### Flow 2: Student - View Results & Challenge

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Login     │───►│  Results    │───►│  Detailed   │
│             │    │  List       │    │  View       │
└─────────────┘    └─────────────┘    └─────────────┘
                                            │
                              ┌─────────────┴─────────────┐
                              ▼                           ▼
                   ┌─────────────────┐         ┌─────────────────┐
                   │ View Feedback   │         │ Submit Challenge│
                   │ (Satisfied)     │         │ (Dispute)       │
                   └─────────────────┘         └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │ Track Status    │
                                               └─────────────────┘
```

#### Flow 3: AI Processing Pipeline

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  Image   │──►│   OCR    │──►│  Text    │──►│ Semantic │──►│  Score   │
│  Input   │   │ Process  │   │ Extract  │   │ Analysis │   │ + Comment│
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
                    │                              │
                    ▼                              ▼
              ┌──────────┐                  ┌──────────┐
              │Confidence│                  │ Holistic │
              │  Score   │                  │ Adjust   │
              └──────────┘                  └──────────┘
```

### 2.2 Information Architecture

```
Smart-Eval AI
├── Teacher Portal
│   ├── Dashboard
│   │   ├── Recent Exams
│   │   ├── Quick Stats
│   │   └── Pending Actions
│   ├── Exam Management
│   │   ├── Create New Exam
│   │   ├── Exam Details
│   │   ├── Upload Center
│   │   └── Parameter Config
│   ├── Grading Center
│   │   ├── Batch Review
│   │   ├── Individual Review
│   │   └── Override History
│   ├── Results Management
│   │   ├── Preview & Publish
│   │   └── Analytics
│   ├── Challenges
│   │   ├── Pending Queue
│   │   ├── Resolved
│   │   └── Statistics
│   └── Settings
│       ├── Profile
│       ├── Default Parameters
│       └── Notifications
│
├── Student Portal
│   ├── Dashboard
│   │   ├── Recent Results
│   │   └── Notifications
│   ├── Results
│   │   ├── Exam List
│   │   ├── Detailed View
│   │   └── Download Report
│   ├── Challenges
│   │   ├── Submit New
│   │   └── Track Status
│   └── Settings
│       ├── Profile
│       └── Notifications
│
└── Admin Portal (Future)
    ├── User Management
    ├── System Config
    └── Analytics
```

---

## 3. Interface Design

### 3.1 Design System

#### Color Palette

```
Primary Colors:
├── Primary Blue:      #2563EB (Actions, CTAs)
├── Primary Dark:      #1E40AF (Hover states)
└── Primary Light:     #DBEAFE (Backgrounds)

Semantic Colors:
├── Success Green:     #10B981 (Approved, High scores)
├── Warning Amber:     #F59E0B (Pending, Medium scores)
├── Error Red:         #EF4444 (Rejected, Low scores)
└── Info Blue:         #3B82F6 (Information)

Neutral Colors:
├── Gray 900:          #111827 (Primary text)
├── Gray 600:          #4B5563 (Secondary text)
├── Gray 400:          #9CA3AF (Placeholder)
├── Gray 200:          #E5E7EB (Borders)
├── Gray 100:          #F3F4F6 (Backgrounds)
└── White:             #FFFFFF (Cards, inputs)
```

#### Typography

```
Font Family: Inter (Primary), System UI (Fallback)

Headings:
├── H1: 32px / 700 weight / 40px line-height
├── H2: 24px / 600 weight / 32px line-height
├── H3: 20px / 600 weight / 28px line-height
└── H4: 16px / 600 weight / 24px line-height

Body:
├── Large:  16px / 400 weight / 24px line-height
├── Base:   14px / 400 weight / 20px line-height
└── Small:  12px / 400 weight / 16px line-height

Monospace: JetBrains Mono (Code, IDs)
```

#### Spacing System

```
Base unit: 4px

├── xs:   4px   (Tight spacing)
├── sm:   8px   (Related elements)
├── md:   16px  (Section spacing)
├── lg:   24px  (Component separation)
├── xl:   32px  (Major sections)
└── 2xl:  48px  (Page sections)
```

#### Component Library

```
Buttons:
├── Primary:    Blue bg, white text, rounded-lg, shadow-sm
├── Secondary:  White bg, blue text, blue border
├── Danger:     Red bg, white text
└── Ghost:      Transparent, gray text

Inputs:
├── Text:       Border, rounded-md, focus:ring-2
├── Select:     Dropdown with chevron
├── Slider:     Range with value display
└── Checkbox:   Rounded, checkmark icon

Cards:
├── Default:    White bg, shadow-sm, rounded-lg, p-6
├── Interactive: Hover:shadow-md, cursor-pointer
└── Status:     Left border color indicator

Tables:
├── Header:     Gray-100 bg, semibold text
├── Row:        Hover:gray-50, border-b
└── Actions:    Right-aligned icon buttons
```

### 3.2 Key Screen Designs

#### Screen 1: Teacher Dashboard

```
┌────────────────────────────────────────────────────────────────────────┐
│ ┌──────┐  SMART-EVAL AI                      🔔 3   [Dr. Sharma ▼]    │
│ │ Logo │                                                               │
│ └──────┘                                                               │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Welcome back, Dr. Sharma                                        │  │
│  │  You have 3 pending reviews and 2 student challenges             │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│  │   📚 12        │  │   ⏳ 3          │  │   ⚠️ 2          │        │
│  │  Total Exams   │  │  In Progress    │  │  Challenges     │        │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘        │
│                                                                        │
│  Recent Exams                                     [+ Create New Exam]  │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ ● DSA Mid-Term          │ 15 Jan │ 45/50 graded │ [Continue →]  │  │
│  ├─────────────────────────────────────────────────────────────────┤  │
│  │ ✓ DBMS Final Exam       │ 10 Jan │ Published    │ [View →]      │  │
│  ├─────────────────────────────────────────────────────────────────┤  │
│  │ ○ OS Quiz 3             │ 05 Jan │ Configuring  │ [Setup →]     │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Pending Challenges                                      [View All →]  │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ Rahul Kumar (CS2022034) challenged Q3 in DSA Mid-Term    [Review]│  │
│  │ Priya Singh (CS2022019) challenged Q1 in DSA Mid-Term    [Review]│  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

#### Screen 2: Parameter Configuration

```
┌────────────────────────────────────────────────────────────────────────┐
│  ← Back to Exam                    DSA Mid-Term - Configuration        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Grading Strictness                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Lenient ────────────●──────────────────────────────── Strict   │  │
│  │                   MODERATE                                       │  │
│  │                                                                  │  │
│  │  ℹ️ Moderate: Standard evaluation. Partial credit for           │  │
│  │     partially correct answers. Minor errors tolerated.          │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Holistic Parameters                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  ☑️ Enable Attendance-Based Adjustment                          │  │
│  │     Weight: [====5%====] (Max impact on final score)            │  │
│  │                                                                  │  │
│  │     Condition: For borderline answers (40-60%),                 │  │
│  │     if Attendance > [75]%, award [higher/lower ▼] mark          │  │
│  │                                                                  │  │
│  │  ☐ Enable Discipline Score Adjustment                           │  │
│  │  ☐ Enable Class Participation Adjustment                        │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Keyword Weightage                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  ● Exact keyword match required           ○ Synonyms accepted   │  │
│  │                                                                  │  │
│  │  Technical terms weight: [====High====]                         │  │
│  │  Concept explanation weight: [====Medium====]                   │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────┐  ┌──────────────────┐                           │
│  │   Save Draft     │  │  Start Grading → │                           │
│  └──────────────────┘  └──────────────────┘                           │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

#### Screen 3: Grading Review Interface

```
┌────────────────────────────────────────────────────────────────────────┐
│  DSA Mid-Term - Review                     Student 23/50   [Save All] │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Student: Rahul Kumar (CS2022034)          Attendance: 87% ✓          │
│                                                                        │
│  ┌────────────────────────────┬────────────────────────────────────┐  │
│  │  ORIGINAL ANSWER           │  AI EVALUATION                      │  │
│  ├────────────────────────────┼────────────────────────────────────┤  │
│  │                            │                                     │  │
│  │  Q1: Explain BST (20 marks)│  Score: [15] / 20     [Edit]       │  │
│  │                            │                                     │  │
│  │  ┌──────────────────────┐  │  ✓ Definition correct (5/5)        │  │
│  │  │                      │  │  ✓ Properties listed (4/5)         │  │
│  │  │  [Scanned image of   │  │  ✗ Time complexity missing (0/5)   │  │
│  │  │   handwritten        │  │  △ Example incomplete (3/5)        │  │
│  │  │   answer displayed]  │  │  + Attendance bonus (+2)           │  │
│  │  │                      │  │                                     │  │
│  │  │                      │  │  ──────────────────────────────    │  │
│  │  │                      │  │  AI Feedback:                       │  │
│  │  │                      │  │  "Good understanding of BST         │  │
│  │  └──────────────────────┘  │   structure. Missing O(log n)       │  │
│  │                            │   complexity analysis. Example      │  │
│  │  OCR Confidence: 94%       │   shows insertion but not search."  │  │
│  │  [View Extracted Text]     │                                     │  │
│  │                            │  [Edit Feedback]                    │  │
│  └────────────────────────────┴────────────────────────────────────┘  │
│                                                                        │
│  Q2: Explain AVL rotations... │                                       │
│  ┌────────────────────────────┴────────────────────────────────────┐  │
│                                                                        │
│  ┌──────────────┐ ┌───────────────┐ ┌──────────────┐ ┌────────────┐  │
│  │  ← Previous  │ │ Approve All   │ │ Flag Review  │ │   Next →   │  │
│  └──────────────┘ └───────────────┘ └──────────────┘ └────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

#### Screen 4: Student Result View

```
┌────────────────────────────────────────────────────────────────────────┐
│  SMART-EVAL AI                                    Rahul Kumar [Logout] │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ← All Results                                                         │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  DSA Mid-Term Examination                                        │  │
│  │  Date: January 15, 2026                                          │  │
│  │                                                                  │  │
│  │              ┌───────────────────┐                               │  │
│  │              │       72          │                               │  │
│  │              │      ────         │                               │  │
│  │              │      100          │                               │  │
│  │              │                   │                               │  │
│  │              │   Your Score      │                               │  │
│  │              └───────────────────┘                               │  │
│  │                                                                  │  │
│  │  Class Average: 65    Your Rank: 12/50    Grade: B+              │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Question-wise Breakdown                                               │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Q1: Explain Binary Search Tree with examples           15/20   │  │
│  │  ──────────────────────────────────────────────────────────────│  │
│  │                                                                  │  │
│  │  [Your Answer Image]           │  Feedback:                      │  │
│  │  ┌────────────────────────┐    │  ✓ Definition: Correct          │  │
│  │  │                        │    │  ✓ Properties: 4/5 covered      │  │
│  │  │   (Thumbnail)          │    │  ✗ Missing: Time complexity     │  │
│  │  │   [Click to expand]    │    │     analysis O(log n)           │  │
│  │  │                        │    │  △ Example: Insertion shown,    │  │
│  │  └────────────────────────┘    │     search not demonstrated     │  │
│  │                                │                                  │  │
│  │                                │  Holistic Adjustment: +2         │  │
│  │                                │  (Attendance > 85%)              │  │
│  │                                │                                  │  │
│  │                     [Challenge This Grade]                        │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Q2: Implement AVL tree rotations                       18/20   │  │
│  │  [Expand ▼]                                                      │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  [Download PDF Report]                                                 │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Interaction Design

### 4.1 Micro-interactions

#### Upload Progress
```
States:
1. Idle:      [📁 Drop files or click to upload]
2. Hover:     [📁 Drop files here] (blue border pulse)
3. Uploading: [████████░░░░] 67% - Uploading sheet_23.pdf
4. Processing:[⟳] Processing with AI...
5. Complete:  [✓] 50 sheets uploaded successfully
6. Error:     [✗] 3 sheets failed (unclear handwriting)
```

#### Grade Override
```
1. Click edit icon → Input field appears with current value
2. Change value → Yellow highlight indicates unsaved change
3. Save → Brief green flash → Value committed
4. Audit log updated automatically
```

#### Challenge Submission
```
1. Click "Challenge" → Modal slides up
2. Select specific aspect to challenge (checkbox)
3. Type justification (char counter shown)
4. Submit → Confirmation with estimated response time
5. Status badge appears: "Challenge Pending"
```

### 4.2 Loading States

```
Skeleton Screens (preferred for content areas):
┌─────────────────────────────────────┐
│ ████████████████                    │
│ ████████████████████████████████    │
│ ██████████████████                  │
│                                     │
│ [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]  │
└─────────────────────────────────────┘

Spinners (for actions):
[⟳ Processing...] - Inline for buttons
[     ⟳     ] - Centered for page loads
```

### 4.3 Error Handling

```
Inline Errors:
┌─────────────────────────────────────┐
│ Upload failed                       │
│ ✗ sheet_15.pdf - File corrupted    │
│ ✗ sheet_22.pdf - OCR confidence <50%│
│                                     │
│ [Retry Failed] [Skip & Continue]    │
└─────────────────────────────────────┘

Toast Notifications:
┌─────────────────────────────────────┐
│ ✗ Network error. Changes saved      │
│   locally. Will sync when online.   │
│                            [Dismiss]│
└─────────────────────────────────────┘
```

---

## 5. Responsive Design

### 5.1 Breakpoints

```
Mobile:     < 640px   (Single column, stacked layout)
Tablet:     640-1024px (Two column where appropriate)
Desktop:    > 1024px  (Full layout with sidebars)
Wide:       > 1440px  (Comfortable reading width maintained)
```

### 5.2 Mobile Adaptations

**Teacher Dashboard (Mobile)**
- Hamburger menu for navigation
- Cards stack vertically
- Table becomes card list
- Grading review: tabs instead of side-by-side

**Student Portal (Mobile)**
- Results as expandable cards
- Answer image: full-width with pinch-to-zoom
- Challenge form: bottom sheet

---

## 6. Accessibility

### 6.1 Requirements

```
WCAG 2.1 AA Compliance:
├── Color contrast ratio: ≥ 4.5:1 for text
├── Focus indicators: Visible on all interactive elements
├── Keyboard navigation: Full support without mouse
├── Screen reader: ARIA labels on all controls
├── Alt text: All images, including answer sheets
└── Error identification: Clear, specific messages
```

### 6.2 Specific Considerations

- **Answer Images**: Provide OCR text as accessible alternative
- **Charts/Graphs**: Include data tables as alternatives
- **Color-coded status**: Always pair with icons/text
- **Time limits**: None for critical actions; warnings for sessions

---

## 7. Design Deliverables Checklist

### Phase 1 (MVP)
- [ ] Design system documentation
- [ ] High-fidelity mockups for all primary screens
- [ ] Interactive prototype (Figma)
- [ ] Component specifications for developers
- [ ] Icon set and asset export

### Phase 2 (Enhancement)
- [ ] Animation specifications
- [ ] Dark mode design
- [ ] Email templates
- [ ] Print stylesheets (report cards)

---

## 8. Design Review Checklist

Before handoff, verify:

- [ ] All states designed (empty, loading, error, success)
- [ ] Edge cases covered (long text, missing data)
- [ ] Mobile layouts complete
- [ ] Accessibility requirements met
- [ ] Design tokens documented
- [ ] Developer questions answered in specs

---

## 9. Related Documents

| Document | Description |
|----------|-------------|
| [PRD.md](PRD.md) | Product Requirements - User stories and acceptance criteria |
| [Architecture.md](architecture.md) | Technical Architecture - Component structure for implementation |
| [Roadmap.md](roadmap.md) | Development timeline - Design deliverable deadlines |
| [API_DOCS.md](API_DOCS.md) | API Documentation - Data structures for UI |
| [project-overview.md](project-overview.md) | Project summary and stakeholders |

---

## 10. Version History

| Version | Date | Author | Changes |
|---------|------|--------|--------|
| 1.0 | January 2026 | Team Smart-Eval | Initial design system and wireframes |
| 1.1 | February 2026 | Team Smart-Eval | Added TOC, related docs, version history |
