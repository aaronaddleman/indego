"""Indago Habits API application factory."""

from pathlib import Path

from ariadne import (
    load_schema_from_path,
    make_executable_schema,
    graphql_sync,
)

from app.transport.scalars import datetime_scalar, date_scalar
from app.transport.resolvers import query, mutation, habit_type


def create_schema():
    """Create the executable GraphQL schema."""
    schema_path = Path(__file__).parent.parent / "schema.graphql"
    type_defs = load_schema_from_path(str(schema_path))

    return make_executable_schema(
        type_defs,
        query,
        mutation,
        habit_type,
        datetime_scalar,
        date_scalar,
    )
