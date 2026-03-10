"""
Grading / OCR API Routes

Endpoints for triggering OCR processing and retrieving results.
"""

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from services.exam_service import ExamService
from services.grading_service import GradingService
from models.answer_sheet import AnswerSheet
from models.exam import Exam
from utils.decorators import role_required
from utils.helpers import success_response, error_response
from utils.exceptions import NotFoundError, ForbiddenError


grading_bp = Blueprint('grading', __name__, url_prefix='/grading')


# ------------------------------------------------------------------
# Trigger OCR
# ------------------------------------------------------------------

@grading_bp.route('/exams/<exam_id>/process', methods=['POST'])
@jwt_required()
@role_required(['teacher'])
def start_ocr_processing(exam_id):
    """
    Trigger OCR processing for all pending answer sheets of an exam.

    POST /api/v1/grading/exams/:exam_id/process
    Query param: ?async=true  →  offload to Celery (requires Redis)

    Default is synchronous so it works without Redis during development.
    """
    try:
        current_user_id = get_jwt_identity()

        # Verify exam ownership
        exam = ExamService.get_exam_by_id(exam_id, teacher_id=current_user_id)

        use_async = request.args.get('async', 'false').lower() == 'true'

        if use_async:
            from tasks.ocr_tasks import process_exam_task
            task = process_exam_task.delay(exam_id)
            return success_response(
                data={'task_id': task.id, 'status': 'queued'},
                message="OCR processing queued"
            )

        # Synchronous (default)
        result = GradingService.process_exam_sheets(exam_id)
        return success_response(data=result, message="OCR processing complete")

    except NotFoundError as e:
        return error_response(str(e), 404)
    except ForbiddenError as e:
        return error_response(str(e), 403)
    except Exception as e:
        return error_response(f"OCR processing failed: {str(e)}", 500)


@grading_bp.route('/sheets/<sheet_id>/process', methods=['POST'])
@jwt_required()
@role_required(['teacher'])
def process_single_sheet(sheet_id):
    """
    Trigger OCR on a single answer sheet.

    POST /api/v1/grading/sheets/:sheet_id/process
    """
    try:
        current_user_id = get_jwt_identity()

        sheet = AnswerSheet.objects(id=sheet_id).first()
        if not sheet:
            return error_response("Answer sheet not found", 404)

        # Verify ownership through exam
        ExamService.get_exam_by_id(str(sheet.exam_id.id), teacher_id=current_user_id)

        use_async = request.args.get('async', 'false').lower() == 'true'

        if use_async:
            from tasks.ocr_tasks import process_sheet_task
            task = process_sheet_task.delay(sheet_id)
            return success_response(
                data={'task_id': task.id, 'status': 'queued'},
                message="OCR processing queued"
            )

        result = GradingService.process_answer_sheet(sheet_id)
        return success_response(data=result, message="OCR processing complete")

    except NotFoundError as e:
        return error_response(str(e), 404)
    except ForbiddenError as e:
        return error_response(str(e), 403)
    except Exception as e:
        return error_response(f"OCR processing failed: {str(e)}", 500)


# ------------------------------------------------------------------
# Answer sheets listing & results
# ------------------------------------------------------------------

@grading_bp.route('/exams/<exam_id>/sheets', methods=['GET'])
@jwt_required()
@role_required(['teacher'])
def list_answer_sheets(exam_id):
    """
    List answer sheets for an exam with their processing status.

    GET /api/v1/grading/exams/:exam_id/sheets
    Query: ?status=uploaded|processing|ocr_completed|graded|failed
           &include_ocr=true (include OCR text — large payload)
    """
    try:
        current_user_id = get_jwt_identity()
        exam = ExamService.get_exam_by_id(exam_id, teacher_id=current_user_id)

        query = {'exam_id': exam}
        status_filter = request.args.get('status')
        if status_filter:
            query['status'] = status_filter

        sheets = AnswerSheet.objects(**query).order_by('-created_at')
        include_ocr = request.args.get('include_ocr', 'false').lower() == 'true'

        data = [s.to_dict(include_ocr=include_ocr) for s in sheets]
        return success_response(data=data)

    except NotFoundError as e:
        return error_response(str(e), 404)
    except ForbiddenError as e:
        return error_response(str(e), 403)
    except Exception as e:
        return error_response(f"Failed to list answer sheets: {str(e)}", 500)


@grading_bp.route('/sheets/<sheet_id>', methods=['GET'])
@jwt_required()
@role_required(['teacher'])
def get_answer_sheet(sheet_id):
    """
    Get a single answer sheet with OCR results.

    GET /api/v1/grading/sheets/:sheet_id
    """
    try:
        current_user_id = get_jwt_identity()

        sheet = AnswerSheet.objects(id=sheet_id).first()
        if not sheet:
            return error_response("Answer sheet not found", 404)

        # Verify ownership
        ExamService.get_exam_by_id(str(sheet.exam_id.id), teacher_id=current_user_id)

        return success_response(data=sheet.to_dict(include_ocr=True))

    except NotFoundError as e:
        return error_response(str(e), 404)
    except ForbiddenError as e:
        return error_response(str(e), 403)
    except Exception as e:
        return error_response(f"Failed to get answer sheet: {str(e)}", 500)


# ------------------------------------------------------------------
# Task status (for async Celery jobs)
# ------------------------------------------------------------------

@grading_bp.route('/tasks/<task_id>', methods=['GET'])
@jwt_required()
@role_required(['teacher'])
def get_task_status(task_id):
    """
    Check status of an async OCR task.

    GET /api/v1/grading/tasks/:task_id
    """
    try:
        from tasks.celery_app import celery
        task = celery.AsyncResult(task_id)

        response = {
            'task_id': task_id,
            'status': task.status,  # PENDING, STARTED, SUCCESS, FAILURE
        }

        if task.ready():
            response['result'] = task.result

        return success_response(data=response)

    except Exception as e:
        return error_response(f"Failed to get task status: {str(e)}", 500)
