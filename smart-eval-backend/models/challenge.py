"""
Challenge Model

Stores grade challenge requests submitted by students for teacher review.
"""

from datetime import datetime
from mongoengine import (
    Document,
    StringField,
    DateTimeField,
    ReferenceField,
    EmbeddedDocument,
    EmbeddedDocumentField,
    ListField,
    IntField,
    FloatField,
    DictField
)
from models.user import User
from models.exam import Exam
from models.evaluation import Evaluation


class ChallengedQuestion(EmbeddedDocument):
    """A single challenged question within a challenge request."""
    question_number = IntField(required=True)
    original_score = FloatField()
    max_marks = FloatField()
    student_justification = StringField(required=True, max_length=500)


class ScoreChange(EmbeddedDocument):
    """Score change record when a challenge is accepted."""
    question_number = IntField(required=True)
    old_score = FloatField()
    new_score = FloatField()


class ChallengeResolution(EmbeddedDocument):
    """Resolution details for a challenge."""
    resolved_by = ReferenceField(User)
    resolved_at = DateTimeField()
    decision = StringField(choices=['accepted', 'rejected'])
    comments = StringField()
    score_changes = ListField(EmbeddedDocumentField(ScoreChange))


class Challenge(Document):
    """
    Challenge Model

    Represents a student's request to re-evaluate specific question(s)
    in their graded answer sheet.
    """

    # References
    evaluation_id = ReferenceField(Evaluation, required=True)
    student_id = ReferenceField(User, required=True)
    exam_id = ReferenceField(Exam, required=True)

    # Challenged questions
    challenged_questions = ListField(
        EmbeddedDocumentField(ChallengedQuestion), required=True
    )

    # Status
    status = StringField(
        choices=['pending', 'under_review', 'accepted', 'rejected'],
        default='pending'
    )

    # Resolution
    resolution = EmbeddedDocumentField(ChallengeResolution)

    # Timestamps
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'challenges',
        'indexes': [
            'evaluation_id',
            'student_id',
            'exam_id',
            'status',
            '-created_at',
            ('exam_id', 'status')
        ],
        'ordering': ['-created_at']
    }

    def save(self, *args, **kwargs):
        self.updated_at = datetime.utcnow()
        return super(Challenge, self).save(*args, **kwargs)

    def to_dict(self):
        data = {
            'id': str(self.id),
            'evaluation_id': str(self.evaluation_id.id),
            'student_id': str(self.student_id.id),
            'exam_id': str(self.exam_id.id),
            'status': self.status,
            'challenged_questions': [
                {
                    'question_number': cq.question_number,
                    'original_score': cq.original_score,
                    'max_marks': cq.max_marks,
                    'student_justification': cq.student_justification,
                }
                for cq in self.challenged_questions
            ] if self.challenged_questions else [],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

        # Include resolution if exists
        if self.resolution:
            data['resolution'] = {
                'resolved_by': str(self.resolution.resolved_by.id) if self.resolution.resolved_by else None,
                'resolved_at': self.resolution.resolved_at.isoformat() if self.resolution.resolved_at else None,
                'decision': self.resolution.decision,
                'comments': self.resolution.comments,
                'score_changes': [
                    {
                        'question_number': sc.question_number,
                        'old_score': sc.old_score,
                        'new_score': sc.new_score,
                    }
                    for sc in self.resolution.score_changes
                ] if self.resolution.score_changes else []
            }
        else:
            data['resolution'] = None

        return data
