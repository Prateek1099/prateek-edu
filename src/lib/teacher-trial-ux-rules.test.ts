import assert from "node:assert/strict";
import test from "node:test";

import {
  validateClassAcademicRelationship,
  validateClassCreationFields,
  validateWorkspaceAssessmentFields,
} from "./teacher-trial-ux-rules";

test("class creation requires a name, academic year, and sensible capacity", () => {
  assert.equal(
    validateClassCreationFields({ name: "", academicYear: "2026-2027", maxStudents: null }),
    "Enter a class name.",
  );
  assert.equal(
    validateClassCreationFields({ name: "Trial", academicYear: "", maxStudents: null }),
    "Enter an academic year.",
  );
  assert.equal(
    validateClassCreationFields({ name: "Trial", academicYear: "2026-2027", maxStudents: 0 }),
    "Class capacity must be a whole number between 1 and 500.",
  );
  assert.equal(
    validateClassCreationFields({ name: "Trial", academicYear: "2026-2027", maxStudents: 30 }),
    null,
  );
});

test("class subject must belong to the selected qualification", () => {
  assert.equal(
    validateClassAcademicRelationship({
      subjectId: "subject-ip",
      qualificationId: "class-12",
      subjectQualificationId: "class-11",
      subjectExists: true,
      qualificationExists: true,
    }),
    "The selected subject does not belong to the selected qualification or class.",
  );
  assert.equal(
    validateClassAcademicRelationship({
      subjectId: "subject-ip",
      qualificationId: "class-12",
      subjectQualificationId: "class-12",
      subjectExists: true,
      qualificationExists: true,
    }),
    null,
  );
});

test("worksheet creation rejects an empty question list", () => {
  assert.equal(
    validateWorkspaceAssessmentFields({
      title: "Worksheet",
      subjectId: "subject-ip",
      questionIds: [],
      estimatedTime: 30,
    }),
    "Select at least one eligible MCQ question.",
  );
});

test("Quick Practice creation rejects an empty question list", () => {
  assert.equal(
    validateWorkspaceAssessmentFields({
      title: "Quick Practice",
      subjectId: "subject-ip",
      questionIds: [],
    }),
    "Select at least one eligible MCQ question.",
  );
});

test("workspace assessment validation rejects duplicate questions", () => {
  assert.equal(
    validateWorkspaceAssessmentFields({
      title: "Practice",
      subjectId: "subject-ip",
      questionIds: ["question-1", "question-1"],
    }),
    "Remove duplicate questions before creating this content.",
  );
});

test("Quick Practice server validation rejects an insufficient selection", () => {
  assert.equal(
    validateWorkspaceAssessmentFields({
      title: "Quick Practice",
      subjectId: "subject-ip",
      questionIds: ["question-1", "question-2"],
      requestedQuestionCount: 5,
    }),
    "Not enough eligible questions. Found 2, requested 5.",
  );
});
