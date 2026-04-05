"""GraphQL resolvers for API key management."""

from datetime import datetime, timezone

from app.auth import require_bearer
from app.services import apikey_service


def resolve_api_keys(_, info):
    user_id = require_bearer(info.context)
    email = info.context.get("email")
    return apikey_service.list_keys(user_id, email)


def resolve_create_api_key(_, info, input):
    user_id = require_bearer(info.context)
    email = info.context.get("email")
    name = input["name"]
    expires_at = input["expiresAt"]

    # Parse expiresAt if it's a string
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))

    return apikey_service.create_key(user_id, email, name, expires_at)


def resolve_revoke_api_key(_, info, id):
    user_id = require_bearer(info.context)
    email = info.context.get("email")
    return apikey_service.revoke_key(user_id, email, id)
