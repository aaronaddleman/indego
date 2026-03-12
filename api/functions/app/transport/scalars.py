"""Custom GraphQL scalar types for DateTime and Date."""

from datetime import datetime, date, timezone

from ariadne import ScalarType

datetime_scalar = ScalarType("DateTime")
date_scalar = ScalarType("Date")


@datetime_scalar.serializer
def serialize_datetime(value):
    """Serialize a datetime to ISO 8601 UTC string."""
    if isinstance(value, str):
        return value
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    return str(value)


@datetime_scalar.value_parser
def parse_datetime_value(value):
    """Parse an ISO 8601 string to a datetime."""
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(value)


@date_scalar.serializer
def serialize_date(value):
    """Serialize a date to YYYY-MM-DD string."""
    if isinstance(value, str):
        return value
    if isinstance(value, (date, datetime)):
        return value.isoformat()[:10]
    return str(value)


@date_scalar.value_parser
def parse_date_value(value):
    """Parse a YYYY-MM-DD string to a date."""
    if isinstance(value, date):
        return value
    return date.fromisoformat(value)
