"""
Exam API Routes

RESTful endpoints for exam management
"""
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError as MarshmallowValidationError

from services.exam_service import ExamService
from services.storage_service import StorageService
from services.ocr_service import OCRService
from services.llm_service import LLMService
from api.v1.exams.schemas import (
    CreateExamSchema,
    UpdateExamSchema,
    ExamQuerySchema,
    UpdateStatusSchema
)
from utils.decorators import role_required
from utils.helpers import success_response, error_response
from utils.exceptions import ValidationError, NotFoundError, ForbiddenError
from models.exam import QuestionPaper, ModelAnswer, ParsedAnswer, GradingConfig
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


# ------------------------------------------------------------------
# Model Answer (parsed) & Grading Config — Sprint 5
# ------------------------------------------------------------------

@exam_bp.route('/<exam_id>/model-answer/parsed', methods=['POST'])
@jwt_required()
@role_required(['teacher'])
def save_parsed_model_answers(exam_id):
    """
    Save structured per-question model answers for LLM grading.

    POST /api/v1/exams/:exam_id/model-answer/parsed
    Body: { "answers": [ {question_number, max_marks, answer_text, keywords[], concepts[]} ] }
    """
    try:
        current_user_id = get_jwt_identity()
        exam = ExamService.get_exam_by_id(exam_id, teacher_id=current_user_id)

        data = request.get_json()
        if not data or 'answers' not in data:
            return error_response("Request body must contain 'answers' array", 400)

        answers = data['answers']
        if not isinstance(answers, list) or len(answers) == 0:
            return error_response("'answers' must be a non-empty array", 400)

        parsed_list = []
        for ans in answers:
            qn = ans.get('question_number')
            mm = ans.get('max_marks')
            if qn is None or mm is None:
                return error_response("Each answer must have question_number and max_marks", 400)

            try:
                question_number = int(qn)
                max_marks = float(mm)
            except (TypeError, ValueError):
                return error_response("question_number must be an integer and max_marks must be a number", 400)

            if question_number < 1:
                return error_response("question_number must be at least 1", 400)

            if max_marks <= 0:
                return error_response("max_marks must be greater than 0", 400)

            raw_keywords = ans.get('keywords', [])
            if raw_keywords is None:
                raw_keywords = []
            if not isinstance(raw_keywords, list):
                return error_response("keywords must be an array of strings", 400)
            keywords = [str(k) for k in raw_keywords if k is not None]

            raw_concepts = ans.get('concepts', [])
            if raw_concepts is None:
                raw_concepts = []
            if not isinstance(raw_concepts, list):
                return error_response("concepts must be an array of strings", 400)
            concepts = [str(c) for c in raw_concepts if c is not None]

            parsed_list.append(ParsedAnswer(
                question_number=question_number,
                max_marks=max_marks,
                answer_text=ans.get('answer_text', ''),
                keywords=keywords,
                concepts=concepts,
            ))

        if not exam.model_answer:
            from datetime import datetime
            exam.model_answer = ModelAnswer(uploaded_at=datetime.utcnow())

        exam.model_answer.parsed_answers = parsed_list
        exam.save()

        return success_response(
            data={'exam': exam.to_dict()},
            message=f"Saved {len(parsed_list)} parsed model answers"
        )

    except ValidationError as e:
        return error_response(str(e), 400)
    except NotFoundError as e:
        return error_response(str(e), 404)
    except ForbiddenError as e:
        return error_response(str(e), 403)
    except Exception as e:
        return error_response(f"Failed to save model answers: {str(e)}", 500)


@exam_bp.route('/<exam_id>/grading-config', methods=['PUT'])
@jwt_required()
@role_required(['teacher'])
def update_grading_config(exam_id):
    """
    Update grading configuration for an exam.

    PUT /api/v1/exams/:exam_id/grading-config
    Body: { strictness: 'lenient'|'moderate'|'strict', keyword_mode: 'exact'|'synonyms' }
    """
    try:
        current_user_id = get_jwt_identity()
        exam = ExamService.get_exam_by_id(exam_id, teacher_id=current_user_id)

        data = request.get_json()
        if not data:
            return error_response("Request body is required", 400)

        if not exam.grading_config:
            exam.grading_config = GradingConfig()

        strictness = data.get('strictness')
        if strictness:
            if strictness not in ('lenient', 'moderate', 'strict'):
                return error_response("strictness must be 'lenient', 'moderate', or 'strict'", 400)
            exam.grading_config.strictness = strictness

        keyword_mode = data.get('keyword_mode')
        if keyword_mode:
            if keyword_mode not in ('exact', 'synonyms'):
                return error_response("keyword_mode must be 'exact' or 'synonyms'", 400)
            exam.grading_config.keyword_mode = keyword_mode

        holistic_params = data.get('holistic_params')
        if holistic_params is not None:
            exam.grading_config.holistic_params = holistic_params

        exam.save()

        return success_response(
            data={'exam': exam.to_dict()},
            message="Grading configuration updated"
        )

    except ValidationError as e:
        return error_response(str(e), 400)
    except NotFoundError as e:
        return error_response(str(e), 404)
    except ForbiddenError as e:
        return error_response(str(e), 403)
    except Exception as e:
        return error_response(f"Failed to update grading config: {str(e)}", 500)


