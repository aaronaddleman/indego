"""Service layer for API key management."""

import os
import hashlib
import secrets
from datetime import datetime, timezone

from graphql import GraphQLError

from app.repositories import apikey_repo
from app.repositories import allowlist_repo
from app.messages import (
    APIKEY_PERMISSION_REQUIRED,
    APIKEY_MAX_KEYS,
    APIKEY_NOT_FOUND,
    APIKEY_NAME_REQUIRED,
    APIKEY_EXPIRY_PAST,
)

KEY_PREFIX = "indego_"
KEY_BYTES = 32  # 32 bytes = 64 hex chars


class ApiKeyError(GraphQLError):
    def __init__(self, message: str, code: str = "VALIDATION_ERROR"):
        super().__init__(message, extensions={"code": code})


class ForbiddenError(GraphQLError):
    def __init__(self, message: str):
        super().__init__(message, extensions={"code": "FORBIDDEN"})


def _require_permission(email: str):
    """Check that the user has canManageApiKeys permission."""
    entry = allowlist_repo.get_allowed_email(email)
    if not entry or not entry.get("canManageApiKeys", False):
        raise ForbiddenError(APIKEY_PERMISSION_REQUIRED)


def create_key(user_id: str, email: str, name: str, expires_at: datetime) -> dict:
    """Create a new API key. Returns plaintext key and metadata."""
    _require_permission(email)

    # Validate name
    if not name or not name.strip():
        raise ApiKeyError(APIKEY_NAME_REQUIRED)

    # Validate expiration
    if expires_at <= datetime.now(timezone.utc):
        raise ApiKeyError(APIKEY_EXPIRY_PAST)

    # Check max keys
    active_count = apikey_repo.count_active_keys(user_id)
    if active_count >= 2:
        raise ApiKeyError(APIKEY_MAX_KEYS)

    # Generate key
    plaintext = KEY_PREFIX + secrets.token_hex(KEY_BYTES)
    key_hash = hashlib.sha256(plaintext.encode()).hexdigest()

    now = datetime.now(timezone.utc)
    data = {
        "userId": user_id,
        "email": email,
        "name": name.strip(),
        "keyPrefix": plaintext[:8],
        "createdAt": now,
        "expiresAt": expires_at,
        "revokedAt": None,
    }

    api_key = apikey_repo.create_key(key_hash, data)

    return {
        "key": plaintext,
        "apiKey": api_key,
    }


def revoke_key(user_id: str, email: str, key_id: str) -> dict:
    """Revoke an API key. Idempotent for already-revoked keys."""
    _require_permission(email)

    key = apikey_repo.get_key_by_id(key_id)
    if not key or key.get("userId") != user_id:
        raise ApiKeyError(APIKEY_NOT_FOUND, code="NOT_FOUND")

    # Already revoked — idempotent
    if key.get("revokedAt") is not None:
        return key

    return apikey_repo.revoke_key(key_id)


def list_keys(user_id: str, email: str) -> list:
    """List all API keys for the caller."""
    _require_permission(email)
    return apikey_repo.list_keys_by_user(user_id)
