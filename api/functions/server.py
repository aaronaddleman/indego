"""Cloud Run entry point for the Indago Habits GraphQL API."""

import json
import os

from flask import Flask, request, jsonify
from firebase_admin import initialize_app
from ariadne import graphql_sync
from ariadne.explorer import ExplorerGraphiQL

from app import create_schema
from app.auth import get_context_value

initialize_app()
schema = create_schema()
explorer = ExplorerGraphiQL()

# Pre-loaded validation queries for GraphiQL tabs
_DEFAULT_TABS = json.dumps([
    {
        "query": "# Check API version (no auth required)\n{ version { commit deployedAt } }",
    },
    {
        "query": "# Get current user profile\n{ me { id displayName email createdAt } }",
    },
    {
        "query": "# List all habits with completions\n{\n  habits {\n    id\n    name\n    frequency { type dueDays }\n    reminder { enabled time }\n    longestStreak\n    completions { date completedAt }\n  }\n}",
    },
    {
        "query": "# List all tasks\n{\n  taskLists { id name isInbox taskCount }\n  tasks { id title priority dueDate completed listId }\n}",
    },
    {
        "query": "# Get stats for date range\n{\n  stats(dateRange: { startDate: \"2026-01-01\", endDate: \"2026-12-31\" }) {\n    totalHabits\n    totalCompletions\n    habitStats { habitName completionRate longestStreak }\n  }\n}",
    },
    {
        "query": "# Create an API key\nmutation {\n  createApiKey(input: {\n    name: \"MCP Server\"\n    expiresAt: \"2027-04-05T00:00:00Z\"\n  }) {\n    key\n    apiKey { id name keyPrefix expiresAt }\n  }\n}",
    },
    {
        "query": "# List & revoke API keys\n{\n  apiKeys { id name keyPrefix expiresAt revokedAt createdAt }\n}\n\n# mutation { revokeApiKey(id: \"<key_id>\") { id revokedAt } }",
    },
    {
        "query": "# Admin: list allowed emails\n{ allowedEmails { email isAdmin canManageApiKeys } }",
    },
])

_GRAPHIQL_PATCH = f"""<script>
(function() {{
  // Set default headers on first visit
  var hKey = 'graphiql:headers';
  if (!window.localStorage.getItem(hKey)) {{
    window.localStorage.setItem(hKey, JSON.stringify({{
      "Authorization": "Bearer <paste_firebase_token_here>",
      "X-API-Key": "<or_paste_api_key_here>"
    }}, null, 2));
  }}
  // Set default tabs on first visit
  var tKey = 'graphiql:tabState';
  if (!window.localStorage.getItem(tKey)) {{
    var tabs = {_DEFAULT_TABS};
    var tabState = {{
      activeTabIndex: 0,
      tabs: tabs.map(function(t, i) {{
        return {{
          id: String(i),
          query: t.query,
          variables: "",
          headers: "",
          operationName: null,
          title: null
        }};
      }})
    }};
    window.localStorage.setItem(tKey, JSON.stringify(tabState));
  }}
}})();
</script>"""
explorer.parsed_html = explorer.parsed_html.replace("</head>", _GRAPHIQL_PATCH + "\n</head>")

app = Flask(__name__)


@app.route("/", methods=["GET", "POST", "OPTIONS"])
def graphql_endpoint():
    """Handle GraphQL requests."""
    # CORS preflight
    if request.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
            "Access-Control-Max-Age": "3600",
        }
        return "", 204, headers

    # GraphiQL explorer
    if request.method == "GET":
        return explorer.html(None), 200, {"Content-Type": "text/html"}

    # GraphQL query/mutation
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"errors": [{"message": "Invalid JSON"}]}), 400

    context = get_context_value(request)
    success, result = graphql_sync(schema, data, context_value=context)

    headers = {"Access-Control-Allow-Origin": "*"}
    status = 200 if success else 400

    return json.dumps(result), status, {**headers, "Content-Type": "application/json"}


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint for Cloud Run."""
    return jsonify({"status": "ok"}), 200


@app.route("/version", methods=["GET"])
def version():
    """Version info endpoint."""
    return jsonify({
        "commit": os.environ.get("GIT_COMMIT", "unknown"),
        "deployedAt": os.environ.get("DEPLOYED_AT", "unknown"),
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
