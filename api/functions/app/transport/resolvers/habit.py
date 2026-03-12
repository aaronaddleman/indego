"""Habit and Completion query and mutation resolvers."""

from app.auth import require_auth
from app.services import habit_service


def resolve_habits(_, info):
    user_id = require_auth(info.context)
    return habit_service.list_habits(user_id)


def resolve_habit(_, info, id):
    user_id = require_auth(info.context)
    return habit_service.get_habit(user_id, id)


def resolve_create_habit(_, info, input):
    user_id = require_auth(info.context)
    return habit_service.create_habit(user_id, input)


def resolve_update_habit(_, info, id, input):
    user_id = require_auth(info.context)
    return habit_service.update_habit(user_id, id, input)


def resolve_delete_habit(_, info, id):
    user_id = require_auth(info.context)
    return habit_service.delete_habit(user_id, id)


def resolve_log_completion(_, info, habitId, date):
    user_id = require_auth(info.context)
    date_str = date if isinstance(date, str) else date.isoformat()
    return habit_service.log_completion(user_id, habitId, date_str)


def resolve_undo_completion(_, info, habitId, date):
    user_id = require_auth(info.context)
    date_str = date if isinstance(date, str) else date.isoformat()
    return habit_service.undo_completion(user_id, habitId, date_str)


def resolve_habit_completions(habit, info):
    """Resolve the completions field on a Habit type.

    Converts the completions map (date → timestamp) into a list of Completion objects.
    """
    completions_map = habit.get("completions", {})
    return [
        {"date": date_str, "completedAt": completed_at}
        for date_str, completed_at in sorted(completions_map.items())
    ]
