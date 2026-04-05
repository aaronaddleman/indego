"""GraphQL resolvers for admin allowlist management."""

from app.auth import require_admin
from app.services import admin_service


def resolve_allowed_emails(_, info):
    """List all allowed emails. Admin only."""
    require_admin(info.context)
    return admin_service.list_emails()


def resolve_add_allowed_email(_, info, email):
    """Add an email to the allowlist. Admin only."""
    require_admin(info.context)
    return admin_service.add_email(email)


def resolve_remove_allowed_email(_, info, email):
    """Remove an email from the allowlist. Admin only."""
    require_admin(info.context)
    caller_email = info.context.get("email")
    return admin_service.remove_email(email, caller_email)


def resolve_set_admin_status(_, info, email, isAdmin):
    """Set admin status for an email. Admin only."""
    require_admin(info.context)
    caller_email = info.context.get("email")
    return admin_service.set_admin_status(email, isAdmin, caller_email)


def resolve_set_api_key_permission(_, info, email, enabled):
    """Set canManageApiKeys for an email. Admin only."""
    require_admin(info.context)
    return admin_service.set_api_key_permission(email, enabled)
