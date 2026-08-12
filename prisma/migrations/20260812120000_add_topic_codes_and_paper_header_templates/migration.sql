-- Optional, subject-scoped codes for human-friendly Question Bank imports.
ALTER TABLE "topics" ADD COLUMN "import_code" TEXT;

CREATE UNIQUE INDEX "topics_subject_id_import_code_key"
ON "topics"("subject_id", "import_code");

-- Reusable admin header defaults. Generated papers remain browser-session only.
CREATE TABLE "paper_header_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "institution_name" TEXT NOT NULL,
    "exam_label" TEXT NOT NULL,
    "course_line" TEXT NOT NULL,
    "default_duration" INTEGER NOT NULL DEFAULT 30,
    "default_instructions" TEXT NOT NULL DEFAULT 'Attempt all questions.',
    "show_student_name" BOOLEAN NOT NULL DEFAULT true,
    "show_roll_number" BOOLEAN NOT NULL DEFAULT true,
    "default_class_line" TEXT,
    "default_topic_line" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paper_header_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "paper_header_templates_name_key"
ON "paper_header_templates"("name");

CREATE INDEX "paper_header_templates_created_by_id_idx"
ON "paper_header_templates"("created_by_id");

ALTER TABLE "paper_header_templates"
ADD CONSTRAINT "paper_header_templates_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
