"""Tests for user service layer."""

from unittest.mock import patch, MagicMock
from datetime import datetime, timezone

import pytest

from app.services import user_service
from app.services.user_service import NotFoundError


class TestGetMe:
    @patch("app.services.user_service.user_repo")
    def test_returns_user_when_found(self, mock_repo):
        mock_repo.get_user.return_value = {
            "id": "user-1",
            "displayName": "Aaron",
            "email": "aaron@example.com",
            "createdAt": datetime(2026, 3, 1, tzinfo=timezone.utc),
        }

        result = user_service.get_me("user-1")

        assert result["id"] == "user-1"
        assert result["displayName"] == "Aaron"
        mock_repo.get_user.assert_called_once_with("user-1")

    @patch("app.services.user_service.user_repo")
    def test_raises_not_found_when_missing(self, mock_repo):
        mock_repo.get_user.return_value = None

        with pytest.raises(NotFoundError, match="User not found"):
            user_service.get_me("nonexistent")


class TestUpsertUser:
    @patch("app.services.user_service.user_repo")
    def test_upserts_user(self, mock_repo):
        mock_repo.upsert_user.return_value = {
            "id": "user-1",
            "displayName": "Aaron",
            "email": "aaron@example.com",
            "createdAt": datetime(2026, 3, 1, tzinfo=timezone.utc),
        }

        result = user_service.upsert_user("user-1", "Aaron", "aaron@example.com")

        assert result["displayName"] == "Aaron"
        mock_repo.upsert_user.assert_called_once_with("user-1", "Aaron", "aaron@example.com")
