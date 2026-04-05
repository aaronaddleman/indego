"""Repository for API key storage and retrieval."""

import hashlib
from datetime import datetime, timezone

from firebase_admin import firestore


def _get_db():
    return firestore.client()


def _hash_key(plaintext: str) -> str:
    """SHA-256 hash of the plaintext API key."""
    return hashlib.sha256(plaintext.encode()).hexdigest()


def get_key_by_hash(key_hash: str) -> dict | None:
    """Look up an API key document by its SHA-256 hash."""
    db = _get_db()
    doc = db.collection("apiKeys").document(key_hash).get()
    if not doc.exists:
        return None
    data = doc.to_dict()
    data["id"] = doc.id
    return data


def get_key_by_id(key_id: str) -> dict | None:
    """Look up an API key document by its document ID (hash)."""
    return get_key_by_hash(key_id)


def list_keys_by_user(user_id: str) -> list:
    """List all API keys for a user (including revoked/expired)."""
    db = _get_db()
    docs = db.collection("apiKeys").where("userId", "==", user_id).stream()
    results = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        results.append(data)
    return results


def count_active_keys(user_id: str) -> int:
    """Count non-revoked, non-expired keys for a user."""
    now = datetime.now(timezone.utc)
    keys = list_keys_by_user(user_id)
    return sum(
        1 for k in keys
        if k.get("revokedAt") is None and k.get("expiresAt", now) > now
    )


def create_key(key_hash: str, data: dict) -> dict:
    """Create a new API key document. Document ID is the SHA-256 hash."""
    db = _get_db()
    ref = db.collection("apiKeys").document(key_hash)
    ref.set(data)
    result = dict(data)
    result["id"] = key_hash
    return result


def revoke_key(key_hash: str) -> dict:
    """Set revokedAt on an API key."""
    db = _get_db()
    now = datetime.now(timezone.utc)
    ref = db.collection("apiKeys").document(key_hash)
    ref.update({"revokedAt": now})
    doc = ref.get()
    data = doc.to_dict()
    data["id"] = doc.id
    return data
