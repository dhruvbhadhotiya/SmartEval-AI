"""
Evaluation Model

Stores per-question LLM grading results for an answer sheet.
Created when the grading pipeline runs on an OCR-completed sheet.
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
    DictField,
    BooleanField
)
from models.exam import Exam
from models.answer_sheet import AnswerSheet


class QuestionEvaluation(EmbeddedDocument):
    """Per-question grading result from the LLM."""
    question_number = IntField(required=True)
    max_marks = FloatField(required=True)
    marks_awarded = FloatField(default=0.0)
    feedback = StringField(default='')
    confidence = FloatField(default=0.0)
    keywords_found = ListField(StringField())
    keywords_missing = ListField(StringField())
    concepts_covered = ListField(StringField())
    concepts_missing = ListField(StringField())

    # Override tracking (Sprint 6)
    override_applied = BooleanField(default=False)
    original_marks = FloatField()
    override_reason = StringField()
    overridden_by = StringField()
    overridden_at = DateTimeField()


class Evaluation(Document):
    """
    Evaluation Model

    Stores the complete LLM grading result for one answer sheet.
    Links to the AnswerSheet and Exam it belongs to.
    """

    # References
    answer_sheet_id = ReferenceField(AnswerSheet, required=True, unique=True)
    exam_id = ReferenceField(Exam, required=True)

    # Per-question results
    question_evaluations = ListField(EmbeddedDocumentField(QuestionEvaluation))

    # Aggregate scores
    total_marks_awarded = FloatField(default=0.0)
    total_max_marks = FloatField(default=0.0)
    percentage = FloatField(default=0.0)
    overall_feedback = StringField(default='')
    overall_confidence = FloatField(default=0.0)

    # Grading config used
    strictness = StringField(choices=['lenient', 'moderate', 'strict'], default='moderate')

    # Status
    status = StringField(
        choices=['pending', 'completed', 'failed', 'overridden'],
        default='pending'
    )

    # Timestamps
    graded_at = DateTimeField()
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'evaluations',
        'indexes': [
            'answer_sheet_id',
            'exam_id',
            'status',
            '-created_at'
        ],
        'ordering': ['-created_at']
    }

    def save(self, *args, **kwargs):
        self.updated_at = datetime.utcnow()
        return super(Evaluation, self).save(*args, **kwargs)

    def to_dict(self):
        data = {
            'id': str(self.id),
            'answer_sheet_id': str(self.answer_sheet_id.id),
            'exam_id': str(self.exam_id.id),
            'total_marks_awarded': self.total_marks_awarded,
            'total_max_marks': self.total_max_marks,
            'percentage': self.percentage,
            'overall_feedback': self.overall_feedback,
            'overall_confidence': self.overall_confidence,
            'strictness': self.strictness,
            'status': self.status,
            'graded_at': self.graded_at.isoformat() if self.graded_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'question_evaluations': [
                {
                    'question_number': qe.question_number,
                    'max_marks': qe.max_marks,
                    'marks_awarded': qe.marks_awarded,
                    'feedback': qe.feedback,
                    'confidence': qe.confidence,
                    'keywords_found': qe.keywords_found,
                    'keywords_missing': qe.keywords_missing,
                    'concepts_covered': qe.concepts_covered,
                    'concepts_missing': qe.concepts_missing,
                    'override_applied': qe.override_applied,
                    'original_marks': qe.original_marks,
                    'override_reason': qe.override_reason,
                    'overridden_by': qe.overridden_by,
                    'overridden_at': qe.overridden_at.isoformat() if qe.overridden_at else None,
                }
                for qe in self.question_evaluations
            ] if self.question_evaluations else []
        }
        return data
