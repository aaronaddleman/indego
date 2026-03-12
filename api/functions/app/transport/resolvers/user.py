"""User query and mutation resolvers."""

from app.auth import require_auth
from app.services import user_service


def resolve_me(_, info):
    user_id = require_auth(info.context)
    return user_service.get_me(user_id)


def resolve_upsert_user(_, info, displayName):
    user_id = require_auth(info.context)
    email = info.context.get("email", "")
    return user_service.upsert_user(user_id, displayName, email)
