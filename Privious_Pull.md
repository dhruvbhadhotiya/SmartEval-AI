@Copilot commented on this pull request.

Pull request overview
Implements Sprint 5’s end-to-end LLM grading workflow for Smart-Eval, spanning new backend grading/evaluation infrastructure and new teacher-facing UI for configuring and reviewing grading.

Changes:

Added backend LLM provider abstraction, grading pipeline, and persisted Evaluation / QuestionEvaluation results with new grading API endpoints.
Added teacher UI for grading configuration, model answer editing (incl. PDF OCR extraction), and evaluation viewing, plus grading actions + polling on Exam Details.
Updated response/status handling and answer sheet serialization to expose grading results (e.g., score).
Reviewed changes
Copilot reviewed 15 out of 15 changed files in this pull request and generated 11 comments.

Show a summary per file
File	Description
sprints/Sprint-5-Documentation.md	Sprint 5 implementation/architecture documentation for the grading engine.
smart-eval-frontend/src/services/gradingService.ts	Adds grading/evaluation/model-answer/config API client methods + types.
smart-eval-frontend/src/services/examService.ts	Extends Exam type to include model_answer.parsed_answers.
smart-eval-frontend/src/pages/teacher/ExamDetailsPage.tsx	Adds grading actions, polling, model answers modal, evaluation modal, and QP OCR extraction UI.
smart-eval-frontend/src/index.css	Switches base styling to light theme defaults.
smart-eval-frontend/src/components/teacher/ModelAnswerModal.tsx	New modal for per-question model answers + PDF extraction + comma-safe keyword/concept inputs.
smart-eval-frontend/src/components/teacher/GradingConfigPanel.tsx	New panel to set strictness/keyword mode and persist to backend.
smart-eval-frontend/src/components/teacher/EvaluationModal.tsx	New modal to view overall + per-question evaluation details and OCR text.
smart-eval-backend/utils/helpers.py	Fixes error_response() to return correct HTTP status codes for numeric codes.
smart-eval-backend/services/llm_service.py	Implements multi-provider LLM grading calls, prompt construction, and JSON parsing.
smart-eval-backend/services/grading_service.py	Implements grading pipeline: OCR text concat → per-question LLM grading → Evaluation persistence → stats update.
smart-eval-backend/models/evaluation.py	Introduces Evaluation and embedded QuestionEvaluation documents + serialization.
smart-eval-backend/models/answer_sheet.py	Adds score/marks fields to to_dict() for graded sheets (via evaluation lookup).
smart-eval-backend/api/v1/grading/routes.py	Adds grading endpoints and background-thread batch grading trigger.
smart-eval-backend/api/v1/exams/routes.py	Adds parsed model-answer save endpoint, grading config endpoint, and OCR extract endpoints for PDFs.
💡 Add Copilot custom instructions for smarter, more guided reviews. Learn how to get started.

In smart-eval-frontend/src/pages/teacher/ExamDetailsPage.tsx:

> @@ -345,7 +466,31 @@ const ExamDetailsPage: React.FC = () => {
                         <span>Run OCR</span>
                       )}
                     </button>
+                    <button
+                      onClick={handleRunGrading}
+                      disabled={isGrading || !answerSheets.some(s => s.status === 'ocr_completed' || s.status === 'graded')}
The "Run Grading" button enables when there are any graded sheets, but the backend /grading/exams/<id>/grade currently only queues sheets in ocr_completed or failed. If all sheets are already graded, this will enable the button but the API returns "No sheets ready for grading". Align the UI condition with backend eligibility, or update the backend to include graded when re-grading is intended.

⬇️ Suggested change
-                      disabled={isGrading || !answerSheets.some(s => s.status === 'ocr_completed' || s.status === 'graded')}
+                      disabled={isGrading || !answerSheets.some(s => s.status === 'ocr_completed' || s.status === 'failed')}
In smart-eval-frontend/src/components/teacher/ModelAnswerModal.tsx:

