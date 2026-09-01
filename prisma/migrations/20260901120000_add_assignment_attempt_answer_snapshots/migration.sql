-- Assignment Attempt Answer Review Phase 1 stores immutable MCQ answer details
-- for new attempts. Existing attempts remain valid without snapshot rows.
CREATE TABLE "assignment_attempt_answer_snapshots" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "question_type" TEXT NOT NULL DEFAULT 'MCQ',
    "question_text" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "selected_option_key" TEXT NOT NULL,
    "selected_option_text" TEXT NOT NULL,
    "correct_option_key" TEXT NOT NULL,
    "correct_option_text" TEXT NOT NULL,
    "explanation" TEXT,
    "topic_id" TEXT,
    "subject_id" TEXT,
    "topic_label" TEXT,
    "difficulty" TEXT,
    "is_correct" BOOLEAN NOT NULL,
    "marks_awarded" INTEGER NOT NULL DEFAULT 0,
    "max_marks" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignment_attempt_answer_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "assignment_attempt_answer_snapshots_attempt_id_question_id_key"
ON "assignment_attempt_answer_snapshots"("attempt_id", "question_id");

CREATE INDEX "assignment_attempt_answer_snapshots_attempt_id_idx"
ON "assignment_attempt_answer_snapshots"("attempt_id");

CREATE INDEX "assignment_attempt_answer_snapshots_student_id_created_at_idx"
ON "assignment_attempt_answer_snapshots"("student_id", "created_at");

CREATE INDEX "assignment_attempt_answer_snapshots_student_id_question_id_is_correct_idx"
ON "assignment_attempt_answer_snapshots"("student_id", "question_id", "is_correct");

ALTER TABLE "assignment_attempt_answer_snapshots"
ADD CONSTRAINT "assignment_attempt_answer_snapshots_attempt_id_fkey"
FOREIGN KEY ("attempt_id") REFERENCES "challenge_attempts"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assignment_attempt_answer_snapshots"
ADD CONSTRAINT "assignment_attempt_answer_snapshots_student_id_fkey"
FOREIGN KEY ("student_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
