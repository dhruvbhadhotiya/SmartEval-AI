"""
Grading Service

Orchestrates the full pipeline: OCR extraction → LLM grading.
Called by Celery tasks for async processing.
"""

import os
from datetime import datetime
from flask import current_app

from models.answer_sheet import AnswerSheet, OCRResult
from models.exam import Exam
from models.evaluation import Evaluation, QuestionEvaluation
from services.ocr_service import OCRService
from services.llm_service import LLMService
from utils.exceptions import ValidationError, NotFoundError


class GradingService:
    """Orchestrates OCR processing and LLM grading for answer sheets."""

    @staticmethod
    def process_answer_sheet(answer_sheet_id: str) -> dict:
        """
        Run OCR on a single answer sheet.

        Steps:
            1. Look up the AnswerSheet document
            2. Resolve the file on disk
            3. Run OCR extraction via the Vision model
            4. Store OCR results on the document
            5. Update status to 'ocr_completed'

        Returns:
            dict summary of the processing result
        """
        sheet = AnswerSheet.objects(id=answer_sheet_id).first()
        if not sheet:
            raise NotFoundError(f"Answer sheet {answer_sheet_id} not found")

        # Mark processing started
        sheet.status = 'processing'
        sheet.add_processing_log('ocr', 'started')

        try:
            # Resolve absolute file path
            file_url = sheet.original_file.url  # e.g. /uploads/exams/<id>/answer_sheets/file.png
            upload_folder = current_app.config.get('UPLOAD_FOLDER', './uploads')
            # Strip leading /uploads/ to get relative path inside upload folder
            relative = file_url.lstrip('/')
            if relative.startswith('uploads/'):
                relative = relative[len('uploads/'):]
            abs_path = os.path.abspath(os.path.join(upload_folder, relative))

            print(f"[GradingService] Processing sheet {answer_sheet_id}")
            print(f"[GradingService] File path: {abs_path}")
            print(f"[GradingService] Provider: {current_app.config.get('VISION_PROVIDER')}")

            # Run OCR — returns list of per-page results
            page_results = OCRService.extract_text(abs_path)

            # Store per-page OCR results
            ocr_entries = []
            total_chars = 0
            for page in page_results:
                entry = OCRResult(
                    page_number=page['page_number'],
                    text=page['text'],
                    confidence=page['confidence'],
                    processed_at=page['processed_at']
                )
                ocr_entries.append(entry)
                total_chars += len(page['text'])

            sheet.ocr_results = ocr_entries
            sheet.original_file.pages = len(page_results)
            sheet.status = 'ocr_completed'
            sheet.add_processing_log('ocr', 'completed', {
                'pages': len(page_results),
                'total_characters': total_chars
            })

            print(f"[GradingService] OCR completed: {len(page_results)} page(s), {total_chars} chars")

            return {
                'answer_sheet_id': str(sheet.id),
                'status': 'ocr_completed',
                'pages': len(page_results),
                'text_length': total_chars
            }

        except Exception as e:
            print(f"[GradingService] OCR FAILED for {answer_sheet_id}: {str(e)}")
            sheet.status = 'failed'
            sheet.add_processing_log('ocr', 'failed', {'error': str(e)})
            return {
                'answer_sheet_id': str(sheet.id),
                'status': 'failed',
                'error': str(e)
            }

    @staticmethod
    def process_exam_sheets(exam_id: str) -> dict:
        """
        Run OCR on all uploaded answer sheets for an exam.

        Returns:
            dict with processed, failed counts and per-sheet results
        """
        exam = Exam.objects(id=exam_id).first()
        if not exam:
            raise NotFoundError(f"Exam {exam_id} not found")

        sheets = AnswerSheet.objects(exam_id=exam, status__in=['uploaded', 'failed'])
        print(f"[GradingService] Found {sheets.count()} sheets to process (uploaded + failed)")
        results = []
        processed = 0
        failed = 0

        for sheet in sheets:
            result = GradingService.process_answer_sheet(str(sheet.id))
            results.append(result)
            if result['status'] == 'ocr_completed':
                processed += 1
            else:
                failed += 1

        return {
            'exam_id': exam_id,
            'total': len(results),
            'processed': processed,
            'failed': failed,
            'results': results
        }

    # ------------------------------------------------------------------
    # LLM Grading (Sprint 5)
    # ------------------------------------------------------------------

    @staticmethod
    def grade_answer_sheet(answer_sheet_id: str) -> dict:
        """
        Grade a single OCR-completed answer sheet using the LLM.

        Steps:
            1. Load the answer sheet (must be ocr_completed)
            2. Load the exam and its parsed model answers
            3. Concatenate all OCR page text
            4. Call LLMService for each question
            5. Create/update Evaluation document
            6. Update sheet status to 'graded'
        """
        sheet = AnswerSheet.objects(id=answer_sheet_id).first()
        if not sheet:
            raise NotFoundError(f"Answer sheet {answer_sheet_id} not found")

        if sheet.status not in ('ocr_completed', 'graded', 'processing'):
            raise ValidationError(
                f"Sheet must be OCR-completed before grading. Current status: {sheet.status}"
            )

        exam = Exam.objects(id=sheet.exam_id.id).first()
        if not exam:
            raise NotFoundError("Exam not found for this answer sheet")

        # Check model answers exist
        if not exam.model_answer or not exam.model_answer.parsed_answers:
            raise ValidationError(
                "No parsed model answers configured for this exam. "
                "Please add model answers before grading."
            )

        parsed_answers = [
            {
                'question_number': pa.question_number,
                'max_marks': pa.max_marks,
                'answer_text': pa.answer_text or '',
                'keywords': pa.keywords or [],
                'concepts': pa.concepts or [],
            }
            for pa in exam.model_answer.parsed_answers
        ]

        # Concatenate OCR text from all pages
        ocr_text = '\n'.join(
            ocr.text for ocr in (sheet.ocr_results or []) if ocr.text
        )

        if not ocr_text.strip():
            raise ValidationError("No OCR text available for grading.")

        strictness = 'moderate'
        if exam.grading_config:
            strictness = exam.grading_config.strictness or 'moderate'

        sheet.add_processing_log('grading', 'started')
        print(f"[GradingService] Grading sheet {answer_sheet_id} ({len(parsed_answers)} questions, strictness={strictness})")

        try:
            # Call LLM for each question
            llm_results = LLMService.grade_full_sheet(
                ocr_text=ocr_text,
                parsed_answers=parsed_answers,
                strictness=strictness,
            )

            # Build evaluation
            question_evals = []
            total_awarded = 0.0
            total_max = 0.0
            total_confidence = 0.0

            for r in llm_results:
                qe = QuestionEvaluation(
                    question_number=r['question_number'],
                    max_marks=r['max_marks'],
                    marks_awarded=r['marks_awarded'],
                    feedback=r['feedback'],
                    confidence=r['confidence'],
                    keywords_found=r.get('keywords_found', []),
                    keywords_missing=r.get('keywords_missing', []),
                    concepts_covered=r.get('concepts_covered', []),
                    concepts_missing=r.get('concepts_missing', []),
                )
                question_evals.append(qe)
                total_awarded += r['marks_awarded']
                total_max += r['max_marks']
                total_confidence += r['confidence']

            # Use exam max_marks for percentage so stats match exam configuration
            exam_max = exam.max_marks or total_max
            percentage = (total_awarded / exam_max * 100) if exam_max > 0 else 0.0
            avg_confidence = (total_confidence / len(llm_results)) if llm_results else 0.0

            # Create or update Evaluation document
            evaluation = Evaluation.objects(answer_sheet_id=sheet).first()
            if not evaluation:
                evaluation = Evaluation(
                    answer_sheet_id=sheet,
                    exam_id=exam,
                )

            evaluation.question_evaluations = question_evals
            evaluation.total_marks_awarded = round(total_awarded, 2)
            evaluation.total_max_marks = round(total_max, 2)
            evaluation.percentage = round(percentage, 2)
            evaluation.overall_confidence = round(avg_confidence, 2)
            evaluation.overall_feedback = GradingService._generate_overall_feedback(
                percentage, total_awarded, total_max
            )
            evaluation.strictness = strictness
            evaluation.status = 'completed'
            evaluation.graded_at = datetime.utcnow()
            evaluation.save()

            # Update sheet status
            sheet.status = 'graded'
            sheet.add_processing_log('grading', 'completed', {
                'total_marks': total_awarded,
                'max_marks': total_max,
                'percentage': round(percentage, 2),
                'questions_graded': len(llm_results),
            })

            print(f"[GradingService] Grading complete: {total_awarded}/{total_max} ({percentage:.1f}%)")

            return {
                'answer_sheet_id': str(sheet.id),
                'status': 'graded',
                'total_marks_awarded': round(total_awarded, 2),
                'total_max_marks': round(total_max, 2),
                'percentage': round(percentage, 2),
                'questions_graded': len(llm_results),
                'evaluation_id': str(evaluation.id),
            }

        except Exception as e:
            print(f"[GradingService] GRADING FAILED for {answer_sheet_id}: {str(e)}")
            import traceback
            traceback.print_exc()
            sheet.status = 'failed'
            sheet.add_processing_log('grading', 'failed', {'error': str(e)})
            return {
                'answer_sheet_id': str(sheet.id),
                'status': 'failed',
                'error': str(e),
            }

    @staticmethod
    def grade_exam_sheets(exam_id: str) -> dict:
        """
        Grade all OCR-completed answer sheets for an exam.
        """
        exam = Exam.objects(id=exam_id).first()
        if not exam:
            raise NotFoundError(f"Exam {exam_id} not found")

        sheets = AnswerSheet.objects(
            exam_id=exam,
            status__in=['ocr_completed', 'graded', 'failed', 'processing']
        )
        print(f"[GradingService] Found {sheets.count()} sheets to grade")

        results = []
        graded = 0
        failed = 0

        for sheet in sheets:
            try:
                result = GradingService.grade_answer_sheet(str(sheet.id))
                results.append(result)
                if result['status'] == 'graded':
                    graded += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"[GradingService] Sheet {sheet.id} error: {str(e)}")
                results.append({
                    'answer_sheet_id': str(sheet.id),
                    'status': 'failed',
                    'error': str(e),
                })
                failed += 1

        # Update exam statistics
        all_evals = Evaluation.objects(exam_id=exam, status='completed')
        if all_evals.count() > 0:
            scores = [e.percentage for e in all_evals]
            exam.update_statistics(
                graded=all_evals.count(),
                average_score=round(sum(scores) / len(scores), 2),
                highest_score=round(max(scores), 2),
                lowest_score=round(min(scores), 2),
            )

        return {
            'exam_id': exam_id,
            'total': len(results),
            'graded': graded,
            'failed': failed,
            'results': results,
        }

    @staticmethod
    def _generate_overall_feedback(percentage: float, awarded: float, max_marks: float) -> str:
        if percentage >= 90:
            return f"Excellent performance! Scored {awarded}/{max_marks}."
        elif percentage >= 75:
            return f"Good performance. Scored {awarded}/{max_marks}. Minor areas for improvement."
        elif percentage >= 50:
            return f"Average performance. Scored {awarded}/{max_marks}. Several concepts need review."
        elif percentage >= 35:
            return f"Below average. Scored {awarded}/{max_marks}. Significant gaps in understanding."
        else:
            return f"Needs improvement. Scored {awarded}/{max_marks}. Please review the material thoroughly."