> +        question_number: answers.length + 1,
+        max_marks: 0,
+        answer_text: '',
+        keywords: [],
+        concepts: [],
+      },
+    ])
+  }
+
+  const removeQuestion = (idx: number) => {
+    if (answers.length <= 1) return
+    const updated = answers.filter((_, i) => i !== idx).map((a, i) => ({
+      ...a,
+      question_number: i + 1,
+    }))
+    setAnswers(updated)
removeQuestion renumbers answers, but keywordsRaw / conceptsRaw are keyed by array index and aren’t updated when an item is removed. After deleting a question, the raw keyword/concept inputs (and the values saved) can shift to the wrong question. Update the raw maps when removing/reordering, or store the raw strings alongside each answer entry instead of in separate index-keyed state.

⬇️ Suggested change
-    setAnswers(updated)
+    setAnswers(updated)
+
+    // Keep raw keyword/concept inputs aligned with answers after removal
+    setKeywordsRaw(prev => {
+      const next: Record<number, string> = {}
+      Object.keys(prev).forEach(key => {
+        const i = parseInt(key, 10)
+        if (Number.isNaN(i)) return
+        if (i < idx) {
+          next[i] = prev[i]
+        } else if (i > idx) {
+          next[i - 1] = prev[i]
+        }
+        // skip i === idx (removed question)
+      })
+      return next
+    })
+
+    setConceptsRaw(prev => {
+      const next: Record<number, string> = {}
+      Object.keys(prev).forEach(key => {
+        const i = parseInt(key, 10)
+        if (Number.isNaN(i)) return
+        if (i < idx) {
+          next[i] = prev[i]
+        } else if (i > idx) {
+          next[i - 1] = prev[i]
+        }
+        // skip i === idx (removed question)
+      })
+      return next
+    })
In smart-eval-frontend/src/components/teacher/ModelAnswerModal.tsx:

> +      if (!a.answer_text.trim()) {
+        setError(`Question ${a.question_number}: Answer text is required`)
+        return
+      }
+      if (a.max_marks <= 0) {
+        setError(`Question ${a.question_number}: Max marks must be > 0`)
+        return
+      }
+    }
+
+    setIsSaving(true)
+    try {
+      await gradingService.saveParsedModelAnswers(examId, finalAnswers)
+      onSaved()
+    } catch (err: any) {
+      setError(err?.response?.data?.error || err.message || 'Failed to save')
Error handling here uses err?.response?.data?.error, but backend errors are shaped like { error: { message, code } }. Rendering error directly will often show [object Object] instead of the message. Prefer err?.response?.data?.error?.message (and optionally fall back to err?.response?.data?.message).

⬇️ Suggested change
-      setError(err?.response?.data?.error || err.message || 'Failed to save')
+      setError(
+        err?.response?.data?.error?.message ||
+        err?.response?.data?.message ||
+        err.message ||
+        'Failed to save'
+      )
In smart-eval-backend/services/grading_service.py:

> +        """
+        Grade a single OCR-completed answer sheet using the LLM.
+
+        Steps:
+            1. Load the answer sheet (must be ocr_completed)
+            2. Load the exam and its parsed model answers
+            3. Concatenate all OCR page text
+            4. Call LLMService for each question
+            5. Create/update Evaluation document
+            6. Update sheet status to 'graded'
+        """
+        sheet = AnswerSheet.objects(id=answer_sheet_id).first()
+        if not sheet:
+            raise NotFoundError(f"Answer sheet {answer_sheet_id} not found")
+
+        if sheet.status not in ('ocr_completed', 'graded', 'failed', 'processing'):
grade_answer_sheet allows sheet.status == 'processing'. Since processing is also used during OCR (see process_answer_sheet), this can attempt grading while OCR is still running or before OCR results are saved, leading to false failures or incorrect grading. Consider restricting grading to ocr_completed (and optionally graded for re-grade) or introducing a separate status/stage flag for grading processing.

⬇️ Suggested change
-        if sheet.status not in ('ocr_completed', 'graded', 'failed', 'processing'):
+        if sheet.status not in ('ocr_completed', 'graded'):
In smart-eval-backend/models/answer_sheet.py:

> +        # Include score from evaluation if graded
+        if self.status == 'graded':
+            from models.evaluation import Evaluation
+            evaluation = Evaluation.objects(answer_sheet_id=self).first()
+            if evaluation:
+                data['score'] = evaluation.percentage
+                data['marks_awarded'] = evaluation.total_marks_awarded
+                data['max_marks'] = evaluation.total_max_marks
This adds an extra DB lookup per graded sheet (Evaluation.objects(...).first() inside to_dict). When listing many answer sheets this becomes an N+1 query pattern and will slow down /grading/exams/<id>/sheets. Consider denormalizing score/marks onto AnswerSheet at grading time, or fetching evaluations in bulk in the route and stitching scores onto the response.

In smart-eval-frontend/src/components/teacher/ModelAnswerModal.tsx:

> +    try {
+      const response = await gradingService.extractModelAnswerText(examId)
+      const pages = response.data?.pages || []
+      if (pages.length === 0) {
+        setError('No text could be extracted from the model answer PDF')
+        return
+      }
+      // Combine all page text and pre-fill as a single question answer
+      const fullText = pages.map((p: any) => p.text).join('\n\n')
+      setAnswers([{
+        question_number: 1,
+        max_marks: maxMarks,
+        answer_text: fullText,
+        keywords: [],
+        concepts: [],
+      }])
After "Extract from PDF", answers is replaced with a single question, but keywordsRaw / conceptsRaw aren’t reset. On save, finalAnswers uses these raw maps, so stale keyword/concept strings from the previous state can be applied to the extracted answer. Reset the raw maps when overwriting answers (e.g., set them to {0: ''}) to avoid leaking old values.

⬇️ Suggested change
-      }])
+      }])
+      // Reset raw keyword/concept maps to avoid leaking stale values
+      setKeywordsRaw({ 0: '' })
+      setConceptsRaw({ 0: '' })
In smart-eval-frontend/src/components/teacher/GradingConfigPanel.tsx:

