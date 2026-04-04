"""Firestore repository for Task documents."""

from datetime import datetime, timezone
from firebase_admin import firestore


def _get_db():
    return firestore.client()


def _tasks_collection(user_id: str):
    return _get_db().collection("users").document(user_id).collection("tasks")


def get_task(user_id: str, task_id: str) -> dict | None:
    doc = _tasks_collection(user_id).document(task_id).get()
    if not doc.exists:
        return None
    data = doc.to_dict()
    data["id"] = doc.id
    return data


def list_tasks(user_id: str, list_id: str | None = None, completed: bool | None = None) -> list[dict]:
    query = _tasks_collection(user_id)
    if list_id is not None:
        query = query.where("listId", "==", list_id)
    if completed is not None:
        query = query.where("completed", "==", completed)
    query = query.order_by("sortOrder")

    tasks = []
    for doc in query.stream():
        data = doc.to_dict()
        data["id"] = doc.id
        tasks.append(data)
    return tasks


def create_task(user_id: str, data: dict) -> dict:
    now = datetime.now(timezone.utc)
    doc_data = {
        "title": data["title"],
        "description": data.get("description"),
        "listId": data["listId"],
        "parentId": data.get("parentId"),
        "priority": data.get("priority", "P4"),
        "dueDate": data.get("dueDate"),
        "completed": False,
        "completedAt": None,
        "sortOrder": data.get("sortOrder", _next_sort_order(user_id, data["listId"])),
        "createdAt": now,
        "updatedAt": now,
    }
    ref = _tasks_collection(user_id).add(doc_data)
    doc_ref = ref[1]
    doc_data["id"] = doc_ref.id
    return doc_data


def update_task(user_id: str, task_id: str, data: dict) -> dict | None:
    ref = _tasks_collection(user_id).document(task_id)
    doc = ref.get()
    if not doc.exists:
        return None

    update_data = {"updatedAt": datetime.now(timezone.utc)}
    for key in ["title", "description", "listId", "parentId", "priority", "dueDate", "sortOrder"]:
        if key in data:
            update_data[key] = data[key]

    ref.update(update_data)
    updated = ref.get()
    result = updated.to_dict()
    result["id"] = updated.id
    return result


def complete_task(user_id: str, task_id: str) -> dict | None:
    ref = _tasks_collection(user_id).document(task_id)
    doc = ref.get()
    if not doc.exists:
        return None

    now = datetime.now(timezone.utc)
    ref.update({"completed": True, "completedAt": now, "updatedAt": now})
    updated = ref.get()
    result = updated.to_dict()
    result["id"] = updated.id
    return result


def uncomplete_task(user_id: str, task_id: str) -> dict | None:
    ref = _tasks_collection(user_id).document(task_id)
    doc = ref.get()
    if not doc.exists:
        return None

    now = datetime.now(timezone.utc)
    ref.update({"completed": False, "completedAt": None, "updatedAt": now})
    updated = ref.get()
    result = updated.to_dict()
    result["id"] = updated.id
    return result


def delete_task(user_id: str, task_id: str) -> bool:
    ref = _tasks_collection(user_id).document(task_id)
    doc = ref.get()
    if not doc.exists:
        return False
    ref.delete()
    return True


def get_descendants(user_id: str, parent_id: str) -> list[dict]:
    """Recursively find all descendants of a task."""
    children = list(_tasks_collection(user_id).where("parentId", "==", parent_id).stream())
    result = []
    for child in children:
        data = child.to_dict()
        data["id"] = child.id
        result.append(data)
        result.extend(get_descendants(user_id, child.id))
    return result


def move_tasks_to_list(user_id: str, from_list_id: str, to_list_id: str):
    """Move all tasks from one list to another."""
    tasks = list(_tasks_collection(user_id).where("listId", "==", from_list_id).stream())
    for doc in tasks:
        doc.reference.update({"listId": to_list_id, "updatedAt": datetime.now(timezone.utc)})


def _next_sort_order(user_id: str, list_id: str) -> float:
    """Get the next sort order value for a list (max + 1)."""
    docs = list(
        _tasks_collection(user_id)
        .where("listId", "==", list_id)
        .order_by("sortOrder", direction=firestore.Query.DESCENDING)
        .limit(1)
        .stream()
    )
    if not docs:
        return 1.0
    return docs[0].to_dict().get("sortOrder", 0) + 1.0
