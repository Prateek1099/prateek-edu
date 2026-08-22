-- Saved Generated Papers preserve immutable, exact Paper Builder output.
CREATE TYPE "SavedGeneratedPaperOrderMode" AS ENUM ('CHAPTER_WISE', 'SHUFFLE_WITHIN_SECTIONS', 'FULLY_SHUFFLED');

CREATE TABLE "saved_generated_papers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "board_id" TEXT,
    "board_title_snapshot" TEXT NOT NULL,
    "qualification_id" TEXT,
    "qualification_title_snapshot" TEXT NOT NULL,
    "subject_id" TEXT,
    "subject_name_snapshot" TEXT NOT NULL,
    "total_marks" INTEGER NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "final_order_mode" "SavedGeneratedPaperOrderMode" NOT NULL,
    "snapshot_version" INTEGER NOT NULL DEFAULT 1,
    "source_blueprint_template_id" TEXT,
    "source_blueprint_template_name_snapshot" TEXT,
    "institution_name" TEXT NOT NULL,
    "exam_label" TEXT NOT NULL,
    "course_line" TEXT NOT NULL,
    "paper_title" TEXT NOT NULL,
    "topic_line" TEXT NOT NULL,
    "date_text" TEXT NOT NULL,
    "class_text" TEXT NOT NULL,
    "show_student_name" BOOLEAN NOT NULL,
    "show_roll_number" BOOLEAN NOT NULL,
    "instructions" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "saved_generated_papers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "saved_generated_paper_sections" (
    "id" TEXT NOT NULL,
    "saved_paper_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "question_type" "BankQuestionType",
    "question_count" INTEGER NOT NULL,
    "marks_per_question" INTEGER,
    "is_mixed_output" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL,
    CONSTRAINT "saved_generated_paper_sections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "saved_generated_paper_questions" (
    "id" TEXT NOT NULL,
    "saved_paper_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "original_bank_question_id" TEXT,
    "topic_id" TEXT,
    "topic_name_snapshot" TEXT,
    "question_type" "BankQuestionType" NOT NULL,
    "marks" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL,
    "source" TEXT,
    "sort_order" INTEGER NOT NULL,
    "final_question_number" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "option_a" TEXT,
    "option_b" TEXT,
    "option_c" TEXT,
    "option_d" TEXT,
    "correct_answer" TEXT,
    "model_answer" TEXT,
    "explanation" TEXT,
    "image_url" TEXT,
    "image_alt" TEXT,
    "image_caption" TEXT,
    CONSTRAINT "saved_generated_paper_questions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "saved_generated_papers_archived_at_created_at_idx" ON "saved_generated_papers"("archived_at", "created_at");
CREATE INDEX "saved_generated_papers_board_id_qualification_id_subject_id_idx" ON "saved_generated_papers"("board_id", "qualification_id", "subject_id");
CREATE INDEX "saved_generated_papers_created_by_id_idx" ON "saved_generated_papers"("created_by_id");
CREATE INDEX "saved_generated_papers_source_blueprint_template_id_idx" ON "saved_generated_papers"("source_blueprint_template_id");
CREATE UNIQUE INDEX "saved_generated_paper_sections_saved_paper_id_sort_order_key" ON "saved_generated_paper_sections"("saved_paper_id", "sort_order");
CREATE INDEX "saved_generated_paper_sections_saved_paper_id_idx" ON "saved_generated_paper_sections"("saved_paper_id");
CREATE UNIQUE INDEX "saved_generated_paper_questions_section_id_sort_order_key" ON "saved_generated_paper_questions"("section_id", "sort_order");
CREATE UNIQUE INDEX "saved_generated_paper_questions_saved_paper_id_final_question_number_key" ON "saved_generated_paper_questions"("saved_paper_id", "final_question_number");
CREATE INDEX "saved_generated_paper_questions_saved_paper_id_idx" ON "saved_generated_paper_questions"("saved_paper_id");
CREATE INDEX "saved_generated_paper_questions_original_bank_question_id_idx" ON "saved_generated_paper_questions"("original_bank_question_id");
CREATE INDEX "saved_generated_paper_questions_topic_id_idx" ON "saved_generated_paper_questions"("topic_id");
CREATE INDEX "saved_generated_paper_questions_final_question_number_idx" ON "saved_generated_paper_questions"("final_question_number");

ALTER TABLE "saved_generated_papers" ADD CONSTRAINT "saved_generated_papers_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "saved_generated_papers" ADD CONSTRAINT "saved_generated_papers_qualification_id_fkey" FOREIGN KEY ("qualification_id") REFERENCES "qualifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "saved_generated_papers" ADD CONSTRAINT "saved_generated_papers_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "saved_generated_papers" ADD CONSTRAINT "saved_generated_papers_source_blueprint_template_id_fkey" FOREIGN KEY ("source_blueprint_template_id") REFERENCES "paper_blueprint_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "saved_generated_papers" ADD CONSTRAINT "saved_generated_papers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "saved_generated_paper_sections" ADD CONSTRAINT "saved_generated_paper_sections_saved_paper_id_fkey" FOREIGN KEY ("saved_paper_id") REFERENCES "saved_generated_papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_generated_paper_questions" ADD CONSTRAINT "saved_generated_paper_questions_saved_paper_id_fkey" FOREIGN KEY ("saved_paper_id") REFERENCES "saved_generated_papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_generated_paper_questions" ADD CONSTRAINT "saved_generated_paper_questions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "saved_generated_paper_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_generated_paper_questions" ADD CONSTRAINT "saved_generated_paper_questions_original_bank_question_id_fkey" FOREIGN KEY ("original_bank_question_id") REFERENCES "bank_questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "saved_generated_paper_questions" ADD CONSTRAINT "saved_generated_paper_questions_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