@exam_bp.route('/<exam_id>/model-answer/extract', methods=['POST'])
@jwt_required()
@role_required(['teacher'])
def extract_model_answer_text(exam_id):
    """
    Run OCR on the uploaded model answer PDF to extract text.

    POST /api/v1/exams/:exam_id/model-answer/extract
    Returns: { "pages": [ { page_number, text, confidence } ], "parsed_questions": [...] }
    """
    try:
        current_user_id = get_jwt_identity()
        exam = ExamService.get_exam_by_id(exam_id, teacher_id=current_user_id)

        if not exam.model_answer or not exam.model_answer.file_url:
            return error_response("No model answer PDF uploaded for this exam", 400)

        import os
        from flask import current_app
        file_url = exam.model_answer.file_url
        upload_folder = current_app.config.get('UPLOAD_FOLDER', './uploads')
        relative = file_url.lstrip('/')
        if relative.startswith('uploads/'):
            relative = relative[len('uploads/'):]
        abs_path = os.path.abspath(os.path.join(upload_folder, relative))

        page_results = OCRService.extract_text(abs_path)

        # Serialize datetime objects for JSON response
        for page in page_results:
            if hasattr(page.get('processed_at', ''), 'isoformat'):
                page['processed_at'] = page['processed_at'].isoformat()

        # Combine all page text and use LLM to parse into structured questions
        # with keywords and concepts
        full_text = '\n\n'.join(p['text'] for p in page_results if p.get('text'))
        parsed_questions = []
        if full_text.strip():
            try:
                parsed_questions = LLMService.parse_model_answer_text(
                    full_text, max_marks=exam.max_marks or 100.0
                )
            except Exception as parse_err:
                print(f"[ExtractModelAnswer] LLM parsing failed: {parse_err}")
                # Fallback: return raw text without parsed questions

        from flask import jsonify as jfy
        return jfy(success_response(
            data={
                'pages': page_results,
                'parsed_questions': parsed_questions,
            },
            message=f"Extracted text from {len(page_results)} page(s), parsed {len(parsed_questions)} question(s)"
        ))

    except ValidationError as e:
        print(f"[ExtractModelAnswer] ValidationError: {e}")
        return error_response(f"OCR extraction failed: {str(e)}", 500)
    except NotFoundError as e:
        return error_response(str(e), 404)
    except ForbiddenError as e:
        return error_response(str(e), 403)
    except Exception as e:
        print(f"[ExtractModelAnswer] Error: {e}")
        return error_response(f"Failed to extract model answer text: {str(e)}", 500)


@exam_bp.route('/<exam_id>/question-paper/extract', methods=['POST'])
@jwt_required()
@role_required(['teacher'])
def extract_question_paper_text(exam_id):
    """
    Run OCR on the uploaded question paper PDF to extract text.

    POST /api/v1/exams/:exam_id/question-paper/extract
    Returns: { "pages": [ { page_number, text, confidence } ] }
    """
    try:
        current_user_id = get_jwt_identity()
        exam = ExamService.get_exam_by_id(exam_id, teacher_id=current_user_id)

        if not exam.question_paper or not exam.question_paper.file_url:
            return error_response("No question paper PDF uploaded for this exam", 400)

        import os
        from flask import current_app
        file_url = exam.question_paper.file_url
        upload_folder = current_app.config.get('UPLOAD_FOLDER', './uploads')
        relative = file_url.lstrip('/')
        if relative.startswith('uploads/'):
            relative = relative[len('uploads/'):]
        abs_path = os.path.abspath(os.path.join(upload_folder, relative))

        page_results = OCRService.extract_text(abs_path)

        # Serialize datetime objects for JSON response
        for page in page_results:
            if hasattr(page.get('processed_at', ''), 'isoformat'):
                page['processed_at'] = page['processed_at'].isoformat()

        from flask import jsonify as jfy
        return jfy(success_response(
            data={'pages': page_results},
            message=f"Extracted text from {len(page_results)} page(s)"
        ))

    except ValidationError as e:
        print(f"[ExtractQuestionPaper] ValidationError: {e}")
        return error_response(f"OCR extraction failed: {str(e)}", 500)
    except NotFoundError as e:
        return error_response(str(e), 404)
    except ForbiddenError as e:
        return error_response(str(e), 403)
    except Exception as e:
        print(f"[ExtractQuestionPaper] Error: {e}")
        return error_response(f"Failed to extract question paper text: {str(e)}", 500)
