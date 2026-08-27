import assert from "node:assert/strict";
import test from "node:test";

import {
  scopeDeactivationError,
  scopeDependencyTotal,
  validateScopeSelection,
} from "./workspace-academic-scope-rules";

test("academic scope selection requires the full relational hierarchy", () => {
  assert.equal(
    validateScopeSelection({ boardId: "", qualificationId: "qualification", subjectId: "subject" }),
    "Choose a board.",
  );
  assert.equal(
    validateScopeSelection({ boardId: "board", qualificationId: "", subjectId: "subject" }),
    "Choose a qualification or class.",
  );
  assert.equal(
    validateScopeSelection({ boardId: "board", qualificationId: "qualification", subjectId: "" }),
    "Choose a subject.",
  );
  assert.equal(
    validateScopeSelection({ boardId: "board", qualificationId: "qualification", subjectId: "subject" }),
    null,
  );
});

test("scope dependencies are counted without deleting history", () => {
  const counts = {
    activeClasses: 2,
    publishedChallenges: 3,
    publishedWorkspaceContent: 1,
    activeAssignmentBatches: 4,
  };
  assert.equal(scopeDependencyTotal(counts), 10);
  assert.match(scopeDeactivationError(counts) || "", /2 active classes/);
  assert.match(scopeDeactivationError(counts) || "", /3 published workspace items/);
  assert.match(scopeDeactivationError(counts) || "", /4 active assignment batches/);
});

test("scope can be deactivated only when no active dependency remains", () => {
  assert.equal(
    scopeDeactivationError({
      activeClasses: 0,
      publishedChallenges: 0,
      publishedWorkspaceContent: 0,
      activeAssignmentBatches: 0,
    }),
    null,
  );
});
