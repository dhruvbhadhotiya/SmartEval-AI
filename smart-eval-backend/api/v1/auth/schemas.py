"""
Authentication request/response schemas
"""
from marshmallow import Schema, fields, validate, validates, ValidationError
from utils.helpers import validate_email as email_validator


class RegisterSchema(Schema):
    """Schema for user registration"""
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=8))
    role = fields.Str(required=True, validate=validate.OneOf(['teacher', 'student', 'admin']))
    profile = fields.Dict(missing={})
    
    @validates('email')
    def validate_email(self, value):
        if not email_validator(value):
            raise ValidationError('Invalid email format')


class LoginSchema(Schema):
    """Schema for user login"""
    email = fields.Email(required=True)
    password = fields.Str(required=True)


class RefreshTokenSchema(Schema):
    """Schema for token refresh"""
    refresh_token = fields.Str(required=True)


class PasswordResetRequestSchema(Schema):
    """Schema for password reset request"""
    email = fields.Email(required=True)


class PasswordResetSchema(Schema):
    """Schema for password reset"""
    token = fields.Str(required=True)
    new_password = fields.Str(required=True, validate=validate.Length(min=8))
