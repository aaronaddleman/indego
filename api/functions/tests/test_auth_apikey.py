"""Tests for API key authentication in auth middleware."""

from unittest.mock import patch, MagicMock
from datetime import datetime, timezone, timedelta

import pytest

from app.auth import get_context_value, AuthError


def _make_request(api_key=None, bearer=None):
    """Create a mock Flask request with optional auth headers."""
    req = MagicMock()
    header_data = {}
    if bearer:
        header_data["Authorization"] = f"Bearer {bearer}"
    if api_key:
        header_data["X-API-Key"] = api_key

    req.headers = MagicMock()
    req.headers.get = MagicMock(side_effect=lambda key, default="": header_data.get(key, default))
    return req


class TestApiKeyAuth:
    @patch("app.auth.ratelimit_repo")
    @patch("app.auth.is_email_allowed")
    @patch("app.auth._verify_api_key")
    def test_valid_api_key_sets_context(self, mock_verify_key, mock_allowed, mock_ratelimit):
        mock_verify_key.return_value = {
            "userId": "user-123",
            "email": "test@example.com",
        }
        mock_allowed.return_value = True
        mock_ratelimit.check_and_increment.return_value = True

        req = _make_request(api_key="indego_abc123")
        ctx = get_context_value(req)

        assert ctx["user_id"] == "user-123"
        assert ctx["email"] == "test@example.com"
        assert ctx["auth_method"] == "api_key"

    @patch("app.auth.ratelimit_repo")
    @patch("app.auth.is_email_allowed")
    @patch("app.auth._verify_api_key")
    @patch("app.auth._verify_token")
    def test_bearer_takes_precedence_over_api_key(
        self, mock_verify_token, mock_verify_key, mock_allowed, mock_ratelimit
    ):
        mock_verify_token.return_value = {
            "uid": "bearer-user",
            "email": "bearer@example.com",
        }
        mock_allowed.return_value = True

        req = _make_request(api_key="indego_abc123", bearer="valid-token")
        ctx = get_context_value(req)

        assert ctx["user_id"] == "bearer-user"
        assert ctx["auth_method"] == "bearer"
        mock_verify_key.assert_not_called()

    @patch("app.auth._verify_api_key")
    def test_expired_key_returns_empty_context(self, mock_verify_key):
        mock_verify_key.side_effect = AuthError("API key has expired")

        req = _make_request(api_key="indego_expired")
        ctx = get_context_value(req)

        assert ctx["user_id"] is None

    @patch("app.auth._verify_api_key")
    def test_revoked_key_returns_empty_context(self, mock_verify_key):
        mock_verify_key.side_effect = AuthError("API key has been revoked")

        req = _make_request(api_key="indego_revoked")
        ctx = get_context_value(req)

        assert ctx["user_id"] is None

    @patch("app.auth._verify_api_key")
    def test_unknown_key_returns_empty_context(self, mock_verify_key):
        mock_verify_key.side_effect = AuthError("Invalid API key")

        req = _make_request(api_key="indego_unknown")
        ctx = get_context_value(req)

        assert ctx["user_id"] is None

    def test_no_auth_headers_returns_empty_context(self):
        req = _make_request()
        ctx = get_context_value(req)

        assert ctx["user_id"] is None

    @patch("app.auth.ratelimit_repo")
    @patch("app.auth.is_email_allowed")
    @patch("app.auth._verify_api_key")
    def test_api_key_user_not_in_allowlist(self, mock_verify_key, mock_allowed, mock_ratelimit):
        mock_verify_key.return_value = {
            "userId": "user-123",
            "email": "removed@example.com",
        }
        mock_allowed.return_value = False

        req = _make_request(api_key="indego_abc123")
        ctx = get_context_value(req)

        assert ctx["user_id"] is None


class TestVerifyApiKey:
    @patch("app.auth.apikey_repo")
    def test_valid_key_returns_user_info(self, mock_repo):
        from app.auth import _verify_api_key

        mock_repo.get_key_by_hash.return_value = {
            "userId": "user-123",
            "email": "test@example.com",
            "expiresAt": datetime(2027, 4, 5, tzinfo=timezone.utc),
            "revokedAt": None,
        }

        result = _verify_api_key("indego_abc123def456")
        assert result["userId"] == "user-123"
        assert result["email"] == "test@example.com"

    @patch("app.auth.apikey_repo")
    def test_expired_key_raises(self, mock_repo):
        from app.auth import _verify_api_key

        mock_repo.get_key_by_hash.return_value = {
            "userId": "user-123",
            "email": "test@example.com",
            "expiresAt": datetime(2020, 1, 1, tzinfo=timezone.utc),
            "revokedAt": None,
        }

        with pytest.raises(AuthError, match="expired"):
            _verify_api_key("indego_abc123def456")

    @patch("app.auth.apikey_repo")
    def test_revoked_key_raises(self, mock_repo):
        from app.auth import _verify_api_key

        mock_repo.get_key_by_hash.return_value = {
            "userId": "user-123",
            "email": "test@example.com",
            "expiresAt": datetime(2027, 4, 5, tzinfo=timezone.utc),
            "revokedAt": datetime(2026, 4, 1, tzinfo=timezone.utc),
        }

        with pytest.raises(AuthError, match="revoked"):
            _verify_api_key("indego_abc123def456")

    @patch("app.auth.apikey_repo")
    def test_unknown_key_raises(self, mock_repo):
        from app.auth import _verify_api_key

        mock_repo.get_key_by_hash.return_value = None

        with pytest.raises(AuthError, match="Invalid"):
            _verify_api_key("indego_doesnotexist")


class TestRateLimiting:
    @patch("app.auth.ratelimit_repo")
    @patch("app.auth.is_email_allowed")
    @patch("app.auth._verify_api_key")
    def test_rate_limited_returns_empty_context(
        self, mock_verify_key, mock_allowed, mock_ratelimit
    ):
        mock_verify_key.return_value = {
            "userId": "user-123",
            "email": "test@example.com",
        }
        mock_allowed.return_value = True
        mock_ratelimit.check_and_increment.return_value = False  # rate limited

        req = _make_request(api_key="indego_abc123")
        ctx = get_context_value(req)
        assert ctx["user_id"] is None

    @patch("app.auth.ratelimit_repo")
    @patch("app.auth.is_email_allowed")
    @patch("app.auth._verify_api_key")
    def test_within_rate_limit_allows_request(
        self, mock_verify_key, mock_allowed, mock_ratelimit
    ):
        mock_verify_key.return_value = {
            "userId": "user-123",
            "email": "test@example.com",
        }
        mock_allowed.return_value = True
        mock_ratelimit.check_and_increment.return_value = True  # allowed

        req = _make_request(api_key="indego_abc123")
        ctx = get_context_value(req)
        assert ctx["user_id"] == "user-123"
        assert ctx["auth_method"] == "api_key"
