"""Repository for email allowlist access control."""

from firebase_admin import firestore


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
