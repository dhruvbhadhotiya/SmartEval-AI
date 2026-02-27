"""
Utility helper functions
"""
import re
from datetime import datetime


def validate_email(email):
    """
    Validate email format
    
    Args:
        email: Email string to validate
    
    Returns:
        Boolean indicating if email is valid
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_password(password):
    """
    Validate password strength
    
    Requirements:
    - At least 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    
    Args:
        password: Password string to validate
    
    Returns:
        Tuple (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    
    return True, None


def format_datetime(dt):
    """
    Format datetime to ISO 8601 string
    
    Args:
        dt: datetime object
    
    Returns:
        ISO formatted string or None
    """
    if dt is None:
        return None
    return dt.isoformat() + 'Z'


def success_response(data=None, meta=None, status_code=200):
    """
    Create standardized success response
    
    Args:
        data: Response data
        meta: Metadata (pagination, etc.)
        status_code: HTTP status code
    
    Returns:
        Tuple (response_dict, status_code)
    """
    response = {
        'success': True,
        'data': data
    }
    
    if meta:
        response['meta'] = meta
    
    return response, status_code


def error_response(code, message, details=None, status_code=400):
    """
    Create standardized error response
    
    Args:
        code: Error code
        message: Error message
        details: Additional error details
        status_code: HTTP status code
    
    Returns:
        Tuple (response_dict, status_code)
    """
    response = {
        'success': False,
        'error': {
            'code': code,
            'message': message
        }
    }
    
    if details:
        response['error']['details'] = details
    
    return response, status_code
