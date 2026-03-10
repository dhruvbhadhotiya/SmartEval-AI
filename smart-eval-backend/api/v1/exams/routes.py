"""
Exam API Routes

RESTful endpoints for exam management
"""
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError as MarshmallowValidationError

from services.exam_service import ExamService
from services.storage_service import StorageService
from api.v1.exams.schemas import (
    CreateExamSchema,
    UpdateExamSchema,
    ExamQuerySchema,
    UpdateStatusSchema
)
from utils.decorators import role_required
from utils.helpers import success_response, error_response
from utils.exceptions import ValidationError, NotFoundError, ForbiddenError
from models.exam import QuestionPaper, ModelAnswer
from models.answer_sheet import AnswerSheet as AnswerSheetDoc, OriginalFile


exam_bp = Blueprint('exams', __name__, url_prefix='/exams')

# Schema instances
create_exam_schema = CreateExamSchema()
update_exam_schema = UpdateExamSchema()
query_schema = ExamQuerySchema()
status_schema = UpdateStatusSchema()


@exam_bp.route('', methods=['GET'])
@jwt_required()
@role_required(['teacher'])
def list_exams():
    """
    List all exams for the authenticated teacher
    
    GET /api/v1/exams
    Query params: page, limit, status, sort
    """
    try:
        # Get current user
        current_user_id = get_jwt_identity()
        
        # Validate query parameters
        query_params = query_schema.load(request.args)
        
        # Get exams from service
        result = ExamService.get_teacher_exams(
            teacher_id=current_user_id,
            page=query_params['page'],
            limit=query_params['limit'],
            status=query_params['status'],
            sort_by=query_params['sort']
        )
        
        return success_response(
            data=result['exams'],
            meta=result['meta']
        )
        
    except MarshmallowValidationError as e:
        return error_response(str(e), 400)
    except (ValidationError, NotFoundError) as e:
        return error_response(str(e), e.status_code if hasattr(e, 'status_code') else 400)
    except Exception as e:
        return error_response(f"Failed to retrieve exams: {str(e)}", 500)


@exam_bp.route('', methods=['POST'])
@jwt_required()
@role_required(['teacher'])
def create_exam():
    """
    Create a new exam
    
    POST /api/v1/exams
    Body: { "title": "...", "subject": "...", "exam_date": "..." }
    """
    try:
        # Get current user
        current_user_id = get_jwt_identity()
        
        # Validate request body
        data = create_exam_schema.load(request.json)
        
        # Create exam
        exam = ExamService.create_exam(
            teacher_id=current_user_id,
            title=data['title'],
            subject=data['subject'],
            exam_date=data.get('exam_date'),
            max_marks=data.get('max_marks', 100.0),
            duration_minutes=data.get('duration_minutes', 180)
        )
        
        return success_response(
            data=exam.to_dict(),
            message="Exam created successfully",
            status_code=201
        )
        
    except MarshmallowValidationError as e:
        return error_response(str(e), 400)
    except ValidationError as e:
        return error_response(str(e), 400)
    except NotFoundError as e:
        return error_response(str(e), 404)
    except Exception as e:
        return error_response(f"Failed to create exam: {str(e)}", 500)


@exam_bp.route('/<exam_id>', methods=['GET'])
@jwt_required()
@role_required(['teacher'])
def get_exam(exam_id):
    """
    Get exam details by ID
    
    GET /api/v1/exams/:exam_id
    """
    try:
        # Get current user
        current_user_id = get_jwt_identity()
        
        # Get exam
        exam = ExamService.get_exam_by_id(exam_id, teacher_id=current_user_id)
        
        return success_response(data=exam.to_dict())
        
    except NotFoundError as e:
        return error_response(str(e), 404)
    except ForbiddenError as e:
        return error_response(str(e), 403)
    except Exception as e:
        return error_response(f"Failed to retrieve exam: {str(e)}", 500)


