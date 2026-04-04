"""Business logic for TaskList operations."""

from graphql import GraphQLError

from app.repositories import list_repo, task_repo


class ValidationError(GraphQLError):
    def __init__(self, message: str):
        super().__init__(message, extensions={"code": "VALIDATION_ERROR"})


class NotFoundError(GraphQLError):
    def __init__(self, message: str):
        super().__init__(message, extensions={"code": "NOT_FOUND"})


def ensure_inbox(user_id: str) -> dict:
    """Get or create the user's Inbox list."""
    inbox = list_repo.get_inbox(user_id)
    if not inbox:
        inbox = list_repo.create_list(user_id, "Inbox", is_inbox=True)
    return inbox


def list_lists(user_id: str) -> list[dict]:
    lists = list_repo.list_lists(user_id)
    # Ensure inbox exists
    if not any(l.get("isInbox") for l in lists):
        inbox = ensure_inbox(user_id)
        lists.insert(0, inbox)
    # Add task counts
    for lst in lists:
        lst["taskCount"] = list_repo.count_tasks(user_id, lst["id"])
    return lists


def create_list(user_id: str, name: str) -> dict:
    name = name.strip()
    if not name:
        raise ValidationError("List name is required")
    result = list_repo.create_list(user_id, name)
    result["taskCount"] = 0
    return result


def update_list(user_id: str, list_id: str, data: dict) -> dict:
    existing = list_repo.get_list(user_id, list_id)
    if existing is None:
        raise NotFoundError("List not found")

    update = {}
    if "name" in data:
        name = data["name"].strip()
        if not name:
            raise ValidationError("List name cannot be empty")
        if existing.get("isInbox"):
            raise ValidationError("Cannot rename the Inbox")
        update["name"] = name

    if "sortPreference" in data:
        valid = {"MANUAL", "DUE_DATE", "PRIORITY", "CREATED_AT"}
        if data["sortPreference"] not in valid:
            raise ValidationError(f"Invalid sort preference: {data['sortPreference']}")
        update["sortPreference"] = data["sortPreference"]

    if not update:
        raise ValidationError("No fields to update")

    result = list_repo.update_list(user_id, list_id, update)
    if result is None:
        raise NotFoundError("List not found")
    result["taskCount"] = list_repo.count_tasks(user_id, list_id)
    return result


def delete_list(user_id: str, list_id: str) -> bool:
    existing = list_repo.get_list(user_id, list_id)
    if existing is None:
        raise NotFoundError("List not found")
    if existing.get("isInbox"):
        raise ValidationError("Cannot delete the Inbox")

    # Move tasks to inbox
    inbox = ensure_inbox(user_id)
    task_repo.move_tasks_to_list(user_id, list_id, inbox["id"])

    deleted = list_repo.delete_list(user_id, list_id)
    if not deleted:
        raise NotFoundError("List not found")
    return True
