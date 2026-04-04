"""Business logic for Task operations."""

from graphql import GraphQLError

from app.repositories import task_repo
from app.services.list_service import ensure_inbox


class ValidationError(GraphQLError):
    def __init__(self, message: str):
        super().__init__(message, extensions={"code": "VALIDATION_ERROR"})


class NotFoundError(GraphQLError):
    def __init__(self, message: str):
        super().__init__(message, extensions={"code": "NOT_FOUND"})


_VALID_PRIORITIES = {"P1", "P2", "P3", "P4"}


def list_tasks(user_id: str, list_id: str | None = None, completed: bool | None = None) -> list[dict]:
    return task_repo.list_tasks(user_id, list_id, completed)


def get_task(user_id: str, task_id: str) -> dict | None:
    return task_repo.get_task(user_id, task_id)


def create_task(user_id: str, input_data: dict) -> dict:
    title = input_data.get("title", "").strip()
    if not title:
        raise ValidationError("Task title is required")

    priority = input_data.get("priority", "P4")
    if priority not in _VALID_PRIORITIES:
        raise ValidationError(f"Invalid priority: {priority}")

    list_id = input_data.get("listId")
    if not list_id:
        inbox = ensure_inbox(user_id)
        list_id = inbox["id"]

    return task_repo.create_task(user_id, {
        "title": title,
        "description": input_data.get("description"),
        "listId": list_id,
        "parentId": input_data.get("parentId"),
        "priority": priority,
        "dueDate": input_data.get("dueDate"),
    })


def update_task(user_id: str, task_id: str, input_data: dict) -> dict:
    update = {}

    if "title" in input_data:
        title = input_data["title"].strip()
        if not title:
            raise ValidationError("Task title cannot be empty")
        update["title"] = title

    if "description" in input_data:
        update["description"] = input_data["description"]

    if "listId" in input_data:
        update["listId"] = input_data["listId"]

    if "parentId" in input_data:
        update["parentId"] = input_data["parentId"]

    if "priority" in input_data:
        if input_data["priority"] not in _VALID_PRIORITIES:
            raise ValidationError(f"Invalid priority: {input_data['priority']}")
        update["priority"] = input_data["priority"]

    if "dueDate" in input_data:
        update["dueDate"] = input_data["dueDate"]

    if not update:
        raise ValidationError("No fields to update")

    result = task_repo.update_task(user_id, task_id, update)
    if result is None:
        raise NotFoundError("Task not found")
    return result


def delete_task(user_id: str, task_id: str) -> bool:
    # Delete all descendants first
    descendants = task_repo.get_descendants(user_id, task_id)
    for desc in descendants:
        task_repo.delete_task(user_id, desc["id"])

    deleted = task_repo.delete_task(user_id, task_id)
    if not deleted:
        raise NotFoundError("Task not found")
    return True


def complete_task(user_id: str, task_id: str) -> list[dict]:
    """Complete a task and all its descendants. Returns all affected tasks."""
    task = task_repo.complete_task(user_id, task_id)
    if task is None:
        raise NotFoundError("Task not found")

    descendants = task_repo.get_descendants(user_id, task_id)
    completed = [task]
    for desc in descendants:
        if not desc.get("completed"):
            result = task_repo.complete_task(user_id, desc["id"])
            if result:
                completed.append(result)
            else:
                completed.append(desc)
        else:
            completed.append(desc)

    return completed


def uncomplete_task(user_id: str, task_id: str) -> dict:
    result = task_repo.uncomplete_task(user_id, task_id)
    if result is None:
        raise NotFoundError("Task not found")
    return result


def reorder_task(user_id: str, task_id: str, sort_order: float) -> dict:
    result = task_repo.update_task(user_id, task_id, {"sortOrder": sort_order})
    if result is None:
        raise NotFoundError("Task not found")
    return result
