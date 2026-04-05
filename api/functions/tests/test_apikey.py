"""Tests for API key service and repository layers."""

from unittest.mock import patch, MagicMock
from datetime import datetime, timezone, timedelta

import pytest

from app.services import apikey_service


class TestCreateApiKey:
    @patch("app.services.apikey_service.apikey_repo")
    @patch("app.services.apikey_service.allowlist_repo")
    def test_creates_key_and_returns_plaintext(self, mock_allowlist, mock_repo, user_id):
        mock_allowlist.get_allowed_email.return_value = {
            "email": "test@example.com",
            "isAdmin": False,
            "canManageApiKeys": True,
        }
        mock_repo.count_active_keys.return_value = 0
        mock_repo.create_key.return_value = {
            "userId": user_id,
            "name": "MCP Server",
            "keyPrefix": "indego_a",
            "createdAt": datetime.now(timezone.utc),
            "expiresAt": datetime(2027, 4, 5, tzinfo=timezone.utc),
            "revokedAt": None,
        }

        expires = datetime(2027, 4, 5, tzinfo=timezone.utc)
        result = apikey_service.create_key(
            user_id, "test@example.com", "MCP Server", expires
        )

        assert "key" in result  # plaintext key returned
        assert result["key"].startswith("indego_")
        assert result["apiKey"]["name"] == "MCP Server"
        mock_repo.create_key.assert_called_once()

    @patch("app.services.apikey_service.apikey_repo")
    @patch("app.services.apikey_service.allowlist_repo")
    def test_rejects_when_max_keys_reached(self, mock_allowlist, mock_repo, user_id):
        mock_allowlist.get_allowed_email.return_value = {
            "email": "test@example.com",
            "canManageApiKeys": True,
        }
        mock_repo.count_active_keys.return_value = 2

        expires = datetime(2027, 4, 5, tzinfo=timezone.utc)
        with pytest.raises(Exception, match="Maximum of 2 active API keys"):
            apikey_service.create_key(
                user_id, "test@example.com", "Another Key", expires
            )

    @patch("app.services.apikey_service.allowlist_repo")
    def test_rejects_without_permission(self, mock_allowlist, user_id):
        mock_allowlist.get_allowed_email.return_value = {
            "email": "test@example.com",
            "canManageApiKeys": False,
        }

        expires = datetime(2027, 4, 5, tzinfo=timezone.utc)
        with pytest.raises(Exception, match="permission required"):
            apikey_service.create_key(
                user_id, "test@example.com", "Key", expires
            )

    @patch("app.services.apikey_service.allowlist_repo")
    def test_rejects_past_expiration(self, mock_allowlist, user_id):
        mock_allowlist.get_allowed_email.return_value = {
            "email": "test@example.com",
            "canManageApiKeys": True,
        }

        past = datetime(2020, 1, 1, tzinfo=timezone.utc)
        with pytest.raises(Exception, match="must be in the future"):
            apikey_service.create_key(
                user_id, "test@example.com", "Key", past
            )

    @patch("app.services.apikey_service.allowlist_repo")
    def test_rejects_empty_name(self, mock_allowlist, user_id):
        mock_allowlist.get_allowed_email.return_value = {
            "email": "test@example.com",
            "canManageApiKeys": True,
        }

        expires = datetime(2027, 4, 5, tzinfo=timezone.utc)
        with pytest.raises(Exception, match="name is required"):
            apikey_service.create_key(
                user_id, "test@example.com", "  ", expires
            )


class TestRevokeApiKey:
    @patch("app.services.apikey_service.apikey_repo")
    @patch("app.services.apikey_service.allowlist_repo")
    def test_revokes_own_key(self, mock_allowlist, mock_repo, user_id):
        mock_allowlist.get_allowed_email.return_value = {
            "email": "test@example.com",
            "canManageApiKeys": True,
        }
        mock_repo.get_key_by_id.return_value = {
            "userId": user_id,
            "name": "MCP Server",
            "revokedAt": None,
        }
        mock_repo.revoke_key.return_value = {
            "userId": user_id,
            "name": "MCP Server",
            "revokedAt": datetime.now(timezone.utc),
        }

        result = apikey_service.revoke_key(user_id, "test@example.com", "key-id-123")
        assert result["revokedAt"] is not None
        mock_repo.revoke_key.assert_called_once()

    @patch("app.services.apikey_service.apikey_repo")
    @patch("app.services.apikey_service.allowlist_repo")
    def test_rejects_revoking_other_users_key(self, mock_allowlist, mock_repo, user_id):
        mock_allowlist.get_allowed_email.return_value = {
            "email": "test@example.com",
            "canManageApiKeys": True,
        }
        mock_repo.get_key_by_id.return_value = {
            "userId": "other-user-456",
            "name": "Their Key",
            "revokedAt": None,
        }

        with pytest.raises(Exception, match="not found"):
            apikey_service.revoke_key(user_id, "test@example.com", "key-id-456")

    @patch("app.services.apikey_service.apikey_repo")
    @patch("app.services.apikey_service.allowlist_repo")
    def test_revoke_already_revoked_is_idempotent(self, mock_allowlist, mock_repo, user_id):
        mock_allowlist.get_allowed_email.return_value = {
            "email": "test@example.com",
            "canManageApiKeys": True,
        }
        revoked_time = datetime.now(timezone.utc)
        mock_repo.get_key_by_id.return_value = {
            "userId": user_id,
            "name": "MCP Server",
            "revokedAt": revoked_time,
        }

        result = apikey_service.revoke_key(user_id, "test@example.com", "key-id-123")
        assert result["revokedAt"] == revoked_time
        mock_repo.revoke_key.assert_not_called()

    @patch("app.services.apikey_service.allowlist_repo")
    def test_rejects_without_permission(self, mock_allowlist, user_id):
        mock_allowlist.get_allowed_email.return_value = {
            "email": "test@example.com",
            "canManageApiKeys": False,
        }

        with pytest.raises(Exception, match="permission required"):
            apikey_service.revoke_key(user_id, "test@example.com", "key-id-123")


class TestListApiKeys:
    @patch("app.services.apikey_service.apikey_repo")
    @patch("app.services.apikey_service.allowlist_repo")
    def test_returns_own_keys(self, mock_allowlist, mock_repo, user_id):
        mock_allowlist.get_allowed_email.return_value = {
            "email": "test@example.com",
            "canManageApiKeys": True,
        }
        mock_repo.list_keys_by_user.return_value = [
            {"name": "Key 1", "keyPrefix": "indego_a1"},
            {"name": "Key 2", "keyPrefix": "indego_b2"},
        ]

        result = apikey_service.list_keys(user_id, "test@example.com")
        assert len(result) == 2
        mock_repo.list_keys_by_user.assert_called_once_with(user_id)

    @patch("app.services.apikey_service.allowlist_repo")
    def test_rejects_without_permission(self, mock_allowlist, user_id):
        mock_allowlist.get_allowed_email.return_value = {
            "email": "test@example.com",
            "canManageApiKeys": False,
        }

        with pytest.raises(Exception, match="permission required"):
            apikey_service.list_keys(user_id, "test@example.com")
