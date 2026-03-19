"""Centralized frequency validation and computation.

Shared by habits and future tasks. All frequency types must resolve
to a list of due days via compute_due_days().
"""

from graphql import GraphQLError


class ValidationError(GraphQLError):
    def __init__(self, message: str):
        super().__init__(message, extensions={"code": "VALIDATION_ERROR"})


VALID_DAYS = [
    "monday", "tuesday", "wednesday", "thursday",
    "friday", "saturday", "sunday",
]

ALL_DAYS = list(VALID_DAYS)


def validate_frequency(freq: dict) -> dict:
    """Validate and normalize frequency input.

    - DAILY: no additional fields needed
    - WEEKLY/CUSTOM: requires daysOfWeek (or falls back to specificDays)
    - CUSTOM is normalized to WEEKLY internally
    """
    freq_type = freq.get("type", "DAILY")

    if freq_type == "DAILY":
        return {"type": "DAILY"}

    if freq_type in ("WEEKLY", "CUSTOM"):
        # New model: daysOfWeek
        days = freq.get("daysOfWeek")

        # Backwards compat: fall back to specificDays
        if not days:
            days = freq.get("specificDays")

        if days:
            normalized = [d.lower() for d in days]
            for d in normalized:
                if d not in VALID_DAYS:
                    raise ValidationError(f"Invalid day: {d}")
            if len(normalized) == 0:
                raise ValidationError("At least one day must be selected")
            return {
                "type": "WEEKLY",
                "daysOfWeek": normalized,
            }

        # Legacy WEEKLY with daysPerWeek but no specific days
        days_per_week = freq.get("daysPerWeek")
        if days_per_week is not None:
            if days_per_week < 1 or days_per_week > 7:
                raise ValidationError("daysPerWeek must be between 1 and 7")
            return {
                "type": "WEEKLY",
                "daysPerWeek": days_per_week,
            }

        raise ValidationError("At least one day must be selected for WEEKLY habits")

    raise ValidationError(f"Unknown frequency type: {freq_type}")


def compute_due_days(frequency: dict) -> list:
    """Compute which days of the week a habit/task is due.

    Returns a list of lowercase day names.
    This is the universal interface for filtering by day.
    """
    freq_type = frequency.get("type", "DAILY")

    if freq_type == "DAILY":
        return ALL_DAYS

    # WEEKLY or CUSTOM with daysOfWeek
    days = frequency.get("daysOfWeek")
    if days:
        return days

    # Legacy: specificDays (old CUSTOM model)
    days = frequency.get("specificDays")
    if days:
        return days

    # Legacy WEEKLY with daysPerWeek but no specific days
    # Treat as all days until user updates
    return ALL_DAYS
