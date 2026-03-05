"""
API v1 Blueprint registration
"""
from flask import Blueprint

from api.v1.auth import auth_bp
from api.v1.exams import exam_bp

# Create main API v1 blueprint
api_v1 = Blueprint('api_v1', __name__)

# Register sub-blueprints
api_v1.register_blueprint(auth_bp, url_prefix='/auth')
api_v1.register_blueprint(exam_bp)

__all__ = ['api_v1']
