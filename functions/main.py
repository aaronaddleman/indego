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
explorer = ExplorerGraphiQL()


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
