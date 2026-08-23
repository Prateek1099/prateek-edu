import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const service = readFileSync(path.join(root, "src/lib/remedial-worksheets/service.ts"), "utf8");
const actions = readFileSync(path.join(root, "src/app/admin/worksheets/remedial/create/actions.ts"), "utf8");
const page = readFileSync(path.join(root, "src/app/admin/worksheets/remedial/create/page.tsx"), "utf8");
const insights = readFileSync(path.join(root, "src/app/admin/insights/InsightsClient.tsx"), "utf8");
const performance = readFileSync(path.join(root, "src/app/admin/users/[id]/performance/page.tsx"), "utf8");

test("page and shared service enforce SUPER_ADMIN", () => {
  assert.match(page, /await requireSuperAdmin\(\)/);
  assert.ok((actions.match(/await requireSuperAdmin\(\)/g) ?? []).length >= 2);
  assert.ok((service.match(/await requireSuperAdmin\(\)/g) ?? []).length >= 3);
});

test("scope validation follows board, qualification, subject, and published topic relations", () => {
  assert.match(service, /qualificationId: input\.qualificationId/);
  assert.match(service, /boardId: input\.boardId/);
  assert.match(service, /topics:\s*\{/);
  assert.match(service, /id: input\.topicId, status: "PUBLISHED"/);
});

test("candidate loading is global, exact-topic, and MCQ-only", () => {
  assert.match(service, /workspaceId: null/);
  assert.match(service, /subjectId: scope\.subjectId/);
  assert.match(service, /topicId: scope\.topicId/);
  assert.match(service, /questionType: "MCQ"/);
});

test("preview generation contains no database write", () => {
  const preview = service.slice(
    service.indexOf("export async function generateRemedialWorksheetDraft"),
    service.indexOf("export async function saveRemedialWorksheetDraft"),
  );
  assert.doesNotMatch(preview, /\.(create|update|delete|createMany|updateMany|deleteMany)\(/);
});

test("save is transactional and creates an unpublished global WORKSHEET", () => {
  assert.match(service, /prisma\.\$transaction/);
  assert.match(service, /isPublished: false/);
  assert.match(service, /type: "WORKSHEET"/);
  assert.match(service, /workspaceId: null/);
});

test("save preserves BankQuestion references without mutating the bank", () => {
  assert.match(service, /bankQuestionId: question\.id/);
  assert.doesNotMatch(service, /bankQuestion\.(create|update|delete|createMany|updateMany|deleteMany)/);
});

test("remedial actions create no attempts, mistakes, assignments, or automatic publication", () => {
  const combined = `${service}\n${actions}`;
  assert.doesNotMatch(combined, /challengeAttempt\.(create|update|delete)/);
  assert.doesNotMatch(combined, /mistakeEntry\.(create|update|delete)/);
  assert.doesNotMatch(combined, /worksheetAssignment\.(create|update|delete)/);
  assert.doesNotMatch(combined, /isPublished: true/);
});

test("Insights exposes only relational topic links to the remedial route", () => {
  assert.match(insights, /topic\.topicId \?/);
  assert.match(insights, /\/admin\/worksheets\/remedial\/create/);
  assert.match(insights, /Generate Remedial Worksheet/);
});

test("the legacy Student Performance action no longer claims personalization", () => {
  assert.match(performance, /Open Worksheet Creator/);
  assert.doesNotMatch(performance, /Generate Personalized Worksheet/);
  assert.doesNotMatch(performance, /\/admin\/worksheets\/create\?topic=/);
});
