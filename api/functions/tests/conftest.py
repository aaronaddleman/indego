"""Shared test fixtures for Indago Habits API tests."""

import os
import sys
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone

import pytest

# Ensure functions/ is on the path so `app` is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@pytest.fixture(autouse=True)
def mock_firebase_admin():
    """Mock Firebase Admin SDK initialization and auth."""
    with patch("firebase_admin.auth") as mock_auth:
        mock_auth.verify_id_token.return_value = {
            "uid": "test-user-123",
            "email": "test@example.com",
        }
        yield mock_auth


@pytest.fixture
def user_id():
    return "test-user-123"


@pytest.fixture
def sample_habit_data():
    return {
        "name": "Read for 30 minutes",
        "frequency": {"type": "DAILY"},
        "reminder": {"enabled": True, "time": "13:00"},
    }


@pytest.fixture
def sample_habit():
    """A habit document as returned from the repository."""
    return {
        "id": "habit-abc",
        "name": "Read for 30 minutes",
        "frequency": {"type": "DAILY"},
        "reminder": {"enabled": True, "time": "13:00"},
        "longestStreak": 5,
        "completions": {
            "2026-03-10": "2026-03-10T13:30:00+00:00",
            "2026-03-11": "2026-03-11T14:00:00+00:00",
        },
        "createdAt": datetime(2026, 3, 1, tzinfo=timezone.utc),
        "updatedAt": datetime(2026, 3, 11, tzinfo=timezone.utc),
    }
