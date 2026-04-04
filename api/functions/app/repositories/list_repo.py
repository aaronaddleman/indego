"""Firestore repository for TaskList documents."""

from datetime import datetime, timezone
from firebase_admin import firestore


def _get_db():
    return firestore.client()


def _lists_collection(user_id: str):
    return _get_db().collection("users").document(user_id).collection("lists")


def get_list(user_id: str, list_id: str) -> dict | None:
    doc = _lists_collection(user_id).document(list_id).get()
    if not doc.exists:
        return None
    data = doc.to_dict()
    data["id"] = doc.id
    return data


def get_inbox(user_id: str) -> dict | None:
    docs = list(
        _lists_collection(user_id).where("isInbox", "==", True).limit(1).stream()
    )
    if not docs:
        return None
    data = docs[0].to_dict()
    data["id"] = docs[0].id
    return data


def list_lists(user_id: str) -> list[dict]:
    docs = _lists_collection(user_id).order_by("createdAt").stream()
    result = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        result.append(data)
    return result


def create_list(user_id: str, name: str, is_inbox: bool = False) -> dict:
    now = datetime.now(timezone.utc)
    doc_data = {
        "name": name,
        "isInbox": is_inbox,
        "sortPreference": "MANUAL",
        "createdAt": now,
        "updatedAt": now,
    }
    ref = _lists_collection(user_id).add(doc_data)
    doc_ref = ref[1]
    doc_data["id"] = doc_ref.id
    return doc_data


def update_list(user_id: str, list_id: str, data: dict) -> dict | None:
    ref = _lists_collection(user_id).document(list_id)
    doc = ref.get()
    if not doc.exists:
        return None

    update_data = {"updatedAt": datetime.now(timezone.utc)}
    if "name" in data:
        update_data["name"] = data["name"]
    if "sortPreference" in data:
        update_data["sortPreference"] = data["sortPreference"]

    ref.update(update_data)
    updated = ref.get()
    result = updated.to_dict()
    result["id"] = updated.id
    return result


def delete_list(user_id: str, list_id: str) -> bool:
    ref = _lists_collection(user_id).document(list_id)
    doc = ref.get()
    if not doc.exists:
        return False
    ref.delete()
    return True


def count_tasks(user_id: str, list_id: str) -> int:
    """Count tasks in a list."""
    docs = list(
        firestore.client()
        .collection("users").document(user_id).collection("tasks")
        .where("listId", "==", list_id)
        .stream()
    )
    return len(docs)
