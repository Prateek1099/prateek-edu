-- B1-A: additive structured-question foundation. The new enum label is only
-- compared as text in this transaction; no row is assigned that label here.
BEGIN;

ALTER TYPE "BankQuestionType" ADD VALUE 'MATCH_THE_FOLLOWING';

ALTER TABLE bank_questions
  ADD COLUMN structured_content JSONB,
  ADD COLUMN grading_data JSONB;
ALTER TABLE saved_generated_paper_questions
  ADD COLUMN structured_content JSONB,
  ADD COLUMN grading_data JSONB;
ALTER TABLE assessment_questions
  ADD COLUMN structured_content JSONB,
  ADD COLUMN grading_data JSONB;

ALTER TABLE bank_questions ADD CONSTRAINT bank_question_structure_objects CHECK (
  (structured_content IS NULL OR jsonb_typeof(structured_content) = 'object') AND
  (grading_data IS NULL OR jsonb_typeof(grading_data) = 'object') AND
  (question_type::text <> 'MATCH_THE_FOLLOWING' OR
    (structured_content IS NOT NULL AND grading_data IS NOT NULL))
);
ALTER TABLE saved_generated_paper_questions ADD CONSTRAINT saved_paper_question_structure_objects CHECK (
  (structured_content IS NULL OR jsonb_typeof(structured_content) = 'object') AND
  (grading_data IS NULL OR jsonb_typeof(grading_data) = 'object') AND
  (question_type::text <> 'MATCH_THE_FOLLOWING' OR
    (structured_content IS NOT NULL AND grading_data IS NOT NULL))
);
ALTER TABLE assessment_questions ADD CONSTRAINT assessment_question_structure_objects CHECK (
  (structured_content IS NULL OR jsonb_typeof(structured_content) = 'object') AND
  (grading_data IS NULL OR jsonb_typeof(grading_data) = 'object') AND
  (question_type::text <> 'MATCH_THE_FOLLOWING' OR
    (structured_content IS NOT NULL AND grading_data IS NOT NULL))
);

-- Preserve the original publication rules and add only B1 snapshot shape
-- checks. Complete semantic validation remains in the shared TS contracts.
CREATE OR REPLACE FUNCTION assessment_seal_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'INSERT' THEN
   IF NEW.published_at IS NOT NULL THEN RAISE EXCEPTION 'Publish only after inserting all snapshot rows'; END IF;
   RETURN NEW;
 END IF;
 IF OLD.published_at IS NOT NULL THEN RAISE EXCEPTION 'Published assessment versions are immutable'; END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 IF NEW.published_at IS NOT NULL THEN
   IF (SELECT count(*) FROM assessment_questions WHERE version_id = NEW.id) = 0
      OR (SELECT sum(marks) FROM assessment_questions WHERE version_id = NEW.id) <> NEW.total_marks
      OR (SELECT max(question_number) FROM assessment_questions WHERE version_id = NEW.id) <>
         (SELECT count(*) FROM assessment_questions WHERE version_id = NEW.id)
      OR EXISTS (SELECT 1 FROM assessment_sections s WHERE s.version_id = NEW.id AND NOT EXISTS
         (SELECT 1 FROM assessment_questions q WHERE q.section_id = s.id))
   THEN RAISE EXCEPTION 'Incomplete assessment snapshot'; END IF;
   IF EXISTS (
     SELECT 1 FROM assessment_questions q WHERE q.version_id = NEW.id AND (
       (q.question_type::text = 'FILL_BLANK' AND
         (q.grading_data IS NOT NULL OR q.structured_content IS NOT NULL) AND (
         q.grading_data->>'type' IS DISTINCT FROM 'FILL_BLANK' OR
         q.grading_data->>'version' IS DISTINCT FROM '1' OR
         jsonb_typeof(q.grading_data->'acceptedAnswers') IS DISTINCT FROM 'array' OR
         CASE WHEN jsonb_typeof(q.grading_data->'acceptedAnswers') = 'array'
           THEN jsonb_array_length(q.grading_data->'acceptedAnswers') NOT BETWEEN 1 AND 20
           ELSE true END OR
         q.correct_answer IS DISTINCT FROM q.grading_data->'acceptedAnswers'->>0
       )) OR
       (q.question_type::text = 'MATCH_THE_FOLLOWING' AND (
         q.structured_content->>'type' IS DISTINCT FROM 'MATCH_THE_FOLLOWING' OR
         q.structured_content->>'version' IS DISTINCT FROM '1' OR
         jsonb_typeof(q.structured_content->'leftItems') IS DISTINCT FROM 'array' OR
         jsonb_typeof(q.structured_content->'rightItems') IS DISTINCT FROM 'array' OR
         jsonb_typeof(q.structured_content->'rightDisplayOrder') IS DISTINCT FROM 'array' OR
         q.grading_data->>'type' IS DISTINCT FROM 'MATCH_THE_FOLLOWING' OR
         q.grading_data->>'version' IS DISTINCT FROM '1' OR
         q.grading_data->>'scoring' IS DISTINCT FROM 'PER_PAIR_INTEGER' OR
         jsonb_typeof(q.grading_data->'correctPairs') IS DISTINCT FROM 'array' OR
         CASE WHEN jsonb_typeof(q.structured_content->'leftItems') = 'array' AND
                   jsonb_typeof(q.structured_content->'rightItems') = 'array' AND
                   jsonb_typeof(q.structured_content->'rightDisplayOrder') = 'array' AND
                   jsonb_typeof(q.grading_data->'correctPairs') = 'array'
           THEN jsonb_array_length(q.structured_content->'leftItems') NOT BETWEEN 2 AND 12 OR
                jsonb_array_length(q.structured_content->'leftItems') <> jsonb_array_length(q.structured_content->'rightItems') OR
                jsonb_array_length(q.structured_content->'leftItems') <> jsonb_array_length(q.structured_content->'rightDisplayOrder') OR
                jsonb_array_length(q.structured_content->'leftItems') <> jsonb_array_length(q.grading_data->'correctPairs')
           ELSE true END OR
         q.correct_answer IS NOT NULL
       ))
     )
   ) THEN RAISE EXCEPTION 'Incomplete B1 assessment question snapshot'; END IF;
 END IF;
 RETURN NEW;
