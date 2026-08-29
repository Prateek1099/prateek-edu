import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { PaperBuilderQuestion, ValidatedPaper } from "./types";
import {
  savedPaperSnapshotToValidatedPaper,
  validateAndApplyFinalOrder,
  validateSourceVersions,
} from "./saved-paper-rules";

function question(id: string, type: PaperBuilderQuestion["questionType"] = "MCQ", marks = 1): PaperBuilderQuestion {
  return {
    id,
    sourceUpdatedAt: `2026-08-22T00:00:0${id.length}.000Z`,
    subjectId: "subject",
    topicId: "topic",
    questionType: type,
    questionText: `Question ${id}`,
    optionA: type === "MCQ" ? "A" : null,
    optionB: type === "MCQ" ? "B" : null,
    optionC: type === "MCQ" ? "C" : null,
    optionD: type === "MCQ" ? "D" : null,
    correctAnswer: type === "MCQ" ? "A" : null,
    modelAnswer: type === "MCQ" ? null : `Model ${id}`,
    explanation: `Explain ${id}`,
    source: "NCERT",
    imageUrl: null,
    imageAlt: null,
    imageCaption: null,
    topicTag: null,
    difficulty: "easy",
    marks,
    topicName: "Chapter 1",
  };
}

function paper(): ValidatedPaper {
  return {
    details: { institutionName: "Vexa", examLabel: "Test", title: "", courseLine: "IP", topicLine: "SQL", durationMinutes: 30, dateText: "", classText: "12", showStudentName: true, showRollNumber: true, instructions: "Attempt all." },
    boardTitle: "CBSE",
    qualificationTitle: "Class 12",
    subjectName: "IP",
    topicNames: ["Chapter 1"],
    totalMarks: 5,
    sections: [
      { patternId: "a", label: "Section A", questionType: "MCQ", questionCount: 2, marksPerQuestion: 1, difficulty: "any", questions: [question("q1"), question("q2")] },
      { patternId: "b", label: "Section B", questionType: "SHORT_ANSWER", questionCount: 1, marksPerQuestion: 3, difficulty: "any", questions: [question("q3", "SHORT_ANSWER", 3)] },
    ],
  };
}

function snapshot() {
  return {
    boardTitleSnapshot: "CBSE",
    qualificationTitleSnapshot: "Class 12",
    subjectId: "subject",
    subjectNameSnapshot: "IP",
    totalMarks: 5,
    durationMinutes: 30,
    institutionName: "Vexa",
    examLabel: "Test",
    courseLine: "IP",
    paperTitle: "SQL",
    topicLine: "Chapter 1",
    dateText: "",
    classText: "12",
    showStudentName: true,
    showRollNumber: true,
    instructions: "Attempt all.",
    sections: [
      {
        id: "saved-section-a", label: "Section A", questionType: "MCQ" as const, questionCount: 2, marksPerQuestion: 1, isMixedOutput: false, sortOrder: 0,
        questions: [snapshotQuestion("saved-q1", "bank-q1", 0, 1), snapshotQuestion("saved-q2", "bank-q2", 1, 2)],
      },
      {
        id: "saved-section-b", label: "Section B", questionType: "SHORT_ANSWER" as const, questionCount: 1, marksPerQuestion: 3, isMixedOutput: false, sortOrder: 1,
        questions: [snapshotQuestion("saved-q3", "bank-q3", 0, 3, "SHORT_ANSWER", 3)],
      },
    ],
  };
}

function snapshotQuestion(id: string, originalId: string | null, sortOrder: number, finalQuestionNumber: number, questionType: PaperBuilderQuestion["questionType"] = "MCQ", marks = 1) {
  return { id, originalBankQuestionId: originalId, topicId: "topic", topicNameSnapshot: "Chapter 1", questionType, marks, difficulty: "easy", source: "NCERT", sortOrder, finalQuestionNumber, questionText: `Snapshot ${id}`, optionA: questionType === "MCQ" ? "A" : null, optionB: questionType === "MCQ" ? "B" : null, optionC: questionType === "MCQ" ? "C" : null, optionD: questionType === "MCQ" ? "D" : null, correctAnswer: questionType === "MCQ" ? "A" : null, modelAnswer: questionType === "MCQ" ? null : "Model", explanation: "Explanation", imageUrl: null, imageAlt: null, imageCaption: null };
}

test("missing, extra, and duplicate final order IDs are rejected", () => {
  const source = paper();
  assert.equal(validateAndApplyFinalOrder(source, "fully_shuffled", ["q1", "q2"]).success, false);
  assert.equal(validateAndApplyFinalOrder(source, "fully_shuffled", ["q1", "q2", "q3", "q4"]).success, false);
  assert.equal(validateAndApplyFinalOrder(source, "fully_shuffled", ["q1", "q1", "q3"]).success, false);
});

