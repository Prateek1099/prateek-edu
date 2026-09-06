import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const page = read("src/app/workspace/worksheets/page.tsx");
const client = read("src/app/workspace/worksheets/WorksheetsClient.tsx");
const actions = read("src/app/actions/workspace-worksheets.ts");
const classDetail = read("src/app/dashboard/classes/[id]/page.tsx");
const assignedWork = read("src/app/dashboard/worksheets/page.tsx");
const dashboard = read("src/app/dashboard/page.tsx");
const worksheetViewer = read("src/app/resources/[board]/[qualification]/[subject]/worksheet/[id]/page.tsx");
const attemptPage = read("src/app/resources/[board]/[qualification]/[subject]/challenge/[id]/attempt/page.tsx");
const resultsPage = read("src/app/resources/[board]/[qualification]/[subject]/challenge/[id]/results/[attemptId]/page.tsx");

test("assigned classroom links carry safe student return context through viewers", () => {
  assert.match(classDetail, /returnTo = `\/dashboard\/classes\/\$\{id\}`/);
  assert.match(assignedWork, /"\/dashboard\/worksheets"/);
  assert.match(dashboard, /withStudentReturnTo[\s\S]*?"\/dashboard"/);
  for (const source of [worksheetViewer, attemptPage, resultsPage]) {
    assert.match(source, /getSafeStudentReturnPath/);
  }
});

test("teacher worksheet options expose readable subject and topic labels", () => {
  assert.match(page, /label: `\$\{s\.name\}/);
  assert.match(page, /s\.qualification\.board\.title/);
  assert.match(page, /s\.qualification\.title/);
  assert.match(page, /label: t\.topicName/);
  assert.match(client, /selectedSubjectLabel/);
  assert.match(client, /selectedTopicLabel/);
  assert.match(client, /<SelectValue placeholder="Select subject">\{selectedSubjectLabel\}<\/SelectValue>/);
  assert.match(client, /<SelectValue placeholder="Select topic">\{selectedTopicLabel\}<\/SelectValue>/);
});

test("teacher worksheet chooser is readable and responsive", () => {
  assert.match(client, /subjectOptions\.length === 1 \? subjectOptions\[0\]\.id/);
  assert.match(client, /All topics in subject/);
  assert.match(client, /max-h-\[48vh\] overflow-y-auto/);
  assert.match(client, /md:hidden/);
  assert.match(client, /hidden md:block/);
  assert.match(client, /break-words/);
  assert.match(client, /selectedQuestions\.length\} selected/);
});

test("teacher worksheet data and writes remain academic-scope controlled", () => {
  assert.match(page, /listActiveWorkspaceScopes/);
  assert.match(page, /subjectId: \{ in: subjectIds \}/);
  assert.match(page, /OR: \[\s*\{ workspaceId: null \},\s*\{ workspaceId: user\.workspaceId \}/);
  assert.match(actions, /requireWorkspaceTopicScope\(workspaceId, subjectId, topicId\)/);
  assert.match(actions, /subjectId,/);
  assert.match(actions, /topicId && !topic/);
  assert.match(actions, /createWorksheet/);
  assert.match(actions, /createQuickPractice/);
});
