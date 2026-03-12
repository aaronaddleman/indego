"""Cloud Function entry point for the Indago Habits GraphQL API."""

import json

from firebase_functions import https_fn
from firebase_admin import initialize_app
from ariadne import graphql_sync
from ariadne.explorer import ExplorerGraphiQL

from app import create_schema
from app.auth import get_context_value

initialize_app()
schema = create_schema()
explorer = ExplorerGraphiQL(
    default_query="""\
# Indago Habits API — Example Queries
# Run version check first (no auth needed), then set
# an Authorization header below for the rest.

# ─── No Auth Required ───────────────────────────
{ version { commit deployedAt } }

# ─── Queries (require Authorization header) ─────
#
# { me { id email displayName createdAt } }
#
# { habits { id name frequency reminderTime createdAt } }
#
# query GetHabit($id: ID!) {
#   habit(id: $id) {
#     id name frequency
#     completions { date completedAt }
#   }
# }
#
# {
#   stats(from: "2026-03-01", to: "2026-03-11") {
#     totalHabits completionRate completions expected
#   }
# }

# ─── Mutations (require Authorization header) ────
#
# mutation {
#   upsertUser(input: { displayName: "Aaron" }) {
#     id email displayName createdAt
#   }
# }
#
# mutation {
#   createHabit(input: {
#     name: "Morning Run"
#     frequency: DAILY
#     reminderTime: "07:00"
#   }) {
#     id name frequency reminderTime createdAt
#   }
# }
#
# mutation UpdateHabit($id: ID!) {
#   updateHabit(id: $id, input: {
#     name: "Evening Run"
#     reminderTime: "18:00"
#   }) {
#     id name reminderTime
#   }
# }
#
# mutation LogCompletion($id: ID!) {
#   logCompletion(habitId: $id, date: "2026-03-11") {
#     id name completions { date completedAt }
#   }
# }
#
# mutation UndoCompletion($id: ID!) {
#   undoCompletion(habitId: $id, date: "2026-03-11") {
#     id name completions { date completedAt }
#   }
# }
#
# mutation DeleteHabit($id: ID!) {
#   deleteHabit(id: $id)
# }
""",
)


@https_fn.on_request()
def graphql(req: https_fn.Request) -> https_fn.Response:
    """Handle GraphQL requests."""
    # Handle CORS preflight
    if req.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "3600",
        }
        return https_fn.Response("", status=204, headers=headers)

    # Serve GraphiQL explorer on GET requests
    if req.method == "GET":
        html = explorer.html(None)
        return https_fn.Response(html, status=200, content_type="text/html")

    try:
        data = req.get_json()
    except Exception:
        return https_fn.Response(
            json.dumps({"errors": [{"message": "Invalid JSON"}]}),
            status=400,
            content_type="application/json",
        )

    context = get_context_value(req)
    success, result = graphql_sync(schema, data, context_value=context)

    headers = {"Access-Control-Allow-Origin": "*"}
    status = 200 if success else 400

    return https_fn.Response(
        json.dumps(result),
        status=status,
        content_type="application/json",
        headers=headers,
    )