test("chapter-wise, section shuffle, and full shuffle preserve exact accepted order", () => {
  const source = paper();
  assert.equal(validateAndApplyFinalOrder(source, "chapter_wise", ["q1", "q2", "q3"]).success, true);
  const sectionShuffle = validateAndApplyFinalOrder(source, "shuffle_within_sections", ["q2", "q1", "q3"]);
  assert.equal(sectionShuffle.success, true);
  if (sectionShuffle.success) assert.deepEqual(sectionShuffle.paper.sections.flatMap((section) => section.questions.map((item) => item.id)), ["q2", "q1", "q3"]);
  const full = validateAndApplyFinalOrder(source, "fully_shuffled", ["q3", "q1", "q2"]);
  assert.equal(full.success, true);
  if (full.success) assert.deepEqual(full.paper.sections[0].questions.map((item) => item.id), ["q3", "q1", "q2"]);
});

test("marks are recalculated and mismatches are rejected", () => {
  const source = paper();
  source.totalMarks = 99;
  assert.equal(validateAndApplyFinalOrder(source, "chapter_wise", ["q1", "q2", "q3"]).success, false);
});

test("stale and duplicate source version payloads are rejected", () => {
  const questions = paper().sections.flatMap((section) => section.questions);
  const valid = questions.map((item) => ({ id: item.id, updatedAt: item.sourceUpdatedAt! }));
  assert.equal(validateSourceVersions(questions, valid), null);
  assert.match(validateSourceVersions(questions, valid.slice(1)) ?? "", /versions are incomplete/);
  assert.match(validateSourceVersions(questions, valid.map((item) => ({ ...item, updatedAt: "stale" }))) ?? "", /changed after preview/);
});

test("saved snapshots adapt to mixed ValidatedPaper output without current BankQuestion content", () => {
  const adapted = savedPaperSnapshotToValidatedPaper(snapshot());
  assert.deepEqual(adapted.sections.flatMap((section) => section.questions.map((item) => item.id)), ["saved-q1", "saved-q2", "saved-q3"]);
  assert.equal(adapted.sections[1].questions[0].modelAnswer, "Model");
  assert.equal(adapted.sections[0].questions[0].questionText, "Snapshot saved-q1");
});

test("deleted BankQuestion references do not affect the authoritative snapshot", () => {
  const value = snapshot();
  value.sections[0].questions[0].originalBankQuestionId = null;
  assert.equal(savedPaperSnapshotToValidatedPaper(value).sections[0].questions[0].questionText, "Snapshot saved-q1");
});

test("non-contiguous numbering, incomplete sections, and invalid stored totals are rejected", () => {
  const badNumber = snapshot(); badNumber.sections[1].questions[0].finalQuestionNumber = 4;
  assert.throws(() => savedPaperSnapshotToValidatedPaper(badNumber), /numbering is invalid/);
  const incomplete = snapshot(); incomplete.sections[0].questionCount = 3;
  assert.throws(() => savedPaperSnapshotToValidatedPaper(incomplete), /section is incomplete/);
  const badMarks = snapshot(); badMarks.totalMarks = 20;
  assert.throws(() => savedPaperSnapshotToValidatedPaper(badMarks), /marks are invalid/);
});

const actions = readFileSync(new URL("../../app/admin/paper-builder/archive/actions.ts", import.meta.url), "utf8");
const service = readFileSync(new URL("./saved-paper-service.ts", import.meta.url), "utf8");
const schema = readFileSync(new URL("../../../prisma/schema.prisma", import.meta.url), "utf8");

test("every archive action independently enforces SUPER_ADMIN", () => {
  for (const name of ["saveGeneratedPaper", "listSavedGeneratedPapers", "getSavedGeneratedPaper", "archiveSavedGeneratedPaper", "restoreSavedGeneratedPaper", "deleteArchivedGeneratedPaper"]) {
    const body = actions.slice(actions.indexOf(`export async function ${name}`), actions.indexOf(`export async function ${name}`) + 650);
    assert.match(body, /requireSuperAdmin\(\)/, `${name} must authorize independently`);
  }
});

test("save mutates only archive aggregates and never attempts, progress, BankQuestion, or templates", () => {
  assert.match(actions, /persistSavedGeneratedPaper/);
  assert.match(service, /savedGeneratedPaper\.create/);
  assert.match(actions, /validateBlueprintSelection\(input\.draft, input\.selections\)/);
  assert.doesNotMatch(service, /bankQuestion\.(create|update|delete)/);
  assert.doesNotMatch(service, /(?:challengeAttempt|userProgress|mistakeEntry|paperBlueprintTemplate)\.(create|update|delete)/);
});

test("schema uses SetNull traceability and archive-first deletion", () => {
  assert.match(schema, /originalBankQuestion[\s\S]*?onDelete: SetNull/);
  assert.match(schema, /sourceBlueprintTemplate[\s\S]*?onDelete: SetNull/);
  assert.match(actions, /Archive this paper before permanently deleting it/);
});

test("image-copy failure cleans uploads and prevents silent source URL fallback", () => {
  assert.match(service, /copyPaperQuestionImages\(input\.paper, savedPaperId\)/);
  assert.match(service, /deleteArchivedQuestionImages\(copiedImages\.uploadedUrls\)/);
  assert.match(service, /archivedImageUrl\(question\.imageUrl, copiedImages!\.bySourceUrl\)/);
  assert.match(service, /A question image was not copied into Paper Archive/);
});
