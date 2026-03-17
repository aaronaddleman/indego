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

app = Flask(__name__)


@app.route("/", methods=["GET", "POST", "OPTIONS"])
def graphql_endpoint():
    """Handle GraphQL requests."""
    # CORS preflight
    if request.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
