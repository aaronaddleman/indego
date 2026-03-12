"""Business logic for Stats computation."""

from datetime import date

from app.repositories import habit_repo


def _count_expected_completions(frequency: dict, start_date: date, end_date: date) -> int:
    """Calculate expected completions for a habit over a date range."""
    total_days = (end_date - start_date).days + 1
    freq_type = frequency.get("type", "DAILY")

    if freq_type == "DAILY":
        return total_days
    elif freq_type == "WEEKLY":
        days_per_week = frequency.get("daysPerWeek") or 7
        full_weeks = total_days // 7
        remainder = total_days % 7
        return full_weeks * days_per_week + min(remainder, days_per_week)
    elif freq_type == "CUSTOM":
        specific_days = frequency.get("specificDays") or []
        day_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        target_weekdays = {day_names.index(d.lower()) for d in specific_days if d.lower() in day_names}
        count = 0
        current = start_date
        from datetime import timedelta
        while current <= end_date:
            if current.weekday() in target_weekdays:
                count += 1
            current += timedelta(days=1)
        return count

    return total_days


def _completions_in_range(completions: dict, start_date: date, end_date: date) -> int:
    """Count completions within a date range."""
    count = 0
    for date_str in completions:
        try:
            d = date.fromisoformat(date_str)
            if start_date <= d <= end_date:
                count += 1
        except ValueError:
            continue
    return count


def get_stats(user_id: str, start_date: date, end_date: date) -> dict:
    """Compute stats for all habits within a date range."""
    habits = habit_repo.list_habits(user_id)

    total_completions = 0
    habit_stats = []

    for habit in habits:
        completions = habit.get("completions", {})
        habit_completions = _completions_in_range(completions, start_date, end_date)
        total_completions += habit_completions

        expected = _count_expected_completions(habit.get("frequency", {}), start_date, end_date)
        rate = habit_completions / expected if expected > 0 else 0.0

        habit_stats.append({
            "habitId": habit["id"],
            "habitName": habit.get("name", ""),
            "totalCompletions": habit_completions,
            "longestStreak": habit.get("longestStreak", 0),
            "completionRate": round(rate, 4),
        })

    return {
        "totalHabits": len(habits),
        "totalCompletions": total_completions,
        "habitStats": habit_stats,
    }
