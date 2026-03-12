"""Tests for habit service layer."""

from unittest.mock import patch
from datetime import datetime, timezone

import pytest

from app.services import habit_service
from app.services.habit_service import ValidationError, NotFoundError


class TestCreateHabit:
    @patch("app.services.habit_service.habit_repo")
    def test_creates_daily_habit(self, mock_repo, sample_habit_data):
        mock_repo.create_habit.return_value = {
            "id": "new-habit",
            **sample_habit_data,
            "longestStreak": 0,
            "completions": {},
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
        }

        result = habit_service.create_habit("user-1", sample_habit_data)

        assert result["id"] == "new-habit"
        assert result["name"] == "Read for 30 minutes"
        mock_repo.create_habit.assert_called_once()

    def test_rejects_empty_name(self):
        with pytest.raises(ValidationError, match="name is required"):
            habit_service.create_habit("user-1", {
                "name": "  ",
                "frequency": {"type": "DAILY"},
            })

    def test_rejects_missing_specific_days_for_custom(self):
        with pytest.raises(ValidationError, match="specificDays required"):
            habit_service.create_habit("user-1", {
                "name": "Exercise",
                "frequency": {"type": "CUSTOM"},
            })

    def test_rejects_reminder_enabled_without_time(self):
        with pytest.raises(ValidationError, match="time is required"):
            habit_service.create_habit("user-1", {
                "name": "Exercise",
                "frequency": {"type": "DAILY"},
                "reminder": {"enabled": True},
            })

    @patch("app.services.habit_service.habit_repo")
    def test_creates_weekly_habit(self, mock_repo):
        input_data = {
            "name": "Exercise",
            "frequency": {"type": "WEEKLY", "daysPerWeek": 3},
        }
        mock_repo.create_habit.return_value = {
            "id": "h1", **input_data,
            "reminder": {"enabled": False},
            "longestStreak": 0,
            "completions": {},
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
        }

        result = habit_service.create_habit("user-1", input_data)
        assert result["id"] == "h1"

    @patch("app.services.habit_service.habit_repo")
    def test_creates_custom_habit(self, mock_repo):
        input_data = {
            "name": "Yoga",
            "frequency": {"type": "CUSTOM", "specificDays": ["Monday", "Wednesday", "Friday"]},
        }
        mock_repo.create_habit.return_value = {
            "id": "h2", "name": "Yoga",
            "frequency": {"type": "CUSTOM", "specificDays": ["monday", "wednesday", "friday"]},
            "reminder": {"enabled": False},
            "longestStreak": 0,
            "completions": {},
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
        }

        result = habit_service.create_habit("user-1", input_data)
        assert result["name"] == "Yoga"


class TestUpdateHabit:
    @patch("app.services.habit_service.habit_repo")
    def test_updates_name(self, mock_repo, sample_habit):
        mock_repo.update_habit.return_value = {**sample_habit, "name": "New Name"}

        result = habit_service.update_habit("user-1", "habit-abc", {"name": "New Name"})
        assert result["name"] == "New Name"

    @patch("app.services.habit_service.habit_repo")
    def test_raises_not_found(self, mock_repo):
        mock_repo.update_habit.return_value = None

        with pytest.raises(NotFoundError, match="Habit not found"):
            habit_service.update_habit("user-1", "missing", {"name": "X"})

    def test_rejects_empty_update(self):
        with pytest.raises(ValidationError, match="No fields to update"):
            habit_service.update_habit("user-1", "habit-abc", {})


class TestDeleteHabit:
    @patch("app.services.habit_service.habit_repo")
    def test_deletes_habit(self, mock_repo):
        mock_repo.delete_habit.return_value = True

        assert habit_service.delete_habit("user-1", "habit-abc") is True

    @patch("app.services.habit_service.habit_repo")
    def test_raises_not_found(self, mock_repo):
        mock_repo.delete_habit.return_value = False

        with pytest.raises(NotFoundError, match="Habit not found"):
            habit_service.delete_habit("user-1", "missing")


class TestLogCompletion:
    @patch("app.services.habit_service.habit_repo")
    def test_logs_completion(self, mock_repo, sample_habit):
        mock_repo.log_completion.return_value = sample_habit

        result = habit_service.log_completion("user-1", "habit-abc", "2026-03-11")

        assert result["id"] == "habit-abc"
        assert result["name"] == "Read for 30 minutes"
        assert "completions" in result

    def test_rejects_future_date(self):
        with pytest.raises(ValidationError, match="future date"):
            habit_service.log_completion("user-1", "habit-abc", "2099-01-01")

    def test_rejects_invalid_date_format(self):
        with pytest.raises(ValidationError, match="YYYY-MM-DD"):
            habit_service.log_completion("user-1", "habit-abc", "not-a-date")

    @patch("app.services.habit_service.habit_repo")
    def test_raises_not_found(self, mock_repo):
        mock_repo.log_completion.return_value = None

        with pytest.raises(NotFoundError, match="Habit not found"):
            habit_service.log_completion("user-1", "missing", "2026-03-11")


class TestUndoCompletion:
    @patch("app.services.habit_service.habit_repo")
    def test_undoes_completion(self, mock_repo, sample_habit):
        mock_repo.undo_completion.return_value = sample_habit

        result = habit_service.undo_completion("user-1", "habit-abc", "2026-03-11")

        assert result["id"] == "habit-abc"
        assert result["name"] == "Read for 30 minutes"

    @patch("app.services.habit_service.habit_repo")
    def test_raises_not_found(self, mock_repo):
        mock_repo.undo_completion.return_value = None

        with pytest.raises(NotFoundError, match="Habit not found"):
            habit_service.undo_completion("user-1", "missing", "2026-03-11")
