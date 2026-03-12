"""Business logic for Habit and Completion operations."""

import re
from datetime import date, datetime, timedelta, timezone

from graphql import GraphQLError

from app.repositories import habit_repo


class ValidationError(GraphQLError):
    def __init__(self, message: str):
        super().__init__(message, extensions={"code": "VALIDATION_ERROR"})


class NotFoundError(GraphQLError):
    def __init__(self, message: str):
        super().__init__(message, extensions={"code": "NOT_FOUND"})


_TIME_PATTERN = re.compile(r"^\d{2}:\d{2}$")
_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _validate_frequency(freq: dict) -> dict:
    """Validate and normalize frequency input."""
    freq_type = freq["type"]
    result = {"type": freq_type}

    if freq_type == "WEEKLY":
        days = freq.get("daysPerWeek")
        if days is not None and (days < 1 or days > 7):
            raise ValidationError("daysPerWeek must be between 1 and 7")
        result["daysPerWeek"] = days
    elif freq_type == "CUSTOM":
        days = freq.get("specificDays")
        if not days:
            raise ValidationError("specificDays required for CUSTOM frequency")
        valid_days = {"monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"}
        for d in days:
            if d.lower() not in valid_days:
                raise ValidationError(f"Invalid day: {d}")
        result["specificDays"] = [d.lower() for d in days]

    return result


def _validate_reminder(reminder: dict | None) -> dict:
    """Validate and normalize reminder input."""
    if reminder is None:
        return {"enabled": False}

    if reminder["enabled"] and not reminder.get("time"):
        raise ValidationError("Reminder time is required when enabled")

    if reminder.get("time") and not _TIME_PATTERN.match(reminder["time"]):
        raise ValidationError("Reminder time must be in HH:MM format")

    return {
        "enabled": reminder["enabled"],
        "time": reminder.get("time"),
    }


def _validate_date(date_str: str) -> date:
    """Validate a date string and ensure it's not in the future."""
    if not _DATE_PATTERN.match(date_str):
        raise ValidationError("Date must be in YYYY-MM-DD format")

    try:
        parsed = date.fromisoformat(date_str)
    except ValueError:
        raise ValidationError(f"Invalid date: {date_str}")

    # Allow up to +1 day ahead to accommodate clients ahead of UTC (up to UTC+14)
    if parsed > date.today() + timedelta(days=1):
        raise ValidationError("Cannot log completion for a future date")

    return parsed


def list_habits(user_id: str) -> list[dict]:
    """List all habits for a user."""
    return habit_repo.list_habits(user_id)


def get_habit(user_id: str, habit_id: str) -> dict | None:
    """Get a single habit."""
    return habit_repo.get_habit(user_id, habit_id)


def create_habit(user_id: str, input_data: dict) -> dict:
    """Create a new habit with validation."""
    name = input_data.get("name", "").strip()
    if not name:
        raise ValidationError("Habit name is required")

    frequency = _validate_frequency(input_data["frequency"])
    reminder = _validate_reminder(input_data.get("reminder"))

    return habit_repo.create_habit(user_id, {
        "name": name,
        "frequency": frequency,
        "reminder": reminder,
    })


def update_habit(user_id: str, habit_id: str, input_data: dict) -> dict:
    """Update an existing habit with validation."""
    update = {}

    if "name" in input_data:
        name = input_data["name"].strip()
        if not name:
            raise ValidationError("Habit name cannot be empty")
        update["name"] = name

    if "frequency" in input_data:
        update["frequency"] = _validate_frequency(input_data["frequency"])

    if "reminder" in input_data:
        update["reminder"] = _validate_reminder(input_data["reminder"])

    if not update:
        raise ValidationError("No fields to update")

    result = habit_repo.update_habit(user_id, habit_id, update)
    if result is None:
        raise NotFoundError("Habit not found")
    return result


def delete_habit(user_id: str, habit_id: str) -> bool:
    """Delete a habit."""
    deleted = habit_repo.delete_habit(user_id, habit_id)
    if not deleted:
        raise NotFoundError("Habit not found")
    return True


def log_completion(user_id: str, habit_id: str, date_str: str) -> dict:
    """Log a completion for a habit on a given date. Returns the updated habit."""
    _validate_date(date_str)

    result = habit_repo.log_completion(user_id, habit_id, date_str)
    if result is None:
        raise NotFoundError("Habit not found")

    return result


def undo_completion(user_id: str, habit_id: str, date_str: str) -> dict:
    """Remove a completion for a habit on a given date. Returns the updated habit."""
    _validate_date(date_str)

    result = habit_repo.undo_completion(user_id, habit_id, date_str)
    if result is None:
        raise NotFoundError("Habit not found")

    return result
