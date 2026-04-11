"""Unit tests for auth service — registration and login.

These tests require a running MongoDB instance. They will be skipped
automatically when MongoDB is not available.
"""
import pytest
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError


def _mongo_available():
    try:
        c = MongoClient('localhost', 27017, serverSelectionTimeoutMS=2000)
        c.admin.command('ping')
        c.close()
        return True
    except Exception:
        return False


needs_mongo = pytest.mark.skipif(
    not _mongo_available(),
    reason='MongoDB not running on localhost:27017',
)


@needs_mongo
class TestRegister:
    def test_register_teacher(self, client):
        resp = client.post('/api/v1/auth/register', json={
            'email': 'new_teacher@test.com',
            'password': 'Secure123',
            'role': 'teacher',
            'profile': {'name': 'New Teacher'}
        })
        assert resp.status_code == 201
        data = resp.get_json()
        assert data['success'] is True
        assert data['data']['email'] == 'new_teacher@test.com'

    def test_register_duplicate(self, client):
        payload = {
            'email': 'dup@test.com',
            'password': 'Secure123',
            'role': 'teacher',
        }
        client.post('/api/v1/auth/register', json=payload)
        resp = client.post('/api/v1/auth/register', json=payload)
        assert resp.status_code == 409

    def test_register_weak_password(self, client):
        resp = client.post('/api/v1/auth/register', json={
            'email': 'weak@test.com',
            'password': '123',
            'role': 'teacher',
        })
        assert resp.status_code == 400


@needs_mongo
class TestLogin:
    def test_login_success(self, client):
        client.post('/api/v1/auth/register', json={
            'email': 'login@test.com',
            'password': 'Secure123',
            'role': 'teacher',
        })
        resp = client.post('/api/v1/auth/login', json={
            'email': 'login@test.com',
            'password': 'Secure123',
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'access_token' in data['data']
        assert 'refresh_token' in data['data']

    def test_login_wrong_password(self, client):
        client.post('/api/v1/auth/register', json={
            'email': 'wrong@test.com',
            'password': 'Secure123',
            'role': 'teacher',
        })
        resp = client.post('/api/v1/auth/login', json={
            'email': 'wrong@test.com',
            'password': 'WrongPass1',
        })
        assert resp.status_code == 401

    def test_login_nonexistent(self, client):
        resp = client.post('/api/v1/auth/login', json={
            'email': 'nobody@test.com',
            'password': 'Whatever1',
        })
        assert resp.status_code == 401
