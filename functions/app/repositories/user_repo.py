"""Firestore repository for User documents."""

from datetime import datetime, timezone
from firebase_admin import firestore


def _get_db():
    return firestore.client()


def get_user(user_id: str) -> dict | None:
    """Get a user document by ID. Returns None if not found."""
    doc = _get_db().collection("users").document(user_id).get()
    if not doc.exists:
        return None
    data = doc.to_dict()
    data["id"] = doc.id
    return data


def upsert_user(user_id: str, display_name: str, email: str) -> dict:
    """Create or update a user document. Returns the user data."""
    db = _get_db()
    ref = db.collection("users").document(user_id)
    doc = ref.get()

    now = datetime.now(timezone.utc)

    if doc.exists:
        ref.update({
            "displayName": display_name,
            "updatedAt": now,
        })
    else:
        ref.set({
            "displayName": display_name,
            "email": email,
            "createdAt": now,
        })

    updated = ref.get()
    data = updated.to_dict()
    data["id"] = updated.id
    return data
