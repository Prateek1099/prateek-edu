-- Existing notes are classified as study notes by the database default.
CREATE TYPE "NoteType" AS ENUM ('NOTEBOOK_WORK', 'STUDY_NOTES');

ALTER TABLE "notes"
ADD COLUMN "note_type" "NoteType" NOT NULL DEFAULT 'STUDY_NOTES';
