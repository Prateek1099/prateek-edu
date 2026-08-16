import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const actions = readFileSync(
  new URL("../../app/admin/paper-builder/blueprint/template-actions.ts", import.meta.url),
  "utf8",
);

test("all template management mutations enforce SUPER_ADMIN authorization", () => {
  for (const actionName of [
    "updatePaperBlueprintTemplate",
    "deletePaperBlueprintTemplate",
    "duplicatePaperBlueprintTemplate",
  ]) {
    const start = actions.indexOf(`export async function ${actionName}`);
    assert.notEqual(start, -1, `${actionName} must exist`);
    const body = actions.slice(start, start + 500);
    assert.match(body, /requireSuperAdmin\(\)/, `${actionName} must authorize independently`);
  }
});

test("template management writes only PaperBlueprintTemplate aggregates", () => {
  assert.match(actions, /paperBlueprintTemplate\.update/);
  assert.match(actions, /paperBlueprintTemplate\.delete/);
  assert.match(actions, /paperBlueprintTemplate\.create/);
  assert.doesNotMatch(actions, /bankQuestion\.(create|update|delete)/);
  assert.doesNotMatch(actions, /(?:challenge|worksheet|paper)\.(create|update|delete)/);
});

test("delete and duplicate return friendly stale-record outcomes", () => {
  assert.match(actions, /P2025/);
  assert.match(actions, /no longer exists/);
  assert.match(actions, /stale academic references/);
});
