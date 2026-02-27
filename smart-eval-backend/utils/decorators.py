"""
Custom decorators for route protection and validation
"""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from models.user import User


def role_required(allowed_roles):
    """
    Decorator to require specific roles for accessing routes
    
    Args:
        allowed_roles: List of allowed roles or single role string
    
    Usage:
        @role_required('teacher')
        @role_required(['teacher', 'admin'])
    """
    if isinstance(allowed_roles, str):
        allowed_roles = [allowed_roles]
    
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # Verify JWT token
            verify_jwt_in_request()
            
            # Get user ID from token
            user_id = get_jwt_identity()
            
            # Fetch user
            user = User.objects(id=user_id).first()
            if not user:
                return jsonify({
                    'success': False,
                    'error': {
                        'code': 'UNAUTHORIZED',
                        'message': 'User not found'
                    }
                }), 401
            
            # Check role
            if user.role not in allowed_roles:
                return jsonify({
                    'success': False,
                    'error': {
                        'code': 'FORBIDDEN',
                        'message': f'Access denied. Required roles: {", ".join(allowed_roles)}'
                    }
                }), 403
            
            return fn(*args, **kwargs)
        
        return wrapper
    return decorator


def get_current_user():
    """
    Get current authenticated user
    
    Returns:
        User object or None
    """
    try:
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        return User.objects(id=user_id).first()
    except:
        return None
