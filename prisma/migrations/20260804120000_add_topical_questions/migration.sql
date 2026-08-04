CREATE TABLE "topical_questions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subject_id" TEXT NOT NULL,
    "topic_id" TEXT,
    "questions_pdf_url" TEXT NOT NULL,
    "answers_pdf_url" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topical_questions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "topical_questions_subject_id_is_published_idx"
ON "topical_questions"("subject_id", "is_published");

CREATE INDEX "topical_questions_topic_id_idx"
ON "topical_questions"("topic_id");

ALTER TABLE "topical_questions"
ADD CONSTRAINT "topical_questions_subject_id_fkey"
FOREIGN KEY ("subject_id") REFERENCES "subjects"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "topical_questions"
ADD CONSTRAINT "topical_questions_topic_id_fkey"
FOREIGN KEY ("topic_id") REFERENCES "topics"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
