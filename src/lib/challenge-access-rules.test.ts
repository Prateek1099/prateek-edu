import assert from "node:assert/strict";
import test from "node:test";

import { decideChallengeAccess } from "./challenge-access-rules";

const BASE = {
  role: "STUDENT",
  action: "view" as const,
  isPublished: true,
  challengeType: "WORKSHEET",
  workspaceId: "workspace-1",
  ownsActiveWorkspace: false,
  hasExactAssignment: false,
  hasActiveWorkspaceMembership: true,
};

test("student needs an exact assignment for workspace content", () => {
  assert.equal(decideChallengeAccess(BASE).allowed, false);
  assert.equal(
    decideChallengeAccess({ ...BASE, hasExactAssignment: true }).allowed,
    true,
  );
});

test("student workspace pointer is not part of the access decision", () => {
  assert.equal("userWorkspaceId" in BASE, false);
  assert.equal(decideChallengeAccess(BASE).reason, "student_assignment_required");
});

test("student also needs active membership in the content workspace", () => {
  const result = decideChallengeAccess({
    ...BASE,
    hasExactAssignment: true,
    hasActiveWorkspaceMembership: false,
  });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "student_membership_required");
});

test("assigned students cannot view unpublished workspace drafts", () => {
  const result = decideChallengeAccess({
    ...BASE,
    isPublished: false,
    hasExactAssignment: true,
  });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "unpublished");
});

test("teacher can view and manage only their own active workspace content", () => {
  const own = decideChallengeAccess({
    ...BASE,
    role: "TEACHER",
    action: "teacher_manage",
    ownsActiveWorkspace: true,
  });
  const other = decideChallengeAccess({
    ...BASE,
    role: "TEACHER",
    action: "teacher_manage",
    ownsActiveWorkspace: false,
  });
  assert.equal(own.allowed, true);
  assert.equal(other.allowed, false);
});

test("SUPER_ADMIN retains view and management access", () => {
  assert.equal(
    decideChallengeAccess({
      ...BASE,
      role: "SUPER_ADMIN",
      isPublished: false,
      action: "view",
    }).allowed,
    true,
  );
});

test("attempts require published interactive content", () => {
  const assigned = {
    ...BASE,
    action: "attempt" as const,
    hasExactAssignment: true,
  };
  assert.equal(
    decideChallengeAccess({ ...assigned, isPublished: false }).reason,
    "unpublished",
  );
  assert.equal(
    decideChallengeAccess({ ...assigned, challengeType: "PDF_WORKSHEET" }).reason,
    "document_not_attemptable",
  );
  assert.equal(
    decideChallengeAccess({ ...assigned, challengeType: "QUICK_PRACTICE" }).allowed,
    true,
  );
});

test("published global resources retain authenticated access", () => {
  assert.equal(
    decideChallengeAccess({ ...BASE, workspaceId: null }).allowed,
    true,
  );
  assert.equal(
    decideChallengeAccess({ ...BASE, workspaceId: null, isPublished: false }).allowed,
    false,
  );
});
