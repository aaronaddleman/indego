"""Firestore repository for Habit documents."""

from datetime import datetime, timezone
from firebase_admin import firestore


def _get_db():
    return firestore.client()


def _habits_collection(user_id: str):
    return _get_db().collection("users").document(user_id).collection("habits")


def get_habit(user_id: str, habit_id: str) -> dict | None:
    """Get a single habit by ID. Returns None if not found."""
    doc = _habits_collection(user_id).document(habit_id).get()
    if not doc.exists:
        return None
    data = doc.to_dict()
    data["id"] = doc.id
    return data


def list_habits(user_id: str) -> list[dict]:
    """List all habits for a user."""
    docs = _habits_collection(user_id).stream()
    habits = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        habits.append(data)
    return habits


def create_habit(user_id: str, data: dict) -> dict:
    """Create a new habit. Returns the created habit data."""
    now = datetime.now(timezone.utc)
    doc_data = {
        "name": data["name"],
        "frequency": data["frequency"],
        "reminder": data.get("reminder", {"enabled": False}),
        "longestStreak": 0,
        "completions": {},
        "createdAt": now,
        "updatedAt": now,
    }
    ref = _habits_collection(user_id).add(doc_data)
    # .add() returns a tuple of (timestamp, document_reference)
    doc_ref = ref[1]
    doc_data["id"] = doc_ref.id
    return doc_data


def update_habit(user_id: str, habit_id: str, data: dict) -> dict | None:
    """Update an existing habit. Returns updated data or None if not found."""
    ref = _habits_collection(user_id).document(habit_id)
    doc = ref.get()
    if not doc.exists:
        return None

    update_data = {"updatedAt": datetime.now(timezone.utc)}
    if "name" in data:
        update_data["name"] = data["name"]
    if "frequency" in data:
        update_data["frequency"] = data["frequency"]
    if "reminder" in data:
        update_data["reminder"] = data["reminder"]

    ref.update(update_data)
    updated = ref.get()
    result = updated.to_dict()
    result["id"] = updated.id
    return result


def delete_habit(user_id: str, habit_id: str) -> bool:
    """Delete a habit. Returns True if it existed, False otherwise."""
    ref = _habits_collection(user_id).document(habit_id)
    doc = ref.get()
    if not doc.exists:
        return False
    ref.delete()
    return True


def log_completion(user_id: str, habit_id: str, date_str: str) -> dict | None:
    """Log a completion by setting a map key on the habit document.

    Returns the updated habit data, or None if habit not found.
    """
    ref = _habits_collection(user_id).document(habit_id)
    doc = ref.get()
    if not doc.exists:
        return None

    now = datetime.now(timezone.utc)
    ref.update({
        f"completions.{date_str}": now.isoformat(),
        "updatedAt": now,
    })

    updated = ref.get()
    result = updated.to_dict()
    result["id"] = updated.id
    return result


def undo_completion(user_id: str, habit_id: str, date_str: str) -> bool:
    """Remove a completion map key. Returns True if habit exists."""
    ref = _habits_collection(user_id).document(habit_id)
    doc = ref.get()
    if not doc.exists:
        return False

    ref.update({
        f"completions.{date_str}": firestore.DELETE_FIELD,
        "updatedAt": datetime.now(timezone.utc),
    })
    return True
