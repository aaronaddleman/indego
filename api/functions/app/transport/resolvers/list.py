"""TaskList query and mutation resolvers."""

from app.auth import require_auth
from app.services import list_service


def resolve_task_lists(_, info):
    user_id = require_auth(info.context)
    return list_service.list_lists(user_id)


def resolve_create_task_list(_, info, name):
    user_id = require_auth(info.context)
    return list_service.create_list(user_id, name)


def resolve_update_task_list(_, info, id, name=None, sortPreference=None):
    user_id = require_auth(info.context)
    data = {}
    if name is not None:
        data["name"] = name
    if sortPreference is not None:
        data["sortPreference"] = sortPreference
    return list_service.update_list(user_id, id, data)


def resolve_delete_task_list(_, info, id):
    user_id = require_auth(info.context)
    return list_service.delete_list(user_id, id)
