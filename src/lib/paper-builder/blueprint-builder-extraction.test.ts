import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const sharedClient = read("src/components/paper-builder/BlueprintBuilderClient.tsx");
const adminAdapter = read("src/app/admin/paper-builder/blueprint/BlueprintBuilderClient.tsx");
const adminPage = read("src/app/admin/paper-builder/blueprint/page.tsx");
const adminActions = read("src/app/admin/paper-builder/blueprint/actions.ts");
const adminTemplateActions = read("src/app/admin/paper-builder/blueprint/template-actions.ts");
const adminArchiveActions = read("src/app/admin/paper-builder/archive/actions.ts");
const modeNav = read("src/components/paper-builder/PaperBuilderModeNav.tsx");
const schema = read("prisma/schema.prisma");

test("shared Blueprint Builder receives injected actions, routes, copy, and capabilities", () => {
  assert.match(sharedClient, /actions: BlueprintBuilderActions/);
  assert.match(sharedClient, /config: BlueprintBuilderConfig/);
  assert.match(sharedClient, /reviewAvailability: \(input: BlueprintPaperDraft\)/);
  assert.match(sharedClient, /generatePaper: \(input: BlueprintPaperDraft\)/);
  assert.match(sharedClient, /getReplacementCandidates\?:/);
  assert.match(sharedClient, /selectCandidate\?:/);
  assert.match(sharedClient, /regenerateRow\?:/);
  assert.match(sharedClient, /regenerateChapter\?:/);
  assert.match(sharedClient, /validateSelection:/);
  assert.match(sharedClient, /createTemplate\?:/);
  assert.match(sharedClient, /applyTemplate\?:/);
  assert.match(sharedClient, /saveGeneratedPaper\?:/);
  assert.match(sharedClient, /templateManagementHref/);
  assert.match(sharedClient, /archivePaperHref/);
  assert.match(sharedClient, /capabilities: BlueprintBuilderCapabilities/);
});

test("shared Blueprint Builder has no admin action imports or hard-coded admin routes", () => {
  assert.doesNotMatch(sharedClient, /@\/app\/admin|from "\.\/actions"|from "\.\/template-actions"|from "\.\.\/archive\/actions"/);
  assert.doesNotMatch(sharedClient, /\/admin\/paper-builder/);
});

test("admin adapter wires every existing admin action and enables every existing capability", () => {
  for (const action of [
    "reviewBlueprintAvailability",
    "generateBlueprintPaper",
    "getBlueprintReplacementCandidates",
    "selectBlueprintCandidate",
    "regenerateBlueprintRow",
    "regenerateBlueprintChapter",
    "validateBlueprintSelection",
    "createPaperBlueprintTemplate",
    "applyPaperBlueprintTemplate",
    "saveGeneratedPaper",
  ]) {
    assert.match(adminAdapter, new RegExp(action));
  }
  assert.match(adminAdapter, /templates: true/);
  assert.match(adminAdapter, /archive: true/);
  assert.match(adminAdapter, /replacement: true/);
  assert.match(adminAdapter, /rowRegeneration: true/);
  assert.match(adminAdapter, /chapterRegeneration: true/);
  assert.match(adminAdapter, /templateManagementHref: "\/admin\/paper-builder\/blueprint\/templates"/);
  assert.match(adminAdapter, /`\/admin\/paper-builder\/archive\/\$\{paperId\}`/);
});

test("admin page and all sensitive action modules preserve SUPER_ADMIN enforcement", () => {
  assert.match(adminPage, /requireSuperAdmin\(\)/);
  assert.match(adminPage, /<BlueprintBuilderClient/);
  for (const action of [
    "reviewBlueprintAvailability",
    "generateBlueprintPaper",
    "getBlueprintReplacementCandidates",
    "selectBlueprintCandidate",
    "regenerateBlueprintRow",
    "regenerateBlueprintChapter",
    "validateBlueprintSelection",
  ]) {
    assert.match(adminActions, new RegExp(`function ${action}`));
  }
  assert.equal((adminActions.match(/requireSuperAdmin\(\)/g) ?? []).length, 7);
  for (const action of [
    "createPaperBlueprintTemplate",
    "applyPaperBlueprintTemplate",
    "updatePaperBlueprintTemplate",
    "duplicatePaperBlueprintTemplate",
    "deletePaperBlueprintTemplate",
  ]) {
    assert.match(adminTemplateActions, new RegExp(`function ${action}`));
  }
  assert.match(adminArchiveActions, /function saveGeneratedPaper/);
  assert.match(adminArchiveActions, /requireSuperAdmin\(\)/);
  assert.match(adminArchiveActions, /validateBlueprintSelection/);
});

test("configurable mode navigation keeps the exact four admin destinations by default", () => {
  assert.match(modeNav, /items = ADMIN_PAPER_BUILDER_NAV_ITEMS/);
  assert.match(modeNav, /href: "\/admin\/paper-builder"/);
  assert.match(modeNav, /href: "\/admin\/paper-builder\/blueprint"/);
  assert.match(modeNav, /href: "\/admin\/paper-builder\/blueprint\/templates"/);
  assert.match(modeNav, /href: "\/admin\/paper-builder\/archive"/);
  assert.match(modeNav, /items\.map/);
});

test("teacher Blueprint route remains a separate adapter without adding a schema model", () => {
  assert.equal(existsSync(path.join(root, "src/app/workspace/paper-builder/blueprint")), true);
  assert.doesNotMatch(schema, /model WorkspacePaperBlueprint/);
  assert.doesNotMatch(`${sharedClient}\n${adminAdapter}`, /requireActiveWorkspace|WorkspacePaperBlueprint/);
});
