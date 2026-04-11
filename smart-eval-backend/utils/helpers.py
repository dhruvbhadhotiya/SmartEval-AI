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


def success_response(data=None, message=None, meta=None):
    """
    Create standardized success response
    
    Args:
        data: Response data
        message: Success message (optional)
        meta: Metadata (pagination, etc.)
    
    Returns:
        Dictionary with success response
    """
    response = {
        'success': True,
        'data': data
    }
    
    if message:
        response['message'] = message
    
    if meta:
        response['meta'] = meta
    
    return response


def error_response(message, code=None, details=None):
    """
    Create standardized error response.

    When ``code`` is an int (HTTP status), returns ``(dict, status)`` so
    Flask can serialise it directly.  When ``code`` is a string, returns
    a plain dict (caller adds jsonify + status).

    Args:
        message: Error message
        code: Numeric HTTP status **or** string error code
        details: Additional error details
    """
    if isinstance(code, int):
        http_status = code
        error_code = code
    else:
        http_status = None
        error_code = code or 'ERROR'

    response = {
        'success': False,
        'error': {
            'code': error_code,
            'message': message
        }
    }

    if details:
        response['error']['details'] = details

    if http_status is not None:
        # Return (dict, status) — Flask 2.2+ auto-serialises dicts.
        # Unlike the old version this is NOT (jsonify(dict), status),
        # so wrapping with jsonify() won't double-wrap.
        return response, http_status

    return response
