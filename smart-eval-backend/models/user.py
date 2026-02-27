"""
User model
"""
from mongoengine import Document, StringField, EmailField, DictField, DateTimeField
from datetime import datetime
import bcrypt


class User(Document):
    """User model for authentication and authorization"""
    
    email = EmailField(required=True, unique=True)
    password_hash = StringField(required=True)
    role = StringField(required=True, choices=['teacher', 'student', 'admin'])
    
    # Profile information
    profile = DictField(default={})
    
    # Settings
    settings = DictField(default={
        'notifications': {
            'email': True,
            'in_app': True
        }
    })
    
    # Timestamps
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    last_login = DateTimeField()
    
    meta = {
        'collection': 'users',
        'indexes': [
            'email',
            'role',
            'created_at'
        ]
    }
    
    def set_password(self, password):
        """Hash and set password"""
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def check_password(self, password):
        """Verify password"""
        return bcrypt.checkpw(
            password.encode('utf-8'),
            self.password_hash.encode('utf-8')
        )
    
    def to_dict(self):
        """Convert to dictionary (exclude password)"""
        return {
            'id': str(self.id),
            'email': self.email,
            'role': self.role,
            'profile': self.profile,
            'settings': self.settings,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }
    
    def save(self, *args, **kwargs):
        """Override save to update timestamp"""
        self.updated_at = datetime.utcnow()
        return super(User, self).save(*args, **kwargs)
