ALTER TABLE "student_reflections"
ADD COLUMN "subject_id" TEXT,
ADD COLUMN "topic_id" TEXT;

CREATE INDEX "student_reflections_subject_id_idx" ON "student_reflections"("subject_id");
CREATE INDEX "student_reflections_topic_id_idx" ON "student_reflections"("topic_id");

ALTER TABLE "student_reflections"
ADD CONSTRAINT "student_reflections_subject_id_fkey"
FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "student_reflections"
ADD CONSTRAINT "student_reflections_topic_id_fkey"
FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
