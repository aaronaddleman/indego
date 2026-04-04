"""Task query and mutation resolvers."""

from app.auth import require_auth
from app.services import task_service


def resolve_tasks(_, info, listId=None, completed=None):
    user_id = require_auth(info.context)
    return task_service.list_tasks(user_id, listId, completed)


def resolve_task(_, info, id):
    user_id = require_auth(info.context)
    return task_service.get_task(user_id, id)


def resolve_create_task(_, info, input):
    user_id = require_auth(info.context)
    return task_service.create_task(user_id, input)


def resolve_update_task(_, info, id, input):
    user_id = require_auth(info.context)
    return task_service.update_task(user_id, id, input)


def resolve_delete_task(_, info, id):
    user_id = require_auth(info.context)
    return task_service.delete_task(user_id, id)


def resolve_complete_task(_, info, id):
    user_id = require_auth(info.context)
    return task_service.complete_task(user_id, id)


def resolve_uncomplete_task(_, info, id):
    user_id = require_auth(info.context)
    return task_service.uncomplete_task(user_id, id)


def resolve_reorder_task(_, info, id, sortOrder):
    user_id = require_auth(info.context)
    return task_service.reorder_task(user_id, id, sortOrder)
