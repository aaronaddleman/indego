"""GraphQL resolvers package."""

import json
import os
from pathlib import Path

from ariadne import QueryType, MutationType, ObjectType


def _load_version():
    version_file = Path(__file__).resolve().parent.parent.parent.parent / "version.json"
    if version_file.exists():
        return json.loads(version_file.read_text())
    return {
        "commit": os.environ.get("GIT_COMMIT", "unknown"),
        "deployedAt": os.environ.get("DEPLOYED_AT", "unknown"),
    }


_version_info = _load_version()


def resolve_version(_, info):
    return _version_info

from app.transport.resolvers.user import resolve_me, resolve_upsert_user
from app.transport.resolvers.habit import (
    resolve_habits,
    resolve_habit,
    resolve_create_habit,
    resolve_update_habit,
    resolve_delete_habit,
    resolve_log_completion,
    resolve_undo_completion,
    resolve_habit_completions,
)
from app.transport.resolvers.stats import resolve_stats
from app.transport.resolvers.admin import (
    resolve_allowed_emails,
    resolve_add_allowed_email,
    resolve_remove_allowed_email,
    resolve_set_admin_status,
    resolve_set_api_key_permission,
)
from app.transport.resolvers.apikey import (
    resolve_api_keys,
    resolve_create_api_key,
    resolve_revoke_api_key,
)
from app.transport.resolvers.task import (
    resolve_tasks,
    resolve_task,
    resolve_create_task,
    resolve_update_task,
    resolve_delete_task,
    resolve_complete_task,
    resolve_uncomplete_task,
    resolve_reorder_task,
)
from app.transport.resolvers.list import (
    resolve_task_lists,
    resolve_create_task_list,
    resolve_update_task_list,
    resolve_delete_task_list,
)

from app.services.frequency_service import compute_due_days

query = QueryType()
mutation = MutationType()
habit_type = ObjectType("Habit")
frequency_type = ObjectType("Frequency")

# Queries
query.set_field("version", resolve_version)
query.set_field("me", resolve_me)
query.set_field("habits", resolve_habits)
query.set_field("habit", resolve_habit)
query.set_field("stats", resolve_stats)
query.set_field("tasks", resolve_tasks)
query.set_field("task", resolve_task)
query.set_field("taskLists", resolve_task_lists)
query.set_field("apiKeys", resolve_api_keys)
query.set_field("allowedEmails", resolve_allowed_emails)

# Mutations
mutation.set_field("upsertUser", resolve_upsert_user)
mutation.set_field("createHabit", resolve_create_habit)
mutation.set_field("updateHabit", resolve_update_habit)
mutation.set_field("deleteHabit", resolve_delete_habit)
mutation.set_field("logCompletion", resolve_log_completion)
mutation.set_field("undoCompletion", resolve_undo_completion)
mutation.set_field("createTask", resolve_create_task)
mutation.set_field("updateTask", resolve_update_task)
mutation.set_field("deleteTask", resolve_delete_task)
mutation.set_field("completeTask", resolve_complete_task)
mutation.set_field("uncompleteTask", resolve_uncomplete_task)
mutation.set_field("reorderTask", resolve_reorder_task)
mutation.set_field("createTaskList", resolve_create_task_list)
mutation.set_field("updateTaskList", resolve_update_task_list)
mutation.set_field("deleteTaskList", resolve_delete_task_list)
mutation.set_field("createApiKey", resolve_create_api_key)
mutation.set_field("revokeApiKey", resolve_revoke_api_key)
mutation.set_field("setApiKeyPermission", resolve_set_api_key_permission)
mutation.set_field("addAllowedEmail", resolve_add_allowed_email)
mutation.set_field("removeAllowedEmail", resolve_remove_allowed_email)
mutation.set_field("setAdminStatus", resolve_set_admin_status)

# Habit field resolvers
habit_type.set_field("completions", resolve_habit_completions)

# Frequency field resolvers
frequency_type.set_field("dueDays", lambda freq, info: compute_due_days(freq))
