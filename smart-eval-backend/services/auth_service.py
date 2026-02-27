"""
Authentication service
"""
from datetime import datetime
from flask_jwt_extended import create_access_token, create_refresh_token
from models.user import User
from utils.exceptions import ValidationError, AuthenticationError, ConflictError
from utils.helpers import validate_email, validate_password


class AuthService:
    """Service for authentication operations"""
    
    @staticmethod
    def register_user(email, password, role, profile=None):
        """
        Register a new user
        
        Args:
            email: User email
            password: User password
            role: User role (teacher, student, admin)
            profile: Optional profile dict
        
        Returns:
            User object
        
        Raises:
            ValidationError: If validation fails
            ConflictError: If user already exists
        """
        # Validate email
        if not validate_email(email):
            raise ValidationError('Invalid email format')
        
        # Validate password
        is_valid, error_msg = validate_password(password)
        if not is_valid:
            raise ValidationError(error_msg)
        
        # Validate role
        if role not in ['teacher', 'student', 'admin']:
            raise ValidationError('Invalid role. Must be teacher, student, or admin')
        
        # Check if user already exists
        if User.objects(email=email).first():
            raise ConflictError('User with this email already exists')
        
        # Create user
        user = User(
            email=email,
            role=role,
            profile=profile or {}
        )
        user.set_password(password)
        user.save()
        
        return user
    
    @staticmethod
    def login_user(email, password):
        """
        Authenticate user and generate tokens
        
        Args:
            email: User email
            password: User password
        
        Returns:
            Dict with access_token, refresh_token, and user
        
        Raises:
            AuthenticationError: If authentication fails
        """
        # Find user
        user = User.objects(email=email).first()
        if not user:
            raise AuthenticationError('Invalid email or password')
        
        # Verify password
        if not user.check_password(password):
            raise AuthenticationError('Invalid email or password')
        
        # Update last login
        user.last_login = datetime.utcnow()
        user.save()
        
        # Generate tokens
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))
        
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': 900,  # 15 minutes
            'user': user.to_dict()
        }
    
    @staticmethod
    def refresh_access_token(user_id):
        """
        Generate new access token
        
        Args:
            user_id: User ID
        
        Returns:
            Dict with new access_token
        
        Raises:
            AuthenticationError: If user not found
        """
        user = User.objects(id=user_id).first()
        if not user:
            raise AuthenticationError('User not found')
        
        access_token = create_access_token(identity=str(user.id))
        
        return {
            'access_token': access_token,
            'expires_in': 900
        }
    
    @staticmethod
    def get_user_by_id(user_id):
        """
        Get user by ID
        
        Args:
            user_id: User ID
        
        Returns:
            User object or None
        """
        return User.objects(id=user_id).first()
