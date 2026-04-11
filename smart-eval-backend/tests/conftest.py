"""
Pytest fixtures for SmartEval test suite.
"""
import pytest
from app import create_app
from mongoengine import disconnect


@pytest.fixture(scope='session')
def app():
    """Create a Flask app configured for testing."""
    application = create_app('testing')
    yield application


@pytest.fixture(scope='session')
def client(app):
    """Flask test client."""
    return app.test_client()


@pytest.fixture(autouse=True)
def clean_db():
    """Drop the test database between tests."""
    yield
    from mongoengine import get_db
    try:
        db = get_db()
        for collection in db.list_collection_names():
            db[collection].drop()
    except Exception:
        pass


@pytest.fixture
def auth_headers(client):
    """Register a teacher and return auth headers."""
    client.post('/api/v1/auth/register', json={
        'email': 'teacher@test.com',
        'password': 'TestPass123',
        'role': 'teacher',
        'profile': {'name': 'Test Teacher'}
    })
    resp = client.post('/api/v1/auth/login', json={
        'email': 'teacher@test.com',
        'password': 'TestPass123'
    })
    token = resp.get_json()['data']['access_token']
    return {'Authorization': f'Bearer {token}'}
