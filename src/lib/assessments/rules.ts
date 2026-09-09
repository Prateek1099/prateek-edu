import type { BankQuestionType, Prisma } from "@prisma/client";
import { validateBankQuestionInput } from "@/lib/bank-questions";

export type AssessmentErrorCode = "FORBIDDEN" | "INVALID_SOURCE" | "MEDIA_UNSUPPORTED" | "INVALID_INPUT" | "WINDOW_CLOSED" | "ATTEMPT_LIMIT" | "ATTEMPT_EXPIRED" | "ATTEMPT_FINALIZED" | "LOCKED" | "STALE_RESPONSE" | "NOT_FOUND";
export class AssessmentError extends Error {
  constructor(public code: AssessmentErrorCode, message: string) { super(message); this.name = "AssessmentError"; }
}
export const IMAGE_FREE_ERROR = "This paper contains images and cannot yet be used for an online assessment. Image-enabled assessments will be supported after private assessment media is introduced.";
export function demand(condition: unknown, code: AssessmentErrorCode, message: string): asserts condition {
  if (!condition) throw new AssessmentError(code, message);
}

export type RunnerDeliveryRecovery = "FINALIZE_EXPIRED" | "VIEW_RESULT" | "RETRY" | "THROW";
export function runnerDeliveryRecovery(error: unknown): RunnerDeliveryRecovery {
  if (!(error instanceof AssessmentError)) return "THROW";
  if (error.code === "ATTEMPT_EXPIRED") return "FINALIZE_EXPIRED";
  if (error.code === "ATTEMPT_FINALIZED") return "VIEW_RESULT";
  if (error.code === "LOCKED") return "RETRY";
  return "THROW";
}

export function safeAssessmentActionError(error: unknown, fallback: string, operation: string) {
  if (error instanceof AssessmentError) return error.message;
  console.error(`[assessment] ${operation} failed unexpectedly.`, error);
  return fallback;
}
export function idInput(value: unknown): asserts value is string {
  demand(typeof value === "string" && value.length > 0 && value.length <= 200, "INVALID_INPUT", "A valid identifier is required.");
}
export type SavedSource = Prisma.SavedGeneratedPaperGetPayload<{ include: { sections: { include: { questions: true } } } }>;
export type ResponseValue = { kind: "choice"; value: "A" | "B" | "C" | "D" } | { kind: "boolean"; value: boolean } | { kind: "text"; value: string };
export const OBJECTIVE_ASSESSMENT_TYPES = ["MCQ", "TRUE_FALSE", "ASSERTION_REASON"] as const;
export type ObjectiveAssessmentType = (typeof OBJECTIVE_ASSESSMENT_TYPES)[number];

export function isObjectiveAssessmentType(type: BankQuestionType): type is ObjectiveAssessmentType {
  return OBJECTIVE_ASSESSMENT_TYPES.includes(type as ObjectiveAssessmentType);
}

export function objectiveTypeLabel(type: BankQuestionType) {
  const labels: Record<BankQuestionType, string> = {
    MCQ: "MCQ",
    TRUE_FALSE: "True/False",
    FILL_BLANK: "Fill in the Blank",
    ASSERTION_REASON: "Assertion & Reasoning",
    VERY_SHORT_ANSWER: "Very Short Answer",
    SHORT_ANSWER: "Short Answer",
    LONG_ANSWER: "Long Answer",
  };
  return labels[type];
}

export function assertObjectiveAnswerKey(type: BankQuestionType, correctAnswer: string | null) {
  demand(isObjectiveAssessmentType(type), "INVALID_SOURCE", "Unsupported objective grading type.");
  if (type === "TRUE_FALSE") {
    demand(["TRUE", "FALSE"].includes(correctAnswer ?? ""), "INVALID_SOURCE", "Invalid True/False answer key.");
  } else {
    demand(["A", "B", "C", "D"].includes(correctAnswer ?? ""), "INVALID_SOURCE", "Invalid objective answer key.");
  }
}

