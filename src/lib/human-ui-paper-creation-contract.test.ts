import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const sidebar = read("src/components/WorkspaceSidebar.tsx");
const modeNav = read("src/components/paper-builder/PaperBuilderModeNav.tsx");
const quickPage = read("src/app/workspace/paper-builder/page.tsx");
const quickClient = read("src/components/paper-builder/SimplePaperBuilderClient.tsx");
const chapterPage = read("src/app/workspace/paper-builder/blueprint/page.tsx");
const chapterAdapter = read("src/app/workspace/paper-builder/blueprint/BlueprintBuilderClient.tsx");
const chapterClient = read("src/components/paper-builder/BlueprintBuilderClient.tsx");
const setupPage = read("src/app/workspace/paper-builder/templates/page.tsx");
const setupManager = read("src/app/workspace/paper-builder/templates/TemplatesManagerClient.tsx");
const patternPage = read("src/app/workspace/paper-builder/blueprint/templates/page.tsx");
const patternManager = read("src/app/workspace/paper-builder/blueprint/templates/BlueprintTemplatesManagerClient.tsx");
const headerPage = read("src/app/workspace/paper-builder/header-templates/page.tsx");
const headerManager = read("src/app/workspace/paper-builder/header-templates/HeaderTemplatesManagerClient.tsx");
const archivePage = read("src/app/workspace/paper-builder/archive/page.tsx");
const archiveClient = read("src/app/workspace/paper-builder/archive/TeacherArchiveClient.tsx");
const adminAdapter = read("src/app/admin/paper-builder/blueprint/BlueprintBuilderClient.tsx");

const teacherRoutes = [
  "src/app/workspace/paper-builder/page.tsx",
  "src/app/workspace/paper-builder/blueprint/page.tsx",
  "src/app/workspace/paper-builder/templates/page.tsx",
  "src/app/workspace/paper-builder/blueprint/templates/page.tsx",
  "src/app/workspace/paper-builder/header-templates/page.tsx",
  "src/app/workspace/paper-builder/archive/page.tsx",
  "src/app/workspace/paper-builder/archive/[id]/page.tsx",
];

test("all existing teacher Paper routes remain in place", () => {
  teacherRoutes.forEach((route) => {
    assert.equal(existsSync(path.join(root, route)), true, `${route} must remain available`);
  });

  for (const href of [
    "/workspace/paper-builder",
    "/workspace/paper-builder/blueprint",
    "/workspace/paper-builder/templates",
    "/workspace/paper-builder/blueprint/templates",
    "/workspace/paper-builder/header-templates",
    "/workspace/paper-builder/archive",
  ]) {
    assert.match(modeNav, new RegExp(`href: "${href.replaceAll("/", "\\/")}"`));
  }
});

test("Papers has one sidebar entry and two visually primary creation paths", () => {
  assert.match(sidebar, /href: "\/workspace\/paper-builder", label: "Papers"/);
  assert.equal((sidebar.match(/\/workspace\/paper-builder/g) ?? []).length, 1);
  assert.match(modeNav, /What kind of paper do you want to create\?/);
  assert.match(modeNav, /label: "Quick Paper",[\s\S]*?emphasis: "primary"/);
  assert.match(modeNav, /label: "Chapter-wise Paper",[\s\S]*?emphasis: "primary"/);
  assert.equal((modeNav.match(/emphasis: "primary"/g) ?? []).length, 2);
  assert.equal((modeNav.match(/emphasis: "secondary"/g) ?? []).length, 4);
});

test("secondary Paper tools remain reachable without six equal mobile tabs", () => {
  for (const label of [
    "Saved paper setups",
    "Saved chapter patterns",
    "Paper headers",
    "Saved papers",
  ]) {
    assert.match(modeNav, new RegExp(`label: "${label}"`));
  }
  assert.match(modeNav, /<details className="group border-t pt-3 sm:hidden">/);
  assert.match(modeNav, /aria-label="Paper reuse and management"/);
  assert.match(modeNav, /<nav className="grid grid-cols-2 gap-2"/);
});

