"""
Grading Service

Orchestrates the full pipeline: OCR extraction → (future) LLM grading.
Called by Celery tasks for async processing.
"""

import os
from datetime import datetime
from flask import current_app

from models.answer_sheet import AnswerSheet, OCRResult
from models.exam import Exam
from services.ocr_service import OCRService
from utils.exceptions import ValidationError, NotFoundError


class GradingService:
    """Orchestrates OCR processing and (future) grading for answer sheets."""

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
