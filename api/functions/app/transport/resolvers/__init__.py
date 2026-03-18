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

query = QueryType()
mutation = MutationType()
habit_type = ObjectType("Habit")

# Queries
query.set_field("version", resolve_version)
query.set_field("me", resolve_me)
query.set_field("habits", resolve_habits)
query.set_field("habit", resolve_habit)
query.set_field("stats", resolve_stats)

# Mutations
mutation.set_field("upsertUser", resolve_upsert_user)
mutation.set_field("createHabit", resolve_create_habit)
mutation.set_field("updateHabit", resolve_update_habit)
mutation.set_field("deleteHabit", resolve_delete_habit)
mutation.set_field("logCompletion", resolve_log_completion)
mutation.set_field("undoCompletion", resolve_undo_completion)

# Habit field resolvers
habit_type.set_field("completions", resolve_habit_completions)
