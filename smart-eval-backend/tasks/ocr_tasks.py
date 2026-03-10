"""
Celery tasks for OCR processing.
"""

from tasks.celery_app import celery


@celery.task(bind=True, name='ocr.process_sheet')
def process_sheet_task(self, answer_sheet_id: str):
    """
    Async task: run OCR on a single answer sheet.

    Creates a Flask app context so that services can access config.
    """
    from app import create_app
    app = create_app()

    with app.app_context():
        from services.grading_service import GradingService
        return GradingService.process_answer_sheet(answer_sheet_id)


@celery.task(bind=True, name='ocr.process_exam')
def process_exam_task(self, exam_id: str):
    """
    Async task: run OCR on all pending answer sheets for an exam.
    """
    from app import create_app
    app = create_app()

    with app.app_context():
        from services.grading_service import GradingService
        return GradingService.process_exam_sheets(exam_id)
