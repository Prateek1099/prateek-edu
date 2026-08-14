-- Optional supporting visuals for global and workspace Question Bank records.
-- Existing questions remain unchanged and valid without an image.
ALTER TABLE "bank_questions"
ADD COLUMN "image_url" TEXT,
ADD COLUMN "image_alt" TEXT,
ADD COLUMN "image_caption" TEXT;
