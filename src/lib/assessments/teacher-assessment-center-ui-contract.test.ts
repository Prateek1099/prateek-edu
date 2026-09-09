import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const read = (file: string) => fs.readFileSync(file, "utf8");

test("Teacher Assessment Center remains focused and safely connected", async t => {
  const page = read("src/app/workspace/assessments/page.tsx");
  const sidebar = read("src/components/WorkspaceSidebar.tsx");
  const engine = read("src/lib/assessments/engine.ts");
  const results = read("src/app/workspace/assessments/[assignmentId]/AssessmentResultsClient.tsx");

  await t.test("creates the dynamic workspace assessment route", () => {
    assert.match(page, /export const dynamic = "force-dynamic"/);
    assert.match(page, /assessmentService\.teacherAssessmentCenter/);
  });

  await t.test("uses the locked sidebar and page terminology", () => {
    assert.match(sidebar, /label: "Assess"[\s\S]*?label: "Assessments"/);
    assert.match(page, />Online Assessments</);
    assert.doesNotMatch(page, /Needs Marking|Online Tests/);
  });

  await t.test("offers one existing-workflow creation destination", () => {
    assert.match(page, /href="\/workspace\/paper-builder\/archive"/);
    assert.match(page, /Assign assessment/);
    assert.doesNotMatch(page, /createAndAssignFromSavedPaper|assessment\.create/);
  });

  await t.test("keeps the four approved primary filters", () => {
    for (const label of ["All", "Scheduled", "Active", "Completed"]) assert.ok(page.includes(`label: "${label}"`));
  });

  await t.test("keeps title search and class filtering server-driven", () => {
    assert.match(page, /method="get" action="\/workspace\/assessments"/);
    assert.match(page, /name="search"/);
    assert.match(page, /name="classId"/);
    assert.match(engine, /av\.title ILIKE/);
    assert.match(engine, /aa\.class_id/);
  });

  await t.test("uses the database clock and derives rather than stores center status", () => {
    assert.match(engine, /clock_timestamp\(\) AT TIME ZONE 'UTC'/);
    assert.match(engine, /assessment_state/);
    assert.doesNotMatch(page, /update|createMany|\.create\(/);
  });

  await t.test("independently enforces teacher, owner, workspace and academic scope", () => {
    assert.match(engine, /const owner=await teacher\(tx,actor\)/);
    assert.match(engine, /a\.workspace_id = \$\{/);
    assert.match(engine, /a\.created_by_id = \$\{/);
    assert.match(engine, /aa\.assigned_by_id = \$\{/);
    assert.match(engine, /workspace_academic_scopes/);
  });

  await t.test("excludes revoked recipients from progress", () => {
    assert.match(engine, /recipient\.revoked_at IS NULL/);
    assert.match(engine, /COUNT\(latest\.recipient_id\)/);
  });

  await t.test("combines submitted, needs-review and graded into submitted-ready", () => {
    assert.match(engine, /'SUBMITTED', 'NEEDS_REVIEW', 'GRADED'/);
    assert.match(page, /submitted \/ ready/);
  });

  await t.test("sorts active, scheduled, completed and cancelled by usefulness", () => {
    assert.match(engine, /WHEN 'ACTIVE' THEN 0 WHEN 'SCHEDULED' THEN 1 WHEN 'COMPLETED' THEN 2 ELSE 3/);
    assert.match(engine, /closes_at END ASC NULLS LAST/);
    assert.match(engine, /opens_at END ASC NULLS LAST/);
  });

  await t.test("uses bounded database pagination without a recipient query loop", () => {
    assert.match(engine, /LIMIT \$\{query\.pageSize\}/);
    assert.match(engine, /OFFSET \$\{offset\}/);
    assert.doesNotMatch(engine, /items\.map\([\s\S]{0,120}assessmentRecipient\.find/);
  });

  await t.test("reuses the existing results and answer-review routes", () => {
    assert.match(page, /`\/workspace\/assessments\/\$\{item\.id\}`/);
    assert.match(results, /`\/workspace\/assessments\/\$\{results\.id\}\/attempts\/\$\{student\.attemptId\}`/);
    assert.match(results, /href="\/workspace\/assessments"/);
  });

  await t.test("has distinct first-use and filtered empty states", () => {
    assert.match(page, /No online assessments yet\./);
    assert.match(page, /No assessments match this view\./);
    assert.match(page, /Reset filters/);
  });

  await t.test("uses mobile cards and a desktop table without forced page overflow", () => {
    assert.match(page, /space-y-3 md:hidden/);
    assert.match(page, /hidden overflow-x-auto[\s\S]*?md:block/);
    assert.match(page, /min-w-0/);
  });

  await t.test("does not alter the 22-migration assessment foundation", () => {
    const migrations = fs.readdirSync("prisma/migrations");
    assert.equal(migrations.length, 22);
    assert.equal(migrations.at(-1), "20260908120000_enable_objective_assessment_lifecycle");
  });
});