@exam_bp.route('/<exam_id>', methods=['PUT'])
@jwt_required()
@role_required(['teacher'])
def update_exam(exam_id):
    """
    Update exam details
    
    PUT /api/v1/exams/:exam_id
    Body: { "title": "...", "subject": "...", "exam_date": "..." }
    """
    try:
        # Get current user
        current_user_id = get_jwt_identity()
        
        # Validate request body
        data = update_exam_schema.load(request.json)
        
        # Update exam
        exam = ExamService.update_exam(
            exam_id=exam_id,
            teacher_id=current_user_id,
            **data
        )
        
        return success_response(
            data=exam.to_dict(),
            message="Exam updated successfully"
        )
        
    except MarshmallowValidationError as e:
        return error_response(str(e), 400)
    except ValidationError as e:
        return error_response(str(e), 400)
    except NotFoundError as e:
        return error_response(str(e), 404)
    except ForbiddenError as e:
        return error_response(str(e), 403)
    except Exception as e:
        return error_response(f"Failed to update exam: {str(e)}", 500)


@exam_bp.route('/<exam_id>', methods=['DELETE'])
@jwt_required()
@role_required(['teacher'])
def delete_exam(exam_id):
    """
    Delete an exam
    
    DELETE /api/v1/exams/:exam_id
    """
    try:
        # Get current user
        current_user_id = get_jwt_identity()
        
        # Delete exam
        ExamService.delete_exam(exam_id, teacher_id=current_user_id)
        
        return success_response(message="Exam deleted successfully")
        
    except NotFoundError as e:
        return error_response(str(e), 404)
    except ForbiddenError as e:
        return error_response(str(e), 403)
    except Exception as e:
        return error_response(f"Failed to delete exam: {str(e)}", 500)


@exam_bp.route('/<exam_id>/status', methods=['PUT'])
@jwt_required()
@role_required(['teacher'])
def update_exam_status(exam_id):
    """
    Update exam status
    
    PUT /api/v1/exams/:exam_id/status
    Body: { "status": "configuring" }
    """
    try:
        # Get current user
        current_user_id = get_jwt_identity()
        
        # Validate request body
        data = status_schema.load(request.json)
        
        # Update status
        exam = ExamService.update_exam_status(
            exam_id=exam_id,
            teacher_id=current_user_id,
            new_status=data['status']
        )
        
        return success_response(
            data=exam.to_dict(),
            message=f"Exam status updated to '{data['status']}'"
        )
        
    except MarshmallowValidationError as e:
        return error_response(str(e), 400)
    except ValidationError as e:
        return error_response(str(e), 400)
    except NotFoundError as e:
        return error_response(str(e), 404)
    except ForbiddenError as e:
        return error_response(str(e), 403)
    except Exception as e:
        return error_response(f"Failed to update status: {str(e)}", 500)


@exam_bp.route('/<exam_id>/question-paper', methods=['POST'])
@jwt_required()
@role_required(['teacher'])
def upload_question_paper(exam_id):
    """
    Upload question paper for an exam
    
    POST /api/v1/exams/:exam_id/question-paper
    Content-Type: multipart/form-data
    Body: file (PDF/DOC/DOCX)
    """
    try:
        # Get current user
        current_user_id = get_jwt_identity()
        
        # Verify exam ownership
        exam = ExamService.get_exam_by_id(exam_id, teacher_id=current_user_id)
        
        # Check file in request
        if 'file' not in request.files:
            return error_response("No file provided", 400)
        
        file = request.files['file']
        
        # Save file
        file_info = StorageService.save_question_paper(file, exam_id)
        
        # Update exam with question paper info
        if not exam.question_paper:
            exam.question_paper = QuestionPaper()
        
        exam.question_paper.file_url = file_info['file_url']
        exam.question_paper.uploaded_at = file_info['uploaded_at']
        exam.question_paper.file_size = file_info.get('file_size', 0)
        exam.save()
        
        return success_response(
            data={'exam': exam.to_dict()},
            message="Question paper uploaded successfully"
        )
        
    except ValidationError as e:
        return error_response(str(e), 400)
    except NotFoundError as e:
        return error_response(str(e), 404)
    except ForbiddenError as e:
        return error_response(str(e), 403)
    except Exception as e:
        return error_response(f"Failed to upload question paper: {str(e)}", 500)


