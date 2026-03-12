"""Business logic for User operations."""

from graphql import GraphQLError

from app.repositories import user_repo


class NotFoundError(GraphQLError):
    def __init__(self, message: str):
        super().__init__(message, extensions={"code": "NOT_FOUND"})


def get_me(user_id: str) -> dict:
    """Get the current user's profile. Raises NOT_FOUND if user doesn't exist."""
    user = user_repo.get_user(user_id)
    if not user:
        raise NotFoundError("User not found")
    return user


def upsert_user(user_id: str, display_name: str, email: str) -> dict:
    """Create or update user profile."""
    return user_repo.upsert_user(user_id, display_name, email)
