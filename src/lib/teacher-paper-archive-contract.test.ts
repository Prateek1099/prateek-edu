import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const schema = read("prisma/schema.prisma");
const migration = read(
  "prisma/migrations/20260829120000_add_saved_generated_paper_workspace/migration.sql",
);
const teacherActions = read("src/app/workspace/paper-builder/archive/actions.ts");
const adminActions = read("src/app/admin/paper-builder/archive/actions.ts");
const persistence = read("src/lib/paper-builder/saved-paper-service.ts");
const archivePage = read("src/app/workspace/paper-builder/archive/page.tsx");
const archiveDetail = read("src/app/workspace/paper-builder/archive/[id]/page.tsx");
const viewer = read("src/components/paper-builder/SavedPaperViewerClient.tsx");

test("schema and migration add only nullable workspace ownership to saved papers", () => {
  assert.match(schema, /model SavedGeneratedPaper[\s\S]*?workspaceId\s+String\?/);
  assert.match(schema, /workspace\s+Workspace\?[\s\S]*?onDelete: Restrict/);
  assert.match(schema, /@@index\(\[workspaceId, archivedAt, createdAt\]\)/);
  assert.match(schema, /model Workspace[\s\S]*?savedGeneratedPapers\s+SavedGeneratedPaper\[\]/);
  assert.match(migration, /ADD COLUMN "workspace_id" TEXT/);
  assert.match(
    migration,
    /FOREIGN KEY \("workspace_id"\)[\s\S]*?REFERENCES "workspaces"\("id"\)/,
  );
  assert.match(migration, /ON DELETE RESTRICT ON UPDATE CASCADE/);
  assert.doesNotMatch(
    migration,
    /DROP\s+(TABLE|COLUMN)|TRUNCATE\s+TABLE|DELETE\s+FROM|UPDATE\s+"saved_generated_papers"\s+SET/i,
  );
});

test("teacher save derives workspace and creator from the active session", () => {
  assert.match(teacherActions, /const teacher = await requireActiveWorkspace\(\)/);
  assert.match(teacherActions, /validateTeacherPaperSelectionForWorkspace\([\s\S]*teacher\.workspaceId/);
  assert.match(teacherActions, /workspaceId: teacher\.workspaceId/);
  assert.match(teacherActions, /createdById: teacher\.id/);
  assert.match(teacherActions, /finalOrderMode: SavedGeneratedPaperOrderMode\.CHAPTER_WISE/);
  assert.doesNotMatch(teacherActions, /input\.(workspaceId|createdById)/);
  assert.doesNotMatch(
    teacherActions,
    /(?:challenge|worksheet|assignment|attempt|mistake)\.(create|createMany|update|upsert)\(/,
  );
});

test("teacher archive reads and changes only the current workspace", () => {
  assert.match(teacherActions, /workspaceId: teacher\.workspaceId/g);
  assert.match(teacherActions, /savedGeneratedPaper\.findMany/);
  assert.match(teacherActions, /savedGeneratedPaper\.findFirst/);
  assert.match(teacherActions, /savedGeneratedPaper\.updateMany/);
  assert.doesNotMatch(teacherActions, /deleteArchivedGeneratedPaper|savedGeneratedPaper\.delete/);
  assert.match(archivePage, /requireActiveWorkspace\(\)/);
  assert.match(archiveDetail, /requireActiveWorkspace\(\)/);
  assert.match(archiveDetail, /if \(!saved\) notFound\(\)/);
});

test("admin archive remains global-only and existing papers stay workspace null", () => {
  assert.match(adminActions, /workspaceId: null/g);
  assert.match(adminActions, /requireSuperAdmin\(\)/g);
  assert.match(adminActions, /createdById: admin\.id/);
  assert.match(persistence, /workspaceId: input\.workspaceId/);
});

test("teacher archive reuses immutable preview, print, answer key, and DOCX output", () => {
  assert.match(viewer, /PaperQuestionDocument/);
  assert.match(viewer, /PaperAnswerKeyDocument/);
  assert.match(viewer, /window\.print\(\)/);
  assert.match(viewer, /downloadPaperDocx/);
  assert.doesNotMatch(viewer, /assignPaper|createAssignment|AI marking|online attempt/i);
});
