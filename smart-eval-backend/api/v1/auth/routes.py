"""
Authentication endpoints
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError

from api.v1.auth.schemas import RegisterSchema, LoginSchema
from services.auth_service import AuthService
from utils.helpers import success_response, error_response
from utils.exceptions import (
    ValidationError as CustomValidationError,
    AuthenticationError,
    ConflictError
)

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Register a new user
    
    ---
    POST /api/v1/auth/register
    """
    try:
        # Validate request data
        schema = RegisterSchema()
        data = schema.load(request.get_json())
        
        # Register user
        user = AuthService.register_user(
            email=data['email'],
            password=data['password'],
            role=data['role'],
            profile=data.get('profile', {})
        )
        
        return jsonify(success_response({
            'id': str(user.id),
            'email': user.email,
            'role': user.role,
            'profile': user.profile,
            'created_at': user.created_at.isoformat()
        }, status_code=201))
    
    except ValidationError as e:
        return jsonify(error_response(
            'VALIDATION_ERROR',
            'Invalid input data',
            e.messages,
            400
        ))
    
    except CustomValidationError as e:
        return jsonify(error_response(
            'VALIDATION_ERROR',
            e.message,
            status_code=400
        ))
    
    except ConflictError as e:
        return jsonify(error_response(
            'CONFLICT',
            e.message,
            status_code=409
        ))
    
    except Exception as e:
        return jsonify(error_response(
            'INTERNAL_ERROR',
            'An unexpected error occurred',
            status_code=500
        ))


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Authenticate user and return tokens
    
    ---
    POST /api/v1/auth/login
    """
    try:
        # Validate request data
        schema = LoginSchema()
        data = schema.load(request.get_json())
        
        # Authenticate user
        result = AuthService.login_user(
            email=data['email'],
            password=data['password']
        )
        
        return jsonify(success_response(result))
    
    except ValidationError as e:
        return jsonify(error_response(
            'VALIDATION_ERROR',
            'Invalid input data',
            e.messages,
            400
        ))
    
    except AuthenticationError as e:
        return jsonify(error_response(
            'UNAUTHORIZED',
            e.message,
            status_code=401
        ))
    
    except Exception as e:
        return jsonify(error_response(
            'INTERNAL_ERROR',
            'An unexpected error occurred',
            status_code=500
        ))


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """
    Refresh access token using refresh token
    
    ---
    POST /api/v1/auth/refresh
    """
    try:
        # Get user ID from refresh token
        user_id = get_jwt_identity()
        
        # Generate new access token
        result = AuthService.refresh_access_token(user_id)
        
        return jsonify(success_response(result))
    
    except AuthenticationError as e:
        return jsonify(error_response(
            'UNAUTHORIZED',
            e.message,
            status_code=401
        ))
    
    except Exception as e:
        return jsonify(error_response(
            'INTERNAL_ERROR',
            'An unexpected error occurred',
            status_code=500
        ))


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """
    Logout user (client should discard tokens)
    
    ---
    POST /api/v1/auth/logout
    """
    # In a stateless JWT system, logout is handled client-side
    # For token blacklisting, implement Redis-based token revocation
    return jsonify(success_response({
        'message': 'Logged out successfully'
    }))


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """
    Get current authenticated user
    
    ---
    GET /api/v1/auth/me
    """
    try:
        user_id = get_jwt_identity()
        user = AuthService.get_user_by_id(user_id)
        
        if not user:
            return jsonify(error_response(
                'NOT_FOUND',
                'User not found',
                status_code=404
            ))
        
        return jsonify(success_response(user.to_dict()))
    
    except Exception as e:
        return jsonify(error_response(
            'INTERNAL_ERROR',
            'An unexpected error occurred',
            status_code=500
        ))
