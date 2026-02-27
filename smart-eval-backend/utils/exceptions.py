"""
Custom exceptions for the application
"""


class SmartEvalException(Exception):
    """Base exception for Smart-Eval application"""
    status_code = 500
    
    def __init__(self, message, status_code=None, payload=None):
        super().__init__()
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload
    
    def to_dict(self):
        rv = dict(self.payload or ())
        rv['message'] = self.message
        return rv


class ValidationError(SmartEvalException):
    """Validation error exception"""
    status_code = 400


class AuthenticationError(SmartEvalException):
    """Authentication error exception"""
    status_code = 401


class AuthorizationError(SmartEvalException):
    """Authorization error exception"""
    status_code = 403


class NotFoundError(SmartEvalException):
    """Not found error exception"""
    status_code = 404


class ConflictError(SmartEvalException):
    """Conflict error exception"""
    status_code = 409
