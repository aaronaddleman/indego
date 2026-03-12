"""Stats query resolvers."""

from datetime import date

from app.auth import require_auth
from app.services import stats_service


def resolve_stats(_, info, dateRange):
    user_id = require_auth(info.context)

    start = dateRange["startDate"]
    end = dateRange["endDate"]

    if isinstance(start, str):
        start = date.fromisoformat(start)
    if isinstance(end, str):
        end = date.fromisoformat(end)

    return stats_service.get_stats(user_id, start, end)
