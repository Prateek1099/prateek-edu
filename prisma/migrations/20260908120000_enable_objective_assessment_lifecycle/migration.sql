-- Phase A lifecycle gate only. The attempt table, enum and check constraint
-- already model these states; replace the A0 trigger without changing schema.
BEGIN;

CREATE OR REPLACE FUNCTION assessment_attempt_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  policy assessment_assignments;
  version_total INTEGER;
  lifecycle_clock TIMESTAMP(3);
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO policy FROM assessment_assignments WHERE id = NEW.assignment_id;
    IF NEW.status <> 'IN_PROGRESS' OR NEW.attempt_number > policy.attempt_limit
      OR NEW.started_at < policy.opens_at OR NEW.started_at >= policy.closes_at
      OR NEW.expires_at <> LEAST(NEW.started_at + policy.duration_minutes * interval '1 minute', policy.closes_at)
    THEN RAISE EXCEPTION 'Invalid server attempt policy'; END IF;
    RETURN NEW;
  END IF;

  IF (NEW.id, NEW.recipient_id, NEW.assignment_id, NEW.version_id, NEW.attempt_number, NEW.started_at, NEW.expires_at)
  IS DISTINCT FROM (OLD.id, OLD.recipient_id, OLD.assignment_id, OLD.version_id, OLD.attempt_number, OLD.started_at, OLD.expires_at)
  THEN RAISE EXCEPTION 'Attempt identity and timing are immutable'; END IF;

  -- Read wall-clock server time once per row operation. CURRENT_TIMESTAMP is
  -- transaction-start time and would reject legitimate work in a long transaction.
  -- Assessment timestamps are timestamp-without-time-zone values stored in UTC.
  -- Match their millisecond precision: NEW has already been rounded to timestamp(3).
  -- Comparing it to an unrounded clock could falsely reject server-generated time.
  lifecycle_clock := clock_timestamp() AT TIME ZONE 'UTC';

  SELECT total_marks INTO version_total
  FROM assessment_versions
  WHERE id = NEW.version_id;
  IF version_total IS NULL THEN
    RAISE EXCEPTION 'Assessment version is unavailable';
  END IF;

  IF OLD.status = 'IN_PROGRESS' AND NEW.status = 'SUBMITTED' THEN
    IF NEW.submitted_at IS NULL OR NOT isfinite(NEW.started_at) OR NOT isfinite(NEW.submitted_at)
      OR NEW.submitted_at < NEW.started_at OR NEW.submitted_at > lifecycle_clock
      OR NEW.graded_at IS NOT NULL OR NEW.awarded_marks IS NOT NULL OR NEW.released_at IS NOT NULL
    THEN RAISE EXCEPTION 'Invalid assessment submission transition'; END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'SUBMITTED' AND NEW.status = 'GRADED' THEN
    IF OLD.submitted_at IS NULL OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
      OR NEW.graded_at IS NULL
      OR NOT isfinite(NEW.started_at) OR NOT isfinite(NEW.submitted_at) OR NOT isfinite(NEW.graded_at)
      OR NEW.submitted_at < NEW.started_at OR NEW.graded_at < NEW.submitted_at
      OR NEW.graded_at > lifecycle_clock
      OR NEW.awarded_marks IS NULL OR NEW.awarded_marks < 0 OR NEW.awarded_marks > version_total
      OR NEW.released_at IS NOT NULL
    THEN RAISE EXCEPTION 'Invalid objective grading transition'; END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'GRADED' AND NEW.status = 'RELEASED' THEN
    IF OLD.submitted_at IS NULL OR OLD.graded_at IS NULL OR OLD.awarded_marks IS NULL
      OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
      OR NEW.graded_at IS DISTINCT FROM OLD.graded_at
      OR NEW.awarded_marks IS DISTINCT FROM OLD.awarded_marks
      OR NEW.released_at IS NULL
      OR NOT isfinite(NEW.started_at) OR NOT isfinite(NEW.submitted_at)
      OR NOT isfinite(NEW.graded_at) OR NOT isfinite(NEW.released_at)
      OR NEW.submitted_at < NEW.started_at OR NEW.graded_at < NEW.submitted_at
      OR NEW.released_at < NEW.graded_at OR NEW.released_at > lifecycle_clock
    THEN RAISE EXCEPTION 'Invalid assessment release transition'; END IF;
    RETURN NEW;
  END IF;

  -- Duplicate requests must read the current state and return idempotently in
  -- service code. The database does not weaken lifecycle rules for no-op writes.
  RAISE EXCEPTION 'Unsupported assessment attempt transition';
END $$;

COMMIT;
