"""GraphQL validation runner.

Executes pre-defined GraphQL queries against the schema using the Flask
test client. Used to validate schema changes and resolver wiring without
needing a browser or live server.

Usage (from api/):
    docker compose run --rm test bash -c \
        "python -m pytest functions/tests/test_validate_graphql.py -v"
"""

import json
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from unittest.mock import patch, MagicMock

# Import server.py safely — firebase_admin.auth is already mocked by conftest's
# autouse mock_firebase_admin fixture when running via pytest. For standalone runs,
# we need to ensure the mock exists before import.
import firebase_admin
if not hasattr(firebase_admin, '_mock_initialized'):
    firebase_admin.initialize_app = MagicMock()
    firebase_admin.auth = MagicMock()
    firebase_admin.auth.verify_id_token = MagicMock(return_value={
        "uid": "test-user-123",
        "email": "test@example.com",
    })
    firebase_admin._mock_initialized = True

from server import app as _flask_app


@pytest.fixture
def client():
    """Create a Flask test client with mocked Firebase.

    Patches app.auth.auth (the module-level import of firebase_admin.auth)
    directly to avoid test-ordering issues with conftest's autouse fixture.
    """
    mock_auth = MagicMock()
    mock_auth.verify_id_token.return_value = {
        "uid": "test-user-123",
        "email": "test@example.com",
    }
    with patch("app.auth.auth", mock_auth):
        with patch("app.auth.is_email_allowed", return_value=True):
            with patch("app.auth.ratelimit_repo") as mock_rl:
                mock_rl.check_and_increment.return_value = True
                _flask_app.config["TESTING"] = True
                with _flask_app.test_client() as c:
                    yield c


def _query(client, query, variables=None, headers=None):
    """Execute a GraphQL query and return parsed response."""
    payload = {"query": query}
    if variables:
        payload["variables"] = variables
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    resp = client.post(
        "/",
        data=json.dumps(payload),
        headers=h,
    )
    return json.loads(resp.data)


class TestSchemaValidation:
    """Validate that all queries/mutations in the schema parse and resolve
    without crashing. These are wiring tests — they confirm the schema,
    resolvers, and services are connected, not that business logic is correct.
    """

    def test_version_query(self, client):
        result = _query(client, "{ version { commit deployedAt } }")
        assert "errors" not in result
        assert "version" in result["data"]

    @patch("app.services.user_service.user_repo")
    def test_me_query(self, mock_repo, client):
        mock_repo.get_user.return_value = {
            "id": "test-user-123",
            "displayName": "Test",
            "email": "test@example.com",
            "createdAt": "2026-01-01T00:00:00Z",
        }
        result = _query(
            client,
            "{ me { id displayName email } }",
            headers={"Authorization": "Bearer fake-token"},
        )
        assert "errors" not in result
        assert result["data"]["me"]["id"] == "test-user-123"

    @patch("app.services.habit_service.habit_repo")
    def test_habits_query(self, mock_repo, client):
        mock_repo.list_habits.return_value = []
        result = _query(
            client,
            "{ habits { id name frequency { type dueDays } } }",
            headers={"Authorization": "Bearer fake-token"},
        )
        assert "errors" not in result
        assert result["data"]["habits"] == []

    @patch("app.services.task_service.task_repo")
    def test_tasks_query(self, mock_task_repo, client):
        mock_task_repo.list_tasks.return_value = []
        result = _query(
            client,
            "{ tasks { id title priority } }",
            headers={"Authorization": "Bearer fake-token"},
        )
        assert "errors" not in result
        assert result["data"]["tasks"] == []

    @patch("app.services.list_service.list_repo")
    def test_task_lists_query(self, mock_repo, client):
        mock_repo.list_task_lists.return_value = []
        result = _query(
            client,
            "{ taskLists { id name isInbox } }",
            headers={"Authorization": "Bearer fake-token"},
        )
        assert "errors" not in result

    @patch("app.services.apikey_service.allowlist_repo")
    @patch("app.services.apikey_service.apikey_repo")
    def test_api_keys_query(self, mock_repo, mock_allowlist, client):
        mock_allowlist.get_allowed_email.return_value = {
            "email": "test@example.com",
            "canManageApiKeys": True,
        }
        mock_repo.list_keys_by_user.return_value = []
        result = _query(
            client,
            "{ apiKeys { id name keyPrefix expiresAt } }",
            headers={"Authorization": "Bearer fake-token"},
        )
        assert "errors" not in result
        assert result["data"]["apiKeys"] == []

    def test_graphiql_loads(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        assert b"GraphiQL" in resp.data

    def test_health_endpoint(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert json.loads(resp.data)["status"] == "ok"

    def test_cors_allows_api_key_header(self, client):
        resp = client.options("/", headers={"Origin": "http://localhost"})
        assert "X-API-Key" in resp.headers.get("Access-Control-Allow-Headers", "")

    def test_invalid_json_returns_400(self, client):
        resp = client.post("/", data="not json", headers={"Content-Type": "application/json"})
        assert resp.status_code == 400
