"""
Answer Sheet Model

Represents a student's answer sheet for an exam
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


class OriginalFile(EmbeddedDocument):
    """Embedded document for original answer sheet file"""
    url = StringField(required=True)
    pages = IntField(default=1)
    uploaded_at = DateTimeField(default=datetime.utcnow)


class OCRResult(EmbeddedDocument):
    """Embedded document for OCR results per page"""
    page_number = IntField(required=True)
    text = StringField()
    confidence = FloatField(default=0.0)
    processed_at = DateTimeField(default=datetime.utcnow)


class ProcessingLog(EmbeddedDocument):
    """Embedded document for processing log entries"""
    stage = StringField(required=True)
    status = StringField(required=True)
    timestamp = DateTimeField(default=datetime.utcnow)
    details = DictField()


class AnswerSheet(Document):
    """
    Answer Sheet Model
    
    Represents a student's submitted answer sheet for an exam
    """
    
    # References
    exam_id = ReferenceField(Exam, required=True)
    student_id = ReferenceField(User, required=True)
    
    # File information
    original_file = EmbeddedDocumentField(OriginalFile, required=True)
    
    # OCR Results
    ocr_results = ListField(EmbeddedDocumentField(OCRResult))
    
    # Status tracking
    status = StringField(
        choices=['uploaded', 'processing', 'ocr_completed', 'graded', 'reviewed', 'challenged', 'failed'],
        default='uploaded'
    )
    
    # Processing log
    processing_log = ListField(EmbeddedDocumentField(ProcessingLog))
    
    # Timestamps
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    # MongoDB Collection Settings
    meta = {
        'collection': 'answer_sheets',
        'indexes': [
            'exam_id',
            'student_id',
            'status',
            '-created_at',
            ('exam_id', 'student_id')  # Compound index
        ],
        'ordering': ['-created_at']
    }
    
    def save(self, *args, **kwargs):
        """Override save to update timestamps"""
        self.updated_at = datetime.utcnow()
        return super(AnswerSheet, self).save(*args, **kwargs)
    
    def to_dict(self, include_ocr=False):
        """Convert answer sheet to dictionary for JSON response"""
        data = {
            'id': str(self.id),
            'exam_id': str(self.exam_id.id),
            'student_id': str(self.student_id.id),
            'status': self.status,
            'original_file': {
                'url': self.original_file.url,
                'pages': self.original_file.pages,
                'uploaded_at': self.original_file.uploaded_at.isoformat() if self.original_file.uploaded_at else None
            } if self.original_file else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        # Include OCR results if requested (can be large)
        if include_ocr and self.ocr_results:
            data['ocr_results'] = [
                {
                    'page_number': ocr.page_number,
                    'text': ocr.text,
                    'confidence': ocr.confidence,
                    'processed_at': ocr.processed_at.isoformat() if ocr.processed_at else None
                }
                for ocr in self.ocr_results
            ]
        
        # Include processing log
        if self.processing_log:
            data['processing_log'] = [
                {
                    'stage': log.stage,
                    'status': log.status,
                    'timestamp': log.timestamp.isoformat() if log.timestamp else None,
                    'details': log.details
                }
                for log in self.processing_log
            ]
        
        return data
    
    def add_processing_log(self, stage, status, details=None):
        """Add entry to processing log"""
        log_entry = ProcessingLog(
            stage=stage,
            status=status,
            details=details or {}
        )
        if not self.processing_log:
            self.processing_log = []
        self.processing_log.append(log_entry)
        self.save()
    
    def update_status(self, new_status):
        """Update answer sheet status"""
        valid_statuses = ['uploaded', 'processing', 'ocr_completed', 'graded', 'reviewed', 'challenged', 'failed']
        if new_status not in valid_statuses:
            raise ValueError(f"Invalid status: {new_status}")
        
        self.status = new_status
        self.add_processing_log(
            stage='status_change',
            status='success',
            details={'new_status': new_status}
        )
        self.save()
