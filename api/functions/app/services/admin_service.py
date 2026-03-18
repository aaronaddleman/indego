"""Admin service for managing the email allowlist."""

from graphql import GraphQLError
from app.repositories import allowlist_repo


class AdminError(GraphQLError):
    """Admin operation error."""

    def __init__(self, message: str):
        super().__init__(message, extensions={"code": "FORBIDDEN"})


def validate_email(email: str) -> str:
    """Basic email validation. Returns lowercased email."""
    email = email.strip().lower()
    if not email or "@" not in email:
        raise AdminError("Invalid email format")
    parts = email.split("@")
    if len(parts) != 2 or "." not in parts[1]:
        raise AdminError("Invalid email format")
    return email


def list_emails() -> list:
    """List all allowed emails."""
    return allowlist_repo.list_allowed_emails()


def add_email(email: str) -> dict:
    """Add an email to the allowlist."""
    email = validate_email(email)
    if allowlist_repo.is_email_allowed(email):
        raise AdminError(f"{email} is already in the allowlist")
    return allowlist_repo.add_allowed_email(email)


def remove_email(email: str, caller_email: str) -> bool:
    """Remove an email from the allowlist with safety checks."""
    email = email.strip().lower()

    if email == caller_email:
        raise AdminError("Cannot remove your own email")

    if not allowlist_repo.is_email_allowed(email):
        raise AdminError(f"{email} is not in the allowlist")

    if allowlist_repo.is_email_admin(email) and allowlist_repo.count_admins() <= 1:
        raise AdminError("Cannot remove the last admin")

    return allowlist_repo.remove_allowed_email(email)
