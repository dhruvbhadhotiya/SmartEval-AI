"""
Flask extensions initialization
"""
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from mongoengine import connect
import redis
import os

# Initialize extensions
cors = CORS()
jwt = JWTManager()

# MongoDB connection (will be initialized in app factory)
db = None

# Redis connection (will be initialized in app factory)
redis_client = None


def init_extensions(app):
    """Initialize Flask extensions"""
    
    # CORS
    cors.init_app(app, origins=app.config['CORS_ORIGINS'])
    
    # JWT
    jwt.init_app(app)
    
    # MongoDB
    global db
    db = connect(**app.config['MONGODB_SETTINGS'])
    
    # Redis (Optional - only for Celery tasks)
    global redis_client
    redis_url = app.config.get('REDIS_URL')
    if redis_url:
        try:
            redis_client = redis.from_url(redis_url)
            redis_client.ping()  # Test connection
            app.logger.info("Redis connected successfully")
        except Exception as e:
            app.logger.warning(f"Redis connection failed: {e}. Running without Redis.")
            redis_client = None
    else:
        app.logger.info("Redis not configured. Running without Redis.")
    
    return app
