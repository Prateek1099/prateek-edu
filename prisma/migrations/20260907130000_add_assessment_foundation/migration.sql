-- Keep the complete A0 DDL atomic, including custom constraints and triggers.
-- Prisma's failed-migration record may still need explicit resolve after rollback.
BEGIN;

-- CreateEnum
CREATE TYPE "AssessmentAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'NEEDS_REVIEW', 'GRADED', 'RELEASED');

-- CreateEnum
CREATE TYPE "AssessmentAudience" AS ENUM ('CLASS', 'SELECTED_STUDENTS');

-- CreateEnum
CREATE TYPE "AssessmentResponseState" AS ENUM ('UNANSWERED', 'ANSWERED');

-- CreateEnum
CREATE TYPE "AssessmentEventType" AS ENUM ('ASSIGNED', 'CANCELLED', 'RECIPIENT_REVOKED', 'ATTEMPT_STARTED', 'ATTEMPT_SUBMITTED', 'GRADE_CHANGED', 'RESULT_RELEASED');

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "source_saved_paper_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_versions" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "header" JSONB NOT NULL,
    "total_marks" INTEGER NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "assessment_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_sections" (
    "id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "assessment_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_questions" (
    "id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "source_question_id" TEXT NOT NULL,
    "original_bank_question_id" TEXT,
    "topic_id_snapshot" TEXT,
    "topic_name" TEXT,
    "question_number" INTEGER NOT NULL,
    "question_type" "BankQuestionType" NOT NULL,
    "question_text" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "marks" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL,
    "correct_answer" TEXT,
    "model_answer" TEXT,
    "explanation" TEXT,

    CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_assignments" (
    "id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "assigned_by_id" TEXT NOT NULL,
    "audience" "AssessmentAudience" NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    "opens_at" TIMESTAMP(3) NOT NULL,
    "closes_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "attempt_limit" INTEGER NOT NULL DEFAULT 1,
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "assessment_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_recipients" (
    "id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "assessment_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_attempts" (
    "id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "status" "AssessmentAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "graded_at" TIMESTAMP(3),
    "released_at" TIMESTAMP(3),
    "awarded_marks" DECIMAL(12,2),

    CONSTRAINT "assessment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_responses" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "state" "AssessmentResponseState" NOT NULL DEFAULT 'UNANSWERED',
    "value" JSONB,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "saved_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_events" (
    "id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "attempt_id" TEXT,
    "actor_id" TEXT NOT NULL,
    "type" "AssessmentEventType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "assessment_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assessments_workspace_id_archived_at_created_at_idx" ON "assessments"("workspace_id", "archived_at", "created_at");

-- CreateIndex
CREATE INDEX "assessments_created_by_id_idx" ON "assessments"("created_by_id");

-- CreateIndex
CREATE INDEX "assessments_subject_id_idx" ON "assessments"("subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_versions_assessment_id_version_number_key" ON "assessment_versions"("assessment_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_sections_version_id_sort_order_key" ON "assessment_sections"("version_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_sections_id_version_id_key" ON "assessment_sections"("id", "version_id");

-- CreateIndex
CREATE INDEX "assessment_questions_section_id_idx" ON "assessment_questions"("section_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_questions_version_id_question_number_key" ON "assessment_questions"("version_id", "question_number");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_questions_id_version_id_key" ON "assessment_questions"("id", "version_id");

-- CreateIndex
CREATE INDEX "assessment_assignments_class_id_cancelled_at_opens_at_idx" ON "assessment_assignments"("class_id", "cancelled_at", "opens_at");

-- CreateIndex
CREATE INDEX "assessment_assignments_version_id_idx" ON "assessment_assignments"("version_id");

-- CreateIndex
CREATE INDEX "assessment_assignments_assigned_by_id_idx" ON "assessment_assignments"("assigned_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_assignments_id_version_id_key" ON "assessment_assignments"("id", "version_id");

-- CreateIndex
CREATE INDEX "assessment_recipients_student_id_revoked_at_idx" ON "assessment_recipients"("student_id", "revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_recipients_assignment_id_student_id_key" ON "assessment_recipients"("assignment_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_recipients_id_assignment_id_key" ON "assessment_recipients"("id", "assignment_id");

-- CreateIndex
CREATE INDEX "assessment_attempts_assignment_id_status_idx" ON "assessment_attempts"("assignment_id", "status");

-- CreateIndex
CREATE INDEX "assessment_attempts_version_id_idx" ON "assessment_attempts"("version_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_attempts_recipient_id_attempt_number_key" ON "assessment_attempts"("recipient_id", "attempt_number");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_attempts_id_version_id_key" ON "assessment_attempts"("id", "version_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_attempts_id_assignment_id_key" ON "assessment_attempts"("id", "assignment_id");

-- CreateIndex
CREATE INDEX "assessment_responses_question_id_idx" ON "assessment_responses"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_responses_attempt_id_question_id_key" ON "assessment_responses"("attempt_id", "question_id");

-- CreateIndex
CREATE INDEX "assessment_events_assignment_id_created_at_idx" ON "assessment_events"("assignment_id", "created_at");

-- CreateIndex
CREATE INDEX "assessment_events_attempt_id_created_at_idx" ON "assessment_events"("attempt_id", "created_at");

-- CreateIndex
CREATE INDEX "assessment_events_actor_id_idx" ON "assessment_events"("actor_id");

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_versions" ADD CONSTRAINT "assessment_versions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_sections" ADD CONSTRAINT "assessment_sections_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "assessment_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "assessment_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "assessment_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_assignments" ADD CONSTRAINT "assessment_assignments_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "assessment_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_assignments" ADD CONSTRAINT "assessment_assignments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_assignments" ADD CONSTRAINT "assessment_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_recipients" ADD CONSTRAINT "assessment_recipients_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assessment_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_recipients" ADD CONSTRAINT "assessment_recipients_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "assessment_recipients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assessment_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "assessment_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "assessment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "assessment_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_events" ADD CONSTRAINT "assessment_events_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assessment_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_events" ADD CONSTRAINT "assessment_events_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "assessment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_events" ADD CONSTRAINT "assessment_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Cross-row identity constraints supplement the Prisma relations: an attempt and
-- every response must reference the SAME assignment, recipient and version.
ALTER TABLE assessment_questions ADD CONSTRAINT assessment_question_section_version_fk
 FOREIGN KEY (section_id, version_id) REFERENCES assessment_sections(id, version_id) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE assessment_attempts ADD CONSTRAINT assessment_attempt_recipient_assignment_fk
 FOREIGN KEY (recipient_id, assignment_id) REFERENCES assessment_recipients(id, assignment_id) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE assessment_attempts ADD CONSTRAINT assessment_attempt_assignment_version_fk
 FOREIGN KEY (assignment_id, version_id) REFERENCES assessment_assignments(id, version_id) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE assessment_responses ADD CONSTRAINT assessment_response_attempt_version_fk
 FOREIGN KEY (attempt_id, version_id) REFERENCES assessment_attempts(id, version_id) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE assessment_responses ADD CONSTRAINT assessment_response_question_version_fk
 FOREIGN KEY (question_id, version_id) REFERENCES assessment_questions(id, version_id) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE assessment_events ADD CONSTRAINT assessment_event_attempt_assignment_fk
 FOREIGN KEY (attempt_id, assignment_id) REFERENCES assessment_attempts(id, assignment_id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE UNIQUE INDEX assessment_one_open_attempt ON assessment_attempts(recipient_id) WHERE status = 'IN_PROGRESS';

ALTER TABLE assessment_versions ADD CHECK (version_number > 0 AND total_marks > 0 AND duration_minutes BETWEEN 1 AND 300);
ALTER TABLE assessment_sections ADD CHECK (sort_order >= 0);
ALTER TABLE assessment_questions ADD CHECK (question_number > 0 AND marks BETWEEN 1 AND 1000);
ALTER TABLE assessment_assignments ADD CHECK (closes_at > opens_at AND duration_minutes BETWEEN 1 AND 300 AND attempt_limit BETWEEN 1 AND 10);
ALTER TABLE assessment_attempts ADD CHECK (attempt_number > 0 AND expires_at > started_at);
ALTER TABLE assessment_attempts ADD CHECK (
 (status = 'IN_PROGRESS' AND submitted_at IS NULL AND graded_at IS NULL AND released_at IS NULL AND awarded_marks IS NULL)
 OR (status IN ('SUBMITTED', 'NEEDS_REVIEW') AND submitted_at IS NOT NULL AND graded_at IS NULL AND released_at IS NULL AND awarded_marks IS NULL)
 OR (status = 'GRADED' AND submitted_at IS NOT NULL AND graded_at IS NOT NULL AND awarded_marks >= 0 AND released_at IS NULL)
 OR (status = 'RELEASED' AND submitted_at IS NOT NULL AND graded_at IS NOT NULL AND awarded_marks >= 0 AND released_at IS NOT NULL)
);
ALTER TABLE assessment_responses ADD CHECK (revision >= 0 AND
 ((state = 'UNANSWERED' AND (value IS NULL OR value = 'null'::jsonb)) OR
  (state = 'ANSWERED' AND value IS NOT NULL AND value <> 'null'::jsonb)));

-- Publication seals the complete version, including insertion/removal of children.
CREATE FUNCTION assessment_owner_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (to_jsonb(NEW) - 'archived_at') IS DISTINCT FROM (to_jsonb(OLD) - 'archived_at')
 THEN RAISE EXCEPTION 'Assessment ownership and provenance are immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER assessment_owner_immutable BEFORE UPDATE ON assessments
 FOR EACH ROW EXECUTE FUNCTION assessment_owner_immutable();

CREATE FUNCTION assessment_seal_version() RETURNS trigger LANGUAGE plpgsql AS $$
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
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER assessment_seal_version BEFORE INSERT OR UPDATE OR DELETE ON assessment_versions
 FOR EACH ROW EXECUTE FUNCTION assessment_seal_version();

CREATE FUNCTION assessment_seal_child() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE version_key text;
BEGIN
 version_key := CASE WHEN TG_OP = 'DELETE' THEN OLD.version_id ELSE NEW.version_id END;
 PERFORM 1 FROM assessment_versions WHERE id = version_key FOR UPDATE;
 IF EXISTS (SELECT 1 FROM assessment_versions WHERE id = version_key AND published_at IS NOT NULL)
 THEN RAISE EXCEPTION 'Published assessment questions/sections are immutable'; END IF;
 IF TG_OP = 'UPDATE' AND NEW.version_id <> OLD.version_id THEN RAISE EXCEPTION 'Cannot move snapshot rows'; END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER assessment_seal_section BEFORE INSERT OR UPDATE OR DELETE ON assessment_sections
 FOR EACH ROW EXECUTE FUNCTION assessment_seal_child();
CREATE TRIGGER assessment_seal_question BEFORE INSERT OR UPDATE OR DELETE ON assessment_questions
 FOR EACH ROW EXECUTE FUNCTION assessment_seal_child();

CREATE FUNCTION assessment_assignment_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'UPDATE' THEN
   IF (to_jsonb(NEW) - 'cancelled_at') IS DISTINCT FROM (to_jsonb(OLD) - 'cancelled_at')
     OR (OLD.cancelled_at IS NOT NULL AND NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at)
   THEN RAISE EXCEPTION 'Assigned assessment policy is immutable; create another assignment'; END IF;
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM assessment_versions v JOIN assessments a ON a.id = v.assessment_id
   JOIN classes c ON c.id = NEW.class_id
   WHERE v.id = NEW.version_id AND v.published_at IS NOT NULL
     AND c.workspace_id = a.workspace_id AND c.subject_id = a.subject_id)
 THEN RAISE EXCEPTION 'Assessment class/version scope mismatch'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER assessment_assignment_guard BEFORE INSERT OR UPDATE ON assessment_assignments
 FOR EACH ROW EXECUTE FUNCTION assessment_assignment_guard();

CREATE FUNCTION assessment_recipient_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (to_jsonb(NEW) - 'revoked_at') IS DISTINCT FROM (to_jsonb(OLD) - 'revoked_at')
   OR (OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at)
 THEN RAISE EXCEPTION 'Recipient identity is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER assessment_recipient_guard BEFORE UPDATE ON assessment_recipients
 FOR EACH ROW EXECUTE FUNCTION assessment_recipient_guard();

CREATE FUNCTION assessment_attempt_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE policy assessment_assignments;
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
 -- A0 cannot grade/release, even via an accidental generic update. Phase A must
 -- deliberately add complete objective grading and reviewed transitions.
 IF OLD.status <> 'IN_PROGRESS' OR NEW.status <> 'SUBMITTED' OR NEW.submitted_at IS NULL
 THEN RAISE EXCEPTION 'Unsupported A0 attempt transition'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER assessment_attempt_guard BEFORE INSERT OR UPDATE ON assessment_attempts
 FOR EACH ROW EXECUTE FUNCTION assessment_attempt_guard();

CREATE FUNCTION assessment_response_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a assessment_attempts; q assessment_questions; response_key text;
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
   ELSE
     IF NEW.value->>'kind' IS DISTINCT FROM 'text' OR jsonb_typeof(NEW.value->'value') IS DISTINCT FROM 'string'
       OR length(NEW.value->>'value') > 20000 OR length(btrim(NEW.value->>'value')) = 0
     THEN RAISE EXCEPTION 'Invalid text response'; END IF;
   END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER assessment_response_guard BEFORE INSERT OR UPDATE OR DELETE ON assessment_responses
 FOR EACH ROW EXECUTE FUNCTION assessment_response_guard();

CREATE FUNCTION assessment_event_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Assessment events are append-only'; END $$;
CREATE TRIGGER assessment_event_immutable BEFORE UPDATE OR DELETE ON assessment_events
 FOR EACH ROW EXECUTE FUNCTION assessment_event_immutable();

COMMIT;
