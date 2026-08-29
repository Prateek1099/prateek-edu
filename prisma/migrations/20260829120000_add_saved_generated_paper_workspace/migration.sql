-- Teacher Paper Save + Archive Phase 1C adds optional workspace ownership.
-- Existing SUPER_ADMIN saved papers remain global with workspace_id = NULL.
ALTER TABLE "saved_generated_papers"
ADD COLUMN "workspace_id" TEXT;

CREATE INDEX "saved_generated_papers_workspace_id_idx"
ON "saved_generated_papers"("workspace_id");

CREATE INDEX "saved_generated_papers_workspace_id_archived_at_created_at_idx"
ON "saved_generated_papers"("workspace_id", "archived_at", "created_at");

ALTER TABLE "saved_generated_papers"
ADD CONSTRAINT "saved_generated_papers_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
