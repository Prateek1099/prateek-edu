import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { PrismaClient, type BankQuestionType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { createAssessmentEngine } from "./engine";
import { assessmentTestDatabase } from "./local-test-db";
import { getAssessmentWorkState } from "./presentation";
import { AssessmentError, buildObjectiveAssessmentSnapshot, IMAGE_FREE_ERROR, objectiveResponseIsCorrect, runnerDeliveryRecovery, safeAssessmentActionError } from "./rules";

test("Online Assessment Phase A objective workflow", async (t) => {
  const { memory, pool } = await assessmentTestDatabase();
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    for (const name of fs.readdirSync("prisma/migrations").sort()) {
      const file = path.join("prisma/migrations", name, "migration.sql");
      if (fs.existsSync(file)) await memory.exec(fs.readFileSync(file, "utf8"));
    }
    await db.user.createMany({ data: [
      { id: "teacher", role: "TEACHER" }, { id: "teacher2", role: "TEACHER" },
      { id: "admin", role: "SUPER_ADMIN" }, { id: "student", role: "STUDENT", name: "One", email: "one@test.dev" },
      { id: "student2", role: "STUDENT", name: "Two", email: "two@test.dev" }, { id: "outsider", role: "STUDENT" },
    ] });
    await db.workspace.createMany({ data: [
      { id: "ws", ownerId: "teacher", name: "Teacher workspace", slug: "teacher-workspace", status: "ACTIVE" },
      { id: "ws2", ownerId: "teacher2", name: "Other workspace", slug: "other-workspace", status: "ACTIVE" },
    ] });
    await db.board.create({ data: { id: "board", name: "cbse", title: "CBSE" } });
    await db.qualification.create({ data: { id: "qualification", name: "class-12", title: "Class 12", boardId: "board" } });
    await db.subject.createMany({ data: [
      { id: "subject", qualificationId: "qualification", name: "IP", slug: "ip" },
      { id: "subject2", qualificationId: "qualification", name: "CS", slug: "cs" },
    ] });
    await db.workspaceAcademicScope.createMany({ data: [
      { workspaceId: "ws", subjectId: "subject", assignedById: "admin" },
      { workspaceId: "ws2", subjectId: "subject", assignedById: "admin" },
    ] });
    await db.class.createMany({ data: [
      { id: "class", workspaceId: "ws", subjectId: "subject", qualificationId: "qualification", name: "IP 12", academicYear: "2026", joinCode: "ONLINE1" },
      { id: "class2", workspaceId: "ws2", subjectId: "subject", qualificationId: "qualification", name: "Other", academicYear: "2026", joinCode: "ONLINE2" },
    ] });
    await db.classStudent.createMany({ data: [
      { classId: "class", studentId: "student" }, { classId: "class", studentId: "student2" },
      { classId: "class2", studentId: "outsider" },
    ] });

    async function createPaper(id: string, types: BankQuestionType[] = ["MCQ", "TRUE_FALSE", "ASSERTION_REASON"], workspaceId = "ws", ownerId = "teacher") {
      const marks = types.map((_, index) => index === 0 ? 1 : 2);
      const totalMarks = marks.reduce((sum, mark) => sum + mark, 0);
      const paper = await db.savedGeneratedPaper.create({ data: {
        id, workspaceId, createdById: ownerId, name: id, boardId: "board", qualificationId: "qualification", subjectId: "subject",
        boardTitleSnapshot: "CBSE", qualificationTitleSnapshot: "Class 12", subjectNameSnapshot: "IP",
        totalMarks, durationMinutes: 20, finalOrderMode: "CHAPTER_WISE", institutionName: "School", examLabel: "Test",
        courseLine: "IP", paperTitle: id, topicLine: "", dateText: "", classText: "", showStudentName: true,
        showRollNumber: true, instructions: "Answer all questions.",
      } });
      const section = await db.savedGeneratedPaperSection.create({ data: {
        savedPaperId: paper.id, label: "Section A", questionCount: types.length, isMixedOutput: true, sortOrder: 0,
      } });
      await db.savedGeneratedPaperQuestion.createMany({ data: types.map((questionType, index) => ({
        id: `${id}-q${index}`, savedPaperId: paper.id, sectionId: section.id, questionType,
        marks: marks[index], difficulty: "easy", sortOrder: index, finalQuestionNumber: index + 1,
        questionText: `${id} objective question ${index + 1}`,
        optionA: questionType === "MCQ" || questionType === "ASSERTION_REASON" ? "Alpha" : null,
        optionB: questionType === "MCQ" || questionType === "ASSERTION_REASON" ? "Beta" : null,
        optionC: questionType === "MCQ" || questionType === "ASSERTION_REASON" ? "Gamma" : null,
        optionD: questionType === "MCQ" || questionType === "ASSERTION_REASON" ? "Delta" : null,
        correctAnswer: questionType === "TRUE_FALSE" ? "TRUE" : questionType === "FILL_BLANK" ? "answer" : questionType === "MCQ" ? "A" : questionType === "ASSERTION_REASON" ? "B" : null,
        modelAnswer: questionType.endsWith("ANSWER") ? "Teacher model" : null,
        explanation: `Explanation ${index + 1}`,
      })) });
      return paper;
    }

    await createPaper("objective-paper");
    await createPaper("fill-paper", ["MCQ", "FILL_BLANK"]);
    await createPaper("image-paper");
    await db.savedGeneratedPaperQuestion.update({ where: { id: "image-paper-q1" }, data: { imageUrl: "https://test.public.blob.vercel-storage.com/image.png" } });
    await createPaper("other-paper", undefined, "ws2", "teacher2");

    const teacher = createAssessmentEngine(db, async () => ({ id: "teacher" }));
    const otherTeacher = createAssessmentEngine(db, async () => ({ id: "teacher2" }));
    const student = createAssessmentEngine(db, async () => ({ id: "student" }));
    const student2 = createAssessmentEngine(db, async () => ({ id: "student2" }));
    const outsider = createAssessmentEngine(db, async () => ({ id: "outsider" }));
    const admin = createAssessmentEngine(db, async () => ({ id: "admin" }));
    const window = () => ({ opensAt: new Date(Date.now() - 60_000).toISOString(), closesAt: new Date(Date.now() + 3_600_000).toISOString(), durationMinutes: 20, attemptLimit: 2 });
    const assignInput = (paper = "objective-paper") => ({ sourceSavedPaperId: paper, classId: "class", audience: "CLASS" as const, ...window() });

    await t.test("supported objective paper validates all three canonical types", async () => {
      const source = await db.savedGeneratedPaper.findUniqueOrThrow({ where: { id: "objective-paper" }, include: { sections: { include: { questions: true } } } });
      assert.deepEqual(buildObjectiveAssessmentSnapshot(source).sections[0].questions.map((question) => question.questionType), ["MCQ", "TRUE_FALSE", "ASSERTION_REASON"]);
    });
    await t.test("Fill Blank blocks the whole paper without partial assessment data", async () => {
      const before = await Promise.all([db.assessment.count(), db.assessmentVersion.count(), db.assessmentAssignment.count()]);
      await assert.rejects(teacher.createAndAssignFromSavedPaper(assignInput("fill-paper")), /Fill in the Blank/);
      assert.deepEqual(await Promise.all([db.assessment.count(), db.assessmentVersion.count(), db.assessmentAssignment.count()]), before);
    });
    await t.test("image blocks the whole paper without partial assessment data", async () => {
      const before = await Promise.all([db.assessment.count(), db.assessmentVersion.count(), db.assessmentAssignment.count()]);
      await assert.rejects(teacher.createAndAssignFromSavedPaper(assignInput("image-paper")), { message: IMAGE_FREE_ERROR });
      assert.deepEqual(await Promise.all([db.assessment.count(), db.assessmentVersion.count(), db.assessmentAssignment.count()]), before);
    });
    await t.test("an older unsupported A0 version cannot enter objective grading even when unanswered", async () => {
      const legacy = await teacher.createFromSavedPaper("fill-paper");
      const assigned = await teacher.assign({ versionId: legacy.versionId, classId: "class", audience: "SELECTED_STUDENTS", studentIds: ["student"], ...window(), attemptLimit: 1 });
      const legacyRecipient = await db.assessmentRecipient.findFirstOrThrow({ where: { assignmentId: assigned.assignmentId } });
      const legacyAttempt = await student.startOrResume(legacyRecipient.id);
      await assert.rejects(student.submitObjective(legacyAttempt.id), { code: "INVALID_SOURCE" });
      assert.equal((await db.assessmentAttempt.findUniqueOrThrow({ where: { id: legacyAttempt.id } })).status, "IN_PROGRESS");
    });
    await t.test("other workspace paper and class are rejected", async () => {
      await assert.rejects(teacher.createAndAssignFromSavedPaper(assignInput("other-paper")), { code: "NOT_FOUND" });
      await assert.rejects(teacher.createAndAssignFromSavedPaper({ ...assignInput(), classId: "class2" }), { code: "FORBIDDEN" });
    });
    await t.test("SUPER_ADMIN and student cannot use teacher assignment service", async () => {
      await assert.rejects(admin.createAndAssignFromSavedPaper(assignInput()), { code: "FORBIDDEN" });
      await assert.rejects(student.createAndAssignFromSavedPaper(assignInput()), { code: "FORBIDDEN" });
    });
    await t.test("inactive academic scope rejects creation before writes", async () => {
      const before = await db.assessment.count();
      await db.workspaceAcademicScope.update({ where: { workspaceId_subjectId: { workspaceId: "ws", subjectId: "subject" } }, data: { status: "INACTIVE" } });
      await assert.rejects(teacher.createAndAssignFromSavedPaper(assignInput()), { code: "FORBIDDEN" });
      assert.equal(await db.assessment.count(), before);
      await db.workspaceAcademicScope.update({ where: { workspaceId_subjectId: { workspaceId: "ws", subjectId: "subject" } }, data: { status: "ACTIVE" } });
    });
    await t.test("inactive and duplicate selected recipients are rejected", async () => {
      await db.classStudent.update({ where: { classId_studentId: { classId: "class", studentId: "student2" } }, data: { status: "REMOVED" } });
      await assert.rejects(teacher.createAndAssignFromSavedPaper({ ...assignInput(), audience: "SELECTED_STUDENTS", studentIds: ["student2"] }), { code: "FORBIDDEN" });
      await db.classStudent.update({ where: { classId_studentId: { classId: "class", studentId: "student2" } }, data: { status: "ACTIVE" } });
      await assert.rejects(teacher.createAndAssignFromSavedPaper({ ...assignInput(), audience: "SELECTED_STUDENTS", studentIds: ["student", "student"] }), { code: "FORBIDDEN" });
    });
    await t.test("ASSIGNED event failure rolls back assessment, version, assignment and recipients", async () => {
      await createPaper("rollback-paper");
      const before = await Promise.all([db.assessment.count(), db.assessmentVersion.count(), db.assessmentAssignment.count(), db.assessmentRecipient.count()]);
      await memory.exec("CREATE FUNCTION fail_assigned_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.type = 'ASSIGNED' THEN RAISE EXCEPTION 'event failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_assigned_event BEFORE INSERT ON assessment_events FOR EACH ROW EXECUTE FUNCTION fail_assigned_event();");
      try { await assert.rejects(teacher.createAndAssignFromSavedPaper(assignInput("rollback-paper"))); }
      finally { await memory.exec("DROP TRIGGER fail_assigned_event ON assessment_events; DROP FUNCTION fail_assigned_event();"); }
      assert.deepEqual(await Promise.all([db.assessment.count(), db.assessmentVersion.count(), db.assessmentAssignment.count(), db.assessmentRecipient.count()]), before);
    });

    let assignmentId = "";
    let recipientId = "";
    let student2RecipientId = "";
    await t.test("whole-class creation is atomic and snapshots exact active recipients", async () => {
      const result = await teacher.createAndAssignFromSavedPaper(assignInput());
      assignmentId = result.assignmentId;
      assert.equal(result.recipientCount, 2);
      const recipients = await db.assessmentRecipient.findMany({ where: { assignmentId }, orderBy: { studentId: "asc" } });
      assert.deepEqual(recipients.map((recipient) => recipient.studentId), ["student", "student2"]);
      recipientId = recipients.find((recipient) => recipient.studentId === "student")!.id;
      student2RecipientId = recipients.find((recipient) => recipient.studentId === "student2")!.id;
      assert.equal(await db.assessmentEvent.count({ where: { assignmentId, type: "ASSIGNED" } }), 1);
    });
    await t.test("later source edits and archive cannot change immutable delivery", async () => {
      await db.savedGeneratedPaperQuestion.update({ where: { id: "objective-paper-q0" }, data: { questionText: "MUTATED SOURCE" } });
      await db.savedGeneratedPaper.update({ where: { id: "objective-paper" }, data: { archivedAt: new Date() } });
      const version = await db.assessmentAssignment.findUniqueOrThrow({ where: { id: assignmentId }, select: { version: { select: { questions: { orderBy: { questionNumber: "asc" } } } } } });
      assert.equal(version.version.questions[0].questionText, "objective-paper objective question 1");
      await db.savedGeneratedPaper.update({ where: { id: "objective-paper" }, data: { archivedAt: null } });
    });
    await t.test("selected-student assignment contains exactly the chosen recipient", async () => {
      const selected = await teacher.createAndAssignFromSavedPaper({ ...assignInput(), audience: "SELECTED_STUDENTS", studentIds: ["student"] });
      assert.equal(selected.recipientCount, 1);
      assert.deepEqual((await db.assessmentRecipient.findMany({ where: { assignmentId: selected.assignmentId } })).map((row) => row.studentId), ["student"]);
    });
    await t.test("student Assigned Work is exact, scoped and status is server-derived", async () => {
      const work = await student.listStudentWork();
      const item = work.items.find((row) => row.assignmentId === assignmentId)!;
      assert.equal(item.classId, "class"); assert.equal(item.questionCount, 3); assert.equal(item.totalMarks, 5);
      assert.equal(getAssessmentWorkState(item, work.serverNow), "AVAILABLE");
      assert.equal((await outsider.listStudentWork()).items.length, 0);
    });
    await t.test("before-open and after-close assignments reject starts", async () => {
      const versionId = (await db.assessmentAssignment.findUniqueOrThrow({ where: { id: assignmentId } })).versionId;
      const future = await teacher.assign({ versionId, classId: "class", audience: "SELECTED_STUDENTS", studentIds: ["student"], ...window(), opensAt: new Date(Date.now() + 60_000).toISOString() });
      const futureRecipient = await db.assessmentRecipient.findFirstOrThrow({ where: { assignmentId: future.assignmentId } });
      await assert.rejects(student.startOrResume(futureRecipient.id), { code: "WINDOW_CLOSED" });
      await assert.rejects(teacher.assign({ versionId, classId: "class", audience: "CLASS", ...window(), closesAt: new Date(Date.now() - 1_000).toISOString() }), { code: "WINDOW_CLOSED" });
    });
    await t.test("unauthorized and wrong-recipient starts are rejected", async () => {
      await assert.rejects(outsider.startOrResume(recipientId), { code: "FORBIDDEN" });
      await assert.rejects(student2.startOrResume(recipientId), { code: "FORBIDDEN" });
    });

    let attemptId = "";
    await t.test("start is idempotent and creates one attempt with durable unanswered rows", async () => {
      const starts = await Promise.all([student.startOrResume(recipientId), student.startOrResume(recipientId), student.startOrResume(recipientId)]);
      assert.equal(new Set(starts.map((attempt) => attempt.id)).size, 1);
      attemptId = starts[0].id;
      assert.equal(await db.assessmentEvent.count({ where: { attemptId, type: "ATTEMPT_STARTED" } }), 1);
      const responses = await db.assessmentResponse.findMany({ where: { attemptId } });
      assert.equal(responses.length, 3); assert.ok(responses.every((response) => response.state === "UNANSWERED" && response.revision === 0));
    });
    await t.test("refresh resumes same attempt, deadline and safe delivery", async () => {
      const resumed = await student.startOrResume(recipientId);
      const first = await student.delivery(attemptId); const second = await student.delivery(attemptId);
      assert.equal(resumed.id, attemptId); assert.equal(first.attempt.expiresAt, second.attempt.expiresAt);
      const serialized = JSON.stringify(first);
      for (const secret of ["correctAnswer", "modelAnswer", "explanation", "awardedMarks", "markingScheme"]) assert.equal(serialized.includes(secret), false, secret);
    });
    await t.test("generic LOCKED runner recovery never finalizes and the same attempt remains resumable", async () => {
      const beforeEvents = await db.assessmentEvent.count({ where: { attemptId, type: { in: ["ATTEMPT_SUBMITTED", "GRADE_CHANGED"] } } });
      assert.equal(runnerDeliveryRecovery(new AssessmentError("LOCKED", "Temporary runner load failure.")), "RETRY");
      assert.equal((await db.assessmentAttempt.findUniqueOrThrow({ where: { id: attemptId } })).status, "IN_PROGRESS");
      assert.equal(await db.assessmentEvent.count({ where: { attemptId, type: { in: ["ATTEMPT_SUBMITTED", "GRADE_CHANGED"] } } }), beforeEvents);
      assert.equal((await student.delivery(attemptId)).attempt.id, attemptId);
    });
    await t.test("serialization or deadlock exhaustion remains recoverable without lifecycle mutation", async () => {
      const beforeEvents = await db.assessmentEvent.count({ where: { attemptId } });
      assert.equal(runnerDeliveryRecovery(new AssessmentError("LOCKED", "This assessment changed concurrently. Please retry.")), "RETRY");
      const attempt = await db.assessmentAttempt.findUniqueOrThrow({ where: { id: attemptId } });
      assert.equal(attempt.status, "IN_PROGRESS"); assert.equal(attempt.submittedAt, null); assert.equal(attempt.gradedAt, null);
      assert.equal(await db.assessmentEvent.count({ where: { attemptId } }), beforeEvents);
    });
    await t.test("assessment clock failure remains recoverable without lifecycle mutation", async () => {
      const beforeEvents = await db.assessmentEvent.count({ where: { attemptId } });
      assert.equal(runnerDeliveryRecovery(new AssessmentError("LOCKED", "Assessment clock is unavailable.")), "RETRY");
      const attempt = await db.assessmentAttempt.findUniqueOrThrow({ where: { id: attemptId } });
      assert.equal(attempt.status, "IN_PROGRESS"); assert.equal(attempt.submittedAt, null); assert.equal(attempt.gradedAt, null);
      assert.equal(await db.assessmentEvent.count({ where: { attemptId } }), beforeEvents);
    });
    await t.test("a forged expiry finalization request cannot submit an unexpired attempt", async () => {
      const beforeEvents = await db.assessmentEvent.count({ where: { attemptId } });
      await assert.rejects(student.finalizeExpiredObjective(attemptId), { code: "LOCKED" });
      const attempt = await db.assessmentAttempt.findUniqueOrThrow({ where: { id: attemptId } });
      assert.equal(attempt.status, "IN_PROGRESS"); assert.equal(attempt.submittedAt, null); assert.equal(attempt.gradedAt, null);
      assert.equal(await db.assessmentEvent.count({ where: { attemptId } }), beforeEvents);
    });
    await t.test("assessment action errors preserve domain messages and sanitize unexpected failures", () => {
      assert.equal(safeAssessmentActionError(new AssessmentError("INVALID_INPUT", "Choose an answer."), "Safe fallback.", "test"), "Choose an answer.");
      const original = console.error;
      let logged = false;
      console.error = () => { logged = true; };
      try {
        assert.equal(safeAssessmentActionError(new Error("postgresql://internal-host/private"), "Safe fallback.", "test"), "Safe fallback.");
        assert.equal(logged, true);
      } finally { console.error = original; }
    });
    const questions = await db.assessmentQuestion.findMany({ where: { version: { assignments: { some: { id: assignmentId } } } }, orderBy: { questionNumber: "asc" } });
    await t.test("revision-safe autosave survives reload and rejects stale overwrite", async () => {
      assert.equal((await student.saveResponse(attemptId, questions[0].id, 0, { kind: "choice", value: "A" })).revision, 1);
      await assert.rejects(student.saveResponse(attemptId, questions[0].id, 0, { kind: "choice", value: "D" }), { code: "STALE_RESPONSE" });
      const reload = await student.delivery(attemptId);
      assert.deepEqual(reload.responses.find((response) => response.questionId === questions[0].id)?.value, { kind: "choice", value: "A" });
    });
    await t.test("TRUE_FALSE and ASSERTION_REASON responses use canonical shapes", async () => {
      await student.saveResponse(attemptId, questions[1].id, 0, { kind: "boolean", value: false });
      await student.saveResponse(attemptId, questions[2].id, 0, { kind: "choice", value: "A" });
      assert.equal(objectiveResponseIsCorrect("TRUE_FALSE", "TRUE", { kind: "boolean", value: true }), true);
      assert.equal(objectiveResponseIsCorrect("ASSERTION_REASON", "B", { kind: "choice", value: "B" }), true);
    });
    await t.test("another student cannot read or write exact attempt responses", async () => {
      await assert.rejects(student2.delivery(attemptId), { code: "FORBIDDEN" });
      await assert.rejects(student2.saveResponse(attemptId, questions[0].id, 1, { kind: "choice", value: "B" }), { code: "FORBIDDEN" });
    });
    await t.test("grade event failure rolls submission and score back atomically", async () => {
      await memory.exec("CREATE FUNCTION fail_grade_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.type = 'GRADE_CHANGED' THEN RAISE EXCEPTION 'grade event failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_grade_event BEFORE INSERT ON assessment_events FOR EACH ROW EXECUTE FUNCTION fail_grade_event();");
      try { await assert.rejects(student.submitObjective(attemptId)); }
      finally { await memory.exec("DROP TRIGGER fail_grade_event ON assessment_events; DROP FUNCTION fail_grade_event();"); }
      const attempt = await db.assessmentAttempt.findUniqueOrThrow({ where: { id: attemptId } });
      assert.equal(attempt.status, "IN_PROGRESS"); assert.equal(attempt.submittedAt, null); assert.equal(attempt.awardedMarks, null);
      assert.equal(await db.assessmentEvent.count({ where: { attemptId, type: "ATTEMPT_SUBMITTED" } }), 0);
    });
    await t.test("objective submission is weighted, allows wrong/unanswered and grades 1/5 as 20%", async () => {
      const submitted = await student.submitObjective(attemptId);
      assert.equal(submitted.status, "GRADED");
      const attempt = await db.assessmentAttempt.findUniqueOrThrow({ where: { id: attemptId } });
      assert.equal(Number(attempt.awardedMarks), 1);
      assert.equal(await db.assessmentEvent.count({ where: { attemptId, type: "ATTEMPT_SUBMITTED" } }), 1);
      assert.equal(await db.assessmentEvent.count({ where: { attemptId, type: "GRADE_CHANGED" } }), 1);
      const teacherView = await teacher.teacherResults(assignmentId);
      assert.equal(teacherView.students.find((row) => row.studentId === "student")?.percentage, 20);
    });
    await t.test("double submission/grading is idempotent and responses are frozen", async () => {
      const again = await student.submitObjective(attemptId); assert.equal(again.status, "GRADED");
      assert.equal(await db.assessmentEvent.count({ where: { attemptId, type: "GRADE_CHANGED" } }), 1);
      await assert.rejects(student.saveResponse(attemptId, questions[0].id, 1, { kind: "choice", value: "B" }), { code: "LOCKED" });
      await assert.rejects(db.assessmentResponse.updateMany({ where: { attemptId }, data: { revision: { increment: 1 } } }));
    });
    await t.test("unreleased student payload hides score, answers and explanations", async () => {
      const result = await student.studentResult(attemptId);
      assert.equal(result.released, false);
      const serialized = JSON.stringify(result);
      for (const secret of ["awardedMarks", "percentage", "correctAnswer", "correctResponse", "modelAnswer", "explanation", "responses"]) assert.equal(serialized.includes(secret), false, secret);
      assert.deepEqual(Object.keys(result).sort(), ["released", "status", "submittedAt", "title"]);
    });
    await t.test("wrong workspace teacher, admin and another student cannot release/read result", async () => {
      await assert.rejects(otherTeacher.release(assignmentId, attemptId), { code: "FORBIDDEN" });
      await assert.rejects(admin.release(assignmentId, attemptId), { code: "FORBIDDEN" });
      await assert.rejects(teacher.release("wrong-assignment", attemptId), { code: "FORBIDDEN" });
      await assert.rejects(student2.studentResult(attemptId), { code: "FORBIDDEN" });
    });
    await t.test("release event failure rolls RELEASED state back", async () => {
      await memory.exec("CREATE FUNCTION fail_release_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.type = 'RESULT_RELEASED' THEN RAISE EXCEPTION 'release event failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_release_event BEFORE INSERT ON assessment_events FOR EACH ROW EXECUTE FUNCTION fail_release_event();");
      try { await assert.rejects(teacher.release(assignmentId, attemptId)); }
      finally { await memory.exec("DROP TRIGGER fail_release_event ON assessment_events; DROP FUNCTION fail_release_event();"); }
      assert.equal((await db.assessmentAttempt.findUniqueOrThrow({ where: { id: attemptId } })).status, "GRADED");
    });
    await t.test("teacher release is idempotent and exact student gets released review", async () => {
      assert.equal((await teacher.release(assignmentId, attemptId)).status, "RELEASED");
      assert.equal((await teacher.release(assignmentId, attemptId)).status, "RELEASED");
      assert.equal(await db.assessmentEvent.count({ where: { attemptId, type: "RESULT_RELEASED" } }), 1);
      const result = await student.studentResult(attemptId);
      assert.equal(result.released, true);
      if (!result.released) return;
      assert.equal(result.awardedMarks, 1); assert.equal(result.totalMarks, 5); assert.equal(result.percentage, 20);
      assert.equal(result.paper.sections[0].questions[0].correct, true);
      assert.equal(result.paper.sections[0].questions[1].correct, false);
      assert.equal(result.paper.sections[0].questions[0].explanation, "Explanation 1");
      assert.equal(JSON.stringify(result).includes("modelAnswer"), false);
    });
    await t.test("unanswered submission earns zero and objective type marks are exact", async () => {
      const attempt = await student2.startOrResume(student2RecipientId);
      assert.equal((await student2.submitObjective(attempt.id)).status, "GRADED");
      assert.equal(Number((await db.assessmentAttempt.findUniqueOrThrow({ where: { id: attempt.id } })).awardedMarks), 0);
    });
    await t.test("TRUE_FALSE and ASSERTION_REASON award their immutable weighted marks", async () => {
      const versionId = (await db.assessmentAssignment.findUniqueOrThrow({ where: { id: assignmentId } })).versionId;
      const selected = await teacher.assign({ versionId, classId: "class", audience: "SELECTED_STUDENTS", studentIds: ["student2"], ...window(), attemptLimit: 1 });
      const selectedRecipient = await db.assessmentRecipient.findFirstOrThrow({ where: { assignmentId: selected.assignmentId } });
      const selectedAttempt = await student2.startOrResume(selectedRecipient.id);
      await student2.saveResponse(selectedAttempt.id, questions[1].id, 0, { kind: "boolean", value: true });
      await student2.saveResponse(selectedAttempt.id, questions[2].id, 0, { kind: "choice", value: "B" });
      await student2.submitObjective(selectedAttempt.id);
      assert.equal(Number((await db.assessmentAttempt.findUniqueOrThrow({ where: { id: selectedAttempt.id } })).awardedMarks), 4);
    });
    await t.test("attempt limit permits exact next attempt and blocks one beyond limit", async () => {
      const second = await student.startOrResume(recipientId);
      assert.equal(second.attemptNumber, 2);
      await student.submitObjective(second.id);
      await assert.rejects(student.startOrResume(recipientId), { code: "ATTEMPT_LIMIT" });
    });
    await t.test("expired attempts freeze late answers but finalize saved evidence", async () => {
      const versionId = (await db.assessmentAssignment.findUniqueOrThrow({ where: { id: assignmentId } })).versionId;
      const closing = new Date(Date.now() + 1_200).toISOString();
      const short = await teacher.assign({ versionId, classId: "class", audience: "SELECTED_STUDENTS", studentIds: ["student"], ...window(), closesAt: closing, durationMinutes: 10, attemptLimit: 1 });
      const shortRecipient = await db.assessmentRecipient.findFirstOrThrow({ where: { assignmentId: short.assignmentId } });
      const shortAttempt = await student.startOrResume(shortRecipient.id);
      await student.saveResponse(shortAttempt.id, questions[0].id, 0, { kind: "choice", value: "A" });
      await new Promise((resolve) => setTimeout(resolve, 1_250));
      await assert.rejects(student.delivery(shortAttempt.id), { code: "ATTEMPT_EXPIRED" });
      assert.equal(runnerDeliveryRecovery(new AssessmentError("ATTEMPT_EXPIRED", "This online test has expired.")), "FINALIZE_EXPIRED");
      await assert.rejects(student.saveResponse(shortAttempt.id, questions[0].id, 1, { kind: "choice", value: "B" }), { code: "LOCKED" });
      assert.equal((await student.finalizeExpiredObjective(shortAttempt.id)).status, "GRADED");
      assert.equal(Number((await db.assessmentAttempt.findUniqueOrThrow({ where: { id: shortAttempt.id } })).awardedMarks), 1);
    });
    await t.test("cancellation and revocation block future runner access without deleting history", async () => {
      const versionId = (await db.assessmentAssignment.findUniqueOrThrow({ where: { id: assignmentId } })).versionId;
      const revokedAssignment = await teacher.assign({ versionId, classId: "class", audience: "SELECTED_STUDENTS", studentIds: ["student"], ...window() });
      const revokedRecipient = await db.assessmentRecipient.findFirstOrThrow({ where: { assignmentId: revokedAssignment.assignmentId } });
      const revokedAttempt = await student.startOrResume(revokedRecipient.id);
      await teacher.revoke(revokedRecipient.id);
      await assert.rejects(student.delivery(revokedAttempt.id), { code: "FORBIDDEN" });
      assert.equal(await db.assessmentAttempt.count({ where: { id: revokedAttempt.id } }), 1);
      const cancelled = await teacher.assign({ versionId, classId: "class", audience: "SELECTED_STUDENTS", studentIds: ["student"], ...window() });
      const cancelledRecipient = await db.assessmentRecipient.findFirstOrThrow({ where: { assignmentId: cancelled.assignmentId } });
      await teacher.cancel(cancelled.assignmentId);
      await assert.rejects(student.startOrResume(cancelledRecipient.id), { code: "FORBIDDEN" });
    });
    await t.test("teacher results use one scoped assignment and expose compact summary", async () => {
      const results = await teacher.teacherResults(assignmentId);
      assert.equal(results.summary.assigned, 2); assert.equal(results.students.length, 2);
      assert.equal(results.students.find((row) => row.studentId === "student")?.status, "GRADED");
      assert.equal(results.students.find((row) => row.studentId === "student2")?.status, "GRADED");
    });
    await t.test("inactive class membership denies resume, result and Assigned Work", async () => {
      await db.classStudent.update({ where: { classId_studentId: { classId: "class", studentId: "student2" } }, data: { status: "REMOVED" } });
      await assert.rejects(student2.studentResult((await db.assessmentAttempt.findFirstOrThrow({ where: { recipientId: student2RecipientId } })).id), { code: "FORBIDDEN" });
      assert.equal((await student2.listStudentWork()).items.some((item) => item.assignmentId === assignmentId), false);
    });
    await t.test("assessment lifecycle does not write ChallengeAttempt, mistakes or legacy assignments", async () => {
      assert.equal(await db.challengeAttempt.count(), 0);
      assert.equal(await db.mistakeEntry.count(), 0);
      assert.equal(await db.workspaceAssignmentBatch.count(), 0);
      assert.equal(await db.workspaceAssignmentRecipient.count(), 0);
    });
  } finally {
    await db.$disconnect();
    await pool.end();
    await memory.close();
  }
});
