"""Tests for task and list service layers."""

from unittest.mock import patch, MagicMock
from datetime import datetime, timezone

import pytest
from graphql import GraphQLError

from app.services import task_service, list_service


class TestCreateTask:
    @patch("app.services.task_service.task_repo")
    @patch("app.services.task_service.ensure_inbox")
    def test_creates_task_with_defaults(self, mock_inbox, mock_repo):
        mock_inbox.return_value = {"id": "inbox-1"}
        mock_repo.create_task.return_value = {
            "id": "t1", "title": "Buy groceries", "listId": "inbox-1",
            "priority": "P4", "completed": False,
        }

        result = task_service.create_task("user-1", {"title": "Buy groceries"})

        assert result["title"] == "Buy groceries"
        assert result["listId"] == "inbox-1"
        mock_repo.create_task.assert_called_once()

    @patch("app.services.task_service.task_repo")
    @patch("app.services.task_service.ensure_inbox")
    def test_rejects_empty_title(self, mock_inbox, mock_repo):
        with pytest.raises(GraphQLError, match="title is required"):
            task_service.create_task("user-1", {"title": "  "})

    @patch("app.services.task_service.task_repo")
    @patch("app.services.task_service.ensure_inbox")
    def test_rejects_invalid_priority(self, mock_inbox, mock_repo):
        with pytest.raises(GraphQLError, match="Invalid priority"):
            task_service.create_task("user-1", {"title": "Test", "priority": "P5"})

    @patch("app.services.task_service.task_repo")
    def test_creates_task_with_explicit_list(self, mock_repo):
        mock_repo.create_task.return_value = {
            "id": "t1", "title": "Write docs", "listId": "list-1",
            "priority": "P2", "completed": False,
        }

        result = task_service.create_task("user-1", {
            "title": "Write docs", "listId": "list-1", "priority": "P2",
        })

        assert result["listId"] == "list-1"


class TestCompleteTask:
    @patch("app.services.task_service.task_repo")
    def test_completes_task_and_subtasks(self, mock_repo):
        mock_repo.complete_task.return_value = {
            "id": "t1", "completed": True, "completedAt": "now",
        }
        mock_repo.get_descendants.return_value = [
            {"id": "t2", "completed": False},
            {"id": "t3", "completed": False},
        ]
        # complete_task for descendants
        mock_repo.complete_task.side_effect = [
            {"id": "t1", "completed": True, "completedAt": "now"},
            {"id": "t2", "completed": True, "completedAt": "now"},
            {"id": "t3", "completed": True, "completedAt": "now"},
        ]

        result = task_service.complete_task("user-1", "t1")

        assert len(result) == 3
        assert all(t["completed"] for t in result)

    @patch("app.services.task_service.task_repo")
    def test_complete_nonexistent_raises(self, mock_repo):
        mock_repo.complete_task.return_value = None

        with pytest.raises(GraphQLError, match="not found"):
            task_service.complete_task("user-1", "missing")


class TestDeleteTask:
    @patch("app.services.task_service.task_repo")
    def test_deletes_task_and_descendants(self, mock_repo):
        mock_repo.get_descendants.return_value = [
            {"id": "child-1"}, {"id": "child-2"},
        ]
        mock_repo.delete_task.return_value = True

        result = task_service.delete_task("user-1", "t1")

        assert result is True
        assert mock_repo.delete_task.call_count == 3  # 2 children + 1 parent

    @patch("app.services.task_service.task_repo")
    def test_delete_nonexistent_raises(self, mock_repo):
        mock_repo.get_descendants.return_value = []
        mock_repo.delete_task.return_value = False

        with pytest.raises(GraphQLError, match="not found"):
            task_service.delete_task("user-1", "missing")


class TestListService:
    @patch("app.services.list_service.list_repo")
    @patch("app.services.list_service.task_repo")
    def test_ensure_inbox_creates_if_missing(self, mock_task_repo, mock_list_repo):
        mock_list_repo.get_inbox.return_value = None
        mock_list_repo.create_list.return_value = {
            "id": "inbox-1", "name": "Inbox", "isInbox": True,
        }

        result = list_service.ensure_inbox("user-1")

        assert result["isInbox"] is True
        mock_list_repo.create_list.assert_called_once()

    @patch("app.services.list_service.list_repo")
    @patch("app.services.list_service.task_repo")
    def test_ensure_inbox_returns_existing(self, mock_task_repo, mock_list_repo):
        mock_list_repo.get_inbox.return_value = {
            "id": "inbox-1", "name": "Inbox", "isInbox": True,
        }

        result = list_service.ensure_inbox("user-1")

        assert result["id"] == "inbox-1"
        mock_list_repo.create_list.assert_not_called()

    @patch("app.services.list_service.list_repo")
    @patch("app.services.list_service.task_repo")
    def test_delete_list_moves_tasks_to_inbox(self, mock_task_repo, mock_list_repo):
        mock_list_repo.get_list.return_value = {"id": "list-1", "isInbox": False}
        mock_list_repo.get_inbox.return_value = {"id": "inbox-1", "isInbox": True}
        mock_list_repo.delete_list.return_value = True

        result = list_service.delete_list("user-1", "list-1")

        assert result is True
        mock_task_repo.move_tasks_to_list.assert_called_once_with("user-1", "list-1", "inbox-1")

    @patch("app.services.list_service.list_repo")
    @patch("app.services.list_service.task_repo")
    def test_cannot_delete_inbox(self, mock_task_repo, mock_list_repo):
        mock_list_repo.get_list.return_value = {"id": "inbox-1", "isInbox": True}

        with pytest.raises(GraphQLError, match="Cannot delete the Inbox"):
            list_service.delete_list("user-1", "inbox-1")

    @patch("app.services.list_service.list_repo")
    @patch("app.services.list_service.task_repo")
    def test_cannot_rename_inbox(self, mock_task_repo, mock_list_repo):
        mock_list_repo.get_list.return_value = {"id": "inbox-1", "isInbox": True}

        with pytest.raises(GraphQLError, match="Cannot rename the Inbox"):
            list_service.update_list("user-1", "inbox-1", {"name": "New Name"})
