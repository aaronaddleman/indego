"""Repository for email allowlist access control."""

from firebase_admin import firestore


def get_allowed_email(email: str) -> dict | None:
    """Get the full allowedEmails document for an email."""
    try:
        db = firestore.client()
        doc = db.collection("allowedEmails").document(email.lower()).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        data["email"] = doc.id
        return data
    except Exception:
        return None


def is_email_allowed(email: str) -> bool:
    """Check if email exists in the allowedEmails collection.

    Returns False if the email is not found or if the check fails (fail closed).
    """
    try:
        db = firestore.client()
        doc = db.collection("allowedEmails").document(email.lower()).get()
        return doc.exists
    except Exception:
        return False


def is_email_admin(email: str) -> bool:
    """Check if email has isAdmin: true."""
    try:
        db = firestore.client()
        doc = db.collection("allowedEmails").document(email.lower()).get()
        return doc.exists and doc.to_dict().get("isAdmin", False)
    except Exception:
        return False


def list_allowed_emails() -> list:
    """List all allowed emails with isAdmin status."""
    db = firestore.client()
    docs = db.collection("allowedEmails").stream()
    return [
        {
            "email": doc.id,
            "isAdmin": doc.to_dict().get("isAdmin", False),
            "canManageApiKeys": doc.to_dict().get("canManageApiKeys", False),
        }
        for doc in docs
    ]


def add_allowed_email(email: str) -> dict:
    """Add an email to the allowlist. Returns the created entry."""
    db = firestore.client()
    email = email.lower()
    ref = db.collection("allowedEmails").document(email)
    ref.set({"isAdmin": False, "canManageApiKeys": False})
    return {"email": email, "isAdmin": False, "canManageApiKeys": False}


def remove_allowed_email(email: str) -> bool:
    """Remove an email from the allowlist."""
    db = firestore.client()
    db.collection("allowedEmails").document(email.lower()).delete()
    return True


def set_admin_status(email: str, is_admin: bool) -> dict:
    """Set the isAdmin flag on an allowed email."""
    db = firestore.client()
    email = email.lower()
    ref = db.collection("allowedEmails").document(email)
    ref.update({"isAdmin": is_admin})
    doc = ref.get()
    data = doc.to_dict()
    data["email"] = doc.id
    return data


def set_api_key_permission(email: str, enabled: bool) -> dict:
    """Set the canManageApiKeys flag on an allowed email."""
    db = firestore.client()
    email = email.lower()
    ref = db.collection("allowedEmails").document(email)
    ref.update({"canManageApiKeys": enabled})
    doc = ref.get()
    data = doc.to_dict()
    data["email"] = doc.id
    return data


def count_admins() -> int:
    """Count the number of admin emails."""
    db = firestore.client()
    docs = db.collection("allowedEmails").stream()
    return sum(1 for doc in docs if doc.to_dict().get("isAdmin", False))
