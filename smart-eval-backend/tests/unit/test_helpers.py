"""Unit tests for utils/helpers.py"""
from utils.helpers import (
    success_response,
    error_response,
    validate_email,
    validate_password,
    format_datetime,
)
from datetime import datetime


class TestSuccessResponse:
    def test_basic(self):
        result = success_response(data={'id': 1})
        assert result['success'] is True
        assert result['data'] == {'id': 1}

    def test_with_message(self):
        result = success_response(data=None, message='Done')
        assert result['message'] == 'Done'

    def test_with_meta(self):
        result = success_response(data=[], meta={'page': 1, 'total': 10})
        assert result['meta']['page'] == 1


class TestErrorResponse:
    def test_string_code(self):
        result = error_response('Bad input', code='VALIDATION_ERROR')
        assert isinstance(result, dict)
        assert result['success'] is False
        assert result['error']['code'] == 'VALIDATION_ERROR'

    def test_int_code_returns_tuple(self):
        result = error_response('Not found', 404)
        assert isinstance(result, tuple)
        body, status = result
        assert status == 404
        assert body['success'] is False
        assert body['error']['code'] == 404

    def test_with_details(self):
        result = error_response('Bad', code='ERR', details={'field': 'email'})
        assert result['error']['details'] == {'field': 'email'}


class TestValidateEmail:
    def test_valid(self):
        assert validate_email('user@example.com') is True

    def test_invalid(self):
        assert validate_email('not-an-email') is False
        assert validate_email('') is False

    def test_subdomains(self):
        assert validate_email('user@sub.domain.com') is True


class TestValidatePassword:
    def test_valid(self):
        ok, msg = validate_password('StrongPass1')
        assert ok is True
        assert msg is None

    def test_too_short(self):
        ok, msg = validate_password('Ab1')
        assert ok is False
        assert 'at least 8' in msg

    def test_no_uppercase(self):
        ok, msg = validate_password('lowercase1')
        assert ok is False

    def test_no_digit(self):
        ok, msg = validate_password('NoDigitHere')
        assert ok is False


class TestFormatDatetime:
    def test_none(self):
        assert format_datetime(None) is None

    def test_datetime(self):
        dt = datetime(2026, 1, 15, 10, 30, 0)
        result = format_datetime(dt)
        assert result.endswith('Z')
        assert '2026-01-15' in result
