import assert from "node:assert/strict";
import test from "node:test";

import {
  getSafeStudentReturnPath,
  getStudentReturnLabel,
  withStudentReturnTo,
} from "./student-assignment-navigation";

test("class assignment navigation preserves the exact student class page", () => {
  const classPath = "/dashboard/classes/class_123-safe";
  assert.equal(getSafeStudentReturnPath(classPath, "/resources/cbse/class-12/ip"), classPath);
  assert.equal(getStudentReturnLabel(classPath, "Back to Practice"), "Back to Class");
  assert.equal(
    withStudentReturnTo("/resources/cbse/class-12/ip/worksheet/worksheet-1", classPath),
    "/resources/cbse/class-12/ip/worksheet/worksheet-1?returnTo=%2Fdashboard%2Fclasses%2Fclass_123-safe",
  );
});

test("assigned-work and dashboard return paths remain available", () => {
  assert.equal(getSafeStudentReturnPath("/dashboard/worksheets", "/resources"), "/dashboard/worksheets");
  assert.equal(getSafeStudentReturnPath("/dashboard", "/resources"), "/dashboard");
  assert.equal(getStudentReturnLabel("/dashboard/worksheets", "Back"), "Back to Assigned Work");
  assert.equal(getStudentReturnLabel("/dashboard", "Back"), "Back to Dashboard");
});

test("public navigation keeps its public fallback", () => {
  const fallback = "/resources/cbse/class-12/informatics-practices";
  assert.equal(getSafeStudentReturnPath(undefined, fallback), fallback);
  assert.equal(getStudentReturnLabel(fallback, "Back to subject"), "Back to subject");
});

test("external and malformed return paths are rejected", () => {
  const fallback = "/resources/cbse/class-12/informatics-practices";
  for (const unsafe of [
    "https://example.com",
    "//example.com",
    "/dashboard/../admin",
    "/dashboard/classes/class-1?next=https://example.com",
    "/admin",
  ]) {
    assert.equal(getSafeStudentReturnPath(unsafe, fallback), fallback);
  }
});
