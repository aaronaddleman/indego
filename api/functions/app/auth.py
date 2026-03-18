"""Firebase Auth middleware for GraphQL requests."""

from firebase_admin import auth
from ariadne import format_error
from graphql import GraphQLError
from app.repositories.allowlist_repo import is_email_allowed, is_email_admin


class AuthError(GraphQLError):
    """Authentication error with UNAUTHENTICATED extension code."""

    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            message,
            extensions={"code": "UNAUTHENTICATED"},
        )


def _verify_token(request):
    """Verify Firebase ID token and return decoded token."""
    auth_header = request.headers.get("Authorization", "")

    if not auth_header.startswith("Bearer "):
        raise AuthError("Missing or malformed Authorization header")

    token = auth_header[7:]  # Strip "Bearer "

    try:
        return auth.verify_id_token(token)
    except Exception:
        raise AuthError("Invalid or expired token")


def get_context_value(request):
    """Build the GraphQL context from the incoming request.

    Verifies the token, checks the email allowlist, and injects
    user_id and email into context for use by resolvers.
    """
    try:
        decoded_token = _verify_token(request)
        user_id = decoded_token["uid"]
        email = decoded_token.get("email", "").lower()
    except AuthError:
        return {"request": request, "user_id": None, "email": None}

    # Allowlist check — fail closed
    if not email or not is_email_allowed(email):
        return {"request": request, "user_id": None, "email": None}

    return {"request": request, "user_id": user_id, "email": email}


def require_auth(context: dict) -> str:
    """Require authentication in a resolver. Returns user_id or raises AuthError."""
    user_id = context.get("user_id")
    if not user_id:
        raise AuthError()
    return user_id


def require_admin(context: dict) -> str:
    """Require admin privileges in a resolver. Returns user_id or raises AuthError."""
    user_id = require_auth(context)
    email = context.get("email")
    if not email or not is_email_admin(email):
        raise AuthError()
    return user_id
