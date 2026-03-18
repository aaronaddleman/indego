"""Centralized error and status messages for localization."""

# ─── Auth ────────────────────────────────────────────────────────────────────
AUTH_REQUIRED = "Authentication required"
AUTH_MISSING_HEADER = "Missing or malformed Authorization header"
AUTH_INVALID_TOKEN = "Invalid or expired token"

# ─── Admin ───────────────────────────────────────────────────────────────────
ADMIN_INVALID_EMAIL = "Please enter a valid email address"
ADMIN_ALREADY_EXISTS = "This email is already in the allowlist"
ADMIN_NOT_FOUND = "This email is not in the allowlist"
ADMIN_CANNOT_REMOVE_SELF = "You cannot remove your own email"
ADMIN_CANNOT_REMOVE_LAST = "Cannot remove the last admin"
ADMIN_CANNOT_REVOKE_LAST = "Cannot revoke admin from the last admin"

# ─── Habits ──────────────────────────────────────────────────────────────────
HABIT_NAME_REQUIRED = "Habit name is required"
HABIT_NOT_FOUND = "Habit not found"
HABIT_INVALID_FREQUENCY = "Invalid frequency configuration"
HABIT_INVALID_DATE = "Invalid date format"
HABIT_FUTURE_DATE = "Cannot log completion for a future date"
HABIT_REMINDER_TIME_REQUIRED = "Reminder time is required when reminders are enabled"

# ─── Validation ──────────────────────────────────────────────────────────────
VALIDATION_INVALID_JSON = "Invalid JSON"
