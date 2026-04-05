"""Repository for per-user rate limiting."""

from datetime import datetime, timezone, timedelta

from firebase_admin import firestore


def _get_db():
    return firestore.client()


def check_and_increment(user_id: str, limit: int = 60, window_seconds: int = 60) -> bool:
    """Check if request is within rate limit and increment counter.

    Returns True if the request is allowed, False if rate limited.
    Uses a simple sliding window: resets counter when window elapses.
    """
    db = _get_db()
    ref = db.collection("rateLimits").document(user_id)
    now = datetime.now(timezone.utc)

    try:
        doc = ref.get()

        if not doc.exists:
            ref.set({"count": 1, "windowStart": now})
            return True

        data = doc.to_dict()
        window_start = data.get("windowStart")
        count = data.get("count", 0)

        # If window has expired, reset
        if (now - window_start).total_seconds() >= window_seconds:
            ref.set({"count": 1, "windowStart": now})
            return True

        # Within window — check limit
        if count >= limit:
            return False

        # Increment counter
        ref.update({"count": count + 1})
        return True
    except Exception:
        # Fail open — prefer availability over strict limiting
        return True