@exam_bp.route('/<exam_id>/model-answer', methods=['POST'])
@jwt_required()
@role_required(['teacher'])
def upload_model_answer(exam_id):
    """
    Upload model answer for an exam
    
    POST /api/v1/exams/:exam_id/model-answer
    Content-Type: multipart/form-data
    Body: file (PDF/DOC/DOCX)
    """
    try:
        # Get current user
        current_user_id = get_jwt_identity()
        
        # Verify exam ownership
        exam = ExamService.get_exam_by_id(exam_id, teacher_id=current_user_id)
        
        # Check file in request
        if 'file' not in request.files:
            return error_response("No file provided", 400)
        
        file = request.files['file']
        
        # Save file
        file_info = StorageService.save_model_answer(file, exam_id)
        
        # Update exam with model answer info
        if not exam.model_answer:
            exam.model_answer = ModelAnswer()
        
        exam.model_answer.file_url = file_info['file_url']
        exam.model_answer.uploaded_at = file_info['uploaded_at']
        exam.model_answer.file_size = file_info.get('file_size', 0)
        exam.save()
        
        return success_response(
            data={'exam': exam.to_dict()},
            message="Model answer uploaded successfully"
        )
        
    except ValidationError as e:
        return error_response(str(e), 400)
    except NotFoundError as e:
        return error_response(str(e), 404)
    except ForbiddenError as e:
        return error_response(str(e), 403)
    except Exception as e:
        return error_response(f"Failed to upload model answer: {str(e)}", 500)


@exam_bp.route('/<exam_id>/answer-sheets/bulk', methods=['POST'])
@jwt_required()
@role_required(['teacher'])
def bulk_upload_answer_sheets(exam_id):
    """
    Bulk upload answer sheets for an exam
    
    POST /api/v1/exams/:exam_id/answer-sheets/bulk
    Content-Type: multipart/form-data
    Body: files[] (multiple PDF files)
    """
    try:
        # Get current user
        current_user_id = get_jwt_identity()
        
        # Verify exam ownership
        exam = ExamService.get_exam_by_id(exam_id, teacher_id=current_user_id)
        
        # Check files in request
        if 'files' not in request.files:
            return error_response("No files provided", 400)
        
        files = request.files.getlist('files')
        
        if len(files) == 0:
            return error_response("No files selected", 400)
        
        uploaded_files = []
        failed_files = []
        
        # Process each file
        for idx, file in enumerate(files):
            try:
                student_id = f"bulk_{idx+1}"
                file_info = StorageService.save_answer_sheet(file, exam_id, student_id)

                # Create AnswerSheet document in MongoDB for OCR pipeline
                sheet_doc = AnswerSheetDoc(
                    exam_id=exam,
                    student_id=exam.teacher_id,  # placeholder until student accounts exist
                    original_file=OriginalFile(
                        url=file_info['file_url'],
                        pages=1,
                        uploaded_at=file_info['uploaded_at']
                    ),
                    status='uploaded'
                )
                sheet_doc.save()

                uploaded_files.append({
                    'id': str(sheet_doc.id),
                    'filename': file.filename,
                    'file_url': file_info['file_url'],
                    'file_size': file_info['file_size'],
                    'uploaded_at': file_info['uploaded_at'].isoformat()
                })
            except Exception as e:
                failed_files.append({
                    'filename': file.filename,
                    'error': str(e)
                })
        
        # Update exam statistics
        exam.statistics.total_sheets += len(uploaded_files)
        exam.statistics.total_submissions += len(uploaded_files)  # Keep both in sync
        exam.save()
        
        return success_response(
            data={
                'uploaded_count': len(uploaded_files),
                'failed_count': len(failed_files),
                'uploaded_files': uploaded_files,
                'failed_files': failed_files,
                'exam': exam.to_dict()
            },
            message=f"Successfully uploaded {len(uploaded_files)} out of {len(files)} files"
        )
        
    except ValidationError as e:
        return error_response(str(e), 400)
    except NotFoundError as e:
        return error_response(str(e), 404)
    except ForbiddenError as e:
        return error_response(str(e), 403)
    except Exception as e:
        return error_response(f"Failed to bulk upload answer sheets: {str(e)}", 500)