END $$;

-- Choice and boolean branches are preserved. Match response validation reads
-- ONLY the immutable visible structure, never secret grading_data.
CREATE OR REPLACE FUNCTION assessment_response_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a assessment_attempts; q assessment_questions; response_key text;
        pair jsonb; left_key text; right_key text;
        used_left text[] := ARRAY[]::text[]; used_right text[] := ARRAY[]::text[];
BEGIN
 response_key := CASE WHEN TG_OP = 'DELETE' THEN OLD.attempt_id ELSE NEW.attempt_id END;
 SELECT * INTO a FROM assessment_attempts WHERE id = response_key FOR UPDATE;
 IF a.status <> 'IN_PROGRESS' OR (clock_timestamp() AT TIME ZONE 'UTC') >= a.expires_at THEN RAISE EXCEPTION 'Attempt is locked or expired'; END IF;
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Keep unanswered response evidence'; END IF;
 IF TG_OP = 'UPDATE' AND ((NEW.attempt_id, NEW.question_id, NEW.version_id) IS DISTINCT FROM (OLD.attempt_id, OLD.question_id, OLD.version_id)
   OR NEW.revision <> OLD.revision + 1) THEN RAISE EXCEPTION 'Invalid response revision/identity'; END IF;
 SELECT * INTO q FROM assessment_questions WHERE id = NEW.question_id AND version_id = NEW.version_id;
 IF q.id IS NULL OR a.version_id <> NEW.version_id THEN RAISE EXCEPTION 'Response version mismatch'; END IF;
 IF NEW.state = 'ANSWERED' THEN
   IF q.question_type IN ('MCQ', 'ASSERTION_REASON') THEN
     IF NEW.value->>'kind' IS DISTINCT FROM 'choice' OR (NEW.value->>'value') NOT IN ('A','B','C','D')
       OR jsonb_typeof(NEW.value->'value') IS DISTINCT FROM 'string'
     THEN RAISE EXCEPTION 'Invalid choice response'; END IF;
   ELSIF q.question_type = 'TRUE_FALSE' THEN
     IF NEW.value->>'kind' IS DISTINCT FROM 'boolean' OR jsonb_typeof(NEW.value->'value') IS DISTINCT FROM 'boolean'
     THEN RAISE EXCEPTION 'Invalid boolean response'; END IF;
   ELSIF q.question_type::text = 'MATCH_THE_FOLLOWING' THEN
     IF jsonb_typeof(NEW.value) IS DISTINCT FROM 'object' OR
        NEW.value->>'kind' IS DISTINCT FROM 'matching' OR
        jsonb_typeof(NEW.value->'value') IS DISTINCT FROM 'array' OR
        (SELECT count(*) FROM jsonb_object_keys(NEW.value)) <> 2 OR
        jsonb_array_length(NEW.value->'value') NOT BETWEEN 1 AND 12 OR
        jsonb_typeof(q.structured_content->'leftItems') IS DISTINCT FROM 'array' OR
        jsonb_typeof(q.structured_content->'rightItems') IS DISTINCT FROM 'array'
     THEN RAISE EXCEPTION 'Invalid matching response'; END IF;
     FOR pair IN SELECT value FROM jsonb_array_elements(NEW.value->'value') LOOP
       IF jsonb_typeof(pair) IS DISTINCT FROM 'object' OR
          jsonb_typeof(pair->'leftId') IS DISTINCT FROM 'string' OR
          jsonb_typeof(pair->'rightId') IS DISTINCT FROM 'string' OR
          (SELECT count(*) FROM jsonb_object_keys(pair)) <> 2
       THEN RAISE EXCEPTION 'Invalid matching response'; END IF;
       left_key := pair->>'leftId'; right_key := pair->>'rightId';
       IF left_key = ANY(used_left) OR right_key = ANY(used_right) OR
          NOT EXISTS (SELECT 1 FROM jsonb_array_elements(q.structured_content->'leftItems') item WHERE item->>'id' = left_key) OR
          NOT EXISTS (SELECT 1 FROM jsonb_array_elements(q.structured_content->'rightItems') item WHERE item->>'id' = right_key)
       THEN RAISE EXCEPTION 'Invalid matching response'; END IF;
       used_left := array_append(used_left, left_key);
       used_right := array_append(used_right, right_key);
     END LOOP;
   ELSE
     IF NEW.value->>'kind' IS DISTINCT FROM 'text' OR jsonb_typeof(NEW.value->'value') IS DISTINCT FROM 'string'
       OR length(NEW.value->>'value') > 20000 OR length(btrim(NEW.value->>'value')) = 0
     THEN RAISE EXCEPTION 'Invalid text response'; END IF;
   END IF;
 END IF;
 RETURN NEW;
END $$;

COMMIT;
