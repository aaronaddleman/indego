"""Firebase Auth middleware for GraphQL requests."""

from firebase_admin import auth
from ariadne import format_error
from graphql import GraphQLError


class AuthError(GraphQLError):
    """Authentication error with UNAUTHENTICATED extension code."""

    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            message,
            extensions={"code": "UNAUTHENTICATED"},
        )


def get_user_id_from_request(request) -> str:
    """Extract and verify Firebase ID token from the Authorization header.

    Returns the user's UID on success, raises AuthError on failure.
    """
    auth_header = request.headers.get("Authorization", "")

    if not auth_header.startswith("Bearer "):
        raise AuthError("Missing or malformed Authorization header")

    token = auth_header[7:]  # Strip "Bearer "

    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token["uid"]
    except Exception:
        raise AuthError("Invalid or expired token")


def get_context_value(request):
    """Build the GraphQL context from the incoming request.

    Injects user_id into context for use by resolvers.
    """
    try:
        user_id = get_user_id_from_request(request)
    except AuthError:
        # Allow the request through — resolvers that need auth will check context
        user_id = None

    return {"request": request, "user_id": user_id}


def require_auth(context: dict) -> str:
    """Require authentication in a resolver. Returns user_id or raises AuthError."""
    user_id = context.get("user_id")
    if not user_id:
        raise AuthError()
    return user_id
