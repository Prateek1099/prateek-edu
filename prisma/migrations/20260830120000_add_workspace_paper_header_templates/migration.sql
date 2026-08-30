-- Teacher Paper Header Templates Phase 1D adds workspace-owned reusable header
-- defaults only. Existing global admin templates and saved papers are unchanged.
CREATE TABLE "workspace_paper_header_templates" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "institution_name" TEXT NOT NULL,
    "exam_label" TEXT NOT NULL,
    "course_line" TEXT NOT NULL,
    "default_class_line" TEXT,
    "default_topic_line" TEXT,
    "default_duration" INTEGER NOT NULL DEFAULT 30,
    "default_instructions" TEXT NOT NULL DEFAULT 'Attempt all questions.',
    "show_student_name" BOOLEAN NOT NULL DEFAULT true,
    "show_roll_number" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT NOT NULL,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_paper_header_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspace_paper_header_templates_workspace_id_name_key_key"
ON "workspace_paper_header_templates"("workspace_id", "name_key");

CREATE INDEX "workspace_paper_header_templates_workspace_id_archived_at_updated_at_idx"
ON "workspace_paper_header_templates"("workspace_id", "archived_at", "updated_at");

CREATE INDEX "workspace_paper_header_templates_created_by_id_idx"
ON "workspace_paper_header_templates"("created_by_id");

ALTER TABLE "workspace_paper_header_templates"
ADD CONSTRAINT "workspace_paper_header_templates_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "workspace_paper_header_templates"
ADD CONSTRAINT "workspace_paper_header_templates_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
