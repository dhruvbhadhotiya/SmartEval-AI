"""
Student Results API Routes

Endpoints for students to view their published exam results.
"""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from utils.decorators import role_required
from utils.helpers import success_response, error_response
from models.exam import Exam
from models.answer_sheet import AnswerSheet
from models.evaluation import Evaluation
from models.user import User


student_bp = Blueprint('students', __name__, url_prefix='/results')


@student_bp.route('', methods=['GET'])
@jwt_required()
@role_required(['student'])
def list_results():
    """
    List all published exam results for the authenticated student.

    GET /api/v1/results
    Returns exams where status='published' and the student has a graded sheet.
    """
    try:
        student_id = get_jwt_identity()

        # Find all answer sheets belonging to this student
        sheets = AnswerSheet.objects(student_id=student_id)
        if not sheets:
            return jsonify(success_response(data=[])), 200

        # Collect unique exam IDs
        exam_ids = list(set(str(s.exam_id.id) for s in sheets))

        # Find published exams among those
        published_exams = Exam.objects(
            id__in=exam_ids,
            status='published'
        )

        results = []
        for exam in published_exams:
            # Find this student's sheet for this exam
            sheet = AnswerSheet.objects(
                exam_id=exam.id, student_id=student_id
            ).first()
            if not sheet:
                continue

            # Find evaluation
            evaluation = Evaluation.objects(answer_sheet_id=sheet.id).first()

            result_entry = {
                'exam_id': str(exam.id),
                'exam_title': exam.title,
                'subject': exam.subject,
                'exam_date': exam.exam_date.isoformat() if exam.exam_date else None,
                'max_marks': exam.max_marks,
                'published_at': exam.published_at.isoformat() if exam.published_at else None,
                'total_score': evaluation.total_marks_awarded if evaluation else None,
                'total_max': evaluation.total_max_marks if evaluation else None,
                'percentage': evaluation.percentage if evaluation else None,
                'overall_feedback': evaluation.overall_feedback if evaluation else None,
                'status': sheet.status,
                'has_challenge': _has_pending_challenge(evaluation, student_id) if evaluation else False,
            }
            results.append(result_entry)

        # Sort by published_at descending
        results.sort(
            key=lambda r: r.get('published_at') or '', reverse=True
        )

        return jsonify(success_response(data=results)), 200

    except Exception as e:
        print(f"[StudentResults] Error listing results: {e}")
        return error_response(f"Failed to load results: {str(e)}", 500)


@student_bp.route('/<exam_id>', methods=['GET'])
@jwt_required()
@role_required(['student'])
def get_result_detail(exam_id):
    """
    Get detailed question-wise result for a specific exam.

    GET /api/v1/results/:examId
    """
    try:
        student_id = get_jwt_identity()

        # Verify exam exists and is published
        exam = Exam.objects(id=exam_id).first()
        if not exam:
            return error_response("Exam not found", 404)

        if exam.status != 'published':
            return error_response("Results are not yet published for this exam", 403)

        # Find student's answer sheet
        sheet = AnswerSheet.objects(
            exam_id=exam.id, student_id=student_id
        ).first()
        if not sheet:
            return error_response("No answer sheet found for this exam", 404)

        # Find evaluation
        evaluation = Evaluation.objects(answer_sheet_id=sheet.id).first()
        if not evaluation:
            return error_response("Evaluation not found", 404)

        # Build question-wise breakdown
        questions = []
        for qe in (evaluation.question_evaluations or []):
            q_data = {
                'question_number': qe.question_number,
                'max_marks': qe.max_marks,
                'marks_awarded': qe.marks_awarded,
                'feedback': qe.feedback,
                'confidence': qe.confidence,
                'keywords_found': qe.keywords_found or [],
                'keywords_missing': qe.keywords_missing or [],
                'concepts_covered': qe.concepts_covered or [],
                'concepts_missing': qe.concepts_missing or [],
                'can_challenge': True,
                'challenge_status': _get_question_challenge_status(
                    evaluation, student_id, qe.question_number
                ),
            }

            # Include override info if present (shows teacher adjusted)
            if qe.override_applied:
                q_data['override_applied'] = True
                q_data['original_marks'] = qe.original_marks

            questions.append(q_data)

        # Get student info
        student = User.objects(id=student_id).first()

        result = {
            'exam': {
                'id': str(exam.id),
                'title': exam.title,
                'subject': exam.subject,
                'exam_date': exam.exam_date.isoformat() if exam.exam_date else None,
                'max_marks': exam.max_marks,
            },
            'student': {
                'name': student.profile.get('name', '') if student else '',
                'roll_number': student.profile.get('roll_number', '') if student else '',
            },
            'summary': {
                'total_score': evaluation.total_marks_awarded,
                'max_score': evaluation.total_max_marks,
                'percentage': evaluation.percentage,
                'overall_feedback': evaluation.overall_feedback,
                'overall_confidence': evaluation.overall_confidence,
            },
            'questions': questions,
            'answer_sheet': {
                'id': str(sheet.id),
                'original_file_url': sheet.original_file.url if sheet.original_file else None,
            },
            'published_at': exam.published_at.isoformat() if exam.published_at else None,
        }

        return jsonify(success_response(data=result)), 200

    except Exception as e:
        print(f"[StudentResults] Error getting result detail: {e}")
        return error_response(f"Failed to load result: {str(e)}", 500)


def _has_pending_challenge(evaluation, student_id):
    """Check if student has any pending challenge for this evaluation."""
    from models.challenge import Challenge
    count = Challenge.objects(
        evaluation_id=evaluation.id,
        student_id=student_id,
        status__in=['pending', 'under_review']
    ).count()
    return count > 0


def _get_question_challenge_status(evaluation, student_id, question_number):
    """Get challenge status for a specific question."""
    from models.challenge import Challenge
    challenges = Challenge.objects(
        evaluation_id=evaluation.id,
        student_id=student_id,
    )
    for challenge in challenges:
        for cq in (challenge.challenged_questions or []):
            if cq.question_number == question_number:
                return challenge.status
    return None
