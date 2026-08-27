-- CreateEnum
CREATE TYPE "WorkspaceAcademicScopeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "workspace_academic_scopes" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "assigned_by_id" TEXT NOT NULL,
    "status" "WorkspaceAcademicScopeStatus" NOT NULL DEFAULT 'ACTIVE',
    "deactivated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_academic_scopes_pkey" PRIMARY KEY ("id")
);

-- Backfill every valid workspace/subject pair already used by a class, workspace
-- challenge, private bank question, or legacy workspace content item. The oldest
-- SUPER_ADMIN is recorded as the assigning administrator. If no SUPER_ADMIN exists,
-- the insert safely creates no rows and the workspace must be configured manually.
WITH assigning_admin AS (
    SELECT "id"
    FROM "users"
    WHERE "role" = 'SUPER_ADMIN'
    ORDER BY "created_at" ASC, "id" ASC
    LIMIT 1
), used_scopes AS (
    SELECT "workspace_id", "subject_id" FROM "classes" WHERE "subject_id" IS NOT NULL
    UNION
    SELECT "workspace_id", "subject_id" FROM "challenges" WHERE "workspace_id" IS NOT NULL
    UNION
    SELECT "workspace_id", "subject_id" FROM "bank_questions" WHERE "workspace_id" IS NOT NULL
    UNION
    SELECT "workspace_id", "subject_id" FROM "workspace_content" WHERE "subject_id" IS NOT NULL
), valid_scopes AS (
    SELECT DISTINCT used_scopes."workspace_id", used_scopes."subject_id"
    FROM used_scopes
    INNER JOIN "workspaces" ON "workspaces"."id" = used_scopes."workspace_id"
    INNER JOIN "subjects" ON "subjects"."id" = used_scopes."subject_id"
    INNER JOIN "qualifications" ON "qualifications"."id" = "subjects"."qualification_id"
    INNER JOIN "boards" ON "boards"."id" = "qualifications"."board_id"
)
INSERT INTO "workspace_academic_scopes" (
    "id", "workspace_id", "subject_id", "assigned_by_id", "status", "created_at", "updated_at"
)
SELECT
    'scope_' || md5(valid_scopes."workspace_id" || ':' || valid_scopes."subject_id"),
    valid_scopes."workspace_id",
    valid_scopes."subject_id",
    assigning_admin."id",
    'ACTIVE'::"WorkspaceAcademicScopeStatus",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM valid_scopes
CROSS JOIN assigning_admin;

-- CreateIndex
CREATE UNIQUE INDEX "workspace_academic_scopes_workspace_id_subject_id_key"
ON "workspace_academic_scopes"("workspace_id", "subject_id");

-- CreateIndex
CREATE INDEX "workspace_academic_scopes_workspace_id_status_idx"
ON "workspace_academic_scopes"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "workspace_academic_scopes_subject_id_status_idx"
ON "workspace_academic_scopes"("subject_id", "status");

-- CreateIndex
CREATE INDEX "workspace_academic_scopes_assigned_by_id_idx"
ON "workspace_academic_scopes"("assigned_by_id");

-- AddForeignKey
ALTER TABLE "workspace_academic_scopes"
ADD CONSTRAINT "workspace_academic_scopes_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_academic_scopes"
ADD CONSTRAINT "workspace_academic_scopes_subject_id_fkey"
FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_academic_scopes"
ADD CONSTRAINT "workspace_academic_scopes_assigned_by_id_fkey"
FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
