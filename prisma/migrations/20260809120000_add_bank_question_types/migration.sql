-- CreateEnum
CREATE TYPE "BankQuestionType" AS ENUM (
  'MCQ',
  'TRUE_FALSE',
  'FILL_BLANK',
  'ASSERTION_REASON',
  'VERY_SHORT_ANSWER',
  'SHORT_ANSWER',
  'LONG_ANSWER'
);

-- AlterTable
-- Existing rows receive MCQ through the database default. Existing option and
-- correct-answer values are preserved while the columns become nullable for
-- non-MCQ question types.
ALTER TABLE "bank_questions"
  ADD COLUMN "question_type" "BankQuestionType" NOT NULL DEFAULT 'MCQ',
  ADD COLUMN "model_answer" TEXT,
  ADD COLUMN "source" TEXT,
  ALTER COLUMN "option_a" DROP NOT NULL,
  ALTER COLUMN "option_b" DROP NOT NULL,
  ALTER COLUMN "option_c" DROP NOT NULL,
  ALTER COLUMN "option_d" DROP NOT NULL,
  ALTER COLUMN "correct_answer" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "bank_questions_question_type_idx" ON "bank_questions"("question_type");
