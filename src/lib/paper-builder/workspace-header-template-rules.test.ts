import assert from "node:assert/strict";
import test from "node:test";

import {
  type WorkspaceHeaderTemplateInput,
  validateWorkspaceHeaderTemplateInput,
  workspaceHeaderTemplateNameKey,
} from "./workspace-header-template-rules";

function input(overrides: Partial<WorkspaceHeaderTemplateInput> = {}): WorkspaceHeaderTemplateInput {
  return {
    name: "  Lucky   School  ",
    institutionName: " Lucky School ",
    examLabel: " Class Test ",
    courseLine: " IP · Class 12 ",
    defaultDuration: 30,
    defaultInstructions: " Attempt all questions. ",
    showStudentName: true,
    showRollNumber: true,
    defaultClassLine: " Class 12 ",
    defaultTopicLine: " SQL ",
    ...overrides,
  };
}

test("template names use a stable case-insensitive normalized key", () => {
  assert.equal(workspaceHeaderTemplateNameKey("  Lucky   SCHOOL "), "lucky school");
  assert.equal(workspaceHeaderTemplateNameKey("ＶＥＸＡ"), "vexa");
});

test("header input is trimmed without storing marks or question data", () => {
  const validated = validateWorkspaceHeaderTemplateInput(input());
  assert.equal(validated.name, "Lucky School");
  assert.equal(validated.nameKey, "lucky school");
  assert.equal(validated.institutionName, "Lucky School");
  assert.equal(validated.defaultClassLine, "Class 12");
  assert.equal(validated.defaultTopicLine, "SQL");
  assert.equal("marks" in validated, false);
  assert.equal("questionIds" in validated, false);
  assert.equal("questions" in validated, false);
});

test("required fields, lengths, booleans, and duration are validated", () => {
  assert.throws(() => validateWorkspaceHeaderTemplateInput(input({ name: "" })), /Template name is required/);
  assert.throws(() => validateWorkspaceHeaderTemplateInput(input({ institutionName: "" })), /Institution name is required/);
  assert.throws(() => validateWorkspaceHeaderTemplateInput(input({ examLabel: "" })), /Exam label is required/);
  assert.throws(() => validateWorkspaceHeaderTemplateInput(input({ defaultDuration: 0 })), /1 to 300/);
  assert.throws(() => validateWorkspaceHeaderTemplateInput(input({ defaultDuration: 301 })), /1 to 300/);
  assert.throws(
    () => validateWorkspaceHeaderTemplateInput({ ...input(), showStudentName: "yes" as never }),
    /Student detail options are invalid/,
  );
  assert.throws(
    () => validateWorkspaceHeaderTemplateInput(input({ defaultInstructions: "x".repeat(3_001) })),
    /3000 characters or fewer/,
  );
});

test("optional reusable lines normalize to null when blank", () => {
  const validated = validateWorkspaceHeaderTemplateInput(input({
    defaultClassLine: "  ",
    defaultTopicLine: null,
    courseLine: "",
    defaultInstructions: "",
  }));
  assert.equal(validated.defaultClassLine, null);
  assert.equal(validated.defaultTopicLine, null);
  assert.equal(validated.courseLine, "");
  assert.equal(validated.defaultInstructions, "");
});
