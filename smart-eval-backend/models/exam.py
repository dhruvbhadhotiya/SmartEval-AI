"""
Exam Model

Represents an exam created by a teacher for automated grading.
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
    BooleanField,
    DictField
)
from models.user import User


class QuestionPaper(EmbeddedDocument):
    """Embedded document for question paper details"""
    file_url = StringField()
    uploaded_at = DateTimeField()
    file_size = IntField(default=0)


class ParsedAnswer(EmbeddedDocument):
    """Embedded document for parsed model answer"""
    question_number = IntField(required=True)
    max_marks = FloatField(required=True)
    answer_text = StringField()
    keywords = ListField(StringField())
    concepts = ListField(StringField())


class ModelAnswer(EmbeddedDocument):
    """Embedded document for model answer details"""
    file_url = StringField()
    uploaded_at = DateTimeField()
    file_size = IntField(default=0)
    parsed_answers = ListField(EmbeddedDocumentField(ParsedAnswer))


class HolisticParameter(EmbeddedDocument):
    """Embedded document for holistic grading parameters"""
    enabled = BooleanField(default=False)
    weight = FloatField(default=0, min_value=0, max_value=20)
    threshold = FloatField(default=0)
    direction = StringField(choices=['higher', 'lower'], default='higher')


class GradingConfig(EmbeddedDocument):
    """Embedded document for grading configuration"""
    strictness = StringField(
        choices=['lenient', 'moderate', 'strict'],
        default='moderate'
    )
    holistic_params = DictField()  # Flexible structure for various parameters
    keyword_mode = StringField(
        choices=['exact', 'synonyms'],
        default='synonyms'
    )


class ExamStatistics(EmbeddedDocument):
    """Embedded document for exam statistics"""
    total_sheets = IntField(default=0)  # Total answer sheets uploaded
    total_submissions = IntField(default=0)  # Alias for total_sheets (for compatibility)
    graded = IntField(default=0)
    reviewed = IntField(default=0)
    average_score = FloatField(default=0.0)
    highest_score = FloatField(default=0.0)
    lowest_score = FloatField(default=0.0)


class Exam(Document):
    """
    Exam Model
    
    Represents an exam created by a teacher with question paper,
    model answers, and grading configuration.
    """
    
    # Basic Information
    teacher_id = ReferenceField(User, required=True)
    title = StringField(required=True, max_length=200)
    subject = StringField(required=True, max_length=100)
    exam_date = DateTimeField()
    max_marks = FloatField(default=100.0)
    duration_minutes = IntField(default=180)
    
    # Status tracking
    status = StringField(
        choices=['draft', 'configuring', 'grading', 'reviewing', 'published'],
        default='draft'
    )
    
    # File References
    question_paper = EmbeddedDocumentField(QuestionPaper)
    model_answer = EmbeddedDocumentField(ModelAnswer)
    
    # Grading Configuration
    grading_config = EmbeddedDocumentField(GradingConfig, default=GradingConfig)
    
    # Statistics
    statistics = EmbeddedDocumentField(ExamStatistics, default=ExamStatistics)
    
    # Timestamps
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    published_at = DateTimeField()
    
    # MongoDB Collection Settings
    meta = {
        'collection': 'exams',
        'indexes': [
            'teacher_id',
            'status',
            '-created_at',
            'exam_date'
        ],
        'ordering': ['-created_at']
    }
    
    def save(self, *args, **kwargs):
        """Override save to update timestamps"""
        self.updated_at = datetime.utcnow()
        return super(Exam, self).save(*args, **kwargs)
    
    def to_dict(self, include_stats=True):
        """Convert exam to dictionary for JSON response"""
        data = {
            'id': str(self.id),
            'title': self.title,
            'subject': self.subject,
            'exam_date': self.exam_date.isoformat() if self.exam_date else None,
            'max_marks': self.max_marks,
            'duration_minutes': self.duration_minutes,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        
        # Include question paper if exists
        if self.question_paper and self.question_paper.file_url:
            data['question_paper'] = {
                'file_url': self.question_paper.file_url,
                'uploaded_at': self.question_paper.uploaded_at.isoformat() if self.question_paper.uploaded_at else None,
                'file_size': self.question_paper.file_size or 0
            }
        
        # Include model answer if exists
        if self.model_answer and self.model_answer.file_url:
            data['model_answer'] = {
                'file_url': self.model_answer.file_url,
                'uploaded_at': self.model_answer.uploaded_at.isoformat() if self.model_answer.uploaded_at else None,
                'file_size': self.model_answer.file_size or 0,
                'parsed_answers': [
                    {
                        'question_number': ans.question_number,
                        'max_marks': ans.max_marks,
                        'answer_text': ans.answer_text,
                        'keywords': ans.keywords,
                        'concepts': ans.concepts
                    }
                    for ans in self.model_answer.parsed_answers
                ] if self.model_answer.parsed_answers else []
            }
        
        # Include grading config
        if self.grading_config:
            data['grading_config'] = {
                'strictness': self.grading_config.strictness,
                'holistic_params': self.grading_config.holistic_params,
                'keyword_mode': self.grading_config.keyword_mode
            }
        
        # Include statistics if requested
        if include_stats and self.statistics:
            data['statistics'] = {
                'total_sheets': self.statistics.total_sheets,
                'total_submissions': self.statistics.total_submissions or self.statistics.total_sheets,  # Use total_submissions if set, otherwise total_sheets
                'graded': self.statistics.graded,
                'reviewed': self.statistics.reviewed,
                'average_score': self.statistics.average_score,
                'highest_score': self.statistics.highest_score,
                'lowest_score': self.statistics.lowest_score
            }
        
        # Include published_at if published
        if self.published_at:
            data['published_at'] = self.published_at.isoformat()
        
        return data
    
    def to_summary_dict(self):
        """Convert exam to summary dictionary for list views"""
        return {
            'id': str(self.id),
            'title': self.title,
            'subject': self.subject,
            'exam_date': self.exam_date.isoformat() if self.exam_date else None,
            'max_marks': self.max_marks,
            'duration_minutes': self.duration_minutes,
            'status': self.status,
            'statistics': {
                'total_sheets': self.statistics.total_sheets if self.statistics else 0,
                'graded': self.statistics.graded if self.statistics else 0,
                'reviewed': self.statistics.reviewed if self.statistics else 0
            },
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def can_be_edited(self):
        """Check if exam can be edited"""
        return self.status in ['draft', 'configuring']
    
    def can_be_deleted(self):
        """Check if exam can be deleted"""
        return self.status == 'draft'
    
    def update_statistics(self, total_sheets=None, graded=None, reviewed=None,
                         average_score=None, highest_score=None, lowest_score=None):
        """Update exam statistics"""
        if not self.statistics:
            self.statistics = ExamStatistics()
        
        if total_sheets is not None:
            self.statistics.total_sheets = total_sheets
        if graded is not None:
            self.statistics.graded = graded
        if reviewed is not None:
            self.statistics.reviewed = reviewed
        if average_score is not None:
            self.statistics.average_score = average_score
        if highest_score is not None:
            self.statistics.highest_score = highest_score
        if lowest_score is not None:
            self.statistics.lowest_score = lowest_score
        
        self.save()