// Current snapshot has only question.imageUrl, imageAlt and imageCaption.
// There are NO separate option/stimulus/section/answer-image fields. Reject
// embedded media references in delivery text as well; ordinary captions,
// formatting and source metadata are not treated as images.
const embeddedMedia = /public\.blob\.vercel-storage\.com|data:(?:image|audio|video)\/|!\[[^\]]*\]\s*\(|<(?:img|video|audio|iframe)\b[^>]*(?:src|poster)\s*=/i;
export function assertImageFreeSource(source: SavedSource) {
  const delivered = [source.name, source.paperTitle, source.institutionName, source.examLabel, source.courseLine,
    source.topicLine, source.instructions, source.dateText, source.classText, source.subjectNameSnapshot,
    source.boardTitleSnapshot, source.qualificationTitleSnapshot];
  for (const section of source.sections) {
    delivered.push(section.label);
    for (const q of section.questions) {
      demand(!q.imageUrl?.trim(), "MEDIA_UNSUPPORTED", IMAGE_FREE_ERROR);
      delivered.push(q.questionText, q.optionA ?? "", q.optionB ?? "", q.optionC ?? "", q.optionD ?? "");
    }
  }
  demand(!delivered.some(text => embeddedMedia.test(text)), "MEDIA_UNSUPPORTED", IMAGE_FREE_ERROR);
}
export function buildAssessmentSnapshot(source: SavedSource) {
  assertImageFreeSource(source);
  demand(source.subjectId && source.snapshotVersion === 1, "INVALID_SOURCE", "Unsupported or incomplete saved paper.");
  demand(source.sections.length > 0 && source.sections.length <= 100, "INVALID_SOURCE", "Paper sections are invalid.");
  const sections = [...source.sections].sort((a,b) => a.sortOrder - b.sortOrder);
  const questions = sections.flatMap(s => [...s.questions].sort((a,b) => a.sortOrder - b.sortOrder));
  demand(questions.length > 0 && questions.length <= 500, "INVALID_SOURCE", "Paper must contain 1–500 questions.");
  demand(new Set(sections.map(s => s.sortOrder)).size === sections.length, "INVALID_SOURCE", "Duplicate section ordering.");
  demand(sections.every(s => s.questionCount === s.questions.length && s.questions.length > 0), "INVALID_SOURCE", "Incomplete section.");
  const texts = new Set<string>(); const ids = new Set<string>();
  let total = 0;
  for (const [index,q] of questions.entries()) {
    demand(q.finalQuestionNumber === index + 1 && !ids.has(q.id), "INVALID_SOURCE", "Invalid question numbering.");
    const normalized = q.questionText.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
    demand(!texts.has(normalized), "INVALID_SOURCE", "Duplicate question text.");
    texts.add(normalized); ids.add(q.id);
    const validation = validateBankQuestionInput({ ...q, subjectId: source.subjectId, topicId: q.topicId });
    demand(validation.success, "INVALID_SOURCE", "Saved question is incomplete or invalid.");
    total += q.marks;
  }
  demand(total === source.totalMarks && total > 0, "INVALID_SOURCE", "Paper marks do not match its questions.");
  demand(Number.isInteger(source.durationMinutes) && source.durationMinutes >= 1 && source.durationMinutes <= 300, "INVALID_SOURCE", "Invalid paper duration.");
  // All copies are explicit. No arbitrary metadata is spread into delivery.
  const header = {
    institutionName: source.institutionName, examLabel: source.examLabel, title: source.paperTitle,
    courseLine: source.courseLine, topicLine: source.topicLine, dateText: source.dateText,
    classText: source.classText, showStudentName: source.showStudentName, showRollNumber: source.showRollNumber,
    instructions: source.instructions, boardTitle: source.boardTitleSnapshot,
    qualificationTitle: source.qualificationTitleSnapshot, subjectName: source.subjectNameSnapshot,
  };
  return { header, totalMarks: total, durationMinutes: source.durationMinutes,
    sections: sections.map((s,sortOrder) => ({ label: s.label, sortOrder, questions:
      [...s.questions].sort((a,b) => a.sortOrder-b.sortOrder).map(q => ({
        sourceQuestionId: q.id, originalBankQuestionId: q.originalBankQuestionId,
        topicIdSnapshot: q.topicId, topicName: q.topicNameSnapshot, questionNumber: q.finalQuestionNumber,
        questionType: q.questionType, questionText: q.questionText, marks: q.marks, difficulty: q.difficulty,
        options: q.questionType === "MCQ" || q.questionType === "ASSERTION_REASON"
          ? { A:q.optionA!, B:q.optionB!, C:q.optionC!, D:q.optionD! } : {},
        correctAnswer:q.correctAnswer, modelAnswer:q.modelAnswer, explanation:q.explanation,
      })) })),
  };
}

export function buildObjectiveAssessmentSnapshot(source: SavedSource) {
  const unsupported = Array.from(new Set(
    source.sections.flatMap(section => section.questions)
      .filter(question => !isObjectiveAssessmentType(question.questionType))
      .map(question => objectiveTypeLabel(question.questionType)),
  ));
  demand(
    unsupported.length === 0,
    "INVALID_SOURCE",
    `This paper cannot be assigned online because it contains unsupported question type${unsupported.length === 1 ? "" : "s"}: ${unsupported.join(", ")}. Phase A supports MCQ, True/False, and Assertion & Reasoning only.`,
  );
  const snapshot = buildAssessmentSnapshot(source);
  for (const question of snapshot.sections.flatMap(section => section.questions)) {
    assertObjectiveAnswerKey(question.questionType, question.correctAnswer);
  }
  return snapshot;
}

export function objectiveResponseIsCorrect(
  type: BankQuestionType,
  correctAnswer: string | null,
  value: unknown,
) {
  assertObjectiveAnswerKey(type, correctAnswer);
  const parsed = parseResponse(type, value);
  if (!parsed) return false;
  if (type === "TRUE_FALSE") {
    return parsed.kind === "boolean" && parsed.value === (correctAnswer === "TRUE");
  }
  return parsed.kind === "choice" && parsed.value === correctAnswer;
}
export function parseResponse(type: BankQuestionType, raw: unknown): ResponseValue | null {
  if (raw === null) return null;
  demand(typeof raw === "object" && !Array.isArray(raw) && raw !== null, "INVALID_INPUT", "Invalid response.");
  const r = raw as Record<string,unknown>;
  demand(Object.keys(r).every(k => k === "kind" || k === "value"), "INVALID_INPUT", "Unexpected response fields.");
  if (type === "MCQ" || type === "ASSERTION_REASON") {
    demand(r.kind === "choice" && typeof r.value === "string" && ["A","B","C","D"].includes(r.value), "INVALID_INPUT", "Choose option A–D.");
    return {kind:"choice",value:r.value as "A"|"B"|"C"|"D"};
  }
  if (type === "TRUE_FALSE") {
    demand(r.kind === "boolean" && typeof r.value === "boolean", "INVALID_INPUT", "Choose true or false.");
    return {kind:"boolean",value:r.value};
  }
  demand(r.kind === "text" && typeof r.value === "string" && r.value.length <= 20000, "INVALID_INPUT", "Enter a response of at most 20,000 characters.");
  return r.value.trim() ? {kind:"text",value:r.value} : null;
}
export function assignmentPolicy(input: {opensAt: string; closesAt: string; durationMinutes: number; attemptLimit: number}) {
  demand(typeof input.opensAt === "string" && typeof input.closesAt === "string", "INVALID_INPUT", "Opening and closing times are required.");
  const opensAt = new Date(input.opensAt); const closesAt = new Date(input.closesAt);
  demand(Number.isFinite(opensAt.getTime()) && Number.isFinite(closesAt.getTime()) && closesAt > opensAt,
    "INVALID_INPUT","Choose a valid opening and closing time.");
  demand(Number.isInteger(input.durationMinutes) && input.durationMinutes >= 1 && input.durationMinutes <= 300,
    "INVALID_INPUT","Duration must be 1–300 minutes.");
  demand(Number.isInteger(input.attemptLimit) && input.attemptLimit >= 1 && input.attemptLimit <= 10,
    "INVALID_INPUT","Attempt limit must be 1–10.");
  return {opensAt, closesAt, durationMinutes:input.durationMinutes, attemptLimit:input.attemptLimit};
}
export function serverDeadline(startedAt: Date, durationMinutes: number, closesAt: Date) {
  return new Date(Math.min(startedAt.getTime() + durationMinutes*60000, closesAt.getTime()));
}
export function marksSummary(items: Array<{maxMarks:number; awardedMarks:number|null}>) {
  demand(items.length > 0, "INVALID_INPUT", "No marks available.");
  demand(items.every(i => Number.isFinite(i.maxMarks) && i.maxMarks > 0 &&
    (i.awardedMarks === null || (Number.isFinite(i.awardedMarks) && i.awardedMarks >= 0 && i.awardedMarks <= i.maxMarks))),
    "INVALID_INPUT","Invalid marks.");
  const maxMarks = items.reduce((n,i) => n+i.maxMarks,0);
  const complete = items.every(i => i.awardedMarks !== null);
  const awardedMarks = complete ? items.reduce((n,i) => n+i.awardedMarks!,0) : null;
  return {maxMarks, awardedMarks, complete, percentage: awardedMarks === null ? null : Math.round(awardedMarks/maxMarks*10000)/100};
}
export function requireReleasable(status: string, items: Array<{maxMarks:number; awardedMarks:number|null}>) {
  const marks = marksSummary(items);
  demand(status === "GRADED" && marks.complete, "LOCKED", "Results cannot be released until all questions are graded.");
  return marks;
}
