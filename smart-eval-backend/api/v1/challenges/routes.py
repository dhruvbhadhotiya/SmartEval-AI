"""
Challenge API Routes

Endpoints for students to submit grade challenges and teachers to manage them.
"""
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from utils.decorators import role_required
from utils.helpers import success_response, error_response
from models.challenge import (
    Challenge, ChallengedQuestion, ChallengeResolution, ScoreChange
)
from models.evaluation import Evaluation
from models.exam import Exam
from models.answer_sheet import AnswerSheet
from models.user import User


challenge_bp = Blueprint('challenges', __name__, url_prefix='/challenges')


@challenge_bp.route('', methods=['POST'])
@jwt_required()
@role_required(['student'])
def submit_challenge():
    """
    Submit a grade challenge for specific question(s).

    POST /api/v1/challenges
    Body: {
        "exam_id": "...",
        "challenged_questions": [
            { "question_number": 1, "justification": "..." }
        ]
    }
    """
    try:
        student_id = get_jwt_identity()
        data = request.get_json()

        if not data:
            return error_response("Request body is required", 400)

        exam_id = data.get('exam_id')
        if not exam_id:
            return error_response("exam_id is required", 400)

        challenged_qs = data.get('challenged_questions')
        if not challenged_qs or not isinstance(challenged_qs, list):
            return error_response("challenged_questions must be a non-empty array", 400)

        # Verify exam is published
        exam = Exam.objects(id=exam_id).first()
        if not exam:
            return error_response("Exam not found", 404)
        if exam.status != 'published':
            return error_response("Can only challenge published exam results", 400)

        # Find student's answer sheet & evaluation
        sheet = AnswerSheet.objects(
            exam_id=exam_id, student_id=student_id
        ).first()
        if not sheet:
            return error_response("No answer sheet found for this exam", 404)

        evaluation = Evaluation.objects(answer_sheet_id=sheet.id).first()
        if not evaluation:
            return error_response("No evaluation found for this answer sheet", 404)

        # Build challenged questions list
        cq_list = []
        for cq_data in challenged_qs:
            q_num = cq_data.get('question_number')
            justification = cq_data.get('justification', '')

            if q_num is None:
                return error_response("Each challenged question must have a question_number", 400)

            if not justification or len(justification.strip()) == 0:
                return error_response(f"Justification is required for question {q_num}", 400)

            if len(justification) > 500:
                return error_response(f"Justification must be max 500 characters for question {q_num}", 400)

            # Check if this question was already challenged
            existing = Challenge.objects(
                evaluation_id=evaluation.id,
                student_id=student_id,
                status__in=['pending', 'under_review'],
                challenged_questions__question_number=q_num
            ).first()
            if existing:
                return error_response(
                    f"Question {q_num} already has a pending challenge", 409
                )

            # Find original score from evaluation
            original_score = 0
            max_marks = 0
            for qe in (evaluation.question_evaluations or []):
                if qe.question_number == q_num:
                    original_score = qe.marks_awarded
                    max_marks = qe.max_marks
                    break

            cq_list.append(ChallengedQuestion(
                question_number=q_num,
                original_score=original_score,
                max_marks=max_marks,
                student_justification=justification.strip()
            ))

        # Create challenge
        challenge = Challenge(
            evaluation_id=evaluation,
            student_id=student_id,
            exam_id=exam_id,
            challenged_questions=cq_list,
            status='pending'
        )
        challenge.save()

        # Notify teacher of new challenge
        try:
            from services.notification_service import notify_challenge_received
            student = User.objects(id=student_id).first()
            teacher = User.objects(id=exam.teacher_id.id).first() if exam else None
            if teacher and student:
                notify_challenge_received(
                    teacher_email=teacher.email,
                    student_name=student.profile.get('name', student.email),
                    student_roll=student.profile.get('roll_number', ''),
                    exam_title=exam.title,
                    question_numbers=[cq.question_number for cq in cq_list],
                )
        except Exception as notify_err:
            print(f"[Challenge] Notification failed (non-fatal): {notify_err}")

        return jsonify(success_response(
            data=challenge.to_dict(),
            message="Challenge submitted successfully"
        )), 201

    except Exception as e:
        print(f"[Challenges] Error submitting challenge: {e}")
        import traceback
        traceback.print_exc()
        return error_response(f"Failed to submit challenge: {str(e)}", 500)


