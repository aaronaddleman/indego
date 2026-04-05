"""Admin service for managing the email allowlist."""

from graphql import GraphQLError
from app.repositories import allowlist_repo
from app.messages import (
    ADMIN_INVALID_EMAIL,
    ADMIN_ALREADY_EXISTS,
    ADMIN_NOT_FOUND,
    ADMIN_CANNOT_REMOVE_SELF,
    ADMIN_CANNOT_REMOVE_LAST,
    ADMIN_CANNOT_REVOKE_LAST,
)


class AdminError(GraphQLError):
    """Admin operation error."""

    def __init__(self, message: str):
        super().__init__(message, extensions={"code": "FORBIDDEN"})


def validate_email(email: str) -> str:
    """Basic email validation. Returns lowercased email."""
    email = email.strip().lower()
    if not email or "@" not in email:
        raise AdminError(ADMIN_INVALID_EMAIL)
    parts = email.split("@")
    if len(parts) != 2 or "." not in parts[1]:
        raise AdminError(ADMIN_INVALID_EMAIL)
    return email


def list_emails() -> list:
    """List all allowed emails."""
    return allowlist_repo.list_allowed_emails()


def add_email(email: str) -> dict:
    """Add an email to the allowlist."""
    email = validate_email(email)
    if allowlist_repo.is_email_allowed(email):
        raise AdminError(ADMIN_ALREADY_EXISTS)
    return allowlist_repo.add_allowed_email(email)


def remove_email(email: str, caller_email: str) -> bool:
    """Remove an email from the allowlist with safety checks."""
    email = email.strip().lower()

    if email == caller_email:
        raise AdminError(ADMIN_CANNOT_REMOVE_SELF)

    if not allowlist_repo.is_email_allowed(email):
        raise AdminError(ADMIN_NOT_FOUND)

    if allowlist_repo.is_email_admin(email) and allowlist_repo.count_admins() <= 1:
        raise AdminError(ADMIN_CANNOT_REMOVE_LAST)

    return allowlist_repo.remove_allowed_email(email)


def set_admin_status(email: str, is_admin: bool, caller_email: str) -> dict:
    """Set admin status for an email with safety checks."""
    email = email.strip().lower()

    if not allowlist_repo.is_email_allowed(email):
        raise AdminError(ADMIN_NOT_FOUND)

    # Prevent revoking the last admin
    if not is_admin and allowlist_repo.is_email_admin(email) and allowlist_repo.count_admins() <= 1:
        raise AdminError(ADMIN_CANNOT_REVOKE_LAST)

    return allowlist_repo.set_admin_status(email, is_admin)


def set_api_key_permission(email: str, enabled: bool) -> dict:
    """Set canManageApiKeys for an email."""
    email = email.strip().lower()

    if not allowlist_repo.is_email_allowed(email):
        raise AdminError(ADMIN_NOT_FOUND)

    return allowlist_repo.set_api_key_permission(email, enabled)
