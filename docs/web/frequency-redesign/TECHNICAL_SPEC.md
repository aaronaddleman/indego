# Technical Spec — Frequency Redesign

## 1. Summary

Redesign habit frequency types: merge WEEKLY and CUSTOM into a single WEEKLY type with specific days. Add computed `dueDays` field for client filtering. CUSTOM kept as deprecated alias. Frequency logic centralized for reuse by future Tasks feature.

## 2. Goals & Non-Goals

### Goals
- WEEKLY requires `daysOfWeek` (at least 1 day selected)
- CUSTOM deprecated, resolves identically to WEEKLY
- Computed `dueDays` field on Frequency type
- Centralized `frequency_service.py` for validation and due-day computation
- Client `isDueOnDate()` utility for filtering
- Migration UX: prompt user to update old WEEKLY habits (no forced migration)
- Minimum 1 day validation, default to client's current day

### Non-Goals
- MONTHLY, INTERVAL, or other future frequency types (tracked separately)
- Task implementation (tracked in #28)
- Forced data migration of existing habits
- Removing CUSTOM enum value (tracked in #37)

## 3. Schema Changes

### Before
```graphql
enum FrequencyType {
  DAILY
  WEEKLY
  CUSTOM
}

input FrequencyInput {
  type: FrequencyType!
  daysPerWeek: Int
  specificDays: [String!]
}

type Frequency {
  type: FrequencyType!
  daysPerWeek: Int
  specificDays: [String!]
}
```

### After
```graphql
enum FrequencyType {
  DAILY
  WEEKLY
  CUSTOM    # deprecated — alias for WEEKLY
}

input FrequencyInput {
  type: FrequencyType!
  daysOfWeek: [String!]      # required for WEEKLY/CUSTOM, ignored for DAILY
  daysPerWeek: Int           # deprecated — kept for backwards compat
  specificDays: [String!]    # deprecated — kept for backwards compat
}

type Frequency {
  type: FrequencyType!
  daysOfWeek: [String!]      # resolved days for WEEKLY/CUSTOM
  dueDays: [String!]!        # computed: all 7 for DAILY, selected days for WEEKLY
  daysPerWeek: Int           # deprecated
  specificDays: [String!]    # deprecated
}
```

### Key Behaviors

**`dueDays` computation:**
- DAILY → `["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]`
- WEEKLY → value of `daysOfWeek` (e.g., `["monday","wednesday","saturday"]`)
- CUSTOM → same as WEEKLY (uses `specificDays` as source if `daysOfWeek` not set)

**Backwards compatibility:**
- Old WEEKLY habits with `daysPerWeek` but no `daysOfWeek` → `dueDays` returns all 7 days (treated as daily until user updates)
- Old CUSTOM habits with `specificDays` → `dueDays` returns `specificDays` values
- New WEEKLY habits must provide `daysOfWeek`

## 4. API Implementation

### frequency_service.py (new — centralized)

```python
# app/services/frequency_service.py

VALID_DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]

def validate_frequency(freq: dict) -> dict:
    """Validate and normalize frequency input."""
    freq_type = freq["type"]

    if freq_type == "DAILY":
        return {"type": "DAILY"}

    if freq_type in ("WEEKLY", "CUSTOM"):
        # New model: daysOfWeek
        days = freq.get("daysOfWeek")

        # Backwards compat: fall back to specificDays
        if not days:
            days = freq.get("specificDays")

        if not days or len(days) == 0:
            raise ValidationError("At least one day must be selected")

        normalized = [d.lower() for d in days]
        for d in normalized:
            if d not in VALID_DAYS:
                raise ValidationError(f"Invalid day: {d}")

        return {
            "type": "WEEKLY",  # normalize CUSTOM → WEEKLY
            "daysOfWeek": normalized,
        }

    raise ValidationError(f"Unknown frequency type: {freq_type}")


def compute_due_days(frequency: dict) -> list[str]:
    """Compute which days of the week a habit is due."""
    freq_type = frequency.get("type", "DAILY")

    if freq_type == "DAILY":
        return VALID_DAYS

    # WEEKLY or CUSTOM
    days = frequency.get("daysOfWeek")
    if days:
        return days

    # Legacy fallback: specificDays
    days = frequency.get("specificDays")
    if days:
        return days

    # Legacy WEEKLY with daysPerWeek but no specific days
    return VALID_DAYS  # treat as daily until user updates
```

### Resolver: Frequency.dueDays

```python
# In resolvers/__init__.py
frequency_type = ObjectType("Frequency")

@frequency_type.field("dueDays")
def resolve_due_days(frequency, info):
    return compute_due_days(frequency)
```

### Update habit_service.py

Replace inline `_validate_frequency` with call to `frequency_service.validate_frequency`.

## 5. Web Client Implementation

### isDueOnDate utility

```typescript
// src/utils/frequency.ts

const ALL_DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

export function isDueOnDay(
  frequency: { type: string; dueDays: string[] },
  dayName: string
): boolean {
  return frequency.dueDays.includes(dayName.toLowerCase());
}

export function getDayName(date: Date): string {
  return format(date, 'EEEE').toLowerCase();
}
```

### Update GraphQL queries

Add `dueDays` to the Habit fragment:

```graphql
fragment HabitFields on Habit {
  id
  name
  frequency { type daysOfWeek dueDays daysPerWeek specificDays }
  # ...rest
}
```

### Update HabitForm

- Replace frequency type selector: DAILY / WEEKLY (remove CUSTOM option for new habits)
- WEEKLY shows day-of-week picker (Mon-Sun buttons)
- Minimum 1 day required — can't deselect the last day
- Default: client's current day selected
- Existing CUSTOM habits rendered the same as WEEKLY in the form

### Migration Prompt

For habits with old WEEKLY model (daysPerWeek but no daysOfWeek):
- Show a banner/card on the habit detail page: "Update your schedule — pick which days you do this habit"
- Tapping opens the edit form with the day picker
- Non-blocking: habit still works, just shows on all days until updated

## 6. Streak Calculation Updates

### streakCalc.ts changes

- Remove separate CUSTOM handler
- WEEKLY with `daysOfWeek` uses the same logic as current CUSTOM (consecutive scheduled days)
- Legacy WEEKLY with `daysPerWeek` keeps current behavior (consecutive weeks meeting target)
- Use `frequency.dueDays` or `frequency.daysOfWeek` as the source

```typescript
export function computeStreaks(completions, frequency, today): StreakResult {
  if (frequency.type === 'DAILY') return computeDailyStreaks(...);

  // WEEKLY and CUSTOM both use daysOfWeek logic
  const days = frequency.daysOfWeek || frequency.specificDays;
  if (days && days.length > 0) {
    return computeScheduledDayStreaks(completions, days, today);
  }

  // Legacy WEEKLY with daysPerWeek — keep old behavior
  if (frequency.daysPerWeek) {
    return computeWeeklyTargetStreaks(completions, frequency.daysPerWeek, today);
  }

  // Fallback
  return computeDailyStreaks(completions, today);
}
```

## 7. Files Changed / Created

| Action | File |
|--------|------|
| **Modify** | `api/functions/schema.graphql` |
| **Create** | `api/functions/app/services/frequency_service.py` |
| **Modify** | `api/functions/app/services/habit_service.py` (use frequency_service) |
| **Modify** | `api/functions/app/transport/resolvers/__init__.py` (add Frequency resolver) |
| **Create** | `web/src/utils/frequency.ts` |
| **Modify** | `web/src/graphql/queries.ts` (add dueDays to fragment) |
| **Modify** | `web/src/graphql/mutations.ts` (add dueDays to fragment) |
| **Modify** | `web/src/components/habits/HabitForm.tsx` (day picker for WEEKLY) |
| **Modify** | `web/src/hooks/streakCalc.ts` (merge WEEKLY/CUSTOM logic) |
| **Create** | `web/src/utils/frequency.test.ts` (unit tests) |
| **Modify** | `web/src/hooks/streakCalc.test.ts` (update for new model) |

## 8. Testing

### API Tests
- Validate WEEKLY with daysOfWeek
- Validate CUSTOM treated as WEEKLY
- Validate minimum 1 day
- Validate day name normalization
- dueDays computed correctly for DAILY, WEEKLY, legacy CUSTOM, legacy WEEKLY

### Web Tests
- isDueOnDay returns correct results
- HabitForm day picker: select/deselect, minimum 1
- Streak calc with new WEEKLY model
- Streak calc with legacy WEEKLY/CUSTOM models (backwards compat)

## 9. Deployment Plan

1. API deploys with new schema (backwards compatible — new fields are additive)
2. Web deploys with updated form and queries
3. Existing habits continue working with legacy fields
4. Users update habits at their own pace
5. No forced migration

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-19 | Documentation | Initial draft |
