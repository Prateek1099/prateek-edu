-- CreateEnum
CREATE TYPE "WorkspaceAssignmentAudience" AS ENUM ('CLASS', 'SELECTED_STUDENTS');

-- CreateEnum
CREATE TYPE "WorkspaceAssignmentBatchStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkspaceAssignmentRecipientStatus" AS ENUM ('NOT_STARTED', 'COMPLETED');

-- CreateTable
CREATE TABLE "workspace_assignment_batches" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "assigned_by_id" TEXT NOT NULL,
    "audience" "WorkspaceAssignmentAudience" NOT NULL,
    "due_date" TIMESTAMP(3),
    "include_late_joiners" BOOLEAN NOT NULL DEFAULT true,
    "status" "WorkspaceAssignmentBatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "workspace_assignment_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_assignment_recipients" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "status" "WorkspaceAssignmentRecipientStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "workspace_assignment_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workspace_assignment_batches_workspace_id_idx" ON "workspace_assignment_batches"("workspace_id");

-- CreateIndex
CREATE INDEX "workspace_assignment_batches_class_id_idx" ON "workspace_assignment_batches"("class_id");

-- CreateIndex
CREATE INDEX "workspace_assignment_batches_challenge_id_idx" ON "workspace_assignment_batches"("challenge_id");

-- CreateIndex
CREATE INDEX "workspace_assignment_batches_assigned_by_id_idx" ON "workspace_assignment_batches"("assigned_by_id");

-- CreateIndex
CREATE INDEX "workspace_assignment_batches_status_idx" ON "workspace_assignment_batches"("status");

-- CreateIndex
CREATE INDEX "workspace_assignment_batches_class_id_challenge_id_status_idx" ON "workspace_assignment_batches"("class_id", "challenge_id", "status");

-- CreateIndex
CREATE INDEX "workspace_assignment_recipients_batch_id_idx" ON "workspace_assignment_recipients"("batch_id");

-- CreateIndex
CREATE INDEX "workspace_assignment_recipients_student_id_idx" ON "workspace_assignment_recipients"("student_id");

-- CreateIndex
CREATE INDEX "workspace_assignment_recipients_status_idx" ON "workspace_assignment_recipients"("status");

-- CreateIndex
CREATE INDEX "workspace_assignment_recipients_student_id_status_idx" ON "workspace_assignment_recipients"("student_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_assignment_recipients_batch_id_student_id_key" ON "workspace_assignment_recipients"("batch_id", "student_id");

-- AddForeignKey
ALTER TABLE "workspace_assignment_batches" ADD CONSTRAINT "workspace_assignment_batches_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_assignment_batches" ADD CONSTRAINT "workspace_assignment_batches_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_assignment_batches" ADD CONSTRAINT "workspace_assignment_batches_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_assignment_batches" ADD CONSTRAINT "workspace_assignment_batches_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_assignment_recipients" ADD CONSTRAINT "workspace_assignment_recipients_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "workspace_assignment_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_assignment_recipients" ADD CONSTRAINT "workspace_assignment_recipients_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
