"""Tests for stats service layer."""

from unittest.mock import patch
from datetime import date

from app.services import stats_service


class TestGetStats:
    @patch("app.services.stats_service.habit_repo")
    def test_computes_stats_for_daily_habit(self, mock_repo):
        mock_repo.list_habits.return_value = [
            {
                "id": "h1",
                "name": "Meditate",
                "frequency": {"type": "DAILY"},
                "longestStreak": 10,
                "completions": {
                    "2026-03-01": "2026-03-01T08:00:00+00:00",
                    "2026-03-02": "2026-03-02T08:00:00+00:00",
                    "2026-03-03": "2026-03-03T08:00:00+00:00",
                },
            },
        ]

        result = stats_service.get_stats("user-1", date(2026, 3, 1), date(2026, 3, 7))

        assert result["totalHabits"] == 1
        assert result["totalCompletions"] == 3
        assert len(result["habitStats"]) == 1

        habit_stat = result["habitStats"][0]
        assert habit_stat["habitId"] == "h1"
        assert habit_stat["totalCompletions"] == 3
        assert habit_stat["longestStreak"] == 10
        # 3 completions out of 7 expected days
        assert abs(habit_stat["completionRate"] - 3 / 7) < 0.01

    @patch("app.services.stats_service.habit_repo")
    def test_computes_stats_for_weekly_habit(self, mock_repo):
        mock_repo.list_habits.return_value = [
            {
                "id": "h2",
                "name": "Exercise",
                "frequency": {"type": "WEEKLY", "daysPerWeek": 3},
                "longestStreak": 4,
                "completions": {
                    "2026-03-01": "2026-03-01T10:00:00+00:00",
                    "2026-03-03": "2026-03-03T10:00:00+00:00",
                },
            },
        ]

        result = stats_service.get_stats("user-1", date(2026, 3, 1), date(2026, 3, 7))

        habit_stat = result["habitStats"][0]
        assert habit_stat["totalCompletions"] == 2
        # 2 completions out of 3 expected per week
        assert abs(habit_stat["completionRate"] - 2 / 3) < 0.01

    @patch("app.services.stats_service.habit_repo")
    def test_handles_no_habits(self, mock_repo):
        mock_repo.list_habits.return_value = []

        result = stats_service.get_stats("user-1", date(2026, 3, 1), date(2026, 3, 7))

        assert result["totalHabits"] == 0
        assert result["totalCompletions"] == 0
        assert result["habitStats"] == []

    @patch("app.services.stats_service.habit_repo")
    def test_handles_empty_completions(self, mock_repo):
        mock_repo.list_habits.return_value = [
            {
                "id": "h3",
                "name": "Read",
                "frequency": {"type": "DAILY"},
                "longestStreak": 0,
                "completions": {},
            },
        ]

        result = stats_service.get_stats("user-1", date(2026, 3, 1), date(2026, 3, 7))

        habit_stat = result["habitStats"][0]
        assert habit_stat["totalCompletions"] == 0
        assert habit_stat["completionRate"] == 0.0

    @patch("app.services.stats_service.habit_repo")
    def test_filters_completions_by_date_range(self, mock_repo):
        mock_repo.list_habits.return_value = [
            {
                "id": "h4",
                "name": "Journal",
                "frequency": {"type": "DAILY"},
                "longestStreak": 2,
                "completions": {
                    "2026-02-28": "2026-02-28T08:00:00+00:00",  # outside range
                    "2026-03-01": "2026-03-01T08:00:00+00:00",  # in range
                    "2026-03-02": "2026-03-02T08:00:00+00:00",  # in range
                    "2026-03-08": "2026-03-08T08:00:00+00:00",  # outside range
                },
            },
        ]

        result = stats_service.get_stats("user-1", date(2026, 3, 1), date(2026, 3, 7))

        assert result["habitStats"][0]["totalCompletions"] == 2

    @patch("app.services.stats_service.habit_repo")
    def test_multiple_habits(self, mock_repo):
        mock_repo.list_habits.return_value = [
            {
                "id": "h1", "name": "A",
                "frequency": {"type": "DAILY"}, "longestStreak": 1,
                "completions": {"2026-03-01": "t"},
            },
            {
                "id": "h2", "name": "B",
                "frequency": {"type": "DAILY"}, "longestStreak": 2,
                "completions": {"2026-03-01": "t", "2026-03-02": "t"},
            },
        ]

        result = stats_service.get_stats("user-1", date(2026, 3, 1), date(2026, 3, 3))

        assert result["totalHabits"] == 2
        assert result["totalCompletions"] == 3
