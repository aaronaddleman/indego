"""Tests for rate limit repository."""

from unittest.mock import patch, MagicMock
from datetime import datetime, timezone, timedelta

import pytest

from app.repositories import ratelimit_repo


class TestCheckAndIncrement:
    @patch("app.repositories.ratelimit_repo._get_db")
    def test_allows_first_request(self, mock_get_db):
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        mock_doc = MagicMock()
        mock_doc.exists = False
        mock_db.collection.return_value.document.return_value.get.return_value = mock_doc

        result = ratelimit_repo.check_and_increment("user-123", limit=60)
        assert result is True

    @patch("app.repositories.ratelimit_repo._get_db")
    def test_allows_request_within_limit(self, mock_get_db):
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "count": 30,
            "windowStart": datetime.now(timezone.utc),
        }
        mock_db.collection.return_value.document.return_value.get.return_value = mock_doc

        result = ratelimit_repo.check_and_increment("user-123", limit=60)
        assert result is True

    @patch("app.repositories.ratelimit_repo._get_db")
    def test_rejects_request_over_limit(self, mock_get_db):
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "count": 60,
            "windowStart": datetime.now(timezone.utc),
        }
        mock_db.collection.return_value.document.return_value.get.return_value = mock_doc

        result = ratelimit_repo.check_and_increment("user-123", limit=60)
        assert result is False

    @patch("app.repositories.ratelimit_repo._get_db")
    def test_resets_after_window_expires(self, mock_get_db):
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "count": 60,
            "windowStart": datetime.now(timezone.utc) - timedelta(seconds=120),
        }
        mock_db.collection.return_value.document.return_value.get.return_value = mock_doc

        result = ratelimit_repo.check_and_increment("user-123", limit=60)
        assert result is True  # window expired, counter reset
