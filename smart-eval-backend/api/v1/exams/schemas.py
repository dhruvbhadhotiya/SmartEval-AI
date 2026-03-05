"""
Exam API Schemas

Marshmallow schemas for exam request/response validation
"""
from marshmallow import Schema, fields, validate, validates, ValidationError


class CreateExamSchema(Schema):
    """Schema for creating a new exam"""
    title = fields.Str(
        required=True,
        validate=validate.Length(min=3, max=200),
        error_messages={'required': 'Exam title is required'}
    )
    subject = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=100),
        error_messages={'required': 'Subject is required'}
    )
    exam_date = fields.Date(
        required=False,
        allow_none=True,
        format='iso'
    )
    max_marks = fields.Float(
        required=False,
        missing=100.0,
        validate=validate.Range(min=1)
    )
    duration_minutes = fields.Int(
        required=False,
        missing=180,
        validate=validate.Range(min=1)
    )


class UpdateExamSchema(Schema):
    """Schema for updating exam details"""
    title = fields.Str(
        required=False,
        validate=validate.Length(min=3, max=200)
    )
    subject = fields.Str(
        required=False,
        validate=validate.Length(min=2, max=100)
    )
    exam_date = fields.Date(
        required=False,
        allow_none=True,
        format='iso'
    )
    max_marks = fields.Float(
        required=False,
        validate=validate.Range(min=1)
    )
    duration_minutes = fields.Int(
        required=False,
        validate=validate.Range(min=1)
    )


class ExamQuerySchema(Schema):
    """Schema for exam list query parameters"""
    page = fields.Int(
        required=False,
        missing=1,
        validate=validate.Range(min=1)
    )
    limit = fields.Int(
        required=False,
        missing=20,
        validate=validate.Range(min=1, max=100)
    )
    status = fields.Str(
        required=False,
        missing='all',
        validate=validate.OneOf([
            'all', 'draft', 'configuring', 'grading', 'reviewing', 'published'
        ])
    )
    sort = fields.Str(
        required=False,
        missing='-created_at',
        validate=validate.OneOf([
            'created_at', '-created_at',
            'exam_date', '-exam_date',
            'title', '-title'
        ])
    )


class UpdateStatusSchema(Schema):
    """Schema for updating exam status"""
    status = fields.Str(
        required=True,
        validate=validate.OneOf([
            'draft', 'configuring', 'grading', 'reviewing', 'published'
        ]),
        error_messages={'required': 'Status is required'}
    )