test("secondary Paper tools stay readable without competing with creation cards", () => {
  for (const description of [
    "Reuse a Quick Paper structure.",
    "Reuse a chapter-wise marks pattern.",
    "Reuse school and exam details.",
    "Open a paper you previously saved.",
  ]) {
    assert.match(modeNav, new RegExp(description.replaceAll(".", "\\.")));
  }

  assert.match(modeNav, /<h2 className="text-base font-semibold">Reuse &amp; manage<\/h2>/);
  assert.match(modeNav, /text-\[15px\] font-semibold leading-5/);
  assert.match(modeNav, /mt-1 block text-sm leading-5 text-muted-foreground/);
  assert.match(modeNav, /<h3 className="text-lg font-semibold">\{item\.label\}<\/h3>/);
  assert.match(modeNav, /Create \{item\.label\}/);
});

test("Quick Paper presents the five-step teacher journey and keeps the existing builder", () => {
  assert.match(quickPage, /<TeacherPapersEntry \/>/);
  assert.match(quickPage, /id="quick-paper-builder"/);
  assert.match(quickPage, /<SimplePaperBuilderClient/);
  for (const label of [
    "Paper details",
    "Academic scope",
    "Paper structure",
    "Questions",
    "Preview, export & save",
  ]) {
    assert.match(quickClient, new RegExp(label.replaceAll("&", "&")));
  }
  assert.match(quickClient, /Choose questions for me/);
  assert.match(quickClient, /Choose manually/);
  assert.match(quickClient, /Choose different question/);
  assert.match(quickClient, /Print question paper/);
  assert.match(quickClient, /Download Question Paper DOCX/);
});

test("saved setup and saved header controls are conveniences, not opening card walls", () => {
  assert.match(quickClient, /<SavedSetupPanel teacherFriendly=\{teacherFriendlyLabels\}>/);
  assert.match(quickClient, /Use a saved paper setup/);
  assert.match(quickClient, /Use saved header/);
  assert.match(quickClient, /Manage saved headers/);
  assert.match(quickClient, /A saved setup reuses topics, question types and marks/);
});

test("Chapter-wise Paper uses teacher language while preserving the shared algorithms", () => {
  assert.match(chapterPage, /<h1[^>]*>Chapter-wise Paper<\/h1>/);
  assert.match(chapterAdapter, /teacherFacing: true/);
  assert.match(chapterClient, /Chapter marks pattern/);
  assert.match(chapterClient, /Check question availability/);
  assert.match(chapterClient, /Review questions/);
  assert.match(chapterAdapter, /replacementButtonLabel: "Choose different question"/);
  assert.match(chapterAdapter, /chapterRegenerationLabel: "Choose different questions for this chapter"/);

  for (const algorithmCall of [
    "reviewAvailabilityAction(draft)",
    "generatePaperAction(draft)",
    "validateSelectionAction(draft",
    "regenerateRowAction(draft",
    "regenerateChapterAction(draft",
  ]) {
    assert.ok(chapterClient.includes(algorithmCall), `${algorithmCall} must remain wired`);
  }
});

test("the four saved concepts explain distinct purposes", () => {
  assert.match(setupPage, /Reuse how you want to build a Quick Paper/);
  assert.match(patternPage, /Reuse how marks should be distributed chapter by chapter/);
  assert.match(headerPage, /Save school and exam details so you do not type them again/);
  assert.match(archivePage, /These are actual generated papers/);
});

test("saved tool lists are compact and retain their primary use actions", () => {
  for (const manager of [setupManager, patternManager, headerManager, archiveClient]) {
    assert.match(manager, /divide-y/);
    assert.doesNotMatch(manager, /grid gap-[^\n]*lg:grid-cols-2/);
  }
  assert.match(setupManager, /Use setup/);
  assert.match(patternManager, /Use pattern/);
  assert.match(quickClient, /Use header/);
  assert.match(archiveClient, /Open paper/);
});

test("Admin Blueprint terminology and capabilities remain available", () => {
  assert.match(modeNav, /label: "Simple Builder"/);
  assert.match(modeNav, /label: "Blueprint Builder"/);
  assert.match(modeNav, /label: "Blueprint Templates"/);
  assert.match(modeNav, /label: "Paper Archive"/);
  assert.match(adminAdapter, /replacement: true/);
  assert.match(adminAdapter, /rowRegeneration: true/);
  assert.match(adminAdapter, /chapterRegeneration: true/);
  assert.doesNotMatch(adminAdapter, /teacherFacing: true/);
});

test("teacher Paper pages keep active-workspace authorization", () => {
  for (const page of [quickPage, chapterPage, setupPage, patternPage, headerPage, archivePage]) {
    assert.match(page, /requireActiveWorkspace/);
  }
});
