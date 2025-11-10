# ✅ Foreign Key Constraint Fixed - health_metrics Trigger

## Error Message
```
insert or update on table "health_metrics" violates foreign key constraint
"health_metrics_family_member_id_fkey"
```

---

## Problem

The `populate_health_metrics_from_test_results()` trigger was causing parsing to fail with a foreign key constraint violation.

### Root Cause

**Data model mismatch**:
- Trigger tried to set: `family_member_id = lr.patient_id`
- But `patient_id` references → `patients` table
- While `family_member_id` must reference → `family_members` table
- These are **different tables** with incompatible IDs

### Foreign Key Constraint
```sql
health_metrics_family_member_id_fkey
FOREIGN KEY (family_member_id) REFERENCES family_members(id)
```

The database rejected the insert because `patient_id` wasn't a valid `family_members.id`.

---

## Solution

Updated the trigger to set `family_member_id = NULL` (which is allowed):

```sql
CREATE OR REPLACE FUNCTION populate_health_metrics_from_test_results()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.observed_value ~ '^[0-9]+\.?[0-9]*$' THEN
    INSERT INTO health_metrics (
      session_id,
      user_id,
      family_member_id,  -- ✅ Now NULL
      metric_type,
      metric_value,
      metric_unit,
      recorded_date,
      notes,
      created_at
    )
    SELECT
      lr.session_id,
      NEW.user_id,
      NULL,  -- ✅ FIXED: NULL instead of patient_id
      NEW.test_name,
      NEW.observed_value,
      NEW.unit,
      COALESCE(lr.report_date, CURRENT_DATE),
      CASE
        WHEN NEW.is_flagged THEN 'Abnormal: ' || NEW.status
        ELSE 'Normal range'
      END,
      NOW()
    FROM lab_reports lr
    WHERE lr.id = NEW.lab_report_id
    ON CONFLICT DO NOTHING;

    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Why NULL is Correct

- `family_member_id` is nullable by design
- Individual test results don't require family linkage
- `user_id` already tracks ownership
- Can be enhanced later if family linking is needed

---

## Migration Applied

**File**: `fix_health_metrics_trigger`
**Status**: ✅ Deployed
**Build**: ✅ Passed (7.55s)

---

## Testing

Upload medical reports and verify:

1. ✅ Documents parse successfully
2. ✅ `health_metrics` records created with `family_member_id = NULL`
3. ✅ No foreign key constraint errors
4. ✅ Console shows: `[Auto-Population] Created health_metric for test: X`

**Check Database**:
```sql
SELECT
  metric_type,
  metric_value,
  family_member_id
FROM health_metrics
WHERE user_id = 'YOUR_USER_ID'
LIMIT 10;
```

All records should have `family_member_id = NULL`.

---

**Status**: ✅ Fixed and Deployed
**Date**: November 10, 2025
**Impact**: No data loss, backward compatible