> +  onUpdated,
+}: GradingConfigPanelProps) {
+  const [strictness, setStrictness] = useState(currentStrictness)
+  const [keywordMode, setKeywordMode] = useState(currentKeywordMode)
+  const [isSaving, setIsSaving] = useState(false)
+  const [message, setMessage] = useState<string | null>(null)
+
+  const handleSave = async () => {
+    setIsSaving(true)
+    setMessage(null)
+    try {
+      await gradingService.updateGradingConfig(examId, { strictness, keyword_mode: keywordMode })
+      setMessage('Configuration saved!')
+      onUpdated()
+    } catch (err: any) {
+      setMessage(err?.response?.data?.error || 'Failed to save')
setMessage(err?.response?.data?.error || 'Failed to save') will often stringify to [object Object] because backend errors are { error: { message, code } }. Use err?.response?.data?.error?.message (and/or err?.response?.data?.message) so users see a readable message.

⬇️ Suggested change
-      setMessage(err?.response?.data?.error || 'Failed to save')
+      setMessage(
+        err?.response?.data?.error?.message ||
+          err?.response?.data?.message ||
+          'Failed to save',
+      )
In smart-eval-backend/services/grading_service.py:

> +                'status': 'failed',
+                'error': str(e),
+            }
+
+    @staticmethod
+    def grade_exam_sheets(exam_id: str) -> dict:
+        """
+        Grade all OCR-completed answer sheets for an exam.
+        """
+        exam = Exam.objects(id=exam_id).first()
+        if not exam:
+            raise NotFoundError(f"Exam {exam_id} not found")
+
+        sheets = AnswerSheet.objects(
+            exam_id=exam,
+            status__in=['ocr_completed', 'graded', 'failed', 'processing']
grade_exam_sheets queries sheets with status__in=['ocr_completed','graded','failed','processing']. Including processing is risky because that status is also used for OCR-in-progress; this can cause grading to run on sheets mid-OCR and mark them failed. If the intent is to only grade OCR-completed (and maybe regrade graded/failed), drop processing here or differentiate OCR vs grading processing states.

⬇️ Suggested change
-            status__in=['ocr_completed', 'graded', 'failed', 'processing']
+            status__in=['ocr_completed', 'graded', 'failed']
In smart-eval-backend/api/v1/exams/routes.py:

> +            parsed_list.append(ParsedAnswer(
+                question_number=int(qn),
+                max_marks=float(mm),
+                answer_text=ans.get('answer_text', ''),
+                keywords=ans.get('keywords', []),
+                concepts=ans.get('concepts', []),
save_parsed_model_answers casts question_number/max_marks but does not validate that they’re positive (and doesn’t validate types for keywords/concepts). This can persist invalid model answers (e.g., 0/negative marks or non-list keyword payloads) and later break grading/scoring math. Add server-side validation for question_number >= 1, max_marks > 0, and ensure keywords/concepts are lists of strings (or coerce safely).

⬇️ Suggested change
-            parsed_list.append(ParsedAnswer(
-                question_number=int(qn),
-                max_marks=float(mm),
-                answer_text=ans.get('answer_text', ''),
-                keywords=ans.get('keywords', []),
-                concepts=ans.get('concepts', []),
+            try:
+                question_number = int(qn)
+                max_marks = float(mm)
+            except (TypeError, ValueError):
+                return error_response("question_number must be an integer and max_marks must be a number", 400)
+
+            if question_number < 1:
+                return error_response("question_number must be at least 1", 400)
+
+            if max_marks <= 0:
+                return error_response("max_marks must be greater than 0", 400)
+
+            raw_keywords = ans.get('keywords', [])
+            if raw_keywords is None:
+                raw_keywords = []
+            if not isinstance(raw_keywords, list):
+                return error_response("keywords must be an array of strings", 400)
+            keywords = [str(k) for k in raw_keywords if k is not None]
+
+            raw_concepts = ans.get('concepts', [])
+            if raw_concepts is None:
+                raw_concepts = []
+            if not isinstance(raw_concepts, list):
+                return error_response("concepts must be an array of strings", 400)
+            concepts = [str(c) for c in raw_concepts if c is not None]
+
+            parsed_list.append(ParsedAnswer(
+                question_number=question_number,
+                max_marks=max_marks,
+                answer_text=ans.get('answer_text', ''),
+                keywords=keywords,
+                concepts=concepts,
In smart-eval-backend/api/v1/grading/routes.py:

>  """
 
-from flask import Blueprint, request
+from flask import Blueprint, request, jsonify
Unused import: jsonify is imported here but not used anywhere in this module. Please remove it to keep the file clean and avoid lint warnings.

⬇️ Suggested change
-from flask import Blueprint, request, jsonify
+from flask import Blueprint, request
In smart-eval-frontend/src/pages/teacher/ExamDetailsPage.tsx:

> +  // Polling: refresh sheets every 5s while any are in 'processing' state
+  useEffect(() => {
+    const hasProcessing = answerSheets.some(s => s.status === 'processing');
+    if (hasProcessing || isGrading) {
+      if (!pollingRef.current) {
+        pollingRef.current = window.setInterval(async () => {
+          await loadAnswerSheets();
+          if (examId) dispatch(fetchExamById(examId));
+        }, 5000);
+      }
+    } else {
+      if (pollingRef.current) {
+        clearInterval(pollingRef.current);
+        pollingRef.current = null;
+      }
+    }
+    return () => {
+      if (pollingRef.current) {
+        clearInterval(pollingRef.current);
+        pollingRef.current = null;
+      }
+    };
+  }, [answerSheets, isGrading]);
The polling useEffect depends on answerSheets, and the cleanup always clears the interval. Because loadAnswerSheets() updates answerSheets on every tick, the interval will be torn down and recreated repeatedly (and can cause unnecessary timers/network churn). Consider making the effect depend on a derived boolean (e.g., hasProcessing) and/or manage polling with a stable interval that isn’t recreated on each answerSheets update