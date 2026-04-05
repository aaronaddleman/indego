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

# ─── API Keys ───────────────────────────────────────────────────────────────
APIKEY_INVALID = "Invalid API key"
APIKEY_EXPIRED = "API key has expired"
APIKEY_REVOKED = "API key has been revoked"
APIKEY_RATE_LIMITED = "Rate limit exceeded. Try again later."
APIKEY_PERMISSION_REQUIRED = "API key management permission required"
APIKEY_MAX_KEYS = "Maximum of 2 active API keys allowed"
APIKEY_NOT_FOUND = "API key not found"
APIKEY_BEARER_REQUIRED = "API key management requires Bearer token authentication"
APIKEY_NAME_REQUIRED = "API key name is required"
APIKEY_EXPIRY_REQUIRED = "API key expiration date is required"
APIKEY_EXPIRY_PAST = "Expiration date must be in the future"

# ─── Validation ──────────────────────────────────────────────────────────────
VALIDATION_INVALID_JSON = "Invalid JSON"