@challenge_bp.route('', methods=['GET'])
@jwt_required()
def list_challenges():
    """
    List challenges filtered by role.
    - Students see their own challenges
    - Teachers see challenges for their exams

    GET /api/v1/challenges?exam_id=...&status=...
    """
    try:
        user_id = get_jwt_identity()
        user = User.objects(id=user_id).first()
        if not user:
            return error_response("User not found", 401)

        exam_id = request.args.get('exam_id')
        status_filter = request.args.get('status')

        query = {}

        if user.role == 'student':
            query['student_id'] = user_id
        elif user.role == 'teacher':
            # Find exams owned by this teacher
            teacher_exams = Exam.objects(teacher_id=user_id).only('id')
            teacher_exam_ids = [e.id for e in teacher_exams]
            query['exam_id__in'] = teacher_exam_ids

        if exam_id:
            query['exam_id'] = exam_id

        if status_filter and status_filter != 'all':
            query['status'] = status_filter

        challenges = Challenge.objects(**query).order_by('-created_at')

        result = []
        for ch in challenges:
            ch_data = ch.to_dict()

            # Enrich with exam and student info
            try:
                exam = Exam.objects(id=ch.exam_id.id).first()
                if exam:
                    ch_data['exam_title'] = exam.title
                    ch_data['exam_subject'] = exam.subject
            except Exception:
                pass

            try:
                student = User.objects(id=ch.student_id.id).first()
                if student:
                    ch_data['student_name'] = student.profile.get('name', '')
                    ch_data['student_roll'] = student.profile.get('roll_number', '')
            except Exception:
                pass

            result.append(ch_data)

        return jsonify(success_response(data=result)), 200

    except Exception as e:
        print(f"[Challenges] Error listing challenges: {e}")
        return error_response(f"Failed to list challenges: {str(e)}", 500)


@challenge_bp.route('/<challenge_id>', methods=['GET'])
@jwt_required()
def get_challenge(challenge_id):
    """
    Get challenge details.

    GET /api/v1/challenges/:challengeId
    """
    try:
        user_id = get_jwt_identity()
        challenge = Challenge.objects(id=challenge_id).first()
        if not challenge:
            return error_response("Challenge not found", 404)

        # Verify access: student owns it, or teacher owns the exam
        user = User.objects(id=user_id).first()
        if user.role == 'student' and str(challenge.student_id.id) != user_id:
            return error_response("Access denied", 403)
        elif user.role == 'teacher':
            exam = Exam.objects(id=challenge.exam_id.id).first()
            if not exam or str(exam.teacher_id.id) != user_id:
                return error_response("Access denied", 403)

        ch_data = challenge.to_dict()

        # Enrich with evaluation details for teacher review
        try:
            evaluation = Evaluation.objects(id=challenge.evaluation_id.id).first()
            if evaluation:
                for cq in ch_data.get('challenged_questions', []):
                    for qe in (evaluation.question_evaluations or []):
                        if qe.question_number == cq['question_number']:
                            cq['current_feedback'] = qe.feedback
                            cq['current_score'] = qe.marks_awarded
                            break
        except Exception:
            pass

        return jsonify(success_response(data=ch_data)), 200

    except Exception as e:
        print(f"[Challenges] Error getting challenge: {e}")
        return error_response(f"Failed to get challenge: {str(e)}", 500)


