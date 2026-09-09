import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const read = (file: string) => fs.readFileSync(file, "utf8");

test("Teacher detailed answer review stays scoped and Phase A objective-only", async (t) => {
  const results = read("src/app/workspace/assessments/[assignmentId]/AssessmentResultsClient.tsx");
  const page = read("src/app/workspace/assessments/[assignmentId]/attempts/[attemptId]/page.tsx");
  const releaseButton = read("src/app/workspace/assessments/[assignmentId]/attempts/[attemptId]/ReleaseResultButton.tsx");
  const actions = read("src/app/workspace/assessments/[assignmentId]/actions.ts");
  const engine = read("src/lib/assessments/engine.ts");
  const review = read("src/lib/assessments/teacher-review.ts");
  const studentDto = read("src/lib/assessments/student-dto.ts");

  await t.test("results expose View answers only for eligible attempt statuses", () => {
    assert.ok(results.includes("View answers"));
    assert.ok(results.includes('student.status==="GRADED"||student.status==="RELEASED"'));
    assert.ok(results.includes("/attempts/${student.attemptId}"));
  });

  await t.test("review route loads through the authenticated assessment service", () => {
    assert.ok(page.includes("assessmentService.teacherAttemptReview(assignmentId, attemptId)"));
    assert.equal(page.includes("prisma."), false);
    assert.equal(page.includes("teacherId"), false);
  });

  await t.test("review page presents all required teacher evidence", () => {
    for (const label of ["Detailed answer review", "Overall score", "Student answer", "Correct answer", "Marks awarded", "Explanation"]) {
      assert.ok(page.includes(label), label);
    }
    for (const label of ["Correct", "Incorrect", "Unanswered"]) assert.ok(page.includes(label), label);
  });

  await t.test("GRADED review reuses the existing release action and lifecycle service", () => {
    assert.ok(releaseButton.includes("releaseOnlineAssessmentResult"));
    assert.ok(releaseButton.includes("Ready to release"));
    assert.ok(releaseButton.includes("Released"));
    assert.ok(actions.includes("assessmentService.release(assignmentId,attemptId)"));
    assert.equal(releaseButton.includes("prisma"), false);
  });

  await t.test("teacher review uses immutable assessment evidence without BankQuestion access", () => {
    const method = engine.slice(engine.indexOf("async teacherAttemptReview"), engine.indexOf("async release", engine.indexOf("async teacherAttemptReview")));
    assert.ok(method.includes("assessmentAttempt.findUnique"));
    assert.ok(method.includes("responses:true"));
    assert.ok(method.includes("version:{include:{sections"));
    assert.equal(method.includes("bankQuestion"), false);
    assert.equal(method.includes("sourceSavedPaper"), false);
  });

  await t.test("review query is bounded and does not query inside a question loop", () => {
    const method = engine.slice(engine.indexOf("async teacherAttemptReview"), engine.indexOf("async release", engine.indexOf("async teacherAttemptReview")));
    assert.equal((method.match(/findUnique/g) || []).length, 1);
    assert.equal(/for\s*\([^)]*question[^)]*\)[\s\S]*?tx\./.test(method), false);
    assert.equal(/\.map\([^)]*question[\s\S]*?tx\./.test(method), false);
  });

  await t.test("client does not recalculate marks or infer correctness", () => {
    assert.equal(page.includes("objectiveResponseIsCorrect"), false);
    assert.equal(page.includes("marksAwarded ="), false);
    assert.ok(review.includes("calculatedAwardedMarks === input.awardedMarks"));
  });

  await t.test("student pre-release DTO remains a strict answer-key-free branch", () => {
    assert.ok(studentDto.includes("if(attempt.status!==\"RELEASED\")"));
    assert.ok(studentDto.includes("released:false as const"));
    assert.equal(studentDto.includes("teacherAttemptReview"), false);
  });

  await t.test("review cards wrap safely without a wide mobile table", () => {
    for (const token of ["max-w-5xl", "min-w-0", "break-words", "sm:grid-cols-2", "sm:flex-row"]) assert.ok(page.includes(token), token);
    assert.equal(page.includes("min-w-["), false);
  });

  await t.test("Phase A.1 adds no manual grading or subjective controls", () => {
    for (const forbidden of ["Save grade", "Award marks", "modelAnswer", "AI marking", "FILL_BLANK", "SHORT_ANSWER", "LONG_ANSWER"]) {
      assert.equal(page.includes(forbidden), false, forbidden);
    }
  });
});
