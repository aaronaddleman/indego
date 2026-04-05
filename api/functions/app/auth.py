"""Firebase Auth + API Key middleware for GraphQL requests."""

import hashlib
import logging
from datetime import datetime, timezone

from firebase_admin import auth

logger = logging.getLogger(__name__)
from ariadne import format_error
from graphql import GraphQLError
from app.repositories.allowlist_repo import is_email_allowed, is_email_admin
from app.repositories import apikey_repo
from app.repositories import ratelimit_repo
from app.messages import (
    AUTH_REQUIRED,
    AUTH_MISSING_HEADER,
    AUTH_INVALID_TOKEN,
    APIKEY_INVALID,
    APIKEY_EXPIRED,
    APIKEY_REVOKED,
    APIKEY_RATE_LIMITED,
    APIKEY_BEARER_REQUIRED,
)


class AuthError(GraphQLError):
    """Authentication error with UNAUTHENTICATED extension code."""

    def __init__(self, message: str = AUTH_REQUIRED):
        super().__init__(
            message,
            extensions={"code": "UNAUTHENTICATED"},
        )


class RateLimitError(GraphQLError):
    """Rate limit exceeded error."""

    def __init__(self, message: str = APIKEY_RATE_LIMITED):
        super().__init__(
            message,
            extensions={"code": "RATE_LIMITED"},
        )


def _verify_token(request):
    """Verify Firebase ID token and return decoded token."""
    auth_header = request.headers.get("Authorization", "")

    if not auth_header.startswith("Bearer "):
        raise AuthError(AUTH_MISSING_HEADER)

    token = auth_header[7:]  # Strip "Bearer "

    try:
        return auth.verify_id_token(token)
    except Exception:
        raise AuthError(AUTH_INVALID_TOKEN)


def _verify_api_key(api_key: str) -> dict:
    """Verify an API key and return user info.

    Returns dict with userId and email, or raises AuthError.
    """
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    key_doc = apikey_repo.get_key_by_hash(key_hash)

    if not key_doc:
        raise AuthError(APIKEY_INVALID)

    # Check revoked
    if key_doc.get("revokedAt") is not None:
        raise AuthError(APIKEY_REVOKED)

    # Check expired
    expires_at = key_doc.get("expiresAt")
    if expires_at and expires_at <= datetime.now(timezone.utc):
        raise AuthError(APIKEY_EXPIRED)

    return {
        "userId": key_doc["userId"],
        "email": key_doc["email"],
    }


def get_context_value(request):
    """Build the GraphQL context from the incoming request.

    Tries Bearer token first, then API key. Injects user_id, email,
    and auth_method into context for use by resolvers.
    """
    # Try Bearer token first
    try:
        decoded_token = _verify_token(request)
        user_id = decoded_token["uid"]
        email = decoded_token.get("email", "").lower()

        # Allowlist check — fail closed
        if not email or not is_email_allowed(email):
            return {"request": request, "user_id": None, "email": None, "auth_method": None}

        return {"request": request, "user_id": user_id, "email": email, "auth_method": "bearer"}
    except AuthError:
        pass

    # Try API key
    api_key = request.headers.get("X-API-Key", "")
    if api_key:
        logger.info("API key auth attempt (prefix: %s...)", api_key[:12])
        try:
            key_info = _verify_api_key(api_key)
            user_id = key_info["userId"]
            email = key_info["email"].lower()
            logger.info("API key valid for user %s (%s)", user_id, email)

            # Allowlist check — fail closed
            if not email or not is_email_allowed(email):
                logger.warning("API key auth failed: email %s not in allowlist", email)
                return {"request": request, "user_id": None, "email": None, "auth_method": None}

            # Rate limit check
            if not ratelimit_repo.check_and_increment(user_id):
                logger.warning("API key auth failed: rate limit exceeded for %s", user_id)
                return {"request": request, "user_id": None, "email": None, "auth_method": None}

            logger.info("API key auth success for %s", email)
            return {"request": request, "user_id": user_id, "email": email, "auth_method": "api_key"}
        except AuthError as e:
            logger.warning("API key auth failed: %s", e.message)
            return {"request": request, "user_id": None, "email": None, "auth_method": None}
        except Exception as e:
            logger.error("API key auth unexpected error: %s", e)
            return {"request": request, "user_id": None, "email": None, "auth_method": None}

    # No auth
    return {"request": request, "user_id": None, "email": None, "auth_method": None}


def require_auth(context: dict) -> str:
    """Require authentication in a resolver. Returns user_id or raises AuthError."""
    user_id = context.get("user_id")
    if not user_id:
        raise AuthError()
    return user_id


def require_admin(context: dict) -> str:
    """Require admin privileges in a resolver. Returns user_id or raises AuthError."""
    user_id = require_auth(context)
    email = context.get("email")
    if not email or not is_email_admin(email):
        raise AuthError()
    return user_id


def require_bearer(context: dict) -> str:
    """Require Bearer token auth (not API key). For key management operations."""
    user_id = require_auth(context)
    if context.get("auth_method") != "bearer":
        raise AuthError(APIKEY_BEARER_REQUIRED)
    return user_id