@challenge_bp.route('/<challenge_id>/resolve', methods=['PUT'])
@jwt_required()
@role_required(['teacher'])
def resolve_challenge(challenge_id):
    """
    Resolve a challenge (accept or reject).

    PUT /api/v1/challenges/:challengeId/resolve
    Body: {
        "decision": "accepted" | "rejected",
        "comments": "...",
        "score_changes": [ { "question_number": 1, "new_score": 18 } ]
    }
    """
    try:
        teacher_id = get_jwt_identity()
        challenge = Challenge.objects(id=challenge_id).first()
        if not challenge:
            return error_response("Challenge not found", 404)

        # Verify teacher owns the exam
        exam = Exam.objects(id=challenge.exam_id.id).first()
        if not exam or str(exam.teacher_id.id) != teacher_id:
            return error_response("Access denied", 403)

        if challenge.status in ('accepted', 'rejected'):
            return error_response("Challenge is already resolved", 400)

        data = request.get_json()
        if not data:
            return error_response("Request body is required", 400)

        decision = data.get('decision')
        if decision not in ('accepted', 'rejected'):
            return error_response("decision must be 'accepted' or 'rejected'", 400)

        comments = data.get('comments', '')

        # Build score changes if accepted
        score_change_list = []
        if decision == 'accepted':
            raw_changes = data.get('score_changes', [])
            evaluation = Evaluation.objects(id=challenge.evaluation_id.id).first()
            if not evaluation:
                return error_response("Evaluation not found", 404)

            for sc_data in raw_changes:
                q_num = sc_data.get('question_number')
                new_score = sc_data.get('new_score')

                if q_num is None or new_score is None:
                    return error_response(
                        "Each score_change must have question_number and new_score", 400
                    )

                try:
                    new_score = float(new_score)
                except (TypeError, ValueError):
                    return error_response("new_score must be a number", 400)

                # Find the question evaluation and update
                old_score = 0
                for qe in evaluation.question_evaluations:
                    if qe.question_number == q_num:
                        old_score = qe.marks_awarded

                        # Validate new score range
                        if new_score < 0 or new_score > qe.max_marks:
                            return error_response(
                                f"new_score for Q{q_num} must be 0-{qe.max_marks}", 400
                            )

                        # Apply the score change
                        if not qe.override_applied:
                            qe.original_marks = qe.marks_awarded
                        qe.marks_awarded = new_score
                        qe.override_applied = True
                        qe.override_reason = f"Challenge accepted: {comments}"
                        qe.overridden_by = teacher_id
                        qe.overridden_at = datetime.utcnow()
                        break

                score_change_list.append(ScoreChange(
                    question_number=q_num,
                    old_score=old_score,
                    new_score=new_score
                ))

            # Recalculate totals
            total_awarded = sum(
                qe.marks_awarded for qe in evaluation.question_evaluations
            )
            evaluation.total_marks_awarded = total_awarded
            exam_max = exam.max_marks or evaluation.total_max_marks
            evaluation.percentage = (
                (total_awarded / exam_max * 100) if exam_max > 0 else 0.0
            )
            evaluation.status = 'overridden'
            evaluation.save()

        # Create resolution
        teacher = User.objects(id=teacher_id).first()
        challenge.resolution = ChallengeResolution(
            resolved_by=teacher,
            resolved_at=datetime.utcnow(),
            decision=decision,
            comments=comments,
            score_changes=score_change_list
        )
        challenge.status = decision
        challenge.save()

        # Notify student of resolution
        try:
            from services.notification_service import notify_challenge_resolved
            student = User.objects(id=challenge.student_id.id).first()
            if student:
                sc_dicts = [
                    {'question_number': sc.question_number,
                     'old_score': sc.old_score,
                     'new_score': sc.new_score}
                    for sc in score_change_list
                ] if score_change_list else None
                notify_challenge_resolved(
                    student_email=student.email,
                    student_name=student.profile.get('name', student.email),
                    exam_title=exam.title,
                    decision=decision,
                    comments=comments,
                    score_changes=sc_dicts,
                )
        except Exception as notify_err:
            print(f"[Challenge] Resolve notification failed (non-fatal): {notify_err}")

        return jsonify(success_response(
            data=challenge.to_dict(),
            message=f"Challenge {decision}"
        )), 200

    except Exception as e:
        print(f"[Challenges] Error resolving challenge: {e}")
        import traceback
        traceback.print_exc()
        return error_response(f"Failed to resolve challenge: {str(e)}", 500)
