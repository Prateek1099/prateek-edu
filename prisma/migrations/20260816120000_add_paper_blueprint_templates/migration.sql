-- Saved Blueprint Templates persist reusable paper patterns only.
-- Generated questions and paper outputs remain browser-session-only.
CREATE TYPE "BlueprintTemplateDifficulty" AS ENUM ('ANY', 'EASY', 'MEDIUM', 'HARD');

CREATE TABLE "paper_blueprint_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "board_id" TEXT NOT NULL,
    "qualification_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "total_marks" INTEGER NOT NULL,
    "include_header_defaults" BOOLEAN NOT NULL DEFAULT false,
    "institution_name" TEXT,
    "exam_label" TEXT,
    "course_line" TEXT,
    "title" TEXT,
    "topic_line" TEXT,
    "duration_minutes" INTEGER,
    "date_text" TEXT,
    "class_text" TEXT,
    "show_student_name" BOOLEAN,
    "show_roll_number" BOOLEAN,
    "instructions" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paper_blueprint_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "paper_blueprint_template_chapters" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "paper_blueprint_template_chapters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "paper_blueprint_template_rows" (
    "id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "section_label" TEXT NOT NULL,
    "question_type" "BankQuestionType" NOT NULL,
    "question_count" INTEGER NOT NULL,
    "marks_per_question" INTEGER NOT NULL,
    "difficulty" "BlueprintTemplateDifficulty" NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "paper_blueprint_template_rows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "paper_blueprint_templates_subject_id_name_key"
ON "paper_blueprint_templates"("subject_id", "name");

CREATE INDEX "paper_blueprint_templates_board_id_qualification_id_subject_id_idx"
ON "paper_blueprint_templates"("board_id", "qualification_id", "subject_id");

CREATE INDEX "paper_blueprint_templates_created_by_id_idx"
ON "paper_blueprint_templates"("created_by_id");

CREATE UNIQUE INDEX "paper_blueprint_template_chapters_template_id_topic_id_key"
ON "paper_blueprint_template_chapters"("template_id", "topic_id");

CREATE UNIQUE INDEX "paper_blueprint_template_chapters_template_id_sort_order_key"
ON "paper_blueprint_template_chapters"("template_id", "sort_order");

CREATE INDEX "paper_blueprint_template_chapters_topic_id_idx"
ON "paper_blueprint_template_chapters"("topic_id");

CREATE UNIQUE INDEX "paper_blueprint_template_rows_chapter_id_sort_order_key"
ON "paper_blueprint_template_rows"("chapter_id", "sort_order");

ALTER TABLE "paper_blueprint_templates"
ADD CONSTRAINT "paper_blueprint_templates_board_id_fkey"
FOREIGN KEY ("board_id") REFERENCES "boards"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "paper_blueprint_templates"
ADD CONSTRAINT "paper_blueprint_templates_qualification_id_fkey"
FOREIGN KEY ("qualification_id") REFERENCES "qualifications"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "paper_blueprint_templates"
ADD CONSTRAINT "paper_blueprint_templates_subject_id_fkey"
FOREIGN KEY ("subject_id") REFERENCES "subjects"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "paper_blueprint_templates"
ADD CONSTRAINT "paper_blueprint_templates_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "paper_blueprint_template_chapters"
ADD CONSTRAINT "paper_blueprint_template_chapters_template_id_fkey"
FOREIGN KEY ("template_id") REFERENCES "paper_blueprint_templates"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "paper_blueprint_template_chapters"
ADD CONSTRAINT "paper_blueprint_template_chapters_topic_id_fkey"
FOREIGN KEY ("topic_id") REFERENCES "topics"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "paper_blueprint_template_rows"
ADD CONSTRAINT "paper_blueprint_template_rows_chapter_id_fkey"
FOREIGN KEY ("chapter_id") REFERENCES "paper_blueprint_template_chapters"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
