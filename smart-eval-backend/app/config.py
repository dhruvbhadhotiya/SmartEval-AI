"""
Configuration classes for different environments
"""
import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration"""
    
    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = False
    TESTING = False
    
    # MongoDB
    MONGODB_SETTINGS = {
        'host': os.getenv('MONGODB_URI', 'mongodb://localhost:27017/smarteval'),
        'connect': False
    }
    
    # Redis (Optional - only needed for Celery)
    REDIS_URL = os.getenv('REDIS_URL', None)
    
    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 900)))  # 15 minutes
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=int(os.getenv('JWT_REFRESH_TOKEN_EXPIRES', 7)))  # 7 days
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'
    
    # File Upload
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', './uploads')
    ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}
    
    # CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')
    
    # Celery
    CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
    CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
    
    # AI Vision Model (OCR)
    VISION_PROVIDER = os.getenv('VISION_PROVIDER', 'ollama')  # 'ollama', 'openai', 'lmstudio', 'openrouter'
    VISION_API_URL = os.getenv('VISION_API_URL', 'http://localhost:11434/api/chat')
    VISION_MODEL = os.getenv('VISION_MODEL', 'llava')
    
    # AI LLM Model (Grading - Sprint 5)
    LLM_PROVIDER = os.getenv('LLM_PROVIDER', 'ollama')  # 'ollama', 'openai', 'lmstudio', 'openrouter'
    LLM_API_URL = os.getenv('LLM_API_URL', 'http://localhost:11434/api/chat')
    LLM_MODEL = os.getenv('LLM_MODEL', 'llama3')
    
    # OpenRouter (cloud API - used when VISION_PROVIDER or LLM_PROVIDER is 'openrouter')
    OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', '')


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    ENV = 'development'


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    MONGODB_SETTINGS = {
        'host': 'mongodb://localhost:27017/smarteval_test',
        'connect': False
    }


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    ENV = 'production'
    
    # Production requires these to be set
    SECRET_KEY = os.getenv('SECRET_KEY')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
