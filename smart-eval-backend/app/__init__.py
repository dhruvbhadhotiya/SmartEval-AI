"""
Flask app factory
"""
from flask import Flask, jsonify, send_from_directory, request
import os

from app.config import config
from app.extensions import init_extensions


def create_app(config_name=None):
    """
    Application factory pattern

    Args:
        config_name: Configuration name (development, testing, production)

    Returns:
        Flask application instance
    """
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')

    app = Flask(__name__)

    # Load configuration
    app.config.from_object(config[config_name])

    # Initialize extensions
    init_extensions(app)

    # Register blueprints
    register_blueprints(app)

    # Register error handlers
    register_error_handlers(app)

    # Security headers
    @app.after_request
    def set_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        if request.is_secure:
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        return response

    # Health check endpoint
    @app.route('/health', methods=['GET'])
    def health_check():
        """Health check endpoint"""
        return jsonify({
            'status': 'healthy',
            'service': 'smart-eval-api',
            'version': '1.0.0'
        }), 200

    # Serve uploaded files
    @app.route('/uploads/<path:filename>', methods=['GET'])
    def serve_upload(filename):
        """Serve uploaded files from the uploads directory"""
        uploads_dir = os.path.join(app.root_path, '..', 'uploads')
        return send_from_directory(uploads_dir, filename)

    return app


def register_blueprints(app):
    """Register Flask blueprints"""
    from api.v1 import api_v1
    
    app.register_blueprint(api_v1, url_prefix='/api/v1')


def register_error_handlers(app):
    """Register error handlers"""

    from utils.exceptions import SmartEvalException

    @app.errorhandler(SmartEvalException)
    def handle_smart_eval_error(error):
        return jsonify({
            'success': False,
            'error': {
                'code': error.status_code,
                'message': error.message
            }
        }), error.status_code

    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        return jsonify({
            'success': False,
            'error': {
                'code': 'RATE_LIMIT_EXCEEDED',
                'message': 'Too many requests. Please try again later.'
            }
        }), 429

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            'success': False,
            'error': {
                'code': 'BAD_REQUEST',
                'message': str(error)
            }
        }), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({
            'success': False,
            'error': {
                'code': 'UNAUTHORIZED',
                'message': 'Authentication required'
            }
        }), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({
            'success': False,
            'error': {
                'code': 'FORBIDDEN',
                'message': 'Insufficient permissions'
            }
        }), 403
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_FOUND',
                'message': 'Resource not found'
            }
        }), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            'success': False,
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'Internal server error'
            }
        }), 500
